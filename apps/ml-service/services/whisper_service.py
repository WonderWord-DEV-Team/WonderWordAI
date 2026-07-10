import os
import shutil
import tempfile
from pathlib import Path

from config import DEVICE, HF_TOKEN, MODEL_NAME

model = None
align_models = {}


class WhisperModelLoadError(RuntimeError):
    pass


def _ensure_ffmpeg_on_path() -> None:
    if shutil.which("ffmpeg"):
        return

    try:
        import imageio_ffmpeg
    except ModuleNotFoundError:
        return

    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    shim_dir = Path(tempfile.gettempdir()) / "wonderwordai-ffmpeg"
    shim_dir.mkdir(exist_ok=True)
    shim_path = shim_dir / "ffmpeg.exe"
    if not shim_path.exists():
        shutil.copy2(ffmpeg_exe, shim_path)

    os.environ["PATH"] = f"{shim_dir}{os.pathsep}{os.environ.get('PATH', '')}"


def load_whisper_model():
    global model

    if model is None:
        _ensure_ffmpeg_on_path()

        import whisperx

        print("Loading Whisper model...")

        try:
            model = whisperx.load_model(
                MODEL_NAME,
                DEVICE,
                use_auth_token=HF_TOKEN,
            )
        except RuntimeError as exc:
            message = str(exc)

            if "model.bin" in message:
                raise WhisperModelLoadError(
                    "WhisperX could not load MODEL_NAME="
                    f"{MODEL_NAME!r}. WhisperX/faster-whisper expects a "
                    "CTranslate2 Whisper model containing model.bin, or one "
                    "of the built-in model names like 'small'."
                ) from exc

            raise

        print("Whisper loaded.")

    return model


def get_model():
    return model


def _load_align_model(language: str):
    global align_models

    if language not in align_models:
        import whisperx

        model_dir = Path(__file__).resolve().parent.parent / ".cache" / "whisperx-align"
        model_dir.mkdir(parents=True, exist_ok=True)

        print(f"Loading Whisper alignment model for language={language!r}...")
        align_models[language] = whisperx.load_align_model(
            language_code=language,
            device=DEVICE,
            model_dir=str(model_dir),
        )
        print("Whisper alignment model loaded.")

    return align_models[language]


def transcribe_audio(audio_path: str):
    import whisperx

    whisper_model = load_whisper_model()
    result = whisper_model.transcribe(audio_path)

    if not result.get("segments"):
        return result

    language = result.get("language")
    if not language:
        return result

    align_model, metadata = _load_align_model(language)
    return whisperx.align(
        result["segments"],
        align_model,
        metadata,
        audio_path,
        DEVICE,
        return_char_alignments=False,
    )
