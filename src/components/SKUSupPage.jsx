import React, { useState, useEffect, useMemo } from "react";
import { useData } from "../context/DataContext";
import { T, pn, SRC_OPTS, SKU_PRESETS, ORD_HDR } from "../lib/utils";

export default function SKUSupPage({ onNav }) {
  const { suppliers, supStock, routeCfg, updateSupStock, updateRouteCfg } = useData();
  const [selSup, setSelSup] = useState(null); const [step, setStep] = useState("tpl");
  const [showImpSku, setShowImpSku] = useState(false); const [showImpTpl, setShowImpTpl] = useState(false);
  const [stockRows, setStockRows] = useState([]);
  const activeSups = suppliers.filter(s => s.active);

  useEffect(() => { if (selSup) setStockRows(supStock[selSup]?.stock || []) }, [selSup, supStock]);

  const getTpl = s => routeCfg.tpls?.[s] || null;
  const curTpl = selSup ? getTpl(selSup) : null;
  const saveTpl = async (h, m) => await updateRouteCfg({ ...routeCfg, tpls: { ...(routeCfg.tpls || {}), [selSup]: { h, m } } });
  const updateTplCol = async (idx, field, val) => {
    if (!curTpl) return; const h = [...curTpl.h]; const m = [...curTpl.m];
    if (field === "h") h[idx] = val; else m[idx] = val;
    await saveTpl(h, m);
  };
  const addTplCol = async () => { if (!curTpl) await saveTpl([""], [-1]); else await saveTpl([...curTpl.h, ""], [...curTpl.m, -1]) };
  const delTplCol = async (idx) => { if (!curTpl) return; await saveTpl(curTpl.h.filter((_, i) => i !== idx), curTpl.m.filter((_, i) => i !== idx)) };
  const doImportTpl = async (txt) => {
    const cols = txt.trim().split("\t").map(c => c.trim()).filter(Boolean); if (!cols.length) return alert("Paste 1 dòng header");
    const m = cols.map(c => { const cl = c.toLowerCase(); const idx = ORD_HDR.findIndex(h => h.toLowerCase() === cl); if (idx >= 0) return idx; if (cl.includes("sku")) return -2; return -1 });
    await saveTpl(cols, m); setShowImpTpl(false); alert("Import " + cols.length + " cột template");
  };
  const doImportStock = async (txt) => {
    const lines = txt.trim().split("\n"); if (lines.length < 2) return;
    const hdr = lines[0].split("\t").map(h => h.trim());
    const rows = lines.slice(1).map(l => { const c = l.split("\t"); const o = {}; hdr.forEach((h, i) => o[h] = c[i]?.trim() || ""); return o });
    await updateSupStock(selSup, { hdr, rows }); setShowImpSku(false); alert(rows.length + " rows imported");
  };
  const curRes = (routeCfg.skuResolvers || {})[selSup] || null;
  const supHdr = supStock[selSup]?.hdr || [];
  const srcLabel = v => { const o = SRC_OPTS.find(x => x.v === v); return o ? o.l : typeof v === "string" ? '"' + v + '"' : "col " + v };

  // Preset values from SKU_PRESETS for display
  const presetVals = SKU_PRESETS[selSup] || null;

  return (
    <div className="fade">
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>{"SKU Xưởng & Template"}</h2>
      <div style={{ fontSize: 12, color: T.tm, marginBottom: 4 }}>{"Khai báo SKU xưởng, Template của xưởng và stock"}</div>
      <div style={{ fontSize: 11, color: T.p, marginBottom: 12, cursor: "pointer" }} onClick={() => onNav && onNav("dec-suppliers")}>{"\u2192 Quản lý đối tác (bật/tắt API)"}</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {activeSups.map(s => {
          const isApi = s.api; const hasTpl = !!routeCfg.tpls?.[s.name]; const skuCount = supStock[s.name]?.rows?.length || 0;
          return <div key={s.name} onClick={() => { setSelSup(s.name); setStep("tpl") }} style={{ background: selSup === s.name ? T.sa : T.sf, border: "1px solid " + (selSup === s.name ? T.p : T.bd),
            borderRadius: 10, padding: "10px 16px", cursor: "pointer", minWidth: 100, textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 600 }}>{isApi ? "\uD83D\uDD17" : "\uD83D\uDCC4"} {s.name}</div>
            <div style={{ fontSize: 9, color: T.tm, marginTop: 4 }}>{isApi ? "(API)" : skuCount + " SKU"}</div>
            {hasTpl && <div style={{ fontSize: 8, color: T.ac }}>{"\u2699\uFE0F Template"}</div>}
          </div>
        })}
      </div>
      {selSup && (() => { const sup = suppliers.find(s => s.name === selSup); const isApi = sup?.api; const skuCount = supStock[selSup]?.rows?.length || 0; return <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div><span style={{ fontSize: 16, fontWeight: 600 }}>{isApi ? "\uD83D\uDD17" : "\uD83D\uDCC4"} {selSup}</span>
            <span style={{ fontSize: 11, color: T.tm, marginLeft: 8 }}>{isApi ? "Kết nối API" : "File Import"}{!isApi && " \u00B7 C\u1EA7n khai b\u00E1o Template + SKU"}</span></div>
          {!isApi && <button className="bp2" onClick={() => setShowImpSku(!showImpSku)} style={{ fontSize: 11 }}>{showImpSku ? "\u0110\u00F3ng" : "Import SKU " + selSup}</button>}
        </div>
        {isApi ? <div style={{ padding: 20, textAlign: "center", color: T.tm }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>{"\uD83D\uDD17"}</div>
          <div>{"\u0110\u01A1n push qua API."}</div>
        </div> : <div>
          {showImpSku && <div style={{ marginBottom: 12, background: T.sa, border: "1px solid " + T.bd, borderRadius: 8, padding: 12 }}>
            <textarea rows={5} style={{ width: "100%", fontSize: 10, fontFamily: "monospace" }} placeholder={"Paste t\u1EEB sheet SKU " + selSup + "..."} id={"stkImp_" + selSup} />
            <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
              <button className="bp2" onClick={() => { const ta = document.getElementById("stkImp_" + selSup); if (ta?.value) doImportStock(ta.value) }} style={{ fontSize: 11 }}>Import</button>
              <button className="bg2" onClick={() => setShowImpSku(false)} style={{ fontSize: 11 }}>{"H\u1EE7y"}</button>
            </div>
          </div>}
          <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
            {[{ id: "tpl", l: "\u2460 Template Export" }, { id: "sku", l: "\u2461 Data " + selSup + " (" + skuCount + ")" }, { id: "cfg", l: "\u2462 Column Config" }, { id: "stock", l: "\u2463 Stock" }].map(t =>
              <button key={t.id} onClick={() => setStep(t.id)} className={step === t.id ? "bp2" : "bg2"} style={{ fontSize: 11 }}>{t.l}</button>)}
          </div>

          {step === "tpl" && <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>Template Export ({curTpl?.h?.length || 0} {"c\u1ED9t"})</div>
              <div style={{ display: "flex", gap: 4 }}>
                <button className="bg2" onClick={() => setShowImpTpl(!showImpTpl)} style={{ fontSize: 9 }}>Import Header</button>
                <button className="bg2" onClick={addTplCol} style={{ fontSize: 9 }}>+ {"C\u1ED9t"}</button>
              </div>
            </div>
            {showImpTpl && <div style={{ marginBottom: 8 }}>
              <textarea rows={2} style={{ width: "100%", fontSize: 10, fontFamily: "monospace" }} placeholder="Paste 1 d\u00F2ng header (tab-separated)..." id={"tplH_" + selSup} />
              <div style={{ marginTop: 4, display: "flex", gap: 4 }}>
                <button className="bp2" style={{ fontSize: 9 }} onClick={() => { const ta = document.getElementById("tplH_" + selSup); if (ta?.value) doImportTpl(ta.value) }}>Import</button>
                <button className="bg2" style={{ fontSize: 9 }} onClick={() => setShowImpTpl(false)}>{"H\u1EE7y"}</button>
              </div>
            </div>}
            {curTpl?.h?.length > 0 ? <div style={{ overflow: "auto", maxHeight: "50vh" }}>
              <table style={{ fontSize: 10 }}><thead><tr><th>#</th><th style={{ minWidth: 100 }}>{"T\u00EAn c\u1ED9t"}</th><th style={{ width: 70 }}>{"Lo\u1EA1i"}</th><th style={{ minWidth: 280 }}>{"Ngu\u1ED3n"}</th><th /></tr></thead>
              <tbody>{curTpl.h.map((h, i) => {
                const raw = curTpl.m[i]; const isStr = typeof raw === "string"; const isObj = typeof raw === "object" && raw?.t;
                const mType = isObj ? raw.t : isStr ? "str" : "single";
                return <tr key={i}><td style={{ color: T.td, fontSize: 10 }}>{i + 1}</td>
                  <td><input value={h} onChange={e => updateTplCol(i, "h", e.target.value)} style={{ width: "100%", fontSize: 10, padding: 2 }} /></td>
                  <td><select value={mType} onChange={e => {
                    const t = e.target.value;
                    if (t === "single") updateTplCol(i, "m", -1); else if (t === "str") updateTplCol(i, "m", "");
                    else if (t === "fb") updateTplCol(i, "m", { t: "fb", s: [-1, -1] }); else if (t === "mg") updateTplCol(i, "m", { t: "mg", s: [-1], sep: " | " });
                  }} style={{ fontSize: 9, padding: 2, width: 70 }}>
                    <option value="single">{"\u0110\u01A1n"}</option><option value="fb">Fallback</option><option value="mg">{"Gh\u00E9p"}</option><option value="str">Text</option>
                  </select></td>
                  <td>{mType === "single" ? <select value={typeof raw === "number" ? raw : -1} onChange={e => updateTplCol(i, "m", parseInt(e.target.value))} style={{ width: "100%", fontSize: 9, padding: 2 }}>
                    {SRC_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</select>
                    : mType === "str" ? <input value={raw || ""} onChange={e => updateTplCol(i, "m", e.target.value)} style={{ width: "100%", fontSize: 9, padding: 2 }} placeholder={"Nh\u1EADp text c\u1ED1 \u0111\u1ECBnh..."} />
                    : mType === "fb" ? <div>
                      {(raw.s || []).map((sv, si) => <div key={si} style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 3 }}>
                        <span style={{ fontSize: 12, minWidth: 20 }}>{si === 0 ? "\u0031\uFE0F\u20E3" : "\uD83D\uDD04"}</span>
                        <select value={sv} onChange={e => { const ns = [...raw.s]; ns[si] = parseInt(e.target.value); updateTplCol(i, "m", { ...raw, s: ns }) }} style={{ flex: 1, fontSize: 9, padding: 2 }}>
                          {SRC_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                        </select>
                        <span style={{ fontSize: 9, color: T.dg, cursor: "pointer" }} onClick={() => { const ns = raw.s.filter((_, j) => j !== si); updateTplCol(i, "m", { ...raw, s: ns.length ? ns : [-1] }) }}>{"\u2715"}</span>
                      </div>)}
                      <span style={{ fontSize: 9, color: T.p, cursor: "pointer" }} onClick={() => updateTplCol(i, "m", { ...raw, s: [...(raw.s || []), -1] })}>+ {"th\u00EAm fallback"}</span>
                    </div>
                    : mType === "mg" ? <div>
                      {(raw.s || []).map((sv, si) => <div key={si} style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 3 }}>
                        <span style={{ fontSize: 12, minWidth: 20 }}>{"\uD83D\uDD17"}</span>
                        <select value={sv} onChange={e => { const ns = [...raw.s]; ns[si] = parseInt(e.target.value); updateTplCol(i, "m", { ...raw, s: ns }) }} style={{ flex: 1, fontSize: 9, padding: 2 }}>
                          {SRC_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                        </select>
                        <span style={{ fontSize: 9, color: T.dg, cursor: "pointer" }} onClick={() => { const ns = raw.s.filter((_, j) => j !== si); updateTplCol(i, "m", { ...raw, s: ns.length ? ns : [-1] }) }}>{"\u2715"}</span>
                      </div>)}
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 9, color: T.p, cursor: "pointer" }} onClick={() => updateTplCol(i, "m", { ...raw, s: [...(raw.s || []), -1] })}>+ {"th\u00EAm ngu\u1ED3n"}</span>
                        <span style={{ fontSize: 9, color: T.tm }}>sep:</span>
                        <input value={raw.sep || " | "} onChange={e => updateTplCol(i, "m", { ...raw, sep: e.target.value })} style={{ width: 50, fontSize: 9, padding: 2 }} />
                      </div>
                    </div>
                    : null}</td>
                  <td><span style={{ fontSize: 9, color: T.dg, cursor: "pointer" }} onClick={() => delTplCol(i)}>{"\u2715"}</span></td></tr>
              })}</tbody></table>
            </div> : <div style={{ padding: 20, textAlign: "center", color: T.tm }}>{"Ch\u01B0a c\u00F3 template. Import Header ho\u1EB7c + C\u1ED9t."}</div>}
          </div>}

          {step === "sku" && <div>
            {supStock[selSup]?.rows?.length > 0 ? <div style={{ overflow: "auto", maxHeight: "50vh" }}>
              <div style={{ fontSize: 11, color: T.tm, marginBottom: 6 }}>{supStock[selSup].rows.length} entries</div>
              <table style={{ fontSize: 9 }}><thead><tr>{supStock[selSup].hdr.map((h, i) => <th key={i} style={{ whiteSpace: "nowrap", fontSize: 8 }}>{h}</th>)}</tr></thead>
              <tbody>{supStock[selSup].rows.slice(0, 100).map((row, ri) => <tr key={ri}>{supStock[selSup].hdr.map((h, ci) => <td key={ci} style={{ fontSize: 8, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row[h] || ""}</td>)}</tr>)}</tbody></table>
              {supStock[selSup].rows.length > 100 && <div style={{ fontSize: 10, color: T.tm, padding: 8, textAlign: "center" }}>{"Hi\u1EC3n 100/" + supStock[selSup].rows.length + " d\u00F2ng \u0111\u1EA7u"}</div>}
            </div> : <div style={{ padding: 20, textAlign: "center", color: T.tm }}>{"Ch\u01B0a c\u00F3 data. Nh\u1EA5n \"Import SKU " + selSup + "\" \u1EDF tr\u00EAn."}</div>}
          </div>}

          {step === "cfg" && <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{"\u2699\uFE0F Column Config"} {curRes && <span className="b bok">{"Đã cấu hình"}</span>}</div>
              <div style={{ display: "flex", gap: 4 }}>
                {presetVals && !curRes && <button className="bp2" style={{ fontSize: 9 }} onClick={async () => {
                  const p = { ...presetVals }; delete p.note;
                  await updateRouteCfg({ ...routeCfg, skuResolvers: { ...(routeCfg.skuResolvers || {}), [selSup]: p } });
                }}>Preset {selSup}</button>}
                {curRes && <button className="bg2" style={{ fontSize: 9, color: T.dg }} onClick={async () => {
                  const r = { ...(routeCfg.skuResolvers || {}) }; delete r[selSup];
                  await updateRouteCfg({ ...routeCfg, skuResolvers: r });
                }}>{"Xóa config"}</button>}
              </div>
            </div>
            {presetVals && <div style={{ background: T.sa, border: "1px solid " + T.bd, borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 11, color: T.tm }}>
              {"\uD83D\uDCA1 " + presetVals.note}
            </div>}
            {curRes ? <div>
              <table style={{ fontSize: 12, width: "100%" }}><tbody>
                {[["productCol", "Product Column"], ["sizeCol", "Size Column"], ["colorCol", "Color Column"], ["sideCol", "Side Column"], ["skuCol", "SKU Output Column"], ["variantCol", "Variant Column"]].map(([k, label]) =>
                  <tr key={k} style={{ borderBottom: "1px solid " + T.bd }}>
                    <td style={{ fontWeight: 500, padding: "10px 0", minWidth: 160 }}>{label}</td>
                    <td style={{ padding: "10px 0" }}>
                      <select value={curRes[k] || ""} onChange={async e => {
                        await updateRouteCfg({ ...routeCfg, skuResolvers: { ...(routeCfg.skuResolvers || {}), [selSup]: { ...curRes, [k]: e.target.value || null } } });
                      }} style={{ width: 220, fontSize: 11, padding: 6 }}>
                        <option value="">{"\u2014 không dùng \u2014"}</option>
                        {supHdr.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: "10px 0", fontSize: 11, color: T.tm, fontStyle: "italic" }}>
                      {presetVals?.[k] || "\u2014"}
                    </td>
                  </tr>
                )}
                <tr style={{ borderBottom: "1px solid " + T.bd }}>
                  <td style={{ fontWeight: 500, padding: "10px 0" }}>Uppercase</td>
                  <td style={{ padding: "10px 0" }}>
                    <input type="checkbox" checked={!!curRes.upper} onChange={async e => {
                      await updateRouteCfg({ ...routeCfg, skuResolvers: { ...(routeCfg.skuResolvers || {}), [selSup]: { ...curRes, upper: e.target.checked } } });
                    }} />
                  </td>
                  <td />
                </tr>
              </tbody></table>
            </div> : <div style={{ padding: 20, textAlign: "center", color: T.tm }}>{"Ch\u01B0a c\u1EA5u h\u00ECnh. Nh\u1EA5n Preset ho\u1EB7c c\u1EA5u h\u00ECnh th\u1EE7 c\u00F4ng."}</div>}
          </div>}

          {step === "stock" && (() => {
            const stockD = routeCfg.stockData?.[selSup] || { hdr: [], rows: [] };
            const saveStock = async (newData) => {
              await updateRouteCfg({ ...routeCfg, stockData: { ...(routeCfg.stockData || {}), [selSup]: newData } });
            };
            return <div>
            <div style={{ fontSize: 12, color: T.tm, marginBottom: 4 }}>{"Stock s\u1EA3n ph\u1EA9m c\u1EE7a " + selSup + " \u2014 S\u1EA3n ph\u1EA9m/size/m\u00E0u m\u00E0 x\u01B0\u1EDFng c\u00F3 th\u1EC3 s\u1EA3n xu\u1EA5t"}</div>
            <div style={{ fontSize: 10, color: T.w, marginBottom: 8 }}>{"\u26A0 D\u00F9ng \u0111\u1EC3 x\u00E1c minh khi ph\u00E2n \u0111\u01A1n: n\u1EBFu x\u01B0\u1EDFng kh\u00F4ng c\u00F3 size/m\u00E0u \u2192 \u0111\u1EA9y qua x\u01B0\u1EDFng ti\u1EBFp theo"}</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10, alignItems: "center" }}>
              <button className="bp2" onClick={() => { const el = document.getElementById("stockImpArea_" + selSup); if (el) el.style.display = el.style.display === "none" ? "block" : "none" }} style={{ fontSize: 11 }}>{"\uD83D\uDCE5 Import Stock " + selSup}</button>
              {stockD.rows.length > 0 && <button className="bdel" onClick={async () => { if (confirm("X\u00F3a to\u00E0n b\u1ED9 stock " + selSup + "?")) await saveStock({ hdr: [], rows: [] }) }} style={{ fontSize: 10 }}>{"X\u00F3a stock"}</button>}
              <span style={{ fontSize: 10, color: T.tm }}>{stockD.rows.length + " entries"}</span>
            </div>
            <div id={"stockImpArea_" + selSup} style={{ display: "none", marginBottom: 12, background: T.sa, border: "1px solid " + T.bd, borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 10, color: T.tm, marginBottom: 6 }}>{"Paste t\u1EEB Excel. VD: Product \\t Size \\t Color. D\u00F2ng 1 = header."}</div>
              <textarea rows={6} style={{ width: "100%", fontSize: 10, fontFamily: "monospace" }} placeholder={"Product\tSize\tColor\n..."} id={"stockPasteTA_" + selSup} />
              <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                <button className="bp2" onClick={async () => {
                  const ta = document.getElementById("stockPasteTA_" + selSup); if (!ta?.value) return;
                  const lines = ta.value.trim().split("\n"); if (lines.length < 2) return alert("C\u1EA7n header + data");
                  const hdr = lines[0].split("\t").map(h => h.trim());
                  const rows = lines.slice(1).map(l => { const c = l.split("\t"); const o = {}; hdr.forEach((h, i) => o[h] = c[i]?.trim() || ""); return o });
                  await saveStock({ hdr, rows });
                  ta.value = ""; document.getElementById("stockImpArea_" + selSup).style.display = "none";
                  alert("Import " + rows.length + " stock entries");
                }} style={{ fontSize: 11 }}>Import</button>
                <button className="bg2" onClick={() => { document.getElementById("stockImpArea_" + selSup).style.display = "none" }} style={{ fontSize: 11 }}>{"H\u1EE7y"}</button>
              </div>
            </div>
            {stockD.rows.length > 0 ? <div style={{ overflow: "auto", maxHeight: "50vh" }}>
              <table style={{ fontSize: 9 }}><thead><tr>{stockD.hdr.map((h, i) => <th key={i} style={{ whiteSpace: "nowrap", fontSize: 8 }}>{h}</th>)}</tr></thead>
              <tbody>{stockD.rows.slice(0, 200).map((row, ri) => <tr key={ri}>{stockD.hdr.map((h, ci) => <td key={ci} style={{ fontSize: 8 }}>{row[h] || ""}</td>)}</tr>)}</tbody></table>
              {stockD.rows.length > 200 && <div style={{ fontSize: 10, color: T.tm, padding: 8, textAlign: "center" }}>{"Hi\u1EC3n 200/" + stockD.rows.length}</div>}
            </div> : <div style={{ padding: 30, textAlign: "center", color: T.tm }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{"\uD83D\uDCCB"}</div>
              <div>{"Ch\u01B0a c\u00F3 stock. Nh\u1EA5n \"Import Stock\" \u0111\u1EC3 paste t\u1EEB Excel."}</div>
            </div>}
          </div> })()}
        </div>}
      </div> })()}
    </div>
  );
}
