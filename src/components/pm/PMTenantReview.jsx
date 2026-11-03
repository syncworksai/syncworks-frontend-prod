import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/client";

const usd = (value) => Number(value || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
const number = (value) => Number(value || 0);
const reportMonths = [
  { month: "2026-01", rent: 1485, housing: 78, tenant: 1407, paid: null, tenantPaid: null, note: "Prior-manager reference. Owner has not entered a January paid total.", history: true },
  { month: "2026-02", rent: 1485, housing: 78, tenant: 1407, paid: 208, tenantPaid: 130, note: "$78 MHA + $130 tenant recorded by Adair; historical entry, not a second receipt." },
  { month: "2026-03", rent: 1485, housing: 78, tenant: 1407, paid: 2706, tenantPaid: 2706, note: "Owner-reported total; individual receipt dates and references still require matching." },
  { month: "2026-04", rent: 1485, housing: 78, tenant: 1407, paid: 704, tenantPaid: 704 },
  { month: "2026-05", rent: 1485, housing: 78, tenant: 1407, paid: 900, tenantPaid: 900 },
  { month: "2026-06", rent: 1485, housing: 78, tenant: 1407, paid: 700, tenantPaid: 700 },
  { month: "2026-07", rent: 1485, housing: 78, tenant: 1407, paid: 800, tenantPaid: 800 },
  { month: "2026-08", rent: 1485, housing: 0, tenant: 1485, paid: 750, tenantPaid: 750, note: "MHA $0 allocation; tenant responsible for full contract rent." },
  { month: "2026-09", rent: 1485, housing: 377, tenant: 1108, paid: 750, tenantPaid: 750, note: "MHA $377 due, but not confirmed received by the owner." },
  { month: "2026-10", rent: 1485, housing: 0, abated: 377, tenant: 1108, paid: 1200, tenantPaid: 1200, note: "$377 MHA assistance abated. Not received and not automatically reassigned to the tenant." },
];

const isRoxanaEnglish = (property, tenant) =>
  /roxana/i.test([property?.name, property?.address, tenant?.property_name].filter(Boolean).join(" ")) &&
  /english/i.test([tenant?.last_name, tenant?.full_name].filter(Boolean).join(" "));

const monthLabel = (month) =>
  new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
const isHousing = (entry) =>
  String(entry.category || "").toUpperCase() === "RENT_HOUSING" ||
  String(entry.payment_method || "").toUpperCase() === "HOUSING_AUTHORITY";
const isDeposit = (entry) => String(entry.category || "").toUpperCase().replaceAll(" ", "_") === "SECURITY_DEPOSIT";
const field = "min-h-10 rounded-lg border border-slate-600 bg-[#081423] px-3 text-xs font-bold text-white";
const action = "min-h-10 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 text-xs font-bold text-cyan-100 hover:border-cyan-300";
const csvCell = (value) => '"' + String(value ?? "").replaceAll('"', '""') + '"';

function saveCsv(filename, rows) {
  const csv = "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function PMTenantReview({ property, tenants = [], workspace, ledger = [], navigate }) {
  const [tenantId, setTenantId] = useState("");
  const [details, setDetails] = useState({ schedule: null, owner: null, external: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState("");
  const [sheetsHint, setSheetsHint] = useState(false);
  const tenant = tenants.find((item) => String(item.id) === String(tenantId));
  const roxana = isRoxanaEnglish(property, tenant);
  useEffect(() => {
    if (!tenants.some((item) => String(item.id) === String(tenantId))) {
      setTenantId(tenants[0] ? String(tenants[0].id) : "");
    }
  }, [tenants, tenantId]);
  useEffect(() => {
    if (!tenantId || !workspace?.id) return;
    let alive = true;
    setLoading(true);
    setError("");
    setDetails({ schedule: null, owner: null, external: [] });
    const headers = { "X-PM-Workspace-ID": String(workspace.id) };
    Promise.allSettled([
      api.get("/pm-hub/billing/tenants/" + tenantId + "/simple-schedule/", { headers }),
      api.get("/pm-hub/billing/tenants/" + tenantId + "/owner-payment-review/", { headers }),
      api.get("/pm-hub/billing/tenants/" + tenantId + "/external-evidence/", { headers }),
    ]).then(([schedule, owner, external]) => {
      if (!alive) return;
      setDetails({
        schedule: schedule.status === "fulfilled" ? schedule.value.data?.schedule : null,
        owner: owner.status === "fulfilled" ? owner.value.data?.report : null,
        external: external.status === "fulfilled" ? external.value.data?.records || [] : [],
      });
      if (schedule.status === "rejected" && owner.status === "rejected") {
        setError("Could not retrieve the monthly schedules. Existing posted ledger items are still shown.");
      }
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [tenantId, workspace?.id]);

  const tenantLedger = useMemo(() => ledger.filter((entry) =>
    String(entry.tenant) === String(tenantId) && !isDeposit(entry)), [ledger, tenantId]);
  const rows = useMemo(() => {
    const sourceRows = roxana ? reportMonths : (details.schedule?.months || []).map((item) => ({
      month: item.month, rent: number(item.rent), housing: number(item.mha),
      tenant: Number.isFinite(Number(item.tenant)) ? number(item.tenant) : number(item.rent) - number(item.mha),
      abated: 0, paid: null, tenantPaid: null, note: item.source_status || "Schedule draft",
    }));
    let running = 0;
    return sourceRows.map((row) => {
      const report = details.owner?.months?.find((item) => item.month === row.month);
      const monthEntries = tenantLedger.filter((entry) => String(entry.entry_date || "").slice(0, 7) === row.month);
      const receipts = monthEntries.filter((entry) => entry.entry_type === "PAYMENT");
      const postedTenant = receipts.filter((entry) => !isHousing(entry)).reduce((sum, entry) => sum + number(entry.amount), 0);
      const postedHousing = receipts.filter(isHousing).reduce((sum, entry) => sum + number(entry.amount), 0);
      const received = report ? number(report.reported_tenant_paid) :
        row.tenantPaid === null ? postedTenant : number(row.tenantPaid);
      const reportedTotal = report ? number(report.owner_reported_paid_total) : row.paid;
      if (!row.history) running += row.tenant - received;
      return { ...row, reportedTotal, received, postedTenant, postedHousing, receipts,
        running: row.history ? null : Math.round(running * 100) / 100,
        unmatched: report ? number(report.tenant_payment_not_yet_posted) : Math.max(0, received - postedTenant),
      };
    });
  }, [roxana, details, tenantLedger]);

  const mismatch = roxana && (details.schedule?.months || []).some((row) => {
    const reference = reportMonths.find((item) => item.month === row.month);
    return reference && (Math.abs(number(row.mha) - reference.housing) >= .01 ||
      Math.abs(number(row.rent) - reference.rent) >= .01);
  });
  const currentRows = rows.filter((row) => !row.history);
  const totalDue = currentRows.reduce((sum, row) => sum + row.tenant, 0);
  const totalPaid = currentRows.reduce((sum, row) => sum + row.received, 0);
  const totalFees = tenantLedger.filter((entry) => String(entry.category || "").toUpperCase() === "LATE_FEE")
    .reduce((sum, entry) => sum + (["CHARGE", "ADJUSTMENT"].includes(entry.entry_type) ? 1 : -1) * number(entry.amount), 0);
  const tenantRentBalance = totalDue - totalPaid;
  const postedReceipts = tenantLedger.filter((entry) => entry.entry_type === "PAYMENT" && !isHousing(entry))
    .reduce((sum, entry) => sum + number(entry.amount), 0);
  const outstandingPosted = currentRows.reduce((sum, row) => sum + row.received - row.postedTenant, 0);
  const download = () => {
    const data = [
      ["SyncWorks Property Management — Tenant Review", property?.name || "", tenant?.full_name || [tenant?.first_name, tenant?.last_name].filter(Boolean).join(" ")],
      ["Scope", roxana ? "Owner-reported January–October 2026 with February–October reconciliation" : "Saved monthly schedule and ledger review"],
      ["Status", "Provisional — verify source receipts and original rent allocations before issuing formal statement"],
      [],
      ["Month", "Contract rent", "MHA scheduled", "MHA abated (not collectible)", "Tenant rent due", "Owner reported paid (all sources)", "Tenant reported paid", "Posted tenant payments by receipt month", "Posted MHA receipts by receipt month", "Running rent balance (excluding former-manager reference month)", "Notes"],
      ...rows.map((row) => [row.month, row.rent.toFixed(2), row.housing.toFixed(2), number(row.abated).toFixed(2),
        row.tenant.toFixed(2), row.reportedTotal === null ? "" : number(row.reportedTotal).toFixed(2),
        row.history ? "" : row.received.toFixed(2), row.postedTenant.toFixed(2), row.postedHousing.toFixed(2),
        row.running === null ? "" : row.running.toFixed(2), row.note || ""]),
      [],
      ["Rent owed by tenant (scope)", totalDue.toFixed(2)],
      ["Tenant paid reported (scope)", totalPaid.toFixed(2)],
      ["Tenant rent difference", tenantRentBalance.toFixed(2)],
      ["Posted late fees (separate)", totalFees.toFixed(2)],
      ["Provisional tenant balance including posted fees", (tenantRentBalance + totalFees).toFixed(2)],
      ["Tenant receipts posted in entire ledger (not same as owner reported)", postedReceipts.toFixed(2)],
      [],
      ["External reconciliation", "Amount", "Status"],
      ["Mar–Jun 2026 MHA reportedly paid to Adair", roxana ? "312.00" : "", "Disputed; verify agency records and former-manager bank reconciliation"],
      ["Jul + Sep 2026 MHA reported held or pending", roxana ? "455.00" : "", "Unverified receipt; exclude from tenant debt"],
      ["October 2026 MHA abatement", roxana ? "377.00" : "", "Not treated as collected or a new tenant charge"],
      ["Claimed difference to investigate", roxana ? "376.00" : "", "Unproved; do not book as received or owed"],
      ["Former property manager fees", "", "Requires owner statement, contract, invoices and bank payout history"],
      ["Security deposit", "", "Excluded from rent. Review escrow transfer separately"],
    ];
    saveCsv("SyncWorks-" + String(property?.name || "property").replace(/[^a-z0-9-]/gi, "-") + "-tenant-review.csv", data);
  };

  if (!tenants.length) return <section className="rounded-xl border border-amber-500/30 bg-[#07111f] p-4 text-xs text-amber-100">
    No tenant is confirmed on this property yet. Link the existing resident record before creating a new one.
    <button type="button" className={action + " ml-3"} onClick={() => navigate("/pm/tenants?property=" + property.id)}>Find tenant</button>
  </section>;

  return <section className="space-y-3" aria-label="Tenant monthly rent and reconciliation review">
    <div className="rounded-xl border border-cyan-400/25 bg-gradient-to-r from-cyan-500/10 via-[#07111f] to-fuchsia-500/10 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-300">SyncWorks PM · Resident accounting</p>
          <h2 className="mt-1 text-xl font-black text-white">Tenant Review & Monthly Rent</h2>
          <p className="mt-1 text-xs text-slate-400">Simple monthly boxes for owners; a preserved audit trail for accountants and former-manager transfers.</p></div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={action} onClick={download}>Export CSV · Excel / Google Sheets</button>
          <button type="button" className={action} onClick={() => setSheetsHint((value) => !value)}>Google Sheets instructions</button>
        </div>
      </div>
      {sheetsHint && <p className="mt-2 rounded-lg border border-cyan-400/20 p-3 text-xs text-slate-300">Export the CSV, open Google Sheets, then choose File → Import → Upload. The export contains no live Google account connection or automatic sync.</p>}
      <label className="mt-3 block max-w-sm text-xs font-bold text-slate-300">Tenant
        <select className={field + " mt-1 w-full"} value={tenantId} onChange={(event) => setTenantId(event.target.value)}>
          {tenants.map((item) => <option key={item.id} value={item.id}>{item.full_name || [item.first_name, item.last_name].filter(Boolean).join(" ")}</option>)}
        </select>
      </label>
      {loading && <p className="mt-2 text-xs text-slate-400">Checking existing schedule and receipt evidence…</p>}
      {error && <p role="alert" className="mt-2 text-xs text-amber-200">{error}</p>}
      {mismatch && <p role="alert" className="mt-3 rounded-lg border border-amber-400/30 bg-amber-500/5 p-3 text-xs text-amber-100">
        The saved rent-schedule draft conflicts with the latest Roxana owner/MHA figures. The review below uses the updated reported figures. Confirm the written determination before posting rent corrections.
      </p>}
      <p className="mt-3 text-xs text-amber-200">Owner-reported payments are not automatically bank-verified or added to the live ledger. Figures below are provisional until receipts, rent splits, prior-manager records and late fees are reconciled.</p>
    </div>
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {[
        ["Tenant rent scheduled", totalDue, "Excludes January prior-manager reference"],
        ["Tenant payments reported", totalPaid, "Not all receipt dates are matched"],
        ["Unpaid tenant rent · provisional", tenantRentBalance, "Carryovers included; no MHA receivables"],
        ["Rent + recorded late fees", tenantRentBalance + totalFees, "Fee validity requires lease review"],
      ].map(([label, value, hint]) => <div key={label} className="rounded-xl border border-slate-700 bg-[#07111f] p-3">
        <div className="text-[10px] text-slate-400">{label}</div><div className="mt-1 text-lg font-black text-white">{usd(value)}</div>
        <p className="mt-1 text-[10px] leading-4 text-slate-500">{hint}</p>
      </div>)}
    </div>
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h3 className="text-sm font-black text-white">Monthly rent & payment history</h3>
          <p className="mt-1 text-[11px] text-slate-400">Select any month for posted transaction dates. Each Add payment opens the existing audited payment-entry screen.</p></div>
        <button type="button" className={action} onClick={() => navigate("/pm/rent-correction?tenant=" + tenantId)}>Edit monthly rent splits</button>
      </div>
      {rows.length ? <div className="grid gap-2 xl:grid-cols-2">{rows.map((row) => <article key={row.month}
        className="rounded-xl border border-slate-700 bg-[#07111f] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h4 className="text-sm font-black text-white">{monthLabel(row.month)}</h4>
            <span className="text-[10px] text-slate-500">{row.history ? "Prior-manager reference (not recharged)" : row.abated ? "MHA abatement tracked separately" : "Monthly rent account"}</span></div>
          <div className="text-right"><div className="text-[10px] text-slate-400">Contract rent</div>
            <div className="text-base font-black text-white">{usd(row.rent)}</div></div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 rounded-lg border border-cyan-400/10 bg-black/20 p-2">
          <div><div className="text-[10px] text-slate-500">MHA share</div><div className="text-xs font-bold text-cyan-200">{row.abated ? "Abated " + usd(row.abated) : usd(row.housing)}</div></div>
          <div><div className="text-[10px] text-slate-500">Tenant due</div><div className="text-xs font-bold text-white">{usd(row.tenant)}</div></div>
          <div><div className="text-[10px] text-slate-500">Paid reported</div><div className="text-xs font-bold text-emerald-200">{row.reportedTotal === null ? "Not supplied" : usd(row.reportedTotal)}</div></div>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <span className="text-slate-400">Carried tenant rent balance: <strong className="text-white">{row.running === null ? "Prior manager" : row.running < 0 ? usd(-row.running) + " credit" : usd(row.running)}</strong></span>
          {row.unmatched > .005 && !row.history ? <span className="text-amber-200">{usd(row.unmatched)} reported but not posted this month</span> : null}
        </div>
        {row.note && <p className="mt-2 text-[10px] leading-4 text-slate-400">{row.note}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={action} onClick={() => setExpanded(expanded === row.month ? "" : row.month)}>
            {expanded === row.month ? "Hide" : "View"} posted receipts ({row.receipts.length})
          </button>
          {!row.history && <button type="button" className={action} onClick={() => navigate("/pm/payments?tenant=" + tenantId + "&property=" + property.id + "&add=1&rent_month=" + row.month)}>+ Add payment</button>}
        </div>
        {expanded === row.month && <div className="mt-2 space-y-1 rounded-lg border border-slate-700 bg-black/20 p-2">
          {row.receipts.length ? row.receipts.map((entry) => <div key={entry.id} className="flex flex-wrap justify-between gap-2 text-[11px] text-slate-300">
            <span>{entry.entry_date} · {isHousing(entry) ? "MHA" : "Tenant"} · {entry.payment_method || "Other"}{entry.reference ? " · " + entry.reference : ""}</span>
            <strong>{usd(entry.amount)}</strong>
          </div>) : <p className="text-xs text-slate-500">No individually dated receipt is posted for this payment month yet.</p>}
        </div>}
      </article>)}</div> : <div className="rounded-xl border border-dashed border-slate-700 p-4 text-xs text-slate-400">
        No monthly schedule has been entered for this tenant. Use Edit monthly rent splits to create the first draft.
      </div>}
    </section>
    <section className="rounded-xl border border-amber-400/20 bg-[#07111f] p-3">
      <h3 className="text-sm font-black text-white">Former manager & MHA reconciliation</h3>
      <p className="mt-1 text-[11px] text-slate-400">Agency and prior-manager amounts must not inflate tenant arrears or appear as collected cash without supporting records.</p>
      {roxana ? <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[["MHA paid to Adair · Mar–Jun", 312, "Disputed remittance / recovery"],
          ["MHA reportedly pending · Jul & Sep", 455, "Not recorded as owner receipts"],
          ["October MHA abated", 377, "Not a tenant charge"],
          ["Reported $376 difference", 376, "Investigate; not proven owed"]
        ].map(([name, value, hint]) => <div key={name} className="rounded-lg border border-slate-700 p-2.5">
          <div className="text-[10px] text-slate-400">{name}</div><div className="mt-1 text-base font-black">{usd(value)}</div>
          <div className="mt-1 text-[10px] text-amber-200">{hint}</div></div>)}
      </div> : <p className="mt-3 text-xs text-slate-400">Use Setup & Transfer for former-manager balances and the assistance evidence log for unresolved housing funds.</p>}
      <div className="mt-3 rounded-lg border border-slate-700/70 p-3 text-[11px] text-slate-300">
        <strong>Security deposit and PM fees are separate.</strong> Match the historical Adair owner statement, contracted management fees, deposit transfer, bank payouts and MHA remittances before marking any amount reconciled.
        {details.external.length ? <span className="block mt-1 text-cyan-200">{details.external.length} external evidence record(s) available in the full ledger.</span> : null}
      </div>
      {Math.abs(outstandingPosted) > .01 && <p className="mt-2 text-[11px] text-amber-200">Owner-reported and individually posted tenant receipt totals differ by {usd(Math.abs(outstandingPosted))} for the displayed periods. Only enter the missing receipts after matching real dates and bank references.</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={action} onClick={() => navigate("/pm/handoff?property=" + property.id)}>Setup & transfer</button>
        <button type="button" className={action} onClick={() => navigate("/pm/payments?tenant=" + tenantId)}>Full ledger & evidence</button>
        <button type="button" className={action} onClick={() => navigate("/pm/investors")}>Owner statements & PM fees</button>
      </div>
    </section>
    <p className="text-[11px] text-slate-500">No financial records were removed or changed by this review. Corrections must use the audited rent-reconciliation / reversal workflows, preserving the original transaction history.</p>
  </section>;
}
