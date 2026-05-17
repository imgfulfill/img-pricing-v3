import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { T, VER } from "../lib/utils";

export default function Sidebar({ cur, set }) {
  const { user, isAdmin, logout } = useAuth();
  const [expanded, setExpanded] = useState({ declare: true });
  const toggle = (k) => setExpanded(e => ({ ...e, [k]: !e[k] }));

  // Menu structure — copied exactly from v2 (dòng 142-162)
  const modules = [
    { id: "dash", icon: "📊", label: "Dashboard" },
    { id: "declare", icon: "📋", label: "Khai báo", admin: true, children: [
      { id: "dec-products", label: "Sản phẩm IMG" },
      { id: "dec-suppliers", label: "Quản lý đối tác" },
      { id: "dec-warehouse", label: "Lưu ý Warehouse" },
    ]},
    { id: "dec-warehouse-staff", icon: "📍", label: "Lưu ý Warehouse", staffOnly: true },
    { id: "comp", icon: "🏁", label: "Đối thủ", admin: true },
    { id: "params", icon: "⚙️", label: "Tham số" },
    { id: "pricing", icon: "💡", label: "Giá đề xuất", admin: true, children: [
      { id: "price-compare", label: "So sánh giá mua" },
      { id: "price-scenario", label: "Kịch bản phân đơn" },
      { id: "price-rec", label: "Giá bán đề xuất" },
    ]},
    { id: "pricelist", icon: "💰", label: "Bảng giá IMG", admin: true, children: [
      { id: "pl-locked", label: "Bảng giá chốt" },
      { id: "pl-disc", label: "Chiết khấu mô phỏng" },
    ]},
    { id: "router", icon: "🔀", label: "Cấu hình Router", admin: true, children: [
      { id: "rt-skuimg", label: "SKU IMG" },
      { id: "rt-skusup", label: "SKU Xưởng" },
      { id: "rt-map", label: "SKU Map" },
      { id: "rt-preview", label: "Router Preview" },
    ]},
    { id: "orders", icon: "📦", label: "Phân đơn" },
  ];

  const items = modules.filter(m => {
    if (m.admin && !isAdmin) return false;
    if (m.staffOnly && isAdmin) return false; // admin already has it in Khai báo group
    return true;
  });
  const isCur = (id) => cur === id || (id === "declare" && cur.startsWith("dec-")) || (id === "pricing" && cur.startsWith("price-")) || (id === "pricelist" && cur.startsWith("pl-")) || (id === "router" && cur.startsWith("rt-"));

  return (
    <div style={{ width: 210, minHeight: "100vh", background: T.sf, borderRight: "1px solid " + T.bd, display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "16px 14px", borderBottom: "1px solid " + T.bd }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}><span style={{ color: T.p }}>IMG</span> Pricing</div>
        <div style={{ fontSize: 10, color: T.td }}>v{VER} · {user.n}</div>
      </div>
      <nav style={{ flex: 1, padding: "8px 6px", overflowY: "auto" }}>
        {items.map(m => (
          <div key={m.id}>
            <button
              onClick={() => {
                if (m.children) {
                  toggle(m.id);
                  if (!cur.startsWith(m.children[0].id.split("-")[0])) set(m.children[0].id);
                } else {
                  set(m.id);
                }
              }}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 10px",
                borderRadius: 7, marginBottom: 1, fontSize: 12.5,
                fontWeight: isCur(m.id) ? 600 : 400,
                background: isCur(m.id) && !m.children ? "rgba(59,130,246,.12)" : "transparent",
                color: isCur(m.id) ? T.p : T.tx, cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 15 }}>{m.icon}</span>
              <span style={{ flex: 1, textAlign: "left" }}>{m.label}</span>
              {m.children && <span style={{ fontSize: 10, transition: "transform .2s", transform: expanded[m.id] ? "rotate(90deg)" : "rotate(0deg)" }}>▸</span>}
            </button>
            {m.children && expanded[m.id] && (
              <div style={{ paddingLeft: 26, marginBottom: 4 }}>
                {m.children.map(c => (
                  <button key={c.id} onClick={() => set(c.id)}
                    style={{
                      display: "block", width: "100%", textAlign: "left", padding: "6px 10px",
                      borderRadius: 6, marginBottom: 1, fontSize: 11.5,
                      fontWeight: cur === c.id ? 600 : 400,
                      background: cur === c.id ? "rgba(59,130,246,.12)" : "transparent",
                      color: cur === c.id ? T.p : T.tm,
                    }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
      <div style={{ padding: "10px 14px", borderTop: "1px solid " + T.bd }}>
        <button className="bg2" onClick={logout} style={{ width: "100%", fontSize: 11 }}>Đăng xuất</button>
      </div>
    </div>
  );
}
