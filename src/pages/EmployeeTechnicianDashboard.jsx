import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPinned,
  MessageSquare,
  Navigation,
  Phone,
  Play,
  RefreshCw,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  Wrench,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import api from "../api/client";
import ModeBar from "../components/ModeBar";

const upper = (value) => String(value || "").toUpperCase();

function rowsOf(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.value)) return value.value;
  return [];
}

function titleOf(ticket) {
  return (
    ticket?.title ||
    ticket?.display_title ||
    ticket?.service_category_label ||
    ticket?.category_label ||
    ticket?.category?.name ||
    "Service job"
  );
}

function customerOf(ticket) {
  return (
    ticket?.customer_name ||
    ticket?.customer_full_name ||
    ticket?.customer?.full_name ||
    ticket?.requester_name ||
    "Customer"
  );
}

function addressOf(ticket) {
  return (
    ticket?.service_address ||
    ticket?.address ||
    [ticket?.city, ticket?.state, ticket?.service_zip]
      .filter(Boolean)
      .join(", ") ||
    "Address pending"
  );
}

function whenOf(ticket) {
  const value =
    ticket?.scheduled_start ||
    ticket?.scheduled_at ||
    ticket?.needed_by_date ||
    ticket?.created_at;

  if (!value) return "Schedule pending";

  try {
    return new Date(value).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "Schedule pending";
  }
}

function roleFromMe(me) {
  const candidates = [
    me?.active_business_role,
    me?.business_role,
    me?.membership_role,
    me?.employee_role,
    me?.role,
    me?.user?.role,
  ];

  const found = candidates.find(Boolean);
  const role = upper(found);

  if (["OWNER", "SBO"].includes(role)) return "OWNER";
  if (["MANAGER", "ADMIN"].includes(role)) return "MANAGER";
  if (["DISPATCH", "DISPATCHER"].includes(role)) return "DISPATCH";
  if (["ACCOUNTING", "ACCOUNTANT"].includes(role)) return "ACCOUNTING";
  if (["TECHNICIAN", "TECH", "EMPLOYEE", "SUB"].includes(role)) return "TECHNICIAN";
  return "EMPLOYEE";
}

function roleLabel(role) {
  const labels = {
    OWNER: "Owner",
    MANAGER: "Manager",
    DISPATCH: "Dispatch",
    ACCOUNTING: "Accounting",
    TECHNICIAN: "Technician",
    EMPLOYEE: "Employee",
  };
  return labels[role] || "Employee";
}

function nextAction(status) {
  const value = upper(status);

  if (["ASSIGNED", "ACCEPTED", "SCHEDULED"].includes(value)) {
    return { label: "Start route", status: "EN_ROUTE", icon: Navigation };
  }
  if (value === "EN_ROUTE") {
    return { label: "Mark arrived", status: "ON_SITE", icon: MapPinned };
  }
  if (value === "ON_SITE") {
    return { label: "Start work", status: "IN_PROGRESS", icon: Play };
  }
  if (value === "IN_PROGRESS") {
    return { label: "Complete job", status: "COMPLETED", icon: CheckCircle2 };
  }
  return null;
}

function statusTone(status) {
  const value = upper(status);

  if (value === "IN_PROGRESS") {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  }
  if (value === "ON_SITE") {
    return "border-violet-400/30 bg-violet-400/10 text-violet-200";
  }
  if (value === "EN_ROUTE") {
    return "border-cyan-400/30 bg-cyan-400/10 text-cyan-200";
  }
  if (value === "COMPLETED") {
    return "border-slate-500/30 bg-slate-500/10 text-slate-300";
  }
  return "border-amber-400/30 bg-amber-400/10 text-amber-200";
}

function Metric({ icon, label, value, hint }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/65 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
          {label}
        </div>
        {React.createElement(icon, {
          "aria-hidden": true,
          className: "h-5 w-5 text-cyan-200",
        })}
      </div>
      <div className="mt-3 text-3xl font-black text-white">{value}</div>
      <div className="mt-1 text-xs text-slate-400">{hint}</div>
    </div>
  );
}

function JobCard({ ticket, busyId, onStatus, onOpen }) {
  const action = nextAction(ticket?.status);
  const address = addressOf(ticket);
  const phone =
    ticket?.customer_phone ||
    ticket?.requester_phone ||
    ticket?.customer?.phone ||
    "";
  const maps =
    address !== "Address pending"
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          address
        )}`
      : "";

  return (
    <article className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950/75 shadow-xl">
      <button
        type="button"
        onClick={() => onOpen(ticket?.id)}
        className="w-full p-5 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
              Job #{ticket?.id}
            </div>
            <h2 className="mt-2 truncate text-xl font-black text-white">
              {titleOf(ticket)}
            </h2>
            <div className="mt-1 text-sm text-slate-300">
              {customerOf(ticket)}
            </div>
          </div>

          <span
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${statusTone(
              ticket?.status
            )}`}
          >
            {upper(ticket?.status).replaceAll("_", " ") || "ASSIGNED"}
          </span>
        </div>

        <div className="mt-4 grid gap-3 rounded-3xl border border-slate-800 bg-slate-900/40 p-4 text-sm">
          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
              Schedule
            </div>
            <div className="mt-1 font-bold text-slate-100">
              {whenOf(ticket)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
              Location
            </div>
            <div className="mt-1 text-slate-200">{address}</div>
          </div>
        </div>
      </button>

      <div className="grid grid-cols-2 gap-2 border-t border-slate-800 p-4">
        <a
          href={maps || undefined}
          target={maps ? "_blank" : undefined}
          rel={maps ? "noreferrer" : undefined}
          aria-disabled={!maps}
          className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-3 text-sm font-black ${
            maps
              ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-200"
              : "pointer-events-none border-slate-800 bg-slate-900 text-slate-600"
          }`}
        >
          <Navigation aria-hidden="true" className="h-4 w-4" />
          Directions
        </a>

        <a
          href={phone ? `tel:${String(phone).replace(/[^\d+]/g, "")}` : undefined}
          aria-disabled={!phone}
          className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-3 text-sm font-black ${
            phone
              ? "border-violet-400/25 bg-violet-400/10 text-violet-200"
              : "pointer-events-none border-slate-800 bg-slate-900 text-slate-600"
          }`}
        >
          <Phone aria-hidden="true" className="h-4 w-4" />
          Call
        </a>

        <button
          type="button"
          onClick={() => onOpen(ticket?.id)}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-3 text-sm font-black text-slate-200"
        >
          <MessageSquare aria-hidden="true" className="h-4 w-4" />
          Notes
        </button>

        {action ? (
          <button
            type="button"
            disabled={busyId === ticket?.id}
            onClick={() => onStatus(ticket, action.status)}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-emerald-300/30 bg-gradient-to-r from-emerald-500 to-green-600 px-3 text-sm font-black text-white disabled:opacity-50"
          >
            {React.createElement(action.icon, {
              "aria-hidden": true,
              className: "h-4 w-4",
            })}
            {busyId === ticket?.id ? "Updating..." : action.label}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onOpen(ticket?.id)}
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 px-3 text-sm font-black text-slate-200"
          >
            Open job
          </button>
        )}
      </div>
    </article>
  );
}

export default function EmployeeTechnicianDashboard() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [meRes, ticketRes] = await Promise.all([
        api.get("/auth/me/"),
        api.get("/tickets/"),
      ]);

      const current = meRes?.data || null;
      const userId = Number(current?.id || current?.user?.id || 0);
      const all = rowsOf(ticketRes?.data);

      setMe(current);
      setTickets(
        userId
          ? all.filter((ticket) => {
              const assignedId = Number(
                ticket?.assigned_member ||
                  ticket?.assigned_member_id ||
                  ticket?.assigned_to ||
                  ticket?.assigned_to_id ||
                  0
              );
              return !assignedId || assignedId === userId;
            })
          : all
      );
    } catch (requestError) {
      setError(
        requestError?.response?.data?.detail ||
          "Unable to load your business command center."
      );
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const role = roleFromMe(me);
  const active = useMemo(
    () =>
      tickets.filter((ticket) =>
        [
          "ASSIGNED",
          "ACCEPTED",
          "SCHEDULED",
          "EN_ROUTE",
          "ON_SITE",
          "IN_PROGRESS",
        ].includes(upper(ticket?.status))
      ),
    [tickets]
  );

  const completed = useMemo(
    () => tickets.filter((ticket) => upper(ticket?.status) === "COMPLETED"),
    [tickets]
  );

  const today = useMemo(() => {
    const key = new Date().toDateString();

    return active.filter((ticket) => {
      const value =
        ticket?.scheduled_start ||
        ticket?.scheduled_at ||
        ticket?.needed_by_date;

      if (!value) return true;

      try {
        return new Date(value).toDateString() === key;
      } catch {
        return true;
      }
    });
  }, [active]);

  const jobs = today.length ? today : active;
  const nextJob = jobs[0] || null;
  const name =
    `${me?.first_name || ""} ${me?.last_name || ""}`.trim() ||
    me?.name ||
    me?.email ||
    roleLabel(role);

  async function updateStatus(ticket, status) {
    setBusyId(ticket.id);
    setError("");

    try {
      await api.post(`/tickets/${ticket.id}/set-status/`, { status });
      await load();
    } catch (requestError) {
      setError(
        requestError?.response?.data?.detail ||
          "Unable to update the job status."
      );
    } finally {
      setBusyId(null);
    }
  }

  const navItems = [
    { label: "Jobs", icon: BriefcaseBusiness, href: "/employee" },
    { label: "Calendar", icon: CalendarDays, href: "/calendar" },
    { label: "Inbox", icon: MessageSquare, href: "/employee/inbox" },
    { label: "Settings", icon: Settings, href: "/employee/settings" },
  ];

  return (
    <div className="min-h-screen bg-[#020617] pb-28 text-slate-100">
      <ModeBar
        title={`${roleLabel(role)} Command`}
        subtitle="Assigned work, priorities, and field workflow"
        rightActions={
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/70 px-4 text-xs font-black text-slate-200 disabled:opacity-50"
          >
            <RefreshCw
              aria-hidden="true"
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        }
      />

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-5">
        <section className="relative overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-slate-950/80 p-5 shadow-[0_0_60px_rgba(34,211,238,0.10)] md:p-7">
          <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl" />
          <div className="absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="relative">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
                  Morning briefing · {roleLabel(role)}
                </div>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-white md:text-4xl">
                  Welcome, {name}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                  {nextJob
                    ? `Your next priority is ${titleOf(nextJob)} for ${customerOf(
                        nextJob
                      )}.`
                    : "You have no active assigned jobs. New work will appear here automatically."}
                </p>
              </div>

              <div className="inline-flex items-center gap-2 rounded-2xl border border-violet-400/25 bg-violet-400/10 px-4 py-3 text-sm font-black text-violet-100">
                <ShieldCheck aria-hidden="true" className="h-5 w-5" />
                Role-based workspace
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Metric
                icon={CalendarDays}
                label="Today"
                value={loading ? "..." : jobs.length}
                hint="Scheduled priorities"
              />
              <Metric
                icon={Clock3}
                label="Active"
                value={loading ? "..." : active.length}
                hint="Jobs in workflow"
              />
              <Metric
                icon={CheckCircle2}
                label="Completed"
                value={loading ? "..." : completed.length}
                hint="Finished assignments"
              />
              <Metric
                icon={Users}
                label="Role"
                value={roleLabel(role)}
                hint="Current permissions view"
              />
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-white">Your assignments</h2>
              <p className="mt-1 text-xs text-slate-400">
                Move work from route to arrival, active work, and completion.
              </p>
            </div>
            <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200">
              {jobs.length} jobs
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {loading ? (
              <div className="rounded-[2rem] border border-slate-800 bg-slate-950/70 p-6 text-sm text-slate-400">
                Loading assigned jobs...
              </div>
            ) : jobs.length ? (
              jobs.map((ticket) => (
                <JobCard
                  key={ticket.id}
                  ticket={ticket}
                  busyId={busyId}
                  onStatus={updateStatus}
                  onOpen={(id) =>
                    navigate(`/tickets/${id}?return=/employee`)
                  }
                />
              ))
            ) : (
              <div className="rounded-[2rem] border border-slate-800 bg-slate-950/70 p-8 text-center lg:col-span-2">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-200">
                  <Wrench aria-hidden="true" className="h-7 w-7" />
                </div>
                <div className="mt-4 text-lg font-black text-white">
                  No active assignments
                </div>
                <div className="mt-1 text-sm text-slate-400">
                  Assigned work will appear here automatically.
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-800 bg-slate-950/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-4 gap-1">
          {navItems.map((item, index) => (
            <button
              key={item.label}
              type="button"
              onClick={() => navigate(item.href)}
              className={`flex min-h-14 flex-col items-center justify-center rounded-2xl text-[10px] font-black ${
                index === 0
                  ? "bg-cyan-400/10 text-cyan-200"
                  : "text-slate-500"
              }`}
            >
              {React.createElement(item.icon, {
                "aria-hidden": true,
                className: "h-5 w-5",
              })}
              <span className="mt-1">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
