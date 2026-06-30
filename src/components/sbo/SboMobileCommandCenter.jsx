import React, { useMemo } from "react";

function list(value) {
  return Array.isArray(value) ? value : [];
}

function normalizedStatus(value) {
  return String(value || "NEW").toUpperCase();
}

function ticketTitle(ticket) {
  return (
    ticket?.title ||
    ticket?.display_title ||
    ticket?.service_category_label ||
    ticket?.category_label ||
    ticket?.category?.name ||
    ticket?.service_category?.name ||
    "Service request"
  );
}

function ticketTime(ticket) {
  const value =
    ticket?.scheduled_start ||
    ticket?.scheduled_at ||
    ticket?.needed_by_date ||
    ticket?.updated_at ||
    ticket?.created_at;

  if (!value) return "Time pending";

  try {
    return new Date(value).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "Time pending";
  }
}

function assignedName(ticket) {
  return (
    ticket?.assigned_member_name ||
    ticket?.assigned_to_name ||
    ticket?.technician_name ||
    ticket?.assigned_member?.full_name ||
    ticket?.assigned_member?.name ||
    "Unassigned"
  );
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function MobileMetric({ label, value, hint, tone = "cyan", onClick }) {
  const tones = {
    cyan: "border-cyan-400/25 bg-cyan-400/10 text-cyan-100",
    violet: "border-violet-400/25 bg-violet-400/10 text-violet-100",
    emerald: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
    amber: "border-amber-400/25 bg-amber-400/10 text-amber-100",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[104px] rounded-3xl border p-4 text-left shadow-lg backdrop-blur-xl ${tones[tone]}`}
    >
      <div className="text-[11px] font-black uppercase tracking-[0.18em] opacity-80">
        {label}
      </div>
      <div className="mt-2 text-3xl font-black text-white">{value}</div>
      <div className="mt-1 text-xs text-slate-400">{hint}</div>
    </button>
  );
}

function QuickAction({ icon, label, hint, onClick, primary = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        primary
          ? "flex min-h-[78px] items-center gap-3 rounded-3xl border border-cyan-300/35 bg-gradient-to-r from-cyan-500 to-blue-600 p-4 text-left shadow-[0_0_28px_rgba(34,211,238,0.22)]"
          : "flex min-h-[78px] items-center gap-3 rounded-3xl border border-slate-700/80 bg-slate-950/70 p-4 text-left"
      }
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/10 text-xl">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-black text-white">{label}</span>
        <span className="mt-0.5 block text-xs text-slate-300">{hint}</span>
      </span>
    </button>
  );
}

function TicketRow({ ticket, onOpen }) {
  const current = normalizedStatus(ticket?.status);
  const urgent = ["NEW", "NEEDS_QUOTE", "QUOTE_REJECTED"].includes(current);
  const unassigned = !ticket?.assigned_member && !ticket?.assigned_member_id;

  return (
    <button
      type="button"
      onClick={() => onOpen(ticket?.id)}
      className="w-full rounded-3xl border border-slate-800 bg-slate-950/65 p-4 text-left"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-black text-white">
            {ticketTitle(ticket)}
          </div>
          <div className="mt-1 text-xs text-slate-400">{ticketTime(ticket)}</div>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${
            urgent
              ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
              : "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
          }`}
        >
          {current.replaceAll("_", " ")}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-xs">
        <span className={unassigned ? "font-bold text-rose-300" : "text-slate-400"}>
          {unassigned ? "Needs technician" : assignedName(ticket)}
        </span>
        <span className="text-slate-500">#{ticket?.id}</span>
      </div>
    </button>
  );
}

export default function SboMobileCommandCenter({
  businessName,
  loading,
  tickets,
  revenueThisMonth,
  openTickets,
  outstandingInvoices,
  onRefresh,
  onOpenTicket,
  onOpenRequests,
  onOpenCalendar,
  onOpenTeam,
  onOpenCustomers,
  onOpenLeads,
  onOpenFinance,
  onOpenSocial,
  onOpenSettings,
}) {
  const rows = list(tickets);

  const attentionRows = useMemo(
    () =>
      rows
        .filter((ticket) => {
          const current = normalizedStatus(ticket?.status);
          const unassigned = !ticket?.assigned_member && !ticket?.assigned_member_id;
          return (
            unassigned ||
            ["NEW", "NEEDS_QUOTE", "QUOTE_REJECTED", "INVOICED"].includes(current)
          );
        })
        .slice(0, 4),
    [rows]
  );

  const todayRows = useMemo(() => {
    const today = new Date().toDateString();
    return rows
      .filter((ticket) => {
        const value =
          ticket?.scheduled_start ||
          ticket?.scheduled_at ||
          ticket?.needed_by_date;
        if (!value) return false;
        try {
          return new Date(value).toDateString() === today;
        } catch {
          return false;
        }
      })
      .slice(0, 4);
  }, [rows]);

  const activeJobs = useMemo(
    () =>
      rows.filter((ticket) =>
        ["ACCEPTED", "ASSIGNED", "SCHEDULED", "EN_ROUTE", "ON_SITE", "IN_PROGRESS"].includes(
          normalizedStatus(ticket?.status)
        )
      ).length,
    [rows]
  );

  const unassignedJobs = useMemo(
    () =>
      rows.filter(
        (ticket) =>
          !["COMPLETED", "CANCELLED", "PAID", "CLOSED"].includes(
            normalizedStatus(ticket?.status)
          ) &&
          !ticket?.assigned_member &&
          !ticket?.assigned_member_id
      ).length,
    [rows]
  );

  return (
    <section className="space-y-4 lg:hidden">
      <div className="relative overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-slate-950/80 p-5 shadow-[0_0_60px_rgba(34,211,238,0.10)]">
        <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="absolute -bottom-20 -left-16 h-52 w-52 rounded-full bg-violet-500/15 blur-3xl" />

        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
                Business command
              </div>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-white">
                {businessName || "Your business"}
              </h1>
              <p className="mt-1 text-xs text-slate-400">
                What needs your attention right now.
              </p>
            </div>

            <button
              type="button"
              onClick={onRefresh}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-slate-700 bg-slate-900/80 text-lg text-slate-200"
              aria-label="Refresh dashboard"
            >
              â†»
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <MobileMetric
              label="Open"
              value={loading ? "â€¦" : openTickets}
              hint="Requests in pipeline"
              onClick={onOpenRequests}
            />
            <MobileMetric
              label="Active"
              value={loading ? "â€¦" : activeJobs}
              hint="Accepted through in progress"
              tone="violet"
              onClick={onOpenRequests}
            />
            <MobileMetric
              label="Unassigned"
              value={loading ? "â€¦" : unassignedJobs}
              hint="Needs a team member"
              tone="amber"
              onClick={onOpenTeam}
            />
            <MobileMetric
              label="Collected"
              value={loading ? "â€¦" : money(revenueThisMonth)}
              hint={`${outstandingInvoices || 0} invoice(s) due`}
              tone="emerald"
              onClick={onOpenFinance}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <QuickAction icon="+" label="New request" hint="Create or log work" onClick={onOpenRequests} primary />
        <QuickAction icon="â—·" label="Schedule" hint="Jobs and meetings" onClick={onOpenCalendar} />
        <QuickAction icon="ðŸ‘¥" label="Team" hint="Assign technicians" onClick={onOpenTeam} />
        <QuickAction icon="â—Ž" label="Leads" hint="Follow up and close" onClick={onOpenLeads} />
      </div>

      <div className="rounded-[2rem] border border-amber-400/20 bg-slate-950/75 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-black text-white">Needs attention</div>
            <div className="mt-1 text-xs text-slate-400">New, unassigned, quote, and invoice work.</div>
          </div>
          <button type="button" onClick={onOpenRequests} className="rounded-2xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs font-black text-amber-200">
            View all
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {attentionRows.length ? (
            attentionRows.map((ticket) => <TicketRow key={ticket.id} ticket={ticket} onOpen={onOpenTicket} />)
          ) : (
            <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">Nothing urgent right now.</div>
          )}
        </div>
      </div>

      <div className="rounded-[2rem] border border-violet-400/20 bg-slate-950/75 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-black text-white">Today</div>
            <div className="mt-1 text-xs text-slate-400">Scheduled jobs for the current business.</div>
          </div>
          <button type="button" onClick={onOpenCalendar} className="rounded-2xl border border-violet-400/25 bg-violet-400/10 px-3 py-2 text-xs font-black text-violet-200">
            Calendar
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {todayRows.length ? (
            todayRows.map((ticket) => <TicketRow key={ticket.id} ticket={ticket} onOpen={onOpenTicket} />)
          ) : (
            <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">No jobs scheduled for today.</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pb-2">
        <QuickAction icon="â—‰" label="Customers" hint="History and requests" onClick={onOpenCustomers} />
        <QuickAction icon="$" label="Finance" hint="Invoices and money" onClick={onOpenFinance} />
        <QuickAction icon="âœ¦" label="Social" hint="Content and campaigns" onClick={onOpenSocial} />
        <QuickAction icon="âš™" label="Settings" hint="Business controls" onClick={onOpenSettings} />
      </div>
    </section>
  );
}
