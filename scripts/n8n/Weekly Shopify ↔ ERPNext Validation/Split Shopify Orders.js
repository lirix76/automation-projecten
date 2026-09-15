// n8n-workflow: Weekly Shopify ↔ ERPNext Validation
// n8n-node: Split Shopify Orders
const input = $input.first().json;
const orders = input.orders || [input];
return orders.map(o => ({ json: o }));
