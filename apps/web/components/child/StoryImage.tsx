// ticket: implement image rendering inside story tab (skeleton + placeholder)
// visual spec: square color-block placeholder next to the story text (per design mockup)
export type StoryImageStatus = "loading" | "empty" | "ready" | "error";

type StoryImageProps = {
  status: StoryImageStatus;
  imageUrl?: string | null;
  alt?: string;
  className?: string;
};

export function StoryImage({
  status,
  imageUrl,
  alt = "Story illustration",
  className = ""
}: StoryImageProps) {
  const baseClassName = `aspect-square w-full overflow-hidden rounded-2xl sm:w-56 w-40 ${className}`;

  // skeleton state, shown while the illustration is generating or being fetched
  if (status === "loading") {
    return (
      <div
        className={`${baseClassName} animate-pulse bg-teal/30`}
        role="status"
        aria-busy="true"
        aria-label="Loading story illustration"
      />
    );
  }

  // ready state, renders the generated illustration once one exists
  if (status === "ready" && imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote story images aren't in next.config's allowed image domains yet
      <img src={imageUrl} alt={alt} className={`${baseClassName} object-cover`} />
    );
  }

  // placeholder state, covers both "no image yet" and "image failed" for now
  return (
    <div
      className={`${baseClassName} bg-teal`}
      role="img"
      aria-label={
        status === "error"
          ? "Story illustration failed to load"
          : "Story illustration placeholder"
      }
    />
  );
}
