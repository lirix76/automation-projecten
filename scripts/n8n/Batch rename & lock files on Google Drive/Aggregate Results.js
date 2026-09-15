// n8n-workflow: Batch rename & lock files on Google Drive
// n8n-node: Aggregate Results
// Get all items that arrived at this node
const items = $input.all();

const aggregatedData = items.reduce((acc, item) => {
  const data = item.json;
  const recordId = data.recordId;

  if (recordId) {
    const existingRecord = acc[recordId];

    // ERROR PRIORITY LOGIC:
    // If the current item is an ERROR (success: false), it overwrites everything.
    // If the current item is SUCCESS, we only write it if there is NO existing error.
    
    if (data.success === false) {
       acc[recordId] = { 
         recordId: recordId, 
         fileType: data.fileType, 
         success: false, 
         message: data.message || "Unknown n8n Error" 
       };
    } else {
       // Only update with success if we haven't already marked this record as failed.
       // This prevents a 'success' item from hiding a previous 'error' item for the same record.
       if (!existingRecord || existingRecord.success === true) {
         acc[recordId] = {
           recordId: recordId,
           fileType: data.fileType,
           success: true,
           lockAfter: data.lockAfter
         };
       }
    }
  }
  return acc;
}, {});

return [{ json: aggregatedData }];