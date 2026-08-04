import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import Button from "../ui/Button";

const inputClass = "min-h-11 w-full rounded-2xl border border-slate-700 bg-black/35 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/70";
const money = (value) => Number(value || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
const blankRule = () => ({ id: `rule-${Date.now()}-${Math.random().toString(16).slice(2)}`, label: "Late fee", mode: "FIXED_DAY", trigger: 5, amount: "50.00", monthly_cap: "0.00", enabled: true });
const defaults = {
  late_fee_rules: [], payment_arrangement_enabled: false, payment_arrangement_frequency: "BIWEEKLY", payment_arrangement_amount: "0.00",
  payment_arrangement_start: "", payment_arrangement_end: "", pause_late_fees_during_arrangement: true, collection_status: "NONE",
  collection_start_date: "", collection_monthly_late_fee_cap: "0.00", eviction_filed: false, eviction_filed_date: "",
  stop_late_fees_after_eviction: false, move_out_date: "", prorate_final_month: false, deposit_required: "0.00",
  deposit_received: "0.00", deposit_held: "0.00", deposit_applied: "0.00", deposit_notes: "", collections_recipient_name: "",
  collections_recipient_email: "", collections_notes: "",
};

function Field({ label, children }) { return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-300">{label}</span>{children}</label>; }
function errorText(err, fallback) { return err?.response?.data?.detail || err?.message || fallback; }

export default function PMCollectionsAndLeaseRules({ workspace, tenantId, onRefresh }) {
  const [profile, setProfile] = useState(defaults);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const headers = useMemo(() => workspace ? { "X-PM-Workspace-ID": String(workspace.id) } : {}, [workspace]);

  async function load() {
    if (!workspace || !tenantId) return;
    try {
      setError("");
      const response = await api.get(`/pm-hub/billing/tenants/${tenantId}/advanced/?_=${Date.now()}`, { headers });
      setProfile({ ...defaults, ...(response.data?.profile || {}), late_fee_rules: response.data?.profile?.late_fee_rules || [] });
    } catch (err) { setError(errorText(err, "Could not load lease-specific billing rules.")); }
  }

  useEffect(() => { setPreview(null); load(); }, [workspace?.id, tenantId]);

  async function save() {
    if (!tenantId) return setError("Choose a tenant first.");
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await api.patch(`/pm-hub/billing/tenants/${tenantId}/advanced/`, { ...profile, workspace_id: workspace.id }, { headers });
      setProfile({ ...defaults, ...(response.data?.profile || {}) });
      setMessage("Lease-specific billing and collections settings saved.");
      onRefresh?.();
    } catch (err) { setError(errorText(err, "Could not save lease settings.")); }
    finally { setBusy(false); }
  }

  async function generateLateFees() {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await api.post(`/pm-hub/billing/tenants/${tenantId}/generate-advanced-late-fees/`, { through_date: new Date().toISOString().slice(0, 10), workspace_id: workspace.id }, { headers });
      setMessage(response.data?.detail || "Late fees generated.");
      onRefresh?.();
    } catch (err) { setError(errorText(err, "Could not generate late fees.")); }
    finally { setBusy(false); }
  }

  async function buildPreview() {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await api.post(`/pm-hub/billing/tenants/${tenantId}/collections-preview/`, {
        workspace_id: workspace.id,
        monthly_late_fee_cap: profile.collection_monthly_late_fee_cap,
        move_out_date: profile.move_out_date,
        prorate_final_month: profile.prorate_final_month,
      }, { headers });
      setPreview(response.data);
      setMessage("Collections statement preview is ready. The internal ledger was not changed.");
    } catch (err) { setError(errorText(err, "Could not prepare the collections statement.")); }
    finally { setBusy(false); }
  }

  function updateRule(index, key, value) {
    setProfile((current) => ({ ...current, late_fee_rules: current.late_fee_rules.map((rule, i) => i === index ? { ...rule, [key]: value } : rule) }));
  }

  function printStatement() {
    if (!preview) return;
    const rows = preview.rows.map((row) => `<tr><td>${row.entry_date}</td><td>${row.entry_type}</td><td>${String(row.category).replaceAll("_", " ")}</td><td>${row.memo || ""}</td><td style="text-align:right">${Number(row.signed_amount).toLocaleString("en-US", { style: "currency", currency: "USD" })}</td></tr>${row.adjustment_note ? `<tr><td colspan="5" style="font-size:11px;color:#555;padding-top:0">${row.adjustment_note}</td></tr>` : ""}`).join("");
    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) return setError("Allow pop-ups to print or save the statement as PDF.");
    win.document.write(`<!doctype html><html><head><title>${preview.tenant.name} Collections Ledger</title><style>body{font-family:Arial,sans-serif;margin:36px;color:#111}h1{margin:0 0 6px}p{margin:4px 0}.meta{margin:18px 0;padding:14px;border:1px solid #bbb;border-radius:8px}table{width:100%;border-collapse:collapse;margin-top:18px;font-size:12px}th,td{border-bottom:1px solid #ddd;padding:8px;text-align:left}th{background:#f4f4f4}.total{margin-top:20px;font-size:20px;font-weight:700;text-align:right}.note{margin-top:18px;white-space:pre-wrap;font-size:12px}</style></head><body><h1>Tenant Collections Ledger</h1><p><strong>${preview.tenant.name}</strong></p><p>${preview.tenant.property_name}${preview.tenant.unit_label ? ` · Unit ${preview.tenant.unit_label}` : ""}</p><div class="meta"><p>Statement date: ${preview.statement_date}</p><p>Original internal balance: ${money(preview.original_balance)}</p><p>Collections-adjusted balance: <strong>${money(preview.adjusted_balance)}</strong></p><p>Monthly late-fee cap used: ${money(preview.monthly_late_fee_cap)}</p>${preview.move_out_date ? `<p>Move-out date: ${preview.move_out_date}${preview.prorate_final_month ? " · final month prorated" : ""}</p>` : ""}</div><table><thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table><div class="total">Balance requested: ${money(preview.adjusted_balance)}</div><div class="note">${preview.notes || ""}</div><script>window.onload=()=>window.print()</script></body></html>`);
    win.document.close();
  }

  function openEmail() {
    if (!preview) return;
    const subject = encodeURIComponent(`Collections ledger — ${preview.tenant.name} — ${preview.tenant.property_name}`);
    const body = encodeURIComponent(`Hello ${profile.collections_recipient_name || ""},\n\nPlease find the collections-ready ledger for ${preview.tenant.name} at ${preview.tenant.property_name}.\n\nOriginal internal balance: ${money(preview.original_balance)}\nAdjusted balance requested: ${money(preview.adjusted_balance)}\nMonthly late-fee cap used: ${money(preview.monthly_late_fee_cap)}\n${preview.move_out_date ? `Move-out date: ${preview.move_out_date}\n` : ""}\n${profile.collections_notes || ""}\n\nPlease let us know if additional adjustments or supporting receipts are required.`);
    window.location.href = `mailto:${encodeURIComponent(profile.collections_recipient_email || "")}?subject=${subject}&body=${body}`;
  }

  if (!tenantId) return <section className="rounded-[28px] border border-fuchsia-500/20 bg-[#07111f]/95 p-5 text-sm text-slate-400">Choose a tenant account to configure lease-specific fees, payment arrangements, deposits, and collections export.</section>;

  return <section className="space-y-5 rounded-[28px] border border-fuchsia-500/20 bg-[#07111f]/95 p-5">
    <div><div className="text-[10px] font-black uppercase tracking-[.18em] text-fuchsia-300">Lease rules & collections</div><h2 className="mt-2 text-xl font-black">Adjust each lease without changing company-wide rules.</h2><p className="mt-1 text-sm text-slate-400">Multiple late-fee checkpoints, daily fees, payment arrangements, deposit accounting, eviction/collections controls, and a collections-ready statement.</p></div>
    {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</div> : null}
    {message ? <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">{message}</div> : null}

    <div className="space-y-3"><div className="flex items-center justify-between"><h3 className="font-black">Late-fee schedule</h3><Button tone="slate" onClick={() => setProfile({ ...profile, late_fee_rules: [...profile.late_fee_rules, blankRule()] })}>+ Add fee rule</Button></div>{profile.late_fee_rules.map((rule, index) => <div key={rule.id || index} className="grid gap-3 rounded-2xl border border-slate-800 bg-black/20 p-3 md:grid-cols-6"><Field label="Rule name"><input className={inputClass} value={rule.label || ""} onChange={(e) => updateRule(index, "label", e.target.value)} /></Field><Field label="Rule type"><select className={inputClass} value={rule.mode || "FIXED_DAY"} onChange={(e) => updateRule(index, "mode", e.target.value)}><option value="FIXED_DAY">Day of month</option><option value="DAYS_LATE">Days after due</option><option value="DAILY">Daily after X days</option></select></Field><Field label={rule.mode === "FIXED_DAY" ? "Charge on day" : "Trigger after days"}><input type="number" className={inputClass} value={rule.trigger || 1} onChange={(e) => updateRule(index, "trigger", e.target.value)} /></Field><Field label="Fee amount"><input className={inputClass} inputMode="decimal" value={rule.amount || "0.00"} onChange={(e) => updateRule(index, "amount", e.target.value)} /></Field><Field label="Monthly cap"><input className={inputClass} inputMode="decimal" value={rule.monthly_cap || "0.00"} onChange={(e) => updateRule(index, "monthly_cap", e.target.value)} /></Field><div className="flex items-end gap-2"><label className="flex min-h-11 flex-1 items-center gap-2 rounded-2xl border border-slate-700 px-3 text-xs"><input type="checkbox" checked={rule.enabled !== false} onChange={(e) => updateRule(index, "enabled", e.target.checked)} />Active</label><button className="min-h-11 rounded-2xl border border-rose-500/30 px-3 text-xs text-rose-200" onClick={() => setProfile({ ...profile, late_fee_rules: profile.late_fee_rules.filter((_, i) => i !== index) })}>Remove</button></div></div>)}</div>

    <div className="grid gap-4 lg:grid-cols-4"><label className="flex items-center gap-3 rounded-2xl border border-slate-800 p-3 text-sm"><input type="checkbox" checked={profile.payment_arrangement_enabled} onChange={(e) => setProfile({ ...profile, payment_arrangement_enabled: e.target.checked })} />Temporary payment arrangement</label><Field label="Arrangement amount"><input className={inputClass} inputMode="decimal" value={profile.payment_arrangement_amount} onChange={(e) => setProfile({ ...profile, payment_arrangement_amount: e.target.value })} /></Field><Field label="Arrangement starts"><input type="date" className={inputClass} value={profile.payment_arrangement_start} onChange={(e) => setProfile({ ...profile, payment_arrangement_start: e.target.value })} /></Field><Field label="Arrangement ends"><input type="date" className={inputClass} value={profile.payment_arrangement_end} onChange={(e) => setProfile({ ...profile, payment_arrangement_end: e.target.value })} /></Field></div>

    <div className="grid gap-4 lg:grid-cols-4"><Field label="Deposit required"><input className={inputClass} inputMode="decimal" value={profile.deposit_required} onChange={(e) => setProfile({ ...profile, deposit_required: e.target.value })} /></Field><Field label="Deposit received"><input className={inputClass} inputMode="decimal" value={profile.deposit_received} onChange={(e) => setProfile({ ...profile, deposit_received: e.target.value })} /></Field><Field label="Deposit currently held"><input className={inputClass} inputMode="decimal" value={profile.deposit_held} onChange={(e) => setProfile({ ...profile, deposit_held: e.target.value })} /></Field><Field label="Deposit applied"><input className={inputClass} inputMode="decimal" value={profile.deposit_applied} onChange={(e) => setProfile({ ...profile, deposit_applied: e.target.value })} /></Field></div>

    <div className="grid gap-4 lg:grid-cols-4"><Field label="Collections status"><select className={inputClass} value={profile.collection_status} onChange={(e) => setProfile({ ...profile, collection_status: e.target.value })}><option value="NONE">Not in collections</option><option value="PREPARING">Preparing ledger</option><option value="SENT">Sent to collections</option><option value="LEGAL">Legal / eviction</option></select></Field><Field label="Collections start date"><input type="date" className={inputClass} value={profile.collection_start_date} onChange={(e) => setProfile({ ...profile, collection_start_date: e.target.value })} /></Field><Field label="Monthly late-fee cap"><input className={inputClass} inputMode="decimal" value={profile.collection_monthly_late_fee_cap} onChange={(e) => setProfile({ ...profile, collection_monthly_late_fee_cap: e.target.value })} /></Field><Field label="Move-out date"><input type="date" className={inputClass} value={profile.move_out_date} onChange={(e) => setProfile({ ...profile, move_out_date: e.target.value })} /></Field></div>
    <div className="grid gap-3 md:grid-cols-3"><label className="flex items-center gap-3 rounded-2xl border border-slate-800 p-3 text-sm"><input type="checkbox" checked={profile.prorate_final_month} onChange={(e) => setProfile({ ...profile, prorate_final_month: e.target.checked })} />Prorate final month to move-out</label><label className="flex items-center gap-3 rounded-2xl border border-slate-800 p-3 text-sm"><input type="checkbox" checked={profile.eviction_filed} onChange={(e) => setProfile({ ...profile, eviction_filed: e.target.checked })} />Eviction filed</label><Field label="Eviction filed date"><input type="date" className={inputClass} value={profile.eviction_filed_date} onChange={(e) => setProfile({ ...profile, eviction_filed_date: e.target.value })} /></Field></div>

    <div className="grid gap-4 lg:grid-cols-3"><Field label="Recipient / firm"><input className={inputClass} value={profile.collections_recipient_name} onChange={(e) => setProfile({ ...profile, collections_recipient_name: e.target.value })} /></Field><Field label="Recipient email"><input type="email" className={inputClass} value={profile.collections_recipient_email} onChange={(e) => setProfile({ ...profile, collections_recipient_email: e.target.value })} /></Field><Field label="Collections notes"><textarea rows="2" className={inputClass} value={profile.collections_notes} onChange={(e) => setProfile({ ...profile, collections_notes: e.target.value })} /></Field></div>

    <div className="flex flex-wrap gap-2"><Button tone="slate" onClick={save} disabled={busy}>{busy ? "Working..." : "Save lease rules"}</Button><Button tone="cyan" onClick={generateLateFees} disabled={busy}>Generate applicable late fees</Button><Button tone="purple" onClick={buildPreview} disabled={busy}>Preview collections statement</Button>{preview ? <><Button tone="slate" onClick={printStatement}>Print / Save PDF</Button><Button tone="slate" onClick={openEmail}>Open email draft</Button></> : null}</div>

    {preview ? <div className="rounded-2xl border border-fuchsia-400/25 bg-black/25 p-4"><div className="grid gap-3 sm:grid-cols-3"><div><div className="text-[10px] uppercase tracking-widest text-slate-500">Original balance</div><div className="mt-1 text-xl font-black">{money(preview.original_balance)}</div></div><div><div className="text-[10px] uppercase tracking-widest text-slate-500">Collections-adjusted</div><div className="mt-1 text-xl font-black text-fuchsia-200">{money(preview.adjusted_balance)}</div></div><div><div className="text-[10px] uppercase tracking-widest text-slate-500">Adjusted rows</div><div className="mt-1 text-xl font-black">{preview.rows?.filter((row) => row.adjustment_note).length || 0}</div></div></div><p className="mt-3 text-xs text-slate-400">This preview does not modify the internal ledger. Use Print / Save PDF, then attach the saved file to the prepared email draft.</p></div> : null}
  </section>;
}
