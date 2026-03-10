// src/components/CalendarAgenda.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../api/client";

function safeResults(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  return [];
}

function toDate(x) {
  if (!x) return null;
  const d = new Date(x);
  return Number.isFinite(d.getTime()) ? d : null;
}

function buildGoogleCalendarLink({ title, details, location, start, end }) {
  function fmt(d) {
    const pad = (n) => String(n).padStart(2, "0");
    const yyyy = d.getUTCFullYear();
    const mm = pad(d.getUTCMonth() + 1);
    const dd = pad(d.getUTCDate());
    const hh = pad(d.getUTCHours());
    const mi = pad(d.getUTCMinutes());
    const ss = pad(d.getUTCSeconds());
    return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
  }

  const s = start ? fmt(start) : null;
  const e = end ? fmt(end) : s;

  const params = new URLSearchParams();
  params.set("action", "TEMPLATE");
  params.set("text", title || "SyncWorks Appointment");
  if (details) params.set("details", details);
  if (location) params.set("location", location);
  if (s && e) params.set("dates", `${s}/${e}`);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export default function CalendarAgenda({ modeLabel = "Schedule" }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [tickets, setTickets] = useState([]);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const res = await api.get("/tickets/");
      setTickets(safeResults(res.data));
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to load tickets");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(() => {
    return (tickets || [])
      .map((t) => {
        const scheduled = toDate(t.scheduled_at);
        const accepted = toDate(t.accepted_at);
        const created = toDate(t.created_at);

        const start = scheduled || accepted || created;
        if (!start) return null;

        const end = new Date(start.getTime() + 60 * 60 * 1000);

        const title = `${t.id} • ${t.title || t.category_name || "Service"}`;
        const location = [t.service_address, t.service_zip ? `ZIP ${t.service_zip}` : ""].filter(Boolean).join(" • ");

        const details =
          `Status: ${t.status || "—"}\n` +
          `Marketplace: ${t.is_marketplace ? "Yes" : "No"}\n` +
          (t.category_path ? `Category: ${t.category_path}\n` : "");

        return {
          id: t.id,
          status: t.status,
          start,
          end,
          title,
          location,
          calendarUrl: buildGoogleCalendarLink({ title, details, location, start, end }),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [tickets]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{modeLabel}</div>
          <div className="text-xs text-slate-400 mt-1">Upcoming ticket activity.</div>
        </div>
        <button
          onClick={load}
          className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900"
        >
          Refresh
        </button>
      </div>

      {err ? (
        <div className="mt-3 text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-xl p-3">
          {err}
        </div>
      ) : null}

      {loading ? <div className="mt-3 text-sm text-slate-400">Loading…</div> : null}

      {!loading && rows.length === 0 ? (
        <div className="mt-4 text-sm text-slate-400">
          No scheduled items yet. When tickets get a scheduled time, they’ll appear here.
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        {rows.map((r) => (
          <div
            key={r.id}
            className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{r.title}</div>
              <div className="text-xs text-slate-400 mt-1">
                {r.start.toLocaleString()} • {r.status || "—"}
              </div>
              {r.location ? <div className="text-[11px] text-slate-500 mt-1">{r.location}</div> : null}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <a
                href={r.calendarUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-cyan-200 hover:text-cyan-100 underline underline-offset-4"
                title="Add to Google Calendar"
              >
                + Google Calendar
              </a>

              <a
                href={`/tickets/${r.id}`}
                className="text-[11px] text-slate-200 hover:text-white underline underline-offset-4"
              >
                Details
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
