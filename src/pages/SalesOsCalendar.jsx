// src/pages/SalesOsCalendar.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/client";
import ModeBar from "../components/ModeBar";
import SalesOsSubNav from "../components/SalesOsSubNav";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function fmtLocal(dt) {
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return dt;
  }
}

function isoLocal(dt) {
  try {
    return new Date(dt).toISOString();
  } catch {
    return "";
  }
}

function googleLink({ title, startAt, endAt, desc, loc }) {
  const s = new Date(startAt);
  const e = new Date(endAt);
  const toG = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const dates = `${toG(s)}/${toG(e)}`;

  return (
    "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    `&text=${encodeURIComponent(title || "")}` +
    `&dates=${encodeURIComponent(dates)}` +
    `&details=${encodeURIComponent(desc || "")}` +
    `&location=${encodeURIComponent(loc || "")}`
  );
}

function outlookLink({ title, startAt, endAt, desc, loc }) {
  return (
    "https://outlook.live.com/calendar/0/deeplink/compose" +
    `?subject=${encodeURIComponent(title || "")}` +
    `&startdt=${encodeURIComponent(isoLocal(startAt))}` +
    `&enddt=${encodeURIComponent(isoLocal(endAt))}` +
    `&body=${encodeURIComponent(desc || "")}` +
    `&location=${encodeURIComponent(loc || "")}`
  );
}

function Panel({ title, right, children }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div className="text-slate-100 font-semibold">{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

function EventCard({ ev, onEdit, onDelete }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold truncate text-slate-100">{ev.title}</div>
          <div className="text-xs text-slate-400 mt-1">
            {fmtLocal(ev.start_at)} → {fmtLocal(ev.end_at)}
          </div>
          {ev.location ? <div className="text-xs text-slate-400 mt-1">📍 {ev.location}</div> : null}
          {ev.assigned_member_display?.name ? (
            <div className="text-xs text-slate-400 mt-1">👤 {ev.assigned_member_display.name}</div>
          ) : null}
          {ev.description ? (
            <div className="text-sm text-slate-200 mt-2 whitespace-pre-wrap">{ev.description}</div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          <a
            className="px-3 py-2 rounded-xl bg-slate-950/60 hover:bg-slate-900/40 border border-slate-800 text-xs text-center text-slate-200"
            href={googleLink({ title: ev.title, startAt: ev.start_at, endAt: ev.end_at, desc: ev.description, loc: ev.location })}
            target="_blank"
            rel="noreferrer"
            title="Add to Google Calendar"
          >
            Google
          </a>
          <a
            className="px-3 py-2 rounded-xl bg-slate-950/60 hover:bg-slate-900/40 border border-slate-800 text-xs text-center text-slate-200"
            href={outlookLink({ title: ev.title, startAt: ev.start_at, endAt: ev.end_at, desc: ev.description, loc: ev.location })}
            target="_blank"
            rel="noreferrer"
            title="Add to Outlook Calendar"
          >
            Outlook
          </a>
          <a
            className="px-3 py-2 rounded-xl bg-slate-950/60 hover:bg-slate-900/40 border border-slate-800 text-xs text-center text-slate-200"
            href={`${api.defaults?.baseURL || ""}/sales/events/${ev.id}/ics`}
            target="_blank"
            rel="noreferrer"
            title="Download ICS"
          >
            ICS
          </a>

          <button
            className="px-3 py-2 rounded-xl bg-slate-950/60 hover:bg-slate-900/40 border border-slate-800 text-xs text-slate-200"
            onClick={() => onEdit(ev)}
          >
            Edit
          </button>
          <button
            className="px-3 py-2 rounded-xl bg-slate-950/60 hover:bg-slate-900/40 border border-slate-800 text-xs text-slate-200"
            onClick={() => onDelete(ev)}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function MonthGrid({ year, month, events, onSelectDay }) {
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const byDay = useMemo(() => {
    const map = new Map();
    (events || []).forEach((e) => {
      const d = new Date(e.start_at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [events]);

  return (
    <div className="grid grid-cols-7 gap-2">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
        <div key={w} className="text-xs text-slate-500 px-2">
          {w}
        </div>
      ))}
      {cells.map((d, idx) => {
        if (!d) return <div key={idx} className="h-16 rounded-xl bg-slate-950/40 border border-slate-800" />;
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        const count = byDay.get(key) || 0;
        return (
          <button
            key={idx}
            onClick={() => onSelectDay(d)}
            className="h-16 rounded-xl bg-slate-950/40 hover:bg-slate-900/40 border border-slate-800 text-left p-2"
            title={count ? `${count} event(s)` : "No events"}
          >
            <div className="text-xs text-slate-200">{d.getDate()}</div>
            {count ? (
              <div className="mt-1 text-[10px] text-emerald-300/90">{count} event</div>
            ) : (
              <div className="mt-1 text-[10px] text-slate-600">—</div>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function SalesOsCalendar() {
  const [params] = useSearchParams();
  const pipelineId = (params.get("pipeline_id") || "").trim();

  const [view, setView] = useState("week"); // day | week | month
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const [dayFocus, setDayFocus] = useState(new Date());
  const [monthFocus, setMonthFocus] = useState(new Date());

  const [modal, setModal] = useState({ open: false, ev: null });
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    start_at: "",
    end_at: "",
  });

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

  const filteredToday = useMemo(() => {
    return (events || []).filter((e) => {
      const s = new Date(e.start_at);
      return s >= todayStart && s <= todayEnd;
    });
  }, [events, todayStart, todayEnd]);

  async function loadRange(start, end) {
    if (!pipelineId) return;
    setLoading(true);
    try {
      const res = await api.get(
        `/sales/events/?pipeline_id=${encodeURIComponent(pipelineId)}&start=${encodeURIComponent(
          start.toISOString()
        )}&end=${encodeURIComponent(end.toISOString())}`
      );
      setEvents(res.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!pipelineId) return;
    loadRange(todayStart, weekEnd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineId]);

  function openCreate() {
    const now = new Date();
    const later = new Date(now);
    later.setMinutes(later.getMinutes() + 30);

    setForm({
      title: "Call / Follow-up",
      description: "",
      location: "",
      start_at: now.toISOString().slice(0, 16),
      end_at: later.toISOString().slice(0, 16),
    });
    setModal({ open: true, ev: null });
  }

  function openEdit(ev) {
    setForm({
      title: ev.title || "",
      description: ev.description || "",
      location: ev.location || "",
      start_at: new Date(ev.start_at).toISOString().slice(0, 16),
      end_at: new Date(ev.end_at).toISOString().slice(0, 16),
    });
    setModal({ open: true, ev });
  }

  async function save() {
    if (!pipelineId) return;

    const payload = {
      pipeline_id: Number(pipelineId),
      title: form.title,
      description: form.description,
      location: form.location,
      start_at: new Date(form.start_at).toISOString(),
      end_at: new Date(form.end_at).toISOString(),
    };

    if (!payload.title) return alert("Title required.");
    if (!payload.start_at || !payload.end_at) return alert("Start/end required.");

    setLoading(true);
    try {
      if (modal.ev?.id) await api.patch(`/sales/events/${modal.ev.id}/`, payload);
      else await api.post(`/sales/events/`, payload);

      setModal({ open: false, ev: null });

      if (view === "day") {
        const d0 = new Date(dayFocus);
        d0.setHours(0, 0, 0, 0);
        const d1 = new Date(dayFocus);
        d1.setHours(23, 59, 59, 999);
        await loadRange(d0, d1);
      } else if (view === "month") {
        const y = monthFocus.getFullYear();
        const m = monthFocus.getMonth();
        const d0 = new Date(y, m, 1);
        const d1 = new Date(y, m + 1, 0);
        d1.setHours(23, 59, 59, 999);
        await loadRange(d0, d1);
      } else {
        await loadRange(todayStart, weekEnd);
      }
    } catch (e) {
      alert(e?.response?.data?.detail || "Save failed (pipeline may be locked).");
    } finally {
      setLoading(false);
    }
  }

  async function remove(ev) {
    if (!confirm("Delete event?")) return;
    setLoading(true);
    try {
      await api.delete(`/sales/events/${ev.id}/`);
      await loadRange(todayStart, weekEnd);
    } catch {
      alert("Delete failed (pipeline may be locked).");
    } finally {
      setLoading(false);
    }
  }

  async function switchView(next) {
    setView(next);

    if (next === "day") {
      const d0 = new Date(dayFocus);
      d0.setHours(0, 0, 0, 0);
      const d1 = new Date(dayFocus);
      d1.setHours(23, 59, 59, 999);
      await loadRange(d0, d1);
      return;
    }

    if (next === "month") {
      const y = monthFocus.getFullYear();
      const m = monthFocus.getMonth();
      const d0 = new Date(y, m, 1);
      const d1 = new Date(y, m + 1, 0);
      d1.setHours(23, 59, 59, 999);
      await loadRange(d0, d1);
      return;
    }

    await loadRange(todayStart, weekEnd);
  }

  function monthPrev() {
    const d = new Date(monthFocus);
    d.setMonth(d.getMonth() - 1);
    setMonthFocus(d);
    switchView("month");
  }
  function monthNext() {
    const d = new Date(monthFocus);
    d.setMonth(d.getMonth() + 1);
    setMonthFocus(d);
    switchView("month");
  }

  function onSelectDay(d) {
    setDayFocus(d);
    switchView("day");
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar
        title="Sales OS • Calendar"
        subtitle={pipelineId ? `Pipeline #${pipelineId}` : "Open from Sales OS dashboard"}
        rightActions={
          <div className="flex items-center gap-2 flex-wrap">
            <SalesOsSubNav pipelineId={pipelineId} active="calendar" />
            <button
              onClick={() => switchView("day")}
              className={cx(
                "h-10 px-3 rounded-2xl border border-slate-800 text-xs font-semibold",
                view === "day" ? "bg-slate-900/60" : "bg-slate-950/55 hover:bg-slate-900/60"
              )}
            >
              Day
            </button>
            <button
              onClick={() => switchView("week")}
              className={cx(
                "h-10 px-3 rounded-2xl border border-slate-800 text-xs font-semibold",
                view === "week" ? "bg-slate-900/60" : "bg-slate-950/55 hover:bg-slate-900/60"
              )}
            >
              Week
            </button>
            <button
              onClick={() => switchView("month")}
              className={cx(
                "h-10 px-3 rounded-2xl border border-slate-800 text-xs font-semibold",
                view === "month" ? "bg-slate-900/60" : "bg-slate-950/55 hover:bg-slate-900/60"
              )}
            >
              Month
            </button>

            <button
              onClick={openCreate}
              className="h-10 px-3 rounded-2xl border border-fuchsia-500/35 bg-fuchsia-500/10 text-fuchsia-200 hover:bg-fuchsia-500/15 text-xs font-semibold"
              disabled={!pipelineId || loading}
            >
              + New Event
            </button>
          </div>
        }
      />

      <div className="max-w-6xl mx-auto px-4 pb-16">
        {!pipelineId ? (
          <div className="mt-6 text-slate-300">Missing pipeline_id.</div>
        ) : (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="Quick Glance • Today" right={<span className="text-xs text-slate-500">{loading ? "Loading..." : ""}</span>}>
              {filteredToday.length === 0 ? (
                <div className="text-sm text-slate-400">No events today.</div>
              ) : (
                <div className="space-y-3">
                  {filteredToday.map((ev) => (
                    <EventCard key={ev.id} ev={ev} onEdit={openEdit} onDelete={remove} />
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Quick Glance • Next 7 Days">
              {events.length === 0 ? (
                <div className="text-sm text-slate-400">No events scheduled.</div>
              ) : (
                <div className="space-y-3">
                  {events.slice(0, 12).map((ev) => (
                    <EventCard key={ev.id} ev={ev} onEdit={openEdit} onDelete={remove} />
                  ))}
                </div>
              )}
            </Panel>

            <div className="lg:col-span-2">
              <Panel
                title={
                  view === "month"
                    ? `Month View • ${monthFocus.toLocaleString(undefined, { month: "long" })} ${monthFocus.getFullYear()}`
                    : view === "day"
                    ? `Day View • ${dayFocus.toLocaleDateString()}`
                    : "Week View • Next 7 Days"
                }
                right={
                  view === "month" ? (
                    <div className="flex items-center gap-2">
                      <button onClick={monthPrev} className="h-9 px-3 rounded-2xl border border-slate-800 bg-slate-950/55 hover:bg-slate-900/60 text-xs">
                        Prev
                      </button>
                      <button onClick={monthNext} className="h-9 px-3 rounded-2xl border border-slate-800 bg-slate-950/55 hover:bg-slate-900/60 text-xs">
                        Next
                      </button>
                    </div>
                  ) : null
                }
              >
                {view === "month" ? (
                  <MonthGrid
                    year={monthFocus.getFullYear()}
                    month={monthFocus.getMonth()}
                    events={events}
                    onSelectDay={onSelectDay}
                  />
                ) : (
                  <div className="space-y-3">
                    {(events || []).map((ev) => (
                      <EventCard key={ev.id} ev={ev} onEdit={openEdit} onDelete={remove} />
                    ))}
                  </div>
                )}
              </Panel>
            </div>
          </div>
        )}
      </div>

      {modal.open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl rounded-3xl bg-slate-950 border border-slate-800 p-5">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{modal.ev ? "Edit Event" : "New Event"}</div>
              <button className="text-slate-300 hover:text-white" onClick={() => setModal({ open: false, ev: null })}>
                ✕
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                className="bg-slate-950/60 border border-slate-800 rounded-2xl px-3 py-2"
                placeholder="Title"
                value={form.title}
                onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
              />

              <input
                className="bg-slate-950/60 border border-slate-800 rounded-2xl px-3 py-2"
                placeholder="Location (optional)"
                value={form.location}
                onChange={(e) => setForm((s) => ({ ...s, location: e.target.value }))}
              />

              <div className="flex flex-col gap-1">
                <div className="text-xs text-slate-400">Start</div>
                <input
                  type="datetime-local"
                  className="bg-slate-950/60 border border-slate-800 rounded-2xl px-3 py-2"
                  value={form.start_at}
                  onChange={(e) => setForm((s) => ({ ...s, start_at: e.target.value }))}
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="text-xs text-slate-400">End</div>
                <input
                  type="datetime-local"
                  className="bg-slate-950/60 border border-slate-800 rounded-2xl px-3 py-2"
                  value={form.end_at}
                  onChange={(e) => setForm((s) => ({ ...s, end_at: e.target.value }))}
                />
              </div>

              <textarea
                className="md:col-span-2 bg-slate-950/60 border border-slate-800 rounded-2xl px-3 py-2 min-h-[140px]"
                placeholder="Description (optional)"
                value={form.description}
                onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
              />
            </div>

            <div className="mt-4">
              <button
                onClick={save}
                disabled={loading}
                className="w-full h-11 rounded-2xl border border-fuchsia-500/35 bg-fuchsia-500/10 text-fuchsia-200 hover:bg-fuchsia-500/15 font-semibold"
              >
                {loading ? "Saving..." : "Save Event"}
              </button>

              <div className="text-xs text-slate-500 mt-2">
                Add-to-calendar links use this event’s start/end and your backend ICS endpoint.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}