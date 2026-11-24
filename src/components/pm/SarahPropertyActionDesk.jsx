import React,{useEffect,useMemo,useState} from "react";
import {AlertTriangle,ArrowRight,ClipboardCheck,FileClock,FileSearch,Inbox,MessageSquare,WalletCards,Wrench,X} from "lucide-react";
import {addVictoriaTask} from "../../api/syncWorkspaceRecords";

const dedupe=reports=>{
 const map=new Map();
 for(const r of reports||[])for(const m of r.references||[]){
  if(m.message_id&&!map.has(m.message_id))map.set(m.message_id,m);
 }
 return [...map.values()].sort((a,b)=>String(b.received_at||"").localeCompare(String(a.received_at||"")));
};
const matching=(items,regex)=>items.filter(m=>regex.test([m.subject,m.category,m.sender].filter(Boolean).join(" ")));
const unfinished=rows=>(rows||[]).filter(r=>!["COMPLETED","CLOSED","CANCELLED","PAID","DONE"].includes(String(r.status||"").toUpperCase()));

export default function SarahPropertyActionDesk({property,reports=[],workOrders=[],reportsError="",onOpenTab,onFindMail,onVictoria}){
 const [drawer,setDrawer]=useState(null),[saving,setSaving]=useState(""),[message,setMessage]=useState("");
 const refs=useMemo(()=>dedupe(reports),[reports]);
 const pending=useMemo(()=>unfinished(workOrders),[workOrders]);
 const categories=useMemo(()=>[
  {id:"inspection",icon:ClipboardCheck,title:"Inspections",fullTitle:"Inspection & compliance",count:matching(refs,/inspect|reinspect|abatement|housing.authority|HQS|smoke.detector|GFCI/i).length,detail:"Confirm inspection date, pass/fail documentation and any abatement resolution with the housing authority.",tab:"correspondence",source:matching(refs,/inspect|reinspect|abatement|housing.authority|HQS|smoke.detector|GFCI/i)},
  {id:"funds",icon:WalletCards,title:"Payments",fullTitle:"Rent & housing assistance",count:matching(refs,/rent|payment|HAP|ledger|housing.assistance|voucher|balance|disburse|deposit/i).length,detail:"Reconcile claimed payments against the property ledger and bank or housing-authority statements before posting funds.",tab:"ledger",source:matching(refs,/rent|payment|HAP|ledger|housing.assistance|voucher|balance|disburse|deposit/i)},
  {id:"lease",icon:FileClock,title:"Leases & files",fullTitle:"Lease & documents",count:matching(refs,/lease|contract|document|statement|notice|renewal|inspection.report/i).length,detail:"Check lease terms, notices, renewals and required supporting documents against signed records.",tab:"documents",source:matching(refs,/lease|contract|document|statement|notice|renewal|inspection.report/i)},
  {id:"work",icon:Wrench,title:"Maintenance",fullTitle:"Open maintenance",count:pending.length,detail:"Review uncompleted work orders, vendor assignments and emergency priority.",tab:"maintenance",source:[],work:pending}
 ],[refs,pending]);
 useEffect(()=>{if(!drawer)return;const esc=e=>{if(e.key==="Escape")setDrawer(null)};window.addEventListener("keydown",esc);return()=>window.removeEventListener("keydown",esc)},[drawer]);
 useEffect(()=>{setDrawer(null);setMessage("")},[property?.id]);
 const active=categories.find(c=>c.id===drawer);
 async function createTask(row){
  if(saving)return;
  const label=String(property?.name||property?.address||"Property").slice(0,70);
  const title=`Sarah: ${label} — ${row.fullTitle} follow-up`.slice(0,180);
  setSaving(row.id);setMessage("");
  try{
   await addVictoriaTask(title,{
    priority:row.id==="inspection"?"HIGH":"NORMAL",
    description:`Review ${row.fullTitle.toLowerCase()} for property ${label}. ${row.detail} Property: /pm/properties/${property?.id}?tab=correspondence. ${row.count} linked record(s); evidence is unverified. Do not represent email references as payment or inspection proof.`,
    metadata:{origin:"SARAH_PM",source_type:"PM_PROPERTY",property_id:String(property?.id||""),review_category:row.id,source_message_ids:row.source.slice(0,20).map(item=>String(item.message_id))}
   });
   setMessage(`Task created for Victoria: ${title}`);
  }catch(e){setMessage(e?.response?.data?.detail||e.message||"Could not create a task.");}
  finally{setSaving("")}
 }
 function sourceList(items,empty){
  return items.length?<div className="sarah-source-list">{items.map(m=><article key={m.message_id} className="sarah-source">
   <strong>{m.subject||"Untitled correspondence"}</strong><span>{m.received_at?.slice(0,10)||"Undated"} · {m.sender||"Unknown sender"}</span>
   <small>{m.category||"Review"} · source correspondence only</small>
   {!!m.attachments?.length&&<details><summary>{m.attachments.length} attachment reference(s) — metadata only</summary>{m.attachments.map((a,i)=><p key={i}>{a.name} · {a.content_type||"unknown type"} · Not downloaded or verified</p>)}</details>}
   {m.outlook_url&&<a href={m.outlook_url} target="_blank" rel="noopener noreferrer">Open original Outlook email <ArrowRight size={12}/></a>}
  </article>)}</div>:<p className="sarah-empty">{empty}</p>;
 }
 return <section className="sarah-pm-console" aria-label="Sarah property command center">
  <div className="sarah-pm-bar">
   <div className="sarah-pm-heading"><span>PROPERTY OPERATIONS / SARAH</span><strong>Correspondence & decisions</strong><p>Review-only · no automatic rent changes, notices or outbound emails</p></div>
   <div className="sarah-pm-controls">
    <button type="button" onClick={onFindMail}><FileSearch size={15}/> Find emails</button>
    <button type="button" onClick={()=>setDrawer("timeline")}><MessageSquare size={15}/> Timeline <b>{refs.length}</b></button>
    <button type="button" onClick={()=>setDrawer("reports")}><Inbox size={15}/> Reports <b>{reports.length}</b></button>
    <button type="button" onClick={onVictoria}>Victoria <ArrowRight size={14}/></button>
   </div>
  </div>
  {reportsError&&<p role="alert" className="sarah-pm-error">{reportsError}</p>}
  <div className="sarah-pm-summary">
   <span><b>{refs.length}</b> linked email references</span>
   <span><b>{reports.length}</b> reviewed report(s)</span>
   <span><b>{pending.length}</b> open work order(s)</span>
   <span className="sarah-pm-review-state">Verification required</span>
  </div>
  <div className="sarah-pm-tiles">{categories.map(c=><button key={c.id} type="button" onClick={()=>setDrawer(c.id)} className="sarah-pm-tile">
    <div><c.icon size={20}/><b>{c.count}</b></div><strong>{c.title}</strong><small>{c.id==="work"?"Open work orders":"Linked email matches"}</small><span>Review details <ArrowRight size={14}/></span>
   </button>)}</div>
  <div className="sarah-pm-foot"><span><AlertTriangle size={14}/> Zero matches means no evidence linked yet, not that the issue is resolved.</span><button type="button" onClick={onFindMail}>Link property correspondence <ArrowRight size={14}/></button></div>
  {message&&<p role="status" className="sarah-pm-task-status">{message}</p>}
  {drawer&&<div className="sarah-pm-drawer-overlay" onClick={()=>setDrawer(null)}>
   <aside className="sarah-pm-drawer" role="dialog" aria-modal="true" aria-label={active?.fullTitle|| (drawer==="timeline"?"Property correspondence timeline":"Reviewed correspondence reports")} onClick={e=>e.stopPropagation()}>
    <div className="sarah-pm-drawer-head"><div><small>SARAH / PROPERTY REVIEW</small><h3>{active?.fullTitle|| (drawer==="timeline"?"Correspondence timeline":"Reviewed reports")}</h3></div><button type="button" onClick={()=>setDrawer(null)} aria-label="Close panel"><X size={20}/></button></div>
    <div className="sarah-pm-drawer-body">
     {active?<><p className="sarah-pm-drawer-description">{active.detail}</p><p className="sarah-pm-verification"><AlertTriangle size={14}/> Email references are not verified payment, lease or inspection proof.</p>
      {active.id==="work"?<div className="sarah-source-list">{(active.work||[]).length?(active.work||[]).map((w,i)=><div className="sarah-source" key={w.id||i}><strong>{w.title||w.description||"Maintenance work order"}</strong><span>{w.status||"Open"}</span></div>):<p className="sarah-empty">No open work orders currently returned for this property.</p>}</div>:sourceList(active.source,"No reviewed email matches linked to this category. Search and attach property correspondence first.")}
     </>:drawer==="timeline"?sourceList(refs,"No linked correspondence yet. Search historical Outlook messages, review matches, and attach the relevant records to this property."):
      reports.length?<div className="sarah-source-list">{reports.map((r,i)=><article key={r.report_id||i} className="sarah-source"><strong>{r.email_count||r.references?.length||0} reviewed email references</strong><span>{r.created_at?.slice(0,10)||"Date unavailable"}</span><small>Original evidence must be checked before taking action.</small></article>)}</div>:<p className="sarah-empty">No reviewed correspondence reports attached to this property.</p>}
    </div>
    <div className="sarah-pm-drawer-actions">
     {active?<><button type="button" onClick={()=>{setDrawer(null);onOpenTab(active.tab)}}>Open {active.id==="funds"?"ledger":active.id==="lease"?"files":active.id==="work"?"work orders":"property records"}</button><button type="button" disabled={!!saving} onClick={()=>createTask(active)}>{saving===active.id?"Creating…":"Task for Victoria"}</button></>:<button type="button" onClick={onFindMail}>Search property emails</button>}
    </div>
   </aside>
  </div>}
 </section>;
}
