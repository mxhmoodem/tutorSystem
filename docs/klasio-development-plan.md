# Klasio — Development Plan

**23 phases · 6 milestones · vertical slices from Phase 2 onward**

Every phase from Phase 2 ships its own tables, RLS policies, RPCs, triggers, views, typegen, seeds, API endpoints, tests and UI together — end to end — before the next slice starts. This document is the authority on phase order, slice contents and locked decisions. Read alongside `docs/Klasio-Data-Layer-Reference.md` (v5), which is the authority on tables, policies and endpoints.

**Behavioural spec:** the frontend prototype plus `INVENTORY.md` define expected UI behaviour. Where the prototype disagrees with this plan or the reference, **these documents win**; every known gap is listed under [Known prototype divergences](#known-prototype-divergences) so it is fixed in the prototype or ignored deliberately, never copied into production.

---

## Locked decisions

| # | Decision | Value |
|---|---|---|
| 1 | Styling | Pure CSS · CSS Modules · token system in `packages/ui/src/styles/tokens.css` · no Tailwind |
| 2 | Server state | TanStack Query for all DB/API data · exactly seven globals in AppProvider (session, memberships, activeRole, activeCentre, activeTerm, featureFlags, accent) |
| 3 | Router / forms | TanStack Router · react-hook-form + zod (schemas shared via `packages/shared/src/schemas/`) |
| 4 | API framework | Fastify on Railway |
| 5 | Test tooling | Vitest · integration suite against local Supabase with per-role clients · Playwright for E2E smoke |
| 6 | Monorepo | npm workspaces (`apps/web`, `apps/api`, `packages/shared`, `packages/db`, `packages/ui`) |
| 7 | Email | Resend via outbox pattern · React Email templates · worker in `apps/api` |
| 8 | Database | Supabase (Postgres + RLS) · eu-west-2 (London) · **local development runs Supabase in Docker** (`supabase start`), so `db reset` and the pgTAP suite run locally and in CI · migrations promote through CI to staging, then production · no cloud dev project |
| 9 | Storage | Cloudflare R2 · three buckets (dev/staging/prod) · **EU jurisdiction**, not a location hint — endpoint `<account>.eu.r2.cloudflarestorage.com`, fixed at bucket creation · CORS per bucket · one token per environment · signed URLs via Railway only |
| 10 | Billing | Stripe · test mode until real legal entity · subscriptions at account level |
| 11 | Analytics | PostHog EU cloud · staff roles only · student role never tracked · deferred to Phase 8 milestone |
| 12 | No AI | No AI features, dependencies or copy anywhere in the platform. The Student Reports & Teacher Feedback system (Phase 8b) is the human-authored successor to the deleted AI-feedback feature. Homework auto-marking is deterministic comparison against teacher-authored answers and is named accordingly (`hw_auto_marking`) |
| 13 | No parent role | Guardians are data rows and email recipients only — no login, no dashboard |
| 14 | No Redis | Postgres owns queuing (outbox), rate limiting, and lockouts (`auth_attempts`, `account_lockouts`) |
| 15 | DSL | Capability on a membership row (`dsl_role` = `lead` \| `deputy`, one lead per centre) — not a separate role |
| 16 | Ownership | `accounts.owner_profile_id` — a field, not a membership role. Transfer = repoint one field (audited) |
| 17 | Multi-role | A person holds >1 role via >1 membership row — `UNIQUE (profile_id, centre_id, role)`. Dual-role view switch is a product feature |
| 18 | Family billing | Invoices bill a `families` row (siblings on one invoice); per-student attribution on lines; tax mode + rate configurable per centre |
| 19 | Marketing site | Next.js (separate repo) — supersedes the earlier Astro note |
| 20 | Staff auth | Supabase Auth email + password with **mandatory TOTP MFA**. No staff magic-link or SMS OTP login; magic links exist only for guardian approvals |
| 21 | Student auth | Centre code + username + **PIN or password** (`students.auth_method`); under-13s always PIN. No QR-badge login |
| 22 | Signup | **Self-serve**: public, rate-limited `POST /v1/auth/signup` creates account + owner + first centre + trial in one transaction; gated by `platform_settings.signups_enabled` |
| 23 | Class join codes | None. Enrolment is admin-managed; teachers ask for changes through `class_change_requests` |
| 24 | Solo tutor accounts | `accounts.kind = 'solo'` with one implicit centre; the tutor is owner + centre_admin + teacher + DSL lead, so every table and policy is reused. Sold `plans.audience = 'solo'` plans |
| 25 | Plan capabilities | Surfaces are gated by `plans.capabilities` / `plans.limits` through `plan_capability()` / `plan_limit()`. **Nothing compares a plan code.** Safeguarding, guardian/emergency contacts, consents and health records are never gated |
| 26 | Report lifecycle | `draft → published → archived`. No approval step; the centre standards gate at publish is the quality check |
| 27 | Report permissions | Six per-centre toggles in `centre_report_settings`, read inside RLS via `report_perm()` — `perm_view_others` is a read policy, not a UI filter |
| 28 | Predicted / target grades | Stored in `student_targets` (teacher judgement), one per pupil per subject, set on the class Progress tab — never derived from results; a pupil with none sees "Not set yet", with the indicative grade labelled beside it. "On track" derived; a new report starts from the stored prediction and publishing snapshots it |
| 29 | Rank exposure | Class rank shown to students only when `privacy_flag(centre, 'show_rank_to_students')` — a typed column on `centre_privacy_settings`, default **off** — and the student meets `rank_min_age` (default 13). Not a `centre_settings.features` key: a view reads it (decision #33). The class **average** has its own flag, also default off (decision #59) |
| 30 | Support | By **email** — no in-app ticket system. Impersonation (`support_sessions`) references the support email thread and is visible to the tenant |
| 31 | Groups | **Deferred.** No `groups` / `group_members`; `group` removed from assignment and announcement target enums. Tags cover ad-hoc cohorts. Revisit after M1 |
| 32 | Platform switches | `platform_settings` single-row table (maintenance, read-only, signups, status page, defaults). The free trial is not a switch: it is one offer per audience in `trial_offers` (#37). `feature_flags` is only for product rollout: a master switch plus an optional account allowlist — no percentages, cohorts or plan gates (plans gate through #25). The table, `flag_enabled()` and `v_account_flags` ship in Phase 1 so the `featureFlags` global (#2) has data from the start; the console to edit them ships in Phase 14 |
| 34 | Owner reach | The platform owner addresses **account admins only** — centre admins, which always includes the account owner — by announcement or DM. Never teachers or pupils: the centre is the data controller and reaches its own people. There is no bulk-message tool: owner → admins is a platform announcement, and must-land mail (a failed card, a deprecation) is event-triggered lifecycle email through the outbox |
| 35 | Maintenance vs read-only | **Maintenance** = the app is unavailable: tenants get a maintenance screen, the superadmin is exempt, minutes. **Read-only** = the app works but frozen: reads succeed, writes are refused behind a banner, hours; scoped to every account or listed accounts. A suspended account is read-only by definition. One helper, `writes_allowed(account)`, enforces all three in every tenant write policy, RPC and endpoint. Turning either mode **on** needs a confirmation; turning it **off** is one click, and while maintenance is on the console's Overview offers "Exit maintenance". Safeguarding writes are never frozen |
| 36 | Status page | Private until an SLA is signed or a customer's procurement asks for one (`status_page_public` defaults false; one switch, in Platform Controls). Until then an incident reaches affected admins as a platform announcement. Uptime is watched by an **external** monitor from launch |
| 37 | Pricing source of truth | The `plans` catalogue says what a plan **is** — limits, `capabilities` (what the app checks) and `marketing_bullets` (what the pricing page says; gates nothing). Stripe says what a customer **pays**. Their agreement is derived per plan (`not_in_stripe` / `price_changed` / `synced`) and only a synced plan is sold. A price change is a new Stripe Price created from the console: new customers get it, existing ones keep theirs unless given 30 days' notice. Signup and the marketing site read `GET /v1/plans`; the marketing site (a separate project and host) links in only through `/signup?plan=<code>`. The owner console's **Pricing** page holds both audiences' plans (centre and solo), the free trial for each audience (`trial_offers`) and the override codes; Platform Controls keeps the switches, flags and roles |
| 33 | Settings shape | Anything an invariant, RLS policy or view reads is a typed column on a per-domain centre settings row (`centre_register_settings`, `centre_timesheet_policy`, `centre_report_settings`, `centre_invoice_settings`, `comms_settings`); `centre_settings` jsonb holds presentation only |
| 38 | Centre code | A **routing key, not a credential**: it selects the centre; username + PIN/password authenticate. Unique across the platform and printed on every claim slip. Changing it (`change_centre_code`, account owner) is confirmed first — the dialog names what breaks, with the count of unclaimed slips and a reprint link — and the old code keeps resolving for **30 days**. After that the login says the code has *changed*, never that it is unknown |
| 39 | Setup checklist | Per centre. Completion is **derived** from the centre's data (a teacher invited, a pupil provisioned, a class created), never from opening a step. The only stored state is a per-centre dismissal of the dashboard prompt, which any centre admin restores from Settings → Centre. The prompt goes straight to the next step's flow, so it works for admins who cannot open the owner-only Centres page |
| 40 | Class stream vs announcements | Two things, one rendering. The Stream (`class_posts`) is the class's conversation; an announcement is a broadcast with receipts from the **one** composer. Class-scoped announcements appear inside the class Stream for the teacher and the admin alike, and the admin class page's "Post announcement" opens that composer with the class pre-selected — never a second composer |
| 41 | Reports vs Analytics | Two nav items. **Reports** is the student-report product — its governance figures and every report on one page, with Settings (Phase 8b). **Analytics** holds the generated exports — progress, attendance, homework, reporting activity and the Financial Overview (Phase 12) — and is admin-only, like invoices. The Financial Overview reads the invoice ledger (`v_invoice_report`); there is no second financial list |
| 42 | Centre documents | `resources.owner_kind = 'centre'`: a policy, handbook or scheme of work is published by the centre, not a person — always centre-wide, managed by any centre admin, untouched when anyone leaves. Only a centre admin publishes one. Pupils never browse the library; they reach a file only through an attachment |
| 43 | Safeguarding scope | Klasio **is** a safeguarding record, not only message monitoring: concerns keyed to a pupil or a colleague, raised by any member of staff from the app header on any screen, an append-only DSL chronology, a per-pupil chronology on the student profile (DSLs and admins only), and DSLs notified when one is raised. **Attendance patterns are not a safeguarding signal**: absence stays in at-risk (`v_student_risk`) and never feeds the DSL queue or opens an incident |
| 44 | Payment method | Never collected. The owner adds or changes a card only in Stripe's Customer Portal; Klasio mirrors brand · last 4 · expiry from the webhook (`subscriptions.card_*`) for display and warns from the calendar month before expiry, in-app and by email. Plan cards on the billing page list every capability, the ones a plan lacks greyed rather than hidden |
| 45 | Teacher dashboard hero | An ordered state machine, first match wins: **on leave → live now → register overdue → up next → done for today → no classes**. A class running now outranks a register that can still be backfilled for hours; an overdue register outranks a class that starts later — it is the one thing worth interrupting a teacher about, so it also shows under a live or upcoming class. Today's sessions come from the teacher's **effective** sessions (`v_session_state` × `v_effective_teacher`) on the one clock the register uses; cancelled sessions are listed as cancelled, never presented as up next; a session the teacher is covering says whose it is; leave (`staff_leave`) says who is covering which class |
| 46 | Class change requests | A teacher asks, the admin decides: new class · day/time · room · enrolment · stop a class · other. Requests land in a **Requests view on the admin Classes page**, badged on the Classes nav item and raised on the dashboard while any wait; the teacher sees each request's status and the admin's reply on My Classes and the class's Settings. **Approving a new class is a prefill** of create-class (subject, year, level, teacher, preferred slot) — the admin still owns day, time and room (D6). A decline carries a reason. The audit row is the record, not the delivery |
| 47 | Lessons vs planned lessons | A **lesson** is reusable content in a teacher's library (no class, no date); a **planned lesson** schedules it for one class on one date and holds only that delivery's notes and reflection. Edit the lesson once and every delivery gets it; a delivery that must diverge forks a copy. Materials attach to the lesson. The planner still opens on "class + date" — plan it from scratch or reuse from the library. Everything joins classes by id |
| 48 | Resource versions and folders | Replacing a file **keeps history** and every attachment (a pointer) gets the new version, flagged "updated since attached"; restore inserts a new version, never rewrites. **Personal folders** are each teacher's own filing layer — never a sharing mechanism, never visible to anyone else. The rest of the model stands: centre-scoped library, centre documents (#42), pupils never browse |
| 49 | Analytics is a lens | Navigation is for destinations reached with intent; analytics is a view of something already open. Homework has an **Assignments ⇄ Analytics** toggle in its header (no sidebar sub-item; the old id still deep-links). A class has **one Progress tab** — attainment trend, homework submission, pupils, grade spread and its assessments — not separate Progress and Analytics tabs. The teacher's top-level **Progress** is the cross-class destination |
| 50 | What a score is | Two series, **never blended**: **attainment** = assessment results (dated, marks out of a maximum — what a tuition centre is judged on) and **homework** = the average of marked work (effort and consistency). No stored score on a pupil; a pupil with no results has none, shown as such rather than 0%. One selector (`v_student_scores`) feeds Progress, the profile, at-risk, predictions and reports. A **tracker score column can count as an assessment**, so marks are never typed twice. A grade beside a percentage is an indicative bucket on the pupil's scale, labelled so |
| 51 | Report worklists | Counts live on the Reports rail, not in stat cards restating it. **Due this week** and **Overdue** are rail filters (teacher page and admin list) listing the reports owed — pupil · class · what's owed · how late — from the one due engine; a single overdue line appears above the list only while something is overdue. The standalone "Reports due" page is gone; the admin's governance figures stay. Grid/list is remembered per user |
| 52 | Timesheet periods | Periods are **anchored** to a centre start date, never to today, so every fortnight is the same fortnight and can match the pay run. Each period has a **deadline** (days after it ends, by a time) — so "late" exists and the admin gets a "not yet submitted" list — and a **lock** after which staff can no longer change or submit it |
| 53 | Teaching defaults | Centre policy, not a teacher preference: new homework starts from the centre's attempts, due window, lateness, auto-marking, review and release defaults (`centre_settings.teaching_defaults`, edited in Settings → Centre). No per-teacher layer; a teacher changes them per assignment |
| 54 | What pupils see | A centre setting — **percentage, indicative grade, or both** — for results on the pupil's own screens (`centre_settings.grading_defaults.pupil_display`). There is no teacher "grading scale": a Letter A–F option contradicts the one grade model (GCSE 9–1, A-Level A*–E, KS3), and a scale per teacher would make results incomparable across a centre |
| 55 | Teaching availability | A teacher's weekly availability and blackout dates (`staff_availability`, `staff_blackout_dates`) — set by the teacher, visible to and overridable by the admin, **advisory**: create-class warns ("Marcus doesn't teach Thursday evenings", or already teaching then) and the cover picker ranks by who is free. It replaces the unread per-user "working hours"; notification timing stays with the centre's quiet hours and notification preferences |
| 56 | Student dashboard | Every concept appears **once**. One ranked **Up next** in the main column pools homework, lessons and unread reports in the order a pupil should deal with them: overdue work, a lesson on now, work due today, today's lessons, work due tomorrow, tomorrow's lessons, later work, the rest of the week's lessons, an unread report. The hero carries three signals that move with what the pupil does (average result, attendance, homework due) and a line of **facts** — what's due and the next lesson — never a verdict: "on track" is defined against the teacher's target (`v_student_progress`) and is never asserted where it isn't derived. Latest reports is a main-column section; the rail holds identity, the calendar and announcements. No sessions-per-week figure |
| 57 | Teacher My Classes | The shared Table is the default — a teacher may have twenty classes. A remembered grid/list toggle offers cards that say what the teacher **owes** the class: work to mark, a register still due, the next session and the head count. Never a pupil's score |
| 58 | Pupil homework list | Grouped by deadline — **Overdue · Due today · This week · Later · Not open yet** — with no status tabs; handed-in work lives on Submitted and marked work on Results. The list screens use the app's type scale; the attempt screen keeps Homework's calm scale on purpose |
| 59 | Class average to pupils | A centre privacy flag, `show_class_average_to_students` on `centre_privacy_settings`, default **off** (AADC). While it is off, a pupil's Progress and returned homework compare them with their own previous result, never with classmates. Amends #29, under which the average followed the released-marks gate |
| 60 | Pupil session view | A pupil's sessions come from the timetable, with their own register mark. Any session opens a read-only view: when, where and who; their own attendance; homework made available between that session and the class's next; the lesson's student-visible files; and the lesson's **title, topic and objectives only when the teacher shares that planned lesson with the class** (`lesson_plans.share_with_class`, default off). Notes for the group, the structure and the reflection are the teacher's working document and never reach a pupil |
| 61 | Pupil settings | One page, no tabs, only controls that do something. **Account** is read-only — name, year, centre, username and guardian are centre-provisioned — with one sign-in action: change PIN or password, which needs the current one; a forgotten one follows #21's recovery routes. **Notifications** are in-app only (homework due, marks released, announcements, messages), under-13 defaults off. **No appearance, accessibility or study-reminder controls until those features exist** — deferred with the design already settled: a dyslexia-friendly font first; text size as relative units plus browser zoom, not a setting; study reminders default off, no streaks, never for under-13s. Sharing reports with a guardian is centre policy, not a pupil choice |
| 62 | Pupil data requests | A pupil aged 13 or over can ask for a copy of their data from Settings (`request_my_data()` → a `data_requests` row, kind `sar`, due one month after receipt). It reaches the centre admin as a notification and the owner console's DSAR queue; one open request per pupil. Under-13s go through a parent or the centre |
| 63 | Class backgrounds | A class's banner and its class cards share one background: one of 48 presets (8 colours × 6 patterns) plus an optional subject icon, drawn as inline SVG — no uploads, no image assets, no runtime dependency (the icons are vendored Phosphor duotone paths, MIT). Only an explicit choice is stored (`classes.cover_preset_id` / `cover_icon_id`); a class with none derives its background from its subject, deterministically per class id, and an id later dropped from the registry falls back the same way. A centre admin may change any class's background, a teacher only their own classes' (the class's teacher, not a temporary cover teacher); pupils see it and never change it. "Change background" is on the class page and in the class's Settings; create-class has no picker. The eight palettes are content colours, a recorded exception to brand tokens only, each AA-tested. The registry, validation and components are the class-covers kit (`class-covers-kit/` → `packages/shared` and `apps/web` in Phase 3). Replaces the per-class `banner_theme` |

---

## Slice order (vertical, from Phase 2)

Within every slice the order is fixed:

```
migration (tables + indexes + constraints)
  → RLS policies (same file as the table)
  → triggers + RPCs
  → derived views (v_ prefix)
  → typegen (npm run db:types)
  → seeds
  → API endpoints (Railway, only for privileged ops)
  → tests (isolation suite + unit + endpoint)
  → UI (routes + feature components)
```

**Dashboards are built by accretion.** Phase 1 ships placeholder dashboards because none of the data exists yet. Every later slice that produces a figure worth surfacing ends by adding its card to the relevant role dashboard — that is how the three real dashboards get built, rather than as one phase of their own. A card whose source is not yet built renders an empty state; it is never filled with invented data.

---

## Phase 0 — Walking skeleton
**Type:** horizontal infrastructure

- Monorepo scaffold: `apps/web`, `apps/api`, `packages/shared`, `packages/db`, `packages/ui` (tokens live in `packages/ui/src/styles/tokens.css` — decision #1)
- npm workspaces, Node 22, TypeScript strict, ESLint, Prettier
- CI: GitHub Actions — lint, typecheck, build on every PR
- Vercel projects wired (`klasio-web`, `klasio-marketing`); Railway project wired (`klasio-api`)
- `GET /v1/health` → `200 { status: "ok" }` deploying green on staging, plus `GET /v1/version`
- Structural folders seeded empty (features/, components/ui/, services/, supabase/tests/, e2e/)
- Web app: a catch-all **not-found route** — Vercel sends every path to the SPA, so an unknown address renders the not-found page inside the app. The prototype's standalone `404.html` is its design
- `.env.example` files; no secrets committed

**Exit:** `/v1/health` returns 200 on staging; CI green on a PR (including `supabase db reset` against the Docker stack); preview deploy per PR works.

---

## Phase 1 — Tenancy + auth spine
**Type:** horizontal foundations · **safeguarding-critical**

Tables: `accounts` (incl. `kind` centre/solo, `owner_profile_id` — decisions #16/#24), `centres` (incl. `code`, `is_primary`, `is_implicit`), `profiles`, `memberships` (**multi-role**: `UNIQUE (profile_id, centre_id, role)`, `dsl_role` lead/deputy — decisions #15/#17), `students` (incl. `family_id`, `auth_method`), `families`, `student_guardians`, `emergency_contacts`, `student_health`, `consents`, `invitations`, `student_claims`, `student_claim_batches`, `import_drafts`, `guardian_approvals`, `auth_attempts`, `account_lockouts`, `platform_settings` (seeded single row — signup needs `signups_enabled` from day one), `centre_settings`, `centre_privacy_settings` (typed, audited: `teacher_reads_health`, `show_rank_to_students`, `rank_min_age`, `show_class_average_to_students` — decisions #33 / #59), `audit_log` (the single sink every audited RPC writes to, with `actor_role` / `ip` / `support_session_id` from day one), `plans` + `subscriptions` (`plans` with its **full column set from day one** — `audience`, `price_monthly` / `price_yearly`, `sort_order`, `limits`, `capabilities`, `marketing_bullets` — seeded with one centre plan and one solo plan, so signup can stamp a trial, Phase 3 can enforce `max_students` and gate the waiting list, and Phase 7 can enforce `max_invoices_per_month`; Stripe sync, price ids, codes and add-ons arrive in Phase 13), `trial_offers` (one seeded row per audience — signup stamps the matching offer onto the new subscription; edited with `update_trial_offer` until the Phase 13 Pricing page), `support_sessions` (**created here, used in Phase 14**: `in_support_session()` sits in the canonical read pattern of every policy from this phase on, so the table it queries has to exist before the first policy does. It simply stays empty until the superadmin console can open one), `feature_flags` (master switch + optional account list — decision #32; flags are edited with `update_feature_flag` until the Phase 14 console)

RLS helpers introduced: `auth_uid()`, `is_superadmin()` (platform tables only — it grants no tenant data), `auth_centre_ids()`, `auth_account_ids()` (an array — one person can hold memberships under two accounts), `has_role()` (EXISTS over rows — multi-role safe), `is_account_owner()`, `is_dsl()`, `is_my_student()` (own classes **and** any class currently covered), `owns_profile()`, `in_support_session()`, `privacy_flag()`, `plan_capability()`, `plan_limit()`, `flag_enabled()`, `writes_allowed()` (maintenance, read-only and suspension — decision #35)

**Canonical write pattern from the first migration:** every INSERT / UPDATE / DELETE policy on a tenant table carries `and writes_allowed(account_id)`, and every tenant-writing RPC and endpoint calls it first. Like `in_support_session()` in the read pattern, retrofitting it later means rewriting every policy.

RPCs: `provision_account` (centre or solo; creates `centre_settings` now — each later slice that adds a domain settings row extends `provision_account` and backfills existing centres in its migration), `set_member_role` (add/remove membership rows), `set_dsl_role`, `transfer_ownership` (grants the incoming owner a `centre_admin` membership if they lack one, then repoints `owner_profile_id` — one transaction, that order), `invite_member`, `create_centre`, `change_centre_code` (audited — new platform-unique code, the old one kept as `previous_code` for 30 days; decision #38), `update_privacy_settings` (audited), `update_feature_flag` (audited)

Railway endpoints: `GET /v1/plans` (public, cached; CORS also allows `MARKETING_ORIGIN` — decision #37), `POST /v1/auth/signup` (public, rate-limited, idempotent — decision #22), `POST /v1/invites`, `POST /v1/invites/:id/resend`, `POST /v1/auth/staff/login` + `POST /v1/auth/staff/mfa/verify` (password and TOTP steps; both lockout-checked), `POST /v1/auth/student/login` (centre-code + username + PIN or password; lockout-checked; honours a changed code until `previous_code_until`, then answers `code_changed`), `POST /v1/auth/student/credential` (a signed-in pupil changes their own PIN or password; the current one is required and failures count toward the lockout — decision #61), `POST /v1/auth/student/claim`, `POST /v1/auth/guardian-approvals`, `POST /v1/auth/guardian-approvals/:token/confirm`

Auth: staff = email + password + mandatory TOTP (decision #20). Both steps run through the API endpoints above, which write `auth_attempts` and enforce `account_lockouts` (10 failures / 15 min → 30-min lock; students 5) — Supabase's password- and MFA-verification hooks would do this, but they need the Team plan, so the API owns it. Supabase Auth also requires a Cloudflare Turnstile token, so attempts that bypass the API are throttled at the source. Student PIN/password (decision #21).

Student provisioning: claim-slip flow — `student_claims` rows (in a `student_claim_batches` run) with claim code + synthetic email, `POST /v1/student-claims/batches/:id/slips` rendering the printable slip PDF, no email sent; public claim page with `self_set` PIN/password and under-13 guardian consent. CSV paste auto-saves to `import_drafts`.

Views: `v_platform_status` (the only way anyone but the superadmin reads `platform_settings`: maintenance, read-only when platform-wide, notices, signups, status page — never the read-only account list), `v_account_flags`, `v_my_student_record` (a pupil's own `students` row minus staff `notes` — the column-level gate RLS cannot express), `v_suspicious_activity` (`auth_attempts` grouped per identifier over a rolling window; the Phase 14 security console reads it)

Tests: **two-centre RLS isolation harness** — Account A vs Account B denial, per-role allow/deny for every table. This harness is the foundation every later slice appends to. Explicit multi-role cases: one profile with admin + teacher rows at the same centre passes both role checks. Ownership invariants: the owner always holds a `centre_admin` membership, so ownership needs no special case in RLS; `transfer_ownership` grants that membership before repointing; `set_member_role` refuses to remove a centre's last admin or the owner's own membership. Access scope: a teacher reads only their own students — another teacher's pupil, guardian, health, result and submission rows are invisible, and cover grants access for the covered dates only; a superadmin with no support session reads nothing at all; inside a session the never-admit tables (health, emergency contacts, consents, incidents, conversations, messages, flags, safeguarding files) stay invisible. Lockout: N failures lock, lock expires, success after expiry. Signup: one transaction creates every row or none; refused when signups disabled; under-13 student cannot be set to `password`; `/signup?plan=<code>` preselects an offered plan and ignores any other code. Platform switches: maintenance refuses every tenant write, and `maintenance_until` passing never ends it; read-only refuses writes for every account or only the listed ones, while reads succeed; a suspended account is read-only; `raise_concern` and message sends still go through under read-only; platform tables stay writable by the superadmin. Flags: disabled → off for every account; enabled with no list → on for every account; enabled with a list → on for those accounts only. Centre code: generation never reuses a live or in-grace code; an old code resolves only until `previous_code_until`, then returns `code_changed`; a centre admin cannot UPDATE `code` directly. Setup checklist: a step is done only when its data exists, and dismissing it for one centre leaves another centre's prompt showing.

UI: signup (centre or solo; plan list from `GET /v1/plans`; "signups are paused" when switched off), maintenance screen (the notice; the expected end, or that it is running late; a check every 30 seconds that reopens the app on its own; a safeguarding signpost — staff to their DSL, pupils to a trusted adult and Childline, 999 in an emergency) and read-only banner (both from `v_platform_status` and `writes_allowed()`), login (staff password + TOTP; student centre-code + username + PIN/password), TOTP enrolment, **multi-role view switch** (a dual-role user flips between admin and teacher views), **multi-centre switcher** (sidebar header, primary centre default), multi-role Team management, claim-slip print flow (the slip carries the centre code) + public claim page, People & invites tracker, per-centre setup checklist (derived completion; a dashboard prompt that goes straight to the next step, dismissible per centre and restored from Settings → Centre — decision #39), change-centre-code dialog with the unclaimed-slip count, reprint link and 30-day grace (decision #38), placeholder dashboards per role (each later slice adds its own cards — see *Dashboards are built by accretion* above)

**Exit:** a new centre admin signs up and enrols TOTP unaided; staff TOTP login works; student PIN and password login work; repeated failures lock an identifier; one profile in two centres sees correct data for each; a dual-role user switches views at one centre; ownership transfer grants a membership and repoints one field in a single transaction; RLS harness green.

---

## Phase 2 — Files + email infrastructure
**Type:** vertical slice · infrastructure

Tables: `files` (incl. `category`), `file_links`, `storage_rollups`, `storage_reconciliations`, `email_outbox`, `email_suppressions`, `processed_events`. `profiles.avatar_file_id` is added here too — the column can only exist once `files` does.

Railway endpoints: `POST /v1/files/sign-upload`, `POST /v1/files/:id/confirm`, `POST /v1/files/:id/sign-download`, `DELETE /v1/files/:id`, `POST /v1/webhooks/resend`

Retention: the category → retention matrix (none / archive / locked) enforced by `DELETE /v1/files/:id`; safeguarding files tombstoned, never hard-deleted.

Worker: outbox polling loop (30s), React Email rendering, Resend API, retry with backoff, idempotency keys; nightly **storage reconciliation** — list the R2 bucket, compare it with `files`, write one `storage_reconciliations` row (orphaned objects are reviewed, then swept; missing objects are an alarm)

Email templates: staff invitation, owner welcome, guardian approval magic link

Tests: isolation (files visible only within centre), quota enforcement, suppression list check at enqueue, delete refused for `archive`/`locked` categories, reconciliation reports an object with no `files` row as orphaned and a confirmed row with no object as missing

UI: Storage as an **account-level route**, not a Settings tab — quota is an account concern, while Settings is centre-scoped or personal (usage by category, pooled vs split, guarded delete). The superadmin console has its own top-level Storage page (Phase 14): platform total, per-account storage cost against that account's MRR, 30-day growth per account, and the latest reconciliation gap

**Exit:** file upload/download round-trip works; invitation email lands; outbox worker processes queued rows; a locked-category delete is refused.

---

## Phase 3 — Academic core
**Type:** vertical slice

Tables: `subjects`, `grade_scales`, `grade_bands`, `terms` (stored `is_active` flag — documented deliberate exception to derive-don't-store), `term_breaks`, `rooms`, `class_dimensions` (configurable year groups / levels / exam boards with inline add), `classes` (incl. `kind`, `hourly_rate`, `cover_preset_id` / `cover_icon_id` — decision #63), `class_settings`, `class_schedules`, `class_cover`, `class_change_requests` (incl. `new_class` with no class, `details`, `result_class_id`), `tags`, `taggables`, `waiting_list_entries`, `sessions`, `enrolments`, `attendance_records`, `staff_availability`, `staff_blackout_dates` (decision #55 — they rank cover and warn at create-class, so they ship with them)

RPCs: `set_active_term`, `enrol_student` (capacity + `plan_limit(max_students)`), `withdraw_enrolment`, `regenerate_sessions` (skips `term_breaks` — no phantom half-term sessions), `set_class_cover`, `request_class_change`, `decide_class_change_request`, `offer_waiting_list_place`, `rotate_calendar_token` (any user, own token — revokes every existing `.ics` subscription)

Triggers: `classes` INSERT → one `class_settings` row (`classes` is created through the Supabase client, so the settings row cannot come from an RPC)

Views: `v_class_summary`, `v_attendance_summary`, `v_enrolment_status`, `v_effective_teacher` (permanent teacher overridden by any covering `class_cover` row — schedule renders the cover teacher), `v_student_movement` (pupils joined and left per month, from `enrolments`)

Tests: isolation + `regenerate_sessions` skips term breaks + enrolment refused above plan student cap + class change request visible to requester and admins only + a `new_class` request with no class accepted, a class-scoped kind without a class refused, a decline without a note refused + availability rows editable by their owner and a centre admin only, and never refusing a class assignment + a class background set by a centre admin on any class and by a teacher on their own class only, refused for a pupil, another teacher and another centre, with unknown ids and malformed bodies refused and nothing written

Railway endpoints: `GET /v1/calendar/:token.ics` — a per-user, revocable timetable feed (token on `profiles.calendar_token`), subscribable from a phone calendar. Unauthenticated by design, so it returns only session times, titles and rooms; never pupil names. `PUT /v1/classes/:id/background` — a class's background, validated against the shared registry (decision #63)

UI: 3-step create-class flow with inline dimensions (advisory availability / double-booking warning, never a block — decision #55), class list, class detail workspace (hero banner with the class background picker — decision #63 — and tabs; the same background on the pupil's class cards), enrolment management, term picker, admin schedule grid (with cover; the cover picker ranks candidates by who is free), class change request form (new class · day/time · room · enrolment · stop · other) with the teacher's own requests and replies on My Classes and class Settings, admin **Requests** view on the Classes page with a nav badge — "Create class" opens create-class prefilled from a new-class request, a decline needs a reason (decision #46) — teacher availability editor (Settings → Teaching; admin view and override on the staff profile), cohort tags, waiting list (capability-gated), **Subjects list + subject detail**, **teacher My Students**, **student My Classes**, **student Sessions** (their own timetable, with the calendar-feed link; every session opens the read-only session view of decision #60 — when, where and who here, the pupil's own mark from Phase 4, homework set in the lesson from Phase 8, the shared lesson summary from Phase 12b and its student-visible files from Phase 12c)

Dashboard cards added this slice: today's sessions (admin + teacher), **teacher hero** (the ordered state machine of decision #45 — on leave · live · register overdue · up next · done · none; the overdue register fills in when Phase 4's session states arrive), timetable strip (teacher), teacher class requests waiting (admin alert), enrolment and capacity (admin), active students with net movement this month (admin — "+6 joined · −4 left", `v_student_movement`). The admin schedule card opens the session a row names in the same right-hand session drawer the timetable opens, over the dashboard — never the generic weekly grid. The alert strip reads today's sessions from the same source as the schedule card, ranks alerts (money, then cover, registers, pupils), shows at most three with "+N more", and says what it checked when nothing fires

**Exit:** admin can create a class and enrol students; active term resolves to one value everywhere; a cover assignment changes the effective teacher on the schedule for its date range only; a teacher's change request lands in the admin queue.

---

## Phase 4 — Register + timesheets (keystone)
**Type:** vertical slice · **derive-don't-store keystone**

Tables: `centre_register_settings`, `timesheet_entries`, `timesheet_adjustments`, `centre_timesheet_policy`, `staff_details` (incl. `pay_type`, `contracted_hours`), `staff_rates`, `staff_leave` (booked absence — prefills cover windows and keeps a session inside leave out of the missed-register queue), `register_unlocks`, `attendance_amendments`

RPCs: `submit_register` (keystone — attendance + session confirmation incl. `register_late` / `register_note` / `register_by_admin` / `delivered_by` / `delivered_minutes` + timesheet derivation for the delivering adult, in one transaction; consumes any active unlock), `log_timesheet_entry` (manual non-teaching work: prep/marking/meeting/training/cover/other; `teaching` type rejected), `approve_timesheet` (records `decided_by` / `decided_at`; a rejection must carry `decided_reason`, so a teacher can fix and resubmit), `adjust_timesheet`, `amend_attendance` (within `amendment_hours`, writes `attendance_amendments`), `grant_unlock`, `revoke_unlock`, `set_staff_rate` (audited), `update_my_staff_profile` (a staff member edits their own contact fields; pay and employment untouched)

Timesheet model: `timesheet_entries.type` = `teaching` (system-derived only) \| `prep` \| `marking` \| `meeting` \| `training` \| `cover` \| `other` (manually logged; `other` never paid); statuses `draft → submitted → approved / rejected → exported` — no `paid` status on a ledger-only platform. Period cadence from `centre_timesheet_policy.submission_frequency` only, **anchored** to `anchor_date` with a deadline (`due_offset_days`, `due_time`) and a lock (`lock_after_days`) — decision #52.

Views: `v_timesheet_summary`, `v_timesheet_pay` (pay eligibility: hourly / salaried / mixed × cover-or-extra × `pay_non_session` × `paid_categories`), `v_timesheet_periods` (period range from the anchor, due, lock and each teacher's submission state), `v_session_delivery`, `v_session_state` (the six derived register states, driven by `centre_register_settings` — see the reference), `v_my_staff_record` (a staff member's own `staff_details` row minus `notes` and `ni_number_ref`)

Register lock/unlock model:
- Six derived states (`upcoming`, `open_live`, `awaiting`, `lapsed`, `recorded`, `cancelled`) computed at read time; `sessions.status` stays the three-value persisted enum
- Register opens `pre_open_minutes` before start; freely takeable until grace end (end of day by default)
- **Natural backfill window** (first path back in): the register stays takeable — flagged late, reason required when `require_late_reason` — until `ends_at + backfill_hours` (default 72h; 168h for solo). Teachers are never locked out the moment a session ends
- After backfill, the register lapses and locks; a centre admin `grant_unlock` reopens it time-boxed (2h/4h/end-of-day/24h/48h); the grant is one-shot (consumed by the next `submit_register`), auto-expires, and the row is kept — the second path back in. An admin may also backfill directly (`register_by_admin`)
- Teacher self-serve per-mark amend within `amendment_hours` of submission; after that, unlock is required for a full re-take

Tests: keystone test — one `submit_register` call produces correct attendance rows + timesheet entry for `delivered_by`; **backfill window** (session derives `awaiting` until backfill end, submission flagged late, refused without a note when required, lapses after); settings row changes re-derive state; unlock lifecycle (grant → lapsed session derives `awaiting` → submit consumes + re-locks → expiry re-lapses; rows never deleted); pay eligibility matrix (each pay type × cover/extra × category toggle); manual `teaching` timesheet insert denied; amendment window enforced; cross-tenant denial on `register_unlocks` and `attendance_amendments`; **anchored periods** (the same period for any viewing date, monthly anchors on the 29th–31st clamp to the 28th) + deadline and lock derivation + a teacher write into a locked period refused; all audited RPCs assert `audit_log` row

UI: teacher Attendance (time-scoped view over derived-state sessions), register drawer (take/re-take, late reason, delivered-by, time delivered), **admin centre-wide attendance oversight** ("needs a register" list, admin backfill, unlock chooser), register settings, teacher timesheet (deadline banner, late and locked states) + admin review/export (CSV + print view) with the submission policy strip (cadence, period-1 start, deadline, lock) and a "not yet submitted" list, pay policy settings, staff attendance derived from registers

Dashboard cards added this slice: "needs a register" (admin + teacher; on the teacher hero an overdue register is its own state — decision #45), hours logged this period (teacher), attendance rate (admin)

**Exit:** teacher submits register; timesheet entry appears derived; a lapsed register locks and an admin unlock reopens it for the teacher, then re-locks on submit; amendments are audited; audit rows exist. No separately stored metrics or session states.

---

## Phase 5 — Class stream + announcements
**Type:** vertical slice

Tables: `comms_settings` (incl. `images_enabled`, `dsl_observer`, `message_retention`, `announce_authors`, `approval_workflow`), `announcements` (priority, pinned, expires_at; `pending_approval` status; nullable centre for platform scope), `announcement_targets` (multi-target audiences), `announcement_receipts`

> The class stream (`class_posts`, `class_post_comments`) moved to **Phase 9**: posts from or to a pupil run through the same safeguarding flag scan as messages, and that scan does not exist until then.

> `groups` / `group_members` are **deferred** (decision #31).

RPCs: `publish_announcement`, `approve_announcement`, `acknowledge_announcement`

Email templates: announcement notification (respects quiet hours + prefs), announcement awaiting approval

Views: `v_announcement_reach`, `v_unread_announcements`

Tests: isolation + target resolution (multi-target sets of centres/roles/years/subjects/classes resolve to the correct combined recipient set; platform-scope (superadmin) announcements reach the centre admins of the targeted centres and nobody else; expired announcements drop out of feeds) + approval workflow (teacher announcement cannot publish unapproved when required)

UI: announcement composer (multi-target picker, priority, pin, expiry, submit-for-approval; opened pre-scoped from the admin class page's "Post announcement" — decision #40), approval queue, inbox (pinned first), ack flow, superadmin platform announcements (one audience: account admins, all or chosen centres — decision #34)

**Exit:** admin publishes a centre-wide announcement; all staff see it; ack-required flow works; a teacher announcement waits for approval when the centre requires it.

---

## Phase 6 — Results + assessments
**Type:** vertical slice

Tables: `assessments`, `results`, `student_targets`

RPCs: `record_result`, `publish_results`, `set_student_target`

Views: `v_results_summary`, `v_class_performance`, `v_student_progress` (trend vs target — "on track"), `v_student_scores` (attainment and homework as two series — decision #50), `v_student_risk` (the single at-risk definition used by admin and teacher surfaces)

Tests: isolation + published flag (student cannot see until published) + a pupil reads no class mean from `v_results_summary` while `show_class_average_to_students` is off (decision #59) + `set_student_target` upserts one row per pupil per subject + one at-risk result for the same student regardless of viewer role + a pupil with no results has null attainment (never 0) and is not flagged on attainment + attainment and homework never combined into one figure

UI: the class **Progress** tab (decision #49 — attainment trend, homework submission, pupils with attainment · latest · trend · homework · indicative grade, grade spread on the class's scale) with its **Assessments** panel (create, enter marks — a blank is not a zero — publish/unpublish); the teacher's top-level **Progress** (all my classes or one: attainment, homework, who is slipping); results published view per student through the centre's **pupil grade display** (percentage / indicative grade / both — decision #54, set in Settings → Centre); predicted/target grade editor on the class Progress tab (one per pupil per subject, the indicative grade beside it as a guide — decision #28); student profile analytics from results

Dashboard cards added this slice: at-risk pupils from `v_student_risk` (admin + teacher — one definition, whoever is looking), progress summary (student)

**Exit:** teacher enters results; students see them only after publish; predicted and target grades show on the student profile and progress views from stored rows; no screen shows a score that isn't derived from results or marked homework.

---

## Phase 7 — Invoicing
**Type:** vertical slice

Tables: `centre_invoice_settings` (currency, VAT registration, **tax mode** none/exclusive/inclusive, tax label/rate, due days, auto-send, overdue reminders, reminder cooldown), `fee_plans`, `invoice_sequences` (one row per centre, seeded by `provision_account` / `create_centre` from here on — this migration backfills existing centres), `invoices` (billed to a **family** — decision #18; drafts via `issued_at NULL`; per-invoice tax override; totals snapshotted at issue), `invoice_lines` (per-student + per-class attribution, `vat_rate`/`vat_amount`), `payment_schedules`, `payments`, `invoice_reminders`

RPCs: `generate_invoices` (draft per family from delivered sessions × `classes.hourly_rate`), `issue_invoice` (audited; enforces `plan_limit(max_invoices_per_month)`), `send_invoice_reminder` (cooldown-checked), `record_payment` (audited), `reverse_payment` (audited — receipts are hand-entered, so they will be entered wrongly; the row is marked reversed with a reason, never deleted), `void_invoice` (audited)

Views: `v_invoice_status` (derived — never stored), `v_outstanding_balance`, `v_payment_schedule`

Railway endpoints: `POST /v1/invoices/:id/pdf`, `POST /v1/invoices/:id/send` (fails loudly on no billing email; cooldown), `GET /v1/invoices/export`, `POST /v1/invoices/import`

Email templates: invoice issued, payment reminder, overdue notice, payment received

pg_cron: due reminders (N days before instalment), overdue sweep — both respect the cooldown

Tests: isolation + status derivation unit tests (all schedule/payment combinations) + tax derivation (none / exclusive / inclusive; rate override per invoice) + family invoice covers multiple siblings' lines + reminder refused inside cooldown + send refused with no billing email + generated invoice matches delivered minutes + audited RPCs assert audit rows

UI: invoice ledger with a ledger-freshness line ("payments last recorded N days ago", from `v_outstanding_balance.last_payment_recorded_at`; warns after 14 days that outstanding may include money already received), invoice detail drawer (family header, per-sibling lines, mark paid, audit), payment entry, reminders, CSV reconciliation, invoice analytics, invoicing settings, the student profile's Fees tab (read from `v_invoice_status`, joined on the student id)

Dashboard cards added this slice: outstanding and overdue invoices (admin), revenue trend (admin) — both from `v_invoice_status`, never a second financial source

> **No guardian-facing screen.** Guardians never log in (decision #13); the invoice PDF emailed by `POST /v1/invoices/:id/send` *is* the guardian-facing artefact. Any future no-login view would be a signed magic-link page, and would need a token model in the reference first.

**Exit:** admin creates one invoice for a family of three siblings; status derives correctly from schedule vs payments; tax computes correctly in each mode; PDF emails to the family's billing guardian; a second reminder inside the cooldown is refused; CSV export/import round-trips.

---

## Phase 8 — Homework
**Type:** vertical slice

Tables: `assignment_folders`, `assignments` (incl. `available_from`, `time_limit_mins`, `attempts_allowed`, `allow_late`, `allow_review`, `hide_marks_until_released`, `settings`), `assignment_targets` (class \| student), `questions` (ten types, `hint`), `submissions` (incl. `attempt_count`, `started_at`, `is_late` snapshot, `time_spent_mins`, `overall_feedback`, `marked_at`, `marks_released_at`), `answers` (incl. `feedback`)

RPCs: `create_assignment`, `assign_homework`, `start_homework` (availability, lateness and attempts enforced), `submit_homework` (auto-marks objective types), `release_marks`

Railway endpoints: `POST /v1/homework/import-pdf` (deterministic rule-based parsing — **no AI**, decision #12)

Email templates: feedback returned, homework due reminder (off by default for under-13s)

Views: `v_homework_completion`, `v_submission_summary`, `v_submission_standing` (class average + rank; rank gated by `privacy_flag(centre, 'show_rank_to_students')` and `rank_min_age` — decision #29 — and the average by `privacy_flag(centre, 'show_class_average_to_students')` — decision #59), `v_my_submissions` + `v_my_answers` (a student's own rows with marks and feedback withheld until released — the column-level gate RLS can't express)

Tests: isolation + auto-mark unit tests for **all ten question types** (`mcq`, `multi`, `truefalse`, `numeric`, `expression`, `fillblank` and `match` proportional credit; `short_text`, `long_text`, `upload` teacher-marked) — asserting marking is a pure function of the response and the teacher-authored answer + teacher marking flow (per-question marks + feedback, overall feedback) + marks hidden from the student until released when held back + start refused before `available_from` / after due without `allow_late` / beyond attempts + rank never returned to an under-13 or when the toggle is off + class average never returned to a pupil while its flag is off

UI: assignment builder (ten question types, folders rail, settings panel seeded from the **centre's teaching defaults** — Settings → Centre, decision #53 — PDF import), pupil homework list grouped by deadline (decision #58), student start page + attempt view (optional countdown, off by default), teacher marking queue, mark release, returned-paper review, homework analytics as an **Assignments ⇄ Analytics** toggle in the Homework header, not a separate nav item (decision #49)

Dashboard cards added this slice: to-mark queue (teacher), homework in the pupil's ranked **Up next** (decision #56) and recent feedback (student) — all through `getHomeworkCounts`' production equivalent, never a second count

**Exit:** homework set, submitted, auto-marked (objective types), teacher-marked (subjective types), released and returned to the student; a scheduled assignment cannot be started early.

---

## Phase 8b — Student Reports & Teacher Feedback ⟶ Milestone M1: pilot-ready
**Type:** vertical slice · **flagship** · **Milestone M1**

The product's differentiator — human-authored written reports, the successor to the deleted AI-feedback feature.

Tables: `report_rules` (incl. `centre_default` target, `requirement` required/optional/off, `brief`), `report_templates` (incl. `shared`), `rating_scales`, `rating_levels`, `centre_report_settings` (publish standards, six permissions, PDF branding, notification toggles), `reports` (status `draft/published/archived`, `signature`, `predicted_grade` snapshot, `report_type`, folder, acknowledgement), `report_folders`, `report_user_state`

RLS helper: `report_perm()`

RPCs: `publish_report` (audited — enforces standards server-side, snapshots predicted grade, locks content, renders PDF, queues guardian email), `archive_report` (audited), `acknowledge_report`

Railway endpoints: `POST /v1/student-reports/:id/pdf`, `POST /v1/student-reports/:id/send`

Views: `v_reports_due` (**derived** due/upcoming queue: resolve the rule cascade student > class > tag > centre default, priority tie-break, then `required` × frequency × existing reports — due-ness never stored; `optional` never queued)

Email templates: report published (to guardians, PDF attached), report due / overdue reminders (gated by `centre_report_settings`)

Tests: isolation + cascade resolution (each level overrides the next; priority breaks ties; `off` and `optional` never queue) + due-engine unit tests (each frequency × existing-report combination) + publish refused below comment length / without signature / with an empty required section + each of the six permissions flips the matching policy (incl. `perm_view_others` read) + student sees `published` only + every report mutation audited + 4-tier ratings resolve through the scale tables + published report keeps its predicted grade after the target row changes

UI: admin Reports = the governance figures and all reports, with Settings (decision #41 — the exports are Analytics, Phase 12), the template builder as a route carrying breadcrumbs rather than a full-page takeover; report rules manager (centre default + overrides), template editor with locking, ratings taxonomy settings, standards / permissions / branding / notifications settings, **Due this week** and **Overdue** as rail worklists on the teacher page and the admin list — pupil · class · report owed · days over, from `v_reports_due`, with a one-line overdue notice only while something is overdue and counts on the rail rather than in stat cards (decision #51); the admin keeps its upcoming card; report writer with live standards gate, **bulk "Generate"** (open a draft for every pupil a rule has queued, from one action), folders + report tags + pinning, history drawer, published-report student view with acknowledge, PDF export

**M1 exit criteria:**
- Centre admin can self-onboard via signup (invite staff, create students, set term, create class, enrol students)
- Daily operations loop works: class → register → timesheet → invoice → payment
- Homework set, submitted, auto-marked, teacher-marked and released
- Report rule creates due entries; teacher writes and publishes a report that meets centre standards; guardian receives the PDF
- PostHog initialised (EU cloud, staff roles only, student never tracked)
- One friendly centre running as pilot

---

## Phase 9 — Messaging
**Type:** vertical slice · **safeguarding-critical**

Tables: `conversations` (kinds `direct` / `group` / `channel`; immutable `monitored` stamp), `conversation_participants`, `messages`, `message_flags` (multi-reason: `reasons[]`, `primary_reason`; targets either `message_id` or `class_post_id`), `flag_rules`, `class_posts`, `class_post_comments` (moved from Phase 5 — they share the flag scan)

RPCs: `start_conversation` (enforces preset matrix, stamps `monitored`, attaches DSL observers per `dsl_observer`), `resolve_flag`, `post_to_class`

Triggers: message **and class-post** INSERT → flag scan (keyword rules + built-in contact detectors + out-of-hours) → one `message_flags` row with every reason → Realtime broadcast to conversation channel; reject attachments in any thread with a student participant; class posts are text-only; reject updates to `monitored`

pg_cron: message retention sweep per `comms_settings.message_retention` (Phase 10 extends it to spare anything linked to an open safeguarding incident)

Views: `v_conversation_list`, `v_unread_counts`

Realtime: private conversation channels (broadcast-from-DB, auth via RLS)

Email templates: DSL flag alert (cannot be muted), message notification (respects prefs)

Tests: isolation + flag trigger raises every matching reason on one flag, for a message and for a class post + DSL observer auto-attached on staff↔student thread + `monitored` cannot be cleared + attachment in a student thread denied + class stream permissions (student posts only when `students_can_post`) + cross-centre message denial

UI: conversation list, thread view, message composer, class channels, class Stream tab (posts and the class's announcements in one feed, on the teacher's and the admin's class page — decision #40), DSL flag queue, comms settings (presets)

Dashboard cards added this slice: unread messages (every role), open safeguarding flags (DSL + admin — never mutable from the card)

**Exit:** staff↔student conversation has DSL observer; flagged message appears in DSL queue with all its reasons; a class stream post reaches enrolled students and is scanned the same way; cross-centre read returns empty.

---

## Phase 10 — Safeguarding incidents
**Type:** vertical slice · **safeguarding-critical**

Tables: `safeguarding_incidents`, `safeguarding_incident_notes`, `safeguarding_escalation_contacts`

RPCs: `raise_concern` (**any** staff, from any context — the person who notices is almost never the DSL; stamps `source`, sets `restricted` when the subject is a DSL, notifies), `log_safeguarding_incident`, `add_incident_note` (append-only), `resolve_incident` (all audited)

Views: `v_open_incidents`, `v_incident_timeline`

pg_cron: extends the Phase 9 retention sweep so messages and class posts linked to an open incident are never swept

Tests: isolation + append-only constraint (update/delete denied for all roles) + audit assertion on every RPC + support session cannot read incidents + retention sweep keeps incident-linked messages. **Raiser visibility:** a teacher who raises a concern reads their own incident row and its status, and **cannot** read its notes, another teacher's incident, or anything else in the log. **Restricted:** a concern whose subject holds a `dsl_role` is invisible to every DSL — the subject included — and readable only by the account owner; a DSL listing the log does not see it, and cannot learn of it by counting

UI: **concern-raise button in the app chrome, visible to every staff member on every screen** (not inside the Safeguarding page — a teacher never opens that), with the pupil or colleague pre-filled from context; "concerns I raised" list for the raiser showing status only; DSL incident log and timeline; resolve flow; where-to-escalate contacts, shown beside the log rather than buried in settings; a **Safeguarding tab on the student profile** — everything logged about that child in one place, DSLs and centre admins only (decision #43); new concerns in the DSL's notification bell

Tests add: a concern about the account owner has no in-app reader beyond the raiser's status, and the raiser is shown the escalation contacts (see *Open rulings*); no attendance pattern ever creates an incident or a DSL-queue item (decision #43).

**Exit adds:** a teacher with no safeguarding role raises a concern in two clicks from a class screen; the DSL sees it immediately; the teacher can show they reported it but cannot read the DSL's notes; a concern about the DSL never appears in that DSL's log.

**Exit:** teacher raises concern; DSL sees it; notes are append-only; delete attempt denied at DB level.

---

## Phase 11 — Notifications + preferences
**Type:** vertical slice

Tables: `notifications`, `notification_prefs` (incl. per-class overrides, digest), `user_preferences`, `dashboard_layouts`

Realtime: per-user notification channel (bell + badge counts)

pg_cron: storage quota warnings (80% + 100% of pooled account quota)

Views: `v_unread_notification_count`

Tests: AADC defaults (under-13 notification prefs default off for non-critical kinds) + a pupil's prefs are `in_app` only + class override beats account-wide pref + DSL safeguarding alerts cannot be disabled

UI: notification bell + dropdown, staff Settings (Account / Notifications / Appearance + role tab, reduce motion), the pupil's one-page Settings (decision #61 — read-only account with change PIN/password, in-app notification topics the bell obeys; no appearance or accessibility controls until built), dashboard customise, per-class notification toggles, read/unread state

**Exit:** bell badge updates in real time; under-13 accounts have safe defaults; appearance and accessibility preferences persist per user.

---

## Phase 12 — Analytics Exports
**Type:** vertical slice

> Renamed from "Reports" — that name belongs to the student-report-writing product domain (Phase 8b). This phase is admin analytics views + exports.

Views: `v_attendance_report`, `v_results_report`, `v_timesheet_report`, `v_invoice_report`, `v_student_progress`

Railway endpoints: `GET /v1/exports/:key` (CSV + PDF — renamed from `/v1/reports/*` to avoid the collision)

Tables: `data_requests` (SAR/erasure lifecycle incl. statutory `due_at`)

Tests: each view returns correct data for the role; export endpoint enforces tenant scope; financial analytics reconcile to the invoice ledger (no second financial source)

UI: an **Analytics** nav item under Operations, admin-only (decision #41) — analytics browser, filters, export buttons, date-range picker, centre report (browser print). The Financial Overview reads `v_invoice_report`

**Exit:** admin exports attendance analytics as CSV; data matches attendance_records; cross-tenant rows absent.

---

## Phase 12b — Tracking + Lesson Planner
**Type:** vertical slice · teacher working tools

Tables: `trackers` (incl. `description`), `tracker_columns` (seven kinds, matching the prototype redesign: score / checkbox / select / rating (1–5) / text / grade / date; `options`, `grade_scale_id`, `counts_as_assessment` + `assessed_on`), `tracker_entries`, `lessons` (reusable content, decision #47), `lesson_plans` (a planned lesson: `lesson_id`, class, date, `notes`, `reflection`, `share_with_class` — decision #60)

RPCs: `fork_lesson`

Triggers: `tracker_columns` flagged `counts_as_assessment` → an `assessments` row (`tracker_column_id`); `tracker_entries` writes on such a column → upsert `results` (decision #50)

Views: `v_my_lesson_plans` (a pupil's planned lessons for their enrolled classes — the lesson's title, topic and objectives only when `share_with_class`, never notes, structure or reflection — decision #60). Trackers have none — grids read directly; keep cell writes cheap

Tests: isolation (teacher sees own classes' trackers only; students have **no access** — internal working data); typed-column validation (score respects max, check is boolean, grade must be a label of its scale, select must be one of its options); UNIQUE (column, student) upsert semantics; a flagged score column's cells appear as results (and a student still cannot read the tracker); editing a lesson changes every delivery, `fork_lesson` repoints only its own delivery, a lesson still planned cannot be deleted, UNIQUE (class, date) on planned lessons, a pupil reads a planned lesson's summary only when it is shared with their class and never its notes or reflection, a pupil reads a lesson's student-visible files only when it is planned for a class they are in, reflection writable only once the date has passed

UI: Tracking Hub → Detail two-state structure (typed columns, keyboard navigation, settings slide-over — per the redesign spec; a score column's "counts as an assessment" switch), recents; lesson planner — **Planned** (coming up / taught, by class) and **My library** (lessons with "taught N times · last · next"), plan a class + date from scratch or reuse from the library, notes for the group, post-lesson reflection, "also planned for" history, fork a separate copy, optional session pinning, a **Share with the class** switch on a planned lesson (decision #60)

**Exit:** teacher builds a tracker with score/grade/select/check columns, fills cells with keyboard navigation; a student account cannot read any tracker row; a lesson written once is planned for two classes and edited in one place; planned lessons persist across sessions.

---

## Phase 12c — Resources (Materials library)
**Type:** vertical slice · teacher working tools · depends on Phase 2 (files) and 12b (`lesson_plans`)

Tables: `resources`, `resource_versions`, `resource_folders`, `resource_folder_items`, `resource_shares`, `resource_access_requests`, `resource_links`, `resource_usage_events`, `resource_access_log`

RLS helper: `resource_can_open()` — shared by policies and `sign-download`

RPCs: `share_resource`, `unshare_resource`, `request_access`, `decide_access_request` (audited), `attach_resource`, `detach_resource`, `update_resource_link`, `replace_resource_file`, `restore_resource_version`, `admin_open_resource` (audited), `release_restricted_to_centre` (offboarding, audited)

Views: `v_resource_usage_count`, `v_resource_recent`

Tests: visibility matrix (creator / other staff / admin / student × centre / on_request / private — see vs open); approval creates the share atomically; approver falls to an admin when the creator is deactivated; admin override writes `resource_access_log`; student sees a resource only via a `student_visible` link after `visible_from`; mark schemes default hidden from students; detach keeps the usage event; `sign-download` refuses when `resource_can_open` is false; `owner_kind = 'centre'` is insertable by a centre admin only, is always centre-wide and never appears in offboarding; the library lists only the active centre's rows; replacing a file keeps every earlier version, links resolve to the current one and report "updated since attached", restore adds a version rather than rewriting; a folder and its items are readable by their owner only and filing never changes who can open a file

UI: Materials library (teacher + admin — list/grid, facets, detail drawer, share, request, approve; admins can **publish as the centre** — decision #42), attach-resources panel on the lesson (so every class it is planned for shares it) and in the homework builder, **versions** in the detail drawer (replace with a "what changed" note, restore) and **My folders** in the rail (decision #48), staff offboarding release

**Exit:** teacher uploads an on-request worksheet; a colleague requests and is approved; it is attached to a lesson and a homework with a mark scheme hidden until after the deadline; "used in N places" reflects the links; replacing the worksheet shows "updated since attached" on both.

---

## Phase 13 — Stripe billing ⟶ Milestone M2
**Type:** vertical slice · **Milestone M2**

Tables: extends `plans` (adds `stripe_price_id_monthly` / `stripe_price_id_yearly` and `stripe_amount_monthly` / `stripe_amount_yearly`, and fills the catalogue — `audience`, `price_yearly`, `sort_order`, `limits`, `capabilities` and `marketing_bullets` have existed since Phase 1) and `subscriptions` (adds `billing_cycle`, Stripe ids, `paused_from/until`, `redeemed_code_id`) — both created in Phase 1; new: `plan_codes`, `plan_code_redemptions`, `storage_addons`, `billing_events`

RLS helpers: `plan_capability()` and `plan_limit()` arrived in Phase 1 and now read the full catalogue

RPCs: `manage_plan_code`, `redeem_plan_code` (validates max_redemptions, logs redemption — audited), `update_trial_offer` (audited)

Railway endpoints: `POST /v1/admin/plans/:id/stripe-prices` (creates the Stripe Prices for a plan's current amounts — the only way a price reaches Stripe, decision #37), `POST /v1/billing/checkout` (plan + cycle, audience-matched, synced plans only), `POST /v1/billing/portal`, `POST /v1/billing/pause`, `POST /v1/webhooks/stripe` (idempotent via `processed_events`; appends `billing_events`)

Email templates: subscription payment failed, trial ending, card expiring (the calendar month before `card_exp_*`)

Tests: webhook idempotency (replay produces no duplicate rows), plan limits and capabilities enforced (seats, storage, centres, students, invoices/month), no code path compares a plan code, trial stamped at signup unaffected by later platform offer changes, code redemption (each kind: free_trial / percent_off / fixed_price; max_redemptions enforced; duration expiry), storage add-on raises effective quota, pause and resume, a plan whose Stripe price is missing or out of date is absent from `GET /v1/plans` and refused by checkout, creating a new price leaves existing subscriptions on their old one

UI: plan picker (account owner, monthly/yearly, synced plans only), promo-code redemption in the billing tab, billing details, superadmin **Pricing** page (decision #37) — centre and solo plans side by side (monthly and yearly prices, limits, capability toggles, pricing bullets, Stripe sync state per plan with "Create Stripe price"), the free trial for each audience, and the plan-code manager, payment-method card (read-only brand · last 4 · expiry from the webhook, expiry warning, "Manage payment method" → `POST /v1/billing/portal`; no card field anywhere — decision #44), plan cards listing every capability with the missing ones greyed, capability-gated UI surfaces with upgrade prompts, centres page (plan-gated add-centre)

**M2 exit criteria:**
- Account owner can subscribe via Stripe Checkout
- Plan limits and capabilities enforced (seats, storage, centres, students, invoices)
- Stripe in live mode with real business details
- Full audit trail from Phase 1 covering all audited RPCs

---

## Phase 13b — Solo tutor accounts
**Type:** vertical slice · depends on Phase 13 (capabilities) and every domain it reuses

A private tutor runs their book on the same data model as a centre (decision #24): one implicit centre, the tutor holding owner + centre_admin + teacher + DSL lead.

**Behavioural spec:** the solo demo account in the prototype — `Solo.jsx` (shell and pages), `soloData.jsx` (state and derived model), `soloCapabilities.jsx` (the only file that knows tier ids) and `mocks/solo.mock.jsx` — documented in `docs/SOLO-DEMO-INVENTORY.md`.

Seeds: the three solo plans — `solo_free` (3 students, 3 invoices/month, 250 MB, core only), `solo_core` (25 students, unlimited invoices, 2 GB; group lessons, lesson planner, tracking, homework, reports), `solo_pro` (60 students, 10 GB; adds homework bank, report rules, at-risk flags, payment reminders, VAT, analytics exports, waiting list). They are ordinary rows in the one catalogue (`plans.audience = 'solo'`), priced and edited on the console's Pricing page; the solo surfaces read the live catalogue, never a copy

Behaviour: `provision_account` for `kind = 'solo'` creates the implicit centre, all memberships, `dsl_role = 'lead'`, `centre_register_settings.backfill_hours = 168` and `pre_open_minutes = 10`; one-to-one lessons record `delivered_minutes`; monthly invoices generated from delivered time × hourly rate; the tutor self-reopens a lapsed register with a mandatory reason; summer pause via `POST /v1/billing/pause`; concern log private to the tutor with escalation contacts; safeguarding, guardian and health records available on every tier

Tests: solo provisioning creates exactly one implicit centre and the four role rows; every capability key hides its surface when off and every limit refuses in the write path; self-unlock without a note refused; a solo account cannot add a second centre or be offered a centre plan; safeguarding surfaces present on `solo_free`

UI: solo shell (no role strip, no centre chrome), dashboard with "worth a look" signals, students, lessons (one-to-one + groups), timetable, registers with reopen-with-reason, invoices + earnings, safeguarding concern log, plan & billing (monthly/yearly, summer pause, meters), capability-driven nav and upsell cards

**Exit:** a tutor signs up as solo, adds students up to the tier cap, takes one-to-one and group registers, generates a month's invoices from delivered time, logs a concern, and moves between tiers with surfaces appearing and disappearing by capability alone.

---

## Phase 14 — Superadmin + privacy ⟶ Milestone M3
**Type:** vertical slice · **Milestone M3**

Tables: `jobs` (the one generic async-job table — the SAR and erasure exports below are the first callers, so it is created here and Phase 15 adds the import kinds). `support_sessions` was created in Phase 1 (the canonical read pattern queries it from the first policy onward); the time-box, the tenant-visible banner and the console that opens one land here. `audit_log` gains `actor_role`, `ip`, `support_session_id` (columns created in Phase 1, surfaced here)

Railway endpoints: `POST /v1/admin/accounts`, `POST /v1/admin/accounts/:id/suspend`, `POST /v1/admin/accounts/:id/restore`, `GET /v1/admin/system-health` (queue, outbox, webhook, delivery and cron figures the console cannot read itself), `POST /v1/privacy/erasure`, `POST /v1/privacy/sar-export`, `GET /v1/jobs/:id` (poll async jobs — GET, matching the reference and Phase 15)

RPCs: `provision_account` (also listed in Phase 1 — intentional: the RPC ships in Phase 1, the superadmin UI for it ships here), `set_account_plan` (writes `subscriptions` — `accounts` carries no plan or trial mirror), `update_platform_settings` (maintenance, read-only, signups, status page, defaults), `start_support_session` / `end_support_session` (≤ 60 min, tied to a support email reference, audited), `clear_lockout`, `block_identifier`, `update_data_request`, `request_my_data` (a pupil aged 13+ files their own SAR; one open request each — decision #62)

Support: by **email** (decision #30) — no ticket system and no bulk-message tool (decision #34). Impersonation banner visible to the superadmin **and** to the tenant's admins for the whole session; every action inside it carries `audit_log.support_session_id`; safeguarding and health tables never admit a support session.

Maintenance + read-only mode (decision #35): the console switches them — on behind a confirmation with the notice users will see, off in one click, and Overview shows "Exit maintenance" only while it is on. The tenant screen and banner arrive in Phase 1

Owner alerts: `notifications` rows for the superadmin, written by triggers and jobs from `billing_events`, `data_requests`, trial ends and seat/storage fill (reference §11), each also emailed, plus a weekly digest; the console bell reads the same rows

Email templates: import job finished, SAR export ready, support session started (to the account owner), owner alert, weekly owner digest

Tests: superadmin cannot access centre-level data outside a support session; support session expires and cannot read safeguarding/health; erasure anonymises profile but preserves safeguarding records; SAR bundle is complete; DSAR `due_at` set to one month and surfaced when close; `request_my_data` refused for an under-13 and returns the open request rather than filing a second; read-only mode blocks tenant writes; a support session without a support reference or a reason is refused; owner alerts fire once per source row

UI: superadmin console (dashboard with a range-scoped board-pack export, centres/accounts with detail popover and a secondary "New account" for hand-provisioned deals, users directory, revenue + failed payments from `billing_events`, **Engagement** — feature adoption per account, **System Health** — queue depth, webhook failures, outbox backlog, email delivery, last cron run, each figure naming its source, **Storage** — cost against MRR, growth, reconciliation gap, **Support sessions** — the session log and "Open session"), the pupil's **Request a copy of my data** in Settings with its status (decision #62) and the centre admin's notification for it, platform controls (maintenance, read-only with scope, signups, status page, feature flags as list-toggle-and-accounts — plans, trials and codes are on the Phase 13 Pricing page), owner alerts in the bell, security page (suspicious activity from `v_suspicious_activity`, clear/block), DSAR queue with deadlines, platform audit log, impersonation banner, privacy request workflow

**M3 exit criteria:**
- Superadmin can provision, suspend and restore accounts
- Support sessions are time-boxed, visible to the tenant and fully audited
- Erasure anonymises without deleting safeguarding records (anonymise-not-delete)
- SAR export produces a complete bundle within the statutory deadline

---

## Phase 15 — Bulk import/export
**Type:** vertical slice

Railway endpoints: `POST /v1/students/import`, `GET /v1/jobs/:id`

Tables: extends `jobs` (created in Phase 14) with the `student_import` and `invoice_import` kinds — no new table. One generic job row (kind, status, progress, `row_errors`, result file) backs `GET /v1/jobs/:id` for every import and export; `data_requests` keeps the statutory DSAR clock and its job points back at it, so the UI polls one endpoint rather than two

Tests: duplicate detection, validation error rows surfaced in job result, tenant scope enforced on all imported rows, import respects `plan_limit(max_students)`

UI: import wizard (CSV upload, validation preview, confirm), job status polling

**Exit:** admin imports 50 students from CSV; validation errors listed; successful rows created; cross-tenant import denied.

---

## Phase 16 — Hardening + AADC review ⟶ Milestone M4
**Type:** horizontal hardening · **Milestone M4**

- AADC formal review against concrete fields: student-role surface audit; homework countdown default off; rank exposure (`show_rank_to_students` default off, never for under-13s) and class-average exposure (`show_class_average_to_students` default off); under-13 notification defaults; student auth (under-13 PIN only). Accessibility and study reminders are deliberately **not built** (decision #61): record the deferral and its settled design — dyslexia-friendly font first, text size through relative units and browser zoom, study reminders default off with no streaks and never for under-13s — and confirm the app scales under browser zoom
- PostHog audit: confirm student role events are zero
- Sentry alert rules, source-map upload, release tagging formalised
- pg_cron retention/anonymisation sweeps (GDPR data lifecycle), incl. `auth_attempts` retention
- Performance: query plan review on every `v_*` view; add indexes where needed
- Security: RLS policy audit against reference matrix; lockout and rate limit tuning; webhook signature verification audit
- Accessibility: contrast, keyboard navigation, focus management pass across all UI surfaces
- Load test staging with representative data volumes

**M4 exit criteria:** AADC review complete; no student-role analytics events; all `v_*` views under 100ms at realistic data volumes; accessibility floor met.

---

## Phase 17 — Marketing site + onboarding polish ⟶ Milestone M5
**Type:** vertical slice · **Milestone M5**

- `klasio-marketing` repo: **Next.js** site (decision #19 — supersedes the earlier Astro note), `klasio.com`, SEO, structured data. Marketing owns top-of-funnel; console activation funnel starts at "Started signup"
- Marketing uses the canonical plan codes settled in the setup runbook: `starter`, `growth`, `scale`, plus `solo_free`, `solo_core`, `solo_pro`
- The marketing site's only link into the app is signup: `https://app.klasio.com/signup?plan=<code>`. It may read prices from `GET /v1/plans` (its origin is on that route's CORS allow-list) rather than hardcoding them (decision #37)
- In-app onboarding polish on top of the Phase 1 signup and setup checklist: guided first-run flow for new account owners (create centre → invite staff → create first class) and for solo tutors (add students → first lesson → first invoice)
- In-app help: contextual tips, empty-state guidance
- Email: owner welcome sequence (transactional, not marketing)

**M5 exit criteria:** marketing site live; new account can complete onboarding without support; NPS ≥ 7 from pilot centre.

---

## Phase 18 — Launch ⟶ Milestone M6
**Type:** horizontal launch preparation · **Milestone M6**

- Custom domain live (`app.klasio.com`, `klasio.com`)
- Storage-key migration: one-shot `tutoros.*` → `klasio.*` cutover (never piecemeal)
- Stripe live mode activated with real business details
- All accounts migrated from test to live Stripe
- Runbook: incident response, backup restore, scaling playbook
- Monitoring: Sentry alert routing, PostHog dashboards, Railway + Supabase health alerts, and the **external uptime monitor** (runbook C6) paging on `GET /v1/health` — the status page stays private (decision #36)
- Support: help docs, published support email address and response targets (decision #30)

**M6 exit criteria:** public launch; paying customers; monitoring alerting correctly; support channel live.

---

## Milestone summary

| Milestone | Phase | Signal |
|---|---|---|
| M1 — Pilot ready | 8b | Daily ops loop + reports flagship work; one friendly centre live |
| M2 — Billing live | 13 | Stripe live; plan limits and capabilities enforced |
| M3 — Platform complete | 14 | Superadmin, support sessions + privacy controls operational |
| M4 — Production hardened | 16 | AADC review done; performance + security pass |
| M5 — Marketing live | 17 | Public-facing site; onboarding polished |
| M6 — Launch | 18 | Public launch; paying customers |

---

## Definition of done (every slice)

A phase is not done until all of the following are true:

- `npm run lint && npm run typecheck && npm run test` all green
- `supabase db reset` runs clean from zero
- RLS isolation suite green (all new tables have Account A vs B cases)
- Audited RPCs have `audit_log` assertion in tests
- No mocks in `apps/web` tests
- Mapped screens work against real data on a preview deploy
- Seeds updated to include the new slice's demo data
- Phase inventory doc (`docs/PHASE-N-INVENTORY.md`) written

---

## Open rulings

Decisions these documents need before the phase that builds them. Each is recorded where the prototype currently behaves, so nothing ships by default.

| Ruling needed | Needed by | Current behaviour (prototype and reference) |
|---|---|---|
| A safeguarding concern **about the account owner**, who in a small centre is often also the DSL lead | Phase 10 | `restricted` is set and the owner is excluded as its subject, so the row has no in-app reader beyond the raiser's status; the raiser is shown the escalation contacts and told to go to the LADO directly. Alternatives to weigh: a named second person per account (an "allegations contact"), or routing to Klasio support under a support session — both carry their own risks |

---

## Known prototype divergences

The prototype disagrees with these documents in the places below. **The documents are correct.** Fix the prototype when the area is next touched, or leave it — but never port the prototype's version.

| Area | Prototype today | Production (reference v5) |
|---|---|---|
| Register backfill default | `REGISTER_SETTINGS.backfill_window` = 48h | `backfill_hours` default 72h (168h solo) |
| Register unlocks | Grant deleted from `store.unlocks` on use/revoke; history only in `unlockLog` | `register_unlocks` rows kept with `consumed` / `revoked` / `expired` status |
| Active term | Derived from today's date (`resolveActiveTerm`); `teacherMetrics.getCurrentTerm` reads `window.readTermIndicator`, which `index.html` never exposes, so it falls back to a hardcoded "Summer Term 2026" | Stored `terms.is_active` + `set_active_term` |
| Cover teacher | One `cls.cover` object per class (date window, derived by `coverActive()`) | `class_cover` rows (many ranges) + `v_effective_teacher` |
| Announcement audience | `audience{centreIds, roles, classIds}` jsonb on the row | `announcement_targets` child rows |
| Submission status | No `marked` state; release tracked by `marksReleasedAt`; a legacy `approved` status is still written and read as "graded"; a second `releaseAfterApproval` setting sits beside `hideMarksUntilReleased` | `not_started \| in_progress \| submitted \| marked \| returned` — no `approved`; `returned` ⇔ `marks_released_at`, so one flag (`hide_marks_until_released`) governs release |
| Question type names | `math`, `short`, `long` | `expression`, `short_text`, `long_text` |
| Report rules | Mock uses uppercase rule enums (`REQUIRED`, `WEEKLY`) and no `centre_default` rule type (a separate `defaultRule` object); tag targets are matched by **label string** rather than id; `half_termly` is missing from the frequency list | Lowercase enums; `target_type = 'centre_default'` row; tag targets resolve through `taggables`; the frequency set includes `half_termly` |
| Staff employment | Two vocabularies: `Full-time/Part-time/Hourly/Contract` (invite + add-teacher forms) and `salaried/hourly/mixed` + a single `hourlyRate` hardcoded per teacher (`TS_EMP_DEFAULTS`) | `employment_type` (legal) + `pay_type` (payroll) + `contracted_hours`, with rates in `staff_rates` (effective-dated) |
| Staff rating | `rating` (e.g. 4.9) still seeded on every teacher and defaulted to 0 on new staff, though no screen shows it any more | Not modelled — drop the field |
| Student at-risk | Stored `status: 'at-risk'` on the roster **and** three derived definitions (centre 75/50/55, teacher 85/60 + trend, solo "worth a look": attendance < 75, scores slipping, no homework in 21 days) | One derived `v_student_risk`; nothing stored |
| Report predicted grade | A new report is prefilled from the teacher's stored prediction and stays editable on the report itself | `publish_report` snapshots `student_targets.predicted_grade` at publish; the report holds no prediction of its own before then |
| Staff login | Password / magic link / OTP picker | Password + TOTP only |
| Student login | PIN / password / QR badge | PIN or password; no QR |
| Class join code | Derived 7-char code with a copy button on the Stream tab | No join code — remove the affordance |
| Groups | No UI (none to remove) | Deferred; `group` not a target type |
| Platform switches | Maintenance, read-only (with its account scope), signups and the status page share one row, `tutoros.platform.v1`, but the defaults sit in `settings_store_v1.superadmin.platform`. Read-only shows its banner while the prototype's stores still accept every write | One `platform_settings` row; `writes_allowed()` refuses the write in the database |
| Plan capabilities | The catalogue carries the capability keys and the plan editor sets them, but nothing reads them: every account sees every surface | `plan_capability()` hides each gated surface and refuses its writes (decision #25) |
| Audit | Three logs (`tutoros.audit.v1`, `tutoros.saudit.v1`, onboarding `roleLog`) plus per-module logs | One `audit_log` sink; domain history tables stay separate |
| Families | Exist only inside the invoices mock (`SEED_FAMILIES`) with parent contact inline; no `family_id` on the roster | `students.family_id`, billing contact via `student_guardians` |
| Session generation | Expands every matching weekday with no holiday awareness | `regenerate_sessions` skips `term_breaks` |
| Storage keys | `tutoros.*`, `klasio.*` and unprefixed keys (`admin_store_v4`, `homework_store_v9`, `reports_store_v2`, `settings_store_v1`) mixed | Single cutover at Phase 18 |
| Invoice shape | No line items: the total is the sum of a `payments[]` instalment schedule, each instalment flagged paid; `unmarkPaid` reverses a payment; `cheque` method; no stored drafts | `invoice_lines` per student and class; totals snapshotted at issue; drafts via `issued_at NULL`; payments are append-only receipts |
| Invoice defaults | Two stores disagree: `settings_store_v1.admin.centre` (`taxRate: 0`) and the invoice store (`taxRate: 0.20`, `taxMode`, cooldown) | One `centre_invoice_settings` row |
| DSL identity | `dslLeadId` / `dslDeputyIds` on the comms config, edited in Settings → Communications | `memberships.dsl_role` (decision #15); comms settings hold no people |
| Student attachments | A seeded pupil image sits in a monitored thread, though the composer blocks image attachments there | A thread with any student participant is text-only at the database level — `messages.file_id` must be null |
| Quiet hours | Block a pupil from sending in a monitored thread | Quiet hours gate notifications and raise an `out_of_hours` flag reason; they never block a message |
| Conversation start | Pupils start DMs with their teachers or an admin | `start_conversation` is staff-only and preset-checked |
| Flag lifecycle | Flags are **computed on read** (`computeFlags`), so editing the wordlist retroactively creates and destroys them; resolutions are `acknowledged` \| `escalated` | An INSERT trigger writes one permanent `message_flags` row per message or class post (`reasons[]`, `primary_reason`, `severity`), status `open \| resolved \| dismissed`. A safeguarding record must not disappear because a rule changed |
| Staff 2FA | An optional toggle in Settings → Account, off by default for the admin and teacher personas | Mandatory TOTP for every staff sign-in (decision #20) |
| Announcement controls | `announceAuthors` (`admins \| all`) and `approvalWorkflow` are editable but enforced nowhere; teachers can only post class announcements | `announce_authors` (`admins \| staff`) and `approval_workflow` gate `publish_announcement`; `pending_approval` is a real status |
| Parent role | A "Parent" role with "View child progress / Pay invoices" in Platform Controls, parent users in the directory, a "Parent Portal" usage metric | No parent role at all (decisions #13, #18) — guardians are data rows and email recipients |
| Student profile extras | Meetings/parents' evenings, teacher reviews with star ratings and per-lesson participation are synthesised for display | Not modelled — remove, or design them before they are built |
| Seat add-ons | "Added 14 student seats" appears as a purchasable add-on in the superadmin transactions | Seats change by changing plan; only storage has an add-on |
| Keys and data shapes | Attendance marks and tracker cells are keyed by **student name**; `submittedBy` doubles as the delivering adult; amendments carry no reason; `assignments.status` uses `active`; `classes.status` uses `paused`; report pins are stored on the report | Keyed by `student_id` throughout; `sessions.delivered_by` is its own column; `attendance_amendments.reason` is required; assignment status is `draft \| published \| closed` (`scheduled` derived); class status is `active \| archived`; pinning is per-user in `report_user_state` |
| Class identity | Homework and trackers still join classes by a free-text **group label** ("Year 10 – Group A"), which is not a column on anything, so renaming a class orphans both (lesson plans now join by class id) | Everything joins `classes.id`; the label is display text with no join meaning |
| Terms | Terms sit in the role-keyed `settings_store_v1`, so every centre on an account shares one term list | `terms` rows are per centre, each with its own `is_active` |
| Centre teaching settings | The teaching defaults and the pupil grade display live in the role-keyed `settings_store_v1.admin.centre`, so every centre on an account shares them (like terms) | `centre_settings.teaching_defaults` and `grading_defaults.pupil_display` per centre |
| Roster metrics | Each pupil row still stores an `attendance` and an `hw` percentage, which at-risk, the staff dashboards and the profile read (the stored `score` is gone — attainment derives from results; the pupil's own screens now read attendance from the registers) | Attendance from `attendance_records` (`v_attendance_summary`), homework completion from submissions (`v_homework_completion`); nothing stored on the pupil |
| Assessment results | Results hold marks only and the indicative grade is computed on read; a tracker column that counts as an assessment is read live from the grid, matched to pupils by **name**, with its published state kept beside it | `results.grade_band_id` on record; the flag creates an `assessments` row (`tracker_column_id`) and a trigger upserts `results` by `student_id` |
| Teaching availability | Kept on the admin store per teacher, one window per weekday | `staff_availability` rows (several allow a split day) + `staff_blackout_dates` |
| Register enforcement | The amendment window is checked only in the UI; consuming an unlock is never written to `unlockLog`; the solo self-reopen never expires and is not one-shot | `amend_attendance` enforces `amendment_hours` server-side, `register_unlocks` records `consumed_at`, and a solo reopen is time-boxed and one-shot like any other — the tutor being their own admin changes who grants it, not the rules |
| Grade taxonomies | Three run at once: the `klasioGrades` scales, a fixed A*–U list inside tracker grade columns, and the report 4-tier ratings | `grade_scales` + `grade_bands` are the one academic taxonomy and a tracker `grade` column names a `grade_scale_id`. Report ratings stay separate on purpose — they measure effort and engagement, not attainment |
| Storage mode | `tutoros.storage.v1` calls it `pooled \| per_centre` | `accounts.storage_policy` is `pooled \| split` — same idea, one spelling |
| Membership vocabulary | Role is `admin`; there is no `status`; pupils hold no membership row at all | `centre_admin`, a `status` of `active \| suspended`, and a pupil holds a `student` membership like anyone else — otherwise pupils are invisible to every role check |
| Homework folders | Assignment folders are global to the centre | `assignment_folders.created_by` with creator-only RLS — a teacher's filing is their own, not a shared taxonomy |
| Stored class standing | `classAvg`, `rank` and `classSize` are written onto each returned submission; the pupil's screen hides them unless the centre's privacy flags allow | `v_submission_standing` derives all three at read time, rank gated by `privacy_flag(centre, 'show_rank_to_students')` and `rank_min_age`, the average by `show_class_average_to_students` |
| Report lifecycle | Archived reports unarchive back to draft or published; bulk archive accepts drafts; bulk delete ignores status | `draft → published → archived` runs one way (#26). Only a published report archives, and `archive_report` is audited |
| Announcement priority | `normal \| important \| urgent` | `normal \| high` — a third level is never applied consistently, so it only dilutes the second |
| Message attachments | `attachments[]`, many per message | One `messages.file_id`, and null in any thread with a pupil participant |
| Comms wordlist | A flat `wordlist[]` of keywords on the comms config | `flag_rules` rows, each carrying its own pattern type and severity |
| Class stream | Posts are hard-deleted, authored only by teachers, and never surface to pupils | `class_posts.deleted_at` soft delete; pupils post when `students_can_post` and always read the stream |
| Seats | `studentSeats` and `teacherSeats`, labelled "per centre" in the plan editor but counted pooled on the Centres page — the two disagree | One pooled `limits.seats` counting **staff only**; pupils are `limits.max_students` |
| Audit trail | `tutoros.audit.v1` is capped at 500 entries, so the oldest are silently discarded | `audit_log` is append-only; only the retention sweep removes anything, and it is documented |
| Raising a concern | The centre app now has the header button, the pupil-or-colleague record, restricted routing and the per-pupil tab — but the chronology lives inline on the concern (`notes[]`, status changes written as notes), colleagues are comms identities (`u_*`) and pupils are matched to the roster by name. The solo demo keeps its own log with a different shape (`what` / `action`) | One `raise_concern` for centre and solo; `safeguarding_incidents` + append-only `safeguarding_incident_notes`; `student_id` / `about_profile_id` are profile ids |
| Concern notification | A bell item derived from open concerns nobody has added to yet; no email | A `notifications` row and a DSL email that cannot be muted (§9) |
| Escalation contacts | A read-only seed per centre (`COMMS_ESCALATION`); local-authority numbers are placeholders with no editor | `safeguarding_escalation_contacts` rows, edited by the DSL or a centre admin |
| Timesheet decisions | `reject(id, note)` nulls `approvedBy` / `approvedAt`; the note is optional and the review page calls it without one, so a teacher is told only "rejected" | `decided_by` / `decided_at` on every decision, `decided_reason` required on `rejected` |
| Under-13 | `underThirteen` is a stored boolean computed at import from `dob` **or from year group** when there is no dob | Derived from `students.dob` by the auth trigger; a null dob is treated as under-13 and year group is never consulted |
| Student provisioning vocabulary | `setupMethod: pending \| pin \| password` and `createdVia: csv \| single`; no separate auth method | `student_claims.setup_method = claim_slip \| admin_set_pin \| self_set`, `student_claim_batches.source = csv \| single`, and `students.auth_method = pin \| password` is its own column |
| Message retention | Settings → Communications offers `1y \| 3y \| 7y \| forever` | `comms_settings.message_retention` is `1y \| 3y \| 7y`; a child's messages are never kept indefinitely |
| Storage categories and R2 config | `CATEGORIES` has seven of the eight categories (no `reports`); the admin Storage panel edits bucket, region, jurisdiction and key id per account (`STORAGE_R2_SEED`, bucket `tutoros-prod-eu`) | Eight categories plus `claim_slips` and `exports`; R2 connection config is platform infrastructure (runbook B1) — never a tenant setting or screen |
| Payment method | `cash \| bank \| card \| cheque` | `cash \| bank \| card_external \| cheque` — the name records that the card was taken outside the portal |
| Card on file | A seeded `paymentMethod` on the subscription blob; "Manage payment method" is disabled | `subscriptions.card_*` written by the Stripe webhook; the button opens `POST /v1/billing/portal` |
| Setup completion | Derived from the roster for the primary centre only; other centres (which have no roster in the prototype) use step flags written when a flow finishes (`markCentreSetup`) | Derived from memberships, student claims and classes for every centre; `centre_settings.setup` stores only the dismissal |
| Centre codes | Held on the subscription store, with other accounts' centres in `ONB_CENTRE_DIRECTORY` and the signup-issued code on the onboarding store as a fallback; resolved in the browser | One `centres.code` / `previous_code`, resolved by `/v1/auth/student/login` |
| Student movement | Join dates from a seed map (`SEED_JOINED_ON`, merged by student id) and leavers from `SEED_LEAVERS`; no "mark as left" action | `v_student_movement` over `enrolments` and `students.enrolment_status` |
| Ledger freshness | The latest `marked_paid` / `import_reconciled` entry in the invoice audit trail | `v_outstanding_balance.last_payment_recorded_at` from `payments.created_at` |
| Resource centre scope | Seed rows carry no `centre_id` and read as the primary centre's; the owner facet keys a centre document as `__centre` | `resources.centre_id` NOT NULL; `owner_kind` is its own column |
| Brand strings | Synthetic student emails end `@<slug>.students.tutoros.app`; the superadmin mock and `404.html` use `status.klasio.io`, `billing@klasio.io`, `support@klasio.io` | `students.klasio.com`, `status.klasio.com`, `support@klasio.com` and `billing@send.klasio.com` (runbook A1, C2) — renamed with the storage keys in the Phase 18 cutover |
| Calendar export | Student Sessions builds a one-off `.ics` blob in the browser | A subscribable per-user feed at `GET /v1/calendar/:token.ics`, revoked by `rotate_calendar_token` |
| Pupil privacy settings | `admin.privacy` in the role-keyed `settings_store_v1`, so every centre on an account shares one set, and a change is logged to the prototype's audit store | `centre_privacy_settings` per centre, changed only through `update_privacy_settings` |
| Predicted and target grades | `klasio.targets.v1`, one row per pupil per subject name, with no grade-scale id — the scale is inferred from the class name | `student_targets` keyed by `subject_id`, carrying its `grade_scale_id` |
| Pupil notification topics | `klasio.studentNotifPrefs.v1` per pupil (four kinds), read by the bell | `notification_prefs` rows, `channel = 'in_app'` |
| Pupil data requests | `klasio.dataRequests.v1` in the browser; the centre admin gets a bell item but has no list to work it from, and the owner console merges it into its static DSAR mock | `request_my_data()` writes `data_requests`; the admin and the owner work it from the DSAR queue and the SAR export job |
| Pupil credential change | The Settings form validates and records only the change date; nothing typed is kept | `POST /v1/auth/student/credential` checks the current PIN or password, counts failures toward the lockout and updates the Supabase credential |
| Two clocks | Homework due dates run on the real clock while sessions, registers and the pupil's session view run on the demo clock (`getNow`), so "homework set in this lesson" rarely matches in the demo | One server clock |

---

## Prototype coverage gaps (documented, not yet prototyped)

Build-scope in the reference with no prototype surface. These carry design risk because no UI has tested the model.

**High risk — special-category data, prototype before Phase 1 ships them:**
- `student_health` (Art. 9), `emergency_contacts`, `consents` — the centre prototype has flat guardian fields, `underThirteen` and a `consentRecorded` boolean only: no SEN/EHCP, allergies, medications, emergency contact list or consent records. The solo demo goes a little further (free-text allergies and SEN notes, photo and data consent dates, a second guardian, escalation contacts), but nothing in either surface exercises the access model (centre_admin + DSL; teacher only when `privacy_flag(centre, 'teacher_reads_health')`), which needs a UI to argue with.
- `safeguarding_incidents` / `_notes` — now prototyped (decision #43): the header button for every staff member, concerns keyed to a pupil or a colleague, restricted routing to the owner, an append-only chronology with status changes, a per-pupil Safeguarding tab and escalation contacts beside the log. Still untested by any UI: the concern about the account owner (see *Open rulings*), and what a DSL hands over when a child moves centre.

**Medium risk — a model with no UI to validate it:**
- **Assessments & results** (Phase 6) — now prototyped (decision #50): a class's Progress tab creates assessments, takes marks per pupil and publishes them; tracker score columns can count as assessments; attainment everywhere derives from results (no stored score). Still untested by a UI: the grade-band snapshot on a result, results for a pupil who changes class mid-term, and bulk mark entry from a spreadsheet.
- **Rooms** and clash detection — rooms are free-text strings; no capacity or double-booking check.
- **Term breaks** — no holiday entry UI.
- **Families** as a first-class entity outside billing, and the guardian billing-contact chain.
- **Guardian approvals** beyond the under-13 consent screen (PIN reset by guardian magic link).
- **Staff leave** (`staff_leave`) — no booking UI; the cover form carries a free-text reason and staff attendance derives an "On leave" label from it.
- **One-to-one and off-site classes in a centre** — `classes.kind`, `location`, `hourly_rate`, `sessions.delivered_minutes` and `generate_invoices` from delivered time have no centre-app surface. Only the solo demo exercises them (`kind:'one'`, `place`, `rate`, a time-delivered field on its register).
- **Solo signup** — Phase 1's "signup (centre or solo)" and Phase 13b's exit criterion have no prototype: the solo demo is reached from the account switcher, never created. So the solo free trial set on the Pricing page has nothing to stamp it yet.
- **Class settings** — `students_can_post` / `students_can_comment` have no toggle; the stream is teacher-only.
- **Privacy settings** — no screen for `teacher_reads_health` (there is no health record to gate yet). Rank, its minimum age and class averages are in Settings → Centre → Pupil privacy (decision #59).

**Lower risk — infrastructure the prototype fakes by nature:** email outbox, suppressions and templates; Stripe webhooks, `processed_events` and add-on purchase; Stripe Price creation (the console mints a fake price id); the DSAR lifecycle (static mock); every System Health figure (mock, each naming its production source); the R2 reconciliation (no bucket to list); owner-alert email and the weekly digest (the bell derives alerts client-side); a support session's banner and audit row on the tenant's side (one browser plays both parties); `notification_prefs` per kind × channel and per-class overrides (staff have one flat section; pupils have their four in-app topics); `timesheet_adjustments`; `fee_plans`.

### Prototype surfaces, and where each is now scheduled

These were built before the plan described them. Each now has a phase, so nothing silently disappears in the rebuild — this table exists so you can check that claim.

| Prototype surface | Scheduled in |
|---|---|
| Admin, teacher and student dashboards | Built by accretion — each slice adds its own cards (see *Slice order*); Phase 1 ships placeholders |
| Subjects list + subject detail | Phase 3 |
| Teacher My Students · student My Classes | Phase 3 |
| Student Sessions + one-off `.ics` download | Phase 3, as a subscribable feed behind `GET /v1/calendar/:token.ics`; the session view fills in by accretion through Phases 4, 8, 12b and 12c (decision #60) |
| Reports bulk "Generate" | Phase 8b |
| Superadmin Engagement · System Health · Storage · Support sessions | Phase 14 (Storage's reconciliation data from Phase 2) |
| Status page preview (`?view=status`) | Not built in the product: the uptime monitor hosts the real page (runbook C6). The preview fixes its components and incident wording |
| Standalone `404.html` | Prototype only — the web app's not-found route (Phase 0) replaces it |
| Remembered-device centre code (`tutoros.lastCentre`) | Deliberately **not** scheduled — per-device convenience, not product state. It stays in the prototype and does not migrate |

---

*Last updated: September 2026, after the second documentation audit, the Phase 0 setup decisions (see `klasio-setup-runbook.md`) the owner-console rulings (decisions #34–#37) and the admin-surface rulings (decisions #38–#44: centre code, setup checklist, class stream, Reports vs Analytics, centre documents, safeguarding scope, payment method) and the teacher-surface rulings (decisions #45–#55: dashboard hero, class change requests, lessons vs planned lessons, resource versions and folders, analytics as a lens, what a score is, report worklists, anchored timesheet periods, centre teaching defaults, what pupils see, teaching availability) and the student-surface rulings (decisions #56–#62: student dashboard, teacher My Classes, pupil homework list, class average to pupils, pupil session view, pupil settings, pupil data requests) and class backgrounds (decision #63; 125 tables, 77 divergence rows, 1 open ruling) — pre-Phase 0, prototype only; no monorepo, CI, or `/v1/health` exists yet. Update this line and the relevant inventory doc as each phase ships.*
