import React, { useState, useMemo } from "react";
import { useData } from "../context/DataContext";
import { T, pn, szOrd, fmt, uid } from "../lib/utils";

export default function CompModule() {
  const { compPrices, setCompPrices } = useData();
  const [q, setQ] = useState(""); const [fComp, setFComp] = useState("");
  const [showImp, setShowImp] = useState(false); const [impText, setImpText] = useState("");

  const comps = useMemo(() => [...new Set(compPrices.map(c => c.comp).filter(Boolean))].sort(), [compPrices]);
  const visComps = useMemo(() => fComp ? [fComp] : comps, [comps, fComp]);

  const pivot = useMemo(() => {
    const keys = [...new Set(compPrices.map(c => c.product + "|||" + c.size))];
    return keys.map(k => {
      const [prod, sz] = k.split("|||");
      const byComp = {};
      compPrices.filter(c => c.product === prod && c.size === sz).forEach(c => { byComp[c.comp] = c });
      return { k, prod, sz, byComp };
    }).filter(r => {
      if (q && !(r.prod + " " + r.sz).toLowerCase().includes(q.toLowerCase())) return false;
      if (fComp && !r.byComp[fComp]) return false;
      return true;
    }).sort((a, b) => a.prod.localeCompare(b.prod) || (szOrd(a.sz) - szOrd(b.sz)));
  }, [compPrices, q, fComp]);

  const doImport = async () => {
    const rawLines = impText.trim().split("\n");
    if (rawLines.length < 2) return alert("Cần header + data");
    // Merge broken lines: if a line has < 7 columns, join with previous
    const mergedLines = [rawLines[0]];
    for (let i = 1; i < rawLines.length; i++) {
      const cols = rawLines[i].split("\t").length;
      if (cols < 7 && mergedLines.length > 0) {
        mergedLines[mergedLines.length - 1] += rawLines[i];
      } else {
        mergedLines.push(rawLines[i]);
      }
    }
    const lines = mergedLines.map(r => r.split("\t"));
    const batch = [];
    for (let i = 1; i < lines.length; i++) {
      const r = lines[i]; if (r.length < 4) continue;
      // Skip if competitor name looks like a number (broken line remnant)
      if (r[0] && !isNaN(parseFloat(r[0])) && r[0].trim().length < 6) continue;
      const pi = pn(r[3]), sf = pn(r[5]);
      batch.push({ comp: r[0] || "", product: r[1] || "", size: r[2] || "",
        priceItem: pi, price2nd: pn(r[4]), shipFirst: sf, shipAdd: pn(r[6]),
        total: pi != null && sf != null ? Math.round((pi + sf) * 100) / 100 : null });
    }
    if (!batch.length) return alert("Không có data");
    await setCompPrices(batch);
    setShowImp(false); setImpText("");
  };

  const doReset = async () => { if (confirm("Xóa toàn bộ giá đối thủ?")) await setCompPrices([]) };
  const HS = { textAlign: "right", fontSize: "9px", padding: "5px 6px" };

  return (
    <div className="fade">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600, fontStyle: "italic" }}>Giá bán đối thủ</h2>
          <div style={{ fontSize: 12, color: T.tm }}>{compPrices.length} giá · {comps.length} đối thủ</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="bg2" onClick={doReset} style={{ fontSize: 12 }}>Reset</button>
          <button className="bp2" onClick={() => setShowImp(!showImp)} style={{ fontSize: 12 }}>{showImp ? "Đóng" : "Import"}</button>
        </div>
      </div>
      {showImp && <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: T.tm, marginBottom: 6 }}>Paste TSV: Competitor | Product | Size | PriceItem | Price2nd | ShipFirst | ShipAdd</div>
        <textarea value={impText} onChange={e => setImpText(e.target.value)} rows={5} style={{ width: "100%", fontSize: 11, fontFamily: "monospace" }} placeholder="Paste data..." />
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <button className="bp2" onClick={doImport} style={{ fontSize: 11 }}>Import</button>
          <button className="bg2" onClick={() => { setShowImp(false); setImpText("") }} style={{ fontSize: 11 }}>Hủy</button>
        </div>
      </div>}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm..." style={{ flex: 1 }} />
        <select value={fComp} onChange={e => setFComp(e.target.value)} style={{ width: 160 }}>
          <option value="">All</option>
          {comps.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, overflow: "hidden" }}>
        <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "68vh" }}>
          <table style={{ minWidth: visComps.length * 320 + 300 }}>
            <thead>
              <tr>
                <th rowSpan={2} style={{ position: "sticky", left: 0, top: 0, zIndex: 5, background: T.sa, minWidth: 180 }}>SP</th>
                <th rowSpan={2} style={{ position: "sticky", left: 180, top: 0, zIndex: 5, background: T.sa, minWidth: 50 }}>Size</th>
                {visComps.map(c => (
                  <th key={c} colSpan={5} style={{ position: "sticky", top: 0, zIndex: 3, background: T.sa, textAlign: "center", borderLeft: "2px solid " + T.bh, fontSize: 11, fontWeight: 600, color: T.tx, letterSpacing: 0 }}>
                    {c}
                  </th>
                ))}
              </tr>
              <tr>
                {visComps.map(c => (
                  <React.Fragment key={c + "h"}>
                    <th style={{ ...HS, position: "sticky", top: 34, zIndex: 3, background: T.sa, borderLeft: "2px solid " + T.bh }}>PrItem</th>
                    <th style={{ ...HS, position: "sticky", top: 34, zIndex: 3, background: T.sa }}>2nd</th>
                    <th style={{ ...HS, position: "sticky", top: 34, zIndex: 3, background: T.sa }}>Ship1</th>
                    <th style={{ ...HS, position: "sticky", top: 34, zIndex: 3, background: T.sa }}>ShipA</th>
                    <th style={{ ...HS, position: "sticky", top: 34, zIndex: 3, background: T.sa, color: T.ac, fontWeight: 600 }}>Tổng</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {pivot.map(r => (
                <tr key={r.k}>
                  <td style={{ position: "sticky", left: 0, background: T.sf, zIndex: 1, fontWeight: 500, fontSize: 11, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.prod}</td>
                  <td style={{ position: "sticky", left: 180, background: T.sf, zIndex: 1 }}><span className="b bi">{r.sz}</span></td>
                  {visComps.map(c => {
                    const d = r.byComp[c];
                    if (!d) return (
                      <React.Fragment key={c}>
                        <td style={{ borderLeft: "2px solid " + T.bh }} /><td /><td /><td />
                        <td style={{ textAlign: "right", color: T.td }}>—</td>
                      </React.Fragment>
                    );
                    const allTotals = Object.values(r.byComp).map(x => x.total).filter(x => x != null);
                    const minTotal = allTotals.length ? Math.min(...allTotals) : null;
                    const isMin = d.total != null && minTotal != null && d.total <= minTotal;
                    const isHigh = d.total != null && minTotal != null && d.total > minTotal * 1.15;
                    const tColor = isMin ? T.ac : isHigh ? T.dg : T.tx;
                    return (
                      <React.Fragment key={c}>
                        <td className="m" style={{ textAlign: "right", borderLeft: "2px solid " + T.bh }}>{d.priceItem != null ? fmt(d.priceItem) : "--"}</td>
                        <td className="m" style={{ textAlign: "right", color: T.tm }}>{d.price2nd != null ? fmt(d.price2nd) : "--"}</td>
                        <td className="m" style={{ textAlign: "right" }}>{d.shipFirst != null ? fmt(d.shipFirst) : "--"}</td>
                        <td className="m" style={{ textAlign: "right", color: T.tm }}>{d.shipAdd != null ? fmt(d.shipAdd) : "--"}</td>
                        <td className="m" style={{ textAlign: "right", fontWeight: 600, color: tColor }}>{d.total != null ? fmt(d.total) : "--"}</td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 10, color: T.tm }}>
        <span><span style={{ color: T.ac, fontWeight: 600 }}>■</span> Rẻ nhất trong các ĐT</span>
        <span><span style={{ color: T.dg, fontWeight: 600 }}>■</span> Đắt hơn 15%+ so với ĐT rẻ nhất</span>
        <span><span style={{ color: T.tx, fontWeight: 600 }}>■</span> Bình thường</span>
      </div>
    </div>
  );
}
