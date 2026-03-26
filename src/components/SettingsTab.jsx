import React, { useState, useEffect } from 'react';
import { C } from '../constants.js';
import { apiCall, setApiKey } from '../api.js';

export function SettingsTab({ settings, customAuto, up, onLogout }) {
  const [usdRate, setUsdRate] = useState(String(settings?.usdRate || 90));
  const [marginUsd, setMarginUsd] = useState(String(settings?.marginUsd || 100));
  const [marginRub, setMarginRub] = useState(String(settings?.marginRub || 5000));
  const [kpSubject, setKpSubject] = useState(settings?.kpSubject || "");
  const [testEmail, setTestEmail] = useState("");
  const [testResult, setTestResult] = useState("");
  const [serverInfo, setServerInfo] = useState(null);
  const [newAuto, setNewAuto] = useState({ city: "", p20: "", p40: "" });

  useEffect(() => {
    apiCall("GET", "/api/health").then(d => setServerInfo(d)).catch(() => {});
  }, []);

  const saveSettings = () => {
    up("settings", () => ({ usdRate: Number(usdRate), marginUsd: Number(marginUsd), marginRub: Number(marginRub), kpSubject }));
  };

  const sendTestEmail = async () => {
    if (!testEmail) { setTestResult("Введи email"); return; }
    setTestResult("Отправка...");
    try {
      const res = await apiCall("POST", "/api/send", {
        to: testEmail,
        subject: "Тест BML CRM",
        body: "Тестовое письмо из BML Sales Panel. Если вы видите это — отправка работает.",
      });
      if (res.ok) setTestResult("Отправлено! Проверь почту " + testEmail);
      else setTestResult("Ошибка: " + (res.error || JSON.stringify(res)));
    } catch (err) { setTestResult("Ошибка сети: " + err.message); }
  };

  const addAuto = () => {
    if (!newAuto.city) return;
    up("customAuto", p => [...(p || []).filter(a => a.city.toLowerCase() !== newAuto.city.toLowerCase()), { city: newAuto.city, p20: Number(newAuto.p20) || 0, p40: Number(newAuto.p40) || 0 }]);
    setNewAuto({ city: "", p20: "", p40: "" });
  };

  return (
    <div>
      <div style={C.section}>Настройки</div>
      <div style={C.card}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>Курс и маржа</div>
        <div style={C.g3}>
          <div><div style={C.lbl}>Курс USD/RUB</div><input style={C.inp} type="number" value={usdRate} onChange={e => setUsdRate(e.target.value)} /></div>
          <div><div style={C.lbl}>Маржа фрахт ($/конт)</div><input style={C.inp} type="number" value={marginUsd} onChange={e => setMarginUsd(e.target.value)} /></div>
          <div><div style={C.lbl}>Маржа ЖД (₽/конт)</div><input style={C.inp} type="number" value={marginRub} onChange={e => setMarginRub(e.target.value)} /></div>
        </div>
        <div style={{ marginTop: 10 }}>
          <div style={C.lbl}>Тема КП <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>[компания] [порт]</span></div>
          <input style={{ ...C.inp, width: "100%" }} value={kpSubject} onChange={e => setKpSubject(e.target.value)} placeholder="Ставки BML дд.мм" />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
          <button style={C.btn(true)} onClick={saveSettings}>Сохранить</button>
        </div>
      </div>

      <div style={{ ...C.card, marginTop: 10 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>Почта (SMTP)</div>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 8 }}>
          SMTP настроен на сервере. {serverInfo?.smtp ? <span style={{ color: "#3B6D11" }}>✓ Подключен ({serverInfo.smtpUser})</span> : serverInfo?.smtpError ? <span style={{ color: "#A32D2D" }}>✗ Ошибка: {serverInfo.smtpError}</span> : <span style={{ color: "#A32D2D" }}>✗ Не настроен ({serverInfo?.smtpUser})</span>}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}><div style={C.lbl}>Тестовое письмо</div><input style={C.inp} value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="test@email.com" onKeyDown={e => e.key === "Enter" && sendTestEmail()} /></div>
          <button style={C.btn(true)} onClick={sendTestEmail}>Отправить тест</button>
        </div>
        {testResult && <div style={{ fontSize: 11, marginTop: 6, color: testResult.includes("Отправлено") ? "#3B6D11" : "#A32D2D" }}>{testResult}</div>}
      </div>

      <div style={{ ...C.card, marginTop: 10 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>Сервер</div>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
          {serverInfo ? (<span>БД: ✓ | SMTP: {serverInfo.smtp ? "✓" : "✗"} | Ключей: {serverInfo.keys}</span>) : "Загрузка..."}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          <button style={{ ...C.btn(), color: "#A32D2D" }} onClick={() => { if (confirm("Выйти из CRM?")) { setApiKey(""); onLogout(); } }}>Выйти (сменить ключ)</button>
        </div>
      </div>

      <div style={{ ...C.card, marginTop: 10 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>Управление данными</div>
        <p style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 8 }}>Осторожно — действия необратимы.</p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button style={{ ...C.btn(), color: "#A32D2D", fontSize: 11 }} onClick={() => { if (confirm("Удалить ВСЕХ лидов? Это необратимо!")) { up("leads", () => []); up("touches", () => []); up("activities", () => []); alert("Лиды очищены"); } }}>Очистить лидов</button>
          <button style={{ ...C.btn(), color: "#A32D2D", fontSize: 11 }} onClick={() => { if (confirm("Удалить ВСЕ КП? Это необратимо!")) { up("proposals", () => []); alert("КП очищены"); } }}>Очистить КП</button>
          <button style={{ ...C.btn(), color: "#A32D2D", fontSize: 11 }} onClick={() => { if (confirm("Удалить ВСЕ ставки? Это необратимо!")) { up("freight", () => []); up("boxes", () => []); up("drops", () => []); up("railway", () => []); up("autoMsk", () => []); alert("Ставки очищены"); } }}>Очистить ставки</button>
        </div>
      </div>

      <div style={{ ...C.card, marginTop: 10 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>Ставки авто (не Москва)</div>
        <p style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 8 }}>Для городов кроме Москвы. Авто Москвы берётся из загруженного Excel.</p>
        {(customAuto || []).map((a, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
            <span style={{ flex: 1, fontWeight: 500 }}>{a.city}</span>
            <span style={{ fontSize: 11 }}>20: {a.p20.toLocaleString("ru")} ₽</span>
            <span style={{ fontSize: 11 }}>40: {a.p40.toLocaleString("ru")} ₽</span>
            <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)" }} onClick={() => up("customAuto", p => (p||[]).filter((_, j) => j !== i))}>×</button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}><div style={C.lbl}>Город</div><input style={C.inp} value={newAuto.city} onChange={e => setNewAuto(p => ({ ...p, city: e.target.value }))} placeholder="Екатеринбург" /></div>
          <div><div style={C.lbl}>20 ₽</div><input style={C.inp} type="number" value={newAuto.p20} onChange={e => setNewAuto(p => ({ ...p, p20: e.target.value }))} /></div>
          <div><div style={C.lbl}>40 ₽</div><input style={C.inp} type="number" value={newAuto.p40} onChange={e => setNewAuto(p => ({ ...p, p40: e.target.value }))} /></div>
          <button style={C.btn(true)} onClick={addAuto}>+</button>
        </div>
      </div>
    </div>
  );
}
