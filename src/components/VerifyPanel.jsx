/* Bảng kết quả đối chiếu "cách cũ ↔ cách mới".
   Chỉ hiện khi địa chỉ web có ?verify=1 — người dùng thường không bao giờ thấy.
   Xoá file này khi đã xác nhận xong. */

import React, { useState } from "react";
import { useData } from "../context/DataContext";
import { T } from "../lib/utils";
import { runVerification } from "../lib/verify";

const box = { background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, padding: 16, marginBottom: 16 };
const row = (ok) => ({ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid " + T.bd, color: ok ? T.ac : T.dg });

export default function VerifyPanel() {
  const D = useData();
  const [state, setState] = useState("idle");   // idle | running | done | error
  const [prog, setProg] = useState(null);
  const [rep, setRep] = useState(null);
  const [err, setErr] = useState("");

  const start = async () => {
    setState("running"); setRep(null); setErr("");
    await new Promise(r => setTimeout(r, 30));
    try {
      const t0 = performance.now();
      const r = await runVerification(D, (done, total, checks) => setProg({ done, total, checks }));
      r.ms = Math.round(performance.now() - t0);
      setRep(r); setState("done");
    } catch (e) {
      setErr(e?.message || String(e)); setState("error");
    }
  };

  const S = rep?.scale;

  return (
    <div className="fade" style={{ maxWidth: 900 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Đối chiếu cách tính cũ ↔ mới</h2>
      <div style={{ fontSize: 14, color: T.tm, marginBottom: 14 }}>
        Chạy song song thuật toán cũ và thuật toán mới trên toàn bộ dữ liệu thật của bạn, rồi so từng kết quả.
        Không ghi gì vào cơ sở dữ liệu. Bỏ <code>?verify=1</code> khỏi địa chỉ để quay lại phần mềm.
      </div>

      <div style={box}>
        <button className="bp2" onClick={start} disabled={state === "running"} style={{ fontSize: 15, padding: "8px 18px" }}>
          {state === "running" ? "Đang chạy..." : "▶ Bắt đầu đối chiếu"}
        </button>
        {state === "running" && prog && (
          <div style={{ marginTop: 10, fontSize: 14, color: T.tm }}>
            {`Đã xử lý ${prog.done}/${prog.total} mục · ${prog.checks.toLocaleString("vi-VN")} phép so sánh`}
          </div>
        )}
        {state === "running" && (
          <div style={{ marginTop: 6, fontSize: 13, color: T.w }}>
            Cách cũ vốn rất chậm, nên bước này có thể mất một lúc. Đó chính là vấn đề đang được sửa.
          </div>
        )}
        {state === "error" && <div style={{ marginTop: 10, color: T.dg, fontSize: 14 }}>Lỗi: {err}</div>}
      </div>

      {rep && (
        <>
          <div style={{ ...box, borderColor: rep.fatal === 0 ? T.ac : T.dg }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: rep.fatal === 0 ? T.ac : T.dg, marginBottom: 10 }}>
              {rep.fatal === 0 ? "✓ ĐẠT — không có điểm lệch nào" : `✗ CÓ ${rep.fatal} ĐIỂM LỆCH CẦN XEM LẠI`}
            </div>
            <div style={row(true)}><span>Tổng số phép so sánh</span><b>{rep.checks.toLocaleString("vi-VN")}</b></div>
            <div style={row(rep.kind.bothOk === 0)}><span>Cả hai chạy được nhưng KHÁC kết quả <i>(phải bằng 0)</i></span><b>{rep.kind.bothOk}</b></div>
            <div style={row(rep.kind.newThrew === 0)}><span>Cách mới sập, cách cũ chạy được <i>(phải bằng 0)</i></span><b>{rep.kind.newThrew}</b></div>
            <div style={{ ...row(true), color: rep.kind.oldThrew ? T.w : T.tm }}>
              <span>Cách cũ SẬP, cách mới trả lời được <i>(cải thiện có chủ đích)</i></span><b>{rep.kind.oldThrew}</b>
            </div>
            <div style={{ ...row(true), color: T.tm, borderBottom: "none" }}><span>Thời gian chạy</span><b>{(rep.ms / 1000).toFixed(1)}s</b></div>
          </div>

          <div style={box}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Quy mô dữ liệu đã kiểm tra</div>
            <div style={{ fontSize: 14, color: T.tm, lineHeight: 1.9 }}>
              {`${S.products.toLocaleString("vi-VN")} sản phẩm · ${S.prices.toLocaleString("vi-VN")} dòng giá · ${S.compPrices.toLocaleString("vi-VN")} giá đối thủ · ${S.skuImg.toLocaleString("vi-VN")} SKU · ${S.suppliers} xưởng`}
              <br />{`${rep.pairs.toLocaleString("vi-VN")} cặp (sản phẩm × size) khác nhau`}
            </div>
            {(rep.health.productsSkippedSize || rep.health.pricesSkippedSize || rep.health.compSkipped) > 0 && (
              <div style={{ marginTop: 10, fontSize: 14, color: T.w }}>
                ⚠ Có dòng thiếu dữ liệu size/tên (cách cũ sẽ làm sập ứng dụng khi gặp phải):
                {` sản phẩm ${rep.health.productsSkippedSize}, bảng giá ${rep.health.pricesSkippedSize}, giá đối thủ ${rep.health.compSkipped}.`}
                {" Nên vào cơ sở dữ liệu điền bổ sung cho các dòng này."}
              </div>
            )}
          </div>

          {rep.diffs.length > 0 && (
            <div style={box}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Chi tiết điểm lệch (tối đa 60 dòng)</div>
              <div style={{ overflow: "auto", maxHeight: 420 }}>
                <table style={{ fontSize: 12 }}>
                  <thead><tr><th>Loại</th><th>Sản phẩm</th><th>Size</th><th>Cách cũ</th><th>Cách mới</th></tr></thead>
                  <tbody>
                    {rep.diffs.map((d, i) => (
                      <tr key={i} style={{ background: d.fatal ? "rgba(239,68,68,.08)" : "rgba(245,158,11,.06)" }}>
                        <td style={{ whiteSpace: "nowrap", color: d.fatal ? T.dg : T.w }}>{d.what}</td>
                        <td style={{ maxWidth: 200, wordBreak: "break-all" }}>{String(d.p)}</td>
                        <td>{String(d.s)}</td>
                        <td style={{ maxWidth: 240, wordBreak: "break-all", color: T.tm }}>{d.old}</td>
                        <td style={{ maxWidth: 240, wordBreak: "break-all", color: T.tm }}>{d.neu}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize: 13, color: T.tm, marginTop: 8 }}>
                Dòng <span style={{ color: T.w }}>vàng</span> = cách cũ sập, cách mới chạy được (chấp nhận được).
                Dòng <span style={{ color: T.dg }}>đỏ</span> = lệch thật, cần báo lại.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
