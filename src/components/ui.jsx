import React, { useState, useEffect, useMemo, useRef } from 'react';

export const Badge = ({ color, bg, children, style: sx }) => (
  <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 500, color, background: bg || `${color}18`, whiteSpace: "nowrap", lineHeight: 1.5, ...sx }}>{children}</span>
);

export const Chip = ({ children, onRemove, color = "var(--color-text-primary)" }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 8px", borderRadius: 6, fontSize: 11, background: "var(--color-background-secondary)", color, border: "0.5px solid var(--color-border-tertiary)" }}>
    {children}
    {onRemove && <span style={{ cursor: "pointer", opacity: 0.5, fontSize: 13, lineHeight: 1 }} onClick={onRemove}>×</span>}
  </span>
);

export function Combobox({ value, onChange, options, placeholder, style: sx }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    const q = (filter || value || "").trim().toUpperCase();
    if (!q) return options.slice(0, 50);
    return options.filter(o => o.toUpperCase().includes(q)).slice(0, 50);
  }, [options, filter, value]);

  const handleInput = (e) => {
    const v = e.target.value;
    setFilter(v);
    onChange(v);
    if (!open) setOpen(true);
  };

  const pick = (v) => {
    onChange(v);
    setFilter("");
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: "relative", ...sx }}>
      <input
        ref={inputRef}
        style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", fontSize: 12, fontFamily: "inherit", background: "var(--color-background-primary)", color: "var(--color-text-primary)", outline: "none", boxSizing: "border-box" }}
        value={value}
        placeholder={placeholder}
        onChange={handleInput}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, maxHeight: 180, overflow: "auto", background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: 8, marginTop: 2, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
          {filtered.map(o => (
            <div key={o} style={{ padding: "6px 10px", fontSize: 12, cursor: "pointer", background: o === value ? "var(--color-background-secondary)" : "transparent" }}
              onMouseDown={(e) => { e.preventDefault(); pick(o); }}>
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
