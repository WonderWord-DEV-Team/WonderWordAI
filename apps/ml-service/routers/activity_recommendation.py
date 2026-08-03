from typing import Annotated
import os

from anthropic import Anthropic
from fastapi import APIRouter, Header
from pydantic import BaseModel

from services.supabase_service import get_supabase_client

router = APIRouter()

anthropic_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# ticket: integrate playful practice recommendations into parent dashboard
# per docs/api-contract.md, unknown/missing categories must still return 200
# with this fallback activity instead of a 404, so the parent dashboard never
# has to show an error state
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
        {
            "title": "Pick a room",
            "description": "Choose any room in the house to explore together."
        },
        {
            "title": "Go hunting",
            "description": "Look for three objects whose names start with the tricky sound."
        },
        {
            "title": "Say it three times",
            "description": "Say each word out loud, three times, nice and clearly."
        },
        {
            "title": "Switch rooms",
            "description": "Move to a new room and see if you can find three more."
        }
    ],
    "recommendation": None
}


class ActivityRecommendationRequest(BaseModel):
    phonics_category: str


def _generate_personalized_recommendation(activity: dict) -> str | None:
    """Best-effort personalization via Claude. Never blocks the response —
    if this fails for any reason, the caller falls back to the static
    pedagogy text already stored in Supabase."""
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
        text_block = next(
            (block for block in response.content if block.type == "text"),
            None
        )
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

    try:
        supabase = get_supabase_client()
        # NOTE: query matches the ACTUAL columns on activity_recommendations.
        # duration_minutes / materials / example_words / steps do not exist
        # on this table yet — only the FALLBACK_ACTIVITY has them today.
        result = (
            supabase.table("activity_recommendations")
            .select("title, description, pedagogy, phonics_category")
            .eq("phonics_category", request.phonics_category)
            .limit(1)
            .execute()
        )

        if not result.data:
            return FALLBACK_ACTIVITY

        activity = result.data[0]
        activity["recommendation"] = _generate_personalized_recommendation(activity)
        # keep the response shape consistent with FALLBACK_ACTIVITY even though
        # these columns don't exist in the DB yet
        activity.setdefault("duration_minutes", None)
        activity.setdefault("materials", [])
        activity.setdefault("example_words", [])
        activity.setdefault("steps", [])
        return activity
    except Exception as e:
        import traceback
        print("=== ACTIVITY RECOMMENDATION ERROR ===")
        print(f"{type(e).__name__}: {e}")
        traceback.print_exc()
        print("======================================")
        # keep the dashboard from ever erroring, even if the lookup itself fails
        return FALLBACK_ACTIVITY