import os
import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

ML_SERVICE_DIR = Path(__file__).resolve().parents[1]
if str(ML_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(ML_SERVICE_DIR))

import middleware.auth as auth_middleware
import routers.narrate as narrate_router
import services.narration_service as narration_service
from middleware.auth import InternalKeyMiddleware
from services.narration_service import (
    GeneratedNarrationAudio,
    NarrationAlignmentError,
    NarrationProviderError,
    generate_aligned_narration,
    normalize_aligned_words,
)


def _client(monkeypatch):
    monkeypatch.setattr(auth_middleware, "ML_SERVICE_KEY", "test-key")

    app = FastAPI()
    app.add_middleware(InternalKeyMiddleware)
    app.include_router(narrate_router.router)
    return TestClient(app)


def test_narrate_requires_internal_key(monkeypatch):
    client = _client(monkeypatch)

    response = client.post(
        "/narrate",
        json={
            "story_id": "40000000-0000-4000-8000-000000000010",
            "text": "The bird flew.",
        },
    )

    assert response.status_code == 401


def test_valid_narration_request(monkeypatch):
    client = _client(monkeypatch)

    def fake_generate_aligned_narration(*, story_id, text):
        assert story_id == "40000000-0000-4000-8000-000000000010"
        assert text == "The bird flew."
        return {
            "audio_base64": "YXVkaW8=",
            "mime_type": "audio/mpeg",
            "duration": 1.0,
            "words": [{"word": "The", "start": 0.0, "end": 0.28}],
        }

    monkeypatch.setattr(
        narrate_router,
        "generate_aligned_narration",
        fake_generate_aligned_narration,
    )

    response = client.post(
        "/narrate",
        headers={"X-Internal-Key": "test-key"},
        json={
            "story_id": "40000000-0000-4000-8000-000000000010",
            "text": "The bird flew.",
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "audio_base64": "YXVkaW8=",
        "mime_type": "audio/mpeg",
        "duration": 1.0,
        "words": [{"word": "The", "start": 0.0, "end": 0.28}],
    }


def test_fake_provider_returns_deterministic_audio_and_alignment(monkeypatch):
    captured_path = {}

    class FakeProvider:
        def synthesize(self, text):
            assert text == "The bird flew."
            return GeneratedNarrationAudio(
                audio_bytes=b"deterministic-audio",
                mime_type="audio/mpeg",
                duration=1.0,
            )

    def fake_transcribe_audio(audio_path):
        captured_path["path"] = audio_path
        assert os.path.exists(audio_path)
        return {
            "segments": [
                {
                    "words": [
                        {"word": " The ", "start": 0.0, "end": 0.28},
                        {"word": "bird", "start": 0.31, "end": 0.72},
                    ]
                }
            ]
        }

    monkeypatch.setattr(narration_service, "transcribe_audio", fake_transcribe_audio)

    result = generate_aligned_narration(
        story_id="40000000-0000-4000-8000-000000000010",
        text="The bird flew.",
        provider=FakeProvider(),
    )

    assert result["audio_base64"] == "ZGV0ZXJtaW5pc3RpYy1hdWRpbw=="
    assert result["mime_type"] == "audio/mpeg"
    assert result["words"] == [
        {"word": "The", "start": 0.0, "end": 0.28},
        {"word": "bird", "start": 0.31, "end": 0.72},
    ]
    assert captured_path["path"]
    assert not os.path.exists(captured_path["path"])


def test_normalize_trims_empty_words_and_preserves_repeated_words():
    words = normalize_aligned_words(
        [
            {"word": " The ", "start": 0.0, "end": 0.2},
            {"word": " ", "start": 0.25, "end": 0.3},
            {"word": "The", "start": 0.4, "end": 0.6},
        ],
        duration=1.0,
    )

    assert words == [
        {"word": "The", "start": 0.0, "end": 0.2},
        {"word": "The", "start": 0.4, "end": 0.6},
    ]


def test_missing_end_fallback_uses_next_start_and_duration():
    words = normalize_aligned_words(
        [
            {"word": "The", "start": 0.0},
            {"word": "bird", "start": 0.31, "end": 0.72},
            {"word": "flew", "start": 0.8},
        ],
        duration=1.2,
    )

    assert words == [
        {"word": "The", "start": 0.0, "end": 0.31},
        {"word": "bird", "start": 0.31, "end": 0.72},
        {"word": "flew", "start": 0.8, "end": 1.2},
    ]


def test_invalid_timestamps_are_rejected():
    try:
        normalize_aligned_words(
            [{"word": "bad", "start": float("nan"), "end": 0.2}],
            duration=1.0,
        )
    except NarrationAlignmentError:
        pass
    else:
        raise AssertionError("invalid timestamps should be rejected")


def test_provider_failure_returns_standard_error(monkeypatch):
    client = _client(monkeypatch)

    def fake_generate_aligned_narration(*, story_id, text):
        _ = story_id
        _ = text
        raise NarrationProviderError("provider failed")

    monkeypatch.setattr(
        narrate_router,
        "generate_aligned_narration",
        fake_generate_aligned_narration,
    )

    response = client.post(
        "/narrate",
        headers={"X-Internal-Key": "test-key"},
        json={
            "story_id": "40000000-0000-4000-8000-000000000010",
            "text": "The bird flew.",
        },
    )

    assert response.status_code == 502
    assert response.json()["detail"] == "provider failed"
