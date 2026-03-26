import React, { useState, useEffect, useCallback } from 'react';
import { load, save, setApiKey } from '../api.js';
import { KEYS, TOUCHES_TPL, OBJECTION_TREE, LOGO_URL, C } from '../constants.js';
import { uid, today, addDays, calcGrade } from '../utils.js';
import { Dashboard } from './Dashboard.jsx';
import { LeadsList } from './LeadsList.jsx';
import { LeadDetail } from './LeadDetail.jsx';
import { RatesTab } from './RatesTab.jsx';
import { CalcTab } from './CalcTab.jsx';
import { ProposalsTab } from './ProposalsTab.jsx';
import { PatternsTab } from './PatternsTab.jsx';
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
    const max = grade === "A" ? 7 : grade === "B" ? 2 : 0;
    const ts = TOUCHES_TPL.slice(0, max).map(t => ({
      id: uid(), lead_id: lid, num: t.n, type: t.type, label: t.label, desc: t.desc, hint: t.hint || "",
      challenger: t.challenger || "", spin_focus: t.spin_focus || null,
      date: addDays(start || today(), t.day), done: null, status: "scheduled", outcome: null, note: "",
    }));
    up("touches", p => [...p, ...ts]);
  }, [up]);

  // ─── NEW doTouch — Sales Navigator logic ───
  const doTouch = useCallback((tid, outcome, note, extra = {}) => {
    const ref = data.touches.find(t => t.id === tid);
    if (!ref) return;
    const lid = ref.lead_id;
    const d = today();

    // 1. Mark touch as done
    up("touches", p => p.map(t => t.id === tid ? { ...t, status: "done", done: d, outcome, note } : t));

    // 2. Log activity
    up("activities", p => [...p, { id: uid(), lead_id: lid, type: "touch", content: `${ref.label}: ${note}`, outcome, at: new Date().toISOString() }]);

    // 3. Handle outcome-specific logic
    if (outcome === "interested") {
      // Cancel remaining touches, advance status
      up("touches", p => p.map(t => t.lead_id === lid && t.status === "scheduled" && t.id !== tid ? { ...t, status: "cancelled" } : t));
      up("leads", p => p.map(l => l.id === lid ? { ...l, status: "negotiation" } : l));
    }

    else if (outcome === "objection" && extra.objectionKey) {
      // Save objection on lead
      up("leads", p => p.map(l => l.id === lid ? { ...l, objections: extra.objectionKey, last_objection: extra.objectionKey, last_objection_date: d } : l));
      // Create auto-task from objection tree
      const obj = OBJECTION_TREE[extra.objectionKey];
      if (obj && obj.nextAction) {
        const na = obj.nextAction;
        const maxNum = data.touches.filter(t => t.lead_id === lid).reduce((m, t) => Math.max(m, t.num || 0), 0);
        up("touches", p => [...p, {
          id: uid(), lead_id: lid, num: maxNum + 0.5, // insert between existing
          type: na.type, label: na.label,
          desc: `Авто: после «${extra.objectionKey}»`,
          hint: obj.laer.respond,
          challenger: "", spin_focus: null,
          date: addDays(d, na.days), done: null, status: "scheduled", outcome: null, note: "",
        }]);
      }
    }

    else if (outcome === "callback" && extra.callbackDays) {
      // Create callback task
      const maxNum = data.touches.filter(t => t.lead_id === lid).reduce((m, t) => Math.max(m, t.num || 0), 0);
      up("touches", p => [...p, {
        id: uid(), lead_id: lid, num: maxNum + 0.5,
        type: "call", label: "Перезвон",
        desc: note || "Клиент просил перезвонить",
        hint: "Перезвони как договаривались. Напомни о чём говорили.",
        challenger: "", spin_focus: null,
        date: addDays(d, extra.callbackDays), done: null, status: "scheduled", outcome: null, note: "",
      }]);
    }

    else if (outcome === "no_answer") {
      // Auto-freeze after last touch without answer
      const allTouches = data.touches.filter(t => t.lead_id === lid);
      const maxNum = allTouches.reduce((m, t) => Math.max(m, t.num || 0), 0);
      const scheduled = allTouches.filter(t => t.status === "scheduled" && t.id !== tid);
      if (scheduled.length === 0 && ref.num >= 6) {
        up("leads", p => p.map(l => l.id === lid ? { ...l, status: "frozen", frozen_reason: `${ref.num} касаний без ответа`, frozen_date: d } : l));
      }
    }

    else if (outcome === "rejected") {
      const action = extra.rejectAction || "frozen";
      const reason = extra.rejectReason || "unknown";
      // Cancel remaining touches
      up("touches", p => p.map(t => t.lead_id === lid && t.status === "scheduled" && t.id !== tid ? { ...t, status: "cancelled" } : t));
      if (action === "lost") {
        up("leads", p => p.map(l => l.id === lid ? { ...l, status: "lost", lost_reason: reason, lost_date: d } : l));
      } else {
        up("leads", p => p.map(l => l.id === lid ? { ...l, status: "frozen", frozen_reason: note || reason, frozen_date: d } : l));
      }
    }

  }, [data.touches, up]);

  // Auto-unfreeze after 30 days
  useEffect(() => {
    if (!ready) return;
    const d = today();
    data.leads.forEach(l => {
      if (l.status === "frozen" && l.frozen_date && addDays(l.frozen_date, 30) <= d)
        up("leads", p => p.map(x => x.id === l.id ? { ...x, status: "new", unfrozen_date: d, frozen_reason: (x.frozen_reason||"") + " → разморожен " + d } : x));
    });
  }, [ready]);

  const goToKP = (calcResult) => { setKpFromCalc(calcResult); setTab("proposals"); };
  const goToKPFromLead = ({ leadId, routes }) => { setKpFromCalc({ fromLead: true, leadId, routes }); setTab("proposals"); };

  if (!ready) return <div style={{ padding: 60, textAlign: "center", color: "var(--color-text-tertiary)", fontFamily: "system-ui" }}>Загрузка...</div>;

  const importRates = (rd) => {
    setData(prev => ({ ...prev, freight: rd.freight, boxes: rd.boxes, drops: rd.drops, railway: rd.railway, autoMsk: rd.autoMsk }));
    save(KEYS.freight, rd.freight); save(KEYS.boxes, rd.boxes); save(KEYS.drops, rd.drops); save(KEYS.railway, rd.railway); save(KEYS.autoMsk, rd.autoMsk);
  };

  const ctx = { ...data, up, mkTouches, doTouch, sel, setSel, setTab, importRates, onLogout, goToKP, goToKPFromLead, kpFromCalc, setKpFromCalc, logoB64 };
  const taskCnt = data.touches.filter(t => t.status === "scheduled" && t.date <= today()).length;
  const tabs = [["dashboard", "Мой день", taskCnt], ["leads", "Лиды", data.leads.length], ["rates", "Ставки", data.freight.length], ["calculator", "Калькулятор", 0], ["proposals", "КП", data.proposals.length], ["patterns", "Паттерны", 0], ["settings", "Настройки", 0]];

  return (
    <div style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontSize: 13, color: "var(--color-text-primary)", minHeight: "100vh", background: "var(--color-background-tertiary)", padding: "0" }}>
      <div style={{ background: "var(--color-background-primary)", borderBottom: "0.5px solid var(--color-border-tertiary)", padding: "10px 16px 10px", marginBottom: 16, borderRadius: "0 0 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.3px" }}>BML</div>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", fontWeight: 400 }}>Sales Panel</div>
          <span style={{ fontSize: 9, color: "var(--color-text-tertiary)", background: "var(--color-background-secondary)", padding: "1px 6px", borderRadius: 4, marginLeft: 2 }}>v4.1.0</span>
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
        {tab === "rates" && <RatesTab {...ctx} />}
        {tab === "calculator" && <CalcTab {...ctx} />}
        {tab === "proposals" && <ProposalsTab {...ctx} />}
        {tab === "patterns" && <PatternsTab {...ctx} />}
        {tab === "settings" && <SettingsTab {...ctx} />}
      </div>
    </div>
  );
}
