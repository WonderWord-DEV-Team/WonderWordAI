import os
import threading
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


def detect_miscue(audio_path: str, reference_text: str) -> dict:
    """Decode speech to IPA phonemes and compare it with the reference text."""
    import torch
    import whisperx

    wav2vec_processor, wav2vec_model = load_wav2vec_model()
    audio = whisperx.load_audio(audio_path)
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
    actual_phonemes = _normalize_phonemes(
        wav2vec_processor.batch_decode(predicted_ids)[0]
    )
    expected_phonemes = _normalize_phonemes(
        wav2vec_processor.tokenizer.phonemize(reference_text)
    )
    similarity = phoneme_similarity(expected_phonemes, actual_phonemes)

    return {
        "phonemes": actual_phonemes.split(),
        "similarity": round(similarity, 4),
        "confidence": similarity >= MISCUE_CONFIDENCE_THRESHOLD,
    }
