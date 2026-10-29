import React, { useCallback, useEffect, useState } from "react";
import api from "../../api/client";

function usd(cents) { return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format((Number(cents)||0)/100); }

export default function CashFeeAgingConsole() {
  const [data,setData] = useState(null);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");
  const load=useCallback(async()=>{
    setLoading(true);setError("");
    try { const r=await api.get("/platform/locking/cash-status/"); setData(r.data); }
    catch(e){setError(e?.response?.data?.detail || "Unable to load cash billing status.");}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{load();},[load]);
  const rows=data?.results||[];
  const locked=rows.filter(row=>row.is_locked);
  return <section className="rounded-2xl border border-cyan-400/20 bg-slate-950/70 p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="font-black text-white">Cash fee grace & account locks</h3>
        <p className="mt-1 text-xs leading-5 text-slate-400">Founder audit. Cash-fee lock threshold: three calendar months after invoice due date. Payment collection and refund reconciliation must be confirmed separately.</p>
      </div>
      <button type="button" disabled={loading} onClick={load} className="min-h-10 rounded-xl border border-cyan-400/30 px-3 text-xs font-black text-cyan-100">{loading?"Refreshing…":"Refresh status"}</button>
    </div>
    {error?<p role="alert" className="mt-3 text-xs text-rose-200">{error}</p>:null}
    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
      {[["Cash debt accounts",rows.length],["Locked",locked.length],["Limit reached",rows.filter(x=>x.lock_due).length]].map(([label,n])=>
        <div key={label} className="rounded-xl bg-slate-900 p-3"><div className="text-xl font-black text-white">{n}</div><div className="text-[11px] text-slate-400">{label}</div></div>
      )}
    </div>
    <div className="mt-3 overflow-x-auto">
      <table className="min-w-[730px] w-full text-xs">
        <thead className="bg-slate-900 text-left text-slate-400"><tr>{["Business","Outstanding","Oldest due","Lock date","Days remaining","State"].map(x=><th key={x} className="p-2">{x}</th>)}</tr></thead>
        <tbody>{rows.map(row=><tr key={row.business_id} className="border-t border-slate-800 text-slate-200">
          <td className="p-2"><div className="font-bold">{row.business_name}</div><div className="text-[11px] text-slate-500">{row.owner_email}</div></td>
          <td className="p-2 font-bold">{usd(row.unpaid_cents)}</td>
          <td className="p-2">{row.oldest_due||"—"}</td>
          <td className="p-2">{row.lock_at||"—"}</td>
          <td className="p-2">{row.days_until_lock??"—"}</td>
          <td className="p-2"><span className={row.is_locked?"text-rose-200":row.lock_due?"text-amber-200":"text-cyan-200"}>{row.is_locked?"LOCKED: "+row.lock_reason:row.lock_due?"Enforcement due":"In grace period"}</span></td>
        </tr>)}</tbody>
      </table>
      {data?.truncated?<p className="p-3 text-xs text-amber-200">Showing only first 500 accounts. Export/report pagination must be added for larger scale.</p>:null}
      {!loading&&!rows.length&&!error?<p className="p-3 text-xs text-slate-400">No outstanding cash-fee accounts reported.</p>:null}
    </div>
    <p className="mt-3 text-[11px] text-slate-500">Locked accounts can still access their invoices and support. Changing an invoice to paid without verified settlement is not a substitute for payment reconciliation.</p>
  </section>;
}
