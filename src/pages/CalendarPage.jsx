// src/pages/CalendarPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import ModeBar from "../components/ModeBar";
import CalendarAgenda from "../components/CalendarAgenda";
import api from "../api/client";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function Pill({ children, tone = "slate" }) {
  const cls =
    tone === "cyan"
      ? "border-cyan-500/40 text-cyan-200 bg-cyan-500/10"
      : tone === "purple"
      ? "border-fuchsia-500/40 text-fuchsia-200 bg-fuchsia-500/10"
      : tone === "emerald"
      ? "border-emerald-500/40 text-emerald-200 bg-emerald-500/10"
      : "border-slate-800 text-slate-300 bg-slate-950/40";

  return <span className={cx("inline-flex items-center px-2 py-1 rounded-full border text-[11px]", cls)}>{children}</span>;
}

function CardShell({ title, subtitle, right, children }) {
  return (
    <div className="rounded-[28px] border border-slate-800 bg-slate-950/35 p-6 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-xs text-slate-400 tracking-widest">SCHEDULE</div>
          <div className="mt-1 text-2xl font-extrabold text-slate-100 truncate">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-slate-300">{subtitle}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>

      <div className="relative mt-5">{children}</div>
    </div>
  );
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function toDate(x) {
  if (!x) return null;
  const d = new Date(x);
  return Number.isFinite(d.getTime()) ? d : null;
}

function GoogleLink({ ticket }) {
  // lightweight link; CalendarAgenda already builds richer links; here we keep it small
  const title = `${ticket.id} • ${ticket.title || ticket.category_name || "Service"}`;
  const params = new URLSearchParams();
  params.set("action", "TEMPLATE");
  params.set("text", title);
  return (
    <a
      className="text-[11px] text-cyan-200 hover:text-cyan-100 underline underline-offset-4"
      href={`https://calendar.google.com/calendar/render?${params.toString()}`}
      target="_blank"
      rel="noreferrer"
      title="Add to Google Calendar"
      onClick={(e) => e.stopPropagation()}
    >
      + GCal
    </a>
  );
}

function CalendarGrid({ scopeLabel }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [tickets, setTickets] = useState([]);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const res = await api.get("/tickets/");
      const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
      setTickets(list);
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to load tickets");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    function onBizChanged() {
      load();
    }
    window.addEventListener("sw:activeBusinessChanged", onBizChanged);
    return () => window.removeEventListener("sw:activeBusinessChanged", onBizChanged);
  }, []);

  const weekStart = useMemo(() => {
    const today = startOfDay(new Date());
    // week starts Monday
    const day = today.getDay(); // Sun=0
    const mondayOffset = (day === 0 ? -6 : 1 - day);
    return addDays(today, mondayOffset);
  }, []);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const eventsByDay = useMemo(() => {
    const map = new Map();
    for (const d of days) map.set(d.toDateString(), []);

    for (const t of tickets) {
      const scheduled = toDate(t.scheduled_at) || toDate(t.accepted_at) || toDate(t.created_at);
      if (!scheduled) continue;

      for (const d of days) {
        if (sameDay(d, scheduled)) {
          map.get(d.toDateString()).push({
            id: t.id,
            title: `${t.id} • ${t.title || t.category_name || "Ticket"}`,
            time: scheduled.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
            ticket: t,
          });
          break;
        }
      }
    }

    // sort within each day
    for (const d of days) {
      const key = d.toDateString();
      map.get(key).sort((a, b) => (a.time > b.time ? 1 : -1));
    }

    return map;
  }, [tickets, days]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="font-semibold">Week Grid</div>
          <div className="text-xs text-slate-400 mt-1">Scope: {scopeLabel} (uses your current /tickets/ feed)</div>
        </div>
        <button
          onClick={load}
          className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900"
        >
          Refresh
        </button>
      </div>

      {err ? (
        <div className="mt-3 text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-xl p-3">{err}</div>
      ) : null}
      {loading ? <div className="mt-3 text-sm text-slate-400">Loading…</div> : null}

      <div className="mt-4 grid grid-cols-1 md:grid-cols-7 gap-2">
        {days.map((d) => {
          const key = d.toDateString();
          const items = eventsByDay.get(key) || [];
          return (
            <div key={key} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 min-h-[220px]">
              <div className="text-xs font-semibold text-slate-200">
                {d.toLocaleDateString(undefined, { weekday: "short" })}
              </div>
              <div className="text-[11px] text-slate-500">
                {d.toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}
              </div>

              <div className="mt-3 space-y-2">
                {items.length === 0 ? (
                  <div className="text-[11px] text-slate-600">—</div>
                ) : (
                  items.slice(0, 10).map((ev) => (
                    <a
                      key={ev.id}
                      href={`/tickets/${ev.id}`}
                      className="block rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 p-2"
                      title="Details"
                    >
                      <div className="text-[11px] text-slate-500">{ev.time}</div>
                      <div className="text-xs font-semibold text-slate-100 line-clamp-2">{ev.title}</div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">{ev.ticket?.service_zip ? `ZIP ${ev.ticket.service_zip}` : ""}</span>
                        <GoogleLink ticket={ev.ticket} />
                      </div>
                    </a>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const [view, setView] = useState("agenda"); // agenda | grid
  const [scope, setScope] = useState("mine"); // mine | business | all

  const headerRight = useMemo(() => {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 rounded-2xl border border-slate-800 bg-slate-950/50 p-1">
          <button
            type="button"
            onClick={() => setView("agenda")}
            className={cx(
              "px-3 py-2 rounded-xl text-[11px] font-semibold transition",
              view === "agenda"
                ? "bg-fuchsia-500/12 border border-fuchsia-500/40 text-fuchsia-200 shadow-[0_0_30px_rgba(217,70,239,0.18)]"
                : "border border-slate-800 bg-slate-950/40 text-slate-200 hover:bg-slate-900/60"
            )}
          >
            Agenda
          </button>
          <button
            type="button"
            onClick={() => setView("grid")}
            className={cx(
              "px-3 py-2 rounded-xl text-[11px] font-semibold transition",
              view === "grid"
                ? "bg-cyan-500/12 border border-cyan-500/40 text-cyan-200 shadow-[0_0_30px_rgba(34,211,238,0.18)]"
                : "border border-slate-800 bg-slate-950/40 text-slate-200 hover:bg-slate-900/60"
            )}
          >
            Grid
          </button>
        </div>

        <div className="flex items-center gap-1 rounded-2xl border border-slate-800 bg-slate-950/50 p-1">
          <button
            type="button"
            onClick={() => setScope("mine")}
            className={cx(
              "px-3 py-2 rounded-xl text-[11px] font-semibold transition",
              scope === "mine"
                ? "bg-fuchsia-500/12 border border-fuchsia-500/40 text-fuchsia-200"
                : "border border-slate-800 bg-slate-950/40 text-slate-200 hover:bg-slate-900/60"
            )}
          >
            Mine
          </button>
          <button
            type="button"
            onClick={() => setScope("business")}
            className={cx(
              "px-3 py-2 rounded-xl text-[11px] font-semibold transition",
              scope === "business"
                ? "bg-cyan-500/12 border border-cyan-500/40 text-cyan-200"
                : "border border-slate-800 bg-slate-950/40 text-slate-200 hover:bg-slate-900/60"
            )}
            title="UI-ready — still uses /tickets/ feed for now"
          >
            Business
          </button>
          <button
            type="button"
            onClick={() => setScope("all")}
            className={cx(
              "px-3 py-2 rounded-xl text-[11px] font-semibold transition",
              scope === "all"
                ? "bg-emerald-500/12 border border-emerald-500/40 text-emerald-200"
                : "border border-slate-800 bg-slate-950/40 text-slate-200 hover:bg-slate-900/60"
            )}
            title="UI-ready — still uses /tickets/ feed for now"
          >
            All
          </button>
        </div>

        <Pill tone="cyan">Tickets → Schedule</Pill>
      </div>
    );
  }, [scope, view]);

  const scopeLabel = scope === "mine" ? "mine" : scope === "business" ? "business" : "all";

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar title="Calendar" subtitle="Your schedule powered by tickets" />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <CardShell
          title="Calendar"
          subtitle="Agenda + Grid. Scoping UI is ready."
          right={headerRight}
        >
          {view === "agenda" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-xs text-slate-400">
                  Tip: tickets show up when they have <span className="text-slate-200 font-semibold">scheduled_at</span> (fallback:
                  accepted/created).
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone="purple">Agenda</Pill>
                  <Pill tone="slate">Scope: {scopeLabel}</Pill>
                </div>
              </div>

              <CalendarAgenda modeLabel="Agenda" />
            </div>
          ) : (
            <CalendarGrid scopeLabel={scopeLabel} />
          )}
        </CardShell>
      </main>
    </div>
  );
}
