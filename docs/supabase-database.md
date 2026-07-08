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
