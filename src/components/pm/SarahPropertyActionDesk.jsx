import React,{useEffect,useMemo,useState} from "react";
import {AlertTriangle,ArrowRight,FileSearch,Inbox,MessageSquare,FileText,Clock3,X,ExternalLink,Mail} from "lucide-react";
import {addVictoriaTask} from "../../api/syncWorkspaceRecords";

const referencesFrom=(reports=[])=>{
 const seen=new Set(),items=[];
 for(const report of reports)for(const ref of report.references||[]){
  if(!ref.message_id||seen.has(ref.message_id))continue;
  seen.add(ref.message_id);items.push(ref);
 }
 return items.sort((a,b)=>String(b.received_at||"").localeCompare(String(a.received_at||"")));
};
const summaryOf=(report)=>{
 for(const field of ["summary","briefing","executive_summary","analysis","overview"]){
  if(typeof report?.[field]==="string"&&report[field].trim())return report[field].trim();
 }
 return "";
};

export default function SarahPropertyActionDesk({property,reports=[],reportsError="",onFindMail,onVictoria}){
 const [drawer,setDrawer]=useState(null),[saving,setSaving]=useState(""),[notice,setNotice]=useState("");
 const refs=useMemo(()=>referencesFrom(reports),[reports]);
 const rows=useMemo(()=>reports.map((r,i)=>({id:String(r.report_id||r.id||i),report:r,summary:summaryOf(r)})).reverse(),[reports]);
 useEffect(()=>{setDrawer(null);setNotice("")},[property?.id]);
 useEffect(()=>{if(!drawer)return;const onKey=e=>{if(e.key==="Escape")setDrawer(null)};document.addEventListener("keydown",onKey);return()=>document.removeEventListener("keydown",onKey)},[drawer]);
 const selected=drawer?.startsWith("report:")?rows.find(r=>r.id===drawer.slice(7)):null;
 async function handoff(row){
  if(saving)return;
  const name=String(property?.name||property?.address||"Property").slice(0,70);
  setSaving(row.id);setNotice("");
  try{
   const reportRefs=(row.report.references||[]).filter(r=>r.message_id);
   await addVictoriaTask(`Sarah: review correspondence briefing for ${name}`.slice(0,180),{
    priority:"NORMAL",
    description:`Review Sarah's linked property correspondence and determine follow-up actions. ${row.summary.slice(0,1100)} Property: /pm/properties/${property?.id}?tab=correspondence. These messages are not verified evidence of payments, inspections or completed work.`,
    metadata:{origin:"SARAH_PM",source_type:"PM_PROPERTY",property_id:String(property?.id||""),review_category:"CORRESPONDENCE",report_id:row.id,source_message_ids:reportRefs.slice(0,20).map(r=>String(r.message_id))}
   });
   setNotice("Correspondence review task created for Victoria.");
  }catch(e){setNotice(e?.response?.data?.detail||e?.message||"Could not create Victoria's review task.");}
  finally{setSaving("")}
 }
 function refsView(items,empty){
  return items.length?<div className="sarah-source-list">{items.map(m=><article className="sarah-source" key={m.message_id}>
   <strong>{m.subject||"Untitled email"}</strong><span>{m.received_at?.slice(0,10)||"Undated"} · {m.sender||"Unknown sender"}</span>
   <small>{m.category||"Unclassified"} · source not independently verified</small>
   {!!m.attachments?.length&&<details><summary>{m.attachments.length} attachment metadata reference(s)</summary>{m.attachments.map((a,i)=><p key={i}>{a.name||"Attachment"} · Not downloaded or verified</p>)}</details>}
   {m.outlook_url&&<a href={m.outlook_url} target="_blank" rel="noopener noreferrer">Open source in Outlook <ExternalLink size={13}/></a>}
  </article>)}</div>:<p className="sarah-empty">{empty}</p>;
 }
 return <section className="sarah-pm-console sarah-briefings-desk" aria-label="Sarah property correspondence briefings">
  <div className="sarah-pm-bar">
   <div className="sarah-pm-heading"><span><Mail size={13}/> SARAH / CORRESPONDENCE</span><strong>Briefings</strong><p>Email summaries, communication history and follow-up recommendations</p></div>
   <div className="sarah-pm-controls">
    <button type="button" className="sarah-action-primary" onClick={onFindMail}><FileSearch size={15}/> Find emails</button>
    <button type="button" onClick={()=>setDrawer("timeline")}><Clock3 size={15}/> Timeline <b>{refs.length}</b></button>
    <button type="button" onClick={()=>setDrawer("sources")}><Inbox size={15}/> Sources <b>{refs.length}</b></button>
    <button type="button" className="sarah-action-victoria" onClick={onVictoria}>Victoria <ArrowRight size={14}/></button>
   </div>
  </div>
  {reportsError&&<p role="alert" className="sarah-pm-error">{reportsError}</p>}
  <div className="sarah-briefings-stats"><span><b>{rows.length}</b> correspondence briefing(s)</span><span><b>{refs.length}</b> unique email reference(s)</span><span>Human verification required</span></div>
  <div className="sarah-briefings-main">
   <div className="sarah-briefings-list-head"><strong>Correspondence summaries</strong><small>Most recent first · saved property reports only</small></div>
   {rows.length?<div className="sarah-briefings-list">{rows.map(row=><article key={row.id} className="sarah-briefing-row">
    <div className="sarah-briefing-row-icon"><MessageSquare size={19}/></div>
    <div className="sarah-briefing-row-content"><strong>{row.report.title||row.report.property_name||"Property correspondence briefing"}</strong>
     <small>{row.report.created_at?.slice(0,10)||"Date unavailable"} · {(row.report.references||[]).length} email reference(s)</small>
     <p>{row.summary||"A saved correspondence report is available. Open the briefing to review its linked source records; no narrative summary was provided."}</p></div>
    <button type="button" onClick={()=>setDrawer("report:"+row.id)}>Read <ArrowRight size={14}/></button>
   </article>)}</div>:<div className="sarah-briefing-empty"><FileText size={30}/><strong>No correspondence briefings attached yet</strong>
    <p>Use historical email search to find messages for this property, review the matches, and attach a report. Sarah will display saved summaries here.</p>
    <button type="button" className="sarah-action-primary" onClick={onFindMail}>Search property emails <ArrowRight size={14}/></button></div>}
  </div>
  <p className="sarah-briefing-disclaimer"><AlertTriangle size={14}/> A message summary is not proof of a rent payment, completed inspection or signed lease. Verify original documents before action.</p>
  {notice&&<p role="status" className="sarah-pm-task-status">{notice}</p>}
  {drawer&&<div className="sarah-pm-drawer-overlay" onClick={()=>setDrawer(null)}>
   <aside className="sarah-pm-drawer" role="dialog" aria-modal="true" aria-label={selected?"Correspondence briefing":drawer==="timeline"?"Email timeline":"Source correspondence"} onClick={e=>e.stopPropagation()}>
    <div className="sarah-pm-drawer-head"><div><small>SARAH / PROPERTY CORRESPONDENCE</small><h3>{selected?"Correspondence briefing":drawer==="timeline"?"Email timeline":"Linked emails & evidence"}</h3></div><button type="button" onClick={()=>setDrawer(null)} aria-label="Close drawer"><X size={20}/></button></div>
    <div className="sarah-pm-drawer-body">{selected?<><p className="sarah-pm-drawer-description">{selected.summary||"This saved report does not contain a narrative summary."}</p><p className="sarah-pm-verification"><AlertTriangle size={14}/> Review underlying emails and attachments; do not treat summaries as verified financial or compliance records.</p>{refsView(selected.report.references||[],"No linked email references in this briefing.")}</>:refsView(refs,"No correspondence linked yet. Search historical mail and attach a reviewed property report.")}</div>
    <div className="sarah-pm-drawer-actions">{selected?<><button type="button" onClick={()=>setDrawer("sources")}>All sources</button><button type="button" disabled={!!saving} onClick={()=>handoff(selected)}>{saving?"Creating…":"Task for Victoria"}</button></>:<button type="button" onClick={onFindMail}>Find property emails</button>}</div>
   </aside>
  </div>}
 </section>;
}
