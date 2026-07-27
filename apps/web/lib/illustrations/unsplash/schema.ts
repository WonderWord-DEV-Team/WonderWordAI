import { z } from "zod";

export const unsplashImageSchema = z.object({
  id: z.string(),
  urls: z.object({
    regular: z.string().url()
  })
});

export const unsplashSearchResponseSchema = z.object({
  results: z.array(unsplashImageSchema)
});

export type UnsplashImage = z.infer<typeof unsplashImageSchema>;
export type UnsplashSearchResponse = z.infer<typeof unsplashSearchResponseSchema>;
