import React,{useEffect,useMemo,useState} from "react";
import {useNavigate,useSearchParams} from "react-router-dom";
import api from "../api/client";
import PMShell from "../components/pm/PMShell";

const usd=v=>Number(v||0).toLocaleString("en-US",{style:"currency",currency:"USD"});
const field="min-h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 text-xs text-white focus:border-cyan-400 focus:outline-none";
const list=d=>Array.isArray(d?.results)?d.results:Array.isArray(d)?d:[];
const F=({name,children})=><label className="block min-w-0 text-[10px] font-bold text-slate-400">{name}<div className="mt-1">{children}</div></label>;
const Box=({title,desc,children})=><section className="rounded-xl border border-cyan-400/15 bg-[#07111f] p-3 sm:p-4"><h2 className="text-sm font-black">{title}</h2>{desc?<p className="mt-1 text-[11px] text-slate-400">{desc}</p>:null}<div className="mt-3">{children}</div></section>;
const roxana={
 active:true,billing_start_date:"2026-03-01",due_day:1,grace_days:5,
 late_fee_amount:"50.00",auto_late_fees:false,late_fee_verified:false,
 verified_through:"2026-10",source_note:"MHA correspondence identifying monthly voucher responsibilities; Adair receipts and reported March 1 management transfer. October assistance abated, not tenant-billable.",
 monthly_overrides:Object.fromEntries([
  ...["2026-03","2026-04","2026-05","2026-06","2026-07"].map(m=>[m,{tenant:"1407.00",housing:"78.00",abated:"0.00",note:"MHA supplied $78 share"}]),
  ["2026-08",{tenant:"1485.00",housing:"0.00",abated:"0.00",note:"MHA confirmed full tenant share in August"}],
  ["2026-09",{tenant:"1108.00",housing:"377.00",abated:"0.00",note:"MHA Sept 1 income-change determination"}],
  ["2026-10",{tenant:"1108.00",housing:"0.00",abated:"377.00",note:"MHA October abatement; do not bill tenant for this $377"}],
 ])};
function FormError({error}){return error?<div role="alert" className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</div>:null;}

export default function PMLeaseBuilder(){
 const navigate=useNavigate();const [params,setParams]=useSearchParams();
 const tenantId=params.get("tenant")||"";
 const [ws,setWs]=useState(null),[tenants,setTenants]=useState([]);
 const [lease,setLease]=useState(null),[leaseForm,setLeaseForm]=useState(null),[config,setConfig]=useState(null),[display,setDisplay]=useState(null);
 const [preview,setPreview]=useState(null),[ready,setReady]=useState(false),[feePreview,setFeePreview]=useState(null),[feeMonth,setFeeMonth]=useState(""),[feeNote,setFeeNote]=useState("");
 const [busy,setBusy]=useState(false),[err,setErr]=useState(""),[msg,setMsg]=useState("");
 const headers=ws?{"X-PM-Workspace-ID":String(ws.id)}:{};
 const tenant=tenants.find(t=>String(t.id)===tenantId);
 const isRoxana=tenant?.last_name?.toLowerCase()==="english"&&String(tenant?.property_name||"").toLowerCase().includes("roxana");
 const monthRows=useMemo(()=>Object.entries(config?.monthly_overrides||{}).sort(([a],[b])=>a.localeCompare(b)),[config?.monthly_overrides]);
 const changeLease=(k,v)=>{setLeaseForm(x=>({...x,[k]:v}));setPreview(null);setReady(false)};
 const changeCfg=(k,v)=>{setConfig(x=>({...x,[k]:v}));setPreview(null);setReady(false)};
 const editMonth=(m,k,v)=>{setConfig(x=>({...x,monthly_overrides:{...x.monthly_overrides,[m]:{...x.monthly_overrides[m],[k]:v}}}));setPreview(null);setReady(false)};
 const errmsg=e=>e?.response?.data?.detail||Object.entries(e?.response?.data||{}).map(([a,v])=>a+": "+v).join(", ")||e?.message||"Request failed.";
 useEffect(()=>{let alive=true;api.get("/pm-hub/workspaces/current/").then(async r=>{
   const w=r.data;const t=await api.get("/pm-hub/tenants/",{headers:{"X-PM-Workspace-ID":String(w.id)}});
   if(alive){setWs(w);setTenants(list(t.data));}
 }).catch(e=>{if(alive)setErr(errmsg(e));});return()=>{alive=false};},[]);
 async function loadTenant(id){
  if(!id||!ws)return;setErr("");setMsg("");setDisplay(null);setPreview(null);setReady(false);
  try{
   const [l,s]=await Promise.all([
    api.get("/pm-hub/leases/",{headers,params:{tenant:id}}),
    api.get(`/pm-hub/billing/tenants/${id}/lease-builder/`,{headers})
   ]);
   const current=list(l.data).find(x=>x.status!=="ENDED")||null;
   setLease(current);
   setLeaseForm(current?{start_date:current.start_date,end_date:current.end_date||"",monthly_rent:String(current.monthly_rent),
     section8:current.section8,tenant_portion:String(current.tenant_portion||"0"),
     assistance_portion:String(current.assistance_portion||"0"),converts_to_month_to_month:current.converts_to_month_to_month,
     security_deposit:String(current.security_deposit||"0")}:
     {start_date:"",end_date:"",monthly_rent:"",section8:false,tenant_portion:"",assistance_portion:"0",
       converts_to_month_to_month:true,security_deposit:"0"});
   const matched=tenants.find(x=>String(x.id)===String(id));
   const rox=matched?.last_name?.toLowerCase()==="english"&&String(matched.property_name||"").toLowerCase().includes("roxana");
   setConfig(s.data.setup?.source_note ? s.data.setup : rox ? {...roxana,monthly_overrides:{...roxana.monthly_overrides}} :
     {...s.data.setup,active:false,billing_start_date:current?.start_date||"",
       due_day:1,grace_days:5,late_fee_amount:"0.00",auto_late_fees:false,late_fee_verified:false,
       verified_through:"",monthly_overrides:{},source_note:""});
   setDisplay(s.data);
  }catch(e){setErr(errmsg(e));}
 }
 useEffect(()=>{loadTenant(tenantId);},[tenantId,ws?.id]);
 async function saveLease(){
  if(!leaseForm||!tenantId)return;
  setBusy(true);setErr("");setMsg("");
  try{
   const data={
    monthly_rent:leaseForm.monthly_rent,section8:Boolean(leaseForm.section8),
    tenant_portion:leaseForm.section8?leaseForm.tenant_portion:leaseForm.monthly_rent,
    assistance_portion:leaseForm.section8?leaseForm.assistance_portion:"0",
    end_date:leaseForm.end_date||null,
    converts_to_month_to_month:Boolean(leaseForm.converts_to_month_to_month)
   };
   if(Number(data.tenant_portion)+Number(data.assistance_portion)!==Number(data.monthly_rent))
    throw new Error("Tenant + housing must equal total rent.");
   let result;
   if(lease){
    result=await api.patch(`/pm-hub/leases/${lease.id}/`,data,{headers});
   }else{
    if(!leaseForm.start_date)throw new Error("Enter the signed lease start date.");
    result=await api.post("/pm-hub/leases/",{...data,tenant:tenantId,start_date:leaseForm.start_date,
       security_deposit:leaseForm.security_deposit||"0",status:"ACTIVE"},{headers});
   }
   setLease(result.data);setMsg("Lease amounts saved. Next save the monthly schedule, then preview before posting.");
   await loadTenant(tenantId);
  }catch(e){setErr(errmsg(e));}finally{setBusy(false);}
 }
 async function saveSchedule(){
  if(!config||!tenantId)return;
  setBusy(true);setErr("");setMsg("");
  try{
   const data={...config,auto_late_fee_from:config.auto_late_fee_from||new Date().toISOString().slice(0,10)};
   const r=await api.patch(`/pm-hub/billing/tenants/${tenantId}/lease-builder/`,data,{headers});
   setConfig(r.data.setup);setMsg("Schedule saved. No existing ledger amount was changed.");
   setPreview(null);setReady(false);
  }catch(e){setErr(errmsg(e));}finally{setBusy(false);}
 }
 async function showPreview(){
  setBusy(true);setErr("");setMsg("");
  try{
   const [p,s]=await Promise.all([api.post(`/pm-hub/billing/tenants/${tenantId}/lease-builder/`,{through_date:new Date().toISOString().slice(0,10)},{headers}),
      api.get(`/pm-hub/billing/tenants/${tenantId}/lease-builder/`,{headers})]);
   setPreview(p.data);setDisplay(s.data);setReady(false);
  }catch(e){setErr(errmsg(e));}finally{setBusy(false);}
 }
 async function postBilling(){
  if(!ready||!preview)return;
  setBusy(true);setErr("");setMsg("");
  try{
   const r=await api.post(`/pm-hub/billing/tenants/${tenantId}/lease-builder/`,{
    apply:true,confirmed:true,through_date:new Date().toISOString().slice(0,10)},{headers});
   setPreview(null);setReady(false);setMsg(`Posted ${r.data.created_entry_ids?.length||0} balancing rent adjustments. Payments and late fees remain unchanged.`);
   await loadTenant(tenantId);
  }catch(e){setErr(errmsg(e));}finally{setBusy(false);}
 }
 async function waiveFee(f){
  const reason=window.prompt("Reason for waiving this fee (original charge will remain in audit history):");
  if(!reason)return;setBusy(true);setErr("");
  try{
   await api.post(`/pm-hub/billing/tenants/${tenantId}/late-fees/${f.id}/waive/`,{reason,confirmed:true},{headers});
   setMsg("Fee waived with an audit credit; original charge preserved.");await loadTenant(tenantId);
  }catch(e){setErr(errmsg(e));}finally{setBusy(false);}
 }
 async function checkFee(apply=false){
  setBusy(true);setErr("");setMsg("");
  try{
   const r=await api.post(`/pm-hub/billing/tenants/${tenantId}/verified-late-fee/`,{
     month:feeMonth,amount:config?.late_fee_amount||"50.00",
     source_note:feeNote,lease_verified:apply,confirmed:apply,apply,
     due_day:config?.due_day||1,grace_days:config?.grace_days||5},{headers});
   if(apply){setMsg("Verified monthly late fee added.");setFeePreview(null);await loadTenant(tenantId);}
   else setFeePreview(r.data);
  }catch(e){setErr(errmsg(e));}finally{setBusy(false);}
 }
 const currentTotals=display?.totals||{};
 return <PMShell><main className="mx-auto max-w-6xl space-y-3 px-3 py-3 pb-[calc(8rem+env(safe-area-inset-bottom))] text-white sm:px-5">
  <div className="flex items-start justify-between gap-2"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-300">Property Management / Lease Operations</div><h1 className="text-xl font-black">Lease Builder & Monthly Billing</h1><p className="mt-1 text-xs text-slate-400">One rent amount. Separate payer shares. Clear charges, receipts, and overdue fees.</p></div><button type="button" onClick={()=>navigate("/pm/payments?tenant="+tenantId)} className="rounded-lg border border-slate-700 px-3 py-2 text-xs">Ledger →</button></div>
  <FormError error={err}/>{msg?<div role="status" className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 p-3 text-xs text-emerald-200">{msg}</div>:null}
  <Box title="Select lease and resident"><select className={field} aria-label="Resident" value={tenantId} onChange={e=>setParams(e.target.value?{tenant:e.target.value}:{})}><option value="">Choose tenant</option>{tenants.map(t=><option key={t.id} value={t.id}>{t.first_name} {t.last_name} · {t.property_name}</option>)}</select></Box>
  {tenantId&&leaseForm?<><section className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[
    ["Tenant received",currentTotals.tenant_paid_recorded],["Housing received",currentTotals.housing_paid_recorded],
    ["Tenant outstanding",currentTotals.tenant_owed],["Housing outstanding",currentTotals.housing_owed]
  ].map(([k,v])=><div key={k} className="rounded-xl border border-cyan-400/20 bg-[#07111f] p-2.5"><div className="text-[10px] text-slate-400">{k}</div><div className="mt-1 text-lg font-black">{usd(v)}</div></div>)}</section>
  <p className="text-[10px] text-amber-200">Totals above are POSTED transactions only. Missing monthly rent charges will understate owed amounts until reconciliation is applied. MHA transfers to a former manager, abatements and security deposits are not payments received.</p>
  <Box title="1 · Build or correct the lease" desc="The original lease start, actual billing start, and management takeover may be different dates. Do not create a duplicate lease for an existing tenancy.">
   <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
    <F name="Lease start"><input type="date" disabled={Boolean(lease)} className={field} value={leaseForm.start_date||""} onChange={e=>changeLease("start_date",e.target.value)}/></F>
    <F name="Lease end (optional)"><input type="date" className={field} value={leaseForm.end_date||""} onChange={e=>changeLease("end_date",e.target.value)}/></F>
    <F name="Monthly contract rent"><input inputMode="decimal" className={field} value={leaseForm.monthly_rent} onChange={e=>changeLease("monthly_rent",e.target.value)}/></F>
    <F name="Assistance program"><select className={field} value={leaseForm.section8?"yes":"no"} onChange={e=>changeLease("section8",e.target.value==="yes")}><option value="no">None</option><option value="yes">Housing assistance</option></select></F>
    {leaseForm.section8?<><F name="Current tenant share"><input inputMode="decimal" className={field} value={leaseForm.tenant_portion} onChange={e=>changeLease("tenant_portion",e.target.value)}/></F><F name="Current housing share"><input inputMode="decimal" className={field} value={leaseForm.assistance_portion} onChange={e=>changeLease("assistance_portion",e.target.value)}/></F></>:null}
    <F name="Rolls to month-to-month"><select className={field} value={leaseForm.converts_to_month_to_month?"yes":"no"} onChange={e=>changeLease("converts_to_month_to_month",e.target.value==="yes")}><option value="yes">Yes</option><option value="no">No</option></select></F>
   </div>
   {isRoxana?<p className="mt-2 text-[11px] text-amber-200">Roxana's saved lease currently differs from the documented $1,485 total. Correct it to $1,485 with the current certified $1,108 tenant / $377 housing split before saving the billing schedule. Preserve the deposit dispute separately.</p>:null}
   <button disabled={busy} onClick={saveLease} className="mt-3 min-h-10 rounded-lg bg-cyan-400 px-4 text-xs font-black text-slate-950 disabled:opacity-40">{lease?"Save verified lease amounts":"Create lease"}</button>
  </Box>
  {lease&&config?<><Box title="2 · Monthly billing rules" desc="Monthly rent bills once on the due day. Biweekly tenant payments reduce the oldest unpaid charges, but do not automatically create multiple monthly late fees.">
   <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
    <F name="Bill from"><input type="date" value={config.billing_start_date||""} onChange={e=>changeCfg("billing_start_date",e.target.value)} className={field}/></F>
    <F name="Due day"><select value={config.due_day||1} onChange={e=>changeCfg("due_day",Number(e.target.value))} className={field}>{[1,2,3,5,10,15,20,25,28].map(n=><option key={n} value={n}>{n}{n===1?"st of month":""}</option>)}</select></F>
    <F name="Grace period (days)"><input type="number" min="0" max="30" className={field} value={config.grace_days||0} onChange={e=>changeCfg("grace_days",Number(e.target.value))}/></F>
    <F name="Late fee"><input inputMode="decimal" className={field} value={config.late_fee_amount||"0"} onChange={e=>changeCfg("late_fee_amount",e.target.value)}/></F>
    {leaseForm.section8?<F name="Voucher allocation verified through"><input type="month" className={field} value={config.verified_through||""} onChange={e=>changeCfg("verified_through",e.target.value)}/></F>:null}
   </div>
   <div className="mt-3 flex flex-wrap gap-3">
    <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={Boolean(config.active)} onChange={e=>changeCfg("active",e.target.checked)}/>Enable lease billing</label>
    <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={Boolean(config.late_fee_verified)} onChange={e=>changeCfg("late_fee_verified",e.target.checked)}/>Signed $50 fee provision verified</label>
    <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={Boolean(config.auto_late_fees)} onChange={e=>changeCfg("auto_late_fees",e.target.checked)}/>Automatic FUTURE late fees</label>
   </div>
   <p className="mt-2 text-[10px] text-slate-400">Historical late fees need individual review. Automatic recurring billing requires the daily billing job to be connected on the production server; activating a schedule here doesn't independently schedule a server.</p>
   <F name="Source / signed agreement"><textarea className={field} rows={2} value={config.source_note||""} onChange={e=>changeCfg("source_note",e.target.value)}/></F>
   <button disabled={busy} onClick={saveSchedule} className="mt-3 min-h-10 rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-4 text-xs font-black text-cyan-100">Save billing schedule</button>
  </Box>
  <Box title="3 · Monthly rent allocation" desc="Each row shows the true contract rent split. The excluded column is for verified abatement, not a tenant payment or additional amount owed by the tenant.">
   <div className="space-y-2">{monthRows.map(([m,row])=><div key={m} className="rounded-lg border border-slate-700 bg-black/20 p-2.5">
    <div className="flex items-center justify-between"><strong className="text-xs">{m}</strong><span className="text-[10px] text-slate-500">Contract {usd(leaseForm.monthly_rent)}</span></div>
    <div className="mt-2 grid grid-cols-3 gap-2">{[["tenant","Tenant"],["housing","Housing"],["abated","Excluded"]].map(([k,label])=><F key={k} name={label}><input className={field} inputMode="decimal" value={row[k]} onChange={e=>editMonth(m,k,e.target.value)}/></F>)}</div>
    <input className={field+" mt-2"} aria-label={m+" allocation evidence"} value={row.note||""} onChange={e=>editMonth(m,"note",e.target.value)} placeholder="MHA decision, abatement or source"/>
   </div>)}</div>
   <div className="mt-2 flex gap-2"><button type="button" onClick={()=>{const m=window.prompt("Month to review (YYYY-MM)");if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(m||"")||config.monthly_overrides[m])return;changeCfg("monthly_overrides",{...config.monthly_overrides,[m]:{tenant:leaseForm.section8?leaseForm.tenant_portion:leaseForm.monthly_rent,housing:leaseForm.section8?leaseForm.assistance_portion:"0",abated:"0",note:""}})}} className="min-h-9 rounded-lg border border-slate-700 px-3 text-xs">Add month</button><button type="button" onClick={()=>navigate(`/pm/rent-correction?tenant=${tenantId}`)} className="min-h-9 rounded-lg border border-slate-700 px-3 text-xs">Legacy correction view</button></div>
  </Box>
  <Box title="4 · Preview and post charges" desc="Review missing rent charges and payer-specific differences. Saving monthly bills won't alter deposits, payments, or existing late fees.">
   <button disabled={busy} onClick={showPreview} className="min-h-10 w-full rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-3 text-xs font-black text-cyan-100">Preview through today (read-only)</button>
   {preview?<div className="mt-3 space-y-2">
    {preview.months?.map(row=><div key={row.month} className={"rounded-lg border p-2.5 "+(row.blocked?"border-amber-400/30":"border-slate-700")}>
      <div className="flex justify-between gap-2"><strong className="text-xs">{row.month}</strong><span className="text-[10px] text-slate-400">{row.blocked?"Needs review":usd(row.rent)+" contract"}</span></div>
      {row.blocked?<p className="mt-1 text-[11px] text-amber-200">{row.reason}</p>:
       <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]"><div>Tenant: {usd(row.tenant_due)}<div className="text-cyan-300">Adjustment {usd(row.adjust_tenant)}</div></div><div>Housing: {usd(row.housing_due)}<div className="text-fuchsia-300">Adjustment {usd(row.adjust_housing)}</div></div><div>Tenant receipts this month: {usd(row.tenant_receipts_month)}</div><div>Already posted fees: {usd(row.late_fee_net_month)}</div>{Number(row.abated)>0?<div className="col-span-2 text-amber-200">Excluded assistance: {usd(row.abated)} ({row.reason})</div>:null}</div>}
    </div>)}
    {preview.late_fee_candidates?.length?<p className="rounded-lg border border-amber-400/30 p-2 text-[11px] text-amber-200">{preview.late_fee_candidates.length} historic fee candidate(s) need separate signed-lease and payment-date review. They will not post with these rent adjustments.</p>:null}
    <label className="mt-3 flex items-start gap-2 text-[11px]"><input type="checkbox" checked={ready} onChange={e=>setReady(e.target.checked)}/>I reviewed every period and payer. Post only verified rent corrections, never an unreceived MHA payment or deposit credit.</label>
    <button disabled={!ready||busy||preview.months?.some(m=>m.blocked)} onClick={postBilling} className="min-h-11 w-full rounded-lg bg-cyan-400 text-xs font-black text-slate-950 disabled:opacity-40">Apply verified monthly rent charges</button>
   </div>:null}
  </Box>
  <Box title="5 · Late fees · add or waive" desc="One $50 late fee per eligible month unless the actual lease authorizes otherwise. Waiving preserves the original entry and makes a clearly labeled reversal.">
   <div className="space-y-2">{display?.late_fees?.map(f=><div key={f.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-700 px-2.5 py-2"><div><strong className="text-xs">{usd(f.amount)}</strong><div className="text-[10px] text-slate-400">{f.date} · {Number(f.waived)>0?"Waived "+usd(f.waived):"Charged"}</div></div>{Number(f.waived)===0?<button disabled={busy} onClick={()=>waiveFee(f)} className="min-h-9 rounded-lg border border-amber-400/30 px-2 text-xs text-amber-200">Waive</button>:null}</div>)}</div>
   <div className="mt-3 grid grid-cols-2 gap-2"><F name="Rent month"><input type="month" className={field} value={feeMonth} onChange={e=>{setFeeMonth(e.target.value);setFeePreview(null)}}/></F><F name="Fee amount"><input className={field} value={config.late_fee_amount} onChange={e=>changeCfg("late_fee_amount",e.target.value)}/></F></div>
   <F name="Signed lease clause / payment timing"><textarea className={field} rows={2} value={feeNote} onChange={e=>setFeeNote(e.target.value)} placeholder="Lease paragraph and actual payment dates"/></F>
   <button disabled={!feeMonth||feeNote.length<12||busy} onClick={()=>checkFee(false)} className="mt-2 min-h-9 rounded-lg border border-slate-700 px-3 text-xs">Preview late fee</button>
   {feePreview?<div className="mt-2 space-y-2 rounded-lg border border-amber-400/25 p-3 text-[11px]">
     <p>Tenant rent unpaid at grace cutoff: {usd(feePreview.unpaid_tenant_rent_at_grace)} · Proposed fee: {usd(feePreview.fee)}</p>
     <button disabled={busy||!feePreview.eligible_for_review} onClick={()=>{if(window.confirm("Charge the verified late fee for "+feeMonth+"?"))checkFee(true)}} className="min-h-9 rounded-lg bg-amber-300 px-3 font-black text-slate-950 disabled:opacity-40">Add verified fee</button>
   </div>:null}
  </Box></>:null}
  </>:null}
 </main></PMShell>;
}
