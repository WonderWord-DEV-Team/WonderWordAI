from fastapi import FastAPI, HTTPException

from middleware.auth import InternalKeyMiddleware
from routers.embed_phonics import router as phonics_router
from routers.transcribe import router as transcribe_router

embedding_model = None


def get_embedding_model():
    global embedding_model

    if embedding_model is None:
        try:
            from sentence_transformers import SentenceTransformer
        except ModuleNotFoundError as exc:
            raise HTTPException(
                status_code=503,
                detail=f"Missing ML dependency: {exc.name}",
            ) from exc

        embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

    return embedding_model


app = FastAPI()
app.add_middleware(InternalKeyMiddleware)
app.include_router(phonics_router)
app.include_router(transcribe_router)


@app.get("/health")
def health():
    return {
        "status": "healthy",
    }


@app.get("/health/embeddings")
def health_embeddings():
    model = get_embedding_model()
    test = model.encode("test")
    return {
        "status": "healthy",
        "model": "all-MiniLM-L6-v2",
        "embedding_dim": len(test),
    }
