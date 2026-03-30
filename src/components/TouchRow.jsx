import React, { useState } from 'react';
import { Badge } from './ui.jsx';
import { C, OUTCOMES, OBJECTION_TREE, REJECTION_REASONS, SPIN_QUESTIONS } from '../constants.js';
import { today, fmt } from '../utils.js';

export function TouchRow({ t, doTouch }) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState("outcome"); // outcome | objection | laer | callback | reject | redirect
  const [selObjKey, setSelObjKey] = useState(null);
  const [laerStep, setLaerStep] = useState(0); // 0=L,1=A,2=E,3=R
  const [callbackDays, setCallbackDays] = useState(2);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectAction, setRejectAction] = useState("frozen"); // frozen | lost
  const [note, setNote] = useState("");
  const [customObj, setCustomObj] = useState("");
  const [showChallenger, setShowChallenger] = useState(false);
  const [redirectEmail, setRedirectEmail] = useState("");
  const [redirectNote, setRedirectNote] = useState("");

  const d = today();
  const over = t.status === "scheduled" && t.date < d;
  const done = t.status === "done";
  const canc = t.status === "cancelled";
  const tc = t.type === "call" ? "#0F6E56" : t.type === "email" ? "#185FA5" : "#534AB7";
  const tbg = t.type === "call" ? "#E1F5EE" : t.type === "email" ? "#E6F1FB" : "#EEEDFE";

  const reset = () => { setPhase("outcome"); setSelObjKey(null); setLaerStep(0); setNote(""); setCustomObj(""); setCallbackDays(2); setRejectReason(""); setRejectAction("frozen"); setShowChallenger(false); setRedirectEmail(""); setRedirectNote(""); setOpen(false); };

  const submit = (outcome, extra) => {
    const fullNote = [note, extra].filter(Boolean).join(" | ");
    doTouch(t.id, outcome, fullNote, {
      objectionKey: selObjKey,
      callbackDays: outcome === "callback" ? callbackDays : null,
      rejectReason: outcome === "rejected" ? rejectReason : null,
      rejectAction: outcome === "rejected" ? rejectAction : null,
      newEmail: outcome === "redirect" ? redirectEmail : null,
      redirectNote: outcome === "redirect" ? redirectNote : null,
    });
    reset();
  };

  const laerLabels = ["Выслушай", "Согласись", "Исследуй", "Ответь"];
  const laerKeys = ["listen", "acknowledge", "explore", "respond"];
  const laerColors = ["#185FA5", "#0F6E56", "#D85A30", "#534AB7"];

  const objection = selObjKey ? OBJECTION_TREE[selObjKey] : null;
  const spinFocus = t.spin_focus && SPIN_QUESTIONS[t.spin_focus];

  return (
    <div data-touch-row="1" style={{ borderRadius: 10, marginBottom: 6, background: done || canc ? "var(--color-background-secondary)" : over ? "var(--color-background-danger)" : "var(--color-background-primary)", border: done || canc ? "none" : "0.5px solid var(--color-border-tertiary)", opacity: done || canc ? 0.55 : 1, borderLeft: `3px solid ${done || canc ? "transparent" : tc}` }}>
      {/* Main row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px" }}>
        <Badge color={tc} bg={tbg} style={{ fontWeight: 700 }}>{t.num}</Badge>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 500, fontSize: 12 }}>
            {t.label} <span style={{ fontWeight: 400, color: "var(--color-text-secondary)" }}>— {fmt(t.date)}</span>
            {t.hint && t.status === "scheduled" && (
              <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#185FA5", fontFamily: "inherit", marginLeft: 4 }}
                onClick={(ev) => { ev.stopPropagation(); const el = ev.target.closest("[data-touch-row]").querySelector("[data-hint]"); if(el) el.style.display = el.style.display === "none" ? "block" : "none"; }}>
                💡 скрипт
              </button>
            )}
            {t.challenger && t.status === "scheduled" && (
              <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#D85A30", fontFamily: "inherit", marginLeft: 2 }}
                onClick={(ev) => { ev.stopPropagation(); setShowChallenger(!showChallenger); }}>
                🎯 инсайт
              </button>
            )}
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
            {t.desc}
            {t.outcome && <span> | <strong>{OUTCOMES[t.outcome]?.l || t.outcome}</strong></span>}
            {t.note ? ` | ${t.note}` : ""}
          </div>
          {/* Script hint */}
          {t.hint && t.status === "scheduled" && (
            <div data-hint="1" style={{ display: "none", marginTop: 4, padding: "6px 10px", background: "#FEFCE8", border: "0.5px solid #FDE68A", borderRadius: 6, fontSize: 11, color: "#854F0B", lineHeight: 1.4 }}>💡 {t.hint}</div>
          )}
          {/* Challenger insight */}
          {showChallenger && t.challenger && (
            <div style={{ marginTop: 4, padding: "6px 10px", background: "#FAECE7", border: "0.5px solid #F0997B", borderRadius: 6, fontSize: 11, color: "#993C1D", lineHeight: 1.4 }}>🎯 {t.challenger}</div>
          )}
          {/* SPIN focus hint */}
          {spinFocus && t.status === "scheduled" && !open && (
            <div style={{ marginTop: 4, padding: "5px 10px", background: spinFocus.bg, borderRadius: 6, fontSize: 11, border: "0.5px solid transparent" }}>
              <span style={{ fontWeight: 500, color: spinFocus.color }}>{spinFocus.label}:</span>{" "}
              <span style={{ color: "var(--color-text-secondary)" }}>{spinFocus.hint}</span>
            </div>
          )}
        </div>
        {done && <span style={{ fontSize: 11, color: "#3B6D11", fontWeight: 500 }}>done</span>}
        {canc && <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>отмен.</span>}
        {t.status === "scheduled" && !open && <button style={C.btn()} onClick={() => setOpen(true)}>Выполнить</button>}
      </div>

      {/* Expanded action panel */}
      {open && (
        <div style={{ padding: "0 12px 12px" }}>
          {/* Phase: outcome selection */}
          {phase === "outcome" && (
            <div>
              {(t.type === "proposal" || t.type === "email") ? (
                <>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 6 }}>
                    {t.type === "proposal" ? "КП / расчёт:" : "Email:"}
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                    <button style={{ ...C.btn(true), fontSize: 11, padding: "5px 12px", background: "#534AB7" }}
                      onClick={() => submit("sent", t.type === "proposal" ? "КП отправлено" : "Email отправлен")}>
                      📨 Отправлено
                    </button>
                    <button style={{ ...C.btn(), fontSize: 11, padding: "5px 10px", borderColor: "#888780", color: "#888780" }}
                      onClick={() => submit("no_answer", "Не отправлено — нет данных")}>
                      — Не удалось (нет email/маршрута)
                    </button>
                    <button style={{ ...C.btn(), fontSize: 11, padding: "5px 10px", borderColor: "#185FA5", color: "#185FA5" }}
                      onClick={() => setPhase("callback")}>
                      ↻ Отложить
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <input style={{ ...C.inp, flex: 1, fontSize: 11, padding: "4px 8px" }} value={note} onChange={e => setNote(e.target.value)} placeholder="Заметка (необязательно)" />
                    <button style={{ ...C.btn(), fontSize: 11, padding: "4px 8px" }} onClick={reset}>Отмена</button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 6 }}>Результат касания:</div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                    {(t.type === "call" ? [
                      ["interested", OUTCOMES.interested],
                      ["objection", OUTCOMES.objection],
                      ["callback", OUTCOMES.callback],
                      ["redirect", OUTCOMES.redirect],
                      ["dial_fail", OUTCOMES.dial_fail],
                      ["no_answer", { ...OUTCOMES.no_answer, l: "Говорил, без толку" }],
                      ["rejected", OUTCOMES.rejected],
                    ] : Object.entries(OUTCOMES).filter(([k]) => k !== "sent" && k !== "dial_fail" && k !== "redirect")
                    ).map(([k, v]) => (
                      <button key={k} style={{ ...C.btn(), fontSize: 11, padding: "5px 10px", borderColor: v.c, color: v.c }}
                        onClick={() => {
                          if (k === "interested") submit("interested");
                          else if (k === "objection") setPhase("objection");
                          else if (k === "callback") setPhase("callback");
                          else if (k === "redirect") setPhase("redirect");
                          else if (k === "dial_fail") submit("dial_fail", "Недозвон");
                          else if (k === "no_answer") submit("no_answer");
                          else if (k === "rejected") setPhase("reject");
                        }}>
                        {v.icon} {v.l}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <input style={{ ...C.inp, flex: 1, fontSize: 11, padding: "4px 8px" }} value={note} onChange={e => setNote(e.target.value)} placeholder="Заметка (необязательно)" />
                    <button style={{ ...C.btn(), fontSize: 11, padding: "4px 8px" }} onClick={reset}>Отмена</button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Phase: objection selection */}
          {phase === "objection" && (
            <div>
              <div style={{ fontSize: 11, color: "#854F0B", marginBottom: 6, fontWeight: 500 }}>⚡ Какое возражение?</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                {Object.keys(OBJECTION_TREE).map(k => (
                  <button key={k} style={{ ...C.btn(), fontSize: 11, padding: "4px 9px", borderColor: "#FAEEDA", background: "#FAEEDA", color: "#854F0B" }}
                    onClick={() => { setSelObjKey(k); setLaerStep(0); setPhase("laer"); }}>
                    {k}
                  </button>
                ))}
              </div>
              <button style={{ ...C.btn(), fontSize: 11, padding: "4px 8px" }} onClick={() => setPhase("outcome")}>← Назад</button>
            </div>
          )}

          {/* Phase: LAER walkthrough */}
          {phase === "laer" && objection && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#854F0B" }}>⚡ «{selObjKey}»</div>
                <div style={{ display: "flex", gap: 2 }}>
                  {laerLabels.map((l, i) => (
                    <span key={i} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 6, fontWeight: i === laerStep ? 600 : 400, background: i === laerStep ? laerColors[i] + "22" : "transparent", color: i <= laerStep ? laerColors[i] : "var(--color-text-tertiary)", cursor: "pointer" }}
                      onClick={() => setLaerStep(i)}>
                      {l}
                    </span>
                  ))}
                </div>
              </div>

              {/* Current LAER step card */}
              <div style={{ padding: "10px 12px", background: laerColors[laerStep] + "0D", border: `0.5px solid ${laerColors[laerStep]}33`, borderRadius: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: laerColors[laerStep], marginBottom: 4 }}>
                  {laerLabels[laerStep]}
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-primary)", lineHeight: 1.5 }}>
                  {objection.laer[laerKeys[laerStep]]}
                </div>
              </div>

              {/* Navigation + action */}
              <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
                {laerStep > 0 && (
                  <button style={{ ...C.btn(), fontSize: 11, padding: "4px 8px" }} onClick={() => setLaerStep(laerStep - 1)}>← Назад</button>
                )}
                {laerStep < 3 ? (
                  <button style={{ ...C.btn(true), fontSize: 11, padding: "4px 10px" }} onClick={() => setLaerStep(laerStep + 1)}>Далее →</button>
                ) : (
                  <>
                    <button style={{ ...C.btn(true), fontSize: 11, padding: "4px 10px", background: "#3B6D11" }}
                      onClick={() => submit("objection", `Возражение: ${selObjKey}`)}>
                      ✓ Отработано → задача
                    </button>
                    <button style={{ ...C.btn(), fontSize: 11, padding: "4px 10px", borderColor: "#A32D2D", color: "#A32D2D" }}
                      onClick={() => { setNote(`Возражение не отработано: ${selObjKey}`); setPhase("outcome"); }}>
                      ✗ Не удалось
                    </button>
                  </>
                )}
                {laerStep === 3 && objection.fallback && (
                  <div style={{ width: "100%", marginTop: 6, padding: "6px 10px", background: "#FEFCE8", border: "0.5px solid #FDE68A", borderRadius: 6, fontSize: 11, color: "#854F0B" }}>
                    💡 Если не сработало: {objection.fallback}
                  </div>
                )}
                {laerStep === 0 && (
                  <button style={{ ...C.btn(), fontSize: 11, padding: "4px 8px" }} onClick={() => setPhase("objection")}>← К возражениям</button>
                )}
              </div>
            </div>
          )}

          {/* Phase: callback */}
          {phase === "callback" && (
            <div>
              <div style={{ fontSize: 11, color: "#185FA5", marginBottom: 6, fontWeight: 500 }}>↻ Когда перезвонить?</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                {[1, 2, 3, 5, 7, 14].map(d => (
                  <button key={d} style={{ ...C.btn(), fontSize: 11, padding: "4px 10px", borderColor: callbackDays === d ? "#185FA5" : undefined, color: callbackDays === d ? "#185FA5" : undefined, fontWeight: callbackDays === d ? 600 : 400 }}
                    onClick={() => setCallbackDays(d)}>
                    {d === 1 ? "Завтра" : d === 7 ? "Через неделю" : d === 14 ? "Через 2 нед." : `Через ${d} дн.`}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <input style={{ ...C.inp, flex: 1, fontSize: 11, padding: "4px 8px" }} value={note} onChange={e => setNote(e.target.value)} placeholder="Причина перезвона" />
                <button style={{ ...C.btn(true), fontSize: 11, padding: "4px 10px" }} onClick={() => submit("callback", `Перезвон +${callbackDays}дн`)}>
                  ✓ Создать задачу
                </button>
                <button style={{ ...C.btn(), fontSize: 11, padding: "4px 8px" }} onClick={() => setPhase("outcome")}>← Назад</button>
              </div>
            </div>
          )}

          {/* Phase: rejection */}
          {phase === "reject" && (
            <div>
              <div style={{ fontSize: 11, color: "#A32D2D", marginBottom: 6, fontWeight: 500 }}>✗ Причина отказа:</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                {REJECTION_REASONS.map(r => (
                  <button key={r.id} style={{ ...C.btn(), fontSize: 11, padding: "4px 9px", borderColor: rejectReason === r.id ? "#A32D2D" : undefined, color: rejectReason === r.id ? "#A32D2D" : undefined, fontWeight: rejectReason === r.id ? 600 : 400 }}
                    onClick={() => setRejectReason(r.id)}>
                    {r.l}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                <button style={{ ...C.btn(), fontSize: 11, padding: "4px 10px", borderColor: rejectAction === "frozen" ? "#888780" : undefined, color: rejectAction === "frozen" ? "#888780" : undefined, fontWeight: rejectAction === "frozen" ? 600 : 400 }}
                  onClick={() => setRejectAction("frozen")}>
                  ❄ Заморозить (вернёмся)
                </button>
                <button style={{ ...C.btn(), fontSize: 11, padding: "4px 10px", borderColor: rejectAction === "lost" ? "#A32D2D" : undefined, color: rejectAction === "lost" ? "#A32D2D" : undefined, fontWeight: rejectAction === "lost" ? 600 : 400 }}
                  onClick={() => setRejectAction("lost")}>
                  ✗ Закрыть навсегда
                </button>
              </div>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <input style={{ ...C.inp, flex: 1, fontSize: 11, padding: "4px 8px" }} value={note} onChange={e => setNote(e.target.value)} placeholder="Комментарий" />
                <button style={{ ...C.btn(true), fontSize: 11, padding: "4px 10px" }} onClick={() => submit("rejected", `Отказ: ${REJECTION_REASONS.find(r => r.id === rejectReason)?.l || "без причины"}`)} disabled={!rejectReason}>
                  Подтвердить
                </button>
                <button style={{ ...C.btn(), fontSize: 11, padding: "4px 8px" }} onClick={() => setPhase("outcome")}>← Назад</button>
              </div>
            </div>
          )}

          {/* Phase: redirect */}
          {phase === "redirect" && (
            <div>
              <div style={{ fontSize: 11, color: "#0F6E56", marginBottom: 6, fontWeight: 500 }}>↪ Переадресация — ЛПР сменился / общая почта</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                <input style={{ ...C.inp, fontSize: 11, padding: "5px 8px" }} value={redirectEmail} onChange={e => setRedirectEmail(e.target.value)} placeholder="Email (logistics@company.ru)" />
                <input style={{ ...C.inp, fontSize: 11, padding: "5px 8px" }} value={redirectNote} onChange={e => setRedirectNote(e.target.value)} placeholder="Кто направил, имя нового ЛПР и т.д." />
              </div>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <button style={{ ...C.btn(true), fontSize: 11, padding: "4px 10px" }} onClick={() => submit("redirect", `Переадресация${redirectEmail ? ": " + redirectEmail : ""}${redirectNote ? " | " + redirectNote : ""}`)}>
                  ✓ Сохранить → задача email
                </button>
                <button style={{ ...C.btn(), fontSize: 11, padding: "4px 8px" }} onClick={() => setPhase("outcome")}>← Назад</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
