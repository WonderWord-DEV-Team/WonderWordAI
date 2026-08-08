import json
import os
from typing import Annotated

from anthropic import Anthropic
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()

anthropic_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

THEMED_STORY_SYSTEM_PROMPT = """You are a warm, playful children's story writer, writing a short story
for a parent to read ALOUD together with their child (K-5, ages 5-11).

This is a FOR-FUN story based on a theme the child picked — not a corrective or
teaching exercise. Keep it light, imaginative, and read-aloud friendly.

Rules:
- 150-300 words. Short enough for one sitting, not a chapter book.
- Simple, age-appropriate vocabulary and sentence structure.
- Warm, silly, or adventurous tone — never scary or sad.
- Give the story a short, fun title.

Return ONLY this JSON:
{
  "title": "...",
  "text": "..."
}
"""


class ThemedStoryRequest(BaseModel):
    theme: str = Field(..., min_length=1, max_length=50)
    grade: int | None = Field(default=None, ge=1, le=5)


class ThemedStoryResponse(BaseModel):
    title: str
    text: str


def _fallback_story(theme: str) -> ThemedStoryResponse:
    return ThemedStoryResponse(
        title=f"A {theme} Adventure",
        text=(
            f"Once upon a time, there was a wonderful {theme.lower()} adventure "
            "waiting to happen. Grab a grown-up and imagine what could happen next!"
        )
    )


@router.post("/themed-story", response_model=ThemedStoryResponse)
async def themed_story(
    request: ThemedStoryRequest,
    x_internal_key: Annotated[str | None, Header(alias="X-Internal-Key")] = None,
):
    _ = x_internal_key
    theme = request.theme.strip()

    if not theme:
        raise HTTPException(status_code=400, detail="theme must not be empty")

    if not os.getenv("ANTHROPIC_API_KEY"):
        return _fallback_story(theme)

    grade_hint = f" The reader is around grade {request.grade}." if request.grade else ""

    try:
        response = anthropic_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=600,
            system=[
                {
                    "type": "text",
                    "text": THEMED_STORY_SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"}
                }
            ],
            messages=[
                {"role": "user", "content": f'Theme: "{theme}".{grade_hint}'}
            ]
        )

        text_block = next(
            (block for block in response.content if block.type == "text"),
            None
        )
        if text_block is None:
            return _fallback_story(theme)

        raw = text_block.text.strip()
        first_brace = raw.find("{")
        last_brace = raw.rfind("}")
        if first_brace == -1 or last_brace == -1:
            return _fallback_story(theme)

        parsed = json.loads(raw[first_brace:last_brace + 1])
        title = str(parsed.get("title", "")).strip()
        text = str(parsed.get("text", "")).strip()

        if not title or not text:
            return _fallback_story(theme)

        return ThemedStoryResponse(title=title, text=text)
    except Exception as e:
        import traceback
        print("=== THEMED STORY ERROR ===")
        print(f"{type(e).__name__}: {e}")
        traceback.print_exc()
        print("===========================")
        return _fallback_story(theme)