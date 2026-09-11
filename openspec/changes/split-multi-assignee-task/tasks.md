## 1. Script

- [ ] 1.1 Write the "Run a script" JavaScript per the `airtable-automations` skill conventions (field IDs only, header comment block, `systemMessages` prepend pattern with `YYYY-MM-DD HH:mm` timestamps): read the triggering record's `Toewijzen aan` (`fld3YCjA3KSJQRvPW`); if length ≤ 1, log a no-op skip and exit.
- [ ] 1.2 In the split path, build the field payload for duplicates: select the original record with every writable field except `Toewijzen aan` and `systemMessages` (title, status, tags, description, project link, dates, type, priority, requester, versions link, updates link, is-blocked-by/blocking links, versie_id), excluding computed fields (formulas, lookups, rollups, autonumber, createdTime, lastModifiedTime) which cannot be written.
- [ ] 1.3 For each assignee after the first in `Toewijzen aan`, call `createRecordAsync` with the copied field payload plus `Toewijzen aan` set to that single person, and a fresh `systemMessages` entry noting it was split from the original record's ID.
- [ ] 1.4 Update the original record: trim `Toewijzen aan` to the first assignee only, and prepend a `systemMessages` entry listing the record ID(s) of the duplicate(s) split off.
- [ ] 1.5 Wrap the script body in try/catch per the skill's error-handling pattern, logging failures to the original record's `systemMessages`.
- [ ] 1.6 Verify by manually testing in Airtable's script editor/test panel against a sample multi-assignee record (2 assignees, then 3+) before wiring it into the automation, confirming: original ends up single-assignee, correct number of duplicates created, no `Gerelateerde taken` or other link is set between them, and `systemMessages` entries land as specified.

## 2. Automation setup

- [ ] 2.1 Create the automation's `recordCreated` trigger on the Taken table (`tblW5PkBL4mysdN7t`, base `appopJMiQr8csSHhh`) via the Airtable MCP CLI (`create_automation`), leaving it undeployed until the script step is attached.
- [ ] 2.2 Hand the user the finalized script text and the input-variable mapping (the trigger's record ID → the script's `input.config()`), since `customScript` nodes cannot be created via MCP (`readOnlyNodeType`) — the user adds the "Run a script" action manually in the Airtable UI and pastes it in.
- [ ] 2.3 Once the user confirms the script action is attached, deploy the automation (via MCP or ask the user to toggle it on in the UI) and verify it appears in `list_automations` with `deploymentStatus: "deployed"` and `configurationStatus: "valid"`.

## 3. Verification and documentation

- [ ] 3.1 Create one live test Taken record with 2 assignees and one with 3 assignees via the real Taken creation form, and verify in Airtable that the expected number of single-assignee records exist with correctly copied fields and `systemMessages` entries, then delete the test records.
- [ ] 3.2 Save the finalized script to a `.js` file in the "Airtable automation scripts" folder alongside the schema file, per the `airtable-automations` skill convention, including the `LINK:` line to the deployed automation.
