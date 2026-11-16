import React,{useEffect,useState} from "react";
import {useNavigate} from "react-router-dom";
import {ArrowLeft,RefreshCw,Plus,ChevronDown,Mail,CheckCircle2} from "lucide-react";
import api from "../api/client";
import {useAuth} from "../auth/AuthContext";

const BASE="/sync-ai/assist/pilot/chief/";
const EMPTY={title:"",details:"",next_step:"",category:"PROPERTY",priority:"HIGH"};
export default function SyncAssistChiefOfStaff(){
  const navigate=useNavigate();
  const {user}=useAuth();
  const authorized=String(user?.email||"").trim().toLowerCase()==="jacoblord7@outlook.com";
  const [brief,setBrief]=useState(null),[cases,setCases]=useState([]),[busy,setBusy]=useState(false);
  const [error,setError]=useState(""),[notice,setNotice]=useState("");
  const [expanded,setExpanded]=useState("cases"),[adding,setAdding]=useState(false);
  const [form,setForm]=useState(EMPTY),[resolution,setResolution]=useState({}),[showResolved,setShowResolved]=useState(false);
  async function refresh(){
    setBusy(true);setError("");
    try{
      const [b,c]=await Promise.all([api.get(BASE+"brief/",{timeout:20000}),api.get(BASE+"cases/",{timeout:20000})]);
      setBrief(b.data);setCases(c.data.cases||[]);
    }catch(e){setError(e?.response?.data?.detail||"Unable to load Chief of Staff. Try again.");}
    finally{setBusy(false);}
  }
  useEffect(()=>{if(authorized)refresh();},[authorized]);
  async function create(e){
    e.preventDefault();setBusy(true);setError("");setNotice("");
    try{const r=await api.post(BASE+"cases/",form);setCases(r.data.cases);setAdding(false);setForm(EMPTY);setNotice("Case registered. Jarvis will keep it visible until you resolve it.");await refresh();}
    catch(e){setError(e?.response?.data?.detail||"Case could not be saved.");}
    finally{setBusy(false);}
  }
  async function change(item,state){
    const note=(resolution[item.id]||"").trim();
    if(state==="RESOLVED"&&note.length<8){setError("Please enter at least 8 characters explaining what confirmed resolution.");return;}
    setBusy(true);setError("");setNotice("");
    try{const r=await api.post(BASE+"cases/"+encodeURIComponent(item.id)+"/decision/",{status:state,resolution_note:state==="RESOLVED"?note:""});setCases(r.data.cases);setNotice("Updated case: "+item.title);await refresh();}
    catch(e){setError(e?.response?.data?.detail||"Case update failed.");}
    finally{setBusy(false);}
  }
  const open=cases.filter(x=>x.status!=="RESOLVED");
  const areas=["PROPERTY","BUSINESS","FINANCE","GROWTH","PERSONAL"];
  return <main className="min-h-dvh bg-[#020617] px-4 pb-32 pt-28 text-white"><div className="mx-auto max-w-3xl">
    <div className="mb-4 flex items-center justify-between gap-2">
      <button type="button" onClick={()=>navigate("/sync/assist/daily")} className="flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-3 text-sm"><ArrowLeft size={17}/> Jarvis Daily</button>
      <button type="button" onClick={refresh} disabled={busy||!authorized} className="flex min-h-11 items-center gap-2 rounded-xl border border-cyan-400/30 px-3 text-sm"><RefreshCw size={16}/> Refresh</button>
    </div>
    <section className="rounded-3xl border border-cyan-400/30 bg-gradient-to-br from-[#06263a] to-[#1b123c] p-5">
      <p className="text-xs font-black uppercase tracking-widest text-cyan-200">Jarvis · Chief of Staff</p>
      <h1 className="mt-2 text-2xl font-black">Your daily intelligence</h1>
      <p className="mt-2 text-sm leading-6 text-slate-300">What needs attention, what remains unresolved, and where to go next.</p>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[[brief?.counts?.tasks_open,"Tasks"],[brief?.counts?.cases_open,"Open cases"],[brief?.counts?.cases_high,"High priority cases"]].map(([n,l])=><div key={l} className="rounded-xl border border-white/15 bg-slate-950/40 p-3"><div className="text-2xl font-black">{n??"—"}</div><p className="text-[11px] text-slate-300">{l}</p></div>)}
      </div>
      <p className="mt-3 text-xs text-slate-400">{brief?.date||"On-demand"} · Not a scheduled or complete inbox briefing</p>
    </section>
    {error&&<p role="alert" className="mt-3 rounded-xl border border-rose-400/40 p-3 text-sm text-rose-200">{error}</p>}
    {notice&&<p role="status" className="mt-3 rounded-xl border border-emerald-400/30 p-3 text-sm text-emerald-200">{notice}</p>}
    {!authorized&&<p className="mt-3 text-rose-200">Private pilot account only.</p>}
    {brief?.sections?.map(s=><section key={s.key} className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1429]">
      <button type="button" onClick={()=>setExpanded(v=>v===s.key?"":s.key)} aria-expanded={expanded===s.key} className="flex min-h-16 w-full items-center justify-between gap-3 p-4 text-left">
        <span className="min-w-0"><strong className="block text-sm text-white">{s.title}</strong><span className="mt-1 block text-xs leading-5 text-slate-300">{s.headline}</span></span><ChevronDown size={18} className={expanded===s.key?"rotate-180 text-cyan-200":"text-slate-400"}/>
      </button>
      {expanded===s.key&&<div className="border-t border-white/10 p-4">
        <p className="text-xs leading-5 text-slate-400">Source: {s.scope}</p>
        {(s.items||[]).map((x,i)=><div key={i} className="mt-3 rounded-xl border border-white/10 p-3"><p className="text-sm font-bold">{x.title}</p><p className="mt-1 text-xs text-cyan-200">{x.next_action}</p></div>)}
        {s.key==="email"&&<button onClick={()=>navigate("/sync/assist/email")} className="mt-3 flex min-h-11 items-center gap-2 rounded-xl border border-cyan-400/30 px-4 text-sm text-cyan-200"><Mail size={16}/> Open Mail Desk</button>}
        {s.key==="today"&&<button onClick={()=>navigate("/sync/assist/daily")} className="mt-3 min-h-11 rounded-xl border border-cyan-400/30 px-4 text-sm text-cyan-200">Open task list</button>}
        {s.key==="cases"&&<button onClick={()=>setAdding(true)} className="mt-3 flex min-h-11 items-center gap-2 rounded-xl border border-cyan-400/30 px-4 text-sm text-cyan-200"><Plus size={16}/> Track an issue</button>}
      </div>}
    </section>)}
    <section className="mt-5 rounded-2xl border border-cyan-400/25 bg-slate-900/50 p-4">
      <div className="flex items-center justify-between gap-2"><h2 className="text-lg font-black">Unresolved issue register</h2><button onClick={()=>setAdding(v=>!v)} className="flex min-h-10 items-center gap-1 rounded-lg bg-cyan-900 px-3 text-xs font-bold"><Plus size={15}/> Add case</button></div>
      <p className="mt-2 text-xs leading-5 text-slate-400">Owner-entered facts only. Jarvis will never assume a payment dispute is resolved from silence.</p>
      {adding&&<form onSubmit={create} className="mt-4 space-y-3 rounded-xl border border-white/10 p-3">
        <label className="block text-xs">Issue title<input required maxLength={140} value={form.title} onChange={e=>setForm(v=>({...v,title:e.target.value}))} className="mt-1 min-h-11 w-full rounded-lg border border-slate-600 bg-slate-950 p-3" placeholder="e.g. MHA / Adair payment reconciliation"/></label>
        <label className="block text-xs">What is known<textarea maxLength={2000} rows={3} value={form.details} onChange={e=>setForm(v=>({...v,details:e.target.value}))} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 p-3" placeholder="Known facts, unverified amounts and what evidence is missing"/></label>
        <label className="block text-xs">Next recommended action<input maxLength={500} value={form.next_step} onChange={e=>setForm(v=>({...v,next_step:e.target.value}))} className="mt-1 min-h-11 w-full rounded-lg border border-slate-600 bg-slate-950 p-3" placeholder="Review correspondence and prepare follow-up"/></label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs">Area<select value={form.category} onChange={e=>setForm(v=>({...v,category:e.target.value}))} className="mt-1 min-h-11 w-full rounded-lg border border-slate-600 bg-slate-950 p-2">{areas.map(s=><option key={s}>{s}</option>)}</select></label>
          <label className="text-xs">Priority<select value={form.priority} onChange={e=>setForm(v=>({...v,priority:e.target.value}))} className="mt-1 min-h-11 w-full rounded-lg border border-slate-600 bg-slate-950 p-2">{["HIGH","MEDIUM","LOW"].map(s=><option key={s}>{s}</option>)}</select></label>
        </div>
        <button type="submit" disabled={busy||!form.title.trim()} className="min-h-11 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 font-black disabled:opacity-40">Track unresolved case</button>
      </form>}
      <label className="mt-4 flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={showResolved} onChange={e=>setShowResolved(e.target.checked)}/> Include resolved cases</label>
      {cases.filter(x=>showResolved||x.status!=="RESOLVED").length===0&&<p className="mt-3 rounded-xl border border-white/10 p-3 text-sm text-slate-400">No cases recorded. Add an issue to start tracking it.</p>}
      {cases.filter(x=>showResolved||x.status!=="RESOLVED").map(x=><article key={x.id} className="mt-3 rounded-xl border border-white/10 bg-slate-950/50 p-3">
        <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase"><span className="text-amber-200">{x.priority}</span><span className="text-cyan-200">{x.category}</span><span className="text-slate-400">{x.status}</span></div>
        <h3 className="mt-1 text-sm font-bold">{x.title}</h3>
        {x.details&&<p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-300">{x.details}</p>}
        {x.next_step&&<p className="mt-2 text-xs text-cyan-200">Next: {x.next_step}</p>}
        {x.status==="RESOLVED"?<p className="mt-2 text-xs text-emerald-200"><CheckCircle2 size={14} className="mr-1 inline"/> {x.resolution_note}</p>:<>
          <label className="mt-3 block text-xs text-slate-300">Resolution evidence / confirmation<input value={resolution[x.id]||""} maxLength={1000} onChange={e=>setResolution(v=>({...v,[x.id]:e.target.value}))} className="mt-1 min-h-11 w-full rounded-lg border border-slate-600 bg-slate-950 p-3" placeholder="Required to mark resolved"/></label>
          <div className="mt-2 flex flex-wrap gap-2">
            {x.status!=="WAITING"&&<button disabled={busy} onClick={()=>change(x,"WAITING")} className="min-h-10 rounded-lg border border-slate-600 px-3 text-xs">Awaiting response</button>}
            {x.status==="WAITING"&&<button disabled={busy} onClick={()=>change(x,"OPEN")} className="min-h-10 rounded-lg border border-slate-600 px-3 text-xs">Reopen</button>}
            <button disabled={busy} onClick={()=>change(x,"RESOLVED")} className="min-h-10 rounded-lg border border-emerald-600/50 px-3 text-xs text-emerald-200">Confirm resolved</button>
          </div>
        </>}
      </article>)}
    </section>
    <p className="mt-4 text-xs leading-5 text-slate-400">This briefing is generated only when opened or refreshed. It does not prove email scanning, verified infrastructure health monitoring, background execution, or automated message delivery.</p>
  </div></main>;
}
