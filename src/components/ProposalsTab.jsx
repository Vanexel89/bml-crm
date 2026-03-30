import React, { useState, useEffect, useMemo } from 'react';
import { Badge, Combobox } from './ui.jsx';
import { C, EMAIL_SIGNATURE } from '../constants.js';
import { uid, fmtFull } from '../utils.js';
import { apiCall } from '../api.js';
import { calcChain } from '../rates/calcChain.js';
import { calcWeightSurcharge } from '../rates/weightSurcharge.js';
import { EMPTY_VARIANT, formatKPVariant, buildKPEmailHtml, buildKPPlainText } from '../kp/buildKPEmail.js';

export function ProposalsTab({ proposals, leads, up, settings, kpFromCalc, setKpFromCalc, freight, boxes, drops, railway, autoMsk, customAuto, logoB64 }) {
  const [show, setShow] = useState(false);
  const [leadId, setLeadId] = useState("");
  const [kpType, setKpType] = useState("intro");
  const [variants, setVariants] = useState([EMPTY_VARIANT()]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [expandedKP, setExpandedKP] = useState(null);
  const [sending, setSending] = useState(null);
  const [showDeparture, setShowDeparture] = useState(true);
  const [autoCalcMode, setAutoCalcMode] = useState(false);

  const polOptions = useMemo(() => [...new Set((freight || []).map(r => r.pol))].sort(), [freight]);
  const cityOptions = useMemo(() => [...new Set((railway || []).map(r => r.city))].sort(), [railway]);

  // Auto-fill from calculator (single variant)
  useEffect(() => {
    if (kpFromCalc && !kpFromCalc.fromLead) {
      const v = EMPTY_VARIANT();
      v.ctype = kpFromCalc.ctype || "40HC";
      v.port = kpFromCalc.pol || "";
      v.isRubFreight = !!kpFromCalc.isRubFreight;
      v.freight_base = String(kpFromCalc.freightBase || "");
      v.freight_rub = kpFromCalc.isRubFreight ? String(kpFromCalc.freightRub || "") : "";
      v.freight_margin = String(kpFromCalc.freightMargin || "100");
      v.weight_surcharge = kpFromCalc.weightSurcharge || 0;
      v.railway_dest = kpFromCalc.railwayDest || "";
      v.railway_base = String(kpFromCalc.railwayBase || "");
      v.railway_margin = String(kpFromCalc.railwayMargin || "10000");
      v.security = String(kpFromCalc.guard || "5932");
      v.security_on = (kpFromCalc.guard || 0) > 0;
      v.truck_on = (kpFromCalc.autoPrice || 0) > 0;
      v.truck_city = kpFromCalc.autoCity || "";
      v.truck_price = String(kpFromCalc.autoPrice || "");
      v.departure_date = kpFromCalc.departure || "";
      setVariants([v]);
      setKpType(kpFromCalc.departure ? "specific" : "intro");
      setShow(true);
      setAutoCalcMode(false);
      setKpFromCalc(null);
    }
  }, [kpFromCalc]);

  // Auto-fill from lead routes (multiple variants via calcChain)
  useEffect(() => {
    if (kpFromCalc && kpFromCalc.fromLead) {
      const { leadId: lid, routes } = kpFromCalc;
      setLeadId(lid);
      setAutoCalcMode(true);
      const marginUsd = settings?.marginUsd || 100;
      const marginRub = settings?.marginRub || 5000;
      const newVariants = [];
      routes.forEach(route => {
        const rawCtype = (route.ctype || "40HC");
        const ctype = rawCtype.includes("20") ? "20" : "40";
        const weight = route.weight_kg ? Number(route.weight_kg) / 1000 : 22;
        const allResults = calcChain(
          { freight, boxes, drops, railway, autoMsk, customAuto, settings: { ...settings, marginUsd, marginRub } },
          { pol: route.port, city: route.city, ctype, weight }
        );
        const v = EMPTY_VARIANT();
        v.ctype = ctype === "20" ? "20DC" : "40HC";
        v.port = route.port || "";
        v.railway_dest = route.city || "";
        v.weight_kg = route.weight_kg || "";
        v._allResults = allResults;
        v._selectedIdx = 0;
        if (allResults.length > 0) {
          const best = allResults[0];
          v.isRubFreight = !!best.isRubFreight;
          v.freight_base = best.isRubFreight ? "0" : String(best.totalFreightUsd || "");
          v.freight_rub = best.isRubFreight ? String(best.freightRubRaw || best.freightRub || "") : "";
          v.freight_margin = String(marginUsd);
          v.railway_base = String(best.rwBase || "");
          v.railway_margin = String(marginRub);
          v.security = String(best.rwGuard || "5932");
          v.security_on = (best.rwGuard || 0) > 0;
          v.truck_on = (best.autoRub || 0) > 0;
          v.truck_city = best.autoLabel ? route.city : "";
          v.truck_price = String(best.autoRub || "");
          v.departure_date = best.departure || "";
          v._line = best.line;
          v._ownerType = best.ownerType;
          v._totalRub = best.totalRub;
          v._service = best.service;
          v.weight_surcharge = best.weightSurcharge || 0;
        } else {
          v._noRate = true;
          v._debugPol = route.port;
          v._debugCity = route.city;
          v._debugCtype = ctype;
        }
        newVariants.push(v);
      });
      setVariants(newVariants.length > 0 ? newVariants : [EMPTY_VARIANT()]);
      setKpType(newVariants.some(v => v.departure_date) ? "specific" : "intro");
      setShow(true);
      setKpFromCalc(null);
    }
  }, [kpFromCalc]);

  const switchVariantResult = (variantId, resultIdx) => {
    setVariants(prev => prev.map(v => {
      if (v.id !== variantId || !v._allResults || !v._allResults[resultIdx]) return v;
      const r = v._allResults[resultIdx];
      const marginUsd = settings?.marginUsd || 100;
      const marginRub = settings?.marginRub || 5000;
      return { ...v, _selectedIdx: resultIdx, isRubFreight: !!r.isRubFreight,
        freight_base: r.isRubFreight ? "0" : String(r.totalFreightUsd || ""),
        freight_rub: r.isRubFreight ? String(r.freightRubRaw || r.freightRub || "") : "",
        freight_margin: String(marginUsd), railway_base: String(r.rwBase || ""),
        railway_margin: String(marginRub), security: String(r.rwGuard || "5932"),
        security_on: (r.rwGuard || 0) > 0, truck_on: (r.autoRub || 0) > 0,
        truck_city: r.autoLabel ? v.railway_dest : "", truck_price: String(r.autoRub || ""),
        departure_date: r.departure || "", _line: r.line, _ownerType: r.ownerType,
        _totalRub: r.totalRub, _service: r.service, _noRate: false,
        weight_surcharge: r.weightSurcharge || 0,
      };
    }));
  };

  const sendEmail = async (proposal) => {
    if (!proposal.emails || proposal.emails.length === 0) { alert("У лида нет почты для КП"); return; }
    setSending(proposal.id);
    try {
      const payload = {
        to: proposal.emails,
        subject: (settings?.kpSubject || `Ставки BML ${new Date().toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}`).replace(/\[компания\]/gi, proposal.company || "").replace(/\[порт\]/gi, proposal.variants?.[0]?.port || ""),
        body: proposal.text,
        html: proposal.html || undefined,
      };
      if (proposal.emails_cc && proposal.emails_cc.length > 0) payload.cc = proposal.emails_cc;
      const res = await apiCall("POST", "/api/send", payload);
      if (res.ok) {
        up("proposals", p => p.map(x => x.id === proposal.id ? { ...x, status: "sent", sent: new Date().toISOString() } : x));
        alert("Отправлено на " + proposal.emails.join(", ") + (proposal.emails_cc?.length ? " (CC: " + proposal.emails_cc.join(", ") + ")" : ""));
      } else {
        alert("Ошибка: " + (res.error || JSON.stringify(res)));
      }
    } catch (err) { alert("Ошибка сети: " + err.message); }
    setSending(null);
  };

  const selectedLead = leads.find(l => l.id === leadId);
  const kpEmails = selectedLead?.emails_kp || [];
  const kpEmailsCc = selectedLead?.emails_cc || [];
  const contactFirstName = (selectedLead?.contact_name || "").split(" ")[0] || "";
  const greetingName = selectedLead?.greeting_name || contactFirstName || "";
  const emailGreeting = greetingName ? `${greetingName}, добрый день.` : "Добрый день!";
  const usdRate = settings?.usdRate || 90;

  const addVariant = () => setVariants(p => [...p, EMPTY_VARIANT()]);
  const rmVariant = (id) => setVariants(p => p.filter(v => v.id !== id));
  const updVariant = (id, field, val) => setVariants(p => p.map(v => v.id === id ? { ...v, [field]: val } : v));

  const fullKPText = useMemo(() => buildKPPlainText(emailGreeting, variants, EMAIL_SIGNATURE, showDeparture, usdRate), [variants, emailGreeting, showDeparture, usdRate]);
  const fullKPHtml = useMemo(() => buildKPEmailHtml(emailGreeting, variants, EMAIL_SIGNATURE, showDeparture, logoB64 || "", usdRate), [variants, emailGreeting, showDeparture, usdRate, logoB64]);

  const saveKP = () => {
    const lead = leads.find(l => l.id === leadId);
    up("proposals", p => [...p, {
      id: uid(), lead_id: leadId, company: lead?.company_name || "",
      type: kpType, variants: variants.map(v => { const { _noRate, _allResults, _selectedIdx, _line, _ownerType, _totalRub, _service, _debugPol, _debugCity, _debugCtype, ...rest } = v; return rest; }),
      text: fullKPText, html: fullKPHtml, emails: kpEmails, emails_cc: kpEmailsCc,
      ver: p.filter(x => x.lead_id === leadId).length + 1,
      status: "draft", created: new Date().toISOString(), sent: null,
      rateSnapshot: variants.map(v => ({
        port: v.port, city: v.railway_dest, ctype: v.ctype,
        freightBase: Number(v.freight_base || 0), railwayBase: Number(v.railway_base || 0),
      })),
    }]);
    setShow(false); setVariants([EMPTY_VARIANT()]); setLeadId(""); setAutoCalcMode(false);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={C.section}>Коммерческие предложения ({proposals.length})</div>
        <button style={C.btn(true)} onClick={() => setShow(!show)}>+ Новое КП</button>
      </div>

      {show && (
        <div style={C.card}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <div style={C.lbl}>Клиент</div>
              <select style={{ ...C.sel, width: "100%" }} value={leadId} onChange={e => setLeadId(e.target.value)}>
                <option value="">Выбрать...</option>
                {leads.filter(l => !["lost"].includes(l.status)).map(l => <option key={l.id} value={l.id}>{l.company_name}</option>)}
              </select>
              {kpEmails.length > 0 && <div style={{ fontSize: 11, color: "var(--color-text-info)", marginTop: 3 }}>→ {kpEmails.join(", ")}</div>}
              {kpEmails.length === 0 && leadId && <div style={{ fontSize: 11, color: "#A32D2D", marginTop: 3 }}>Нет почты для КП! Добавь в карточке лида.</div>}
            </div>
            <div>
              <div style={C.lbl}>Тип КП</div>
              <select style={{ ...C.sel, width: "100%" }} value={kpType} onChange={e => setKpType(e.target.value)}>
                <option value="intro">Ознакомительное</option>
                <option value="specific">Конкретное (под выход)</option>
              </select>
            </div>
          </div>

          {/* Global margin + weight controls */}
          {variants.length > 1 && (
            <div style={{ display: "flex", gap: 6, alignItems: "flex-end", marginBottom: 10, padding: "8px 12px", background: "#FAEEDA", borderRadius: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#854F0B", whiteSpace: "nowrap", paddingBottom: 4 }}>Маржа:</span>
              <div><div style={{ ...C.lbl, fontSize: 9 }}>Фрахт $</div><input style={{ ...C.inp, width: 70, fontSize: 11, padding: "4px 6px" }} type="number" id="gm_freight" defaultValue={settings?.marginUsd || 100} /></div>
              <div><div style={{ ...C.lbl, fontSize: 9 }}>ЖД ₽</div><input style={{ ...C.inp, width: 80, fontSize: 11, padding: "4px 6px" }} type="number" id="gm_rw" defaultValue={settings?.marginRub || 5000} /></div>
              <button style={{ ...C.btn(), fontSize: 10, padding: "4px 8px" }} onClick={() => { const mf = Number(document.getElementById("gm_freight")?.value || 0); const mr = Number(document.getElementById("gm_rw")?.value || 0); setVariants(p => p.map(v => ({ ...v, freight_margin: String(mf), railway_margin: String(mr) }))); }}>Все</button>
              <button style={{ ...C.btn(), fontSize: 10, padding: "4px 8px" }} onClick={() => { const mf = Number(document.getElementById("gm_freight")?.value || 0); const mr = Number(document.getElementById("gm_rw")?.value || 0); setVariants(p => p.map(v => (v.ctype || "").includes("20") ? { ...v, freight_margin: String(mf), railway_margin: String(mr) } : v)); }}>20'</button>
              <button style={{ ...C.btn(), fontSize: 10, padding: "4px 8px" }} onClick={() => { const mf = Number(document.getElementById("gm_freight")?.value || 0); const mr = Number(document.getElementById("gm_rw")?.value || 0); setVariants(p => p.map(v => (v.ctype || "").includes("40") ? { ...v, freight_margin: String(mf), railway_margin: String(mr) } : v)); }}>40'</button>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#854F0B", whiteSpace: "nowrap", paddingBottom: 4, marginLeft: 8 }}>Вес:</span>
              <div><div style={{ ...C.lbl, fontSize: 9 }}>кг</div><input style={{ ...C.inp, width: 70, fontSize: 11, padding: "4px 6px" }} type="number" id="gm_weight" placeholder="27000" /></div>
              <button style={{ ...C.btn(), fontSize: 10, padding: "4px 8px" }} onClick={() => { const wkg = document.getElementById("gm_weight")?.value || ""; const wt = Number(wkg) / 1000; setVariants(p => p.map(v => { const is20 = (v.ctype || "").includes("20"); const comment = v._allResults?.[v._selectedIdx || 0]?.comment || ""; const ws = wkg ? calcWeightSurcharge(comment, is20, wt) : { surcharge: 0 }; return { ...v, weight_kg: wkg, weight_surcharge: ws.surcharge }; })); }}>Все</button>
              <button style={{ ...C.btn(), fontSize: 10, padding: "4px 8px" }} onClick={() => { const wkg = document.getElementById("gm_weight")?.value || ""; const wt = Number(wkg) / 1000; setVariants(p => p.map(v => { if (!(v.ctype || "").includes("20")) return v; const comment = v._allResults?.[v._selectedIdx || 0]?.comment || ""; const ws = wkg ? calcWeightSurcharge(comment, true, wt) : { surcharge: 0 }; return { ...v, weight_kg: wkg, weight_surcharge: ws.surcharge }; })); }}>20'</button>
              <button style={{ ...C.btn(), fontSize: 10, padding: "4px 8px" }} onClick={() => { const wkg = document.getElementById("gm_weight")?.value || ""; const wt = Number(wkg) / 1000; setVariants(p => p.map(v => { if (!(v.ctype || "").includes("40")) return v; const comment = v._allResults?.[v._selectedIdx || 0]?.comment || ""; const ws = wkg ? calcWeightSurcharge(comment, false, wt) : { surcharge: 0 }; return { ...v, weight_kg: wkg, weight_surcharge: ws.surcharge }; })); }}>40'</button>
            </div>
          )}

          {/* Variants */}
          {autoCalcMode && variants.some(v => v._noRate) && (
            <div style={{ padding: "8px 12px", background: "#FAEEDA", borderRadius: 8, marginBottom: 8, fontSize: 11, color: "#854F0B" }}>
              ⚠ Для некоторых направлений ставки не найдены — заполни вручную
            </div>
          )}
          {variants.map((v, vi) => (
            <div key={v.id} style={{ background: v._noRate ? "var(--color-background-danger)" : "var(--color-background-secondary)", borderRadius: 10, padding: 12, marginBottom: 8, position: "relative" }}>
              {variants.length > 1 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>Вариант {vi + 1}</div>
                  <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 16 }} onClick={() => rmVariant(v.id)}>×</button>
                </div>
              )}

              {v._allResults && v._allResults.length > 0 && (
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8, padding: "6px 8px", background: "var(--color-background-primary)", borderRadius: 6 }}>
                  <span style={{ fontSize: 10, color: "var(--color-text-tertiary)", fontWeight: 500 }}>Линия:</span>
                  <select style={{ ...C.sel, fontSize: 11, padding: "3px 6px", flex: 1 }} value={v._selectedIdx || 0} onChange={e => switchVariantResult(v.id, Number(e.target.value))}>
                    {v._allResults.map((r, ri) => (
                      <option key={ri} value={ri}>
                        {r.line} / {r.ownerType} — ${r.isRubFreight ? 0 : r.totalFreightUsd} + ЖД {r.rwBase?.toLocaleString("ru")}₽ = {r.totalRub?.toLocaleString("ru")}₽ {r.departure ? `| выход ${r.departure}` : ""} {r.dateWarnings?.length ? "⚠" : ""}
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>{v._allResults.length} вар.</span>
                </div>
              )}
              {v._line && !v._allResults && <div style={{ fontSize: 10, color: "var(--color-text-info)", marginBottom: 6 }}>Линия: {v._line} / {v._ownerType}</div>}
              {v._noRate && <div style={{ fontSize: 10, color: "#A32D2D", marginBottom: 6 }}>Ставки не найдены: {v._debugPol || v.port} → {v._debugCity || v.railway_dest} ({v._debugCtype || v.ctype}). Заполни вручную или проверь названия.</div>}

              {/* Freight */}
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>Фрахт</div>
              <div style={{ display: "grid", gridTemplateColumns: "80px 60px 1fr 100px 100px", gap: 6, marginBottom: 8 }}>
                <div><div style={{ ...C.lbl, fontSize: 10 }}>Тип конт.</div><select style={{ ...C.sel, width: "100%", fontSize: 11, padding: "5px 4px" }} value={v.ctype} onChange={e => updVariant(v.id, "ctype", e.target.value)}><option>20DC</option><option>40DC</option><option>40HC</option></select></div>
                <div><div style={{ ...C.lbl, fontSize: 10 }}>Условия</div><select style={{ ...C.sel, width: "100%", fontSize: 11, padding: "5px 4px" }} value={v.incoterms} onChange={e => updVariant(v.id, "incoterms", e.target.value)}><option>FOB</option><option>CIF</option><option>EXW</option><option>CFR</option></select></div>
                <div><div style={{ ...C.lbl, fontSize: 10 }}>Порт выхода</div><Combobox value={v.port} onChange={val => updVariant(v.id, "port", val)} options={polOptions} placeholder="Wuhan" style={{ fontSize: 11 }} /></div>
                <div><div style={{ ...C.lbl, fontSize: 10 }}>{v.isRubFreight ? "Фрахт ₽" : "Базовая $"}</div><input style={{ ...C.inp, fontSize: 11, padding: "5px 6px" }} type="number" placeholder={v.isRubFreight ? "174170" : "1800"} value={v.isRubFreight ? v.freight_rub : v.freight_base} onChange={e => updVariant(v.id, v.isRubFreight ? "freight_rub" : "freight_base", e.target.value)} /></div>
                <div><div style={{ ...C.lbl, fontSize: 10 }}>Маржа $</div><input style={{ ...C.inp, fontSize: 11, padding: "5px 6px", background: "#FAEEDA" }} type="number" value={v.freight_margin} onChange={e => updVariant(v.id, "freight_margin", e.target.value)} />{v.isRubFreight && v.freight_margin > 0 && <div style={{ fontSize: 9, color: "var(--color-text-tertiary)", marginTop: 2 }}>= {Math.round(Number(v.freight_margin) * usdRate).toLocaleString("ru")} ₽</div>}</div>
              </div>

              {/* Railway */}
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>Ж.д. перевозка</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px", gap: 6, marginBottom: 8 }}>
                <div><div style={{ ...C.lbl, fontSize: 10 }}>Станция назначения</div><Combobox value={v.railway_dest} onChange={val => updVariant(v.id, "railway_dest", val)} options={cityOptions} placeholder="Москва (МО)" style={{ fontSize: 11 }} /></div>
                <div><div style={{ ...C.lbl, fontSize: 10 }}>Базовая ₽</div><input style={{ ...C.inp, fontSize: 11, padding: "5px 6px" }} type="number" placeholder="155500" value={v.railway_base} onChange={e => updVariant(v.id, "railway_base", e.target.value)} /></div>
                <div><div style={{ ...C.lbl, fontSize: 10 }}>Маржа ₽</div><input style={{ ...C.inp, fontSize: 11, padding: "5px 6px", background: "#FAEEDA" }} type="number" value={v.railway_margin} onChange={e => updVariant(v.id, "railway_margin", e.target.value)} /></div>
              </div>

              {/* Optional items */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, cursor: "pointer" }}>
                  <input type="checkbox" checked={v.security_on} onChange={e => updVariant(v.id, "security_on", e.target.checked)} />
                  Охрана РЖД
                  {v.security_on && <input style={{ ...C.inp, width: 80, fontSize: 11, padding: "3px 5px", marginLeft: 4 }} type="number" value={v.security} onChange={e => updVariant(v.id, "security", e.target.value)} />}
                  {v.security_on && <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>₽</span>}
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, cursor: "pointer" }}>
                  <input type="checkbox" checked={v.truck_on} onChange={e => { updVariant(v.id, "truck_on", e.target.checked); if (e.target.checked && !v.truck_city) updVariant(v.id, "truck_city", v.railway_dest || ""); }} />
                  Автовывоз
                </label>
                <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                    Вес, кг: <input style={{ ...C.inp, width: 80, fontSize: 11, padding: "3px 5px" }} type="number" placeholder="опц." value={v.weight_kg} onChange={e => updVariant(v.id, "weight_kg", e.target.value)} />
                  </label>
                </div>
                {kpType === "specific" && (
                  <div style={{ fontSize: 11 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      Выход: <input style={{ ...C.inp, width: 110, fontSize: 11, padding: "3px 5px" }} type="date" value={v.departure_date} onChange={e => updVariant(v.id, "departure_date", e.target.value)} />
                    </label>
                  </div>
                )}
              </div>

              {v.truck_on && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px", gap: 6, marginTop: 6 }}>
                  <div><div style={{ ...C.lbl, fontSize: 10 }}>Город доставки</div><input style={{ ...C.inp, fontSize: 11, padding: "5px 6px" }} placeholder="Вязники" value={v.truck_city} onChange={e => updVariant(v.id, "truck_city", e.target.value)} /></div>
                  <div><div style={{ ...C.lbl, fontSize: 10 }}>Км от МКАД</div><input style={{ ...C.inp, fontSize: 11, padding: "5px 6px" }} type="number" placeholder="300" value={v.truck_km_mkad} onChange={e => updVariant(v.id, "truck_km_mkad", e.target.value)} /></div>
                  <div><div style={{ ...C.lbl, fontSize: 10 }}>Стоимость ₽</div><input style={{ ...C.inp, fontSize: 11, padding: "5px 6px" }} type="number" placeholder="99500" value={v.truck_price} onChange={e => updVariant(v.id, "truck_price", e.target.value)} /></div>
                </div>
              )}

              {/* Live preview */}
              <div style={{ marginTop: 8, padding: "6px 8px", background: "var(--color-background-primary)", borderRadius: 6, fontSize: 11, fontFamily: "monospace", whiteSpace: "pre-wrap", color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                {formatKPVariant(v, vi, showDeparture, usdRate)}
              </div>
            </div>
          ))}

          <button style={{ ...C.btn(), marginBottom: 10 }} onClick={addVariant}>+ Добавить вариант</button>

          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, cursor: "pointer" }}>
              <input type="checkbox" checked={showDeparture} onChange={e => setShowDeparture(e.target.checked)} />
              Показывать дату выхода
            </label>
            <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
              Формат: {variants.length >= 3 ? "HTML-таблица" : "текстовый"} | Обращение: «{emailGreeting}»
            </span>
          </div>

          <button style={C.btn()} onClick={() => setPreviewOpen(!previewOpen)}>{previewOpen ? "Скрыть превью" : "Превью письма"}</button>
          {previewOpen && (
            <div style={{ marginTop: 8 }}>
              {variants.length >= 3 ? (
                <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, overflow: "hidden" }}>
                  <div dangerouslySetInnerHTML={{ __html: fullKPHtml }} />
                </div>
              ) : (
                <div style={{ padding: 12, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, fontSize: 12, fontFamily: "monospace", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                  {fullKPText}
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 6, marginTop: 12, justifyContent: "flex-end", alignItems: "center" }}>
            {leadId && <button style={{ ...C.btn(), fontSize: 11 }} onClick={() => { navigator.clipboard?.writeText(fullKPText); }}>Копировать текст</button>}
            <button style={C.btn()} onClick={() => { setShow(false); setVariants([EMPTY_VARIANT()]); setAutoCalcMode(false); }}>Отмена</button>
            <button style={C.btn(true)} onClick={saveKP} disabled={!leadId}>Сохранить КП</button>
          </div>
        </div>
      )}

      {/* Saved proposals list */}
      {proposals.length === 0 ? <div style={{ ...C.card, ...C.empty }}>Нет КП</div> : (
        [...proposals].reverse().map(p => (
          <div key={p.id} style={{ ...C.card, padding: "11px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontWeight: 600 }}>{p.company}</span>
                <Badge color={p.type === "intro" ? "#185FA5" : "#D85A30"} bg={p.type === "intro" ? "#E6F1FB" : "#FAECE7"}>{p.type === "intro" ? "Ознак." : "Конкрет."}</Badge>
                <Badge color={p.status === "sent" ? "#3B6D11" : "#6B7280"} bg={p.status === "sent" ? "#EAF3DE" : "#F3F4F6"}>
                  {p.status === "draft" ? "Черновик" : "Отправлено"}
                </Badge>
                <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>#{p.ver} — {fmtFull(p.created)}</span>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button style={{ ...C.btn(), fontSize: 11 }} onClick={() => setExpandedKP(expandedKP === p.id ? null : p.id)}>
                  {expandedKP === p.id ? "Скрыть" : "Превью"}
                </button>
                <button style={{ ...C.btn(), fontSize: 11 }} onClick={() => { navigator.clipboard?.writeText(p.text || ""); }}>Копировать</button>
                {p.status === "draft" && p.emails?.length > 0 && <button style={{ ...C.btn(true), fontSize: 11 }} onClick={() => sendEmail(p)} disabled={sending === p.id}>{sending === p.id ? "Отправка..." : "Отправить"}</button>}
                {p.status === "draft" && (!p.emails || p.emails.length === 0) && <button style={{ ...C.btn(), fontSize: 11, color: "var(--color-text-tertiary)" }} disabled>Нет почты</button>}
              </div>
            </div>
            {p.emails?.length > 0 && <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginTop: 3 }}>To: {p.emails.join(", ")}{p.emails_cc?.length > 0 ? ` | CC: ${p.emails_cc.join(", ")}` : ""}</div>}
            {p.variants && <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginTop: 3 }}>{p.variants.length} вариант(ов): {p.variants.map(v => `${v.ctype} ${v.port || "?"} → ${v.railway_dest || "?"}`).join(" | ")}</div>}
            {expandedKP === p.id && (
              <div style={{ marginTop: 8, borderRadius: 8, overflow: "hidden", border: "0.5px solid var(--color-border-tertiary)" }}>
                {p.html ? (
                  <div dangerouslySetInnerHTML={{ __html: p.html }} />
                ) : (
                  <div style={{ padding: 10, background: "var(--color-background-secondary)", fontSize: 12, fontFamily: "monospace", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                    {p.text}
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
