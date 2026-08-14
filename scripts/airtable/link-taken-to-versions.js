// ============================================================
// SCRIPT: Resolve versie_id to a Versions link, or warn if unresolved
// TRIGGER: Automation "Match taken-versie records" (wflpsJp2NjbxYeSgf) on
//          Taken (tblW5PkBL4mysdN7t), recordMatchesConditions where
//          versie_id (fldI42625LH8zyLh3) is not empty AND Versions
//          (fldBeKksYIUA1nXkv) is empty.
//          Runs after the "Find records" step (wac7CJlIk6VCa8ICY),
//          which looks up Versions (tbl4jDE911lJl6j7f) where
//          recordIdVersion (fld8vXT2sNGqYtRDo) = the trigger's versie_id.
// TABLES:  Taken (tblW5PkBL4mysdN7t), Versions (tbl4jDE911lJl6j7f)
// LINK:    https://airtable.com/appopJMiQr8csSHhh/wflpsJp2NjbxYeSgf
// DESCRIPTION: If the Find Records step returned exactly one match,
//              links it into Taken's "Versions" field. versie_id is
//              deliberately left in place afterwards as a permanent
//              trace of which Versie the task came from — the trigger's
//              second condition (Versions is empty) is what stops the
//              automation from re-triggering once linked, not clearing
//              this field. If the Find Records step returned zero or
//              more than one match, logs a warning to systemMessages
//              so the failure is visible and the scheduled retry
//              (task 3.4) can pick it up; versie_id stays set either way.
//
// REQUIRED INPUT VARIABLES (set these in the Run a Script action):
//   recordId         -> Trigger > Record ID
//   matchedRecordIds -> wac7CJlIk6VCa8ICY (Find records) > Records
//                        (map the list output; each item may come
//                        through as a record ID string or as an
//                        {id, name} object — this script handles both)
//
// STATUS: Deployed and confirmed working 2026-08-14 (record-triggered
//         path and the scheduled retry twin, task 3.4, both verified).
// ============================================================

const TAKEN_TABLE_ID = "tblW5PkBL4mysdN7t";
const FIELD_VERSIE_ID = "fldI42625LH8zyLh3"; // versie_id (singleLineText)
const FIELD_VERSIONS_LINK = "fldBeKksYIUA1nXkv"; // Versions (link to Versions table)
const FIELD_SYSTEM_MESSAGES = "fld4kYetFjPFM8BcP"; // systemMessages (multilineText)

// --- Helpers ---

function normalizeMatchedIds(rawMatches) {
  if (!Array.isArray(rawMatches)) return [];
  return rawMatches
    .map((item) => (typeof item === "string" ? item : item?.id))
    .filter(Boolean);
}

async function logSystemMessage(table, recordId, message) {
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 16).replace("T", " ");
  const entry = `${timestamp} - ${message}`;
  const record = await table.selectRecordAsync(recordId, { fields: [FIELD_SYSTEM_MESSAGES] });
  const existing = record.getCellValueAsString(FIELD_SYSTEM_MESSAGES) || "";
  const updated = existing ? `${entry}\n${existing}` : entry;
  await table.updateRecordAsync(recordId, { [FIELD_SYSTEM_MESSAGES]: updated });
}

// --- Main ---

async function main() {
  const { recordId, matchedRecordIds } = input.config();
  const table = base.getTable(TAKEN_TABLE_ID);
  const matchedIds = normalizeMatchedIds(matchedRecordIds);

  if (matchedIds.length === 1) {
    await table.updateRecordAsync(recordId, {
      [FIELD_VERSIONS_LINK]: [{ id: matchedIds[0] }],
    });
    await logSystemMessage(table, recordId, `Linked to Versions record ${matchedIds[0]}`);
    return;
  }

  const reason = matchedIds.length === 0
    ? "no matching Versions record found for versie_id"
    : `${matchedIds.length} Versions records matched versie_id — expected exactly one`;
  await logSystemMessage(table, recordId, `WARNING: ${reason}. versie_id left set for retry.`);
}

try {
  await main();
} catch (err) {
  try {
    const { recordId } = input.config();
    const table = base.getTable(TAKEN_TABLE_ID);
    await logSystemMessage(table, recordId, `ERROR: ${err.message}`);
  } catch (_) {}
  throw err;
}
