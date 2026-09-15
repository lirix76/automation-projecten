## Context

See proposal.md - Why. Relevant schema facts (from `airtable-schema-project-planning.yaml`, base `appopJMiQr8csSHhh`):

- `Projecten` (`tblNDZDbjxejZDmnQ`) and `Planning` (`tblhpZ8bLZxY1r6zY`) are linked via plain link fields (`Projecten.Planning` / `Planning.Projecten`) with no cardinality enforcement.
- `Projecten` already has three lookup-via-`Planning` fields that read from Planning: `Gepland voor (from Projecten 2026)`, `Impact-effort`, `Effort - tijd`.
- `Projecten` has a checkbox `create planning` (`fldZHqjw62t2nZ6wc`) that drives a deployed Airtable automation, `Create planning record` (`wflPlb5ExaZdZkD8z`): when the checkbox is true and `Projecten.Planning` is empty, it creates a `Planning` record linked back to the Project, then clears the checkbox. This is a partial pre-existing solution to the 1:1 problem — it explains why most Projects already have exactly one Planning record — but it's not a guarantee: nothing stops a second Planning record from being linked manually, nothing cascades on deletion, and it only fires if someone remembers to tick the box.
- Verified via `airtable-mcp list-automations`/`get-automation` (and the locally exported `scripts/airtable/workflows/projectmanagement/create-planning-record-wflPlb5ExaZdZkD8z.json`) that no other Airtable automation and no n8n workflow in this base references `Planning` or the fields being removed/moved.
- Per the repo's `CLAUDE.md`, all Airtable reads/writes for this project go through the `airtable-mcp` CLI (not the interactive `mcp__claude_ai_Airtable__*` tools), and the local schema YAML is auto-generated — never hand-edited.

## Goals / Non-Goals

**Goals:**
- Make it structurally impossible for a Project to exist without planning data or vice versa, by collapsing the two into one table.
- Preserve every existing planning field's data and the `Impact-effort` classification logic.
- Leave the sync to the Assets-base mirror table untouched.

**Non-Goals:**
- Rebuilding the Planning-based roadmap/prioritization view — tracked as a task, not designed here (it was already broken before this change).
- Adding "actuals" tracking (real effort/spend vs. estimate) — out of scope; `Effort - tijd`/`Effort - geld` keep their current meaning as planning-time estimates.
- Any change to how Taken, Assets, Allocaties, or Marketing campagne link to Projecten.

## Decisions

**1. Perform the schema edit via the `airtable-mcp` CLI, field by field, not through the Airtable UI by hand.**
This matches the repo's established tooling convention and leaves an auditable command trail. Alternative (manual UI edits) was rejected because it leaves no record of what was done and is more error-prone across ~20 fields.

**2. Recreate Planning's formula fields on `Projecten` rather than trying to move them.**
Airtable formula fields reference other fields by ID, and those IDs are table-scoped — a formula can't be relinked into a different table. `Impactscore`, `Effortscore`, and the renamed `Impact-effort` formula must be rebuilt on `Projecten`, referencing the new native `Impact - voor de klant` / `Impact - voor Picoo` / `Effort - tijd` / `Effort - geld` fields once those exist there. Rejected alternative: converting them to static/manual fields on migration — rejected because it silently freezes values that should stay live as inputs change.

**3. Order of operations: additive first, destructive last.**
1. Create the new native fields (plain + formula) on `Projecten`.
2. Backfill: for every Project with a linked Planning record, copy that Planning record's values onto the new native fields.
3. Verify: row counts match (one Planning record consumed per Project) and a spot-check of values.
4. Delete the `Create planning record` automation, then the three lookup-via-`Planning` fields, the `Projecten.Planning` link field, and the `create planning` checkbox.
5. Delete the `Planning` table.
Rejected alternative: deleting Planning first and reconstructing from a backup — rejected because it turns a reversible step into an irreversible one for no benefit.

**4. Rename `Prioriteit` → `Impact-effort` at field-creation time, not after.**
Creating the new formula field directly under the `Impact-effort` name (matching the existing lookup name already familiar to users on `Projecten`) avoids ever having two fields named `Prioriteit` on the same table, even transiently.

**5. Delete the `Create planning record` automation before deleting the fields it depends on.**
The automation's trigger reads the `create planning` checkbox and the `Projecten.Planning` link field, and its action writes into the `Planning` table — deleting any of those out from under a still-deployed automation leaves it dangling or invalid. Deleting the automation first removes that dependency cleanly; there's no reason to keep it deployed once its target table is gone.

## Migration Plan

Steps as listed in Decision 3. Before step 5 (deleting `Planning`), export the `Planning` table to CSV as a backup — deletion via the Airtable API is not recoverable from within the API itself. Before step 4, manually check the Airtable UI for any interface, view, or automation elsewhere in this base (or in other bases, per the Assets-base sync precedent) that references the `Planning` table or the fields being removed, since that can't be reliably grepped from this repo alone.

No rollback beyond restoring from the CSV backup / Airtable's built-in revision history is planned — this is a low-traffic internal table, not a production data path.

## Risks / Trade-offs

- [Risk] Bulk-copying Planning values onto Projecten by hand, per record, is tedious and error-prone for however many project records exist → Mitigation: use `airtable-mcp` `list-records-for-table` / `update-records-for-table` to script the backfill instead of copying values manually in the UI.
- [Risk] Deleting fields/tables via the API is irreversible → Mitigation: CSV export of `Planning` before deletion (Migration Plan), and doing all deletions only after the additive+backfill+verify steps are confirmed complete.
- [Risk] Unaudited external references (an interface, a view, or an automation elsewhere) to the `Planning` table or its fields could break silently once deleted → Mitigation: manual check in the Airtable UI called out in the Migration Plan; nothing in this repo's `scripts/`/`docs/` currently references it (checked during exploration), but that doesn't cover interfaces/views.

## Open Questions

- Does removing the `create planning` checkbox field ID (`fldZHqjw62t2nZ6wc`) break any reference to it outside this repo (e.g., an interface button, a saved view filter)? Deferred to the manual UI check in the Migration Plan — doesn't change the approach either way, just whether an extra cleanup step is needed.
