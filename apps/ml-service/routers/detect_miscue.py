import os
import tempfile
from contextlib import suppress
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool

from services.wav2vec_service import Wav2VecModelLoadError, detect_miscue

router = APIRouter()


@router.post("/detect-miscue")
async def detect_audio_miscue(
    audio: Annotated[UploadFile, File(...)],
    reference_text: Annotated[str, Form(...)],
) -> JSONResponse:
    reference_text = reference_text.strip()
    if not reference_text:
        raise HTTPException(status_code=400, detail="reference_text is required")

    suffix = os.path.splitext(audio.filename or "")[1]
    temp_path = None

    try:
        audio_bytes = await audio.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="audio file is empty")

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(audio_bytes)
            temp_path = temp_file.name

        try:
            result = await run_in_threadpool(
                detect_miscue,
                temp_path,
                reference_text,
            )
            return JSONResponse(content=result)
        except ModuleNotFoundError as exc:
            raise HTTPException(
                status_code=503,
                detail=f"Missing ML dependency: {exc.name}",
            ) from exc
        except Wav2VecModelLoadError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except (RuntimeError, ValueError) as exc:
            raise HTTPException(
                status_code=422,
                detail=f"Could not process audio: {exc}",
            ) from exc
    finally:
        await audio.close()
        if temp_path:
            with suppress(FileNotFoundError):
                os.remove(temp_path)
