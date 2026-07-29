import "server-only";
import { unsplashSearchResponseSchema } from "./schema";
import { getWordSlug } from "../slug";


export async function searchUnsplash(word: string): Promise<string | null> {
  const unsplashAccessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!unsplashAccessKey) {
    console.warn("Unsplash lookup skipped: Missing UNSPLASH_ACCESS_KEY");
    return null;
  }

  const slug = getWordSlug(word);
  const query = `${slug} cartoon`;
  const endpoint = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1`;

  try {
    const res = await fetch(endpoint, {
      headers: {
        Authorization: `Client-ID ${unsplashAccessKey}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      const parsed = unsplashSearchResponseSchema.safeParse(data);

      if (parsed.success && parsed.data.results?.[0]) {
        return parsed.data.results[0].urls.regular;
      } else if (!parsed.success) {
        console.error("Unsplash response validation failed:", parsed.error);
      }
    } else {
      console.error(`Unsplash API returned status code: ${res.status}`);
    }
  } catch (e) {
    console.error("Unsplash API call failed:", e);
  }
  return null;
}
