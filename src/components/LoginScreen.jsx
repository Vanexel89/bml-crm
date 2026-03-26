import React, { useState, useEffect } from 'react';
import { getApiKey, setApiKey } from '../api.js';

export function LoginScreen({ onLogin }) {
  const [key, setKey] = useState(getApiKey());
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const tryLogin = async () => {
    if (!key.trim()) return;
    setLoading(true);
    setErr("");
    setApiKey(key.trim());
    try {
      const res = await fetch("/api/health", {
        headers: { "X-API-Key": key.trim() }
      });
      if (res.status === 401) { setErr("Неверный ключ"); setLoading(false); return; }
      const data = await res.json();
      if (data.ok) onLogin();
      else setErr("Сервер не отвечает");
    } catch (e) { setErr("Ошибка подключения: " + e.message); }
    setLoading(false);
  };

  useEffect(() => {
    if (key) tryLogin();
  }, []);

  return (
    <div className="login-screen">
      <h1>BML Sales Panel</h1>
      <p style={{ color: "#666", fontSize: 13 }}>Введите API ключ для доступа</p>
      <input
        type="password"
        placeholder="API ключ..."
        value={key}
        onChange={e => setKey(e.target.value)}
        onKeyDown={e => e.key === "Enter" && tryLogin()}
      />
      <button onClick={tryLogin} disabled={loading}>
        {loading ? "Проверка..." : "Войти"}
      </button>
      {err && <div className="error">{err}</div>}
    </div>
  );
}
