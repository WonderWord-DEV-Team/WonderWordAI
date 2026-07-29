import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

ML_SERVICE_DIR = Path(__file__).resolve().parents[1]
if str(ML_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(ML_SERVICE_DIR))

<<<<<<< HEAD
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


def test_unrecognized_vocabulary_warns_without_rejecting_story(monkeypatch):
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

    assert data["is_valid"] is True
    assert data["guardrails"]["vocabulary"] == "warning"
    assert data["errors"] == []
    assert any("enormous" in warning for warning in data["warnings"])
    assert data["validation_score"] < 100

    # Advisory vocabulary findings should not be logged as validation failures.
    fake_sentry.capture_message.assert_not_called()


def test_common_words_and_inflected_known_words_do_not_warn(monkeypatch):
    client = _client(monkeypatch)
    response = client.post(
        "/validate-story",
        headers={"X-Internal-Key": "test-key"},
        json={
            "story_text": "The fox hopped with Sam. [VISUAL] The fox hopped with Sam and smiled.",
            "child_id": "child_abc123",
            "word": "fox",
            "known_words": ["hop", "Sam", "smile"],
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["is_valid"] is True
    assert data["guardrails"]["vocabulary"] == "passed"
    assert data["warnings"] == []


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
=======
from routers.validate_story import router

KNOWN_WORDS = [
    "the", "a", "big", "red", "sat", "on", "mat", "and", "smiled",
    "went", "home", "with", "friend"
]


def _client():
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


def _payload(story_text: str, word: str = "cat", known_words=None):
    return {
        "story_text": story_text,
        "child_id": "11111111-1111-1111-1111-111111111111",
        "word": word,
        "known_words": known_words if known_words is not None else KNOWN_WORDS
    }


# ticket: implement /api/stories/generate orchestration (known-words -> sonnet -> validate -> image -> store)
def test_validate_story_passes_all_guardrails():
    story = (
        "The big red cat sat on the mat. [VISUAL] "
        "The cat sat with a friend and went home. The cat and the friend smiled!"
    )

    response = _client().post("/validate-story", json=_payload(story))

    assert response.status_code == 200
    body = response.json()
    assert body["is_valid"] is True
    assert body["validation_score"] == 100
    assert body["errors"] == []
    assert body["guardrails"] == {
        "vocabulary": "passed",
        "complexity": "passed",
        "content_safety": "passed",
        "structure": "passed"
    }


def test_validate_story_fails_vocabulary_for_unknown_words():
    story = (
        "The enormous magnificent cat sat on the mat. [VISUAL] "
        "The cat and the friend smiled!"
    )

    response = _client().post("/validate-story", json=_payload(story))
    body = response.json()

    assert response.status_code == 200
    assert body["is_valid"] is False
    assert body["guardrails"]["vocabulary"] == "failed"
    assert any("vocabulary" in error for error in body["errors"])


def test_validate_story_fails_structure_without_visual_marker():
    story = "The big red cat sat on the mat with a friend and smiled!"

    response = _client().post("/validate-story", json=_payload(story))
    body = response.json()

    assert response.status_code == 200
    assert body["is_valid"] is False
    assert body["guardrails"]["structure"] == "failed"
    assert any("[VISUAL]" in error for error in body["errors"])


def test_validate_story_fails_structure_for_wrong_word_count():
    story = "The big red cat sat on the mat. [VISUAL] The friend smiled!"

    response = _client().post("/validate-story", json=_payload(story))
    body = response.json()

    assert response.status_code == 200
    assert body["is_valid"] is False
    assert body["guardrails"]["structure"] == "failed"
    assert any("appears 1 time" in error for error in body["errors"])


def test_validate_story_fails_content_safety_for_banned_keywords():
    story = "The big red cat was scared and started to cry. [VISUAL] The cat cat smiled!"

    response = _client().post("/validate-story", json=_payload(story))
    body = response.json()

    assert response.status_code == 200
    assert body["is_valid"] is False
    assert body["guardrails"]["content_safety"] == "failed"
    assert any("banned keyword" in error for error in body["errors"])


def test_validate_story_requires_fields():
    response = _client().post(
        "/validate-story",
        json={"story_text": "", "child_id": "", "word": ""}
    )

    assert response.status_code == 400


@patch("routers.validate_story.get_supabase_client")
def test_validate_story_fetches_known_words_when_omitted(mock_get_client):
    supabase = MagicMock()
    supabase.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = [
        {"words": KNOWN_WORDS}
    ]
    mock_get_client.return_value = supabase

    story = (
        "The big red cat sat on the mat. [VISUAL] "
        "The cat sat with a friend and went home. The cat and the friend smiled!"
    )
    payload = _payload(story)
    del payload["known_words"]

    response = _client().post("/validate-story", json=payload)

    assert response.status_code == 200
    assert response.json()["is_valid"] is True
    mock_get_client.assert_called_once()
>>>>>>> be17ea0 (added some tests against the real check logic)
