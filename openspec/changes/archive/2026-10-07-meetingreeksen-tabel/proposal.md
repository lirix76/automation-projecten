## Why

Tasks created in a recurring meeting (via the picoo-meeting-assistent skill in iris-os, or by hand) record their source meeting only as free text in `Omschrijving` (`Bron: ...`), in at least four different formats. There is no reliable way to filter or group Taken by the meeting series they came from, so preparing a meeting means hunting for its open tasks. A structured link from Taken to a meeting series makes "open tasks from this meeting series" a plain Airtable view.

## What Changes

- New table **Meetingreeksen** in the projects base (`appopJMiQr8csSHhh`), one record per recurring meeting series. Initial records: Projecten voortgangsmeeting, Sales strategie overleg, Customer service meeting, Overleg Picoo platform, Webmeeting (all series in iris-os `scripts/meetings/meeting_series.json`, including those whose action points are not normally sent to Airtable).
- New fields on **Taken** (`tblW5PkBL4mysdN7t`):
  - `Meetingreeks`: link to Meetingreeksen (the series the task originated in; at most one).
  - `Meeting datum`: date of the meeting the task originated in.
- One view on Taken, "Taken per meeting", showing open tasks (Status Todo / Blocked / In progress) that have a meeting series, grouped by series, with assignee, project, end date and meeting date. No code; this is the meeting-preparation overview. A single grouped view needs no new view when a series is added.
- `split-multi-assignee-task.js`: add both new fields to `COPY_FIELD_IDS`, so a task split per assignee keeps its meeting series and date. Per project constraints the script change is pasted into the "Run a script" action in the Airtable UI by hand.
- Re-sync the local Airtable schema YAML.
- Out of scope here: filling the fields from the meeting assistant and backfilling existing tasks. Both live in iris-os change `meetingreeks-op-taak`, which depends on this change being live first.

## Capabilities

### New Capabilities
- `task-meeting-series`: a Taken record can carry the meeting series and meeting date it originated in, and one view shows its open tasks grouped per series.

### Modified Capabilities
(none: `task-assignee-split` already requires every writable field to be copied to duplicates; adding the new fields to `COPY_FIELD_IDS` is an implementation fix to keep meeting that requirement.)

## Impact

- Airtable: new table Meetingreeksen, two new fields and one new view on Taken in base `appopJMiQr8csSHhh`.
- Code: `scripts/airtable/split-multi-assignee-task.js` (and the live "Run a script" action), `airtable-schema-*.yaml` (re-synced).
- Dependency: iris-os `meeting_series.json` will store the Airtable record ID of each Meetingreeksen record, so the two lists of series must be kept in step when a series is added.
- Ordering risk: if the meeting assistant starts writing `Meetingreeks` before the split script copies it, duplicates for the second and further assignees lose their series without any visible error. This change must be live before `meetingreeks-op-taak` is applied.
- Team: tasks entered by hand during a meeting can be linked to a series by choosing a record; nothing changes for people who leave it empty.
