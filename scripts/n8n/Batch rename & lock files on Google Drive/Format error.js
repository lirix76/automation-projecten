// n8n-workflow: Batch rename & lock files on Google Drive
// n8n-node: Format error
// body.files is merged into $json after Merge1 (rename/Lock File error paths).
// For pre-Merge1 errors (Unlock File, Get extension, Update file), fall back to Split Out Files
// so the recordId is still recoverable and Airtable gets flagged with sync_error.
let originalData;
try {
  originalData = $json["body.files"] || $('Merge1').item.json['body.files'];
} catch(e) {
  try {
    originalData = $('Split Out Files').item.json['body.files'];
  } catch(e2) {
    originalData = null;
  }
}

return {
  json: {
    ...(originalData || {}),
    success: false,
    message: $json.error || $json.message || "Operation failed"
  }
};
