/**
 * Converts a word (e.g., "pink dragon!") into a clean, URL-friendly slug (e.g., "pink-dragon").
 */
export function getWordSlug(word: string): string {
  return word
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-") // replace non-alphanumeric chars with hyphens
    .replace(/(^-|-$)/g, "");    // trim leading/trailing hyphens
}
