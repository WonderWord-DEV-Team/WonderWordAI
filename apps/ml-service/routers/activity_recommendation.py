import json
import os
from typing import Annotated

from anthropic import Anthropic
from fastapi import APIRouter, Header
from pydantic import BaseModel, Field

router = APIRouter()

anthropic_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

ACTIVITY_SYSTEM_PROMPT = """You are a reading specialist designing a short, playful
practice activity for a parent to do at home with their child, targeting a specific
phonics skill the child is currently struggling with.

Rules:
- The activity must be doable at home with common household items or basic craft
  supplies (no special equipment, no ingredients that require adult-only tools
  like knives or stoves unless clearly marked as adult-assisted).
- Keep it playful and encouraging, appropriate for a K-5 child.
- 3 to 5 concrete steps, each with a short title and one clear instruction.
- 5-8 real example words that match the target phonics pattern.
- Duration should be realistic for a young child's attention span (5-15 minutes).
- Never suggest anything unsafe for a child to do unsupervised for their age.

Return ONLY this JSON, matching this exact shape:
{
  "title": "...",
  "description": "...",
  "pedagogy": "...",
  "duration_minutes": 10,
  "materials": [{"icon": "...", "label": "..."}],
  "example_words": ["...", "..."],
  "steps": [{"title": "...", "description": "..."}]
}
"""

FALLBACK_ACTIVITY = {
    "title": "Word Detective",
    "description": (
        "Look around the house and find objects whose names start with the "
        "tricky sound. Say each one out loud three times!"
    ),
    "pedagogy": (
        "Environmental word-finding reinforces phoneme-grapheme connections "
        "through real-world context."
    ),
    "phonics_category": "unknown",
    "duration_minutes": 10,
    "materials": [
        {"icon": "eye", "label": "Your eyes and ears"},
        {"icon": "home", "label": "Any room in your home"}
    ],
    "example_words": [],
    "steps": [
        {"title": "Pick a room", "description": "Choose any room in the house to explore together."},
        {"title": "Go hunting", "description": "Look for three objects whose names start with the tricky sound."},
        {"title": "Say it three times", "description": "Say each word out loud, three times, nice and clearly."},
        {"title": "Switch rooms", "description": "Move to a new room and see if you can find three more."}
    ],
    "recommendation": None
}


class ActivityRecommendationRequest(BaseModel):
    phonics_category: str
    recent_miscue_words: list[str] = Field(default_factory=list)
    child_name: str | None = None


def _generate_activity(
    phonics_category: str,
    recent_miscue_words: list[str],
    child_name: str | None
) -> dict | None:
    if not os.getenv("ANTHROPIC_API_KEY"):
        return None

    words_hint = (
        f" Recent words the child struggled with: {', '.join(recent_miscue_words[:8])}."
        if recent_miscue_words else ""
    )
    name_hint = f" The child's name is {child_name}." if child_name else ""

    try:
        response = anthropic_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=800,
            system=[
                {"type": "text", "text": ACTIVITY_SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}
            ],
            messages=[
                {
                    "role": "user",
                    "content": f'Target phonics pattern: "{phonics_category}".{words_hint}{name_hint}'
                }
            ]
        )

        text_block = next((block for block in response.content if block.type == "text"), None)
        if text_block is None:
            return None

        raw = text_block.text.strip()
        first_brace = raw.find("{")
        last_brace = raw.rfind("}")
        if first_brace == -1 or last_brace == -1:
            return None

        parsed = json.loads(raw[first_brace:last_brace + 1])
        parsed["phonics_category"] = phonics_category
        return parsed
    except Exception as e:
        import traceback
        print("=== ACTIVITY GENERATION ERROR ===")
        print(f"{type(e).__name__}: {e}")
        traceback.print_exc()
        print("==================================")
        return None


def _generate_personalized_recommendation(activity: dict) -> str | None:
    if not os.getenv("ANTHROPIC_API_KEY"):
        return None
    try:
        response = anthropic_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=500,
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Write a personalized recommendation for a parent doing "
                        "this reading activity with their child. Keep it under "
                        "200 words total. Use markdown with short bullet points, "
                        "not long paragraphs. Include exactly these three short "
                        "sections: why it helps, how to do it at home, and one "
                        "quick tip for success.\n\n"
                        f"Title: {activity.get('title')}\n"
                        f"Description: {activity.get('description')}\n"
                        f"Pedagogy: {activity.get('pedagogy')}"
                    )
                }
            ]
        )
        text_block = next((block for block in response.content if block.type == "text"), None)
        return text_block.text.strip() if text_block else None
    except Exception as e:
        import traceback
        print("=== CLAUDE PERSONALIZATION ERROR ===")
        print(f"{type(e).__name__}: {e}")
        traceback.print_exc()
        print("=====================================")
        return None


@router.post("/activity-recommendation")
async def activity_recommendation(
    request: ActivityRecommendationRequest,
    x_internal_key: Annotated[str | None, Header(alias="X-Internal-Key")] = None,
):
    _ = x_internal_key

    activity = _generate_activity(
        request.phonics_category, request.recent_miscue_words, request.child_name
    )

    if not activity:
        fallback = dict(FALLBACK_ACTIVITY)
        fallback["phonics_category"] = request.phonics_category
        return fallback

    activity["recommendation"] = _generate_personalized_recommendation(activity)
    return activity