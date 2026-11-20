import React,{useCallback,useEffect,useState} from "react";
import {useNavigate,useSearchParams} from "react-router-dom";
import {ArrowLeft,Bot,ClipboardList,RefreshCw,CheckCircle2,Archive,ShieldAlert} from "lucide-react";
import api from "../api/client";
import {useAuth} from "../auth/AuthContext";

const roles=[
 ["CHIEF_OF_STAFF","Victoria · Chief of Staff"],
 ["SALES_MANAGER","Scarlett · Sales"],
 ["MARKETING_MANAGER","Elizabeth · Marketing"],
 ["RESEARCH_ANALYST","Sophia · Research"],
 ["FINANCE_MANAGER","Charlotte · Finance"],
 ["BUSINESS_MANAGER","Business Operations"],
 ["CUSTOMER_SERVICE","Customer Service"],
 ["PROPERTY_MANAGER","Property Assistant"],
 ["EXECUTIVE_ASSISTANT","Executive Assistant"],
];
export default function AIAssignments(){
 const {user}=useAuth(),nav=useNavigate(),[params]=useSearchParams();
 const pilot=String(user?.email||"").trim().toLowerCase()==="jacoblord7@outlook.com";
 const [items,setItems]=useState([]),[kind,setKind]=useState(params.get("ticket")?"TICKET":"TASK"),[ticketId,setTicketId]=useState(params.get("ticket")||""),[role,setRole]=useState("CHIEF_OF_STAFF"),[description,setDescription]=useState(""),[busy,setBusy]=useState(false),[notice,setNotice]=useState(""),[error,setError]=useState("");
 const load=useCallback(async()=>{if(!pilot)return;try{const {data}=await api.get("/sync-ai/assist/pilot/assignments/");setItems(data.assignments||[])}catch(e){setError(e.response?.data?.detail||"Could not load assignments.");}},[pilot]);
 useEffect(()=>{load()},[load]);
 const submit=async e=>{e.preventDefault();setError("");setNotice("");setBusy(true);
   try{const {data}=await api.post("/sync-ai/assist/pilot/assignments/",{
     request_id:crypto.randomUUID(),kind,role,description:description.trim(),ticket_id:kind==="TASK"?null:Number(ticketId),
   });setNotice(data.notice);setDescription("");await load()}
   catch(e){setError(e.response?.data?.detail||"Could not save assignment.")}finally{setBusy(false)}
 };
 const decision=async(id,state)=>{try{await api.post(`/sync-ai/assist/pilot/assignments/${id}/decision/`,{state});await load()}catch(e){setError(e.response?.data?.detail||"Could not update assignment.")}};
 if(!pilot)return <div className="grid min-h-[50dvh] place-items-center p-6">AI assignments are currently limited to the authorized private pilot.</div>;
 return <div className="flex h-[calc(100dvh-155px)] min-h-[380px] flex-col overflow-hidden bg-[#06132a] p-3 text-white" style={{backgroundImage:"linear-gradient(105deg,rgba(3,12,29,.88),rgba(5,15,34,.78)),url('/office-themes/syncworks-future.webp')",backgroundPosition:"center",backgroundSize:"cover"}}>
  <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-3">
   <header className="flex shrink-0 items-center justify-between gap-3 rounded-xl border border-cyan-400/25 bg-[#08172e]/85 p-3 backdrop-blur-xl"><div className="flex items-center gap-3"><button title="Back" onClick={()=>nav(-1)}><ArrowLeft size={18}/></button><Bot className="text-cyan-300"/><div><strong>Assign work to SYNC Assist</strong><p className="text-[11px] text-slate-300">Pilot · internal review first · no external actions</p></div></div><button title="Refresh" onClick={load}><RefreshCw size={17}/></button></header>
   <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-[minmax(280px,.8fr)_minmax(0,1.2fr)]">
    <section className="min-h-0 overflow-y-auto rounded-xl border border-cyan-400/25 bg-[#08172e]/88 p-4 backdrop-blur-xl">
     <form onSubmit={submit} className="space-y-3"><h2 className="text-sm font-bold">New assignment</h2>
     <label className="block text-xs">Work type<select value={kind} onChange={e=>setKind(e.target.value)} className="mt-1 w-full rounded-lg border border-white/20 bg-[#07152c] p-2.5">{[["TASK","General task"],["TICKET","Service ticket"],["SUPPORT","Support request"],["JOB","Job follow-up"]].map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>
     {kind!=="TASK"&&<label className="block text-xs">Ticket number<input required min="1" type="number" value={ticketId} onChange={e=>setTicketId(e.target.value)} placeholder="e.g. 17" className="mt-1 w-full rounded-lg border border-white/20 bg-[#07152c] p-2.5"/></label>}
     <label className="block text-xs">Assign to<select value={role} onChange={e=>setRole(e.target.value)} className="mt-1 w-full rounded-lg border border-white/20 bg-[#07152c] p-2.5">{roles.map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>
     <label className="block text-xs">What needs to be done?<textarea required maxLength={500} rows={4} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Review job status, suggest next technician, and flag anything requiring my approval." className="mt-1 w-full resize-none rounded-lg border border-white/20 bg-[#07152c] p-2.5"/></label>
     {error&&<p role="alert" className="text-xs text-rose-200">{error}</p>}{notice&&<p role="status" className="text-xs text-emerald-200">{notice}</p>}
     <button disabled={busy} className="min-h-11 w-full rounded-xl bg-cyan-400/25 font-semibold text-cyan-100 disabled:opacity-40">{busy?"Saving…":"Assign for review"}</button>
     <p className="text-[11px] leading-5 text-slate-300"><ShieldAlert size={13} className="mr-1 inline"/>This first build records a durable assignment and produces rule-based triage guidance. It does not start an AI model, assign a technician, send email, change payment status or run external tools.</p></form>
    </section>
    <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-cyan-400/25 bg-[#08172e]/88 p-3 backdrop-blur-xl"><div className="flex items-center justify-between pb-2"><h2 className="text-sm font-bold">Assignment inbox</h2><span className="text-xs text-slate-300">{items.length} records</span></div><div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain">
     {items.length?items.map(i=><article key={i.assignment_id} className="rounded-xl border border-white/15 bg-[#041125]/65 p-3"><div className="flex items-start justify-between gap-2"><strong className="text-xs">{roles.find(x=>x[0]===i.role)?.[1]||i.role}</strong><span className="text-[10px] text-cyan-200">{i.state?.replaceAll("_"," ")}</span></div><p className="mt-1 text-[11px] text-slate-300">{i.kind}{i.ticket_id?` · Ticket #${i.ticket_id}`:""}</p><p className="mt-2 text-xs">{i.description}</p><p className="mt-2 border-l-2 border-cyan-400/50 pl-2 text-xs leading-5 text-cyan-100">{i.suggested_next_action}</p><div className="mt-3 flex flex-wrap gap-2">{i.ticket_id&&<button onClick={()=>nav(`/tickets/${i.ticket_id}`)} className="rounded-lg border border-white/20 px-2.5 py-1.5 text-xs">Open ticket</button>}{i.state==="AWAITING_REVIEW"&&<><button onClick={()=>decision(i.assignment_id,"ACKNOWLEDGED")} className="flex items-center gap-1 rounded-lg border border-emerald-400/30 px-2.5 py-1.5 text-xs"><CheckCircle2 size={13}/> Reviewed</button><button onClick={()=>decision(i.assignment_id,"ARCHIVED")} className="flex items-center gap-1 rounded-lg border border-white/20 px-2.5 py-1.5 text-xs"><Archive size={13}/> Archive</button></>}</div></article>):<div className="grid h-full place-items-center text-center text-sm text-slate-300"><div><ClipboardList className="mx-auto mb-2 text-cyan-300"/>No assignments yet</div></div>}
    </div></section>
   </div>
  </div>
 </div>;
}
