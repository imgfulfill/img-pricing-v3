import React, { useState } from "react";
import * as XLSX from "xlsx";
import { useData } from "../context/DataContext";
import { T, VER, pn, uid } from "../lib/utils";

export default function Dashboard() {
  const { products, suppliers, prices, compPrices, skuImg, labelTiers, params, warehouseNotes, refreshAfterImport } = useData();
  const [importing, setImporting] = useState(false);
  const [importLog, setImportLog] = useState([]);

  const cards = [
    { label: "Sản phẩm", value: products.length, icon: "📦", color: T.p },
    { label: "Xưởng hoạt động", value: suppliers.filter(s => s.active).length + "/" + suppliers.length, icon: "🏭", color: T.ac },
    { label: "Giá mua", value: prices.length, icon: "💰", color: T.w },
    { label: "Đối thủ", value: compPrices.length, icon: "🏁", color: T.dg },
    { label: "SKU IMG", value: skuImg.length, icon: "🔖", color: "#8b5cf6" },
    { label: "Label Tiers", value: labelTiers.length, icon: "🏷️", color: "#ec4899" },
  ];

  return (
    <div className="fade">
      <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Dashboard</h2>
      <div style={{ fontSize: 12, color: T.tm, marginBottom: 16 }}>Tổng quan hệ thống IMG Pricing v{VER}</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
        {cards.map(c => (
          <div key={c.label} style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, color: T.tm, marginBottom: 4 }}>{c.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: c.color }}>{c.value}</div>
              </div>
              <div style={{ fontSize: 28 }}>{c.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
        <div style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>ℹ️ Thông tin hệ thống</div>
          <div style={{ fontSize: 11, color: T.tm }}>
            Database: Supabase PostgreSQL · Auth: Supabase Auth · {suppliers.filter(s => s.active).length} xưởng hoạt động · {Object.keys(params.categoryShip || {}).length} category ship
          </div>
        </div>
      </div>
    </div>
  );
}
