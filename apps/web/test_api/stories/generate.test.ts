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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should resolve to Unsplash image, insert it into DB and return it (< 500ms latency requirement)", async () => {
    // Mock successful Unsplash API fetch response
    const mockUnsplashUrl = "https://images.unsplash.com/mock-shark.jpg";
    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [{ id: "unsplash-id-123", urls: { regular: mockUnsplashUrl } }]
          })
      } as any)
    );

    mockSingle.mockResolvedValue({
      data: {
        id: "story-123",
        child_id: VALID_CHILD_ID,
        word: "shark",
        story_text: "Once upon a time, a shark swam in the deep blue sea.",
        image_url: mockUnsplashUrl,
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

    // Measure latency for Unsplash hit integration
    const start = performance.now();
    const res = await POST(req);
    const end = performance.now();
    const duration = end - start;

    expect(res.status).toBe(200);
    const resJson = await res.json();

    // Verify it resolved via Unsplash
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("unsplash.com/search/photos"),
      expect.any(Object)
    );

    // Verify the URL was wired and saved
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        image_url: mockUnsplashUrl
      })
    );

    expect(resJson.data.image_url).toBe(mockUnsplashUrl);

    // Assert latency constraint: <500ms for Unsplash hits
    expect(duration).toBeLessThan(500);
  });

  it("should fallback to DALL-E when Unsplash returns no results", async () => {
    // Unsplash returns no results
    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ results: [] })
      } as any)
    );

    // Mock storage cache miss (list returns empty array)
    // To mock the storage functions called inside generateDalleImage, we mock mockSupabase's storage
    const mockStorageList = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockStorageUpload = vi.fn().mockResolvedValue({ data: {}, error: null });
    const mockStorageGetPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: "https://supabase/illustrations/dinosaur.png" }
    });

    mockSupabase.from = vi.fn((table) => {
      if (table === "users") {
        return {
          select: () => ({ eq: () => ({ maybeSingle: mockMaybeSingleUser }) })
        };
      }
      if (table === "child_known_words") {
        return {
          select: () => ({ eq: () => ({ maybeSingle: mockMaybeSingleKnownWords }) })
        };
      }
      if (table === "generated_stories") {
        return { insert: mockInsert };
      }
      return {};
    }) as any;

    // Attach mock storage
    (mockSupabase as any).storage = {
      from: () => ({
        list: mockStorageList,
        upload: mockStorageUpload,
        getPublicUrl: mockStorageGetPublicUrl
      })
    };

    mockSingle.mockResolvedValue({
      data: {
        id: "story-124",
        child_id: VALID_CHILD_ID,
        word: "dinosaur",
        story_text: "Dinosaur went roar.",
        image_url: "https://supabase/illustrations/dinosaur.png",
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

    // Verify Unsplash was searched
    expect(fetchSpy).toHaveBeenCalled();

    // Verify DALL-E was called
    expect(mockOpenaiGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-image-2"
      }),
      expect.any(Object)
    );

    // Verify DALL-E image was saved to Supabase storage cache
    expect(mockStorageUpload).toHaveBeenCalledWith(
      "dinosaur.png",
      expect.any(Buffer),
      expect.any(Object)
    );

    // Verify database was updated with DALL-E storage URL
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        image_url: "https://supabase/illustrations/dinosaur.png"
      })
    );

    expect(resJson.data.image_url).toBe("https://supabase/illustrations/dinosaur.png");
  });

  it("should fallback to static placeholder when both Unsplash and DALL-E fail", async () => {
    // Unsplash search fails
    vi.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 500
      } as any)
    );

    // DALL-E generation fails (OpenAI throws error)
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
