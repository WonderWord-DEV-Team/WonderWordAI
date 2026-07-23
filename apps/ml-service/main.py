from fastapi import FastAPI

from services.whisper_service import load_whisper_model
from middleware.auth import InternalKeyMiddleware

from routers.detect_miscue import router as detect_miscue_router
from routers.transcribe import router as transcribe_router

from routers.transcribe import router
from routers.phonics_lookup import router as phonics_router
from routers.activity import router as activity_router
from services.embedding_service import embedding_model


app = FastAPI()

@app.on_event("startup")
def startup():
    # Load WhisperX model once
    load_whisper_model()


# Register middleware
app.add_middleware(InternalKeyMiddleware)

# Register routers

app.include_router(transcribe_router)
app.include_router(detect_miscue_router)


app.include_router(router)
app.include_router(phonics_router)
app.include_router(activity_router)


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
