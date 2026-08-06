"use client";

import { useMutation } from "@tanstack/react-query";
import { generateStory, type GenerateStoryInput } from "@/lib/stories/generate-client";

// ticket: wire ChildReadingShell up to /api/stories/generate
export function useGenerateStory() {
  return useMutation({
    mutationFn: (input: GenerateStoryInput) => generateStory(input)
  });
}