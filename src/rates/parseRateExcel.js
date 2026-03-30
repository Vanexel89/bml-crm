import { uid } from '../utils.js';

const VALID_POLS = ['SHANGHAI','NINGBO','QINGDAO','TIANJIN','XINGANG','YANTIAN','NANSHA','XIAMEN','SHEKOU','RIZHAO','DALIAN','TAICANG','BUSAN','LAEM CHA BANG','PORT KLANG'];
export const isPol = s => { const u = (s||"").toUpperCase(); return VALID_POLS.some(p => u.includes(p)) || /^[A-Z]{3,}/.test(u.replace(/[^A-Z ]/g,'')); };
export const num = v => { const n = Number(v); return isNaN(n) ? 0 : Math.round(n * 100) / 100; };
export const parseRange = s => { if (!s) return 0; const m = String(s).match(/(\d+)\s*[-–]\s*(\d+)/); if (m) return Math.round((parseInt(m[1])+parseInt(m[2]))/2); return num(s); };
export const normCity = c => { if (!c) return ""; const u = c.toUpperCase().trim(); const map = {"MOSCOW":"Москва","ST-PETERSBURG":"Санкт-Петербург","EKATERINBURG":"Екатеринбург","NOVOSIBIRSK":"Новосибирск","KRASNOYARSK":"Красноярск","VLADIVOSTOK":"Владивосток","NAHODKA":"Находка","VLADIVOSTOK/VRANGEL":"Владивосток","ROSTOV-ON-DON":"Ростов-на-Дону","IRKUTZK":"Иркутск","KAZAN":"Казань","PENZA":"Пенза","NIZHNY NOVGOROD":"Нижний Новгород","CHELYABINSK":"Челябинск","TOGLIATTI":"Тольятти","KHABAROVSK":"Хабаровск"}; return map[u] || c.trim(); };
export const normPol = p => { if (!p) return ""; let u = p.toUpperCase().trim(); if (u.includes("XINGANG")) return "TIANJIN (XINGANG)"; return u; };
export const dateStr = v => { if (!v) return ""; if (typeof v === 'number' && v > 40000 && v < 60000) { const d = new Date((v - 25569) * 86400000); return d.toISOString().split("T")[0]; } if (v instanceof Date || (typeof v === 'object' && v.getTime)) return v.toISOString().split("T")[0]; const s = String(v); const m = s.match(/(\d{4})-(\d{2})-(\d{2})/); if (m) return m[0]; const m2 = s.match(/(\d{2})\.(\d{2})\.(\d{4})/); if (m2) return `${m2[3]}-${m2[2]}-${m2[1]}`; return s; };

export function parseValidity(s) {
  if (!s) return null;
  const str = String(s).trim();
  const dateMatches = [...str.matchAll(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/g)];
  if (dateMatches.length === 0) return null;
  const toIso = (m) => {
    let y = parseInt(m[3]); if (y < 100) y += 2000;
    const mm = m[2].padStart(2, "0"); const dd = m[1].padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  };
  const from = toIso(dateMatches[0]);
  const to = dateMatches.length >= 2 ? toIso(dateMatches[1]) : null;
  return { from, to };
}

export function dateInRange(dateIso, validity) {
  if (!dateIso || !validity) return true;
  const d = dateIso.slice(0, 10);
  if (validity.from && d < validity.from) return false;
  if (validity.to && d > validity.to) return false;
  return true;
}

export function parseRateExcel(wb, XLSX) {
  const findSheet = (keyword) => {
    const name = wb.SheetNames.find(n => n.toLowerCase().includes(keyword.toLowerCase()));
    if (!name) return [];
    const ws = wb.Sheets[name];
    if (!ws) return [];
    const allRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: true });
    const hiddenRows = ws['!rows'] || [];
    return allRows.filter((_, i) => !hiddenRows[i]?.hidden);
  };

  // 1. FREIGHT
  const fr = findSheet('Фрахт');
  const freight = [];
  for (let i = 2; i < fr.length; i++) {
    const r = fr[i]; if (!r || !r[0]) continue;
    const service = String(r[0]||"").trim();
    const line = String(r[2]||"").trim();
    const polRaw = String(r[3]||"").trim();
    if (!polRaw || !isPol(polRaw)) continue;
    const pols = polRaw.includes(",") ? polRaw.split(",").map(s=>s.trim()).filter(Boolean) : [polRaw];
    const soc20 = num(r[9]); const soc40 = num(r[10]);
    const coc20 = num(r[11]); const coc40 = num(r[12]);
    const transship = String(r[13]||"").trim();
    const terminalName = String(r[14]||"").trim();
    const departure = dateStr(r[15]);
    const validity = String(r[16]||"").trim();
    const comment = String(r[17]||"").trim();
    const hasSoc = soc20 > 0 || soc40 > 0;
    const hasCoc = coc20 > 0 || coc40 > 0;
    if (!hasSoc && !hasCoc) continue;
    pols.forEach(pol => {
      freight.push({ id: uid(), service, line, pol: normPol(pol), soc20, soc40, coc20, coc40, transship, terminal: terminalName, departure, validity, comment, hasSoc, hasCoc });
    });
  }

  // 2. BOXES
  const bx = findSheet('Ящик');
  const boxes = [];
  for (let i = 1; i < bx.length; i++) {
    const r = bx[i]; if (!r || !r[0]) continue;
    boxes.push({ pol: normPol(String(r[0]||"")), city: normCity(String(r[1]||"")), p20: parseRange(r[3]), p40: parseRange(r[4]), freeTime: String(r[5]||""), penalty: String(r[6]||"") });
  }

  // 3. DROPS
  const dr = findSheet('Дроп');
  const drops = [];
  for (let i = 1; i < dr.length; i++) {
    const r = dr[i]; if (!r || !r[2]) continue;
    const city = normCity(String(r[2]||""));
    if (!city || city.includes("Город") || city.includes("Регион")) continue;
    const p20raw = r[7] !== null && r[7] !== undefined ? r[7] : r[4];
    const p40raw = r[8] !== null && r[8] !== undefined ? r[8] : r[5];
    const p20 = typeof p20raw === 'string' && p20raw.includes('запрос') ? -1 : num(p20raw);
    const p40 = typeof p40raw === 'string' && p40raw.includes('запрос') ? -1 : num(p40raw);
    drops.push({ sc: String(r[0]||"").trim(), line: String(r[1]||"").trim(), city, owner: String(r[3]||"").trim(), p20, p40, freeTime: String(r[9]||""), penalty: String(r[10]||""), validity: String(r[11]||"") });
  }

  // 4. RAILWAY
  const rw = findSheet('ЖД тариф');
  const railway = [];
  for (let i = 2; i < rw.length; i++) {
    const r = rw[i]; if (!r || !r[1]) continue;
    const city = String(r[3]||"").trim();
    if (!city) continue;
    railway.push({
      serviceType: String(r[0]||"").trim(), terminal: String(r[1]||"").trim(),
      dispatch: String(r[2]||"").trim(), city: city,
      stationFrom: String(r[4]||"").trim(), stationTo: String(r[5]||"").trim(),
      schedule: String(r[6]||"").trim(),
      p20base: num(r[7]), p20_24t: num(r[8]), p20_28t: num(r[9]),
      p40base: num(r[10]), p40_28t: num(r[11]),
      nds: num(r[12]), guard20: num(r[13]), guard40: num(r[14]), guardNds: num(r[15]),
      validity: String(r[16]||"").trim(), wagonType: String(r[17]||"").trim(), note: String(r[18]||"").trim()
    });
  }

  // 5. AUTO MSK
  const au = findSheet('Мск авто');
  const autoMsk = [];
  let curStation = "";
  for (let i = 0; i < au.length; i++) {
    const r = au[i]; if (!r) continue;
    const v = String(r[0]||"").trim();
    if (v.startsWith("ст.")) { curStation = v; continue; }
    if (v.includes("Комплексная") && !v.includes("ВТТ") && curStation) {
      autoMsk.push({ station: curStation, p20: num(r[1]), p40: num(r[2]) });
    }
  }

  return { freight, boxes, drops, railway, autoMsk };
}
