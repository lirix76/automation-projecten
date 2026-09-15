// n8n-workflow: gather-info-for-order-intake
// n8n-node: Extract contact id
const prev = $('Join Airtable customer branch').first().json;
const res = $input.first().json;
const results = (res && res.results) || [];
const contact = results[0] || null;
const searchError = (res && (res.error || res.status === 'error')) ? `HubSpot contact search error: ${JSON.stringify(res).slice(0, 300)}` : null;

return [{
  json: {
    ...prev,
    hubspotContactId: contact ? contact.id : null,
    errors: [...prev.errors, ...(searchError ? [searchError] : [])],
  },
}];