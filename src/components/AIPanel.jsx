import React, { useState } from 'react';
import { Badge } from './ui.jsx';
import { C, OUTCOMES } from '../constants.js';
import { apiCall } from '../api.js';
import { fmtFull } from '../utils.js';

export function AIPanel({ lead, touches, activities, proposals }) {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]); // conversation history

  const buildContext = () => {
    // Gather all relevant data about the lead
    const touchesDone = touches
      .filter(t => t.lead_id === lead.id && t.status === "done")
      .sort((a, b) => (a.done || "").localeCompare(b.done || ""))
      .map(t => `${fmtFull(t.done)} | ${t.label}: ${OUTCOMES[t.outcome]?.l || t.outcome || "—"} ${t.note || ""}`);

    const touchesScheduled = touches
      .filter(t => t.lead_id === lead.id && t.status === "scheduled")
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
      .map(t => `${fmtFull(t.date)} | ${t.label} (запланировано)`);

    const notes = activities
      .filter(a => a.lead_id === lead.id && a.type === "note")
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 10)
      .map(a => `${fmtFull(a.at)} | ${a.content}`);

    const kps = (proposals || [])
      .filter(p => p.lead_id === lead.id)
      .map(p => `КП #${p.ver || 1} (${p.status === "sent" ? "отправлено " + fmtFull(p.sent) : "черновик"}) → ${p.emails?.join(", ") || "—"}`);

    const spin = lead.spin || {};
    const spinText = Object.entries(spin).filter(([,v]) => v).map(([k,v]) => `${k}: ${v}`).join("\n");

    return `КОМПАНИЯ: ${lead.company_name} (${lead.company_name_full || ""})
ИНН: ${lead.inn || "—"}
ГРЕЙД: ${lead.grade || "—"} | СТАТУС: ${lead.status || "—"}
КОНТАКТ: ${lead.contact_name || "—"} | ОБРАЩЕНИЕ: ${lead.greeting_name || "—"}
ОБЪЁМ: ${lead.volume_monthly || "?"} ктк/мес
ТОВАР: ${lead.goods || "—"}
НАПРАВЛЕНИЯ: ${(lead.routes || []).map(r => `${r.port}→${r.city} (${r.ctype})`).join(", ") || "—"}
ВОЗРАЖЕНИЕ: ${lead.objections || "нет"}
ИСТОЧНИК: ${lead.source_detail || lead.source || "—"}
КОММЕНТАРИЙ: ${lead.comment || "—"}

SPIN-КВАЛИФИКАЦИЯ:
${spinText || "не заполнено"}

ИСТОРИЯ КАСАНИЙ (${touchesDone.length} выполнено):
${touchesDone.join("\n") || "нет"}

ЗАПЛАНИРОВАНО:
${touchesScheduled.join("\n") || "нет"}

ЗАМЕТКИ:
${notes.join("\n") || "нет"}

КП:
${kps.join("\n") || "не отправлялись"}`;
  };

  const askAI = async (customQuestion) => {
    setLoading(true);
    setError(null);
    try {
      const context = buildContext();
      const userMessage = customQuestion
        ? `Контекст лида:\n${context}\n\nВопрос менеджера: ${customQuestion}`
        : `Контекст лида:\n${context}\n\nПроанализируй ситуацию и дай 2-3 конкретных рекомендации: что делать дальше с этим лидом, какой скрипт использовать, на что обратить внимание.`;

      const messages = [
        ...history,
        { role: "user", content: userMessage },
      ];

      const res = await apiCall("POST", "/api/ai", { messages });
      if (res.ok && res.text) {
        setResponse(res.text);
        setHistory([
          ...history,
          { role: "user", content: userMessage },
          { role: "assistant", content: res.text },
        ]);
      } else {
        setError(res.error || "Нет ответа от AI");
      }
    } catch (err) {
      setError(err.message === "AUTH" ? "Ошибка авторизации" : err.message);
    }
    setLoading(false);
  };

  const [customQ, setCustomQ] = useState("");

  return (
    <div style={{ ...C.card, borderColor: "#534AB722", background: "var(--color-background-primary)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Badge color="#534AB7" bg="#EEEDFE" style={{ fontSize: 11 }}>AI</Badge>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Ассистент</span>
        {history.length > 0 && (
          <button style={{ ...C.btn(), fontSize: 10, padding: "2px 6px", marginLeft: "auto" }}
            onClick={() => { setHistory([]); setResponse(null); }}>Очистить</button>
        )}
      </div>

      {/* Quick action buttons */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
        <button style={{ ...C.btn(), fontSize: 11, padding: "4px 10px", borderColor: "#534AB744", color: "#534AB7" }}
          onClick={() => askAI(null)} disabled={loading}>
          {loading ? "Думаю..." : "Что делать дальше?"}
        </button>
        {lead.objections && (
          <button style={{ ...C.btn(), fontSize: 11, padding: "4px 10px", borderColor: "#854F0B44", color: "#854F0B" }}
            onClick={() => askAI(`Клиент возражает: "${lead.objections}". Как лучше отработать это возражение в контексте контейнерных перевозок через ДВ?`)} disabled={loading}>
            Отработать возражение
          </button>
        )}
        <button style={{ ...C.btn(), fontSize: 11, padding: "4px 10px", borderColor: "#0F6E5644", color: "#0F6E56" }}
          onClick={() => askAI("Напиши короткий скрипт для следующего звонка этому клиенту. Учти историю общения и текущую ситуацию.")} disabled={loading}>
          Скрипт звонка
        </button>
        <button style={{ ...C.btn(), fontSize: 11, padding: "4px 10px", borderColor: "#185FA544", color: "#185FA5" }}
          onClick={() => askAI("Напиши черновик email для этого клиента. Учти историю, товар, маршрут. Тон — деловой но дружелюбный.")} disabled={loading}>
          Черновик email
        </button>
      </div>

      {/* Custom question */}
      <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
        <input style={{ ...C.inp, flex: 1, fontSize: 12 }} value={customQ} onChange={e => setCustomQ(e.target.value)}
          placeholder="Свой вопрос по этому лиду..." onKeyDown={e => { if (e.key === "Enter" && customQ.trim()) { askAI(customQ); setCustomQ(""); } }} />
        <button style={C.btn(true)} disabled={loading || !customQ.trim()}
          onClick={() => { askAI(customQ); setCustomQ(""); }}>→</button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ padding: "12px", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 12 }}>
          Анализирую {lead.company_name}...
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: "8px 12px", background: "var(--color-background-danger)", borderRadius: 8, fontSize: 12, color: "#A32D2D", marginBottom: 8 }}>
          {error}
        </div>
      )}

      {/* Response */}
      {response && !loading && (
        <div style={{ padding: "10px 14px", background: "#EEEDFE33", border: "0.5px solid #534AB722", borderRadius: 8, fontSize: 12, lineHeight: 1.6, color: "var(--color-text-primary)", whiteSpace: "pre-wrap" }}>
          {response}
        </div>
      )}
    </div>
  );
}
