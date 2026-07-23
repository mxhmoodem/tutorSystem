# Klasio — Development Plan

**19 phases · 6 milestones · vertical slices from Phase 2 onward**

Every phase from Phase 2 ships its own tables, RLS policies, RPCs, triggers, views, typegen, seeds, API endpoints, tests and UI together — end to end — before the next slice starts. This document is the authority on phase order, slice contents and locked decisions. Read alongside `docs/Klasio-Data-Layer-Reference.md` (v2).

> **Behavioural spec & arbiter (B10).** The **prototype** (this repository) and **`INVENTORY.md`** are the behavioural specification — they define what each screen and flow does. Where the prototype and the two design documents conflict, **`docs/Klasio-Reconciliation.md`** is the arbiter: it records the adjudicated ruling for every discrepancy found in the two-document audit. This plan and the Data-Layer Reference have both been reconciled against it.

---

## Locked decisions

| # | Decision | Value |
| :-: | :-: | :-: |
| 1 | Styling | Pure CSS · CSS Modules · token system in `packages/ui/src/styles/tokens.css` · no Tailwind |
| 2 | Server state | TanStack Query for all DB/API data · exactly seven globals in AppProvider (session, memberships, activeRole, activeCentre, activeTerm, featureFlags, accent) |
| 3 | Router / forms | TanStack Router · react-hook-form + zod (schemas shared via `packages/shared/src/schemas/`) |
| 4 | API framework | Fastify on Railway |
| 5 | Test tooling | Vitest · integration suite against local Supabase with per-role clients · Playwright for E2E smoke |
| 6 | Monorepo | npm workspaces (`apps/web`, `apps/api`, `packages/shared`, `packages/db`) |
| 7 | Email | Resend via outbox pattern · React Email templates · worker in `apps/api` |
| 8 | Database | Supabase (Postgres + RLS) · eu-west-2 (London) · no Docker for local dev (CLI pushes to cloud dev project) |
| 9 | Storage | Cloudflare R2 · three buckets (dev/staging/prod) · EU location hint · signed URLs via Railway only |
| 10 | Billing | Stripe · test mode until real legal entity · subscriptions at account level |
| 11 | Analytics | PostHog EU cloud · staff roles only · student role never tracked · deferred to Phase 8 milestone |
| 12 | No AI | No AI features, dependencies or copy anywhere in the platform. The Student Reports & Teacher Feedback domain is the successor to the deleted AI-feedback feature. |
| 13 | No parent role | Guardians are data rows and email recipients only — no login, no dashboard |
| 14 | No Redis | Postgres owns queuing (outbox), rate limiting, and lockouts |
| 15 | DSL | Capability (`dsl_role` = lead \| deputy) on a membership row — not a separate role; at most one lead per centre (A7) |
| 16 | Multi-role | A person holds multiple roles via multiple `memberships` rows (`UNIQUE (profile_id, centre_id, role)`); the dual-role view switch and multi-role Team management are first-class (A1) |
| 17 | Ownership | Account Owner is `accounts.owner_profile_id`, not a membership role; `transfer_ownership` repoints that field (A2) |
| 18 | Marketing framework | **Next.js** (per earlier locked decision — overrides the Astro reference that appeared in an earlier draft of Phase 17) |

---

## Slice order (vertical, from Phase 2)

Within every slice the order is fixed:

migration (tables + indexes + constraints)
→ RLS policies (same file as the table)
→ triggers + RPCs
→ derived views (`v_` prefix)
→ typegen (`npm run db:types`)
→ seeds
→ API endpoints (Railway, only for privileged ops)
→ tests (isolation suite + unit + endpoint)
→ UI (routes + feature components)

---

## Phase 0 — Walking skeleton

**Type:** horizontal infrastructure

- Monorepo scaffold: `apps/web`, `apps/api`, `packages/shared`, `packages/db`
- npm workspaces, Node 22, TypeScript strict, ESLint, Prettier
- CI: GitHub Actions — lint, typecheck, build on every PR
- Vercel projects wired (`klasio-web`, `klasio-marketing`); Railway project wired (`klasio-api`)
- `GET /health` → `200 { status: "ok" }` deploying green on staging
- Structural folders seeded empty (`features/`, `components/ui/`, `services/`, `supabase/tests/`, `e2e/`)
- `.env.example` files; no secrets committed
- **Commit both design docs into `docs/`** (B3): `docs/Klasio-Data-Layer-Reference.md`, `docs/Klasio-Development-Plan.md`, `docs/Klasio-Reconciliation.md`

**Exit:** `/health` returns 200 on staging; CI green on a PR; preview deploy per PR works.

---

## Phase 1 — Tenancy + auth spine (+ provisioning)

**Type:** horizontal foundations · **safeguarding-critical**

Tables: `accounts` (with `owner_profile_id`), `centres` (with `code`), `profiles`, `memberships` (multi-role), `students`, `student_claims`, `student_guardians`, `emergency_contacts`, `student_health`, `consents`, `invitations`, `guardian_approvals`

RLS helpers introduced: `auth_uid()`, `is_superadmin()`, `auth_centre_ids()`, `auth_account_id()`, `is_account_owner()`, `has_role()` (EXISTS over rows), `is_dsl()` (`dsl_role IS NOT NULL`), `is_my_student()`, `owns_profile()`

RPCs: `provision_account`, `set_member_role`, `transfer_ownership` (repoints `accounts.owner_profile_id`), `invite_member`, `create_centre`

Railway endpoints: `POST /v1/invites`, `POST /v1/invites/:id/resend`, `POST /v1/auth/student/login` (centre-code + username + PIN), `POST /v1/auth/guardian-approvals`, `POST /v1/auth/guardian-approvals/:token/confirm`, `POST /v1/students/:id/claim-slip` (printable claim slip via files pipeline — B6)

Tests: **two-centre RLS isolation harness** — Account A vs Account B denial, per-role allow/deny for every table. This harness is the foundation every later slice appends to. **Multi-role case:** one profile holding `centre_admin` + `teacher` in the same centre resolves both role surfaces (A1).

UI: login, TOTP enrolment, **role switcher built as the multi-role model** (multiple membership rows, dual-role Admin/Teacher view switch, multi-role Team management — B7), active-centre picker, student claim-slip provisioning + printable slips, placeholder dashboards per role

> **Note (B8):** `provision_account` appears in both Phase 1 and Phase 14 RPC sets **intentionally** — it is introduced here for account bootstrap and re-listed under the superadmin surface it ultimately backs in Phase 14.

**Exit:** staff TOTP login works; student centre-code + PIN login works; one profile in two centres (and in two roles) sees correct data for each; claim slips print and claim; RLS harness green.

---

## Phase 2 — Files + email infrastructure

**Type:** vertical slice · infrastructure

Tables: `files`, `file_links`, `storage_rollups`, `email_outbox`, `email_suppressions`, `processed_events`

Railway endpoints: `POST /v1/files/sign-upload`, `POST /v1/files/:id/confirm`, `POST /v1/files/:id/sign-download`, `DELETE /v1/files/:id`, `POST /v1/webhooks/resend`

Worker: outbox polling loop (30s), React Email rendering, Resend API, retry with backoff, idempotency keys

Email templates: staff invitation, owner welcome, guardian approval magic link

Tests: isolation (files visible only within centre), quota enforcement, suppression list check at enqueue

**Exit:** file upload/download round-trip works; invitation email lands; outbox worker processes queued rows.

---

## Phase 3 — Academic core (+ cover teacher)

**Type:** vertical slice

Tables: `subjects` (with `level`/`description`), `year_groups`, `levels`, `exam_boards` (configurable class dimensions — A11), `grade_scales`, `grade_bands`, `terms`, `term_breaks`, `rooms`, `classes`, `class_cover` (B6), `class_schedules`, `sessions`, `enrolments`, `attendance_records`

RPCs: `set_active_term` (audited — the authoritative `terms.is_active` flag, A9), `enrol_student`, `withdraw_enrolment`, `regenerate_sessions`, `assign_cover`

Views: `v_class_summary`, `v_attendance_summary`, `v_enrolment_status`, `v_effective_teacher` (substantive vs cover teacher, derived per session date — A11/B6)

Tests: isolation + `submit_register` derives `timesheet_entries` in the same transaction (keystone test) + cover teacher renders on the schedule within its date range, substantive teacher outside it

UI: class list, class detail, enrolment management, term picker, inline dimension add-new (subjects/year groups/levels/exam boards), assign-cover control on class + teacher profile

**Exit:** admin can create a class and enrol students; active term resolves to one value everywhere; a cover teacher shows on the schedule for the range, no stored `coverActive` flag.

---

## Phase 4 — Register + timesheets (keystone)

**Type:** vertical slice · **derive-don't-store keystone**

Tables: `timesheet_entries` (typed — A10), `timesheet_adjustments`, `staff_details`, `staff_rates`, `register_unlocks`, `attendance_amendments`

RPCs: `submit_register` (keystone — attendance + session confirmation + timesheet derivation in one transaction, consumes any active unlock), `approve_timesheet`, `adjust_timesheet`, `amend_attendance` (24h window, writes `attendance_amendments`), `grant_unlock`, `revoke_unlock`

Views: `v_timesheet_summary`, `v_session_delivery`, `v_session_state` (the six derived register states — see the Data-Layer Reference for the state machine and transition rules)

Register lock/unlock model:

- Six derived states (`upcoming`, `open_live`, `awaiting`, `lapsed`, `recorded`, `cancelled`) computed at read time; `sessions.status` stays the three-value persisted enum
- **Natural backfill window (A3):** `awaiting` holds while `now < ends_at + centres.register_backfill_hours` (default 72h, per-centre) OR an active unlock exists; submissions during natural backfill are flagged **late**. Once the window passes with no unlock the register `lapsed`-locks.
- A `lapsed` register locks; a centre admin `grant_unlock` re-derives it to `awaiting` time-boxed (2h/4h/end-of-day/24h/48h); the grant is one-shot (consumed by the next `submit_register`) and auto-expires; the register re-locks immediately on submit
- Teacher self-serve per-mark amend within 24h of submission; after that, admin unlock is required for a full re-take

Timesheet entry types (A10): `teaching` rows are system-derived only; `prep`/`marking`/`meeting`/`training`/`cover` may be entered manually by the teacher (self), subject to approval. Terminal status is `exported` (no `paid` — ledger-only platform).

Tests: keystone test — one `submit_register` call produces correct attendance rows + timesheet entry; unlock lifecycle (grant → session derives `awaiting` → submit consumes + re-locks → expiry re-lapses); natural-backfill late-flagging; manual non-teaching entry allowed, manual `teaching` insert denied; amendment window enforced; cross-tenant denial on `register_unlocks` and `attendance_amendments`; all audited RPCs assert `audit_log` row

UI: register view with derived-state rows, register drawer (take/re-take), admin centre-wide "needs a register" list, unlock chooser, teacher + admin timesheets with non-teaching entry

**Exit:** teacher submits register; timesheet entry appears derived; a lapsed register locks and an admin unlock reopens it for the teacher, then re-locks on submit; amendments are audited; audit rows exist. No separately stored metrics or session states.

---

## Phase 5 — Groups + announcements

**Type:** vertical slice

Tables: `groups`, `group_members` (A6), `comms_settings`, `announcements` (with `priority`/`pinned`/`expires_at`), `announcement_targets` (child audience table — A11, decision #4), `announcement_receipts`

RPCs: `create_group`, `manage_group_members`, `publish_announcement` (resolves `announcement_targets` into receipts), `acknowledge_announcement`

Email templates: announcement notification (respects quiet hours + prefs)

Views: `v_announcement_reach`, `v_unread_announcements`

Tests: isolation + scope resolution (centre/role/group/year/class/platform target rows resolve to the correct recipient set)

UI: announcement composer (audience picker over targets, priority/pin/expiry), inbox, ack flow

**Exit:** admin publishes a centre-wide announcement; all staff see it; ack-required flow works; a superadmin `platform`-scope announcement reaches all centres.

---

## Phase 6 — Results + assessments

**Type:** vertical slice

Tables: `assessments`, `results`

RPCs: `record_result`, `publish_results`

Views: `v_results_summary`, `v_class_performance`

Tests: isolation + published flag (student cannot see until published)

UI: assessment creation, results entry, results published view per student

**Exit:** teacher enters results; students see them only after publish.

---

## Phase 7 — Invoicing (+ families + VAT)

**Type:** vertical slice

Tables: `families` (with `billing_guardian_id` — A5, decision #3), `fee_plans`, `invoice_sequences`, `invoices` (`family_id` NOT NULL — replaces `student_id`), `invoice_lines` (with `student_id`, `vat_rate`), `payment_schedules`, `payments`. VAT config on `centres` (`vat_registered`, `vat_number`, `default_vat_rate`).

RPCs: `record_payment` (audited), `void_invoice` (audited)

Views: `v_invoice_status` (derived — never stored), `v_outstanding_balance`, `v_payment_schedule`. Invoice `subtotal`/`vat_total`/`total` and per-line `vat_amount` are **derived at read time** (A5).

Railway endpoints: `POST /v1/invoices/:id/pdf`, `POST /v1/invoices/:id/send` (to the family's billing guardian), `GET /v1/invoices/export`, `POST /v1/invoices/import`

Email templates: invoice issued, payment reminder, overdue notice, payment received

`pg_cron`: due reminders (N days before instalment), overdue sweep

Tests: isolation + status derivation unit tests (all schedule/payment combinations) + VAT derivation (registered vs not, mixed line rates) + family billing (siblings on one invoice, lines attribute per student, billing-contact resolution + eldest-student tie-break) + audited RPCs assert audit rows

UI: invoice list, invoice detail (per-sibling lines + VAT), payment entry, family-facing read-only view

**Exit:** admin creates a family invoice; siblings' lines attribute correctly; VAT derives; status derives from schedule vs payments; PDF emails to the billing guardian; CSV export/import round-trips.

---

## Phase 8 — Homework + Student Reports & Teacher Feedback ⟶ Milestone M1: pilot-ready

**Type:** vertical slice · **Milestone M1**

> **B1/B6 — this phase takes the deleted AI phase's slot.** The AI-feedback sub-feature is gone (decision #12); **Student Reports & Teacher Feedback** (A12) is its successor and the headline of this phase. Homework ships alongside it (no AI), completing the daily-ops loop for M1.

**Homework tables:** `assignments`, `assignment_targets`, `questions`, `submissions`, `answers` *(no `ai_feedback`)*

**Reports tables (A12):** `report_rules`, `report_templates`, `rating_scales`, `rating_levels`, `reports`

RPCs: `create_assignment`, `assign_homework`, `submit_homework` (auto-marks MCQ/numeric/expression; subjective queued for manual teacher marking), `draft_report`, `publish_report` (audited)

Railway endpoints: `POST /v1/homework/import-pdf`, `POST /v1/reports/:id/pdf` (render → R2), `POST /v1/reports/:id/send` *(optional)*

> **B1 — removed:** `POST /v1/homework/submissions/:id/draft-feedback` and its sibling, and the `approve_feedback` RPC. No Anthropic/AI call anywhere.

Email templates: report published (to guardians — no login), feedback returned, homework due reminder (off by default for under-13s)

Views: `v_homework_completion`, `v_submission_summary`, `v_reports_due` (**derived** due/upcoming engine from rules × frequency × existing reports; skips Optional — never stored due-flags)

Tests: isolation + auto-mark logic unit tests (all six question types) + report due-engine derivation (frequency × existing reports, Optional skipped) + report visibility (student sees own `published` only; guardian by email only) + publish audited

UI: assignment builder (six question types), student submission view, teacher marking queue; report templates + rating scales, report drafting from a rule or ad-hoc, upcoming/overdue reports card, publish + PDF

**M1 exit criteria:**

- Centre admin can self-onboard (invite staff, create students, set term, create class, enrol students)
- Daily operations loop works: class → register → timesheet → invoice → payment
- Homework set, submitted, auto-marked (objective) and manually marked (subjective)
- **Report drafted, published, and PDF delivered** (B1 — replaces "AI feedback drafted and approved")
- PostHog initialised (EU cloud, staff roles only, student never tracked)
- One friendly centre running as pilot

---

## Phase 8b — Teacher working tools (Tracking + Lesson planner)

**Type:** vertical slice *(B6 — shares the "teacher working tools" theme; renumber the tail if preferred)*

Tables: `trackers`, `tracker_columns`, `tracker_entries` (A13); `lesson_plans` (A14)

Views: tracker read models as needed

Tests: isolation (teacher own-classes read/write; centre_admin read; **student no access** to trackers) + `UNIQUE (column_id, student_id)` enforced + lesson-plan scoping

UI: Tracking Hub → Detail (typed columns score/check/text, keyboard nav, settings slide-over); lesson planner (per-class, optional per-session)

**Exit:** teacher builds a tracker grid and enters values; students cannot see it; lesson plans persist per class/session.

---

## Phase 9 — Messaging

**Type:** vertical slice · **safeguarding-critical**

Tables: `conversations`, `conversation_participants`, `messages`, `message_flags`, `flag_rules`

RPCs: `start_conversation` (enforces preset matrix, attaches DSL observer), `resolve_flag`

Trigger: message INSERT → flag scan against `flag_rules` → `message_flags` row if matched → Realtime broadcast to conversation channel

Views: `v_conversation_list`, `v_unread_counts`

Realtime: private conversation channels (broadcast-from-DB, auth via RLS)

Email templates: DSL flag alert (cannot be muted), message notification (respects prefs)

Tests: isolation + flag trigger fires correctly + DSL observer auto-attached on staff↔student thread + cross-centre message denial

UI: conversation list, thread view, message composer, DSL flag queue

**Exit:** staff↔student conversation has DSL observer; flagged message appears in DSL queue; cross-centre read returns empty.

---

## Phase 10 — Safeguarding incidents

**Type:** vertical slice · **safeguarding-critical**

Tables: `safeguarding_incidents`, `safeguarding_incident_notes`

RPCs: `raise_concern` (any staff, from any context), `log_safeguarding_incident`, `add_incident_note` (append-only), `resolve_incident` (all audited)

Views: `v_open_incidents`, `v_incident_timeline`

Tests: isolation (DSL/admin only) + append-only constraint (update/delete denied for all roles) + audit assertion on every RPC

UI: concern-raise button (always visible to staff), DSL incident log, incident timeline, resolve flow

**Exit:** teacher raises concern; DSL sees it; notes are append-only; delete attempt denied at DB level.

---

## Phase 11 — Notifications + preferences

**Type:** vertical slice

Tables: `notifications`, `notification_prefs`

Realtime: per-user notification channel (bell + badge counts)

`pg_cron`: storage quota warnings (80% + 100% of pooled account quota)

Views: `v_unread_notification_count`

Tests: AADC defaults (under-13 notification prefs default off for non-critical kinds)

UI: notification bell + dropdown, preferences page, read/unread state

**Exit:** bell badge updates in real time; under-13 accounts have safe defaults.

---

## Phase 12 — Analytics Exports

**Type:** vertical slice *(B5 — renamed from "Reports" to avoid colliding with the product's Student Reports feature)*

Views: `v_attendance_report`, `v_results_report`, `v_timesheet_report`, `v_invoice_report`, `v_student_progress`

Railway endpoints: `GET /v1/reports/:key/export` (CSV + PDF) — analytics/export exports, distinct from the product Reports domain

Tables: `data_requests` (SAR/erasure lifecycle)

Tests: each view returns correct data for the role; export endpoint enforces tenant scope

UI: analytics browser, filters, export buttons, date-range picker

**Exit:** admin exports attendance analytics as CSV; data matches `attendance_records`; cross-tenant rows absent.

---

## Phase 13 — Stripe billing (+ plan override codes) ⟶ Milestone M2

**Type:** vertical slice · **Milestone M2**

Tables: `plans`, `subscriptions` (with `redeemed_code_id`), `plan_codes`, `plan_code_redemptions` (A11), `feature_flags`, `centre_settings`, `storage_addons`

RPCs: `redeem_plan_code` (audited)

Railway endpoints: `POST /v1/billing/checkout`, `POST /v1/billing/portal`, `POST /v1/webhooks/stripe` (idempotent via `processed_events`)

Email templates: subscription payment failed

Tests: webhook idempotency (replay produces no duplicate rows), plan limits enforced via `feature_flags`, plan-code override (free_trial/percent_off/fixed_price for N months) resolves to the correct effective price and expires

UI: plan picker (account owner), billing portal link, redeem-code + billing details (admin Billing settings tab), superadmin plan-code management, feature-gated UI surfaces

**M2 exit criteria:**

- Account owner can subscribe via Stripe Checkout
- Plan limits enforced (seats, storage, centres)
- Price-override codes redeemable and time-bounded
- Stripe in live mode with real business details
- Full audit trail from Phase 1 covering all audited RPCs

---

## Phase 14 — Superadmin + privacy (+ maintenance mode) ⟶ Milestone M3

**Type:** vertical slice · **Milestone M3**

Tables: `platform_settings` (maintenance mode + impersonation banner — A11/B6)

Railway endpoints: `POST /v1/admin/accounts`, `POST /v1/admin/accounts/:id/suspend`, `POST /v1/privacy/erasure`, `POST /v1/privacy/sar-export`, `GET /v1/jobs/:id` (poll async jobs — B4, was erroneously `POST`)

RPCs: `provision_account` *(see Phase 1 note — intentional re-listing, B8)*, `set_account_plan`, `toggle_feature_flag`, `set_maintenance_mode` (audited), `start_support_session` (scoped, time-boxed, audited — completes the impersonation feature, with the impersonation banner sourced from `platform_settings`, B6)

Email templates: import job finished, SAR export ready

Tests: superadmin cannot access centre-level data outside their scope; erasure anonymises profile but preserves safeguarding records; SAR bundle is complete; maintenance mode gates non-superadmin access; impersonation banner shows during a support session

UI: superadmin dashboard (platform health, account list, impersonation log, maintenance toggle), privacy request workflow

**M3 exit criteria:**

- Superadmin can provision, suspend and restore accounts
- Erasure anonymises without deleting safeguarding records (anonymise-not-delete)
- SAR export produces a complete bundle
- Maintenance mode + impersonation banner operational

---

## Phase 15 — Bulk import/export

**Type:** vertical slice

Railway endpoints: `POST /v1/students/import`, `GET /v1/jobs/:id`

Tables: async job tracking (extend `data_requests` or add `import_jobs`)

Tests: duplicate detection, validation error rows surfaced in job result, tenant scope enforced on all imported rows

UI: import wizard (CSV upload, validation preview, confirm), job status polling

**Exit:** admin imports 50 students from CSV; validation errors listed; successful rows created; cross-tenant import denied.

---

## Phase 16 — Hardening + AADC review ⟶ Milestone M4

**Type:** horizontal hardening · **Milestone M4**

- AADC formal review: student-role surface audit, streak/nudge audit, privacy defaults, rank exposure
- PostHog audit: confirm student role events are zero
- Sentry alert rules, source-map upload, release tagging formalised
- `pg_cron` retention/anonymisation sweeps (GDPR data lifecycle)
- Performance: query plan review on every `v_*` view; add indexes where needed
- Security: RLS policy audit against reference matrix; rate limit tuning; webhook signature verification audit
- Accessibility: contrast, keyboard navigation, focus management pass across all UI surfaces
- Load test staging with representative data volumes

**M4 exit criteria:** AADC review complete; no student-role analytics events; all `v_*` views under 100ms at realistic data volumes; accessibility floor met.

---

## Phase 17 — Marketing site + onboarding polish ⟶ Milestone M5

**Type:** vertical slice · **Milestone M5**

- `klasio-marketing` repo: **Next.js** static/SSG site (decision #18 — overrides the earlier Astro reference), `klasio.com`, SEO, structured data
- In-app onboarding: guided first-run flow for new account owners (create centre → invite staff → create first class)
- In-app help: contextual tips, empty-state guidance
- Email: owner welcome sequence (transactional, not marketing)

**M5 exit criteria:** marketing site live; new account can complete onboarding without support; NPS ≥ 7 from pilot centre.

---

## Phase 18 — Launch ⟶ Milestone M6

**Type:** horizontal launch preparation · **Milestone M6**

- Custom domain live (`app.klasio.app`, `klasio.com`)
- Storage-key cutover: one-shot migration of legacy `tutoros.*` keys to `klasio.*` (A8 — not piecemeal)
- Stripe live mode activated with real business details
- All accounts migrated from test to live Stripe
- Runbook: incident response, backup restore, scaling playbook
- Monitoring: Sentry alert routing, PostHog dashboards, Railway + Supabase health alerts
- Support: help docs, in-app Intercom (or equivalent) for account owners

**M6 exit criteria:** public launch; paying customers; monitoring alerting correctly; support channel live.

---

## Milestone summary

| Milestone | Phase | Signal |
| :-: | :-: | :-: |
| M1 — Pilot ready | 8 | Daily ops loop works; homework + student reports live; one friendly centre live |
| M2 — Billing live | 13 | Stripe live; plan limits + override codes enforced |
| M3 — Platform complete | 14 | Superadmin + privacy + maintenance controls operational |
| M4 — Production hardened | 16 | AADC review done; performance + security pass |
| M5 — Marketing live | 17 | Public-facing site (Next.js); onboarding polished |
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

*Last updated: **pre-Phase 0 — prototype only** (B2). No phase has started; the app in this repo is the prototype/behavioural spec. Update the relevant section header and inventory doc as each phase ships.*
