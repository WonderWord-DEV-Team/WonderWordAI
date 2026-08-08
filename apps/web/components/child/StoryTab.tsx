import { StoryImage, type StoryImageStatus } from "@/components/child/StoryImage";

// ticket: implement image rendering inside story tab (skeleton + placeholder)
// layout spec: square image beside a bordered text box (per design mockup)
//
// The outer card below *is* the "story placeholder" -- both the illustration
// (StoryImage) and the generated story text render inside of it together,
// instead of the story text being displayed separately outside the box.
type StoryTabProps = {
  storyText?: string | null;
  imageStatus?: StoryImageStatus;
  imageUrl?: string | null;
  // Normalized (lowercase, punctuation-stripped) words to highlight in the
  // story text -- used to call out the words the child misread.
  highlightWords?: Set<string>;
  // Allows callers to reuse their own normalization so highlighting stays
  // consistent with however they built `highlightWords`.
  normalizeWord?: (word: string) => string;
};

export function defaultNormalizeWord(word: string) {
  return word.toLowerCase().replace(/[^a-z0-9']/g, "");
}

// Splits on whitespace while keeping the whitespace tokens (via the capture
// group) so original spacing/newlines are preserved when we re-render.
// Exported so other tabs (e.g. Listen) can highlight the same words
// consistently instead of re-implementing this.
export function renderStoryText(
  storyText: string,
  highlightWords: Set<string> | undefined,
  normalizeWord: (word: string) => string
) {
  if (!highlightWords || highlightWords.size === 0) {
    return storyText;
  }

  return storyText.split(/(\s+)/).map((token, index) => {
    if (token === "" || /^\s+$/.test(token)) {
      return token;
    }

    const isMiscue = highlightWords.has(normalizeWord(token));

    return isMiscue ? (
      <span key={index} className="rounded bg-red-100 px-1 font-bold text-red-600">
        {token}
      </span>
    ) : (
      <span key={index}>{token}</span>
    );
  });
}

export function StoryTab({
  storyText = null,
  imageStatus = "empty",
  imageUrl = null,
  highlightWords,
  normalizeWord = defaultNormalizeWord
}: StoryTabProps) {
  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius-card)] bg-white/88 p-5 sm:flex-row">
      <StoryImage status={imageStatus} imageUrl={imageUrl} className="shrink-0" />

      <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-4">
        {storyText ? (
          <p className="whitespace-pre-wrap text-lg font-extrabold leading-9 text-navy">
            {renderStoryText(storyText, highlightWords, normalizeWord)}
          </p>
        ) : (
          <p className="text-sm leading-6 text-muted">
            {imageStatus === "loading"
              ? "Writing a brand-new story just for this word..."
              : "Your generated story will appear here once story generation is connected to this screen."}
          </p>
        )}
      </div>
    </div>
  );
}