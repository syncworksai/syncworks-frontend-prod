// src/components/pm/docs/PropertySearchSelect.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../../api/client";
import { cx, Input, Pill } from "./docsUi";

/**
 * Scalable property selector for large portfolios.
 *
 * - Typeahead search (debounced) using /pm/properties/?q=
 * - Keyboard nav (↑/↓/Enter/Esc)
 * - Recent selections stored in localStorage
 *
 * Props:
 *  - value: string (property id)
 *  - onChange: (id: string) => void
 *  - disabled: boolean
 *  - placeholder: string
 *  - labeler: (p) => string (optional)
 */
const RECENTS_KEY = "sw.pm.recent_properties.v1";
const MAX_RECENTS = 6;

function readRecents() {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeRecents(list) {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

function uniqById(items) {
  const seen = new Set();
  const out = [];
  for (const it of items || []) {
    const id = String(it?.id ?? "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(it);
  }
  return out;
}

export default function PropertySearchSelect({
  value,
  onChange,
  disabled = false,
  placeholder = "Search by name, address, city, zip…",
  labeler,
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [results, setResults] = useState([]);
  const [selectedObj, setSelectedObj] = useState(null);

  const [activeIndex, setActiveIndex] = useState(-1);

  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const lastReqRef = useRef(0);

  const recents = useMemo(() => readRecents(), []);
  const selectedLabel = useMemo(() => {
    if (!selectedObj) return "";
    const p = selectedObj;
    if (labeler) return labeler(p);
    const parts = [
      p.name,
      p.address,
      [p.city, p.state].filter(Boolean).join(", "),
      p.zip,
    ].filter(Boolean);
    return parts.join(" • ");
  }, [selectedObj, labeler]);

  function defaultLabel(p) {
    if (labeler) return labeler(p);
    const parts = [
      p.name || `#${p.id}`,
      p.address || "",
      [p.city, p.state].filter(Boolean).join(", "),
      p.zip || "",
    ].filter(Boolean);
    return parts.join(" • ");
  }

  async function fetchById(id) {
    try {
      const r = await api.get(`/pm/properties/${id}/`);
      setSelectedObj(r.data || null);
    } catch {
      setSelectedObj(null);
    }
  }

  async function searchProperties(term) {
    const reqId = Date.now();
    lastReqRef.current = reqId;

    setBusy(true);
    setErr("");

    try {
      const url = term ? `/pm/properties/?q=${encodeURIComponent(term)}` : `/pm/properties/?ordering=name`;
      const r = await api.get(url);
      const data = r.data;
      const list = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
      if (lastReqRef.current !== reqId) return; // ignore stale
      setResults(list);
      setActiveIndex(list.length ? 0 : -1);
    } catch (e) {
      if (lastReqRef.current !== reqId) return;
      setErr("Failed to search properties.");
      setResults([]);
      setActiveIndex(-1);
    } finally {
      if (lastReqRef.current === reqId) setBusy(false);
    }
  }

  // Keep selectedObj hydrated
  useEffect(() => {
    const id = value ? String(value) : "";
    if (!id) {
      setSelectedObj(null);
      return;
    }

    // If it exists in recents, use that instantly
    const hit = (readRecents() || []).find((x) => String(x.id) === id);
    if (hit) setSelectedObj(hit);
    else fetchById(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Debounce search when open + q changes
  useEffect(() => {
    if (!open) return;

    const t = setTimeout(() => {
      searchProperties(q.trim());
    }, 250);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, open]);

  // Close on click outside
  useEffect(() => {
    function onDocDown(e) {
      if (!open) return;
      if (!rootRef.current) return;
      if (rootRef.current.contains(e.target)) return;
      setOpen(false);
      setActiveIndex(-1);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [open]);

  function commitSelect(p) {
    const id = String(p?.id ?? "");
    if (!id) return;

    onChange?.(id);
    setSelectedObj(p);

    // Update recents (store minimal fields)
    const current = readRecents();
    const minimal = {
      id: p.id,
      name: p.name || "",
      address: p.address || "",
      city: p.city || "",
      state: p.state || "",
      zip: p.zip || "",
      property_type: p.property_type || "",
      status: p.status || "",
    };

    const next = uniqById([minimal, ...current]).slice(0, MAX_RECENTS);
    writeRecents(next);

    setOpen(false);
    setQ("");
    setResults([]);
    setActiveIndex(-1);
    inputRef.current?.blur?.();
  }

  function onKeyDown(e) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => {
        const next = i + 1;
        return next >= results.length ? (results.length ? 0 : -1) : next;
      });
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => {
        const next = i - 1;
        return next < 0 ? (results.length ? results.length - 1 : -1) : next;
      });
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && results[activeIndex]) {
        commitSelect(results[activeIndex]);
      }
    }
  }

  return (
    <div ref={rootRef} className="relative">
      {/* Selected display */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
          setTimeout(() => inputRef.current?.focus?.(), 0);
        }}
        className={cx(
          "w-full rounded-xl border px-3 py-2 text-left text-sm",
          disabled
            ? "border-slate-800 bg-slate-950/20 text-slate-500"
            : "border-slate-800 bg-slate-950/40 text-slate-200 hover:bg-slate-900/40"
        )}
        title="Select property"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            {value ? (
              <>
                <div className="font-semibold text-slate-100 truncate">
                  {selectedObj?.name || `Property #${value}`}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {selectedLabel || "—"}
                </div>
              </>
            ) : (
              <div className="text-slate-400">Select a property…</div>
            )}
          </div>
          <div className="shrink-0">
            <Pill tone="slate">{open ? "▲" : "▼"}</Pill>
          </div>
        </div>
      </button>

      {/* Dropdown */}
      {open ? (
        <div className="absolute z-50 mt-2 w-full rounded-2xl border border-slate-800 bg-[#020617] shadow-xl overflow-hidden">
          <div className="p-3 border-b border-slate-800">
            <Input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              autoFocus
            />
            <div className="mt-2 flex items-center justify-between">
              <div className="text-[11px] text-slate-500">
                {busy ? "Searching…" : err ? err : "Type to search • Enter to select"}
              </div>
              <button
                type="button"
                className="text-[11px] text-slate-400 hover:text-slate-200"
                onClick={() => {
                  setOpen(false);
                  setQ("");
                  setResults([]);
                  setActiveIndex(-1);
                }}
              >
                Close
              </button>
            </div>

            {/* Recent chips */}
            {recents.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {recents.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-900/40"
                    onClick={() => commitSelect(p)}
                    title={defaultLabel(p)}
                  >
                    {p.name ? p.name : `#${p.id}`}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="max-h-[320px] overflow-auto">
            {(results || []).length === 0 ? (
              <div className="p-4 text-sm text-slate-400">
                {q.trim() ? "No matches." : "Start typing to search."}
              </div>
            ) : (
              <ul className="divide-y divide-slate-800">
                {results.map((p, idx) => {
                  const active = idx === activeIndex;
                  const line1 = p.name || `#${p.id}`;
                  const line2 = [p.address, [p.city, p.state].filter(Boolean).join(", "), p.zip]
                    .filter(Boolean)
                    .join(" • ");

                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        className={cx(
                          "w-full px-4 py-3 text-left",
                          active ? "bg-fuchsia-500/10" : "bg-transparent hover:bg-slate-950/40"
                        )}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => commitSelect(p)}
                        title={defaultLabel(p)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-100 truncate">{line1}</div>
                            <div className="text-[11px] text-slate-500 truncate">{line2 || "—"}</div>
                          </div>
                          <div className="shrink-0 flex items-center gap-2">
                            {p.property_type ? <Pill tone="cyan">{String(p.property_type).toUpperCase()}</Pill> : null}
                            {p.status ? <Pill tone="emerald">{String(p.status).toUpperCase()}</Pill> : null}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Clear selection */}
          {value ? (
            <div className="p-3 border-t border-slate-800 flex items-center justify-between">
              <div className="text-[11px] text-slate-500">Selected: {selectedObj?.name || `#${value}`}</div>
              <button
                type="button"
                className="text-[11px] text-rose-200 hover:text-rose-100"
                onClick={() => {
                  onChange?.("");
                  setSelectedObj(null);
                  setOpen(false);
                  setQ("");
                  setResults([]);
                  setActiveIndex(-1);
                }}
              >
                Clear
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
