// n8n-workflow: gather-info-for-order-intake
// n8n-node: Extract company id
const prev = $('Extract contact id').first().json;
const res = $input.first().json;
const assoc = res && res.associations && res.associations.companies && res.associations.companies.results;
const companyId = (assoc && assoc[0] && assoc[0].id) || null;
const assocError = (res && res.error) ? `HubSpot associations error: ${JSON.stringify(res).slice(0, 300)}` : null;

return [{
  json: {
    ...prev,
    hubspotCompanyId: companyId,
    errors: [...prev.errors, ...(assocError ? [assocError] : [])],
  },
}];