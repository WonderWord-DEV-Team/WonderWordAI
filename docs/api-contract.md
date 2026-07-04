# WonderWord AI — Internal API Contract

**Version:** 1.0  
**Author:** Matheus Emanuel da Silva (Lead Engineer)  
**Last updated:** July 7, 2026  
**Status:** Active — do not change field names or types without updating this doc and notifying the team.

---

## Overview

This document defines the contract between the **Web App (Next.js on Vercel)** and the **ML Service (FastAPI on Render/Fly.io)**.

All communication is server-to-server over HTTPS. The browser never calls the ML service directly.

```
Browser
  └── HTTPS ──► Next.js (Web App)
                  └── HTTPS + X-Internal-Key ──► FastAPI (ML Service)
                                                    └── HTTPS ──► Supabase
```

---

## Authentication

Every request from the Web App to the ML Service **must** include this header:

```
X-Internal-Key: <value of ML_SERVICE_KEY env variable>
```

The FastAPI middleware rejects any request missing this header with `401 Unauthorized` — before any endpoint logic runs.

**This key must never be:**
- Committed to the repository
- Logged in plaintext
- Sent to the browser

**Where the key lives:**
- Web App: `ML_SERVICE_KEY` in Vercel environment variables
- ML Service: `ML_SERVICE_KEY` in Render/Fly.io environment variables
- Both: `.env.example` lists the variable name with a placeholder value

---

## Base URL

| Environment | ML Service URL |
|-------------|---------------|
| Development | `http://localhost:8000` |
| Staging | `https://wonderword-ml-staging.onrender.com` |
| Production | `https://wonderword-ml.onrender.com` |

The web app reads this from the `ML_SERVICE_URL` environment variable.

---

## Endpoints

### `GET /health`

Health check. Used by CI/CD to confirm the container is live.

**Request:** No body, no auth header required.

**Response `200 OK`:**
```json
{
  "status": "ok",
  "models_loaded": ["whisperx", "wav2vec2", "sentence_transformers"]
}
```

---

### `POST /transcribe`

Transcribes a child's audio recording and returns word-level timestamps plus any detected miscues.

**Request:**
- Content-Type: `multipart/form-data`
- Body field: `audio` (audio file — `audio/webm` or `audio/wav`)
- Header: `X-Internal-Key` required

```
POST /transcribe
X-Internal-Key: <key>
Content-Type: multipart/form-data

audio: <binary audio blob>
```

**Response `200 OK`:**
```json
{
  "words": ["the", "shark", "swims"],
  "timestamps": [0.0, 0.42, 0.91],
  "miscues": [
    {
      "word": "shark",
      "expected_phonemes": "SH AH R K",
      "actual_phonemes": "S AH R K"
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `words` | `string[]` | All words detected in the audio, in order |
| `timestamps` | `number[]` | Start time in seconds for each word (same index as `words`) |
| `miscues` | `object[]` | Words where the child's pronunciation didn't match. Empty array `[]` if none. |
| `miscues[].word` | `string` | The word that was mispronounced |
| `miscues[].expected_phonemes` | `string` | Correct phoneme sequence (ARPAbet notation) |
| `miscues[].actual_phonemes` | `string` | What the child actually said (ARPAbet notation) |

**Error responses:**
```json
// 400 — audio field missing or unreadable
{ "error": "audio_missing", "message": "No audio file provided." }

// 401 — wrong or missing X-Internal-Key
{ "error": "unauthorized", "message": "Invalid or missing internal key." }

// 500 — WhisperX model error
{ "error": "transcription_failed", "message": "Internal transcription error." }
```

---

### `POST /detect-miscue`

Runs Wav2Vec2 similarity scoring on a child's retry attempt against a reference word. Returns whether the pronunciation clears the 85% threshold.

**Request:**
- Content-Type: `multipart/form-data`
- Header: `X-Internal-Key` required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `audio` | file | ✅ | Child's recorded retry (audio/webm or audio/wav) |
| `reference_word` | string | ✅ | The target word to compare against (e.g. `"shark"`) |
| `expected_phonemes` | string | ✅ | ARPAbet reference (e.g. `"SH AH R K"`) |

**Response `200 OK`:**
```json
{
  "similarity_score": 0.91,
  "passed": true,
  "actual_phonemes": "SH AH R K",
  "feedback": "Perfect! You got it!"
}
```

```json
{
  "similarity_score": 0.62,
  "passed": false,
  "actual_phonemes": "S AH R K",
  "feedback": "Try again! I heard: SARK."
}
```

| Field | Type | Description |
|-------|------|-------------|
| `similarity_score` | `number` | 0.0–1.0. Cosine similarity between child's phonemes and reference. |
| `passed` | `boolean` | `true` if `similarity_score >= 0.85` |
| `actual_phonemes` | `string` | What the child said (ARPAbet) |
| `feedback` | `string` | Human-readable message ready to display in the UI |

> **Note for sree anvita:** The 0.85 threshold is configurable via the `SIMILARITY_THRESHOLD` env variable (default `0.85`). Do not hardcode it.

**Error responses:**
```json
// 400
{ "error": "missing_fields", "message": "audio, reference_word and expected_phonemes are all required." }

// 401
{ "error": "unauthorized", "message": "Invalid or missing internal key." }
```

---

### `POST /phonics-lookup`

Looks up the most relevant phonics rule for a stuck word using pgvector similarity search.

**Request:**
- Content-Type: `application/json`
- Header: `X-Internal-Key` required

```json
{
  "stuck_word": "shark"
}
```

**Response `200 OK`:**
```json
{
  "category": "sh-digraph",
  "rule_explanation": "SH sound — the letters S and H together make one sound, like in ship, fish, and brush.",
  "examples": ["ship", "fish", "brush", "shark", "shadow"],
  "similarity_score": 0.94
}
```

| Field | Type | Description |
|-------|------|-------------|
| `category` | `string` | Phonics category ID (matches `phonics_knowledge.category` in Supabase) |
| `rule_explanation` | `string` | Plain-English rule, age-appropriate language |
| `examples` | `string[]` | Example words from the KB entry |
| `similarity_score` | `number` | pgvector cosine similarity of the match (0.0–1.0) |

> **Note for Shreya:** Return the top 1 result only (best match). The web app does not handle multiple results for now.

**Error responses:**
```json
// 400
{ "error": "missing_field", "message": "stuck_word is required." }

// 404 — no KB entry found above the similarity threshold
{ "error": "no_rule_found", "message": "No phonics rule matched this word." }

// 401
{ "error": "unauthorized", "message": "Invalid or missing internal key." }
```

---

### `POST /validate-story`

Runs the 4-layer guardrails check on a Claude-generated story before it is shown to the child.

**Request:**
- Content-Type: `application/json`
- Header: `X-Internal-Key` required

```json
{
  "story_text": "A big red SHARK swam up fast. The SHARK said hello! Can you say SHARK?",
  "child_id": "child_abc123",
  "word": "shark",
  "known_words": ["the", "a", "big", "red", "up", "fast", "said", "hello", "can", "you", "say"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `story_text` | `string` | ✅ | The full generated story text |
| `child_id` | `string` | ✅ | Used to fetch `child_known_words` from Supabase if `known_words` is not provided |
| `word` | `string` | ✅ | The target new word — allowed to appear even if not in `known_words` |
| `known_words` | `string[]` | ❌ | Optional pre-fetched known words. If omitted, the service fetches from Supabase. |

**Response `200 OK` — story passed:**
```json
{
  "is_valid": true,
  "validation_score": 96,
  "errors": [],
  "guardrails": {
    "vocabulary": "passed",
    "complexity": "passed",
    "content_safety": "passed",
    "structure": "passed"
  }
}
```

**Response `200 OK` — story failed:**
```json
{
  "is_valid": false,
  "validation_score": 42,
  "errors": [
    "vocabulary: word 'enormous' not in child known_words",
    "complexity: Flesch-Kincaid grade 4.2 exceeds limit of 3.0"
  ],
  "guardrails": {
    "vocabulary": "failed",
    "complexity": "failed",
    "content_safety": "passed",
    "structure": "passed"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `is_valid` | `boolean` | `true` only if **all 4** guardrails pass |
| `validation_score` | `integer` | 0–100. Each guardrail contributes 25 points. |
| `errors` | `string[]` | Human-readable list of failures. Empty array if valid. |
| `guardrails` | `object` | Per-guardrail result: `"passed"` or `"failed"` |

**The 4 guardrails (for sree anvita's implementation reference):**

| # | Name | Check | Tool |
|---|------|-------|------|
| 1 | `vocabulary` | Every word except `word` must be in `known_words` | Plain string comparison |
| 2 | `complexity` | Flesch-Kincaid grade level < 3.0 | `textstat` library |
| 3 | `content_safety` | No banned keywords, positive sentiment | Keyword blocklist + `spaCy` |
| 4 | `structure` | Contains `[VISUAL]` marker, `word` appears 2–3 times, ends positively | Regex / string checks |

**Error responses:**
```json
// 400
{ "error": "missing_fields", "message": "story_text, child_id, and word are required." }

// 401
{ "error": "unauthorized", "message": "Invalid or missing internal key." }
```

---

### `POST /activity-recommendation`

Returns a Playful Practice offline activity for a detected phonics deficit.

**Request:**
- Content-Type: `application/json`
- Header: `X-Internal-Key` required

```json
{
  "phonics_category": "sh-digraph"
}
```

**Response `200 OK`:**
```json
{
  "title": "Silly Shadow Puppets",
  "description": "Turn off the lights and use a flashlight. As shadow animals appear, the child shouts SH words (e.g. Shark, Sheep, Shadow) to make them move.",
  "pedagogy": "Connects kinetic motor controls with vocal phonetic blending to reinforce pronunciation patterns.",
  "phonics_category": "sh-digraph"
}
```

**Response `200 OK` — unknown category (fallback):**
```json
{
  "title": "Word Detective",
  "description": "Look around the house and find objects whose names start with the tricky sound. Say each one out loud three times!",
  "pedagogy": "Environmental word-finding reinforces phoneme-grapheme connections through real-world context.",
  "phonics_category": "unknown"
}
```

> **Note for Jiya:** The fallback activity above must be returned (not a 404) when the category is not found in the DB. This keeps the parent dashboard from ever showing an error.

**Error responses:**
```json
// 400
{ "error": "missing_field", "message": "phonics_category is required." }

// 401
{ "error": "unauthorized", "message": "Invalid or missing internal key." }
```

---

## Environment Variables Reference

Both services must have these variables configured before Week 1 ends.

| Variable | Service | Description |
|----------|---------|-------------|
| `ML_SERVICE_URL` | Web App | Base URL of the ML service (no trailing slash) |
| `ML_SERVICE_KEY` | Web App + ML Service | Shared secret for X-Internal-Key auth |
| `SUPABASE_URL` | Web App + ML Service | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ML Service | Service role key (bypasses RLS — only in ML service, never in browser) |
| `SUPABASE_ANON_KEY` | Web App | Public anon key (safe to use client-side) |
| `ANTHROPIC_API_KEY` | Web App | Claude API key — only called from Next.js, never from ML service |
| `SIMILARITY_THRESHOLD` | ML Service | Wav2Vec2 pass threshold (default: `0.85`) |
| `OPENAI_API_KEY` | Web App | DALL-E fallback image generation |
| `UNSPLASH_ACCESS_KEY` | Web App | Unsplash image lookup |

> **Security rule:** Variables ending in `_KEY` or `_SECRET` must never be committed to the repo. Each app folder has a `.env.example` with placeholder values — copy it to `.env.local` and fill in real values locally.

---

## Error Response Shape (Standard)

All errors across all endpoints follow this shape:

```json
{
  "error": "snake_case_error_code",
  "message": "Human-readable description."
}
```

Never return raw Python exceptions or stack traces in the response body.

---

## Who Owns What

| Endpoint | Implemented by | Consumed by |
|----------|---------------|-------------|
| `GET /health` | sree anvita | CI/CD pipeline |
| `POST /transcribe` | sree anvita | Sungjun (Next.js audio route) |
| `POST /detect-miscue` | sree anvita | Matheus (practice loop) |
| `POST /phonics-lookup` | Shreya | Matheus (/api/stories/generate) |
| `POST /validate-story` | sree anvita + Matheus | Matheus (/api/stories/generate) |
| `POST /activity-recommendation` | Jiya | Swati (parent dashboard) |

---

## Change Policy

If you need to change a field name, type, or add/remove a field:

1. Update this file in a PR first.
2. Tag `@matheus` and the endpoint owner in the PR for review.
3. Only merge after both approve.
4. Announce in Discord `#engineering` with what changed.

Breaking changes (removing or renaming fields) require 24h notice before merging so dependent code can be updated in parallel.