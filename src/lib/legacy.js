/* ═══════════════════════════════════════════════════════
   BẢN SAO NGUYÊN VĂN của thuật toán cũ — chỉ dùng để ĐỐI CHIẾU.

   File này KHÔNG được dùng ở bất kỳ màn hình nào. Nó tồn tại để công cụ
   đối chiếu (verify.js) chạy song song "cách cũ" và "cách mới" trên chính
   dữ liệu thật của bạn, rồi so từng kết quả một.

   Khi đã xác nhận 0 điểm lệch, có thể xoá file này cùng verify.js.

   TUYỆT ĐỐI KHÔNG SỬA LOGIC TRONG FILE NÀY.
   Chép y nguyên từ utils.js (bản trước khi tối ưu).
   ═══════════════════════════════════════════════════════ */

import { calcLabel } from "./utils";

const normP = s => (s || "").toLowerCase().trim().replace(/\s*-\s*/g, "-").replace(/\s+/g, " ");

export function findProductLegacy(P, p, s) {
  const pl = normP(p), sl = s.toLowerCase().trim();
  let w = P.find(x => x.product === p && x.size === s);
  if (w) return w;
  w = P.find(x => normP(x.product) === pl && x.size.toLowerCase().trim() === sl);
  if (w) return w;
  w = P.find(x => (normP(x.product).includes(pl) || pl.includes(normP(x.product))) && x.size.toLowerCase().trim() === sl);
  if (w) return w;
  if (p.includes("|")) {
    const b = normP(p.split("|").slice(0, -1).join("|"));
    w = P.find(x => normP(x.product) === b && x.size.toLowerCase().trim() === sl);
  }
  return w || null;
}

export function findPricesLegacy(P, p, s) {
  const pl = normP(p), sl = s.toLowerCase().trim();
  let r = P.filter(x => x.product === p && x.size === s);
  if (r.length) return r;
  r = P.filter(x => normP(x.product) === pl && x.size.toLowerCase().trim() === sl);
  if (r.length) return r;
  r = P.filter(x => (normP(x.product).includes(pl) || pl.includes(normP(x.product))) && x.size.toLowerCase().trim() === sl);
  if (r.length) return r;
  if (p.includes("|")) {
    const b = normP(p.split("|").slice(0, -1).join("|"));
    r = P.filter(x => normP(x.product) === b && x.size.toLowerCase().trim() === sl);
  }
  return r || [];
}

export function getScenariosLegacy(prod, sz, side, products, suppliers, prices, params, labelTiers, compPrices, spInfo) {
  const w = findProductLegacy(products, prod, sz);
  if (!w) return [];
  const cprod = w.product, csz = w.size;
  const lbl = calcLabel(w.weightOz, labelTiers, params);
  const cheapL = params.cheapPrice;
  const expL = lbl ? lbl.expE : params.expSmallest;
  const bldL = lbl ? lbl.bld : cheapL;
  const sc = [];
  findPricesLegacy(prices, cprod, csz).forEach(pr => {
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

export function routeOneSKULegacy(skuCode, skuImg, products, suppliers, prices, params, labelTiers, compPrices, supStock, routeCfg, prodMap) {
  const raw = skuImg.find(s => s.sku === skuCode);
  if (!raw) return { sup: "UNKNOWN", lbl: "", cost: 0, err: "SKU not found", sk: null, sku: skuCode };
  const sk = { ...raw, product: raw.product || raw.p || "", size: raw.size || raw.z || "", color: raw.color || raw.c || "", printArea: raw.printArea || raw.a || "" };
  const prod = sk.product, sz = sk.size, side = sk.printArea || "One side";
  const is2S = side.toLowerCase().includes("both");
  const sc = getScenariosLegacy(prod, sz, is2S ? "2S" : "1S", products, suppliers, prices, params, labelTiers, compPrices);
  if (!sc.length) return { sup: "NO_STOCK", lbl: "", cost: 0, err: "No supplier has pricing", sk, sku: skuCode };
  const mode = routeCfg.labelMode || "BLENDED";
  const filtered = mode === "BLENDED" ? sc : mode === "EXP_ONLY" ? sc.filter(s => s.lbl === "Exp" || s.lbl === "Self" || s.lbl === "Bld") : sc.filter(s => s.lbl === "Cheap" || s.lbl === "Bld" || s.lbl === "Self");
  const active = filtered.filter(s => { const sup = suppliers.find(x => x.name === s.sup); return sup && sup.active });
  if (!active.length) return { sup: sc[0]?.sup || "UNKNOWN", lbl: sc[0]?.lbl || "", cost: sc[0]?.cost || 0, err: "No supplier in mode " + mode, sk, sku: skuCode };
  return { sup: active[0].sup, lbl: active[0].lbl, cost: active[0].cost, err: null, sk, sku: skuCode };
}
