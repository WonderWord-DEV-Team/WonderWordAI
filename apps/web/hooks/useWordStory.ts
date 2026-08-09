"use client";

import { useEffect, useRef, useState } from "react";
import { useGenerateStory } from "@/hooks/useGenerateStory";
import type { GeneratedStory } from "@/lib/stories/generate-client";
import type { StoryImageStatus } from "@/components/child/StoryImage";
import type { SessionAudioMiscue } from "@/lib/audio/schema";

function stripVisualMarker(text: string): string {
  return text
    .replace(/\[VISUAL\]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type WordStoryState = {
  // The story text for the currently active word -- the freshly generated,
  // on-topic story when available, otherwise the fallback (worksheet) text.
  storyText: string | null;
  imageUrl: string | null;
  status: StoryImageStatus;
  isGenerated: boolean;
};

/*
 * Generates (and caches, per word) a story + illustration for whichever
 * miscue word is currently active in the Reading Feedback modal.
 *
 * This lives above any single tab so every tab -- Story, Listen, etc. --
 * can share the exact same word-specific content instead of each tab
 * needing its own copy of this fetch/cache logic, and so generation for
 * the next tab can be already underway/cached by the time the child gets
 * there.
 *
 * Falls back to `fallbackText` (the original worksheet text) when there's
 * no childId to attribute the story to, or if generation fails, so
 * practice is never blocked on story generation.
 */
export function useWordStory({
  childId,
  miscue,
  fallbackText
}: {
  childId: string | null;
  miscue: SessionAudioMiscue | null;
  fallbackText: string;
}): WordStoryState {
  const generateStory = useGenerateStory();

  // Cache generated stories per word so repeated miscues of the same word
  // (repeats are allowed in the miscue list) don't pay for a fresh
  // generation attempt every time they come up.
  const cacheRef = useRef<Map<string, GeneratedStory>>(new Map());

  const [generatedStory, setGeneratedStory] = useState<GeneratedStory | null>(null);
  const [generationFailed, setGenerationFailed] = useState(false);

  useEffect(() => {
    if (!miscue?.word) {
      setGeneratedStory(null);
      setGenerationFailed(false);
      return;
    }

    if (!childId) {
      // No child to attribute the story to -- fall back to the worksheet
      // text instead of blocking practice on story generation.
      console.warn(
        `[useWordStory] Skipping story generation for "${miscue.word}" -- no childId available.`
      );
      setGeneratedStory(null);
      setGenerationFailed(false);
      return;
    }

    const cacheKey = `${miscue.word.toLowerCase()}:${miscue.phonicsCategory ?? ""}`;
    const cached = cacheRef.current.get(cacheKey);

    if (cached) {
      setGeneratedStory(cached);
      setGenerationFailed(false);
      return;
    }

    let cancelled = false;
    setGeneratedStory(null);
    setGenerationFailed(false);

    generateStory.mutate(
      {
        childId,
        word: miscue.word,
        phonicsCategory: miscue.phonicsCategory
      },
      {
        onSuccess: (data) => {
          if (cancelled) return;

          cacheRef.current.set(cacheKey, data);
          setGeneratedStory(data);

          // Shown in the browser console so it's easy to see, per attempt,
          // whether story generation passed or failed.
          console.log(
            `[useWordStory] Story generation PASSED for "${miscue.word}" ` +
              `(validation score: ${data.validation_score}).`
          );
        },
        onError: (error) => {
          if (cancelled) return;

          setGenerationFailed(true);

          console.error(
            `[useWordStory] Story generation FAILED for "${miscue.word}".`,
            error
          );
        }
      }
    );

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [miscue?.word, miscue?.phonicsCategory, childId]);

  const showFallback = generationFailed || !childId;
  const storyText = generatedStory?.story_text
  ? stripVisualMarker(generatedStory.story_text)
  : showFallback
    ? fallbackText
    : null;

  const status: StoryImageStatus = generatedStory
    ? generatedStory.image_url
      ? "ready"
      : "empty"
    : generationFailed
      ? "error"
      : childId
        ? "loading"
        : "empty";

  return {
    storyText,
    imageUrl: generatedStory?.image_url ?? null,
    status,
    isGenerated: Boolean(generatedStory)
  };
}
