import React, { useState, useMemo } from "react";
import { useData } from "../context/DataContext";
import { T, szOrd, getScenarios, ltColor, TBL_H_TALL } from "../lib/utils";
import { productsRawExact } from "../lib/indexes";

export default function RouterPreviewPage() {
  const { products, suppliers, prices, params, labelTiers, compPrices, routeCfg } = useData();
  const [q, setQ] = useState(""); const [fCat, setFCat] = useState("");
  const cats = useMemo(() => [...new Set(products.map(p => p.category).filter(Boolean))].sort(), [products]);
  const mode = routeCfg.labelMode || "BLENDED";

  /* TẦNG 1 — tính nặng, không phụ thuộc ô tìm kiếm */
  const computed = useMemo(() => {
    const pKeys = [...new Set(prices.map(p => p.product + "|||" + p.size))];
    return pKeys.map(k => {
      const [prod, sz] = k.split("|||");
      const w = productsRawExact(products, prod, sz); if (!w) return null;
      let sc = getScenarios(prod, sz, "1S", products, suppliers, prices, params, labelTiers, compPrices);
      if (mode === "EXP_ONLY") sc = sc.filter(s => s.lbl === "Exp" || s.lbl === "Self" || s.lbl === "Bld");
      else if (mode === "CHEAP_ONLY") sc = sc.filter(s => s.lbl === "Cheap" || s.lbl === "Bld" || s.lbl === "Self");
      return { prod, sz, cat: w.category || "", sc: sc.slice(0, 5) };
    }).filter(r => r != null && r.sc.length > 0)
      .sort((a, b) => a.prod.localeCompare(b.prod) || (szOrd(a.sz) - szOrd(b.sz)));
  }, [prices, products, suppliers, params, labelTiers, compPrices, mode]);

  /* TẦNG 2 — chỉ lọc, chạy mỗi lần gõ. Lọc sau khi sắp xếp cho ra đúng
     thứ tự như lọc trước rồi sắp xếp (phép sắp xếp giữ thứ tự phần bằng nhau). */
  const data = useMemo(() => computed.filter(r => {
    if (q && !(r.prod + " " + r.sz).toLowerCase().includes(q.toLowerCase())) return false;
    if (fCat && r.cat !== fCat) return false; return true;
  }), [computed, q, fCat]);

  const maxRank = data.reduce((m, r) => Math.max(m, r.sc.length), 0);

  return (
    <div className="fade">
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Router Preview</h2>
      <div style={{ fontSize: 14, color: T.tm, marginBottom: 10 }}>Kịch bản phân đơn theo chế độ Label: <b style={{ color: T.ac }}>{mode}</b> · Ranking rẻ nhất → đắt nhất</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm..." style={{ flex: 1 }} />
        <select value={fCat} onChange={e => setFCat(e.target.value)} style={{ width: 130, fontSize: 13 }}><option value="">All Cat</option>{cats.map(c => <option key={c}>{c}</option>)}</select>
      </div>
      <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, overflow: "auto", maxHeight: TBL_H_TALL }}>
        <table style={{ fontSize: 12 }}><thead>
          <tr><th colSpan={2} style={{ position: "sticky", top: 0, zIndex: 3, background: T.sa }} />
            {Array.from({ length: maxRank }, (_, i) => <th key={i} colSpan={3} style={{ textAlign: "center", position: "sticky", top: 0, zIndex: 3, background: T.sa,
              borderLeft: "2px solid " + (i === 0 ? T.ac : i === 1 ? T.w : T.bd), color: i === 0 ? T.ac : i === 1 ? T.w : T.tx, fontWeight: 700, fontSize: 14 }}>#{i + 1}</th>)}
          </tr>
          <tr><th style={{ position: "sticky", top: 31, zIndex: 3, background: T.sa, minWidth: 200, fontSize: 10 }}>Sản phẩm</th>
            <th style={{ position: "sticky", top: 31, zIndex: 3, background: T.sa, fontSize: 10 }}>Size</th>
            {Array.from({ length: maxRank }, (_, i) => <React.Fragment key={"h" + i}>
              <th style={{ position: "sticky", top: 31, zIndex: 3, background: T.sa, fontSize: 9, borderLeft: "2px solid " + (i === 0 ? T.ac : i === 1 ? T.w : T.bd) }}>Xưởng</th>
              <th style={{ position: "sticky", top: 31, zIndex: 3, background: T.sa, fontSize: 9 }}>Label</th>
              <th style={{ position: "sticky", top: 31, zIndex: 3, background: T.sa, fontSize: 9, textAlign: "right" }}>CP</th>
            </React.Fragment>)}
          </tr>
        </thead><tbody>
          {data.map((r, idx) => <tr key={idx}>
            <td style={{ fontWeight: 500, fontSize: 12 }}>{r.prod}</td><td><span className="b bi">{r.sz}</span></td>
            {Array.from({ length: maxRank }, (_, i) => { const s = r.sc[i]; if (!s) return <React.Fragment key={i}><td style={{ borderLeft: "2px solid " + T.bd }} /><td /><td /></React.Fragment>;
              return <React.Fragment key={i}>
                <td style={{ borderLeft: "2px solid " + (i === 0 ? T.ac : i === 1 ? T.w : T.bd), fontSize: 12 }}>{s.sup}</td>
                <td><span className="b" style={{ background: ltColor(s.lbl) + "22", color: ltColor(s.lbl), fontSize: 8 }}>{s.lbl}</span></td>
                <td className="m" style={{ textAlign: "right", color: i === 0 ? T.ac : T.tx, fontWeight: i === 0 ? 600 : 400 }}>{s.cost.toFixed(2)}</td>
              </React.Fragment> })}
          </tr>)}
        </tbody></table>
      </div>
    </div>
  );
}
