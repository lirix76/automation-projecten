// n8n-workflow: gather-info-for-order-intake
// n8n-node: Merge all sources
const base = $('Join company branch').first().json;
const shopifyItems = $input.all();
const shopifyRaw = shopifyItems.length ? shopifyItems[0].json : null;
const customer = (shopifyRaw && !shopifyRaw.error && Array.isArray(shopifyRaw.customers) && shopifyRaw.customers.length)
  ? shopifyRaw.customers[0]
  : null;
const shopifyErrors = [];
if (shopifyRaw && shopifyRaw.error) shopifyErrors.push(`Shopify customer search error: ${JSON.stringify(shopifyRaw).slice(0, 300)}`);

const shopifyAddr = customer && customer.default_address ? customer.default_address : null;
const shopify = customer ? {
  id: customer.id || null,
  companyName: (shopifyAddr && shopifyAddr.company) || null,
  contactName: [customer.first_name, customer.last_name].filter(Boolean).join(' ') || null,
  contactEmail: customer.email || null,
  contactPhone: customer.phone || null,
  street: shopifyAddr ? [shopifyAddr.address1, shopifyAddr.address2].filter(Boolean).join(' ') : null,
  city: shopifyAddr ? shopifyAddr.city : null,
  postalCode: shopifyAddr ? shopifyAddr.zip : null,
  country: shopifyAddr ? shopifyAddr.country : null,
} : null;

const ac = base.airtableCustomer || {};
const b = base.bestelbon || {};
const hc = base.hubspotCompany || {};
const sh = shopify || {};

const pick = (...vals) => {
  for (const v of vals) { if (v !== null && v !== undefined && v !== '') return v; }
  return null;
};

// Priority order: Airtable's own linked Customer record (already-confirmed data
// for this specific customer, in this same tool) > Bestelbon > Shopify > HubSpot.
// Airtable customer data is shipping-only (like Shopify), not a billing fallback —
// unlike HubSpot company, which is the one flat-address source used for both.
const merged = {
  companyName: pick(ac.companyName, b.companyName, sh.companyName, hc.companyName),
  shippingContactName: pick(ac.contactName, b.shippingContactName, sh.contactName),
  shippingContactEmail: pick(ac.contactEmail, b.shippingContactEmail, sh.contactEmail, base.ordererEmail),
  shippingContactPhone: pick(b.shippingContactPhone, sh.contactPhone),
  shippingStreet: pick(ac.street, b.shippingStreet, sh.street, hc.street),
  shippingPostalCode: pick(ac.postalCode, b.shippingPostalCode, sh.postalCode, hc.postalCode),
  shippingCity: pick(ac.city, b.shippingCity, sh.city, hc.city),
  shippingCountry: pick(ac.country, b.shippingCountry, sh.country, hc.country),
  billingContactName: pick(b.billingContactName),
  billingContactEmail: pick(b.billingContactEmail),
  billingContactPhone: pick(b.billingContactPhone),
  billingStreet: pick(b.billingStreet, hc.street),
  billingPostalCode: pick(b.billingPostalCode, hc.postalCode),
  billingCity: pick(b.billingCity, hc.city),
  billingCountry: pick(b.billingCountry, hc.country),
  vatNumber: pick(ac.vatNumber, b.vatNumber),
  poReferenceNumber: pick(b.poReferenceNumber),
  confirmationContactName: pick(b.confirmationContactName),
  confirmationContactEmail: pick(b.confirmationContactEmail),
  costCenter: pick(b.costCenter),
};

const logLines = [];
if (ac.street || ac.contactName) logLines.push(`Airtable customer record: ${ac.contactName || 'linked customer'}`);
if (base.bestelbonFieldsFound && base.bestelbonFieldsFound.length) {
  logLines.push(`Bestelbon: ${base.bestelbonFieldsFound.join(', ')}`);
}
if (base.hubspotContactId) logLines.push(`HubSpot contact: ${base.hubspotContactId}`);
if (base.hubspotCompanyId) logLines.push(`HubSpot company: ${base.hubspotCompanyId} (fallback for empty address fields)`);
if (shopify && shopify.id) logLines.push(`Shopify customer: ${shopify.id} (fallback for empty shipping fields)`);
if (!logLines.length) logLines.push('No data found in Bestelbon, HubSpot, or Shopify — customer will need to fill in everything.');

const errors = [...(base.errors || []), ...shopifyErrors];

return [{
  json: {
    recordId: base.recordId,
    merged,
    hubspotContactId: base.hubspotContactId || null,
    hubspotCompanyId: base.hubspotCompanyId || null,
    shopifyCustomerId: (shopify && shopify.id) ? String(shopify.id) : null,
    gatherLog: logLines.join('\n'),
    errors,
  },
}];