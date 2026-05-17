import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { useData } from "../context/DataContext";
import { T, pn, szOrd, calcTier, fmt, uid } from "../lib/utils";

function LabelTable() {
  const { labelTiers, params, updateLabelTiers } = useData();

  const handleChange = async (i, newU) => {
    const newTiers = labelTiers.map((x, j) => j === i ? { ...x, u: newU } : x);
    await updateLabelTiers(newTiers);
  };

  return (
    <div>
      <div style={{ fontSize: 12, color: T.tm, marginBottom: 10 }}>Giá USPS Ground Advantage Zone 5 × (1 + {Math.round(params.markup * 100)}% markup). {labelTiers.length} tier.</div>
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
  const { products, labelTiers, addProduct, updateProduct, deleteProduct } = useData();
  const [q, setQ] = useState(""); const [fCat, setFCat] = useState(""); const [fBrand, setFBrand] = useState("");
  const [fSource, setFSource] = useState(""); const [fTech, setFTech] = useState("");
  const [editId, setEditId] = useState(null); const [editRow, setEditRow] = useState({});
  const [showAdd, setShowAdd] = useState(false); const [addMode, setAddMode] = useState(null);
  const [pasteText, setPasteText] = useState("");

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
        <select value={fBrand} onChange={e => setFBrand(e.target.value)} style={{ width: 130, fontSize: 11 }}>
          <option value="">Tất cả Brand</option>{brands.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={fCat} onChange={e => setFCat(e.target.value)} style={{ width: 130, fontSize: 11 }}>
          <option value="">Tất cả Category</option>{cats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={fTech} onChange={e => setFTech(e.target.value)} style={{ width: 100, fontSize: 11 }}>
          <option value="">Tất cả Tech</option><option value="DTF">DTF</option><option value="DTG">DTG</option>
        </select>
        <select value={fSource} onChange={e => setFSource(e.target.value)} style={{ width: 100, fontSize: 11 }}>
          <option value="">Tất cả Nguồn</option><option value="REAL">REAL</option><option value="EST">EST</option><option value="MISSING">MISSING</option>
        </select>
        <div style={{ position: "relative" }}>
          <button className="bp2" onClick={() => setShowAdd(!showAdd)} style={{ fontSize: 11 }}>+ Thêm sản phẩm ▾</button>
          {showAdd && (
            <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, background: T.sf, border: "1px solid " + T.bd, borderRadius: 8, padding: 4, zIndex: 10, minWidth: 160 }}>
              <button className="bg2" onClick={() => { setAddMode("paste"); setShowAdd(false) }} style={{ width: "100%", fontSize: 11, marginBottom: 2, textAlign: "left", padding: "6px 10px" }}>📋 Paste từ Excel</button>
            </div>
          )}
        </div>
      </div>

      {addMode === "paste" && (
        <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Paste từ Excel</div>
          <div style={{ fontSize: 10, color: T.tm, marginBottom: 6 }}>Cột: Brand | Product | Size | Category | Lbs | Oz | Source. Dòng 1 = header.</div>
          <textarea value={pasteText} onChange={e => setPasteText(e.target.value)} rows={5} style={{ width: "100%", fontSize: 11, fontFamily: "monospace" }} placeholder="Paste data từ Excel..." />
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <button className="bp2" onClick={doImportPaste} style={{ fontSize: 11 }}>Import</button>
            <button className="bg2" onClick={() => { setAddMode(null); setPasteText("") }} style={{ fontSize: 11 }}>Hủy</button>
          </div>
        </div>
      )}

      <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, overflow: "hidden", maxHeight: "62vh", overflowY: "auto" }}>
        <table><thead><tr>
          <th>Brand</th><th>Sản phẩm</th><th>Size</th><th>Category</th>
          <th style={{ textAlign: "right" }}>Lbs</th><th style={{ textAlign: "right" }}>Oz</th><th>Tier</th><th>Nguồn</th><th style={{ width: 70 }}>Act</th>
        </tr></thead><tbody>
          {filtered.map(p => editId === p.id ? (
            <tr key={p.id} style={{ background: "rgba(59,130,246,.08)" }}>
              <td><input value={editRow.brand} onChange={e => setEditRow(r => ({ ...r, brand: e.target.value }))} style={{ width: "100%", fontSize: 11, padding: 3 }} /></td>
              <td><input value={editRow.product} onChange={e => setEditRow(r => ({ ...r, product: e.target.value }))} style={{ width: "100%", fontSize: 11, padding: 3 }} /></td>
              <td><input value={editRow.size} onChange={e => setEditRow(r => ({ ...r, size: e.target.value }))} style={{ width: 50, fontSize: 11, padding: 3 }} /></td>
              <td><input value={editRow.category} onChange={e => setEditRow(r => ({ ...r, category: e.target.value }))} style={{ width: "100%", fontSize: 11, padding: 3 }} /></td>
              <td><input type="number" step=".01" value={editRow.weightLbs} onChange={e => setEditRow(r => ({ ...r, weightLbs: e.target.value }))} style={{ width: 60, fontSize: 11, padding: 3, textAlign: "right" }} /></td>
              <td><input type="number" step=".01" value={editRow.weightOz} onChange={e => setEditRow(r => ({ ...r, weightOz: e.target.value }))} style={{ width: 60, fontSize: 11, padding: 3, textAlign: "right" }} /></td>
              <td style={{ fontSize: 10 }}>{calcTier(pn(editRow.weightOz) || 0, labelTiers)}</td>
              <td><select value={editRow.source} onChange={e => setEditRow(r => ({ ...r, source: e.target.value }))} style={{ fontSize: 10, padding: 2 }}>
                <option>REAL</option><option>EST</option><option>MISSING</option></select></td>
              <td><div style={{ display: "flex", gap: 3 }}>
                <button className="bp2" style={{ padding: "2px 6px", fontSize: 9 }} onClick={(e) => { e.stopPropagation(); console.log("✓ clicked"); saveEdit(); }}>✓</button>
                <button className="bg2" style={{ padding: "2px 6px", fontSize: 9 }} onClick={cancelEdit}>✕</button>
              </div></td>
            </tr>
          ) : (
            <tr key={p.id}>
              <td style={{ fontSize: 11 }}>{p.brand}</td>
              <td style={{ fontWeight: 500, maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.product}</td>
              <td><span className="b bi">{p.size}</span></td>
              <td style={{ fontSize: 11, color: T.tm }}>{p.category}</td>
              <td className="m" style={{ textAlign: "right" }}>{p.weightLbs}</td>
              <td className="m" style={{ textAlign: "right" }}>{p.weightOz}</td>
              <td style={{ fontSize: 10 }}>{calcTier(p.weightOz, labelTiers)}</td>
              <td><span className={"b " + (p.source === "REAL" ? "bok" : p.source === "EST" ? "bw" : "bdg")}>{p.source}</span></td>
              <td><div style={{ display: "flex", gap: 3 }}>
                <button className="bg2" style={{ padding: "2px 6px", fontSize: 10 }} onClick={() => startEdit(p)} title="Sửa">✏️</button>
                <button className="bdel" style={{ padding: "2px 6px", fontSize: 10 }} onClick={() => delProd(p.id)} title="Xóa">🗑</button>
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
          <button className={sub === "list" ? "bp2" : "bg2"} onClick={() => setSub("list")} style={{ fontSize: 11 }}>Danh sách sản phẩm ({products.length})</button>
          <button className={sub === "label" ? "bp2" : "bg2"} onClick={() => setSub("label")} style={{ fontSize: 11 }}>Bảng giá Label USPS ({labelTiers.length})</button>
        </div>
      </div>
      {sub === "list" && <ProductList />}
      {sub === "label" && <LabelTable />}
    </div>
  );
}
