import React, { useState, useMemo, useRef } from 'react';
import { Badge } from './ui.jsx';
import { C, STATUS, GRADE } from '../constants.js';
import { uid, today, fmt, calcGrade, downloadCSV } from '../utils.js';
import { parseBitrixLeads, parseBitrixDeals, exportLeadsCSV, exportDealsCSV } from '../import/parseBitrix.js';
import * as XLSX from 'xlsx';

export function LeadsList({ leads, touches, up, mkTouches, setSel }) {
  const [showAdd, setShowAdd] = useState(false);
  const [showImp, setShowImp] = useState(false);
  const [filter, setFilter] = useState("active");
  const [sortBy, setSortBy] = useState("touch_date");
  const [impPreview, setImpPreview] = useState(null);
  const [impStats, setImpStats] = useState(null);
  const fileRef = useRef();
  const [form, setForm] = useState({ company_name: "", volume_monthly: "", routes_match: "unknown", payment_terms: "unknown", contact_name: "", source: "cold" });
  const [showImpDeals, setShowImpDeals] = useState(false);
  const [impDPreview, setImpDPreview] = useState(null);
  const [impDStats, setImpDStats] = useState(null);
  const fileDRef = useRef();

  const handleDealFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const ab = await file.arrayBuffer(); let rows;
      try { const wb = XLSX.read(ab, { type: "array" }); rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]); }
      catch { const text = new TextDecoder("utf-8").decode(ab); const doc = new DOMParser().parseFromString(text, "text/html"); const t2 = doc.querySelector("table"); if (!t2) { alert("Не прочитать"); return; } const wb2 = XLSX.utils.table_to_book(t2); rows = XLSX.utils.sheet_to_json(wb2.Sheets[wb2.SheetNames[0]]); }
      const parsed = parseBitrixDeals(rows);
      const existInns = new Set(leads.map(l => l.inn).filter(Boolean));
      const nw = parsed.filter(p => !p.inn || !existInns.has(p.inn));
      const sk = parsed.filter(p => p.inn && existInns.has(p.inn));
      setImpDPreview(nw); setImpDStats({ total: parsed.length, newC: nw.length, skipC: sk.length, skipN: sk.map(s => s.company_name).slice(0, 20) });
    } catch (err) { alert("Ошибка: " + err.message); }
    e.target.value = "";
  };

  const doImportDeals = () => {
    if (!impDPreview?.length) return;
    const nl = impDPreview.map(p => { const g = calcGrade(p); return { id: uid(), ...p, grade: g, status: p._importedStatus || "qualified", created: today() }; });
    up("leads", prev => [...prev, ...nl]);
    nl.forEach(l => { if (l.grade !== "C") mkTouches(l.id, l.grade, today()); });
    setImpDPreview(null); setImpDStats(null); setShowImpDeals(false);
  };

  const touchMap = useMemo(() => {
    const m = {};
    touches.forEach(t => {
      if (t.status !== "scheduled") return;
      if (!m[t.lead_id] || t.date < m[t.lead_id].date) m[t.lead_id] = t;
    });
    return m;
  }, [touches]);

  const lastTouchMap = useMemo(() => {
    const m = {};
    touches.forEach(t => {
      if (t.status !== "done") return;
      if (!m[t.lead_id] || t.num > m[t.lead_id].num) m[t.lead_id] = t;
    });
    return m;
  }, [touches]);

  const filtered = useMemo(() => {
    let list;
    if (filter === "active") list = leads.filter(l => !["won","lost","frozen"].includes(l.status));
    else if (filter === "won") list = leads.filter(l => l.status === "won");
    else if (filter === "frozen") list = leads.filter(l => l.status === "frozen");
    else if ("ABC".includes(filter)) list = leads.filter(l => l.grade === filter);
    else list = [...leads];

    list = [...list].sort((a, b) => {
      if (sortBy === "touch_date") {
        const ta = touchMap[a.id]?.date || "9999"; const tb = touchMap[b.id]?.date || "9999";
        return ta.localeCompare(tb);
      }
      if (sortBy === "touch_num") {
        const na = touchMap[a.id]?.num || 99; const nb = touchMap[b.id]?.num || 99;
        return na - nb;
      }
      if (sortBy === "company") return (a.company_name || "").localeCompare(b.company_name || "");
      if (sortBy === "grade") return (a.grade || "Z").localeCompare(b.grade || "Z");
      if (sortBy === "volume") return (b.volume_monthly || 0) - (a.volume_monthly || 0);
      return 0;
    });
    return list;
  }, [leads, filter, sortBy, touchMap]);

  const addLead = () => {
    const grade = calcGrade({ volume_monthly: Number(form.volume_monthly), routes_match: form.routes_match, payment_terms: form.payment_terms });
    const id = uid();
    up("leads", p => [...p, { id, ...form, volume_monthly: Number(form.volume_monthly) || 0, grade, status: "new", created: today(), phones_raw: [], emails_raw: [], phones_contact: [], emails_kp: [], routes: [] }]);
    if (grade !== "C") mkTouches(id, grade, today());
    setForm({ company_name: "", volume_monthly: "", routes_match: "unknown", payment_terms: "unknown", contact_name: "", source: "cold" });
    setShowAdd(false);
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      let rows = [];
      const buf = await file.arrayBuffer();
      try { const wb = XLSX.read(buf, { type: "array" }); rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" }); } catch {
        const text = new TextDecoder("utf-8").decode(buf);
        const doc = new DOMParser().parseFromString(text, "text/html");
        const table = doc.querySelector("table");
        if (!table) throw new Error("Нет таблицы");
        const hs = [...table.querySelectorAll("tr:first-child th, tr:first-child td")].map(c => c.textContent.trim());
        rows = [...table.querySelectorAll("tr")].slice(1).map(tr => { const cs = [...tr.querySelectorAll("td")]; const o = {}; hs.forEach((h, i) => { o[h] = cs[i]?.textContent?.trim() || ""; }); return o; }).filter(r => Object.values(r).some(v => v));
      }
      if (!rows.length) { alert("Пустой файл"); return; }
      const parsed = parseBitrixLeads(rows);
      const existNames = new Set(leads.map(l => (l.company_name || "").toLowerCase()));
      const existFull = new Set(leads.map(l => (l.company_name_full || l.company_name || "").toLowerCase()));
      const newOnes = [], skipped = [], seen = new Set();
      parsed.forEach(p => {
        const k1 = p.company_name.toLowerCase(), k2 = (p.company_name_full || "").toLowerCase();
        if (existNames.has(k1) || existFull.has(k2) || existNames.has(k2) || existFull.has(k1) || seen.has(k1)) { skipped.push(p.company_name_full || p.company_name); }
        else { newOnes.push(p); seen.add(k1); }
      });
      setImpPreview(newOnes);
      setImpStats({ total: parsed.length, newC: newOnes.length, skipC: skipped.length, skipN: skipped });
    } catch (err) { alert("Ошибка: " + err.message); }
    if (fileRef.current) fileRef.current.value = "";
  };

  const confirmImport = () => {
    const newL = impPreview.map(p => { const g = calcGrade(p); return { id: uid(), ...p, grade: g, status: "new", created: today() }; });
    up("leads", p => [...p, ...newL]);
    newL.forEach(l => { if (l.grade !== "C") mkTouches(l.id, l.grade, today()); });
    setImpPreview(null); setImpStats(null); setShowImp(false);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 6 }}>
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          {[["active","Активные"],["A","A"],["B","B"],["won","Выиграно"],["frozen","Заморож."],["all","Все"]].map(([id, l]) => (
            <button key={id} style={{ ...C.btn(filter === id), fontSize: 11, padding: "4px 10px" }} onClick={() => setFilter(id)}>{l}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={C.btn()} onClick={() => { setShowImp(!showImp); setShowAdd(false); setShowImpDeals(false); }}>Импорт лидов</button>
          <button style={C.btn()} onClick={() => { setShowImpDeals(!showImpDeals); setShowImp(false); setShowAdd(false); }}>Импорт сделок</button>
          <button style={C.btn(true)} onClick={() => { setShowAdd(!showAdd); setShowImp(false); }}>+ Новый</button>
        </div>
      </div>

      {showImp && (
        <div style={{ ...C.card, borderColor: "var(--color-border-info)" }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Импорт из Битрикс24 / Excel</div>
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 10px" }}>Загрузи .xls/.xlsx. Дубли пропустятся автоматически.</p>
          <input type="file" ref={fileRef} accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={handleFile} />
          <button style={C.btn()} onClick={() => fileRef.current?.click()}>Выбрать файл</button>
          {impStats && (
            <div style={{ marginTop: 12, padding: 12, background: "var(--color-background-secondary)", borderRadius: 10 }}>
              <div style={{ fontSize: 12, marginBottom: 8 }}>Найдено: <strong>{impStats.total}</strong> | Новых: <strong style={{ color: "#3B6D11" }}>{impStats.newC}</strong> | Дубли: <strong style={{ color: "#854F0B" }}>{impStats.skipC}</strong></div>
              {impStats.skipN.length > 0 && <details style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 6 }}><summary style={{ cursor: "pointer" }}>Пропущено ({impStats.skipC})</summary><div style={{ marginTop: 4 }}>{impStats.skipN.join(", ")}</div></details>}
              {impPreview?.length > 0 && (
                <div style={{ maxHeight: 200, overflow: "auto", marginTop: 6 }}>
                  <table style={C.tbl}><thead><tr><th style={C.th}>Компания</th><th style={C.th}>ИНН</th><th style={C.th}>Конт</th><th style={C.th}>Направления</th><th style={C.th}>Грейд</th></tr></thead>
                  <tbody>{impPreview.map((p, i) => { const g = calcGrade(p); return (
                    <tr key={i}><td style={{ ...C.td, fontWeight: 500, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.company_name}</td><td style={{ ...C.td, fontSize: 11 }}>{p.inn || "—"}</td><td style={C.td}>{p.volume_monthly || "—"}</td><td style={{ ...C.td, fontSize: 10 }}>{p.routes?.slice(0, 2).map(r => `${r.port}→${r.city}`).join(", ") || "—"}</td><td style={C.td}><Badge color={GRADE[g]?.c} bg={GRADE[g]?.bg}>{g}</Badge></td></tr>
                  ); })}</tbody></table>
                </div>
              )}
              <div style={{ display: "flex", gap: 6, marginTop: 10, justifyContent: "flex-end" }}>
                <button style={C.btn()} onClick={() => { setImpPreview(null); setImpStats(null); }}>Отмена</button>
                {impPreview?.length > 0 && <button style={C.btn(true)} onClick={confirmImport}>Импорт {impPreview.length}</button>}
              </div>
            </div>
          )}
        </div>
      )}

      {showImpDeals && (<div style={{ ...C.card, borderColor: "var(--color-border-info)" }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Импорт сделок Битрикс24 → Лиды</div>
        <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 6px" }}>Целевой→Квалиф., Информированный→КП отпр., Выигран→Выигран. Дубли по ИНН пропустятся.</p>
        <input type="file" ref={fileDRef} accept=".xlsx,.xls" style={{ display: "none" }} onChange={handleDealFile} />
        <button style={C.btn()} onClick={() => fileDRef.current?.click()}>Выбрать файл сделок</button>
        {impDStats && (<div style={{ marginTop: 12, padding: 12, background: "var(--color-background-secondary)", borderRadius: 10 }}>
          <div style={{ fontSize: 12, marginBottom: 8 }}>Найдено: <strong>{impDStats.total}</strong> | Новых: <strong style={{ color: "#3B6D11" }}>{impDStats.newC}</strong> | Дубли: <strong style={{ color: "#854F0B" }}>{impDStats.skipC}</strong></div>
          {impDPreview?.length > 0 && (<div style={{ maxHeight: 200, overflow: "auto", marginTop: 6 }}><table style={C.tbl}><thead><tr><th style={C.th}>Компания</th><th style={C.th}>ИНН</th><th style={C.th}>Битрикс</th><th style={C.th}>→CRM</th><th style={C.th}>Ктк</th></tr></thead>
          <tbody>{impDPreview.map((p,i) => (<tr key={i}><td style={C.td}>{p.company_name}</td><td style={C.td}>{p.inn}</td><td style={C.td}>{p.bitrix_stage}</td><td style={C.td}>{STATUS[p._importedStatus]?.l}</td><td style={C.td}>{p.volume_monthly}</td></tr>))}</tbody></table></div>)}
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}><button style={C.btn(true)} onClick={doImportDeals} disabled={!impDPreview?.length}>Импортировать {impDStats.newC}</button><button style={C.btn()} onClick={() => { setImpDPreview(null); setImpDStats(null); }}>Отмена</button></div>
        </div>)}
      </div>)}

      {leads.length > 0 && (<div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <button style={{ ...C.btn(), fontSize: 11 }} onClick={() => downloadCSV(exportLeadsCSV(leads), `leads_${today()}.csv`)}>📥 Экспорт лидов</button>
        <button style={{ ...C.btn(), fontSize: 11 }} onClick={() => downloadCSV(exportDealsCSV(leads), `deals_${today()}.csv`)}>📥 Экспорт сделок</button>
      </div>)}

      {showAdd && (
        <div style={C.card}>
          <div style={C.g3}>
            <div><div style={C.lbl}>Компания *</div><input style={C.inp} value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))} /></div>
            <div><div style={C.lbl}>Конт/мес</div><input style={C.inp} type="number" value={form.volume_monthly} onChange={e => setForm(p => ({ ...p, volume_monthly: e.target.value }))} /></div>
            <div><div style={C.lbl}>Наши направления</div><select style={{ ...C.sel, width: "100%" }} value={form.routes_match} onChange={e => setForm(p => ({ ...p, routes_match: e.target.value }))}><option value="unknown">Не знаю</option><option value="yes">Да</option><option value="partial">Частично</option><option value="no">Нет</option></select></div>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 10, justifyContent: "flex-end" }}>
            <button style={C.btn()} onClick={() => setShowAdd(false)}>Отмена</button>
            <button style={C.btn(true)} onClick={addLead} disabled={!form.company_name}>Создать</button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? <div style={{ ...C.card, ...C.empty }}>Нет лидов</div> : (
        <table style={C.tbl}><thead><tr>
          <th style={{ ...C.th, cursor: "pointer" }} onClick={() => setSortBy("company")}>Компания {sortBy === "company" ? "↑" : ""}</th>
          <th style={{ ...C.th, cursor: "pointer" }} onClick={() => setSortBy("grade")}>Грейд {sortBy === "grade" ? "↑" : ""}</th>
          <th style={C.th}>Статус</th>
          <th style={{ ...C.th, cursor: "pointer" }} onClick={() => setSortBy("touch_num")}>Касание {sortBy === "touch_num" ? "↑" : ""}</th>
          <th style={{ ...C.th, cursor: "pointer" }} onClick={() => setSortBy("touch_date")}>След. дата {sortBy === "touch_date" ? "↑" : ""}</th>
          <th style={{ ...C.th, cursor: "pointer" }} onClick={() => setSortBy("volume")}>Конт {sortBy === "volume" ? "↓" : ""}</th>
          <th style={C.th}>Направления</th>
        </tr></thead>
        <tbody>{filtered.map(l => {
          const nextTouch = touchMap[l.id];
          const lastTouch = lastTouchMap[l.id];
          const d = today();
          const overdue = nextTouch && nextTouch.date < d;
          return (
          <tr key={l.id} style={{ cursor: "pointer" }} onClick={() => setSel(l.id)}>
            <td style={{ ...C.td, fontWeight: 500 }}>{l.company_name}</td>
            <td style={C.td}><Badge color={GRADE[l.grade]?.c} bg={GRADE[l.grade]?.bg}>{l.grade}</Badge></td>
            <td style={C.td}><Badge color={STATUS[l.status]?.c} bg={STATUS[l.status]?.bg}>{STATUS[l.status]?.l}</Badge></td>
            <td style={C.td}>{nextTouch ? (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Badge color={nextTouch.type === "call" ? "#0F6E56" : nextTouch.type === "email" ? "#185FA5" : "#534AB7"} bg={nextTouch.type === "call" ? "#E1F5EE" : nextTouch.type === "email" ? "#E6F1FB" : "#EEEDFE"} style={{ fontWeight: 700, fontSize: 10 }}>{nextTouch.num}</Badge>
                <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{nextTouch.label}</span>
              </div>
            ) : lastTouch ? (
              <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>done ({lastTouch.num}/6)</span>
            ) : <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>—</span>}</td>
            <td style={C.td}>{nextTouch ? (
              <span style={{ fontSize: 11, fontWeight: 500, color: overdue ? "#A32D2D" : "var(--color-text-primary)" }}>{fmt(nextTouch.date)} {overdue ? "!" : ""}</span>
            ) : "—"}</td>
            <td style={C.td}>{l.volume_monthly || "—"}</td>
            <td style={{ ...C.td, fontSize: 10, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.routes?.slice(0, 2).map(r => `${r.port}→${r.city}`).join(", ") || "—"}</td>
          </tr>);
        })}</tbody></table>
      )}
    </div>
  );
}
