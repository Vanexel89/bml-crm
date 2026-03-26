// BML CRM Server — Express + SQLite + Resend/SMTP Mailer
const express = require("express");
const Database = require("better-sqlite3");
const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || "bml2026dev";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const FROM_NAME = process.env.FROM_NAME || "Dorofeev Vitaliy / BML DV";
const FROM_EMAIL = process.env.FROM_EMAIL || "";
const LOGO_URL = process.env.LOGO_URL || "";

function auth(req, res, next) {
  const key = req.headers["x-api-key"];
  if (key !== API_KEY) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// ─── SQLITE ───
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(path.join(DATA_DIR, "crm.db"));
db.pragma("journal_mode = WAL");
db.exec("CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT DEFAULT (datetime('now')))");
const stmtGet = db.prepare("SELECT value FROM kv WHERE key = ?");
const stmtSet = db.prepare("INSERT OR REPLACE INTO kv (key, value, updated_at) VALUES (?, ?, datetime('now'))");
const stmtDel = db.prepare("DELETE FROM kv WHERE key = ?");
const stmtList = db.prepare("SELECT key FROM kv WHERE key LIKE ?");

// ─── KV API ───
app.get("/api/kv/:key", auth, (req, res) => {
  try { const row = stmtGet.get(req.params.key); res.json({ key: req.params.key, value: row ? row.value : null }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.put("/api/kv/:key", auth, (req, res) => {
  try { const val = typeof req.body.value === "string" ? req.body.value : JSON.stringify(req.body.value); stmtSet.run(req.params.key, val); res.json({ ok: true, key: req.params.key }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete("/api/kv/:key", auth, (req, res) => {
  try { stmtDel.run(req.params.key); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.get("/api/kv", auth, (req, res) => {
  try { const rows = stmtList.all((req.query.prefix || "") + "%"); res.json({ keys: rows.map(r => r.key) }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.post("/api/kv/bulk", auth, (req, res) => {
  try { const result = {}; for (const key of (req.body.keys || [])) { const row = stmtGet.get(key); result[key] = row ? row.value : null; } res.json(result); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── MAILER ───
async function sendViaResend({ to, subject, text, html }) {
  const recipients = Array.isArray(to) ? to : [to];
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": "Bearer " + RESEND_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_NAME + " <" + FROM_EMAIL + ">", to: recipients, subject, text: text || undefined, html: html || undefined }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.message || data.error || JSON.stringify(data));
  return { messageId: data.id, method: "resend" };
}

let transporter = null;
function getTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST, port: SMTP_PORT, secure: SMTP_PORT === 465,
      ...(SMTP_PORT !== 465 ? { requireTLS: true } : {}),
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    });
  }
  return transporter;
}
async function sendViaSMTP({ to, subject, text, html }) {
  const t = getTransporter();
  if (!t) throw new Error("SMTP not configured");
  const info = await t.sendMail({ from: '"' + FROM_NAME + '" <' + FROM_EMAIL + '>', to: Array.isArray(to) ? to.join(", ") : to, subject, text: text || "", html: html || undefined });
  return { messageId: info.messageId, method: "smtp" };
}

app.post("/api/send", auth, async (req, res) => {
  try {
    const { to, subject, body: textBody, html } = req.body;
    if (!to || !subject) return res.status(400).json({ error: "to and subject required" });
    const htmlBody = html || (textBody ? buildEmailHtml(textBody) : undefined);
    const payload = { to, subject, text: textBody, html: htmlBody };
    console.log("Sending to:", Array.isArray(to) ? to.join(", ") : to);
    let result;
    if (RESEND_API_KEY) result = await sendViaResend(payload);
    else if (SMTP_HOST && SMTP_USER) result = await sendViaSMTP(payload);
    else return res.status(500).json({ error: "No email provider. Set RESEND_API_KEY or SMTP vars." });
    console.log("Sent via " + result.method + ": " + result.messageId);
    res.json({ ok: true, messageId: result.messageId, method: result.method });
  } catch (e) { console.error("Send error:", e.message); res.status(500).json({ error: e.message }); }
});

function buildEmailHtml(text) {
  const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
  const logo = LOGO_URL ? '<img src="' + LOGO_URL + '" alt="BM Logistics" style="height:50px;margin-bottom:12px;"/><br>' : "";
  return '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">' +
    '<div style="max-width:640px;margin:20px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.1);">' +
    '<div style="background:#1a2332;padding:20px 28px;">' + logo + '<div style="color:#fff;font-size:18px;font-weight:700;">BML Transport & Consulting</div><div style="color:#8899aa;font-size:12px;margin-top:2px;">Dorofeev Vitaliy | Deputy Director</div></div>' +
    '<div style="padding:24px 28px;font-size:14px;line-height:1.7;color:#333;">' + esc + '</div>' +
    '<div style="border-top:1px solid #e8e8e8;padding:16px 28px;font-size:12px;color:#888;line-height:1.6;"><strong style="color:#333;">BM Logistics</strong> — TBM Pacific Group<br>Контейнерные перевозки Китай → Россия<br><a href="https://bml-dv.com" style="color:#1a73e8;text-decoration:none;">bml-dv.com</a></div>' +
    '</div></body></html>';
}

// ─── HEALTH ───
app.get("/api/health", auth, async (req, res) => {
  let mailOk = false, mailMethod = "none", mailError = "";
  if (RESEND_API_KEY) {
    mailMethod = "resend";
    try {
      const r = await fetch("https://api.resend.com/domains", { headers: { "Authorization": "Bearer " + RESEND_API_KEY } });
      if (r.ok) mailOk = true; else { const d = await r.json(); mailError = d.message || "Bad API key"; }
    } catch (e) { mailError = e.message; }
  } else if (SMTP_HOST && SMTP_USER) {
    mailMethod = "smtp";
    const t = getTransporter();
    if (t) { try { await t.verify(); mailOk = true; } catch (e) { mailError = e.message; } }
  } else { mailError = "No RESEND_API_KEY or SMTP configured"; }
  res.json({ ok: true, smtp: mailOk, smtpError: mailError || undefined, smtpUser: mailMethod === "resend" ? "Resend (" + FROM_EMAIL + ")" : SMTP_USER || "not set", mailMethod, db: true, keys: stmtList.all("bml-%").length });
});

app.get("*", (req, res) => { res.sendFile(path.join(__dirname, "public", "index.html")); });
app.listen(PORT, () => { console.log("BML CRM on port " + PORT + " | Mail: " + (RESEND_API_KEY ? "Resend" : SMTP_HOST ? "SMTP" : "NONE")); });
