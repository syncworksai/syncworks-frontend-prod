import React,{useEffect,useState} from "react";
import {getGodModeAffiliates,getGodModeAffiliateDetail,updateGodModeAffiliate} from "../../api/platformAffiliates";
export default function AffiliateApplicationReview(){
 const [rows,setRows]=useState([]),[detail,setDetail]=useState(null),[note,setNote]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function load(){
   try{const data=await getGodModeAffiliateAffiliates();setRows((Array.isArray(data)?data:data?.results||[]).filter(x=>x.status==="PENDING"));}
   catch(e){setError(e?.response?.data?.detail||"Unable to load applications");}
 }
 useEffect(()=>{load();},[]);
 async function open(id){setBusy(true);setError("");try{setDetail(await getGodModeAffiliateDetail(id));setNote("");}catch(e){setError(e?.response?.data?.detail||"Unable to open application");}finally{setBusy(false);}}
 async function decide(status){
  if(!detail||busy)return;
  if(status==="DEACTIVATED"&&!note.trim()){setError("Enter a reason to deny this application.");return;}
  if(!window.confirm(status==="ACTIVE"?"Approve this affiliate?":"Deny this affiliate?"))return;
  setBusy(true);setError("");
  try{
   const entry="Application review: "+(status==="ACTIVE"?"APPROVED":"DENIED")+" — "+(note.trim()||"Reviewed in God Mode");
   await updateGodModeAffiliate(detail.id,{status,notes:[detail.notes||"",entry].filter(Boolean).join("\n")});
   setDetail(null);await load();
  }catch(e){setError(e?.response?.data?.detail||"Unable to save decision");}finally{setBusy(false);}
 }
 return <section className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
  <div className="flex justify-between items-center gap-3"><div><h3 className="font-bold">Affiliate Applications</h3><p className="text-xs text-slate-400">Review strategies before approving a referral partner.</p></div><span className="text-xs text-amber-200">{rows.length} pending</span></div>
  {error&&<p role="alert" className="mt-2 text-xs text-red-300">{error}</p>}
  <div className="mt-3 grid gap-2 sm:grid-cols-2">{rows.map(a=><button key={a.id} type="button" onClick={()=>open(a.id)} className="rounded-lg border border-slate-700 p-3 text-left hover:border-slate-400"><strong className="block">{a.name}</strong><span className="text-xs text-slate-400">{a.email}</span><span className="ml-2 text-xs text-amber-200">Review →</span></button>)}</div>
  {!rows.length&&<p className="mt-2 text-xs text-slate-400">No pending affiliate applications.</p>}
  {detail&&<div className="mt-3 rounded-xl border border-slate-600 bg-slate-900/80 p-4">
   <div className="flex items-center justify-between"><h4 className="font-semibold">{detail.name} — {detail.email}</h4><button type="button" onClick={()=>setDetail(null)}>Close ✕</button></div>
   <div className="mt-3 grid gap-3 md:grid-cols-2"><div><strong className="text-xs">Scaling & outreach strategy</strong><pre className="mt-1 max-h-36 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-700 p-3 text-xs">{detail.referral_strategy||"Not specified"}</pre></div><div><strong className="text-xs">Application notes</strong><pre className="mt-1 max-h-36 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-700 p-3 text-xs">{detail.application_notes||"None"}</pre><p className="mt-2 text-xs">Agreement accepted: {detail.agreement_accepted_at?"Yes":"No"}</p></div></div>
   <label className="mt-3 block text-xs">Review notes (required when denying)<textarea className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-950 p-2 text-sm" rows={2} value={note} onChange={e=>setNote(e.target.value)}/></label>
   <div className="mt-3 flex gap-2"><button type="button" disabled={busy||!detail.agreement_accepted_at} onClick={()=>decide("ACTIVE")} className="rounded-lg border border-emerald-600 px-4 py-2 text-xs">Approve</button><button type="button" disabled={busy} onClick={()=>decide("DEACTIVATED")} className="rounded-lg border border-red-600 px-4 py-2 text-xs">Deny</button></div>
   <p className="mt-2 text-xs text-slate-400">Denied requests are deactivated and the review reason is recorded. Approval is not a payout.</p>
  </div>}
 </section>;
}
