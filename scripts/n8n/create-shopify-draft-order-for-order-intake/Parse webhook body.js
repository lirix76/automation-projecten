// n8n-workflow: create-shopify-draft-order-for-order-intake
// n8n-node: Parse webhook body
// n8n-workflow: create-shopify-draft-order-for-order-intake
// n8n-node: Parse webhook body
const body = $input.first().json.body || $input.first().json;
return [{ json: { recordId: body.recordId } }];