# Klasio / TutorOS — Full Repository Inventory

> **Read-only discovery report.** A complete map of every role, page, component, feature, action, data shape and dangling reference in the repo as it stands. Nothing here was changed. Where I inferred intent it is labelled **(inferred)**.
>
> **Verified against the code: September 2026.** This file is cited by `docs/klasio-development-plan.md` as the behavioural spec, so it has to stay true. Since the first pass the comms and timesheet stores were bumped, lesson plans gained persistence, the register was rebuilt on its own store, the Materials library landed, the three homework counts were unified, and a solo-tutor demo account was added — all folded in below. Re-verify the store-key table in §5 first when in doubt; it drifts fastest.

## How the app is built (orientation)

- **No build step, no framework tooling.** A single [index.html](index.html) loads React 18, ReactDOM, Babel-standalone, Recharts, PropTypes, KaTeX and MathLive from CDNs, then loads every `.jsx` file as `<script type="text/babel">`. Babel transpiles in-browser. Deployed via [vercel.json](vercel.json) as static files.
- **Globals, not modules.** There is no `import`/`export`. Each file is a Babel `<script>`; top-level `const`s are lexical globals visible to later scripts, and shared symbols are additionally published via `Object.assign(window, {...})`. Load order in [index.html](index.html) is therefore load-bearing (mocks → permissions → selector layers → feature modules → page modules).
- **Persistence = localStorage.** No backend. Every store is a versioned localStorage key seeded from a `mocks/*.mock.jsx` global. Comments throughout describe the intended future RLS/multi-tenant backend.
- **Single tenant in practice.** Only centre `bm` (Bright Minds Tuition) carries a live roster; other centres resolve to empty rollups.

Entry point / router: the `App` component in [index.html](index.html#L423) is a two-level state machine — `view` (role/auth) × `page` (compound `<parent>:<section>` id). There is no marketing/landing page: the app boots straight into `view: 'admin'`, and `login`/`signup` remain as public views. `renderContent()` ([index.html:561](index.html#L561)) dispatches on `view` then `parent`.

---

## 1. Roles

Roles are defined by `NAV_CONFIG` in [shared.jsx:395](shared.jsx#L395) (four UI roles) and the staff-role grant model in [permissions.jsx](permissions.jsx) (`STAFF_ROLES = ['admin','teacher']`).

| Role | Where defined | Landing / default view | Nav items visible | Notable permissions / restrictions |
|---|---|---|---|---|
| **superadmin** ("Platform Owner", `#7C3AED`) | [shared.jsx:396](shared.jsx#L396); persona `Marcus Hale` (`u_marcus`) | `superadmin` / `dashboard` → `SuperAdminDashboard` | Overview, Centres, Users, Revenue, Pricing, Engagement, Announcements, Support sessions, Security & Audit, System Health, Storage, Platform Controls, Settings | Platform-wide. Looks inside a tenant only through a time-boxed support session (support-email ref + reason, ≤ 60 min — [SAImpersonationBanner](SuperAdmin.jsx#L3050), `tutoros.impersonation.v1`). Announces to account admins only; no Messages surface. Edits both audiences' plans, trials and codes (Pricing) and the flags and platform switches (Platform Controls). |
| **admin** ("Centre Admin" / "Account Owner", `DS.accent`) | [shared.jsx:412](shared.jsx#L412); persona `Lisa Chen` (`lisa.chen@brightminds.co.uk`) | `admin` / `dashboard` → `AdminDashboard` | Dashboard; **Account tier (owner-only):** Centres, Plans & Billing, Storage; **Centre tier:** People (Students, Staff, People & Invites), Academic (Classes, Subjects, Timetable, Attendance, Resources), Operations (Invoices, Timesheets, Reports, Safeguarding), Communication (Announcements, Messages), Settings | Account-tier items gated by `isAccountOwner` ([permissions.jsx:95](permissions.jsx#L95)); non-owner admin sees `AccountLocked`. Owner label swaps to "Account Owner" in topbar. Can grant/revoke Admin+Teacher, transfer ownership. |
| **teacher** ("Teacher", `#0891B2`) | [shared.jsx:452](shared.jsx#L452); persona `Heebz A` (`t1`, `s.clarke@centre.co.uk`) | `teacher` / `dashboard` → `TeacherDashboard` | Dashboard, Teaching (Timetable, My Classes, My Students, Lesson Planner, Resources), Student work (Attendance, Homework [Assignments/Analytics], Progress, Tracking, Reports, Timesheets), Communication (Announcements, Messages), Settings | Scoped to classes where assigned (the class-assignment JOIN in [teacherMetrics.jsx](teacherMetrics.jsx)). Read-only student profile (no Fees/Account tabs). |
| **student** ("Student", `#43b190`) | [shared.jsx:474](shared.jsx#L474); persona `Oliver Chen` (`s_oliver`/`s2`/`u_oliver`) | `student` / `dashboard` → `StudentDashboard` | Overview, Homework (Assignments/Submitted/Results), My Progress, Sessions, Reports, Communications, Settings | Read-only own data. No account-tier concepts. Reads everything through `window.klasioStudent`. |
| **parent / guardian** | Referenced only: `SA_ROLE_COUNTS.parent: 70` ([superAdmin.mock](mocks/superAdmin.mock.jsx#L85)); guardian fields on students; under-13 consent flow in Onboarding; `parentNotification`/`parentPortal` flags | — | **NONE** | **Referenced but not implemented as a view.** `design_extract/tuition-system/project/ParentPortal.jsx` exists but is NOT loaded by [index.html](index.html). Parent notifications marked "Coming soon" ([Reports.jsx:2577](Reports.jsx#L2577)). |

**Assignable staff roles** are only `admin` + `teacher` ([permissions.jsx:25](permissions.jsx#L25)). Multi-role is supported: one identity holds several roles via several `ONB_MEMBERSHIPS` rows (e.g. Lisa = admin+teacher at `bm`), grouped into a `roles[]` array by `membersForCentre`. Account ownership is **derived** from `subscription.ownerUserId`, never stored on a person.

---

## 2. Pages / Views / Routes

The page id is `<parent>:<section>` for dropdown sub-sections (e.g. `homework:analytics`) or `<id>_<detail>` for sub-pages (e.g. `students_add`); `navParentId` ([shared.jsx:496](shared.jsx#L496)) folds both back to the parent. `normalizePage` ([index.html:520](index.html#L520)) auto-expands a bare id to its first sub-section and rewrites retired ids via `PAGE_ALIASES` (`classes:subjects`→`subjects`, `timesheets:review`→`timesheets`, `comms:settings`→`settings:comms`). The complete navigable set is enumerated in the Tweaks panel ([index.html:694-747](index.html#L694)).

### Public / pre-auth
| Page ID | Component | Roles | Purpose | Status |
|---|---|---|---|---|
| `login` | `LoginPage` ([Auth.jsx](Auth.jsx)) | public | Staff/Student login toggle, centre switcher, centre-code+username | complete |
| `signup` | `SignupPage` ([Auth.jsx](Auth.jsx)) | public (admin) | Admin-only signup, issues centre code | complete |
| `claim` (`__openClaim(id)`) | `ClaimPage` ([Onboarding.jsx:1599](Onboarding.jsx#L1599)) | public invitee | Teacher/student/under-13 parent-consent account claim | complete |
| `?view=cover-gallery` | `CoverGallery` ([classCoverGallery.jsx](classCoverGallery.jsx)) | **dev only** | Every class background (48 presets) as card + banner, for curation. index.html loads the script only on a local host, so the deployed prototype never fetches it | complete |

### Superadmin (`SuperAdminPages` router [SuperAdmin.jsx:3129](SuperAdmin.jsx#L3129))
| Page ID | Component | Purpose | Status |
|---|---|---|---|
| `dashboard` | `SuperAdminDashboard` ([:937](SuperAdmin.jsx#L937)) | Platform KPIs, MRR trend and movement scoped by the range selector (`SAMetrics.period`), "Export board pack" CSV, "Exit maintenance" only while it is on | complete |
| `centres` | `SACentresPage` ([:1188](SuperAdmin.jsx#L1188)) | All tenant accounts/centres; rows are clickable (no action column) and every action lives in the detail popover, incl. "Open support session". "New account" is a secondary action (hand-provisioned deals) | complete |
| `users` | `SAUsersPage` ([:1570](SuperAdmin.jsx#L1570)) | Directory of every platform user (row → detail popover); one tabbed stat card (Overview/Roles/Security/Seat usage). No bulk message | complete |
| `revenue` | `SARevenuePage` ([:1895](SuperAdmin.jsx#L1895)) | MRR, failed payments, transactions | complete |
| `pricing` | `SAPricingPage` ([:2583](SuperAdmin.jsx#L2583)) | Centre / Solo tutors toggle: each audience's plans (monthly + yearly prices, limits, capabilities, bullets, Stripe sync state + "Create Stripe price"), that audience's free trial, and the shared override codes | complete |
| `engagement` | `SAEngagementPage` ([:2037](SuperAdmin.jsx#L2037)) | Feature usage, device split | complete (has `SAMPLE` synth) |
| `comms:announcements` | `CommunicationsPage` | Platform notices to account admins only (one audience card + centre picker) | complete |
| `support` | `SASupportPage` ([:2381](SuperAdmin.jsx#L2381)) | Support-session log + "Open session" (ref + reason + time box); support itself is by email. `comms:support` aliases here | complete |
| `security` | `SASecurityPage` ([:2440](SuperAdmin.jsx#L2440)) | Audit log, DSAR, suspicious activity | complete |
| `system` | `SASystemPage` ([:2197](SuperAdmin.jsx#L2197)) | Services, queues, email deliverability, scheduled jobs, incidents — all mock, each naming its production source. Headline derived from `SAHealth`; "Preview status page" button | complete |
| `storage` | `SAStoragePage` ([:3118](SuperAdmin.jsx#L3118)) → `StorageOwnerPanel` | Platform storage, cost against MRR, 30-day growth, R2 reconciliation panel | complete |
| `controls` | `SAControlsPage` ([:2918](SuperAdmin.jsx#L2918)) | Platform switches (`tutoros.platform.v1`, incl. maintenance notice + expected end), **Public pages** (preview list), feature flags (`tutoros.flags.v1`), roles | complete |

### Public pages ([PublicPages.jsx](PublicPages.jsx) + [404.html](404.html))
Everything people see outside the app, or instead of it. **One place to preview them all:** Owner → Platform Controls → *Public pages* (each opens in a new tab).

| Page | How to open it | Notes |
|---|---|---|
| Status page (preview) | `?view=status` · System Health → "Preview status page" | `StatusPage` — customer-facing components rolled up from `SA_SERVICES` via `SAHealth`, 90-day bars, public incident wording (`SA_INCIDENTS[].public`). The real page is hosted by the uptime monitor (runbook C6) |
| Maintenance screen | `?view=maintenance` (preview, staff/student toggle) · live for every tenant while maintenance mode is on | `MaintenanceScreen` — notice, expected end / running late, 30s check + "Check now", safeguarding signpost (staff → DSL, pupils → Childline), status link when public |
| Page not found | `/404.html` (preview) · any unknown address on Vercel or `npx serve` | Standalone static file — no React/Babel, absolute asset paths |
| Sign in / Sign up | `?view=login` · `?view=signup` · `?plan=<code>` | `Auth.jsx` |
| `settings` | `SettingsPage role="superadmin"` | Platform Defaults tab + shared tabs | complete |

### Admin (dispatched in [index.html:576](index.html#L576); `AdminPages` router [AdminPages.jsx:3156](AdminPages.jsx#L3156)+)
| Page ID | Component | Purpose | Status |
|---|---|---|---|
| `dashboard` | `AdminDashboard` ([AdminDashboard.jsx](AdminDashboard.jsx)) | Centre KPIs (Active students with net movement this month), alert strip (ranked, max 3 + "+N more", "Nothing needs attention" line naming every check), per-centre setup prompt (derived, dismissible), schedule card whose rows open that session in the session drawer (no page change) | partial — `outstandingInvoices` preview is still a `[]` TODO |
| `centres` | `CentresPage` ([Centres.jsx](Centres.jsx)) | Multi-centre mgmt + setup drawer; "Change code…" dialog (unclaimed-slip count, reprint link, 30-day grace) | complete (owner-only; else `AccountLocked`) |
| `plans` | `AccountBillingPage`→`BillingTab` ([index.html:412](index.html#L412)) | Subscription (plan cards list every capability, missing ones greyed), read-only card on file + expiry warning + disabled "Manage payment method" (Stripe portal), billing details, redeem code | complete (owner-only) |
| `storage` | `AccountStoragePage`→`StorageAdminPanel` ([index.html:417](index.html#L417)) | Pooled storage/quota | complete (owner-only) |
| `students` | `AdminStudentsPage` ([AdminPages.jsx:256](AdminPages.jsx#L256)) | Roster table | complete |
| `students_add` | `EnrolStudentPage` ([:403](AdminPages.jsx#L403)) | Enrol/create student | complete |
| `student_profile` | `StudentProfilePage` ([:1244](AdminPages.jsx#L1244)) | Full per-student analytics + edit; Fees tab reads the invoice ledger; Safeguarding tab (the pupil's concern chronology — admin/DSL only, hidden on the teacher view) | complete (shared w/ teacher, read-only) |
| `classes` / `subjects` | `AdminClassesPage` ([:1793](AdminPages.jsx#L1793)) | Classes + Subjects (two nav items, one page; `subjects` pins `section="subjects"`) | complete |
| `classes_add` | `AddClassPage` ([:1893](AdminPages.jsx#L1893)) | 3-step create-class | complete |
| `class_detail` | `ClassDetailPage` ([:2260](AdminPages.jsx#L2260)) | Banner + tabs (Overview/Roster/Sessions/Lesson plans/Homework/**Stream**) mirroring the teacher class workspace; Stream = the teacher's posts + the class's announcements in one feed, with "Post announcement" (the one composer, class pre-selected); roster, cover teacher; **Change background** (decision #63) | complete |
| `subject_detail` | `SubjectDetailPage` ([:1669](AdminPages.jsx#L1669)) | Subject rollup | complete |
| `teachers` | `AdminTeachersPage` ([:2932](AdminPages.jsx#L2932)) | Staff list | complete |
| `teachers_add` | `AddTeacherPage` ([:2562](AdminPages.jsx#L2562)) | Add teacher | complete |
| `teacher_profile` | `TeacherProfilePage` ([:2714](AdminPages.jsx#L2714)) | Teacher detail, assign cover | complete |
| `team` | `AdminTeamPage` ([Team.jsx:93](Team.jsx#L93)) | Roles & access grants, ownership transfer | complete |
| `timesheets` | `AdminTimesheetsPage` ([Timesheets.jsx:800](Timesheets.jsx#L800)) | Review/approve/export timesheets | complete |
| `timesheet_detail` | `AdminTimesheetDetailPage` ([Timesheets.jsx:924](Timesheets.jsx#L924)) | Per-teacher timesheet detail | complete |
| `schedule` (nav label "Timetable") | `AdminSchedulePage` ([:4006](AdminPages.jsx#L4006)) | Weekly timetable grid; a cell opens that week's occurrence in the right-hand **session drawer** (`SessionDrawer`, [Resources.jsx](Resources.jsx)) over the grid — when/where/who, register, planned lesson, homework set, lesson files; read-only | complete |
| `invoices` | `AdminInvoicesPage` ([Invoices.jsx:1174](Invoices.jsx#L1174)) | Ledger, drawer, reminders, CSV, analytics; "payments last recorded N days ago" freshness line (warns after 14 days) | complete |
| `reports` (+ `reports:settings`) | `AdminReportsConfig` ([Reports.jsx](Reports.jsx)) | The student-report product only, as ONE nav item (no dropdown): StatBand (overdue/drafts/published/read/coverage, each opening its view) · left rail of state views + "Reports due" · every report in the shared Table. Settings is a header button onto its own page (`reports:settings`); a report, Reports-due and the template builder are full-page takeovers that name themselves in the breadcrumb. `reports:overview` / `reports:browse` alias to `reports` | complete |
| `analytics` | `AdminAnalyticsPage` ([Reports.jsx](Reports.jsx)) | Centre-wide figures + the five exports (progress, attendance, homework, reporting activity, Financial Overview from the invoice ledger). Split out of Reports; `reports:generate` aliases here | complete |
| `comms:announcements` / `comms:messages` / `comms:safeguarding` | `CommunicationsPage` | Comms + DSL oversight. Top-level nav items (no `comms` parent for admin/teacher); Safeguarding is grouped under Operations | complete |
| `settings` (`:centre/:comms/:notifications/:appearance/:account`) | `SettingsPage role="admin"` | Centre settings tabs — `:comms` is the old Comms settings section (`CommsTab`), moved here | complete |
| **Onboarding routes** `people`, `invite_teachers`, `students_import`, `students_provision`, `claim_slips`, `class_roster` | `PeopleInvitesPage`, `InviteTeachersPage`, `BulkImportPage`, `AddSingleStudentPage`, `ClaimSlipsPage`, `ClassRosterPage` ([Onboarding.jsx](Onboarding.jsx)) | Provisioning flows | complete |
| `setup` | (rewritten in `__navigate` → `centres` drawer) | Legacy setup checklist | **rewired away**; `CentreSetupPage` ([Onboarding.jsx:418](Onboarding.jsx#L418)) marked **DEPRECATED / no longer routed** |

### Teacher (`TeacherPages` router [TeacherPages.jsx:2793](TeacherPages.jsx#L2793))
| Page ID | Component | Status |
|---|---|---|
| `dashboard` | `TeacherDashboard` ([TeacherDashboard.jsx](TeacherDashboard.jsx)) | partial — hero is the ordered state machine (on leave · live · register overdue · up next · done · none, decision #45) over the teacher's effective sessions on `window.getNow`; `recentSubmissions`/`unreadMessages` still TODO |
| `classes` | `TeacherClassesPage` ([:21](TeacherPages.jsx#L21)) | complete — shared `Table` by default, remembered grid/list toggle (`klasio.teacherClasses.view`) to "what you owe" cards: to mark, register due, next session, head count (decision #57), all derived; "Request a class" opens `RequestClassModal`; "Your requests" lists status + admin replies ([ClassRequests.jsx](ClassRequests.jsx)) |
| `class_detail` | `TeacherClassDetailPage` | complete — tabs Stream · Students · Homework · Lesson planner · Attendance · **Progress** (merged with the old Analytics tab, incl. **Predicted & target grades** — decision #28 — and Assessments) · Settings (Appearance → the class background, request a change + that class's requests). The banner's **Change background** shows only to the class's own teacher (decision #63) |
| `students` | `TeacherStudentsPage` ([:2626](TeacherPages.jsx#L2626)) | complete |
| `student_profile` | `StudentProfilePage role="teacher"` (from AdminPages) | complete |
| `timetable` | `TeacherTimetablePage` ([:1291](TeacherPages.jsx#L1291)) | complete — just the shared `MonthCalendar` of the teacher's effective sessions (own + covering) on `getNow`; a session opens the same `SessionDrawer` as the admin, whose footer links to the register (Take / View register via `__registerSession`) and the planner |
| `lesson_planner` | `LessonPlannerPage` | complete — Planned (by class + date) / My library (reusable lessons); a planned lesson's **Share with the class** switch (`shareWithClass`, decision #60); opened via `__openLessonPlanner(classId, date, mode)` ([lessons.jsx](lessons.jsx)) |
| `homework` (`homework:analytics` still deep-links) | `TeacherHomework` (from Homework.jsx) | complete — Assignments ⇄ Analytics is a header toggle, not a sidebar sub-item |
| `attendance` | `TeacherAttendancePage` ([:784](TeacherPages.jsx#L784)) | complete (register + `TimesheetCapture`) |
| `timesheet` | `TeacherTimesheetPage` ([Timesheets.jsx:647](Timesheets.jsx#L647)) | complete |
| `progress` | `TeacherProgressPage` | complete — all my classes or one: attainment (results) and homework (marked work) as separate series, "worth a look" list; reads `window.klasioScores` |
| `tracking` | `TeacherTrackingPage` ([:2265](TeacherPages.jsx#L2265)) | complete |
| `reports` | `TeacherReports` (from Reports.jsx) | complete |
| `comms:announcements` / `comms:messages`, `settings` | shared (top-level nav items, no `comms` parent) | complete |

### Student (`StudentDashboard` router [StudentDashboard.jsx:679](StudentDashboard.jsx#L679))
| Page ID | Component | Status |
|---|---|---|
| `dashboard` | `StudentDashboard` overview | complete — hero (3 signals + a line of facts, no "on track" verdict) → ranked **Up next** → My classes → Latest reports; rail = identity · calendar · announcements (decision #56) |
| `classes` (list + detail) | `StudentClassesPage` → `StudentClassesList` / `StudentClassDetail` ([StudentDashboard.jsx](StudentDashboard.jsx)) | complete — sessions tab rows open the session view; cards and banner show the class background read-only |
| `homework` (`:assignments/:submitted/:results`) | `StudentHomework` (from Homework.jsx) | complete — Assignments grouped by deadline, no status tabs, app type scale on the list screens (decision #58) |
| `progress` | `StudentProgressPage` | complete — class average only with the centre's privacy flag (decision #59), otherwise "since last"; teacher-set predicted/target, indicative grade labelled |
| `sessions` | `StudentSessionsPage` | complete — real timetable on the register clock; every session opens `StudentSessionDrawer` (decision #60) |
| `reports` | `StudentReports` (from Reports.jsx) | complete |
| `comms` | shared | complete |
| `settings` | `StudentSettingsPage` (Settings.jsx) | complete — one page, no tabs: read-only account + change PIN/password, in-app notification topics the bell obeys, "Request a copy of my data" 13+ (decisions #61 / #62) |

---

## 3. Components

### Shared primitives — [shared.jsx](shared.jsx) (design system)
| Component | Line | Props (key) | Notes |
|---|---|---|---|
| `LAYOUT` (layout tokens) | [:16](shared.jsx#L16) | — | the **one** source of content-area geometry: `max` 1600 · `narrow` 900 · `gutter` 32 · `top` 32 · `bottom` 64 |
| `pageFrame({ narrow, flush })` | [:27](shared.jsx#L27) | narrow, flush | style object for a page root — width/gutter/rhythm, capped + centred on large monitors. Every routed page root uses this; nothing else sets root padding or `maxWidth … margin:'0 auto'` |
| `Page` | [:1033](shared.jsx#L1033) | narrow, flush, style, className | component wrapper around `pageFrame` for new pages |
| `DS` (tokens object) | [:35](shared.jsx#L35) | — | accent `#4F46E5`; live-mutated by `App` on accent change |
| `Icon` / `PATHS` | [:114](shared.jsx#L114) | name, size, color, strokeWidth | icon library |
| `KlasioMark` | [:131](shared.jsx#L131) | size, color | brand logo mark |
| `Badge` | [:149](shared.jsx#L149) | variant, size | |
| `StatusPill` / `STATUS_TONES` | [:210](shared.jsx#L210) | status, tone, dot | auto tone-mapping |
| `Avatar` | [:231](shared.jsx#L231) | name, size, color | (also a **duplicate** `Avatar` in [Homework.jsx:4176](Homework.jsx#L4176)) |
| `KPICard` / `StatCard` | [:247](shared.jsx#L247) / [:311](shared.jsx#L311) | label, value, sub, trend, icon | two KPI card styles |
| `PageHeader` | [:939](shared.jsx#L939) | title, subtitle, actions | |
| `Btn` | [:953](shared.jsx#L953) | variant, icon, small | (also duplicated in [Homework.jsx:975](Homework.jsx#L975)) |
| `Card` | [:1002](shared.jsx#L1002) | title, subtitle, actions, accent | (also duplicated in [Homework.jsx:1010](Homework.jsx#L1010)) |
| `Table` system + `numericVal`/`sortCompareValue` | [:1055](shared.jsx#L1055)+ | col-defs, pagination, sort | auto numeric-align, hairline rows |
| `SearchInput` | [:1775](shared.jsx#L1775) | value, onChange, placeholder | |
| `CentreSwitcher` | [:509](shared.jsx#L509) | centre, centres, onSwitchCentre, planUsage | sidebar bottom |
| `Sidebar` / `NavItem` / `SubNavItem` | [:626](shared.jsx#L626) | role, active, badges, collapsed, accountOwner, centre… | dropdown nav + flyouts |
| Term helpers `getCentreTerms`, `resolveActiveTerm`, `termStatus`, `termTodayISO` | [:1908-1942](shared.jsx#L1908) | | active-term resolution (migrates legacy single-term fields) |
| **Table stack:** `Table`, `TableRow`, `TBodyRow`, `TablePagination`, `PagerBtn`, `SortChevron`, `RowActionsMenu`, `Checkbox` | [:1105-1445](shared.jsx#L1105) | col-defs | pagination/sort/kebab-menu system |
| **Charts:** `Sparkline`, `LineChart`, `BarChart`, `ChartTooltip`, `RC`, `ScorePill` | [:1445-1594](shared.jsx#L1445) | | Recharts wrappers |
| **Forms:** `Modal`, `Field`, `Input`, `Textarea`, `Select`, `Segmented`, `Checkbox`, `Toggle` (`{on}` presentational) | [:1594-1896](shared.jsx#L1594) | | shared inputs |
| **Misc:** `EmptyState`, `Divider`, `CustomiseModal`, `useDashboardPrefs`, `shadeColor` | [:1796-1885](shared.jsx#L1796) | | dashboard customise + empty states |

Full shared export at [shared.jsx:1945](shared.jsx#L1945): `DS, LAYOUT, pageFrame, Page, Icon, Badge, StatusPill, Avatar, KPICard, StatCard, shadeColor, Sidebar, PageHeader, Btn, Card, Table, TableRow, RowActionsMenu, Checkbox, Sparkline, LineChart, BarChart, ScorePill, Divider, NAV_CONFIG, navParentId, Modal, Field, Input, Textarea, Select, Segmented, SearchInput, EmptyState, useDashboardPrefs, CustomiseModal, Toggle, termTodayISO, getCentreTerms, termStatus, resolveActiveTerm`. (Note: `KPICard`, `StatCard`, `CentreSwitcher` are used internally but **not** in this window export — available by lexical global only.)

### Selector / SoT layers (not components, but shared logic)
| Module | Global | File |
|---|---|---|
| Centre metrics | `window.centreMetrics` + `window.klasioAudit` | [centreMetrics.jsx](centreMetrics.jsx) |
| Teacher metrics | `window.teacherMetrics` | [teacherMetrics.jsx](teacherMetrics.jsx) |
| Grade model | `window.klasioGrades` | [teacherGrades.jsx](teacherGrades.jsx) |
| Scores (decision #50) | `window.klasioScores` (`getStudentScoreSeries`, `attainmentSeries`, `classAssessments`, `classAttainment`, writes) + `window.studentAttainment(s)` | [assessments.jsx](assessments.jsx) |
| Lessons (decision #47) | `window.klasioLessons` + `useLessons` | [lessons.jsx](lessons.jsx) |
| Class change requests (decision #46) | `window.klasioClassRequests` + `useClassRequests`, `RequestClassModal`, `MyClassRequests`, `ClassRequestsQueue` | [ClassRequests.jsx](ClassRequests.jsx) |
| Centre teaching policy | `window.klasioCentreSettings()` (teaching defaults, pupil grade display) | [Settings.jsx](Settings.jsx) |
| Student SoT | `window.klasioStudent` (incl. `GradeChip`, `formatAttainment`) | [studentData.jsx](studentData.jsx) |
| Class backgrounds (decision #63) | `window.klasioCovers` (registry, `classCover(cls)` = the one read path, `canChangeBackground`, `validateCoverSelection`) + `CoverArt`, `coverStyleVars`, `ClassBackgroundDialog` | [classCovers.jsx](classCovers.jsx) + generated icon data [classCoverIcons.js](classCoverIcons.js) (built by [scripts/class-covers/build-prototype-icons.mjs](scripts/class-covers/build-prototype-icons.mjs) from the kit in `class-covers-kit/`) |
| Permissions | `window.hasRole/isAdmin/isAccountOwner/canManageRoles/canRevokeRole…` | [permissions.jsx](permissions.jsx) |

### Feature-specific components (selected)
- **Homework.jsx** (self-contained sub-app): `MathEditor`/`MathDisplay` (MathLive), `PdfImportModal`, `QuestionEditor`, `QuestionAnswerInput/Display`, `TeacherBuilder`, `TeacherReview`, `TeacherOverview`, `HomeworkAnalytics`, `TeacherList`, `HwHome`, `Ring`, `HwStatusPill`, plus its **own** `Btn`/`Card`/`Avatar`/`Toast`/`Pill`/`LineChart`/`Donut`/`BarList` (duplicated from shared).
- **Reports.jsx**: `ReportEditor`, `ReportReadingView`, `RatingEditor`, `RichTextEditor`, `EditList`, `RptTag`, `UpcomingReports`/`computeUpcomingReports`, `printReportPDF`, `printCentreReport`.
- **Communications.jsx**: `CommunicationsPage`, `SafeguardingPage`, `NotificationBell`, `useComms`, `commsContext`, plus permission/derivation helpers `commsUnreadCount`, `canAnnounce`, `canMessage`, `commsRecipients`, `COMMS_PRESETS`, `commsUserById`, `userById` (all window-exported; `COMMS_PRESETS` consumed by the Settings Comms tab).
- **SuperAdmin.jsx**: `SAMetrics` (incl. `directory`/`directoryStats`), `SAStatBand` / `SALeadStat` / `SAStatTabs` (the one stat-surface language — every SA page opens with a single stat card, never a row of tiles), `SAStatCell`, `SASectionLabel`, `SADetailRow`, `SAActionList`, `SADonut`, `SAHBar`, `SARegionMap`, `SAStatusPill`, `SAPlanPill`, `SARolePill`, `SAChurnDot`, `SAImpersonationBanner` (support-session banner), `SASupportSessionModal`, `SAModeModal`, `SAFlagAccountsModal`, `SAMaintenanceScreen` + `SAReadOnlyBanner` (tenant side of the platform switches), `SAConfirm`, `SAFlash`. Stores: `usePlatformSettings` / `saWritesAllowed`, `useFeatureFlags` / `saFlagEnabled`, `useSupportSessions`; `saOwnerAlerts` feeds the owner bell.
- **AdminPages.jsx**: `DimensionSelect` (inline add-new), `StudentProfilePage`.
- **index.html** inline: `TopBar`, `HeaderUserMenu`, `AccountPageShell`, `AccountLocked`, `AccountBillingPage`, `AccountStoragePage`.

**Duplicated components (two doing the same job):** `Btn`, `Card`, `Avatar`, `LineChart`/chart wrappers all exist in both shared.jsx and Homework.jsx (Homework namespaces its own copies via IIFE). `StudentProfilePage` is shared admin↔teacher (intentional).

---

## 4. Features / Modules

### Dashboard
- **Today:** Per-role landing dashboards. Admin & Teacher dashboards derive KPIs from the selector layers; superadmin from SA mocks. The teacher hero resolves one state in a fixed order — on leave (from `holidays`, naming who covers which class) → live now → register overdue (backfill window ticking) → up next → done → no classes — over the effective sessions on the shared clock, so it can't disagree with Timetable or Attendance; an overdue register also shows under a live/upcoming class. "Take register" deep-links into that session's register (`window.__registerSession`). The admin hero raises an alert while teacher class requests wait. The admin hero's "Active students" carries net movement (`centreMetrics.getStudentMovement` — join dates from `SEED_JOINED_ON` merged by id, leavers from `SEED_LEAVERS`); the unstaffed-today alert reads the same materialised sessions as the schedule card. Remaining `[]` TODO gaps: admin outstanding-invoice preview, teacher recent submissions and unread messages.
- **Pages/components:** `AdminDashboard`, `TeacherDashboard`, `SuperAdminDashboard`, `StudentDashboard`(overview — one ranked Up next, decision #56).
- **Roles:** all four.
- **Missing/stubbed:** admin top-overdue-invoices preview; teacher recent-submissions & comms-unread.

### Students & Enrolment
- **Today:** Full roster CRUD, per-student analytics profile, enrol flow, class enrolment. Backed by the shared admin store.
- **Pages:** `AdminStudentsPage`, `EnrolStudentPage`, `StudentProfilePage`, `TeacherStudentsPage`.
- **Roles:** admin (full), teacher (read-only profile, own students).
- **Missing:** parent/guardian portal; `allStudents` legacy roster mirror still shipped.

### Classes & Scheduling
- **Today:** Classes + Subjects, 3-step create-class with configurable dimensions (year groups/levels/exam boards), class detail with cover teacher, weekly schedule grid, teacher timetable, register. **Class change requests** (`klasio.classRequests.v1`): teachers ask for a new class or a change; the admin Classes page has a Requests view (badge on the Classes nav item); "Create class" opens create-class prefilled (`window.__classPrefill`) and actions the request on save; a decline needs a reason. **Teaching availability** (admin store `availability`): create-class warns when the teacher isn't available or is already teaching then (advisory), and the cover pickers rank candidates by who's free. **Class backgrounds** (decision #63, [classCovers.jsx](classCovers.jsx)): one class-wide background on the banner (teacher, admin and pupil class pages) and the pupil's class cards; admins change any class, a teacher only their own (banner button + class Settings); pupils read-only.
- **Pages:** `AdminClassesPage`, `AddClassPage`, `ClassDetailPage`, `SubjectDetailPage`, `AdminSchedulePage`, `TeacherTimetablePage`, `TeacherClassesPage`/`ClassDetailPage`, `TeacherAttendancePage`.
- **Roles:** admin (create/assign), teacher (log attendance, view).
- **Missing:** nothing major; sessions are derived from `store.classes` (day/time), no per-date session records except homework/timesheet `sessionId`s.

### Attendance & Register
- **Today:** Rebuilt as a time-scoped view over materialised sessions with a **derived lifecycle** — `deriveSessionState` computes the state at read time rather than storing it. Register drawer takes and re-takes marks; admins get centre-wide oversight, backfill and time-boxed unlocks.
- **Pages/modules:** `TeacherAttendancePage` ([TeacherPages.jsx](TeacherPages.jsx)), `AttendanceAdmin.jsx`, `attendance.jsx`, `mocks/attendance.mock.jsx`.
- **Store:** `tutoros.attendance.v2` — `{ submissions: { "<classId>|<date>": { submittedAt, submittedBy, records, note, late, byAdmin } }, amendments, seedCancelled, unlocks, unlockLog }`. `tutoros.attendance.nowOffset.v1` shifts "now" for demoing the lifecycle.
- **Roles:** teacher (take/amend), admin (oversee, backfill, unlock).
- **Note:** `records` is keyed by **student name**, not id — the same fragility as `Class.teacher` (§6). A seeded session carries no `records` until a register is actually written, so readers must treat a missing `records` as "no register yet" rather than "empty register".

### Resources (Materials library)
- **Today:** Shared file library with visibility levels (centre / on-request / private), share and access-request flows, pointer links into lesson plans and homework, and usage events that survive detaching. Approver falls back to an admin when the creator is deactivated; staff offboarding releases restricted items to the centre.
- **Pages:** `Resources.jsx` (teacher + admin), `AttachResourcesPanel` (lesson planner and homework builder).
- **Store:** `klasio.resources.v4` (+ `klasio.resources.view` / `.sort` / `.bannerDismissed` as per-device view state). Seeds three **centre documents** (`owner_kind: 'centre'` — safeguarding policy, staff handbook, online-safety policy). v4: lesson attachments point at reusable lessons (`context_type: 'lesson'`); adds `versions` and personal `folders` / `folder_items`.
- **Versions (decision #48):** "Replace file" in the detail drawer keeps history (`resVersionsOf`, `replaceFile`, `restoreVersion` — restore adds a version); a link attached before the latest version shows "updated since attached" (`resLinkStale`).
- **My folders (decision #48):** each person's own filing layer in the rail; filing never changes visibility.
- **Centre documents:** an admin can "Publish as <centre>" — shown as the centre's, always centre-wide, managed by any admin, never in a leaver's offboarding (`resIsCentreOwned` / `resCanManage`).
- **Centre scope:** every list goes through `resInCentre` (seed rows without `centre_id` read as the primary centre's; new rows are stamped with the active centre).
- **`resCanOpen`** is one rule for every role (own / centre-wide / shared) — no admin branch; the admin's routes in are the audited Override and the logged private open.
- **Roles:** teacher (own + shared), admin (all, with an audited override), student (only through a `student_visible` link — pupils never browse the library, by design).

### Staff & Timesheets
- **Today:** Teachers list/profile (incl. an **Availability** tab — view and override the teacher's weekly pattern and blackout dates), Roles & access (grant/revoke/transfer), timesheet capture from register + teacher timesheet + admin review/export. Timesheet periods are **anchored** (`config.anchorDate`) with a deadline (`dueOffsetDays`, `dueTime`) and a lock (`lockAfterDays`); the admin policy strip edits all four, the overview lists who hasn't submitted (`tsSubmissionState`: open / late / locked), and staff can't add to, edit or submit a locked period.
- **Pages:** `AdminTeachersPage`, `AddTeacherPage`, `TeacherProfilePage`, `AdminTeamPage`, `TeacherTimesheetPage`, `AdminTimesheetsPage`, `AdminTimesheetDetailPage`, `TimesheetCapture`.
- **Roles:** admin (manage/approve), teacher (log/submit).
- **Missing/stubbed:** timesheet approver id `a1` and centre id `centre-001` don't map to real roster entities (see §8).

### Invoicing
- **Today:** Complete ledger over external payments — derived status, payment schedules, detail drawer w/ mark-paid + audit, rate-limited reminders, CSV reconciliation, analytics, configurable VAT.
- **Pages:** `AdminInvoicesPage` ([Invoices.jsx](Invoices.jsx)); store `tutoros.invoices.v1`, aggregator `invAggregate`.
- **Roles:** admin only.
- **One financial source:** `invReadLedger` / `invLedgerRows` (window-exported) are how every other surface reads money — the Analytics Financial Overview and the student profile's Fees tab (joined on student id). `REPORTS_INVOICES` is deleted. `invLastRecorded` derives ledger freshness from the audit trail.
- **Missing:** no student/parent-facing invoice view (guardians never log in — decision #13).

### Communications
- **Today:** Announcements + Messages + Safeguarding/DSL; client-side keyword flagging, presets, multi-tenant isolation, live bell/badges lifted into `App`. Comms settings (safety preset, wordlist, DSL) is now the admin Settings → Communications tab (`CommsTab`), which receives the same lifted `comms` object. Store `tutoros.comms.v3` (+ pins `tutoros.comms.pins.v1`, dismissed `tutoros.notifs.dismissed.v1`).
- **Pages:** `CommunicationsPage`, `SafeguardingPage` (Flag queue · Channel browser · **Concern log**), `RaiseConcernButton` (header, admin + teacher, every screen), `StudentConcernsPanel` (student profile tab).
- **Safeguarding record (decision #43):** concerns are keyed to a pupil (roster `studentId`) or a colleague (`staffId`), with `category`, `severity`, `source` (`staff_concern` / `flag_escalation` / `dsl_opened`), `status` (`open` / `monitoring` / `closed`) and an append-only `notes[]` chronology. `concernAccess` decides full / status-only / hidden: DSLs and admins read in full; a raiser sees only their own rows' status; a concern about a DSL is `restricted` to the account owner; one about the owner has no in-app reader (open ruling in the plan). Escalation contacts (`COMMS_ESCALATION`) sit beside the log; new concerns appear in the DSL's bell. Older `{aboutUserId, reason, level, note}` rows are lifted by `normConcern`; seed concerns missing from a stored blob are merged by id (concerns are never deleted).
- **Roles:** all; admin gets Safeguarding; any staff member raises concerns; superadmin gets Announcements only (to account admins) — no Messages, and Support is its own page.
- **Missing:** parent recipients (notifications "coming soon").

### Homework
- **Today:** Largest module ([Homework.jsx](Homework.jsx), 266KB) — full assign→attempt→submit→mark→return loop, MathLive equation editor, PDF question import, analytics, folders. Own store `homework_store_v9` with deterministic synthetic submissions.
- **Pages:** `TeacherHomework`, `StudentHomework`, `HomeworkAnalytics` (a header lens toggle on the teacher page, decision #49).
- **Centre defaults:** a new assignment starts from the centre's teaching defaults (`klasioCentreSettings().teachingDefaults` — attempts, due days, late, auto-mark, review, hold marks); there is no per-teacher layer.
- **Effort series:** `klasioHomework.studentHomeworkSeries(studentId, {classLabel})` gives a pupil's marked homework as dated percentages — the homework series beside attainment.
- **Roles:** teacher, student.
- **Resolved (was "three homework truths"):** every tier now counts through one function, `getHomeworkCounts(store, scope)` ([Homework.jsx:2074](Homework.jsx#L2074)), scoped by `teacherId`, `studentId` or `classLabel`. `teacherMetrics`, `studentData`, the badges and the admin class card all call it, so the same number appears everywhere. The `homeworkFull` and `studentHomework` mocks survive only in the unloaded `design_extract/` tree.
- **Release gate:** `marksReleased(assignment, submission)` is exported on `window.klasioHomework` and is the **only** implementation of "may this student see their marks" — any surface showing a pupil their own result asks here rather than re-deriving it.

### Reports
- **Today:** Student Reports & Teacher Feedback system (replaced AI feedback). Reporting rules/policy resolution, template maker, ratings (4-tier), PDF export. Store `reports_store_v2`. **Worklists (decision #51):** "Due this week" and "Overdue" are rail filters on the teacher page and the admin list (`DueWorklist`, from `computeUpcomingReports`), with a one-line `OverdueBanner` only while something is overdue; the teacher page has no stat cards and remembers grid/list in `klasio.reports.view`; "Start report" opens `NewReportModal` prefilled for that pupil. `UpcomingReportsPage` is gone; the admin keeps its governance stat band and upcoming card.
- **Pages:** `AdminReportsConfig`/`AdminReportsSettings`/`AdminReportingRules`, `TeacherReports`, `StudentReports`, `ReportEditor`, `ReportReadingView`. The centre exports (`AdminReportsGenerate`) now live on their own **Analytics** page (`AdminAnalyticsPage`).
- **Roles:** admin (config), teacher (write), student (read).
- **Missing:** parent notification (future flag).

### Tracking & Lesson Planner
- **Today:** Teacher Tracking is a Hub → Detail structure over a spreadsheet-style grid with keyboard navigation and typed columns. Column kinds are `score / checkbox / select / rating / text / grade / date`, with a live migration from the old `number` → `score` and `check` → `checkbox` names. A score column can **count as an assessment** (`countsAsAssessment` + `assessedOn`, "ASSESSED" in the header) — its marks feed attainment through `klasioScores`. **Lesson planner (decision #47):** reusable **lessons** (library) and **planned lessons** (a lesson for one class on one date, with notes and a reflection); plan from scratch or reuse, fork a separate copy, "also planned for" history; materials attach to the lesson.
- **Stores:** `tutoros.tracking.v1` (grids) + `tutoros.tracking.recents.v1` (recently opened); `klasio.lessons.v1` (`{ lessons, deliveries }`, deliveries keyed `classId__date`, each with `shareWithClass` — pupils read only title/topic/objectives through `klasioLessons.pupilSummaryFor`; plans saved under the old `klasio.lessonPlans.v1` are migrated on first read).
- **Roles:** teacher only — trackers are internal working data and no student surface reads them.
- **Note:** tracker cells are keyed by **student name**, like the register.

### Settings
- **Today:** Per-role tabbed settings for staff (`settings_store_v1`): shared Account/Notifications/Appearance + one role-specific tab (Platform/Centre/Teaching). Pupils get **one page with no tabs** (`StudentSettingsPage`, decision #61): read-only account, change PIN/password, in-app notification topics (`klasio.studentNotifPrefs.v1`, obeyed by the bell) and a subject access request (`klasio.dataRequests.v1`, 13+, decision #62). Centre tab also has **Pupil privacy** — class averages, rank and its minimum age (`admin.privacy`, read by `window.klasioPrivacy()`, decision #59). Centre tab owns the term schedule, live accent (`window.__setAccent`), **Teaching defaults** (decision #53) and **What pupils see** — percentage / indicative grade / both (decision #54). The teacher's Teaching tab is **When I can teach** (availability + blackout dates, decision #55), their alerts, and a read-only view of the centre's homework defaults — the old grading-scale and working-hours fields are gone. Dual Admin/Teacher view switch lives here.
- **Pages:** `SettingsPage` + tab components.
- **Roles:** all. Plans/Billing & Storage **moved out** of Settings to Account tier.

### Storage
- **Today:** Account-layer usage/quota derived live from file records (`tutoros.storage.v1`), R2 prototype config, pooled-vs-split, guarded delete w/ retention locks, upload guard, sidebar meter.
- **Pages:** `StorageAdminPanel` (the account-tier `storage` route), `StorageOwnerPanel` (the superadmin's top-level `storage` page, with cost against MRR, 30-day growth and the R2 reconciliation panel) ([Storage.jsx](Storage.jsx)).
- **Roles:** admin/owner.

### Centres & Subscription / Plans & Billing
- **Today:** Plan-aware multi-centre mgmt (`CentresPage`, `useSubscriptionStore`, `tutoros.subscription.v2`; `readSubscription` is the non-hook read). **Setup checklist:** `centreSetupStatus(centreId)` is the one status object the dashboard prompt, the Centres drawer and Settings → Centre read — derived from the roster for the primary centre, else from flags written by `markCentreSetup` when a flow finishes; only `setup.dismissed` is stored. **Centre code:** `resolveCentreCode` (current / grace / retired), `genCentreCode` avoids `allCentreCodes()`, `regenerateCentreCode` keeps `previousCode` for `CODE_GRACE_DAYS` (30), `centreCodeFor` is what slips print. `paymentMethod` on the subscription is a read-only card mirror (seeded to expire next month). superadmin-editable plan catalogue (`tutoros.plans.v1` — capabilities, pricing bullets, Stripe sync state; signup lists only sellable plans via `getPublicPlans` and honours `?plan=<code>`) + price-override codes (`tutoros.plancodes.v1`) + a global free trial (`tutoros.trial.v1`, Platform Controls → signup/billing), admin Billing tab.
- **Roles:** owner-admin (centres/billing), superadmin (catalogue/codes).

### Onboarding / Auth
- **Today:** Signup issues centre code → setup checklist → teacher invites → CSV/single student provisioning → printable claim slips → public claim page (teacher/student/under-13 parent consent) → People & Invites tracker. Store `tutoros.onboarding.v2::<centreId>`; accounts = nested `account` object on students/teachers.
- **Pages:** Auth `LoginPage`/`SignupPage`; Onboarding `InviteTeachersPage`, `BulkImportPage`, `AddSingleStudentPage`, `ClaimSlipsPage`, `ClassRosterPage`, `PeopleInvitesPage`, `ClaimPage`.
- **Roles:** admin (all), invitees (claim).
- **Claim slips** print the centre code; the reprint link from a code change opens every unclaimed slip (`__adminParam = 'unclaimed'`).
- **Student login** resolves the code through `resolveCentreCode`: an old code inside its grace window signs in and shows the new code; a retired one says the code has changed.
- **Missing:** `CentreSetupPage` deprecated/unrouted.

### Solo tutor demo account
- **Today:** A **second demo account, not a fifth role.** `index.html` holds an `account` state (`'centre'` | `'solo'`); `window.__setAccount('solo')` swaps the whole shell, and every `__navigate` call returns to the centre demo. The solo shell has no role strip and no centre chrome.
- **Files:** `soloCapabilities.jsx` (**the only file that knows tier ids** — `solo_free` / `solo_core` / `solo_pro` and the capability matrix), `soloData.jsx` (state + derived model, incl. its own "worth a look" at-risk rule), `Solo.jsx` (shell + pages, registers `NAV_CONFIG.solo` and exposes `SoloShell`), `mocks/solo.mock.jsx` (fixtures — a separate dataset the centre demo never reads).
- **Documented in:** `docs/SOLO-DEMO-INVENTORY.md`; it is the behavioural spec for Phase 13b of the development plan.
- **Roles:** the tutor alone, holding owner + admin + teacher + DSL lead at one implicit centre.

---

## 5. Actions & Functions

### Cross-cutting selector layers
| Function | File | Trigger | Does | Reads/Writes | Complete? |
|---|---|---|---|---|---|
| `centreMetrics.getActiveStudentCount` / `getClassEnrolments` / `getAtRiskStudents` / `getAttendanceWeek` / `getSessionsWeek` / `getCapacityUsed` / `getInvoiceRollup` / `getSeatUsage` / `getStoragePool` | [centreMetrics.jsx](centreMetrics.jsx) | render | **Every centre rollup.** At-risk thresholds **75/50/55**. | reads `admin_store_v4`, `tutoros.subscription.v2`, `tutoros.invoices.v1`; storage/plan lazily | ✅ |
| `centreMetrics.audit` / `readAudit` (`window.klasioAudit`) | [:209](centreMetrics.jsx#L209) | security actions | append-only audit | `tutoros.audit.v1` (capped 500) | ✅ |
| `teacherMetrics.getMyClasses/getMyStudents/getMetrics/getToMark/queryStudents/getAtRiskStudents` | [teacherMetrics.jsx](teacherMetrics.jsx) | render | **Teacher rollups via class-assignment JOIN.** At-risk **85/60** + declining **attainment** trend (from results). | reads `admin_store_v4`, `window.klasioHomework`, `window.klasioScores` | ✅ |
| `klasioScores.getStudentScoreSeries/attainmentSeries/homeworkSeries/classAssessments/classAttainment` + `createAssessment/recordResults/setPublished` | [assessments.jsx](assessments.jsx) | render / Progress tab | **THE score selector** — attainment (results) and homework (marked work) as two series; null when a pupil has no results | `klasio.assessments.v1` (seeded from `SEED_ATTAINMENT_BASELINE`), tracker columns that count as assessments (`tutoros.tracking.v1`), `homework_store_v9` | ✅ |
| `klasioGrades.scaleFor/pctToGrade/gradesFor/toneForGrade` | [teacherGrades.jsx](teacherGrades.jsx) | render | grade taxonomy resolution | in-module `GRADE_SCALES` | ✅ |
| `klasioStudent.metrics.termAverage/attendanceOverall/homeworkSummary/resultsSummary`, `getContinueHomework`, `resolveTeacher`, `formatGrade`, `formatAttainment` | [studentData.jsx](studentData.jsx) | render | **Student rollups** — per-class scores are the pupil's **published** results; `formatAttainment` applies the centre's pupil grade display | `klasioScores`, `homework_store_v9` | ✅ |
| `permissions.canRevokeRole/canGrantRole/isAccountOwner/adminCount/membersForCentre` | [permissions.jsx](permissions.jsx) | Team page mutations | role guardrails → `{ok,reason}` | `ONB_MEMBERSHIPS` | ✅ |
| `klasioCovers.classCover(cls, subjects)` / `canChangeBackground(actor, cls)`; store `setClassBackground(classId, selection, actor)` | [classCovers.jsx](classCovers.jsx), [AdminPages.jsx](AdminPages.jsx) | render / Change background → Save | **A class's background** — resolves the stored choice or derives it from the subject (per class id); the write validates against the registry and allows an admin any class, a teacher only their own | `admin_store_v4` class `coverPresetId` / `coverIconId` | ✅ |

### Stores (localStorage hooks)
| Hook / writer | File | Key | Writes |
|---|---|---|---|
| `useAdminStore` | AdminPages.jsx | `admin_store_v4` | teachers/classes/students/subjects/dimensions CRUD, holidays, teaching `availability` |
| `useSubscriptionStore` | Centres.jsx | `tutoros.subscription.v2` | centres CRUD, plan, billing, redeemedCode, trial stamp, ownership |
| `useOnboardingStore` | Onboarding.jsx | `tutoros.onboarding.v2::<centreId>` | steps, memberships, grantRole/revokeRole, roleLog, importDraft, provisioning |
| `usePlansStore` / plan codes | Plans.jsx | `tutoros.plans.v1` / `tutoros.plancodes.v1` | catalogue + override-code CRUD/redeem |
| `usePlatformTrialStore` | Plans.jsx | `tutoros.trial.v1` | free trial per audience `{ centre, solo }` (enabled/days/planId/requireCard/onEnd); an old flat blob reads as the centre offer |
| `useReportsStore` | Reports.jsx | `reports_store_v2` | report CRUD, config, templates |
| `useSettingsStore` | Settings.jsx | `settings_store_v1` | per-role staff settings, centre terms, centre `teachingDefaults` + `pupilGradeDisplay`, `admin.privacy` (pupil privacy flags) |
| Pupil notification topics | Settings.jsx | `klasio.studentNotifPrefs.v1` | per pupil: homeworkDue / marksReleased / announcements / messages (in-app; under-13 default off) |
| Pupil data requests | Settings.jsx | `klasio.dataRequests.v1` | pupil-filed SARs (`window.klasioDataRequests`); admin bell item + owner DSAR queue |
| Teacher My Classes view | TeacherPages.jsx | `klasio.teacherClasses.view` | per-device list/grid preference |
| `useComms` | Communications.jsx | `tutoros.comms.v3` (+ `tutoros.comms.pins.v1`, `tutoros.notifs.dismissed.v1`) | announcements/messages/flags/config |
| `useStorageStore` | Storage.jsx | `tutoros.storage.v1` | files, R2 config, add-on blocks |
| Invoices store | Invoices.jsx | `tutoros.invoices.v1` | invoices, reminders, audit, config |
| Timesheets store | Timesheets.jsx | `tutoros.timesheets.v3` | TimeEntry upsert/approve/reject/export |
| Homework store | Homework.jsx | `homework_store_v9` | assignments/submissions/folders |
| Tracking | TeacherPages.jsx | `tutoros.tracking.v1` / `tutoros.tracking.recents.v1` | tracker grids, recently opened |
| Attendance / register | attendance.jsx, AttendanceAdmin.jsx | `tutoros.attendance.v2` (+ `tutoros.attendance.nowOffset.v1`) | register submissions, amendments, unlocks, cancelled sessions |
| Resources | Resources.jsx | `klasio.resources.v4` (+ `.view` / `.sort` / `.bannerDismissed`) | resources (incl. `owner_kind`, `centre_id`), shares, access requests, links (`lesson` / `homework`), usage events, versions, folders + folder items |
| Lessons + planned lessons | lessons.jsx | `klasio.lessons.v1` | `{ lessons, deliveries }` — reusable lessons and `classId__date` deliveries (notes, reflection); migrates the old `klasio.lessonPlans.v1` |
| Assessments + results | assessments.jsx | `klasio.assessments.v1` | assessments per class, marks per pupil, published flags (incl. for tracker-sourced assessments) |
| Predicted & target grades | assessments.jsx | `klasio.targets.v1` | `window.klasioTargets` — one row per pupil per subject (decision #28), set on the class Progress tab; read by the student surface, admin profile and new reports |
| Class change requests | ClassRequests.jsx | `klasio.classRequests.v1` | teacher requests (kind, details, status, decision note, result class) |
| Active student | studentData.jsx | `klasio.activeStudent` | which pupil the student demo is viewing (StudentSwitcher) |
| Remembered centre | Auth.jsx | `tutoros.lastCentre` | prefills the centre code on the login form |
| Homework / Reports view state | Homework.jsx, Reports.jsx | `klasio.homework.view` / `klasio.reports.view` | per-device list/grid preference |
| SA audit / support sessions | SuperAdmin.jsx | `tutoros.saudit.v1` / `tutoros.impersonation.v1` (live session) / `tutoros.supportsessions.v1` (finished) | platform audit, time-boxed view-as |
| Dashboard prefs | AdminDashboard/TeacherDashboard | `tutoros.dash.admin.v1` / `tutoros.dash.teacher.v1` | card layout/customisation |
| Platform switches / flags | SuperAdmin.jsx | `tutoros.platform.v1` / `tutoros.flags.v1` | maintenance, read-only (+ scope), signups, status page; feature flags (switch + account list). The old `tutoros.maintenance` key is folded in on first read |
| Accent / active centre | index.html | `tutoros.accent` / `tutoros.activeCentre` | live theming + tenant switch |

### Navigation / app-level handlers ([index.html](index.html))
| Handler | Line | Trigger | Does |
|---|---|---|---|
| `window.__navigate(role, pg)` | [:532](index.html#L532) | any nav / PPTX export | routes; rewrites legacy `setup`, `settings:billing`→`plans`, `settings:storage`→`storage` |
| `window.__openClaim(id)` | [:551](index.html#L551) | claim link | full-screen claim page |
| `window.__openLessonPlanner(classId,date,mode)` | index.html | teacher | opens the planner on one class's planned lesson for a date |
| `window.__registerSession` / `__classPrefill` / `__classesPane` / `__classTab` | TeacherDashboard, ClassRequests, AdminDashboard, TeacherPages | deep links | open one session's register / create-class prefilled from a request / the Classes Requests view / a class-detail tab |
| `window.__setAccent/__getAccent` | [:444](index.html#L444) | Settings→Appearance | live accent bridge |
| `window.__setCentre/__getCentre` | [:460](index.html#L460) | sidebar switcher | active centre |
| `buildCrumbs`, `readTermIndicator`, `normalizePage` | [:161](index.html#L161)/[:205](index.html#L205)/[:520](index.html#L520) | render | breadcrumbs, term chip, page normalisation |

**Metric-computing functions (every independent count of the "same" number) — see §7.**

---

## 6. Data Model

Entities live as `mocks/*.mock.jsx` globals (seed) → localStorage store (live). FKs noted.

| Entity | Shape (key fields) | Defined | Read | Written | Store key |
|---|---|---|---|---|---|
| **Teacher** | `id, name, subject, classes, students, hwToMark, attendance, rating, joined, email, phone, status, color, account?{status,setupMethod,inviteToken,employmentType,internalNotes…}` | `SEED_TEACHERS` [adminPages.mock:9](mocks/adminPages.mock.jsx#L9) | admin/teacher pages, both metrics layers | `admin_store_v4` | `admin_store_v4` |
| **Class** | `id, name, group, teacher(→name), day, time, room, students(count), capacity, status, tags[]` (+`cover?` = cover teacher; +`coverPresetId?`, `coverIconId?` = the background, null/absent = derived from the subject) | `SEED_CLASSES` [:28](mocks/adminPages.mock.jsx#L28) | schedule, timetable, metrics | admin store | `admin_store_v4` |
| **Student** | `id, firstName, lastName, year, dob, email, phone, address, subjects[], classIds[](→Class), guardian*{}, notes, attendance, hw, status, teacher(text), lastSeen, account?{status,setupMethod,username,syntheticEmail,underThirteen,consentRecorded,createdVia,provisionedOn,claimedOn,claimCode…}` | `SEED_STUDENTS` [:90](mocks/adminPages.mock.jsx#L90) | everywhere | admin store | `admin_store_v4` |
| **Subject** | `id, name, level, color, description` | `SEED_SUBJECTS` [:133](mocks/adminPages.mock.jsx#L133) | classes/subjects, grade scale lookup | admin store | `admin_store_v4` |
| **Dimensions** | `{id,name}` lists: `SEED_YEAR_GROUPS`, `SEED_LEVELS`, `SEED_EXAM_BOARDS` | [:154-174](mocks/adminPages.mock.jsx#L154) | AddClassPage | admin store | `admin_store_v4` |
| **allStudents** | `{name, year, subjects[], attendance, hw, status, teacher, lastSeen}` — **flat mirror of SEED_STUDENTS w/ "Ms. Clarke" naming**; read by nothing | [adminPages.mock](mocks/adminPages.mock.jsx) | — (dead) | — | — (mock only) |
| **Assessment / result** | assessment `{id, classId, subject, title, assessedOn, maxMarks, published, source: manual\|tracker}`; results `{[assessmentId]: {[studentId]: {marks}}}`. Seeded from `SEED_ATTAINMENT_BASELINE` + `ASSESSMENT_TEMPLATES` (the old roster `score` values seed results only — no screen reads them) | [assessments.mock](mocks/assessments.mock.jsx) | every progress / attainment surface via `klasioScores` | assessments store | `klasio.assessments.v1` |
| **Class change request** | `{id, centreId, classId?, kind(new_class/schedule/room/enrolment/cancel/other), body, details, requestedBy, status(open/actioned/declined), decisionNote, resultClassId}` | `CLASS_REQUEST_SEED` (adminPages.mock) | My Classes, class Settings, admin Classes → Requests, admin dashboard alert, Classes nav badge | requests store | `klasio.classRequests.v1` |
| **Teaching availability** | `{[teacherId]: {weekly: {Monday: [{from,to}]…}, blackouts: [{id,from,to,note}], setBy, updatedAt}}` | `SEED_AVAILABILITY` (adminPages.mock) | Settings → Teaching, teacher profile, create-class warning, cover pickers | admin store | `admin_store_v4` |
| **Centre profile** | `id, accountId, name, logo, brandAccent, contactEmail/Phone, address, city, region` | `CENTRE_PROFILES` [centreProfile.mock](mocks/centreProfile.mock.jsx) | `getCentreProfile` | (merged over by subscription centre row) | seed |
| **Centre (subscription)** | `id, name, slug, code, city, region, email, phone, accent, status, isPrimary, createdOn, setup{invite,students,classes}` | `ONB_SUBSCRIPTION.centres` [onboarding.mock:75](mocks/onboarding.mock.jsx#L75) | switcher, Centres, centreMetrics | `useSubscriptionStore` | `tutoros.subscription.v2` |
| **Subscription/account** | `planId, ownerUserId, billing{}, redeemedCode, centres[]` | `ONB_SUBSCRIPTION` | Centres/Billing/metrics | | `tutoros.subscription.v2` |
| **Membership (role grant)** | `{email, centreId, role}` — a person = many rows | `ONB_MEMBERSHIPS` [:92](mocks/onboarding.mock.jsx#L92) | permissions, Team | onboarding store | `tutoros.onboarding.v2::<c>` |
| **Plan** | `id, name, price, maxCentres, studentSeats, teacherSeats, storageGb, features[], order, archived` | `PLAN_CATALOG_SEED` [plans.mock:19](mocks/plans.mock.jsx#L19) + `PLANS` [onboarding.mock:36](mocks/onboarding.mock.jsx#L36) | Plans, Centres, seat/quota calc | plans store | `tutoros.plans.v1` |
| **Override code** | `code, kind(free_trial/percent_off/fixed_price), value, durationMonths, planId?, maxRedemptions?, redemptions[], status, note, createdAt` | `PLAN_CODES_SEED` [:39](mocks/plans.mock.jsx#L39) | SAControls, Billing | codes store | `tutoros.plancodes.v1` |
| **Global trial** | `enabled, days, planId?, requireCard, onEnd(bill/downgrade/suspend), updatedAt` — stamped onto a new subscription as `trial{days,planId,startedAt,endsAt,onEnd}` | `PLAN_TRIAL_SEED` [plans.mock](mocks/plans.mock.jsx) | SAControls, Signup, Billing, Centres | trial store | `tutoros.trial.v1` |
| **Invoice** | `id, number, familyId(→Family), studentIds[], classes[], issuedDate, payments[]{id,dueDate,amount,paidAt,paidBy,method}` (total **derived**) | `SEED_INVOICES` [invoices.mock:68](mocks/invoices.mock.jsx#L68) | Invoices, centreMetrics | invoices store | `tutoros.invoices.v1` |
| **Family** | `id, name, parent, email, phone, studentIds[]` | `SEED_FAMILIES` [:35](mocks/invoices.mock.jsx#L35) | Invoices | | seed |
| **Invoice reminder / audit** | `{id,invoiceId,sentAt,toEmail}` / audit rows | `SEED_INVOICE_REMINDERS`/`_AUDIT` | Invoices | invoices store | `tutoros.invoices.v1` |
| **TimeEntry** | `id, centreId, teacherId(→Teacher), sessionId(`classId\|date`), type(teaching/prep/marking/meeting/training/cover/other), date, durationMinutes, status(draft/submitted/approved/rejected/exported), note, approvedBy, approvedAt` | `SEED_TIME_ENTRIES` [timesheets.mock:24](mocks/timesheets.mock.jsx#L24) | Timesheets | timesheets store | `tutoros.timesheets.v3` |
| **Storage account/file** | account: `{accountId, plan…}`; file: `{id, centreId, category, name, sizeBytes, uploadedBy, uploadedAt…}` (synth-generated) | `STORAGE_ACCOUNTS_SEED`/`STORAGE_FILES_SEED` [storage.mock](mocks/storage.mock.jsx) | Storage, centreMetrics | storage store | `tutoros.storage.v1` |
| **R2 config** | `scope, bucketName, region, jurisdiction, accessKeyId, secretMasked, connected` | `STORAGE_R2_SEED` [:157](mocks/storage.mock.jsx#L157) | Storage | storage store | `tutoros.storage.v1` |
| **Comms user** | `id, name, role, centreId, classIds[]` | `COMMS_USERS` [communications.mock:23](mocks/communications.mock.jsx#L23) | Communications | | seed |
| **Announcement** | `id, scope(platform/centre/class), centreId, classId, authorId/Name/Role, audience{centreIds,roles,classIds}, title, body, priority, pinned, requiresAck, createdAt, expiresAt, reads{}, acks{}` | `COMMS_ANNOUNCEMENTS` [:61](mocks/communications.mock.jsx#L61) | Communications | comms store | `tutoros.comms.v3` |
| **Thread / Message** | `COMMS_THREADS` / `COMMS_MESSAGES` (id, participants, scope, body, flags) | [:136/:203](mocks/communications.mock.jsx#L136) | Communications | comms store | `tutoros.comms.v3` |
| **Flag / Concern (safeguarding)** | `COMMS_FLAGS`/`COMMS_CONCERNS` (status, by, at) | [:400/:406](mocks/communications.mock.jsx#L400) | SafeguardingPage | comms store | `tutoros.comms.v3` |
| **Report** | rules/templates/students/ratings — `REPORTS_CONFIG`, `REPORTS_TEMPLATES`, `REPORTS_STUDENTS`, `REPORTS_SEED` | [reports.mock](mocks/reports.mock.jsx) | Reports | reports store | `reports_store_v2` |
| **Report rule** | `id, targetType(TAG/CLASS/STUDENT), tag/classId/studentId, requirement(REQUIRED/OPTIONAL/OFF), frequency(WEEKLY/FORTNIGHTLY/MONTHLY/TERMLY), templateId, priority` | `REPORTS_CONFIG.reportRules` [:24](mocks/reports.mock.jsx#L24) | Reports policy resolution | reports store | `reports_store_v2` |
| **SA account** | `id, name, owner, ownerEmail, planId, status, country, createdAt, churnRisk, trialEndsAt, promoCode?, centres[]{id,name,city,country,students,teachers,usage}` | `SA_ACCOUNTS` [superAdmin.mock:37](mocks/superAdmin.mock.jsx#L37) | SuperAdmin | | seed |
| **SA analytics** | `SA_ROLE_COUNTS`, `SA_USER_GROWTH`, `SA_MRR_MOVEMENT`, `SA_ACTIVITY`, `SA_FEATURE_USAGE`, `SA_TXNS`, `SA_AUDIT`, `SA_DSAR`, `SA_SUSPICIOUS`, `SA_FLAGS`, `SA_SUPPORT_SESSIONS`, `SA_SERVICES` / `SA_QUEUES` / `SA_CRON` / `SA_INCIDENTS` / `SA_EMAIL_DELIVERY`, `BRAND` | [:18-215](mocks/superAdmin.mock.jsx) | SuperAdmin | | seed |
| **Homework assignment/submission** | assignment: `id, teacherId, classLabel, studentIds[], questions[], submissions{sid:{status,answers,marks,feedback,results,markedAt,classAvg,rank…}}, status, folderId, due` | `seedStore` [Homework.jsx:165](Homework.jsx#L165) + `HW_CLASSES`/`HW_STUDENTS`/`HW_PDF_BANKS`/`HW_MORE_ASSIGNMENTS` [homework.mock](mocks/homework.mock.jsx) | Homework | homework store | `homework_store_v9` |
| **Lesson / planned lesson** | lesson `{id, ownerId, title, topic, duration, objectives, agenda, homework}`; delivery `{id: classId__date, lessonId, classId, date, notes, reflection}` — `LESSON_SEED` built from `LESSON_PLAN_SEED` + `EXTRA_DELIVERIES` | [lessonPlanner.mock](mocks/lessonPlanner.mock.jsx) | LessonPlannerPage, class Planner tab, admin class plans, dashboard hero, Resources | persisted (`klasio.lessons.v1`) |
| **Tracker** | `id, name, description, classGroup, columns[]{id,name,type(score/checkbox/select/rating/text/grade/date),max?,options?,gradeScaleId?,countsAsAssessment?,assessedOn?}, entries{studentName:{colId:val}}` — legacy `number`/`check` types migrate on read | `DEFAULT_TRACKERS` [teacherPages.mock:79](mocks/teacherPages.mock.jsx#L79) | Tracking | tracking store | `tutoros.tracking.v1` |
| **Teacher-view mock rollups** | `teacherClasses`, `homeworkFull`, `teacherAllClasses` (hardcoded counts w/ `studentList[]`) | [teacherPages.mock](mocks/teacherPages.mock.jsx) | TeacherPages, teacherMetrics(`homeworkFull`) | | seed |
| **Teacher dashboard mocks** | `homeworkItems`, `studentProgress` — fallbacks only when the metrics layer is absent (`todaySchedule` and `attendanceClass` are gone: the hero materialises sessions) | [teacherDashboard.mock](mocks/teacherDashboard.mock.jsx) | TeacherDashboard (fallback) | | seed |
| **Student dashboard mocks** | `studentSelf`*, `studentHomework`, `studentSessions`* | [studentDashboard.mock](mocks/studentDashboard.mock.jsx) | StudentDashboard/studentData(`studentHomework`) | | seed |
| **Admin dashboard mocks** | `atRiskStudents`, `revenueData`, `recentActivity` | [adminDashboard.mock](mocks/adminDashboard.mock.jsx) | AdminDashboard | | seed |

**Relationships:** Student.classIds → Class.id; Class.teacher → Teacher.name (name-keyed, not id — fragile); Invoice.familyId → Family.id; Family.studentIds → Student.id; Membership.email → identity; Subscription.ownerUserId → Membership.email; TimeEntry.teacherId → Teacher.id, sessionId → `classId|date`; Comms user.classIds → Class.id.

**Inconsistent shapes:** Student records vary — some have full `account{}` (s1,s2,s9,s16,s17), most don't; guardian fields present on all but empty on provisioned-only. Teacher `account{}` only on t1 (active) and t12 (invited). `Class.teacher` is a name string (breaks if a teacher is renamed) whereas TimeEntry/homework use teacher **ids**.

---

## 7. Cross-Cutting Concerns

### Metrics / counts — every independent computation of the "same" figure
This is the biggest structural risk. There are **three sanctioned selector tiers** plus **several unreconciled legacy computations**:

**Sanctioned (single-source within their tier):**
- Centre/admin: `centreMetrics.*` — at-risk **75% / 50% / 55%** ([centreMetrics.jsx:120](centreMetrics.jsx#L120)). Used by AdminDashboard.
- Teacher: `teacherMetrics.*` — at-risk **85% / 60% + declining** ([teacherMetrics.jsx:104](teacherMetrics.jsx#L104)).
- Student: `klasioStudent.metrics.*` ([studentData.jsx:119](studentData.jsx#L119)).

⚠️ **The admin and teacher at-risk definitions deliberately disagree (75/50/55 vs 85/60)** — documented, but means "at-risk count" differs by who's looking.

**Unreconciled / independent counts:**
- ~~**Homework "to mark" has 3 sources**~~ — **resolved.** One function, `getHomeworkCounts(store, scope)` ([Homework.jsx:2074](Homework.jsx#L2074)), answers for every tier; `teacherMetrics`, `studentData`, the nav badges and the admin class card all call it. Separately, `marksReleased()` is the single release predicate, so a held-back paper cannot count as completed on one screen and not another.
- **Per-teacher/class counts baked into mocks:** `SEED_TEACHERS[].classes/students/hwToMark`, `teacherClasses[].students/avgScore/attendance`, `homeworkFull[].submitted/total/marked` are hardcoded and **not** derived from the roster — they can drift from `teacherMetrics`.
- **Student counts in SuperAdmin:** `SA_ACCOUNTS[].centres[].students/teachers/usage` are hardcoded platform figures unrelated to the `bm` roster. `SA_ROLE_COUNTS` is now *derived* from those centre rosters (parents are the only free parameter), and `SAMetrics.directory()` materialises one row per counted user from a seeded PRNG — so the Users table, the role counts and the per-centre cards always agree.
- **Financials — resolved:** `REPORTS_INVOICES` is deleted; the Analytics Financial Overview and the student Fees tab read the invoice ledger through `invLedgerRows`.
- **AdminDashboard** revenue/at-risk sidebar mixes derived (`centreMetrics.getAtRiskStudents`) with mock (`revenueData`, `recentActivity`, `atRiskStudents`).

### Grades / taxonomy — formats in use
| Format | Where |
|---|---|
| GCSE **9–1** (+U) | `klasioGrades.GRADE_SCALES.GCSE` — canonical |
| A-Level **A\*–E** (+U) | `klasioGrades.GRADE_SCALES['A-Level']`; student predicted grades |
| KS3 **descriptors** (Mastered→Below) | `klasioGrades.GRADE_SCALES.KS3` |
| Raw **%** scores | assessment results (attainment) and homework marks, two separate series from `klasioScores` — no stored roster score; banded to grades only via `pctToGrade` (indicative), shown to pupils per the centre's pupil grade display |
| Free-text **predicted letters** (A*/A/B/C/D) | `studentProgress[].predicted` (teacherDashboard.mock), `studentSelf.subjects[].predicted`, enrolment `predictedGrade` |
| Report **4-tier rating** (excellent/good/satisfactory/needs_improvement) | `_FOURTIER` / `RPT_FOURTIER` (reports.mock/Reports.jsx) — a **separate taxonomy** from klasioGrades |
| Homework A–F off % (legacy) | noted as removed in favour of klasioGrades ([teacherGrades.jsx:6](teacherGrades.jsx#L6)) |

### Brand / entity strings
- **Two product names coexist:** UI/brand = **"Klasio"** ([index.html title](index.html#L6), `BRAND.name` [superAdmin.mock:19](mocks/superAdmin.mock.jsx#L19), announcement copy). Internal plumbing = **"TutorOS"/"tutoros"**: every localStorage key (`tutoros.*`), synthetic student emails (`*.students.tutoros.app`), audit global `window.klasioAudit` (Klasio) vs keys (tutoros), R2 bucket `tutoros-prod-eu`, and the whole `design_extract/tuition-system/` tree.
- **Accent hex divergence:** `DS.accent = #4F46E5` (indigo) is the code default, but `TWEAK_DEFAULTS.accent = #43b190` (green) ([index.html:154](index.html#L154)) and the student role color is also `#43b190`. Raw hexes appear inline throughout (teacher `#0891B2`, subject colors, `TONE_RAMP`) rather than a single token.
- Historical divergent centre names ("Hillcrest", "Brighton Academy of Excellence", "BrightPath", "Bright Minds") were consolidated into `CENTRE_PROFILES` — but "BrightPath" still survives in the student email `oliver.chen@student.brightpath.edu` ([studentData.jsx:33](studentData.jsx#L33)) and as an SA account.

### Identity — personas that resolve inconsistently
- **Lisa Chen (admin/owner):** `lisa.chen@brightminds.co.uk` (onboarding) vs `lisa@brightminds.co.uk` (SA_ACCOUNTS owner). Also a comms user `u_lisa`.
- **Heebz A (teacher):** `t1` / `u_sarah` / `s.clarke@centre.co.uk` (roster) vs `t_clarke` / `s.clarke@centre.co.uk` (studentData enrolments, teacherMetrics principal). Two different teacher-ids for the same person.
- **Oliver Chen (student):** `s_oliver` (homework/reports) / `s2` (roster) / `u_oliver` (comms) — three ids, reconciled by studentData `currentStudent{id, commsId}`.
- **Teacher names reused as SA account owners:** `David Park`, `Marcus Webb`, `Priya Nair`, `Helen Yoo`, `Aisha Begum`, `Grace Okonkwo` all appear both as `bm`/roster teachers **and** as owners of unrelated platform accounts in `SA_ACCOUNTS` — cosmetically confusing across the superadmin/tenant boundary.
- **Dr. Hannah Owens / Dr. Owens** (student homework/sessions teacher for Chemistry) does not exist in the roster or enrolments (studentData resolves Chemistry → "Mr. David Park"). Divergent.

### Term / active-term context
- **Header chip** ([index.html:205](index.html#L205)): `readTermIndicator` reads `settings_store_v1` admin.centre terms → `resolveActiveTerm(getCentreTerms(c))` (date-driven, real).
- **Teacher** (`teacherMetrics.getCurrentTerm` [teacherMetrics.jsx:48](teacherMetrics.jsx#L48)): tries `window.readTermIndicator` — **but `readTermIndicator` is a local const in index.html, never assigned to `window`** — so it **always falls back** to hardcoded `{id:'summer-2026', name:'Summer Term 2026'}`.
- **Student** (`klasioStudent.activeTerm` [studentData.jsx:43](studentData.jsx#L43)): hardcoded "Summer Term · Week 2" + an April 2026 calendar with demo "today = 23 Apr".
- **Homework** dates are relative to real `new Date()` (evergreen), while **comms** anchors "today" to `2026-06-18` and **timesheets** to late June 2026, and **student** to April 2026. Four different "today"s.

---

## 8. Gaps, Dangling References & TODOs

### Referenced but missing
- **`window.readTermIndicator`** consumed by `teacherMetrics.getCurrentTerm` is never defined on `window` → silent fallback (see §7).
- **Parent/guardian portal & role:** `ParentPortal.jsx` exists only under `design_extract/` and is not loaded; `parentNotification`/`parentPortal` are future flags; `SA_ROLE_COUNTS.parent` is counted but has no views.
- **Timesheet `approvedBy: 'a1'`** and **`centreId: 'centre-001'`** ([timesheets.mock:22](mocks/timesheets.mock.jsx#L22)) reference an admin id and centre id that exist nowhere else (roster admins are keyed by email; the tenant is `bm`).
- **`design_extract/` tree** (old `TutorOS.html`, `tweaks-panel.jsx`, per-role `.jsx`, `chat1.md`, a binary `design`/`design.gz`) is legacy snapshot, unreferenced by the app.

### Stubs & placeholders
- AdminDashboard `outstandingInvoices = []` (TODO wire top overdue) ([AdminDashboard.jsx:478](AdminDashboard.jsx#L478)). `todaySessions` is now derived and no longer a stub.
- TeacherDashboard `recentSubmissions = []`, `unreadMessages = 0` (TODO) ([TeacherDashboard.jsx:303](TeacherDashboard.jsx#L303),[:252](TeacherDashboard.jsx#L252)).
- Reports "Parent notifications — Coming soon" ([Reports.jsx:2577](Reports.jsx#L2577)); `REPORTS_CONFIG.notifications.parentNotification: false // future`.
- `QRPlaceholder` (fake QR) used in Auth + Onboarding claim flows ([Onboarding.jsx:1008](Onboarding.jsx#L1008)).
- ~~Lesson plans persist only in memory~~ — **fixed**, and since Sept 2026 split into lessons + planned lessons in `klasio.lessons.v1` (`window.__lessonPlans` is gone).
- ~~"Request a class" writes an audit line and tells the teacher it was sent~~ — **fixed**: a real request lands in the admin Classes queue (decision #46).
- ~~Progress is fabricated (position-in-list scores, a hardcoded A-Level grade spread)~~ — **fixed**: attainment derives from assessment results (decision #50).
- ~~Teacher Settings "grading scale" and "working hours" are read by nothing~~ — **fixed**: replaced by the centre's pupil grade display and teaching availability (#54, #55).
- ~~`studentData.homeworkSummary` TODO: unify with the Homework store~~ — **fixed**: it delegates to `klasioHomework.getHomeworkCounts` / `marksReleased`.

### Dead / unused code
- **`allStudents`** (adminPages.mock) — legacy flat roster mirror of `SEED_STUDENTS` with different ("Ms. Clarke") teacher naming; imported by 3 files but superseded by the store roster. Candidate for removal.
- **`studentSelf`** and **`studentSessions`** (studentDashboard.mock) — **not referenced** by any page file (StudentDashboard now reads `klasioStudent`). Dead.
- **`CentreSetupPage`** (Onboarding.jsx) — explicitly "DEPRECATED / no longer routed".
- Legacy teacher-view mocks (`teacherClasses`, `homeworkFull`, `teacherAllClasses`) partly superseded by `teacherMetrics` but still consumed by some TeacherPages screens — mixed live/mock.

### Inline TODO/FIXME
Three left, all on dashboards: [AdminDashboard.jsx:478](AdminDashboard.jsx#L478), [TeacherDashboard.jsx:252](TeacherDashboard.jsx#L252) and [:303](TeacherDashboard.jsx#L303). (No FIXME/HACK found.) Both dashboards state the rule in a header comment: a card with no real source renders an empty state rather than inventing data.

### Inconsistencies (contradictions)
- **Store version drift:** live keys are `admin_store_v4`, `tutoros.subscription.v2`, `reports_store_v2`, `tutoros.comms.v3`, `tutoros.timesheets.v3`, `tutoros.attendance.v2`, `klasio.resources.v4`, `homework_store_v9`, `klasio.lessons.v1`, `klasio.assessments.v1`, `klasio.classRequests.v1` — check §5 rather than any older note, and never assume a version from memory.
- **Three prefixes in one app:** `tutoros.*` (legacy), `klasio.*` (newer work) and unprefixed (`admin_store_v4`, `homework_store_v9`, `reports_store_v2`, `settings_store_v1`). The development plan resolves this as a single Phase 18 cutover, never piecemeal.
- **Teacher identity double-id** (`t1` vs `t_clarke`) and **student triple-id** (see §7).
- **PLANS defined twice** (`PLANS` in onboarding.mock, `PLAN_CATALOG_SEED` in plans.mock) — comment says they "mirror" but two sources can diverge (e.g. `features[]` only on the catalogue).
- ~~**Financials** duplicated (invoices vs `REPORTS_INVOICES`)~~ — resolved: one ledger.
- **Multiple "today" anchors** across modules (§7).

---

## 9. Coverage Matrix (Role × Module)

✅ full · 🟡 partial · ⬜ none · ❓ unclear

| Module | superadmin | admin | teacher | student | parent |
|---|:--:|:--:|:--:|:--:|:--:|
| Dashboard | ✅ | 🟡 (TODO tiles) | 🟡 (TODO tiles) | ✅ | ⬜ |
| Students & Enrolment | 🟡 (platform counts) | ✅ | 🟡 (read-only) | ✅ (self) | ⬜ |
| Classes & Scheduling | ⬜ | ✅ | ✅ | ✅ (My Classes, sessions) | ⬜ |
| Attendance & Register | ⬜ | ✅ (oversight, backfill, unlock) | ✅ (take/amend) | 🟡 (own attendance %) | ⬜ |
| Staff & Timesheets | 🟡 (SA users) | ✅ | ✅ | ⬜ | ⬜ |
| Invoicing | 🟡 (SA revenue) | ✅ | ⬜ | ⬜ | ⬜ |
| Communications | ✅ (no Messages) | ✅ (+Safeguarding) | ✅ | ✅ | ⬜ |
| Homework | ⬜ | ⬜ | ✅ | ✅ | ⬜ |
| Reports | ⬜ | ✅ (config) | ✅ (write) | ✅ (read) | ⬜ |
| Resources (Materials) | ⬜ | ✅ (all + audited override) | ✅ (own + shared) | 🟡 (via student-visible link) | ⬜ |
| Tracking & Lesson Planner | ⬜ | 🟡 (plans on class card) | ✅ | ⬜ (deliberate) | ⬜ |
| Settings | ✅ | ✅ | ✅ | ✅ | ⬜ |
| Storage | 🟡 (R2 platform) | ✅ (owner) | ⬜ | ⬜ | ⬜ |
| Centres / Plans / Billing | ✅ (catalogue) | ✅ (owner only) | ⬜ | ⬜ | ⬜ |
| Onboarding / Auth | ⬜ | ✅ | 🟡 (claim) | 🟡 (claim) | 🟡 (under-13 consent) |
| Platform Controls / Security | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |

---

## Biggest gaps to plan around

1. **No unified metrics layer across tiers.** Three sanctioned selector layers (`centreMetrics` 75/50/55, `teacherMetrics` 85/60, `klasioStudent`) deliberately disagree on at-risk, and the solo demo adds a fourth rule ("worth a look"). *Per-teacher counts*, *SA platform counts* and *financials* are still each computed independently from hardcoded mocks. Homework is the one that got fixed — `getHomeworkCounts` is now the single source — and it shows the shape of the remedy for the rest: one scoped function per figure, called by every tier.

2. **Identity & tenant keys are not canonical.** Same humans carry multiple ids (`t1`/`t_clarke`, `s2`/`s_oliver`/`u_oliver`), `Class.teacher` is name-keyed while timesheets/homework are id-keyed, and tenant ids fork (`bm` vs `centre-001` vs `ctr_bm_london` vs `acc_brightminds`). Cross-module joins are fragile.

3. **Parent/guardian is a phantom role.** Counted, consented (under-13), and notified "soon", but has zero implemented views — a whole persona is scaffolding only.

4. **Brand and theming are split-brained.** "Klasio" (UI) vs "tutoros" (every storage key, synthetic email, bucket) plus two default accents (`#4F46E5` code vs `#43b190` tweaks/student) and raw hexes inline — a rename or re-theme touches dozens of scattered literals.

5. **Term/context and "today" have no single source.** The header reads real term config, but teacher term silently dead-falls to a hardcoded value (broken `window.readTermIndicator` reference), and student/comms/timesheet/homework each anchor a different "today" (April vs June 2026 vs real clock). Time-relative UI won't reconcile.
