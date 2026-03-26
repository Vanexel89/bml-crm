import React, { useState, useMemo } from 'react';
import { Badge } from './ui.jsx';
import { C, GRADE } from '../constants.js';
import { today, fmt, fmtFull, addDays, weekAgo } from '../utils.js';
import { calcChain } from '../rates/calcChain.js';

export function Dashboard({ leads, touches, activities, proposals, doTouch, setSel, setTab, freight, boxes, drops, railway, autoMsk, customAuto, settings }) {
  const [at, setAt] = useState(null);
  const [oc, setOc] = useState("no_answer");
  const [nt, setNt] = useState("");
  const d = today();
  const w = weekAgo();

  const tasks = useMemo(() => touches.filter(t => t.status === "scheduled" && t.date <= d).sort((a, b) => (a.date < d ? -1 : 0) - (b.date < d ? -1 : 0) || b.num - a.num), [touches, d]);

  const rateAlerts = useMemo(() => {
    if (!freight || freight.length === 0) return [];
    const alerts = [];
    const seen = new Set();
    proposals.forEach(p => {
      if (!p.rateSnapshot || seen.has(p.lead_id)) return;
      p.rateSnapshot.forEach(snap => {
        if (!snap.port || !snap.city) return;
        const ctype = (snap.ctype || "40HC").includes("20") ? "20" : "40";
        const results = calcChain(
          { freight, boxes, drops, railway, autoMsk, customAuto, settings: settings || {} },
          { pol: snap.port, city: snap.city, ctype, weight: 22 }
        );
        if (results.length > 0) {
          const bestNow = results[0];
          const oldFreight = snap.freightBase || 0;
          const oldRailway = snap.railwayBase || 0;
          const newFreight = bestNow.isRubFreight ? 0 : bestNow.totalFreightUsd;
          const newRailway = bestNow.rwBase;
          if (newFreight < oldFreight || newRailway < oldRailway) {
            const lead = leads.find(l => l.id === p.lead_id);
            if (lead && !seen.has(p.lead_id)) {
              seen.add(p.lead_id);
              const savings = [];
              if (newFreight < oldFreight) savings.push(`фрахт $${oldFreight}→$${newFreight}`);
              if (newRailway < oldRailway) savings.push(`ЖД ${oldRailway.toLocaleString("ru")}→${newRailway.toLocaleString("ru")}₽`);
              alerts.push({ leadId: p.lead_id, company: lead.company_name, route: `${snap.port}→${snap.city}`, savings: savings.join(", ") });
            }
          }
        }
      });
    });
    return alerts;
  }, [proposals, freight, boxes, drops, railway, autoMsk, customAuto, settings, leads]);

  const weeklyActive = useMemo(() => {
    const activeLids = new Set();
    activities.filter(a => a.at >= w).forEach(a => activeLids.add(a.lead_id));
    touches.filter(t => t.done && t.done >= w).forEach(t => activeLids.add(t.lead_id));
    return activeLids.size;
  }, [activities, touches, w]);

  const stats = useMemo(() => ({
    active: leads.filter(l => !["won","lost","frozen"].includes(l.status)).length,
    won: leads.filter(l => l.status === "won").length,
    vol: leads.filter(l => l.status === "won").reduce((s, l) => s + (l.volume_monthly || 0), 0),
    kp: proposals.filter(p => p.status === "sent").length,
    weekly: weeklyActive,
  }), [leads, proposals, weeklyActive]);

  const frozen = leads.filter(l => l.status === "frozen").slice(0, 5);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 16 }}>
        {[
          ["Активных", stats.active, null],
          ["За неделю", stats.weekly, "#185FA5"],
          ["Выиграно", stats.won, "#3B6D11"],
          ["Конт/мес", stats.vol, "#0F6E56"],
          ["КП на руках", stats.kp, "#534AB7"],
        ].map(([l, v, c], i) => (
          <div key={i} style={C.metric}>
            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 500 }}>{l}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: c || "var(--color-text-primary)", letterSpacing: "-0.5px" }}>{v}</div>
          </div>
        ))}
      </div>

      {rateAlerts.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={C.section}>Ставки стали дешевле <Badge color="#3B6D11" bg="#EAF3DE">{rateAlerts.length}</Badge></div>
          {rateAlerts.map((a, i) => (
            <div key={i} style={{ ...C.card, display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderLeft: "3px solid #3B6D11" }}>
              <Badge color="#3B6D11" bg="#EAF3DE">↓</Badge>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600, cursor: "pointer" }} onClick={() => { setSel(a.leadId); setTab("leads"); }}>{a.company}</span>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 1 }}>{a.route}: {a.savings}</div>
              </div>
              <button style={{ ...C.btn(), fontSize: 10, padding: "3px 10px" }} onClick={() => { setSel(a.leadId); setTab("leads"); }}>Открыть</button>
            </div>
          ))}
        </div>
      )}

      <div style={C.section}>Задачи на сегодня <span style={{ fontWeight: 400, color: "var(--color-text-tertiary)" }}>({tasks.length})</span></div>
      {tasks.length === 0 && <div style={{ ...C.card, ...C.empty }}>Нет задач. Добавь лидов!</div>}
      {tasks.map(t => {
        const lead = leads.find(l => l.id === t.lead_id);
        const over = t.date < d;
        return (
          <div key={t.id} style={{ ...C.card, display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderLeft: `3px solid ${t.type === "call" ? "#0F6E56" : t.type === "email" ? "#185FA5" : "#534AB7"}`, background: over ? "var(--color-background-danger)" : "var(--color-background-primary)" }}>
            <Badge color={t.type === "call" ? "#0F6E56" : t.type === "email" ? "#185FA5" : "#534AB7"} bg={t.type === "call" ? "#E1F5EE" : t.type === "email" ? "#E6F1FB" : "#EEEDFE"} style={{ fontSize: 12, fontWeight: 700, padding: "3px 9px" }}>{t.num}</Badge>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontWeight: 600, cursor: "pointer" }} onClick={() => { setSel(lead?.id); setTab("leads"); }}>{lead?.company_name || "?"}</span>
                {lead?.grade && <Badge color={GRADE[lead.grade]?.c} bg={GRADE[lead.grade]?.bg}>{lead.grade}</Badge>}
                {over && <Badge color="#A32D2D" bg="#FCEBEB">просроч.</Badge>}
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>{t.label} — {t.desc}</div>
              {lead?.phones_contact?.length > 0 && <div style={{ fontSize: 11, color: "var(--color-text-info)", marginTop: 2 }}>{lead.phones_contact[0]}</div>}
            </div>
            {at === t.id ? (
              <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
                <select style={{ ...C.sel, fontSize: 11, padding: "4px 6px" }} value={oc} onChange={e => setOc(e.target.value)}>
                  <option value="no_answer">Нет ответа</option><option value="interested">Заинтересован</option><option value="callback">Перезвонить</option><option value="rejected">Отказ</option>
                </select>
                <input style={{ ...C.inp, width: 110, fontSize: 11, padding: "4px 7px" }} placeholder="Заметка" value={nt} onChange={e => setNt(e.target.value)} />
                <button style={C.btn(true)} onClick={() => { doTouch(t.id, oc, nt); setAt(null); setNt(""); setOc("no_answer"); }}>OK</button>
                <button style={C.btn()} onClick={() => setAt(null)}>×</button>
              </div>
            ) : <button style={C.btn()} onClick={() => setAt(t.id)}>Выполнить</button>}
          </div>
        );
      })}

      {frozen.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={C.section}>Реактивация</div>
          {frozen.map(l => {
            const dl = l.frozen_date ? Math.max(0, Math.ceil((new Date(addDays(l.frozen_date, 30)) - new Date(d)) / 86400000)) : "?";
            const rdy = dl === 0;
            return (<div key={l.id} style={{ ...C.card, display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderLeft: rdy ? "3px solid #D85A30" : "none" }}>
              <Badge color={rdy ? "#D85A30" : "#888780"} bg={rdy ? "#FAECE7" : "#F1EFE8"}>{rdy ? "🔥" : "❄️"}</Badge>
              <span style={{ fontWeight: 500, cursor: "pointer" }} onClick={() => { setSel(l.id); setTab("leads"); }}>{l.company_name}</span>
              <span style={{ flex: 1, fontSize: 11, color: "var(--color-text-secondary)" }}>{rdy ? "Готов к разморозке!" : `${dl} дн.`}</span>
              {rdy && <button style={{ ...C.btn(true), fontSize: 10, padding: "3px 10px" }} onClick={() => { setSel(l.id); setTab("leads"); }}>Открыть</button>}
            </div>);
          })}
        </div>
      )}
    </div>
  );
}
