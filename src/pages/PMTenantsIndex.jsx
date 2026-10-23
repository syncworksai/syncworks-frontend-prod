import React,{useEffect,useMemo,useState} from "react";
import {useNavigate,useSearchParams} from "react-router-dom";
import api from "../api/client";
import PMShell from "../components/pm/PMShell";

const list=v=>Array.isArray(v?.results)?v.results:Array.isArray(v)?v:[];
export default function PMTenantsIndex(){
  const nav=useNavigate();const [params]=useSearchParams();
  const [tenants,setTenants]=useState([]);
  const [q,setQ]=useState("");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  useEffect(()=>{
    let live=true;
    (async()=>{try{
      const w=(await api.get("/pm-hub/workspaces/current/")).data;
      const r=await api.get("/pm-hub/tenants/",{headers:{"X-PM-Workspace-ID":String(w.id)}});
      if(live)setTenants(list(r.data));
    }catch(e){if(live)setError(e?.response?.data?.detail||"Unable to load residents.");}
    finally{if(live)setLoading(false);}})();
    return()=>{live=false;};
  },[]);
  const visible=useMemo(()=>tenants.filter(t=>[t.full_name,t.email,t.property_name].some(v=>String(v||"").toLowerCase().includes(q.toLowerCase()))),[tenants,q]);
  return <PMShell><main className="mx-auto max-w-5xl space-y-3 px-3 py-3 pb-[calc(8rem+env(safe-area-inset-bottom))] text-slate-100 sm:px-6">
    <div className="flex items-start justify-between gap-2"><div><h1 className="text-lg font-black">Tenant records</h1><p className="mt-1 text-xs text-slate-400">Find an existing tenant before importing or creating a duplicate record.</p></div><button onClick={()=>nav("/pm/handoff")} className="min-h-10 rounded-lg border border-cyan-400/40 px-2 text-xs font-bold text-cyan-100">Handoff</button></div>
    <input aria-label="Search tenants" className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm" placeholder="Search name, email or property" value={q} onChange={e=>setQ(e.target.value)} />
    {loading?<p className="text-xs text-slate-400">Loading residents…</p>:null}
    {error?<p role="alert" className="rounded-lg border border-rose-400/25 bg-rose-500/5 p-3 text-xs">{error}</p>:null}
    <div className="grid gap-2 sm:grid-cols-2">{visible.map(t=><article key={t.id} className="rounded-xl border border-slate-700 bg-[#07111f] p-3">
      <div className="truncate text-sm font-black">{t.full_name||[t.first_name,t.last_name].filter(Boolean).join(" ")}</div><div className="mt-1 text-[11px] text-slate-400">{t.property_name||"Property not assigned"} · {t.unit_label||"No unit"}</div>
      <div className="mt-1 truncate text-[11px] text-slate-500">{t.email}</div>
      <button type="button" className="mt-3 min-h-9 w-full rounded-lg border border-cyan-500/35 bg-cyan-500/10 px-3 text-xs font-black text-cyan-100" onClick={()=>nav(`/pm/payments?tenant=${t.id}`)}>Review tenant ledger</button>
    </article>)}</div>
    {!loading && !visible.length?<p className="text-xs text-slate-400">No matching tenants. Check the tenancy records before entering an opening balance or creating a new resident.</p>:null}
  </main></PMShell>;
}
