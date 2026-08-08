/**
 * PHONICS GROUNDING INTEGRATION TESTS (MOCKED)
 * Tests that /phonics-lookup results correctly flow into Claude story generation.
 * No real API calls — Claude, Supabase, and phonics lookup are all mocked.
 * Usage: 'npx vitest run phonics-grounding'
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/stories/generate/route";
import { generateStoryWithClaude } from "@/lib/stories/client";
import { lookupPhonicsRule } from "@/lib/phonics/client";

const VALID_CHILD_ID = "98728fe1-c37b-40a4-8547-93f76889299b";

vi.mock("@/lib/supabase/env", () => ({
  hasSupabaseEnv: () => true
}));

const mockSingle = vi.fn();
const mockInsert = vi.fn().mockImplementation(() => ({
  select: () => ({
    single: mockSingle
  })
}));

const mockMaybeSingleKnownWords = vi.fn().mockResolvedValue({
  data: { words: ["the", "swims"] },
  error: null
});

const mockMaybeSingleUser = vi.fn().mockResolvedValue({
  data: { id: VALID_CHILD_ID, auth_id: "auth-user-123", role: "CHILD" },
  error: null
});

const mockSupabase = {
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: "auth-user-123" } },
      error: null
    })
  },
  from: vi.fn((table) => {
    if (table === "users") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: mockMaybeSingleUser
          })
        })
      };
    }
    if (table === "child_known_words") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: mockMaybeSingleKnownWords
          })
        })
      };
    }
    if (table === "generated_stories") {
      return {
        insert: mockInsert
      };
    }
    return {};
  })
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => mockSupabase
}));

vi.mock("@/lib/stories/client", () => ({
  generateStoryWithClaude: vi.fn().mockResolvedValue({
    story_text: "The little ship sailed on the shimmering sea, its sails going shhh in the wind.",
    validation_score: 95
  }),
  mapStoryUpstreamError: vi.fn((err) => ({
    code: "internal_error",
    message: "Error",
    status: 500
  }))
}));

vi.mock("@/lib/stories/validate-client", () => ({
  StoryValidationUpstreamError: class StoryValidationUpstreamError extends Error {
    code = "internal_error";
    status = 500;
  },
  validateStoryWithGuardrails: vi.fn().mockResolvedValue({
    is_valid: true,
    validation_score: 95,
    errors: [],
    guardrails: {
      vocabulary: "passed",
      complexity: "passed",
      content_safety: "passed",
      structure: "passed"
    }
  })
}));

// KEY DIFFERENCE: phonics lookup returns REAL-SHAPED data instead of empty matches
vi.mock("@/lib/phonics/client", () => ({
  PhonicsUpstreamError: class PhonicsUpstreamError extends Error {
    constructor(
      public code: string,
      message: string,
      public status: number
    ) {
      super(message);
    }
  },
  lookupPhonicsRule: vi.fn().mockResolvedValue({
    matches: [
      {
        id: "297a4aa6-474a-4ac8-8d97-ea2f37a0e926",
        category: "sh-digraph",
        text: "sh-digraph: SH sound in ship, fish, brush, shell, wish",
        phonics_rule: "SH is a consonant digraph — two letters S and H that together make one sound /sh/. The individual S and H sounds disappear completely.",
        example_words: ["ship", "fish", "brush", "shell", "wish"],
        similarity: 0.713
      }
    ]
  })
}));

vi.mock("@/lib/illustrations/unsplash/client", () => ({
  searchUnsplash: vi.fn().mockResolvedValue("https://images.unsplash.com/mock-ship.jpg")
}));

vi.mock("@/lib/illustrations/dalle/client", () => ({
  generateDalleImage: vi.fn().mockResolvedValue(null)
}));

describe("Phonics Grounding Integration (/api/stories/generate)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "test_anthropic_key";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should call /phonics-lookup with the stuck word", async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: "story-201",
        child_id: VALID_CHILD_ID,
        word: "ship",
        story_text: "The little ship sailed on the shimmering sea.",
        image_url: "https://images.unsplash.com/mock-ship.jpg",
        validation_score: 95,
        phonics_category: "sh-digraph"
      },
      error: null
    });

    const body = { childId: VALID_CHILD_ID, word: "ship", theme: "ocean" };
    const req = new NextRequest("http://localhost/api/stories/generate", {
      method: "POST",
      body: JSON.stringify(body)
    });

    await POST(req);

    expect(lookupPhonicsRule).toHaveBeenCalledWith(
      expect.objectContaining({ stuckWord: "ship" })
    );
  });

  it("should pass the top phonics match as grounding context to Claude", async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: "story-202",
        child_id: VALID_CHILD_ID,
        word: "ship",
        story_text: "The little ship sailed on the shimmering sea.",
        image_url: "https://images.unsplash.com/mock-ship.jpg",
        validation_score: 95,
        phonics_category: "sh-digraph"
      },
      error: null
    });

    const body = { childId: VALID_CHILD_ID, word: "ship", theme: "ocean" };
    const req = new NextRequest("http://localhost/api/stories/generate", {
      method: "POST",
      body: JSON.stringify(body)
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(generateStoryWithClaude).toHaveBeenCalledWith(
      expect.objectContaining({
        word: "ship",
        phonicsGrounding: {
          ruleExplanation: expect.stringContaining("consonant digraph"),
          examples: expect.arrayContaining(["ship", "fish", "brush"])
        }
      })
    );
  });

  it("should resolve phonicsCategory from the top match when not provided in the request", async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: "story-203",
        child_id: VALID_CHILD_ID,
        word: "ship",
        story_text: "The little ship sailed on the shimmering sea.",
        image_url: "https://images.unsplash.com/mock-ship.jpg",
        validation_score: 95,
        phonics_category: "sh-digraph"
      },
      error: null
    });

    // Note: no phonicsCategory passed in the request body
    const body = { childId: VALID_CHILD_ID, word: "ship" };
    const req = new NextRequest("http://localhost/api/stories/generate", {
      method: "POST",
      body: JSON.stringify(body)
    });

    await POST(req);

    // Should have resolved "sh-digraph" from the phonics lookup match, not left as "unknown"
    expect(generateStoryWithClaude).toHaveBeenCalledWith(
      expect.objectContaining({ phonicsCategory: "sh-digraph" })
    );

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ phonics_category: "sh-digraph" })
    );
  });

  it("should still generate a story if phonics lookup fails (best-effort, non-blocking)", async () => {
    (lookupPhonicsRule as any).mockRejectedValueOnce(new Error("Phonics service unavailable"));

    mockSingle.mockResolvedValue({
      data: {
        id: "story-204",
        child_id: VALID_CHILD_ID,
        word: "ship",
        story_text: "The little ship sailed on the shimmering sea.",
        image_url: "https://images.unsplash.com/mock-ship.jpg",
        validation_score: 95,
        phonics_category: "unknown"
      },
      error: null
    });

    const body = { childId: VALID_CHILD_ID, word: "ship" };
    const req = new NextRequest("http://localhost/api/stories/generate", {
      method: "POST",
      body: JSON.stringify(body)
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    // Story still generated without grounding
    expect(generateStoryWithClaude).toHaveBeenCalledWith(
      expect.objectContaining({ phonicsGrounding: null })
    );
  });
});