# Design

## Context

See proposal.md - Why. Relevant current state:

- Taken (`tblW5PkBL4mysdN7t`) has no field for the source meeting; the meeting assistant (iris-os) writes `Bron: <link>` into `Omschrijving`.
- `split-multi-assignee-task.js` (automation `wflDCbwhn29AOZO34`, trigger `recordCreated`) copies a fixed list of field IDs (`COPY_FIELD_IDS`) to each duplicate. New fields are not copied unless added to that list. Its `normalizeForWrite` already handles linked-record arrays (`[{id}]`) and plain date strings, so no other script change is needed.
- `customScript` nodes cannot be created or updated through any Airtable MCP tool (`readOnlyNodeType`); the script must be pasted in the Airtable UI.
- No Airtable MCP tool creates views; views are made in the Airtable UI.
- This project uses the `airtable-mcp` CLI with the token from `.env.tpl` for Airtable reads and writes (see CLAUDE.md).

## Goals / Non-Goals

**Goals:**
- A stable record ID per meeting series that the iris-os meeting assistant can write into a link field.
- An overview of open tasks per series without code.

**Non-Goals:**
- Recording each individual meeting as a record (a Meetings table). The `Bron:` line in `Omschrijving` keeps pointing at the specific meeting in the document; `Meeting datum` covers sorting and filtering by date.
- A "discussed in" relation for tasks that were updated, not created, in a meeting.
- Adding the new fields to the "Taken sync view" or any cross-base sync.
- Filling the fields or backfilling existing tasks (iris-os change `meetingreeks-op-taak`).

## Decisions

**D1. Link to a Meetingreeksen table, not a single select.**
A single select on Taken would be simpler, but a new series then needs a new select option; writing an unknown option through the API fails without `typecast`, so the meeting assistant could break silently when a series is added. A linked table gives each series a stable record ID that iris-os stores in `meeting_series.json`, and the reverse link on the series record lists its tasks for free. Alternative considered: a Meetings table with one record per meeting, linked to a series (rejected: extra write per meeting run and an extra table to maintain, for information the `Bron:` link already holds).

**D2. Meetingreeksen fields: `Naam` (primary, single line text), `Document` (URL to the series' Google Doc or `.md` on Drive), `Taken` (reverse link, created automatically).**
`Document` makes the series record useful on its own when preparing a meeting. No status or owner fields: nothing reads them.

**D3. `Meetingreeks` is a link field limited to one record; `Meeting datum` is a date field without time.**
Single-link because a task originates in one meeting. Date without time matches how meetings are identified everywhere else (`YYYY-MM-DD - <titel>`). If the API cannot set the single-record option at creation, set it in the UI right after (task 1.3).

**D4. One grouped view instead of one view per series.**
"Taken per meeting": filter `Meetingreeks` is not empty and Status is Todo / Blocked / In progress; group by `Meetingreeks`; sort by `Meeting datum` ascending so the oldest open items come first. A new series shows up as a new group without touching the view. Iris collapses the groups she does not need. Alternative: a view per series (rejected: one more view to create per new series, and easy to forget).

**D5. Split script: add the two field IDs to `COPY_FIELD_IDS`.**
Both values are inherent to the task, not history of the original record, so they belong in the copied set (unlike `Afgerond op` or `Gerelateerde taken`). The repo file is updated and the same text is pasted into the live "Run a script" action.

## Risks / Trade-offs

- [Split script not updated before iris-os starts filling the fields] → duplicates silently lack the series. Mitigation: the split update is part of this change and verified with a live test (task 3.2); iris-os change `meetingreeks-op-taak` lists this change as a prerequisite.
- [Series list kept in two places: Meetingreeksen and iris-os `meeting_series.json`] → a series added in one place only is not linked. Accepted; the iris-os change documents adding a series in both places.
- [Renaming a series record] → harmless for links (record ID unchanged), but the iris-os series name and the Airtable name drift apart. Accepted; names are display only.
- [Interfaces or forms that show all Taken fields] → new fields may appear in existing interface layouts. Low impact; check the Taken interface once after creating the fields (task 1.4).

## Migration Plan

1. Create the table, records and fields (additive, no existing data touched).
2. Update and paste the split script; test with a two-assignee task.
3. Create the view.
4. Re-sync the schema YAML and commit.
5. Then iris-os `meetingreeks-op-taak` can be applied (fills fields, backfills).

Rollback: delete the view and the two fields on Taken, delete the Meetingreeksen table, and revert the split script to the previous `COPY_FIELD_IDS` (repo history). Remove the two field IDs from the script before deleting the fields, otherwise the script fails on reading a missing field.
