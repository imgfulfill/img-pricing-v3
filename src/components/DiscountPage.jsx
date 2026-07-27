import React, { useState, useMemo } from "react";
import { useData } from "../context/DataContext";
import { T, pn, szOrd, fmt, calcLabel, getScenarios } from "../lib/utils";

export default function DiscountPage() {
  const { products, suppliers, prices, params, labelTiers, compPrices } = useData();
  const [ckPI, setCkPI] = useState(0); const [ckSF, setCkSF] = useState(0);
  const [q, setQ] = useState(""); const [fCat, setFCat] = useState(""); const [fBrand, setFBrand] = useState("");
  const cats = useMemo(() => [...new Set(products.map(p => p.category).filter(Boolean))].sort(), [products]);
  const brands = useMemo(() => [...new Set(products.map(p => p.brand).filter(Boolean))].sort(), [products]);
  const lnColor = v => v == null ? T.td : v >= params.minProfit ? T.ac : v > 0 ? T.w : T.dg;
  const supCols = useMemo(() => suppliers.filter(s => s.active).map(s => {
    const cols = []; if (s.selfShip) cols.push("Self"); else { if (s.useCheap) cols.push("Cheap"); if (s.useExp) cols.push("Exp"); if (s.useCheap && s.useExp) cols.push("Bld") }
    return { ...s, cols };
  }).filter(s => s.cols.length > 0), [suppliers]);

  const data = useMemo(() => {
    const pKeys = [...new Set(prices.map(p => p.product + "|||" + p.size))];
    return pKeys.map(k => {
      const [prod, sz] = k.split("|||"); const w = products.find(p => p.product === prod && p.size === sz); if (!w) return null;
      const cat = w.category || "T-shirt all"; const brand = w.brand || "";
      const lbl = calcLabel(w.weightOz, labelTiers, params); const cheapL = params.cheapPrice, expL = lbl ? lbl.expE : params.expSmallest, bldL = lbl ? lbl.bld : cheapL;
      const scenarios = []; const reps = [];
      prices.filter(p => p.product === prod && p.size === sz).forEach(pr => {
        const sup = supCols.find(s => s.name === pr.supplierId || s.id === pr.supplierId); if (!sup) return;
        const cpSX = pr.totalCost;
        let selfLc = 0;
        if (sup.selfShip) { const cs = compPrices.find(c => c.comp === sup.name && c.product === prod && c.size === sz); selfLc = cs?.shipFirst != null ? cs.shipFirst - (params.a2kDiscount || 0) : 0 }
        const repLc = sup.selfShip ? selfLc : (sup.useCheap && sup.useExp) ? bldL : sup.useExp ? expL : cheapL;
        reps.push(Math.round((cpSX + repLc) * 100) / 100);
        sup.cols.forEach(lt => {
          const lc = lt === "Self" ? selfLc : lt === "Cheap" ? cheapL : lt === "Exp" ? expL : bldL;
          scenarios.push({ sup: sup.name, label: lt, total: Math.round((cpSX + lc) * 100) / 100 });
        });
      });
      if (!scenarios.length) return null;
      scenarios.sort((a, b) => a.total - b.total);
      const cpMin = scenarios[0].total; const cpMax = scenarios[scenarios.length - 1].total;
      const cpAvg = reps.length ? Math.round(reps.reduce((a, b) => a + b, 0) / reps.length * 100) / 100 : null;
      const cps = compPrices.filter(c => c.product === prod && c.size === sz && c.total != null);
      let dtMin = null; cps.forEach(c => { if (dtMin == null || c.total < dtMin) dtMin = c.total });
      const target = dtMin != null ? dtMin - params.priceGap : null;
      const floor = cpAvg != null ? cpAvg + params.minProfit : null;
      let recTotal = null; if (floor != null && target != null) recTotal = Math.max(target, floor); else if (floor != null) recTotal = floor;
      const catShip = (params.categoryShip || {})[cat] || { s1: 4.99, sa: 1.99 }; const shipF = catShip.s1;
      const recPI = recTotal != null ? Math.round((recTotal - shipF) * 100) / 100 : null;
      const piAfter = recPI != null ? Math.round(recPI * (1 - ckPI / 100) * 100) / 100 : null;
      const sfAfter = Math.round(shipF * (1 - ckSF / 100) * 100) / 100;
      const totalAfter = piAfter != null ? Math.round((piAfter + sfAfter) * 100) / 100 : null;
      const lnMin = totalAfter != null ? Math.round((totalAfter - cpMax) * 100) / 100 : null;
      const lnAvg = cpAvg != null && totalAfter != null ? Math.round((totalAfter - cpAvg) * 100) / 100 : null;
      const lnMax = totalAfter != null ? Math.round((totalAfter - cpMin) * 100) / 100 : null;
      const allLoss = scenarios.every(s => totalAfter != null && totalAfter - s.total <= 0);
      return { k, prod, sz, cat, brand, recPI, shipF, piAfter, sfAfter, totalAfter, lnMin, lnAvg, lnMax, allLoss };
    }).filter(r => r != null).filter(r => {
      if (q && !(r.prod + " " + r.sz).toLowerCase().includes(q.toLowerCase())) return false;
      if (fCat && r.cat !== fCat) return false; if (fBrand && r.brand !== fBrand) return false; return true;
    }).sort((a, b) => a.prod.localeCompare(b.prod) || (szOrd(a.sz) - szOrd(b.sz)));
  }, [prices, products, supCols, params, labelTiers, compPrices, q, fCat, fBrand, ckPI, ckSF]);

  const lossCount = data.filter(r => r.allLoss).length;
  const HS = { position: "sticky", zIndex: 3, background: T.sa, textAlign: "right", fontSize: 7, padding: "4px 3px" };
  const presets = [0, 2, 3, 5];
  const CkGroup = ({ label, val, set }) => (
    <div>
      <div style={{ fontSize: 10, color: T.tm, marginBottom: 3 }}>{label}</div>
      <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
        {presets.map(v => <button key={v} className={val === v ? "bp2" : "bg2"} onClick={() => set(v)} style={{ padding: "4px 10px", fontSize: 11 }}>{v}%</button>)}
        <input type="number" value={val} onChange={e => set(pn(e.target.value) || 0)} min={0} max={100} step={1} style={{ width: 50, padding: "4px 6px", fontSize: 11, textAlign: "right" }} />
        <span style={{ fontSize: 10, color: T.td }}>%</span>
      </div>
    </div>
  );

  return (
    <div className="fade">
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Chiết khấu & Mô phỏng</h2>
      <div style={{ display: "flex", gap: 16, marginBottom: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, padding: 14, display: "flex", gap: 16, alignItems: "center" }}>
          <CkGroup label="CK Price Item" val={ckPI} set={setCkPI} />
          <CkGroup label="CK Ship First" val={ckSF} set={setCkSF} />
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 11 }}>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}><div style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(16,185,129,.3)" }} /> LN ≥ ${params.minProfit}</div>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}><div style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(245,158,11,.3)" }} /> {"0 < LN < $" + params.minProfit}</div>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}><div style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(239,68,68,.3)" }} /> Lỗ</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm..." style={{ flex: 1 }} />
        <select value={fBrand} onChange={e => setFBrand(e.target.value)} style={{ width: 130, fontSize: 11 }}><option value="">All Brand</option>{brands.map(b => <option key={b}>{b}</option>)}</select>
        <select value={fCat} onChange={e => setFCat(e.target.value)} style={{ width: 130, fontSize: 11 }}><option value="">All Cat</option>{cats.map(c => <option key={c}>{c}</option>)}</select>
      </div>
      <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, overflow: "auto", maxHeight: "62vh" }}>
        <table style={{ fontSize: 10 }}>
          <thead>
            <tr>
              <th colSpan={3} style={{ position: "sticky", top: 0, zIndex: 3, background: T.sa }} />
              <th colSpan={2} style={{ position: "sticky", top: 0, zIndex: 3, background: "rgba(59,130,246,.06)", borderLeft: "2px solid " + T.bh, textAlign: "center", fontSize: 9 }}>Giá gốc</th>
              <th colSpan={3} style={{ position: "sticky", top: 0, zIndex: 3, background: "rgba(16,185,129,.08)", borderLeft: "2px solid " + T.ac, textAlign: "center", fontSize: 9, color: T.ac }}>Giá sau CK</th>
              <th colSpan={3} style={{ position: "sticky", top: 0, zIndex: 3, background: "rgba(245,158,11,.06)", borderLeft: "2px solid " + T.w, textAlign: "center", fontSize: 9 }}>LN</th>
            </tr>
            <tr>
              <th style={{ ...HS, top: 28, position: "sticky", left: 0, zIndex: 5, textAlign: "left", minWidth: 150 }}>SP</th>
              <th style={{ ...HS, top: 28, textAlign: "left" }}>Size</th>
              <th style={{ ...HS, top: 28, textAlign: "left", fontSize: 8 }}>Cat</th>
              <th style={{ ...HS, top: 28, borderLeft: "2px solid " + T.bh }}>PrItem</th>
              <th style={{ ...HS, top: 28 }}>Ship1</th>
              <th style={{ ...HS, top: 28, borderLeft: "2px solid " + T.ac }}>PrItem</th>
              <th style={{ ...HS, top: 28 }}>Ship1</th>
              <th style={{ ...HS, top: 28, fontWeight: 700, color: T.ac }}>Tổng</th>
              <th style={{ ...HS, top: 28, borderLeft: "2px solid " + T.w }}>Min</th>
              <th style={{ ...HS, top: 28 }}>Avg</th>
              <th style={{ ...HS, top: 28 }}>Max</th>
            </tr>
          </thead>
          <tbody>
            {data.map(r => (
              <tr key={r.k} style={{ background: r.allLoss ? "rgba(239,68,68,.04)" : "" }}>
                <td style={{ position: "sticky", left: 0, zIndex: 1, fontWeight: 500, fontSize: 10, minWidth: 150, whiteSpace: "nowrap",
                  background: r.allLoss ? "rgba(239,68,68,.08)" : T.sf, color: r.allLoss ? T.dg : T.tx }}>{r.prod}</td>
                <td><span className="b bi" style={{ fontSize: 9 }}>{r.sz}</span></td>
                <td style={{ fontSize: 8, color: T.td }}>{r.cat?.replace(/T-shirt all/, "Tee").replace(/Sweat\/Hoodie/, "Hood")}</td>
                <td className="m" style={{ textAlign: "right", borderLeft: "2px solid " + T.bh, color: T.tm }}>{fmt(r.recPI)}</td>
                <td className="m" style={{ textAlign: "right", color: T.tm }}>{fmt(r.shipF)}</td>
                <td className="m" style={{ textAlign: "right", borderLeft: "2px solid " + T.ac, color: ckPI > 0 ? T.p : T.tx }}>{fmt(r.piAfter)}</td>
                <td className="m" style={{ textAlign: "right", color: ckSF > 0 ? T.p : T.tx }}>{fmt(r.sfAfter)}</td>
                <td className="m" style={{ textAlign: "right", fontWeight: 700, color: T.ac }}>{fmt(r.totalAfter)}</td>
                <td className="m" style={{ textAlign: "right", borderLeft: "2px solid " + T.w, fontWeight: 600, color: lnColor(r.lnMin) }}>{fmt(r.lnMin)}</td>
                <td className="m" style={{ textAlign: "right", color: lnColor(r.lnAvg) }}>{fmt(r.lnAvg)}</td>
                <td className="m" style={{ textAlign: "right", color: lnColor(r.lnMax) }}>{fmt(r.lnMax)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
