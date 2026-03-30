import React, { useState, useMemo } from 'react';
import { Badge } from './ui.jsx';
import { C } from '../constants.js';
import { fmt, fmtUsd } from '../utils.js';
import { calcChain } from '../rates/calcChain.js';

export function CalcTab({ freight, boxes, drops, railway, autoMsk, customAuto, settings, up, goToKP }) {
  const [pol, setPol] = useState("");
  const [city, setCity] = useState("");
  const [ctype, setCtype] = useState("40");
  const [weight, setWeight] = useState("22");
  const [mUsd, setMUsd] = useState(String(settings?.marginUsd || 100));
  const [mRub, setMRub] = useState(String(settings?.marginRub || 5000));
  const [sortMode, setSortMode] = useState("price");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [readyDate, setReadyDate] = useState("");

  const pols = useMemo(() => [...new Set(freight.map(r => r.pol))].sort(), [freight]);
  const cities = useMemo(() => [...new Set(railway.map(r => r.city))].sort(), [railway]);

  const results = useMemo(() => {
    if (!pol || !city) return [];
    let raw = calcChain(
      { freight, boxes, drops, railway, autoMsk, customAuto, settings: { ...settings, marginUsd: Number(mUsd) || 0, marginRub: Number(mRub) || 0 } },
      { pol, city, ctype, weight: Number(weight) || 22 }
    );
    if (ownerFilter === "SOC") raw = raw.filter(r => r.ownerType === "SOC" || r.ownerType === "COC (вшит)");
    if (ownerFilter === "COC") raw = raw.filter(r => r.ownerType === "COC" || r.ownerType === "COC (вшит)");
    if (readyDate) raw = raw.filter(r => !r.departure || r.departure >= readyDate);
    if (sortMode === "date") return [...raw].sort((a, b) => (a.departure || "9999").localeCompare(b.departure || "9999"));
    return raw;
  }, [pol, city, ctype, weight, mUsd, mRub, freight, boxes, drops, railway, autoMsk, customAuto, settings, sortMode, ownerFilter, readyDate]);

  const best = results[0];
  const usdRate = settings?.usdRate || 90;

  const groupedResults = useMemo(() => {
    const groups = [];
    const keyMap = {};
    results.forEach(r => {
      const key = `${r.line}|${r.ownerType}|${r.totalRub}|${r.service}|${r.terminal}`;
      if (keyMap[key] !== undefined) {
        const g = groups[keyMap[key]];
        if (r.departure && !g.departures.includes(r.departure)) g.departures.push(r.departure);
      } else {
        keyMap[key] = groups.length;
        groups.push({ ...r, departures: r.departure ? [r.departure] : [] });
      }
    });
    return groups;
  }, [results]);

  return (
    <div>
      <div style={C.section}>Калькулятор полной цепочки</div>
      {freight.length === 0 && <div style={{ ...C.card, ...C.empty }}>Сначала загрузи ставки на вкладке "Ставки"</div>}
      {freight.length > 0 && (
        <>
          <div style={{ ...C.card, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr", gap: 8 }}>
            <div><div style={C.lbl}>POL (порт выхода)</div><select style={{ ...C.sel, width: "100%" }} value={pol} onChange={e => setPol(e.target.value)}><option value="">Выбрать</option>{pols.map(o => <option key={o}>{o}</option>)}</select></div>
            <div><div style={C.lbl}>Город назначения</div><select style={{ ...C.sel, width: "100%" }} value={city} onChange={e => setCity(e.target.value)}><option value="">Выбрать</option>{cities.map(c => <option key={c}>{c}</option>)}</select></div>
            <div><div style={C.lbl}>Контейнер</div><select style={{ ...C.sel, width: "100%" }} value={ctype} onChange={e => setCtype(e.target.value)}><option value="20">20'</option><option value="40">40HC</option></select></div>
            <div><div style={C.lbl}>Вес, т</div><input style={C.inp} type="number" value={weight} onChange={e => setWeight(e.target.value)} /></div>
            <div><div style={C.lbl}>Маржа фрахт $</div><input style={C.inp} type="number" value={mUsd} onChange={e => setMUsd(e.target.value)} /></div>
            <div><div style={C.lbl}>Маржа ЖД ₽</div><input style={C.inp} type="number" value={mRub} onChange={e => setMRub(e.target.value)} /></div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Тип:</span>
            {[["all","Все"],["SOC","SOC"],["COC","COC"]].map(([id,l]) => (
              <button key={id} style={{ ...C.btn(ownerFilter === id), fontSize: 11, padding: "3px 10px" }} onClick={() => setOwnerFilter(id)}>{l}</button>
            ))}
            <span style={{ fontSize: 11, color: "var(--color-text-secondary)", marginLeft: 8 }}>Готовность с:</span>
            <input style={{ ...C.inp, width: 140, fontSize: 11, padding: "3px 8px" }} type="date" value={readyDate} onChange={e => setReadyDate(e.target.value)} />
            {readyDate && <button style={{ ...C.btn(), fontSize: 10, padding: "2px 8px" }} onClick={() => setReadyDate("")}>×</button>}
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 8 }}>Курс: <strong>{usdRate} ₽/$</strong> (настройки). Итого маржа: <strong>{best ? `${best.marginTotalRub.toLocaleString("ru")} ₽` : "—"}</strong></div>

          {pol && city && results.length === 0 && <div style={{ ...C.card, ...C.empty }}>Нет вариантов. Проверь связки фрахт→ЖД для этого маршрута.</div>}

          {results.length > 0 && (
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                <div style={{ ...C.metric, borderLeft: "3px solid #3B6D11" }}><div style={{ fontSize: 10, color: "var(--color-text-tertiary)", textTransform: "uppercase", fontWeight: 500 }}>Лучший итого</div><div style={{ fontSize: 20, fontWeight: 700, color: "#3B6D11" }}>{best.totalRub.toLocaleString("ru")} ₽</div><div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{best.line} / {best.ownerType}</div></div>
                <div style={C.metric}><div style={{ fontSize: 10, color: "var(--color-text-tertiary)", textTransform: "uppercase", fontWeight: 500 }}>Фрахт лучший</div><div style={{ fontSize: 18, fontWeight: 700 }}>{best.isRubFreight ? `${best.freightRub.toLocaleString("ru")} ₽` : `$${fmtUsd(best.freightWithMargin)}`}</div><div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{best.isRubFreight ? "в ₽, дроп вкл." : `= $${fmtUsd(best.totalFreightUsd)} + $${Number(mUsd)} маржа`}</div></div>
                <div style={C.metric}><div style={{ fontSize: 10, color: "var(--color-text-tertiary)", textTransform: "uppercase", fontWeight: 500 }}>Вариантов</div><div style={{ fontSize: 18, fontWeight: 700 }}>{groupedResults.length}</div></div>
              </div>

              <div style={{ display: "flex", gap: 4, marginBottom: 8, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "var(--color-text-secondary)", marginRight: 4 }}>Сортировка:</span>
                <button style={{ ...C.btn(sortMode === "price"), fontSize: 11, padding: "3px 10px" }} onClick={() => setSortMode("price")}>По цене ₽</button>
                <button style={{ ...C.btn(sortMode === "date"), fontSize: 11, padding: "3px 10px" }} onClick={() => setSortMode("date")}>По дате выхода</button>
              </div>

              <div style={{ maxHeight: 500, overflow: "auto" }}>
                {groupedResults.map((r, i) => (
                  <div key={r.id} style={{ ...C.card, padding: "12px 14px", borderLeft: i === 0 && sortMode === "price" ? "3px solid #3B6D11" : "3px solid transparent" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-tertiary)" }}>#{i + 1}</span>
                        <strong>{r.line}</strong>
                        <Badge color={r.transship === "DIRECT" ? "#3B6D11" : "#854F0B"} bg={r.transship === "DIRECT" ? "#EAF3DE" : "#FAEEDA"}>{r.transship}</Badge>
                        <Badge color="#185FA5" bg="#E6F1FB">{r.ownerType}</Badge>
                        <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{r.service}</span>
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: i === 0 && sortMode === "price" ? "#3B6D11" : "var(--color-text-primary)" }}>{r.totalRub.toLocaleString("ru")} ₽</div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, fontSize: 11 }}>
                      <div style={{ padding: "6px 8px", background: "var(--color-background-secondary)", borderRadius: 6 }}>
                        <div style={{ color: "var(--color-text-tertiary)", fontSize: 10 }}>Фрахт + {r.boxDropLabel}</div>
                        <div style={{ fontWeight: 600 }}>{r.isRubFreight ? `${r.freightRub.toLocaleString("ru")} ₽` : `$${fmtUsd(r.freightWithMargin)}`} <span style={{ fontWeight: 400, color: "var(--color-text-secondary)" }}>{r.isRubFreight ? `(${r.freightRubRaw?.toLocaleString("ru")} + маржа)` : `(${r.freightRub.toLocaleString("ru")} ₽)`}</span></div>
                        <div style={{ color: "var(--color-text-tertiary)", fontSize: 10 }}>{r.isRubFreight ? "Фрахт в ₽, дроп вкл. в ЖД" : `$${fmtUsd(r.freightUsd)} фрахт ${r.boxDropUsd >= 0 ? "+" : ""}${fmtUsd(r.boxDropUsd)} ${r.ownerType === "SOC" ? "ящик" : "дроп"} + $${Number(mUsd)} маржа${r.weightSurcharge ? ` + $${r.weightSurcharge} вес` : ""}`}</div>
                        {r.weightNote && <div style={{ color: "#854F0B", fontSize: 9, marginTop: 2 }}>⚖ {r.weightNote}</div>}
                        {r.validity && <div style={{ color: "var(--color-text-tertiary)", fontSize: 9, marginTop: 2 }}>Валидн.: {r.validity}</div>}
                      </div>
                      <div style={{ padding: "6px 8px", background: "var(--color-background-secondary)", borderRadius: 6 }}>
                        <div style={{ color: "var(--color-text-tertiary)", fontSize: 10 }}>ЖД ({r.rwTerminal})</div>
                        <div style={{ fontWeight: 600 }}>{r.rwWithMargin.toLocaleString("ru")} ₽</div>
                        <div style={{ color: "var(--color-text-tertiary)", fontSize: 10 }}>{r.rwBase.toLocaleString("ru")} + {Number(mRub).toLocaleString("ru")} маржа</div>
                        {r.rwValidity && <div style={{ color: "var(--color-text-tertiary)", fontSize: 9, marginTop: 2 }}>Валидн.: {r.rwValidity}</div>}
                      </div>
                      <div style={{ padding: "6px 8px", background: "var(--color-background-secondary)", borderRadius: 6 }}>
                        <div style={{ color: "var(--color-text-tertiary)", fontSize: 10 }}>Охрана (справ.)</div>
                        <div style={{ fontWeight: 600 }}>{r.rwGuard.toLocaleString("ru")} ₽</div>
                      </div>
                      <div style={{ padding: "6px 8px", background: "var(--color-background-secondary)", borderRadius: 6 }}>
                        <div style={{ color: "var(--color-text-tertiary)", fontSize: 10 }}>{r.autoLabel || "Авто"}</div>
                        <div style={{ fontWeight: 600 }}>{r.autoRub > 0 ? `${r.autoRub.toLocaleString("ru")} ₽` : "—"}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginTop: 4 }}>
                      {r.departures.length > 0 ? (
                        <span>Выходы: <strong>{r.departures.map(d => fmt(d)).join(", ")}</strong></span>
                      ) : "Выход: под запрос"} | Терминал: {r.terminal} {r.comment ? `| ${r.comment}` : ""}
                      {r.dropValidity ? ` | Дроп: ${r.dropValidity}` : ""}
                    </div>
                    {r.dateWarnings && r.dateWarnings.length > 0 && (
                      <div style={{ display: "flex", gap: 4, marginTop: 3, flexWrap: "wrap" }}>
                        {r.dateWarnings.map((w, wi) => <Badge key={wi} color="#A32D2D" bg="#FCEBEB" style={{ fontSize: 9 }}>⚠ {w}</Badge>)}
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                      <button style={{ ...C.btn(), fontSize: 10, padding: "3px 10px" }} onClick={() => goToKP && goToKP({
                        ctype: ctype === "20" ? "20DC" : "40HC",
                        pol: r.pol,
                        freightBase: r.isRubFreight ? 0 : r.totalFreightUsd,
                        freightRub: r.isRubFreight ? r.freightRubRaw : 0,
                        isRubFreight: r.isRubFreight,
                        freightMargin: Number(mUsd) || 0,
                        railwayDest: city,
                        railwayBase: r.rwBase,
                        railwayMargin: Number(mRub) || 0,
                        guard: r.rwGuard,
                        autoCity: r.autoLabel ? city : "",
                        autoPrice: r.autoRub,
                        departure: r.departures[0] || "",
                        line: r.line,
                        ownerType: r.ownerType,
                        service: r.service,
                        weightSurcharge: r.weightSurcharge || 0,
                      })}>→ Создать КП</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
