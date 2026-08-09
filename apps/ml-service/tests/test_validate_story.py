import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

ML_SERVICE_DIR = Path(__file__).resolve().parents[1]
if str(ML_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(ML_SERVICE_DIR))

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


def test_validate_story_passes_with_single_target_word_mention():
    # The 2-3 occurrence structure constraint was removed -- a single
    # mention of the target word should no longer fail structure.
    story = "The big red cat sat on the mat. [VISUAL] The friend smiled!"

    response = _client().post("/validate-story", json=_payload(story))
    body = response.json()

    assert response.status_code == 200
    assert body["guardrails"]["structure"] == "passed"


def test_validate_story_fails_content_safety_for_banned_keywords():
    story = "The big red cat was scared and started to cry. [VISUAL] The cat cat smiled!"

    response = _client().post("/validate-story", json=_payload(story))
    body = response.json()

    assert response.status_code == 200
    assert body["is_valid"] is False
    assert body["guardrails"]["content_safety"] == "failed"
    assert any("banned keyword" in error for error in body["errors"])


def test_validate_story_vocabulary_ignores_dialogue_quote_glued_to_word():
    # Since story_text is embedded in a JSON string, the model tends to
    # write dialogue with a single quote (') rather than a double quote to
    # avoid escaping -- e.g. 'This is fun!' said the cat. A naive tokenizer
    # glues that quote onto the word ("'this" != "this"), wrongly flagging
    # a perfectly known word as unknown.
    story = (
        "The big red cat sat on the mat. [VISUAL] "
        "'This is fun!' said the cat. The cat and the friend smiled!"
    )

    response = _client().post(
        "/validate-story",
        json=_payload(story, known_words=KNOWN_WORDS + ["this", "is", "fun", "said"])
    )
    body = response.json()

    assert response.status_code == 200
    assert body["guardrails"]["vocabulary"] == "passed"


def test_validate_story_requires_fields():
    response = _client().post(
        "/validate-story",
        json={"story_text": "", "child_id": "", "word": ""}
    )

    assert response.status_code == 400


@patch("routers.validate_story.get_supabase_client")
def test_validate_story_fetches_known_words_when_omitted(mock_get_client):
    def _table(name):
        mock = MagicMock()
        if name == "child_known_words":
            mock.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = [
                {"words": KNOWN_WORDS}
            ]
        elif name == "curriculum_words":
            mock.select.return_value.in_.return_value.execute.return_value.data = []
        return mock

    supabase = MagicMock()
    supabase.table.side_effect = _table
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
    # once for child_known_words, once for the curriculum_words augmentation
    assert mock_get_client.call_count == 2


@patch("routers.validate_story.get_supabase_client")
def test_validate_story_augments_vocabulary_with_curriculum_words_when_below_threshold(mock_get_client):
    # "playground" isn't in KNOWN_WORDS, but it is a Dolch/Fry sight word --
    # with a child known-words list under the 500-word threshold, it should
    # be allowed in via public.curriculum_words.
    supabase = MagicMock()
    supabase.table.return_value.select.return_value.in_.return_value.execute.return_value.data = [
        {"word": "playground"}
    ]
    mock_get_client.return_value = supabase

    story = (
        "The big red cat sat on the mat. [VISUAL] "
        "The cat and a friend went home and smiled with the playground!"
    )

    response = _client().post(
        "/validate-story",
        json=_payload(story, known_words=KNOWN_WORDS)
    )
    body = response.json()

    assert response.status_code == 200
    assert body["guardrails"]["vocabulary"] == "passed"
    mock_get_client.assert_called_once()
    supabase.table.assert_called_with("curriculum_words")
    supabase.table.return_value.select.return_value.in_.assert_called_with(
        "list_name", ["dolch", "fry"]
    )


@patch("routers.validate_story.get_supabase_client")
def test_validate_story_skips_curriculum_words_when_above_threshold(mock_get_client):
    # With 500+ known words already, curriculum words shouldn't be fetched
    # at all, and an out-of-list word should still fail vocabulary.
    many_known_words = KNOWN_WORDS + [f"word{i}" for i in range(500)]

    story = (
        "The big red cat sat on the mat. [VISUAL] "
        "The cat went to the playground with a friend and smiled!"
    )

    response = _client().post(
        "/validate-story",
        json=_payload(story, known_words=many_known_words)
    )
    body = response.json()

    assert response.status_code == 200
    assert body["guardrails"]["vocabulary"] == "failed"
    assert any("playground" in error for error in body["errors"])
    mock_get_client.assert_not_called()


@patch("routers.validate_story.get_supabase_client")
def test_validate_story_falls_back_when_curriculum_words_fetch_fails(mock_get_client):
    # If the curriculum_words fetch errors out, validation should still
    # complete using whatever known_words were already available rather
    # than failing the whole request.
    mock_get_client.side_effect = RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")

    story = (
        "The big red cat sat on the mat. [VISUAL] "
        "The cat sat with a friend and went home. The cat and the friend smiled!"
    )

    response = _client().post(
        "/validate-story",
        json=_payload(story, known_words=KNOWN_WORDS)
    )
    body = response.json()

    assert response.status_code == 200
    assert body["guardrails"]["vocabulary"] == "passed"
