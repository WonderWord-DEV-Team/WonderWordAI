/**
 * REAL FLOW / INTEGRATION TESTS (CONSUMES CREDITS)
 * This file runs real tests calling the OpenAI and Unsplash APIs directly, downloading and caching in Supabase.
 * IMPORTANT: Consumes real credits/tokens from the keys configured in .env.local.
 * Usage: Automatically run with 'npx vitest run live_flow'.
 */
import fs from "fs";
import path from "path";

const runLiveApiTests = process.env.RUN_LIVE_API_TESTS === "true";
const envPath = path.resolve(__dirname, "../.env.local");
if (runLiveApiTests && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const firstEqual = trimmed.indexOf("=");
      if (firstEqual !== -1) {
        const key = trimmed.slice(0, firstEqual).trim();
        const value = trimmed.slice(firstEqual + 1).trim();
        process.env[key] = value;
      }
    }
  });
}

import { describe, it, expect, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: () => ({
    getAll: () => [],
    setAll: () => { },
    get: () => undefined,
    set: () => { }
  })
}));
const describeLive = runLiveApiTests ? describe : describe.skip;

describeLive("Live Flow Verification", () => {
  it("runs the live image pipeline directly against real APIs and local Supabase Storage", async () => {
    const { searchUnsplash } = await import("@/lib/illustrations/unsplash/client");
    const { generateDalleImage } = await import("@/lib/illustrations/dalle/client");

    console.log("\n=== STARTING LIVE IMAGE PIPELINE FLOW TEST ===");

    // 1. Test Unsplash
    console.log("\n[1/2] Testing Unsplash for 'shark'...");
    const unsplashUrl = await searchUnsplash("shark");
    console.log("Unsplash result URL:", unsplashUrl);
    expect(unsplashUrl).toBeDefined();
    expect(unsplashUrl).not.toBeNull();

    // 2. Test DALL-E + Upload to Supabase Storage
    console.log("\n[2/2] Testing DALL-E + Supabase Storage cache check/upload for 'platypus'...");
    const dalleUrl = await generateDalleImage("platypus");
    console.log("DALL-E result URL (should be local Supabase URL or base64 fallback):", dalleUrl);
    expect(dalleUrl).toBeDefined();
    expect(dalleUrl).not.toBeNull();

    console.log("\n=== LIVE TEST COMPLETED ===\n");
  }, 50000);
});
