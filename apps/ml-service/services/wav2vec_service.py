import os
import re
import subprocess
import threading
from collections import defaultdict
from difflib import SequenceMatcher
from pathlib import Path

from config import CONFIDENCE_THRESHOLD, DEVICE, HF_TOKEN
from services.confidence_filter import phoneme_similarity

WAV2VEC_MODEL_NAME = os.getenv(
    "WAV2VEC_MODEL_NAME",
    "facebook/wav2vec2-lv-60-espeak-cv-ft",
)
MISCUE_CONFIDENCE_THRESHOLD = float(
    os.getenv("SIMILARITY_THRESHOLD", str(CONFIDENCE_THRESHOLD))
)

# Per-word threshold used by detect_word_miscues(). A word counts as read
# correctly when at least this share of its expected phonemes survived the
# alignment against what was actually spoken. Deliberately lenient: a
# beginning reader's pronunciation is never a perfect phoneme match, and
# the goal is to catch real substitutions ("dag" for "dog"), not accent.
WORD_MISCUE_THRESHOLD = float(os.getenv("WORD_MISCUE_THRESHOLD", "0.5"))

processor = None
model = None
_model_lock = threading.Lock()


class Wav2VecModelLoadError(RuntimeError):
    pass


def _configure_espeak_library() -> None:
    """Point phonemizer at eSpeak NG on Windows when it is installed."""
    if os.name != "nt":
        return

    configured_path = os.getenv("ESPEAK_LIBRARY")
    candidates = [
        Path(configured_path) if configured_path else None,
        Path(r"C:\Program Files\eSpeak NG\libespeak-ng.dll"),
        Path(r"C:\Program Files (x86)\eSpeak NG\libespeak-ng.dll"),
    ]
    library_path = next(
        (path for path in candidates if path is not None and path.is_file()),
        None,
    )
    if library_path is None:
        return

    from phonemizer.backend.espeak.wrapper import EspeakWrapper

    EspeakWrapper.set_library(str(library_path))


def _resolve_ffmpeg() -> str:
    """Return a usable ffmpeg executable, falling back to the bundled one.

    Mirrors the fallback in services/whisper_service.py so audio loading here
    doesn't depend on that module (and therefore on importing whisperx).
    """
    import shutil

    found = shutil.which("ffmpeg")
    if found:
        return found

    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"


def _load_audio(path: str, sample_rate: int = 16_000):
    """Decode any ffmpeg-readable file to a mono float32 waveform.

    Replaces the previous `whisperx.load_audio()` call. whisperx.load_audio
    itself just shells out to ffmpeg, but *importing* whisperx drags in
    faster-whisper and the whole WhisperX model stack -- which is exactly
    the memory pressure that pushed transcription off this service and onto
    OpenAI. Decoding via ffmpeg directly keeps the miscue path dependent on
    Wav2Vec2 alone.
    """
    import numpy as np

    command = [
        _resolve_ffmpeg(),
        "-nostdin",
        "-threads", "0",
        "-i", path,
        "-f", "s16le",
        "-ac", "1",
        "-acodec", "pcm_s16le",
        "-ar", str(sample_rate),
        "-",
    ]

    try:
        completed = subprocess.run(command, capture_output=True, check=True)
    except subprocess.CalledProcessError as exc:
        stderr = exc.stderr.decode("utf-8", errors="ignore") if exc.stderr else ""
        raise RuntimeError(f"Could not decode audio: {stderr.strip()[:500]}") from exc

    return np.frombuffer(completed.stdout, np.int16).flatten().astype("float32") / 32768.0


def load_wav2vec_model():
    """Load Wav2Vec2 once and retain the processor and model in memory."""
    global processor, model

    if processor is not None and model is not None:
        return processor, model

    with _model_lock:
        if processor is not None and model is not None:
            return processor, model

        try:
            from transformers import (
                AutoModelForCTC,
                Wav2Vec2FeatureExtractor,
                Wav2Vec2PhonemeCTCTokenizer,
                Wav2Vec2Processor,
            )
            from transformers.utils.hub import cached_file

            _configure_espeak_library()

            # AutoProcessor in Transformers 4.57 can deserialize this model's
            # `do_phonemize` setting as the tokenizer argument itself. Build
            # the two processor components explicitly to avoid that bug.
            feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(
                WAV2VEC_MODEL_NAME,
                token=HF_TOKEN,
            )
            vocab_file = cached_file(
                WAV2VEC_MODEL_NAME,
                "vocab.json",
                token=HF_TOKEN,
            )
            tokenizer = Wav2Vec2PhonemeCTCTokenizer(vocab_file=vocab_file)
            processor = Wav2Vec2Processor(
                feature_extractor=feature_extractor,
                tokenizer=tokenizer,
            )
            model = AutoModelForCTC.from_pretrained(
                WAV2VEC_MODEL_NAME,
                token=HF_TOKEN,
            )
            model.to(DEVICE)
            model.eval()
        except Exception as exc:
            processor = None
            model = None
            raise Wav2VecModelLoadError(
                f"Could not load Wav2Vec2 model {WAV2VEC_MODEL_NAME!r}: {exc}"
            ) from exc

    return processor, model


def _normalize_phonemes(phonemes: str) -> str:
    """Normalize spacing without removing meaningful IPA symbols."""
    return " ".join(phonemes.split())


def _decode_actual_phonemes(audio_path: str) -> str:
    """Run Wav2Vec2 over an audio file and return its IPA phoneme string."""
    import torch

    wav2vec_processor, wav2vec_model = load_wav2vec_model()
    audio = _load_audio(audio_path)
    inputs = wav2vec_processor(
        audio,
        sampling_rate=16_000,
        return_tensors="pt",
        padding=True,
    )
    input_values = inputs.input_values.to(DEVICE)
    attention_mask = getattr(inputs, "attention_mask", None)
    if attention_mask is not None:
        attention_mask = attention_mask.to(DEVICE)

    with torch.inference_mode():
        logits = wav2vec_model(
            input_values,
            attention_mask=attention_mask,
        ).logits

    predicted_ids = torch.argmax(logits, dim=-1)
    return _normalize_phonemes(wav2vec_processor.batch_decode(predicted_ids)[0])


def detect_miscue(audio_path: str, reference_text: str) -> dict:
    """Decode speech to IPA phonemes and compare it with the reference text.

    Whole-utterance comparison: one similarity score for the entire clip.
    Used by POST /detect-miscue for single-word practice checks. For
    per-word results across a passage, use detect_word_miscues() instead.
    """
    wav2vec_processor, _ = load_wav2vec_model()

    actual_phonemes = _decode_actual_phonemes(audio_path)
    expected_phonemes = _normalize_phonemes(
        wav2vec_processor.tokenizer.phonemize(reference_text)
    )
    similarity = phoneme_similarity(expected_phonemes, actual_phonemes)

    return {
        "phonemes": actual_phonemes.split(),
        "similarity": round(similarity, 4),
        "confidence": similarity >= MISCUE_CONFIDENCE_THRESHOLD,
    }


def detect_word_miscues(audio_path: str, reference_text: str) -> dict:
    """Find which specific words in a passage were misread.

    Why this exists: transcription models with a language model on top
    (Whisper, gpt-4o-transcribe, etc.) actively normalize ambiguous audio
    toward whatever word fits the sentence -- so a child reading "dag" in
    "her dog a bone" gets transcribed as "dog", and any text-vs-text
    comparison then reports a perfect read. Wav2Vec2 here is a raw CTC
    phoneme decoder with no language model, so it transcribes what was
    actually pronounced and those substitutions survive.

    Rather than slicing the audio per word (which would need word
    timestamps and a lot of ffmpeg work), this runs the model ONCE over
    the whole clip and aligns the resulting phoneme sequence against the
    reference text's phonemes, mapping mismatched phoneme ranges back to
    the words they came from.
    """
    wav2vec_processor, _ = load_wav2vec_model()

    actual_phonemes = _decode_actual_phonemes(audio_path).split()

    words = re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?", reference_text)
    if not words:
        return {"miscues": [], "actual_phonemes": actual_phonemes, "words": []}

    # Phonemize word by word (not the whole string at once) so we keep a
    # map from each expected phoneme back to the word it belongs to.
    expected_flat: list[str] = []
    phoneme_word_index: list[int] = []
    expected_by_word: list[list[str]] = []

    for word_index, word in enumerate(words):
        word_phonemes = _normalize_phonemes(
            wav2vec_processor.tokenizer.phonemize(word)
        ).split()
        expected_by_word.append(word_phonemes)
        for phoneme in word_phonemes:
            expected_flat.append(phoneme)
            phoneme_word_index.append(word_index)

    matched_per_word: dict[int, int] = defaultdict(int)
    actual_per_word: dict[int, list[str]] = defaultdict(list)

    matcher = SequenceMatcher(None, expected_flat, actual_phonemes, autojunk=False)
    for tag, exp_start, exp_end, act_start, act_end in matcher.get_opcodes():
        if tag == "insert":
            # Extra sounds with no expected counterpart -- can't be
            # attributed to a specific word, so they don't fail one.
            continue

        for offset, expected_pos in enumerate(range(exp_start, exp_end)):
            word_index = phoneme_word_index[expected_pos]
            if tag == "equal":
                matched_per_word[word_index] += 1
                actual_per_word[word_index].append(expected_flat[expected_pos])
            else:
                actual_pos = act_start + offset
                if actual_pos < act_end:
                    actual_per_word[word_index].append(actual_phonemes[actual_pos])

    miscues = []
    for word_index, word in enumerate(words):
        expected_count = len(expected_by_word[word_index])
        if expected_count == 0:
            continue

        similarity = matched_per_word[word_index] / expected_count
        if similarity >= WORD_MISCUE_THRESHOLD:
            continue

        miscues.append({
            "word": word,
            "expected_phonemes": " ".join(expected_by_word[word_index]),
            "actual_phonemes": " ".join(actual_per_word[word_index]) or "unspoken",
            "similarity_score": round(similarity, 4),
            "is_correct": False,
        })

    return {
        "miscues": miscues,
        "actual_phonemes": actual_phonemes,
        "words": words,
    }