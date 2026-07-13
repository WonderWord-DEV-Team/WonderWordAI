from fastapi import FastAPI
from sentence_transformers import SentenceTransformer

from services.whisper_service import load_whisper_model
from middleware.auth import InternalKeyMiddleware
from routers.transcribe import router

app = FastAPI()

# Existing SentenceTransformer model
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")


@app.on_event("startup")
def startup():
    # Load WhisperX model once
    load_whisper_model()


# Register middleware
app.add_middleware(InternalKeyMiddleware)

# Register routers
app.include_router(router)


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


@app.get("/health/embeddings")
def health_embeddings():
    test = embedding_model.encode("test")

    return {
        "status": "healthy",
        "model": "all-MiniLM-L6-v2",
        "embedding_dim": len(test)
    }
