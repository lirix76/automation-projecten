## Purpose

Defines that a Project record in the Projectmanagement base carries its own prioritization and planning data natively, so a Project can never exist without planning data and planning data can never exist without a Project.

## ADDED Requirements

### Requirement: Project carries native planning data
A Project record SHALL hold its effort, impact, scoring, planned quarter, and review data as native fields on the Project record itself, without requiring a separate linked record in another table.

#### Scenario: Viewing a project shows its planning data
- **WHEN** a user opens a Project record
- **THEN** the record shows Doorlooptijd, Impact - voor de klant, Impact - voor Picoo, Effort - tijd, Effort - geld, Impactscore, Effortscore, Gepland voor, and Review directly on that record, with no separate linked record required to see them

#### Scenario: Creating a project provisions planning fields inline
- **WHEN** a new Project record is created
- **THEN** its planning fields exist on that same record from the moment of creation, with no separate creation step and no intermediate state where the project has no planning data

### Requirement: Planning data cannot exist independent of a project
The data model SHALL make it impossible to create planning data (effort, impact, scoring, quarter, review) that is not attached to exactly one Project record.

#### Scenario: No standalone planning record can be created
- **WHEN** a user tries to record planning/prioritization data for something that is not yet a Project
- **THEN** there is no table or record type available to do so — planning data can only be entered on an existing Project record

### Requirement: Impact-effort classification is derived from impact and effort scores
A Project's `Impact-effort` field SHALL classify the project as one of Quick Win, Major Project, Fill-in, or Thankless Task, computed from its Impactscore and Effortscore, consistent with the classification logic previously provided by the Planning table's `Prioriteit` field.

#### Scenario: Classification follows the existing scoring logic
- **WHEN** a Project's Impactscore is high (>= 3) and Effortscore is low (< 3)
- **THEN** its `Impact-effort` field shows "🚀 Quick Win"

### Requirement: Impact-effort is distinct from the manual Prioriteit field
A Project's computed `Impact-effort` classification SHALL be a separate field from the existing manual `Prioriteit` field (P1–P4), with no name collision between the two.

#### Scenario: Both fields are visible without ambiguity
- **WHEN** a user opens a Project record
- **THEN** the manually-set `Prioriteit` (P1–P4) and the computed `Impact-effort` (Quick Win/Major Project/Fill-in/Thankless Task) appear as two distinctly named fields, each retaining its own prior meaning
