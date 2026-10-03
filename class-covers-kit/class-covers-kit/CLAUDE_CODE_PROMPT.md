# Class covers — Claude Code prompt

Add teacher-selectable backgrounds ("covers") to class cards and class banners, with an optional subject icon. A tested kit is provided in `class-covers-kit/` at the repo root. Your job is to integrate it into Klasio, not to redesign it.

---

## Step 0 — Inventory (silent, mandatory)

Before writing anything, map the repo and hold these answers. Do not print the inventory; use it.

1. **Shared package**: the npm name of `packages/shared` and how `apps/web` and `apps/api` import from it (root import, subpath exports, TS path alias). Whether `packages/shared` needs a `package.json` `exports` entry for a new subpath.
2. **Tests**: Vitest config for `packages/shared` and `apps/web` (environment, jsdom vs happy-dom, CSS Modules handling, globals on/off). pgTAP location and conventions.
3. **Class storage**: the table that holds classes (classes may be rows of a unified groups table with a `kind`), its tenant column, the subject field (or subject table and join), and how teachers are assigned to a class.
4. **Migrations**: `supabase/migrations/` naming convention.
5. **API**: Fastify route naming, auth/role helpers, how "teacher assigned to class" is checked elsewhere, validation library, error response shape, how existing class mutations reach the database (service role vs user-scoped client), and whether there is an audit log for class changes.
6. **Read path**: where class rows are mapped into the view model the web app consumes (the canonical selector/mapper layer).
7. **Web**: the component(s) that render the **class card** (look for "Latest result", "PREDICTED", "assessments") and the **class banner** (look for "Room", subject/level/teacher chips), and the code that currently paints their gradient backgrounds and decorative shapes. Also: the class settings/edit surface, the class create form, the data-fetching/mutation pattern (e.g. TanStack Query), design token names (text, border, focus, primary, radius, font), any theme (dark mode) mechanism, and any dev-only route convention.
8. **Branching**: the current phase number from the Development Plan.

---

## Kit contents (`class-covers-kit/`)

| Path in kit | Destination | What it is |
|---|---|---|
| `packages/shared/src/class-covers/*` | `packages/shared/src/class-covers/` | Pure TS, no React: types, 8 palettes, 6 patterns, 48 preset ids, subject → family mapping, derived defaults, `resolveCover`, `validateCoverSelection`, icon registry (127 icons + 16 glyphs), contrast helpers, unit tests (59). |
| `…/icons.generated.ts` | same folder | Generated icon path data (Phosphor duotone, MIT, licence header included). **Never edit by hand.** |
| `apps/web/src/components/class-cover/*` | `apps/web/src/components/class-cover/` (or the repo's equivalent components folder) | `CoverArt` (background layer), `coverStyleVars` (text colour CSS variables), `ClassCover` (wrapper for new surfaces), `CoverPicker`, `CoverGallery`, CSS Modules, component tests (9). |
| `scripts/class-covers/*` | `scripts/class-covers/` | Icon manifest (source of truth for the icon library) and the dev-time generator. |
| `supabase/migrations/TEMPLATE_class_covers.sql` | new migration, renamed | Adds two nullable columns plus format CHECKs. |

The kit imports shared code as `@klasio/shared/class-covers`. Replace that specifier with the real one from Step 0.1.

---

## Decisions (final — do not reopen)

| # | Decision | Rejected |
|---|---|---|
| D1 | Store only the teacher's explicit choice: `cover_preset_id text null`, `cover_icon_id text null` on the existing class table. `NULL` = derive from subject at read time; `cover_icon_id = 'none'` = teacher chose no icon. No backfill. | Backfilling defaults (violates derive-don't-store); a new `class_covers` table (no need for a second row per class). |
| D2 | Pure data lives in `packages/shared` so the API validates against the same registry the web renders. React lives in `apps/web`. | Duplicating id lists in the API. |
| D3 | Icons are vendored SVG path data from Phosphor (duotone, MIT) in a generated file. The generator installs Phosphor with `--no-save` only when regenerating. **Zero new runtime dependencies.** | `@phosphor-icons/react` (new dependency); Tabler (only ~1/5 of icons have filled versions); teacher image uploads (moderation, storage, safeguarding — out of scope). |
| D4 | The 8 cover palettes are content colours defined in `palettes.ts`, a recorded exception to "brand tokens only". Every ink/background pair is AA-tested (≥ 4.5:1). | Deriving covers from brand tokens (too few hues to cover subject families at AA). |
| D5 | Artwork is inline SVG pinned to the right edge (`xMaxYMid slice`). Text stays on the left. No raster assets, no CDN. | PNG/WebP assets in R2. |
| D6 | Permissions: Account Owner/Centre Admin can change any class cover in their centre. A Teacher can change covers only for classes they are assigned to. Students read-only. No superadmin UI. | Admin-only (the product owner wants teachers to choose freely). |
| D7 | Write path: a dedicated endpoint (e.g. `PUT /classes/:classId/cover`, following existing naming) with body `{ "cover": { "presetId": string, "iconId": string \| null } \| null }`. Validate with `validateCoverSelection`, convert with `toStoredCover`, write both columns. `null` resets to the subject default. | Extending the general class update endpoint (would widen teacher write access to other fields). |
| D8 | Read path: the canonical class mapper resolves the cover once with `resolveCover({ presetId, iconId }, { subjectName, seed: class.id })` and exposes `cover: ResolvedCover` on the class view model. Components never read the raw columns. | Resolving inside each component. |
| D9 | UI entry point: a "Change background" action in the class settings/edit surface (admins and assigned teachers) opening `CoverPicker` in the repo's existing dialog/sheet pattern, with Save and Cancel. The class create form gets no picker; new classes use the derived default. | A picker on the create form (adds friction for admins; the default is good). |
| D10 | `CoverGallery` is mounted on a dev-only route (existing convention, else `import.meta.env.DEV`-guarded), excluded from production. It is a curation tool, not a product page. | Shipping it. |
| D11 | If the web app already has a theme mechanism, pass its value as `theme` to `CoverArt`/`coverStyleVars`. Otherwise use light and add nothing. | Building a theme system. |
| D12 | Text on covers uses `var(--cover-ink)`, `var(--cover-ink-muted)`, chips use `var(--cover-chip-bg)` / `var(--cover-chip-ink)`. Title blocks are constrained so text never runs under the artwork: card ≤ 56% width, banner ≤ 60%. | Keeping hard-coded per-subject text colours. |
| D13 | 11+ / SATs / entrance / reasoning classes map to the exam-prep family, even when the name says Maths. | Maths family for "11+ Maths". |
| D14 | Subject for derivation = the class's subject name; if a class has no subject, use the class name. | — |
| D15 | Cover changes go through the existing audit log if one exists for class changes; otherwise add none. No analytics events. | New audit infrastructure; PostHog events. |

---

## Scope

**In:** shared module and tests; migration; cover endpoint and permission tests; mapper change; `CoverArt` integrated into the existing class card and class banner; "Change background" picker in class settings; dev gallery route; replacing CSS fallback values with Klasio tokens.

**Out:** image uploads; per-centre custom palettes or icons; animations; the marketing site; student-facing layout changes other than the background; any new runtime dependency; changes to palette colours or the icon list (other than via the manifest and generator, and only if the product owner asks).

---

## Hard constraints

- Extend, don't rebuild. The existing card and banner components keep their markup and layout. Replace only their background layer with `<CoverArt>` as the first child of the existing positioned container, and remove the old gradient/decorative-shape code. No forked or duplicate components.
- No new runtime dependencies. No Tailwind: CSS Modules only. No inline styles except the kit's data-driven values (`coverStyleVars`, swatch gradients, SVG attributes).
- No object-rest destructuring.
- Never hand-edit `icons.generated.ts`. To change icons: edit `scripts/class-covers/cover-icons.manifest.json`, run `npm i --no-save @phosphor-icons/core && node scripts/class-covers/generate-cover-icons.mjs`, then run the tests.
- Product copy is plain British English and sentence case: "Background", "Change background", "Colour", "Pattern", "Icon", "None", "Use subject default". Never show internal words ("preset", "family", "derived", ids) in product UI. The dev gallery is exempt.
- Decorative artwork stays `aria-hidden`. The picker stays keyboard-operable (native radio groups — keep them).
- Tenant isolation: the endpoint must never read or write a class outside the caller's tenant, whatever id is supplied.

---

## Tasks

1. Create branch `feat/p<N>-class-covers` (N from Step 0.8).
2. Copy `class-covers-kit/packages/shared/src/class-covers/` into `packages/shared/src/class-covers/`. Expose it using the package's existing export pattern (Step 0.1). Adapt the test file only if the runner requires it (e.g. imports, environment).
3. Copy `class-covers-kit/scripts/class-covers/` to `scripts/class-covers/`.
4. Copy the web kit into the components folder (Step 0.7), replace the `@klasio/shared/class-covers` specifier, and match the test environment docblock to the repo (jsdom vs happy-dom).
5. Token pass: in the three `.module.css` files, replace every `var(--x, fallback)` with the matching Klasio token. Keep the fallbacks only where no token exists.
6. Migration: create it from `TEMPLATE_class_covers.sql` with the real table name and the repo's naming convention. Apply locally.
7. If existing class mutations use user-scoped clients under RLS and teachers cannot currently update the class row: add a narrowly scoped `security definer` function that updates only the two cover columns after checking tenant and assignment, and add pgTAP tests (same-tenant assigned teacher allowed; unassigned teacher denied; other-tenant user denied). If mutations go through the service role with API-side authorisation, change no RLS and add no pgTAP tests.
8. Mapper: add `cover: ResolvedCover` to the class view model (D8, D14). Select the two new columns wherever the mapper's query is built.
9. API: add the cover endpoint (D6, D7). Use the existing auth helpers and error shape. Tests: admin same tenant → success; assigned teacher → success; unassigned teacher → forbidden; student → forbidden; admin from another tenant → not found/forbidden per convention; unknown presetId/iconId, extra fields, or non-object body → validation error; `null` → both columns null; `{ iconId: null }` → `cover_icon_id = 'none'`.
10. Class card: add `<CoverArt cover={cls.cover} variant="card" theme={…} />` as the first child of the card's positioned container. Set `style={coverStyleVars(cls.cover, "card", theme)}` on the container. Switch title, subtitle and result text to the `--cover-*` variables. Apply the D12 width limits. Remove the old background code.
11. Class banner: the same with `variant="banner"`, including the subject/level/teacher chips (`--cover-chip-bg`, `--cover-chip-ink`).
12. Class settings: add "Change background" (visible to admins and assigned teachers only) that opens `CoverPicker` with `value = selectionFromResolved(cls.cover)`, `subjectName`, `previewTitle` = class name, `previewSubtitle` = the banner's secondary line, and `onReset`. Save calls the endpoint through the existing mutation pattern, then invalidates or refreshes the class data. "Use subject default" sends `cover: null`.
13. Dev gallery: mount `CoverGallery` on a dev-only route (D10).
14. Run typecheck, lint, all unit/component tests, pgTAP if touched, and a production build of `apps/web`. Confirm the gallery is absent from the production bundle.

---

## Acceptance criteria (report each as PASS or FAIL with evidence)

1. `packages/shared` class-cover tests pass, including all palette AA contrast checks, and the web component tests pass.
2. No new entries in any `dependencies`. `@phosphor-icons/core` appears nowhere in `package.json`/lockfiles.
3. The migration adds exactly `cover_preset_id` and `cover_icon_id` (nullable text, format CHECKs) and applies cleanly on a fresh local database.
4. A class with both columns `NULL` renders a derived cover matching its subject (e.g. Physics → science palette with atom; Further Maths → maths palette with Σ), and the same class renders identically on every load.
5. The endpoint permission matrix in Task 9 passes, including cross-tenant denial.
6. Invalid bodies are rejected with the repo's standard validation error and nothing is written.
7. Existing class card and class banner components are extended in place: no new card/banner components, no leftover old gradient code, and layouts are unchanged apart from the background and text colour.
8. Card and banner text use the `--cover-*` variables. Titles never overlap the artwork at the card's smallest supported width and at a 360 px-wide banner.
9. Picker: changing Colour keeps the Pattern and Icon; changing Pattern keeps the Colour; None removes the icon; search filters icons; "Suggested for …" matches the class subject; everything is operable by keyboard alone.
10. Teachers see "Change background" only on classes they are assigned to. Students never see it.
11. Unknown stored ids (e.g. an icon later removed from the manifest) fall back to the derived default without errors.
12. The dev gallery route works in development and is absent from the production build.
13. No product UI copy contains "preset", "family", "derived" or raw ids.
14. Typecheck, lint and the `apps/web` production build succeed.

---

## Output format

Reply with exactly these sections and nothing else:

1. **Summary**: two sentences.
2. **Files**: added and modified, grouped by package, one line each.
3. **Decisions deviated from**: should be "None". If not, the decision number, what you did instead, and why.
4. **Acceptance criteria**: a table with #, PASS/FAIL, and one line of evidence.
5. **For the product owner**: anything that needs a human call, e.g. a subject that maps to the wrong family, or a surface where covers look wrong.
