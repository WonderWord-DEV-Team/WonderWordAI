import requests
import json

BASE_URL = "http://127.0.0.1:8000"

test_cases = [
    # Kindergarten short vowels
    ("cat", "short vowel A sound", "short-a"),
    ("map", "short A sound in CVC word", "short-a"),
    ("bed", "short vowel E sound", "short-e"),
    ("pet", "short E sound in CVC word", "short-e"),
    ("sit", "short vowel I sound", "short-i"),
    ("pig", "short vowel I sound ", "short-i"),
    ("hot", "short vowel O sound", "short-o"),
    ("dog", "short O sound in CVC word", "short-o"),
    ("sun", "short vowel U sound", "short-u"),
    ("bug", "short U sound in CVC word", "short-u"),

    # Grade 1 digraphs and blends
    ("ship", "child said S sound instead of SH", "sh-digraph"),
    ("fish", "child missed SH digraph sound", "sh-digraph"),
    ("chip", "child said K sound instead of CH", "ch-digraph"),
    ("think", "child missed TH digraph sound", "th-digraph"),
    ("phone", "child said P sound instead of F", "ph-digraph"),
    ("lock", "child said K sound instead of CK consonant pair ", "ck-digraph"),
    ("black", "child missed BL blend at start", "bl-blend"),
    ("cream", "child missed CR blend at start", "cr-blend"),

    # Grade 2 long vowels and vowel teams
    ("cake", "child said short A instead of long A silent e", "long-a"),
    ("bike", "child said short I instead of long I silent e", "long-i"),
    ("home", "child said short O instead of long O silent e", "long-o"),
    ("rain", "child missed AI vowel team sound", "vowel-team-ai"),
    ("tree", "child missed EE vowel team sound", "vowel-team-ee"),
    ("boat", "child missed OA vowel team sound", "vowel-team-oa"),
    ("book", "child missed OO vowel team sound", "vowel-team-oo"),

    # Grade 3 prefixes and suffixes
    ("undo", "child missed UN prefix meaning not", "prefix-un"),
    ("redo", "child missed RE prefix meaning again", "prefix-re"),
    ("running", "child missed ING suffix", "suffix-ing"),

    # Grade 4-5 silent letters
    ("knife", "child pronounced the K sound in KN", "silent-k"),
    ("lamb", "child pronounced the B sound in MB", "silent-b"),
]

correct = 0
incorrect = 0
results = []

for stuck_word, error_description, expected_error in test_cases:
    try:
        response = requests.post(
            f"{BASE_URL}/phonics-lookup",
            json = {
                "stuck_word": stuck_word,
                "error_description": error_description
            },
            headers = {"X-Internal-Key":"test"}
        )

        data = response.json()
        top_match = data["matches"][0] if data["matches"] else None
        returned_category = top_match["category"] if top_match else "NO MATCH"
        similarity = round(top_match["similarity"], 3) if top_match else 0

        passed = returned_category == expected_error

        if passed:
            correct += 1
            status = "ok"
        else:
            incorrect += 1
            status = "X"

        results.append({
            "word": stuck_word,
            "expected": expected_error,
            "returned": returned_category,
            "similarity": similarity,
            "passed": passed
        })

        print(f"{status} '{stuck_word}' → expected: {expected_error} | got: {returned_category} | similarity: {similarity}")

    except Exception as e:
        print(f" X '{stuck_word}' → ERROR: {e}")
        incorrect += 1

total = len(test_cases)
accuracy = round((correct / total) * 100, 1)

print(f"\n{'='*60}")
print(f"VALIDATION RESULTS")
print(f"{'='*60}")
print(f"Total tests:  {total}")
print(f"Passed:       {correct}")
print(f"Failed:       {incorrect}")
print(f"Accuracy:     {accuracy}%")
print(f"Target:       >90%")
print(f"Status:       {'✅ PASSED' if accuracy >= 90 else '❌ BELOW TARGET'}")

failures = [r for r in results if not r["passed"]]
if failures:
    print(f"\nFailed cases:")
    for f in failures:
        print(f"  - '{f['word']}': expected {f['expected']}, got {f['returned']} (similarity: {f['similarity']})")
