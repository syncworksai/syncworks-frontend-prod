import React, { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import Button from "../components/ui/Button";

const inputClass = "min-h-11 w-full rounded-2xl border border-slate-700 bg-black/35 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/70";
const list = (data) => Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
const today = new Date().toISOString().slice(0, 10);
const blankEntry = { tenant: "", entry_date: today, entry_type: "PAYMENT", amount: "", category: "RENT", payment_method: "CASH", reference: "", memo: "" };
const defaultBilling = { rent_due_day: 1, grace_days: 5, late_fee_type: "FLAT", late_fee_amount: "0.00", auto_charge_rent: true, auto_charge_late_fee: false, charge_security_deposit: true, billing_start_date: "" };
const money = (v) => Number(v || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
function Field({ label, children }) { return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-300">{label}</span>{children}</label>; }
function errorText(err, fallback) { const data = err?.response?.data; if (data?.detail) return data.detail; if (data && typeof data === "object") return Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join(" · "); return fallback; }

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
  const [undoFrom, setUndoFrom] = useState("");
  const [undoThrough, setUndoThrough] = useState(today);
  const [correction, setCorrection] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function load() {
    try {
      const ws = await api.get("/pm-hub/workspaces/current/");
      setWorkspace(ws.data);
      const headers = { "X-PM-Workspace-ID": String(ws.data.id) };
      const [t, e, s, b] = await Promise.all([
        api.get("/pm-hub/tenants/", { headers }),
        api.get(`/pm-hub/ledger/${filterTenant ? `?tenant=${filterTenant}` : ""}`, { headers }),
        api.get("/pm-hub/ledger/summary/", { headers }),
        api.get("/pm-hub/billing/summary/", { headers }),
      ]);
      const tenantRows = list(t.data);
      setTenants(tenantRows);
      setEntries(list(e.data));
      setSummary(s.data || { total_due: "0.00", tenants: [] });
      setBillingSummary(b.data || { total_due: "0.00", total_past_due: "0.00", past_due_accounts: 0, tenants: [] });
      if (!billingTenant && tenantRows.length) setBillingTenant(String(tenantRows[0].id));
    } catch (err) { setError(errorText(err, "Could not load tenant ledgers.")); }
  }

  useEffect(() => { load(); }, [filterTenant]);

  async function loadBillingProfile(tenantId) {
    if (!tenantId || !workspace) return;
    try {
      const headers = { "X-PM-Workspace-ID": String(workspace.id) };
      const response = await api.get(`/pm-hub/billing/tenants/${tenantId}/`, { headers });
      const profile = { ...defaultBilling, ...(response.data?.profile || {}) };
      setBilling(profile);
      setBillingAccount(response.data?.account || null);
      if (!undoFrom) setUndoFrom(profile.billing_start_date || profile.lease_start || "");
    } catch (err) { setError(errorText(err, "Could not load tenant billing rules.")); }
  }

  useEffect(() => { loadBillingProfile(billingTenant); }, [billingTenant, workspace?.id]);

  const selectedBalance = useMemo(() => summary.tenants?.find((row) => String(row.tenant_id) === String(filterTenant))?.balance || "0.00", [summary, filterTenant]);
  const selectedBillingSummary = useMemo(() => billingSummary.tenants?.find((row) => String(row.tenant_id) === String(billingTenant)) || billingAccount, [billingSummary, billingTenant, billingAccount]);

  async function saveEntry() {
    if (!entry.tenant || !entry.amount) return setError("Tenant and amount are required.");
    setSaving(true); setError(""); setMessage("");
    try {
      const headers = { "X-PM-Workspace-ID": String(workspace.id) };
      await api.post("/pm-hub/ledger/", { ...entry, payment_method: entry.entry_type === "PAYMENT" ? entry.payment_method : "", workspace_id: workspace.id }, { headers });
      setEntry({ ...blankEntry, tenant: entry.tenant });
      setMessage("Ledger entry saved.");
      await load();
      await loadBillingProfile(entry.tenant);
    } catch (err) { setError(errorText(err, "Could not save ledger entry.")); } finally { setSaving(false); }
  }

  async function saveBilling() {
    if (!billingTenant) return setError("Choose a tenant account.");
    setSaving(true); setError(""); setMessage("");
    try {
      const headers = { "X-PM-Workspace-ID": String(workspace.id) };
      const response = await api.patch(`/pm-hub/billing/tenants/${billingTenant}/`, { ...billing, workspace_id: workspace.id }, { headers });
      setBilling({ ...defaultBilling, ...(response.data?.profile || {}) });
      setBillingAccount(response.data?.account || null);
      setMessage("Tenant billing rules saved.");
      await load();
    } catch (err) { setError(errorText(err, "Could not save billing rules.")); } finally { setSaving(false); }
  }

  async function generateCharges() {
    if (!billingTenant) return setError("Choose a tenant account.");
    setGenerating(true); setError(""); setMessage("");
    try {
      const headers = { "X-PM-Workspace-ID": String(workspace.id) };
      const response = await api.post(`/pm-hub/billing/tenants/${billingTenant}/generate/`, { through_date: throughDate, workspace_id: workspace.id }, { headers });
      setBillingAccount(response.data?.account || null);
      setMessage(response.data?.detail || "Charges generated.");
      setFilterTenant(String(billingTenant));
      await load();
    } catch (err) { setError(errorText(err, "Could not generate tenant charges.")); } finally { setGenerating(false); }
  }

  async function undoGenerated() {
    if (!billingTenant) return setError("Choose a tenant account.");
    if (!window.confirm("Create reversal credits for generated charges in this date range? The original entries will remain visible for audit history.")) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const headers = { "X-PM-Workspace-ID": String(workspace.id) };
      const response = await api.post(`/pm-hub/billing/tenants/${billingTenant}/undo-generated/`, {
        from_date: undoFrom,
        through_date: undoThrough,
        reason: "Undo charges generated before the PM management start date",
        workspace_id: workspace.id,
      }, { headers });
      setMessage(response.data?.detail || "Generated charges reversed.");
      setBillingAccount(response.data?.account || null);
      setFilterTenant(String(billingTenant));
      await load();
    } catch (err) { setError(errorText(err, "Could not undo generated charges.")); } finally { setSaving(false); }
  }

  async function saveCorrection() {
    if (!correction?.entry) return;
    if (!correction.reason.trim()) return setError("Add a reason for the ledger correction.");
    setSaving(true); setError(""); setMessage("");
    try {
      const headers = { "X-PM-Workspace-ID": String(workspace.id) };
      const payload = {
        reason: correction.reason,
        correction_date: correction.correction_date,
        workspace_id: workspace.id,
      };
      if (correction.mode === "REPLACE") {
        payload.replacement = {
          entry_date: correction.entry_date,
          entry_type: correction.entry_type,
          amount: correction.amount,
          category: correction.category,
          payment_method: correction.payment_method,
          memo: correction.memo,
        };
      }
      const response = await api.post(`/pm-hub/ledger/${correction.entry.id}/correct/`, payload, { headers });
      setMessage(response.data?.detail || "Ledger correction saved.");
      setCorrection(null);
      await load();
      await loadBillingProfile(String(correction.entry.tenant));
    } catch (err) { setError(errorText(err, "Could not save ledger correction.")); } finally { setSaving(false); }
  }

  function openCorrection(row, mode = "WAIVE") {
    setCorrection({
      entry: row,
      mode,
      reason: mode === "WAIVE" ? `Waive ${String(row.category || "charge").replaceAll("_", " ").toLowerCase()}` : "Correct ledger entry",
      correction_date: today,
      entry_date: row.entry_date,
      entry_type: row.entry_type,
      amount: row.amount,
      category: row.category,
      payment_method: row.payment_method || "",
      memo: row.memo || "",
    });
  }

  function exportCsv() {
    const rows = [["entry_date", "tenant", "entry_type", "amount", "category", "payment_method", "reference", "memo"], ...entries.map((e) => [e.entry_date, e.tenant_name, e.entry_type, e.amount, e.category, e.payment_method, e.reference, e.memo])];
    const csv = rows.map((r) => r.map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "syncworks-tenant-ledger.csv"; a.click(); URL.revokeObjectURL(url);
  }

  const toggle = (key, label) => <label className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-black/20 px-3 py-3 text-sm text-slate-200"><input type="checkbox" checked={Boolean(billing[key])} onChange={(e) => setBilling({ ...billing, [key]: e.target.checked })} /><span>{label}</span></label>;

  return <div className="min-h-screen bg-transparent text-slate-100"><main className="space-y-5 px-4 py-6 sm:px-6">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {[ ["Total Due", billingSummary.total_due, "text-white"], ["Past Due", billingSummary.total_past_due, "text-rose-200"], ["Past Due Accounts", billingSummary.past_due_accounts, "text-amber-200"], ["Tenant Accounts", tenants.length, "text-white"], ["Selected Balance", selectedBalance, "text-white"] ].map(([label, value, cls], i) => <div key={label} className="rounded-3xl border border-cyan-500/15 bg-[#07111f]/95 p-5"><div className="text-[10px] font-black uppercase tracking-[.18em] text-slate-500">{label}</div><div className={`mt-3 text-3xl font-black ${cls}`}>{i === 2 || i === 3 ? value || 0 : money(value)}</div></div>)}
    </div>

    {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div> : null}
    {message ? <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">{message}</div> : null}

    <section className="rounded-[28px] border border-cyan-500/20 bg-[#07111f]/95 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-300">Automatic billing</div><h2 className="mt-2 text-xl font-black">Tenant rent and fee schedule</h2><p className="mt-1 text-sm text-slate-400">Use the PM management start date—not necessarily the original lease start—to control automatic charges.</p></div><div className="grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-2xl border border-slate-800 bg-black/25 p-3"><div className="text-slate-500">Due</div><div className="mt-1 font-black text-white">{money(selectedBillingSummary?.amount_due)}</div></div><div className="rounded-2xl border border-rose-500/20 bg-black/25 p-3"><div className="text-slate-500">Past due</div><div className="mt-1 font-black text-rose-200">{money(selectedBillingSummary?.past_due)}</div></div><div className="rounded-2xl border border-amber-500/20 bg-black/25 p-3"><div className="text-slate-500">Late fees</div><div className="mt-1 font-black text-amber-200">{money(selectedBillingSummary?.late_fees_charged)}</div></div></div></div>
      <div className="mt-5 grid gap-4 lg:grid-cols-4">
        <Field label="Tenant account"><select className={inputClass} value={billingTenant} onChange={(e) => { setBillingTenant(e.target.value); setUndoFrom(""); }}><option value="">Choose tenant</option>{tenants.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}</select></Field>
        <Field label="PM management start date"><input type="date" className={inputClass} value={billing.billing_start_date || ""} onChange={(e) => setBilling({ ...billing, billing_start_date: e.target.value })} /></Field>
        <Field label="Rent due day"><input type="number" min="1" max="28" className={inputClass} value={billing.rent_due_day} onChange={(e) => setBilling({ ...billing, rent_due_day: e.target.value })} /></Field>
        <Field label="Grace period (days)"><input type="number" min="0" max="30" className={inputClass} value={billing.grace_days} onChange={(e) => setBilling({ ...billing, grace_days: e.target.value })} /></Field>
        <Field label="Late fee type"><select className={inputClass} value={billing.late_fee_type} onChange={(e) => setBilling({ ...billing, late_fee_type: e.target.value })}><option value="FLAT">Flat dollar amount</option><option value="PERCENT">Percent of monthly rent</option></select></Field>
        <Field label={billing.late_fee_type === "PERCENT" ? "Late fee percent" : "Late fee amount"}><input inputMode="decimal" className={inputClass} value={billing.late_fee_amount} onChange={(e) => setBilling({ ...billing, late_fee_amount: e.target.value })} /></Field>
        <Field label="Generate through"><input type="date" className={inputClass} value={throughDate} onChange={(e) => setThroughDate(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-2"><Button tone="slate" onClick={saveBilling} disabled={saving}>{saving ? "Saving..." : "Save Rules"}</Button><Button tone="cyan" onClick={generateCharges} disabled={generating}>{generating ? "Generating..." : "Generate Charges"}</Button></div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">{toggle("auto_charge_rent", "Generate monthly rent charges")}{toggle("charge_security_deposit", "Generate the security-deposit charge")}{toggle("auto_charge_late_fee", "Generate late fees after the grace period")}</div>

      <div className="mt-5 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4"><div className="text-sm font-black text-amber-100">Undo generated charges</div><p className="mt-1 text-xs text-amber-100/70">Use this when the wrong management start date created rent or late-fee charges. SyncWorks creates reversal credits and preserves the original entries.</p><div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><Field label="Undo from"><input type="date" className={inputClass} value={undoFrom} onChange={(e) => setUndoFrom(e.target.value)} /></Field><Field label="Undo through"><input type="date" className={inputClass} value={undoThrough} onChange={(e) => setUndoThrough(e.target.value)} /></Field><div className="self-end"><Button tone="slate" onClick={undoGenerated} disabled={saving}>Undo Generated Charges</Button></div></div></div>
    </section>

    <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
      <section className="rounded-[28px] border border-cyan-500/15 bg-[#07111f]/90 p-5"><h2 className="text-lg font-black">Add ledger entry</h2><p className="mt-1 text-xs text-slate-500">Back-date charges and payments to reconstruct an existing ledger.</p><div className="mt-5 grid gap-4">
        <Field label="Tenant"><select className={inputClass} value={entry.tenant} onChange={(e) => setEntry({ ...entry, tenant: e.target.value })}><option value="">Choose tenant</option>{tenants.map((t) => <option key={t.id} value={t.id}>{t.full_name} · balance {money(t.balance)}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Date"><input type="date" className={inputClass} value={entry.entry_date} onChange={(e) => setEntry({ ...entry, entry_date: e.target.value })} /></Field><Field label="Type"><select className={inputClass} value={entry.entry_type} onChange={(e) => setEntry({ ...entry, entry_type: e.target.value })}>{["CHARGE", "PAYMENT", "CREDIT", "ADJUSTMENT"].map((v) => <option key={v}>{v}</option>)}</select></Field></div>
        <div className="grid grid-cols-2 gap-3"><Field label="Amount"><input inputMode="decimal" className={inputClass} value={entry.amount} onChange={(e) => setEntry({ ...entry, amount: e.target.value })} /></Field><Field label="Category"><select className={inputClass} value={entry.category} onChange={(e) => setEntry({ ...entry, category: e.target.value })}>{["RENT", "LATE_FEE", "SECURITY_DEPOSIT", "UTILITY", "REPAIR", "OTHER"].map((v) => <option key={v}>{v.replaceAll("_", " ")}</option>)}</select></Field></div>
        {entry.entry_type === "PAYMENT" ? <Field label="Payment method"><select className={inputClass} value={entry.payment_method} onChange={(e) => setEntry({ ...entry, payment_method: e.target.value })}>{["CASH", "CHECK", "ACH", "CARD", "MONEY_ORDER", "HOUSING_AUTHORITY", "OTHER"].map((v) => <option key={v}>{v.replaceAll("_", " ")}</option>)}</select></Field> : null}
        <Field label="Reference / check number"><input className={inputClass} value={entry.reference} onChange={(e) => setEntry({ ...entry, reference: e.target.value })} /></Field>
        <Field label="Memo"><textarea rows="3" className={inputClass} value={entry.memo} onChange={(e) => setEntry({ ...entry, memo: e.target.value })} /></Field>
        <Button tone="cyan" onClick={saveEntry} disabled={saving}>{saving ? "Saving..." : "Save Entry"}</Button>
      </div></section>

      <section className="rounded-[28px] border border-cyan-500/15 bg-[#07111f]/90 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black">Tenant ledger</h2><p className="mt-1 text-xs text-slate-500">Every correction creates an audit entry rather than silently deleting history.</p></div><div className="flex gap-2"><select className={inputClass} style={{ width: 240 }} value={filterTenant} onChange={(e) => setFilterTenant(e.target.value)}><option value="">All tenants</option>{tenants.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}</select><Button tone="slate" onClick={exportCsv}>Export CSV</Button></div></div>
        <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[940px] text-left text-sm"><thead><tr className="border-b border-slate-700 text-xs uppercase tracking-wider text-slate-500">{["Date", "Tenant", "Type", "Category", "Reference", "Amount", "Actions"].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}</tr></thead><tbody>{entries.map((e) => <tr key={e.id} className="border-b border-slate-800"><td className="px-3 py-3">{e.entry_date}</td><td className="px-3 py-3 font-bold text-white">{e.tenant_name}</td><td className="px-3 py-3">{e.entry_type}</td><td className="px-3 py-3">{e.category}</td><td className="max-w-[220px] truncate px-3 py-3 text-xs text-slate-400">{e.reference || "—"}</td><td className={`px-3 py-3 font-black ${["PAYMENT", "CREDIT"].includes(e.entry_type) ? "text-emerald-300" : "text-rose-200"}`}>{["PAYMENT", "CREDIT"].includes(e.entry_type) ? "−" : "+"}{money(e.amount)}</td><td className="px-3 py-3"><div className="flex gap-2">{["CHARGE", "ADJUSTMENT"].includes(e.entry_type) ? <button className="rounded-xl border border-amber-400/25 px-3 py-2 text-xs font-bold text-amber-100" onClick={() => openCorrection(e, "WAIVE")}>Waive</button> : null}<button className="rounded-xl border border-cyan-400/25 px-3 py-2 text-xs font-bold text-cyan-100" onClick={() => openCorrection(e, "REPLACE")}>Quick Adjust</button></div></td></tr>)}</tbody></table>{!entries.length ? <div className="py-12 text-center text-sm text-slate-500">No ledger entries yet.</div> : null}</div>
      </section>
    </div>

    {correction ? <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4"><div className="w-full max-w-xl rounded-[28px] border border-cyan-500/25 bg-[#07111f] p-5 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><div className="text-xs font-black uppercase tracking-[.18em] text-cyan-300">Ledger correction</div><h3 className="mt-2 text-xl font-black">{correction.mode === "WAIVE" ? "Waive this charge" : "Reverse and replace entry"}</h3><p className="mt-1 text-sm text-slate-400">Original: {correction.entry.category} · {money(correction.entry.amount)} · {correction.entry.entry_date}</p></div><button className="text-slate-400" onClick={() => setCorrection(null)}>✕</button></div><div className="mt-5 grid gap-4"><Field label="Correction reason"><input className={inputClass} value={correction.reason} onChange={(e) => setCorrection({ ...correction, reason: e.target.value })} /></Field><Field label="Correction date"><input type="date" className={inputClass} value={correction.correction_date} onChange={(e) => setCorrection({ ...correction, correction_date: e.target.value })} /></Field>{correction.mode === "REPLACE" ? <><div className="grid grid-cols-2 gap-3"><Field label="Replacement date"><input type="date" className={inputClass} value={correction.entry_date} onChange={(e) => setCorrection({ ...correction, entry_date: e.target.value })} /></Field><Field label="Replacement type"><select className={inputClass} value={correction.entry_type} onChange={(e) => setCorrection({ ...correction, entry_type: e.target.value })}>{["CHARGE", "PAYMENT", "CREDIT", "ADJUSTMENT"].map((v) => <option key={v}>{v}</option>)}</select></Field></div><div className="grid grid-cols-2 gap-3"><Field label="Replacement amount"><input inputMode="decimal" className={inputClass} value={correction.amount} onChange={(e) => setCorrection({ ...correction, amount: e.target.value })} /></Field><Field label="Category"><select className={inputClass} value={correction.category} onChange={(e) => setCorrection({ ...correction, category: e.target.value })}>{["RENT", "LATE_FEE", "SECURITY_DEPOSIT", "UTILITY", "REPAIR", "OTHER"].map((v) => <option key={v}>{v.replaceAll("_", " ")}</option>)}</select></Field></div><Field label="Replacement memo"><input className={inputClass} value={correction.memo} onChange={(e) => setCorrection({ ...correction, memo: e.target.value })} /></Field></> : null}<div className="flex justify-end gap-2"><Button tone="slate" onClick={() => setCorrection(null)}>Cancel</Button><Button tone="cyan" onClick={saveCorrection} disabled={saving}>{saving ? "Saving..." : correction.mode === "WAIVE" ? "Waive Charge" : "Save Correction"}</Button></div></div></div></div> : null}
  </main></div>;
}
