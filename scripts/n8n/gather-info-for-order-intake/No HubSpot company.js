// n8n-workflow: gather-info-for-order-intake
// n8n-node: No HubSpot company
return [{ json: { ...$json, hubspotCompany: null } }];