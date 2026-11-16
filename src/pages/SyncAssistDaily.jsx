import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Circle, RefreshCw, Plus, Mail, CalendarDays, Clock3, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext";

const ENDPOINT = "/sync-ai/assist/pilot/daily/";
const FILTERS = ["ALL", "PROPERTY", "BUSINESS", "GROWTH", "PERSONAL"];
const PRIORITIES = ["HIGH", "MEDIUM", "LOW"];

export default function SyncAssistDaily() {
  const navigate = useNavigate();
  const {user} = useAuth();
  const authorized = String(user?.email || "").trim().toLowerCase() === "jacoblord7@outlook.com";
  const [data,setData] = useState(null);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");
  const [filter,setFilter] = useState("ALL");
  const [showAll,setShowAll] = useState(false);
  const [adding,setAdding] = useState(false);
  const [form,setForm] = useState({title:"",description:"",priority:"MEDIUM",category:"PERSONAL"});

  async function refresh() {
    setLoading(true);setError("");
    try {const r=await api.get(ENDPOINT,{timeout:20000});setData(r.data);}
    catch(e) {setError(e?.response?.data?.detail || "Daily briefing is unavailable. Try again.");}
    finally {setLoading(false);}
  }
  useEffect(()=>{if(authorized) refresh();},[authorized]);
  async function create(e) {
    e.preventDefault();setLoading(true);setError("");
    try {const r=await api.post(ENDPOINT,form);setData(r.data);setAdding(false);setForm({title:"",description:"",priority:"MEDIUM",category:"PERSONAL"});}
    catch(e) {setError(e?.response?.data?.detail || "Couldn't save your to-do.");}
    finally {setLoading(false);}
  }
  async function update(item,status) {
    setLoading(true);setError("");
    try {const r=await api.post(ENDPOINT+"item/",{id:item.id,status});setData(r.data);}
    catch(e) {setError(e?.response?.data?.detail || "Couldn't update this to-do.");}
    finally {setLoading(false);}
  }
  const visible = useMemo(()=>(data?.items || []).filter(i=>filter==="ALL"||i.category===filter).filter(i=>showAll || i.status==="OPEN").slice(0,showAll?250:10),[data,filter,showAll]);
  return <main className="min-h-dvh bg-[#020617] px-4 pb-32 pt-28 text-white">
    <div className="mx-auto max-w-3xl">
      <header className="mb-4 flex items-center justify-between gap-2">
        <button type="button" onClick={()=>navigate("/sync/assist")} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 px-3 text-sm"><ArrowLeft size={17}/> SYNC Assist</button>
        <div className="text-right"><div className="text-xs font-black uppercase tracking-[.18em] text-cyan-300">Jarvis Daily</div><div className="text-xs text-slate-400">{data?.date || "Your command center"}</div></div>
      </header>
      <section className="rounded-3xl border border-cyan-400/30 bg-gradient-to-br from-[#06263a] to-[#180e35] p-5">
        <h1 className="text-2xl font-black">Good to see you. Here's today.</h1>
        <p className="mt-2 text-sm text-slate-300">A focused list from your SyncWorks businesses, properties and personal tasks.</p>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {[["Needs action",data?.summary.open],["Important",data?.summary.high_priority],["Completed",data?.summary.done]].map(([label,value])=><div key={label} className="rounded-xl border border-white/15 bg-slate-950/50 p-3 text-center"><div className="text-2xl font-black">{value??"–"}</div><div className="mt-1 text-[11px] text-slate-300">{label}</div></div>)}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={loading} onClick={refresh} className="flex min-h-11 items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-950/40 px-4 text-sm font-bold"><RefreshCw size={16}/> Refresh</button>
          <button type="button" onClick={()=>setAdding(v=>!v)} className="flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 text-sm font-black"><Plus size={16}/> Add to-do</button>
        </div>
      </section>

      {error && <p role="alert" className="mt-3 rounded-xl border border-rose-400/30 p-3 text-sm text-rose-200">{error}</p>}
      {!authorized && <p role="alert" className="mt-4 text-rose-300">Private pilot access only.</p>}
      {adding && <form onSubmit={create} className="mt-4 space-y-3 rounded-2xl border border-cyan-400/30 bg-slate-900 p-4">
        <h2 className="font-black">New to-do</h2>
        <label className="block text-sm">What needs doing?<input required maxLength={140} value={form.title} onChange={e=>setForm(v=>({...v,title:e.target.value}))} className="mt-1 min-h-11 w-full rounded-lg border border-slate-600 bg-slate-950 px-3" placeholder="e.g. Follow up on inspection"/></label>
        <label className="block text-sm">Details (optional)<textarea rows={2} maxLength={1000} value={form.description} onChange={e=>setForm(v=>({...v,description:e.target.value}))} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 p-3"/></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs">Priority<select value={form.priority} onChange={e=>setForm(v=>({...v,priority:e.target.value}))} className="mt-1 min-h-11 w-full rounded-lg border border-slate-600 bg-slate-950 p-2">{PRIORITIES.map(v=><option key={v}>{v}</option>)}</select></label>
          <label className="text-xs">Area<select value={form.category} onChange={e=>setForm(v=>({...v,category:e.target.value}))} className="mt-1 min-h-11 w-full rounded-lg border border-slate-600 bg-slate-950 p-2">{FILTERS.filter(v=>v!=="ALL").map(v=><option key={v}>{v}</option>)}</select></label>
        </div>
        <button type="submit" disabled={loading || !form.title.trim()} className="min-h-11 w-full rounded-xl bg-cyan-600 px-3 font-black disabled:opacity-40">Save to today's list</button>
      </form>}

      <section className="mt-4 rounded-2xl border border-amber-400/20 bg-slate-900/50 p-3">
        <div className="flex items-center gap-2 text-sm font-bold text-amber-200"><Mail size={18}/> Outlook inbox not linked inside SyncWorks</div>
        <p className="mt-1 text-xs leading-5 text-slate-400">Outlook is available in ChatGPT, but the app needs its own authorized Microsoft connection before Jarvis can read and summarize your mailbox each morning. Email, calendar sync and automatic brief delivery are not active here.</p>
      </section>

      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-lg font-black">Your priorities</h2><label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={showAll} onChange={e=>setShowAll(e.target.checked)}/> Show completed</label></div>
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">{FILTERS.map(v=><button key={v} type="button" onClick={()=>setFilter(v)} className={`min-h-10 shrink-0 rounded-xl border px-3 text-xs font-black ${filter===v?"border-cyan-400 bg-cyan-900/40 text-cyan-100":"border-slate-700 text-slate-400"}`}>{v[0]+v.slice(1).toLowerCase()}</button>)}</div>
        {visible.length===0 && <p className="rounded-xl border border-white/10 p-4 text-sm text-slate-400">{loading?"Loading your tasks…":"No matching tasks. Add a personal task or connect business records."}</p>}
        <div className="space-y-2">{visible.map(item=><article key={item.id} className="rounded-2xl border border-white/10 bg-slate-900/60 p-3">
          <div className="flex items-start gap-3">
            <button type="button" aria-label={item.status==="DONE"?"Reopen":"Mark complete"} disabled={loading} onClick={()=>update(item,item.status==="DONE"?"OPEN":"DONE")} className="mt-0.5 rounded-full p-2 text-cyan-300">{item.status==="DONE"?<CheckCircle2 size={22}/>:<Circle size={22}/>}</button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wide"><span className={item.priority==="HIGH"?"text-amber-300":"text-cyan-300"}>{item.priority} priority</span><span className="text-slate-500">{item.category}</span><span className="text-slate-500">{item.source==="syncworks"?"SyncWorks":"My task"}</span></div>
              <h3 className={`mt-1 text-sm font-bold ${item.status==="DONE"?"text-slate-500 line-through":"text-white"}`}>{item.title}</h3>
              {item.description && <p className="mt-1 text-xs leading-5 text-slate-400">{item.description}</p>}
              <div className="mt-2 flex gap-2">{item.status==="OPEN"?<button type="button" disabled={loading} onClick={()=>update(item,"SNOOZED")} className="flex min-h-9 items-center gap-1 rounded-lg border border-slate-700 px-3 text-xs text-slate-300"><Clock3 size={13}/> Snooze</button>:<button type="button" disabled={loading} onClick={()=>update(item,"OPEN")} className="min-h-9 rounded-lg border border-slate-700 px-3 text-xs text-slate-300">Reopen</button>}</div>
            </div>
          </div>
        </article>)}</div>
        {!showAll && (data?.items?.filter(i=>i.status==="OPEN" && (filter==="ALL" || i.category===filter)).length||0)>10 && <button onClick={()=>setShowAll(true)} className="mt-3 min-h-11 w-full rounded-xl border border-cyan-500/30 text-sm text-cyan-300">Show remaining tasks</button>}
      </section>
      <div className="mt-5 rounded-2xl border border-slate-700 p-4 text-xs leading-5 text-slate-400">
        <p className="font-bold text-cyan-200">Background monitoring</p>
        <p>Scanner: {data?.connections?.background_scanner==="recent_runs_verified"?"Recently verified":"Not verified"} · Morning email briefing: Not enabled.</p>
        <p className="mt-1">{data?.source_note}</p>
      </div>
    </div>
  </main>;
}
