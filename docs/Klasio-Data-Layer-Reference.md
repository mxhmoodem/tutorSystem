**Klasio**
**Data-Layer Reference** *(v2)*

Postgres tables · RLS policies · API endpoints

*Multi-tenant SaaS for UK tuition centres. Supabase (Postgres + RLS) · Railway API · Cloudflare R2 · Stripe · Resend.*

*Roles: Superadmin · Account Owner · Centre Admin · Teacher · Student. **Account Owner** is an account-level designation (`accounts.owner_profile_id`), not a membership role. **DSL** is a capability (`memberships.dsl_role` = `lead` | `deputy`), not a role. There is no Parent role — guardians are data entities and email recipients only.*

> **Naming note (A8).** The product is **Klasio**. The prototype's `tutoros.*` localStorage keys are legacy; production keys are `klasio.*`. The rename is a **single one-shot migration at cutover**, not a piecemeal per-key change in the prototype.
>
> **No AI (locked decision #12).** There are no AI features, dependencies or copy anywhere in the platform. The Student Reports & Teacher Feedback domain (§10) is the successor to the deleted AI-feedback feature.

# Conventions

All tenant tables also carry `account_id uuid` and (where centre-scoped) `centre_id uuid` for RLS, plus `created_at timestamptz default now()`. Audited/mutable tables add `updated_at`.

Every table below has Row-Level Security enabled. The primary tenant boundary is **centre_id**, with **account_id** as the parent scope. Predicates in the RLS section are shorthand over the helper functions listed there. "system" means the Railway service acting with the service-role key after an explicit tenant check; "—" means the operation is not permitted for any interactive role.

The word "guardian" refers to a **student_guardians** row — contact and billing detail with no login. Guardian magic-links are an authentication *mechanism* for specific under-13 actions, not a role with a dashboard.

**Multi-role (A1).** A person may hold more than one role by holding more than one `memberships` row. The uniqueness constraint is `(profile_id, centre_id, role)`, so the same profile can be, e.g., `centre_admin` and `teacher` in one centre — this backs the dual-role view switch. All role checks are `EXISTS (…)` over membership rows, never `role =` on a single row.

# Part I — Database tables

Columns marked **special category** hold UK GDPR Article 9 data and carry the strictest policies and full audit.

## 1. Tenancy & identity

**accounts**

*The billing tenant — one paying organisation, may hold many centres.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK | gen_random_uuid() |
| name | text | Organisation name |
| slug | text UNIQUE | URL-safe identifier |
| owner_profile_id | uuid FK NOT NULL | → profiles.id — the Account Owner (A2). Ownership lives here, not on a membership row. |
| storage_policy | text | pooled \| split (A11) — how the storage quota is shared across centres |
| plan | text | Denormalised current plan code (mirrors subscriptions) |
| status | text | active \| suspended \| cancelled |
| billing_email | text | Where Klasio billing goes |
| created_at | timestamptz | default now() |

**centres**

*A physical tuition centre under an account. The primary RLS boundary.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| account_id | uuid FK | → accounts.id |
| name | text |  |
| slug | text | Unique within account |
| code | text UNIQUE | Centre login code — student login is centre-code + username (A11) |
| address_line1 / line2 / city / postcode | text | Postal address |
| phone | text |  |
| timezone | text | default 'Europe/London' — drives session local-time logic |
| vat_registered | boolean | default false (A5) |
| vat_number | text | UK VAT registration number (A5) |
| default_vat_rate | numeric | Centre default rate applied to new invoice lines (A5) |
| register_backfill_hours | int | default 72 — natural late-register backfill window (A3) |
| status | text | active \| archived |

**profiles**

*One row per authenticated user (staff and students). PK equals auth.users.id.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK | = auth.users.id |
| full_name | text |  |
| email | text | Nullable for PIN-only student accounts |
| phone | text |  |
| avatar_file_id | uuid FK | → files.id |
| locale | text | default 'en-GB' |

**memberships**

*Links a profile to a centre with a role. The spine of all RLS role checks. Multi-role (A1): a profile may hold several rows per centre.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| profile_id | uuid FK | → profiles.id |
| centre_id | uuid FK | → centres.id |
| account_id | uuid FK | Denormalised for RLS |
| role | text | centre_admin \| teacher \| student (A2 — `account_owner` removed; ownership is `accounts.owner_profile_id`) |
| dsl_role | text NULL | lead \| deputy (A7) — replaces the old `is_dsl` boolean. Partial unique index enforces **at most one `lead` per centre**. |
| status | text | active \| suspended |
| UNIQUE | (profile_id, centre_id, role) | A1 — one row per role, enabling multi-role |

**students**

*Student-specific extension of a profile, including PIN credentials.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| profile_id | uuid PK FK | → profiles.id |
| account_id / centre_id | uuid FK |  |
| family_id | uuid FK NULL | → families.id (A5) — billing family; siblings share one |
| student_ref | text | Human-facing reference |
| dob | date | Drives under-13 AADC treatment |
| year_group | text |  |
| enrolment_status | text | prospective \| active \| left |
| username | text | For PIN login (centre-code + username) |
| pin_hash | text | Argon2 hash — never the raw PIN |

**student_claims**

*Claim-slip provisioning for students created without an email (A11). Kept separate from `invitations` deliberately. Slip PDFs render via the files pipeline.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| student_id | uuid FK | → students.profile_id |
| account_id / centre_id | uuid FK |  |
| claim_code | text UNIQUE | Printed on the slip |
| synthetic_email | text | Placeholder identity for PIN-only accounts |
| setup_method | text | slip \| email \| under13_parent |
| printed_at / claimed_at / expires_at | timestamptz |  |
| created_by | uuid FK |  |

**student_guardians**

*Guardian as a DATA ENTITY and email recipient. No login, not a role.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| student_id | uuid FK | → students.profile_id |
| account_id / centre_id | uuid FK |  |
| full_name | text |  |
| relationship | text | mother \| father \| carer \| other |
| email / phone | text | Contact + comms destination |
| is_primary | boolean |  |
| is_billing_contact | boolean | Receives invoices |
| receives_comms | boolean | Announcement/notification opt-in |

**emergency_contacts**

*Special-category-adjacent. Tight RLS, centre-admin/DSL only.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| student_id | uuid FK |  |
| account_id / centre_id | uuid FK |  |
| name / relationship / phone | text |  |
| priority | int | Call order |
| notes | text |  |

**student_health**

*SPECIAL CATEGORY DATA (UK GDPR Art. 9). Strictest RLS + full audit.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| student_id | uuid PK FK |  |
| account_id / centre_id | uuid FK |  |
| allergies / medical_conditions / medications | text |  |
| sen_status | text | SEN / EHCP indicator |
| ehcp_ref | text |  |
| dietary | text |  |
| notes | text |  |
| updated_by | uuid FK | Who last edited |
| updated_at | timestamptz |  |

**consents**

*Consent records, captured by magic-link or recorded by admin.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| student_id | uuid FK |  |
| account_id / centre_id | uuid FK |  |
| consent_type | text | data_processing \| photo \| trip (A4 — `ai_marking` removed) |
| granted | boolean |  |
| granted_by_name | text | Guardian who consented |
| method | text | magic_link \| admin_recorded |
| evidence_token | text | Link token used, for audit |
| granted_at / expires_at | timestamptz |  |

**invitations**

*Staff invitations by email; token-based acceptance. (Student claim-slip provisioning is a separate mechanism — see `student_claims`.)*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| account_id / centre_id | uuid FK |  |
| email | text |  |
| role | text | Role to grant on acceptance |
| token_hash | text |  |
| invited_by | uuid FK |  |
| status | text | pending \| accepted \| expired \| revoked |
| expires_at / accepted_at | timestamptz |  |

**guardian_approvals**

*Magic-link MECHANISM (not a role) for under-13 actions: PIN reset, consent.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| student_id | uuid FK |  |
| account_id / centre_id | uuid FK |  |
| action_type | text | pin_reset \| consent |
| token_hash | text |  |
| status | text | pending \| confirmed \| expired |
| guardian_email | text | Destination |
| confirmed_at / expires_at | timestamptz |  |

## 2. Academic

**subjects**

*Taught subjects, each bound to a default grade scale.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| centre_id / account_id | uuid FK |  |
| name / code | text |  |
| level | text | Optional level tag (A11) |
| description | text | Optional description (A11) |
| colour | text | brand-token reference, not raw hex |
| grade_scale_id | uuid FK | → grade_scales.id |
| active | boolean |  |

**year_groups / levels / exam_boards** *(A11 — per-centre class-dimension lookups)*

*Configurable dimensions referenced by `classes`. Centre admins add new values inline. Identical shape:*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| centre_id | uuid FK |  |
| account_id | uuid FK |  |
| name | text |  |
| sort_order | int |  |

**terms**

*Academic terms. Exactly one `is_active` per centre.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| centre_id / account_id | uuid FK |  |
| name | text |  |
| starts_on / ends_on | date |  |
| is_active | boolean | Partial unique index enforces one true. **Deliberate divergence from derive-don't-store (A9)** — see note below. |

> **A9 — `terms.is_active` is a kept, deliberate exception.** "Current term" is a *business designation*, not a date fact: during half-terms and holidays a pure date-derivation is ambiguous, which caused the active-term incoherence this flag fixes. The flag is authoritative, guarded by a partial unique index (one `true` per centre) and flipped only through the audited `set_active_term` RPC. The prototype's date-based `resolveActiveTerm` is **superseded** by this flag.

**term_breaks**

*Holiday ranges within a term; session generation skips these.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| term_id | uuid FK |  |
| account_id / centre_id | uuid FK |  |
| name | text |  |
| starts_on / ends_on | date |  |

**rooms**

*Physical rooms for scheduling and clash detection. Deferrable for single-room centres.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| centre_id / account_id | uuid FK |  |
| name | text |  |
| capacity | int |  |
| active | boolean |  |

**classes**

*A recurring taught class within a term. References the configurable dimension lookups (A11).*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| centre_id / account_id | uuid FK |  |
| subject_id | uuid FK |  |
| name | text |  |
| year_group_id | uuid FK | → year_groups.id (A11) |
| level_id | uuid FK NULL | → levels.id (A11) |
| exam_board_id | uuid FK NULL | → exam_boards.id (A11) |
| teacher_id | uuid FK | → profiles.id (the substantive teacher) |
| room_id | uuid FK |  |
| term_id | uuid FK |  |
| capacity | int |  |
| status | text | active \| archived |

**class_cover** *(A11 — cover / substitute teacher)*

*A temporary cover teacher on a class for a date range. The **effective teacher** per session date is **derived** (`v_effective_teacher`), never a stored `coverActive` flag. Schedule views render the cover teacher within the range.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| class_id | uuid FK |  |
| account_id / centre_id | uuid FK |  |
| cover_teacher_id | uuid FK | → profiles.id |
| starts_on / ends_on | date |  |
| reason | text |  |
| created_by | uuid FK |  |
| created_at | timestamptz |  |

**class_schedules**

*Recurrence pattern stored as LOCAL time + weekday, not naive UTC.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| class_id | uuid FK |  |
| account_id / centre_id | uuid FK |  |
| weekday | int | 0–6 |
| starts_at_local / ends_at_local | time | Centre-local wall clock |
| room_id | uuid FK |  |
| effective_from / effective_to | date |  |

**sessions**

*A concrete dated occurrence. `register_submitted_*` confirms delivery.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| class_id | uuid FK |  |
| account_id / centre_id | uuid FK |  |
| starts_at / ends_at | timestamptz | Materialised from schedule + timezone |
| room_id | uuid FK |  |
| status | text | scheduled \| delivered \| cancelled (the three-value persisted enum) |
| register_submitted_at | timestamptz |  |
| register_submitted_by | uuid FK |  |

> **Register state machine — `v_session_state` (A3).** Six states are **derived at read time** from `sessions`, the backfill window and any active unlock; `sessions.status` stays the three-value persisted enum above.
>
> - `upcoming` — before `starts_at`.
> - `open_live` — between `starts_at` and `ends_at` (+ grace).
> - `awaiting` — `ends_at` (+ grace) has passed, register not submitted, **AND** (`now < ends_at + register_backfill_hours` **OR** an active `register_unlocks` grant exists). Submissions made during the natural backfill window are flagged **late**.
> - `lapsed` — backfill window passed and no active unlock. The register locks.
> - `recorded` — register submitted.
> - `cancelled` — session cancelled.
>
> A centre-admin `grant_unlock` re-derives a `lapsed` session back to `awaiting` (time-boxed: 2h / 4h / end-of-day / 24h / 48h); `submit_register` consumes the grant and the register **re-locks immediately**. The window length is `centres.register_backfill_hours` (default 72).

**enrolments**

*Student ↔ class membership over a date range.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| class_id / student_id | uuid FK |  |
| account_id / centre_id | uuid FK |  |
| starts_on / ends_on | date |  |
| status | text | active \| withdrawn \| waitlisted |

**attendance_records**

*Per-student mark per session. Written by submit_register.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| session_id / student_id | uuid FK |  |
| account_id / centre_id | uuid FK |  |
| status | text | present \| absent \| late \| excused |
| minutes_late | int |  |
| note | text |  |
| recorded_by | uuid FK |  |
| recorded_at | timestamptz |  |

## 3. Grades & assessment

**grade_scales**

*Unified grade model — replaces the fragmented taxonomy.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| centre_id / account_id | uuid FK |  |
| name | text |  |
| kind | text | numeric_9_1 \| letter_a_u \| percentage \| descriptor |

**grade_bands**

*Boundaries within a scale (e.g. 9 = 90–100).*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| grade_scale_id | uuid FK |  |
| account_id / centre_id | uuid FK |  |
| label | text |  |
| min_value / max_value | numeric |  |
| sort_order | int |  |

**assessments**

*A gradable event for a class.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| class_id | uuid FK |  |
| account_id / centre_id | uuid FK |  |
| subject_id | uuid FK |  |
| title | text |  |
| assessed_on | date |  |
| grade_scale_id | uuid FK |  |
| max_marks | numeric |  |
| created_by | uuid FK |  |

**results**

*A student's outcome on an assessment.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| assessment_id / student_id | uuid FK |  |
| account_id / centre_id | uuid FK |  |
| marks | numeric |  |
| grade_band_id | uuid FK |  |
| comment | text |  |
| published | boolean | Hidden from student/guardian until true |
| recorded_by | uuid FK |  |

## 4. Staff & pay

**staff_details**

*Employment metadata for staff. Sensitive; admin-scoped.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| profile_id | uuid PK FK |  |
| account_id / centre_id | uuid FK |  |
| employment_type | text | employed \| contractor |
| start_date | date |  |
| ni_number_ref | text | Tokenised reference, not the raw NI number |
| notes | text |  |

**staff_rates**

*Pay rate over time. Changes are audited.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| profile_id | uuid FK |  |
| account_id / centre_id | uuid FK |  |
| rate_type | text | hourly \| session |
| amount | numeric |  |
| currency | text | default GBP |
| effective_from / effective_to | date |  |
| created_by | uuid FK |  |

**timesheet_entries**

*Teaching rows are DERIVED from register submission; non-teaching rows may be entered manually (A10).*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| session_id | uuid FK NULL | Set for `teaching` rows; null for manual non-teaching work |
| profile_id | uuid FK | The teacher |
| account_id / centre_id | uuid FK |  |
| type | text | teaching \| prep \| marking \| meeting \| training \| cover (A10) |
| minutes | int |  |
| rate_id | uuid FK |  |
| derived_amount | numeric |  |
| status | text | draft \| submitted \| approved \| rejected \| exported (A10 — `paid` dropped) |

> **A10 — timesheet entry rules.** `type = 'teaching'` rows are **system-derived only** (written by `submit_register`) and cannot be inserted by hand. All other types (`prep`, `marking`, `meeting`, `training`, `cover`) may be **inserted manually by the teacher for themselves**, subject to admin approval. Klasio is a ledger-only platform and does not assert payroll payment, so there is no `paid` status — `exported` marks the CSV hand-off to payroll.

**timesheet_adjustments**

*Audited deltas against a derived entry.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| timesheet_entry_id | uuid FK |  |
| account_id / centre_id | uuid FK |  |
| delta_minutes / delta_amount | numeric |  |
| reason | text |  |
| created_by | uuid FK |  |

## 5. Homework

**assignments**

*A homework set for a class.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| class_id | uuid FK |  |
| account_id / centre_id | uuid FK |  |
| subject_id | uuid FK |  |
| title / instructions | text |  |
| due_at | timestamptz |  |
| status | text | draft \| published \| closed |
| created_by | uuid FK |  |

**assignment_targets**

*Polymorphic targeting: class, group, or individual student.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| assignment_id | uuid FK |  |
| account_id / centre_id | uuid FK |  |
| target_type | text | class \| group \| student |
| target_id | uuid | Points at the matching table |

**questions**

*Question bank per assignment; heterogeneous payloads in JSONB.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| assignment_id | uuid FK |  |
| account_id / centre_id | uuid FK |  |
| sort_order | int |  |
| type | text | mcq \| multi \| numeric \| expression \| short_text \| long_text |
| prompt | text |  |
| config | jsonb | Options, correct answer, tolerance |
| max_marks | numeric |  |

**submissions**

*A student's attempt at an assignment. Marking is done by the teacher (no AI — A4).*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| assignment_id / student_id | uuid FK |  |
| account_id / centre_id | uuid FK |  |
| status | text | not_started \| in_progress \| submitted \| marked \| returned |
| submitted_at | timestamptz |  |
| score | numeric |  |

**answers**

*Per-question response; objective types auto-mark on submit.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| submission_id / question_id | uuid FK |  |
| account_id / centre_id | uuid FK |  |
| response | jsonb |  |
| auto_marked | boolean |  |
| marks_awarded | numeric |  |

> **A4 — `ai_feedback` deleted.** The AI-draft-feedback table, its RLS row, its RPC (`approve_feedback`) and both Homework-AI endpoints are removed. Objective question types auto-mark; subjective marking and written feedback are done by the teacher (Homework) and via the Student Reports domain (§10).

## 6. Invoicing (ledger-only)

**families** *(A5 — billing family)*

*Groups siblings under one billing unit. Invoices are raised against the family; lines attribute to individual students.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| account_id / centre_id | uuid FK |  |
| name | text |  |
| billing_guardian_id | uuid FK NULL | → student_guardians.id (A5, decision #3) — the explicit billing contact for the family. Tie-break when null: the primary `is_billing_contact` guardian of the eldest student. |
| created_at | timestamptz |  |

**fee_plans**

*Reusable fee templates.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| centre_id / account_id | uuid FK |  |
| name | text |  |
| amount | numeric |  |
| currency | text |  |
| cadence | text | monthly \| termly \| one_off |
| active | boolean |  |

**invoice_sequences**

*Per-centre invoice numbering. Import never generates numbers.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| centre_id | uuid PK |  |
| account_id | uuid FK |  |
| prefix | text |  |
| next_number | bigint |  |

**invoices**

*Header. Raised against a family (A5). STATUS and monetary totals are DERIVED at read time, never stored.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| centre_id / account_id | uuid FK |  |
| family_id | uuid FK NOT NULL | → families.id (A5 — replaces `student_id`) |
| invoice_number | text | From invoice_sequences |
| issue_date / due_date | date |  |
| currency | text |  |
| voided_at / void_reason | timestamptz / text |  |
| created_by | uuid FK |  |

> **A5 — derived totals.** `subtotal`, `vat_total` and `total` are **derived at read time** from the invoice lines (sum of `line_total`, sum of `vat_amount`), never stored. Status derives from schedule vs payments as before.

**invoice_lines**

*Line items. Each line attributes to a sibling and carries its own VAT (A5).*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| invoice_id | uuid FK |  |
| account_id / centre_id | uuid FK |  |
| student_id | uuid FK | → students.profile_id (A5) — attributes the line to an individual sibling |
| description | text |  |
| quantity / unit_amount / line_total | numeric |  |
| vat_rate | numeric | Per-line rate (A5); `vat_amount` derived at read time |
| fee_plan_id | uuid FK |  |

**payment_schedules**

*Planned instalments — the basis for derived status and reminders.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| invoice_id | uuid FK |  |
| account_id / centre_id | uuid FK |  |
| due_date | date |  |
| amount | numeric |  |
| sort_order | int |  |

**payments**

*Manually recorded receipts. No money moves through the portal.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| invoice_id | uuid FK |  |
| account_id / centre_id | uuid FK |  |
| amount | numeric |  |
| method | text | cash \| bank \| card_external |
| paid_on | date |  |
| reference | text |  |
| recorded_by | uuid FK |  |

## 7. Communications

**comms_settings**

*Per-centre messaging policy.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| centre_id | uuid PK |  |
| account_id | uuid FK |  |
| quiet_hours_start / quiet_hours_end | time |  |
| student_messaging_enabled | boolean |  |
| default_preset | text | locked \| standard \| open |

**announcements**

*One-to-many broadcast, resolved into receipts on publish. Audience is expressed via the `announcement_targets` child table (A11, decision #4).*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| centre_id / account_id | uuid FK | `centre_id` null for `platform` scope (superadmin) |
| author_id | uuid FK |  |
| title / body | text |  |
| priority | text | normal \| high (A11) |
| pinned | boolean | (A11) |
| ack_required | boolean |  |
| publish_at | timestamptz |  |
| expires_at | timestamptz NULL | (A11) |
| status | text | draft \| published |

**announcement_targets** *(A11, decision #4 — replaces `scope_type`/`scope_ref`)*

*Child rows describing the audience. RLS-friendlier than a jsonb blob.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| announcement_id | uuid FK |  |
| account_id / centre_id | uuid FK |  |
| target_type | text | platform \| centre \| role \| group \| year \| class \| subject |
| target_ref | uuid NULL | Null for `platform` / `centre` scope |

**announcement_receipts**

*Per-recipient read/ack row.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| announcement_id | uuid FK |  |
| account_id / centre_id | uuid FK |  |
| recipient_id | uuid FK |  |
| read_at / acknowledged_at | timestamptz |  |

**conversations**

*A message thread. Staff↔student threads are DSL-observed.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| centre_id / account_id | uuid FK |  |
| kind | text | direct \| group |
| preset | text | locked \| standard \| open |
| subject | text |  |
| created_by | uuid FK |  |
| dsl_observed | boolean |  |

**conversation_participants**

*Membership + read state (last_read_at holds unread logic).*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| conversation_id | uuid FK |  |
| account_id / centre_id | uuid FK |  |
| profile_id | uuid FK |  |
| role_in_convo | text | member \| observer |
| last_read_at | timestamptz |  |
| joined_at | timestamptz |  |

**messages**

*A single message. Sending = INSERT; triggers flag + broadcast.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| conversation_id | uuid FK |  |
| account_id / centre_id | uuid FK |  |
| sender_id | uuid FK |  |
| body | text |  |
| file_id | uuid FK |  |
| edited_at | timestamptz |  |

**message_flags**

*Safeguarding flag raised by a trigger against flag_rules.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| message_id | uuid FK |  |
| account_id / centre_id | uuid FK |  |
| rule_id | uuid FK |  |
| severity | text | low \| medium \| high |
| status | text | open \| resolved \| dismissed |
| resolved_by | uuid FK |  |
| resolved_at | timestamptz |  |

**flag_rules**

*Configurable detection rules.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| centre_id / account_id | uuid FK |  |
| name | text |  |
| pattern_type | text | keyword \| contact \| out_of_hours |
| pattern | text |  |
| severity | text |  |
| active | boolean |  |

**safeguarding_incidents**

*SPECIAL CATEGORY. DSL concern log, independent of any message.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| centre_id / account_id | uuid FK |  |
| student_id | uuid FK |  |
| raised_by | uuid FK |  |
| category | text |  |
| severity | text |  |
| summary | text |  |
| status | text | open \| monitoring \| closed |
| opened_at / closed_at | timestamptz |  |

**safeguarding_incident_notes**

*APPEND-ONLY chronology. Never editable or deletable.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| incident_id | uuid FK |  |
| account_id / centre_id | uuid FK |  |
| author_id | uuid FK |  |
| note | text |  |
| created_at | timestamptz |  |

## 8. Files & storage

**files**

*Metadata for an R2 object. Credentials never reach the client.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| account_id / centre_id | uuid FK |  |
| bucket_key | text | R2 object key |
| filename / content_type | text |  |
| size_bytes | bigint |  |
| uploaded_by | uuid FK |  |
| status | text | pending \| confirmed \| deleted |
| confirmed_at | timestamptz |  |

**file_links**

*Polymorphic attachment of a file to any entity.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| file_id | uuid FK |  |
| account_id / centre_id | uuid FK |  |
| entity_type | text | message \| homework \| student \| report \| ... |
| entity_id | uuid |  |

**storage_rollups**

*Per-centre usage against the pooled account quota.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| centre_id | uuid PK |  |
| account_id | uuid FK |  |
| total_bytes | bigint |  |
| file_count | int |  |
| updated_at | timestamptz |  |

**storage_addons** *(A11 — purchased storage blocks)*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| account_id | uuid FK |  |
| blocks | int | Number of purchased storage blocks |
| purchased_at | timestamptz |  |
| stripe_ref | text |  |

> **A11 — storage notes.** Account storage may be `pooled` or `split` across centres (`accounts.storage_policy`). Delete flows honour **retention locks** (records under a retention hold cannot be deleted). R2 connection config (bucket / region / access keys) is **platform infrastructure config held in env/secrets — not a tenant table**.

## 9. Platform & operations

**centre_settings**

*Per-centre config blob (branding, grading defaults, feature toggles).*

| Column | Type | Notes |
| :---- | :---- | :---- |
| centre_id | uuid PK |  |
| account_id | uuid FK |  |
| branding | jsonb |  |
| grading_defaults | jsonb |  |
| features | jsonb |  |
| updated_at | timestamptz |  |

**platform_settings** *(A11 — maintenance mode + platform flags)*

*A single-row (or keyed) table of platform-wide switches. Maintenance mode and the impersonation banner live here (superadmin-only).*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | text PK | e.g. 'maintenance_mode' |
| value | jsonb | { enabled, message, since } |
| updated_by | uuid FK |  |
| updated_at | timestamptz |  |

**audit_log**

*APPEND-ONLY. Payments, flags, role changes, welfare edits, ownership transfers and report publishes all land here.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| account_id / centre_id | uuid FK |  |
| actor_id | uuid FK |  |
| action | text |  |
| entity_type / entity_id | text / uuid |  |
| meta | jsonb |  |
| created_at | timestamptz |  |

**notifications**

*In-app notification feed (the bell).*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| account_id / centre_id | uuid FK |  |
| recipient_id | uuid FK |  |
| kind | text |  |
| title / body | text |  |
| entity_type / entity_id | text / uuid |  |
| read_at | timestamptz |  |

**notification_prefs**

*Per-user, per-kind channel opt-in. AADC-safe defaults for under-13s.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| profile_id | uuid FK |  |
| account_id / centre_id | uuid FK |  |
| channel | text | in_app \| email |
| kind | text |  |
| enabled | boolean |  |

**plans**

*GLOBAL catalogue (no tenant columns). Superadmin-managed.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| code | text |  |
| name | text |  |
| price_monthly | numeric |  |
| limits | jsonb | Seats, storage, centres (maxCentres) |
| active | boolean |  |

**plan_codes** *(A11 — superadmin price-override codes)*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| code | text UNIQUE |  |
| kind | text | free_trial \| percent_off \| fixed_price |
| value | numeric | Percentage or fixed price, per `kind` |
| duration_months | int | How long the override applies |
| max_redemptions | int |  |
| active | boolean |  |
| created_by | uuid FK |  |

**plan_code_redemptions** *(A11)*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| plan_code_id | uuid FK |  |
| subscription_id | uuid FK |  |
| redeemed_at | timestamptz |  |

**subscriptions**

*Account ↔ plan, mirrored from Stripe via webhook.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| account_id | uuid FK |  |
| plan_id | uuid FK |  |
| redeemed_code_id | uuid FK NULL | → plan_codes.id (A11) — active price override, if any |
| stripe_customer_id / stripe_subscription_id | text |  |
| status | text |  |
| current_period_end | timestamptz |  |

**feature_flags**

*Per-account (or global when account_id null) toggles.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| account_id | uuid FK NULL | Null = global |
| key | text |  |
| enabled | boolean |  |

**data_requests**

*Tracks SAR / erasure lifecycle for GDPR compliance.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| account_id / centre_id | uuid FK |  |
| subject_profile_id | uuid FK |  |
| kind | text | sar \| erasure |
| status | text | open \| in_progress \| completed |
| requested_by | uuid FK |  |
| completed_at | timestamptz |  |

**processed_events**

*Idempotency store — what makes Stripe/webhook handling exactly-once.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | text PK | Provider event id |
| provider | text | stripe \| resend |
| kind | text |  |
| processed_at | timestamptz |  |

**email_outbox**

*The only thing the mail worker reads. Nothing else calls Resend.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| account_id / centre_id | uuid FK |  |
| template_key | text |  |
| to_email | text |  |
| payload | jsonb |  |
| status | text | queued \| sent \| failed \| suppressed |
| attempts | int |  |
| last_error | text |  |
| scheduled_for / sent_at | timestamptz |  |

**email_suppressions**

*Hard-bounce / complaint blocklist checked at enqueue time.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| email | text PK |  |
| reason | text | hard_bounce \| complaint \| unsubscribe |
| created_at | timestamptz |  |

## 10. Student Reports & Teacher Feedback *(A12 — flagship; successor to the deleted AI-feedback feature)*

**report_rules**

*Declares which reports are required, for whom, and how often. The due engine (`v_reports_due`) derives everything from these rules.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| account_id / centre_id | uuid FK |  |
| target_type | text | tag \| class \| student |
| target_ref | uuid / text | The tag, class or student targeted |
| requirement | text | What must be reported |
| frequency | text | weekly \| fortnightly \| monthly \| half_termly \| termly |
| template_id | uuid FK | → report_templates.id |
| priority | int |  |
| active | boolean |  |
| created_by | uuid FK |  |

**report_templates**

*Reusable report structure (sections/prompts) per centre.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| centre_id / account_id | uuid FK |  |
| name | text |  |
| structure | jsonb | Sections + prompts |
| created_by | uuid FK |  |
| updated_at | timestamptz |  |

**rating_scales / rating_levels**

*The 4-tier rating taxonomy. One scale per centre; ordered levels with label + description.*

*rating_scales:*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| centre_id / account_id | uuid FK |  |
| name | text |  |

*rating_levels:*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| scale_id | uuid FK | → rating_scales.id |
| account_id / centre_id | uuid FK |  |
| label | text |  |
| description | text |  |
| sort_order | int | Ordered tiers |

**reports**

*A single student report. `body`/`ratings` are jsonb keyed to the template. Students see only `published` reports.*

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| account_id / centre_id | uuid FK |  |
| student_id | uuid FK |  |
| class_id | uuid FK NULL |  |
| rule_id | uuid FK NULL | → report_rules.id (if rule-driven) |
| template_id | uuid FK |  |
| author_id | uuid FK |  |
| period_start / period_end | date |  |
| status | text | draft \| submitted \| published |
| body | jsonb | Section content keyed to the template |
| ratings | jsonb | Selected rating levels |
| published_at | timestamptz |  |
| pdf_file_id | uuid FK NULL | → files.id (rendered PDF) |

> **A12 — the due/upcoming engine is a derived view (`v_reports_due`)**, computed from `report_rules` × `frequency` × existing `reports`. **Never store due-flags** (derive-don't-store). The engine skips `Optional` requirements. Guardians receive published reports **via email only** (no login).

## 11. Tracking (teacher grids) *(A13)*

**trackers**

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| account_id / centre_id | uuid FK |  |
| class_id | uuid FK |  |
| name | text |  |
| created_by | uuid FK |  |
| created_at | timestamptz |  |

**tracker_columns**

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| tracker_id | uuid FK |  |
| account_id / centre_id | uuid FK |  |
| name | text |  |
| kind | text | score \| check \| text |
| max_value | numeric NULL |  |
| sort_order | int |  |

**tracker_entries**

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| tracker_id | uuid FK |  |
| column_id | uuid FK |  |
| student_id | uuid FK |  |
| account_id / centre_id | uuid FK |  |
| value | jsonb / text |  |
| updated_by | uuid FK |  |
| updated_at | timestamptz |  |
| UNIQUE | (column_id, student_id) |  |

> **A13 — Tracking is internal teacher working data**, not published feedback. Students have **no access**. The Hub → Detail redesign (typed columns, keyboard nav, settings slide-over) is the UI spec this backs.

## 12. Lesson planner *(A14)*

**lesson_plans**

| Column | Type | Notes |
| :---- | :---- | :---- |
| id | uuid PK |  |
| account_id / centre_id | uuid FK |  |
| class_id | uuid FK |  |
| session_id | uuid FK NULL |  |
| author_id | uuid FK |  |
| title | text |  |
| body | jsonb |  |
| planned_for | date |  |
| created_at / updated_at | timestamptz |  |

# Part II — Row-Level Security

## Helper functions

Policies are expressed through a small set of SECURITY DEFINER helpers so predicates stay short and auditable.

| Function | Returns | Purpose |
| :---- | :---- | :---- |
| auth_uid() | uuid | Wraps auth.uid(); the calling user's profile id. |
| is_superadmin() | boolean | True if the JWT carries the platform-admin claim (allowlist). |
| auth_centre_ids() | uuid[] | Centres where the caller has an active membership. The core scoping set. |
| auth_account_id() | uuid | The caller's account (from membership); null for superadmin. |
| is_account_owner(account uuid) | boolean | **A2** — true when `accounts.owner_profile_id = auth_uid()`. The owner does not need a membership row at every centre. |
| has_role(centre uuid, roles text[]) | boolean | **A1** — `EXISTS` a membership row for the caller in that centre whose role is in `roles`. Never `role =` on a single row. |
| is_dsl(centre uuid) | boolean | **A7** — caller's membership in that centre has `dsl_role IS NOT NULL` (lead or deputy). |
| is_my_student(student uuid) | boolean | Caller teaches a class the student is enrolled in (teacher scope). |
| owns_profile(p uuid) | boolean | p = auth_uid(); own-record access for students/staff. |

Canonical scoped-read pattern (applied to every centre-scoped table):

```sql
create policy sel on <table> for select using (
  is_superadmin() or centre_id = any(auth_centre_ids())
);
```

> **A1/A2 — role & ownership checks.** Because a profile may hold multiple membership rows, every role check is an `EXISTS` over rows via `has_role(...)`. Account-owner authority is checked with `is_account_owner(account)`, which reads `accounts.owner_profile_id` — **not** a membership role.

## Per-table policy matrix

Read each non-empty cell as one or more policies to write and to cover in the RLS test suite. Scoped roles (centre_admin, teacher) each carry a tenant predicate the isolation suite must prove.

| Table | SELECT | INSERT | UPDATE | DELETE |
| :---- | :---- | :---- | :---- | :---- |
| accounts | superadmin; own account (auth_account_id) | superadmin | superadmin; is_account_owner (own) | superadmin |
| centres | superadmin; members of the account | superadmin; is_account_owner | superadmin; is_account_owner; centre_admin (own centre) | superadmin; is_account_owner |
| profiles | self; staff in a shared centre; superadmin | self (on signup); admin (invite flow) | self; centre_admin for managed users | superadmin |
| memberships | self; centre_admin in that centre; is_account_owner | is_account_owner; centre_admin | is_account_owner; centre_admin (role changes audited) | is_account_owner; centre_admin |
| students | centre staff; the student (self); superadmin | centre_admin | centre_admin; teacher (limited fields) | centre_admin |
| student_claims | centre_admin | centre_admin | centre_admin; system (claim) | centre_admin |
| student_guardians | centre staff; superadmin | centre_admin | centre_admin | centre_admin |
| emergency_contacts | centre_admin; is_dsl; teacher (view own students only) | centre_admin | centre_admin | centre_admin |
| student_health | centre_admin; is_dsl only (teacher only if centre setting allows) | centre_admin | centre_admin (audited) | centre_admin |
| consents | centre staff; superadmin | centre_admin; system (magic-link) | centre_admin | centre_admin |
| invitations | centre_admin; is_account_owner | centre_admin; is_account_owner | centre_admin (revoke) | centre_admin |
| guardian_approvals | centre_admin; system | centre_admin; system | system (confirm) | — |
| families | centre staff; the student (own family) | centre_admin | centre_admin | centre_admin |
| subjects / terms / term_breaks / rooms | centre members | centre_admin | centre_admin | centre_admin |
| year_groups / levels / exam_boards | centre members | centre_admin | centre_admin | centre_admin |
| classes | centre members (students: enrolled only) | centre_admin | centre_admin; teacher (own classes) | centre_admin |
| class_cover | centre staff | centre_admin; teacher (own classes) | centre_admin | centre_admin |
| class_schedules | centre members | centre_admin | centre_admin | centre_admin |
| sessions | centre staff; enrolled students | centre_admin; system (cron) | teacher (own, via register); centre_admin | centre_admin |
| enrolments | centre staff; the student (self) | centre_admin (RPC) | centre_admin (RPC) | centre_admin |
| attendance_records | centre staff; the student (self) | teacher via submit_register | teacher/centre_admin (amend, audited) | centre_admin |
| grade_scales / grade_bands | centre members | centre_admin | centre_admin | centre_admin |
| assessments | centre staff; enrolled students (if published) | teacher; centre_admin | teacher (own); centre_admin | centre_admin |
| results | centre staff; student (self, if published) | teacher; centre_admin | teacher (own); centre_admin | centre_admin |
| staff_details | self; centre_admin; is_account_owner | centre_admin | centre_admin; self (limited) | centre_admin |
| staff_rates | self; centre_admin | centre_admin (audited) | centre_admin (audited) | centre_admin |
| timesheet_entries | self (teacher); centre_admin | system (teaching, via trigger); teacher (non-teaching types, A10) | centre_admin (approve/adjust, audited) | — |
| timesheet_adjustments | self; centre_admin | centre_admin (audited) | — | — |
| assignments | centre staff; targeted students | teacher; centre_admin | teacher (own); centre_admin | teacher (own) |
| assignment_targets | centre staff; targeted students | teacher; centre_admin | teacher; centre_admin | teacher; centre_admin |
| questions | centre staff; students (on open assignment) | teacher; centre_admin | teacher (own) | teacher (own) |
| submissions | centre staff; the student (self) | student (self, RPC) | student (self, until submitted); teacher (marking) | — |
| answers | centre staff; the student (self) | student (self) | student (self, until submit); teacher (mark) | — |
| fee_plans | centre staff | centre_admin | centre_admin | centre_admin |
| invoice_sequences | centre_admin (via RPC only) | system | system (via RPC) | — |
| invoices | centre staff; family members (own invoices) | centre_admin (RPC) | centre_admin (void, audited) | — |
| invoice_lines | centre staff; family (self) | centre_admin | centre_admin | centre_admin |
| payment_schedules | centre staff; family (self) | centre_admin | centre_admin | centre_admin |
| payments | centre staff; family (self) | centre_admin via record_payment (audited) | — | — |
| comms_settings | centre staff | centre_admin | centre_admin | — |
| announcements | centre staff; recipients (via receipts) | teacher; centre_admin; superadmin (platform scope) | author; centre_admin | author; centre_admin |
| announcement_targets | centre staff | author; centre_admin | author; centre_admin | author; centre_admin |
| announcement_receipts | recipient (self); author; centre_admin | system (publish) | recipient (read/ack) | — |
| conversations | participants; is_dsl (observed threads) | staff (RPC, preset-checked) | participants (limited) | centre_admin |
| conversation_participants | participants; is_dsl | system (RPC) | self (last_read_at) | centre_admin |
| messages | participants; is_dsl | participant (INSERT — RLS checks membership) | sender (edit window) | — |
| message_flags | is_dsl; centre_admin | system (trigger) | is_dsl (resolve, audited) | — |
| flag_rules | centre_admin; is_dsl | centre_admin | centre_admin | centre_admin |
| safeguarding_incidents | is_dsl; centre_admin only | is_dsl; teacher (raise_concern) | is_dsl (audited) | — |
| safeguarding_incident_notes | is_dsl; centre_admin only | is_dsl (append-only) | — (immutable) | — |
| files | linked-entity viewers; uploader; centre_admin | authenticated (via sign-upload) | system (confirm) | uploader; centre_admin (retention-lock honoured) |
| file_links | entity viewers | uploader; system | — | uploader; centre_admin |
| storage_rollups | centre staff | system | system (cron) | — |
| storage_addons | is_account_owner; superadmin | system (Stripe) | — | — |
| centre_settings | centre staff | centre_admin | centre_admin | — |
| platform_settings | all authenticated (read) | superadmin | superadmin | — |
| audit_log | centre_admin; is_account_owner; is_dsl (own scope) | system only | — (append-only) | — |
| notifications | recipient (self) | system | recipient (mark read) | recipient |
| notification_prefs | self | self | self | self |
| plans | all authenticated (read); superadmin | superadmin | superadmin | superadmin |
| plan_codes | superadmin | superadmin | superadmin | superadmin |
| plan_code_redemptions | is_account_owner; superadmin | system (redeem) | — | — |
| subscriptions | is_account_owner; superadmin | system (webhook) | system (webhook) | — |
| feature_flags | account members (read); superadmin | superadmin | superadmin | superadmin |
| data_requests | centre_admin; is_account_owner; superadmin | centre_admin; superadmin | system; superadmin | — |
| processed_events | — (service-role only) | service-role | — | — |
| email_outbox | — (service-role only) | system (triggers/cron) | worker (service-role) | — |
| email_suppressions | — (service-role only) | system (webhook) | — | service-role |
| report_rules | centre staff | centre_admin | centre_admin | centre_admin |
| report_templates | centre staff | centre_admin | centre_admin | centre_admin |
| rating_scales / rating_levels | centre staff | centre_admin | centre_admin | centre_admin |
| reports | author; centre_admin; student (own, published only) | teacher (own drafts); centre_admin | teacher (own drafts); centre_admin; publish audited | centre_admin |
| trackers | teacher (own classes); centre_admin (read) | teacher (own classes) | teacher (own classes) | teacher (own classes); centre_admin |
| tracker_columns | teacher (own classes); centre_admin (read) | teacher (own classes) | teacher (own classes) | teacher (own classes) |
| tracker_entries | teacher (own classes); centre_admin (read) | teacher (own classes) | teacher (own classes) | teacher (own classes) |
| lesson_plans | teacher (own classes); centre_admin (read) | teacher (own classes) | teacher (own classes) | teacher (own classes) |

# Part III — API endpoints

Three surfaces. Plain CRUD goes through the Supabase client (PostgREST), authorised entirely by the RLS above — no hand-written code. Multi-table transactions are Postgres RPCs. Anything touching a secret or bypassing RLS is a Railway HTTP endpoint.

## Railway REST endpoints

**Auth & onboarding**

|  | Endpoint | Description |
| :---- | :---- | :---- |
| **POST** | /v1/invites | Create a staff invitation; sends the email via the outbox. |
| **POST** | /v1/invites/:id/resend | Re-send an unexpired invitation. |
| **POST** | /v1/auth/student/login | Centre-code + username + PIN exchange; mints a Supabase session via the admin API. |
| **POST** | /v1/auth/guardian-approvals | Issue a guardian magic link for an under-13 action (mechanism, not a role). |
| **POST** | /v1/auth/guardian-approvals/:token/confirm | Guardian confirms; unlocks the pending action, records consent. |
| **POST** | /v1/students/:id/claim-slip | Render the printable claim slip PDF via the files pipeline (A11). |
| **POST** | /v1/admin/accounts | Superadmin: provision account + owner + first centre in one transaction. |
| **POST** | /v1/admin/accounts/:id/suspend | Superadmin lifecycle (paired with /restore); audited. |

**Files (R2)**

|  | Endpoint | Description |
| :---- | :---- | :---- |
| **POST** | /v1/files/sign-upload | Permission + pooled-quota check → presigned PUT URL + pending files row. |
| **POST** | /v1/files/:id/confirm | Verify the object, record true size, update the storage rollup. |
| **POST** | /v1/files/:id/sign-download | Permission check → short-lived presigned GET URL. |
| **DELETE** | /v1/files/:id | Delete the R2 object, tombstone the row, adjust the rollup (retention-lock honoured). |

**Invoicing**

|  | Endpoint | Description |
| :---- | :---- | :---- |
| **POST** | /v1/invoices/:id/pdf | Render the invoice PDF, store to R2, return a file reference. |
| **POST** | /v1/invoices/:id/send | Email the invoice to the family's billing guardian with the PDF attached. |
| **GET** | /v1/invoices/export | CSV export — first leg of the export–fill–import reconciliation. |
| **POST** | /v1/invoices/import | Reconciliation import — references existing numbers only, never generates them. |

**Homework**

|  | Endpoint | Description |
| :---- | :---- | :---- |
| **POST** | /v1/homework/import-pdf | Parse an uploaded PDF into draft questions for the builder. |

> **A4 — the two Homework-AI endpoints are removed** (`POST /v1/homework/submissions/:id/draft-feedback` and its sibling). No Anthropic (or any AI) call exists anywhere in the stack.

**Reports (A12)**

|  | Endpoint | Description |
| :---- | :---- | :---- |
| **POST** | /v1/reports/:id/pdf | Render the report to PDF → R2, return a file reference. |
| **POST** | /v1/reports/:id/send | *(optional)* Email the published report to the student's guardians. |

**Bulk data & exports**

|  | Endpoint | Description |
| :---- | :---- | :---- |
| **POST** | /v1/students/import | Validated async CSV import; returns a job id. |
| **GET** | /v1/jobs/:id | Poll any async import/export job for status and error rows. |
| **GET** | /v1/reports/:key/export | Analytics exports as CSV or PDF (attendance, results, timesheets). |

**Billing (Klasio's own)**

|  | Endpoint | Description |
| :---- | :---- | :---- |
| **POST** | /v1/billing/checkout | Stripe Checkout session for a plan, at account level. |
| **POST** | /v1/billing/portal | Stripe customer portal link for the account owner. |
| **POST** | /v1/webhooks/stripe | Idempotent webhook receiver → syncs the subscriptions mirror. |

**Privacy**

|  | Endpoint | Description |
| :---- | :---- | :---- |
| **POST** | /v1/privacy/erasure | Anonymise-not-delete; tombstones the profile, preserves safeguarding records. |
| **POST** | /v1/privacy/sar-export | Subject access request — bundle everything held on one person. |

**Ops**

|  | Endpoint | Description |
| :---- | :---- | :---- |
| **GET** | /v1/health | Liveness probe for Railway. |
| **GET** | /v1/version | Build SHA and deploy time. |

**Email worker (webhooks)**

|  | Endpoint | Description |
| :---- | :---- | :---- |
| **POST** | /v1/webhooks/resend | Delivery/bounce/complaint events → update outbox + suppressions. |

## Postgres RPC functions

Invoked with the caller's own JWT, so RLS still applies. Grouped by the role that invokes each. **Audited** calls write an audit_log row in the same transaction.

**Superadmin**

| Function | Description | Audited |
| :---- | :---- | ----- |
| provision_account(payload) | Account + owner + first centre in one transaction. | **yes** |
| set_account_plan(account, plan) | Change plan; reconciles with Stripe. | **yes** |
| toggle_feature_flag(account, key, on) | Per-account flag. | — |
| set_maintenance_mode(on, message) | Platform maintenance switch (A11). | **yes** |
| start_support_session(account, ttl) | Scoped, time-boxed impersonation. Safeguarding-sensitive. | **yes** |

**Account owner**

| Function | Description | Audited |
| :---- | :---- | ----- |
| create_centre(payload) | New centre under the account. | **yes** |
| invite_member(centre, email, role) | Staff invitation. | **yes** |
| set_member_role(membership, role) | Role change (multi-role aware — grant/revoke a role row). | **yes** |
| transfer_ownership(account, profile) | **A2** — repoint `accounts.owner_profile_id` to the new owner (single-field mutation). Add the new identity + MFA first, then repoint; never swap credentials. | **yes** |

**Centre admin**

| Function | Description | Audited |
| :---- | :---- | ----- |
| enrol_student(class, student, starts_on) | Capacity + duplicate checks, then enrol. | — |
| withdraw_enrolment(enrolment, ends_on) | End-date; history preserved. | — |
| set_active_term(centre, term) | Single write for term context (A9). | **yes** |
| regenerate_sessions(class) | Rebuild future sessions, skipping term breaks. | — |
| assign_cover(class, teacher, starts_on, ends_on, reason) | Assign a cover teacher for a range (A11). | — |
| create_group(centre, name) / manage_group_members(...) | Groups for targeting + monitored convos. | — |
| publish_announcement(announcement) | Resolve targets into receipts. | — |
| record_payment(invoice, amount, method, paid_on) | The manual payment toggle. | **yes** |
| void_invoice(invoice, reason) | Void; number never reused. | **yes** |
| set_staff_rate(profile, rate) | New pay rate. | **yes** |
| approve_timesheet(entry) / adjust_timesheet(entry, delta) | Pay approval + adjustment. | **yes** |
| amend_attendance(record, status) | Correct a register mark. | **yes** |
| grant_unlock(session, window) / revoke_unlock(session) | Re-open a lapsed register, time-boxed (A3). | **yes** |
| redeem_plan_code(code) | Apply a price-override code to the subscription (A11). | **yes** |

**Teacher**

| Function | Description | Audited |
| :---- | :---- | ----- |
| submit_register(session, entries) | Keystone: attendance + session confirmation + timesheet derivation; consumes any active unlock. | **yes** |
| create_assignment(payload) / assign_homework(...) | Assignment + questions + targets. | — |
| record_result(assessment, student, marks) / publish_results(assessment) | Enter and publish grades. | — |
| draft_report(rule?, student, template) / publish_report(report) | Draft and publish a student report (A12). Publish is audited. | **publish: yes** |
| start_conversation(kind, participants) | Preset-checked; attaches DSL observer to staff↔student threads. | — |
| raise_concern(student, summary) | Open a safeguarding_incident from any context. | **yes** |

> **A4 — `approve_feedback` removed.** It approved an AI draft; there is no AI. Objective homework auto-marks; subjective marking is manual; written feedback lives in the Reports domain.

**DSL (capability: lead/deputy)**

| Function | Description | Audited |
| :---- | :---- | ----- |
| resolve_flag(flag, outcome, notes) | Action the flag queue. | **yes** |
| log_safeguarding_incident(student, payload) | Open an incident directly. | **yes** |
| add_incident_note(incident, note) | Append to the chronology. | **yes** |
| resolve_incident(incident, outcome) | Close/monitor an incident. | **yes** |

**Student**

| Function | Description | Audited |
| :---- | :---- | ----- |
| submit_homework(submission) | Lock answers, auto-mark objective types, queue the rest for teacher marking. | — |
| acknowledge_announcement(announcement) | Idempotent ack. | — |

## Supabase client (PostgREST) — generated, not listed

Everything not above is direct table access through the Supabase client, authorised by RLS: reading classes, students, invoices, dashboard metric views; updating profiles; marking notifications read; editing tracker grids and lesson plans. The elegant case is **sending a message**: a plain INSERT into messages. RLS verifies the sender is a participant, one trigger runs the flag scan, another broadcasts over Realtime — no endpoint, and the safeguarding pipeline cannot be bypassed because it lives below the API entirely.

---

## Derived views (`v_` prefix)

Reports/metrics/status are computed, never stored (derive-don't-store). Notable views introduced or amended by this reconciliation:

- `v_session_state` — the six derived register states (A3).
- `v_effective_teacher` — resolves substantive vs cover teacher per session date (A11); may be folded into the session views.
- `v_reports_due` — the report due/upcoming engine from rules × frequency × existing reports; skips Optional (A12).
- Invoice `subtotal` / `vat_total` / `total` — derived at read time from lines (A5).
