# Klasio — Prototype ⟶ Docs Gap Analysis

> **What this is.** A line-by-line comparison of the three design documents in `docs/`
> (Data-Layer Reference v3, Development Plan, Reconciliation) against the prototype as it stands
> today (4 Aug 2026). It lists **what the prototype does that the documents do not describe** —
> features shipped since the docs were written (14–16 Jul 2026), plus fields, settings, enums and
> workflows that were never captured.
>
> **Written to be pasted.** Part 1 and Part 2 give table definitions in the Data-Layer Reference's
> own format (Column · Type · Notes), the RLS-matrix rows to add, and the RPCs/endpoints each
> implies. Part 3 adjudicates conflicts. Part 4 is the reverse direction (documented, not built).
> Part 5 is the consolidated edit list. Part 6 is a per-document checklist.
>
> Companion to `INVENTORY.md` (behavioural spec) and `Klasio-Reconciliation.md` (arbiter).

---

## 0. Method, and store-key drift

**Docs read in full:** `Klasio-Data-Layer-Reference.md` (~83 tables, RLS matrix, endpoints, RPCs),
`klasio-development-plan.md` (21 phases, 19 locked decisions), `Klasio-Reconciliation.md` (A1–A14,
B1–B10, C1–C3).

**Prototype read:** every `.jsx` module and `mocks/*.mock.jsx` shape, `index.html` router/nav, every
`localStorage` store key, and the derivation layers (`centreMetrics`, `teacherMetrics`,
`studentData`, `teacherGrades`, `permissions`, `attendance`).

Store keys were enumerated from source, not from `INVENTORY.md` — several have moved on:

| Store | INVENTORY.md says | Actually in code |
|---|---|---|
| Comms | `tutoros.comms.v2` | **`tutoros.comms.v3`** |
| Timesheets | `tutoros.timesheets.v2` | **`tutoros.timesheets.v3`** |
| Resources | `klasio.resources.v1` | **`klasio.resources.v2`** ([Resources.jsx:25](../Resources.jsx#L25)) |
| Lesson plans | in-memory only | **`klasio.lessonPlans.v1`** — now persisted (closes a known gap) |
| — | — | **new:** `tutoros.attendance.v1`, `tutoros.attendance.nowOffset.v1`, `klasio.classBanner.<id>`, `klasio.classStream.<id>`, `klasio.activeStudent`, `tutoros.tracking.recents.v1`, `tutoros.lastCentre`, `klasio.homework.view`, `klasio.resources.{view,sort,bannerDismissed}` |

---

# PART 1 — Whole domains the docs do not have

## 1.1 Resources / Materials library

**Where:** [Resources.jsx](../Resources.jsx) (1,870 lines) · [mocks/resources.mock.jsx](../mocks/resources.mock.jsx)
(~120 seeded files, 14 staff, seeded shares/requests/links/usage) · store `klasio.resources.v2` ·
nav item `resources` for **both** teacher and admin.

**Docs state:** nothing. The reference has `files` (R2 object metadata) and `file_links`
(polymorphic attachment). Neither carries visibility, sharing, requesting, or usage history. No RLS
row, no RPC, no endpoint, no development-plan phase.

**Why `files` is not enough.** `files` answers "what bytes exist and who uploaded them". The
Materials library answers "who may *open* this, who asked, who approved, and where is it used" —
a permission and provenance model that sits *above* storage. The prototype enforces a governing
distinction in code and in comments: **materials are files** and are the only entity in the product
carrying a visibility setting, a share button or a request affordance; teaching records and student
records (progress, tracking, reports, attendance, submissions) never do.

### Tables to add — new domain §12 "Resources (Materials library)"

#### `resources`
*An authored teaching material. The library row; the bytes live in `files`.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id / centre_id | uuid FK | |
| file_id | uuid FK NULL | → files.id. Null for `type = 'link'`, whose content is `url` |
| title | text | |
| description | text | Free text; shown in the row and the detail drawer |
| type | text | `worksheet` \| `mark_scheme` \| `slides` \| `notes` \| `past_paper` \| `revision` \| `video` \| `link` \| `other` |
| subject | text / uuid FK | Prototype stores a name; production should FK → subjects.id |
| year_group | text | Sourced from `class_dimensions` (kind = year_group) |
| level | text NULL | GCSE / A-Level. **Derived from `year_group` when null** — one resolver (`resLevel`) so facet, row meta and form agree |
| exam_board | text | Sourced from `class_dimensions` (kind = exam_board); `'None'` is a real value |
| created_by | uuid FK | → profiles.id. **Ownership never transfers** (see offboarding below) |
| visibility | text | `centre` \| `on_request` \| `private` — the only visibility setting in the product |
| size_bytes | bigint | 0 for `link` rows |
| url | text NULL | For `link` type |
| created_at / updated_at | timestamptz | |

#### `resource_shares`
*An explicit grant of read access to one staff member.*

| Column | Type | Notes |
|---|---|---|
| resource_id | uuid FK | PK part |
| staff_id | uuid FK | PK part → profiles.id |
| account_id / centre_id | uuid FK | |
| granted_by | uuid FK | The owner, or the admin/owner who approved a request |
| granted_at | date | |
| PRIMARY KEY | (resource_id, staff_id) | Share is idempotent — re-sharing is a no-op |

#### `resource_access_requests`
*"May I open this?" against an `on_request` file. Approval **creates a share** in the same transaction.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| resource_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| requested_by | uuid FK | |
| note | text | Free-text reason, shown to the approver |
| status | text | `pending` \| `approved` \| `declined` |
| decided_by | uuid FK NULL | |
| decided_at | date NULL | |
| UNIQUE partial | (resource_id, requested_by) WHERE status = 'pending' | One open request per person per file |

> **Approver routing is derived, never stored** (`resApproverFor`, [Resources.jsx:104](../Resources.jsx#L104)):
> the creator approves **while their membership is active**; if they are deactivated it falls to a
> centre admin. There is no `owner_id` column to maintain and no reassignment step at offboarding.

#### `resource_links`
*A POINTER attaching a resource to a teaching context. Nothing is copied.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| resource_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| context_type | text | `lesson_plan` \| `homework` (extensible) |
| context_id | uuid | The lesson plan / assignment |
| student_visible | boolean | Per-attachment. Default comes from the **type** (`RES_TYPES[].studentDefault`): mark schemes and past papers default **false**, everything else **true** |
| visible_from | timestamptz NULL | Release schedule — hide a mark scheme until after the deadline |
| attached_by | uuid FK | |
| attached_at | date | |
| UNIQUE | (resource_id, context_type, context_id) | Attaching twice is a no-op |

#### `resource_usage_events`
*Append-only attach history. **Survives detach** — this is what "recently used" and "used in N places" rank on.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| resource_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| user_id | uuid FK | Who attached it |
| context_type / context_id | text / uuid | |
| topic | text | Captured at attach time from the context (e.g. "Algebra · Simultaneous equations") — denormalised deliberately, because the lesson plan may later change topic |
| at | timestamptz | |

#### `resource_access_log`
*Decision D4: an admin opening a file they were not shared is a **logged action**, not a silent read.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| resource_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| opened_by | uuid FK | |
| at | timestamptz | |

### The access predicate (this is the RLS spec)

From `resCanOpen` ([Resources.jsx:110](../Resources.jsx#L110)) — note it distinguishes **seeing that
a row exists** from **opening its contents**:

| Viewer | `centre` | `on_request` | `private` |
|---|---|---|---|
| Creator | open | open | open |
| Other staff | open | **row visible, contents blocked** until an approved request → share | **row not visible at all** |
| Centre admin | open | blocked until a request exists, then an audited Override | audited open, written to `resource_access_log` |
| Student | never — students never read this library; they see resources only through a `resource_links` row with `student_visible = true` and `visible_from` elapsed | | |

### RLS matrix rows to add

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| resources | creator; centre staff (per visibility predicate above); centre_admin (audited for private) | teacher; centre_admin | creator; centre_admin | creator; centre_admin |
| resource_shares | creator; the grantee; centre_admin | creator; centre_admin; system (on approve) | — | creator; centre_admin |
| resource_access_requests | requester; the derived approver; centre_admin | teacher (self) | approver via `decide_access_request` | — |
| resource_links | context viewers; students **only** when `student_visible` and `visible_from` elapsed | teacher (own contexts) | attacher | attacher; centre_admin |
| resource_usage_events | centre staff | system (via `attach_resource`) | — (append-only) | — |
| resource_access_log | centre_admin; account_owner | system | — (append-only) | — |

### RPCs / endpoints to add

| Function | Description | Audited |
|---|---|---|
| `share_resource(resource, staff[])` / `unshare_resource(resource, staff)` | Idempotent grant/revoke | — |
| `request_access(resource, note)` | One pending request per person per file | — |
| `decide_access_request(request, approved\|declined)` | On approve, inserts the share in the same transaction | yes |
| `attach_resource(resource, context_type, context_id, {student_visible, visible_from})` | Creates the link **and** the usage event | — |
| `detach_resource(link)` | Removes the pointer; the usage event stays | — |
| `update_resource_link(link, patch)` | Flip `student_visible` / set `visible_from` | — |
| `admin_open_resource(resource)` | The audited Override path; writes `resource_access_log` | yes |
| `release_restricted_to_centre(staff)` | Offboarding: bulk-flip that staff member's `on_request` files to `centre`. **Ownership is never reassigned** | yes |

Files pipeline reuse: upload/download go through the existing
`POST /v1/files/sign-upload` / `sign-download`; `sign-download` must consult the resource predicate
above, not just `file_links`.

### Views

- `v_resource_usage_count` — "used in N places", counted from `resource_links` at read time.
- `v_resource_recent` — ranks by latest `resource_usage_events.at`.
- Neither is a stored rollup. The prototype comment is explicit: *"Used in N places is COUNTED from
  resource_links at render — never stored."*

### Development plan

New slice, alongside or immediately after **Phase 12b (Tracking + Lesson Planner)** — it shares the
"teacher working tools" theme and `resource_links.context_type = 'lesson_plan'` depends on
`lesson_plans` existing. Depends on Phase 2 (files) for the bytes.

---

## 1.2 Class workspace — stream, banner, join code, class-level settings

**Where:** [TeacherPages.jsx:145–960](../TeacherPages.jsx#L145) (`ClassDetailShell`, `ClassStreamTab`,
`ClassSettingsTab`, `ClassBannerCustomiser`, `classJoinCode`, `classLS`); admin `ClassDetailPage`
reuses the same chrome via window exports. Stores: `klasio.classStream.<id>`, `klasio.classBanner.<id>`.

**Docs state:** `announcements` + `announcement_targets` model **centre broadcasts with receipts and
acknowledgement**. The class stream is a different thing: a lightweight per-class feed, no receipts,
no ack, no expiry, authored in-context. `classes` has no join code, no banner, no per-class policy.
`notification_prefs` is per-user × per-kind, not per-user × per-class.

#### `class_posts`
*The class stream. A per-class feed, not a broadcast with receipts.*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| class_id | uuid FK | |
| account_id / centre_id | uuid FK | |
| author_id | uuid FK | Teacher, or a student when `class_settings.students_can_post` |
| body | text | |
| created_at | timestamptz | |
| deleted_at | timestamptz NULL | Soft delete — the teacher deletes posts from the stream |

If comments ship (the toggle exists and defaults **on**): `class_post_comments`
(`id, post_id FK, author_id, body, created_at, deleted_at`).

#### `class_settings`
*Per-class configuration. One row per class.*

| Column | Type | Notes |
|---|---|---|
| class_id | uuid PK FK | |
| account_id / centre_id | uuid FK | |
| banner_theme | text | `default` (derives from the subject colour) \| `indigo` \| `teal` \| `ocean` \| `forest` \| `sunset` \| `plum` \| `slate` — see `CLASS_BANNER_THEMES` ([TeacherPages.jsx:151](../TeacherPages.jsx#L151)) |
| join_code | text UNIQUE | 7 chars. **Currently derived** (`classJoinCode` hashes `id\|group`) — if it becomes a credential it must be stored, rotatable and rate-limited |
| students_can_post | boolean | default false |
| students_can_comment | boolean | default true |
| updated_at | timestamptz | |

> **Open decision — the join code.** Today it is display-only (copy button on the Stream tab).
> If students may self-enrol with it, it becomes an authentication artefact: it needs to be stored
> (not derived), rotatable by the teacher, rate-limited, and paired with an
> `enrol_with_class_code(code)` RPC that respects capacity and the seat cap. **Decide before Phase 3.**

#### `class_notification_prefs`
*Per-teacher, per-class notification opt-ins: new submissions · low-attendance alerts (below 85%) · class messages.*

Either a table (`profile_id, class_id, kind, enabled`) or a nullable `class_id` on the existing
`notification_prefs`. The second is cleaner and keeps one preference resolver.

#### `class_change_requests`
*Teacher → admin. The prototype states the constraint in the UI: "Class scheduling and enrolment are managed by your centre admin."*

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

Currently the request only writes an audit row (`klasioAudit('request_class_change', …)`) and shows
a confirmation — there is no admin inbox. Either add the table + an admin queue, or route it through
`conversations` and delete the affordance.

**RLS:** `class_posts` — read: enrolled students + class staff + centre_admin; insert: class staff,
students only when `students_can_post`; update/delete: author + centre_admin.
`class_settings` — read: class members; write: class teacher + centre_admin.

**Development plan:** Phase 3 (academic core) for `class_settings`; Phase 5 (groups + announcements)
for `class_posts`, since it shares the composer and moderation surface.

---

## 1.3 Platform support desk

**Where:** `SACommsPage` ([SuperAdmin.jsx:1499](../SuperAdmin.jsx#L1499)), seeded by `SA_TICKETS`;
nav item `comms:support` (the superadmin's Communications is Announcements + Support — it has no
Messages surface).

**Docs state:** nothing. "Support" appears once, as `start_support_session` (impersonation).

#### `support_tickets`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | Displayed as a short ref (`#4821`) |
| account_id | uuid FK NULL | The tenant that raised it; null for platform-internal |
| centre_id | uuid FK NULL | |
| subject | text | |
| priority | text | `urgent` \| `high` \| `med` \| `low` |
| status | text | `open` \| `pending` \| `resolved` |
| opened_by | uuid FK | |
| assignee_id | uuid FK NULL | Superadmin or a support queue |
| opened_at / resolved_at | timestamptz | |

Plus `support_ticket_messages` (`id, ticket_id, author_id, body, created_at`) if threads ship.

**RLS:** superadmin full; account_owner/centre_admin read + insert **their own account's** tickets.
Status changes write `audit_log` (the prototype already does: `saAudit({type:'support'})`).

**Why it matters beyond the console.** The prototype's own comment at
[SuperAdmin.jsx:151](../SuperAdmin.jsx#L151) says production impersonation must be *"time-boxed,
scoped to a support ticket, and VISIBLE to the tenant"*. `start_support_session` therefore needs a
`ticket_id` argument — which requires this table to exist. **If the decision is to use an external
helpdesk instead, say so in the plan and drop the `ticket_id` scoping requirement explicitly.**

**Development plan:** Phase 14 (superadmin + privacy), with the impersonation work.

---

## 1.4 Auth security events and lockouts

**Where:** `SASecurityPage` ([SuperAdmin.jsx:1587](../SuperAdmin.jsx#L1587)) renders `SA_SUSPICIOUS`
(`email, attempts, ip, country, time, status: locked|blocked|cleared`) with clear/unlock actions, and
`SA_AUDIT` contains system rows like *"Auto-locked account after 12 failures"*.

**Docs state:** **locked decision #14 says "Postgres owns queuing (outbox), rate limiting, and
lockouts"** — and then no table implements any of it. There is no `auth_events`, no
`login_attempts`, no `lockouts`, no RLS row, no phase. This is a hole in the docs, not merely an
undocumented prototype extra: a locked decision with no schema behind it.

#### `auth_attempts`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| identifier | text | Email, or `centre_code + username` for students — index this |
| account_id / centre_id | uuid FK NULL | Resolved when known |
| ip | inet | |
| country | text NULL | Derived at write time from the IP |
| outcome | text | `success` \| `bad_credentials` \| `locked` \| `blocked` |
| user_agent | text | |
| at | timestamptz | |

#### `account_lockouts`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| identifier | text | |
| account_id / centre_id | uuid FK NULL | |
| reason | text | `failed_attempts` \| `manual` |
| attempt_count | int | |
| locked_at / expires_at | timestamptz | Auto-expiring lock |
| cleared_by / cleared_at | uuid FK / timestamptz | The superadmin "clear" action |

**Views:** `v_suspicious_activity` — the console list, derived by grouping `auth_attempts` over a
window (the prototype's `attempts: 12` is a count, not a stored field).

**RLS:** service-role write; superadmin read; centre_admin read **scoped to their own centre's
identifiers** (a centre admin should see failed logins against their own staff).

**RPCs:** `clear_lockout(identifier)` (audited), `block_identifier(identifier, reason)` (audited).

**Rate limiting** — decision #14 also implies a general limiter with no home. The prototype
rate-limits exactly one thing today: invoice reminders (`reminderCooldownHours`, §2.8). Decide
whether one `rate_limits` table (`key, window_start, count`) serves both, or each surface keeps its
own log.

**Development plan:** Phase 1 (it is the auth spine) with the console UI in Phase 14.

---

# PART 2 — Existing tables missing columns, enums or settings

## 2.1 Register / `sessions` — the settings model is five times wider than documented

**Where:** [mocks/attendance.mock.jsx](../mocks/attendance.mock.jsx) `REGISTER_SETTINGS`, explicitly
labelled *"the future `centre_register_settings` row"*, and consumed by the pure
`deriveSessionState` ([attendance.jsx:52](../attendance.jsx#L52)).

| Prototype setting | Value | Meaning | In docs |
|---|---|---|---|
| `pre_open_window` | 0 min | How long **before** the start time the register opens. Drives the `upcoming → open_live` edge and the "Opens 3:00pm" label | ❌ |
| `grace_window` | `'eod'` | How long after the end the register stays freely takeable. **May be a number of minutes OR the literal `'eod'`** (end of that calendar day) — a union type, not an int | ❌ (prose mentions "grace", no column) |
| `backfill_window` | 48 h | Late-but-allowed window, flagged late | ✅ `centres.register_backfill_hours`, **doc default 72 h vs prototype 48 h** |
| `amendment_window` | 24 h | How long a submitted mark stays teacher-amendable | ⚠️ documented as a fixed 24 h rule, not a setting |
| `require_late_reason` | true | An `awaiting`/backfill submission **requires** a reason note before it can be confirmed | ❌ |

**Write path.** `submit_register` ([attendance.jsx:265](../attendance.jsx#L265)) stores four things
the docs have no column for:

- `late` — whether this submission was inside the backfill window. The reference says
  "natural-backfill submissions are flagged late" but there is nowhere to flag them.
- `note` — the required late reason (D3). Distinct from the per-mark `attendance_records.note`.
- `byAdmin` — an admin backfilling on the teacher's behalf, which is a different accountability
  posture from the teacher submitting late.
- `deliveredBy` — **the adult who actually delivered the session.** Not necessarily the rostered
  teacher and not necessarily the submitter. This is the input to cover/extra pay detection
  (`tsPayFor`, [Timesheets.jsx:124](../Timesheets.jsx#L124)): an entry counts as cover/extra when
  `entry.teacherId !== rosteredTeacherId`. `class_cover` covers *planned, date-ranged* absence;
  this covers *"Tom took my Friday session"* on the day, which never touches `class_cover`.

### Edits

Add a `centre_register_settings` row (or five columns on `centres`):

| Column | Type | Notes |
|---|---|---|
| centre_id | uuid PK FK | |
| pre_open_minutes | int | default 0 |
| grace_window | text | `'eod'` or a minute count as text — or two columns `grace_minutes int NULL` + `grace_eod boolean` |
| backfill_hours | int | default 72 (replaces `centres.register_backfill_hours`, or keep it there) |
| amendment_hours | int | default 24 |
| require_late_reason | boolean | default true |

Add to `sessions`:

| Column | Type | Notes |
|---|---|---|
| register_late | boolean | Set by `submit_register` from the derived state |
| register_note | text NULL | The late reason; NOT NULL enforced when `require_late_reason` and `register_late` |
| register_by_admin | boolean | Admin backfill |
| delivered_by | uuid FK NULL | → profiles.id. The delivering adult; defaults to the submitter |

`v_session_state` must take the settings row as input rather than assuming 72 h, and
`v_effective_teacher` should be documented as *planned* cover only, with `sessions.delivered_by` as
the *actual* delivery record. The timesheet derivation reads the latter.

## 2.2 `questions` — ten types, not six

`QTYPES` ([Homework.jsx:1665](../Homework.jsx#L1665)):

| Prototype type | Marking | In docs |
|---|---|---|
| `mcq` | auto — `correctIndex` | ✅ |
| `multi` | auto — exact set match on `correctIndices`, order-independent | ✅ |
| `truefalse` | auto | ❌ |
| `numeric` | auto — `answer` ± `tolerance` (default 0.01) | ✅ |
| `math` | auto — normalised LaTeX equality (MathLive) | ✅ as `expression` (**name clash**) |
| `fillblank` | auto — **proportional credit**: correct blanks ÷ total × points | ❌ |
| `match` | auto — **proportional credit**: correct pairs ÷ total × points | ❌ |
| `short` | teacher | ✅ as `short_text` |
| `long` | teacher | ✅ as `long_text` |
| `upload` | teacher — the student uploads a photo/file of working | ❌ |

**Auto-marking is deterministic and rule-based** — see `autoMark`
([Homework.jsx:1620](../Homework.jsx#L1620)): every path compares the response against an
answer the teacher entered when authoring the question (`correctIndex`, `correctIndices`, `answer`,
`tolerance`, `blanks[]`, `pairs[]`). There is no model, no inference, no external call.
The docs should state this explicitly the way they already do for `POST /v1/homework/import-pdf`,
so the capability is never mistaken for an AI feature (decision #12).

**Edits:** add `truefalse`, `fillblank`, `match`, `upload` to `questions.type`; pick one vocabulary
for `math`/`expression` and `short`/`long` vs `short_text`/`long_text` and mark the other as legacy;
add `questions.hint text`; document the `config jsonb` payload per type
(`choices[]`/`correctIndex`, `correctIndices[]`, `tolerance`, `blanks[]`, `pairs[]`); and add
`answer` to the `file_links.entity_type` list so `upload` answers can carry a file.

## 2.3 `assignments` / `submissions` / `answers`

| Prototype field | Where | In docs |
|---|---|---|
| `folderId` → coloured **assignment folders** (a file-management rail in the builder) | assignment | ❌ |
| `timeLimitMins` | assignment | ❌ |
| `allowReview` — may the student see the marked paper after return? | assignment | ❌ |
| `classLabel` — assigned to a whole class cohort | assignment | ✅ `assignment_targets` |
| `points`, `hint` per question | question | ✅ `max_marks` / ❌ `hint` |
| `attemptCount` | submission | ❌ (teacher default `attempts` exists in Settings) |
| `isLate` | submission | ❌ — derivable from `submitted_at` vs `due_at`, but the UI treats it as a stored badge |
| `timeSpentMins`, `startedAt` | submission | ❌ |
| `markedAt` | submission | ❌ |
| `overallFeedback` — whole-paper teacher comment | submission | ❌ |
| `classAvg`, `rank`, `classSize` — shown **to the student** | submission | ❌ **AADC-relevant** |
| per-question `marks{}` **and** `feedback{}` | answers | `marks_awarded` ✅ / **feedback ❌** |
| status `not_started \| in_progress \| submitted \| returned` | submission | docs use `marked` where the prototype uses `returned` |

**Edits:** `assignment_folders` (`id, centre_id, name, colour, created_by`);
`assignments.{folder_id, time_limit_mins, allow_review}`;
`submissions.{attempt_count, is_late, time_spent_mins, started_at, marked_at, overall_feedback}`;
`answers.feedback text`; `questions.hint text`.

**Rank exposure.** `rank` / `classSize` are rendered on the student's returned-homework view. Phase
16's AADC review has an explicit "rank exposure" exit criterion — it needs this to be a **named,
centre-toggleable field** (`centre_settings.features.show_rank_to_students`), not an emergent UI
detail. Either model it or remove it.

## 2.4 Reports — the largest field-level divergence

**Where:** [Reports.jsx](../Reports.jsx) (3,311 lines) · [mocks/reports.mock.jsx](../mocks/reports.mock.jsx) ·
store `reports_store_v2`.

### 2.4a `report_rules.requirement` is a semantic collision

| | Prototype | Docs |
|---|---|---|
| `requirement` | `REQUIRED` \| `OPTIONAL` \| `OFF` — an **obligation enum**. Explicitly commented: *"this is CADENCE: must a report be written?"* The due engine **skips `OPTIONAL`** | `requirement text` — "What the report must cover", i.e. free-text guidance to the author |

These are two different concepts sharing one column name. The derived `v_reports_due` view cannot
be built on free text. **Ruling: prototype wins on the column, docs win on the concept** — keep both:

| Column | Type | Notes |
|---|---|---|
| requirement | text | `required` \| `optional` \| `off` — drives `v_reports_due` |
| brief | text NULL | What the report must cover (the docs' original meaning) |

### 2.4b Rule resolution has no documented model

Prototype: a **centre default rule** (`REPORTS_CONFIG.defaultRule` — `{requirement, frequency,
templateId}`) plus override rules targeting a tag / class / student. Resolution is a cascade,
**narrowest target wins**: `student > class > tag > default`; same-level ties break on `priority`
(higher wins); `frequency` may be null when `requirement = 'off'`.

Docs: `report_rules` with `target_type = tag|class|student` and a bare `priority int`. No default
rule, no documented precedence.

**Edits:** add `target_type = 'centre_default'` (or a `centre_report_defaults` row); document the
cascade in the `v_reports_due` section; allow `frequency NULL`.
Frequency: docs include `half_termly`, prototype does not — doc superset, keep it, note the gap.

### 2.4c Centre standards — a publish-time gate with no schema

`REPORTS_CONFIG.centreStandards`: `minCommentLength: 120`, `requireSignature: true`,
`sectionsRequiredEverywhere: ['comments']`. `unmetStandards()`
([Reports.jsx:823](../Reports.jsx#L823)) **blocks publish** until they are met, and the editor shows
a live `123 / 120 chars` counter with a gate banner.

This is a business invariant, not a UI nicety: `publish_report` must enforce it server-side.
Add a `centre_report_standards` row (or `centre_settings.reports`):
`min_comment_length int`, `require_signature boolean`, `sections_required text[]`.

### 2.4d Missing `reports` columns

| Prototype field | Notes | In docs |
|---|---|---|
| `signature` | The **typed teacher signature**, printed alongside the centre countersignature on the PDF. Required when the centre standard demands it | ❌ |
| `status` | `draft` \| `published` \| `archived` (+ `dateArchived`) | docs: `draft \| submitted \| published` — **neither is a superset** |
| `folderId` | Nested folders (`REPORTS_FOLDERS` has `parentId`) | ❌ |
| `tagIds[]` | Report tags (see §2.5) | ❌ |
| `pinned`, `lastViewed` | File-management affordances | ❌ |
| `reportType` | `Termly Progress` \| `Quick Update` — a label distinct from the template | ❌ |
| `predicted` | The predicted grade **snapshotted into the report** at authoring time | ❌ (see §2.6) |
| `acknowledgement {ack, at}` | **The recipient acknowledged the report.** The docs have ack only on announcements | ❌ |
| `history[]` | Per-report chronology: Created / Edited / Published, with actor + timestamp, shown in the drawer | partially — `audit_log` covers it if reports are audited on every edit, not just publish |
| `attachments` | Files attached to a report section | ❌ — needs `file_links.entity_type = 'report'` |
| `academic{}` | `understanding`, `participation`, `homeworkCompletion`, `testPerformance`, `attendance`, `strengths`, `improvements` | ✅ absorbed by `body jsonb` |
| `ratings` + `ratingScale` | ✅ `ratings jsonb` + `rating_scales` | ✅ |

**Edits:** `reports.{signature, folder_id, pinned, last_viewed_at, report_type, predicted_grade,
archived_at, acknowledged_at, acknowledged_by}`; `report_folders` (`id, centre_id, name, parent_id,
colour`); decide the status set (recommend `draft → submitted → published → archived`, and say
whether `submitted` is a real approval step or should be dropped to match the prototype).

### 2.4e Configurable report permissions

`REPORTS_CONFIG.permissions`: `editPublished`, `deleteReports`, `archiveReports`, `exportReports`,
`shareTemplates`, `viewOthers` — **per-centre toggles**. The docs' RLS matrix is fixed
("author (draft); centre_admin; publish via RPC"). Six centre-configurable permissions cannot live
in a static policy: they need `centre_settings.reports.permissions jsonb` read inside the policy
predicate (or a documented ruling that they are fixed and the toggles get removed).
`viewOthers` in particular decides whether a teacher can read another teacher's reports — that is an
RLS predicate, not a UI filter.

### 2.4f Report PDF branding + notifications

`REPORTS_CONFIG.branding`: `pdfTheme (classic|modern|minimal)`, `headerText`, `footerText`,
`signatureName`, `signatureTitle`, `watermark` — with centre identity (name/logo/accent/contact)
resolved **from the centre profile**, not stored here (a good pattern worth documenting).
`REPORTS_CONFIG.notifications`: `dueReminder`, `overdueReminder`, `publishedToStudent`,
`parentNotification` (marked future).

Docs: `centre_settings.branding jsonb`, generic. **Edit:** name the report-PDF branding contract
explicitly in the Reports domain, and add the four notification toggles (they gate `email_outbox`
enqueues and pg_cron reminder sweeps).

## 2.5 Tags — the report-rule target that points at nothing

`report_rules.target_type = 'tag'`, `target_ref` = "tag name". **There is no tags table anywhere in
the reference.**

The prototype has *two* tag systems:

1. **Class tags** — `SEED_CLASSES[].tags[]` (`'GCSE'`, `'A-Level'`, `'Exam Year'`, `'Intervention'`,
   `'1-to-1'`), documented in the mock as *"the generic targeting mechanism for reporting rules …
   a centre that doesn't use year/subject can tag classes however it likes. Year/subject are just
   two possible tag values."*
2. **Report tags** — `REPORTS_TAGS` (`id, label, colour`): Parents' Evening, Mock Prep,
   Intervention, Top Performer, End of Year, SEN Review — applied to individual **reports**
   (`reports.tagIds[]`) for filing and filtering.

They overlap ("Intervention" appears in both) but are stored and used differently.

**Edits:** one `tags` table (`id, account_id, centre_id, name, colour, kind`) + `taggables`
(`tag_id, entity_type ('class'|'student'|'report'), entity_id`, `UNIQUE(tag_id, entity_type,
entity_id)`), and repoint `report_rules.target_ref` at `tags.id` rather than a name string.
Without this, tag-targeted rules are unimplementable and `target_ref` stays dangling.
RLS: read = centre staff; write = centre_admin (teacher for report tags if the centre allows).

## 2.6 Predicted and target grades — on five screens, in zero tables

| Screen | Field |
|---|---|
| Student dashboard | `studentSelf.subjects[].predicted` (A*/A/B) |
| Teacher dashboard / progress | `studentProgress[].predicted` + trend |
| Admin student profile | `A.predictedGrade` **and** `A.targetGrade`, plus per-subject `predicted`/`target`/`onTrack` ([AdminPages.jsx:710](../AdminPages.jsx#L710)) |
| Tracking | a `grade`-typed tracker column ("Predicted") |
| Reports | `reports.predicted`, and templates described as carrying "predicted grades and long-term targets" |

Docs: `results` records actual marks against assessments; `grade_scales`/`grade_bands` give the
taxonomy. **Nothing holds a predicted or target grade.** In the prototype they are deterministically
synthesised from scores, which is why the gap has stayed invisible.

**Edit — `student_targets`:**

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id / centre_id | uuid FK | |
| student_id | uuid FK | |
| subject_id | uuid FK | |
| grade_scale_id | uuid FK | Which taxonomy the labels belong to |
| predicted_grade | text NULL | Teacher's professional judgement |
| target_grade | text NULL | The aspiration |
| set_by | uuid FK | |
| set_on | date | |
| UNIQUE | (student_id, subject_id) | Latest wins; history via `audit_log` |

Alternatively rule that predicted is **derived** from recent results — but then the report snapshot
(`reports.predicted`) still needs a stored copy, because a published report must not change when
later results land.

## 2.7 `tracker_columns` — six kinds, not three

`DEFAULT_TRACKERS` ([mocks/teacherPages.mock.jsx:66](../mocks/teacherPages.mock.jsx#L66)):

| Kind | Payload | In docs |
|---|---|---|
| `score` | number, `max` | ✅ |
| `check` | boolean | ✅ |
| `text` | free text | ✅ |
| `grade` | a grade label resolved through the grade scale ("A*", "B") | ❌ |
| `select` | one of an option list ("High"/"Medium"/"Low") | ❌ |
| `number` | bare number with a `max` (distinct from `score`, which is a mark out of a total) | ❌ |

Also: `trackers.description`; trackers are keyed to a **class group string**, not `class_id`
(production must FK to `classes`); a `tutoros.tracking.recents.v1` recents list (a user preference,
see §3.1).

**Edits:** add `grade`, `select`, `number`; `tracker_columns.options jsonb` (for `select`);
`tracker_columns.grade_scale_id uuid FK NULL` (for `grade`); `trackers.description text`.

## 2.8 Timesheets — the pay-eligibility engine is an undocumented business rule

**Where:** [Timesheets.jsx:70–150](../Timesheets.jsx#L70).

**Two different axes are both called "employment".**

| Axis | Prototype | Docs |
|---|---|---|
| Contract type | `employmentType: 'Full-time' \| 'Part-time'` (on the teacher record) | `staff_details.employment_type: employed \| contractor` |
| **Pay basis** | `payType: salaried \| hourly \| **mixed**` + `hourlyRate` | `staff_rates.rate_type: hourly \| session` |

`mixed` has no equivalent: salaried for your own timetable, **paid for cover and extras**. It is the
demo principal's arrangement and a common real one.

**Centre pay policy** lives in the timesheet store (deliberately *not* in the settings store, so the
derivation recomputes the instant an admin flips it):

| Setting | Value | Meaning |
|---|---|---|
| `submissionFrequency` | `week` \| `fortnight` \| `month` | The cadence unit the period navigator steps through. **The only period control** — staff never pick their own window |
| `payNonSession` | boolean | Master switch for paying non-teaching time |
| `paidCategories` | `{prep, marking, meeting, training}` | Per-category gate beneath the master switch |

**The eligibility rules** (`tsPayFor`, [Timesheets.jsx:124](../Timesheets.jsx#L124)) — derived per
line, never stored:

- Teaching / cover: `hourly` → paid · `salaried` → never · `mixed` → **only when cover or extra**,
  where "extra" = the entry's teacher is not the class's rostered teacher.
- Non-session: paid only if `payNonSession` **and** the category is enabled **and** the teacher is
  `hourly` or `mixed`.
- Salaried lines still record hours (with no pay) — kept for the audit trail.
- Entry type **`other`** is recorded but never pay-eligible, by design (it is deliberately absent
  from `TS_PAID_CATEGORIES`). The docs' type enum has no `other`.
- A **cancelled session produces no line at all**, single-sourced through the timesheet store so the
  admin schedule and hours agree.

**Edits:** add `other` to `timesheet_entries.type`; `staff_details.pay_type` (`salaried|hourly|mixed`)
alongside the existing `employment_type`; a `centre_timesheet_policy` row
(`submission_frequency`, `pay_non_session`, `paid_categories text[]`); and document
`v_timesheet_pay` as the eligibility derivation — `timesheet_entries.derived_amount` currently
implies a stored amount with no stated rule behind it.

## 2.9 `invoices` — tax modes and reminder rate-limiting

`INVOICE_DEFAULT_CONFIG` ([mocks/invoices.mock.jsx](../mocks/invoices.mock.jsx)) — per centre,
**overridable per invoice**:

| Setting | Values | In docs |
|---|---|---|
| `taxMode` | `none` \| `exclusive` (added on top) \| `inclusive` (already in the total) | ❌ — a materially different calculation, not a rate |
| `taxLabel` | `'VAT'` | ❌ |
| `taxRate` | 0.20 | ✅ `default_vat_rate` |
| `reminderCooldownHours` | 24 | ❌ |

Reminders are an append-only log (`{id, invoiceId, sentAt, toEmail}`) whose purpose is enforcing the
cooldown and surfacing the "no email on file" family state (one seeded family has `email: ''`
precisely to exercise it). Invoices also carry `classes[]` (what the bill is for) and
`studentIds[]` alongside `familyId`.

**Edits:** `centres.{tax_mode, tax_label}`; `invoices.{tax_mode, tax_rate}` overrides;
`invoice_reminders` table; a cooldown predicate on `POST /v1/invoices/:id/send`; and a documented
"no billing email" state (the send endpoint must fail loudly, not silently enqueue).

## 2.10 `comms_settings` — four documented fields, eleven shipped

| Prototype field | Meaning | In docs |
|---|---|---|
| `preset` | `locked` \| `standard` \| `open` | ✅ `default_preset` |
| `dmEnabled` | 1:1 student↔staff messaging | ✅ `student_messaging_enabled` |
| `quietFrom` / `quietTo` | ✅ | ✅ |
| `images` | May images be shared at all | ❌ |
| `dslObserver` | Auto-attach the DSL to monitored threads (off in the `open` preset) | ❌ |
| `dslLeadId` | ✅ via `memberships.dsl_role = 'lead'` | ✅ |
| `dslDeputyIds[]` | **Several** deputies | ✅ compatible (many deputy rows, one lead) |
| `retention` | `'3y'` — message retention period | ❌ |
| `announceAuthors` | `'admins'` — who may author announcements | ❌ |
| `approvalWorkflow` | Announcements require approval before publishing | ❌ |

Two have real schema consequences:

- **Announcement approval** needs `announcements.status` to gain `pending_approval`, plus
  `submitted_by` / `approved_by` / `approved_at`, and `publish_announcement` must refuse to publish
  an unapproved announcement when the centre requires it.
- **Message retention** needs a pg_cron sweep, and must interact with the safeguarding retention
  lock: messages attached to an open incident cannot be swept.

**Edit:** add the seven missing fields to `comms_settings`, plus the four announcement columns.

## 2.11 `message_flags` / `flag_rules` / `conversations`

- **A fourth flag reason:** `image` (an image shared in a monitored thread). Docs `pattern_type` =
  `keyword | contact | out_of_hours`.
- **Multi-reason flags:** one message can raise several reasons at once
  (`messageReasons`, [Communications.jsx:176](../Communications.jsx#L176)), ordered by severity into
  a single flag with a `primary`. Docs' `message_flags.rule_id` is singular.
- **`external` is three detectors** — phone-number regex, social-handle regex, meet-up phrasing —
  not one keyword rule. `flag_rules.pattern_type = 'contact'` should say so.
- **A third conversation kind:** `channel` (class-wide), alongside direct/group. `channelType:
  'monitored'` is **stamped at creation and immutable** — the prototype honours the stamp before
  re-deriving from participants, precisely so it cannot be dropped.
- **Minor-present attachment restriction (D10):** a thread containing a student is restricted to
  text. That is an invariant, not a UI rule.

**Edits:** `pattern_type` += `image`; `message_flag_reasons` child table (or `reasons text[]`);
`conversations.kind` += `channel`; document the immutable `monitored` stamp and the minor
attachment restriction as trigger/RLS invariants.

## 2.12 `files` — no category, no retention classification

`STG_CATEGORIES` ([Storage.jsx:38](../Storage.jsx#L38)) — seven categories, each with a lock level
that the delete guard reads:

| Category | Lock | Behaviour |
|---|---|---|
| `submissions` | `true` | Retention-locked — never deletable here |
| `resources` | `false` | Deletable |
| `question_attachments` | `false` | Deletable |
| `invoices` | `'archive'` | **A third state** — archived, not deletable, not "locked" |
| `avatars` | `false` | Deletable |
| `comms_attachments` | `true` | Locked |
| `safeguarding` | `true` | Locked — tombstoned, never hard-deleted |

Add-on economics are constants the docs don't carry: `STORAGE_ADDON_BLOCK_GB = 100`,
`£5/block/month`, illustrative `$0.015/GB/month` (labelled illustrative in the UI).

**Edits:** `files.category text`; a documented category → retention matrix (three states, not a
boolean); put block size and price on `plans.limits` or a `storage_addon_products` row so
`storage_addons.blocks` means something.

## 2.13 `feature_flags` — no targeting model, and three missing global toggles

Prototype flags carry `scope` (`global` / `opt-in` / `beta cohort` / **`Scale only`** = plan-gated)
and `coverage` (a rollout percentage), with per-cohort/per-tenant targeting described in the UI.
Global toggles beyond maintenance: **Read-only mode** (all centres read-only), **New signups**
on/off, **Public status page** visible.

Docs: `feature_flags = {account_id, key, enabled}`; maintenance mode is a global row (A11 left it as
"`platform_settings` **or** `feature_flags`" — the prototype now needs more than a boolean, so
decide).

**Edits:** `feature_flags.{scope, rollout_pct, min_plan, targeting jsonb}`; and either three more
global rows (`read_only_mode`, `signups_enabled`, `status_page_public`) or a `platform_settings`
table — which is also where the superadmin defaults in §3.1 belong.

## 2.14 Students, staff and centres — smaller field gaps

**Students**
- `account.dailyMethod = pin | password | **qr**` ([Auth.jsx:40](../Auth.jsx#L40)). The prototype
  supports **password** and **QR-badge** student login, not only PIN. Docs model `username +
  pin_hash` only. Needs `students.auth_method`, credential storage for the password path, and a
  ruling on QR badges (a scannable token *is* a credential — it needs rotation and RLS).
- `account.setupMethod` includes `self-set` and `qr` beyond the docs' `claim_slip | admin_set_pin`.
- `status: 'at-risk'` is **stored** on the roster while at-risk is *also* derived by two metric
  layers with deliberately different thresholds (admin 75/50/55 vs teacher 85/60). Say which is
  canonical; a stored flag that disagrees with both views is the worst outcome.
- `notes` (free-text staff notes on a student) has no column.

**Staff**
- `rating` (4.9) — a teacher rating shown in the admin staff table. No column, no source, no
  documented meaning. Either model it or delete it.
- `subject` specialism, `colour`, `internalNotes`, `invitedOn`/`activatedOn`. `staff_details` has
  `notes` but no specialism or colour.
- **Three employment vocabularies coexist:** `Full-time|Part-time`, `salaried|hourly|mixed`,
  `employed|contractor`. Two are legitimate axes (§2.8); the third must go.

**Centres**
- `is_primary` (which centre is the account's primary), `region`, per-centre `accent`, and a
  per-centre **setup checklist** `setup{invite, students, classes}` that drives the "needs setup"
  drawer. None are in `centres` or `centre_settings`.

---

# PART 3 — Cross-cutting features with no data home

## 3.1 User preferences: appearance + accessibility (AADC-relevant)

`settings_store_v1` ([mocks/settings.mock.jsx](../mocks/settings.mock.jsx)), per role:

| Section | Fields | Docs |
|---|---|---|
| **appearance** (all roles) | `theme (light\|dark)`, `compact`, `reduceMotion`, `language`, `timezone`, `dateFormat`, `weekStart` | ❌ (`profiles.locale` only) |
| **student `learning`** | `textSize`, `highContrast`, `dyslexiaFont`, `reminderLead`, **`streakNudges` (defaults OFF — explicitly de-gamified, no loss-aversion nudging)**, `shareWithGuardian`, read-only `guardianName`/`guardianEmail` | ❌ |
| **teacher `teaching`** | homework defaults `attempts`, `dueDays`, `allowLate`, `autoGradeMcq`, `allowReview`, `gradingScale`, `releaseAfterApproval`; working `hoursFrom`/`hoursTo`; `notifyOnSubmission` | ❌ |
| **admin `centre`** | `website`, `currency`, `invoiceDueDays`, `taxRate`, `autoSendInvoices`, `lateReminders`, and the **term schedule** `terms[]` | partially (`centre_settings` jsonb) |
| **superadmin `platform`** | `defaultPlan`, `defaultSeats`, `currency`, `billingEmail`, `autoSuspend`, `retention`, `supportAccess`, `maintenanceNotices` | ❌ |
| **dashboard** | card layout / customisation per role (`tutoros.dash.admin.v1`, `.teacher.v1`) | ❌ |
| **accent** | live brand accent (`tutoros.accent`, `window.__setAccent`) | partially (`centre_settings.branding`) |

**Why this is not cosmetic.** Phase 16's M4 exit criteria include *"AADC formal review: student-role
surface audit, streak/nudge audit, privacy defaults"*. `streakNudges: false` and the three
accessibility toggles **are** the evidence for that review, and there is currently no table to audit,
no default to assert in a test, and no migration to set them safely for under-13s.

**Edits:** `user_preferences` (`profile_id PK, appearance jsonb, accessibility jsonb, role_defaults
jsonb, updated_at`) — or typed columns for the accessibility three, since they need
AADC-safe defaults enforced at insert; `dashboard_layouts` (`profile_id, role, layout jsonb`);
`platform_settings` for the superadmin block; and fold the teaching/invoicing defaults into
`centre_settings.{grading_defaults, features}` explicitly rather than by implication.

## 3.2 Terms — a ruled-but-unapplied divergence

The prototype stores terms as `settings_store_v1 → admin.centre.terms[]` and **derives** the active
term from today's date (`resolveActiveTerm`). Reconciliation **A9** rules the stored
`terms.is_active` flag wins and supersedes `resolveActiveTerm`. That ruling is correct and **has not
been applied to the prototype** — worth recording as an open migration, since three modules read
term context and one (`teacherMetrics.getCurrentTerm`) already dead-falls to a hardcoded
`Summer Term 2026` because `window.readTermIndicator` is never assigned.

## 3.3 Onboarding state

`ONB_INITIAL` ([mocks/onboarding.mock.jsx](../mocks/onboarding.mock.jsx)):

| Field | Meaning | Docs |
|---|---|---|
| `steps{invite, students, classes}` | Per-centre setup checklist driving the "needs setup" drawer | ❌ |
| `importDraft {text, parsedAt}` | Auto-saved in-progress CSV paste, restored on return | ❌ |
| `lastBatch[]` | Ids of the most recently provisioned cohort — the claim-slip print run | ❌ |
| `rosterSeeded{}` | One-shot backfill guard so an admin's explicit revoke isn't re-materialised | n/a (prototype artefact) |
| `roleLog[]` | Grant/revoke/transfer log | ✅ `audit_log` |

**Edits:** `centre_setup_progress` (or `centre_settings.setup jsonb`); `import_drafts`
(`id, centre_id, created_by, payload text, parsed_at`); `student_claim_batches`
(`id, centre_id, created_by, created_at`) + `student_claims.batch_id`, so a slip run is reprintable
as a set rather than reconstructed by date.

## 3.4 Self-serve signup

[Auth.jsx](../Auth.jsx) `SignupPage`: an **admin signs themselves up**, the flow issues a centre code
and stamps the global free trial onto the new subscription.

Docs: accounts are provisioned by superadmin only (`POST /v1/admin/accounts` / `provision_account`).
There is no public signup endpoint — yet M1's exit criteria say *"Centre admin can self-onboard"* and
Phase 17 says *"new account can complete onboarding without support"*. Those criteria have no API
behind them.

**Edit:** `POST /v1/auth/signup` (public, rate-limited, idempotent) creating account + owner profile
+ first centre + centre code + trial stamp in one transaction — or a ruling that signup is sales-led
and the prototype's page is a mock.

## 3.5 Staff and student authentication methods

| | Prototype | Docs |
|---|---|---|
| Staff | **password**, **magic link**, **OTP** (6-digit code) — a three-way picker | Phase 1 says "staff TOTP login"; no staff auth endpoint is listed |
| Student | **PIN**, **password**, **QR badge** | `POST /v1/auth/student/login` — username + PIN only |
| Recovery | staff: email reset link; student: guardian-approved reset | ✅ `guardian_approvals` (under-13 PIN reset) |

Magic-link exists in the docs solely as the guardian-approval mechanism.

**Edit:** either document staff magic-link/OTP endpoints with their rate limits and lockout
interaction (§1.4), or rule that TOTP is the shipped method and the picker is a mock. This is a
**security-surface decision**, not a cosmetic one — each method is a distinct attack surface.

## 3.6 The global free trial

`tutoros.trial.v1` — **one platform-wide offer** (`enabled, days, planId, requireCard,
onEnd: bill|downgrade|suspend`) set in Platform Controls and **stamped onto each new subscription at
signup** as `trial{days, planId, startedAt, endsAt, onEnd}`, with the explicit rule that later
changes to the offer never retro-apply to live subscriptions.

Docs: `plan_codes.kind = 'free_trial'` — a *redeemable code*, a different mechanism entirely.
`subscriptions` has no trial columns and `accounts.status` has no `trial` value (the superadmin
console shows `active | trial | past_due | suspended`).

**Edits:** `platform_trial_offer` (single global row); `subscriptions.{trial_days, trial_plan_id,
trial_started_at, trial_ends_at, trial_on_end}`; `accounts.status` += `trial`, `past_due`; and a
sentence distinguishing the global offer from redeemable trial codes.

## 3.7 Superadmin console: three more undocumented data sets

- **Failed-payment / dunning queue** — `{accountId, date, attempts, state: retrying|card_expired|failed}`.
  Derivable from Stripe webhooks, but nothing mirrors it; the KPI counts rows.
- **Transactions ledger** — `{accountId, type: upgrade|new|addon|renewal|refund, amount, date, desc}`.
  Klasio's own revenue movements. `subscriptions` alone cannot produce it.
- **DSAR deadlines** — the prototype's rows carry `received` **and a statutory `deadline`**
  (received + 30 days) plus a requester description. `data_requests` has `requested_by` and
  `completed_at` but **no due date** — for a statutory clock that is a compliance gap, not a UI one.

**Edits:** `billing_events` (mirroring Stripe invoice/charge events, idempotent via
`processed_events`); `data_requests.{due_at, requester_note}`; `audit_log.{actor_role, ip}` (the
prototype's audit rows carry both, and "which IP suspended this account" is exactly what an audit
log is for).

## 3.8 Exports and outputs not in the endpoint list

- **ICS calendar export** of a student's upcoming sessions ([StudentDashboard.jsx:750](../StudentDashboard.jsx#L750)).
- **Client-side print-to-PDF** paths: timesheet print view, `printReportPDF`, `printCentreReport`,
  claim slips. The docs assume server-rendered PDFs via Railway for reports and invoices only —
  decide which of these become endpoints and which stay browser-print.
- Already covered ✅: invoice CSV export→fill→import, timesheet CSV via `GET /v1/exports/:key`.
- **Delete rather than model:** `REPORTS_INVOICES` — a second, divergent financial list backing the
  admin financial report whose amounts don't reconcile with the invoice ledger.

---

# PART 4 — The ten direct conflicts, with a ruling for each

| # | Conflict | Prototype | Docs | Ruling & edit |
|---|---|---|---|---|
| **C1** | Register backfill default | 48 h | 72 h (`register_backfill_hours`) | **Docs win** — it is per-centre configurable and 72 h is the documented default. Change `REGISTER_SETTINGS.backfill_window` to 48 h × 60 only if a centre-level override is being demonstrated; otherwise align the mock to 72 h. No doc edit. |
| **C2** | `report_rules.requirement` | obligation enum `REQUIRED/OPTIONAL/OFF` | free text, "what the report must cover" | **Prototype wins on the column** — `v_reports_due` cannot be derived from free text, and the engine's skip-`OPTIONAL` behaviour is load-bearing. **Edit:** `requirement text` becomes the enum; add `brief text NULL` for the docs' original meaning. |
| **C3** | Report status set | `draft / published / archived` | `draft / submitted / published` | **Neither is a superset.** Recommend `draft → submitted → published → archived`, and decide explicitly whether `submitted` is a real approval step (nothing in the prototype submits a report for review) — if not, drop it and add `archived` + `archived_at`. |
| **C4** | Submission status | `not_started / in_progress / submitted / returned` | `not_started / in_progress / submitted / marked / returned` | **Docs win** — `marked` (teacher finished) and `returned` (student can see it) are genuinely different, and `assignments.allowReview` + `releaseAfterApproval` in teacher settings imply exactly that gap. Prototype should gain `marked`. |
| **C5** | Employment vocabulary | `Full-time/Part-time` **and** `salaried/hourly/mixed` | `employed/contractor` | **Both survive as two axes.** `staff_details.employment_type` = `employed\|contractor` (legal), `staff_details.pay_type` = `salaried\|hourly\|mixed` (payroll). Delete the third ("Full-time/Part-time") or make it `contracted_hours`. |
| **C6** | Active term | date-derived (`resolveActiveTerm`) | stored `is_active` + `set_active_term` (A9) | **Docs win — already ruled, not yet applied in code.** Track as a prototype migration: replace `resolveActiveTerm` with a stored flag, and fix `window.readTermIndicator` never being assigned. |
| **C7** | Cover teacher | `cls.cover` + a stored `coverActive` flag | `class_cover` rows + derived `v_effective_teacher` (A11) | **Docs win — already ruled, not yet applied.** Add the missing half the docs don't cover either: `sessions.delivered_by` for unplanned same-day substitution (§2.1), which is a *different* thing from date-ranged cover. |
| **C8** | Register unlock | one grant object per session (`store.unlocks[sessionId]`), deleted on use | `register_unlocks` table with `active/consumed/revoked/expired` + `consumed_at`, `revoked_by` | **Docs win** — the prototype loses the audit trail by deleting the grant. It does keep an `unlockLog` of grant/revoke actions, which maps to `register_unlocks` rows plus `audit_log`. |
| **C9** | Announcement audience | `audience{centreIds, roles, classIds}` jsonb on the row | `announcement_targets` child table (Decision #4) | **Docs win — already ruled.** Note the prototype also targets **year groups and subjects** derived from classes (`allYears()`, `allSubjects()`), which `announcement_targets.target_type` already anticipates (`year`, `subject`) ✅. |
| **C10** | Feature flag named `hw_ai_grading` | flag id `hw_ai_grading`, desc "Auto-grade homework" | Decision #12: no AI features, dependencies **or copy** | **Naming only — the feature is not AI.** `autoMark` is deterministic: it compares answers against values the teacher entered when authoring (`correctIndex`, `answer` + `tolerance`, `blanks[]`, `pairs[]`). **Edit: rename the flag to `hw_auto_marking`** and add a line to the Homework domain stating that auto-marking is rule-based comparison against teacher-authored answers — the same clarification the docs already give for `import-pdf`. Do **not** delete the capability. |

---

# PART 5 — Documented but not built (the reverse direction)

These are in the docs with no prototype surface. They aren't doc gaps — they are the **remaining
build scope**, and several carry design risk precisely because no prototype informs their UI.

### High risk — special-category data, no prototype at all

- **`student_health` (⚠ Art. 9), `emergency_contacts`, `consents`.** The prototype's students carry
  flat `guardianName/Relation/Email/Phone` fields plus `account.underThirteen` and
  `consentRecorded`. There is **no SEN/EHCP surface, no allergies/medications, no medical notes, no
  emergency contact list, and no consent record** beyond a boolean. This is the strictest-RLS,
  fullest-audit slice in the reference, and it will be designed cold. **Recommendation: prototype
  these screens before Phase 1 ships them** — the access model (centre_admin + DSL only, teacher
  only if a centre setting allows) needs a UI to argue with.
- **`safeguarding_incidents` / `_notes`** exist in the prototype as `COMMS_CONCERNS` with
  `{status, by, at}` — far thinner than the documented append-only chronology. The DSL flag queue is
  well built; the *incident log* is not.

### Medium risk — a documented model with no UI to validate it

- **Assessments & results** (`assessments`, `results`, `grade_scales`, `grade_bands`,
  `record_result`, `publish_results` — Phase 6). The prototype has a grade *taxonomy*
  ([teacherGrades.jsx](../teacherGrades.jsx)) and synthesised percentage scores, but **no assessment
  entry screen, no publish gate, and no per-student result rows.** Everything currently showing a
  "score" is either a homework mark or a synthesised number. This is the backbone of Progress,
  Tracking's `score` columns, report `testPerformance`, and predicted grades (§2.6) — and none of
  those have a real source today.
- **`groups` / `group_members`** (Reconciliation A6, Phase 5). **Nothing in the prototype targets a
  group.** Homework targets a class or named students; comms targets centres/roles/classes/years/
  subjects; reports target tag/class/student. `assignment_targets.target_type = 'group'` and
  `announcement_targets.target_type = 'group'` both point at a table no screen populates. Either
  build a groups UI or drop `group` from both target enums until there is one.
- **`rooms`** and clash detection — rooms are free-text strings on classes (`'Room 3'`, `'Lab 1'`).
  No room entity, no capacity, no double-booking check, even though the admin schedule grid is where
  a clash would show.
- **`term_breaks`** and `regenerate_sessions` — the session materialiser expands every matching
  weekday in the window with **no holiday awareness**. Half-term will generate phantom sessions,
  phantom registers and phantom timesheet lines.
- **`families` as a first-class table** — families exist only inside the invoices mock
  (`SEED_FAMILIES`, with `parent/email/phone` inline). `students.family_id` **does not exist on the
  roster**, so sibling grouping is invisible everywhere except billing, and the documented
  `families.billing_guardian_id` → `student_guardians` chain has no prototype equivalent
  (the mock stores the parent's contact details directly on the family).
- **`guardian_approvals`** beyond the single under-13 consent screen: PIN reset by guardian
  magic-link is documented and unbuilt.

### Lower risk — infrastructure the prototype fakes by nature

- **`email_outbox`, `email_suppressions`, Resend, all templates.** No email is modelled anywhere;
  "send" actions log locally. The invoice-reminder cooldown (§2.9) is the only send-rate concept.
- **`processed_events`, Stripe webhooks, `storage_addons` purchase** — local state.
- **`data_requests` lifecycle** — the DSAR queue renders a static mock; no request can be created,
  progressed or fulfilled. And see §3.7: the mock has a statutory `deadline` the table lacks.
- **`notification_prefs` per kind × channel** — the prototype has one flat notifications section
  (`channel, digest, quietHours, announcements, messages, reminders`), not per-kind rows. Whichever
  shape wins, the AADC "safe defaults for under-13s" requirement needs to be expressible in it.
- **`audit_log` as the universal sink** — the prototype has *three* separate audit logs
  (`tutoros.audit.v1` centre, `tutoros.saudit.v1` platform, `roleLog` onboarding) plus per-module
  logs (invoice audit, `unlockLog`, report `history[]`, `resource_access_log`). The docs' single
  `audit_log` is the right target, but the doc should say which of those are audit rows and which
  are domain tables (report history and resource access log are arguably domain data).

---

# PART 6 — Consolidated edit list

### New tables (22)

| # | Table | Domain | Phase |
|---|---|---|---|
| 1–6 | `resources`, `resource_shares`, `resource_access_requests`, `resource_links`, `resource_usage_events`, `resource_access_log` | **§12 Resources** (new) | new slice ≈ 12b |
| 7–9 | `class_posts`, `class_settings`, `class_change_requests` | Academic | 3 / 5 |
| 10 | `class_post_comments` *(if comments ship)* | Academic | 5 |
| 11 | `support_tickets` (+ `support_ticket_messages`) | Platform & ops | 14 |
| 12–13 | `auth_attempts`, `account_lockouts` | Tenancy & identity | 1 |
| 14–15 | `tags`, `taggables` | Academic | 3 |
| 16 | `assignment_folders` | Homework | 8 |
| 17 | `report_folders` | Reports | 8b |
| 18 | `student_targets` | Grades & assessment | 6 |
| 19 | `invoice_reminders` | Invoicing | 7 |
| 20 | `user_preferences` (+ `dashboard_layouts`) | Platform & ops | 11 |
| 21 | `platform_settings` | Platform & ops | 14 |
| 22 | `centre_register_settings`, `centre_timesheet_policy`, `centre_report_standards`, `centre_setup_progress`, `import_drafts`, `student_claim_batches`, `billing_events` | *(the settings/ops cluster — several may fold into `centre_settings` jsonb; decide per item)* | 1–7 |

### Columns to add (~35)

`sessions.{register_late, register_note, register_by_admin, delivered_by}` ·
`files.category` ·
`classes.{join_code, banner_theme}` *(or via `class_settings`)* ·
`centres.{tax_mode, tax_label, is_primary, region}` ·
`assignments.{folder_id, time_limit_mins, allow_review}` ·
`submissions.{attempt_count, is_late, time_spent_mins, started_at, marked_at, overall_feedback}` ·
`answers.feedback` · `questions.hint` ·
`reports.{signature, folder_id, pinned, last_viewed_at, report_type, predicted_grade, archived_at, acknowledged_at, acknowledged_by, brief}` ·
`report_rules.brief` ·
`staff_details.{pay_type, specialism}` ·
`students.auth_method` ·
`trackers.description` · `tracker_columns.{options, grade_scale_id}` ·
`feature_flags.{scope, rollout_pct, min_plan, targeting}` ·
`subscriptions.{trial_days, trial_plan_id, trial_started_at, trial_ends_at, trial_on_end}` ·
`data_requests.{due_at, requester_note}` ·
`audit_log.{actor_role, ip}` ·
`announcements.{submitted_by, approved_by, approved_at}` ·
`student_claims.batch_id`

### Enum extensions (8)

| Enum | Add |
|---|---|
| `questions.type` | `truefalse`, `fillblank`, `match`, `upload` |
| `tracker_columns.kind` | `grade`, `select`, `number` |
| `timesheet_entries.type` | `other` |
| `flag_rules.pattern_type` | `image` |
| `conversations.kind` | `channel` |
| `reports.status` | `archived` |
| `announcements.status` | `pending_approval` |
| `accounts.status` | `trial`, `past_due` |
| `students.setup_method` | `self_set`, `qr` |

### `comms_settings` — seven new fields

`images`, `dsl_observer`, `retention`, `announce_authors`, `approval_workflow`
(+ `dsl_lead_id` / `dsl_deputy_ids` are already served by `memberships.dsl_role` ✅)

### New RPCs / endpoints

**Resources:** `share_resource`, `unshare_resource`, `request_access`, `decide_access_request`,
`attach_resource`, `detach_resource`, `update_resource_link`, `admin_open_resource`,
`release_restricted_to_centre`.
**Auth:** `POST /v1/auth/signup` (public), staff magic-link / OTP endpoints (or a ruling),
`clear_lockout`, `block_identifier`.
**Class:** `enrol_with_class_code` *(only if the join code becomes a credential)*.
**Comms:** `approve_announcement` (when `approval_workflow`).
**Invoices:** cooldown enforcement on `POST /v1/invoices/:id/send`.
**Student:** `acknowledge_report` (mirrors `acknowledge_announcement`).
**Exports:** ICS session feed.

### New views

`v_resource_usage_count`, `v_resource_recent`, `v_suspicious_activity`, `v_timesheet_pay`
(the eligibility derivation), and `v_session_state` **re-specified** to take the register-settings
row as input.

### Decisions to record in the plan

1. Class join code — display-only or self-enrol credential?
2. Support desk — build it, or external helpdesk (and drop ticket-scoped impersonation)?
3. Staff auth — TOTP only, or magic-link + OTP as well?
4. Signup — self-serve or sales-led?
5. Report status — is `submitted` a real approval step?
6. Report permissions — six centre-configurable toggles, or a fixed RLS policy?
7. Predicted/target grades — stored (`student_targets`) or derived, and what does a published report snapshot?
8. Rank exposure to students — modelled and toggleable, or removed (AADC)?
9. `groups` — build a UI, or drop `group` from the two target enums for now?
10. Maintenance/read-only/signups/status-page — `feature_flags` rows or `platform_settings`?

---

# PART 7 — Per-document checklist

### `Klasio-Data-Layer-Reference.md`
- [ ] New §12 **Resources (Materials library)** — 6 tables, access predicate, RLS rows, 9 RPCs (§1.1)
- [ ] §2 Academic — `class_posts`, `class_settings`, `class_change_requests`, `tags`/`taggables`, `centre_register_settings`; `sessions` +4 columns (§1.2, §2.1, §2.5)
- [ ] §1 Tenancy — `auth_attempts`, `account_lockouts`; `students.auth_method`; `student_claims.batch_id` (§1.4, §2.14, §3.3)
- [ ] §3 Grades — `student_targets` (§2.6)
- [ ] §4 Staff & pay — `pay_type`, `other` type, `centre_timesheet_policy`, `v_timesheet_pay` (§2.8)
- [ ] §5 Homework — 4 question types, `assignment_folders`, 6 submission columns, `answers.feedback`; **state that auto-marking is deterministic rule-based comparison** (§2.2, §2.3, C10)
- [ ] §6 Reports — `requirement` enum + `brief`, centre default rule + cascade, standards, 10 `reports` columns, `report_folders`, permissions, PDF branding, notifications (§2.4)
- [ ] §7 Tracking — 3 column kinds, `options`, `grade_scale_id`, `description` (§2.7)
- [ ] §8 Invoicing — tax modes, `invoice_reminders`, cooldown (§2.9)
- [ ] §9 Communications — 7 `comms_settings` fields, announcement approval, `image` reason, multi-reason flags, `channel` kind (§2.10, §2.11)
- [ ] §10 Files — `files.category` + the three-state retention matrix; add-on block size/price (§2.12)
- [ ] §11 Platform — `feature_flags` targeting, `platform_settings`, `support_tickets`, `user_preferences`, `billing_events`, `data_requests.due_at`, `audit_log.{actor_role, ip}`, trial columns (§1.3, §3.1, §3.6, §3.7)
- [ ] Part II — RLS rows for every table above; re-spec `v_session_state` against the settings row
- [ ] Part III — the new endpoints and RPCs in Part 6

### `klasio-development-plan.md`
- [ ] New slice: **Resources / Materials library** (≈ Phase 12b, after `lesson_plans`)
- [ ] Phase 1 — add `auth_attempts`/`account_lockouts` (decision #14 currently has no schema); state the staff auth method set; add public signup or rule it out
- [ ] Phase 3 — `class_settings`, `tags`, the join-code decision
- [ ] Phase 4 — the five register settings, late/reason/by-admin/delivered-by columns; name the admin centre-wide attendance oversight page (shipped: [AttendanceAdmin.jsx](../AttendanceAdmin.jsx))
- [ ] Phase 5 — `class_posts`; announcement approval workflow
- [ ] Phase 8 — the four extra question types + the "no AI, deterministic marking" note
- [ ] Phase 8b — standards gate, folders, tags, archive, acknowledgement
- [ ] Phase 11 — `user_preferences` + `dashboard_layouts`
- [ ] Phase 14 — `support_tickets` + ticket-scoped impersonation; `platform_settings`
- [ ] Phase 16 — point the AADC review at concrete fields: `streakNudges`, the three accessibility toggles, rank exposure
- [ ] UI lists — multi-centre switcher, dual-role view switch, per-centre setup drawer (all shipped, unlisted)
- [ ] Record the ten open decisions from Part 6

### `Klasio-Reconciliation.md`
- [ ] Mark **C1** (vercel.json) and **C3** (supabase/README) **done** — both are already fixed in the repo
- [ ] Mark **A9** (stored active term) and **A11 cover** (`class_cover` vs stored flag) as *ruled, pending prototype migration*
- [ ] Add a C10-style entry: the `hw_ai_grading` flag is a **naming** violation of decision #12, not a feature one — rename to `hw_auto_marking`
- [ ] A6 `groups` — note that no prototype surface populates them; decide build-or-defer
