import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getWordSlug } from "./slug";
import { searchUnsplash } from "./unsplash/client";
import { generateDalleImage } from "./dalle/client";

// Setup mocks
const mockList = vi.fn();
const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();

vi.mock("@/lib/supabase/server", () => {
  return {
    createClient: () => ({
      storage: {
        from: () => ({
          list: mockList,
          upload: mockUpload,
          getPublicUrl: mockGetPublicUrl
        })
      }
    })
  };
});

const mockGenerate = vi.fn();

vi.mock("openai", () => {
  return {
    default: class {
      images = {
        generate: mockGenerate
      }
    }
  };
});

describe("Illustrations Pipeline Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.UNSPLASH_ACCESS_KEY = "test_unsplash_key";
    process.env.OPENAI_API_KEY = "test_openai_key";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getWordSlug", () => {
    it("should clean and slugify words properly", () => {
      expect(getWordSlug("Shark")).toBe("shark");
      expect(getWordSlug("pink dragon")).toBe("pink-dragon");
      expect(getWordSlug("  blue whale!!! ")).toBe("blue-whale");
      expect(getWordSlug("dinosaur")).toBe("dinosaur");
    });
  });

  describe("searchUnsplash", () => {
    it("should return the first image URL on success", async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          results: [
            {
              id: "1",
              urls: { regular: "https://images.unsplash.com/mock-shark.jpg" }
            }
          ]
        })
      };

      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(mockResponse as any);

      const url = await searchUnsplash("pink dragon");
      expect(url).toBe("https://images.unsplash.com/mock-shark.jpg");
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("query=pink-dragon%20cartoon"),
        expect.any(Object)
      );
    });

    it("should return null if Unsplash API fails", async () => {
      vi.spyOn(global, "fetch").mockResolvedValue({
        ok: false,
        status: 500
      } as any);

      const url = await searchUnsplash("shark");
      expect(url).toBeNull();
    });
  });

  describe("generateDalleImage", () => {
    it("should return cached URL if it already exists in Supabase Storage", async () => {
      // Mock existing file in list
      mockList.mockResolvedValue({
        data: [{ name: "shark.png" }],
        error: null
      });

      mockGetPublicUrl.mockReturnValue({
        data: { publicUrl: "https://supabase/illustrations/shark.png" }
      });

      const url = await generateDalleImage("shark");
      expect(url).toBe("https://supabase/illustrations/shark.png");
      expect(mockList).toHaveBeenCalledWith("", { search: "shark.png" });
      expect(mockGenerate).not.toHaveBeenCalled();
    });

    it("should generate image via DALL-E, upload it and return public URL if not cached", async () => {
      // Mock storage list returning empty (not cached)
      mockList.mockResolvedValue({
        data: [],
        error: null
      });

      // Mock OpenAI generation
      mockGenerate.mockResolvedValue({
        data: [{ b64_json: "abcdefg" }]
      });

      // Mock successful storage upload
      mockUpload.mockResolvedValue({
        data: {},
        error: null
      });

      mockGetPublicUrl.mockReturnValue({
        data: { publicUrl: "https://supabase/illustrations/pink-dragon.png" }
      });

      const url = await generateDalleImage("pink dragon");
      expect(url).toBe("https://supabase/illustrations/pink-dragon.png");
      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({ model: "gpt-image-2" }),
        expect.objectContaining({ timeout: 3000 })
      );
      expect(mockUpload).toHaveBeenCalledWith("pink-dragon.png", expect.any(Buffer), {
        contentType: "image/png",
        upsert: true
      });
    });

    it("should return null on DALL-E generation timeout/error", async () => {
      mockList.mockResolvedValue({
        data: [],
        error: null
      });

      // Mock OpenAI timeout/error
      mockGenerate.mockRejectedValue(new Error("Request timed out"));

      const url = await generateDalleImage("shark");
      expect(url).toBeNull();
    });

    it("should return base64 data URI if storage upload fails", async () => {
      mockList.mockResolvedValue({
        data: [],
        error: null
      });

      mockGenerate.mockResolvedValue({
        data: [{ b64_json: "abcdefg" }]
      });

      // Mock upload failure
      mockUpload.mockResolvedValue({
        data: null,
        error: new Error("Storage upload error")
      });

      const url = await generateDalleImage("shark");
      expect(url).toBe("data:image/png;base64,abcdefg");
    });
  });
});
