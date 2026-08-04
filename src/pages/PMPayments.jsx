import React, { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import Button from "../components/ui/Button";
import PMCollectionsAndLeaseRules from "../components/pm/PMCollectionsAndLeaseRules";

const inputClass = "min-h-11 w-full rounded-2xl border border-slate-700 bg-black/35 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/70";
const list = (data) => Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
const today = new Date().toISOString().slice(0, 10);
const entryTypes = ["CHARGE", "PAYMENT", "CREDIT", "ADJUSTMENT"];
const categories = ["RENT", "LATE_FEE", "SECURITY_DEPOSIT", "UTILITY", "REPAIR", "OTHER"];
const paymentMethods = ["CASH", "CHECK", "ACH", "CARD", "MONEY_ORDER", "HOUSING_AUTHORITY", "OTHER"];
const blankEntry = { tenant: "", entry_date: today, entry_type: "PAYMENT", amount: "", category: "RENT", payment_method: "CASH", reference: "", memo: "" };
const defaultBilling = { rent_due_day: 1, grace_days: 5, late_fee_type: "FLAT", late_fee_amount: "0.00", auto_charge_rent: true, auto_charge_late_fee: false, charge_security_deposit: true, billing_start_date: "" };
const money = (value) => Number(value || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });

function Field({ label, children }) { return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-300">{label}</span>{children}</label>; }
function errorText(err, fallback) { const data = err?.response?.data; if (data?.detail) return data.detail; if (data && typeof data === "object") return Object.entries(data).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`).join(" · "); return fallback; }

export default function PMPayments() {
  const [workspace, setWorkspace] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState({ total_due: "0.00", tenants: [] });
  const [billingSummary, setBillingSummary] = useState({ total_due: "0.00", total_past_due: "0.00", past_due_accounts: 0, tenants: [] });
  const [entry, setEntry] = useState(blankEntry);
  const [filterTenant, setFilterTenant] = useState("");
  const [billingTenant, setBillingTenant] = useState("");
  const [billing, setBilling] = useState(defaultBilling);
  const [billingAccount, setBillingAccount] = useState(null);
  const [throughDate, setThroughDate] = useState(today);
  const [editing, setEditing] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function load() {
    try {
      setError("");
      const ws = await api.get("/pm-hub/workspaces/current/");
      setWorkspace(ws.data);
      const headers = { "X-PM-Workspace-ID": String(ws.data.id) };
      const cacheBust = Date.now();
      const [tenantResponse, entryResponse, summaryResponse, billingResponse] = await Promise.all([
        api.get(`/pm-hub/tenants/?_=${cacheBust}`, { headers }),
        api.get(`/pm-hub/ledger/${filterTenant ? `?tenant=${filterTenant}&_=${cacheBust}` : `?_=${cacheBust}`}`, { headers }),
        api.get(`/pm-hub/ledger/summary/?_=${cacheBust}`, { headers }),
        api.get(`/pm-hub/billing/summary/?_=${cacheBust}`, { headers }),
      ]);
      const tenantRows = list(tenantResponse.data);
      const ledgerRows = list(entryResponse.data);
      setTenants(tenantRows);
      setEntries(ledgerRows);
      setSelectedIds((current) => current.filter((id) => ledgerRows.some((row) => row.id === id)));
      setSummary(summaryResponse.data || { total_due: "0.00", tenants: [] });
      setBillingSummary(billingResponse.data || { total_due: "0.00", total_past_due: "0.00", past_due_accounts: 0, tenants: [] });
      if (!billingTenant && tenantRows.length) setBillingTenant(String(tenantRows[0].id));
    } catch (err) { setError(errorText(err, "Could not load tenant ledgers.")); }
  }

  useEffect(() => { load(); }, [filterTenant]);

  async function loadBillingProfile(tenantId) {
    if (!tenantId || !workspace) return;
    try {
      const headers = { "X-PM-Workspace-ID": String(workspace.id) };
      const response = await api.get(`/pm-hub/billing/tenants/${tenantId}/?_=${Date.now()}`, { headers });
      setBilling({ ...defaultBilling, ...(response.data?.profile || {}) });
      setBillingAccount(response.data?.account || null);
    } catch (err) { setError(errorText(err, "Could not load tenant billing rules.")); }
  }

  useEffect(() => { loadBillingProfile(billingTenant); }, [billingTenant, workspace?.id]);

  const selectedBalance = useMemo(() => summary.tenants?.find((row) => String(row.tenant_id) === String(filterTenant))?.balance || "0.00", [summary, filterTenant]);
  const selectedBillingSummary = useMemo(() => billingSummary.tenants?.find((row) => String(row.tenant_id) === String(billingTenant)) || billingAccount, [billingSummary, billingTenant, billingAccount]);
  const allSelected = entries.length > 0 && entries.every((row) => selectedIds.includes(row.id));

  async function saveEntry() {
    if (!entry.tenant || !entry.amount) return setError("Tenant and amount are required.");
    setSaving(true); setError(""); setMessage("");
    try {
      const headers = { "X-PM-Workspace-ID": String(workspace.id) };
      await api.post("/pm-hub/ledger/", { ...entry, payment_method: entry.entry_type === "PAYMENT" ? entry.payment_method : "", workspace_id: workspace.id }, { headers });
      setEntry({ ...blankEntry, tenant: entry.tenant }); setMessage("Ledger entry saved.");
      await Promise.all([load(), loadBillingProfile(entry.tenant)]);
    } catch (err) { setError(errorText(err, "Could not save ledger entry.")); }
    finally { setSaving(false); }
  }

  async function saveBilling() {
    if (!billingTenant) return setError("Choose a tenant account.");
    setSaving(true); setError(""); setMessage("");
    try {
      const headers = { "X-PM-Workspace-ID": String(workspace.id) };
      const response = await api.patch(`/pm-hub/billing/tenants/${billingTenant}/`, { ...billing, workspace_id: workspace.id }, { headers });
      setBilling({ ...defaultBilling, ...(response.data?.profile || {}) }); setBillingAccount(response.data?.account || null);
      setMessage("Tenant billing rules saved."); await load();
    } catch (err) { setError(errorText(err, "Could not save billing rules.")); }
    finally { setSaving(false); }
  }

  async function generateCharges() {
    if (!billingTenant) return setError("Choose a tenant account.");
    setGenerating(true); setError(""); setMessage("");
    try {
      const headers = { "X-PM-Workspace-ID": String(workspace.id) };
      const response = await api.post(`/pm-hub/billing/tenants/${billingTenant}/generate/`, { through_date: throughDate, workspace_id: workspace.id }, { headers });
      setBillingAccount(response.data?.account || null); setMessage(response.data?.detail || "Charges generated."); setFilterTenant(String(billingTenant)); await load();
    } catch (err) { setError(errorText(err, "Could not generate tenant charges.")); }
    finally { setGenerating(false); }
  }

  function beginEdit(row) { setEditing({ id: row.id, tenant: row.tenant, tenant_name: row.tenant_name, entry_date: row.entry_date, entry_type: row.entry_type, amount: row.amount, category: row.category, payment_method: row.payment_method || "", reference: row.reference || "", memo: row.memo || "" }); }

  async function saveEdit() {
    if (!editing?.id || !editing.amount) return setError("Amount is required.");
    setSaving(true); setError(""); setMessage("");
    try {
      const headers = { "X-PM-Workspace-ID": String(workspace.id) };
      await api.patch(`/pm-hub/ledger/${editing.id}/`, { entry_date: editing.entry_date, entry_type: editing.entry_type, amount: editing.amount, category: editing.category, payment_method: editing.entry_type === "PAYMENT" ? editing.payment_method : "", reference: editing.reference, memo: editing.memo, workspace_id: workspace.id }, { headers });
      const tenantId = editing.tenant; setEditing(null); setMessage("Ledger entry updated."); await Promise.all([load(), loadBillingProfile(String(tenantId))]);
    } catch (err) { setError(errorText(err, "Could not update the ledger entry.")); }
    finally { setSaving(false); }
  }

  async function deleteEntry(row) {
    if (!window.confirm(`Delete ${row.entry_date} · ${row.category} · ${money(row.amount)}?\n\nThis permanently removes it from the tenant balance.`)) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const headers = { "X-PM-Workspace-ID": String(workspace.id) };
      await api.delete(`/pm-hub/ledger/${row.id}/`, { headers });
      setEntries((current) => current.filter((item) => item.id !== row.id)); setSelectedIds((current) => current.filter((id) => id !== row.id)); setMessage("Ledger entry deleted.");
      await Promise.all([load(), loadBillingProfile(String(row.tenant))]);
    } catch (err) { setError(errorText(err, "Could not delete the ledger entry.")); }
    finally { setSaving(false); }
  }

  async function deleteSelected() {
    if (!selectedIds.length) return setError("Select at least one ledger item.");
    if (!window.confirm(`Permanently delete ${selectedIds.length} selected ledger item(s)?\n\nThis immediately changes the tenant balance.`)) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const headers = { "X-PM-Workspace-ID": String(workspace.id) };
      const response = await api.post("/pm-hub/ledger/bulk-delete/", { ids: selectedIds, workspace_id: workspace.id }, { headers });
      const removed = response.data?.deleted_ids || selectedIds;
      setEntries((current) => current.filter((row) => !removed.includes(row.id))); setSelectedIds([]); setMessage(response.data?.detail || "Selected ledger items deleted.");
      await Promise.all([load(), billingTenant ? loadBillingProfile(billingTenant) : Promise.resolve()]);
    } catch (err) { setError(errorText(err, "Could not delete selected ledger items.")); }
    finally { setSaving(false); }
  }

  function exportCsv() {
    const rows = [["entry_date", "tenant", "entry_type", "amount", "category", "payment_method", "reference", "memo"], ...entries.map((row) => [row.entry_date, row.tenant_name, row.entry_type, row.amount, row.category, row.payment_method, row.reference, row.memo])];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "syncworks-tenant-ledger.csv"; link.click(); URL.revokeObjectURL(url);
  }

  const toggle = (key, label) => <label className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-black/20 px-3 py-3 text-sm text-slate-200"><input type="checkbox" checked={Boolean(billing[key])} onChange={(event) => setBilling({ ...billing, [key]: event.target.checked })} /><span>{label}</span></label>;
  const toggleRow = (id) => setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);

  return <div className="min-h-screen bg-transparent text-slate-100"><main className="space-y-5 px-4 py-6 sm:px-6">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{[["Total Due", billingSummary.total_due, true], ["Past Due", billingSummary.total_past_due, true], ["Past Due Accounts", billingSummary.past_due_accounts, false], ["Tenant Accounts", tenants.length, false], ["Selected Balance", selectedBalance, true]].map(([label, value, isMoney]) => <div key={label} className="rounded-3xl border border-cyan-500/15 bg-[#07111f]/95 p-5"><div className="text-[10px] font-black uppercase tracking-[.18em] text-slate-500">{label}</div><div className="mt-3 text-3xl font-black text-white">{isMoney ? money(value) : value || 0}</div></div>)}</div>
    {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div> : null}
    {message ? <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">{message}</div> : null}

    <section className="rounded-[28px] border border-cyan-500/20 bg-[#07111f]/95 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-300">Automatic billing</div><h2 className="mt-2 text-xl font-black">Base rent schedule</h2><p className="mt-1 text-sm text-slate-400">Generate rent and the basic lease charge. Use Lease Rules & Collections below for multiple or daily late fees.</p></div><div className="grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-2xl border border-slate-800 bg-black/25 p-3"><div className="text-slate-500">Due</div><div className="mt-1 font-black text-white">{money(selectedBillingSummary?.amount_due)}</div></div><div className="rounded-2xl border border-rose-500/20 bg-black/25 p-3"><div className="text-slate-500">Past due</div><div className="mt-1 font-black text-rose-200">{money(selectedBillingSummary?.past_due)}</div></div><div className="rounded-2xl border border-amber-500/20 bg-black/25 p-3"><div className="text-slate-500">Late fees</div><div className="mt-1 font-black text-amber-200">{money(selectedBillingSummary?.late_fees_charged)}</div></div></div></div>
      <div className="mt-5 grid gap-4 lg:grid-cols-4"><Field label="Tenant account"><select className={inputClass} value={billingTenant} onChange={(e) => setBillingTenant(e.target.value)}><option value="">Choose tenant</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.full_name}</option>)}</select></Field><Field label="PM management start date"><input type="date" className={inputClass} value={billing.billing_start_date || ""} onChange={(e) => setBilling({ ...billing, billing_start_date: e.target.value })} /></Field><Field label="Rent due day"><input type="number" min="1" max="28" className={inputClass} value={billing.rent_due_day} onChange={(e) => setBilling({ ...billing, rent_due_day: e.target.value })} /></Field><Field label="Generate through"><input type="date" className={inputClass} value={throughDate} onChange={(e) => setThroughDate(e.target.value)} /></Field></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">{toggle("auto_charge_rent", "Generate monthly rent charges")}{toggle("charge_security_deposit", "Generate the security-deposit charge")}{toggle("auto_charge_late_fee", "Use one basic late fee")}</div>
      <div className="mt-4 flex flex-wrap gap-2"><Button tone="slate" onClick={saveBilling} disabled={saving}>{saving ? "Saving..." : "Save base rules"}</Button><Button tone="cyan" onClick={generateCharges} disabled={generating}>{generating ? "Generating..." : "Generate rent charges"}</Button></div>
    </section>

    <PMCollectionsAndLeaseRules workspace={workspace} tenantId={billingTenant} onRefresh={() => Promise.all([load(), loadBillingProfile(billingTenant)])} />

    <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
      <section className="rounded-[28px] border border-cyan-500/15 bg-[#07111f]/90 p-5"><h2 className="text-lg font-black">Add ledger entry</h2><p className="mt-1 text-xs text-slate-500">Back-date charges and payments to reconstruct an existing ledger.</p><div className="mt-5 grid gap-4"><Field label="Tenant"><select className={inputClass} value={entry.tenant} onChange={(e) => setEntry({ ...entry, tenant: e.target.value })}><option value="">Choose tenant</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.full_name} · balance {money(tenant.balance)}</option>)}</select></Field><div className="grid grid-cols-2 gap-3"><Field label="Date"><input type="date" className={inputClass} value={entry.entry_date} onChange={(e) => setEntry({ ...entry, entry_date: e.target.value })} /></Field><Field label="Type"><select className={inputClass} value={entry.entry_type} onChange={(e) => setEntry({ ...entry, entry_type: e.target.value })}>{entryTypes.map((value) => <option key={value}>{value}</option>)}</select></Field></div><div className="grid grid-cols-2 gap-3"><Field label="Amount"><input inputMode="decimal" className={inputClass} value={entry.amount} onChange={(e) => setEntry({ ...entry, amount: e.target.value })} /></Field><Field label="Category"><select className={inputClass} value={entry.category} onChange={(e) => setEntry({ ...entry, category: e.target.value })}>{categories.map((value) => <option key={value}>{value.replaceAll("_", " ")}</option>)}</select></Field></div>{entry.entry_type === "PAYMENT" ? <Field label="Payment method"><select className={inputClass} value={entry.payment_method} onChange={(e) => setEntry({ ...entry, payment_method: e.target.value })}>{paymentMethods.map((value) => <option key={value}>{value.replaceAll("_", " ")}</option>)}</select></Field> : null}<Field label="Reference / check number"><input className={inputClass} value={entry.reference} onChange={(e) => setEntry({ ...entry, reference: e.target.value })} /></Field><Field label="Memo"><textarea rows="3" className={inputClass} value={entry.memo} onChange={(e) => setEntry({ ...entry, memo: e.target.value })} /></Field><Button tone="cyan" onClick={saveEntry} disabled={saving}>{saving ? "Saving..." : "Save Entry"}</Button></div></section>

      <section className="rounded-[28px] border border-cyan-500/15 bg-[#07111f]/90 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black">Tenant ledger</h2><p className="mt-1 text-xs text-slate-500">Select multiple entries, edit one line, or permanently delete mistakes while setting up the account.</p></div><div className="flex flex-wrap gap-2"><select className={inputClass} style={{ width: 240 }} value={filterTenant} onChange={(e) => setFilterTenant(e.target.value)}><option value="">All tenants</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.full_name}</option>)}</select><Button tone="slate" onClick={exportCsv}>Export CSV</Button></div></div>
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-800 bg-black/20 p-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={allSelected} onChange={() => setSelectedIds(allSelected ? [] : entries.map((row) => row.id))} />Select all visible</label><span className="text-xs text-slate-500">{selectedIds.length} selected</span><button className="rounded-xl border border-rose-400/30 px-3 py-2 text-xs font-black text-rose-100 disabled:opacity-40" disabled={!selectedIds.length || saving} onClick={deleteSelected}>Delete selected</button></div>

        <div className="mt-4 space-y-3 md:hidden">{entries.map((row) => <article key={row.id} className="rounded-2xl border border-slate-800 bg-black/20 p-4"><div className="flex items-start justify-between gap-3"><label className="flex items-start gap-3"><input className="mt-1" type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => toggleRow(row.id)} /><span><span className="block text-sm font-black text-white">{row.tenant_name}</span><span className="block text-xs text-slate-400">{row.entry_date} · {row.category.replaceAll("_", " ")}</span></span></label><span className={`font-black ${["PAYMENT", "CREDIT"].includes(row.entry_type) ? "text-emerald-300" : "text-rose-200"}`}>{["PAYMENT", "CREDIT"].includes(row.entry_type) ? "−" : "+"}{money(row.amount)}</span></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400"><div>Type: <span className="text-white">{row.entry_type}</span></div><div>Method: <span className="text-white">{row.payment_method || "—"}</span></div><div className="col-span-2">Reference: <span className="text-white">{row.reference || "—"}</span></div>{row.memo ? <div className="col-span-2">Notes: <span className="text-white">{row.memo}</span></div> : null}</div><div className="mt-3 flex gap-2"><button className="rounded-xl border border-cyan-400/30 px-3 py-2 text-xs font-bold text-cyan-100" onClick={() => beginEdit(row)}>Edit</button><button className="rounded-xl border border-rose-400/30 px-3 py-2 text-xs font-bold text-rose-100" onClick={() => deleteEntry(row)}>Delete</button></div></article>)}</div>

        <div className="mt-5 hidden overflow-x-auto md:block"><table className="w-full min-w-[1020px] text-left text-sm"><thead><tr className="border-b border-slate-700 text-xs uppercase tracking-wider text-slate-500"><th className="px-3 py-3"><input type="checkbox" checked={allSelected} onChange={() => setSelectedIds(allSelected ? [] : entries.map((row) => row.id))} /></th>{["Date", "Tenant", "Type", "Category", "Reference", "Amount", "Actions"].map((heading) => <th key={heading} className="px-3 py-3">{heading}</th>)}</tr></thead><tbody>{entries.map((row) => <tr key={row.id} className="border-b border-slate-800"><td className="px-3 py-3"><input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => toggleRow(row.id)} /></td><td className="px-3 py-3">{row.entry_date}</td><td className="px-3 py-3 font-bold text-white">{row.tenant_name}</td><td className="px-3 py-3">{row.entry_type}</td><td className="px-3 py-3">{row.category}</td><td className="max-w-[220px] truncate px-3 py-3 text-xs text-slate-400">{row.reference || "—"}</td><td className={`px-3 py-3 font-black ${["PAYMENT", "CREDIT"].includes(row.entry_type) ? "text-emerald-300" : "text-rose-200"}`}>{["PAYMENT", "CREDIT"].includes(row.entry_type) ? "−" : "+"}{money(row.amount)}</td><td className="px-3 py-3"><div className="flex gap-2"><button className="rounded-xl border border-cyan-400/30 px-3 py-2 text-xs font-bold text-cyan-100" onClick={() => beginEdit(row)}>Edit</button><button className="rounded-xl border border-rose-400/30 px-3 py-2 text-xs font-bold text-rose-100" onClick={() => deleteEntry(row)}>Delete</button></div></td></tr>)}</tbody></table></div>
        {!entries.length ? <div className="py-12 text-center text-sm text-slate-500">No ledger entries yet.</div> : null}
      </section>
    </div>

    {editing ? <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4"><div className="w-full max-w-xl rounded-[28px] border border-cyan-500/25 bg-[#07111f] p-5 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><div className="text-xs font-black uppercase tracking-[.18em] text-cyan-300">Edit ledger item</div><h3 className="mt-2 text-xl font-black">{editing.tenant_name}</h3><p className="mt-1 text-sm text-slate-400">Changes update this line directly and immediately recalculate the balance.</p></div><button className="text-slate-400" onClick={() => setEditing(null)}>✕</button></div><div className="mt-5 grid gap-4"><div className="grid grid-cols-2 gap-3"><Field label="Date"><input type="date" className={inputClass} value={editing.entry_date} onChange={(e) => setEditing({ ...editing, entry_date: e.target.value })} /></Field><Field label="Type"><select className={inputClass} value={editing.entry_type} onChange={(e) => setEditing({ ...editing, entry_type: e.target.value })}>{entryTypes.map((value) => <option key={value}>{value}</option>)}</select></Field></div><div className="grid grid-cols-2 gap-3"><Field label="Amount"><input inputMode="decimal" className={inputClass} value={editing.amount} onChange={(e) => setEditing({ ...editing, amount: e.target.value })} /></Field><Field label="Category"><select className={inputClass} value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>{categories.map((value) => <option key={value}>{value.replaceAll("_", " ")}</option>)}</select></Field></div>{editing.entry_type === "PAYMENT" ? <Field label="Payment method"><select className={inputClass} value={editing.payment_method} onChange={(e) => setEditing({ ...editing, payment_method: e.target.value })}>{paymentMethods.map((value) => <option key={value}>{value.replaceAll("_", " ")}</option>)}</select></Field> : null}<Field label="Reference"><input className={inputClass} value={editing.reference} onChange={(e) => setEditing({ ...editing, reference: e.target.value })} /></Field><Field label="Memo"><textarea rows="3" className={inputClass} value={editing.memo} onChange={(e) => setEditing({ ...editing, memo: e.target.value })} /></Field><div className="flex justify-end gap-2"><Button tone="slate" onClick={() => setEditing(null)}>Cancel</Button><Button tone="cyan" onClick={saveEdit} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button></div></div></div></div> : null}
  </main></div>;
}
