# Spec Delta

## Purpose

Defines who can be recorded as the requester of a task (`Taken.Aangevraagd door`), so that features that act on the requester — such as completion notifications — reach one real, current colleague.

## ADDED Requirements

### Requirement: A task has at most one requester
`Taken.Aangevraagd door` SHALL hold zero or one linked `Picoo users` record.

#### Scenario: Selecting a second requester
- **WHEN** a user tries to add a second person to `Aangevraagd door` on a task that already has a requester
- **THEN** the field SHALL NOT accept more than one person

#### Scenario: Requester left empty
- **WHEN** a task is created without filling in `Aangevraagd door`
- **THEN** the task SHALL be saved without a requester

### Requirement: Only current employees can be chosen as requester
When selecting a person for `Aangevraagd door`, only `Picoo users` records with `Status dienstverband` = `in dienst` SHALL be offered.

#### Scenario: Former employee not selectable
- **WHEN** a user picks a requester and a `Picoo users` record has a `Status dienstverband` other than `in dienst`
- **THEN** that person SHALL NOT appear among the selectable options

#### Scenario: Existing link to a former employee is kept
- **WHEN** an existing task already links to a person whose `Status dienstverband` is no longer `in dienst`
- **THEN** that link SHALL remain on the task
