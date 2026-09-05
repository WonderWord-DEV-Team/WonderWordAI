import "server-only";

import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin";

/**
 * Data behind the four daily cards on the Child Home (Day Streak, Today's Goal,
 * Weekly Challenge, Word of the Day).
 *
 * Content comes from Supabase: `daily_goals`, `weekly_challenges` and
 * `words_of_the_day` hold a full year, and the row picked is the one matching
 * today's day/week. Progress comes from `child_activity_events`, which the
 * server writes when a child genuinely finishes an activity — see
 * app/child/activity-actions.ts. No external API is involved.
 *
 * Every date here is the *child's* calendar day, resolved from the time zone
 * their browser reported. Using UTC would roll the streak over at 21:00 in
 * Brazil and 16:00 US Pacific.
 */

export type ActivityType = "themed_story" | "read_aloud" | "worksheet";

export type DailyGoal = {
  title: string;
  description: string;
  targetCount: number;
  unit: string;
  emoji: string;
  completedCount: number;
  percent: number;
};

export type WeeklyChallenge = {
  title: string;
  description: string;
  targetType: ActivityType;
  targetTheme: string | null;
  targetCount: number;
  completedCount: number;
  isComplete: boolean;
};

export type WordOfTheDay = {
  word: string;
  partOfSpeech: string | null;
  definition: string;
  exampleSentence: string;
};

export type ChildHomeDaily = {
  streakDays: number;
  activeToday: boolean;
  goal: DailyGoal;
  challenge: WeeklyChallenge;
  word: WordOfTheDay;
};

const STREAK_LOOKBACK_DAYS = 400;

const FALLBACK_GOAL = {
  title: "Warm-Up Reader",
  description: "Finish 2 reading activities to warm up your brain!",
  targetCount: 2,
  unit: "activities",
  emoji: "📖"
};

const FALLBACK_CHALLENGE = {
  title: "Story Explorer",
  description: "Finish 2 stories from any world.",
  targetType: "themed_story" as ActivityType,
  targetTheme: null,
  targetCount: 2
};

const FALLBACK_WORD: WordOfTheDay = {
  word: "Curious",
  partOfSpeech: "adjective",
  definition: "Feeling curious means you want to learn more about something.",
  exampleSentence: "Maya is curious about how bees make honey."
};

/** YYYY-MM-DD in the given IANA zone. */
export function localDateIn(timeZone: string, at: Date = new Date()) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(at);
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(at);
  }
}

/** Parses YYYY-MM-DD as a UTC instant, so calendar maths never drifts. */
function parseIsoDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** 1-366, matching Postgres `EXTRACT(DOY FROM ...)`. */
export function dayOfYear(date: Date) {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 1);
  const current = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((current - startOfYear) / 86_400_000) + 1;
}

/** 1-53, matching the ISO week number Postgres uses for `EXTRACT(WEEK FROM ...)`. */
export function isoWeekOfYear(date: Date) {
  const target = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = Date.UTC(target.getUTCFullYear(), 0, 1);
  return Math.ceil(((target.getTime() - yearStart) / 86_400_000 + 1) / 7);
}

/** The Monday of the ISO week containing `date`. */
export function isoWeekStart(date: Date) {
  const target = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const dayNumber = target.getUTCDay() || 7; // Monday = 1 ... Sunday = 7
  target.setUTCDate(target.getUTCDate() - (dayNumber - 1));
  return target;
}

/**
 * Consecutive days the child finished something, counting back from today.
 * A day with no activity yet keeps yesterday's streak alive — it only breaks
 * once a whole day passes with nothing done.
 */
export function computeStreak(activityDates: string[], today: string) {
  const days = new Set(activityDates);
  const cursor = parseIsoDate(today);

  if (!days.has(today)) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  let streak = 0;
  while (days.has(toIsoDate(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

function toPercent(completed: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((completed / target) * 100));
}

export function fallbackChildHomeDaily(): ChildHomeDaily {
  return {
    streakDays: 0,
    activeToday: false,
    goal: { ...FALLBACK_GOAL, completedCount: 0, percent: 0 },
    challenge: { ...FALLBACK_CHALLENGE, completedCount: 0, isComplete: false },
    word: FALLBACK_WORD
  };
}

/**
 * Everything the four daily cards need. Never throws: if the tables are not
 * deployed yet the cards fall back to static copy instead of breaking the page.
 */
export async function getChildHomeDaily(childId: string): Promise<ChildHomeDaily> {
  if (!hasSupabaseAdminEnv()) {
    return fallbackChildHomeDaily();
  }

  try {
    const admin = createAdminClient();

    const { data: profile } = await admin
      .from("child_profiles")
      .select("timezone")
      .eq("child_id", childId)
      .maybeSingle();

    const timeZone = profile?.timezone ?? "UTC";
    const todayIso = localDateIn(timeZone);
    const today = parseIsoDate(todayIso);
    const weekStartIso = toIsoDate(isoWeekStart(today));

    const lookbackStart = new Date(today);
    lookbackStart.setUTCDate(lookbackStart.getUTCDate() - STREAK_LOOKBACK_DAYS);

    const [goalRow, challengeRow, wordRow, streakRows, todayRows] = await Promise.all([
      admin
        .from("daily_goals")
        .select("title, description, target_count, unit, emoji")
        .eq("day_of_year", dayOfYear(today))
        .maybeSingle(),
      admin
        .from("weekly_challenges")
        .select("title, description, target_type, target_theme, target_count")
        .eq("week_of_year", isoWeekOfYear(today))
        .maybeSingle(),
      admin
        .from("words_of_the_day")
        .select("word, part_of_speech, definition, example_sentence")
        .eq("day_of_year", dayOfYear(today))
        .maybeSingle(),
      admin
        .from("child_activity_events")
        .select("local_date")
        .eq("child_id", childId)
        .gte("local_date", toIsoDate(lookbackStart))
        .lte("local_date", todayIso)
        .order("local_date", { ascending: false }),
      admin
        .from("child_activity_events")
        .select("id", { count: "exact", head: true })
        .eq("child_id", childId)
        .eq("local_date", todayIso)
    ]);

    const streakDates = (streakRows.data ?? []).map((row) => String(row.local_date));
    const streakDays = computeStreak(streakDates, todayIso);
    const completedToday = todayRows.count ?? 0;

    const goalSource = goalRow.data ?? {
      title: FALLBACK_GOAL.title,
      description: FALLBACK_GOAL.description,
      target_count: FALLBACK_GOAL.targetCount,
      unit: FALLBACK_GOAL.unit,
      emoji: FALLBACK_GOAL.emoji
    };
    const goalTarget = Number(goalSource.target_count) || FALLBACK_GOAL.targetCount;
    const goalCompleted = Math.min(goalTarget, completedToday);

    const challengeSource = challengeRow.data
      ? {
          title: challengeRow.data.title,
          description: challengeRow.data.description,
          targetType: challengeRow.data.target_type as ActivityType,
          targetTheme: challengeRow.data.target_theme ?? null,
          targetCount: Number(challengeRow.data.target_count) || 1
        }
      : FALLBACK_CHALLENGE;

    // Progress for the challenge is scoped to this ISO week and to the exact
    // activity it asks for, so the card can only claim what actually happened.
    let challengeQuery = admin
      .from("child_activity_events")
      .select("id", { count: "exact", head: true })
      .eq("child_id", childId)
      .eq("activity_type", challengeSource.targetType)
      .gte("local_date", weekStartIso)
      .lte("local_date", todayIso);

    if (challengeSource.targetTheme) {
      challengeQuery = challengeQuery.eq("theme", challengeSource.targetTheme);
    }

    const challengeProgress = await challengeQuery;
    const challengeCompleted = Math.min(
      challengeSource.targetCount,
      challengeProgress.count ?? 0
    );

    return {
      streakDays,
      activeToday: completedToday > 0,
      goal: {
        title: goalSource.title,
        description: goalSource.description,
        targetCount: goalTarget,
        unit: goalSource.unit ?? FALLBACK_GOAL.unit,
        emoji: goalSource.emoji ?? FALLBACK_GOAL.emoji,
        completedCount: goalCompleted,
        percent: toPercent(goalCompleted, goalTarget)
      },
      challenge: {
        ...challengeSource,
        completedCount: challengeCompleted,
        isComplete: challengeCompleted >= challengeSource.targetCount
      },
      word: wordRow.data
        ? {
            word: wordRow.data.word,
            partOfSpeech: wordRow.data.part_of_speech ?? null,
            definition: wordRow.data.definition,
            exampleSentence: wordRow.data.example_sentence
          }
        : FALLBACK_WORD
    };
  } catch (error) {
    console.error("Failed to load Child Home daily content:", error);
    return fallbackChildHomeDaily();
  }
}
