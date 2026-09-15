// n8n-workflow: gather-info-for-order-intake
// n8n-node: No Airtable customer
const prev = $('Parse bestelbon JSON').first().json;
return [{ json: { ...prev, airtableCustomer: null } }];
