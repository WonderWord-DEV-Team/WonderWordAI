from supabase_client import supabase,Client
from anthropic import Anthropic
from dotenv import load_dotenv
import os

load_dotenv()

anthropic = Anthropic(
    api_key=os.getenv("ANTHROPIC_API_KEY")
)

def activity_call(phonics_category: str):
    response = (
        supabase.table("activity_recommendations")
        .select("*")
        .eq("phonics_category", phonics_category)
        .execute()
    )

    if not response.data:
        return {
            "message": "No activity found"
        }

    activity = response.data[0]
    recommendation = call_claude(activity)

    activity["recommendation"] = recommendation

    return activity

def call_claude(activity):
    response = anthropic.messages.create(
        model="claude-haiku-4-5-20251001", 
        max_tokens=800 ,
        messages=[
            {
                "role": "user",
                "content": f"""
                Based on this activity, provide a personalized recommendation for a child.

                Title: {activity['title']}
                Description: {activity['description']}
                Pedagogy: {activity['pedagogy']}
                """
            }
        ]
    )

    return response.content[0].text