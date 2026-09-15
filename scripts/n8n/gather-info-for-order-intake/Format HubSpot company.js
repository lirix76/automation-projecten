// n8n-workflow: gather-info-for-order-intake
// n8n-node: Format HubSpot company
const prev = $('Join contact branch').first().json;
const res = $input.first().json;
const p = (res && res.properties) || {};
const companyError = (res && res.error) ? `HubSpot company fetch error: ${JSON.stringify(res).slice(0, 300)}` : null;
const hubspotCompany = (res && res.id) ? {
  companyName: p.name || null,
  street: [p.address, p.address2].filter(Boolean).join(' ') || null,
  city: p.city || null,
  postalCode: p.zip || null,
  country: p.country || null,
} : null;

return [{
  json: {
    ...prev,
    hubspotCompany,
    errors: [...prev.errors, ...(companyError ? [companyError] : [])],
  },
}];