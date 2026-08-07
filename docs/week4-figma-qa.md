# Week 4 Figma QA

Figma file key: `Xr07Z3CID5wCX2e8WqMJXw`

Initial node: `0:1`

Inspection date: 2026-08-06

Method: read-only Figma metadata inspection. No UI changes were made in this branch. Direct node screenshots are still required for pixel-level comparison because metadata only exposes structure, names, positions, and sizes.

## Major Frame Inventory

| Figma frame/component | Nearest route or code | Classification | Notes |
| --- | --- | --- | --- |
| `Child Home 1` (`14:779`) | `apps/web/app/child/page.tsx`, `components/worksheet/WorksheetCapture.tsx`, session hooks | Partial | Existing child home supports worksheet capture/session creation, but Figma includes richer welcome, streak, story library grid, plan, today, and challenge modules. |
| `Section - Golden Energy Welcome Banner` | `apps/web/app/child/page.tsx` | Partial | The app has child-home structure, but this exact banner needs a node screenshot for parity. |
| `Section - Story Library Grid` | `apps/web/app/child/page.tsx`, story generation APIs | Mock | Figma shows static story cards; app has story generation/storage plumbing, but no verified dynamic story-library implementation matched to this frame. |
| `Pick Up Where You Left Off` | session list hooks and child home | Partial | Session list APIs/hooks exist; visual/component parity not verified. |
| `Word Work 1` | `apps/web/app/child/[sessionId]/read/page.tsx`, child reading components | Partial | Existing read flow handles OCR text, recording, narration/karaoke, and miscues. Route/session recovery differs from the frame and needs E2E coverage. |
| `Word Beats 1` (`671:2083`) | No matching production route; nearest experimental reading/phonics pages | Missing | Figma shows a word-to-music activity board with goal/recent beats. No equivalent route/component was found. |
| `Word Vision 1` (`580:2236`) | `apps/web/app/explorer/page.tsx`, `app/api/illustrations/route.ts`, illustration clients | Mock | App has word/image generation plumbing and an explorer page, but no confirmed child-facing Word Vision activity route. |
| `Word Vision 2` (`671:2263`) | `apps/web/app/explorer/page.tsx`, illustration clients | Mock | Figma shows generated visual result, mascot widget, and quick actions. Backend/client pieces exist, but route-level parity is not implemented. |
| `Header - Top Navigation Bar` / `Top Navigation Bar` | `components/shared/BrandHeader.tsx`, child shell header, landing header | Partial | Multiple headers exist; Figma component variants need direct node comparison before consolidation. |
| `Footer` | landing/footer and route-level footers | Partial | Figma has child/parent footer variants; current implementation is spread across shells/pages. |
| `Success Toast` / `pop up` | No matching reusable toast component found | Missing | Needs a small interaction/component PR if required by product. |
| Mascot/image asset frames | static assets and inline Figma vectors | Partial | App has logo/static imagery, but Figma mascot assets are not mapped to committed app assets. |

## Design-To-Code Plan

1. Request direct node links for each screen intended for parity, starting with `Child Home 1`, `Word Work 1`, `Word Beats 1`, `Word Vision 1`, and `Word Vision 2`.
2. Capture screenshots for each node and matching app route at desktop and mobile widths.
3. Split implementation by product surface: child home, reading/session flow, activity games, illustration/Word Vision, shared nav/footer.
4. Keep session-state changes separate from visual parity because route recovery affects correctness and privacy.
5. Use deterministic visual QA and existing test scripts before any UI parity PR merges.

## Pixel-Level Comparison Needs

- Direct node links for `Word Work 1` and `Child Home 1` are required before making layout claims beyond "partial".
- Direct node links for Word Beats/Word Vision are required to decide whether they are future activities or redesign targets for existing pages.
- Metadata did not provide visual styles, assets, or responsive behavior; screenshots are required before implementation.
