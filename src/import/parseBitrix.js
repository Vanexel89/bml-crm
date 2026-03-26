import { parseVolume, calcGrade } from '../utils.js';

export function parseBitrixRoutes(portStr, destStr) {
  const routes = [];
  if (!portStr && !destStr) return routes;
  const dests = destStr ? destStr.split(",").map(s => s.trim()).filter(Boolean) : [""];

  if (portStr) {
    const normalized = String(portStr).replace(/[\t\r\n]/g, " ").replace(/\s+/g, " ").trim();
    const entries = [];

    const regex1 = /([A-Za-zА-Яа-яёЁ][A-Za-zА-Яа-яёЁ\s\-()]*?)\s*,\s*[A-Z]{2}\s+(\d{2})/gi;
    let m;
    while ((m = regex1.exec(normalized)) !== null) {
      entries.push({ port: m[1].trim(), ctype: m[2].includes("40") ? "40HC" : "20'" });
    }

    if (entries.length === 0) {
      const regex2 = /([A-Za-zА-Яа-яёЁ][A-Za-zА-Яа-яёЁ\s\-()]*?)\s+(\d{2})\b/gi;
      while ((m = regex2.exec(normalized)) !== null) {
        const port = m[1].replace(/\s*,?\s*[A-Z]{2}$/i, "").trim();
        if (port.length >= 3) entries.push({ port, ctype: m[2].includes("40") ? "40HC" : "20'" });
      }
    }

    if (entries.length === 0) {
      normalized.split(",").map(s => s.trim()).filter(Boolean).forEach(p => {
        const clean = p.replace(/\s*,?\s*[A-Z]{2}$/i, "").replace(/\s+\d{2}['']?\w*$/, "").trim();
        if (clean.length >= 2) entries.push({ port: clean, ctype: "40HC" });
      });
    }

    const normPort = p => { if (!p) return ""; let u = p.toUpperCase().trim(); if (u.includes("XINGANG")) return "TIANJIN (XINGANG)"; return u; };
    entries.forEach(e => {
      const upperPort = normPort(e.port);
      dests.forEach(d => routes.push({ port: upperPort, city: d, ctype: e.ctype, weight_kg: "" }));
    });
  } else {
    dests.forEach(d => routes.push({ port: "", city: d, ctype: "40HC", weight_kg: "" }));
  }

  const seen = new Set();
  return routes.filter(r => { const k = `${r.port.toUpperCase()}|${r.city}|${r.ctype}`; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 20);
}

export function parseBitrixLeads(rows) {
  const s = v => v == null ? "" : String(v);
  return rows.map(r => {
    const name = s(r["Название лида"] || r["Название компании"]);
    if (!name || !name.trim()) return null;
    const vol = parseVolume(r["Количество ктк в месяц NEW"] || r["Кол-во ктк"]);
    const allPhones = s(r["Рабочий телефон"]).split(",").map(x => x.trim()).filter(Boolean);
    const mobilePhones = s(r["Мобильный телефон"]).split(",").map(x => x.trim()).filter(Boolean);
    const phones = [...allPhones, ...mobilePhones].slice(0, 5);
    const workEmails = s(r["Рабочий e-mail"]).split(",").map(x => x.trim()).filter(Boolean);
    const privEmails = s(r["Частный e-mail"]).split(",").map(x => x.trim()).filter(Boolean);
    const emails = [...workEmails, ...privEmails].slice(0, 5);
    const inn = r["ИНН"] ? String(r["ИНН"]).replace(/\.0$/, "").trim() : "";
    const contactName = [r["Имя"], r["Фамилия"]].filter(x => x && String(x).trim()).join(" ").trim();
    const dest = s(r["Пункт назначения NEW"]);
    const origin = s(r["Порт отправления NEW"]);
    const routes = parseBitrixRoutes(origin, dest);
    const source = s(r["Источник"]);
    const comment = s(r["Комментарий"]);
    const objections = s(r["Возражения"]);
    const website = s(r["Корпоративный сайт"]).split(",")[0].trim();
    const cleanName = name.replace(/^(ООО|АО|ЗАО|ПАО|ИП)\s*/i, "").replace(/"/g, "").trim();
    const hasOurDest = dest.toLowerCase().includes("москва") || dest.toLowerCase().includes("петербург");
    return {
      company_name: cleanName || name, company_name_full: name, inn, volume_monthly: vol,
      routes_match: dest ? (hasOurDest ? "yes" : "partial") : "unknown",
      payment_terms: "unknown",
      contact_name: contactName,
      phones_raw: phones, emails_raw: emails,
      phones_contact: [], emails_kp: [],
      website, routes,
      source: source.toLowerCase().includes("глобус") || source.toLowerCase().includes("globus") ? "exhibition" : source.toLowerCase().includes("повтор") ? "repeat" : "cold",
      source_detail: source, comment, objections,
    };
  }).filter(Boolean);
}

export function mapBitrixDealToLeadStatus(stage) {
  const s = (stage || "").toLowerCase();
  if (s.includes("целевой")) return "qualified";
  if (s.includes("информир")) return "proposal_sent";
  if (s.includes("перегов")) return "negotiation";
  if (s.includes("выигр") || s.includes("привлеч")) return "won";
  if (s.includes("проигр")) return "lost";
  return "qualified";
}

export function parseBitrixDeals(rows) {
  const s = v => v == null ? "" : String(v);
  return rows.map(r => {
    const name = s(r["Название сделки"] || r["Компания"]); if (!name.trim()) return null;
    const company = s(r["Компания"] || r["Название сделки"]);
    const inn = r["ИНН"] ? String(r["ИНН"]).replace(/\.0$/, "").trim() : "";
    const vol = parseVolume(r["Количество ктк в месяц NEW"]);
    const cN = s(r["Контакт"]) || [s(r["Контакт: Имя"]), s(r["Контакт: Фамилия"])].filter(x=>x.trim()).join(" ");
    const dest = s(r["Пункт назначения NEW"]); const origin = s(r["Порт отправления NEW"]);
    const routes = parseBitrixRoutes(origin, dest);
    const cE = s(r["Контакт: Рабочий e-mail"]).split(",").map(x=>x.trim()).filter(Boolean);
    const coE = s(r["Компания: Рабочий e-mail"]).split(",").map(x=>x.trim()).filter(Boolean);
    const emails = [...cE,...coE].filter((v,i,a)=>a.indexOf(v)===i).slice(0,5);
    const cP = s(r["Контакт: Рабочий телефон"]).split(",").map(x=>x.trim()).filter(Boolean);
    const coP = s(r["Компания: Рабочий телефон"]).split(",").map(x=>x.trim()).filter(Boolean);
    const phones = [...cP,...coP].filter((v,i,a)=>a.indexOf(v)===i).slice(0,5);
    const website = s(r["Компания: Корпоративный сайт"]).split(",")[0].trim();
    const cleanName = company.replace(/^(ООО|АО|ЗАО|ПАО|ИП)\s*/i,"").replace(/"/g,"").trim();
    const hasOurDest = dest.toLowerCase().includes("москва") || dest.toLowerCase().includes("петербург");
    const stage = s(r["Стадия сделки"]);
    return {
      company_name: cleanName||name, company_name_full: company, inn, volume_monthly: vol,
      routes_match: dest?(hasOurDest?"yes":"partial"):"unknown", payment_terms: "unknown",
      contact_name: cN, phones_raw: phones, emails_raw: emails, phones_contact: [], emails_kp: [],
      website, routes, source: "bitrix_deal", source_detail: "Сделка: "+stage,
      comment: s(r["Комментарий"]||r["Коментарий БМЛ"]||""), objections: s(r["Возражения"]),
      goods: s(r["Товар БМЛ"]||r["Груз"]||""), transport_type: s(r["Тип перевозок"]),
      bitrix_stage: stage, bitrix_id: r["ID"]?String(r["ID"]):"",
      _importedStatus: mapBitrixDealToLeadStatus(stage),
    };
  }).filter(Boolean);
}

export function exportLeadsCSV(leads) {
  const rows = [["Название лида","ИНН","Стадия","Рабочий телефон","Рабочий e-mail","Количество ктк в месяц NEW","Пункт назначения NEW","Порт отправления NEW","Источник","Комментарий","Возражения"]];
  leads.forEach(l => { rows.push([l.company_name_full||l.company_name, l.inn||"", "Квалификация", (l.phones_raw||l.phones_contact||[]).join(", "), (l.emails_raw||l.emails_kp||[]).join(", "), l.volume_monthly||"", l.routes?.map(r=>r.city).filter(Boolean).join(", ")||"", l.routes?.map(r=>`${r.port} ,CN\t${r.ctype?.includes("20")?"20":"40"}`).join(", ")||"", l.source_detail||"", l.comment||"", l.objections||""]); });
  return rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
}

export function exportDealsCSV(leads) {
  const m = { new:"Целевой", contact:"Целевой", qualified:"Целевой", proposal_sent:"Информированный", negotiation:"Информированный", won:"Привлечённый", lost:"Проигранная", frozen:"Целевой" };
  const rows = [["Название сделки","ИНН","Стадия сделки","Контакт","Количество ктк в месяц NEW","Пункт назначения NEW","Порт отправления NEW","Тип перевозок","Комментарий","Возражения"]];
  leads.forEach(l => { rows.push([l.company_name_full||l.company_name, l.inn||"", m[l.status]||"Целевой", l.contact_name||"", l.volume_monthly||"", l.routes?.map(r=>r.city).filter(Boolean).join(", ")||"", l.routes?.map(r=>`${r.port} ,CN\t${r.ctype?.includes("20")?"20":"40"}`).join(", ")||"", l.transport_type||"Море+жд", l.comment||"", l.objections||""]); });
  return rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
}
