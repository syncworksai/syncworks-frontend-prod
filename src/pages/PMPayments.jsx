import React, { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import Button from "../components/ui/Button";

const inputClass = "min-h-11 w-full rounded-2xl border border-slate-700 bg-black/35 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/70";
const list = (data) => Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
const today = new Date().toISOString().slice(0,10);
const blank = { tenant: "", entry_date: today, entry_type: "PAYMENT", amount: "", category: "RENT", payment_method: "CASH", reference: "", memo: "" };
function Field({ label, children }) { return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-300">{label}</span>{children}</label>; }
function errorText(err, fallback) { const data = err?.response?.data; if (data?.detail) return data.detail; if (data && typeof data === "object") return Object.entries(data).map(([k,v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join(" · "); return fallback; }
const money = (v) => Number(v || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function PMPayments() {
  const [workspace, setWorkspace] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState({ total_due: "0.00", tenants: [] });
  const [entry, setEntry] = useState(blank);
  const [filterTenant, setFilterTenant] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const ws = await api.get("/pm-hub/workspaces/current/"); setWorkspace(ws.data);
      const headers = { "X-PM-Workspace-ID": String(ws.data.id) };
      const [t,e,s] = await Promise.all([api.get("/pm-hub/tenants/", { headers }), api.get(`/pm-hub/ledger/${filterTenant ? `?tenant=${filterTenant}` : ""}`, { headers }), api.get("/pm-hub/ledger/summary/", { headers })]);
      setTenants(list(t.data)); setEntries(list(e.data)); setSummary(s.data || { total_due:"0.00", tenants:[] });
    } catch (err) { setError(errorText(err, "Could not load tenant ledgers.")); }
  }
  useEffect(() => { load(); }, [filterTenant]);

  const selectedBalance = useMemo(() => summary.tenants?.find((row) => String(row.tenant_id) === String(filterTenant))?.balance || "0.00", [summary, filterTenant]);

  async function save() {
    if (!entry.tenant || !entry.amount) return setError("Tenant and amount are required.");
    setSaving(true); setError(""); setMessage("");
    try {
      const headers = { "X-PM-Workspace-ID": String(workspace.id) };
      await api.post("/pm-hub/ledger/", { ...entry, payment_method: entry.entry_type === "PAYMENT" ? entry.payment_method : "", workspace_id: workspace.id }, { headers });
      setEntry({ ...blank, tenant: entry.tenant }); setMessage("Ledger entry saved."); await load();
    } catch (err) { setError(errorText(err, "Could not save ledger entry.")); } finally { setSaving(false); }
  }

  function exportCsv() {
    const rows = [["entry_date","tenant","entry_type","amount","category","payment_method","reference","memo"], ...entries.map((e)=>[e.entry_date,e.tenant_name,e.entry_type,e.amount,e.category,e.payment_method,e.reference,e.memo])];
    const csv = rows.map((r)=>r.map((v)=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type:"text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href=url; a.download="syncworks-tenant-ledger.csv"; a.click(); URL.revokeObjectURL(url);
  }

  return <div className="min-h-screen bg-transparent text-slate-100"><main className="space-y-5 px-4 py-6 sm:px-6">
    <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-3xl border border-rose-500/20 bg-[#07111f]/95 p-5"><div className="text-[10px] font-black uppercase tracking-[.18em] text-slate-500">Portfolio Outstanding</div><div className="mt-3 text-3xl font-black text-white">{money(summary.total_due)}</div></div><div className="rounded-3xl border border-cyan-500/15 bg-[#07111f]/95 p-5"><div className="text-[10px] font-black uppercase tracking-[.18em] text-slate-500">Tenant Accounts</div><div className="mt-3 text-3xl font-black text-white">{tenants.length}</div></div><div className="rounded-3xl border border-fuchsia-500/20 bg-[#07111f]/95 p-5"><div className="text-[10px] font-black uppercase tracking-[.18em] text-slate-500">Selected Balance</div><div className="mt-3 text-3xl font-black text-white">{money(selectedBalance)}</div></div></div>
    {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div> : null}
    {message ? <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">{message}</div> : null}
    <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]"><section className="rounded-[28px] border border-cyan-500/15 bg-[#07111f]/90 p-5"><h2 className="text-lg font-black">Add ledger entry</h2><p className="mt-1 text-xs text-slate-500">Back-date charges and payments to reconstruct an existing ledger.</p><div className="mt-5 grid gap-4"><Field label="Tenant"><select className={inputClass} value={entry.tenant} onChange={(e)=>setEntry({...entry,tenant:e.target.value})}><option value="">Choose tenant</option>{tenants.map((t)=><option key={t.id} value={t.id}>{t.full_name} · balance {money(t.balance)}</option>)}</select></Field><div className="grid grid-cols-2 gap-3"><Field label="Date"><input type="date" className={inputClass} value={entry.entry_date} onChange={(e)=>setEntry({...entry,entry_date:e.target.value})}/></Field><Field label="Type"><select className={inputClass} value={entry.entry_type} onChange={(e)=>setEntry({...entry,entry_type:e.target.value})}>{["CHARGE","PAYMENT","CREDIT","ADJUSTMENT"].map((v)=><option key={v}>{v}</option>)}</select></Field></div><div className="grid grid-cols-2 gap-3"><Field label="Amount"><input inputMode="decimal" className={inputClass} value={entry.amount} onChange={(e)=>setEntry({...entry,amount:e.target.value})}/></Field><Field label="Category"><select className={inputClass} value={entry.category} onChange={(e)=>setEntry({...entry,category:e.target.value})}>{["RENT","LATE_FEE","SECURITY_DEPOSIT","UTILITY","REPAIR","OTHER"].map((v)=><option key={v}>{v.replaceAll("_"," ")}</option>)}</select></Field></div>{entry.entry_type === "PAYMENT" ? <Field label="Payment method"><select className={inputClass} value={entry.payment_method} onChange={(e)=>setEntry({...entry,payment_method:e.target.value})}>{["CASH","CHECK","ACH","CARD","MONEY_ORDER","HOUSING_AUTHORITY","OTHER"].map((v)=><option key={v}>{v.replaceAll("_"," ")}</option>)}</select></Field> : null}<Field label="Reference / check number"><input className={inputClass} value={entry.reference} onChange={(e)=>setEntry({...entry,reference:e.target.value})}/></Field><Field label="Memo"><textarea rows="3" className={inputClass} value={entry.memo} onChange={(e)=>setEntry({...entry,memo:e.target.value})}/></Field><Button tone="cyan" onClick={save} disabled={saving}>{saving?"Saving...":"Save Entry"}</Button></div></section>
    <section className="rounded-[28px] border border-cyan-500/15 bg-[#07111f]/90 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black">Tenant ledger</h2><p className="mt-1 text-xs text-slate-500">Charges increase the balance; payments and credits reduce it.</p></div><div className="flex gap-2"><select className={inputClass} style={{width:240}} value={filterTenant} onChange={(e)=>setFilterTenant(e.target.value)}><option value="">All tenants</option>{tenants.map((t)=><option key={t.id} value={t.id}>{t.full_name}</option>)}</select><Button tone="slate" onClick={exportCsv}>Export CSV</Button></div></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-slate-700 text-xs uppercase tracking-wider text-slate-500">{["Date","Tenant","Type","Category","Method","Reference","Amount"].map((h)=><th key={h} className="px-3 py-3">{h}</th>)}</tr></thead><tbody>{entries.map((e)=><tr key={e.id} className="border-b border-slate-800"><td className="px-3 py-3">{e.entry_date}</td><td className="px-3 py-3 font-bold text-white">{e.tenant_name}</td><td className="px-3 py-3">{e.entry_type}</td><td className="px-3 py-3">{e.category}</td><td className="px-3 py-3">{e.payment_method||"—"}</td><td className="px-3 py-3">{e.reference||"—"}</td><td className={`px-3 py-3 font-black ${["PAYMENT","CREDIT"].includes(e.entry_type)?"text-emerald-300":"text-rose-200"}`}>{["PAYMENT","CREDIT"].includes(e.entry_type)?"−":"+"}{money(e.amount)}</td></tr>)}</tbody></table>{!entries.length ? <div className="py-12 text-center text-sm text-slate-500">No ledger entries yet.</div> : null}</div></section></div>
  </main></div>;
}
