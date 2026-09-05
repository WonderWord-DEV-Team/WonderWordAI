import "server-only";

import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin";

/**
 * Data behind the four daily cards on the Child Home (Day Streak, Today's Goal,
 * Weekly Challenge, Word of the Day).
 *
 * Everything is read from Supabase: `daily_goals`, `weekly_challenges` and
 * `words_of_the_day` hold a full year of pre-seeded content, and the row picked
 * is the one matching today's day/week — so each login day shows a new one.
 * `child_daily_activity` records the login days used for the streak. No
 * external API is involved.
 */

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
  xpReward: number;
  ctaLabel: string;
  ctaHref: string;
  storyTheme: string | null;
};

export type WordOfTheDay = {
  word: string;
  partOfSpeech: string | null;
  definition: string;
  exampleSentence: string;
};

export type ChildHomeDaily = {
  streakDays: number;
  goal: DailyGoal;
  challenge: WeeklyChallenge;
  word: WordOfTheDay;
};

const ACTIVITY_LOOKBACK_DAYS = 400;

const FALLBACK_GOAL = {
  title: "Warm-Up Reader",
  description: "Finish 2 reading activities to warm up your brain!",
  targetCount: 2,
  unit: "activities",
  emoji: "📖"
};

const FALLBACK_CHALLENGE: WeeklyChallenge = {
  title: "Story Marathon",
  description: "Finish 3 stories from any world — earn 90 XP!",
  xpReward: 90,
  ctaLabel: "Try it!",
  ctaHref: "/child",
  storyTheme: null
};

const FALLBACK_WORD: WordOfTheDay = {
  word: "Curious",
  partOfSpeech: "adjective",
  definition: "Feeling curious means you want to learn more about something.",
  exampleSentence: "Maya is curious about how bees make honey."
};

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

/** Consecutive days with activity, counting back from today. */
export function computeStreak(activityDates: string[], today: string) {
  const days = new Set(activityDates);
  const cursor = new Date(`${today}T00:00:00.000Z`);

  // A child who has not opened the app yet today keeps yesterday's streak.
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

export function fallbackChildHomeDaily(streakDays = 1, completedCount = 0): ChildHomeDaily {
  return {
    streakDays,
    goal: {
      ...FALLBACK_GOAL,
      completedCount,
      percent: toPercent(completedCount, FALLBACK_GOAL.targetCount)
    },
    challenge: FALLBACK_CHALLENGE,
    word: FALLBACK_WORD
  };
}

function toPercent(completed: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((completed / target) * 100));
}

/**
 * Records today's visit and returns everything the four daily cards need.
 * Never throws: if the content tables are not deployed yet the card falls back
 * to static copy instead of breaking the home page.
 */
export async function getChildHomeDaily(childId: string): Promise<ChildHomeDaily> {
  if (!hasSupabaseAdminEnv()) {
    return fallbackChildHomeDaily();
  }

  try {
    const admin = createAdminClient();
    const now = new Date();
    const today = toIsoDate(now);
    const todayStart = `${today}T00:00:00.000Z`;
    const lookbackStart = new Date(now);
    lookbackStart.setUTCDate(lookbackStart.getUTCDate() - ACTIVITY_LOOKBACK_DAYS);

    // Opening the home page is what marks the day as "logged in".
    await admin.from("child_daily_activity").upsert(
      {
        child_id: childId,
        activity_date: today,
        last_active_at: now.toISOString()
      },
      { onConflict: "child_id,activity_date" }
    );

    const [activity, goalRow, challengeRow, wordRow, sessionsToday, storiesToday] =
      await Promise.all([
        admin
          .from("child_daily_activity")
          .select("activity_date")
          .eq("child_id", childId)
          .gte("activity_date", toIsoDate(lookbackStart))
          .order("activity_date", { ascending: false }),
        admin
          .from("daily_goals")
          .select("title, description, target_count, unit, emoji")
          .eq("day_of_year", dayOfYear(now))
          .maybeSingle(),
        admin
          .from("weekly_challenges")
          .select("title, description, xp_reward, cta_label, cta_href, story_theme")
          .eq("week_of_year", isoWeekOfYear(now))
          .maybeSingle(),
        admin
          .from("words_of_the_day")
          .select("word, part_of_speech, definition, example_sentence")
          .eq("day_of_year", dayOfYear(now))
          .maybeSingle(),
        admin
          .from("reading_sessions")
          .select("id", { count: "exact", head: true })
          .eq("child_id", childId)
          .gte("start_time", todayStart),
        admin
          .from("generated_stories")
          .select("id", { count: "exact", head: true })
          .eq("child_id", childId)
          .gte("generated_at", todayStart)
      ]);

    const activityDates = (activity.data ?? []).map((row) => String(row.activity_date));
    const streakDays = Math.max(1, computeStreak(activityDates, today));

    const goalSource = goalRow.data ?? {
      title: FALLBACK_GOAL.title,
      description: FALLBACK_GOAL.description,
      target_count: FALLBACK_GOAL.targetCount,
      unit: FALLBACK_GOAL.unit,
      emoji: FALLBACK_GOAL.emoji
    };

    const targetCount = Number(goalSource.target_count) || FALLBACK_GOAL.targetCount;
    const completedCount = Math.min(
      targetCount,
      (sessionsToday.count ?? 0) + (storiesToday.count ?? 0)
    );

    const challenge: WeeklyChallenge = challengeRow.data
      ? {
          title: challengeRow.data.title,
          description: challengeRow.data.description,
          xpReward: Number(challengeRow.data.xp_reward) || FALLBACK_CHALLENGE.xpReward,
          ctaLabel: challengeRow.data.cta_label ?? FALLBACK_CHALLENGE.ctaLabel,
          ctaHref: challengeRow.data.cta_href ?? FALLBACK_CHALLENGE.ctaHref,
          storyTheme: challengeRow.data.story_theme ?? null
        }
      : FALLBACK_CHALLENGE;

    const word: WordOfTheDay = wordRow.data
      ? {
          word: wordRow.data.word,
          partOfSpeech: wordRow.data.part_of_speech ?? null,
          definition: wordRow.data.definition,
          exampleSentence: wordRow.data.example_sentence
        }
      : FALLBACK_WORD;

    return {
      streakDays,
      goal: {
        title: goalSource.title,
        description: goalSource.description,
        targetCount,
        unit: goalSource.unit ?? FALLBACK_GOAL.unit,
        emoji: goalSource.emoji ?? FALLBACK_GOAL.emoji,
        completedCount,
        percent: toPercent(completedCount, targetCount)
      },
      challenge,
      word
    };
  } catch (error) {
    console.error("Failed to load Child Home daily content:", error);
    return fallbackChildHomeDaily();
  }
}
