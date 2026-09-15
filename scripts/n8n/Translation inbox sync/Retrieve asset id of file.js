// n8n-workflow: Translation inbox sync
// n8n-node: Retrieve asset id of file
const filename = $input.item.json.name;
const match = filename.match(/(\d{5}\.\d{2})/);

return [{
  json: {
    ...($input.item.json),
    versionId: match ? match[1] : null,
    fileId: $input.item.json.id,
    filename: filename,
  }
}];
