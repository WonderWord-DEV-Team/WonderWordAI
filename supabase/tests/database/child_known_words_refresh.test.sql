BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

SELECT * FROM no_plan();

TRUNCATE TABLE
    public.story_interactions,
    public.generated_reports,
    public.generated_stories,
    public.child_known_words,
    public.reading_events,
    public.reading_sessions,
    public.parent_child,
    public.child_profiles,
    public.ai_usage_log,
    public.phonics_knowledge,
    public.users
CASCADE;

TRUNCATE TABLE auth.users CASCADE;

SELECT is(public.normalize_reading_word('TREE!'), 'tree', 'normalizes uppercase and trailing punctuation');
SELECT is(public.normalize_reading_word('  Cat  '), 'cat', 'trims surrounding whitespace');
SELECT is(public.normalize_reading_word('cat.'), 'cat', 'strips trailing punctuation');
SELECT is(public.normalize_reading_word('"cat"'), 'cat', 'strips quotation marks');
SELECT is(public.normalize_reading_word('isn’t'), 'isn''t', 'normalizes unicode apostrophe');
SELECT is(public.normalize_reading_word('!!!'), NULL::TEXT, 'rejects punctuation-only token');
SELECT is(public.normalize_reading_word('a'), 'a', 'keeps valid single-letter a');
SELECT is(public.normalize_reading_word('I'), 'i', 'keeps valid single-letter I');
SELECT is(public.normalize_reading_word('can''t'), 'can''t', 'preserves contractions');
SELECT is(public.normalize_reading_word('dog''s'), 'dog''s', 'preserves possessives');
SELECT is(public.normalize_reading_word('well-known'), 'well-known', 'preserves hyphenated words');
SELECT is(public.normalize_reading_word('12345'), NULL::TEXT, 'rejects numeric-only token');
SELECT is(public.normalize_reading_word('--cat--'), 'cat', 'strips leading and trailing dashes');
SELECT is(public.normalize_reading_word('well - known'), 'well-known', 'collapses whitespace around hyphens');
SELECT is(public.normalize_reading_word('ice cream'), NULL::TEXT, 'rejects multiword OCR noise without splitting');

INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
)
SELECT
    auth_id,
    '00000000-0000-0000-0000-000000000000'::UUID,
    'authenticated',
    'authenticated',
    email,
    'not-used',
    NOW(),
    '{"provider":"email","providers":["email"]}'::JSONB,
    '{}'::JSONB,
    NOW(),
    NOW()
FROM (
    VALUES
        ('00000000-0000-0000-0000-000000001001'::UUID, 'child-one@example.test'),
        ('00000000-0000-0000-0000-000000001002'::UUID, 'child-two@example.test'),
        ('00000000-0000-0000-0000-000000001003'::UUID, 'child-no-mastered@example.test'),
        ('00000000-0000-0000-0000-000000001004'::UUID, 'child-stale@example.test'),
        ('00000000-0000-0000-0000-000000001005'::UUID, 'child-no-history@example.test'),
        ('00000000-0000-0000-0000-000000001006'::UUID, 'child-cap@example.test'),
        ('00000000-0000-0000-0000-000000002001'::UUID, 'parent-linked@example.test'),
        ('00000000-0000-0000-0000-000000002002'::UUID, 'parent-unrelated@example.test')
) AS fixture(auth_id, email);

INSERT INTO public.users (id, auth_id, email, role)
VALUES
    ('10000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000001001', 'child-one@example.test', 'CHILD'),
    ('10000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000001002', 'child-two@example.test', 'CHILD'),
    ('10000000-0000-0000-0000-000000001003', '00000000-0000-0000-0000-000000001003', 'child-no-mastered@example.test', 'CHILD'),
    ('10000000-0000-0000-0000-000000001004', '00000000-0000-0000-0000-000000001004', 'child-stale@example.test', 'CHILD'),
    ('10000000-0000-0000-0000-000000001005', '00000000-0000-0000-0000-000000001005', 'child-no-history@example.test', 'CHILD'),
    ('10000000-0000-0000-0000-000000001006', '00000000-0000-0000-0000-000000001006', 'child-cap@example.test', 'CHILD'),
    ('20000000-0000-0000-0000-000000002001', '00000000-0000-0000-0000-000000002001', 'parent-linked@example.test', 'PARENT'),
    ('20000000-0000-0000-0000-000000002002', '00000000-0000-0000-0000-000000002002', 'parent-unrelated@example.test', 'PARENT');

INSERT INTO public.child_profiles (child_id, name, grade)
VALUES
    ('10000000-0000-0000-0000-000000001001', 'Child One', 2),
    ('10000000-0000-0000-0000-000000001002', 'Child Two', 2),
    ('10000000-0000-0000-0000-000000001003', 'Child No Mastered', 2),
    ('10000000-0000-0000-0000-000000001004', 'Child Stale', 2),
    ('10000000-0000-0000-0000-000000001005', 'Child No History', 2),
    ('10000000-0000-0000-0000-000000001006', 'Child Cap', 2);

INSERT INTO public.parent_child (parent_id, child_id)
VALUES ('20000000-0000-0000-0000-000000002001', '10000000-0000-0000-0000-000000001001');

INSERT INTO public.reading_sessions (id, child_id)
VALUES
    ('40000000-0000-0000-0000-000000001001', '10000000-0000-0000-0000-000000001001'),
    ('40000000-0000-0000-0000-000000001002', '10000000-0000-0000-0000-000000001002'),
    ('40000000-0000-0000-0000-000000001003', '10000000-0000-0000-0000-000000001003'),
    ('40000000-0000-0000-0000-000000001004', '10000000-0000-0000-0000-000000001004'),
    ('40000000-0000-0000-0000-000000001006', '10000000-0000-0000-0000-000000001006');

INSERT INTO public.child_known_words (child_id, words)
VALUES
    ('10000000-0000-0000-0000-000000001001', '["old-stale","the"]'),
    ('10000000-0000-0000-0000-000000001004', '["stale"]');

WITH reference_clock AS (
    SELECT '2026-07-29 12:00:00+00'::TIMESTAMPTZ AS reference_time
),
attempts AS (
    SELECT * FROM (
        VALUES
            ('10000000-0000-0000-0000-000000001001'::UUID, '40000000-0000-0000-0000-000000001001'::UUID, 'oneone', 1, 1, INTERVAL '1 day'),
            ('10000000-0000-0000-0000-000000001001', '40000000-0000-0000-0000-000000001001', 'twotwo', 2, 2, INTERVAL '2 days'),
            ('10000000-0000-0000-0000-000000001001', '40000000-0000-0000-0000-000000001001', 'fourfive', 5, 4, INTERVAL '3 days'),
            ('10000000-0000-0000-0000-000000001001', '40000000-0000-0000-0000-000000001001', 'threefour', 4, 3, INTERVAL '4 days'),
            ('10000000-0000-0000-0000-000000001001', '40000000-0000-0000-0000-000000001001', 'sixtwelve', 12, 6, INTERVAL '5 days'),
            ('10000000-0000-0000-0000-000000001001', '40000000-0000-0000-0000-000000001001', 'sixsix', 6, 6, INTERVAL '6 days'),
            ('10000000-0000-0000-0000-000000001001', '40000000-0000-0000-0000-000000001001', 'edgeword', 2, 2, INTERVAL '30 days'),
            ('10000000-0000-0000-0000-000000001001', '40000000-0000-0000-0000-000000001001', 'oldword', 3, 3, INTERVAL '31 days'),
            ('10000000-0000-0000-0000-000000001002', '40000000-0000-0000-0000-000000001002', 'otherchild', 2, 2, INTERVAL '1 day'),
            ('10000000-0000-0000-0000-000000001003', '40000000-0000-0000-0000-000000001003', 'notyet', 3, 1, INTERVAL '1 day')
    ) AS data(child_id, session_id, word, total_count, correct_count, age)
)
INSERT INTO public.reading_events (
    session_id,
    child_id,
    word,
    expected_phonemes,
    actual_phonemes,
    phonics_category,
    similarity_score,
    is_correct,
    timestamp
)
SELECT
    attempts.session_id,
    attempts.child_id,
    attempts.word,
    'EH',
    'EH',
    'sh-digraph',
    1.0,
    series.n <= attempts.correct_count,
    reference_clock.reference_time - attempts.age
FROM attempts
CROSS JOIN reference_clock
CROSS JOIN LATERAL GENERATE_SERIES(1, attempts.total_count) AS series(n);

SELECT public.refresh_child_known_words_at('2026-07-29 12:00:00+00'::TIMESTAMPTZ);

SELECT is(
    (SELECT words FROM public.child_known_words WHERE child_id = '10000000-0000-0000-0000-000000001001'),
    '["edgeword","fourfive","sixsix","twotwo"]'::JSONB,
    'refresh stores only mastered words in alphabetical order'
);

SELECT isnt(
    (SELECT words FROM public.child_known_words WHERE child_id = '10000000-0000-0000-0000-000000001001') ? 'oneone',
    TRUE,
    '1/1 correct is not mastered despite 100 percent accuracy'
);

SELECT ok(
    (SELECT words FROM public.child_known_words WHERE child_id = '10000000-0000-0000-0000-000000001001') ? 'fourfive',
    '4/5 correct is mastered at inclusive 80 percent accuracy'
);

SELECT isnt(
    (SELECT words FROM public.child_known_words WHERE child_id = '10000000-0000-0000-0000-000000001001') ? 'threefour',
    TRUE,
    '3/4 correct is not mastered'
);

SELECT isnt(
    (SELECT words FROM public.child_known_words WHERE child_id = '10000000-0000-0000-0000-000000001001') ? 'sixtwelve',
    TRUE,
    '6/12 correct is not mastered'
);

SELECT ok(
    (SELECT words FROM public.child_known_words WHERE child_id = '10000000-0000-0000-0000-000000001001') ? 'sixsix',
    '6/6 correct is mastered'
);

SELECT isnt(
    (SELECT words FROM public.child_known_words WHERE child_id = '10000000-0000-0000-0000-000000001001') ? 'oldword',
    TRUE,
    'events older than 30 days do not count'
);

SELECT ok(
    (SELECT words FROM public.child_known_words WHERE child_id = '10000000-0000-0000-0000-000000001001') ? 'edgeword',
    'events exactly at the 30-day cutoff count'
);

SELECT is(
    (SELECT words FROM public.child_known_words WHERE child_id = '10000000-0000-0000-0000-000000001002'),
    '["otherchild"]'::JSONB,
    'multiple children are isolated'
);

SELECT is(
    (SELECT words FROM public.child_known_words WHERE child_id = '10000000-0000-0000-0000-000000001003'),
    '[]'::JSONB,
    'child with recent attempts but no mastered words gets an empty derived list'
);

SELECT is(
    (SELECT words FROM public.child_known_words WHERE child_id = '10000000-0000-0000-0000-000000001004'),
    '[]'::JSONB,
    'existing stale known-word row is emptied when attempts age out'
);

SELECT is(
    (SELECT COUNT(*)::INTEGER FROM public.child_known_words WHERE child_id = '10000000-0000-0000-0000-000000001005'),
    0,
    'child with no history and no existing row is not created unnecessarily'
);

SELECT col_not_null('public', 'reading_events', 'is_correct', 'reading_events.is_correct is currently not nullable');

SELECT public.refresh_child_known_words_at('2026-07-29 12:00:00+00'::TIMESTAMPTZ);

SELECT is(
    (SELECT COUNT(*)::INTEGER FROM public.child_known_words WHERE child_id = '10000000-0000-0000-0000-000000001001'),
    1,
    'refresh is idempotent and does not duplicate child rows'
);

SELECT is(
    (
        SELECT COUNT(*)::INTEGER
        FROM JSONB_ARRAY_ELEMENTS_TEXT(
            (SELECT words FROM public.child_known_words WHERE child_id = '10000000-0000-0000-0000-000000001001')
        ) AS word
    ),
    (
        SELECT COUNT(DISTINCT word)::INTEGER
        FROM JSONB_ARRAY_ELEMENTS_TEXT(
            (SELECT words FROM public.child_known_words WHERE child_id = '10000000-0000-0000-0000-000000001001')
        ) AS word
    ),
    'refresh stores no duplicate array entries'
);

INSERT INTO public.reading_events (
    session_id,
    child_id,
    word,
    expected_phonemes,
    actual_phonemes,
    phonics_category,
    similarity_score,
    is_correct,
    timestamp
)
VALUES
    ('40000000-0000-0000-0000-000000001001', '10000000-0000-0000-0000-000000001001', 'twotwo', 'EH', 'AH', 'sh-digraph', 0.2, FALSE, '2026-07-29 12:00:00+00');

SELECT public.refresh_child_known_words_at('2026-07-29 12:00:00+00'::TIMESTAMPTZ);

SELECT isnt(
    (SELECT words FROM public.child_known_words WHERE child_id = '10000000-0000-0000-0000-000000001001') ? 'twotwo',
    TRUE,
    'recent incorrect attempt can remove a previously mastered rolling-window word'
);

WITH generated_words AS (
    SELECT
        n,
        'cap'
            || CHR(97 + ((n - 1) / 26)::INTEGER)
            || CHR(97 + ((n - 1) % 26)::INTEGER) AS word
    FROM GENERATE_SERIES(1, 501) AS series(n)
),
inserted AS (
    INSERT INTO public.reading_events (
        session_id,
        child_id,
        word,
        expected_phonemes,
        actual_phonemes,
        phonics_category,
        similarity_score,
        is_correct,
        timestamp
    )
    SELECT
        '40000000-0000-0000-0000-000000001006',
        '10000000-0000-0000-0000-000000001006',
        generated_words.word,
        'EH',
        'EH',
        'sh-digraph',
        1.0,
        TRUE,
        '2026-07-29 12:00:00+00'::TIMESTAMPTZ - (generated_words.n || ' seconds')::INTERVAL
    FROM generated_words
    CROSS JOIN GENERATE_SERIES(1, 2)
    RETURNING 1
)
SELECT is(COUNT(*)::INTEGER, 1002, 'seeded more than 500 qualifying child words')
FROM inserted;

SELECT public.refresh_child_known_words_at('2026-07-29 12:00:00+00'::TIMESTAMPTZ);

SELECT is(
    JSONB_ARRAY_LENGTH((SELECT words FROM public.child_known_words WHERE child_id = '10000000-0000-0000-0000-000000001006')),
    500,
    'refresh caps personalized known words at 500'
);

SELECT ok(
    (SELECT words FROM public.child_known_words WHERE child_id = '10000000-0000-0000-0000-000000001006') ? 'capaa',
    '500-word cap keeps the most recent qualifying word'
);

SELECT isnt(
    (SELECT words FROM public.child_known_words WHERE child_id = '10000000-0000-0000-0000-000000001006') ? 'captg',
    TRUE,
    '500-word cap excludes the lowest-ranked oldest qualifying word'
);

SELECT is(
    (SELECT words FROM public.child_known_words WHERE child_id = '10000000-0000-0000-0000-000000001006'),
    (
        SELECT JSONB_AGG(word ORDER BY word)
        FROM JSONB_ARRAY_ELEMENTS_TEXT(
            (SELECT words FROM public.child_known_words WHERE child_id = '10000000-0000-0000-0000-000000001006')
        ) AS word
    ),
    'stored capped list is serialized alphabetically after deterministic selection'
);

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000001001', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

SELECT is(
    (SELECT COUNT(*)::INTEGER FROM public.child_known_words),
    1,
    'child reads only their own known-word row'
);

SELECT throws_like(
    $$UPDATE public.child_known_words SET words = '["hack"]'::JSONB WHERE child_id = '10000000-0000-0000-0000-000000001001'$$,
    '%permission denied%',
    'authenticated child cannot directly overwrite derived known words'
);

SELECT throws_like(
    $$SELECT public.refresh_child_known_words()$$,
    '%permission denied%',
    'authenticated child cannot trigger protected refresh function'
);

RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000002001', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

SELECT is(
    (SELECT COUNT(*)::INTEGER FROM public.child_known_words),
    1,
    'linked parent reads linked child known words'
);

RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000002002', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

SELECT is(
    (SELECT COUNT(*)::INTEGER FROM public.child_known_words),
    0,
    'unrelated parent cannot read another child known words'
);

RESET ROLE;

SELECT is(
    (
        SELECT COUNT(*)::INTEGER
        FROM JSONB_ARRAY_ELEMENTS_TEXT(
            (SELECT words FROM public.child_known_words WHERE child_id = '10000000-0000-0000-0000-000000001001')
        ) AS word
        WHERE word IN ('the', 'and', 'away', 'big', 'blue', 'can')
    ),
    0,
    'Dolch fallback words are not copied into child_known_words by refresh'
);

SELECT *
FROM finish();

ROLLBACK;
