import base64
import math
import os
import tempfile
from dataclasses import dataclass
from typing import Any, Protocol

from config import TTS_PROVIDER
from services.whisper_service import transcribe_audio


SUPPORTED_MIME_TYPES = {
    "audio/mpeg": ".mp3",
    "audio/mp4": ".m4a",
    "audio/ogg": ".ogg",
    "audio/wav": ".wav",
}


class NarrationProviderError(RuntimeError):
    pass


class NarrationProviderConfigurationError(NarrationProviderError):
    pass


class NarrationAlignmentError(RuntimeError):
    pass


@dataclass(frozen=True)
class GeneratedNarrationAudio:
    audio_bytes: bytes
    mime_type: str
    duration: float


class NarrationProvider(Protocol):
    def synthesize(self, text: str) -> GeneratedNarrationAudio:
        ...


class OpenAINarrationProvider:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise NarrationProviderConfigurationError(
                "Missing OPENAI_API_KEY environment variable."
            )
        
        # Determine model
        model_env = (os.getenv("TTS_MODEL") or "tts-1").strip().lower()
        self.model = "tts-1" if model_env == "default" else model_env
        
        # Determine voice
        voice_env = (os.getenv("TTS_VOICE") or "alloy").strip().lower()
        self.voice = "alloy" if voice_env == "default" else voice_env

    def synthesize(self, text: str) -> GeneratedNarrationAudio:
        import requests
        import whisperx
        from services.whisper_service import _ensure_ffmpeg_on_path

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "input": text,
            "voice": self.voice,
            "response_format": "mp3"
        }
        
        try:
            response = requests.post(
                "https://api.openai.com/v1/audio/speech",
                json=payload,
                headers=headers,
                timeout=30
            )
            response.raise_for_status()
            audio_bytes = response.content
        except Exception as e:
            raise NarrationProviderError(f"OpenAI TTS synthesis failed: {e}") from e

        # Calculate duration using a temporary file and whisperx.load_audio
        temp_path = None
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as temp_file:
                temp_file.write(audio_bytes)
                temp_path = temp_file.name
            
            # Ensure ffmpeg is on path before loading audio
            _ensure_ffmpeg_on_path()
            
            # Load and get duration
            audio_data = whisperx.load_audio(temp_path)
            duration = len(audio_data) / 16000.0
        except Exception as e:
            raise NarrationProviderError(f"Failed to decode audio duration: {e}") from e
        finally:
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)

        return GeneratedNarrationAudio(
            audio_bytes=audio_bytes,
            mime_type="audio/mpeg",
            duration=duration
        )


def get_narration_provider() -> NarrationProvider:
    provider_name = (TTS_PROVIDER or "").strip().lower()

    if not provider_name:
        raise NarrationProviderConfigurationError(
            "No production TTS provider is configured. Set TTS_PROVIDER after selecting a provider."
        )

    if provider_name == "openai":
        return OpenAINarrationProvider()

    raise NarrationProviderConfigurationError(
        f"TTS_PROVIDER={provider_name!r} does not have an implementation in this service."
    )


def generate_aligned_narration(
    *,
    story_id: str,
    text: str,
    provider: NarrationProvider | None = None,
) -> dict[str, Any]:
    _ = story_id
    narration_provider = provider or get_narration_provider()
    generated_audio = narration_provider.synthesize(text)
    mime_type = generated_audio.mime_type.strip().lower()

    if mime_type not in SUPPORTED_MIME_TYPES:
        raise NarrationProviderError(f"Unsupported narration MIME type: {mime_type}")

    if not generated_audio.audio_bytes:
        raise NarrationProviderError("TTS provider returned empty audio.")

    if not _is_finite_positive(generated_audio.duration):
        raise NarrationProviderError("TTS provider returned an invalid duration.")

    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=SUPPORTED_MIME_TYPES[mime_type]) as temp_file:
            temp_file.write(generated_audio.audio_bytes)
            temp_path = temp_file.name

        words = align_narration_words(
            audio_path=temp_path,
            duration=generated_audio.duration,
        )
        final_end = words[-1]["end"]
        duration = max(generated_audio.duration, final_end)

        return {
            "audio_base64": base64.b64encode(generated_audio.audio_bytes).decode("ascii"),
            "mime_type": mime_type,
            "duration": duration,
            "words": words,
        }
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


def align_narration_words(*, audio_path: str, duration: float) -> list[dict[str, float | str]]:
    result = transcribe_audio(audio_path)
    raw_words: list[dict[str, Any]] = []

    for segment in result.get("segments", []):
        for item in segment.get("words", []):
            raw_words.append(item)

    return normalize_aligned_words(raw_words, duration=duration)


def normalize_aligned_words(
    raw_words: list[dict[str, Any]],
    *,
    duration: float,
) -> list[dict[str, float | str]]:
    if not _is_finite_positive(duration):
        raise NarrationAlignmentError("Narration duration must be a positive finite number.")

    prepared_words: list[dict[str, Any]] = []

    for item in raw_words:
        word = str(item.get("word", "")).strip()

        if not word:
            continue

        start = item.get("start")

        if not _is_finite_nonnegative(start):
            raise NarrationAlignmentError("Aligned narration word is missing a valid start time.")

        end = item.get("end")
        prepared_words.append({
            "word": word,
            "start": float(start),
            "end": float(end) if _is_finite_nonnegative(end) else None,
        })

    if not prepared_words:
        raise NarrationAlignmentError("WhisperX returned no aligned narration words.")

    prepared_words.sort(key=lambda word: word["start"])

    for index, item in enumerate(prepared_words):
        previous = prepared_words[index - 1] if index > 0 else None

        if previous and item["start"] < previous["start"]:
            raise NarrationAlignmentError("Aligned narration words are not chronological.")

        if item["end"] is None or item["end"] <= item["start"]:
            item["end"] = _fallback_end_for_word(
                words=prepared_words,
                index=index,
                duration=duration,
            )

        if item["end"] <= item["start"]:
            item["end"] = item["start"] + 0.01

    final_end = prepared_words[-1]["end"]

    if final_end > duration:
        duration = final_end

    normalized_words: list[dict[str, float | str]] = []

    for item in prepared_words:
        start = float(item["start"])
        end = float(item["end"])

        if start < 0 or end <= start or end > duration:
            raise NarrationAlignmentError("Aligned narration word timestamps are invalid.")

        normalized_words.append({
            "word": str(item["word"]),
            "start": start,
            "end": end,
        })

    return normalized_words


def _fallback_end_for_word(
    *,
    words: list[dict[str, Any]],
    index: int,
    duration: float,
) -> float:
    current = words[index]

    for next_word in words[index + 1:]:
        next_start = next_word.get("start")

        if _is_finite_nonnegative(next_start) and next_start > current["start"]:
            print("WhisperX narration alignment missing an end time; using next word start fallback.")
            return float(next_start)

    print("WhisperX narration alignment missing final end time; using audio duration fallback.")
    return max(float(duration), float(current["start"]) + 0.01)


def _is_finite_nonnegative(value: Any) -> bool:
    return isinstance(value, (int, float)) and math.isfinite(value) and value >= 0


def _is_finite_positive(value: Any) -> bool:
    return isinstance(value, (int, float)) and math.isfinite(value) and value > 0
