import React, { useState, useMemo } from 'react';
import { Badge } from './ui.jsx';
import { C, STATUS, OUTCOMES, OBJECTION_TREE } from '../constants.js';
import { today, addDays, fmtFull } from '../utils.js';

const startOfWeek = () => {
  const d = new Date(); const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday=0 offset
  d.setDate(d.getDate() - diff);
  return d.toISOString().split("T")[0];
};
const startOfMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`; };
const startOfQuarter = () => { const d = new Date(); const qm = Math.floor(d.getMonth() / 3) * 3; return `${d.getFullYear()}-${String(qm+1).padStart(2,"0")}-01`; };

const PERIODS = [
  { id: "today",  l: "Сегодня",   fn: () => [today(), today()] },
  { id: "week",   l: "Неделя",    fn: () => [startOfWeek(), today()] },
  { id: "month",  l: "Месяц",     fn: () => [startOfMonth(), today()] },
  { id: "quarter",l: "Квартал",   fn: () => [startOfQuarter(), today()] },
  { id: "all",    l: "Всё время", fn: () => ["2020-01-01", today()] },
];

// KPI targets from playbook
const KPI_PLAN = {
  calls_day: 40,
  conversations_day: 15,
  kp_day: 5,
  followups_day: 10,
  new_warm_day: 2,
  calls_week: 200,
  kp_week: 25,
  new_clients_month: 10,
  target_ktk_month: 50,
};

function inRange(dateStr, from, to) {
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  return d >= from && d <= to;
}

function daysBetween(d1, d2) {
  if (!d1 || !d2) return null;
  const a = new Date(d1), b = new Date(d2);
  return Math.round((b - a) / 86400000);
}

export function AnalyticsTab({ leads, touches, activities, proposals }) {
  const [period, setPeriod] = useState("week");
  const [from, to] = PERIODS.find(p => p.id === period).fn();

  // ─── FUNNEL ───
  const funnel = useMemo(() => {
    const stages = ["new", "contact", "qualified", "proposal_sent", "negotiation", "won"];
    const counts = {};
    const ktk = {};
    stages.forEach(s => { counts[s] = 0; ktk[s] = 0; });
    counts.lost = 0; counts.frozen = 0;

    leads.forEach(l => {
      const s = l.status || "new";
      if (counts[s] !== undefined) {
        counts[s]++;
        ktk[s] += (l.volume_monthly || 0);
      }
    });

    // Conversion rates between stages
    const conversions = [];
    for (let i = 0; i < stages.length - 1; i++) {
      const from = stages[i];
      const toS = stages[i + 1];
      const sum = stages.slice(i + 1).reduce((s, k) => s + (counts[k] || 0), 0);
      const total = counts[from] + sum;
      conversions.push({
        from: STATUS[from]?.l,
        to: STATUS[toS]?.l,
        rate: total > 0 ? Math.round((sum / total) * 100) : 0,
      });
    }

    return { stages, counts, ktk, conversions, lost: counts.lost, frozen: counts.frozen };
  }, [leads]);

  // ─── ACTIVITY KPIs for period ───
  const kpi = useMemo(() => {
    const periodTouches = touches.filter(t => t.done && inRange(t.done, from, to));
    const periodActivities = activities.filter(a => inRange(a.at, from, to));
    const periodProposals = proposals.filter(p => inRange(p.created, from, to));

    const calls = periodTouches.filter(t => t.type === "call").length;
    const emails = periodTouches.filter(t => t.type === "email").length;
    const kpSent = proposals.filter(p => p.status === "sent" && p.sent && inRange(p.sent, from, to)).length;
    const kpDraft = periodProposals.filter(p => p.status === "draft").length;
    const conversations = periodTouches.filter(t => t.outcome && t.outcome !== "no_answer").length;
    const interested = periodTouches.filter(t => t.outcome === "interested").length;
    const objections = periodTouches.filter(t => t.outcome === "objection").length;
    const noAnswer = periodTouches.filter(t => t.outcome === "no_answer").length;
    const rejected = periodTouches.filter(t => t.outcome === "rejected").length;
    const notes = periodActivities.filter(a => a.type === "note").length;

    // New leads created in period
    const newLeads = leads.filter(l => l.created && inRange(l.created, from, to)).length;
    // Won in period
    const won = leads.filter(l => l.status === "won" && l.created && inRange(l.created, from, to)).length;
    const wonKtk = leads.filter(l => l.status === "won" && l.created && inRange(l.created, from, to)).reduce((s, l) => s + (l.volume_monthly || 0), 0);

    // Days in period for daily average
    const days = Math.max(1, daysBetween(from, to) + 1);
    const weeks = Math.max(1, days / 7);

    return {
      calls, emails, kpSent, kpDraft, conversations, interested,
      objections, noAnswer, rejected, notes, newLeads, won, wonKtk,
      days, weeks,
      callsPerDay: Math.round(calls / days * 10) / 10,
      kpPerDay: Math.round(kpSent / days * 10) / 10,
      convsPerDay: Math.round(conversations / days * 10) / 10,
    };
  }, [touches, activities, proposals, leads, from, to]);

  // ─── OBJECTION ANALYTICS ───
  const objStats = useMemo(() => {
    const periodTouches = touches.filter(t => t.done && inRange(t.done, from, to) && t.outcome === "objection");
    const objCounts = {};
    periodTouches.forEach(t => {
      // Extract objection from note
      const match = (t.note || "").match(/Возражение:\s*(.+?)(\s*\||$)/);
      const key = match ? match[1].trim() : "Другое";
      objCounts[key] = (objCounts[key] || 0) + 1;
    });

    // Also from lead data
    leads.forEach(l => {
      if (l.objections && !objCounts[l.objections]) {
        objCounts[l.objections] = (objCounts[l.objections] || 0);
      }
    });

    return Object.entries(objCounts)
      .map(([k, v]) => ({ name: k, count: v }))
      .sort((a, b) => b.count - a.count);
  }, [touches, leads, from, to]);

  // ─── OUTCOME DISTRIBUTION ───
  const outcomeDist = useMemo(() => {
    const periodTouches = touches.filter(t => t.done && inRange(t.done, from, to) && t.outcome);
    const total = periodTouches.length || 1;
    const dist = {};
    Object.keys(OUTCOMES).forEach(k => { dist[k] = 0; });
    periodTouches.forEach(t => { if (dist[t.outcome] !== undefined) dist[t.outcome]++; });
    return Object.entries(dist).map(([k, v]) => ({
      key: k, ...OUTCOMES[k], count: v, pct: Math.round(v / total * 100),
    }));
  }, [touches, from, to]);

  // ─── VELOCITY — avg days between stages ───
  const velocity = useMemo(() => {
    const wonLeads = leads.filter(l => l.status === "won" && l.created);
    if (wonLeads.length === 0) return null;

    // Average time from created to won
    const durations = wonLeads
      .map(l => {
        const lastWonActivity = activities
          .filter(a => a.lead_id === l.id && a.outcome === "interested")
          .sort((a, b) => new Date(b.at) - new Date(a.at))[0];
        const endDate = lastWonActivity?.at?.slice(0, 10) || today();
        return daysBetween(l.created, endDate);
      })
      .filter(d => d !== null && d >= 0);

    const avg = durations.length > 0 ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length) : null;

    // Touch count for won leads
    const touchCounts = wonLeads.map(l => touches.filter(t => t.lead_id === l.id && t.status === "done").length);
    const avgTouches = touchCounts.length > 0 ? Math.round(touchCounts.reduce((s, c) => s + c, 0) / touchCounts.length * 10) / 10 : null;

    return { avgDays: avg, avgTouches, sample: wonLeads.length };
  }, [leads, touches, activities]);

  // ─── WEEKLY BREAKDOWN ───
  const weeklyBreakdown = useMemo(() => {
    if (period === "today") return null;
    const weeks = [];
    let start = from;
    while (start <= to) {
      const end = addDays(start, 6) > to ? to : addDays(start, 6);
      const wTouches = touches.filter(t => t.done && inRange(t.done, start, end));
      const wKPSent = proposals.filter(p => p.status === "sent" && p.sent && inRange(p.sent, start, end));
      weeks.push({
        label: `${start.slice(5)} — ${end.slice(5)}`,
        calls: wTouches.filter(t => t.type === "call").length,
        emails: wTouches.filter(t => t.type === "email").length,
        kp: wKPSent.length,
        interested: wTouches.filter(t => t.outcome === "interested").length,
        objections: wTouches.filter(t => t.outcome === "objection").length,
        noAnswer: wTouches.filter(t => t.outcome === "no_answer").length,
      });
      start = addDays(end, 1);
    }
    return weeks.length > 1 ? weeks : null;
  }, [touches, proposals, from, to, period]);

  // ─── RENDER ───
  const periodLabel = PERIODS.find(p => p.id === period)?.l || "";

  return (
    <div>
      {/* Period selector */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
        {PERIODS.map(p => (
          <button key={p.id} style={{ ...C.btn(period === p.id), fontSize: 12, padding: "5px 12px" }}
            onClick={() => setPeriod(p.id)}>
            {p.l}
          </button>
        ))}
      </div>

      {/* ─── FUNNEL ─── */}
      <div style={C.section}>Воронка продаж</div>
      <div style={{ ...C.card, padding: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {funnel.stages.map((s, i) => {
            const cnt = funnel.stages.slice(i).reduce((sum, k) => sum + funnel.counts[k], 0);
            const maxCnt = funnel.stages.reduce((sum, k) => sum + funnel.counts[k], 0) || 1;
            const pct = Math.round(cnt / maxCnt * 100);
            const st = STATUS[s];
            return (
              <div key={s}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <div style={{ width: 80, fontSize: 11, fontWeight: 500, color: st?.c }}>{st?.l}</div>
                  <div style={{ flex: 1, height: 24, background: "var(--color-background-secondary)", borderRadius: 6, overflow: "hidden", position: "relative" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: st?.c + "22", borderRadius: 6, transition: "width 0.3s" }} />
                    <div style={{ position: "absolute", top: 0, left: 8, lineHeight: "24px", fontSize: 12, fontWeight: 500, color: st?.c }}>
                      {funnel.counts[s]}
                      {funnel.ktk[s] > 0 && <span style={{ fontWeight: 400, fontSize: 11 }}> ({funnel.ktk[s]} ктк)</span>}
                    </div>
                  </div>
                  {i < funnel.stages.length - 1 && funnel.conversions[i] && (
                    <div style={{ width: 45, textAlign: "right", fontSize: 11, color: "var(--color-text-tertiary)" }}>
                      {funnel.conversions[i].rate}%
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 10, fontSize: 11, color: "var(--color-text-secondary)" }}>
          <span>Проигран: <strong style={{ color: "#A32D2D" }}>{funnel.lost}</strong></span>
          <span>Заморожен: <strong style={{ color: "#888780" }}>{funnel.frozen}</strong></span>
        </div>
      </div>

      {/* ─── KPI vs PLAN ─── */}
      <div style={C.section}>KPI за {periodLabel.toLowerCase()}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
        {[
          ["Звонки", kpi.calls, period === "today" ? KPI_PLAN.calls_day : period === "week" ? KPI_PLAN.calls_week : null, "#0F6E56"],
          ["КП отпр.", kpi.kpSent, period === "today" ? KPI_PLAN.kp_day : period === "week" ? KPI_PLAN.kp_week : null, "#534AB7"],
          ["Разговоры", kpi.conversations, period === "today" ? KPI_PLAN.conversations_day : null, "#185FA5"],
          ["Заинтересов.", kpi.interested, null, "#3B6D11"],
          ["Возражения", kpi.objections, null, "#854F0B"],
          ["Нет ответа", kpi.noAnswer, null, "#888780"],
          ["Отказы", kpi.rejected, null, "#A32D2D"],
          ["Новые лиды", kpi.newLeads, null, "#185FA5"],
        ].map(([label, val, plan, color], i) => {
          const pctOfPlan = plan ? Math.round(val / plan * 100) : null;
          const good = pctOfPlan === null || pctOfPlan >= 80;
          return (
            <div key={i} style={{ ...C.metric, borderLeft: `3px solid ${color}`, borderRadius: 0, borderTopRightRadius: 10, borderBottomRightRadius: 10 }}>
              <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.3px" }}>{label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color }}>{val}</div>
              {plan && (
                <div style={{ fontSize: 11, marginTop: 2, color: good ? "#3B6D11" : "#A32D2D" }}>
                  {pctOfPlan}% от плана ({plan})
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Daily averages */}
      {period !== "today" && (
        <div style={{ ...C.card, display: "flex", gap: 20, padding: "10px 16px", marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12 }}>
            <span style={{ color: "var(--color-text-secondary)" }}>Звонков/день:</span>{" "}
            <strong style={{ color: kpi.callsPerDay >= KPI_PLAN.calls_day * 0.8 ? "#3B6D11" : "#A32D2D" }}>{kpi.callsPerDay}</strong>
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}> / {KPI_PLAN.calls_day}</span>
          </div>
          <div style={{ fontSize: 12 }}>
            <span style={{ color: "var(--color-text-secondary)" }}>КП/день:</span>{" "}
            <strong style={{ color: kpi.kpPerDay >= KPI_PLAN.kp_day * 0.6 ? "#3B6D11" : "#A32D2D" }}>{kpi.kpPerDay}</strong>
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}> / {KPI_PLAN.kp_day}</span>
          </div>
          <div style={{ fontSize: 12 }}>
            <span style={{ color: "var(--color-text-secondary)" }}>Разговоров/день:</span>{" "}
            <strong>{kpi.convsPerDay}</strong>
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}> / {KPI_PLAN.conversations_day}</span>
          </div>
        </div>
      )}

      {/* ─── OUTCOME DISTRIBUTION ─── */}
      <div style={C.section}>Результаты касаний</div>
      <div style={{ ...C.card, padding: 14 }}>
        <div style={{ display: "flex", gap: 3, height: 28, borderRadius: 6, overflow: "hidden", marginBottom: 10 }}>
          {outcomeDist.filter(o => o.count > 0).map(o => (
            <div key={o.key} style={{ flex: o.count, background: o.c + "33", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 500, color: o.c, minWidth: o.pct > 5 ? 30 : 0 }}>
              {o.pct > 8 ? `${o.pct}%` : ""}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {outcomeDist.map(o => (
            <div key={o.key} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: o.c, display: "inline-block" }} />
              <span style={{ color: "var(--color-text-secondary)" }}>{o.l}:</span>
              <strong style={{ color: o.c }}>{o.count}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* ─── OBJECTIONS ─── */}
      {objStats.length > 0 && (
        <>
          <div style={C.section}>Топ возражений</div>
          <div style={C.card}>
            {objStats.slice(0, 8).map((o, i) => {
              const maxCount = objStats[0]?.count || 1;
              const pct = Math.round(o.count / maxCount * 100);
              const tree = OBJECTION_TREE[o.name];
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: i < objStats.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none" }}>
                  <div style={{ width: 130, fontSize: 12, fontWeight: 500 }}>{o.name}</div>
                  <div style={{ flex: 1, height: 18, background: "var(--color-background-secondary)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: "#854F0B22", borderRadius: 4 }} />
                  </div>
                  <div style={{ width: 30, textAlign: "right", fontSize: 12, fontWeight: 600, color: "#854F0B" }}>{o.count}</div>
                  {tree && <Badge color={tree.category === "price" ? "#A32D2D" : tree.category === "competitor" ? "#D85A30" : "#854F0B"} bg="#FAEEDA" style={{ fontSize: 10 }}>{tree.category}</Badge>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ─── VELOCITY ─── */}
      {velocity && (
        <>
          <div style={C.section}>Скорость воронки</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <div style={C.metric}>
              <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginBottom: 3, textTransform: "uppercase" }}>Ср. дней до сделки</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#D85A30" }}>{velocity.avgDays ?? "—"}</div>
            </div>
            <div style={C.metric}>
              <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginBottom: 3, textTransform: "uppercase" }}>Ср. касаний до сделки</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#534AB7" }}>{velocity.avgTouches ?? "—"}</div>
            </div>
            <div style={C.metric}>
              <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginBottom: 3, textTransform: "uppercase" }}>Выборка</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{velocity.sample}</div>
            </div>
          </div>
        </>
      )}

      {/* ─── WEEKLY BREAKDOWN TABLE ─── */}
      {weeklyBreakdown && (
        <>
          <div style={C.section}>По неделям</div>
          <div style={{ overflowX: "auto" }}>
            <table style={C.tbl}>
              <thead>
                <tr>
                  <th style={C.th}>Неделя</th>
                  <th style={C.th}>Звонки</th>
                  <th style={C.th}>Email</th>
                  <th style={C.th}>КП</th>
                  <th style={C.th}>Заинтер.</th>
                  <th style={C.th}>Возраж.</th>
                  <th style={C.th}>Нет отв.</th>
                </tr>
              </thead>
              <tbody>
                {weeklyBreakdown.map((w, i) => (
                  <tr key={i}>
                    <td style={{ ...C.td, fontSize: 11, fontWeight: 500 }}>{w.label}</td>
                    <td style={C.td}><strong style={{ color: "#0F6E56" }}>{w.calls}</strong></td>
                    <td style={C.td}>{w.emails}</td>
                    <td style={C.td}><strong style={{ color: "#534AB7" }}>{w.kp}</strong></td>
                    <td style={C.td}><strong style={{ color: "#3B6D11" }}>{w.interested}</strong></td>
                    <td style={C.td}><span style={{ color: "#854F0B" }}>{w.objections}</span></td>
                    <td style={C.td}><span style={{ color: "#888780" }}>{w.noAnswer}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
