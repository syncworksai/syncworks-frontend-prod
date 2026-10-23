import React,{useEffect,useMemo,useState} from "react";
import {useNavigate} from "react-router-dom";
import api from "../api/client";
import PMShell from "../components/pm/PMShell";
const list=d=>Array.isArray(d?.results)?d.results:Array.isArray(d)?d:[];
const input="min-h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white";
const Field=({label,children})=><label className="min-w-0 block"><span className="mb-1 block text-[11px] font-bold text-slate-300">{label}</span>{children}</label>;
const roles=[["MANAGER","Manager"],["LEASING","Leasing / Onboarding"],["EVICTIONS","Evictions / Legal coordination"],["MAINTENANCE","Maintenance"],["ACCOUNTING","Accounting"],["DOCUMENTS","Documents / Agency requests"],["VIEW_ONLY","View only"]];
const categories=[["ONBOARDING","Onboarding"],["EVICTIONS","Evictions"],["MAINTENANCE","Maintenance"],["DOCUMENTS","Documents"],["INSPECTIONS","Inspections"],["ACCOUNTING","Accounting"],["COMMUNICATIONS","Communications"],["GENERAL","General"]];
const caps={MANAGER:["onboarding","evictions","maintenance","documents","communications","accounting","inspections","general"],LEASING:["onboarding","documents","communications","general"],EVICTIONS:["evictions","documents","communications"],MAINTENANCE:["maintenance","inspections","general"],ACCOUNTING:["accounting","general"],DOCUMENTS:["documents","onboarding","communications"],VIEW_ONLY:[]};
export default function PMTeamOwner(){
 const nav=useNavigate();const [ws,setWs]=useState(null),[props,setProps]=useState([]),[staff,setStaff]=useState([]),[tasks,setTasks]=useState([]),[err,setErr]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false),[invite,setInvite]=useState("");
 const [employee,setEmployee]=useState({name:"",email:"",role:"LEASING",permissions:caps.LEASING,property_ids:[]});
 const [task,setTask]=useState({property_id:"",assignee_id:"",category:"ONBOARDING",title:"",notes:"",due_date:""});
 const headers=ws?{"X-PM-Workspace-ID":String(ws.id)}:{};
 async function load(current=ws){
  if(!current)return;
  const h={"X-PM-Workspace-ID":String(current.id)};
  const [s,t,p]=await Promise.all([
   api.get("/pm-hub/access/team/",{headers:h}),
   api.get("/pm-hub/access/tasks/",{headers:h}),
   api.get("/pm-hub/properties/",{headers:h})
  ]);setStaff(s.data.members||[]);setTasks(t.data.tasks||[]);setProps(list(p.data));
 }
 useEffect(()=>{let valid=true;(async()=>{try{
 const w=(await api.get("/pm-hub/workspaces/current/")).data;
 if(valid){setWs(w);await load(w);}
 }catch(e){if(valid)setErr(e?.response?.data?.detail||"Unable to load team.");}})();return()=>{valid=false;};},[]);
 async function inviteStaff(e){e.preventDefault();setBusy(true);setErr("");setInvite("");try{
  const r=await api.post("/pm-hub/access/team/",employee,{headers});setInvite(r.data.invitation_code);
  setNotice("Invitation prepared. Share the code securely with that employee; no email has been sent.");await load();
 }catch(e){setErr(e?.response?.data?.detail||"Unable to create invitation.");}finally{setBusy(false);}}
 async function addTask(e){e.preventDefault();setBusy(true);setErr("");try{
  await api.post("/pm-hub/access/tasks/",task,{headers});await load();
  setTask({...task,title:"",notes:"",due_date:""});
  setNotice("Assignment added to work queue.");
 }catch(e){setErr(e?.response?.data?.detail||"Unable to assign work.");}finally{setBusy(false);}}
 async function changeStatus(member,newStatus){if(!window.confirm("Revoke this person's PM workspace access?"))return;
 try{await api.patch(`/pm-hub/access/team/${member.id}/`,{status:newStatus},{headers});await load();setNotice("Access revoked.");}
 catch(e){setErr(e?.response?.data?.detail||"Unable to change access.");}}
 const allowed=useMemo(()=>caps[employee.role]||[],[employee.role]);
 return <PMShell><main className="mx-auto max-w-6xl space-y-3 px-3 py-3 pb-24 sm:px-5">
  <div className="flex items-start justify-between gap-2"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-300">Portfolio owner control</div><h1 className="text-xl font-black">Team & Responsibilities</h1><p className="mt-1 text-xs text-slate-400">Give employees specific work without exposing the entire company ledger.</p></div><button onClick={()=>nav("/pm")} className="rounded-lg border border-slate-700 px-3 py-2 text-xs">Dashboard</button></div>
  {err?<p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-100">{err}</p>:null}{notice?<p role="status" className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3 text-xs text-emerald-100">{notice}</p>:null}
  <div className="grid grid-cols-3 gap-2">{[["Employees",staff.length],["Open work",tasks.filter(x=>!["DONE","CANCELED"].includes(x.status)).length],["Properties",props.length]].map(([k,v])=><div className="rounded-xl border border-slate-700 bg-[#07111f] p-2.5" key={k}><div className="text-[10px] text-slate-400">{k}</div><div className="mt-1 text-xl font-black">{v}</div></div>)}</div>
  <div className="grid gap-3 lg:grid-cols-2">
   <section className="rounded-xl border border-cyan-500/20 bg-[#07111f] p-3 sm:p-4"><h2 className="text-sm font-black">Invite an employee</h2><p className="mt-1 text-xs text-slate-400">Role sets a maximum. You may remove permissions and restrict the properties they serve.</p>
    <form onSubmit={inviteStaff} className="mt-3 space-y-2">
     <div className="grid grid-cols-2 gap-2"><Field label="Name"><input className={input} value={employee.name} onChange={e=>setEmployee({...employee,name:e.target.value})}/></Field><Field label="Email"><input className={input} type="email" required value={employee.email} onChange={e=>setEmployee({...employee,email:e.target.value})}/></Field></div>
     <Field label="Role"><select className={input} value={employee.role} onChange={e=>setEmployee({...employee,role:e.target.value,permissions:caps[e.target.value]||[]})}>{roles.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field>
     <div className="text-[11px] font-bold text-slate-300">What can they work on?</div><div className="flex flex-wrap gap-1.5">{allowed.map(k=><label key={k} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2 py-1.5 text-[11px]"><input type="checkbox" checked={employee.permissions.includes(k)} onChange={e=>setEmployee({...employee,permissions:e.target.checked?[...employee.permissions,k]:employee.permissions.filter(x=>x!==k)})}/>{k.replaceAll("_"," ")}</label>)}</div>
     <Field label="Assigned properties"><div className="max-h-28 space-y-1 overflow-y-auto rounded-lg border border-slate-700 p-2">{props.map(p=><label key={p.id} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={employee.property_ids.includes(p.id)} onChange={e=>setEmployee({...employee,property_ids:e.target.checked?[...employee.property_ids,p.id]:employee.property_ids.filter(x=>x!==p.id)})}/>{p.name}</label>)}{!props.length?<span className="text-xs text-slate-400">Add a property first.</span>:null}</div></Field>
     <button disabled={busy} className="min-h-10 w-full rounded-lg bg-cyan-400 text-xs font-black text-slate-950 disabled:opacity-40">Prepare invitation</button>
    </form>
    {invite?<div className="mt-3 rounded-lg border border-amber-400/30 bg-amber-500/5 p-2.5"><p className="text-[11px] font-bold text-amber-100">Share this single-use code privately:</p><div className="mt-1 break-all font-mono text-xs">{invite}</div><button type="button" onClick={()=>navigator.clipboard?.writeText(invite)} className="mt-2 rounded-lg border border-amber-400/35 px-3 py-1.5 text-xs">Copy code</button></div>:null}
   </section>
   <section className="rounded-xl border border-cyan-500/20 bg-[#07111f] p-3 sm:p-4"><h2 className="text-sm font-black">Assign a work item</h2><p className="mt-1 text-xs text-slate-400">Evictions, onboarding, inspections, document follow-ups, and accounting can each be assigned.</p>
    <form onSubmit={addTask} className="mt-3 space-y-2">
     <Field label="Property"><select className={input} required value={task.property_id} onChange={e=>setTask({...task,property_id:e.target.value})}><option value="">Choose property</option>{props.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
     <div className="grid grid-cols-2 gap-2"><Field label="Work type"><select className={input} value={task.category} onChange={e=>setTask({...task,category:e.target.value})}>{categories.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field><Field label="Assigned to"><select className={input} value={task.assignee_id} onChange={e=>setTask({...task,assignee_id:e.target.value})}><option value="">Owner / unassigned</option>{staff.filter(x=>x.status==="ACTIVE"&&x.property_ids.includes(Number(task.property_id))&&x.permissions.includes(task.category.toLowerCase())).map(x=><option key={x.id} value={x.id}>{x.name||x.email}</option>)}</select></Field></div>
     <Field label="Task"><input className={input} required value={task.title} onChange={e=>setTask({...task,title:e.target.value})} placeholder="Collect transfer paperwork, review notice..."/></Field>
     <Field label="Due date"><input className={input} type="date" value={task.due_date} onChange={e=>setTask({...task,due_date:e.target.value})}/></Field>
     <Field label="Internal instructions"><textarea rows={2} className={input} value={task.notes} onChange={e=>setTask({...task,notes:e.target.value})}/></Field>
     <button disabled={busy} className="min-h-10 w-full rounded-lg bg-cyan-400 text-xs font-black text-slate-950 disabled:opacity-40">Assign work</button>
    </form>
   </section>
  </div>
  <section className="rounded-xl border border-slate-700 bg-[#07111f] p-3"><h2 className="text-sm font-black">Your team</h2><div className="mt-2 grid gap-2 sm:grid-cols-2">{staff.map(x=><div key={x.id} className="rounded-lg border border-slate-700 p-2.5"><div className="flex items-center justify-between gap-2"><strong className="text-xs">{x.name||x.email}</strong><span className="text-[10px] text-cyan-200">{x.status}</span></div><div className="mt-1 text-[11px] text-slate-400">{x.role} · {x.property_ids.length} assigned properties</div>{x.status!=="REVOKED"?<button className="mt-2 rounded-lg border border-rose-400/35 px-2 py-1 text-[11px] text-rose-200" onClick={()=>changeStatus(x,"REVOKED")}>Revoke access</button>:null}</div>)}</div></section>
 </main></PMShell>;
}
