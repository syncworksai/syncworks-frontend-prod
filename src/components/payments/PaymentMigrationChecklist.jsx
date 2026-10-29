import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock3, ShieldAlert, RefreshCw } from "lucide-react";
import api from "../../api/client";
import { useAuth } from "../../auth/AuthContext";

const EVIDENCE = [
  ["customer_charged", "Customer charge and agreed total matched"],
  ["platform_fee_accounted", "SyncWorks fee separately accounted for"],
  ["provider_transfer_confirmed", "Correct provider/PM transfer verified"],
  ["bank_deposit_verified", "Actual receiving-bank deposit matched"],
  ["receipt_and_ledger_matched", "Receipt and customer/tenant ledger matched"],
  ["failed_or_refunded_handled", "Failed payment or refund reversal tested"],
];
const input = "min-h-11 w-full rounded-xl border border-slate-700 bg-[#050e1b] px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300/70";
const btn = "min-h-11 rounded-xl border border-cyan-400/35 bg-cyan-500/10 px-3 text-xs font-black text-cyan-100 disabled:opacity-40";
const errText = e => {
  const d = e?.response?.data;
  return typeof d?.detail === "string" ? d.detail : Object.values(d || {}).flat().join(" · ") || e?.message || "Unable to save.";
};
const blank = { current_processor:"", current_monthly_fees:"", current_monthly_transactions:"", monthly_other_provider_costs:"", monthly_returned_payments:"", monthly_unmatched_deposits:"", average_payout_days:"", monthly_reconciliation_hours:"", test_notes:"" };

export default function PaymentMigrationChecklist({ businessId: specifiedId, founderView = false, isPM = false }) {
  const { activeBusinessId } = useAuth();
  const businessId = String(specifiedId || activeBusinessId || "");
  const [plan,setPlan]=useState(null);
  const [form,setForm]=useState(blank);
  const [evidence,setEvidence]=useState({});
  const [founderNotes,setFounderNotes]=useState("");
  const [loading,setLoading]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const headers = businessId ? { "X-Business-Id": businessId } : {};

  const load = useCallback(async()=>{
    if (!businessId) { setPlan(null); return; }
    setLoading(true);setError("");
    try {
      const r=await api.get("/payment-migration/plan/", {headers:{"X-Business-Id":businessId}});
      const p=r.data;
      setPlan(p);
      setEvidence(p.test_evidence || {});
      setForm({
        current_processor:p.current_processor || "",
        current_monthly_fees:p.current_monthly_fees ?? "",
        current_monthly_transactions:p.current_monthly_transactions ?? "",
        monthly_other_provider_costs:p.monthly_other_provider_costs ?? "",
        monthly_returned_payments:p.monthly_returned_payments ?? "",
        monthly_unmatched_deposits:p.monthly_unmatched_deposits ?? "",
        average_payout_days:p.average_payout_days ?? "",
        monthly_reconciliation_hours:p.monthly_reconciliation_hours ?? "",
        test_notes:p.test_notes || "",
      });
      setFounderNotes(p.founder_test_notes || "");
    }catch(e){setPlan(null);setError(errText(e));}
    finally{setLoading(false);}
  },[businessId]);

  useEffect(()=>{load();},[load]);

  async function update(payload,success) {
    if (!businessId || busy || founderView) return;
    setBusy(true);setError("");setMessage("");
    try {
      const r=await api.patch("/payment-migration/plan/",payload,{headers});
      const p=r.data;
      setMessage(success);
      setPlan(p);
      setEvidence(p.test_evidence || {});
      setForm(old=>({...old,...Object.fromEntries(
        ["current_processor","current_monthly_fees","current_monthly_transactions","monthly_other_provider_costs","monthly_returned_payments","monthly_unmatched_deposits","average_payout_days","monthly_reconciliation_hours","test_notes"].map(key=>[key,p[key]??""])
      )}));
    }catch(e){setError(errText(e));}
    finally{setBusy(false);}
  }
  async function founderReview() {
    if (!businessId || !founderNotes.trim() || !window.confirm("Record a founder MANUAL evidence review? This does not authorize live rent or business payouts.")) return;
    setBusy(true);setError("");setMessage("");
    try {
      await api.post("/payment-migration/review-test/",{notes:founderNotes.trim()},{headers});
      setMessage("Manual test evidence review logged. Online payment activation is still disabled.");
      await load();
    }catch(e){setError(errText(e));}
    finally{setBusy(false);}
  }

  if (!businessId) return <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">Select the correct Business/legal entity first. A PM portfolio alone does not establish the receiving merchant.</div>;

  return <section aria-label="Payment migration onboarding" className="space-y-3 rounded-3xl border border-cyan-400/20 bg-[#061121]/95 p-3.5 text-slate-100 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-300">Onboarding / collections migration</div>
        <h2 className="mt-1 text-lg font-black sm:text-xl">Move payments in 5 safe steps</h2>
        <p className="mt-1 text-xs leading-5 text-slate-400">Keep your existing processor while SyncWorks proves the new workflow. All progress is saved to this Business account and visible to authorized onboarding reviewers.</p>
      </div>
      <button type="button" onClick={load} disabled={loading||busy} className={btn}><RefreshCw size={14} className="mr-1 inline"/>{loading?"Loading…":"Refresh"}</button>
    </div>
    {error ? <div role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</div> : null}
    {message ? <div role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">{message}</div> : null}
    {plan ? <>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-valuemin={0} aria-valuemax={5} aria-valuenow={plan.completed_count||0}>
        <div className="h-full bg-cyan-400 transition-all" style={{width:`${(plan.completed_count||0)*20}%`}}/>
      </div>
      <p className="text-xs font-semibold text-cyan-200">{plan.completed_count}/5 documented steps completed. Switching remains subject to final payment-system release.</p>
      {plan.stages?.map((stage,index)=><div key={stage.key} className="rounded-2xl border border-slate-700/80 bg-slate-950/60 p-3.5 sm:p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-sm font-black text-cyan-200">{stage.complete?<CheckCircle2 size={18}/>:index+1}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-black text-white">{stage.title}</h3><span className={"rounded-lg px-2 py-0.5 text-[10px] font-black "+(stage.complete?"bg-emerald-500/15 text-emerald-200":"bg-amber-500/10 text-amber-200")}>{stage.complete?"Recorded":"Requires action"}</span></div>
            <p className="mt-1 text-xs leading-5 text-slate-400">{stage.detail}</p>
          </div>
        </div>
        {!founderView && index===0 ? <div className="mt-3">
          <button type="button" disabled={busy||stage.complete} onClick={()=>update({workspace_reviewed:true},"Business setup and existing processor preservation acknowledged.")} className={btn}>Confirm initial setup and existing payment continuity</button>
        </div> : null}
        {index===1 ? <div className="mt-3">
          {!founderView ? <>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                ["current_processor","Current processor","Square, Stripe, bank, cash/check"],
                ["current_monthly_fees","Monthly processing fees ($)","0.00"],
                ["current_monthly_transactions","Monthly transactions","40"],
                ["monthly_other_provider_costs","Other monthly processor fees ($)","8.00"],
                ["monthly_returned_payments","Returned payments each month","0"],
                ["monthly_unmatched_deposits","Unmatched bank deposits each month","0"],
                ["average_payout_days","Average payout delay (days)","2.0"],
                ["monthly_reconciliation_hours","Reconciliation time (hours/mo)","3.0"],
              ].map(([key,label,placeholder])=><label key={key} className="block text-[11px] font-bold text-slate-300">{label}
                <input className={input+" mt-1"} type={key==="current_processor"?"text":"number"} min={key==="current_processor"?undefined:"0"} step={key==="current_monthly_fees"?"0.01":["current_monthly_transactions","monthly_returned_payments","monthly_unmatched_deposits"].includes(key)?"1":"0.1"} value={form[key]} onChange={e=>setForm(old=>({...old,[key]:e.target.value}))} placeholder={placeholder}/>
              </label>)}
            </div>
            <button type="button" disabled={busy||!plan.workspace_reviewed} onClick={()=>update({...Object.fromEntries(["current_processor","current_monthly_fees","current_monthly_transactions","monthly_other_provider_costs","monthly_returned_payments","monthly_unmatched_deposits","average_payout_days","monthly_reconciliation_hours"].map(k=>[k,form[k]])),costs_reviewed:true},"Current processing costs recorded.")} className={btn+" mt-3"}>Save cost baseline & confirm review</button>
          </> : <p className="text-xs text-slate-300">Processor: {plan.current_processor||"Not recorded"} · Monthly fees: {plan.current_monthly_fees||"—"} · Other fees: {plan.monthly_other_provider_costs||"—"} · Returns: {plan.monthly_returned_payments??"—"} · Deposit mismatches: {plan.monthly_unmatched_deposits??"—"} · Total fees: {plan.total_monthly_provider_cost||"—"} · Transactions: {plan.current_monthly_transactions??"—"} · Payout days: {plan.average_payout_days||"—"} · Reconciliation hours: {plan.monthly_reconciliation_hours||"—"}</p>}
        </div> : null}
        {index===2 ? <div className="mt-3 space-y-2">
          <p className="text-xs text-slate-300">Method: {plan.selected_pm_payment_method==="UNCONFIGURED"?"Not selected":plan.selected_pm_payment_method}. Receiving-account capabilities: {plan.bank_ready?"Verified in processor snapshot":"Not verified"}.</p>
          {!founderView ? <a className="inline-flex min-h-11 items-center rounded-xl border border-indigo-400/40 bg-indigo-500/10 px-3 text-xs font-black text-indigo-200" href={isPM?"/pm/payment-setup":"/sbo/finance?section=payments"}>{isPM?"Open PM bank / processor setup":"Open Business payments and payouts"}</a>:null}
          <p className="text-[11px] leading-5 text-amber-200">If keeping another processor, it is not automatically integrated. For PM, the correct legal rent/trust receiving account still needs independent verification.</p>
        </div>:null}
        {index===3 ? <div className="mt-3 space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            {EVIDENCE.map(([key,label])=><label key={key} className="flex min-h-10 items-start gap-2 rounded-xl bg-slate-900/80 p-2 text-xs text-slate-200">
              <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-cyan-400" checked={evidence[key]===true} disabled={founderView||busy||Boolean(plan.founder_test_reviewed)} onChange={e=>setEvidence(old=>({...old,[key]:e.target.checked}))}/>{label}
            </label>)}
          </div>
          {!founderView ? <>
            <label className="block text-xs font-bold text-slate-300">Test reference, provider transaction IDs or findings (no bank secrets)
              <textarea rows={3} className={input+" mt-1"} maxLength={3000} value={form.test_notes} onChange={e=>setForm(old=>({...old,test_notes:e.target.value}))} placeholder="Record sandbox transaction references, transfer, settlement and refund findings."/>
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btn} disabled={busy||Boolean(plan.founder_test_reviewed)} onClick={()=>update({test_evidence:evidence,test_notes:form.test_notes},"Payment evidence checklist saved; review has not been approved.")}>Save payment test evidence</button>
              <button type="button" className={btn} disabled={busy||!plan.bank_ready||!plan.test_evidence_complete||!plan.test_notes.trim()||Boolean(plan.test_review_requested)} onClick={()=>update({request_test_review:true},"Founder payment-test review requested.")}>Request founder review</button>
            </div>
          </> : <>
            <p className="text-xs text-slate-400">Owner notes: {plan.test_notes||"No test reference submitted."}</p>
            <p className="text-xs text-amber-200">Six checks: {Object.values(plan.test_evidence||{}).filter(Boolean).length}/6 · Review requested: {plan.test_review_requested?"Yes":"No"}. A manual review is not proof of processor settlement.</p>
            <textarea className={input} rows={2} maxLength={3000} placeholder="Founder verification notes and references" value={founderNotes} onChange={e=>setFounderNotes(e.target.value)}/>
            <button type="button" className={btn} disabled={busy||!plan.test_review_requested||!founderNotes.trim()||plan.founder_test_reviewed} onClick={founderReview}>Record founder manual evidence review</button>
          </>}
          {plan.founder_test_reviewed?<p className="text-xs text-emerald-200">Founder review logged: {plan.founder_test_notes || "See review record"}. This does not activate money movement.</p>:null}
        </div> : null}
        {index===4 ? <div className="mt-3">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs leading-5 text-amber-100"><ShieldAlert className="mr-1 inline h-4 w-4"/>Collections are NOT automatically switched. Approval requires functioning payment links, legal fee disclosures, correct receiving account and reconciled deposits.</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-300">{plan.switch_requested?"Switch requested; waiting on release review.":"No switch requested."}</span>
            {!founderView?<button type="button" className={btn} disabled={busy||!plan.founder_test_reviewed||plan.switch_requested} onClick={()=>update({request_switch:true},"Switch request recorded; your processor remains unchanged.")}>Request switch review (no activation)</button>:null}
          </div>
        </div>:null}
      </div>)}
      <p className="text-[11px] leading-5 text-slate-500"><Clock3 className="mr-1 inline h-3.5 w-3.5"/>All steps are tracked per Business. The last step is deliberately never marked complete or switched on until the separately released online-payment system has passed settlement, legal and account checks.</p>
    </>:!loading?<p className="text-xs text-slate-400">No migration progress has been recorded for this business.</p>:null}
  </section>;
}
