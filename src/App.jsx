import React, { useState } from "react";
import { useAuth } from "./context/AuthContext";
import { useData } from "./context/DataContext";
import { T } from "./lib/utils";

import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import ProductsPage from "./components/ProductsPage";
import SuppliersPage from "./components/SuppliersPage";
import WarehouseTab from "./components/WarehouseTab";
import CompModule from "./components/CompModule";
import ParamsModule from "./components/ParamsModule";
import ComparePage from "./components/ComparePage";
import ScenarioPage from "./components/ScenarioPage";
import RecPricePage from "./components/RecPricePage";
import LockedPage from "./components/LockedPage";
import DiscountPage from "./components/DiscountPage";
import SKUImgPage from "./components/SKUImgPage";
import SKUSupPage from "./components/SKUSupPage";
import SKUMapPage from "./components/SKUMapPage";
import RouterPreviewPage from "./components/RouterPreviewPage";
import OrderRouter from "./components/OrderRouter";

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const { dataLoading } = useData();
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

  // Data loading
  if (dataLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg, color: T.tx }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}><span style={{ color: T.p }}>IMG</span> Pricing</div>
          <div style={{ color: T.tm }}>Đang tải dữ liệu...</div>
        </div>
      </div>
    );
  }

  const renderPage = () => {
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
        {renderPage()}
      </main>
    </div>
  );
}
