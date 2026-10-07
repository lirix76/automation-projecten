# Spec Delta

## Purpose

Lets a Taken record carry the recurring meeting series and meeting date it originated in, so the open tasks from a meeting series can be listed when preparing that meeting.

## ADDED Requirements

### Requirement: Meeting series are registered as records
The projects base SHALL hold a Meetingreeksen table with exactly one record per recurring meeting series, identified by the series name. At introduction it SHALL contain a record for each of: Projecten voortgangsmeeting, Sales strategie overleg, Customer service meeting, Overleg Picoo platform, Webmeeting.

#### Scenario: Initial series present
- **WHEN** the change is live
- **THEN** the Meetingreeksen table SHALL contain one record for each of the five series named above, and no duplicate records for the same series

#### Scenario: Series record lists its tasks
- **WHEN** a Taken record is linked to a Meetingreeksen record
- **THEN** that Meetingreeksen record SHALL show the Taken record among its linked tasks

### Requirement: A task records its originating meeting series and date
A Taken record SHALL be able to carry a link to at most one Meetingreeksen record (`Meetingreeks`) and a date without time (`Meeting datum`), meaning the series and date of the meeting in which the task was created. Both fields SHALL be optional; a task without them SHALL behave exactly as before.

#### Scenario: Task created in a meeting
- **WHEN** a Taken record is created with `Meetingreeks` set to "Sales strategie overleg" and `Meeting datum` set to 2026-10-07
- **THEN** the record SHALL keep both values and SHALL appear as a linked task on the "Sales strategie overleg" series record

#### Scenario: Only one series per task
- **WHEN** a user tries to link a second Meetingreeksen record to a Taken record that already has one
- **THEN** the field SHALL allow only a single linked series

#### Scenario: Task without meeting series
- **WHEN** a Taken record is created without `Meetingreeks` and `Meeting datum`
- **THEN** it SHALL be created normally and existing automations SHALL treat it as before

### Requirement: Open tasks are listed per meeting series
The Taken table SHALL have a view "Taken per meeting" that shows only records with a `Meetingreeks` and a Status of Todo, Blocked or In progress, grouped by `Meetingreeks`, and showing at least title, assignee, project, end date, meeting date and status.

#### Scenario: Open task appears under its series
- **WHEN** a Taken record has `Meetingreeks` "Projecten voortgangsmeeting" and Status "Todo"
- **THEN** it SHALL appear in the view under the group "Projecten voortgangsmeeting"

#### Scenario: Closed task disappears
- **WHEN** a Taken record in the view is set to Status "Done" or "Canceled"
- **THEN** it SHALL no longer appear in the view

#### Scenario: Task without series is not listed
- **WHEN** an open Taken record has no `Meetingreeks`
- **THEN** it SHALL NOT appear in the view

#### Scenario: New series needs no new view
- **WHEN** a new Meetingreeksen record is added and a task is linked to it
- **THEN** the task SHALL appear in the same view under a new group, without changing the view

### Requirement: Split tasks keep their meeting series and date
When a Taken record with more than one assignee is split into one record per assignee, every resulting record SHALL carry the same `Meetingreeks` and `Meeting datum` as the original.

#### Scenario: Multi-assignee task from a meeting is split
- **WHEN** a Taken record is created with `Toewijzen aan` [Person A, Person B], `Meetingreeks` "Projecten voortgangsmeeting" and `Meeting datum` 2026-10-06
- **THEN** both the original record (Person A) and the duplicate (Person B) SHALL have `Meetingreeks` "Projecten voortgangsmeeting" and `Meeting datum` 2026-10-06
