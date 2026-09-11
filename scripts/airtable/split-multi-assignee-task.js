// ============================================================
// SCRIPT: Split a multi-assignee Taken record into one task per assignee
// TRIGGER: Automation "Split multi-assignee task" on Taken
//          (tblW5PkBL4mysdN7t), trigger type recordCreated — fires once
//          per newly created record, regardless of field values.
//          Runs inside a conditionalGroup gated on
//          length(Toewijzen aan) > 1, added by the user directly in the
//          Airtable UI, so the script only executes for records that
//          already have 2+ assignees.
// TABLES:  Taken (tblW5PkBL4mysdN7t)
// LINK:    https://airtable.com/appopJMiQr8csSHhh/wflDCbwhn29AOZO34
// DESCRIPTION: If the triggering record has more than one person in
//              "Toewijzen aan", keeps the record for the first assignee
//              and creates one duplicate per remaining assignee, copying
//              every other writable field. Every record this script
//              creates has exactly one assignee, so it re-fires this
//              same automation harmlessly (the conditionalGroup gate
//              skips it) — no extra guard field needed. Does not link
//              the resulting records to each other. See
//              openspec/changes/split-multi-assignee-task/specs/
//              task-assignee-split/spec.md for the full behavior
//              contract.
//
// REQUIRED INPUT VARIABLES (set these in the Run a Script action):
//   recordId -> Trigger > Record ID
//
// STATUS: Deployed and confirmed working 2026-09-11 (verified against
//         live production splits, e.g. rec7uAiD0AnLmtzTo -> recnx43wFSDmrHGE0).
// ============================================================

const TABLE_ID = "tblW5PkBL4mysdN7t";

const FIELD_ASSIGNEE = "fld3YCjA3KSJQRvPW"; // Toewijzen aan
const FIELD_SYSTEM_MESSAGES = "fld4kYetFjPFM8BcP"; // systemMessages

// Fields copied verbatim from the original record onto each duplicate.
// Deliberately excludes: Toewijzen aan (set per-duplicate below) and
// systemMessages (logged fresh below, never cloned) — plus every computed
// field (formula/lookup/rollup/autonumber/createdTime/lastModifiedTime),
// which Airtable rejects writes to and which recompute correctly for the
// new record on their own. Also excludes "Afgerond op", "Gerelateerde
// taken", "Updates omschrijving" and "link_versions_version_id" — history
// and internal automation state specific to the original record, not
// something a fresh duplicate should inherit.
const COPY_FIELD_IDS = [
  "fldEqow62GYNmDB25", // Taak titel
  "fldVOsyRlR76odsA0", // Status
  "fldTHzDGLu9Zi0fnK", // Tags
  "fldwK4oXwt9wMEVdq", // Omschrijving
  "fldvaTT0fp6LVYRNG", // Project
  "fldLXo2SJjgMSBn4o", // Startdatum
  "fldV1POvR5BiufpEd", // Einddatum
  "fldtKE9l46qLUfSyz", // Updates
  "fldw51LCTcfwKJvtT", // Type
  "fldBeKksYIUA1nXkv", // Versions
  "fldOdj6ciljsoLdDp", // Prioriteit
  "fldI42625LH8zyLh3", // versie_id
  "fldgxT07Z3wTELd8b", // Aangevraagd door
  "fldR69bivr2vw8KKt", // Is blocked by
  "fld2lU4OORUzi3X8u", // Blocking
];

// --- Helpers ---

function timestamp() {
  return new Date().toISOString().slice(0, 16).replace("T", " ");
}

async function logSystemMessage(table, recordId, message) {
  const entry = `${timestamp()} - ${message}`;
  const record = await table.selectRecordAsync(recordId, { fields: [FIELD_SYSTEM_MESSAGES] });
  const existing = record.getCellValueAsString(FIELD_SYSTEM_MESSAGES) || "";
  const updated = existing ? `${entry}\n${existing}` : entry;
  await table.updateRecordAsync(recordId, { [FIELD_SYSTEM_MESSAGES]: updated });
}

// Normalizes a copied cell value into the shape createRecordAsync/
// updateRecordAsync accept for writing: linked-record and multi-select
// arrays become [{id}], single-select becomes {id} — getCellValue returns
// richer {id, name, color} shapes that aren't valid write payloads as-is.
// Plain scalars (text, date, richText strings) pass through unchanged.
function normalizeForWrite(value) {
  if (value == null) return value;
  if (Array.isArray(value)) {
    return value.map((v) => (v && v.id ? { id: v.id } : v));
  }
  if (typeof value === "object" && value.id) {
    return { id: value.id };
  }
  return value;
}

// --- Main ---

async function main() {
  const { recordId } = input.config();
  const table = base.getTable(TABLE_ID);

  const record = await table.selectRecordAsync(recordId, {
    fields: [FIELD_ASSIGNEE, ...COPY_FIELD_IDS],
  });

  const assignees = record.getCellValue(FIELD_ASSIGNEE) || [];

  if (assignees.length <= 1) {
    // Single (or no) assignee: nothing to split. This is also what makes
    // every duplicate this script creates a safe no-op when it re-fires
    // this same automation.
    return;
  }

  const [firstAssignee, ...restAssignees] = assignees;

  const copiedFields = {};
  for (const fieldId of COPY_FIELD_IDS) {
    copiedFields[fieldId] = normalizeForWrite(record.getCellValue(fieldId));
  }

  const newRecordIds = [];
  for (const assignee of restAssignees) {
    const newRecordId = await table.createRecordAsync({
      ...copiedFields,
      [FIELD_ASSIGNEE]: [{ id: assignee.id }],
    });
    newRecordIds.push(newRecordId);
    await logSystemMessage(
      table,
      newRecordId,
      `Split from task ${recordId} (assignee: ${assignee.name || assignee.id})`
    );
  }

  await table.updateRecordAsync(recordId, {
    [FIELD_ASSIGNEE]: [{ id: firstAssignee.id }],
  });

  await logSystemMessage(
    table,
    recordId,
    `Split off ${newRecordIds.length} task(s) for other assignees: ${newRecordIds.join(", ")}`
  );
}

try {
  await main();
} catch (err) {
  try {
    const { recordId } = input.config();
    const table = base.getTable(TABLE_ID);
    await logSystemMessage(table, recordId, `ERROR: ${err.message}`);
  } catch (_) {}
  throw err;
}
