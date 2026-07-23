from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.supabase_service import get_supabase_client
from anthropic import Anthropic
import os

router = APIRouter()

# Initialize Anthropic client
anthropic_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

class ActivityRequest(BaseModel):
    phonics_category: str

class ActivityResponse(BaseModel):
    phonics_category: str
    title: str
    description: str
    pedagogy: str
    recommendation: Optional[str] = None

def call_claude(activity: dict) -> str:
    try:
        response = anthropic_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=800,
            messages=[
                {
                    "role": "user",
                    "content": f"""
                    Based on this activity, provide a personalized recommendation for a child.

                    Title: {activity.get('title')}
                    Description: {activity.get('description')}
                    Pedagogy: {activity.get('pedagogy')}
                    """
                }
            ]
        )
        return response.content[0].text
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to communicate with Anthropic API: {str(e)}")

@router.post("/activity-recommendation", response_model=ActivityResponse)
async def get_activity_recommendation(request: ActivityRequest):
    try:
        supabase = get_supabase_client()
        response = (
            supabase.table("activity_recommendations")
            .select("*")
            .eq("phonics_category", request.phonics_category)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")

    if not response.data:
        # Default recommendation
        return ActivityResponse(
            phonics_category=request.phonics_category,
            title="Story Time!",
            description="Let's pick a fun story to read together and practice sounding out words as we go.",
            pedagogy="Regular reading practice strengthens word recognition and builds reading confidence over time.",
            recommendation="Regular reading practice strengthens word recognition and builds reading confidence over time."
        )

    activity = response.data[0]
    recommendation = call_claude(activity)

    return ActivityResponse(
        phonics_category=activity["phonics_category"],
        title=activity["title"],
        description=activity["description"],
        pedagogy=activity["pedagogy"],
        recommendation=recommendation
    )
