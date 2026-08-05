import React, { useState, lazy, Suspense } from "react";
import { useAuth } from "./context/AuthContext";
import { useData } from "./context/DataContext";
import { T } from "./lib/utils";

import Login from "./components/Login";
import Sidebar from "./components/Sidebar";

/* Mỗi trang được tách thành một gói riêng, chỉ tải khi người dùng thực sự mở.
   Nhờ vậy thư viện Excel (xlsx, ~500KB) không còn nằm trong gói tải lần đầu
   của những người chỉ vào xem bảng giá. */
const Dashboard = lazy(() => import("./components/Dashboard"));
const ProductsPage = lazy(() => import("./components/ProductsPage"));
const SuppliersPage = lazy(() => import("./components/SuppliersPage"));
const WarehouseTab = lazy(() => import("./components/WarehouseTab"));
const CompModule = lazy(() => import("./components/CompModule"));
const ParamsModule = lazy(() => import("./components/ParamsModule"));
const ComparePage = lazy(() => import("./components/ComparePage"));
const ScenarioPage = lazy(() => import("./components/ScenarioPage"));
const RecPricePage = lazy(() => import("./components/RecPricePage"));
const LockedPage = lazy(() => import("./components/LockedPage"));
const DiscountPage = lazy(() => import("./components/DiscountPage"));
const SKUImgPage = lazy(() => import("./components/SKUImgPage"));
const SKUSupPage = lazy(() => import("./components/SKUSupPage"));
const SKUMapPage = lazy(() => import("./components/SKUMapPage"));
const RouterPreviewPage = lazy(() => import("./components/RouterPreviewPage"));
const OrderRouter = lazy(() => import("./components/OrderRouter"));
const VerifyPanel = lazy(() => import("./components/VerifyPanel"));


/* Những trang KHÔNG cần products/prices/comp_prices/sku_img — dùng được ngay
   trong lúc các bảng lớn còn đang tải ở nền. */
const TRANG_KHONG_CAN_DU_LIEU_LON = new Set(["params", "dec-warehouse", "dec-warehouse-staff"]);

function ThanhTienDo({ p }) {
  if (!p?.total) return null;
  const pct = Math.round((p.done / p.total) * 100);
  return (
    <div style={{ marginTop: 12, width: 220, marginLeft: "auto", marginRight: "auto" }}>
      <div style={{ height: 4, background: T.bd, borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: pct + "%", background: T.p, transition: "width .25s" }} />
      </div>
      <div style={{ fontSize: 13, color: T.td, marginTop: 5 }}>{p.done + "/" + p.total + " bảng"}</div>
    </div>
  );
}

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const { dataLoading, heavyLoading, loadProgress } = useData();
  const [page, setPage] = useState("dash");

  // Auth loading
  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg, color: T.tx }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}><span style={{ color: T.p }}>IMG</span> Pricing</div>
          <div style={{ color: T.tm }}>Đang xác thực...</div>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) return <Login />;

  // Data loading — chỉ chờ nhóm bảng NHỎ. Các bảng lớn tải tiếp ở nền.
  if (dataLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg, color: T.tx }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}><span style={{ color: T.p }}>IMG</span> Pricing</div>
          <div style={{ color: T.tm }}>Đang tải dữ liệu...</div>
          <ThanhTienDo p={loadProgress} />
        </div>
      </div>
    );
  }

  // TẠM THỜI — mở web với ?verify=1 để chạy đối chiếu cách tính cũ ↔ mới.
  // Xoá 3 dòng này (và file VerifyPanel.jsx, verify.js, legacy.js) khi xong.
  const verifyMode = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("verify");

  const renderPage = () => {
    // Các bảng lớn còn đang tải → trang nào cần chúng thì chờ, trang nào không cần thì dùng được ngay.
    // Chờ ở đây thay vì hiện bảng RỖNG (dễ khiến người dùng tưởng mất dữ liệu).
    if (heavyLoading && !TRANG_KHONG_CAN_DU_LIEU_LON.has(page)) {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", color: T.tx }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>Đang tải bảng giá và SKU...</div>
            <div style={{ fontSize: 14, color: T.tm }}>Trang này cần dữ liệu lớn. Thanh bên trái đã dùng được.</div>
            <ThanhTienDo p={loadProgress} />
          </div>
        </div>
      );
    }
    if (verifyMode) return <VerifyPanel />;
    switch (page) {
      case "dash": return <Dashboard />;
      case "dec-products": return <ProductsPage />;
      case "dec-suppliers": return <SuppliersPage />;
      case "dec-warehouse": return <WarehouseTab />;
      case "dec-warehouse-staff": return <WarehouseTab />;
      case "comp": return <CompModule />;
      case "params": return <ParamsModule />;
      case "price-compare": return <ComparePage />;
      case "price-scenario": return <ScenarioPage />;
      case "price-rec": return <RecPricePage />;
      case "pl-locked": return <LockedPage />;
      case "pl-disc": return <DiscountPage />;
      case "rt-skuimg": return <SKUImgPage />;
      case "rt-skusup": return <SKUSupPage onNav={setPage} />;
      case "rt-map": return <SKUMapPage />;
      case "rt-preview": return <RouterPreviewPage />;
      case "orders": return <OrderRouter />;
      default: return <Dashboard />;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg }}>
      <Sidebar cur={page} set={setPage} />
      <main style={{ flex: 1, padding: 24, overflowY: "auto", maxHeight: "100vh" }}>
        <Suspense fallback={<div style={{ color: T.tm, fontSize: 15, padding: 20 }}>Đang mở trang...</div>}>
          {renderPage()}
        </Suspense>
      </main>
    </div>
  );
}
