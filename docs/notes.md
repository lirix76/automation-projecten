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

## 2026-11-05 — Spike: native Slack-DM naar dynamische ontvanger (change notify-requester-on-task-completion)

Vraag: kan de native Airtable-actie `sendToSlack` een DM sturen naar een Slack-user-ID dat uit een record komt, in plaats van een vooraf gekozen kanaal/gebruiker?

- `fetch-automation-input-data` (`sendToSlack` / `slackConversationId`, account `eaczxgyZO4OwxTrjk`) toont gebruikers als ontvanger met precies de `U…`-ID's uit `Picoo users.Slack`.
- Test-automation `wflxV6StvAjntXA9K`: trigger op een taak met een vaste titel, `slackConversationId` = `{"template":[map(lookup Slack (from Assignee), .value)]}`, `username` "Picoo taken". Validatie ok, run `wfxyKk0Fr1Sia5wdz` succesvol, Iris ontving de DM.
- **Conclusie: werkt.** Geen script nodig voor deze change.
- CLI-valkuil: `airtable-mcp create-automation --input - < file` gaf binnen `op run` "Invalid JSON on stdin"; gepipet (`cat file | …`) of met losse flags werkt wel.
- Een automation die aan staat kan niet via de CLI worden verwijderd; eerst in de UI uitzetten.

## 2026-11-05 — Afrondmelding naar aanvrager (change notify-requester-on-task-completion)

Wie een taak voor een collega aanmaakt en zichzelf in `Aangevraagd door` zet, krijgt een Slack-DM ("Picoo taken") als die taak op Done of Canceled gaat.

**Onderdelen**
- `Taken.Slack aanvrager` (`fldSjgOwKFn6NNR0o`): lookup van `Picoo users.Slack` via `Aangevraagd door`.
- `Taken.Stuur afrondmelding` (`fldIzlneFWwjxxfXp`): formule, 1 = melding. Voorwaarden: Status is Done/Canceled, aanvrager ingevuld, aanvrager ≠ uitvoerder (vergelijking op naam), Slack-ID niet leeg.
- Automation **Afrondmelding naar aanvrager** (`wflOfkikkpeD4lRhx`): trigger `recordMatchesConditions` op formule = 1 → `sendToSlack` (account `eaczxgyZO4OwxTrjk`, ontvanger `trim(first(Slack aanvrager))`) → `updateRecord` zet een regel bovenaan `systemMessages`.
- `Aangevraagd door`: één record, filter `Status dienstverband` = `in dienst` (in de UI ingesteld).

**Getest** (2026-11-05, testtaken daarna verwijderd): Done → melding, Canceled → melding, eigen taak → niets, geen aanvrager → niets, reopen → Done → tweede melding, Done → Canceled → niets. De 52 bestaande taken die al op 1 stonden gaven bij het aanzetten geen melding.

**Bekende beperkingen**
- Done → Canceled direct geeft geen nieuwe melding (de trigger gaat alleen af als een taak opnieuw aan de voorwaarden gaat voldoen).
- Afzender is de Airtable-app in Slack (weergavenaam "Picoo taken"), niet de Picoo-bot.
- Werkt alleen als `Aangevraagd door` is ingevuld; sinds aug 2026 was dat bij ~25% van de nieuwe taken.
- `Picoo users.Slack` is een gesynchroniseerd veld: Slack-ID's corrigeren in de bronbase, niet hier (API geeft 403). Marthe's ID is op 2026-11-05 gecorrigeerd naar `U09NWDYV998`.
- `systemMessages` krijgt een afsluitende newline als het veld leeg was (cosmetisch).

**CLI-tips**: JSON-input werkt binnen `op run` alleen gepipet (`cat file.json | airtable-mcp <tool> --input -`), niet met `< file`. Een automation die aan staat moet eerst in de UI uit voordat de CLI hem kan verwijderen. Views aanmaken kan niet via de CLI.
