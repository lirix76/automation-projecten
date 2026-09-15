// n8n-workflow: gather-info-for-order-intake
// n8n-node: No HubSpot contact
return [{ json: { ...$json, hubspotCompanyId: null } }];