## Purpose

Closes the loop for whoever requested a task: when a colleague completes or cancels a task that someone else requested, the requester is notified in Slack without having to check Airtable.

## Requirements

### Requirement: Requester is notified when a requested task is completed or cancelled
When a Taken record's `Status` becomes `Done` or `Canceled`, the system SHALL send a Slack direct message to the person in `Aangevraagd door`, provided that person is not also in `Toewijzen aan` and has a Slack user ID in `Picoo users.Slack`.

#### Scenario: Task requested by someone else is marked Done
- **WHEN** a Taken record with `Aangevraagd door` = Lisanna and `Toewijzen aan` = Joanne has its `Status` changed to `Done`
- **THEN** Lisanna SHALL receive a Slack direct message about that task

#### Scenario: Task requested by someone else is cancelled
- **WHEN** a Taken record with `Aangevraagd door` = Lisanna and `Toewijzen aan` = Joanne has its `Status` changed to `Canceled`
- **THEN** Lisanna SHALL receive a Slack direct message about that task

#### Scenario: Who changes the status does not matter
- **WHEN** the `Status` of a task requested by Lisanna and assigned to Joanne is set to `Done` by Lisanna herself, by Joanne, or by an automated process
- **THEN** Lisanna SHALL receive the Slack direct message in each case

### Requirement: No notification without a distinct, reachable requester
The system SHALL NOT send a notification when `Aangevraagd door` is empty, when the requester is also the assignee, or when the requester has no Slack user ID.

#### Scenario: Task without requester
- **WHEN** a Taken record with an empty `Aangevraagd door` is set to `Done`
- **THEN** no Slack message SHALL be sent

#### Scenario: Own task
- **WHEN** a Taken record with `Aangevraagd door` = Joanne and `Toewijzen aan` = Joanne is set to `Done`
- **THEN** no Slack message SHALL be sent

#### Scenario: Requester without Slack ID
- **WHEN** a Taken record is set to `Done` and the requester's `Picoo users.Slack` is empty
- **THEN** no Slack message SHALL be sent

### Requirement: Notification content
The Slack message SHALL contain the task title, the new status (`Done` or `Canceled`), the name of the assignee, and a link that opens the task.

#### Scenario: Message identifies the task and outcome
- **WHEN** Lisanna is notified that task "Handleiding X nakijken", assigned to Joanne, was set to `Done`
- **THEN** the message SHALL include "Handleiding X nakijken", "Done", "Joanne", and a working link to that task

### Requirement: Notification fires on entering a completed state
A notification SHALL be sent each time a task moves from a non-completed status (`Todo`, `Blocked`, `In progress`) into `Done` or `Canceled`. A direct change between `Done` and `Canceled` SHALL NOT produce a notification.

#### Scenario: Task reopened and completed again
- **WHEN** a task requested by Lisanna is set to `Done`, then to `In progress`, then to `Done` again
- **THEN** Lisanna SHALL receive two notifications

#### Scenario: Done changed directly to Canceled
- **WHEN** a task that is `Done` (and already notified) is changed directly to `Canceled`
- **THEN** no additional notification SHALL be sent

### Requirement: Each split task notifies independently
Taken records created by the multi-assignee split (see `task-assignee-split`) SHALL each produce their own notification to the shared requester when completed or cancelled.

#### Scenario: Task split over three assignees
- **WHEN** a task requested by Lisanna is split into three tasks for Joanne, Sjannet and Jeanine, and all three are set to `Done`
- **THEN** Lisanna SHALL receive three notifications, one per task
