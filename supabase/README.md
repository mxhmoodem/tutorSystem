# Klasio — Supabase (backend)

> **Status: aspirational — lands with Phase 1.** This directory is a placeholder for
> the production backend. No migrations, RLS policies or RPCs have been written yet.
> The app in the repo root is the **prototype** (localStorage-backed, no Supabase).
> The authoritative design lives in [`docs/Klasio-Data-Layer-Reference.md`](../docs/Klasio-Data-Layer-Reference.md)
> (v5), the phased build order in [`docs/klasio-development-plan.md`](../docs/klasio-development-plan.md),
> and the account and infrastructure setup in [`docs/klasio-setup-runbook.md`](../docs/klasio-setup-runbook.md).
> Where the prototype and the docs conflict, the docs win — known gaps are listed under
> *Known prototype divergences* in the development plan.

## What will live here (from Phase 1 onward)

- `config.toml` — local stack configuration: ports, auth settings, the mail catcher
- `migrations/` — one timestamped migration per slice, holding that slice's tables,
  indexes, constraints and RLS policies together. Forward-only: a mistake is corrected
  by the next migration, never by editing one that has shipped
- `tests/` — pgTAP suites, including the two-centre RLS isolation harness (Account A vs
  Account B) that every later slice appends to
- `seed.sql` — demo data, extended per slice

RPCs, triggers and views ship **inside migrations**. The `functions/` directory belongs
to Supabase Edge Functions, which Klasio does not use: privileged HTTP endpoints are
Fastify routes on Railway (decision #4).

## Domains (≈117 tables across twelve domains)

Tenancy & identity · Academic · Grades & assessment · Staff & pay · Homework ·
**Student Reports & Teacher Feedback** · **Tracking & lesson planning** ·
Invoicing (families + tax) · Communications · Files & storage · Platform & operations ·
**Resources (Materials library)**.

Centre and solo-tutor accounts share every table — a solo account owns one implicit centre.

The prototype's localStorage stores are the behavioural spec, not the schema: a single key
such as `admin_store_v4`, `homework_store_v9`, `reports_store_v2`, `tutoros.attendance.v2`
or `tutoros.comms.v2` fans out into several tables here. Where the prototype's shape
deliberately differs, the difference is a row under *Known prototype divergences* in the
development plan; the keys themselves are renamed `tutoros.*` → `klasio.*` in one Phase 18
cutover, never piecemeal.

## Access model in one paragraph

Every table has RLS enabled. The tenant boundary is `centre_id`, with `account_id` as the
parent scope. A **superadmin reads no tenant data**: platform staff see a centre's rows only
inside a time-boxed `support_sessions` row the tenant can see, and health, emergency contacts,
consents, safeguarding records, conversations, messages and flags are never readable even then.
A **teacher reads their own students**, through `is_my_student()` (own classes plus any class
they are currently covering); centre-wide reads belong to `centre_admin`. Settings that a policy
or view reads are typed columns on a per-domain settings row — never a jsonb blob.

## Local development

Supabase runs locally in Docker (decision #8), so every developer has a disposable database:

```bash
supabase start                 # Postgres, Auth, Storage, Studio, mail catcher
supabase status                # local URLs, publishable and secret keys
supabase migration new <name>  # author a migration
supabase db reset              # rebuild from zero: migrations + seed
supabase test db               # pgTAP, including the RLS isolation harness
npm run db:types               # regenerate types into packages/db
```

Nothing local touches staging or production. Migrations reach staging when a pull request
merges to `main`, and production through the manual release workflow. CI runs the same
Docker stack on GitHub-hosted runners.

## Configuration this backend expects

- **Keys:** the publishable key (`sb_publishable_…`) in the browser and the secret key
  (`sb_secret_…`) in the API only. The legacy `anon` / `service_role` keys are deprecated by
  the end of 2026 and are not used. The API verifies user JWTs against the project's JWKS
  endpoint, not a shared JWT secret.
- **Auth:** email + password with mandatory TOTP for staff; public sign-ups **disabled** in
  Supabase (accounts are created by the API — signup, invitations, student provisioning);
  Cloudflare Turnstile enabled; redirect URLs set per environment; SMTP pointed at Resend.
  Staff sign-in runs through `POST /v1/auth/staff/login` and `/v1/auth/staff/mfa/verify`,
  which record `auth_attempts` and enforce `account_lockouts` — Supabase's own verification
  hooks need the Team plan. Students never sign in to Supabase directly: `/v1/auth/student/login`
  checks centre code + username + PIN or password, then mints a session through the Auth admin
  API against the student's synthetic email. The platform-admin claim that `is_superadmin()`
  reads lives in the user's `app_metadata`, set from an allowlist — never self-service.
- **Storage:** files live in Cloudflare R2 (EU jurisdiction), signed by Railway. Supabase
  Storage is not used. `files` rows are written only by the service role.
- **Extensions and features:** `pg_cron` for the reminder, retention and quota sweeps;
  Realtime for private conversation and notification channels; views are `security_invoker`.
- **Environments:** `klasio-staging` and `klasio-prod`, both in West EU (London), in one
  organisation. Secrets live in Railway, Vercel and GitHub environments as set out in the
  setup runbook — never in this repo.
- **Environment variables:** the API reads `SUPABASE_URL`, `SUPABASE_SECRET_KEY` and
  `DATABASE_URL`; the web app reads `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. Alongside
  them sit `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET`,
  `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`,
  `SENTRY_DSN` and `POSTHOG_KEY`. The checked-in `.env.example` listing them belongs to the
  `klasio` monorepo (Phase 0) — this repo is the prototype and holds no production secrets.

## No AI (locked decision #12)

There are no AI features, dependencies or tables anywhere in the platform. There is
**no `ai_feedback` table** and no Homework-AI endpoints — the Student Reports & Teacher
Feedback domain (reference §6) is the successor to the deleted AI-feedback feature.
Homework auto-marking is deterministic comparison against teacher-authored answers
(reference §5).
