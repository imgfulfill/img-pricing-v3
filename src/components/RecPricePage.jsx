import React, { useState, useMemo } from "react";
import { useData } from "../context/DataContext";
import { T, pn, szOrd, fmt, calcLabel, getScenarios, ltColor } from "../lib/utils";

export default function RecPricePage() {
  const { products, suppliers, prices, params, labelTiers, compPrices, lockedPrices, addLockedPrice, removeLockedPrice, bulkSetLockedPrices } = useData();
  const [q, setQ] = useState(""); const [fCat, setFCat] = useState(""); const [fType, setFType] = useState("");
  const [showInfo, setShowInfo] = useState(false); const [copyCol, setCopyCol] = useState("V");
  const [editLk, setEditLk] = useState(null); const [editLkVal, setEditLkVal] = useState("");
  const cats = useMemo(() => [...new Set(products.map(p => p.category).filter(Boolean))].sort(), [products]);
  const N = params.minScenarios || 2; const delta = params.dtgDelta || 0.5;
  const supCols = useMemo(() => suppliers.filter(s => s.active).map(s => {
    const cols = []; if (s.selfShip) cols.push("Self"); if (s.useCheap) cols.push("Cheap"); if (s.useExp) cols.push("Exp"); if (s.useCheap && s.useExp) cols.push("Bld");
    return { ...s, cols };
  }).filter(s => s.cols.length > 0), [suppliers]);
  const lnColor = v => v == null ? T.td : v >= params.minProfit ? T.ac : v > 0 ? T.w : T.dg;

  const data = useMemo(() => {
    const pKeys = [...new Set(prices.map(p => p.product + "|||" + p.size))]; const vMap = {};
    pKeys.forEach(k => {
      const [prod, sz] = k.split("|||"); const w = products.find(p => p.product === prod && p.size === sz); if (!w) return;
      const cat = w.category || "T-shirt all";
      const sc1All = getScenarios(prod, sz, "1S", products, suppliers, prices, params, labelTiers, compPrices);
      const sc2All = getScenarios(prod, sz, "2S", products, suppliers, prices, params, labelTiers, compPrices);
      const sc1 = sc1All.map(s => s.cost); const sc2 = sc2All.map(s => s.cost);
      const lbl = calcLabel(w.weightOz, labelTiers, params); const cheapL = params.cheapPrice, expL = lbl ? lbl.expE : params.expSmallest, bldL = lbl ? lbl.bld : cheapL;
      const reps = [];
      prices.filter(p => p.product === prod && p.size === sz).forEach(pr => {
        const sup = supCols.find(s => s.name === pr.supplierId || s.id === pr.supplierId); if (!sup) return;
        let repLc = sup.selfShip ? 0 : (sup.useCheap && sup.useExp) ? bldL : sup.useExp ? expL : cheapL;
        if (sup.selfShip) { const cs = compPrices.find(c => c.comp === sup.name && c.product === prod && c.size === sz); repLc = cs?.shipFirst != null ? cs.shipFirst - (params.a2kDiscount || 0) : 0 }
        reps.push(Math.round((pr.totalCost + repLc) * 100) / 100);
      });
      const cpAvg = reps.length ? Math.round(reps.reduce((a, b) => a + b, 0) / reps.length * 100) / 100 : null;
      const cpMin = sc1[0] || null, cpMax = sc1.length ? sc1[sc1.length - 1] : null;
      const numX = supCols.filter(s => prices.some(p => p.product === prod && p.size === sz && (p.supplierId === s.name || p.supplierId === s.id))).length;
      const cps = compPrices.filter(c => c.product === prod && c.size === sz && c.total != null);
      let dtMin = null, dtMinName = "", dtMinPI = null, dtMin2nd = null, dtMinSF = null, dtMinSA = null;
      cps.forEach(c => { if (dtMin == null || c.total < dtMin) { dtMin = c.total; dtMinName = c.comp; dtMinPI = c.priceItem; dtMin2nd = c.price2nd; dtMinSF = c.shipFirst; dtMinSA = c.shipAdd } });
      const minDtPI = cps.length ? Math.min(...cps.map(c => c.priceItem).filter(x => x != null)) : null;
      const all2nd = prices.filter(p => p.product === prod && p.size === sz).map(p => p.cost2nd).filter(x => x != null);
      const max2nd = all2nd.length ? Math.max(...all2nd) : 0;
      const dt2nds = cps.map(c => c.price2nd).filter(x => x != null).sort((a, b) => a - b);
      const med2nd = dt2nds.length ? dt2nds[Math.floor(dt2nds.length / 2)] : 0;
      const rec2nd = Math.max(max2nd, med2nd) || null;
      const catShip = (params.categoryShip || {})[cat] || { s1: 4.99, sa: 1.99 }; const shipF = catShip.s1, shipA = catShip.sa;
      const aq = sc1.length >= N ? sc1[N - 1] : sc1.length ? sc1[sc1.length - 1] : null;
      const ar = sc2.length >= N ? sc2[N - 1] - (rec2nd || 0) : sc2.length ? sc2[sc2.length - 1] - (rec2nd || 0) : null;
      const as2 = sc1.length ? sc1[0] + params.minProfit : null; const at2 = sc2.length ? sc2[0] + params.minProfit - (rec2nd || 0) : null;
      let core = null; if (cpAvg != null) { if (dtMin == null) core = cpAvg + params.minProfit; else core = Math.max(cpAvg + params.minProfit, dtMin - params.priceGap) }
      const cands = [core, aq, ar, as2, at2].filter(v => v != null);
      const vDTF = cands.length ? Math.round(Math.max(...cands) * 100) / 100 : null;
      const target = dtMin != null ? Math.round((dtMin - params.priceGap) * 100) / 100 : null;
      const floor = cpAvg != null ? Math.round((cpAvg + params.minProfit) * 100) / 100 : null;
      const minBase = prices.filter(p => p.product === prod && p.size === sz).map(p => p.baseCost).filter(x => x != null);
      const minBaseV = minBase.length ? Math.min(...minBase) : null;
      const best1 = sc1All[0] || null; const worst1 = sc1All.length ? sc1All[sc1All.length - 1] : null;
      vMap[k] = { prod, sz, k, cat, cpMin, cpAvg, cpMax, numX, dtMin, dtMinName, dtMinPI, dtMin2nd, dtMinSF, dtMinSA, dtCount: cps.length, minDtPI, rec2nd, shipF, shipA, vDTF, target, floor, minBaseV, isDTG: prod.endsWith("DTG"), best1, worst1, sc1, sc2 };
    });
    return Object.values(vMap).map(r => {
      let V = r.vDTF;
      if (r.isDTG) { const dtfK = r.prod.replace(/DTG$/, "DTF") + "|||" + r.sz; if (vMap[dtfK]?.vDTF != null) V = Math.round((vMap[dtfK].vDTF + delta) * 100) / 100 }
      let W = null;
      if (V != null && r.shipF != null) {
        if (r.isDTG) { const dtfK = r.prod.replace(/DTG$/, "DTF") + "|||" + r.sz; const dtfR = vMap[dtfK];
          if (dtfR) { const dtfW = dtfR.vDTF != null ? Math.max(dtfR.minBaseV || 0, Math.min(dtfR.vDTF - dtfR.shipF, dtfR.minDtPI != null ? dtfR.minDtPI : Infinity)) : null;
            W = dtfW != null ? Math.round((dtfW + delta) * 100) / 100 : Math.round((V - r.shipF) * 100) / 100;
          } else W = Math.round((V - r.shipF) * 100) / 100;
        } else { const vY = V - r.shipF; W = Math.round(Math.max(r.minBaseV || 0, r.minDtPI != null ? Math.min(vY, r.minDtPI) : vY) * 100) / 100 }
      }
      const lnMin = r.cpMax != null && V != null ? Math.round((V - r.cpMax) * 100) / 100 : null;
      const lnAvg = r.cpAvg != null && V != null ? Math.round((V - r.cpAvg) * 100) / 100 : null;
      const lnMax = r.cpMin != null && V != null ? Math.round((V - r.cpMin) * 100) / 100 : null;
      const chPI = r.dtMinPI != null && W != null ? Math.round((r.dtMinPI - W) * 100) / 100 : null;
      const chSh = r.dtMinSF != null && r.shipF != null ? Math.round((r.dtMinSF - r.shipF) * 100) / 100 : null;
      const chTot = r.dtMin != null && V != null ? Math.round((r.dtMin - V) * 100) / 100 : null;
      const rank = r.dtMin != null && V != null ? (compPrices.filter(c => c.product === r.prod && c.size === r.sz && c.total != null && c.total < V).length + 1) : null;
      let verdict = "", verdictColor = T.tm;
      if (lnAvg == null) { verdict = "Thiếu data" }
      else if (lnAvg < 0) { verdict = "\u26A0 L\u1ed6 - LN Avg $" + lnAvg.toFixed(2) + "/\u0111\u01A1n"; verdictColor = T.dg }
      else if (lnAvg < params.minProfit) { verdict = "\u26A0 LN th\u1EA5p $" + lnAvg.toFixed(2) + " < s\u00E0n $" + params.minProfit.toFixed(2); verdictColor = T.dg }
      else if (V != null && r.dtMin != null && V <= r.dtMin - params.priceGap) { verdict = "\u2713 C\u1EA1nh tranh t\u1ED1t. Rank " + (rank || "-") + "/" + (r.dtCount + 1) + ". R\u1EBB h\u01A1n \u0110T $" + (chTot != null ? Math.abs(chTot).toFixed(2) : "-") + ". LN $" + lnAvg.toFixed(2) + "/\u0111\u01A1n"; verdictColor = T.ac }
      else if (V != null && r.dtMin != null && V < r.dtMin) { verdict = "OK - R\u1EBB h\u01A1n \u0110T nh\u1EB9. Rank " + (rank || "-") + "/" + (r.dtCount + 1) + ". Ch\u00EAnh $" + (chTot != null ? Math.abs(chTot).toFixed(2) : "-") + ". LN $" + lnAvg.toFixed(2) + "/\u0111\u01A1n"; verdictColor = T.ac }
      else { verdict = "\u0110\u1EA1t LN s\u00E0n. Rank " + (rank || "-") + "/" + (r.dtCount + 1) + ". LN $" + lnAvg.toFixed(2) + "/\u0111\u01A1n"; verdictColor = T.tm }
      const lkKey = r.prod + "|||" + r.sz; const locked = lockedPrices[lkKey]; const lockedV = locked != null ? (locked.v != null ? locked.v : locked) : null;
      const actual = lockedV != null ? lockedV : V;
      const stressLN = r.cpAvg != null && actual != null ? Math.round((actual - r.cpAvg) * 100) / 100 : null;
      const stressOk = stressLN != null && stressLN >= params.minProfit;
      const stressMsg = stressLN == null ? "--" : (stressOk ? "\u2713 An to\u00E0n - L\u00E3i $" + stressLN.toFixed(2) : (stressLN >= 0 ? "\u26A0 L\u00E3i $" + stressLN.toFixed(2) + " < s\u00E0n $" + params.minProfit.toFixed(2) : "\u26A0 L\u1ed6 $" + stressLN.toFixed(2)));
      const s1Prof = r.sc1.filter(cp => V != null && V - cp >= 0).length;
      const s1Min = r.sc1.filter(cp => V != null && V - cp >= params.minProfit).length;
      const s2Prof = r.sc2.filter(cp => { const ln = V != null && r.rec2nd != null ? V + r.rec2nd - cp : null; return ln != null && ln >= 0 }).length;
      const s2Min = r.sc2.filter(cp => { const ln = V != null && r.rec2nd != null ? V + r.rec2nd - cp : null; return ln != null && ln >= params.minProfit }).length;
      const scTarget = Math.min(N, r.sc1.length);
      const scOk = s1Min >= scTarget && (r.sc2.length === 0 || s2Min >= scTarget);
      const scMsg = r.sc1.length === 0 ? "--" : ((scOk ? "\u2713 " : "\u26A0 ") + "1m: c\u00F3 l\u00E3i " + s1Prof + "/" + r.sc1.length + " \u2192 \u2265$" + params.minProfit.toFixed(2) + ": " + s1Min + "/" + s1Prof + (r.sc2.length > 0 ? " | 2m: c\u00F3 l\u00E3i " + s2Prof + "/" + r.sc2.length + " \u2192 \u2265$" + params.minProfit.toFixed(2) + ": " + s2Min + "/" + s2Prof : "") + " | Target: \u2265" + scTarget + " KB \u2265$" + params.minProfit.toFixed(2));
      return { ...r, V, W, lnMin, lnAvg, lnMax, chPI, chSh, chTot, rank, verdict, verdictColor, lockedV, actual, stressMsg, stressOk, scMsg, scOk, lkKey };
    }).filter(r => {
      if (q && !(r.prod + " " + r.sz).toLowerCase().includes(q.toLowerCase())) return false;
      if (fCat && r.cat !== fCat) return false; if (fType && !r.prod.includes(fType)) return false; return true;
    }).sort((a, b) => a.prod.localeCompare(b.prod) || (szOrd(a.sz) - szOrd(b.sz)));
  }, [prices, products, supCols, suppliers, params, labelTiers, compPrices, q, fCat, fType, N, delta, lockedPrices]);

  const doCopy = async () => {
    const nw = { ...lockedPrices }; let n = 0;
    data.forEach(r => { if (r.V != null) { nw[r.prod + "|||" + r.sz] = { v: r.V, w: r.W, x: r.rec2nd, sf: r.shipF }; n++ } });
    await bulkSetLockedPrices(nw);
  };
  const saveLk = async () => {
    const v = pn(editLkVal);
    const [p, s] = editLk.split("|||");
    if (v == null) await removeLockedPrice(p, s); else await addLockedPrice(p, s, v);
    setEditLk(null);
  };

  const HS = { fontSize: 7, position: "sticky", top: 28, zIndex: 3, background: T.sa, textAlign: "center", padding: "4px 3px", lineHeight: 1.3, cursor: "help" };
  const GH = { position: "sticky", top: 0, zIndex: 3, textAlign: "center", fontSize: 10, fontWeight: 600, padding: "6px 4px" };

  return (
    <div className="fade">
      <h2 style={{ fontSize: 22, fontWeight: 700, fontStyle: "italic", marginBottom: 4 }}>{"Đề xuất giá bán"}</h2>
      <div style={{ fontSize: 12, color: T.tm, marginBottom: 10 }}>{data.length} {"sản phẩm · Giá đề xuất dựa trên chi phí sản xuất IMG + giá đối thủ"}</div>
      <button className="bg2" onClick={() => setShowInfo(!showInfo)} style={{ fontSize: 12, marginBottom: 12 }}>{showInfo ? "Ẩn giải thích công thức" : "Xem giải thích công thức"}</button>
      {showInfo && <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, padding: 16, marginBottom: 14, fontSize: 12, lineHeight: 1.8 }}>
        <div style={{ color: T.ac, fontWeight: 600, fontSize: 14, marginBottom: 8 }}>{"Cách tính giá đề xuất IMG"}</div>
        <div><b>{"Ship đơn đầu (Ship First):"}</b>{" Giá ship cho sản phẩm đầu tiên của order. Lấy Median giá ship của tất cả đối thủ, theo từng loại sản phẩm."}</div>
        <div style={{ marginTop: 6 }}><b>{"Ship đơn sau (Ship Additional):"}</b>{" Giá ship áp cho sản phẩm thứ 2 trở lên nếu trong cùng 1 order. Lấy Median giá ship đơn sau của đối thủ theo loại sản phẩm."}</div>
        <div style={{ marginTop: 6 }}><b>{"Giá mặt sau (2nd Side):"}</b>{" Giá in từ mặt thứ 2 trở lên. Lấy giá CAO NHẤT giữa (1) Median giá 2nd-side đối thủ và (2) chi phí 2nd-side đắt nhất trong " + supCols.length + " xưởng."}</div>
        <div style={{ marginTop: 6 }}><b>{"Tổng giá đề xuất:"}</b>{" Lấy giá CAO NHẤT trong 4 mức ràng buộc:"}</div>
        <div style={{ paddingLeft: 16 }}>{"· Cạnh tranh: Rẻ hơn đối thủ rẻ nhất $" + params.priceGap}</div>
        <div style={{ paddingLeft: 16 }}>{"· Lãi tối thiểu: CP trung bình + $" + params.minProfit + "/đơn"}</div>
        <div style={{ paddingLeft: 16 }}>{"· Chống lỗ xưởng: Đảm bảo ít nhất " + N + " kịch bản xưởng không lỗ (cả 1 mặt và 2 mặt)"}</div>
        <div style={{ paddingLeft: 16 }}>{"· DTG: Nếu là sản phẩm DTG = giá DTF cùng size + $" + delta}</div>
        <div style={{ marginTop: 6 }}><b>{"Price Item:"}</b>{" DTF: MAX(Base Cost rẻ nhất, MIN(Tổng đề xuất − Ship, PI rẻ nhất ĐT)). DTG: = PI DTF cùng size + $" + delta + "."}</div>
      </div>}
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm..." style={{ width: 180 }} />
        <select value={fType} onChange={e => setFType(e.target.value)} style={{ width: 80, fontSize: 11 }}><option value="">All</option><option>DTF</option><option>DTG</option></select>
        <select value={fCat} onChange={e => setFCat(e.target.value)} style={{ width: 120, fontSize: 11 }}><option value="">All Cat</option>{cats.map(c => <option key={c}>{c}</option>)}</select>
        <div style={{ display: "flex", gap: 4, alignItems: "center", marginLeft: "auto", background: T.sf, border: "1px solid " + T.bd, borderRadius: 8, padding: "2px 8px" }}>
          <span style={{ fontSize: 10, color: T.tm }}>Copy cột</span>
          <select value={copyCol} onChange={e => setCopyCol(e.target.value)} style={{ width: 140, fontSize: 11, padding: 3 }}>
            <option value="V">{"Tổng giá đề xuất"}</option><option value="W">Price Item</option><option value="cpMin">CP Min</option><option value="cpAvg">CP Avg</option><option value="cpMax">CP Max</option><option value="floor">{"Sàn lợi nhuận"}</option><option value="target">{"Mục tiêu cạnh tranh"}</option><option value="dtMin">{"Tổng ĐT rẻ nhất"}</option>
          </select><span style={{ fontSize: 10, color: T.tm }}>{"\u2192"}</span>
          <button className="bp2" onClick={doCopy} style={{ fontSize: 10, padding: "4px 10px" }}>{"Paste → Giá chốt"}</button>
        </div>
      </div>
      {editLk && <div style={{ background: T.sf, border: "1px solid " + T.p, borderRadius: 8, padding: 10, marginBottom: 10, display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}>
        <span style={{ color: T.tm }}>{"Giá chốt: "}<b style={{ color: T.tx }}>{editLk.replace("|||", " | ")}</b></span>
        <input type="number" step=".01" value={editLkVal} onChange={e => setEditLkVal(e.target.value)} style={{ width: 100, padding: 4 }} autoFocus />
        <button className="bp2" onClick={saveLk} style={{ fontSize: 11 }}>{"Lưu"}</button>
        <button className="bdel" onClick={async () => { const [p, s] = editLk.split("|||"); await removeLockedPrice(p, s); setEditLk(null) }} style={{ fontSize: 11 }}>{"Xóa"}</button>
        <button className="bg2" onClick={() => setEditLk(null)} style={{ fontSize: 11 }}>{"Hủy"}</button>
      </div>}
      <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, overflow: "hidden" }}>
        <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "62vh" }}>
          <table style={{ minWidth: 2800, fontSize: 10 }}>
            <thead>
              <tr>
                <th colSpan={4} style={{ ...GH, background: T.sa, position: "sticky", left: 0, zIndex: 5 }} />
                <th colSpan={3} style={{ ...GH, background: "rgba(59,130,246,.06)", borderLeft: "2px solid " + T.bh }}>CP IMG</th>
                <th colSpan={7} style={{ ...GH, background: "rgba(239,68,68,.06)", borderLeft: "2px solid " + T.dg }}>{"Đối thủ rẻ nhất"}</th>
                <th colSpan={7} style={{ ...GH, background: "rgba(16,185,129,.08)", borderLeft: "2px solid " + T.ac, color: T.ac }}>{"\u2605 GIÁ IMG ĐỀ XUẤT"}</th>
                <th colSpan={4} style={{ ...GH, background: "rgba(168,85,247,.06)", borderLeft: "2px solid #a855f7" }}>{"So sánh IMG vs ĐT"}</th>
                <th colSpan={7} style={{ ...GH, background: "rgba(245,158,11,.06)", borderLeft: "2px solid " + T.w }}>{"Lợi nhuận (Min / Avg / Max)"}</th>
                <th colSpan={1} style={{ ...GH, background: T.sa }}>{"Đánh giá"}</th>
                <th colSpan={4} style={{ ...GH, background: "rgba(239,68,68,.06)", borderLeft: "2px solid " + T.dg }}>{"Quản trị rủi ro"}</th>
              </tr>
              <tr>
                {/* G1: SP info (4) */}
                <th style={{ ...HS, position: "sticky", left: 0, zIndex: 5, minWidth: 130, textAlign: "left" }} title="Tên sản phẩm (Brand + Model + Phương pháp in)">{"Sản phẩm"}</th>
                <th style={{ ...HS }} title="Kích cỡ sản phẩm">Size</th>
                <th style={{ ...HS }} title="Phân loại sản phẩm: T-shirt, Hoodie, Tumbler, Poster, Phone Case...">{"Loại SP"}</th>
                <th style={{ ...HS }} title="Số xưởng sản xuất có giá cho sản phẩm này. · Càng nhiều xưởng → càng linh hoạt phân bổ đơn.">{"Số xưởng"}</th>
                {/* G2: CP IMG (3) */}
                <th style={{ ...HS, borderLeft: "2px solid " + T.bh }} title={"CP MIN = Chi phí sản xuất rẻ nhất + Chi phí Label Cheap ($" + params.cheapPrice.toFixed(2) + "). · Đây là kịch bản tốt nhất — xưởng rẻ nhất + label rẻ nhất."}>CP Min</th>
                <th style={{ ...HS }} title="CP Avg = Trung bình chi phí sản xuất của các kịch bản đại diện mỗi xưởng. · Mỗi xưởng đóng góp 1 giá trị: Blended label (nếu có cả Cheap+Exp), hoặc Exp label (nếu chỉ Exp), hoặc Self-ship. · Đây là baseline để tính giá bán.">CP Avg</th>
                <th style={{ ...HS }} title="CP MAX = Chi phí sản xuất đắt nhất + Chi phí Label Exp (đúng tier cân nặng). · Đây là kịch bản xấu nhất. · LN Min = Tổng đề xuất − CP MAX.">CP Max</th>
                {/* G3: ĐT rẻ nhất (7) */}
                <th style={{ ...HS, borderLeft: "2px solid " + T.dg }} title="Tên đối thủ có tổng giá bán (Price Item + Ship First) thấp nhất cho sản phẩm này.">{"Tên ĐT"}</th>
                <th style={{ ...HS }} title="Giá bán sản phẩm của đối thủ rẻ nhất — bao gồm áo + hình in 1 mặt (không bao gồm giá ship).">PI</th>
                <th style={{ ...HS }} title="Giá in từ mặt thứ 2 trở lên của đối thủ rẻ nhất.">2nd</th>
                <th style={{ ...HS }} title="Giá ship cho sản phẩm đầu tiên của order — của đối thủ rẻ nhất.">SF</th>
                <th style={{ ...HS }} title="Giá ship áp cho sản phẩm thứ 2 trở lên nếu trong cùng 1 order — của đối thủ rẻ nhất.">SA</th>
                <th style={{ ...HS }} title="Tổng giá bán của đối thủ rẻ nhất = Price Item + Ship First. · Đây là mức giá IMG cần cạnh tranh.">{"Tổng"}</th>
                <th style={{ ...HS }} title="Số đối thủ có bán sản phẩm này. · Càng nhiều ĐT → thị trường cạnh tranh cao.">{"Số"}</th>
                {/* G4: ★ GIÁ ĐỀ XUẤT (7) */}
                <th style={{ ...HS, borderLeft: "2px solid " + T.ac }} title={"Mục tiêu cạnh tranh = Tổng ĐT rẻ nhất − $" + params.priceGap + ". · IMG đặt giá thấp hơn đối thủ để có lợi thế cạnh tranh."}>TARGET</th>
                <th style={{ ...HS }} title={"Sàn lợi nhuận = CP Avg + $" + params.minProfit + ". · Mức giá tối thiểu để đảm bảo lãi ít nhất $" + params.minProfit + "/đơn."}>FLOOR</th>
                <th style={{ ...HS, fontSize: 9 }} title={"Tổng giá bán đề xuất = MAX(4 ràng buộc): · ① Cạnh tranh (rẻ hơn ĐT $" + params.priceGap + ") · ② Sàn LN (CP Avg + $" + params.minProfit + ") · ③ Chống lỗ (≥" + N + " KB không lỗ) · ④ DTG pin (DTF + $" + delta + ")"}>{"Tổng ĐX"}</th>
                <th style={{ ...HS }} title={"Price Item đề xuất. · DTF: MAX(Base rẻ nhất, MIN(Tổng−Ship, PI rẻ nhất ĐT)). · DTG: PI DTF + $" + delta}>PI</th>
                <th style={{ ...HS }} title="Giá in mặt sau = MAX(Median 2nd ĐT, Cost 2nd đắt nhất xưởng).">2nd</th>
                <th style={{ ...HS }} title="Ship đơn đầu = Median Ship First của đối thủ, theo loại SP.">SF</th>
                <th style={{ ...HS }} title="Ship đơn sau = Median Ship Add của đối thủ, theo loại SP.">SA</th>
                {/* G5: So sánh (4) */}
                <th style={{ ...HS, borderLeft: "2px solid #a855f7" }} title="Chênh Price Item = PI ĐT − PI IMG. · (+): IMG rẻ hơn. · (−): IMG đắt hơn.">{"\u0394PI"}</th>
                <th style={{ ...HS }} title="Chênh Shipping = SF ĐT − SF IMG.">{"\u0394SF"}</th>
                <th style={{ ...HS }} title="Chênh Tổng = Tổng ĐT − Tổng IMG. · (+): IMG rẻ hơn → tốt.">{"\u0394Tot"}</th>
                <th style={{ ...HS }} title="Thứ hạng giá IMG trong nhóm (IMG + ĐT). · 1 = rẻ nhất.">Rank</th>
                {/* G6: Lợi nhuận (7) */}
                <th style={{ ...HS, borderLeft: "2px solid " + T.w }} title="LN Min = Tổng ĐX − CP MAX. · Kịch bản xấu nhất.">LN Min</th>
                <th style={{ ...HS }} title="Xưởng có CP cao nhất (gây LN Min). · Cần tránh đẩy đơn.">{"X¹"}</th>
                <th style={{ ...HS }} title="Loại label ở kịch bản lãi thấp nhất (thường là Exp — label đắt nhất).">{"L¹"}</th>
                <th style={{ ...HS }} title={"LN Avg = Tổng ĐX − CP Avg. · Yêu cầu: ≥ $" + params.minProfit}>LN Avg</th>
                <th style={{ ...HS }} title="LN Max = Tổng ĐX − CP MIN. · Kịch bản tốt nhất.">LN Max</th>
                <th style={{ ...HS }} title="Xưởng có CP thấp nhất (tạo LN Max). · Ưu tiên đẩy đơn.">{"X²"}</th>
                <th style={{ ...HS }} title="Loại label ở kịch bản lãi cao nhất (thường là Cheap — label rẻ nhất).">{"L²"}</th>
                {/* G7: Đánh giá (1) */}
                <th style={{ ...HS, minWidth: 200 }} title="Đánh giá tổng hợp: · ✓ Cạnh tranh tốt · OK: rẻ hơn ĐT nhẹ · Đạt LN sàn · ⚠ LN thấp · ⚠ LỖ">{"Đánh giá chi tiết"}</th>
                {/* G8: Quản trị rủi ro (4) */}
                <th style={{ ...HS, borderLeft: "2px solid " + T.dg }} title="Giá bán CHỐT do Admin nhập tay. · Để trống = dùng Tổng đề xuất. · Click vào ô để nhập/sửa.">{"Giá chốt"}</th>
                <th style={{ ...HS }} title="Tổng giá đề xuất hiện tại (thay đổi theo tham số).">{"V"}</th>
                <th style={{ ...HS, minWidth: 100 }} title={"Stress test: Giá chốt (hoặc Tổng ĐX) − CP Avg ≥ $" + params.minProfit + "? · ✓ An toàn · ⚠: lãi dưới sàn hoặc lỗ."}>Stress</th>
                <th style={{ ...HS, minWidth: 180 }} title={"Số kịch bản có lãi & đạt LN ≥ $" + params.minProfit + ". · 1m: 1 mặt. 2m: 2 mặt. · Target: ≥" + N + " KB ≥$" + params.minProfit + "."}>{"Min KB có lãi"}</th>
              </tr>
            </thead>
            <tbody>
              {data.map(r => (
                <tr key={r.k}>
                  <td style={{ position: "sticky", left: 0, background: T.sf, zIndex: 1, fontWeight: 500, fontSize: 10, whiteSpace: "nowrap" }}>{r.prod}</td>
                  <td style={{ textAlign: "center" }}><span className={"b " + (r.isDTG ? "bp" : "bi")}>{r.sz}</span></td>
                  <td style={{ fontSize: 9, color: T.tm }}>{r.cat}</td>
                  <td className="m" style={{ textAlign: "center" }}>{r.numX}</td>
                  <td className="m" style={{ textAlign: "right", borderLeft: "2px solid " + T.bh, color: T.ac }}>{fmt(r.cpMin)}</td>
                  <td className="m" style={{ textAlign: "right" }}>{fmt(r.cpAvg)}</td>
                  <td className="m" style={{ textAlign: "right", color: T.tm }}>{fmt(r.cpMax)}</td>
                  <td style={{ borderLeft: "2px solid " + T.dg, fontSize: 9, color: T.tm }}>{r.dtMinName || "\u2014"}</td>
                  <td className="m" style={{ textAlign: "right" }}>{fmt(r.dtMinPI)}</td>
                  <td className="m" style={{ textAlign: "right" }}>{fmt(r.dtMin2nd)}</td>
                  <td className="m" style={{ textAlign: "right" }}>{fmt(r.dtMinSF)}</td>
                  <td className="m" style={{ textAlign: "right" }}>{fmt(r.dtMinSA)}</td>
                  <td className="m" style={{ textAlign: "right", fontWeight: 600, color: T.dg }}>{fmt(r.dtMin)}</td>
                  <td className="m" style={{ textAlign: "center", color: T.tm }}>{r.dtCount || "\u2014"}</td>
                  <td className="m" style={{ textAlign: "right", borderLeft: "2px solid " + T.ac, color: T.tm }}>{fmt(r.target)}</td>
                  <td className="m" style={{ textAlign: "right", color: T.tm }}>{fmt(r.floor)}</td>
                  <td className="m" style={{ textAlign: "right", fontWeight: 700, color: T.ac, fontSize: 11 }}>{fmt(r.V)}</td>
                  <td className="m" style={{ textAlign: "right" }}>{fmt(r.W)}</td>
                  <td className="m" style={{ textAlign: "right", color: T.tm }}>{fmt(r.rec2nd)}</td>
                  <td className="m" style={{ textAlign: "right", color: T.tm }}>{fmt(r.shipF)}</td>
                  <td className="m" style={{ textAlign: "right", color: T.tm }}>{fmt(r.shipA)}</td>
                  <td className="m" style={{ textAlign: "right", borderLeft: "2px solid #a855f7", color: r.chPI != null && r.chPI < 0 ? T.dg : T.ac }}>{r.chPI != null ? (r.chPI >= 0 ? "+" : "") + r.chPI.toFixed(2) : "\u2014"}</td>
                  <td className="m" style={{ textAlign: "right", color: r.chSh != null && r.chSh < 0 ? T.dg : T.ac }}>{r.chSh != null ? (r.chSh >= 0 ? "+" : "") + r.chSh.toFixed(2) : "\u2014"}</td>
                  <td className="m" style={{ textAlign: "right", fontWeight: 600, color: r.chTot != null && r.chTot > 0 ? T.ac : T.dg }}>{r.chTot != null ? (r.chTot >= 0 ? "+" : "") + r.chTot.toFixed(2) : "\u2014"}</td>
                  <td className="m" style={{ textAlign: "center" }}>{r.rank != null ? r.rank + "/" + (r.dtCount + 1) : "\u2014"}</td>
                  <td className="m" style={{ textAlign: "right", borderLeft: "2px solid " + T.w, fontWeight: 600, color: lnColor(r.lnMin) }}>{fmt(r.lnMin)}</td>
                  <td style={{ fontSize: 8, color: T.tm }}>{r.worst1?.sup || "\u2014"}</td>
                  <td style={{ fontSize: 8, color: T.tm }}>{r.worst1 ? <span className="b" style={{ background: ltColor(r.worst1.lbl) + "22", color: ltColor(r.worst1.lbl), fontSize: 7 }}>{r.worst1.lbl}</span> : "\u2014"}</td>
                  <td className="m" style={{ textAlign: "right", fontWeight: 600, color: lnColor(r.lnAvg) }}>{fmt(r.lnAvg)}</td>
                  <td className="m" style={{ textAlign: "right", fontWeight: 600, color: lnColor(r.lnMax) }}>{fmt(r.lnMax)}</td>
                  <td style={{ fontSize: 8, color: T.tm }}>{r.best1?.sup || "\u2014"}</td>
                  <td style={{ fontSize: 8, color: T.tm }}>{r.best1 ? <span className="b" style={{ background: ltColor(r.best1.lbl) + "22", color: ltColor(r.best1.lbl), fontSize: 7 }}>{r.best1.lbl}</span> : "\u2014"}</td>
                  <td style={{ fontSize: 8, color: r.verdictColor, whiteSpace: "nowrap" }}>{r.verdict}</td>
                  <td className="m" style={{ textAlign: "right", borderLeft: "2px solid " + T.dg, cursor: "pointer", textDecoration: "underline dotted", color: r.lockedV != null ? T.tx : T.td }} onClick={() => { setEditLk(r.lkKey); setEditLkVal(r.lockedV != null ? r.lockedV : "") }}>{r.lockedV != null ? fmt(r.lockedV) : "\u2014"}</td>
                  <td className="m" style={{ textAlign: "right", fontWeight: 600, color: T.ac }}>{fmt(r.V)}</td>
                  <td style={{ fontSize: 8, color: r.stressOk ? T.ac : T.dg, whiteSpace: "nowrap" }}>{r.stressMsg}</td>
                  <td style={{ fontSize: 7, color: r.scOk ? T.ac : T.dg, whiteSpace: "nowrap" }}>{r.scMsg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
