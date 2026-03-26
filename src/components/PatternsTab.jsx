import React, { useState } from 'react';
import { Badge } from './ui.jsx';
import { C } from '../constants.js';
import { uid, fmtFull } from '../utils.js';

export function PatternsTab({ patterns, up }) {
  const [f, setF] = useState({ cat: "success", text: "" });
  const cats = { success: { l: "Успех", c: "#3B6D11", bg: "#EAF3DE" }, failure: { l: "Провал", c: "#A32D2D", bg: "#FCEBEB" }, objection: { l: "Возражение", c: "#854F0B", bg: "#FAEEDA" }, market: { l: "Рынок", c: "#185FA5", bg: "#E6F1FB" } };
  const add = () => { if (!f.text.trim()) return; up("patterns", p => [...p, { id: uid(), cat: f.cat, text: f.text, at: new Date().toISOString() }]); setF(p => ({ ...p, text: "" })); };
  return (
    <div>
      <div style={C.section}>Паттерны</div>
      <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 12 }}>Что работает, что нет. База знаний для AI.</p>
      <div style={{ ...C.card, display: "flex", gap: 8, alignItems: "flex-end" }}>
        <div><div style={C.lbl}>Категория</div><select style={C.sel} value={f.cat} onChange={e => setF(p => ({ ...p, cat: e.target.value }))}>{Object.entries(cats).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}</select></div>
        <div style={{ flex: 1 }}><div style={C.lbl}>Вывод</div><input style={C.inp} value={f.text} onChange={e => setF(p => ({ ...p, text: e.target.value }))} placeholder="Клиенты 5+ конт торгуются по срокам" onKeyDown={e => e.key === "Enter" && add()} /></div>
        <button style={C.btn(true)} onClick={add}>+</button>
      </div>
      {patterns.length === 0 ? <div style={{ ...C.card, ...C.empty }}>Пусто</div> : patterns.slice().reverse().map(p => (
        <div key={p.id} style={{ ...C.card, display: "flex", gap: 8, alignItems: "center", padding: 11 }}>
          <Badge color={cats[p.cat]?.c} bg={cats[p.cat]?.bg}>{cats[p.cat]?.l}</Badge>
          <div style={{ flex: 1 }}><div style={{ fontSize: 13 }}>{p.text}</div><div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 2 }}>{fmtFull(p.at)}</div></div>
          <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 14 }} onClick={() => up("patterns", pp => pp.filter(x => x.id !== p.id))}>×</button>
        </div>
      ))}
    </div>
  );
}
