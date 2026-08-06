-- Week 3 personalized known-word nightly refresh.
-- Source of truth: public.reading_events persisted scored reading attempts.

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.normalize_reading_word(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
RETURNS NULL ON NULL INPUT
SET search_path = public, pg_temp
AS $function$
DECLARE
    normalized TEXT;
BEGIN
    normalized := LOWER(BTRIM(input_text));

    normalized := REPLACE(normalized, '’', '''');
    normalized := REPLACE(normalized, '‘', '''');
    normalized := REPLACE(normalized, 'ʼ', '''');
    normalized := REPLACE(normalized, '`', '''');
    normalized := REPLACE(normalized, '´', '''');
    normalized := REPLACE(normalized, '–', '-');
    normalized := REPLACE(normalized, '—', '-');
    normalized := REPLACE(normalized, '−', '-');

    normalized := REGEXP_REPLACE(normalized, '[[:space:]]+', ' ', 'g');
    normalized := REGEXP_REPLACE(normalized, $rx$[[:space:]]*-[[:space:]]*$rx$, '-', 'g');
    normalized := REGEXP_REPLACE(normalized, $rx$^[^[:alnum:]'-]+|[^[:alnum:]'-]+$$rx$, '', 'g');
    normalized := REGEXP_REPLACE(normalized, $rx$^[-']+|[-']+$$rx$, '', 'g');
    normalized := BTRIM(normalized);

    IF normalized = '' THEN
        RETURN NULL;
    END IF;

    IF normalized !~ $rx$^[[:alpha:]]+(['-][[:alpha:]]+)*$$rx$ THEN
        RETURN NULL;
    END IF;

    RETURN normalized;
END;
$function$;

COMMENT ON FUNCTION public.normalize_reading_word(TEXT) IS
'Normalizes one persisted reading_events.word token for child_known_words mastery grouping. Preserves internal apostrophes and hyphens, keeps single-letter a/i, and rejects punctuation-only, numeric, multiword, or otherwise unusable tokens.';

CREATE INDEX IF NOT EXISTS idx_reading_events_known_words_refresh
    ON public.reading_events (timestamp DESC, child_id)
    INCLUDE (word, is_correct);

CREATE OR REPLACE FUNCTION public.refresh_child_known_words_at(reference_time TIMESTAMPTZ)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
    WITH affected_children AS (
        SELECT ckw.child_id
        FROM public.child_known_words AS ckw

        UNION

        SELECT re.child_id
        FROM public.reading_events AS re
        WHERE re.child_id IS NOT NULL
          AND re.timestamp >= reference_time - INTERVAL '30 days'
          AND re.timestamp <= reference_time
          AND re.is_correct IS NOT NULL
          AND public.normalize_reading_word(re.word) IS NOT NULL
    ),
    observed_attempts AS (
        SELECT
            re.child_id,
            public.normalize_reading_word(re.word) AS normalized_word,
            re.is_correct,
            re.timestamp
        FROM public.reading_events AS re
        WHERE re.child_id IS NOT NULL
          AND re.timestamp >= reference_time - INTERVAL '30 days'
          AND re.timestamp <= reference_time
          AND re.is_correct IS NOT NULL
    ),
    usable_attempts AS (
        SELECT
            child_id,
            normalized_word,
            is_correct,
            timestamp
        FROM observed_attempts
        WHERE normalized_word IS NOT NULL
    ),
    word_stats AS (
        SELECT
            child_id,
            normalized_word,
            COUNT(*)::INTEGER AS total_count,
            COUNT(*) FILTER (WHERE is_correct)::INTEGER AS correct_count,
            MAX(timestamp) AS last_observed_at
        FROM usable_attempts
        GROUP BY child_id, normalized_word
    ),
    mastered_words AS (
        SELECT
            child_id,
            normalized_word,
            total_count,
            correct_count,
            last_observed_at,
            correct_count::NUMERIC / NULLIF(total_count, 0) AS accuracy
        FROM word_stats
        WHERE correct_count >= 2
          AND correct_count::NUMERIC / NULLIF(total_count, 0) >= 0.80
    ),
    ranked_mastered_words AS (
        SELECT
            child_id,
            normalized_word,
            ROW_NUMBER() OVER (
                PARTITION BY child_id
                ORDER BY last_observed_at DESC, correct_count DESC, accuracy DESC, normalized_word ASC
            ) AS selection_rank
        FROM mastered_words
    ),
    selected_words AS (
        SELECT child_id, normalized_word
        FROM ranked_mastered_words
        WHERE selection_rank <= 500
    ),
    refreshed_lists AS (
        SELECT
            affected_children.child_id,
            COALESCE(
                JSONB_AGG(selected_words.normalized_word ORDER BY selected_words.normalized_word)
                    FILTER (WHERE selected_words.normalized_word IS NOT NULL),
                '[]'::JSONB
            ) AS words
        FROM affected_children
        LEFT JOIN selected_words
          ON selected_words.child_id = affected_children.child_id
        GROUP BY affected_children.child_id
    )
    INSERT INTO public.child_known_words (child_id, words, updated_at)
    SELECT child_id, words, reference_time
    FROM refreshed_lists
    ON CONFLICT (child_id) DO UPDATE
    SET
        words = EXCLUDED.words,
        updated_at = EXCLUDED.updated_at;
END;
$function$;

COMMENT ON FUNCTION public.refresh_child_known_words_at(TIMESTAMPTZ) IS
'Deterministically refreshes derived child_known_words from the 30-day rolling window ending at the supplied reference timestamp. Intended for tests and trusted local/manual operation.';

CREATE OR REPLACE FUNCTION public.refresh_child_known_words()
RETURNS VOID
LANGUAGE sql
SET search_path = public, pg_temp
AS $function$
    SELECT public.refresh_child_known_words_at(NOW());
$function$;

COMMENT ON FUNCTION public.refresh_child_known_words() IS
'Scheduled wrapper for refreshing derived child_known_words from persisted reading_events. Runs with invoker privileges and is not granted to browser roles.';

REVOKE ALL ON FUNCTION public.normalize_reading_word(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_child_known_words_at(TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_child_known_words() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.normalize_reading_word(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_child_known_words_at(TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_child_known_words() TO service_role;

DO $$
DECLARE
    existing_job RECORD;
BEGIN
    FOR existing_job IN
        SELECT jobid
        FROM cron.job
        WHERE jobname = 'refresh-child-known-words-nightly'
    LOOP
        PERFORM cron.unschedule(existing_job.jobid);
    END LOOP;
END;
$$;

SELECT cron.schedule(
    'refresh-child-known-words-nightly',
    '0 2 * * *',
    'SELECT public.refresh_child_known_words();'
);
