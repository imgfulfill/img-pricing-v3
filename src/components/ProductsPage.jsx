import React, { useState, useMemo } from "react";
import { useData } from "../context/DataContext";
import { T, pn, szOrd, calcTier, fmt, uid, TBL_H } from "../lib/utils";

function LabelTable() {
  const { labelTiers, params, updateLabelTiers } = useData();

  const handleChange = async (i, newU) => {
    const newTiers = labelTiers.map((x, j) => j === i ? { ...x, u: newU } : x);
    await updateLabelTiers(newTiers);
  };

  return (
    <div>
      <div style={{ fontSize: 14, color: T.tm, marginBottom: 10 }}>Giá USPS Ground Advantage Zone 5 × (1 + {Math.round(params.markup * 100)}% markup). {labelTiers.length} tier.</div>
      <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, overflow: "hidden", maxHeight: "65vh", overflowY: "auto" }}>
        <table><thead><tr>
          <th>Tier</th><th style={{ textAlign: "right" }}>Oz</th><th style={{ textAlign: "right" }}>USPS gốc ($)</th>
          <th style={{ textAlign: "right" }}>Markup</th><th style={{ textAlign: "right" }}>Giá cuối ($)</th>
        </tr></thead><tbody>
          {labelTiers.map((t, i) => (
            <tr key={i}>
              <td style={{ fontWeight: 500 }}>{t.t}</td>
              <td className="m" style={{ textAlign: "right" }}>{t.oz}</td>
              <td style={{ textAlign: "right" }}>
                <input type="number" step=".01" value={t.u} onChange={e => handleChange(i, pn(e.target.value) || 0)}
                  style={{ width: 80, textAlign: "right", padding: 4 }} />
              </td>
              <td className="m" style={{ textAlign: "right", color: T.tm }}>{Math.round(params.markup * 100)}%</td>
              <td className="m" style={{ textAlign: "right", fontWeight: 600, color: T.ac }}>{fmt(t.u * (1 + params.markup), 4)}</td>
            </tr>
          ))}
        </tbody></table>
      </div>
    </div>
  );
}

function ProductList() {
  const { products, labelTiers, addProduct, updateProduct, deleteProduct, bulkUpdateProducts, bulkDeleteProducts } = useData();
  const [q, setQ] = useState(""); const [fCat, setFCat] = useState(""); const [fBrand, setFBrand] = useState("");
  const [fSource, setFSource] = useState(""); const [fTech, setFTech] = useState("");
  const [editId, setEditId] = useState(null); const [editRow, setEditRow] = useState({});
  const [showAdd, setShowAdd] = useState(false); const [addMode, setAddMode] = useState(null);
  const [pasteText, setPasteText] = useState("");
  // Chế độ chọn hàng loạt (giống Edit SKU bên SKU IMG)
  const [editMode, setEditMode] = useState(false);
  const [sel, setSel] = useState(new Set());          // chứa ID sản phẩm, KHÔNG phải vị trí dòng
  const [bulkField, setBulkField] = useState("");
  const [bulkVal, setBulkVal] = useState("");

  const cats = useMemo(() => [...new Set(products.map(p => p.category).filter(Boolean))].sort(), [products]);
  const brands = useMemo(() => [...new Set(products.map(p => p.brand).filter(Boolean))].sort(), [products]);

  const filtered = useMemo(() => products.filter(p => {
    if (q && !(p.product + " " + p.brand + " " + p.size).toLowerCase().includes(q.toLowerCase())) return false;
    if (fCat && p.category !== fCat) return false;
    if (fBrand && p.brand !== fBrand) return false;
    if (fSource && p.source !== fSource) return false;
    if (fTech) { const hasTech = p.product.includes(fTech); if (!hasTech) return false }
    return true;
  }).sort((a, b) => a.product.localeCompare(b.product) || (szOrd(a.size) - szOrd(b.size))), [products, q, fCat, fBrand, fSource, fTech]);

  /* Ô tick bám theo ID sản phẩm, không bám theo vị trí dòng — nên đổi bộ lọc
     giữa chừng cũng không bị chọn nhầm sang dòng khác. */
  const toggleSel = (id) => { const ns = new Set(sel); ns.has(id) ? ns.delete(id) : ns.add(id); setSel(ns) };
  const selectAll = () => {
    if (sel.size === filtered.length && filtered.length > 0) setSel(new Set());
    else setSel(new Set(filtered.map(p => p.id)));
  };

  const BULK_FIELDS = [
    { v: "brand", l: "Brand" }, { v: "product", l: "Sản phẩm" }, { v: "size", l: "Size" },
    { v: "category", l: "Category" }, { v: "weightLbs", l: "Lbs" }, { v: "weightOz", l: "Oz" },
    { v: "source", l: "Nguồn" },
  ];

  const applyBulk = async () => {
    if (!bulkField || !sel.size) return;
    const isNum = bulkField === "weightLbs" || bulkField === "weightOz";
    const val = isNum ? (pn(bulkVal) || 0) : bulkVal;
    if (!isNum && val === "" && !confirm("Đặt " + BULK_FIELDS.find(f => f.v === bulkField)?.l + " thành RỖNG cho " + sel.size + " sản phẩm?")) return;
    const rows = products.filter(p => sel.has(p.id)).map(p => ({ ...p, [bulkField]: val }));
    const ok = await bulkUpdateProducts(rows);
    if (ok) { setSel(new Set()); setBulkVal("") }
  };

  const delSelected = async () => {
    if (!sel.size) return;
    if (!confirm("Xóa " + sel.size + " sản phẩm đã chọn?\n\nBảng giá và giá đối thủ gắn với các sản phẩm này KHÔNG bị xóa theo. Không thể hoàn tác.")) return;
    const ok = await bulkDeleteProducts([...sel]);
    if (ok) setSel(new Set());
  };

  const startEdit = (p) => { setEditId(p.id); setEditRow({ ...p }) };
  const saveEdit = async () => {
    console.log("saveEdit called", { editId, editRow });
    if (!editRow.product) { console.log("saveEdit: product empty, returning"); return; }
    try {
      const result = await updateProduct(editId, { ...editRow, weightOz: pn(editRow.weightOz) || 0, weightLbs: pn(editRow.weightLbs) || 0 });
      console.log("updateProduct result:", result);
    } catch (err) {
      console.error("saveEdit error:", err);
    }
    setEditId(null);
  };
  const cancelEdit = () => setEditId(null);
  const delProd = async (id) => { if (confirm("Xóa sản phẩm này?")) await deleteProduct(id) };

  const doImportPaste = async () => {
    const lines = pasteText.trim().split("\n").map(r => r.split("\t"));
    if (lines.length < 2) return alert("Cần header + data. Cột: Brand | Product | Size | Category | Lbs | Oz | Source");
    let n = 0;
    for (let i = 1; i < lines.length; i++) {
      const r = lines[i]; if (r.length < 3 || !r[1]) continue;
      const exists = products.find(p => p.product === r[1] && p.size === (r[2] || ""));
      if (exists) continue;
      await addProduct({ brand: r[0] || "", product: r[1] || "", size: r[2] || "", category: r[3] || "", weightLbs: pn(r[4]) || 0, weightOz: pn(r[5]) || 0, source: r[6] || "REAL" });
      n++;
    }
    setPasteText(""); setAddMode(null); setShowAdd(false);
    alert("Thêm " + n + " sản phẩm mới (bỏ qua trùng)");
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm sản phẩm..." style={{ flex: 1, minWidth: 150 }} />
        <select value={fBrand} onChange={e => setFBrand(e.target.value)} style={{ width: 130, fontSize: 13 }}>
          <option value="">Tất cả Brand</option>{brands.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={fCat} onChange={e => setFCat(e.target.value)} style={{ width: 130, fontSize: 13 }}>
          <option value="">Tất cả Category</option>{cats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={fTech} onChange={e => setFTech(e.target.value)} style={{ width: 100, fontSize: 13 }}>
          <option value="">Tất cả Tech</option><option value="DTF">DTF</option><option value="DTG">DTG</option>
        </select>
        <select value={fSource} onChange={e => setFSource(e.target.value)} style={{ width: 100, fontSize: 13 }}>
          <option value="">Tất cả Nguồn</option><option value="REAL">REAL</option><option value="EST">EST</option><option value="MISSING">MISSING</option>
        </select>
        <div style={{ position: "relative" }}>
          <button className="bp2" onClick={() => setShowAdd(!showAdd)} style={{ fontSize: 13 }}>+ Thêm sản phẩm ▾</button>
          {showAdd && (
            <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, background: T.sf, border: "1px solid " + T.bd, borderRadius: 8, padding: 4, zIndex: 10, minWidth: 160 }}>
              <button className="bg2" onClick={() => { setAddMode("paste"); setShowAdd(false) }} style={{ width: "100%", fontSize: 13, marginBottom: 2, textAlign: "left", padding: "6px 10px" }}>📋 Paste từ Excel</button>
            </div>
          )}
        </div>
      </div>

      {addMode === "paste" && (
        <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Paste từ Excel</div>
          <div style={{ fontSize: 12, color: T.tm, marginBottom: 6 }}>Cột: Brand | Product | Size | Category | Lbs | Oz | Source. Dòng 1 = header.</div>
          <textarea value={pasteText} onChange={e => setPasteText(e.target.value)} rows={5} style={{ width: "100%", fontSize: 13, fontFamily: "monospace" }} placeholder="Paste data từ Excel..." />
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <button className="bp2" onClick={doImportPaste} style={{ fontSize: 13 }}>Import</button>
            <button className="bg2" onClick={() => { setAddMode(null); setPasteText("") }} style={{ fontSize: 13 }}>Hủy</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 6, marginBottom: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button className={editMode ? "bp2" : "bg2"} onClick={() => { setEditMode(!editMode); setSel(new Set()) }} style={{ fontSize: 13 }}>
          {editMode ? "Đóng Edit" : "✏️ Edit hàng loạt"}
        </button>
        <div style={{ fontSize: 12, color: T.tm }}>{filtered.length}/{products.length} sản phẩm</div>
      </div>

      {editMode && (
        <div style={{ background: T.sf, border: "1px solid " + T.p, borderRadius: 8, padding: 10, marginBottom: 10, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", fontSize: 13 }}>
          <button className="bg2" onClick={selectAll} style={{ fontSize: 12 }}>
            {sel.size === filtered.length && filtered.length > 0 ? "Bỏ chọn" : "Chọn tất cả (" + filtered.length + ")"}
          </button>
          <span style={{ color: T.tm }}>{sel.size} đã chọn ·</span>
          <select value={bulkField} onChange={e => setBulkField(e.target.value)} style={{ width: 130, fontSize: 12 }}>
            <option value="">Chọn cột...</option>
            {BULK_FIELDS.map(f => <option key={f.v} value={f.v}>{f.l}</option>)}
          </select>
          {bulkField === "source" ? (
            <select value={bulkVal} onChange={e => setBulkVal(e.target.value)} style={{ width: 120, fontSize: 12 }}>
              <option value="">Chọn giá trị...</option><option>REAL</option><option>EST</option><option>MISSING</option>
            </select>
          ) : (
            <input value={bulkVal} onChange={e => setBulkVal(e.target.value)} placeholder="Giá trị mới..." style={{ width: 170, fontSize: 12 }} />
          )}
          <button className="bp2" onClick={applyBulk} style={{ fontSize: 12 }} disabled={!bulkField || !sel.size}>Apply All ({sel.size})</button>
          <span style={{ borderLeft: "1px solid " + T.bd, height: 18 }} />
          <button className="bdel" onClick={delSelected} style={{ fontSize: 12 }} disabled={!sel.size}>🗑 Xóa {sel.size} dòng</button>
        </div>
      )}

      <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, overflow: "hidden", maxHeight: TBL_H, overflowY: "auto" }}>
        <table><thead><tr>
          {editMode && <th style={{ width: 30 }}><input type="checkbox" checked={sel.size === filtered.length && filtered.length > 0} onChange={selectAll} /></th>}
          <th>Brand</th><th>Sản phẩm</th><th>Size</th><th>Category</th>
          <th style={{ textAlign: "right" }}>Lbs</th><th style={{ textAlign: "right" }}>Oz</th><th>Tier</th><th>Nguồn</th><th style={{ width: 70 }}>Act</th>
        </tr></thead><tbody>
          {filtered.map(p => editId === p.id ? (
            <tr key={p.id} style={{ background: "rgba(59,130,246,.08)" }}>
              {editMode && <td />}
              <td><input value={editRow.brand} onChange={e => setEditRow(r => ({ ...r, brand: e.target.value }))} style={{ width: "100%", fontSize: 13, padding: 3 }} /></td>
              <td><input value={editRow.product} onChange={e => setEditRow(r => ({ ...r, product: e.target.value }))} style={{ width: "100%", fontSize: 13, padding: 3 }} /></td>
              <td><input value={editRow.size} onChange={e => setEditRow(r => ({ ...r, size: e.target.value }))} style={{ width: 50, fontSize: 13, padding: 3 }} /></td>
              <td><input value={editRow.category} onChange={e => setEditRow(r => ({ ...r, category: e.target.value }))} style={{ width: "100%", fontSize: 13, padding: 3 }} /></td>
              <td><input type="number" step=".01" value={editRow.weightLbs} onChange={e => setEditRow(r => ({ ...r, weightLbs: e.target.value }))} style={{ width: 60, fontSize: 13, padding: 3, textAlign: "right" }} /></td>
              <td><input type="number" step=".01" value={editRow.weightOz} onChange={e => setEditRow(r => ({ ...r, weightOz: e.target.value }))} style={{ width: 60, fontSize: 13, padding: 3, textAlign: "right" }} /></td>
              <td style={{ fontSize: 12 }}>{calcTier(pn(editRow.weightOz) || 0, labelTiers)}</td>
              <td><select value={editRow.source} onChange={e => setEditRow(r => ({ ...r, source: e.target.value }))} style={{ fontSize: 12, padding: 2 }}>
                <option>REAL</option><option>EST</option><option>MISSING</option></select></td>
              <td><div style={{ display: "flex", gap: 3 }}>
                <button className="bp2" style={{ padding: "2px 6px", fontSize: 10 }} onClick={(e) => { e.stopPropagation(); console.log("✓ clicked"); saveEdit(); }}>✓</button>
                <button className="bg2" style={{ padding: "2px 6px", fontSize: 10 }} onClick={cancelEdit}>✕</button>
              </div></td>
            </tr>
          ) : (
            <tr key={p.id} style={{ background: sel.has(p.id) ? "rgba(59,130,246,.08)" : "" }}>
              {editMode && <td><input type="checkbox" checked={sel.has(p.id)} onChange={() => toggleSel(p.id)} /></td>}
              <td style={{ fontSize: 13 }}>{p.brand}</td>
              <td style={{ fontWeight: 500, maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.product}</td>
              <td><span className="b bi">{p.size}</span></td>
              <td style={{ fontSize: 13, color: T.tm }}>{p.category}</td>
              <td className="m" style={{ textAlign: "right" }}>{p.weightLbs}</td>
              <td className="m" style={{ textAlign: "right" }}>{p.weightOz}</td>
              <td style={{ fontSize: 12 }}>{calcTier(p.weightOz, labelTiers)}</td>
              <td><span className={"b " + (p.source === "REAL" ? "bok" : p.source === "EST" ? "bw" : "bdg")}>{p.source}</span></td>
              <td><div style={{ display: "flex", gap: 3 }}>
                <button className="bg2" style={{ padding: "2px 6px", fontSize: 12 }} onClick={() => startEdit(p)} title="Sửa">✏️</button>
                <button className="bdel" style={{ padding: "2px 6px", fontSize: 12 }} onClick={() => delProd(p.id)} title="Xóa">🗑</button>
              </div></td>
            </tr>
          ))}
        </tbody></table>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const { products, labelTiers } = useData();
  const [sub, setSub] = useState("list");

  return (
    <div className="fade">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>Sản phẩm IMG</h2>
        <div style={{ display: "flex", gap: 4 }}>
          <button className={sub === "list" ? "bp2" : "bg2"} onClick={() => setSub("list")} style={{ fontSize: 13 }}>Danh sách sản phẩm ({products.length})</button>
          <button className={sub === "label" ? "bp2" : "bg2"} onClick={() => setSub("label")} style={{ fontSize: 13 }}>Bảng giá Label USPS ({labelTiers.length})</button>
        </div>
      </div>
      {sub === "list" && <ProductList />}
      {sub === "label" && <LabelTable />}
    </div>
  );
}
