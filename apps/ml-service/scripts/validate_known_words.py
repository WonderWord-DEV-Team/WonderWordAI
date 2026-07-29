from dotenv import load_dotenv
import os
from supabase import create_client
import re
from datetime import datetime, timedelta, timezone
from collections import defaultdict

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase = create_client(url, key)

TEST_CHILD_ID = "98728fe1-c37b-40a4-8547-93f76889299b"
MIN_CORRECT_READINGS = 2
MIN_ACCURACY_PCT = 0.80
MAX_KNOWN_WORDS = 500
LOOKBACK_DAYS = 30

def normalize_word(word):
    word = word.lower().strip()
    word = re.sub(r"^[^\w']+|[^\w']+$", "", word)
    return word

cutoff = (datetime.now(timezone.utc) - timedelta(days=LOOKBACK_DAYS)).isoformat()

result = supabase.table("reading_events")\
         .select("word", "is_correct", "timestamp")\
         .eq("child_id", TEST_CHILD_ID)\
         .gte("timestamp", cutoff)\
         .execute()

events = result.data
print(f"Found {len(events)} reading events\n")

if not events:
    print("No events found — check child_id or date range")
    exit()

word_stats = defaultdict(lambda: {"total": 0, "correct": 0})

for event in events:
    word = normalize_word(event["word"])
    if not word:
        continue
    word_stats[word]["total"] += 1
    if event["is_correct"]:
        word_stats[word]["correct"] += 1



known_words = []
borderline = []
not_yet = []

for word, stats in word_stats.items():
    total = stats["total"]
    correct = stats["correct"]
    accuracy = correct / total if total > 0 else 0

    if correct >= MIN_CORRECT_READINGS and accuracy >= MIN_ACCURACY_PCT:
        known_words.append({
            "word": word,
            "correct": correct,
            "total": total,
            "accuracy": round(accuracy * 100, 1)
        })
    elif correct >= 1 and accuracy >= MIN_ACCURACY_PCT:
        borderline.append({
            "word": word,
            "correct": correct,
            "total": total,
            "accuracy": round(accuracy * 100, 1)
        })
    else:
        not_yet.append({
            "word": word,
            "correct": correct,
            "total": total,
            "accuracy": round(accuracy * 100, 1)
        })


known_words.sort(key=lambda x: x["correct"], reverse=True)


capped = len(known_words) > MAX_KNOWN_WORDS
known_words = known_words[:MAX_KNOWN_WORDS]


print("=" * 60)
print("MASTERY THRESHOLD VALIDATION")
print(f"Thresholds: ≥{MIN_CORRECT_READINGS} correct readings AND ≥{MIN_ACCURACY_PCT*100:.0f}% accuracy")
print("=" * 60)

print(f"\nKNOWN WORDS ({len(known_words)}):")
for w in known_words:
    print(f"   '{w['word']}' — {w['correct']}/{w['total']} correct ({w['accuracy']}%)")

print(f"\nBORDERLINE — 1 correct reading, needs 1 more ({len(borderline)}):")
for w in borderline:
    print(f"   '{w['word']}' — {w['correct']}/{w['total']} correct ({w['accuracy']}%)")

print(f"\n❌ NOT YET MASTERED ({len(not_yet)}):")
for w in not_yet:
    print(f"   '{w['word']}' — {w['correct']}/{w['total']} correct ({w['accuracy']}%)")

if capped:
    print(f"\nWord list was capped at {MAX_KNOWN_WORDS} words")


print("\n" + "=" * 60)
print("THRESHOLD ANALYSIS")
print("=" * 60)

total_unique = len(word_stats)
known_pct = round(len(known_words) / total_unique * 100, 1) if total_unique > 0 else 0
borderline_pct = round(len(borderline) / total_unique * 100, 1) if total_unique > 0 else 0

print(f"Total unique words seen:     {total_unique}")
print(f"Mastered (known):            {len(known_words)} ({known_pct}%)")
print(f"Borderline (1 more needed):  {len(borderline)} ({borderline_pct}%)")
print(f"Not yet mastered:            {len(not_yet)}")


if known_pct > 80:
    print("\nWARNING: >80% of words marked as known — thresholds may be too lenient")
elif known_pct < 10:
    print("\nWARNING: <10% of words marked as known — thresholds may be too strict")
else:
    print("\nThreshold distribution looks sensible")


print("\n" + "=" * 60)
print("NORMALIZATION EDGE CASES FOUND")
print("=" * 60)

contractions = [w for w in word_stats.keys() if "'" in w]
if contractions:
    print(f"Contractions: {contractions}")
else:
    print("No contractions found in dataset")

short_words = [w for w in word_stats.keys() if len(w) <= 1]
if short_words:
    print(f"Single character words (possible noise): {short_words}")
else:
    print("No single character noise words found")

print("\nDone!")