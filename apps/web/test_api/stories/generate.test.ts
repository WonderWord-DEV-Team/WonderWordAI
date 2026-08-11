/**
 * STORY GENERATION TESTS (MOCKED)
 * This file tests the integration flow of the /api/stories/generate endpoint without spending OpenAI/Anthropic credits.
 * Usage: Automatically run with 'npx vitest run generate'.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../../app/api/stories/generate/route";
import { generateStoryWithClaude } from "../../lib/stories/client";

// A valid UUID to satisfy Zod's childId validation schema
const VALID_CHILD_ID = "123e4567-e89b-12d3-a456-426614174000";

// Mock Supabase Server environment checks
vi.mock("@/lib/supabase/env", () => ({
  hasSupabaseEnv: () => true
}));

// Setup mocks for supabase
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

const mockStorageList = vi.fn();
const mockStorageUpload = vi.fn();
const mockStorageGetPublicUrl = vi.fn();

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
    if (table === "curriculum_words") {
      return {
        select: () => ({
          in: () => Promise.resolve({ data: [], error: null })
        })
      };
    }
    if (table === "generated_stories") {
      return {
        insert: mockInsert
      };
    }
    return {};
  }),
  storage: {
    from: () => ({
      list: mockStorageList,
      upload: mockStorageUpload,
      getPublicUrl: mockStorageGetPublicUrl
    })
  }
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => mockSupabase
}));

// Mock Anthropic client/story generation logic
vi.mock("../../lib/stories/client", () => ({
  generateStoryWithClaude: vi.fn().mockResolvedValue({
    story_text: "Once upon a time, a shark swam in the deep blue sea.",
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
  lookupPhonicsRule: vi.fn().mockResolvedValue({ matches: [] })
}));

// Mock OpenAI generation client so it doesn't make real external calls
const mockOpenaiGenerate = vi.fn().mockResolvedValue({
  data: [{ b64_json: "mocked_base64_data_dalle_image" }]
});
vi.mock("openai", () => {
  return {
    default: class {
      images = {
        generate: mockOpenaiGenerate
      }
    }
  };
});

describe("Story Image Pipeline Integration Tests (/api/stories/generate)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "test_anthropic_key";
    process.env.UNSPLASH_ACCESS_KEY = "test_unsplash_key";
    process.env.OPENAI_API_KEY = "test_openai_key";
    mockOpenaiGenerate.mockResolvedValue({
      data: [{ b64_json: "mocked_base64_data_dalle_image" }]
    });
    mockStorageList.mockResolvedValue({ data: [], error: null });
    mockStorageUpload.mockResolvedValue({ data: {}, error: null });
    mockStorageGetPublicUrl.mockImplementation((fileName: string) => ({
      data: { publicUrl: `https://supabase/illustrations/${fileName}` }
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should resolve to a DALL-E image, insert it into DB and return it", async () => {
    const mockDalleUrl = "https://supabase/illustrations/shark.png";

    mockSingle.mockResolvedValue({
      data: {
        id: "story-123",
        child_id: VALID_CHILD_ID,
        word: "shark",
        story_text: "Once upon a time, a shark swam in the deep blue sea.",
        image_url: mockDalleUrl,
        validation_score: 95,
        phonics_category: "sh"
      },
      error: null
    });

    const body = {
      childId: VALID_CHILD_ID,
      word: "shark",
      phonicsCategory: "sh",
      theme: "ocean"
    };

    const req = new NextRequest("http://localhost/api/stories/generate", {
      method: "POST",
      body: JSON.stringify(body)
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    const resJson = await res.json();

    expect(mockOpenaiGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-image-2"
      }),
      expect.any(Object)
    );
    expect(mockStorageUpload).toHaveBeenCalledWith(
      "shark.png",
      expect.any(Buffer),
      expect.any(Object)
    );

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        image_url: mockDalleUrl
      })
    );

    expect(resJson.data.image_url).toBe(mockDalleUrl);
  });

  it("should fallback to Unsplash when DALL-E returns no image", async () => {
    const mockUnsplashUrl = "https://images.unsplash.com/mock-dinosaur.jpg";
    mockOpenaiGenerate.mockResolvedValueOnce({ data: [] });

    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [{ id: "unsplash-id-124", urls: { regular: mockUnsplashUrl } }]
          })
      } as any)
    );

    mockSingle.mockResolvedValue({
      data: {
        id: "story-124",
        child_id: VALID_CHILD_ID,
        word: "dinosaur",
        story_text: "Dinosaur went roar.",
        image_url: mockUnsplashUrl,
        validation_score: 95,
        phonics_category: "d"
      },
      error: null
    });

    const body = {
      childId: VALID_CHILD_ID,
      word: "dinosaur",
      phonicsCategory: "d"
    };

    const req = new NextRequest("http://localhost/api/stories/generate", {
      method: "POST",
      body: JSON.stringify(body)
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const resJson = await res.json();

    expect(mockOpenaiGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-image-2"
      }),
      expect.any(Object)
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("unsplash.com/search/photos"),
      expect.any(Object)
    );

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        image_url: mockUnsplashUrl
      })
    );

    expect(resJson.data.image_url).toBe(mockUnsplashUrl);
  });

  it("should fallback to static placeholder when both DALL-E and Unsplash fail", async () => {
    vi.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 500
      } as any)
    );

    mockOpenaiGenerate.mockRejectedValueOnce(new Error("DALL-E generation failed"));

    mockSingle.mockResolvedValue({
      data: {
        id: "story-125",
        child_id: VALID_CHILD_ID,
        word: "unicorn",
        story_text: "A magical unicorn.",
        image_url: "/images/placeholder.png",
        validation_score: 95,
        phonics_category: "u"
      },
      error: null
    });

    const body = {
      childId: VALID_CHILD_ID,
      word: "unicorn",
      phonicsCategory: "u"
    };

    const req = new NextRequest("http://localhost/api/stories/generate", {
      method: "POST",
      body: JSON.stringify(body)
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const resJson = await res.json();

    // Verify placeholder was set
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        image_url: "/images/placeholder.png"
      })
    );

    expect(resJson.data.image_url).toBe("/images/placeholder.png");
  });
});
