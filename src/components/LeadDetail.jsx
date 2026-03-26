import React, { useState, useMemo } from 'react';
import { Badge, Chip, Combobox } from './ui.jsx';
import { TouchRow } from './TouchRow.jsx';
import { C, STATUS, GRADE, OBJECTION_TREE, OBJECTION_SCRIPTS, SPIN_QUESTIONS, CHALLENGER_INSIGHTS, OUTCOMES, EMAIL_TEMPLATES, EMAIL_SIGNATURE } from '../constants.js';
import { uid, today, fmt, fmtFull, addDays, calcGrade } from '../utils.js';
import { apiCall } from '../api.js';

export function LeadDetail({ leads, touches, activities, up, doTouch, mkTouches, sel, setSel, freight, railway, goToKPFromLead }) {
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
            <button style={C.btn()} onClick={() => { setEf({ contact_name: lead.contact_name || "", volume_monthly: lead.volume_monthly || "", routes_match: lead.routes_match || "unknown", payment_terms: lead.payment_terms || "unknown", goods: lead.goods || "", website: lead.website || "" }); setEditing(true); }}>Ред.</button>
            <select style={{ ...C.sel, fontSize: 11 }} value={lead.status} onChange={e => up("leads", p => p.map(l => l.id === sel ? { ...l, status: e.target.value } : l))}>
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
            </select>
          </div>
        </div>
        {lead.contact_name && <div style={{ fontSize: 12, marginTop: 8 }}>ЛПР: <strong>{lead.contact_name}</strong> {lead.website && <span style={{ color: "var(--color-text-tertiary)" }}>| {lead.website}</span>}</div>}
        {lead.comment && <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 4, fontStyle: "italic" }}>{lead.comment}</div>}

        {/* Active objection display with LAER */}
        {lead.objections && (() => {
          const objKey = lead.objections;
          const obj = OBJECTION_TREE[objKey];
          if (!obj) {
            // Fallback for legacy objection strings
            const matches = Object.entries(OBJECTION_SCRIPTS).filter(([k]) => objKey.toLowerCase().includes(k.toLowerCase()));
            return matches.length > 0 ? matches.map(([k,v]) => (
              <div key={k} style={{ marginTop: 6, padding: "8px 12px", background: "#FEFCE8", border: "0.5px solid #FDE68A", borderRadius: 8, fontSize: 12 }}>
                <div style={{ fontWeight: 600, color: "#854F0B", marginBottom: 3 }}>⚡ «{k}»</div>
                <div style={{ color: "var(--color-text-primary)", marginBottom: 3 }}>{v.reply}</div>
                <div style={{ color: "#854F0B", fontStyle: "italic", fontSize: 11 }}>💡 {v.tip}</div>
              </div>
            )) : <Badge color="#854F0B" bg="#FAEEDA" style={{ marginTop: 6 }}>Возражение: {objKey}</Badge>;
          }
          return (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }} onClick={() => setObjOpen(!objOpen)}>
                <Badge color="#854F0B" bg="#FAEEDA">⚡ {objKey}</Badge>
                <span style={{ fontSize: 11, color: "#854F0B" }}>{objOpen ? "▼" : "▶"} LAER-скрипт</span>
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
            <div><div style={C.lbl}>Контакт (ФИО / обращение)</div><input style={C.inp} value={ef.contact_name} onChange={e => setEf(p => ({ ...p, contact_name: e.target.value }))} placeholder="Димитрий" /></div>
            <div><div style={C.lbl}>Товар / груз</div><input style={C.inp} value={ef.goods} onChange={e => setEf(p => ({ ...p, goods: e.target.value }))} placeholder="оксиды, химия" /></div>
            <div><div style={C.lbl}>Конт/мес</div><input style={C.inp} type="number" value={ef.volume_monthly} onChange={e => setEf(p => ({ ...p, volume_monthly: e.target.value }))} /></div>
            <div><div style={C.lbl}>Сайт</div><input style={C.inp} value={ef.website} onChange={e => setEf(p => ({ ...p, website: e.target.value }))} placeholder="company.ru" /></div>
            <div><div style={C.lbl}>Направления</div><select style={{ ...C.sel, width: "100%" }} value={ef.routes_match} onChange={e => setEf(p => ({ ...p, routes_match: e.target.value }))}><option value="yes">Да</option><option value="partial">Частично</option><option value="no">Нет</option><option value="unknown">Не знаю</option></select></div>
            <div><div style={C.lbl}>Оплата</div><select style={{ ...C.sel, width: "100%" }} value={ef.payment_terms} onChange={e => setEf(p => ({ ...p, payment_terms: e.target.value }))}><option value="prepay">Предоплата</option><option value="standard">Стандарт</option><option value="deferred">Отсрочка</option><option value="unknown">Не знаю</option></select></div>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8, justifyContent: "flex-end" }}>
            <button style={C.btn()} onClick={() => setEditing(false)}>Отмена</button>
            <button style={C.btn(true)} onClick={() => { const g = calcGrade({ volume_monthly: Number(ef.volume_monthly), routes_match: ef.routes_match, payment_terms: ef.payment_terms }); up("leads", p => p.map(l => l.id === sel ? { ...l, contact_name: ef.contact_name, goods: ef.goods, website: ef.website, volume_monthly: Number(ef.volume_monthly) || l.volume_monthly, routes_match: ef.routes_match, payment_terms: ef.payment_terms, grade: g } : l)); setEditing(false); }}>Сохранить</button>
          </div>
        </div>
      )}

      {/* SPIN Qualification */}
      <div style={{ ...C.section, marginTop: 14, display: "flex", alignItems: "center", gap: 8 }}>
        SPIN-квалификация
        <span style={{ fontSize: 11, fontWeight: 400, color: "var(--color-text-tertiary)" }}>
          {Object.keys(spinData).filter(k => spinData[k]).length}/4 заполнено
        </span>
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
        {Object.entries(SPIN_QUESTIONS).map(([cat, cfg]) => {
          const filled = !!spinData[cat];
          return (
            <button key={cat} style={{ ...C.btn(), fontSize: 11, padding: "4px 10px", borderColor: spinOpen === cat ? cfg.color : filled ? cfg.color + "44" : undefined, color: spinOpen === cat ? cfg.color : filled ? cfg.color : "var(--color-text-secondary)", fontWeight: spinOpen === cat ? 600 : 400, background: filled && spinOpen !== cat ? cfg.bg : undefined }}
              onClick={() => setSpinOpen(spinOpen === cat ? null : cat)}>
              {cfg.label} {filled ? "✓" : ""}
            </button>
          );
        })}
      </div>
      {spinOpen && SPIN_QUESTIONS[spinOpen] && (
        <div style={{ ...C.card, borderColor: SPIN_QUESTIONS[spinOpen].color + "44", marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: SPIN_QUESTIONS[spinOpen].color, marginBottom: 6 }}>
            {SPIN_QUESTIONS[spinOpen].label}
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 8 }}>
            💡 {SPIN_QUESTIONS[spinOpen].hint}
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
            {SPIN_QUESTIONS[spinOpen].questions.map((q, i) => (
              <button key={i} style={{ ...C.btn(), fontSize: 11, padding: "3px 8px", textAlign: "left" }}
                onClick={() => { navigator.clipboard?.writeText(q); }}>
                {q}
              </button>
            ))}
          </div>
          <textarea style={{ ...C.inp, height: 50, resize: "vertical" }} placeholder="Ответ клиента..." value={spinData[spinOpen] || ""} onChange={e => updateSpin(spinOpen, e.target.value)} />
        </div>
      )}

      {/* Contact info: phones */}
      <div style={{ ...C.section, marginTop: 14 }}>Телефоны</div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
        {(lead.phones_raw || []).map((p, i) => <Chip key={"r"+i}>{p}</Chip>)}
        {(lead.phones_contact || []).map((p, i) => <Chip key={"c"+i} onRemove={() => rmPhone(i)}>{p}</Chip>)}
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        <input style={{ ...C.inp, width: 160 }} placeholder="+7..." value={newPhone} onChange={e => setNewPhone(e.target.value)} onKeyDown={e => e.key === "Enter" && addPhone()} />
        <button style={{ ...C.btn(), padding: "5px 10px" }} onClick={addPhone}>+</button>
      </div>

      {/* Emails */}
      <div style={{ ...C.section, marginTop: 14 }}>Email (КП)</div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
        {(lead.emails_raw || []).map((e, i) => <Chip key={"r"+i}>{e}</Chip>)}
        {(lead.emails_kp || []).map((e, i) => <Chip key={"c"+i} onRemove={() => rmEmail(i)}>{e}</Chip>)}
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        <input style={{ ...C.inp, width: 200 }} placeholder="email@..." value={newEmail} onChange={e => setNewEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && addEmail()} />
        <button style={{ ...C.btn(), padding: "5px 10px" }} onClick={addEmail}>+</button>
      </div>
      {/* CC emails */}
      <div style={{ ...C.lbl, marginTop: 8 }}>CC</div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
        {(lead.emails_cc || []).map((e, i) => <Chip key={i} onRemove={() => rmEmailCc(i)}>{e}</Chip>)}
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        <input style={{ ...C.inp, width: 200 }} placeholder="cc@..." value={newEmailCc} onChange={e => setNewEmailCc(e.target.value)} onKeyDown={e => e.key === "Enter" && addEmailCc()} />
        <button style={{ ...C.btn(), padding: "5px 10px" }} onClick={addEmailCc}>+</button>
      </div>

      {/* Routes */}
      <div style={{ ...C.section, marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Направления</span>
        {(lead.routes || []).length > 0 && hasRates && (
          <div style={{ display: "flex", gap: 4 }}>
            <button style={{ ...C.btn(), fontSize: 11, padding: "3px 10px" }} onClick={selectAllRoutes}>
              {selectedRoutes.size === (lead.routes||[]).length ? "Снять всё" : "Выбрать всё"}
            </button>
            {selectedRoutes.size > 0 && (
              <button style={{ ...C.btn(true), fontSize: 11, padding: "3px 10px" }} onClick={() => {
                const routes = [...selectedRoutes].map(i => lead.routes[i]).filter(Boolean);
                goToKPFromLead({ leadId: sel, routes });
              }}>КП → ({selectedRoutes.size})</button>
            )}
          </div>
        )}
      </div>
      {(lead.routes || []).map((r, i) => (
        <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", padding: "5px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
          {hasRates && <input type="checkbox" checked={selectedRoutes.has(i)} onChange={() => toggleRoute(i)} style={{ cursor: "pointer" }} />}
          <span style={{ fontSize: 12 }}>{r.port || "?"} → {r.city || "?"}</span>
          <Badge color="#6B7280" bg="#F3F4F6">{r.ctype || "40HC"}</Badge>
          {r.weight_kg && <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{r.weight_kg}кг</span>}
          <button style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--color-text-tertiary)" }} onClick={() => rmRoute(i)}>×</button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
        <div style={{ flex: 1 }}><Combobox value={newRoute.port} onChange={v => setNewRoute(p => ({ ...p, port: v }))} options={polOptions} placeholder="Порт" /></div>
        <div style={{ flex: 1 }}><Combobox value={newRoute.city} onChange={v => setNewRoute(p => ({ ...p, city: v }))} options={cityOptions} placeholder="Город" /></div>
        <select style={{ ...C.sel, fontSize: 11, width: 70 }} value={newRoute.ctype} onChange={e => setNewRoute(p => ({ ...p, ctype: e.target.value }))}><option value="40HC">40HC</option><option value="20DV">20DV</option></select>
        <div style={{ width: 60 }}><input style={C.inp} placeholder="Вес" value={newRoute.weight_kg} onChange={e => setNewRoute(p => ({ ...p, weight_kg: e.target.value }))} /></div>
        <button style={{ ...C.btn(true), padding: "7px 12px" }} onClick={addRoute}>+</button>
      </div>

      {/* Touches */}
      <div style={{ ...C.section, marginTop: 14 }}>Касания</div>
      {lt.length === 0 ? (
        <div style={{ ...C.card, textAlign: "center", padding: 14, color: "var(--color-text-tertiary)" }}>
          Нет касаний.{" "}
          <button style={{ ...C.btn(), marginLeft: 6 }} onClick={() => { mkTouches(sel, lead.grade || "C", today()); }}>Запустить</button>
        </div>
      ) : lt.map(t => <TouchRow key={t.id} t={t} doTouch={doTouch} />)}

      {/* Notes & History — moved up for visibility */}
      <div style={{ ...C.section, marginTop: 14 }}>Заметки и история</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <input style={{ ...C.inp, flex: 1 }} placeholder="Заметка после разговора..." value={noteText} onChange={e => setNoteText(e.target.value)} onKeyDown={e => e.key === "Enter" && addNote()} />
        <button style={C.btn(true)} onClick={addNote}>+</button>
      </div>
      {la.slice(0, 10).map(a => (
        <div key={a.id} style={{ padding: "7px 0", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 12 }}>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <Badge color={a.type === "touch" ? "#534AB7" : a.type === "dial_attempt" ? "#6B7280" : "#6B7280"} bg={a.type === "touch" ? "#EEEDFE" : "#F3F4F6"}>{a.type === "touch" ? "касание" : a.type === "dial_attempt" ? "📵" : "заметка"}</Badge>
            {a.outcome && <Badge color={OUTCOMES[a.outcome]?.c || "#6B7280"} bg={OUTCOMES[a.outcome]?.bg || "#F3F4F6"}>{OUTCOMES[a.outcome]?.l || a.outcome}</Badge>}
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginLeft: "auto" }}>{fmtFull(a.at)}</span>
          </div>
          <div style={{ color: "var(--color-text-secondary)", marginTop: 2 }}>{a.content}</div>
        </div>
      ))}
      {la.length > 10 && <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", padding: 4 }}>+ ещё {la.length - 10} записей</div>}

      {/* Email Composer */}
      <div style={{ ...C.section, marginTop: 14 }}>Написать письмо</div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
        {Object.entries(EMAIL_TEMPLATES).map(([k, tpl]) => (
          <button key={k} style={{ ...C.btn(), fontSize: 11, padding: "5px 10px" }} onClick={() => {
            const nm = lead.contact_name ? lead.contact_name.split(" ")[0] : "";
            const greeting = nm ? `${nm}, добрый день.` : "Добрый день.";
            const body = greeting + "\n\n" + tpl.body.replace(/\[Имя\],?\s?добрый день\.?\n?\n?/g, "").replace(/\[Имя\],?\s*/g, "").replace(/\[товар\]/g, lead.goods || "[товар]").replace(/\[город\]/g, lead.routes?.[0]?.port || "[город]").replace(/\[дата\]/g, fmtFull(today())).replace(/\[месяц\]/g, new Date().toLocaleDateString("ru-RU", { month: "long" })) + "\n\n" + EMAIL_SIGNATURE;
            const subj = tpl.subject.replace(/\[Товар\]/g, lead.goods || "[товар]").replace(/\[месяц\]/g, new Date().toLocaleDateString("ru-RU", { month: "long" }));
            setEmailDraft({ subject: subj, body, to: "" });
          }}>{k === "no_answer" ? "📵 Недозвон" : k === "followup" ? "📩 Follow-up" : "📰 Инфоповод"}</button>
        ))}
        <button style={{ ...C.btn(), fontSize: 11, padding: "5px 10px" }} onClick={() => {
          const nm = lead.contact_name ? lead.contact_name.split(" ")[0] : "";
          const greeting = nm ? `${nm}, добрый день.` : "Добрый день.";
          setEmailDraft({ subject: "", body: greeting + "\n\n\n\n" + EMAIL_SIGNATURE, to: "" });
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
                const res = await apiCall("POST", "/api/send", { to: emailDraft.to.split(",").map(s => s.trim()).filter(Boolean), subject: emailDraft.subject, body: emailDraft.body });
                if (res.ok) {
                  up("activities", p => [...p, { id: uid(), lead_id: sel, type: "note", content: `📧 ${emailDraft.subject} → ${emailDraft.to}`, at: new Date().toISOString() }]);
                  setEmailDraft(null);
                  alert("Отправлено на " + emailDraft.to);
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
