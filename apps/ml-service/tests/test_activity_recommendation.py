import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

ML_SERVICE_DIR = Path(__file__).resolve().parents[1]
if str(ML_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(ML_SERVICE_DIR))

from routers.activity_recommendation import FALLBACK_ACTIVITY, router


def _client():
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


def _mock_text_block(text: str):
    block = MagicMock()
    block.type = "text"
    block.text = text
    return block


def _mock_claude_response(payload: dict):
    response = MagicMock()
    response.content = [_mock_text_block(str(payload).replace("'", '"'))]
    return response


ACTIVITY_JSON = """{
  "title": "Shadow Puppets SH Game",
  "description": "Turn off the lights and use a flashlight.",
  "pedagogy": "Connects kinetic motor controls with vocal phonetic blending.",
  "duration_minutes": 10,
  "materials": [{"icon": "lamp", "label": "Lamp or torch"}],
  "example_words": ["ship", "shell", "shout"],
  "steps": [{"title": "Set the scene", "description": "Darken the room and shine a lamp at a wall."}]
}"""

RECOMMENDATION_TEXT = "# Why It Helps\n- Builds sound awareness"


@patch("routers.activity_recommendation.anthropic_client")
def test_activity_recommendation_generates_activity_and_recommendation(mock_client, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")

    activity_response = MagicMock()
    activity_response.content = [_mock_text_block(ACTIVITY_JSON)]

    recommendation_response = MagicMock()
    recommendation_response.content = [_mock_text_block(RECOMMENDATION_TEXT)]

    mock_client.messages.create.side_effect = [activity_response, recommendation_response]

    response = _client().post(
        "/activity-recommendation",
        json={"phonics_category": "sh-digraph", "recent_miscue_words": ["ship", "wish"], "child_name": "Leo"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Shadow Puppets SH Game"
    assert data["phonics_category"] == "sh-digraph"
    assert data["recommendation"] == RECOMMENDATION_TEXT
    assert mock_client.messages.create.call_count == 2


@patch("routers.activity_recommendation.anthropic_client")
def test_activity_recommendation_falls_back_when_claude_returns_malformed_json(mock_client, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")

    bad_response = MagicMock()
    bad_response.content = [_mock_text_block("not json at all")]
    mock_client.messages.create.return_value = bad_response

    response = _client().post(
        "/activity-recommendation",
        json={"phonics_category": "sh-digraph"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["title"] == FALLBACK_ACTIVITY["title"]
    assert data["phonics_category"] == "sh-digraph"


def test_activity_recommendation_falls_back_without_api_key(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)

    response = _client().post(
        "/activity-recommendation",
        json={"phonics_category": "sh-digraph"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["title"] == FALLBACK_ACTIVITY["title"]
    assert data["recommendation"] is None


def test_activity_recommendation_requires_phonics_category():
    response = _client().post("/activity-recommendation", json={})
    assert response.status_code == 422