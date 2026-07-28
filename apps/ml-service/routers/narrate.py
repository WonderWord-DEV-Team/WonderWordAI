from functools import partial
from typing import Annotated

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field, root_validator, validator
from starlette.concurrency import run_in_threadpool

from services.narration_service import (
    NarrationAlignmentError,
    NarrationProviderConfigurationError,
    NarrationProviderError,
    generate_aligned_narration,
)
from services.whisper_service import WhisperModelLoadError

router = APIRouter()


class NarrationRequest(BaseModel):
    story_id: str = Field(..., min_length=1)
    text: str = Field(..., min_length=1, max_length=20_000)

    @validator("text")
    def text_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("text must not be blank")

        return value


class NarrationWord(BaseModel):
    word: str = Field(..., min_length=1)
    start: float = Field(..., ge=0)
    end: float = Field(..., ge=0)

    @validator("word")
    def word_must_not_be_blank(cls, value: str) -> str:
        stripped = value.strip()

        if not stripped:
            raise ValueError("word must not be blank")

        return stripped

    @root_validator(skip_on_failure=True)
    def end_must_be_greater_than_start(cls, values):
        start = values.get("start")
        end = values.get("end")

        if start is not None and end is not None and end <= start:
            raise ValueError("end must be greater than start")

        return values


class NarrationResponse(BaseModel):
    audio_base64: str = Field(..., min_length=1)
    mime_type: str = Field(..., min_length=1)
    duration: float = Field(..., gt=0)
    words: list[NarrationWord] = Field(..., min_items=1)

    @root_validator(skip_on_failure=True)
    def duration_must_cover_final_word(cls, values):
        duration = values.get("duration")
        words = values.get("words") or []

        if duration is not None and words and duration < words[-1].end:
            raise ValueError("duration must be at least the final word end")

        return values


@router.post("/narrate", response_model=NarrationResponse)
async def narrate(
    request: NarrationRequest,
    x_internal_key: Annotated[str | None, Header(alias="X-Internal-Key")] = None,
):
    _ = x_internal_key

    try:
        return await run_in_threadpool(
            partial(
                generate_aligned_narration,
                story_id=request.story_id,
                text=request.text,
            )
        )
    except NarrationProviderConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except (NarrationProviderError, NarrationAlignmentError) as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except ModuleNotFoundError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Missing ML dependency: {exc.name}",
        ) from exc
    except WhisperModelLoadError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
