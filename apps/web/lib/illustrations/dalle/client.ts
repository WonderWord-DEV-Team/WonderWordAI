import "server-only";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { getWordSlug } from "../slug";

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing OPENAI_API_KEY");
    }
    openaiClient = new OpenAI({
      apiKey,
      maxRetries: 0
    });
  }
  return openaiClient;
}

/**
 * Generates an illustration via OpenAI (gpt-image-2 / DALL-E) and returns it as a public URL or base64 data URI.
 * Includes caching in Supabase Storage and a 3-second timeout on the API request.
 */
export async function generateDalleImage(word: string): Promise<string | null> {
  const wordSlug = getWordSlug(word);
  const fileName = `${wordSlug}.png`;
  const bucketName = "illustrations";
  const supabase = createClient();

  // 1. Check if image is already cached in Supabase Storage
  try {
    console.log("[DALL-E Client] Checking storage cache for:", fileName);
    const { data: existingFiles, error: listError } = await supabase.storage
      .from(bucketName)
      .list("", { search: fileName });

    if (!listError && existingFiles && existingFiles.length > 0) {
      const isCached = existingFiles.some(file => file.name === fileName);
      if (isCached) {
        const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(fileName);
        console.log("[DALL-E Client] Cache hit! Public URL:", publicUrl);
        return publicUrl;
      }
    }
    console.log("[DALL-E Client] Cache miss.");
  } catch (e) {
    console.warn("[DALL-E Client] Storage cache check failed, proceeding to generate:", e);
  }

  // 2. Call OpenAI API with 10s timeout
  try {
    const openai = getOpenAIClient();
    console.log("[DALL-E Client] Calling OpenAI images.generate for word:", word);
    const response = await openai.images.generate(
      {
        model: "gpt-image-2",
        prompt: `A friendly, colorful illustration of a ${word}, suitable for a K-2 reading app, no text, clean white background.`,
        n: 1,
        size: "1024x1024"
      },
      {
        timeout: 30000 // 30 seconds timeout
      }
    );

    console.log("[DALL-E Client] OpenAI call responded.");
    const base64Image = response.data?.[0]?.b64_json;
    const tempUrl = response.data?.[0]?.url;
    console.log("[DALL-E Client] base64 length:", base64Image?.length ?? 0, "tempUrl:", tempUrl);

    let imageBuffer: Buffer;
    if (base64Image) {
      imageBuffer = Buffer.from(base64Image, "base64");
    } else if (tempUrl) {
      try {
        console.log("[DALL-E Client] Downloading temp URL:", tempUrl);
        const imageRes = await fetch(tempUrl);
        if (!imageRes.ok) {
          throw new Error(`Failed to fetch image from OpenAI URL: ${imageRes.status}`);
        }
        imageBuffer = Buffer.from(await imageRes.arrayBuffer());
        console.log("[DALL-E Client] Downloaded temp URL. Size in bytes:", imageBuffer.length);
      } catch (fetchErr) {
        console.error("[DALL-E Client] Failed to download image from OpenAI temp URL:", fetchErr);
        return tempUrl; // Return the temp URL directly as a fallback
      }
    } else {
      console.log("[DALL-E Client] No image data returned from OpenAI.");
      return null;
    }

    // 3. Upload generated image to Supabase Storage
    try {
      console.log("[DALL-E Client] Uploading to Supabase Storage...");
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, imageBuffer, {
          contentType: "image/png",
          upsert: true
        });

      if (uploadError) {
        console.error("[DALL-E Client] Failed to upload generated image to storage:", uploadError);
        // Fallback: return data URI or temp URL so the user still sees the image
        return base64Image ? `data:image/png;base64,${base64Image}` : (tempUrl || null);
      }

      const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(fileName);
      console.log("[DALL-E Client] Upload success! Public URL:", publicUrl);
      return publicUrl;
    } catch (uploadException) {
      console.error("[DALL-E Client] Error during storage upload exception:", uploadException);
      return base64Image ? `data:image/png;base64,${base64Image}` : (tempUrl || null);
    }
  } catch (e) {
    console.error("[DALL-E Client] DALL-E image generation failed or timed out:", e);
  }
  return null;
}
