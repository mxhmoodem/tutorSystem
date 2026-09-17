# Klasio Docs Audit — Table by table

Every table in the reference with all its documented columns and its four policy cells, the prototype store that stands in for it, fields the prototype keeps that the doc omits, and findings. 62 of 114 tables have something to fix.

Source artifact: https://claude.ai/artifact/REbNbHtBH5hPeNy3BtzwpY  
All 114 tables are expanded below — nothing is collapsed. Anchors match the artifact's `#t-<table>` deep links.

## Contents

- **§1 Tenancy & identity** — 17 tables · 11 with something to fix
  - [`accounts`](#t-accounts), [`centres`](#t-centres), [`profiles`](#t-profiles), [`memberships`](#t-memberships), [`students`](#t-students), [`student_guardians`](#t-student-guardians), [`families`](#t-families), [`emergency_contacts`](#t-emergency-contacts), [`student_health`](#t-student-health), [`consents`](#t-consents), [`invitations`](#t-invitations), [`student_claims`](#t-student-claims), [`student_claim_batches`](#t-student-claim-batches), [`import_drafts`](#t-import-drafts), [`guardian_approvals`](#t-guardian-approvals), [`auth_attempts`](#t-auth-attempts), [`account_lockouts`](#t-account-lockouts)
- **§2 Academic** — 21 tables · 12 with something to fix
  - [`subjects`](#t-subjects), [`terms`](#t-terms), [`term_breaks`](#t-term-breaks), [`rooms`](#t-rooms), [`class_dimensions`](#t-class-dimensions), [`classes`](#t-classes), [`class_settings`](#t-class-settings), [`class_posts`](#t-class-posts), [`class_post_comments`](#t-class-post-comments), [`class_change_requests`](#t-class-change-requests), [`tags`](#t-tags), [`taggables`](#t-taggables), [`waiting_list_entries`](#t-waiting-list-entries), [`class_schedules`](#t-class-schedules), [`sessions`](#t-sessions), [`centre_register_settings`](#t-centre-register-settings), [`enrolments`](#t-enrolments), [`attendance_records`](#t-attendance-records), [`register_unlocks`](#t-register-unlocks), [`attendance_amendments`](#t-attendance-amendments), [`class_cover`](#t-class-cover)
- **§3 Grades & assessment** — 5 tables · 2 with something to fix
  - [`grade_scales`](#t-grade-scales), [`grade_bands`](#t-grade-bands), [`assessments`](#t-assessments), [`results`](#t-results), [`student_targets`](#t-student-targets)
- **§4 Staff & pay** — 5 tables · 2 with something to fix
  - [`staff_details`](#t-staff-details), [`staff_rates`](#t-staff-rates), [`timesheet_entries`](#t-timesheet-entries), [`centre_timesheet_policy`](#t-centre-timesheet-policy), [`timesheet_adjustments`](#t-timesheet-adjustments)
- **§5 Homework** — 6 tables · 3 with something to fix
  - [`assignment_folders`](#t-assignment-folders), [`assignments`](#t-assignments), [`assignment_targets`](#t-assignment-targets), [`questions`](#t-questions), [`submissions`](#t-submissions), [`answers`](#t-answers)
- **§6 Student reports & teacher feedback** — 8 tables · 5 with something to fix
  - [`report_rules`](#t-report-rules), [`centre_report_settings`](#t-centre-report-settings), [`report_templates`](#t-report-templates), [`rating_scales`](#t-rating-scales), [`rating_levels`](#t-rating-levels), [`reports`](#t-reports), [`report_folders`](#t-report-folders), [`report_user_state`](#t-report-user-state)
- **§7 Tracking & lesson planning** — 4 tables · 4 with something to fix
  - [`trackers`](#t-trackers), [`tracker_columns`](#t-tracker-columns), [`tracker_entries`](#t-tracker-entries), [`lesson_plans`](#t-lesson-plans)
- **§8 Invoicing (ledger-only)** — 8 tables · 4 with something to fix
  - [`centre_invoice_settings`](#t-centre-invoice-settings), [`fee_plans`](#t-fee-plans), [`invoice_sequences`](#t-invoice-sequences), [`invoices`](#t-invoices), [`invoice_lines`](#t-invoice-lines), [`payment_schedules`](#t-payment-schedules), [`payments`](#t-payments), [`invoice_reminders`](#t-invoice-reminders)
- **§9 Communications** — 12 tables · 6 with something to fix
  - [`comms_settings`](#t-comms-settings), [`announcements`](#t-announcements), [`announcement_targets`](#t-announcement-targets), [`announcement_receipts`](#t-announcement-receipts), [`conversations`](#t-conversations), [`conversation_participants`](#t-conversation-participants), [`messages`](#t-messages), [`message_flags`](#t-message-flags), [`flag_rules`](#t-flag-rules), [`safeguarding_incidents`](#t-safeguarding-incidents), [`safeguarding_incident_notes`](#t-safeguarding-incident-notes), [`safeguarding_escalation_contacts`](#t-safeguarding-escalation-contacts)
- **§10 Files & storage** — 4 tables · 2 with something to fix
  - [`files`](#t-files), [`file_links`](#t-file-links), [`storage_rollups`](#t-storage-rollups), [`storage_addons`](#t-storage-addons)
- **§11 Platform & operations** — 18 tables · 10 with something to fix
  - [`centre_settings`](#t-centre-settings), [`audit_log`](#t-audit-log), [`user_preferences`](#t-user-preferences), [`dashboard_layouts`](#t-dashboard-layouts), [`notifications`](#t-notifications), [`notification_prefs`](#t-notification-prefs), [`plans`](#t-plans), [`subscriptions`](#t-subscriptions), [`plan_codes`](#t-plan-codes), [`plan_code_redemptions`](#t-plan-code-redemptions), [`feature_flags`](#t-feature-flags), [`platform_settings`](#t-platform-settings), [`support_sessions`](#t-support-sessions), [`billing_events`](#t-billing-events), [`data_requests`](#t-data-requests), [`processed_events`](#t-processed-events), [`email_outbox`](#t-email-outbox), [`email_suppressions`](#t-email-suppressions)
- **§12 Resources (Materials library)** — 6 tables · 1 with something to fix
  - [`resources`](#t-resources), [`resource_shares`](#t-resource-shares), [`resource_access_requests`](#t-resource-access-requests), [`resource_links`](#t-resource-links), [`resource_usage_events`](#t-resource-usage-events), [`resource_access_log`](#t-resource-access-log)

---

## §1 Tenancy & identity

*17 tables · 11 with something to fix*

<a id="t-accounts"></a>
### `accounts`

`10 columns` · `1 medium` · `3 undocumented` · `Partly modelled`

The billing tenant — one paying organisation, may hold many centres.

**Prototype stand-in**

`tutoros.subscription.v2` (ONB_SUBSCRIPTION) · `SA_ACCOUNTS` (superadmin mock) · `STORAGE_ACCOUNTS_SEED`

**Findings**

- **Medium** — `accounts.status` uses `trial` while `subscriptions.status` uses `trialing`
- **Low** — `accounts.plan` is a denormalised plan code — invites the plan-code comparisons decision #25 forbids
- **Low** — `kind`, `slug`, `storage_policy` not modelled; storage mode lives in `tutoros.storage.v1` as `pooled | per_centre` with per-plan defaults

**In the prototype, not in the reference**

- `billing.company`, `billing.vat`, `billing.address` — the Billing details tab edits an account billing profile; only `billing_email` exists in the reference
- `country` on every SA account (UK, IE, SE, FR, GR, ES, DE, AE) — the reference assumes UK (GBP, VAT, Europe/London) and has no country
- Ownership is `subscription.ownerUserId` keyed by email (permissions.jsx:95) — matches decision #16 in spirit

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | gen_random_uuid() |
| `name` | text | Organisation name |
| `slug` | text UNIQUE | URL-safe identifier |
| `kind` | text | `centre` \| `solo` — a solo private-tutor account owns exactly one implicit centre and is sold `plans.audience = 'solo'` plans. Immutable after creation |
| `owner_profile_id` | uuid FK NOT NULL | → profiles.id — **the single source of ownership.** Not a membership role; `transfer_ownership` repoints this one field |
| `plan` | text | Denormalised current plan code (mirrors subscriptions) |
| `storage_policy` | text | `pooled` \| `split` — how the account quota is shared across centres (always `pooled` for solo) |
| `status` | text | `trial` \| `active` \| `past_due` \| `suspended` \| `cancelled` |
| `billing_email` | text | Where Klasio billing goes |
| `created_at` | timestamptz | default now() |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | superadmin; own account (auth_account_id) |
| INSERT | superadmin |
| UPDATE | superadmin; account_owner (own) |
| DELETE | superadmin |

<a id="t-centres"></a>
### `centres`

`13 columns` · `2 undocumented` · `Prototype models it`

A physical tuition centre under an account. The primary RLS boundary.

**Prototype stand-in**

`tutoros.subscription.v2` centres[] · `CENTRE_PROFILES` (mocks/centreProfile.mock.jsx)

**Findings**

- **Low** — `is_implicit` and `timezone` not modelled (solo demo is a separate shell, not an implicit centre)

**In the prototype, not in the reference**

- Centre contact `email` (onboarding.mock.jsx:81) — no column; only `centre_settings.branding` holds a contact block
- `logo` (initials) and `brandAccent` on the profile record

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `account_id` | uuid FK | → accounts.id |
| `name` | text |  |
| `slug` | text | Unique within account |
| `code` | text UNIQUE | Centre login code — students log in with centre-code + username + PIN/password |
| `is_primary` | boolean | The account's primary centre (partial unique index: one per account) — default selection in the centre switcher |
| `is_implicit` | boolean | default false — true only for a solo account's single centre; never rendered as a "centre" in the UI |
| `region` | text NULL | Grouping label for multi-centre accounts |
| `accent` | text NULL | Per-centre brand accent (token reference); falls back to `centre_settings.branding` |
| `address_line1 / line2 / city / postcode` | text | Postal address |
| `phone` | text |  |
| `timezone` | text | default `'Europe/London'` — drives session local-time logic |
| `status` | text | `active` \| `archived` |

Register timing lives in `centre_register_settings`; VAT, tax mode and invoice defaults in `centre_invoice_settings` (§8). Both rows are created with the centre.

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | superadmin; members of the account |
| INSERT | superadmin; account_owner |
| UPDATE | superadmin; account_owner; centre_admin (own centre) |
| DELETE | superadmin; account_owner |

<a id="t-profiles"></a>
### `profiles`

`6 columns` · `1 medium` · `2 undocumented` · `Partly modelled`

One row per authenticated user (staff and students). PK equals auth.users.id.

**Prototype stand-in**

`settings_store_v1[role].account` · teacher/student records in `admin_store_v4` · `COMMS_USERS`

**Findings**

- **Medium** — Same people carry several ids across stores (`t1` / `t_clarke` / `u_sarah`; `s2` / `s_oliver` / `u_oliver`) — no single profile id

**In the prototype, not in the reference**

- `displayName` (settings.mock.jsx:25) — no `display_name` column
- `twoFactor` per-user toggle, default off for admin + teacher (settings.mock.jsx:42, 72) — optional 2FA vs mandatory TOTP (decision #20)

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | = auth.users.id |
| `full_name` | text |  |
| `email` | text | Nullable for PIN-only student accounts |
| `phone` | text |  |
| `avatar_file_id` | uuid FK | → files.id |
| `locale` | text | default `'en-GB'` |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | self; staff in a shared centre; superadmin |
| INSERT | self (on signup); admin (invite flow) |
| UPDATE | self; centre_admin for managed users |
| DELETE | superadmin |

<a id="t-memberships"></a>
### `memberships`

`8 columns` · `1 high` · `2 medium` · `3 undocumented` · `Prototype models it`

Links a profile to a centre with a role. The spine of all RLS role checks. **Multi-role by design**: a person holds more than one role via more than one row (e.g. admin + teacher at the same centre — the dual-role view switch is built on this).

**Prototype stand-in**

`ONB_MEMBERSHIPS` rows `{email, centreId, role}` in `tutoros.onboarding.v2::<centre>`; grouped by `membersForCentre` (permissions.jsx:67)

**Findings**

- **Medium** — Role value `admin` vs reference `centre_admin`; no `status`; students are not membership rows
- **High** — DSL lead/deputies are stored on comms config (`dslLeadId`, `dslDeputyIds`), not on memberships — contradicts decision #15
- **Medium** — Doc: which of a multi-role person's rows carries `dsl_role`, and no CHECK that DSL is staff-only

**In the prototype, not in the reference**

- Guardrail: the account owner must remain an Admin (permissions.jsx:127–129)
- Guardrail: a centre must keep at least one Admin (permissions.jsx:131)
- Teacher memberships back-filled once from the roster (`rosterSeeded`, onboarding.mock.jsx:157)

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `profile_id` | uuid FK | → profiles.id |
| `centre_id` | uuid FK | → centres.id |
| `account_id` | uuid FK | Denormalised for RLS |
| `role` | text | `centre_admin` \| `teacher` \| `student` — ownership is **not** a role (see `accounts.owner_profile_id`) |
| `dsl_role` | text NULL | `lead` \| `deputy` — Designated Safeguarding Lead capability. Partial unique index: at most one `lead` per centre |
| `status` | text | `active` \| `suspended` |
| `UNIQUE` | (profile_id, centre_id, role) | Allows multi-role; role checks are `EXISTS` over rows, never equality on a single row |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | self; centre_admin/owner in that centre |
| INSERT | account_owner; centre_admin |
| UPDATE | account_owner; centre_admin (role + dsl_role changes audited) |
| DELETE | account_owner; centre_admin |

<a id="t-students"></a>
### `students`

`11 columns` · `1 critical` · `1 medium` · `5 undocumented` · `Partly modelled`

Student-specific extension of a profile, including daily login credentials.

**Prototype stand-in**

`admin_store_v4.students` (SEED_STUDENTS, mocks/adminPages.mock.jsx:90)

**Findings**

- **Medium** — Stored `status: 'at-risk'` (divergence already listed)
- **Low** — `setupMethod` values `pin | password | self-set | pending` vs reference `claim_slip | admin_set_pin | self_set`
- **Low** — "CHECK against dob" is time-dependent; Postgres treats CHECK as immutable — use a trigger/RPC, and define behaviour when DOB is unknown
- **Critical** — Matrix SELECT "centre staff" lets every teacher read every student; the prototype scopes teachers to their own classes (teacherMetrics.jsx:79) and `is_my_student()` is unused

**In the prototype, not in the reference**

- `address` — student home address; no column anywhere in the reference
- `subjects[]`, `teacher` (free text), `lastSeen` stored on the record
- `attendance`, `hw`, `score` stored rollups (derive-don't-store)
- `account.underThirteen` stored; inferred from year group when DOB is missing (Onboarding.jsx:182)
- `account.dailyMethod`, `account.pinSet`

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `profile_id` | uuid PK FK | → profiles.id |
| `account_id / centre_id` | uuid FK |  |
| `student_ref` | text | Human-facing reference |
| `dob` | date | Drives under-13 AADC treatment |
| `year_group` | text |  |
| `enrolment_status` | text | `prospective` \| `active` \| `left` |
| `family_id` | uuid FK NULL | → families.id — sibling grouping for family billing |
| `username` | text | Unique within centre; combined with `centres.code` at login |
| `auth_method` | text | `pin` \| `password` — **under-13s are always `pin`** (CHECK against `dob`). QR-badge login is not supported (decision #21) |
| `pin_hash` | text NULL | Argon2 hash — never the raw PIN. Set when `auth_method = 'pin'` |
| `notes` | text NULL | Free-text staff notes on the student (staff-only read) |

Password credentials for `auth_method = 'password'` live in Supabase Auth against the student's synthetic email — never in this table. **At-risk is derived, never stored** (`v_student_risk`); there is no stored `at-risk` status.

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre staff; the student (self); superadmin |
| INSERT | centre_admin |
| UPDATE | centre_admin; teacher (limited fields) |
| DELETE | centre_admin |

<a id="t-student-guardians"></a>
### `student_guardians`

`9 columns` · `1 critical` · `1 undocumented` · `Partly modelled`

Guardian as a DATA ENTITY and email recipient. No login, not a role.

**Prototype stand-in**

Flat `guardianName / guardianRelation / guardianEmail / guardianPhone` on the student (one guardian); solo adds `g2`

**Findings**

- **Critical** — SELECT "centre staff; superadmin" exposes every guardian's email/phone to every teacher and to superadmin outside a support session

**In the prototype, not in the reference**

- Imports write `guardianRelation: 'Parent'` (Onboarding.jsx:765, 945) — not in `mother | father | carer | other`

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `student_id` | uuid FK | → students.profile_id |
| `account_id / centre_id` | uuid FK |  |
| `full_name` | text |  |
| `relationship` | text | `mother` \| `father` \| `carer` \| `other` |
| `email / phone` | text | Contact + comms destination |
| `is_primary` | boolean |  |
| `is_billing_contact` | boolean | Receives invoices |
| `receives_comms` | boolean | Announcement/notification opt-in |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre staff; superadmin |
| INSERT | centre_admin |
| UPDATE | centre_admin |
| DELETE | centre_admin |

<a id="t-families"></a>
### `families`

`5 columns` · `Partly modelled`

Sibling grouping — the billing unit. One invoice per family, not per student.

**Prototype stand-in**

`SEED_FAMILIES` inside `tutoros.invoices.v1` `{id, name, parent, email, phone, studentIds[]}` · solo `family` key

**Findings**

- **Low** — Divergence already listed (no `family_id` on the roster)

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `account_id / centre_id` | uuid FK |  |
| `name` | text | e.g. "The Ahmed family" |
| `billing_guardian_id` | uuid FK NULL | → student_guardians.id — explicit invoice recipient; falls back to the primary billing-contact guardian of the eldest student |
| `created_at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre staff; student (own family) |
| INSERT | centre_admin |
| UPDATE | centre_admin |
| DELETE | centre_admin |

<a id="t-emergency-contacts"></a>
### `emergency_contacts`

`6 columns` · `1 high` · `No prototype stand-in`

Special-category-adjacent. Tight RLS, centre-admin/DSL only.

**Prototype stand-in**

None — nothing in the prototype plays this role.

**Findings**

- **High** — Table note says "centre-admin/DSL only" but the matrix SELECT also grants "teacher (view own students only)"

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `student_id` | uuid FK |  |
| `account_id / centre_id` | uuid FK |  |
| `name / relationship / phone` | text |  |
| `priority` | int | Call order |
| `notes` | text |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre_admin; is_dsl; teacher (view own students only) |
| INSERT | centre_admin |
| UPDATE | centre_admin |
| DELETE | centre_admin |

<a id="t-student-health"></a>
### `student_health`

`9 columns` · `1 critical` · `1 medium` · `Partly modelled`

SPECIAL CATEGORY DATA (UK GDPR Art. 9). Strictest RLS + full audit.

**Prototype stand-in**

Centre app: none · solo mock free-text `allergies`, `sen` on the student (mocks/solo.mock.jsx:47, 53)

**Findings**

- **Critical** — Teacher access depends on `centre_settings.features.teacher_reads_health` — a jsonb "presentation" key with unaudited admin UPDATE (breaks decision #33)
- **Medium** — Plan coverage-gap text "no SEN/EHCP, allergies" is outdated for the solo demo

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `student_id` | uuid PK FK |  |
| `account_id / centre_id` | uuid FK |  |
| `allergies / medical_conditions / medications` | text |  |
| `sen_status` | text | SEN / EHCP indicator |
| `ehcp_ref` | text |  |
| `dietary` | text |  |
| `notes` | text |  |
| `updated_by` | uuid FK | Who last edited |
| `updated_at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre_admin; is_dsl only (teacher only if centre setting allows) |
| INSERT | centre_admin |
| UPDATE | centre_admin (audited) |
| DELETE | centre_admin |

<a id="t-consents"></a>
### `consents`

`9 columns` · `1 medium` · `1 undocumented` · `Partly modelled`

Consent records, captured by magic-link or recorded by admin.

**Prototype stand-in**

`account.consentRecorded` boolean (centre) · solo `photoConsent`, `dataConsent` dates

**Findings**

- **Medium** — SELECT includes "superadmin" — contradicts the Phase 14 test that superadmin sees nothing outside a support session

**In the prototype, not in the reference**

- Consent is one checkbox on the under-13 claim page (Onboarding.jsx:1584) — no method/evidence/type recorded

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `student_id` | uuid FK |  |
| `account_id / centre_id` | uuid FK |  |
| `consent_type` | text | `data_processing` \| `photo` \| `trip` |
| `granted` | boolean |  |
| `granted_by_name` | text | Guardian who consented |
| `method` | text | `magic_link` \| `admin_recorded` |
| `evidence_token` | text | Link token used, for audit |
| `granted_at / expires_at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre staff; superadmin |
| INSERT | centre_admin; system (magic-link) |
| UPDATE | centre_admin |
| DELETE | centre_admin |

<a id="t-invitations"></a>
### `invitations`

`8 columns` · `2 undocumented` · `Partly modelled`

Staff invitations by email; token-based acceptance.

**Prototype stand-in**

Teacher `account{status:'invited', setupMethod, inviteToken, invitedOn, activatedOn}`

**Findings**

- **Low** — RPC `invite_member` and endpoint `POST /v1/invites` both "create a staff invitation" — say which owns it

**In the prototype, not in the reference**

- `employmentType` and `subject` captured at invite time (Onboarding.jsx:553)
- Invite tokens never expire in the prototype

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `account_id / centre_id` | uuid FK |  |
| `email` | text |  |
| `role` | text | Role to grant on acceptance |
| `token_hash` | text |  |
| `invited_by` | uuid FK |  |
| `status` | text | `pending` \| `accepted` \| `expired` \| `revoked` |
| `expires_at / accepted_at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre_admin; account_owner |
| INSERT | centre_admin; account_owner |
| UPDATE | centre_admin (revoke) |
| DELETE | centre_admin |

<a id="t-student-claims"></a>
### `student_claims`

`11 columns` · `3 undocumented` · `Prototype models it`

Student account provisioning — a different shape from staff invitations. Students are provisioned with a claim code + synthetic email and handed a printable slip; no email is sent.

**Prototype stand-in**

Student `account{username, syntheticEmail, claimCode, status, setupMethod, createdVia, provisionedOn, claimedOn, underThirteen, consentRecorded}`

**Findings**

- **Low** — Status vocabulary `pending | invited | active` vs `pending | claimed | expired | revoked`

**In the prototype, not in the reference**

- Under-13 claims route to a parent link (`status:'invited'`); 13+ are `pending` (Onboarding.jsx:276)
- PIN is 6 digits (Onboarding.jsx:1525) though one label says "4-digit"; PIN format is unspecified in the reference
- QR sign-in option on both claim pages (divergence already listed)

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `student_id` | uuid FK | → students.profile_id |
| `account_id / centre_id` | uuid FK |  |
| `batch_id` | uuid FK NULL | → student_claim_batches.id — the print run this slip belongs to |
| `claim_code` | text UNIQUE | Short human-typeable code on the slip |
| `synthetic_email` | text | Generated placeholder for the auth record |
| `setup_method` | text | `claim_slip` \| `admin_set_pin` \| `self_set` (student or guardian chose PIN/password on the public claim page) |
| `status` | text | `pending` \| `claimed` \| `expired` \| `revoked` |
| `consent_recorded` | boolean | Under-13 claim: guardian consent captured on the claim page (writes a `consents` row) |
| `printed_at / claimed_at / expires_at` | timestamptz | Slip PDF rendered via the files pipeline |
| `created_by` | uuid FK |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre_admin |
| INSERT | centre_admin |
| UPDATE | system (claim); centre_admin (revoke) |
| DELETE | centre_admin |

<a id="t-student-claim-batches"></a>
### `student_claim_batches`

`5 columns` · `Partly modelled`

One provisioning run — so a set of slips is reprintable as a set rather than reconstructed by date.

**Prototype stand-in**

Onboarding `lastBatch[]` — only the most recent batch, reprintable

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `account_id / centre_id` | uuid FK |  |
| `created_by` | uuid FK |  |
| `source` | text | `csv` \| `single` |
| `created_at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre_admin |
| INSERT | centre_admin |
| UPDATE | centre_admin (own drafts) |
| DELETE | centre_admin |

<a id="t-import-drafts"></a>
### `import_drafts`

`6 columns` · `Prototype models it`

Auto-saved in-progress CSV paste for student provisioning, restored when the admin returns.

**Prototype stand-in**

Onboarding `importDraft {text, parsedAt}`

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `account_id / centre_id` | uuid FK |  |
| `created_by` | uuid FK | One live draft per (centre, creator) |
| `payload` | text | Raw pasted CSV |
| `parsed_at` | timestamptz NULL |  |
| `updated_at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre_admin |
| INSERT | centre_admin |
| UPDATE | centre_admin (own drafts) |
| DELETE | centre_admin |

<a id="t-guardian-approvals"></a>
### `guardian_approvals`

`8 columns` · `No prototype stand-in`

Magic-link MECHANISM (not a role) for under-13 actions: PIN reset, consent.

**Prototype stand-in**

Only the under-13 consent screen (ParentClaim, Onboarding.jsx:1554)

**Findings**

- **Low** — Coverage gap already listed

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `student_id` | uuid FK |  |
| `account_id / centre_id` | uuid FK |  |
| `action_type` | text | `pin_reset` \| `consent` |
| `token_hash` | text |  |
| `status` | text | `pending` \| `confirmed` \| `expired` |
| `guardian_email` | text | Destination |
| `confirmed_at / expires_at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre_admin; system |
| INSERT | centre_admin; system |
| UPDATE | system (confirm) |
| DELETE | — |

<a id="t-auth-attempts"></a>
### `auth_attempts`

`8 columns` · `Partly modelled`

Every login attempt, staff and student. The input to lockouts, rate limiting and the security console — decision #14 ("Postgres owns rate limiting and lockouts") lives here.

**Prototype stand-in**

`SA_SUSPICIOUS {email, attempts, ip, country, time, status}` — pre-aggregated, static

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `identifier` | text | Staff email, or `centre_code:username` for students — indexed with `at` |
| `account_id / centre_id` | uuid FK NULL | Resolved when the identifier is known |
| `ip` | inet |  |
| `country` | text NULL | Derived from the IP at write time |
| `user_agent` | text |  |
| `outcome` | text | `success` \| `bad_credentials` \| `bad_totp` \| `locked` \| `blocked` |
| `at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | superadmin; centre_admin (identifiers resolved to own centre) |
| INSERT | service-role only |
| UPDATE | — (append-only) |
| DELETE | — (retention sweep) |

<a id="t-account-lockouts"></a>
### `account_lockouts`

`7 columns` · `Partly modelled`

An active lock on an identifier. Auto-created after repeated failures; auto-expires; clearable by superadmin.

**Prototype stand-in**

`SA_SUSPICIOUS.status` `locked | blocked | cleared` held in page state (SuperAdmin.jsx:2170)

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `identifier` | text |  |
| `account_id / centre_id` | uuid FK NULL |  |
| `reason` | text | `failed_attempts` \| `manual_block` |
| `attempt_count` | int | Failures in the window that triggered the lock |
| `locked_at / expires_at` | timestamptz | `expires_at NULL` = indefinite (manual block) |
| `cleared_by / cleared_at` | uuid FK / timestamptz | Set by `clear_lockout` |

**Lockout policy:** 10 failed attempts for one identifier inside 15 minutes creates a 30-minute `failed_attempts` lock; student PIN logins lock after 5. Checked by the student login endpoint and by a Supabase Auth hook for staff password + TOTP. The suspicious-activity list is the derived view `v_suspicious_activity` (groups `auth_attempts` over a window) — attempt counts are never stored on the lock row beyond the trigger snapshot. Other rate limits (e.g. invoice reminders) keep their own domain log; there is no generic `rate_limits` table.

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | superadmin; centre_admin (own centre identifiers) |
| INSERT | service-role |
| UPDATE | superadmin via `clear_lockout` / `block_identifier` (audited) |
| DELETE | — |

---

## §2 Academic

*21 tables · 12 with something to fix*

<a id="t-subjects"></a>
### `subjects`

`8 columns` · `Prototype models it`

Taught subjects, each bound to a default grade scale.

**Prototype stand-in**

`admin_store_v4.subjects` `{id, name, level, color, description}`

**Findings**

- **Low** — No `code`, `grade_scale_id` or `active`; the grade scale is resolved from `level` in teacherGrades.jsx; colour is a raw hex, not a token

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `centre_id / account_id` | uuid FK |  |
| `name / code` | text |  |
| `level` | text | e.g. KS3 / GCSE / A-Level |
| `description` | text |  |
| `colour` | text | Brand-token reference, not raw hex |
| `grade_scale_id` | uuid FK | → grade_scales.id |
| `active` | boolean |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre members |
| INSERT | centre_admin |
| UPDATE | centre_admin |
| DELETE | centre_admin |

<a id="t-terms"></a>
### `terms`

`5 columns` · `1 undocumented` · `Partly modelled`

Academic terms. Exactly one `is_active` per centre — the fix for active-term incoherence.

**Prototype stand-in**

`settings_store_v1.admin.centre.terms[]` `{id, name, start, end}`

**Findings**

- **Low** — Active term derived from dates (divergence already listed)

**In the prototype, not in the reference**

- Terms live in a role-keyed settings store, so every centre on an account shares one term list

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `centre_id / account_id` | uuid FK |  |
| `name` | text |  |
| `starts_on / ends_on` | date |  |
| `is_active` | boolean | Partial unique index enforces one true |

**Deliberate exception to derive-don't-store.** "Current term" is a business designation, not a purely temporal fact — date-derivation is ambiguous during half-terms and holidays and caused the incoherence this flag fixes. The stored flag (partial unique index, one true per centre) + the audited `set_active_term` RPC supersede the prototype's `resolveActiveTerm` date-derivation.

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre members |
| INSERT | centre_admin |
| UPDATE | centre_admin |
| DELETE | centre_admin |

<a id="t-term-breaks"></a>
### `term_breaks`

`5 columns` · `No prototype stand-in`

Holiday ranges within a term; session generation skips these.

**Prototype stand-in**

None — nothing in the prototype plays this role.

**Findings**

- **Low** — Coverage gap already listed. Note: the "holidays" in admin_store_v4 are staff leave, not term breaks

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `term_id` | uuid FK |  |
| `account_id / centre_id` | uuid FK |  |
| `name` | text |  |
| `starts_on / ends_on` | date |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre members |
| INSERT | centre_admin |
| UPDATE | centre_admin |
| DELETE | centre_admin |

<a id="t-rooms"></a>
### `rooms`

`5 columns` · `No prototype stand-in`

Physical rooms for scheduling and clash detection. Deferrable for single-room centres.

**Prototype stand-in**

Free-text `room` on the class

**Findings**

- **Low** — Coverage gap already listed

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `centre_id / account_id` | uuid FK |  |
| `name` | text |  |
| `capacity` | int |  |
| `active` | boolean |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre members |
| INSERT | centre_admin |
| UPDATE | centre_admin |
| DELETE | centre_admin |

<a id="t-class-dimensions"></a>
### `class_dimensions`

`6 columns` · `Prototype models it`

Per-centre configurable pick-lists for class setup (year groups, levels, exam boards) with inline add-new in the class form.

**Prototype stand-in**

`admin_store_v4.yearGroups / levels / examBoards` `[{id, name}]` with inline add (AdminPages.jsx:149–151)

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `centre_id / account_id` | uuid FK |  |
| `kind` | text | `year_group` \| `level` \| `exam_board` |
| `name` | text | UNIQUE within (centre_id, kind) |
| `sort_order` | int |  |
| `active` | boolean |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre members |
| INSERT | centre_admin |
| UPDATE | centre_admin |
| DELETE | centre_admin |

<a id="t-classes"></a>
### `classes`

`14 columns` · `1 medium` · `6 undocumented` · `Partly modelled`

A recurring taught class within a term.

**Prototype stand-in**

`admin_store_v4.classes` · solo `SOLO_LESSONS`

**Findings**

- **Medium** — `teacher` is a name string, not an id; `kind` values `one | group` vs `group | one_to_one`
- **Low** — No `term_id` or `hourly_rate` on centre classes; cover divergence already listed

**In the prototype, not in the reference**

- `group` label ("Year 10 – Group A") — no column, yet homework, lesson plans and trackers join on it
- `status: 'paused'` (AdminPages.jsx:2868, teacherMetrics.jsx:74) — reference allows `active | archived`
- Stored `students` count on the class (derive-don't-store)
- `description` on the create-class form (AdminPages.jsx:1492)
- Solo `place` ("Online", "At your home", "Library study room") — a delivery location, not a room
- Solo per-lesson `topic`

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `centre_id / account_id` | uuid FK |  |
| `subject_id` | uuid FK |  |
| `name` | text |  |
| `year_group` | text | Sourced from `class_dimensions` (kind = year_group) |
| `level` | text | Sourced from `class_dimensions` (kind = level) |
| `exam_board` | text | Sourced from `class_dimensions` (kind = exam_board) |
| `teacher_id` | uuid FK | → profiles.id — the permanent teacher; temporary cover lives in `class_cover` and the effective teacher is **derived** |
| `kind` | text | `group` \| `one_to_one` |
| `room_id` | uuid FK |  |
| `term_id` | uuid FK |  |
| `capacity` | int |  |
| `hourly_rate` | numeric NULL | Per-student hourly fee. Drives `generate_invoices` for pay-as-you-go billing (the default for solo accounts); null when the class is billed from `fee_plans` |
| `status` | text | `active` \| `archived` |

Classes carry **tags** through `taggables` (e.g. `GCSE`, `Exam Year`, `Intervention`) — the generic targeting mechanism for report rules. Year group and subject are just two possible tag-like facets; a centre that doesn't use them can tag classes however it likes. There is **no class join code** — enrolment is admin-managed (decision #23).

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre members (students: enrolled only) |
| INSERT | centre_admin |
| UPDATE | centre_admin; teacher (own classes) |
| DELETE | centre_admin |

<a id="t-class-settings"></a>
### `class_settings`

`6 columns` · `1 medium` · `Partly modelled`

Per-class configuration. One row per class, created with the class.

**Prototype stand-in**

`klasio.classBanner.<classId>` (per browser) · post/comment and notification toggles are unsaved React state (TeacherPages.jsx:787–788)

**Findings**

- **Medium** — Banner theme is framed as personal ("how this class looks to you") but the reference makes it one class-wide row

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `class_id` | uuid PK FK |  |
| `account_id / centre_id` | uuid FK |  |
| `banner_theme` | text | `default` (derives from the subject colour) \| `indigo` \| `teal` \| `ocean` \| `forest` \| `sunset` \| `plum` \| `slate` |
| `students_can_post` | boolean | default false |
| `students_can_comment` | boolean | default true |
| `updated_at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | class members |
| INSERT | system (with class) |
| UPDATE | class teacher; centre_admin |
| DELETE | — |

<a id="t-class-posts"></a>
### `class_posts`

`7 columns` · `2 medium` · `Partly modelled`

The class stream — a lightweight per-class feed authored in context. Not a broadcast: no receipts, no acknowledgement, no expiry (that is `announcements`).

**Prototype stand-in**

`klasio.classStream.<classId>` `[{id, author, at, text}]`

**Findings**

- **Medium** — Hard delete vs `deleted_at` soft delete; posts are teacher-only and never reach students
- **Medium** — Doc says the flag-scan trigger runs on class posts, but `message_flags.message_id` can only reference `messages`, and flags arrive in Phase 9 after posts in Phase 5

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `class_id` | uuid FK |  |
| `account_id / centre_id` | uuid FK |  |
| `author_id` | uuid FK | Class staff, or an enrolled student when `class_settings.students_can_post` |
| `body` | text |  |
| `created_at` | timestamptz |  |
| `deleted_at` | timestamptz NULL | Soft delete — staff remove posts from the stream |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | enrolled students; class staff; centre_admin |
| INSERT | class staff; enrolled student when `students_can_post` |
| UPDATE | author; centre_admin (soft delete) |
| DELETE | — |

<a id="t-class-post-comments"></a>
### `class_post_comments`

`6 columns` · `No prototype stand-in`

**Prototype stand-in**

"Add class comment" is an inert label (TeacherPages.jsx:491)

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `post_id` | uuid FK |  |
| `account_id / centre_id` | uuid FK |  |
| `author_id` | uuid FK | Students only when `class_settings.students_can_comment` |
| `body` | text |  |
| `created_at / deleted_at` | timestamptz |  |

Class posts from or to students are subject to the same minor-safety rules as messages: the flag scan trigger runs on insert, and posts are text-only.

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | as class_posts |
| INSERT | class staff; enrolled student when `students_can_comment` |
| UPDATE | author; centre_admin (soft delete) |
| DELETE | — |

<a id="t-class-change-requests"></a>
### `class_change_requests`

`9 columns` · `No prototype stand-in`

Teacher → admin. Scheduling and enrolment are admin-managed; this is how a teacher asks for a change.

**Prototype stand-in**

"Request a change" writes one audit row (TeacherPages.jsx:791)

**Findings**

- **Low** — Divergence already listed

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `class_id` | uuid FK |  |
| `account_id / centre_id` | uuid FK |  |
| `requested_by` | uuid FK |  |
| `kind` | text | `schedule` \| `enrolment` \| `room` \| `other` |
| `body` | text |  |
| `status` | text | `open` \| `actioned` \| `declined` |
| `decided_by / decided_at` | uuid FK / timestamptz |  |
| `decision_note` | text NULL | Shown back to the teacher |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | requester; centre_admin |
| INSERT | teacher (own classes) |
| UPDATE | centre_admin (decide) |
| DELETE | — |

<a id="t-tags"></a>
### `tags`

`5 columns` · `1 undocumented` · `Partly modelled`

One tag vocabulary per centre, used on classes, students and reports.

**Prototype stand-in**

Class `tags[]` strings (cohort) · `REPORTS_TAGS {id, label, color}` (report kind)

**In the prototype, not in the reference**

- Report rules target cohort tags by label string (`tag: 'A-Level'`), not by id

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `account_id / centre_id` | uuid FK |  |
| `name` | text | UNIQUE within (centre_id, kind) |
| `colour` | text | Token reference |
| `kind` | text | `cohort` (classes/students — targetable by report rules) \| `report` (filing labels on reports, e.g. Parents' Evening, SEN Review) |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre staff |
| INSERT | centre_admin; teacher (`kind = 'report'` only) |
| UPDATE | centre_admin |
| DELETE | centre_admin |

<a id="t-taggables"></a>
### `taggables`

`5 columns` · `Partly modelled`

**Prototype stand-in**

Arrays on the entity: `cls.tags[]`, `report.tagIds[]`; no student tags

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `tag_id` | uuid FK |  |
| `account_id / centre_id` | uuid FK |  |
| `entity_type` | text | `class` \| `student` \| `report` — `report` only for `kind = 'report'` tags |
| `entity_id` | uuid |  |
| `UNIQUE` | (tag_id, entity_type, entity_id) |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre staff; student never |
| INSERT | centre_admin; teacher (report tags on own reports) |
| UPDATE | — |
| DELETE | centre_admin; teacher (own report tags) |

<a id="t-waiting-list-entries"></a>
### `waiting_list_entries`

`8 columns` · `1 medium` · `Partly modelled`

People who asked for a place before one exists. Plan-gated (`waiting_list` capability).

**Prototype stand-in**

Solo only: `SOLO_WAITING_LIST {name, year, subject, added, note}`

**Findings**

- **Low** — No contact fields or status in the prototype; no centre waiting list
- **Medium** — `enrolments.status = waitlisted` duplicates this table — pick one mechanism

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `account_id / centre_id` | uuid FK |  |
| `name` | text | Prospective student |
| `contact_name / contact_email / contact_phone` | text | Guardian or adult enquirer |
| `subject / year_group` | text NULL | What they want |
| `note` | text NULL |  |
| `status` | text | `waiting` \| `offered` \| `enrolled` \| `withdrawn` |
| `added_at` | timestamptz | List order is oldest first |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre_admin |
| INSERT | centre_admin (capability `waiting_list`) |
| UPDATE | centre_admin |
| DELETE | centre_admin |

<a id="t-class-schedules"></a>
### `class_schedules`

`7 columns` · `Partly modelled`

Recurrence pattern stored as LOCAL time + weekday, not naive UTC.

**Prototype stand-in**

One `day` + `time` string per centre class · solo `slots[{day, start, mins}]`

**Findings**

- **Low** — No effective dating; solo numbers weekdays 1–7, reference 0–6

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `class_id` | uuid FK |  |
| `account_id / centre_id` | uuid FK |  |
| `weekday` | int | 0–6 |
| `starts_at_local / ends_at_local` | time | Centre-local wall clock |
| `room_id` | uuid FK |  |
| `effective_from / effective_to` | date |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre members |
| INSERT | centre_admin |
| UPDATE | centre_admin |
| DELETE | centre_admin |

<a id="t-sessions"></a>
### `sessions`

`13 columns` · `1 medium` · `2 undocumented` · `Partly modelled`

A concrete dated occurrence. `register_submitted_*` confirms delivery.

**Prototype stand-in**

Materialised on read by `materialiseSessions` (attendance.jsx:140), id `<classId>|<date>` · solo `<lessonId>@<date>`

**Findings**

- **Medium** — No policy considers `class_cover` / `v_effective_teacher`: a cover teacher fails "teacher (own)" on UPDATE and `is_my_student()`
- **Low** — INSERT "system (cron)" — no session cron is scheduled in any plan phase

**In the prototype, not in the reference**

- Cancellation is stored in the timesheet store (`cancelled[]`) and the attendance seed, not on the session (attendance.jsx:270–283)
- `submittedBy` doubles as the delivering adult — no separate submitter vs `delivered_by`

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `class_id` | uuid FK |  |
| `account_id / centre_id` | uuid FK |  |
| `starts_at / ends_at` | timestamptz | Materialised from schedule + timezone |
| `room_id` | uuid FK |  |
| `status` | text | **The only persisted enum:** `scheduled` \| `delivered` \| `cancelled` |
| `register_submitted_at` | timestamptz |  |
| `register_submitted_by` | uuid FK | Who submitted — may be an admin backfilling |
| `register_late` | boolean | Set by `submit_register` when the derived state was `awaiting` (natural backfill or unlock) |
| `register_note` | text NULL | The late reason. NOT NULL enforced when `register_late` and `centre_register_settings.require_late_reason` |
| `register_by_admin` | boolean | An admin submitted on the teacher's behalf — a different accountability posture from a late teacher |
| `delivered_by` | uuid FK NULL | → profiles.id — **the adult who actually delivered the session**; defaults to the submitter. Unplanned same-day substitution lives here; date-ranged planned cover is `class_cover` |
| `delivered_minutes` | int NULL | Time actually delivered when it differs from the scheduled length (one-to-one lessons); drives the teaching timesheet line and hourly billing. Null = scheduled length; 0 when nobody attended |

**Register lifecycle states are derived, never stored.** The six operational states a register can be in (`upcoming`, `open_live`, `awaiting`, `lapsed`, `recorded`, `cancelled`) are computed at read time from `starts_at` / `ends_at` / `register_submitted_at`, the centre's `centre_register_settings` row, any active `register_unlocks` grant, and the current time — see `v_session_state` in Part II. `sessions.status` remains the three-value persisted enum above.

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre staff; enrolled students |
| INSERT | centre_admin; system (cron) |
| UPDATE | teacher (own, via register); centre_admin |
| DELETE | centre_admin |

<a id="t-centre-register-settings"></a>
### `centre_register_settings`

`9 columns` · `2 undocumented` · `Partly modelled`

Register timing policy. One row per centre; the only input `v_session_state` takes besides the session and the clock.

**Prototype stand-in**

`REGISTER_SETTINGS` constant (mocks/attendance.mock.jsx:39) · solo `SOLO_REGISTER_RULES {opensBeforeMins: 10, windowHours: 168}`

**Findings**

- **Low** — Backfill 48h vs 72h (divergence already listed)

**In the prototype, not in the reference**

- Field names and units differ: `pre_open_window`, `grace_window: 'eod'`, `backfill_window`, `amendment_window` (minutes)
- No settings UI anywhere — the values are hard-coded

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `centre_id` | uuid PK FK |  |
| `account_id` | uuid FK |  |
| `pre_open_minutes` | int | default 0 — how long before `starts_at` the register opens (`upcoming → open_live`) |
| `grace_minutes` | int NULL | Minutes after `ends_at` the register stays freely takeable. Ignored when `grace_eod` |
| `grace_eod` | boolean | default true — stay open until the end of the session's local calendar day |
| `backfill_hours` | int | default 72 — natural late window after grace before the register lapses. Solo accounts default to 168 |
| `amendment_hours` | int | default 24 — how long a submitted mark stays teacher-amendable |
| `require_late_reason` | boolean | default true — a backfill/unlocked submission cannot be confirmed without `register_note` |
| `updated_at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre staff |
| INSERT | system (with centre) |
| UPDATE | centre_admin (audited) |
| DELETE | — |

<a id="t-enrolments"></a>
### `enrolments`

`5 columns` · `Partly modelled`

Student ↔ class membership over a date range.

**Prototype stand-in**

`student.classIds[]` — no dates or status

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `class_id / student_id` | uuid FK |  |
| `account_id / centre_id` | uuid FK |  |
| `starts_on / ends_on` | date |  |
| `status` | text | `active` \| `withdrawn` \| `waitlisted` |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre staff; the student (self) |
| INSERT | centre_admin (RPC) |
| UPDATE | centre_admin (RPC) |
| DELETE | centre_admin |

<a id="t-attendance-records"></a>
### `attendance_records`

`8 columns` · `3 undocumented` · `Partly modelled`

Per-student mark per session. Written by `submit_register`; corrected by `amend_attendance` within the amendment window.

**Prototype stand-in**

`tutoros.attendance.v2` `submissions[sessionId].records{studentName: status}`

**Findings**

- **Low** — No `minutes_late`, per-mark `note` or `recorded_by`

**In the prototype, not in the reference**

- Marks keyed by student NAME, not id
- Historical marks synthesised deterministically (`synth: true`, attendance.jsx:247)
- Solo marks `present | late | absent` (no `excused`) with per-student late notes

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `session_id / student_id` | uuid FK |  |
| `account_id / centre_id` | uuid FK |  |
| `status` | text | `present` \| `absent` \| `late` \| `excused` |
| `minutes_late` | int |  |
| `note` | text |  |
| `recorded_by` | uuid FK |  |
| `recorded_at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre staff; the student (self) |
| INSERT | teacher via submit_register |
| UPDATE | teacher/centre_admin (amend, audited) |
| DELETE | centre_admin |

<a id="t-register-unlocks"></a>
### `register_unlocks`

`10 columns` · `3 undocumented` · `Partly modelled`

A time-boxed admin grant that reopens a locked/lapsed register for re-take. One-shot: consumed by the next `submit_register`, or auto-lapses at `expires_at`.

**Prototype stand-in**

`unlocks{sessionId: {grantedBy, grantedAt, expiresAt, note}}` + `unlockLog[]`

**Findings**

- **Low** — Delete-on-use divergence already listed

**In the prototype, not in the reference**

- Presets match the plan: 2h / 4h / rest of today / 24h / 48h (TeacherPages.jsx:1437)
- Consuming a grant is not written to `unlockLog` (attendance.jsx:304)
- Solo reopen `{reason, at}` never expires and is not one-shot (soloData.jsx:113, 288)

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `session_id` | uuid FK | → sessions.id |
| `account_id / centre_id` | uuid FK |  |
| `granted_by` | uuid FK | Admin who granted (→ profiles.id) |
| `granted_at` | timestamptz | default now() |
| `expires_at` | timestamptz | Grant lapses here if unused (end-of-day / +Nh) |
| `status` | text | `active` \| `consumed` \| `revoked` \| `expired` |
| `consumed_at` | timestamptz | Set when a `submit_register` uses the grant |
| `revoked_by / revoked_at` | uuid FK / timestamptz | Set by `revoke_unlock` |
| `note` | text NULL | Reason. **Required when `granted_by` is the session's own teacher** — the solo "reopen with a reason" path, where the tutor is their own admin |

Rows are never deleted: consumed, revoked and expired grants stay as the audit trail.

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre staff; the affected teacher |
| INSERT | centre_admin via grant_unlock (audited) |
| UPDATE | system (consume); centre_admin via revoke_unlock (audited) |
| DELETE | — |

<a id="t-attendance-amendments"></a>
### `attendance_amendments`

`7 columns` · `1 medium` · `Partly modelled`

Append-only audit of per-mark corrections. Written by `amend_attendance`; the `attendance_records` row holds the current value, this holds the history.

**Prototype stand-in**

`amendments[{sessionId, student, from, to, at, by}]`

**Findings**

- **Medium** — No `reason` captured, and the amendment window is only checked in the UI, not in `amend_attendance` (attendance.jsx:334)

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `attendance_record_id` | uuid FK | → attendance_records.id |
| `account_id / centre_id` | uuid FK |  |
| `from_status / to_status` | text | The change |
| `reason` | text |  |
| `amended_by` | uuid FK |  |
| `created_at` | timestamptz | default now() |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre staff |
| INSERT | system (via amend_attendance) |
| UPDATE | — (append-only) |
| DELETE | — |

<a id="t-class-cover"></a>
### `class_cover`

`8 columns` · `1 undocumented` · `Partly modelled`

Temporary cover teacher over a date range. The effective teacher per session date is **derived** (`v_effective_teacher`) — no stored cover flag on the class.

**Prototype stand-in**

`cls.cover {teacherId, teacher, from, to, reason}` + `coverActive()` (AdminPages.jsx:3030)

**Findings**

- **Low** — Single-object divergence already listed

**In the prototype, not in the reference**

- Staff holidays `holidays{teacherId: [{from, to, reason}]}` (AdminPages.jsx:51) exclude sessions from staff attendance and prefill cover — no staff-leave table exists

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `class_id` | uuid FK | → classes.id |
| `account_id / centre_id` | uuid FK |  |
| `cover_teacher_id` | uuid FK | → profiles.id |
| `starts_on / ends_on` | date |  |
| `reason` | text |  |
| `created_by` | uuid FK |  |
| `created_at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre staff |
| INSERT | centre_admin |
| UPDATE | centre_admin |
| DELETE | centre_admin |

---

## §3 Grades & assessment

*5 tables · 2 with something to fix*

<a id="t-grade-scales"></a>
### `grade_scales`

`4 columns` · `1 undocumented` · `Partly modelled`

Unified grade model — replaces the fragmented taxonomy.

**Prototype stand-in**

`klasioGrades.GRADE_SCALES` code constants — GCSE 9–1, A-Level A*–E, KS3 descriptors (teacherGrades.jsx)

**In the prototype, not in the reference**

- Tracker grade columns use a separate fixed A*–U list (TeacherPages.jsx:2588); report ratings are a third taxonomy

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `centre_id / account_id` | uuid FK |  |
| `name` | text |  |
| `kind` | text | `numeric_9_1` \| `letter_a_u` \| `percentage` \| `descriptor` |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre members |
| INSERT | centre_admin |
| UPDATE | centre_admin |
| DELETE | centre_admin |

<a id="t-grade-bands"></a>
### `grade_bands`

`6 columns` · `Partly modelled`

Boundaries within a scale (e.g. 9 = 90–100).

**Prototype stand-in**

`pctToGrade` thresholds in code (teacherGrades.jsx)

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `grade_scale_id` | uuid FK |  |
| `account_id / centre_id` | uuid FK |  |
| `label` | text |  |
| `min_value / max_value` | numeric |  |
| `sort_order` | int |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre members |
| INSERT | centre_admin |
| UPDATE | centre_admin |
| DELETE | centre_admin |

<a id="t-assessments"></a>
### `assessments`

`9 columns` · `No prototype stand-in`

A gradable event for a class.

**Prototype stand-in**

None — nothing in the prototype plays this role.

**Findings**

- **Low** — Coverage gap already listed

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `class_id` | uuid FK |  |
| `account_id / centre_id` | uuid FK |  |
| `subject_id` | uuid FK |  |
| `title` | text |  |
| `assessed_on` | date |  |
| `grade_scale_id` | uuid FK |  |
| `max_marks` | numeric |  |
| `created_by` | uuid FK |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre staff; enrolled students (if published) |
| INSERT | teacher; centre_admin |
| UPDATE | teacher (own); centre_admin |
| DELETE | centre_admin |

<a id="t-results"></a>
### `results`

`8 columns` · `1 critical` · `No prototype stand-in`

A student's outcome on an assessment.

**Prototype stand-in**

The student "Results" tab shows homework marks

**Findings**

- **Critical** — SELECT "centre staff" — every teacher reads every student's results

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `assessment_id / student_id` | uuid FK |  |
| `account_id / centre_id` | uuid FK |  |
| `marks` | numeric |  |
| `grade_band_id` | uuid FK |  |
| `comment` | text |  |
| `published` | boolean | Hidden from student until true |
| `recorded_by` | uuid FK |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre staff; student (self, if published) |
| INSERT | teacher; centre_admin |
| UPDATE | teacher (own); centre_admin |
| DELETE | centre_admin |

<a id="t-student-targets"></a>
### `student_targets`

`10 columns` · `No prototype stand-in`

Predicted and target grades — teacher professional judgement, stored (decision #28). Shown on the student dashboard, teacher progress, admin student profile, tracking and reports.

**Prototype stand-in**

Synthesised: `predictedPct = base + 4` (studentData.jsx:124), target grade (AdminPages.jsx:744)

**Findings**

- **Low** — Divergence already listed

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `account_id / centre_id` | uuid FK |  |
| `student_id` | uuid FK |  |
| `subject_id` | uuid FK |  |
| `grade_scale_id` | uuid FK | Which taxonomy the labels belong to |
| `predicted_grade` | text NULL | Teacher's current prediction |
| `target_grade` | text NULL | The aspiration |
| `set_by` | uuid FK |  |
| `set_on` | date |  |
| `UNIQUE` | (student_id, subject_id) | Latest wins; history via `audit_log` |

"On track" is **derived** (`v_student_progress` compares recent results to `target_grade`), never stored. A published report snapshots the predicted grade into `reports.predicted_grade`, so later changes never alter a sent report.

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre staff; student (self) |
| INSERT | teacher (own students); centre_admin |
| UPDATE | teacher (own students); centre_admin (audited) |
| DELETE | centre_admin |

---

## §4 Staff & pay

*5 tables · 2 with something to fix*

<a id="t-staff-details"></a>
### `staff_details`

`10 columns` · `1 medium` · `3 undocumented` · `Partly modelled`

Employment metadata for staff. Sensitive; admin-scoped.

**Prototype stand-in**

`SEED_TEACHERS` + AddTeacherPage form + Timesheets `payType` / `hourlyRate`

**Findings**

- **Medium** — Plan divergence row is wrong: there is no `employed | contractor` vocabulary. Real ones: `Full-time | Part-time | Hourly | Contract` (Onboarding.jsx:548) and `salaried | hourly | mixed` (Timesheets.jsx:89)
- **Low** — UPDATE "self (limited)" is a column rule RLS cannot express — say column grant, view or RPC

**In the prototype, not in the reference**

- `salary`, `contract`, `startDate` on the add-teacher form (AdminPages.jsx:2920)
- `status: invited | active`; stored `classes / students / hwToMark / attendance` counts
- `rating` still seeded (adminPages.mock.jsx:10) and defaulted to 0 on new staff, but no longer shown in the staff table

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `profile_id` | uuid PK FK |  |
| `account_id / centre_id` | uuid FK |  |
| `employment_type` | text | `employed` \| `contractor` — the **legal** axis |
| `pay_type` | text | `salaried` \| `hourly` \| `mixed` — the **payroll** axis. `mixed` = salaried for their own timetable, paid for cover and extras |
| `contracted_hours` | numeric NULL | Weekly contracted hours (replaces the prototype's Full-time/Part-time label — a third vocabulary is not kept) |
| `specialism` | text NULL | Main subject, shown in staff lists |
| `colour` | text NULL | Token reference used on the schedule grid |
| `start_date` | date |  |
| `ni_number_ref` | text | Tokenised reference, not the raw NI number |
| `notes` | text | Internal notes, admin-only |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | self; centre_admin; account_owner |
| INSERT | centre_admin |
| UPDATE | centre_admin; self (limited) |
| DELETE | centre_admin |

<a id="t-staff-rates"></a>
### `staff_rates`

`8 columns` · `Partly modelled`

Pay rate over time. Changes are audited.

**Prototype stand-in**

One `hourlyRate` per teacher (`TS_EMP_DEFAULTS`, Timesheets.jsx:95)

**Findings**

- **Low** — No effective dating or session rate. RPC `set_staff_rate` is in the reference but in no plan phase

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `profile_id` | uuid FK |  |
| `account_id / centre_id` | uuid FK |  |
| `rate_type` | text | `hourly` \| `session` |
| `amount` | numeric |  |
| `currency` | text | default GBP |
| `effective_from / effective_to` | date |  |
| `created_by` | uuid FK |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | self; centre_admin |
| INSERT | centre_admin (audited) |
| UPDATE | centre_admin (audited) |
| DELETE | centre_admin |

<a id="t-timesheet-entries"></a>
### `timesheet_entries`

`11 columns` · `2 medium` · `3 undocumented` · `Prototype models it`

`teaching` entries are DERIVED from register submission — never entered manually. All other types are manually logged non-session work, subject to approval. A cancelled session produces no entry at all.

**Prototype stand-in**

`tutoros.timesheets.v3` TimeEntry `{id, centreId, teacherId, sessionId, type, date, durationMinutes, status, note, approvedBy, approvedAt}`

**Findings**

- **Medium** — Doc lists `cover` as a manual type with `session_id` null, but pay rules treat cover as teaching and the prototype writes cover lines from the register with a `sessionId` (timesheets.mock.jsx:110)
- **Medium** — UPDATE lets teachers edit `draft/submitted`; the prototype allows `draft/rejected` (Timesheets.jsx:52) — the doc never says how a rejected entry is fixed
- **Low** — `exported_amount` snapshot not modelled

**In the prototype, not in the reference**

- `approvedBy`, `approvedAt` — no columns
- Rejection reason is appended to `note` (timesheets.mock.jsx:138) — no rejection-reason column
- Teaching minutes are adjusted ±15 min at register confirm (TimesheetCapture, Timesheets.jsx:561)

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `session_id` | uuid FK NULL | Set only for `teaching` entries (system-derived); null for manual types |
| `profile_id` | uuid FK | The teacher — for `teaching`, `sessions.delivered_by` |
| `account_id / centre_id` | uuid FK |  |
| `type` | text | `teaching` \| `prep` \| `marking` \| `meeting` \| `training` \| `cover` \| `other` — RLS enforces that `teaching` rows are system-inserted only. `other` is recorded but never pay-eligible |
| `minutes` | int |  |
| `worked_on` | date |  |
| `note` | text NULL |  |
| `rate_id` | uuid FK NULL | Rate in force on `worked_on` |
| `exported_amount` | numeric NULL | **Snapshot** of the `v_timesheet_pay` amount taken when the entry moves to `exported`; null before. The live amount is always derived |
| `status` | text | `draft` \| `submitted` \| `approved` \| `rejected` \| `exported` — `exported` marks the payroll CSV hand-off; a ledger-only platform never asserts "paid" |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | self (teacher); centre_admin |
| INSERT | system (`teaching`, via submit_register); teacher (self, non-teaching types via `log_timesheet_entry`) |
| UPDATE | teacher (self, own `draft`/`submitted` non-teaching); centre_admin (approve/reject/adjust, audited) |
| DELETE | teacher (self, own `draft`) |

<a id="t-centre-timesheet-policy"></a>
### `centre_timesheet_policy`

`6 columns` · `Prototype models it`

Centre pay policy. Read by `v_timesheet_pay`, so flipping a toggle re-derives every open period immediately.

**Prototype stand-in**

Timesheet store `config {submissionFrequency, payNonSession, paidCategories{…}}` (Timesheets.jsx:78)

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `centre_id` | uuid PK FK |  |
| `account_id` | uuid FK |  |
| `submission_frequency` | text | `week` \| `fortnight` \| `month` — the **only** period control; staff never choose their own window |
| `pay_non_session` | boolean | Master switch for paying non-teaching time |
| `paid_categories` | text[] | Subset of `prep`, `marking`, `meeting`, `training` paid beneath the master switch |
| `updated_at` | timestamptz |  |

**Pay eligibility (`v_timesheet_pay`) — derived per entry, never stored:**

- `teaching` / `cover`: `hourly` → paid · `salaried` → never · `mixed` → only when the entry is cover or extra, where *extra* = `sessions.delivered_by` is not the class's effective teacher for that date (`v_effective_teacher`).

- Non-session types: paid only when `pay_non_session` **and** the type is in `paid_categories` **and** the teacher is `hourly` or `mixed`.

- `other` is never paid. Salaried lines still record hours with a zero amount, for the audit trail.

- Amount = eligible minutes × the `staff_rates` row in force on `worked_on`.

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre staff |
| INSERT | system (with centre) |
| UPDATE | centre_admin (audited) |
| DELETE | — |

<a id="t-timesheet-adjustments"></a>
### `timesheet_adjustments`

`6 columns` · `No prototype stand-in`

Audited deltas against a derived entry.

**Prototype stand-in**

Admin review only approves / rejects / exports

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `timesheet_entry_id` | uuid FK |  |
| `account_id / centre_id` | uuid FK |  |
| `delta_minutes / delta_amount` | numeric |  |
| `reason` | text |  |
| `created_by` | uuid FK |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | self; centre_admin |
| INSERT | centre_admin (audited) |
| UPDATE | — |
| DELETE | — |

---

## §5 Homework

*6 tables · 3 with something to fix*

<a id="t-assignment-folders"></a>
### `assignment_folders`

`5 columns` · `Partly modelled`

Coloured folders in the assignment builder's file rail.

**Prototype stand-in**

`homework_store_v9.folders` `{id, name, color?}`

**Findings**

- **Low** — Folders are global in the prototype; the reference makes them per-teacher (`created_by`, creator-only RLS)

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `account_id / centre_id` | uuid FK |  |
| `name` | text |  |
| `colour` | text | Token reference |
| `created_by` | uuid FK | Folders are per-teacher |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | creator |
| INSERT | teacher |
| UPDATE | creator |
| DELETE | creator |

<a id="t-assignments"></a>
### `assignments`

`16 columns` · `3 undocumented` · `Prototype models it`

A homework set for a class.

**Prototype stand-in**

`homework_store_v9.assignments` (Homework.jsx:324 onward) + `settings` (DEFAULT_SETTINGS, Homework.jsx:988)

**In the prototype, not in the reference**

- `status: 'active'` — the reference says `published` (Homework.jsx:336)
- `settings.releaseAfterApproval` — a second hold-back flag treated like `hide_marks_until_released` (Homework.jsx:2020)
- `topic` (read by resource usage events), `subject` name, `classLabel`, `teacherName`

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `class_id` | uuid FK |  |
| `account_id / centre_id` | uuid FK |  |
| `subject_id` | uuid FK |  |
| `folder_id` | uuid FK NULL | → assignment_folders.id |
| `title / instructions` | text |  |
| `due_at` | timestamptz |  |
| `status` | text | `draft` \| `published` \| `closed` — **`scheduled` is derived** (published with `available_from` in the future) |
| `available_from` | timestamptz NULL | Before this the assignment is visible but not startable |
| `time_limit_mins` | int NULL | Enforced whether or not a countdown is shown |
| `attempts_allowed` | int | default 1 |
| `allow_late` | boolean | default false — after `due_at`, submissions are refused unless true |
| `allow_review` | boolean | default false — may the student open the marked paper after release |
| `hide_marks_until_released` | boolean | default false — marks stay hidden until the teacher releases them (`release_marks`); when false, returning the work releases it |
| `settings` | jsonb | Presentation-only keys, none read by RLS: `randomize`, `auto_grade_mcq`, `show_question_preview`, `show_countdown` (default **false** — a ticking clock is never forced on a child), `show_correct`, `show_comments`, `show_auto_immediately`, `marks_only` |
| `created_by` | uuid FK |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre staff; targeted students (published, not before `available_from` for contents) |
| INSERT | teacher; centre_admin |
| UPDATE | teacher (own); centre_admin |
| DELETE | teacher (own) |

<a id="t-assignment-targets"></a>
### `assignment_targets`

`5 columns` · `Partly modelled`

Polymorphic targeting: a whole class or named students.

**Prototype stand-in**

`classLabel` string + `studentIds[]` on the assignment

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `assignment_id` | uuid FK |  |
| `account_id / centre_id` | uuid FK |  |
| `target_type` | text | `class` \| `student` — `group` removed with groups (decision #31) |
| `target_id` | uuid | Points at the matching table |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre staff; targeted students |
| INSERT | teacher; centre_admin |
| UPDATE | teacher; centre_admin |
| DELETE | teacher; centre_admin |

<a id="t-questions"></a>
### `questions`

`9 columns` · `1 undocumented` · `Prototype models it`

Questions per assignment; heterogeneous payloads in JSONB.

**Prototype stand-in**

Embedded `questions[]` `{type, prompt, points, hint, choices, correctIndex, correctIndices, answer, tolerance, blanks, pairs}`

**Findings**

- **Low** — Type names `math/short/long` (divergence already listed); `points` vs `max_marks`

**In the prototype, not in the reference**

- Auto-marking matches the reference exactly: exact MCQ, all-or-nothing multi, tolerance 0.01, proportional fillblank/match (Homework.jsx:1790)

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `assignment_id` | uuid FK |  |
| `account_id / centre_id` | uuid FK |  |
| `sort_order` | int |  |
| `type` | text | `mcq` \| `multi` \| `truefalse` \| `numeric` \| `expression` \| `fillblank` \| `match` \| `short_text` \| `long_text` \| `upload` |
| `prompt` | text |  |
| `hint` | text NULL | Shown to the student on request |
| `config` | jsonb | Per-type payload — see below |
| `max_marks` | numeric |  |

The prototype names `math`, `short`, `long` are legacy aliases for `expression`, `short_text`, `long_text`.

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre staff; students (on open assignment) |
| INSERT | teacher; centre_admin |
| UPDATE | teacher (own) |
| DELETE | teacher (own) |

<a id="t-submissions"></a>
### `submissions`

`13 columns` · `1 high` · `1 medium` · `3 undocumented` · `Prototype models it`

A student's attempt at an assignment.

**Prototype stand-in**

`assignment.submissions{studentId}` + `drafts{assignmentId}`

**Findings**

- **High** — Prototype bug: `studentData.resultsSummary()` scores from `sub.marks` without checking release, so held-back marks leak into the student dashboard (studentData.jsx:261)
- **Medium** — SELECT "score/overall_feedback only once released" is column-level — RLS alone cannot do it

**In the prototype, not in the reference**

- Stored `classAvg`, `rank`, `classSize` on each returned submission (Homework.jsx:257) — the reference derives these
- Legacy `status: 'approved'` in six seed rows (Homework.jsx:550–947)
- `drafts` with per-question `flags` (student flag-for-review)

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `assignment_id / student_id` | uuid FK |  |
| `account_id / centre_id` | uuid FK |  |
| `status` | text | `not_started` \| `in_progress` \| `submitted` \| `marked` \| `returned` — `marked` = teacher finished; `returned` = marks released to the student |
| `attempt_count` | int | default 0; bounded by `assignments.attempts_allowed` |
| `started_at` | timestamptz NULL | Drives the time limit |
| `submitted_at` | timestamptz NULL |  |
| `is_late` | boolean | **Snapshot** at submit (`submitted_at > due_at`) — survives a later due-date extension |
| `time_spent_mins` | int NULL |  |
| `score` | numeric |  |
| `overall_feedback` | text NULL | Whole-paper teacher comment |
| `marked_at` | timestamptz NULL |  |
| `marks_released_at` | timestamptz NULL | Set by `release_marks` (or on return when marks aren't held back); students read marks only when set |

**Class standing is derived and gated.** Class average and rank come from `v_submission_standing`. Rank/position is returned to a student **only** when `centre_settings.features.show_rank_to_students` is true (default **false**) and the student is 13 or over; the class average follows the same gate as released marks (decision #29).

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre staff; the student (self — `score`/`overall_feedback` only once `marks_released_at` is set) |
| INSERT | student (self, RPC) |
| UPDATE | student (self, until submitted); teacher (marking, `release_marks`) |
| DELETE | — |

<a id="t-answers"></a>
### `answers`

`7 columns` · `Prototype models it`

Per-question response; objective types auto-mark on submit.

**Prototype stand-in**

Per-submission maps `answers{qid}`, `marks{qid}`, `feedback{qid}`; outcomes derived

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `submission_id / question_id` | uuid FK |  |
| `account_id / centre_id` | uuid FK |  |
| `response` | jsonb |  |
| `auto_marked` | boolean |  |
| `marks_awarded` | numeric |  |
| `feedback` | text NULL | Per-question teacher comment |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre staff; the student (self — `marks_awarded`/`feedback` only once released) |
| INSERT | student (self) |
| UPDATE | student (self, until submit); teacher (mark) |
| DELETE | — |

---

## §6 Student reports & teacher feedback

*8 tables · 5 with something to fix*

<a id="t-report-rules"></a>
### `report_rules`

`11 columns` · `2 undocumented` · `Prototype models it`

Must a report be written, for whom, how often. One `centre_default` rule per centre plus narrower overrides.

**Prototype stand-in**

`reports_store_v2.config.defaultRule` + `reportRules[]` (mocks/reports.mock.jsx:19)

**Findings**

- **Low** — Uppercase enums + `defaultRule` (divergence already listed)

**In the prototype, not in the reference**

- Tag targets use label strings; no `brief`, `active` or `created_by`
- No `half_termly` frequency — the migration folds it into `TERMLY` (Reports.jsx:85). The solo demo does show "Half-termly" rules

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `account_id / centre_id` | uuid FK |  |
| `target_type` | text | `centre_default` \| `tag` \| `class` \| `student` — partial unique index: one `centre_default` per centre |
| `target_id` | uuid NULL | → tags.id (`kind = 'cohort'`) / classes.id / students.profile_id; null for `centre_default` |
| `requirement` | text | `required` \| `optional` \| `off` — **the obligation**. Drives `v_reports_due`, which only queues `required` |
| `brief` | text NULL | Free-text guidance on what the report must cover |
| `frequency` | text NULL | `weekly` \| `fortnightly` \| `monthly` \| `half_termly` \| `termly`; null only when `requirement = 'off'` |
| `template_id` | uuid FK NULL | → report_templates.id |
| `priority` | int | Tie-break between rules at the same level — higher wins |
| `active` | boolean |  |
| `created_by` | uuid FK |  |

**Rule resolution cascade — narrowest target wins:** `student` > `class` > `tag` > `centre_default`. Among rules at the same level, higher `priority` wins. The resolved rule for each (student, class) pair is the input to `v_reports_due`.

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre staff |
| INSERT | centre_admin |
| UPDATE | centre_admin |
| DELETE | centre_admin |

<a id="t-centre-report-settings"></a>
### `centre_report_settings`

`17 columns` · `1 undocumented` · `Prototype models it`

Per-centre reports policy: publish standards, configurable permissions, PDF branding and notifications. The standards and permissions are enforced server-side.

**Prototype stand-in**

`config.centreStandards`, `permissions`, `branding`, `notifications`

**In the prototype, not in the reference**

- `notifications.parentNotification` (future) — the reference emails guardians on every publish with no toggle

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `centre_id` | uuid PK FK |  |
| `account_id` | uuid FK |  |
| `min_comment_length` | int | default 120 — `publish_report` refuses below this |
| `require_signature` | boolean | default true — `publish_report` refuses without `reports.signature` |
| `sections_required` | text[] | Sections that must be non-empty on every template (default `{comments}`) |
| `perm_edit_published` | boolean | Teachers may edit a published report (re-publish re-renders the PDF) |
| `perm_delete` | boolean | Teachers may delete their own drafts |
| `perm_archive` | boolean | Teachers may archive their own published reports |
| `perm_export` | boolean | Teachers may export PDFs/CSVs |
| `perm_share_templates` | boolean | Teachers may create templates visible centre-wide |
| `perm_view_others` | boolean | Teachers may read other teachers' reports — **an RLS read predicate**, not a UI filter |
| `pdf_theme` | text | `classic` \| `modern` \| `minimal` |
| `header_text / footer_text` | text NULL |  |
| `signature_name / signature_title` | text NULL | The centre countersignature printed beside the teacher's |
| `watermark` | text NULL |  |
| `notify_due / notify_overdue / notify_published_to_student` | boolean | Gate the reminder sweeps and publish email enqueues |
| `updated_at` | timestamptz |  |

Centre identity on the PDF (name, logo, accent, contact) is **resolved from the centre profile and `centre_settings.branding` at render time** — never copied into this row.

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre staff |
| INSERT | system (with centre) |
| UPDATE | centre_admin (audited) |
| DELETE | — |

<a id="t-report-templates"></a>
### `report_templates`

`7 columns` · `3 undocumented` · `Prototype models it`

Reusable report structure (sections/prompts) per centre.

**Prototype stand-in**

`templates[]` `{scope, locked, default, description, sections[], ratingCategories[], ratingScale, assignedSubjects/Classes/Years[]}`

**In the prototype, not in the reference**

- `locked` (admin-locked template) and `default` (single default)
- Template assignment to subjects/classes/years — overlaps `report_rules.template_id`
- `ratingCategories[]` and per-template `ratingScale`

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `account_id / centre_id` | uuid FK |  |
| `name` | text |  |
| `structure` | jsonb | Ordered sections + prompts + which rating scale each section uses |
| `shared` | boolean | Visible to all centre teachers (requires `perm_share_templates` for teacher authors) |
| `created_by` | uuid FK |  |
| `updated_at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre_admin; creator; centre teachers when `shared` |
| INSERT | centre_admin; teacher (`shared = false`, or `shared` when `report_perm(perm_share_templates)`) |
| UPDATE | creator; centre_admin |
| DELETE | creator; centre_admin |

<a id="t-rating-scales"></a>
### `rating_scales`

`4 columns` · `1 medium` · `Partly modelled`

A named scale (the 4-tier taxonomy is the default seed).

**Prototype stand-in**

Code constants: `fourtier` (default), `stars` 1–5, `percent` 0–100

**Findings**

- **Medium** — Stars and percent are not ordered labelled levels — `rating_levels` cannot hold them

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `account_id / centre_id` | uuid FK |  |
| `name` | text |  |
| `active` | boolean |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre staff |
| INSERT | centre_admin |
| UPDATE | centre_admin |
| DELETE | centre_admin |

<a id="t-rating-levels"></a>
### `rating_levels`

`6 columns` · `Partly modelled`

Ordered levels within a scale.

**Prototype stand-in**

`RPT_FOURTIER [{v, label, color}]` (Reports.jsx:27)

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `rating_scale_id` | uuid FK |  |
| `account_id / centre_id` | uuid FK |  |
| `label` | text |  |
| `description` | text |  |
| `sort_order` | int |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre staff |
| INSERT | centre_admin |
| UPDATE | centre_admin |
| DELETE | centre_admin |

<a id="t-reports"></a>
### `reports`

`19 columns` · `2 medium` · `4 undocumented` · `Prototype models it`

A written report about a student. Guardians receive published reports by email (PDF); students see published reports only.

**Prototype stand-in**

`reports_store_v2.reports{id}` (mocks/reports.mock.jsx:259)

**Findings**

- **Medium** — `pinned` and `lastViewed` live on the shared report, not per user (`report_user_state`)
- **Medium** — Ratings keyed by category (behaviour, effort…), not section → `rating_level_id`
- **Low** — Matrix wording "never `archived` drafts" is contradictory — archived only follows published

**In the prototype, not in the reference**

- `title`, `subject` (no `subject_id` column), `period` label instead of `period_start/end`
- `targets{current, longTerm, revision, parentActions, teacherActions}` section
- `viewedByStudent`, per-report `ratingScale`, `history[]` stored on the report
- Unarchive back to published/draft (Reports.jsx:176); bulk archive accepts drafts; bulk delete ignores status (Reports.jsx:1449–1454)

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `account_id / centre_id` | uuid FK |  |
| `student_id` | uuid FK |  |
| `class_id` | uuid FK NULL |  |
| `rule_id` | uuid FK NULL | The rule this satisfies, if any |
| `template_id` | uuid FK |  |
| `author_id` | uuid FK | The teacher |
| `folder_id` | uuid FK NULL | → report_folders.id |
| `report_type` | text | `termly_progress` \| `quick_update` — a label independent of the template |
| `period_start / period_end` | date | The period covered |
| `status` | text | `draft` \| `published` \| `archived` — no approval step (decision #26); the centre standards gate at publish is the quality check |
| `body` | jsonb | Section content keyed to the template structure (incl. academic fields: understanding, participation, homework completion, test performance, attendance, strengths, improvements) |
| `ratings` | jsonb | Section → rating_level_id |
| `predicted_grade` | text NULL | **Snapshot** of `student_targets.predicted_grade` taken at publish |
| `signature` | text NULL | Typed teacher signature, printed on the PDF |
| `published_at` | timestamptz NULL |  |
| `archived_at` | timestamptz NULL |  |
| `acknowledged_at / acknowledged_by` | timestamptz / uuid FK NULL | The student acknowledged the published report (`acknowledge_report`) |
| `pdf_file_id` | uuid FK NULL | → files.id, rendered on publish |

Report tags (`kind = 'report'`) attach through `taggables`; section attachments through `file_links (entity_type = 'report')`. The per-report history drawer (created / edited / published / archived, actor + time) reads `audit_log` — **every** report mutation is audited, not only publish.

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | author; centre_admin; other teachers when `report_perm(perm_view_others)`; student (self, `published` only — never `archived` drafts) |
| INSERT | teacher; centre_admin |
| UPDATE | author (draft); author (published, when `perm_edit_published`); centre_admin; publish/archive via RPC (audited) |
| DELETE | author (draft, when `perm_delete`); centre_admin (draft only) |

<a id="t-report-folders"></a>
### `report_folders`

`6 columns` · `Prototype models it`

Nested filing folders for reports.

**Prototype stand-in**

`folders[]` `{id, name, parentId, color}`

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `account_id / centre_id` | uuid FK |  |
| `parent_id` | uuid FK NULL | → report_folders.id |
| `name` | text |  |
| `colour` | text | Token reference |
| `created_by` | uuid FK |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre staff |
| INSERT | teacher; centre_admin |
| UPDATE | creator; centre_admin |
| DELETE | creator; centre_admin |

<a id="t-report-user-state"></a>
### `report_user_state`

`4 columns` · `No prototype stand-in`

Per-user file-management affordances — pinning and recently viewed are personal, not properties of the report.

**Prototype stand-in**

Stored on the report instead

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `report_id / profile_id` | uuid FK | PK (report_id, profile_id) |
| `account_id / centre_id` | uuid FK |  |
| `pinned` | boolean |  |
| `last_viewed_at` | timestamptz NULL |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | self |
| INSERT | self |
| UPDATE | self |
| DELETE | self |

---

## §7 Tracking & lesson planning

*4 tables · 4 with something to fix*

<a id="t-trackers"></a>
### `trackers`

`7 columns` · `1 undocumented` · `Prototype models it`

A spreadsheet-style grid a teacher keeps per class.

**Prototype stand-in**

`tutoros.tracking.v1` `[{id, name, description, classGroup, columns[], entries{}, pinned}]` + `tutoros.tracking.recents.v1`

**In the prototype, not in the reference**

- `pinned` on the tracker; `classGroup` label instead of a class id

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `account_id / centre_id` | uuid FK |  |
| `class_id` | uuid FK |  |
| `name` | text |  |
| `description` | text NULL |  |
| `created_by` | uuid FK |  |
| `created_at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | teacher (own classes); centre_admin |
| INSERT | teacher (own classes) |
| UPDATE | teacher (own classes) |
| DELETE | teacher (own); centre_admin |

<a id="t-tracker-columns"></a>
### `tracker_columns`

`9 columns` · `1 medium` · `3 undocumented` · `Prototype models it`

Typed columns.

**Prototype stand-in**

`columns[{id, name, type, max, options}]` (TeacherPages.jsx:2577)

**Findings**

- **Medium** — Plan Phase 12b still lists the old six kinds, and the divergences table does not mention this

**In the prototype, not in the reference**

- Kinds `score, checkbox, select, rating, text, grade, date` — `rating` (1–5 stars) and `date` are not in the reference
- `check` renamed `checkbox`; `number` with a max folded into `score` on load (TeacherPages.jsx:2639)
- `grade` uses fixed A*–U options, not a grade scale

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `tracker_id` | uuid FK |  |
| `account_id / centre_id` | uuid FK |  |
| `name` | text |  |
| `kind` | text | `score` (a mark out of `max_value`) \| `number` (bare number, optional `max_value` cap) \| `check` \| `text` \| `grade` (label from `grade_scale_id`) \| `select` (one of `options`) |
| `max_value` | numeric NULL | For `score` (required) and `number` (optional) |
| `options` | jsonb NULL | For `select` — ordered labels |
| `grade_scale_id` | uuid FK NULL | For `grade` |
| `sort_order` | int |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | teacher (own classes); centre_admin |
| INSERT | teacher (own classes) |
| UPDATE | teacher (own classes) |
| DELETE | teacher (own); centre_admin |

<a id="t-tracker-entries"></a>
### `tracker_entries`

`6 columns` · `1 medium` · `Prototype models it`

One cell per (column, student).

**Prototype stand-in**

`entries{studentName: {columnId: value}}`

**Findings**

- **Medium** — Cells keyed by student name; no `updated_by` / `updated_at`

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `tracker_id / column_id / student_id` | uuid FK | UNIQUE (column_id, student_id) |
| `account_id / centre_id` | uuid FK |  |
| `value` | jsonb | Typed by the column kind |
| `updated_by` | uuid FK |  |
| `updated_at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | teacher (own classes); centre_admin |
| INSERT | teacher (own classes) |
| UPDATE | teacher (own classes) |
| DELETE | teacher (own); centre_admin |

<a id="t-lesson-plans"></a>
### `lesson_plans`

`9 columns` · `2 undocumented` · `Prototype models it`

Persisted lesson planning. Materials attach through `resource_links (context_type = 'lesson_plan')` (§12).

**Prototype stand-in**

`klasio.lessonPlans.v1` keyed `<group>__<date>` (mocks/lessonPlanner.mock.jsx:255)

**In the prototype, not in the reference**

- Uploaded files embedded in the plan (`resources[{name, size, type, dataUrl}]`, dataUrl stripped on save) — they bypass the library and `files`; `file_links` has no lesson-plan entity type
- `duration`, `topic`, `objectives`, `agenda`, `homework`, `notes` fields; one plan per group + date

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `account_id / centre_id` | uuid FK |  |
| `class_id` | uuid FK |  |
| `session_id` | uuid FK NULL | Optionally pinned to a concrete session |
| `author_id` | uuid FK |  |
| `title` | text |  |
| `body` | jsonb |  |
| `planned_for` | date |  |
| `created_at / updated_at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | author; teachers of the class; centre_admin |
| INSERT | teacher |
| UPDATE | author |
| DELETE | author; centre_admin |

---

## §8 Invoicing (ledger-only)

*8 tables · 4 with something to fix*

<a id="t-centre-invoice-settings"></a>
### `centre_invoice_settings`

`13 columns` · `1 high` · `Partly modelled`

Tax, numbering-adjacent defaults and reminder policy. One row per centre.

**Prototype stand-in**

Invoice store `config {taxLabel, taxRate: 0.20, taxMode, reminderCooldownHours}` AND `settings_store_v1.admin.centre {currency, invoiceDueDays, taxRate: 0, autoSendInvoices, lateReminders}`

**Findings**

- **High** — Two stores hold invoice defaults with contradictory tax rates (0.20 vs 0)
- **Low** — No `vat_registered` / `vat_number`; the VAT number sits on the account billing profile instead

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `centre_id` | uuid PK FK |  |
| `account_id` | uuid FK |  |
| `currency` | text | default `GBP` |
| `vat_registered` | boolean | default false |
| `vat_number` | text NULL |  |
| `tax_mode` | text | `none` \| `exclusive` (tax added on top of line amounts) \| `inclusive` (line amounts already include tax) — a different calculation, not just a rate. Forced `none` when not VAT-registered |
| `tax_label` | text | default `'VAT'` |
| `default_tax_rate` | numeric | e.g. 0.20 — applied to new lines |
| `invoice_due_days` | int | default 14 |
| `auto_send_on_issue` | boolean | Email the invoice when it is issued |
| `overdue_reminders` | boolean | pg_cron overdue sweep enabled |
| `reminder_cooldown_hours` | int | default 24 — minimum gap between reminders for one invoice, manual or automatic |
| `updated_at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre staff |
| INSERT | system (with centre) |
| UPDATE | centre_admin (audited) |
| DELETE | — |

<a id="t-fee-plans"></a>
### `fee_plans`

`7 columns` · `No prototype stand-in`

Reusable fee templates.

**Prototype stand-in**

`REPORTS_INVOICES` has plan labels only

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `centre_id / account_id` | uuid FK |  |
| `name` | text |  |
| `amount` | numeric |  |
| `currency` | text |  |
| `cadence` | text | `monthly` \| `termly` \| `one_off` |
| `active` | boolean |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre staff |
| INSERT | centre_admin |
| UPDATE | centre_admin |
| DELETE | centre_admin |

<a id="t-invoice-sequences"></a>
### `invoice_sequences`

`4 columns` · `Prototype models it`

Per-centre invoice numbering. Import never generates numbers.

**Prototype stand-in**

Invoice store `seq` + `tenantId: 'centre-001'` (Invoices.jsx:326, 405)

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `centre_id` | uuid PK |  |
| `account_id` | uuid FK |  |
| `prefix` | text |  |
| `next_number` | bigint |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre_admin (via RPC only) |
| INSERT | system |
| UPDATE | system (via RPC) |
| DELETE | — |

<a id="t-invoices"></a>
### `invoices`

`12 columns` · `1 critical` · `1 high` · `2 undocumented` · `Partly modelled`

Header. Billed to a FAMILY (siblings share one invoice), never a single student. STATUS IS DERIVED from schedule vs payments — never stored.

**Prototype stand-in**

`tutoros.invoices.v1` `{id = number, familyId, studentIds[], classes[], issuedDate, payments[], taxMode?, taxRate?, voided, voidReason, voidedAt}` · solo `{family, students, covers, issued, due, amount, paidOn, draft}`

**Findings**

- **High** — No invoice lines: the total is the sum of scheduled instalments, derived forever. The reference snapshots `subtotal/vat_total/total` at issue. Not in the divergences table
- **Critical** — SELECT "centre staff; the student (self)" — every teacher reads family invoices, and a student on a family invoice sees siblings' lines. The prototype keeps invoices admin-only on purpose (communications.mock.jsx:89–91)

**In the prototype, not in the reference**

- `studentIds[]` and class-name `classes[]` on the header; `importedRefs` dedupe list for CSV imports
- No persisted drafts in the centre app — issuing allocates the number at once (Invoices.jsx:405)

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `centre_id / account_id` | uuid FK |  |
| `family_id` | uuid FK NOT NULL | → families.id — the billing unit; per-student attribution lives on the lines |
| `invoice_number` | text NULL | From invoice_sequences, allocated at issue (drafts have none) |
| `covers` | text NULL | Human description of what is billed (e.g. "September · 8 lessons") |
| `issued_at` | timestamptz NULL | Null = draft (editable, not sent, excluded from status and balances) |
| `issue_date / due_date` | date |  |
| `tax_mode / tax_rate` | text / numeric NULL | Per-invoice override of `centre_invoice_settings`; null = centre default |
| `subtotal / vat_total / total` | numeric | Snapshotted at issue — an issued invoice is an immutable document |
| `currency` | text |  |
| `voided_at / void_reason` | timestamptz / text |  |
| `created_by` | uuid FK |  |

Status (`scheduled` / `partial` / `paid` / `overdue` / `void`) is derived in `v_invoice_status`. A family whose billing guardian has **no email** is a first-class state: `POST /v1/invoices/:id/send` fails loudly with `no_billing_email` rather than silently enqueueing.

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre staff; the student (self, own invoices) |
| INSERT | centre_admin (RPC) |
| UPDATE | centre_admin (void, audited) |
| DELETE | — |

<a id="t-invoice-lines"></a>
### `invoice_lines`

`9 columns` · `1 high` · `No prototype stand-in`

Line items.

**Prototype stand-in**

None — nothing in the prototype plays this role.

**Findings**

- **High** — Missing entirely from the prototype (see invoices)

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `invoice_id` | uuid FK |  |
| `account_id / centre_id` | uuid FK |  |
| `student_id` | uuid FK NULL | Which sibling the line is for |
| `class_id` | uuid FK NULL | The class billed, when the line is for teaching |
| `description` | text |  |
| `quantity / unit_amount / line_total` | numeric | For generated lines: quantity = delivered hours, unit = `classes.hourly_rate` |
| `vat_rate / vat_amount` | numeric | From the invoice's effective tax rate; zero when `tax_mode = 'none'` |
| `fee_plan_id` | uuid FK NULL |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre staff; student (self) |
| INSERT | centre_admin |
| UPDATE | centre_admin |
| DELETE | centre_admin |

<a id="t-payment-schedules"></a>
### `payment_schedules`

`6 columns` · `Prototype models it`

Planned instalments — the basis for derived status and reminders.

**Prototype stand-in**

`payments[]` instalments `{id, dueDate, amount}` merged with payment state

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `invoice_id` | uuid FK |  |
| `account_id / centre_id` | uuid FK |  |
| `due_date` | date |  |
| `amount` | numeric |  |
| `sort_order` | int |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre staff; student (self) |
| INSERT | centre_admin |
| UPDATE | centre_admin |
| DELETE | centre_admin |

<a id="t-payments"></a>
### `payments`

`8 columns` · `1 medium` · `2 undocumented` · `Partly modelled`

Manually recorded receipts. No money moves through the portal.

**Prototype stand-in**

Instalment `paidAt / paidBy / method` (`cash | card | bank | cheque`)

**Findings**

- **Medium** — The reference has no correction path: `payments` UPDATE/DELETE are denied and there is no reversal RPC

**In the prototype, not in the reference**

- `unmarkPaid` reverses a recorded payment with a reason, audited (Invoices.jsx:362)
- `cheque` method; one payment settles a whole instalment (no partial receipts)

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `invoice_id` | uuid FK |  |
| `account_id / centre_id` | uuid FK |  |
| `amount` | numeric |  |
| `method` | text | `cash` \| `bank` \| `card_external` |
| `paid_on` | date |  |
| `reference` | text |  |
| `recorded_by` | uuid FK |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre staff; student (self) |
| INSERT | centre_admin via record_payment (audited) |
| UPDATE | — |
| DELETE | — |

<a id="t-invoice-reminders"></a>
### `invoice_reminders`

`7 columns` · `Prototype models it`

Append-only log of reminders sent. Enforces `reminder_cooldown_hours`.

**Prototype stand-in**

`reminders[{id, invoiceId, sentAt, toEmail}]`; cooldown per invoice (Invoices.jsx:424–437)

**Findings**

- **Low** — No `trigger` / `sent_by`

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `invoice_id` | uuid FK |  |
| `account_id / centre_id` | uuid FK |  |
| `to_email` | text |  |
| `trigger` | text | `manual` \| `due_soon` \| `overdue` |
| `sent_by` | uuid FK NULL | Null for cron |
| `sent_at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre_admin |
| INSERT | system via `send_invoice_reminder` (cooldown-checked) |
| UPDATE | — (append-only) |
| DELETE | — |

---

## §9 Communications

*12 tables · 6 with something to fix*

<a id="t-comms-settings"></a>
### `comms_settings`

`11 columns` · `1 high` · `1 medium` · `3 undocumented` · `Prototype models it`

Per-centre messaging policy.

**Prototype stand-in**

`tutoros.comms.v3` `config[centreId]` (mocks/communications.mock.jsx:447)

**Findings**

- **High** — DSL on comms config contradicts decision #15 and the reference note "not fields here"
- **Medium** — `announceAuthors` and `approvalWorkflow` are editable but enforced nowhere; teachers can only post class announcements regardless

**In the prototype, not in the reference**

- `dslLeadId`, `dslDeputyIds[]` — edited in Settings → Communications (Settings.jsx:979)
- `wordlist[]` keyword list instead of `flag_rules` rows
- `announceAuthors` options `admins | senior | all` (Settings.jsx:1052) vs `admins | staff`

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `centre_id` | uuid PK |  |
| `account_id` | uuid FK |  |
| `default_preset` | text | `locked` \| `standard` \| `open` — applying a preset overwrites the next four fields with its values |
| `student_messaging_enabled` | boolean | 1:1 student↔staff messaging |
| `quiet_hours_start / quiet_hours_end` | time |  |
| `images_enabled` | boolean | May images be shared in threads at all. Threads containing a student are **text-only regardless** (see invariants) |
| `dsl_observer` | boolean | Auto-attach DSLs as observers to monitored threads (off only in the `open` preset) |
| `message_retention` | text | `1y` \| `3y` \| `7y` — pg_cron sweep deletes older messages, **except** any attached to an open safeguarding incident |
| `announce_authors` | text | `admins` \| `staff` — who may author centre announcements |
| `approval_workflow` | boolean | Teacher-authored announcements need admin approval before publishing |
| `updated_at` | timestamptz |  |

DSL lead and deputies are `memberships.dsl_role` rows, not fields here.

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre staff |
| INSERT | centre_admin |
| UPDATE | centre_admin |
| DELETE | — |

<a id="t-announcements"></a>
### `announcements`

`12 columns` · `1 medium` · `2 undocumented` · `Prototype models it`

One-to-many broadcast, resolved into receipts on publish. Multi-target audiences live in `announcement_targets`; `centre_id NULL` + platform scope = a superadmin platform-wide announcement.

**Prototype stand-in**

`announcements{id}` (mocks/communications.mock.jsx:61)

**Findings**

- **Medium** — No `status` / `pending_approval` and no approval queue

**In the prototype, not in the reference**

- `priority` `normal | important | urgent` vs `normal | high`
- Denormalised `authorName`, `authorRole`; `scope` also `year | subject`

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `centre_id / account_id` | uuid FK NULL | Null for platform-scope (superadmin) announcements |
| `author_id` | uuid FK |  |
| `title / body` | text |  |
| `priority` | text | `normal` \| `high` |
| `pinned` | boolean | default false |
| `expires_at` | timestamptz NULL | Drops out of feeds after this |
| `ack_required` | boolean |  |
| `publish_at` | timestamptz |  |
| `status` | text | `draft` \| `pending_approval` \| `published` |
| `submitted_by / submitted_at` | uuid FK / timestamptz NULL | Set when a teacher submits under `approval_workflow` |
| `approved_by / approved_at` | uuid FK / timestamptz NULL | `publish_announcement` refuses a teacher-authored announcement without approval when the centre requires it |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre staff; recipients (via receipts) |
| INSERT | centre_admin; teacher when `announce_authors = 'staff'`; superadmin (platform scope) |
| UPDATE | author (draft/pending); centre_admin; approve via RPC |
| DELETE | author (draft); centre_admin |

<a id="t-announcement-targets"></a>
### `announcement_targets`

`5 columns` · `Partly modelled`

Multi-target audience — an announcement may target several centres, roles, year groups, subjects and classes at once.

**Prototype stand-in**

`audience{centreIds, roles, classIds, years[], subjects[]}` jsonb

**Findings**

- **Low** — Divergence already listed
- **Low** — `target_ref` typed "uuid / text" — pick one column type

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `announcement_id` | uuid FK |  |
| `account_id / centre_id` | uuid FK NULL |  |
| `target_type` | text | `platform` \| `centre` \| `role` \| `year` \| `class` \| `subject` — year and subject resolve through classes |
| `target_ref` | uuid / text NULL | Points at the matching entity; null for platform/centre-wide |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | as announcements |
| INSERT | author; centre_admin |
| UPDATE | author; centre_admin |
| DELETE | author; centre_admin |

<a id="t-announcement-receipts"></a>
### `announcement_receipts`

`5 columns` · `Prototype models it`

Per-recipient read/ack row.

**Prototype stand-in**

`reads{userId: at}`, `acks{userId: at}` maps

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `announcement_id` | uuid FK |  |
| `account_id / centre_id` | uuid FK |  |
| `recipient_id` | uuid FK |  |
| `read_at / acknowledged_at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | recipient (self); author; centre_admin |
| INSERT | system (publish) |
| UPDATE | recipient (read/ack) |
| DELETE | — |

<a id="t-conversations"></a>
### `conversations`

`9 columns` · `1 medium` · `3 undocumented` · `Prototype models it`

A message thread. Staff↔student threads are DSL-observed.

**Prototype stand-in**

Threads `{type dm | group | channel, participants[], classId, subject, createdBy, lastMessageAt, monitored?}`

**Findings**

- **Medium** — Reference INSERT is "staff (RPC)" only — student-initiated threads are undefined

**In the prototype, not in the reference**

- Students start DMs with their teachers or admins (seed threads `createdBy` a student; `canMessage`, Communications.jsx:244)
- Teachers may DM only students who share a class — the reference has no who-may-message-whom matrix
- `monitored` derived at read time when not stamped (Communications.jsx:156)

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `centre_id / account_id` | uuid FK |  |
| `kind` | text | `direct` \| `group` \| `channel` (class-wide, bound to `class_id`) |
| `class_id` | uuid FK NULL | For `channel` |
| `preset` | text | `locked` \| `standard` \| `open` |
| `subject` | text |  |
| `created_by` | uuid FK |  |
| `monitored` | boolean | **Stamped at creation and immutable** (trigger rejects updates): true when participants cross student↔staff. Honoured before re-deriving from participants, so a monitored thread can never be un-monitored by a participant change |
| `dsl_observed` | boolean | DSL observers attached (from `comms_settings.dsl_observer` at creation) |

**Minor-safety invariants (trigger/RLS, not UI):** a thread with any student participant is text-only — `messages.file_id` must be null; adding a student to an existing thread stamps `monitored = true` if not already.

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | participants; is_dsl (observed threads) |
| INSERT | staff (RPC, preset-checked) |
| UPDATE | participants (limited) |
| DELETE | centre_admin |

<a id="t-conversation-participants"></a>
### `conversation_participants`

`7 columns` · `Partly modelled`

Membership + read state (`last_read_at` holds unread logic).

**Prototype stand-in**

`participants[]` ids; read state is per message (`readBy`)

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `conversation_id` | uuid FK |  |
| `account_id / centre_id` | uuid FK |  |
| `profile_id` | uuid FK |  |
| `role_in_convo` | text | `member` \| `observer` |
| `last_read_at` | timestamptz |  |
| `joined_at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | participants; is_dsl |
| INSERT | system (RPC) |
| UPDATE | self (last_read_at) |
| DELETE | centre_admin |

<a id="t-messages"></a>
### `messages`

`7 columns` · `1 high` · `1 medium` · `2 undocumented` · `Prototype models it`

A single message. Sending = INSERT; triggers flag + broadcast.

**Prototype stand-in**

`messages{id}` `{threadId, senderId, senderName, senderRole, body, attachments[], createdAt, readBy{}}`

**Findings**

- **High** — Seed contains a student image in a monitored thread (communications.mock.jsx:373) — breaks the text-only invariant the composer enforces (Communications.jsx:1362)
- **Medium** — Reference only flags out-of-hours messages; the prototype blocks them. Decide which

**In the prototype, not in the reference**

- Multiple `attachments[]` vs one `file_id`
- Students cannot send during quiet hours, or in DMs when 1:1 messaging is off (Communications.jsx:1284–1285)

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `conversation_id` | uuid FK |  |
| `account_id / centre_id` | uuid FK |  |
| `sender_id` | uuid FK |  |
| `body` | text |  |
| `file_id` | uuid FK |  |
| `edited_at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | participants; is_dsl |
| INSERT | participant (INSERT — RLS checks membership) |
| UPDATE | sender (edit window) |
| DELETE | — |

<a id="t-message-flags"></a>
### `message_flags`

`10 columns` · `1 medium` · `1 undocumented` · `Partly modelled`

Safeguarding flag raised by a trigger against `flag_rules`.

**Prototype stand-in**

Computed on read (`computeFlags`, Communications.jsx:188) + `flags{messageId: {status, by, at, note}}`

**Findings**

- **Medium** — `image` reason is unreachable if student threads are text-only and only monitored threads are scanned

**In the prototype, not in the reference**

- Resolution statuses `acknowledged | escalated | resolved`; no `dismissed`

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `message_id` | uuid FK | One flag per message, however many reasons fire |
| `account_id / centre_id` | uuid FK |  |
| `reasons` | text[] | Every reason raised, ordered by severity: `external` \| `keyword` \| `image` \| `out_of_hours` |
| `primary_reason` | text | `reasons[1]` — drives queue ordering |
| `rule_ids` | uuid[] | Matching `flag_rules` rows (empty for built-in detectors) |
| `severity` | text | `low` \| `medium` \| `high` — max over reasons |
| `status` | text | `open` \| `resolved` \| `dismissed` |
| `resolved_by` | uuid FK |  |
| `resolved_at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | is_dsl; centre_admin |
| INSERT | system (trigger) |
| UPDATE | is_dsl (resolve, audited) |
| DELETE | — |

<a id="t-flag-rules"></a>
### `flag_rules`

`7 columns` · `Partly modelled`

Configurable detection rules.

**Prototype stand-in**

Regex detectors `PHONE_RE`, `SOCIAL_RE`, `MEETUP_RE` + `config.wordlist`

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `centre_id / account_id` | uuid FK |  |
| `name` | text |  |
| `pattern_type` | text | `keyword` \| `contact` \| `image` \| `out_of_hours` — `contact` (reason `external`) is three built-in detectors: phone-number pattern, social-handle pattern, meet-up phrasing |
| `pattern` | text NULL | For `keyword` rules |
| `severity` | text |  |
| `active` | boolean |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre_admin; is_dsl |
| INSERT | centre_admin |
| UPDATE | centre_admin |
| DELETE | centre_admin |

<a id="t-safeguarding-incidents"></a>
### `safeguarding_incidents`

`9 columns` · `1 medium` · `Partly modelled`

SPECIAL CATEGORY. DSL concern log, independent of any message.

**Prototype stand-in**

`concerns[{aboutUserId, threadId, reason, level, by, at, note}]` · solo `concerns[{studentId, what, action}]`

**Findings**

- **Low** — Coverage gap already listed
- **Medium** — No staff "raise a concern" button in the centre app (solo only)

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `centre_id / account_id` | uuid FK |  |
| `student_id` | uuid FK |  |
| `raised_by` | uuid FK |  |
| `category` | text |  |
| `severity` | text |  |
| `summary` | text |  |
| `status` | text | `open` \| `monitoring` \| `closed` |
| `opened_at / closed_at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | is_dsl; centre_admin only |
| INSERT | is_dsl; teacher (raise_concern) |
| UPDATE | is_dsl (audited) |
| DELETE | — |

<a id="t-safeguarding-incident-notes"></a>
### `safeguarding_incident_notes`

`6 columns` · `No prototype stand-in`

APPEND-ONLY chronology. Never editable or deletable.

**Prototype stand-in**

None — nothing in the prototype plays this role.

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `incident_id` | uuid FK |  |
| `account_id / centre_id` | uuid FK |  |
| `author_id` | uuid FK |  |
| `note` | text |  |
| `created_at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | is_dsl; centre_admin only |
| INSERT | is_dsl (append-only) |
| UPDATE | — (immutable) |
| DELETE | — |

<a id="t-safeguarding-escalation-contacts"></a>
### `safeguarding_escalation_contacts`

`6 columns` · `Partly modelled`

Where to escalate — local authority designated officer, children's services, police, the centre's own DSL line. Shown beside the concern log.

**Prototype stand-in**

Solo only: `SOLO_ESCALATION [{label, value, phone}]`

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `account_id / centre_id` | uuid FK |  |
| `label` | text | e.g. "LADO", "Children's services (out of hours)" |
| `name` | text NULL |  |
| `phone / email` | text NULL |  |
| `sort_order` | int |  |

**Solo accounts:** the tutor is their own DSL (`dsl_role = 'lead'` on their membership is set at provisioning). The concern log is private to the tutor; Klasio stores the record but never reviews it or escalates on the tutor's behalf. The concern log, guardian and emergency contacts, consents and health/SEN notes are available on **every** plan, including free tiers — safeguarding is never capability-gated.

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre staff |
| INSERT | centre_admin; is_dsl |
| UPDATE | centre_admin; is_dsl |
| DELETE | centre_admin |

---

## §10 Files & storage

*4 tables · 2 with something to fix*

<a id="t-files"></a>
### `files`

`9 columns` · `1 high` · `1 medium` · `Partly modelled`

Metadata for an R2 object. Credentials never reach the client.

**Prototype stand-in**

`tutoros.storage.v1` files `{fileId, accountId, centreId, category, sizeBytes, createdAt, uploadedBy, name}` (mocks/storage.mock.jsx:130)

**Findings**

- **Medium** — No `reports` category in the prototype (Storage.jsx:38–53), though the reference makes it an archive category
- **High** — INSERT "authenticated (via sign-upload)" — sign-upload is a service-role endpoint; an authenticated INSERT policy lets clients create rows directly and skip quota checks

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `account_id / centre_id` | uuid FK |  |
| `bucket_key` | text | R2 object key |
| `filename / content_type` | text |  |
| `size_bytes` | bigint |  |
| `category` | text | `submissions` \| `resources` \| `question_attachments` \| `invoices` \| `reports` \| `avatars` \| `comms_attachments` \| `safeguarding` — set at sign-upload from the destination; drives retention and the storage breakdown |
| `uploaded_by` | uuid FK |  |
| `status` | text | `pending` \| `confirmed` \| `archived` \| `deleted` |
| `confirmed_at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | linked-entity viewers; resource viewers (`resource_can_open`); uploader; centre_admin |
| INSERT | authenticated (via sign-upload) |
| UPDATE | system (confirm, archive) |
| DELETE | uploader; centre_admin — only when the category's retention allows |

<a id="t-file-links"></a>
### `file_links`

`5 columns` · `No prototype stand-in`

Polymorphic attachment of a file to any entity.

**Prototype stand-in**

Attachments are embedded in reports, lesson plans and messages

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `file_id` | uuid FK |  |
| `account_id / centre_id` | uuid FK |  |
| `entity_type` | text | `message` \| `assignment` \| `question` \| `answer` \| `report` \| `student` \| `incident` |
| `entity_id` | uuid |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | entity viewers |
| INSERT | uploader; system |
| UPDATE | — |
| DELETE | uploader; centre_admin |

<a id="t-storage-rollups"></a>
### `storage_rollups`

`5 columns` · `No prototype stand-in`

Per-centre usage against the pooled account quota.

**Prototype stand-in**

Deliberately derived live from file records

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `centre_id` | uuid PK |  |
| `account_id` | uuid FK |  |
| `total_bytes` | bigint |  |
| `file_count` | int |  |
| `updated_at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre staff |
| INSERT | system |
| UPDATE | system (cron) |
| DELETE | — |

<a id="t-storage-addons"></a>
### `storage_addons`

`6 columns` · `1 undocumented` · `Prototype models it`

Purchased add-on storage blocks on top of the plan quota. Effective quota = plan limit + active add-on blocks, pooled or split per `accounts.storage_policy`.

**Prototype stand-in**

`accountOverrides[accountId].addonBlocks`; 100 GB at £5/month (mocks/storage.mock.jsx:25)

**In the prototype, not in the reference**

- Per-plan storage mode defaults (`planModeDefaults`, Storage.jsx:69); per-centre mode splits the account quota evenly — the reference never defines the split rule

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `account_id` | uuid FK |  |
| `blocks` | int | Number of add-on blocks — block size and price come from `plans.limits.storage_addon_block_gb` / `storage_addon_block_price` (100 GB at £5/month on centre plans) |
| `purchased_at` | timestamptz |  |
| `stripe_ref` | text |  |
| `status` | text | `active` \| `cancelled` |

**Retention lock:** delete flows respect statutory retention — files linked to safeguarding records are tombstoned, never hard-deleted, regardless of quota pressure. **R2 connection config** (bucket, region, jurisdiction, key id) is platform infrastructure configuration (environment/secrets), not a tenant table.

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | account_owner; superadmin |
| INSERT | system (webhook) |
| UPDATE | system |
| DELETE | — |

---

## §11 Platform & operations

*18 tables · 10 with something to fix*

<a id="t-centre-settings"></a>
### `centre_settings`

`8 columns` · `1 critical` · `2 undocumented` · `Partly modelled`

Per-centre presentation-level config. Anything an invariant or policy reads lives in a typed domain settings row instead (see Conventions).

**Prototype stand-in**

Branding: `CENTRE_PROFILES` + `settings.admin.centre.brandColor/website` · setup: subscription centre `setup{}` · teaching defaults: `settings.teacher.teaching`

**Findings**

- **Critical** — Reference reads `features.show_rank_to_students` in a view and `features.teacher_reads_health` in RLS — both from this jsonb "presentation" row. That contradicts decision #33 and leaves Art. 9 access on an unaudited toggle
- **Low** — Neither feature toggle is prototyped

**In the prototype, not in the reference**

- Teaching defaults are per teacher, not per centre, and add `gradingScale`, `releaseAfterApproval`, `notifyOnSubmission`
- `website` field

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `centre_id` | uuid PK |  |
| `account_id` | uuid FK |  |
| `branding` | jsonb | Logo file, accent, contact block, website |
| `grading_defaults` | jsonb | Default grade scale per level |
| `teaching_defaults` | jsonb | New-assignment defaults: `attempts_allowed`, `due_days`, `allow_late`, `auto_grade_mcq`, `allow_review`, `hide_marks_until_released` |
| `features` | jsonb | Centre toggles. Named keys: `show_rank_to_students` (default **false**, AADC), `teacher_reads_health` (default false) |
| `setup` | jsonb | Setup checklist state `{invite, students, classes}` driving the "needs setup" drawer — completion is derived where possible, this stores dismissals |
| `updated_at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre staff |
| INSERT | centre_admin |
| UPDATE | centre_admin |
| DELETE | — |

<a id="t-audit-log"></a>
### `audit_log`

`10 columns` · `1 high` · `Partly modelled`

APPEND-ONLY. Payments, flags, role changes, welfare edits all land here. The single sink for centre, platform and onboarding audit — domain tables (`attendance_amendments`, `invoice_reminders`, `resource_access_log`, `register_unlocks`) hold domain history; `audit_log` records who did what.

**Prototype stand-in**

`tutoros.audit.v1` (klasioAudit, capped 500, centreMetrics.jsx:218) · `tutoros.saudit.v1` · onboarding `roleLog` · invoice audit · resources `accessLog` · report `history[]`

**Findings**

- **Low** — Multiple logs (divergence already listed); `tutoros.audit.v1` is capped, so not append-only
- **High** — `audit_log` is not in Phase 1's table list, yet Phase 1 RPCs are audited and Phase 14 says its columns are "created in Phase 1"

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `account_id / centre_id` | uuid FK NULL | Null for platform-level actions |
| `actor_id` | uuid FK NULL | Null for system actions |
| `actor_role` | text | `superadmin` \| `account_owner` \| `centre_admin` \| `teacher` \| `student` \| `system` — the role the actor was acting in |
| `ip` | inet NULL |  |
| `support_session_id` | uuid FK NULL | Set when the action happened inside an impersonation session |
| `action` | text |  |
| `entity_type / entity_id` | text / uuid |  |
| `meta` | jsonb |  |
| `created_at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre_admin; account_owner; is_dsl (own scope); superadmin |
| INSERT | system only |
| UPDATE | — (append-only) |
| DELETE | — |

<a id="t-user-preferences"></a>
### `user_preferences`

`14 columns` · `2 undocumented` · `Partly modelled`

Per-user appearance, accessibility and role defaults. AADC-relevant: the accessibility and nudge fields are the evidence for the Phase 16 review.

**Prototype stand-in**

`settings_store_v1[role].appearance` + student `learning` + teacher `hoursFrom/hoursTo` + tracking recents

**In the prototype, not in the reference**

- Accessibility (text size, high contrast, dyslexia font) exposed to students only
- Settings are keyed by role, not by user

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `profile_id` | uuid PK FK |  |
| `theme` | text | `light` \| `dark` \| `system` |
| `compact` | boolean |  |
| `reduce_motion` | boolean |  |
| `language / timezone / date_format / week_start` | text |  |
| `text_size` | text | `normal` \| `large` \| `xlarge` |
| `high_contrast` | boolean |  |
| `dyslexia_font` | boolean |  |
| `streak_nudges` | boolean | default **false** — de-gamified; no loss-aversion nudging. Forced false for under-13s |
| `reminder_lead` | text | How far ahead homework reminders fire |
| `share_with_guardian` | boolean | Student opts in to guardian summaries (guardian receives email only) |
| `working_hours_from / working_hours_to` | time NULL | Staff — suppresses non-urgent notifications outside |
| `recents` | jsonb | Recently opened trackers / reports etc. — convenience only |
| `updated_at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | self |
| INSERT | self |
| UPDATE | self (under-13: `streak_nudges` cannot be set true) |
| DELETE | self |

<a id="t-dashboard-layouts"></a>
### `dashboard_layouts`

`3 columns` · `Prototype models it`

**Prototype stand-in**

`tutoros.dash.admin.v1`, `tutoros.dash.teacher.v1`

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `profile_id / role` | uuid FK / text | PK (profile_id, role) |
| `layout` | jsonb | Card order and visibility |
| `updated_at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | self |
| INSERT | self |
| UPDATE | self (under-13: `streak_nudges` cannot be set true) |
| DELETE | self |

<a id="t-notifications"></a>
### `notifications`

`7 columns` · `Partly modelled`

In-app notification feed (the bell).

**Prototype stand-in**

Derived from comms + `COMMS_ACTIVITY_NOTIFICATIONS` · dismissals in `tutoros.notifs.dismissed.v1`

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `account_id / centre_id` | uuid FK |  |
| `recipient_id` | uuid FK |  |
| `kind` | text |  |
| `title / body` | text |  |
| `entity_type / entity_id` | text / uuid |  |
| `read_at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | recipient (self) |
| INSERT | system |
| UPDATE | recipient (mark read) |
| DELETE | recipient |

<a id="t-notification-prefs"></a>
### `notification_prefs`

`8 columns` · `Partly modelled`

Per-user, per-kind channel opt-in. AADC-safe defaults for under-13s.

**Prototype stand-in**

Flat `{channel, digest, quietHours, announcements, messages, reminders}`; per-class toggles unsaved

**Findings**

- **Low** — Coverage gap already listed

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `profile_id` | uuid FK |  |
| `account_id / centre_id` | uuid FK |  |
| `class_id` | uuid FK NULL | Per-class override for teachers (new submissions, low attendance below 85%, class messages); null = account-wide preference |
| `channel` | text | `in_app` \| `email` |
| `kind` | text |  |
| `enabled` | boolean |  |
| `digest` | text NULL | `instant` \| `daily` \| `weekly` for email |

One resolver: a class-specific row overrides the account-wide row for the same kind + channel. Safeguarding alerts to DSLs cannot be disabled. Under-13 defaults are inserted **off** for every non-critical kind.

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | self |
| INSERT | self (non-critical kinds only; DSL safeguarding alerts cannot be disabled) |
| UPDATE | self |
| DELETE | self |

<a id="t-plans"></a>
### `plans`

`10 columns` · `2 medium` · `2 undocumented` · `Partly modelled`

GLOBAL catalogue — no tenant columns. Superadmin-managed.

**Prototype stand-in**

`tutoros.plans.v1` `{id, name, price, maxCentres, studentSeats, teacherSeats, storageGb, order, archived, features[]}` + duplicate `PLANS` global · solo `TIERS` + `CAPABILITIES`

**Findings**

- **Medium** — `limits.seats` is undefined (staff? total? per centre?) next to `max_students`
- **Medium** — Centre plans have no `audience`, `price_yearly` or capabilities; solo tiers carry 12 capability keys, the reference lists 13 (`resources` is extra and assigned to no tier)

**In the prototype, not in the reference**

- Separate `studentSeats` and `teacherSeats` — labelled "per centre" in the editor (Plans.jsx:372) but pooled across centres on the Centres page (Centres.jsx:458)
- Marketing `features[]` strings; `archived` flag

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `code` | text | e.g. `starter`, `growth`, `scale`, `solo_free`, `solo_core`, `solo_pro` |
| `audience` | text | `centre` \| `solo` — only plans matching `accounts.kind` are offered |
| `name` | text |  |
| `tagline` | text NULL | Plan-card audience line |
| `price_monthly / price_yearly` | numeric | Yearly may be discounted (e.g. two months free) |
| `sort_order` | int | Ascending tier order — the **only** thing "upgrade/downgrade" compares |
| `limits` | jsonb | Numeric caps: `seats`, `centres`, `storage_bytes`, `max_students`, `max_invoices_per_month` (null = unlimited), `storage_addon_block_gb`, `storage_addon_block_price` |
| `capabilities` | jsonb | Flat boolean keys that gate surfaces: `group_lessons`, `lesson_planner`, `tracking`, `homework`, `homework_bank`, `reports`, `report_rules`, `at_risk_flags`, `payment_reminders`, `vat`, `analytics_exports`, `waiting_list`, `resources` |
| `active` | boolean |  |

**Capability rule:** application code and RLS ask *"does this account's plan grant capability X / what is limit Y"* (`plan_capability(account, key)`, `plan_limit(account, key)`) — **nothing ever compares a plan code**. Limits are enforced in the write path (e.g. `enrol_student` refuses above `max_students`; invoice issue refuses above `max_invoices_per_month`). Safeguarding, guardian/emergency contacts, consents and health records are never behind a capability.

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | all authenticated (read); superadmin |
| INSERT | superadmin |
| UPDATE | superadmin |
| DELETE | superadmin |

<a id="t-subscriptions"></a>
### `subscriptions`

`12 columns` · `1 high` · `Partly modelled`

Account ↔ plan, mirrored from Stripe via webhook.

**Prototype stand-in**

Subscription `{planId, ownerUserId, billing{}, redeemedCode, trial{days, planId, startedAt, endsAt, onEnd}, centres[]}`

**Findings**

- **Low** — No billing cycle on centre subscriptions (solo has a monthly/yearly toggle); no pause
- **High** — Table arrives in Phase 13, but Phase 1 signup already stamps the trial onto a subscription

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `account_id` | uuid FK |  |
| `plan_id` | uuid FK |  |
| `billing_cycle` | text | `monthly` \| `yearly` |
| `stripe_customer_id / stripe_subscription_id` | text |  |
| `status` | text | `trialing` \| `active` \| `past_due` \| `paused` \| `cancelled` |
| `trial_days / trial_plan_id` | int / uuid FK NULL | **Stamped at signup** from `platform_settings` — later changes to the platform offer never retro-apply |
| `trial_started_at / trial_ends_at` | timestamptz NULL |  |
| `trial_on_end` | text NULL | `bill` \| `downgrade` \| `suspend` |
| `paused_from / paused_until` | date NULL | Seasonal pause (e.g. summer) instead of cancelling; Stripe pause-collection mirrored |
| `redeemed_code_id` | uuid FK NULL | → plan_codes.id — the override code applied to this subscription, if any |
| `current_period_end` | timestamptz |  |

A global free trial (`platform_settings.trial_*`) is a different mechanism from a redeemable `plan_codes.kind = 'free_trial'` code: the first applies to every new signup, the second only to accounts that redeem it.

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | account_owner; superadmin |
| INSERT | system (webhook) |
| UPDATE | system (webhook) |
| DELETE | — |

<a id="t-plan-codes"></a>
### `plan_codes`

`8 columns` · `2 undocumented` · `Prototype models it`

Superadmin-managed price-override codes (free trial / percent off / fixed price).

**Prototype stand-in**

`tutoros.plancodes.v1` `{code, kind, value, durationMonths, planId, maxRedemptions, redemptions[], status, note, createdAt}`

**In the prototype, not in the reference**

- `planId` — restrict a code to one plan
- `note`; free_trial codes store `value: 0` (reference says null)

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `code` | text UNIQUE |  |
| `kind` | text | `free_trial` \| `percent_off` \| `fixed_price` |
| `value` | numeric | Percent or fixed amount; null for free_trial |
| `duration_months` | int | How long the override applies |
| `max_redemptions` | int NULL |  |
| `active` | boolean |  |
| `created_by` | uuid FK |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | superadmin |
| INSERT | superadmin |
| UPDATE | superadmin |
| DELETE | superadmin |

<a id="t-plan-code-redemptions"></a>
### `plan_code_redemptions`

`5 columns` · `Prototype models it`

Redemption log.

**Prototype stand-in**

Embedded `redemptions[{account, at}]`

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `plan_code_id` | uuid FK |  |
| `subscription_id` | uuid FK |  |
| `account_id` | uuid FK |  |
| `redeemed_at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | superadmin; account_owner (own) |
| INSERT | system (redeem RPC) |
| UPDATE | — |
| DELETE | — |

<a id="t-feature-flags"></a>
### `feature_flags`

`9 columns` · `1 medium` · `1 undocumented` · `Partly modelled`

Product rollout flags — per account, cohort or plan. Platform-wide operational switches are **not** flags; they live in `platform_settings`.

**Prototype stand-in**

`SA_FLAGS {id, desc, on, scope, coverage}` in page state (SuperAdmin.jsx:2305)

**Findings**

- **Medium** — `scope: 'Scale only'` gates by plan code (decision #25); `parent_payments` already listed
- **Low** — `v_account_flags` / `flag_enabled()` are referenced but missing from the helper table and the plan

**In the prototype, not in the reference**

- Flags for features absent from the plan: `mobile_offline`, `gradebook_export`, `multi_currency`, `lesson_planner_beta`

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `key` | text UNIQUE | e.g. `hw_auto_marking`, `reports_v2` |
| `description` | text |  |
| `scope` | text | `global` \| `opt_in` \| `beta_cohort` \| `plan_gated` |
| `enabled` | boolean | Master switch |
| `rollout_pct` | int NULL | 0–100, deterministic by account id hash |
| `min_plan_sort_order` | int NULL | For `plan_gated` — compares `plans.sort_order`, never a plan code |
| `targeting` | jsonb | Explicit account allow/deny lists for `opt_in` / `beta_cohort` |
| `updated_by / updated_at` | uuid FK / timestamptz |  |

The effective flag for an account is derived (`v_account_flags` / `flag_enabled(account, key)`); per-account overrides are the `targeting` lists, not extra rows.

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | superadmin (accounts read effective values via `v_account_flags`) |
| INSERT | superadmin |
| UPDATE | superadmin (audited) |
| DELETE | superadmin |

<a id="t-platform-settings"></a>
### `platform_settings`

`13 columns` · `2 medium` · `1 undocumented` · `Partly modelled`

Single-row table (`id = true` CHECK). Global operational switches and superadmin defaults.

**Prototype stand-in**

Split: `tutoros.maintenance` · read-only in page state · signups toggle hard-wired on with a no-op (SuperAdmin.jsx:2347) · status page on System Health (SuperAdmin.jsx:1972) · `tutoros.trial.v1` · `settings.superadmin.platform`

**Findings**

- **Medium** — Divergence row ("local React state on Platform Controls") is only partly true
- **Medium** — Anon read of two columns is column-level — needs a view or RPC

**In the prototype, not in the reference**

- `defaultPlan`, `supportAccess`, `maintenanceNotices`; `autoSuspend` is a boolean, not days (settings.mock.jsx:33)

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | boolean PK | Always true |
| `maintenance_mode` | boolean | Global maintenance banner; writes blocked except superadmin |
| `maintenance_notice` | text NULL | Banner copy |
| `read_only_mode` | boolean | Every centre read-only |
| `signups_enabled` | boolean | Gates `POST /v1/auth/signup` |
| `status_page_public` | boolean |  |
| `trial_enabled / trial_days / trial_plan_id / trial_require_card / trial_on_end` | boolean / int / uuid FK / boolean / text | The one platform-wide free-trial offer, stamped onto each new subscription |
| `default_seats` | int |  |
| `currency` | text | Klasio's own billing currency |
| `billing_email` | text |  |
| `auto_suspend_after_days` | int NULL | Past-due grace before suspension |
| `deleted_account_retention_days` | int |  |
| `updated_by / updated_at` | uuid FK / timestamptz | Changes audited |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | all authenticated (read — maintenance/read-only/signups banners); anon (signups_enabled, status_page_public) |
| INSERT | — (seeded) |
| UPDATE | superadmin (audited) |
| DELETE | — |

<a id="t-support-sessions"></a>
### `support_sessions`

`8 columns` · `1 high` · `1 medium` · `Partly modelled`

Superadmin impersonation, time-boxed and visible to the tenant. Support itself is by email (decision #30) — there is no ticket system; a session references the email thread.

**Prototype stand-in**

`tutoros.impersonation.v1` `{accountId, accountName, role, at}`; audit rows on enter/exit (SuperAdmin.jsx:358)

**Findings**

- **Medium** — No expiry, reason or support reference, and no tenant-side banner; the code comment says "scoped to a support ticket" (decision #30 says email)
- **High** — Helper `in_support_session()` is introduced in no plan phase

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `account_id` | uuid FK |  |
| `centre_id` | uuid FK NULL | Narrowest scope granted |
| `superadmin_id` | uuid FK |  |
| `support_ref` | text | Support email thread / reference the tenant can recognise |
| `reason` | text |  |
| `started_at / expires_at` | timestamptz | Max 60 minutes |
| `ended_at` | timestamptz NULL |  |

While a session is active the tenant's admins see an impersonation banner and the session in their audit log; every action inside it carries `audit_log.support_session_id`. Safeguarding incidents and health records stay unreadable inside a support session.

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | superadmin; account_owner + centre_admin (own account) |
| INSERT | superadmin via `start_support_session` (audited) |
| UPDATE | superadmin (end, audited) |
| DELETE | — |

<a id="t-billing-events"></a>
### `billing_events`

`10 columns` · `1 undocumented` · `Prototype models it`

Mirror of Stripe invoice/charge/subscription events — Klasio's own revenue ledger (upgrades, new, add-ons, renewals, refunds) and the failed-payment / dunning queue. Idempotent via `processed_events`.

**Prototype stand-in**

`SA_TXNS {accountId, type, amount, date, desc}` + `SA_FAILED_PAYMENTS {attempts, state}`

**In the prototype, not in the reference**

- Seat add-on transactions ("14 student seats") — no seat add-on model exists, only storage add-ons

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `account_id` | uuid FK |  |
| `stripe_event_id` | text UNIQUE |  |
| `type` | text | `new` \| `upgrade` \| `downgrade` \| `addon` \| `renewal` \| `refund` \| `payment_failed` |
| `amount` | numeric | Signed |
| `currency` | text |  |
| `dunning_state` | text NULL | `retrying` \| `card_expired` \| `failed` — for `payment_failed` |
| `attempt_count` | int NULL |  |
| `description` | text |  |
| `occurred_at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | superadmin; account_owner (own account) |
| INSERT | system (Stripe webhook) |
| UPDATE | — (append-only) |
| DELETE | — |

<a id="t-data-requests"></a>
### `data_requests`

`11 columns` · `Partly modelled`

Tracks SAR / erasure lifecycle for GDPR compliance, against the statutory clock.

**Prototype stand-in**

`SA_DSAR {kind export | delete, requester, subject, received, deadline, status in_progress | awaiting | fulfilled}` (static)

**Findings**

- **Low** — Enum mismatch with `sar | erasure` and `open | in_progress | completed | refused`

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `account_id / centre_id` | uuid FK |  |
| `subject_profile_id` | uuid FK NULL | Null when the request covers a whole account |
| `kind` | text | `sar` \| `erasure` |
| `status` | text | `open` \| `in_progress` \| `completed` \| `refused` |
| `requested_by` | uuid FK NULL |  |
| `requester_note` | text | Who asked, in their words (e.g. "parent · EduFirst") |
| `received_at` | timestamptz |  |
| `due_at` | timestamptz | **Statutory deadline** — `received_at + 1 month`, extendable with a recorded reason |
| `extension_reason` | text NULL |  |
| `completed_at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre_admin; account_owner; superadmin |
| INSERT | centre_admin; superadmin |
| UPDATE | system; superadmin |
| DELETE | — |

<a id="t-processed-events"></a>
### `processed_events`

`4 columns` · `No prototype stand-in`

Idempotency store — what makes Stripe/webhook handling exactly-once.

**Prototype stand-in**

None — nothing in the prototype plays this role.

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | Provider event id |
| `provider` | text | `stripe` \| `resend` |
| `kind` | text |  |
| `processed_at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | — (service-role only) |
| INSERT | service-role |
| UPDATE | — |
| DELETE | — |

<a id="t-email-outbox"></a>
### `email_outbox`

`9 columns` · `No prototype stand-in`

The only thing the mail worker reads. Nothing else calls Resend.

**Prototype stand-in**

None — nothing in the prototype plays this role.

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `account_id / centre_id` | uuid FK |  |
| `template_key` | text |  |
| `to_email` | text |  |
| `payload` | jsonb |  |
| `status` | text | `queued` \| `sent` \| `failed` \| `suppressed` |
| `attempts` | int |  |
| `last_error` | text |  |
| `scheduled_for / sent_at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | — (service-role only) |
| INSERT | system (triggers/cron) |
| UPDATE | worker (service-role) |
| DELETE | — |

<a id="t-email-suppressions"></a>
### `email_suppressions`

`3 columns` · `No prototype stand-in`

Hard-bounce / complaint blocklist checked at enqueue time.

**Prototype stand-in**

None — nothing in the prototype plays this role.

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `email` | text PK |  |
| `reason` | text | `hard_bounce` \| `complaint` \| `unsubscribe` |
| `created_at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | — (service-role only) |
| INSERT | system (webhook) |
| UPDATE | — |
| DELETE | service-role |

---

## §12 Resources (Materials library)

*6 tables · 1 with something to fix*

<a id="t-resources"></a>
### `resources`

`14 columns` · `2 undocumented` · `Prototype models it`

**Prototype stand-in**

`klasio.resources.v2` resources[] (Resources.jsx:197)

**In the prototype, not in the reference**

- `size` stored on the row (no `file_id`); `subject` name
- Staff directory `RES_STAFF` with `active` flags lives inside the resources store and drives offboarding

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `account_id / centre_id` | uuid FK |  |
| `file_id` | uuid FK NULL | → files.id (`category = 'resources'`). Null for `type = 'link'` |
| `title` | text |  |
| `description` | text |  |
| `type` | text | `worksheet` \| `mark_scheme` \| `slides` \| `notes` \| `past_paper` \| `revision` \| `video` \| `link` \| `other` |
| `subject_id` | uuid FK NULL |  |
| `year_group` | text NULL | From `class_dimensions` (kind = year_group) |
| `level` | text NULL | **Derived from `year_group` when null** — one resolver so facet, row meta and form agree |
| `exam_board` | text NULL | From `class_dimensions` (kind = exam_board); `'None'` is a real value |
| `created_by` | uuid FK | → profiles.id. **Ownership never transfers**, including at offboarding |
| `visibility` | text | `centre` \| `on_request` \| `private` |
| `url` | text NULL | For `link` |
| `created_at / updated_at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | creator; centre staff per the §12 predicate (row visible for `centre`/`on_request`, not `private`); centre_admin (all rows; opening `private` is audited) |
| INSERT | teacher; centre_admin |
| UPDATE | creator; centre_admin |
| DELETE | creator; centre_admin |

<a id="t-resource-shares"></a>
### `resource_shares`

`4 columns` · `Prototype models it`

An explicit grant of read access to one staff member. Idempotent.

**Prototype stand-in**

`shares[{resource_id, staff_id, granted_by, granted_at}]`

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `resource_id / staff_id` | uuid FK | PK (resource_id, staff_id) |
| `account_id / centre_id` | uuid FK |  |
| `granted_by` | uuid FK | The creator, or the approver of a request |
| `granted_at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | creator; grantee; centre_admin |
| INSERT | creator; centre_admin; system (on approve) |
| UPDATE | — |
| DELETE | creator; centre_admin |

<a id="t-resource-access-requests"></a>
### `resource_access_requests`

`8 columns` · `Prototype models it`

"May I open this?" against an `on_request` resource. Approval creates the share in the same transaction.

**Prototype stand-in**

`requests[{id, resource_id, requested_by, note, status, decided_by, decided_at}]`

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `resource_id` | uuid FK |  |
| `account_id / centre_id` | uuid FK |  |
| `requested_by` | uuid FK |  |
| `note` | text | Reason shown to the approver |
| `status` | text | `pending` \| `approved` \| `declined` |
| `decided_by / decided_at` | uuid FK / timestamptz NULL |  |
| `UNIQUE partial` | (resource_id, requested_by) WHERE status = 'pending' | One open request per person per resource |

**Approver routing is derived, never stored:** the creator approves while their membership is active; once deactivated it falls to any centre admin. No reassignment step at offboarding.

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | requester; derived approver; centre_admin |
| INSERT | teacher (self) |
| UPDATE | approver via `decide_access_request` (audited) |
| DELETE | — |

<a id="t-resource-links"></a>
### `resource_links`

`10 columns` · `Prototype models it`

A **pointer** attaching a resource to a teaching context. Nothing is copied.

**Prototype stand-in**

`links[{id, resource_id, context_type, context_id, student_visible, visible_from, attached_by, attached_at}]`

**Findings**

- **Low** — `context_type` is `homework` in the prototype, `assignment` in the reference

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `resource_id` | uuid FK |  |
| `account_id / centre_id` | uuid FK |  |
| `context_type` | text | `lesson_plan` \| `assignment` |
| `context_id` | uuid |  |
| `student_visible` | boolean | Default from the type: `mark_scheme` and `past_paper` default **false**, all others true |
| `visible_from` | timestamptz NULL | Release schedule — e.g. hide a mark scheme until after the deadline |
| `attached_by` | uuid FK |  |
| `attached_at` | timestamptz |  |
| `UNIQUE` | (resource_id, context_type, context_id) | Attaching twice is a no-op |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | context viewers; students **only** when `student_visible` and `visible_from` elapsed |
| INSERT | teacher (own contexts) |
| UPDATE | attacher |
| DELETE | attacher; centre_admin |

<a id="t-resource-usage-events"></a>
### `resource_usage_events`

`7 columns` · `Prototype models it`

Append-only attach history. **Survives detach** — "recently used" ranks on this.

**Prototype stand-in**

`usage_events[{resource_id, user, centre, context_type, context_id, topic, at}]` (capped 500)

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `resource_id` | uuid FK |  |
| `account_id / centre_id` | uuid FK |  |
| `user_id` | uuid FK |  |
| `context_type / context_id` | text / uuid |  |
| `topic` | text | Captured at attach time — deliberately denormalised, the lesson may change topic later |
| `at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre staff |
| INSERT | system (via `attach_resource`) |
| UPDATE | — (append-only) |
| DELETE | — |

<a id="t-resource-access-log"></a>
### `resource_access_log`

`5 columns` · `Prototype models it`

An admin opening a resource they were not shared is a logged action, not a silent read.

**Prototype stand-in**

`accessLog[{resource_id, by, at}]` (capped 200)

**Columns in the reference · none exist in a database**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK |  |
| `resource_id` | uuid FK |  |
| `account_id / centre_id` | uuid FK |  |
| `opened_by` | uuid FK |  |
| `at` | timestamptz |  |

**Row-level security in the reference · no policies exist**

| Operation | Who |
| --- | --- |
| SELECT | centre_admin; account_owner |
| INSERT | system |
| UPDATE | — (append-only) |
| DELETE | — |
