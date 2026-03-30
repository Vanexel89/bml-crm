import React, { useState, useMemo } from 'react';
import { Badge, Chip, Combobox } from './ui.jsx';
import { TouchRow } from './TouchRow.jsx';
import { AIPanel } from './AIPanel.jsx';
import { C, STATUS, GRADE, OBJECTION_TREE, OBJECTION_SCRIPTS, SPIN_QUESTIONS, CHALLENGER_INSIGHTS, OUTCOMES, EMAIL_TEMPLATES, EMAIL_SIGNATURE } from '../constants.js';
import { uid, today, fmt, fmtFull, addDays, calcGrade } from '../utils.js';
import { apiCall } from '../api.js';
import { calcChain } from '../rates/calcChain.js';
import { formatKPVariant, roundUsd, roundRub } from '../kp/buildKPEmail.js';

export function LeadDetail({ leads, touches, activities, proposals, up, doTouch, mkTouches, sel, setSel, setTab, freight, boxes, drops, railway, autoMsk, customAuto, settings, goToKPFromLead, logoB64 }) {
  const lead = leads.find(l => l.id === sel);
  const lt = useMemo(() => touches.filter(t => t.lead_id === sel).sort((a, b) => (a.num || 0) - (b.num || 0)), [touches, sel]);
  const la = useMemo(() => activities.filter(a => a.lead_id === sel).sort((a, b) => new Date(b.at) - new Date(a.at)), [activities, sel]);
  const [noteText, setNoteText] = useState("");
  const [editing, setEditing] = useState(false);
  const [ef, setEf] = useState({});
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newEmailCc, setNewEmailCc] = useState("");
  const [newRoute, setNewRoute] = useState({ port: "", city: "", ctype: "40HC", weight_kg: "" });
  const [selectedRoutes, setSelectedRoutes] = useState(new Set());
  const [spinOpen, setSpinOpen] = useState(null); // which SPIN tab is open
  const [objOpen, setObjOpen] = useState(false); // objection tree open
  const [emailDraft, setEmailDraft] = useState(null); // { subject, body, to }
  const [emailSending, setEmailSending] = useState(false);

  const toggleRoute = (i) => setSelectedRoutes(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const selectAllRoutes = () => { if (selectedRoutes.size === (lead?.routes||[]).length) setSelectedRoutes(new Set()); else setSelectedRoutes(new Set((lead?.routes||[]).map((_,i) => i))); };
  const hasRates = freight && freight.length > 0;

  const polOptions = useMemo(() => [...new Set((freight || []).map(r => r.pol))].sort(), [freight]);
  const cityOptions = useMemo(() => [...new Set((railway || []).map(r => r.city))].sort(), [railway]);

  if (!lead) return <div style={C.empty}>Не найден</div>;

  const addNote = () => { if (!noteText.trim()) return; up("activities", p => [...p, { id: uid(), lead_id: sel, type: "note", content: noteText, at: new Date().toISOString() }]); setNoteText(""); };
  const addPhone = () => { if (!newPhone.trim()) return; up("leads", p => p.map(l => l.id === sel ? { ...l, phones_contact: [...(l.phones_contact || []), newPhone.trim()] } : l)); setNewPhone(""); };
  const rmPhone = (i) => up("leads", p => p.map(l => l.id === sel ? { ...l, phones_contact: (l.phones_contact || []).filter((_, j) => j !== i) } : l));
  const addEmail = () => { if (!newEmail.trim()) return; up("leads", p => p.map(l => l.id === sel ? { ...l, emails_kp: [...(l.emails_kp || []), newEmail.trim()] } : l)); setNewEmail(""); };
  const rmEmail = (i) => up("leads", p => p.map(l => l.id === sel ? { ...l, emails_kp: (l.emails_kp || []).filter((_, j) => j !== i) } : l));
  const addEmailCc = () => { if (!newEmailCc.trim()) return; up("leads", p => p.map(l => l.id === sel ? { ...l, emails_cc: [...(l.emails_cc || []), newEmailCc.trim()] } : l)); setNewEmailCc(""); };
  const rmEmailCc = (i) => up("leads", p => p.map(l => l.id === sel ? { ...l, emails_cc: (l.emails_cc || []).filter((_, j) => j !== i) } : l));
  const addRoute = () => { if (!newRoute.port && !newRoute.city) return; up("leads", p => p.map(l => l.id === sel ? { ...l, routes: [...(l.routes || []), { ...newRoute }] } : l)); setNewRoute({ port: "", city: "", ctype: "40HC", weight_kg: "" }); };
  const rmRoute = (i) => up("leads", p => p.map(l => l.id === sel ? { ...l, routes: (l.routes || []).filter((_, j) => j !== i) } : l));

  // SPIN data from lead
  const spinData = lead.spin || {};
  const updateSpin = (cat, val) => up("leads", p => p.map(l => l.id === sel ? { ...l, spin: { ...(l.spin || {}), [cat]: val } } : l));

  return (
    <div>
      <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 12, fontFamily: "inherit", marginBottom: 10, padding: 0 }} onClick={() => setSel(null)}>← Назад</button>

      {/* Header card */}
      <div style={C.card}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.3px" }}>{lead.company_name}</div>
            {lead.company_name_full && lead.company_name_full !== lead.company_name && <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{lead.company_name_full}</div>}
            <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
              <Badge color={GRADE[lead.grade]?.c} bg={GRADE[lead.grade]?.bg}>Грейд {lead.grade}</Badge>
              <Badge color={STATUS[lead.status]?.c} bg={STATUS[lead.status]?.bg}>{STATUS[lead.status]?.l}</Badge>
              {lead.volume_monthly > 0 && <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{lead.volume_monthly} конт/мес</span>}
              {lead.inn && <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>ИНН {lead.inn}</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button style={C.btn()} onClick={() => { setEf({ contact_name: lead.contact_name || "", greeting_name: lead.greeting_name || "", volume_monthly: lead.volume_monthly || "", routes_match: lead.routes_match || "unknown", payment_terms: lead.payment_terms || "unknown", goods: lead.goods || "", website: lead.website || "" }); setEditing(true); }}>Ред.</button>
            <select style={{ ...C.sel, fontSize: 11 }} value={lead.status} onChange={e => up("leads", p => p.map(l => l.id === sel ? { ...l, status: e.target.value } : l))}>
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
            </select>
          </div>
        </div>
        {lead.contact_name && <div style={{ fontSize: 12, marginTop: 8 }}>ЛПР: <strong>{lead.contact_name}</strong> {lead.website && <span style={{ color: "var(--color-text-tertiary)" }}>| {lead.website}</span>}</div>}
        {/* Greeting name — always visible and editable */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
          <span style={{ fontSize: 11, color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>Обращение:</span>
          <input style={{ ...C.inp, width: 160, fontSize: 12, padding: "4px 8px" }} value={lead.greeting_name || ""} placeholder="Елена, Димитрий..."
            onChange={e => up("leads", p => p.map(l => l.id === sel ? { ...l, greeting_name: e.target.value } : l))} />
          <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>→ «{lead.greeting_name || "—"}, добрый день.»</span>
        </div>
        {lead.comment && <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 4, fontStyle: "italic" }}>{lead.comment}</div>}

        {/* Active objection display with LAER */}
        {(() => {
          const objKey = lead.objections;
          const obj = objKey ? OBJECTION_TREE[objKey] : null;
          const objKeys = Object.keys(OBJECTION_TREE);
          const clearObj = () => up("leads", p => p.map(l => l.id === sel ? { ...l, objections: null, last_objection: null } : l));
          const setObj = (k) => up("leads", p => p.map(l => l.id === sel ? { ...l, objections: k || null, last_objection: k || l.last_objection, last_objection_date: k ? new Date().toISOString().slice(0, 10) : l.last_objection_date } : l));

          if (!objKey) return (
            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <select style={{ ...C.sel, fontSize: 11, padding: "3px 6px", width: "auto" }} value="" onChange={e => setObj(e.target.value)}>
                <option value="">+ Возражение...</option>
                {objKeys.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
          );

          if (!obj) {
            const matches = Object.entries(OBJECTION_SCRIPTS).filter(([k]) => objKey.toLowerCase().includes(k.toLowerCase()));
            return (<div style={{ marginTop: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Badge color="#854F0B" bg="#FAEEDA">⚡ {objKey}</Badge>
                <select style={{ ...C.sel, fontSize: 10, padding: "2px 4px", width: "auto" }} value={objKey} onChange={e => setObj(e.target.value)}>
                  <option value="">— Снять —</option>
                  {objKeys.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              {matches.map(([k,v]) => (
                <div key={k} style={{ padding: "8px 12px", background: "#FEFCE8", border: "0.5px solid #FDE68A", borderRadius: 8, fontSize: 12 }}>
                  <div style={{ color: "var(--color-text-primary)", marginBottom: 3 }}>{v.reply}</div>
                  <div style={{ color: "#854F0B", fontStyle: "italic", fontSize: 11 }}>💡 {v.tip}</div>
                </div>
              ))}
            </div>);
          }

          return (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }} onClick={() => setObjOpen(!objOpen)}>
                  <Badge color="#854F0B" bg="#FAEEDA">⚡ {objKey}</Badge>
                  <span style={{ fontSize: 11, color: "#854F0B" }}>{objOpen ? "▼" : "▶"} LAER-скрипт</span>
                </div>
                <select style={{ ...C.sel, fontSize: 10, padding: "2px 4px", width: "auto", marginLeft: 4 }} value={objKey} onChange={e => setObj(e.target.value)}>
                  <option value="">— Снять —</option>
                  {objKeys.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              {objOpen && (
                <div style={{ marginTop: 6, padding: "10px 12px", background: "#FEFCE8", border: "0.5px solid #FDE68A", borderRadius: 8 }}>
                  {["listen", "acknowledge", "explore", "respond"].map((step, i) => (
                    <div key={step} style={{ marginBottom: i < 3 ? 8 : 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: ["#185FA5", "#0F6E56", "#D85A30", "#534AB7"][i], marginBottom: 2 }}>
                        {["L: Выслушай", "A: Согласись", "E: Исследуй", "R: Ответь"][i]}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--color-text-primary)", lineHeight: 1.4 }}>{obj.laer[step]}</div>
                    </div>
                  ))}
                  {obj.fallback && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: "0.5px solid #FDE68A", fontSize: 11, color: "#854F0B" }}>💡 Если не сработало: {obj.fallback}</div>
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Edit form */}
      {editing && (
        <div style={{ ...C.card, background: "var(--color-background-secondary)", border: "none" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><div style={C.lbl}>Контакт (ФИО)</div><input style={C.inp} value={ef.contact_name} onChange={e => setEf(p => ({ ...p, contact_name: e.target.value }))} placeholder="Рябчук Елена Михайловна" /></div>
            <div><div style={C.lbl}>Обращение (для писем)</div><input style={C.inp} value={ef.greeting_name} onChange={e => setEf(p => ({ ...p, greeting_name: e.target.value }))} placeholder="Елена" /></div>
            <div><div style={C.lbl}>Товар / груз</div><input style={C.inp} value={ef.goods} onChange={e => setEf(p => ({ ...p, goods: e.target.value }))} placeholder="оксиды, химия" /></div>
            <div><div style={C.lbl}>Сайт</div><input style={C.inp} value={ef.website} onChange={e => setEf(p => ({ ...p, website: e.target.value }))} placeholder="company.ru" /></div>
            <div><div style={C.lbl}>Конт/мес</div><input style={C.inp} type="number" value={ef.volume_monthly} onChange={e => setEf(p => ({ ...p, volume_monthly: e.target.value }))} /></div>
            <div><div style={C.lbl}>Оплата</div><select style={{ ...C.sel, width: "100%" }} value={ef.payment_terms} onChange={e => setEf(p => ({ ...p, payment_terms: e.target.value }))}><option value="prepay">Предоплата</option><option value="standard">Стандарт</option><option value="deferred">Отсрочка</option><option value="unknown">Не знаю</option></select></div>
            <div><div style={C.lbl}>Направления</div><select style={{ ...C.sel, width: "100%" }} value={ef.routes_match} onChange={e => setEf(p => ({ ...p, routes_match: e.target.value }))}><option value="yes">Да</option><option value="partial">Частично</option><option value="no">Нет</option><option value="unknown">Не знаю</option></select></div>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8, justifyContent: "flex-end" }}>
            <button style={C.btn()} onClick={() => setEditing(false)}>Отмена</button>
            <button style={C.btn(true)} onClick={() => { const g = calcGrade({ volume_monthly: Number(ef.volume_monthly), routes_match: ef.routes_match, payment_terms: ef.payment_terms }); up("leads", p => p.map(l => l.id === sel ? { ...l, contact_name: ef.contact_name, greeting_name: ef.greeting_name, goods: ef.goods, website: ef.website, volume_monthly: Number(ef.volume_monthly) || l.volume_monthly, routes_match: ef.routes_match, payment_terms: ef.payment_terms, grade: g } : l)); setEditing(false); }}>Сохранить</button>
          </div>
        </div>
      )}

      {/* ═══ TWO-COLUMN LAYOUT ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        {/* LEFT COLUMN: Info + SPIN + Routes */}
        <div>
          {/* Phones & Emails with checkboxes */}
          <div style={C.card}>
            <div style={C.lbl}>Телефоны <span style={{ color: "var(--color-text-tertiary)", fontWeight: 400 }}>— отметь рабочий</span></div>
            {(() => {
              const allPhones = [...new Set([...(lead.phones_raw || []), ...(lead.phones_contact || [])])].filter(Boolean);
              const active = new Set(lead.phones_active || []);
              const toggle = (ph) => {
                const next = new Set(active);
                next.has(ph) ? next.delete(ph) : next.add(ph);
                up("leads", p => p.map(l => l.id === sel ? { ...l, phones_active: [...next] } : l));
              };
              return allPhones.length > 0 ? (
                <div style={{ marginBottom: 6 }}>
                  {allPhones.map((ph, i) => (
                    <label key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0", fontSize: 12, cursor: "pointer" }}>
                      <input type="checkbox" checked={active.has(ph)} onChange={() => toggle(ph)} />
                      <span style={{ color: active.has(ph) ? "var(--color-text-primary)" : "var(--color-text-tertiary)" }}>{ph}</span>
                      {active.has(ph) && <span style={{ fontSize: 10, color: "#3B6D11" }}>рабочий</span>}
                    </label>
                  ))}
                </div>
              ) : <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 6 }}>Нет телефонов</div>;
            })()}
            <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
              <input style={{ ...C.inp, width: 140 }} placeholder="+7..." value={newPhone} onChange={e => setNewPhone(e.target.value)} onKeyDown={e => e.key === "Enter" && addPhone()} />
              <button style={{ ...C.btn(), padding: "5px 8px" }} onClick={addPhone}>+</button>
            </div>

            <div style={C.lbl}>Email <span style={{ color: "var(--color-text-tertiary)", fontWeight: 400 }}>— отметь для отправки</span></div>
            {(() => {
              const allEmails = [...new Set([...(lead.emails_raw || []), ...(lead.emails_kp || [])])].filter(Boolean);
              const active = new Set(lead.emails_active || []);
              const toggle = (em) => {
                const next = new Set(active);
                next.has(em) ? next.delete(em) : next.add(em);
                up("leads", p => p.map(l => l.id === sel ? { ...l, emails_active: [...next] } : l));
              };
              return allEmails.length > 0 ? (
                <div style={{ marginBottom: 6 }}>
                  {allEmails.map((em, i) => (
                    <label key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0", fontSize: 12, cursor: "pointer" }}>
                      <input type="checkbox" checked={active.has(em)} onChange={() => toggle(em)} />
                      <span style={{ color: active.has(em) ? "var(--color-text-primary)" : "var(--color-text-tertiary)" }}>{em}</span>
                      {active.has(em) && <span style={{ fontSize: 10, color: "#3B6D11" }}>отправка</span>}
                    </label>
                  ))}
                </div>
              ) : <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 6 }}>Нет email</div>;
            })()}
            <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
              <input style={{ ...C.inp, width: 180 }} placeholder="email@..." value={newEmail} onChange={e => setNewEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && addEmail()} />
              <button style={{ ...C.btn(), padding: "5px 8px" }} onClick={addEmail}>+</button>
            </div>
            <div style={C.lbl}>CC</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
              {(lead.emails_cc || []).map((e, i) => <Chip key={i} onRemove={() => rmEmailCc(i)}>{e}</Chip>)}
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <input style={{ ...C.inp, width: 180 }} placeholder="cc@..." value={newEmailCc} onChange={e => setNewEmailCc(e.target.value)} onKeyDown={e => e.key === "Enter" && addEmailCc()} />
              <button style={{ ...C.btn(), padding: "5px 8px" }} onClick={addEmailCc}>+</button>
            </div>
          </div>

          {/* SPIN */}
          <div style={{ ...C.card }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>SPIN</span>
              <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{Object.keys(spinData).filter(k => spinData[k]).length}/4</span>
            </div>
            <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 6 }}>
              {Object.entries(SPIN_QUESTIONS).map(([cat, cfg]) => {
                const filled = !!spinData[cat];
                return (
                  <button key={cat} style={{ ...C.btn(), fontSize: 10, padding: "3px 8px", borderColor: spinOpen === cat ? cfg.color : filled ? cfg.color + "44" : undefined, color: spinOpen === cat ? cfg.color : filled ? cfg.color : "var(--color-text-secondary)", fontWeight: spinOpen === cat ? 600 : 400, background: filled && spinOpen !== cat ? cfg.bg : undefined }}
                    onClick={() => setSpinOpen(spinOpen === cat ? null : cat)}>
                    {cfg.label} {filled ? "✓" : ""}
                  </button>
                );
              })}
            </div>
            {spinOpen && SPIN_QUESTIONS[spinOpen] && (
              <div style={{ padding: "8px", background: SPIN_QUESTIONS[spinOpen].bg, borderRadius: 8, fontSize: 11 }}>
                <div style={{ fontWeight: 500, color: SPIN_QUESTIONS[spinOpen].color, marginBottom: 4 }}>{SPIN_QUESTIONS[spinOpen].label}</div>
                <div style={{ color: "var(--color-text-secondary)", marginBottom: 6 }}>💡 {SPIN_QUESTIONS[spinOpen].hint}</div>
                <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 6 }}>
                  {SPIN_QUESTIONS[spinOpen].questions.map((q, i) => (
                    <button key={i} style={{ ...C.btn(), fontSize: 10, padding: "2px 6px" }} onClick={() => navigator.clipboard?.writeText(q)}>{q}</button>
                  ))}
                </div>
                <textarea style={{ ...C.inp, height: 40, resize: "vertical", fontSize: 11 }} placeholder="Ответ клиента..." value={spinData[spinOpen] || ""} onChange={e => updateSpin(spinOpen, e.target.value)} />
              </div>
            )}
          </div>

          {/* Routes */}
          <div style={C.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Направления</span>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {(lead.routes || []).length > 0 && hasRates && (
                  <button style={{ ...C.btn(), fontSize: 10, padding: "2px 8px" }} onClick={selectAllRoutes}>
                    {selectedRoutes.size === (lead.routes||[]).length ? "Снять все" : "Выбрать все"}
                  </button>
                )}
                {(lead.routes || []).length > 0 && hasRates && selectedRoutes.size > 0 && (
                  <button style={{ ...C.btn(true), fontSize: 10, padding: "2px 8px" }} onClick={() => {
                    const routes = [...selectedRoutes].map(i => lead.routes[i]).filter(Boolean);
                    goToKPFromLead({ leadId: sel, routes });
                  }}>КП → ({selectedRoutes.size})</button>
                )}
                {(lead.routes || []).length > 0 && hasRates && selectedRoutes.size > 0 && (
                  <button style={{ ...C.btn(), fontSize: 10, padding: "2px 8px", borderColor: "#0F6E56", color: "#0F6E56" }} onClick={() => {
                    const routes = [...selectedRoutes].map(i => lead.routes[i]).filter(Boolean);
                    const tpl = EMAIL_TEMPLATES.logistics_intro;
                    const city = routes[0]?.city || "";
                    const usdRate = settings?.usdRate || 90;
                    const marginUsd = settings?.marginUsd || 100;
                    const marginRub = settings?.marginRub || 5000;
                    // Calc rates for each route
                    const rateLines = [];
                    routes.forEach((route, ri) => {
                      const ctype = (route.ctype || "40HC").includes("20") ? "20" : "40";
                      const weight = route.weight_kg ? Number(route.weight_kg) / 1000 : 22;
                      const results = calcChain(
                        { freight, boxes, drops, railway, autoMsk, customAuto, settings: { ...settings, marginUsd, marginRub } },
                        { pol: route.port, city: route.city, ctype, weight }
                      );
                      if (results.length > 0) {
                        const best = results[0];
                        const v = {
                          ctype: ctype === "20" ? "20DC" : "40HC", incoterms: "FOB",
                          port: route.port, railway_dest: route.city,
                          isRubFreight: !!best.isRubFreight,
                          freight_base: best.isRubFreight ? "0" : String(best.totalFreightUsd || ""),
                          freight_rub: best.isRubFreight ? String(best.freightRubRaw || best.freightRub || "") : "",
                          freight_margin: String(marginUsd),
                          railway_base: String(best.rwBase || ""),
                          railway_margin: String(marginRub),
                          security: String(best.rwGuard || "5932"),
                          security_on: (best.rwGuard || 0) > 0,
                          truck_on: (best.autoRub || 0) > 0,
                          truck_city: best.autoLabel ? route.city : "",
                          truck_price: String(best.autoRub || ""),
                          weight_kg: route.weight_kg || "",
                          weight_surcharge: best.weightSurcharge || 0,
                          departure_date: best.departure || "",
                        };
                        if (routes.length > 1 && ri > 0) rateLines.push("");
                        rateLines.push(formatKPVariant(v, ri, false, usdRate));
                      } else {
                        rateLines.push(`\n${route.port} -> ${route.city} (${route.ctype || "40HC"}): ставка не найдена`);
                      }
                    });
                    const subj = tpl.subject_with_routes.replace("[город]", city);
                    const body = tpl.body_with_routes + "\n" + rateLines.join("\n") + "\n\nБуду рад обсудить детали.\n\n" + EMAIL_SIGNATURE;
                    setEmailDraft({ subject: subj, body, to: (lead.emails_active || []).join(", "), isLogisticsIntro: true });
                  }}>✉ В письмо ({selectedRoutes.size})</button>
                )}
              </div>
            </div>
            {(lead.routes || []).map((r, i) => (
              <div key={i} style={{ display: "flex", gap: 4, alignItems: "center", padding: "4px 0", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 12 }}>
                {hasRates && <input type="checkbox" checked={selectedRoutes.has(i)} onChange={() => toggleRoute(i)} style={{ cursor: "pointer" }} />}
                <span>{r.port || "?"} → {r.city || "?"}</span>
                <Badge color="#6B7280" bg="#F3F4F6">{r.ctype || "40HC"}</Badge>
                <button style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--color-text-tertiary)" }} onClick={() => rmRoute(i)}>×</button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 3, marginTop: 6 }}>
              <div style={{ flex: 1 }}><Combobox value={newRoute.port} onChange={v => setNewRoute(p => ({ ...p, port: v }))} options={polOptions} placeholder="Порт" /></div>
              <div style={{ flex: 1 }}><Combobox value={newRoute.city} onChange={v => setNewRoute(p => ({ ...p, city: v }))} options={cityOptions} placeholder="Город" /></div>
              <select style={{ ...C.sel, fontSize: 10, width: 60, padding: "5px 4px" }} value={newRoute.ctype} onChange={e => setNewRoute(p => ({ ...p, ctype: e.target.value }))}><option value="40HC">40HC</option><option value="20DV">20DV</option></select>
              <button style={{ ...C.btn(true), padding: "5px 8px" }} onClick={addRoute}>+</button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Touches */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Касания</div>
          {lt.length === 0 ? (
            <div style={{ ...C.card, textAlign: "center", padding: 14, color: "var(--color-text-tertiary)" }}>
              Нет касаний.{" "}
              <button style={{ ...C.btn(), marginLeft: 6 }} onClick={() => { mkTouches(sel, lead.grade || "C", today()); }}>Запустить</button>
            </div>
          ) : lt.map(t => <TouchRow key={t.id} t={t} doTouch={doTouch} />)}
        </div>
      </div>

      {/* ═══ FULL-WIDTH SECTIONS BELOW ═══ */}

      {/* Sent KP block */}
      {(() => {
        const leadKPs = (proposals || []).filter(p => p.lead_id === sel).sort((a, b) => (b.sent || b.created || "").localeCompare(a.sent || a.created || ""));
        if (leadKPs.length === 0) return null;
        return (
          <div style={{ marginTop: 12 }}>
            <div style={C.section}>КП <Badge color="#534AB7" bg="#EEEDFE">{leadKPs.length}</Badge>
              <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "var(--color-text-info)", fontFamily: "inherit", marginLeft: 8 }} onClick={() => setTab("proposals")}>Все КП →</button>
            </div>
            {leadKPs.slice(0, 5).map(kp => (
              <div key={kp.id} style={{ ...C.card, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, borderLeft: `3px solid ${kp.status === "sent" ? "#534AB7" : "#6B7280"}`, cursor: "pointer" }}
                onClick={() => setTab("proposals")}>
                <Badge color={kp.status === "sent" ? "#3B6D11" : "#6B7280"} bg={kp.status === "sent" ? "#EAF3DE" : "#F3F4F6"}>{kp.status === "sent" ? "отпр." : "черн."}</Badge>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>#{kp.ver || 1} {kp.company || lead.company_name}</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                    {kp.variants?.map(v => `${v.port || "?"}→${v.railway_dest || v.city || "?"}`).filter((v,i,a) => a.indexOf(v) === i).join(", ") || "—"} | {fmtFull(kp.sent || kp.created)}
                  </div>
                </div>
                {kp.emails && kp.emails.length > 0 && <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>→ {kp.emails.join(", ")}</span>}
              </div>
            ))}
          </div>
        );
      })()}

      {/* AI Assistant + Notes — side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
        <div>
          <AIPanel lead={lead} touches={touches} activities={activities} proposals={proposals} />
        </div>
        <div>
          <div style={{ ...C.card }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Заметки и история</div>
            <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
              <input style={{ ...C.inp, flex: 1, fontSize: 11 }} placeholder="Заметка..." value={noteText} onChange={e => setNoteText(e.target.value)} onKeyDown={e => e.key === "Enter" && addNote()} />
              <button style={{ ...C.btn(true), padding: "4px 8px" }} onClick={addNote}>+</button>
            </div>
            <div style={{ maxHeight: 350, overflow: "auto" }}>
              {la.slice(0, 20).map(a => (
                <div key={a.id} style={{ padding: "5px 0", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 11 }}>
                  <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                    <Badge color={a.type === "touch" ? "#534AB7" : a.type === "dial_attempt" ? "#6B7280" : "#6B7280"} bg={a.type === "touch" ? "#EEEDFE" : "#F3F4F6"} style={{ fontSize: 9, padding: "1px 5px" }}>{a.type === "touch" ? "кас" : a.type === "dial_attempt" ? "📵" : "зам"}</Badge>
                    {a.outcome && <Badge color={OUTCOMES[a.outcome]?.c || "#6B7280"} bg={OUTCOMES[a.outcome]?.bg || "#F3F4F6"} style={{ fontSize: 9, padding: "1px 5px" }}>{OUTCOMES[a.outcome]?.l || a.outcome}</Badge>}
                    <span style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginLeft: "auto" }}>{fmtFull(a.at)}</span>
                  </div>
                  <div style={{ color: "var(--color-text-secondary)", marginTop: 1 }}>{a.content}</div>
                </div>
              ))}
              {la.length === 0 && <div style={{ color: "var(--color-text-tertiary)", fontSize: 11, padding: 8 }}>Нет записей</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Email Composer */}
      <div style={{ ...C.section, marginTop: 14 }}>Написать письмо</div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
        {Object.entries(EMAIL_TEMPLATES).filter(([k]) => k !== "logistics_intro").map(([k, tpl]) => (
          <button key={k} style={{ ...C.btn(), fontSize: 11, padding: "5px 10px" }} onClick={() => {
            const nm = lead.greeting_name || (lead.contact_name ? lead.contact_name.split(" ")[0] : "");
            const greeting = nm ? `${nm}, добрый день.` : "Добрый день.";
            const body = greeting + "\n\n" + tpl.body.replace(/\[Имя\],?\s?добрый день\.?\n?\n?/g, "").replace(/\[Имя\],?\s*/g, "").replace(/\[товар\]/g, lead.goods || "[товар]").replace(/\[город\]/g, lead.routes?.[0]?.port || "[город]").replace(/\[дата\]/g, fmtFull(today())).replace(/\[месяц\]/g, new Date().toLocaleDateString("ru-RU", { month: "long" })) + "\n\n" + EMAIL_SIGNATURE;
            const subj = tpl.subject.replace(/\[Товар\]/g, lead.goods || "[товар]").replace(/\[месяц\]/g, new Date().toLocaleDateString("ru-RU", { month: "long" }));
            setEmailDraft({ subject: subj, body, to: (lead.emails_active || []).join(", ") });
          }}>{k === "no_answer" ? "📵 Недозвон" : k === "followup" ? "📩 Follow-up" : "📰 Инфоповод"}</button>
        ))}
        <button style={{ ...C.btn(), fontSize: 11, padding: "5px 10px", borderColor: "#0F6E56", color: "#0F6E56" }} onClick={() => {
          const tpl = EMAIL_TEMPLATES.logistics_intro;
          const hasRoutes = (lead.routes || []).length > 0;
          const city = lead.routes?.[0]?.city || "";
          const subj = hasRoutes ? tpl.subject_with_routes.replace("[город]", city) : tpl.subject;
          const body = (hasRoutes ? tpl.body_with_routes : tpl.body) + "\n\n" + EMAIL_SIGNATURE;
          setEmailDraft({ subject: subj, body, to: (lead.emails_active || []).join(", "), isLogisticsIntro: true });
        }}>📋 Отдел логистики</button>
        <button style={{ ...C.btn(), fontSize: 11, padding: "5px 10px" }} onClick={() => {
          const nm = lead.greeting_name || (lead.contact_name ? lead.contact_name.split(" ")[0] : "");
          const greeting = nm ? `${nm}, добрый день.` : "Добрый день.";
          setEmailDraft({ subject: "", body: greeting + "\n\n\n\n" + EMAIL_SIGNATURE, to: (lead.emails_active || []).join(", ") });
        }}>✉ Своё письмо</button>
      </div>
      {emailDraft && (
        <div style={{ ...C.card, borderColor: "var(--color-border-info)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
            <div><div style={C.lbl}>Кому</div><input style={C.inp} value={emailDraft.to} onChange={e => setEmailDraft(p => ({ ...p, to: e.target.value }))} placeholder="email@company.com" /></div>
            <div><div style={C.lbl}>Тема</div><input style={C.inp} value={emailDraft.subject} onChange={e => setEmailDraft(p => ({ ...p, subject: e.target.value }))} /></div>
            <div><div style={C.lbl}>Письмо</div><textarea style={{ ...C.inp, height: 160, resize: "vertical", lineHeight: 1.5, whiteSpace: "pre-wrap" }} value={emailDraft.body} onChange={e => setEmailDraft(p => ({ ...p, body: e.target.value }))} /></div>
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 6 }}>От: Dorofeev Vitaliy / BML DV (dorofeev@bml-dv.com)</div>
          <div style={{ display: "flex", gap: 6, marginTop: 8, justifyContent: "flex-end" }}>
            <button style={C.btn()} onClick={() => setEmailDraft(null)}>Отмена</button>
            <button style={C.btn(true)} disabled={emailSending || !emailDraft.to || !emailDraft.subject} onClick={async () => {
              setEmailSending(true);
              try {
                // Build HTML version with logo (public URL, not base64)
                const sigParts = EMAIL_SIGNATURE.replace(/\n/g, "<br>").replace(/(http[s]?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#1a73e8;text-decoration:none;">$1</a>');
                const logoHtml = `<img src="http://80.71.159.26/logo.png" alt="BML DV" style="height:40px;margin-bottom:8px;" /><br>`;
                const sigIdx = emailDraft.body.indexOf("Best regards");
                const mainBody = (sigIdx > 0 ? emailDraft.body.slice(0, sigIdx).trim() : emailDraft.body).replace(/\n/g, "<br>");
                const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;"><div style="max-width:700px;margin:0 auto;"><div style="padding:24px 0;font-size:14px;line-height:1.7;color:#333;">${mainBody}</div><div style="border-top:1px solid #e8e8e8;padding:16px 0;font-size:12px;color:#888;line-height:1.6;">${logoHtml}${sigParts}</div></div></body></html>`;
                const res = await apiCall("POST", "/api/send", { to: emailDraft.to.split(",").map(s => s.trim()).filter(Boolean), subject: emailDraft.subject, body: emailDraft.body, html });
                if (res.ok) {
                  up("activities", p => [...p, { id: uid(), lead_id: sel, type: "note", content: `📧 ${emailDraft.subject} → ${emailDraft.to}`, at: new Date().toISOString() }]);
                  // Auto-task: call in 2 days after logistics_intro
                  if (emailDraft.isLogisticsIntro) {
                    const maxNum = touches.filter(t => t.lead_id === sel).reduce((m, t) => Math.max(m, t.num || 0), 0);
                    up("touches", p => [...p, {
                      id: uid(), lead_id: sel, num: maxNum + 0.5,
                      type: "call", label: "Звонок после письма",
                      desc: "Проверить получили ли письмо, найти ЛПР",
                      hint: "«Добрый день, отправляли письмо на вашу почту по контейнерным перевозкам — дошло? Подскажите, кто у вас занимается логистикой?»",
                      challenger: "", spin_focus: null,
                      date: addDays(today(), 2), done: null, status: "scheduled", outcome: null, note: "",
                    }]);
                    // Mark any pending 'Email на общую почту' task as done
                    const emailTask = touches.find(t => t.lead_id === sel && t.status === "scheduled" && t.label === "Email на общую почту");
                    if (emailTask) {
                      up("touches", p => p.map(t => t.id === emailTask.id ? { ...t, status: "done", done: today(), outcome: "sent", note: "Отправлено: " + emailDraft.subject } : t));
                    }
                  }
                  setEmailDraft(null);
                  alert("Отправлено на " + emailDraft.to + (emailDraft.isLogisticsIntro ? "\nЗадача: звонок через 2 дня" : ""));
                } else { alert("Ошибка: " + (res.error || "неизвестная")); }
              } catch (err) { alert("Ошибка сети: " + err.message); }
              setEmailSending(false);
            }}>{emailSending ? "Отправка..." : "Отправить"}</button>
          </div>
        </div>
      )}

      {/* Frozen info */}
      {lead.status === "frozen" && (<div style={{ ...C.card, marginTop: 10, background: "#F1EFE8", border: "none" }}>
        <div style={{ fontSize: 12, color: "#888780" }}>❄️ {lead.frozen_reason || "Заморожен"}</div>
        {lead.frozen_date && <div style={{ fontSize: 11, color: "#888780", marginTop: 2 }}>Разморозка: {fmtFull(addDays(lead.frozen_date, 30))} <button style={{ ...C.btn(), marginLeft: 8, fontSize: 11 }} onClick={() => up("leads", p => p.map(l => l.id === sel ? { ...l, status: "new", unfrozen_date: today() } : l))}>🔥 Разморозить</button></div>}
      </div>)}
    </div>
  );
}
