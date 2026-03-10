// src/components/SalesOsMiniCalendar.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../api/client";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function fmtLocal(dt) {
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return String(dt || "");
  }
}

function isSameDay(a, b) {
  try {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  } catch {
    return false;
  }
}

function EventRow({ ev }) {
  const start = useMemo(() => new Date(ev.start_at), [ev.start_at]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-slate-100 truncate">{ev.title || "Event"}</div>
          <div className="text-xs text-slate-400 mt-1">
            {fmtLocal(ev.start_at)} → {fmtLocal(ev.end_at)}
          </div>
          {ev.location ? <div className="text-xs text-slate-400 mt-1">📍 {ev.location}</div> : null}
          {ev.assigned_member_display?.name ? (
            <div className="text-xs text-slate-400 mt-1">👤 {ev.assigned_member_display.name}</div>
          ) : null}
        </div>

        <div
          className={cx(
            "shrink-0 text-[10px] rounded-full px-2 py-1 border",
            isSameDay(start, new Date())
              ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-200"
              : "bg-slate-950/60 border-slate-800 text-slate-300"
          )}
          title="Event day"
        >
          {isSameDay(start, new Date()) ? "Today" : start.toLocaleDateString()}
        </div>
      </div>

      {ev.description ? (
        <div className="mt-2 text-sm text-slate-300/80 whitespace-pre-wrap">
          {String(ev.description).slice(0, 220)}
          {String(ev.description).length > 220 ? "…" : ""}
        </div>
      ) : null}
    </div>
  );
}

export default function SalesOsMiniCalendar({ pipelineId, onOpenCalendar }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const todayEnd = useMemo(() => {
    const d = new Date(todayStart);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [todayStart]);

  const weekEnd = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d;
  }, []);

  const todayEvents = useMemo(() => {
    return (events || []).filter((e) => {
      const s = new Date(e.start_at);
      return s >= todayStart && s <= todayEnd;
    });
  }, [events, todayStart, todayEnd]);

  async function load() {
    if (!pipelineId) {
      setEvents([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(
        `/sales/events/?pipeline_id=${encodeURIComponent(
          pipelineId
        )}&start=${encodeURIComponent(todayStart.toISOString())}&end=${encodeURIComponent(
          weekEnd.toISOString()
        )}`
      );
      const arr = Array.isArray(res.data) ? res.data : res.data?.results || [];
      // sort by start time
      arr.sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
      setEvents(arr);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineId]);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="font-semibold text-slate-100">Quick Calendar</div>
          <div className="text-xs text-slate-400 mt-1">
            {pipelineId ? "Today + next 7 days" : "Select a pipeline to load events"}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            disabled={!pipelineId || loading}
            className={cx(
              "text-xs rounded-2xl px-3 py-2 bg-slate-950/60 border border-slate-800 hover:bg-slate-900/40 transition",
              !pipelineId || loading ? "opacity-60 cursor-not-allowed" : ""
            )}
            title="Refresh events"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>

          <button
            type="button"
            onClick={onOpenCalendar}
            disabled={!pipelineId}
            className={cx(
              "text-xs rounded-2xl px-3 py-2 bg-cyan-500/15 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-200 transition",
              !pipelineId ? "opacity-60 cursor-not-allowed" : ""
            )}
            title="Open full Sales OS calendar"
          >
            Open Calendar →
          </button>
        </div>
      </div>

      {!pipelineId ? (
        <div className="mt-4 text-sm text-slate-400">
          No <span className="text-slate-200 font-mono">pipeline_id</span> selected.
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/30 p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-100">Today</div>
              <div className="text-[11px] text-slate-500">{todayStart.toLocaleDateString()}</div>
            </div>

            <div className="mt-3 space-y-3">
              {todayEvents.length === 0 ? (
                <div className="text-sm text-slate-400">No events today.</div>
              ) : (
                todayEvents.slice(0, 6).map((ev) => <EventRow key={ev.id} ev={ev} />)
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/30 p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-100">Next 7 Days</div>
              <div className="text-[11px] text-slate-500">
                {todayStart.toLocaleDateString()} → {weekEnd.toLocaleDateString()}
              </div>
            </div>

            <div className="mt-3 space-y-3">
              {events.length === 0 ? (
                <div className="text-sm text-slate-400">No events scheduled.</div>
              ) : (
                events.slice(0, 8).map((ev) => <EventRow key={ev.id} ev={ev} />)
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}