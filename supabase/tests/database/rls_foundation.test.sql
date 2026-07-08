BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

GRANT USAGE ON SCHEMA extensions TO authenticated, anon, supabase_auth_admin;

SELECT plan(18);

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
VALUES
    (
        '00000000-0000-0000-0000-000000000101',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'child-one@example.test',
        'not-used',
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{}',
        NOW(),
        NOW()
    ),
    (
        '00000000-0000-0000-0000-000000000102',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'child-two@example.test',
        'not-used',
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{}',
        NOW(),
        NOW()
    ),
    (
        '00000000-0000-0000-0000-000000000201',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'parent-linked@example.test',
        'not-used',
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{}',
        NOW(),
        NOW()
    ),
    (
        '00000000-0000-0000-0000-000000000202',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'parent-unrelated@example.test',
        'not-used',
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{}',
        NOW(),
        NOW()
    );

INSERT INTO public.users (id, auth_id, email, role)
VALUES
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', 'child-one@example.test', 'CHILD'),
    ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000102', 'child-two@example.test', 'CHILD'),
    ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000201', 'parent-linked@example.test', 'PARENT'),
    ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000202', 'parent-unrelated@example.test', 'PARENT');

INSERT INTO public.child_profiles (id, child_id, name, grade)
VALUES
    ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Child One', 2),
    ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Child Two', 3);

INSERT INTO public.parent_child (parent_id, child_id)
VALUES ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001');

INSERT INTO public.reading_sessions (id, child_id, total_words, correct_words)
VALUES
    ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 5, 4),
    ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 6, 5);

INSERT INTO public.reading_events (
    id,
    session_id,
    child_id,
    word,
    expected_phonemes,
    actual_phonemes,
    phonics_category,
    similarity_score,
    is_correct
)
VALUES
    (
        '50000000-0000-0000-0000-000000000001',
        '40000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001',
        'shark',
        'SH AH R K',
        'S AH R K',
        'sh-digraph',
        0.62,
        FALSE
    ),
    (
        '50000000-0000-0000-0000-000000000002',
        '40000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002',
        'cake',
        'K EY K',
        'K EY K',
        'long-a',
        0.95,
        TRUE
    );

INSERT INTO public.child_known_words (id, child_id, words)
VALUES
    ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '["the","and"]'),
    ('60000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '["cake"]');

INSERT INTO public.generated_stories (id, child_id, word, story_text, phonics_category)
VALUES
    ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'shark', 'A shark swims.', 'sh-digraph'),
    ('70000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'cake', 'A cake bakes.', 'long-a');

INSERT INTO public.story_interactions (id, child_id, story_id, action)
VALUES
    (
        '80000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001',
        '70000000-0000-0000-0000-000000000001',
        'view'
    ),
    (
        '80000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002',
        '70000000-0000-0000-0000-000000000002',
        'listen'
    );

INSERT INTO public.generated_reports (
    id,
    child_id,
    narrative_text,
    cycle_start,
    cycle_end
)
VALUES
    (
        '90000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001',
        'Child One practiced SH sounds.',
        NOW() - INTERVAL '7 days',
        NOW()
    ),
    (
        '90000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002',
        'Child Two practiced long A sounds.',
        NOW() - INTERVAL '7 days',
        NOW()
    );

INSERT INTO public.phonics_knowledge (id, category, text, example_words, phonics_rule)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'sh-digraph',
    'SH sound',
    ARRAY['ship', 'shark'],
    'S and H together make the SH sound.'
);

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

SELECT is(
    (SELECT COUNT(*)::INTEGER FROM public.users),
    1,
    'child can read own public.users row'
);

SELECT is(
    (SELECT COUNT(*)::INTEGER FROM public.child_profiles),
    1,
    'child reads only own child profile'
);

SELECT is(
    (SELECT COUNT(*)::INTEGER FROM public.reading_sessions),
    1,
    'child reads own reading sessions and not another child sessions'
);

SELECT is(
    (SELECT COUNT(*)::INTEGER FROM public.reading_events),
    1,
    'child reads own reading events and not another child events'
);

SELECT is(
    (SELECT COUNT(*)::INTEGER FROM public.child_known_words),
    1,
    'child reads own known words'
);

SELECT is(
    (SELECT COUNT(*)::INTEGER FROM public.generated_stories),
    1,
    'child reads own generated stories'
);

SELECT is(
    (SELECT COUNT(*)::INTEGER FROM public.story_interactions),
    1,
    'child reads own story interactions'
);

SELECT is(
    (SELECT COUNT(*)::INTEGER FROM public.generated_reports),
    1,
    'child reads own generated reports'
);

SELECT lives_ok(
    $$INSERT INTO public.reading_sessions (child_id, total_words, correct_words)
      VALUES ('10000000-0000-0000-0000-000000000001', 1, 1)$$,
    'child can create own reading session'
);

RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000201', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

SELECT is(
    (SELECT COUNT(*)::INTEGER FROM public.reading_sessions),
    2,
    'linked parent reads linked child reading sessions including child-created test session'
);

SELECT throws_ok(
    $$INSERT INTO public.reading_sessions (child_id, total_words, correct_words)
      VALUES ('10000000-0000-0000-0000-000000000001', 1, 1)$$,
    '42501',
    'new row violates row-level security policy for table "reading_sessions"',
    'parent cannot create a child reading session'
);

SELECT is(
    (
        SELECT (
            (SELECT COUNT(*) FROM public.phonics_knowledge) > 0
            AND (SELECT COUNT(*) FROM public.activity_recommendations) > 0
        )
    ),
    TRUE,
    'lookup tables are readable by authenticated users'
);

RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000202', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

SELECT is(
    (SELECT COUNT(*)::INTEGER FROM public.reading_sessions),
    0,
    'unrelated parent cannot read child reading sessions'
);

RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claim.role', 'anon', true);
SET LOCAL ROLE anon;

SELECT throws_ok(
    $$SELECT COUNT(*) FROM public.child_profiles$$,
    '42501',
    'permission denied for table child_profiles',
    'anonymous users receive no private child profile data'
);

RESET ROLE;

SELECT is(
    public.custom_access_token_hook(
        jsonb_build_object(
            'user_id', '00000000-0000-0000-0000-000000000101',
            'claims', jsonb_build_object(
                'role', 'authenticated',
                'sub', '00000000-0000-0000-0000-000000000101'
            )
        )
    ) #>> '{claims,user_role}',
    'CHILD',
    'custom_access_token_hook returns the application user_role claim'
);

SELECT is(
    public.custom_access_token_hook(
        jsonb_build_object(
            'user_id', '00000000-0000-0000-0000-000000000201',
            'claims', jsonb_build_object(
                'role', 'authenticated',
                'sub', '00000000-0000-0000-0000-000000000201'
            )
        )
    ) #>> '{claims,user_role}',
    'PARENT',
    'custom_access_token_hook returns the parent application user_role claim'
);

SELECT is(
    public.custom_access_token_hook(
        jsonb_build_object(
            'user_id', '00000000-0000-0000-0000-000000000999',
            'claims', jsonb_build_object(
                'role', 'authenticated',
                'sub', '00000000-0000-0000-0000-000000000999',
                'user_role', 'PARENT'
            )
        )
    ) #> '{claims,user_role}',
    NULL::jsonb,
    'custom_access_token_hook removes user_role when there is no application profile'
);

SELECT is(
    public.custom_access_token_hook(
        jsonb_build_object(
            'user_id', '00000000-0000-0000-0000-000000000101',
            'claims', jsonb_build_object(
                'role', 'authenticated',
                'sub', '00000000-0000-0000-0000-000000000101'
            )
        )
    ) #>> '{claims,role}',
    'authenticated',
    'custom_access_token_hook preserves the standard JWT role claim'
);

RESET ROLE;

SELECT *
FROM finish();

ROLLBACK;
