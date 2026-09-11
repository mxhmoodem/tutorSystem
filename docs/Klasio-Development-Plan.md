# Klasio — Development Plan

**21 phases · 6 milestones · vertical slices from Phase 2 onward**

Every phase from Phase 2 ships its own tables, RLS policies, RPCs, triggers, views, typegen, seeds, API endpoints, tests and UI together — end to end — before the next slice starts. This document is the authority on phase order, slice contents and locked decisions. Read alongside `docs/Klasio-Data-Layer-Reference.md` (v3).

**Behavioural spec:** the frontend prototype plus `INVENTORY.md` define expected behaviour. Where the prototype and this plan (or the reference) conflict, the reconciliation document (`docs/klasio-doc-reconciliation-fixes.md`) is the arbiter.

---

## Locked decisions

| # | Decision | Value |
|---|---|---|
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
| 12 | No AI | No AI features, dependencies or copy anywhere in the platform. The Student Reports & Teacher Feedback system (Phase 8b) is the human-authored successor to the deleted AI-feedback feature |
| 13 | No parent role | Guardians are data rows and email recipients only — no login, no dashboard |
| 14 | No Redis | Postgres owns queuing (outbox), rate limiting, and lockouts |
| 15 | DSL | Capability on a membership row (`dsl_role` = `lead` \| `deputy`, one lead per centre) — not a separate role |
| 16 | Ownership | `accounts.owner_profile_id` — a field, not a membership role. Transfer = repoint one field (audited) |
| 17 | Multi-role | A person holds >1 role via >1 membership row — `UNIQUE (profile_id, centre_id, role)`. Dual-role view switch is a product feature |
| 18 | Family billing | Invoices bill a `families` row (siblings on one invoice); per-student attribution on lines; VAT configurable per centre |
| 19 | Marketing site | Next.js (separate repo) — supersedes the earlier Astro note |

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

---

## Phase 0 — Walking skeleton
**Type:** horizontal infrastructure

- Monorepo scaffold: `apps/web`, `apps/api`, `packages/shared`, `packages/db`
- npm workspaces, Node 22, TypeScript strict, ESLint, Prettier
- CI: GitHub Actions — lint, typecheck, build on every PR
- Vercel projects wired (`klasio-web`, `klasio-marketing`); Railway project wired (`klasio-api`)
- `GET /health` → `200 { status: "ok" }` deploying green on staging
- Structural folders seeded empty (features/, components/ui/, services/, supabase/tests/, e2e/)
- `.env.example` files; no secrets committed

**Exit:** `/health` returns 200 on staging; CI green on a PR; preview deploy per PR works.

---

## Phase 1 — Tenancy + auth spine
**Type:** horizontal foundations · **safeguarding-critical**

Tables: `accounts` (incl. `owner_profile_id` — ownership is a field, decision #16), `centres` (incl. `code` for student login), `profiles`, `memberships` (**multi-role**: `UNIQUE (profile_id, centre_id, role)`, `dsl_role` lead/deputy — decisions #15/#17), `students` (incl. `family_id`), `families`, `student_guardians`, `emergency_contacts`, `student_health`, `consents`, `invitations`, `student_claims`, `guardian_approvals`

RLS helpers introduced: `auth_uid()`, `is_superadmin()`, `auth_centre_ids()`, `auth_account_id()`, `has_role()` (EXISTS over rows — multi-role safe), `is_account_owner()`, `is_dsl()`, `is_my_student()`, `owns_profile()`

RPCs: `provision_account`, `set_member_role` (add/remove membership rows), `set_dsl_role`, `transfer_ownership` (repoints `owner_profile_id`), `invite_member`, `create_centre`

Railway endpoints: `POST /v1/invites`, `POST /v1/invites/:id/resend`, `POST /v1/auth/student/login` (centre-code + username + PIN), `POST /v1/auth/guardian-approvals`, `POST /v1/auth/guardian-approvals/:token/confirm`

Student provisioning: claim-slip flow — `student_claims` rows with claim code + synthetic email, printable slip PDF, no email sent.

Tests: **two-centre RLS isolation harness** — Account A vs Account B denial, per-role allow/deny for every table. This harness is the foundation every later slice appends to. Explicit multi-role cases: one profile with admin + teacher rows at the same centre passes both role checks; ownership checks pass with no membership row.

UI: login (staff TOTP; student centre-code + username + PIN), TOTP enrolment, **multi-role view switch** (a dual-role user flips between admin and teacher views), active-centre picker, multi-role Team management, claim-slip print flow, placeholder dashboards per role

**Exit:** staff TOTP login works; student PIN login works; one profile in two centres sees correct data for each; a dual-role user switches views at one centre; ownership transfer repoints one field; RLS harness green.

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

## Phase 3 — Academic core
**Type:** vertical slice

Tables: `subjects`, `grade_scales`, `grade_bands`, `terms` (stored `is_active` flag — documented deliberate exception to derive-don't-store), `term_breaks`, `rooms`, `class_dimensions` (configurable year groups / levels / exam boards with inline add), `classes`, `class_schedules`, `class_cover`, `sessions`, `enrolments`, `attendance_records`

RPCs: `set_active_term`, `enrol_student`, `withdraw_enrolment`, `regenerate_sessions`, `set_class_cover`

Views: `v_class_summary`, `v_attendance_summary`, `v_enrolment_status`, `v_effective_teacher` (permanent teacher overridden by any covering `class_cover` row — schedule renders the cover teacher)

Tests: isolation + `submit_register` derives `timesheet_entries` in the same transaction (keystone test)

UI: class list, class detail, enrolment management, term picker

**Exit:** admin can create a class and enrol students; active term resolves to one value everywhere; a cover assignment changes the effective teacher on the schedule for its date range only.

---

## Phase 4 — Register + timesheets (keystone)
**Type:** vertical slice · **derive-don't-store keystone**

Tables: `timesheet_entries`, `timesheet_adjustments`, `staff_details`, `staff_rates`, `register_unlocks`, `attendance_amendments`

RPCs: `submit_register` (keystone — attendance + session confirmation + timesheet derivation in one transaction, consumes any active unlock), `log_timesheet_entry` (manual non-teaching work: prep/marking/meeting/training/cover; `teaching` type rejected), `approve_timesheet`, `adjust_timesheet`, `amend_attendance` (24h window, writes `attendance_amendments`), `grant_unlock`, `revoke_unlock`

Timesheet model: `timesheet_entries.type` = `teaching` (system-derived only) \| `prep` \| `marking` \| `meeting` \| `training` \| `cover` (manually logged); statuses `draft → submitted → approved / rejected → exported` — no `paid` status on a ledger-only platform

Views: `v_timesheet_summary`, `v_session_delivery`, `v_session_state` (the six derived register states — see the Data-Layer Reference for the state machine and transition rules)

Register lock/unlock model:
- Six derived states (`upcoming`, `open_live`, `awaiting`, `lapsed`, `recorded`, `cancelled`) computed at read time; `sessions.status` stays the three-value persisted enum
- **Natural backfill window** (first path back in): after the live window, the register stays takeable — flagged late — until `ends_at + register_backfill_hours` (per-centre setting, default 72h). Teachers are never locked out the moment a session ends
- After backfill, the register lapses and locks; a centre admin `grant_unlock` reopens it time-boxed (2h/4h/end-of-day/24h/48h); the grant is one-shot (consumed by the next `submit_register`) and auto-expires — the second path back in
- Teacher self-serve per-mark amend within 24h of submission; after that, admin unlock is required for a full re-take

Tests: keystone test — one `submit_register` call produces correct attendance rows + timesheet entry; **backfill window** (session derives `awaiting` for 72h after end, submission flagged late, lapses after); unlock lifecycle (grant → lapsed session derives `awaiting` → submit consumes + re-locks → expiry re-lapses); manual `teaching` timesheet insert denied; amendment window enforced; cross-tenant denial on `register_unlocks` and `attendance_amendments`; all audited RPCs assert `audit_log` row

UI: register view with derived-state rows, register drawer (take/re-take), admin centre-wide "needs a register" list, unlock chooser, teacher + admin timesheets

**Exit:** teacher submits register; timesheet entry appears derived; a lapsed register locks and an admin unlock reopens it for the teacher, then re-locks on submit; amendments are audited; audit rows exist. No separately stored metrics or session states.

---

## Phase 5 — Groups + announcements
**Type:** vertical slice

Tables: `groups`, `group_members`, `comms_settings`, `announcements` (priority, pinned, expires_at; nullable centre for platform scope), `announcement_targets` (multi-target audiences), `announcement_receipts`

RPCs: `create_group`, `manage_group_members`, `publish_announcement`, `acknowledge_announcement`

Email templates: announcement notification (respects quiet hours + prefs)

Views: `v_announcement_reach`, `v_unread_announcements`

Tests: isolation + target resolution (multi-target sets of centres/roles/groups/years/classes resolve to the correct combined recipient set; platform-scope announcements reach all centres; expired announcements drop out of feeds)

UI: announcement composer (multi-target picker, priority, pin, expiry), inbox (pinned first), ack flow, superadmin platform announcements

**Exit:** admin publishes a centre-wide announcement; all staff see it; ack-required flow works.

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

## Phase 7 — Invoicing
**Type:** vertical slice

Tables: `fee_plans`, `invoice_sequences`, `invoices` (billed to a **family** — decision #18; VAT totals snapshotted at issue), `invoice_lines` (per-student attribution, `vat_rate`/`vat_amount`), `payment_schedules`, `payments`. Centre VAT settings (`vat_registered`, `vat_number`, `default_vat_rate`) surface in Settings.

RPCs: `record_payment` (audited), `void_invoice` (audited)

Views: `v_invoice_status` (derived — never stored), `v_outstanding_balance`, `v_payment_schedule`

Railway endpoints: `POST /v1/invoices/:id/pdf`, `POST /v1/invoices/:id/send`, `GET /v1/invoices/export`, `POST /v1/invoices/import`

Email templates: invoice issued, payment reminder, overdue notice, payment received

pg_cron: due reminders (N days before instalment), overdue sweep

Tests: isolation + status derivation unit tests (all schedule/payment combinations) + VAT derivation (registered vs not; rate override per line) + family invoice covers multiple siblings' lines + audited RPCs assert audit rows

UI: invoice list, invoice detail (family header, per-sibling lines), payment entry, VAT settings, guardian-facing read-only view

**Exit:** admin creates one invoice for a family of three siblings; status derives correctly from schedule vs payments; VAT computes correctly; PDF emails to the family's billing guardian; CSV export/import round-trips.

---

## Phase 8 — Homework
**Type:** vertical slice

Tables: `assignments`, `assignment_targets`, `questions`, `submissions`, `answers`

RPCs: `create_assignment`, `assign_homework`, `submit_homework` (auto-marks MCQ/numeric/expression)

Railway endpoints: `POST /v1/homework/import-pdf` (deterministic rule-based parsing — **no AI**, decision #12)

Email templates: feedback returned, homework due reminder (off by default for under-13s)

Views: `v_homework_completion`, `v_submission_summary`

Tests: isolation + auto-mark logic unit tests (all six question types) + teacher marking flow (manual marks + comments on subjective types)

UI: assignment builder (six question types), student submission view, teacher marking queue

**Exit:** homework set, submitted, auto-marked (objective types), teacher-marked (subjective types) and returned to the student.

---

## Phase 8b — Student Reports & Teacher Feedback ⟶ Milestone M1: pilot-ready
**Type:** vertical slice · **flagship** · **Milestone M1**

The product's differentiator — human-authored written reports, the successor to the deleted AI-feedback feature.

Tables: `report_rules`, `report_templates`, `rating_scales`, `rating_levels`, `reports`

RPCs: `publish_report` (audited — locks content, renders PDF, queues guardian email)

Railway endpoints: `POST /v1/student-reports/:id/pdf`, `POST /v1/student-reports/:id/send`

Views: `v_reports_due` (**derived** due/upcoming queue from rules × frequency × existing reports — due-ness never stored)

Email templates: report published (to guardians, PDF attached)

Tests: isolation + due-engine unit tests (each frequency × existing-report combination) + student sees `published` only + publish is audited + 4-tier ratings resolve through the scale tables

UI: report rules manager, template editor, ratings taxonomy settings, teacher due/upcoming queue, report writer, published-report student view, PDF export

**M1 exit criteria:**
- Centre admin can self-onboard (invite staff, create students, set term, create class, enrol students)
- Daily operations loop works: class → register → timesheet → invoice → payment
- Homework set, submitted, auto-marked and teacher-marked
- Report rule creates due entries; teacher writes and publishes a report; guardian receives the PDF
- PostHog initialised (EU cloud, staff roles only, student never tracked)
- One friendly centre running as pilot

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

pg_cron: storage quota warnings (80% + 100% of pooled account quota)

Views: `v_unread_notification_count`

Tests: AADC defaults (under-13 notification prefs default off for non-critical kinds)

UI: notification bell + dropdown, preferences page, read/unread state

**Exit:** bell badge updates in real time; under-13 accounts have safe defaults.

---

## Phase 12 — Analytics Exports
**Type:** vertical slice

> Renamed from "Reports" — that name belongs to the student-report-writing product domain (Phase 8b). This phase is admin analytics views + exports.

Views: `v_attendance_report`, `v_results_report`, `v_timesheet_report`, `v_invoice_report`, `v_student_progress`

Railway endpoints: `GET /v1/exports/:key` (CSV + PDF — renamed from `/v1/reports/*` to avoid the collision)

Tables: `data_requests` (SAR/erasure lifecycle)

Tests: each view returns correct data for the role; export endpoint enforces tenant scope

UI: analytics browser, filters, export buttons, date-range picker

**Exit:** admin exports attendance analytics as CSV; data matches attendance_records; cross-tenant rows absent.

---

## Phase 12b — Tracking + Lesson Planner
**Type:** vertical slice · teacher working tools

Tables: `trackers`, `tracker_columns`, `tracker_entries`, `lesson_plans`

Views: none — grids read directly; keep cell writes cheap

Tests: isolation (teacher sees own classes' trackers only; students have **no access** — internal working data); typed-column validation (score respects max, check is boolean); UNIQUE (column, student) upsert semantics

UI: Tracking Hub → Detail two-state structure (typed columns, keyboard navigation, settings slide-over — per the redesign spec), lesson planner with optional session pinning

**Exit:** teacher builds a tracker with score/check/text columns, fills cells with keyboard navigation; a student account cannot read any tracker row; lesson plans persist across sessions.

---

## Phase 13 — Stripe billing ⟶ Milestone M2
**Type:** vertical slice · **Milestone M2**

Tables: `plans`, `subscriptions` (incl. `redeemed_code_id`), `plan_codes`, `plan_code_redemptions`, `storage_addons`, `feature_flags`, `centre_settings`

RPCs: `manage_plan_code`, `redeem_plan_code` (validates max_redemptions, logs redemption — audited)

Railway endpoints: `POST /v1/billing/checkout`, `POST /v1/billing/portal`, `POST /v1/webhooks/stripe` (idempotent via `processed_events`)

Email templates: subscription payment failed

Tests: webhook idempotency (replay produces no duplicate rows), plan limits enforced via feature_flags, code redemption (each kind: free_trial / percent_off / fixed_price; max_redemptions enforced; duration expiry), storage add-on raises effective quota

UI: plan picker (account owner), promo-code redemption in the billing tab, superadmin plan-code manager, billing portal link, feature-gated UI surfaces

**M2 exit criteria:**
- Account owner can subscribe via Stripe Checkout
- Plan limits enforced (seats, storage, centres)
- Stripe in live mode with real business details
- Full audit trail from Phase 1 covering all audited RPCs

---

## Phase 14 — Superadmin + privacy ⟶ Milestone M3
**Type:** vertical slice · **Milestone M3**

Railway endpoints: `POST /v1/admin/accounts`, `POST /v1/admin/accounts/:id/suspend`, `POST /v1/privacy/erasure`, `POST /v1/privacy/sar-export`, `GET /v1/jobs/:id` (poll async jobs — GET, matching the reference and Phase 15)

RPCs: `provision_account` (also listed in Phase 1 — intentional: the RPC ships in Phase 1, the superadmin UI for it ships here), `set_account_plan`, `toggle_feature_flag` (global maintenance mode = `account: null, key: 'maintenance_mode'`), `start_support_session` (scoped, time-boxed, audited)

Maintenance mode + impersonation: global maintenance banner (feature-flag driven, superadmin toggle); impersonation banner visible for the whole `start_support_session` window, session appears in the impersonation log

Email templates: import job finished, SAR export ready

Tests: superadmin cannot access centre-level data outside their scope; erasure anonymises profile but preserves safeguarding records; SAR bundle is complete

UI: superadmin dashboard (platform health, account list, impersonation log), maintenance-mode toggle + banner, impersonation banner, privacy request workflow

**M3 exit criteria:**
- Superadmin can provision, suspend and restore accounts
- Erasure anonymises without deleting safeguarding records (anonymise-not-delete)
- SAR export produces a complete bundle

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
- pg_cron retention/anonymisation sweeps (GDPR data lifecycle)
- Performance: query plan review on every `v_*` view; add indexes where needed
- Security: RLS policy audit against reference matrix; rate limit tuning; webhook signature verification audit
- Accessibility: contrast, keyboard navigation, focus management pass across all UI surfaces
- Load test staging with representative data volumes

**M4 exit criteria:** AADC review complete; no student-role analytics events; all `v_*` views under 100ms at realistic data volumes; accessibility floor met.

---

## Phase 17 — Marketing site + onboarding polish ⟶ Milestone M5
**Type:** vertical slice · **Milestone M5**

- `klasio-marketing` repo: **Next.js** site (decision #19 — supersedes the earlier Astro note), `klasio.com`, SEO, structured data. Marketing owns top-of-funnel; console activation funnel starts at "Started signup"
- Reconcile pricing tier names between marketing and console (Starter/Growth/Scale vs Basic/Growth/Pro) — one canonical set
- In-app onboarding: guided first-run flow for new account owners (create centre → invite staff → create first class)
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
- Monitoring: Sentry alert routing, PostHog dashboards, Railway + Supabase health alerts
- Support: help docs, in-app Intercom (or equivalent) for account owners

**M6 exit criteria:** public launch; paying customers; monitoring alerting correctly; support channel live.

---

## Milestone summary

| Milestone | Phase | Signal |
|---|---|---|
| M1 — Pilot ready | 8b | Daily ops loop + reports flagship work; one friendly centre live |
| M2 — Billing live | 13 | Stripe live; plan limits enforced |
| M3 — Platform complete | 14 | Superadmin + privacy controls operational |
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

*Last updated: pre-Phase 0 — prototype only; no monorepo, CI, or `/health` exists yet. Update this line and the relevant inventory doc as each phase ships.*
