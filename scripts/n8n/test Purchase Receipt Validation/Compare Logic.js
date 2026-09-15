// n8n-workflow: test Purchase Receipt Validation
// n8n-node: Compare Logic
// Vernieuwde Compare Logic - Match op PO Nummer en PR Naam
const airtableItems = $('Get Processed Deliveries').all().map(i => i.json);
const erpNextResponse = $('Get ERPNext PRs').first().json;
const erpItems = erpNextResponse.data || (Array.isArray(erpNextResponse) ? erpNextResponse : []);

// Indexeer ERPNext PRs op basis van hun naam en gekoppelde Purchase Order
const erpMapByPO = {};
const erpMapByName = {};

erpItems.forEach(item => {
  // 1. Indexeer op PR naam (bijv. "PR-0001")
  if (item.name) {
    erpMapByName[String(item.name).trim().toLowerCase()] = item;
  }
  
  // 2. Indexeer op PO nummer (als het op het hoofdniveau staat)
  if (item.purchase_order) {
    erpMapByPO[String(item.purchase_order).trim().toLowerCase()] = item;
  }
  
  // 3. Indexeer op PO nummer (als het in de 'items' tabel van de PR staat - standaard in ERPNext)
  if (item.items && Array.isArray(item.items)) {
    item.items.forEach(childItem => {
      if (childItem.purchase_order) {
        erpMapByPO[String(childItem.purchase_order).trim().toLowerCase()] = item;
      }
    });
  }
});

const mismatches = [];
const erpnextBaseUrl = "https://picoo.frappe.cloud";

airtableItems.forEach(item => {
  const fields = item.fields || item;
  
  // --- PO Nummer uit Airtable halen ---
  const poNummerRaw = fields["PO nummer (from Purchase Order)"] || fields["Purchase Order"] || fields["PO nummer"] || "";
  // Zorg ervoor dat we de tekst uit een array halen als dat nodig is
  const poNummer = Array.isArray(poNummerRaw) ? String(poNummerRaw[0]) : String(poNummerRaw);
  const poNummerClean = poNummer.trim().toLowerCase();
  
  // --- PR Nummer uit Airtable halen (indien aanwezig) ---
  const prNameRaw = fields.erpnext_id || "";
  const prName = Array.isArray(prNameRaw) ? String(prNameRaw[0]) : String(prNameRaw);
  const prNameClean = prName.trim().toLowerCase();
  
  // --- Datum zoeken ---
  let datum = fields["Datum ontvangst"] || fields["Datum"] || fields["datum"] || "";
  if (!datum) {
    const dateField = Object.keys(fields).find(key => /^\d{4}-\d{2}-\d{2}/.test(String(fields[key])));
    if (dateField) datum = fields[dateField];
  }
  
  // --- CONTROLE: Bestaat er een PR in ERPNext? ---
  // We zoeken eerst of de specifieke PR-naam bestaat. Zo niet, dan zoeken we op het PO-nummer.
  let erpPR = null;
  if (prNameClean && erpMapByName[prNameClean]) {
    erpPR = erpMapByName[prNameClean];
  } else if (poNummerClean && erpMapByPO[poNummerClean]) {
    erpPR = erpMapByPO[poNummerClean];
  }
  
  const idToLog = prName || poNummer || fields.Name || "Onbekend";

  // Als we geen match hebben (geen erpPR) én we hadden wel een PO nummer om op te zoeken:
  if (!erpPR && poNummerClean) {
    mismatches.push({
      id: idToLog,
      poNummer: poNummer,
      date: datum,
      error: `Geen Purchase Receipt gevonden in ERPNext voor PO "${poNummer}"`,
      airtableLink: `https://airtable.com/appiy9Q63eyvnPG9q/tbl8pS8X8pS8X8pS8/${item.id || fields.id}`,
      poLink: poNummer ? `${erpnextBaseUrl}/app/purchase-order/${poNummer}` : "",
      prLink: prName ? `${erpnextBaseUrl}/app/purchase-receipt/${prName}` : ""
    });
  }
});

// Stuur de lijst met niet-gevonden items terug in de structuur die n8n vereist
return mismatches.map(m => ({ json: m }));