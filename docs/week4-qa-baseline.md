# Week 4 QA Baseline

Date: 2026-08-06

Repository: WonderWord-DEV-Team/WonderWordAI

Branch: `chore/week4-qa-baseline`

Baseline start commit from latest `origin/main`: `fd7f61b2d3bebc558d398126aec6034525b90e63`

First verified fix commit: `96c038c9e84363722a0a449e29a90455dadf3f2f`

## Runtime Versions

- Local Node.js: `v22.16.0`
- Local npm: `11.11.1`
- Web CI target: Node.js `20`
- Local Python: `3.11.4`
- ML CI target: Python `3.11.11`
- Supabase CLI: `2.98.2`

## Commands And Results

| Area | Command | Result |
| --- | --- | --- |
| Git baseline | `git fetch origin main` | Passed after sandbox escalation for `.git` metadata. `origin/main` resolved to `fd7f61b2d3bebc558d398126aec6034525b90e63`. |
| Branch | `git switch -C chore/week4-qa-baseline origin/main` | Passed. |
| Web install | `npm ci` in `apps/web` | Initial sandbox DNS failure; passed with network approval. |
| Safe Vitest | `npm run test` | Passed after excluding live tests, `node:test` files, and `.test-output`: 4 files, 16 tests. |
| Auth | `npm run test:auth` | Passed after updating stale child redirect expectation to `/child`: 7 tests. |
| Karaoke | `npm run test:karaoke` | Passed. |
| Narration | `npm run test:narration` | Passed. |
| Live gate | `npm run test:live` | Passed with clear skip: requires `RUN_LIVE_API_TESTS=true`. |
| Typecheck | `npm run typecheck` | Passed after moving standalone `tsc` to a source-only typecheck config; `next build` remains the Next route/type validator. |
| Lint | `npm run lint` | Passed with existing `<img>` warnings in help, privacy, settings, and terms pages. |
| Build | `npm run build` | Passed after lazy Stripe client initialization. Same existing `<img>` warnings. |
| ML install | `.venv/bin/python -m pip install -r requirements.txt pytest` | Initial sandbox DNS failure; passed with network approval. Current requirements install the heavyweight production ML stack. |
| ML pytest | `.venv/bin/python -m pytest tests` | Passed after offline complexity fallback: 21 tests, 6 existing deprecation warnings. |
| Supabase reset | `supabase db reset --local` | Initial Docker socket sandbox failure; passed with local Docker approval. |
| Supabase lint | `supabase db lint --local --fail-on error` | Passed: no schema errors. |
| Supabase pgTAP | `supabase test db` | Passed: 2 files, 60 tests. |

## Pre-Existing Failures Found

- `.github/workflows/web-ci.yml` and `.github/workflows/ml-ci.yml` only echoed placeholder text, so CI could pass without running installs, tests, lint, or builds.
- Normal web `vitest run` collected `apps/web/test_api/live_flow.test.ts`, which can call paid APIs and Supabase Storage.
- Normal web `vitest run` also collected `node:test` files and generated `.test-output`, producing "No test suite found" failures.
- `test_api/stories/generate.test.ts` left the ML validation and phonics clients unmocked, causing deterministic mocked tests to fail without `ML_SERVICE_KEY`.
- `npm run test:auth` expected child role fallback to `/child/demo-session/read`, but the current role home is `/child`.
- `npm run typecheck` could fail locally from stale or partial `.next/types` entries after install/build churn.
- `next build` failed without `STRIPE_SECRET_KEY` because the Stripe client threw during module import.
- ML pytest failed without NLTK `cmudict`; the test path attempted a network download during deterministic tests.

## Environmental Blockers

- Network is required for `npm ci` and Python dependency installation.
- Local Supabase reset/tests require access to the local Docker daemon.
- The ML dependency install is large because `requirements.txt` includes production model/audio packages even though tests mock model calls.

## Session/Auth Risks

- Direct navigation to `/child/[sessionId]/read`: the page currently ignores `params.sessionId`; the surrounding `ChildSessionProvider` starts with `"pending"`, so direct navigation cannot hydrate the intended session or OCR text.
- Refresh after OCR: OCR text is stored only in `ChildSessionContext`, so refresh loses the worksheet text.
- Browser back/forward: route transitions may preserve context within one tab, but OCR/session recovery is not URL- or API-backed.
- Second-tab access: a new tab has a fresh in-memory context and cannot recover OCR text.
- Malformed session ID: API routes validate UUIDs, but the read page does not preflight or report malformed route params.
- Closed session: upload/audio APIs reject closed sessions, but the read page does not preflight session status.
- Another child's session: upload/audio APIs verify ownership, but the read page does not preflight ownership before rendering.
- `ChildSessionProvider` initialized with `"pending"` is a known transitional state that can create a new session instead of using the URL session.
- Memory-only OCR text is a product/privacy choice, but it means session recovery needs an explicit design before implementation.

## Next Recommended PR Boundaries

- E2E/session PR: define whether OCR text should remain memory-only, add deterministic route/session preflight behavior, and cover direct navigation, refresh, back/forward, second tab, malformed IDs, closed sessions, and cross-child access.
- ML dependency PR: split test/runtime dependencies or add a lightweight test requirements file so CI does not install the full production model stack for mocked tests.
- Billing PR: add focused route tests for missing Stripe env at request time and subscription happy paths with mocked Stripe/Supabase clients.
- UI/design parity PR: use direct Figma node links and screenshots for pixel-level comparison; do not mix with CI hardening.
