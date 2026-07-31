import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

ML_SERVICE_DIR = Path(__file__).resolve().parents[1]
if str(ML_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(ML_SERVICE_DIR))

import middleware.auth as auth_middleware
import routers.validate_story as validate_story_router
from middleware.auth import InternalKeyMiddleware


def _client(monkeypatch):
    monkeypatch.setattr(auth_middleware, "ML_SERVICE_KEY", "test-key")
    app = FastAPI()
    app.add_middleware(InternalKeyMiddleware)
    app.include_router(validate_story_router.router)
    return TestClient(app)


def test_validate_story_requires_internal_key(monkeypatch):
    client = _client(monkeypatch)
    response = client.post(
        "/validate-story",
        json={"story_text": "A cat sat.", "child_id": "c1", "word": "cat"},
    )
    assert response.status_code == 401


def test_valid_story_passes_all_guardrails(monkeypatch):
    client = _client(monkeypatch)

    story_text = (
        "A big red shark swam up fast. [VISUAL] "
        "The shark said hi to a fish. Everyone smiled and had fun!"
    )

    response = client.post(
        "/validate-story",
        headers={"X-Internal-Key": "test-key"},
        json={
            "story_text": story_text,
            "child_id": "child_abc123",
            "word": "shark",
            "known_words": [
                "a", "big", "red", "swam", "up", "fast", "the", "said",
                "hi", "to", "fish", "everyone", "smiled", "and", "had",
                "fun",
            ],
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["is_valid"] is True
    assert data["validation_score"] > 90
    assert data["errors"] == []
    assert data["guardrails"]["vocabulary"] == "passed"


def test_story_fails_vocabulary_check_and_logs_to_sentry(monkeypatch):
    client = _client(monkeypatch)

    # Fake Sentry so we can assert it was called without needing a real DSN
    fake_sentry = MagicMock()
    monkeypatch.setattr(validate_story_router, "sentry_sdk", fake_sentry)

    story_text = (
        "A big enormous shark swam up fast. [VISUAL] "
        "The shark said hi to a fish. Everyone smiled and had fun!"
    )

    response = client.post(
        "/validate-story",
        headers={"X-Internal-Key": "test-key"},
        json={
            "story_text": story_text,
            "child_id": "child_abc123",
            "word": "shark",
            # "enormous" is intentionally missing from known_words
            "known_words": [
                "a", "big", "swam", "up", "fast", "the", "said",
                "hi", "to", "fish", "everyone", "smiled", "and", "had",
                "fun",
            ],
        },
    )

    assert response.status_code == 200
    data = response.json()

    assert data["is_valid"] is False
    assert data["guardrails"]["vocabulary"] == "failed"
    assert any("vocabulary" in e for e in data["errors"])
    assert data["validation_score"] < 100

    # Sentry should have been notified of the failure
    fake_sentry.capture_message.assert_called_once()


def test_known_words_fetched_from_supabase_when_omitted(monkeypatch):
    client = _client(monkeypatch)

    mock_supabase = MagicMock()
    mock_response = MagicMock()
    mock_response.data = [{"words": ["a", "cat", "sat"]}]
    (
        mock_supabase.table.return_value.select.return_value.eq.return_value
        .limit.return_value.execute.return_value
    ) = mock_response

    with patch.object(validate_story_router, "get_supabase_client", return_value=mock_supabase):
        response = client.post(
            "/validate-story",
            headers={"X-Internal-Key": "test-key"},
            json={
                "story_text": "A cat sat. [VISUAL] A cat sat again, happy!",
                "child_id": "child_abc123",
                "word": "cat",
            },
        )

    assert response.status_code == 200
    mock_supabase.table.assert_called_with("child_known_words")
