-- Child Home: Day Streak, Today's Goal, Weekly Challenge and Word of the Day.
--
-- These four cards used to be static "Coming soon" placeholders. They are now
-- backed by pre-seeded content (a full year of goals and words, a full year of
-- weekly challenges) plus a per-child login/activity ledger used for the streak.
-- No external API is involved: every value is either read from these tables or
-- derived from data the app already writes (reading_sessions, generated_stories).

-- =============================================================================
-- 1. CONTENT TABLES (static, one row per calendar slot)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.daily_goals (
    day_of_year   SMALLINT PRIMARY KEY CHECK (day_of_year BETWEEN 1 AND 366),
    title         TEXT NOT NULL,
    description   TEXT NOT NULL,
    target_count  SMALLINT NOT NULL CHECK (target_count BETWEEN 1 AND 20),
    unit          TEXT NOT NULL DEFAULT 'activities',
    emoji         TEXT NOT NULL DEFAULT '🎯',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.weekly_challenges (
    week_of_year  SMALLINT PRIMARY KEY CHECK (week_of_year BETWEEN 1 AND 53),
    title         TEXT NOT NULL,
    description   TEXT NOT NULL,
    xp_reward     SMALLINT NOT NULL DEFAULT 50 CHECK (xp_reward > 0),
    cta_label     TEXT NOT NULL DEFAULT 'Try it!',
    cta_href      TEXT NOT NULL DEFAULT '/child',
    story_theme   TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.words_of_the_day (
    day_of_year       SMALLINT PRIMARY KEY CHECK (day_of_year BETWEEN 1 AND 366),
    word              TEXT NOT NULL,
    part_of_speech    TEXT,
    definition        TEXT NOT NULL,
    example_sentence  TEXT NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 2. PER-CHILD ACTIVITY LEDGER (one row per child per calendar day)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.child_daily_activity (
    child_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    activity_date   DATE NOT NULL,
    last_active_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (child_id, activity_date)
);

CREATE INDEX IF NOT EXISTS idx_child_daily_activity_child_date
    ON public.child_daily_activity (child_id, activity_date DESC);

-- =============================================================================
-- 3. ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.daily_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.words_of_the_day ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_daily_activity ENABLE ROW LEVEL SECURITY;

-- Content is the same for everyone; any signed-in user may read it.
CREATE POLICY daily_goals_select_authenticated
    ON public.daily_goals
    FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY weekly_challenges_select_authenticated
    ON public.weekly_challenges
    FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY words_of_the_day_select_authenticated
    ON public.words_of_the_day
    FOR SELECT
    TO authenticated
    USING (TRUE);

-- The ledger is personal: the child owns it, the linked parent can read it.
-- Writes happen server-side with the service role only.
--
-- This is spelled out inline against public.users / public.parent_child rather
-- than through the private.* helpers from the initial schema: the deployed
-- databases do not have those helpers (only
-- private.authenticated_parent_is_linked_to_child survives), and every live
-- policy on reading_sessions, generated_stories and child_known_words uses this
-- same inline shape. The inline form works both there and on a fresh
-- `supabase db reset`.
CREATE POLICY child_daily_activity_select_child_or_linked_parent
    ON public.child_daily_activity
    FOR SELECT
    TO authenticated
    USING (
        child_id IN (
            SELECT id FROM public.users WHERE auth_id = auth.uid()
        )
        OR child_id IN (
            SELECT pc.child_id
            FROM public.parent_child pc
            WHERE pc.parent_id IN (
                SELECT id FROM public.users WHERE auth_id = auth.uid()
            )
        )
    );

-- =============================================================================
-- 4. GRANTS
-- =============================================================================

GRANT SELECT ON public.daily_goals TO authenticated;
GRANT SELECT ON public.weekly_challenges TO authenticated;
GRANT SELECT ON public.words_of_the_day TO authenticated;
GRANT SELECT ON public.child_daily_activity TO authenticated;

GRANT ALL ON public.daily_goals TO service_role;
GRANT ALL ON public.weekly_challenges TO service_role;
GRANT ALL ON public.words_of_the_day TO service_role;
GRANT ALL ON public.child_daily_activity TO service_role;
