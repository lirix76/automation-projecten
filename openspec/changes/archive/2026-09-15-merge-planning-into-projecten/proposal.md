## Why

`Projecten` and `Planning` are two Airtable tables held together by a plain link field with no cardinality constraint, but the actual business rule is that every Project always has exactly one Planning record and vice versa — orphans in either direction were tried before and caused confusion (three de-facto record shapes: planning-only, project-only, project-with-planning). Two tables enforcing a mandatory 1:1 relationship is complexity with no corresponding real-world state; it can only be kept in sync with ongoing reconciliation automation, which patches the symptom instead of removing the possibility of drift.

## What Changes

- **BREAKING**: All fields from `Planning` (Doorlooptijd, Impact - voor de klant, Impact - voor Picoo, Effort - tijd, Effort - geld, Impactscore, Effortscore, Gepland voor, Review) move onto the `Projecten` table as native fields.
- **BREAKING**: Planning's formula field `Prioriteit` (Quick Win / Major Project / Fill-in / Thankless Task) is renamed to `Impact-effort` when it moves to `Projecten` — reusing the name already used by the existing lookup field on `Projecten` that reads this value via the `Planning` link. `Projecten`'s own `Prioriteit` field (P1–P4, manual) is untouched and keeps its name.
- **BREAKING**: The lookup-via-`Planning` fields on `Projecten` (`Gepland voor (from Projecten 2026)`, `Impact-effort`, `Effort - tijd`) are removed and replaced by the native fields moved in from Planning.
- Existing records are migrated: each Project's linked Planning record's values are copied onto the Project's new native fields, then the Planning record is deleted.
- The `Planning` table and the `Projecten` ↔ `Planning` link field are deleted once migration is confirmed complete.
- **BREAKING**: The deployed Airtable automation `Create planning record` (`wflPlb5ExaZdZkD8z`) is deleted, along with the `create planning` checkbox field (`fldZHqjw62t2nZ6wc`) on `Projecten` that drives it — the automation creates a `Planning` record and links it back whenever the checkbox is ticked, which has no purpose once `Planning` no longer exists as a separate table.

## Capabilities

### New Capabilities
- `project-planning`: defines that a Project record carries its own planning/prioritization data (effort, impact, scoring, quarter, review) natively, with no separate Planning record required or possible.

### Modified Capabilities
(none — no existing spec covers this data model yet)

## Impact

- Airtable base `Projectmanagement` (`appopJMiQr8csSHhh`): `Projecten` table (`tblNDZDbjxejZDmnQ`) gains fields; `Planning` table (`tblhpZ8bLZxY1r6zY`) is deleted.
- Any interfaces/views/automations referencing `Planning` fields or the `Projecten.Planning` link directly must be repointed to the native fields on `Projecten`.
- The roadmap/prioritization view that was based on `Planning` (already broken before this change) needs to be rebuilt on `Projecten` — tracked as a task, not designed here.
- Out of scope: the existing sync from `Projecten` to the Assets-base mirror table is unchanged — no new fields are added to that sync.
- No code changes — this is an Airtable schema change made directly in the Airtable UI, then reflected locally by re-running the schema sync (`airtable-schema-project-planning.yaml` is auto-generated, never hand-edited).
