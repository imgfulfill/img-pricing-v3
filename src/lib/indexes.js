/* ═══════════════════════════════════════════════════════
   "MỤC LỤC" TRA CỨU — thay cho việc quét toàn bộ mảng mỗi lần tìm.

   Nguyên tắc bất di bất dịch của file này:
   giữ NGUYÊN kết quả của thuật toán cũ, chỉ đổi cách tìm ra kết quả đó.

   Ba điều được bảo toàn tuyệt đối:
   1. Thứ tự 4 bậc so khớp (thô → chuẩn hoá → chứa nhau → cắt đuôi "|").
   2. "Bản ghi ĐẦU TIÊN trong mảng thắng" — Map thường là "bản ghi CUỐI thắng",
      nên mọi chỗ set đều có kiểm tra .has() trước.
   3. Thứ tự các phần tử trả về — vì sc.sort() là sort ổn định, khi hai xưởng
      hoà giá thì xưởng đứng trước trong mảng mới là xưởng được chọn.

   Chỉ mục được nhớ theo THAM CHIẾU MẢNG (WeakMap). Khi DataContext tải lại
   dữ liệu, mảng mới sinh ra ⇒ chỉ mục tự động được dựng lại. Không có cache cũ.
   ═══════════════════════════════════════════════════════ */

import { normP, lowerTrim } from "./norm";

/* Ký tự phân cách khoá. PostgreSQL không cho phép ký tự NUL trong cột text,
   nên nó không bao giờ xuất hiện trong dữ liệu ⇒ không thể va khoá. */
const SEP = "\u0000";

const _prodCache = new WeakMap();
const _priceCache = new WeakMap();
const _supCache = new WeakMap();
const _compCache = new WeakMap();
const _skuCache = new WeakMap();

function memo(cache, arr, build) {
  if (!Array.isArray(arr)) return build([]);
  let ix = cache.get(arr);
  if (ix === undefined) { ix = build(arr); cache.set(arr, ix); }
  return ix;
}

/* ── Chỉ mục cho products / prices ────────────────────────────
   multi = false → mỗi khoá giữ 1 bản ghi (thay cho .find)
   multi = true  → mỗi khoá giữ 1 mảng bản ghi (thay cho .filter) */
function buildRowIndex(rows, multi) {
  const raw = new Map();     // "product\0size" (thô)            → bản ghi / mảng
  const norm = new Map();    // "normP(product)\0lower(size)"    → bản ghi / mảng
  const bySize = new Map();  // "lower(size)" → [{ it, np }] giữ nguyên thứ tự gốc
  let skippedSize = 0;       // số dòng có size không phải chuỗi (bản gốc sẽ sập ở đây)

  for (const it of rows) {
    const ls = lowerTrim(it.size);
    if (ls === null) { skippedSize++; continue; }
    const np = normP(it.product);

    // Bậc 1 — khớp thô tuyệt đối (x.product === p && x.size === s)
    if (typeof it.product === "string") {
      const kr = it.product + SEP + it.size;
      if (multi) { const a = raw.get(kr); if (a) a.push(it); else raw.set(kr, [it]); }
      else if (!raw.has(kr)) raw.set(kr, it);
    }

    // Bậc 2 và bậc 4 — khớp sau chuẩn hoá (dùng chung một bảng)
    const kn = np + SEP + ls;
    if (multi) { const a = norm.get(kn); if (a) a.push(it); else norm.set(kn, [it]); }
    else if (!norm.has(kn)) norm.set(kn, it);

    // Bậc 3 — "chứa nhau 2 chiều". Không thể lập chỉ mục theo khoá, nhưng bậc này
    // vẫn BẮT BUỘC size phải khớp ⇒ gom theo size để chỉ quét trong nhóm nhỏ.
    const b = bySize.get(ls);
    if (b) b.push({ it, np }); else bySize.set(ls, [{ it, np }]);
  }
  return { raw, norm, bySize, skippedSize };
}

const prodIndex = (P) => memo(_prodCache, P, (a) => buildRowIndex(a, false));
const priceIndex = (P) => memo(_priceCache, P, (a) => buildRowIndex(a, true));

/* Thay cho findProduct — cùng 4 bậc, cùng kết quả. */
export function findProductIdx(P, p, s) {
  const sl = s.toLowerCase().trim();   // giữ nguyên: ném lỗi nếu s không phải chuỗi
  const ix = prodIndex(P);

  // Bậc 1 — khớp thô tuyệt đối
  if (typeof p === "string" && typeof s === "string") {
    const w = ix.raw.get(p + SEP + s);
    if (w) return w;
  }

  const pl = normP(p);

  // Bậc 2 — khớp sau chuẩn hoá
  const w2 = ix.norm.get(pl + SEP + sl);
  if (w2) return w2;

  // Bậc 3 — chứa nhau 2 chiều, chỉ trong nhóm cùng size, giữ nguyên thứ tự gốc
  const bucket = ix.bySize.get(sl);
  if (bucket) {
    for (let i = 0; i < bucket.length; i++) {
      const e = bucket[i];
      if (e.np.includes(pl) || pl.includes(e.np)) return e.it;
    }
  }

  // Bậc 4 — cắt đoạn sau dấu "|" cuối cùng
  if (typeof p === "string" && p.includes("|")) {
    const b = normP(p.split("|").slice(0, -1).join("|"));
    const w4 = ix.norm.get(b + SEP + sl);
    if (w4) return w4;
  }
  return null;
}

/* Thay cho findPrices — trả về TẤT CẢ bản ghi khớp ở bậc đầu tiên có kết quả.
   Luôn trả mảng mới (giống .filter của bản gốc) để bên gọi không sửa nhầm chỉ mục. */
export function findPricesIdx(P, p, s) {
  const sl = s.toLowerCase().trim();
  const ix = priceIndex(P);

  if (typeof p === "string" && typeof s === "string") {
    const r = ix.raw.get(p + SEP + s);
    if (r && r.length) return r.slice();
  }

  const pl = normP(p);

  const r2 = ix.norm.get(pl + SEP + sl);
  if (r2 && r2.length) return r2.slice();

  const bucket = ix.bySize.get(sl);
  if (bucket) {
    const out = [];
    for (let i = 0; i < bucket.length; i++) {
      const e = bucket[i];
      if (e.np.includes(pl) || pl.includes(e.np)) out.push(e.it);
    }
    if (out.length) return out;
  }

  if (typeof p === "string" && p.includes("|")) {
    const b = normP(p.split("|").slice(0, -1).join("|"));
    const r4 = ix.norm.get(b + SEP + sl);
    if (r4 && r4.length) return r4.slice();
  }
  return [];
}

/* Thay cho: products.find(p => p.product === prod && p.size === sz)
   — chỉ khớp thô tuyệt đối, KHÔNG có bậc fuzzy (khác findProduct). */
export function productsRawExact(P, prod, sz) {
  if (typeof prod !== "string" || typeof sz !== "string") {
    return (P || []).find(x => x.product === prod && x.size === sz);
  }
  return prodIndex(P).raw.get(prod + SEP + sz);
}

/* Thay cho: prices.filter(p => p.product === prod && p.size === sz)
   — chỉ khớp thô tuyệt đối, không có bậc fuzzy nào. */
export function pricesRawExact(P, prod, sz) {
  if (typeof prod !== "string" || typeof sz !== "string") {
    return (P || []).filter(x => x.product === prod && x.size === sz);
  }
  const r = priceIndex(P).raw.get(prod + SEP + sz);
  return r ? r.slice() : [];
}

/* ── Chỉ mục cho suppliers ──────────────────────────────── */
function buildSupIndex(sups) {
  const byIdOrName = new Map();   // thay cho .find(s => s.id === v || s.name === v)
  const byName = new Map();       // thay cho .find(s => s.name === v)
  for (let i = 0; i < sups.length; i++) {
    const s = sups[i];
    // Đúng thứ tự bản gốc: xét CẢ id và name của xưởng này trước khi sang xưởng sau
    if (!byIdOrName.has(s.id)) byIdOrName.set(s.id, s);
    if (!byIdOrName.has(s.name)) byIdOrName.set(s.name, s);
    if (!byName.has(s.name)) byName.set(s.name, s);
  }
  return { byIdOrName, byName };
}
const supIndex = (S) => memo(_supCache, S, buildSupIndex);

export function findSupplierByIdOrName(S, v) { return supIndex(S).byIdOrName.get(v); }
export function findSupplierByName(S, v) { return supIndex(S).byName.get(v); }

/* ── Chỉ mục cho comp_prices ────────────────────────────────
   Lưu ý: bậc fuzzy của comp_prices dùng .toLowerCase().trim()
   chứ KHÔNG dùng normP — khác với products/prices. Giữ nguyên. */
function buildCompIndex(comps) {
  const raw = new Map();         // "comp\0product\0size" (thô) → bản ghi
  const byCompSize = new Map();  // "comp\0lower(size)" → [{ it, lp }]
  const byProdSize = new Map();  // "product\0size" (thô) → [bản ghi]
  let skipped = 0;

  for (let i = 0; i < comps.length; i++) {
    const c = comps[i];
    const isStr = typeof c.comp === "string" && typeof c.product === "string" && typeof c.size === "string";

    if (isStr) {
      const kr = c.comp + SEP + c.product + SEP + c.size;
      if (!raw.has(kr)) raw.set(kr, c);
    }
    if (typeof c.product === "string" && typeof c.size === "string") {
      const kp = c.product + SEP + c.size;
      const a = byProdSize.get(kp); if (a) a.push(c); else byProdSize.set(kp, [c]);
    }
    if (!isStr) { skipped++; continue; }

    const ls = lowerTrim(c.size), lp = lowerTrim(c.product);
    const k2 = c.comp + SEP + ls;
    const b = byCompSize.get(k2);
    if (b) b.push({ it: c, lp }); else byCompSize.set(k2, [{ it: c, lp }]);
  }
  return { raw, byCompSize, byProdSize, skipped };
}
const compIndex = (C) => memo(_compCache, C, buildCompIndex);

/* Thay cho 3 lần .find() liên tiếp trong getScenarios (nhánh xưởng tự ship). */
export function findCompSelf(C, compName, cprod, csz, prod, sz) {
  const ix = compIndex(C);

  if (typeof compName === "string") {
    if (typeof cprod === "string" && typeof csz === "string") {
      const a = ix.raw.get(compName + SEP + cprod + SEP + csz);
      if (a) return a;
    }
    if (typeof prod === "string" && typeof sz === "string") {
      const b = ix.raw.get(compName + SEP + prod + SEP + sz);
      if (b) return b;
    }
  }

  // Bậc fuzzy — giữ nguyên biểu thức gốc, kể cả việc ném lỗi nếu cprod/csz không phải chuỗi
  const pl = cprod.toLowerCase().trim(), sl = csz.toLowerCase().trim();
  if (typeof compName !== "string") return undefined;
  const bucket = ix.byCompSize.get(compName + SEP + sl);
  if (bucket) {
    for (let i = 0; i < bucket.length; i++) {
      const e = bucket[i];
      if (e.lp === pl || e.lp.includes(pl) || pl.includes(e.lp)) return e.it;
    }
  }
  return undefined;
}

/* Thay cho: compPrices.find(c => c.comp === X && c.product === prod && c.size === sz) */
export function compRawExact(C, compName, prod, sz) {
  if (typeof compName !== "string" || typeof prod !== "string" || typeof sz !== "string") {
    return (C || []).find(c => c.comp === compName && c.product === prod && c.size === sz);
  }
  return compIndex(C).raw.get(compName + SEP + prod + SEP + sz);
}

/* Thay cho: compPrices.filter(c => c.product === prod && c.size === sz) */
export function compByProdSize(C, prod, sz) {
  if (typeof prod !== "string" || typeof sz !== "string") {
    return (C || []).filter(c => c.product === prod && c.size === sz);
  }
  const r = compIndex(C).byProdSize.get(prod + SEP + sz);
  return r ? r.slice() : [];
}

/* ── Chỉ mục cho sku_img ────────────────────────────────── */
function buildSkuIndex(rows) {
  const bySku = new Map();
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!bySku.has(r.sku)) bySku.set(r.sku, r);   // bản ghi đầu tiên thắng
  }
  return { bySku };
}
const skuIndex = (S) => memo(_skuCache, S, buildSkuIndex);

export function findSkuByCode(S, code) { return skuIndex(S).bySku.get(code); }

/* Dùng cho báo cáo đối chiếu: đếm số dòng bị bỏ qua vì thiếu size/product. */
export function indexHealth(products, prices, compPrices) {
  return {
    productsSkippedSize: prodIndex(products).skippedSize,
    pricesSkippedSize: priceIndex(prices).skippedSize,
    compSkipped: compIndex(compPrices).skipped,
  };
}
