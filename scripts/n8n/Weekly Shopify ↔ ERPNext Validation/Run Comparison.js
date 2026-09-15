// n8n-workflow: Weekly Shopify ↔ ERPNext Validation
// n8n-node: Run Comparison

const NODE_NAME_SHOPIFY = "Get many orders";
const NODE_NAME_DN = "Get DN Details";
const NODE_NAME_AIRTABLE_ERRORS = "Get Existing Errors"; // NAAM VAN JE AIRTABLE NODE

const SHOPIFY_STORE_URL = "https://admin.shopify.com/store/play-picoo"; // Pas aan!
const ERPNEXT_URL = "https://picoo.frappe.cloud";
// ══════════════════════════════════════════════════════════════

// ── 1. Haal data op ──

const rawShopifyItems = $(NODE_NAME_SHOPIFY).all().map(i => i.json);

// Haal bestaande fouten op uit Airtable (zodat we niet dubbel rapporteren)
let existingErrors = [];
try {
  // We halen de ID en de foutmelding op om specifiek te kunnen matchen
  // De kolom in Airtable heet "ID Shopify/ERPNext/Partnumber"
  existingErrors = $(NODE_NAME_AIRTABLE_ERRORS).all().map(i => {
    const id = i.json["ID Shopify/ERPNext/Partnumber"] || "";
    const msg = i.json["Foutmelding"] || "";
    return `${id}|${msg}`;
  });
} catch (e) {
  // Als de node nog niet bestaat of faalt, negeren we dit en checken we alles
}

// Shopify native node geeft elke order meerdere keren terug.
const orderMap = {};
rawShopifyItems.forEach(item => {
  const name = item.name || ("#" + item.order_number) || ("#" + item.id) || "";
  if (!name) return;

  if (!orderMap[name]) {
    orderMap[name] = {
      ...item,
      name: name,
      id: item.id,
      line_items: item.line_items || [],
      fulfillments: item.fulfillments || []
    };
  }
});

const shopifyOrders = Object.values(orderMap);

// ERPNext
const erpDeliveryNotes = $(NODE_NAME_DN).all().map(i => {
  const item = i.json;
  return item.data || item;
});

const mismatchList = [];

// ── 2. Bouw lookups ──

const dnMap = {};
erpDeliveryNotes.forEach(dn => {
  if (!dn) return;
  const key = dn.shopify_order_number || "";
  if (!dnMap[key]) dnMap[key] = [];
  dnMap[key].push(dn);
});

// ── 3. Per Shopify order vergelijken ──

shopifyOrders.forEach(order => {
  const name = order.name || "";
  if (!name) return;

  const orderIssues = [];

  // === DELIVERY NOTE CHECK ===
  const fulfillments = order.fulfillments || [];
  let matchingDNs = [];

  if (fulfillments.length > 0) {
    Object.keys(dnMap).forEach(key => {
      if (key === name || key.startsWith(`${name}-`)) {
        matchingDNs.push(...dnMap[key]);
      }
    });

    if (matchingDNs.length === 0) {
      orderIssues.push("Order fulfilled in Shopify, maar 0 Delivery Notes in ERPNext");
    } else if (matchingDNs.length < fulfillments.length) {
      orderIssues.push(`Shopify: ${fulfillments.length} fulfillments, ERPNext: ${matchingDNs.length} DNs`);
    }

    matchingDNs.forEach(dn => {
      const dnLink = `${ERPNEXT_URL}/app/delivery-note/${dn.name}`;
      if (dn.docstatus !== 1) {
        orderIssues.push(`DN <${dnLink}|${dn.name}> is niet submitted`);
      }

      // Check prices on DN as well
      const dnItems = dn.items || [];
      const sItems = order.line_items || [];
      dnItems.forEach(di => {
        const msi = sItems.find(si => (si.sku || si.title) === di.item_code);
        if (msi) {
          const sp = parseFloat(msi.price || 0);
          if (Math.abs((di.rate || 0) - sp) > 0.01) {
            orderIssues.push(`DN <${dnLink}|${dn.name}>: SKU ${di.item_code} prijsverschil (Shopify=€${sp.toFixed(2)}, ERPNext=€${(di.rate || 0).toFixed(2)})`);
          }
        }
      });
    });
  }

  // Filter issues die al in Airtable staan
  const finalOrderIssues = orderIssues.filter(msg => {
    const cleanMsg = msg.replace(/<[^|]+\|([^>]+)>/g, '$1');
    return !existingErrors.includes(`${name}|${cleanMsg}`);
  });

  // Voeg toe aan report en mismatchList
  if (finalOrderIssues.length > 0) {
    const shopifyLink = `${SHOPIFY_STORE_URL}/orders/${order.id}`;



    let erpDnLinks = "";
    if (matchingDNs && matchingDNs.length > 0) {
      erpDnLinks = matchingDNs.map(dn => `${ERPNEXT_URL}/app/delivery-note/${dn.name}`).join(", ");
    } else if (finalOrderIssues.some(msg => msg.includes("0 Delivery Notes"))) {
      erpDnLinks = "Geen DN gevonden";
    }

    const airtableFoutmelding = finalOrderIssues
      .map(msg => msg.replace(/<[^|]+\|([^>]+)>/g, '$1'))
      .join("\n");

    let formattedDate = "";
    if (order.created_at) {
      const d = new Date(order.created_at);
      formattedDate = d.toISOString().split('T')[0];
    }

    mismatchList.push({
      "shopify order ID": name,
      "shopify order datum": formattedDate,
      "shopify order link": shopifyLink,
      "shopify flow link": `https://admin.shopify.com/store/play-picoo/apps/flow/activity?query=${order.id}`,
      "ERPNext DN link": erpDnLinks,
      "foutmelding": airtableFoutmelding
    });
  }
});

// ── 4. Output ──

const hasMismatches = mismatchList.length > 0;

return [
  {
    json: {
      hasMismatches,
      issueCount: mismatchList.length,
      ordersChecked: shopifyOrders.length,
      mismatchList: mismatchList
    }
  }
];
