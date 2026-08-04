import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

# Make imports reliable whether pytest is run from the repository root or here.
ML_SERVICE_DIR = Path(__file__).resolve().parents[1]
if str(ML_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(ML_SERVICE_DIR))

from routers.activity_recommendation import FALLBACK_ACTIVITY, router


def _client():
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


def _mock_supabase(rows):
    supabase = MagicMock()
    supabase.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = rows
    return supabase


# ticket: integrate playful practice recommendations into parent dashboard
def _sample_row():
    return {
        "title": "Shadow Puppets SH Game",
        "description": "Turn off the lights and use a flashlight.",
        "pedagogy": "Connects kinetic motor controls with vocal phonetic blending.",
        "phonics_category": "sh-digraph",
        "duration_minutes": 10,
        "materials": [
            {"icon": "lamp", "label": "Lamp or torch"},
            {"icon": "wall", "label": "A plain white wall"}
        ],
        "example_words": ["ship", "shell", "shout", "fish", "wish"],
        "steps": [
            {"title": "Set the scene", "description": "Darken the room and shine a lamp at a wall."}
        ]
    }


@patch("routers.activity_recommendation.get_supabase_client")
def test_activity_recommendation_returns_matching_row(mock_get_client):
    row = _sample_row()
    mock_get_client.return_value = _mock_supabase([row])

    response = _client().post(
        "/activity-recommendation",
        json={"phonics_category": "sh-digraph"}
    )

    assert response.status_code == 200
    assert response.json() == row


@patch("routers.activity_recommendation.get_supabase_client")
def test_activity_recommendation_falls_back_for_unknown_category(mock_get_client):
    mock_get_client.return_value = _mock_supabase([])

    response = _client().post(
        "/activity-recommendation",
        json={"phonics_category": "not-a-real-category"}
    )

    assert response.status_code == 200
    assert response.json() == FALLBACK_ACTIVITY
    # fallback must carry the same detail fields the modal relies on
    assert "steps" in response.json()
    assert "materials" in response.json()


@patch("routers.activity_recommendation.get_supabase_client")
def test_activity_recommendation_falls_back_on_lookup_error(mock_get_client):
    mock_get_client.side_effect = RuntimeError("supabase unavailable")

    response = _client().post(
        "/activity-recommendation",
        json={"phonics_category": "sh-digraph"}
    )

    # the dashboard must never see an error state for this endpoint
    assert response.status_code == 200
    assert response.json() == FALLBACK_ACTIVITY


@patch("routers.activity_recommendation.get_supabase_client")
def test_activity_recommendation_requires_phonics_category(mock_get_client):
    response = _client().post("/activity-recommendation", json={})

    assert response.status_code == 422
    mock_get_client.assert_not_called()
