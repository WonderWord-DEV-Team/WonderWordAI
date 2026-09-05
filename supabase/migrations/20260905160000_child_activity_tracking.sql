-- Real activity tracking for the Child Home cards.
--
-- The first cut of these cards inferred progress from reading_sessions and
-- generated_stories. That was wrong: reading_sessions is created when an
-- activity *starts* (and is reused for the whole page visit), and nothing in
-- the child-facing flows ever writes generated_stories, because the story world
-- calls /api/themed-stories/generate which persists nothing. Today's Goal
-- therefore never reflected what the child actually did, and Weekly Challenge
-- had no tracking at all.
--
-- This replaces the inference with an explicit completion event, written by the
-- server when a child actually finishes an activity.

-- =============================================================================
-- 1. THE CHILD'S OWN CALENDAR DAY
-- =============================================================================
-- Streaks and daily goals must roll over at the child's local midnight, not at
-- UTC midnight (which is 21:00 in Brazil, 16:00 US Pacific). The browser
-- reports its IANA zone on first load; the server uses it to resolve "today".

ALTER TABLE public.child_profiles
    ADD COLUMN IF NOT EXISTS timezone TEXT;

COMMENT ON COLUMN public.child_profiles.timezone IS
    'IANA time zone reported by the browser, e.g. America/Sao_Paulo. Used to resolve the child''s local day for streaks and daily goals.';

-- =============================================================================
-- 2. COMPLETION EVENTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.child_activity_events (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    activity_type  TEXT NOT NULL CHECK (
                       activity_type IN ('themed_story', 'read_aloud', 'worksheet')
                   ),
    -- Story world for themed_story ('space', 'dinos', ...); NULL otherwise.
    theme          TEXT,
    -- The child's own calendar day, resolved from their timezone.
    local_date     DATE NOT NULL,
    completed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_child_activity_events_child_date
    ON public.child_activity_events (child_id, local_date DESC);

ALTER TABLE public.child_activity_events ENABLE ROW LEVEL SECURITY;

-- Same inline shape as every other live policy in this database; the private.*
-- helpers from initial_schema.sql do not exist on the deployed projects.
CREATE POLICY child_activity_events_select_child_or_linked_parent
    ON public.child_activity_events
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

GRANT SELECT ON public.child_activity_events TO authenticated;
GRANT ALL ON public.child_activity_events TO service_role;

-- The login ledger is superseded: a streak now means days the child finished
-- something, not days they opened the page.
DROP TABLE IF EXISTS public.child_daily_activity;

-- =============================================================================
-- 3. WEEKLY CHALLENGES BECOME MEASURABLE
-- =============================================================================
-- Two problems with the first version: the XP reward was fiction (no XP exists
-- anywhere in this schema, so the card promised a child something the app could
-- not pay), and the goal was prose only, so nothing could evaluate it. Both are
-- replaced by structured criteria that map onto child_activity_events.
--
-- Challenges may only require activities that are actually tracked. Word
-- Explorer and Word Vision emit no completion signal, so no challenge targets
-- them until they do.

ALTER TABLE public.weekly_challenges
    DROP COLUMN IF EXISTS xp_reward,
    DROP COLUMN IF EXISTS story_theme,
    DROP COLUMN IF EXISTS cta_label,
    DROP COLUMN IF EXISTS cta_href;

ALTER TABLE public.weekly_challenges
    ADD COLUMN IF NOT EXISTS target_type TEXT,
    ADD COLUMN IF NOT EXISTS target_theme TEXT,
    ADD COLUMN IF NOT EXISTS target_count SMALLINT;

-- Reseeded below with the new shape.
TRUNCATE TABLE public.weekly_challenges;

ALTER TABLE public.weekly_challenges
    ALTER COLUMN target_type SET NOT NULL,
    ALTER COLUMN target_count SET NOT NULL,
    ALTER COLUMN target_count SET DEFAULT 1;

ALTER TABLE public.weekly_challenges
    ADD CONSTRAINT weekly_challenges_target_type_check
        CHECK (target_type IN ('themed_story', 'read_aloud', 'worksheet')),
    ADD CONSTRAINT weekly_challenges_target_count_check
        CHECK (target_count BETWEEN 1 AND 10),
    -- Only story challenges can pin a world.
    ADD CONSTRAINT weekly_challenges_theme_only_for_stories
        CHECK (target_theme IS NULL OR target_type = 'themed_story');

INSERT INTO public.weekly_challenges (week_of_year, title, description, target_type, target_theme, target_count)
VALUES
    (1,  'Space Cadet',       'Finish 1 Space story from start to finish.',        'themed_story', 'space',      1),
    (2,  'Read Aloud Start',  'Read aloud with Wonder 2 times this week.',         'read_aloud',   NULL,         2),
    (3,  'Dino Discovery',    'Finish 1 Dinos story from start to finish.',        'themed_story', 'dinos',      1),
    (4,  'Read Aloud Star',   'Read aloud with Wonder 3 times this week.',         'read_aloud',   NULL,         3),
    (5,  'Fairy Tale Quest',  'Finish 1 Fairy Tale story from start to finish.',   'themed_story', 'fairy tale', 1),
    (6,  'Homework Hero',     'Turn 1 worksheet into a story and read it.',        'worksheet',    NULL,         1),
    (7,  'Hero Training',     'Finish 2 Heroes stories this week.',                'themed_story', 'heroes',     2),
    (8,  'Tasty Words',       'Finish 1 Food story from start to finish.',         'themed_story', 'food',       1),
    (9,  'Animal Friends',    'Finish 1 Animals story from start to finish.',      'themed_story', 'animals',    1),
    (10, 'Smooth Reader',     'Read aloud with Wonder 3 times this week.',         'read_aloud',   NULL,         3),
    (11, 'Rocket Words',      'Finish 2 Space stories this week.',                 'themed_story', 'space',      2),
    (12, 'Worksheet Week',    'Turn 2 worksheets into stories and read them.',     'worksheet',    NULL,         2),
    (13, 'Dino Double',       'Finish 2 Dinos stories this week.',                 'themed_story', 'dinos',      2),
    (14, 'Story Explorer',    'Finish 2 stories from any world.',                  'themed_story', NULL,         2),
    (15, 'Castle Climb',      'Finish 2 Fairy Tale stories this week.',            'themed_story', 'fairy tale', 2),
    (16, 'Brave Voice',       'Read aloud with Wonder 2 times this week.',         'read_aloud',   NULL,         2),
    (17, 'Super Squad',       'Finish 2 Heroes stories this week.',                'themed_story', 'heroes',     2),
    (18, 'Snack-Size Story',  'Finish 1 Food story from start to finish.',         'themed_story', 'food',       1),
    (19, 'Safari Reader',     'Finish 2 Animals stories this week.',               'themed_story', 'animals',    2),
    (20, 'Sound Sleuth',      'Read aloud with Wonder 3 times this week.',         'read_aloud',   NULL,         3),
    (21, 'Moon Landing',      'Finish 1 Space story from start to finish.',        'themed_story', 'space',      1),
    (22, 'Story Marathon',    'Finish 3 stories from any world.',                  'themed_story', NULL,         3),
    (23, 'Fossil Finder',     'Finish 1 Dinos story from start to finish.',        'themed_story', 'dinos',      1),
    (24, 'Paper to Story',    'Turn 1 worksheet into a story and read it.',        'worksheet',    NULL,         1),
    (25, 'Magic Words',       'Finish 1 Fairy Tale story from start to finish.',   'themed_story', 'fairy tale', 1),
    (26, 'Halfway Hero',      'Read aloud with Wonder 4 times this week.',         'read_aloud',   NULL,         4),
    (27, 'Summer Stories',    'Finish 2 stories from any world.',                  'themed_story', NULL,         2),
    (28, 'Recipe Reading',    'Finish 2 Food stories this week.',                  'themed_story', 'food',       2),
    (29, 'Jungle Journey',    'Finish 1 Animals story from start to finish.',      'themed_story', 'animals',    1),
    (30, 'Star Gazer',        'Finish 2 Space stories this week.',                 'themed_story', 'space',      2),
    (31, 'Homework Helper',   'Turn 2 worksheets into stories and read them.',     'worksheet',    NULL,         2),
    (32, 'Loud and Clear',    'Read aloud with Wonder 3 times this week.',         'read_aloud',   NULL,         3),
    (33, 'Dino Detective',    'Finish 1 Dinos story from start to finish.',        'themed_story', 'dinos',      1),
    (34, 'Back to Books',     'Finish 3 stories from any world.',                  'themed_story', NULL,         3),
    (35, 'Hero Handbook',     'Finish 1 Heroes story from start to finish.',       'themed_story', 'heroes',     1),
    (36, 'Kitchen Tales',     'Finish 1 Food story from start to finish.',         'themed_story', 'food',       1),
    (37, 'Autumn Animals',    'Finish 2 Animals stories this week.',               'themed_story', 'animals',    2),
    (38, 'Worksheet Wizard',  'Turn 1 worksheet into a story and read it.',        'worksheet',    NULL,         1),
    (39, 'Fairy Finale',      'Finish 1 Fairy Tale story from start to finish.',   'themed_story', 'fairy tale', 1),
    (40, 'Reading Streak',    'Read aloud with Wonder 5 times this week.',         'read_aloud',   NULL,         5),
    (41, 'Galaxy Gang',       'Finish 2 Space stories this week.',                 'themed_story', 'space',      2),
    (42, 'World Tour',        'Finish 3 stories from any world.',                  'themed_story', NULL,         3),
    (43, 'Hero Marathon',     'Finish 2 Heroes stories this week.',                'themed_story', 'heroes',     2),
    (44, 'Spooky Sounds',     'Read aloud with Wonder 3 times this week.',         'read_aloud',   NULL,         3),
    (45, 'Dino Dash',         'Finish 1 Dinos story from start to finish.',        'themed_story', 'dinos',      1),
    (46, 'Paper Trail',       'Turn 2 worksheets into stories and read them.',     'worksheet',    NULL,         2),
    (47, 'Thankful Tales',    'Finish 1 Food story from start to finish.',         'themed_story', 'food',       1),
    (48, 'Winter Wildlife',   'Finish 1 Animals story from start to finish.',      'themed_story', 'animals',    1),
    (49, 'Reading Party',     'Read aloud with Wonder 4 times this week.',         'read_aloud',   NULL,         4),
    (50, 'Snow Story',        'Finish 1 Fairy Tale story from start to finish.',   'themed_story', 'fairy tale', 1),
    (51, 'Holiday Heroes',    'Finish 2 Heroes stories this week.',                'themed_story', 'heroes',     2),
    (52, 'Year-End Voyage',   'Finish 3 stories from any world.',                  'themed_story', NULL,         3),
    (53, 'Bonus Blast Off',   'Finish 1 Space story from start to finish.',        'themed_story', 'space',      1);
