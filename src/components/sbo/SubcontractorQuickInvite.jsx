import React,{useEffect,useState} from "react";
import {useNavigate} from "react-router-dom";
import {CheckCircle2,MailPlus,RefreshCw,ExternalLink} from "lucide-react";
import api from "../../api/client";

const blank={business_name:"",contact_name:"",email:"",phone:"",relationship_type:"SUBCONTRACTOR"};
export default function SubcontractorQuickInvite({activeBusinessId}){
 const nav=useNavigate();
 const [form,setForm]=useState(blank),[busy,setBusy]=useState(false),[err,setErr]=useState(""),[success,setSuccess]=useState(""),[pending,setPending]=useState([]),[partners,setPartners]=useState([]);
 const load=async()=>{if(!activeBusinessId)return;try{
  const [inv,rel]=await Promise.all([api.get("/business-partner-invitations/"),api.get("/business-partners/")]);
  const unpack=v=>Array.isArray(v)?v:v?.results||[];
  setPending(unpack(inv.data).filter(v=>v.status==="PENDING"&&String(v.inviting_business)===String(activeBusinessId)));
  setPartners(unpack(rel.data).filter(v=>String(v.hiring_business)===String(activeBusinessId)&&v.status==="ACTIVE"));
 }catch(e){setErr(e.response?.data?.detail||"Could not load subcontractor records.");}};
 useEffect(()=>{load()},[activeBusinessId]);
 const send=async(e)=>{e.preventDefault();setErr("");setSuccess("");
  if(!form.email.trim()){setErr("An email address is required to send a signup invitation.");return;}
  setBusy(true);
  try{
   const result=await api.post("/business-partner-invitations/",{...form,email:form.email.trim().toLowerCase(),relationship_type:"SUBCONTRACTOR"});
   setSuccess(result.data?.email_queued?"Invitation created and email queued. Delivery has not yet been confirmed.":"Invitation created.");
   setForm(blank);await load();
  }catch(e){const d=e.response?.data;setErr(d?.detail||d?.email||d?.contact||"Unable to send invitation.");}
  finally{setBusy(false);}
 };
 return <div className="min-h-0 space-y-3 overflow-y-auto text-white">
  <p className="text-xs leading-5 text-slate-300">Invite an outside subcontractor by email. They can register with SyncWorks and connect to your business to receive and respond to work offers.</p>
  <form onSubmit={send} className="grid gap-2">
   <label className="text-xs text-slate-300">Business or trade name<input required maxLength={180} value={form.business_name} onChange={e=>setForm(v=>({...v,business_name:e.target.value}))} placeholder="ABC Plumbing" className="mt-1 w-full rounded-xl border border-cyan-300/25 bg-[#07162d] p-3 text-sm text-white"/></label>
   <div className="grid grid-cols-2 gap-2">
    <label className="text-xs text-slate-300">Contact<input maxLength={180} value={form.contact_name} onChange={e=>setForm(v=>({...v,contact_name:e.target.value}))} placeholder="Contact name" className="mt-1 w-full rounded-xl border border-cyan-300/25 bg-[#07162d] p-2.5 text-sm text-white"/></label>
    <label className="text-xs text-slate-300">Phone (optional)<input type="tel" maxLength={32} value={form.phone} onChange={e=>setForm(v=>({...v,phone:e.target.value}))} placeholder="Phone" className="mt-1 w-full rounded-xl border border-cyan-300/25 bg-[#07162d] p-2.5 text-sm text-white"/></label>
   </div>
   <label className="text-xs text-slate-300">Invitation email<input required type="email" value={form.email} onChange={e=>setForm(v=>({...v,email:e.target.value}))} placeholder="subcontractor@example.com" className="mt-1 w-full rounded-xl border border-cyan-300/25 bg-[#07162d] p-3 text-sm text-white"/></label>
   {err&&<p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-2 text-xs text-rose-200">{String(err)}</p>}
   {success&&<p role="status" className="flex gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-2 text-xs text-emerald-200"><CheckCircle2 size={16}/>{success}</p>}
   <button type="submit" disabled={busy} className="flex items-center justify-center gap-2 rounded-xl bg-cyan-400/20 p-3 text-sm font-semibold text-cyan-100 disabled:opacity-40"><MailPlus size={17}/>{busy?"Creating invitation…":"Invite subcontractor"}</button>
  </form>
  <div className="flex items-center justify-between border-t border-white/15 pt-3"><strong className="text-xs">Partners ({partners.length}) · Pending ({pending.length})</strong><button type="button" onClick={load} aria-label="Refresh partners"><RefreshCw size={16}/></button></div>
  <div className="max-h-36 space-y-2 overflow-y-auto">{pending.slice(0,10).map(i=><div key={i.id} className="flex justify-between gap-2 rounded-lg border border-amber-400/20 bg-amber-500/5 p-2 text-xs"><span className="min-w-0 truncate">{i.business_name||i.email}</span><span className="shrink-0 text-amber-200">Pending</span></div>)}{partners.slice(0,10).map(r=><div key={r.id} className="flex justify-between gap-2 rounded-lg border border-emerald-400/20 bg-emerald-500/5 p-2 text-xs"><span className="min-w-0 truncate">{r.partner_business_card?.name||"Partner"}</span><span className="shrink-0 text-emerald-200">Connected</span></div>)}</div>
  <button type="button" onClick={()=>nav("/sbo/partners")} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 p-3 text-xs text-cyan-100">Open full Partner Hub <ExternalLink size={15}/></button>
  <p className="text-[11px] leading-4 text-slate-400">Invitation and basic work-access are separate from an optional paid SBO subscription. The dedicated free subcontractor portal is being completed separately; existing Partner Hub accounts can already manage accepted offers.</p>
 </div>;
}
