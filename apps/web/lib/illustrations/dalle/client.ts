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
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

/**
 * Gera uma ilustração via OpenAI (gpt-image-2 / DALL-E) e retorna como URL pública ou URI de dados base64.
 * Inclui cache no Supabase Storage e timeout de 3 segundos no request da API.
 */
export async function generateDalleImage(word: string): Promise<string | null> {
  const wordSlug = getWordSlug(word);
  const fileName = `${wordSlug}.png`;
  const bucketName = "illustrations";
  const supabase = createClient();

  // 1. Check if image is already cached in Supabase Storage
  try {
    const { data: existingFiles, error: listError } = await supabase.storage
      .from(bucketName)
      .list("", { search: fileName });

    if (!listError && existingFiles && existingFiles.length > 0) {
      const isCached = existingFiles.some(file => file.name === fileName);
      if (isCached) {
        const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(fileName);
        return publicUrl;
      }
    }
  } catch (e) {
    console.warn("Storage cache check failed, proceeding to generate:", e);
  }

  // 2. Call OpenAI API with 3s timeout
  try {
    const openai = getOpenAIClient();
    const response = await openai.images.generate(
      {
        model: "gpt-image-2",
        prompt: `A friendly, colorful illustration of a ${word}, suitable for a K-2 reading app, no text, clean white background.`,
        n: 1,
        size: "1024x1024"
      },
      {
        timeout: 3000 // 3 seconds timeout
      }
    );

    const base64Image = response.data?.[0]?.b64_json;
    if (!base64Image) {
      return null;
    }

    // 3. Upload generated image to Supabase Storage
    try {
      const imageBuffer = Buffer.from(base64Image, "base64");
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, imageBuffer, {
          contentType: "image/png",
          upsert: true
        });

      if (uploadError) {
        console.error("Failed to upload generated image to storage:", uploadError);
        // Fallback: return data URI so the user still sees the image
        return `data:image/png;base64,${base64Image}`;
      }

      const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(fileName);
      return publicUrl;
    } catch (uploadException) {
      console.error("Error during storage upload exception:", uploadException);
      return `data:image/png;base64,${base64Image}`;
    }
  } catch (e) {
    console.error("DALL-E image generation failed or timed out:", e);
  }
  return null;
}
