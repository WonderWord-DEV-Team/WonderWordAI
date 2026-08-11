import logging
from typing import Annotated

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

from services.embedding_service import embedding_model
from services.supabase_service import get_supabase_client

router = APIRouter()
logger = logging.getLogger(__name__)

# Below this similarity, a match is considered noise rather than a real
# phonics-pattern hit. 1.0 = identical embedding, 0.0 = unrelated.
#
# PROVISIONAL VALUE -- lowered from 0.35 after that value turned out to
# reject real matches (e.g. "wishing" -> sh-digraph) almost every time.
# A short, single-word query embedded against a full descriptive KB
# sentence ("sh-digraph: SH sound in ship, fish, brush, shell, wish")
# naturally scores lower than intuition suggests with a general-purpose
# sentence encoder, even when the match is correct. This needs to be
# recalibrated against real logged similarity scores (see the log line
# below) rather than guessed again -- if 0.2 still rejects good matches,
# or lets obviously-wrong ones through, drop the observed numbers into
# the next fix rather than adjusting blind.
MIN_SIMILARITY = 0.2


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
        # IMPORTANT: the embedding query is the target word ONLY.
        #
        # `error_description` (the child's actual phoneme output, e.g.
        # "K R IH SH IH NG") used to be concatenated into the embedded
        # text. That string isn't English prose -- it's raw phoneme
        # letters -- and all-MiniLM-L6-v2 is a natural-language sentence
        # encoder, so mixing it in dragged the embedding toward whichever
        # KB category happened to share surface letters with the
        # phoneme string, instead of matching the actual target word.
        # error_description is intentionally excluded from the query.
        query_text = request.stuck_word

        # embedding_model.encode() is a blocking, CPU-bound call, and
        # supabase.rpc().execute() is blocking network I/O -- both would
        # otherwise run directly on the single asyncio event loop thread
        # and freeze every other in-flight request (e.g. /transcribe)
        # until they finish. Offload them to the threadpool instead.
        def _lookup():
            query_embedding = embedding_model.encode(query_text).tolist()

            supabase = get_supabase_client()
            return supabase.rpc(
                'match_phonics_knowledge',
                {
                    'query_embedding': query_embedding,
                    'match_count': 3
                }
            ).execute()

        result = await run_in_threadpool(_lookup)

        matches = result.data or []

        # Visibility into real scores while MIN_SIMILARITY is provisional --
        # logs the top candidate's similarity even when it gets filtered
        # out, so the threshold can be tuned from real traffic instead of
        # guesswork.
        if matches:
            top = matches[0]
            logger.info(
                "phonics-lookup stuck_word=%r top_category=%r top_similarity=%.4f (threshold=%.2f)",
                request.stuck_word,
                top.get("category"),
                top.get("similarity", 0.0),
                MIN_SIMILARITY,
            )
        else:
            logger.info(
                "phonics-lookup stuck_word=%r returned zero candidates from match_phonics_knowledge",
                request.stuck_word,
            )

        confident_matches = [
            m for m in matches if m.get("similarity", 0) >= MIN_SIMILARITY
        ]

        if not confident_matches:
            raise HTTPException(
                status_code=404,
                detail="No matching phonics rule found"
            )

        return {
            "stuck_word": request.stuck_word,
            "matches": confident_matches
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Phonics lookup failed: {str(e)}"
        )