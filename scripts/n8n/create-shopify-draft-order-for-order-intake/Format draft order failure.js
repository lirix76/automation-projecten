// n8n-workflow: create-shopify-draft-order-for-order-intake
// n8n-node: Format draft order failure
// n8n-workflow: create-shopify-draft-order-for-order-intake
// n8n-node: Format draft order failure
const orig = $('Build draft order payload').first().json;
const errRes = $input.first().json;
const existingLog = $('Airtable: get Order Intake record').first().json['Automation Error Log'] || '';
const now = new Date();
const timestamp = now.toISOString().slice(0, 16).replace('T', ' ');
const message = `${timestamp} - Shopify draft order creation failed: ${JSON.stringify(errRes).slice(0, 500)}`;
const updatedLog = existingLog ? `${message}\n${existingLog}` : message;

return [{
  json: {
    recordId: orig.recordId,
    errorLog: updatedLog,
  },
}];