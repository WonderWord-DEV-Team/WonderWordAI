-- WonderWord AI canonical database foundation.
-- Apply locally with `npx supabase db reset`.

-- =============================================================================
-- 0. EXTENSIONS AND SCHEMAS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;
REVOKE ALL ON SCHEMA private FROM authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

-- =============================================================================
-- 1. ENUMS
-- =============================================================================

DO $$
BEGIN
  CREATE TYPE public.user_role AS ENUM ('CHILD', 'PARENT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- =============================================================================
-- 2. CORE USER TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.users (
    id          UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    auth_id     UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT UNIQUE NOT NULL,
    role        public.user_role NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.child_profiles (
    id                      UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    child_id                UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name                    TEXT NOT NULL,
    grade                   INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 5),
    phonetics_focus_areas   TEXT[] DEFAULT '{}',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.parent_child (
    parent_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    child_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (parent_id, child_id),
    CHECK (parent_id <> child_id)
);

-- =============================================================================
-- 3. READING SESSION TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.reading_sessions (
    id              UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    child_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    start_time      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time        TIMESTAMPTZ,
    total_words     INTEGER NOT NULL DEFAULT 0,
    correct_words   INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reading_sessions_child_start
    ON public.reading_sessions (child_id, start_time DESC);

CREATE TABLE IF NOT EXISTS public.reading_events (
    id                  UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    session_id          UUID NOT NULL REFERENCES public.reading_sessions(id) ON DELETE CASCADE,
    child_id            UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    word                TEXT NOT NULL,
    expected_phonemes   TEXT NOT NULL,
    actual_phonemes     TEXT NOT NULL,
    phonics_category    TEXT NOT NULL,
    similarity_score    FLOAT,
    is_correct          BOOLEAN NOT NULL DEFAULT FALSE,
    timestamp           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reading_events_child_timestamp
    ON public.reading_events (child_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_reading_events_child_category
    ON public.reading_events (child_id, phonics_category);

-- =============================================================================
-- 4. PHONICS KNOWLEDGE BASE (RAG)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.phonics_knowledge (
    id              UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    category        TEXT NOT NULL,
    text            TEXT NOT NULL,
    embedding       extensions.vector(384),
    example_words   TEXT[] NOT NULL,
    phonics_rule    TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phonics_knowledge_embedding
    ON public.phonics_knowledge
    USING hnsw (embedding extensions.vector_cosine_ops);

-- =============================================================================
-- 5. VOCABULARY TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.child_known_words (
    id          UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    child_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    words       JSONB NOT NULL DEFAULT '[]',
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (child_id)
);

CREATE INDEX IF NOT EXISTS idx_child_known_words_child
    ON public.child_known_words (child_id);

-- =============================================================================
-- 6. STORY TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.generated_stories (
    id                  UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    child_id            UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    word                TEXT NOT NULL,
    story_text          TEXT NOT NULL,
    image_url           TEXT,
    validation_score    INTEGER,
    phonics_category    TEXT NOT NULL,
    theme               TEXT,
    generated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_stories_child
    ON public.generated_stories (child_id, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_generated_stories_word
    ON public.generated_stories (word);

CREATE TABLE IF NOT EXISTS public.story_interactions (
    id                  UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    child_id            UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    story_id            UUID NOT NULL REFERENCES public.generated_stories(id) ON DELETE CASCADE,
    action              TEXT NOT NULL CHECK (action IN ('view', 'listen', 'read_again', 'practice')),
    duration_seconds    INTEGER,
    clicked_listen      BOOLEAN NOT NULL DEFAULT FALSE,
    clicked_read_again  BOOLEAN NOT NULL DEFAULT FALSE,
    engagement_score    INTEGER,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_story_interactions_child
    ON public.story_interactions (child_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_story_interactions_story
    ON public.story_interactions (story_id);

-- =============================================================================
-- 7. REPORTS, ACTIVITIES, AND SYSTEM LOGS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.generated_reports (
    id                          UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    child_id                    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    narrative_text              TEXT NOT NULL,
    activity_recommendation     JSONB,
    cycle_start                 TIMESTAMPTZ NOT NULL,
    cycle_end                   TIMESTAMPTZ NOT NULL,
    wcpm                        INTEGER,
    wcpm_delta                  INTEGER,
    accuracy_pct                FLOAT,
    top_deficits                JSONB,
    generated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (child_id, cycle_start)
);

CREATE INDEX IF NOT EXISTS idx_generated_reports_child
    ON public.generated_reports (child_id, cycle_end DESC);

CREATE TABLE IF NOT EXISTS public.activity_recommendations (
    id                  UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    phonics_category    TEXT UNIQUE NOT NULL,
    title               TEXT NOT NULL,
    description         TEXT NOT NULL,
    pedagogy            TEXT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_usage_log (
    id                      UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id                 UUID REFERENCES public.users(id) ON DELETE SET NULL,
    model                   TEXT NOT NULL,
    input_tokens            INTEGER NOT NULL DEFAULT 0,
    output_tokens           INTEGER NOT NULL DEFAULT 0,
    cache_creation_tokens   INTEGER NOT NULL DEFAULT 0,
    cache_read_tokens       INTEGER NOT NULL DEFAULT 0,
    estimated_cost_usd      FLOAT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user
    ON public.ai_usage_log (user_id, created_at DESC);

-- =============================================================================
-- 8. AUTH AND RLS HELPER FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION private.current_app_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT u.id
    FROM public.users AS u
    WHERE u.auth_id = auth.uid()
    LIMIT 1
$$;

CREATE OR REPLACE FUNCTION private.current_app_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT u.role
    FROM public.users AS u
    WHERE u.auth_id = auth.uid()
    LIMIT 1
$$;

CREATE OR REPLACE FUNCTION private.authenticated_parent_is_linked_to_child(target_child_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.parent_child AS pc
        JOIN public.users AS parent_user
          ON parent_user.id = pc.parent_id
        WHERE pc.child_id = target_child_id
          AND parent_user.auth_id = auth.uid()
          AND parent_user.role = 'PARENT'::public.user_role
    )
$$;

CREATE OR REPLACE FUNCTION private.reading_session_belongs_to_child(target_session_id UUID, target_child_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.reading_sessions AS rs
        WHERE rs.id = target_session_id
          AND rs.child_id = target_child_id
    )
$$;

CREATE OR REPLACE FUNCTION private.story_belongs_to_child(target_story_id UUID, target_child_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.generated_stories AS gs
        WHERE gs.id = target_story_id
          AND gs.child_id = target_child_id
    )
$$;

REVOKE ALL ON FUNCTION private.current_app_user_id() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.current_app_user_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.authenticated_parent_is_linked_to_child(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.reading_session_belongs_to_child(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.story_belongs_to_child(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.current_app_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_app_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION private.authenticated_parent_is_linked_to_child(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.reading_session_belongs_to_child(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.story_belongs_to_child(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_app_user_id() TO service_role;
GRANT EXECUTE ON FUNCTION private.current_app_user_role() TO service_role;
GRANT EXECUTE ON FUNCTION private.authenticated_parent_is_linked_to_child(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION private.reading_session_belongs_to_child(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION private.story_belongs_to_child(UUID, UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    claims JSONB;
    app_role TEXT;
BEGIN
    claims := COALESCE(event->'claims', '{}'::jsonb);

    SELECT u.role::TEXT
    INTO app_role
    FROM public.users AS u
    WHERE u.auth_id = (event->>'user_id')::UUID
    LIMIT 1;

    IF app_role IS NULL THEN
        claims := claims - 'user_role';
    ELSE
        claims := jsonb_set(claims, '{user_role}', to_jsonb(app_role), true);
    END IF;

    RETURN jsonb_set(event, '{claims}', claims, true);
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_client_role_metadata(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    user_metadata JSONB;
    app_metadata JSONB;
BEGIN
    user_metadata := COALESCE(event #> '{user,user_metadata}', '{}'::jsonb);
    app_metadata := COALESCE(event #> '{user,app_metadata}', '{}'::jsonb);

    IF user_metadata ?| ARRAY['role', 'user_role']
       OR app_metadata ?| ARRAY['role', 'user_role'] THEN
        RETURN jsonb_build_object(
            'error', jsonb_build_object(
                'http_code', 400,
                'message', 'Application roles are assigned by trusted server workflows only.'
            )
        );
    END IF;

    RETURN '{}'::jsonb;
END;
$$;

REVOKE ALL ON FUNCTION public.custom_access_token_hook(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_client_role_metadata(JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(JSONB) TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.reject_client_role_metadata(JSONB) TO supabase_auth_admin;

-- =============================================================================
-- 9. ROW-LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_child ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_known_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phonics_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select_self
    ON public.users
    FOR SELECT
    TO authenticated
    USING (id = private.current_app_user_id());

CREATE POLICY child_profiles_select_child_or_linked_parent
    ON public.child_profiles
    FOR SELECT
    TO authenticated
    USING (
        child_id = private.current_app_user_id()
        OR private.authenticated_parent_is_linked_to_child(child_id)
    );

CREATE POLICY parent_child_select_relevant_relationships
    ON public.parent_child
    FOR SELECT
    TO authenticated
    USING (
        parent_id = private.current_app_user_id()
        OR child_id = private.current_app_user_id()
    );

CREATE POLICY reading_sessions_select_child_or_linked_parent
    ON public.reading_sessions
    FOR SELECT
    TO authenticated
    USING (
        child_id = private.current_app_user_id()
        OR private.authenticated_parent_is_linked_to_child(child_id)
    );

CREATE POLICY reading_sessions_insert_own_child_session
    ON public.reading_sessions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        child_id = private.current_app_user_id()
        AND private.current_app_user_role() = 'CHILD'::public.user_role
    );

CREATE POLICY reading_sessions_update_own_child_session
    ON public.reading_sessions
    FOR UPDATE
    TO authenticated
    USING (
        child_id = private.current_app_user_id()
        AND private.current_app_user_role() = 'CHILD'::public.user_role
    )
    WITH CHECK (
        child_id = private.current_app_user_id()
        AND private.current_app_user_role() = 'CHILD'::public.user_role
    );

CREATE POLICY reading_events_select_child_or_linked_parent
    ON public.reading_events
    FOR SELECT
    TO authenticated
    USING (
        child_id = private.current_app_user_id()
        OR private.authenticated_parent_is_linked_to_child(child_id)
    );

CREATE POLICY reading_events_insert_own_child_event
    ON public.reading_events
    FOR INSERT
    TO authenticated
    WITH CHECK (
        child_id = private.current_app_user_id()
        AND private.current_app_user_role() = 'CHILD'::public.user_role
        AND private.reading_session_belongs_to_child(session_id, child_id)
    );

CREATE POLICY child_known_words_select_child_or_linked_parent
    ON public.child_known_words
    FOR SELECT
    TO authenticated
    USING (
        child_id = private.current_app_user_id()
        OR private.authenticated_parent_is_linked_to_child(child_id)
    );

CREATE POLICY generated_stories_select_child_or_linked_parent
    ON public.generated_stories
    FOR SELECT
    TO authenticated
    USING (
        child_id = private.current_app_user_id()
        OR private.authenticated_parent_is_linked_to_child(child_id)
    );

CREATE POLICY story_interactions_select_child_or_linked_parent
    ON public.story_interactions
    FOR SELECT
    TO authenticated
    USING (
        child_id = private.current_app_user_id()
        OR private.authenticated_parent_is_linked_to_child(child_id)
    );

CREATE POLICY story_interactions_insert_own_child_interaction
    ON public.story_interactions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        child_id = private.current_app_user_id()
        AND private.current_app_user_role() = 'CHILD'::public.user_role
        AND private.story_belongs_to_child(story_id, child_id)
    );

CREATE POLICY generated_reports_select_child_or_linked_parent
    ON public.generated_reports
    FOR SELECT
    TO authenticated
    USING (
        child_id = private.current_app_user_id()
        OR private.authenticated_parent_is_linked_to_child(child_id)
    );

CREATE POLICY phonics_knowledge_select_authenticated
    ON public.phonics_knowledge
    FOR SELECT
    TO authenticated
    USING ((SELECT auth.role()) = 'authenticated');

CREATE POLICY activity_recommendations_select_authenticated
    ON public.activity_recommendations
    FOR SELECT
    TO authenticated
    USING ((SELECT auth.role()) = 'authenticated');

-- =============================================================================
-- 10. TABLE AND FUNCTION PRIVILEGES
-- =============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.child_profiles TO authenticated;
GRANT SELECT ON public.parent_child TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.reading_sessions TO authenticated;
GRANT SELECT, INSERT ON public.reading_events TO authenticated;
GRANT SELECT ON public.child_known_words TO authenticated;
GRANT SELECT ON public.generated_stories TO authenticated;
GRANT SELECT, INSERT ON public.story_interactions TO authenticated;
GRANT SELECT ON public.generated_reports TO authenticated;
GRANT SELECT ON public.phonics_knowledge TO authenticated;
GRANT SELECT ON public.activity_recommendations TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA private TO service_role;
GRANT SELECT (auth_id, role) ON public.users TO supabase_auth_admin;

-- =============================================================================
-- 11. SEED DATA
-- =============================================================================

INSERT INTO public.activity_recommendations (phonics_category, title, description, pedagogy)
VALUES
    (
        'sh-digraph',
        'Silly Shadow Puppets',
        'Turn off the lights and use a flashlight. As shadow animals appear on the wall, the child shouts out SH words (e.g. Shark, Sheep, Shadow) to make them move.',
        'Connects kinetic motor controls with vocal phonetic blending to reinforce pronunciation patterns.'
    ),
    (
        'long-a',
        'The Baking Game',
        'Roll out real dough or playdough. Shape them into words like Cake, Bake, Gate, and say them aloud, stretching out the middle "A" sound like a super-stretchy band.',
        'Tactile manipulation of characters reinforces orthographic mapping in child cognitive centres.'
    ),
    (
        'multisyllabic',
        'Syllable Drumming',
        'Use plastic kitchen bowls as drums. Read a long word from school homework and drum once for every syllable (e.g. Di-no-saur = 3 beats!).',
        'Breaking words into auditory patterns bypasses visual fatigue and proves big words are just small segments stacked.'
    ),
    (
        'sight-words',
        'Flashlight Tag',
        'Tape tricky sight words onto a dark wall. Call out a word, and have the child use a flashlight to locate and tag the target word card as fast as possible.',
        'Encourages rapid visual word recognition, mapping words that cannot be decoded phonetically.'
    ),
    (
        'soft-c',
        'Whisper Circle Detective',
        'Hide soft C cards (e.g. city, circle) around a room. To collect them, the child must whisper-pronounce the soft C sound to keep it secret from imaginary guards.',
        'Gamifying visual letter-sound patterns reduces learning anxiety, building acoustic and semantic memory.'
    )
ON CONFLICT (phonics_category) DO NOTHING;

-- Full Dolch 220 list retained as a curriculum reference for app-side seeding.
DO $$
DECLARE
    dolch_220 TEXT[] := ARRAY[
        'a','and','away','big','blue','can','come','down','find','for',
        'funny','go','help','here','i','in','is','it','jump','little',
        'look','make','me','my','not','one','play','red','run','said',
        'see','the','three','to','two','up','we','where','yellow','you',
        'all','am','are','at','ate','be','black','brown','but','came',
        'did','do','eat','four','get','good','have','he','into','like',
        'must','new','no','now','on','our','out','please','pretty','ran',
        'ride','saw','say','she','so','soon','that','there','they','this',
        'too','under','want','was','well','went','what','white','who','will',
        'with','yes',
        'after','again','an','any','ask','as','by','could','every','fly',
        'from','give','going','had','has','her','him','his','how','just',
        'know','let','live','may','of','old','once','open','over','put',
        'round','some','stop','take','thank','them','think','walk','were','when',
        'your',
        'always','around','because','been','before','best','both','buy','call','cold',
        'does','don''t','fast','first','five','found','gave','goes','green','its',
        'made','many','off','or','pull','read','right','sing','sit','sleep',
        'tell','their','these','those','upon','us','use','very','wash','which',
        'why','wish','work','would','write','if',
        'about','better','bring','carry','clean','cut','done','draw','drink','eight',
        'fall','far','full','got','grow','hold','hot','hurt','if','keep',
        'kind','laugh','light','long','much','myself','never','only','own','pick',
        'seven','shall','show','six','small','start','ten','today','together','try',
        'warm'
    ];
BEGIN
    RAISE NOTICE 'Dolch 220 reference list loaded with % entries for app-side child_known_words seeding.', array_length(dolch_220, 1);
END
$$;

-- =============================================================================
-- 12. RLS-SAFE VIEWS
-- =============================================================================

CREATE OR REPLACE VIEW public.child_reading_summary
WITH (security_invoker = true)
AS
SELECT
    cp.child_id                                 AS child_id,
    cp.name                                     AS child_name,
    cp.grade,
    COUNT(DISTINCT rs.id)                       AS total_sessions,
    COUNT(re.id)                                AS total_words_read,
    ROUND(AVG(CASE WHEN re.is_correct THEN 1.0 ELSE 0.0 END) * 100, 1)
                                                AS accuracy_pct,
    COUNT(CASE WHEN re.is_correct = FALSE THEN 1 END)
                                                AS total_miscues,
    MAX(rs.start_time)                          AS last_session_at
FROM public.child_profiles AS cp
LEFT JOIN public.reading_sessions AS rs
  ON rs.child_id = cp.child_id
LEFT JOIN public.reading_events AS re
  ON re.session_id = rs.id
GROUP BY cp.child_id, cp.name, cp.grade;

CREATE OR REPLACE VIEW public.child_phonics_deficits
WITH (security_invoker = true)
AS
SELECT
    child_id,
    phonics_category,
    COUNT(*)                                    AS miscue_count,
    ROUND(AVG(similarity_score)::NUMERIC, 3)    AS avg_similarity
FROM public.reading_events
WHERE is_correct = FALSE
  AND timestamp >= NOW() - INTERVAL '14 days'
GROUP BY child_id, phonics_category
ORDER BY child_id, miscue_count DESC;

REVOKE ALL ON public.child_reading_summary FROM anon;
REVOKE ALL ON public.child_phonics_deficits FROM anon;
GRANT SELECT ON public.child_reading_summary TO authenticated;
GRANT SELECT ON public.child_phonics_deficits TO authenticated;
