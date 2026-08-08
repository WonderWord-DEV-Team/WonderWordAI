# Week 4 E2E Auth And Session Foundation

Date: 2026-08-08

Repository: WonderWord-DEV-Team/WonderWordAI

Branch: `test/week4-e2e-auth-session`

Starting branch and commit: `main` at `a99f4b62d1a9b08af3cd58afc3c79fd00464bd83`

Branch base: `origin/main` at `a99f4b62d1a9b08af3cd58afc3c79fd00464bd83`

Base decision: `origin/chore/week4-qa-baseline` is an ancestor of `origin/main`, so this branch starts from the latest `origin/main` and does not duplicate the QA-baseline work.

Tested E2E implementation commit: `17e6cd6` (`test: add auth and session E2E coverage`). This documentation/CI update is layered on top.

## Previous QA Findings Used

- Auth is Supabase-cookie based, with app roles resolved from `public.users.role` and protected-route decisions centralized in middleware policy.
- Parent/child role homes are `/profiles` for parents and `/child` for children.
- Session APIs use `public.reading_sessions`; child writes are already guarded by authenticated app-user checks and ownership checks.
- `ChildSessionProvider` previously initialized child routes with `sessionId="pending"`.
- Direct navigation to `/child/[sessionId]/read` previously ignored the route session ID.
- OCR text was memory-only in React context; browser refresh or a second tab could not recover it.
- Upload/audio routes validate session UUIDs, ownership, and closed sessions server-side.
- Known risk: memory-only OCR state needs an explicit recovery state instead of blank or stale reading UI.
- Existing deterministic checks are `npm run test`, `npm run test:auth`, `npm run test:karaoke`, `npm run test:narration`, `npm run typecheck`, `npm run lint`, `npm run build`, ML pytest, and local Supabase db tests.

## E2E Architecture

Selected approach: controlled API/app fixture mode with deterministic network blocking.

What is real:

- Next.js App Router pages, middleware policy, React components, TanStack Query hooks, and browser navigation.
- Reading-session API request/response validation.
- Worksheet upload UI and client-side file flow.
- Session route preflight through `GET /api/sessions/:id`.

What is mocked:

- Supabase Auth and database rows are represented by local synthetic fixtures when `WONDERWORD_E2E=1`.
- OCR returns deterministic derived text from `/api/upload` in E2E mode.
- No OpenAI, Anthropic, Unsplash, Google Vision, Stripe, Twilio, production storage, or production Supabase request is required.

Safety gates:

- Fixture mode requires `WONDERWORD_E2E=1`, `WONDERWORD_E2E_AUTH_SECRET`, and `NODE_ENV !== "production"`.
- The E2E reset endpoint returns 404 outside fixture mode.
- Playwright blocks browser requests to production Supabase and paid provider hostnames.
- CI installs only Chromium for browser E2E.

## Synthetic Fixtures

Fixture accounts are synthetic and contain no passwords:

- Parent one: `parent.one@example.test`, role `PARENT`
- Child one: `child.one@example.test`, role `CHILD`, linked to parent one
- Parent two: `parent.two@example.test`, role `PARENT`
- Child two: `child.two@example.test`, role `CHILD`, linked to parent two
- Missing profile auth account: `missing.profile@example.test`, no application user row
- Expired auth account: `expired@example.test`, treated as unauthenticated

Fixture sessions:

- Open session owned by child one
- Closed session owned by child one
- Open session owned by child two in another family
- Deterministic newly created sessions use `50000000-0000-4000-8000-*`

Sessions are reset before every Playwright test via `/api/e2e/reset`.

## Route Matrix

- `/child`: child-only; parents redirect to `/profiles`; unauthenticated users redirect to `/auth/login`.
- `/child/[sessionId]/read`: child-only; route `sessionId` is authoritative and preflighted through the session API.
- `/parent/dashboard`: parent-only; children redirect to `/child`; unauthenticated users redirect to `/auth/login`.
- `/profiles`: parent-only profile selection in the tested fixture path.
- `/settings`: now parent-protected by middleware.
- `/api/sessions`: authenticated session list/create; child create only.
- `/api/sessions/:id`: authenticated child session read/close; malformed IDs return 400, inaccessible sessions return 404.
- `/api/upload`: child-only OCR upload; rejects missing, malformed, inaccessible, or closed sessions before OCR.

## Session Ownership Rules

- The URL identifies the requested reading session.
- Server/API preflight validates session UUID, authenticated role, ownership, existence, and closed/open state.
- Client context stores temporary worksheet text, audio/transcription state, and UI progress only.
- Authorization does not depend on React context, localStorage, hidden controls, or remembered tabs.
- Unauthorized responses do not expose child names, worksheet text, story text, report data, audio URLs, or ownership metadata.

## Worksheet/OCR Refresh

E2E OCR returns:

`The moon glows over the quiet lake. Sam reads every bright word aloud.`

The app does not persist raw worksheet images and does not store raw images in localStorage. Refresh after OCR intentionally shows a recovery state: worksheet text is no longer available, and the child can rescan or return home. Stale localStorage values from another session are ignored.

## Commands

Local web E2E setup:

```sh
cd apps/web
npm ci
npx playwright install chromium
npm run test:e2e
```

Useful local commands:

```sh
npm run test:e2e:ui
npm run test:e2e:report
```

CI behavior:

- `npm ci`
- safe Vitest, auth, karaoke, and narration tests
- typecheck
- lint
- production build
- `npx playwright install --with-deps chromium`
- `npm run test:e2e`
- upload `playwright-report` and `test-results` only on failure

Required environment-variable names for production/local app runs:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY`

Required environment-variable names for E2E fixture mode:

- `WONDERWORD_E2E`
- `WONDERWORD_E2E_AUTH_SECRET`
- `PLAYWRIGHT_BASE_URL`
- `PORT`

No values are documented here.

## Test Coverage Added

Authentication:

- redirects unauthenticated child-route access
- redirects unauthenticated parent-route access
- allows parent dashboard access for a parent
- blocks parent access to child-only mode
- blocks child access to parent dashboard
- blocks child access to parent settings
- safely handles missing application profile
- safely handles expired authentication

Session access and navigation:

- allows child to open their active session
- blocks access to another child or family session
- handles nonexistent, malformed, and closed sessions
- supports direct navigation
- handles refresh intentionally
- clears stale state when navigating between sessions
- prevents duplicate session creation from repeated worksheet scan clicks
- safely opens the same session in a second tab
- supports browser back and forward navigation

Worksheet/OCR:

- renders deterministic OCR text
- handles refresh without retaining raw image
- rejects stale worksheet state from a different session

Server/API security:

- unauthenticated session API request is rejected
- cross-family session API request is rejected
- parent direct session API request for another family is rejected
- closed-session worksheet write is rejected
- malformed session input returns 400 instead of crashing
- missing session input is rejected
- repeated session-close request is safe

## Defects Discovered And Fixed

- `/child/[sessionId]/read` ignored `params.sessionId`; it now passes the route session to the client shell.
- The read page lacked a canonical session preflight; `GET /api/sessions/:id` now validates UUID, auth role, ownership, and existence.
- Direct navigation, refresh, malformed IDs, closed sessions, and inaccessible sessions now show deliberate recovery states.
- Session-scoped OCR/audio UI state is cleared when the route session changes.
- Missing-profile auth could redirect-loop at `/auth/login`; middleware now allows the login page to render the provisioning recovery message.
- `/settings` was not protected by middleware; it is now parent-protected.

## Remaining Risks

- E2E fixture mode does not exercise live Supabase Auth cookies, JWT refresh, or RLS. Local Supabase pgTAP remains the database/RLS verification layer.
- Parent dashboard secondary report/recommendation queries are not fully fixture-backed in this branch.
- Ownership revocation after a session is open is documented but not simulated because the production app has no revocation mutation.
- OCR derived text remains memory-only by product/privacy choice; this branch implements explicit refresh recovery rather than persistence.
- Dev-server E2E is deterministic but slower on first route compilation than a production-start E2E path.

## Recommended Next PR

`test/week4-local-supabase-auth-e2e`

Add an optional local-Supabase E2E path that seeds real Auth users and verifies the same browser scenarios against local JWT/RLS behavior, while keeping the current fast fixture mode as the default CI smoke foundation.
