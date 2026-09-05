BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

GRANT USAGE ON SCHEMA extensions TO authenticated, anon, supabase_auth_admin;

SELECT plan(13);

TRUNCATE TABLE
    public.child_activity_events,
    public.story_interactions,
    public.generated_reports,
    public.generated_stories,
    public.child_known_words,
    public.reading_events,
    public.reading_sessions,
    public.parent_child,
    public.child_profiles,
    public.users
CASCADE;

TRUNCATE TABLE auth.users CASCADE;

-- ---------------------------------------------------------------------------
-- Seeded content covers a full year
-- ---------------------------------------------------------------------------

SELECT is(
    (SELECT COUNT(*)::INTEGER FROM public.daily_goals),
    366,
    'daily_goals holds one goal per day of the year'
);

SELECT is(
    (SELECT COUNT(*)::INTEGER FROM public.weekly_challenges),
    53,
    'weekly_challenges holds one challenge per ISO week'
);

SELECT is(
    (SELECT COUNT(*)::INTEGER FROM public.words_of_the_day),
    366,
    'words_of_the_day holds one word per day of the year'
);

SELECT is(
    (SELECT COUNT(DISTINCT word)::INTEGER FROM public.words_of_the_day),
    366,
    'every word of the day is distinct'
);

SELECT isnt_empty(
    $$SELECT word FROM public.words_of_the_day
      WHERE day_of_year = EXTRACT(DOY FROM CURRENT_DATE)::SMALLINT$$,
    'today has a word of the day'
);

-- ---------------------------------------------------------------------------
-- Every challenge must be achievable
-- ---------------------------------------------------------------------------
-- A challenge that asks for an activity the app never records can never be
-- completed. The first version shipped 15 of those (Word Explorer / Word
-- Vision), which is how a child could do the work and see no progress.

SELECT is(
    (SELECT COUNT(*)::INTEGER FROM public.weekly_challenges
      WHERE target_type NOT IN ('themed_story', 'read_aloud', 'worksheet')),
    0,
    'no challenge targets an activity type that is never recorded'
);

SELECT is(
    (SELECT COUNT(*)::INTEGER FROM public.weekly_challenges
      WHERE target_theme IS NOT NULL AND target_type <> 'themed_story'),
    0,
    'only story challenges pin a story world'
);

-- ---------------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------------

INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES
    ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'child-one@example.test', 'not-used', NOW(),
     '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'child-two@example.test', 'not-used', NOW(),
     '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'parent-linked@example.test', 'not-used', NOW(),
     '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW());

INSERT INTO public.users (id, auth_id, email, role)
VALUES
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', 'child-one@example.test', 'CHILD'),
    ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000102', 'child-two@example.test', 'CHILD'),
    ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000201', 'parent-linked@example.test', 'PARENT');

INSERT INTO public.child_profiles (id, child_id, name, grade, timezone)
VALUES
    ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Child One', 2, 'America/Sao_Paulo'),
    ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Child Two', 3, NULL);

INSERT INTO public.parent_child (parent_id, child_id)
VALUES ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001');

-- Three days of activity for child one, one unrelated day for child two.
INSERT INTO public.child_activity_events (child_id, activity_type, theme, local_date)
VALUES
    ('10000000-0000-0000-0000-000000000001', 'themed_story', 'food',  CURRENT_DATE),
    ('10000000-0000-0000-0000-000000000001', 'read_aloud',   NULL,    CURRENT_DATE - 1),
    ('10000000-0000-0000-0000-000000000001', 'worksheet',    NULL,    CURRENT_DATE - 2),
    ('10000000-0000-0000-0000-000000000002', 'themed_story', 'space', CURRENT_DATE);

-- ---------------------------------------------------------------------------
-- Child access
-- ---------------------------------------------------------------------------

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

SELECT is(
    (SELECT COUNT(*)::INTEGER FROM public.child_activity_events),
    3,
    'child reads own activity events and not another child events'
);

SELECT is(
    (SELECT COUNT(*)::INTEGER FROM public.daily_goals),
    366,
    'child can read the daily goal catalogue'
);

SELECT is(
    (SELECT COUNT(*)::INTEGER FROM public.weekly_challenges),
    53,
    'child can read the weekly challenge catalogue'
);

SELECT is(
    (SELECT COUNT(*)::INTEGER FROM public.words_of_the_day),
    366,
    'child can read the word of the day catalogue'
);

SELECT throws_ok(
    $$INSERT INTO public.child_activity_events (child_id, activity_type, local_date)
      VALUES ('10000000-0000-0000-0000-000000000001', 'read_aloud', CURRENT_DATE - 5)$$,
    '42501',
    'permission denied for table child_activity_events',
    'child cannot forge its own completions; only the service role writes them'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- Linked parent access
-- ---------------------------------------------------------------------------

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000201', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

SELECT is(
    (SELECT COUNT(*)::INTEGER FROM public.child_activity_events),
    3,
    'linked parent reads the linked child activity events'
);

RESET ROLE;

SELECT * FROM finish();

ROLLBACK;
