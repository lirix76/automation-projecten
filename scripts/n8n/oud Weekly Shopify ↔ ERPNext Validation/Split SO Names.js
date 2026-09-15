// n8n-workflow: oud Weekly Shopify ↔ ERPNext Validation
// n8n-node: Split SO Names
const data = $('Get SO List').first().json.data || [];
return data.map(so => ({ json: so }));