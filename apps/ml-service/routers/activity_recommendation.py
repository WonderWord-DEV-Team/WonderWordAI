from typing import Annotated

from fastapi import APIRouter, Header
from pydantic import BaseModel

from services.supabase_service import get_supabase_client

router = APIRouter()


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
    ]
}


class ActivityRecommendationRequest(BaseModel):
    phonics_category: str


@router.post("/activity-recommendation")
async def activity_recommendation(
    request: ActivityRecommendationRequest,
    x_internal_key: Annotated[str | None, Header(alias="X-Internal-Key")] = None,
):
    _ = x_internal_key

    try:
        supabase = get_supabase_client()
        result = (
            supabase.table("activity_recommendations")
            .select(
                "title, description, pedagogy, phonics_category, "
                "duration_minutes, materials, example_words, steps"
            )
            .eq("phonics_category", request.phonics_category)
            .limit(1)
            .execute()
        )

        if not result.data:
            return FALLBACK_ACTIVITY

        return result.data[0]
    except Exception:
        
        return FALLBACK_ACTIVITY
