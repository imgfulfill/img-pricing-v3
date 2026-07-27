import React, { useState } from "react";
import { useData } from "../context/DataContext";
import { T } from "../lib/utils";

export default function WarehouseTab() {
  const { warehouseNotes, suppliers, addWhNote, deleteWhNote } = useData();
  const [form, setForm] = useState({ supplier: "", product: "ALL", noteType: "LABEL_ADDRESS", warehouseOverride: "", note: "" });

  const handleAdd = async () => {
    if (!form.supplier || !form.note) return alert("Cần chọn xưởng và nhập ghi chú");
    await addWhNote(form);
    setForm({ supplier: "", product: "ALL", noteType: "LABEL_ADDRESS", warehouseOverride: "", note: "" });
  };

  return (
    <div>
      <div style={{ fontSize: 12, color: T.tm, marginBottom: 12 }}>Lưu ý địa chỉ warehouse khi mua label hoặc đẩy đơn sang xưởng.</div>
      <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Thêm lưu ý mới</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
          <select value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} style={{ fontSize: 11 }}>
            <option value="">Chọn xưởng</option>
            {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
          <input value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} placeholder='Sản phẩm (hoặc "ALL")' style={{ fontSize: 11 }} />
          <select value={form.noteType} onChange={e => setForm(f => ({ ...f, noteType: e.target.value }))} style={{ fontSize: 11 }}>
            <option value="LABEL_ADDRESS">Set địa chỉ mua Label</option>
            <option value="GENERAL">Lưu ý chung</option>
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 8 }}>
          <input value={form.warehouseOverride} onChange={e => setForm(f => ({ ...f, warehouseOverride: e.target.value }))} placeholder="Địa chỉ warehouse override" style={{ fontSize: 11 }} />
          <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Ghi chú cho staff..." style={{ fontSize: 11 }} />
          <button className="bp2" onClick={handleAdd} style={{ fontSize: 11 }}>Thêm</button>
        </div>
      </div>
      <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, overflow: "hidden" }}>
        <table><thead><tr>
          <th>Xưởng</th><th>Sản phẩm</th><th>Loại</th><th>Địa chỉ Override</th><th>Ghi chú</th><th>Act</th>
        </tr></thead><tbody>
          {warehouseNotes.length === 0 ? (
            <tr><td colSpan={6} style={{ textAlign: "center", padding: 20, color: T.td }}>Chưa có lưu ý nào</td></tr>
          ) : warehouseNotes.map(n => (
            <tr key={n.id}>
              <td style={{ fontWeight: 500 }}>{n.supplier}</td>
              <td style={{ fontSize: 11 }}>{n.product}</td>
              <td><span className={"b " + (n.noteType === "LABEL_ADDRESS" ? "bw" : "bi")}>{n.noteType === "LABEL_ADDRESS" ? "📍 Label Addr" : "📝 General"}</span></td>
              <td style={{ fontSize: 10, color: T.tm, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.warehouseOverride || "—"}</td>
              <td style={{ fontSize: 11 }}>{n.note}</td>
              <td><button className="bdel" style={{ padding: "2px 6px", fontSize: 10 }} onClick={() => deleteWhNote(n.id)}>🗑</button></td>
            </tr>
          ))}
        </tbody></table>
      </div>
    </div>
  );
}
