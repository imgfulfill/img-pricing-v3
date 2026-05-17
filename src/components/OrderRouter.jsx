import React, { useState, useMemo, useCallback, useEffect } from "react";
import * as XLSX from "xlsx";
import { useData } from "../context/DataContext";
import { T, routeOneSKU, mapCell, getScenarios, ltColor, fmt, findPrices, matchSupplierProduct, checkStockAvailability } from "../lib/utils";

let _persistedOrders = [];

export default function OrderRouter() {
  const { skuImg, suppliers, products, prices, params, labelTiers, compPrices, supStock, routeCfg, prodMap, warehouseNotes } = useData();
  const [orders, setOrders] = useState(_persistedOrders);
  const [tab, setTab] = useState("table");
  const [fSup, setFSup] = useState(""); const [q, setQ] = useState("");
  const [fProd, setFProd] = useState(""); const [fSize, setFSize] = useState(""); const [fColor, setFColor] = useState(""); const [fLbl, setFLbl] = useState("");
  const [showPaste, setShowPaste] = useState(_persistedOrders.length === 0);
  const [sel, setSel] = useState(new Set());

  useEffect(() => { _persistedOrders = orders }, [orders]);

  // Resolve supplier SKU — handles YolCol print-area matching
  const resolveSupSku = (skuCode, supName, skData, orderRow) => {
    const stock = supStock[supName];
    if (!stock?.rows?.length) return "";
    const resolver = (routeCfg.skuResolvers || {})[supName];
    if (!resolver) return "";
    const prodCol = resolver.productCol; const skuCol = resolver.skuCol;
    const sideCol = resolver.sideCol; const sizeCol = resolver.sizeCol; const colorCol = resolver.colorCol;
    if (!prodCol || !skuCol) return "";
    const skPrintArea = (skData?.printArea || "").toLowerCase();
    const isBoth = skPrintArea.includes("both");
    let printSide = "Front"; // default
    if (isBoth) { printSide = "Front&Back" }
    else if (orderRow) {
      const hasFront = !!(orderRow[33] || "").trim(); // Front Design URL
      const hasBack = !!(orderRow[34] || "").trim();  // Back Design URL
      if (hasBack && !hasFront) printSide = "Back";
      else if (hasFront && hasBack) printSide = "Front&Back";
      else printSide = "Front";
    }
    const matches = stock.rows.filter(row => {
      if (!matchSupplierProduct(skData?.product || "", prodCol, row)) return false;
      if (sizeCol) { const rs = (row[sizeCol] || "").toUpperCase().trim(); const ss = (skData?.size || "").toUpperCase().trim(); if (rs && ss && rs !== ss) return false }
      if (colorCol) { const rc = (row[colorCol] || "").toLowerCase().trim(); const sc = (skData?.color || "").toLowerCase().trim(); if (rc && sc && !rc.includes(sc) && !sc.includes(rc)) return false }
      // Match print area / side column if configured
      if (sideCol) {
        const rowSide = (row[sideCol] || "").toLowerCase().trim();
        if (rowSide) {
          const ps = printSide.toLowerCase();
          if (ps === "front&back" || ps === "front&back") {
            if (!rowSide.includes("both") && !rowSide.includes("front&back") && !rowSide.includes("front & back")) return false;
          } else if (ps === "back") {
            if (!rowSide.includes("back") || rowSide.includes("front")) return false;
          } else { // front
            if (rowSide.includes("back") && !rowSide.includes("front")) return false;
            if (rowSide.includes("both") || rowSide.includes("front&back")) return false;
          }
        }
      }
      return true;
    });
    if (matches.length > 0 && matches[0][skuCol]) {
      let sku = matches[0][skuCol];
      if (resolver.upper) sku = sku.toUpperCase();
      return sku;
    }
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
    const batch = [];
    const stockData = routeCfg.stockData || {};
    const mode = routeCfg.labelMode || "BLENDED";
    lines.forEach(l => {
      const c = l.split("\t");
      if (c.length < 30) return; // Need at least 30 cols for valid 49-col order
      const sku = (c[5] || "").trim();
      if (!sku || sku.length < 5 || sku.includes("http")) return; // SKU validation
      const orderCode = (c[0] || "").trim();
      if (!orderCode || orderCode.includes("http")) return; // Order code validation
      const rt = routeOneSKU(sku, skuImg, products, suppliers, prices, params, labelTiers, compPrices, supStock, routeCfg, prodMap);
      const is2S = (rt.sk?.printArea || "").toLowerCase().includes("both");
      const allSc = getScenarios(rt.sk?.product || "", rt.sk?.size || "", is2S ? "2S" : "1S", products, suppliers, prices, params, labelTiers, compPrices);
      // Apply label mode filter (same as routeOneSKU)
      let modeSc = allSc;
      if (mode === "EXP_ONLY") modeSc = allSc.filter(s => s.lbl === "Exp" || s.lbl === "Self" || s.lbl === "Bld");
      else if (mode === "CHEAP_ONLY") modeSc = allSc.filter(s => s.lbl === "Cheap" || s.lbl === "Bld" || s.lbl === "Self");
      if (modeSc.length === 0) modeSc = allSc;
      // Stock verification
      const skColor = rt.sk?.color || c[30] || "";
      const skSize = rt.sk?.size || c[29] || "";
      let sc = modeSc.filter(s => checkStockAvailability(rt.sk?.product || "", skSize, skColor, s.sup, stockData));
      if (sc.length === 0) sc = modeSc;
      const bestSc = sc[0] || null;
      const actualSup = bestSc?.sup || rt.sup || "UNKNOWN";
      const actualLbl = bestSc?.lbl || rt.lbl || "";
      const actualCost = bestSc?.cost || rt.cost || 0;
      const rank = sc.findIndex(s => s.sup === actualSup && s.lbl === actualLbl) + 1;
      const supSku = resolveSupSku(sku, actualSup, rt.sk, c);
      let payToSup = 0, labelCost = 0;
      if (actualSup && actualCost > 0) {
        const matchedPr = findPrices(prices, rt.sk?.product || "", rt.sk?.size || "")
          .find(p => { const sup = suppliers.find(s => s.id === p.supplierId || s.name === p.supplierId); return sup && sup.name === actualSup });
        if (matchedPr) {
          payToSup = matchedPr.totalCost;
          if (is2S && matchedPr.cost2nd != null) payToSup += matchedPr.cost2nd;
          labelCost = Math.round((actualCost - payToSup) * 100) / 100;
          payToSup = Math.round(payToSup * 100) / 100;
        }
      }
      batch.push({ row: c, sku, sup: actualSup, lbl: actualLbl, cost: actualCost, rt, supSku,
        orderCode, prodName: c[4] || rt.sk?.product || sku,
        firstName: c[19] || "", lastName: c[20] || "", emailSeller: c[2] || "",
        color: skColor, size: skSize,
        rank, totalSc: sc.length, scenarios: sc.slice(0, 3), err: rt.err || null,
        payToSup, labelCost });
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
  const selectAll = (list) => { if (sel.size === list.length) setSel(new Set()); else setSel(new Set(list.map((_, i) => i))) };
  const copySelOrders = (list) => {
    const codes = list.filter((_, i) => sel.has(i)).map(o => o.orderCode).filter(Boolean);
    if (!codes.length) return alert("Chọn ít nhất 1 đơn");
    navigator.clipboard.writeText(codes.join("\n")).then(() => alert("Copied " + codes.length + " mã đơn")).catch(() => alert("Clipboard fail"));
  };

  const doExport = (supName) => {
    const items = grouped[supName]; if (!items?.length) return;
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

  const FilterBar = ({ extra }) => (
    <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap", fontSize: 10 }}>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm SKU / đơn / email..." style={{ flex: 1, minWidth: 150, fontSize: 10 }} />
      <input value={fProd} onChange={e => setFProd(e.target.value)} placeholder="Product..." style={{ width: 120, fontSize: 10 }} />
      <select value={fSize} onChange={e => setFSize(e.target.value)} style={{ width: 70, fontSize: 10 }}><option value="">Size</option>{sizes.map(s => <option key={s}>{s}</option>)}</select>
      <input value={fColor} onChange={e => setFColor(e.target.value)} placeholder="Color..." style={{ width: 80, fontSize: 10 }} />
      <select value={fLbl} onChange={e => setFLbl(e.target.value)} style={{ width: 80, fontSize: 10 }}><option value="">Label</option>{labels.map(l => <option key={l}>{l}</option>)}</select>
      {extra}
    </div>
  );
  const SelectBar = ({ list }) => (
    <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center", fontSize: 10 }}>
      <button className="bg2" onClick={() => selectAll(list)} style={{ fontSize: 9 }}>{sel.size === list.length && list.length > 0 ? "Bỏ chọn" : "Chọn tất cả (" + list.length + ")"}</button>
      <span style={{ color: T.tm }}>{sel.size + " đã chọn"}</span>
      <button className="bp2" onClick={() => copySelOrders(list)} style={{ fontSize: 9 }} disabled={sel.size === 0}>{"📋 Copy mã đơn (" + sel.size + ")"}</button>
    </div>
  );

  return (
    <div className="fade">
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{"Phân đơn"}</h2>
      {showPaste || orders.length === 0 ? (
        <div>
          <div style={{ fontSize: 12, color: T.tm, marginBottom: 10 }}>{"Paste đơn hàng từ backend IMG (49 cột TSV)."}</div>
          <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, padding: 16 }}>
            <textarea rows={10} style={{ width: "100%", fontSize: 10, fontFamily: "monospace" }} placeholder={"Paste đơn hàng TSV..."} id="orderPasteTa" />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="bp2" onClick={() => { const ta = document.getElementById("orderPasteTa"); if (ta?.value) doPaste(ta.value) }} style={{ fontSize: 12, padding: "6px 16px" }}>{"🚀 Route đơn hàng"}</button>
              <div style={{ fontSize: 10, color: T.tm, display: "flex", alignItems: "center" }}>{skuImg.length + " SKU · " + (routeCfg.labelMode || "BLENDED")}</div>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <div style={{ background: T.sf, border: "1px solid " + (fSup === "" ? T.p : T.bd), borderRadius: 8, padding: "8px 14px", cursor: "pointer" }} onClick={() => setFSup("")}>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.ac }}>{orders.length}</div><div style={{ fontSize: 10, color: T.tm }}>{"Tổng đơn"}</div>
            </div>
            {supKeys.map(s => (
              <div key={s} onClick={() => setFSup(fSup === s ? "" : s)} style={{ background: T.sf, border: "1px solid " + (fSup === s ? T.p : T.bd), borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: s === "UNKNOWN" ? T.dg : T.tx }}>{grouped[s].length}</div><div style={{ fontSize: 10, color: T.tm }}>{s}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 10, alignItems: "center", flexWrap: "wrap" }}>
            {[["table", "📋 Bảng"], ["supplier", "🏭 Tabs xưởng"], ["label", "📍 Set địa chỉ Label"]].map(([id, l]) =>
              <button key={id} className={tab === id ? "bp2" : "bg2"} onClick={() => { setTab(id); setSel(new Set()) }} style={{ fontSize: 11 }}>{l}</button>
            )}
            <button className="bg2" onClick={() => setShowPaste(true)} style={{ fontSize: 11 }}>{"📋 Paste mới"}</button>
            {supKeys.filter(s => s !== "UNKNOWN").map(s => (
              <button key={s} className="bp2" onClick={() => doExport(s)} style={{ fontSize: 10 }}>{"📥 " + s + " (" + grouped[s].length + ")"}</button>
            ))}
          </div>

          {tab === "table" && <div>
            <FilterBar />
            <SelectBar list={filtered} />
            <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, overflow: "auto", maxHeight: "55vh" }}>
              <table style={{ fontSize: 10 }}><thead><tr>
                <th style={{ width: 30 }}><input type="checkbox" checked={sel.size === filtered.length && filtered.length > 0} onChange={() => selectAll(filtered)} /></th>
                <th>Order Code</th><th>SKU IMG</th><th>SKU Xưởng</th><th style={{ minWidth: 140 }}>{"Sản phẩm"}</th><th>Size</th><th>Color</th>
                <th style={{ borderLeft: "2px solid " + T.ac }}>{"Xưởng"}</th><th>Label</th>
                <th style={{ textAlign: "right", borderLeft: "2px solid " + T.w }} title="PaytoSupplier = Base Cost + Handling Fee">PaytoSup</th>
                <th style={{ textAlign: "right" }} title="Label Cost = Chi phí Label ship">Label Cost</th>
                <th style={{ textAlign: "right", fontWeight: 600 }} title="CP = PaytoSup + Label Cost">CP</th>
                <th style={{ borderLeft: "2px solid " + T.w }}>Rank</th><th style={{ minWidth: 200 }}>{"Lý do"}</th><th>Email Seller</th>
              </tr></thead><tbody>
                {filtered.map((o, i) => (
                  <tr key={i} style={{ background: sel.has(i) ? "rgba(59,130,246,.08)" : o.sup === "UNKNOWN" ? "rgba(239,68,68,.06)" : "" }}>
                    <td><input type="checkbox" checked={sel.has(i)} onChange={() => toggleSel(i)} /></td>
                    <td style={{ fontSize: 9, fontFamily: "monospace" }}>{o.orderCode}</td>
                    <td style={{ fontFamily: "monospace", fontSize: 8, color: T.tm }}>{o.sku}</td>
                    <td style={{ fontFamily: "monospace", fontSize: 8, color: o.supSku ? T.ac : T.td }}>{o.supSku || "\u2014"}</td>
                    <td style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.prodName}</td>
                    <td><span className="b bi" style={{ fontSize: 8 }}>{o.size}</span></td>
                    <td style={{ fontSize: 9 }}>{o.color}</td>
                    <td style={{ borderLeft: "2px solid " + T.ac, fontWeight: 600, color: o.sup === "UNKNOWN" ? T.dg : T.ac }}>{o.sup}</td>
                    <td>{o.lbl && <span className="b" style={{ background: ltColor(o.lbl) + "22", color: ltColor(o.lbl), fontSize: 7 }}>{o.lbl}</span>}</td>
                    <td className="m" style={{ textAlign: "right", borderLeft: "2px solid " + T.w, color: T.tm }}>{o.payToSup ? "$" + o.payToSup.toFixed(2) : "\u2014"}</td>
                    <td className="m" style={{ textAlign: "right", color: T.tm }}>{o.labelCost ? "$" + o.labelCost.toFixed(2) : "\u2014"}</td>
                    <td className="m" style={{ textAlign: "right", fontWeight: 600 }}>{o.cost ? "$" + o.cost.toFixed(2) : "\u2014"}</td>
                    <td style={{ borderLeft: "2px solid " + T.w, fontSize: 9, fontWeight: 600, color: o.rank === 1 ? T.ac : o.rank <= 3 ? T.w : T.tm }}>{o.rank > 0 ? "#" + o.rank + "/" + o.totalSc : "\u2014"}</td>
                    <td style={{ fontSize: 8, color: T.tm, whiteSpace: "nowrap" }}>
                      {o.err ? <span style={{ color: T.dg }}>{o.err}</span>
                      : o.scenarios?.slice(0, 3).map((s, si) => (
                        <span key={si} style={{ marginRight: 6, color: si === 0 ? T.ac : T.tm }}>
                          {(si + 1) + ". " + s.sup + " "}<span style={{ color: ltColor(s.lbl), fontSize: 7 }}>{s.lbl}</span>{" $" + s.cost.toFixed(2)}
                        </span>
                      ))}
                    </td>
                    <td style={{ fontSize: 8, color: T.tm }}>{o.emailSeller}</td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          </div>}

          {tab === "supplier" && <div>
            <FilterBar />
            {supKeys.filter(s => s !== "UNKNOWN").map(supName => {
              const items = applyFilters(grouped[supName] || []); if (!items.length) return null;
              const hasTpl = !!routeCfg.tpls?.[supName];
              return <div key={supName} style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, padding: 16, marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{supName}</span>
                    <span style={{ fontSize: 11, color: T.tm, marginLeft: 8 }}>{"(" + items.length + " đơn)"}</span>
                    {hasTpl && <span style={{ fontSize: 9, color: T.ac, marginLeft: 8 }}>{"· Template: " + supName}</span>}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="bp2" onClick={() => doCopyTSV(supName)} style={{ fontSize: 10 }}>{"📋 Copy TSV"}</button>
                    <button className="bg2" onClick={() => doExport(supName)} style={{ fontSize: 10 }}>{"📥 Export .xlsx"}</button>
                  </div>
                </div>
                <div style={{ overflow: "auto", maxHeight: 300 }}>
                  {hasTpl ? (() => {
                    const tpl = routeCfg.tpls[supName]; const hdr = tpl.h || []; const mapping = tpl.m || [];
                    return <table style={{ fontSize: 9 }}><thead><tr>{hdr.map((h, hi) => <th key={hi} style={{ whiteSpace: "nowrap", fontSize: 8 }}>{h}</th>)}</tr></thead>
                    <tbody>{items.map((o, ri) => <tr key={ri}>{mapping.map((c, ci) => <td key={ci} style={{ fontSize: 8, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mapCell(c, o.row, o)}</td>)}</tr>)}</tbody></table>
                  })() : <table style={{ fontSize: 9 }}><thead><tr>
                    <th>ORDER</th><th>SKU Xưởng</th><th>PRODUCT</th><th>SIZE</th><th>COLOR</th><th>LABEL</th>
                    <th style={{ textAlign: "right" }}>PaytoSup</th><th style={{ textAlign: "right" }}>Label</th><th style={{ textAlign: "right" }}>CP</th><th>EMAIL</th>
                  </tr></thead><tbody>{items.map((o, ri) => <tr key={ri}>
                    <td style={{ fontSize: 8 }}>{o.orderCode}</td><td style={{ fontSize: 8, fontFamily: "monospace", color: o.supSku ? T.ac : T.td }}>{o.supSku || o.sku}</td>
                    <td style={{ fontSize: 8 }}>{o.prodName}</td><td><span className="b bi" style={{ fontSize: 7 }}>{o.size}</span></td>
                    <td style={{ fontSize: 8 }}>{o.color}</td>
                    <td><span className="b" style={{ background: ltColor(o.lbl) + "22", color: ltColor(o.lbl), fontSize: 7 }}>{o.lbl}</span></td>
                    <td className="m" style={{ textAlign: "right", color: T.tm }}>{fmt(o.payToSup)}</td>
                    <td className="m" style={{ textAlign: "right", color: T.tm }}>{fmt(o.labelCost)}</td>
                    <td className="m" style={{ textAlign: "right", color: T.ac, fontWeight: 600 }}>{fmt(o.cost)}</td>
                    <td style={{ fontSize: 8, color: T.tm }}>{o.emailSeller}</td>
                  </tr>)}</tbody></table>}
                </div>
              </div>
            })}
          </div>}

          {tab === "label" && <div>
            <div style={{ fontSize: 12, color: T.tm, marginBottom: 10 }}>{"Đơn cần lưu ý set địa chỉ label"}</div>
            <FilterBar />
            {labelWarnings.length === 0 ? (
              <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, padding: 30, textAlign: "center", color: T.tm }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{"\u2705"}</div>
                <div>{"Không có đơn cần lưu ý. (" + warehouseNotes.length + " lưu ý đã khai báo)"}</div>
              </div>
            ) : (() => {
              const wFiltered = applyFilters(labelWarnings);
              return <div>
                <SelectBar list={wFiltered} />
                <div style={{ background: T.sf, border: "1px solid " + T.w, borderRadius: 10, overflow: "auto", maxHeight: "55vh" }}>
                  <table style={{ fontSize: 10 }}><thead><tr>
                    <th style={{ width: 30 }}><input type="checkbox" checked={sel.size === wFiltered.length && wFiltered.length > 0} onChange={() => selectAll(wFiltered)} /></th>
                    <th>Order</th><th>SKU</th><th style={{ minWidth: 140 }}>{"Sản phẩm"}</th><th>{"Xưởng"}</th>
                    <th style={{ borderLeft: "2px solid " + T.w, minWidth: 200 }}>{"\u26A0 Lưu ý"}</th><th style={{ minWidth: 150 }}>{"Địa chỉ Override"}</th><th>Email</th>
                  </tr></thead><tbody>
                    {wFiltered.map((o, i) => (
                      <tr key={i} style={{ background: sel.has(i) ? "rgba(59,130,246,.08)" : "" }}>
                        <td><input type="checkbox" checked={sel.has(i)} onChange={() => toggleSel(i)} /></td>
                        <td style={{ fontSize: 9, fontFamily: "monospace" }}>{o.orderCode}</td>
                        <td style={{ fontSize: 9, fontFamily: "monospace" }}>{o.sku}</td>
                        <td style={{ fontSize: 9 }}>{o.prodName}</td>
                        <td style={{ fontWeight: 600, color: T.ac }}>{o.sup}</td>
                        <td style={{ borderLeft: "2px solid " + T.w, fontSize: 9, color: T.w }}>
                          {o.notes.map((n, ni) => <div key={ni}>{(n.noteType === "LABEL_ADDRESS" ? "\uD83D\uDCCD " : "\uD83D\uDCDD ") + n.note}</div>)}
                        </td>
                        <td style={{ fontSize: 9, color: T.tm }}>{o.notes.map(n => n.warehouseOverride).filter(Boolean).join(", ") || "\u2014"}</td>
                        <td style={{ fontSize: 8, color: T.tm }}>{o.emailSeller}</td>
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
