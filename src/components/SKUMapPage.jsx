import React, { useState, useMemo } from "react";
import { useData } from "../context/DataContext";
import { T, szOrd, matchSupplierProduct, TBL_H } from "../lib/utils";

export default function SKUMapPage() {
  const { skuImg, suppliers, supStock, routeCfg } = useData();
  const [q, setQ] = useState(""); const [fSize, setFSize] = useState(""); const [fArea, setFArea] = useState("");
  const [fColor, setFColor] = useState(""); const [fStatus, setFStatus] = useState("");
  // null = tự quyết: mở khi có lỗi nặng, thu lại khi chỉ là ghi chú nhẹ.
  // Người dùng bấm một lần thì tôn trọng lựa chọn đó.
  const [issuesOpen, setIssuesOpen] = useState(null);
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
  // Bảng này trước đây KHÔNG hề sắp xếp — hiện theo đúng thứ tự lấy từ cơ sở dữ liệu.
  // Nay xếp theo Tên sản phẩm → Size → SKU, giống trang SKU IMG.
  }).sort((a, b) =>
    (a.product || "").localeCompare(b.product || "") ||
    (szOrd(a.size) - szOrd(b.size)) ||
    (a.sku || "").localeCompare(b.sku || "")
  ), [skuImg, supStock, activeSups, routeCfg, q, fSize, fArea, fColor, fStatus]);

  const sizes = [...new Set(skuImg.map(s => s.size || "").filter(Boolean))].sort((a, b) => szOrd(a) - szOrd(b));
  const areas = [...new Set(skuImg.map(s => s.printArea || "").filter(Boolean))].sort();
  const colors = [...new Set(skuImg.map(s => s.color || "").filter(Boolean))].sort();
  const mappedCount = data.filter(r => r.hasAnySku).length;

  // Chẩn đoán: xưởng nào chưa map được và vì sao
  const COL_LABELS = { productCol: "Product Column", sizeCol: "Size Column", colorCol: "Color Column", sideCol: "Side Column", skuCol: "SKU Output Column", variantCol: "Variant Column" };
  const supIssues = activeSups.map(s => {
    const stock = supStock[s.name];
    const res = (routeCfg.skuResolvers || {})[s.name];
    if (!stock?.rows?.length) return { sup: s.name, level: "err", why: "chưa import data SKU xưởng" };
    if (!res) return { sup: s.name, level: "err", why: "chưa cấu hình Column Config" };
    if (!res.productCol) return { sup: s.name, level: "err", why: "Column Config thiếu Product Column" };

    // Tên cột đã khai nhưng KHÔNG có trong data — ô thả xuống ở tab ③ sẽ hiện trống,
    // nhìn như chưa khai, nên lỗi này rất dễ lọt. Chỉ ra đích danh.
    const hdr = stock.hdr || [];
    const badCols = Object.keys(COL_LABELS).filter(k => res[k] && hdr.length && !hdr.includes(res[k]));
    // Cột nào sai thì HỎNG MÃ (product/sku/side/size), cột nào sai chỉ BỎ QUA bước lọc (color/variant)
    const nang = badCols.filter(k => ["productCol", "skuCol", "sideCol", "sizeCol"].includes(k));
    const nhe = badCols.filter(k => !nang.includes(k));
    const li = (ks) => ks.map(k => COL_LABELS[k] + ' = "' + res[k] + '"').join(", ");
    if (nang.length) return { sup: s.name, level: "err", why: "Column Config trỏ tới cột KHÔNG có trong data → sẽ ra SAI mã hoặc không ra mã: " + li(nang) };
    if (nhe.length) return { sup: s.name, level: "warn", why: "cột khai thừa, không có trong data (chỉ bỏ qua bước lọc, mã vẫn đúng): " + li(nhe) };

    if (!res.skuCol) return { sup: s.name, level: "err", why: "chưa chọn SKU Output Column — sẽ chỉ hiện dấu ✓, không ra mã SKU" };

    // Khớp được sản phẩm nhưng không lấy ra mã nào → toàn dấu ✓
    const ticks = data.filter(r => r.mapping[s.name] === "\u2713").length;
    const codes = data.filter(r => { const v = r.mapping[s.name]; return v && v !== "\u2713" && v !== "\u2014" }).length;
    if (ticks > 0 && codes === 0) return { sup: s.name, level: "err", why: "khớp " + ticks + " SKU nhưng không lấy được mã nào (ô SKU trong data đang rỗng) — chỉ hiện dấu ✓" };
    return null;
  }).filter(Boolean);

  return (
    <div className="fade">
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>SKU Mapping</h2>
      <div style={{ fontSize: 14, color: T.tm, marginBottom: 10 }}>{"IMG Product \u2192 SKU per x\u01B0\u1EDFng \u00B7 T\u1EF1 \u0111\u1ED9ng mapping t\u1EEB SKU IMG & SKU X\u01B0\u1EDFng"}</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={"T\u00ECm SKU / s\u1EA3n ph\u1EA9m..."} style={{ flex: 1, minWidth: 200 }} />
        <select value={fSize} onChange={e => setFSize(e.target.value)} style={{ width: 80, fontSize: 12 }}><option value="">Size</option>{sizes.map(s => <option key={s}>{s}</option>)}</select>
        <select value={fColor} onChange={e => setFColor(e.target.value)} style={{ width: 100, fontSize: 12 }}><option value="">Color</option>{colors.map(c => <option key={c}>{c}</option>)}</select>
        <select value={fArea} onChange={e => setFArea(e.target.value)} style={{ width: 110, fontSize: 12 }}><option value="">Print Area</option>{areas.map(a => <option key={a}>{a}</option>)}</select>
        <select value={fStatus} onChange={e => setFStatus(e.target.value)} style={{ width: 130, fontSize: 12 }}>
          <option value="">{"T\u1EA5t c\u1EA3"}</option><option value="mapped">{"\u2713 \u0110\u00E3 map"}</option><option value="unmapped">{"\u2014 Ch\u01B0a map"}</option>
        </select>
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 10, fontSize: 12, color: T.tm }}>
        <span>{data.length + "/" + skuImg.length + " SKU"}</span>
        <span style={{ color: T.ac }}>{"\u2713 " + mappedCount + " \u0111\u00E3 map"}</span>
        <span style={{ color: T.td }}>{"\u2014 " + (data.length - mappedCount) + " ch\u01B0a map"}</span>
      </div>
      {supIssues.length > 0 && (() => {
        const nErr = supIssues.filter(x => x.level === "err").length;
        const nWarn = supIssues.length - nErr;
        const hasErr = nErr > 0;
        const C = hasErr ? T.dg : T.w;
        const open = issuesOpen === null ? hasErr : issuesOpen;   // tự mở khi có lỗi nặng
        return <div style={{ background: hasErr ? "rgba(248,113,113,.08)" : "rgba(251,191,36,.08)", border: "1px solid " + C, borderRadius: 8, padding: open ? 10 : "6px 10px", marginBottom: 10, fontSize: 13, color: C }}>
          <div onClick={() => setIssuesOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
            <span style={{ fontWeight: 600 }}>
              {hasErr ? "\u26A0 " + nErr + " xưởng có vấn đề về mapping SKU" : "\u2139 Ghi chú cấu hình"}
              {nErr > 0 && nWarn > 0 ? " \u00B7 " + nWarn + " ghi chú nhẹ" : ""}
              {!hasErr ? " (" + nWarn + ")" : ""}
            </span>
            <span style={{ marginLeft: "auto", fontSize: 12, color: T.tm }}>{open ? "Ẩn \u25B4" : "Hiện chi tiết \u25BE"}</span>
          </div>
          {open && <>
            <div style={{ marginTop: 6 }}>
              {supIssues.map(x => <div key={x.sup} style={{ marginLeft: 8, color: x.level === "err" ? T.dg : T.w, marginBottom: 2 }}>{"\u2022 " + x.sup + " \u2014 " + x.why}</div>)}
            </div>
            <div style={{ marginTop: 6, color: T.tm }}>{"\u2192 Vào SKU Xưởng & Template \u2192 chọn xưởng \u2192 tab \u2462 Column Config để khai báo."}</div>
          </>}
        </div> })()}
      <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, overflow: "auto", maxHeight: TBL_H }}>
        <table style={{ fontSize: 10 }}><thead>
          <tr><th colSpan={6} style={{ fontSize: 12 }}>{"S\u1EA2N PH\u1EA8M IMG"}</th>
            {activeSups.map(s => <th key={s.name} style={{ borderLeft: "2px solid " + T.bh, fontSize: 10, textAlign: "center" }}>{"SKU " + s.name.toUpperCase()}</th>)}</tr>
          <tr><th style={{ fontSize: 9 }}>#</th><th style={{ fontSize: 9, minWidth: 110 }}>SKU IMG</th><th style={{ fontSize: 9, minWidth: 180 }}>Product Name</th>
            <th style={{ fontSize: 9 }}>Size</th><th style={{ fontSize: 9 }}>Color</th><th style={{ fontSize: 9 }}>Print Area</th>
            {activeSups.map(s => <th key={s.name + "_2"} style={{ borderLeft: "2px solid " + T.bh }} />)}</tr>
        </thead><tbody>
          {data.map((r, idx) => (
            <tr key={r._i}>
              <td style={{ color: T.td, fontSize: 8 }}>{idx + 1}</td>
              <td style={{ fontFamily: "monospace", fontSize: 9 }}>{r.sku}</td>
              <td style={{ fontSize: 10 }}>{r.product}</td>
              <td><span className="b bi" style={{ fontSize: 8 }}>{r.size}</span></td>
              <td style={{ fontSize: 9 }}>{r.color}</td>
              <td style={{ fontSize: 9, color: T.tm }}>{r.printArea}</td>
              {activeSups.map(s => {
                const val = r.mapping[s.name]; const isSku = val && val !== "\u2713" && val !== "\u2014";
                return <td key={s.name} style={{ borderLeft: "2px solid " + T.bh, fontSize: 9, textAlign: "center", fontFamily: isSku ? "monospace" : undefined, color: val === "\u2713" ? T.ac : isSku ? T.tx : T.td, fontWeight: isSku ? 500 : 400 }}>{val}</td>;
              })}
            </tr>
          ))}
        </tbody></table>
      </div>
    </div>
  );
}
