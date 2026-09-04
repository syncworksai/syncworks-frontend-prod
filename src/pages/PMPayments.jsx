import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/client";
import Button from "../components/ui/Button";
import PMBillingPolicyEditor from "../components/pm/PMBillingPolicyEditor";

const inputClass = "min-h-11 w-full rounded-2xl border border-slate-700 bg-black/35 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400/70";
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
  ["HOUSING", "Housing / Section 8"],
];

function Field({ label, children }) {
  return <label className="block min-w-0"><span className="mb-1.5 block text-xs font-semibold text-slate-300">{label}</span>{children}</label>;
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
      <Field label="Who owes / paid this?"><div className="grid grid-cols-1 gap-2 min-[390px]:grid-cols-2">{["TENANT", "HOUSING"].map((v) => <button type="button" key={v} onClick={() => setter({ ...model, payer: v })} className={`min-w-0 rounded-2xl border p-3 text-sm font-black transition ${model.payer === v ? "border-cyan-300 bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-950/30" : "border-slate-600 bg-slate-800/80 text-white hover:border-cyan-400/60"}`}>{v === "TENANT" ? "Tenant" : "Housing / Section 8"}</button>)}</div></Field>
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
      <main className="space-y-5 px-4 py-6 sm:px-6">
        <section className="rounded-[28px] border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-[#07111f] to-fuchsia-500/10 p-5">
          <div className="flex flex-wrap justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-300">Tenant accounting</div><h1 className="mt-2 text-3xl font-black">Ledger Command Center</h1><p className="mt-2 text-sm text-slate-400">Filter charges, payments, credits, late fees, and payer buckets without losing the tenant-level view.</p></div><div className="flex flex-wrap gap-2"><button onClick={() => openEntry()} className="rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300">+ Add Entry</button><button onClick={() => setDrawer("rules")} disabled={!filterTenant} className="rounded-2xl border border-fuchsia-400/50 bg-fuchsia-500/15 px-4 py-3 text-sm font-black text-fuchsia-100 hover:bg-fuchsia-500/25 disabled:cursor-not-allowed disabled:opacity-40">Lease & Billing Rules</button></div></div>
        </section>

        {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">{error}</div> : null}
        {message ? <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">{message}</div> : null}

        <section className="rounded-[28px] border border-cyan-500/15 bg-[#07111f]/90 p-5">
          <div className="flex flex-wrap gap-3"><Field label="Property"><select className={inputClass} value={propertyFilter} onChange={(e) => { setPropertyFilter(e.target.value); selectTenant(""); }}><option value="">All properties</option>{properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field><Field label="Tenant"><select className={inputClass} value={filterTenant} onChange={(e) => selectTenant(e.target.value)}><option value="">Choose tenant</option>{tenantRows.map((t) => <option key={t.id} value={t.id}>{t.full_name}{t.status === "INACTIVE" ? " · Former" : ""}</option>)}</select></Field></div>
          {filterTenant ? <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-4"><div className="text-xs text-slate-400">Tenant owes</div><div className="mt-1 text-2xl font-black text-cyan-300">{money(payer.buckets?.tenant_owes)}</div></div><div className="rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/5 p-4"><div className="text-xs text-slate-400">Housing owes</div><div className="mt-1 text-2xl font-black text-fuchsia-300">{money(payer.buckets?.housing_owes)}</div></div><div className="rounded-2xl border border-slate-600 bg-slate-900/50 p-4"><div className="text-xs text-slate-400">Total balance</div><div className="mt-1 text-2xl font-black">{money(payer.buckets?.total_balance)}</div></div></div> : null}
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{tenantRows.map((t) => { const a = summaryMap.get(String(t.id)) || {}; return <button key={t.id} onClick={() => selectTenant(t.id)} className={`rounded-2xl border p-4 text-left transition ${String(filterTenant) === String(t.id) ? "border-cyan-300 bg-cyan-500/15 shadow-lg shadow-cyan-950/20" : "border-slate-700 bg-slate-900/40 hover:border-cyan-500/40"}`}><div className="font-black">{t.full_name}</div><div className="mt-1 text-xs text-slate-400">{t.property_name || "No property"}</div><div className="mt-3 text-sm font-semibold">Balance {money(a.balance)}</div></button>; })}</div>
        </section>

        <section className="rounded-[28px] border border-cyan-500/15 bg-[#07111f]/90 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">{filterTenant ? `${selectedTenant?.full_name || "Tenant"} ledger` : "Select a tenant"}</h2>{filterTenant ? <p className="mt-1 text-xs text-slate-400">Showing {visibleEntries.length} of {tenantEntries.length} ledger entries</p> : null}</div>{filterTenant ? <button onClick={() => openEntry(filterTenant)} className="rounded-2xl bg-cyan-400 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-cyan-300">+ Add Entry</button> : null}</div>
          {filterTenant ? <>
            <div className="mt-4 flex flex-wrap gap-2">{ledgerFilters.map(([key, label]) => <button key={key} type="button" onClick={() => setLedgerFilter(key)} className={`rounded-full border px-3 py-2 text-xs font-black transition ${ledgerFilter === key ? "border-cyan-300 bg-cyan-400 text-slate-950" : "border-slate-600 bg-slate-800/80 text-slate-100 hover:border-cyan-400/60 hover:bg-slate-700"}`}>{label} <span className="ml-1 opacity-70">{filterCounts[key] || 0}</span></button>)}</div>
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/50 p-3"><input type="checkbox" checked={visibleEntries.length > 0 && visibleEntries.every((r) => selectedIds.includes(r.id))} onChange={(e) => setSelectedIds(e.target.checked ? visibleEntries.map((r) => r.id) : [])}/><span className="text-sm">Select all visible</span><button type="button" onClick={removeSelected} disabled={!selectedIds.length} className="rounded-xl border border-rose-400/50 bg-rose-500/15 px-3 py-2 text-xs font-black text-rose-100 hover:bg-rose-500/25 disabled:opacity-35">Delete selected ({selectedIds.length})</button></div>
            <div className="mt-3 space-y-3">{visibleEntries.length ? visibleEntries.map((r) => <article key={r.id} className="rounded-2xl border border-slate-700 bg-slate-950/55 p-4 transition hover:border-slate-600"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex min-w-0 gap-3"><input type="checkbox" checked={selectedIds.includes(r.id)} onChange={(e) => setSelectedIds((x) => e.target.checked ? [...x, r.id] : x.filter((id) => id !== r.id))}/><div className="min-w-0"><div className="font-black">{r.tenant_name}</div><div className="mt-0.5 text-xs text-slate-300">{r.entry_date} · {r.category} · {r.entry_type}</div><div className="mt-2 flex flex-wrap gap-2"><span className={`rounded-full border px-2 py-1 text-[10px] font-black ${bucketFor(r) === "HOUSING" ? "border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-200" : "border-cyan-400/40 bg-cyan-500/10 text-cyan-200"}`}>{bucketFor(r) === "HOUSING" ? "HOUSING / SECTION 8" : "TENANT"}</span><span className={`rounded-full border px-2 py-1 text-[10px] font-black ${isCredit(r) ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200" : "border-rose-400/40 bg-rose-500/10 text-rose-200"}`}>{isCredit(r) ? "CREDIT" : "DEBIT"}</span></div>{r.memo ? <div className="mt-2 max-w-3xl text-xs text-slate-400">{r.memo}</div> : null}</div></div><div className="ml-auto text-right"><div className={`text-lg font-black ${isCredit(r) ? "text-emerald-300" : "text-rose-200"}`}>{isCredit(r) ? "−" : "+"}{money(r.amount)}</div><div className="mt-3 flex justify-end gap-2"><button onClick={() => editRow(r)} className="rounded-xl border border-cyan-300/60 bg-cyan-500/15 px-3.5 py-2 text-xs font-black text-cyan-100 hover:bg-cyan-500/25">Edit</button><button onClick={() => remove(r)} className="rounded-xl border border-rose-300/60 bg-rose-500/15 px-3.5 py-2 text-xs font-black text-rose-100 hover:bg-rose-500/25">Delete</button></div></div></div></article>) : <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">No entries match this filter.</div>}</div>
          </> : <div className="mt-5 text-sm text-slate-400">Choose a tenant account above.</div>}
        </section>
      </main>

      {drawer === "entry" ? <Drawer title="Add Ledger Entry" onClose={closeDrawer}>{entryForm(entry, setEntry, () => saveEntry(entry))}</Drawer> : null}
      {drawer === "edit" && editing ? <Drawer title="Edit Ledger Entry" onClose={closeDrawer}>{entryForm(editing, setEditing, () => saveEntry(editing, true))}</Drawer> : null}
      {drawer === "rules" ? <Drawer title="Lease & Billing Rules" width="max-w-4xl" onClose={closeDrawer}><PMBillingPolicyEditor workspace={workspace} tenant={selectedTenant} onRefresh={async () => { await load(); await loadPayer(filterTenant); }}/></Drawer> : null}
    </div>
  );
}
