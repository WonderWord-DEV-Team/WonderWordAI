# Week 4 Supabase Audit

Project URL: `https://tvcbdhekuzwljabbqfgc.supabase.co`

Project ref: `tvcbdhekuzwljabbqfgc`

Inspection date: 2026-08-06

Scope: repository-only plus local Supabase verification. Remote state was not verified and no remote mutation was run. Repository migrations remain the canonical schema for this branch.

## Local Verification

Commands run from the repository root:

```sh
supabase db reset --local
supabase db lint --local --fail-on error
supabase test db
```

Results:

- Local reset passed.
- Local schema lint passed with no schema errors.
- Local database tests passed: 2 files, 60 pgTAP tests.

## Read-Only Remote Parity Commands

These commands are safe only when used without `db push`, SQL writes, or dashboard edits:

```sh
supabase link --project-ref tvcbdhekuzwljabbqfgc
supabase migration list
supabase db lint --linked --fail-on error
```

Optional read-only SQL checks through SQL editor or `psql` with a read-only role:

```sql
select version, name from supabase_migrations.schema_migrations order by version;
select extname, extnamespace::regnamespace::text from pg_extension order by extname;
select schemaname, tablename, rowsecurity from pg_tables where schemaname in ('public', 'storage') order by 1, 2;
select jobname, schedule, command from cron.job order by jobname;
select id, name, public, allowed_mime_types from storage.buckets order by id;
```

Do not run `supabase db push` for this branch.

## Repository-Required Configuration

### Auth Hooks

`supabase/config.toml` enables:

- `before_user_created`: `pg-functions://postgres/public/reject_client_role_metadata`
- `custom_access_token`: `pg-functions://postgres/public/custom_access_token_hook`

Migrations define both hook functions and grant hook execution to `supabase_auth_admin`. Migration `20260708134857_fix_custom_access_token_hook.sql` changes `custom_access_token_hook` to `SECURITY INVOKER`, grants `supabase_auth_admin` selected access to `public.users(auth_id, role)`, and adds a SELECT policy for that role.

Human remote checks:

- Dashboard Auth Hooks point to the two URIs above.
- `supabase_auth_admin` can execute both functions.
- `custom_access_token_hook` emits only valid `CHILD` or `PARENT` `user_role` claims and preserves the standard Supabase role behavior.

### RLS And Grants

Repository migrations enable RLS on core public tables including users, child profiles, parent-child links, reading sessions/events, known words, generated stories/interactions/reports, AI usage log, subscriptions, and story narrations.

Important grant expectations:

- Browser roles rely on RLS-checked access, not service-role keys.
- `subscriptions` grants service role writes and authenticated SELECT only.
- `story_narrations` revokes anon/authenticated access and grants service role access.
- Private helper functions use explicit revokes/grants and are in the non-exposed `private` schema.

Human remote checks:

- Every exposed `public` table has RLS enabled.
- Tables required by browser reads have explicit grants compatible with current Data API auto-exposure settings.
- No `SECURITY DEFINER` function in an exposed schema is callable by `anon` or `authenticated` unless intentionally documented.

### Extensions

Repository migrations require:

- `uuid-ossp` in `extensions`
- `vector` in `extensions`
- `pg_cron` for child-known-words refresh and subscription trial expiry jobs
- `pgtap` locally for database tests

Human remote checks:

- Extension list matches migration requirements.
- `pg_cron` exists in the expected schema and jobs are present only once.

### Cron

Repository migrations schedule:

- `refresh-child-known-words-nightly` at `0 2 * * *`
- Trial expiry update job from `20260804194148_add_automatic_trial_for_new_parents.sql`

Human remote checks:

- `cron.job` contains expected job names/schedules/commands.
- Jobs are not duplicated from repeated migration attempts.
- Job timezone expectations are documented; repository currently states the known-words job is 02:00 UTC.

### Storage

Repository migrations create:

- `illustrations`: public bucket with public read/insert/update policies on `storage.objects`.
- `story-narrations`: private bucket with allowed audio MIME types.

Human remote checks:

- Buckets exist with expected public/private flags.
- Storage policies match repository intent.
- Story narration bucket accepts only expected audio MIME types.
- No child worksheet images or raw child audio are persisted outside the intended transient request path.

## Open Audit Risks

- Remote migration parity is unknown until `supabase migration list` is run against project ref `tvcbdhekuzwljabbqfgc`.
- Remote Auth hook dashboard settings are unknown until manually verified.
- Storage public-write posture for `illustrations` should be reviewed before launch; repository currently allows public insert/update for that bucket.
- The subscription trial migration uses `SECURITY DEFINER` intentionally for subscription bootstrap; remote grants/function execute privileges should be checked carefully.
