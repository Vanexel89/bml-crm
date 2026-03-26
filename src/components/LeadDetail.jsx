import React, { useState, useMemo } from 'react';
import { Badge, Chip, Combobox } from './ui.jsx';
import { TouchRow } from './TouchRow.jsx';
import { C, STATUS, GRADE, OBJECTION_SCRIPTS, EMAIL_TEMPLATES, EMAIL_SIGNATURE } from '../constants.js';
import { uid, today, fmt, fmtFull, addDays, calcGrade } from '../utils.js';

export function LeadDetail({ leads, touches, activities, up, doTouch, mkTouches, sel, setSel, freight, railway, goToKPFromLead }) {
  const lead = leads.find(l => l.id === sel);
  const lt = useMemo(() => touches.filter(t => t.lead_id === sel).sort((a, b) => a.num - b.num), [touches, sel]);
  const la = useMemo(() => activities.filter(a => a.lead_id === sel).sort((a, b) => new Date(b.at) - new Date(a.at)), [activities, sel]);
  const [noteText, setNoteText] = useState("");
  const [editing, setEditing] = useState(false);
  const [ef, setEf] = useState({});
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newEmailCc, setNewEmailCc] = useState("");
  const [newRoute, setNewRoute] = useState({ port: "", city: "", ctype: "40HC", weight_kg: "" });
  const [selectedRoutes, setSelectedRoutes] = useState(new Set());

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

  return (
    <div>
      <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 12, fontFamily: "inherit", marginBottom: 10, padding: 0 }} onClick={() => setSel(null)}>← Назад</button>

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
            <button style={C.btn()} onClick={() => { setEf({ volume_monthly: lead.volume_monthly || "", routes_match: lead.routes_match || "unknown", payment_terms: lead.payment_terms || "unknown" }); setEditing(true); }}>Ред.</button>
            <select style={{ ...C.sel, fontSize: 11 }} value={lead.status} onChange={e => up("leads", p => p.map(l => l.id === sel ? { ...l, status: e.target.value } : l))}>
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
            </select>
          </div>
        </div>
        {lead.contact_name && <div style={{ fontSize: 12, marginTop: 8 }}>ЛПР: <strong>{lead.contact_name}</strong> {lead.website && <span style={{ color: "var(--color-text-tertiary)" }}>| {lead.website}</span>}</div>}
        {lead.comment && <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 4, fontStyle: "italic" }}>{lead.comment}</div>}
        {lead.objections && <Badge color="#854F0B" bg="#FAEEDA" style={{ marginTop: 6 }}>Возражение: {lead.objections}</Badge>}
        {lead.objections && (() => {
          const m = Object.entries(OBJECTION_SCRIPTS).filter(([k]) => lead.objections.toLowerCase().includes(k.toLowerCase()));
          return m.length ? m.map(([k,v]) => (<div key={k} style={{ marginTop: 6, padding: "8px 12px", background: "#FEFCE8", border: "0.5px solid #FDE68A", borderRadius: 8, fontSize: 12 }}><div style={{ fontWeight: 600, color: "#854F0B", marginBottom: 3 }}>📋 «{k}»</div><div style={{ color: "#1a1a1a", marginBottom: 3 }}>{v.reply}</div><div style={{ color: "#854F0B", fontStyle: "italic", fontSize: 11 }}>💡 {v.tip}</div></div>)) : null;
        })()}
      </div>

      {editing && (
        <div style={{ ...C.card, background: "var(--color-background-secondary)", border: "none" }}>
          <div style={C.g3}>
            <div><div style={C.lbl}>Конт/мес</div><input style={C.inp} type="number" value={ef.volume_monthly} onChange={e => setEf(p => ({ ...p, volume_monthly: e.target.value }))} /></div>
            <div><div style={C.lbl}>Направления</div><select style={{ ...C.sel, width: "100%" }} value={ef.routes_match} onChange={e => setEf(p => ({ ...p, routes_match: e.target.value }))}><option value="yes">Да</option><option value="partial">Частично</option><option value="no">Нет</option><option value="unknown">Не знаю</option></select></div>
            <div><div style={C.lbl}>Оплата</div><select style={{ ...C.sel, width: "100%" }} value={ef.payment_terms} onChange={e => setEf(p => ({ ...p, payment_terms: e.target.value }))}><option value="prepay">Предоплата</option><option value="standard">Стандарт</option><option value="deferred">Отсрочка</option><option value="unknown">Не знаю</option></select></div>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8, justifyContent: "flex-end" }}>
            <button style={C.btn()} onClick={() => setEditing(false)}>Отмена</button>
            <button style={C.btn(true)} onClick={() => { const g = calcGrade({ volume_monthly: Number(ef.volume_monthly), routes_match: ef.routes_match, payment_terms: ef.payment_terms }); up("leads", p => p.map(l => l.id === sel ? { ...l, volume_monthly: Number(ef.volume_monthly), routes_match: ef.routes_match, payment_terms: ef.payment_terms, grade: g } : l)); setEditing(false); }}>Сохранить</button>
          </div>
        </div>
      )}

      {/* Phones & Emails */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
        <div style={C.card}>
          <div style={{ ...C.lbl, marginBottom: 6, fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)" }}>Телефоны для связи</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
            {(lead.phones_contact || []).map((ph, i) => <Chip key={i} onRemove={() => rmPhone(i)} color="var(--color-text-info)">{ph}</Chip>)}
            {(lead.phones_contact || []).length === 0 && <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Не указано</span>}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <input style={{ ...C.inp, flex: 1, fontSize: 11 }} placeholder="+7..." value={newPhone} onChange={e => setNewPhone(e.target.value)} onKeyDown={e => e.key === "Enter" && addPhone()} />
            <button style={{ ...C.btn(true), padding: "4px 10px", fontSize: 11 }} onClick={addPhone}>+</button>
          </div>
          {lead.phones_raw?.length > 0 && (
            <details style={{ marginTop: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
              <summary style={{ cursor: "pointer" }}>Из Битрикс ({lead.phones_raw.length})</summary>
              <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 3 }}>
                {lead.phones_raw.map((ph, i) => <span key={i} style={{ cursor: "pointer", color: "var(--color-text-info)", borderBottom: "1px dashed var(--color-border-secondary)" }} onClick={() => { up("leads", p => p.map(l => l.id === sel ? { ...l, phones_contact: [...new Set([...(l.phones_contact || []), ph])] } : l)); }}>{ph}</span>)}
              </div>
            </details>
          )}
        </div>

        <div style={C.card}>
          <div style={{ ...C.lbl, marginBottom: 6, fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)" }}>Почта для КП</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
            {(lead.emails_kp || []).map((em, i) => <Chip key={i} onRemove={() => rmEmail(i)} color="var(--color-text-info)">{em}</Chip>)}
            {(lead.emails_kp || []).length === 0 && <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Не указано</span>}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <input style={{ ...C.inp, flex: 1, fontSize: 11 }} placeholder="email@company.ru" value={newEmail} onChange={e => setNewEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && addEmail()} />
            <button style={{ ...C.btn(true), padding: "4px 10px", fontSize: 11 }} onClick={addEmail}>+</button>
          </div>
          {lead.emails_raw?.length > 0 && (
            <details style={{ marginTop: 6, fontSize: 11, color: "var(--color-text-tertiary)" }}>
              <summary style={{ cursor: "pointer" }}>Из Битрикс ({lead.emails_raw.length})</summary>
              <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 3 }}>
                {lead.emails_raw.map((em, i) => <span key={i} style={{ cursor: "pointer", color: "var(--color-text-info)", borderBottom: "1px dashed var(--color-border-secondary)" }} onClick={() => { up("leads", p => p.map(l => l.id === sel ? { ...l, emails_kp: [...new Set([...(l.emails_kp || []), em])] } : l)); }}>{em}</span>)}
              </div>
            </details>
          )}
        </div>
      </div>

      {/* CC + Greeting */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 0 }}>
        <div style={C.card}>
          <div style={{ ...C.lbl, marginBottom: 6, fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)" }}>Копия (CC)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
            {(lead.emails_cc || []).map((em, i) => <Chip key={i} onRemove={() => rmEmailCc(i)} color="var(--color-text-tertiary)">{em}</Chip>)}
            {(lead.emails_cc || []).length === 0 && <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Нет копий</span>}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <input style={{ ...C.inp, flex: 1, fontSize: 11 }} placeholder="cc@company.ru" value={newEmailCc} onChange={e => setNewEmailCc(e.target.value)} onKeyDown={e => e.key === "Enter" && addEmailCc()} />
            <button style={{ ...C.btn(true), padding: "4px 10px", fontSize: 11 }} onClick={addEmailCc}>+</button>
          </div>
        </div>
        <div style={C.card}>
          <div style={{ ...C.lbl, marginBottom: 6, fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)" }}>Обращение в письме</div>
          <input style={C.inp} placeholder="Добрый день, Алексей!" value={lead.email_greeting || ""} onChange={e => up("leads", p => p.map(l => l.id === sel ? { ...l, email_greeting: e.target.value } : l))} />
          <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginTop: 4 }}>Если пусто — «Добрый день, {(lead.contact_name || "").split(" ")[0] || "..."}!»</div>
        </div>
      </div>

      {/* Routes */}
      <div style={{ ...C.card, marginTop: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ ...C.lbl, marginBottom: 0, fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)" }}>Направления</div>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {(lead.routes || []).length > 0 && (
              <>
                <button style={{ ...C.btn(), fontSize: 10, padding: "3px 8px" }} onClick={selectAllRoutes}>
                  {selectedRoutes.size === (lead.routes||[]).length ? "Снять все" : "Выбрать все"}
                </button>
                {selectedRoutes.size > 0 && hasRates && (
                  <button style={{ ...C.btn(true), fontSize: 10, padding: "3px 10px" }} onClick={() => {
                    const routes = [...selectedRoutes].map(i => lead.routes[i]).filter(Boolean);
                    goToKPFromLead && goToKPFromLead({ leadId: sel, routes });
                  }}>
                    Создать КП ({selectedRoutes.size})
                  </button>
                )}
                {selectedRoutes.size > 0 && !hasRates && (
                  <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>Загрузи ставки</span>
                )}
              </>
            )}
          </div>
        </div>
        {(lead.routes || []).length > 0 && (
          <div style={{ marginBottom: 8 }}>
            {lead.routes.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 0", borderBottom: i < lead.routes.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none", cursor: "pointer" }} onClick={() => toggleRoute(i)}>
                <input type="checkbox" checked={selectedRoutes.has(i)} onChange={() => toggleRoute(i)} style={{ cursor: "pointer" }} onClick={e => e.stopPropagation()} />
                <Badge color="#185FA5" bg="#E6F1FB" style={{ fontSize: 10 }}>{r.ctype}</Badge>
                <span style={{ fontSize: 12 }}><strong>{r.port || "—"}</strong> → <strong>{r.city || "—"}</strong></span>
                {r.weight_kg && <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>{r.weight_kg} кг</span>}
                <span style={{ marginLeft: "auto", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 14 }} onClick={(e) => { e.stopPropagation(); rmRoute(i); }}>×</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}><div style={C.lbl}>Порт выхода</div><Combobox value={newRoute.port} onChange={v => setNewRoute(p => ({ ...p, port: v }))} options={polOptions} placeholder="Shanghai" /></div>
          <div style={{ flex: 1 }}><div style={C.lbl}>Город назначения</div><Combobox value={newRoute.city} onChange={v => setNewRoute(p => ({ ...p, city: v }))} options={cityOptions} placeholder="Москва" /></div>
          <div style={{ width: 80 }}><div style={C.lbl}>Тип</div><select style={{ ...C.sel, width: "100%" }} value={newRoute.ctype} onChange={e => setNewRoute(p => ({ ...p, ctype: e.target.value }))}><option>20'</option><option>40'</option><option>40HC</option></select></div>
          <div style={{ width: 80 }}><div style={C.lbl}>Вес кг</div><input style={C.inp} type="number" placeholder="опц." value={newRoute.weight_kg} onChange={e => setNewRoute(p => ({ ...p, weight_kg: e.target.value }))} /></div>
          <button style={{ ...C.btn(true), padding: "7px 12px" }} onClick={addRoute}>+</button>
        </div>
      </div>

      {/* Touches */}
      <div style={{ ...C.section, marginTop: 14 }}>Касания</div>
      {lt.length === 0 ? (
        <div style={{ ...C.card, textAlign: "center", padding: 14, color: "var(--color-text-tertiary)" }}>
          Нет касаний. {lead.grade === "C" && "Грейд C."}{" "}
          <button style={{ ...C.btn(), marginLeft: 6 }} onClick={() => { const g = calcGrade(lead); up("leads", p => p.map(l => l.id === sel ? { ...l, grade: g } : l)); if (g !== "C") mkTouches(sel, g, today()); }}>Запустить</button>
        </div>
      ) : lt.map(t => <TouchRow key={t.id} t={t} doTouch={doTouch} />)}

      {/* Email Templates */}
      <div style={{ ...C.section, marginTop: 14 }}>Шаблоны писем</div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {Object.entries(EMAIL_TEMPLATES).map(([k, tpl]) => (
          <button key={k} style={{ ...C.btn(), fontSize: 11, padding: "5px 10px" }} onClick={() => {
            const nm = lead.contact_name ? lead.contact_name.split(" ")[0] : "[Имя]";
            const f = tpl.body.replace(/\[Имя\]/g,nm).replace(/\[товар\]/g,lead.goods||"[товар]").replace(/\[город\]/g,lead.routes?.[0]?.port||"[город]").replace(/\[дата\]/g,fmtFull(today())).replace(/\[месяц\]/g,new Date().toLocaleDateString("ru-RU",{month:"long"}));
            const s = tpl.subject.replace(/\[Товар\]/g,lead.goods||"[товар]").replace(/\[месяц\]/g,new Date().toLocaleDateString("ru-RU",{month:"long"}));
            navigator.clipboard?.writeText(s+"\n\n"+f+"\n\n"+EMAIL_SIGNATURE); alert("Скопировано: "+s);
          }}>{k === "no_answer" ? "📵 Недозвон" : k === "followup" ? "📩 Follow-up" : "📰 Инфоповод"}</button>
        ))}
      </div>
      {lead.status === "frozen" && (<div style={{ ...C.card, marginTop: 10, background: "#F1EFE8", border: "none" }}>
        <div style={{ fontSize: 12, color: "#888780" }}>❄️ {lead.frozen_reason || "Заморожен"}</div>
        {lead.frozen_date && <div style={{ fontSize: 11, color: "#888780", marginTop: 2 }}>Разморозка: {fmtFull(addDays(lead.frozen_date, 30))} <button style={{ ...C.btn(), marginLeft: 8, fontSize: 11 }} onClick={() => up("leads", p => p.map(l => l.id === sel ? { ...l, status: "new", unfrozen_date: today() } : l))}>🔥 Разморозить</button></div>}
      </div>)}

      {/* Notes */}
      <div style={{ ...C.section, marginTop: 14 }}>Заметки</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <input style={{ ...C.inp, flex: 1 }} placeholder="Заметка после разговора..." value={noteText} onChange={e => setNoteText(e.target.value)} onKeyDown={e => e.key === "Enter" && addNote()} />
        <button style={C.btn(true)} onClick={addNote}>+</button>
      </div>
      {la.map(a => (
        <div key={a.id} style={{ padding: "7px 0", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 12 }}>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <Badge color={a.type === "touch" ? "#534AB7" : "#6B7280"} bg={a.type === "touch" ? "#EEEDFE" : "#F3F4F6"}>{a.type === "touch" ? "касание" : "заметка"}</Badge>
            {a.outcome && <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{a.outcome === "interested" ? "Заинтересован" : a.outcome === "no_answer" ? "Нет ответа" : a.outcome === "rejected" ? "Отказ" : a.outcome}</span>}
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginLeft: "auto" }}>{fmtFull(a.at)}</span>
          </div>
          <div style={{ color: "var(--color-text-secondary)", marginTop: 2 }}>{a.content}</div>
        </div>
      ))}
    </div>
  );
}
