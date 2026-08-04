import { apiFetchJson } from "@/lib/api/client";
import { sessionAudioResponseSchema, type SessionAudioData } from "@/lib/audio/schema";

export async function uploadSessionAudio({
  sessionId,
  audio,
  referenceText
}: {
  sessionId: string;
  audio: Blob | File;
  referenceText?: string | null;
}): Promise<SessionAudioData> {
  const formData = new FormData();
  formData.append("audio", audio, audio instanceof File ? audio.name : "reading-audio");
  if (referenceText?.trim()) {
    formData.append("reference_text", referenceText.trim());
  }

  const payload = await apiFetchJson<unknown>(
    `/api/sessions/${encodeURIComponent(sessionId)}/audio`,
    {
      method: "POST",
      body: formData
    }
  );

  return sessionAudioResponseSchema.parse(payload).data;
}
