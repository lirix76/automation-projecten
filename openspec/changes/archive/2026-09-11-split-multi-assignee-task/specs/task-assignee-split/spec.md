## Purpose

Ability for a Taken record created with more than one person in `Toewijzen aan` to be split, at the moment of creation, into one single-assignee Taken record per person, so each assignee has their own independently trackable task.

## ADDED Requirements

### Requirement: Multi-assignee task is split into one task per assignee at creation
When a Taken record is created with more than one linked record in `Toewijzen aan`, the system SHALL retain the original record for the first assignee (in the order they appear in `Toewijzen aan`) and SHALL create exactly one additional Taken record for each remaining assignee, each with `Toewijzen aan` set to that single person only.

This SHALL apply regardless of how many assignees are present (two, three, or more) — every assignee beyond the first SHALL receive their own duplicate record.

#### Scenario: Task created with two assignees
- **WHEN** a Taken record is created with `Toewijzen aan` set to [Person A, Person B]
- **THEN** the original record SHALL end up with `Toewijzen aan` set to [Person A] only
- **AND** exactly one new Taken record SHALL be created with `Toewijzen aan` set to [Person B] only

#### Scenario: Task created with three or more assignees
- **WHEN** a Taken record is created with `Toewijzen aan` set to [Person A, Person B, Person C]
- **THEN** the original record SHALL end up with `Toewijzen aan` set to [Person A] only
- **AND** one new Taken record SHALL be created for Person B and one for Person C, each with `Toewijzen aan` set to that person only

#### Scenario: Task created with a single assignee is left unchanged
- **WHEN** a Taken record is created with `Toewijzen aan` set to exactly one person, or left empty
- **THEN** no additional Taken record SHALL be created
- **AND** the original record SHALL be left unmodified by this capability

### Requirement: Duplicate tasks carry over the original's content
Each newly created duplicate Taken record SHALL have the same values as the original record for every field other than `Toewijzen aan`, to the extent Airtable permits writing that field (computed fields such as formulas, lookups, rollups, autonumbers, and created/modified-time fields are excluded, since their values are inherently specific to each record and are populated automatically).

#### Scenario: Duplicate copies writable fields
- **WHEN** a duplicate Taken record is created as part of a split
- **THEN** its title, status, tags, description, project link, dates, type, priority, requester, versions link, updates link, and blocking/blocked-by links SHALL match the original record's values at the time of the split

### Requirement: Split does not link duplicates back to the original
Splitting a Taken record SHALL NOT create any relational link (via `Gerelateerde taken` or any other field) between the original record and the Taken records created for the other assignees.

#### Scenario: No relational trace between split tasks
- **WHEN** a Taken record is split into multiple single-assignee records
- **THEN** none of the resulting records SHALL have a link field pointing at any of the other resulting records as a consequence of the split

### Requirement: Split activity is logged per record, not copied
Each duplicate Taken record's `systemMessages` field SHALL receive a new log entry describing that it was created via a split, and SHALL NOT contain a copy of the original record's prior `systemMessages` history. The original record's `systemMessages` field SHALL receive a new log entry noting which duplicate(s) were split off from it.

#### Scenario: Duplicate gets a fresh log entry
- **WHEN** a duplicate Taken record is created as part of a split
- **THEN** its `systemMessages` field SHALL contain an entry noting it was split from the original record, and SHALL NOT contain any log entries that existed on the original record prior to the split

#### Scenario: Original gets a log entry noting the split
- **WHEN** a Taken record is split into multiple records
- **THEN** the original record's `systemMessages` field SHALL gain a new entry (prepended, not replacing prior entries) noting the split occurred

### Requirement: Split only triggers at record creation
The split SHALL be evaluated only when a Taken record is newly created. Adding a second (or further) assignee to an existing single-assignee Taken record after creation SHALL NOT trigger a split.

#### Scenario: Later edit to add a second assignee is not split
- **WHEN** an existing Taken record that was created with a single assignee is subsequently edited to add a second assignee to `Toewijzen aan`
- **THEN** no additional Taken record SHALL be created as a result of that edit
