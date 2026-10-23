import React,{useEffect,useMemo,useState} from "react";
import {useNavigate,useSearchParams} from "react-router-dom";
import api from "../api/client";
import PMShell from "../components/pm/PMShell";

const input="min-h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none";
const list=x=>Array.isArray(x?.results)?x.results:Array.isArray(x)?x:[];
const usd=x=>Number(x||0).toLocaleString("en-US",{style:"currency",currency:"USD"});
const example=[
 ["2026-03","1407","78",""],["2026-04","1407","78",""],
 ["2026-05","1407","78",""],["2026-06","1407","78",""],
 ["2026-07","1407","78",""],["2026-08","1485","0",""],
 ["2026-09","1108","377",""],["2026-10","1108","0","October HAP abated after failed inspection; tenant pays only certified tenant share"],
].map(([month,tenant_portion,housing_portion,exclusion_reason])=>({
 month,tenant_portion,housing_portion,contract_rent:"1485",exclusion_reason
}));
const emptyMonth=()=>({month:new Date().toISOString().slice(0,7),contract_rent:"",tenant_portion:"",housing_portion:"",exclusion_reason:""});
const Card=({title,info,children})=><section className="rounded-xl border border-cyan-500/20 bg-[#07111f] p-3"><h2 className="text-sm font-black text-white">{title}</h2>{info?<p className="mt-1 text-[11px] leading-5 text-slate-400">{info}</p>:null}<div className="mt-3">{children}</div></section>;

export default function PMRentCorrection(){
 const nav=useNavigate();const [params]=useSearchParams();
 const [workspace,setWorkspace]=useState(null),[tenants,setTenants]=useState([]),[leases,setLeases]=useState([]);
 const [tenantId,setTenantId]=useState(params.get("tenant")||"");
 const [months,setMonths]=useState([]);
 const [current,setCurrent]=useState({contract_rent:"1485",tenant_portion:"1108",housing_portion:"377"});
 const [note,setNote]=useState("Contracted $1,485 rent from original TenantCloud statements; MHA supplied the March–September payer allocations and October abatement information.");
 const [preview,setPreview]=useState(null),[confirmed,setConfirmed]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const headers=workspace?{"X-PM-Workspace-ID":String(workspace.id)}:{};
 const tenant=tenants.find(t=>String(t.id)===String(tenantId));
 const lease=leases.filter(l=>String(l.tenant)===String(tenantId)&&l.status!=="ENDED").sort((a,b)=>String(b.start_date).localeCompare(String(a.start_date)))[0];
 const isRoxana=Boolean(tenant&&String(tenant.last_name||"").toLowerCase()==="english"&&String(tenant.property_name||"").toLowerCase().includes("roxana"));
 useEffect(()=>{let mounted=true;(async()=>{try{
  const w=(await api.get("/pm-hub/workspaces/current/")).data;
  const h={"X-PM-Workspace-ID":String(w.id)};
  const [t,l]=await Promise.all([api.get("/pm-hub/tenants/",{headers:h}),api.get("/pm-hub/leases/",{headers:h})]);
  if(mounted){setWorkspace(w);setTenants(list(t.data));setLeases(list(l.data));}
 }catch(e){if(mounted)setError(e?.response?.data?.detail||"Unable to load PM records.");}})();return()=>{mounted=false;};},[]);
 useEffect(()=>{
  setPreview(null);setConfirmed(false);
  if(isRoxana){setMonths(example.map(x=>({...x})));setCurrent({contract_rent:"1485",tenant_portion:"1108",housing_portion:"377"});}
  else if(tenant){setMonths([emptyMonth()]);setCurrent({contract_rent:String(lease?.monthly_rent||""),tenant_portion:String(lease?.tenant_portion||""),housing_portion:String(lease?.assistance_portion||"")});}
  else setMonths([]);
 },[tenantId,tenant?.property_name,lease?.id]);
 const invalid=useMemo(()=>months.some(r=>!/^\d{4}-(0[1-9]|1[0-2])$/.test(r.month)||!r.contract_rent||r.tenant_portion===""||r.housing_portion===""||
  Number(r.tenant_portion)+Number(r.housing_portion)>Number(r.contract_rent)||
  Number(r.contract_rent)-Number(r.tenant_portion)-Number(r.housing_portion)>0&&!r.exclusion_reason.trim()),[months]);
 function edit(i,key,value){setMonths(s=>s.map((m,j)=>j===i?{...m,[key]:value}:m));setPreview(null);setConfirmed(false);}
 async function runPreview(){
  if(!tenantId||!months.length||invalid)return;
  setError("");setNotice("");setBusy(true);setPreview(null);setConfirmed(false);
  try{
   const result=[];
   for(const row of months){
    const r=await api.post(`/pm-hub/billing/tenants/${tenantId}/reconcile-month/`,{...row,source_note:note},{headers});
    result.push(r.data);
   }
   setPreview(result);
   setNotice("Preview completed. No rent, payment, or late-fee entry has changed.");
  }catch(e){setError(e?.response?.data?.detail||"Monthly preview failed.");}
  finally{setBusy(false);}
 }
 async function apply(){
  if(!confirmed||!preview||invalid||!lease||busy)return;
  setBusy(true);setError("");setNotice("");
  let done=0;
  try{
   for(const row of months){
    await api.post(`/pm-hub/billing/tenants/${tenantId}/reconcile-month/`,{
     ...row,source_note:note,apply:true,confirmed:true
    },{headers});
    done+=1;
   }
   // Latest certified split is separate from the historic month-by-month allocation.
   if(Number(current.contract_rent)!==Number(current.tenant_portion)+Number(current.housing_portion))
     throw new Error("Current tenant and housing shares must equal contract rent.");
   await api.patch(`/pm-hub/leases/${lease.id}/`,{
     monthly_rent:current.contract_rent,tenant_portion:current.tenant_portion,assistance_portion:current.housing_portion
   },{headers});
   await api.patch(`/pm-hub/tenants/${tenantId}/`,{monthly_rent:current.contract_rent},{headers});
   await api.patch(`/pm-hub/billing/tenants/${tenantId}/`,{
     billing_start_date:months[0].month+"-01",charge_security_deposit:false
   },{headers});
   setNotice(`Reconciled ${done} month(s). Contract rent updated. Payments and late fees were preserved. Review security deposit and other credits separately.`);
   setPreview(null);setConfirmed(false);
  }catch(e){
   setError(`Processed ${done} of ${months.length} monthly entries. ${e?.response?.data?.detail||e.message||"Update stopped"}. You can preview and retry safely; existing monthly corrections are included in the next preview.`);
   setPreview(null);setConfirmed(false);
  }finally{setBusy(false);}
 }
 return <PMShell><main className="mx-auto max-w-5xl space-y-3 px-3 py-3 pb-[calc(8rem+env(safe-area-inset-bottom))] sm:px-5">
  <div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.16em] text-cyan-300">Property finance</div><h1 className="text-xl font-black">Monthly Rent Correction</h1><p className="mt-1 text-xs text-slate-400">Check each payer's share, preview the adjustment, then post only the correction.</p></div><button type="button" onClick={()=>nav("/pm/payments"+(tenantId?"?tenant="+tenantId:""))} className="min-h-9 shrink-0 rounded-lg border border-slate-700 px-3 text-xs">Ledger</button></div>
  {error?<p role="alert" className="rounded-lg border border-rose-400/35 bg-rose-500/10 p-3 text-xs text-rose-100">{error}</p>:null}
  {notice?<p role="status" className="rounded-lg border border-emerald-400/35 bg-emerald-500/10 p-3 text-xs text-emerald-100">{notice}</p>:null}
  <Card title="Resident and agreement" info="Your existing payment receipts are preserved exactly as entered, including the original payment date and method.">
    <label className="text-[11px] font-bold text-slate-300">Resident<select className={input+" mt-1"} value={tenantId} onChange={e=>{setTenantId(e.target.value);nav("/pm/rent-correction?tenant="+e.target.value);}}><option value="">Choose resident</option>{tenants.map(t=><option key={t.id} value={t.id}>{t.first_name} {t.last_name} · {t.property_name||"No property"}</option>)}</select></label>
    {lease?<p className="mt-2 text-[11px] text-slate-400">Current saved lease: {usd(lease.monthly_rent)} · Tenant {usd(lease.tenant_portion)} · Assistance {usd(lease.assistance_portion)} · Ends {lease.end_date||"unspecified"}</p>:tenant?<p className="mt-2 text-xs text-amber-200">Connect the existing assistance lease before posting a correction.</p>:null}
    {lease?.end_date&&lease.end_date<new Date().toISOString().slice(0,10)?<p className="mt-2 text-[11px] text-amber-200">The recorded lease end date is in the past. This tool will not extend the lease; verify the actual renewal separately.</p>:null}
  </Card>
  {tenant?<><Card title="Monthly payer allocation" info="The $1,485 example is prefilled only for the documented Roxana tenancy. Adjust each month if a provider's official determination says otherwise.">
    {isRoxana?<p className="mb-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-2 text-[11px] text-cyan-100">Roxana 2026 allocation prepared: $78 assistance March–July, no August assistance, $377 in September, October assistance excluded due to abatement.</p>:null}
    <div className="space-y-2">{months.map((m,i)=><div className="rounded-xl border border-slate-700 bg-black/20 p-2.5" key={i}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
       <label className="text-[10px] text-slate-400">Month<input type="month" className={input+" mt-1"} value={m.month} onChange={e=>edit(i,"month",e.target.value)}/></label>
       <label className="text-[10px] text-slate-400">Total contract<input inputMode="decimal" className={input+" mt-1"} value={m.contract_rent} onChange={e=>edit(i,"contract_rent",e.target.value)}/></label>
       <label className="text-[10px] text-slate-400">Tenant share<input inputMode="decimal" className={input+" mt-1"} value={m.tenant_portion} onChange={e=>edit(i,"tenant_portion",e.target.value)}/></label>
       <label className="text-[10px] text-slate-400">Assistance charge<input inputMode="decimal" className={input+" mt-1"} value={m.housing_portion} onChange={e=>edit(i,"housing_portion",e.target.value)}/></label>
      </div>
      {Number(m.contract_rent)-Number(m.tenant_portion)-Number(m.housing_portion)>0?<label className="mt-2 block text-[10px] text-amber-200">Reason unbilled <input className={input+" mt-1"} value={m.exclusion_reason} onChange={e=>edit(i,"exclusion_reason",e.target.value)} placeholder="Abated / waived provider portion"/></label>:null}
      <button type="button" onClick={()=>{setMonths(x=>x.filter((_,j)=>j!==i));setPreview(null);}} className="mt-2 text-[10px] text-slate-400 underline">Remove month</button>
    </div>)}</div>
    <button type="button" onClick={()=>{setMonths(x=>[...x,emptyMonth()]);setPreview(null);setConfirmed(false);}} className="mt-2 min-h-9 rounded-lg border border-slate-700 px-3 text-xs">Add another month</button>
   </Card>
   <Card title="Current agreement for future billing" info="Set the most recently certified normal payer split, separately from the historical records. An abated payment does not change the tenant's certified share.">
    <div className="grid grid-cols-3 gap-2">{[["contract_rent","Total rent"],["tenant_portion","Tenant share"],["housing_portion","Assistance"]].map(([key,name])=><label key={key} className="text-[10px] text-slate-400">{name}<input inputMode="decimal" className={input+" mt-1"} value={current[key]} onChange={e=>{setCurrent(s=>({...s,[key]:e.target.value}));setPreview(null);setConfirmed(false);}}/></label>)}</div>
   </Card>
   <Card title="Verification and audit trail" info="Original charge rows stay visible. Corrections are new dated adjustment entries. No existing payment or $50 late fee will be edited.">
    <textarea className={input} rows={2} value={note} onChange={e=>{setNote(e.target.value);setPreview(null);setConfirmed(false);}} aria-label="Verification source"/>
    <button type="button" disabled={busy||invalid||!lease||note.trim().length<12||!months.length} onClick={runPreview} className="mt-2 min-h-11 w-full rounded-lg border border-cyan-400/35 bg-cyan-500/10 text-xs font-black text-cyan-100 disabled:opacity-40">Preview all changes · no posting</button>
    {preview?<div className="mt-3 space-y-2"><div className="text-xs font-black text-cyan-200">Monthly adjustment preview</div>
      {preview.map(m=><div key={m.month} className="grid grid-cols-3 gap-2 rounded-lg border border-slate-700 p-2 text-[11px]"><strong>{m.month}</strong><span>Tenant {usd(m.tenant_charge_adjustment)}</span><span>Assistance {usd(m.housing_charge_adjustment)}</span><div className="col-span-3 text-[10px] text-slate-400">Existing receipts {usd(m.posted_tenant_payments_in_month)} · Existing late fees {usd(m.preserved_late_fees)}</div></div>)}
      <div className="rounded-lg border border-amber-400/25 bg-amber-500/5 p-2 text-[11px] text-amber-100">Separate review: a historic $1,500 security-deposit reversal is not a verified rent payment or new rent credit. Confirm the $1,485 deposit transfer and any application independently.</div>
      <label className="flex items-start gap-2 text-[11px] text-slate-300"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I reviewed these periods, current lease values, and source notes. Post only the shown rent adjustments.</label>
      <button type="button" disabled={!confirmed||busy||Number(current.contract_rent)!==Number(current.tenant_portion)+Number(current.housing_portion)} onClick={apply} className="min-h-11 w-full rounded-lg bg-cyan-400 text-sm font-black text-slate-950 disabled:opacity-40">{busy?"Applying…":"Apply verified corrections"}</button>
    </div>:null}
   </Card>
  </>:null}
 </main></PMShell>;
}
