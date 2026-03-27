import React, { useState, useMemo, useRef } from 'react';
import { Badge } from './ui.jsx';
import { C } from '../constants.js';
import { fmt } from '../utils.js';
import { parseRateExcel } from '../rates/parseRateExcel.js';
import * as XLSX from 'xlsx';

export function RatesTab({ freight, boxes, drops, railway, autoMsk, up, importRates, settings }) {
  const fileRef = useRef();
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [viewTab, setViewTab] = useState("freight");
  const [q, setQ] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setImporting(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      if (!wb.SheetNames || wb.SheetNames.length === 0) throw new Error("No sheets");
      const parsed = parseRateExcel(wb, XLSX);
      if (parsed.freight.length === 0) throw new Error("Фрахт: 0 строк. Листы: " + wb.SheetNames.join(", "));
      setPreview(parsed);
    } catch (err) {
      console.error("Rate import error:", err);
      alert("Ошибка: " + (err.message || String(err)));
    }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const confirmImport = () => {
    try {
      importRates(preview);
      setPreview(null);
      setTimeout(() => alert(`OK! Фрахт: ${preview.freight.length}, Ящики: ${preview.boxes.length}, Дропы: ${preview.drops.length}, ЖД: ${preview.railway.length}, Авто: ${preview.autoMsk.length}`), 100);
    } catch (err) { alert("Ошибка сохранения: " + err.message); }
  };

  const clearAllRates = () => {
    if (!confirm("Очистить все ставки?")) return;
    importRates({ freight: [], boxes: [], drops: [], railway: [], autoMsk: [] });
  };

  const filteredFreight = useMemo(() => {
    if (!q) return freight;
    const s = q.toLowerCase();
    return freight.filter(r => `${r.pol} ${r.line} ${r.service} ${r.terminal}`.toLowerCase().includes(s));
  }, [freight, q]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={C.section}>Ставки</div>
          {settings?.ratesLoadedAt && <Badge color="#0F6E56" bg="#E1F5EE" style={{ fontSize: 10 }}>Загружены: {new Date(settings.ratesLoadedAt).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</Badge>}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <input type="file" ref={fileRef} accept=".xlsx,.xls" style={{ display: "none" }} onChange={handleFile} />
          {freight.length > 0 && <button style={{ ...C.btn(), color: "var(--color-text-danger)" }} onClick={clearAllRates}>Очистить</button>}
          <button style={C.btn(true)} onClick={() => fileRef.current?.click()}>{importing ? "Загрузка..." : "Загрузить КП Excel"}</button>
        </div>
      </div>

      {freight.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          {[["Фрахт", freight.length, "#0F6E56"], ["Ящики", boxes.length, "#854F0B"], ["Дропы", drops.length, "#185FA5"], ["ЖД", railway.length, "#534AB7"], ["Авто Мск", autoMsk.length, "#D85A30"]].map(([l, v, c], i) => (
            <div key={i} style={{ ...C.metric, minWidth: 80 }}><div style={{ fontSize: 10, color: "var(--color-text-tertiary)", textTransform: "uppercase", fontWeight: 500 }}>{l}</div><div style={{ fontSize: 18, fontWeight: 700, color: c }}>{v}</div></div>
          ))}
        </div>
      )}

      {preview && (
        <div style={{ ...C.card, borderColor: "var(--color-border-info)" }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Распарсено:</div>
          <div style={{ fontSize: 12, marginBottom: 8 }}>
            Фрахт: <strong>{preview.freight.length}</strong> | Ящики: <strong>{preview.boxes.length}</strong> | Дропы: <strong>{preview.drops.length}</strong> | ЖД: <strong>{preview.railway.length}</strong> | Авто Мск: <strong>{preview.autoMsk.length}</strong>
          </div>
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <button style={C.btn()} onClick={() => setPreview(null)}>Отмена</button>
            <button style={C.btn(true)} onClick={confirmImport}>Заменить все ставки</button>
          </div>
        </div>
      )}

      {freight.length > 0 && (
        <div>
          <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
            {[["freight","Фрахт"],["boxes","Ящики"],["drops","Дропы"],["railway","ЖД"]].map(([id,l]) => (
              <button key={id} style={{ ...C.btn(viewTab === id), fontSize: 11, padding: "4px 10px" }} onClick={() => setViewTab(id)}>{l}</button>
            ))}
            <input style={{ ...C.inp, width: 140, marginLeft: "auto" }} placeholder="Поиск..." value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div style={{ maxHeight: 400, overflow: "auto" }}>
            {viewTab === "freight" && (
              <table style={C.tbl}><thead><tr><th style={C.th}>POL</th><th style={C.th}>Линия</th><th style={C.th}>Сервис</th><th style={C.th}>SOC 20/40</th><th style={C.th}>COC 20/40</th><th style={C.th}>Судно</th><th style={C.th}>Терминал</th><th style={C.th}>Выход</th></tr></thead>
              <tbody>{filteredFreight.slice(0, 100).map(r => (
                <tr key={r.id}><td style={C.td}>{r.pol}</td><td style={C.td}>{r.line}</td><td style={{ ...C.td, fontSize: 10 }}>{r.service}</td>
                <td style={C.td}>{r.hasSoc ? `$${r.soc20}/$${r.soc40}` : "—"}</td>
                <td style={C.td}>{r.hasCoc ? `$${r.coc20}/$${r.coc40}` : "—"}</td>
                <td style={C.td}><Badge color={r.transship === "DIRECT" ? "#3B6D11" : "#854F0B"} bg={r.transship === "DIRECT" ? "#EAF3DE" : "#FAEEDA"}>{r.transship || "—"}</Badge></td>
                <td style={{ ...C.td, fontSize: 10 }}>{r.terminal}</td><td style={C.td}>{fmt(r.departure)}</td></tr>
              ))}</tbody></table>
            )}
            {viewTab === "boxes" && (
              <table style={C.tbl}><thead><tr><th style={C.th}>POL</th><th style={C.th}>Город</th><th style={C.th}>20' $</th><th style={C.th}>40' $</th><th style={C.th}>Free time</th></tr></thead>
              <tbody>{boxes.map((r, i) => <tr key={i}><td style={C.td}>{r.pol}</td><td style={C.td}>{r.city}</td><td style={C.td}>${r.p20}</td><td style={C.td}>${r.p40}</td><td style={{ ...C.td, fontSize: 10 }}>{r.freeTime}</td></tr>)}</tbody></table>
            )}
            {viewTab === "drops" && (
              <table style={C.tbl}><thead><tr><th style={C.th}>Линия</th><th style={C.th}>Город</th><th style={C.th}>20' $</th><th style={C.th}>40' $</th><th style={C.th}>Free time</th></tr></thead>
              <tbody>{drops.filter(d => !q || `${d.line}${d.city}`.toLowerCase().includes(q.toLowerCase())).map((r, i) => <tr key={i}><td style={C.td}>{r.line}</td><td style={C.td}>{r.city}</td><td style={C.td}>{r.p20 >= 0 ? `$${r.p20}` : "запрос"}</td><td style={C.td}>{r.p40 >= 0 ? `$${r.p40}` : "запрос"}</td><td style={{ ...C.td, fontSize: 10 }}>{r.freeTime}</td></tr>)}</tbody></table>
            )}
            {viewTab === "railway" && (
              <table style={C.tbl}><thead><tr><th style={C.th}>Терминал</th><th style={C.th}>Город</th><th style={C.th}>20' ₽</th><th style={C.th}>40' ₽</th><th style={C.th}>ВОХР 20/40</th><th style={C.th}>НДС</th></tr></thead>
              <tbody>{railway.filter(r => !q || `${r.terminal}${r.city}`.toLowerCase().includes(q.toLowerCase())).slice(0, 80).map((r, i) => <tr key={i}><td style={{ ...C.td, fontSize: 10 }}>{r.terminal}</td><td style={C.td}>{r.city}</td><td style={C.td}>{r.p20base ? `${Math.round(r.p20base).toLocaleString("ru")}` : "—"}</td><td style={C.td}>{r.p40base ? `${Math.round(r.p40base).toLocaleString("ru")}` : "—"}</td><td style={{ ...C.td, fontSize: 10 }}>{r.guard20}/{r.guard40}</td><td style={C.td}>{r.nds ? `${Math.round(r.nds * 100)}%` : "0"}</td></tr>)}</tbody></table>
            )}
          </div>
        </div>
      )}
      {freight.length === 0 && !preview && <div style={{ ...C.card, ...C.empty }}>Загрузи Excel файл с КП/ставками (формат с листами: Фрахт ДВ, Ящики, Дроп, ЖД тарифы, Мск авто)</div>}
    </div>
  );
}
