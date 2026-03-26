export function getApiKey() { return localStorage.getItem("bml-api-key") || ""; }
export function setApiKey(k) { localStorage.setItem("bml-api-key", k); }

export async function apiCall(method, path, body) {
  const key = getApiKey();
  const opts = {
    method,
    headers: { "Content-Type": "application/json", "X-API-Key": key },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  if (res.status === 401) throw new Error("AUTH");
  return res.json();
}

export async function load(key, fb = []) {
  try {
    const r = await apiCall("GET", "/api/kv/" + encodeURIComponent(key));
    return r.value ? JSON.parse(r.value) : fb;
  } catch (e) {
    if (e.message === "AUTH") throw e;
    return fb;
  }
}

export async function save(key, data) {
  try {
    await apiCall("PUT", "/api/kv/" + encodeURIComponent(key), { value: JSON.stringify(data) });
  } catch (e) { console.error("Save error:", e); }
}
