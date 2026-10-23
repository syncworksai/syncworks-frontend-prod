import React,{useEffect,useState} from "react";
import api from "../../api/client";

const money=v=>Number(v||0).toLocaleString("en-US",{style:"currency",currency:"USD"});
const input="min-h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 text-xs text-white";
export default function PMDepositReviewCard({tenantId,tenant,workspaceId,depositStatus}){
 const review=depositStatus?.deposit_review||null;
 const special=Boolean(
  String(tenant?.last_name||tenant?.full_name||"").toLowerCase().includes("english")&&
  String(tenant?.property_name||"").toLowerCase().includes("roxana")
 );
 const [form,setForm]=useState({paperwork_amount:"",reported_transfer_amount:"",description:"",source_note:""});
 const [confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false);
 const [message,setMessage]=useState(""),[error,setError]=useState("");
 const [saved,setSaved]=useState(null);
 useEffect(()=>{
  setSaved(review);
  setForm({
   paperwork_amount:review?.paperwork_amount ?? String(depositStatus?.deposit_required||""),
   reported_transfer_amount:review?.reported_transfer_amount ?? (special?"1485.00":""),
   description:review?.description ?? (special?"Original 2024 deposit paperwork and former-manager February 2026 transfer do not agree. Preserve both figures until original receipt and transfer details are reconciled.":""),
   source_note:review?.source_note ?? (special?"Original 2024 onboarding packet proposes $1,500; Adair's October 2026 email reports $1,485 transferred February 12, 2026; owner records USAA deposit February 13.":"")
  });
  setConfirmed(false);setMessage("");setError("");
 },[tenantId,depositStatus?.deposit_review?.last_reviewed_at,depositStatus?.deposit_required]);
 const active=saved?.status==="NEEDS_REVIEW";
 const draftPaperwork=Number(form.paperwork_amount||0);
 const draftTransfer=Number(form.reported_transfer_amount||0);
 const paper=active?Number(saved.paperwork_amount):draftPaperwork;
 const transfer=active?Number(saved.reported_transfer_amount):draftTransfer;
 const difference=paper-transfer;
 async function save(e){
  e.preventDefault();if(!confirmed||busy||!tenantId||!workspaceId)return;
  setBusy(true);setError("");setMessage("");
  try{
   const r=await api.post(`/pm-hub/billing/tenants/${tenantId}/deposit-transfer-review/`,
    {...form,confirmed:true},{headers:{"X-PM-Workspace-ID":String(workspaceId)}});
   setSaved(r.data.review);setMessage("Evidence note saved. No rent credit, deposit payment or charge was posted.");setConfirmed(false);
  }catch(e){setError(e?.response?.data?.detail||"Unable to save deposit evidence.");}
  finally{setBusy(false);}
 }
 return <section className="mt-2 rounded-xl border border-amber-400/25 bg-amber-500/5 p-3" aria-label="Deposit documentation review">
  <div className="flex items-center justify-between gap-2"><div className="text-xs font-black text-amber-100">Deposit documentation — separate from rent</div>
   <span className="rounded-md border border-amber-400/20 px-2 py-1 text-[10px] text-amber-200">{active?"Discrepancy recorded":"Review needed"}</span></div>
  <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
   {[["2024 paperwork",paper],["Reported PM transfer",transfer],["Amount difference",difference],["Deposit credit to rent",Number(depositStatus?.deposit_applied||0)]].map(([label,value])=>
    <div key={label} className="min-w-0 rounded-lg border border-slate-700/70 bg-black/20 p-2"><div className="text-[10px] leading-4 text-slate-400">{label}</div><div className="mt-1 text-xs font-black text-white">{money(value)}</div></div>)}
  </div>
  <p className="mt-2 text-[10px] leading-4 text-slate-400">The paperwork amount is not proof of collection. The amount Adair says was transferred is not automatically the original deposit amount. Neither is included in rent due or credited against rent by this review.</p>
  {Number(depositStatus?.deposit_received||0)>0?<p className="mt-1 text-[10px] text-amber-200">Existing TenantCloud/SyncWorks profile shows {money(depositStatus.deposit_received)} as “received.” This is a legacy entry under review, not independent proof of deposit collection.</p>:null}
  {saved?.description?<p className="mt-2 text-[11px] text-slate-300">{saved.description}</p>:null}
  <details className="mt-3 rounded-lg border border-slate-700/70 p-2.5">
   <summary className="cursor-pointer text-[11px] font-bold text-cyan-200">Review or save deposit discrepancy</summary>
   <form onSubmit={save} className="mt-3 space-y-2">
    <div className="grid grid-cols-2 gap-2"><label className="text-[10px] text-slate-400">Amount on paperwork<input required type="number" min="0" step="0.01" className={input+" mt-1"} value={form.paperwork_amount} onChange={e=>setForm({...form,paperwork_amount:e.target.value})}/></label>
    <label className="text-[10px] text-slate-400">Former manager's reported transfer<input required type="number" min="0" step="0.01" className={input+" mt-1"} value={form.reported_transfer_amount} onChange={e=>setForm({...form,reported_transfer_amount:e.target.value})}/></label></div>
    <label className="block text-[10px] text-slate-400">Discrepancy description<textarea rows={2} className={input+" mt-1"} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
    <label className="block text-[10px] text-slate-400">Documentary source / bank evidence<textarea required rows={3} className={input+" mt-1"} value={form.source_note} onChange={e=>setForm({...form,source_note:e.target.value})}/></label>
    <label className="flex items-start gap-2 text-[11px] text-slate-300"><input type="checkbox" className="mt-0.5" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>Save this only as evidence. Do not record new payments, apply deposits to rent, or change tenant arrears.</label>
    <button type="submit" disabled={!confirmed||busy||form.source_note.trim().length<15} className="min-h-10 w-full rounded-lg bg-cyan-400 text-xs font-black text-slate-950 disabled:opacity-40">{busy?"Saving…":"Save discrepancy note"}</button>
    {error?<p role="alert" className="text-xs text-rose-200">{error}</p>:null}
    {message?<p role="status" className="text-xs text-emerald-200">{message}</p>:null}
   </form>
  </details>
 </section>;
}
