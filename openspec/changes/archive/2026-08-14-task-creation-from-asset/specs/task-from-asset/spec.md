## ADDED Requirements

### Requirement: Versie has stable cross-base identity field
The assets-base Versies table SHALL have a formula field named `recordIdVersion` that stores the Airtable record ID (`RECORD_ID()`) of each Versie. This field SHALL be included in the native sync to the projects base, making it available as a read-only text field on the synced Versions table.

The field name SHALL be `recordIdVersion` in both bases, distinct from the projects base's own local `recordId` formula on the Versions table, which resolves to the projects-base record ID and has a different meaning.

#### Scenario: recordIdVersion populated on sync
- **WHEN** a Versie record exists in the assets base
- **THEN** the synced Versions record in the projects base SHALL have a non-empty `recordIdVersion` field equal to the assets-base record ID (e.g., `recXXXXXXXXXXXXXXX`)

#### Scenario: New versie syncs with recordIdVersion
- **WHEN** a new Versie is created in the assets base and the sync runs
- **THEN** the corresponding Versions record in the projects base SHALL have `recordIdVersion` set

#### Scenario: recordIdVersion is distinguishable from the local recordId
- **WHEN** a user or script reads both `recordIdVersion` and `recordId` on a Versions record in the projects base
- **THEN** `recordIdVersion` SHALL hold the assets-base record ID
- **AND** `recordId` SHALL hold the projects-base record ID
- **AND** the two values SHALL NOT be equal

---

### Requirement: A linkable Taken creation form exists
The projects base SHALL have a published standalone (entry-level) form page on the Taken table, reachable by URL and accepting prefilled URL parameters. Embedded record-creation modals do not satisfy this requirement because they have no shareable URL.

The form SHALL expose at least `Taak titel`, `Omschrijving`, `Assignee`, `Project`, `Einddatum` and `Prioriteit`, and SHALL accept `versie_id` as a prefilled value.

`Assignee` SHALL be present on the form, because the weekly tasks email is assembled per person from the `Assignee` field — a task submitted without an assignee reaches no one.

#### Scenario: Form is reachable by URL
- **WHEN** the form's URL is opened in a browser
- **THEN** the Taken creation form SHALL render

#### Scenario: Submitted task has an assignee
- **WHEN** a user submits the form
- **THEN** the created Taken record SHALL have a non-empty `Assignee`

#### Scenario: Project is optional on the form
- **WHEN** a user submits the form without selecting a `Project`
- **THEN** the Taken record SHALL be created successfully with an empty `Project` field

#### Scenario: versie_id is prefilled
- **WHEN** the form is opened with a `versie_id` prefill parameter
- **THEN** the `versie_id` value SHALL be applied to the submitted record without the user typing it

#### Scenario: versie_id is not presented as a field to fill in
- **WHEN** a user opens the prefilled form
- **THEN** the `versie_id` field SHALL either be hidden, or be labelled so that the user knows not to change it
- **AND** a `versie_id` that the user has altered SHALL fail to resolve rather than link the wrong Versie

---

### Requirement: Task creation can be initiated from a Versie
A user viewing a Versie in the assets base SHALL be able to initiate Taken creation via a button that opens the Taken creation form in the projects base with the versie identity pre-filled.

The URL SHALL be held in a formula field on the Versies table (`create_task_url`), so that the generated link is inspectable from the record, and SHALL be opened by a button — either a table-level button field or a native button element on an interface page.

#### Scenario: Button opens prefilled form
- **WHEN** a user clicks the "Maak taak aan" button on a Versie record in the assets base
- **THEN** the Taken creation form in the projects base SHALL open in a new tab with the `versie_id` field pre-filled with the assets-base record ID of that Versie

#### Scenario: Button is available on the DRAFT Versies interface page
- **WHEN** a user is viewing a Versie on the DRAFT Versies detail interface page in the assets base
- **THEN** the "Maak taak aan" button SHALL be visible and clickable

#### Scenario: Button URL is inspectable
- **WHEN** a user opens a Versie record in the assets base
- **THEN** the `create_task_url` field SHALL show the full form URL including the `versie_id` value for that record

---

### Requirement: Taken record is auto-linked to the correct Versions record
When a Taken record has a `versie_id` value set and its `Versions` field is empty, the projects-base automation SHALL find the matching Versions record and link it to the Taken record's `Versions` field.

The automation SHALL be triggered by record-matches-conditions on `versie_id` is not empty AND `Versions` is empty, and SHALL resolve the Versions record using a server-side filtered record lookup rather than scanning the whole table.

`versie_id` is a permanent record of the Versie a task originated from, not a transient flag: it is **not** cleared on a successful link. Whether a task is still pending or already linked is determined by whether `Versions` is empty, not by whether `versie_id` is set.

#### Scenario: Successful auto-link
- **WHEN** a Taken record has a non-empty `versie_id` and an empty `Versions` field
- **THEN** the automation SHALL look up the Versions record where `recordIdVersion = versie_id`
- **AND** the Taken record's `Versions` linked field SHALL be updated to include that Versions record
- **AND** `versie_id` SHALL remain set, unchanged, as a record of the source Versie

#### Scenario: No matching Versions record found
- **WHEN** a Taken record has a `versie_id` that has no matching `recordIdVersion` in the Versions table (e.g., the sync has not yet run)
- **THEN** the automation SHALL NOT update the `Versions` field
- **AND** the `versie_id` field SHALL remain set, making the failure visible and recoverable
- **AND** the automation SHALL log a warning message

#### Scenario: Taken created without versie_id (normal task creation)
- **WHEN** a Taken record is created without a `versie_id` value
- **THEN** the automation SHALL NOT trigger

#### Scenario: Automation does not re-trigger itself
- **WHEN** the automation successfully links a Taken record's `Versions` field
- **THEN** the record SHALL no longer match the trigger's conditions (since `Versions` is no longer empty)
- **AND** the automation SHALL NOT trigger again for that record

---

### Requirement: Unresolved links are retried on a schedule
A scheduled automation in the projects base SHALL periodically sweep Taken records where `versie_id` is not empty AND `Versions` is empty, and attempt the link again, so that a task created before the sync caught up is eventually linked without manual intervention.

#### Scenario: Link recovers after sync catches up
- **GIVEN** a Taken record whose `versie_id` could not be resolved because the Versions record did not yet exist
- **WHEN** the sync has since run and the scheduled retry automation executes
- **THEN** the Taken record's `Versions` field SHALL be linked to the matching Versions record
- **AND** `versie_id` SHALL remain set, unchanged, as a record of the source Versie

#### Scenario: Still-unresolvable records are left intact
- **GIVEN** a Taken record with a `versie_id` that matches no Versions record at all
- **WHEN** the scheduled retry automation executes
- **THEN** the record SHALL be left unchanged with `versie_id` still set and `Versions` still empty
- **AND** a warning SHALL be logged

---

### Requirement: Asset tasks are not required to have a project
A Taken record created from a Versie SHALL be valid with an empty `Project` field. Neither the form, the auto-link automation, nor any downstream automation SHALL require or assign a project to it.

#### Scenario: Task without project is fully functional
- **WHEN** a Taken record is created from a Versie with no `Project` selected
- **THEN** the record SHALL be linked to its Versions record as normal
- **AND** no automation SHALL assign a placeholder or catch-all project to it

---

### Requirement: Open tasks without a project appear in the weekly tasks email
The weekly tasks email SHALL include a person's open tasks that have no linked project, in addition to open tasks whose linked project has status "In progress".

Task-status exclusions are unchanged: tasks with status Done, Canceled or Blocked SHALL remain excluded regardless of project.

#### Scenario: Project-less task in weekly email
- **GIVEN** an open Taken record assigned to a person with an empty `Project` field
- **WHEN** the weekly tasks email is generated
- **THEN** that task SHALL appear in that person's task list

#### Scenario: Task on an in-progress project still appears
- **GIVEN** an open Taken record assigned to a person, linked to a project with status "In progress"
- **WHEN** the weekly tasks email is generated
- **THEN** that task SHALL appear in that person's task list

#### Scenario: Task on a not-started project is still excluded
- **GIVEN** an open Taken record assigned to a person, linked to a project with status "Idee", "Gepland", "On hold", "Done" or "Geannulleerd"
- **WHEN** the weekly tasks email is generated
- **THEN** that task SHALL NOT appear in that person's task list

#### Scenario: Blocked task is still excluded
- **GIVEN** a Taken record assigned to a person with status "Blocked" and no project
- **WHEN** the weekly tasks email is generated
- **THEN** that task SHALL NOT appear in that person's task list
