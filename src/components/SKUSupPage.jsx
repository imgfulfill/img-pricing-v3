import React, { useState, useEffect, useMemo } from "react";
import { useData } from "../context/DataContext";
import { T, pn, szOrd, SRC_OPTS, SKU_PRESETS, ORD_HDR, TBL_H_SHORT } from "../lib/utils";

export default function SKUSupPage({ onNav }) {
  const { suppliers, supStock, routeCfg, updateSupStock, updateRouteCfg } = useData();
  const [selSup, setSelSup] = useState(null); const [step, setStep] = useState("tpl");
  const [showImpSku, setShowImpSku] = useState(false); const [showImpTpl, setShowImpTpl] = useState(false);
  const [stockRows, setStockRows] = useState([]);
  // Data tab CRUD state
  const [skuQ, setSkuQ] = useState(""); const [editSkuRow, setEditSkuRow] = useState(null);
  const [editSkuVals, setEditSkuVals] = useState({}); const [skuSel, setSkuSel] = useState(new Set());
  const [bulkSkuField, setBulkSkuField] = useState(""); const [bulkSkuVal, setBulkSkuVal] = useState("");
  // Stock tab CRUD state
  const [stQ, setStQ] = useState(""); const [editStRow, setEditStRow] = useState(null);
  const [editStVals, setEditStVals] = useState({}); const [stSel, setStSel] = useState(new Set());
  const [showStImp, setShowStImp] = useState(false);
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
    const newRows = lines.slice(1).map(l => { const c = l.split("\t"); const o = {}; hdr.forEach((h, i) => o[h] = c[i]?.trim() || ""); return o });
    const existing = supStock[selSup] || { hdr: [], rows: [] };
    if (existing.rows.length === 0) {
      await updateSupStock(selSup, { hdr, rows: newRows });
    } else {
      const mergedHdr = [...new Set([...existing.hdr, ...hdr])];
      await updateSupStock(selSup, { hdr: mergedHdr, rows: [...existing.rows, ...newRows] });
    }
    setShowImpSku(false); alert("Thêm " + newRows.length + " dòng (tổng: " + ((existing.rows?.length || 0) + newRows.length) + ")");
  };
  const curRes = (routeCfg.skuResolvers || {})[selSup] || null;
  const supHdr = supStock[selSup]?.hdr || [];
  const srcLabel = v => { const o = SRC_OPTS.find(x => x.v === v); return o ? o.l : typeof v === "string" ? '"' + v + '"' : "col " + v };

  // Preset values from SKU_PRESETS for display
  const presetVals = SKU_PRESETS[selSup] || null;

  return (
    <div className="fade">
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>{"SKU Xưởng & Template"}</h2>
      <div style={{ fontSize: 14, color: T.tm, marginBottom: 4 }}>{"Khai báo SKU xưởng, Template của xưởng và stock"}</div>
      <div style={{ fontSize: 13, color: T.p, marginBottom: 12, cursor: "pointer" }} onClick={() => onNav && onNav("dec-suppliers")}>{"\u2192 Quản lý đối tác (bật/tắt API)"}</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {activeSups.map(s => {
          const isApi = s.api; const hasTpl = !!routeCfg.tpls?.[s.name]; const skuCount = supStock[s.name]?.rows?.length || 0;
          return <div key={s.name} onClick={() => { setSelSup(s.name); setStep("tpl") }} style={{ background: selSup === s.name ? T.sa : T.sf, border: "1px solid " + (selSup === s.name ? T.p : T.bd),
            borderRadius: 10, padding: "10px 16px", cursor: "pointer", minWidth: 100, textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{isApi ? "\uD83D\uDD17" : "\uD83D\uDCC4"} {s.name}</div>
            <div style={{ fontSize: 10, color: T.tm, marginTop: 4 }}>{isApi ? "(API)" : skuCount + " SKU"}</div>
            {hasTpl && <div style={{ fontSize: 9, color: T.ac }}>{"\u2699\uFE0F Template"}</div>}
          </div>
        })}
      </div>
      {selSup && (() => { const sup = suppliers.find(s => s.name === selSup); const isApi = sup?.api; const skuCount = supStock[selSup]?.rows?.length || 0; return <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div><span style={{ fontSize: 18, fontWeight: 600 }}>{isApi ? "\uD83D\uDD17" : "\uD83D\uDCC4"} {selSup}</span>
            <span style={{ fontSize: 13, color: T.tm, marginLeft: 8 }}>{isApi ? "Kết nối API" : "File Import"}{!isApi && " \u00B7 C\u1EA7n khai b\u00E1o Template + SKU"}</span></div>
          {!isApi && <button className="bp2" onClick={() => setShowImpSku(!showImpSku)} style={{ fontSize: 13 }}>{showImpSku ? "\u0110\u00F3ng" : "Import SKU " + selSup}</button>}
        </div>
        {isApi ? <div style={{ padding: 20, textAlign: "center", color: T.tm }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>{"\uD83D\uDD17"}</div>
          <div>{"\u0110\u01A1n push qua API."}</div>
        </div> : <div>
          {showImpSku && <div style={{ marginBottom: 12, background: T.sa, border: "1px solid " + T.bd, borderRadius: 8, padding: 12 }}>
            <textarea rows={5} style={{ width: "100%", fontSize: 12, fontFamily: "monospace" }} placeholder={"Paste t\u1EEB sheet SKU " + selSup + "..."} id={"stkImp_" + selSup} />
            <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
              <button className="bp2" onClick={() => { const ta = document.getElementById("stkImp_" + selSup); if (ta?.value) doImportStock(ta.value) }} style={{ fontSize: 13 }}>Import</button>
              <button className="bg2" onClick={() => setShowImpSku(false)} style={{ fontSize: 13 }}>{"H\u1EE7y"}</button>
            </div>
          </div>}
          <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
            {[{ id: "tpl", l: "\u2460 Template Export" }, { id: "sku", l: "\u2461 Data " + selSup + " (" + skuCount + ")" }, { id: "cfg", l: "\u2462 Column Config" }, { id: "stock", l: "\u2463 Stock" }].map(t =>
              <button key={t.id} onClick={() => setStep(t.id)} className={step === t.id ? "bp2" : "bg2"} style={{ fontSize: 13 }}>{t.l}</button>)}
          </div>

          {step === "tpl" && <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Template Export ({curTpl?.h?.length || 0} {"c\u1ED9t"})</div>
              <div style={{ display: "flex", gap: 4 }}>
                <button className="bg2" onClick={() => setShowImpTpl(!showImpTpl)} style={{ fontSize: 10 }}>Import Header</button>
                <button className="bg2" onClick={addTplCol} style={{ fontSize: 10 }}>+ {"C\u1ED9t"}</button>
              </div>
            </div>
            {showImpTpl && <div style={{ marginBottom: 8 }}>
              <textarea rows={2} style={{ width: "100%", fontSize: 12, fontFamily: "monospace" }} placeholder="Paste 1 d\u00F2ng header (tab-separated)..." id={"tplH_" + selSup} />
              <div style={{ marginTop: 4, display: "flex", gap: 4 }}>
                <button className="bp2" style={{ fontSize: 10 }} onClick={() => { const ta = document.getElementById("tplH_" + selSup); if (ta?.value) doImportTpl(ta.value) }}>Import</button>
                <button className="bg2" style={{ fontSize: 10 }} onClick={() => setShowImpTpl(false)}>{"H\u1EE7y"}</button>
              </div>
            </div>}
            {curTpl?.h?.length > 0 ? <div style={{ overflow: "auto", maxHeight: TBL_H_SHORT }}>
              <table style={{ fontSize: 12 }}><thead><tr><th>#</th><th style={{ minWidth: 100 }}>{"T\u00EAn c\u1ED9t"}</th><th style={{ width: 70 }}>{"Lo\u1EA1i"}</th><th style={{ minWidth: 280 }}>{"Ngu\u1ED3n"}</th><th /></tr></thead>
              <tbody>{curTpl.h.map((h, i) => {
                const raw = curTpl.m[i]; const isStr = typeof raw === "string"; const isObj = typeof raw === "object" && raw?.t;
                const mType = isObj ? raw.t : isStr ? "str" : "single";
                return <tr key={i}><td style={{ color: T.td, fontSize: 12 }}>{i + 1}</td>
                  <td><input value={h} onChange={e => updateTplCol(i, "h", e.target.value)} style={{ width: "100%", fontSize: 12, padding: 2 }} /></td>
                  <td><select value={mType} onChange={e => {
                    const t = e.target.value;
                    if (t === "single") updateTplCol(i, "m", -1); else if (t === "str") updateTplCol(i, "m", "");
                    else if (t === "fb") updateTplCol(i, "m", { t: "fb", s: [-1, -1] }); else if (t === "mg") updateTplCol(i, "m", { t: "mg", s: [-1], sep: " | " });
                  }} style={{ fontSize: 10, padding: 2, width: 70 }}>
                    <option value="single">{"\u0110\u01A1n"}</option><option value="fb">Fallback</option><option value="mg">{"Gh\u00E9p"}</option><option value="str">Text</option>
                  </select></td>
                  <td>{mType === "single" ? <select value={typeof raw === "number" ? raw : -1} onChange={e => updateTplCol(i, "m", parseInt(e.target.value))} style={{ width: "100%", fontSize: 10, padding: 2 }}>
                    {SRC_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</select>
                    : mType === "str" ? <input value={raw || ""} onChange={e => updateTplCol(i, "m", e.target.value)} style={{ width: "100%", fontSize: 10, padding: 2 }} placeholder={"Nh\u1EADp text c\u1ED1 \u0111\u1ECBnh..."} />
                    : mType === "fb" ? <div>
                      {(raw.s || []).map((sv, si) => <div key={si} style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 3 }}>
                        <span style={{ fontSize: 14, minWidth: 20 }}>{si === 0 ? "\u0031\uFE0F\u20E3" : "\uD83D\uDD04"}</span>
                        <select value={sv} onChange={e => { const ns = [...raw.s]; ns[si] = parseInt(e.target.value); updateTplCol(i, "m", { ...raw, s: ns }) }} style={{ flex: 1, fontSize: 10, padding: 2 }}>
                          {SRC_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                        </select>
                        <span style={{ fontSize: 10, color: T.dg, cursor: "pointer" }} onClick={() => { const ns = raw.s.filter((_, j) => j !== si); updateTplCol(i, "m", { ...raw, s: ns.length ? ns : [-1] }) }}>{"\u2715"}</span>
                      </div>)}
                      <span style={{ fontSize: 10, color: T.p, cursor: "pointer" }} onClick={() => updateTplCol(i, "m", { ...raw, s: [...(raw.s || []), -1] })}>+ {"th\u00EAm fallback"}</span>
                    </div>
                    : mType === "mg" ? <div>
                      {(raw.s || []).map((sv, si) => <div key={si} style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 3 }}>
                        <span style={{ fontSize: 14, minWidth: 20 }}>{"\uD83D\uDD17"}</span>
                        <select value={sv} onChange={e => { const ns = [...raw.s]; ns[si] = parseInt(e.target.value); updateTplCol(i, "m", { ...raw, s: ns }) }} style={{ flex: 1, fontSize: 10, padding: 2 }}>
                          {SRC_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                        </select>
                        <span style={{ fontSize: 10, color: T.dg, cursor: "pointer" }} onClick={() => { const ns = raw.s.filter((_, j) => j !== si); updateTplCol(i, "m", { ...raw, s: ns.length ? ns : [-1] }) }}>{"\u2715"}</span>
                      </div>)}
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 10, color: T.p, cursor: "pointer" }} onClick={() => updateTplCol(i, "m", { ...raw, s: [...(raw.s || []), -1] })}>+ {"th\u00EAm ngu\u1ED3n"}</span>
                        <span style={{ fontSize: 10, color: T.tm }}>sep:</span>
                        <input value={raw.sep || " | "} onChange={e => updateTplCol(i, "m", { ...raw, sep: e.target.value })} style={{ width: 50, fontSize: 10, padding: 2 }} />
                      </div>
                    </div>
                    : null}</td>
                  <td><span style={{ fontSize: 10, color: T.dg, cursor: "pointer" }} onClick={() => delTplCol(i)}>{"\u2715"}</span></td></tr>
              })}</tbody></table>
            </div> : <div style={{ padding: 20, textAlign: "center", color: T.tm }}>{"Ch\u01B0a c\u00F3 template. Import Header ho\u1EB7c + C\u1ED9t."}</div>}
          </div>}

          {step === "sku" && (() => {
            const sd = supStock[selSup] || { hdr: [], rows: [] };

            /* Mỗi phần tử mang theo VỊ TRÍ GỐC trong sd.rows.
               Trước đây ô tick lưu theo vị trí trong danh sách ĐÃ LỌC, nên đổi từ khoá
               tìm kiếm giữa chừng là tick trỏ sang dòng khác → sửa/xoá nhầm.
               Ngoài ra bản cũ gọi sd.rows.indexOf(row) cho TỪNG dòng khi vẽ bảng
               (bảng 3.000 dòng = 9 triệu phép so sánh); nay lấy sẵn một lần. */
            const q = skuQ.toLowerCase();
            /* Sắp xếp theo cột Sản phẩm → Size đã khai ở tab ③ Column Config.
               Chưa khai thì giữ nguyên thứ tự file nhập của xưởng.
               Vị trí gốc `i` đi kèm từng dòng nên sửa/xoá vẫn đúng dòng. */
            const pCol = curRes?.productCol, zCol = curRes?.sizeCol;
            const filteredSku = sd.rows
              .map((row, i) => ({ row, i }))
              .filter(({ row }) => !q || Object.values(row).some(v => String(v ?? "").toLowerCase().includes(q)))
              .sort((a, b) => {
                if (!pCol) return 0;
                return String(a.row[pCol] ?? "").localeCompare(String(b.row[pCol] ?? ""))
                  || (zCol ? szOrd(a.row[zCol]) - szOrd(b.row[zCol]) : 0);
              });

            const toggleSkuSel = (i) => { const ns = new Set(skuSel); ns.has(i) ? ns.delete(i) : ns.add(i); setSkuSel(ns) };
            const selAllSku = () => {
              if (skuSel.size === filteredSku.length && filteredSku.length > 0) setSkuSel(new Set());
              else setSkuSel(new Set(filteredSku.map(x => x.i)));
            };
            const delSkuRows = async () => {
              if (!skuSel.size) return;
              if (!confirm("Xóa " + skuSel.size + " dòng? Không thể hoàn tác.")) return;
              const newRows = sd.rows.filter((_, i) => !skuSel.has(i));
              await updateSupStock(selSup, { ...sd, rows: newRows });
              setSkuSel(new Set()); setEditSkuRow(null);
            };
            const saveEditSku = async () => {
              const newRows = [...sd.rows]; newRows[editSkuRow] = { ...newRows[editSkuRow], ...editSkuVals };
              await updateSupStock(selSup, { ...sd, rows: newRows }); setEditSkuRow(null);
            };
            const addSkuRow = async () => {
              const newRow = {}; sd.hdr.forEach(h => newRow[h] = "");
              await updateSupStock(selSup, { ...sd, rows: [...sd.rows, newRow] });
            };
            /* Sửa hàng loạt — toàn bộ data xưởng nằm gọn trong MỘT bản ghi,
               nên sửa 500 dòng cũng chỉ một lệnh ghi duy nhất. */
            const applyBulkSku = async () => {
              if (!bulkSkuField || !skuSel.size) return;
              if (bulkSkuVal === "" && !confirm('Đặt cột "' + bulkSkuField + '" thành RỖNG cho ' + skuSel.size + " dòng?")) return;
              const newRows = sd.rows.map((r, i) => skuSel.has(i) ? { ...r, [bulkSkuField]: bulkSkuVal } : r);
              const ok = await updateSupStock(selSup, { ...sd, rows: newRows });
              if (ok !== false) { setSkuSel(new Set()); setBulkSkuVal(""); }
            };
            const exportSku = async () => {
              if (!sd.rows.length) return;
              // Thư viện Excel chỉ tải khi thực sự bấm xuất file (~280KB)
              const XLSX = await import("xlsx");
              const rows = (skuSel.size ? sd.rows.filter((_, i) => skuSel.has(i)) : filteredSku.map(x => x.row))
                .map(r => { const o = {}; sd.hdr.forEach(h => o[h] = r[h] ?? ""); return o });
              const ws = XLSX.utils.json_to_sheet(rows, { header: sd.hdr });
              const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, selSup.slice(0, 30));
              XLSX.writeFile(wb, "SKU_" + selSup + "_" + new Date().toISOString().slice(0, 10) + ".xlsx");
            };

            return <div>
              <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
                <input value={skuQ} onChange={e => setSkuQ(e.target.value)} placeholder={"Tìm..."} style={{ flex: 1, minWidth: 150, fontSize: 12 }} />
                <span style={{ fontSize: 12, color: T.tm }}>{filteredSku.length + "/" + sd.rows.length}</span>
                <button className="bg2" onClick={addSkuRow} style={{ fontSize: 10 }}>+ Thêm dòng</button>
                <button className="bg2" onClick={exportSku} style={{ fontSize: 10 }} disabled={!sd.rows.length}>
                  {"📥 Xuất Excel" + (skuSel.size ? " (" + skuSel.size + " dòng chọn)" : filteredSku.length !== sd.rows.length ? " (" + filteredSku.length + " dòng lọc)" : "")}
                </button>
              </div>

              {sd.rows.length > 0 && (
                <div style={{ background: T.sf, border: "1px solid " + T.p, borderRadius: 8, padding: 10, marginBottom: 10, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", fontSize: 13 }}>
                  <button className="bg2" onClick={selAllSku} style={{ fontSize: 12 }}>
                    {skuSel.size === filteredSku.length && filteredSku.length > 0 ? "Bỏ chọn" : "Chọn tất cả (" + filteredSku.length + ")"}
                  </button>
                  <span style={{ color: T.tm }}>{skuSel.size} đã chọn ·</span>
                  <select value={bulkSkuField} onChange={e => setBulkSkuField(e.target.value)} style={{ width: 150, fontSize: 12 }}>
                    <option value="">Chọn cột...</option>
                    {sd.hdr.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <input value={bulkSkuVal} onChange={e => setBulkSkuVal(e.target.value)} placeholder="Giá trị mới..." style={{ width: 170, fontSize: 12 }} />
                  <button className="bp2" onClick={applyBulkSku} style={{ fontSize: 12 }} disabled={!bulkSkuField || !skuSel.size}>Apply All ({skuSel.size})</button>
                  <span style={{ borderLeft: "1px solid " + T.bd, height: 18 }} />
                  <button className="bdel" onClick={delSkuRows} style={{ fontSize: 12 }} disabled={!skuSel.size}>{"🗑 Xóa " + skuSel.size + " dòng"}</button>
                </div>
              )}

              {sd.rows.length > 0 ? <div style={{ overflow: "auto", maxHeight: TBL_H_SHORT }}>
                <table style={{ fontSize: 10 }}><thead><tr>
                  <th style={{ width: 25 }}><input type="checkbox" checked={skuSel.size === filteredSku.length && filteredSku.length > 0} onChange={selAllSku} /></th>
                  <th style={{ width: 25, fontSize: 8 }}>#</th>
                  {sd.hdr.map((h, i) => <th key={i} style={{ whiteSpace: "nowrap", fontSize: 9 }}>{h}</th>)}
                  <th style={{ width: 50 }}>Act</th>
                </tr></thead><tbody>
                  {filteredSku.map(({ row, i: realIdx }) => {
                    const isEditing = editSkuRow === realIdx;
                    return <tr key={realIdx} style={{ background: skuSel.has(realIdx) ? "rgba(59,130,246,.08)" : "" }}>
                      <td><input type="checkbox" checked={skuSel.has(realIdx)} onChange={() => toggleSkuSel(realIdx)} /></td>
                      <td style={{ fontSize: 8, color: T.td }}>{realIdx + 1}</td>
                      {sd.hdr.map((h, ci) => <td key={ci}>{isEditing
                        ? <input value={editSkuVals[h] ?? row[h] ?? ""} onChange={e => setEditSkuVals(v => ({ ...v, [h]: e.target.value }))} style={{ width: "100%", fontSize: 9, padding: 1 }} />
                        : <span style={{ fontSize: 9, cursor: "pointer" }} onClick={() => { setEditSkuRow(realIdx); setEditSkuVals({}) }}>{row[h] || ""}</span>
                      }</td>)}
                      <td>{isEditing
                        ? <div style={{ display: "flex", gap: 2 }}>
                            <button className="bp2" style={{ padding: "1px 4px", fontSize: 9 }} onClick={saveEditSku}>✓</button>
                            <button className="bg2" style={{ padding: "1px 4px", fontSize: 9 }} onClick={() => setEditSkuRow(null)}>✕</button>
                          </div>
                        : <button className="bg2" style={{ padding: "1px 4px", fontSize: 9 }} onClick={() => { setEditSkuRow(realIdx); setEditSkuVals({}) }}>✏️</button>
                      }</td>
                    </tr>
                  })}
                </tbody></table>
              </div> : <div style={{ padding: 20, textAlign: "center", color: T.tm }}>{"Chưa có data. Nhấn \"Import SKU " + selSup + "\" ở trên."}</div>}
            </div> })()}

          {step === "cfg" && (() => {
            const res = curRes || {};
            const saveRes = async (patch) => {
              await updateRouteCfg({ ...routeCfg, skuResolvers: { ...(routeCfg.skuResolvers || {}), [selSup]: { ...res, ...patch } } });
            };
            // Tự động đoán cột từ tên header
            const autoDetect = async () => {
              if (!supHdr.length) return alert("Chưa có data. Import SKU " + selSup + " trước.");
              const find = (kws, exclude) => supHdr.find(h => {
                const hl = h.toLowerCase();
                if (exclude && exclude.some(x => hl.includes(x))) return false;
                return kws.some(k => hl.includes(k));
              }) || null;
              const guess = {
                productCol: find(["product", "sản phẩm", "san pham", "item", "name"], ["sku"]),
                sizeCol: find(["size", "kích", "kich"]),
                colorCol: find(["color", "colour", "màu", "mau"]),
                sideCol: find(["side", "print area", "printing", "mặt", "mat"]),
                skuCol: find(["sku", "mã", "ma "]),
                variantCol: find(["variant"]),
                upper: !!res.upper,
              };
              await saveRes(guess);
              const found = Object.entries(guess).filter(([k, v]) => k !== "upper" && v).length;
              alert("Đã đoán " + found + "/6 cột. Kiểm tra lại bên dưới trước khi dùng.");
            };
            const FIELDS = [
              ["productCol", "Product Column", "Bắt buộc — cột tên sản phẩm của xưởng"],
              ["sizeCol", "Size Column", "Cột size (bỏ trống nếu xưởng không tách size)"],
              ["colorCol", "Color Column", "Cột màu"],
              ["sideCol", "Side Column", "Cột mặt in (Front/Back/Both)"],
              ["skuCol", "SKU Output Column", "Cột chứa SKU xưởng sẽ xuất ra"],
              ["variantCol", "Variant Column", "Cột variant (nếu có)"],
            ];
            return <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{"\u2699\uFE0F Column Config"} {curRes ? <span className="b bok">{"Đã cấu hình"}</span> : <span className="b" style={{ background: "rgba(251,191,36,.15)", color: T.w }}>{"Chưa cấu hình"}</span>}</div>
              <div style={{ display: "flex", gap: 4 }}>
                <button className="bg2" style={{ fontSize: 10 }} onClick={autoDetect}>{"\uD83E\uDE84 Tự động đoán"}</button>
                {presetVals && <button className="bp2" style={{ fontSize: 10 }} onClick={async () => {
                  const p = { ...presetVals }; delete p.note;
                  await updateRouteCfg({ ...routeCfg, skuResolvers: { ...(routeCfg.skuResolvers || {}), [selSup]: p } });
                }}>Preset {selSup}</button>}
                {curRes && <button className="bg2" style={{ fontSize: 10, color: T.dg }} onClick={async () => {
                  if (!confirm("Xóa config của " + selSup + "?")) return;
                  const r = { ...(routeCfg.skuResolvers || {}) }; delete r[selSup];
                  await updateRouteCfg({ ...routeCfg, skuResolvers: r });
                }}>{"Xóa config"}</button>}
              </div>
            </div>
            {presetVals && <div style={{ background: T.sa, border: "1px solid " + T.bd, borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 13, color: T.tm }}>
              {"\uD83D\uDCA1 " + presetVals.note}
            </div>}
            {!supHdr.length && <div style={{ background: "rgba(251,191,36,.08)", border: "1px solid " + T.w, borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 13, color: T.w }}>
              {"\u26A0 Chưa có data SKU " + selSup + ". Nhấn \"Import SKU " + selSup + "\" ở trên để lấy danh sách cột, rồi mới cấu hình được."}
            </div>}
            {/* Ô thả xuống chỉ liệt kê các cột CÓ THẬT. Nếu giá trị đã lưu không nằm
                trong đó thì trình duyệt hiện ô TRỐNG — nhìn như chưa khai, trong khi
                thực chất đang giữ một tên cột cũ và sai. Cảnh báo để lộ ra ngay. */}
            {(() => {
              const LB = { productCol: "Product Column", sizeCol: "Size Column", colorCol: "Color Column", sideCol: "Side Column", skuCol: "SKU Output Column", variantCol: "Variant Column" };
              const badAll = Object.keys(LB).filter(k => res[k] && supHdr.length && !supHdr.includes(res[k]));
              if (!badAll.length) return null;
              // Nặng = hỏng mã SKU. Nhẹ = chỉ bỏ qua bước lọc, mã vẫn đúng.
              const nang = badAll.filter(k => ["productCol", "skuCol", "sideCol", "sizeCol"].includes(k));
              const bad = nang.length ? nang : badAll;
              const isErr = nang.length > 0;
              const C = isErr ? T.dg : T.w;
              const guess = (k) => supHdr.find(h => h.toLowerCase().includes(String(res[k]).toLowerCase().replace(/^_+|_+$/g, ""))) || null;
              return <div style={{ background: isErr ? "rgba(248,113,113,.10)" : "rgba(251,191,36,.10)", border: "1px solid " + C, borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 13, color: C }}>
                <b>{isErr ? "\u26A0 Cấu hình trỏ tới cột không tồn tại trong data \u2014 xưởng này sẽ ra SAI mã hoặc không ra mã."
                          : "\u2139 Có cột khai thừa (không có trong data). Không ảnh hưởng mã SKU, chỉ là bước lọc đó bị bỏ qua."}</b>
                {bad.map(k => { const g = guess(k); return <div key={k} style={{ marginTop: 6 }}>
                  {"\u2022 " + LB[k] + " = \"" + res[k] + "\" \u2014 không có cột này."}
                  {g && <> {"Có phải bạn muốn chọn "}<b>{"\"" + g + "\""}</b>{"?"}
                    <button className="bp2" style={{ fontSize: 11, marginLeft: 8, padding: "2px 8px" }} onClick={() => saveRes({ [k]: g })}>{"Sửa ngay"}</button></>}
                </div> })}
              </div>;
            })()}
            {!res.productCol && <div style={{ background: "rgba(248,113,113,.08)", border: "1px solid " + T.dg, borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 13, color: T.dg }}>
              {"\u26A0 Chưa chọn Product Column \u2192 SKU Mapping và Phân đơn sẽ KHÔNG map được SKU xưởng này."}
            </div>}
            <div>
              <table style={{ fontSize: 14, width: "100%" }}><tbody>
                {FIELDS.map(([k, label, hint]) =>
                  <tr key={k} style={{ borderBottom: "1px solid " + T.bd }}>
                    <td style={{ fontWeight: 500, padding: "10px 0", minWidth: 160 }}>
                      {label}{k === "productCol" && <span style={{ color: T.dg }}> *</span>}
                      <div style={{ fontSize: 10, color: T.td, fontWeight: 400 }}>{hint}</div>
                    </td>
                    <td style={{ padding: "10px 0" }}>
                      <select value={res[k] || ""} onChange={e => saveRes({ [k]: e.target.value || null })}
                        style={{ width: 220, fontSize: 13, padding: 6 }}>
                        <option value="">{"\u2014 không dùng \u2014"}</option>
                        {supHdr.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: "10px 0", fontSize: 13, color: T.tm, fontStyle: "italic" }}>
                      {presetVals?.[k] || "\u2014"}
                    </td>
                  </tr>
                )}
                <tr style={{ borderBottom: "1px solid " + T.bd }}>
                  <td style={{ fontWeight: 500, padding: "10px 0" }}>Uppercase
                    <div style={{ fontSize: 10, color: T.td, fontWeight: 400 }}>{"Viết hoa SKU khi xuất"}</div>
                  </td>
                  <td style={{ padding: "10px 0" }}>
                    <input type="checkbox" checked={!!res.upper} onChange={e => saveRes({ upper: e.target.checked })} />
                  </td>
                  <td />
                </tr>
              </tbody></table>
            </div>
          </div> })()}
          {step === "stock" && (() => {
            const stockD = routeCfg.stockData?.[selSup] || { hdr: [], rows: [] };
            const saveStock = async (newData) => {
              await updateRouteCfg({ ...routeCfg, stockData: { ...(routeCfg.stockData || {}), [selSup]: newData } });
            };
            
            
            
            
            
            const filteredSt = stockD.rows.filter(row => {
              if (!stQ) return true;
              return Object.values(row).some(v => (v || "").toLowerCase().includes(stQ.toLowerCase()));
            });
            const toggleStSel = (i) => { const ns = new Set(stSel); ns.has(i) ? ns.delete(i) : ns.add(i); setStSel(ns) };
            const delStRows = async () => {
              if (stSel.size === 0) return; if (!confirm("Xóa " + stSel.size + " dòng?")) return;
              const idxSet = new Set([...stSel].map(si => stockD.rows.indexOf(filteredSt[si])));
              const newRows = stockD.rows.filter((_, i) => !idxSet.has(i));
              await saveStock({ ...stockD, rows: newRows }); setStSel(new Set());
            };
            const saveEditSt = async () => {
              const newRows = [...stockD.rows]; newRows[editStRow] = { ...newRows[editStRow], ...editStVals };
              await saveStock({ ...stockD, rows: newRows }); setEditStRow(null);
            };
            const addStRow = async () => {
              if (stockD.hdr.length === 0) return alert("Import stock trước để tạo header");
              const newRow = {}; stockD.hdr.forEach(h => newRow[h] = "");
              await saveStock({ ...stockD, rows: [...stockD.rows, newRow] });
            };
            const doAppendImport = async (txt) => {
              const lines = txt.trim().split("\n"); if (lines.length < 2) return alert("Cần header + data");
              const hdr = lines[0].split("\t").map(h => h.trim());
              const newRows = lines.slice(1).map(l => { const c = l.split("\t"); const o = {}; hdr.forEach((h, i) => o[h] = c[i]?.trim() || ""); return o });
              // Append or replace based on existing data
              if (stockD.rows.length === 0) {
                await saveStock({ hdr, rows: newRows });
              } else {
                // Merge headers + append rows
                const mergedHdr = [...new Set([...stockD.hdr, ...hdr])];
                await saveStock({ hdr: mergedHdr, rows: [...stockD.rows, ...newRows] });
              }
              setShowStImp(false);
              alert("Thêm " + newRows.length + " dòng stock (tổng: " + (stockD.rows.length + newRows.length) + ")");
            };
            return <div>
              <div style={{ fontSize: 14, color: T.tm, marginBottom: 4 }}>{"Stock sản phẩm của " + selSup + " — Sản phẩm/size/màu mà xưởng có thể sản xuất"}</div>
              <div style={{ fontSize: 12, color: T.w, marginBottom: 8 }}>{"⚠ Dùng để xác minh khi phân đơn: nếu xưởng không có size/màu → đẩy qua xưởng tiếp theo"}</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
                <input value={stQ} onChange={e => setStQ(e.target.value)} placeholder={"Tìm..."} style={{ flex: 1, minWidth: 150, fontSize: 12 }} />
                <span style={{ fontSize: 12, color: T.tm }}>{filteredSt.length + "/" + stockD.rows.length}</span>
                <button className="bp2" onClick={() => setShowStImp(!showStImp)} style={{ fontSize: 12 }}>{"📥 Import thêm Stock"}</button>
                <button className="bg2" onClick={addStRow} style={{ fontSize: 10 }}>+ Thêm dòng</button>
                {stSel.size > 0 && <button className="bdel" onClick={delStRows} style={{ fontSize: 10 }}>{"🗑 Xóa " + stSel.size + " dòng"}</button>}
                {stockD.rows.length > 0 && <button className="bdel" onClick={async () => { if (confirm("Xóa TOÀN BỘ stock " + selSup + "?")) { await saveStock({ hdr: [], rows: [] }); setStSel(new Set()) } }} style={{ fontSize: 10 }}>{"Xóa tất cả"}</button>}
              </div>
              {showStImp && <div style={{ marginBottom: 12, background: T.sa, border: "1px solid " + T.bd, borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 12, color: T.tm, marginBottom: 6 }}>{"Paste từ Excel. Dòng 1 = header. Import sẽ THÊM vào data hiện tại (không xóa cũ)."}</div>
                <textarea rows={6} style={{ width: "100%", fontSize: 12, fontFamily: "monospace" }} placeholder={"Product\tSize\tColor\n..."} id={"stAppend_" + selSup} />
                <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                  <button className="bp2" onClick={() => { const ta = document.getElementById("stAppend_" + selSup); if (ta?.value) doAppendImport(ta.value) }} style={{ fontSize: 13 }}>Import thêm</button>
                  <button className="bg2" onClick={() => setShowStImp(false)} style={{ fontSize: 13 }}>{"Hủy"}</button>
                </div>
              </div>}
              {stockD.rows.length > 0 ? <div style={{ overflow: "auto", maxHeight: TBL_H_SHORT }}>
                <table style={{ fontSize: 10 }}><thead><tr>
                  <th style={{ width: 25 }}><input type="checkbox" checked={stSel.size === filteredSt.length && filteredSt.length > 0} onChange={() => { if (stSel.size === filteredSt.length) setStSel(new Set()); else setStSel(new Set(filteredSt.map((_, i) => i))) }} /></th>
                  <th style={{ width: 25, fontSize: 8 }}>#</th>
                  {stockD.hdr.map((h, i) => <th key={i} style={{ whiteSpace: "nowrap", fontSize: 9 }}>{h}</th>)}
                  <th style={{ width: 50 }}>Act</th>
                </tr></thead><tbody>
                  {filteredSt.map((row, ri) => {
                    const realIdx = stockD.rows.indexOf(row);
                    const isEditing = editStRow === realIdx;
                    return <tr key={ri} style={{ background: stSel.has(ri) ? "rgba(59,130,246,.08)" : "" }}>
                      <td><input type="checkbox" checked={stSel.has(ri)} onChange={() => toggleStSel(ri)} /></td>
                      <td style={{ fontSize: 8, color: T.td }}>{realIdx + 1}</td>
                      {stockD.hdr.map((h, ci) => <td key={ci}>{isEditing
                        ? <input value={editStVals[h] ?? row[h] ?? ""} onChange={e => setEditStVals(v => ({ ...v, [h]: e.target.value }))} style={{ width: "100%", fontSize: 9, padding: 1 }} />
                        : <span style={{ fontSize: 9, cursor: "pointer" }} onClick={() => { setEditStRow(realIdx); setEditStVals({}) }}>{row[h] || ""}</span>
                      }</td>)}
                      <td>{isEditing
                        ? <div style={{ display: "flex", gap: 2 }}>
                            <button className="bp2" style={{ padding: "1px 4px", fontSize: 9 }} onClick={saveEditSt}>✓</button>
                            <button className="bg2" style={{ padding: "1px 4px", fontSize: 9 }} onClick={() => setEditStRow(null)}>✕</button>
                          </div>
                        : <button className="bg2" style={{ padding: "1px 4px", fontSize: 9 }} onClick={() => { setEditStRow(realIdx); setEditStVals({}) }}>✏️</button>
                      }</td>
                    </tr>
                  })}
                </tbody></table>
              </div> : <div style={{ padding: 30, textAlign: "center", color: T.tm }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{"📋"}</div>
                <div>{"Chưa có stock. Nhấn \"Import thêm Stock\" để paste từ Excel."}</div>
              </div>}
            </div> })()}
        </div>}
      </div> })()}
    </div>
  );
}
