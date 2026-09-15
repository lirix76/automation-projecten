// n8n-workflow: TEST Weekly Shopify ↔ ERPNext Validation (Improved)
// n8n-node: Split SO Names
const data = $('Get SO List').first().json.data || [];
return data.map(so => ({ json: so }));