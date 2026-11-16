import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FileSpreadsheet, ShieldCheck, Download, AlertTriangle, RotateCcw, ClipboardCheck, Bot, FileCheck2 } from "lucide-react";

const card="rounded-2xl border border-white/10 bg-slate-900/75 p-5";
const input="w-full rounded-xl border border-white/15 bg-slate-950 p-2.5 text-sm text-slate-100";
const button="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/25";
const MAX_BYTES=2*1024*1024, MAX_ROWS=10000,MAX_COLS=100;
const SAMPLE='Name,Email,City,Amount\n Alice Smith ,ALICE@example.com,Montgomery,120\nAlice Smith,alice@example.com,Montgomery,120\n Bob Jones ,BOB@example.com,Birmingham,95\n,, ,\nChris Lane,chris@example.com,Mobile,55\n';
function parseCSV(inputText){
 const text=String(inputText||"").replace(/^\uFEFF/,"");
 const rows=[];let row=[],field="",quoted=false;
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(quoted){if(ch==='"'&&text[i+1]==='"'){field+='"';i++;}else if(ch==='"'){quoted=false;}else field+=ch;}
  else if(ch==='"'){if(field!=="")throw Error("Unexpected quote inside a field");quoted=true;}
  else if(ch===","){row.push(field);field="";}
  else if(ch==="\n"||ch==="\r"){if(ch==="\r"&&text[i+1]==="\n")i++;row.push(field);rows.push(row);row=[];field="";if(rows.length>MAX_ROWS+1)throw Error("This demo supports a maximum of 10,000 data rows");}
  else field+=ch;
 }
 if(quoted)throw Error("CSV contains an unclosed quoted field");
 if(field!==""||row.length){row.push(field);rows.push(row);}
 if(!rows.length||!rows[0].length)throw Error("CSV must contain a header row");
 if(rows[0].length>MAX_COLS)throw Error("CSV contains more than 100 columns");
 return rows;
}
function csvCell(s){let v=String(s??"");if(/^[\s]*[=+@\-\t\r]/.test(v))v="'"+v;return /[",\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}
function asCSV(rows){return rows.map(r=>r.map(csvCell).join(",")).join("\r\n")+"\r\n";}
function cleanData(rows,{trim,removeEmpty,dedupe,matchColumn,lowercaseEmail}){
 const columns=rows[0].map(x=>String(x||"").trim());
 if(columns.some(x=>!x))throw Error("Every column must have a nonempty header");
 if(new Set(columns.map(x=>x.toLowerCase())).size!==columns.length)throw Error("Column names must be unique");
 const index=columns.indexOf(matchColumn),seen=new Set(),output=[],flags=[];
 let empties=0,dupes=0,normalized=0;
 rows.slice(1).forEach((original,idx)=>{
  if(original.length!==columns.length){flags.push({row:idx+2,issue:`Column count ${original.length} differs from ${columns.length}`});return;}
  const values=original.map((raw,i)=>{
   let v=String(raw??"");
   if(trim)v=v.trim();
   if(lowercaseEmail&&/e-?mail/i.test(columns[i]))v=v.toLowerCase();
   if(v!==String(raw??""))normalized++;
   return v;
  });
  if(removeEmpty&&values.every(x=>!x.trim())){empties++;return;}
  // Duplicate keys exclude rows with missing match-column data to avoid merging unrelated records.
  const key=index>=0?values[index].toLocaleLowerCase():values.join("\u001f").toLocaleLowerCase();
  if(dedupe&&key.trim()&&seen.has(key)){dupes++;return;}
  if(key.trim())seen.add(key);
  output.push(values);
 });
 return {columns,rows:output,flags,counts:{source:rows.length-1,cleaned:output.length,emptyRemoved:empties,duplicatesRemoved:dupes,normalizedCells:normalized,flagged:flags.length}};
}
function download(filename,text,type){const blob=new Blob([text],{type});const url=URL.createObjectURL(blob);const anchor=document.createElement("a");anchor.href=url;anchor.download=filename;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export default function FreelanceAutomationStudio({items,updateJob}){
 const [params,setParams]=useSearchParams();
 const selectedJob=params.get("job")||"";
 const [source,setSource]=useState(""),[filename,setFilename]=useState("sample.csv"),[error,setError]=useState("");
 const [options,setOptions]=useState({trim:true,removeEmpty:true,dedupe:true,matchColumn:"",lowercaseEmail:true});
 const [result,setResult]=useState(null),[reviewed,setReviewed]=useState(false),[sourceMode,setSourceMode]=useState("sample");
 const project=items.find(j=>j.id===selectedJob);
 const preview=useMemo(()=>{try{return source?parseCSV(source):null;}catch{return null;}},[source]);
 const headers=preview?.[0]||[];
 const inspect=()=>{
  setError("");setReviewed(false);
  try {
   if(!source.trim())throw Error("Choose a sample or local CSV first.");
   if(new Blob([source]).size>MAX_BYTES)throw Error("Maximum CSV size is 2 MB for this pilot.");
   const rows=parseCSV(source);
   const output=cleanData(rows,options);
   setResult({...output,filename});
  }catch(err){setResult(null);setError(err.message||"Unable to process file");}
 };
 const loadFile=async (file)=>{
  if(!file)return;setResult(null);setReviewed(false);setError("");
  if(!file.name.toLowerCase().endsWith(".csv")){setError("This pilot currently supports CSV only; Excel and PDF need a secure processing backend.");return;}
  if(file.size>MAX_BYTES){setError("This demo accepts CSV files up to 2 MB.");return;}
  const value=await file.text();setSource(value);setFilename(file.name);setSourceMode("local");setOptions(o=>({...o,matchColumn:""}));
 };
 const reset=()=>{setSource("");setResult(null);setError("");setReviewed(false);setFilename("sample.csv");setSourceMode("sample");};
 const report=()=>({mode:"Local CSV rule-based processor",job:project?.title||"Unassigned",file:filename,rules:options,counts:result.counts,flags:result.flags,reviewed,createdAt:new Date().toISOString(),note:"Processing occurred in this browser. No AI or Upwork account processing was involved. Verify deliverables independently."});
 const [copyMessage,setCopyMessage]=useState("");
 const jarvisPrompt=`Help me validate and plan delivery for ${project?.title||"a freelance CSV cleanup project"}. Determine what checks are needed for deduplication, schema matching, missing fields, reconciliation, and CSV formula injection. No actual client data is included in this request. Ask for approval before any external delivery.`;
 return <section>
  <div className="mb-5"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cyan-200"><FileSpreadsheet size={15}/> Local automation pilot</p><h2 className="mt-1 text-2xl font-bold text-white">AI Automation Studio</h2><p className="mt-2 max-w-3xl text-sm text-slate-400">Start with a working, deterministic CSV cleanup tool. Parsing and downloads happen in this browser. AI-assisted transformations, remote jobs, cloud storage, Excel and PDF processing are not yet connected.</p></div>
  <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-500/5 p-4 text-xs leading-5 text-amber-100"><AlertTriangle className="mt-0.5 shrink-0" size={18}/><span>Use synthetic or non-confidential test CSV files only. The pilot has no server-enforced account entitlement or approved client-data storage. Files remain in browser memory and are not intentionally persisted, but this is not yet a production privacy guarantee.</span></div>
  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
   <div className="space-y-4">
    <div className={card}>
     <h3 className="font-bold text-white">1. Select project and source</h3>
     <label className="mt-3 block text-xs text-slate-400">Associated project<select className={`${input} mt-1`} value={selectedJob} onChange={e=>setParams(e.target.value?{job:e.target.value}:{})}><option value="">Practice / unassigned</option>{items.filter(j=>["Contracted","In progress","Submitted","Paid"].includes(j.status)).map(j=><option value={j.id} key={j.id}>{j.title}</option>)}</select></label>
     <div className="mt-4 flex flex-wrap gap-2"><button type="button" className={button} onClick={()=>{setSource(SAMPLE);setFilename("sample.csv");setSourceMode("sample");setResult(null);setReviewed(false);setError("");setOptions(o=>({...o,matchColumn:""}));}}>Load synthetic sample</button><button type="button" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm text-slate-300" onClick={reset}><RotateCcw size={14}/> Clear</button></div>
     <label className="mt-4 block text-xs text-slate-400">Or select a local CSV file (demo only, 2 MB max)<input type="file" accept=".csv,text/csv" className="mt-2 block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-500/15 file:px-3 file:py-2 file:text-cyan-100" onChange={e=>{loadFile(e.target.files?.[0]).catch(()=>setError("Unable to read the selected file"));e.target.value="";}}/></label>
     <p className="mt-2 text-xs text-slate-500">Current source: {source?filename:"None"} · {sourceMode==="sample"?"Synthetic sample mode":"Local file read"}</p>
     {source&&<div className="mt-3 overflow-x-auto rounded-xl border border-white/10"><table className="min-w-full text-left text-xs"><thead className="bg-slate-800/70"><tr>{headers.map((col,i)=><th key={i} className="px-3 py-2 text-slate-300">{col}</th>)}</tr></thead><tbody>{(preview||[]).slice(1,4).map((row,i)=><tr key={i}>{row.map((v,j)=><td key={j} className="max-w-[200px] truncate border-t border-white/5 px-3 py-2 text-slate-400">{v}</td>)}</tr>)}</tbody></table></div>}
    </div>
    <div className={card}><h3 className="font-bold text-white">2. Configure cleanup rules</h3><div className="mt-4 grid gap-3 sm:grid-cols-2">{[["trim","Trim spaces"],["removeEmpty","Remove entirely blank rows"],["dedupe","Remove duplicate records"],["lowercaseEmail","Normalize email columns"]].map(([key,label])=><label className="flex items-center gap-2 text-sm text-slate-300" key={key}><input type="checkbox" checked={options[key]} onChange={e=>{setOptions(o=>({...o,[key]:e.target.checked}));setResult(null);setReviewed(false);}}/>{label}</label>)}</div>
     <label className="mt-4 block text-xs text-slate-400">Duplicate match key<select className={`${input} mt-1`} value={headers.includes(options.matchColumn)?options.matchColumn:""} onChange={e=>{setOptions(o=>({...o,matchColumn:e.target.value}));setResult(null);setReviewed(false);}}><option value="">Exact whole-row match</option>{headers.map((h,i)=><option key={i} value={h}>{h}</option>)}</select></label>
     <p className="mt-2 text-xs text-slate-500">When matching on a single column, the first record is kept; conflicts are not merged. Review before using this on real work.</p>
     <button className={`${button} mt-4`} type="button" onClick={inspect}>Process and inspect <ClipboardCheck size={16}/></button>
     {error&&<p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
    </div>
    {result&&<div className={card}><h3 className="flex items-center gap-2 font-bold text-white"><FileCheck2 size={17}/> 3. Review results</h3><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{Object.entries(result.counts).map(([key,value])=><div className="rounded-xl border border-white/10 bg-slate-950/65 p-3" key={key}><p className="text-[11px] capitalize text-slate-400">{key.replace(/([A-Z])/g," $1")}</p><p className="mt-1 text-xl font-bold text-white">{value}</p></div>)}</div>
     {result.flags.length>0&&<div className="mt-4 rounded-xl border border-amber-400/20 p-3"><p className="text-sm font-semibold text-amber-200">Rows requiring manual review</p>{result.flags.slice(0,30).map((f,i)=><p className="mt-1 text-xs text-slate-300" key={i}>Row {f.row}: {f.issue}</p>)}{result.flags.length>30&&<p className="text-xs text-slate-400">See report for remaining issues.</p>}</div>}
     <label className="mt-4 flex items-start gap-2 text-sm text-slate-300"><input className="mt-1" type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>I checked the output and understand its limitations. Flagged source rows are excluded from this export.</label>
     <div className="mt-4 flex flex-wrap gap-2"><button type="button" className={button} disabled={!reviewed} onClick={()=>download(filename.replace(/\.csv$/i,"")+"_cleaned.csv",asCSV([result.columns,...result.rows]),"text/csv;charset=utf-8") }><Download size={15}/> Download cleaned CSV</button><button type="button" className={button} onClick={()=>download("cleanup-report.json",JSON.stringify(report(),null,2),"application/json")}><Download size={15}/> Download change report</button></div>
     {project&&<button className="mt-3 text-sm font-semibold text-cyan-200 disabled:text-slate-500" type="button" disabled={!reviewed} onClick={()=>updateJob(project.id,{projectStudioReviewedAt:new Date().toISOString()})}>Record review in project checklist</button>}
    </div>}
   </div>
   <aside className="space-y-4">
    <div className={card}><h3 className="flex items-center gap-2 font-bold text-white"><Bot size={17}/> Jarvis companion</h3><p className="mt-2 text-sm text-slate-400">Generate a safe evaluation prompt, then paste it into Sync Assist. The studio does not yet have a direct AI execution API.</p><button className={`${button} mt-4`} onClick={async()=>{try{await navigator.clipboard.writeText(jarvisPrompt);setCopyMessage("Briefing copied. Open Jarvis from the Freelance hub.");}catch{setCopyMessage("Copy not available on this device.");}}} type="button">Copy validation briefing</button>{copyMessage&&<p role="status" className="mt-2 text-xs text-slate-300">{copyMessage}</p>}</div>
    <div className={card}><h3 className="flex items-center gap-2 font-bold text-white"><ShieldCheck size={17}/> Automation roadmap</h3><div className="mt-3 space-y-3 text-sm text-slate-300"><p><strong className="text-emerald-200">Ready:</strong> Local CSV parser, configurable cleanup rules, duplicate detection, reporting, reviewed downloads.</p><p><strong className="text-amber-200">Next:</strong> XLSX/PDF extraction, format-preserving conversion, per-project versioning, preview/diff and exception approvals.</p><p><strong className="text-slate-300">Blocked:</strong> Secure client uploads, hosted Jarvis execution, asynchronous processing and platform delivery until backend auth, storage and integration are implemented.</p></div></div>
   </aside>
  </div>
 </section>;
}
