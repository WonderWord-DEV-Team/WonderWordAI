import { describe, expect, it } from "vitest";
import { getPersistableReadingEvents, mlTranscribeResultSchema } from "./schema";

describe("session audio reading-event contract", () => {
  it("defaults scored reading events to an empty array for legacy transcription payloads", () => {
    const parsed = mlTranscribeResultSchema.parse({
      words: ["cat"],
      timestamps: [0],
      miscues: [],
      transcript: "cat"
    });

    expect(parsed.reading_events).toEqual([]);
  });

  it("persists only explicit scored reading events, including correct attempts", () => {
    const events = getPersistableReadingEvents({
      sessionId: "40000000-0000-0000-0000-000000000001",
      childId: "10000000-0000-0000-0000-000000000001",
      readingEvents: [
        {
          word: " Cat ",
          expected_phonemes: "K AE T",
          actual_phonemes: "K AE T",
          phonics_category: "short-a",
          similarity_score: 0.98,
          is_correct: true
        },
        {
          word: "shark",
          expected_phonemes: "SH AH R K",
          actual_phonemes: "S AH R K",
          phonics_category: "sh-digraph",
          confidence: 0.62,
          is_correct: false
        }
      ]
    });

    expect(events).toEqual([
      {
        session_id: "40000000-0000-0000-0000-000000000001",
        child_id: "10000000-0000-0000-0000-000000000001",
        word: "Cat",
        expected_phonemes: "K AE T",
        actual_phonemes: "K AE T",
        phonics_category: "short-a",
        similarity_score: 0.98,
        is_correct: true
      },
      {
        session_id: "40000000-0000-0000-0000-000000000001",
        child_id: "10000000-0000-0000-0000-000000000001",
        word: "shark",
        expected_phonemes: "SH AH R K",
        actual_phonemes: "S AH R K",
        phonics_category: "sh-digraph",
        similarity_score: 0.62,
        is_correct: false
      }
    ]);
  });

  it("does not convert miscues into persisted reading events", () => {
    const parsed = mlTranscribeResultSchema.parse({
      words: ["shark"],
      timestamps: [0],
      transcript: "shark",
      miscues: [
        {
          word: "shark",
          expected_phonemes: "SH AH R K",
          actual_phonemes: "S AH R K",
          phonics_category: "sh-digraph",
          is_correct: false
        }
      ]
    });

    expect(
      getPersistableReadingEvents({
        sessionId: "40000000-0000-0000-0000-000000000001",
        childId: "10000000-0000-0000-0000-000000000001",
        readingEvents: parsed.reading_events
      })
    ).toEqual([]);
  });
});
