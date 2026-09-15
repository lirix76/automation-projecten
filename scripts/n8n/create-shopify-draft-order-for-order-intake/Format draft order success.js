// n8n-workflow: create-shopify-draft-order-for-order-intake
// n8n-node: Format draft order success
// n8n-workflow: create-shopify-draft-order-for-order-intake
// n8n-node: Format draft order success
const orig = $('Build draft order payload').first().json;
const res = $input.first().json;
const draftOrder = res.draft_order;

return [{
  json: {
    recordId: orig.recordId,
    draftOrderId: String(draftOrder.id),
  },
}];