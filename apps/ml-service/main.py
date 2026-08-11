import logging

from fastapi import FastAPI

from middleware.auth import InternalKeyMiddleware
from routers.narrate import router as narrate_router
from routers.detect_miscue import router as detect_miscue_router
from routers.phonics_lookup import router as phonics_router
from routers.activity_recommendation import router as activity_recommendation_router
from routers.validate_story import router as validate_story_router
from routers.word_definition import router as word_definition_router
from services.embedding_service import embedding_model
from config import SENTRY_DSN  # ADDED
from routers.themed_story import router as themed_story_router
from routers.detect_word_miscues import router as detect_word_miscues_router


if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.utils import BadDsn

    try:
        sentry_sdk.init(dsn=SENTRY_DSN, traces_sample_rate=0.1)
    except BadDsn as exc:
        logging.getLogger(__name__).warning(
            "Sentry is disabled because SENTRY_DSN is invalid: %s", exc
        )

app = FastAPI()

# NOTE: there is deliberately no startup hook loading WhisperX anymore.
#
# This used to be:
#     @app.on_event("startup")
#     def startup():
#         load_whisper_model()
#
# load_whisper_model() pulls in the WhisperX model, its alignment model and
# the Pyannote VAD before uvicorn binds the port, which made Render report
# "No open ports detected" during boot and was a large part of this
# service's memory footprint. Transcription now runs through OpenAI Whisper
# from the web app (see apps/web/lib/audio/openai-client.ts), so nothing
# here needs the local WhisperX stack at startup.
#
# The /transcribe router is likewise not registered below: it was the only
# consumer of services/whisper_service.py, and importing it re-introduces
# the same startup cost. Miscue detection is served by Wav2Vec2 via
# /detect-miscue (single word) and /detect-word-miscues (full passage),
# neither of which touches WhisperX.

app.add_middleware(InternalKeyMiddleware)

app.include_router(detect_miscue_router)
app.include_router(activity_recommendation_router)
app.include_router(phonics_router)
app.include_router(narrate_router)
app.include_router(validate_story_router)
app.include_router(word_definition_router)
app.include_router(themed_story_router)
app.include_router(detect_word_miscues_router)