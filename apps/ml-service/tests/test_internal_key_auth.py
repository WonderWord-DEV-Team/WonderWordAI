import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

ML_SERVICE_DIR = Path(__file__).resolve().parents[1]
if str(ML_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(ML_SERVICE_DIR))

import middleware.auth as auth_middleware
from middleware.auth import InternalKeyMiddleware


def _client() -> TestClient:
    app = FastAPI()
    app.add_middleware(InternalKeyMiddleware)

    @app.post("/transcribe")
    async def transcribe():
        return {"ok": True}

    @app.post("/phonics-lookup")
    async def phonics_lookup():
        return {"ok": True}

    return TestClient(app)


def test_transcribe_rejects_missing_internal_key(monkeypatch):
    monkeypatch.setattr(auth_middleware, "ML_SERVICE_KEY", "shared-secret")

    response = _client().post("/transcribe")

    assert response.status_code == 401
    assert response.json() == {"detail": "Missing or invalid X-Internal-Key"}


def test_transcribe_rejects_invalid_internal_key(monkeypatch):
    monkeypatch.setattr(auth_middleware, "ML_SERVICE_KEY", "shared-secret")

    response = _client().post(
        "/transcribe",
        headers={"X-Internal-Key": "wrong-secret"},
    )

    assert response.status_code == 401


def test_transcribe_accepts_valid_internal_key(monkeypatch):
    monkeypatch.setattr(auth_middleware, "ML_SERVICE_KEY", "shared-secret")

    response = _client().post(
        "/transcribe",
        headers={"X-Internal-Key": "shared-secret"},
    )

    assert response.status_code == 200
    assert response.json() == {"ok": True}


def test_all_web_ml_paths_require_internal_key(monkeypatch):
    monkeypatch.setattr(auth_middleware, "ML_SERVICE_KEY", "shared-secret")
    client = _client()

    for path in auth_middleware.PROTECTED_PATHS:
        response = client.post(path)
        assert response.status_code == 401, f"{path} was not protected"


def test_trailing_slash_cannot_bypass_authentication(monkeypatch):
    monkeypatch.setattr(auth_middleware, "ML_SERVICE_KEY", "shared-secret")

    response = _client().post("/transcribe/", follow_redirects=False)

    assert response.status_code == 401
