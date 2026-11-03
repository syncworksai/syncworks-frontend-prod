import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/client";

const usd = (v) => Number(v || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
const val = (v) => Number(v || 0);
const rentCategory = (r) => ["RENT", "RENT_TENANT", "RENT_HOUSING"].includes(String(r.category || "").toUpperCase());
const housing = (r) => String(r.category || "").toUpperCase() === "RENT_HOUSING" || String(r.payment_method || "").toUpperCase() === "HOUSING_AUTHORITY";
const escrow = (r) => String(r.category || "").toUpperCase().replaceAll(" ", "_") === "SECURITY_DEPOSIT";
const sign = (r) => ["CHARGE", "ADJUSTMENT"].includes(String(r.entry_type).toUpperCase()) ? 1 : -1;
const textButton = "min-h-9 rounded-md border border-slate-600/80 bg-slate-900/70 px-2 py-1.5 text-[10px] font-bold text-slate-100 hover:border-cyan-400/60";
const monthTitle = (key) => new Date(Number(key.slice(0,4)), Number(key.slice(5,7))-1, 1).toLocaleDateString("en-US", {month: "short", year: "numeric"});
const currentMonth = () => { const d = new Date(); return String(d.getFullYear()) + "-" + String(d.getMonth()+1).padStart(2,"0"); };
const csvCell = (v) => '"' + String(v ?? "").replaceAll('"', '""') + '"';

function downloadCsv(rows, tenant) {
  const content = "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "SyncWorks-" + String(tenant?.full_name || "Tenant").replace(/[^a-z0-9-]/gi,"-") + "-monthly-ledger.csv";
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

function Badge({status}) {
  const colors = {
    full: "border-emerald-400/55 bg-emerald-500/20 text-emerald-200",
    late: "border-rose-400/60 bg-rose-500/20 text-rose-100",
    pending: "border-amber-400/50 bg-amber-500/15 text-amber-200",
    review: "border-slate-500/50 bg-slate-500/10 text-slate-300",
  };
  return <span className={"shrink-0 rounded-md border px-1.5 py-1 text-[9px] font-black " + colors[status.id]}>{status.label}</span>;
}

export default function PMMonthlyLedger({
  tenant, workspace, entries = [], allocation, payer, onAddPayment, onEditRent,
  onHousingEvidence, onLateFee, onAdvanced, onBillingRules,
}) {
  const [schedule, setSchedule] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [scheduleError, setScheduleError] = useState(false);
  const [opened, setOpened] = useState("");
  const [search, setSearch] = useState("");
  const [only, setOnly] = useState("ALL");
  const tenantId = tenant?.id;
  const workspaceId = workspace?.id;
  useEffect(() => {
    if (!tenantId || !workspaceId) { return; }
    let live = true;
    setSchedule(null); setScheduleError(false); setFetching(true); setOpened(""); setSearch(""); setOnly("ALL");
    api.get("/pm-hub/billing/tenants/" + tenantId + "/simple-schedule/", {
      headers: { "X-PM-Workspace-ID": String(workspaceId) },
    }).then(({data}) => { if (live) setSchedule(data?.schedule || null); })
      .catch(() => { if (live) setScheduleError(true); })
      .finally(() => { if (live) setFetching(false); });
    return () => { live = false; };
  }, [tenantId, workspaceId]);

  const rows = useMemo(() => {
    const rowsByMonth = new Map();
    const ensure = (month) => {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
      if (!rowsByMonth.has(month)) rowsByMonth.set(month, {
        month, transactions: [], scheduled: null, rentTenant: 0, rentHousing: 0,
        postedRentCharges: 0, postedFees: 0, tenantReceived: 0, housingReceived: 0,
        unapplied: false, tenantOpen: 0, housingOpen: 0, feeOpen: 0,
      });
      return rowsByMonth.get(month);
    };
    for (const item of schedule?.months || []) {
      const row = ensure(item.month);
      if (row) row.scheduled = item;
    }
    for (const item of entries) {
      if (String(item.tenant) !== String(tenantId) || escrow(item)) continue;
      const row = ensure(String(item.entry_date || "").slice(0,7));
      if (!row) continue;
      row.transactions.push(item);
      if (rentCategory(item) && item.entry_type !== "PAYMENT") {
        const amount = val(item.amount) * sign(item);
        if (housing(item)) row.rentHousing += amount;
        else row.rentTenant += amount;
        if (item.entry_type === "CHARGE" || item.entry_type === "ADJUSTMENT") row.postedRentCharges += val(item.amount);
      }
      if (String(item.category || "").toUpperCase() === "LATE_FEE") row.postedFees += val(item.amount) * sign(item);
      if (item.entry_type === "PAYMENT") {
        if (housing(item)) row.housingReceived += val(item.amount);
        else row.tenantReceived += val(item.amount);
      }
    }
    ensure(currentMonth());
    if (allocation) {
      for (const item of allocation.outstanding || []) {
        const row = ensure(String(item.date || "").slice(0,7));
        if (!row) continue;
        const category = String(item.category || "").toUpperCase();
        if (category === "LATE_FEE") row.feeOpen += val(item.unpaid);
        else if (["RENT", "RENT_TENANT", "RENT_HOUSING"].includes(category)) {
          if (item.payer === "HOUSING") row.housingOpen += val(item.unpaid);
          else row.tenantOpen += val(item.unpaid);
        }
      }
    }
    const now = new Date();
    const dueDay = Math.max(1, Math.min(28, Number(payer?.profile?.rent_due_day) || 1));
    return [...rowsByMonth.values()].map((row) => {
      const split = row.scheduled;
      const abated = String(split?.source_status || "").includes("ABAT") ? val(split?.mha) : 0;
      const suggestedHousing = abated ? 0 : val(split?.mha);
      const suggestedTenant = split ? val(split.tenant ?? (val(split.rent)-val(split.mha))) : 0;
      const postedRent = row.rentTenant + row.rentHousing;
      const expected = split ? val(split.rent) : postedRent;
      const dueDate = new Date(Number(row.month.slice(0,4)), Number(row.month.slice(5,7))-1, dueDay, 23, 59, 59);
      const ready = !!allocation && (row.rentTenant > .005 || row.rentHousing > .005);
      const unpaid = row.tenantOpen + row.housingOpen + row.feeOpen;
      const mismatch = !!split && (Math.abs(suggestedTenant - row.rentTenant) > .01 ||
         Math.abs(suggestedHousing - row.rentHousing) > .01);
      let status = { id: "review", label: "Not yet billed" };
      if (fetching || scheduleError || !allocation) status = { id: "review", label: "Verify account" };
      else if (!ready || mismatch) status = { id: "pending", label: mismatch ? "Review split" : "Not yet billed" };
      else if (unpaid < .005) status = { id: "full", label: "Paid in full" };
      else if (now > dueDate && (row.tenantOpen > .005 || row.feeOpen > .005)) status = { id: "late", label: "Past due" };
      else if (row.housingOpen > .005 && row.tenantOpen < .005) status = { id: "pending", label: "MHA pending" };
      else status = { id: "pending", label: "Partially paid" };
      return {
        ...row, status, dueDate, postedRent, abated, expected, suggestedTenant, suggestedHousing,
        mismatch, feeBalance: row.feeOpen, rentOutstanding: row.tenantOpen + row.housingOpen,
        payments: row.transactions.filter((item) => item.entry_type === "PAYMENT").sort((a,b) => String(b.entry_date).localeCompare(String(a.entry_date))),
      };
    }).sort((a,b) => b.month.localeCompare(a.month));
  }, [schedule, entries, allocation, payer, tenantId, fetching, scheduleError]);

  const filtered = rows.filter((row) => (!search || monthTitle(row.month).toLowerCase().includes(search.toLowerCase()) || row.month.includes(search)) &&
    (only === "ALL" || row.status.id === only));
  const totals = {
    overdue: rows.filter((row) => row.status.id === "late").length,
    full: rows.filter((row) => row.status.id === "full").length,
    pending: rows.filter((row) => row.status.id === "pending").length,
  };
  const exportRows = [
    ["Month","Status","Contract rent (reference)","Tenant portion (schedule)","Housing portion (schedule)","Abated assistance",
      "Tenant net posted rent","Housing net posted rent","Tenant payments dated this month","Housing payments dated this month",
      "Tenant rent outstanding oldest-first","Housing rent outstanding oldest-first","Late fees posted net","Late fees outstanding","Note"],
    ...rows.slice().reverse().map((r) => [
      r.month,r.status.label,r.expected.toFixed(2),r.suggestedTenant.toFixed(2),r.suggestedHousing.toFixed(2),r.abated.toFixed(2),
      r.rentTenant.toFixed(2),r.rentHousing.toFixed(2),r.tenantReceived.toFixed(2),r.housingReceived.toFixed(2),
      r.tenantOpen.toFixed(2),r.housingOpen.toFixed(2),r.postedFees.toFixed(2),r.feeOpen.toFixed(2),
      r.mismatch ? "Saved split differs from posted charges; verify before correction" : "",
    ]),
    [],
    ["Individual receipts: recorded date","Payer","Amount","Method","Reference","Memo"],
    ...entries.filter((r) => String(r.tenant) === String(tenantId) && r.entry_type === "PAYMENT" && !escrow(r))
      .map((r) => [r.entry_date,housing(r)?"HOUSING":"TENANT",val(r.amount).toFixed(2),r.payment_method,r.reference,r.memo]),
  ];
  return <section className="space-y-3" aria-label="Compact monthly tenant rent ledger">
    <div className="rounded-xl border border-cyan-500/25 bg-[#07111f] p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[.19em] text-cyan-300">Monthly rent · Simple view</div>
          <h2 className="mt-1 text-base font-black text-white">{tenant.full_name || [tenant.first_name,tenant.last_name].filter(Boolean).join(" ")}</h2>
          <p className="text-[10px] text-slate-400">Rent, payments and balances by month.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => downloadCsv(exportRows,tenant)} className={textButton}>Export CSV</button>
          <button type="button" onClick={onAdvanced} className={textButton}>Advanced accounting</button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
        {[
          ["Overdue",totals.overdue,"text-rose-200 border-rose-500/30 bg-rose-500/10"],
          ["Paid",totals.full,"text-emerald-200 border-emerald-500/30 bg-emerald-500/10"],
          ["Review",totals.pending,"text-amber-200 border-amber-500/30 bg-amber-500/10"],
        ].map(([name,value,tone])=><div key={name} className={"rounded-lg border p-2 "+tone}><div className="text-[10px] font-medium">{name}</div><div className="text-lg font-black">{value}</div></div>)}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input aria-label="Search rent months" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search month" className="min-h-9 min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-white sm:max-w-xs" />
        <select aria-label="Filter month status" className="min-h-9 rounded-lg border border-slate-700 bg-slate-950 px-2 text-xs text-white" value={only} onChange={(e)=>setOnly(e.target.value)}>
          <option value="ALL">All months</option><option value="late">Past due</option><option value="full">Paid in full</option><option value="pending">Review / pending</option><option value="review">Unverified</option>
        </select>
        <button type="button" className={textButton} onClick={onBillingRules}>Rent settings</button>
      </div>
      <p className="mt-2 text-[10px] text-slate-500">Green = paid · Red = overdue · Amber = needs review. Balance due excludes MHA.</p>
    </div>
    {fetching && <p className="text-xs text-slate-400">Checking monthly rent schedule…</p>}
    {scheduleError && <p role="alert" className="rounded-lg border border-amber-500/25 px-3 py-2 text-xs text-amber-200">Monthly schedule could not be loaded. Posted transactions remain visible but color status requires verification.</p>}
    <div className="grid gap-2 lg:grid-cols-2">
      {filtered.map((r) => {
        const active = opened === r.month;
        const boxTone = r.status.id === "late" ? "border-rose-400/55 bg-rose-500/[.075]" :
          r.status.id === "full" ? "border-emerald-400/45 bg-emerald-500/[.065]" :
          r.status.id === "pending" ? "border-amber-400/30 bg-[#091522]" : "border-slate-700 bg-[#07111f]";
        return <article key={r.month} className={"min-w-0 overflow-hidden rounded-xl border p-2.5 transition sm:p-3 " + boxTone}>
          <button type="button" aria-expanded={active} onClick={()=>setOpened(active?"":r.month)}
            className="flex min-h-9 w-full items-center justify-between gap-2 text-left">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-sm font-black text-white">{monthTitle(r.month)}</span>
              <Badge status={r.status}/>
            </div>
            <span className="flex shrink-0 items-center gap-2 text-right">
              <span><span className="block text-[9px] text-slate-400">Rent</span><span className="text-sm font-black text-white">{usd(r.expected)}</span></span>
              <span aria-hidden="true" className="text-slate-400">{active ? "⌃" : "⌄"}</span>
            </span>
          </button>
          <div className="mt-2 grid grid-cols-3 gap-1 sm:gap-1.5">
            {[
              ["Tenant due", r.scheduled ? r.suggestedTenant : r.rentTenant, "text-white"],
              ["Assistance due", r.scheduled ? r.suggestedHousing : r.rentHousing, "text-fuchsia-200"],
              ["Tenant paid", r.tenantReceived, "text-emerald-200"],
              ["MHA paid", r.housingReceived, "text-emerald-200"],
              ["Late fees", r.postedFees, "text-amber-200"],
              ["Balance due", r.tenantOpen + r.feeOpen, r.tenantOpen + r.feeOpen > .005 ? "text-rose-200" : "text-emerald-200"],
            ].map(([label, amount, tone]) => <div key={label}
              className="min-w-0 rounded-md border border-slate-700/70 bg-black/20 px-1.5 py-1.5 sm:px-2">
              <div className="truncate text-[9px] leading-tight text-slate-400">{label}</div>
              <div className={"mt-0.5 truncate text-[11px] font-black tabular-nums sm:text-xs " + tone}>{usd(amount)}</div>
            </div>)}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-[10px]">
            <span className="min-w-0 truncate text-slate-400">
              {r.abated > .005 ? usd(r.abated) + " MHA abated · " : ""}
              {r.housingOpen > .005 ? "MHA outstanding: " + usd(r.housingOpen) : r.housingReceived > 0 ? "Assistance received" : "Payments may cover older rent"}
            </span>
            <span className="shrink-0 text-slate-500">{r.payments.length} receipt{r.payments.length===1?"":"s"}</span>
          </div>
          {active ? <div className="mt-2 space-y-2 border-t border-slate-600/30 pt-2">
            {r.mismatch && <p className="rounded-lg border border-amber-500/30 p-2 text-[10px] text-amber-200">The saved monthly split differs from posted rent. Review before correcting it. A rent schedule is not a payment receipt.</p>}
            <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-slate-700/70 p-2 text-[10px]">
              <span className="text-slate-400">Rent open <strong className="text-white">{usd(r.tenantOpen)}</strong></span>
              <span className="text-slate-400">Fees open <strong className="text-amber-200">{usd(r.feeBalance)}</strong></span>
              <span className="text-slate-400">MHA open <strong className="text-fuchsia-200">{usd(r.housingOpen)}</strong></span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" className={textButton} onClick={()=>onAddPayment(r.month,"TENANT")}>+ Add payment</button>
              <button type="button" className={textButton} onClick={()=>onEditRent(r.month)}>Edit month</button>
              {(payer?.profile?.section8 || r.suggestedHousing > 0 || r.rentHousing > 0 || r.abated > 0) ? <>
                <button type="button" className={textButton} onClick={()=>onAddPayment(r.month,"HOUSING")}>+ MHA payment</button>
                <button type="button" className={textButton} onClick={()=>onHousingEvidence(r.month)}>MHA details</button>
              </> : null}
              <button type="button" className={textButton} onClick={()=>onLateFee(r.month)}>Add fee</button>
              <button type="button" className={textButton} onClick={onAdvanced}>History</button>
            </div>
            {r.payments.length ? <div className="space-y-1">
              <div className="text-[10px] font-bold text-slate-300">Payments recorded this month</div>
              {r.payments.map((p) => <div key={p.id} className="flex items-center justify-between gap-2 rounded-md bg-black/20 px-2 py-1.5 text-[10px]">
                <span className="min-w-0 truncate text-slate-300">{p.entry_date} · {housing(p)?"MHA":"Tenant"} · {p.payment_method||"Other"}{p.reference?" · "+p.reference:""}</span>
                <strong className="shrink-0 text-emerald-200">{usd(p.amount)}</strong>
              </div>)}
            </div> : <p className="text-[10px] text-slate-500">No dated payment recorded for this month.</p>}
            <p className="text-[10px] text-slate-500">Payments apply to the oldest unpaid balance first.</p>
          </div> : null}
        </article>;
      })}
    </div>
    {!filtered.length && <div className="rounded-xl border border-dashed border-slate-700 p-4 text-xs text-slate-400">No months match. Clear the month search or choose a different status.</div>}
    <p className="text-[10px] text-slate-500">Advanced Accounting keeps all original entries, corrections and agency records.</p>
  </section>;
}
