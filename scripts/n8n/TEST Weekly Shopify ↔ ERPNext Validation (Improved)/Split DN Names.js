// n8n-workflow: TEST Weekly Shopify ↔ ERPNext Validation (Improved)
// n8n-node: Split DN Names
const data = $('Get DN List').first().json.data || [];
return data.map(dn => ({ json: dn }));