// n8n-workflow: Weekly Shopify ↔ ERPNext Validation
// n8n-node: Calculate From Date
const input = $input.first().json;
const now = new Date();

// Gebruik handmatige datums uit de config indien ingevuld
let fDate = input.manualStartDate || "";
let tDate = input.manualEndDate || "";

let fromDate, toDate;

if (fDate) {
  // Handmatige start: begin van die dag
  fromDate = fDate.includes('T') ? fDate : fDate + "T00:00:00Z";
} else {
  // Default: 7 dagen geleden
  fromDate = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString();
}

if (tDate) {
  // Handmatige eind: einde van die dag
  toDate = tDate.includes('T') ? tDate : tDate + "T23:59:59Z";
} else {
  // Default: nu (geen limiet)
  toDate = now.toISOString();
}

return [{ json: { fromDate, toDate, isManual: !!fDate } }];