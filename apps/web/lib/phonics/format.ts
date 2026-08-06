// ticket: polish parent dashboard - reading speed trend + phonics deficit breakdown
// turns a raw category like "sh-digraph" into a display label like "Sh Digraph"
export function formatPhonicsCategory(category: string) {
  return category
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
