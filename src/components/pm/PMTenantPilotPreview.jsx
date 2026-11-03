import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/client";

const usd = (v) => Number(v || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
const pill = "rounded-lg border border-cyan-500/25 bg-cyan-500/5 px-2 py-1 text-[10px] font-bold text-cyan-200";
const list = (data) => Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];

/**
 * Roxana pilot: read-only owner view of the resident experience. This does not
 * impersonate another user's login, bind an invitation code, change an email,
 * or enable tenant-only write endpoints.
 */
export default function PMTenantPilotPreview({ property, tenant, workspace, navigate }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const safePilot = Number(property?.id) === 1 && Number(tenant?.id) === 1 &&
    String(property?.name || "").trim().toLowerCase().includes("roxana") &&
    String(tenant?.last_name || "").trim().toLowerCase() === "english";

  useEffect(() => {
    if (!workspace?.id || !safePilot) { setLoading(false); return; }
    let alive = true;
    setLoading(true); setError(""); setData(null);
    const headers = { "X-PM-Workspace-ID": String(workspace.id) };
    Promise.allSettled([
      api.get("/pm-hub/billing/tenants/1/lease-builder/", { headers }),
      api.get("/pm-hub/billing/tenants/1/allocations/", { headers }),
      api.get("/pm-hub/ledger/", { headers, params: { tenant: 1 } }),
      api.get("/pm-hub/work-orders/", { headers, params: { property_id: 1 } }),
    ]).then(([bill, allocation, ledger, maintenance]) => {
      if (!alive) return;
      if (bill.status !== "fulfilled" || allocation.status !== "fulfilled") {
        setError("The tenant account preview could not be verified. No alternative tenant data is shown.");
        return;
      }
      setData({
        billing: bill.value.data, allocation: allocation.value.data,
        ledger: ledger.status === "fulfilled" ? list(ledger.value.data).filter(e => Number(e.tenant) === 1) : [],
        work: maintenance.status === "fulfilled" ? list(maintenance.value.data).filter(e => Number(e.property) === 1) : [],
      });
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [safePilot, workspace?.id]);

  const payments = useMemo(() => (data?.ledger || []).filter(e => e.entry_type === "PAYMENT")
    .sort((a, b) => String(b.entry_date).localeCompare(String(a.entry_date))), [data]);
  if (!safePilot) return <div className="rounded-xl border border-amber-500/30 p-4 text-xs text-amber-200">
    Pilot preview is available only for the authorized Roxana resident record.
  </div>;

  const bill = data?.billing || {};
  const lease = bill.lease || {};
  const totals = bill.totals || {};
  const recordedTenantBalance = Number(totals.tenant_owed || 0);
  const housingBalance = Number(totals.housing_owed || 0);
  return <section className="space-y-3 rounded-xl border border-cyan-400/20 bg-[#030b17] p-3 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <div className="text-[10px] font-black uppercase tracking-[.16em] text-cyan-300">Resident view · Roxana pilot</div>
        <h2 className="mt-1 text-xl font-black">Welcome Home</h2>
        <p className="mt-1 text-xs text-slate-400">Preview of the tenant experience using actual PM records.</p>
      </div>
      <span className={pill}>OWNER PREVIEW · READ ONLY</span>
    </div>
    <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-[11px] leading-4 text-amber-100">
      You are still signed in as the PM owner. No tenant invitation, tenant email, login or payment method has been changed.
      The actual tenant may see different portal details until her invitation is accepted.
      Actions below open the owner's management tools; they do not send a message or create a tenant request.
    </p>
    {loading ? <p className="text-xs text-slate-400">Loading live resident account…</p> : null}
    {error ? <p role="alert" className="rounded-lg border border-rose-500/30 p-3 text-xs text-rose-200">{error}</p> : null}
    {data ? <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["My rent balance", recordedTenantBalance, recordedTenantBalance > .005 ? "text-rose-200" : "text-emerald-200"],
          ["Monthly rent", lease.contract_rent, "text-white"],
          ["My monthly share", lease.tenant_portion, "text-white"],
          ["Last payment", payments[0]?.amount || "0", "text-emerald-200"],
        ].map(([label, value, tone]) => <div key={label} className="rounded-xl border border-slate-700 bg-black/20 p-2.5">
          <div className="text-[10px] text-slate-400">{label}</div>
          <div className={"mt-1 text-lg font-black tabular-nums " + tone}>{usd(value)}</div>
        </div>)}
      </div>
      {(!bill.setup?.active || !data.ledger.some(e => String(e.entry_date).startsWith("2026-11") && e.entry_type === "CHARGE" && /RENT/.test(String(e.category)))) ?
        <p className="rounded-lg border border-amber-500/30 p-2.5 text-[11px] text-amber-200">
          Monthly billing is not fully active or November rent is missing. Displayed balance is based on posted entries only; do not treat it as a verified final statement.
        </p> : null}
      <div className="grid gap-2 md:grid-cols-3">
        <div className="rounded-xl border border-slate-700 bg-black/20 p-3">
          <h3 className="text-sm font-black">Pay Rent</h3>
          <p className="mt-1 text-[11px] text-slate-400">See rent, balances, payment history, and available methods.</p>
          <button className="mt-3 min-h-9 w-full rounded-lg border border-cyan-400/40 text-xs text-cyan-100" onClick={() => navigate("/pm/payments?property=1&tenant=1")}>Review owner ledger</button>
          <div className="mt-2 text-[10px] text-slate-500">Online tenant checkout remains disabled in preview.</div>
        </div>
        <div className="rounded-xl border border-slate-700 bg-black/20 p-3">
          <h3 className="text-sm font-black">Maintenance</h3>
          <p className="mt-1 text-[11px] text-slate-400">Submit repairs and follow their progress in the real tenant portal.</p>
          <p className="mt-2 text-sm font-bold text-cyan-200">{data.work.length} PM work order{data.work.length === 1 ? "" : "s"}</p>
          <button className="mt-3 min-h-9 w-full rounded-lg border border-cyan-400/40 text-xs text-cyan-100" onClick={() => navigate("/pm/work-orders?property=1")}>Open PM work orders</button>
        </div>
        <div className="rounded-xl border border-slate-700 bg-black/20 p-3">
          <h3 className="text-sm font-black">Messages</h3>
          <p className="mt-1 text-[11px] text-slate-400">Resident messages stay private to the tenant and management.</p>
          <button className="mt-3 min-h-9 w-full rounded-lg border border-cyan-400/40 text-xs text-cyan-100" onClick={() => navigate("/pm/settings?view=messages&property=1")}>Open PM inbox</button>
          <div className="mt-2 text-[10px] text-slate-500">No message is sent from the preview.</div>
        </div>
      </div>
      <div className="rounded-xl border border-slate-700 bg-black/20 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-black">Rent & receipts</h3><span className="text-[10px] text-slate-400">Tenant paid {usd(totals.tenant_paid_recorded)} · Assistance tracked separately</span></div>
        <div className="mt-2 space-y-1">
          {payments.slice(0, 6).map(e => <div key={e.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 p-2 text-[11px]">
            <span>{e.entry_date} · {e.reference || e.payment_method || "Recorded receipt"}</span><strong className="text-emerald-200">{usd(e.amount)}</strong>
          </div>)}
        </div>
        <p className="mt-2 text-[10px] text-slate-500">Housing authority amount under management review: {usd(housingBalance)}. This is not added to the resident's rent obligation.</p>
      </div>
      <div className="rounded-xl border border-slate-700 bg-black/20 p-3">
        <h3 className="text-sm font-black">My home & documents</h3>
        <p className="mt-1 text-[11px] text-slate-400">{property?.name} · {property?.address} · Month-to-month review required</p>
        <button className="mt-2 min-h-9 rounded-lg border border-cyan-400/40 px-3 text-xs text-cyan-100" onClick={() => navigate("/pm/properties/1?tab=documents")}>Check PM documents</button>
      </div>
    </> : null}
  </section>;
}
