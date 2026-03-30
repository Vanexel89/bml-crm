import { uid } from '../utils.js';

const fmtDateDDMM = d => { if (!d) return "под запрос"; const dt = new Date(d); if (isNaN(dt.getTime())) return d; return String(dt.getDate()).padStart(2,"0") + "." + String(dt.getMonth()+1).padStart(2,"0"); };

export const roundRub = v => Math.ceil(v / 1000) * 1000;
export const roundUsd = v => Math.ceil(v / 50) * 50;

export const EMPTY_VARIANT = () => ({
  id: uid(),
  ctype: "20DC",
  incoterms: "FOB",
  port: "",
  freight_base: "",
  freight_rub: "",
  isRubFreight: false,
  freight_margin: "100",
  railway_dest: "",
  railway_base: "",
  railway_margin: "10000",
  security: "5932",
  security_on: false,
  truck_on: false,
  truck_city: "",
  truck_km_mkad: "",
  truck_price: "",
  weight_kg: "",
  weight_surcharge: 0,
  departure_date: "",
});

export function formatKPVariant(v, idx, showDep, usdRate) {
  const lines = [];
  const marginUsd = Number(v.freight_margin || 0);
  const ws = Number(v.weight_surcharge || 0);
  const freightTotal = roundUsd(Number(v.freight_base || 0) + marginUsd + ws);
  const railTotal = roundRub(Number(v.railway_base || 0) + Number(v.railway_margin || 0));
  let n = 1;
  if (v.isRubFreight) {
    const rate = usdRate || 90;
    const freightRubVal = roundRub(Number(v.freight_rub || 0) + (marginUsd + ws) * rate);
    if (freightRubVal > 0) {
      lines.push(`${n}) Фрахт ${v.ctype} ${v.port}: ${freightRubVal.toLocaleString("ru-RU")} ₽`);
      n++;
    }
    if (v.railway_dest) {
      lines.push(`${n}) Ж.д., перевозка - ${v.railway_dest}: ${railTotal.toLocaleString("ru-RU")} ₽`);
      n++;
    }
  } else {
    lines.push(`${n}) Фрахт ${v.ctype} ${v.incoterms} ${v.port}: $${freightTotal}`);
    n++;
    if (v.railway_dest) {
      lines.push(`${n}) Ж.д., перевозка ВМТП - ${v.railway_dest}: ${railTotal.toLocaleString("ru-RU")} ₽`);
      n++;
    }
  }
  if (v.security_on) {
    lines.push(`${n}) Охрана РЖД (при необходимости): ${Number(v.security || 0).toLocaleString("ru-RU")} ₽`);
    n++;
  }
  if (v.truck_on && v.truck_city) {
    const kmNote = v.truck_km_mkad ? `, пробег за МКАД ${v.truck_km_mkad} км` : "";
    lines.push(`${n}) Автовывоз в ${v.truck_city} (в т.ч., все станционные, перевес${kmNote}): ${roundRub(Number(v.truck_price || 0)).toLocaleString("ru-RU")} ₽ (в т.ч., НДС 22%)`);
    n++;
  }
  if (v.weight_kg) {
    lines.push(`   Вес груза: ${Number(v.weight_kg).toLocaleString("ru-RU")} кг`);
  }
  if (showDep && v.departure_date) {
    lines.push(`   Выход: ${fmtDateDDMM(v.departure_date)}`);
  }
  return lines.join("\n");
}

export function buildKPEmailHtml(greeting, variants, signature, showDep, logoUrl, usdRate) {
  const useTable = variants.length >= 3;
  const sorted = [...variants].sort((a, b) => {
    const aIs20 = (a.ctype || "").includes("20") ? 0 : 1;
    const bIs20 = (b.ctype || "").includes("20") ? 0 : 1;
    if (aIs20 !== bIs20) return aIs20 - bIs20;
    return (a.port || "").localeCompare(b.port || "");
  });
  let body = "";
  if (useTable) {
    const depHeader = showDep ? `<th style="padding:7px 8px;text-align:left;font-size:10px;color:#fff;font-weight:600;text-transform:uppercase;">ETD</th>` : "";
    const hasAnyAuto = sorted.some(v => v.truck_on && v.truck_price && Number(v.truck_price) > 0);
    const hasAnyWeight = sorted.some(v => v.weight_kg && Number(v.weight_kg) > 0);
    const hasWeightSurcharge = sorted.some(v => (v.weight_surcharge || 0) > 0);
    let rows = "";
    sorted.forEach((v, i) => {
      const marginUsdVal = Number(v.freight_margin || 0);
      const ws = Number(v.weight_surcharge || 0);
      const rate = usdRate || 90;
      const freightTotal = roundUsd(Number(v.freight_base || 0) + marginUsdVal + ws);
      const railTotal = roundRub(Number(v.railway_base || 0) + Number(v.railway_margin || 0));
      const depCell = showDep ? `<td style="padding:6px 8px;font-size:11px;white-space:nowrap;">${fmtDateDDMM(v.departure_date)}</td>` : "";
      const freightStr = v.isRubFreight && v.freight_rub ? `${roundRub(Number(v.freight_rub) + (marginUsdVal + ws) * rate).toLocaleString("ru-RU")} ₽` : freightTotal > 0 ? `$${freightTotal}` : "—";
      const autoVal = v.truck_on && v.truck_price && Number(v.truck_price) > 0 ? `${roundRub(Number(v.truck_price)).toLocaleString("ru-RU")} ₽` : "—";
      const autoCell = hasAnyAuto ? `<td style="padding:6px 8px;font-size:11px;text-align:right;white-space:nowrap;">${autoVal}</td>` : "";
      const weightCell = hasAnyWeight ? `<td style="padding:6px 8px;font-size:11px;text-align:center;">${v.weight_kg ? (Number(v.weight_kg) / 1000).toFixed(1) : "—"}</td>` : "";
      const bg = i % 2 === 0 ? "#f0f6ff" : "#ffffff";
      rows += `<tr style="background:${bg};">
        <td style="padding:6px 8px;font-size:11px;font-weight:500;white-space:nowrap;">${v.port || "—"}</td>
        ${depCell}
        <td style="padding:6px 8px;font-size:11px;">${v.railway_dest || "—"}</td>
        <td style="padding:6px 8px;font-size:11px;text-align:center;font-weight:600;color:#2b6cb0;">${v.ctype}</td>
        ${weightCell}
        <td style="padding:6px 8px;font-size:11px;text-align:right;white-space:nowrap;">${freightStr}</td>
        <td style="padding:6px 8px;font-size:11px;text-align:right;white-space:nowrap;">${railTotal.toLocaleString("ru-RU")} ₽</td>
        ${autoCell}
      </tr>`;
    });
    const autoHeader = hasAnyAuto ? `<th style="padding:7px 8px;text-align:right;font-size:10px;color:#fff;font-weight:600;text-transform:uppercase;">Авто</th>` : "";
    const weightHeader = hasAnyWeight ? `<th style="padding:7px 8px;text-align:center;font-size:10px;color:#fff;font-weight:600;text-transform:uppercase;">Вес, тн</th>` : "";
    body = `<table style="width:100%;border-collapse:collapse;margin:16px 0;border:1px solid #d0dae8;border-radius:6px;" cellpadding="0" cellspacing="0">
      <thead><tr style="background:#2b6cb0;">
        <th style="padding:7px 8px;text-align:left;font-size:10px;color:#fff;font-weight:600;text-transform:uppercase;">Порт</th>
        ${depHeader}
        <th style="padding:7px 8px;text-align:left;font-size:10px;color:#fff;font-weight:600;text-transform:uppercase;">Пункт назначения</th>
        <th style="padding:7px 8px;text-align:center;font-size:10px;color:#fff;font-weight:600;text-transform:uppercase;">КТК</th>
        ${weightHeader}
        <th style="padding:7px 8px;text-align:right;font-size:10px;color:#fff;font-weight:600;text-transform:uppercase;min-width:80px;">Фрахт</th>
        <th style="padding:7px 8px;text-align:right;font-size:10px;color:#fff;font-weight:600;text-transform:uppercase;min-width:90px;">ЖД</th>
        ${autoHeader}
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
    if (hasWeightSurcharge) {
      body += `<p style="font-size:11px;color:#888;font-style:italic;margin:0;">* Ставки указаны с учётом веса груза</p>`;
    }
  } else {
    const lines = sorted.map((v, i) => {
      const header = sorted.length > 1 ? `<br><b>Вариант ${i + 1}:</b><br>` : "<br>";
      return header + formatKPVariant(v, i, showDep, usdRate).replace(/\n/g, "<br>");
    }).join("");
    body = lines;
  }
  const sigHtml = signature.replace(/\n/g, "<br>").replace(/(http[s]?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#1a73e8;text-decoration:none;">$1</a>');
  const logoHtml = logoUrl ? `<img src="${logoUrl}" alt="BML" style="height:40px;margin-bottom:8px;" /><br>` : "";
  const cta = `<br><p style="font-size:13px;color:#555;margin-top:12px;">В случае вопросов — обращайтесь, буду рад помочь.</p>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:700px;margin:0 auto;">
<div style="padding:24px 0;font-size:14px;line-height:1.7;color:#333;">
${greeting}<br><br>Направляю Вам ставки по интересующим направлениям:
${body}${cta}
</div>
<div style="border-top:1px solid #e8e8e8;padding:16px 0;font-size:12px;color:#888;line-height:1.6;">${logoHtml}${sigHtml}</div>
</div></body></html>`;
}

export function buildKPPlainText(greeting, variants, signature, showDep, usdRate) {
  const sorted = [...variants].sort((a, b) => {
    const aIs20 = (a.ctype || "").includes("20") ? 0 : 1;
    const bIs20 = (b.ctype || "").includes("20") ? 0 : 1;
    if (aIs20 !== bIs20) return aIs20 - bIs20;
    return (a.port || "").localeCompare(b.port || "");
  });
  const body = sorted.map((v, i) => {
    const header = sorted.length > 1 ? `\nВариант ${i + 1}:\n` : "\n";
    return header + formatKPVariant(v, i, showDep, usdRate);
  }).join("\n");
  return greeting + "\n\nНаправляю Вам ставки по интересующим направлениям:\n" + body + "\n\nВ случае вопросов — обращайтесь, буду рад помочь.\n\n" + signature;
}
