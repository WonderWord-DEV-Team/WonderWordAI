from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from config import ML_SERVICE_KEY


class InternalKeyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        if request.url.path in {"/transcribe", "/detect-miscue", "/activity-recommendation"}:
            internal_key = request.headers.get("X-Internal-Key")

            if not ML_SERVICE_KEY or internal_key != ML_SERVICE_KEY:
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Missing or invalid X-Internal-Key"},
                )

        return await call_next(request)
