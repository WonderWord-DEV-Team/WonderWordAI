import os
import tempfile
import whisperx

from config import MODEL_NAME, DEVICE

# WhisperX shells out to the literal `ffmpeg` command to decode audio. On
# machines without ffmpeg on PATH, copy the static binary bundled by
# imageio-ffmpeg to a standard "ffmpeg" filename and add it to PATH, since
# WhisperX invokes it by that exact name (imageio-ffmpeg's own filename won't
# match).
try:
    import shutil
    import imageio_ffmpeg

    if shutil.which("ffmpeg") is None:
        bundled_exe = imageio_ffmpeg.get_ffmpeg_exe()
        ffmpeg_dir = os.path.dirname(bundled_exe)
        standard_name = os.path.join(ffmpeg_dir, "ffmpeg.exe" if os.name == "nt" else "ffmpeg")

        if not os.path.exists(standard_name):
            shutil.copy2(bundled_exe, standard_name)

        os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")
except Exception as exc:
    print(f"Could not configure bundled ffmpeg fallback: {exc}")

model = None
# Alignment models are keyed by language code so each language is only loaded once.
_align_models: dict[str, tuple] = {}


class WhisperModelLoadError(RuntimeError):
    pass


def load_whisper_model():
    global model

    if model is None:
        print(f"Loading WhisperX model ({MODEL_NAME})...")

        try:
            model = whisperx.load_model(
                MODEL_NAME,
                DEVICE
            )
        except Exception as exc:
            raise WhisperModelLoadError(
                f"Could not load Whisper model {MODEL_NAME!r}: {exc}"
            ) from exc

        print("WhisperX model loaded.")

    # Warm the alignment model for the common case so the first real request
    # after startup isn't the one that pays the (slow) load cost.
    load_align_model("en")


def load_align_model(language_code: str):
    if language_code not in _align_models:
        print(f"Loading WhisperX alignment model (language={language_code!r})...")
        _align_models[language_code] = whisperx.load_align_model(
            language_code=language_code,
            device=DEVICE
        )
        print("WhisperX alignment model loaded.")

    return _align_models[language_code]


def transcribe_audio(audio_file):
    global model

    if model is None:
        load_whisper_model()

    if isinstance(audio_file, str):
        temp_path = audio_file
        should_remove = False
    else:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp:
            temp.write(audio_file.file.read())
            temp_path = temp.name
        should_remove = True

    result = model.transcribe(temp_path)

    # Step 2: Reuse the cached alignment model for this language (loading it is slow).
    align_model, metadata = load_align_model(result["language"])

    # Step 3: Word-level alignment
    aligned = whisperx.align(
        result["segments"],
        align_model,
        metadata,
        temp_path,
        DEVICE
    )

    if should_remove:
        try:
            os.remove(temp_path)
        except OSError:
            pass

    return aligned