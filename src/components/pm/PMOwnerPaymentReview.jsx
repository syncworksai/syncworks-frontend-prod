import React,{useEffect,useState} from "react";
import api from "../../api/client";

const dollars=v=>Number(v||0).toLocaleString("en-US",{style:"currency",currency:"USD"});
export default function PMOwnerPaymentReview({tenantId,workspaceId,ledgerCount,onRecordPayment}){
 const [review,setReview]=useState(null),[error,setError]=useState("");
 useEffect(()=>{
  let alive=true;
  if(!tenantId||!workspaceId){setReview(null);return()=>{alive=false;};}
  api.get(`/pm-hub/billing/tenants/${tenantId}/owner-payment-review/`,
    {headers:{"X-PM-Workspace-ID":String(workspaceId)}})
   .then(r=>{if(alive){setReview(r.data?.report||null);setError("");}})
   .catch(e=>{if(alive){setReview(null);setError(e?.response?.data?.detail||"Owner payment review unavailable.");}});
  return()=>{alive=false;};
 },[tenantId,workspaceId,ledgerCount]);
 if(error)return null;
 if(!review)return null;
 const pending=Number(review.pending_tenant_receipts_without_dated_transactions||0);
 return <section className="rounded-xl border border-amber-400/30 bg-[#07111f] p-3 sm:p-4" aria-label="Owner reported payment reconciliation">
  <div className="flex flex-wrap items-start justify-between gap-2">
   <div><div className="text-[10px] font-black uppercase tracking-wider text-amber-200">Reconciliation · Owner's updated spreadsheet</div>
    <h2 className="mt-1 text-sm font-black text-white">Payments reported vs ledger posted</h2>
    <p className="mt-1 text-[11px] text-slate-400">The monthly spreadsheet is preserved. Undated payments do not become ledger receipts until they are matched to the actual transaction dates.</p></div>
   <span className="rounded-lg border border-amber-400/25 px-2 py-1 text-[10px] text-amber-200">{pending>0?"Receipt matching needed":"Matched"}</span>
  </div>
  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
   {[
    ["Tenant owed · posted",review.posted_tenant_balance],
    ["New payments to match",pending],
    ["Tenant owed · if verified",review.provisional_tenant_balance_if_verified],
    ["Housing separately unresolved",review.housing_separate]
   ].map(([title,val],i)=><div key={title} className="rounded-lg border border-slate-700 bg-black/25 p-2.5">
    <div className="text-[10px] text-slate-400">{title}</div>
    <div className={`mt-1 text-base font-black ${i===2?"text-cyan-200":i===1?"text-amber-200":"text-white"}`}>{dollars(val)}</div>
   </div>)}
  </div>
  <div className="mt-2 overflow-x-auto"><table className="w-full min-w-[480px] text-left text-[11px]">
   <thead><tr className="border-b border-slate-700 text-slate-400"><th className="p-2">Month</th><th className="p-2">Reported tenant</th><th className="p-2">Posted in SyncWorks</th><th className="p-2">To match</th></tr></thead>
   <tbody>{review.months?.map(row=><tr key={row.month} className="border-b border-slate-800">
    <td className="p-2 font-bold">{row.month}{row.month==="2026-02"?<div className="text-[9px] text-slate-400">Handled by prior manager</div>:null}</td>
    <td className="p-2">{dollars(row.reported_tenant_paid)}</td>
    <td className="p-2">{dollars(row.tenant_paid_already_posted)}</td>
    <td className="p-2 font-bold">{row.month==="2026-02"?"Opening arrears":dollars(row.tenant_payment_not_yet_posted)}</td>
   </tr>)}</tbody>
  </table></div>
  <div className="mt-3 rounded-lg border border-amber-400/20 bg-amber-500/5 p-2.5 text-[11px] text-amber-100">
   <strong>Late fees:</strong> {dollars(review.existing_late_fees)} already posted. Up to {dollars(review.potential_additional_late_fees_unposted)} more was previously identified for review, <strong>not assessed</strong>. March's $2,706 needs exact receipt dates before determining which $50 stages were triggered. Existing fee dates also need verification against the signed lease.
  </div>
  {pending>0?<button type="button" onClick={onRecordPayment} className="mt-3 min-h-10 w-full rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-3 text-xs font-black text-cyan-100">Record confirmed individual receipt dates →</button>:null}
  <p className="mt-2 text-[10px] leading-4 text-slate-500">No deposit was applied and no housing payment was marked received. Do not enter March's $2,706 as a single transaction unless the bank shows one $2,706 receipt; otherwise enter each actual payment separately.</p>
 </section>;
}
