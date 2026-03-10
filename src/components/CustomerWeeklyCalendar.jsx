// src/components/CustomerWeeklyCalendar.jsx
import React, { useMemo, useState } from "react";

function startOfWeek(d) {
  const x = new Date(d);
  const day = x.getDay(); // 0 Sun ... 6 Sat
  const diff = (day === 0 ? -6 : 1 - day); // Monday start
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function fmtDayLabel(d) {
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

function fmtDateLabel(d) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Try multiple potential schedule fields (because your backend may evolve)
function getTicketStart(t) {
  const candidates = [
    t?.scheduled_start,
    t?.scheduled_for,
    t?.start_time,
    t?.preferred_start,
    t?.preferred_time,
    t?.appointment_start,
  ].filter(Boolean);

  const raw = candidates[0];
  if (!raw) return null;
  const dt = new Date(raw);
  return Number.isFinite(dt.getTime()) ? dt : null;
}

function getTicketEnd(t, start) {
  const raw =
    t?.scheduled_end ||
    t?.end_time ||
    t?.appointment_end ||
    null;

  if (raw) {
    const dt = new Date(raw);
    return Number.isFinite(dt.getTime()) ? dt : null;
  }
  // default duration 60 min
  if (start) {
    const dt = new Date(start);
    dt.setMinutes(dt.getMinutes() + 60);
    return dt;
  }
  return null;
}

function statusTone(status) {
  const s = String(status || "").toUpperCase();
  if (s === "COMPLETED" || s === "PAID") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  if (s === "CANCELLED") return "border-rose-500/30 bg-rose-500/10 text-rose-200";
  if (s === "IN_PROGRESS" || s === "ON_SITE") return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  return "border-cyan-500/30 bg-cyan-500/10 text-cyan-200";
}

export default function CustomerWeeklyCalendar({
  tickets = [],
  onOpenTicket,
  showHeader = false,
}) {
  const [anchor, setAnchor] = useState(() => new Date());

  const weekStart = useMemo(() => startOfWeek(anchor), [anchor]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const scheduled = useMemo(() => {
    const arr = (tickets || []).map((t) => {
      const start = getTicketStart(t);
      if (!start) return null;
      const end = getTicketEnd(t, start);
      return { t, start, end };
    }).filter(Boolean);

    // sort by start time
    arr.sort((a, b) => a.start - b.start);
    return arr;
  }, [tickets]);

  const byDay = useMemo(() => {
    const map = new Map();
    days.forEach((d) => map.set(d.toDateString(), []));
    scheduled.forEach((x) => {
      const key = days.find((d) => sameDay(d, x.start))?.toDateString();
      if (key) map.get(key).push(x);
    });
    return map;
  }, [days, scheduled]);

  return (
    <div className="w-full">
      {showHeader ? (
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="text-sm font-semibold">
            Week of {fmtDateLabel(weekStart)}
          </div>
          <div className="flex gap-2">
            <button
              className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900"
              onClick={() => setAnchor(addDays(anchor, -7))}
            >
              ← Prev
            </button>
            <button
              className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900"
              onClick={() => setAnchor(new Date())}
            >
              Today
            </button>
            <button
              className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900"
              onClick={() => setAnchor(addDays(anchor, 7))}
            >
              Next →
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
        {days.map((d) => {
          const items = byDay.get(d.toDateString()) || [];
          const isToday = sameDay(d, new Date());

          return (
            <div
              key={d.toISOString()}
              className={
                "rounded-2xl border p-3 min-h-[140px] " +
                (isToday
                  ? "border-cyan-500/40 bg-cyan-500/5"
                  : "border-slate-800 bg-slate-950/40")
              }
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold">
                  {fmtDayLabel(d)}
                </div>
                <div className="text-[11px] text-slate-400">
                  {fmtDateLabel(d)}
                </div>
              </div>

              {items.length === 0 ? (
                <div className="text-[11px] text-slate-500">No scheduled tickets</div>
              ) : (
                <div className="space-y-2">
                  {items.map(({ t, start, end }) => (
                    <button
                      key={t.id}
                      onClick={() => onOpenTicket?.(t.id)}
                      className={
                        "w-full text-left rounded-xl border px-3 py-2 transition hover:bg-slate-900/50 " +
                        statusTone(t.status)
                      }
                      title="Open ticket"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-xs font-semibold truncate">
                          #{t.id} • {t.category_name || "Ticket"}
                        </div>
                        <div className="text-[10px] text-slate-300 whitespace-nowrap">
                          {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {end ? `–${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-300/80 mt-1 truncate">
                        {t.service_address || (t.service_zip ? `ZIP ${t.service_zip}` : "—")}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 text-[11px] text-slate-500">
        Shows scheduled tickets only. If a ticket has no schedule time yet, it stays off the calendar until scheduled.
      </div>
    </div>
  );
}
