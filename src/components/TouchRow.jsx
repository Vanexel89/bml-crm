import React, { useState } from 'react';
import { Badge } from './ui.jsx';
import { C } from '../constants.js';
import { today, fmt } from '../utils.js';

export function TouchRow({ t, doTouch }) {
  const [open, setOpen] = useState(false);
  const [oc, setOc] = useState("no_answer");
  const [n, setN] = useState("");
  const d = today();
  const over = t.status === "scheduled" && t.date < d;
  const done = t.status === "done";
  const canc = t.status === "cancelled";
  const tc = t.type === "call" ? "#0F6E56" : t.type === "email" ? "#185FA5" : "#534AB7";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 10, marginBottom: 4, background: done || canc ? "var(--color-background-secondary)" : over ? "var(--color-background-danger)" : "var(--color-background-primary)", border: done || canc ? "none" : "0.5px solid var(--color-border-tertiary)", opacity: done || canc ? 0.55 : 1, borderLeft: `3px solid ${done || canc ? "transparent" : tc}` }}>
      <Badge color={tc} bg={t.type === "call" ? "#E1F5EE" : t.type === "email" ? "#E6F1FB" : "#EEEDFE"} style={{ fontWeight: 700 }}>{t.num}</Badge>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 500, fontSize: 12 }}>{t.label} <span style={{ fontWeight: 400, color: "var(--color-text-secondary)" }}>— {fmt(t.date)}</span>
          {t.hint && t.status === "scheduled" && <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#185FA5", fontFamily: "inherit", marginLeft: 4 }} onClick={(ev) => { ev.stopPropagation(); const el = ev.target.closest("div").parentNode.querySelector("[data-hint]"); if(el) el.style.display = el.style.display === "none" ? "block" : "none"; }}>💡 что говорить</button>}
        </div>
        <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{t.desc}{t.note ? ` | ${t.note}` : ""}</div>
        {t.hint && t.status === "scheduled" && <div data-hint="1" style={{ display: "none", marginTop: 4, padding: "6px 10px", background: "#FEFCE8", border: "0.5px solid #FDE68A", borderRadius: 6, fontSize: 11, color: "#854F0B", lineHeight: 1.4 }}>💡 {t.hint}</div>}
      </div>
      {done && <span style={{ fontSize: 11, color: "#3B6D11", fontWeight: 500 }}>done</span>}
      {canc && <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>отмен.</span>}
      {t.status === "scheduled" && !open && <button style={C.btn()} onClick={() => setOpen(true)}>Выполнить</button>}
      {open && (
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <select style={{ ...C.sel, fontSize: 11, padding: "4px 6px" }} value={oc} onChange={e => setOc(e.target.value)}><option value="no_answer">Нет ответа</option><option value="interested">Заинтересован</option><option value="callback">Перезвонить</option><option value="rejected">Отказ</option></select>
          <input style={{ ...C.inp, width: 100, fontSize: 11, padding: "4px 6px" }} value={n} onChange={e => setN(e.target.value)} placeholder="Заметка" />
          <button style={C.btn(true)} onClick={() => { doTouch(t.id, oc, n); setOpen(false); }}>OK</button>
          <button style={C.btn()} onClick={() => setOpen(false)}>×</button>
        </div>
      )}
    </div>
  );
}
