# Week 4 Cross-Browser Integration QA

Date: 2026-08-09

Branch: `test/week4-cross-browser-ui-qa`

Starting branch/commit: `main` at `38444afc5e32015a06ceb227f5b6a01331d7c48d`

Selected base: `origin/main` at `38444afc5e32015a06ceb227f5b6a01331d7c48d`

Base decision: `origin/chore/week4-qa-baseline` and `origin/test/week4-e2e-auth-session` are both ancestors of `origin/main`, so this branch was created from latest `origin/main` without duplicating previous commits.

Tested implementation commit: `6256a7b23cc88f56e08205108666a297e934467a`

## Previous Unresolved Issues Reviewed

- Direct navigation, refresh, malformed session IDs, closed sessions, duplicate creation, and cross-child session access were already covered by `docs/week4-e2e-auth-session.md`.
- Remaining privacy/product decision from the prior branch still applies: OCR text is memory-only, so refresh intentionally shows recovery instead of persisted worksheet text.
- No unresolved P0/P1 authorization blocker was found in the previous docs.
- A new P1 was found in this pass: fixture-mode logout did not clear the E2E auth cookie. Status: fixed.
- A new P1 was found in this pass: parent dashboard tablet navigation could intercept the `Switch to Child` action. Status: fixed.
- A recorder/transcription fixture limitation remains: Chromium smoke verifies stop safety and session exit, but does not yet prove deterministic transcription playback/correction success from the browser MediaRecorder path.

## Browser And Viewport Matrix

| Browser/project | Viewport | Status |
| --- | --- | --- |
| Chromium desktop | 1440x900 | Passed in final Chromium viewport sweep. |
| Chromium laptop | 1280x720 | Passed in final Chromium viewport sweep. |
| Chromium Android-like | 390x844 | Passed in final Chromium viewport sweep. |
| Chromium small iPhone-class | 375x667 | Passed in final Chromium viewport sweep. |
| Chromium tablet | 768x1024 | Passed after fixing parent header click interception. |
| WebKit desktop approximation | 1440x900 | Configured; local execution blocked because Playwright WebKit executable is missing. |
| WebKit iPhone 13-class | 390x844 | Configured; local execution blocked because Playwright WebKit executable is missing. |

Playwright WebKit is not proof of real Mobile Safari. See `docs/week4-manual-safari-checklist.md`.

## Main User Flow

Parent smoke:
1. Open `/auth/login`.
2. Authenticate as synthetic parent using fixture auth cookie.
3. Reach `/parent/dashboard`.
4. Confirm linked children, including a long child name, render.
5. Confirm report/dashboard information and recommendation section render.
6. Switch child selection.
7. Navigate to `/profiles`, browser back to dashboard, and logout.

Child smoke:
1. Open `/auth/login`.
2. Authenticate as synthetic child using fixture auth cookie.
3. Reach `/child`.
4. Upload deterministic synthetic worksheet.
5. Receive mocked OCR text.
6. Reach `/child/[sessionId]/read`.
7. Verify OCR text renders and rescan modal opens/closes.
8. Start/stop mocked recording and verify the UI remains operable.
9. End session and return to child home.
10. Confirm the closed session route shows a closed-session recovery state.

## Route And User-Flow Matrix

| Route/flow | Classification | Notes |
| --- | --- | --- |
| `/` landing | Implemented and functional | Public marketing/landing route. |
| `/auth/login` | Implemented and functional | Password/OAuth UI; fixture auth uses cookies, not the form. |
| `/onboarding/step-1` to `/onboarding/step-4` | Implemented but partial | Parent signup/onboarding exists; not fully covered in this pass. |
| `/auth/forgot-password` | Implemented and functional | Supabase env required for live reset email. |
| `/auth/reset-password` | Implemented and functional | Supabase session required for live update. |
| `/privacy` | Implemented and functional | Public static page. |
| `/terms` | Implemented and functional | Public static page. |
| `/profiles` | Implemented and functional | Parent-protected profile selection. |
| `/parent/dashboard` | Implemented and functional | Parent dashboard, reports, charts, recommendations. |
| `/settings` | Implemented but partial | Parent-protected settings surface. |
| `/billing` | Implemented but partial | Stripe env required for live billing. |
| `/billing/subscribe` | Implemented but partial | Stripe env required. |
| `/child` | Implemented and functional | Child home and worksheet capture. Several story/activity modules are marked coming soon. |
| `/child/[sessionId]/read` | Implemented but partial | OCR/reading UI works; deterministic transcription success remains unproven in browser smoke. |
| `/child/[sessionId]/story` | Implemented but partial | Story generation route exists; not covered in this pass. |
| `/explorer` | Implemented but partial | Word Explorer exposed from child home. |
| `/vision` | Implemented but partial | Word Vision route exists but does not fully match Figma Word Vision frames. |
| `/reading-mode` | Unused/dead or legacy | Separate from current `/child/[sessionId]/read` flow. |
| `/help` | Implemented and functional | Public/support route. |
| `/dev-*` routes | Mock/dev only | Useful for component checks, not MVP navigation. |
| Invalid route | Implemented and functional | App has `not-found.tsx`. |

## Figma Route/Frame Map

Figma file key: `Xr07Z3CID5wCX2e8WqMJXw`

| Figma frame/node | App route/component | Status |
| --- | --- | --- |
| `Child Home 1` (`14:779`) | `/child`, `ChildHomeClient`, `WorksheetCapture` | Partial match. |
| `Section - Golden Energy Welcome Banner` (`67:233`) | `/child` streak banner | Partial match. |
| `Section - Story Library Grid` (`67:273`) | `/child` story/activity areas | Mock/coming soon mismatch. |
| `Pick Up Where You Left Off` (`67:246`) | session hooks and child home | Partial; current visual is not full Figma parity. |
| `Header - Top Navigation Bar` (`139:157`, component `139:156`) | child/parent headers | Partial; fixed mobile wrapping, but nav parity not complete. |
| `Footer` (`139:194`, variants under `717:2928`) | page footers | Partial. |
| `Word Beats 1` (`671:2083`) | no production route | Coming soon/out of current MVP. |
| `Word Vision 1` (`580:2236`) | `/vision`, `/explorer` nearest | Partial/mock. |
| `Word Vision 2` (`671:2263`) | `/vision`, `/explorer` nearest | Partial/mock. |
| `Success Toast` (`580:2237`) and `pop up` (`580:2238`) | no reusable toast found | Missing/deferred. |
| `Word Work 1` | `/child/[sessionId]/read` | Prior metadata identified the frame, but connector output was truncated before a direct node ID could be confirmed in this pass. |

## Findings

| ID | Screen | Browser | Viewport | Severity | Reproduction | Expected | Actual | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CB-P1-001 | Auth/logout | Chromium | 1280x720 | P1 | Sign in with E2E parent, click logout. | Auth cookie clears and login renders. | Fixture cookie remained authenticated. | Fixed in `d16a97b`. |
| CB-P1-002 | Child/parent headers | Chromium | 390x844 | P1 | Load child home or parent dashboard with long labels. | Header wraps with no horizontal overflow. | Header clusters could overflow narrow screens. | Fixed in `d16a97b`. |
| CB-P1-003 | Reading session finish | Chromium | 390x844 | P1 | Complete/leave a reading session. | Session can be closed and child returns home. | End Session was a link and did not close the session. | Fixed in `d16a97b`. |
| CB-P1-004 | Reading recorder | Chromium | 1280x720 | P1 | Start mocked recording, click Stop while audio upload does not complete. | Async operation terminates in success or explicit retry/error. | A mocked stop path could leave processing unclear. | Mitigated in `6256a7b` with a processing timeout and safe session close; deterministic success coverage remains limited. |
| CB-P1-005 | Parent dashboard nav | Chromium | 768x1024 | P1 | Open parent dashboard on tablet, click `Switch to Child`. | The action is clickable. | Centered desktop nav intercepted pointer events. | Fixed in `6256a7b` by hiding centered nav until `lg`. |
| CB-P2-001 | Child home vs Figma | All | All | P2 | Compare `/child` with `14:779`. | Full story library/progress modules match. | Several modules are coming soon/static or visually different. | Deferred. |
| CB-P2-002 | Word Vision/Beats | All | All | P2 | Compare app routes to `580:2236`, `671:2263`, `671:2083`. | Dedicated experiences match Figma. | Word Beats absent; Word Vision partial/mock. | Deferred/out of MVP. |
| CB-P2-003 | Correction success path coverage | Chromium | All | P2 | Use browser MediaRecorder fixture to submit audio and show miscues. | Deterministic transcription response renders karaoke/correction UI. | Current smoke only proves recording stop safety and session exit; audio upload count remains zero in the browser fixture. | Deferred test-fixture gap. |
| CB-P3-001 | Runtime warnings | Chromium | All | P3 | Run Playwright dev server. | No recurring benign warnings. | Node prints `NO_COLOR`/`FORCE_COLOR`; webpack cache warns about big strings; Next Fast Refresh warning during iterative dev runs. | Documented; not app runtime failure. |

## Fixed Defects

- Cleared E2E auth cookie on logout.
- Added E2E fixtures for multiple children, reports, recommendations, and deterministic audio route shape.
- Added parent/child header wrapping and long-label truncation for narrow viewports.
- Converted reading `End Session` from a plain link to a close-session action with error feedback.
- Added correction-modal dialog semantics, Escape close, focus target, max-height, and long-word wrapping.
- Added recorder Stop resilience so a stop attempt moves out of `recording`, plus a 15s processing timeout for failed audio feedback calls.
- Fixed tablet parent-dashboard navigation click interception at 768x1024.
- Fixed Chromium small-phone/tablet Playwright project definitions so they no longer inherit WebKit-only browser descriptors.
- Added cross-browser Playwright project configuration without slowing default Chromium E2E.

## Automated Coverage

Added:

- `apps/web/e2e/smoke/product-flow.spec.ts`
- `apps/web/e2e/smoke/media-states.spec.ts`
- `apps/web/e2e/smoke/media-mocks.ts`
- `apps/web/e2e/responsive/layout.spec.ts`
- `apps/web/e2e/responsive/assertions.ts`

Reusable assertions cover:

- document-level horizontal overflow
- critical controls inside viewport
- practical touch targets
- page errors, console errors, and unexpected 500-level local API responses

Commands:

```sh
npm run test:e2e
npm run test:e2e:cross-browser
```

Default `npm run test:e2e` remains Chromium-only. `npm run test:e2e:cross-browser` enables Chromium/WebKit viewport projects for smoke/responsive tests only.

## Local Validation Results

| Command | Result |
| --- | --- |
| `git fetch --all --prune` | Passed with git metadata approval. |
| `npm ci` | Passed; dependency deprecation warnings only. |
| `npm run typecheck` | Passed. |
| `npm run test` | Passed: 4 test files, 16 tests. |
| `npm run test:auth` | Passed: 7 TAP tests. |
| `npm run test:karaoke` | Passed. |
| `npm run test:narration` | Passed. |
| `npm run lint` | Passed with existing `<img>` optimization warnings. |
| `npm run build` | Passed with the same `<img>` warnings. |
| `PORT=3127 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3127 npm run test:e2e` | Passed: 38 Chromium tests. |
| `PORT=3125 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3125 WONDERWORD_CROSS_BROWSER=1 npx playwright test e2e/smoke e2e/responsive --project=chromium-desktop-1440 --project=chromium-laptop-1280 --project=chromium-android-390 --project=chromium-small-iphone-375 --project=chromium-tablet-768` | Passed: 45 Chromium viewport tests. |
| `PORT=3126 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3126 WONDERWORD_CROSS_BROWSER=1 npx playwright test e2e/smoke e2e/responsive --project=webkit-desktop-1440 --project=webkit-iphone-390` | Blocked: 18 failures before page launch because `/Users/anderpudding/Library/Caches/ms-playwright/webkit-2336/pw_run.sh` is missing. |

## Real Safari Manual Test Still Required

Codex did not test real Mobile Safari, real mobile camera, or real mobile microphone. Complete `docs/week4-manual-safari-checklist.md` on actual hardware.

## Known Limitations

- Browser E2E fixture auth does not verify live Supabase JWT refresh or RLS; prior local pgTAP/Supabase tests remain the database layer.
- OCR text intentionally remains memory-only and is not restored after refresh.
- Deterministic transcription success and correction modal display are not proven by the browser smoke suite because the mocked recorder path does not submit audio reliably.
- WebKit execution is configured but not locally completed because the local Playwright WebKit executable is missing.
- Figma metadata for `Word Work 1` was truncated before a node ID could be confirmed.

## Safety Confirmations

- No paid OCR, AI, narration, transcription, Stripe, or Supabase provider calls were made by the E2E suite.
- No production Supabase mutations, production deployments, tags, releases, pushes, or merges were performed.
- No secrets, real child data, raw worksheet images, or raw child audio were added.
- Raw worksheet image and audio persistence were not introduced.

## Remaining Week 4 Blockers

- Replace the recorder mock or add a stable app-level fixture path so the browser suite can deterministically verify transcription success, karaoke rendering after transcription, and correction modal behavior.
- Run `npx playwright install webkit`, then run `npm run test:e2e:cross-browser`.
- Execute the real Safari checklist on actual Safari/mobile hardware.
