from typing import Annotated, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from services.story_validation import validate_story
from services.supabase_service import get_supabase_client

try:
    import sentry_sdk
except ImportError:  # pragma: no cover - sentry-sdk should be in requirements.txt
    sentry_sdk = None

router = APIRouter()


class ValidateStoryRequest(BaseModel):
    story_text: str = Field(..., min_length=1)
    child_id: str = Field(..., min_length=1)
    word: str = Field(..., min_length=1)
    known_words: Optional[list[str]] = None


@router.post("/validate-story")
async def validate_story_endpoint(
    request: ValidateStoryRequest,
    x_internal_key: Annotated[str | None, Header(alias="X-Internal-Key")] = None,
):
    _ = x_internal_key  # enforced centrally by InternalKeyMiddleware

    known_words = request.known_words
    if known_words is None:
        known_words = await _fetch_known_words(request.child_id)

    result = validate_story(
        story_text=request.story_text,
        word=request.word,
        known_words=known_words,
    )

    if not result.is_valid:
        _log_validation_failure(request, result)

    return {
        "is_valid": result.is_valid,
        "validation_score": result.validation_score,
        "errors": result.errors,
        "guardrails": result.guardrails,
    }


async def _fetch_known_words(child_id: str) -> list[str]:
    try:
        supabase = get_supabase_client()
        response = (
            supabase.table("child_known_words")
            .select("words")
            .eq("child_id", child_id)
            .limit(1)
            .execute()
        )
    except Exception as exc:
        _capture_exception(exc)
        raise HTTPException(status_code=500, detail="Failed to fetch known words") from exc

    if not response.data:
        return []

    words = response.data[0].get("words") or []
    return [str(w) for w in words]


def _log_validation_failure(request: ValidateStoryRequest, result) -> None:
    if sentry_sdk is None:
        return

    try:
        with sentry_sdk.new_scope() as scope:
            scope.set_context(
                "story_validation",
                {
                    "child_id": request.child_id,
                    "word": request.word,
                    "errors": result.errors,
                    "guardrails": result.guardrails,
                    "validation_score": result.validation_score,
                },
            )
            sentry_sdk.capture_message(
                "story_validation_failed",
                level="warning",
            )
    except Exception:
        # Sentry must never break the request.
        pass


def _capture_exception(exc: Exception) -> None:
    if sentry_sdk is None:
        return

    try:
        sentry_sdk.capture_exception(exc)
    except Exception:
        pass
