import React,{useMemo,useState} from "react";
import {AlertTriangle,ArrowUpRight,BriefcaseBusiness,CheckCircle2,ClipboardCopy,FilePenLine,Plus,Search,ShieldCheck,SlidersHorizontal,Wallet,X} from "lucide-react";
import {qualify,money,createReviewBrief} from "./freelanceQualification";
import "./FreelanceQualificationDesk.css";

const fields=[
 ["reviewPaymentVerified","Payment verified",[["unknown","Unverified"],["yes","Verified (manually checked)"],["no","Not verified"]]],
 ["reviewClientHistory","Client history",[["unknown","Not checked"],["positive","Positive history"],["mixed","Mixed or new"]]],
 ["reviewAutomation","AI suitability",[["unknown","Unknown"],["high","High for defined tasks"],["medium","Some tasks"],["low","Limited"]]],
 ["reviewPermission","Tool permissions",[["unknown","Not checked"],["allowed","Allowed / confirmed"],["manual","Manual-only requirement"],["prohibited","Automation prohibited"]]],
 ["reviewRisk","Data and scope risk",[["unknown","Not assessed"],["low","Low"],["medium","Review needed"],["high","High"]]]
];
const initial={title:"",platform:"Upwork",url:"",budget:"",type:"Fixed price",description:""};
const currencyInput={type:"number",min:0,step:"0.01"};
export default function FreelanceQualificationDesk({items=[],addJob,updateJob}){
 const [selected,setSelected]=useState(items[0]?.id||null);
 const [tab,setTab]=useState("pipeline");
 const [newJob,setNewJob]=useState(initial);
 const [filter,setFilter]=useState("");
 const [importText,setImportText]=useState("");
 const [importError,setImportError]=useState("");
 const [message,setMessage]=useState("");
 const chosen=items.find(j=>j.id===selected)||items[0]||null;
 const draft=chosen?.reviewProposalDraft||"";
 const report=useMemo(()=>chosen?qualify(chosen):null,[chosen]);
 const list=useMemo(()=>items.filter(j=>(j.title+" "+(j.description||"")).toLowerCase().includes(filter.toLowerCase())),[items,filter]);
 const change=(key,value)=>{if(!chosen)return;updateJob(chosen.id,{[key]:value});setMessage("");};
 const add=e=>{e.preventDefault();if(!newJob.title.trim())return;const id=addJob({...newJob,reviewFeePct:10,reviewPaymentVerified:"unknown",reviewClientHistory:"unknown",reviewPermission:"unknown",reviewRisk:"unknown",reviewAutomation:"unknown"});if(id)setSelected(id);setNewJob(initial);setTab("pipeline");setMessage("Opportunity saved in this browser. Verify source details before applying.");};
 const importJob=()=>{
  try{
   setImportError("");
   if(importText.length>18000)throw Error("Job import must be under 18,000 characters.");
   const p=JSON.parse(importText);
   if(!p||Array.isArray(p)||typeof p!=="object")throw Error("Paste one JSON job object.");
   const title=String(p.title||"").trim();
   const budget=Number(p.budget);
   const url=String(p.url||"").trim();
   if(!title||title.length>180||!Number.isFinite(budget)||budget<=0||budget>1000000)throw Error("Provide a valid title and positive fixed-price budget.");
   const parsed=new URL(url);
   if(parsed.protocol!=="https:"||!["upwork.com","www.upwork.com"].includes(parsed.hostname))throw Error("The URL must point to an Upwork job.");
   const jobId=(parsed.pathname.match(/~(02[0-9]+)/)||[])[1]||"";
   const existing=items.find(j=>jobId&&j.url?.includes(jobId));
   if(existing){setSelected(existing.id);setTab("pipeline");setMessage("This Upwork job is already in your local pipeline. No duplicate created.");return;}
   const id=addJob({title,platform:"Upwork",type:"Fixed price",budget,description:String(p.description||"").slice(0,6000),url:parsed.toString(),status:"Saved",upworkJobId:jobId,reviewConnects:Number.isInteger(Number(p.connects))&&Number(p.connects)>=0?Number(p.connects):"",reviewPaymentVerified:"unknown",reviewClientHistory:"unknown",reviewAutomation:"unknown",reviewPermission:"unknown",reviewRisk:"unknown",reviewFeePct:10,source:"Manually imported from ChatGPT; not a live SyncWorks Upwork connection"});
   if(id)setSelected(id);
   setImportText("");setTab("pipeline");setMessage("Imported for internal review. Recheck that the listing remains active; nothing was submitted or spent.");
  }catch(e){setImportError(e instanceof Error?e.message:"Could not parse job information.");}
 };
 const copy=async value=>{try{await navigator.clipboard.writeText(value);setMessage("Copied to clipboard. No external message was sent.");}catch{setMessage("Clipboard unavailable; select and copy the text manually.");}};
 const prepare=()=>{
  if(!chosen)return;
  const proposal="Hello,\n\nI'm interested in helping with "+chosen.title+". Based on your posting, I understand the work involves "+(chosen.description?.trim()?chosen.description.trim().slice(0,230):"[confirm the deliverables with the client]")+".\n\nBefore committing to a deadline, I'd confirm the exact scope, expected format, and any tools you require or prohibit. I can provide a clearly organized deliverable and check it against the agreed requirements.\n\nPlease share any examples or constraints I should follow.\n\nThank you.";
  updateJob(chosen.id,{reviewProposalDraft:proposal,status:chosen.status==="Saved"?"Proposal drafted":chosen.status});
  setTab("proposal");setMessage("Editable draft saved in this browser. Nothing was sent to Upwork.");
 };
 return <section className="sw-qual" aria-label="Freelance manager qualification">
   <header className="sw-qual-toolbar"><div><strong>Opportunity Intelligence</strong><small>Founder pilot · manual sources only · no bids or spending</small></div><span className="sw-qual-small">{items.length} tracked</span></header>
   <nav className="sw-qual-tabs" aria-label="Qualification views">
     <button type="button" className={tab==="pipeline"?"active":""} onClick={()=>setTab("pipeline")}><Search size={15}/> Pipeline</button>
     <button type="button" className={tab==="add"?"active":""} onClick={()=>setTab("add")}><Plus size={15}/> Add opportunity</button>
     <button type="button" className={tab==="proposal"?"active":""} onClick={()=>setTab("proposal")}><FilePenLine size={15}/> Proposal drafting</button>
   </nav>
   {message&&<div className="sw-qual-message" role="status">{message}<button type="button" onClick={()=>setMessage("")} aria-label="Dismiss">×</button></div>}
   {tab==="add"?<form className="sw-qual-add" onSubmit={add}>
     <div className="sw-qual-heading"><BriefcaseBusiness size={20}/><div><h3>Add a public freelance opportunity</h3><p>This saves an internal record; it does not import or submit to Upwork.</p></div></div>
     <div className="sw-qual-fields"><label>Job title<input required maxLength={180} value={newJob.title} onChange={e=>setNewJob(v=>({...v,title:e.target.value}))}/></label><label>Budget ($)<input {...currencyInput} required value={newJob.budget} onChange={e=>setNewJob(v=>({...v,budget:e.target.value}))}/></label><label>Source<input maxLength={80} value={newJob.platform} onChange={e=>setNewJob(v=>({...v,platform:e.target.value}))}/></label><label>Original posting (optional)<input type="url" placeholder="https://..." value={newJob.url} onChange={e=>setNewJob(v=>({...v,url:e.target.value}))}/></label></div>
     <div className="sw-qual-import"><strong>Fast import from ChatGPT</strong><p>Paste a public job summary as JSON with title, budget, url, description, and optional connects. This does not connect Upwork to the website.</p><textarea rows={3} placeholder='{"title":"Excel cleanup","budget":75,"url":"https://www.upwork.com/jobs/~02...","description":"Public requirements","connects":9}' value={importText} onChange={e=>setImportText(e.target.value)}/>{importError&&<p role="alert">{importError}</p>}<button type="button" disabled={!importText.trim()} onClick={importJob}>Import job for qualification</button></div>
     <label className="sw-qual-full">Public requirements<textarea rows={4} placeholder="Paste public scope and restrictions. Do not include confidential client material." value={newJob.description} onChange={e=>setNewJob(v=>({...v,description:e.target.value}))}/></label>
     <div className="sw-qual-actions"><button type="button" onClick={()=>setTab("pipeline")}>Back</button><button type="submit" className="primary">Save opportunity</button></div>
   </form>:tab==="proposal"?<div className="sw-qual-proposal"><div className="sw-qual-heading"><FilePenLine size={20}/><div><h3>Draft proposal — local only</h3><p>Uses the selected opportunity. It does not claim unverified experience or send applications.</p></div></div>
      {!chosen?<p>No saved opportunity selected.</p>:<><strong>{chosen.title}</strong><textarea value={draft} onChange={e=>updateJob(chosen.id,{reviewProposalDraft:e.target.value})} rows={10} placeholder="Choose Prepare proposal from Pipeline to populate an honest starting template."/><div className="sw-qual-actions"><button type="button" onClick={()=>setTab("pipeline")}>Review job</button><button className="primary" type="button" disabled={!draft.trim()} onClick={()=>copy(draft)}><ClipboardCopy size={14}/> Copy draft</button></div><p className="sw-qual-caution">Copying does not submit an Upwork proposal or spend Connects. Verify details, terms and platform rules before applying.</p></>}
     </div>:<div className="sw-qual-workspace">
      <aside className="sw-qual-list"><label className="sw-qual-search"><Search size={14}/><input aria-label="Filter saved jobs" placeholder="Search opportunities" value={filter} onChange={e=>setFilter(e.target.value)}/></label><div className="sw-qual-list-items">{!list.length?<p className="sw-qual-muted">No matching jobs. Add an opportunity to begin.</p>:list.map(j=>{const a=qualify(j);return <button type="button" key={j.id} className={"sw-qual-item "+(chosen?.id===j.id?"selected":"")} onClick={()=>setSelected(j.id)}><strong>{j.title}</strong><span>{money(j.budget)} advertised · {j.status||"Saved"}</span><small>{a.grade} · {a.points}/100</small></button>})}</div><button type="button" className="sw-qual-list-add" onClick={()=>setTab("add")}><Plus size={14}/> Add opportunity</button></aside>
      <div className="sw-qual-detail">{!chosen?<div className="sw-qual-empty">Choose or add an opportunity to qualify it.</div>:<>
       <div className="sw-qual-detail-head"><div><small>SELECTED JOB</small><h3>{chosen.title}</h3><p>{money(chosen.budget)} proposed value · {chosen.platform||"Source unknown"} · <span>not a verified live posting</span></p></div><div className="sw-qual-score"><strong>{report.points===0&&report.required.length?"—":report.points+"/100"}</strong><span>{report.points===0&&report.required.length?"Not evaluated":report.grade}</span></div></div>
       <div className="sw-qual-metrics"><div><small>{report.provisional?"Illustrative net*":"Estimated net*"}</small><strong>{money(report.projectedNet)}</strong></div><div><small>Estimated / hour*</small><strong>{report.effectiveHourly===null?"Unknown":money(report.effectiveHourly)}</strong></div><div><small>Fees estimate</small><strong>{money(report.fees)}</strong></div><div><small>Expenses estimate</small><strong>{money(report.expense)}</strong></div></div>
       <div className="sw-qual-controls">
         <div className="sw-qual-fields">{fields.map(([key,label,choices])=><label key={key}>{label}<select value={chosen[key]||"unknown"} onChange={e=>change(key,e.target.value)}>{choices.map(([value,text])=><option value={value} key={value}>{text}</option>)}</select></label>)}
         <label>Estimated hours<input type="number" min="0" step=".25" value={chosen.reviewHours??""} placeholder="Unknown" onChange={e=>change("reviewHours",e.target.value)}/></label><label>Platform fee (%)<input type="number" min="0" max="50" step=".1" value={chosen.reviewFeePct??10} onChange={e=>change("reviewFeePct",e.target.value)}/></label><label>Other cash costs ($)<input {...currencyInput} value={chosen.reviewCashCost??""} onChange={e=>change("reviewCashCost",e.target.value)}/></label><label>Connects needed<input type="number" min="0" step="1" value={chosen.reviewConnects??""} onChange={e=>change("reviewConnects",e.target.value)}/></label><label>Actual cost / Connect ($)<input {...currencyInput} value={chosen.reviewConnectCost??""} onChange={e=>change("reviewConnectCost",e.target.value)}/></label><label>Deadline / expected due date<input type="date" value={chosen.reviewDeadline||""} onChange={e=>change("reviewDeadline",e.target.value)}/></label></div>
         <label className="sw-qual-full">Public requirements<textarea rows={3} value={chosen.description||""} placeholder="Include deliverables and any restrictions." onChange={e=>change("description",e.target.value)}/></label>
       </div>
       <div className="sw-qual-result"><div className="sw-qual-result-head"><SlidersHorizontal size={14}/><strong>Qualification checklist</strong><span>{report.required.length} to verify</span></div>{report.flags.length>0&&<p className="sw-qual-alert"><AlertTriangle size={14}/>{report.flags.join(" · ")}</p>}{report.required.length?<div className="sw-qual-checklist">{report.required.map(x=><p key={x}><AlertTriangle size={12}/>{x}</p>)}</div>:<p className="sw-qual-good"><CheckCircle2 size={14}/> Screening fields completed. Verify sources before spending.</p>}</div>
       <footer className="sw-qual-detail-actions"><button type="button" onClick={()=>copy(createReviewBrief(chosen,report))}><ClipboardCopy size={14}/> Copy manager briefing</button><button type="button" className="primary" onClick={prepare}><FilePenLine size={14}/> Prepare proposal draft</button>{chosen.url&&<a href={chosen.url} target="_blank" rel="noopener noreferrer">Original posting <ArrowUpRight size={13}/></a>}</footer>
       <p className="sw-qual-caution">*Manual projections before taxes, not earned income or hiring probability. Score is a rules-based checklist, not an AI confidence measure. No external application or payment action is connected.</p>
      </>}</div>
     </div>}
   </section>;
}
