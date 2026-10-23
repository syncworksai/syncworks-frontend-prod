import React,{useEffect,useState} from "react";
import {useNavigate} from "react-router-dom";
import api from "../api/client";
import PMShell from "../components/pm/PMShell";

const list=x=>Array.isArray(x?.results)?x.results:Array.isArray(x)?x:[];
export default function PMPropertiesIndex(){
  const nav=useNavigate();
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  useEffect(()=>{
    let live=true;
    (async()=>{
      try{
        const w=(await api.get("/pm-hub/workspaces/current/")).data;
        const r=await api.get("/pm-hub/properties/",{headers:{"X-PM-Workspace-ID":String(w.id)}});
        if(live)setItems(list(r.data));
      }catch(e){if(live)setError(e?.response?.data?.detail||"Unable to load the portfolio.");}
      finally{if(live)setLoading(false);}
    })();
    return()=>{live=false;};
  },[]);
  return <PMShell><main className="mx-auto max-w-5xl space-y-3 px-3 py-3 pb-[calc(7rem+env(safe-area-inset-bottom))] text-slate-100 sm:px-6">
    <div className="flex items-center justify-between gap-2"><div><h1 className="text-lg font-black">Properties</h1><p className="mt-1 text-xs text-slate-400">Select a property before creating another record.</p></div><button type="button" onClick={()=>nav("/pm/handoff")} className="min-h-10 rounded-xl border border-cyan-400/40 px-3 text-xs font-black text-cyan-100">Guided takeover</button></div>
    <div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={()=>nav("/pm/properties/new")} className="rounded-xl border border-dashed border-cyan-400/50 bg-cyan-500/5 p-4 text-left text-sm font-black text-cyan-100">+ Add a new property</button></div>
    {error?<div role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm">{error}</div>:null}
    {loading?<p className="text-sm text-slate-400">Loading…</p>:null}
    {!loading && !items.length?<p className="text-xs text-slate-400">No properties yet. Create a property, then choose whether to set it up from scratch or transfer existing management.</p>:null}
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{items.map(p=><article key={p.id} className="rounded-xl border border-slate-700 bg-[#07111f] p-3">
      <div className="truncate text-sm font-black">{p.name||"Unnamed property"}</div><div className="mt-1 text-[11px] text-slate-400">{[p.address,p.city,p.state].filter(Boolean).join(", ")}</div>
      <div className="mt-3 flex gap-2"><button type="button" onClick={()=>nav(`/pm/properties/${p.id}`)} className="min-h-9 flex-1 rounded-lg border border-slate-600 px-2 text-[11px] font-bold">Open property</button><button type="button" onClick={()=>nav(`/pm/handoff?property=${p.id}`)} className="min-h-9 flex-1 rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-2 text-[11px] font-black text-cyan-100">Take over / setup</button></div>
    </article>)}</div>
  </main></PMShell>;
}
