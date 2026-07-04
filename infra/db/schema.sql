-- HEY SUNGJUN LEMME KNOW IF I NEED TO CHANGE ANYTHING
-- HOW TO APPLY:
--   1. Go to Supabase Dashboard → SQL Editor
--   2. Paste this entire file and run
--   3. Repeat for dev and staging projects separately
--
-- DEPENDENCIES:
--   - pgvector extension must be enabled (handled below)
--   - Supabase Auth must be enabled in the project settings
-- =============================================================================


-- =============================================================================
-- 0. EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;


-- =============================================================================
-- 1. ENUMS
-- =============================================================================

CREATE TYPE user_role AS ENUM ('CHILD', 'PARENT');


-- =============================================================================
-- 2. CORE USER TABLES
-- =============================================================================

-- Users (mirrors Supabase Auth — do not store passwords here)
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id     UUID UNIQUE NOT NULL,   -- references auth.users.id
    email       TEXT UNIQUE NOT NULL,
    role        user_role NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Child profiles
CREATE TABLE IF NOT EXISTS child_profiles (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id                UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name                    TEXT NOT NULL,
    grade                   INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 5),
    phonetics_focus_areas   TEXT[] DEFAULT '{}',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Parent ↔ Child relationship
CREATE TABLE IF NOT EXISTS parent_child (
    parent_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    child_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (parent_id, child_id)
);


-- =============================================================================
-- 3. READING SESSION TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS reading_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_time      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time        TIMESTAMPTZ,
    total_words     INTEGER NOT NULL DEFAULT 0,
    correct_words   INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reading_sessions_child_start
    ON reading_sessions (child_id, start_time DESC);

-- Individual word-level reading events
CREATE TABLE IF NOT EXISTS reading_events (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id          UUID NOT NULL REFERENCES reading_sessions(id) ON DELETE CASCADE,
    child_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    word                TEXT NOT NULL,
    expected_phonemes   TEXT NOT NULL,   -- ARPAbet, e.g. "SH AH R K"
    actual_phonemes     TEXT NOT NULL,   -- ARPAbet, e.g. "S AH R K"
    phonics_category    TEXT NOT NULL,   -- e.g. "sh-digraph"
    similarity_score    FLOAT,           -- Wav2Vec2 score 0.0–1.0
    is_correct          BOOLEAN NOT NULL DEFAULT FALSE,
    timestamp           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reading_events_child_timestamp
    ON reading_events (child_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_reading_events_child_category
    ON reading_events (child_id, phonics_category);


-- =============================================================================
-- 4. PHONICS KNOWLEDGE BASE (RAG)
-- =============================================================================

CREATE TABLE IF NOT EXISTS phonics_knowledge (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category        TEXT NOT NULL,          -- e.g. "sh-digraph"
    text            TEXT NOT NULL,          -- full text used for embedding
    embedding       vector(384),            -- all-MiniLM-L6-v2 output
    example_words   TEXT[] NOT NULL,
    phonics_rule    TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HNSW index for fast approximate nearest-neighbour search
CREATE INDEX IF NOT EXISTS idx_phonics_knowledge_embedding
    ON phonics_knowledge
    USING hnsw (embedding vector_cosine_ops);


-- =============================================================================
-- 5. VOCABULARY TABLES
-- =============================================================================

-- Per-child known words list (refreshed nightly from reading_events)
-- Phase 1: seeded with Dolch 220 for all children
-- Phase 2: personalised per child after 2+ correct readings
CREATE TABLE IF NOT EXISTS child_known_words (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    words       JSONB NOT NULL DEFAULT '[]',    -- array of known word strings
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (child_id)
);

CREATE INDEX IF NOT EXISTS idx_child_known_words_child
    ON child_known_words (child_id);


-- =============================================================================
-- 6. STORY TABLES
-- =============================================================================

-- All AI-generated stories (stored for reuse + auditing)
CREATE TABLE IF NOT EXISTS generated_stories (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    word                TEXT NOT NULL,
    story_text          TEXT NOT NULL,
    image_url           TEXT,               -- Unsplash URL or Supabase Storage path
    validation_score    INTEGER,            -- 0–100 from /validate-story
    phonics_category    TEXT NOT NULL,
    theme               TEXT,
    generated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_stories_child
    ON generated_stories (child_id, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_generated_stories_word
    ON generated_stories (word);

-- Tracks how a child interacts with each story
CREATE TABLE IF NOT EXISTS story_interactions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    story_id            UUID NOT NULL REFERENCES generated_stories(id) ON DELETE CASCADE,
    action              TEXT NOT NULL CHECK (action IN ('view', 'listen', 'read_again', 'practice')),
    duration_seconds    INTEGER,
    clicked_listen      BOOLEAN NOT NULL DEFAULT FALSE,
    clicked_read_again  BOOLEAN NOT NULL DEFAULT FALSE,
    engagement_score    INTEGER,            -- computed metric 0–100
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_story_interactions_child
    ON story_interactions (child_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_story_interactions_story
    ON story_interactions (story_id);


-- =============================================================================
-- 7. REPORTS & ACTIVITIES
-- =============================================================================

CREATE TABLE IF NOT EXISTS generated_reports (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id                    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    narrative_text              TEXT NOT NULL,
    activity_recommendation     JSONB,          -- {title, description, pedagogy}
    cycle_start                 TIMESTAMPTZ NOT NULL,
    cycle_end                   TIMESTAMPTZ NOT NULL,
    wcpm                        INTEGER,        -- words correct per minute
    wcpm_delta                  INTEGER,        -- vs previous cycle
    accuracy_pct                FLOAT,
    top_deficits                JSONB,          -- [{category, mastery_pct}, ...]
    generated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (child_id, cycle_start)
);

CREATE INDEX IF NOT EXISTS idx_generated_reports_child
    ON generated_reports (child_id, cycle_end DESC);

-- Playful Practice activity catalogue
-- Seeded below with all 5 PRD entries
CREATE TABLE IF NOT EXISTS activity_recommendations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phonics_category    TEXT UNIQUE NOT NULL,
    title               TEXT NOT NULL,
    description         TEXT NOT NULL,
    pedagogy            TEXT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI usage log (flat, no alerting logic for MVP)
CREATE TABLE IF NOT EXISTS ai_usage_log (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID REFERENCES users(id) ON DELETE SET NULL,
    model                   TEXT NOT NULL,          -- e.g. "claude-sonnet-4-6"
    input_tokens            INTEGER NOT NULL DEFAULT 0,
    output_tokens           INTEGER NOT NULL DEFAULT 0,
    cache_creation_tokens   INTEGER NOT NULL DEFAULT 0,
    cache_read_tokens       INTEGER NOT NULL DEFAULT 0,
    estimated_cost_usd      FLOAT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user
    ON ai_usage_log (user_id, created_at DESC);


-- =============================================================================
-- 8. ROW-LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE users                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_child            ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_known_words       ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_stories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_interactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_reports       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_log            ENABLE ROW LEVEL SECURITY;
ALTER TABLE phonics_knowledge       ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_recommendations ENABLE ROW LEVEL SECURITY;

-- ── users ────────────────────────────────────────────────────────────────────
-- Each user can only read their own row
CREATE POLICY users_select_self ON users
    FOR SELECT USING (auth.uid() = auth_id);

-- ── child_profiles ────────────────────────────────────────────────────────────
-- Child sees own profile; parent sees linked children's profiles
CREATE POLICY child_profiles_select ON child_profiles
    FOR SELECT USING (
        child_id IN (
            SELECT id FROM users WHERE auth_id = auth.uid()
        )
        OR
        child_id IN (
            SELECT child_id FROM parent_child
            WHERE parent_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        )
    );

-- ── reading_sessions ──────────────────────────────────────────────────────────
CREATE POLICY reading_sessions_select ON reading_sessions
    FOR SELECT USING (
        child_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
        OR
        child_id IN (
            SELECT child_id FROM parent_child
            WHERE parent_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        )
    );

-- Only the child can insert/update their own sessions
CREATE POLICY reading_sessions_insert ON reading_sessions
    FOR INSERT WITH CHECK (
        child_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    );

-- ── reading_events ────────────────────────────────────────────────────────────
CREATE POLICY reading_events_select ON reading_events
    FOR SELECT USING (
        child_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
        OR
        child_id IN (
            SELECT child_id FROM parent_child
            WHERE parent_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        )
    );

CREATE POLICY reading_events_insert ON reading_events
    FOR INSERT WITH CHECK (
        child_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    );

-- ── child_known_words ─────────────────────────────────────────────────────────
CREATE POLICY child_known_words_select ON child_known_words
    FOR SELECT USING (
        child_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
        OR
        child_id IN (
            SELECT child_id FROM parent_child
            WHERE parent_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        )
    );

-- ── generated_stories ─────────────────────────────────────────────────────────
CREATE POLICY generated_stories_select ON generated_stories
    FOR SELECT USING (
        child_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
        OR
        child_id IN (
            SELECT child_id FROM parent_child
            WHERE parent_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        )
    );

-- ── story_interactions ────────────────────────────────────────────────────────
CREATE POLICY story_interactions_select ON story_interactions
    FOR SELECT USING (
        child_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
        OR
        child_id IN (
            SELECT child_id FROM parent_child
            WHERE parent_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        )
    );

CREATE POLICY story_interactions_insert ON story_interactions
    FOR INSERT WITH CHECK (
        child_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    );

-- ── generated_reports ─────────────────────────────────────────────────────────
-- Parents and children can read reports; only service role can insert
CREATE POLICY generated_reports_select ON generated_reports
    FOR SELECT USING (
        child_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
        OR
        child_id IN (
            SELECT child_id FROM parent_child
            WHERE parent_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        )
    );

-- ── phonics_knowledge ─────────────────────────────────────────────────────────
-- Read-only for all authenticated users; writes only via service role
CREATE POLICY phonics_knowledge_select ON phonics_knowledge
    FOR SELECT USING (auth.role() = 'authenticated');

-- ── activity_recommendations ──────────────────────────────────────────────────
CREATE POLICY activity_recommendations_select ON activity_recommendations
    FOR SELECT USING (auth.role() = 'authenticated');


-- =============================================================================
-- 9. SEED DATA
-- =============================================================================

-- ── Playful Practice activities (PRD Section 5.5) ─────────────────────────────
INSERT INTO activity_recommendations (phonics_category, title, description, pedagogy)
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


-- ── Dolch 220 sight words seed (child_known_words default) ───────────────────
-- Stored as a reference row with child_id = NULL for use as the default seed.
-- The nightly job copies this into each new child's child_known_words row.
-- NOTE: This is NOT a per-child row — it is the curriculum baseline only.

-- Full Dolch 220 list (Pre-Primer through Grade 3)
-- Reference: https://sightwords.com/sight-words/dolch/
DO $$
DECLARE
    dolch_220 TEXT[] := ARRAY[
        -- Pre-Primer (40 words)
        'a','and','away','big','blue','can','come','down','find','for',
        'funny','go','help','here','i','in','is','it','jump','little',
        'look','make','me','my','not','one','play','red','run','said',
        'see','the','three','to','two','up','we','where','yellow','you',
        -- Primer (52 words)
        'all','am','are','at','ate','be','black','brown','but','came',
        'did','do','eat','four','get','good','have','he','into','like',
        'must','new','no','now','on','our','out','please','pretty','ran',
        'ride','saw','say','she','so','soon','that','there','they','this',
        'too','under','want','was','well','went','what','white','who','will',
        'with','yes',
        -- Grade 1 (41 words)
        'after','again','an','any','ask','as','by','could','every','fly',
        'from','give','going','had','has','her','him','his','how','just',
        'know','let','live','may','of','old','once','open','over','put',
        'round','some','stop','take','thank','them','think','walk','were','when',
        'your',
        -- Grade 2 (46 words)
        'always','around','because','been','before','best','both','buy','call','cold',
        'does','don''t','fast','first','five','found','gave','goes','green','its',
        'made','many','off','or','pull','read','right','sing','sit','sleep',
        'tell','their','these','those','upon','us','use','very','wash','which',
        'why','wish','work','would','write','if',
        -- Grade 3 (41 words)
        'about','better','bring','carry','clean','cut','done','draw','drink','eight',
        'fall','far','full','got','grow','hold','hot','hurt','if','keep',
        'kind','laugh','light','long','much','myself','never','only','own','pick',
        'seven','shall','show','six','small','start','ten','today','together','try',
        'warm'
    ];
BEGIN
    -- This creates a reference entry. Per-child rows are created by the app on first login.
    RAISE NOTICE 'Dolch 220 list defined with % words. Use this array in the app seed logic.', array_length(dolch_220, 1);
END $$;


-- =============================================================================
-- 10. HELPFUL VIEWS (optional — for Sungjun's dashboard queries)
-- =============================================================================

-- Child reading summary — used by parent dashboard API
CREATE OR REPLACE VIEW child_reading_summary AS
SELECT
    u.id                                        AS child_id,
    cp.name                                     AS child_name,
    cp.grade,
    COUNT(DISTINCT rs.id)                       AS total_sessions,
    COUNT(re.id)                                AS total_words_read,
    ROUND(AVG(CASE WHEN re.is_correct THEN 1.0 ELSE 0.0 END) * 100, 1)
                                                AS accuracy_pct,
    COUNT(CASE WHEN re.is_correct = FALSE THEN 1 END)
                                                AS total_miscues,
    MAX(rs.start_time)                          AS last_session_at
FROM users u
JOIN child_profiles cp ON cp.child_id = u.id
LEFT JOIN reading_sessions rs ON rs.child_id = u.id
LEFT JOIN reading_events re ON re.session_id = rs.id
WHERE u.role = 'CHILD'
GROUP BY u.id, cp.name, cp.grade;

-- Top phonics deficits per child (last 14 days) — used by activity recommendation
CREATE OR REPLACE VIEW child_phonics_deficits AS
SELECT
    child_id,
    phonics_category,
    COUNT(*)                                    AS miscue_count,
    ROUND(AVG(similarity_score)::NUMERIC, 3)    AS avg_similarity
FROM reading_events
WHERE is_correct = FALSE
  AND timestamp >= NOW() - INTERVAL '14 days'
GROUP BY child_id, phonics_category
ORDER BY child_id, miscue_count DESC;
