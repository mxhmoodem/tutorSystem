# Klasio — Data-Layer Reference (v3)

> **Postgres tables · RLS policies · API endpoints**
>
> Multi-tenant SaaS for UK tuition centres. Supabase (Postgres + RLS) · Railway API · Cloudflare R2 · Stripe · Resend.
>
> Membership roles: Centre Admin · Teacher · Student (a person may hold **multiple roles** in a centre via multiple membership rows). Superadmin is a platform claim, not a membership. **Account ownership is a field** — `accounts.owner_profile_id` — not a membership role. DSL is a capability (`dsl_role` = lead/deputy) on a membership, not a role. There is no Parent role — guardians are data entities and email recipients only. **There are no AI features anywhere in the platform** (locked decision #12).

---

> **v3 (July 2026) — reconciliation revision.** Product renamed **Klasio**. All AI artefacts removed (locked decision #12). New domains: Student Reports & Teacher Feedback (successor to AI feedback), Tracking & Lesson Planning. Multi-role memberships; ownership moved to `accounts.owner_profile_id`; DSL lead/deputy; family billing + VAT; natural register backfill window; plan override codes; student claim slips; cover teacher; configurable class dimensions; announcement multi-targeting; storage add-ons.

---

## Conventions

All tenant tables carry `account_id uuid` and (where centre-scoped) `centre_id uuid` for RLS, plus `created_at timestamptz default now()`. Audited/mutable tables add `updated_at`.

Every table has Row-Level Security enabled. The primary tenant boundary is **`centre_id`**, with **`account_id`** as the parent scope. Predicates in the RLS section are shorthand over the helper functions listed there. "system" means the Railway service acting with the service-role key after an explicit tenant check. "—" means the operation is not permitted for any interactive role.

"Guardian" refers to a `student_guardians` row — contact and billing detail with no login. Guardian magic-links are an authentication *mechanism* for specific under-13 actions, not a role with a dashboard.

---

## Part I — Database tables

~83 tables across eleven domains. Columns marked **⚠ special category** hold UK GDPR Article 9 data and carry the strictest policies and full audit.

---

### 1. Tenancy & identity

#### `accounts`
*The billing tenant — one paying organisation, may hold many centres.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| name | text | Organisation name |
| slug | text UNIQUE | URL-safe identifier |
| owner_profile_id | uuid FK NOT NULL | → profiles.id — **the single source of ownership.** Not a membership role; `transfer_ownership` repoints this one field |
| plan | text | Denormalised current plan code (mirrors subscriptions) |
| storage_policy | text | `pooled` \| `split` — how the account quota is shared across centres |
| status | text | `active` \| `suspended` \| `cancelled` |
| billing_email | text | Where Klasio billing goes |
| created_at | timestamptz | default now() |

#### `centres`
*A physical tuition centre under an account. The primary RLS boundary.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id | uuid FK | → accounts.id |
| name | text | |
| slug | text | Unique within account |
| code | text UNIQUE | Centre login code — students log in with centre-code + username + PIN |
| address_line1 / line2 / city / postcode | text | Postal address |
| phone | text | |
| timezone | text | default `'Europe/London'` — drives session local-time logic |
| vat_registered | boolean | default false |
| vat_number | text | Nullable |
| default_vat_rate | numeric | Applied to new invoice lines when VAT-registered |
| register_backfill_hours | int | default 72 — natural late-submission window before a register lapses (see `v_session_state`) |
| status | text | `active` \| `archived` |

#### `profiles`
*One row per authenticated user (staff and students). PK equals auth.users.id.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | = auth.users.id |
| full_name | text | |
| email | text | Nullable for PIN-only student accounts |
| phone | text | |
| avatar_file_id | uuid FK | → files.id |
| locale | text | default `'en-GB'` |

#### `memberships`
*Links a profile to a centre with a role. The spine of all RLS role checks. **Multi-role by design**: a person holds more than one role via more than one row (e.g. admin + teacher at the same centre — the dual-role view switch is built on this).*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| profile_id | uuid FK | → profiles.id |
| centre_id | uuid FK | → centres.id |
| account_id | uuid FK | Denormalised for RLS |
| role | text | `centre_admin` \| `teacher` \| `student` — ownership is **not** a role (see `accounts.owner_profile_id`) |
| dsl_role | text NULL | `lead` \| `deputy` — Designated Safeguarding Lead capability. Partial unique index: at most one `lead` per centre |
| status | text | `active` \| `suspended` |
| UNIQUE | (profile_id, centre_id, role) | Allows multi-role; role checks are `EXISTS` over rows, never equality on a single row |

#### `students`
*Student-specific extension of a profile, including PIN credentials.*

| Column | Type | Notes |
|---|---|---|
| profile_id | uuid PK FK | → profiles.id |
| account_id / centre_id | uuid FK | |
| student_ref | text | Human-facing reference |
| dob | date | Drives under-13 AADC treatment |
| year_group | text | |
| enrolment_status | text | `prospective` \| `active` \| `left` |
| family_id | uuid FK NULL | → families.id — sibling grouping for family billing |
| username | text | For PIN login — unique within centre; combined with `centres.code` at login |
| pin_hash | text | Argon2 hash — never the raw PIN |

#### `student_guardians`
*Guardian as a DATA ENTITY and email recipient. No login, not a role.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| student_id | uuid FK | → students.profile_id |
| account_id / centre_id | uuid FK | |
| full_name | text | |
| relationship | text | `mother` \| `father` \| `carer` \| `other` |
| email / phone | text | Contact + comms destination |
| is_primary | boolean | |
| is_billing_contact | boolean | Receives invoices |
| receives_comms | boolean | Announcement/notification opt-in |

#### `families`
*Sibling grouping — the billing unit. One invoice per family, not per student.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id / centre_id | uuid FK | |
| name | text | e.g. "The Ahmed family" |
| billing_guardian_id | uuid FK NULL | → student_guardians.id — explicit invoice recipient; falls back to the primary billing-contact guardian of the eldest student |
| created_at | timestamptz | |

#### `emergency_contacts`
*Special-category-adjacent. Tight RLS, centre-admin/DSL only.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| student_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| name / relationship / phone | text | |
| priority | int | Call order |
| notes | text | |

#### `student_health` ⚠ special category
*SPECIAL CATEGORY DATA (UK GDPR Art. 9). Strictest RLS + full audit.*

| Column | Type | Notes |
|---|---|---|
| student_id | uuid PK FK | |
| account_id / centre_id | uuid FK | |
| allergies / medical_conditions / medications | text | |
| sen_status | text | SEN / EHCP indicator |
| ehcp_ref | text | |
| dietary | text | |
| notes | text | |
| updated_by | uuid FK | Who last edited |
| updated_at | timestamptz | |

#### `consents`
*Consent records, captured by magic-link or recorded by admin.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| student_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| consent_type | text | `data_processing` \| `photo` \| `trip` |
| granted | boolean | |
| granted_by_name | text | Guardian who consented |
| method | text | `magic_link` \| `admin_recorded` |
| evidence_token | text | Link token used, for audit |
| granted_at / expires_at | timestamptz | |

#### `invitations`
*Staff invitations by email; token-based acceptance.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id / centre_id | uuid FK | |
| email | text | |
| role | text | Role to grant on acceptance |
| token_hash | text | |
| invited_by | uuid FK | |
| status | text | `pending` \| `accepted` \| `expired` \| `revoked` |
| expires_at / accepted_at | timestamptz | |

#### `student_claims`
*Student account provisioning — a different shape from staff invitations. Students are provisioned with a claim code + synthetic email and handed a printable slip; no email is sent.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| student_id | uuid FK | → students.profile_id |
| account_id / centre_id | uuid FK | |
| claim_code | text UNIQUE | Short human-typeable code on the slip |
| synthetic_email | text | Generated placeholder for the auth record |
| setup_method | text | `claim_slip` \| `admin_set_pin` |
| status | text | `pending` \| `claimed` \| `expired` \| `revoked` |
| printed_at / claimed_at / expires_at | timestamptz | Slip PDF rendered via the files pipeline |
| created_by | uuid FK | |

#### `guardian_approvals`
*Magic-link MECHANISM (not a role) for under-13 actions: PIN reset, consent.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| student_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| action_type | text | `pin_reset` \| `consent` |
| token_hash | text | |
| status | text | `pending` \| `confirmed` \| `expired` |
| guardian_email | text | Destination |
| confirmed_at / expires_at | timestamptz | |

---

### 2. Academic

#### `subjects`
*Taught subjects, each bound to a default grade scale.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| centre_id / account_id | uuid FK | |
| name / code | text | |
| level | text | e.g. KS3 / GCSE / A-Level |
| description | text | |
| colour | text | Brand-token reference, not raw hex |
| grade_scale_id | uuid FK | → grade_scales.id |
| active | boolean | |

#### `terms`
*Academic terms. Exactly one `is_active` per centre — the fix for active-term incoherence.*

> **Deliberate exception to derive-don't-store.** "Current term" is a business designation, not a purely temporal fact — date-derivation is ambiguous during half-terms and holidays and caused the incoherence this flag fixes. The stored flag (partial unique index, one true per centre) + the audited `set_active_term` RPC supersede the prototype's `resolveActiveTerm` date-derivation.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| centre_id / account_id | uuid FK | |
| name | text | |
| starts_on / ends_on | date | |
| is_active | boolean | Partial unique index enforces one true |

#### `term_breaks`
*Holiday ranges within a term; session generation skips these.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| term_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| name | text | |
| starts_on / ends_on | date | |

#### `rooms`
*Physical rooms for scheduling and clash detection. Deferrable for single-room centres.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| centre_id / account_id | uuid FK | |
| name | text | |
| capacity | int | |
| active | boolean | |

#### `class_dimensions`
*Per-centre configurable pick-lists for class setup (year groups, levels, exam boards) with inline add-new in the class form.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| centre_id / account_id | uuid FK | |
| kind | text | `year_group` \| `level` \| `exam_board` |
| name | text | UNIQUE within (centre_id, kind) |
| sort_order | int | |
| active | boolean | |

#### `classes`
*A recurring taught class within a term.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| centre_id / account_id | uuid FK | |
| subject_id | uuid FK | |
| name | text | |
| year_group | text | Sourced from `class_dimensions` (kind = year_group) |
| level | text | Sourced from `class_dimensions` (kind = level) |
| exam_board | text | Sourced from `class_dimensions` (kind = exam_board) |
| teacher_id | uuid FK | → profiles.id — the permanent teacher; temporary cover lives in `class_cover` and the effective teacher is **derived** |
| room_id | uuid FK | |
| term_id | uuid FK | |
| capacity | int | |
| status | text | `active` \| `archived` |

#### `class_schedules`
*Recurrence pattern stored as LOCAL time + weekday, not naive UTC.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| class_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| weekday | int | 0–6 |
| starts_at_local / ends_at_local | time | Centre-local wall clock |
| room_id | uuid FK | |
| effective_from / effective_to | date | |

#### `sessions`
*A concrete dated occurrence. `register_submitted_*` confirms delivery.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| class_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| starts_at / ends_at | timestamptz | Materialised from schedule + timezone |
| room_id | uuid FK | |
| status | text | **The only persisted enum:** `scheduled` \| `delivered` \| `cancelled` |
| register_submitted_at | timestamptz | |
| register_submitted_by | uuid FK | |

> **Register lifecycle states are derived, never stored.** The six operational states a register can be in (`upcoming`, `open_live`, `awaiting`, `lapsed`, `recorded`, `cancelled`) are computed at read time from `starts_at` / `ends_at` / `register_submitted_at`, the centre's `register_backfill_hours` window, any active `register_unlocks` grant, and the current time — see `v_session_state` in Part II. `sessions.status` remains the three-value persisted enum above.

#### `enrolments`
*Student ↔ class membership over a date range.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| class_id / student_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| starts_on / ends_on | date | |
| status | text | `active` \| `withdrawn` \| `waitlisted` |

#### `attendance_records`
*Per-student mark per session. Written by `submit_register`; corrected by `amend_attendance` within the amendment window.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| session_id / student_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| status | text | `present` \| `absent` \| `late` \| `excused` |
| minutes_late | int | |
| note | text | |
| recorded_by | uuid FK | |
| recorded_at | timestamptz | |

#### `register_unlocks`
*A time-boxed admin grant that reopens a locked/lapsed register for re-take. One-shot: consumed by the next `submit_register`, or auto-lapses at `expires_at`.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| session_id | uuid FK | → sessions.id |
| account_id / centre_id | uuid FK | |
| granted_by | uuid FK | Admin who granted (→ profiles.id) |
| granted_at | timestamptz | default now() |
| expires_at | timestamptz | Grant lapses here if unused (end-of-day / +Nh) |
| status | text | `active` \| `consumed` \| `revoked` \| `expired` |
| consumed_at | timestamptz | Set when a `submit_register` uses the grant |
| revoked_by / revoked_at | uuid FK / timestamptz | Set by `revoke_unlock` |
| note | text | Optional reason |

#### `attendance_amendments`
*Append-only audit of per-mark corrections. Written by `amend_attendance`; the `attendance_records` row holds the current value, this holds the history.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| attendance_record_id | uuid FK | → attendance_records.id |
| account_id / centre_id | uuid FK | |
| from_status / to_status | text | The change |
| reason | text | |
| amended_by | uuid FK | |
| created_at | timestamptz | default now() |

#### `class_cover`
*Temporary cover teacher over a date range. The effective teacher per session date is **derived** (`v_effective_teacher`) — no stored cover flag on the class.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| class_id | uuid FK | → classes.id |
| account_id / centre_id | uuid FK | |
| cover_teacher_id | uuid FK | → profiles.id |
| starts_on / ends_on | date | |
| reason | text | |
| created_by | uuid FK | |
| created_at | timestamptz | |

---

### 3. Grades & assessment

#### `grade_scales`
*Unified grade model — replaces the fragmented taxonomy.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| centre_id / account_id | uuid FK | |
| name | text | |
| kind | text | `numeric_9_1` \| `letter_a_u` \| `percentage` \| `descriptor` |

#### `grade_bands`
*Boundaries within a scale (e.g. 9 = 90–100).*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| grade_scale_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| label | text | |
| min_value / max_value | numeric | |
| sort_order | int | |

#### `assessments`
*A gradable event for a class.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| class_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| subject_id | uuid FK | |
| title | text | |
| assessed_on | date | |
| grade_scale_id | uuid FK | |
| max_marks | numeric | |
| created_by | uuid FK | |

#### `results`
*A student's outcome on an assessment.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| assessment_id / student_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| marks | numeric | |
| grade_band_id | uuid FK | |
| comment | text | |
| published | boolean | Hidden from student until true |
| recorded_by | uuid FK | |

---

### 4. Staff & pay

#### `staff_details`
*Employment metadata for staff. Sensitive; admin-scoped.*

| Column | Type | Notes |
|---|---|---|
| profile_id | uuid PK FK | |
| account_id / centre_id | uuid FK | |
| employment_type | text | `employed` \| `contractor` |
| start_date | date | |
| ni_number_ref | text | Tokenised reference, not the raw NI number |
| notes | text | |

#### `staff_rates`
*Pay rate over time. Changes are audited.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| profile_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| rate_type | text | `hourly` \| `session` |
| amount | numeric | |
| currency | text | default GBP |
| effective_from / effective_to | date | |
| created_by | uuid FK | |

#### `timesheet_entries`
*`teaching` entries are DERIVED from register submission — never entered manually. All other types (prep, marking, meetings, training, cover) are manually logged non-session work, subject to approval.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| session_id | uuid FK NULL | Set only for `teaching` entries (system-derived); null for manual types |
| profile_id | uuid FK | The teacher |
| account_id / centre_id | uuid FK | |
| type | text | `teaching` \| `prep` \| `marking` \| `meeting` \| `training` \| `cover` — RLS enforces that `teaching` rows are system-inserted only |
| minutes | int | |
| rate_id | uuid FK | |
| derived_amount | numeric | |
| status | text | `draft` \| `submitted` \| `approved` \| `rejected` \| `exported` — `exported` marks the payroll CSV hand-off; a ledger-only platform never asserts "paid" |

#### `timesheet_adjustments`
*Audited deltas against a derived entry.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| timesheet_entry_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| delta_minutes / delta_amount | numeric | |
| reason | text | |
| created_by | uuid FK | |

---

### 5. Homework

#### `assignments`
*A homework set for a class.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| class_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| subject_id | uuid FK | |
| title / instructions | text | |
| due_at | timestamptz | |
| status | text | `draft` \| `published` \| `closed` |
| created_by | uuid FK | |

#### `assignment_targets`
*Polymorphic targeting: class, group, or individual student.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| assignment_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| target_type | text | `class` \| `group` \| `student` |
| target_id | uuid | Points at the matching table |

#### `questions`
*Question bank per assignment; heterogeneous payloads in JSONB.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| assignment_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| sort_order | int | |
| type | text | `mcq` \| `multi` \| `numeric` \| `expression` \| `short_text` \| `long_text` |
| prompt | text | |
| config | jsonb | Options, correct answer, tolerance |
| max_marks | numeric | |

#### `submissions`
*A student's attempt at an assignment.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| assignment_id / student_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| status | text | `not_started` \| `in_progress` \| `submitted` \| `marked` \| `returned` |
| submitted_at | timestamptz | |
| score | numeric | |

#### `answers`
*Per-question response; objective types auto-mark on submit.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| submission_id / question_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| response | jsonb | |
| auto_marked | boolean | |
| marks_awarded | numeric | |

---

### 6. Student reports & teacher feedback
*The flagship written-feedback domain — the successor to the deleted AI-feedback feature. Entirely human-authored; no AI anywhere. Due/upcoming reports are **derived** from rules × frequency × existing reports, never stored as due-flags.*

#### `report_rules`
*What must be written, for whom, how often.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id / centre_id | uuid FK | |
| target_type | text | `tag` \| `class` \| `student` |
| target_ref | uuid / text | Points at the matching entity (tag name, class id, student id) |
| requirement | text | What the report must cover |
| frequency | text | `weekly` \| `fortnightly` \| `monthly` \| `half_termly` \| `termly` |
| template_id | uuid FK | → report_templates.id |
| priority | int | Ordering in the due queue |
| active | boolean | |
| created_by | uuid FK | |

#### `report_templates`
*Reusable report structure (sections/prompts) per centre.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id / centre_id | uuid FK | |
| name | text | |
| structure | jsonb | Ordered sections + prompts + which rating scale each section uses |
| created_by | uuid FK | |
| updated_at | timestamptz | |

#### `rating_scales`
*A named scale (the 4-tier taxonomy is the default seed).*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id / centre_id | uuid FK | |
| name | text | |
| active | boolean | |

#### `rating_levels`
*Ordered levels within a scale.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| rating_scale_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| label | text | |
| description | text | |
| sort_order | int | |

#### `reports`
*A written report about a student. Guardians receive published reports by email (PDF); students see published reports only.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id / centre_id | uuid FK | |
| student_id | uuid FK | |
| class_id | uuid FK NULL | |
| rule_id | uuid FK NULL | The rule this satisfies, if any |
| template_id | uuid FK | |
| author_id | uuid FK | The teacher |
| period_start / period_end | date | The period covered |
| status | text | `draft` \| `submitted` \| `published` |
| body | jsonb | Section content keyed to the template structure |
| ratings | jsonb | Section → rating_level_id |
| published_at | timestamptz | |
| pdf_file_id | uuid FK NULL | → files.id, rendered on publish |

---

### 7. Tracking & lesson planning
*Teacher working tools. Tracking grids are internal working data — students never see them (unlike published reports/results).*

#### `trackers`
*A spreadsheet-style grid a teacher keeps per class.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id / centre_id | uuid FK | |
| class_id | uuid FK | |
| name | text | |
| created_by | uuid FK | |
| created_at | timestamptz | |

#### `tracker_columns`
*Typed columns.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tracker_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| name | text | |
| kind | text | `score` \| `check` \| `text` |
| max_value | numeric NULL | For `score` columns |
| sort_order | int | |

#### `tracker_entries`
*One cell per (column, student).*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tracker_id / column_id / student_id | uuid FK | UNIQUE (column_id, student_id) |
| account_id / centre_id | uuid FK | |
| value | jsonb | Typed by the column kind |
| updated_by | uuid FK | |
| updated_at | timestamptz | |

#### `lesson_plans`
*Persisted lesson planning (was in-memory only in the prototype).*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id / centre_id | uuid FK | |
| class_id | uuid FK | |
| session_id | uuid FK NULL | Optionally pinned to a concrete session |
| author_id | uuid FK | |
| title | text | |
| body | jsonb | |
| planned_for | date | |
| created_at / updated_at | timestamptz | |

---

### 8. Invoicing (ledger-only)

#### `fee_plans`
*Reusable fee templates.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| centre_id / account_id | uuid FK | |
| name | text | |
| amount | numeric | |
| currency | text | |
| cadence | text | `monthly` \| `termly` \| `one_off` |
| active | boolean | |

#### `invoice_sequences`
*Per-centre invoice numbering. Import never generates numbers.*

| Column | Type | Notes |
|---|---|---|
| centre_id | uuid PK | |
| account_id | uuid FK | |
| prefix | text | |
| next_number | bigint | |

#### `invoices`
*Header. Billed to a FAMILY (siblings share one invoice), never a single student. STATUS IS DERIVED from schedule vs payments — never stored.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| centre_id / account_id | uuid FK | |
| family_id | uuid FK NOT NULL | → families.id — the billing unit; per-student attribution lives on the lines |
| invoice_number | text | From invoice_sequences |
| issue_date / due_date | date | |
| subtotal / vat_total / total | numeric | Snapshotted at issue — an issued invoice is an immutable document |
| currency | text | |
| voided_at / void_reason | timestamptz / text | |
| created_by | uuid FK | |

#### `invoice_lines`
*Line items.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| invoice_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| student_id | uuid FK NULL | Which sibling the line is for |
| description | text | |
| quantity / unit_amount / line_total | numeric | |
| vat_rate / vat_amount | numeric | From `centres.default_vat_rate` unless overridden; zero when not VAT-registered |
| fee_plan_id | uuid FK | |

#### `payment_schedules`
*Planned instalments — the basis for derived status and reminders.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| invoice_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| due_date | date | |
| amount | numeric | |
| sort_order | int | |

#### `payments`
*Manually recorded receipts. No money moves through the portal.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| invoice_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| amount | numeric | |
| method | text | `cash` \| `bank` \| `card_external` |
| paid_on | date | |
| reference | text | |
| recorded_by | uuid FK | |

---

### 9. Communications

#### `comms_settings`
*Per-centre messaging policy.*

| Column | Type | Notes |
|---|---|---|
| centre_id | uuid PK | |
| account_id | uuid FK | |
| quiet_hours_start / quiet_hours_end | time | |
| student_messaging_enabled | boolean | |
| default_preset | text | `locked` \| `standard` \| `open` |

#### `announcements`
*One-to-many broadcast, resolved into receipts on publish. Multi-target audiences live in `announcement_targets`; `centre_id NULL` + platform scope = a superadmin platform-wide announcement.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| centre_id / account_id | uuid FK NULL | Null for platform-scope (superadmin) announcements |
| author_id | uuid FK | |
| title / body | text | |
| priority | text | `normal` \| `high` |
| pinned | boolean | default false |
| expires_at | timestamptz NULL | Drops out of feeds after this |
| ack_required | boolean | |
| publish_at | timestamptz | |
| status | text | `draft` \| `published` |

#### `announcement_targets`
*Multi-target audience — an announcement may target several centres, roles, classes and groups at once.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| announcement_id | uuid FK | |
| account_id / centre_id | uuid FK NULL | |
| target_type | text | `platform` \| `centre` \| `role` \| `group` \| `year` \| `class` \| `subject` |
| target_ref | uuid / text NULL | Points at the matching entity; null for platform/centre-wide |

#### `announcement_receipts`
*Per-recipient read/ack row.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| announcement_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| recipient_id | uuid FK | |
| read_at / acknowledged_at | timestamptz | |

#### `conversations`
*A message thread. Staff↔student threads are DSL-observed.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| centre_id / account_id | uuid FK | |
| kind | text | `direct` \| `group` |
| preset | text | `locked` \| `standard` \| `open` |
| subject | text | |
| created_by | uuid FK | |
| dsl_observed | boolean | |

#### `conversation_participants`
*Membership + read state (`last_read_at` holds unread logic).*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| conversation_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| profile_id | uuid FK | |
| role_in_convo | text | `member` \| `observer` |
| last_read_at | timestamptz | |
| joined_at | timestamptz | |

#### `messages`
*A single message. Sending = INSERT; triggers flag + broadcast.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| conversation_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| sender_id | uuid FK | |
| body | text | |
| file_id | uuid FK | |
| edited_at | timestamptz | |

#### `message_flags`
*Safeguarding flag raised by a trigger against `flag_rules`.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| message_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| rule_id | uuid FK | |
| severity | text | `low` \| `medium` \| `high` |
| status | text | `open` \| `resolved` \| `dismissed` |
| resolved_by | uuid FK | |
| resolved_at | timestamptz | |

#### `flag_rules`
*Configurable detection rules.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| centre_id / account_id | uuid FK | |
| name | text | |
| pattern_type | text | `keyword` \| `contact` \| `out_of_hours` |
| pattern | text | |
| severity | text | |
| active | boolean | |

#### `safeguarding_incidents` ⚠ special category
*SPECIAL CATEGORY. DSL concern log, independent of any message.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| centre_id / account_id | uuid FK | |
| student_id | uuid FK | |
| raised_by | uuid FK | |
| category | text | |
| severity | text | |
| summary | text | |
| status | text | `open` \| `monitoring` \| `closed` |
| opened_at / closed_at | timestamptz | |

#### `safeguarding_incident_notes` ⚠ special category
*APPEND-ONLY chronology. Never editable or deletable.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| incident_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| author_id | uuid FK | |
| note | text | |
| created_at | timestamptz | |

---

### 10. Files & storage

#### `files`
*Metadata for an R2 object. Credentials never reach the client.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id / centre_id | uuid FK | |
| bucket_key | text | R2 object key |
| filename / content_type | text | |
| size_bytes | bigint | |
| uploaded_by | uuid FK | |
| status | text | `pending` \| `confirmed` \| `deleted` |
| confirmed_at | timestamptz | |

#### `file_links`
*Polymorphic attachment of a file to any entity.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| file_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| entity_type | text | `message` \| `homework` \| `student` \| … |
| entity_id | uuid | |

#### `storage_rollups`
*Per-centre usage against the pooled account quota.*

| Column | Type | Notes |
|---|---|---|
| centre_id | uuid PK | |
| account_id | uuid FK | |
| total_bytes | bigint | |
| file_count | int | |
| updated_at | timestamptz | |

#### `storage_addons`
*Purchased add-on storage blocks on top of the plan quota. Effective quota = plan limit + active add-on blocks, pooled or split per `accounts.storage_policy`.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id | uuid FK | |
| blocks | int | Number of add-on blocks |
| purchased_at | timestamptz | |
| stripe_ref | text | |
| status | text | `active` \| `cancelled` |

> **Retention lock:** delete flows respect statutory retention — files linked to safeguarding records are tombstoned, never hard-deleted, regardless of quota pressure. **R2 connection config** (bucket, region, jurisdiction, key id) is platform infrastructure configuration (environment/secrets), not a tenant table.

---

### 11. Platform & operations

#### `centre_settings`
*Per-centre config blob (branding, grading defaults, feature toggles).*

| Column | Type | Notes |
|---|---|---|
| centre_id | uuid PK | |
| account_id | uuid FK | |
| branding | jsonb | |
| grading_defaults | jsonb | |
| features | jsonb | |
| updated_at | timestamptz | |

#### `audit_log`
*APPEND-ONLY. Payments, flags, role changes, welfare edits all land here.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id / centre_id | uuid FK | |
| actor_id | uuid FK | |
| action | text | |
| entity_type / entity_id | text / uuid | |
| meta | jsonb | |
| created_at | timestamptz | |

#### `notifications`
*In-app notification feed (the bell).*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id / centre_id | uuid FK | |
| recipient_id | uuid FK | |
| kind | text | |
| title / body | text | |
| entity_type / entity_id | text / uuid | |
| read_at | timestamptz | |

#### `notification_prefs`
*Per-user, per-kind channel opt-in. AADC-safe defaults for under-13s.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| profile_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| channel | text | `in_app` \| `email` |
| kind | text | |
| enabled | boolean | |

#### `plans`
*GLOBAL catalogue — no tenant columns. Superadmin-managed.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| code | text | |
| name | text | |
| price_monthly | numeric | |
| limits | jsonb | Seats, storage, centres |
| active | boolean | |

#### `subscriptions`
*Account ↔ plan, mirrored from Stripe via webhook.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id | uuid FK | |
| plan_id | uuid FK | |
| stripe_customer_id / stripe_subscription_id | text | |
| status | text | |
| redeemed_code_id | uuid FK NULL | → plan_codes.id — the override code applied to this subscription, if any |
| current_period_end | timestamptz | |

#### `plan_codes`
*Superadmin-managed price-override codes (free trial / percent off / fixed price).*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| code | text UNIQUE | |
| kind | text | `free_trial` \| `percent_off` \| `fixed_price` |
| value | numeric | Percent or fixed amount; null for free_trial |
| duration_months | int | How long the override applies |
| max_redemptions | int NULL | |
| active | boolean | |
| created_by | uuid FK | |

#### `plan_code_redemptions`
*Redemption log.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| plan_code_id | uuid FK | |
| subscription_id | uuid FK | |
| account_id | uuid FK | |
| redeemed_at | timestamptz | |

#### `feature_flags`
*Per-account (or global when account_id null) toggles. **Maintenance mode is a global row here** (`key = 'maintenance_mode'`, `account_id NULL`) — not a separate mechanism.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id | uuid FK NULL | Null = global |
| key | text | |
| enabled | boolean | |

#### `data_requests`
*Tracks SAR / erasure lifecycle for GDPR compliance.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id / centre_id | uuid FK | |
| subject_profile_id | uuid FK | |
| kind | text | `sar` \| `erasure` |
| status | text | `open` \| `in_progress` \| `completed` |
| requested_by | uuid FK | |
| completed_at | timestamptz | |

#### `processed_events`
*Idempotency store — what makes Stripe/webhook handling exactly-once.*

| Column | Type | Notes |
|---|---|---|
| id | text PK | Provider event id |
| provider | text | `stripe` \| `resend` |
| kind | text | |
| processed_at | timestamptz | |

#### `email_outbox`
*The only thing the mail worker reads. Nothing else calls Resend.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id / centre_id | uuid FK | |
| template_key | text | |
| to_email | text | |
| payload | jsonb | |
| status | text | `queued` \| `sent` \| `failed` \| `suppressed` |
| attempts | int | |
| last_error | text | |
| scheduled_for / sent_at | timestamptz | |

#### `email_suppressions`
*Hard-bounce / complaint blocklist checked at enqueue time.*

| Column | Type | Notes |
|---|---|---|
| email | text PK | |
| reason | text | `hard_bounce` \| `complaint` \| `unsubscribe` |
| created_at | timestamptz | |

---

## Part II — Row-Level Security

### Helper functions

Policies are expressed through a small set of `SECURITY DEFINER` helpers so predicates stay short and auditable.

| Function | Returns | Purpose |
|---|---|---|
| `auth_uid()` | uuid | Wraps `auth.uid()`; the calling user's profile id |
| `is_superadmin()` | boolean | True if the JWT carries the platform-admin claim (allowlist) |
| `auth_centre_ids()` | uuid[] | Centres where the caller has an active membership — the core scoping set |
| `auth_account_id()` | uuid | The caller's account (from membership); null for superadmin |
| `has_role(centre uuid, roles text[])` | boolean | Caller holds one of the given roles in that centre — `EXISTS` over membership rows (multi-role safe) |
| `is_account_owner(account uuid)` | boolean | `accounts.owner_profile_id = auth_uid()` — ownership check; **"account_owner" in the matrix below means this helper**, not a membership role |
| `is_dsl(centre uuid)` | boolean | Caller's membership in that centre has `dsl_role IS NOT NULL` (lead or deputy) |
| `is_my_student(student uuid)` | boolean | Caller teaches a class the student is enrolled in (teacher scope) |
| `owns_profile(p uuid)` | boolean | `p = auth_uid()`; own-record access for students/staff |

**Canonical scoped-read pattern** (applied to every centre-scoped table):

```sql
create policy sel on <table> for select using (
  is_superadmin() or centre_id = any(auth_centre_ids())
);
```

### Derived views

Metrics and lifecycle states are computed at read time through `v_*` views, never stored. Views are `security_invoker = true` so they run under the caller's RLS. The most important state machine in the register slice:

#### `v_session_state`

Resolves each session to one of **six operational states** from source-of-truth columns, the centre's `register_backfill_hours` window, any active unlock grant, and the current time. `sessions.status` stays the three-value persisted enum (`scheduled` / `delivered` / `cancelled`); these six are derived and transient.

| Derived state | Meaning | Actionable? |
|---|---|---|
| `cancelled` | `sessions.status = 'cancelled'` | No — excluded from attendance rate denominator |
| `recorded` | Register submitted; within amendment window or locked | Amendable (see rules) |
| `upcoming` | Now is before the register open window | No |
| `open_live` | Now is inside the live window (during/just after the session, incl. grace) | Yes — take register |
| `awaiting` | Live window passed, not submitted, and **either** now is inside the natural backfill window (`ends_at + register_backfill_hours`, default 72h) **or** an active unlock grant exists | Yes — take/re-take register; natural-backfill submissions are flagged late |
| `lapsed` | Backfill window passed, not submitted, no active grant | No — locked; requires admin unlock |

**Transition rules the view (and its callers) must implement:**

- The **natural backfill window** is the first path back in: after the live window closes, the register stays takeable (flagged late) until `ends_at + register_backfill_hours`. No unlock is needed during this window — the teacher is never locked out the moment a session ends.
- A **`lapsed`** session with an `active` `register_unlocks` row where `now < expires_at` derives as **`awaiting`** (actionable) until the grant is consumed or expires — the unlock grant is the second path back in, after natural backfill has passed.
- A **`recorded`** session that is **locked** but has an active unlock grant derives as amendable/reopened — a full re-take, not per-mark amend.
- `submit_register` on an `awaiting` session writes marks, sets `sessions.status = 'delivered'`, derives timesheet entries, and **consumes** the unlock (`status = 'consumed'`) — the register re-locks immediately.
- If a grant is never used, at `expires_at` it lapses (`status = 'expired'`) and the session derives back to **`lapsed`** (auto re-lock).
- **Amendment window:** within 24h of `register_submitted_at`, a teacher self-serves per-mark `amend_attendance` (audited to `attendance_amendments`). After 24h the register is locked and only an admin `grant_unlock` reopens it for a full re-take.

Related views in this slice: `v_attendance_summary` (rate folds over `recorded` sessions; `cancelled` excluded from the denominator), `v_timesheet_summary`, `v_effective_teacher` (permanent teacher overridden by any `class_cover` row covering the session date — schedule and register views render the cover teacher).

Elsewhere: `v_reports_due` derives the due/upcoming report queue from `report_rules` × frequency × existing `reports` rows — due-ness is never stored.

### Per-table policy matrix

Each non-empty cell represents one or more policies to write and cover in the RLS isolation suite.

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| accounts | superadmin; own account (auth_account_id) | superadmin | superadmin; account_owner (own) | superadmin |
| centres | superadmin; members of the account | superadmin; account_owner | superadmin; account_owner; centre_admin (own centre) | superadmin; account_owner |
| profiles | self; staff in a shared centre; superadmin | self (on signup); admin (invite flow) | self; centre_admin for managed users | superadmin |
| memberships | self; centre_admin/owner in that centre | account_owner; centre_admin | account_owner; centre_admin (role + dsl_role changes audited) | account_owner; centre_admin |
| students | centre staff; the student (self); superadmin | centre_admin | centre_admin; teacher (limited fields) | centre_admin |
| student_guardians | centre staff; superadmin | centre_admin | centre_admin | centre_admin |
| families | centre staff; student (own family) | centre_admin | centre_admin | centre_admin |
| emergency_contacts | centre_admin; is_dsl; teacher (view own students only) | centre_admin | centre_admin | centre_admin |
| student_health | centre_admin; is_dsl only (teacher only if centre setting allows) | centre_admin | centre_admin (audited) | centre_admin |
| consents | centre staff; superadmin | centre_admin; system (magic-link) | centre_admin | centre_admin |
| invitations | centre_admin; account_owner | centre_admin; account_owner | centre_admin (revoke) | centre_admin |
| student_claims | centre_admin | centre_admin | system (claim); centre_admin (revoke) | centre_admin |
| guardian_approvals | centre_admin; system | centre_admin; system | system (confirm) | — |
| subjects / terms / term_breaks / rooms / class_dimensions | centre members | centre_admin | centre_admin | centre_admin |
| classes | centre members (students: enrolled only) | centre_admin | centre_admin; teacher (own classes) | centre_admin |
| class_schedules | centre members | centre_admin | centre_admin | centre_admin |
| class_cover | centre staff | centre_admin | centre_admin | centre_admin |
| sessions | centre staff; enrolled students | centre_admin; system (cron) | teacher (own, via register); centre_admin | centre_admin |
| enrolments | centre staff; the student (self) | centre_admin (RPC) | centre_admin (RPC) | centre_admin |
| attendance_records | centre staff; the student (self) | teacher via submit_register | teacher/centre_admin (amend, audited) | centre_admin |
| register_unlocks | centre staff; the affected teacher | centre_admin via grant_unlock (audited) | system (consume); centre_admin via revoke_unlock (audited) | — |
| attendance_amendments | centre staff | system (via amend_attendance) | — (append-only) | — |
| grade_scales / grade_bands | centre members | centre_admin | centre_admin | centre_admin |
| assessments | centre staff; enrolled students (if published) | teacher; centre_admin | teacher (own); centre_admin | centre_admin |
| results | centre staff; student (self, if published) | teacher; centre_admin | teacher (own); centre_admin | centre_admin |
| staff_details | self; centre_admin; account_owner | centre_admin | centre_admin; self (limited) | centre_admin |
| staff_rates | self; centre_admin | centre_admin (audited) | centre_admin (audited) | centre_admin |
| timesheet_entries | self (teacher); centre_admin | system (trigger) | centre_admin (approve/adjust, audited) | — |
| timesheet_adjustments | self; centre_admin | centre_admin (audited) | — | — |
| assignments | centre staff; targeted students | teacher; centre_admin | teacher (own); centre_admin | teacher (own) |
| assignment_targets | centre staff; targeted students | teacher; centre_admin | teacher; centre_admin | teacher; centre_admin |
| questions | centre staff; students (on open assignment) | teacher; centre_admin | teacher (own) | teacher (own) |
| submissions | centre staff; the student (self) | student (self, RPC) | student (self, until submitted); teacher (marking) | — |
| answers | centre staff; the student (self) | student (self) | student (self, until submit); teacher (mark) | — |
| report_rules / report_templates / rating_scales / rating_levels | centre staff | centre_admin | centre_admin | centre_admin |
| reports | author; centre_admin; student (self, `published` only) | teacher; centre_admin | author (draft); centre_admin; publish via RPC (audited) | centre_admin (draft only) |
| trackers / tracker_columns / tracker_entries | teacher (own classes); centre_admin | teacher (own classes) | teacher (own classes) | teacher (own); centre_admin |
| lesson_plans | author; teachers of the class; centre_admin | teacher | author | author; centre_admin |
| fee_plans | centre staff | centre_admin | centre_admin | centre_admin |
| invoice_sequences | centre_admin (via RPC only) | system | system (via RPC) | — |
| invoices | centre staff; the student (self, own invoices) | centre_admin (RPC) | centre_admin (void, audited) | — |
| invoice_lines | centre staff; student (self) | centre_admin | centre_admin | centre_admin |
| payment_schedules | centre staff; student (self) | centre_admin | centre_admin | centre_admin |
| payments | centre staff; student (self) | centre_admin via record_payment (audited) | — | — |
| comms_settings | centre staff | centre_admin | centre_admin | — |
| announcements | centre staff; recipients (via receipts) | teacher; centre_admin; superadmin (platform scope) | author; centre_admin | author; centre_admin |
| announcement_targets | as announcements | author; centre_admin | author; centre_admin | author; centre_admin |
| groups | centre staff | centre_admin | centre_admin | centre_admin |
| group_members | centre staff | centre_admin | centre_admin | centre_admin |
| announcement_receipts | recipient (self); author; centre_admin | system (publish) | recipient (read/ack) | — |
| conversations | participants; is_dsl (observed threads) | staff (RPC, preset-checked) | participants (limited) | centre_admin |
| conversation_participants | participants; is_dsl | system (RPC) | self (last_read_at) | centre_admin |
| messages | participants; is_dsl | participant (INSERT — RLS checks membership) | sender (edit window) | — |
| message_flags | is_dsl; centre_admin | system (trigger) | is_dsl (resolve, audited) | — |
| flag_rules | centre_admin; is_dsl | centre_admin | centre_admin | centre_admin |
| safeguarding_incidents | is_dsl; centre_admin only | is_dsl; teacher (raise_concern) | is_dsl (audited) | — |
| safeguarding_incident_notes | is_dsl; centre_admin only | is_dsl (append-only) | — (immutable) | — |
| files | linked-entity viewers; uploader; centre_admin | authenticated (via sign-upload) | system (confirm) | uploader; centre_admin |
| file_links | entity viewers | uploader; system | — | uploader; centre_admin |
| storage_rollups | centre staff | system | system (cron) | — |
| storage_addons | account_owner; superadmin | system (webhook) | system | — |
| centre_settings | centre staff | centre_admin | centre_admin | — |
| audit_log | centre_admin; account_owner; is_dsl (own scope) | system only | — (append-only) | — |
| notifications | recipient (self) | system | recipient (mark read) | recipient |
| notification_prefs | self | self | self | self |
| plans | all authenticated (read); superadmin | superadmin | superadmin | superadmin |
| subscriptions | account_owner; superadmin | system (webhook) | system (webhook) | — |
| plan_codes | superadmin | superadmin | superadmin | superadmin |
| plan_code_redemptions | superadmin; account_owner (own) | system (redeem RPC) | — | — |
| feature_flags | account members (read); superadmin | superadmin | superadmin | superadmin |
| data_requests | centre_admin; account_owner; superadmin | centre_admin; superadmin | system; superadmin | — |
| processed_events | — (service-role only) | service-role | — | — |
| email_outbox | — (service-role only) | system (triggers/cron) | worker (service-role) | — |
| email_suppressions | — (service-role only) | system (webhook) | — | service-role |

---

## Part III — API endpoints

Three surfaces. Plain CRUD goes through the Supabase client (PostgREST), authorised entirely by RLS. Multi-table transactions are Postgres RPCs. Anything touching a secret or bypassing RLS is a Railway HTTP endpoint.

### Railway REST endpoints

#### Auth & onboarding

| Method | Endpoint | Description |
|---|---|---|
| POST | `/v1/invites` | Create a staff invitation; sends the email via the outbox |
| POST | `/v1/invites/:id/resend` | Re-send an unexpired invitation |
| POST | `/v1/auth/student/login` | Username + PIN exchange; mints a Supabase session via the admin API |
| POST | `/v1/auth/guardian-approvals` | Issue a guardian magic link for an under-13 action (mechanism, not a role) |
| POST | `/v1/auth/guardian-approvals/:token/confirm` | Guardian confirms; unlocks the pending action, records consent |
| POST | `/v1/admin/accounts` | Superadmin: provision account + owner + first centre in one transaction |
| POST | `/v1/admin/accounts/:id/suspend` | Superadmin lifecycle (paired with /restore); audited |

#### Files (R2)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/v1/files/sign-upload` | Permission + pooled-quota check → presigned PUT URL + pending files row |
| POST | `/v1/files/:id/confirm` | Verify the object, record true size, update the storage rollup |
| POST | `/v1/files/:id/sign-download` | Permission check → short-lived presigned GET URL |
| DELETE | `/v1/files/:id` | Delete the R2 object, tombstone the row, adjust the rollup |

#### Invoicing

| Method | Endpoint | Description |
|---|---|---|
| POST | `/v1/invoices/:id/pdf` | Render the invoice PDF, store to R2, return a file reference |
| POST | `/v1/invoices/:id/send` | Email the invoice to the billing guardian with the PDF attached |
| GET | `/v1/invoices/export` | CSV export — first leg of the export–fill–import reconciliation |
| POST | `/v1/invoices/import` | Reconciliation import — references existing numbers only, never generates them |

#### Homework

| Method | Endpoint | Description |
|---|---|---|
| POST | `/v1/homework/import-pdf` | Deterministic parse of an uploaded PDF into draft questions for the builder — rule-based extraction, **no AI** (decision #12) |

#### Student reports

| Method | Endpoint | Description |
|---|---|---|
| POST | `/v1/student-reports/:id/pdf` | Render the published report PDF, store to R2, return a file reference |
| POST | `/v1/student-reports/:id/send` | Email the published report (PDF attached) to the student's guardians via the outbox |

#### Bulk data & exports

| Method | Endpoint | Description |
|---|---|---|
| POST | `/v1/students/import` | Validated async CSV import; returns a job id |
| GET | `/v1/jobs/:id` | Poll any async import/export job for status and error rows |
| GET | `/v1/exports/:key` | Analytics exports as CSV or PDF (attendance, results, timesheets) — renamed from `/v1/reports/*` to avoid colliding with the student-reports product domain |

#### Billing (Klasio's own)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/v1/billing/checkout` | Stripe Checkout session for a plan, at account level |
| POST | `/v1/billing/portal` | Stripe customer portal link for the account owner |
| POST | `/v1/webhooks/stripe` | Idempotent webhook receiver → syncs the subscriptions mirror |

#### Privacy

| Method | Endpoint | Description |
|---|---|---|
| POST | `/v1/privacy/erasure` | Anonymise-not-delete; tombstones the profile, preserves safeguarding records |
| POST | `/v1/privacy/sar-export` | Subject access request — bundle everything held on one person |

#### Ops

| Method | Endpoint | Description |
|---|---|---|
| GET | `/v1/health` | Liveness probe for Railway |
| GET | `/v1/version` | Build SHA and deploy time |

#### Email worker

| Method | Endpoint | Description |
|---|---|---|
| POST | `/v1/webhooks/resend` | Delivery/bounce/complaint events → update outbox + suppressions |

---

### Postgres RPC functions

Invoked with the caller's own JWT, so RLS still applies. **Audited** calls write an `audit_log` row in the same transaction.

#### Superadmin

| Function | Description | Audited |
|---|---|---|
| `provision_account(payload)` | Account + owner + first centre in one transaction | yes |
| `set_account_plan(account, plan)` | Change plan; reconciles with Stripe | yes |
| `toggle_feature_flag(account, key, on)` | Per-account flag; global maintenance mode is `account = null, key = 'maintenance_mode'` | — |
| `manage_plan_code(payload)` / `redeem_plan_code(subscription, code)` | Create/deactivate override codes; redeem against a subscription (validates max_redemptions, logs redemption) | yes |
| `start_support_session(account, ttl)` | Scoped, time-boxed impersonation. Safeguarding-sensitive | yes |

#### Account owner

| Function | Description | Audited |
|---|---|---|
| `create_centre(payload)` | New centre under the account | yes |
| `invite_member(centre, email, role)` | Staff invitation | yes |
| `set_member_role(membership, role)` | Role change (add/remove membership rows — multi-role) | yes |
| `set_dsl_role(membership, lead\|deputy\|null)` | Assign/clear DSL lead or deputy; one lead per centre enforced | yes |
| `transfer_ownership(account, profile)` | Repoint `accounts.owner_profile_id` — a single-field mutation. New owner must exist with their own identity + MFA first; never swap credentials | yes |

#### Centre admin

| Function | Description | Audited |
|---|---|---|
| `enrol_student(class, student, starts_on)` | Capacity + duplicate checks, then enrol | — |
| `withdraw_enrolment(enrolment, ends_on)` | End-date; history preserved | — |
| `set_active_term(centre, term)` | Single write for term context | — |
| `regenerate_sessions(class)` | Rebuild future sessions, skipping term breaks | — |
| `create_group(centre, name)` / `manage_group_members(...)` | Groups for targeting + monitored convos | — |
| `set_class_cover(class, teacher, starts_on, ends_on, reason)` | Assign temporary cover; effective teacher derives per session date | yes |
| `publish_announcement(announcement)` | Resolve scope into receipts | — |
| `record_payment(invoice, amount, method, paid_on)` | The manual payment toggle | yes |
| `void_invoice(invoice, reason)` | Void; number never reused | yes |
| `set_staff_rate(profile, rate)` | New pay rate | yes |
| `approve_timesheet(entry)` / `adjust_timesheet(entry, delta)` | Pay approval + adjustment | yes |
| `amend_attendance(record, status, reason)` | Correct a register mark within the 24h window; writes `attendance_amendments` | yes |
| `grant_unlock(session, {hours\|until_eod\|expires_at}, note?)` | Time-boxed reopen of a locked/lapsed register; writes `register_unlocks` | yes |
| `revoke_unlock(unlock_id)` | Cancel an active unlock grant before it's used | yes |

#### Teacher

| Function | Description | Audited |
|---|---|---|
| `submit_register(session, entries)` | Keystone: attendance + session confirmation + timesheet derivation; consumes any active unlock grant; natural-backfill submissions flagged late | yes |
| `log_timesheet_entry(type, minutes, date, note)` | Manual non-teaching work (prep/marking/meeting/training/cover); `teaching` type rejected | — |
| `create_assignment(payload)` / `assign_homework(...)` | Assignment + questions + targets | — |
| `record_result(assessment, student, marks)` / `publish_results(assessment)` | Enter and publish grades | — |
| `publish_report(report)` | Publish a student report: locks content, renders PDF, queues guardian email | yes |
| `start_conversation(kind, participants)` | Preset-checked; attaches DSL observer to staff↔student threads | — |
| `raise_concern(student, summary)` | Open a safeguarding_incident from any context | yes |

#### DSL (capability flag)

| Function | Description | Audited |
|---|---|---|
| `resolve_flag(flag, outcome, notes)` | Action the flag queue | yes |
| `log_safeguarding_incident(student, payload)` | Open an incident directly | yes |
| `add_incident_note(incident, note)` | Append to the chronology | yes |
| `resolve_incident(incident, outcome)` | Close/monitor an incident | yes |

#### Student

| Function | Description | Audited |
|---|---|---|
| `submit_homework(submission)` | Lock answers, auto-mark objective types, queue the rest | — |
| `acknowledge_announcement(announcement)` | Idempotent ack | — |

---

### Supabase client (PostgREST) — generated, not listed

Everything not above is direct table access through the Supabase client, authorised by RLS: reading classes, students, invoices, dashboard metric views; updating profiles; marking notifications read.

The key case worth noting: **sending a message is a plain `INSERT` into `messages`**. RLS verifies the sender is a participant, one trigger runs the flag scan, another broadcasts over Realtime — no endpoint, no RPC, and the safeguarding pipeline cannot be bypassed because it lives below the API entirely.
