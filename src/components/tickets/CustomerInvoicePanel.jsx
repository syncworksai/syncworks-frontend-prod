// src/components/tickets/CustomerInvoicePanel.jsx
import React, { useMemo, useState } from "react";
import api from "../../api/client";

function cx(...p) {
  return p.filter(Boolean).join(" ");
}

function Money({ n }) {
  const v = Number(n || 0);
  return <span>${v.toFixed(2)}</span>;
}

function statusTone(status) {
  const s = String(status || "").toUpperCase();
  if (s === "PAID") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  if (s === "VOID") return "border-rose-500/30 bg-rose-500/10 text-rose-200";
  if (s === "SENT") return "border-cyan-500/30 bg-cyan-500/10 text-cyan-200";
  return "border-amber-500/30 bg-amber-500/10 text-amber-200";
}

function Btn({ tone = "slate", className = "", ...props }) {
  const tones = {
    slate: "bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-200",
    cyan: "bg-cyan-500/20 border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-200",
    emerald: "bg-emerald-500/15 border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-200",
    rose: "bg-rose-500/15 border-rose-500/30 hover:bg-rose-500/20 text-rose-200",
    amber: "bg-amber-500/15 border-amber-500/30 hover:bg-amber-500/20 text-amber-200",
  };
  return (
    <button
      className={cx(
        "h-10 px-4 rounded-2xl border text-xs font-semibold transition whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed",
        tones[tone] || tones.slate,
        className
      )}
      {...props}
    />
  );
}

function Row({ k, v }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
      <div className="text-[11px] text-slate-400">{k}</div>
      <div className="text-sm font-semibold mt-1 break-words">{v}</div>
    </div>
  );
}

function safeDateLabel(v) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return "—";
  }
}

export default function CustomerInvoicePanel({ ticketId, invoice, onAfterPay }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const inv = invoice || null;

  const subtotal = useMemo(() => Number(inv?.subtotal || 0), [inv]);
  const tax = useMemo(() => Number(inv?.tax || 0), [inv]);
  const total = useMemo(() => Number(inv?.total || 0), [inv]);

  const status = String(inv?.status || "").toUpperCase();
  const canPay = !!inv?.id && status !== "PAID" && status !== "VOID";

  async function startCheckout() {
    if (!inv?.id) return;

    setErr("");
    setBusy(true);

    try {
      const res = await api.post(`/billing/invoices/${inv.id}/checkout/`);
      const data = res?.data || {};
      const url = data?.checkout_url || data?.url || "";

      console.log("Invoice checkout response:", data);

      if (!url) {
        throw new Error(
          data?.detail ||
            "Checkout URL was not returned. Expected `checkout_url` or `url` in the response."
        );
      }

      window.location.assign(url);
    } catch (e) {
      setErr(
        e?.response?.data?.detail ||
          e?.message ||
          "Could not start payment checkout."
      );
      setBusy(false);
    }
  }

  if (!inv) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
        <div className="font-semibold text-slate-100">Invoice</div>
        <div className="text-sm text-slate-400 mt-2">
          No invoice has been sent yet. Once the business creates and sends one, payment will show here.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-slate-100">Invoice</div>
          <div className="text-xs text-slate-400 mt-1">
            Customer payment view only.
          </div>
        </div>

        <span className={cx("text-[11px] px-2 py-1 rounded-full border font-semibold", statusTone(inv?.status))}>
          {status || "OPEN"}
        </span>
      </div>

      {err ? (
        <div className="mt-3 text-sm text-rose-200 bg-rose-900/10 border border-rose-800 rounded-xl p-3">
          {err}
        </div>
      ) : null}

      <div className="mt-4 grid md:grid-cols-2 gap-3">
        <Row k="Invoice ID" v={inv?.id || "—"} />
        <Row k="Ticket" v={ticketId || "—"} />
        <Row k="Title" v={inv?.title || "Service Invoice"} />
        <Row k="Due Date" v={inv?.due_date || "—"} />
        <Row k="Created" v={safeDateLabel(inv?.created_at)} />
        <Row k="Paid" v={safeDateLabel(inv?.paid_at)} />
      </div>

      {inv?.notes ? (
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
          <div className="text-[11px] text-slate-400">Notes</div>
          <div className="text-sm text-slate-200 mt-1 whitespace-pre-wrap">{inv.notes}</div>
        </div>
      ) : null}

      <div className="mt-4 grid md:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
          <div className="text-[11px] text-slate-400">Subtotal</div>
          <div className="text-base font-extrabold text-slate-100 mt-1">
            <Money n={subtotal} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
          <div className="text-[11px] text-slate-400">Tax</div>
          <div className="text-base font-extrabold text-slate-100 mt-1">
            <Money n={tax} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
          <div className="text-[11px] text-slate-400">Total Due</div>
          <div className="text-lg font-extrabold text-cyan-200 mt-1">
            <Money n={total} />
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <Btn tone="cyan" onClick={startCheckout} disabled={!canPay || busy} type="button">
          {busy ? "Redirecting…" : canPay ? "Pay Invoice" : "Paid"}
        </Btn>

        <Btn
          tone="slate"
          onClick={() => {
            if (typeof onAfterPay === "function") onAfterPay();
          }}
          disabled={busy}
          type="button"
        >
          Refresh
        </Btn>

        <div className="ml-auto text-xs text-slate-500">
          SyncWorks payment flow sends platform fee + business payout through Stripe.
        </div>
      </div>
    </div>
  );
}