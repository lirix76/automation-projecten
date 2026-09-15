// n8n-workflow: gather-info-for-order-intake
// n8n-node: Parse bestelbon JSON
const body = $input.first().json.body || $input.first().json;
const recordId = body.recordId;
const ordererEmail = body.ordererEmail || null;
const bestelbonRaw = body.bestelbonExtractie || null;

const empty = {
  companyName: null,
  shippingContactName: null, shippingContactEmail: null, shippingContactPhone: null,
  shippingStreet: null, shippingPostalCode: null, shippingCity: null, shippingCountry: null,
  billingContactName: null, billingContactEmail: null, billingContactPhone: null,
  billingStreet: null, billingPostalCode: null, billingCity: null, billingCountry: null,
  vatNumber: null, poReferenceNumber: null,
  confirmationContactName: null, confirmationContactEmail: null, costCenter: null,
};

let bestelbon = { ...empty };
let bestelbonError = null;
let bestelbonFieldsFound = [];

if (bestelbonRaw) {
  try {
    let text = bestelbonRaw.trim();
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '');
    const parsed = JSON.parse(text);
    bestelbon = { ...empty, ...parsed };
    bestelbonFieldsFound = Object.keys(empty).filter((k) => bestelbon[k] !== null && bestelbon[k] !== '');
  } catch (e) {
    bestelbonError = `Bestelbon JSON parse error: ${e.message}. Raw: ${bestelbonRaw.slice(0, 500)}`;
  }
}

return [{
  json: {
    recordId,
    ordererEmail,
    bestelbon,
    bestelbonFieldsFound,
    errors: bestelbonError ? [bestelbonError] : [],
  },
}];