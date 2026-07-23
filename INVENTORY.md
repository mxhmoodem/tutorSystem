# Klasio / TutorOS — Full Repository Inventory

> **Read-only discovery report.** A complete map of every role, page, component, feature, action, data shape and dangling reference in the repo as it stands. Nothing here was changed. Where I inferred intent it is labelled **(inferred)**.

## How the app is built (orientation)

- **No build step, no framework tooling.** A single [index.html](index.html) loads React 18, ReactDOM, Babel-standalone, Recharts, PropTypes, KaTeX and MathLive from CDNs, then loads every `.jsx` file as `<script type="text/babel">`. Babel transpiles in-browser. Deployed via [vercel.json](vercel.json) as static files.
- **Globals, not modules.** There is no `import`/`export`. Each file is a Babel `<script>`; top-level `const`s are lexical globals visible to later scripts, and shared symbols are additionally published via `Object.assign(window, {...})`. Load order in [index.html](index.html) is therefore load-bearing (mocks → permissions → selector layers → feature modules → page modules).
- **Persistence = localStorage.** No backend. Every store is a versioned localStorage key seeded from a `mocks/*.mock.jsx` global. Comments throughout describe the intended future RLS/multi-tenant backend.
- **Single tenant in practice.** Only centre `bm` (Bright Minds Tuition) carries a live roster; other centres resolve to empty rollups.

Entry point / router: the `App` component in [index.html](index.html#L423) is a two-level state machine — `view` (role/landing/auth) × `page` (compound `<parent>:<section>` id). `renderContent()` ([index.html:561](index.html#L561)) dispatches on `view` then `parent`.

---

## 1. Roles

Roles are defined by `NAV_CONFIG` in [shared.jsx:395](shared.jsx#L395) (four UI roles) and the staff-role grant model in [permissions.jsx](permissions.jsx) (`STAFF_ROLES = ['admin','teacher']`).

| Role | Where defined | Landing / default view | Nav items visible | Notable permissions / restrictions |
|---|---|---|---|---|
| **superadmin** ("Platform Owner", `#7C3AED`) | [shared.jsx:396](shared.jsx#L396); persona `Marcus Hale` (`u_marcus`) | `superadmin` / `dashboard` → `SuperAdminDashboard` | Overview, Centres, Users, Revenue, Engagement, Communications (Announcements+Support), Security & Audit, System Health, Platform Controls, Settings | Platform-wide. Can impersonate tenants ([SAImpersonationBanner](SuperAdmin.jsx#L1920), `tutoros.impersonation.v1`). No Messages surface. Edits plan catalogue + override codes. |
| **admin** ("Centre Admin" / "Account Owner", `DS.accent`) | [shared.jsx:412](shared.jsx#L412); persona `Lisa Chen` (`lisa.chen@brightminds.co.uk`) | `admin` / `dashboard` → `AdminDashboard` | Dashboard; **Account tier (owner-only):** Centres, Plans & Billing, Storage; **Centre tier:** Students, Staff (Teachers/Roles & access/Timesheets), People & Invites, Classes (Classes/Subjects), Schedule, Invoices, Reports, Communications, Settings | Account-tier items gated by `isAccountOwner` ([permissions.jsx:95](permissions.jsx#L95)); non-owner admin sees `AccountLocked`. Owner label swaps to "Account Owner" in topbar. Can grant/revoke Admin+Teacher, transfer ownership. |
| **teacher** ("Teacher", `#0891B2`) | [shared.jsx:452](shared.jsx#L452); persona `Heebz A` (`t1`, `s.clarke@centre.co.uk`) | `teacher` / `dashboard` → `TeacherDashboard` | Dashboard, My Classes, My Students, Timetable, Lesson Planner, Homework (Assignments/Analytics), Attendance, Timesheet, Progress, Tracking, Reports, Communications, Settings | Scoped to classes where assigned (the class-assignment JOIN in [teacherMetrics.jsx](teacherMetrics.jsx)). Read-only student profile (no Fees/Account tabs). |
| **student** ("Student", `#43b190`) | [shared.jsx:474](shared.jsx#L474); persona `Oliver Chen` (`s_oliver`/`s2`/`u_oliver`) | `student` / `dashboard` → `StudentDashboard` | Overview, Homework (Assignments/Submitted/Results), My Progress, Sessions, Reports, Communications, Settings | Read-only own data. No account-tier concepts. Reads everything through `window.klasioStudent`. |
| **parent / guardian** | Referenced only: `SA_ROLE_COUNTS.parent: 70` ([superAdmin.mock](mocks/superAdmin.mock.jsx#L85)); guardian fields on students; under-13 consent flow in Onboarding; `parentNotification`/`parentPortal` flags | — | **NONE** | **Referenced but not implemented as a view.** `design_extract/tuition-system/project/ParentPortal.jsx` exists but is NOT loaded by [index.html](index.html). Parent notifications marked "Coming soon" ([Reports.jsx:2577](Reports.jsx#L2577)). |

**Assignable staff roles** are only `admin` + `teacher` ([permissions.jsx:25](permissions.jsx#L25)). Multi-role is supported: one identity holds several roles via several `ONB_MEMBERSHIPS` rows (e.g. Lisa = admin+teacher at `bm`), grouped into a `roles[]` array by `membersForCentre`. Account ownership is **derived** from `subscription.ownerUserId`, never stored on a person.

---

## 2. Pages / Views / Routes

The page id is `<parent>:<section>` for dropdown sub-sections (e.g. `reports:browse`) or `<id>_<detail>` for sub-pages (e.g. `students_add`); `navParentId` ([shared.jsx:496](shared.jsx#L496)) folds both back to the parent. `normalizePage` ([index.html:520](index.html#L520)) auto-expands a bare id to its first sub-section. The complete navigable set is enumerated in the Tweaks panel ([index.html:694-747](index.html#L694)).

### Public / pre-auth
| Page ID | Component | Roles | Purpose | Status |
|---|---|---|---|---|
| `landing` | `LandingPage` ([LandingPage.jsx](LandingPage.jsx)) | public | Marketing site | complete |
| `login` | `LoginPage` ([Auth.jsx](Auth.jsx)) | public | Staff/Student login toggle, centre switcher, centre-code+username | complete |
| `signup` | `SignupPage` ([Auth.jsx](Auth.jsx)) | public (admin) | Admin-only signup, issues centre code | complete |
| `claim` (`__openClaim(id)`) | `ClaimPage` ([Onboarding.jsx:1599](Onboarding.jsx#L1599)) | public invitee | Teacher/student/under-13 parent-consent account claim | complete |

### Superadmin (`SuperAdminPages` router [SuperAdmin.jsx:1945](SuperAdmin.jsx#L1945))
| Page ID | Component | Purpose | Status |
|---|---|---|---|
| `dashboard` | `SuperAdminDashboard` ([:300](SuperAdmin.jsx#L300)) | Platform KPIs, growth, MRR, activity | complete |
| `centres` | `SACentresPage` ([:515](SuperAdmin.jsx#L515)) | All tenant accounts/centres, suspend, impersonate | complete |
| `users` | `SAUsersPage` ([:829](SuperAdmin.jsx#L829)) | Cross-platform users, role counts | complete |
| `revenue` | `SARevenuePage` ([:1050](SuperAdmin.jsx#L1050)) | MRR, failed payments, transactions | complete |
| `engagement` | `SAEngagementPage` ([:1203](SuperAdmin.jsx#L1203)) | Feature usage, device split | complete (has `SAMPLE` synth) |
| `comms` | `SACommsPage` ([:1497](SuperAdmin.jsx#L1497)) / `CommunicationsPage` | Platform announcements + support | complete |
| `security` | `SASecurityPage` ([:1587](SuperAdmin.jsx#L1587)) | Audit log, DSAR, suspicious activity, flags | complete |
| `system` | `SASystemPage` ([:1370](SuperAdmin.jsx#L1370)) | System health, maintenance toggle (`tutoros.maintenance`) | complete |
| `controls` | `SAControlsPage` ([:1726](SuperAdmin.jsx#L1726)) | Platform controls; embeds Plans catalogue + override codes | complete |
| `settings` | `SettingsPage role="superadmin"` | Platform Defaults tab + shared tabs | complete |

### Admin (dispatched in [index.html:576](index.html#L576); `AdminPages` router [AdminPages.jsx:3156](AdminPages.jsx#L3156)+)
| Page ID | Component | Purpose | Status |
|---|---|---|---|
| `dashboard` | `AdminDashboard` ([AdminDashboard.jsx](AdminDashboard.jsx)) | Centre KPIs, flagged students, revenue chart | partial — `todaySessions`/`outstandingInvoices` are `[]` TODOs ([:211](AdminDashboard.jsx#L211),[:220](AdminDashboard.jsx#L220)) |
| `centres` | `CentresPage` ([Centres.jsx:402](Centres.jsx#L402)) | Multi-centre mgmt + setup drawer | complete (owner-only; else `AccountLocked`) |
| `plans` | `AccountBillingPage`→`BillingTab` ([index.html:412](index.html#L412)) | Subscription, seats, billing, redeem code | complete (owner-only) |
| `storage` | `AccountStoragePage`→`StorageAdminPanel` ([index.html:417](index.html#L417)) | Pooled storage/quota | complete (owner-only) |
| `students` | `AdminStudentsPage` ([AdminPages.jsx:256](AdminPages.jsx#L256)) | Roster table | complete |
| `students_add` | `EnrolStudentPage` ([:403](AdminPages.jsx#L403)) | Enrol/create student | complete |
| `student_profile` | `StudentProfilePage` ([:1244](AdminPages.jsx#L1244)) | Full per-student analytics + edit | complete (shared w/ teacher, read-only) |
| `classes` (`:classes`/`:subjects`) | `AdminClassesPage` ([:1793](AdminPages.jsx#L1793)) | Classes + Subjects | complete |
| `classes_add` | `AddClassPage` ([:1893](AdminPages.jsx#L1893)) | 3-step create-class | complete |
| `class_detail` | `ClassDetailPage` ([:2260](AdminPages.jsx#L2260)) | Banner + tabs (Overview/Students/Homework/Analytics) mirroring the teacher class workspace; roster, cover teacher | complete |
| `subject_detail` | `SubjectDetailPage` ([:1669](AdminPages.jsx#L1669)) | Subject rollup | complete |
| `teachers` | `AdminTeachersPage` ([:2932](AdminPages.jsx#L2932)) | Staff list | complete |
| `teachers_add` | `AddTeacherPage` ([:2562](AdminPages.jsx#L2562)) | Add teacher | complete |
| `teacher_profile` | `TeacherProfilePage` ([:2714](AdminPages.jsx#L2714)) | Teacher detail, assign cover | complete |
| `team` | `AdminTeamPage` ([Team.jsx:93](Team.jsx#L93)) | Roles & access grants, ownership transfer | complete |
| `timesheets` (`:review`) | `AdminTimesheetsPage` ([Timesheets.jsx:800](Timesheets.jsx#L800)) | Review/approve/export timesheets | complete |
| `timesheet_detail` | `AdminTimesheetDetailPage` ([Timesheets.jsx:924](Timesheets.jsx#L924)) | Per-teacher timesheet detail | complete |
| `schedule` | `AdminSchedulePage` ([:3032](AdminPages.jsx#L3032)) | Weekly timetable grid | complete |
| `invoices` | `AdminInvoicesPage` ([Invoices.jsx:1174](Invoices.jsx#L1174)) | Ledger, drawer, reminders, CSV, analytics | complete |
| `reports` (`:overview/:browse/:generate/:settings`) | `AdminReportsConfig` ([Reports.jsx](Reports.jsx)) | Reporting rules/config | complete |
| `comms` (`:announcements/:messages/:safeguarding/:settings`) | `CommunicationsPage` | Comms + DSL oversight | complete |
| `settings` (`:centre/:notifications/:appearance/:account`) | `SettingsPage role="admin"` | Centre settings tabs | complete |
| **Onboarding routes** `people`, `invite_teachers`, `students_import`, `students_provision`, `claim_slips`, `class_roster` | `PeopleInvitesPage`, `InviteTeachersPage`, `BulkImportPage`, `AddSingleStudentPage`, `ClaimSlipsPage`, `ClassRosterPage` ([Onboarding.jsx](Onboarding.jsx)) | Provisioning flows | complete |
| `setup` | (rewritten in `__navigate` → `centres` drawer) | Legacy setup checklist | **rewired away**; `CentreSetupPage` ([Onboarding.jsx:418](Onboarding.jsx#L418)) marked **DEPRECATED / no longer routed** |

### Teacher (`TeacherPages` router [TeacherPages.jsx:2793](TeacherPages.jsx#L2793))
| Page ID | Component | Status |
|---|---|---|
| `dashboard` | `TeacherDashboard` ([TeacherDashboard.jsx](TeacherDashboard.jsx)) | partial — `recentSubmissions`/`unreadMessages` are TODO ([:267](TeacherDashboard.jsx#L267),[:211](TeacherDashboard.jsx#L211)) |
| `classes` | `TeacherClassesPage` ([:21](TeacherPages.jsx#L21)) | complete |
| `class_detail` | `TeacherClassDetailPage` ([:146](TeacherPages.jsx#L146)) | complete |
| `students` | `TeacherStudentsPage` ([:2626](TeacherPages.jsx#L2626)) | complete |
| `student_profile` | `StudentProfilePage role="teacher"` (from AdminPages) | complete |
| `timetable` | `TeacherTimetablePage` ([:627](TeacherPages.jsx#L627)) | complete |
| `lesson_planner` | `LessonPlannerPage` ([:1620](TeacherPages.jsx#L1620)) | complete (opened via `__openLessonPlanner`) |
| `homework` (`:assignments/:analytics`) | `TeacherHomework` (from Homework.jsx) | complete |
| `attendance` | `TeacherAttendancePage` ([:784](TeacherPages.jsx#L784)) | complete (register + `TimesheetCapture`) |
| `timesheet` | `TeacherTimesheetPage` ([Timesheets.jsx:647](Timesheets.jsx#L647)) | complete |
| `progress` | `TeacherProgressPage` ([:508](TeacherPages.jsx#L508)) | complete |
| `tracking` | `TeacherTrackingPage` ([:2265](TeacherPages.jsx#L2265)) | complete |
| `reports` | `TeacherReports` (from Reports.jsx) | complete |
| `comms`, `settings` | shared | complete |

### Student (`StudentDashboard` router [StudentDashboard.jsx:679](StudentDashboard.jsx#L679))
| Page ID | Component | Status |
|---|---|---|
| `dashboard` | `StudentDashboard` overview | complete |
| `homework` (`:assignments/:submitted/:results`) | `StudentHomework` (from Homework.jsx) | complete |
| `progress` | `StudentProgressPage` | complete |
| `sessions` | `StudentSessionsPage` | complete |
| `reports` | `StudentReports` (from Reports.jsx) | complete |
| `comms`, `settings` | shared | complete |

---

## 3. Components

### Shared primitives — [shared.jsx](shared.jsx) (design system)
| Component | Line | Props (key) | Notes |
|---|---|---|---|
| `DS` (tokens object) | [:5](shared.jsx#L5) | — | accent `#4F46E5`; live-mutated by `App` on accent change |
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

Full shared export at [shared.jsx:1945](shared.jsx#L1945): `DS, Icon, Badge, StatusPill, Avatar, KPICard, StatCard, shadeColor, Sidebar, PageHeader, Btn, Card, Table, TableRow, RowActionsMenu, Checkbox, Sparkline, LineChart, BarChart, ScorePill, Divider, NAV_CONFIG, navParentId, Modal, Field, Input, Textarea, Select, Segmented, SearchInput, EmptyState, useDashboardPrefs, CustomiseModal, Toggle, termTodayISO, getCentreTerms, termStatus, resolveActiveTerm`. (Note: `KPICard`, `StatCard`, `CentreSwitcher` are used internally but **not** in this window export — available by lexical global only.)

### Selector / SoT layers (not components, but shared logic)
| Module | Global | File |
|---|---|---|
| Centre metrics | `window.centreMetrics` + `window.klasioAudit` | [centreMetrics.jsx](centreMetrics.jsx) |
| Teacher metrics | `window.teacherMetrics` | [teacherMetrics.jsx](teacherMetrics.jsx) |
| Grade model | `window.klasioGrades` | [teacherGrades.jsx](teacherGrades.jsx) |
| Student SoT | `window.klasioStudent` (incl. `GradeChip`) | [studentData.jsx](studentData.jsx) |
| Permissions | `window.hasRole/isAdmin/isAccountOwner/canManageRoles/canRevokeRole…` | [permissions.jsx](permissions.jsx) |

### Feature-specific components (selected)
- **Homework.jsx** (self-contained sub-app): `MathEditor`/`MathDisplay` (MathLive), `PdfImportModal`, `QuestionEditor`, `QuestionAnswerInput/Display`, `TeacherBuilder`, `TeacherReview`, `TeacherOverview`, `HomeworkAnalytics`, `TeacherList`, `HwHome`, `Ring`, `HwStatusPill`, plus its **own** `Btn`/`Card`/`Avatar`/`Toast`/`Pill`/`LineChart`/`Donut`/`BarList` (duplicated from shared).
- **Reports.jsx**: `ReportEditor`, `ReportReadingView`, `RatingEditor`, `RichTextEditor`, `EditList`, `RptTag`, `UpcomingReports`/`computeUpcomingReports`, `printReportPDF`, `printCentreReport`.
- **Communications.jsx**: `CommunicationsPage`, `SafeguardingPage`, `NotificationBell`, `useComms`, `commsContext`, plus permission/derivation helpers `commsUnreadCount`, `canAnnounce`, `canMessage`, `commsRecipients`, `COMMS_PRESETS`, `commsUserById`, `userById` (all window-exported; `COMMS_PRESETS` consumed by the Settings Comms tab).
- **SuperAdmin.jsx**: `SAMetrics`, `SADonut`, `SAHBar`, `SARegionMap`, `SAStatusPill`, `SAPlanPill`, `SAChurnDot`, `SAImpersonationBanner`, `SAConfirm`, `SAFlash`.
- **AdminPages.jsx**: `DimensionSelect` (inline add-new), `StudentProfilePage`.
- **index.html** inline: `TopBar`, `HeaderUserMenu`, `AccountPageShell`, `AccountLocked`, `AccountBillingPage`, `AccountStoragePage`.

**Duplicated components (two doing the same job):** `Btn`, `Card`, `Avatar`, `LineChart`/chart wrappers all exist in both shared.jsx and Homework.jsx (Homework namespaces its own copies via IIFE). `StudentProfilePage` is shared admin↔teacher (intentional).

---

## 4. Features / Modules

### Dashboard
- **Today:** Per-role landing dashboards. Admin & Teacher dashboards derive KPIs from the selector layers; superadmin from SA mocks. Admin/Teacher dashboards have explicit `[]` TODO gaps (today's sessions, outstanding invoices, recent submissions, unread messages).
- **Pages/components:** `AdminDashboard`, `TeacherDashboard`, `SuperAdminDashboard`, `StudentDashboard`(overview).
- **Roles:** all four.
- **Missing/stubbed:** admin today-sessions & top-overdue-invoices; teacher recent-submissions & comms-unread.

### Students & Enrolment
- **Today:** Full roster CRUD, per-student analytics profile, enrol flow, class enrolment. Backed by the shared admin store.
- **Pages:** `AdminStudentsPage`, `EnrolStudentPage`, `StudentProfilePage`, `TeacherStudentsPage`.
- **Roles:** admin (full), teacher (read-only profile, own students).
- **Missing:** parent/guardian portal; `allStudents` legacy roster mirror still shipped.

### Classes & Scheduling
- **Today:** Classes + Subjects, 3-step create-class with configurable dimensions (year groups/levels/exam boards), class detail with cover teacher, weekly schedule grid, teacher timetable, register.
- **Pages:** `AdminClassesPage`, `AddClassPage`, `ClassDetailPage`, `SubjectDetailPage`, `AdminSchedulePage`, `TeacherTimetablePage`, `TeacherClassesPage`/`ClassDetailPage`, `TeacherAttendancePage`.
- **Roles:** admin (create/assign), teacher (log attendance, view).
- **Missing:** nothing major; sessions are derived from `store.classes` (day/time), no per-date session records except homework/timesheet `sessionId`s.

### Staff & Timesheets
- **Today:** Teachers list/profile, Roles & access (grant/revoke/transfer), timesheet capture from register + teacher timesheet + admin review/export.
- **Pages:** `AdminTeachersPage`, `AddTeacherPage`, `TeacherProfilePage`, `AdminTeamPage`, `TeacherTimesheetPage`, `AdminTimesheetsPage`, `AdminTimesheetDetailPage`, `TimesheetCapture`.
- **Roles:** admin (manage/approve), teacher (log/submit).
- **Missing/stubbed:** timesheet approver id `a1` and centre id `centre-001` don't map to real roster entities (see §8).

### Invoicing
- **Today:** Complete ledger over external payments — derived status, payment schedules, detail drawer w/ mark-paid + audit, rate-limited reminders, CSV reconciliation, analytics, configurable VAT.
- **Pages:** `AdminInvoicesPage` ([Invoices.jsx](Invoices.jsx)); store `tutoros.invoices.v1`, aggregator `invAggregate`.
- **Roles:** admin only.
- **Missing:** no student/parent-facing invoice view (student `REPORTS_INVOICES` is a separate mock, see §7).

### Communications
- **Today:** Announcements + Messages + Safeguarding/DSL + comms settings; client-side keyword flagging, presets, multi-tenant isolation, live bell/badges lifted into `App`. Store `tutoros.comms.v2` (+ pins `.pins.v1`, dismissed `.notifs.dismissed.v1`).
- **Pages:** `CommunicationsPage`, `SafeguardingPage`, `SACommsPage`.
- **Roles:** all; admin gets Safeguarding, superadmin gets Support (no Messages).
- **Missing:** parent recipients (notifications "coming soon").

### Homework
- **Today:** Largest module ([Homework.jsx](Homework.jsx), 266KB) — full assign→attempt→submit→mark→return loop, MathLive equation editor, PDF question import, analytics, folders. Own store `homework_store_v6` with deterministic synthetic submissions.
- **Pages:** `TeacherHomework`, `StudentHomework`, `HomeworkAnalytics`.
- **Roles:** teacher, student.
- **Missing:** its store is **separate** from `teacherMetrics.getToMark` (which reads the `homeworkFull` mock) and from `studentData.homeworkSummary` (which reads the `studentHomework` mock) — three homework truths (see §7).

### Reports
- **Today:** Student Reports & Teacher Feedback system (replaced AI feedback). Reporting rules/policy resolution, template maker, ratings (4-tier), PDF export, upcoming-reports card. Store `reports_store_v2`.
- **Pages:** `AdminReportsConfig`/`AdminReportsSettings`/`AdminReportingRules`, `TeacherReports`, `StudentReports`, `ReportEditor`, `ReportReadingView`.
- **Roles:** admin (config), teacher (write), student (read).
- **Missing:** parent notification (future flag).

### Settings
- **Today:** Per-role tabbed settings (`settings_store_v1`): shared Account/Notifications/Appearance + one role-specific tab (Platform/Centre/Teaching/Learning). Centre tab owns the term schedule + live accent (`window.__setAccent`). Dual Admin/Teacher view switch lives here.
- **Pages:** `SettingsPage` + tab components.
- **Roles:** all. Plans/Billing & Storage **moved out** of Settings to Account tier.

### Storage
- **Today:** Account-layer usage/quota derived live from file records (`tutoros.storage.v1`), R2 prototype config, pooled-vs-split, guarded delete w/ retention locks, upload guard, sidebar meter.
- **Pages:** `StorageAdminPanel`, `StorageOwnerPanel` ([Storage.jsx](Storage.jsx)); Settings storage tabs.
- **Roles:** admin/owner.

### Centres & Subscription / Plans & Billing
- **Today:** Plan-aware multi-centre mgmt (`CentresPage`, `useSubscriptionStore`, `tutoros.subscription.v2`), superadmin-editable plan catalogue (`tutoros.plans.v1`) + price-override codes (`tutoros.plancodes.v1`), admin Billing tab.
- **Roles:** owner-admin (centres/billing), superadmin (catalogue/codes).

### Onboarding / Auth
- **Today:** Signup issues centre code → setup checklist → teacher invites → CSV/single student provisioning → printable claim slips → public claim page (teacher/student/under-13 parent consent) → People & Invites tracker. Store `tutoros.onboarding.v2::<centreId>`; accounts = nested `account` object on students/teachers.
- **Pages:** Auth `LoginPage`/`SignupPage`; Onboarding `InviteTeachersPage`, `BulkImportPage`, `AddSingleStudentPage`, `ClaimSlipsPage`, `ClassRosterPage`, `PeopleInvitesPage`, `ClaimPage`.
- **Roles:** admin (all), invitees (claim).
- **Missing:** `CentreSetupPage` deprecated/unrouted.

---

## 5. Actions & Functions

### Cross-cutting selector layers
| Function | File | Trigger | Does | Reads/Writes | Complete? |
|---|---|---|---|---|---|
| `centreMetrics.getActiveStudentCount` / `getClassEnrolments` / `getAtRiskStudents` / `getAttendanceWeek` / `getSessionsWeek` / `getCapacityUsed` / `getInvoiceRollup` / `getSeatUsage` / `getStoragePool` | [centreMetrics.jsx](centreMetrics.jsx) | render | **Every centre rollup.** At-risk thresholds **75/50/55**. | reads `admin_store_v4`, `tutoros.subscription.v2`, `tutoros.invoices.v1`; storage/plan lazily | ✅ |
| `centreMetrics.audit` / `readAudit` (`window.klasioAudit`) | [:209](centreMetrics.jsx#L209) | security actions | append-only audit | `tutoros.audit.v1` (capped 500) | ✅ |
| `teacherMetrics.getMyClasses/getMyStudents/getMetrics/getToMark/queryStudents/getAtRiskStudents` | [teacherMetrics.jsx](teacherMetrics.jsx) | render | **Teacher rollups via class-assignment JOIN.** At-risk **85/60** + declining trend. | reads `admin_store_v4`, `window.homeworkFull`, `window.studentProgress` | ✅ |
| `klasioGrades.scaleFor/pctToGrade/gradesFor/toneForGrade` | [teacherGrades.jsx](teacherGrades.jsx) | render | grade taxonomy resolution | in-module `GRADE_SCALES` | ✅ |
| `klasioStudent.metrics.termAverage/attendanceOverall/homeworkSummary/resultsSummary`, `getContinueHomework`, `resolveTeacher`, `formatGrade` | [studentData.jsx](studentData.jsx) | render | **Student rollups.** | in-module `enrolments`, `studentHomework` mock | ✅ |
| `permissions.canRevokeRole/canGrantRole/isAccountOwner/adminCount/membersForCentre` | [permissions.jsx](permissions.jsx) | Team page mutations | role guardrails → `{ok,reason}` | `ONB_MEMBERSHIPS` | ✅ |

### Stores (localStorage hooks)
| Hook / writer | File | Key | Writes |
|---|---|---|---|
| `useAdminStore` | AdminPages.jsx | `admin_store_v4` | teachers/classes/students/subjects/dimensions CRUD |
| `useSubscriptionStore` | Centres.jsx | `tutoros.subscription.v2` | centres CRUD, plan, billing, redeemedCode, ownership |
| `useOnboardingStore` | Onboarding.jsx | `tutoros.onboarding.v2::<centreId>` | steps, memberships, grantRole/revokeRole, roleLog, importDraft, provisioning |
| `usePlansStore` / plan codes | Plans.jsx | `tutoros.plans.v1` / `tutoros.plancodes.v1` | catalogue + override-code CRUD/redeem |
| `useReportsStore` | Reports.jsx | `reports_store_v2` | report CRUD, config, templates |
| `useSettingsStore` | Settings.jsx | `settings_store_v1` | per-role settings, centre terms |
| `useComms` | Communications.jsx | `tutoros.comms.v2` (+pins/dismissed) | announcements/messages/flags/config |
| `useStorageStore` | Storage.jsx | `tutoros.storage.v1` | files, R2 config, add-on blocks |
| Invoices store | Invoices.jsx | `tutoros.invoices.v1` | invoices, reminders, audit, config |
| Timesheets store | Timesheets.jsx | `tutoros.timesheets.v2` | TimeEntry upsert/approve/reject/export |
| Homework store | Homework.jsx | `homework_store_v6` | assignments/submissions/folders |
| Tracking | TeacherPages.jsx | `tutoros.tracking.v1` | tracker grids |
| SA audit / impersonation | SuperAdmin.jsx | `tutoros.saudit.v1` / `tutoros.impersonation.v1` | platform audit, view-as |
| Dashboard prefs | AdminDashboard/TeacherDashboard | `tutoros.dash.admin.v1` / `tutoros.dash.teacher.v1` | card layout/customisation |
| Maintenance | SuperAdmin.jsx | `tutoros.maintenance` | maintenance flag |
| Accent / active centre | index.html | `tutoros.accent` / `tutoros.activeCentre` | live theming + tenant switch |

### Navigation / app-level handlers ([index.html](index.html))
| Handler | Line | Trigger | Does |
|---|---|---|---|
| `window.__navigate(role, pg)` | [:532](index.html#L532) | any nav / PPTX export | routes; rewrites legacy `setup`, `settings:billing`→`plans`, `settings:storage`→`storage` |
| `window.__openClaim(id)` | [:551](index.html#L551) | claim link | full-screen claim page |
| `window.__openLessonPlanner(group,date,mode)` | [:552](index.html#L552) | teacher | opens lesson planner |
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
| **Class** | `id, name, group, teacher(→name), day, time, room, students(count), capacity, status, tags[]` (+`cover?`) | `SEED_CLASSES` [:28](mocks/adminPages.mock.jsx#L28) | schedule, timetable, metrics | admin store | `admin_store_v4` |
| **Student** | `id, firstName, lastName, year, dob, email, phone, address, subjects[], classIds[](→Class), guardian*{}, notes, attendance, hw, score, status, teacher(text), lastSeen, account?{status,setupMethod,username,syntheticEmail,underThirteen,consentRecorded,createdVia,provisionedOn,claimedOn,claimCode…}` | `SEED_STUDENTS` [:90](mocks/adminPages.mock.jsx#L90) | everywhere | admin store | `admin_store_v4` |
| **Subject** | `id, name, level, color, description` | `SEED_SUBJECTS` [:133](mocks/adminPages.mock.jsx#L133) | classes/subjects, grade scale lookup | admin store | `admin_store_v4` |
| **Dimensions** | `{id,name}` lists: `SEED_YEAR_GROUPS`, `SEED_LEVELS`, `SEED_EXAM_BOARDS` | [:154-174](mocks/adminPages.mock.jsx#L154) | AddClassPage | admin store | `admin_store_v4` |
| **allStudents** | `{name, year, subjects[], attendance, hw, score, status, teacher, lastSeen}` — **flat mirror of SEED_STUDENTS w/ "Ms. Clarke" naming** | [:176](mocks/adminPages.mock.jsx#L176) | AdminPages/Homework/Reports | — | — (mock only) |
| **Centre profile** | `id, accountId, name, logo, brandAccent, contactEmail/Phone, address, city, region` | `CENTRE_PROFILES` [centreProfile.mock](mocks/centreProfile.mock.jsx) | `getCentreProfile` | (merged over by subscription centre row) | seed |
| **Centre (subscription)** | `id, name, slug, code, city, region, email, phone, accent, status, isPrimary, createdOn, setup{invite,students,classes}` | `ONB_SUBSCRIPTION.centres` [onboarding.mock:75](mocks/onboarding.mock.jsx#L75) | switcher, Centres, centreMetrics | `useSubscriptionStore` | `tutoros.subscription.v2` |
| **Subscription/account** | `planId, ownerUserId, billing{}, redeemedCode, centres[]` | `ONB_SUBSCRIPTION` | Centres/Billing/metrics | | `tutoros.subscription.v2` |
| **Membership (role grant)** | `{email, centreId, role}` — a person = many rows | `ONB_MEMBERSHIPS` [:92](mocks/onboarding.mock.jsx#L92) | permissions, Team | onboarding store | `tutoros.onboarding.v2::<c>` |
| **Plan** | `id, name, price, maxCentres, studentSeats, teacherSeats, storageGb, features[], order, archived` | `PLAN_CATALOG_SEED` [plans.mock:19](mocks/plans.mock.jsx#L19) + `PLANS` [onboarding.mock:36](mocks/onboarding.mock.jsx#L36) | Plans, Centres, seat/quota calc | plans store | `tutoros.plans.v1` |
| **Override code** | `code, kind(free_trial/percent_off/fixed_price), value, durationMonths, planId?, maxRedemptions?, redemptions[], status, note, createdAt` | `PLAN_CODES_SEED` [:39](mocks/plans.mock.jsx#L39) | SAControls, Billing | codes store | `tutoros.plancodes.v1` |
| **Invoice** | `id, number, familyId(→Family), studentIds[], classes[], issuedDate, payments[]{id,dueDate,amount,paidAt,paidBy,method}` (total **derived**) | `SEED_INVOICES` [invoices.mock:68](mocks/invoices.mock.jsx#L68) | Invoices, centreMetrics | invoices store | `tutoros.invoices.v1` |
| **Family** | `id, name, parent, email, phone, studentIds[]` | `SEED_FAMILIES` [:35](mocks/invoices.mock.jsx#L35) | Invoices | | seed |
| **Invoice reminder / audit** | `{id,invoiceId,sentAt,toEmail}` / audit rows | `SEED_INVOICE_REMINDERS`/`_AUDIT` | Invoices | invoices store | `tutoros.invoices.v1` |
| **TimeEntry** | `id, centreId, teacherId(→Teacher), sessionId(`classId\|date`), type(teaching/prep/marking/meeting/training/cover), date, durationMinutes, status(draft/submitted/approved/rejected/exported), note, approvedBy, approvedAt` | `SEED_TIME_ENTRIES` [timesheets.mock:24](mocks/timesheets.mock.jsx#L24) | Timesheets | timesheets store | `tutoros.timesheets.v2` |
| **Storage account/file** | account: `{accountId, plan…}`; file: `{id, centreId, category, name, sizeBytes, uploadedBy, uploadedAt…}` (synth-generated) | `STORAGE_ACCOUNTS_SEED`/`STORAGE_FILES_SEED` [storage.mock](mocks/storage.mock.jsx) | Storage, centreMetrics | storage store | `tutoros.storage.v1` |
| **R2 config** | `scope, bucketName, region, jurisdiction, accessKeyId, secretMasked, connected` | `STORAGE_R2_SEED` [:157](mocks/storage.mock.jsx#L157) | Storage | storage store | `tutoros.storage.v1` |
| **Comms user** | `id, name, role, centreId, classIds[]` | `COMMS_USERS` [communications.mock:23](mocks/communications.mock.jsx#L23) | Communications | | seed |
| **Announcement** | `id, scope(platform/centre/class), centreId, classId, authorId/Name/Role, audience{centreIds,roles,classIds}, title, body, priority, pinned, requiresAck, createdAt, expiresAt, reads{}, acks{}` | `COMMS_ANNOUNCEMENTS` [:61](mocks/communications.mock.jsx#L61) | Communications | comms store | `tutoros.comms.v2` |
| **Thread / Message** | `COMMS_THREADS` / `COMMS_MESSAGES` (id, participants, scope, body, flags) | [:136/:203](mocks/communications.mock.jsx#L136) | Communications | comms store | `tutoros.comms.v2` |
| **Flag / Concern (safeguarding)** | `COMMS_FLAGS`/`COMMS_CONCERNS` (status, by, at) | [:400/:406](mocks/communications.mock.jsx#L400) | SafeguardingPage | comms store | `tutoros.comms.v2` |
| **Report** | rules/templates/students/ratings — `REPORTS_CONFIG`, `REPORTS_TEMPLATES`, `REPORTS_STUDENTS`, `REPORTS_SEED` | [reports.mock](mocks/reports.mock.jsx) | Reports | reports store | `reports_store_v2` |
| **Report rule** | `id, targetType(TAG/CLASS/STUDENT), tag/classId/studentId, requirement(REQUIRED/OPTIONAL/OFF), frequency(WEEKLY/FORTNIGHTLY/MONTHLY/TERMLY), templateId, priority` | `REPORTS_CONFIG.reportRules` [:24](mocks/reports.mock.jsx#L24) | Reports policy resolution | reports store | `reports_store_v2` |
| **SA account** | `id, name, owner, ownerEmail, planId, status, country, createdAt, churnRisk, trialEndsAt, promoCode?, centres[]{id,name,city,country,students,teachers,usage}` | `SA_ACCOUNTS` [superAdmin.mock:37](mocks/superAdmin.mock.jsx#L37) | SuperAdmin | | seed |
| **SA analytics** | `SA_ROLE_COUNTS`, `SA_USER_GROWTH`, `SA_MRR_MOVEMENT`, `SA_ACTIVITY`, `SA_FEATURE_USAGE`, `SA_TXNS`, `SA_AUDIT`, `SA_DSAR`, `SA_SUSPICIOUS`, `SA_FLAGS`, `BRAND` | [:18-215](mocks/superAdmin.mock.jsx) | SuperAdmin | | seed |
| **Homework assignment/submission** | assignment: `id, teacherId, classLabel, studentIds[], questions[], submissions{sid:{status,answers,marks,feedback,results,markedAt,classAvg,rank…}}, status, folderId, due` | `seedStore` [Homework.jsx:165](Homework.jsx#L165) + `HW_CLASSES`/`HW_STUDENTS`/`HW_PDF_BANKS` [homework.mock](mocks/homework.mock.jsx) | Homework | homework store | `homework_store_v6` |
| **Lesson plan** | `LESSON_PLAN_SEED` (+ `window.__lessonPlans`) | [lessonPlanner.mock:14](mocks/lessonPlanner.mock.jsx#L14) | LessonPlannerPage | in-memory `window.__lessonPlans` | (in-memory) |
| **Tracker** | `id, name, description, classGroup, columns[]{id,name,type(score/check/text),max?}, entries{studentName:{colId:val}}` | `DEFAULT_TRACKERS` [teacherPages.mock:79](mocks/teacherPages.mock.jsx#L79) | Tracking | tracking store | `tutoros.tracking.v1` |
| **Teacher-view mock rollups** | `teacherClasses`, `homeworkFull`, `teacherAllClasses` (hardcoded counts w/ `studentList[]`) | [teacherPages.mock](mocks/teacherPages.mock.jsx) | TeacherPages, teacherMetrics(`homeworkFull`) | | seed |
| **Teacher dashboard mocks** | `todaySchedule`, `homeworkItems`, `studentProgress`(scores/predicted/trend), `attendanceClass` | [teacherDashboard.mock](mocks/teacherDashboard.mock.jsx) | TeacherDashboard, teacherMetrics(`studentProgress`) | | seed |
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
- **Homework "to mark" has 3 sources:** `teacherMetrics.getToMark` reads `window.homeworkFull` mock; `Homework.getHomeworkBadges` ([Homework.jsx:5324](Homework.jsx#L5324)) counts submissions in `homework_store_v6`; `studentData.homeworkSummary`/`resultsSummary` read the `studentHomework` mock. Three different homework truths.
- **Per-teacher/class counts baked into mocks:** `SEED_TEACHERS[].classes/students/hwToMark`, `teacherClasses[].students/avgScore/attendance`, `homeworkFull[].submitted/total/marked` are hardcoded and **not** derived from the roster — they can drift from `teacherMetrics`.
- **Student counts in SuperAdmin:** `SA_ACCOUNTS[].centres[].students/teachers/usage` and `SA_ROLE_COUNTS` are hardcoded platform figures unrelated to the `bm` roster.
- **Financials computed twice:** `SEED_INVOICES` (real ledger, `invAggregate`) vs `REPORTS_INVOICES` ([reports.mock:75](mocks/reports.mock.jsx#L75)) — a separate hardcoded financial list used by the admin financial report; amounts/plan names don't match the invoice ledger.
- **AdminDashboard** revenue/at-risk sidebar mixes derived (`centreMetrics.getAtRiskStudents`) with mock (`revenueData`, `recentActivity`, `atRiskStudents`).

### Grades / taxonomy — formats in use
| Format | Where |
|---|---|
| GCSE **9–1** (+U) | `klasioGrades.GRADE_SCALES.GCSE` — canonical |
| A-Level **A\*–E** (+U) | `klasioGrades.GRADE_SCALES['A-Level']`; student predicted grades |
| KS3 **descriptors** (Mastered→Below) | `klasioGrades.GRADE_SCALES.KS3` |
| Raw **%** scores | student `scores[]`, roster `score`, homework marks — banded to grades only via `pctToGrade` (indicative) |
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
- AdminDashboard `todaySessions = []` and `outstandingInvoices = []` (TODO wire) ([AdminDashboard.jsx:211](AdminDashboard.jsx#L211),[:220](AdminDashboard.jsx#L220)).
- TeacherDashboard `recentSubmissions = []`, `unreadMessages = 0` (TODO) ([TeacherDashboard.jsx:267](TeacherDashboard.jsx#L267),[:211](TeacherDashboard.jsx#L211)).
- Reports "Parent notifications — Coming soon" ([Reports.jsx:2577](Reports.jsx#L2577)); `REPORTS_CONFIG.notifications.parentNotification: false // future`.
- `QRPlaceholder` (fake QR) used in Auth + Onboarding claim flows ([Onboarding.jsx:1008](Onboarding.jsx#L1008)).
- Lesson plans persist only to in-memory `window.__lessonPlans` (lost on reload) — no localStorage store.
- `studentData.homeworkSummary` carries `TODO(backend): unify with the Homework store` ([studentData.jsx:150](studentData.jsx#L150)).

### Dead / unused code
- **`allStudents`** (adminPages.mock) — legacy flat roster mirror of `SEED_STUDENTS` with different ("Ms. Clarke") teacher naming; imported by 3 files but superseded by the store roster. Candidate for removal.
- **`studentSelf`** and **`studentSessions`** (studentDashboard.mock) — **not referenced** by any page file (StudentDashboard now reads `klasioStudent`). Dead.
- **`CentreSetupPage`** (Onboarding.jsx) — explicitly "DEPRECATED / no longer routed".
- Legacy teacher-view mocks (`teacherClasses`, `homeworkFull`, `teacherAllClasses`) partly superseded by `teacherMetrics` but still consumed by some TeacherPages screens — mixed live/mock.

### Inline TODO/FIXME
See grep: [AdminDashboard.jsx:211/220](AdminDashboard.jsx#L211), [TeacherDashboard.jsx:211/267](TeacherDashboard.jsx#L211), [studentData.jsx:150](studentData.jsx#L150). (No FIXME/HACK found.)

### Inconsistencies (contradictions)
- **Store version drift vs memory notes:** live keys are `admin_store_v4`, `tutoros.subscription.v2`, `reports_store_v2`, `tutoros.comms.v2`, `tutoros.timesheets.v2`, `homework_store_v6` — several bumped past what older architecture notes assume.
- **Comms seed key mismatch:** [communications.mock:5](mocks/communications.mock.jsx#L5) references `tutoros.comms.v1` in a comment while the live store is `tutoros.comms.v2`.
- **Teacher identity double-id** (`t1` vs `t_clarke`) and **student triple-id** (see §7).
- **PLANS defined twice** (`PLANS` in onboarding.mock, `PLAN_CATALOG_SEED` in plans.mock) — comment says they "mirror" but two sources can diverge (e.g. `features[]` only on the catalogue).
- **Financials** duplicated (invoices vs `REPORTS_INVOICES`).
- **Multiple "today" anchors** across modules (§7).

---

## 9. Coverage Matrix (Role × Module)

✅ full · 🟡 partial · ⬜ none · ❓ unclear

| Module | superadmin | admin | teacher | student | parent |
|---|:--:|:--:|:--:|:--:|:--:|
| Dashboard | ✅ | 🟡 (TODO tiles) | 🟡 (TODO tiles) | ✅ | ⬜ |
| Students & Enrolment | 🟡 (platform counts) | ✅ | 🟡 (read-only) | ✅ (self) | ⬜ |
| Classes & Scheduling | ⬜ | ✅ | ✅ | 🟡 (sessions view) | ⬜ |
| Staff & Timesheets | 🟡 (SA users) | ✅ | ✅ | ⬜ | ⬜ |
| Invoicing | 🟡 (SA revenue) | ✅ | ⬜ | ⬜ | ⬜ |
| Communications | ✅ (no Messages) | ✅ (+Safeguarding) | ✅ | ✅ | ⬜ |
| Homework | ⬜ | ⬜ | ✅ | ✅ | ⬜ |
| Reports | ⬜ | ✅ (config) | ✅ (write) | ✅ (read) | ⬜ |
| Settings | ✅ | ✅ | ✅ | ✅ | ⬜ |
| Storage | 🟡 (R2 platform) | ✅ (owner) | ⬜ | ⬜ | ⬜ |
| Centres / Plans / Billing | ✅ (catalogue) | ✅ (owner only) | ⬜ | ⬜ | ⬜ |
| Onboarding / Auth | ⬜ | ✅ | 🟡 (claim) | 🟡 (claim) | 🟡 (under-13 consent) |
| Platform Controls / Security | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |

---

## Biggest gaps to plan around

1. **No unified metrics layer across tiers.** Three sanctioned selector layers (`centreMetrics` 75/50/55, `teacherMetrics` 85/60, `klasioStudent`) deliberately disagree, and *homework "to mark"*, *per-teacher counts*, *SA platform counts* and *financials* are each computed a 4th/5th independent way from hardcoded mocks. Any "single number" (student count, at-risk, revenue, homework due) can differ by screen.

2. **Identity & tenant keys are not canonical.** Same humans carry multiple ids (`t1`/`t_clarke`, `s2`/`s_oliver`/`u_oliver`), `Class.teacher` is name-keyed while timesheets/homework are id-keyed, and tenant ids fork (`bm` vs `centre-001` vs `ctr_bm_london` vs `acc_brightminds`). Cross-module joins are fragile.

3. **Parent/guardian is a phantom role.** Counted, consented (under-13), and notified "soon", but has zero implemented views — a whole persona is scaffolding only.

4. **Brand and theming are split-brained.** "Klasio" (UI) vs "tutoros" (every storage key, synthetic email, bucket) plus two default accents (`#4F46E5` code vs `#43b190` tweaks/student) and raw hexes inline — a rename or re-theme touches dozens of scattered literals.

5. **Term/context and "today" have no single source.** The header reads real term config, but teacher term silently dead-falls to a hardcoded value (broken `window.readTermIndicator` reference), and student/comms/timesheet/homework each anchor a different "today" (April vs June 2026 vs real clock). Time-relative UI won't reconcile.
