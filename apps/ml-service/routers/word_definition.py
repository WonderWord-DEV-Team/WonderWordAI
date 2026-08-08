import json
import os
from typing import Annotated

from anthropic import Anthropic
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()

anthropic_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

DEFINITION_SYSTEM_PROMPT = """You are a friendly reading buddy explaining words to children ages 4-8.

Given a single word, write a short, simple, playful definition a young child can understand.

Rules:
- 1-2 short sentences maximum.
- Use simple vocabulary a 5-year-old knows.
- Be warm and encouraging in tone, like explaining to a curious kid.
- Do not repeat the word itself as the subject of the sentence (the app already
  shows the word above your text) — start directly with "is..." or similar.
- Also suggest exactly one emoji that best represents the word.

Return ONLY this JSON:
{
  "definition": "...",
  "emoji": "..."
}
"""


class WordDefinitionRequest(BaseModel):
    word: str = Field(..., min_length=1, max_length=50)


class WordDefinitionResponse(BaseModel):
    word: str
    definition: str
    emoji: str


def _fallback_definition(word: str) -> WordDefinitionResponse:
    return WordDefinitionResponse(
        word=word,
        definition=(
            "is a wonderful word that we can read and explore! "
            "Let's practice saying it together to learn its special sound."
        ),
        emoji="✨"
    )


@router.post("/word-definition", response_model=WordDefinitionResponse)
async def word_definition(
    request: WordDefinitionRequest,
    x_internal_key: Annotated[str | None, Header(alias="X-Internal-Key")] = None,
):
    _ = x_internal_key
    word = request.word.strip()

    if not word:
        raise HTTPException(status_code=400, detail="word must not be empty")

    if not os.getenv("ANTHROPIC_API_KEY"):
        return _fallback_definition(word)

    try:
        response = anthropic_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=200,
            system=[
                {
                    "type": "text",
                    "text": DEFINITION_SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"}
                }
            ],
            messages=[
                {"role": "user", "content": f'Word: "{word}"'}
            ]
        )

        text_block = next(
            (block for block in response.content if block.type == "text"),
            None
        )
        if text_block is None:
            return _fallback_definition(word)

        raw = text_block.text.strip()
        first_brace = raw.find("{")
        last_brace = raw.rfind("}")
        if first_brace == -1 or last_brace == -1:
            return _fallback_definition(word)

        parsed = json.loads(raw[first_brace:last_brace + 1])
        definition = str(parsed.get("definition", "")).strip()
        emoji = str(parsed.get("emoji", "")).strip()

        if not definition:
            return _fallback_definition(word)

        return WordDefinitionResponse(word=word, definition=definition, emoji=emoji or "✨")
    except Exception as e:
        import traceback
        print("=== WORD DEFINITION ERROR ===")
        print(f"{type(e).__name__}: {e}")
        traceback.print_exc()
        print("==============================")
        return _fallback_definition(word)