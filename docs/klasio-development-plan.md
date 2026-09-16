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
| 28 | Predicted / target grades | Stored in `student_targets` (teacher judgement); "on track" derived; published reports snapshot the predicted grade |
| 29 | Rank exposure | Class rank shown to students only when `privacy_flag(centre, 'show_rank_to_students')` — a typed column on `centre_privacy_settings`, default **off** — and the student meets `rank_min_age` (default 13). Not a `centre_settings.features` key: a view reads it (decision #33) |
| 30 | Support | By **email** — no in-app ticket system. Impersonation (`support_sessions`) references the support email thread and is visible to the tenant |
| 31 | Groups | **Deferred.** No `groups` / `group_members`; `group` removed from assignment and announcement target enums. Tags cover ad-hoc cohorts. Revisit after M1 |
| 32 | Platform switches | `platform_settings` single-row table (maintenance, read-only, signups, status page, trial offer, defaults). `feature_flags` is only for product rollout |
| 33 | Settings shape | Anything an invariant, RLS policy or view reads is a typed column on a per-domain centre settings row (`centre_register_settings`, `centre_timesheet_policy`, `centre_report_settings`, `centre_invoice_settings`, `comms_settings`); `centre_settings` jsonb holds presentation only |

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

- Monorepo scaffold: `apps/web`, `apps/api`, `packages/shared`, `packages/db`, `packages/ui` (tokens live in `packages/ui/src/styles/tokens.css` — decision #1)
- npm workspaces, Node 22, TypeScript strict, ESLint, Prettier
- CI: GitHub Actions — lint, typecheck, build on every PR
- Vercel projects wired (`klasio-web`, `klasio-marketing`); Railway project wired (`klasio-api`)
- `GET /v1/health` → `200 { status: "ok" }` deploying green on staging, plus `GET /v1/version`
- Structural folders seeded empty (features/, components/ui/, services/, supabase/tests/, e2e/)
- `.env.example` files; no secrets committed

**Exit:** `/v1/health` returns 200 on staging; CI green on a PR (including `supabase db reset` against the Docker stack); preview deploy per PR works.

---

## Phase 1 — Tenancy + auth spine
**Type:** horizontal foundations · **safeguarding-critical**

Tables: `accounts` (incl. `kind` centre/solo, `owner_profile_id` — decisions #16/#24), `centres` (incl. `code`, `is_primary`, `is_implicit`), `profiles`, `memberships` (**multi-role**: `UNIQUE (profile_id, centre_id, role)`, `dsl_role` lead/deputy — decisions #15/#17), `students` (incl. `family_id`, `auth_method`), `families`, `student_guardians`, `emergency_contacts`, `student_health`, `consents`, `invitations`, `student_claims`, `student_claim_batches`, `import_drafts`, `guardian_approvals`, `auth_attempts`, `account_lockouts`, `platform_settings` (seeded single row — signup needs `signups_enabled` from day one), `centre_settings`, `centre_privacy_settings` (typed, audited: `teacher_reads_health`, `show_rank_to_students`, `rank_min_age` — decision #33), `audit_log` (the single sink every audited RPC writes to, with `actor_role` / `ip` / `support_session_id` from day one), `plans` + `subscriptions` (seeded with one plan, so signup can stamp a trial and Phases 3 and 7 can enforce limits; Stripe sync, codes and add-ons arrive in Phase 13)

RLS helpers introduced: `auth_uid()`, `is_superadmin()` (platform tables only — it grants no tenant data), `auth_centre_ids()`, `auth_account_ids()` (an array — one person can hold memberships under two accounts), `has_role()` (EXISTS over rows — multi-role safe), `is_account_owner()`, `is_dsl()`, `is_my_student()` (own classes **and** any class currently covered), `owns_profile()`, `in_support_session()`, `privacy_flag()`, `plan_capability()`, `plan_limit()`

RPCs: `provision_account` (centre or solo; creates `centre_settings` now — each later slice that adds a domain settings row extends `provision_account` and backfills existing centres in its migration), `set_member_role` (add/remove membership rows), `set_dsl_role`, `transfer_ownership` (grants the incoming owner a `centre_admin` membership if they lack one, then repoints `owner_profile_id` — one transaction, that order), `invite_member`, `create_centre`, `update_privacy_settings` (audited)

Railway endpoints: `POST /v1/auth/signup` (public, rate-limited, idempotent — decision #22), `POST /v1/invites`, `POST /v1/invites/:id/resend`, `POST /v1/auth/staff/login` + `POST /v1/auth/staff/mfa/verify` (password and TOTP steps; both lockout-checked), `POST /v1/auth/student/login` (centre-code + username + PIN or password; lockout-checked), `POST /v1/auth/student/claim`, `POST /v1/auth/guardian-approvals`, `POST /v1/auth/guardian-approvals/:token/confirm`

Auth: staff = email + password + mandatory TOTP (decision #20). Both steps run through the API endpoints above, which write `auth_attempts` and enforce `account_lockouts` (10 failures / 15 min → 30-min lock; students 5) — Supabase's password- and MFA-verification hooks would do this, but they need the Team plan, so the API owns it. Supabase Auth also requires a Cloudflare Turnstile token, so attempts that bypass the API are throttled at the source. Student PIN/password (decision #21).

Student provisioning: claim-slip flow — `student_claims` rows (in a `student_claim_batches` run) with claim code + synthetic email, `POST /v1/student-claims/batches/:id/slips` rendering the printable slip PDF, no email sent; public claim page with `self_set` PIN/password and under-13 guardian consent. CSV paste auto-saves to `import_drafts`.

Views: `v_platform_status` (the only `platform_settings` fields anon may read: maintenance, read-only, signups, status page)

Tests: **two-centre RLS isolation harness** — Account A vs Account B denial, per-role allow/deny for every table. This harness is the foundation every later slice appends to. Explicit multi-role cases: one profile with admin + teacher rows at the same centre passes both role checks. Ownership invariants: the owner always holds a `centre_admin` membership, so ownership needs no special case in RLS; `transfer_ownership` grants that membership before repointing; `set_member_role` refuses to remove a centre's last admin or the owner's own membership. Access scope: a teacher reads only their own students — another teacher's pupil, guardian, health, result and submission rows are invisible, and cover grants access for the covered dates only; a superadmin with no support session reads nothing at all; inside a session the never-admit tables (health, emergency contacts, consents, incidents, conversations, messages, flags, safeguarding files) stay invisible. Lockout: N failures lock, lock expires, success after expiry. Signup: one transaction creates every row or none; refused when signups disabled; under-13 student cannot be set to `password`.

UI: signup (centre or solo), login (staff password + TOTP; student centre-code + username + PIN/password), TOTP enrolment, **multi-role view switch** (a dual-role user flips between admin and teacher views), **multi-centre switcher** (sidebar header, primary centre default), multi-role Team management, claim-slip print flow + public claim page, People & invites tracker, per-centre setup checklist drawer, placeholder dashboards per role

**Exit:** a new centre admin signs up and enrols TOTP unaided; staff TOTP login works; student PIN and password login work; repeated failures lock an identifier; one profile in two centres sees correct data for each; a dual-role user switches views at one centre; ownership transfer grants a membership and repoints one field in a single transaction; RLS harness green.

---

## Phase 2 — Files + email infrastructure
**Type:** vertical slice · infrastructure

Tables: `files` (incl. `category`), `file_links`, `storage_rollups`, `email_outbox`, `email_suppressions`, `processed_events`. `profiles.avatar_file_id` is added here too — the column can only exist once `files` does.

Railway endpoints: `POST /v1/files/sign-upload`, `POST /v1/files/:id/confirm`, `POST /v1/files/:id/sign-download`, `DELETE /v1/files/:id`, `POST /v1/webhooks/resend`

Retention: the category → retention matrix (none / archive / locked) enforced by `DELETE /v1/files/:id`; safeguarding files tombstoned, never hard-deleted.

Worker: outbox polling loop (30s), React Email rendering, Resend API, retry with backoff, idempotency keys

Email templates: staff invitation, owner welcome, guardian approval magic link

Tests: isolation (files visible only within centre), quota enforcement, suppression list check at enqueue, delete refused for `archive`/`locked` categories

UI: Storage as an **account-level route**, not a Settings tab — quota is an account concern, while Settings is centre-scoped or personal (usage by category, pooled vs split, guarded delete). The superadmin console keeps its own platform-wide Storage tab

**Exit:** file upload/download round-trip works; invitation email lands; outbox worker processes queued rows; a locked-category delete is refused.

---

## Phase 3 — Academic core
**Type:** vertical slice

Tables: `subjects`, `grade_scales`, `grade_bands`, `terms` (stored `is_active` flag — documented deliberate exception to derive-don't-store), `term_breaks`, `rooms`, `class_dimensions` (configurable year groups / levels / exam boards with inline add), `classes` (incl. `kind`, `hourly_rate`), `class_settings`, `class_schedules`, `class_cover`, `class_change_requests`, `tags`, `taggables`, `waiting_list_entries`, `sessions`, `enrolments`, `attendance_records`

RPCs: `set_active_term`, `enrol_student` (capacity + `plan_limit(max_students)`), `withdraw_enrolment`, `regenerate_sessions` (skips `term_breaks` — no phantom half-term sessions), `set_class_cover`, `request_class_change`, `decide_class_change_request`, `offer_waiting_list_place`

Views: `v_class_summary`, `v_attendance_summary`, `v_enrolment_status`, `v_effective_teacher` (permanent teacher overridden by any covering `class_cover` row — schedule renders the cover teacher)

Tests: isolation + `regenerate_sessions` skips term breaks + enrolment refused above plan student cap + class change request visible to requester and admins only

UI: 3-step create-class flow with inline dimensions, class list, class detail workspace (hero banner with theme picker, tabs), enrolment management, term picker, admin schedule grid (with cover), class change request form + admin queue, cohort tags, waiting list (capability-gated)

**Exit:** admin can create a class and enrol students; active term resolves to one value everywhere; a cover assignment changes the effective teacher on the schedule for its date range only; a teacher's change request lands in the admin queue.

---

## Phase 4 — Register + timesheets (keystone)
**Type:** vertical slice · **derive-don't-store keystone**

Tables: `centre_register_settings`, `timesheet_entries`, `timesheet_adjustments`, `centre_timesheet_policy`, `staff_details` (incl. `pay_type`, `contracted_hours`), `staff_rates`, `staff_leave` (booked absence — prefills cover windows and keeps a session inside leave out of the missed-register queue), `register_unlocks`, `attendance_amendments`

RPCs: `submit_register` (keystone — attendance + session confirmation incl. `register_late` / `register_note` / `register_by_admin` / `delivered_by` / `delivered_minutes` + timesheet derivation for the delivering adult, in one transaction; consumes any active unlock), `log_timesheet_entry` (manual non-teaching work: prep/marking/meeting/training/cover/other; `teaching` type rejected), `approve_timesheet`, `adjust_timesheet`, `amend_attendance` (within `amendment_hours`, writes `attendance_amendments`), `grant_unlock`, `revoke_unlock`, `set_staff_rate` (audited), `update_my_staff_profile` (a staff member edits their own contact fields; pay and employment untouched)

Timesheet model: `timesheet_entries.type` = `teaching` (system-derived only) \| `prep` \| `marking` \| `meeting` \| `training` \| `cover` \| `other` (manually logged; `other` never paid); statuses `draft → submitted → approved / rejected → exported` — no `paid` status on a ledger-only platform. Period cadence from `centre_timesheet_policy.submission_frequency` only.

Views: `v_timesheet_summary`, `v_timesheet_pay` (pay eligibility: hourly / salaried / mixed × cover-or-extra × `pay_non_session` × `paid_categories`), `v_session_delivery`, `v_session_state` (the six derived register states, driven by `centre_register_settings` — see the reference)

Register lock/unlock model:
- Six derived states (`upcoming`, `open_live`, `awaiting`, `lapsed`, `recorded`, `cancelled`) computed at read time; `sessions.status` stays the three-value persisted enum
- Register opens `pre_open_minutes` before start; freely takeable until grace end (end of day by default)
- **Natural backfill window** (first path back in): the register stays takeable — flagged late, reason required when `require_late_reason` — until `ends_at + backfill_hours` (default 72h; 168h for solo). Teachers are never locked out the moment a session ends
- After backfill, the register lapses and locks; a centre admin `grant_unlock` reopens it time-boxed (2h/4h/end-of-day/24h/48h); the grant is one-shot (consumed by the next `submit_register`), auto-expires, and the row is kept — the second path back in. An admin may also backfill directly (`register_by_admin`)
- Teacher self-serve per-mark amend within `amendment_hours` of submission; after that, unlock is required for a full re-take

Tests: keystone test — one `submit_register` call produces correct attendance rows + timesheet entry for `delivered_by`; **backfill window** (session derives `awaiting` until backfill end, submission flagged late, refused without a note when required, lapses after); settings row changes re-derive state; unlock lifecycle (grant → lapsed session derives `awaiting` → submit consumes + re-locks → expiry re-lapses; rows never deleted); pay eligibility matrix (each pay type × cover/extra × category toggle); manual `teaching` timesheet insert denied; amendment window enforced; cross-tenant denial on `register_unlocks` and `attendance_amendments`; all audited RPCs assert `audit_log` row

UI: teacher Attendance (time-scoped view over derived-state sessions), register drawer (take/re-take, late reason, delivered-by, time delivered), **admin centre-wide attendance oversight** ("needs a register" list, admin backfill, unlock chooser), register settings, teacher timesheet + admin review/export (CSV + print view), pay policy settings, staff attendance derived from registers

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

Tests: isolation + target resolution (multi-target sets of centres/roles/years/subjects/classes resolve to the correct combined recipient set; platform-scope announcements reach all centres; expired announcements drop out of feeds) + approval workflow (teacher announcement cannot publish unapproved when required)

UI: announcement composer (multi-target picker, priority, pin, expiry, submit-for-approval), approval queue, inbox (pinned first), ack flow, superadmin platform announcements

**Exit:** admin publishes a centre-wide announcement; all staff see it; ack-required flow works; a teacher announcement waits for approval when the centre requires it.

---

## Phase 6 — Results + assessments
**Type:** vertical slice

Tables: `assessments`, `results`, `student_targets`

RPCs: `record_result`, `publish_results`, `set_student_target`

Views: `v_results_summary`, `v_class_performance`, `v_student_progress` (trend vs target — "on track"), `v_student_risk` (the single at-risk definition used by admin and teacher surfaces)

Tests: isolation + published flag (student cannot see until published) + one at-risk result for the same student regardless of viewer role

UI: assessment creation, results entry, results published view per student, predicted/target grade editor, student profile analytics

**Exit:** teacher enters results; students see them only after publish; predicted and target grades show on the student profile and progress views from stored rows.

---

## Phase 7 — Invoicing
**Type:** vertical slice

Tables: `centre_invoice_settings` (currency, VAT registration, **tax mode** none/exclusive/inclusive, tax label/rate, due days, auto-send, overdue reminders, reminder cooldown), `fee_plans`, `invoice_sequences`, `invoices` (billed to a **family** — decision #18; drafts via `issued_at NULL`; per-invoice tax override; totals snapshotted at issue), `invoice_lines` (per-student + per-class attribution, `vat_rate`/`vat_amount`), `payment_schedules`, `payments`, `invoice_reminders`

RPCs: `generate_invoices` (draft per family from delivered sessions × `classes.hourly_rate`), `issue_invoice` (audited; enforces `plan_limit(max_invoices_per_month)`), `send_invoice_reminder` (cooldown-checked), `record_payment` (audited), `void_invoice` (audited)

Views: `v_invoice_status` (derived — never stored), `v_outstanding_balance`, `v_payment_schedule`

Railway endpoints: `POST /v1/invoices/:id/pdf`, `POST /v1/invoices/:id/send` (fails loudly on no billing email; cooldown), `GET /v1/invoices/export`, `POST /v1/invoices/import`

Email templates: invoice issued, payment reminder, overdue notice, payment received

pg_cron: due reminders (N days before instalment), overdue sweep — both respect the cooldown

Tests: isolation + status derivation unit tests (all schedule/payment combinations) + tax derivation (none / exclusive / inclusive; rate override per invoice) + family invoice covers multiple siblings' lines + reminder refused inside cooldown + send refused with no billing email + generated invoice matches delivered minutes + audited RPCs assert audit rows

UI: invoice ledger, invoice detail drawer (family header, per-sibling lines, mark paid, audit), payment entry, reminders, CSV reconciliation, invoice analytics, invoicing settings

> **No guardian-facing screen.** Guardians never log in (decision #13); the invoice PDF emailed by `POST /v1/invoices/:id/send` *is* the guardian-facing artefact. Any future no-login view would be a signed magic-link page, and would need a token model in the reference first.

**Exit:** admin creates one invoice for a family of three siblings; status derives correctly from schedule vs payments; tax computes correctly in each mode; PDF emails to the family's billing guardian; a second reminder inside the cooldown is refused; CSV export/import round-trips.

---

## Phase 8 — Homework
**Type:** vertical slice

Tables: `assignment_folders`, `assignments` (incl. `available_from`, `time_limit_mins`, `attempts_allowed`, `allow_late`, `allow_review`, `hide_marks_until_released`, `settings`), `assignment_targets` (class \| student), `questions` (ten types, `hint`), `submissions` (incl. `attempt_count`, `started_at`, `is_late` snapshot, `time_spent_mins`, `overall_feedback`, `marked_at`, `marks_released_at`), `answers` (incl. `feedback`)

RPCs: `create_assignment`, `assign_homework`, `start_homework` (availability, lateness and attempts enforced), `submit_homework` (auto-marks objective types), `release_marks`

Railway endpoints: `POST /v1/homework/import-pdf` (deterministic rule-based parsing — **no AI**, decision #12)

Email templates: feedback returned, homework due reminder (off by default for under-13s)

Views: `v_homework_completion`, `v_submission_summary`, `v_submission_standing` (class average + rank, rank gated by `privacy_flag(centre, 'show_rank_to_students')` and `rank_min_age` — decision #29), `v_my_submissions` + `v_my_answers` (a student's own rows with marks and feedback withheld until released — the column-level gate RLS can't express)

Tests: isolation + auto-mark unit tests for **all ten question types** (`mcq`, `multi`, `truefalse`, `numeric`, `expression`, `fillblank` and `match` proportional credit; `short_text`, `long_text`, `upload` teacher-marked) — asserting marking is a pure function of the response and the teacher-authored answer + teacher marking flow (per-question marks + feedback, overall feedback) + marks hidden from the student until released when held back + start refused before `available_from` / after due without `allow_late` / beyond attempts + rank never returned to an under-13 or when the toggle is off

UI: assignment builder (ten question types, folders rail, settings panel, PDF import), student start page + attempt view (optional countdown, off by default), teacher marking queue, mark release, returned-paper review, homework analytics

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

UI: report rules manager (centre default + overrides), template editor, ratings taxonomy settings, standards / permissions / branding / notifications settings, teacher due/upcoming queue (shared card on teacher and admin Reports), report writer with live standards gate, folders + report tags + pinning, history drawer, published-report student view with acknowledge, PDF export

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

Tables: `conversations` (kinds `direct` / `group` / `channel`; immutable `monitored` stamp), `conversation_participants`, `messages`, `message_flags` (multi-reason: `reasons[]`, `primary_reason`; targets either `message_id` or `class_post_id`), `flag_rules` (incl. `image`), `class_posts`, `class_post_comments` (moved from Phase 5 — they share the flag scan)

RPCs: `start_conversation` (enforces preset matrix, stamps `monitored`, attaches DSL observers per `dsl_observer`), `resolve_flag`, `post_to_class`

Triggers: message **and class-post** INSERT → flag scan (keyword rules + built-in contact detectors + image + out-of-hours) → one `message_flags` row with every reason → Realtime broadcast to conversation channel; reject attachments in any thread with a student participant; class posts are text-only; reject updates to `monitored`

pg_cron: message retention sweep per `comms_settings.message_retention` (Phase 10 extends it to spare anything linked to an open safeguarding incident)

Views: `v_conversation_list`, `v_unread_counts`

Realtime: private conversation channels (broadcast-from-DB, auth via RLS)

Email templates: DSL flag alert (cannot be muted), message notification (respects prefs)

Tests: isolation + flag trigger raises every matching reason on one flag, for a message and for a class post + DSL observer auto-attached on staff↔student thread + `monitored` cannot be cleared + attachment in a student thread denied + class stream permissions (student posts only when `students_can_post`) + cross-centre message denial

UI: conversation list, thread view, message composer, class channels, class Stream tab, DSL flag queue, comms settings (presets)

**Exit:** staff↔student conversation has DSL observer; flagged message appears in DSL queue with all its reasons; a class stream post reaches enrolled students and is scanned the same way; cross-centre read returns empty.

---

## Phase 10 — Safeguarding incidents
**Type:** vertical slice · **safeguarding-critical**

Tables: `safeguarding_incidents`, `safeguarding_incident_notes`, `safeguarding_escalation_contacts`

RPCs: `raise_concern` (any staff, from any context), `log_safeguarding_incident`, `add_incident_note` (append-only), `resolve_incident` (all audited)

Views: `v_open_incidents`, `v_incident_timeline`

pg_cron: extends the Phase 9 retention sweep so messages and class posts linked to an open incident are never swept

Tests: isolation (DSL/admin only) + append-only constraint (update/delete denied for all roles) + audit assertion on every RPC + support session cannot read incidents + retention sweep keeps incident-linked messages

UI: concern-raise button (always visible to staff), DSL incident log, incident timeline, resolve flow, where-to-escalate contacts

**Exit:** teacher raises concern; DSL sees it; notes are append-only; delete attempt denied at DB level.

---

## Phase 11 — Notifications + preferences
**Type:** vertical slice

Tables: `notifications`, `notification_prefs` (incl. per-class overrides, digest), `user_preferences`, `dashboard_layouts`

Realtime: per-user notification channel (bell + badge counts)

pg_cron: storage quota warnings (80% + 100% of pooled account quota)

Views: `v_unread_notification_count`

Tests: AADC defaults (under-13 notification prefs default off for non-critical kinds; `streak_nudges` defaults false and cannot be set true for under-13s) + class override beats account-wide pref + DSL safeguarding alerts cannot be disabled

UI: notification bell + dropdown, per-role Settings (Account / Notifications / Appearance + role tab), accessibility options (text size, high contrast, dyslexia font, reduce motion), dashboard customise, per-class notification toggles, read/unread state

**Exit:** bell badge updates in real time; under-13 accounts have safe defaults; appearance and accessibility preferences persist per user.

---

## Phase 12 — Analytics Exports
**Type:** vertical slice

> Renamed from "Reports" — that name belongs to the student-report-writing product domain (Phase 8b). This phase is admin analytics views + exports.

Views: `v_attendance_report`, `v_results_report`, `v_timesheet_report`, `v_invoice_report`, `v_student_progress`

Railway endpoints: `GET /v1/exports/:key` (CSV + PDF — renamed from `/v1/reports/*` to avoid the collision)

Tables: `data_requests` (SAR/erasure lifecycle incl. statutory `due_at`)

Tests: each view returns correct data for the role; export endpoint enforces tenant scope; financial analytics reconcile to the invoice ledger (no second financial source)

UI: analytics browser, filters, export buttons, date-range picker, centre report (browser print)

**Exit:** admin exports attendance analytics as CSV; data matches attendance_records; cross-tenant rows absent.

---

## Phase 12b — Tracking + Lesson Planner
**Type:** vertical slice · teacher working tools

Tables: `trackers` (incl. `description`), `tracker_columns` (seven kinds, matching the prototype redesign: score / checkbox / select / rating (1–5) / text / grade / date; `options`, `grade_scale_id`), `tracker_entries`, `lesson_plans`

Views: none — grids read directly; keep cell writes cheap

Tests: isolation (teacher sees own classes' trackers only; students have **no access** — internal working data); typed-column validation (score respects max, check is boolean, grade must be a label of its scale, select must be one of its options); UNIQUE (column, student) upsert semantics

UI: Tracking Hub → Detail two-state structure (typed columns, keyboard navigation, settings slide-over — per the redesign spec), recents, lesson planner with optional session pinning

**Exit:** teacher builds a tracker with score/grade/select/check columns, fills cells with keyboard navigation; a student account cannot read any tracker row; lesson plans persist across sessions.

---

## Phase 12c — Resources (Materials library)
**Type:** vertical slice · teacher working tools · depends on Phase 2 (files) and 12b (`lesson_plans`)

Tables: `resources`, `resource_shares`, `resource_access_requests`, `resource_links`, `resource_usage_events`, `resource_access_log`

RLS helper: `resource_can_open()` — shared by policies and `sign-download`

RPCs: `share_resource`, `unshare_resource`, `request_access`, `decide_access_request` (audited), `attach_resource`, `detach_resource`, `update_resource_link`, `admin_open_resource` (audited), `release_restricted_to_centre` (offboarding, audited)

Views: `v_resource_usage_count`, `v_resource_recent`

Tests: visibility matrix (creator / other staff / admin / student × centre / on_request / private — see vs open); approval creates the share atomically; approver falls to an admin when the creator is deactivated; admin override writes `resource_access_log`; student sees a resource only via a `student_visible` link after `visible_from`; mark schemes default hidden from students; detach keeps the usage event; `sign-download` refuses when `resource_can_open` is false

UI: Materials library (teacher + admin — list/grid, facets, detail drawer, share, request, approve), attach-resources panel in lesson planner and homework builder, staff offboarding release

**Exit:** teacher uploads an on-request worksheet; a colleague requests and is approved; it is attached to a lesson plan and a homework with a mark scheme hidden until after the deadline; "used in N places" reflects the links.

---

## Phase 13 — Stripe billing ⟶ Milestone M2
**Type:** vertical slice · **Milestone M2**

Tables: extends `plans` (adds `audience`, `price_yearly`, `sort_order`, `limits`, `capabilities`, Stripe price ids) and `subscriptions` (adds `billing_cycle`, Stripe ids, `paused_from/until`, `redeemed_code_id`) — both created in Phase 1; new: `plan_codes`, `plan_code_redemptions`, `storage_addons`, `feature_flags` (scope, rollout, plan gate, targeting), `billing_events`

RLS helpers: `flag_enabled()` (the effective flag per account, behind `v_account_flags`); `plan_capability()` and `plan_limit()` arrived in Phase 1 and now read the full catalogue

Views: `v_account_flags`

RPCs: `manage_plan_code`, `redeem_plan_code` (validates max_redemptions, logs redemption — audited), `update_feature_flag`

Railway endpoints: `POST /v1/billing/checkout` (plan + cycle, audience-matched), `POST /v1/billing/portal`, `POST /v1/billing/pause`, `POST /v1/webhooks/stripe` (idempotent via `processed_events`; appends `billing_events`)

Email templates: subscription payment failed, trial ending

Tests: webhook idempotency (replay produces no duplicate rows), plan limits and capabilities enforced (seats, storage, centres, students, invoices/month), no code path compares a plan code, trial stamped at signup unaffected by later platform offer changes, code redemption (each kind: free_trial / percent_off / fixed_price; max_redemptions enforced; duration expiry), storage add-on raises effective quota, pause and resume, flag rollout deterministic per account

UI: plan picker (account owner, monthly/yearly), promo-code redemption in the billing tab, billing details, superadmin plan catalogue editor + plan-code manager + trial offer, billing portal link, capability-gated UI surfaces with upgrade prompts, centres page (plan-gated add-centre)

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

Seeds: the three solo plans — `solo_free` (3 students, 3 invoices/month, 250 MB, core only), `solo_core` (25 students, unlimited invoices, 2 GB; group lessons, lesson planner, tracking, homework, reports), `solo_pro` (60 students, 10 GB; adds homework bank, report rules, at-risk flags, payment reminders, VAT, analytics exports, waiting list)

Behaviour: `provision_account` for `kind = 'solo'` creates the implicit centre, all memberships, `dsl_role = 'lead'`, `centre_register_settings.backfill_hours = 168` and `pre_open_minutes = 10`; one-to-one lessons record `delivered_minutes`; monthly invoices generated from delivered time × hourly rate; the tutor self-reopens a lapsed register with a mandatory reason; summer pause via `POST /v1/billing/pause`; concern log private to the tutor with escalation contacts; safeguarding, guardian and health records available on every tier

Tests: solo provisioning creates exactly one implicit centre and the four role rows; every capability key hides its surface when off and every limit refuses in the write path; self-unlock without a note refused; a solo account cannot add a second centre or be offered a centre plan; safeguarding surfaces present on `solo_free`

UI: solo shell (no role strip, no centre chrome), dashboard with "worth a look" signals, students, lessons (one-to-one + groups), timetable, registers with reopen-with-reason, invoices + earnings, safeguarding concern log, plan & billing (monthly/yearly, summer pause, meters), capability-driven nav and upsell cards

**Exit:** a tutor signs up as solo, adds students up to the tier cap, takes one-to-one and group registers, generates a month's invoices from delivered time, logs a concern, and moves between tiers with surfaces appearing and disappearing by capability alone.

---

## Phase 14 — Superadmin + privacy ⟶ Milestone M3
**Type:** vertical slice · **Milestone M3**

Tables: `support_sessions`, `jobs` (the one generic async-job table — the SAR and erasure exports below are the first callers, so it is created here and Phase 15 adds the import kinds); `audit_log` gains `actor_role`, `ip`, `support_session_id` (columns created in Phase 1, surfaced here)

Railway endpoints: `POST /v1/admin/accounts`, `POST /v1/admin/accounts/:id/suspend`, `POST /v1/admin/accounts/:id/restore`, `POST /v1/privacy/erasure`, `POST /v1/privacy/sar-export`, `GET /v1/jobs/:id` (poll async jobs — GET, matching the reference and Phase 15)

RPCs: `provision_account` (also listed in Phase 1 — intentional: the RPC ships in Phase 1, the superadmin UI for it ships here), `set_account_plan` (writes `subscriptions` — `accounts` carries no plan or trial mirror), `update_platform_settings` (maintenance, read-only, signups, status page, trial offer, defaults), `start_support_session` / `end_support_session` (≤ 60 min, tied to a support email reference, audited), `clear_lockout`, `block_identifier`, `update_data_request`

Support: by **email** (decision #30) — no ticket system. Impersonation banner visible to the superadmin **and** to the tenant's admins for the whole session; every action inside it carries `audit_log.support_session_id`; safeguarding and health tables never admit a support session.

Maintenance + read-only mode: global banners driven by `platform_settings`

Email templates: import job finished, SAR export ready, support session started (to the account owner)

Tests: superadmin cannot access centre-level data outside a support session; support session expires and cannot read safeguarding/health; erasure anonymises profile but preserves safeguarding records; SAR bundle is complete; DSAR `due_at` set to one month and surfaced when close; read-only mode blocks tenant writes

UI: superadmin console (dashboard, centres/accounts with detail popover, users directory, revenue + failed payments from `billing_events`, engagement), platform controls (maintenance, read-only, signups, status page, trial offer, feature flags), security page (suspicious activity from `v_suspicious_activity`, clear/block), DSAR queue with deadlines, platform audit log, impersonation banner, privacy request workflow

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

- AADC formal review against concrete fields: student-role surface audit; `user_preferences.streak_nudges` (default off, locked for under-13s); accessibility toggles (`text_size`, `high_contrast`, `dyslexia_font`); homework countdown default off; rank exposure (`show_rank_to_students` default off, never for under-13s); under-13 notification defaults; student auth (under-13 PIN only)
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
- Monitoring: Sentry alert routing, PostHog dashboards, Railway + Supabase health alerts
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
| Predicted / target grades | Synthesised deterministically from scores | Stored `student_targets` |
| Rank exposure | `rank` / `classSize` always shown on returned homework | Gated by `show_rank_to_students` (default off) and age |
| Staff login | Password / magic link / OTP picker | Password + TOTP only |
| Student login | PIN / password / QR badge | PIN or password; no QR |
| Class join code | Derived 7-char code with a copy button on the Stream tab | No join code — remove the affordance |
| Class change request | Writes an audit row only; no admin inbox | `class_change_requests` + admin queue |
| Support desk | Superadmin ticket queue (`SA_TICKETS`) | Email support; `support_sessions` reference the email thread — ticket queue is a mock |
| Groups | No UI (none to remove) | Deferred; `group` not a target type |
| Feature flag `parent_payments` | "Parents pay invoices in-app" flag in `SA_FLAGS` | Not a feature — ledger-only invoicing and no parent role (decisions #13, #18). Remove the flag |
| Platform switches | Split across five places: maintenance in `tutoros.maintenance`, read-only in page state, a hard-wired "New Signups" toggle with a no-op setter, the status page on System Health, defaults in `settings_store_v1.superadmin.platform` | One `platform_settings` row |
| Financial report | `REPORTS_INVOICES` — a second hardcoded financial list that doesn't reconcile with the invoice ledger — plus a third figure on the student profile's Fees tab | One ledger; every financial surface reads `v_invoice_report`; delete `REPORTS_INVOICES` and derive the Fees tab |
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
| Announcement controls | `announceAuthors` (`admins \| senior \| all`) and `approvalWorkflow` are editable but enforced nowhere; teachers can only post class announcements | `announce_authors` (`admins \| staff`) and `approval_workflow` gate `publish_announcement`; `pending_approval` is a real status |
| Parent role | A "Parent" role with "View child progress / Pay invoices" in Platform Controls, parent users in the directory, a "Parent Portal" usage metric, "linked parent account" copy in student settings | No parent role at all (decisions #13, #18) — guardians are data rows and email recipients |
| Student profile extras | Meetings/parents' evenings, teacher reviews with star ratings and per-lesson participation are synthesised for display | Not modelled — remove, or design them before they are built |
| Seat add-ons | "Added 14 student seats" appears as a purchasable add-on in the superadmin transactions | Seats change by changing plan; only storage has an add-on |
| Plan gating and support | A flag in `SA_FLAGS` is scoped "Scale only"; SSO appears in the audit log, the ticket queue and an archived "Enterprise" plan; impersonation starts from the console with no expiry, no stated reason and no banner for the tenant | Flags gate rollout only — plans gate surfaces through `plan_capability()` (#25); SSO is not in scope; `support_sessions` are ≤ 60 min, carry a support-email reference and show a banner to the tenant's admins (#30) |
| Keys and data shapes | Attendance marks and tracker cells are keyed by **student name**; `submittedBy` doubles as the delivering adult; amendments carry no reason; `assignments.status` uses `active`; `classes.status` uses `paused`; report pins are stored on the report | Keyed by `student_id` throughout; `sessions.delivered_by` is its own column; `attendance_amendments.reason` is required; assignment status is `draft \| published \| closed` (`scheduled` derived); class status is `active \| archived`; pinning is per-user in `report_user_state` |
| Lesson-plan uploads | Files attach to a lesson plan through a second upload path of its own | Lesson plans link to `resources` (Phase 12c) — one file model, one retention matrix |

---

## Prototype coverage gaps (documented, not yet prototyped)

Build-scope in the reference with no prototype surface. These carry design risk because no UI has tested the model.

**High risk — special-category data, prototype before Phase 1 ships them:**
- `student_health` (Art. 9), `emergency_contacts`, `consents` — the centre prototype has flat guardian fields, `underThirteen` and a `consentRecorded` boolean only: no SEN/EHCP, allergies, medications, emergency contact list or consent records. The solo demo goes a little further (free-text allergies and SEN notes, photo and data consent dates, a second guardian, escalation contacts), but nothing in either surface exercises the access model (centre_admin + DSL; teacher only when `privacy_flag(centre, 'teacher_reads_health')`), which needs a UI to argue with.
- `safeguarding_incidents` / `_notes` — the prototype's concern log (`COMMS_CONCERNS`) is far thinner than the append-only chronology. The DSL flag queue is well built; the incident log is not.

**Medium risk — a model with no UI to validate it:**
- **Assessments & results** (Phase 6) — no assessment entry screen, publish gate or per-student result rows. Every "score" today is a homework mark or a synthesised number, yet Progress, Tracking score columns, report test performance and at-risk all depend on results.
- **Rooms** and clash detection — rooms are free-text strings; no capacity or double-booking check.
- **Term breaks** — no holiday entry UI.
- **Families** as a first-class entity outside billing, and the guardian billing-contact chain.
- **Guardian approvals** beyond the under-13 consent screen (PIN reset by guardian magic link).

**Lower risk — infrastructure the prototype fakes by nature:** email outbox, suppressions and templates; Stripe webhooks, `processed_events` and add-on purchase; the DSAR lifecycle (static mock); `notification_prefs` per kind × channel (prototype has one flat section).

### Built in the prototype, scheduled in no phase

The inverse risk: working surfaces that no phase promises, so they would silently disappear in the rebuild. Each needs a phase or a decision to drop it.

- **Role dashboards** — Phase 1 promises "placeholder dashboards per role", but the prototype ships full admin, teacher and student dashboards with derived stat bands. The real ones have no home; they depend on Phases 3–8 for their data and belong at the end of each of those slices.
- **Subjects pages**, **teacher My Students**, **student My Classes** — list surfaces over Phase 3 tables that Phase 3's UI line does not mention.
- **Sessions with ICS export** (`StudentDashboard.jsx`) — calendar feed for a student's timetable; no endpoint in the reference.
- **Superadmin Engagement and System Health** — Phase 14's UI line covers the console and platform controls but neither of these.
- **Reports "Generate"** — a bulk report-creation action alongside the Phase 8b writer.
- **Remembered-device centre code** (`tutoros.lastCentre`) — prefills the centre on the login form; harmless, but it is device state nobody has specified.

---

*Last updated: September 2026, after the documentation audit and the Phase 0 setup decisions (see `klasio-setup-runbook.md`) — pre-Phase 0, prototype only; no monorepo, CI, or `/v1/health` exists yet. Update this line and the relevant inventory doc as each phase ships.*
