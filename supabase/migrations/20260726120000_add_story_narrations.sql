-- Store generated story narration metadata separately from child reading audio.

CREATE TABLE IF NOT EXISTS public.story_narrations (
    id                  UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    story_id            UUID NOT NULL REFERENCES public.generated_stories(id) ON DELETE CASCADE,
    audio_path          TEXT NOT NULL,
    mime_type           TEXT NOT NULL,
    duration_seconds    DOUBLE PRECISION NOT NULL CHECK (duration_seconds > 0),
    word_timestamps     JSONB NOT NULL CHECK (jsonb_typeof(word_timestamps) = 'array'),
    text_hash           TEXT NOT NULL,
    narration_version   TEXT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (story_id, narration_version)
);

CREATE INDEX IF NOT EXISTS idx_story_narrations_story
    ON public.story_narrations (story_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_story_narrations_updated_at ON public.story_narrations;
CREATE TRIGGER set_story_narrations_updated_at
    BEFORE UPDATE ON public.story_narrations
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.story_narrations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.story_narrations FROM anon, authenticated;
GRANT ALL ON public.story_narrations TO service_role;

INSERT INTO storage.buckets (id, name, public, allowed_mime_types)
VALUES (
    'story-narrations',
    'story-narrations',
    FALSE,
    ARRAY['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav']
)
ON CONFLICT (id) DO UPDATE
SET
    public = FALSE,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
