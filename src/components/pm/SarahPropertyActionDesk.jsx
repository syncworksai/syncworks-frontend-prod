import React,{useMemo,useState} from "react";
import {AlertTriangle,ClipboardCheck,FileClock,FileSearch,MessagesSquare,WalletCards,Work} from "lucide-react";
import {addVictoriaTask} from "../../api/syncWorkspaceRecords";

const uniqueReferences=reports=>{
 const map=new Map();
 for(const report of reports||[])for(const m of report.references||[]){
  if(m.message_id&&!map.has(m.message_id))map.set(m.message_id,m);
 }
 return [...map.values()];
};
const matching=(items,regex)=>items.filter(m=>regex.test([m.subject,m.category,m.sender].filter(Boolean).join(" ")));
const incomplete=rows=>(rows||[]).filter(r=>!["COMPLETED","CLOSED","CANCELLED","PAID","DONE"].includes(String(r.status||"").toUpperCase()));

export default function SarahPropertyActionDesk({property,reports=[],workOrders=[],onOpenTab,onFindMail}){
 const [saving,setSaving]=useState(""),[message,setMessage]=useState("");
 const references=useMemo(()=>uniqueReferences(reports),[reports]);
 const inspection=useMemo(()=>matching(references,/inspect|reinspect|abatement|housing.authority|HQS|smoke.detector|GFCI/i),[references]);
 const finance=useMemo(()=>matching(references,/rent|payment|HAP|ledger|housing.assistance|voucher|balance|disburse|deposit/i),[references]);
 const paperwork=useMemo(()=>matching(references,/lease|contract|document|statement|notice|renewal|inspection.report/i),[references]);
 const pendingWork=useMemo(()=>incomplete(workOrders),[workOrders]);
 const rows=[
  {id:"inspection",icon:ClipboardCheck,title:"Inspection & compliance",count:inspection.length,kind:"email reference(s)",detail:"Confirm inspection date, pass/fail documentation and any abatement resolution with the housing authority.",tab:"correspondence",source:inspection},
  {id:"funds",icon:WalletCards,title:"Rent & housing assistance",count:finance.length,kind:"email reference(s)",detail:"Reconcile claimed payments against the property ledger and bank or housing-authority statements before posting funds.",tab:"ledger",source:finance},
  {id:"lease",icon:FileClock,title:"Lease & documents",count:paperwork.length,kind:"email reference(s)",detail:"Check lease terms, notices, renewals and required supporting documents against signed records.",tab:"documents",source:paperwork},
  {id:"work",icon:Work,title:"Open maintenance",count:pendingWork.length,kind:"open work order(s)",detail:"Review uncompleted work orders, vendor assignments and emergency priority.",tab:"maintenance",source:[]},
 ];
 async function assign(row){
  if(saving)return;
  const label=String(property?.name||property?.address||"Property").slice(0,70);
  const title=`Sarah: ${label} — ${row.title} follow-up`.slice(0,180);
  setSaving(row.id);setMessage("");
  try{
   await addVictoriaTask(title,{priority:row.id==="inspection"?"HIGH":"NORMAL"});
   setMessage(`Created Victoria review task: ${title}`);
  }catch(e){setMessage(e?.response?.data?.detail||e.message||"Could not create the review task.");}
  finally{setSaving("")}
 }
 return <section className="sarah-pm-action-desk" aria-label="Sarah property action desk">
  <header className="sarah-pm-action-header"><div><p>PROPERTY OPERATIONS · SARAH</p><h3>Issues to review with Victoria</h3><span>Evidence-linked suggestions · no automatic payments, notices or email sends</span></div><button type="button" onClick={onFindMail}><FileSearch size={15}/> Find emails</button></header>
  <div className="sarah-pm-action-grid">{rows.map(row=><article key={row.id} className="sarah-pm-action-card">
   <div className="sarah-pm-action-title"><row.icon size={17}/><strong>{row.title}</strong><span>{row.count}</span></div>
   <p>{row.count} {row.kind} currently surfaced</p>
   <div className="sarah-pm-action-desc">{row.detail}</div>
   <div className="sarah-pm-action-buttons"><button type="button" onClick={()=>onOpenTab(row.tab)}>Review records</button><button type="button" disabled={!!saving} onClick={()=>assign(row)}>{saving===row.id?"Saving…":"Task for Victoria"}</button></div>
  </article>)}</div>
  {!references.length&&<p className="sarah-pm-action-note"><MessagesSquare size={14}/> No linked email evidence yet. Search historical mail, review matches and attach them to this property.</p>}
  <p className="sarah-pm-action-note"><AlertTriangle size={14}/> These are review prompts, not completed reconciliations. Evidence links and attachment metadata require checking against official records.</p>
  {message&&<p role="status" className="sarah-pm-action-note">{message}</p>}
 </section>;
}
