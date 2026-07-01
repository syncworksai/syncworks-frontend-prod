import React, { useMemo } from "react";

const list = (value) => (Array.isArray(value) ? value : []);
const upper = (value) => String(value || "NEW").toUpperCase();

function titleFor(ticket) {
  return (
    ticket?.taxonomy_label ||
    ticket?.category_label ||
    ticket?.service_category_label ||
    ticket?.display_title ||
    ticket?.title ||
    "Service request"
  );
}

function providerFor(ticket) {
  return (
    ticket?.assigned_business_name ||
    ticket?.assigned_business_card?.name ||
    ticket?.business_name ||
    ticket?.business?.name ||
    "Provider pending"
  );
}

function whenFor(ticket) {
  const value =
    ticket?.scheduled_start ||
    ticket?.scheduled_at ||
    ticket?.schedule_time ||
    ticket?.appointment_at ||
    ticket?.updated_at ||
    ticket?.created_at;

  if (!value) return "Timing pending";

  try {
    return new Date(value).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "Timing pending";
  }
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function statusTone(value) {
  const status = upper(value);
  if (["COMPLETED", "PAID", "CLOSED"].includes(status)) {
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
  }
  if (["INVOICED", "SENT", "READY_FOR_PAYMENT"].includes(status)) {
    return "border-amber-400/25 bg-amber-400/10 text-amber-200";
  }
  if (
    ["EN_ROUTE", "ON_SITE", "IN_PROGRESS", "SCHEDULED", "ASSIGNED", "ACCEPTED"].includes(
      status
    )
  ) {
    return "border-violet-400/25 bg-violet-400/10 text-violet-200";
  }
  return "border-cyan-400/25 bg-cyan-400/10 text-cyan-200";
}

function Action({ icon, label, hint, onClick, primary = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        primary
          ? "flex min-h-[82px] items-center gap-3 rounded-3xl border border-cyan-300/35 bg-gradient-to-r from-cyan-500 to-blue-600 p-4 text-left shadow-[0_0_30px_rgba(34,211,238,0.22)]"
          : "flex min-h-[82px] items-center gap-3 rounded-3xl border border-slate-800 bg-slate-950/75 p-4 text-left"
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

function RequestCard({ ticket, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(ticket.id)}
      className="w-full rounded-3xl border border-slate-800 bg-slate-950/70 p-4 text-left"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-base font-black text-white">{titleFor(ticket)}</div>
          <div className="mt-1 truncate text-xs text-slate-400">{providerFor(ticket)}</div>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${statusTone(
            ticket.status
          )}`}
        >
          {upper(ticket.status).replaceAll("_", " ")}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs">
        <span className="text-slate-400">{whenFor(ticket)}</span>
        <span className="font-bold text-cyan-200">Track →</span>
      </div>
    </button>
  );
}

export default function CustomerMobileHome({
  displayName,
  tickets,
  invoices,
  openCount,
  totalDue,
  loading,
  error,
  onRefresh,
  onNewRequest,
  onOpenTicket,
  onOpenRequests,
  onOpenCalendar,
  onOpenMessages,
  onOpenMoney,
  onOpenHealth,
  onOpenMore,
}) {
  const active = useMemo(
    () =>
      list(tickets)
        .filter(
          (ticket) =>
            !["COMPLETED", "PAID", "CLOSED", "CANCELLED"].includes(
              upper(ticket?.status)
            )
        )
        .slice(0, 3),
    [tickets]
  );

  const nextScheduled = useMemo(
    () =>
      list(tickets).find(
        (ticket) =>
          ticket?.scheduled_start ||
          ticket?.scheduled_at ||
          ticket?.schedule_time ||
          ticket?.appointment_at
      ) || null,
    [tickets]
  );

  const payment = list(invoices)[0] || null;
  const paymentAmount = payment
    ? payment.invoice?.total ??
      payment.invoice?.amount ??
      Number(payment.invoice?.amount_cents || 0) / 100
    : 0;

  return (
    <section className="space-y-4 lg:hidden">
      <div className="relative overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-slate-950/80 p-5 shadow-[0_0_60px_rgba(34,211,238,0.10)]">
        <div className="absolute -right-20 -top-24 h-60 w-60 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
                Personal home
              </div>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
                Hey {displayName}
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Requests, schedule, payments, and life—without the clutter.
              </p>
            </div>
            <button
              type="button"
              onClick={onRefresh}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-slate-700 bg-slate-900/80 text-lg text-slate-200"
              aria-label="Refresh home"
            >
              ↻
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onOpenRequests}
              className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-left"
            >
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
                Open requests
              </div>
              <div className="mt-2 text-3xl font-black text-white">
                {loading ? "…" : openCount}
              </div>
              <div className="mt-1 text-xs text-slate-400">Track active service</div>
            </button>

            <button
              type="button"
              onClick={onOpenMoney}
              className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-4 text-left"
            >
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">
                Due now
              </div>
              <div className="mt-2 text-3xl font-black text-white">
                {loading ? "…" : money(totalDue)}
              </div>
              <div className="mt-1 text-xs text-slate-400">Payments ready</div>
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Action
          icon="+"
          label="Request service"
          hint="Tell us what you need"
          onClick={onNewRequest}
          primary
        />
        <Action
          icon="▤"
          label="Track requests"
          hint="Updates and providers"
          onClick={onOpenRequests}
        />
        <Action
          icon="◷"
          label="Schedule"
          hint="Services and reminders"
          onClick={onOpenCalendar}
        />
        <Action
          icon="💬"
          label="Messages"
          hint="Talk to your provider"
          onClick={onOpenMessages}
        />
      </div>

      {payment ? (
        <button
          type="button"
          onClick={() => onOpenTicket(payment.ticket.id)}
          className="w-full rounded-[2rem] border border-amber-400/25 bg-gradient-to-r from-amber-500/15 to-orange-500/10 p-5 text-left"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">
                Payment ready
              </div>
              <div className="mt-2 text-lg font-black text-white">
                {titleFor(payment.ticket)}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Review invoice and payment options
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-amber-100">
                {money(paymentAmount)}
              </div>
              <div className="mt-1 text-xs font-black text-amber-200">Pay now →</div>
            </div>
          </div>
        </button>
      ) : null}

      {nextScheduled ? (
        <button
          type="button"
          onClick={() => onOpenTicket(nextScheduled.id)}
          className="w-full rounded-[2rem] border border-violet-400/20 bg-violet-400/10 p-5 text-left"
        >
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-200">
            Next scheduled
          </div>
          <div className="mt-2 text-lg font-black text-white">
            {titleFor(nextScheduled)}
          </div>
          <div className="mt-1 text-sm text-slate-300">{whenFor(nextScheduled)}</div>
        </button>
      ) : null}

      <div className="rounded-[2rem] border border-slate-800 bg-slate-950/75 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-black text-white">Active requests</div>
            <div className="mt-1 text-xs text-slate-400">
              Your most important service activity.
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenRequests}
            className="rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-xs font-black text-cyan-200"
          >
            View all
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="rounded-3xl border border-slate-800 p-4 text-sm text-slate-400">
              Loading requests…
            </div>
          ) : active.length ? (
            active.map((ticket) => (
              <RequestCard key={ticket.id} ticket={ticket} onOpen={onOpenTicket} />
            ))
          ) : (
            <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5 text-center">
              <div className="text-2xl">✓</div>
              <div className="mt-2 font-black text-white">Nothing active</div>
              <div className="mt-1 text-xs text-slate-400">
                Start a request whenever you need help.
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pb-2">
        <Action icon="$" label="Money" hint="Bills and budgeting" onClick={onOpenMoney} />
        <Action icon="♥" label="Health" hint="Fitness and goals" onClick={onOpenHealth} />
        <Action icon="★" label="Saved" hint="Favorite providers" onClick={onOpenMore} />
        <Action
          icon="•••"
          label="More"
          hint="Deals, support, settings"
          onClick={onOpenMore}
        />
      </div>
    </section>
  );
}
