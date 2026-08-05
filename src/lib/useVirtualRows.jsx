/* ═══════════════════════════════════════════════════════
   CUỘN ẢO — chỉ vẽ những dòng đang nằm trong tầm nhìn.

   Ý tưởng: bảng 14.000 dòng thì màn hình chỉ thấy được ~25 dòng.
   Vẽ cả 14.000 dòng là lãng phí. Ta chỉ vẽ ~50 dòng quanh vị trí đang xem,
   rồi chèn hai dòng đệm rỗng ở trên và dưới để thanh cuộn vẫn dài đúng như thật.
   Người dùng cuộn và tìm kiếm y như cũ, không thấy khác biệt gì.

   Không cần cài thêm thư viện nào.

   ĐIỀU KIỆN: mọi dòng phải CÙNG CHIỀU CAO (rowHeight). Vì thế các bảng dùng
   cuộn ảo phải gắn class "vrow" cho <tr> — class này ép chiều cao cố định
   (xem phần css trong lib/utils.js).
   ═══════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from "react";

export const ROW_H = 30;          // chiều cao một dòng, khớp với .vrow trong css (30px)
const OVERSCAN = 10;              // vẽ dư ít dòng trên/dưới để cuộn nhanh không bị trắng

export function useVirtualRows(total, rowHeight = ROW_H) {
  const ref = useRef(null);
  const [range, setRange] = useState({ start: 0, end: Math.min(total, 60) });

  const recalc = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const h = el.clientHeight || 400;
    const start = Math.max(0, Math.floor(el.scrollTop / rowHeight) - OVERSCAN);
    const end = Math.min(total, Math.ceil((el.scrollTop + h) / rowHeight) + OVERSCAN);
    setRange(r => (r.start === start && r.end === end) ? r : { start, end });
  }, [total, rowHeight]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    recalc();
    el.addEventListener("scroll", recalc, { passive: true });
    let ro;
    if (typeof ResizeObserver !== "undefined") { ro = new ResizeObserver(recalc); ro.observe(el) }
    return () => { el.removeEventListener("scroll", recalc); ro?.disconnect() };
  }, [recalc]);

  // Đổi bộ lọc → danh sách ngắn lại → cuộn về đầu cho khỏi lơ lửng giữa khoảng trống
  useEffect(() => {
    const el = ref.current;
    if (el && el.scrollTop > total * rowHeight) el.scrollTop = 0;
    recalc();
  }, [total, rowHeight, recalc]);

  const { start, end } = range;
  return {
    ref, start, end,
    padTop: start * rowHeight,
    padBottom: Math.max(0, (total - end) * rowHeight),
  };
}

/* Hai dòng đệm giữ cho thanh cuộn dài đúng bằng số dòng thật */
export function Spacer({ h, cols }) {
  if (!h) return null;
  return <tr style={{ height: h }} aria-hidden="true"><td colSpan={cols} style={{ padding: 0, border: 0 }} /></tr>;
}
