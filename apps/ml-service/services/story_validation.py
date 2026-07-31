import re
from dataclasses import dataclass

try:
    import textstat
except ImportError:  # pragma: no cover - exercised only in incomplete environments
    textstat = None


GUARDRAIL_NAMES = ("vocabulary", "complexity", "content_safety", "structure")
BANNED_KEYWORDS = {
    "blood", "death", "die", "drug", "gun", "hate", "kill", "knife",
    "murder", "sex", "suicide", "weapon",
}
POSITIVE_ENDINGS = {
    "cheer", "cheered", "fun", "glad", "happy", "joy", "laughed",
    "safe", "smile", "smiled", "together",
}


@dataclass(frozen=True)
class ValidationResult:
    is_valid: bool
    validation_score: int
    errors: list[str]
    guardrails: dict[str, str]


def _words(text: str) -> list[str]:
    return re.findall(r"[a-z]+(?:'[a-z]+)?", text.casefold())


def validate_story(story_text: str, word: str, known_words: list[str]) -> ValidationResult:
    errors: list[str] = []
    statuses = {name: "passed" for name in GUARDRAIL_NAMES}
    tokens = _words(story_text.replace("[VISUAL]", ""))
    target = word.casefold().strip()

    allowed = {word.casefold().strip() for word in known_words}
    unknown = sorted({token for token in tokens if token != target and token not in allowed})
    if unknown:
        statuses["vocabulary"] = "failed"
        errors.extend(
            f"vocabulary: word '{word}' not in child known_words" for word in unknown
        )

    if textstat is not None:
        grade = float(textstat.flesch_kincaid_grade(story_text.replace("[VISUAL]", "")))
        if grade >= 3.0:
            statuses["complexity"] = "failed"
            errors.append(
                f"complexity: Flesch-Kincaid grade {grade:.1f} exceeds limit of 3.0"
            )

    banned = sorted(set(tokens).intersection(BANNED_KEYWORDS))
    if banned:
        statuses["content_safety"] = "failed"
        errors.append(f"content_safety: banned keyword(s): {', '.join(banned)}")

    structure_errors: list[str] = []
    if "[VISUAL]" not in story_text:
        structure_errors.append("missing [VISUAL] marker")
    target_count = tokens.count(target)
    if target_count not in (2, 3):
        structure_errors.append(f"target word must appear 2-3 times (found {target_count})")
    final_words = tokens[-8:]
    if not set(final_words).intersection(POSITIVE_ENDINGS):
        structure_errors.append("story must end positively")
    if structure_errors:
        statuses["structure"] = "failed"
        errors.extend(f"structure: {error}" for error in structure_errors)

    score = sum(status == "passed" for status in statuses.values()) * 25
    return ValidationResult(
        is_valid=all(status == "passed" for status in statuses.values()),
        validation_score=score,
        errors=errors,
        guardrails=statuses,
    )
