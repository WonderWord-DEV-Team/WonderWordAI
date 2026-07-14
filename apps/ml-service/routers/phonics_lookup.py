from typing import Annotated

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from services.embedding_service import embedding_model
from services.supabase_service import get_supabase_client

router = APIRouter()


class PhonicsLookupRequest(BaseModel):
    stuck_word: str
    error_description: str | None = None


@router.post("/phonics-lookup")
async def phonics_lookup(
    request: PhonicsLookupRequest,
    x_internal_key: Annotated[str | None, Header(alias="X-Internal-Key")] = None,
):
    _ = x_internal_key

    try:
        query_text = request.stuck_word
        if request.error_description:
            query_text = f"{request.stuck_word} {request.error_description}"

        query_embedding = embedding_model.encode(query_text).tolist()

        supabase = get_supabase_client()
        result = supabase.rpc(
            'match_phonics_knowledge',
            {
                'query_embedding': query_embedding,
                'match_count': 3
            }
        ).execute()

        if not result.data:
            raise HTTPException(
                status_code=404,
                detail="No matching phonics rule found"
            )

        return {
            "stuck_word": request.stuck_word,
            "matches": result.data
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Phonics lookup failed: {str(e)}"
        )