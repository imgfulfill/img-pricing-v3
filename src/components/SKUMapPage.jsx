import React, { useState, useMemo } from "react";
import { useData } from "../context/DataContext";
import { T, szOrd, matchSupplierProduct } from "../lib/utils";

export default function SKUMapPage() {
  const { skuImg, suppliers, supStock, routeCfg } = useData();
  const [q, setQ] = useState(""); const [fSize, setFSize] = useState(""); const [fArea, setFArea] = useState("");
  const [fColor, setFColor] = useState(""); const [fStatus, setFStatus] = useState("");
  const activeSups = suppliers.filter(s => s.active && !s.api);

  const resolveSupSku = (sk, supName) => {
    const stock = supStock[supName];
    if (!stock?.rows?.length || !stock?.hdr?.length) return null;
    const resolver = (routeCfg.skuResolvers || {})[supName];
    if (!resolver) return null;
    const prodCol = resolver.productCol; const skuCol = resolver.skuCol;
    const sideCol = resolver.sideCol; const sizeCol = resolver.sizeCol; const colorCol = resolver.colorCol;
    if (!prodCol) return null;
    const skPrintArea = (sk.printArea || "").toLowerCase();
    const isBoth = skPrintArea.includes("both");
    const matches = stock.rows.filter(row => {
      // EXACT product matching — supplier product must be contained in IMG product name
      if (!matchSupplierProduct(sk.product, prodCol, row)) return false;
      if (sizeCol) { const rs = (row[sizeCol] || "").toUpperCase().trim(); const ss = (sk.size || "").toUpperCase().trim(); if (rs && ss && rs !== ss) return false }
      if (colorCol) { const rc = (row[colorCol] || "").toLowerCase().trim(); const sc = (sk.color || "").toLowerCase().trim(); if (rc && sc && !rc.includes(sc) && !sc.includes(rc)) return false }
      // Print area matching for sideCol
      if (sideCol) {
        const rowSide = (row[sideCol] || "").toLowerCase().trim();
        if (rowSide) {
          if (isBoth) { if (!rowSide.includes("both") && !rowSide.includes("front&back")) return false }
          // For one-side, accept Front or Back rows (will be resolved at order time by Design URL)
        }
      }
      return true;
    });
    if (matches.length > 0) {
      if (skuCol && matches[0][skuCol]) { let sku = matches[0][skuCol]; if (resolver.upper) sku = sku.toUpperCase(); return sku }
      return "\u2713";
    }
    return null;
  };

  const data = useMemo(() => skuImg.map((r, i) => {
    const sk = { ...r, product: r.product || "", size: r.size || "", color: r.color || "", printArea: r.printArea || "" };
    const mapping = {}; let hasAnySku = false;
    activeSups.forEach(s => { const result = resolveSupSku(sk, s.name); mapping[s.name] = result || "\u2014"; if (result) hasAnySku = true });
    return { ...sk, _i: i, mapping, hasAnySku };
  }).filter(r => {
    if (q && !(r.sku + " " + r.product + " " + r.color).toLowerCase().includes(q.toLowerCase())) return false;
    if (fSize && r.size !== fSize) return false; if (fArea && r.printArea !== fArea) return false;
    if (fColor && !r.color.toLowerCase().includes(fColor.toLowerCase())) return false;
    if (fStatus === "mapped" && !r.hasAnySku) return false; if (fStatus === "unmapped" && r.hasAnySku) return false;
    return true;
  }), [skuImg, supStock, activeSups, routeCfg, q, fSize, fArea, fColor, fStatus]);

  const sizes = [...new Set(skuImg.map(s => s.size || "").filter(Boolean))].sort((a, b) => szOrd(a) - szOrd(b));
  const areas = [...new Set(skuImg.map(s => s.printArea || "").filter(Boolean))].sort();
  const colors = [...new Set(skuImg.map(s => s.color || "").filter(Boolean))].sort();
  const mappedCount = data.filter(r => r.hasAnySku).length;

  return (
    <div className="fade">
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>SKU Mapping</h2>
      <div style={{ fontSize: 12, color: T.tm, marginBottom: 10 }}>{"IMG Product \u2192 SKU per x\u01B0\u1EDFng \u00B7 T\u1EF1 \u0111\u1ED9ng mapping t\u1EEB SKU IMG & SKU X\u01B0\u1EDFng"}</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={"T\u00ECm SKU / s\u1EA3n ph\u1EA9m..."} style={{ flex: 1, minWidth: 200 }} />
        <select value={fSize} onChange={e => setFSize(e.target.value)} style={{ width: 80, fontSize: 10 }}><option value="">Size</option>{sizes.map(s => <option key={s}>{s}</option>)}</select>
        <select value={fColor} onChange={e => setFColor(e.target.value)} style={{ width: 100, fontSize: 10 }}><option value="">Color</option>{colors.map(c => <option key={c}>{c}</option>)}</select>
        <select value={fArea} onChange={e => setFArea(e.target.value)} style={{ width: 110, fontSize: 10 }}><option value="">Print Area</option>{areas.map(a => <option key={a}>{a}</option>)}</select>
        <select value={fStatus} onChange={e => setFStatus(e.target.value)} style={{ width: 130, fontSize: 10 }}>
          <option value="">{"T\u1EA5t c\u1EA3"}</option><option value="mapped">{"\u2713 \u0110\u00E3 map"}</option><option value="unmapped">{"\u2014 Ch\u01B0a map"}</option>
        </select>
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 10, fontSize: 10, color: T.tm }}>
        <span>{data.length + "/" + skuImg.length + " SKU"}</span>
        <span style={{ color: T.ac }}>{"\u2713 " + mappedCount + " \u0111\u00E3 map"}</span>
        <span style={{ color: T.td }}>{"\u2014 " + (data.length - mappedCount) + " ch\u01B0a map"}</span>
      </div>
      <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, overflow: "auto", maxHeight: "62vh" }}>
        <table style={{ fontSize: 9 }}><thead>
          <tr><th colSpan={6} style={{ fontSize: 10 }}>{"S\u1EA2N PH\u1EA8M IMG"}</th>
            {activeSups.map(s => <th key={s.name} style={{ borderLeft: "2px solid " + T.bh, fontSize: 9, textAlign: "center" }}>{"SKU " + s.name.toUpperCase()}</th>)}</tr>
          <tr><th style={{ fontSize: 8 }}>#</th><th style={{ fontSize: 8, minWidth: 110 }}>SKU IMG</th><th style={{ fontSize: 8, minWidth: 180 }}>Product Name</th>
            <th style={{ fontSize: 8 }}>Size</th><th style={{ fontSize: 8 }}>Color</th><th style={{ fontSize: 8 }}>Print Area</th>
            {activeSups.map(s => <th key={s.name + "_2"} style={{ borderLeft: "2px solid " + T.bh }} />)}</tr>
        </thead><tbody>
          {data.map((r, idx) => (
            <tr key={r._i}>
              <td style={{ color: T.td, fontSize: 7 }}>{idx + 1}</td>
              <td style={{ fontFamily: "monospace", fontSize: 8 }}>{r.sku}</td>
              <td style={{ fontSize: 9 }}>{r.product}</td>
              <td><span className="b bi" style={{ fontSize: 7 }}>{r.size}</span></td>
              <td style={{ fontSize: 8 }}>{r.color}</td>
              <td style={{ fontSize: 8, color: T.tm }}>{r.printArea}</td>
              {activeSups.map(s => {
                const val = r.mapping[s.name]; const isSku = val && val !== "\u2713" && val !== "\u2014";
                return <td key={s.name} style={{ borderLeft: "2px solid " + T.bh, fontSize: 8, textAlign: "center", fontFamily: isSku ? "monospace" : undefined, color: val === "\u2713" ? T.ac : isSku ? T.tx : T.td, fontWeight: isSku ? 500 : 400 }}>{val}</td>;
              })}
            </tr>
          ))}
        </tbody></table>
      </div>
    </div>
  );
}
