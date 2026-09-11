## Why

A Taken record can be created with more than one person in `Toewijzen aan` (e.g. submitted via the Taken form for a task that involves several people). Today that single record stays jointly assigned, so per-person views (the weekly open-tasks email, individual task lists) either show it to everyone or to no one clearly, and there is no per-person completion state — one assignee finishing their part cannot be distinguished from the whole task being done. Splitting into one record per assignee at creation time gives each person their own trackable task with independent status.

## What Changes

- New Airtable automation on the Taken table (`tblW5PkBL4mysdN7t`), trigger type `recordCreated`: when a newly created Taken record has more than one linked record in `Toewijzen aan`, keep the original record assigned to the first person and create one duplicate record per remaining assignee, each with exactly one assignee and every other writable field copied from the original.
- Generalizes to any number of assignees (N people → N single-assignee tasks), not just two.
- Duplicates are not linked back to the original (no use of `Gerelateerde taken` or any other relational field for this purpose).
- `systemMessages` is not cloned verbatim; each duplicate gets a fresh log line noting it was split from the original, and the original gets a log line noting which duplicates were split off.
- **Known limitation, accepted as out of scope for this change**: only fires at record creation. A task created with one assignee that later has a second assignee added will not be split. Per project constraints, `customScript` automation nodes cannot be created via the Airtable MCP tools — implementation will configure the trigger via MCP and hand the user the script text to paste manually into a "Run a script" action in the Airtable UI.

## Capabilities

### New Capabilities
- `task-assignee-split`: Ability for a multi-assignee Taken record, at the moment of creation, to be split into one single-assignee Taken record per person, with the original record retained for the first assignee.

### Modified Capabilities
(none — no existing spec covers Taken record creation/assignment behavior)

## Impact

- Airtable base `appopJMiQr8csSHhh`, Taken table (`tblW5PkBL4mysdN7t`): new automation (trigger + "Run a script" action), touching `Toewijzen aan` (`fld3YCjA3KSJQRvPW`) and `systemMessages` (`fld4kYetFjPFM8BcP`).
- No changes to existing automations, fields, or the Taken creation form.
- New script file added to the project's "Airtable automation scripts" folder for future reference, per the `airtable-automations` skill convention.
