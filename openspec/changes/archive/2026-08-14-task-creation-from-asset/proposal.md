## Why

Team members working in the assets base have no way to create a task directly from a versie — they must switch to the project planning base manually. This means asset-level work tracking falls back to the limited "Volgende actie" field (just a person tag) plus Airtable comments, which are harder to find, have no due date, and generate a separate weekly email from project tasks.

## What Changes

- Rename the existing `RecordId` formula field (`fldGOW20TgoswEafD`, `RECORD_ID()`) on the **Versies** table in the assets base to `recordIdVersion`, and add it to the existing native sync to the projects base
- Add a `versie_id` helper text field to the **Taken** table in the projects base (a handshake field; left set after linking as a permanent trace of the source Versie — see design.md D2)
- Create a **new standalone (entry-level) form page** on the Taken table in the projects base — no linkable form exists today, only two embedded record-creation modals
- Add a `create_task_url` formula field on the **Versies** table in the assets base, opened by a native button element on the Versies interface page (not a table-level button field)
- Rename Taken's pre-existing `Assets` linked field (pointing at Versions, never at the Assets table) to `Versions`, to avoid confusion
- Add an Airtable automation in the projects base: when a Taken record has `versie_id` set and `Versions` empty, look up the matching Versions record (via `recordIdVersion`) and link it
- Add a scheduled retry automation that sweeps Taken records where `versie_id` is set and `Versions` is still empty, to recover from sync lag
- Widen the Taken filter in the existing weekly tasks email so tasks **without** a project are included — asset tasks are not required to have a project
- "Volgende actie" on Versies and the weekly assets-tasks email **coexist** in this phase — no migration yet

## Capabilities

### New Capabilities

- `task-from-asset`: Ability to initiate task creation from a versie in the assets base, resulting in a Taken record in the projects base linked to the correct Versions record, whether or not it is linked to a project

### Modified Capabilities

- **Weekly tasks email** (`Email update openstaande taken`, `wflMlK41ftY2t6pa1`): its Taken filter currently requires `Status (from Project)` = "In progress", which silently drops every task without a project. The filter is widened to also include tasks with an empty `Project`. No main spec exists for this capability yet, so the new inclusion rule is specified inside `task-from-asset`.

## Impact

- **Assets base** (`app0zzPtwBSKpGFRZ`): Versies field `RecordId` renamed to `recordIdVersion`; sync config updated; Versies gains `create_task_url`; a native interface button added to the **DRAFT** Versies detail interface page only (not FINAL/CANCELED — a finished Versie should not accrue new work)
- **Projects base** (`appopJMiQr8csSHhh`): Taken gains `versie_id` field; its pre-existing `Assets` linked field (never actually linked to Assets) renamed to `Versions`; new standalone Taken form page; two new automations (auto-link + scheduled retry); one **deployed** automation edited (`wflMlK41ftY2t6pa1`, runs Monday 07:15)
- **Existing behaviour preserved**: Volgende actie workflow, the asset↔project webhook chain (`wflPFvvo9vGGUBgkp` → `wfltxt8QNlwFGg0qZ`), and the weekly assets email are untouched
- **One-off side effect of the email filter change**: 4 pre-existing project-less open tasks (created May–Nov 2025) will start appearing in the weekly email. They have been invisible until now; this is a defect being fixed, not new noise.
- **Blocked tasks remain excluded** from the weekly email (Done, Canceled, Blocked), unchanged from today — so a blocked asset task will not appear in the email
