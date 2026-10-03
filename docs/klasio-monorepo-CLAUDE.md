# CLAUDE.md — Klasio

Klasio is a multi-tenant school and tuition management platform. It holds **children's personal data**, **safeguarding records** and **health records**. Every rule below exists because getting it wrong harms a child or breaches UK GDPR, not because it fails a lint check.

## Authoritative documents

| Document | Authority over |
|---|---|
| `docs/Klasio-Data-Layer-Reference.md` (v5) | Tables, columns, RLS policies, helpers, views, endpoints |
| `docs/klasio-development-plan.md` | Phase order, slice contents, locked decisions |
| `docs/klasio-setup-runbook.md` | Accounts, environments, provider config, env vars |

These documents win over the prototype. The `klasio-prototype` repo defines expected **UI behaviour** only; where it disagrees with the reference or the plan, the documents are correct and the gap belongs in the plan's "Known prototype divergences" table — never copied into production code.

Read the relevant slice in the plan and the relevant tables in the reference **before** writing a migration, a policy or an endpoint. Do not infer the schema from the prototype.

## Stack

```
apps/web        Vite + React + TS   → Vercel (klasio-web)   app.klasio.com
apps/api        Fastify + TS        → Railway (klasio-api)  api.klasio.com, EU West
packages/db     Supabase client factory, generated types
packages/shared Zod schemas, shared types
supabase/       config.toml, migrations/, seed.sql, tests/ (pgTAP)
```

Three data surfaces, and the choice between them is a security decision:

- **Plain CRUD** → Supabase client (PostgREST), authorised **entirely by RLS**.
- **Multi-table transactions** → Postgres RPCs.
- **Anything touching a secret or bypassing RLS** → a Railway HTTP endpoint. Never the browser.

---

## Non-negotiables

Break any of these and the change is wrong regardless of whether it works:

1. Sessions are **cookie-based**. A token never goes in `localStorage`, and **every state-changing request is CSRF-protected**. This is the rule most likely to be broken by a plausible-looking fix — see Sessions and auth below before touching any of it.
2. The Supabase **secret key** (`sb_secret_…`) exists only in `apps/api`. It never appears in `apps/web`, in a Vercel environment variable, in a test fixture, or in a commit.
3. **Every table has RLS enabled and per-operation policies**, written in the same migration file as the table. A table without policies is a data breach, not a TODO.
4. Tenant scope is **derived from the session** — `auth_centre_ids()`, `auth_account_ids()`, `auth_uid()`. Never from a request body, query parameter, header or client-supplied id.
5. Safeguarding, health, emergency contacts and consents are **never** plan-gated, **never** readable in a support session, **never** written to logs or analytics, and **never** read through plain PostgREST.
6. Safeguarding records are **append-only and tombstoned, never hard-deleted** — including under erasure. Erasure anonymises the profile and preserves the record.
7. Money, prices, plan codes and entitlements are **resolved server-side**. Nothing about billing is trusted from the client.
8. **No AI in the product** (decision #12). The homework PDF import is rule-based extraction. Do not add a model call to a feature.
9. Every audited RPC writes an `audit_log` row carrying `actor_role`, `ip` and `support_session_id`. If the reference lists an RPC as audited and it writes no audit row, it is unfinished.

---

## Sessions and auth

**Topology — decided, do not re-derive.** The web app is `app.klasio.com` and the API is `api.klasio.com`. Those are cross-origin but **same-site** (one registrable domain), so a `__Host-` prefixed, host-scoped cookie set by the API *is* sent on requests from the web app, including `POST`. This holds only on `*.klasio.com`. A Vercel preview on `*.vercel.app` is genuinely cross-site and **cannot** carry the session cookie; previews either authenticate against staging through a `*.klasio.com` origin or run unauthenticated. Never "fix" a preview by moving the token into `localStorage` or by switching the cookie to `SameSite=None`.

- **Cookie flags:** `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, `__Host-` prefix, no `Domain` attribute.
- **CSRF:** every state-changing request checks `Origin` (falling back to `Referer`) against an exact allowlist, plus a CSRF token on destructive actions. **No state change on `GET`, ever.** Same-site is not a substitute — any `*.klasio.com` host can forge a request, and `Lax` still permits top-level `GET` navigation.
- **Verify JWTs properly:** against the project JWKS, with the algorithm **pinned**, and `iss`, `aud` and `exp` all checked. Never decode a token without verifying it, and never trust a claim from an unverified token.
- Rotate the session **on login** (fixation). Invalidate **every** session on password change, on MFA change and on role revocation. Expose "sign out everywhere".
- Refresh tokens rotate, with **reuse detection** that kills the whole family on a replay.
- Enforce **both an idle timeout and an absolute timeout**. Sessions holding safeguarding access get the shorter pair.
- **MFA:** TOTP mandatory for `centre_admin` and for anyone holding a `dsl_role`. **Step-up re-authentication** for changing email, password or MFA, transferring ownership, changing roles, editing billing details, and opening a safeguarding record.
- **Password policy:** 12 characters minimum, checked against HaveIBeenPwned through the k-anonymity range API, no composition rules. Reset tokens are high-entropy, single-use, stored **hashed**, valid 15–60 minutes, and invalidated on use and on password change.
- **PIN login is the weakest surface in the system.** Under-13s are PIN-only — roughly 10⁴ of entropy, so the generic lockout thresholds are far too loose for it. PINs get their own much tighter limits **per pupil and per centre**, a hard lockout only staff can clear, and Turnstile. PIN login is bound to a centre context and never reveals whether a username exists.
- **Identical responses and timing** for "no such user" and "wrong credential", on staff login, student login, signup and reset alike.
- **Turnstile** covers staff login, student login, signup, password reset, the claim page and guardian approval — not staff login alone.

---

## Tenancy and authorization

This is where real breaches happen. AI-written CRUD is reliably correct and reliably missing the ownership check.

**Use the canonical patterns.** Do not invent a predicate when a helper exists:

```sql
-- centre-scoped table
create policy sel on <table> for select using (
  centre_id = any(auth_centre_ids())
  or in_support_session(account_id)
);

-- per-student table: a teacher reads the pupils they teach, not the centre roll
create policy sel_student_scoped on <table> for select using (
  has_role(centre_id, array['centre_admin'])
  or is_my_student(student_id)
  or owns_profile(student_id)
  or in_support_session(account_id)
);

-- every tenant write: the table's own role check, and the platform may be frozen
create policy ins on <table> for insert with check (
  <role check>
  and writes_allowed(account_id)
);
```

- Write **separate policies for select, insert, update and delete**. A permissive `for all` policy is not acceptable on a tenant table.
- `is_superadmin()` grants **no tenant data**. It appears only on the platform tables the reference's matrix lists. Tenant reads by a superadmin go through `in_support_session()`, which is time-boxed and visible to the tenant.
- Staff roles are **not interchangeable**. A teacher gets `is_my_student()`; centre-wide reads stay with `centre_admin`. Never widen a teacher policy to a bare membership check for convenience.
- `has_role()` is `EXISTS` over membership rows because one profile holds **multiple roles at one centre**. Never assume a single role per user.
- Views are `security_invoker = true` so they run under the caller's policies. Never create a view that bypasses RLS to make a query simpler.
- Helper functions are `SECURITY DEFINER` — every one of them **pins `search_path`**.
- **Revoke default grants.** RLS on a table whose `anon` or `authenticated` grant is wider than it needs is still a hole. Grant the minimum per table and per column, and re-check after every migration.
- Capability checks go through `plan_capability()` and `plan_limit()`. **Nothing compares a plan code** (decision #25).
- **Every tenant write checks `writes_allowed(account_id)`** — in the policy, and first thing in every tenant-writing RPC and endpoint, because `SECURITY DEFINER` and the secret key both skip policies. It is false under maintenance, under read-only for that account, and for a suspended account (decision #35). Platform tables don't carry it, so the superadmin can always switch a mode off. `raise_concern`, incident notes and message sends skip the read-only check: a pupil reaching out during an incident must still get through.

**Safeguarding reads are audited reads.** RLS authorises a read but records nothing, and "who opened this child's record, and when" is precisely what an investigation asks for. Safeguarding, health, emergency contact and consent records are therefore read through an **audited endpoint or RPC, never plain PostgREST**. The audit row names the reader, the time and the record — **never its contents**.

**Mass assignment.** Never spread a request body into an insert or update. Allowlist columns through a Zod schema and build the payload explicitly. This is how someone grants themselves `centre_admin`.

```ts
// wrong — a client-supplied `role` or `centre_id` walks straight in
await supabase.from('memberships').update(req.body).eq('id', id)

// right
const patch = updateMembershipSchema.parse(req.body)   // .strict(), no role field
await supabase.from('memberships').update({ dsl_role: patch.dsl_role }).eq('id', id)
```

**Never `select *`.** List columns explicitly. The column-level gates exist because RLS cannot express them — `v_my_student_record` (a pupil's own row minus staff `notes`), `v_my_submissions` and `v_my_answers` (marks and feedback withheld until released). Returning a whole row defeats them.

**Never ship a field the client should not hold.** A user object passed to the browser ships every column in it, including the ones the UI does not render.

---

## Validation and injection

- Every endpoint validates **body, params and query** with a Zod schema using `.strict()`. Unknown fields are rejected, not ignored. Client-side validation is UX only.
- Shared schemas live in `packages/shared` so the web app and the API validate against the same definition.
- All SQL is **parameterised**. No string-built SQL in migrations, RPCs or endpoint code.
- Validate ids as UUIDs before they reach the database.
- **Never build an R2 object key or a file path from user input.** Keys are generated server-side.
- **SSRF:** any endpoint that fetches a user-supplied URL allowlists the scheme and blocks private ranges (`127.0.0.0/8`, `10/8`, `172.16/12`, `192.168/16`, `169.254.169.254`) — after redirects and after DNS resolution.
- **Open redirects:** validate `?redirect=` and `?next=` against an allowlist of relative paths. Claim links and guardian magic links are the live cases.
- **CSV injection:** every CSV export prefixes cells beginning with `=`, `+`, `-` or `@`. This applies to the invoice, timesheet, analytics and reconciliation exports, all of which carry free text entered by staff.
- **Email and header injection:** strip CR/LF from anything that reaches a header or an email field.

---

## API surface (`apps/api`, Fastify on Railway)

- **State the authorization check explicitly in every handler**, even when RLS also covers it. Defence in depth, and it documents intent.
- `@fastify/helmet` for security headers. `@fastify/rate-limit` on every route, **backed by Redis — not the in-memory default**, which silently multiplies every limit by the number of Railway instances. Tighter limits on auth, signup, password reset, PIN login, claim, guardian approval, email sending and exports.
- **Set `trustProxy` correctly.** Railway sits behind a proxy; without it, IP-based rate limiting and `audit_log.ip` are spoofable through `X-Forwarded-For`.
- **CORS:** explicit origin allowlist. Never `*` with credentials, never reflect the `Origin` header.
- Errors return **generic messages to the client, detail to logs**. No stack traces, no Postgres errors, no file paths in a response body.
- Every auth attempt writes `auth_attempts` and checks `account_lockouts` **before** calling Supabase Auth. Turnstile tokens are single-use — pass the token through to Supabase Auth on staff login rather than verifying it twice.
- **Webhooks** (Stripe, Resend) verify the signature against the **raw body**, check the timestamp against replay, and are **idempotent** through `processed_events`. Never parse the body before verifying it.
- **Idempotency keys** on every endpoint that creates a payment, an invoice or a charge. A retry must not double-charge a family.
- **Multi-step flows validate state server-side at every step** — claim, guardian approval, enrolment, signup. A client cannot skip a step by posting the last one.
- **Transactions and row locks** on anything with a limit, a balance or a capacity: `plan_limit()` enforcement, invoice numbering, class capacity, plan-code redemption.
- **Reject negative and zero quantities and amounts**, and fix rounding direction explicitly on every money calculation.
- Pagination has a **server-enforced cap**. No endpoint honours `?limit=1000000`.
- Request body size limits and timeouts on every route; timeouts on every outbound call.
- Return `404` rather than `403` for tenant resources the caller should not know exist.
- No debug mode, no route introspection and no `X-Powered-By` in production.

---

## Web app (`apps/web`, Vite + React on Vercel)

- Session handling is defined in **Sessions and auth** above. The web app never reads, writes or stores a token itself — and **never `localStorage`**, because any XSS reads it.
- `dangerouslySetInnerHTML` requires DOMPurify at the call site, with **no exceptions and no "this one is internal"**. Teacher comments on student reports are the live case, and they are rendered in more than one place — sanitise at every one.
- Sanitise rich text **on the server as well**, before it is stored.
- Never interpolate user input into `href` (this blocks `javascript:` URLs), `src`, or a style value.
- **CSP with no `unsafe-inline` and no `unsafe-eval`**, using nonces; plus HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` and `frame-ancestors`. Set these in the Vercel configuration, not per page.
- Anything reaching the browser bundle is **public**. Only the Supabase publishable key (`sb_publishable_…`), the Turnstile site key and the API base URL belong there.
- Subresource Integrity on any third-party script, and prefer not adding one.
- `rel="noopener noreferrer"` on every `target="_blank"`.

---

## Files and uploads (Cloudflare R2)

- **Validation runs in the API, before the R2 write** — never client-side against a direct-to-bucket upload. `POST /v1/files/:id/confirm` verifies the object rather than trusting the uploader.
- Validate by **magic bytes**, not by extension and not by the client's `Content-Type`. Allowlist the types each surface accepts.
- **Server-generated object keys.** The user's filename is metadata, never part of a path.
- Enforce size limits at both the proxy and the application, and check the pooled quota before signing.
- **Scan documents for malware** before they become downloadable, and reject archives or images that expand unreasonably (zip and decompression bombs).
- Buckets are **private**. Access is always a short-lived presigned URL from `POST /v1/files/:id/sign-download`, gated by the same permission check as the row — including `resource_can_open()` for resource files.
- **SVGs carry scripts** — sanitise or reject them. **Strip EXIF** (GPS) from images: these are photographs of children.
- Serve downloads with `Content-Disposition: attachment`.
- `DELETE /v1/files/:id` refuses the `archive` and `locked` retention categories. Safeguarding files are tombstoned, never removed from R2 by a user action.

---

## Secrets and environments

- Never in code, git, the client bundle, logs, error messages or URLs.
- `.env` is gitignored from the first commit; `.env.example` carries dummy values only.
- **Validate every environment variable at startup with a Zod schema** so a misconfigured deploy fails fast instead of running half-authorised.
- **Separate secrets per environment.** A development key must never open staging or production — this is why R2 issues one token per bucket.
- If a secret ever touches git history, **rotate it**. Removing the commit is not enough.
- Local development runs Supabase in Docker. There is no cloud development database, and **no production credential ever reaches a laptop or an agent**.
- Secret scanning (gitleaks pre-commit plus GitHub push protection) runs on this repo.

---

## Safeguarding and children's data

- The **concern-raise path is available to every staff member from every screen**. Never gate it behind a role, a plan or the Safeguarding page.
- A **raiser reads their own concern's status and nothing else** — not its notes, not another person's concern.
- A concern whose subject holds a `dsl_role` is `restricted`: invisible to every DSL including the subject, readable only by the account owner, and **not inferable by counting**.
- Incident notes are **append-only**, enforced at the database level. Update and delete are denied for every role.
- **Quiet hours never block a send.** They gate notification delivery and raise an `out_of_hours` flag reason. A blocked message from a pupil is a safeguarding failure, not a safeguarding control.
- A thread with any student participant is **text-only** (`messages.file_id` must be null), and `monitored` cannot be cleared.
- **AADC defaults are code, not configuration:** under-13s are PIN-only, non-critical notification preferences default off (a pupil's are `in_app` only), rank exposure honours `show_rank_to_students` and `rank_min_age`, and class averages reach a pupil only through `show_class_average_to_students` (default off). No accessibility or study-reminder toggle ships until the feature behind it exists (decision #61).
- **No student-role analytics events reach PostHog.** Zero, not "minimal".
- Never log passwords, tokens, PINs, session ids, claim codes or pupil PII. Scrub request bodies in Sentry.

---

## Data protection and monitoring

- **Residency is fixed:** Supabase `eu-west-2` (London), R2 on the **EU jurisdiction** (a jurisdiction, not a location hint — it cannot be changed after the bucket is created), Railway EU West. No real data lands in any other region, and no provider is added without checking where it stores and processes. Moving this later is painful.
- **Retention is enforced in code**, per data category, by the `pg_cron` sweeps — not by intention. Safeguarding is the stated exception: tombstoned and retained.
- **Subject access exports contain the subject's own data only.** They exclude staff `notes`, other people's data, and anything identifying a third party.
- **Cookie consent gates every non-essential script.** PostHog does not load until consent is given, and defaults to off.
- **`audit_log` is append-only** with its own retention period; nothing updates or deletes a row. Centre admins read their own centre's rows, platform rows (`centre_id IS NULL`) are superadmin-only.
- **Alert on** spikes in 401s, 403s, 5xxs, failed staff logins, failed PIN attempts, lockouts, and unusual export or download volume. `v_suspicious_activity` feeds the security console; the alerts are what bring a human to it.

---

## Tests every slice must add

A slice is not done without these. They are the reason the harness exists.

- **Two-centre isolation**, appended to the existing harness, for **every new table**: Account A cannot select, insert, update or delete Account B's rows.
- **Per-role allow and deny** for each new table, including the multi-role case — one profile holding admin and teacher at one centre passes both checks.
- **Teacher scope:** another teacher's pupil, guardian, health, result and submission rows are invisible; cover grants access for the covered dates only.
- **Support session:** a superadmin with no session reads nothing; inside a session the never-admit tables stay invisible.
- **Every audited RPC asserts its `audit_log` row**, and every safeguarding read asserts one too.
- Negative and zero quantities, rounding, and race conditions on anything carrying a limit or a balance.

---

## Dependencies and CI

- Lockfile committed; `npm ci` in CI.
- **Verify a package exists and is the real one before installing it.** Hallucinated package names get registered by attackers — check the age, the download count and the maintainers.
- Dependabot or Renovate on; `npm audit` in CI.
- GitHub Actions pinned to commit SHAs, with `GITHUB_TOKEN` scoped to minimal permissions.
- CI runs lint, typecheck, the pgTAP RLS suite, **Semgrep** and secret scanning on every PR. Not CodeQL — code scanning on a private repo needs GitHub Advanced Security, which the Team plan does not include.
- Branch protection with **required status checks**; no direct pushes to `main`. Add required reviews only once there is a second developer — GitHub will not let you approve your own pull request, so requiring one while solo blocks every merge.
- Keep Node, Fastify and the Supabase client patched.

---

## Working on this codebase

- **Read the diff before proposing it.** The failure mode here is code that works and is quietly missing an ownership check, a `.strict()`, or a policy.
- After each slice, run a **dedicated security pass over the diff** as its own task — OWASP Top 10 plus the rules in this file. It catches far more when it is the only thing being done.
- When a rule here conflicts with what the prototype does, **this file and the three documents win**. Add the gap to the divergence table.
- If a security control is deferred, say so explicitly in the pull request and add it to Phase 16. Do not leave it silent.
