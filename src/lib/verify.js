/* ═══════════════════════════════════════════════════════
   CÔNG CỤ ĐỐI CHIẾU — chạy "cách cũ" và "cách mới" song song
   trên chính dữ liệu thật, rồi so từng kết quả một.

   Cách dùng: mở web rồi thêm  ?verify=1  vào cuối địa chỉ.

   Đây là công cụ TẠM THỜI. Khi đã xác nhận 0 điểm lệch, xoá 3 file:
   lib/verify.js, lib/legacy.js, components/VerifyPanel.jsx
   và bỏ đoạn gọi VerifyPanel trong App.jsx.
   ═══════════════════════════════════════════════════════ */

import { findProduct, findPrices, getScenarios, routeOneSKU } from "./utils";
import { findProductLegacy, findPricesLegacy, getScenariosLegacy, routeOneSKULegacy } from "./legacy";
import { indexHealth } from "./indexes";

const call = (fn, args) => { try { return { ok: true, v: fn(...args) } } catch (e) { return { ok: false, v: "SẬP: " + (e?.message || e) } } };
const yieldToUI = () => new Promise(r => setTimeout(r, 0));

const keyScenarios = (r) => r.ok ? r.v.map(x => `${x.sup}/${x.lbl}/${x.cost}/${x.pr?.id}`).join(" | ") : r.v;
const keyRoute = (r) => r.ok ? `${r.v.sup}/${r.v.lbl}/${r.v.cost}/${r.v.err}` : r.v;
const keyOne = (r) => r.ok ? (r.v ? String(r.v.id) : "(không tìm thấy)") : r.v;
const keyMany = (r) => r.ok ? r.v.map(x => x.id).join(",") : r.v;

export async function runVerification(D, onProgress) {
  const { products, suppliers, prices, params, labelTiers, compPrices, skuImg, supStock, routeCfg, prodMap } = D;

  // Mọi cặp (sản phẩm, size) có thật trong dữ liệu — gộp từ cả 3 nguồn
  const seen = new Set(), pairs = [];
  const add = (p, s) => { const k = p + "|||" + s; if (!seen.has(k)) { seen.add(k); pairs.push([p, s]) } };
  prices.forEach(r => add(r.product, r.size));
  products.forEach(r => add(r.product, r.size));
  skuImg.forEach(r => add(r.product, r.size));

  const diffs = [];
  const kind = { bothOk: 0, oldThrew: 0, newThrew: 0 };
  let checks = 0;

  const record = (what, p, s, oldK, newK) => {
    if (oldK === newK) return;
    const oT = oldK.startsWith("SẬP"), nT = newK.startsWith("SẬP");
    if (oT && !nT) kind.oldThrew++; else if (nT && !oT) kind.newThrew++; else kind.bothOk++;
    if (diffs.length < 60) diffs.push({ what, p, s, old: oldK, neu: newK, fatal: !(oT && !nT) });
  };

  const total = pairs.length + skuImg.length;
  let done = 0;

  for (const [p, s] of pairs) {
    const argsFP = [products, p, s];
    checks++; record("Tìm sản phẩm", p, s, keyOne(call(findProductLegacy, argsFP)), keyOne(call(findProduct, argsFP)));

    const argsFR = [prices, p, s];
    checks++; record("Tìm bảng giá", p, s, keyMany(call(findPricesLegacy, argsFR)), keyMany(call(findPrices, argsFR)));

    for (const side of ["1S", "2S"]) {
      const a = [p, s, side, products, suppliers, prices, params, labelTiers, compPrices];
      checks++;
      record("Tính phương án " + (side === "1S" ? "in 1 mặt" : "in 2 mặt"), p, s,
        keyScenarios(call(getScenariosLegacy, a)), keyScenarios(call(getScenarios, a)));
    }
    if (++done % 150 === 0) { onProgress?.(done, total, checks, kind); await yieldToUI(); }
  }

  for (const sk of skuImg) {
    const a = [sk.sku, skuImg, products, suppliers, prices, params, labelTiers, compPrices, supStock, routeCfg, prodMap];
    checks++;
    record("Phân đơn theo SKU", sk.sku, "", keyRoute(call(routeOneSKULegacy, a)), keyRoute(call(routeOneSKU, a)));
    if (++done % 150 === 0) { onProgress?.(done, total, checks, kind); await yieldToUI(); }
  }

  onProgress?.(total, total, checks, kind);
  return {
    checks, kind, diffs,
    fatal: kind.bothOk + kind.newThrew,
    pairs: pairs.length,
    scale: { products: products.length, prices: prices.length, compPrices: compPrices.length, skuImg: skuImg.length, suppliers: suppliers.length },
    health: indexHealth(products, prices, compPrices),
  };
}
