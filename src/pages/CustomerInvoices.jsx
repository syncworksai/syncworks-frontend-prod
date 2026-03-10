// src/pages/CustomerInvoices.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import ModeBar from "../components/ModeBar";
import Button from "../components/ui/Button";

const STATUS_META = {
  DRAFT: { label: "Draft", cls: "border-slate-700 text-slate-300 bg-slate-950/40" },
  SENT: { label: "Sent", cls: "border-cyan-500/40 text-cyan-200 bg-cyan-500/10" },
  PAID: { label: "Paid", cls: "border-emerald-500/40 text-emerald-200 bg-emerald-500/10" },
  VOID: { label: "Void", cls: "border-slate-700 text-slate-300 bg-slate-950/40" },
  CANCELLED: { label: "Cancelled", cls: "border-slate-700 text-slate-300 bg-slate-950/40" },
  FAILED: { label: "Failed", cls: "border-red-500/40 text-red-200 bg-red-500/10" },
};

function money(n, currency = "USD") {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `$${num.toFixed(2)}`;
  }
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleString();
}

function Pill({ status }) {
  const meta = STATUS_META[status] || { label: status || "—", cls: "border-slate-700 text-slate-300 bg-slate-950/40" };
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full border text-[11px] ${meta.cls}`}>
      {meta.label}
    </span>
  );
}

function Card({ title, right, children }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="font-semibold">{title}</div>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

export default function CustomerInvoices() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");

  const [items, setItems] = useState([]);
  const [payingId, setPayingId] = useState(null);

  // === API assumptions ===
  // We try a couple common invoice list endpoints without breaking the page.
  // If your backend uses a different route, you’ll tell me the correct one and we’ll adjust once.
  async function load() {
    setLoading(true);
    setErr("");
    setOk("");

    const candidates = [
      "/invoices/",
      "/billing/invoices/",
      "/customer/invoices/",
    ];

    let lastError = null;

    for (const path of candidates) {
      try {
        const r = await api.get(path);
        const data = r.data;

        // DRF pagination: { results: [...] }
        const list = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
        setItems(list);
        setLoading(false);
        return;
      } catch (e) {
        lastError = e;
        // try next candidate
      }
    }

    setItems([]);
    setErr(
      lastError?.response?.data?.detail ||
        lastError?.message ||
        "Failed to load invoices (unknown endpoint)."
    );
    setLoading(false);
  }

  // Create Stripe Checkout Session for this invoice and redirect user to hosted checkout.
  // Common patterns: POST /invoices/:id/checkout/ OR /invoices/:id/pay/ OR /billing/invoices/:id/checkout/
  async function payInvoice(invoice) {
    const id = invoice?.id;
    if (!id) return;

    setPayingId(id);
    setErr("");
    setOk("");

    const candidates = [
      `/invoices/${id}/checkout/`,
      `/invoices/${id}/pay/`,
      `/billing/invoices/${id}/checkout/`,
      `/billing/invoices/${id}/pay/`,
    ];

    let lastError = null;

    for (const path of candidates) {
      try {
        const r = await api.post(path);
        const url = r.data?.url || r.data?.checkout_url || r.data?.stripe_checkout_url;

        if (!url) {
          setErr("Payment started but no Stripe Checkout URL was returned by the API.");
          setPayingId(null);
          return;
        }

        window.location.href = url;
        return;
      } catch (e) {
        lastError = e;
        // try next candidate
      }
    }

    // Graceful messaging for Connect not ready yet
    const msg = lastError?.response?.data?.detail || lastError?.message || "Unable to start payment.";
    const connectPendingHints = [
      "charges_enabled",
      "payouts_enabled",
      "onboarding",
      "connect",
      "transfers",
      "not ready",
      "pending",
    ];
    const looksLikeConnectPending = connectPendingHints.some((k) => String(msg || "").toLowerCase().includes(k));

    setErr(
      looksLikeConnectPending
        ? "Business payout setup pending. Payments may be temporarily unavailable for this provider."
        : msg
    );
    setPayingId(null);
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (items || [])
      .filter((x) => {
        if (status !== "ALL" && String(x?.status || "").toUpperCase() !== status) return false;

        if (!needle) return true;

        const hay = [
          x?.id,
          x?.invoice_number,
          x?.business_name,
          x?.provider_name,
          x?.customer_name,
          x?.description,
          x?.title,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return hay.includes(needle);
      })
      .sort((a, b) => {
        const ad = new Date(a?.created_at || a?.updated_at || 0).getTime();
        const bd = new Date(b?.created_at || b?.updated_at || 0).getTime();
        return bd - ad;
      });
  }, [items, q, status]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar
        title="Invoices"
        subtitle="View and pay provider invoices securely"
        rightActions={
          <div className="flex gap-2">
            <Button tone="slate" onClick={load} disabled={loading}>
              Refresh
            </Button>
            <Button tone="slate" onClick={() => nav("/customer")}>
              Dashboard
            </Button>
          </div>
        }
      />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="flex-1 flex gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search invoices (business, number, note)…"
                className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2 text-sm"
              />

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-2xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
              >
                <option value="ALL">All</option>
                <option value="DRAFT">Draft</option>
                <option value="SENT">Sent</option>
                <option value="PAID">Paid</option>
              </select>
            </div>

            <div className="text-xs text-slate-400">
              Invoice-based payments only (no card stored on file).
            </div>
          </div>

          {err ? (
            <div className="mt-4 text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-2xl p-3">
              {err}
              <div className="text-[11px] text-red-200/80 mt-2">
                If this is an endpoint mismatch, send me your backend invoice routes (paths only) and we’ll lock it in.
              </div>
            </div>
          ) : null}

          {ok ? (
            <div className="mt-4 text-sm text-emerald-200 bg-emerald-900/15 border border-emerald-700/30 rounded-2xl p-3">
              {ok}
            </div>
          ) : null}
        </div>

        <Card
          title={`Your Invoices (${filtered.length})`}
          right={
            loading ? <span className="text-xs text-slate-400">Loading…</span> : null
          }
        >
          {loading ? (
            <div className="text-sm text-slate-400">Loading invoices…</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-slate-400">
              No invoices yet. When a provider completes work, you’ll see invoices here.
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((inv) => {
                const invStatus = String(inv?.status || "").toUpperCase();
                const amount =
                  inv?.amount_due ??
                  inv?.amount_total ??
                  inv?.total ??
                  inv?.amount ??
                  inv?.subtotal;

                const currency = inv?.currency || "USD";
                const canPay = invStatus === "SENT";

                return (
                  <div
                    key={inv.id || inv.invoice_number || Math.random()}
                    className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-[240px]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-semibold">
                            {inv?.invoice_number ? `Invoice #${inv.invoice_number}` : `Invoice ${inv?.id ?? ""}`}
                          </div>
                          <Pill status={invStatus} />
                        </div>

                        <div className="text-xs text-slate-400 mt-1">
                          {inv?.business_name ? (
                            <>
                              From <span className="text-slate-200">{inv.business_name}</span>
                            </>
                          ) : inv?.business ? (
                            <>
                              From <span className="text-slate-200">{inv.business}</span>
                            </>
                          ) : (
                            "From provider"
                          )}
                          <span className="mx-2 text-slate-600">•</span>
                          Created {fmtDate(inv?.created_at)}
                        </div>

                        {inv?.description || inv?.note || inv?.memo ? (
                          <div className="text-sm text-slate-200 mt-2">
                            {inv?.description || inv?.note || inv?.memo}
                          </div>
                        ) : null}
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-slate-400">Amount</div>
                        <div className="text-lg font-semibold">{money(amount, currency)}</div>

                        <div className="mt-3 flex gap-2 justify-end flex-wrap">
                          {/* If you already have an invoice detail page later, wire it here. */}
                          {inv?.id ? (
                            <Link
                              to={`/customer/invoices/${inv.id}`}
                              className="inline-flex items-center justify-center h-9 text-xs rounded-xl px-4 border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40 text-slate-200"
                            >
                              View
                            </Link>
                          ) : null}

                          <Button
                            tone="cyan"
                            onClick={() => payInvoice(inv)}
                            disabled={!canPay || payingId === inv?.id}
                            title={!canPay ? "Only SENT invoices can be paid." : "Pay now"}
                          >
                            {payingId === inv?.id ? "Opening…" : "Pay"}
                          </Button>
                        </div>

                        {!canPay ? (
                          <div className="mt-2 text-[11px] text-slate-500">
                            {invStatus === "PAID" ? "Paid ✅" : invStatus === "DRAFT" ? "Waiting to be sent" : ""}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
