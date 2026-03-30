export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const today = () => new Date().toISOString().split("T")[0];
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().split("T")[0]; };
export const fmt = d => { if (!d) return "—"; const dt = new Date(d); if (isNaN(dt.getTime())) return String(d).slice(0, 12); return dt.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }); };
export const fmtFull = d => { if (!d) return "—"; const dt = new Date(d); if (isNaN(dt.getTime())) return String(d).slice(0, 20); return dt.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }); };
export const weekAgo = () => addDays(today(), -7);
export const fmtUsd = v => { const n = Math.round(Number(v) * 100) / 100; return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, ""); };

export function calcGrade(v) {
  const vol = v.volume_monthly || 0;
  const rm = v.routes_match || "unknown";
  const pt = v.payment_terms || "unknown";
  if (vol >= 3 && rm !== "no" && pt !== "deferred") return "A";
  if (vol >= 1 && rm !== "no") return "B";
  return "C";
}

export function parseVolume(str) { if (!str) return 0; const m = String(str).match(/(\d+)/); return m ? parseInt(m[1]) : 0; }

export function downloadCSV(csv, fn) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = fn; a.click();
  URL.revokeObjectURL(url);
}
