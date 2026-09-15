// n8n-workflow: Daily ERPNext Purchase Orders Sync to Airtable
// n8n-node: Filter Out Existing POs
const erpPOs = $('Get PO List from ERPNext').first().json.data;
const airtablePOs = $input.all().map(item => item.json['PO nummer']);

const newPOs = erpPOs.filter(po => !airtablePOs.includes(po.name));

return [{ json: { newPOs } }];