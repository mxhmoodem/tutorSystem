# Klasio — Documentation Reconciliation: Adjudicated Fixes

> The arbiter for discrepancies between the two design documents
> (`docs/Klasio-Data-Layer-Reference.md` v2 + `docs/Klasio-Development-Plan.md`) and the
> prototype. Each item states the ruling, the rationale, and the concrete edit.
>
> **Global rulings (owner-confirmed):**
> - The product name is **Klasio**. Not Klayo, not TutorOS.
> - There are **no AI features anywhere** in the product. Locked decision #12 stands.
>   The Reports system is the successor to the deleted AI-feedback feature.

---

## Part A — Data-Layer Reference edits

### A1. `memberships` — allow multi-role  *(PROTOTYPE WINS — fix before Phase 1; this is the RLS spine)*
- Change `UNIQUE (profile_id, centre_id)` → `UNIQUE (profile_id, centre_id, role)`.
- A person holds >1 role via >1 row. Preserve the dual-role view switch as a product feature.
- Update the RLS helper prose so role checks are `EXISTS (…)` over rows, never `role =` on a single row.

### A2. Ownership — account-level field, not a membership role  *(PROTOTYPE WINS)*
- Remove `account_owner` from the `memberships.role` enum. Roles become: `centre_admin | teacher | student`.
- Add `accounts.owner_profile_id uuid FK → profiles.id NOT NULL`.
- Add RLS helper `is_account_owner(account uuid) → boolean` checking `accounts.owner_profile_id = auth.uid()`.
- Rewrite every RLS-matrix cell that says `account_owner` to use this helper. The owner does not need a membership row at every centre.
- `transfer_ownership` RPC = repoint `owner_profile_id` (single-field mutation, audited). Matches the ownership-transfer runbook: add new identity + MFA first, then repoint, never swap credentials.

### A3. `v_session_state` — restore the natural backfill window  *(PROTOTYPE WINS)*
Correct the `awaiting` definition:
- `awaiting` = `ends_at` (+ grace) has passed, register not submitted, AND (`now < ends_at + backfill_window` OR an active `register_unlocks` grant exists).
- `lapsed` = backfill window passed, no active unlock.
- New centre setting: `register_backfill_hours int default 72`.
- Keep: unlock grant re-derives a lapsed session to `awaiting`; `submit_register` consumes the grant; register re-locks immediately. Submissions during natural backfill are flagged late.

### A4. Remove all AI artefacts  *(OWNER RULING — No AI)*
- Delete the `ai_feedback` table and its RLS-matrix row.
- Remove `ai_marking` from `consents.consent_type`.
- Delete both Homework-AI endpoints (`POST /v1/homework/submissions/:id/draft-feedback` and any sibling).
- Remove the Anthropic API from the stack line in the header.
- Remove the `ai_feedback` row from `supabase/README.md` when committed.

### A5. Family billing + VAT  *(PROTOTYPE WINS)*
- New table `families`: `id, account_id, centre_id, name, created_at`.
- Add `students.family_id uuid FK → families.id NULL`.
- `invoices`: replace `student_id` with `family_id uuid FK NOT NULL`. `invoice_lines` gain `student_id` so lines attribute to individual siblings.
- Billing contact resolution: primary `is_billing_contact` guardian of any student in the family; document the tie-break (eldest student's primary billing guardian) or add `families.billing_guardian_id`.
- VAT: `centres.vat_registered boolean default false`, `centres.vat_number text`, `centres.default_vat_rate numeric`. `invoice_lines.vat_rate numeric`, with `vat_amount`, invoice `subtotal / vat_total / total` **derived at read time** (derive-don't-store).
- RLS rows for `families`: read = centre staff + student (own family); write = centre_admin.

### A6. Define `groups` / `group_members`  *(DOC BUG — tables referenced but undefined)*
- `groups`: `id, account_id, centre_id, name, description, created_by, created_at`.
- `group_members`: `id, group_id FK, student_id FK, added_by, added_at`, `UNIQUE (group_id, student_id)`.
- Add RLS matrix rows: read = centre staff; write = centre_admin (and teacher if a centre setting allows); delete = centre_admin.
- Note that Phase 5 of the dev plan ships them.

### A7. DSL lead + deputy  *(PROTOTYPE WINS, refined)*
- Replace `memberships.is_dsl boolean` with `memberships.dsl_role text NULL` — `'lead' | 'deputy'`.
- Partial unique index: at most one `'lead'` per centre.
- RLS helper `is_dsl(centre)` = `dsl_role IS NOT NULL`. All existing DSL policies unchanged in effect.

### A8. Product name  *(OWNER RULING)*
- Rename document title and every occurrence: **Klasio**.
- Note in the doc: prototype `tutoros.*` storage keys are legacy; production keys are `klasio.*` (one-shot migration at cutover, not piecemeal).

### A9. `terms.is_active`  *(DOC WINS — deliberate exception)*
- Keep the flag + partial unique index + audited `set_active_term` RPC.
- Add an explicit note: this is a **deliberate divergence from derive-don't-store**, because "current term" is a business designation — date-derivation is ambiguous during half-terms/holidays and caused the active-term incoherence the flag fixes. The prototype's `resolveActiveTerm` date-derivation is superseded.

### A10. Timesheets — manual non-teaching work  *(PROTOTYPE WINS)*
- Add `timesheet_entries.type text` — `teaching | prep | marking | meeting | training | cover`.
- Rule: `type = 'teaching'` rows are **system-derived only** (from `submit_register`); all other types may be inserted manually by the teacher (self) subject to approval.
- Statuses: `draft | submitted | approved | rejected | exported`. Drop `paid` — a ledger-only platform does not assert payroll payment; `exported` marks the CSV hand-off.
- Update the RLS row: teacher INSERT allowed for non-teaching types (enforced by policy predicate), system INSERT for teaching.

### A11. New columns / small models  *(PROTOTYPE WINS — all confirmed to add)*
- `centres.code text UNIQUE` — student login by centre-code + username.
- **Student claim provisioning**: new table `student_claims` (do not shoehorn into `invitations`): `id, student_id FK, account_id, centre_id, claim_code text UNIQUE, synthetic_email text, setup_method text, printed_at, claimed_at, expires_at, created_by`. Slip PDF rendered via the files pipeline.
- **Cover teacher**: new table `class_cover`: `id, class_id FK, cover_teacher_id FK → profiles.id, starts_on date, ends_on date, reason text, created_by, created_at`. Effective teacher is **derived** per session date (`v_effective_teacher` or folded into session views) — no stored `coverActive` flag. Schedule views render the cover teacher within the range.
- **Announcements**: add `priority text (normal|high)`, `pinned boolean`, `expires_at timestamptz NULL`; replace single `scope_type/scope_ref` with `audience jsonb` (`{centreIds[], roles[], classIds[], groupIds[]}`) or a child `announcement_targets` table (prefer the child table — RLS-friendlier); add `platform` scope for superadmin announcements.
- **Plan override codes**: `plan_codes` (`id, code UNIQUE, kind free_trial|percent_off|fixed_price, value, duration_months, max_redemptions, active, created_by`) + `plan_code_redemptions` (`id, plan_code_id, subscription_id, redeemed_at`). Add `subscriptions.redeemed_code_id FK NULL`. Superadmin-managed.
- **Storage**: `storage_addons` (`id, account_id, blocks int, purchased_at, stripe_ref`); `accounts.storage_policy text (pooled|split)`; retention-lock note on delete flows. R2 connection config (bucket/region/keys) is **platform infrastructure config** (env/secrets), not a tenant table — state this explicitly.
- **Maintenance mode**: a `platform_settings` (or `feature_flags`) row — say so explicitly in the doc.
- **Subjects & class dimensions**: add `subjects.level text`, `subjects.description text`; add per-centre lookup tables `year_groups`, `levels`, `exam_boards` (`id, centre_id, name, sort_order`) with centre_admin inline-add, referenced by `classes`.

### A12. New domain — Student Reports & Teacher Feedback  *(THE BIG ONE — flagship, currently zero backend design)*
Design in full (tables + RLS rows + endpoints):
- `report_rules`: `id, account_id, centre_id, target_type (tag|class|student), target_ref uuid/text, requirement, frequency (weekly|fortnightly|monthly|half_termly|termly), template_id FK, priority int, active boolean, created_by`.
- `report_templates`: `id, centre_id, name, structure jsonb (sections/prompts), created_by, updated_at`.
- `rating_scales` + `rating_levels` (the 4-tier taxonomy): scale per centre, ordered levels with label + description.
- `reports`: `id, account_id, centre_id, student_id FK, class_id FK NULL, rule_id FK NULL, template_id FK, author_id FK, period_start, period_end, status (draft|submitted|published), body jsonb, ratings jsonb, published_at, pdf_file_id FK NULL`.
- **Due/upcoming engine is a derived view** (`v_reports_due`) computed from rules × frequency × existing reports — never stored due-flags (derive-don't-store).
- Endpoints: report CRUD via RLS; `POST /v1/reports/:id/pdf` (render → R2, return file ref); optionally `POST /v1/reports/:id/send`.
- RLS: read = author, centre_admin, student (own, `published` only); guardians receive via email only. Write = teacher (own drafts), centre_admin. Publish audited.

### A13. New domain — Tracking (teacher grids)
- `trackers`: `id, account_id, centre_id, class_id FK, name, created_by, created_at`.
- `tracker_columns`: `id, tracker_id FK, name, kind (score|check|text), max_value numeric NULL, sort_order int`.
- `tracker_entries`: `id, tracker_id FK, column_id FK, student_id FK, value jsonb/text, updated_by, updated_at`, `UNIQUE (column_id, student_id)`.
- RLS: teacher (own classes) read/write; centre_admin read; student — no access (internal working data, not published feedback).
- Note: the Hub → Detail redesign (typed columns, keyboard nav, settings slide-over) is the UI spec this backs.

### A14. New domain — Lesson planner (persistence)
- `lesson_plans`: `id, account_id, centre_id, class_id FK, session_id FK NULL, author_id, title, body jsonb, planned_for date, created_at, updated_at`.
- RLS: teacher (own classes), centre_admin read.

---

## Part B — Development Plan edits

1. **Decision #12 stands.** Rewrite Phase 8 as **"Student Reports & Teacher Feedback"** (tables A12, due-engine view, PDF export). Rewrite M1 exit criterion: "Report drafted, published, and PDF delivered" (replacing "AI feedback drafted and approved"). Fix `LandingPage.jsx` — remove the AI feedback engine copy and the AI testimonial (lines ~51/86/123); it violates decision #12 today.
2. Fix the header: "Last updated: Phase 0 (scaffold)" is false — Phase 0 has not started. Set it to the true state ("pre-Phase 0 — prototype only").
3. Fix the cross-reference: `docs/Klayo-Data-Layer-Reference.docx (v2)` → `docs/Klasio-Data-Layer-Reference.md (v2)`, and commit both docs into `docs/` with the Phase 1 scaffold.
4. Phase 14 jobs polling: `POST /v1/jobs/:id` → `GET /v1/jobs/:id` (matches the reference and Phase 15).
5. Rename Phase 12 → **"Analytics Exports"** to kill the naming collision with the product's Reports system.
6. Schedule the unscheduled features:
   - **Reports** → Phase 8 (takes the deleted AI phase's slot — it is the successor feature).
   - **Cover teacher** → the scheduling/attendance phase (small: one table + derived view).
   - **Families + VAT** → Phase 7 (invoicing).
   - **Tracking** and **Lesson planner** → a new slice after Phase 8 (or renumber; they share the "teacher working tools" theme).
   - **Plan override codes** → Phase 13.
   - **Maintenance mode + impersonation banner** → Phase 14 (impersonation half-covered by `start_support_session` — complete it).
   - **Student claim slips + `centres.code`** → the auth/provisioning phase (Phase 1/2).
7. Phase 1 UI list: make "role switcher" explicitly the **multi-role model** (multiple membership rows, dual-role view switch, multi-role Team management) so it isn't built single-role.
8. Note that `provision_account` appearing in Phase 1 and Phase 14 RPC sets is intentional (add the note).
9. **Marketing site discrepancy — needs an owner decision**: the plan's Phase 17 says Astro, but the earlier locked decision was **Next.js**. Settle one and state it. (Default recommendation: keep Next.js as previously decided unless there's a new reason.)
10. Add a preamble naming the prototype + `INVENTORY.md` as the behavioural spec, with this reconciliation document as the arbiter where they conflict.

---

## Part C — Repo fixes outside the docs

1. `vercel.json`: rewrite of `/` → `/TutorOS.html` is stale; entry point is `index.html`. Fix the rewrite (deployed root route is likely broken).
2. Global rename to **Klasio**: `index.html` branding is already Klasio; align both docs, LandingPage copy, and plan the `tutoros.*` → `klasio.*` storage-key migration as a single cutover task (do not rename keys piecemeal in the prototype).
3. `supabase/README.md`: add a status banner ("aspirational — lands with Phase 1"), remove the `ai_feedback` row, park at its future committed path.

---

## Decisions block (defaults chosen)

| # | Decision | Default |
|---|---|---|
| 1 | Register backfill window | 72h, per-centre configurable |
| 2 | Ownership home | `accounts.owner_profile_id` (not subscriptions) |
| 3 | Family billing-contact tie-break | `families.billing_guardian_id` explicit FK |
| 4 | Announcements audience model | Child table `announcement_targets` (not jsonb) |
| 5 | Timesheet terminal status | `exported` (drop `paid`) |
| 6 | DSL model | `memberships.dsl_role enum(lead\|deputy)`, one lead per centre |
| 7 | Students-per-family | `students.family_id` single FK (no join table) |
| 8 | Marketing framework | **Next.js** (per earlier locked decision) — overrides plan's Astro |
| 9 | Tracking student visibility | None (internal working data) |
| 10 | `terms.is_active` | Keep flag — documented deliberate exception to derive-don't-store |
