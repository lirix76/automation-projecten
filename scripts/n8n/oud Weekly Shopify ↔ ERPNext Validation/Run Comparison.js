// n8n-workflow: oud Weekly Shopify ↔ ERPNext Validation
// n8n-node: Run Comparison
/**
 * n8n Code Node — Wekelijkse Validatie Logic
 *
 * ⚠️ Pas de node-namen en URLs hieronder aan naar jouw situatie!
 */

// ══════════════════════════════════════════════════════════════
// CONFIGURATIE
// ══════════════════════════════════════════════════════════════
const NODE_NAME_SHOPIFY = "Get many orders";
const NODE_NAME_SO = "Get SO Details";
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
const erpSalesOrders = $(NODE_NAME_SO).all().map(i => {
  const item = i.json;
  return item.data || item;
});

const erpDeliveryNotes = $(NODE_NAME_DN).all().map(i => {
  const item = i.json;
  return item.data || item;
});

const issues = [];
const mismatchList = []; 

// ── 2. Bouw lookups ──

const soMap = {};
erpSalesOrders.forEach(so => {
  if (so && so.shopify_order_number) {
    soMap[so.shopify_order_number] = so;
  }
});

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

  // === A. SALES ORDER CHECK ===
  const so = soMap[name];
  if (!so) {
    orderIssues.push("Sales Order ontbreekt in ERPNext");
  } else {
    const soLink = `${ERPNEXT_URL}/app/sales-order/${so.name}`;

    if (so.docstatus !== 1) {
      orderIssues.push(`SO <${soLink}|${so.name}> is niet submitted (docstatus=${so.docstatus})`);
    }

    // Item check
    const shopifyItems = order.line_items || [];
    const erpItems = so.items || [];

    const shopifySKUs = {};
    shopifyItems.forEach(li => {
      const sku = li.sku || li.title || "";
      if (sku) {
        if (!shopifySKUs[sku]) shopifySKUs[sku] = { qty: 0, price: 0 };
        shopifySKUs[sku].qty += (li.quantity || 1);
        shopifySKUs[sku].price = parseFloat(li.price || 0);
      }
    });

    const erpSKUs = {};
    erpItems.forEach(ei => {
      const ic = ei.item_code || "";
      if (ic) {
        if (!erpSKUs[ic]) erpSKUs[ic] = { qty: 0, rate: 0 };
        erpSKUs[ic].qty += ei.qty;
        erpSKUs[ic].rate = ei.rate || 0;
      }
    });

    Object.keys(shopifySKUs).forEach(sku => {
      if (!(sku in erpSKUs)) {
        orderIssues.push(`SO <${soLink}|${so.name}>: SKU ${sku} ontbreekt`);
      } else {
        const s = shopifySKUs[sku];
        const e = erpSKUs[sku];
        if (e.qty !== s.qty) {
          orderIssues.push(`SO <${soLink}|${so.name}>: SKU ${sku} aantal matcht niet (Shopify=${s.qty}, ERPNext=${e.qty})`);
        }
        if (Math.abs(e.rate - s.price) > 0.01) {
          orderIssues.push(`SO <${soLink}|${so.name}>: SKU ${sku} prijsverschil (Shopify=€${s.price.toFixed(2)}, ERPNext=€${e.rate.toFixed(2)})`);
        }
      }
    });

    Object.keys(erpSKUs).forEach(ic => {
      if (!(ic in shopifySKUs)) {
        orderIssues.push(`SO <${soLink}|${so.name}>: SKU ${ic} staat in ERPNext maar niet in Shopify`);
      }
    });
  }

  // === B. DELIVERY NOTE CHECK ===
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
    issues.push(`⚠️ *<${shopifyLink}|${name}>*:\n  • ${finalOrderIssues.join("\n  • ")}`);

    let erpSoLink = "";
    if (so && so.name) erpSoLink = `${ERPNEXT_URL}/app/sales-order/${so.name}`;

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
      "ERPNext SO link": erpSoLink,
      "ERPNext DN link": erpDnLinks,
      "foutmelding": airtableFoutmelding
    });
  }
});

// ── 4. Output ──

const hasMismatches = issues.length > 0;
let report = "";

if (hasMismatches) {
  report = `📊 *Wekelijkse Validatie Shopify ↔ ERPNext*\n${shopifyOrders.length} orders gecontroleerd, ${issues.length} met problemen:\n\n${issues.join("\n\n")}`;
}

return [
  {
    json: {
      report,
      hasMismatches,
      issueCount: issues.length,
      ordersChecked: shopifyOrders.length,
      mismatchList: mismatchList
    }
  }
];
