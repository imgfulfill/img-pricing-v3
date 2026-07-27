import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { useData } from "../context/DataContext";
import { T, szOrd, fmt } from "../lib/utils";

export default function LockedPage() {
  const { products, lockedPrices, removeLockedPrice, clearLockedPrices, params } = useData();
  const [q, setQ] = useState(""); const [fCat, setFCat] = useState("");
  const cats = useMemo(() => [...new Set(products.map(p => p.category).filter(Boolean))].sort(), [products]);

  const data = useMemo(() => Object.entries(lockedPrices).map(([k, val]) => {
    const [prod, sz] = k.split("|||"); const p = products.find(x => x.product === prod && x.size === sz);
    const V = val?.v != null ? val.v : val; const W = val?.w != null ? val.w : null; const X = val?.x != null ? val.x : null; const SF = val?.sf != null ? val.sf : null;
    const cat = p?.category || ""; const catShip = (params.categoryShip || {})[cat] || { s1: 4.99, sa: 1.99 };
    return { k, prod, sz, brand: p?.brand || "", cat, V, W, X, shipF: SF || catShip.s1, shipA: catShip.sa };
  }).filter(r => {
    if (q && !(r.prod + " " + r.sz + " " + r.brand).toLowerCase().includes(q.toLowerCase())) return false;
    if (fCat && r.cat !== fCat) return false; return true;
  }).sort((a, b) => a.prod.localeCompare(b.prod) || (szOrd(a.sz) - szOrd(b.sz))), [lockedPrices, products, q, fCat, params]);

  const clearAll = async () => { if (confirm("Xóa toàn bộ giá chốt?")) await clearLockedPrices() };
  const doExport = () => {
    const rows = data.map(r => ({ "Brand": r.brand, "Product Name": r.prod, "Size": r.sz, "Price Item": r.W, "2nd Side Print": r.X,
      "US Standard - First": r.shipF, "US Standard - Add": r.shipA }));
    const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Bảng giá IMG");
    XLSX.writeFile(wb, "IMG_BangGia_" + new Date().toISOString().slice(0, 10) + ".xlsx");
  };
  const GH = { position: "sticky", top: 0, zIndex: 3, background: T.sa, textAlign: "center", fontSize: 10, fontWeight: 600, padding: "6px 4px" };

  return (
    <div className="fade">
      <h2 style={{ fontSize: 22, fontWeight: 700, fontStyle: "italic", marginBottom: 4 }}>Bảng giá IMG</h2>
      <div style={{ fontSize: 12, color: T.tm, marginBottom: 12 }}>{data.length} sản phẩm · Giá chốt snapshot — không thay đổi khi tham số thay đổi</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10, alignItems: "center" }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm..." style={{ flex: 1 }} />
        <select value={fCat} onChange={e => setFCat(e.target.value)} style={{ width: 130, fontSize: 11 }}><option value="">All Category</option>{cats.map(c => <option key={c}>{c}</option>)}</select>
        <button className="bp2" onClick={doExport} style={{ fontSize: 11 }}>📥 Export .xlsx</button>
        <button className="bdel" onClick={clearAll} style={{ fontSize: 11 }}>Xóa tất cả</button>
      </div>
      {data.length === 0 ? (
        <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, padding: 40, textAlign: "center", color: T.tm }}>
          <div style={{ fontSize: 30, marginBottom: 8 }}>📋</div>
          <div style={{ fontSize: 13 }}>Chưa có giá chốt. Vào <b>Giá bán đề xuất</b> → nhấn "Paste → Giá chốt"</div>
        </div>
      ) : (
        <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "70vh" }}>
            <table style={{ minWidth: 700, fontSize: 10 }}>
              <thead>
                <tr>
                  <th colSpan={3} style={{ ...GH }} />
                  <th style={{ ...GH }}>Price Item</th>
                  <th style={{ ...GH }}>2nd Side Print</th>
                  <th colSpan={2} style={{ ...GH, borderLeft: "2px solid " + T.ac, background: "rgba(16,185,129,.08)", color: T.ac }}>Ship by IMG</th>
                  <th style={{ ...GH, width: 40 }}>Act</th>
                </tr>
              </thead>
              <tbody>
                {data.map(r => (
                  <tr key={r.k}>
                    <td style={{ fontSize: 9, color: T.tm, fontWeight: 500 }}>{r.brand}</td>
                    <td style={{ fontWeight: 500, fontSize: 10, whiteSpace: "nowrap" }}>{r.prod}</td>
                    <td style={{ textAlign: "center" }}><span className={"b " + (r.prod.includes("DTG") ? "bp" : "bi")}>{r.sz}</span></td>
                    <td className="m" style={{ textAlign: "center", fontWeight: 600 }}>{r.W != null ? fmt(r.W) : "—"}</td>
                    <td className="m" style={{ textAlign: "center" }}>{r.X != null ? fmt(r.X) : "—"}</td>
                    <td className="m" style={{ textAlign: "center", borderLeft: "2px solid " + T.ac, color: T.ac, fontWeight: 600 }}>{fmt(r.shipF)}</td>
                    <td className="m" style={{ textAlign: "center", color: T.ac }}>{fmt(r.shipA)}</td>
                    <td style={{ textAlign: "center" }}><button className="bdel" style={{ padding: "1px 5px", fontSize: 9 }} onClick={async () => { const [p, s] = r.k.split("|||"); await removeLockedPrice(p, s) }}>🗑</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
