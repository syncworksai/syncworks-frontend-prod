// src/pages/PropertyManagerCalendar.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import ModeBar from "../components/ModeBar";
import Button from "../components/ui/Button";

/**
 * PM Ops Calendar (UI-first, backend later)
 *
 * Backend we will wire later:
 * - GET  /pm/events/?from=YYYY-MM-DD&to=YYYY-MM-DD&search=&type=&property_id=
 * - POST /pm/events/  (optional quick-add)
 *
 * Event model (expected shape):
 * {
 *   id,
 *   title,
 *   type,                 // LEASE_EXPIRES, DOC_SIGNATURE, INSPECTION, SECTION8, MAINTENANCE, OTHER
 *   due_at,               // ISO string (required)
 *   status,               // OPEN, DONE, CANCELLED
 *   property_id,
 *   property_name,
 *   unit_label,           // optional
 *   tenant_name,          // optional
 *   document_id,          // optional (for signing)
 *   link_url,             // optional (deep-link)
 *   notes                 // optional
 * }
 */

const EVENT_TYPES = [
  { key: "ALL", label: "All types" },
  { key: "LEASE_EXPIRES", label: "Lease Expirations" },
  { key: "DOC_SIGNATURE", label: "Documents to Sign" },
  { key: "INSPECTION", label: "Inspections" },
  { key: "SECTION8", label: "Section 8 / Recerts" },
  { key: "MAINTENANCE", label: "Maintenance" },
  { key: "OTHER", label: "Other" },
];

const EVENT_STATUS = [
  { key: "ALL", label: "All statuses" },
  { key: "OPEN", label: "Open" },
  { key: "DONE", label: "Done" },
  { key: "CANCELLED", label: "Cancelled" },
];

function Card({ title, subtitle, right, children }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{title}</div>
          {subtitle ? <div className="text-xs text-slate-400 mt-1">{subtitle}</div> : null}
        </div>
        {right}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Pill({ children, tone = "slate" }) {
  const cls =
    tone === "cyan"
      ? "border-cyan-500/40 text-cyan-200 bg-cyan-500/10"
      : tone === "emerald"
      ? "border-emerald-500/40 text-emerald-200 bg-emerald-500/10"
      : tone === "amber"
      ? "border-amber-500/40 text-amber-200 bg-amber-500/10"
      : tone === "red"
      ? "border-red-500/40 text-red-200 bg-red-500/10"
      : "border-slate-700 text-slate-300 bg-slate-950/40";
  return <span className={`inline-flex items-center px-2 py-1 rounded-full border text-[11px] ${cls}`}>{children}</span>;
}

function ymd(d) {
  // YYYY-MM-DD in local time
  const x = new Date(d);
  if (!Number.isFinite(x.getTime())) return "";
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function safeDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d : null;
}

function fmtShort(iso) {
  const d = safeDate(iso);
  if (!d) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function typeTone(type) {
  const t = String(type || "").toUpperCase();
  if (t === "LEASE_EXPIRES") return "amber";
  if (t === "DOC_SIGNATURE") return "cyan";
  if (t === "INSPECTION") return "emerald";
  if (t === "SECTION8") return "amber";
  if (t === "MAINTENANCE") return "slate";
  return "slate";
}

function statusTone(status) {
  const s = String(status || "").toUpperCase();
  if (s === "DONE") return "emerald";
  if (s === "CANCELLED") return "red";
  return "cyan";
}

function monthStart(date) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addMonths(date, delta) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + delta);
  return monthStart(d);
}

function buildMonthGrid(viewDate) {
  // returns { days: [{date, inMonth}], label }
  const start = monthStart(viewDate);
  const label = start.toLocaleString(undefined, { month: "long", year: "numeric" });

  // Find grid start (Sunday)
  const gridStart = new Date(start);
  const day = gridStart.getDay(); // 0 Sun
  gridStart.setDate(gridStart.getDate() - day);
  gridStart.setHours(0, 0, 0, 0);

  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    const inMonth = d.getMonth() === start.getMonth();
    days.push({ date: d, inMonth });
  }
  return { days, label };
}

export default function PropertyManagerCalendar() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // Calendar view date (month)
  const [viewDate, setViewDate] = useState(() => monthStart(new Date()));

  // Filters (designed for hundreds of properties)
  const [search, setSearch] = useState("");
  const [type, setType] = useState("ALL");
  const [status, setStatus] = useState("OPEN"); // default to Open to reduce noise
  const [propertyId, setPropertyId] = useState("ALL");

  // Properties list for filter dropdown (optional until backend exists)
  const [properties, setProperties] = useState([]);

  // Events data
  const [events, setEvents] = useState([]);

  // Quick-add modal (UI-only; backend later)
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState({
    title: "",
    type: "OTHER",
    due_date: ymd(new Date()),
    due_time: "09:00",
    property_id: "",
    notes: "",
  });

  async function tryList(paths, params = {}) {
    let last = null;
    for (const p of paths) {
      try {
        const r = await api.get(p, { params });
        const data = r.data;
        if (Array.isArray(data?.results)) return data.results;
        if (Array.isArray(data)) return data;
        return [];
      } catch (e) {
        last = e;
      }
    }
    throw last || new Error("Not found");
  }

  async function loadProperties() {
    // We'll wire this later; until then it silently falls back to empty.
    try {
      const list = await tryList(["/pm/properties/", "/properties/"]);
      setProperties(list);
    } catch {
      setProperties([]);
    }
  }

  async function loadEvents() {
    setLoading(true);
    setErr("");
    setOk("");

    const from = ymd(monthStart(viewDate));
    const toDate = addMonths(viewDate, 1);
    const to = ymd(toDate);

    const params = {
      from,
      to,
      search: search || undefined,
      type: type !== "ALL" ? type : undefined,
      status: status !== "ALL" ? status : undefined,
      property_id: propertyId !== "ALL" ? propertyId : undefined,
    };

    try {
      const list = await tryList(["/pm/events/", "/events/"], params);
      setEvents(list);
    } catch (e) {
      // Graceful “UI-first” message
      const msg = e?.response?.data?.detail || e?.message || "Failed to load calendar events.";
      setEvents([]);
      setErr(
        e?.response?.status === 404
          ? "PM calendar endpoints aren’t wired yet. This page is ready — next step is backend models + /pm/events/ API."
          : msg
      );
    } finally {
      setLoading(false);
    }
  }

  async function quickAddEvent() {
    setAdding(true);
    setErr("");
    setOk("");

    const title = addForm.title?.trim();
    if (!title) {
      setErr("Title is required.");
      setAdding(false);
      return;
    }

    const dueAt = new Date(`${addForm.due_date}T${addForm.due_time}:00`);
    if (!Number.isFinite(dueAt.getTime())) {
      setErr("Invalid due date/time.");
      setAdding(false);
      return;
    }

    const payload = {
      title,
      type: addForm.type,
      due_at: dueAt.toISOString(),
      property_id: addForm.property_id || null,
      notes: addForm.notes?.trim() || "",
    };

    let last = null;
    for (const p of ["/pm/events/", "/events/"]) {
      try {
        const r = await api.post(p, payload);
        const created = r.data;
        setEvents((prev) => [created, ...prev]);
        setOk("Event created.");
        setShowAdd(false);
        setAddForm((x) => ({ ...x, title: "", notes: "" }));
        setAdding(false);
        return;
      } catch (e) {
        last = e;
      }
    }

    setErr(
      last?.response?.status === 404
        ? "Quick-add will work after backend /pm/events/ is wired. For now, events will be generated automatically from leases/documents once backend exists."
        : last?.response?.data?.detail || last?.message || "Failed to create event."
    );
    setAdding(false);
  }

  useEffect(() => {
    loadProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewDate]);

  // We reload events when filters change, but debounce slightly so typing doesn't spam
  useEffect(() => {
    const t = setTimeout(() => loadEvents(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, type, status, propertyId]);

  const month = useMemo(() => buildMonthGrid(viewDate), [viewDate]);

  const eventsByDay = useMemo(() => {
    const map = new Map();
    for (const ev of events || []) {
      const d = safeDate(ev?.due_at);
      if (!d) continue;
      const key = ymd(d);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(ev);
    }
    // sort each day by time
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => {
        const ad = safeDate(a?.due_at)?.getTime() || 0;
        const bd = safeDate(b?.due_at)?.getTime() || 0;
        return ad - bd;
      });
      map.set(k, arr);
    }
    return map;
  }, [events]);

  const upcoming = useMemo(() => {
    const now = Date.now();
    const list = (events || [])
      .map((e) => ({ ...e, _t: safeDate(e?.due_at)?.getTime() || 0 }))
      .filter((e) => e._t > 0)
      .sort((a, b) => a._t - b._t);

    // show next 30 for “hundreds of properties” usability
    return list.filter((e) => e._t >= now - 1000 * 60 * 60 * 24).slice(0, 30);
  }, [events]);

  const propertyOptions = useMemo(() => {
    const opts = [{ id: "ALL", name: "All properties" }, ...(properties || [])];
    return opts;
  }, [properties]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar
        title="PM Calendar"
        subtitle="Leases • Signatures • Inspections • Section 8 • Compliance"
        rightActions={
          <div className="flex gap-2">
            <Button tone="slate" onClick={() => nav("/pm")}>
              Back
            </Button>
            <Button tone="slate" onClick={loadEvents} disabled={loading}>
              Refresh
            </Button>
            <Button tone="cyan" onClick={() => setShowAdd(true)}>
              Add Event
            </Button>
          </div>
        }
      />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {/* Filters */}
        <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
          <div className="grid lg:grid-cols-5 gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="lg:col-span-2 w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2 text-sm"
              placeholder="Search (property, unit, tenant, doc)…"
            />

            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
            >
              {EVENT_STATUS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>

            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
            >
              {propertyOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || p.property_name || `Property #${p.id}`}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-slate-400">
              Built for scale: filters keep this usable at 100+ properties.
            </div>
            <div className="text-xs text-slate-400">
              {loading ? "Loading…" : `${events.length} events in view`}
            </div>
          </div>

          {err ? (
            <div className="mt-4 text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-2xl p-3">
              {err}
              <div className="text-[11px] text-red-200/80 mt-2">
                Next backend step: create a single endpoint <span className="text-red-100">/pm/events/</span> and this
                page “turns on” immediately.
              </div>
            </div>
          ) : null}

          {ok ? (
            <div className="mt-4 text-sm text-emerald-200 bg-emerald-900/15 border border-emerald-700/30 rounded-2xl p-3">
              {ok}
            </div>
          ) : null}
        </div>

        {/* Main grid */}
        <div className="grid xl:grid-cols-3 gap-4">
          {/* Month grid */}
          <Card
            title="Month View"
            subtitle="Click a day to see its items (lease expiries, signatures, inspections)"
            right={
              <div className="flex items-center gap-2">
                <Button tone="slate" onClick={() => setViewDate((d) => addMonths(d, -1))}>
                  Prev
                </Button>
                <Pill tone="cyan">{month.label}</Pill>
                <Button tone="slate" onClick={() => setViewDate((d) => addMonths(d, 1))}>
                  Next
                </Button>
              </div>
            }
          >
            <div className="grid grid-cols-7 gap-2 text-[11px] text-slate-400 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((x) => (
                <div key={x} className="px-2">
                  {x}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {month.days.map(({ date, inMonth }) => {
                const key = ymd(date);
                const dayEvents = eventsByDay.get(key) || [];
                const isToday = key === ymd(new Date());
                return (
                  <div
                    key={key}
                    className={[
                      "rounded-2xl border p-2 min-h-[86px] cursor-default",
                      inMonth ? "bg-slate-950/50 border-slate-800" : "bg-slate-950/20 border-slate-900/60",
                      isToday ? "ring-1 ring-cyan-500/40" : "",
                    ].join(" ")}
                    title={dayEvents.length ? `${dayEvents.length} event(s)` : "No events"}
                  >
                    <div className="flex items-center justify-between">
                      <div className={inMonth ? "text-sm text-slate-200" : "text-sm text-slate-500"}>
                        {date.getDate()}
                      </div>
                      {dayEvents.length ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-200">
                          {dayEvents.length}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-2 space-y-1">
                      {dayEvents.slice(0, 2).map((ev) => (
                        <div
                          key={ev.id || `${ev.title}-${ev.due_at}`}
                          className="truncate text-[11px] text-slate-200"
                        >
                          <span className={`inline-block mr-1 align-middle w-1.5 h-1.5 rounded-full bg-slate-400`} />
                          {ev.title || "Event"}
                        </div>
                      ))}
                      {dayEvents.length > 2 ? (
                        <div className="text-[11px] text-slate-500">+{dayEvents.length - 2} more</div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 text-[11px] text-slate-500">
              Later we’ll add: “export to Google/Outlook”, SLA reminders, and document expiry alerts.
            </div>
          </Card>

          {/* Upcoming list */}
          <div className="xl:col-span-2 space-y-4">
            <Card
              title="Upcoming Ops Items"
              subtitle="The next 30 items across your portfolio"
              right={<Pill tone="cyan">Ops Feed</Pill>}
            >
              {loading ? (
                <div className="text-sm text-slate-400">Loading…</div>
              ) : upcoming.length === 0 ? (
                <div className="text-sm text-slate-400">
                  No upcoming items in this window yet.
                  <div className="text-[11px] text-slate-500 mt-2">
                    Once backend is wired, leases/documents will auto-generate events.
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcoming.map((ev) => {
                    const t = String(ev.type || "OTHER").toUpperCase();
                    const s = String(ev.status || "OPEN").toUpperCase();
                    return (
                      <div key={ev.id || `${ev.title}-${ev.due_at}`} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="min-w-[260px]">
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="font-semibold">{ev.title || "Event"}</div>
                              <Pill tone={typeTone(t)}>{t.replace("_", " ")}</Pill>
                              <Pill tone={statusTone(s)}>{s}</Pill>
                            </div>

                            <div className="text-xs text-slate-400 mt-1">
                              Due {fmtShort(ev.due_at)}
                              {ev.property_name ? (
                                <>
                                  <span className="mx-2 text-slate-600">•</span>
                                  <span className="text-slate-200">{ev.property_name}</span>
                                </>
                              ) : null}
                              {ev.unit_label ? (
                                <>
                                  <span className="mx-2 text-slate-600">•</span>
                                  Unit <span className="text-slate-200">{ev.unit_label}</span>
                                </>
                              ) : null}
                            </div>

                            {ev.tenant_name ? (
                              <div className="text-[11px] text-slate-500 mt-1">
                                Tenant: <span className="text-slate-300">{ev.tenant_name}</span>
                              </div>
                            ) : null}

                            {ev.notes ? (
                              <div className="text-sm text-slate-200 mt-2">{ev.notes}</div>
                            ) : null}
                          </div>

                          <div className="flex gap-2">
                            {ev.property_id ? (
                              <Link
                                to={`/pm/properties/${ev.property_id}`}
                                className="inline-flex items-center justify-center h-9 text-xs rounded-xl px-4 border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40 text-slate-200"
                              >
                                Property
                              </Link>
                            ) : null}

                            {ev.link_url ? (
                              <a
                                href={ev.link_url}
                                className="inline-flex items-center justify-center h-9 text-xs rounded-xl px-4 border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200"
                                target="_blank"
                                rel="noreferrer"
                              >
                                Open
                              </a>
                            ) : (
                              <Button
                                tone="slate"
                                onClick={() => setOk("Action buttons (mark done / request signature / notify agent) will be wired after backend exists.")}
                              >
                                Actions
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card
              title="How this becomes “one PM firm in one sitting”"
              subtitle="What we’ll auto-generate (no manual calendar busywork)"
              right={<Pill tone="emerald">Design</Pill>}
            >
              <div className="grid md:grid-cols-2 gap-3 text-sm text-slate-300">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                  <div className="font-semibold">From Leases</div>
                  <ul className="mt-2 list-disc pl-5 space-y-1">
                    <li>Lease expiration event (90/60/30 day reminders)</li>
                    <li>Renewal notice deadlines</li>
                    <li>Extension signing tasks</li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                  <div className="font-semibold">From Documents</div>
                  <ul className="mt-2 list-disc pl-5 space-y-1">
                    <li>Signature required tasks (tenant/PM/agent)</li>
                    <li>Document expiry alerts</li>
                    <li>Inspection / recertification cycles</li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                  <div className="font-semibold">Section 8 Automation</div>
                  <ul className="mt-2 list-disc pl-5 space-y-1">
                    <li>Agent email saved on property/unit</li>
                    <li>Recert reminders + inspection tracking</li>
                    <li>Paperwork checklists</li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                  <div className="font-semibold">Service Dispatch (later)</div>
                  <ul className="mt-2 list-disc pl-5 space-y-1">
                    <li>Maintenance tickets tied to unit</li>
                    <li>PM approval → marketplace routing</li>
                    <li>Vendor SLA + invoice trail</li>
                  </ul>
                </div>
              </div>

              <div className="mt-3 text-[11px] text-slate-500">
                We’ll keep “legal-grade” via audit logs, immutable document versions, and role-based visibility.
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* Quick add modal (UI-first) */}
      {showAdd ? (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-950/95 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">Add Ops Event</div>
                <div className="text-xs text-slate-400 mt-1">Optional quick-add; backend wiring comes next.</div>
              </div>
              <Button tone="slate" onClick={() => setShowAdd(false)} disabled={adding}>
                Close
              </Button>
            </div>

            <div className="mt-4 grid md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <div className="text-xs text-slate-400 mb-1">Title</div>
                <input
                  value={addForm.title}
                  onChange={(e) => setAddForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2 text-sm"
                  placeholder="Lease expiring for Unit 203"
                />
              </div>

              <div>
                <div className="text-xs text-slate-400 mb-1">Type</div>
                <select
                  value={addForm.type}
                  onChange={(e) => setAddForm((p) => ({ ...p, type: e.target.value }))}
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                >
                  {EVENT_TYPES.filter((t) => t.key !== "ALL").map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-xs text-slate-400 mb-1">Property</div>
                <select
                  value={addForm.property_id}
                  onChange={(e) => setAddForm((p) => ({ ...p, property_id: e.target.value }))}
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                >
                  <option value="">(optional)</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name || `Property #${p.id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-xs text-slate-400 mb-1">Due date</div>
                <input
                  type="date"
                  value={addForm.due_date}
                  onChange={(e) => setAddForm((p) => ({ ...p, due_date: e.target.value }))}
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <div className="text-xs text-slate-400 mb-1">Due time</div>
                <input
                  type="time"
                  value={addForm.due_time}
                  onChange={(e) => setAddForm((p) => ({ ...p, due_time: e.target.value }))}
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <div className="text-xs text-slate-400 mb-1">Notes (optional)</div>
                <textarea
                  value={addForm.notes}
                  onChange={(e) => setAddForm((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm min-h-[90px]"
                  placeholder="Add any context for staff..."
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button tone="cyan" onClick={quickAddEvent} disabled={adding}>
                {adding ? "Creating…" : "Create Event"}
              </Button>
              <Button
                tone="slate"
                onClick={() => {
                  setShowAdd(false);
                  setOk("Tip: once leases/docs exist, most events should be auto-generated — quick-add is for edge cases.");
                }}
                disabled={adding}
              >
                Cancel
              </Button>
            </div>

            <div className="mt-3 text-[11px] text-slate-500">
              Next backend step will auto-create events from leases and documents, so PM staff don’t manually manage calendars.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
