## Why

Team members working in the assets base have no way to create a task directly from a versie — they must switch to the project planning base manually. This means asset-level work tracking falls back to the limited "Volgende actie" field (just a person tag) plus Airtable comments, which are harder to find, have no due date, and generate a separate weekly email from project tasks.

## What Changes

- Add a `recordIdVersion` formula field (`RECORD_ID()`) to the **Versies** table in the assets base, and include it in the existing native sync to the projects base
- Add a `versie_id` helper text field to the **Taken** table in the projects base (transient handshake field, cleared after linking)
- Add a "Maak taak aan" button field on the **Versies** interface in the assets base, linking to the Taken creation form with `versie_id` pre-filled
- Add an Airtable automation in the projects base: when a new Taken record has `versie_id` set, look up the matching Versions record (via `recordIdVersion`) and link it, then clear `versie_id`
- "Volgende actie" on Versies and the weekly assets-tasks email **coexist** in this phase — no migration yet

## Capabilities

### New Capabilities

- `task-from-asset`: Ability to initiate task creation from a versie in the assets base, resulting in a fully-linked Taken record in the projects base (linked to both the correct project and the correct Versions record)

### Modified Capabilities

*(none — existing task and asset systems are unchanged in this phase)*

## Impact

- **Assets base**: Versies table gains `recordIdVersion` field; sync config updated; Versies interface gains a button
- **Projects base**: Taken table gains transient `versie_id` field; new Airtable automation added
- **No breaking changes**: existing Volgende actie workflow, webhook scripts, and weekly emails are untouched
- **Weekly email**: not changed in this phase; task-from-asset tasks will already appear in the existing tasks email since they are Taken records
