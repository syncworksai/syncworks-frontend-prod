import React,{useEffect,useState} from "react";
import {useNavigate} from "react-router-dom";
import api from "../api/client";
import ModeBar from "../components/ModeBar";
const tone={cyan:"border-cyan-500/30 bg-cyan-500/10 text-cyan-100",amber:"border-amber-500/30 bg-amber-500/10 text-amber-100"};
export default function PMStaffDashboard(){
 const nav=useNavigate();const [data,setData]=useState(null),[loading,setLoading]=useState(true),[err,setErr]=useState(""),[busy,setBusy]=useState(null),[code,setCode]=useState("");
 async function load(){setLoading(true);setErr("");try{
 const r=await api.get("/pm-hub/access/team/dashboard/");setData(r.data);
 }catch(e){setErr(e?.response?.data?.detail||"You do not have an active PM workspace assignment.");setData(null);}
 finally{setLoading(false);}}
 useEffect(()=>{load();},[]);
 async function update(t,state){setBusy(t.id);try{await api.patch(`/pm-hub/access/tasks/${t.id}/`,{status:state},{"headers":{"X-PM-Workspace-ID":String(data.workspace.id)}});await load();}catch(e){setErr(e?.response?.data?.detail||"Task could not be updated.");}finally{setBusy(null);}}
 async function accept(e){e.preventDefault();try{await api.post("/pm-hub/access/team/accept/",{code});setCode("");await load();}catch(e){setErr(e?.response?.data?.detail||"Invitation invalid.");}}
 const tasks=data?.tasks||[];
 const workgroups={ONBOARDING:"Onboarding",EVICTIONS:"Evictions",DOCUMENTS:"Paperwork",MAINTENANCE:"Maintenance",INSPECTIONS:"Inspections",ACCOUNTING:"Accounting",COMMUNICATIONS:"Communications",GENERAL:"Other"};
 return <div className="min-h-screen bg-[#040914] text-slate-100"><ModeBar/><main className="mx-auto max-w-5xl space-y-3 px-3 pb-28 pt-4 sm:px-6">
 <div className="flex items-start justify-between gap-2"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-300">Team workspace</div><h1 className="text-xl font-black">My PM Assignments</h1><p className="mt-1 text-xs text-slate-400">{data?data.workspace.name+" · "+data.role.replaceAll("_"," "):"Role-based access"}</p></div><button className="rounded-lg border border-slate-700 px-3 py-2 text-xs" onClick={()=>nav("/customer")}>Exit</button></div>
 {err?<div role="alert" className="rounded-lg border border-amber-400/30 bg-amber-500/5 p-3 text-xs text-amber-100">{err}</div>:null}
 {loading?<p className="text-sm text-slate-400">Loading assignments…</p>:null}
 {!loading&&!data?<form onSubmit={accept} className="rounded-xl border border-cyan-400/25 bg-[#07111f] p-4">
 <h2 className="text-sm font-black">Join a management team</h2><p className="mt-1 text-xs text-slate-400">Enter your owner's invitation code using the exact invited account email.</p><input required value={code} onChange={e=>setCode(e.target.value)} placeholder="Team invitation code" className="mt-3 min-h-11 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 text-sm"/><button className="mt-2 min-h-11 w-full rounded-lg bg-cyan-400 text-xs font-black text-slate-950">Accept invitation</button>
 </form>:null}
 {data?<><div className="grid grid-cols-3 gap-2">{[["My open tasks",data.open],["Assigned properties",data.properties?.length||0],["Access areas",data.permissions?.length||0]].map(([name,v])=><div key={name} className="rounded-xl border border-slate-700 bg-[#07111f] p-2.5"><div className="text-[10px] text-slate-400">{name}</div><div className="mt-1 text-xl font-black">{v}</div></div>)}</div>
 <div className="rounded-xl border border-cyan-500/25 bg-[#07111f] p-3"><h2 className="text-sm font-black">My work queue</h2><p className="mt-1 text-[11px] text-slate-400">Tasks are scoped to your assigned properties and categories. Legal case closure and financial actions require the appropriate owner review.</p>
 {Object.entries(workgroups).map(([category,name])=>{
 const rows=tasks.filter(x=>x.category===category && x.status!=="DONE" && x.status!=="CANCELED");
 if(!rows.length)return null;
 return <section key={category} className="mt-3"><h3 className="mb-2 text-xs font-black text-cyan-100">{name} · {rows.length}</h3><div className="grid gap-2 sm:grid-cols-2">{rows.map(t=><article key={t.id} className="rounded-lg border border-slate-700 bg-black/20 p-3"><div className="flex justify-between gap-2"><strong className="text-sm">{t.title}</strong><span className="shrink-0 text-[10px] text-amber-200">{t.status.replaceAll("_"," ")}</span></div><div className="mt-1 text-[11px] text-slate-400">{t.property_name}{t.due_date?" · Due "+t.due_date:""}</div>{t.notes?<p className="mt-2 text-[11px] text-slate-300">{t.notes}</p>:null}
 <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" disabled={busy===t.id} onClick={()=>update(t,"IN_PROGRESS")} className="min-h-9 rounded-lg border border-cyan-400/35 text-[11px] text-cyan-100">Working on it</button><button type="button" disabled={busy===t.id} onClick={()=>update(t,category==="EVICTIONS"?"REVIEW":"DONE")} className="min-h-9 rounded-lg bg-cyan-500/15 text-[11px] font-bold text-cyan-100">{category==="EVICTIONS"?"Send for review":"Mark complete"}</button></div>
 </article>)}</div></section>;
 })}
 {!tasks.length?<p className="mt-3 text-xs text-slate-500">No assignments yet. The portfolio owner can assign property-specific work.</p>:null}
 </div><div className="rounded-xl border border-slate-700 bg-[#07111f] p-3"><h2 className="text-sm font-black">Properties I work on</h2><div className="mt-2 grid gap-2 sm:grid-cols-2">{data.properties.map(p=><div key={p.id} className="rounded-lg border border-slate-700 p-2.5"><div className="text-xs font-bold">{p.name}</div><p className="mt-1 text-[11px] text-slate-400">{p.address}</p></div>)}</div></div>
 </>:null}
 </main></div>;
}
