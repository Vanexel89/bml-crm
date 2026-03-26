import React, { useState, useEffect, useCallback } from 'react';
import { load, save, setApiKey } from '../api.js';
import { KEYS, TOUCHES_TPL, LOGO_URL, C } from '../constants.js';
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
      date: addDays(start || today(), t.day), done: null, status: "scheduled", outcome: null, note: "",
    }));
    up("touches", p => [...p, ...ts]);
  }, [up]);

  const doTouch = useCallback((tid, outcome, note) => {
    let ref = data.touches.find(t => t.id === tid);
    up("touches", p => p.map(t => t.id === tid ? { ...t, status: "done", done: today(), outcome, note } : t));
    if (ref) {
      up("activities", p => [...p, { id: uid(), lead_id: ref.lead_id, type: "touch", content: `${ref.label}: ${note}`, outcome, at: new Date().toISOString() }]);
      if (outcome === "interested") {
        up("touches", p => p.map(t => t.lead_id === ref.lead_id && t.status === "scheduled" && t.id !== tid ? { ...t, status: "cancelled" } : t));
        up("leads", p => p.map(l => l.id === ref.lead_id ? { ...l, status: "negotiation" } : l));
      }
      if (ref.num === 7 && outcome === "no_answer") {
        up("leads", p => p.map(l => l.id === ref.lead_id ? { ...l, status: "frozen", frozen_reason: "7 касаний без ответа", frozen_date: today() } : l));
      }
      if (ref.num === 6 && outcome === "no_answer") {
        const has7 = data.touches.some(t => t.lead_id === ref.lead_id && t.num === 7);
        if (!has7) up("leads", p => p.map(l => l.id === ref.lead_id ? { ...l, status: "frozen", frozen_reason: "6 касаний без ответа", frozen_date: today() } : l));
      }
    }
  }, [data.touches, up]);

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
          <span style={{ fontSize: 9, color: "var(--color-text-tertiary)", background: "var(--color-background-secondary)", padding: "1px 6px", borderRadius: 4, marginLeft: 2 }}>v4.0.0</span>
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
