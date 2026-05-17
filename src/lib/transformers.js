/* ═══════════════════════════════════════════════════════
   Transformers: snake_case (DB) ↔ camelCase (React)
   One pair per table. Add new tables here.
   ═══════════════════════════════════════════════════════ */

// ── profiles ──
export const profileFromDb = (r) => ({
  id: r.id, email: r.email, fullName: r.full_name, role: r.role,
  createdAt: r.created_at, updatedAt: r.updated_at,
});
export const profileToDb = (r) => ({
  ...(r.email !== undefined && { email: r.email }),
  ...(r.fullName !== undefined && { full_name: r.fullName }),
  ...(r.role !== undefined && { role: r.role }),
});

// ── products ──
export const productFromDb = (r) => ({
  id: r.id, brand: r.brand, product: r.product, size: r.size,
  category: r.category, weightLbs: Number(r.weight_lbs) || 0,
  weightOz: Number(r.weight_oz) || 0, source: r.source || "REAL",
  createdAt: r.created_at, updatedAt: r.updated_at,
});
export const productToDb = (r) => ({
  ...(r.brand !== undefined && { brand: r.brand }),
  ...(r.product !== undefined && { product: r.product }),
  ...(r.size !== undefined && { size: r.size }),
  ...(r.category !== undefined && { category: r.category }),
  ...(r.weightLbs !== undefined && { weight_lbs: r.weightLbs }),
  ...(r.weightOz !== undefined && { weight_oz: r.weightOz }),
  ...(r.source !== undefined && { source: r.source }),
});

// ── suppliers ──
export const supplierFromDb = (r) => ({
  id: r.id, name: r.name, handling: Number(r.handling) || 0,
  useCheap: Number(r.use_cheap) || 0, useExp: Number(r.use_exp) || 0,
  selfShip: Number(r.self_ship) || 0,
  oversizeFee: r.oversize_fee != null ? Number(r.oversize_fee) : null,
  customFee: r.custom_fee != null ? Number(r.custom_fee) : null,
  sleeveFee: r.sleeve_fee != null ? Number(r.sleeve_fee) : null,
  api: Number(r.api) || 0,
  warehouseAddr: r.warehouse_addr || "", warehouseCity: r.warehouse_city || "",
  warehouseState: r.warehouse_state || "", warehouseZip: r.warehouse_zip || "",
  note: r.note || "", active: r.active !== false,
  createdAt: r.created_at, updatedAt: r.updated_at,
});
export const supplierToDb = (r) => ({
  ...(r.name !== undefined && { name: r.name }),
  ...(r.handling !== undefined && { handling: r.handling }),
  ...(r.useCheap !== undefined && { use_cheap: r.useCheap }),
  ...(r.useExp !== undefined && { use_exp: r.useExp }),
  ...(r.selfShip !== undefined && { self_ship: r.selfShip }),
  ...(r.oversizeFee !== undefined && { oversize_fee: r.oversizeFee }),
  ...(r.customFee !== undefined && { custom_fee: r.customFee }),
  ...(r.sleeveFee !== undefined && { sleeve_fee: r.sleeveFee }),
  ...(r.api !== undefined && { api: r.api }),
  ...(r.warehouseAddr !== undefined && { warehouse_addr: r.warehouseAddr }),
  ...(r.warehouseCity !== undefined && { warehouse_city: r.warehouseCity }),
  ...(r.warehouseState !== undefined && { warehouse_state: r.warehouseState }),
  ...(r.warehouseZip !== undefined && { warehouse_zip: r.warehouseZip }),
  ...(r.note !== undefined && { note: r.note }),
  ...(r.active !== undefined && { active: r.active }),
});

// ── prices ──
export const priceFromDb = (r) => ({
  id: r.id, supplierId: r.supplier_id, product: r.product, size: r.size,
  baseCost: Number(r.base_cost) || 0, handlingFee: Number(r.handling_fee) || 0,
  totalCost: Number(r.total_cost) || 0,
  cost2nd: r.cost_2nd != null ? Number(r.cost_2nd) : null,
  cost2ndOver: r.cost_2nd_over != null ? Number(r.cost_2nd_over) : null,
  cost2ndCust: r.cost_2nd_cust != null ? Number(r.cost_2nd_cust) : null,
  cost2ndSleeve: r.cost_2nd_sleeve != null ? Number(r.cost_2nd_sleeve) : null,
  active: r.active !== false,
  createdAt: r.created_at, updatedAt: r.updated_at,
});
export const priceToDb = (r) => ({
  ...(r.supplierId !== undefined && { supplier_id: r.supplierId }),
  ...(r.product !== undefined && { product: r.product }),
  ...(r.size !== undefined && { size: r.size }),
  ...(r.baseCost !== undefined && { base_cost: r.baseCost }),
  ...(r.handlingFee !== undefined && { handling_fee: r.handlingFee }),
  ...(r.totalCost !== undefined && { total_cost: r.totalCost }),
  ...(r.cost2nd !== undefined && { cost_2nd: r.cost2nd }),
  ...(r.cost2ndOver !== undefined && { cost_2nd_over: r.cost2ndOver }),
  ...(r.cost2ndCust !== undefined && { cost_2nd_cust: r.cost2ndCust }),
  ...(r.cost2ndSleeve !== undefined && { cost_2nd_sleeve: r.cost2ndSleeve }),
  ...(r.active !== undefined && { active: r.active }),
});

// ── comp_prices ──
export const compPriceFromDb = (r) => ({
  id: r.id, comp: r.competitor, product: r.product, size: r.size,
  priceItem: r.price_item != null ? Number(r.price_item) : null,
  price2nd: r.price_2nd != null ? Number(r.price_2nd) : null,
  shipFirst: r.ship_first != null ? Number(r.ship_first) : null,
  shipAdd: r.ship_add != null ? Number(r.ship_add) : null,
  total: r.total != null ? Number(r.total) : null,
  createdAt: r.created_at, updatedAt: r.updated_at,
});
export const compPriceToDb = (r) => ({
  ...(r.comp !== undefined && { competitor: r.comp }),
  ...(r.product !== undefined && { product: r.product }),
  ...(r.size !== undefined && { size: r.size }),
  ...(r.priceItem !== undefined && { price_item: r.priceItem }),
  ...(r.price2nd !== undefined && { price_2nd: r.price2nd }),
  ...(r.shipFirst !== undefined && { ship_first: r.shipFirst }),
  ...(r.shipAdd !== undefined && { ship_add: r.shipAdd }),
  ...(r.total !== undefined && { total: r.total }),
});

// ── params (key-value, special handling) ──
export const paramFromDb = (r) => ({
  key: r.key, value: r.value, description: r.description || "",
});
export const paramToDb = (r) => ({
  key: r.key, value: r.value,
  ...(r.description !== undefined && { description: r.description }),
});

// ── label_tiers ──
export const labelTierFromDb = (r) => ({
  id: r.id, t: r.tier_name, oz: Number(r.weight_oz) || 0,
  u: Number(r.zone5_price) || 0, sortOrder: r.sort_order || 0,
});
export const labelTierToDb = (r) => ({
  ...(r.t !== undefined && { tier_name: r.t }),
  ...(r.oz !== undefined && { weight_oz: r.oz }),
  ...(r.u !== undefined && { zone5_price: r.u }),
  ...(r.sortOrder !== undefined && { sort_order: r.sortOrder }),
});

// ── locked_prices ──
export const lockedPriceFromDb = (r) => ({
  id: r.id, product: r.product, size: r.size,
  lockedValue: r.locked_value,
  lockedBy: r.locked_by, updatedAt: r.updated_at,
});
export const lockedPriceToDb = (r) => ({
  ...(r.product !== undefined && { product: r.product }),
  ...(r.size !== undefined && { size: r.size }),
  ...(r.lockedValue !== undefined && { locked_value: r.lockedValue }),
  ...(r.lockedBy !== undefined && { locked_by: r.lockedBy }),
});

// ── sku_img ──
export const skuImgFromDb = (r) => ({
  id: r.id, sku: r.sku, product: r.product || "", size: r.size || "",
  color: r.color || "", printArea: r.print_area || "", tech: r.tech || "",
  style: r.style || "", front: r.front || "", back: r.back || "",
  supplier: r.supplier || "", supSku: r.sup_sku || "",
  status: r.status || "✅ OK",
  createdAt: r.created_at, updatedAt: r.updated_at,
});
export const skuImgToDb = (r) => ({
  ...(r.sku !== undefined && { sku: r.sku }),
  ...(r.product !== undefined && { product: r.product }),
  ...(r.size !== undefined && { size: r.size }),
  ...(r.color !== undefined && { color: r.color }),
  ...(r.printArea !== undefined && { print_area: r.printArea }),
  ...(r.tech !== undefined && { tech: r.tech }),
  ...(r.style !== undefined && { style: r.style }),
  ...(r.front !== undefined && { front: r.front }),
  ...(r.back !== undefined && { back: r.back }),
  ...(r.supplier !== undefined && { supplier: r.supplier }),
  ...(r.supSku !== undefined && { sup_sku: r.supSku }),
  ...(r.status !== undefined && { status: r.status }),
});

// ── sup_stock (composite PK) ──
export const supStockFromDb = (r) => ({
  supplierId: r.supplier_id, sku: r.sku,
  stock: r.stock, updatedAt: r.updated_at,
});
export const supStockToDb = (r) => ({
  ...(r.supplierId !== undefined && { supplier_id: r.supplierId }),
  ...(r.sku !== undefined && { sku: r.sku }),
  ...(r.stock !== undefined && { stock: r.stock }),
});

// ── route_cfg (singleton id=1) ──
export const routeCfgFromDb = (r) => ({
  id: r.id, labelMode: r.label_mode || "BLENDED",
  apiSups: r.api_sups || [], tpls: r.tpls || {},
  skuResolvers: r.sku_resolvers || {},
  stockData: r.stock_data || {},
  updatedAt: r.updated_at,
});
export const routeCfgToDb = (r) => ({
  ...(r.labelMode !== undefined && { label_mode: r.labelMode }),
  ...(r.apiSups !== undefined && { api_sups: r.apiSups }),
  ...(r.tpls !== undefined && { tpls: r.tpls }),
  ...(r.skuResolvers !== undefined && { sku_resolvers: r.skuResolvers }),
  ...(r.stockData !== undefined && { stock_data: r.stockData }),
});

// ── prod_map ──
export const prodMapFromDb = (r) => ({
  productImg: r.product_img, yoycol: r.yoycol || "",
  zootop: r.zootop || "", teaprint: r.teaprint || "",
  printposs: r.printposs || "", updatedAt: r.updated_at,
});
export const prodMapToDb = (r) => ({
  ...(r.productImg !== undefined && { product_img: r.productImg }),
  ...(r.yoycol !== undefined && { yoycol: r.yoycol }),
  ...(r.zootop !== undefined && { zootop: r.zootop }),
  ...(r.teaprint !== undefined && { teaprint: r.teaprint }),
  ...(r.printposs !== undefined && { printposs: r.printposs }),
});

// ── warehouse_notes ──
export const whNoteFromDb = (r) => ({
  id: r.id, supplier: r.supplier, product: r.product || "ALL",
  noteType: r.note_type || "GENERAL",
  warehouseOverride: r.warehouse_override || "",
  note: r.note || "",
  createdAt: r.created_at, updatedAt: r.updated_at,
});
export const whNoteToDb = (r) => ({
  ...(r.supplier !== undefined && { supplier: r.supplier }),
  ...(r.product !== undefined && { product: r.product }),
  ...(r.noteType !== undefined && { note_type: r.noteType }),
  ...(r.warehouseOverride !== undefined && { warehouse_override: r.warehouseOverride }),
  ...(r.note !== undefined && { note: r.note }),
});
