import React, { useState, useEffect, useCallback } from 'react';
import { load, save, setApiKey } from '../api.js';
import { KEYS, TOUCHES_TPL, REACTIVATION_TPL, OBJECTION_TREE, RATE_CHECK_INTERVAL_DAYS, LOGO_URL, C } from '../constants.js';
import { uid, today, addDays, calcGrade } from '../utils.js';
import { calcChain } from '../rates/calcChain.js';
import { Dashboard } from './Dashboard.jsx';
import { LeadsList } from './LeadsList.jsx';
import { LeadDetail } from './LeadDetail.jsx';
import { RatesTab } from './RatesTab.jsx';
import { CalcTab } from './CalcTab.jsx';
import { ProposalsTab } from './ProposalsTab.jsx';
import { PatternsTab } from './PatternsTab.jsx';
import { AnalyticsTab } from './AnalyticsTab.jsx';
import { SettingsTab } from './SettingsTab.jsx';

export function App({ onLogout }) {
  const [tab, setTab] = useState("dashboard");
  const [data, setData] = useState({ leads: [], rates: [], proposals: [], activities: [], touches: [], patterns: [], freight: [], boxes: [], drops: [], railway: [], autoMsk: [], settings: {}, customAuto: [] });
  const [ready, setReady] = useState(false);
  const [sel, setSel] = useState(null);
  const [kpFromCalc, setKpFromCalc] = useState(null);
  const [logoB64, setLogoB64] = useState("");

  useEffect(() => {
    (async () => {
      const keys = Object.keys(KEYS);
      const results = await Promise.all(keys.map(k => load(KEYS[k], k === "settings" ? {} : [])));
      const d = {};
      keys.forEach((k, i) => { d[k] = results[i]; });
      setData(d);
      setReady(true);
      try {
        const r = await fetch(LOGO_URL);
        if (r.ok) { const b = await r.blob(); const reader = new FileReader(); reader.onloadend = () => setLogoB64(reader.result); reader.readAsDataURL(b); }
      } catch {}
    })();
  }, []);

  const up = useCallback((key, fn) => {
    setData(prev => { const next = fn(prev[key]); save(KEYS[key], next); return { ...prev, [key]: next }; });
  }, []);

  const mkTouches = useCallback((lid, grade, start) => {
    const max = grade === "A" ? 7 : grade === "B" ? 2 : 1; // C gets 1 touch (cold call)
    const ts = TOUCHES_TPL.slice(0, max).map(t => ({
      id: uid(), lead_id: lid, num: t.n, type: t.type, label: t.label, desc: t.desc, hint: t.hint || "",
      challenger: t.challenger || "", spin_focus: t.spin_focus || null,
      date: addDays(start || today(), t.day), done: null, status: "scheduled", outcome: null, note: "",
    }));
    up("touches", p => [...p, ...ts]);
  }, [up]);

  // ─── doTouch — Sales Navigator logic v2 (adaptive) ───
  const doTouch = useCallback((tid, outcome, note, extra = {}) => {
    const ref = data.touches.find(t => t.id === tid);
    if (!ref) return;
    const lid = ref.lead_id;
    const lead = data.leads.find(l => l.id === lid);
    const d = today();

    // Helper: max touch num for this lead
    const maxNum = () => data.touches.filter(t => t.lead_id === lid).reduce((m, t) => Math.max(m, t.num || 0), 0);

    // Helper: check if lead has email and routes
    const hasEmail = lead && ((lead.emails_kp || []).length > 0 || (lead.emails_raw || []).length > 0);
    const hasRoutes = lead && (lead.routes || []).length > 0;
    const canSendKP = hasEmail && hasRoutes;

    // ─── DIAL FAIL — handle separately, before marking touch as done ───
    if (outcome === "dial_fail") {
      const dialFails = (ref.dial_fails || 0) + 1;
      // Log dial attempt
      up("activities", p => [...p, { id: uid(), lead_id: lid, type: "dial_attempt", content: `${ref.label}: недозвон #${dialFails}`, outcome: "dial_fail", at: new Date().toISOString() }]);

      if (dialFails >= 3) {
        // 3 failed dials — NOW mark touch as done (exhausted), advance
        up("touches", p => p.map(t => t.id === tid ? { ...t, status: "done", done: d, outcome: "dial_fail", note: `${dialFails} недозвонов`, dial_fails: dialFails } : t));
        // Adapt next touch if needed
        const scheduled = data.touches.filter(t => t.lead_id === lid && t.status === "scheduled" && t.id !== tid);
        if (scheduled.length > 0) {
          const next = scheduled.sort((a, b) => (a.num || 0) - (b.num || 0))[0];
          if ((next.type === "proposal" || next.type === "email") && !canSendKP) {
            up("touches", p => p.map(t => t.id === next.id ? {
              ...t, type: "call",
              label: "Повторный звонок (вместо КП)",
              desc: "Нет email/маршрута — сначала дозвонись",
              hint: "Цель: узнать email, порт, город. Без данных КП нельзя.",
            } : t));
          }
        } else if (ref.num >= 6) {
          up("leads", p => p.map(l => l.id === lid ? { ...l, status: "frozen", frozen_reason: "Не удалось дозвониться", frozen_date: d } : l));
        }
      } else {
        // Reschedule SAME touch for tomorrow — don't mark as done
        up("touches", p => p.map(t => t.id === tid ? { ...t, date: addDays(d, 1), dial_fails: dialFails } : t));
      }
      return; // Exit — don't run steps 1-2-3
    }

    // 1. Mark touch as done
    up("touches", p => p.map(t => t.id === tid ? { ...t, status: "done", done: d, outcome, note } : t));

    // 2. Log activity
    up("activities", p => [...p, { id: uid(), lead_id: lid, type: "touch", content: `${ref.label}: ${note}`, outcome, at: new Date().toISOString() }]);

    // 3. Handle outcome-specific logic
    if (outcome === "interested") {
      up("touches", p => p.map(t => t.lead_id === lid && t.status === "scheduled" && t.id !== tid ? { ...t, status: "cancelled" } : t));
      up("leads", p => p.map(l => l.id === lid ? { ...l, status: "negotiation" } : l));
    }

    else if (outcome === "sent") {
      // Proposal/email sent — just advance status if needed, no outcome question
      if (lead && lead.status === "qualified") {
        up("leads", p => p.map(l => l.id === lid ? { ...l, status: "proposal_sent" } : l));
      }
    }

    else if (outcome === "objection" && extra.objectionKey) {
      up("leads", p => p.map(l => l.id === lid ? { ...l, objections: extra.objectionKey, last_objection: extra.objectionKey, last_objection_date: d } : l));
      const obj = OBJECTION_TREE[extra.objectionKey];
      if (obj && obj.nextAction) {
        const na = obj.nextAction;
        // If next action is proposal but can't send — switch to call
        const actualType = (na.type === "proposal" && !canSendKP) ? "call" : na.type;
        const actualLabel = (na.type === "proposal" && !canSendKP) ? "Узнать email + маршрут" : na.label;
        up("touches", p => [...p, {
          id: uid(), lead_id: lid, num: maxNum() + 0.5,
          type: actualType, label: actualLabel,
          desc: `Авто: после «${extra.objectionKey}»`,
          hint: (na.type === "proposal" && !canSendKP) ? "Узнай email и маршрут чтобы отправить расчёт." : obj.laer.respond,
          challenger: "", spin_focus: null,
          date: addDays(d, na.days), done: null, status: "scheduled", outcome: null, note: "",
        }]);
      }
    }

    else if (outcome === "callback" && extra.callbackDays) {
      up("touches", p => [...p, {
        id: uid(), lead_id: lid, num: maxNum() + 0.5,
        type: "call", label: "Перезвон",
        desc: note || "Клиент просил перезвонить",
        hint: "Перезвони как договаривались. Напомни о чём говорили.",
        challenger: "", spin_focus: null,
        date: addDays(d, extra.callbackDays), done: null, status: "scheduled", outcome: null, note: "",
      }]);
    }

    else if (outcome === "no_answer") {
      const allTouches = data.touches.filter(t => t.lead_id === lid);
      const scheduled = allTouches.filter(t => t.status === "scheduled" && t.id !== tid);

      // ADAPTIVE: if next scheduled touch is proposal/email but no email/routes — replace with call
      if (scheduled.length > 0) {
        const next = scheduled.sort((a, b) => (a.num || 0) - (b.num || 0))[0];
        if ((next.type === "proposal" || next.type === "email") && !canSendKP) {
          up("touches", p => p.map(t => t.id === next.id ? {
            ...t,
            type: "call",
            label: next.type === "proposal" ? "Повторный звонок (вместо КП)" : "Повторный звонок (вместо email)",
            desc: "Нет email/маршрута — сначала дозвонись",
            hint: "Цель: узнать email, порт, город доставки. Без этих данных КП отправить нельзя.",
          } : t));
        }
      }

      // Auto-freeze after last touch
      if (scheduled.length === 0 && ref.num >= 6) {
        up("leads", p => p.map(l => l.id === lid ? { ...l, status: "frozen", frozen_reason: `${ref.num} касаний без ответа`, frozen_date: d } : l));
      }
    }

    else if (outcome === "rejected") {
      const action = extra.rejectAction || "frozen";
      const reason = extra.rejectReason || "unknown";
      up("touches", p => p.map(t => t.lead_id === lid && t.status === "scheduled" && t.id !== tid ? { ...t, status: "cancelled" } : t));
      if (action === "lost") {
        up("leads", p => p.map(l => l.id === lid ? { ...l, status: "lost", lost_reason: reason, lost_date: d } : l));
      } else {
        up("leads", p => p.map(l => l.id === lid ? { ...l, status: "frozen", frozen_reason: note || reason, frozen_date: d } : l));
      }
    }

    else if (outcome === "redirect") {
      // ЛПР сменился / переадресация на общую почту
      // Touch is done (counted in KPI), create email task for today
      up("touches", p => [...p, {
        id: uid(), lead_id: lid, num: maxNum() + 0.5,
        type: "email", label: "Email на общую почту",
        desc: "Отправить письмо-представление (шаблон logistics_intro)",
        hint: "Используй шаблон «Письмо для отдела логистики» из карточки лида. После отправки — задача звонок через 2 дня.",
        challenger: "", spin_focus: null,
        date: d, done: null, status: "scheduled", outcome: null, note: "",
      }]);
      // Save redirect info in lead
      if (extra.newEmail) {
        up("leads", p => p.map(l => l.id === lid ? {
          ...l,
          redirect_email: extra.newEmail,
          emails_raw: [...new Set([...(l.emails_raw || []), extra.newEmail])],
          emails_kp: [...new Set([...(l.emails_kp || []), extra.newEmail])],
        } : l));
      }
      if (extra.redirectNote) {
        up("activities", p => [...p, { id: uid(), lead_id: lid, type: "note", content: `Переадресация: ${extra.redirectNote}`, outcome: "redirect", at: new Date().toISOString() }]);
      }
    }

  }, [data.touches, data.leads, up]);

  // ─── Auto-unfreeze after 30 days → REACTIVATION touches (not standard 7) ───
  useEffect(() => {
    if (!ready) return;
    const d = today();
    data.leads.forEach(l => {
      if (l.status === "frozen" && l.frozen_date && addDays(l.frozen_date, 30) <= d) {
        // Unfreeze
        up("leads", p => p.map(x => x.id === l.id ? { ...x, status: "new", unfrozen_date: d, frozen_reason: (x.frozen_reason||"") + " → разморожен " + d } : x));
        // Create REACTIVATION touches (3 instead of 7)
        const rTouches = REACTIVATION_TPL.map(t => ({
          id: uid(), lead_id: l.id, num: 100 + t.n, // high num to not conflict
          type: t.type, label: t.label, desc: t.desc, hint: t.hint || "",
          challenger: t.challenger || "", spin_focus: t.spin_focus || null,
          date: addDays(d, t.day), done: null, status: "scheduled", outcome: null, note: "",
        }));
        up("touches", p => [...p, ...rTouches]);
      }
    });
  }, [ready]);

  // ─── Auto-tasks when rates change — real comparison per variant ───
  useEffect(() => {
    if (!ready || !data.freight || data.freight.length === 0) return;
    const d = today();
    const activeStatuses = ["proposal_sent", "negotiation", "frozen"];
    data.leads.forEach(l => {
      if (!activeStatuses.includes(l.status)) return;
      // Check if we already have a scheduled rate-update task
      const recentRateTask = data.touches.some(t =>
        t.lead_id === l.id && t.label?.startsWith("Обновить ставку") && t.status === "scheduled"
      );
      if (recentRateTask) return;
      // Find last sent KP with rate snapshot
      const lastKP = data.proposals
        .filter(p => p.lead_id === l.id && p.status === "sent" && p.rateSnapshot)
        .sort((a, b) => (b.sent || b.created || "").localeCompare(a.sent || a.created || ""))[0];
      if (!lastKP) return;
      const kpDate = (lastKP.sent || lastKP.created || "").slice(0, 10);
      // Only check if KP was sent > 14 days ago
      if (!kpDate || addDays(kpDate, RATE_CHECK_INTERVAL_DAYS) > d) return;
      // Check last done rate-update
      const lastDone = data.touches
        .filter(t => t.lead_id === l.id && t.label?.startsWith("Обновить ставку") && t.done)
        .sort((a, b) => b.done.localeCompare(a.done))[0];
      if (lastDone && addDays(lastDone.done, RATE_CHECK_INTERVAL_DAYS) > d) return;
      // Compare each variant with current rates
      const changes = [];
      (lastKP.rateSnapshot || []).forEach(snap => {
        if (!snap.port || !snap.city) return;
        try {
          const ctype = (snap.ctype || "40HC").includes("20") ? "20" : "40";
          const results = calcChain(
            { freight: data.freight, boxes: data.boxes, drops: data.drops, railway: data.railway, autoMsk: data.autoMsk, customAuto: data.customAuto, settings: data.settings || {} },
            { pol: snap.port, city: snap.city, ctype, weight: 22 }
          );
          if (results.length > 0) {
            const best = results[0];
            const oldF = snap.freightBase || 0;
            const newF = best.isRubFreight ? 0 : best.totalFreightUsd;
            const oldR = snap.railwayBase || 0;
            const newR = best.rwBase;
            if (newF < oldF) changes.push(`${snap.port}→${snap.city}: фрахт $${oldF}→$${newF}`);
            if (newR < oldR) changes.push(`${snap.port}→${snap.city}: ЖД ${oldR.toLocaleString("ru")}→${newR.toLocaleString("ru")}₽`);
          }
        } catch {}
      });
      // Create task with details of what changed
      const desc = changes.length > 0
        ? "Ставки снизились: " + changes.slice(0, 3).join("; ")
        : "Прошло " + RATE_CHECK_INTERVAL_DAYS + " дней с последнего КП. Проверь ставки.";
      up("touches", p => [...p, {
        id: uid(), lead_id: l.id, num: 200,
        type: "proposal", label: changes.length > 0 ? "Обновить ставку — дешевле!" : "Обновить ставку",
        desc,
        hint: changes.length > 0
          ? "Ставка реально снизилась. Отправь обновлённый расчёт с пометкой — клиент оценит."
          : "Пересчитай ставку. Если изменилась — отправь обновлённый расчёт.",
        challenger: "", spin_focus: null,
        date: d, done: null, status: "scheduled", outcome: null, note: "",
      }]);
    });
  }, [ready, data.freight]);

  const goToKP = (calcResult) => { setKpFromCalc(calcResult); setTab("proposals"); };
  const goToKPFromLead = ({ leadId, routes }) => { setKpFromCalc({ fromLead: true, leadId, routes }); setTab("proposals"); };

  if (!ready) return <div style={{ padding: 60, textAlign: "center", color: "var(--color-text-tertiary)", fontFamily: "system-ui" }}>Загрузка...</div>;

  const importRates = (rd) => {
    setData(prev => ({ ...prev, freight: rd.freight, boxes: rd.boxes, drops: rd.drops, railway: rd.railway, autoMsk: rd.autoMsk }));
    save(KEYS.freight, rd.freight); save(KEYS.boxes, rd.boxes); save(KEYS.drops, rd.drops); save(KEYS.railway, rd.railway); save(KEYS.autoMsk, rd.autoMsk);
    up("settings", prev => ({ ...prev, ratesLoadedAt: new Date().toISOString(), ratesCount: rd.freight.length }));
  };

  const ctx = { ...data, up, mkTouches, doTouch, sel, setSel, setTab, importRates, onLogout, goToKP, goToKPFromLead, kpFromCalc, setKpFromCalc, logoB64 };
  const taskCnt = data.touches.filter(t => t.status === "scheduled" && t.date <= today()).length;
  const tabs = [["dashboard", "Мой день", taskCnt], ["leads", "Лиды", data.leads.length], ["analytics", "Аналитика", 0], ["rates", "Ставки", data.freight.length], ["calculator", "Калькулятор", 0], ["proposals", "КП", data.proposals.length], ["patterns", "Паттерны", 0], ["settings", "Настройки", 0]];

  return (
    <div style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontSize: 13, color: "var(--color-text-primary)", minHeight: "100vh", background: "var(--color-background-tertiary)", padding: "0" }}>
      <div style={{ background: "var(--color-background-primary)", borderBottom: "0.5px solid var(--color-border-tertiary)", padding: "10px 16px 10px", marginBottom: 16, borderRadius: "0 0 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.3px" }}>BML</div>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", fontWeight: 400 }}>Sales Panel</div>
          <span style={{ fontSize: 9, color: "var(--color-text-tertiary)", background: "var(--color-background-secondary)", padding: "1px 6px", borderRadius: 4, marginLeft: 2 }}>v4.6.1</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
            <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "var(--color-text-tertiary)", fontFamily: "inherit" }} onClick={() => { if (confirm("Выйти из CRM?")) { setApiKey(""); onLogout(); } }}>Выйти ↗</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          {tabs.map(([id, label, count]) => (
            <button key={id} onClick={() => { setTab(id); setSel(null); }} style={{
              display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8,
              border: "none", cursor: "pointer", fontSize: 12, fontFamily: "inherit",
              background: tab === id ? "var(--color-background-tertiary)" : "transparent",
              color: tab === id ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              fontWeight: tab === id ? 600 : 400, transition: "all 0.12s",
            }}>
              {label}
              {count > 0 && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, fontWeight: 600, background: id === "dashboard" ? "#E24B4A" : "var(--color-border-tertiary)", color: id === "dashboard" ? "#fff" : "var(--color-text-secondary)" }}>{count}</span>}
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding: "0 12px 20px" }}>
        {tab === "dashboard" && <Dashboard {...ctx} />}
        {tab === "leads" && (sel ? <LeadDetail {...ctx} /> : <LeadsList {...ctx} />)}
        {tab === "analytics" && <AnalyticsTab {...ctx} />}
        {tab === "rates" && <RatesTab {...ctx} />}
        {tab === "calculator" && <CalcTab {...ctx} />}
        {tab === "proposals" && <ProposalsTab {...ctx} />}
        {tab === "patterns" && <PatternsTab {...ctx} />}
        {tab === "settings" && <SettingsTab {...ctx} />}
      </div>
    </div>
  );
}
