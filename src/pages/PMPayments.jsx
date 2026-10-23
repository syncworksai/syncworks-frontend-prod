import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/client";
import Button from "../components/ui/Button";
import PMBillingPolicyEditor from "../components/pm/PMBillingPolicyEditor";

const inputClass = "min-h-10 w-full rounded-xl border border-slate-700 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/70 sm:min-h-11 sm:rounded-2xl sm:px-3.5 sm:py-2.5";
const list = (d) => (Array.isArray(d?.results) ? d.results : Array.isArray(d) ? d : []);
const today = new Date().toISOString().slice(0, 10);
const money = (v) => Number(v || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
const paymentMethods = ["CASH", "CHECK", "ACH", "CARD", "MONEY_ORDER", "HOUSING_AUTHORITY", "OTHER"];
const blankEntry = { tenant: "", entry_date: today, entry_type: "PAYMENT", amount: "", category: "RENT_TENANT", payment_method: "CASH", reference: "", memo: "", payer: "TENANT" };
const ledgerFilters = [
  ["ALL", "All"],
  ["DEBITS", "Charges & Debits"],
  ["CREDITS", "Payments & Credits"],
  ["LATE_FEE", "Late Fees"],
  ["TENANT", "Tenant"],
  ["HOUSING", "Assistance administrator"],
];

function Field({ label, children }) {
  return <label className="block min-w-0"><span className="mb-1 block text-[11px] font-semibold text-slate-300 sm:mb-1.5 sm:text-xs">{label}</span>{children}</label>;
}

function Drawer({ title, onClose, children, width = "max-w-xl" }) {
  return (
    <div className="fixed inset-0 z-[220] bg-black/75 backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className={`ml-auto flex h-full w-full ${width} flex-col border-l border-cyan-400/30 bg-[#050c16] shadow-2xl shadow-cyan-950/40`}>
        <div className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-cyan-500/20 bg-[#050c16]/95 px-4 py-4 backdrop-blur sm:px-5">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-300">Property Management</div>
            <h2 className="mt-1 text-xl font-black sm:text-2xl">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-sm font-black text-cyan-100 hover:bg-cyan-500/20">Close ✕</button>
        </div>
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 pb-[calc(2rem+var(--sw-ios-safe-bottom))] pt-4 sm:px-5 sm:py-5">{children}</div>
      </aside>
    </div>
  );
}

const bucketFor = (row) => String(row.category || "").toUpperCase() === "RENT_HOUSING" || row.payment_method === "HOUSING_AUTHORITY" ? "HOUSING" : "TENANT";
const categoryFor = (payer, category) => String(category || "RENT").startsWith("RENT") ? (payer === "HOUSING" ? "RENT_HOUSING" : "RENT_TENANT") : category;
const isCredit = (row) => ["PAYMENT", "CREDIT"].includes(String(row.entry_type || "").toUpperCase());
const matchesLedgerFilter = (row, filter) => {
  if (filter === "ALL") return true;
  if (filter === "DEBITS") return ["CHARGE", "ADJUSTMENT"].includes(String(row.entry_type || "").toUpperCase());
  if (filter === "CREDITS") return isCredit(row);
  if (filter === "LATE_FEE") return String(row.category || "").toUpperCase() === "LATE_FEE";
  if (filter === "TENANT") return bucketFor(row) === "TENANT";
  if (filter === "HOUSING") return bucketFor(row) === "HOUSING";
  return true;
};

export default function PMPayments() {
  const [params, setParams] = useSearchParams();
  const [workspace, setWorkspace] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [entries, setEntries] = useState([]);
  const [billing, setBilling] = useState({ tenants: [], total_due: "0", total_past_due: "0", past_due_accounts: 0 });
  const [filterTenant, setFilterTenant] = useState(params.get("tenant") || "");
  const [propertyFilter, setPropertyFilter] = useState(params.get("property") || "");
  const [ledgerFilter, setLedgerFilter] = useState("ALL");
  const [auditExpectedRent, setAuditExpectedRent] = useState("");
  const [auditMonthsBack, setAuditMonthsBack] = useState(0);
  const [recon, setRecon] = useState(null);
  const [reconPreview, setReconPreview] = useState(null);
  const [reconConfirmed, setReconConfirmed] = useState(false);
  const [reconBusy, setReconBusy] = useState(false);
  const [reconError, setReconError] = useState("");
  const [allocation, setAllocation] = useState(null);
  const [externalRecords, setExternalRecords] = useState([]);
  const [depositStatus, setDepositStatus] = useState(null);
  const [externalBusy, setExternalBusy] = useState(false);
  const [externalError, setExternalError] = useState("");
  const [lateForm, setLateForm] = useState(null);
  const [latePreview, setLatePreview] = useState(null);
  const [lateAgreed, setLateAgreed] = useState(false);
  const [lateBusy, setLateBusy] = useState(false);
  const [lateError, setLateError] = useState("");
  const [externalForm, setExternalForm] = useState({ category: "HAP_PAID_TO_FORMER_MANAGER", period: today.slice(0, 7), amount: "", evidence_status: "REPORTED", note: "" });
  const [drawer, setDrawer] = useState(params.get("add") === "1" ? "entry" : "");
  const [entry, setEntry] = useState({ ...blankEntry, tenant: params.get("tenant") || "" });
  const [editing, setEditing] = useState(null);
  const [payer, setPayer] = useState({ profile: {}, buckets: { tenant_owes: "0", housing_owes: "0", total_balance: "0" } });
  const [selectedIds, setSelectedIds] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [drawerError, setDrawerError] = useState("");
  const headers = workspace?.id ? { "X-PM-Workspace-ID": String(workspace.id) } : {};

  async function load() {
    try {
      setError("");
      const ws = (await api.get("/pm-hub/workspaces/current/")).data;
      setWorkspace(ws);
      const h = { "X-PM-Workspace-ID": String(ws.id) };
      const [t, e, b] = await Promise.all([
        api.get("/pm-hub/tenants/", { headers: h }),
        api.get("/pm-hub/ledger/", { headers: h }),
        api.get("/pm-hub/billing/summary/", { headers: h }),
      ]);
      setTenants(list(t.data));
      setEntries(list(e.data));
      setBilling(b.data || {});
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not load ledgers.");
    }
  }

  async function loadPayer(id) {
    if (!id || !workspace) return setPayer({ profile: {}, buckets: { tenant_owes: "0", housing_owes: "0", total_balance: "0" } });
    try {
      const r = await api.get(`/pm-hub/billing/tenants/${id}/payer-profile/`, { headers });
      setPayer(r.data || {});
    } catch {
      setPayer({ profile: {}, buckets: { tenant_owes: "0", housing_owes: "0", total_balance: "0" } });
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { loadPayer(filterTenant); }, [filterTenant, workspace?.id]);
  useEffect(() => {
    let live = true;
    if (!filterTenant || !workspace?.id) {
      setAllocation(null); setExternalRecords([]); setDepositStatus(null); return undefined;
    }
    const id = filterTenant;
    const h = { "X-PM-Workspace-ID": String(workspace.id) };
    Promise.all([
      api.get(`/pm-hub/billing/tenants/${id}/allocations/`, { headers: h }),
      api.get(`/pm-hub/billing/tenants/${id}/external-evidence/`, { headers: h }),
      api.get(`/pm-hub/billing/tenants/${id}/deposit-status/`, { headers: h }),
    ]).then(([a, e, d]) => {
      if (live) { setAllocation(a.data); setExternalRecords(e.data?.records || []); setDepositStatus(d.data); }
    }).catch(() => {
      if (live) { setAllocation(null); setExternalRecords([]); setDepositStatus(null); }
    });
    return () => { live = false; };
  }, [filterTenant, workspace?.id, entries]);

  useEffect(() => { setSelectedIds([]); }, [filterTenant, propertyFilter, ledgerFilter]);

  const properties = useMemo(() => {
    const m = new Map();
    tenants.forEach((t) => {
      const id = t.property_id || t.property_name;
      if (id && !m.has(String(id))) m.set(String(id), { id: String(id), name: t.property_name || "Property" });
    });
    return [...m.values()];
  }, [tenants]);

  const tenantRows = useMemo(() => tenants.filter((t) => !propertyFilter || String(t.property_id || t.property_name) === String(propertyFilter)), [tenants, propertyFilter]);
  const selectedTenant = useMemo(() => tenants.find((t) => String(t.id) === String(filterTenant)) || null, [tenants, filterTenant]);
  const tenantEntries = useMemo(() => entries.filter((r) => {
    if (filterTenant && String(r.tenant) !== String(filterTenant)) return false;
    if (!propertyFilter) return true;
    const tenant = tenants.find((t) => String(t.id) === String(r.tenant));
    return String(tenant?.property_id || tenant?.property_name) === String(propertyFilter);
  }), [entries, tenants, filterTenant, propertyFilter]);
  const visibleEntries = useMemo(() => tenantEntries.filter((r) => matchesLedgerFilter(r, ledgerFilter)), [tenantEntries, ledgerFilter]);
  const summaryMap = useMemo(() => new Map((billing.tenants || []).map((r) => [String(r.tenant_id), r])), [billing]);
  const filterCounts = useMemo(() => Object.fromEntries(ledgerFilters.map(([key]) => [key, tenantEntries.filter((r) => matchesLedgerFilter(r, key)).length])), [tenantEntries]);


  // Read-only reconciliation view: charges are NOT evidence that money was paid.
  const monthlyAudit = useMemo(() => {
    const start = new Date();
    start.setDate(1);
    start.setMonth(start.getMonth() - 5 - auditMonthsBack * 6);
    const moneySum = (rows) => rows.reduce((sum, row) => sum + (["PAYMENT", "CREDIT"].includes(String(row.entry_type).toUpperCase()) ? -Number(row.amount || 0) : Number(row.amount || 0)), 0);
    return Array.from({ length: 6 }, (_, i) => {
      const month = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
      const rows = tenantEntries.filter((r) => String(r.entry_date || "").startsWith(key));
      const rent = rows.filter((r) => ["RENT", "RENT_TENANT", "RENT_HOUSING"].includes(String(r.category).toUpperCase()) && r.entry_type !== "PAYMENT");
      const tenantRent = rent.filter((r) => bucketFor(r) === "TENANT");
      const housingRent = rent.filter((r) => bucketFor(r) === "HOUSING");
      const late = rows.filter((r) => String(r.category).toUpperCase() === "LATE_FEE" && r.entry_type !== "PAYMENT");
      const payments = rows.filter((r) => r.entry_type === "PAYMENT");
      const collected = payments.reduce((sum, r) => sum + Number(r.amount || 0), 0);
      return { key, label: month.toLocaleDateString("en-US", { month: "short", year: "numeric" }), rent: moneySum(rent), tenant: moneySum(tenantRent), housing: moneySum(housingRent), late: moneySum(late), collected, paymentCount: payments.length };
    });
  }, [tenantEntries, auditMonthsBack]);
  const auditExpected = Number(auditExpectedRent || payer.profile?.contract_rent || selectedTenant?.monthly_rent || 0);
  const auditTolerance = 0.01;


  function startReconcile(monthly) {
    // Never reuse today's assistance allocation for a historical month.
    const contract = String(auditExpected || monthly.rent || "0.00");
    setRecon({
      month: monthly.key, contract_rent: contract,
      tenant_portion: String(monthly.tenant || "0.00"),
      housing_portion: String(monthly.housing || "0.00"),
      exclusion_reason: "",
      source_note: "",
    });
    setReconPreview(null);
    setReconConfirmed(false);
    setReconError("");
    setDrawer("reconcile");
  }

  function changeRecon(key, value) {
    setRecon((prev) => ({ ...prev, [key]: value }));
    setReconPreview(null);
    setReconConfirmed(false);
    setReconError("");
  }

  async function runReconciliation(apply = false) {
    if (!recon || !filterTenant || !workspace) return;
    if (apply && (!reconPreview || !reconConfirmed)) return;
    setReconBusy(true);
    setReconError("");
    try {
      const result = await api.post(`/pm-hub/billing/tenants/${filterTenant}/reconcile-month/`, {
        ...recon, apply, confirmed: apply && reconConfirmed,
      }, { headers });
      if (apply) {
        setDrawer("");
        setRecon(null);
        setReconPreview(null);
        setReconConfirmed(false);
        setMessage(`${result.data.month} rent charges reconciled; payments and late fees preserved.`);
        await load();
        await loadPayer(filterTenant);
      } else setReconPreview(result.data);
    } catch (err) {
      setReconError(err?.response?.data?.detail || "Unable to reconcile the month. Please check the amounts and try again.");
    } finally { setReconBusy(false); }
  }


  async function saveExternalEvidence() {
    if (!filterTenant || !workspace || externalBusy) return;
    setExternalError(""); setExternalBusy(true);
    try {
      const response = await api.post(`/pm-hub/billing/tenants/${filterTenant}/external-evidence/`, externalForm, { headers });
      setExternalRecords(response.data?.records || []);
      setExternalForm((old) => ({ ...old, amount: "", note: "" }));
      setMessage("External payment evidence recorded for review. No tenant or housing balance was changed.");
      setDrawer("");
    } catch (err) {
      setExternalError(err?.response?.data?.detail || "Could not save the evidence record.");
    } finally {
      setExternalBusy(false);
    }
  }


  function openLateReview(month) {
    setLateForm({
      month,
      amount: String(payer.profile?.late_fee_amount && Number(payer.profile.late_fee_amount) > 0 ? payer.profile.late_fee_amount : "50.00"),
      due_day: String(payer.profile?.rent_due_day || 1),
      grace_days: String(payer.profile?.grace_days ?? 0),
      source_note: "",
    });
    setLatePreview(null); setLateAgreed(false); setLateError("");
    setDrawer("lateReview");
  }

  async function auditLateFee(apply = false) {
    if (!lateForm || !filterTenant) return;
    setLateBusy(true); setLateError("");
    try {
      const r = await api.post(`/pm-hub/billing/tenants/${filterTenant}/verified-late-fee/`,
        { ...lateForm, apply, lease_verified: apply && lateAgreed, confirmed: apply && lateAgreed }, { headers });
      if (apply) {
        setDrawer(""); setLatePreview(null); setLateForm(null);
        setMessage(`${r.data.month}: verified late fee posted, with no duplicate rent charges or payments.`);
        await load(); await loadPayer(filterTenant);
      } else setLatePreview(r.data);
    } catch (err) { setLateError(err?.response?.data?.detail || "Unable to review the fee."); }
    finally { setLateBusy(false); }
  }

  function selectTenant(id) {
    const v = String(id || "");
    setFilterTenant(v);
    setEntry((x) => ({ ...x, tenant: v }));
    const n = new URLSearchParams(params);
    v ? n.set("tenant", v) : n.delete("tenant");
    setParams(n, { replace: true });
  }

  function openEntry(id = "") {
    const tenant = String(id || filterTenant || "");
    if (tenant) selectTenant(tenant);
    setEntry({ ...blankEntry, tenant });
    setEditing(null);
    setDrawerError("");
    setDrawer("entry");
  }

  function closeDrawer() {
    setDrawer("");
    const next = new URLSearchParams(params);
    next.delete("add");
    setParams(next, { replace: true });
  }

  function editRow(r) {
    setEditing({ ...r, payer: bucketFor(r), category: String(r.category || "RENT").startsWith("RENT") ? "RENT" : r.category });
    setDrawerError("");
    setDrawer("edit");
  }

  async function saveEntry(model, isEdit = false) {
    if (!model.tenant) return setDrawerError("Choose a tenant before saving this ledger entry.");
    if (!model.amount || Number(model.amount) <= 0) return setDrawerError("Enter an amount greater than $0 before saving.");
    setBusy(true); setError(""); setDrawerError("");
    try {
      const payload = { ...model, category: categoryFor(model.payer, model.category), payment_method: model.entry_type === "PAYMENT" ? (model.payer === "HOUSING" ? "HOUSING_AUTHORITY" : model.payment_method) : "", workspace_id: workspace.id };
      if (isEdit) await api.patch(`/pm-hub/ledger/${model.id}/`, payload, { headers });
      else await api.post("/pm-hub/ledger/", payload, { headers });
      setMessage(isEdit ? "Ledger entry updated." : "Ledger entry saved.");
      closeDrawer();
      await load();
      await loadPayer(model.tenant);
    } catch (err) {
      setDrawerError(err?.response?.data?.detail || "Could not save ledger entry.");
    } finally { setBusy(false); }
  }

  async function remove(r) {
    if (!confirm(`Delete ${r.entry_date} · ${money(r.amount)}?`)) return;
    await api.delete(`/pm-hub/ledger/${r.id}/`, { headers });
    await load();
    await loadPayer(filterTenant);
  }

  async function removeSelected() {
    if (!selectedIds.length || !confirm(`Delete ${selectedIds.length} selected entries?`)) return;
    await api.post("/pm-hub/ledger/bulk-delete/", { ids: selectedIds }, { headers });
    setSelectedIds([]);
    await load();
    await loadPayer(filterTenant);
  }

  const entryForm = (model, setter, onSave) => (
    <div className="grid gap-4 pb-6">
      {drawerError ? <div role="alert" className="rounded-2xl border border-rose-400/35 bg-rose-500/10 p-3 text-sm font-semibold text-rose-100">{drawerError}</div> : null}
      <Field label="Tenant"><select className={inputClass} value={model.tenant || ""} disabled={Boolean(model.id)} onChange={(e) => { setter({ ...model, tenant: e.target.value }); setDrawerError(""); }}><option value="">Choose tenant</option>{tenants.map((t) => <option key={t.id} value={t.id}>{t.full_name} · {t.property_name || "No property"}</option>)}</select></Field>
      <Field label="Who owes / paid this?"><div className="grid grid-cols-1 gap-2 min-[390px]:grid-cols-2">{["TENANT", "HOUSING"].map((v) => <button type="button" key={v} onClick={() => setter({ ...model, payer: v })} className={`min-w-0 rounded-2xl border p-3 text-sm font-black transition ${model.payer === v ? "border-cyan-300 bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-950/30" : "border-slate-600 bg-slate-800/80 text-white hover:border-cyan-400/60"}`}>{v === "TENANT" ? "Tenant" : "Assistance administrator"}</button>)}</div></Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Field label="Date"><input type="date" className={inputClass} value={model.entry_date || today} onChange={(e) => setter({ ...model, entry_date: e.target.value })}/></Field><Field label="Type"><select className={inputClass} value={model.entry_type} onChange={(e) => setter({ ...model, entry_type: e.target.value })}>{["CHARGE", "PAYMENT", "CREDIT", "ADJUSTMENT"].map((v) => <option key={v}>{v}</option>)}</select></Field></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Field label="Amount"><input className={inputClass} inputMode="decimal" value={model.amount || ""} onChange={(e) => setter({ ...model, amount: e.target.value })}/></Field><Field label="Category"><select className={inputClass} value={String(model.category || "RENT").replace("RENT_TENANT", "RENT").replace("RENT_HOUSING", "RENT")} onChange={(e) => setter({ ...model, category: e.target.value })}>{["RENT", "LATE_FEE", "SECURITY_DEPOSIT", "UTILITY", "REPAIR", "OTHER"].map((v) => <option key={v}>{v}</option>)}</select></Field></div>
      {model.entry_type === "PAYMENT" && model.payer !== "HOUSING" ? <Field label="Payment method"><select className={inputClass} value={model.payment_method || "CASH"} onChange={(e) => setter({ ...model, payment_method: e.target.value })}>{paymentMethods.filter((v) => v !== "HOUSING_AUTHORITY").map((v) => <option key={v}>{v}</option>)}</select></Field> : null}
      <Field label="Reference"><input className={inputClass} value={model.reference || ""} onChange={(e) => setter({ ...model, reference: e.target.value })}/></Field>
      <Field label="Memo"><textarea rows={4} className={inputClass} value={model.memo || ""} onChange={(e) => setter({ ...model, memo: e.target.value })}/></Field>
      <div className="sticky bottom-0 z-10 -mx-1 bg-[#050c16]/95 px-1 pb-[var(--sw-ios-safe-bottom)] pt-2 backdrop-blur">
        <button type="button" onClick={onSave} disabled={busy} className="min-h-12 w-full touch-manipulation rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-cyan-950/40 hover:bg-cyan-300 disabled:opacity-50">{busy ? "Saving..." : model.id ? "Save Changes" : "Save Entry"}</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen text-slate-100">
      <main className="space-y-3 px-3 py-4 sm:space-y-5 sm:px-6 sm:py-6">
        <section className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-[#07111f] to-fuchsia-500/10 p-3.5 sm:rounded-[28px] sm:p-5">
          <div className="flex flex-wrap justify-between gap-3"><div><div className="hidden text-[10px] font-black uppercase tracking-[.18em] text-cyan-300 sm:block">Tenant accounting</div><h1 className="text-xl font-black sm:mt-2 sm:text-3xl"><span className="sm:hidden">Ledger</span><span className="hidden sm:inline">Ledger Command Center</span></h1><p className="mt-2 hidden text-sm text-slate-400 sm:block">Filter charges, payments, credits, late fees, and payer buckets without losing the tenant-level view.</p></div><div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex sm:flex-wrap"><button onClick={() => openEntry()} className="rounded-xl bg-cyan-400 px-3 py-2 text-xs font-black text-slate-950 hover:bg-cyan-300 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm">+ Add Entry</button><button onClick={() => setDrawer("rules")} disabled={!filterTenant} className="rounded-xl border border-fuchsia-400/50 bg-fuchsia-500/15 px-3 py-2 text-xs font-black text-fuchsia-100 hover:bg-fuchsia-500/25 disabled:cursor-not-allowed disabled:opacity-40 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm">Lease & Billing Rules</button></div></div>
        </section>

        {error ? <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm sm:rounded-2xl sm:p-4">{error}</div> : null}
        {message ? <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm sm:rounded-2xl sm:p-4">{message}</div> : null}

        <section className="rounded-2xl border border-cyan-500/15 bg-[#07111f]/90 p-3 sm:rounded-[28px] sm:p-5">
          <div className="grid grid-cols-1 gap-2 min-[390px]:grid-cols-2 sm:gap-3"><Field label="Property"><select className={inputClass} value={propertyFilter} onChange={(e) => { setPropertyFilter(e.target.value); selectTenant(""); }}><option value="">All properties</option>{properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field><Field label="Tenant"><select className={inputClass} value={filterTenant} onChange={(e) => selectTenant(e.target.value)}><option value="">Choose tenant</option>{tenantRows.map((t) => <option key={t.id} value={t.id}>{t.full_name}{t.status === "INACTIVE" ? " · Former" : ""}</option>)}</select></Field></div>
          {filterTenant ? <div className="mt-3 grid grid-cols-3 gap-2 sm:mt-5 sm:gap-3"><div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-2.5 sm:rounded-2xl sm:p-4"><div className="text-[10px] text-slate-400 sm:text-xs">Tenant (posted)</div><div className="mt-1 text-base font-black text-cyan-300 sm:text-2xl">{money(payer.buckets?.tenant_owes)}</div></div><div className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/5 p-2.5 sm:rounded-2xl sm:p-4"><div className="text-[10px] text-slate-400 sm:text-xs">Housing (unreconciled)</div><div className="mt-1 text-base font-black text-fuchsia-300 sm:text-2xl">{money(payer.buckets?.housing_owes)}</div></div><div className="rounded-xl border border-slate-600 bg-slate-900/50 p-2.5 sm:rounded-2xl sm:p-4"><div className="text-[10px] text-slate-400 sm:text-xs">Posted balance</div><div className="mt-1 text-base font-black sm:text-2xl">{money(payer.buckets?.total_balance)}</div></div></div> : null}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-5 sm:gap-3 md:grid-cols-2 xl:grid-cols-3">{tenantRows.map((t) => { const a = summaryMap.get(String(t.id)) || {}; return <button key={t.id} onClick={() => selectTenant(t.id)} className={`rounded-xl border p-3 text-left transition sm:rounded-2xl sm:p-4 ${String(filterTenant) === String(t.id) ? "border-cyan-300 bg-cyan-500/15 shadow-lg shadow-cyan-950/20" : "border-slate-700 bg-slate-900/40 hover:border-cyan-500/40"}`}><div className="truncate text-sm font-black sm:text-base">{t.full_name}</div><div className="mt-0.5 truncate text-[11px] text-slate-400 sm:mt-1 sm:text-xs">{t.property_name || "No property"}</div><div className="mt-2 text-xs font-semibold sm:mt-3 sm:text-sm">Balance {money(a.balance)}</div></button>; })}</div>
        </section>

        {filterTenant ? <section className="rounded-xl border border-cyan-500/20 bg-[#07111f]/90 p-2.5 sm:rounded-2xl sm:p-4" aria-label="Monthly ledger reconciliation">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><h2 className="text-sm font-black text-cyan-100 sm:text-lg">Monthly reconciliation</h2><p className="text-[10px] text-slate-400 sm:text-xs">Read-only checks • no payment or late-fee changes</p></div>
            <div className="flex items-center gap-1.5"><button type="button" className="rounded-lg border border-slate-600 px-2 py-1 text-xs" onClick={() => setAuditMonthsBack((x) => Math.min(x + 1, 12))}>Older</button><button type="button" className="rounded-lg border border-slate-600 px-2 py-1 text-xs disabled:opacity-40" disabled={!auditMonthsBack} onClick={() => setAuditMonthsBack((x) => Math.max(0, x - 1))}>Newer</button></div>
          </div>
          <label className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-300">Contract rent for comparison
            <input aria-label="Expected contract rent" inputMode="decimal" className="w-28 rounded-lg border border-slate-600 bg-slate-950 px-2 py-1.5 text-xs text-white" value={auditExpectedRent} placeholder={String(payer.profile?.contract_rent || selectedTenant?.monthly_rent || "")} onChange={(e) => setAuditExpectedRent(e.target.value)} />
          </label>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {monthlyAudit.map((m) => {
              const mismatch = m.rent <= auditTolerance || (auditExpected > 0 && Math.abs(m.rent - auditExpected) > auditTolerance);
              return <article key={m.key} className={`rounded-xl border p-2.5 ${mismatch ? "border-amber-400/35 bg-amber-500/5" : "border-slate-700 bg-slate-950/55"}`}>
                <div className="flex items-center justify-between gap-2"><div className="font-black text-sm text-white">{m.label}</div><span className={`text-[10px] font-bold ${mismatch ? "text-amber-200" : "text-emerald-300"}`}>{mismatch ? "Review charges" : "Recorded"}</span></div>
                <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">
                  <div><div className="text-slate-500">Tenant charge</div><div className="font-bold">{money(m.tenant)}</div></div>
                  <div><div className="text-slate-500">Housing charge</div><div className="font-bold">{money(m.housing)}</div></div>
                  <div><div className="text-slate-500">Late fees</div><div className="font-bold">{money(m.late)}{m.late === 0 && m.rent > 0 ? <span className="ml-1 text-[9px] font-medium text-amber-300">Check rules</span> : null}</div></div>
                  <div><div className="text-slate-500">Payments posted*</div><div className="font-bold text-emerald-300">{money(m.collected)}</div></div>
                </div>
                
                <button type="button" onClick={() => startReconcile(m)} className="mt-2 min-h-9 w-full rounded-lg border border-cyan-500/35 bg-cyan-500/10 px-2 py-1.5 text-[11px] font-black text-cyan-100 hover:bg-cyan-500/20">Review / correct rent</button>
              </article>;
            })}
          </div>
          <p className="mt-2 text-[10px] text-slate-500">*Payments posted during a month may pay an older balance. A month with no late fee is a review flag, not proof a fee is owed. Verify lease/grace dates and prior receipts before adding one.</p>
          <p className="mt-2 text-[10px] leading-relaxed text-slate-400 sm:text-xs">Review historical assistance-provider portions by month before editing. A charge does not mean a payment was received. Assistance abatement, funds paid to a previous manager, disputed payments, and tenant security deposits must not be marked paid without proof. Existing late fees are preserved; any missing late fee requires a lease and payment-date check.</p>
        </section> : null}

        {filterTenant ? <section className="rounded-xl border border-cyan-500/20 bg-[#07111f]/90 p-2.5 sm:rounded-2xl sm:p-4" aria-label="Payment application and external reconciliation">
          <div className="flex items-center justify-between gap-2"><div><h2 className="text-sm font-black text-cyan-100 sm:text-lg">Payment trail & oldest-first application</h2><p className="mt-0.5 text-[10px] text-slate-400 sm:text-xs">Receipt dates never change. Each verified payment goes against the oldest eligible amount owed by its payer.</p></div><button type="button" className="min-h-9 shrink-0 rounded-lg border border-fuchsia-400/40 bg-fuchsia-500/10 px-2.5 text-[11px] font-black text-fuchsia-100" onClick={() => { setExternalError(""); setDrawer("external"); }}>+ Track funds</button></div>
          {allocation ? <>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-cyan-400/25 bg-cyan-500/5 p-2.5"><div className="text-[10px] text-slate-400">Open tenant charges*</div><div className="mt-1 font-black text-cyan-200">{money(allocation.tenant_unpaid)}</div></div>
              <div className="rounded-lg border border-fuchsia-400/25 bg-fuchsia-500/5 p-2.5"><div className="text-[10px] text-slate-400">Open housing charges*</div><div className="mt-1 font-black text-fuchsia-200">{money(allocation.housing_unpaid)}</div></div>
            </div>
            <div className="mt-2 max-h-56 space-y-1.5 overflow-y-auto">
              {allocation.allocations?.slice().reverse().slice(0, 24).map((item, i) => <div key={`${item.source_id}-${item.charge_id}-${i}`} className="flex items-center justify-between gap-2 rounded-lg border border-slate-700/70 bg-black/20 px-2.5 py-2 text-[11px]"><div className="min-w-0"><div className="font-semibold">{item.source_date} → {item.charge_month} {item.category === "LATE_FEE" ? "late fee" : "charge"}</div><div className="text-[10px] text-slate-500">{item.payer === "HOUSING" ? "Assistance provider" : "Tenant"} · {item.source_type === "PAYMENT" ? "Payment" : "Credit"}</div></div><strong className="shrink-0 text-emerald-300">{money(item.amount)}</strong></div>)}
              {!allocation.allocations?.length ? <p className="rounded-lg border border-dashed border-slate-700 p-3 text-xs text-slate-400">No payment allocations to display yet.</p> : null}
            </div>
            {Number(allocation.unapplied_tenant_receipts || 0) > 0 ? <p className="mt-2 text-[11px] text-amber-200">Unallocated tenant payments/credits: {money(allocation.unapplied_tenant_receipts)}. Review missing charges before treating this as overpayment.</p> : null}
            {allocation.late_fee_review?.some((m) => m.review_late_fee) ? <div className="mt-2 rounded-lg border border-amber-400/25 bg-amber-500/5 p-2.5"><div className="text-xs font-black text-amber-100">Late fees to investigate</div><p className="mt-1 text-[11px] leading-4 text-slate-300">Tenant rent appears unpaid at the configured grace date for the periods below. Review signed lease terms and backdated payments before assessing a fee.</p><div className="mt-2 flex flex-wrap gap-1.5">{allocation.late_fee_review.filter((m) => m.review_late_fee).map((m) => <button key={m.month} type="button" className="rounded-lg border border-amber-400/35 px-2.5 py-1.5 text-[11px] font-black text-amber-100" onClick={() => openLateReview(m.month)}>Review {m.month} →</button>)}</div></div> : null}
          </> : <p className="mt-2 text-[11px] text-slate-400">Payment allocation audit is unavailable. Ledger entries are shown below.</p>}
          <div className="mt-3 flex items-center justify-between gap-2"><div className="text-xs font-black text-white">Assistance, former manager & deposits</div><span className="text-[10px] text-slate-400">{externalRecords.length} records</span></div>
          <p className="mt-1 text-[10px] leading-4 text-slate-400">Reported or disputed funds are not marked received and do not change the tenant's debt. Deposit collection and application require separate proof.</p>
          {depositStatus ? <div className="mt-2 rounded-lg border border-amber-400/20 bg-amber-500/5 p-2.5">
            <div className="text-[11px] font-black text-amber-100">Security deposit account (separate from rent)</div>
            <div className="mt-1 grid grid-cols-3 gap-1.5 text-[10px]"><div>Received<strong className="mt-0.5 block text-xs text-white">{money(depositStatus.deposit_received)}</strong></div><div>Held<strong className="mt-0.5 block text-xs text-white">{money(depositStatus.deposit_held)}</strong></div><div>Applied<strong className="mt-0.5 block text-xs text-white">{money(depositStatus.deposit_applied)}</strong></div></div>
            <p className="mt-1.5 text-[10px] leading-4 text-slate-400">An external claim that the deposit was transferred or applied does not update these numbers. Verify the former manager's transfer, tenant agreement and any existing ledger credit before making a new adjustment.</p>
          </div> : null}
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2">{externalRecords.slice().reverse().map((row) => <article key={row.id} className="rounded-lg border border-slate-700/70 bg-black/20 p-2.5"><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-bold text-slate-200">{row.category.replaceAll("_", " ")}</span><span className="shrink-0 text-xs font-black">{money(row.amount)}</span></div><div className="mt-1 text-[10px] text-slate-400">{row.period} · {row.evidence_status}</div><p className="mt-1 text-[11px] leading-4 text-slate-300">{row.note}</p></article>)}</div>
        </section> : null}

        <section className="rounded-2xl border border-cyan-500/15 bg-[#07111f]/90 p-3 sm:rounded-[28px] sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3"><div><h2 className="text-lg font-black sm:text-xl">{filterTenant ? `${selectedTenant?.full_name || "Tenant"} ledger` : "Select a tenant"}</h2>{filterTenant ? <p className="mt-1 text-xs text-slate-400">Showing {visibleEntries.length} of {tenantEntries.length} ledger entries</p> : null}</div>{filterTenant ? <button onClick={() => openEntry(filterTenant)} className="rounded-xl bg-cyan-400 px-3 py-2 text-xs font-black text-slate-950 hover:bg-cyan-300 sm:rounded-2xl sm:px-4 sm:py-2.5 sm:text-sm">+ Add Entry</button> : null}</div>
          {filterTenant ? <>
            <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:mx-0 sm:mt-4 sm:flex-wrap sm:gap-2 sm:px-0">{ledgerFilters.map(([key, label]) => <button key={key} type="button" onClick={() => setLedgerFilter(key)} className={`flex-none rounded-full border px-2.5 py-1.5 text-[10px] font-black transition sm:px-3 sm:py-2 sm:text-xs ${ledgerFilter === key ? "border-cyan-300 bg-cyan-400 text-slate-950" : "border-slate-600 bg-slate-800/80 text-slate-100 hover:border-cyan-400/60 hover:bg-slate-700"}`}>{label} <span className="ml-1 opacity-70">{filterCounts[key] || 0}</span></button>)}</div>
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/50 p-2.5 text-xs sm:mt-4 sm:flex-wrap sm:gap-3 sm:rounded-2xl sm:p-3 sm:text-sm"><input className="h-4 w-4 flex-none" type="checkbox" checked={visibleEntries.length > 0 && visibleEntries.every((r) => selectedIds.includes(r.id))} onChange={(e) => setSelectedIds(e.target.checked ? visibleEntries.map((r) => r.id) : [])}/><span className="whitespace-nowrap">Select visible</span><button type="button" onClick={removeSelected} disabled={!selectedIds.length} className="ml-auto rounded-lg border border-rose-400/50 bg-rose-500/15 px-2.5 py-1.5 text-[10px] font-black text-rose-100 hover:bg-rose-500/25 disabled:opacity-35 sm:ml-0 sm:rounded-xl sm:px-3 sm:py-2 sm:text-xs">Delete selected ({selectedIds.length})</button></div>
            <div className="mt-2 space-y-1.5 sm:mt-3 sm:space-y-3">{visibleEntries.length ? visibleEntries.map((r) => <article key={r.id} className="rounded-xl border border-slate-700 bg-slate-950/55 px-2.5 py-2 transition hover:border-slate-600 sm:rounded-2xl sm:p-4"><div className="flex items-start justify-between gap-1.5 sm:flex-wrap sm:gap-4"><div className="flex min-w-0 flex-1 gap-2 sm:gap-3"><input className="mt-0.5 h-4 w-4 flex-none" type="checkbox" checked={selectedIds.includes(r.id)} onChange={(e) => setSelectedIds((x) => e.target.checked ? [...x, r.id] : x.filter((id) => id !== r.id))}/><div className="min-w-0"><div className="truncate text-xs font-bold sm:text-base">{r.tenant_name}</div><div className="mt-0.5 text-[10px] leading-tight text-slate-300 sm:text-xs">{r.entry_date} · {r.category} · {r.entry_type}</div><div className="mt-1 flex flex-wrap gap-1 sm:mt-2 sm:gap-2"><span className={`rounded-full border px-2 py-0.5 text-[9px] font-black sm:py-1 sm:text-[10px] ${bucketFor(r) === "HOUSING" ? "border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-200" : "border-cyan-400/40 bg-cyan-500/10 text-cyan-200"}`}>{bucketFor(r) === "HOUSING" ? "HOUSING / SECTION 8" : "TENANT"}</span><span className={`rounded-full border px-2 py-0.5 text-[9px] font-black sm:py-1 sm:text-[10px] ${isCredit(r) ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200" : "border-rose-400/40 bg-rose-500/10 text-rose-200"}`}>{isCredit(r) ? "CREDIT" : "DEBIT"}</span></div>{r.memo ? <div className="mt-1.5 line-clamp-2 max-w-3xl text-[11px] text-slate-400 sm:mt-2 sm:text-xs">{r.memo}</div> : null}</div></div><div className="ml-auto flex-none text-right"><div className={`text-sm font-black sm:text-lg ${isCredit(r) ? "text-emerald-300" : "text-rose-200"}`}>{isCredit(r) ? "−" : "+"}{money(r.amount)}</div><div className="mt-1.5 flex justify-end gap-1 sm:mt-3 sm:gap-2"><button onClick={() => editRow(r)} className="rounded-lg border border-cyan-300/60 bg-cyan-500/15 px-2 py-1.5 text-[10px] font-black text-cyan-100 hover:bg-cyan-500/25 sm:rounded-xl sm:px-3.5 sm:py-2 sm:text-xs">Edit</button><button onClick={() => remove(r)} className="rounded-lg border border-rose-300/60 bg-rose-500/15 px-2 py-1.5 text-[10px] font-black text-rose-100 hover:bg-rose-500/25 sm:rounded-xl sm:px-3.5 sm:py-2 sm:text-xs">Delete</button></div></div></div></article>) : <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">No entries match this filter.</div>}</div>
          </> : <div className="mt-5 text-sm text-slate-400">Choose a tenant account above.</div>}
        </section>
      </main>

      {drawer === "lateReview" && lateForm ? <Drawer title={`Late fee: ${lateForm.month}`} onClose={closeDrawer}>
        <div className="space-y-3 pb-6 text-sm">
          <p className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 text-xs leading-5 text-amber-100">A past-due balance alone does not prove a late fee is owed. Confirm the actual lease due date, grace period, permitted fee amount, and payment history. The assistance administrator's unpaid share is never used for this test.</p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Fee amount from lease"><input className={inputClass} inputMode="decimal" value={lateForm.amount} onChange={(e) => { setLatePreview(null); setLateAgreed(false); setLateForm((x) => ({ ...x, amount: e.target.value })); }} /></Field>
            <Field label="Due day"><input type="number" min="1" max="28" className={inputClass} value={lateForm.due_day} onChange={(e) => { setLatePreview(null); setLateAgreed(false); setLateForm((x) => ({ ...x, due_day: e.target.value })); }} /></Field>
            <Field label="Grace days"><input type="number" min="0" max="31" className={inputClass} value={lateForm.grace_days} onChange={(e) => { setLatePreview(null); setLateAgreed(false); setLateForm((x) => ({ ...x, grace_days: e.target.value })); }} /></Field>
          </div>
          <Field label="Signed lease clause and payment-date evidence"><textarea className={inputClass} rows={3} value={lateForm.source_note} onChange={(e) => { setLatePreview(null); setLateAgreed(false); setLateForm((x) => ({ ...x, source_note: e.target.value })); }} placeholder="E.g. Lease section X: $50 fee after due date; receipts reviewed..." /></Field>
          {lateError ? <p role="alert" className="rounded-lg border border-rose-400/25 bg-rose-500/10 p-3 text-xs text-rose-200">{lateError}</p> : null}
          <button type="button" onClick={() => auditLateFee(false)} disabled={lateBusy} className="min-h-11 w-full rounded-xl border border-cyan-400/40 bg-cyan-500/10 text-xs font-black text-cyan-100 disabled:opacity-40">Preview fee eligibility</button>
          {latePreview ? <div className="space-y-2 rounded-xl border border-slate-700 p-3 text-xs"><p>Tenant rent unpaid at grace deadline: <strong>{money(latePreview.unpaid_tenant_rent_at_grace)}</strong></p><p>Proposed fee: <strong>{money(latePreview.fee)}</strong> · Effective {latePreview.fee_date}</p><p className={latePreview.eligible_for_review ? "text-amber-200" : "text-emerald-200"}>{latePreview.eligible_for_review ? "Eligible for documented review; confirm lease terms before posting." : "No late fee indicated by payment timing."}</p>{latePreview.eligible_for_review ? <>
            <label className="flex items-start gap-2"><input type="checkbox" className="mt-0.5 h-4 w-4" checked={lateAgreed} onChange={(e) => setLateAgreed(e.target.checked)}/><span>I verified the signed lease, due/grace dates, charge amount, and all receipts. I authorize this single monthly fee.</span></label>
            <button type="button" onClick={() => auditLateFee(true)} disabled={!lateAgreed || lateBusy} className="min-h-11 w-full rounded-xl bg-cyan-400 text-xs font-black text-slate-950 disabled:opacity-40">Post verified late fee</button></> : null}</div> : null}
        </div>
      </Drawer> : null}
      {drawer === "external" ? <Drawer title="Record external payment evidence" onClose={closeDrawer}>
        <div className="space-y-3 pb-6 text-sm">
          <div className="rounded-xl border border-amber-400/25 bg-amber-500/5 p-3 text-xs leading-5 text-amber-100">Record payments an assistance administrator reports sending to a former manager, held funds, former-manager distributions, or disputed deposits. It is not a rent payment and will not reduce the balance.</div>
          <Field label="Type"><select className={inputClass} value={externalForm.category} onChange={(e) => setExternalForm((x) => ({ ...x, category: e.target.value }))}>
            {[["HAP_PAID_TO_FORMER_MANAGER", "Assistance paid former manager"], ["HAP_ON_HOLD", "Assistance payment held"], ["HAP_RETURN_CLAIM", "Former manager reports payment returned"], ["FORMER_MANAGER_DISTRIBUTION", "Former manager paid owner"], ["TENANT_PAID_FORMER_MANAGER", "Tenant paid former manager"], ["DEPOSIT_COLLECTION_CLAIM", "Deposit reportedly collected"], ["DEPOSIT_TRANSFER_CLAIM", "Deposit reportedly transferred"], ["DEPOSIT_APPLIED_CLAIM", "Deposit reportedly applied to rent"], ["OTHER_UNVERIFIED", "Other external amount"]].map(([v, name]) => <option value={v} key={v}>{name}</option>)}
          </select></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Period"><input type="month" className={inputClass} value={externalForm.period} onChange={(e) => setExternalForm((x) => ({ ...x, period: e.target.value }))}/></Field>
            <Field label="Amount"><input inputMode="decimal" className={inputClass} placeholder="0.00" value={externalForm.amount} onChange={(e) => setExternalForm((x) => ({ ...x, amount: e.target.value }))}/></Field>
          </div>
          <Field label="Evidence"><select className={inputClass} value={externalForm.evidence_status} onChange={(e) => setExternalForm((x) => ({ ...x, evidence_status: e.target.value }))}>{["UNVERIFIED", "REPORTED", "DOCUMENTED", "DISPUTED", "RESOLVED"].map((v) => <option value={v} key={v}>{v}</option>)}</select></Field>
          <Field label="Source / explanation"><textarea rows={3} className={inputClass} value={externalForm.note} placeholder="E.g., administrator statement dated…, previous manager ledger pending" onChange={(e) => setExternalForm((x) => ({ ...x, note: e.target.value }))} /></Field>
          {externalError ? <div role="alert" className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-200">{externalError}</div> : null}
          <button type="button" disabled={externalBusy} onClick={saveExternalEvidence} className="min-h-11 w-full rounded-xl bg-cyan-400 px-3 font-black text-slate-950 disabled:opacity-40">{externalBusy ? "Saving…" : "Save evidence (no balance change)"}</button>
        </div>
      </Drawer> : null}
      {drawer === "reconcile" && recon ? <Drawer title={`Review ${recon.month} Rent`} onClose={closeDrawer}>
        <div className="space-y-3 pb-5 text-sm">
          <p className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 text-xs leading-5 text-amber-100">Use the payer split that applied to this month, not the current split. If assistance was abated, do not transfer its portion to the tenant. Preview before applying; existing payments, late fees and deposits are unchanged.</p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Month"><div className="rounded-lg border border-slate-700 px-3 py-2 text-sm">{recon.month}</div></Field>
            <Field label="Contract rent"><input className={inputClass} inputMode="decimal" value={recon.contract_rent} onChange={(e) => changeRecon("contract_rent", e.target.value)} /></Field>
            <Field label="Tenant rent charge"><input className={inputClass} inputMode="decimal" value={recon.tenant_portion} onChange={(e) => changeRecon("tenant_portion", e.target.value)} /></Field>
            <Field label="Housing rent charge"><input className={inputClass} inputMode="decimal" value={recon.housing_portion} onChange={(e) => changeRecon("housing_portion", e.target.value)} /></Field>
          </div>
          <Field label="Why any contract rent is not billable (abatement, etc.)"><textarea rows={2} className={inputClass} value={recon.exclusion_reason} onChange={(e) => changeRecon("exclusion_reason", e.target.value)} /></Field>
          <Field label="Supporting document / explanation"><textarea rows={2} className={inputClass} value={recon.source_note} onChange={(e) => changeRecon("source_note", e.target.value)} /></Field>
          {reconError ? <div role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-200">{reconError}</div> : null}
          <button type="button" disabled={reconBusy} onClick={() => runReconciliation(false)} className="min-h-11 w-full rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-3 text-xs font-black text-cyan-100 disabled:opacity-40">{reconBusy ? "Checking…" : "Preview changes"}</button>
          {reconPreview ? <div className="space-y-2 rounded-xl border border-emerald-400/25 bg-emerald-500/5 p-3">
            <div className="text-xs font-black text-emerald-200">Before → adjustment → proposed</div>
            <div className="flex justify-between gap-2 text-xs"><span>Tenant rent: {money(reconPreview.recorded_tenant_charges)}</span><strong>{Number(reconPreview.tenant_charge_adjustment) >= 0 ? "+" : ""}{money(reconPreview.tenant_charge_adjustment)}</strong></div>
            <div className="flex justify-between gap-2 text-xs"><span>Housing rent: {money(reconPreview.recorded_housing_charges)}</span><strong>{Number(reconPreview.housing_charge_adjustment) >= 0 ? "+" : ""}{money(reconPreview.housing_charge_adjustment)}</strong></div>
            {Number(reconPreview.excluded_from_charges) > 0 ? <p className="text-xs text-amber-100">{money(reconPreview.excluded_from_charges)} of contract rent is excluded from charges; it is not added to the tenant's debt.</p> : null}
            <p className="text-[11px] text-slate-300">Existing late fees {money(reconPreview.preserved_late_fees)} remain. Payments posted in this month remain unchanged.</p>
            <label className="flex items-start gap-2 text-xs"><input type="checkbox" className="mt-0.5 h-4 w-4" checked={reconConfirmed} onChange={(e) => setReconConfirmed(e.target.checked)} /><span>I have verified this month's split against the lease/MHA records and understand that the rent ledger will change.</span></label>
            <button type="button" disabled={!reconConfirmed || reconBusy} onClick={() => runReconciliation(true)} className="min-h-11 w-full rounded-xl bg-cyan-400 px-3 text-xs font-black text-slate-950 disabled:opacity-40">Apply verified corrections</button>
          </div> : null}
        </div>
      </Drawer> : null}
      {drawer === "entry" ? <Drawer title="Add Ledger Entry" onClose={closeDrawer}>{entryForm(entry, setEntry, () => saveEntry(entry))}</Drawer> : null}
      {drawer === "edit" && editing ? <Drawer title="Edit Ledger Entry" onClose={closeDrawer}>{entryForm(editing, setEditing, () => saveEntry(editing, true))}</Drawer> : null}
      {drawer === "rules" ? <Drawer title="Lease & Billing Rules" width="max-w-4xl" onClose={closeDrawer}><PMBillingPolicyEditor workspace={workspace} tenant={selectedTenant} onRefresh={async () => { await load(); await loadPayer(filterTenant); }}/></Drawer> : null}
    </div>
  );
}
