import { z } from "zod";
import { apiFetchJson } from "@/lib/api/client";
import { normalizeSessionFilters, type SessionFilters } from "@/lib/sessions/keys";

const readingSessionSchema = z.object({
  id: z.string().uuid(),
  childId: z.string().uuid(),
  startTime: z.string(),
  endTime: z.string().nullable(),
  status: z.enum(["open", "closed"]),
  totalWords: z.number().int().nonnegative(),
  correctWords: z.number().int().nonnegative(),
  createdAt: z.string()
});

const sessionsResponseSchema = z.object({
  sessions: z.array(readingSessionSchema)
});

const sessionResponseSchema = z.object({
  session: readingSessionSchema
});

export type ReadingSession = z.infer<typeof readingSessionSchema>;

export async function listSessions(filters?: SessionFilters) {
  const normalizedFilters = normalizeSessionFilters(filters);
  const params = new URLSearchParams();

  if (normalizedFilters.status) {
    params.set("status", normalizedFilters.status);
  }

  params.set("limit", String(normalizedFilters.limit));

  const payload = await apiFetchJson<unknown>(`/api/sessions?${params.toString()}`);

  return sessionsResponseSchema.parse(payload).sessions;
}

export async function createReadingSession() {
  const payload = await apiFetchJson<unknown>("/api/sessions", {
    method: "POST",
    body: JSON.stringify({})
  });

  return sessionResponseSchema.parse(payload).session;
}

export async function closeReadingSession(sessionId: string) {
  const payload = await apiFetchJson<unknown>(`/api/sessions/${encodeURIComponent(sessionId)}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "close" })
  });

  return sessionResponseSchema.parse(payload).session;
}
