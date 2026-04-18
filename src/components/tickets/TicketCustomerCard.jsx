import React from "react";

function safePhoneHref(v) {
  const raw = String(v || "").trim();
  if (!raw) return "";
  const digits = raw.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : "";
}

function safeMailHref(v) {
  const raw = String(v || "").trim();
  if (!raw) return "";
  return `mailto:${raw}`;
}

function Info({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold break-words">{value || "—"}</div>
    </div>
  );
}

export default function TicketCustomerCard({
  customerName,
  customerEmail,
  customerPhone,
  serviceAddress,
  detailSummary,
  onOpenMessages,
}) {
  const phoneHref = safePhoneHref(customerPhone);
  const emailHref = safeMailHref(customerEmail);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-lg font-extrabold">Customer</div>
          <div className="text-xs text-slate-400 mt-1">
            Core customer and service location info.
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {phoneHref ? (
            <a
              href={phoneHref}
              className="inline-flex items-center justify-center h-10 text-xs rounded-2xl px-4 border transition bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-200"
            >
              Call
            </a>
          ) : null}

          {emailHref ? (
            <a
              href={emailHref}
              className="inline-flex items-center justify-center h-10 text-xs rounded-2xl px-4 border transition bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-200"
            >
              Email
            </a>
          ) : null}

          <button
            type="button"
            onClick={onOpenMessages}
            className="inline-flex items-center justify-center h-10 text-xs rounded-2xl px-4 border transition bg-cyan-500/20 border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-200"
          >
            Open Messages
          </button>
        </div>
      </div>

      <div className="mt-4 grid md:grid-cols-2 gap-3">
        <Info label="Customer Name" value={customerName || "—"} />
        <Info label="Phone" value={customerPhone || "—"} />
        <Info label="Email" value={customerEmail || "—"} />
        <Info label="Service Address" value={serviceAddress || "—"} />
      </div>

      {detailSummary ? (
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
          <div className="text-[11px] text-slate-400">Issue Details</div>
          <div className="mt-1 text-sm text-slate-200 whitespace-pre-wrap">{detailSummary}</div>
        </div>
      ) : null}
    </div>
  );
}