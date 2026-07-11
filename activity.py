from supabase_client import supabase,Client
from anthropic import Anthropic
import os

anthropic = Anthropic(
    api_key=os.getenv("Anthropic_API_KEY")
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

    return activity

def call_claude(activity):
    response = anthropic.messages.create(
        model="claude-3-5-haiku-latest",
        max_tokens=150,
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




    
