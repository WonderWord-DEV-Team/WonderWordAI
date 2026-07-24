This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Reading Session API

The web app exposes authenticated reading-session routes backed by `public.reading_sessions`.
Authorization is enforced through Supabase Auth, `public.users.role`, and active RLS policies.

Required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `ANTHROPIC_API_KEY`

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is still accepted by the local helper for older environments, but new setup should use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## TanStack Query Data Layer

The App Router root layout stays a Server Component. `components/providers/QueryProvider.tsx`
is the small client boundary that mounts `QueryClientProvider` around the shared app shell in
`app/layout.tsx`.

TanStack Query owns server state:

- reading-session lists;
- reading-session create and close mutations;
- parent dashboard data.

`ChildSessionContext` continues to own active reading-session UI state:

- current active session ID;
- OCR text and image keywords;
- worksheet upload/readiness status;
- active word position, latest structured transcription result, and local correction UI state.

Do not move request-scoped OCR text, recording state, karaoke position, or other transient reading
state into TanStack Query.

## Child Karaoke Reading Flow

The child reading screen uses the existing session audio API for the MVP read-aloud loop:

1. OCR text is loaded into `ChildSessionContext` after worksheet scan.
2. The child presses **Start Reading**. The browser requests microphone permission and creates a
   `MediaRecorder` only after that user action.
3. The child reads one sentence or short passage, then presses **Stop**. Recording also stops at the
   current 30 second safety limit.
4. The browser sends one complete temporary `Blob` to `POST /api/sessions/[sessionId]/audio` through
   `lib/audio/browser-client.ts`.
5. The response is validated with `sessionAudioResponseSchema`, converted into a karaoke timeline,
   and replayed locally from an `HTMLAudioElement`.
6. `requestAnimationFrame` reads `audio.currentTime` while playback runs and highlights the matching
   OCR word from the WhisperX timestamps. Pause, resume, restart, and seek events recompute the
   active word from the audio element.

Supported recording formats are selected at runtime with `MediaRecorder.isTypeSupported()`. The
preference order is WebM/Opus, WebM, MP4/AAC, MP4, Ogg/Opus, Ogg, then WAV. The server route accepts
the normalized base types listed in `lib/audio/schema.ts`; Safari commonly chooses MP4 while Chrome
usually chooses WebM.

Karaoke alignment lives in `lib/karaoke/timeline.ts`. It tokenizes OCR text while preserving
punctuation and line breaks, normalizes capitalization/punctuation/apostrophes, and uses ordered
sequence alignment instead of `indexOf` so repeated words stay in the correct order after skipped or
extra spoken words. Unmatched transcript words are kept out of the worksheet highlight path, and
skipped worksheet words can be marked after playback without shifting later matches.

Privacy: raw child audio is not stored in Supabase, context, localStorage, or TanStack Query. The
recording `Blob`, object URL, `MediaStream`, `MediaRecorder`, and `HTMLAudioElement` are
component-local only. Stream tracks stop after recording ends or fails, object URLs are revoked when
replaced or unmounted, and only derived structured transcription/miscue data may remain in context.

Known limitations:

- This is not live speech streaming; there are no WebSockets, SSE, or continuous uploads.
- Word end times may be inferred from the next word start or a short bounded fallback when the server
  only returns start timestamps.
- Miscues are retained for the next correction step, but the MVP shows a single post-playback entry
  point instead of interrupting playback.

### Browser API client

Browser-side query functions use `lib/api/client.ts`. It calls authenticated Next.js API routes with
the existing Supabase cookie session, preserves HTTP status and stable error codes in `ApiError`, and
does not manually attach tokens.

### Session hooks

Session query keys live in `lib/sessions/keys.ts`, client functions in `lib/sessions/client.ts`, and
React hooks in `hooks/useSessions.ts`.

```tsx
const sessions = useSessions({ status: "open", limit: 20 });
const openSessions = useOpenSessions();
const createSession = useCreateSession();
const closeSession = useCloseSession();
```

`useCreateSession` and `useCloseSession` invalidate all session list queries after successful
mutations. The worksheet capture flow still guards session creation with a single in-flight promise so
double clicks do not create duplicate open sessions.

## Parent Dashboard API

`GET /api/parent/dashboard?period=7d|14d|30d|all` returns dashboard data for linked children visible
to the authenticated parent.

Authorization:

- `401`: no authenticated Supabase session.
- `403`: authenticated user is not a parent application user.
- `200`: parent has no linked children, with an empty `children` array.

The endpoint resolves the application user through `public.users.auth_id`, uses the ordinary
RLS-enabled Supabase server client, and does not use the service-role key.

Response:

```json
{
  "data": {
    "period": "30d",
    "children": [
      {
        "id": "10000000-0000-0000-0000-000000000001",
        "name": "Child One",
        "recentSessions": [
          {
            "id": "40000000-0000-0000-0000-000000000001",
            "startTime": "2026-07-12T19:00:00.000Z",
            "endTime": null,
            "status": "open",
            "totalWords": 20,
            "correctWords": 18
          }
        ],
        "metrics": {
          "sessionCount": 1,
          "totalWords": 20,
          "correctWords": 18,
          "accuracyPct": 90,
          "latestSessionAt": "2026-07-12T19:00:00.000Z"
        }
      }
    ]
  }
}
```

Metrics are computed only from `public.reading_sessions` rows visible under RLS:

- `sessionCount`: visible sessions in the selected period.
- `totalWords`: sum of `reading_sessions.total_words`.
- `correctWords`: sum of `reading_sessions.correct_words`.
- `accuracyPct`: `null` when `totalWords` is `0`, otherwise `correctWords / totalWords * 100`.
- `latestSessionAt`: latest visible `start_time`.
- `recentSessions`: newest visible sessions first, bounded for dashboard display.

Parent dashboard query keys live in `lib/parent/keys.ts`, the client function is
`lib/parent/client.ts`, and the hook is `hooks/useParentDashboard.ts`:

```tsx
const dashboard = useParentDashboard("30d");
```

### `POST /api/sessions`

Creates a new open reading session for the authenticated child. The request body must be an empty JSON object or omitted.

```json
{}
```

Response `201 Created`:

```json
{
  "session": {
    "id": "40000000-0000-0000-0000-000000000001",
    "childId": "10000000-0000-0000-0000-000000000001",
    "startTime": "2026-07-12T19:00:00.000Z",
    "endTime": null,
    "status": "open",
    "totalWords": 0,
    "correctWords": 0,
    "createdAt": "2026-07-12T19:00:00.000Z"
  }
}
```

### `GET /api/sessions`

Lists visible sessions newest first. Children see their own sessions. Parents see sessions for linked children as allowed by RLS.

Optional query parameters:

- `status=open|closed`
- `limit=20` by default, maximum `100`

Response `200 OK`:

```json
{
  "sessions": [
    {
      "id": "40000000-0000-0000-0000-000000000001",
      "childId": "10000000-0000-0000-0000-000000000001",
      "startTime": "2026-07-12T19:00:00.000Z",
      "endTime": null,
      "status": "open",
      "totalWords": 0,
      "correctWords": 0,
      "createdAt": "2026-07-12T19:00:00.000Z"
    }
  ]
}
```

### `PATCH /api/sessions/:id`

Closes an open session owned by the authenticated child. Closing an already closed session returns the existing closed session.

```json
{
  "action": "close"
}
```

Response `200 OK`:

```json
{
  "session": {
    "id": "40000000-0000-0000-0000-000000000001",
    "childId": "10000000-0000-0000-0000-000000000001",
    "startTime": "2026-07-12T19:00:00.000Z",
    "endTime": "2026-07-12T19:15:00.000Z",
    "status": "closed",
    "totalWords": 0,
    "correctWords": 0,
    "createdAt": "2026-07-12T19:00:00.000Z"
  }
}
```

### `POST /api/sessions/:id/audio`

Uploads one request-scoped child reading audio blob for an open reading session. The browser calls
the Next.js route only; the browser never receives `ML_SERVICE_KEY` and never calls the ML service
directly.

Required environment variables:

- `ML_SERVICE_URL`
- `ML_SERVICE_KEY`

Request:

- Content-Type: `multipart/form-data`
- Required field: `audio`
- Maximum audio size: `15 MB`
- Supported audio MIME types: `audio/webm`, `audio/ogg`, `audio/mp4`, `audio/mpeg`, `audio/wav`

Response `200 OK`:

```json
{
  "data": {
    "sessionId": "40000000-0000-0000-0000-000000000001",
    "transcript": "The shark swims",
    "words": [
      {
        "word": "The",
        "start": 0,
        "end": null
      }
    ],
    "miscues": [
      {
        "word": "shark",
        "expectedPhonemes": "SH AH R K",
        "actualPhonemes": "S AH R K"
      }
    ]
  }
}
```

Current ML service contract:

- Endpoint: `POST ${ML_SERVICE_URL}/transcribe`
- Header: `X-Internal-Key: ${ML_SERVICE_KEY}`
- Multipart field: `audio`
- Response fields: `words`, `timestamps`, `transcript`, `segments`, `miscues`

Authorization and error statuses:

- `401 unauthorized`: no authenticated Supabase session.
- `403 forbidden`: authenticated application user is not a child.
- `404 session_not_found`: session does not exist, is not visible through RLS, or does not belong
  to the authenticated child.
- `409 session_closed`: session exists for the child but has already been closed.
- `400 audio_missing`, `audio_empty`, `invalid_audio_type`: invalid multipart input.
- `413 audio_too_large`: audio exceeds the configured limit.
- `500 ml_configuration_error`: ML service key is missing.
- `504 transcription_timeout`: ML service did not respond before the bounded timeout.
- `502 transcription_unavailable`: ML service connection failure or upstream server error.
- `502 malformed_transcription_response`: ML service response failed validation.
- `500 persistence_failed`: structured derived reading data could not be inserted under RLS.

Raw child audio has zero retention in the web app. The route does not upload audio to Supabase
Storage, does not write audio to the repository or permanent disk, does not log request bodies or
audio bytes, and does not include audio data in responses or telemetry. Only structured derived
reading results may be stored in `public.reading_events`. With the current ML `/transcribe`
implementation, miscues do not include the non-empty phoneme and phonics-category fields required by
`reading_events`, so the route returns transcription results first and leaves session totals
unchanged. Add an idempotency key or attempt identifier before aggregating totals from retried
uploads.

Local verification:

```sh
cd apps/web
npm install
npm run test:karaoke
npm run typecheck
npm run lint
npm run build

cd ../..
pytest apps/ml-service/tests/test_transcribe.py
npx supabase db reset
npx supabase db lint
npx supabase test db
```

Common errors:

```json
{ "error": "unauthorized", "message": "Authentication is required." }
{ "error": "forbidden", "message": "Only child accounts can create reading sessions." }
{ "error": "not_found", "message": "Reading session not found." }
{ "error": "invalid_request", "message": "The request payload is invalid." }
```

## Worksheet Upload API

`POST /api/upload` accepts a multipart form request for an authenticated child user. It reuses the existing OCR endpoint and does not persist raw worksheet images.

Form fields:

- `sessionId`: UUID for an open reading session owned by the authenticated child.
- `file`: JPEG, PNG, or WebP image, larger than 0 bytes and no more than 10 MB.

Success `200 OK`:

```json
{
  "data": {
    "sessionId": "40000000-0000-0000-0000-000000000001",
    "text": "Extracted worksheet text",
    "imageKeywords": ["bird", "tree"]
  }
}
```

Failure responses use a stable shape:

```json
{
  "error": {
    "code": "invalid_file_type",
    "message": "Please upload a JPEG, PNG, or WebP image."
  }
}
```

Common status codes:

- `400`: missing session ID, invalid session ID, missing file, empty file, or unsupported file type.
- `401`: missing or invalid Supabase auth session.
- `403`: authenticated account is not a child account.
- `404`: reading session does not exist or is not visible to the authenticated child.
- `409`: reading session is already closed.
- `413`: image is larger than 10 MB.
- `502`, `503`, `504`: Claude OCR returned malformed output, is unavailable, is rate-limited, or timed out.

Privacy and retention:

- Raw worksheet images are not written to Supabase Storage, disk, logs, or the database.
- The server holds image bytes only in memory for the request-scoped Anthropic OCR call.
- The API never returns base64 image data to the browser.
- Server logs include operational OCR error metadata only, not image contents or model raw output.

Manual worksheet upload verification:

- Desktop Chrome file upload with a JPEG, PNG, and WebP image.
- Mobile-sized Chrome responsive mode using the file input with camera capture available.
- Camera permission denied while file-input fallback remains available.
- Replace or retake the selected image.
- Unsupported file type rejection.
- File larger than 10 MB rejection.
- Successful OCR transitions to the reading text view.
- OCR upstream failure returns a stable error message and keeps the session open for retry.
- Duplicate clicks are disabled while upload/OCR is running.
- Refresh after OCR does not restore worksheet text because raw images and OCR text are not persisted.

Manual verification examples:

```bash
curl -i http://localhost:3000/api/sessions
curl -i -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -H "Cookie: <authenticated-child-session-cookie>" \
  -d '{}'
curl -i "http://localhost:3000/api/sessions?status=open&limit=10" \
  -H "Cookie: <authenticated-child-or-parent-session-cookie>"
curl -i -X PATCH http://localhost:3000/api/sessions/<session-id> \
  -H "Content-Type: application/json" \
  -H "Cookie: <authenticated-child-session-cookie>" \
  -d '{"action":"close"}'
```

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
