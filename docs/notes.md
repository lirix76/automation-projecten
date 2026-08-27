# Notes

## 2026-08-27 — Project plan linking: webhook race condition fixed

### Symptom
Creating a project plan logged `No field matching "fldCajroxijsQ2w2y" found in table "Projecten"` to the Projecten record's Script Log, and the "Open projectplan" button stayed empty — even though the project plan's Google Doc was actually created successfully.

### Two separate bugs

**1. Dead field reference in "Create Slack channel for new projects" (`wflV3YXw9FJdfH1bk`, this base).**
The customScript hardcoded a field ID (`fldCajroxijsQ2w2y`) for a "Slack ID (from Medewerkers)" lookup that no longer exists — deleted when `Medewerkers` was deprecated in favor of `Teamleden`/Allocaties. This automation fires whenever a new project also has `create-slack-channel` checked, which is why it looked related to project-plan creation even though it's unrelated (both write to the same shared `Script Log` field).
Fix: removed the dead reference (Slack invites now come from `Verantwoordelijk` + `Teamleden` only). Also added: on any script error, it now resets its own trigger checkbox so a failed run doesn't leave the record stuck permanently.

**2. Webhook race condition linking the project-plan Asset back to its Projecten record.**
Old flow: Assets base creates the Asset + Google Doc (works fine) → an Assets-side automation POSTs the new asset's ID to a Projectmanagement webhook → the Projectmanagement script searches its own locally-synced mirror of the Assets table for a matching ID string, and links it. Problem: the webhook fires immediately, but Airtable's native cross-base table sync can lag several minutes (observed: ~6 min). The search finds nothing, logs a silent warning, and never retries — so the doc exists but nothing points to it (`Projectdoc (Assets)`, `Projectdoc_old`, and the `Open projectplan` button all stay empty).

### Fix: no-code record-ID passthrough (mirrors the existing Taken↔Versies sync pattern)

Instead of searching for a match after the fact, the real Projectmanagement record ID now rides along as plain text inside the existing cross-base syncs, so no search/matching step is needed:

1. `Projecten.RecordID` (formula `RECORD_ID()`, field `fldRPxDHOEUSMXq4b`, already existed) added as a visible column to the **"Sync view for Assets"** view → now syncs into the Assets base's local Projecten mirror (`tblyG1uWPJ7R6PYKc`) as `fldWsPidWjCIXyZIw`.
2. New lookup field on the real Assets base's Assets table (`tblhRQAZ98kof2TbQ`): **`Projecten RecordID`** (`fldmlUysC3LCwNH82`), pulling that RecordID text through the existing native `Projecten` link (`fldoovxHB56BueBSV`). Auto-populates on asset creation — no automation needed, rides the same-base bidirectional link.
3. `Projecten RecordID` added as a visible column to the Assets base's **"Sync view Project planning"** view → now syncs into Projectmanagement's local Assets mirror (`tblWVfKlDuYYWRoib`) as `fldWRSx27w3OUZr3X`.
4. New automation **"Link asset to project (via RecordID passthrough)"** (`wflclD40AUuufEoT1`): when `fldWRSx27w3OUZr3X` is set and the local `Projecten` link (`fldeSoWPZdgYYxOXU`) is empty, writes the record ID straight into the link field. No `findRecords`, no script — a linked-record field can be written directly from a raw record-ID string wrapped in `{"template":[...]}`.
5. New automation **"Scheduled retry for link asset to project"** (`wflAoG0MAKLiHvx5K`): daily sweep at 00:25 Europe/Amsterdam for anything the instant automation missed — same shape as the existing `Match taken-versie records` / `Scheduled retry for match taken-versie records` pair.

Old webhook automations deactivated (not deleted, for rollback):
- Assets base: `Call webhook to link assets to projects in projects base copy` (`wflPFvvo9vGGUBgkp`)
- This base: `Catch webhook to link asset to project` (`wfltxt8QNlwFGg0qZ`)

### One-off manual fix
Project "P139 - Potjes omkiepen campagne 2026" (`recuBeiJAw1lboRSj`) was manually linked to its Asset mirror record (`recJzMLZ0nEn0o8UU`) to unblock it immediately. Its project plan doc: https://docs.google.com/document/d/1TEkTk9TklVd7EkI86ubn_3iNXyAOtxasOq2JKbtZOFc/edit

## 2026-08-27 — Create Slack channel automation: corrupted paste + stuck records

### Symptom
Pressing "create slack channel" in the Projecten interface did nothing — no channel, no error visible in the interface.

### Cause
The dead-field fix documented above (removing `fldCajroxijsQ2w2y`, adding checkbox self-reset on error) was written to the local script file but the paste into the Airtable script editor (`wflV3YXw9FJdfH1bk`, node `wacZ74Q1y05m2lqEC`) landed corrupted — large chunks of text missing mid-statement throughout (e.g. `POST_MESSAGE_ENDPOINT` collapsed to `'https://sage'`), which broke the script before it could even run. `customScript` nodes can't be written via the Airtable MCP tools, so this can only be caught by fetching the live automation and comparing it to the local file, not by editing it programmatically.

This left two Projecten records stuck with `create-slack-channel` (`fldLB4mBrLyfR6Drk`) checked `true` and no channel ID, which the `recordMatchesConditions` trigger won't refire on its own:
- `P139 - Potjes omkiepen campagne 2026` (`recuBeiJAw1lboRSj`) — stuck from the earlier dead-field error (09:16 log entry).
- `P140 - test` (`recJWuhwvs2au9K9o`) — stuck from the corrupted-script period, no error logged since the script failed before reaching its own try/catch.

### Fix
Re-pasted the full (intact, local-file) script into the automation, then unchecked and rechecked `create-slack-channel` on both stuck records to retrigger. Confirmed working.
