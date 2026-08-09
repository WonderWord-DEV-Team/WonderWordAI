import re
from typing import Annotated, Optional

import textstat
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

from services.supabase_service import get_supabase_client

router = APIRouter()

# ticket: implement /api/stories/generate orchestration (known-words -> sonnet -> validate -> image -> store)
#
# content_safety is a keyword blocklist + a lightweight positive-word heuristic,
# not a full spaCy sentiment/NER pipeline (the api-contract.md notes spaCy as an
# option). For a short, tightly-scoped children's story this keeps the guardrail
# fast and dependency-light; each check below is an isolated function, so a
# real spaCy-based check_content_safety() can be swapped in later without
# touching the rest of the endpoint.
BANNED_KEYWORDS = {
    "kill", "killed", "killing", "die", "died", "death", "dead", "blood",
    "gun", "guns", "knife", "knives", "weapon", "weapons", "hate", "hated",
    "stupid", "hurt", "hurts", "scared", "afraid", "monster", "monsters",
    "nightmare", "cry", "crying", "fight", "fighting", "war", "hell",
    "damn", "ugly", "kidnap", "gore", "evil", "demon", "curse", "cursed"
}

POSITIVE_WORDS = {
    "happy", "happily", "fun", "great", "yay", "smiled", "smile", "smiling",
    "laughed", "laugh", "laughing", "joy", "joyful", "excited", "wonderful",
    "amazing", "love", "loved", "proud", "cheer", "cheered", "hooray",
    "glad", "delight", "delighted", "sunny", "warm", "safe", "friend",
    "friends", "hug", "hugged", "celebrate", "celebrated"
}

MAX_GRADE_LEVEL = 3.0
VISUAL_MARKER = "[VISUAL]"

# If a child doesn't have many known words tracked yet, most vocabulary would
# otherwise fail the guardrail below even for normal beginner-reader text. In
# that case, also allow standard early-reading sight words (Dolch + Fry, from
# public.curriculum_words) so validation reflects realistic beginner
# vocabulary rather than only whatever's explicitly been logged for the child.
KNOWN_WORDS_AUGMENT_THRESHOLD = 500
CURRICULUM_LIST_NAMES = ("dolch", "fry")

GuardrailResult = tuple[bool, list[str]]


class ValidateStoryRequest(BaseModel):
    story_text: str
    child_id: str
    word: str
    known_words: Optional[list[str]] = None


def _tokenize(text: str) -> list[str]:
    # Story text embeds inside a JSON string, so the model tends to write
    # dialogue with a single quote (') instead of a double quote, to avoid
    # having to escape it -- e.g. 'This is fun!' said the explorer. Since '
    # is also allowed mid-word for real contractions (don't, it's), a
    # dialogue-opening/closing quote glues onto the adjacent word (making
    # "this" show up as "'this", or an isolated closing quote show up as
    # its own empty-ish token) unless we strip leading/trailing quotes
    # after extracting each token.
    raw_tokens = re.findall(r"[a-zA-Z']+", text.lower())
    return [stripped for token in raw_tokens if (stripped := token.strip("'"))]


def _count_syllables(word: str) -> int:
    normalized = re.sub(r"[^a-z]", "", word.lower())
    if not normalized:
        return 0

    groups = re.findall(r"[aeiouy]+", normalized)
    count = len(groups)

    if normalized.endswith("e") and count > 1:
        count -= 1

    return max(count, 1)


def _fallback_flesch_kincaid_grade(story_text: str) -> float:
    words = _tokenize(story_text.replace(VISUAL_MARKER, " "))
    sentences = [s for s in re.split(r"[.!?]+", story_text) if s.strip()]

    if not words or not sentences:
        return 0.0

    syllables = sum(_count_syllables(word) for word in words)
    words_per_sentence = len(words) / len(sentences)
    syllables_per_word = syllables / len(words)

    return (0.39 * words_per_sentence) + (11.8 * syllables_per_word) - 15.59


def check_vocabulary(story_text: str, word: str, known_words: list[str]) -> GuardrailResult:
    known_set = {w.lower() for w in known_words}
    target = word.lower()
    tokens = _tokenize(story_text.replace(VISUAL_MARKER, " "))

    offenders = sorted({token for token in tokens if token != target and token not in known_set})

    if offenders:
        preview = ", ".join(offenders[:5])
        more = f" (+{len(offenders) - 5} more)" if len(offenders) > 5 else ""
        return False, [f"vocabulary: word(s) '{preview}'{more} not in child known_words"]

    return True, []


def check_complexity(story_text: str) -> GuardrailResult:
    try:
        grade = textstat.flesch_kincaid_grade(story_text)
    except LookupError:
        grade = _fallback_flesch_kincaid_grade(story_text)

    if grade >= MAX_GRADE_LEVEL:
        return False, [f"complexity: Flesch-Kincaid grade {grade:.1f} exceeds limit of {MAX_GRADE_LEVEL:.1f}"]

    return True, []


def check_content_safety(story_text: str) -> GuardrailResult:
    lowered = story_text.lower()
    errors: list[str] = []

    found_banned = sorted(
        keyword for keyword in BANNED_KEYWORDS if re.search(rf"\b{re.escape(keyword)}\b", lowered)
    )
    if found_banned:
        errors.append(f"content_safety: banned keyword(s) found: {', '.join(found_banned)}")

    has_positive = any(re.search(rf"\b{re.escape(w)}\b", lowered) for w in POSITIVE_WORDS)
    if not has_positive:
        errors.append("content_safety: story does not read as positive in tone")

    return len(errors) == 0, errors


def check_structure(story_text: str, word: str) -> GuardrailResult:
    # `word` is unused now that the target-word occurrence-count constraint
    # has been removed (a story is no longer required to mention the target
    # word exactly 2-3 times). Kept in the signature since callers already
    # pass it and a future structural check may want it again.
    errors: list[str] = []

    if VISUAL_MARKER not in story_text:
        errors.append(f"structure: missing {VISUAL_MARKER} marker")

    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", story_text.strip()) if s.strip()]
    ending = sentences[-1].lower() if sentences else ""
    ends_positively = ending.endswith("!") or any(
        re.search(rf"\b{re.escape(w)}\b", ending) for w in POSITIVE_WORDS
    )
    if not ends_positively:
        errors.append("structure: story does not end on a positive note")

    return len(errors) == 0, errors


@router.post("/validate-story")
async def validate_story(
    request: ValidateStoryRequest,
    x_internal_key: Annotated[str | None, Header(alias="X-Internal-Key")] = None,
):
    _ = x_internal_key

    if not request.story_text.strip() or not request.child_id.strip() or not request.word.strip():
        raise HTTPException(
            status_code=400,
            detail={"error": "missing_fields", "message": "story_text, child_id, and word are required."}
        )

    known_words = request.known_words
    if known_words is None:
        known_words = []

        # supabase.table().execute() is blocking network I/O -- run it off
        # the event loop thread so it can't stall other concurrent requests
        # (e.g. /transcribe) while it waits on the network.
        def _fetch_known_words():
            supabase = get_supabase_client()
            return (
                supabase.table("child_known_words")
                .select("words")
                .eq("child_id", request.child_id)
                .limit(1)
                .execute()
            )

        try:
            result = await run_in_threadpool(_fetch_known_words)
            if result.data:
                known_words = [str(w) for w in (result.data[0].get("words") or [])]
        except Exception:
            # if we can't fetch known words, vocabulary will fail loudly below
            # rather than silently passing everything
            known_words = []

    if len(known_words) < KNOWN_WORDS_AUGMENT_THRESHOLD:
        # A child with few tracked known words would otherwise fail
        # vocabulary on ordinary beginner-reader text. Round out the
        # allowed vocabulary with standard Dolch/Fry sight words so the
        # guardrail reflects realistic beginner vocabulary instead.
        #
        # supabase.table().execute() is blocking network I/O -- run it off
        # the event loop thread, same as the known-words fetch above.
        def _fetch_curriculum_words():
            supabase = get_supabase_client()
            return (
                supabase.table("curriculum_words")
                .select("word")
                .in_("list_name", list(CURRICULUM_LIST_NAMES))
                .execute()
            )

        try:
            curriculum_result = await run_in_threadpool(_fetch_curriculum_words)
            curriculum_words = [
                str(row["word"]) for row in (curriculum_result.data or []) if row.get("word")
            ]
            known_words = list({*known_words, *curriculum_words})
        except Exception:
            # if curriculum words can't be fetched, fall back to whatever
            # known_words we already have rather than failing the request
            pass

    checks: dict[str, GuardrailResult] = {
        "vocabulary": check_vocabulary(request.story_text, request.word, known_words),
        "complexity": check_complexity(request.story_text),
        "content_safety": check_content_safety(request.story_text),
        "structure": check_structure(request.story_text, request.word)
    }

    errors: list[str] = []
    guardrails: dict[str, str] = {}
    passed_count = 0

    for name, (passed, guardrail_errors) in checks.items():
        guardrails[name] = "passed" if passed else "failed"
        if passed:
            passed_count += 1
        else:
            errors.extend(guardrail_errors)

    return {
        "is_valid": passed_count == len(checks),
        "validation_score": passed_count * 25,
        "errors": errors,
        "guardrails": guardrails
    }
