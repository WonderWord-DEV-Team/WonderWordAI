# Supabase Database

`supabase/migrations/` is the canonical source for the WonderWord AI database schema. The legacy `infra/db/schema.sql` file is retained only as a pointer so schema changes cannot drift outside migration history.

## Local Environment

Install Docker and the Supabase CLI, then run all commands from the repository root.

Do not commit or share database passwords, JWT secrets, anon keys, or service-role keys. Local development should use the local Supabase stack. Remote project credentials belong in approved secret stores only.

## Reset And Test Locally

```sh
npx supabase start
npx supabase db reset
npx supabase db lint
npx supabase test db
npx supabase migration list
```

`supabase/config.toml` enables two local Auth hooks:

- `public.reject_client_role_metadata` rejects signup payloads that try to set `role` or `user_role` metadata.
- `public.custom_access_token_hook` adds `user_role` from `public.users.role` while preserving the standard JWT `role` claim as `authenticated`.

## Roles And Authorization

WonderWord has exactly two application roles: `CHILD` and `PARENT`. The authoritative value is `public.users.role`; client-editable `user_metadata` is never trusted for authorization.

The app keeps a separate `public.users.id` as its application user identifier. `public.users.auth_id` references `auth.users(id)` with `ON DELETE CASCADE`.

Private RLS helper functions live in the `private` schema, which is not exposed through the API schemas in `supabase/config.toml`. Browser roles get only the table privileges needed for RLS-checked reads and child-owned inserts or updates.

## Linking And Remote Migrations

Local validation should happen before linking or pushing:

```sh
npx supabase db reset
npx supabase test db
```

To inspect a linked remote project without mutating it:

```sh
npx supabase link --project-ref <project-ref>
npx supabase migration list
```

To apply migrations to an approved remote environment, use the team deployment workflow or an explicitly approved operator session:

```sh
npx supabase link --project-ref <project-ref>
npx supabase db push
```

Do not run `supabase db push` from an automated coding session unless the team explicitly asks for that remote mutation.

Remote Auth hook configuration must point to the same database functions used locally:

- Custom access token: `pg-functions://postgres/public/custom_access_token_hook`
- Before user created: `pg-functions://postgres/public/reject_client_role_metadata`

## Adding Future Schema Changes

Create a timestamped migration under `supabase/migrations/`, keep application objects explicitly qualified with `public.`, and keep private helper functions in `private.` with `SECURITY DEFINER` and an explicit `search_path`.

Every migration that touches RLS should include or update database tests under `supabase/tests/database/`.

## Child Known Words Refresh

`public.child_known_words` is a derived personalized vocabulary cache. Its only source of truth is persisted `public.reading_events`; Dolch or other fallback vocabulary must stay outside this table and may only be merged in memory by application services that need a minimum vocabulary size.

Refresh manually in local development:

```sql
select public.refresh_child_known_words();
```

Run its database tests from the repository root:

```sh
npx supabase db reset
npx supabase test db supabase/tests/database/child_known_words_refresh.test.sql
```

The refresh uses these source columns:

- `reading_events.child_id`
- `reading_events.word`
- `reading_events.is_correct`
- `reading_events.timestamp`

It ignores OCR text, transcripts that were not persisted as reading events, parent reports, generated activities, fallback words, and phonics-category aggregates.

### Normalization

`public.normalize_reading_word(input_text text)` normalizes a single persisted word token by trimming whitespace, lowercasing, normalizing Unicode apostrophes and dashes, removing surrounding punctuation, and preserving meaningful internal apostrophes and hyphens.

Examples:

- `Cat`, `cat.`, and `"cat"` become `cat`.
- `TREE!` becomes `tree`.
- `isn’t` becomes `isn't`.
- `a` and `I` are valid single-letter words and become `a` and `i`.
- `can't`, `dog's`, and `well-known` are preserved.
- Punctuation-only, numeric-only, multiword, and malformed OCR-noise tokens become `NULL`.

The function does not split one reading event into multiple words.

### Mastery Formula

For each child and normalized word in the rolling 30-day window:

- `total_count = count(*)`
- `correct_count = count(*) filter (where is_correct)`
- `accuracy = correct_count / total_count`
- `last_observed_at = max(timestamp)`

A word is mastered only when:

```text
correct_count >= 2
and correct_count / total_count >= 0.80
```

The 80% threshold is inclusive. `1/1` at 100% is not mastered because it has fewer than 2 correct readings. `4/5` at exactly 80% is mastered.

Current schema stores `reading_events.is_correct` as `NOT NULL`; if a future migration allows null scored state, the refresh excludes null values from both numerator and denominator.

### Replacement Behavior

`public.refresh_child_known_words_at(reference_time timestamptz)` deterministically recomputes affected children from the 30-day window ending at `reference_time`. `public.refresh_child_known_words()` calls it with `now()` for scheduled/manual operation.

The refresh is idempotent. It does not append forever: stale words are removed when old attempts age out or recent incorrect attempts drop accuracy below the threshold. Existing stale rows are updated to `[]`; children with recent attempts but no mastered words also receive `[]`. Children with no history and no existing row are not created solely by the refresh.

### 500-Word Cap

The cap is selected deterministically per child:

1. Most recently observed first.
2. Higher correct count.
3. Higher accuracy.
4. Normalized word alphabetically.

After selection, the JSONB `words` array is serialized alphabetically because the story-generation route consumes it as a plain `string[]` without mastery metrics.

### Schedule And Security

Migration `20260729233744_child_known_words_refresh.sql` enables `pg_cron` if needed and schedules `refresh-child-known-words-nightly`:

```cron
0 2 * * *
```

This is 02:00 UTC. The repository does not currently document a business-local timezone for database cron jobs.

The refresh functions use invoker privileges, explicit `search_path`, qualified table/function names, and no service-role keys. Execute privileges are revoked from `PUBLIC`, `anon`, and `authenticated`, then granted only to `service_role`; the cron job is created by the migration owner. RLS on `child_known_words` remains read-only for authenticated child/linked-parent access, and authenticated clients cannot directly overwrite derived mastery data.

### Phonics Categories

Word mastery does not depend on `phonics_category`, but current category producers/fixtures should eventually converge on the canonical keys documented in `docs/phonics-kb.md`:

```text
short-a, short-e, short-i, short-o, short-u,
sh-digraph, ch-digraph, th-digraph, wh-digraph, ph-digraph, ck-digraph,
bl-blend, cr-blend,
long-a, long-i, long-o,
vowel-team-ai, vowel-team-ee, vowel-team-oa, vowel-team-oo,
prefix-re, prefix-un, suffix-ing,
r-controlled-ar, r-controlled-er,
silent-k, silent-w, silent-b, silent-gh, silent-l
```

Known current mismatches outside that canonical list:

- `public.activity_recommendations` seed values: `multisyllabic`, `sight-words`, `soft-c`.
- ML activity recommendation fallback: `unknown`.
- Story route tests use placeholder categories: `sh`, `d`, `u`.
- API contract examples include `unknown`.

Category normalization should happen where phonics categories are produced or accepted: ML phonics lookup/activity recommendation responses, story-generation request validation, seeded activity recommendations, and any dashboard/report consumers that aggregate by category. Historical category rewriting is intentionally out of scope for the known-word refresh.
