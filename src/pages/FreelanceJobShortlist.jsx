import React,{useState} from "react";
import api from "../api/client";
import {BriefcaseBusiness,ExternalLink,ShieldAlert,CheckCircle2} from "lucide-react";

const ROOT="/sync-ai/freelance/pilot/business-ledger/";
const SNAPSHOT_DATE="2026-11-23";
const ITEMS=[
 {id:"2124567734253452298",title:"Manual Data Entry of Handwritten English Records",url:"https://www.upwork.com/jobs/~022124567734253452298",value:1600,connects:14,proposals:129,client:"Verified payment · No past hires",verdict:"SAMPLE_REQUIRED",note:"1,000 handwritten pages including cursive. First secure representative pages and prove extraction accuracy and manual-review effort. Never bid as 100% automated."},
 {id:"2124518508865715210",title:"Excel Data Entry Assistant (5 hrs/week, Ongoing Spreadsheet Updates)",url:"https://www.upwork.com/jobs/~022124518508865715210",value:20,connects:11,proposals:155,client:"Verified payment · 95% historical hire rate",verdict:"CLARIFY_PRICE",note:"Strong spreadsheet-fit, but $20 fixed price vs 5 hours per week needs clarification. Posting had one hire already; confirm another vacancy."}
];
const button="inline-flex items-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-40";
export default function FreelanceJobShortlist({enabled=false,onSaved=()=>{},existing=[]}){
 const [busy,setBusy]=useState(""),[feedback,setFeedback]=useState("");
 const save=async item=>{
  setBusy(item.id);setFeedback("");
  try{
   await api.post(ROOT,{category:"JOB",title:item.title,upwork_job_id:item.id,url:item.url,expected_gross:String(item.value)+".00",status:"SAVED",source:"MANUAL",notes:"Selected from Upwork review snapshot "+SNAPSHOT_DATE+". "+item.note});
   setFeedback("Added to your manual SyncWorks ledger. No Upwork proposal was sent and no Connects were spent.");
   onSaved();
  }catch(e){setFeedback(typeof e?.response?.data?.detail==="string"?e.response.data.detail:"Couldn't save. Verify the private backend is enabled.");}finally{setBusy("");}
 };
 return <section className="rounded-2xl border border-white/10 bg-slate-900/75 p-4">
   <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-black uppercase tracking-widest text-cyan-200">Job selection desk</p><h3 className="mt-1 text-xl font-black text-white">Upwork opportunities to review</h3><p className="mt-1 text-xs text-slate-400">Snapshot from your connected Upwork account on {SNAPSHOT_DATE}. Refresh and recheck on Upwork before applying; not an automatic live feed.</p></div><span className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300">Approval required</span></div>
   <div className="mt-4 grid gap-3 xl:grid-cols-2">{ITEMS.map(item=>{
    const saved=existing.some(x=>x.upwork_job_id===item.id);
    return <article key={item.id} className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
     <div className="flex items-center gap-2 text-xs text-amber-200"><ShieldAlert size={15}/>{item.verdict==="SAMPLE_REQUIRED"?"Sample accuracy test required":"Confirm payment terms and vacancy"}</div>
     <h4 className="mt-2 font-bold text-white">{item.title}</h4>
     <p className="mt-2 text-sm text-slate-300">{item.client}</p>
     <div className="mt-3 grid grid-cols-3 gap-2 text-sm">{[["Posted budget","$"+item.value.toLocaleString()],["Connects to bid",item.connects],["Proposals",item.proposals]].map(([key,v])=><div key={key} className="rounded-lg border border-white/10 p-2"><span className="block text-[11px] text-slate-400">{key}</span><strong className="text-white">{v}</strong></div>)}</div>
     <p className="mt-3 text-xs leading-5 text-slate-300">{item.note}</p>
     <div className="mt-4 flex flex-wrap gap-2"><button type="button" className={button} disabled={!enabled||!!busy||saved} onClick={()=>save(item)}>{saved?<><CheckCircle2 size={14}/> Tracked in SyncWorks</>:<><BriefcaseBusiness size={14}/> Select for review</>}</button>
     <a href={item.url} target="_blank" rel="noopener noreferrer" className={button}>Check on Upwork <ExternalLink size={14}/></a></div>
    </article>;
   })}</div>
   {feedback&&<p className="mt-3 text-sm text-cyan-200" role="status">{feedback}</p>}
   <p className="mt-4 text-xs text-slate-400">Shortlisting does not spend Connects. Proposals and bids must be approved separately. A snapshot cannot establish that a job is still available later.</p>
 </section>;
}