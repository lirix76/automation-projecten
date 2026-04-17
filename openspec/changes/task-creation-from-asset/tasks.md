## 1. Assets base — Versies table

- [ ] 1.1 Add formula field `recordIdVersion` with formula `RECORD_ID()` to the Versies table in the assets base (`app0zzPtwBSKpGFRZ`)
- [ ] 1.2 Update the native Airtable sync configuration (assets base → projects base) to include the `recordIdVersion` field
- [ ] 1.3 Verify that after the next sync, the Versions table in the projects base (`appopJMiQr8csSHhh`) shows the `recordIdVersion` field populated on existing records

## 2. Projects base — Taken table

- [ ] 2.1 Add a plain text field `versie_id` to the Taken table (`tblW5PkBL4mysdN7t`) in the projects base
- [ ] 2.2 Confirm the existing Taken creation form (or create a new one if none exists); note the form page ID for use in the button URL

## 3. Projects base — Auto-link automation

- [ ] 3.1 Create a new Airtable automation in the projects base triggered on "Record created" in the Taken table, filtered to only fire when `versie_id` is not empty
- [ ] 3.2 Write the automation script (Run a script action) that:
  - receives `takenRecordId` and `versieId` as input variables
  - queries the Versions table filtered by `recordIdVersion = versieId`
  - if a match is found: updates Taken's `Assets` linked field with the matched record, then clears `versie_id`
  - if no match: logs a warning and leaves `versie_id` set
- [ ] 3.3 Test the automation by manually creating a Taken record with a known `versie_id` value and verifying the `Assets` field is linked and `versie_id` is cleared

## 4. Assets base — Versies button field

- [ ] 4.1 Add a button-type field `Maak taak aan` to the Versies table in the assets base with the URL formula:
  ```
  "https://airtable.com/appopJMiQr8csSHhh/<form-page-id>?prefill_versie_id=" & RECORD_ID()
  ```
  (replace `<form-page-id>` with the ID from task 2.2)
- [ ] 4.2 Add the `Maak taak aan` button to the Versies interface page in the assets base

## 5. End-to-end test

- [ ] 5.1 Open a Versie in the assets base interface, click "Maak taak aan", fill in a test task, and submit
- [ ] 5.2 Verify the new Taken record in the projects base has the `Assets` field linked to the correct Versie
- [ ] 5.3 Verify the `versie_id` field is empty on the new Taken record
- [ ] 5.4 Verify the task appears correctly in the tasks list/interface in the projects base
