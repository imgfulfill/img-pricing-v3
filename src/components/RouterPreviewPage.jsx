import React, { useState, useMemo } from "react";
import { useData } from "../context/DataContext";
import { T, szOrd, getScenarios, ltColor } from "../lib/utils";

export default function RouterPreviewPage() {
  const { products, suppliers, prices, params, labelTiers, compPrices, routeCfg } = useData();
  const [q, setQ] = useState(""); const [fCat, setFCat] = useState("");
  const cats = useMemo(() => [...new Set(products.map(p => p.category).filter(Boolean))].sort(), [products]);
  const mode = routeCfg.labelMode || "BLENDED";

  const data = useMemo(() => {
    const pKeys = [...new Set(prices.map(p => p.product + "|||" + p.size))];
    return pKeys.map(k => {
      const [prod, sz] = k.split("|||");
      const w = products.find(p => p.product === prod && p.size === sz); if (!w) return null;
      let sc = getScenarios(prod, sz, "1S", products, suppliers, prices, params, labelTiers, compPrices);
      if (mode === "EXP_ONLY") sc = sc.filter(s => s.lbl === "Exp" || s.lbl === "Self" || s.lbl === "Bld");
      else if (mode === "CHEAP_ONLY") sc = sc.filter(s => s.lbl === "Cheap" || s.lbl === "Bld" || s.lbl === "Self");
      return { prod, sz, cat: w.category || "", sc: sc.slice(0, 5) };
    }).filter(r => r != null && r.sc.length > 0).filter(r => {
      if (q && !(r.prod + " " + r.sz).toLowerCase().includes(q.toLowerCase())) return false;
      if (fCat && r.cat !== fCat) return false; return true;
    }).sort((a, b) => a.prod.localeCompare(b.prod) || (szOrd(a.sz) - szOrd(b.sz)));
  }, [prices, products, suppliers, params, labelTiers, compPrices, q, fCat, mode]);

  const maxRank = data.reduce((m, r) => Math.max(m, r.sc.length), 0);

  return (
    <div className="fade">
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Router Preview</h2>
      <div style={{ fontSize: 12, color: T.tm, marginBottom: 10 }}>Kịch bản phân đơn theo chế độ Label: <b style={{ color: T.ac }}>{mode}</b> · Ranking rẻ nhất → đắt nhất</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm..." style={{ flex: 1 }} />
        <select value={fCat} onChange={e => setFCat(e.target.value)} style={{ width: 130, fontSize: 11 }}><option value="">All Cat</option>{cats.map(c => <option key={c}>{c}</option>)}</select>
      </div>
      <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, overflow: "auto", maxHeight: "62vh" }}>
        <table style={{ fontSize: 10 }}><thead>
          <tr><th colSpan={2} style={{ position: "sticky", top: 0, zIndex: 3, background: T.sa }} />
            {Array.from({ length: maxRank }, (_, i) => <th key={i} colSpan={3} style={{ textAlign: "center", position: "sticky", top: 0, zIndex: 3, background: T.sa,
              borderLeft: "2px solid " + (i === 0 ? T.ac : i === 1 ? T.w : T.bd), color: i === 0 ? T.ac : i === 1 ? T.w : T.tx, fontWeight: 700, fontSize: 12 }}>#{i + 1}</th>)}
          </tr>
          <tr><th style={{ position: "sticky", top: 28, zIndex: 3, background: T.sa, minWidth: 200, fontSize: 9 }}>Sản phẩm</th>
            <th style={{ position: "sticky", top: 28, zIndex: 3, background: T.sa, fontSize: 9 }}>Size</th>
            {Array.from({ length: maxRank }, (_, i) => <React.Fragment key={"h" + i}>
              <th style={{ position: "sticky", top: 28, zIndex: 3, background: T.sa, fontSize: 8, borderLeft: "2px solid " + (i === 0 ? T.ac : i === 1 ? T.w : T.bd) }}>Xưởng</th>
              <th style={{ position: "sticky", top: 28, zIndex: 3, background: T.sa, fontSize: 8 }}>Label</th>
              <th style={{ position: "sticky", top: 28, zIndex: 3, background: T.sa, fontSize: 8, textAlign: "right" }}>CP</th>
            </React.Fragment>)}
          </tr>
        </thead><tbody>
          {data.map((r, idx) => <tr key={idx}>
            <td style={{ fontWeight: 500, fontSize: 10 }}>{r.prod}</td><td><span className="b bi">{r.sz}</span></td>
            {Array.from({ length: maxRank }, (_, i) => { const s = r.sc[i]; if (!s) return <React.Fragment key={i}><td style={{ borderLeft: "2px solid " + T.bd }} /><td /><td /></React.Fragment>;
              return <React.Fragment key={i}>
                <td style={{ borderLeft: "2px solid " + (i === 0 ? T.ac : i === 1 ? T.w : T.bd), fontSize: 10 }}>{s.sup}</td>
                <td><span className="b" style={{ background: ltColor(s.lbl) + "22", color: ltColor(s.lbl), fontSize: 7 }}>{s.lbl}</span></td>
                <td className="m" style={{ textAlign: "right", color: i === 0 ? T.ac : T.tx, fontWeight: i === 0 ? 600 : 400 }}>{s.cost.toFixed(2)}</td>
              </React.Fragment> })}
          </tr>)}
        </tbody></table>
      </div>
    </div>
  );
}
