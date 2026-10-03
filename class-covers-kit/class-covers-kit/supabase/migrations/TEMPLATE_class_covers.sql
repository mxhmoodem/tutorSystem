-- Class covers: the teacher's chosen background for a class.
-- Both columns are nullable. NULL means "derive from the class subject at read
-- time" (packages/shared/src/class-covers → resolveCover). No backfill.
--
-- TEMPLATE: replace <class_table> with the table that holds classes (Step 0),
-- rename this file to the repo's migration naming convention, and keep the
-- column names exactly as written — the API and mappers depend on them.
--
-- Validity of the actual ids (which presets/icons exist) is enforced in the API
-- with validateCoverSelection(); the CHECKs below only guard the format so the
-- database never holds junk if something bypasses the API.

alter table public.<class_table>
  add column if not exists cover_preset_id text,
  add column if not exists cover_icon_id text;

alter table public.<class_table>
  add constraint <class_table>_cover_preset_id_format
    check (cover_preset_id is null or cover_preset_id ~ '^[a-z]+-[a-z]+$'),
  add constraint <class_table>_cover_icon_id_format
    check (
      cover_icon_id is null
      or (cover_icon_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(cover_icon_id) <= 40)
    );

comment on column public.<class_table>.cover_preset_id is
  'Class cover background as <palette>-<pattern>, e.g. sky-orbit. NULL = derived from subject.';
comment on column public.<class_table>.cover_icon_id is
  'Class cover icon id from the shared icon registry, ''none'' = explicitly no icon, NULL = derived from subject.';
