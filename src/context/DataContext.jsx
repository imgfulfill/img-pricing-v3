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
  const [dataLoading, setDataLoading] = useState(true);       // chưa có dữ liệu nền → chặn khung giao diện
  const [heavyLoading, setHeavyLoading] = useState(true);     // các bảng lớn còn đang tải
  const [loadProgress, setLoadProgress] = useState({ done: 0, total: 12 });

  // ═══════════════════════════════════════════════════════
  // TẢI DỮ LIỆU
  //
  // QUAN TRỌNG: phải luôn có cột sắp xếp và cột cuối cùng phải là duy nhất (id).
  // Phân trang bằng .range() mà không sắp xếp cố định thì PostgreSQL không đảm bảo
  // thứ tự giữa các trang → có thể lấy trùng dòng hoặc bỏ sót dòng, và thứ tự mảng
  // đổi sau mỗi lần sửa dữ liệu (khiến kết quả "khớp đầu tiên thắng" không ổn định).
  // ═══════════════════════════════════════════════════════

  const PAGE = 1000;
  const MAX_SONG_SONG = 8;   // số yêu cầu chạy cùng lúc — vừa nhanh vừa nhẹ cho Supabase free

  const fetchPage = async (table, orderCols, from) => {
    let q = supabase.from(table).select("*").range(from, from + PAGE - 1);
    for (const c of orderCols) q = q.order(c);
    const { data, error } = await q;
    if (error) throw new Error(table + ": " + error.message);
    return data || [];
  };

  // Cách cũ: xin trang 1, chờ xong mới xin trang 2... 14.000 dòng = 15 lượt nối đuôi.
  const fetchAllTuanTu = async (table, orderCols) => {
    let all = [], from = 0;
    for (;;) {
      const d = await fetchPage(table, orderCols, from);
      if (!d.length) break;
      all = all.concat(d);
      if (d.length < PAGE) break;
      from += PAGE;
    }
    return all;
  };

  // Cách mới: hỏi tổng số dòng trước, rồi xin tất cả các trang CÙNG LÚC (tối đa 8 luồng).
  const fetchAll = async (table, ...orderCols) => {
    try {
      const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
      if (error || count == null) return await fetchAllTuanTu(table, orderCols);   // không đếm được → quay về cách cũ
      if (count === 0) return [];

      const offsets = [];
      for (let f = 0; f < count; f += PAGE) offsets.push(f);

      const pages = new Array(offsets.length);
      let next = 0;
      const worker = async () => {
        for (;;) {
          const i = next++;
          if (i >= offsets.length) return;
          pages[i] = await fetchPage(table, orderCols, offsets[i]);
        }
      };
      await Promise.all(Array.from({ length: Math.min(MAX_SONG_SONG, offsets.length) }, worker));

      const all = pages.flat();

      // Nếu có ai đó chèn thêm dòng trong lúc đang tải thì trang cuối sẽ đầy —
      // khi đó lấy nốt phần dư. Bình thường trang cuối không đầy nên không tốn thêm lượt nào.
      const last = pages[pages.length - 1] || [];
      if (last.length === PAGE) {
        let from = offsets.length * PAGE;
        for (;;) {
          const d = await fetchPage(table, orderCols, from);
          if (!d.length) break;
          all.push(...d);
          if (d.length < PAGE) break;
          from += PAGE;
        }
      }
      return all;
    } catch (e) {
      console.error("fetchAll " + table + ":", e);
      return await fetchAllTuanTu(table, orderCols);
    }
  };

  // ── Áp dữ liệu thô vào state — tách riêng để tải lại TỪNG BẢNG cũng dùng được ──
  const applyProducts = (rows) => setProducts((rows || []).map(productFromDb));
  const applyPrices = (rows) => setPrices((rows || []).map(priceFromDb));
  const applyCompPrices = (rows) => setCompPrices((rows || []).map(compPriceFromDb));
  const applySkuImg = (rows) => setSkuImg((rows || []).map(skuImgFromDb));
  const applySuppliers = (rows) => setSuppliers((rows || []).map(supplierFromDb));
  const applyLabelTiers = (rows) => setLabelTiers((rows || []).map(labelTierFromDb));
  const applyWhNotes = (rows) => setWarehouseNotes((rows || []).map(whNoteFromDb));

  const applyParams = (rows) => {
    if (!rows?.length) return;
    const p = { ...DEF_PARAMS };
    rows.forEach(r => {
      if (r.key === "categoryShip") {
        try { p.categoryShip = typeof r.value === "string" ? JSON.parse(r.value) : r.value } catch (e) { /* keep default */ }
      } else if (r.key && r.value != null) {
        p[r.key] = typeof r.value === "object" ? r.value : Number(r.value) || 0;
      }
    });
    setParams(p);
  };
  const applyLocked = (rows) => {
    const lk = {};
    (rows || []).forEach(r => { const row = lockedPriceFromDb(r); lk[row.product + "|||" + row.size] = row.lockedValue });
    setLockedPrices(lk);
  };
  const applySupStock = (rows) => {
    const ss = {};
    (rows || []).forEach(r => {
      const row = supStockFromDb(r);
      if (!ss[row.sku]) ss[row.sku] = {};
      Object.assign(ss[row.sku], row.stock || {});
    });
    setSupStock(ss);
  };
  const applyProdMap = (rows) => {
    const pm = {};
    (rows || []).forEach(r => {
      const row = prodMapFromDb(r);
      pm[row.productImg] = { yoycol: row.yoycol, zootop: row.zootop, teaprint: row.teaprint, printposs: row.printposs };
    });
    setProdMap(pm);
  };

  // Bảng LỚN — phải phân trang. Bảng NHỎ — một lượt là xong.
  const BANG_LON = {
    products: () => fetchAll("products", "product", "id"),   // "product" giữ thứ tự hiển thị, "id" là chốt duy nhất
    prices: () => fetchAll("prices", "id"),
    comp_prices: () => fetchAll("comp_prices", "id"),
    sku_img: () => fetchAll("sku_img", "id"),
  };
  const AP_DUNG = {
    products: applyProducts, prices: applyPrices, comp_prices: applyCompPrices, sku_img: applySkuImg,
  };

  // ── LOAD ALL DATA ──
  const loadAllData = useCallback(async () => {
    setDataLoading(true); setHeavyLoading(true);
    let done = 0; const total = 12;
    setLoadProgress({ done: 0, total });
    const tick = () => setLoadProgress({ done: ++done, total });

    // NHÓM NHỎ — đủ để dựng giao diện
    const nhomNho = (async () => {
      const [sup, prm, lt, lp, ss, rc, pm, wn] = await Promise.all([
        supabase.from("suppliers").select("*").then(r => (tick(), r)),
        supabase.from("params").select("*").then(r => (tick(), r)),
        supabase.from("label_tiers").select("*").order("sort_order").then(r => (tick(), r)),
        supabase.from("locked_prices").select("*").then(r => (tick(), r)),
        supabase.from("sup_stock").select("*").then(r => (tick(), r)),
        supabase.from("route_cfg").select("*").limit(1).then(r => (tick(), r)),
        supabase.from("prod_map").select("*").then(r => (tick(), r)),
        supabase.from("warehouse_notes").select("*").then(r => (tick(), r)),
      ]);
      applySuppliers(sup.data); applyParams(prm.data); applyLabelTiers(lt.data);
      applyLocked(lp.data); applySupStock(ss.data);
      if (rc.data?.length) setRouteCfg(routeCfgFromDb(rc.data[0]));
      applyProdMap(pm.data); applyWhNotes(wn.data);
    })();

    // NHÓM LỚN — trước đây phải CHỜ nhóm nhỏ xong mới được bắt đầu. Nay chạy song song.
    const nhomLon = (async () => {
      const [prod, price, cp, si] = await Promise.all([
        BANG_LON.products().then(r => (tick(), r)),
        BANG_LON.prices().then(r => (tick(), r)),
        BANG_LON.comp_prices().then(r => (tick(), r)),
        BANG_LON.sku_img().then(r => (tick(), r)),
      ]);
      applyProducts(prod); applyPrices(price); applyCompPrices(cp); applySkuImg(si);
    })();

    const bao = (err) => { console.error("loadAllData:", err); toast.error("Lỗi tải dữ liệu: " + (err?.message || err)) };
    const pNho = nhomNho.catch(bao);
    const pLon = nhomLon.catch(bao);

    await pNho;
    setDataLoading(false);     // mở khoá khung giao diện ngay khi có dữ liệu nền
    await pLon;
    setHeavyLoading(false);
  }, []);

  useEffect(() => { loadAllData(); }, [loadAllData]);

  // ── Tải lại ĐÚNG bảng vừa thay đổi, thay vì tải lại toàn bộ 12 bảng ──
  const reloadTables = useCallback(async (...names) => {
    try {
      await Promise.all(names.map(async (n) => {
        const rows = await BANG_LON[n]();
        AP_DUNG[n](rows);
      }));
    } catch (err) {
      console.error("reloadTables:", err);
      toast.error("Lỗi tải lại dữ liệu: " + (err?.message || err));
    }
  }, []);

  // Giữ tên cũ cho tương thích: tải lại toàn bộ
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

  // Sửa hàng loạt: gộp thành MỘT lệnh ghi thay vì gọi máy chủ từng dòng.
  // rows = danh sách sản phẩm ĐẦY ĐỦ (đã sửa sẵn trường cần đổi), bắt buộc có id.
  const bulkUpdateProducts = async (rows) => {
    const dbRows = rows.filter(r => r?.id).map(r => ({ id: r.id, ...productToDb(r) }));
    if (!dbRows.length) return false;
    const CH = 500;
    for (let i = 0; i < dbRows.length; i += CH) {
      const { error } = await supabase.from("products").upsert(dbRows.slice(i, i + CH));
      if (error) { toast.error("Lỗi sửa hàng loạt SP: " + error.message); return false; }
    }
    await reloadTables("products");
    toast.success("Đã sửa " + dbRows.length + " sản phẩm");
    return true;
  };
  const bulkDeleteProducts = async (ids) => {
    if (!ids?.length) return false;
    const CH = 200;
    for (let i = 0; i < ids.length; i += CH) {
      const { error } = await supabase.from("products").delete().in("id", ids.slice(i, i + CH));
      if (error) { toast.error("Lỗi xóa SP: " + error.message); return false; }
    }
    const idSet = new Set(ids);
    setProducts(prev => prev.filter(x => !idSet.has(x.id)));
    toast.success("Đã xóa " + ids.length + " sản phẩm");
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
  const bulkDeletePrices = async (ids) => {
    if (!ids?.length) return false;
    const CH = 200;
    for (let i = 0; i < ids.length; i += CH) {
      const chunk = ids.slice(i, i + CH);
      const { error } = await supabase.from("prices").delete().in("id", chunk);
      if (error) { toast.error("Lỗi xóa giá: " + error.message); return false; }
    }
    const idSet = new Set(ids);
    setPrices(prev => prev.filter(x => !idSet.has(x.id)));
    toast.success("Đã xóa " + ids.length + " giá");
    return true;
  };
  const bulkUpsertPrices = async (rows) => {
    const dbRows = rows.map(r => priceToDb(r));
    const { error } = await supabase.from("prices").upsert(dbRows);
    if (error) { toast.error("Lỗi bulk upsert giá: " + error.message); return false; }
    await reloadTables("prices");
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
    await reloadTables("comp_prices");
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
  const bulkDeleteSkuImg = async (ids) => {
    if (!ids?.length) return false;
    const CH = 200;
    for (let i = 0; i < ids.length; i += CH) {
      const chunk = ids.slice(i, i + CH);
      const { error } = await supabase.from("sku_img").delete().in("id", chunk);
      if (error) { toast.error("Lỗi xóa SKU: " + error.message); return false; }
    }
    const idSet = new Set(ids);
    setSkuImg(prev => prev.filter(x => !idSet.has(x.id)));
    toast.success("Đã xóa " + ids.length + " SKU");
    return true;
  };
  const clearAllSkuImg = async () => {
    const { error } = await supabase.from("sku_img").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) { toast.error("Lỗi xóa toàn bộ SKU: " + error.message); return false; }
    setSkuImg([]);
    toast.success("Đã xóa toàn bộ SKU IMG");
    return true;
  };
  // Sửa hàng loạt SKU IMG — gộp một lệnh, KHÔNG tải lại toàn bộ bảng.
  const bulkUpdateSkuImg = async (rows) => {
    const dbRows = rows.filter(r => r?.id).map(r => ({ id: r.id, ...skuImgToDb(r) }));
    if (!dbRows.length) return false;
    const CH = 500;
    for (let i = 0; i < dbRows.length; i += CH) {
      const { error } = await supabase.from("sku_img").upsert(dbRows.slice(i, i + CH));
      if (error) { toast.error("Lỗi sửa hàng loạt SKU: " + error.message); return false; }
    }
    await reloadTables("sku_img");
    toast.success("Đã sửa " + dbRows.length + " SKU");
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
    await reloadTables("sku_img");
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
      dataLoading, heavyLoading, loadProgress,

      // ACTIONS — every mutation saves DB first
      loadAllData, refreshAfterImport, reloadTables,

      addProduct, updateProduct, deleteProduct, bulkUpdateProducts, bulkDeleteProducts,
      addSupplier, updateSupplier, deleteSupplier, toggleSupplierActive,
      addPrice, updatePrice, deletePrice, bulkDeletePrices, bulkUpsertPrices,
      setCompPrices: setCompPricesAction, addCompPrice, updateCompPrice, deleteCompPrice,
      updateParams, updateLabelTiers,
      addLockedPrice, removeLockedPrice, updateLockedPrice, bulkSetLockedPrices, clearLockedPrices,
      addSkuImg, updateSkuImg, deleteSkuImg, bulkDeleteSkuImg, clearAllSkuImg, bulkUpsertSkuImg, bulkUpdateSkuImg,
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
