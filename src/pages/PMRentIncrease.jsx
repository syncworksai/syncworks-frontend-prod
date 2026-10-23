import React,{useEffect,useMemo,useState} from "react";
import {useNavigate,useSearchParams} from "react-router-dom";
import api from "../api/client";
import PMShell from "../components/pm/PMShell";

const list=x=>Array.isArray(x?.results)?x.results:Array.isArray(x)?x:[];
const fmt=x=>x?new Date(x+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"Not set";
const input="min-h-10 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white focus:border-cyan-400 outline-none";
const states=["DRAFT","READY_FOR_SIGNATURE","SIGNED","SUBMITTED","UNDER_REVIEW","APPROVED","DENIED","WITHDRAWN","EFFECTIVE"];
const Field=({label,children})=><label className="block min-w-0"><span className="mb-1 block text-[11px] font-semibold text-slate-300">{label}</span>{children}</label>;

export default function PMRentIncrease(){
 const nav=useNavigate();const [params,setParams]=useSearchParams();
 const [ws,setWs]=useState(null);const [properties,setProperties]=useState([]);
 const [tenants,setTenants]=useState([]);const [leases,setLeases]=useState([]);
 const [documents,setDocuments]=useState([]);
 const [plans,setPlans]=useState([]);const [selected,setSelected]=useState(null);
 const [propertyId,setPropertyId]=useState(params.get("property")||"");
 const [form,setForm]=useState({tenant_id:"",current_rent:"",requested_rent:"",proposed_effective_date:"",notice_date:"",hap_anniversary_date:"",administrator:"",notes:""});
 const [editing,setEditing]=useState({});const [busy,setBusy]=useState(false);
 const [original,setOriginal]=useState({amount:"",effective_date:"",source_note:"",source_document_id:""});
 const [originalPreview,setOriginalPreview]=useState(null);
 const [originalAgreed,setOriginalAgreed]=useState(false);
 const [error,setError]=useState("");const [notice,setNotice]=useState("");
 useEffect(()=>{let live=true;(async()=>{try{
 const w=(await api.get("/pm-hub/workspaces/current/")).data;
 const h={"X-PM-Workspace-ID":String(w.id)};
 const [p,t,l]=await Promise.all([api.get("/pm-hub/properties/",{headers:h}),api.get("/pm-hub/tenants/",{headers:h}),api.get("/pm-hub/leases/",{headers:h})]);
 if(live){setWs(w);setProperties(list(p.data));setTenants(list(t.data));setLeases(list(l.data));}
 }catch(e){if(live)setError(e?.response?.data?.detail||"Unable to load properties.");}})();return()=>{live=false;};},[]);
 useEffect(()=>{if(!propertyId||!ws)return;
 let live=true;const h={"X-PM-Workspace-ID":String(ws.id)};
 Promise.all([api.get(`/pm-hub/properties/${propertyId}/rent-changes/`,{headers:h}),api.get("/pm-hub/property-documents/",{headers:h,params:{property_id:propertyId}})])
 .then(([p,d])=>{if(live){setPlans(p.data.plans||[]);setDocuments(list(d.data));}})
 .catch(e=>{if(live)setError(e?.response?.data?.detail||"Unable to load rent change records.");});
 return()=>{live=false;};
 },[ws?.id,propertyId]);
 const matching=useMemo(()=>tenants.filter(t=>{
 const prop=properties.find(p=>String(p.id)===String(propertyId));
 return prop && String(t.property_name||"").trim().toLowerCase()===String(prop.name||"").trim().toLowerCase();
 }),[tenants,properties,propertyId]);
 const tenant=tenants.find(t=>String(t.id)===String(form.tenant_id));
 useEffect(()=>{if(!tenant)return;
 const lease=leases.filter(l=>String(l.tenant)===String(tenant.id)).sort((a,b)=>String(b.start_date).localeCompare(String(a.start_date)))[0];
 setForm(f=>({...f,current_rent:String(lease?.monthly_rent||tenant.monthly_rent||""),administrator:String(lease?.housing_authority||"")}));
 setOriginal({amount:String(lease?.monthly_rent||tenant.monthly_rent||""),effective_date:lease?.start_date||tenant.lease_start||"",source_note:"",source_document_id:""});
 setOriginalPreview(null);setOriginalAgreed(false);
 },[form.tenant_id,leases,tenants]);
 async function auditOriginal(apply=false){
   if(!form.tenant_id)return;
   if(apply && (!originalPreview||!originalAgreed))return;
   setBusy(true);setError("");setNotice("");
   try{
     const r=await api.post(`/pm-hub/billing/tenants/${form.tenant_id}/original-lease-rent/`,{
       contract_rent:original.amount,effective_date:original.effective_date,
       source_note:original.source_note,source_document_id:original.source_document_id||null,
       apply,confirmed:apply&&originalAgreed,
     },{headers:{"X-PM-Workspace-ID":String(ws.id)}});
     if(apply){
       setOriginalPreview(null);setOriginalAgreed(false);
       setNotice("Original lease amount updated. No historical charge or receipt was changed. Review monthly differences before fixing posted charges.");
       const h={"X-PM-Workspace-ID":String(ws.id)};
       const lr=await api.get("/pm-hub/leases/",{headers:h});
       setLeases(list(lr.data));
     }else setOriginalPreview(r.data.preview);
   }catch(e){setError(e?.response?.data?.detail||"Unable to review original lease amount.");}
   finally{setBusy(false);}
 }
 const patch=(field,value)=>setForm(p=>({...p,[field]:value}));
 const patchEdit=(field,value)=>setEditing(p=>({...p,[field]:value}));
 async function load(){
 if(!ws||!propertyId)return;
 const r=await api.get(`/pm-hub/properties/${propertyId}/rent-changes/`,{headers:{"X-PM-Workspace-ID":String(ws.id)}});
 setPlans(r.data.plans||[]);
 }
 async function create(e){
 e.preventDefault();setError("");setNotice("");setBusy(true);
 try{await api.post(`/pm-hub/properties/${propertyId}/rent-changes/`,form,{headers:{"X-PM-Workspace-ID":String(ws.id)}});
 await load();setNotice("Proposal saved. No existing rent, lease or ledger amount changed.");
 }catch(e){setError(e?.response?.data?.detail||"Could not save proposal.");}
 finally{setBusy(false);}
 }
 function openPlan(p){setSelected(p);setEditing({...p});}
 async function updatePlan(){
 if(!selected)return;
 setBusy(true);setError("");setNotice("");
 const fields=["status","notice_date","hap_anniversary_date","approved_rent","approval_date","approval_document_id","administrator_approval_status","tenant_signature_status","owner_signature_status","notes"];
 try{
 const payload=Object.fromEntries(fields.filter(k=>editing[k]!==undefined).map(k=>[k,editing[k]]));
 await api.patch(`/pm-hub/properties/${propertyId}/rent-changes/${selected.id}/`,payload,{headers:{"X-PM-Workspace-ID":String(ws.id)}});
 await load();setSelected(null);setNotice("Approval history updated. Future rent charges remain unchanged until separately verified.");
 }catch(e){setError(e?.response?.data?.detail||"Could not update status.");}
 finally{setBusy(false);}
 }
 return <PMShell><main className="mx-auto max-w-5xl space-y-3 px-3 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-3 text-slate-100 sm:px-6">
  <div className="flex items-center justify-between gap-2"><div><div className="text-[10px] font-bold uppercase tracking-[.18em] text-cyan-300">Lease lifecycle</div><h1 className="text-xl font-black">Rent increase planner</h1><p className="mt-1 text-xs text-slate-400">Prepare, sign, submit and track approval. Never change a rent charge without confirmation.</p></div><button type="button" onClick={()=>nav("/pm")} className="min-h-9 rounded-lg border border-slate-700 px-3 text-xs">Back</button></div>
  {error?<div role="alert" className="rounded-lg border border-rose-400/30 bg-rose-500/5 p-3 text-xs text-rose-200">{error}</div>:null}
  {notice?<div role="status" className="rounded-lg border border-emerald-400/30 bg-emerald-500/5 p-3 text-xs text-emerald-100">{notice}</div>:null}
  <section className="rounded-xl border border-cyan-500/20 bg-[#07111f] p-3">
    <Field label="Property"><select className={input} value={propertyId} onChange={e=>{setPropertyId(e.target.value);setParams(e.target.value?{property:e.target.value}:{});setSelected(null);setPlans([]);}}><option value="">Choose a property</option>{properties.map(p=><option value={p.id} key={p.id}>{p.name} — {p.address}</option>)}</select></Field>
  </section>
  {propertyId?<><section className="rounded-xl border border-amber-400/25 bg-[#07111f] p-3 sm:p-5">
    <h2 className="text-sm font-black text-amber-100">Original contract rent audit</h2>
    <p className="mt-1 text-xs leading-5 text-slate-400">Correct only the ORIGINAL signed lease amount. This does not backdate new rent increases, change third-party shares, or overwrite tenant payments.</p>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <Field label="Tenant"><select className={input} value={form.tenant_id} onChange={e=>patch("tenant_id",e.target.value)}><option value="">Choose existing tenant</option>{(matching.length?matching:tenants).map(t=><option key={t.id} value={t.id}>{t.full_name||[t.first_name,t.last_name].join(" ")} · {t.property_name||"unlinked"}</option>)}</select></Field>
      <Field label="Original contract rent"><input className={input} inputMode="decimal" value={original.amount} onChange={e=>{setOriginal(o=>({...o,amount:e.target.value}));setOriginalPreview(null);}}/></Field>
      <Field label="Original signed lease start"><input className={input} type="date" value={original.effective_date} onChange={e=>{setOriginal(o=>({...o,effective_date:e.target.value}));setOriginalPreview(null);}}/></Field>
      <Field label="Supporting signed lease"><select className={input} value={original.source_document_id} onChange={e=>{setOriginal(o=>({...o,source_document_id:e.target.value}));setOriginalPreview(null);}}><option value="">Specify in note if document not uploaded</option>{documents.map(d=><option value={d.id} key={d.id}>{d.title}</option>)}</select></Field>
    </div>
    <Field label="Lease evidence / reason for correction"><textarea rows={2} className={input+" mt-2"} value={original.source_note} onChange={e=>{setOriginal(o=>({...o,source_note:e.target.value}));setOriginalPreview(null);}} placeholder="Original signed lease establishes rent of $... effective ..." /></Field>
    <button type="button" disabled={!form.tenant_id||busy} onClick={()=>auditOriginal(false)} className="mt-3 min-h-10 w-full rounded-xl border border-amber-400/35 px-3 text-xs font-black text-amber-100 disabled:opacity-40">Preview original rent correction</button>
    {originalPreview?<div className="mt-3 rounded-lg border border-amber-400/25 bg-amber-500/5 p-3">
      <div className="text-xs font-bold text-amber-100">Current original: ${originalPreview.old_original_rent} → proposed: ${originalPreview.proposed_original_rent}</div>
      <p className="mt-1 text-[11px] text-slate-400">Existing rent entries are not rewritten. Discrepancies below require a separate month-by-month review.</p>
      <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">{(originalPreview.monthly_review||[]).map(m=><div key={m.month} className="flex items-center justify-between gap-2 border-b border-slate-700/50 py-1 text-[11px]"><span>{m.month}: {m.status.replaceAll("_"," ")}</span><span>Posted ${m.posted_net_rent_charges} · difference ${m.variance}</span></div>)}</div>
      <label className="mt-3 flex items-start gap-2 text-xs"><input type="checkbox" checked={originalAgreed} onChange={e=>setOriginalAgreed(e.target.checked)} /><span>I verified this is the ORIGINAL signed lease rent and date, not a rent increase. I understand that posted rent charges and payment receipts remain unchanged.</span></label>
      <button type="button" disabled={!originalAgreed||busy} onClick={()=>auditOriginal(true)} className="mt-3 min-h-11 w-full rounded-lg bg-cyan-400 px-3 text-xs font-black text-slate-950 disabled:opacity-40">Confirm original lease rent</button>
    </div>:null}
  </section>
  <section className="rounded-xl border border-cyan-500/20 bg-[#07111f] p-3 sm:p-5">
    <h2 className="text-sm font-black">New rent proposal</h2><p className="mt-1 text-xs text-slate-400">The original lease and assistance contract determine allowable timing. Voucher changes generally require administrator review.</p>
    <form onSubmit={create} className="mt-3 space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Resident"><select required className={input} value={form.tenant_id} onChange={e=>patch("tenant_id",e.target.value)}><option value="">Choose existing tenant</option>{(matching.length?matching:tenants).map(t=><option key={t.id} value={t.id}>{t.full_name||[t.first_name,t.last_name].join(" ")} · {t.property_name||"unlinked"}</option>)}</select></Field>
        <Field label="Existing monthly contract rent"><input required className={input} inputMode="decimal" value={form.current_rent} onChange={e=>patch("current_rent",e.target.value)} /></Field>
        <Field label="Proposed monthly rent"><input required className={input} inputMode="decimal" value={form.requested_rent} onChange={e=>patch("requested_rent",e.target.value)} /></Field>
        <Field label="Proposed effective date"><input required type="date" className={input} value={form.proposed_effective_date} onChange={e=>patch("proposed_effective_date",e.target.value)}/></Field>
        <Field label="Actual notice sent to administrator"><input type="date" className={input} value={form.notice_date} onChange={e=>patch("notice_date",e.target.value)}/></Field>
        <Field label="Assistance contract anniversary (if applicable)"><input type="date" className={input} value={form.hap_anniversary_date} onChange={e=>patch("hap_anniversary_date",e.target.value)}/></Field>
      </div>
      <Field label="Administrator name, if applicable"><input className={input} value={form.administrator} onChange={e=>patch("administrator",e.target.value)} /></Field>
      <Field label="Supporting basis / comparative rents"><textarea rows={2} className={input} value={form.notes} onChange={e=>patch("notes",e.target.value)}/></Field>
      <button type="submit" disabled={!form.tenant_id||busy} className="min-h-10 w-full rounded-xl bg-cyan-400 px-3 text-xs font-black text-slate-950 disabled:opacity-40">{busy?"Saving…":"Create proposal (no rent change)"}</button>
    </form>
    <div className="mt-3 text-[11px] text-slate-400">Useful starting points: <a className="text-cyan-200 underline" href="https://www.hud.gov/program_offices/public_indian_housing/programs/hcv/landlord/forms" target="_blank" rel="noreferrer">HUD landlord forms</a>. Check your specific administrator's current instructions.</div>
  </section>
  <section className="space-y-2 rounded-xl border border-cyan-500/20 bg-[#07111f] p-3">
    <h2 className="text-sm font-black">Proposals & deadlines</h2>{!plans.length?<p className="text-xs text-slate-400">No proposals yet.</p>:null}
    {plans.map(p=><article className="rounded-xl border border-slate-700 bg-black/15 p-3" key={p.id}>
      <div className="flex items-center justify-between gap-2"><div className="text-sm font-black">{p.current_rent} → {p.requested_rent} monthly</div><span className="text-[10px] font-bold text-cyan-200">{p.status.replaceAll("_"," ")}</span></div>
      <div className="mt-1 text-[11px] text-slate-400">Proposed effective {fmt(p.proposed_effective_date)} · Tenant #{p.tenant_id}</div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg border border-slate-700 p-2"><div className="text-[10px] text-slate-500">Start preparing</div>{fmt(p.schedule?.recommended_prepare_by)}</div><div className="rounded-lg border border-slate-700 p-2"><div className="text-[10px] text-slate-500">Administrator notice by</div>{fmt(p.schedule?.administrator_request_deadline)}</div></div>
      {p.schedule?.warnings?.length?<p className="mt-2 text-[11px] leading-5 text-amber-200">{p.schedule.warnings.join(" ")}</p>:null}
      <button type="button" onClick={()=>openPlan(p)} className="mt-2 min-h-9 w-full rounded-lg border border-cyan-400/35 text-xs font-bold text-cyan-100">Review / update approval steps</button>
    </article>)}
  </section>
  {selected?<section className="rounded-xl border border-fuchsia-500/30 bg-[#07111f] p-3"><h2 className="text-sm font-black">Approval record</h2><p className="mt-1 text-[11px] text-slate-400">Record external signatures and approvals after receiving evidence. This is not an e-signature service.</p>
   <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <Field label="Workflow status"><select className={input} value={editing.status||"DRAFT"} onChange={e=>patchEdit("status",e.target.value)}>{states.map(x=><option value={x} key={x}>{x.replaceAll("_"," ")}</option>)}</select></Field>
      <Field label="Administrator decision"><select className={input} value={editing.administrator_approval_status||"UNKNOWN"} onChange={e=>patchEdit("administrator_approval_status",e.target.value)}>{["UNKNOWN","PENDING","APPROVED","DENIED"].map(x=><option key={x}>{x}</option>)}</select></Field>
      {["tenant_signature_status","owner_signature_status"].map(k=><Field key={k} label={k.replaceAll("_"," ")}><select className={input} value={editing[k]||"NOT_REQUESTED"} onChange={e=>patchEdit(k,e.target.value)}>{["NOT_REQUESTED","PREPARED","SENT_EXTERNALLY","SIGNED_VERIFIED"].map(x=><option key={x}>{x.replaceAll("_"," ")}</option>)}</select></Field>)}
      <Field label="Approval date"><input type="date" className={input} value={editing.approval_date||""} onChange={e=>patchEdit("approval_date",e.target.value)}/></Field>
      <Field label="Approved monthly rent"><input inputMode="decimal" className={input} value={editing.approved_rent||""} onChange={e=>patchEdit("approved_rent",e.target.value)}/></Field>
      <Field label="Approval document"><select className={input} value={editing.approval_document_id||""} onChange={e=>patchEdit("approval_document_id",e.target.value||null)}><option value="">Select uploaded document</option>{documents.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</select></Field>
   </div>
   <div className="mt-3 flex gap-2"><button type="button" onClick={updatePlan} disabled={busy} className="min-h-10 flex-1 rounded-xl bg-cyan-400 px-3 text-xs font-black text-slate-950 disabled:opacity-50">Save review</button><button type="button" className="min-h-10 rounded-xl border border-slate-600 px-3 text-xs" onClick={()=>setSelected(null)}>Close</button></div>
  </section>:null}
  </>:null}
 </main></PMShell>;
}
