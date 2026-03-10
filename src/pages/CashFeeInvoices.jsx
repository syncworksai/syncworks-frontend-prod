// src/pages/CashFeeInvoices.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/client";
import ModeBar from "../components/ModeBar";
import { useAuth } from "../auth/AuthContext";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function Pill({ tone = "slate", children }) {
  const cls =
    tone === "rose"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
      : tone === "amber"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
      : tone === "emerald"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : tone === "cyan"
      ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
      : "border-slate-800 bg-slate-950/50 text-slate-200";

  return <span className={cx("inline-flex items-center rounded-full border px-2 py-1 text-[11px]", cls)}>{children}</span>;
}

function fmtMoneyCents(cents, currency = "USD") {
  const n = Number(cents || 0) / 100.0;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: String(currency || "USD").toUpperCase() }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString();
}

function fmtShortDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString();
}

export default function CashFeeInvoices() {
  const { activeBusinessId } = useAuth();
  const [billing, setBilling] = useState(null);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [items, setItems] = useState([]);

  const bizId = useMemo(() => String(activeBusinessId || "").trim(), [activeBusinessId]);

  const loadBilling = useCallback(async () => {
    try {
      const res = await api.get("/billing/status/");
      setBilling(res.data || null);
    } catch {
      setBilling(null);
    }
  }, []);

  const loadInvoices = useCallback(async () => {
    setErr("");
    setLoading(true);
    try {
      const q = bizId ? `?business_id=${encodeURIComponent(bizId)}` : "";
      const res = await api.get(`/cash-fee-invoices/${q}`);
      const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
      setItems(list);
    } catch (e) {
      setItems([]);
      setErr(e?.response?.data?.detail || "Failed to load cash fee invoices.");
    } finally {
      setLoading(false);
    }
  }, [bizId]);

  async function openSetupCard() {
    setErr("");
    try {
      // backend may support GET or POST — attempt POST first then fallback to GET
      let res = null;
      try {
        res = await api.post("/billing/setup-card/", {});
      } catch {
        res = await api.get("/billing/setup-card/");
      }
      const url = res?.data?.url || res?.data?.checkout_url || res?.data?.checkoutUrl;
      if (url) {
        window.location.href = url;
        return;
      }
      setErr("No Stripe checkout URL returned from /billing/setup-card/.");
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to open card setup.");
    }
  }

  useEffect(() => {
    loadBilling();
    loadInvoices();
  }, [loadBilling, loadInvoices]);

  const locked = !!billing?.is_locked;
  const lockReason = billing?.lock_reason || "LOCKED";

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar title="Cash Fee Invoices" subtitle="Read-only access (works even while locked)" />

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {/* Banner */}
        {locked ? (
          <div className="rounded-3xl border border-rose-500/35 bg-rose-500/10 p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="text-base font-extrabold text-rose-100">Account Locked</div>
                <div className="text-xs text-rose-200/90 mt-1">
                  Reason: <b className="font-mono">{lockReason}</b>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={openSetupCard}
                  className="rounded-2xl px-4 py-2 text-sm font-semibold border border-cyan-500/35 bg-cyan-500/12 hover:bg-cyan-500/18 text-cyan-200"
                >
                  Add/Update Card
                </button>
                <button
                  type="button"
                  onClick={loadInvoices}
                  className="rounded-2xl px-4 py-2 text-sm border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {err ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">{err}</div>
        ) : null}

        <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="text-sm font-semibold">Invoices</div>
              <div className="text-xs text-slate-400 mt-1">
                Business ID: <span className="font-mono text-slate-200">{bizId || "—"}</span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={loadInvoices}
                disabled={loading}
                className={cx(
                  "rounded-2xl px-4 py-2 text-sm border transition",
                  "border-slate-800 bg-slate-950/60 hover:bg-slate-900/40",
                  loading ? "opacity-60 cursor-wait" : ""
                )}
              >
                {loading ? "Loading…" : "Refresh"}
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400">
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Amount</th>
                  <th className="py-2 pr-3">Period</th>
                  <th className="py-2 pr-3">Due</th>
                  <th className="py-2 pr-3">Memo</th>
                  <th className="py-2 pr-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {!loading && (!items || items.length === 0) ? (
                  <tr>
                    <td className="py-4 text-slate-300" colSpan={6}>
                      No cash fee invoices found.
                    </td>
                  </tr>
                ) : null}

                {(items || []).map((inv) => {
                  const status = String(inv?.status || "").toUpperCase() || "—";
                  const tone =
                    status === "OVERDUE" ? "rose" : status === "OPEN" ? "amber" : status === "PAID" ? "emerald" : "slate";

                  const amount = fmtMoneyCents(inv?.amount_cents, inv?.currency || "USD");
                  const period = `${fmtShortDate(inv?.period_start)} → ${fmtShortDate(inv?.period_end)}`;
                  const due = fmtShortDate(inv?.due_date);
                  const memo = inv?.memo || inv?.note || inv?.description || "—";
                  const created = fmtDate(inv?.created_at);

                  return (
                    <tr key={inv?.id} className="border-t border-slate-800/70">
                      <td className="py-3 pr-3">
                        <Pill tone={tone}>{status}</Pill>
                      </td>
                      <td className="py-3 pr-3 font-semibold text-slate-100">{amount}</td>
                      <td className="py-3 pr-3 text-slate-200">{period}</td>
                      <td className="py-3 pr-3 text-slate-200">{due}</td>
                      <td className="py-3 pr-3 text-slate-300 max-w-[380px]">
                        <div className="truncate" title={String(memo)}>
                          {String(memo)}
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-slate-400">{created}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-xs text-slate-500">
            Note: This view is intentionally read-only and should remain accessible during billing lock.
          </div>
        </div>
      </div>
    </div>
  );
}