import secrets

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from config import ML_SERVICE_KEY


PROTECTED_PATHS = {
    "/transcribe",
    "/detect-miscue",
    "/activity-recommendation",
    "/phonics-lookup",
    "/narrate",
    "/validate-story",
    "/themed-story",
    "/word-definition",
}


def _unauthorized_response():
    return JSONResponse(
        status_code=401,
        content={"detail": "Missing or invalid X-Internal-Key"},
    )


async def _authenticate(request, call_next):
    path = request.url.path.rstrip("/") or "/"
    if path in PROTECTED_PATHS:
        internal_key = request.headers.get("X-Internal-Key")
        if (
            not ML_SERVICE_KEY
            or not internal_key
            or not secrets.compare_digest(internal_key, ML_SERVICE_KEY)
        ):
            return _unauthorized_response()
    return await call_next(request)


class InternalKeyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        return await _authenticate(request, call_next)


async def internal_key_middleware(request, call_next):
    """Function-style compatibility for apps using @app.middleware."""
    return await _authenticate(request, call_next)