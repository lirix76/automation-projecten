// n8n-workflow: Batch rename & lock files on Google Drive
// n8n-node: Format success
// $json is the rename PATCH response, so body.files is no longer in $json here.
// Use $('Merge1').item to recover the original file data (recordId, lockAfter, fileType).
const originalData = $('Merge1').item.json['body.files'];

return {
  json: {
    ...originalData,
    success: true
  }
};
