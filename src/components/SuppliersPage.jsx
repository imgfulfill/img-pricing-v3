import React, { useState, useMemo } from "react";
import { useData } from "../context/DataContext";
import { T, pn, szOrd, fmt } from "../lib/utils";

export default function SuppliersPage() {
  const { suppliers, prices, products, addSupplier, updateSupplier, deleteSupplier, toggleSupplierActive, addPrice, updatePrice, deletePrice } = useData();
  const [sel, setSel] = useState(null);
  const [priceQ, setPriceQ] = useState(""); const [pFTech, setPFTech] = useState(""); const [pFSize, setPFSize] = useState("");
  const [showAddPrice, setShowAddPrice] = useState(false);
  const [bulkMode, setBulkMode] = useState(false); const [bulkSel, setBulkSel] = useState(new Set());
  const [bulkVals, setBulkVals] = useState({ baseCost: "", handlingFee: "", cost2nd: "", cost2ndOver: "", cost2ndCust: "", cost2ndSleeve: "" });
  const [editPriceId, setEditPriceId] = useState(null); const [editPriceRow, setEditPriceRow] = useState({});
  // Add price: multi-select with search
  const [addQ, setAddQ] = useState("");
  const [addSel, setAddSel] = useState(new Set());
  // Add/Edit supplier
  const [showAddSup, setShowAddSup] = useState(false);
  const [editSup, setEditSup] = useState(null); // null = add mode, id = edit mode
  const [supForm, setSupForm] = useState({ name: "", handling: 0, useCheap: 0, useExp: 1, selfShip: 0, api: 0, oversizeFee: null, customFee: null, sleeveFee: null });

  const selSup = suppliers.find(s => s.id === sel);

  const supPrices = useMemo(() => {
    if (!selSup) return [];
    return prices.filter(p => p.supplierId === selSup.id || p.supplierId === selSup.name).filter(p => {
      if (priceQ && !(p.product + " " + p.size).toLowerCase().includes(priceQ.toLowerCase())) return false;
      if (pFTech && !p.product.includes(pFTech)) return false;
      if (pFSize && p.size !== pFSize) return false;
      return true;
    }).sort((a, b) => a.product.localeCompare(b.product) || (szOrd(a.size) - szOrd(b.size)));
  }, [prices, selSup, priceQ, pFTech, pFSize]);

  const missingProducts = useMemo(() => {
    if (!selSup) return [];
    const existing = new Set(prices.filter(p => p.supplierId === selSup.id || p.supplierId === selSup.name).map(p => p.product + "|||" + p.size));
    return products.filter(p => !existing.has(p.product + "|||" + p.size));
  }, [products, prices, selSup]);

  const filteredMissing = useMemo(() => {
    if (!addQ) return missingProducts;
    return missingProducts.filter(p => (p.product + " " + p.size).toLowerCase().includes(addQ.toLowerCase()));
  }, [missingProducts, addQ]);

  const priceSizes = useMemo(() => {
    if (!selSup) return [];
    return [...new Set(prices.filter(p => p.supplierId === selSup.id || p.supplierId === selSup.name).map(p => p.size))].sort((a, b) => szOrd(a) - szOrd(b));
  }, [prices, selSup]);

  const labelTypes = (s) => {
    const t = []; if (s.useCheap) t.push("Cheap"); if (s.useExp) t.push("Exp"); if (s.selfShip) t.push("Self-ship");
    if (s.useCheap && s.useExp) t.push("Blended"); return t;
  };

  // ── Price edit ──
  const startEditPrice = (p) => { setEditPriceId(p.id); setEditPriceRow({ ...p }) };
  const saveEditPrice = async () => {
    const r = editPriceRow;
    const bc = pn(r.baseCost) || 0; const hf = pn(r.handlingFee) || 0;
    await updatePrice(editPriceId, {
      product: r.product, size: r.size,
      baseCost: bc, handlingFee: hf, totalCost: Math.round((bc + hf) * 100) / 100,
      cost2nd: pn(r.cost2nd), cost2ndOver: pn(r.cost2ndOver), cost2ndCust: pn(r.cost2ndCust), cost2ndSleeve: pn(r.cost2ndSleeve)
    });
    setEditPriceId(null);
  };

  // ── Add multiple prices ──
  const doAddPrices = async () => {
    if (!selSup || addSel.size === 0) return;
    for (const key of addSel) {
      const [prod, sz] = key.split("|||");
      await addPrice({ supplierId: selSup.id, product: prod, size: sz, baseCost: 0, handlingFee: selSup.handling || 0, totalCost: selSup.handling || 0 });
    }
    setAddSel(new Set()); setShowAddPrice(false); setAddQ("");
    alert("Đã thêm " + addSel.size + " giá mua");
  };

  const toggleAddSel = (key) => {
    const ns = new Set(addSel); ns.has(key) ? ns.delete(key) : ns.add(key); setAddSel(ns);
  };
  const selectAllMissing = () => {
    if (addSel.size === filteredMissing.length) setAddSel(new Set());
    else setAddSel(new Set(filteredMissing.map(p => p.product + "|||" + p.size)));
  };

  // ── Bulk edit ──
  const doBulkApply = async () => {
    if (bulkSel.size === 0) return alert("Chọn ít nhất 1 sản phẩm");
    for (const pid of bulkSel) {
      const p = prices.find(x => x.id === pid); if (!p) continue;
      const np = {};
      if (bulkVals.baseCost !== "") { np.baseCost = pn(bulkVals.baseCost) || 0; np.totalCost = Math.round((np.baseCost + (p.handlingFee || 0)) * 100) / 100 }
      if (bulkVals.handlingFee !== "") { np.handlingFee = pn(bulkVals.handlingFee) || 0; np.totalCost = Math.round(((p.baseCost || 0) + np.handlingFee) * 100) / 100 }
      if (bulkVals.cost2nd !== "") np.cost2nd = pn(bulkVals.cost2nd);
      if (bulkVals.cost2ndOver !== "") np.cost2ndOver = pn(bulkVals.cost2ndOver);
      if (bulkVals.cost2ndCust !== "") np.cost2ndCust = pn(bulkVals.cost2ndCust);
      if (bulkVals.cost2ndSleeve !== "") np.cost2ndSleeve = pn(bulkVals.cost2ndSleeve);
      await updatePrice(pid, np);
    }
    setBulkSel(new Set()); setBulkVals({ baseCost: "", handlingFee: "", cost2nd: "", cost2ndOver: "", cost2ndCust: "", cost2ndSleeve: "" });
    setBulkMode(false);
  };

  const toggleBulkAll = () => {
    if (bulkSel.size === supPrices.length) setBulkSel(new Set());
    else setBulkSel(new Set(supPrices.map(p => p.id)));
  };

  // ── Supplier CRUD ──
  const openAddSup = () => {
    setSupForm({ name: "", handling: 0, useCheap: 0, useExp: 1, selfShip: 0, api: 0, oversizeFee: null, customFee: null, sleeveFee: null });
    setEditSup(null); setShowAddSup(true);
  };
  const openEditSup = (s) => {
    setSupForm({ name: s.name, handling: s.handling || 0, useCheap: s.useCheap || 0, useExp: s.useExp || 0, selfShip: s.selfShip || 0, api: s.api || 0,
      oversizeFee: s.oversizeFee, customFee: s.customFee, sleeveFee: s.sleeveFee });
    setEditSup(s.id); setShowAddSup(true);
  };
  const saveSup = async () => {
    if (!supForm.name.trim()) return alert("Nhập tên đối tác");
    if (editSup) {
      await updateSupplier(editSup, supForm);
    } else {
      await addSupplier({ ...supForm, active: true });
    }
    setShowAddSup(false);
  };

  const updateSup = (id, field, val) => updateSupplier(id, { [field]: val });

  return (
    <div className="fade">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>Quản lý đối tác</h2>
        <button className="bp2" onClick={openAddSup} style={{ fontSize: 12 }}>+ Tạo đối tác mới</button>
      </div>

      {/* Add/Edit Supplier Modal */}
      {showAddSup && <div style={{ background: T.sf, border: "1px solid " + T.p, borderRadius: 10, padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>{editSup ? "Chỉnh sửa đối tác" : "Tạo đối tác mới"}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: T.tm, marginBottom: 3 }}>Tên đối tác *</div>
            <input value={supForm.name} onChange={e => setSupForm(f => ({ ...f, name: e.target.value }))} placeholder="VD: Lenful" style={{ width: "100%", fontSize: 12 }} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: T.tm, marginBottom: 3 }}>Handling Fee ($)</div>
            <input type="number" step=".01" value={supForm.handling} onChange={e => setSupForm(f => ({ ...f, handling: pn(e.target.value) || 0 }))} style={{ width: "100%", fontSize: 12 }} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: T.tm, marginBottom: 3 }}>Label Ship</div>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              {[["useCheap", "Cheap"], ["useExp", "Exp"], ["selfShip", "Self"], ["api", "API"]].map(([k, l]) => (
                <label key={k} style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 3, cursor: "pointer" }}>
                  <input type="checkbox" checked={!!supForm[k]} onChange={e => setSupForm(f => ({ ...f, [k]: e.target.checked ? 1 : 0 }))} /> {l}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
          {[["oversizeFee", "Oversize Fee ($)"], ["customFee", "Custom Fee ($)"], ["sleeveFee", "Sleeve Fee ($)"]].map(([k, l]) => (
            <div key={k}>
              <div style={{ fontSize: 10, color: T.tm, marginBottom: 3 }}>{l}</div>
              <input type="number" step=".01" value={supForm[k] ?? ""} placeholder="—" onChange={e => setSupForm(f => ({ ...f, [k]: pn(e.target.value) }))} style={{ width: "100%", fontSize: 12 }} />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="bp2" onClick={saveSup} style={{ fontSize: 12 }}>{editSup ? "Lưu thay đổi" : "Tạo đối tác"}</button>
          <button className="bg2" onClick={() => setShowAddSup(false)} style={{ fontSize: 12 }}>Hủy</button>
        </div>
      </div>}

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 14 }}>
        {/* Supplier list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {suppliers.map(s => (
            <div key={s.id} onClick={() => { setSel(s.id); setPriceQ(""); setBulkMode(false); setShowAddPrice(false) }}
              style={{ background: sel === s.id ? "rgba(59,130,246,.1)" : T.sf, border: "1px solid " + (sel === s.id ? T.p : T.bd), borderRadius: 10, padding: 12, cursor: "pointer", opacity: s.active ? 1 : .5, transition: "all .2s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: T.p, cursor: "pointer" }} onClick={e => { e.stopPropagation(); openEditSup(s) }} title="Sửa">✏️</span>
                  <div className={"toggle " + (s.active ? "on" : "off")} onClick={e => { e.stopPropagation(); toggleSupplierActive(s.id) }}
                    title={s.active ? "Đang hoạt động" : "Đã tắt"} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {labelTypes(s).map(t => <span key={t} className={"b " + (t === "Cheap" ? "bw" : t === "Self-ship" ? "bdg" : "bi")}>{t}</span>)}
                {s.api ? <span className="b bok">API</span> : null}
                {!s.active && <span className="b bdg">Tắt</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Supplier detail */}
        {!selSup ? (
          <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, padding: 40, textAlign: "center", color: T.tm }}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>👈</div><div style={{ fontSize: 13 }}>Chọn xưởng bên trái</div>
          </div>
        ) : (
          <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{selSup.name} {!selSup.active && <span className="b bdg">Tắt</span>}</div>
                <div style={{ fontSize: 11, color: T.tm }}>{supPrices.length} giá mua · Handling: ${selSup.handling}</div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button className="bg2" onClick={() => openEditSup(selSup)} style={{ fontSize: 10 }}>✏️ Sửa thông tin</button>
                <div className={"toggle " + (selSup.active ? "on" : "off")} onClick={() => toggleSupplierActive(selSup.id)} />
              </div>
            </div>

            {/* Config */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div style={{ background: T.sa, borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 10, color: T.tm, marginBottom: 4 }}>Label Ship</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {["useCheap", "useExp", "selfShip"].map(k => (
                    <label key={k} style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 3, cursor: "pointer" }}>
                      <input type="checkbox" checked={!!selSup[k]} onChange={e => updateSup(selSup.id, k, e.target.checked ? 1 : 0)} />
                      {k === "useCheap" ? "Cheap" : k === "useExp" ? "Exp" : "Self"}
                    </label>
                  ))}
                  <label style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 3, cursor: "pointer", color: selSup.api ? T.p : T.td, borderLeft: "1px solid " + T.bd, paddingLeft: 8 }}>
                    <input type="checkbox" checked={!!selSup.api} onChange={e => updateSup(selSup.id, "api", e.target.checked ? 1 : 0)} />🔗 API
                  </label>
                </div>
              </div>
              <div style={{ background: T.sa, borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 10, color: T.tm, marginBottom: 4 }}>Phụ phí mặc định</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {[{ k: "oversizeFee", l: "Over" }, { k: "customFee", l: "Cust" }, { k: "sleeveFee", l: "Slv" }].map(f => (
                    <div key={f.k}>
                      <div style={{ fontSize: 8, color: T.td }}>{f.l}</div>
                      <input type="number" step=".01" value={selSup[f.k] ?? ""} placeholder="—"
                        onChange={e => updateSup(selSup.id, f.k, pn(e.target.value))} style={{ width: 70, padding: 3, fontSize: 10 }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Price tools */}
            <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
              <input value={priceQ} onChange={e => setPriceQ(e.target.value)} placeholder="Tìm..." style={{ flex: 1, minWidth: 120, fontSize: 11 }} />
              <select value={pFTech} onChange={e => setPFTech(e.target.value)} style={{ width: 80, fontSize: 10 }}><option value="">Tech</option><option>DTF</option><option>DTG</option></select>
              <select value={pFSize} onChange={e => setPFSize(e.target.value)} style={{ width: 70, fontSize: 10 }}><option value="">Size</option>{priceSizes.map(s => <option key={s}>{s}</option>)}</select>
              <button className={bulkMode ? "bp2" : "bg2"} onClick={() => { setBulkMode(!bulkMode); setBulkSel(new Set()) }} style={{ fontSize: 10 }}>Bulk Edit</button>
              <button className="bp2" onClick={() => { setShowAddPrice(!showAddPrice); setAddQ(""); setAddSel(new Set()) }} style={{ fontSize: 10 }}>{showAddPrice ? "Đóng" : "+ Thêm giá"}</button>
            </div>

            {/* Add price: searchable multi-select */}
            {showAddPrice && (
              <div style={{ background: T.sa, borderRadius: 8, padding: 12, marginBottom: 10, border: "1px solid " + T.bd }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Thêm giá mua — {missingProducts.length} SP chưa có giá</div>
                <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
                  <input value={addQ} onChange={e => setAddQ(e.target.value)} placeholder="Tìm sản phẩm..." style={{ flex: 1, fontSize: 11 }} />
                  <button className="bg2" onClick={selectAllMissing} style={{ fontSize: 9 }}>
                    {addSel.size === filteredMissing.length && filteredMissing.length > 0 ? "Bỏ chọn" : "Chọn tất cả (" + filteredMissing.length + ")"}
                  </button>
                  <button className="bp2" onClick={doAddPrices} disabled={addSel.size === 0} style={{ fontSize: 10, opacity: addSel.size === 0 ? .5 : 1 }}>
                    Thêm {addSel.size} SP
                  </button>
                </div>
                <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid " + T.bd, borderRadius: 6, background: T.sf }}>
                  {filteredMissing.length === 0 ? (
                    <div style={{ padding: 16, textAlign: "center", color: T.td, fontSize: 11 }}>Tất cả SP đã có giá cho xưởng này</div>
                  ) : filteredMissing.map(p => {
                    const key = p.product + "|||" + p.size;
                    return (
                      <div key={key} onClick={() => toggleAddSel(key)} style={{
                        display: "flex", gap: 8, alignItems: "center", padding: "5px 10px", cursor: "pointer", fontSize: 11,
                        background: addSel.has(key) ? "rgba(59,130,246,.1)" : "transparent", borderBottom: "1px solid " + T.bd
                      }}>
                        <input type="checkbox" checked={addSel.has(key)} readOnly style={{ pointerEvents: "none" }} />
                        <span style={{ flex: 1 }}>{p.product}</span>
                        <span className="b bi" style={{ fontSize: 9 }}>{p.size}</span>
                        <span style={{ fontSize: 9, color: T.td }}>{p.category}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bulk edit bar */}
            {bulkMode && (
              <div style={{ background: T.sa, borderRadius: 8, padding: 10, marginBottom: 10, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                {[{ k: "baseCost", l: "Base" }, { k: "handlingFee", l: "Hndl" }, { k: "cost2nd", l: "2nd" }, { k: "cost2ndOver", l: "Over" }, { k: "cost2ndCust", l: "Cust" }, { k: "cost2ndSleeve", l: "Slv" }].map(f => (
                  <div key={f.k}>
                    <div style={{ fontSize: 8, color: T.td }}>{f.l}</div>
                    <input type="number" step=".01" value={bulkVals[f.k]} placeholder="—"
                      onChange={e => setBulkVals(v => ({ ...v, [f.k]: e.target.value }))} style={{ width: 70, padding: 3, fontSize: 10 }} />
                  </div>
                ))}
                <button className="bp2" onClick={doBulkApply} style={{ fontSize: 10, padding: "4px 12px" }}>Apply ({bulkSel.size})</button>
              </div>
            )}

            {/* Price table */}
            <div style={{ maxHeight: 400, overflowY: "auto" }}>
              <table><thead><tr>
                {bulkMode && <th style={{ width: 30 }}><input type="checkbox" checked={bulkSel.size === supPrices.length && supPrices.length > 0} onChange={toggleBulkAll} /></th>}
                <th style={{ minWidth: 160 }}>Sản phẩm</th><th>Size</th><th style={{ textAlign: "right" }}>Base</th><th style={{ textAlign: "right" }}>Hndl</th>
                <th style={{ textAlign: "right" }}>Total</th><th style={{ textAlign: "right" }}>2nd</th><th style={{ textAlign: "right" }}>Over</th>
                <th style={{ textAlign: "right" }}>Cust</th><th style={{ textAlign: "right" }}>Slv</th><th style={{ width: 60 }}>Act</th>
              </tr></thead><tbody>
                {supPrices.map(p => editPriceId === p.id ? (
                  <tr key={p.id} style={{ background: "rgba(59,130,246,.08)" }}>
                    {bulkMode && <td />}
                    <td><input value={editPriceRow.product || ""} onChange={e => setEditPriceRow(r => ({ ...r, product: e.target.value }))} style={{ width: "100%", fontSize: 10, padding: 2 }} /></td>
                    <td><input value={editPriceRow.size || ""} onChange={e => setEditPriceRow(r => ({ ...r, size: e.target.value }))} style={{ width: 50, fontSize: 10, padding: 2 }} /></td>
                    {["baseCost", "handlingFee", "totalCost", "cost2nd", "cost2ndOver", "cost2ndCust", "cost2ndSleeve"].map(k => (
                      <td key={k}><input type="number" step=".01" value={editPriceRow[k] != null ? editPriceRow[k] : ""} placeholder="—"
                        disabled={k === "totalCost"} onChange={e => setEditPriceRow(r => ({ ...r, [k]: e.target.value === "" ? null : e.target.value }))}
                        style={{ width: 60, fontSize: 10, padding: 2, textAlign: "right", background: k === "totalCost" ? T.bd : undefined }} /></td>
                    ))}
                    <td><div style={{ display: "flex", gap: 2 }}>
                      <button className="bp2" style={{ padding: "2px 6px", fontSize: 9 }} onClick={e => { e.stopPropagation(); saveEditPrice() }}>✓</button>
                      <button className="bg2" style={{ padding: "2px 6px", fontSize: 9 }} onClick={() => setEditPriceId(null)}>✕</button>
                    </div></td>
                  </tr>
                ) : (
                  <tr key={p.id}>
                    {bulkMode && <td><input type="checkbox" checked={bulkSel.has(p.id)} onChange={() => {
                      const ns = new Set(bulkSel); ns.has(p.id) ? ns.delete(p.id) : ns.add(p.id); setBulkSel(ns) }} /></td>}
                    <td style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 10 }}>{p.product}</td>
                    <td><span className="b bi">{p.size}</span></td>
                    <td className="m" style={{ textAlign: "right" }}>{fmt(p.baseCost)}</td>
                    <td className="m" style={{ textAlign: "right", color: T.tm }}>{fmt(p.handlingFee)}</td>
                    <td className="m" style={{ textAlign: "right", fontWeight: 600 }}>{fmt(p.totalCost)}</td>
                    <td className="m" style={{ textAlign: "right" }}>{p.cost2nd != null ? fmt(p.cost2nd) : "—"}</td>
                    <td className="m" style={{ textAlign: "right", color: T.w }}>{p.cost2ndOver != null ? fmt(p.cost2ndOver) : "—"}</td>
                    <td className="m" style={{ textAlign: "right", color: T.w }}>{p.cost2ndCust != null ? fmt(p.cost2ndCust) : "—"}</td>
                    <td className="m" style={{ textAlign: "right", color: T.w }}>{p.cost2ndSleeve != null ? fmt(p.cost2ndSleeve) : "—"}</td>
                    <td><div style={{ display: "flex", gap: 2 }}>
                      <button className="bg2" style={{ padding: "1px 5px", fontSize: 9 }} onClick={() => startEditPrice(p)}>✏️</button>
                      <button className="bdel" style={{ padding: "1px 5px", fontSize: 9 }} onClick={async () => { if (confirm("Xóa giá này?")) await deletePrice(p.id) }}>🗑</button>
                    </div></td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
