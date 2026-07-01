// src/components/tickets/CustomerInvoicePanel.jsx
import React, { useMemo, useState } from "react";
import api from "../../api/client";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}

function upper(value) {
  return String(value || "").toUpperCase();
}

function statusMeta(status) {
  const value = upper(status);

  if (value === "PAID") {
    return {
      label: "Paid",
      eyebrow: "Payment complete",
      headline: "You’re all set",
      detail: "This invoice has been paid and no balance remains.",
      tone: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
      accent: "from-emerald-500/20 via-slate-950/30 to-cyan-500/10",
      icon: "✓",
    };
  }

  if (value === "VOID" || value === "CANCELLED") {
    return {
      label: "Void",
      eyebrow: "No payment required",
      headline: "Invoice cancelled",
      detail: "This invoice is no longer active.",
      tone: "border-rose-400/25 bg-rose-400/10 text-rose-100",
      accent: "from-rose-500/15 via-slate-950/30 to-slate-950",
      icon: "×",
    };
  }

  if (value === "OVERDUE") {
    return {
      label: "Overdue",
      eyebrow: "Payment needed",
      headline: "Invoice is past due",
      detail: "Review the balance and complete payment securely.",
      tone: "border-rose-400/25 bg-rose-400/10 text-rose-100",
      accent: "from-rose-500/15 via-slate-950/30 to-amber-500/10",
      icon: "!",
    };
  }

  return {
    label: value === "SENT" ? "Ready to pay" : value || "Open",
    eyebrow: "Secure checkout",
    headline: "Invoice ready",
    detail: "Review the service charges, then continue to secure payment.",
    tone: "border-cyan-400/25 bg-cyan-400/10 text-cyan-100",
    accent: "from-cyan-500/20 via-slate-950/30 to-violet-500/10",
    icon: "$",
  };
}

function safeDate(value, includeTime = false) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString(
      undefined,
      includeTime
        ? {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }
        : {
            month: "short",
            day: "numeric",
            year: "numeric",
          }
    );
  } catch {
    return "";
  }
}

function normalizeItems(invoice) {
  const source =
    invoice?.line_items ||
    invoice?.items ||
    invoice?.invoice_items ||
    invoice?.lines ||
    [];

  if (!Array.isArray(source)) return [];

  return source.map((item, index) => {
    const quantity = Number(item?.quantity ?? item?.qty ?? 1) || 1;
    const unit = Number(
      item?.unit_price ??
        item?.price ??
        item?.rate ??
        item?.amount ??
        item?.total ??
        0
    );
    const total = Number(
      item?.line_total ??
        item?.total ??
        item?.amount ??
        unit * quantity
    );

    return {
      id: item?.id || `line-${index}`,
      name:
        item?.description ||
        item?.name ||
        item?.title ||
        item?.label ||
        `Service item ${index + 1}`,
      quantity,
      unit,
      total,
    };
  });
}

function SummaryRow({ label, value, strong = false, accent = false }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className={cx("text-sm", strong ? "font-black text-white" : "text-slate-400")}>
        {label}
      </div>
      <div
        className={cx(
          "shrink-0 text-right",
          accent
            ? "text-xl font-black text-cyan-100"
            : strong
            ? "text-base font-black text-white"
            : "text-sm font-bold text-slate-200"
        )}
      >
        {value}
      </div>
    </div>
  );
}

export default function CustomerInvoicePanel({ ticketId, invoice, onAfterPay }) {
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState("");

  const inv = invoice || null;
  const subtotal = Number(inv?.subtotal ?? inv?.subtotal_amount ?? 0);
  const tax = Number(inv?.tax ?? inv?.tax_amount ?? 0);
  const total = Number(
    inv?.total ??
      inv?.amount_due ??
      inv?.balance_due ??
      inv?.amount ??
      0
  );
  const status = upper(inv?.status);
  const meta = statusMeta(status);
  const canPay = Boolean(inv?.id) && !["PAID", "VOID", "CANCELLED"].includes(status);
  const items = useMemo(() => normalizeItems(inv), [inv]);

  async function startCheckout() {
    if (!inv?.id || busy) return;

    setErr("");
    setBusy(true);

    try {
      const response = await api.post(`/billing/invoices/${inv.id}/checkout/`);
      const data = response?.data || {};
      const url = data?.checkout_url || data?.url || "";

      if (!url) {
        throw new Error(
          data?.detail ||
            "Checkout URL was not returned. Expected checkout_url or url."
        );
      }

      window.location.assign(url);
    } catch (error) {
      setErr(
        error?.response?.data?.detail ||
          error?.message ||
          "Could not start payment checkout."
      );
      setBusy(false);
    }
  }

  async function refreshInvoice() {
    if (typeof onAfterPay !== "function" || refreshing) return;

    setRefreshing(true);
    setErr("");

    try {
      await onAfterPay();
    } catch (error) {
      setErr(error?.message || "Could not refresh the invoice.");
    } finally {
      setRefreshing(false);
    }
  }

  if (!inv) {
    return (
      <div className="rounded-[2rem] border border-slate-800 bg-slate-950/60 p-5 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-3xl border border-slate-700 bg-slate-900 text-2xl">
          $
        </div>
        <div className="mt-4 text-lg font-black text-white">No invoice yet</div>
        <div className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
          Once the business finishes the work and sends an invoice, the balance and secure payment button will appear here.
        </div>
        <button
          type="button"
          onClick={refreshInvoice}
          disabled={refreshing}
          className="mt-4 min-h-11 rounded-2xl border border-slate-700 bg-slate-950 px-4 text-xs font-black text-slate-200 disabled:opacity-50"
        >
          {refreshing ? "Checking…" : "Check for invoice"}
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950/65">
      <section className={cx("border-b border-slate-800 bg-gradient-to-br p-5 sm:p-6", meta.accent)}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">
              {meta.eyebrow}
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
              {meta.headline}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
              {meta.detail}
            </p>
          </div>

          <div
            className={cx(
              "grid h-12 w-12 shrink-0 place-items-center rounded-2xl border text-xl font-black",
              meta.tone
            )}
          >
            {meta.icon}
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-white/10 bg-slate-950/55 p-4 backdrop-blur">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                {status === "PAID" ? "Amount paid" : "Total due"}
              </div>
              <div className="mt-1 text-4xl font-black tracking-tight text-white">
                {money(total)}
              </div>
            </div>

            <span className={cx("rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider", meta.tone)}>
              {meta.label}
            </span>
          </div>

          {inv?.due_date && status !== "PAID" ? (
            <div className="mt-3 text-xs text-slate-400">
              Due <span className="font-bold text-slate-200">{safeDate(inv.due_date)}</span>
            </div>
          ) : null}

          {status === "PAID" && inv?.paid_at ? (
            <div className="mt-3 text-xs text-emerald-200">
              Paid {safeDate(inv.paid_at, true)}
            </div>
          ) : null}
        </div>
      </section>

      <div className="space-y-4 p-4 sm:p-5">
        {err ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            {err}
          </div>
        ) : null}

        <section className="rounded-3xl border border-slate-800 bg-[#020617] p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-black text-white">
                {inv?.title || "Service invoice"}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Invoice #{inv?.number || inv?.invoice_number || inv?.id}
                {ticketId ? ` · Request #${ticketId}` : ""}
              </div>
            </div>

            {inv?.created_at ? (
              <div className="shrink-0 text-right text-[10px] text-slate-500">
                Issued
                <div className="mt-1 font-bold text-slate-300">
                  {safeDate(inv.created_at)}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {items.length ? (
          <section className="rounded-3xl border border-slate-800 bg-[#020617] p-4">
            <div className="text-sm font-black text-white">Service charges</div>
            <div className="mt-3 divide-y divide-slate-800">
              {items.map((item) => (
                <div key={item.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-200">{item.name}</div>
                      {item.quantity > 1 ? (
                        <div className="mt-1 text-[11px] text-slate-500">
                          {item.quantity} × {money(item.unit)}
                        </div>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-sm font-black text-white">
                      {money(item.total)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl border border-slate-800 bg-[#020617] p-4">
          <SummaryRow label="Subtotal" value={money(subtotal)} />
          <div className="border-t border-slate-800">
            <SummaryRow label="Tax" value={money(tax)} />
          </div>
          <div className="border-t border-slate-700">
            <SummaryRow
              label={status === "PAID" ? "Total paid" : "Total due"}
              value={money(total)}
              strong
              accent
            />
          </div>
        </section>

        {inv?.notes ? (
          <section className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              Provider note
            </div>
            <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
              {inv.notes}
            </div>
          </section>
        ) : null}

        {canPay ? (
          <section className="sticky bottom-0 rounded-3xl border border-cyan-300/25 bg-slate-950/95 p-3 shadow-[0_-14px_45px_rgba(2,6,23,0.9)] backdrop-blur-xl">
            <button
              type="button"
              onClick={startCheckout}
              disabled={busy}
              className="min-h-[56px] w-full rounded-2xl border border-cyan-200/30 bg-gradient-to-r from-cyan-500 to-blue-600 px-5 text-base font-black text-white shadow-[0_0_28px_rgba(34,211,238,0.22)] disabled:opacity-50"
            >
              {busy ? "Opening secure checkout…" : `Pay ${money(total)}`}
            </button>

            <div className="mt-2 flex items-center justify-center gap-2 text-[10px] text-slate-500">
              <span>🔒</span>
              <span>Secure payment powered through Stripe</span>
            </div>
          </section>
        ) : status === "PAID" ? (
          <section className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-center">
            <div className="text-lg font-black text-emerald-100">Payment complete</div>
            <div className="mt-1 text-xs leading-5 text-emerald-200/70">
              A record of this invoice remains attached to your service request.
            </div>
          </section>
        ) : null}

        <button
          type="button"
          onClick={refreshInvoice}
          disabled={busy || refreshing}
          className="min-h-11 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 text-xs font-black text-slate-300 disabled:opacity-50"
        >
          {refreshing ? "Refreshing…" : "Refresh payment status"}
        </button>
      </div>
    </div>
  );
}
