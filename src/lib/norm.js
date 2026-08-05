/* ═══════════════════════════════════════════════════════
   Chuẩn hoá chuỗi dùng cho so khớp — CÓ CACHE.

   Logic chuẩn hoá GIỮ NGUYÊN 100% như bản gốc trong utils.js.
   Chỗ duy nhất khác: kết quả được nhớ lại để không phải tính lại
   hàng triệu lần trên cùng một chuỗi.
   ═══════════════════════════════════════════════════════ */

const MAX_CACHE = 100000;

const _normPCache = new Map();
const _lowerTrimCache = new Map();

// Bản gốc: (s || "").toLowerCase().trim() rồi gộp khoảng trắng quanh dấu gạch,
// rồi gộp mọi khoảng trắng liên tiếp thành một dấu cách. Công thức giữ nguyên bên dưới.
//
// Với s là chuỗi, "(s || '')" và "s" cho kết quả y hệt (chuỗi rỗng vẫn ra rỗng),
// nên nhánh cache dưới đây tương đương tuyệt đối.
// Với s KHÔNG phải chuỗi, ta chạy đúng biểu thức gốc để giữ nguyên mọi hành vi
// (kể cả việc ném lỗi với các giá trị lạ).
export function normP(s) {
  if (typeof s !== "string") {
    return (s || "").toLowerCase().trim().replace(/\s*-\s*/g, "-").replace(/\s+/g, " ");
  }
  let v = _normPCache.get(s);
  if (v === undefined) {
    v = s.toLowerCase().trim().replace(/\s*-\s*/g, "-").replace(/\s+/g, " ");
    if (_normPCache.size >= MAX_CACHE) _normPCache.clear();
    _normPCache.set(s, v);
  }
  return v;
}

/* Bản gốc dùng trực tiếp: x.size.toLowerCase().trim()
   — sẽ NÉM LỖI nếu size là null/undefined.

   Ở đây trả về null cho giá trị không phải chuỗi, để bên lập chỉ mục
   bỏ qua dòng đó thay vì làm sập ứng dụng. Dòng bị bỏ qua sẽ không bao giờ
   khớp — đúng bằng "kết quả" mà bản gốc lẽ ra cho ra nếu nó không sập.
   Số dòng bị bỏ qua được đếm và báo cáo trong công cụ đối chiếu. */
export function lowerTrim(s) {
  if (typeof s !== "string") return null;
  let v = _lowerTrimCache.get(s);
  if (v === undefined) {
    v = s.toLowerCase().trim();
    if (_lowerTrimCache.size >= MAX_CACHE) _lowerTrimCache.clear();
    _lowerTrimCache.set(s, v);
  }
  return v;
}
