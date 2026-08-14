## Context

There are two Airtable bases:
- **Assets base** (`app0zzPtwBSKpGFRZ`): contains `Assets` (`tblhRQAZ98kof2TbQ`), `Versies` (`tblBcNQEJLJInQrNg`), and related tables. Versies has a "Volgende actie" field (`fldAcDwOB00f5Btwi`, a person link) and Airtable comments as the only way to communicate what work needs to happen.
- **Projects base** (`appopJMiQr8csSHhh`): contains `Taken` (`tblW5PkBL4mysdN7t`), `Projecten` (`tblNDZDbjxejZDmnQ`), and a synced read-only copy of `Versies` called `Versions` (`tbl4jDE911lJl6j7f`). Taken already has a linked field (`fldBeKksYIUA1nXkv`) pointing at Versions, and Versions carries the reverse link `Taken` (`fldjIjST8UXOIHS5w`). **This field was originally named `Assets`, which was a misnomer — it was never linked to the Assets table, only ever to Versions. Renamed to `Versions` on 2026-08-14 to avoid confusion; the field ID and its data are unchanged.**

Airtable native sync is one-directional (assets → projects) and read-only in the destination. Cross-base record links are not supported. The synced Versions table in the projects base has **different record IDs** from the originals in the assets base. Formula fields in the source arrive in the destination as plain text of the formula's result type, not as formulas.

Two existing facts shape this design:

- **The identity field already exists.** Versies has `RecordId` (`fldGOW20TgoswEafD`, formula `RECORD_ID()`), it is simply not part of the sync. The projects base separately has its own local `recordId` formula on Versions (`fldUxEQJQp2ggQEje`) that returns the *projects-base* record ID. Neither field is referenced by any automation or script in either repository.
- **Cross-base linking already exists at asset level.** `Call webhook to link assets to projects…` (`wflPFvvo9vGGUBgkp`, assets) POSTs to `Catch webhook to link asset to project` (`wfltxt8QNlwFGg0qZ`, projects), which sets a locally-added `Projecten` link field on the synced Assets table. That chain is kept intact and untouched. It matches records on the human-readable `ID`, not on a record ID.

## Goals / Non-Goals

**Goals:**
- A user viewing a Versie in the assets base can initiate task creation with one click
- The resulting Taken record is automatically linked to the correct Versions record in the projects base
- The Taken record appears in the weekly tasks email **whether or not it has a project**
- No disruption to existing workflows (Volgende actie, webhook scripts, weekly assets email)

**Non-Goals:**
- Migrating existing Volgende actie data to Taken records (future phase)
- Showing linked tasks inline in the assets base interface (tracked as a follow-up change: "task-visibility-in-assets")
- Removing or replacing the weekly assets email (future phase)
- Pre-filling the assignee or project fields on the Taken form
- Requiring a project on asset tasks, or introducing a catch-all "assets-tasks" project — explicitly rejected, see D6
- Mapping priority across bases. Versies `Prioriteit` is Low/Medium/High; Taken `Prioriteit` is P1–P4. No mapping is defined and none is carried across.
- Changing which task statuses the weekly email includes. Done, Canceled and Blocked stay excluded, so a blocked asset task will not appear in the email.

## Decisions

### D1: Reuse the existing `RECORD_ID()` field as the cross-base identity key, renamed

**Decision**: Rename the existing Versies field `RecordId` (`fldGOW20TgoswEafD`) to `recordIdVersion` and add it to the native sync to the projects base. No new formula field is created.

**Rationale**: The field already exists and is populated for every record; only the sync configuration is missing. Renaming rather than adding avoids two fields computing the same value.

**Why rename instead of syncing it as `RecordId`**: the destination Versions table already has a *locally added* `recordId` formula (`fldUxEQJQp2ggQEje`) that evaluates to the **projects-base** record ID. Syncing the source field under its current name would put `recordId` and `RecordId` side by side in one table meaning two different things. Renaming the source to `recordIdVersion` makes the destination field name unambiguous and self-describing. The local `recordId` stays as-is; nothing references either field today.

**Alternative considered**: Match on the human-readable `ID` (present in the destination as `fldvaT2pGG2cAFeWg`), which is what the existing `wfltxt8QNlwFGg0qZ` webhook script does. Rejected: `ID` is a formula derived from two other fields, so it is mutable, whereas the Airtable record ID is immutable per record. This is a deliberate divergence from the existing convention in the base, made for stability.

---

### D2: `versie_id` handshake field on Taken

**Decision**: Add a plain text field `versie_id` to the Taken table. The task creation form pre-fills this field with the assets-base record ID via URL parameter. An automation then uses it to link the Versions record.

**Rationale**: Airtable form URL pre-fill supports text fields. It does not support pre-filling a linked record field with a record ID from a different base. The handshake field bridges this gap: the form captures the identity, the automation resolves the actual record link.

**Detour tried and reverted (2026-08-14)**: converted `versie_id` to a `multipleRecordLinks` field pointing directly at Versions, on the theory that Airtable's text→link matching — confirmed to correctly resolve an existing fixture value via `recordIdVersion` rather than the primary field, when the field type was bulk-converted — would let the form auto-link with no automation at all. Live-tested via the "Nieuwe taak" button/form: prefill does **not** resolve on a link-typed field (bulk type-conversion and form-prefill are different code paths; only the former does this fuzzy matching). Reverted to `singleLineText`. The automation in the next decision is necessary.

**`versie_id` is not cleared after a successful link (revised 2026-08-14)**: originally this field was meant to be transient — cleared by the automation once resolved, both to signal success and to prevent re-triggering. In the deployed automation, the trigger condition is `versie_id is not empty AND Versions is empty` (see D5), so a successful link (which populates `Versions`) already breaks the match and stops re-triggering on its own; clearing `versie_id` was redundant. It is left in place instead, as a permanent, human-readable trace of which Versie a given task originated from. Whether a task is still pending or already linked is now read off `Versions` (empty = pending), not off `versie_id`.

**Alternative considered**: Pre-fill the linked record field directly using the projects-base Versions record ID. Rejected because that ID is unknown from within the assets base — it cannot be derived or stored there without another automation.

**Alternative considered**: Use a webhook from the assets base to create the Taken record directly. Rejected for this phase: it adds complexity, and the form approach is zero-latency for the user and needs no API call at click time.

---

### D3: A new standalone Taken form must be created — no reusable form exists

**Decision**: Create a new **entry-level (standalone) form page** on the Taken table in the projects base and publish it. Fields: `Taak titel`, `Omschrijving`, `Assignee`, `Project` (optional), `Einddatum`, `Prioriteit`, plus `versie_id` prefilled and hidden.

**Rationale**: The projects base has **no standalone form** at all (`standaloneForms: []`). The only Taken forms are two *embedded* record-creation modals, both named "Task Form" (`pagDNLNqsevumrseV`, `pagkNw857fjki6qWy`) inside interface `pbdiDwD49eEm52pXD`. Embedded forms are opened from a button on a page and have no shareable URL, so they cannot be deep-linked with prefill parameters. Neither of them exposes `Project` or `Assets` either. Creating the form is a real work item, not a lookup.

**Resolved (task 2.3)**: field-name syntax (`prefill_versie_id`/`hide_versie_id`) is required. Field-ID syntax (`prefill_fldI42625LH8zyLh3`/`hide_fldI42625LH8zyLh3`) was tried first — reasoning: field IDs are immutable, so they're safer against a future rename of `versie_id`, same logic as D1 — but it broke the form's submit button entirely rather than gracefully failing to prefill. Reverted to field-name syntax; the trade-off is accepted, with a compensating guard: `versie_id`'s field description now warns against renaming it.

---

### D4: Formula URL field, opened by a native interface button (not a table-level button field)

**Decision**: Add a formula field `create_task_url` (`fldkXVuTWEBv0jGvW`) to the Versies table in the assets base, holding the prefilled form URL. Rather than pairing it with a table-level button field (`create_task_button`, as originally planned to mirror `request_translation_interface_url` + `request_translation_button`), a native button element ("Nieuwe taak") was added directly to the DRAFT Versies detail interface page, configured to open the URL held in `create_task_url`.

**Rationale**: Functionally equivalent for the one interface page this is used from, with one fewer field on the table. Putting the URL in a visible formula field still makes the link inspectable when it breaks (task 4.1's original goal). The trade-off against a table-level button field: the button isn't reusable from other interface pages or the table grid without adding the interface element there too — acceptable since the button is only needed on the DRAFT page (see D4 interface placement below and task 4.4).

**Form URL pattern** (form page ID from task 2.2, parameter syntax per task 2.3):
```
"https://airtable.com/appopJMiQr8csSHhh/<form-page-id>?prefill_versie_id=" & RECORD_ID() & "&hide_versie_id=true"
```

**Interface placement**: there are **two** Versies detail interface pages — `pagDrVIVp9DW6hdL4` (DRAFT) and `pagSzH2VzCExir7t8` (FINAL/CANCELED), as switched by the `Interface URL` formula (`fldjE5oH4u3cGD5Up`). **Decided**: the button is added only to the DRAFT page. A FINAL/CANCELED Versie should not accrue new work, so the button does not belong on that page.

---

### D5: Auto-link uses a Find records action, not a filtered script query

**Decision**: The automation (`Match taken-versie records`, `wflpsJp2NjbxYeSgf`) is triggered by **"When record matches conditions"** on Taken where `versie_id` is not empty **AND `Versions` is empty**. It then uses a **Find records** action on Versions with the condition `recordIdVersion = versie_id` (value bound dynamically from the trigger), and a script (`scripts/airtable/link-taken-to-versions.js`) that writes the link if there's exactly one match, or logs a warning to `systemMessages` otherwise.

**Rationale for Find records**: `selectRecordsAsync()` accepts only `fields` and `view` — there is no filter argument. A script therefore cannot do a server-side lookup; it can only scan, exactly like the existing `wfltxt8QNlwFGg0qZ` script does. The **Find records** action *does* filter server-side and supports dynamically bound values; `Wekelijkse update Assets` (`wflBkBpjwMBul92Zv`) already uses this pattern in the assets base. This keeps the lookup cheap regardless of Versions table size.

**Rationale for the trigger type**: every comparable automation in both bases uses `recordMatchesConditions` (`Taak Iris`, `Todoist taak voor Iris`, `Verwijderen volgende actie`, `Call webhook to link assets`). It is also more robust than "record created" here: it still fires if `versie_id` lands a moment after the record itself.

**Rationale for the second trigger condition (`Versions is empty`), and why `versie_id` is no longer cleared**: the original plan (D2) had the script clear `versie_id` on success purely to stop the automation from re-triggering on the now-linked record. Instead, the trigger itself checks `Versions is empty` — once the script links `Versions`, the record stops matching the trigger's conditions regardless of `versie_id`. This makes clearing `versie_id` unnecessary for correctness, and it is kept instead as a permanent record of which Versie the task came from. The same two-condition trigger is reused by the scheduled retry (task 3.4) to find still-unresolved records.

---

### D6: Asset tasks may have no project; the weekly email filter is widened via a helper field, not a nested OR

**Decision**: A task created from a versie is **not required** to have a project. The Taken filter in `Email update openstaande taken` (`wflMlK41ftY2t6pa1`) needs the equivalent of:

```
Assignee has any of <person>
AND Status is none of [Done, Canceled, Blocked]
AND ( Status (from Project) has any of ["In progress"]
      OR Project is empty )
```

**Airtable's native "Find records" condition builder does not support this** — confirmed directly in the UI: it only offers a flat AND list, with no OR and no nested groups. The OR is instead computed by a new checkbox-result formula field on Taken, `include_in_email` (`fldcjF4qPLSDyh4IN`):

```
OR(
  {fldvaTT0fp6LVYRNG} = BLANK(),
  FIND("In progress", ARRAYJOIN({fldAITAKGoRg491Rf})) > 0
)
```

The automation's filter is a flat AND: `Toewijzen aan has any of <person> AND Status is none of [Done, Canceled, Blocked] AND include_in_email = true`. Verified via the API against both the draft and deployed automation config — they match.

**Rationale**: the current filter requires `Status (from Project)` (`fldAITAKGoRg491Rf`) to be "In progress" (`selTFYB7rv0tcpMQF`), so **any task without a project is silently dropped from the email**. Since asset tasks legitimately have no project, the requirement "asset tasks appear in the existing email" is false without this change. Pushing the OR into a field keeps the automation's own condition list flat (which is all the builder allows) while still being inspectable — open `include_in_email` on any Taken record to see why it was or wasn't included.

**Alternative considered**: a catch-all `assets-tasks` project pinned to "In progress". Rejected. It requires a permanent Projecten record that is not a project, showing up in the Dashboard list, Projecten timeline, Totaal overzicht and Projecten per persoon; it forces the auto-link automation into conditional logic ("link the bucket only if Project is empty") and leaves tasks double-linked when a real project is added later; and it feeds a meaningless `projects: "assets-tasks"` value into the `Taak Iris` → n8n → Obsidian payload. Leaving Project empty needs no logic at all in either the filled or empty case.

**Blast radius**: 4 open project-less tasks exist today (created May–Nov 2025), all currently invisible in the email. Widening the filter surfaces them once.

**Note**: neither email workflow currently contains an `or` operator or an `isEmpty` condition, so nested condition groups are new territory in this base. Airtable's Find records action supports them.

## Risks / Trade-offs

**Editing a deployed automation** → `wflMlK41ftY2t6pa1` runs every Monday at 07:15 and the team relies on it. A mistake in the nested condition group either floods or silences the email. Mitigation: test with the automation's Run-test before re-deploying, and verify the record count against the current filter plus the 4 known project-less tasks.

**Sync lag on `recordIdVersion`** → The native sync runs periodically. A brand-new Versie may not exist in the destination Versions table yet when a user clicks the button. This is a normal path, not an edge case: Versies records are created by automation (`create-first-version-of-asset`, `create-new-version-based-on-existing-record`, `aanmaken-vertaling`). Mitigation: the automation handles "no match" gracefully **and** a scheduled retry automation sweeps unresolved records (D5, task 3.4). The assets base already uses exactly this record-triggered + scheduled-twin pattern (`update-base-asset-for-translated-assets` / `…-scheduled`, `wflz8jitdJblp4M13`).

**Creation-triggered automations run before the link exists** → `Taak Iris` (`wflecUGSZaSAV5QLg`) fires on Taken where Assignee includes Iris and POSTs to n8n, generating an Obsidian TaskNotes file. It runs on creation, i.e. before (or racing) the auto-link automation, so the note will carry no asset reference — and no project, if none was filled. Not data loss, but the asset context does not reach Obsidian in this phase.

**Form page ID hardcoded in the URL formula** → If the form page is deleted or moved, the button breaks silently. Mitigation: the URL lives in a visible `create_task_url` formula field, so a broken link is inspectable from the record.

**`versie_id` no longer distinguishes "pending" from "linked"** → since `versie_id` is never cleared (see D2, D5), a populated `versie_id` no longer means "this failed to link." Whether a task is still pending or already linked is read off `Versions` (empty = pending, populated = linked), not off `versie_id`. Mitigation: keep both fields visible in the Taken table; the scheduled retry (D5, task 3.4) sweeps whatever still has `versie_id` set and `Versions` empty regardless.

**User must still fill in task details manually** → The form pre-fills only `versie_id`. Trade-off accepted: this is phase 1 (coexistence), not full migration.

## Migration Plan

1. Rename `RecordId` → `recordIdVersion` on assets-base Versies and add it to the sync config → existing records populate on next sync
2. Add `versie_id` field to projects-base Taken table (no data migration needed)
3. Create and publish the standalone Taken form page in the projects base; record its page ID and verify prefill syntax
4. Add the auto-link automation, then the scheduled retry automation
5. Widen the weekly email filter and verify with a test run
6. Add `create_task_url` to assets-base Versies, and an interface button that opens it
7. Test end-to-end with one versie, including the no-project case
8. Add the button to the DRAFT Versies detail interface page only

**Rollback**: Remove the interface button from the assets interface, and revert the weekly email filter to the flat AND. All other changes are additive.

## Open Questions

*(all previously open questions are now resolved)*

- ~~Does an existing Taken creation form already exist?~~ **No.** Only two embedded modals, neither linkable. See D3.
- ~~Should `versie_id` be hidden from regular users?~~ **Hidden on the form** (`hide_versie_id=true`), **visible in the Taken table**, where it now doubles as a permanent trace of the source Versie rather than a failure indicator (see D2, D5).

## Future Work

**task-visibility-in-assets**: Show linked tasks inline in the Versies interface in the assets base (read-only). Planned approach: sync the Taken table from the projects base into the assets base; use an automation to maintain linked-record relationships between Versies and synced Taken records using `versie_id` as the key; surface this as a linked-record section in the Versies interface with a per-task button linking to the full task detail in the projects base.

**Derive the project from the versie**: the synced Versions table already carries `Projecten` (`fld54XRj5xgDvejkR`, text). The auto-link automation could resolve and set Taken's `Project` from it. Deliberately out of scope here, since D6 removes the need — but it would make asset tasks show up in project views for free.

**Carry asset context into Obsidian**: have `Taak Iris` include the linked versie, which requires it to run after the auto-link automation rather than on creation.
