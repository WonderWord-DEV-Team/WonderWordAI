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

Common errors:

```json
{ "error": "unauthorized", "message": "Authentication is required." }
{ "error": "forbidden", "message": "Only child accounts can create reading sessions." }
{ "error": "not_found", "message": "Reading session not found." }
{ "error": "invalid_request", "message": "The request payload is invalid." }
```

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
