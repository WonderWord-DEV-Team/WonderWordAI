export const READING_LEVELS = new Set(["starting", "simple", "help", "independent"]);

// child_profiles.grade has a CHECK (grade between 1 and 5) — this app is
// scoped to K-5. Clamp into that range rather than the raw age-5 value.
export function gradeFromAge(age: number): number {
  const grade = age - 5;
  if (grade < 1) return 1;
  if (grade > 5) return 5;
  return grade;
}

export function normalizeReadingLevel(value: string): string | null {
  return READING_LEVELS.has(value) ? value : null;
}

export function generateSyntheticChildEmail(): string {
  return `child+${crypto.randomUUID()}@child.wonderword.internal`;
}