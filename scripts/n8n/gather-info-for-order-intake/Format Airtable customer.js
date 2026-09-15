// n8n-workflow: gather-info-for-order-intake
// n8n-node: Format Airtable customer
const prev = $('Parse bestelbon JSON').first().json;
const c = $input.first().json;
const customerError = (c && c.error) ? `Airtable customer fetch error: ${JSON.stringify(c).slice(0, 300)}` : null;
const airtableCustomer = (c && !c.error) ? {
  companyName: c['Company'] || null,
  contactName: [c['First name'], c['Last name']].filter(Boolean).join(' ') || null,
  contactEmail: c['Email'] || null,
  street: c['Address'] || null,
  postalCode: c['Postal code'] || null,
  city: c['City'] || null,
  country: c['Country'] || null,
  vatNumber: c['BTW nummer'] || null,
} : null;

return [{
  json: {
    ...prev,
    airtableCustomer,
    errors: [...(prev.errors || []), ...(customerError ? [customerError] : [])],
  },
}];
