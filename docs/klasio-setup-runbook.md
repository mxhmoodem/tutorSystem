# Klasio — Phase 0 Setup Runbook

Accounts, repos, third-party services and configuration for Phase 0. Work through the stages **in order** — later stages use values emitted by earlier ones. No application code is written here.

*Revised September 2026; replaces the July 2026 draft. Provider limits and prices were checked against provider documentation in September 2026 — check again before paying for anything.*

**Conventions**
- Domain: **`klasio.com`**. The app, API, email and marketing site use subdomains. Confirm availability and search the UK IPO trademark register before spending.
- Environments: **local** (Supabase in Docker on your machine), **staging** and **production**. There is no cloud development database.
- Every credential, recovery code and 2FA backup code goes into the password manager the moment it is created. Never paste a secret into a repo, issue or chat.
- Turn on two-factor authentication for every account below.

---

## Decisions

| # | Area | Decision | Why |
|---|---|---|---|
| 1 | Local development | Supabase runs in Docker (`supabase start`); no cloud dev project | Isolated, resettable databases; the RLS test suite runs locally and in CI |
| 2 | Supabase | One organisation holding `klasio-staging` and `klasio-prod` in London; Free plan until the pilot, then Pro | Plans are set per organisation, so Free and Pro projects can't share one; Free projects pause after 7 idle days |
| 3 | Backups | Pro's daily backups (7-day retention); point-in-time recovery revisited at M2 | Point-in-time recovery costs about $100/month extra |
| 4 | Supabase keys | Publishable (`sb_publishable_…`) and secret (`sb_secret_…`) keys; the API verifies user JWTs against the JWKS endpoint | The legacy `anon` and `service_role` keys are deprecated by the end of 2026; the shared JWT secret is no longer recommended |
| 5 | Staff sign-in | Through the API, which records every attempt and enforces lockouts before calling Supabase Auth; Cloudflare Turnstile is required on Supabase Auth | Supabase's password- and MFA-verification hooks need the Team plan (from $599/month) |
| 6 | Web hosting | Vercel Pro team: `klasio-web`, `klasio-prototype`, later `klasio-marketing` | Hobby can't deploy private repos owned by an organisation and doesn't allow commercial use |
| 7 | API hosting | Railway Hobby in EU West (Amsterdam) | Railway has no London region; Amsterdam is closest to the database and keeps data in the EU |
| 8 | GitHub | Organisation on GitHub Team; production released by a manually triggered workflow | Protected branches and environment secrets on private repos need a paid plan; required reviewers need Enterprise |
| 9 | Repositories | New private `klasio` monorepo; `tutorSystem` transferred as `klasio-prototype`; marketing in its own repo (plan #19) | The prototype stays the behavioural spec |
| 10 | Monorepo layout | npm workspaces: `apps/web`, `apps/api`, `packages/shared`, `packages/db`, `packages/ui` | Plan #1, #3 and #6; add Turborepo only when CI needs caching |
| 11 | File storage | Cloudflare R2 in the EU jurisdiction; one private bucket and one access token per environment | Guaranteed EU residency for children's data |
| 12 | Email | Google Workspace for `ops@`, `support@` and `dmarc@` from day one; Resend sends from `send.klasio.com` in the Ireland region | Mailboxes exist before any other signup; support is by email (plan #30) |
| 13 | Error tracking | Sentry with EU (Frankfurt) data storage | The storage region can't be changed after the organisation is created |
| 14 | Billing | Stripe account now, in test mode; the catalogue is built in Phase 13 | Prices can still change before billing is built |
| 15 | Plan names | `starter`, `growth`, `scale`, `solo_free`, `solo_core`, `solo_pro`; monthly and yearly prices; a 100 GB storage add-on | Matches the reference and the prototype |
| 16 | Health check | `GET /v1/health` and `GET /v1/version` | Matches the reference |

Some of these change the development plan and the data-layer reference — see [Changes to the plan and reference](#changes-to-the-plan-and-reference).

---

## Stage A — Foundations

### A1. Domain
- Register **`klasio.com`** with any registrar. DNS moves to Cloudflare in B1.
- Planned hostnames:

  | Hostname | Used for | Set up in |
  |---|---|---|
  | `app.klasio.com` | Web app, production | B3 |
  | `staging.klasio.com` | Web app, staging | B3 |
  | `api.klasio.com` | API, production | B4 |
  | `api-staging.klasio.com` | API, staging | B4 |
  | `send.klasio.com` | Resend sending domain | C2 |
  | `students.klasio.com` | Synthetic student login emails; never receives mail | B1 |
  | `klasio.com`, `www.klasio.com` | Marketing site (separate repo) | Phase 17 |
  | `status.klasio.com` | Public status page | Phase 14 |

- **Emits:** the domain every later stage verifies against.

### A2. Password manager and Google Workspace
- Set up the password manager first (1Password or Bitwarden) with a shared vault called `Klasio`.
- Sign up for **Google Workspace** (Business Starter) for `klasio.com`, using your personal email as the recovery address:
  - Verify the domain with the TXT record Google gives you, and add Google's MX records. Both go in at the registrar, because Cloudflare isn't set up yet.
  - Create the user **`ops@klasio.com`**. It is the account email for every service below.
  - Create two groups: `support@klasio.com` (customer support) and `dmarc@klasio.com` (DMARC reports).
  - Require 2-Step Verification for the whole organisation.
  - Generate a DKIM key (Admin console → Apps → Google Workspace → Gmail → Authenticate email). Publish it in B1.
- **Emits:** the `ops@` identity; the `support@` and `dmarc@` groups; Workspace MX, SPF and DKIM values for B1.

### A3. GitHub organisation and repositories
- From your personal GitHub account, create the organisation **`klasio`**, with `ops@klasio.com` as the billing and contact email.
- Upgrade the organisation to **GitHub Team** ($4 per user/month).
- Settings → Authentication security: require two-factor authentication for all members.
- Transfer `mxhmoodem/tutorSystem` into the organisation and rename it **`klasio-prototype`** (Settings → General → Danger Zone). GitHub redirects the old URLs. Keep it private. If the prototype is deployed from a personal Vercel account, reconnect it under the Pro team in B3.
- Create the private repo **`klasio`**, empty. The walking-skeleton prompt scaffolds it.
- `klasio-marketing` is created in Phase 17, not now.
- **Emits:** the organisation and the `klasio` and `klasio-prototype` repos.

---

## Stage B — Core platform services

### B1. Cloudflare (DNS, R2, Turnstile)
- Create a Cloudflare account with `ops@klasio.com` and turn on 2FA.
- Add `klasio.com` on the Free plan. Before changing nameservers, check the imported DNS records and add anything missing:
  - Google Workspace MX records
  - SPF on `klasio.com`: `v=spf1 include:_spf.google.com ~all`
  - The Google domain-verification TXT record, and the DKIM TXT record from A2 (`google._domainkey`)
- Switch the nameservers at the registrar. When Cloudflare shows the domain as active, send a test email to `ops@`.
- Stop `students.klasio.com` from ever receiving mail: add a null MX record (mail server `.`, priority `0`) and a TXT record `v=spf1 -all` on `students`.

**R2**
- Enable R2 and create three buckets with the **European Union jurisdiction**. Use the jurisdiction, not a location hint: a hint is best-effort, and the jurisdiction can't be changed after a bucket is created.
  - `klasio-dev`, `klasio-staging`, `klasio-prod`
  - Leave public access off on all three.
- The S3 endpoint for EU-jurisdiction buckets is `https://<ACCOUNT_ID>.eu.r2.cloudflarestorage.com`.
- Add a CORS policy to each bucket. Browser uploads to presigned URLs fail without one. List exact origins, because R2 doesn't document wildcard origins:

  ```json
  [
    {
      "AllowedOrigins": ["https://app.klasio.com"],
      "AllowedMethods": ["GET", "PUT", "HEAD"],
      "AllowedHeaders": ["Content-Type"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }
  ]
  ```

  | Bucket | Allowed origin |
  |---|---|
  | `klasio-prod` | `https://app.klasio.com` |
  | `klasio-staging` | `https://staging.klasio.com` |
  | `klasio-dev` | `http://localhost:5173` |

  Pull-request previews can't upload files, so test uploads on staging.
- Create **three R2 API tokens** with *Object Read & Write*, each applied to **one bucket only**. Development keys on a laptop must never be able to open staging or production files.

**Turnstile**
- Add a Turnstile widget (Managed mode) for `app.klasio.com` and `staging.klasio.com`.
- Local development uses Cloudflare's test keys, which always pass: site key `1x00000000000000000000AA`, secret key `1x0000000000000000000000000000000AA`.
- Tokens are single-use. The API verifies tokens itself on its own public endpoints (signup, student sign-in). For staff sign-in it passes the token on to Supabase Auth, which verifies it (C4).

- **Emits:** `R2_ACCOUNT_ID`, `R2_ENDPOINT`, three `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` pairs, the bucket names, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`.

### B2. Supabase (one organisation, two projects)
- Create the organisation **`Klasio`** with `ops@klasio.com` on the **Free plan**, and turn on 2FA for your Supabase account.
- Create two projects in **West EU (London), `eu-west-2`**:

  | Project | Purpose |
  |---|---|
  | `klasio-staging` | Staging; synthetic data only |
  | `klasio-prod` | Production |

  Generate a strong database password for each project when you create it, and store it. It can be reset later, but CI needs it.
- Free projects pause after 7 days of low activity; restore them from the dashboard. **Before the pilot, upgrade the organisation to Pro.** That costs about $35/month: $25 for the plan, plus $10 compute for the second project (the plan's $10 credit covers the first). Point-in-time recovery stays off until M2; Pro includes daily backups.
- For each project, record:
  - The project URL (`https://<ref>.supabase.co`) and the project ref.
  - The **publishable key** and **secret key** (Project Settings → API Keys). Don't use the legacy `anon` and `service_role` keys.
  - The JWKS URL: `https://<ref>.supabase.co/auth/v1/.well-known/jwks.json`. Under JWT Keys, make sure an asymmetric signing key is in use; if the project still signs with the legacy JWT secret, migrate it.
  - The **session pooler** connection string (Connect → Session pooler), used as `DATABASE_URL` by the API and the Phase 2 worker.
  - The database password.
- Configure Auth on each project (C4 adds email and CAPTCHA settings later):
  - **Sign-ups:** turn off *Allow new users to sign up*. The API creates every account (self-serve signup, invitations, student provisioning), so nobody can register directly with the publishable key.
  - **Providers:** keep email and password; turn phone and every other provider off. Magic-link and email-OTP sign-in aren't used (plan #20). Turn them off if the dashboard allows it; otherwise Phase 1 blocks those emails with the Send Email hook.
  - **MFA:** TOTP enabled. Phase 1 builds the enforcement (every staff session must reach AAL2).
  - **URL configuration:** set the Site URL to `https://staging.klasio.com` or `https://app.klasio.com`. On staging only, add the redirect URL `https://*-<vercel-team-slug>.vercel.app/**` so pull-request previews can complete auth flows.
- Leave the Data API's exposed schemas at the defaults (`public`, `graphql_public`). Phase 1 keeps security-definer helper functions in a schema that isn't exposed. Extensions such as `pg_cron` are enabled by migrations, not by hand.
- Account → Access Tokens: create a personal access token for CI.
- **Emits (per project):** `SUPABASE_URL`, the project ref, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_JWKS_URL`, `DATABASE_URL`, `SUPABASE_DB_PASSWORD`. **Once:** `SUPABASE_ACCESS_TOKEN`.

### B3. Vercel (Pro team)
- Create the team **`klasio`** with `ops@klasio.com` and upgrade it to **Pro** ($20 per seat/month).
- Install the Vercel GitHub app on the `klasio` organisation, with access to `klasio` and `klasio-prototype`.
- Projects:

  | Project | Repo | Settings | Domains |
  |---|---|---|---|
  | `klasio-web` | `klasio` | Root directory `apps/web`, with *Include files outside the Root Directory* on so the workspace packages build; framework Vite; production branch `production` | `app.klasio.com` → production; `staging.klasio.com` → the `main` branch; a preview per pull request |
  | `klasio-prototype` | `klasio-prototype` | Static site using its existing `vercel.json`; Deployment Protection → Vercel Authentication on for every deployment | None; team members only |
  | `klasio-marketing` | `klasio-marketing` | Created in Phase 17 | `klasio.com`, `www.klasio.com` |

- In Cloudflare, add the DNS records Vercel shows for each domain as **DNS only** (grey cloud). Vercel issues the certificates.
- `klasio-web` connects to its repo once the scaffold exists; its environment variables are in D4.
- **Emits:** hosting for the web app and the prototype.

### B4. Railway (one project, two environments)
- Create a Railway account (sign in with GitHub, email `ops@klasio.com`) on the **Hobby** plan ($5/month, including $5 of usage). In account settings, set the preferred region to **EU West (Amsterdam)**.
- Create the project **`klasio-api`** with two environments: `staging` and `production`.
- In each environment, add a service `api` from the `klasio` repo:
  - **No root directory.** This is a shared npm-workspaces monorepo, so builds run from the repo root.
  - Build command `npm run build --workspace apps/api`; start command `npm run start --workspace apps/api`.
  - Watch paths: `apps/api/**`, `packages/shared/**`, `packages/db/**`, `package.json`, `package-lock.json`.
  - Region: EU West (Amsterdam). Health check path: `/v1/health`.
  - Deploys: staging deploys the `main` branch; production deploys the `production` branch, which only the release workflow moves (D2).
- Custom domains: `api-staging.klasio.com` on staging and `api.klasio.com` on production. Hobby allows two. Add the records Railway shows in Cloudflare.
- Phase 2 adds a `worker` service (same repo, the outbox worker's start command, no domain).
- **Emits:** the API hosts. A `RAILWAY_TOKEN` is needed only if CI ever deploys directly.

---

## Stage C — Supporting services

### C1. Stripe (account only, for now)
- Create a Stripe account with `ops@klasio.com`, turn on 2FA, and stay in **test mode**. Add the legal entity and bank details once they exist (plan #10).
- Install the Stripe CLI; it forwards webhooks to your machine from Phase 13.
- Nothing else happens until Phase 13. Then:
  - **Products and prices (GBP):** centre plans `starter`, `growth`, `scale` and solo plans `solo_core`, `solo_pro`, each with a monthly and a yearly price. `solo_free` is free and needs no price. Also a storage add-on: one 100 GB block at £5/month.
  - **Customer portal:** configure it for plan changes, cancellation and invoice history (`POST /v1/billing/portal`).
  - **Webhook endpoints:** `https://api-staging.klasio.com/v1/webhooks/stripe` in test mode and `https://api.klasio.com/v1/webhooks/stripe` in live mode. Each endpoint has its own signing secret, and `stripe listen` prints a third for local use.
  - **Events:** `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`, `invoice.paid`, `invoice.payment_failed`, `charge.refunded`.
  - **Price ids:** decide where they're stored; the reference's `plans` table has no Stripe columns yet.
- **Emits now:** the account. **Phase 13:** `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` per environment, and the price ids.

### C2. Resend (transactional email)
- Create a Resend account with `ops@klasio.com` and turn on 2FA.
- The Free plan allows 3,000 emails/month, **100 emails/day** and 3 domains. Move to a paid plan before the pilot if invitations and claim emails could exceed 100 in a day.
- Add the domain **`send.klasio.com`** with the **Ireland (`eu-west-1`)** sending region. Resend keeps account data and email logs in the US whichever region sends, so list it as a sub-processor with that transfer.
- Add the DKIM, SPF and MX records Resend shows to Cloudflare as DNS-only records, and wait for **Verified**.
- DMARC for the whole domain, covering Workspace and Resend: a TXT record at `_dmarc.klasio.com` with `v=DMARC1; p=none; rua=mailto:dmarc@klasio.com`. Tighten to `p=quarantine` once the reports are clean.
- **API keys:** one key per environment (staging, production), with sending access restricted to `send.klasio.com`. Each environment's key serves both its API and its Supabase project's SMTP.
- **Webhooks:** `https://api-staging.klasio.com/v1/webhooks/resend` and `https://api.klasio.com/v1/webhooks/resend`, for `email.delivered`, `email.bounced` and `email.complained`. Each endpoint has its own signing secret.
- **Senders:** `no-reply@send.klasio.com` for auth and notification email, `billing@send.klasio.com` for invoices. Both use Reply-To `support@klasio.com`.
- Local development never uses Resend. Email goes to the mail catcher that `supabase start` runs (http://127.0.0.1:54324).
- **Emits:** `RESEND_API_KEY` and `RESEND_WEBHOOK_SECRET` per environment. **SMTP for C4:** host `smtp.resend.com`, port `465`, user `resend`, password = that environment's API key.

### C3. Sentry (error tracking)
- Create an organisation with `ops@klasio.com` and choose **EU (Frankfurt)** data storage. It can't be changed later. Use the Developer plan (free, one user).
- Create two projects: `klasio-web` (React) and `klasio-api` (Node.js).
- Keep the default data scrubbing on and don't send default PII. Leave Session Replay off, because screens show children's data.
- Create an organisation auth token for source-map uploads.
- **Emits:** `VITE_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`.

### C4. Supabase Auth wiring (after B1, B2 and C2)
On both `klasio-staging` and `klasio-prod`:
- **Custom SMTP:** host, port and user from C2, with that environment's Resend API key as the password; sender `no-reply@send.klasio.com`, name `Klasio`. Password-recovery and email-change mail now goes through Resend.
- **CAPTCHA protection:** enable it with provider **Turnstile**, using the secret key from B1.
- **Email templates:** brand the recovery and email-change templates. Phase 1 finalises the wording.
- **After the Pro upgrade:** turn on leaked-password protection.

### C5. PostHog — deferred
- Set it up in Phase 8, before the M1 pilot: EU cloud, staff roles only. The student role is never tracked (plan #11).

---

## Stage D — Repos, environments and wiring

### D1. Repository layout
The `klasio` monorepo:

```
klasio/                      private · npm workspaces · Node 22
├─ apps/
│  ├─ web/                  Vite + React + TS    → Vercel klasio-web (root directory apps/web)
│  └─ api/                  Fastify + TS         → Railway klasio-api (repo root, workspace commands)
├─ packages/
│  ├─ shared/               zod schemas, shared types (plan #3)
│  ├─ db/                   Supabase client factory, generated types
│  └─ ui/                   tokens.css, components (plan #1)
├─ supabase/                config.toml, migrations/, seed.sql, tests/
├─ e2e/                     Playwright smoke tests (plan #5)
├─ docs/
├─ .github/workflows/       ci.yml, release.yml
├─ .env.example             committed; real .env files are git-ignored
├─ .nvmrc                   22
└─ package.json, tsconfig.base.json, eslint.config.js, .prettierrc
```

- When the monorepo is scaffolded, move `Klasio-Data-Layer-Reference.md`, `klasio-development-plan.md` and this runbook from `klasio-prototype/docs/` into `klasio/docs/`. `INVENTORY.md` stays with the prototype.
- Other repos: `klasio-prototype` (the behavioural spec, deployed as Vercel `klasio-prototype`) and `klasio-marketing` (Phase 17).
- Git-ignore pattern: `.env*` followed by `!.env.example`.

### D2. Branches and release flow
- **`main`** is the default branch. Protect it: pull request required, required status check `ci`, no force pushes or deletions. A merge to `main`:
  1. runs `supabase db push` against `klasio-staging` (GitHub environment `staging`);
  2. deploys staging automatically: Vercel serves `staging.klasio.com`, Railway redeploys the staging API.
- **`production`** is protected so that only the release workflow can update it. Nobody pushes to it by hand.
- **`release.yml`** is a manually triggered workflow (`workflow_dispatch`, GitHub environment `production`):
  1. confirms the chosen `main` commit passed CI and is running on staging;
  2. runs `supabase db push` against `klasio-prod`;
  3. fast-forwards `production` to that commit, so Vercel and Railway deploy production from the branch.

  The workflow pushes with a GitHub App or fine-grained token that the branch restriction allows, stored as a `production` environment secret.
- Migrations must keep working with the code already running (expand first, contract in a later release), because the database changes before the new code deploys.

### D3. Where secrets live
- **Password manager:** every value, including the contents of local `.env` files.
- **Vercel (`klasio-web`):** browser-safe `VITE_` values, plus `SENTRY_AUTH_TOKEN` for the build. Never give that token a `VITE_` prefix.
- **Railway (per environment):** all server secrets.
- **GitHub environments:** only what CI and the release workflow need.

### D4. Environment variables

**Web → Vercel (`klasio-web`).** `VITE_` values ship to the browser and must not be secret.

| Variable | Production | Preview and staging (`main`) |
|---|---|---|
| `VITE_APP_ENV` | `production` | `staging` |
| `VITE_SUPABASE_URL` | prod project URL | staging project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | prod publishable key | staging publishable key |
| `VITE_API_BASE_URL` | `https://api.klasio.com` | `https://api-staging.klasio.com` |
| `VITE_TURNSTILE_SITE_KEY` | site key | site key |
| `VITE_SENTRY_DSN` | web DSN | web DSN |
| `SENTRY_AUTH_TOKEN` (build only) | token | token |

Pull-request previews share the staging database and API, so a preview whose migration isn't on staging yet will fail. Test schema changes locally.

**API → Railway (per environment)**

| Variable | Value |
|---|---|
| `APP_ENV` | `staging` / `production` |
| `WEB_ORIGIN` | `https://staging.klasio.com` / `https://app.klasio.com` (the API's CORS allow-list) |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Used when the API calls Supabase Auth for staff sign-in |
| `SUPABASE_SECRET_KEY` | Bypasses RLS — every use needs an explicit tenant check |
| `SUPABASE_JWKS_URL` | Verifies user JWTs |
| `DATABASE_URL` | Session pooler connection string (RPC transactions, outbox worker) |
| `R2_ACCOUNT_ID`, `R2_ENDPOINT` | `https://<ACCOUNT_ID>.eu.r2.cloudflarestorage.com` |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | That environment's bucket token |
| `R2_BUCKET` | `klasio-staging` / `klasio-prod` |
| `TURNSTILE_SECRET_KEY` | Verifies tokens on the API's own public endpoints |
| `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET` | That environment's key and webhook secret |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Added in Phase 13 |
| `SENTRY_DSN` | API DSN |

Railway sets `PORT` itself.

**CI → GitHub**

| Secret | Stored in | Used for |
|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | Repository | Supabase CLI |
| `SUPABASE_PROJECT_REF` | Environments `staging` and `production` | `supabase link` |
| `SUPABASE_DB_PASSWORD` | Environments `staging` and `production` | `supabase db push` |
| Release push credential | Environment `production` | Fast-forwarding `production` |
| `SENTRY_AUTH_TOKEN` | Repository (optional) | Source maps uploaded from CI |

CI runs on GitHub-hosted Ubuntu runners, which include Docker. Every pull request runs lint, typecheck and build; `supabase start`, `supabase db reset` and `supabase test db`; and the Playwright smoke tests.

**Local → `.env` files copied from `.env.example`**

| File | Values |
|---|---|
| `apps/web/.env.local` | `VITE_SUPABASE_URL=http://127.0.0.1:54321`, `VITE_SUPABASE_PUBLISHABLE_KEY` from `supabase status`, `VITE_API_BASE_URL=http://localhost:3000`, `VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA` |
| `apps/api/.env` | `SUPABASE_URL=http://127.0.0.1:54321`, keys from `supabase status`, `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres`, the `klasio-dev` bucket and token, `TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA`, SMTP pointed at the local mail catcher |

**Marketing → Vercel:** nothing until Phase 17.

### D5. Local development (Docker)
- Install Docker Desktop (WSL 2 backend on Windows), the Supabase CLI and Node 22 (from `.nvmrc`). Add the Stripe CLI in Phase 13.
- `supabase start` runs Postgres, Auth, Storage, Studio and a mail catcher; `supabase status` prints the local URLs and keys.
- Write migrations with `supabase migration new <name>` or `supabase db diff`. Rebuild the database from zero with `supabase db reset`, run the RLS isolation suite with `supabase test db`, and regenerate types with `npm run db:types`.
- Uploads use the `klasio-dev` R2 bucket, so local file features need an internet connection.
- Nothing local touches staging or production. Migrations reach them only through CI and the release workflow (D2).

---

## Cost summary

Checked September 2026. Prices exclude VAT; dollar amounts are converted roughly.

| Service | Plan | Until the pilot | From the pilot |
|---|---|---|---|
| Domain | `klasio.com` | ~£1/month (annual fee) | same |
| Google Workspace | Business Starter, 1 user | ~£7 | same |
| Password manager | 1Password or Bitwarden | depends on plan | same |
| GitHub | Team, 1 user | $4 | $4 |
| Cloudflare | Free; R2 usage; Turnstile | ~£0 (R2 has no egress fees) | pennies |
| Supabase | Free organisation → Pro | $0 | ~$35 (Pro + second project); point-in-time recovery adds ~$100 from M2 |
| Vercel | Pro, 1 seat | $20 | $20 |
| Railway | Hobby | $5 (includes $5 usage) | $5 + usage (worker from Phase 2) |
| Resend | Free → paid | $0 | Paid plan once email exceeds 100/day |
| Sentry | Developer | $0 | $0 until a second user |
| Stripe | — | No fixed fee | Per-transaction fees |
| **Total** | | **≈ £35/month** | **≈ £65/month** (≈ £140 with point-in-time recovery) |

**Not infrastructure, but required before real children's data:** register with the ICO and pay the data protection fee. Hold data processing agreements and a sub-processor list covering Google Workspace, Supabase, Cloudflare, Vercel, Railway, Resend (US-held account data), Sentry and Stripe.

---

## Verification checklist

- [ ] `ops@klasio.com` sends and receives mail; the `support@` and `dmarc@` groups exist
- [ ] `klasio.com` uses Cloudflare nameservers; Workspace MX, SPF and DKIM records and the DMARC record are live
- [ ] `students.klasio.com` has a null MX record
- [ ] GitHub organisation on Team with 2FA required; `klasio` created; `klasio-prototype` transferred
- [ ] Three private R2 buckets in the EU jurisdiction, each with CORS and its own working token
- [ ] Turnstile widget covers `app.klasio.com` and `staging.klasio.com`
- [ ] Supabase organisation with `klasio-staging` and `klasio-prod` in London; database passwords stored
- [ ] On both projects: sign-ups off, redirect URLs set, publishable and secret keys recorded, asymmetric signing key in use
- [ ] On both projects: SMTP through Resend and Turnstile CAPTCHA enabled
- [ ] Vercel Pro team with `klasio-web` and `klasio-prototype`; the prototype requires Vercel Authentication
- [ ] Railway `klasio-api` in EU West with `staging` and `production` environments and both API domains
- [ ] Resend domain verified in the Ireland region; API keys and webhook secrets exist per environment
- [ ] Sentry organisation in the EU region with `klasio-web` and `klasio-api`
- [ ] Stripe account exists in test mode
- [ ] GitHub environments `staging` and `production` exist; `main` and `production` are protected
- [ ] Every value is in the password manager and none is in a repo
- [ ] Docker Desktop and the Supabase CLI installed; `supabase start` runs locally

When every box is ticked, run the walking-skeleton prompt: the repo scaffold, the CI and release workflows, and `GET /v1/health` returning 200 on staging.

---

## Changes to the plan and reference

These decisions change the development plan, the data-layer reference and the Supabase README. Update them before Phase 0 starts:

- **Plan decision #8:** local development runs Supabase in Docker, and there is no cloud dev project. This also resolves the conflict with decision #5 and the Definition of Done's `supabase db reset`.
- **Plan decision #9:** R2 buckets use the EU jurisdiction, not a location hint.
- **Plan decision #6 and Phase 0:** add `packages/ui` and `e2e/`; the health check is `GET /v1/health`.
- **Plan Phase 1 and reference Part III:** staff sign-in goes through API endpoints (password step and TOTP step) that write `auth_attempts` and enforce `account_lockouts`. Remove the dependency on Supabase Auth verification hooks.
- **Reference conventions:** the "service-role key" becomes the Supabase secret key, and JWTs are verified with JWKS.
- **Plan Phase 17:** the tier names are settled as `starter`, `growth`, `scale` plus the solo tiers.
- **Plan Phase 13 and the reference `plans` table:** decide where Stripe price ids live.
- **`supabase/README.md`:** replace the local-development section and the folder layout.
