// n8n-workflow: create-shopify-draft-order-for-order-intake
// n8n-node: Build draft order payload
const rec = $input.first().json;

const COUNTRY_CODES = {
  Netherlands: 'NL',
  Belgium: 'BE',
  Germany: 'DE',
  Sweden: 'SE',
  UK: 'GB',
};

function splitName(full) {
  if (!full) return { first_name: null, last_name: null };
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { first_name: null, last_name: parts[0] };
  return { first_name: parts.slice(0, -1).join(' '), last_name: parts[parts.length - 1] };
}

function buildAddress(street, city, postalCode, countryName, contactName, phone) {
  if (!street && !city && !postalCode && !countryName) return null;
  const { first_name, last_name } = splitName(contactName);
  return {
    first_name,
    last_name,
    company: rec['Company name'] || null,
    address1: street,
    city,
    zip: postalCode,
    country: countryName,
    country_code: countryName ? (COUNTRY_CODES[countryName] || null) : null,
    phone: phone || null,
  };
}

const shippingStreet = rec['Shipping street'] || null;
const shippingCity = rec['Shipping city'] || null;
const shippingPostalCode = rec['Shipping postal code'] || null;
const shippingCountry = rec['Shipping country'] || null;
const shippingContactName = rec['Shipping contact name'] || null;
const shippingPhone = rec['Shipping contact phone'] || null;

const shippingAddress = buildAddress(
  shippingStreet, shippingCity, shippingPostalCode, shippingCountry, shippingContactName, shippingPhone
);

const billingContactName = rec['Billing contact name'] || null;
const billingContactEmail = rec['Billing contact email'] || null;
const billingContactPhone = rec['Billing contact phone'] || null;
const billingStreet = rec['Billing street'] || null;
const billingCity = rec['Billing city'] || null;
const billingPostalCode = rec['Billing postal code'] || null;
const billingCountry = rec['Billing country'] || null;

const billingSameAsShipping = !!rec['Billing same as shipping address'];
// Any billing field the customer filled in — not just address fields —
// since a customer can fill in a billing contact/email without a full
// billing address (see design.md's "did the customer fill in billing").
const anyBillingFieldFilled = !!(
  billingContactName || billingContactEmail || billingContactPhone ||
  billingStreet || billingCity || billingPostalCode || billingCountry
);

// Per-field fallback to shipping (design.md): omit billing_address entirely
// when same-as-shipping is checked (Shopify defaults to shipping) or when
// the customer left the whole billing section blank.
const billingAddress = (!billingSameAsShipping && anyBillingFieldFilled)
  ? buildAddress(
      billingStreet || shippingStreet,
      billingCity || shippingCity,
      billingPostalCode || shippingPostalCode,
      billingCountry || shippingCountry,
      billingContactName || shippingContactName,
      billingContactPhone || shippingPhone
    )
  : null;

const noteLines = [];
if (rec['PO reference number']) noteLines.push(`PO reference: ${rec['PO reference number']}`);
if (rec['VAT number']) noteLines.push(`VAT number: ${rec['VAT number']}`);
// Shopify draft orders have no billing-email field, so it's surfaced here.
if (billingContactEmail) noteLines.push(`Billing email: ${billingContactEmail}`);
// Shopify draft orders have no cost-center field either; the customer's own
// purchase order instructs invoices to reference it, so it needs to survive here.
if (rec['Cost center']) noteLines.push(`Cost center: ${rec['Cost center']}`);

// Shopify's draft order API rejects a draft order with zero line items
// ("Add at least 1 product") — this is a platform-level validation, not
// a REST-only quirk. A single custom (non-product) line item satisfies
// it without actually selecting a product; sales replaces/removes it
// when adding the real line items, per design.md's non-goal.
const draftOrder = {
  tags: 'Order Intake',
  line_items: [{ title: 'Line items to be added by sales', price: '0.00', quantity: 1 }],
};
if (rec['Orderer email']) draftOrder.email = rec['Orderer email'];
if (rec['Shopify Customer ID']) draftOrder.customer = { id: Number(rec['Shopify Customer ID']) };
if (shippingAddress) draftOrder.shipping_address = shippingAddress;
if (billingAddress) draftOrder.billing_address = billingAddress;
if (noteLines.length) draftOrder.note = noteLines.join('\n');

return [{
  json: {
    recordId: rec.id,
    draftOrder,
  },
}];