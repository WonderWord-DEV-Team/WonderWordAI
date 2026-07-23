import { apiFetchJson } from "@/lib/api/client";
import { sessionAudioResponseSchema, type SessionAudioData } from "@/lib/audio/schema";

export async function uploadSessionAudio({
  sessionId,
  audio
}: {
  sessionId: string;
  audio: Blob | File;
}): Promise<SessionAudioData> {
  const formData = new FormData();
  formData.append("audio", audio, audio instanceof File ? audio.name : "reading-audio");

  const payload = await apiFetchJson<unknown>(
    `/api/sessions/${encodeURIComponent(sessionId)}/audio`,
    {
      method: "POST",
      body: formData
    }
  );

  return sessionAudioResponseSchema.parse(payload).data;
}
