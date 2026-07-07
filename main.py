from fastapi import FastAPI, HTTPException
from sentence_transformers import SentenceTransformer
from pydantic import BaseModel
from supabase_client import supabase
from typing import Optional

app = FastAPI()

model = SentenceTransformer('all-MiniLM-L6-v2')

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/health/embeddings")
def health_embeddings():
    test = model.encode("test")
    return {
        "status": "healthy",
        "model": "all-MiniLM-L6-v2",
        "embedding_dim": len(test)
    }

class ActivityRequest(BaseModel):
    phonics_category: str

class ActivityResponse(BaseModel):
    phonics_category: str
    title: str
    description: str
    pedagogy: str

@app.post("/activity-recommendation", response_model=ActivityResponse)
def get_activity_recommendation(request: ActivityRequest):
    try:
        response = (
            supabase.table("activity_recommendations")
            .select("*")
            .eq("phonics_category", request.phonics_category)
            .execute()
        )
        
       
        if not response.data:
            raise HTTPException(
                status_code=404,
                detail=f"No recommendation found for category: {request.phonics_category}"
            )
        
       
        return response.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))