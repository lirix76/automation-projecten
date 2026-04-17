## ADDED Requirements

### Requirement: Versie has stable cross-base identity field
The assets-base Versies table SHALL have a formula field `recordIdVersion` that stores the Airtable record ID (`RECORD_ID()`) of each Versie. This field SHALL be included in the native sync to the projects base, making it available as a read-only text field on the synced Versions table.

#### Scenario: recordIdVersion populated on sync
- **WHEN** a Versie record exists in the assets base
- **THEN** the synced Versions record in the projects base SHALL have a non-empty `recordIdVersion` field equal to the assets-base record ID (e.g., `recXXXXXXXXXXXXXXX`)

#### Scenario: New versie syncs with recordIdVersion
- **WHEN** a new Versie is created in the assets base and the sync runs
- **THEN** the corresponding Versions record in the projects base SHALL have `recordIdVersion` set

---

### Requirement: Task creation can be initiated from a Versie
A user viewing a Versie in the assets base SHALL be able to initiate Taken creation via a button that opens the Taken creation form in the projects base with the versie identity pre-filled.

#### Scenario: Button opens prefilled form
- **WHEN** a user clicks the "Maak taak aan" button on a Versie record in the assets base
- **THEN** the Taken creation form in the projects base SHALL open in a new tab with the `versie_id` field pre-filled with the assets-base record ID of that Versie

#### Scenario: Button is available in the Versies interface
- **WHEN** a user is viewing the Versies interface page in the assets base
- **THEN** the "Maak taak aan" button SHALL be visible and clickable

---

### Requirement: Taken record is auto-linked to the correct Versions record
When a new Taken record is created with a `versie_id` value set, the projects-base automation SHALL find the matching Versions record and link it to the Taken record's `Assets` field.

#### Scenario: Successful auto-link
- **WHEN** a new Taken record is created with a non-empty `versie_id`
- **THEN** the automation SHALL query the synced Versions table for the record where `recordIdVersion = versie_id`
- **THEN** the Taken record's `Assets` linked field SHALL be updated to include that Versions record
- **THEN** the `versie_id` field on the Taken record SHALL be cleared

#### Scenario: No matching Versions record found
- **WHEN** a new Taken record is created with a `versie_id` that has no matching `recordIdVersion` in the Versions table (e.g., sync has not yet run)
- **THEN** the automation SHALL NOT update the `Assets` field
- **THEN** the `versie_id` field SHALL remain set (making the failure visible)
- **THEN** the automation SHALL log a warning message

#### Scenario: Taken created without versie_id (normal task creation)
- **WHEN** a new Taken record is created without a `versie_id` value
- **THEN** the automation SHALL NOT trigger or SHALL exit immediately without making changes

---

### Requirement: Tasks created from assets appear in the existing tasks email
Taken records created via the asset button SHALL appear in the existing weekly tasks email without any additional configuration, because they are standard Taken records.

#### Scenario: Task-from-asset in weekly email
- **WHEN** the weekly tasks email is generated
- **THEN** a Taken record created from an asset SHALL appear in the assignee's task list like any other Taken record
