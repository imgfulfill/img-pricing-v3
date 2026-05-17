import React from "react";
import { useData } from "../context/DataContext";
import { T, pn } from "../lib/utils";

export default function ParamsModule() {
  const { params, routeCfg, updateParams, updateRouteCfg } = useData();
  const labelMode = routeCfg?.labelMode || "BLENDED";
  const setLM = (m) => updateRouteCfg({ ...routeCfg, labelMode: m });
  const u = (k, v) => updateParams({ ...params, [k]: v });
  const isPct = k => ["cheapRate", "reweighPct", "markup", "vipDiscount"].includes(k);

  const P = ({ k, l, unit, desc }) => {
    const pct = isPct(k);
    const dv = pct ? Math.round((params[k] ?? 0) * 10000) / 100 : (params[k] ?? "");
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid " + T.bd }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{l}</div>
          {desc && <div style={{ fontSize: 10, color: T.td, marginTop: 1 }}>{desc}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input type="number" step={pct ? 1 : 0.01} value={dv}
            onChange={e => { const v = parseFloat(e.target.value) || 0; u(k, pct ? v / 100 : v) }}
            style={{ width: 90, textAlign: "right", padding: 5 }} />
          <span style={{ fontSize: 10, color: T.td, minWidth: 40 }}>{unit}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="fade">
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Tham số hệ thống</h2>
      <div style={{ fontSize: 12, color: T.tm, marginBottom: 14 }}>Thay đổi → ảnh hưởng tính toán Label, Kịch bản SX, Giá đề xuất.</div>
      <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>🚚 Chế độ Label</div>
        <div style={{ display: "flex", gap: 6 }}>{["BLENDED", "EXP_ONLY", "CHEAP_ONLY"].map(m => <button key={m} className={labelMode === m ? "bp2" : "bg2"} onClick={() => setLM(m)} style={{ fontSize: 12, padding: "8px 16px" }}>{m}</button>)}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.p, marginBottom: 8 }}>Label & Mix</div>
          <P k="cheapRate" l="Tỷ lệ Cheap" unit="%" desc="Quota label rẻ $1.50. Giới hạn 15-30%." />
          <P k="cheapPrice" l="Giá Cheap đồng giá" unit="$/đơn" />
          <P k="expSmallest" l="Exp tier nhỏ nhất" unit="$/label" desc="IMG mua 100% ở tier 0.25 lb." />
          <P k="reweighPct" l="% USPS cân lại" unit="%" desc="40% đơn wrong-tier bị cân lại." />
          <P k="markup" l="Markup label" unit="%" desc="Cộng thêm vào giá USPS Zone 5." />
        </div>
        <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.p, marginBottom: 8 }}>Pricing & Chiến lược</div>
          <P k="minProfit" l="Lợi nhuận tối thiểu" unit="$/đơn" desc="Dưới ngưỡng → cảnh báo." />
          <P k="priceGap" l="Chênh giá vs ĐT rẻ nhất" unit="$/đơn" desc="IMG rẻ hơn MIN đối thủ mức này." />
          <P k="dtgDelta" l="DTG vs DTF delta" unit="$/đơn" desc="DTG Price = DTF + delta." />
          <P k="a2kDiscount" l="Chiết khấu A2K ship" unit="$/đơn" />
          <P k="minScenarios" l="Số kịch bản tối thiểu có lãi" unit="KB" />
          <P k="vipDiscount" l="CK seller VIP" unit="%" />
        </div>
      </div>
      <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, padding: 16, marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.p, marginBottom: 8 }}>Ship First / Ship Add per Category</div>
        <div style={{ maxHeight: 300, overflowY: "auto" }}>
          <table><thead><tr>
            <th>Category</th><th style={{ textAlign: "right" }}>Ship First ($)</th><th style={{ textAlign: "right" }}>Ship Add ($)</th>
          </tr></thead><tbody>
            {Object.entries(params.categoryShip || {}).map(([cat, v]) => (
              <tr key={cat}>
                <td style={{ fontWeight: 500, fontSize: 12 }}>{cat}</td>
                <td style={{ textAlign: "right" }}>
                  <input type="number" step=".01" value={v.s1} style={{ width: 70, textAlign: "right", padding: 3, fontSize: 11 }}
                    onChange={e => { const cs = { ...params.categoryShip }; cs[cat] = { ...cs[cat], s1: pn(e.target.value) || 0 }; u("categoryShip", cs) }} />
                </td>
                <td style={{ textAlign: "right" }}>
                  <input type="number" step=".01" value={v.sa} style={{ width: 70, textAlign: "right", padding: 3, fontSize: 11 }}
                    onChange={e => { const cs = { ...params.categoryShip }; cs[cat] = { ...cs[cat], sa: pn(e.target.value) || 0 }; u("categoryShip", cs) }} />
                </td>
              </tr>
            ))}
          </tbody></table>
        </div>
      </div>
    </div>
  );
}
