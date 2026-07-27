import React, { useState, useMemo } from "react";
import { useData } from "../context/DataContext";
import { T, fmt, szOrd, calcLabel, ltColor } from "../lib/utils";

export default function ComparePage() {
  const { products, suppliers, prices, params, labelTiers, compPrices } = useData();
  const [q, setQ] = useState(""); const [fCat, setFCat] = useState(""); const [fType, setFType] = useState("");
  const cats = useMemo(() => [...new Set(products.map(p => p.category).filter(Boolean))].sort(), [products]);
  const supCols = useMemo(() => suppliers.filter(s => s.active).map(s => {
    const cols = []; if (s.selfShip) cols.push("Self"); if (s.useCheap) cols.push("Cheap"); if (s.useExp) cols.push("Exp"); if (s.useCheap && s.useExp) cols.push("Bld");
    return { ...s, cols };
  }).filter(s => s.cols.length > 0), [suppliers]);

  const data = useMemo(() => {
    const pKeys = [...new Set(prices.map(p => p.product + "|||" + p.size))];
    return pKeys.map(k => {
      const [prod, sz] = k.split("|||");
      const w = products.find(p => p.product === prod && p.size === sz); if (!w) return null;
      const lbl = calcLabel(w.weightOz, labelTiers, params);
      const cheapL = params.cheapPrice, expL = lbl ? lbl.expE : params.expSmallest, bldL = lbl ? lbl.bld : cheapL;
      const c1S = {}, c2S = {}; let min1 = Infinity, min2 = Infinity;
      prices.filter(p => p.product === prod && p.size === sz).forEach(pr => {
        const sup = supCols.find(s => s.name === pr.supplierId || s.id === pr.supplierId); if (!sup) return;
        const cpSX = pr.totalCost; const cost2nd = pr.cost2nd || 0;
        sup.cols.forEach(lt => {
          let lc = 0;
          if (lt === "Self") { const cs = compPrices.find(c => c.comp === sup.name && c.product === prod && c.size === sz); lc = cs?.shipFirst != null ? cs.shipFirst - (params.a2kDiscount || 0) : 0 }
          else if (lt === "Cheap") lc = cheapL; else if (lt === "Exp") lc = expL; else lc = bldL;
          const t1 = Math.round((cpSX + lc) * 100) / 100;
          const t2 = Math.round((cpSX + cost2nd + lc) * 100) / 100;
          const key = sup.name + "_" + lt;
          c1S[key] = t1; if (t1 < min1) min1 = t1;
          c2S[key] = t2; if (t2 < min2) min2 = t2;
        });
      });
      return { k, prod, sz, cat: w.category || "", oz: w.weightOz, expE: lbl ? lbl.expE : 0, bldL, c1S, c2S, min1: min1 < Infinity ? min1 : null, min2: min2 < Infinity ? min2 : null };
    }).filter(r => r != null).filter(r => {
      if (q && !(r.prod + " " + r.sz).toLowerCase().includes(q.toLowerCase())) return false;
      if (fCat && r.cat !== fCat) return false;
      if (fType && !r.prod.includes(fType)) return false;
      return true;
    }).sort((a, b) => a.prod.localeCompare(b.prod) || (szOrd(a.sz) - szOrd(b.sz)));
  }, [prices, products, supCols, params, labelTiers, compPrices, q, fCat, fType]);

  const totalSupCols = supCols.reduce((a, s) => a + s.cols.length, 0);
  const SL = [0, 180, 235, 280, 335];

  return (
    <div className="fade">
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>So sánh giá mua</h2>
      <div style={{ fontSize: 12, color: T.tm, marginBottom: 10 }}>{data.length} SP</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm..." style={{ flex: 1, minWidth: 150 }} />
        <select value={fType} onChange={e => setFType(e.target.value)} style={{ width: 100, fontSize: 11 }}><option value="">DTF/DTG</option><option>DTF</option><option>DTG</option></select>
        <select value={fCat} onChange={e => setFCat(e.target.value)} style={{ width: 120, fontSize: 11 }}><option value="">All</option>{cats.map(c => <option key={c}>{c}</option>)}</select>
      </div>
      <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, overflow: "hidden" }}>
        <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "75vh" }}>
          <table style={{ minWidth: totalSupCols * 160 + 390 }}>
            <thead>
              <tr>
                <th colSpan={5} style={{ position: "sticky", left: 0, top: 0, zIndex: 5, background: T.sa }} />
                <th colSpan={totalSupCols} style={{ textAlign: "center", position: "sticky", top: 0, zIndex: 3, background: T.sa, fontSize: 12, fontWeight: 600, color: T.tx, letterSpacing: 1, padding: "8px 12px", borderLeft: "2px solid " + T.bh }}>
                  CP TỔNG — IN 1 MẶT
                </th>
                <th colSpan={totalSupCols} style={{ textAlign: "center", position: "sticky", top: 0, zIndex: 3, background: T.sa, fontSize: 12, fontWeight: 600, color: T.w, letterSpacing: 1, padding: "8px 12px", borderLeft: "3px solid " + T.w }}>
                  CP TỔNG — IN 2 MẶT
                </th>
              </tr>
              <tr>
                <th style={{ position: "sticky", left: SL[0], top: 36, zIndex: 5, background: T.sa, minWidth: 180 }} rowSpan={2}>SP</th>
                <th style={{ position: "sticky", left: SL[1], top: 36, zIndex: 5, background: T.sa, minWidth: 55, textAlign: "center" }} rowSpan={2}>SIZE</th>
                <th style={{ position: "sticky", left: SL[2], top: 36, zIndex: 5, background: T.sa, textAlign: "center", minWidth: 45 }} rowSpan={2}>OZ</th>
                <th style={{ position: "sticky", left: SL[3], top: 36, zIndex: 5, background: T.sa, textAlign: "center", minWidth: 55 }} rowSpan={2} title="Giá label Exp thực tế (sau reweigh)">EXPHQ</th>
                <th style={{ position: "sticky", left: SL[4], top: 36, zIndex: 5, background: T.sa, textAlign: "center", minWidth: 50 }} rowSpan={2} title="Giá label Blended">BLD</th>
                {supCols.map(s => <th key={"1s_" + s.name} colSpan={s.cols.length} style={{ textAlign: "center", borderLeft: "2px solid " + T.bh, position: "sticky", top: 36, zIndex: 3, background: T.sa, fontSize: 11, fontWeight: 600, color: T.tx }}>{s.name.toUpperCase()}</th>)}
                {supCols.map(s => <th key={"2s_" + s.name} colSpan={s.cols.length} style={{ textAlign: "center", borderLeft: s === supCols[0] ? "3px solid " + T.w : "2px solid " + T.bh, position: "sticky", top: 36, zIndex: 3, background: T.sa, fontSize: 11, fontWeight: 600, color: T.w }}>{s.name.toUpperCase()}</th>)}
              </tr>
              <tr>
                {supCols.map(s => s.cols.map((lt, i) => <th key={"1s_" + s.name + "_" + lt} style={{ textAlign: "center", fontSize: 9, position: "sticky", top: 66, zIndex: 3, background: T.sa, color: ltColor(lt), fontWeight: 600, borderLeft: i === 0 ? "2px solid " + T.bh : undefined }}>{lt.toUpperCase()}</th>))}
                {supCols.map((s, si) => s.cols.map((lt, i) => <th key={"2s_" + s.name + "_" + lt} style={{ textAlign: "center", fontSize: 9, position: "sticky", top: 66, zIndex: 3, background: T.sa, color: ltColor(lt), fontWeight: 600, borderLeft: (si === 0 && i === 0) ? "3px solid " + T.w : i === 0 ? "2px solid " + T.bh : undefined }}>{lt.toUpperCase()}</th>))}
              </tr>
            </thead>
            <tbody>
              {data.map(r => (
                <tr key={r.k}>
                  <td style={{ position: "sticky", left: SL[0], background: T.sf, zIndex: 1, fontWeight: 500, fontSize: 11, whiteSpace: "nowrap", verticalAlign: "middle" }}>{r.prod}</td>
                  <td style={{ position: "sticky", left: SL[1], background: T.sf, zIndex: 1, textAlign: "center", verticalAlign: "middle" }}><span className="b bi">{r.sz}</span></td>
                  <td className="m" style={{ position: "sticky", left: SL[2], background: T.sf, zIndex: 1, textAlign: "center", verticalAlign: "middle" }}>{r.oz}</td>
                  <td className="m" style={{ position: "sticky", left: SL[3], background: T.sf, zIndex: 1, textAlign: "center", verticalAlign: "middle", color: T.tm }}>${r.expE.toFixed(2)}</td>
                  <td className="m" style={{ position: "sticky", left: SL[4], background: T.sf, zIndex: 1, textAlign: "center", verticalAlign: "middle", color: T.tm }}>${r.bldL.toFixed(2)}</td>
                  {supCols.map(s => s.cols.map((lt, i) => {
                    const key = s.name + "_" + lt; const v = r.c1S[key];
                    const isMin = v != null && r.min1 != null && Math.abs(v - r.min1) < 0.01;
                    return <td key={"1_" + key} className="m" style={{ textAlign: "center", verticalAlign: "middle", borderLeft: i === 0 ? "2px solid " + T.bh : undefined, fontWeight: isMin ? 700 : 400, color: isMin ? T.ac : v != null ? T.tx : T.td }}>
                      {v != null ? v.toFixed(2) : "—"}
                    </td>;
                  }))}
                  {supCols.map((s, si) => s.cols.map((lt, i) => {
                    const key = s.name + "_" + lt; const v = r.c2S[key];
                    const isMin = v != null && r.min2 != null && Math.abs(v - r.min2) < 0.01;
                    return <td key={"2_" + key} className="m" style={{ textAlign: "center", verticalAlign: "middle", borderLeft: (si === 0 && i === 0) ? "3px solid " + T.w : i === 0 ? "2px solid " + T.bh : undefined, fontWeight: isMin ? 700 : 400, color: isMin ? T.ac : v != null ? T.tx : T.td }}>
                      {v != null ? v.toFixed(2) : "—"}
                    </td>;
                  }))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ fontSize: 10, color: T.tm, marginTop: 6 }}><span style={{ color: T.ac, fontWeight: 600 }}>■</span> Chi phí thấp nhất · Phần trái: IN 1 MẶT · Phần phải (<span style={{ color: T.w }}>vàng</span>): IN 2 MẶT</div>
    </div>
  );
}
