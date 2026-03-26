import React, { useState, useMemo } from 'react';
import { Badge, Chip, Combobox } from './ui.jsx';
import { TouchRow } from './TouchRow.jsx';
import { C, STATUS, GRADE, OBJECTION_TREE, OBJECTION_SCRIPTS, SPIN_QUESTIONS, CHALLENGER_INSIGHTS, OUTCOMES, EMAIL_TEMPLATES, EMAIL_SIGNATURE } from '../constants.js';
import { uid, today, fmt, fmtFull, addDays, calcGrade } from '../utils.js';
import { apiCall } from '../api.js';

export function LeadDetail({ leads, touches, activities, proposals, up, doTouch, mkTouches, sel, setSel, freight, railway, goToKPFromLead }) {
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
        {lead.contact_name && <div style={{ fontSize: 12, marginTop: 8 }}>ЛПР: <strong>{lead.contact_name}</strong>{lead.greeting_name && <span style={{ color: "var(--color-text-secondary)" }}> (обращение: {lead.greeting_name})</span>} {lead.website && <span style={{ color: "var(--color-text-tertiary)" }}>| {lead.website}</span>}</div>}
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
          {/* Phones & Emails compact */}
          <div style={C.card}>
            <div style={C.lbl}>Телефоны</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
              {(lead.phones_raw || []).map((p, i) => <Chip key={"r"+i}>{p}</Chip>)}
              {(lead.phones_contact || []).map((p, i) => <Chip key={"c"+i} onRemove={() => rmPhone(i)}>{p}</Chip>)}
            </div>
            <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
              <input style={{ ...C.inp, width: 140 }} placeholder="+7..." value={newPhone} onChange={e => setNewPhone(e.target.value)} onKeyDown={e => e.key === "Enter" && addPhone()} />
              <button style={{ ...C.btn(), padding: "5px 8px" }} onClick={addPhone}>+</button>
            </div>
            <div style={C.lbl}>Email</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
              {(lead.emails_raw || []).map((e, i) => <Chip key={"r"+i}>{e}</Chip>)}
              {(lead.emails_kp || []).map((e, i) => <Chip key={"c"+i} onRemove={() => rmEmail(i)}>{e}</Chip>)}
            </div>
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
              {(lead.routes || []).length > 0 && hasRates && selectedRoutes.size > 0 && (
                <button style={{ ...C.btn(true), fontSize: 10, padding: "2px 8px" }} onClick={() => {
                  const routes = [...selectedRoutes].map(i => lead.routes[i]).filter(Boolean);
                  goToKPFromLead({ leadId: sel, routes });
                }}>КП → ({selectedRoutes.size})</button>
              )}
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
        const leadKPs = (proposals || []).filter(p => p.lead_id === sel && p.status === "sent").sort((a, b) => (b.sent || b.created || "").localeCompare(a.sent || a.created || ""));
        if (leadKPs.length === 0) return null;
        return (
          <div style={{ marginTop: 12 }}>
            <div style={C.section}>Отправленные КП <Badge color="#534AB7" bg="#EEEDFE">{leadKPs.length}</Badge></div>
            {leadKPs.slice(0, 5).map(kp => (
              <div key={kp.id} style={{ ...C.card, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, borderLeft: "3px solid #534AB7" }}>
                <Badge color="#534AB7" bg="#EEEDFE">#{kp.ver || 1}</Badge>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{kp.company || lead.company_name}</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                    {kp.variants?.map(v => `${v.port}→${v.city}`).join(", ") || "—"} | {fmtFull(kp.sent || kp.created)}
                  </div>
                </div>
                {kp.emails && <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>→ {kp.emails.join(", ")}</span>}
              </div>
            ))}
          </div>
        );
      })()}

      {/* Notes & History */}
      <div style={{ ...C.section, marginTop: 14 }}>Заметки и история</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <input style={{ ...C.inp, flex: 1 }} placeholder="Заметка после разговора..." value={noteText} onChange={e => setNoteText(e.target.value)} onKeyDown={e => e.key === "Enter" && addNote()} />
        <button style={C.btn(true)} onClick={addNote}>+</button>
      </div>
      {la.slice(0, 15).map(a => (
        <div key={a.id} style={{ padding: "6px 0", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 12 }}>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <Badge color={a.type === "touch" ? "#534AB7" : a.type === "dial_attempt" ? "#6B7280" : "#6B7280"} bg={a.type === "touch" ? "#EEEDFE" : "#F3F4F6"}>{a.type === "touch" ? "касание" : a.type === "dial_attempt" ? "📵" : "заметка"}</Badge>
            {a.outcome && <Badge color={OUTCOMES[a.outcome]?.c || "#6B7280"} bg={OUTCOMES[a.outcome]?.bg || "#F3F4F6"}>{OUTCOMES[a.outcome]?.l || a.outcome}</Badge>}
            <span style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginLeft: "auto" }}>{fmtFull(a.at)}</span>
          </div>
          <div style={{ color: "var(--color-text-secondary)", marginTop: 1 }}>{a.content}</div>
        </div>
      ))}

      {/* Email Composer */}
      <div style={{ ...C.section, marginTop: 14 }}>Написать письмо</div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
        {Object.entries(EMAIL_TEMPLATES).map(([k, tpl]) => (
          <button key={k} style={{ ...C.btn(), fontSize: 11, padding: "5px 10px" }} onClick={() => {
            const nm = lead.greeting_name || (lead.contact_name ? lead.contact_name.split(" ")[0] : "");
            const greeting = nm ? `${nm}, добрый день.` : "Добрый день.";
            const body = greeting + "\n\n" + tpl.body.replace(/\[Имя\],?\s?добрый день\.?\n?\n?/g, "").replace(/\[Имя\],?\s*/g, "").replace(/\[товар\]/g, lead.goods || "[товар]").replace(/\[город\]/g, lead.routes?.[0]?.port || "[город]").replace(/\[дата\]/g, fmtFull(today())).replace(/\[месяц\]/g, new Date().toLocaleDateString("ru-RU", { month: "long" })) + "\n\n" + EMAIL_SIGNATURE;
            const subj = tpl.subject.replace(/\[Товар\]/g, lead.goods || "[товар]").replace(/\[месяц\]/g, new Date().toLocaleDateString("ru-RU", { month: "long" }));
            setEmailDraft({ subject: subj, body, to: "" });
          }}>{k === "no_answer" ? "📵 Недозвон" : k === "followup" ? "📩 Follow-up" : "📰 Инфоповод"}</button>
        ))}
        <button style={{ ...C.btn(), fontSize: 11, padding: "5px 10px" }} onClick={() => {
          const nm = lead.greeting_name || (lead.contact_name ? lead.contact_name.split(" ")[0] : "");
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
