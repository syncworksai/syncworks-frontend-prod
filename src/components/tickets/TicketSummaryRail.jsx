// src/components/tickets/TicketSummaryRail.jsx
import React from "react";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

const STATUS_LABELS = {
  NEW: "New",
  ASSIGNED: "Assigned",
  ACCEPTED: "Accepted",
  SCHEDULED: "Scheduled",
  EN_ROUTE: "En Route",
  ON_SITE: "On Site",
  IN_PROGRESS: "In Progress",
  AWAITING_APPROVAL: "Awaiting Approval",
  COMPLETED: "Completed",
  INVOICED: "Invoiced",
  PAID: "Paid",
  CANCELLED: "Cancelled",
};

function statusLabel(s) {
  return STATUS_LABELS[String(s || "").toUpperCase()] || s || "—";
}

function safeDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "—";
  }
}

function statusTone(status) {
  const s = String(status || "").toUpperCase();
  if (s === "PAID" || s === "COMPLETED") return "emerald";
  if (s === "CANCELLED") return "rose";
  if (s === "IN_PROGRESS" || s === "EN_ROUTE" || s === "ON_SITE") return "cyan";
  if (s === "INVOICED" || s === "AWAITING_APPROVAL") return "amber";
  return "slate";
}

function pillTone(tone) {
  if (tone === "emerald") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  if (tone === "rose") return "border-rose-500/30 bg-rose-500/10 text-rose-200";
  if (tone === "amber") return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  if (tone === "cyan") return "border-cyan-500/30 bg-cyan-500/10 text-cyan-200";
  return "border-slate-700 bg-slate-900/40 text-slate-200";
}

function Row({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="text-sm font-semibold mt-1 break-words">{value || "—"}</div>
    </div>
  );
}

function getCustomerName(ticket) {
  const t = ticket || {};
  return (
    t.customer_name ||
    t.customer_full_name ||
    t.customer?.name ||
    t.customer?.full_name ||
    t.requester_name ||
    t.created_by_name ||
    t.created_by?.name ||
    "Customer"
  );
}

function assignedBusinessName(ticket) {
  const t = ticket || {};
  return (
    t.assigned_business_name ||
    t.assigned_business_card?.name ||
    t.business_name ||
    t.business?.name ||
    t.assigned_business?.name ||
    ""
  );
}

export default function TicketSummaryRail({ ticket, isCustomer = false }) {
  const assignedName = assignedBusinessName(ticket);
  const customerName = getCustomerName(ticket);
  const status = ticket?.status || "NEW";

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-extrabold text-slate-100">Ticket Snapshot</div>
            <div className="text-xs text-slate-400 mt-1">Everything important at a glance.</div>
          </div>

          <span className={cx("text-[11px] px-2 py-1 rounded-full border font-semibold", pillTone(statusTone(status)))}>
            {statusLabel(status)}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Row label="Ticket #" value={ticket?.id || "—"} />
          <Row label="Customer" value={customerName} />
          <Row label="Category" value={ticket?.category_name || ticket?.category_path || "—"} />
          <Row label="ZIP" value={ticket?.service_zip || "—"} />
          <Row label="Marketplace" value={ticket?.is_marketplace ? "Yes" : "No"} />
          <Row label="Assigned" value={assignedName || "Not yet"} />
        </div>

        {ticket?.service_address ? (
          <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
            <div className="text-[11px] text-slate-400">Service Address</div>
            <div className="text-sm font-semibold mt-1 break-words">{ticket.service_address}</div>
          </div>
        ) : null}

        {ticket?.description ? (
          <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
            <div className="text-[11px] text-slate-400">Request Details</div>
            <div className="text-sm text-slate-200 mt-1 whitespace-pre-wrap break-words">
              {ticket.description}
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
        <div className="text-lg font-extrabold text-slate-100">Timeline</div>
        <div className="mt-4 space-y-2">
          <Row label="Created" value={safeDate(ticket?.created_at)} />
          <Row label="Completed" value={safeDate(ticket?.completed_at)} />
          <Row label="Invoiced" value={safeDate(ticket?.invoiced_at)} />
          <Row label="Paid" value={safeDate(ticket?.paid_at)} />
        </div>
      </div>

      {!isCustomer ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
          <div className="text-lg font-extrabold text-slate-100">Workspace Tips</div>
          <div className="mt-3 space-y-2 text-sm text-slate-300">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
              Keep all job communication in Messages.
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
              Use Work for status changes only.
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
              Quote first when needed, then mark invoice ready for payment.
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
          <div className="text-lg font-extrabold text-slate-100">Customer Tips</div>
          <div className="mt-3 space-y-2 text-sm text-slate-300">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
              Use Messages for updates, access details, and follow-ups.
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
              Use Files to upload photos, receipts, or documents.
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
              When the business sends an invoice, it will appear in the Invoice tab.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}