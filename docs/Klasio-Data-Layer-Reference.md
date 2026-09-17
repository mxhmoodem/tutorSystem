# Klasio — Data-Layer Reference (v5)

> **Postgres tables · RLS policies · API endpoints**
>
> Multi-tenant SaaS for UK tuition centres and private tutors. Supabase (Postgres + RLS) · Railway API · Cloudflare R2 · Stripe · Resend.
>
> Membership roles: Centre Admin · Teacher · Student (a person may hold **multiple roles** in a centre via multiple membership rows). Superadmin is a platform claim, not a membership. **Account ownership is a field** — `accounts.owner_profile_id` — not a membership role. DSL is a capability (`dsl_role` = lead/deputy) on a membership, not a role. There is no Parent role — guardians are data entities and email recipients only. **There are no AI features anywhere in the platform** (locked decision #12).
>
> This reference and `docs/klasio-development-plan.md` are the authority. The prototype is the behavioural spec for UI; where it disagrees with these two documents, the documents win and the gap is listed under *Known prototype divergences* in the plan.

---

> **v5 (September 2026) — access-model fixes.** Closes the findings of the September documentation audit. A superadmin now reads **no** tenant data outside a support session, and the never-admit list covers messages, conversations, flags, consents and safeguarding files. Teacher reads are scoped to their own students through `is_my_student()` (which now includes cover) instead of "centre staff"; invoices are admin-only. The two safeguarding-sensitive toggles moved out of `centre_settings.features` into the typed, audited `centre_privacy_settings` (new), read through `privacy_flag()`. `files` INSERT is service-role only. Column-level rules are named views (`v_my_submissions`, `v_my_answers`, `v_platform_status`). Adds a constraints-and-indexes convention, definitions for every view the plan builds, staff sign-in endpoints that own lockouts (Supabase's verification hooks need the Team plan), `staff_leave` (new), student address columns, `/v1/admin/accounts/:id/restore`, and a shared flag queue for class posts. Drops the ungated `resources` capability.
>
> **v4 (September 2026) — prototype gap closure.** Folds in everything the prototype shipped that v3 did not describe, and records the owner rulings on the open questions (plan decisions #20–#33). New domain §12 **Resources (Materials library)**. **Solo tutor accounts** (`accounts.kind = 'solo'`, implicit centre, capability-gated plans). Auth lockouts and attempts (decision #14 now has a schema). Class stream, class settings and class change requests. Tags. Predicted/target grades. Typed per-domain centre settings rows (register, timesheet, reports, invoicing). Ten homework question types and the per-assignment settings model. Report lifecycle `draft → published → archived`, centre standards, configurable report permissions. Tax modes and reminder cooldown. Comms approval workflow, retention, image flags, class channels. File categories and retention matrix. `platform_settings`, trial offer, billing events, support sessions. **Removed:** `groups` / `group_members` (deferred), class join codes, the `submitted` report status.
>
> **v3 (July 2026) — reconciliation revision.** Product renamed **Klasio**. All AI artefacts removed (locked decision #12). New domains: Student Reports & Teacher Feedback (successor to AI feedback), Tracking & Lesson Planning. Multi-role memberships; ownership moved to `accounts.owner_profile_id`; DSL lead/deputy; family billing + VAT; natural register backfill window; plan override codes; student claim slips; cover teacher; configurable class dimensions; announcement multi-targeting; storage add-ons.

---

## Conventions

All tenant tables carry `account_id uuid` and (where centre-scoped) `centre_id uuid` for RLS, plus `created_at timestamptz default now()`. Audited/mutable tables add `updated_at`.

**Settings that an invariant, RLS policy or derived view reads are typed columns on a per-domain settings row** — `centre_register_settings`, `centre_timesheet_policy`, `centre_report_settings`, `centre_invoice_settings`, `centre_privacy_settings`, `comms_settings` — one row per centre, created with the centre. `centre_settings` keeps only presentation-level blobs (branding, setup checklist, user-facing defaults) that nothing in the database reads. A setting that gates a write (e.g. a publish standard) is enforced inside the RPC, never only in the UI.

**Derive, don't store.** Metrics, statuses and lifecycle states are computed at read time in `v_*` views. The documented exceptions are business designations (`terms.is_active`) and **snapshots** — values copied at a moment so a finished document never changes later (issued invoice totals, a published report's predicted grade, a submission's `is_late`, an exported timesheet amount).

**Solo tutor accounts reuse the centre model.** A solo account (`accounts.kind = 'solo'`) owns exactly one implicit centre (`centres.is_implicit = true`, never shown in the UI). The tutor is the account owner and holds `centre_admin` + `teacher` memberships on it, so every table and RLS policy below applies unchanged; plan capabilities decide which surfaces exist.

Every table has Row-Level Security enabled. The primary tenant boundary is **`centre_id`**, with **`account_id`** as the parent scope. Predicates in the RLS section are shorthand over the helper functions listed there. "system" and "service-role" mean the Railway service acting with the Supabase **secret key** (`sb_secret_…`) after an explicit tenant check — it bypasses RLS, so every such path re-checks the tenant itself. "—" means the operation is not permitted for any interactive role.

**Column-level rules need a column-level mechanism.** RLS decides rows, not columns. Where a cell in the matrix says a role sees only *some* fields of a row — a student's released marks, a teacher's editable student fields, the two public `platform_settings` columns — it is implemented as a named `v_*` view (or an RPC), never as a SELECT policy that pretends to filter columns.

**Constraints and indexes.** The column tables below give types and meaning, not the full DDL. Every migration follows these rules unless the table says otherwise:
- **NOT NULL** on every id, foreign key, status, enum-like `text` column and `created_at`. Nullable columns are marked NULL in the tables.
- **Enums are `text` + a CHECK constraint**, never Postgres `enum` types — adding a value must not need a type migration.
- **ON DELETE:** `cascade` from a parent that owns its children (`assignments` → `questions`, `invoices` → `invoice_lines`, `conversations` → `messages`); `restrict` where the child is a record of something that happened (`classes` → `sessions`, `families` → `invoices`); `set null` for optional pointers (`assignments.folder_id`, `reports.rule_id`). Audit, safeguarding and ledger tables are never cascade targets.
- **Indexes:** every foreign key, every `(centre_id, …)` filter a screen sorts on, plus the partial unique indexes named in the tables (`centres.is_primary`, `memberships.dsl_role = 'lead'`, `terms.is_active`, `report_rules.target_type = 'centre_default'`, `resource_access_requests` pending).
- **FK cycles** (`students` → `families` → `student_guardians` → `students`; `accounts` → `profiles` → `files` → `accounts`) are created as nullable columns first and closed with a follow-up `ALTER TABLE … ADD CONSTRAINT` at the end of the slice.

"Guardian" refers to a `student_guardians` row — contact and billing detail with no login. Guardian magic-links are an authentication *mechanism* for specific under-13 actions, not a role with a dashboard.

---

## Part I — Database tables

~117 tables across twelve domains. Columns marked **⚠ special category** hold UK GDPR Article 9 data and carry the strictest policies and full audit.

---

### 1. Tenancy & identity

#### `accounts`
*The billing tenant — one paying organisation, may hold many centres.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| name | text | Organisation name |
| slug | text UNIQUE | URL-safe identifier |
| kind | text | `centre` \| `solo` — a solo private-tutor account owns exactly one implicit centre and is sold `plans.audience = 'solo'` plans. Immutable after creation |
| owner_profile_id | uuid FK NOT NULL | → profiles.id — **the single source of ownership.** Not a membership role; `transfer_ownership` repoints this one field |
| storage_policy | text | `pooled` \| `split` — how the account quota is shared across centres (always `pooled` for solo) |
| status | text | `active` \| `suspended` \| `cancelled` — the **platform** lifecycle only. Plan, trial and dunning state live on `subscriptions` (`trialing` / `past_due` / `paused`) and are never mirrored here, so there is exactly one answer to "what is this account paying for" |
| billing_email | text | Where Klasio billing goes |
| legal_name | text NULL | Registered company or trading name printed on the Klasio invoice — differs from `name` for a limited company |
| billing_address | jsonb NULL | Address block for the Klasio invoice (`line1`, `line2`, `city`, `postcode`) |
| vat_number | text NULL | The account's **own** VAT registration, for reverse charge and the Klasio invoice. Distinct from `centre_invoice_settings.vat_number`, which is what the centre charges its families |
| country | text | ISO 3166-1 alpha-2, default `GB`. Drives Stripe tax behaviour and the data-residency claim |
| created_at | timestamptz | default now() |

#### `centres`
*A physical tuition centre under an account. The primary RLS boundary.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id | uuid FK | → accounts.id |
| name | text | |
| slug | text | Unique within account |
| code | text UNIQUE | Centre login code — students log in with centre-code + username + PIN/password |
| is_primary | boolean | The account's primary centre (partial unique index: one per account) — default selection in the centre switcher |
| is_implicit | boolean | default false — true only for a solo account's single centre; never rendered as a "centre" in the UI |
| region | text NULL | Grouping label for multi-centre accounts |
| accent | text NULL | Per-centre brand accent (token reference); falls back to `centre_settings.branding` |
| address_line1 / line2 / city / postcode | text | Postal address |
| phone | text | |
| email | text | Public contact address for the centre — what appears on invoices, reports and claim slips. Distinct from `accounts.billing_email`, which is where Klasio bills *the account* |
| timezone | text | default `'Europe/London'` — drives session local-time logic |
| country | text | ISO 3166-1 alpha-2, default `GB`. The tax jurisdiction its invoices are raised in — a multi-centre account can straddle two, so this is not inherited from `accounts.country` |
| status | text | `active` \| `archived` |

> Register timing lives in `centre_register_settings`; VAT, tax mode and invoice defaults in `centre_invoice_settings` (§8). Both rows are created with the centre.

#### `profiles`
*One row per authenticated user (staff and students). PK equals auth.users.id.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | = auth.users.id |
| full_name | text | Legal name — what appears on reports, invoices and safeguarding records |
| display_name | text NULL | What the app and other users see ("Mr Park", a preferred first name). Falls back to `full_name`. Never substituted on a legal or safeguarding document |
| email | text | Nullable for PIN-only student accounts |
| phone | text | |
| avatar_file_id | uuid FK | → files.id |
| calendar_token | uuid | Unguessable token for the person's own `.ics` timetable feed; rotating it revokes every subscription made with the old URL |
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
| dsl_role | text NULL | `lead` \| `deputy` — Designated Safeguarding Lead capability. Partial unique index: at most one `lead` per centre. **CHECK: only a `centre_admin` or `teacher` row may carry it** — never a `student` row. For someone holding several roles at one centre, it lives on their **`centre_admin` row** if they have one, otherwise their `teacher` row; `is_dsl()` is an EXISTS over all their rows, so the placement never changes what they can read |
| status | text | `active` \| `suspended` |
| UNIQUE | (profile_id, centre_id, role) | Allows multi-role; role checks are `EXISTS` over rows, never equality on a single row |

#### `students`
*Student-specific extension of a profile, including daily login credentials.*

| Column | Type | Notes |
|---|---|---|
| profile_id | uuid PK FK | → profiles.id |
| account_id / centre_id | uuid FK | |
| student_ref | text | Human-facing reference |
| dob | date | Drives under-13 AADC treatment |
| year_group | text | |
| enrolment_status | text | `prospective` \| `active` \| `left` |
| family_id | uuid FK NULL | → families.id — sibling grouping for family billing |
| username | text | Unique within centre; combined with `centres.code` at login |
| auth_method | text | `pin` \| `password` — **under-13s are always `pin`**. Enforced by a **trigger**, not a CHECK: age depends on `now()`, and Postgres requires CHECK expressions to be immutable, so a date-sensitive rule cannot live in one. The trigger runs on insert and update of `dob` or `auth_method`. **When `dob` is null the row is treated as under-13** — the safe default, and the prototype's habit of inferring age from year group is not a substitute. QR-badge login is not supported (decision #21) |
| pin_hash | text NULL | Argon2 hash — never the raw PIN. Set when `auth_method = 'pin'`. **A PIN is exactly 6 digits**; the lockout after 5 failed student attempts, not the length, is what makes it safe |
| address_line1 / address_line2 / city / postcode | text NULL | Home address. Optional — a centre that has no need for it leaves it empty; it is never shown to other students |
| notes | text NULL | Free-text staff notes on the student (staff-only read) |

> Password credentials for `auth_method = 'password'` live in Supabase Auth against the student's synthetic email — never in this table. **At-risk is derived, never stored** (`v_student_risk`); there is no stored `at-risk` status.

#### `student_guardians`
*Guardian as a DATA ENTITY and email recipient. No login, not a role.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| student_id | uuid FK | → students.profile_id |
| account_id / centre_id | uuid FK | |
| full_name | text | |
| relationship | text | `parent` \| `mother` \| `father` \| `carer` \| `other` — `parent` exists because that is what real imports and forms produce when the relationship is not broken down further; omitting it forced the prototype's CSV import to write a value outside the enum |
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
| batch_id | uuid FK NULL | → student_claim_batches.id — the print run this slip belongs to |
| claim_code | text UNIQUE | Short human-typeable code on the slip |
| synthetic_email | text | Generated placeholder for the auth record |
| setup_method | text | `claim_slip` \| `admin_set_pin` \| `self_set` (student or guardian chose PIN/password on the public claim page) |
| status | text | `pending` \| `claimed` \| `expired` \| `revoked` |
| consent_recorded | boolean | Under-13 claim: guardian consent captured on the claim page (writes a `consents` row) |
| printed_at / claimed_at / expires_at | timestamptz | Slip PDF rendered via the files pipeline |
| created_by | uuid FK | |

#### `student_claim_batches`
*One provisioning run — so a set of slips is reprintable as a set rather than reconstructed by date.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id / centre_id | uuid FK | |
| created_by | uuid FK | |
| source | text | `csv` \| `single` |
| created_at | timestamptz | |

#### `import_drafts`
*Auto-saved in-progress CSV paste for student provisioning, restored when the admin returns.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id / centre_id | uuid FK | |
| created_by | uuid FK | One live draft per (centre, creator) |
| payload | text | Raw pasted CSV |
| parsed_at | timestamptz NULL | |
| updated_at | timestamptz | |

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

#### `auth_attempts`
*Every login attempt, staff and student. The input to lockouts, rate limiting and the security console — decision #14 ("Postgres owns rate limiting and lockouts") lives here.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| identifier | text | Staff email, or `centre_code:username` for students — indexed with `at` |
| account_id / centre_id | uuid FK NULL | Resolved when the identifier is known |
| ip | inet | |
| country | text NULL | Derived from the IP at write time |
| user_agent | text | |
| outcome | text | `success` \| `bad_credentials` \| `bad_totp` \| `locked` \| `blocked` |
| at | timestamptz | |

#### `account_lockouts`
*An active lock on an identifier. Auto-created after repeated failures; auto-expires; clearable by superadmin.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| identifier | text | |
| account_id / centre_id | uuid FK NULL | |
| reason | text | `failed_attempts` \| `manual_block` |
| attempt_count | int | Failures in the window that triggered the lock |
| locked_at / expires_at | timestamptz | `expires_at NULL` = indefinite (manual block) |
| cleared_by / cleared_at | uuid FK / timestamptz | Set by `clear_lockout` |

> **Lockout policy:** 10 failed attempts for one identifier inside 15 minutes creates a 30-minute `failed_attempts` lock; student PIN logins lock after 5. Checked by the student login endpoint and by a Supabase Auth hook for staff password + TOTP. The suspicious-activity list is the derived view `v_suspicious_activity` (groups `auth_attempts` over a window) — attempt counts are never stored on the lock row beyond the trigger snapshot. Other rate limits (e.g. invoice reminders) keep their own domain log; there is no generic `rate_limits` table.

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
| kind | text | `group` \| `one_to_one` |
| description | text NULL | What the class covers, shown on the class card and the create-class form |
| room_id | uuid FK NULL | Null when the class has no room — see `location` |
| location | text NULL | Where a class without a room happens: "Online", "Student's home", "Library". A private tutor has no room list, so `room_id` is meaningless to them; CHECK that at most one of `room_id` and `location` is set |
| term_id | uuid FK | |
| capacity | int | |
| hourly_rate | numeric NULL | Per-student hourly fee. Drives `generate_invoices` for pay-as-you-go billing (the default for solo accounts); null when the class is billed from `fee_plans` |
| status | text | `active` \| `archived` |

> Classes carry **tags** through `taggables` (e.g. `GCSE`, `Exam Year`, `Intervention`) — the generic targeting mechanism for report rules. Year group and subject are just two possible tag-like facets; a centre that doesn't use them can tag classes however it likes. There is **no class join code** — enrolment is admin-managed (decision #23).

#### `class_settings`
*Per-class configuration. One row per class, created with the class.*

| Column | Type | Notes |
|---|---|---|
| class_id | uuid PK FK | |
| account_id / centre_id | uuid FK | |
| banner_theme | text | `default` (derives from the subject colour) \| `indigo` \| `teal` \| `ocean` \| `forest` \| `sunset` \| `plum` \| `slate`. **Class-wide, not personal** — the class teacher picks it and every member sees the same banner, so colour works as a wayfinding cue. It is deliberately not a `user_preferences` key |
| students_can_post | boolean | default false |
| students_can_comment | boolean | default true |
| updated_at | timestamptz | |

#### `class_posts`
*The class stream — a lightweight per-class feed authored in context. Not a broadcast: no receipts, no acknowledgement, no expiry (that is `announcements`).*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| class_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| author_id | uuid FK | Class staff, or an enrolled student when `class_settings.students_can_post` |
| body | text | |
| created_at | timestamptz | |
| deleted_at | timestamptz NULL | Soft delete — staff remove posts from the stream |

#### `class_post_comments`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| post_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| author_id | uuid FK | Students only when `class_settings.students_can_comment` |
| body | text | |
| created_at / deleted_at | timestamptz | |

> Class posts from or to students are subject to the same minor-safety rules as messages: the same flag-scan trigger runs on insert (raising a `message_flags` row against `class_post_id`), and posts are text-only. That shared pipeline is why the class stream ships with messaging in Phase 9 rather than with announcements in Phase 5.

#### `class_change_requests`
*Teacher → admin. Scheduling and enrolment are admin-managed; this is how a teacher asks for a change.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| class_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| requested_by | uuid FK | |
| kind | text | `schedule` \| `enrolment` \| `room` \| `other` |
| body | text | |
| status | text | `open` \| `actioned` \| `declined` |
| decided_by / decided_at | uuid FK / timestamptz | |
| decision_note | text NULL | Shown back to the teacher |

#### `tags`
*One tag vocabulary per centre, used on classes, students and reports.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id / centre_id | uuid FK | |
| name | text | UNIQUE within (centre_id, kind) |
| colour | text | Token reference |
| kind | text | `cohort` (classes/students — targetable by report rules) \| `report` (filing labels on reports, e.g. Parents' Evening, SEN Review) |

#### `taggables`

| Column | Type | Notes |
|---|---|---|
| tag_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| entity_type | text | `class` \| `student` \| `report` — `report` only for `kind = 'report'` tags |
| entity_id | uuid | |
| UNIQUE | (tag_id, entity_type, entity_id) | |

#### `waiting_list_entries`
*People who asked for a place before one exists. Plan-gated (`waiting_list` capability).*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id / centre_id | uuid FK | |
| name | text | Prospective student |
| contact_name / contact_email / contact_phone | text | Guardian or adult enquirer |
| subject / year_group | text NULL | What they want |
| note | text NULL | |
| status | text | `waiting` \| `offered` \| `enrolled` \| `withdrawn` |
| added_at | timestamptz | List order is oldest first |

#### `class_schedules`
*Recurrence pattern stored as LOCAL time + weekday, not naive UTC.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| class_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| weekday | int | **0–6, Sunday = 0** (matching `EXTRACT(DOW)`). Stated explicitly because the solo prototype numbers 1–7, and an off-by-one here moves every session by a day |
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
| register_submitted_by | uuid FK | Who submitted — may be an admin backfilling |
| register_late | boolean | Set by `submit_register` when the derived state was `awaiting` (natural backfill or unlock) |
| register_note | text NULL | The late reason. NOT NULL enforced when `register_late` and `centre_register_settings.require_late_reason` |
| register_by_admin | boolean | An admin submitted on the teacher's behalf — a different accountability posture from a late teacher |
| delivered_by | uuid FK NULL | → profiles.id — **the adult who actually delivered the session**; defaults to the submitter. Unplanned same-day substitution lives here; date-ranged planned cover is `class_cover` |
| delivered_minutes | int NULL | Time actually delivered when it differs from the scheduled length (one-to-one lessons); drives the teaching timesheet line and hourly billing. Null = scheduled length; 0 when nobody attended |

> **Register lifecycle states are derived, never stored.** The six operational states a register can be in (`upcoming`, `open_live`, `awaiting`, `lapsed`, `recorded`, `cancelled`) are computed at read time from `starts_at` / `ends_at` / `register_submitted_at`, the centre's `centre_register_settings` row, any active `register_unlocks` grant, and the current time — see `v_session_state` in Part II. `sessions.status` remains the three-value persisted enum above.

#### `centre_register_settings`
*Register timing policy. One row per centre; the only input `v_session_state` takes besides the session and the clock.*

| Column | Type | Notes |
|---|---|---|
| centre_id | uuid PK FK | |
| account_id | uuid FK | |
| pre_open_minutes | int | default 0 — how long before `starts_at` the register opens (`upcoming → open_live`) |
| grace_minutes | int NULL | Minutes after `ends_at` the register stays freely takeable. Ignored when `grace_eod` |
| grace_eod | boolean | default true — stay open until the end of the session's local calendar day |
| backfill_hours | int | default 72 — natural late window after grace before the register lapses. Solo accounts default to 168 |
| amendment_hours | int | default 24 — how long a submitted mark stays teacher-amendable |
| require_late_reason | boolean | default true — a backfill/unlocked submission cannot be confirmed without `register_note` |
| updated_at | timestamptz | |

#### `enrolments`
*Student ↔ class membership over a date range.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| class_id / student_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| starts_on / ends_on | date | |
| status | text | `active` \| `withdrawn` — **not `waitlisted`**: someone waiting for a place has no enrolment row at all, they have a `waiting_list_entries` row (§2). Two models for one queue is how the counts drift apart |

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
| note | text NULL | Reason. **Required when `granted_by` is the session's own teacher** — the solo "reopen with a reason" path, where the tutor is their own admin |

> Rows are never deleted: consumed, revoked and expired grants stay as the audit trail.

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

#### `student_targets`
*Predicted and target grades — teacher professional judgement, stored (decision #28). Shown on the student dashboard, teacher progress, admin student profile, tracking and reports.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id / centre_id | uuid FK | |
| student_id | uuid FK | |
| subject_id | uuid FK | |
| grade_scale_id | uuid FK | Which taxonomy the labels belong to |
| predicted_grade | text NULL | Teacher's current prediction |
| target_grade | text NULL | The aspiration |
| set_by | uuid FK | |
| set_on | date | |
| UNIQUE | (student_id, subject_id) | Latest wins; history via `audit_log` |

> "On track" is **derived** (`v_student_progress` compares recent results to `target_grade`), never stored. A published report snapshots the predicted grade into `reports.predicted_grade`, so later changes never alter a sent report.

---

### 4. Staff & pay

#### `staff_details`
*Employment metadata for staff. Sensitive; admin-scoped.*

| Column | Type | Notes |
|---|---|---|
| profile_id | uuid PK FK | |
| account_id / centre_id | uuid FK | |
| employment_type | text | `employed` \| `contractor` — the **legal** axis |
| pay_type | text | `salaried` \| `hourly` \| `mixed` — the **payroll** axis. `mixed` = salaried for their own timetable, paid for cover and extras |
| contracted_hours | numeric NULL | Weekly contracted hours (replaces the prototype's Full-time/Part-time label — a third vocabulary is not kept) |
| specialism | text NULL | Main subject, shown in staff lists |
| colour | text NULL | Token reference used on the schedule grid |
| start_date | date | |
| ni_number_ref | text | Tokenised reference, not the raw NI number |
| notes | text | Internal notes, admin-only |

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

#### `staff_leave`
*Booked absence for a member of staff. Read by the schedule (who is away), by `set_class_cover` (which prefills the cover window from it) and by staff attendance, so a session inside booked leave is not counted as a missed register.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| profile_id | uuid FK | The staff member |
| account_id / centre_id | uuid FK | |
| kind | text | `holiday` \| `sick` \| `other` |
| starts_on / ends_on | date | Inclusive |
| note | text NULL | |
| created_by | uuid FK | |
| created_at | timestamptz | |

#### `timesheet_entries`
*`teaching` entries are DERIVED from register submission — never entered manually. All other types are manually logged non-session work, subject to approval. A cancelled session produces no entry at all.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| session_id | uuid FK NULL | Set only for `teaching` entries (system-derived); null for manual types |
| profile_id | uuid FK | The teacher — for `teaching`, `sessions.delivered_by` |
| account_id / centre_id | uuid FK | |
| type | text | `teaching` \| `prep` \| `marking` \| `meeting` \| `training` \| `cover` \| `other` — RLS enforces that `teaching` rows are system-inserted only. `other` is recorded but never pay-eligible. A register derives `teaching` for whoever delivered the session, **cover teacher included**; the `cover` type is for manually logged non-session cover (supervising a colleague's class without taking a register). Whether cover is *paid* is decided by `v_timesheet_pay` against `v_effective_teacher`, never by this column |
| minutes | int | |
| worked_on | date | |
| note | text NULL | |
| rate_id | uuid FK NULL | Rate in force on `worked_on` |
| exported_amount | numeric NULL | **Snapshot** of the `v_timesheet_pay` amount taken when the entry moves to `exported`; null before. The live amount is always derived |
| status | text | `draft` \| `submitted` \| `approved` \| `rejected` \| `exported` — `exported` marks the payroll CSV hand-off; a ledger-only platform never asserts "paid" |
| decided_by | uuid FK NULL | → profiles.id — who approved or rejected. Pay approval without a named approver is not an audit trail |
| decided_at | timestamptz NULL | |
| decided_reason | text NULL | Required on `rejected` — a teacher told only "rejected" cannot fix and resubmit |

#### `centre_timesheet_policy`
*Centre pay policy. Read by `v_timesheet_pay`, so flipping a toggle re-derives every open period immediately.*

| Column | Type | Notes |
|---|---|---|
| centre_id | uuid PK FK | |
| account_id | uuid FK | |
| submission_frequency | text | `week` \| `fortnight` \| `month` — the **only** period control; staff never choose their own window |
| pay_non_session | boolean | Master switch for paying non-teaching time |
| paid_categories | text[] | Subset of `prep`, `marking`, `meeting`, `training` paid beneath the master switch |
| updated_at | timestamptz | |

> **Pay eligibility (`v_timesheet_pay`) — derived per entry, never stored:**
> - `teaching` / `cover`: `hourly` → paid · `salaried` → never · `mixed` → only when the entry is cover or extra, where *extra* = `sessions.delivered_by` is not the class's effective teacher for that date (`v_effective_teacher`).
> - Non-session types: paid only when `pay_non_session` **and** the type is in `paid_categories` **and** the teacher is `hourly` or `mixed`.
> - `other` is never paid. Salaried lines still record hours with a zero amount, for the audit trail.
> - Amount = eligible minutes × the `staff_rates` row in force on `worked_on`.

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

> **Auto-marking is deterministic, rule-based comparison — not AI** (decision #12). Every auto-marked type compares the student's response against an answer the teacher entered when authoring the question (`correct_index`, `correct_indices`, `answer` ± `tolerance`, `blanks[]`, `pairs[]`). There is no model, no inference and no external call. The platform feature flag is `hw_auto_marking`.

#### `assignment_folders`
*Coloured folders in the assignment builder's file rail.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id / centre_id | uuid FK | |
| name | text | |
| colour | text | Token reference |
| created_by | uuid FK | Folders are per-teacher |

#### `assignments`
*A homework set for a class.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| class_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| subject_id | uuid FK | |
| folder_id | uuid FK NULL | → assignment_folders.id |
| title / instructions | text | |
| due_at | timestamptz | |
| status | text | `draft` \| `published` \| `closed` — **`scheduled` is derived** (published with `available_from` in the future) |
| available_from | timestamptz NULL | Before this the assignment is visible but not startable |
| time_limit_mins | int NULL | Enforced whether or not a countdown is shown |
| attempts_allowed | int | default 1 |
| allow_late | boolean | default false — after `due_at`, submissions are refused unless true |
| allow_review | boolean | default false — may the student open the marked paper after release |
| hide_marks_until_released | boolean | default false — marks stay hidden until the teacher releases them (`release_marks`); when false, returning the work releases it |
| settings | jsonb | Presentation-only keys, none read by RLS: `randomize`, `auto_grade_mcq`, `show_question_preview`, `show_countdown` (default **false** — a ticking clock is never forced on a child), `show_correct`, `show_comments`, `show_auto_immediately`, `marks_only` |
| created_by | uuid FK | |

#### `assignment_targets`
*Polymorphic targeting: a whole class or named students.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| assignment_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| target_type | text | `class` \| `student` — `group` removed with groups (decision #31) |
| target_id | uuid | Points at the matching table |

#### `questions`
*Questions per assignment; heterogeneous payloads in JSONB.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| assignment_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| sort_order | int | |
| type | text | `mcq` \| `multi` \| `truefalse` \| `numeric` \| `expression` \| `fillblank` \| `match` \| `short_text` \| `long_text` \| `upload` |
| prompt | text | |
| hint | text NULL | Shown to the student on request |
| config | jsonb | Per-type payload — see below |
| max_marks | numeric | |

| Type | Marking | `config` payload |
|---|---|---|
| `mcq` | auto — exact index | `choices[]`, `correct_index` |
| `multi` | auto — exact set match, order-independent, all-or-nothing | `choices[]`, `correct_indices[]` |
| `truefalse` | auto | `answer` (boolean) |
| `numeric` | auto — within tolerance | `answer`, `tolerance` (default 0.01) |
| `expression` | auto — normalised LaTeX equality | `answer` (LaTeX) |
| `fillblank` | auto — **proportional**: correct blanks ÷ total × max_marks, case-insensitive trim | `text` with blank markers, `blanks[]` |
| `match` | auto — **proportional**: correct pairs ÷ total × max_marks | `pairs[]` (left/right) |
| `short_text` | teacher | optional `model_answer` |
| `long_text` | teacher | optional `model_answer` |
| `upload` | teacher — the student uploads a photo/file of working | accepted content types; answer file via `file_links (entity_type = 'answer')` |

> The prototype names `math`, `short`, `long` are legacy aliases for `expression`, `short_text`, `long_text`.

#### `submissions`
*A student's attempt at an assignment.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| assignment_id / student_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| status | text | `not_started` \| `in_progress` \| `submitted` \| `marked` \| `returned` — `marked` = teacher finished; `returned` = marks released to the student |
| attempt_count | int | default 0; bounded by `assignments.attempts_allowed` |
| started_at | timestamptz NULL | Drives the time limit |
| submitted_at | timestamptz NULL | |
| is_late | boolean | **Snapshot** at submit (`submitted_at > due_at`) — survives a later due-date extension |
| time_spent_mins | int NULL | |
| score | numeric | |
| overall_feedback | text NULL | Whole-paper teacher comment |
| marked_at | timestamptz NULL | |
| marks_released_at | timestamptz NULL | Set by `release_marks` (or on return when marks aren't held back); students read marks only when set |

> **Class standing is derived and gated.** Class average and rank come from `v_submission_standing`. Rank/position is returned to a student **only** when `privacy_flag(centre, 'show_rank_to_students')` is true (default **false**) and the student is at least `centre_privacy_settings.rank_min_age` (default 13); the class average follows the same gate as released marks (decision #29).

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
| feedback | text NULL | Per-question teacher comment |

---

### 6. Student reports & teacher feedback
*The flagship written-feedback domain — the successor to the deleted AI-feedback feature. Entirely human-authored; no AI anywhere. Due/upcoming reports are **derived** from rules × frequency × existing reports, never stored as due-flags.*

#### `report_rules`
*Must a report be written, for whom, how often. One `centre_default` rule per centre plus narrower overrides.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id / centre_id | uuid FK | |
| target_type | text | `centre_default` \| `tag` \| `class` \| `student` — partial unique index: one `centre_default` per centre |
| target_id | uuid NULL | → tags.id (`kind = 'cohort'`) / classes.id / students.profile_id; null for `centre_default` |
| requirement | text | `required` \| `optional` \| `off` — **the obligation**. Drives `v_reports_due`, which only queues `required` |
| brief | text NULL | Free-text guidance on what the report must cover |
| frequency | text NULL | `weekly` \| `fortnightly` \| `monthly` \| `half_termly` \| `termly`; null only when `requirement = 'off'` |
| template_id | uuid FK NULL | → report_templates.id |
| priority | int | Tie-break between rules at the same level — higher wins |
| active | boolean | |
| created_by | uuid FK | |

> **Rule resolution cascade — narrowest target wins:** `student` > `class` > `tag` > `centre_default`. Among rules at the same level, higher `priority` wins. The resolved rule for each (student, class) pair is the input to `v_reports_due`.

#### `centre_report_settings`
*Per-centre reports policy: publish standards, configurable permissions, PDF branding and notifications. The standards and permissions are enforced server-side.*

| Column | Type | Notes |
|---|---|---|
| centre_id | uuid PK FK | |
| account_id | uuid FK | |
| min_comment_length | int | default 120 — `publish_report` refuses below this |
| require_signature | boolean | default true — `publish_report` refuses without `reports.signature` |
| sections_required | text[] | Sections that must be non-empty on every template (default `{comments}`) |
| perm_edit_published | boolean | Teachers may edit a published report (re-publish re-renders the PDF) |
| perm_delete | boolean | Teachers may delete their own drafts |
| perm_archive | boolean | Teachers may archive their own published reports |
| perm_export | boolean | Teachers may export PDFs/CSVs |
| perm_share_templates | boolean | Teachers may create templates visible centre-wide |
| perm_view_others | boolean | Teachers may read other teachers' reports — **an RLS read predicate**, not a UI filter |
| pdf_theme | text | `classic` \| `modern` \| `minimal` |
| header_text / footer_text | text NULL | |
| signature_name / signature_title | text NULL | The centre countersignature printed beside the teacher's |
| watermark | text NULL | |
| notify_due / notify_overdue / notify_published_to_student | boolean | Gate the reminder sweeps and publish email enqueues |
| updated_at | timestamptz | |

> Centre identity on the PDF (name, logo, accent, contact) is **resolved from the centre profile and `centre_settings.branding` at render time** — never copied into this row.

#### `report_templates`
*Reusable report structure (sections/prompts) per centre.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id / centre_id | uuid FK | |
| name | text | |
| structure | jsonb | Ordered written sections + their prompts |
| rating_categories | jsonb | Ordered categories this template rates — `[{key, label, description}]`, e.g. Behaviour, Effort, Participation. **Ratings hang off categories, not written sections**, so "Effort" means the same thing wherever it appears and two pupils on different templates stay comparable |
| rating_scale_id | uuid FK | → rating_scales.id — the one scale every category on this template is rated on |
| shared | boolean | Visible to all centre teachers (requires `perm_share_templates` for teacher authors) |
| locked | boolean | default false — a centre-standard template: teachers may write with it but not edit its structure. Only a `centre_admin` may lock, unlock or change a locked template |
| created_by | uuid FK | |
| updated_at | timestamptz | |

#### `rating_scales`
*A named scale (the 4-tier taxonomy is the default seed).*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id / centre_id | uuid FK | |
| name | text | |
| kind | text | `levels` \| `stars` \| `percent`. Only `levels` uses `rating_levels` rows. **Stars and percent are not ordered labels** — a 1–5 star control and a 0–100 figure have no label to store, so forcing them into `rating_levels` would mean inventing five rows named "1".."5". `min_value`/`max_value` carry them instead |
| min_value / max_value | numeric NULL | Bounds for `stars` (1–5) and `percent` (0–100); null for `levels` |
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
| folder_id | uuid FK NULL | → report_folders.id |
| title | text NULL | Author's own heading for the report; falls back to the template name plus the period when blank |
| report_type | text | `termly_progress` \| `quick_update` — a label independent of the template |
| subject_id | uuid FK NULL | → subjects.id — the subject reported on. Defaults from `class_id` where one is set, but is stored because a report can cover a subject without a class |
| period_start / period_end | date | The period covered |
| status | text | `draft` \| `published` \| `archived` — no approval step (decision #26); the centre standards gate at publish is the quality check |
| body | jsonb | Section content keyed to the template structure (incl. academic fields: understanding, participation, homework completion, test performance, attendance, strengths, improvements) |
| ratings | jsonb | Category key → value: a `rating_levels.id` when the template's scale is `levels`, a plain number when it is `stars` or `percent` |
| predicted_grade | text NULL | **Snapshot** of `student_targets.predicted_grade` taken at publish |
| signature | text NULL | Typed teacher signature, printed on the PDF |
| published_at | timestamptz NULL | |
| archived_at | timestamptz NULL | |
| acknowledged_at / acknowledged_by | timestamptz / uuid FK NULL | The student acknowledged the published report (`acknowledge_report`) |
| pdf_file_id | uuid FK NULL | → files.id, rendered on publish |

> Report tags (`kind = 'report'`) attach through `taggables`; section attachments through `file_links (entity_type = 'report')`. The per-report history drawer (created / edited / published / archived, actor + time) reads `audit_log` — **every** report mutation is audited, not only publish.

#### `report_folders`
*Nested filing folders for reports.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id / centre_id | uuid FK | |
| parent_id | uuid FK NULL | → report_folders.id |
| name | text | |
| colour | text | Token reference |
| created_by | uuid FK | |

#### `report_user_state`
*Per-user file-management affordances — pinning and recently viewed are personal, not properties of the report.*

| Column | Type | Notes |
|---|---|---|
| report_id / profile_id | uuid FK | PK (report_id, profile_id) |
| account_id / centre_id | uuid FK | |
| pinned | boolean | |
| last_viewed_at | timestamptz NULL | |

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
| description | text NULL | |
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
| kind | text | `score` \| `checkbox` \| `select` (one of `options`) \| `rating` (1–5) \| `text` \| `grade` (label from `grade_scale_id`) \| `date` — **the seven kinds the prototype ships.** There is no separate `number` kind: an uncapped number is a `score` with `max_value` null |
| max_value | numeric NULL | What a `score` column is marked out of; null means uncapped |
| options | jsonb NULL | For `select` — ordered labels |
| grade_scale_id | uuid FK NULL | For `grade` |
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
*Persisted lesson planning. Materials attach through `resource_links (context_type = 'lesson_plan')` (§12).*

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

#### `centre_invoice_settings`
*Tax, numbering-adjacent defaults and reminder policy. One row per centre.*

| Column | Type | Notes |
|---|---|---|
| centre_id | uuid PK FK | |
| account_id | uuid FK | |
| currency | text | default `GBP` |
| vat_registered | boolean | default false |
| vat_number | text NULL | |
| tax_mode | text | `none` \| `exclusive` (tax added on top of line amounts) \| `inclusive` (line amounts already include tax) — a different calculation, not just a rate. Forced `none` when not VAT-registered |
| tax_label | text | default `'VAT'` |
| default_tax_rate | numeric | e.g. 0.20 — applied to new lines |
| invoice_due_days | int | default 14 |
| auto_send_on_issue | boolean | Email the invoice when it is issued |
| overdue_reminders | boolean | pg_cron overdue sweep enabled |
| reminder_cooldown_hours | int | default 24 — minimum gap between reminders for one invoice, manual or automatic |
| updated_at | timestamptz | |

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
| invoice_number | text NULL | From invoice_sequences, allocated at issue (drafts have none) |
| covers | text NULL | Human description of what is billed (e.g. "September · 8 lessons") |
| issued_at | timestamptz NULL | Null = draft (editable, not sent, excluded from status and balances) |
| issue_date / due_date | date | |
| tax_mode / tax_rate | text / numeric NULL | Per-invoice override of `centre_invoice_settings`; null = centre default |
| subtotal / vat_total / total | numeric | Snapshotted at issue — an issued invoice is an immutable document |
| currency | text | |
| voided_at / void_reason | timestamptz / text | |
| created_by | uuid FK | |

> Status (`scheduled` / `partial` / `paid` / `overdue` / `void`) is derived in `v_invoice_status`. A family whose billing guardian has **no email** is a first-class state: `POST /v1/invoices/:id/send` fails loudly with `no_billing_email` rather than silently enqueueing.

#### `invoice_lines`
*Line items.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| invoice_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| student_id | uuid FK NULL | Which sibling the line is for |
| class_id | uuid FK NULL | The class billed, when the line is for teaching |
| description | text | |
| quantity / unit_amount / line_total | numeric | For generated lines: quantity = delivered hours, unit = `classes.hourly_rate` |
| vat_rate / vat_amount | numeric | From the invoice's effective tax rate; zero when `tax_mode = 'none'` |
| fee_plan_id | uuid FK NULL | |

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
| method | text | `cash` \| `bank` \| `card_external` \| `cheque` — cheques are still ordinary in UK tuition |
| paid_on | date | |
| reference | text | |
| recorded_by | uuid FK | |
| reversed_at | timestamptz NULL | Set by `reverse_payment`. The row is **never deleted or edited** — a reversed receipt stays visible with its reversal beside it, because "this payment was recorded and then withdrawn" is different from "this payment never happened" |
| reversed_by | uuid FK NULL | |
| reversal_reason | text NULL | Required — an unexplained reversal on a money ledger is indistinguishable from a mistake being hidden |

> **Correcting a mistake.** Receipts are entered by hand, so they *will* be entered wrongly — the wrong family, twice, or the wrong amount. `reverse_payment(payment, reason)` marks the row reversed and audited; `v_invoice_status` ignores reversed rows when deriving what is paid. There is no UPDATE and no DELETE on this table, so the ledger only ever grows.

#### `invoice_reminders`
*Append-only log of reminders sent. Enforces `reminder_cooldown_hours`.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| invoice_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| to_email | text | |
| trigger | text | `manual` \| `due_soon` \| `overdue` |
| sent_by | uuid FK NULL | Null for cron |
| sent_at | timestamptz | |

---

### 9. Communications

#### `comms_settings`
*Per-centre messaging policy.*

| Column | Type | Notes |
|---|---|---|
| centre_id | uuid PK | |
| account_id | uuid FK | |
| default_preset | text | `locked` \| `standard` \| `open` — applying a preset overwrites the next four fields with its values |
| student_messaging_enabled | boolean | 1:1 student↔staff messaging |
| quiet_hours_start / quiet_hours_end | time | |
| images_enabled | boolean | May images be shared in threads at all. Threads containing a student are **text-only regardless** (see invariants) |
| dsl_observer | boolean | Auto-attach DSLs as observers to monitored threads (off only in the `open` preset) |
| message_retention | text | `1y` \| `3y` \| `7y` — pg_cron sweep deletes older messages, **except** any attached to an open safeguarding incident |
| announce_authors | text | `admins` \| `staff` — who may author centre announcements |
| approval_workflow | boolean | Teacher-authored announcements need admin approval before publishing |
| updated_at | timestamptz | |

> DSL lead and deputies are `memberships.dsl_role` rows, not fields here.

**Messaging eligibility.** The preset sets the four toggles above; this matrix decides who may open a thread at all, and `start_conversation` enforces it server-side. It is not a UI rule.

| Initiator → recipient | Permitted |
|---|---|
| staff → staff, same centre | Always |
| staff → a pupil they teach (`is_my_student()`) | Only when `student_messaging_enabled`. The thread stamps `monitored = true` and attaches DSL observers per `dsl_observer` |
| staff → a pupil they do not teach | `centre_admin` and DSL only — a teacher cannot DM another teacher's pupil |
| pupil → anyone | **Never.** A pupil does not open threads; they reply in threads staff started and post in class channels |
| anyone → guardian | Never — guardians have no login (decision #13). They receive email |
| across centres | Never, in any direction |

The `locked` preset sets `student_messaging_enabled = false`, so staff↔pupil 1:1 is off entirely and a pupil reaches staff only through a class channel. `open` leaves `dsl_observer` optional; it never widens who may start a thread.

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
| status | text | `draft` \| `pending_approval` \| `published` |
| submitted_by / submitted_at | uuid FK / timestamptz NULL | Set when a teacher submits under `approval_workflow` |
| approved_by / approved_at | uuid FK / timestamptz NULL | `publish_announcement` refuses a teacher-authored announcement without approval when the centre requires it |

#### `announcement_targets`
*Multi-target audience — an announcement may target several centres, roles, year groups, subjects and classes at once.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| announcement_id | uuid FK | |
| account_id / centre_id | uuid FK NULL | |
| target_type | text | `platform` \| `centre` \| `role` \| `year` \| `class` \| `subject` — year and subject resolve through classes |
| target_ref | uuid NULL | Points at the matching entity; null for platform/centre-wide. Always a uuid — a column that is sometimes an id and sometimes a label cannot be joined or constrained |

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
| kind | text | `direct` \| `group` \| `channel` (class-wide, bound to `class_id`) |
| class_id | uuid FK NULL | For `channel` |
| preset | text | `locked` \| `standard` \| `open` |
| subject | text | |
| created_by | uuid FK | |
| monitored | boolean | **Stamped at creation and immutable** (trigger rejects updates): true when participants cross student↔staff. Honoured before re-deriving from participants, so a monitored thread can never be un-monitored by a participant change |
| dsl_observed | boolean | DSL observers attached (from `comms_settings.dsl_observer` at creation) |

> **Minor-safety invariants (trigger/RLS, not UI):** a thread with any student participant is text-only — `messages.file_id` must be null; adding a student to an existing thread stamps `monitored = true` if not already.

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
| message_id | uuid FK NULL | The flagged message — one flag per message, however many reasons fire |
| class_post_id | uuid FK NULL | The flagged class post or comment. CHECK: exactly one of `message_id` and `class_post_id` is set, so the stream and the inbox share one flag queue |
| account_id / centre_id | uuid FK | |
| reasons | text[] | Every reason raised, ordered by severity: `external` \| `keyword` \| `out_of_hours`. **There is no `image` reason** — the scan runs on threads containing a pupil, and those are text-only at the database level (`messages.file_id` must be null), so no image can ever reach one to be flagged |
| primary_reason | text | `reasons[1]` — drives queue ordering |
| rule_ids | uuid[] | Matching `flag_rules` rows (empty for built-in detectors) |
| severity | text | `low` \| `medium` \| `high` — max over reasons |
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
| pattern_type | text | `keyword` \| `contact` \| `out_of_hours` — `contact` (reason `external`) is three built-in detectors: phone-number pattern, social-handle pattern, meet-up phrasing |
| pattern | text NULL | For `keyword` rules |
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

#### `safeguarding_escalation_contacts`
*Where to escalate — local authority designated officer, children's services, police, the centre's own DSL line. Shown beside the concern log.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id / centre_id | uuid FK | |
| label | text | e.g. "LADO", "Children's services (out of hours)" |
| name | text NULL | |
| phone / email | text NULL | |
| sort_order | int | |

> **Solo accounts:** the tutor is their own DSL (`dsl_role = 'lead'` on their membership is set at provisioning). The concern log is private to the tutor; Klasio stores the record but never reviews it or escalates on the tutor's behalf. The concern log, guardian and emergency contacts, consents and health/SEN notes are available on **every** plan, including free tiers — safeguarding is never capability-gated.

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
| category | text | `submissions` \| `resources` \| `question_attachments` \| `invoices` \| `reports` \| `avatars` \| `comms_attachments` \| `safeguarding` — set at sign-upload from the destination; drives retention and the storage breakdown |
| uploaded_by | uuid FK | |
| status | text | `pending` \| `confirmed` \| `archived` \| `deleted` |
| confirmed_at | timestamptz | |

**Category → retention matrix** (three states, enforced by `DELETE /v1/files/:id`):

| Category | Retention | Behaviour |
|---|---|---|
| `resources`, `question_attachments`, `avatars` | none | Deletable by uploader / centre_admin |
| `invoices`, `reports` | **archive** | Never deletable; may move to `archived` (cold storage), still counted in usage |
| `submissions`, `comms_attachments` | **locked** | Not deletable from storage management; removed only by the retention sweep of the owning record |
| `safeguarding` | **locked** | Tombstoned, never hard-deleted — survives erasure |

#### `file_links`
*Polymorphic attachment of a file to any entity.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| file_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| entity_type | text | `message` \| `assignment` \| `question` \| `answer` \| `report` \| `student` \| `incident` \| `lesson_plan` — a lesson plan attaches files the same way everything else does, rather than embedding them in its own body |
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

> **What `split` means.** `pooled` (the default, and the only mode for solo) gives every centre the whole account quota to draw on, first come first served. `split` divides the effective quota **evenly across active, non-archived centres**, so one centre cannot exhaust another's room; a remainder goes to the primary centre. Switching modes or adding a centre re-derives every centre's share immediately — the split is computed, never stored, so it cannot drift from the number of centres.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id | uuid FK | |
| blocks | int | Number of add-on blocks — block size and price come from `plans.limits.storage_addon_block_gb` / `storage_addon_block_price` (100 GB at £5/month on centre plans) |
| purchased_at | timestamptz | |
| stripe_ref | text | |
| status | text | `active` \| `cancelled` |

> **Retention lock:** delete flows respect statutory retention — files linked to safeguarding records are tombstoned, never hard-deleted, regardless of quota pressure. **R2 connection config** (bucket, region, jurisdiction, key id) is platform infrastructure configuration (environment/secrets), not a tenant table.

---

### 11. Platform & operations

#### `centre_settings`
*Per-centre presentation-level config. Anything an invariant or policy reads lives in a typed domain settings row instead (see Conventions).*

| Column | Type | Notes |
|---|---|---|
| centre_id | uuid PK | |
| account_id | uuid FK | |
| branding | jsonb | Logo file, accent, contact block, website |
| grading_defaults | jsonb | Default grade scale per level |
| teaching_defaults | jsonb | New-assignment defaults: `attempts_allowed`, `due_days`, `allow_late`, `auto_grade_mcq`, `allow_review`, `hide_marks_until_released` |
| features | jsonb | Presentation-level centre toggles only. **Nothing an RLS policy or view reads lives here** — the two safeguarding-sensitive toggles moved to `centre_privacy_settings` below |
| setup | jsonb | Setup checklist state `{invite, students, classes}` driving the "needs setup" drawer — completion is derived where possible, this stores dismissals |
| updated_at | timestamptz | |

#### `centre_privacy_settings`
*The two toggles that decide who may see a child's health record and whether a child is shown their rank. Typed, audited, and read directly by RLS and by `v_submission_standing` — never a jsonb key (decision #33). One row per centre, created with the centre.*

| Column | Type | Notes |
|---|---|---|
| centre_id | uuid PK FK | |
| account_id | uuid FK | |
| teacher_reads_health | boolean | default **false** — when true, a teacher may read `student_health` for their own students only (`is_my_student()`). Art. 9 data: every change is audited |
| show_rank_to_students | boolean | default **false** (AADC) — class rank is returned to a student only when this is true |
| rank_min_age | int | default 13 — a student below this age never sees rank, whatever the toggle says |
| updated_by | uuid FK | Who last changed it |
| updated_at | timestamptz | |

> Changed only through `update_privacy_settings` (audited). Read in policies and views through `privacy_flag(centre, key)`.

#### `audit_log`
*APPEND-ONLY. Payments, flags, role changes, welfare edits all land here. The single sink for centre, platform and onboarding audit — domain tables (`attendance_amendments`, `invoice_reminders`, `resource_access_log`, `register_unlocks`) hold domain history; `audit_log` records who did what.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id / centre_id | uuid FK NULL | Null for platform-level actions |
| actor_id | uuid FK NULL | Null for system actions |
| actor_role | text | `superadmin` \| `account_owner` \| `centre_admin` \| `teacher` \| `student` \| `system` — the role the actor was acting in |
| ip | inet NULL | |
| support_session_id | uuid FK NULL | Set when the action happened inside an impersonation session |
| action | text | |
| entity_type / entity_id | text / uuid | |
| meta | jsonb | |
| created_at | timestamptz | |

#### `user_preferences`
*Per-user appearance, accessibility and role defaults. AADC-relevant: the accessibility and nudge fields are the evidence for the Phase 16 review.*

| Column | Type | Notes |
|---|---|---|
| profile_id | uuid PK FK | |
| theme | text | `light` \| `dark` \| `system` |
| compact | boolean | |
| reduce_motion | boolean | |
| language / timezone / date_format / week_start | text | |
| text_size | text | `normal` \| `large` \| `xlarge` |
| high_contrast | boolean | |
| dyslexia_font | boolean | |
| streak_nudges | boolean | default **false** — de-gamified; no loss-aversion nudging. Forced false for under-13s |
| reminder_lead | text | How far ahead homework reminders fire |
| share_with_guardian | boolean | Student opts in to guardian summaries (guardian receives email only) |
| working_hours_from / working_hours_to | time NULL | Staff — suppresses non-urgent notifications outside |
| recents | jsonb | Recently opened trackers / reports etc. — convenience only |
| updated_at | timestamptz | |

#### `dashboard_layouts`

| Column | Type | Notes |
|---|---|---|
| profile_id / role | uuid FK / text | PK (profile_id, role) |
| layout | jsonb | Card order and visibility |
| updated_at | timestamptz | |

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
| class_id | uuid FK NULL | Per-class override for teachers (new submissions, low attendance below 85%, class messages); null = account-wide preference |
| channel | text | `in_app` \| `email` |
| kind | text | |
| enabled | boolean | |
| digest | text NULL | `instant` \| `daily` \| `weekly` for email |

> One resolver: a class-specific row overrides the account-wide row for the same kind + channel. Safeguarding alerts to DSLs cannot be disabled. Under-13 defaults are inserted **off** for every non-critical kind.

#### `plans`
*GLOBAL catalogue — no tenant columns. Superadmin-managed.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| code | text | e.g. `starter`, `growth`, `scale`, `solo_free`, `solo_core`, `solo_pro` |
| audience | text | `centre` \| `solo` — only plans matching `accounts.kind` are offered |
| name | text | |
| tagline | text NULL | Plan-card audience line |
| price_monthly / price_yearly | numeric | Yearly may be discounted (e.g. two months free) |
| sort_order | int | Ascending tier order — the **only** thing "upgrade/downgrade" compares |
| limits | jsonb | Numeric caps (null = unlimited): **`seats` — staff only** (distinct `profile_id`s holding a `centre_admin` or `teacher` membership anywhere on the account, counted **pooled across every centre**, so a person with two roles or two centres is one seat); `max_students` covers pupils, so the two never overlap. Plus `centres`, `storage_bytes`, `max_invoices_per_month`, `storage_addon_block_gb`, `storage_addon_block_price` |
| capabilities | jsonb | Flat boolean keys that gate surfaces: `group_lessons`, `lesson_planner`, `tracking`, `homework`, `homework_bank`, `reports`, `report_rules`, `at_risk_flags`, `payment_reminders`, `vat`, `analytics_exports`, `waiting_list`. The materials library is core on every plan and is not gated |
| active | boolean | |

> **Capability rule:** application code and RLS ask *"does this account's plan grant capability X / what is limit Y"* (`plan_capability(account, key)`, `plan_limit(account, key)`) — **nothing ever compares a plan code**. Limits are enforced in the write path (e.g. `enrol_student` refuses above `max_students`; invoice issue refuses above `max_invoices_per_month`). Safeguarding, guardian/emergency contacts, consents and health records are never behind a capability.

#### `subscriptions`
*Account ↔ plan, mirrored from Stripe via webhook.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id | uuid FK | |
| plan_id | uuid FK | |
| billing_cycle | text | `monthly` \| `yearly` |
| stripe_customer_id / stripe_subscription_id | text | |
| status | text | `trialing` \| `active` \| `past_due` \| `paused` \| `cancelled` |
| trial_days / trial_plan_id | int / uuid FK NULL | **Stamped at signup** from `platform_settings` — later changes to the platform offer never retro-apply |
| trial_started_at / trial_ends_at | timestamptz NULL | |
| trial_on_end | text NULL | `bill` \| `downgrade` \| `suspend` |
| paused_from / paused_until | date NULL | Seasonal pause (e.g. summer) instead of cancelling; Stripe pause-collection mirrored |
| redeemed_code_id | uuid FK NULL | → plan_codes.id — the override code applied to this subscription, if any |
| current_period_end | timestamptz | |

> A global free trial (`platform_settings.trial_*`) is a different mechanism from a redeemable `plan_codes.kind = 'free_trial'` code: the first applies to every new signup, the second only to accounts that redeem it.

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
*Product rollout flags — per account, cohort or plan. Platform-wide operational switches are **not** flags; they live in `platform_settings`.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| key | text UNIQUE | e.g. `hw_auto_marking`, `reports_v2` |
| description | text | |
| scope | text | `global` \| `opt_in` \| `beta_cohort` \| `plan_gated` |
| enabled | boolean | Master switch |
| rollout_pct | int NULL | 0–100, deterministic by account id hash |
| min_plan_sort_order | int NULL | For `plan_gated` — compares `plans.sort_order`, never a plan code |
| targeting | jsonb | Explicit account allow/deny lists for `opt_in` / `beta_cohort` |
| updated_by / updated_at | uuid FK / timestamptz | |

> The effective flag for an account is derived (`v_account_flags` / `flag_enabled(account, key)`); per-account overrides are the `targeting` lists, not extra rows.

#### `platform_settings`
*Single-row table (`id = true` CHECK). Global operational switches and superadmin defaults.*

| Column | Type | Notes |
|---|---|---|
| id | boolean PK | Always true |
| maintenance_mode | boolean | Global maintenance banner; writes blocked except superadmin |
| maintenance_notice | text NULL | Banner copy |
| read_only_mode | boolean | Every centre read-only |
| signups_enabled | boolean | Gates `POST /v1/auth/signup` |
| status_page_public | boolean | |
| trial_enabled / trial_days / trial_plan_id / trial_require_card / trial_on_end | boolean / int / uuid FK / boolean / text | The one platform-wide free-trial offer, stamped onto each new subscription |
| default_seats | int | |
| currency | text | Klasio's own billing currency |
| billing_email | text | |
| auto_suspend_after_days | int NULL | Past-due grace before suspension |
| deleted_account_retention_days | int | |
| updated_by / updated_at | uuid FK / timestamptz | Changes audited |

#### `support_sessions`
*Superadmin impersonation, time-boxed and visible to the tenant. Support itself is by email (decision #30) — there is no ticket system; a session references the email thread.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id | uuid FK | |
| centre_id | uuid FK NULL | Narrowest scope granted |
| superadmin_id | uuid FK | |
| support_ref | text | Support email thread / reference the tenant can recognise |
| reason | text | |
| started_at / expires_at | timestamptz | Max 60 minutes |
| ended_at | timestamptz NULL | |

> While a session is active the tenant's admins see an impersonation banner and the session in their audit log; every action inside it carries `audit_log.support_session_id`. Safeguarding incidents and health records stay unreadable inside a support session.

#### `billing_events`
*Mirror of Stripe invoice/charge/subscription events — Klasio's own revenue ledger (upgrades, new, add-ons, renewals, refunds) and the failed-payment / dunning queue. Idempotent via `processed_events`.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id | uuid FK | |
| stripe_event_id | text UNIQUE | |
| type | text | `new` \| `upgrade` \| `downgrade` \| `addon` \| `renewal` \| `refund` \| `payment_failed` |
| amount | numeric | Signed |
| currency | text | |
| dunning_state | text NULL | `retrying` \| `card_expired` \| `failed` — for `payment_failed` |
| attempt_count | int NULL | |
| description | text | |
| occurred_at | timestamptz | |

#### `data_requests`
*Tracks SAR / erasure lifecycle for GDPR compliance, against the statutory clock.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id / centre_id | uuid FK | |
| subject_profile_id | uuid FK NULL | Null when the request covers a whole account |
| kind | text | `sar` \| `erasure` |
| status | text | `open` \| `in_progress` \| `completed` \| `refused` |
| requested_by | uuid FK NULL | |
| requester_note | text | Who asked, in their words (e.g. "parent · EduFirst") |
| received_at | timestamptz | |
| due_at | timestamptz | **Statutory deadline** — `received_at + 1 month`, extendable with a recorded reason |
| extension_reason | text NULL | |
| completed_at | timestamptz | |

#### `jobs`
*Async work the UI polls — CSV imports, SAR and erasure exports, analytics exports. One table, so `GET /v1/jobs/:id` has exactly one place to look.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id / centre_id | uuid FK | |
| kind | text | `student_import` \| `invoice_import` \| `sar_export` \| `erasure` \| `analytics_export` |
| status | text | `queued` \| `running` \| `succeeded` \| `failed` \| `cancelled` |
| created_by | uuid FK | → profiles.id |
| params | jsonb | The request as submitted (source file id, filters) — never results |
| progress | int | 0–100, advisory only |
| result_file_id | uuid FK NULL | → files.id — the export bundle or the error CSV |
| row_errors | jsonb NULL | Per-row validation failures, surfaced in the import preview |
| error | text NULL | Terminal failure reason |
| data_request_id | uuid FK NULL | → data_requests.id — set when the job serves a statutory request, so the DSAR queue keeps its own clock while the UI polls one endpoint |
| started_at / finished_at | timestamptz NULL | |
| created_at | timestamptz | |

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

### 12. Resources (Materials library)
*Authored teaching materials for teachers and admins. The library row carries a permission and provenance model that sits **above** `files`: who may open it, who asked, who approved, and where it is used. **Materials are the only entity in the product with a visibility setting, a share button or a request affordance** — teaching and student records (progress, tracking, reports, attendance, submissions) never have one.*

#### `resources`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id / centre_id | uuid FK | |
| file_id | uuid FK NULL | → files.id (`category = 'resources'`). Null for `type = 'link'` |
| title | text | |
| description | text | |
| type | text | `worksheet` \| `mark_scheme` \| `slides` \| `notes` \| `past_paper` \| `revision` \| `video` \| `link` \| `other` |
| subject_id | uuid FK NULL | |
| year_group | text NULL | From `class_dimensions` (kind = year_group) |
| level | text NULL | **Derived from `year_group` when null** — one resolver so facet, row meta and form agree |
| exam_board | text NULL | From `class_dimensions` (kind = exam_board); `'None'` is a real value |
| created_by | uuid FK | → profiles.id. **Ownership never transfers**, including at offboarding |
| visibility | text | `centre` \| `on_request` \| `private` |
| url | text NULL | For `link` |
| created_at / updated_at | timestamptz | |

#### `resource_shares`
*An explicit grant of read access to one staff member. Idempotent.*

| Column | Type | Notes |
|---|---|---|
| resource_id / staff_id | uuid FK | PK (resource_id, staff_id) |
| account_id / centre_id | uuid FK | |
| granted_by | uuid FK | The creator, or the approver of a request |
| granted_at | timestamptz | |

#### `resource_access_requests`
*"May I open this?" against an `on_request` resource. Approval creates the share in the same transaction.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| resource_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| requested_by | uuid FK | |
| note | text | Reason shown to the approver |
| status | text | `pending` \| `approved` \| `declined` |
| decided_by / decided_at | uuid FK / timestamptz NULL | |
| UNIQUE partial | (resource_id, requested_by) WHERE status = 'pending' | One open request per person per resource |

> **Approver routing is derived, never stored:** the creator approves while their membership is active; once deactivated it falls to any centre admin. No reassignment step at offboarding.

#### `resource_links`
*A **pointer** attaching a resource to a teaching context. Nothing is copied.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| resource_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| context_type | text | `lesson_plan` \| `assignment` |
| context_id | uuid | |
| student_visible | boolean | Default from the type: `mark_scheme` and `past_paper` default **false**, all others true |
| visible_from | timestamptz NULL | Release schedule — e.g. hide a mark scheme until after the deadline |
| attached_by | uuid FK | |
| attached_at | timestamptz | |
| UNIQUE | (resource_id, context_type, context_id) | Attaching twice is a no-op |

#### `resource_usage_events`
*Append-only attach history. **Survives detach** — "recently used" ranks on this.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| resource_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| user_id | uuid FK | |
| context_type / context_id | text / uuid | |
| topic | text | Captured at attach time — deliberately denormalised, the lesson may change topic later |
| at | timestamptz | |

#### `resource_access_log`
*An admin opening a resource they were not shared is a logged action, not a silent read.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| resource_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| opened_by | uuid FK | |
| at | timestamptz | |

**Access predicate** — distinguishes *seeing that a row exists* from *opening its contents*:

| Viewer | `centre` | `on_request` | `private` |
|---|---|---|---|
| Creator | open | open | open |
| Other staff | open | row visible, contents blocked until an approved request → share | row not visible |
| Centre admin | open | blocked until a request exists, then audited override | audited open → `resource_access_log` |
| Student | never reads the library — only through a `resource_links` row with `student_visible` and `visible_from` elapsed | | |

"Used in N places" (`v_resource_usage_count`, counted from `resource_links`) and "recently used" (`v_resource_recent`, from `resource_usage_events`) are derived at read time, never stored.

---

## Part II — Row-Level Security

### Helper functions

Policies are expressed through a small set of `SECURITY DEFINER` helpers so predicates stay short and auditable.

| Function | Returns | Purpose |
|---|---|---|
| `auth_uid()` | uuid | Wraps `auth.uid()`; the calling user's profile id |
| `is_superadmin()` | boolean | True if the JWT carries the platform-admin claim (allowlist). **Grants no tenant data on its own** — it appears only on the platform tables listed in the matrix; tenant reads go through `in_support_session()` |
| `auth_centre_ids()` | uuid[] | Centres where the caller has an active membership — the core scoping set |
| `auth_account_ids()` | uuid[] | Every account the caller holds a membership under — **an array, like `auth_centre_ids()`**. One person can teach at centres owned by two different accounts, so a single-uuid version silently hides one of them. Empty for a superadmin |
| `has_role(centre uuid, roles text[])` | boolean | Caller holds one of the given roles in that centre — `EXISTS` over membership rows (multi-role safe) |
| `is_account_owner(account uuid)` | boolean | `accounts.owner_profile_id = auth_uid()` — ownership check; **"account_owner" in the matrix below means this helper**, not a membership role |
| `is_dsl(centre uuid)` | boolean | Caller's membership in that centre has `dsl_role IS NOT NULL` (lead or deputy) |
| `is_my_student(student uuid)` | boolean | Caller teaches — or, per a `class_cover` row covering today, currently covers — a class the student is enrolled in. **The teacher scope for every per-student read** |
| `owns_profile(p uuid)` | boolean | `p = auth_uid()`; own-record access for students/staff |
| `plan_capability(account uuid, key text)` | boolean | The account's current plan grants the capability — never a plan-code comparison |
| `plan_limit(account uuid, key text)` | numeric | Numeric cap from `plans.limits`; null = unlimited |
| `report_perm(centre uuid, key text)` | boolean | Reads a `centre_report_settings.perm_*` column — lets the six report permissions sit inside policies |
| `privacy_flag(centre uuid, key text)` | boolean | Reads a `centre_privacy_settings` column (`teacher_reads_health`, `show_rank_to_students`) — the two safeguarding-sensitive toggles, typed and audited (§11) |
| `flag_enabled(account uuid, key text)` | boolean | The effective feature flag for an account (scope, rollout, plan gate, targeting) — the function behind `v_account_flags` |
| `resource_can_open(resource uuid)` | boolean | The §12 access predicate (open, not just see) — shared by RLS and `sign-download` |
| `in_support_session(account uuid)` | boolean | Caller is a superadmin with an active `support_sessions` row for the account |

**Canonical scoped-read pattern** (applied to every centre-scoped table):

```sql
create policy sel on <table> for select using (
  centre_id = any(auth_centre_ids())
  or in_support_session(account_id)
);
```

A superadmin holds no membership, so this pattern grants them **nothing** until they open a time-boxed `support_sessions` row that the tenant can see. `is_superadmin()` appears only on the platform-level tables — `plans`, `plan_codes`, `plan_code_redemptions`, `feature_flags`, `platform_settings`, `support_sessions`, `billing_events`, `processed_events`, `email_outbox`, `email_suppressions` — and on `accounts` / `centres` for provisioning and suspension.

**Teacher scope.** Staff roles are not interchangeable: a teacher reads the pupils they teach, not the centre roll. Every per-student table adds `is_my_student()` rather than a bare membership check, and centre-wide reads stay with `centre_admin` (plus `account_owner` where the matrix says so):

```sql
create policy sel_student_scoped on <table> for select using (
  has_role(centre_id, array['centre_admin'])
  or is_my_student(student_id)
  or owns_profile(student_id)          -- the pupil's own row, where the matrix allows it
  or in_support_session(account_id)
);
```

### Cross-cutting invariants

Rules the whole system depends on. Each is enforced by a constraint, a trigger or an RPC — **never by the UI alone**, because every one of them is a rule someone will eventually try to break through the API.

- **Ownership is always staffed.** `accounts.owner_profile_id` must point at a profile holding a `centre_admin` membership at the account's primary centre. `transfer_ownership` grants the incoming owner that membership *before* repointing the field, so an owner always resolves through the canonical read pattern and RLS needs no owner special-case. "account_owner" in the matrix therefore grants rights *in addition to* an admin membership, never instead of one.
- **A centre never loses its last admin.** `set_member_role` refuses to remove the final `centre_admin` membership at a centre, and refuses to remove the account owner's.
- **Who may start a conversation.** `start_conversation` is staff-initiated and checked against the `comms_settings` preset matrix. A pupil never opens a thread. A staff↔student thread stamps `monitored = true` at creation (immutable) and attaches DSL observers per `dsl_observer`.
- **Quiet hours never block a send.** They gate *notification delivery* and raise an `out_of_hours` flag reason. A pupil reaching out at night must always get through — the flag is what brings a human to it, and a blocked message is a safeguarding failure, not a safeguarding control.
- **DSL is a capability, not a role.** `memberships.dsl_role` (`lead` / `deputy`), at most one lead per centre. No table stores a DSL identity and `comms_settings` holds no people — so removing someone's membership removes their DSL access in the same step.
- **A thread with any student participant is text-only.** `messages.file_id` must be null; adding a student to an existing thread stamps `monitored` if it is not already set. `comms_settings.images_enabled` cannot override this.

### Derived views

Metrics and lifecycle states are computed at read time through `v_*` views, never stored. Views are `security_invoker = true` so they run under the caller's RLS. The most important state machine in the register slice:

#### `v_session_state`

Resolves each session to one of **six operational states** from source-of-truth columns, the centre's `centre_register_settings` row, any active unlock grant, and the current time. `sessions.status` stays the three-value persisted enum (`scheduled` / `delivered` / `cancelled`); these six are derived and transient.

Window edges, all from `centre_register_settings`:
- **opens** = `starts_at − pre_open_minutes`
- **grace end** = end of the session's local day when `grace_eod`, else `ends_at + grace_minutes`
- **backfill end** = `ends_at + backfill_hours`
- **amend lock** = `register_submitted_at + amendment_hours`

| Derived state | Meaning | Actionable? |
|---|---|---|
| `cancelled` | `sessions.status = 'cancelled'` | No — excluded from attendance rate denominator |
| `recorded` | Register submitted; within amendment window or locked | Amendable (see rules) |
| `upcoming` | Now is before **opens** | No |
| `open_live` | Now is between **opens** and **grace end** | Yes — take register |
| `awaiting` | Past **grace end**, not submitted, and **either** now is before **backfill end** **or** an active unlock grant exists | Yes — take/re-take register; submission is flagged `register_late` and needs `register_note` when `require_late_reason` |
| `lapsed` | Past **backfill end**, not submitted, no active grant | No — locked; requires unlock |

**Transition rules the view (and its callers) must implement:**

- The **natural backfill window** is the first path back in: after grace closes, the register stays takeable (flagged late) until **backfill end** (default 72h; 168h for solo accounts). No unlock is needed during this window — the teacher is never locked out the moment a session ends.
- A **`lapsed`** session with an `active` `register_unlocks` row where `now < expires_at` derives as **`awaiting`** (actionable) until the grant is consumed or expires — the unlock grant is the second path back in, after natural backfill has passed.
- A **`recorded`** session that is **locked** but has an active unlock grant derives as amendable/reopened — a full re-take, not per-mark amend.
- `submit_register` on an `awaiting` session writes marks, sets `sessions.status = 'delivered'`, derives timesheet entries, and **consumes** the unlock (`status = 'consumed'`) — the register re-locks immediately.
- If a grant is never used, at `expires_at` it lapses (`status = 'expired'`) and the session derives back to **`lapsed`** (auto re-lock).
- **Amendment window:** before **amend lock**, a teacher self-serves per-mark `amend_attendance` (audited to `attendance_amendments`). After it the register is locked and only a `grant_unlock` reopens it for a full re-take.
- **Admin backfill:** a centre admin may submit an `awaiting` or `lapsed` register directly (`register_by_admin = true`, always flagged late) without granting an unlock.
- **Solo self-reopen:** in a solo account the tutor is their own centre admin; `grant_unlock` on their own session requires a `note`, which is shown on the register.

Related views in this slice: `v_attendance_summary` (rate folds over `recorded` sessions; `cancelled` excluded from the denominator), `v_timesheet_summary`, `v_timesheet_pay` (pay eligibility per entry — §4 rules), `v_effective_teacher` (permanent teacher overridden by any `class_cover` row covering the session date — *planned* cover; `sessions.delivered_by` is the *actual* delivery record, and timesheets read that).

Elsewhere, by slice. Every view is `security_invoker = true`, so it returns only rows the caller's policies already allow.

**Academic (Phase 3)**
- `v_class_summary` — one row per class: enrolled head count against capacity, effective teacher, next session.
- `v_enrolment_status` — one row per (class, student): current state derived from the `enrolments` date range.

**Register and pay (Phase 4)**
- `v_session_delivery` — one row per delivered session: who delivered it, minutes delivered, late and admin-backfill flags.
- `v_attendance_summary` — attendance rate per class, student and period; `cancelled` sessions excluded from the denominator.
- `v_timesheet_summary` — hours per teacher per period, by entry type and status.
- `v_timesheet_pay` — pay eligibility and amount per entry (§4 rules).

**Results (Phase 6)**
- `v_results_summary` — one row per (assessment, class): mean, spread, published state.
- `v_class_performance` — class trend across assessments, behind the progress screens.
- `v_student_progress` — results trend against `student_targets.target_grade` ("on track").
- `v_student_risk` — the one at-risk definition (attendance, homework completion and results against centre thresholds). Admin and teacher surfaces read the same view.

**Homework (Phase 8)**
- `v_homework_completion` — per assignment: assigned, started, submitted, marked, returned.
- `v_submission_summary` — per submission: score, lateness, time spent, marking state.
- `v_submission_standing` — class average and rank per submission, rank nulled unless `privacy_flag(centre, 'show_rank_to_students')` and the student meets `rank_min_age`.
- `v_my_submissions`, `v_my_answers` — a student's own rows with `score`, `overall_feedback`, `marks_awarded` and `feedback` withheld until `marks_released_at` is set. This is the column-level gate the matrix refers to.

**Reports (Phase 8b)**
- `v_reports_due` — resolves the rule cascade per (student, class), then derives due/upcoming entries from `requirement = 'required'` × frequency × existing `reports` rows. Due-ness is never stored.

**Invoicing (Phase 7)**
- `v_invoice_status` — derived status per invoice (`scheduled` / `partial` / `paid` / `overdue` / `void`).
- `v_outstanding_balance` — balance per family and per centre.
- `v_payment_schedule` — instalments with derived paid/outstanding state and days overdue.

**Communications (Phases 5 and 9)**
- `v_announcement_reach` — per announcement: resolved recipients, reads, acknowledgements.
- `v_unread_announcements` — per user: published, unexpired announcements they have not read.
- `v_conversation_list` — per participant: thread, last message, unread count, monitored flag.
- `v_unread_counts` — unread message totals per user, for the sidebar badge.

**Safeguarding (Phase 10)**
- `v_open_incidents` — open and monitoring incidents for the DSL queue.
- `v_incident_timeline` — one incident with its append-only notes in order.

**Notifications (Phase 11)**
- `v_unread_notification_count` — per user, for the bell.

**Analytics exports (Phase 12)**
- `v_attendance_report`, `v_results_report`, `v_timesheet_report`, `v_invoice_report` — the flattened, filterable rows behind `GET /v1/exports/:key`. Financial figures come from the invoice ledger, never a second source.

**Resources (Phase 12c)**
- `v_resource_usage_count`, `v_resource_recent` — §12.

**Platform**
- `v_suspicious_activity` — `auth_attempts` grouped by identifier over a rolling window.
- `v_account_flags` — effective feature flags per account, over `flag_enabled()`.
- `v_platform_status` — the only fields anon may read from `platform_settings`: `maintenance_mode`, `maintenance_notice`, `read_only_mode`, `signups_enabled`, `status_page_public`.

### Per-table policy matrix

Each non-empty cell represents one or more policies to write and cover in the RLS isolation suite.

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| accounts | own accounts (`id = any(auth_account_ids())`); account_owner; superadmin | superadmin | superadmin; account_owner (own) | superadmin |
| centres | members of the account; superadmin | superadmin; account_owner | superadmin; account_owner; centre_admin (own centre) | superadmin; account_owner |
| profiles | self; staff in a shared centre | self (on signup); admin (invite flow) | self; centre_admin for managed users | centre_admin |
| memberships | self; centre_admin/owner in that centre | account_owner; centre_admin | account_owner; centre_admin (role + dsl_role changes audited) | account_owner; centre_admin |
| students | centre_admin; teacher via `is_my_student()`; the student (self) | centre_admin | centre_admin; teacher (own students, via RPC — column-limited) | centre_admin |
| student_guardians | centre_admin; teacher via `is_my_student()` | centre_admin | centre_admin | centre_admin |
| families | centre_admin; student (own family) | centre_admin | centre_admin | centre_admin |
| emergency_contacts | centre_admin; is_dsl; teacher via `is_my_student()` | centre_admin | centre_admin | centre_admin |
| student_health | centre_admin; is_dsl; teacher via `is_my_student()` **only when** `privacy_flag(centre, 'teacher_reads_health')` | centre_admin | centre_admin (audited) | centre_admin |
| consents | centre_admin; is_dsl | centre_admin; system (magic-link) | centre_admin | centre_admin |
| invitations | centre_admin; account_owner | centre_admin; account_owner | centre_admin (revoke) | centre_admin |
| student_claims | centre_admin | centre_admin | system (claim); centre_admin (revoke) | centre_admin |
| guardian_approvals | centre_admin; system | centre_admin; system | system (confirm) | — |
| student_claim_batches / import_drafts | centre_admin | centre_admin | centre_admin (own drafts) | centre_admin |
| auth_attempts | superadmin; centre_admin (identifiers resolved to own centre) | service-role only | — (append-only) | — (retention sweep) |
| account_lockouts | superadmin; centre_admin (own centre identifiers) | service-role | superadmin via `clear_lockout` / `block_identifier` (audited) | — |
| subjects / terms / term_breaks / rooms / class_dimensions | centre members | centre_admin | centre_admin | centre_admin |
| classes | centre members (students: enrolled only) | centre_admin | centre_admin; teacher (own classes) | centre_admin |
| class_schedules | centre members | centre_admin | centre_admin | centre_admin |
| class_cover | centre staff | centre_admin | centre_admin | centre_admin |
| class_settings | class members | system (with class) | class teacher; centre_admin | — |
| class_posts | enrolled students; class staff; centre_admin | class staff; enrolled student when `students_can_post` | author; centre_admin (soft delete) | — |
| class_post_comments | as class_posts | class staff; enrolled student when `students_can_comment` | author; centre_admin (soft delete) | — |
| class_change_requests | requester; centre_admin | teacher (own classes) | centre_admin (decide) | — |
| tags | centre staff | centre_admin; teacher (`kind = 'report'` only) | centre_admin | centre_admin |
| taggables | centre staff; student never | centre_admin; teacher (report tags on own reports) | — | centre_admin; teacher (own report tags) |
| waiting_list_entries | centre_admin | centre_admin (capability `waiting_list`) | centre_admin | centre_admin |
| centre_register_settings | centre staff | system (with centre) | centre_admin (audited) | — |
| sessions | centre staff; enrolled students | centre_admin via `regenerate_sessions` | the **effective** teacher for that date (`v_effective_teacher` — permanent teacher or an active `class_cover` row), via register; centre_admin | centre_admin |
| enrolments | centre_admin; teacher (own classes); the student (self) | centre_admin (RPC) | centre_admin (RPC) | centre_admin |
| attendance_records | centre_admin; teacher via `is_my_student()`; the student (self) | teacher via submit_register | teacher/centre_admin (amend, audited) | centre_admin |
| register_unlocks | centre staff; the affected teacher | centre_admin via grant_unlock (audited) | system (consume); centre_admin via revoke_unlock (audited) | — |
| attendance_amendments | centre staff | system (via amend_attendance) | — (append-only) | — |
| grade_scales / grade_bands | centre members | centre_admin | centre_admin | centre_admin |
| assessments | centre_admin; teacher (own classes); enrolled students (if published) | teacher; centre_admin | teacher (own); centre_admin | centre_admin |
| results | centre_admin; teacher via `is_my_student()`; student (self, if published) | teacher; centre_admin | teacher (own); centre_admin | centre_admin |
| student_targets | centre_admin; teacher via `is_my_student()`; student (self) | teacher (own students); centre_admin | teacher (own students); centre_admin (audited) | centre_admin |
| staff_details | self; centre_admin; account_owner | centre_admin | centre_admin; self (own contact fields only, through `update_my_staff_profile`) | centre_admin |
| staff_rates | self; centre_admin | centre_admin (audited) | centre_admin (audited) | centre_admin |
| staff_leave | self; centre staff | centre_admin | centre_admin | centre_admin |
| timesheet_entries | self (teacher); centre_admin | system (`teaching`, via submit_register); teacher (self, non-teaching types via `log_timesheet_entry`) | teacher (self, own `draft`/`rejected` non-teaching — **a rejected entry must be correctable**, which is the point of `decided_reason`; `submitted` is locked while a decision is pending, and `approved`/`exported` are closed); centre_admin (approve/reject/adjust, audited) | teacher (self, own `draft`) |
| timesheet_adjustments | self; centre_admin | centre_admin (audited) | — | — |
| centre_timesheet_policy | centre staff | system (with centre) | centre_admin (audited) | — |
| assignment_folders | creator | teacher | creator | creator |
| assignments | centre staff; targeted students (published, not before `available_from` for contents) | teacher; centre_admin | teacher (own); centre_admin | teacher (own) |
| assignment_targets | centre staff; targeted students | teacher; centre_admin | teacher; centre_admin | teacher; centre_admin |
| questions | centre staff; students (on open assignment) | teacher; centre_admin | teacher (own) | teacher (own) |
| submissions | centre_admin; teacher via `is_my_student()`; the student (self, through `v_my_submissions`, which withholds `score`/`overall_feedback` until `marks_released_at` is set) | student (self, RPC) | student (self, until submitted); teacher (marking, `release_marks`) | — |
| answers | centre_admin; teacher via `is_my_student()`; the student (self, through `v_my_answers`, which withholds `marks_awarded`/`feedback` until released) | student (self) | student (self, until submit); teacher (mark) | — |
| report_rules / rating_scales / rating_levels | centre staff | centre_admin | centre_admin | centre_admin |
| report_templates | centre_admin; creator; centre teachers when `shared` | centre_admin; teacher (`shared = false`, or `shared` when `report_perm(perm_share_templates)`) | creator; centre_admin | creator; centre_admin |
| centre_report_settings | centre staff | system (with centre) | centre_admin (audited) | — |
| reports | author; centre_admin; other teachers when `report_perm(perm_view_others)`; student (self, `published` only — never `draft`, never `archived`) | teacher; centre_admin | author (draft); author (published, when `perm_edit_published`); centre_admin; publish/archive via RPC (audited) | author (draft, when `perm_delete`); centre_admin (draft only) |
| report_folders | centre staff | teacher; centre_admin | creator; centre_admin | creator; centre_admin |
| report_user_state | self | self | self | self |
| trackers / tracker_columns / tracker_entries | teacher (own classes); centre_admin | teacher (own classes) | teacher (own classes) | teacher (own); centre_admin |
| lesson_plans | author; teachers of the class; centre_admin | teacher | author | author; centre_admin |
| fee_plans | centre staff | centre_admin | centre_admin | centre_admin |
| invoice_sequences | centre_admin (via RPC only) | system | system (via RPC) | — |
| invoices | centre_admin; account_owner | centre_admin (RPC) | centre_admin (void, audited) | — |
| invoice_lines | centre_admin; account_owner | centre_admin | centre_admin | centre_admin |
| payment_schedules | centre_admin; account_owner | centre_admin | centre_admin | centre_admin |
| payments | centre_admin; account_owner | centre_admin via record_payment (audited) | centre_admin via `reverse_payment` only (sets the three reversal columns, audited) | — |
| centre_invoice_settings | centre staff | system (with centre) | centre_admin (audited) | — |
| invoice_reminders | centre_admin | system via `send_invoice_reminder` (cooldown-checked) | — (append-only) | — |
| comms_settings | centre staff | centre_admin | centre_admin | — |
| announcements | centre staff; recipients (via receipts) | centre_admin; teacher when `announce_authors = 'staff'`; superadmin (platform scope) | author (draft/pending); centre_admin; approve via RPC | author (draft); centre_admin |
| announcement_targets | as announcements | author; centre_admin | author; centre_admin | author; centre_admin |
| announcement_receipts | recipient (self); author; centre_admin | system (publish) | recipient (read/ack) | — |
| conversations | participants; is_dsl (observed threads) | staff (RPC, preset-checked) | participants (limited) | centre_admin |
| conversation_participants | participants; is_dsl | system (RPC) | self (last_read_at) | centre_admin |
| messages | participants; is_dsl | participant (INSERT — RLS checks membership) | sender (edit window) | — |
| message_flags | is_dsl; centre_admin | system (trigger) | is_dsl (resolve, audited) | — |
| flag_rules | centre_admin; is_dsl | centre_admin | centre_admin | centre_admin |
| safeguarding_incidents | is_dsl; centre_admin only | is_dsl; teacher (raise_concern) | is_dsl (audited) | — |
| safeguarding_incident_notes | is_dsl; centre_admin only | is_dsl (append-only) | — (immutable) | — |
| safeguarding_escalation_contacts | centre staff | centre_admin; is_dsl | centre_admin; is_dsl | centre_admin |
| files | linked-entity viewers; resource viewers (`resource_can_open`); uploader; centre_admin | **service-role only** (the `sign-upload` endpoint, after its permission and quota checks) | system (confirm, archive) | uploader; centre_admin — only when the category's retention allows |
| file_links | entity viewers | uploader; system | — | uploader; centre_admin |
| storage_rollups | centre staff | system | system (cron) | — |
| storage_addons | account_owner; superadmin | system (webhook) | system | — |
| centre_settings | centre staff | centre_admin | centre_admin | — |
| centre_privacy_settings | centre staff | system (with centre) | centre_admin via `update_privacy_settings` (audited) | — |
| audit_log | centre_admin; account_owner; is_dsl (own scope); superadmin | system only | — (append-only) | — |
| notifications | recipient (self) | system | recipient (mark read) | recipient |
| notification_prefs | self | self (non-critical kinds only; DSL safeguarding alerts cannot be disabled) | self | self |
| user_preferences / dashboard_layouts | self | self | self (under-13: `streak_nudges` cannot be set true) | self |
| plans | all authenticated (read); superadmin | superadmin | superadmin | superadmin |
| subscriptions | account_owner; superadmin | system (webhook) | system (webhook) | — |
| plan_codes | superadmin | superadmin | superadmin | superadmin |
| plan_code_redemptions | superadmin; account_owner (own) | system (redeem RPC) | — | — |
| feature_flags | superadmin (accounts read effective values via `v_account_flags`) | superadmin | superadmin (audited) | superadmin |
| platform_settings | all authenticated (read — maintenance/read-only/signups banners); anon **only** through `v_platform_status` | — (seeded) | superadmin (audited) | — |
| support_sessions | superadmin; account_owner + centre_admin (own account) | superadmin via `start_support_session` (audited) | superadmin (end, audited) | — |
| billing_events | superadmin; account_owner (own account) | system (Stripe webhook) | — (append-only) | — |
| data_requests | centre_admin; account_owner; superadmin | centre_admin; superadmin | system; superadmin | — |
| jobs | centre_admin; account_owner; superadmin | system | system | — |
| processed_events | — (service-role only) | service-role | — | — |
| email_outbox | — (service-role only) | system (triggers/cron) | worker (service-role) | — |
| email_suppressions | — (service-role only) | system (webhook) | — | service-role |
| resources | creator; centre staff per the §12 predicate (row visible for `centre`/`on_request`, not `private`); centre_admin (all rows; opening `private` is audited) | teacher; centre_admin | creator; centre_admin | creator; centre_admin |
| resource_shares | creator; grantee; centre_admin | creator; centre_admin; system (on approve) | — | creator; centre_admin |
| resource_access_requests | requester; derived approver; centre_admin | teacher (self) | approver via `decide_access_request` (audited) | — |
| resource_links | context viewers; students **only** when `student_visible` and `visible_from` elapsed | teacher (own contexts) | attacher | attacher; centre_admin |
| resource_usage_events | centre staff | system (via `attach_resource`) | — (append-only) | — |
| resource_access_log | centre_admin; account_owner | system | — (append-only) | — |

> **Superadmin in a support session** reads tenant tables through `in_support_session(account)` on the canonical scoped-read pattern. Outside a session a superadmin reads **no** tenant data at all.
>
> **Never admitted, session or not:** `student_health`, `emergency_contacts`, `consents`, `safeguarding_incidents`, `safeguarding_incident_notes`, `safeguarding_escalation_contacts`, `conversations`, `conversation_participants`, `messages`, `message_flags`, and any `files` / `file_links` row whose category is `safeguarding`. Support diagnoses configuration, never a child's record or a private conversation.

---

## Part III — API endpoints

Three surfaces. Plain CRUD goes through the Supabase client (PostgREST), authorised entirely by RLS. Multi-table transactions are Postgres RPCs. Anything touching a secret or bypassing RLS is a Railway HTTP endpoint.

### Railway REST endpoints

#### Auth & onboarding

| Method | Endpoint | Description |
|---|---|---|
| POST | `/v1/auth/signup` | **Public self-serve signup** (decision #22). Rate-limited per IP, idempotent on email, refused when `platform_settings.signups_enabled` is false. One transaction: account (`kind` centre or solo) + owner profile + first centre (implicit for solo) + centre code + domain settings rows + subscription with the platform trial stamped. Owner must enrol TOTP before first use |
| POST | `/v1/invites` | Create a staff invitation. **The only caller of `invite_member`** — the RPC owns the transaction (row + token), the endpoint owns the side effect (queueing the email), so clients never call the RPC directly |
| POST | `/v1/invites/:id/resend` | Re-send an unexpired invitation |
| POST | `/v1/auth/staff/login` | Staff email + password + a Turnstile token. Checks `account_lockouts`, writes `auth_attempts`, then signs in against Supabase Auth (passing the Turnstile token through, since it is single-use) and returns the AAL1 session |
| POST | `/v1/auth/staff/mfa/verify` | TOTP code for the pending factor. Same lockout and `auth_attempts` treatment, then raises the session to AAL2 |
| POST | `/v1/auth/student/login` | Centre code + username + PIN **or** password (per `students.auth_method`); lockout-checked, writes `auth_attempts`; mints a Supabase session via the admin API |
| POST | `/v1/auth/student/claim` | Public claim page: claim code → set PIN/password (and under-13 guardian consent) → marks the claim `claimed` |
| POST | `/v1/auth/guardian-approvals` | Issue a guardian magic link for an under-13 action (mechanism, not a role) |
| POST | `/v1/auth/guardian-approvals/:token/confirm` | Guardian confirms; unlocks the pending action, records consent |
| POST | `/v1/admin/accounts` | Superadmin: provision account + owner + first centre in one transaction |
| POST | `/v1/admin/accounts/:id/suspend` | Superadmin: suspend an account; audited |
| POST | `/v1/admin/accounts/:id/restore` | Superadmin: lift a suspension; audited |

> **Staff authentication is email + password with mandatory TOTP MFA** (decision #20), and both steps go through the two endpoints above. Supabase's password- and MFA-verification Auth hooks would be the natural home for lockouts, but they need the Supabase Team plan, so the API owns that logic instead: it records every attempt in `auth_attempts`, enforces `account_lockouts`, and only then calls Supabase Auth. Supabase Auth additionally requires a Cloudflare Turnstile token, so attempts that skip the API are throttled at the source. Password reset uses Supabase's email reset link. Magic links exist only as the guardian-approval mechanism; there is no staff magic-link or SMS OTP login.

#### Files (R2)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/v1/files/sign-upload` | Permission + pooled-quota check → presigned PUT URL + pending files row |
| POST | `/v1/files/:id/confirm` | Verify the object, record true size, update the storage rollup |
| POST | `/v1/files/:id/sign-download` | Permission check (entity links **and** `resource_can_open` for resource files) → short-lived presigned GET URL |
| DELETE | `/v1/files/:id` | Refuses `archive`/`locked` categories; otherwise deletes the R2 object, tombstones the row, adjusts the rollup |

#### Calendar

| Method | Endpoint | Description |
|---|---|---|
| GET | `/v1/calendar/:token.ics` | The caller's own timetable as an iCalendar feed, subscribable from a phone or desktop calendar. The token is `profiles.calendar_token` — **the URL is the credential**, so it is unguessable, rotatable (`rotate_calendar_token`) and scoped to one person. Because a calendar client sends no session, the feed carries only session times, titles and rooms: never pupil names, never marks, never anything a lost phone should not show |

#### Invoicing

| Method | Endpoint | Description |
|---|---|---|
| POST | `/v1/invoices/:id/pdf` | Render the invoice PDF, store to R2, return a file reference |
| POST | `/v1/invoices/:id/send` | Email the invoice to the billing guardian with the PDF attached. Fails with `no_billing_email` when there is no address; refuses within `reminder_cooldown_hours` of the last send (writes `invoice_reminders`) |
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
| POST | `/v1/student-claims/batches/:id/slips` | Render a claim-slip batch PDF via the files pipeline |

> **Server-rendered vs browser-print.** Server-rendered (stored to R2, emailable): invoices, published student reports, claim slips. **Browser print** (no endpoint, nothing stored): the timesheet print view and the centre analytics report. The student's upcoming-sessions **ICS export** is generated client-side from the sessions they can already read — no calendar feed endpoint.

#### Billing (Klasio's own)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/v1/billing/checkout` | Stripe Checkout session for a plan and billing cycle, at account level; only plans whose `audience` matches `accounts.kind` |
| POST | `/v1/billing/portal` | Stripe customer portal link for the account owner |
| POST | `/v1/billing/pause` | Pause collection between two dates (seasonal pause); resumes automatically |
| POST | `/v1/webhooks/stripe` | Idempotent webhook receiver → syncs the subscriptions mirror and appends `billing_events` |

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
| `provision_account(payload)` | Account (centre or solo) + owner + first centre + domain settings rows in one transaction — shared by `/v1/auth/signup` and the superadmin console | yes |
| `set_account_plan(account, plan)` | Change plan; reconciles with Stripe; refuses a plan whose `audience` doesn't match the account kind | yes |
| `update_feature_flag(key, patch)` | Enable/disable, rollout %, scope, targeting | yes |
| `update_platform_settings(patch)` | Maintenance, read-only, signups, status page, trial offer, defaults | yes |
| `manage_plan_code(payload)` / `redeem_plan_code(subscription, code)` | Create/deactivate override codes; redeem against a subscription (validates max_redemptions, logs redemption) | yes |
| `start_support_session(account, centre?, support_ref, reason, ttl)` | Time-boxed (≤ 60 min) impersonation tied to a support email reference; visible to the tenant. Safeguarding-sensitive | yes |
| `end_support_session(session)` | End early | yes |
| `clear_lockout(identifier)` / `block_identifier(identifier, reason)` | Security console actions | yes |
| `update_data_request(request, status, note)` | Progress a SAR/erasure; extension requires a reason | yes |

#### Account owner

| Function | Description | Audited |
|---|---|---|
| `create_centre(payload)` | New centre under the account | yes |
| `invite_member(centre, email, role)` | Staff invitation | yes |
| `set_member_role(membership, role)` | Role change (add/remove membership rows — multi-role) | yes |
| `set_dsl_role(membership, lead\|deputy\|null)` | Assign/clear DSL lead or deputy; one lead per centre enforced | yes |
| `transfer_ownership(account, profile)` | Grant the incoming owner a `centre_admin` membership if they lack one, then repoint `accounts.owner_profile_id` — in one transaction, in that order, so ownership is never held by someone RLS cannot see. New owner must exist with their own identity + MFA first; never swap credentials | yes |

#### Centre admin

| Function | Description | Audited |
|---|---|---|
| `enrol_student(class, student, starts_on)` | Capacity, duplicate and `plan_limit(max_students)` checks, then enrol | — |
| `withdraw_enrolment(enrolment, ends_on)` | End-date; history preserved | — |
| `set_active_term(centre, term)` | Single write for term context | — |
| `rotate_calendar_token()` | Issue the caller a new `profiles.calendar_token`, revoking every existing `.ics` subscription — the "I lost my phone" action | — |
| `regenerate_sessions(class)` | Rebuild future sessions, skipping term breaks | — |
| `set_class_cover(class, teacher, starts_on, ends_on, reason)` | Assign temporary cover; effective teacher derives per session date | yes |
| `decide_class_change_request(request, actioned\|declined, note)` | Close a teacher's change request | yes |
| `offer_waiting_list_place(entry)` | Move a waiting-list entry to `offered` / `enrolled` | — |
| `publish_announcement(announcement)` | Resolve targets into receipts; refuses an unapproved teacher announcement under `approval_workflow` | — |
| `approve_announcement(announcement)` | Approve a `pending_approval` announcement (then publishes) | yes |
| `generate_invoices(centre, period)` | Draft one invoice per family from delivered sessions × `classes.hourly_rate` for families not already invoiced for the period | — |
| `issue_invoice(invoice)` | Allocate number, snapshot totals, set `issued_at`; enforces `plan_limit(max_invoices_per_month)`; auto-sends when configured | yes |
| `send_invoice_reminder(invoice)` | Cooldown-checked reminder via the outbox | — |
| `record_payment(invoice, amount, method, paid_on)` | The manual payment toggle | yes |
| `reverse_payment(payment, reason)` | Withdraw a receipt entered in error — stamps `reversed_at` / `reversed_by` / `reversal_reason`; never deletes or edits the row. Reason required | yes |
| `void_invoice(invoice, reason)` | Void; number never reused | yes |
| `set_staff_rate(profile, rate)` | New pay rate | yes |
| `update_privacy_settings(centre, patch)` | Change `teacher_reads_health`, `show_rank_to_students` or `rank_min_age` on `centre_privacy_settings` | yes |
| `update_my_staff_profile(patch)` | A staff member edits their own contact fields on `staff_details`; pay, employment and notes are untouched | — |
| `approve_timesheet(entry)` / `adjust_timesheet(entry, delta)` | Pay approval + adjustment | yes |
| `amend_attendance(record, status, reason)` | Correct a register mark within `amendment_hours`; writes `attendance_amendments` | yes |
| `grant_unlock(session, {hours\|until_eod\|expires_at}, note?)` | Time-boxed reopen of a locked/lapsed register; writes `register_unlocks`. `note` required when granting on your own session (solo) | yes |
| `revoke_unlock(unlock_id)` | Cancel an active unlock grant before it's used | yes |
| `release_restricted_to_centre(staff)` | Offboarding: flip that staff member's `on_request` resources to `centre`. Ownership is never reassigned | yes |

#### Teacher

| Function | Description | Audited |
|---|---|---|
| `submit_register(session, entries, {note, delivered_by, delivered_minutes})` | Keystone: attendance + session confirmation (`register_late`/`note`/`by_admin`/`delivered_by`) + timesheet derivation for the delivering adult; consumes any active unlock grant; refuses a late submission without a note when required | yes |
| `log_timesheet_entry(type, minutes, date, note)` | Manual non-teaching work (prep/marking/meeting/training/cover/other); `teaching` type rejected | — |
| `request_class_change(class, kind, body)` | Opens a `class_change_requests` row for the admin queue | yes |
| `create_assignment(payload)` / `assign_homework(...)` | Assignment + questions + targets | — |
| `release_marks(assignment, submissions[]?)` | Set `marks_released_at` (and status `returned`) for held-back marks | — |
| `record_result(assessment, student, marks)` / `publish_results(assessment)` | Enter and publish grades | — |
| `set_student_target(student, subject, predicted?, target?)` | Upsert `student_targets` | yes |
| `publish_report(report)` | Enforces `centre_report_settings` standards (comment length, signature, required sections) server-side; snapshots `predicted_grade`; locks content, renders PDF, queues guardian email | yes |
| `archive_report(report)` | `published → archived` (author when `perm_archive`, or centre_admin) | yes |
| `start_conversation(kind, participants)` | Preset-checked; stamps `monitored`; attaches DSL observers per `comms_settings.dsl_observer` | — |
| `post_to_class(class, body)` | Class stream post; permission from `class_settings` | — |
| `raise_concern(student, summary)` | Open a safeguarding_incident from any context | yes |

#### Resources

| Function | Description | Audited |
|---|---|---|
| `share_resource(resource, staff[])` / `unshare_resource(resource, staff)` | Idempotent grant / revoke | — |
| `request_access(resource, note)` | One pending request per person per resource | — |
| `decide_access_request(request, approved\|declined)` | Approve inserts the share in the same transaction | yes |
| `attach_resource(resource, context_type, context_id, {student_visible, visible_from})` | Creates the link **and** the usage event | — |
| `detach_resource(link)` | Removes the pointer; the usage event stays | — |
| `update_resource_link(link, patch)` | Flip `student_visible` / set `visible_from` | — |
| `admin_open_resource(resource)` | The audited override path; writes `resource_access_log` | yes |

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
| `start_homework(assignment)` | Refuses before `available_from`, after `due_at` unless `allow_late`, and beyond `attempts_allowed`; sets `started_at`, increments `attempt_count` | — |
| `submit_homework(submission)` | Lock answers, snapshot `is_late`, auto-mark objective types (deterministic comparison), queue the rest | — |
| `acknowledge_announcement(announcement)` | Idempotent ack | — |
| `acknowledge_report(report)` | Idempotent ack of a published report | — |

---

### Supabase client (PostgREST) — generated, not listed

Everything not above is direct table access through the Supabase client, authorised by RLS: reading classes, students, invoices, dashboard metric views; updating profiles; marking notifications read.

The key case worth noting: **sending a message is a plain `INSERT` into `messages`**. RLS verifies the sender is a participant, one trigger runs the flag scan, another broadcasts over Realtime — no endpoint, no RPC, and the safeguarding pipeline cannot be bypassed because it lives below the API entirely.
