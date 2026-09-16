# Solo tutor demo account — inventory

A second demo **account** (not a role): Sarah Whitfield, private tutor, on Solo Free / Solo / Solo Pro. It's reached from the sidebar-footer account switcher (or Tweaks → "Solo tutor — Dashboard"). It never reads or writes the centre demo's data. Nothing is saved: a reload returns to the centre demo.

## Files added

| File | What it is |
|---|---|
| `soloCapabilities.jsx` | The capability module. It's the **only** file that knows the tier ids (`solo_free`, `solo_core`, `solo_pro`). Exports `getSoloCapabilities`, `getSoloTier`, `listSoloTiers`, `soloNextTier`, `compareSoloTiers`, `SOLO_DEFAULT_TIER`. |
| `mocks/solo.mock.jsx` | Solo fixtures (`window.SOLO_FIXTURES`). There is one roster, in join order. It also holds the lesson schedule, register gaps, absences and lates, invoices, tracking marks, reports, escalation contacts and the seasonal trend. |
| `soloData.jsx` | Demo state for this session only (tier, page, registers taken, reopen reasons, payments, concerns). `soloModel()` works out everything else: the book, sessions with register state, attendance, invoices with status, balances, earnings and "worth a look" signals. Mutations go through `soloActions`. |
| `Solo.jsx` | Registers `NAV_CONFIG.solo` (items are a getter driven by capabilities). Holds `SoloShell`, `SoloTopBar` (breadcrumb, **Demo plan** control, tutor), the ten pages plus the Solo+ feature pages, and the register / reopen / concern / payment flows. |
| `docs/SOLO-DEMO-INVENTORY.md` | This file. |

## Existing files touched

`index.html` only. All changes are additions:
- Four `<script>` tags: the solo mock with the other mocks; the capability module, data and shell after `Timesheets.jsx`.
- `App` gets `account` state (`'centre'` | `'solo'`) and a `window.__setAccount` bridge. Switching accounts never touches `view`/`page`, so the centre demo comes back as it was left.
- The account switcher gets a second entry, "Sarah Whitfield · Private tutor". It's appended to the `centres` list passed to `Sidebar`, and `onSwitchCentre` routes that id to the solo account.
- The shell swaps to `<window.SoloShell>` while the solo account is active. That shell has no role strip.
- `__navigate` resets the account to centre, because every route it handles is a centre route.
- Tweaks panel: existing entries also reset the account to centre, and only highlight while in the centre account. There's one new "Solo tutor — Dashboard" entry.

`shared.jsx` (tokens and components) is **unmodified**.

## Components reused

`Sidebar`, `NAV_CONFIG` / `navParentId`, `pageFrame`, `PageHeader`, `Card`, `StatBand`, `HoverRow`, `StatusPill`, `Table` (sort / pagination / row click), `RowActionsMenu`, `Btn`, `BackLink`, `Avatar`, `TabNav`, `Segmented`, `SlideOver`, `Modal`, `Field` / `Select` / `Textarea`, `EmptyState`, `BarChart`, `Icon`, `heroSurface` / `HERO_TXT` / `HeroSolidBtn` / `HeroGhostBtn`. Colours come only from `DS` tokens. There's no shared meter or alert component, so `Meter` and `Banner` are small compositions of DS tokens inside `Solo.jsx`.

## Capability keys and their consumers

| Key | Free / Solo / Pro | Consumed by |
|---|---|---|
| `groupLessons` | – / ✓ / ✓ | `soloData` (group lessons join the book); Students subtitle; Lessons (groups table, or the Free upsell card); Invoices "one lesson, several invoices" card; Earnings average-per-hour split; plan cards |
| `lessonPlanner` | – / ✓ / ✓ | Nav + route; dashboard hero (lesson topic + "Open lesson plan", otherwise "View student"); plan cards |
| `tracking` | – / ✓ / ✓ | Nav + route; dashboard Tracking card; student detail tab + card; plan cards |
| `homework` | – / ✓ / ✓ | Nav + route; plan cards |
| `homeworkBank` | – / – / ✓ | Homework page copy; plan cards |
| `reports` | – / ✓ / ✓ | Nav + route; student detail tab + card; plan cards |
| `reportRules` | – / – / ✓ | Dashboard "Reports due"; student Reports card (rule + due item); Reports page "Due this week"; plan cards |
| `atRiskFlags` | – / – / ✓ | Dashboard "Worth a look"; red attendance figure on Students; attendance pill tone on student detail; plan cards |
| `paymentReminders` | – / – / ✓ | Dashboard reminder banner + "reminders on"; Invoices subtitle, "Chase overdue", "Reminder queued" status, Reminders card (otherwise "Chasing payment"); plan cards |
| `vat` | – / – / ✓ | Invoices Reminders card VAT row; plan cards |
| `analyticsExports` | – / – / ✓ | Nav + routes for Progress and Exports; Attendance "Export"; Earnings "Export for my accountant"; plan cards |
| `waitingList` | – / – / ✓ | Students "Waiting list" action + subtitle; dashboard Students stat |
| `maxStudents` | 3 / 25 / 60 | Dashboard Students stat; Students subtitle + cap banner; upsell copy; Billing meter; plan cards |
| `maxInvoicesPerMonth` | 3 / ∞ / ∞ | Invoices subtitle, cap banner, "New invoice"; Billing meter; plan cards |
| `storageBytes` | 250 MB / 2 GB / 10 GB | Sidebar storage meter; Billing meter; Resources subtitle; plan cards |

Tier **metadata** from the same module: `label` / `monthly` / `yearly` feed the header, plan cards and upsell copy. `monthly > 0` controls the renewal, card and summer-pause rows. `demoStudents` (3 / 18 / 42) sets how far down the roster the book reaches. `demoStorageBytes` sets storage used.

## Not implemented as written

1. **Demo clock slot (D3).** There's no global demo-controls slot. The demo clock (`AttDevNudge`) only appears inside the teacher Attendance page. The tier control sits in the solo header instead, with the same dashed "demo" treatment.
2. **Account switcher chrome (D2 / AC7).** The switcher is `CentreSwitcher` in `shared.jsx`. Its dropdown heading ("Your centres"), the pooled "Seats · Storage" line and the "Add a centre" row are hard-coded there, so they still show when the switcher is opened from the solo account. Hiding them needs a small `shared.jsx` change, which this prompt ruled out. Its `text-transform: capitalize` also shows the label as "Private Tutor".
3. **Students `used / limit` nav badge.** `Sidebar` only renders numeric badges, so the badge shows the used count. The limit shows on the dashboard stat, the Students page and Plan & billing.
4. **Header.** The centre `TopBar` can't be reused: it carries the comms notification bell, the centre's term and the centre Settings route. `SoloTopBar` is a new composition over the same primitives.
5. **Pages beyond the ten.** Lesson planner, Homework, Exports and Resources open onto a first-step empty state. Tracking, Reports and Progress are simple lists over the solo fixtures. The centre versions read centre data, so they weren't reused.
6. **Progress and Exports** have no dedicated key. Both are gated on `analyticsExports`.
7. **Buttons that don't do anything yet:** Add student, New lesson / group, New invoice, Raise invoice, Email guardian, Chase overdue, Export, Write / Finish report, and "Set up" summer pause. Everything else works (see below).
8. **Prototype dates.** 11 Sep 2026 is a Friday and 6 Sep a Sunday. Tom's missed Thursday is therefore 10 Sep and Ethan's locked Saturday is 5 Sep. Figures are calculated, so they don't match the prototype's literal numbers.

## Working interactions

Take or amend a register: a one-to-one register has no bulk controls; a group register has "Mark all present"; there's a time-delivered field. Reopen a locked register with a mandatory reason, which then opens the register. Log a concern (dashboard, Safeguarding, student detail) and record a payment (both in-memory). The demo plan control and the plan cards switch tier. The timetable navigates by week. Student detail tabs work, as do the waiting list and the monthly/yearly toggle. Picking a centre in the switcher returns to the centre demo as it was left.
