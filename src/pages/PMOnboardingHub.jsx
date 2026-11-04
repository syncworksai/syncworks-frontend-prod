import React,{useEffect,useState} from "react";
import {useNavigate,useSearchParams} from "react-router-dom";
import api from "../api/client";
import PMPropertyPicker, { matchesPMProperty } from "../components/pm/PMPropertyPicker";
const field="min-h-10 w-full min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white";
const act="min-h-10 rounded-lg border border-cyan-400/35 bg-cyan-500/10 px-3 text-xs font-bold text-cyan-100 disabled:opacity-40";
const primary="min-h-10 rounded-lg bg-cyan-400 px-4 text-xs font-black text-slate-950 disabled:opacity-40";
const panel="rounded-2xl border border-cyan-400/20 bg-[#07111f] p-3 sm:p-5";
const input=(label,value,onChange,type="text")=><label className="block min-w-0 text-[10px] text-slate-400">{label}<input type={type} className={field+" mt-1"} value={value??""} onChange={e=>onChange(e.target.value)}/></label>;
const blank={section8_requested:false,voucher_amount:"",voucher_bedrooms:0,agency_name:"",agent_name:"",agent_email:"",phone:"",preferred_move_in:"",housing_notes:"",property_id:""};
const emptyHousing={accepts_section8:false,proposed_rent:"",voucher_payment_standard:"",approved_tenant_share:"",approved_hap_share:"",approval_status:"UNVERIFIED",verified_through:"",housing_authority:"",notes:""};

export default function PMOnboardingHub(){
  const nav=useNavigate(),[params,setParams]=useSearchParams();
  const [ws,setWs]=useState(null),[leads,setLeads]=useState([]),[overview,setOverview]=useState(null);
  const [leadId,setLeadId]=useState(params.get("lead")||""),[propertyId,setPropertyId]=useState(params.get("property")||"");
  const [propertySearch,setPropertySearch]=useState("");
  const [profile,setProfile]=useState(blank),[applicationStatus,setApplicationStatus]=useState("NOT_STARTED");
  const [housing,setHousing]=useState(emptyHousing),[link,setLink]=useState(""),[tenantId,setTenantId]=useState("");
  const [error,setError]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false);
  const headers=ws?.id?{"X-PM-Workspace-ID":String(ws.id)}:{};
  const lead=leads.find(x=>String(x.id)===String(leadId));
  const property=overview?.properties?.find(x=>String(x.id)===String(propertyId));
  const visibleProperties=(overview?.properties||[]).filter(p=>matchesPMProperty(p,propertySearch)).slice(0,24);
  const update=(key,value)=>setProfile(x=>({...x,[key]:value}));
  const updateHousing=(key,value)=>setHousing(x=>({...x,[key]:value}));
  const alertError=e=>setError(e?.response?.data?.detail||"Could not complete the operation.");
  async function refresh(w=ws) {
    if(!w?.id)return;
    const h={"X-PM-Workspace-ID":String(w.id)};
    const [l,o]=await Promise.all([api.get("/pm-hub/leads/",{headers:h}),api.get("/pm-hub/onboarding/overview/",{headers:h})]);
    setLeads(l.data?.leads||[]);setOverview(o.data||{});
  }
  useEffect(()=>{
    let active=true;
    api.get("/pm-hub/workspaces/current/").then(async response=>{
      if(!active)return;
      setWs(response.data);await refresh(response.data);
    }).catch(e=>{if(active)alertError(e)});
    return()=>{active=false};
  },[]);
  useEffect(()=>{
    if(!ws?.id||!leadId){setProfile(blank);return;}
    let active=true;setLink("");
    api.get("/pm-hub/onboarding/leads/"+leadId+"/profile/",{headers}).then(r=>{
      if(!active)return;
      setProfile({...blank,...r.data.application,
        section8_requested:r.data.section8_requested,voucher_amount:r.data.voucher_amount,
        voucher_bedrooms:r.data.voucher_bedrooms,property_id:r.data.property_id||""});
      setApplicationStatus(r.data.application_status||"NOT_STARTED");
    }).catch(e=>{if(active)alertError(e)});
    return()=>{active=false};
  },[ws?.id,leadId]);
  useEffect(()=>{
    if(!ws?.id||!propertyId){setHousing(emptyHousing);return;}
    let active=true;
    api.get("/pm-hub/onboarding/properties/"+propertyId+"/housing/",{headers}).then(r=>{
      if(active)setHousing({...emptyHousing,...r.data.section8_pricing});
    }).catch(e=>{if(active)alertError(e)});
    return()=>{active=false};
  },[ws?.id,propertyId]);
  function choose(key,id,setter){
    setter(String(id||""));setError("");setNotice("");
    const next=new URLSearchParams(params);
    id?next.set(key,String(id)):next.delete(key);
    setParams(next,{replace:true});
  }
  async function run(fn) {
    setBusy(true);setError("");setNotice("");
    try{await fn();}catch(e){alertError(e)}finally{setBusy(false);}
  }
  async function saveLeadProfile(){
    if(!leadId)return;
    await run(async()=>{
      await api.patch("/pm-hub/onboarding/leads/"+leadId+"/profile/",profile,{headers});
      setNotice("Applicant and voucher/agent details saved for reuse.");await refresh();
    });
  }
  function exportApplication(){
    if(!lead)return;
    const record={lead_id:lead.id,name:lead.full_name,email:lead.email,source:lead.source,
      stage:lead.stage,application_status:applicationStatus,property:lead.property_name||"",
      ...profile};
    const pairs=Object.entries(record);
    const escaped=x=>'"'+String(x??"").replaceAll('"','""')+'"';
    const csv=pairs.map(([k,v])=>escaped(k)+","+escaped(v)).join("\r\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
    const anchor=document.createElement("a");
    anchor.href=url;anchor.download="syncworks-pm-application-"+lead.id+".csv";
    document.body.appendChild(anchor);anchor.click();anchor.remove();URL.revokeObjectURL(url);
  }
  async function invite(){
    if(!leadId||!lead?.email)return;
    await run(async()=>{
      await api.patch("/pm-hub/onboarding/leads/"+leadId+"/profile/",profile,{headers});
      const r=await api.post("/pm-hub/onboarding/leads/"+leadId+"/invite/",{},{headers});
      setLink(window.location.origin+r.data.application_path);
      setApplicationStatus("INVITED");
      setNotice("Application link created for the applicant. No email has been sent.");await refresh();
    });
  }
  async function approve(){
    if(applicationStatus!=="SUBMITTED")return;
    await run(async()=>{
      await api.patch("/pm-hub/leads/"+leadId+"/",{stage:"APPROVED"},{headers});
      await refresh();setNotice("Application marked approved by PM. Tenant account not yet created.");
    });
  }
  async function convert(){
    if(lead?.stage!=="APPROVED"||!lead?.property)return;
    await run(async()=>{
      await api.patch("/pm-hub/leads/"+leadId+"/",{stage:"WON"},{headers});
      const r=await api.post("/pm-hub/leads/"+leadId+"/convert-to-tenant/",{},{headers});
      setTenantId(String(r.data.tenant_id||""));await refresh();
      setNotice("Draft tenant created. Connect unit and collect signed documents before move-in or billing.");
    });
  }
  async function saveHousing(){
    if(!propertyId)return;
    await run(async()=>{
      await api.patch("/pm-hub/onboarding/properties/"+propertyId+"/housing/",housing,{headers});
      setNotice("Section 8 reference saved. No lease charge or payment was posted.");
      await refresh();
    });
  }
  const sections=[["Lead","Capture inquiry"],["Application","Email-matched link"],["Approval","PM decision"],["Lease","Reuse property data"],["Signature","Approved signing method"],["Move-in","Portal and ledger"]];
  return <main className="min-h-screen space-y-4 bg-[#020611] px-3 py-4 pb-24 text-white sm:px-6">
    <section className={panel}>
      <div className="text-[10px] font-black uppercase tracking-widest text-cyan-300">SyncWorks · PM Onboarding</div>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-2">
        <div><h1 className="text-xl font-black sm:text-2xl">Tenant & Partner Onboarding</h1><p className="mt-1 text-xs text-slate-400">Record once, reuse through the entire leasing process.</p></div>
        <button className={act} onClick={()=>nav("/pm")}>PM Dashboard</button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {sections.map(([title,desc],index)=><div key={title} className="rounded-xl border border-slate-700 bg-black/20 p-2.5">
          <div className="text-[10px] font-black text-cyan-200">{index+1} · {title}</div><div className="mt-1 text-[10px] text-slate-400">{desc}</div>
        </div>)}
      </div>
      <p className="mt-2 text-[10px] text-amber-200">Legal templates, applicant screening, final signatures and payment automation require separate approval. No signing or billing occurs from this page.</p>
    </section>
    {error?<p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</p>:null}
    {notice?<p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">{notice}</p>:null}
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {[["Leads",overview?.leads],["Applications",overview?.applications_submitted],["Properties",overview?.properties?.length],["Tenant records",overview?.tenants]].map(([title,n])=>
        <div key={title} className="rounded-xl border border-slate-700 bg-[#07111f] p-3"><div className="text-[10px] text-slate-400">{title}</div><div className="mt-1 text-xl font-black">{n??"—"}</div></div>)}
    </div>
    <section className={panel}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="text-base font-black">1 · Leads & application</h2><p className="mt-1 text-xs text-slate-400">Phone and email inquiries live on the dedicated PM Leads page.</p></div>
        <button className={primary} onClick={()=>nav("/pm/leads?create=1")}>+ Add lead</button>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="text-[10px] text-slate-400">Select lead<select className={field+" mt-1"} value={leadId} onChange={e=>choose("lead",e.target.value,setLeadId)}>
          <option value="">Select applicant</option>{leads.map(x=><option key={x.id} value={x.id}>{x.full_name} · {x.email||"No email"}</option>)}
        </select></label>
        <div className="rounded-lg border border-slate-700 p-2 text-xs">Application: <strong>{applicationStatus.replaceAll("_"," ")}</strong></div>
      </div>
      {lead?<div className="mt-3 space-y-3 border-t border-slate-700 pt-3">
        <p className="text-[11px] text-slate-400">{lead.full_name} · Source: {lead.source_label||lead.source} · Stage: {lead.stage}</p>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          <PMPropertyPicker properties={overview?.properties||[]} value={profile.property_id||""}
            onChange={value=>update("property_id",value)} label="Interested property (optional)" />
          {input("Phone",profile.phone,v=>update("phone",v))}
          {input("Preferred move-in",profile.preferred_move_in,v=>update("preferred_move_in",v),"date")}
        </div>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!profile.section8_requested} onChange={e=>update("section8_requested",e.target.checked)}/>Section 8 / voucher</label>
        {profile.section8_requested?<div className="grid grid-cols-2 gap-2 rounded-xl border border-fuchsia-500/25 bg-fuchsia-500/5 p-3 md:grid-cols-3">
          {input("Voucher payment standard",profile.voucher_amount,v=>update("voucher_amount",v))}
          {input("Voucher bedrooms",profile.voucher_bedrooms,v=>update("voucher_bedrooms",v),"number")}
          {input("Housing authority",profile.agency_name,v=>update("agency_name",v))}
          {input("Assigned agent",profile.agent_name,v=>update("agent_name",v))}
          {input("Agent email",profile.agent_email,v=>update("agent_email",v),"email")}
          {input("Voucher notes",profile.housing_notes,v=>update("housing_notes",v))}
        </div>:null}
        <div className="flex flex-wrap gap-2">
          <button className={act} type="button" onClick={()=>nav("/pm/leads?lead="+leadId)}>Open lead timeline</button>
          <button className={act} disabled={busy} onClick={saveLeadProfile}>Save applicant</button>
          <button className={act} type="button" onClick={exportApplication}>Export application CSV</button>
          <button className={primary} disabled={busy||!lead.email} onClick={invite}>Create application link</button>
          {applicationStatus==="SUBMITTED" && lead.stage!=="APPROVED"?
            <button className={act} disabled={busy} onClick={approve}>Approve application</button>:null}
          {lead.stage==="APPROVED"?<button className={act} disabled={busy||!lead.property} onClick={convert}>Convert to tenant draft</button>:null}
        </div>
        {link?<div className="space-y-2 rounded-lg border border-cyan-400/30 p-3">
          <div className="text-[10px] font-bold text-cyan-200">Application link · expires in 7 days · no email sent</div>
          <div className="break-all text-[11px] text-slate-400">{link}</div>
          <button className={act} onClick={()=>navigator.clipboard.writeText(link).then(()=>setNotice("Link copied; send it to the matching email.")).catch(()=>setError("Copy manually; clipboard unavailable."))}>Copy link</button>
          <p className="text-[10px] text-amber-200">Regenerating the link invalidates the previous invitation.</p>
        </div>:null}
        {tenantId?<div className="rounded-xl border border-emerald-500/30 p-3">
          <p className="text-xs font-bold text-emerald-200">Tenant draft #{tenantId} created</p>
          <button className={act+" mt-2"} onClick={()=>nav("/pm/lease-builder?tenant="+tenantId)}>Lease Builder</button>
        </div>:null}
      </div>:<p className="mt-3 text-xs text-slate-500">Select a lead or create one; an applicant can apply before choosing a property.</p>}
    </section>
    <section className={panel}>
      <h2 className="text-base font-black">2 · Properties & Section 8 rates</h2>
      <p className="mt-1 text-xs text-slate-400">Inquiry counts and voucher-related pricing stay attached to the property. A payment standard is not an approved HAP allocation.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <PMPropertyPicker properties={overview?.properties||[]} value={propertyId} onChange={value=>choose("property",value,setPropertyId)}
          label="Find property — name, street number or address" />
        <label className="block text-[10px] text-slate-400">Filter portfolio cards
          <input className={field+" mt-1"} placeholder="338 roxana, 907 chastain, city or ZIP" value={propertySearch}
            onChange={e=>setPropertySearch(e.target.value)} /></label>
      </div>
      <p className="mt-2 text-[10px] text-slate-500">
        Showing {visibleProperties.length} of {overview?.properties?.length||0} properties. Choose a match to open its Section 8 reference.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {visibleProperties.map(p=><button key={p.id} onClick={()=>choose("property",p.id,setPropertyId)}
          className={"rounded-xl border p-3 text-left "+(String(p.id)===String(propertyId)?"border-cyan-300 bg-cyan-500/10":"border-slate-700 bg-black/20")}>
          <div className="text-sm font-bold">{p.name}</div><div className="text-[10px] text-slate-500">{p.address}</div>
          <div className="mt-2 text-xs text-cyan-200">{p.inquiries} linked {p.inquiries===1?"inquiry":"inquiries"}</div>
        </button>)}
      </div>
      {property?<div className="mt-3 space-y-3 rounded-xl border border-slate-700 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">{property.name}</strong><button className={act} onClick={()=>nav("/pm/properties/"+propertyId)}>Property profile</button></div>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!housing.accepts_section8} onChange={e=>updateHousing("accepts_section8",e.target.checked)}/>Accepts Section 8</label>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {[
            ["Proposed rent","proposed_rent"],["Voucher payment standard","voucher_payment_standard"],
            ["Approved tenant share","approved_tenant_share"],["Approved MHA share","approved_hap_share"],
            ["Housing authority","housing_authority"],["Verified through","verified_through"]
          ].map(([title,key])=>input(title,housing[key],v=>updateHousing(key,v),key==="verified_through"?"month":"text"))}
          <label className="block text-[10px] text-slate-400">Approval status<select className={field+" mt-1"} value={housing.approval_status||"UNVERIFIED"} onChange={e=>updateHousing("approval_status",e.target.value)}>
            <option value="UNVERIFIED">Unverified</option><option value="PENDING">Pending review</option>
            <option value="APPROVED">Document approved</option><option value="ABATED">Abated</option>
          </select></label>
        </div>
        {input("Source document / agency notes",housing.notes,v=>updateHousing("notes",v))}
        <button className={primary} disabled={busy} onClick={saveHousing}>Save property assistance reference</button>
        <p className="text-[10px] text-amber-200">Saving here does not update rent or charge any tenant. Only enter approved amounts after written agency verification.</p>
      </div>:null}
    </section>
    <section className={panel}>
      <h2 className="text-base font-black">3 · Lease, documents & move-in</h2>
      <p className="mt-1 text-xs text-slate-400">Reuse verified property, owner, tenant and billing data in the existing document and lease builders.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className={act} onClick={()=>nav("/pm/lease-builder"+(tenantId?"?tenant="+tenantId:""))}>Lease Builder</button>
        <button className={act} onClick={()=>nav(propertyId?"/pm/properties/"+propertyId+"?tab=documents":"/pm/properties")}>Document Center</button>
        <button className={act} onClick={()=>nav("/pm/tenants")}>Tenant invite / move-in</button>
      </div>
      <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-[11px] text-amber-100">
        <strong>State compliance review:</strong> {property?.state||"Choose a property"} lease terms must be reviewed against local law.
        For a voucher tenancy, attach the full HUD tenancy addendum and verify RFTA, approved rent,
        inspection and HAP paperwork before activating the lease or billing.
        <a href="https://www.hud.gov/helping-americans/housing-choice-vouchers-landlord-forms"
          target="_blank" rel="noreferrer" className="ml-1 underline">HUD landlord forms</a>
      </div>
      <p className="mt-2 text-[10px] text-amber-200">The draft PDF is not a legal signature. Secure e-sign and state-approved templates still need integration and verification.</p>
    </section>
    <section className={panel}>
      <h2 className="text-base font-black">4 · Owner & partner onboarding</h2>
      <p className="mt-1 text-xs text-slate-400">Partners use a separate portfolio invitation and property permissions, not a tenant login.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className={act} onClick={()=>nav("/pm/investors")}>Owner / partner invites</button>
        <button className={act} onClick={()=>nav("/pm/properties/new")}>Add property</button>
        <button className={act} onClick={()=>nav("/pm/handoff")}>Property handoff</button>
      </div>
    </section>
  </main>;
}
