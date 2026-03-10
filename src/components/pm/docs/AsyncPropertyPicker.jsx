// src/components/pm/docs/AsyncPropertyPicker.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../../api/client";

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function safeArr(data) {
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data)) return data;
  return [];
}

const RECENT_KEY = "syncworks.pm.recent_properties.v1";

function loadRecent() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecent(list) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 10)));
  } catch {}
}

function fmtRow(p) {
  const line1 = p?.address ? p.address : p?.name || `#${p?.id}`;
  const line2 = [p?.city, p?.state, p?.zip].filter(Boolean).join(" ");
  return { line1, line2 };
}

export default function AsyncPropertyPicker({
  value,
  onChange,
  disabled = false,
  placeholder = "Search address, name, city, zip…",
}) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState(() => loadRecent());

  const boxRef = useRef(null);
  const debounceRef = useRef(null);

  const selected = useMemo(() => {
    if (!value) return null;
    // try in recent first (better labels)
    const r = recent.find((x) => String(x.id) === String(value));
    if (r) return r;
    // else try in current results
    const m = items.find((x) => String(x.id) === String(value));
    return m || null;
  }, [value, recent, items]);

  useEffect(() => {
    function onDocClick(e) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  async function fetchProps(query) {
    setLoading(true);
    try {
      const r = await api.get("/pm/properties/", { params: { q: query, ordering: "address" } });
      setItems(safeArr(r.data));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    const query = q.trim();
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchProps(query);
    }, 250);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, open]);

  function choose(p) {
    onChange?.(String(p.id));
    setOpen(false);

    // write to recent
    const next = [p, ...recent.filter((x) => String(x.id) !== String(p.id))].slice(0, 10);
    setRecent(next);
    saveRecent(next);
  }

  function clear() {
    onChange?.("");
  }

  const sel = selected ? fmtRow(selected) : null;

  return (
    <div ref={boxRef} className="relative">
      <div
        className={cx(
          "rounded-xl border bg-slate-950/40 px-3 py-2",
          "border-slate-800 focus-within:border-fuchsia-500/40"
        )}
      >
        <div className="flex items-center gap-2">
          <input
            disabled={disabled}
            value={open ? q : (sel?.line1 ? `${sel.line1}${sel.line2 ? " — " + sel.line2 : ""}` : "")}
            onChange={(e) => {
              setQ(e.target.value);
              if (!open) setOpen(true);
            }}
            onFocus={() => {
              setOpen(true);
              setQ("");
            }}
            placeholder={placeholder}
            className="w-full bg-transparent outline-none text-slate-200 text-sm"
          />
          {value ? (
            <button
              type="button"
              onClick={clear}
              disabled={disabled}
              className="text-slate-400 hover:text-slate-200 text-xs"
              title="Clear"
            >
              ✖
            </button>
          ) : null}
        </div>
        {selected?.id ? (
          <div className="mt-1 text-[11px] text-slate-500">
            Selected: #{selected.id} • {selected.property_type || "—"} • {selected.status || "—"}
          </div>
        ) : (
          <div className="mt-1 text-[11px] text-slate-500">
            {recent.length ? "Tip: click a Recent chip below." : "Start typing to search."}
          </div>
        )}
      </div>

      {/* Recent chips */}
      {recent.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {recent.slice(0, 6).map((p) => {
            const row = fmtRow(p);
            return (
              <button
                key={p.id}
                type="button"
                disabled={disabled}
                onClick={() => choose(p)}
                className={cx(
                  "px-3 py-1.5 rounded-full border text-[11px]",
                  String(value) === String(p.id)
                    ? "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-200"
                    : "border-slate-800 bg-slate-950/40 text-slate-300 hover:bg-slate-900/40"
                )}
                title={`${row.line1}${row.line2 ? " — " + row.line2 : ""}`}
              >
                {row.line1}
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Dropdown results */}
      {open ? (
        <div className="absolute z-50 mt-2 w-full rounded-2xl border border-slate-800 bg-[#060a16] shadow-[0_20px_60px_rgba(0,0,0,0.45)] overflow-hidden">
          <div className="px-3 py-2 text-xs text-slate-400 border-b border-slate-800 flex items-center justify-between">
            <span>{loading ? "Searching…" : "Results"}</span>
            <button
              type="button"
              className="text-slate-400 hover:text-slate-200"
              onClick={() => setOpen(false)}
            >
              Esc
            </button>
          </div>

          <div className="max-h-[280px] overflow-auto">
            {(items || []).length === 0 ? (
              <div className="px-3 py-3 text-sm text-slate-300">
                {loading ? "Loading…" : "No matches. Try typing an address, zip, or name."}
              </div>
            ) : (
              items.map((p) => {
                const row = fmtRow(p);
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={cx(
                      "w-full text-left px-3 py-3 border-b border-slate-800/70",
                      "hover:bg-slate-900/40"
                    )}
                    onClick={() => choose(p)}
                  >
                    <div className="text-slate-100 text-sm font-semibold">{row.line1}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {row.line2 || "—"} • #{p.id} • {p.property_type || "—"} • {p.status || "—"}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
