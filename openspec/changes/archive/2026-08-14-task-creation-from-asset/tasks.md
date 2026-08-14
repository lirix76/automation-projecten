## 1. Assets base — Versies identity field

- [x] 1.1 Rename the existing formula field `RecordId` (`fldGOW20TgoswEafD`, formula `RECORD_ID()`) on the Versies table (`tblBcNQEJLJInQrNg`, base `app0zzPtwBSKpGFRZ`) to `recordIdVersion`. Do **not** create a new field — this one already exists and is populated.
- [x] 1.2 Update the native Airtable sync configuration (assets base → projects base) to include `recordIdVersion`
- [x] 1.3 Verify that after the next sync, the Versions table in the projects base (`tbl4jDE911lJl6j7f`, base `appopJMiQr8csSHhh`) shows `recordIdVersion` populated on existing records, as a read-only text field
- [x] 1.4 Verify on one Versions record that `recordIdVersion` (assets record ID) differs from the pre-existing local `recordId` field (`fldUxEQJQp2ggQEje`, projects record ID). Leave `recordId` in place.
  - **Verified**: synced field is `fld8vXT2sNGqYtRDo` (type `multilineText`) on Versions. Holds assets-base IDs (e.g. `recI8eQivnLmUeqXn`), distinct from `fldUxEQJQp2ggQEje`. Populated across all 1395 records. Note: not yet reflected in `airtable-schema-projectmanagement.yaml` — re-run `/sync-airtable-schemas-locally`.

## 2. Projects base — Taken field and form

- [x] 2.1 Add a plain text field `versie_id` to the Taken table (`tblW5PkBL4mysdN7t`). Keep it visible in the table so unresolved links are detectable.
  - **Verified**: `fldI42625LH8zyLh3`, `singleLineText`
  - **2026-08-14 detour, reverted**: briefly converted to a `multipleRecordLinks` field pointing directly at Versions, on the theory that Airtable's text→link matching (confirmed to match on `recordIdVersion`, not the primary field, for the existing fixture record) would let the form auto-resolve the link with no automation. **Tested live via the new "Nieuwe taak" button/form — the prefill does not resolve on a link-typed field.** Reverted back to `singleLineText`. The auto-link automation in section 3 is confirmed necessary; it is no longer on hold.
- [x] 2.2 Create a **new standalone (entry-level) form page** on the Taken table and publish it; note its page ID. The existing "Task Form" pages (`pagDNLNqsevumrseV`, `pagkNw857fjki6qWy`) are *embedded* modals with no shareable URL and cannot be reused.
  - **Done**: form "Nieuwe taak", page ID `page7BKPIF0kR28Nq`, `interfaceId: null` (genuinely standalone). URL: `https://airtable.com/appopJMiQr8csSHhh/page7BKPIF0kR28Nq/form`
  - **Verified by test submission** (record `recb1mLuPpBn7SkRN`): `versie_id` accepts and stores a `rec…` value; `Status` defaults to `Todo` at table level even though it is not on the form; `Prioriteit` picks up the form's P4 prefill.
- [x] 2.2b **Fix the form's field list before shipping the button.**
  - [x] Add **`Assignee`** (`fld3YCjA3KSJQRvPW`) — was missing and blocking: the weekly email loops per person and filters `Assignee has any of <person>`, so a task with no assignee reaches *nobody*, and `Taak Iris` (`wflecUGSZaSAV5QLg`) never fires. Now present and **required**.
  - [x] Add `Project` (`fldvaTT0fp6LVYRNG`), not required
  - [x] Consider making `Omschrijving` optional; requiring rich text is friction for a quick asset task
    - **Done**: verified via `get_form_schema` — `fldwK4oXwt9wMEVdq` (Omschrijving) is `isRequired: false`.
- [x] 2.3 Verify the prefill and hide URL parameter syntax in a **browser** — cannot be tested over HTTP, since the page is client-rendered and returns 200 regardless.
  - [x] **Field-name syntax fully verified**: `?prefill_versie_id=rec…&hide_versie_id=true` hides the field (confirmed still present in `get_form_schema`, so hidden rather than removed) **and** writes the value (record `recJGRISoaFB1GSnm` came through with `versie_id` = `recX06ohuIpJgevMa`).
  - [x] **Field-ID syntax — tested 2026-08-14, rejected.** `?prefill_fldI42625LH8zyLh3=...&hide_fldI42625LH8zyLh3=true` doesn't just fail to prefill — it breaks the form's submit button entirely (confirmed live: submit did nothing until switched to field-name syntax, which worked immediately). Airtable's prefill support is field-*name*-only; the field-ID form silently corrupts something in the page's client-side handling rather than gracefully no-op'ing.
  - [x] **Fallback applied**: `create_task_url` (task 4.1) switched to field-name syntax (`prefill_versie_id`/`hide_versie_id`). Guard added per the original fallback plan: `versie_id`'s field description now states it must never be renamed, since the prefill URL depends on the name.

## 3. Projects base — Auto-link automation

**Resolved 2026-08-14.** A detour was tried: converting `versie_id` to a linked-record field pointing directly at Versions, on the theory that Airtable's text→link matching (which correctly resolved an existing fixture value via `recordIdVersion`, not the primary field) would let the form auto-link with no automation needed. **Live-tested via the "Nieuwe taak" button/form: prefill does not resolve on a link-typed field.** `versie_id` is back to `singleLineText`. The automation below is confirmed necessary and is back in scope as originally designed.

**Design change 2026-08-14: `versie_id` is no longer cleared on success.** Originally (D2/D5) the automation cleared `versie_id` after linking, both to keep it a "transient handshake field" and to prevent re-triggering. In practice the automation's trigger is `versie_id is not empty AND Versions is empty` — a successful link populates `Versions`, which already breaks the match and stops re-triggering on its own. Clearing `versie_id` added nothing but the loss of a permanent, human-readable trace of which Versie a task came from. Decision: leave `versie_id` set after a successful link; `Versions` being non-empty is now the sole signal that a task is linked. `design.md` and `spec.md` are updated to match.

- [x] 3.1 Create an Airtable automation triggered by **"When record matches conditions"** on Taken where `versie_id` is not empty. (Not "record created" — this matches the convention used by every comparable automation in both bases and also catches a late-arriving `versie_id`.)
- [x] 3.2 Add a **Find records** action on Versions (`tbl4jDE911lJl6j7f`) with the condition `recordIdVersion` = the trigger record's `versie_id`, bound dynamically. Do not attempt to filter inside a script — `selectRecordsAsync()` takes no filter argument and can only scan. See `Wekelijkse update Assets` (`wflBkBpjwMBul92Zv`) for the dynamic-filter pattern.
- [x] 3.3 Add a Run-a-script action that consumes the Find records output and:
  - if exactly one match: updates Taken's `Versions` field (`fldBeKksYIUA1nXkv`, renamed from `Assets` — it was never linked to the Assets table, only ever to Versions, so the old name was a misnomer) with the matched record. `versie_id` is left set (see design change below) — the trigger's own `Versions is empty` condition is what stops re-triggering.
  - if no match (or more than one): logs a warning to `systemMessages` (`fld4kYetFjPFM8BcP`) and leaves `versie_id` set
  - **Done**: script at `scripts/airtable/link-taken-to-versions.js`, wired into automation `wflpsJp2NjbxYeSgf`. **User confirmed 2026-08-14: automation is working.**
- [x] 3.4 Create a **scheduled retry automation**: on a schedule, find Taken records where `versie_id` is not empty and run the same link logic. Follow the record-triggered + scheduled-twin pattern already used by `update-base-asset-for-translated-assets` / `…-scheduled` (`wflz8jitdJblp4M13`) in the assets base.
  - **Done, user confirmed 2026-08-14: scheduled retry works.**
- [x] 3.5 Test using the existing fixture: Taken record `recb1mLuPpBn7SkRN` — reset `versie_id` back to the text value `recX06ohuIpJgevMa` (Versie 00957.01 "Projectplan Automatiseren handleidingen", Versions record `rec0CNU4lpq7uyAN3`) since the link-field detour overwrote it. Verify `Versions` is linked to that record; `versie_id` stays set by design (no longer cleared on success). Delete the fixture afterwards.
- [x] 3.6 Test the failure path: set `versie_id` to a non-existent `rec…` value and verify `Versions` stays empty, `versie_id` stays set, and a warning is logged

## 4. Assets base — Versies button

- [x] 4.1 Add a formula field `create_task_url` to the Versies table with the prefilled form URL. Note the `/form` suffix on the page ID.
  - **Originally built with the field-ID syntax** (`prefill_fldI42625LH8zyLh3`/`hide_fldI42625LH8zyLh3`), on the theory that field IDs are immutable and safer long-term (see D1's reasoning). **Field-ID syntax broke the form's submit button** (see 2.3) — switched to the field-name fallback:
  ```
  "https://airtable.com/appopJMiQr8csSHhh/page7BKPIF0kR28Nq/form?prefill_versie_id=" & RECORD_ID() & "&hide_versie_id=true"
  ```
  - **Verified**: `fldkXVuTWEBv0jGvW`, formula matches exactly as above. Guard added: `versie_id`'s field description now warns against renaming it, since the URL depends on the name rather than the field ID.
- [x] 4.2 **Adjusted from plan**: no separate `create_task_button` button-type field was created on the table. Instead, a native button element ("Nieuwe taak") was added directly to the interface page, configured to open the URL held in `create_task_url`. Functionally equivalent for the one interface page it's on; the trade-off vs. a table-level button field is that the link isn't reusable from other interface pages or from the table grid without re-adding the element there too.
- [x] 4.3 Add the button to the **DRAFT** Versies detail interface page (`pagDrVIVp9DW6hdL4`)
  - **Done**: "Nieuwe taak" button added to the "Planning & voortgang" section of the DRAFT page.
- [x] 4.4 **Decided: not added.** Once a Versie is FINAL/CANCELED, no new tasks should be created against it, so the button does not belong on the FINAL/CANCELED detail page (`pagSzH2VzCExir7t8`).

## 5. Projects base — Weekly email filter

**Design change 2026-08-14: no nested OR filter — Airtable's native "Find records" condition builder only supports a flat AND list.** Confirmed directly in the UI: there is no way to group `Status (from Project) has any of ["In progress"] OR Project is empty` as originally planned. The OR logic is pushed into a new computed field on Taken instead, and the automation filters on that field with a plain flat condition.

- [x] 5.0 Add a checkbox-result formula field `email_include_flag` to Taken (`tblW5PkBL4mysdN7t`):
  ```
  OR(
    {fldvaTT0fp6LVYRNG} = BLANK(),
    FIND("In progress", ARRAYJOIN({fldAITAKGoRg491Rf})) > 0
  )
  ```
  (`fldvaTT0fp6LVYRNG` = `Project`, `fldAITAKGoRg491Rf` = `Status (from Project)` / `selTFYB7rv0tcpMQF`)
  - **Done, named `include_in_email`** (`fldcjF4qPLSDyh4IN`) instead of `email_include_flag` — formula matches exactly as planned. Verified via API.
- [x] 5.1 Edit `Email update openstaande taken` (`wflMlK41ftY2t6pa1`) — **deployed, runs Monday 07:15**. In the per-person "Vind openstaande taken" Find records step, replace the flat AND with:
  ```
  Toewijzen aan has any of <person>
  AND Status is none of [Done, Canceled, Blocked]
  AND email_include_flag is checked
  ```
  - **Done**: verified via API that the live "Vind openstaande taken per persoon" step's filter is exactly `Toewijzen aan hasAnyOf <person> AND Status isNoneOf [Done, Canceled, Blocked] AND include_in_email = true`.
- [x] 5.2 Run the automation's test run and confirm the result set equals the previous set **plus** the 4 known project-less open tasks ("Strategie socialmedia", "Aanpassen DE infopakket", "Afronden project VO sales VO", and one untitled record)
  - **Partially verified**: a real test email was sent and received (`iris.soute@picoo.nl`) and confirmed working. It included "Strategie socialmedia" (one of the 4 known project-less tasks), confirming the widened filter surfaces project-less tasks as intended. The other 3 named tasks were not individually checked against this specific inbox.
- [x] 5.3 Confirm Blocked tasks are still excluded (unchanged behaviour — a blocked asset task will not appear in the email)
  - **Verified via API**: the `Status isNoneOf [Done, Canceled, Blocked]` condition is untouched by this change, present unchanged in both the draft and deployed automation config.
- [x] 5.4 Re-deploy and verify the following Monday's email
  - **Deployed**: confirmed via API (`includeDeployedVersion`) that the live/published automation config already includes the `include_in_email = true` condition — matches the draft. Actual Monday-morning send not yet observed (next occurrence: 2026-08-17).

## 6. Projects base — Personal task-list links in the weekly email

Not part of the original task-creation-from-asset scope, but added here since it touches the same automation as section 5. Goal: each person's weekly email includes a link straight to their own open tasks in the Taken overview interface.

**Decision 2026-08-14**: no dynamic "current user" interface filter, and no auto-generated per-person link. The team shares Airtable logins across ~10 people, so there is no reliable identity to filter on, and Airtable has no documented way to construct these filtered-interface URLs from a formula (see the `beCJL` investigation above). Links are generated manually, once, and stored per person — cheap to regenerate by hand if the format ever breaks.

- [x] 6.1 Add a URL field `Taken overzicht link` to the `Picoo users` table (`tblBraAP1jnIZNyoU`)
  - **Done**: `fldurepaBJrBNWeq6`
- [x] 6.2 For each person: open the Taken overview interface, filter `Toewijzen aan` to that person, `Status` to `[Todo, In progress, Blocked]`, and `Status (from Project)` (`fldAITAKGoRg491Rf`) to a set of active statuses (also matches project-less tasks), copy the resulting URL from the address bar, and paste it into their `Picoo users` record
  - **Done for all 19 records** in `Picoo users` (not ~10 — that was an undercount). Iris's link was copied directly from the browser twice (once for the 2-filter version, once after the `Status (from Project)` filter was added); every other person's link was generated by decoding Iris's `beCJL` parameter and substituting only that person's record ID into the identical filter structure — verified byte-for-byte against the original before each write. **User spot-checked several beyond Iris's and confirmed they work.**
- [x] 6.3 Update `Email update openstaande taken` (`wflMlK41ftY2t6pa1`)'s email template to include that person's `Taken overzicht link`
  - **Done**: wired into the `gmailSendEmail` node's message template as `Check [Airtable](<link>) voor de hele lijst.`, reading `fldurepaBJrBNWeq6` from the looped person record — same binding pattern as the name greeting.
- [x] 6.4 Test-run the automation and confirm each email contains a working, correctly-filtered link
  - **User confirmed 2026-08-14: full test worked** — name and link both resolved correctly.

## 7. End-to-end test

- [x] 7.1 Open a Versie on the DRAFT interface page, click "Maak taak aan", fill in a test task **without** a project, and submit
- [x] 7.2 Verify the new Taken record has `Versions` linked to the correct Versie
- [x] 7.3 Verify `versie_id` still holds the source Versie's assets-base record ID on the new Taken record (it is no longer cleared on success — see section 3)
- [x] 7.4 Verify the task appears in the Taken interface (`pagZZ0pIqIxMly274`) and in the weekly email test run
- [x] 7.5 Repeat once **with** a project selected and confirm both the link and the email inclusion still work
- [x] 7.6 Sync-lag check: create a brand-new Versie, immediately click the button and submit. Confirm `versie_id` stays set with a logged warning, then confirm the scheduled retry links it after the next sync.
- [x] 7.7 If the test task is assigned to Iris, confirm `Taak Iris` (`wflecUGSZaSAV5QLg`) still fires and produces an Obsidian note. Expected: the note carries no asset reference, because that automation runs on creation, before the link exists.
