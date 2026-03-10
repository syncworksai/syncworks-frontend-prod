// src/components/TodoList.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function uid() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

function ymd(d) {
  const x = new Date(d);
  if (!Number.isFinite(x.getTime())) return "";
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const PRIORITIES = [
  { key: "HIGH", label: "High", tone: "border-rose-500/35 bg-rose-500/10 text-rose-200" },
  { key: "MED", label: "Medium", tone: "border-amber-500/35 bg-amber-500/10 text-amber-200" },
  { key: "LOW", label: "Low", tone: "border-slate-700 bg-slate-950/40 text-slate-200" },
];

function priorityTone(p) {
  return PRIORITIES.find((x) => x.key === p)?.tone || PRIORITIES[2].tone;
}

function isOverdue(dueDateYmd) {
  if (!dueDateYmd) return false;
  const today = ymd(new Date());
  return dueDateYmd < today;
}

export default function TodoList({
  scope = "sbo",
  title = "Sticky Notes",
  subtitle = "Fast planner. Check it off and it disappears.",
  maxVisible = 10,
}) {
  const { activeBusinessId } = useAuth();

  const storageKey = useMemo(() => {
    const biz = activeBusinessId || "no_biz";
    return `sw_stickynotes_${scope}_${biz}`;
  }, [scope, activeBusinessId]);

  const [items, setItems] = useState([]);
  const [text, setText] = useState("");
  const [priority, setPriority] = useState("MED");
  const [due, setDue] = useState(ymd(new Date()));

  // Load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setItems(Array.isArray(parsed) ? parsed : []);
    } catch {
      setItems([]);
    }
  }, [storageKey]);

  // Persist
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items, storageKey]);

  function addItem() {
    const clean = (text || "").trim();
    if (!clean) return;

    const next = {
      id: uid(),
      text: clean,
      priority,
      due_date: due || "",
      created_at: new Date().toISOString(),
    };

    setItems((prev) => [next, ...prev]);
    setText("");
    setPriority("MED");
    setDue(ymd(new Date()));
  }

  function complete(id) {
    // ✅ “checkbox completes” => remove
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  function remove(id) {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  const sorted = useMemo(() => {
    const weight = { HIGH: 0, MED: 1, LOW: 2 };
    const list = [...items];

    // Sort: overdue first, then priority, then due date, then newest
    list.sort((a, b) => {
      const ao = isOverdue(a.due_date) ? 0 : 1;
      const bo = isOverdue(b.due_date) ? 0 : 1;
      if (ao !== bo) return ao - bo;

      const ap = weight[a.priority] ?? 9;
      const bp = weight[b.priority] ?? 9;
      if (ap !== bp) return ap - bp;

      const ad = a.due_date || "9999-99-99";
      const bd = b.due_date || "9999-99-99";
      if (ad !== bd) return ad.localeCompare(bd);

      const at = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bt - at;
    });

    return list;
  }, [items]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-slate-100">{title}</div>
          {subtitle ? <div className="text-xs text-slate-400 mt-1">{subtitle}</div> : null}
        </div>

        <div className="text-[11px] text-slate-400">
          {items.length} item{items.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* Add row */}
      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
        <div className="grid grid-cols-1 gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a quick note…"
            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm outline-none focus:border-cyan-500/50"
            onKeyDown={(e) => {
              if (e.key === "Enter") addItem();
            }}
          />

          <div className="grid grid-cols-3 gap-2">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
            >
              {PRIORITIES.map((p) => (
                <option key={p.key} value={p.key}>
                  Priority: {p.label}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
            />

            <button
              onClick={addItem}
              className="rounded-xl px-3 py-2 text-sm font-semibold bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30"
            >
              + Add
            </button>
          </div>

          <div className="text-[11px] text-slate-500">
            Tip: check it off and it disappears. Stored per-business automatically.
          </div>
        </div>
      </div>

      {/* List */}
      <div className="mt-3 space-y-2">
        {sorted.slice(0, maxVisible).map((it) => {
          const overdue = isOverdue(it.due_date);
          return (
            <div
              key={it.id}
              className={cx(
                "rounded-2xl border bg-slate-950/55 p-3 flex items-start gap-3",
                overdue ? "border-rose-500/35" : "border-slate-800"
              )}
            >
              {/* Checkbox */}
              <button
                onClick={() => complete(it.id)}
                title="Complete"
                className={cx(
                  "mt-0.5 h-6 w-6 rounded-lg border flex items-center justify-center text-xs",
                  overdue
                    ? "border-rose-500/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15"
                    : "border-slate-700 bg-slate-950/60 text-slate-300 hover:bg-slate-900/60"
                )}
              >
                ✓
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="text-sm font-semibold text-slate-100 truncate">{it.text}</div>

                  <span className={cx("text-[10px] px-2 py-1 rounded-full border", priorityTone(it.priority))}>
                    {PRIORITIES.find((p) => p.key === it.priority)?.label || "Low"}
                  </span>

                  {it.due_date ? (
                    <span
                      className={cx(
                        "text-[10px] px-2 py-1 rounded-full border",
                        overdue
                          ? "border-rose-500/35 bg-rose-500/10 text-rose-200"
                          : "border-slate-800 bg-slate-950/40 text-slate-300"
                      )}
                    >
                      Due {it.due_date}
                    </span>
                  ) : null}
                </div>

                {overdue ? (
                  <div className="text-[11px] text-rose-200/80 mt-1">Overdue</div>
                ) : null}
              </div>

              {/* Delete */}
              <button
                onClick={() => remove(it.id)}
                title="Delete"
                className="h-9 w-9 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-900/50 text-slate-300 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          );
        })}

        {sorted.length === 0 ? (
          <div className="text-sm text-slate-400 mt-3">No notes yet. Add 3–5 bullets and run your day.</div>
        ) : null}

        {sorted.length > maxVisible ? (
          <div className="text-[11px] text-slate-500">Showing {maxVisible} of {sorted.length}…</div>
        ) : null}
      </div>
    </div>
  );
}
