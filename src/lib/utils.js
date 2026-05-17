/* ═══════════════════════════════════════════════════════
   IMG Pricing v4 — Utils (copied from v2, do NOT modify logic)
   ═══════════════════════════════════════════════════════ */

export const VER = "4.0";

// ── Theme ──
export const T = {
  bg: "#0a0e1a", sf: "#111827", sa: "#1a2235", bd: "#1e2a3f", bh: "#2d4a6f",
  p: "#3b82f6", pd: "#2563eb", ac: "#10b981", w: "#f59e0b", dg: "#ef4444",
  tx: "#e2e8f0", tm: "#94a3b8", td: "#64748b"
};

export const css = `@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Outfit:wght@300;400;500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Outfit',sans-serif;background:${T.bg};color:${T.tx}}
::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-thumb{background:${T.bd};border-radius:3px}
input,select,textarea{font-family:'Outfit',sans-serif;background:${T.sa};color:${T.tx};border:1px solid ${T.bd};border-radius:6px;padding:7px 11px;font-size:13px;outline:none;transition:border .2s}
input:focus,select:focus,textarea:focus{border-color:${T.p}}
button{font-family:'Outfit',sans-serif;cursor:pointer;border:none;border-radius:6px;padding:7px 14px;font-size:12.5px;font-weight:500;transition:all .15s}
table{width:100%;border-collapse:collapse;font-size:11.5px}
th{background:${T.sa};color:${T.tm};font-weight:500;text-transform:uppercase;font-size:9.5px;letter-spacing:.4px;padding:7px 8px;text-align:left;position:sticky;top:0;z-index:2;border-bottom:1px solid ${T.bd}}
td{padding:5px 8px;border-bottom:1px solid ${T.bd}}
tr:hover td{background:rgba(59,130,246,.03)}
.m{font-family:'JetBrains Mono',monospace;font-size:11px}
.b{display:inline-block;padding:2px 6px;border-radius:9px;font-size:9.5px;font-weight:600}
.bok{background:rgba(16,185,129,.12);color:#34d399}
.bw{background:rgba(245,158,11,.12);color:#fbbf24}
.bdg{background:rgba(239,68,68,.12);color:#f87171}
.bi{background:rgba(59,130,246,.12);color:#60a5fa}
.bp{background:rgba(168,85,247,.12);color:#c084fc}
.bp2{background:${T.p};color:#fff}.bp2:hover{background:${T.pd}}
.bg2{background:transparent;color:${T.tm};border:1px solid ${T.bd}}.bg2:hover{background:${T.sa}}
.bdel{background:rgba(239,68,68,.1);color:#f87171}.bdel:hover{background:rgba(239,68,68,.2)}
.fade{animation:fadeIn .25s ease}
@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
.toggle{position:relative;width:36px;height:20px;border-radius:10px;cursor:pointer;transition:background .2s}
.toggle::after{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform .2s}
.toggle.on{background:${T.ac}}.toggle.on::after{transform:translateX(16px)}
.toggle.off{background:${T.td}}`;

// ── Utilities ──
export const fmt = (n, d = 2) => n == null ? "--" : "$" + Number(n).toFixed(d);
export const pn = (v) => { if (v == null || v === "") return null; const n = parseFloat(String(v).replace(/[$,]/g, "")); return isNaN(n) ? null : n };
export const SZ_ORD = { "2T": 1, "3T": 2, "4T": 3, "5T": 4, "6T": 5, "XS": 10, "S": 11, "M": 12, "L": 13, "XL": 14, "2XL": 15, "3XL": 16, "4XL": 17, "5XL": 18, "6XL": 19 };
export const szOrd = (s) => { const v = SZ_ORD[s]; if (v) return v; const n = parseFloat(s); return isNaN(n) ? 50 : 30 + n };
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// ── Calculation Engines ──
export function calcTier(oz, tiers) {
  if (!oz || !tiers?.length) return "";
  for (const t of tiers) { if (oz <= t.oz) return t.t }
  return tiers[tiers.length - 1].t + "+";
}

export function calcLabel(oz, tiers, pm) {
  if (!oz || !tiers?.length) return { bld: pm.expSmallest, expE: pm.expSmallest };
  let tr = tiers[tiers.length - 1];
  for (const t of tiers) { if (oz <= t.oz) { tr = t; break } }
  const z = tr.u * (1 + pm.markup);
  const d = Math.max(0, z - pm.expSmallest);
  const ff = d * pm.reweighPct;
  const ee = pm.expSmallest + ff;
  const bl = pm.cheapRate * pm.cheapPrice + (1 - pm.cheapRate) * ee;
  return { z5: z, expE: ee, bld: bl };
}

export function findProduct(P, p, s) {
  const pl = p.toLowerCase().trim(), sl = s.toLowerCase().trim();
  let w = P.find(x => x.product === p && x.size === s);
  if (w) return w;
  w = P.find(x => x.product.toLowerCase().trim() === pl && x.size.toLowerCase().trim() === sl);
  if (w) return w;
  w = P.find(x => (x.product.toLowerCase().trim().includes(pl) || pl.includes(x.product.toLowerCase().trim())) && x.size.toLowerCase().trim() === sl);
  if (w) return w;
  if (p.includes("|")) {
    const b = p.split("|").slice(0, -1).join("|").trim().toLowerCase();
    w = P.find(x => x.product.toLowerCase().trim() === b && x.size.toLowerCase().trim() === sl);
  }
  return w || null;
}

export function findPrices(P, p, s) {
  const pl = p.toLowerCase().trim(), sl = s.toLowerCase().trim();
  let r = P.filter(x => x.product === p && x.size === s);
  if (r.length) return r;
  r = P.filter(x => x.product.toLowerCase().trim() === pl && x.size.toLowerCase().trim() === sl);
  if (r.length) return r;
  r = P.filter(x => (x.product.toLowerCase().trim().includes(pl) || pl.includes(x.product.toLowerCase().trim())) && x.size.toLowerCase().trim() === sl);
  if (r.length) return r;
  if (p.includes("|")) {
    const b = p.split("|").slice(0, -1).join("|").trim().toLowerCase();
    r = P.filter(x => x.product.toLowerCase().trim() === b && x.size.toLowerCase().trim() === sl);
  }
  return r || [];
}

export function getScenarios(prod, sz, side, products, suppliers, prices, params, labelTiers, compPrices, spInfo) {
  const w = findProduct(products, prod, sz);
  if (!w) return [];
  // Use canonical product name from products table for consistent lookups
  const cprod = w.product, csz = w.size;
  const lbl = calcLabel(w.weightOz, labelTiers, params);
  const cheapL = params.cheapPrice;
  const expL = lbl ? lbl.expE : params.expSmallest;
  const bldL = lbl ? lbl.bld : cheapL;
  const sc = [];
  findPrices(prices, cprod, csz).forEach(pr => {
    const sup = suppliers.find(s => s.id === pr.supplierId || s.name === pr.supplierId);
    if (!sup || !sup.active) return;
    const cpSX = pr.totalCost;
    let c2 = 0;
    if (side === "2S") {
      const bk = spInfo?.bkType || "Normal";
      if (bk === "Oversize" && pr.cost2ndOver != null) c2 = pr.cost2ndOver;
      else if (bk === "Custom" && pr.cost2ndCust != null) c2 = pr.cost2ndCust;
      else if (bk === "Sleeve" && pr.cost2ndSleeve != null) c2 = pr.cost2ndSleeve;
      else if (bk === "Oversize" && sup.oversizeFee != null) c2 = (pr.cost2nd || 0) + sup.oversizeFee;
      else if (bk === "Custom" && sup.customFee != null) c2 = (pr.cost2nd || 0) + sup.customFee;
      else if (bk === "Sleeve" && sup.sleeveFee != null) c2 = (pr.cost2nd || 0) + sup.sleeveFee;
      else if (bk === "Sleeve") c2 = pr.cost2nd || 0;
      else c2 = pr.cost2nd || 0;
    }
    if (sup.selfShip) {
      // Use canonical name AND fuzzy match for comp_prices lookup
      let cs = compPrices.find(c => c.comp === sup.name && c.product === cprod && c.size === csz);
      if (!cs) cs = compPrices.find(c => c.comp === sup.name && c.product === prod && c.size === sz);
      if (!cs) { const pl = cprod.toLowerCase().trim(), sl = csz.toLowerCase().trim(); cs = compPrices.find(c => c.comp === sup.name && c.size.toLowerCase().trim() === sl && (c.product.toLowerCase().trim() === pl || c.product.toLowerCase().trim().includes(pl) || pl.includes(c.product.toLowerCase().trim()))) }
      const sl = cs?.shipFirst != null ? cs.shipFirst - (params.a2kDiscount || 0) : 0;
      sc.push({ sup: sup.name, sid: sup.id, lbl: "Self", cost: Math.round((cpSX + c2 + sl) * 100) / 100, pr });
    }
    if (sup.useCheap) sc.push({ sup: sup.name, sid: sup.id, lbl: "Cheap", cost: Math.round((cpSX + c2 + cheapL) * 100) / 100, pr });
    if (sup.useExp) sc.push({ sup: sup.name, sid: sup.id, lbl: "Exp", cost: Math.round((cpSX + c2 + expL) * 100) / 100, pr });
    if (sup.useCheap && sup.useExp) sc.push({ sup: sup.name, sid: sup.id, lbl: "Bld", cost: Math.round((cpSX + c2 + bldL) * 100) / 100, pr });
  });
  sc.sort((a, b) => a.cost - b.cost);
  return sc;
}

// ── Default Params ──
export const DEF_PARAMS = {
  cheapRate: .2, cheapPrice: 1.5, expSmallest: 4.0981, reweighPct: .4,
  minProfit: .7, priceGap: .2, markup: .07, dtgDelta: .5, a2kDiscount: .54,
  minScenarios: 2, vipDiscount: .05,
  categoryShip: {
    "T-shirt all": { s1: 4.99, sa: 1.99 },
    "Sweat/Hoodie": { s1: 7.95, sa: 2.99 },
    "Tumbler 12oz": { s1: 5.25, sa: 3.25 },
    "Tumbler 20oz": { s1: 6, sa: 3.5 },
    "Tumbler 30oz": { s1: 7.5, sa: 3.5 },
    "Tumbler 40oz Printed": { s1: 7, sa: 4 },
    "Tumbler 40oz Engraved": { s1: 11, sa: 3.9 },
    "Poster Small": { s1: 4.99, sa: 1.5 },
    "Poster Medium": { s1: 4.99, sa: 1.5 },
    "Poster Large": { s1: 8.99, sa: 3 },
    "Phone Case": { s1: 4.73, sa: 2 }
  }
};

// ── Router Engine ──
export function routeOneSKU(skuCode, skuImg, products, suppliers, prices, params, labelTiers, compPrices, supStock, routeCfg, prodMap) {
  const raw = skuImg.find(s => s.sku === skuCode);
  if (!raw) return { sup: "UNKNOWN", lbl: "", cost: 0, err: "SKU not found", sk: null, sku: skuCode };
  const sk = { ...raw, product: raw.product || raw.p || "", size: raw.size || raw.z || "", color: raw.color || raw.c || "", printArea: raw.printArea || raw.a || "" };
  const prod = sk.product, sz = sk.size, side = sk.printArea || "One side";
  const is2S = side.toLowerCase().includes("both");
  const sc = getScenarios(prod, sz, is2S ? "2S" : "1S", products, suppliers, prices, params, labelTiers, compPrices);
  if (!sc.length) return { sup: "NO_STOCK", lbl: "", cost: 0, err: "No supplier has pricing", sk, sku: skuCode };
  const mode = routeCfg.labelMode || "BLENDED";
  const filtered = mode === "BLENDED" ? sc : mode === "EXP_ONLY" ? sc.filter(s => s.lbl === "Exp" || s.lbl === "Self" || s.lbl === "Bld") : sc.filter(s => s.lbl === "Cheap" || s.lbl === "Bld" || s.lbl === "Self");
  const active = filtered.filter(s => { const sup = suppliers.find(x => x.name === s.sup); return sup && sup.active });
  if (!active.length) return { sup: sc[0]?.sup || "UNKNOWN", lbl: sc[0]?.lbl || "", cost: sc[0]?.cost || 0, err: "No supplier in mode " + mode, sk, sku: skuCode };
  return { sup: active[0].sup, lbl: active[0].lbl, cost: active[0].cost, err: null, sk, sku: skuCode };
}

// ── Template / Export helpers ──
export function resolveOne(c, row, o) {
  if (c == null || c === -1) return "";
  if (c === -2) return o.supSku || o.sku || "";
  if (c === -3) return ((row[19] || "") + " " + (row[20] || "")).trim();
  if (c === -4) return o.rt?.sk?.product || o.prodName || "";
  if (c === -5) { const n = row[4] || o.prodName || ""; return n.includes("DTG") ? "DTG" : n.includes("DTF") ? "DTF" : n.includes("EMB") ? "EMB" : "" }
  if (c === -10) return o.rt?.sk?.style || o.rt?.sk?.st || "";
  if (c === -11) return o.rt?.sk?.color || o.rt?.sk?.c || "";
  if (c === -12) return o.rt?.sk?.size || o.rt?.sk?.z || "";
  if (typeof c === "string") return c;
  return row[c] || "";
}

export function mapCell(code, row, o) {
  if (code == null || code === -1) return "";
  if (typeof code === "object" && code.t) {
    if (code.t === "fb") { for (const s of code.s) { const v = resolveOne(s, row, o); if (v) return v } return "" }
    if (code.t === "mg") return code.s.map(s => resolveOne(s, row, o)).filter(Boolean).join(code.sep || " | ");
  }
  return resolveOne(code, row, o);
}

// ── Order Header (49 columns) ──
export const ORD_HDR = ["Order Code", "Name Seller", "Email Seller", "Time Create Order", "Name Item IMG", "SKU IMG", "Base Cost IMG", "Ship Cost IMG", "Shipping method IMG", "Status Order", "Supplier", "Seller Note", "Admin Note", "Order Date", "Order ID", "Shipping Address 1", "Shipping Address 2", "City", "Country Code", "Customer First Name", "Customer Last Name", "Customer Email", "Customer Phone Number", "State / Region", "Zip", "Shipping Method", "Shipping Label URL", "TRACKING_ID", "Product Code", "Size", "Color", "Quantity", "Full Design URL", "Front Design URL", "Back Design URL", "Left Sleeve Design URL", "Right Sleeve Design URL", "Special Front Design URL", "Special Back Design URL", "Special Left Sleeve Design URL", "Special Right Sleeve Design URL", "Front Mockup URL", "Back Mockup URL", "Left Sleeve Mockup URL", "Right Sleeve Mockup URL", "Special Front Mockup URL", "Special Back Mockup URL", "Special Left Sleeve Mockup URL", "Special Right Sleeve Mockup URL"];

// ── Source Options for template mapping ──
export const SRC_OPTS = [
  { v: -1, l: "(trống)" }, { v: -2, l: "SKU xưởng" }, { v: -3, l: "Họ tên KH (First+Last)" },
  { v: -4, l: "Ref sản phẩm" }, { v: -5, l: "Tech DTF/DTG/EMB (auto)" },
  { v: -10, l: "Style (SKU IMG)" }, { v: -11, l: "Color (SKU IMG)" }, { v: -12, l: "Size (SKU IMG)" },
  ...ORD_HDR.map((h, i) => ({ v: i, l: h }))
];

// ── SKU Presets per supplier ──
export const SKU_PRESETS = {
  YolCol: { productCol: "Product ", sizeCol: null, colorCol: null, sideCol: "SKU", skuCol: "_SKU_CODE", upper: true, note: "Yoycol: Code|Side → SKU. Cột SKU = side type (Front/Back/Front&Back). Cần rename cột 8 thành _SKU_CODE trước khi import." },
  Zootop: { productCol: "BrandCode", sizeCol: "Size", colorCol: "Color", sideCol: null, skuCol: "SKU", upper: true, note: "ZooTop: BrandCode + Color + Size → SKU" },
  TeaPrint: { productCol: "Product", sizeCol: null, colorCol: "Color name", sideCol: null, skuCol: null, upper: true, note: "TeaPrint: Product + Color → stock verification (không có SKU output)" },
  PrintPoss: { productCol: "Product", sizeCol: null, colorCol: null, sideCol: null, skuCol: "SKU", variantCol: "Variant", upper: true, note: "PrintPoss: Variant → SKU (Phone case)" }
};

// ── Supplier → Template name mapping ──
export const SUP_TMPL_MAP = { Lenful: "Resend", Anprint: "Anprint", Zootop: "ZooTop", YolCol: "YolCol", PrintPoss: "PrintPoss", TeaPrint: "TeaPrint", A2K: "A2K", BurgerPrint: "BurgerPrint" };

// ── Label color helper (used in multiple modules) ──
export const ltColor = (lt) => lt === "Cheap" ? "#fbbf24" : lt === "Self" ? "#f87171" : lt === "Exp" ? "#60a5fa" : "#a78bfa";

// ── Supplier SKU matching (shared logic) ──
export function matchSupplierProduct(imgProduct, supProductCol, supRow) {
  const imgFull = (imgProduct || "").toLowerCase().trim();
  const supProd = (supRow[supProductCol] || "").toLowerCase().trim();
  if (!imgFull || !supProd) return false;
  // Exact match on supplier product within IMG product name
  // "gildan 5000 | dtg" in "classic unisex t-shirt | gildan 5000 | dtg" → YES
  // "gildan 5000 | dtg" in "adult long sleeve t-shirt | gildan 5400 | dtg" → NO
  // "gildan 18000 | dtg" in "unisex blend crewneck sweatshirt | gildan 18000 | dtf" → NO (DTG ≠ DTF)
  return imgFull.includes(supProd) || supProd === imgFull;
}

export function matchPrintArea(skPrintArea, rowSide, sideColValue) {
  if (!sideColValue && !rowSide) return true;
  const side = (sideColValue || rowSide || "").toLowerCase().trim();
  if (!side) return true;
  const area = (skPrintArea || "").toLowerCase();
  const isBoth = area.includes("both");
  if (isBoth) return side.includes("both") || side.includes("front&back") || side.includes("front & back");
  // For one-side, don't filter by front/back at mapping stage (determined at order time)
  return side.includes("front") || side.includes("back") || side.includes("one");
}

// ── Stock verification for routing ──
export function checkStockAvailability(product, size, color, supplierName, stockData) {
  const sd = stockData?.[supplierName];
  if (!sd?.rows?.length) return true; // No stock data = assume available
  const prodLow = (product || "").toLowerCase().trim();
  const sizeLow = (size || "").toUpperCase().trim();
  const colorLow = (color || "").toLowerCase().trim();
  // Extract model numbers from product name (e.g. "5000", "18000", "3001")
  const prodNums = prodLow.match(/\d{3,5}/g) || [];
  const prodTech = prodLow.includes("dtg") ? "dtg" : prodLow.includes("dtf") ? "dtf" : "";
  // Find product column (first column or column named "product")
  const prodCol = sd.hdr?.find(h => h.toLowerCase().includes("product")) || sd.hdr?.[0] || "";
  // First: find rows matching this product
  const productRows = sd.rows.filter(row => {
    const rowProd = (row[prodCol] || Object.values(row)[0] || "").toLowerCase().trim();
    if (!rowProd) return false;
    // Exact or contains match
    if (prodLow.includes(rowProd) || rowProd.includes(prodLow)) return true;
    // Model number + tech match: "G18000-DTG" matches "Gildan 18000 | DTG"
    const rowNums = rowProd.match(/\d{3,5}/g) || [];
    const rowTech = rowProd.includes("dtg") ? "dtg" : rowProd.includes("dtf") ? "dtf" : "";
    if (prodNums.length > 0 && rowNums.length > 0 && prodNums.some(n => rowNums.includes(n)) && prodTech === rowTech) return true;
    return false;
  });
  // If no product rows found in stock → supplier doesn't list this product → skip supplier
  if (productRows.length === 0) return false;
  // Check size availability
  const szCol = sd.hdr?.find(h => h.toLowerCase().includes("size")) || "";
  if (szCol && sizeLow) {
    const sizeRows = productRows.filter(row => {
      const rowSz = (row[szCol] || "").toUpperCase().trim();
      if (!rowSz) return true; // No size specified = all sizes
      const sizes = rowSz.split(",").map(s => s.trim());
      return sizes.includes(sizeLow);
    });
    if (sizeRows.length === 0) return false;
    // Check color availability
    const colCol = sd.hdr?.find(h => h.toLowerCase().includes("color") || h.toLowerCase().includes("màu")) || "";
    if (colCol && colorLow) {
      const colorRows = sizeRows.filter(row => {
        const rowCol = (row[colCol] || "").toLowerCase().trim();
        if (!rowCol) return true; // No color specified = all colors
        return rowCol.includes(colorLow) || colorLow.includes(rowCol);
      });
      return colorRows.length > 0;
    }
    return true;
  }
  return true;
}
