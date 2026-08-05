import React, { useState, useMemo, useCallback } from "react";
import { useData } from "../context/DataContext";
import { T, pn, szOrd, ORD_HDR, TBL_H_SHORT } from "../lib/utils";
import { useVirtualRows, Spacer } from "../lib/useVirtualRows.jsx";

export default function SKUImgPage() {
  const { skuImg, routeCfg, updateSkuImg, bulkUpdateSkuImg, bulkUpsertSkuImg, bulkDeleteSkuImg, clearAllSkuImg, updateRouteCfg } = useData();
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

  /* TẦNG 1 — gắn số thứ tự gốc rồi SẮP XẾP một lần: Tên sản phẩm → Size → SKU.
     Size dùng szOrd nên đúng thứ tự may mặc (S → M → L → XL → 2XL → … → 6XL),
     không phải thứ tự chữ cái (nếu không 2XL sẽ đứng trước S).
     Sắp ở đây chứ không sắp trong bộ lọc, vì so sánh chuỗi trên 14.000 dòng khá tốn
     — làm trong bộ lọc thì mỗi ký tự gõ vào là sắp lại toàn bộ. */
  const sorted = useMemo(() =>
    skuImg.map((r, i) => ({ ...r, _i: i }))
      .sort((a, b) =>
        (a.product || "").localeCompare(b.product || "") ||
        (szOrd(a.size) - szOrd(b.size)) ||
        (a.sku || "").localeCompare(b.sku || "")),
    [skuImg]);

  /* TẦNG 2 — chỉ lọc. `_i` vẫn là vị trí GỐC nên ô tick không bị lệch dòng. */
  const filtered = useMemo(() => {
    return sorted.filter(r => {
      if (q && !(r.sku + " " + r.product + " " + r.color).toLowerCase().includes(q.toLowerCase())) return false;
      if (fSize && r.size !== fSize) return false;
      if (fColor && r.color !== fColor) return false;
      if (fArea && r.printArea !== fArea) return false;
      return true;
    });
  }, [sorted, q, fSize, fColor, fArea]);

  // Cuộn ảo: chỉ vẽ những dòng đang nhìn thấy (bảng này có tới hàng chục nghìn SKU)
  const NUM_COLS = 10;   // 9 cột + 1 cột chọn khi ở chế độ sửa
  const vr = useVirtualRows(filtered.length);

  const toggleSel = i => { const ns = new Set(sel); ns.has(i) ? ns.delete(i) : ns.add(i); setSel(ns) };
  const selectAll = () => { if (sel.size === filtered.length) setSel(new Set()); else setSel(new Set(filtered.map(r => r._i))) };

  const applyBulk = async () => {
    if (!editField || !sel.size) return;
    // Trước đây vòng lặp này gọi máy chủ TỪNG DÒNG một — chọn 200 dòng là 200 lượt
    // chờ nối đuôi nhau (~1 phút). Nay gộp thành MỘT lệnh ghi duy nhất.
    const rows = [...sel].map(i => skuImg[i]).filter(x => x?.id).map(x => ({ ...x, [editField]: editVal }));
    if (!rows.length) return;
    const ok = await bulkUpdateSkuImg(rows);
    if (ok) { setSel(new Set()); setEditVal("") }
  };

  const delSelected = async () => {
    if (!sel.size) return;
    const ids = [...sel].map(i => skuImg[i]?.id).filter(Boolean);
    if (!ids.length) return;
    if (!confirm("Xóa " + ids.length + " SKU đã chọn? Không thể hoàn tác.")) return;
    await bulkDeleteSkuImg(ids);
    setSel(new Set());
  };

  const delAll = async () => {
    if (!skuImg.length) return;
    if (!confirm("XÓA TOÀN BỘ " + skuImg.length + " SKU IMG?\n\nToàn bộ mapping SKU sẽ mất. Không thể hoàn tác.")) return;
    const ok = prompt('Gõ chính xác "XOA TAT CA" để xác nhận:');
    if (ok !== "XOA TAT CA") return alert("Đã hủy.");
    await clearAllSkuImg();
    setSel(new Set());
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
      <td style={{ fontSize: 12, fontFamily: mono ? "monospace" : undefined, fontWeight: fw || 400, cursor: "pointer" }}
        onClick={() => { if (!isEditing) { setEditingCell(item.id + "_" + field); setCellVal(val) } }}>
        {isEditing ? (
          <input value={cellVal} onChange={e => setCellVal(e.target.value)} autoFocus
            onBlur={() => saveCell(item.id, field)} onKeyDown={e => { if (e.key === "Enter") saveCell(item.id, field); if (e.key === "Escape") setEditingCell(null) }}
            style={{ width: "100%", fontSize: 12, padding: 1, fontFamily: mono ? "monospace" : undefined }} />
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
      <div style={{ fontSize: 14, color: T.tm, marginBottom: 12 }}>Danh sách SKU nội bộ IMG</div>
      <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
        <button className={sub === "sku" ? "bp2" : "bg2"} onClick={() => setSub("sku")} style={{ fontSize: 13 }}>SKU IMG ({skuImg.length})</button>
        <button className={sub === "tpl" ? "bp2" : "bg2"} onClick={() => setSub("tpl")} style={{ fontSize: 13 }}>Template IMG ({imgTpl.hdr.length} cột)</button>
      </div>
      {sub === "sku" && <div>
        <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm SKU / sản phẩm / màu..." style={{ flex: 1, minWidth: 200 }} />
          <select value={fSize} onChange={e => setFSize(e.target.value)} style={{ width: 80, fontSize: 12 }}><option value="">Size</option>{opts.sizes.map(s => <option key={s}>{s}</option>)}</select>
          <select value={fColor} onChange={e => setFColor(e.target.value)} style={{ width: 100, fontSize: 12 }}><option value="">Color</option>{opts.colors.map(c => <option key={c}>{c}</option>)}</select>
          <select value={fArea} onChange={e => setFArea(e.target.value)} style={{ width: 110, fontSize: 12 }}><option value="">Print Area</option>{opts.areas.map(a => <option key={a}>{a}</option>)}</select>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <button className={editMode ? "bp2" : "bg2"} onClick={() => { setEditMode(!editMode); setSel(new Set()) }} style={{ fontSize: 13 }}>{editMode ? "Đóng Edit" : "✏️ Edit SKU"}</button>
          <button className="bg2" onClick={() => setShowImp(!showImp)} style={{ fontSize: 13 }}>{showImp ? "Đóng" : "📥 Import SKU"}</button>
          <div style={{ fontSize: 12, color: T.tm, display: "flex", alignItems: "center" }}>{filtered.length}/{skuImg.length} · Click ô để sửa trực tiếp</div>
        </div>
        {editMode && <div style={{ background: T.sf, border: "1px solid " + T.p, borderRadius: 8, padding: 10, marginBottom: 10, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", fontSize: 13 }}>
          <button className="bg2" onClick={selectAll} style={{ fontSize: 12 }}>{sel.size === filtered.length ? "Bỏ chọn" : "Chọn tất cả (" + filtered.length + ")"}</button>
          <span style={{ color: T.tm }}>{sel.size} đã chọn ·</span>
          <select value={editField} onChange={e => setEditField(e.target.value)} style={{ width: 120, fontSize: 12 }}>
            <option value="">Chọn cột...</option><option value="product">Product Name</option><option value="size">Size</option><option value="color">Color</option>
            <option value="printArea">Printing Area</option><option value="style">Style</option><option value="front">Front</option><option value="back">Back</option>
          </select>
          <input value={editVal} onChange={e => setEditVal(e.target.value)} placeholder="Giá trị mới..." style={{ width: 150, fontSize: 12 }} />
          <button className="bp2" onClick={applyBulk} style={{ fontSize: 12 }} disabled={!editField || !sel.size}>Apply All ({sel.size})</button>
          <span style={{ borderLeft: "1px solid " + T.bd, height: 18 }} />
          <button className="bdel" onClick={delSelected} style={{ fontSize: 12 }} disabled={!sel.size}>{"🗑 Xóa " + sel.size + " SKU"}</button>
          <button className="bdel" onClick={delAll} style={{ fontSize: 12 }}>{"Xóa toàn bộ (" + skuImg.length + ")"}</button>
        </div>}
        {showImp && <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, padding: 14, marginBottom: 10 }}>
          <div style={{ fontSize: 13, color: T.tm, marginBottom: 6 }}>Paste từ Excel. Header bắt buộc: <b>SKU</b>. Thêm: Product Name, Size, Color, Printing-area, Style, Front, Back</div>
          <textarea rows={5} style={{ width: "100%", fontSize: 12, fontFamily: "monospace" }} placeholder="Product Name\tSKU\tSize\tColor\tPrinting-area\tStyle\tFront\tBack" id="skuImpTa2" />
          <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
            <button className="bp2" onClick={() => { const ta = document.getElementById("skuImpTa2"); if (ta?.value) doImport(ta.value) }} style={{ fontSize: 13 }}>Import</button>
            <button className="bg2" onClick={() => setShowImp(false)} style={{ fontSize: 13 }}>Hủy</button>
          </div>
        </div>}
        <div ref={vr.ref} style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, overflow: "auto", maxHeight: TBL_H_SHORT }}>
          <table style={{ fontSize: 12 }}><thead><tr>
            {editMode && <th style={{ width: 30 }}><input type="checkbox" checked={sel.size === filtered.length && filtered.length > 0} onChange={selectAll} /></th>}
            <th>#</th><th style={{ minWidth: 120 }}>SKU IMG</th><th style={{ minWidth: 220 }}>Product Name IMG</th><th>Size</th><th>Color</th><th>Printing Area</th><th>Style</th><th style={{ minWidth: 80 }}>Front</th><th style={{ minWidth: 80 }}>Back</th>
          </tr></thead><tbody>
            <Spacer h={vr.padTop} cols={NUM_COLS} />
            {filtered.slice(vr.start, vr.end).map((r, j) => (
              <tr className="vrow" key={r.id || r._i} style={{ background: sel.has(r._i) ? "rgba(59,130,246,.08)" : "" }}>
                {editMode && <td><input type="checkbox" checked={sel.has(r._i)} onChange={() => toggleSel(r._i)} /></td>}
                <td style={{ color: T.td, fontSize: 9 }}>{vr.start + j + 1}</td>
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
            <Spacer h={vr.padBottom} cols={NUM_COLS} />
          </tbody></table>
        </div>
      </div>}
      {sub === "tpl" && <div>
        <div style={{ fontSize: 14, color: T.tm, marginBottom: 10 }}>Template IMG (49 cột) — format đơn hàng paste vào hệ thống</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <button className="bg2" onClick={() => setShowTplImp(!showTplImp)} style={{ fontSize: 13 }}>{showTplImp ? "Đóng" : "📥 Import Template IMG"}</button>
        </div>
        {showTplImp && <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, padding: 14, marginBottom: 10 }}>
          <textarea rows={5} style={{ width: "100%", fontSize: 12, fontFamily: "monospace" }} placeholder="Paste từ sheet 'Copy vô đây'..." id="tplImpTa" />
          <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
            <button className="bp2" onClick={() => { const ta = document.getElementById("tplImpTa"); if (ta?.value) doImportTpl(ta.value) }} style={{ fontSize: 13 }}>Import</button>
            <button className="bg2" onClick={() => setShowTplImp(false)} style={{ fontSize: 13 }}>Hủy</button>
          </div>
        </div>}
        {imgTpl.hdr.length > 0 ? <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, overflow: "auto", maxHeight: "50vh" }}>
          <table style={{ fontSize: 10 }}><thead><tr>{imgTpl.hdr.map((h, i) => <th key={i} style={{ whiteSpace: "nowrap", fontSize: 9 }}>{h}</th>)}</tr></thead>
          <tbody>{imgTpl.data.slice(0, 10).map((row, ri) => <tr key={ri}>{imgTpl.hdr.map((_, ci) => <td key={ci} style={{ fontSize: 9, color: T.tm, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row[ci] || ""}</td>)}</tr>)}</tbody></table>
        </div> : <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, padding: 40, textAlign: "center", color: T.tm }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>📋</div><div>Chưa có template. Import từ sheet "Copy vô đây"</div></div>}
      </div>}
    </div>
  );
}
