import { StoryImage, type StoryImageStatus } from "@/components/child/StoryImage";

// ticket: implement image rendering inside story tab (skeleton + placeholder)
// layout spec: square image beside a bordered text box (per design mockup)
type StoryTabProps = {
  storyText?: string | null;
  imageStatus?: StoryImageStatus;
  imageUrl?: string | null;
};

export function StoryTab({
  storyText = null,
  imageStatus = "empty",
  imageUrl = null
}: StoryTabProps) {
  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius-card)] bg-white/88 p-5 sm:flex-row">
      <StoryImage status={imageStatus} imageUrl={imageUrl} className="shrink-0" />

      <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-4">
        {storyText ? (
          <p className="whitespace-pre-wrap text-lg font-extrabold leading-9 text-navy">
            {storyText}
          </p>
        ) : (
          <p className="text-sm leading-6 text-muted">
            Your generated story will appear here once story generation is connected to this
            screen.
          </p>
        )}
      </div>
    </div>
  );
}
