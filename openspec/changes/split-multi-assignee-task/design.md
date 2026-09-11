## Context

Taken table: `tblW5PkBL4mysdN7t` in base `appopJMiQr8csSHhh`. Relevant fields: `Toewijzen aan` (`fld3YCjA3KSJQRvPW`, multipleRecordLinks to Picoo users) and `systemMessages` (`fld4kYetFjPFM8BcP`, multilineText). See proposal.md for motivation.

Existing automations in this base give two relevant precedents:
- No no-code trigger condition can test a linked-record field's array length (only `isEmpty`/`isNotEmpty`/`hasAnyOf` are used anywhere in this base) — any "more than one assignee" check has to happen inside a script.
- This base's "Backfill versie_id" automation was fixed on 2026-08-14 after a bug where a script checked the wrong record's link count instead of the triggering record's own — a direct precedent for getting the count check right here.

Per CLAUDE.md for this repo, `customScript` automation nodes cannot be created or updated via the Airtable MCP tools (`create_automation`/`update_automation` return `readOnlyNodeType`). This bounds what `/opsx:apply` can do end-to-end.

## Goals / Non-Goals

**Goals:**
- Split a newly created multi-assignee Taken record into one single-assignee record per person, generalized to any N.
- Keep the original record identity (its record ID) for the first assignee, so every other automation and relation already pointing at that record ID stays valid.
- Make the split self-limiting with no extra guard field.

**Non-Goals:**
- Splitting when an assignee is added to an existing task after creation (explicitly out of scope; see proposal.md's known limitation).
- Any retroactive/scheduled sweep for missed splits (accepted as low-stakes and out of scope for this change).
- Preserving any relational trace between the split records.

## Decisions

**Trigger type: `recordCreated`, not `recordMatchesConditions`.** `recordMatchesConditions` on "`Toewijzen aan` is not empty" would also fire when an existing single-assignee record is later edited to add a second assignee — which the spec explicitly excludes. `recordCreated` fires once per newly created record regardless of field values, which matches "only at creation" exactly and pushes the actual assignee-count decision into the script.

**Split logic entirely inside the "Run a script" action.** The trigger only narrows to "record created"; the script reads `Toewijzen aan`, and no-ops if length ≤ 1. This keeps the one place doing the count check obvious and auditable, consistent with the base's existing pattern of putting relational-count logic in scripts rather than trigger conditions.

**Mutate original + create N-1 duplicates, not delete-and-recreate.** The Taken table has other fields referencing specific record IDs (`Is blocked by`, `Blocking`, `Updates`, `versie_id`/Versions cross-base sync). Deleting the original and creating N fresh records would orphan any relation already pointing at the original's record ID. Keeping the original record (trimmed to the first assignee) and only creating new records for the remaining assignees preserves all existing references.

**Self-limiting recursion, no guard field.** Every record this automation creates is itself a new record and will re-fire `recordCreated`. Each created record has exactly one assignee, so the script's own `length > 1` check makes that re-fire a no-op. No additional "already split" checkbox or flag field is needed.

**Field copying via a `select-then-create` of the original record's raw field values, minus computed fields.** The script reads the original record with all writable fields, strips `Toewijzen aan` (set explicitly per duplicate) and `systemMessages` (replaced with a fresh entry), and passes the rest straight into `createRecordAsync`. Formula/lookup/rollup/autonumber/createdTime/lastModifiedTime fields are never included in the read/write field list since Airtable's API will reject writes to them (and they compute correctly for the new record on their own).

**Implementation split between MCP-managed and manual steps**, forced by the CLAUDE.md constraint that `customScript` nodes are read-only via MCP:
- Via MCP (`create_automation`): the `recordCreated` trigger on the Taken table.
- Manual, by the user: adding a "Run a script" action node in the Airtable UI and pasting the script this change produces, per the `airtable-automations` skill's script conventions (field IDs only, `systemMessages` prepend pattern, header comment with the automation's link).

## Risks / Trade-offs

- **[Risk]** A task created with one assignee that later gets a second assignee added is silently never split → **Mitigation**: none planned; explicitly accepted in the proposal as low-stakes and out of scope.
- **[Risk]** `customScript` nodes can't be attached via MCP, so the automation is not fully wired up by `/opsx:apply` alone → **Mitigation**: tasks.md will call out the manual paste-in-UI step explicitly rather than assume it's automated.
- **[Risk]** If the "first assignee" is not a meaningful choice to the team (e.g. assignee order in the link field is incidental, based on selection order in the form), whichever person happens to be first keeps the original record's history/creation date while the others get fresh-dated duplicates → **Mitigation**: none — accepted, since the proposal only requires each person to end up with their own task, not that a specific person keep the "original."
