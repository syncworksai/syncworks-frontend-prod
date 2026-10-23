import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/client";
import PMShell from "../components/pm/PMShell";

const list = (d) => Array.isArray(d?.results) ? d.results : Array.isArray(d) ? d : [];
const input = "min-h-10 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400";
const money = (n) => Number(n || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
const caseKinds = [["NEW_MANAGEMENT","Take over management"],["SELF_MANAGE","Manage my own property"],["PURCHASE","Recently purchased property"],["INITIAL_SETUP","New property / first tenant"],["OTHER","Other transition"]];
const fundingKinds = [["NONE","No rental assistance"],["HOUSING_VOUCHER","Housing voucher / Section 8"],["OTHER_ASSISTANCE","Another rent-assistance program"]];
const evidenceStates = [["UNKNOWN","Unknown"],["REPORTED","Reported"],["DOCUMENTED","Documented"],["DISPUTED","Disputed"],["RECONCILED","Reconciled"]];
const balanceKinds = [["TENANT_AR","Tenant outstanding rent / fees"],["ASSISTANCE_AR","Assistance administrator receivable"],["FORMER_MANAGER_FUNDS","Funds held by prior manager"],["SECURITY_DEPOSIT","Security deposit / escrow"],["PREPAID_RENT","Prepaid rent"],["REPAIR_ADVANCE","Repair advance balance"],["OTHER","Other"]];
const taskStates = [["NOT_STARTED","Not started"],["REQUESTED","Requested"],["RECEIVED","Received"],["VERIFIED","Verified"],["NOT_APPLICABLE","Not applicable"]];
const segments = [["setup","Setup"],["people","People"],["documents","Docs"],["balances","Money"],["rent","Rent"],["review","Review"]];
const channelKinds = [["DIRECT","Direct / traditional lease"],["FURNISHED_FINDER","Furnished Finder / mid-term"],["CORPORATE","Corporate housing"],["OTHER","Other source"]];
const managerKinds = [["OWNER_MANAGED","Owner managed"],["THIRD_PARTY_MANAGER","Managed for an owner"]];
const errorMessage = (error) => error?.response?.data?.detail || "Could not save these details.";
const initialBalance = () => ({id: String(Date.now()) + String(Math.random()).slice(2,6),type:"TENANT_AR",amount:"",period:"",counterparty:"",evidence_status:"UNKNOWN",source_note:""});

function Field({ label, hint, children }) {
  return <label className="block min-w-0"><span className="mb-1 block text-[11px] font-bold text-slate-300">{label}</span>{children}{hint ? <span className="mt-1 block text-[10px] leading-4 text-slate-500">{hint}</span> : null}</label>;
}
function Panel({title,description,children}) {
  return <section className="rounded-xl border border-cyan-500/15 bg-[#07111f] p-3 sm:p-5"><h2 className="text-base font-black text-white">{title}</h2>{description ? <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p> : null}<div className="mt-3">{children}</div></section>;
}
function LinkOut({href,children}){return <a href={href} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-cyan-200 underline underline-offset-2">{children}</a>;}

function PMHandoffWizardContent(){
  const navigate=useNavigate();
  const [params,setParams]=useSearchParams();
  const propertyId=String(params.get("property") || "");
  const [workspace,setWorkspace]=useState(null);
  const [properties,setProperties]=useState([]);
  const [handoff,setHandoff]=useState(null);
  const [checklist,setChecklist]=useState([]);
  const [progress,setProgress]=useState({completed:0,total:0});
  const [documents,setDocuments]=useState([]);
  const [tenants,setTenants]=useState([]);
  const [owners,setOwners]=useState([]);
  const [tenantForm,setTenantForm]=useState({first_name:"",last_name:"",email:"",phone:""});
  const [ownerForm,setOwnerForm]=useState({name:"",email:"",phone:""});
  const [intakeDocumentId,setIntakeDocumentId]=useState("");
  const [intakeDraft,setIntakeDraft]=useState(null);
  const [intakeFields,setIntakeFields]=useState({});
  const [stage,setStage]=useState("setup");
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [draft,setDraft]=useState(null);
  const [financial,setFinancial]=useState([]);
  const [taskDrafts,setTaskDrafts]=useState({});

  useEffect(()=>{
    let active=true;
    setLoading(true);
    (async()=>{
      try{
        const w=(await api.get("/pm-hub/workspaces/current/")).data;
        const h={"X-PM-Workspace-ID":String(w.id)};
        const r=await api.get("/pm-hub/properties/",{headers:h});
        if(active){setWorkspace(w);setProperties(list(r.data));}
      }catch(e){if(active)setError(errorMessage(e));}
      finally{if(active)setLoading(false);}
    })();
    return ()=>{active=false;};
  },[]);

  useEffect(()=>{
    if(!propertyId || !workspace?.id){setHandoff(null);setDocuments([]);return;}
    let active=true;
    setLoading(true);setNotice("");setError("");
    const h={"X-PM-Workspace-ID":String(workspace.id)};
    Promise.all([
      api.get(`/pm-hub/properties/${propertyId}/handoff/`,{headers:h}),
      api.get("/pm-hub/property-documents/",{headers:h,params:{property_id:propertyId}}),
      api.get("/pm-hub/tenants/",{headers:h}),
      api.get("/pm-hub/property-owners/",{headers:h,params:{property_id:propertyId}}),
    ]).then(([r,d,t,o])=>{
      if(!active)return;
      setHandoff(r.data.handoff);setDraft(r.data.handoff);
      setFinancial(r.data.handoff.opening_balances || []);
      setTaskDrafts(r.data.handoff.tasks || {});
      setChecklist(r.data.checklist || []);setProgress(r.data.progress || {});
      setDocuments(list(d.data));
      setTenants(list(t.data));setOwners(list(o.data));
    }).catch((e)=>{if(active)setError(errorMessage(e));}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[propertyId,workspace?.id]);

  const property=properties.find(x=>String(x.id)===propertyId);
  const headers=workspace?.id?{"X-PM-Workspace-ID":String(workspace.id)}:{};
  const isAssisted=draft?.assistance?.type && draft.assistance.type!=="NONE";
  const taskGroups=useMemo(()=>{
    const base=checklist.filter(t=>!t.key.startsWith("provider_"));
    const assisted=checklist.filter(t=>t.key.startsWith("provider_"));
    return {base,assisted};
  },[checklist]);

  function chooseProperty(value){
    setParams(value?{property:String(value)}:{});setStage("setup");
  }
  function update(path,key,value){
    setDraft(current=>({...current,[path]:{...current[path],[key]:value}}));
  }
  async function patch(updates,success="Saved."){
    if(!workspace?.id || !propertyId) return false;
    setBusy(true);setError("");setNotice("");
    try{
      const r=await api.patch(`/pm-hub/properties/${propertyId}/handoff/`,updates,{headers});
      setHandoff(r.data.handoff);setDraft(r.data.handoff);
      setFinancial(r.data.handoff.opening_balances || []);
      setTaskDrafts(r.data.handoff.tasks || {});
      setChecklist(r.data.checklist);setProgress(r.data.progress);
      setNotice(success);
      return true;
    }catch(e){setError(errorMessage(e));return false;}
    finally{setBusy(false);}
  }
  async function saveSetup(){
    const payload={
      case_kind:draft.case_kind,effective_date:draft.effective_date,
      rental_channel:draft.rental_channel,management_model:draft.management_model,
      former_manager:draft.former_manager,assistance:draft.assistance,notes:draft.notes,
    };
    const done=await patch(payload,"Setup saved.");
    if(done)setStage("people");
  }
  function taskSet(key,field,value){
    setTaskDrafts(current=>({...current,[key]:{status:"NOT_STARTED",note:"",document_id:null,...current[key],[field]:value}}));
  }
  function saveTask(key){
    const task=taskDrafts[key] || {status:"NOT_STARTED",note:"",document_id:null};
    return patch({tasks:{[key]:task}},"Checklist updated.");
  }
  function addBalance(){setFinancial(rows=>[...rows,initialBalance()]);}
  function editBalance(id,key,value){setFinancial(rows=>rows.map(r=>r.id===id?{...r,[key]:value}:r));}
  function removeBalance(id){setFinancial(rows=>rows.filter(r=>r.id!==id));}
  async function reloadPeople(){
    const [t,o]=await Promise.all([
      api.get("/pm-hub/tenants/",{headers}),
      api.get("/pm-hub/property-owners/",{headers,params:{property_id:propertyId}}),
    ]);
    setTenants(list(t.data));setOwners(list(o.data));
  }
  async function addTenant(e){
    e.preventDefault();if(!tenantForm.first_name.trim()||!tenantForm.email.trim())return;
    setBusy(true);setError("");setNotice("");
    const existing=tenants.find(t=>String(t.email).toLowerCase()===tenantForm.email.trim().toLowerCase());
    if(existing){setError("A tenant with this email already exists. Use the existing record instead.");setBusy(false);return;}
    try{
      await api.post("/pm-hub/tenants/",{...tenantForm,property_name:property?.name||""},{headers});
      await reloadPeople();setTenantForm({first_name:"",last_name:"",email:"",phone:""});
      setNotice("Tenant record created. No portal invitation has been sent.");
    }catch(e){setError(errorMessage(e));}finally{setBusy(false);}
  }
  async function inviteTenant(tenant){
    if(!window.confirm(`Send a tenant portal onboarding invitation to ${tenant.email}?`))return;
    setBusy(true);setError("");setNotice("");
    try{
      await api.post(`/pm-hub/tenants/${tenant.id}/send-invite/`,{mode:"TENANT_ONBOARDING"},{headers});
      await reloadPeople();setNotice("Onboarding invitation sent to the existing tenant email.");
    }catch(e){setError(errorMessage(e));}finally{setBusy(false);}
  }
  async function addOwner(e){
    e.preventDefault();if(!ownerForm.name.trim())return;
    setBusy(true);setError("");setNotice("");
    try{
      await api.post("/pm-hub/property-owners/",{...ownerForm,owner_type:"INDIVIDUAL",properties:[Number(propertyId)]},{headers});
      await reloadPeople();setOwnerForm({name:"",email:"",phone:""});
      setNotice("Property owner record created. Portal invitations are not sent automatically.");
    }catch(e){setError(errorMessage(e));}finally{setBusy(false);}
  }
  async function extractDocument(){
    if(!intakeDocumentId)return;
    setBusy(true);setError("");setNotice("");setIntakeDraft(null);
    try{
      const r=await api.post(`/pm-hub/properties/${propertyId}/documents/${intakeDocumentId}/intake/`,{}, {headers});
      setIntakeDraft(r.data);setIntakeFields(Object.fromEntries(Object.entries(r.data.suggestions||{}).map(([k,v])=>[k,v.value])));
      setNotice("Document read. Review every suggested value before saving.");
    }catch(e){setError(errorMessage(e));}finally{setBusy(false);}
  }
  async function confirmExtracted(){
    if(!intakeDocumentId || !intakeDraft)return;
    setBusy(true);setError("");
    try{
      await api.patch(`/pm-hub/properties/${propertyId}/documents/${intakeDocumentId}/intake/`,{verified_fields:intakeFields},{headers});
      setNotice("Reviewed fields attached to the document. Original tenant, lease and financial ledgers are unchanged.");
      setIntakeDraft(null);
    }catch(e){setError(errorMessage(e));}finally{setBusy(false);}
  }
  async function saveBalances(){
    const valid=financial.filter(x=>String(x.amount).trim()!=="");
    const ok=await patch({opening_balances:valid},"Opening-balance evidence saved. No rent or payment ledger changes.");
    if(ok)setStage("review");
  }
  const outstanding=(draft?.opening_balances || []).filter(r=>["UNKNOWN","REPORTED","DISPUTED"].includes(r.evidence_status));

  return <main className="mx-auto max-w-5xl space-y-3 px-3 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-3 text-slate-100 sm:px-6">
    <div className="flex items-start justify-between gap-3">
      <div><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-300">Property management</div><h1 className="mt-1 text-xl font-black sm:text-2xl">Property setup & handoff</h1><p className="mt-1 text-xs text-slate-400">One guided takeover for new managers, owners and existing tenancies.</p></div>
      <button type="button" onClick={()=>navigate("/pm")} className="rounded-lg border border-slate-600 px-3 py-2 text-xs">Dashboard</button>
    </div>
    {error?<div role="alert" className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-3 text-xs text-rose-100">{error}</div>:null}
    {notice?<div role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-xs text-emerald-100">{notice}</div>:null}
    <Panel title="Select a property" description="Select an existing record first to avoid duplicates, or create a new property once.">
      <div className="flex flex-col gap-2 sm:flex-row">
        <select aria-label="Select property for handoff" className={input+" sm:flex-1"} value={propertyId} onChange={e=>chooseProperty(e.target.value)}>
          <option value="">Choose a property</option>{properties.map(p=><option key={p.id} value={p.id}>{p.name} — {p.address}</option>)}
        </select>
        <button type="button" className="min-h-10 rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-3 text-xs font-bold text-cyan-100" onClick={()=>navigate("/pm/properties/new?next=handoff")}>+ New property</button>
      </div>
    </Panel>
    {loading?<p className="py-6 text-center text-sm text-slate-400">Loading property handoff…</p>:null}
    {!propertyId && !loading?<Panel title="Start with the property" description="Choose an existing property above. If a tenant exists but the property is not listed, review the tenant's property link before adding another record.">
      <div className="flex flex-wrap gap-2"><button type="button" onClick={()=>navigate("/pm/tenants")} className="rounded-lg border border-slate-600 px-3 py-2 text-xs">Check tenants</button><button type="button" onClick={()=>navigate("/pm/properties/new?next=handoff")} className="rounded-lg bg-cyan-400 px-3 py-2 text-xs font-black text-slate-950">Add property</button></div>
    </Panel>:null}
    {propertyId && draft && !loading?<>
      <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-950/60 p-2.5"><div className="min-w-0"><div className="truncate text-xs font-black">{property?.name||"Property"} · {property?.state||""}</div><p className="text-[10px] text-slate-400">{progress.completed}/{progress.total} checklist steps reviewed · {draft.status.replaceAll("_"," ").toLowerCase()}</p></div><div className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-slate-700"><div className="h-full bg-cyan-400" style={{width:`${progress.total?progress.completed/progress.total*100:0}%`}}/></div></div>
      <div className="flex gap-1 overflow-x-auto pb-1">{segments.map(([id,label])=><button type="button" key={id} onClick={()=>setStage(id)} className={`min-h-9 shrink-0 rounded-lg border px-3 text-[11px] font-bold ${stage===id?"border-cyan-300 bg-cyan-500/15 text-cyan-100":"border-slate-700 text-slate-400"}`}>{label}</button>)}</div>

      {stage==="setup"?<div className="space-y-3">
        <Panel title="How is this property joining?" description="This determines the transfer checklist. Moving from a property manager to self-management does not mean legal ownership changed.">
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Type of setup"><select className={input} value={draft.case_kind} onChange={e=>setDraft({...draft,case_kind:e.target.value})}>{caseKinds.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></Field>
            <Field label="Effective management / ownership date"><input type="date" className={input} value={draft.effective_date} onChange={e=>setDraft({...draft,effective_date:e.target.value})}/></Field>
            <Field label="Rental source / channel"><select className={input} value={draft.rental_channel||"DIRECT"} onChange={e=>setDraft({...draft,rental_channel:e.target.value})}>{channelKinds.map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></Field>
            <Field label="How will it be managed?"><select className={input} value={draft.management_model||"OWNER_MANAGED"} onChange={e=>setDraft({...draft,management_model:e.target.value})}>{managerKinds.map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></Field>
          </div>
        </Panel>
        <Panel title="Former manager or owner" description="Optional for clean starts. Keep this party separate from the legal property owner and rental-assistance administrator.">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Field label="Previous company / contact"><input className={input} value={draft.former_manager.name} onChange={e=>update("former_manager","name",e.target.value)} placeholder="Previous manager" /></Field>
            <Field label="Email"><input className={input} type="email" value={draft.former_manager.email} onChange={e=>update("former_manager","email",e.target.value)} /></Field>
            <Field label="Phone"><input className={input} value={draft.former_manager.phone} onChange={e=>update("former_manager","phone",e.target.value)} /></Field>
            <Field label="Notice sent"><input type="date" className={input} value={draft.former_manager.notice_sent_date} onChange={e=>update("former_manager","notice_sent_date",e.target.value)} /></Field>
          </div>
        </Panel>
        <Panel title="Rental assistance (optional)" description="Use a named local administrator; SyncWorks does not assume all voucher programs require the same paperwork.">
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Assistance type"><select className={input} value={draft.assistance.type} onChange={e=>update("assistance","type",e.target.value)}>{fundingKinds.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></Field>
            {isAssisted?<>
              <Field label="Administrator / program"><input className={input} value={draft.assistance.administrator} onChange={e=>update("assistance","administrator",e.target.value)} placeholder="Local housing authority or administrator"/></Field>
              <Field label="Official website"><input className={input} type="url" value={draft.assistance.administrator_website} onChange={e=>update("assistance","administrator_website",e.target.value)} placeholder="https://"/></Field>
              <Field label="Program contact email"><input className={input} type="email" value={draft.assistance.contact_email} onChange={e=>update("assistance","contact_email",e.target.value)} /></Field>
              <Field label="Contract status"><select className={input} value={draft.assistance.contract_status} onChange={e=>update("assistance","contract_status",e.target.value)}>{["UNKNOWN","ACTIVE","ON_HOLD","ABATED","TERMINATED","PENDING_APPROVAL"].map(s=><option key={s}>{s}</option>)}</select></Field>
              <Field label="Payee / vendor setup"><select className={input} value={draft.assistance.payee_status} onChange={e=>update("assistance","payee_status",e.target.value)}>{["UNKNOWN","NOT_STARTED","SUBMITTED","UNDER_REVIEW","APPROVED","ACTIVE"].map(s=><option key={s}>{s}</option>)}</select></Field>
            </>:null}
          </div>
          {isAssisted?<p className="mt-3 text-xs text-slate-400">Official starting point: <LinkOut href="https://www.hud.gov/helping-americans/housing-choice-vouchers-landlord-forms">HUD landlord forms and change-in-payment guidance</LinkOut>. Confirm forms directly with the local administrator.</p>:null}
        </Panel>
        <button type="button" disabled={busy} onClick={saveSetup} className="min-h-11 w-full rounded-xl bg-cyan-400 px-3 text-sm font-black text-slate-950 disabled:opacity-50">{busy?"Saving…":"Save & view checklist →"}</button>
      </div>:null}

      {stage==="people"?<div className="space-y-3">
        <Panel title="People & portal onboarding" description="Find an existing tenant or owner first. New profile records are not the same as verified identities or activated logins.">
          <div className="space-y-2">
            <h3 className="text-xs font-black text-cyan-100">Existing tenants</h3>
            {tenants.filter(t=>String(t.property_name||"").toLowerCase()===String(property?.name||"").toLowerCase()).map(t=><div key={t.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-700 p-2.5"><div className="min-w-0"><div className="truncate text-xs font-bold">{t.full_name||[t.first_name,t.last_name].join(" ")}</div><div className="text-[10px] text-slate-400">{t.email} · {t.status}</div></div><button type="button" disabled={busy||t.status==="CONNECTED"} onClick={()=>inviteTenant(t)} className="min-h-9 shrink-0 rounded-lg border border-cyan-400/30 px-3 text-[11px] font-bold text-cyan-100 disabled:opacity-40">{t.status==="CONNECTED"?"Connected":"Send invite"}</button></div>)}
          </div>
          <form onSubmit={addTenant} className="mt-4 space-y-2 rounded-lg border border-slate-700 p-3">
            <div className="text-xs font-black">Create a tenant profile (only if missing)</div>
            <div className="grid gap-2 sm:grid-cols-2">{[["first_name","First name"],["last_name","Last name"],["email","Email"],["phone","Phone"]].map(([k,label])=><Field label={label} key={k}><input className={input} required={k==="first_name"||k==="email"} type={k==="email"?"email":"text"} value={tenantForm[k]} onChange={e=>setTenantForm(v=>({...v,[k]:e.target.value}))}/></Field>)}</div>
            <button type="submit" disabled={busy} className="min-h-10 w-full rounded-lg border border-cyan-400/40 bg-cyan-500/10 text-xs font-black text-cyan-100">Create tenant record</button>
          </form>
        </Panel>
        <Panel title="Property owner / investor" description="Create or connect ownership records without giving access to sensitive financial information automatically.">
          {owners.map(o=><div key={o.id} className="mt-1 rounded-lg border border-slate-700 p-2 text-xs">{o.name} · {o.email||"No email"} · {o.owner_type}</div>)}
          <form onSubmit={addOwner} className="mt-3 grid gap-2 sm:grid-cols-2">
            {[[ "name","Owner name"],["email","Owner email"],["phone","Phone"]].map(([k,label])=><Field key={k} label={label}><input className={input} type={k==="email"?"email":"text"} value={ownerForm[k]} onChange={e=>setOwnerForm(v=>({...v,[k]:e.target.value}))}/></Field>)}
            <button type="submit" disabled={busy} className="min-h-10 self-end rounded-xl bg-cyan-400 px-3 text-xs font-black text-slate-950">Save ownership contact</button>
          </form>
          <p className="mt-2 text-[11px] text-slate-400">Investor portal access requires a separate authenticated invitation/connection and appropriate permissions. Saving a contact does not create login credentials.</p>
        </Panel>
        <button type="button" onClick={()=>setStage("documents")} className="min-h-11 w-full rounded-xl border border-cyan-400/45 text-xs font-black text-cyan-100">Next: paperwork →</button>
      </div>:null}

      {stage==="documents"?<Panel title="Transfer paperwork & verification" description="Track what is missing, requested, received or verified. A file being uploaded is not proof an external administrator approved it.">
        <div className="mb-3 flex flex-wrap gap-2"><button type="button" onClick={()=>navigate(`/pm/properties/${propertyId}?tab=documents`)} className="rounded-xl border border-cyan-500/40 px-3 py-2 text-xs font-black text-cyan-100">Open property document library ↗</button>{draft.assistance.administrator_website?.startsWith("https://")?<LinkOut href={draft.assistance.administrator_website}>Open administrator website</LinkOut>:null}</div>
        <div className="mb-3 rounded-xl border border-slate-700 bg-black/20 p-3">
          <h3 className="text-xs font-black text-cyan-100">Extract information from an uploaded document</h3>
          <p className="mt-1 text-[11px] text-slate-400">Selectable-text PDF, Word or TXT. Extraction creates suggestions only; the user must confirm them. Scanned images are not supported yet.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <select aria-label="Select document to extract" className={input+" min-w-0 flex-1"} value={intakeDocumentId} onChange={e=>{setIntakeDocumentId(e.target.value);setIntakeDraft(null);}}><option value="">Choose an uploaded document</option>{documents.filter(d=>d.document_url).map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</select>
            <button type="button" onClick={extractDocument} disabled={!intakeDocumentId||busy} className="min-h-10 rounded-lg border border-cyan-400/40 px-3 text-xs font-bold text-cyan-100 disabled:opacity-40">{busy?"Reading…":"Read document"}</button>
          </div>
          {intakeDraft?<div className="mt-3 space-y-2 rounded-lg border border-amber-400/25 bg-amber-500/5 p-3">
            <div className="text-xs font-black text-amber-100">Review extracted suggestions against the source</div>
            {Object.keys(intakeDraft.suggestions||{}).length?Object.entries(intakeDraft.suggestions).map(([key,item])=><Field key={key} label={key.replaceAll("_"," ")+" · page "+(item.candidates?.[0]?.page||"?")}>
              <input className={input} value={intakeFields[key]??""} onChange={e=>setIntakeFields(f=>({...f,[key]:e.target.value}))}/>
              <span className="mt-1 block text-[10px] text-slate-400">{item.candidates?.[0]?.context||"Review source document"}</span>
            </Field>):<p className="text-xs text-slate-400">No reliable labeled rent or lease fields found. Fill them manually in your existing property and lease records.</p>}
            <button type="button" disabled={busy} onClick={confirmExtracted} className="min-h-10 w-full rounded-lg bg-cyan-400 px-3 text-xs font-black text-slate-950">Save reviewed fields to document</button>
          </div>:null}
        </div>
        {[["Property and tenant records",taskGroups.base],["Assistance program and payment change",taskGroups.assisted]].map(([group,items])=>items.length?<div key={group} className="mb-4"><h3 className="mb-2 text-xs font-black text-cyan-200">{group}</h3><div className="space-y-2">{items.map(t=>{
          const task=taskDrafts[t.key]||{status:"NOT_STARTED",note:"",document_id:null};
          return <div key={t.key} className="rounded-lg border border-slate-700 bg-black/20 p-2.5">
            <div className="flex items-start justify-between gap-2"><div><div className="text-xs font-black">{t.title} {t.required?<span className="text-amber-300">*</span>:null}</div><p className="mt-1 text-[10px] text-slate-400">{t.why}</p></div><select aria-label={t.title+" status"} className="min-h-9 max-w-32 shrink-0 rounded-lg border border-slate-600 bg-slate-950 px-1 text-[11px]" value={task.status} onChange={e=>taskSet(t.key,"status",e.target.value)}>{taskStates.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input className={input+" min-h-9 text-xs"} aria-label={t.title+" source note"} placeholder="Evidence source / requested from / confirmation ID" value={task.note||""} onChange={e=>taskSet(t.key,"note",e.target.value)}/>
              <select className={input+" min-h-9 text-xs"} aria-label={t.title+" supporting file"} value={task.document_id||""} onChange={e=>taskSet(t.key,"document_id",e.target.value||null)}><option value="">Supporting file (optional)</option>{documents.map(doc=><option key={doc.id} value={doc.id}>{doc.title}</option>)}</select>
              <button type="button" disabled={busy} onClick={()=>saveTask(t.key)} className="min-h-9 rounded-lg bg-cyan-500/15 px-3 text-[11px] font-black text-cyan-100 disabled:opacity-50">Save</button>
            </div>
          </div>;
        })}</div></div>:null)}
        <button type="button" onClick={()=>setStage("balances")} className="min-h-11 w-full rounded-xl border border-cyan-400/45 px-3 text-sm font-black text-cyan-100">Next: opening balances →</button>
      </Panel>:null}

      {stage==="balances"?<Panel title="Opening balances and held funds" description="Imported balances are provisional evidence until independently reconciled. They never automatically create tenant charges, payments, or deposit credits.">
        <div className="space-y-2">{financial.map(row=><div key={row.id} className="rounded-xl border border-slate-700 bg-black/25 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Type"><select className={input} value={row.type} onChange={e=>editBalance(row.id,"type",e.target.value)}>{balanceKinds.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></Field>
            <Field label="Amount"><input className={input} inputMode="decimal" value={row.amount} onChange={e=>editBalance(row.id,"amount",e.target.value)} placeholder="0.00" /></Field>
            <Field label="Rental month / period"><input className={input} value={row.period} onChange={e=>editBalance(row.id,"period",e.target.value)} placeholder="YYYY-MM" /></Field>
            <Field label="Held by / paid by"><input className={input} value={row.counterparty} onChange={e=>editBalance(row.id,"counterparty",e.target.value)} placeholder="Former manager, resident, agency..." /></Field>
            <Field label="Evidence status"><select className={input} value={row.evidence_status} onChange={e=>editBalance(row.id,"evidence_status",e.target.value)}>{evidenceStates.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></Field>
            <Field label="Source / dispute note"><input className={input} value={row.source_note} onChange={e=>editBalance(row.id,"source_note",e.target.value)} placeholder="Ledger date, bank receipt, statement..." /></Field>
          </div>
          <button type="button" onClick={()=>removeBalance(row.id)} className="mt-2 text-xs font-bold text-rose-300">Remove draft line</button>
        </div>)}</div>
        <div className="mt-3 flex gap-2"><button type="button" onClick={addBalance} className="min-h-10 flex-1 rounded-xl border border-cyan-400/35 px-3 text-xs font-bold text-cyan-100">+ Add balance</button><button type="button" onClick={saveBalances} disabled={busy} className="min-h-10 flex-1 rounded-xl bg-cyan-400 px-3 text-xs font-black text-slate-950 disabled:opacity-50">{busy?"Saving…":"Save & review →"}</button></div>
        <p className="mt-3 text-[11px] leading-5 text-slate-400">A claimed deposit application while the tenant is still occupying the unit needs independent confirmation and legal review. Record it as disputed or reported, not automatically as rent paid.</p>
      </Panel>:null}

      {stage==="rent"?<Panel title="Rent history & increases" description="Do not overwrite an older lease or incorrectly reassign assistance-provider rent to the resident.">
        <p className="text-xs leading-5 text-slate-300">Record initial contract rent from the signed lease, compare each month's payer split, then open a proposal for future changes. A new rent amount must be signed or approved where required before being used.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={()=>navigate(`/pm/payments?property=${propertyId}`)} className="min-h-10 rounded-lg border border-slate-600 px-3 text-xs font-black text-slate-100">Review historical charges</button>
          <button type="button" onClick={()=>navigate(`/pm/rent-increases?property=${propertyId}`)} className="min-h-10 rounded-lg bg-cyan-400 px-3 text-xs font-black text-slate-950">Open rent increase planner</button>
        </div>
        <button type="button" onClick={()=>setStage("review")} className="mt-3 min-h-10 w-full rounded-lg border border-cyan-400/35 text-xs font-black text-cyan-100">Next: review readiness →</button>
      </Panel>:null}
      {stage==="review"?<Panel title="Ready to manage?" description="Review the transition before completing the case. This does not submit anything to an outside housing administrator.">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-700 p-3"><div className="text-xs font-black">Paperwork verified</div><div className="mt-1 text-xl font-black">{progress.completed} / {progress.total}</div></div>
          <div className="rounded-lg border border-slate-700 p-3"><div className="text-xs font-black">Unresolved opening balances</div><div className="mt-1 text-xl font-black">{outstanding.length}</div></div>
        </div>
        {outstanding.length>0?<div className="mt-3 space-y-1.5">{outstanding.map(r=><p className="rounded-lg border border-amber-400/20 bg-amber-500/5 p-2.5 text-xs" key={r.id}>{balanceKinds.find(x=>x[0]===r.type)?.[1]||r.type}: {money(r.amount)} · {r.evidence_status.toLowerCase()} · {r.counterparty||"unknown counterparty"}</p>)}</div>:null}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={()=>patch({status:"AWAITING_DOCUMENTS"},"Case saved as awaiting documents.")} disabled={busy} className="min-h-10 rounded-lg border border-slate-600 px-3 text-xs font-bold">Awaiting documents</button>
          <button type="button" onClick={()=>patch({status:"AWAITING_APPROVAL"},"Case saved as awaiting external approval.")} disabled={busy} className="min-h-10 rounded-lg border border-slate-600 px-3 text-xs font-bold">Awaiting approval</button>
          <button type="button" onClick={()=>patch({status:"COMPLETED"},"Handoff checklist closed. Confirm authority and financial ledger separately.")} disabled={busy} className="min-h-10 rounded-lg bg-cyan-400 px-3 text-xs font-black text-slate-950 disabled:opacity-50">Complete handoff</button>
        </div>
        <p className="mt-3 text-[11px] leading-5 text-slate-400">Completion requires every mandatory step reviewed and each opening balance documented or reconciled. Keep original source documents; SyncWorks cannot replace legal signatures or outside approval.</p>
      </Panel>:null}
    </>:null}
  </main>;
}

export default function PMHandoffWizard(){
  return <PMShell><PMHandoffWizardContent/></PMShell>;
}
