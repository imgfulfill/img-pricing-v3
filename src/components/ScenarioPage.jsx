import React, { useState, useMemo } from "react";
import { useData } from "../context/DataContext";
import { T, szOrd, getScenarios, ltColor, fmt } from "../lib/utils";

export default function ScenarioPage() {
  const { products, suppliers, prices, params, labelTiers, compPrices, routeCfg, lockedPrices } = useData();
  const [q, setQ] = useState(""); const [fType, setFType] = useState(""); const [fCat, setFCat] = useState("");
  const [side, setSide] = useState("1S");
  const cats = useMemo(() => [...new Set(products.map(p => p.category).filter(Boolean))].sort(), [products]);
  const mode = routeCfg.labelMode || "BLENDED";

  const data = useMemo(() => {
    const pKeys = [...new Set(prices.map(p => p.product + "|||" + p.size))];
    return pKeys.map(k => {
      const [prod, sz] = k.split("|||");
      const w = products.find(p => p.product === prod && p.size === sz); if (!w) return null;
      let sc = getScenarios(prod, sz, side, products, suppliers, prices, params, labelTiers, compPrices);
      // Apply label mode filter
      if (mode === "EXP_ONLY") sc = sc.filter(s => s.lbl === "Exp" || s.lbl === "Self" || s.lbl === "Bld");
      else if (mode === "CHEAP_ONLY") sc = sc.filter(s => s.lbl === "Cheap" || s.lbl === "Bld" || s.lbl === "Self");
      // Get selling price for LN calculation
      const lkKey = prod + "|||" + sz;
      const locked = lockedPrices[lkKey];
      const sellingPrice = locked != null ? (locked.v != null ? locked.v : locked) : null;
      return { k, prod, sz, oz: w.weightOz, cat: w.category || "", sc, sellingPrice };
    }).filter(r => r != null && r.sc.length > 0).filter(r => {
      if (q && !(r.prod + " " + r.sz).toLowerCase().includes(q.toLowerCase())) return false;
      if (fType && !r.prod.includes(fType)) return false;
      if (fCat && r.cat !== fCat) return false;
      return true;
    }).sort((a, b) => a.prod.localeCompare(b.prod) || (szOrd(a.sz) - szOrd(b.sz)));
  }, [prices, products, suppliers, params, labelTiers, compPrices, q, fType, fCat, side, mode, lockedPrices]);

  const maxRank = Math.min(data.reduce((m, r) => Math.max(m, r.sc.length), 0), 7);
  const lnColor = v => v == null ? T.td : v >= params.minProfit ? T.ac : v > 0 ? T.w : T.dg;

  return (
    <div className="fade">
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>{"Kịch bản phân đơn"}</h2>
      <div style={{ fontSize: 12, color: T.tm, marginBottom: 4 }}>{data.length + " SP"}</div>
      <div style={{ fontSize: 10, color: T.w, marginBottom: 10 }}>{"Chế độ Label: " + mode + " · Rank 1 = CP thấp nhất (ưu tiên đẩy đơn)"}</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={"Tìm..."} style={{ flex: 1, minWidth: 150 }} />
        <select value={fType} onChange={e => setFType(e.target.value)} style={{ width: 100, fontSize: 11 }}><option value="">DTF/DTG</option><option>DTF</option><option>DTG</option></select>
        <select value={fCat} onChange={e => setFCat(e.target.value)} style={{ width: 120, fontSize: 11 }}><option value="">All</option>{cats.map(c => <option key={c}>{c}</option>)}</select>
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
        <button className={side === "1S" ? "bp2" : "bg2"} onClick={() => setSide("1S")} style={{ fontSize: 12, padding: "6px 16px", fontWeight: 600 }}>RANK 1 MẶT</button>
        <button className={side === "2S" ? "bp2" : "bg2"} onClick={() => setSide("2S")} style={{ fontSize: 12, padding: "6px 16px", fontWeight: 600 }}>RANK 2 MẶT</button>
      </div>
      <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, overflow: "hidden" }}>
        <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "66vh" }}>
          <table style={{ minWidth: maxRank * 320 + 300 }}>
            <thead>
              <tr>
                <th style={{ position: "sticky", left: 0, top: 0, zIndex: 5, background: T.sa, minWidth: 180 }}>SP</th>
                <th style={{ position: "sticky", left: 180, top: 0, zIndex: 5, background: T.sa }}>Size</th>
                <th style={{ position: "sticky", left: 230, top: 0, zIndex: 5, background: T.sa, textAlign: "right" }}>OZ</th>
                {Array.from({ length: maxRank }, (_, i) => (
                  <th key={i} colSpan={4} style={{ textAlign: "center", position: "sticky", top: 0, zIndex: 3, background: T.sa,
                    borderLeft: "2px solid " + (i === 0 ? T.ac : i === 1 ? T.w : T.bd), color: i === 0 ? T.ac : i === 1 ? T.w : T.tx, fontSize: 13, fontWeight: 700 }}>
                    #{i + 1}
                  </th>
                ))}
              </tr>
              <tr>
                <th style={{ position: "sticky", left: 0, top: 34, zIndex: 5, background: T.sa }} />
                <th style={{ position: "sticky", left: 180, top: 34, zIndex: 5, background: T.sa }} />
                <th style={{ position: "sticky", left: 230, top: 34, zIndex: 5, background: T.sa }} />
                {Array.from({ length: maxRank }, (_, i) => (
                  <React.Fragment key={"h" + i}>
                    <th style={{ position: "sticky", top: 34, zIndex: 3, background: T.sa, borderLeft: "2px solid " + (i === 0 ? T.ac : i === 1 ? T.w : T.bd), fontSize: 9 }}>{"XƯỞNG"}</th>
                    <th style={{ position: "sticky", top: 34, zIndex: 3, background: T.sa, fontSize: 9 }}>LABEL</th>
                    <th style={{ position: "sticky", top: 34, zIndex: 3, background: T.sa, fontSize: 9, textAlign: "right", color: i === 0 ? T.ac : T.tx }}>CP</th>
                    <th style={{ position: "sticky", top: 34, zIndex: 3, background: T.sa, fontSize: 9, textAlign: "right" }}>LN</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map(r => (
                <tr key={r.k}>
                  <td style={{ position: "sticky", left: 0, background: T.sf, zIndex: 1, fontWeight: 500, fontSize: 11, whiteSpace: "nowrap" }}>{r.prod}</td>
                  <td style={{ position: "sticky", left: 180, background: T.sf, zIndex: 1 }}><span className="b bi">{r.sz}</span></td>
                  <td className="m" style={{ position: "sticky", left: 230, background: T.sf, zIndex: 1, textAlign: "right" }}>{r.oz}</td>
                  {Array.from({ length: maxRank }, (_, i) => {
                    const s = r.sc[i];
                    if (!s) return <React.Fragment key={i}><td style={{ borderLeft: "2px solid " + T.bd }} /><td /><td /><td /></React.Fragment>;
                    // LN = selling price - CP (actual profit)
                    const ln = r.sellingPrice != null ? Math.round((r.sellingPrice - s.cost) * 100) / 100 : null;
                    return (
                      <React.Fragment key={i}>
                        <td style={{ borderLeft: "2px solid " + (i === 0 ? T.ac : i === 1 ? T.w : T.bd), fontSize: 11 }}>{s.sup}</td>
                        <td><span className="b" style={{ background: ltColor(s.lbl) + "22", color: ltColor(s.lbl) }}>{s.lbl}</span></td>
                        <td className="m" style={{ textAlign: "right", fontWeight: i === 0 ? 700 : 400, color: i === 0 ? T.ac : T.tx }}>{s.cost.toFixed(2)}</td>
                        <td className="m" style={{ textAlign: "right", fontWeight: 600, color: lnColor(ln) }}>{ln != null ? ln.toFixed(2) : "\u2014"}</td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
