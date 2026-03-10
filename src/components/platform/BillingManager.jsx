// src/pages/godmode/BillingManager.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/client";

export default function BillingManager() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  // Cash Fee UI state
  const [cashTab, setCashTab] = useState("list"); // list | generate
  const [cashList, setCashList] = useState(null); // {count,next,previous,results}
  const [cashErr, setCashErr] = useState("");
  const [cashLoading, setCashLoading] = useState(false);

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  // Generate modal-ish state
  const [genFeeBps, setGenFeeBps] = useState(100);
  const [genDueDays, setGenDueDays] = useState(7);
  const [genResult, setGenResult] = useState(null);
  const [genBusy, setGenBusy] = useState(false);

  async function loadBillingSummary() {
    setErr("");
    try {
      const res = await api.get("/platform/billing/summary/");
      setData(res.data);
    } catch (e) {
      setErr("Failed to load billing summary.");
    }
  }

  async function loadCashFeeInvoices() {
    setCashErr("");
    setCashLoading(true);
    try {
      // NOTE: if you later add query params in backend (status/search/period),
      // wire them here. For now, fetch all (paginated).
      const res = await api.get("/cash-fee-invoices/");
      setCashList(res.data);
    } catch (e) {
      setCashErr("Failed to load cash fee invoices.");
    } finally {
      setCashLoading(false);
    }
  }

  async function generatePreviousMonth() {
    setCashErr("");
    setGenResult(null);
    setGenBusy(true);
    try {
      const res = await api.post("/cash-fee-invoices/generate-previous-month/", {
        fee_bps: Number(genFeeBps),
        due_days: Number(genDueDays),
      });
      setGenResult(res.data);
      // refresh list after generation
      await loadCashFeeInvoices();
    } catch (e) {
      setCashErr("Failed to generate cash fee invoices.");
    } finally {
      setGenBusy(false);
    }
  }

  useEffect(() => {
    loadBillingSummary();
  }, []);

  useEffect(() => {
    // lazy-load cash fee invoices when tab is opened
    if (cashTab === "list" && cashList == null && !cashLoading) {
      loadCashFeeInvoices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cashTab]);

  const filteredCashRows = useMemo(() => {
    const rows = cashList?.results || [];
    const s = (search || "").trim().toLowerCase();

    return rows.filter((r) => {
      const statusOk = statusFilter === "ALL" ? true : String(r.status || "").toUpperCase() === statusFilter;
      const businessName = String(r.business_name || r.business?.name || "").toLowerCase();
      const memo = String(r.memo || "").toLowerCase();
      const period = `${r.period_start || ""} ${r.period_end || ""}`.toLowerCase();

      const searchOk = !s ? true : businessName.includes(s) || memo.includes(s) || period.includes(s);
      return statusOk && searchOk;
    });
  }, [cashList, statusFilter, search]);

  return (
    <div className="space-y-4">
      {err ? (
        <div className="text-sm text-red-200 bg-red-900/20 border border-red-800 rounded-xl p-3">{err}</div>
      ) : null}

      {!data ? (
        <div className="text-slate-400">Loading…</div>
      ) : (
        <>
          <div className="grid md:grid-cols-3 gap-4">
            <Card title="Locked Businesses" value={data.locked_count} />
            <Card title="Missing Card on File" value={data.no_card_count} />
            <Card title="Charge Failures" value="(next)" subtitle="Stripe webhook later" />
          </div>

          {/* Locked list */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">Locked list</div>
                <div className="text-xs text-slate-400 mt-1">This is your ops queue.</div>
              </div>

              <button
                className="rounded-xl px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-sm"
                onClick={loadBillingSummary}
              >
                Refresh Billing
              </button>
            </div>

            {!data.locked_businesses?.length ? (
              <div className="text-slate-400 mt-4">No locked businesses.</div>
            ) : (
              <div className="mt-4 space-y-2">
                {data.locked_businesses.map((b) => (
                  <div key={b.business_id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <div className="font-semibold">{b.business_name}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Reason: {b.lock_reason || "—"} • Locked at: {b.locked_at || "—"}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Due: {b.next_due_date || "—"} • Grace: {b.grace_until || "—"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cash Fee Invoices */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">Cash Fee Invoices</div>
                <div className="text-xs text-slate-400 mt-1">
                  Monthly 1% billing for cash-confirmed tickets (previous month).
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  className={`rounded-xl px-4 py-2 text-sm border ${
                    cashTab === "list"
                      ? "bg-slate-900 border-slate-700"
                      : "bg-slate-950 border-slate-800 hover:bg-slate-900"
                  }`}
                  onClick={() => setCashTab("list")}
                >
                  Invoices
                </button>
                <button
                  className={`rounded-xl px-4 py-2 text-sm border ${
                    cashTab === "generate"
                      ? "bg-slate-900 border-slate-700"
                      : "bg-slate-950 border-slate-800 hover:bg-slate-900"
                  }`}
                  onClick={() => setCashTab("generate")}
                >
                  Generate
                </button>
              </div>
            </div>

            {cashErr ? (
              <div className="mt-4 text-sm text-red-200 bg-red-900/20 border border-red-800 rounded-xl p-3">{cashErr}</div>
            ) : null}

            {cashTab === "generate" ? (
              <div className="mt-4 grid md:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 md:col-span-2">
                  <div className="text-sm font-semibold">Generate previous month invoices</div>
                  <div className="text-xs text-slate-500 mt-1">
                    This is idempotent: it won’t duplicate existing invoices for the same business + period.
                  </div>

                  <div className="mt-4 grid sm:grid-cols-2 gap-3">
                    <Field
                      label="Fee (bps)"
                      hint="100 = 1.00%"
                      value={genFeeBps}
                      onChange={(v) => setGenFeeBps(v)}
                      type="number"
                      min="0"
                    />
                    <Field
                      label="Due days"
                      hint="Due date = today + due_days"
                      value={genDueDays}
                      onChange={(v) => setGenDueDays(v)}
                      type="number"
                      min="0"
                    />
                  </div>

                  <button
                    className="mt-4 rounded-xl px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-sm disabled:opacity-50"
                    onClick={generatePreviousMonth}
                    disabled={genBusy}
                  >
                    {genBusy ? "Generating…" : "Generate Previous Month"}
                  </button>

                  {genResult ? (
                    <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                      <div className="text-sm font-semibold">Result</div>
                      <div className="mt-2 grid sm:grid-cols-5 gap-2 text-xs text-slate-300">
                        <KpiMini label="Businesses" value={genResult.businesses_considered} />
                        <KpiMini label="Created" value={genResult.invoices_created} />
                        <KpiMini label="Skipped (zero)" value={genResult.invoices_skipped_zero} />
                        <KpiMini label="Skipped (existing)" value={genResult.invoices_skipped_existing} />
                        <KpiMini label="Exempt" value={genResult.businesses_skipped_exempt} />
                      </div>
                      <div className="text-xs text-slate-500 mt-3">
                        If you see “Skipped (zero)”, it means there were no cash-confirmed tickets for that business in the previous month.
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <div className="text-sm font-semibold">How it works</div>
                  <ul className="mt-2 text-xs text-slate-400 space-y-2 list-disc pl-4">
                    <li>Looks at cash-confirmed tickets in the previous calendar month.</li>
                    <li>Computes fee = GMV * fee_bps / 10,000.</li>
                    <li>Creates one invoice per business for that month.</li>
                    <li>Uses unique constraint so it won’t duplicate.</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <div className="flex flex-col md:flex-row md:items-end gap-3 justify-between">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Status</div>
                      <select
                        className="w-full sm:w-44 rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="ALL">All</option>
                        <option value="OPEN">OPEN</option>
                        <option value="PAID">PAID</option>
                        <option value="OVERDUE">OVERDUE</option>
                        <option value="VOID">VOID</option>
                      </select>
                    </div>

                    <div className="flex-1">
                      <div className="text-xs text-slate-400 mb-1">Search</div>
                      <input
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                        placeholder="Business, memo, period…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    className="rounded-xl px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-sm"
                    onClick={loadCashFeeInvoices}
                    disabled={cashLoading}
                  >
                    {cashLoading ? "Refreshing…" : "Refresh Cash Fees"}
                  </button>
                </div>

                {cashLoading && !cashList ? <div className="text-slate-400 mt-4">Loading…</div> : null}

                {!cashLoading && cashList && (cashList.results || []).length === 0 ? (
                  <div className="mt-4 text-slate-400">
                    No cash fee invoices yet. This is normal if there were no cash-confirmed tickets last month.
                  </div>
                ) : null}

                {cashList && (cashList.results || []).length > 0 ? (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-950/80">
                          <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                            <th className="px-4 py-3">Period</th>
                            <th className="px-4 py-3">Business</th>
                            <th className="px-4 py-3">Amount</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Due</th>
                            <th className="px-4 py-3">Created</th>
                            <th className="px-4 py-3">Memo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 bg-slate-950">
                          {filteredCashRows.map((r) => (
                            <tr key={r.id} className="hover:bg-slate-900/40">
                              <td className="px-4 py-3 text-slate-200">
                                <div className="text-xs text-slate-400">{fmtPeriod(r.period_start, r.period_end)}</div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-semibold text-slate-200">{r.business_name || r.business?.name || `Business #${r.business}`}</div>
                                <div className="text-xs text-slate-500">ID: {r.business_id || r.business}</div>
                              </td>
                              <td className="px-4 py-3 text-slate-200">{fmtMoneyCents(r.amount_cents)}</td>
                              <td className="px-4 py-3">
                                <StatusPill status={r.status} />
                              </td>
                              <td className="px-4 py-3 text-slate-300">{r.due_date || "—"}</td>
                              <td className="px-4 py-3 text-slate-400">{fmtDateTime(r.created_at)}</td>
                              <td className="px-4 py-3 text-slate-400">
                                <div className="max-w-[420px] truncate" title={r.memo || ""}>
                                  {r.memo || "—"}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="px-4 py-3 bg-slate-950/80 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                      <div>
                        Showing <span className="text-slate-200">{filteredCashRows.length}</span> of{" "}
                        <span className="text-slate-200">{cashList.count}</span>
                      </div>
                      <div className="text-slate-500">
                        Pagination: backend returns next/previous (wire up later if you want).
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Card({ title, value, subtitle }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="text-slate-400 text-xs uppercase tracking-wider">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {subtitle ? <div className="text-xs text-slate-500 mt-1">{subtitle}</div> : null}
    </div>
  );
}

function Field({ label, hint, value, onChange, type = "text", min }) {
  return (
    <label className="block">
      <div className="text-xs text-slate-400">{label}</div>
      <input
        className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
        value={value}
        type={type}
        min={min}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint ? <div className="text-[11px] text-slate-500 mt-1">{hint}</div> : null}
    </label>
  );
}

function KpiMini({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
      <div className="text-[11px] text-slate-500 uppercase tracking-wider">{label}</div>
      <div className="text-lg font-bold text-slate-200 mt-1">{value}</div>
    </div>
  );
}

function StatusPill({ status }) {
  const s = String(status || "").toUpperCase();
  const cls =
    s === "PAID"
      ? "border-emerald-800 text-emerald-200 bg-emerald-900/20"
      : s === "OVERDUE"
      ? "border-amber-800 text-amber-200 bg-amber-900/20"
      : s === "VOID"
      ? "border-slate-700 text-slate-300 bg-slate-900/30"
      : "border-sky-800 text-sky-200 bg-sky-900/20";

  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs ${cls}`}>{s || "—"}</span>;
}

function fmtMoneyCents(cents) {
  const n = Number(cents || 0);
  const dollars = n / 100;
  try {
    return dollars.toLocaleString(undefined, { style: "currency", currency: "USD" });
  } catch {
    return `$${dollars.toFixed(2)}`;
  }
}

function fmtPeriod(start, end) {
  if (!start && !end) return "—";
  if (start && end) return `${start} → ${end}`;
  return start || end || "—";
}

function fmtDateTime(dt) {
  if (!dt) return "—";
  // keep simple; backend returns ISO string
  return String(dt).replace("T", " ").replace("Z", "");
}