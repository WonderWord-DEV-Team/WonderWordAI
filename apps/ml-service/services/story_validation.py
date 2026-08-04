

import re
from dataclasses import dataclass, field

import textstat

MAX_GRADE_LEVEL = 3.0
POINTS_PER_GUARDRAIL = 25
TARGET_WORD_MIN_OCCURRENCES = 2
TARGET_WORD_MAX_OCCURRENCES = 3
VISUAL_MARKER = "[VISUAL]"

WORD_PATTERN = re.compile(r"[A-Za-z']+")


BANNED_KEYWORDS = {
    "kill", "die", "dead", "death", "blood", "gun", "knife", "weapon",
    "hate", "stupid", "dumb", "ugly", "scary", "monster", "nightmare",
    "hell", "damn", "hurt", "punch", "fight", "war", "cry", "crying",
}

POSITIVE_WORDS = {
    "happy", "yay", "smile", "smiled", "smiling", "fun", "joy", "joyful",
    "great", "wonderful", "love", "loved", "friend", "friends", "laugh",
    "laughed", "laughing", "excited", "proud", "hooray", "hug", "hugged",
    "kind", "brave", "sunny", "bright", "good", "wow", "amazing",
}

NEGATIVE_WORDS = {
    "sad", "angry", "mad", "cried", "crying", "afraid", "scared", "lonely",
    "worried", "upset", "bad", "terrible", "awful", "mean",
}

# High-frequency connective words should not need to be explicitly mastered
# before they can appear naturally in a generated story.
COMMON_WORDS = {
    "a", "an", "and", "are", "as", "at", "be", "but", "by", "did", "do",
    "for", "from", "had", "has", "have", "he", "her", "here", "him", "his",
    "i", "in", "is", "it", "its", "me", "my", "no", "not", "of", "on", "or",
    "our", "said", "she", "so", "that", "the", "their", "them", "then", "there",
    "they", "this", "to", "up", "us", "was", "we", "were", "with", "you", "your",
    "aren't", "can't", "couldn't", "didn't", "doesn't", "don't", "hadn't", "hasn't",
    "haven't", "he's", "here's", "i'd", "i'll", "i'm", "i've", "isn't", "it's",
    "let's", "she's", "shouldn't", "that's", "there's", "they're", "wasn't", "we'd",
    "we'll", "we're", "we've", "weren't", "what's", "where's", "who's", "won't",
    "wouldn't", "you'd", "you'll", "you're", "you've",
}


@dataclass
class ValidationResult:
    is_valid: bool
    validation_score: int
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    guardrails: dict[str, str] = field(default_factory=dict)


def _normalize_word(word: str) -> str:
    return re.sub(r"[^a-z']", "", word.lower())


def _extract_words(text: str) -> list[str]:
    cleaned = text.replace(VISUAL_MARKER, " ")
    return WORD_PATTERN.findall(cleaned)


def _word_forms(word: str) -> set[str]:
    """Return conservative base-form candidates for vocabulary matching."""
    forms = {word}
    if word.endswith("'s"):
        forms.add(word[:-2])
    if word.endswith("ies") and len(word) > 4:
        forms.add(word[:-3] + "y")
    if word.endswith("ied") and len(word) > 4:
        forms.add(word[:-3] + "y")
    for suffix in ("ing", "ed", "es", "s"):
        if word.endswith(suffix) and len(word) > len(suffix) + 2:
            stem = word[:-len(suffix)]
            forms.add(stem)
            if suffix in ("ing", "ed"):
                forms.add(stem + "e")
                if len(stem) > 2 and stem[-1] == stem[-2]:
                    forms.add(stem[:-1])
    return forms


def check_vocabulary(story_text: str, target_word: str, known_words: list[str]) -> tuple[bool, str]:
    known_normalized = COMMON_WORDS | {
        normalized
        for known_word in known_words
        if (normalized := _normalize_word(str(known_word)))
    }
    target_normalized = _normalize_word(target_word)

    disallowed: set[str] = set()
    for raw_word in _extract_words(story_text):
        normalized = _normalize_word(raw_word)
        if not normalized or normalized == target_normalized:
            continue
        if _word_forms(normalized).isdisjoint(known_normalized):
            disallowed.add(raw_word)

    if disallowed:
        sample = ", ".join(sorted(disallowed)[:5])
        return False, f"vocabulary: word(s) not in child known_words: {sample}"

    return True, ""


def check_complexity(story_text: str) -> tuple[bool, str]:
    grade = textstat.flesch_kincaid_grade(story_text)

    if grade >= MAX_GRADE_LEVEL:
        return False, f"complexity: Flesch-Kincaid grade {grade:.1f} exceeds limit of {MAX_GRADE_LEVEL}"

    return True, ""


def check_content_safety(story_text: str) -> tuple[bool, str]:
    tokens_lower = {_normalize_word(word) for word in _extract_words(story_text)}

    banned_hits = tokens_lower & BANNED_KEYWORDS
    if banned_hits:
        return False, f"content_safety: contains restricted keyword(s): {', '.join(sorted(banned_hits))}"

    positive_hits = len(tokens_lower & POSITIVE_WORDS)
    negative_hits = len(tokens_lower & NEGATIVE_WORDS)

    if negative_hits > positive_hits:
        return False, "content_safety: sentiment is not sufficiently positive for a children's story"

    return True, ""


def check_structure(story_text: str, target_word: str) -> tuple[bool, str]:
    problems: list[str] = []

    if VISUAL_MARKER not in story_text:
        problems.append("structure: missing [VISUAL] marker")

    target_normalized = _normalize_word(target_word)
    occurrences = sum(
        1 for raw_word in _extract_words(story_text)
        if _normalize_word(raw_word) == target_normalized
    )
    if not (TARGET_WORD_MIN_OCCURRENCES <= occurrences <= TARGET_WORD_MAX_OCCURRENCES):
        problems.append(
            f"structure: target word '{target_word}' appears {occurrences} times, "
            f"expected {TARGET_WORD_MIN_OCCURRENCES}-{TARGET_WORD_MAX_OCCURRENCES}"
        )

    if not _ends_positively(story_text):
        problems.append("structure: story does not end on a positive note")

    if problems:
        return False, "; ".join(problems)

    return True, ""


def _ends_positively(story_text: str) -> bool:
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", story_text.strip()) if s.strip()]
    if not sentences:
        return False

    last_sentence = sentences[-1].lower()
    last_words = {_normalize_word(w) for w in WORD_PATTERN.findall(last_sentence)}

    if last_words & NEGATIVE_WORDS:
        return False

    return bool(last_words & POSITIVE_WORDS) or last_sentence.endswith("!")


def validate_story(*, story_text: str, word: str, known_words: list[str]) -> ValidationResult:
    checks = {
        "vocabulary": check_vocabulary(story_text, word, known_words),
        "complexity": check_complexity(story_text),
        "content_safety": check_content_safety(story_text),
        "structure": check_structure(story_text, word),
    }

    errors: list[str] = []
    warnings: list[str] = []
    guardrails: dict[str, str] = {}
    score = 0

    for name, (passed, message) in checks.items():
        if name == "vocabulary" and not passed:
            guardrails[name] = "warning"
            warnings.append(message)
            score += POINTS_PER_GUARDRAIL - 5
            continue

        guardrails[name] = "passed" if passed else "failed"
        if passed:
            score += POINTS_PER_GUARDRAIL
        else:
            errors.append(message)

    return ValidationResult(
        is_valid=len(errors) == 0,
        validation_score=score,
        errors=errors,
        warnings=warnings,
        guardrails=guardrails,
    )
