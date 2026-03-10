// src/components/pm/RentPanel.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import Button from "../ui/Button";

function Card({ title, subtitle, right, children }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-slate-100">{title}</div>
          {subtitle ? <div className="text-xs text-slate-400 mt-1">{subtitle}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Pill({ children, tone = "slate" }) {
  const cls =
    tone === "purple"
      ? "border-fuchsia-500/40 text-fuchsia-200 bg-fuchsia-500/10"
      : tone === "cyan"
      ? "border-cyan-500/40 text-cyan-200 bg-cyan-500/10"
      : tone === "emerald"
      ? "border-emerald-500/40 text-emerald-200 bg-emerald-500/10"
      : tone === "amber"
      ? "border-amber-500/40 text-amber-200 bg-amber-500/10"
      : tone === "rose"
      ? "border-rose-500/40 text-rose-200 bg-rose-500/10"
      : "border-slate-700 text-slate-300 bg-slate-950/40";

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full border text-[11px] ${cls}`}>
      {children}
    </span>
  );
}

function money(v) {
  const n = Number(v || 0);
  if (Number.isNaN(n)) return "$0.00";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function fmtDate(s) {
  if (!s) return "—";
  try {
    const d = new Date(s);
    return Number.isFinite(d.getTime()) ? d.toLocaleDateString() : String(s);
  } catch {
    return String(s);
  }
}

function statusTone(status) {
  const s = String(status || "").toUpperCase();
  if (s === "PAID") return "emerald";
  if (s === "PARTIAL") return "amber";
  if (s === "PAST_DUE" || s === "LATE") return "rose";
  return "slate";
}

function safeResults(data) {
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data)) return data;
  return [];
}

export default function RentPanel({ defaultTenantId = "" }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [charges, setCharges] = useState([]);
  const [payments, setPayments] = useState([]);

  // Filters
  const [tenantId, setTenantId] = useState(defaultTenantId ? String(defaultTenantId) : "");
  const [chargeStatus, setChargeStatus] = useState("ALL"); // ALL | DUE | PARTIAL | PAID | PAST_DUE (if you add)
  const [search, setSearch] = useState("");

  // Modal (next file will replace this with real modal)
  const [showRecord, setShowRecord] = useState(false);

  function toastOk(msg) {
    setOk(msg || "");
    setErr("");
  }
  function toastErr(msg) {
    setErr(msg || "Something went wrong.");
    setOk("");
  }

  async function loadAll() {
    setLoading(true);
    setErr("");
    setOk("");

    try {
      const params = {};
      if (tenantId) params.tenant = tenantId;

      const [cRes, pRes] = await Promise.allSettled([
        api.get("/pm/rent/charges/", { params }),
        api.get("/pm/rent/payments/", { params }),
      ]);

      if (cRes.status === "fulfilled") setCharges(safeResults(cRes.value.data));
      else setCharges([]);

      if (pRes.status === "fulfilled") setPayments(safeResults(pRes.value.data));
      else setPayments([]);

      if (cRes.status !== "fulfilled" || pRes.status !== "fulfilled") {
        const e = (cRes.status !== "fulfilled" ? cRes.reason : pRes.reason) || null;
        toastErr(e?.response?.data?.detail || e?.message || "Failed to load rent data.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce search filter (client-side)
  const filteredCharges = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (charges || [])
      .filter((c) => {
        if (chargeStatus === "ALL") return true;
        return String(c.status || "").toUpperCase() === chargeStatus;
      })
      .filter((c) => {
        if (!q) return true;
        const blob = [
          c.id,
          c.charge_type,
          c.due_date,
          c.amount,
          c.notes,
          c.description,
          c.status,
        ]
          .map((x) => String(x || "").toLowerCase())
          .join(" ");
        return blob.includes(q);
      });
  }, [charges, chargeStatus, search]);

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (payments || []).filter((p) => {
      if (!q) return true;
      const blob = [
        p.id,
        p.amount,
        p.method,
        p.reference,
        p.paid_at,
        (p.allocations || []).map((a) => `${a.charge_id} ${a.amount} ${a.charge_type} ${a.due_date}`).join(" "),
      ]
        .map((x) => String(x || "").toLowerCase())
        .join(" ");
      return blob.includes(q);
    });
  }, [payments, search]);

  const kpis = useMemo(() => {
    const open = (charges || []).filter((c) => String(c.status || "").toUpperCase() !== "PAID");
    const openBalance = open.reduce((sum, c) => sum + Number(c.balance || 0), 0);
    const dueCount = (charges || []).filter((c) => String(c.status || "").toUpperCase() === "DUE").length;
    const partialCount = (charges || []).filter((c) => String(c.status || "").toUpperCase() === "PARTIAL").length;

    const paidMTD = (payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);

    return {
      openCount: open.length,
      openBalance,
      dueCount,
      partialCount,
      paidMTD,
    };
  }, [charges, payments]);

  return (
    <div className="space-y-4">
      <Card
        title="Rent"
        subtitle="Charges, payments, allocations, and receipts — portfolio-ready."
        right={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Button tone="slate" onClick={loadAll} disabled={loading}>
              Refresh
            </Button>
            <Button tone="cyan" onClick={() => setShowRecord(true)}>
              Record Payment
            </Button>
          </div>
        }
      >
        <div className="grid md:grid-cols-5 gap-3">
          <div className="md:col-span-1">
            <div className="text-xs text-slate-400 mb-1">Tenant ID (optional)</div>
            <input
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value.replace(/[^\d]/g, ""))}
              className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
              placeholder="e.g. 4"
              inputMode="numeric"
            />
          </div>

          <div className="md:col-span-1">
            <div className="text-xs text-slate-400 mb-1">Charge status</div>
            <select
              value={chargeStatus}
              onChange={(e) => setChargeStatus(e.target.value)}
              className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
            >
              <option value="ALL">All</option>
              <option value="DUE">Due</option>
              <option value="PARTIAL">Partial</option>
              <option value="PAID">Paid</option>
              {/* If you later add server status like PAST_DUE/LATE, this will work client-side too */}
              <option value="PAST_DUE">Past Due</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <div className="text-xs text-slate-400 mb-1">Search</div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
              placeholder="Search by charge id, due date, notes, method, reference…"
            />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Pill tone="cyan">{kpis.openCount} open</Pill>
            <Pill tone="amber">{kpis.dueCount} due</Pill>
            <Pill tone="amber">{kpis.partialCount} partial</Pill>
            <Pill tone="rose">Open balance: {money(kpis.openBalance)}</Pill>
            <Pill tone="emerald">Payments total: {money(kpis.paidMTD)}</Pill>
          </div>

          <div className="flex items-center gap-2">
            <Button
              tone="slate"
              onClick={() => {
                toastOk("Tip: enter Tenant ID then hit Refresh to load scoped ledger.");
              }}
            >
              Tip
            </Button>
            <Button
              tone="slate"
              onClick={() => {
                loadAll();
              }}
              disabled={loading}
            >
              Apply tenant filter
            </Button>
          </div>
        </div>

        {err ? (
          <div className="mt-4 text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-2xl p-3">{err}</div>
        ) : null}
        {ok ? (
          <div className="mt-4 text-sm text-emerald-200 bg-emerald-900/15 border border-emerald-700/30 rounded-2xl p-3">
            {ok}
          </div>
        ) : null}
      </Card>

      {/* Charges */}
      <Card
        title="Charges"
        subtitle="Rent + fees + carryovers (shows allocations via balances)"
        right={
          loading ? (
            <Pill tone="cyan">Loading…</Pill>
          ) : (
            <Pill tone="slate">{filteredCharges.length} shown</Pill>
          )
        }
      >
        {loading ? (
          <div className="text-sm text-slate-400">Loading charges…</div>
        ) : filteredCharges.length === 0 ? (
          <div className="text-sm text-slate-400">No charges match the current filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400">
                  <th className="text-left font-medium py-2">Due</th>
                  <th className="text-left font-medium py-2">Type</th>
                  <th className="text-left font-medium py-2">Amount</th>
                  <th className="text-left font-medium py-2">Paid</th>
                  <th className="text-left font-medium py-2">Balance</th>
                  <th className="text-left font-medium py-2">Status</th>
                  <th className="text-left font-medium py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredCharges.map((c) => {
                  const st = String(c.status || "").toUpperCase();
                  return (
                    <tr key={c.id} className="border-t border-slate-900/80">
                      <td className="py-3">
                        {fmtDate(c.due_date)}
                        <div className="text-[11px] text-slate-500 mt-1">#{c.id}</div>
                      </td>
                      <td className="py-3">{String(c.charge_type || "—").toUpperCase()}</td>
                      <td className="py-3">{money(c.amount)}</td>
                      <td className="py-3">{money(c.total_paid)}</td>
                      <td className="py-3">{money(c.balance)}</td>
                      <td className="py-3">
                        <Pill tone={statusTone(st)}>{st || "—"}</Pill>
                      </td>
                      <td className="py-3">
                        <div className="max-w-[420px] truncate text-slate-300">{c.notes || c.description || "—"}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Payments */}
      <Card
        title="Payments"
        subtitle="Payments recorded with allocations (split/FIFO supported)"
        right={
          loading ? (
            <Pill tone="cyan">Loading…</Pill>
          ) : (
            <Pill tone="slate">{filteredPayments.length} shown</Pill>
          )
        }
      >
        {loading ? (
          <div className="text-sm text-slate-400">Loading payments…</div>
        ) : filteredPayments.length === 0 ? (
          <div className="text-sm text-slate-400">No payments match the current filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400">
                  <th className="text-left font-medium py-2">Paid at</th>
                  <th className="text-left font-medium py-2">Amount</th>
                  <th className="text-left font-medium py-2">Method</th>
                  <th className="text-left font-medium py-2">Reference</th>
                  <th className="text-left font-medium py-2">Allocated</th>
                  <th className="text-left font-medium py-2">Allocations</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((p) => {
                  const allocs = Array.isArray(p.allocations) ? p.allocations : [];
                  return (
                    <tr key={p.id} className="border-t border-slate-900/80">
                      <td className="py-3">
                        {fmtDate(p.paid_at)}
                        <div className="text-[11px] text-slate-500 mt-1">#{p.id}</div>
                      </td>
                      <td className="py-3">{money(p.amount)}</td>
                      <td className="py-3">{String(p.method || "—").toUpperCase()}</td>
                      <td className="py-3">
                        <div className="max-w-[320px] truncate">{p.reference || "—"}</div>
                      </td>
                      <td className="py-3">{money(p.allocated_total)}</td>
                      <td className="py-3">
                        {allocs.length === 0 ? (
                          <span className="text-slate-500">—</span>
                        ) : (
                          <div className="space-y-1">
                            {allocs.slice(0, 3).map((a) => (
                              <div key={a.id} className="text-[12px] text-slate-200">
                                <span className="text-slate-500">Charge</span> #{a.charge_id} • {money(a.amount)} •{" "}
                                <span className="text-slate-500">{String(a.charge_type || "").toUpperCase()}</span> •{" "}
                                <span className="text-slate-500">{fmtDate(a.due_date)}</span>
                              </div>
                            ))}
                            {allocs.length > 3 ? (
                              <div className="text-[11px] text-slate-500">+{allocs.length - 3} more</div>
                            ) : null}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Stub modal (next file replaces with real RecordPaymentModal) */}
      {showRecord ? (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-950/95 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">Record Payment</div>
                <div className="text-xs text-slate-400 mt-1">
                  Next file: full modal with FIFO + manual split allocations → POST /pm/rent/payments/record/
                </div>
              </div>
              <Button tone="slate" onClick={() => setShowRecord(false)}>
                Close
              </Button>
            </div>

            <div className="mt-4 text-sm text-slate-300">
              For now, use your PowerShell command to record payments while we build the UI modal.
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                tone="cyan"
                onClick={() => {
                  setShowRecord(false);
                  toastOk("Next: RecordPaymentModal.jsx (FIFO + split allocations + charge picker).");
                }}
              >
                Build the modal next
              </Button>
              <Button tone="slate" onClick={() => setShowRecord(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
