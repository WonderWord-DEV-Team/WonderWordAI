import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

from fastapi import FastAPI
from fastapi.testclient import TestClient

ML_SERVICE_DIR = Path(__file__).resolve().parents[1]
if str(ML_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(ML_SERVICE_DIR))

import middleware.auth as auth_middleware
from middleware.auth import InternalKeyMiddleware
from routers.activity import router

@patch("routers.activity.call_claude")
@patch("routers.activity.get_supabase_client")
def test_activity_recommendation(mock_get_supabase, mock_call_claude, monkeypatch):
    monkeypatch.setattr(auth_middleware, "ML_SERVICE_KEY", "test-key")

    app = FastAPI()
    app.add_middleware(InternalKeyMiddleware)
    app.include_router(router)
    client = TestClient(app)

    # Mock Supabase table query response
    mock_supabase_client = MagicMock()
    mock_get_supabase.return_value = mock_supabase_client

    mock_response = MagicMock()
    mock_response.data = [{
        "phonics_category": "sh-digraph",
        "title": "Silly Shadow Puppets",
        "description": "Flashlight game...",
        "pedagogy": "Reinforces sh sound..."
    }]
    mock_supabase_client.table().select().eq().execute.return_value = mock_response

    # Mock Claude response
    mock_call_claude.return_value = "Claude recommendations text..."

    response = client.post(
        "/activity-recommendation",
        headers={
            "X-Internal-Key": "test-key"
        },
        json={
            "phonics_category": "sh-digraph"
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert data["phonics_category"] == "sh-digraph"
    assert data["title"] == "Silly Shadow Puppets"
    assert data["recommendation"] == "Claude recommendations text..."
