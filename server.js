// BML CRM Server — Express + SQLite + Nodemailer
// Deploy: Railway (or any Node host)
// ENV vars: API_KEY, SMTP_USER, SMTP_PASS, SMTP_HOST, SMTP_PORT, FROM_NAME, FROM_EMAIL

const express = require("express");
const Database = require("better-sqlite3");
const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

// ─── CONFIG ───
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || "bml2026dev";
const SMTP_HOST = process.env.SMTP_HOST || "smtp.yandex.ru";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "465");
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const FROM_NAME = process.env.FROM_NAME || "BM Logistics";
const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER;
// Optional: URL to company logo for email signature
const LOGO_URL = process.env.LOGO_URL || "";

// ─── AUTH MIDDLEWARE ───
function auth(req, res, next) {
  const key = req.headers["x-api-key"];
  if (key !== API_KEY) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// ─── SQLITE SETUP ───
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "crm.db"));
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS kv (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  )
`);

const stmtGet = db.prepare("SELECT value FROM kv WHERE key = ?");
const stmtSet = db.prepare("INSERT OR REPLACE INTO kv (key, value, updated_at) VALUES (?, ?, datetime('now'))");
const stmtDel = db.prepare("DELETE FROM kv WHERE key = ?");
const stmtList = db.prepare("SELECT key FROM kv WHERE key LIKE ?");

// ─── KV API ───

// GET /api/kv/:key
app.get("/api/kv/:key", auth, (req, res) => {
  try {
    const row = stmtGet.get(req.params.key);
    if (!row) return res.json({ key: req.params.key, value: null });
    res.json({ key: req.params.key, value: row.value });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/kv/:key — body: { value: "..." }
app.put("/api/kv/:key", auth, (req, res) => {
  try {
    const val = typeof req.body.value === "string" ? req.body.value : JSON.stringify(req.body.value);
    stmtSet.run(req.params.key, val);
    res.json({ ok: true, key: req.params.key });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/kv/:key
app.delete("/api/kv/:key", auth, (req, res) => {
  try {
    stmtDel.run(req.params.key);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/kv — list all keys (optional ?prefix=bml-v3-)
app.get("/api/kv", auth, (req, res) => {
  try {
    const prefix = req.query.prefix || "";
    const rows = stmtList.all(prefix + "%");
    res.json({ keys: rows.map(r => r.key) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/kv/bulk — get multiple keys at once
// body: { keys: ["bml-v3-leads", "bml-v3-settings", ...] }
app.post("/api/kv/bulk", auth, (req, res) => {
  try {
    const keys = req.body.keys || [];
    const result = {};
    for (const key of keys) {
      const row = stmtGet.get(key);
      result[key] = row ? row.value : null;
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── MAILER ───
let transporter = null;
function getTransporter() {
  if (!SMTP_USER || !SMTP_PASS) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

// POST /api/send — send email
// body: { to: "a@b.com" or ["a@b.com"], subject, body (plain text), html (optional) }
app.post("/api/send", auth, async (req, res) => {
  try {
    const t = getTransporter();
    if (!t) return res.status(500).json({ error: "SMTP not configured" });

    const { to, subject, body: textBody, html } = req.body;
    if (!to || !subject) return res.status(400).json({ error: "to and subject required" });

    const recipients = Array.isArray(to) ? to.join(", ") : to;

    // Build HTML email with signature if html not provided
    let htmlBody = html;
    if (!htmlBody && textBody) {
      htmlBody = buildEmailHtml(textBody);
    }

    const info = await t.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: recipients,
      subject,
      text: textBody || "",
      html: htmlBody || undefined,
    });

    res.json({ ok: true, messageId: info.messageId });
  } catch (e) {
    console.error("Send error:", e);
    res.status(500).json({ error: e.message });
  }
});

// Build nice HTML email from plain text KP
function buildEmailHtml(text) {
  // Convert line breaks, preserve formatting
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

  const logoHtml = LOGO_URL
    ? `<img src="${LOGO_URL}" alt="BM Logistics" style="height:50px;margin-bottom:12px;" /><br>`
    : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:640px;margin:20px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background:#1a2332;padding:20px 28px;">
      ${logoHtml}
      <div style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">BM Logistics</div>
      <div style="color:#8899aa;font-size:12px;margin-top:2px;">Коммерческое предложение</div>
    </div>
    <!-- Body -->
    <div style="padding:24px 28px;font-size:14px;line-height:1.7;color:#333333;">
      ${escaped}
    </div>
    <!-- Footer / Signature -->
    <div style="border-top:1px solid #e8e8e8;padding:16px 28px;font-size:12px;color:#888888;line-height:1.6;">
      <strong style="color:#333;">BM Logistics</strong> — TBM Pacific Group<br>
      Контейнерные перевозки Китай → Россия<br>
      <a href="https://bml-dv.com" style="color:#1a73e8;text-decoration:none;">bml-dv.com</a>
    </div>
  </div>
</body>
</html>`;
}

// ─── HEALTH CHECK ───
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    smtp: !!(SMTP_USER && SMTP_PASS),
    db: true,
    keys: stmtList.all("bml-%").length,
  });
});

// ─── SPA FALLBACK ───
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ─── START ───
app.listen(PORT, () => {
  console.log(`BML CRM running on port ${PORT}`);
  console.log(`SMTP: ${SMTP_USER ? "configured" : "NOT configured"}`);
  console.log(`DB: ${path.join(DATA_DIR, "crm.db")}`);
});
