import React from "react";

function fmtPretty(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "—";
  }
}

function LifeRow({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold">{fmtPretty(value)}</div>
    </div>
  );
}

export default function TicketLifecycleCard({ ticket }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="text-lg font-extrabold">Lifecycle</div>
      <div className="text-xs text-slate-400 mt-1">
        Ticket timeline from creation through payment/closure.
      </div>

      <div className="mt-4 grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        <LifeRow label="Created" value={ticket?.created_at} />
        <LifeRow label="Assigned" value={ticket?.assigned_at} />
        <LifeRow label="Accepted" value={ticket?.accepted_at} />
        <LifeRow label="Scheduled" value={ticket?.scheduled_at} />
        <LifeRow label="En Route" value={ticket?.en_route_at} />
        <LifeRow label="On Site" value={ticket?.on_site_at} />
        <LifeRow label="Started" value={ticket?.started_at} />
        <LifeRow label="Awaiting Approval" value={ticket?.awaiting_approval_at} />
        <LifeRow label="Completed" value={ticket?.completed_at} />
        <LifeRow label="Invoiced" value={ticket?.invoiced_at} />
        <LifeRow label="Paid" value={ticket?.paid_at} />
        <LifeRow label="Cancelled / Closed" value={ticket?.cancelled_at || ticket?.closed_at} />
      </div>
    </div>
  );
}