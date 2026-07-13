import os
import tempfile

from typing import Annotated

from fastapi import APIRouter, File, Header, HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

from config import CONFIDENCE_THRESHOLD

from services.whisper_service import WhisperModelLoadError, transcribe_audio

router = APIRouter()


@router.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    x_internal_key: Annotated[str | None, Header(alias="X-Internal-Key")] = None,
):
    _ = x_internal_key
    suffix = os.path.splitext(audio.filename or "")[1]
    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(await audio.read())
            temp_path = temp_file.name

        try:
            result = await run_in_threadpool(transcribe_audio, temp_path)
        except ModuleNotFoundError as exc:
            raise HTTPException(
                status_code=503,
                detail=f"Missing ML dependency: {exc.name}",
            ) from exc
        except WhisperModelLoadError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

        words = []
        timestamps = []
        segments = []
        miscues = []

        for segment in result.get("segments", []):
            segment_text = segment.get("text", "").strip()
            if segment_text:
                segments.append(
                    {
                        "text": segment_text,
                        "start": segment.get("start"),
                        "end": segment.get("end"),
                    }
                )

            if "words" not in segment:
                continue

            for item in segment["words"]:
                if "word" not in item:
                    continue

                word = item["word"].strip()
                words.append(word)
                timestamps.append(item.get("start"))
                score = item.get("score", 1.0)
                if score < CONFIDENCE_THRESHOLD:
                    miscues.append({
                        "word": word,
                        "expected_phonemes": "",
                        "actual_phonemes": "",
                    })                      

        return {
            "words": words,
            "timestamps": timestamps,
            "transcript": " ".join(segment["text"] for segment in segments),
            "segments": segments,
            "miscues": miscues,
        }
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
