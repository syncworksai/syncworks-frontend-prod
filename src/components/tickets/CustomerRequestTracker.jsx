import React, { useMemo } from "react";

const upper = (value) => String(value || "NEW").toUpperCase();

const STAGES = [
  { key: "REQUESTED", label: "Request received", description: "Your request is in SyncWorks.", fields: ["created_at"] },
  { key: "ASSIGNED", label: "Provider assigned", description: "A business or technician has been connected.", fields: ["assigned_at", "accepted_at"] },
  { key: "SCHEDULED", label: "Service scheduled", description: "Your appointment time has been set.", fields: ["scheduled_at", "scheduled_start"] },
  { key: "EN_ROUTE", label: "Provider en route", description: "Your provider is traveling to the service location.", fields: ["en_route_at"] },
  { key: "ON_SITE", label: "Provider arrived", description: "Your provider has reached the service location.", fields: ["on_site_at"] },
  { key: "IN_PROGRESS", label: "Work in progress", description: "The service is actively being completed.", fields: ["started_at"] },
  { key: "COMPLETED", label: "Service completed", description: "The provider marked the work complete.", fields: ["completed_at"] },
  { key: "INVOICED", label: "Invoice ready", description: "Review the final amount and payment options.", fields: ["invoiced_at"] },
  { key: "PAID", label: "Payment complete", description: "This request is paid and complete.", fields: ["paid_at", "closed_at"] },
];

const STATUS_INDEX = {
  NEW: 0,
  ASSIGNED: 1,
  ACCEPTED: 1,
  SCHEDULED: 2,
  EN_ROUTE: 3,
  ON_SITE: 4,
  IN_PROGRESS: 5,
  COMPLETED: 6,
  INVOICED: 7,
  SENT: 7,
  READY_FOR_PAYMENT: 7,
  PAID: 8,
  CLOSED: 8,
};

function formatTime(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function firstTime(ticket, fields) {
  for (const field of fields) {
    if (ticket?.[field]) return ticket[field];
  }
  return "";
}

function providerName(ticket) {
  return (
    ticket?.assigned_business_name ||
    ticket?.assigned_business_card?.name ||
    ticket?.business_name ||
    ticket?.business?.name ||
    ticket?.assigned_business?.name ||
    ""
  );
}

function invoiceAmount(ticket) {
  const invoice = ticket?.latest_invoice || ticket?.invoice || null;
  if (!invoice) return 0;
  if (invoice.total != null && invoice.total !== "") return Number(invoice.total || 0);
  if (invoice.amount != null && invoice.amount !== "") return Number(invoice.amount || 0);
  if (invoice.amount_cents != null && invoice.amount_cents !== "") {
    return Number(invoice.amount_cents || 0) / 100;
  }
  return 0;
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}

function StageRow({ stage, state, time, isLast }) {
  const complete = state === "complete";
  const current = state === "current";

  return (
    <div className="relative flex gap-3">
      <div className="flex w-8 shrink-0 flex-col items-center">
        <div
          className={[
            "grid h-8 w-8 place-items-center rounded-full border text-sm font-black",
            complete
              ? "border-emerald-300/40 bg-emerald-400/15 text-emerald-200"
              : current
              ? "border-cyan-300/50 bg-cyan-400/15 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.25)]"
              : "border-slate-700 bg-slate-950 text-slate-600",
          ].join(" ")}
        >
          {complete ? "✓" : current ? "•" : ""}
        </div>
        {!isLast ? (
          <div className={["min-h-10 w-px flex-1", complete ? "bg-emerald-400/35" : "bg-slate-800"].join(" ")} />
        ) : null}
      </div>

      <div
        className={[
          "mb-3 min-w-0 flex-1 rounded-2xl border p-3",
          current
            ? "border-cyan-400/25 bg-cyan-400/10"
            : complete
            ? "border-emerald-400/15 bg-emerald-400/[0.06]"
            : "border-slate-800 bg-slate-950/40",
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className={["text-sm font-black", current ? "text-cyan-100" : complete ? "text-slate-200" : "text-slate-500"].join(" ")}>
              {stage.label}
            </div>
            <div className={["mt-1 text-xs leading-5", current || complete ? "text-slate-400" : "text-slate-600"].join(" ")}>
              {stage.description}
            </div>
          </div>
          {current ? (
            <span className="shrink-0 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-200">
              Current
            </span>
          ) : null}
        </div>
        {time ? <div className="mt-2 text-[11px] text-slate-500">{formatTime(time)}</div> : null}
      </div>
    </div>
  );
}

export default function CustomerRequestTracker({
  ticket,
  onOpenMessages,
  onOpenFiles,
  onOpenInvoice,
}) {
  const status = upper(ticket?.status);
  const cancelled = ["CANCELLED", "VOID"].includes(status);
  const currentIndex = STATUS_INDEX[status] ?? 0;
  const provider = providerName(ticket);
  const amount = invoiceAmount(ticket);

  const stages = useMemo(
    () =>
      STAGES.map((stage, index) => {
        const time = firstTime(ticket, stage.fields);
        let state = "upcoming";

        if (cancelled) {
          state = index < currentIndex ? "complete" : "upcoming";
        } else if (index < currentIndex) {
          state = "complete";
        } else if (index === currentIndex) {
          state = "current";
        }

        if (time && index <= currentIndex) {
          state = index === currentIndex ? "current" : "complete";
        }

        return { ...stage, time, state };
      }),
    [ticket, currentIndex, cancelled]
  );

  const currentStage = stages.find((stage) => stage.state === "current") || stages[0];

  return (
    <div className="rounded-[2rem] border border-cyan-400/20 bg-slate-950/75 p-4 shadow-[0_0_50px_rgba(34,211,238,0.08)] lg:hidden">
      <div className="rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/12 via-slate-950/40 to-violet-500/10 p-4">
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">
          Live service tracking
        </div>
        <div className="mt-2 text-2xl font-black text-white">
          {cancelled ? "Request cancelled" : currentStage.label}
        </div>
        <div className="mt-2 text-sm leading-6 text-slate-400">
          {cancelled ? "This service request is no longer active." : currentStage.description}
        </div>

        {provider ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              Provider
            </div>
            <div className="mt-1 text-sm font-black text-white">{provider}</div>
          </div>
        ) : null}

        {status === "EN_ROUTE" ? (
          <div className="mt-3 rounded-2xl border border-violet-400/25 bg-violet-400/10 p-3 text-sm font-bold text-violet-100">
            Your provider is on the way.
          </div>
        ) : null}

        {["INVOICED", "SENT", "READY_FOR_PAYMENT"].includes(status) ? (
          <button
            type="button"
            onClick={onOpenInvoice}
            className="mt-3 flex w-full items-center justify-between rounded-2xl border border-amber-400/25 bg-amber-400/10 p-3 text-left"
          >
            <span>
              <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-amber-200">
                Payment ready
              </span>
              <span className="mt-1 block text-sm font-black text-white">Review final invoice</span>
            </span>
            <span className="text-lg font-black text-amber-100">
              {amount ? money(amount) : "Open →"}
            </span>
          </button>
        ) : null}
      </div>

      <div className="mt-4">
        {stages.map((stage, index) => (
          <StageRow
            key={stage.key}
            stage={stage}
            state={stage.state}
            time={stage.time}
            isLast={index === stages.length - 1}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 pt-1">
        <button
          type="button"
          onClick={onOpenMessages}
          className="min-h-12 rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/10 px-2 text-xs font-black text-fuchsia-100"
        >
          Messages
        </button>
        <button
          type="button"
          onClick={onOpenFiles}
          className="min-h-12 rounded-2xl border border-slate-700 bg-slate-950 px-2 text-xs font-black text-slate-200"
        >
          Photos
        </button>
        <button
          type="button"
          onClick={onOpenInvoice}
          className="min-h-12 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-2 text-xs font-black text-amber-100"
        >
          Invoice
        </button>
      </div>
    </div>
  );
}
