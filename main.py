from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from supabase_client import supabase
from typing import Optional
from activity import activity_call

app = FastAPI()

@app.get("/health")
def health():
    return {"status": "healthy"}



class ActivityRequest(BaseModel):
    phonics_category: str

class ActivityResponse(BaseModel):
    phonics_category: str
    title: str
    description: str
    pedagogy: str

@app.post("/activity-recommendation")
async def get_activity_recommendation(request: ActivityRequest):
    return activity_call(request.phonics_category)