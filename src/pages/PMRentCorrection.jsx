import React,{useEffect,useState} from "react";
import {useNavigate,useSearchParams} from "react-router-dom";
import api from "../api/client";
import PMShell from "../components/pm/PMShell";

const money=n=>Number(n||0).toLocaleString("en-US",{style:"currency",currency:"USD"});
const q=n=>Math.round((Number(n)||0)*100)/100;
const list=d=>Array.isArray(d?.results)?d.results:Array.isArray(d)?d:[];
const box="rounded-xl border border-slate-700 bg-[#07111f] p-3";
const field="min-h-9 w-full min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-2 text-xs text-white";
const errText=e=>{const d=e?.response?.data;if(typeof d?.detail==="string")return d.detail;
  if(d&&typeof d==="object")return Object.entries(d).map(([k,v])=>k+": "+(Array.isArray(v)?v.join("; "):String(v))).join(" | ");
  return e?.message||"Unable to save. Please review the month and try again.";};
const ownerSchedule=[
 ["2026-02",78],["2026-03",78],["2026-04",78],["2026-05",78],
 ["2026-06",78],["2026-07",78],["2026-08",344],["2026-09",344],["2026-10",344],
].map(([month,mha])=>({month,rent:"1485.00",mha:String(mha),status:month<"2026-03"?"FORMER_MANAGER":
  month>="2026-08"?"REQUIRES_VERIFICATION":"MHA_REPORTED"}));
const sourceDefault="Owner-entered schedule, pending comparison with written MHA determinations and the original signed lease.";
export default function PMRentCorrection(){
 const nav=useNavigate();const [search]=useSearchParams();
 const selectedId=search.get("tenant")||"";
 const [ws,setWs]=useState(null),[tenants,setTenants]=useState([]),[lease,setLease]=useState(null);
 const [rows,setRows]=useState([]),[checks,setChecks]=useState({}),[loading,setLoading]=useState(true);
 const [active,setActive]=useState(null),[note,setNote]=useState(sourceDefault),[confirmed,setConfirmed]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [draftSaved,setDraftSaved]=useState(false);
 const headers=ws?{"X-PM-Workspace-ID":String(ws.id)}:{};
 const tenant=tenants.find(x=>String(x.id)===String(selectedId));
 const name=tenant?[tenant.first_name,tenant.last_name].filter(Boolean).join(" "):"";
 const isRoxana=!!tenant&&String(tenant.last_name||"").toLowerCase().includes("english")&&
  String(tenant.property_name||"").toLowerCase().includes("roxana");
 const expected=q(rows.reduce((sum,r)=>sum+Number(r.rent||0),0));
 const proposedTenant=q(rows.reduce((sum,r)=>sum+q(Number(r.rent)-Number(r.mha)),0));
 const proposedMha=q(rows.reduce((sum,r)=>sum+Number(r.mha||0),0));
 const visibleRows=isRoxana?rows:rows;
 const canPostMonth=r=>r.month>="2026-03"&&r.month<=new Date().toISOString().slice(0,7);
 const parseAmount=v=>String(v).trim()!==""&&Number.isFinite(Number(v))&&Number(v)>=0;
 const validRow=r=>parseAmount(r.rent)&&parseAmount(r.mha)&&Number(r.mha)<=Number(r.rent)&&Number(r.rent)>0;
 const reviewed=active?checks[active.month]:null;
 const mismatched=active?.month>="2026-08"&&isRoxana;
 const activeNoChange=reviewed&&Math.abs(Number(reviewed.tenant_charge_adjustment||0))<0.005&&
    Math.abs(Number(reviewed.housing_charge_adjustment||0))<0.005;
 useEffect(()=>{let alive=true;(async()=>{try{
   const w=(await api.get("/pm-hub/workspaces/current/")).data;
   const t=await api.get("/pm-hub/tenants/",{headers:{"X-PM-Workspace-ID":String(w.id)}});
   if(alive){setWs(w);setTenants(list(t.data));}
  }catch(e){if(alive)setError(errText(e));}finally{if(alive)setLoading(false);}})();return()=>{alive=false;};},[]);
 useEffect(()=>{if(!selectedId||!ws)return;let alive=true;
   (async()=>{try{
    const r=await api.get("/pm-hub/leases/",{headers,params:{tenant:selectedId}});
    if(alive)setLease(list(r.data).filter(x=>String(x.tenant)===String(selectedId)).sort((a,b)=>String(b.start_date).localeCompare(String(a.start_date)))[0]||null);
   }catch(e){if(alive)setError(errText(e));}})();
   return()=>{alive=false;};
 },[selectedId,ws?.id]);
 useEffect(()=>{
  if(!tenant)return;
  let alive=true;
  const defaultRows=isRoxana?ownerSchedule.map(r=>({...r})):
    [{month:new Date().toISOString().slice(0,7),rent:String(lease?.monthly_rent||tenant.monthly_rent||""),mha:String(lease?.assistance_portion||0),status:"REQUIRES_VERIFICATION"}];
  setRows(defaultRows);setChecks({});setActive(null);setConfirmed(false);setDraftSaved(false);setNotice("");
  if(ws?.id)api.get(`/pm-hub/billing/tenants/${selectedId}/simple-schedule/`,
    {headers:{"X-PM-Workspace-ID":String(ws.id)}}).then(result=>{
     if(!alive||!result.data?.schedule?.months?.length)return;
     const saved=result.data.schedule;
     setRows(saved.months.map(x=>({month:x.month,rent:x.rent,mha:x.mha,status:x.source_status||"PROPOSED"})));
     setNote(saved.source_note||sourceDefault);setDraftSaved(true);
   }).catch(()=>{});
  return()=>{alive=false};
 },[selectedId,tenant?.property_name,lease?.id,ws?.id]);
 const update=(month,key,value)=>{setRows(old=>old.map(x=>x.month===month?{...x,[key]:value}:x));
   setChecks(old=>{const n={...old};delete n[month];return n;});setActive(null);setConfirmed(false);setDraftSaved(false);setNotice("");};
 const makePayload=r=>{
    const abated=isRoxana&&r.month==="2026-10";
    return {month:r.month,contract_rent:String(q(r.rent)),
      tenant_portion:String(q(Number(r.rent)-Number(r.mha))),
      housing_portion:String(abated?0:q(r.mha)),
      exclusion_reason:abated?"October assistance abatement reported by MHA. Not billed or collected pending agency clearance.":"",
      source_note:note.trim()};
 };
 useEffect(()=>{
   if(!selectedId||!ws?.id||!rows.length)return;
   let alive=true;
   const timer=setTimeout(async()=>{
    try{
     const results=await Promise.all(rows.filter(r=>canPostMonth(r)&&validRow(r)).map(async r=>{
      try{
       const out=await api.post(`/pm-hub/billing/tenants/${selectedId}/reconcile-month/`,
        {month:r.month,contract_rent:String(q(r.rent)),
         tenant_portion:String(q(Number(r.rent)-Number(r.mha))),
         housing_portion:String(isRoxana&&r.month==="2026-10"?0:q(r.mha)),
         exclusion_reason:isRoxana&&r.month==="2026-10"?"MHA October abatement reported; amount not charged":"",
         source_note:"Read-only monthly billing comparison against recorded charges."},
        {headers:{"X-PM-Workspace-ID":String(ws.id)}});
       return [r.month,out.data];
      }catch(e){return [r.month,null];}
     }));
     if(alive)setChecks(old=>({...old,...Object.fromEntries(results.filter(([,v])=>v))}));
    }catch(e){/* keep the manual Review option available */}
   },220);
   return()=>{alive=false;clearTimeout(timer);};
 },[selectedId,ws?.id,rows.map(r=>r.month+":"+r.rent+":"+r.mha).join("|"),isRoxana]);
 async function saveDraft(){
  if(!ws?.id||!selectedId||rows.some(r=>!validRow(r))){
    setError("Check that each month has valid rent and housing amounts before saving.");return;
  }
  setBusy(true);setError("");setNotice("");
  try{
   const response=await api.patch(`/pm-hub/billing/tenants/${selectedId}/simple-schedule/`,
     {months:rows,source_note:note},{headers:{"X-PM-Workspace-ID":String(ws.id)}});
   setDraftSaved(true);setNotice(response.data.detail||"Monthly rent schedule draft saved. Ledger unchanged.");
  }catch(e){setError(errText(e));}
  finally{setBusy(false);}
 }
 async function review(r){
  if(!selectedId||!ws||!validRow(r)||!canPostMonth(r)){
    setError("Choose an eligible month and enter a valid total rent and housing portion.");return;
  }
  setError("");setNotice("");setConfirmed(false);setBusy(true);setActive(r);
  try{
   const result=await api.post(`/pm-hub/billing/tenants/${selectedId}/reconcile-month/`,makePayload(r),{headers});
   setChecks(old=>({...old,[r.month]:result.data}));
  }catch(e){setError(errText(e));}
  finally{setBusy(false);}
 }
 async function apply(){
   if(!active||!reviewed||!confirmed||activeNoChange||busy)return;
   setBusy(true);setError("");setNotice("");
   try{
    const result=await api.post(`/pm-hub/billing/tenants/${selectedId}/reconcile-month/`,
      {...makePayload(active),apply:true,confirmed:true},{headers});
    setChecks(old=>({...old,[active.month]:{...result.data,tenant_charge_adjustment:"0.00",housing_charge_adjustment:"0.00"}}));
    setNotice(`${active.month} saved: tenant rent ${money(result.data.tenant_due)}, housing bill ${money(result.data.housing_due)}. Existing payments and late fees were preserved.`);
    setActive(null);setConfirmed(false);
   }catch(e){setError(errText(e));}finally{setBusy(false);}
 }
 return <PMShell><main className="mx-auto max-w-6xl space-y-3 px-3 py-3 pb-[calc(8rem+env(safe-area-inset-bottom))] sm:px-5">
  <div className="flex flex-wrap items-center justify-between gap-2">
   <div><div className="text-[10px] font-black uppercase tracking-[.16em] text-cyan-300">Property Manager · Simple billing</div>
    <h1 className="text-xl font-black">Monthly Rent Schedule</h1>
    <p className="mt-1 text-xs text-slate-400">One month. One rent amount. Two payer portions. No duplicate rent bills.</p></div>
   <button type="button" onClick={()=>nav(`/pm/payments?tenant=${selectedId}`)} className="min-h-9 rounded-lg border border-slate-700 px-3 text-xs">Payments & Ledger →</button>
  </div>
  {error?<p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-100">{error}</p>:null}
  {notice?<p role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-xs text-emerald-100">{notice}</p>:null}
  <section className={box}>
    <label className="block text-[11px] font-bold text-slate-300">Resident
      <select className={field+" mt-1"} value={selectedId} onChange={e=>nav("/pm/rent-correction?tenant="+e.target.value)}>
        <option value="">Select resident</option>{tenants.map(t=><option value={t.id} key={t.id}>{t.first_name} {t.last_name} · {t.property_name}</option>)}
      </select>
    </label>
    {lease?<p className="mt-2 text-[11px] text-amber-200">Current saved lease: {money(lease.monthly_rent)}. The schedule below does not automatically change the signed lease; update it in Lease Builder when verified.</p>:null}
  </section>
  {selectedId&&rows.length?<><section className="grid grid-cols-3 gap-2">
     {[[ "Rent scheduled",expected],["Tenant portion",proposedTenant],["MHA portion",proposedMha]].map(([label,value])=>
       <div key={label} className="rounded-xl border border-slate-700 bg-[#07111f] p-2.5"><div className="text-[10px] text-slate-400">{label}</div><div className="mt-1 text-sm font-black sm:text-lg">{money(value)}</div></div>)}
    </section>
    {isRoxana?<div className="rounded-xl border border-amber-400/25 bg-amber-500/5 p-3 text-[11px] leading-5 text-amber-100">
       <strong>Source conflict to review:</strong> Your proposed schedule uses $344 MHA for August–October. MHA previously stated August $0, September $377, and an October abatement. Those months remain marked for verification; October's MHA amount is displayed for comparison but excluded from billing. February was managed by Adair and is shown for reference only.
     </div>:null}
    <section className={box}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-sm font-black">Monthly rent · {name}</h2><p className="mt-0.5 text-[10px] text-slate-400">{draftSaved?"Schedule draft saved":"Unsaved proposed schedule"} · Edit amount → Save draft → Review individual charges</p></div>
       <button type="button" disabled={busy||rows.some(r=>!validRow(r))} onClick={saveDraft} className="min-h-10 rounded-lg bg-cyan-400 px-3 text-[11px] font-black text-slate-950 disabled:opacity-40">{busy?"Saving…":"Save table draft"}</button></div>
      <div className="overflow-x-auto">
      <table className="w-full min-w-[550px] text-left text-xs"><thead><tr className="border-b border-slate-700 text-[10px] text-slate-400">
       <th className="py-2 pr-2">Month</th><th className="p-2">Total rent</th><th className="p-2">MHA share</th><th className="p-2">Tenant share</th><th className="p-2">Ledger</th></tr></thead>
       <tbody>{visibleRows.map(r=>{const result=checks[r.month];const unchanged=result&&Math.abs(Number(result.tenant_charge_adjustment||0))<.005&&Math.abs(Number(result.housing_charge_adjustment||0))<.005;
        const blocked=!canPostMonth(r);return <tr key={r.month} className="border-b border-slate-800 align-middle">
         <td className="whitespace-nowrap py-2 pr-2 font-bold">{r.month}{blocked?<div className="text-[9px] text-slate-500">History only</div>:null}</td>
         <td className="p-1.5"><input aria-label={r.month+" total rent"} inputMode="decimal" value={r.rent} onChange={e=>update(r.month,"rent",e.target.value)} className={field+" w-24"}/></td>
         <td className="p-1.5"><input aria-label={r.month+" MHA share"} inputMode="decimal" value={r.mha} onChange={e=>update(r.month,"mha",e.target.value)} className={field+" w-24"}/>{r.month==="2026-10"&&isRoxana?<div className="text-[9px] text-amber-200">Abated</div>:null}</td>
         <td className="p-1.5 font-black text-cyan-200">{validRow(r)?money(q(Number(r.rent)-Number(r.mha))):"Check split"}</td>
         <td className="p-1.5">{blocked?<span className="text-[10px] text-slate-500">Adair</span>:
           unchanged?<span className="text-[10px] font-bold text-emerald-200">Already billed ✓</span>:
           <div className="flex flex-col items-start gap-1"><button type="button" disabled={busy||!validRow(r)} onClick={()=>review(r)} className="min-h-9 rounded-lg border border-cyan-400/35 bg-cyan-500/10 px-2.5 text-[11px] font-bold text-cyan-100 disabled:opacity-40">Review</button>{result?<span className="text-[9px] text-amber-200">Correction needed</span>:null}</div>}
         </td>
        </tr>})}</tbody></table>
      </div>
      <p className="mt-2 text-[10px] text-slate-500">Tenant share calculates automatically: total rent minus MHA. “Already billed” means no additional rent charge is needed. This is a proposed schedule, not proof any payment was received.</p>
    </section>
    <section className={box}>
       <label className="block text-[11px] font-bold text-slate-300">Source / verification note
        <textarea className={field+" mt-1 min-h-16"} rows={2} value={note} onChange={e=>{setNote(e.target.value);setActive(null);setConfirmed(false);setDraftSaved(false);}}/>
       </label>
       {active&&reviewed?<div className="mt-3 space-y-2 rounded-xl border border-cyan-400/25 bg-cyan-500/5 p-3">
         <h3 className="text-sm font-black">{active.month} · Change preview</h3>
         <div className="grid grid-cols-2 gap-2 text-xs"><div>Tenant adjustment: <strong>{money(reviewed.tenant_charge_adjustment)}</strong></div><div>MHA adjustment: <strong>{money(reviewed.housing_charge_adjustment)}</strong></div></div>
         <p className="text-[11px] text-slate-400">Existing monthly receipts: {money(reviewed.posted_tenant_payments_in_month)}. Existing late fees: {money(reviewed.preserved_late_fees)}. No receipt or fee will be removed.</p>
         {activeNoChange?<p className="text-xs font-black text-emerald-200">Already billed correctly. Nothing new needs saving for this month.</p>:<>
         {mismatched?<p className="text-[11px] text-amber-200">This allocation conflicts with prior MHA correspondence. To post it, replace the default source note with the date and details of the updated MHA determination. You can always save the proposed table as a draft without posting charges.</p>:null}
         <label className="flex items-start gap-2 text-xs text-slate-200"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I verified this monthly split and authorize the exact correction shown. This does not mark MHA or tenant payments as received.</label>
         <button type="button" disabled={!confirmed||busy||note.trim().length<12||(mismatched&&note.trim()===sourceDefault)} onClick={apply} className="min-h-10 w-full rounded-lg bg-cyan-400 text-xs font-black text-slate-950 disabled:opacity-40">{busy?"Saving…":"Save verified month"}</button>
         </>}
       </div>:null}
       <div className="mt-3 flex flex-wrap gap-2">
         <button type="button" onClick={()=>nav(`/pm/lease-builder?tenant=${selectedId}`)} className="min-h-10 rounded-lg border border-slate-700 px-3 text-xs">Lease Builder · automatic future billing</button>
         <button type="button" onClick={()=>nav(`/pm/payments?tenant=${selectedId}`)} className="min-h-10 rounded-lg border border-slate-700 px-3 text-xs">Review payments, credits & $50 late fees</button>
       </div>
    </section>
   </>:loading?<p className="text-xs text-slate-400">Loading property records…</p>:null}
 </main></PMShell>;
}
