# Phonics Knowledge Base — WonderWord AI

**Maintainer:** Shreya Chaudhuri  
**Last Updated:** July 2026  
**Location:** `apps/ml-service/scripts/embed_phonics.py`  
**Table:** `phonics_knowledge` (Supabase PostgreSQL + pgvector)

---

## Overview

The Phonics Knowledge Base (KB) is a curated dataset of 30 phonics rule entries covering the Common Core K-5 Reading Foundational Skills scope. Each entry is embedded as a 384-dimensional vector using `all-MiniLM-L6-v2` (sentence-transformers) and stored in a pgvector HNSW index in Supabase for fast semantic similarity search.

The KB powers the `/phonics-lookup` endpoint — when Wav2Vec2 detects a mispronounced word, the endpoint embeds the stuck word + error description and retrieves the top-3 most relevant phonics rules via cosine similarity search. These rules are passed to Claude Sonnet as grounding context for story generation.

---

## Schema

Stored in the `phonics_knowledge` table with the following fields:

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Auto-generated primary key |
| `category` | TEXT | Phonics rule identifier e.g. `sh-digraph` |
| `text` | TEXT | Full text used for embedding — describes the rule and example words |
| `phonics_rule` | TEXT | Human-readable rule explanation passed to Claude |
| `example_words` | TEXT[] | Array of example words for the rule |
| `embedding` | vector(384) | all-MiniLM-L6-v2 output, HNSW indexed for cosine similarity |
| `created_at` | TIMESTAMPTZ | Auto-generated timestamp |

---

## Categories Covered

### Kindergarten (5 rules)
| Category | Description | Example Words |
|---|---|---|
| `short-a` | Short vowel A — /a/ sound | cat, map, sat, bag |
| `short-e` | Short vowel E — /e/ sound | bed, red, pet, hen |
| `short-i` | Short vowel I — /ih/ sound | sit, hit, pig, win |
| `short-o` | Short vowel O — /aa/ sound | hot, dog, top, hop |
| `short-u` | Short vowel U — /uh/ sound | sun, run, cup, bug |

### Grade 1 (8 rules)
| Category | Description | Example Words |
|---|---|---|
| `sh-digraph` | SH consonant digraph — /sh/ sound | ship, fish, brush, shell |
| `ch-digraph` | CH consonant digraph — /ch/ sound | chip, much, chair, peach |
| `th-digraph` | TH consonant digraph — voiced and unvoiced | this, that, think, with |
| `wh-digraph` | WH consonant digraph — /wh/ sound | what, when, where, why |
| `ph-digraph` | PH consonant digraph — /f/ sound | phone, photo, trophy |
| `ck-digraph` | CK consonant digraph — /k/ sound | lock, pack, track, truck |
| `bl-blend` | BL consonant blend | black, blue, block, blow |
| `cr-blend` | CR consonant blend | crate, cream, crash, cry |

### Grade 2 (8 rules)
| Category | Description | Example Words |
|---|---|---|
| `long-a` | Long A — silent-e pattern (a_e) | cake, bake, gate, name |
| `long-i` | Long I — silent-e pattern (i_e) | like, bike, time, fine |
| `long-o` | Long O — silent-e pattern (o_e) | home, note, stone, rope |
| `vowel-team-ai` | AI vowel team — /ay/ sound | rain, tail, train, paint |
| `vowel-team-ee` | EE vowel team — /ee/ sound | see, tree, feet, green |
| `vowel-team-oa` | OA vowel team — /oh/ sound | boat, coat, road, soap |
| `vowel-team-oo` | OO vowel team — short and long | book, look, moon, food |

### Grade 3 (3 rules)
| Category | Description | Example Words |
|---|---|---|
| `prefix-un` | UN prefix — means "not" or "opposite of" | undo, unkind, unwell |
| `prefix-re` | RE prefix — means "again" or "back" | redo, return, rewrite |
| `suffix-ing` | ING suffix — means "doing" | running, jumping, playing |

### Grade 4–5 (7 rules)
| Category | Description | Example Words |
|---|---|---|
| `r-controlled-ar` | AR r-controlled vowel — /ɑ/ sound | car, star, farm, warm |
| `r-controlled-er` | ER r-controlled vowel — /ɜː/ sound | her, better, teacher |
| `silent-k` | Silent K before N | knife, knee, knock, know |
| `silent-w` | Silent W before R | wrap, write, wrong, wrist |
| `silent-b` | Silent B — MB and BT patterns | lamb, thumb, doubt, debt |
| `silent-gh` | Silent GH after vowels | light, night, high, sigh |
| `silent-l` | Silent L — AL, LF, LK patterns | calm, half, talk, walk |

---

## Embedding Pipeline

The KB is populated by running `apps/ml-service/scripts/embed_phonics.py` **once** at setup. This script:

1. Loads `all-MiniLM-L6-v2` locally (33MB, CPU-only, ~1s load time)
2. Encodes each entry's `text` field into a 384-dim vector
3. Inserts all entries into the `phonics_knowledge` table in Supabase

> ⚠️ **Do not run this script again** unless the KB is intentionally being rebuilt. Running it again will create duplicate entries. Clear the table first with `DELETE FROM phonics_knowledge;` if a rebuild is needed.

---

## Runtime Lookup

At runtime, the `/phonics-lookup` endpoint (FastAPI, `routers/phonics_lookup.py`) handles search:

1. Receives `stuck_word` + optional `error_description` from the ML pipeline
2. Encodes the query locally using the already-loaded `all-MiniLM-L6-v2` model
3. Calls the `match_phonics_knowledge` Supabase RPC function
4. Returns top-3 matches with similarity scores via pgvector cosine similarity (HNSW index, <5ms latency)

### Example Request
```json
{
  "stuck_word": "ship",
  "error_description": "child said S sound instead of SH"
}
```

### Example Response
```json
{
  "stuck_word": "ship",
  "matches": [
    {
      "id": "a8b499c1-...",
      "category": "sh-digraph",
      "text": "sh-digraph: SH sound in ship, fish, brush, shell, wish",
      "phonics_rule": "SH is a consonant digraph — two letters S and H that together make one sound /sh/.",
      "example_words": ["ship", "fish", "brush", "shell", "wish"],
      "similarity": 0.713
    }
  ]
}
```

---

## Known Limitations

- Short vowel vs long vowel disambiguation (e.g. `short-a` vs `long-a`) is unreliable with word-only queries — similarity scores fall within 2% of each other. The `error_description` field from Wav2Vec2 is essential for accurate lookup in these cases.
- The KB currently covers 28 categories. Full K-5 coverage (~70 categories) is planned for post-MVP expansion.

---

## Vocabulary Lists

Separate from the phonics rules, the `curriculum_words` table stores high-frequency word lists used for vocabulary guardrails:

| List | Count | Grade Levels |
|---|---|---|
| Dolch | 220 words | pre-primer, primer, grade-1 through grade-3 |
| Fry | 1000 words | fry-1-100 through fry-901-1000 |

These lists ensure Claude's story generation stays within age-appropriate vocabulary for K-5 readers.

---

## Expansion Plan

When expanding the KB beyond MVP:
1. Add new entries to `phonics_knowledge` list in `embed_phonics.py`
2. Clear the table: `DELETE FROM phonics_knowledge;`
3. Re-run the embedding script
4. No endpoint changes required — the lookup is fully dynamic