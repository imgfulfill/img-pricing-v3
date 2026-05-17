import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { DEF_PARAMS } from "../lib/utils";
import {
  productFromDb, productToDb,
  supplierFromDb, supplierToDb,
  priceFromDb, priceToDb,
  compPriceFromDb, compPriceToDb,
  labelTierFromDb, labelTierToDb,
  lockedPriceFromDb, lockedPriceToDb,
  skuImgFromDb, skuImgToDb,
  supStockFromDb,
  routeCfgFromDb, routeCfgToDb,
  prodMapFromDb, prodMapToDb,
  whNoteFromDb, whNoteToDb,
} from "../lib/transformers";

const DataContext = createContext(null);

export function DataProvider({ children }) {
  // ── STATE (read-only from outside) ──
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [prices, setPrices] = useState([]);
  const [params, setParams] = useState(DEF_PARAMS);
  const [labelTiers, setLabelTiers] = useState([]);
  const [compPrices, setCompPrices] = useState([]);
  const [lockedPrices, setLockedPrices] = useState({});
  const [skuImg, setSkuImg] = useState([]);
  const [supStock, setSupStock] = useState({});
  const [routeCfg, setRouteCfg] = useState({ labelMode: "BLENDED", apiSups: [], tpls: {}, skuResolvers: {} });
  const [prodMap, setProdMap] = useState({});
  const [warehouseNotes, setWarehouseNotes] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Helper: fetch all rows (Supabase default limit = 1000)
  const fetchAll = async (table, orderCol) => {
    const PAGE = 1000; let all = []; let from = 0;
    while (true) {
      let q = supabase.from(table).select("*").range(from, from + PAGE - 1);
      if (orderCol) q = q.order(orderCol);
      const { data, error } = await q;
      if (error) { console.error("fetchAll " + table + ":", error); break; }
      if (!data || data.length === 0) break;
      all = all.concat(data);
      if (data.length < PAGE) break;
      from += PAGE;
    }
    return all;
  };

  // ── LOAD ALL DATA ──
  const loadAllData = useCallback(async () => {
    setDataLoading(true);
    try {
      // Parallel fetch small tables
      const [
        { data: supData },
        { data: paramData },
        { data: ltData },
        { data: lpData },
        { data: ssData },
        { data: rcData },
        { data: pmData },
        { data: wnData },
      ] = await Promise.all([
        supabase.from("suppliers").select("*"),
        supabase.from("params").select("*"),
        supabase.from("label_tiers").select("*").order("sort_order"),
        supabase.from("locked_prices").select("*"),
        supabase.from("sup_stock").select("*"),
        supabase.from("route_cfg").select("*").limit(1),
        supabase.from("prod_map").select("*"),
        supabase.from("warehouse_notes").select("*"),
      ]);

      // Fetch large tables with pagination
      const [prodData, priceData, cpData, siData] = await Promise.all([
        fetchAll("products", "product"),
        fetchAll("prices"),
        fetchAll("comp_prices"),
        fetchAll("sku_img"),
      ]);

      if (prodData) setProducts(prodData.map(productFromDb));
      if (supData) setSuppliers(supData.map(supplierFromDb));
      if (priceData) setPrices(priceData.map(priceFromDb));
      
      // Params: merge from DB rows into single object
      if (paramData?.length) {
        const p = { ...DEF_PARAMS };
        paramData.forEach(r => {
          if (r.key === "categoryShip") {
            try { p.categoryShip = typeof r.value === "string" ? JSON.parse(r.value) : r.value } catch (e) { /* keep default */ }
          } else if (r.key && r.value != null) {
            p[r.key] = typeof r.value === "object" ? r.value : Number(r.value) || 0;
          }
        });
        setParams(p);
      }
      
      if (ltData) setLabelTiers(ltData.map(labelTierFromDb));
      if (cpData) setCompPrices(cpData.map(compPriceFromDb));
      
      // Locked prices: build { "product|||size": { v, w, x, sf } } map
      if (lpData) {
        const lk = {};
        lpData.forEach(r => {
          const row = lockedPriceFromDb(r);
          lk[row.product + "|||" + row.size] = row.lockedValue;
        });
        setLockedPrices(lk);
      }
      
      if (siData) setSkuImg(siData.map(skuImgFromDb));
      
      // Sup stock: build { supplierName: { stock, hdr, rows, skuMap } }
      if (ssData) {
        const ss = {};
        ssData.forEach(r => {
          const row = supStockFromDb(r);
          if (!ss[row.sku]) ss[row.sku] = {};
          Object.assign(ss[row.sku], row.stock || {});
        });
        setSupStock(ss);
      }
      
      if (rcData?.length) setRouteCfg(routeCfgFromDb(rcData[0]));
      
      // Prod map: build { productImg: { yoycol, zootop, ... } }
      if (pmData) {
        const pm = {};
        pmData.forEach(r => {
          const row = prodMapFromDb(r);
          pm[row.productImg] = { yoycol: row.yoycol, zootop: row.zootop, teaprint: row.teaprint, printposs: row.printposs };
        });
        setProdMap(pm);
      }
      
      if (wnData) setWarehouseNotes(wnData.map(whNoteFromDb));
    } catch (err) {
      console.error("loadAllData:", err);
      toast.error("Lỗi tải dữ liệu: " + err.message);
    }
    setDataLoading(false);
  }, []);

  useEffect(() => { loadAllData(); }, [loadAllData]);

  // ── HELPER: refresh after bulk import ──
  const refreshAfterImport = loadAllData;

  // ═══════════════════════════════════════════════════════
  // ACTIONS — Every mutation saves DB first, then updates local
  // ═══════════════════════════════════════════════════════

  // ── PRODUCTS ──
  const addProduct = async (obj) => {
    const { data, error } = await supabase.from("products").insert(productToDb(obj)).select().single();
    if (error) { toast.error("Lỗi thêm SP: " + error.message); return false; }
    setProducts(prev => [...prev, productFromDb(data)]);
    toast.success("Đã thêm sản phẩm");
    return true;
  };
  const updateProduct = async (id, obj) => {
    const { data, error } = await supabase.from("products").update(productToDb(obj)).eq("id", id).select().single();
    if (error) { toast.error("Lỗi cập nhật SP: " + error.message); return false; }
    setProducts(prev => prev.map(x => x.id === id ? productFromDb(data) : x));
    toast.success("Đã lưu");
    return true;
  };
  const deleteProduct = async (id) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error("Lỗi xóa SP: " + error.message); return false; }
    setProducts(prev => prev.filter(x => x.id !== id));
    toast.success("Đã xóa");
    return true;
  };

  // ── SUPPLIERS ──
  const addSupplier = async (obj) => {
    const { data, error } = await supabase.from("suppliers").insert(supplierToDb(obj)).select().single();
    if (error) { toast.error("Lỗi thêm xưởng: " + error.message); return false; }
    setSuppliers(prev => [...prev, supplierFromDb(data)]);
    toast.success("Đã thêm xưởng");
    return true;
  };
  const updateSupplier = async (id, obj) => {
    const { data, error } = await supabase.from("suppliers").update(supplierToDb(obj)).eq("id", id).select().single();
    if (error) { toast.error("Lỗi cập nhật xưởng: " + error.message); return false; }
    setSuppliers(prev => prev.map(x => x.id === id ? supplierFromDb(data) : x));
    return true;
  };
  const deleteSupplier = async (id) => {
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) { toast.error("Lỗi xóa xưởng: " + error.message); return false; }
    setSuppliers(prev => prev.filter(x => x.id !== id));
    toast.success("Đã xóa");
    return true;
  };
  const toggleSupplierActive = async (id) => {
    const sup = suppliers.find(s => s.id === id);
    if (!sup) return false;
    return updateSupplier(id, { active: !sup.active });
  };

  // ── PRICES ──
  const addPrice = async (obj) => {
    const { data, error } = await supabase.from("prices").insert(priceToDb(obj)).select().single();
    if (error) { toast.error("Lỗi thêm giá: " + error.message); return false; }
    setPrices(prev => [...prev, priceFromDb(data)]);
    toast.success("Đã thêm giá");
    return true;
  };
  const updatePrice = async (id, obj) => {
    const { data, error } = await supabase.from("prices").update(priceToDb(obj)).eq("id", id).select().single();
    if (error) { toast.error("Lỗi cập nhật giá: " + error.message); return false; }
    setPrices(prev => prev.map(x => x.id === id ? priceFromDb(data) : x));
    return true;
  };
  const deletePrice = async (id) => {
    const { error } = await supabase.from("prices").delete().eq("id", id);
    if (error) { toast.error("Lỗi xóa giá: " + error.message); return false; }
    setPrices(prev => prev.filter(x => x.id !== id));
    toast.success("Đã xóa");
    return true;
  };
  const bulkUpsertPrices = async (rows) => {
    const dbRows = rows.map(r => priceToDb(r));
    const { error } = await supabase.from("prices").upsert(dbRows);
    if (error) { toast.error("Lỗi bulk upsert giá: " + error.message); return false; }
    await refreshAfterImport();
    toast.success("Cập nhật " + rows.length + " giá");
    return true;
  };

  // ── COMP PRICES ──
  const setCompPricesAction = async (newList) => {
    // Full replace: delete all then insert
    const { error: delErr } = await supabase.from("comp_prices").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (delErr) { toast.error("Lỗi xóa ĐT cũ: " + delErr.message); return false; }
    if (newList.length > 0) {
      const dbRows = newList.map(r => compPriceToDb(r));
      const { error } = await supabase.from("comp_prices").insert(dbRows);
      if (error) { toast.error("Lỗi import ĐT: " + error.message); return false; }
    }
    await refreshAfterImport();
    toast.success("Đã cập nhật " + newList.length + " giá đối thủ");
    return true;
  };
  const addCompPrice = async (obj) => {
    const { data, error } = await supabase.from("comp_prices").insert(compPriceToDb(obj)).select().single();
    if (error) { toast.error("Lỗi thêm ĐT: " + error.message); return false; }
    setCompPrices(prev => [...prev, compPriceFromDb(data)]);
    return true;
  };
  const updateCompPrice = async (id, obj) => {
    const { data, error } = await supabase.from("comp_prices").update(compPriceToDb(obj)).eq("id", id).select().single();
    if (error) { toast.error("Lỗi cập nhật ĐT: " + error.message); return false; }
    setCompPrices(prev => prev.map(x => x.id === id ? compPriceFromDb(data) : x));
    return true;
  };
  const deleteCompPrice = async (id) => {
    const { error } = await supabase.from("comp_prices").delete().eq("id", id);
    if (error) { toast.error("Lỗi xóa ĐT: " + error.message); return false; }
    setCompPrices(prev => prev.filter(x => x.id !== id));
    return true;
  };

  // ── PARAMS ──
  const updateParams = async (newParams) => {
    try {
      const entries = Object.entries(newParams).map(([key, value]) => ({
        key,
        value: typeof value === "object" ? value : value,
        description: "",
      }));
      const { error } = await supabase.from("params").upsert(entries);
      if (error) { toast.error("Lỗi lưu tham số: " + error.message); return false; }
      setParams(newParams);
      toast.success("Đã lưu tham số");
      return true;
    } catch (err) {
      toast.error("Lỗi: " + err.message);
      return false;
    }
  };

  // ── LABEL TIERS ──
  const updateLabelTiers = async (newTiers) => {
    const dbRows = newTiers.map((t, i) => ({
      ...(t.id ? { id: t.id } : {}),
      tier_name: t.t,
      weight_oz: t.oz,
      zone5_price: t.u,
      sort_order: i,
    }));
    const { error } = await supabase.from("label_tiers").upsert(dbRows);
    if (error) { toast.error("Lỗi lưu Label Tiers: " + error.message); return false; }
    setLabelTiers(newTiers);
    return true;
  };

  // ── LOCKED PRICES ──
  const addLockedPrice = async (product, size, value) => {
    const dbRow = { product, size, locked_value: value };
    const { error } = await supabase.from("locked_prices").upsert(dbRow, { onConflict: "product,size" });
    if (error) { toast.error("Lỗi chốt giá: " + error.message); return false; }
    setLockedPrices(prev => ({ ...prev, [product + "|||" + size]: value }));
    return true;
  };
  const removeLockedPrice = async (product, size) => {
    const { error } = await supabase.from("locked_prices").delete().eq("product", product).eq("size", size);
    if (error) { toast.error("Lỗi xóa giá chốt: " + error.message); return false; }
    setLockedPrices(prev => {
      const nw = { ...prev };
      delete nw[product + "|||" + size];
      return nw;
    });
    return true;
  };
  const updateLockedPrice = addLockedPrice; // upsert handles both
  const bulkSetLockedPrices = async (newMap) => {
    // Upsert all entries
    const rows = Object.entries(newMap).map(([k, val]) => {
      const [product, size] = k.split("|||");
      return { product, size, locked_value: val };
    });
    if (rows.length) {
      const { error } = await supabase.from("locked_prices").upsert(rows, { onConflict: "product,size" });
      if (error) { toast.error("Lỗi bulk locked: " + error.message); return false; }
    }
    setLockedPrices(newMap);
    toast.success("Đã chốt " + rows.length + " giá");
    return true;
  };
  const clearLockedPrices = async () => {
    const { error } = await supabase.from("locked_prices").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) { toast.error("Lỗi xóa: " + error.message); return false; }
    setLockedPrices({});
    toast.success("Đã xóa tất cả giá chốt");
    return true;
  };

  // ── SKU IMG ──
  const addSkuImg = async (obj) => {
    const { data, error } = await supabase.from("sku_img").insert(skuImgToDb(obj)).select().single();
    if (error) { toast.error("Lỗi thêm SKU: " + error.message); return false; }
    setSkuImg(prev => [...prev, skuImgFromDb(data)]);
    return true;
  };
  const updateSkuImg = async (id, obj) => {
    const { data, error } = await supabase.from("sku_img").update(skuImgToDb(obj)).eq("id", id).select().single();
    if (error) { toast.error("Lỗi cập nhật SKU: " + error.message); return false; }
    setSkuImg(prev => prev.map(x => x.id === id ? skuImgFromDb(data) : x));
    return true;
  };
  const deleteSkuImg = async (id) => {
    const { error } = await supabase.from("sku_img").delete().eq("id", id);
    if (error) { toast.error("Lỗi xóa SKU: " + error.message); return false; }
    setSkuImg(prev => prev.filter(x => x.id !== id));
    return true;
  };
  const bulkUpsertSkuImg = async (rows) => {
    // Deduplicate by SKU — keep last occurrence
    const byKey = {};
    rows.forEach(r => { const db = skuImgToDb(r); if (db.sku) byKey[db.sku] = db; });
    const dbRows = Object.values(byKey);
    const dupCount = rows.length - dbRows.length;
    if (!dbRows.length) { toast.error("Không có SKU hợp lệ"); return false; }
    // Batch upsert 500 rows at a time
    const BATCH = 500; let ok = 0;
    for (let i = 0; i < dbRows.length; i += BATCH) {
      const chunk = dbRows.slice(i, i + BATCH);
      const { error } = await supabase.from("sku_img").upsert(chunk, { onConflict: "sku" });
      if (error) { toast.error("Lỗi batch " + (Math.floor(i / BATCH) + 1) + ": " + error.message); return false; }
      ok += chunk.length;
    }
    await refreshAfterImport();
    toast.success("Import " + ok + " SKU" + (dupCount > 0 ? " (bỏ " + dupCount + " trùng)" : ""));
    return true;
  };

  // ── SUP STOCK ──
  const updateSupStock = async (supplierName, stockData) => {
    // Store as a single row per supplier using supplier name as sku key
    const sup = suppliers.find(s => s.name === supplierName);
    if (!sup) { toast.error("Không tìm thấy xưởng"); return false; }
    const { error } = await supabase.from("sup_stock").upsert({
      supplier_id: sup.id,
      sku: supplierName,
      stock: stockData,
    });
    if (error) { toast.error("Lỗi lưu stock: " + error.message); return false; }
    setSupStock(prev => ({ ...prev, [supplierName]: stockData }));
    return true;
  };

  // ── ROUTE CFG ──
  const updateRouteCfg = async (newCfg) => {
    const resolved = typeof newCfg === "function" ? newCfg(routeCfg) : newCfg;
    const dbRow = { id: 1, ...routeCfgToDb(resolved) };
    const { data, error } = await supabase.from("route_cfg").upsert(dbRow).select().single();
    if (error) { toast.error("Lỗi lưu Route Config: " + error.message); return false; }
    setRouteCfg(routeCfgFromDb(data));
    return true;
  };

  // ── PROD MAP ──
  const updateProdMap = async (newMap) => {
    const rows = Object.entries(newMap).map(([k, v]) => ({
      product_img: k, yoycol: v.yoycol || "", zootop: v.zootop || "",
      teaprint: v.teaprint || "", printposs: v.printposs || "",
    }));
    if (rows.length) {
      const { error } = await supabase.from("prod_map").upsert(rows, { onConflict: "product_img" });
      if (error) { toast.error("Lỗi lưu ProdMap: " + error.message); return false; }
    }
    setProdMap(newMap);
    return true;
  };

  // ── WAREHOUSE NOTES ──
  const addWhNote = async (obj) => {
    const { data, error } = await supabase.from("warehouse_notes").insert(whNoteToDb(obj)).select().single();
    if (error) { toast.error("Lỗi thêm lưu ý: " + error.message); return false; }
    setWarehouseNotes(prev => [...prev, whNoteFromDb(data)]);
    toast.success("Đã thêm lưu ý");
    return true;
  };
  const updateWhNote = async (id, obj) => {
    const { data, error } = await supabase.from("warehouse_notes").update(whNoteToDb(obj)).eq("id", id).select().single();
    if (error) { toast.error("Lỗi cập nhật lưu ý: " + error.message); return false; }
    setWarehouseNotes(prev => prev.map(x => x.id === id ? whNoteFromDb(data) : x));
    return true;
  };
  const deleteWhNote = async (id) => {
    const { error } = await supabase.from("warehouse_notes").delete().eq("id", id);
    if (error) { toast.error("Lỗi xóa lưu ý: " + error.message); return false; }
    setWarehouseNotes(prev => prev.filter(x => x.id !== id));
    toast.success("Đã xóa");
    return true;
  };

  // ═══════════════════════════════════════════════════════
  // PROVIDER VALUE — state (read-only) + actions (save DB)
  // ═══════════════════════════════════════════════════════
  return (
    <DataContext.Provider value={{
      // STATE — read only
      products, suppliers, prices, params, labelTiers, compPrices,
      lockedPrices, skuImg, supStock, routeCfg, prodMap, warehouseNotes,
      dataLoading,

      // ACTIONS — every mutation saves DB first
      loadAllData, refreshAfterImport,

      addProduct, updateProduct, deleteProduct,
      addSupplier, updateSupplier, deleteSupplier, toggleSupplierActive,
      addPrice, updatePrice, deletePrice, bulkUpsertPrices,
      setCompPrices: setCompPricesAction, addCompPrice, updateCompPrice, deleteCompPrice,
      updateParams, updateLabelTiers,
      addLockedPrice, removeLockedPrice, updateLockedPrice, bulkSetLockedPrices, clearLockedPrices,
      addSkuImg, updateSkuImg, deleteSkuImg, bulkUpsertSkuImg,
      updateSupStock, updateRouteCfg, updateProdMap,
      addWhNote, updateWhNote, deleteWhNote,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
