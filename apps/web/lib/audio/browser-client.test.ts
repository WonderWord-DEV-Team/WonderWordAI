import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadSessionAudio } from "./browser-client";

describe("uploadSessionAudio", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the recorded blob to the web session route without exposing the ML key", async () => {
    const sessionId = "40000000-0000-4000-8000-000000000001";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            sessionId,
            transcript: "The cat sat.",
            words: [{ word: "The", start: 0, end: 0.2 }],
            miscues: []
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);
    const audio = new Blob(["recorded-audio"], { type: "audio/webm" });

    const result = await uploadSessionAudio({
      sessionId,
      audio,
      referenceText: "The cat sat."
    });

    expect(result.transcript).toBe("The cat sat.");
    expect(fetchMock).toHaveBeenCalledOnce();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/sessions/${sessionId}/audio`);
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);

    const body = init.body as FormData;
    expect(body.get("audio")).toBeInstanceOf(Blob);
    expect(body.get("reference_text")).toBe("The cat sat.");

    const headers = new Headers(init.headers);
    expect(headers.has("X-Internal-Key")).toBe(false);
  });
});
