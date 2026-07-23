import sys
from io import BytesIO
from pathlib import Path
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

# Make imports reliable whether pytest is run from the repository root or here.
ML_SERVICE_DIR = Path(__file__).resolve().parents[1]
if str(ML_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(ML_SERVICE_DIR))

import middleware.auth as auth_middleware
from middleware.auth import InternalKeyMiddleware
from routers.transcribe import router


@patch("routers.transcribe.transcribe_audio")
def test_transcribe(mock_transcribe, monkeypatch):
    monkeypatch.setattr(auth_middleware, "ML_SERVICE_KEY", "test-key")

    app = FastAPI()
    app.add_middleware(InternalKeyMiddleware)
    app.include_router(router)
    client = TestClient(app)

    mock_transcribe.return_value = {
        "segments": [
            {
                "text": "hello world",
                "words": [
                    {
                        "word": "hello",
                        "start": 0.0,
                        "score": 0.95
                    },
                    {
                        "word": "world",
                        "start": 0.5,
                        "score": 0.98
                    }
                ]
            }
        ]
    }

    response = client.post(
        "/transcribe",
        headers={
            "X-Internal-Key": "test-key"
        },
        files={
            "audio": ("sample.wav", BytesIO(b"RIFF....WAVEfmt "), "audio/wav")
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert "words" in data
    assert "timestamps" in data
