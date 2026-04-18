import React from "react";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function upperStatus(status) {
  return String(status || "").toUpperCase();
}

const STATUS_LABELS = {
  NEW: "New",
  ASSIGNED: "Assigned",
  ACCEPTED: "Accepted",
  SCHEDULED: "Scheduled",
  EN_ROUTE: "En Route",
  ON_SITE: "On Site",
  IN_PROGRESS: "In Progress",
  NEEDS_QUOTE: "Needs Quote",
  QUOTED: "Quoted",
  QUOTE_REJECTED: "Quote Rejected",
  APPROVED: "Approved",
  AWAITING_APPROVAL: "Awaiting Approval",
  COMPLETED: "Completed",
  INVOICED: "Invoiced",
  PAID: "Paid",
  CANCELLED: "Cancelled",
  CLOSED: "Closed",
};

function statusLabel(s) {
  return STATUS_LABELS[upperStatus(s)] || s || "—";
}

function statusTone(status) {
  const s = upperStatus(status);
  if (s === "PAID" || s === "COMPLETED") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  if (s === "CANCELLED") return "border-rose-500/30 bg-rose-500/10 text-rose-200";
  if (s === "IN_PROGRESS" || s === "EN_ROUTE" || s === "ON_SITE") return "border-cyan-500/30 bg-cyan-500/10 text-cyan-200";
  if (s === "INVOICED" || s === "AWAITING_APPROVAL") return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  return "border-slate-700 bg-slate-900/40 text-slate-200";
}

export default function TicketHeaderCard({
  ticketCode,
  customerName,
  serviceAddress,
  workType,
  status,
  isMarketplace,
  assignedName,
  detailSummary,
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5 overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.10),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.10),transparent_28%)]" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-lg font-extrabold tracking-tight">{ticketCode}</div>
              <span className={cx("text-[11px] px-2 py-1 rounded-full border font-semibold", statusTone(status))}>
                {statusLabel(status)}
              </span>
              <span
                className={cx(
                  "text-[11px] px-2 py-1 rounded-full border font-semibold",
                  isMarketplace
                    ? "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200"
                    : "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
                )}
              >
                {isMarketplace ? "Marketplace" : "Direct"}
              </span>
            </div>

            <div className="mt-3 text-2xl font-extrabold break-words">{customerName || "Customer"}</div>

            <div className="mt-2 text-sm text-slate-300 break-words">
              {serviceAddress || "No service address yet"}
              {workType ? <span className="text-slate-500"> • </span> : null}
              {workType ? <span className="text-cyan-200">{workType}</span> : null}
            </div>

            {detailSummary ? (
              <div className="mt-3 text-sm text-slate-400 max-w-3xl whitespace-pre-wrap break-words">
                {detailSummary}
              </div>
            ) : null}
          </div>

          <div className="shrink-0 rounded-2xl border border-slate-800 bg-slate-950/55 px-4 py-3">
            <div className="text-[11px] text-slate-500">Assigned Provider</div>
            <div className="mt-1 text-sm font-semibold text-slate-100">
              {assignedName || "Not assigned"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}