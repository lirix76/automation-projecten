## Context

There are two Airtable bases:
- **Assets base** (`app0zzPtwBSKpGFRZ`): contains `Assets`, `Versies`, and related tables. Versies has a "Volgende actie" field (a person link) and Airtable comments as the only way to communicate what work needs to happen.
- **Projects base** (`appopJMiQr8csSHhh`): contains `Taken` (tasks), `Projecten`, and a synced read-only copy of `Versies` called `Versions` (`tbl4jDE911lJl6j7f`). The Taken table already has an `Assets` linked field that links to this synced Versions table.

Airtable native sync is one-directional (assets → projects) and read-only in the destination. Cross-base record links are not supported. The synced Versions table in the projects base has **different record IDs** from the originals in the assets base.

The existing cross-base asset↔project linking uses a webhook chain (assets → HTTP → projects) which is kept intact and untouched by this change.

## Goals / Non-Goals

**Goals:**
- A user viewing a Versie in the assets base can initiate task creation with one click
- The resulting Taken record is automatically linked to the correct Versions record in the projects base
- The Taken record appears in the existing tasks weekly email without any additional work
- No disruption to existing workflows (Volgende actie, webhook scripts, weekly emails)

**Non-Goals:**
- Migrating existing Volgende actie data to Taken records (future phase)
- Showing linked tasks inline in the assets base interface (tracked as a follow-up change: "task-visibility-in-assets")
- Removing or replacing the weekly assets email (future phase)
- Pre-filling the assignee or project fields on the Taken form (can be added later)

## Decisions

### D1: Use `recordIdVersion` as the cross-base identity key

**Decision**: Add a formula field `recordIdVersion = RECORD_ID()` to the assets base Versies table and include it in the native sync to the projects base. This field acts as the stable identifier linking an assets-base Versie to its synced counterpart in the projects base.

**Rationale**: Native Airtable sync does not preserve record IDs. Without an explicit identity field, there is no reliable way to find the corresponding projects-base Versions record from the assets-base record ID. A `RECORD_ID()` formula field stored as text survives the sync and enables an exact-match lookup.

**Alternative considered**: Use the human-readable ID (e.g., "00001.02"). Rejected because that field is a formula result depending on two other fields, making it slightly more fragile. The Airtable record ID is immutable per record.

---

### D2: Transient `versie_id` handshake field on Taken

**Decision**: Add a plain text field `versie_id` to the Taken table. The task creation form pre-fills this field with the assets-base record ID via URL parameter. An automation then uses it to link the Versions record and clears the field.

**Rationale**: Airtable form URL pre-fill supports text fields via `?prefill_FieldName=value`. It does not support pre-filling linked record fields with a record ID from a different base. The handshake field bridges this gap: the form captures the identity, the automation resolves the actual record link.

**Alternative considered**: Pre-fill the linked record field directly using the projects-base Versions record ID. Rejected because the projects-base ID is unknown from within the assets base — it cannot be derived or stored there without another automation.

**Alternative considered**: Use a webhook from the assets base to create the Taken record directly (bypassing the form). Rejected for this phase because it adds complexity and the form approach is zero-latency for the user and requires no additional API calls at click time.

---

### D3: Button field on Versies interface (not a formula in the table)

**Decision**: Add the "Maak taak aan" button as a button-type field on the Versies table in the assets base. The URL formula uses `RECORD_ID()` to generate the pre-filled form link.

**Rationale**: Button fields in Airtable can open URLs. This keeps the logic in the table (reusable in any view/interface) and avoids a separate interface-only configuration.

**Form URL pattern**:
```
"https://airtable.com/appopJMiQr8csSHhh/<form-page-id>?prefill_versie_id=" & RECORD_ID()
```

---

### D4: Auto-link automation uses a filtered record lookup

**Decision**: The projects-base automation queries the synced Versions table filtered by `recordIdVersion = {versie_id}` rather than fetching all records.

**Rationale**: The existing webhook-receiver script (`catch-webhook-to-link-asset-to-project.js`) uses a full table scan (`selectRecordsAsync()` → `.find()`), which is O(n). This automation uses a targeted filter, keeping it O(1) regardless of table size.

**Script approach**: Airtable automation "Run a script" action. Receives `takenRecordId` and `versieId` as inputs. Queries Versions table with filter, gets the matching record ID, then updates the Taken record's `Assets` linked field and clears `versie_id`.

## Risks / Trade-offs

**Sync lag on `recordIdVersion`** → The native sync runs periodically (can be minutes). If a brand-new Versie is created and a user immediately tries to create a task, the `recordIdVersion` may not yet exist in the projects base Versions table. Mitigation: the automation should handle "no match found" gracefully (log it, leave `versie_id` set so it's visible that linking failed).

**Form page ID hardcoded in button URL** → If the Taken creation form page is deleted or moved, the button breaks. Mitigation: document the form page ID. Low risk since forms are stable.

**`versie_id` field left dirty on failure** → If the automation fails, `versie_id` stays populated on the Taken record. Mitigation: make `versie_id` visible in the Taken table view so failures are detectable. Add a retry mechanism in the automation (future).

**User must still fill in task details manually** → The form pre-fills only `versie_id`; title, assignee, due date, and project all require manual entry. Trade-off accepted: this is phase 1 (coexistence), not full migration.

## Migration Plan

1. Add `recordIdVersion` to assets-base Versies table and update sync config → existing records get populated on next sync
2. Add `versie_id` field to projects-base Taken table (no data migration needed)
3. Create Taken creation form in projects base (or identify existing one)
4. Add automation in projects base
5. Add button field to assets-base Versies table
6. Test end-to-end with one versie
7. Add button to the Versies interface page in the assets base

**Rollback**: Remove the button field from the assets interface. All other changes are additive and non-breaking.

## Open Questions

- Does an existing Taken creation form already exist in the projects base that we can reuse, or do we need to create one?
- Should `versie_id` be hidden from regular users in the Taken interface (set field permissions) or left visible?

## Future Work

**task-visibility-in-assets**: Show linked tasks inline in the Versies interface in the assets base (read-only). Planned approach: sync the Taken table from the projects base into the assets base; use an automation to maintain linked-record relationships between Versies and synced Taken records using `versie_id` as the key; surface this as a linked-record section in the Versies interface with a per-task button linking to the full task detail in the projects base.
