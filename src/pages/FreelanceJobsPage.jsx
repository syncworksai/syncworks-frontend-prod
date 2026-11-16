import React, { useMemo, useState } from "react";
import { ExternalLink, Plus, Search, SlidersHorizontal, ClipboardCopy, Sparkles, Trash2, Clock3, ShieldCheck } from "lucide-react";

const STATUSES=["Saved","Proposal drafted","Applied","Interview","Contracted","In progress","Submitted","Paid","Declined"];
const input="w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-sm text-slate-100 outline-none focus:border-cyan-400";
const btn="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/15 px-4 py-2.5 text-sm font-bold text-cyan-100 hover:bg-cyan-500/25";
const fmt=n=>Number(n||0).toLocaleString("en-US",{style:"currency",currency:"USD"});
const number=(v)=>Math.max(0,Number(v)||0);
const timeOptions=["Under 30 min","30–60 min","1–2 hours","2–5 hours","Over 5 hours","Unknown"];
const automationOptions=["High","Medium","Low","Unknown"];
const riskOptions=["Low","Review needed","High","Unknown"];
function estimateMinutes(label){return {"Under 30 min":30,"30–60 min":60,"1–2 hours":120,"2–5 hours":300,"Over 5 hours":480}[label]||null;}
function jobScore(job) {
 if(job.type==="Hourly")return {label:"Hourly listing",detail:"Rate is hourly, not a fixed project payout; review hours and schedule separately",hourly:null,tone:"text-slate-300"};
 const budget=number(job.budget),minutes=estimateMinutes(job.estimate),automation=job.automation||"Unknown",risk=job.risk||"Unknown";
 const hourly=minutes?budget/(minutes/60):null;
 if(!hourly)return {label:"Needs review",detail:"Add a time estimate before deciding",hourly:null,tone:"text-slate-300"};
 if(risk==="High")return {label:"High caution",detail:"Check restrictions, accuracy and data handling first",hourly,tone:"text-rose-300"};
 if(hourly>=30&&automation==="High"&&risk==="Low")return {label:"Strong candidate",detail:"Promising estimate—not an offer or guaranteed rate",hourly,tone:"text-emerald-300"};
 if(hourly>=18&&risk!=="High")return {label:"Worth reviewing",detail:"Confirm deliverables, client terms and automation approval",hourly,tone:"text-amber-200"};
 return {label:"Low priority",detail:"Estimated return may not justify the work",hourly,tone:"text-slate-300"};
}
function copyText(value){if(navigator.clipboard?.writeText)return navigator.clipboard.writeText(value);}
function Select({label,value,options,onChange}){return <label className="block min-w-0 text-xs text-slate-400">{label}<select className={`${input} mt-1`} value={value} onChange={e=>onChange(e.target.value)}>{options.map(s=><option key={s}>{s}</option>)}</select></label>;}
function DataField({label,value,onChange,placeholder,type="text",required=false}){return <label className="block min-w-0 text-xs text-slate-400">{label}<input type={type} className={`${input} mt-1`} value={value} onChange={e=>onChange(e.target.value)} required={required} placeholder={placeholder}/></label>;}
function Opportunity({job,updateJob,deleteJob}){
 const [expanded,setExpanded]=useState(false),[copyStatus,setCopyStatus]=useState("");
 const score=jobScore(job);
 const prompt=[`Evaluate this freelance opportunity for the SyncWorks founder as a potential small fixed-price contract.`,
 `Title: ${job.title}`,`Source: ${job.platform||"Upwork"}`,`URL: ${job.url||"Not supplied"}`,
 `Budget: ${fmt(job.budget)}; Type: ${job.type||"Fixed price"}`,
 `Project description: ${job.description||"No description recorded. Ask for the missing requirements."}`,
 `My estimate: ${job.estimate||"Unknown"}; Automation fit: ${job.automation||"Unknown"}; Risk: ${job.risk||"Unknown"}.`,
 "Assess scope, feasibility, platform/client automation permission, required verification, potential effective earnings after fees and proposal cost, and whether to apply. Do not assert that this is a live/verified posting. Draft a concise honest proposal but do not submit, contact anyone, or use confidential client data."].join("\n");
 return <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:p-5">
  <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1">
   <h3 className="text-base font-bold text-white">{job.title}</h3><p className="mt-1 text-xs text-slate-400">{job.platform||"Freelance"} · {job.type||"Fixed price"} · {fmt(job.budget)} {job.type==="Hourly"?"hourly advertised rate":"estimated budget"}</p>
  </div><div className="flex gap-2"><button className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-200 hover:bg-white/10" onClick={()=>setExpanded(v=>!v)} type="button" aria-expanded={expanded}>{expanded?"Close details":"Evaluate"}</button><button type="button" title="Delete local record" aria-label={`Delete ${job.title}`} className="rounded-xl border border-rose-400/20 p-2 text-rose-300 hover:bg-rose-500/10" onClick={()=>{if(window.confirm("Delete this local opportunity?"))deleteJob(job.id)}}><Trash2 size={16}/></button></div></div>
  <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><div><span className={`text-xs font-bold ${score.tone}`}>{score.label}</span>{score.hourly!==null&&<span className="ml-2 text-xs text-slate-400">~{fmt(score.hourly)}/estimated work hour</span>}</div><Select label="Pipeline" value={job.status||"Saved"} options={STATUSES} onChange={status=>updateJob(job.id,{status})}/></div>
  {job.url&&<a className="mt-3 inline-flex items-center gap-1 text-xs text-cyan-200 hover:underline" target="_blank" rel="noopener noreferrer" href={job.url}>View original job <ExternalLink size={13}/></a>}
  {expanded&&<div className="mt-5 space-y-4 border-t border-white/10 pt-4">
  <p className="text-sm text-slate-400">{score.detail}. All scoring is based on your manual assumptions, not a verified hiring probability.</p>
  <div className="grid gap-3 sm:grid-cols-3">
   <Select label="Estimated hands-on time" value={job.estimate||"Unknown"} options={timeOptions} onChange={estimate=>updateJob(job.id,{estimate})}/>
   <Select label="Automation potential" value={job.automation||"Unknown"} options={automationOptions} onChange={automation=>updateJob(job.id,{automation})}/>
   <Select label="Compliance / scope risk" value={job.risk||"Unknown"} options={riskOptions} onChange={risk=>updateJob(job.id,{risk})}/>
  </div>
  <label className="block text-xs text-slate-400">Job description / requirements<textarea rows={5} className={`${input} mt-1`} value={job.description||""} onChange={e=>updateJob(job.id,{description:e.target.value})} placeholder="Paste the public job description. Avoid confidential client information."/></label>
  <label className="block text-xs text-slate-400">Private review notes<textarea rows={3} className={`${input} mt-1`} value={job.notes||""} onChange={e=>updateJob(job.id,{notes:e.target.value})} placeholder="Questions to ask, proposal budget, due dates..."/></label>
  <div className="flex flex-wrap gap-2"><button className={btn} onClick={async()=>{try{await copyText(prompt);setCopyStatus("Prompt copied");}catch{setCopyStatus("Copy unavailable on this device");}}} type="button"><ClipboardCopy size={15}/> Copy Jarvis briefing</button><button className={btn} type="button" onClick={()=>updateJob(job.id,{status:"Proposal drafted"})}><Sparkles size={15}/> Mark proposal drafted</button></div>
  {copyStatus&&<p role="status" className="text-xs text-slate-300">{copyStatus}. Open Sync Assist from the Jarvis tab and paste it there.</p>}
  </div>}
 </article>;
}
const initialForm={title:"",platform:"Upwork",url:"",budget:"",type:"Fixed price",estimate:"Unknown",automation:"Unknown",risk:"Unknown",description:""};
export default function FreelanceJobsPage({items,addJob,updateJob,deleteJob}){
 const [showForm,setShowForm]=useState(false),[form,setForm]=useState(initialForm),[query,setQuery]=useState(""),[status,setStatus]=useState("All"),[sort,setSort]=useState("Newest tracked");
 const patch=(key,value)=>setForm(v=>({...v,[key]:value}));
 const filtered=useMemo(()=>items.filter(j=>(status==="All"||j.status===status)&&(`${j.title} ${j.platform} ${j.description||""}`.toLowerCase().includes(query.toLowerCase()))).sort((a,b)=>sort==="Largest budget"?number(b.budget)-number(a.budget):sort==="Smallest budget"?number(a.budget)-number(b.budget):0),[items,status,query,sort]);
 return <section>
  <div className="mb-5"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-200"><Search size={15}/> Opportunity pipeline</div><h2 className="mt-1 text-2xl font-bold text-white">Find, evaluate, and win jobs</h2><p className="mt-2 text-sm text-slate-400">Save opportunities from Upwork or elsewhere, check automation fit, prepare Jarvis briefings, and track each application. This page does not search or submit jobs automatically.</p></div>
  <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Tracked",items.length],["Saved",items.filter(j=>j.status==="Saved").length],["Applied",items.filter(j=>j.status==="Applied").length],["Contracted",items.filter(j=>["Contracted","In progress","Submitted"].includes(j.status)).length]].map(([label,value])=><div className="rounded-xl border border-white/10 bg-slate-900/70 p-4" key={label}><p className="text-xs text-slate-400">{label}</p><p className="mt-2 text-2xl font-bold text-white">{value}</p></div>)}</div>
  <div className="mb-4 flex flex-wrap gap-3"><button type="button" className={btn} onClick={()=>setShowForm(v=>!v)}><Plus size={16}/> {showForm?"Close form":"Add job"}</button><a target="_blank" rel="noopener noreferrer" href="https://www.upwork.com/nx/find-work/" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-200 hover:bg-white/5">Find jobs on Upwork <ExternalLink size={14}/></a></div>
  {showForm&&<form className="mb-5 space-y-4 rounded-2xl border border-cyan-400/20 bg-slate-900/80 p-4 sm:p-5" onSubmit={e=>{e.preventDefault();if(!form.title.trim())return;addJob(form);setForm(initialForm);setShowForm(false);}}>
   <h3 className="font-semibold text-white">Record an opportunity</h3><div className="grid gap-3 sm:grid-cols-2">
    <DataField label="Project title" required value={form.title} onChange={v=>patch("title",v)} placeholder="e.g. Clean 2,000 spreadsheet records"/>
    <DataField label="Marketplace / source" value={form.platform} onChange={v=>patch("platform",v)} placeholder="Upwork"/>
    <DataField label="Project budget ($)" type="number" value={form.budget} onChange={v=>patch("budget",v)} placeholder="75"/>
    <Select label="Contract type" value={form.type} options={["Fixed price","Hourly","Unknown"]} onChange={v=>patch("type",v)}/>
    <DataField label="Public posting URL (optional)" type="url" value={form.url} onChange={v=>patch("url",v)} placeholder="https://www.upwork.com/..."/>
    <Select label="Estimated hands-on time" value={form.estimate} options={timeOptions} onChange={v=>patch("estimate",v)}/>
    <Select label="Automation potential" value={form.automation} options={automationOptions} onChange={v=>patch("automation",v)}/>
    <Select label="Risk / approval review" value={form.risk} options={riskOptions} onChange={v=>patch("risk",v)}/>
   </div>
   <label className="block text-xs text-slate-400">Public job description<textarea className={`${input} mt-1`} rows={4} value={form.description} onChange={e=>patch("description",e.target.value)} placeholder="Paste the listing details here. Do not paste confidential client data."/></label>
   <button className={btn} type="submit">Save opportunity</button>
  </form>}
  <div className="mb-4 grid gap-3 sm:grid-cols-3">
   <label className="relative block sm:col-span-1"><Search className="pointer-events-none absolute left-3 top-3.5 text-slate-500" size={16}/><input className={`${input} pl-10`} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search tracked jobs" aria-label="Search tracked opportunities"/></label>
   <Select label="Filter status" value={status} options={["All",...STATUSES]} onChange={setStatus}/>
   <Select label="Sort" value={sort} options={["Newest tracked","Largest budget","Smallest budget"]} onChange={setSort}/>
  </div>
  <div className="mb-3 flex items-center gap-2 text-xs text-slate-400"><SlidersHorizontal size={14}/> {filtered.length} tracked {filtered.length===1?"opportunity":"opportunities"}<Clock3 size={14} className="ml-2"/> Estimates are illustrative</div>
  <div className="space-y-3">{filtered.length?filtered.map(j=><Opportunity key={j.id} job={j} updateJob={updateJob} deleteJob={deleteJob}/>):<div className="rounded-xl border border-dashed border-white/15 p-8 text-center"><ShieldCheck className="mx-auto mb-3 text-slate-500" size={22}/><p className="font-semibold text-slate-200">No matching jobs recorded</p><p className="mt-1 text-sm text-slate-400">Add a public posting to start evaluating. Your Upwork account is not connected.</p></div>}</div>
 </section>;
}
