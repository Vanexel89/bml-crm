import React, { useState, useMemo } from 'react';
import { Badge } from './ui.jsx';
import { C, GRADE, STATUS } from '../constants.js';
import { today, fmt, fmtFull, addDays } from '../utils.js';
import { compareProposalRates } from '../rates/compareSnapshot.js';

const startOfWeek = () => {
  const d = new Date(); const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d.toISOString().split("T")[0];
};

export function Dashboard({ leads, touches, activities, proposals, doTouch, setSel, setTab, freight, boxes, drops, railway, autoMsk, customAuto, settings }) {
  const [at, setAt] = useState(null);
  const [oc, setOc] = useState("no_answer");
  const [nt, setNt] = useState("");
  const d = today();
  const w = startOfWeek();

  const tasks = useMemo(() => touches.filter(t => t.status === "scheduled" && t.date <= d).sort((a, b) => (a.date < d ? -1 : 0) - (b.date < d ? -1 : 0) || b.num - a.num), [touches, d]);

  const rateAlerts = useMemo(() => {
    if (!freight || freight.length === 0) return [];
    const alerts = [];
    const seen = new Set();
    const rateData = { freight, boxes, drops, railway, autoMsk, customAuto, settings };
    // Only check active leads
    const activeLeadIds = new Set(leads.filter(l => !["won","lost","frozen"].includes(l.status)).map(l => l.id));
    proposals.forEach(p => {
      if (!p.rateSnapshot || seen.has(p.lead_id) || !activeLeadIds.has(p.lead_id)) return;
      const cmp = compareProposalRates(p, rateData);
      if (!cmp || cmp.overall === "ok") return;
      seen.add(p.lead_id);
      const lead = leads.find(l => l.id === p.lead_id);
      if (!lead) return;
      cmp.variants.forEach(v => {
        if (v.status === "ok") return;
        alerts.push({
          leadId: p.lead_id,
          company: lead.company_name,
          route: `${v.snap.port}→${v.snap.city}`,
          status: v.status, // "cheaper" | "dearer" | "gone"
          detail: v.detail || "",
        });
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

  // Mini-funnel counts
  const miniFunnel = useMemo(() => {
    const stages = ["new", "contact", "qualified", "proposal_sent", "negotiation", "won"];
    return stages.map(s => ({ key: s, label: STATUS[s]?.l, color: STATUS[s]?.c, count: leads.filter(l => l.status === s).length }));
  }, [leads]);

  // Today KPI
  const todayKpi = useMemo(() => {
    const todayTouches = touches.filter(t => t.done === d);
    return {
      calls: todayTouches.filter(t => t.type === "call").length,
      kp: proposals.filter(p => p.created?.startsWith(d)).length,
      convs: todayTouches.filter(t => t.outcome && t.outcome !== "no_answer").length,
    };
  }, [touches, proposals, d]);

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

      {/* Mini-funnel */}
      <div style={{ ...C.card, padding: "10px 14px", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Воронка</span>
          <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "var(--color-text-info)", fontFamily: "inherit" }} onClick={() => setTab("analytics")}>Подробнее →</button>
        </div>
        <div style={{ display: "flex", gap: 2, height: 32, borderRadius: 6, overflow: "hidden" }}>
          {miniFunnel.map(s => s.count > 0 ? (
            <div key={s.key} style={{ flex: s.count, background: s.color + "22", display: "flex", alignItems: "center", justifyContent: "center", minWidth: 28 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: s.color }}>{s.count}</span>
            </div>
          ) : null)}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
          {miniFunnel.filter(s => s.count > 0).map(s => (
            <span key={s.key} style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ width: 7, height: 7, borderRadius: 3, background: s.color, display: "inline-block" }} />
              <span style={{ color: "var(--color-text-secondary)" }}>{s.label}:</span>
              <strong style={{ color: s.color }}>{s.count}</strong>
            </span>
          ))}
        </div>
      </div>

      {/* Today KPI mini */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[
          ["Звонков", todayKpi.calls, 40, "#0F6E56"],
          ["КП", todayKpi.kp, 5, "#534AB7"],
          ["Разговоров", todayKpi.convs, 15, "#185FA5"],
        ].map(([l, v, plan, c], i) => {
          const pct = Math.min(100, Math.round(v / plan * 100));
          return (
            <div key={i} style={{ ...C.metric, flex: 1, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", bottom: 0, left: 0, width: `${pct}%`, height: 3, background: c, borderRadius: "0 2px 0 0", transition: "width 0.3s" }} />
              <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginBottom: 2, textTransform: "uppercase" }}>Сегодня {l}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: c }}>{v} <span style={{ fontSize: 11, fontWeight: 400, color: "var(--color-text-tertiary)" }}>/ {plan}</span></div>
            </div>
          );
        })}
      </div>

      {rateAlerts.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={C.section}>Изменения ставок <Badge color="#854F0B" bg="#FAEEDA">{rateAlerts.length}</Badge></div>
          {rateAlerts.map((a, i) => {
            const colors = { cheaper: { border: "#3B6D11", c: "#3B6D11", bg: "#EAF3DE", icon: "↓" }, dearer: { border: "#D85A30", c: "#D85A30", bg: "#FAECE7", icon: "↑" }, gone: { border: "#A32D2D", c: "#A32D2D", bg: "#FCEBEB", icon: "✕" } };
            const st = colors[a.status] || colors.gone;
            return (
              <div key={i} style={{ ...C.card, display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderLeft: `3px solid ${st.border}` }}>
                <Badge color={st.c} bg={st.bg}>{st.icon}</Badge>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, cursor: "pointer" }} onClick={() => { setSel(a.leadId); setTab("leads"); }}>{a.company}</span>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 1 }}>
                    {a.route}: {a.status === "gone" ? "ставка удалена из базы" : a.detail}
                  </div>
                </div>
                <button style={{ ...C.btn(), fontSize: 10, padding: "3px 10px" }} onClick={() => { setSel(a.leadId); setTab("leads"); }}>Открыть</button>
              </div>
            );
          })}
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
                  <option value="no_answer">Нет ответа</option><option value="interested">Заинтересован</option><option value="callback">Перезвонить</option><option value="redirect">Переадресация</option><option value="rejected">Отказ</option>
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
