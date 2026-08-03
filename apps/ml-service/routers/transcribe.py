import os
import re
import tempfile
from difflib import SequenceMatcher

from typing import Annotated

from fastapi import APIRouter, File, Form, Header, HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

from config import CONFIDENCE_THRESHOLD

from services.whisper_service import WhisperModelLoadError, transcribe_audio

router = APIRouter()


def _normalized_words(text: str) -> list[str]:
    return re.findall(r"[a-z]+(?:'[a-z]+)?", text.casefold())


def _reference_miscues(reference_text: str, recognized_words: list[str]) -> list[dict]:
    expected = _normalized_words(reference_text)
    actual = [_normalized_words(word)[0] for word in recognized_words if _normalized_words(word)]
    miscues = []

    for tag, expected_start, expected_end, actual_start, actual_end in SequenceMatcher(
        None, expected, actual, autojunk=False
    ).get_opcodes():
        if tag not in ("replace", "delete"):
            continue

        replacement_words = actual[actual_start:actual_end]
        for offset, expected_word in enumerate(expected[expected_start:expected_end]):
            actual_word = replacement_words[offset] if offset < len(replacement_words) else ""
            miscues.append({
                "word": expected_word,
                "expected_word": expected_word,
                "actual_word": actual_word,
                "is_correct": False,
            })

    return miscues


@router.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    reference_text: Annotated[str | None, Form()] = None,
    x_internal_key: Annotated[str | None, Header(alias="X-Internal-Key")] = None,
):
    _ = x_internal_key
    _ = reference_text
    suffix = os.path.splitext(audio.filename or "")[1]
    temp_path = None

    print(
        f"Transcription request received: filename={audio.filename!r}, "
        f"content_type={audio.content_type!r}",
        flush=True,
    )

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(await audio.read())
            temp_path = temp_file.name

        try:
            print("Running Whisper transcription...", flush=True)
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
                        "expected_word": "",
                        "actual_word": word,
                        "is_correct": False,
                    })                      

        if reference_text and reference_text.strip():
            miscues = _reference_miscues(reference_text, words)

        response = {
            "words": words,
            "timestamps": timestamps,
            "transcript": " ".join(segment["text"] for segment in segments),
            "segments": segments,
            "miscues": miscues,
            "reading_events": [],
        }
        print(
            f"Transcription complete: words={len(words)}, miscues={len(miscues)}",
            flush=True,
        )
        return response
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
