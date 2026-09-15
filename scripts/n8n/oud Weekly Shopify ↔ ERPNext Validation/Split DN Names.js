// n8n-workflow: oud Weekly Shopify ↔ ERPNext Validation
// n8n-node: Split DN Names
const data = $('Get DN List').first().json.data || [];
return data.map(dn => ({ json: dn }));