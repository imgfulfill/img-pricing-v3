import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useData } from "../context/DataContext";
import { T, routeOneSKU, mapCell, getScenarios, ltColor, fmt, findPrices, findProduct, calcLabel, matchSupplierProduct, checkStockAvailability, TBL_H_SHORT } from "../lib/utils";
import { useVirtualRows, Spacer } from "../lib/useVirtualRows.jsx";

let _persistedOrders = [];

/* ── Thanh lọc và thanh chọn ──────────────────────────────────────────────
   PHẢI khai báo ở ngoài component cha.

   Trước đây hai thanh này được khai báo BÊN TRONG OrderRouter, nên mỗi lần
   gõ một ký tự React lại coi chúng là một loại component mới → xoá sạch rồi
   dựng lại toàn bộ (kể cả ô đang gõ, làm con trỏ nhảy ra ngoài).
   Đưa ra ngoài + React.memo ⇒ React chỉ cập nhật, không dựng lại.
   Giao diện và hành vi giữ nguyên 100%. */

const BAR = { display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap", fontSize: 12 };
const SEL_BAR = { display: "flex", gap: 6, marginBottom: 8, alignItems: "center", fontSize: 12 };
const IN_Q = { flex: 1, minWidth: 150, fontSize: 12 };
const IN_PROD = { width: 120, fontSize: 12 };
const IN_SIZE = { width: 70, fontSize: 12 };
const IN_COLOR = { width: 80, fontSize: 12 };
const IN_LBL = { width: 80, fontSize: 12 };
const BTN_S = { fontSize: 10 };

/* Cộng tổng tiền của một danh sách dòng đơn.
   Lưu ý nghiệp vụ: Label tính MỘT lần cho cả đơn, rồi chia đều cho các món
   trong đơn. Nên cộng cột Label ở đây = tổng tiền label thật sự phải trả,
   chỉ lệch vài xu do làm tròn khi chia (ví dụ $4.29 chia cho 7 món). */
const sumRows = (list) => list.reduce((a, o) => ({
  pay: a.pay + (o.payToSup || 0),
  lbl: a.lbl + (o.labelCost || 0),
  cp: a.cp + (o.cost || 0),
}), { pay: 0, lbl: 0, cp: 0 });

const money = (n) => "$" + (Math.round(n * 100) / 100).toFixed(2);

const TOT_TD = { padding: "7px 8px", borderTop: "2px solid #2d4a6f", background: "#1a2235", position: "sticky", bottom: 0, zIndex: 2 };

const FilterBar = React.memo(function FilterBar({
  q, setQ, fProd, setFProd, fSize, setFSize, fColor, setFColor, fLbl, setFLbl, sizes, labels, extra,
}) {
  return (
    <div style={BAR}>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm SKU / đơn / email..." style={IN_Q} />
      <input value={fProd} onChange={e => setFProd(e.target.value)} placeholder="Product..." style={IN_PROD} />
      <select value={fSize} onChange={e => setFSize(e.target.value)} style={IN_SIZE}><option value="">Size</option>{sizes.map(s => <option key={s}>{s}</option>)}</select>
      <input value={fColor} onChange={e => setFColor(e.target.value)} placeholder="Color..." style={IN_COLOR} />
      <select value={fLbl} onChange={e => setFLbl(e.target.value)} style={IN_LBL}><option value="">Label</option>{labels.map(l => <option key={l}>{l}</option>)}</select>
      {extra}
    </div>
  );
});

const SelectBar = React.memo(function SelectBar({ list, sel, selectAll, copySelOrders }) {
  return (
    <div style={SEL_BAR}>
      <button className="bg2" onClick={() => selectAll(list)} style={BTN_S}>{sel.size === list.length && list.length > 0 ? "Bỏ chọn" : "Chọn tất cả (" + list.length + ")"}</button>
      <span style={{ color: T.tm }}>{sel.size + " đã chọn"}</span>
      <button className="bp2" onClick={() => copySelOrders(list)} style={BTN_S} disabled={sel.size === 0}>{"📋 Copy mã đơn (" + sel.size + ")"}</button>
    </div>
  );
});

export default function OrderRouter() {
  const { skuImg, suppliers, products, prices, params, labelTiers, compPrices, supStock, routeCfg, prodMap, warehouseNotes } = useData();
  const [orders, setOrders] = useState(_persistedOrders);
  const [tab, setTab] = useState("table");
  const [fSup, setFSup] = useState(""); const [q, setQ] = useState("");
  const [fProd, setFProd] = useState(""); const [fSize, setFSize] = useState(""); const [fColor, setFColor] = useState(""); const [fLbl, setFLbl] = useState("");
  const [showPaste, setShowPaste] = useState(_persistedOrders.length === 0);
  const [sel, setSel] = useState(new Set());
  // Đổi xưởng thủ công
  const [ovTarget, setOvTarget] = useState("");      // "rank2" | "rank3" | tên xưởng
  const [allowSplit, setAllowSplit] = useState(false); // cho phép tách đơn (mặc định TẮT)

  useEffect(() => { _persistedOrders = orders }, [orders]);

  // Resolve supplier SKU
  const resolveSupSku = (skuCode, supName, skData, orderRow) => {
    const stock = supStock[supName]; if (!stock?.rows?.length) return "";
    const resolver = (routeCfg.skuResolvers || {})[supName]; if (!resolver) return "";
    const prodCol = resolver.productCol; const skuCol = resolver.skuCol;
    const sideCol = resolver.sideCol; const sizeCol = resolver.sizeCol; const colorCol = resolver.colorCol;
    if (!prodCol || !skuCol) return "";
    const skPrintArea = (skData?.printArea || "").toLowerCase();
    const isBoth = skPrintArea.includes("both");
    let printSide = "Front";
    if (isBoth) printSide = "Front&Back";
    else if (orderRow) {
      const hasFront = !!(orderRow[33] || "").trim(); const hasBack = !!(orderRow[34] || "").trim();
      if (hasBack && !hasFront) printSide = "Back"; else if (hasFront && hasBack) printSide = "Front&Back";
    }
    const matches = stock.rows.filter(row => {
      if (!matchSupplierProduct(skData?.product || "", prodCol, row)) return false;
      if (sizeCol) { const rs = (row[sizeCol] || "").toUpperCase().trim(); const ss = (skData?.size || "").toUpperCase().trim(); if (rs && ss && rs !== ss) return false }
      if (colorCol) { const rc = (row[colorCol] || "").toLowerCase().trim(); const sc = (skData?.color || "").toLowerCase().trim(); if (rc && sc && !rc.includes(sc) && !sc.includes(rc)) return false }
      if (sideCol) {
        const rowSide = (row[sideCol] || "").toLowerCase().trim(); if (rowSide) {
          const ps = printSide.toLowerCase();
          if (ps.includes("front&back") || ps.includes("both")) { if (!rowSide.includes("both") && !rowSide.includes("front&back")) return false }
          else if (ps === "back") { if (!rowSide.includes("back") || rowSide.includes("front&")) return false }
          else { if (rowSide.includes("both") || rowSide.includes("front&back")) return false; if (rowSide.includes("back") && !rowSide.includes("front")) return false }
        }
      }
      return true;
    });
    if (matches.length > 0 && matches[0][skuCol]) { let sku = matches[0][skuCol]; if (resolver.upper) sku = sku.toUpperCase(); return sku }
    return "";
  };

  const doPaste = useCallback((txt) => {
    // Parse TSV handling quoted multi-line fields
    const raw = txt.replace(/\r\n/g, "\n").trim();
    let lines = []; let cur = ""; let inQuote = false;
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      if (ch === '"') { inQuote = !inQuote; cur += ch; }
      else if (ch === "\n" && !inQuote) { lines.push(cur); cur = ""; }
      else { cur += ch; }
    }
    if (cur.trim()) lines.push(cur);
    lines = lines.filter(l => l.trim() && !l.startsWith("Order Code"));

    const stockData = routeCfg.stockData || {};
    const mode = routeCfg.labelMode || "BLENDED";
    const activeSups = suppliers.filter(s => s.active);

    // STEP 1: Parse all items
    const allItems = [];
    lines.forEach(l => {
      const c = l.split("\t");
      if (c.length < 30) return;
      const sku = (c[5] || "").trim();
      if (!sku || sku.length < 5 || sku.includes("http")) return;
      const orderCode = (c[0] || "").trim();
      if (!orderCode || orderCode.includes("http")) return;
      const rt = routeOneSKU(sku, skuImg, products, suppliers, prices, params, labelTiers, compPrices, supStock, routeCfg, prodMap);
      const sk = rt.sk;
      const is2S = (sk?.printArea || "").toLowerCase().includes("both");
      const w = findProduct(products, sk?.product || "", sk?.size || "");
      const weightOz = w?.weightOz || 0;
      // Get base cost per supplier
      // Bảng giá của cặp (sản phẩm, size) này giống nhau cho MỌI xưởng,
      // nên tra một lần ở đây thay vì tra lại trong từng vòng lặp xưởng.
      const prsAll = findPrices(prices, sk?.product || "", sk?.size || "");
      const supCosts = {};
      activeSups.forEach(sup => {
        const prs = prsAll.filter(p => sup.id === p.supplierId || sup.name === p.supplierId);
        if (prs.length === 0) return;
        const pr = prs[0];
        let baseCost = pr.totalCost;
        if (is2S && pr.cost2nd != null) baseCost += pr.cost2nd;
        const skColor = sk?.color || c[30] || "";
        const skSize = sk?.size || c[29] || "";
        if (!checkStockAvailability(sk?.product || "", skSize, skColor, sup.name, stockData)) return;
        supCosts[sup.name] = { baseCost, handling: pr.handlingFee || sup.handling || 0, sup };
      });
      allItems.push({ row: c, sku, orderCode, sk, rt, is2S, weightOz, supCosts,
        prodName: c[4] || sk?.product || sku, emailSeller: c[2] || "",
        color: sk?.color || c[30] || "", size: sk?.size || c[29] || "" });
    });

    // STEP 2: Group by orderCode
    const orderGroups = {};
    allItems.forEach(item => {
      if (!orderGroups[item.orderCode]) orderGroups[item.orderCode] = [];
      orderGroups[item.orderCode].push(item);
    });

    // STEP 3: For each order, find optimal supplier
    const batch = [];
    Object.entries(orderGroups).forEach(([orderCode, items]) => {
      // Find suppliers that can handle ALL items in this order
      const allSupNames = new Set();
      items.forEach(item => Object.keys(item.supCosts).forEach(s => allSupNames.add(s)));
      const candidateSups = [...allSupNames].filter(supName =>
        items.every(item => item.supCosts[supName])
      );

      // Tính chi phí label của đơn TRƯỚC, để cả nhánh dự phòng cũng lưu được
      // (cần cho việc đổi xưởng thủ công sau này).
      const minWeightOz = Math.min(...items.map(i => i.weightOz || 0));
      const lblOrder = calcLabel(minWeightOz, labelTiers, params);
      const cheapL = params.cheapPrice || 1.5;
      const expL = lblOrder ? lblOrder.expE : params.expSmallest || 3.6;
      const bldL = lblOrder ? lblOrder.bld : cheapL;
      const lblCosts = { cheapL, expL, bldL };
      // Giá theo từng xưởng cho từng món — bản gốc tính rồi vứt đi,
      // nay giữ lại (bản rút gọn) để tính lại được khi đổi xưởng.
      const slimCosts = (sc) => Object.fromEntries(Object.entries(sc).map(([k, v]) => [k, { baseCost: v.baseCost, handling: v.handling }]));

      if (candidateSups.length === 0) {
        // No single supplier can handle all items → fallback to per-item routing
        items.forEach(item => {
          const allSc = getScenarios(item.sk?.product || "", item.sk?.size || "", item.is2S ? "2S" : "1S", products, suppliers, prices, params, labelTiers, compPrices);
          let modeSc = allSc;
          if (mode === "EXP_ONLY") modeSc = allSc.filter(s => s.lbl === "Exp" || s.lbl === "Self" || s.lbl === "Bld");
          else if (mode === "CHEAP_ONLY") modeSc = allSc.filter(s => s.lbl === "Cheap" || s.lbl === "Bld" || s.lbl === "Self");
          if (modeSc.length === 0) modeSc = allSc;
          const bestSc = modeSc[0] || null;
          batch.push({ row: item.row, sku: item.sku, sup: bestSc?.sup || "UNKNOWN", lbl: bestSc?.lbl || "",
            cost: bestSc?.cost || 0, rt: item.rt, supSku: "", orderCode, prodName: item.prodName,
            firstName: item.row[19] || "", lastName: item.row[20] || "", emailSeller: item.emailSeller,
            color: item.color, size: item.size, rank: 0, totalSc: modeSc.length,
            scenarios: modeSc.slice(0, 3), err: item.rt.err || "Không có xưởng chung cho cả order",
            payToSup: 0, labelCost: 0, orderItemCount: items.length,
            candidates: [], supCosts: slimCosts(item.supCosts), lblCosts, manual: false });
        });
        return;
      }

      // Calculate total order cost per candidate supplier + label type
      let bestOption = null;
      candidateSups.forEach(supName => {
        const sup = activeSups.find(s => s.name === supName); if (!sup) return;
        const sumBase = items.reduce((sum, item) => sum + (item.supCosts[supName]?.baseCost || 0), 0);
        const handling = items[0].supCosts[supName]?.handling || 0; // 1 handling per order
        const labelOptions = [];
        if (sup.selfShip) labelOptions.push({ lbl: "Self", lc: 0 }); // Self-ship has different cost calc
        if (sup.useCheap) labelOptions.push({ lbl: "Cheap", lc: cheapL });
        if (sup.useExp) labelOptions.push({ lbl: "Exp", lc: expL });
        if (sup.useCheap && sup.useExp) labelOptions.push({ lbl: "Bld", lc: bldL });
        // Filter by label mode
        let filtered = labelOptions;
        if (mode === "EXP_ONLY") filtered = labelOptions.filter(o => o.lbl === "Exp" || o.lbl === "Self" || o.lbl === "Bld");
        else if (mode === "CHEAP_ONLY") filtered = labelOptions.filter(o => o.lbl === "Cheap" || o.lbl === "Bld" || o.lbl === "Self");
        if (filtered.length === 0) filtered = labelOptions;

        filtered.forEach(opt => {
          let totalOrderCost = sumBase + handling + opt.lc;
          // Self-ship: label cost from comp_prices
          if (opt.lbl === "Self") {
            const cs = compPrices.find(c => c.comp === supName && items[0].sk?.product && c.size === items[0].sk?.size);
            const selfLc = cs?.shipFirst != null ? cs.shipFirst - (params.a2kDiscount || 0) : 0;
            totalOrderCost = sumBase + handling + selfLc;
          }
          totalOrderCost = Math.round(totalOrderCost * 100) / 100;
          if (!bestOption || totalOrderCost < bestOption.totalCost) {
            bestOption = { supName, lbl: opt.lbl, labelCost: opt.lbl === "Self" ? 0 : opt.lc, totalCost: totalOrderCost, handling, sumBase };
          }
        });
      });

      // STEP 4: Assign all items in this order to best supplier
      const chosenSup = bestOption?.supName || "UNKNOWN";
      const chosenLbl = bestOption?.lbl || "";
      const orderLabelCost = bestOption?.labelCost || 0;
      const orderHandling = bestOption?.handling || 0;

      // Build per-item scenarios for display
      const allSc = candidateSups.map(supName => {
        const sumBase = items.reduce((sum, item) => sum + (item.supCosts[supName]?.baseCost || 0), 0);
        const handling = items[0].supCosts[supName]?.handling || 0;
        const sup = activeSups.find(s => s.name === supName);
        let bestLblCost = expL; let bestLbl = "Exp";
        if (sup?.useCheap && (mode !== "EXP_ONLY")) { bestLblCost = cheapL; bestLbl = "Cheap" }
        if (sup?.useCheap && sup?.useExp && (mode !== "CHEAP_ONLY")) { bestLblCost = bldL; bestLbl = "Bld" }
        if (mode === "EXP_ONLY") { bestLblCost = sup?.useExp ? expL : bldL; bestLbl = sup?.useExp ? "Exp" : "Bld" }
        return { sup: supName, lbl: bestLbl, cost: Math.round((sumBase + handling + bestLblCost) * 100) / 100 };
      }).sort((a, b) => a.cost - b.cost);

      const rank = allSc.findIndex(s => s.sup === chosenSup) + 1;

      items.forEach(item => {
        const itemBaseCost = item.supCosts[chosenSup]?.baseCost || 0;
        // PayToSup per item = baseCost (no handling, it's shared)
        // For display: distribute handling + label evenly across items
        const itemPayToSup = Math.round((itemBaseCost + orderHandling / items.length) * 100) / 100;
        const itemLabelCost = Math.round(orderLabelCost / items.length * 100) / 100;
        const itemCost = Math.round((itemBaseCost + orderHandling / items.length + orderLabelCost / items.length) * 100) / 100;
        const supSku = resolveSupSku(item.sku, chosenSup, item.sk, item.row);
        batch.push({ row: item.row, sku: item.sku, sup: chosenSup, lbl: chosenLbl,
          cost: itemCost, rt: item.rt, supSku, orderCode,
          prodName: item.prodName, firstName: item.row[19] || "", lastName: item.row[20] || "",
          emailSeller: item.emailSeller, color: item.color, size: item.size,
          rank, totalSc: allSc.length, scenarios: allSc.slice(0, 3), err: null,
          payToSup: itemPayToSup, labelCost: itemLabelCost, orderItemCount: items.length,
          orderTotalCost: bestOption?.totalCost || 0,
          // Dữ liệu để đổi xưởng thủ công: TOÀN BỘ phương án (không chỉ 3),
          // giá của từng xưởng cho món này, và chi phí label của đơn.
          candidates: allSc, supCosts: slimCosts(item.supCosts), lblCosts, manual: false });
      });
    });

    if (batch.length) { setOrders(batch); setShowPaste(false); setFSup(""); setTab("table"); setSel(new Set()) }
    else alert("Không tìm thấy đơn hàng hợp lệ");
  }, [skuImg, products, suppliers, prices, params, labelTiers, compPrices, supStock, routeCfg, prodMap]);

  const grouped = useMemo(() => { const g = {}; orders.forEach(o => { if (!g[o.sup]) g[o.sup] = []; g[o.sup].push(o) }); return g }, [orders]);
  const supKeys = Object.keys(grouped).sort((a, b) => grouped[b].length - grouped[a].length);

  const applyFilters = (list) => list.filter(o => {
    if (fSup && o.sup !== fSup) return false;
    if (q && !(o.sku + " " + o.prodName + " " + o.orderCode + " " + o.emailSeller).toLowerCase().includes(q.toLowerCase())) return false;
    if (fProd && !o.prodName.toLowerCase().includes(fProd.toLowerCase())) return false;
    if (fSize && o.size !== fSize) return false;
    if (fColor && !o.color.toLowerCase().includes(fColor.toLowerCase())) return false;
    if (fLbl && o.lbl !== fLbl) return false;
    return true;
  });
  const filtered = useMemo(() => applyFilters(orders), [orders, fSup, q, fProd, fSize, fColor, fLbl]);

  const labelWarnings = useMemo(() => {
    if (!warehouseNotes?.length || !orders.length) return [];
    return orders.filter(o => warehouseNotes.some(n => n.supplier === o.sup && (n.product === "ALL" || o.prodName.toLowerCase().includes(n.product.toLowerCase()))))
      .map(o => ({ ...o, notes: warehouseNotes.filter(n => n.supplier === o.sup && (n.product === "ALL" || o.prodName.toLowerCase().includes(n.product.toLowerCase()))) }));
  }, [orders, warehouseNotes]);

  const sizes = useMemo(() => [...new Set(orders.map(o => o.size).filter(Boolean))].sort(), [orders]);
  const labels = useMemo(() => [...new Set(orders.map(o => o.lbl).filter(Boolean))].sort(), [orders]);

  const toggleSel = (i) => { const ns = new Set(sel); ns.has(i) ? ns.delete(i) : ns.add(i); setSel(ns) };
  const selectAll = useCallback((list) => { if (sel.size === list.length) setSel(new Set()); else setSel(new Set(list.map((_, i) => i))) }, [sel]);
  const copySelOrders = useCallback((list) => {
    const codes = [...new Set(list.filter((_, i) => sel.has(i)).map(o => o.orderCode).filter(Boolean))];
    if (!codes.length) return alert("Chọn ít nhất 1 đơn");
    navigator.clipboard.writeText(codes.join("\n")).then(() => alert("Copied " + codes.length + " mã đơn")).catch(() => alert("Clipboard fail"));
  }, [sel]);

  // Gom sẵn props cho hai thanh, để chúng chỉ dựng lại khi thật sự có thay đổi
  // Cuộn ảo cho bảng chính — một lô đơn có thể lên tới hàng nghìn dòng
  const ORD_COLS = 15;
  const vr = useVirtualRows(filtered.length);

  /* ═══════════════════════════════════════════════════════
     ĐẨY ĐƠN SANG XƯỞNG KHÁC (thủ công)

     Quy tắc nghiệp vụ: mọi món cùng một mã đơn phải về CÙNG một xưởng
     (để gộp label và chỉ tính phí xử lý một lần). Vì vậy mặc định thao tác
     này áp dụng cho CẢ ĐƠN, kể cả khi bạn chỉ tick một món.
     Bật "Cho phép tách đơn" nếu thực sự cần xé đơn ra nhiều xưởng.
     ═══════════════════════════════════════════════════════ */

  // Chi phí của một đơn nếu giao cho `supName` — chọn loại label rẻ nhất mà xưởng đó cho phép.
  // Trả null nếu xưởng không báo giá đủ cho MỌI món trong đơn.
  const costForSupplier = useCallback((rows, supName) => {
    if (!rows.every(r => r.supCosts?.[supName])) return null;
    const sup = suppliers.find(x => x.name === supName);
    if (!sup) return null;
    const { cheapL = 0, expL = 0, bldL = 0 } = rows[0].lblCosts || {};
    const mode = routeCfg.labelMode || "BLENDED";

    const opts = [];
    if (sup.selfShip) {
      const cs = compPrices.find(c => c.comp === supName && c.size === rows[0].size);
      opts.push({ lbl: "Self", lc: cs?.shipFirst != null ? cs.shipFirst - (params.a2kDiscount || 0) : 0 });
    }
    if (sup.useCheap) opts.push({ lbl: "Cheap", lc: cheapL });
    if (sup.useExp) opts.push({ lbl: "Exp", lc: expL });
    if (sup.useCheap && sup.useExp) opts.push({ lbl: "Bld", lc: bldL });
    let allowed = opts;
    if (mode === "EXP_ONLY") allowed = opts.filter(o => ["Exp", "Self", "Bld"].includes(o.lbl));
    else if (mode === "CHEAP_ONLY") allowed = opts.filter(o => ["Cheap", "Bld", "Self"].includes(o.lbl));
    if (!allowed.length) allowed = opts;
    if (!allowed.length) return null;

    const best = allowed.reduce((a, b) => (b.lc < a.lc ? b : a));
    const sumBase = rows.reduce((t, r) => t + (r.supCosts[supName].baseCost || 0), 0);
    const handling = rows[0].supCosts[supName].handling || 0;
    return { lbl: best.lbl, labelCost: best.lc, handling, sumBase,
             total: Math.round((sumBase + handling + best.lc) * 100) / 100 };
  }, [suppliers, compPrices, params, routeCfg]);

  // Danh sách xưởng để chọn trong ô thả xuống
  const ovSupNames = useMemo(() => [...new Set(suppliers.filter(s => s.active).map(s => s.name))].sort(), [suppliers]);

  const applyOverride = useCallback(() => {
    if (!ovTarget || !sel.size) return;

    // Ô tick lưu vị trí trong danh sách ĐÃ LỌC → quy về đúng đối tượng dòng
    const picked = new Set([...sel].map(i => filtered[i]).filter(Boolean));
    if (!picked.size) return;

    // Mặc định: kéo theo toàn bộ các món cùng mã đơn
    let target = new Set(picked);
    if (!allowSplit) {
      const codes = new Set([...picked].map(o => o.orderCode));
      orders.forEach(o => { if (codes.has(o.orderCode)) target.add(o) });
    }

    // Gom theo mã đơn (khi tách đơn thì mỗi nhóm chỉ gồm các món được tick)
    const groups = {};
    target.forEach(o => { (groups[o.orderCode] ||= []).push(o) });

    const changes = new Map();     // dòng gốc -> dữ liệu mới
    const skipped = [];
    Object.entries(groups).forEach(([code, rows]) => {
      let supName = ovTarget;
      if (ovTarget === "rank2" || ovTarget === "rank3") {
        const want = ovTarget === "rank2" ? 1 : 2;
        const cands = rows[0].candidates || [];
        if (cands.length <= want) { skipped.push(code + " (không có phương án rẻ thứ " + (want + 1) + ")"); return }
        supName = cands[want].sup;
      }
      const c = costForSupplier(rows, supName);
      if (!c) { skipped.push(code + " (" + supName + " không có giá đủ cho mọi món)"); return }

      const n = rows.length;
      const rank = (rows[0].candidates || []).findIndex(x => x.sup === supName) + 1;
      rows.forEach(o => {
        const base = o.supCosts[supName].baseCost || 0;
        const payToSup = Math.round((base + c.handling / n) * 100) / 100;
        const labelCost = Math.round((c.labelCost / n) * 100) / 100;
        changes.set(o, {
          sup: supName, lbl: c.lbl, payToSup, labelCost,
          cost: Math.round((base + c.handling / n + c.labelCost / n) * 100) / 100,
          rank: rank || 0, orderTotalCost: c.total, manual: true, err: null,
          supSku: resolveSupSku(o.sku, supName, o.rt?.sk, o.row),
        });
      });
    });

    if (!changes.size) {
      alert("Không đẩy được đơn nào.\n\n" + skipped.join("\n"));
      return;
    }
    setOrders(prev => prev.map(o => changes.has(o) ? { ...o, ...changes.get(o) } : o));
    setSel(new Set());

    const nOrders = new Set([...changes.keys()].map(o => o.orderCode)).size;
    alert("Đã đẩy " + nOrders + " đơn (" + changes.size + " món)." +
      (skipped.length ? "\n\nBỏ qua " + skipped.length + " đơn:\n" + skipped.join("\n") : ""));
  }, [ovTarget, sel, filtered, orders, allowSplit, costForSupplier, resolveSupSku]);

  // Tổng của phần đang hiển thị (theo bộ lọc) và của phần đang tick
  const totAll = useMemo(() => sumRows(filtered), [filtered]);
  const totSel = useMemo(() => sumRows([...sel].map(i => filtered[i]).filter(Boolean)), [sel, filtered]);
  const nOrders = useMemo(() => new Set(filtered.map(o => o.orderCode)).size, [filtered]);

  const filterProps = { q, setQ, fProd, setFProd, fSize, setFSize, fColor, setFColor, fLbl, setFLbl, sizes, labels };
  const selectProps = { sel, selectAll, copySelOrders };

  const doExport = async (supName) => {
    const items = grouped[supName]; if (!items?.length) return;
    // Thư viện Excel chỉ được tải khi người dùng thực sự bấm xuất file (~280KB)
    const XLSX = await import("xlsx");
    const tpl = routeCfg.tpls?.[supName];
    if (!tpl) {
      const rows = items.map(o => ({ "Order Code": o.orderCode, "SKU Xưởng": o.supSku || o.sku, "Product": o.prodName, "Size": o.size, "Color": o.color, "Label": o.lbl, "PaytoSup": o.payToSup, "LabelCost": o.labelCost, "CP": o.cost, "Email Seller": o.emailSeller }));
      const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, supName);
      XLSX.writeFile(wb, supName + "_" + new Date().toISOString().slice(0, 10) + ".xlsx"); return;
    }
    const hdr = tpl.h || []; const mapping = tpl.m || []; const xd = [hdr];
    items.forEach(o => { xd.push(mapping.map(c => mapCell(c, o.row, o))) });
    const ws = XLSX.utils.aoa_to_sheet(xd); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, supName);
    XLSX.writeFile(wb, supName + "_" + new Date().toISOString().slice(0, 10) + ".xlsx");
  };
  const doCopyTSV = (supName) => {
    const items = grouped[supName]; if (!items?.length) return;
    const tpl = routeCfg.tpls?.[supName]; let tsv = "";
    if (tpl) { tsv = (tpl.h || []).join("\t") + "\n"; items.forEach(o => { tsv += (tpl.m || []).map(c => mapCell(c, o.row, o)).join("\t") + "\n" }) }
    else { tsv = "Order\tSKU Xưởng\tProduct\tSize\tColor\tLabel\tPaytoSup\tLabelCost\tCP\tEmail\n"; items.forEach(o => { tsv += [o.orderCode, o.supSku || o.sku, o.prodName, o.size, o.color, o.lbl, o.payToSup, o.labelCost, o.cost, o.emailSeller].join("\t") + "\n" }) }
    navigator.clipboard.writeText(tsv).then(() => alert("Copied " + items.length + " rows")).catch(() => alert("Clipboard fail"));
  };

  return (
    <div className="fade">
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{"Phân đơn"}</h2>
      {showPaste || orders.length === 0 ? (
        <div>
          <div style={{ fontSize: 14, color: T.tm, marginBottom: 10 }}>{"Paste đơn hàng từ backend IMG (49 cột TSV). Phân theo Order — tất cả item cùng mã đơn đẩy cùng 1 xưởng."}</div>
          <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, padding: 16 }}>
            <textarea rows={10} style={{ width: "100%", fontSize: 12, fontFamily: "monospace" }} placeholder={"Paste đơn hàng TSV..."} id="orderPasteTa" />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="bp2" onClick={() => { const ta = document.getElementById("orderPasteTa"); if (ta?.value) doPaste(ta.value) }} style={{ fontSize: 14, padding: "6px 16px" }}>{"🚀 Route đơn hàng"}</button>
              <div style={{ fontSize: 12, color: T.tm, display: "flex", alignItems: "center" }}>{skuImg.length + " SKU · " + (routeCfg.labelMode || "BLENDED") + " · Phân theo Order"}</div>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <div style={{ background: T.sf, border: "1px solid " + (fSup === "" ? T.p : T.bd), borderRadius: 8, padding: "8px 14px", cursor: "pointer" }} onClick={() => setFSup("")}>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.ac }}>{orders.length}</div><div style={{ fontSize: 12, color: T.tm }}>{"Tổng item"}</div>
            </div>
            {supKeys.map(s => (
              <div key={s} onClick={() => setFSup(fSup === s ? "" : s)} style={{ background: T.sf, border: "1px solid " + (fSup === s ? T.p : T.bd), borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: s === "UNKNOWN" ? T.dg : T.tx }}>{grouped[s].length}</div><div style={{ fontSize: 12, color: T.tm }}>{s}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 10, alignItems: "center", flexWrap: "wrap" }}>
            {[["table", "📋 Bảng"], ["supplier", "🏭 Tabs xưởng"], ["label", "📍 Set địa chỉ Label"]].map(([id, l]) =>
              <button key={id} className={tab === id ? "bp2" : "bg2"} onClick={() => { setTab(id); setSel(new Set()) }} style={{ fontSize: 13 }}>{l}</button>
            )}
            <button className="bg2" onClick={() => setShowPaste(true)} style={{ fontSize: 13 }}>{"📋 Paste mới"}</button>
            {supKeys.filter(s => s !== "UNKNOWN").map(s => (
              <button key={s} className="bp2" onClick={() => doExport(s)} style={{ fontSize: 12 }}>{"📥 " + s + " (" + grouped[s].length + ")"}</button>
            ))}
          </div>

          {tab === "table" && <div>
            <FilterBar {...filterProps} />
            <SelectBar list={filtered} {...selectProps} />
            <div style={{ background: T.sf, border: "1px solid " + (sel.size ? T.w : T.bd), borderRadius: 8, padding: "8px 10px", marginBottom: 8, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", fontSize: 13 }}>
              <span style={{ color: T.tm }}>Đẩy sang xưởng:</span>
              <select value={ovTarget} onChange={e => setOvTarget(e.target.value)} style={{ width: 210, fontSize: 12 }}>
                <option value="">— chọn —</option>
                <option value="rank2">Rẻ thứ 2 (tự động theo từng đơn)</option>
                <option value="rank3">Rẻ thứ 3 (tự động theo từng đơn)</option>
                <option value="" disabled>──────────</option>
                {ovSupNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <button className="bp2" onClick={applyOverride} style={{ fontSize: 12 }} disabled={!ovTarget || !sel.size}>
                Áp dụng ({sel.size} món)
              </button>
              <label style={{ display: "flex", alignItems: "center", gap: 4, color: T.tm, fontSize: 12, cursor: "pointer" }}
                title="Mặc định TẮT: tick 1 món thì cả đơn cùng chuyển, giữ đúng quy tắc mỗi đơn một xưởng. Bật lên chỉ khi thật sự cần xé đơn ra nhiều xưởng.">
                <input type="checkbox" checked={allowSplit} onChange={e => setAllowSplit(e.target.checked)} style={{ width: 13, height: 13 }} />
                Cho phép tách đơn
              </label>
              <span style={{ color: T.td, fontSize: 12 }}>
                {allowSplit ? "⚠ Đơn có thể bị xé ra nhiều xưởng — label và phí xử lý sẽ bị tính nhiều lần."
                            : "Tick 1 món → cả đơn cùng chuyển."}
              </span>
            </div>
            <div ref={vr.ref} style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, overflow: "auto", maxHeight: TBL_H_SHORT }}>
              <table style={{ fontSize: 12 }}><thead><tr>
                <th style={{ width: 30 }}><input type="checkbox" checked={sel.size === filtered.length && filtered.length > 0} onChange={() => selectAll(filtered)} /></th>
                <th>Order Code</th><th>SKU IMG</th><th>SKU Xưởng</th><th style={{ minWidth: 140 }}>{"Sản phẩm"}</th><th>Size</th><th>Color</th>
                <th style={{ borderLeft: "2px solid " + T.ac }}>{"Xưởng"}</th><th>Label</th>
                <th style={{ textAlign: "right", borderLeft: "2px solid " + T.w }} title="PaytoSupplier">PaytoSup</th>
                <th style={{ textAlign: "right" }} title="Label Cost (1 per order)">Label</th>
                <th style={{ textAlign: "right", fontWeight: 600 }} title="CP = PaytoSup + Label/items">CP</th>
                <th style={{ borderLeft: "2px solid " + T.w }}>Rank</th><th style={{ minWidth: 200 }}>{"Lý do (tổng order)"}</th><th>Email</th>
              </tr></thead><tbody>
                <Spacer h={vr.padTop} cols={ORD_COLS} />
                {filtered.slice(vr.start, vr.end).map((o, j) => {
                  const i = vr.start + j;   // giữ nguyên chỉ số tuyệt đối để ô chọn không lệch dòng
                  return (
                  <tr className="vrow" key={i} style={{ background: sel.has(i) ? "rgba(59,130,246,.08)" : o.sup === "UNKNOWN" ? "rgba(239,68,68,.06)" : "" }}>
                    <td><input type="checkbox" checked={sel.has(i)} onChange={() => toggleSel(i)} /></td>
                    <td style={{ fontSize: 10, fontFamily: "monospace" }}>{o.orderCode}{o.orderItemCount > 1 && <span style={{ fontSize: 8, color: T.w, marginLeft: 2 }}>{"×" + o.orderItemCount}</span>}</td>
                    <td style={{ fontFamily: "monospace", fontSize: 9, color: T.tm }}>{o.sku}</td>
                    <td style={{ fontFamily: "monospace", fontSize: 9, color: o.supSku ? T.ac : T.td }}>{o.supSku || "\u2014"}</td>
                    <td style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.prodName}</td>
                    <td><span className="b bi" style={{ fontSize: 9 }}>{o.size}</span></td>
                    <td style={{ fontSize: 10 }}>{o.color}</td>
                    <td style={{ borderLeft: "2px solid " + T.ac, fontWeight: 600, color: o.sup === "UNKNOWN" ? T.dg : o.manual ? T.w : T.ac }}
                        title={o.manual ? "Đã đẩy tay sang xưởng này" : ""}>{(o.manual ? "✋ " : "") + o.sup}</td>
                    <td>{o.lbl && <span className="b" style={{ background: ltColor(o.lbl) + "22", color: ltColor(o.lbl), fontSize: 8 }}>{o.lbl}</span>}</td>
                    <td className="m" style={{ textAlign: "right", borderLeft: "2px solid " + T.w, color: T.tm }}>{o.payToSup ? "$" + o.payToSup.toFixed(2) : "\u2014"}</td>
                    <td className="m" style={{ textAlign: "right", color: T.tm }}>{o.labelCost ? "$" + o.labelCost.toFixed(2) : "\u2014"}</td>
                    <td className="m" style={{ textAlign: "right", fontWeight: 600 }}>{o.cost ? "$" + o.cost.toFixed(2) : "\u2014"}</td>
                    <td style={{ borderLeft: "2px solid " + T.w, fontSize: 10, fontWeight: 600, color: o.rank === 1 ? T.ac : o.rank <= 3 ? T.w : T.tm }}>{o.rank > 0 ? "#" + o.rank + "/" + o.totalSc : "\u2014"}</td>
                    <td style={{ fontSize: 9, color: T.tm, whiteSpace: "nowrap" }}>
                      {o.err ? <span style={{ color: T.dg }}>{o.err}</span>
                      : o.scenarios?.slice(0, 3).map((s, si) => (
                        <span key={si} style={{ marginRight: 6, color: si === 0 ? T.ac : T.tm }}>
                          {(si + 1) + ". " + s.sup + " "}<span style={{ color: ltColor(s.lbl), fontSize: 8 }}>{s.lbl}</span>{" $" + s.cost.toFixed(2)}
                        </span>
                      ))}
                    </td>
                    <td style={{ fontSize: 9, color: T.tm }}>{o.emailSeller}</td>
                  </tr>
                  );
                })}
                <Spacer h={vr.padBottom} cols={ORD_COLS} />
              </tbody>
              {/* Dòng tổng — dán ở đáy bảng, luôn nhìn thấy khi cuộn */}
              <tfoot><tr>
                <td colSpan={9} style={{ ...TOT_TD, fontWeight: 600 }}>
                  {"TỔNG · " + filtered.length + " món · " + nOrders + " đơn"}
                  {sel.size > 0 && <span style={{ color: T.w, marginLeft: 10, fontWeight: 500 }}>
                    {"(đang chọn " + sel.size + " món: PaytoSup " + money(totSel.pay) + " · Label " + money(totSel.lbl) + " · CP " + money(totSel.cp) + ")"}
                  </span>}
                </td>
                <td className="m" style={{ ...TOT_TD, textAlign: "right", fontWeight: 700, borderLeft: "2px solid " + T.w }}>{money(totAll.pay)}</td>
                <td className="m" style={{ ...TOT_TD, textAlign: "right", fontWeight: 700 }}>{money(totAll.lbl)}</td>
                <td className="m" style={{ ...TOT_TD, textAlign: "right", fontWeight: 700, color: T.ac }}>{money(totAll.cp)}</td>
                <td colSpan={3} style={TOT_TD} />
              </tr></tfoot></table>
            </div>
          </div>}

          {tab === "supplier" && <div>
            <FilterBar {...filterProps} />
            {supKeys.filter(s => s !== "UNKNOWN").map(supName => {
              const items = applyFilters(grouped[supName] || []); if (!items.length) return null;
              const hasTpl = !!routeCfg.tpls?.[supName];
              return <div key={supName} style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, padding: 16, marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div>
                    <span style={{ fontSize: 16, fontWeight: 600 }}>{supName}</span>
                    <span style={{ fontSize: 13, color: T.tm, marginLeft: 8 }}>{"(" + items.length + " items)"}</span>
                    {hasTpl && <span style={{ fontSize: 10, color: T.ac, marginLeft: 8 }}>{"· Template: " + supName}</span>}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="bp2" onClick={() => doCopyTSV(supName)} style={{ fontSize: 12 }}>{"📋 Copy TSV"}</button>
                    <button className="bg2" onClick={() => doExport(supName)} style={{ fontSize: 12 }}>{"📥 Export .xlsx"}</button>
                  </div>
                </div>
                <div style={{ overflow: "auto", maxHeight: 300 }}>
                  {hasTpl ? (() => {
                    const tpl = routeCfg.tpls[supName]; const hdr = tpl.h || []; const mapping = tpl.m || [];
                    return <table style={{ fontSize: 10 }}><thead><tr>{hdr.map((h, hi) => <th key={hi} style={{ whiteSpace: "nowrap", fontSize: 9 }}>{h}</th>)}</tr></thead>
                    <tbody>{items.map((o, ri) => <tr key={ri}>{mapping.map((c, ci) => <td key={ci} style={{ fontSize: 9, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mapCell(c, o.row, o)}</td>)}</tr>)}</tbody></table>
                  })() : <table style={{ fontSize: 10 }}><thead><tr>
                    <th>ORDER</th><th>SKU Xưởng</th><th>PRODUCT</th><th>SIZE</th><th>COLOR</th><th>LABEL</th>
                    <th style={{ textAlign: "right" }}>PaytoSup</th><th style={{ textAlign: "right" }}>Label</th><th style={{ textAlign: "right" }}>CP</th><th>EMAIL</th>
                  </tr></thead><tbody>{items.map((o, ri) => <tr key={ri}>
                    <td style={{ fontSize: 9 }}>{o.orderCode}</td><td style={{ fontSize: 9, fontFamily: "monospace", color: o.supSku ? T.ac : T.td }}>{o.supSku || o.sku}</td>
                    <td style={{ fontSize: 9 }}>{o.prodName}</td><td><span className="b bi" style={{ fontSize: 8 }}>{o.size}</span></td>
                    <td style={{ fontSize: 9 }}>{o.color}</td>
                    <td><span className="b" style={{ background: ltColor(o.lbl) + "22", color: ltColor(o.lbl), fontSize: 8 }}>{o.lbl}</span></td>
                    <td className="m" style={{ textAlign: "right", color: T.tm }}>{fmt(o.payToSup)}</td>
                    <td className="m" style={{ textAlign: "right", color: T.tm }}>{fmt(o.labelCost)}</td>
                    <td className="m" style={{ textAlign: "right", color: T.ac, fontWeight: 600 }}>{fmt(o.cost)}</td>
                    <td style={{ fontSize: 9, color: T.tm }}>{o.emailSeller}</td>
                  </tr>)}</tbody>
                  {/* Tổng phải trả cho riêng xưởng này */}
                  {(() => { const t = sumRows(items); const nO = new Set(items.map(o => o.orderCode)).size; return (
                    <tfoot><tr>
                      <td colSpan={6} style={{ ...TOT_TD, fontWeight: 600, fontSize: 11 }}>{"TỔNG " + supName + " · " + items.length + " món · " + nO + " đơn"}</td>
                      <td className="m" style={{ ...TOT_TD, textAlign: "right", fontWeight: 700 }}>{money(t.pay)}</td>
                      <td className="m" style={{ ...TOT_TD, textAlign: "right", fontWeight: 700 }}>{money(t.lbl)}</td>
                      <td className="m" style={{ ...TOT_TD, textAlign: "right", fontWeight: 700, color: T.ac }}>{money(t.cp)}</td>
                      <td style={TOT_TD} />
                    </tr></tfoot>) })()}
                  </table>}
                </div>
              </div>
            })}
          </div>}

          {tab === "label" && <div>
            <div style={{ fontSize: 14, color: T.tm, marginBottom: 10 }}>{"Đơn cần lưu ý set địa chỉ label"}</div>
            <FilterBar {...filterProps} />
            {labelWarnings.length === 0 ? (
              <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, padding: 30, textAlign: "center", color: T.tm }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{"\u2705"}</div>
                <div>{"Không có đơn cần lưu ý. (" + warehouseNotes.length + " lưu ý)"}</div>
              </div>
            ) : (() => {
              const wFiltered = applyFilters(labelWarnings);
              return <div>
                <SelectBar list={wFiltered} {...selectProps} />
                <div style={{ background: T.sf, border: "1px solid " + T.w, borderRadius: 10, overflow: "auto", maxHeight: TBL_H_SHORT }}>
                  <table style={{ fontSize: 12 }}><thead><tr>
                    <th style={{ width: 30 }}><input type="checkbox" checked={sel.size === wFiltered.length && wFiltered.length > 0} onChange={() => selectAll(wFiltered)} /></th>
                    <th>Order</th><th>SKU</th><th style={{ minWidth: 140 }}>{"Sản phẩm"}</th><th>{"Xưởng"}</th>
                    <th style={{ borderLeft: "2px solid " + T.w, minWidth: 200 }}>{"\u26A0 Lưu ý"}</th><th>{"Địa chỉ"}</th><th>Email</th>
                  </tr></thead><tbody>
                    {wFiltered.map((o, i) => (
                      <tr key={i} style={{ background: sel.has(i) ? "rgba(59,130,246,.08)" : "" }}>
                        <td><input type="checkbox" checked={sel.has(i)} onChange={() => toggleSel(i)} /></td>
                        <td style={{ fontSize: 10, fontFamily: "monospace" }}>{o.orderCode}</td>
                        <td style={{ fontSize: 10, fontFamily: "monospace" }}>{o.sku}</td>
                        <td style={{ fontSize: 10 }}>{o.prodName}</td>
                        <td style={{ fontWeight: 600, color: T.ac }}>{o.sup}</td>
                        <td style={{ borderLeft: "2px solid " + T.w, fontSize: 10, color: T.w }}>
                          {o.notes.map((n, ni) => <div key={ni}>{(n.noteType === "LABEL_ADDRESS" ? "\uD83D\uDCCD " : "\uD83D\uDCDD ") + n.note}</div>)}
                        </td>
                        <td style={{ fontSize: 10, color: T.tm }}>{o.notes.map(n => n.warehouseOverride).filter(Boolean).join(", ") || "\u2014"}</td>
                        <td style={{ fontSize: 9, color: T.tm }}>{o.emailSeller}</td>
                      </tr>
                    ))}
                  </tbody></table>
                </div>
              </div>
            })()}
          </div>}
        </div>
      )}
    </div>
  );
}
