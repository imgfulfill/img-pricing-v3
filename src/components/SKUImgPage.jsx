import React, { useState, useMemo, useCallback } from "react";
import { useData } from "../context/DataContext";
import { T, pn, ORD_HDR } from "../lib/utils";

export default function SKUImgPage() {
  const { skuImg, routeCfg, updateSkuImg, bulkUpsertSkuImg, updateRouteCfg } = useData();
  const [sub, setSub] = useState("sku"); const [q, setQ] = useState(""); const [fSize, setFSize] = useState(""); const [fColor, setFColor] = useState(""); const [fArea, setFArea] = useState("");
  const [editMode, setEditMode] = useState(false); const [sel, setSel] = useState(new Set());
  const [editField, setEditField] = useState(""); const [editVal, setEditVal] = useState("");
  const [showImp, setShowImp] = useState(false); const [showTplImp, setShowTplImp] = useState(false);
  const [editingCell, setEditingCell] = useState(null); const [cellVal, setCellVal] = useState("");

  const imgTpl = routeCfg?.imgTpl || { hdr: ORD_HDR, data: [] };
  const opts = useMemo(() => ({
    sizes: [...new Set(skuImg.map(s => s.size).filter(Boolean))].sort(),
    colors: [...new Set(skuImg.map(s => s.color).filter(Boolean))].sort(),
    areas: [...new Set(skuImg.map(s => s.printArea).filter(Boolean))].sort(),
  }), [skuImg]);

  const filtered = useMemo(() => {
    return skuImg.map((r, i) => ({ ...r, _i: i })).filter(r => {
      if (q && !(r.sku + " " + r.product + " " + r.color).toLowerCase().includes(q.toLowerCase())) return false;
      if (fSize && r.size !== fSize) return false;
      if (fColor && r.color !== fColor) return false;
      if (fArea && r.printArea !== fArea) return false;
      return true;
    });
  }, [skuImg, q, fSize, fColor, fArea]);

  const toggleSel = i => { const ns = new Set(sel); ns.has(i) ? ns.delete(i) : ns.add(i); setSel(ns) };
  const selectAll = () => { if (sel.size === filtered.length) setSel(new Set()); else setSel(new Set(filtered.map(r => r._i))) };

  const applyBulk = async () => {
    if (!editField || !sel.size) return;
    for (const idx of sel) {
      const item = skuImg[idx]; if (!item?.id) continue;
      await updateSkuImg(item.id, { [editField]: editVal });
    }
    setSel(new Set()); setEditVal("");
  };

  const doImport = async (txt) => {
    const lines = txt.trim().split("\n").map(r => r.split("\t"));
    if (lines.length < 2) return alert("Cần header + data");
    const hdr = lines[0].map(h => h.trim().toLowerCase());
    const skuIdx = hdr.findIndex(h => h === "sku" || h === "sku img");
    if (skuIdx < 0) return alert("Cần cột SKU");
    const batch = [];
    for (let i = 1; i < lines.length; i++) {
      const c = lines[i]; const sku = (c[skuIdx] || "").trim(); if (!sku) continue;
      const get = (names) => { for (const n of names) { const idx = hdr.findIndex(h => h.includes(n)); if (idx >= 0 && c[idx]) return c[idx].trim() } return "" };
      batch.push({ sku, product: get(["product name", "product"]), size: get(["size"]), color: get(["color"]),
        printArea: get(["printing", "print area", "area"]), style: get(["style"]),
        front: get(["front"]), back: get(["back"]) });
    }
    if (batch.length) { await bulkUpsertSkuImg(batch); setShowImp(false) }
  };

  const saveCell = async (id, field) => {
    await updateSkuImg(id, { [field]: cellVal });
    setEditingCell(null);
  };

  const CellTd = ({ item, field, mono, fw }) => {
    const isEditing = editingCell === item.id + "_" + field;
    const val = item[field] || "";
    return (
      <td style={{ fontSize: 10, fontFamily: mono ? "monospace" : undefined, fontWeight: fw || 400, cursor: "pointer" }}
        onClick={() => { if (!isEditing) { setEditingCell(item.id + "_" + field); setCellVal(val) } }}>
        {isEditing ? (
          <input value={cellVal} onChange={e => setCellVal(e.target.value)} autoFocus
            onBlur={() => saveCell(item.id, field)} onKeyDown={e => { if (e.key === "Enter") saveCell(item.id, field); if (e.key === "Escape") setEditingCell(null) }}
            style={{ width: "100%", fontSize: 10, padding: 1, fontFamily: mono ? "monospace" : undefined }} />
        ) : val || <span style={{ color: T.td }}>—</span>}
      </td>
    );
  };

  const doImportTpl = (txt) => {
    const lines = txt.trim().split("\n");
    if (lines.length < 1) return;
    const hdr = lines[0].split("\t").map(h => h.trim());
    const data = lines.slice(1).map(l => l.split("\t").map(c => c.trim()));
    updateRouteCfg({ ...routeCfg, imgTpl: { hdr, data } });
    setShowTplImp(false);
  };

  return (
    <div className="fade">
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>SKU IMG</h2>
      <div style={{ fontSize: 12, color: T.tm, marginBottom: 12 }}>Danh sách SKU nội bộ IMG</div>
      <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
        <button className={sub === "sku" ? "bp2" : "bg2"} onClick={() => setSub("sku")} style={{ fontSize: 11 }}>SKU IMG ({skuImg.length})</button>
        <button className={sub === "tpl" ? "bp2" : "bg2"} onClick={() => setSub("tpl")} style={{ fontSize: 11 }}>Template IMG ({imgTpl.hdr.length} cột)</button>
      </div>
      {sub === "sku" && <div>
        <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm SKU / sản phẩm / màu..." style={{ flex: 1, minWidth: 200 }} />
          <select value={fSize} onChange={e => setFSize(e.target.value)} style={{ width: 80, fontSize: 10 }}><option value="">Size</option>{opts.sizes.map(s => <option key={s}>{s}</option>)}</select>
          <select value={fColor} onChange={e => setFColor(e.target.value)} style={{ width: 100, fontSize: 10 }}><option value="">Color</option>{opts.colors.map(c => <option key={c}>{c}</option>)}</select>
          <select value={fArea} onChange={e => setFArea(e.target.value)} style={{ width: 110, fontSize: 10 }}><option value="">Print Area</option>{opts.areas.map(a => <option key={a}>{a}</option>)}</select>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <button className={editMode ? "bp2" : "bg2"} onClick={() => { setEditMode(!editMode); setSel(new Set()) }} style={{ fontSize: 11 }}>{editMode ? "Đóng Edit" : "✏️ Edit SKU"}</button>
          <button className="bg2" onClick={() => setShowImp(!showImp)} style={{ fontSize: 11 }}>{showImp ? "Đóng" : "📥 Import SKU"}</button>
          <div style={{ fontSize: 10, color: T.tm, display: "flex", alignItems: "center" }}>{filtered.length}/{skuImg.length} · Click ô để sửa trực tiếp</div>
        </div>
        {editMode && <div style={{ background: T.sf, border: "1px solid " + T.p, borderRadius: 8, padding: 10, marginBottom: 10, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", fontSize: 11 }}>
          <button className="bg2" onClick={selectAll} style={{ fontSize: 10 }}>{sel.size === filtered.length ? "Bỏ chọn" : "Chọn tất cả (" + filtered.length + ")"}</button>
          <span style={{ color: T.tm }}>{sel.size} đã chọn ·</span>
          <select value={editField} onChange={e => setEditField(e.target.value)} style={{ width: 120, fontSize: 10 }}>
            <option value="">Chọn cột...</option><option value="product">Product Name</option><option value="size">Size</option><option value="color">Color</option>
            <option value="printArea">Printing Area</option><option value="style">Style</option><option value="front">Front</option><option value="back">Back</option>
          </select>
          <input value={editVal} onChange={e => setEditVal(e.target.value)} placeholder="Giá trị mới..." style={{ width: 150, fontSize: 10 }} />
          <button className="bp2" onClick={applyBulk} style={{ fontSize: 10 }} disabled={!editField || !sel.size}>Apply All ({sel.size})</button>
        </div>}
        {showImp && <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, padding: 14, marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: T.tm, marginBottom: 6 }}>Paste từ Excel. Header bắt buộc: <b>SKU</b>. Thêm: Product Name, Size, Color, Printing-area, Style, Front, Back</div>
          <textarea rows={5} style={{ width: "100%", fontSize: 10, fontFamily: "monospace" }} placeholder="Product Name\tSKU\tSize\tColor\tPrinting-area\tStyle\tFront\tBack" id="skuImpTa2" />
          <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
            <button className="bp2" onClick={() => { const ta = document.getElementById("skuImpTa2"); if (ta?.value) doImport(ta.value) }} style={{ fontSize: 11 }}>Import</button>
            <button className="bg2" onClick={() => setShowImp(false)} style={{ fontSize: 11 }}>Hủy</button>
          </div>
        </div>}
        <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, overflow: "auto", maxHeight: "58vh" }}>
          <table style={{ fontSize: 10 }}><thead><tr>
            {editMode && <th style={{ width: 30 }}><input type="checkbox" checked={sel.size === filtered.length && filtered.length > 0} onChange={selectAll} /></th>}
            <th>#</th><th style={{ minWidth: 120 }}>SKU IMG</th><th style={{ minWidth: 220 }}>Product Name IMG</th><th>Size</th><th>Color</th><th>Printing Area</th><th>Style</th><th style={{ minWidth: 80 }}>Front</th><th style={{ minWidth: 80 }}>Back</th>
          </tr></thead><tbody>
            {filtered.map((r, idx) => (
              <tr key={r.id || r._i} style={{ background: sel.has(r._i) ? "rgba(59,130,246,.08)" : "" }}>
                {editMode && <td><input type="checkbox" checked={sel.has(r._i)} onChange={() => toggleSel(r._i)} /></td>}
                <td style={{ color: T.td, fontSize: 8 }}>{idx + 1}</td>
                <CellTd item={r} field="sku" mono={true} fw={500} />
                <CellTd item={r} field="product" />
                <CellTd item={r} field="size" />
                <CellTd item={r} field="color" />
                <CellTd item={r} field="printArea" />
                <CellTd item={r} field="style" />
                <CellTd item={r} field="front" />
                <CellTd item={r} field="back" />
              </tr>
            ))}
          </tbody></table>
        </div>
      </div>}
      {sub === "tpl" && <div>
        <div style={{ fontSize: 12, color: T.tm, marginBottom: 10 }}>Template IMG (49 cột) — format đơn hàng paste vào hệ thống</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <button className="bg2" onClick={() => setShowTplImp(!showTplImp)} style={{ fontSize: 11 }}>{showTplImp ? "Đóng" : "📥 Import Template IMG"}</button>
        </div>
        {showTplImp && <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, padding: 14, marginBottom: 10 }}>
          <textarea rows={5} style={{ width: "100%", fontSize: 10, fontFamily: "monospace" }} placeholder="Paste từ sheet 'Copy vô đây'..." id="tplImpTa" />
          <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
            <button className="bp2" onClick={() => { const ta = document.getElementById("tplImpTa"); if (ta?.value) doImportTpl(ta.value) }} style={{ fontSize: 11 }}>Import</button>
            <button className="bg2" onClick={() => setShowTplImp(false)} style={{ fontSize: 11 }}>Hủy</button>
          </div>
        </div>}
        {imgTpl.hdr.length > 0 ? <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, overflow: "auto", maxHeight: "50vh" }}>
          <table style={{ fontSize: 9 }}><thead><tr>{imgTpl.hdr.map((h, i) => <th key={i} style={{ whiteSpace: "nowrap", fontSize: 8 }}>{h}</th>)}</tr></thead>
          <tbody>{imgTpl.data.slice(0, 10).map((row, ri) => <tr key={ri}>{imgTpl.hdr.map((_, ci) => <td key={ci} style={{ fontSize: 8, color: T.tm, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row[ci] || ""}</td>)}</tr>)}</tbody></table>
        </div> : <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, padding: 40, textAlign: "center", color: T.tm }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>📋</div><div>Chưa có template. Import từ sheet "Copy vô đây"</div></div>}
      </div>}
    </div>
  );
}
