import React,{useMemo,useState} from "react";
import {Clock3,ShoppingCart,Camera,ClipboardList} from "lucide-react";
import {demoPeople} from "./sterlingDemoData";
const KEY="sw-private-sterling-hr-v1";
const now=()=>new Date().toISOString();
const initial=()=>({clockEvents:demoPeople.slice(0,12).map((p,i)=>{const shift=new Date();shift.setHours(7+Math.floor(i/6),i%6*5,0,0);return {employeeId:p.id,at:shift.toISOString(),action:"CLOCK_IN",jobId:null,simulated:true}}),jobNotes:{},parts:[],notifications:[]});
function load(){try{const v=JSON.parse(localStorage.getItem(KEY)||"null");return v&&Array.isArray(v.clockEvents)?{...initial(),...v}:initial()}catch{return initial()}}
function formatStamp(value){return value?new Date(value).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}):"Not recorded";}
export function useSterlingHR(){
 const [state,setState]=useState(load);
 const update=fn=>setState(old=>{const next=fn(old);try{localStorage.setItem(KEY,JSON.stringify(next))}catch{/* temporary browser simulator */}return next});
 const record=(employeeId,action,jobId)=>update(s=>({...s,clockEvents:[...s.clockEvents,{employeeId,action,jobId:jobId||null,at:now(),simulated:true}]}));
 const saveNote=(jobId,note)=>update(s=>({...s,jobNotes:{...s.jobNotes,[jobId]:note}}));
 const addPart=(jobId,part)=>update(s=>({...s,parts:[...s.parts,{jobId,part,addedAt:now()}]}));
 const reset=()=>{try{localStorage.removeItem(KEY)}catch{/* ignore */}setState(initial())};
 return {state,record,saveNote,addPart,reset};
}
function lastEvent(events,id){return events.filter(e=>e.employeeId===id).at(-1)||null;}
export function rosterSnapshot(jobs,events=[]){
 const open=jobs.filter(j=>!["PAID","INVOICED","COMPLETED","CANCELLED"].includes(j.status));
 return demoPeople.map(person=>{
  const assignments=open.filter(j=>j.technicianId===person.id);
  const latest=lastEvent(events,person.id);
  const active=latest ? latest.action!=="CLOCK_OUT":false;
  const scheduledMinutes=assignments.reduce((sum,j)=>sum+(j.siteMinutes||60)+(j.travelMinutes||0),0);
  return {...person,assignments,latest,clockedIn:active,scheduledMinutes,capacityMinutes:480,idle:assignments.length===0||scheduledMinutes<180,utilization:Math.min(100,Math.round(scheduledMinutes/480*100))};
 });
}
function classify(action){return action.replaceAll("_"," ").toLowerCase();}
export function WorkforceDemo({jobs,hr,openJob}){
 const {state,record,saveNote,addPart}=hr;
 const roster=useMemo(()=>rosterSnapshot(jobs,state.clockEvents),[jobs,state.clockEvents]);
 const [selected,setSelected]=useState(roster[0]?.id||1);
 const [note,setNote]=useState("");
 const [part,setPart]=useState("");
 const [photoNames,setPhotoNames]=useState([]);
 const [message,setMessage]=useState("");
 const member=roster.find(p=>p.id===selected)||roster[0];
 const assigned=member?.assignments||[];
 const last=member?.latest;
 const noteJob=assigned[0]?.id||jobs.find(j=>j.technicianId===selected)?.id;
 const clockInCount=roster.filter(x=>x.clockedIn).length;
 const idleCount=roster.filter(x=>x.idle).length;
 const action=(kind,jobId)=>{
  if(kind!=="CLOCK_IN"&&kind!=="CLOCK_OUT"&&!jobId){setMessage("Assign a job before recording travel or on-site milestones.");return}
  if(kind==="CLOCK_IN"&&member.clockedIn){setMessage("Already clocked in.");return}
  if(kind==="CLOCK_OUT"&&!member.clockedIn){setMessage("Not clocked in.");return}
  if(!["CLOCK_IN","CLOCK_OUT"].includes(kind)&&!member.clockedIn){setMessage("Clock in first.");return}
  record(member.id,kind,jobId);setMessage(classify(kind)+" recorded in the local demo timesheet.");
 };
 return <div className="sterling-hr">
 <div className="sterling-stats">
  <div className="sterling-stat"><span>Clocked in</span><strong>{clockInCount} / {roster.length}</strong><small>Simulated shift state</small></div>
  <div className="sterling-stat"><span>Under-scheduled</span><strong>{idleCount}</strong><small>Less than 3h allocated or no open job</small></div>
  <div className="sterling-stat"><span>Active assignments</span><strong>{roster.reduce((s,p)=>s+p.assignments.length,0)}</strong><small>Ticket-to-technician workload</small></div>
  <div className="sterling-stat"><span>Timeclock events</span><strong>{state.clockEvents.length}</strong><small>Stored only in this browser</small></div>
 </div>
 <div className="sterling-grid-two">
  <section className="sterling-panel"><header className="sterling-panel-head"><h2>Workforce availability & idle technicians</h2></header><div className="sterling-rows">
   {roster.slice().sort((a,b)=>Number(b.idle)-Number(a.idle)||b.sla-a.sla).map(p=><button className="sterling-data-row" key={p.id} onClick={()=>{setSelected(p.id);setMessage("");}}><span className="sterling-row-main"><strong>{p.name}</strong><small>{p.trade} · {p.assignments.length} active jobs · {Math.round(p.scheduledMinutes/60*10)/10}h allocated</small></span><span className={"sterling-chip "+(p.idle?"sterling-chip-urgent":"sterling-chip-good")}>{p.idle?"Under-scheduled":p.utilization+"% booked"}</span></button>)}
  </div></section>
  <section className="sterling-panel"><header className="sterling-panel-head"><h2>Technician timeclock · {member?.name}</h2></header>
   <p className="sterling-muted">This demonstration separates employee shift time from ticket travel, arrival, work and completion milestones.</p>
   <div className="sterling-hr-actions"><button onClick={()=>action(member.clockedIn?"CLOCK_OUT":"CLOCK_IN")}><Clock3 size={16}/>{member.clockedIn?"Clock out":"Clock in"}</button>
   <select aria-label="Select technician" value={selected} onChange={e=>{setSelected(Number(e.target.value));setMessage("");}}>{roster.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
   <div className="sterling-hr-job"><strong>Current assignment</strong>{assigned.length?<button onClick={()=>openJob(assigned[0])}>{assigned[0].id} · {assigned[0].customer}</button>:<p className="sterling-muted">No open assignment. Dispatch can allocate work.</p>}</div>
   <div className="sterling-hr-actions">{[["EN_ROUTE","En route"],["ARRIVED","Arrived"],["START_WORK","Start job"],["COMPLETED","Finish job"]].map(([type,label])=><button key={type} disabled={!member.clockedIn||!assigned.length} onClick={()=>action(type,assigned[0]?.id)}>{label}</button>)}</div>
   <p className="sterling-muted">Last recorded event: {last?classify(last.action)+" · "+formatStamp(last.at):"No shift events recorded"}</p>
   {message&&<p className="sterling-hr-message" role="status">{message}</p>}
   <div className="sterling-hr-divider"/>
   <h3>Job completion checklist</h3>
   <label>Technician notes<textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Diagnosis, completed work, follow-up needed…"/></label>
   <div className="sterling-hr-actions"><button disabled={!noteJob||!note.trim()} onClick={()=>{saveNote(noteJob,note);setMessage("Simulated job notes saved locally.");}}><ClipboardList size={15}/> Save notes</button>
   <label className="sterling-photo-label"><Camera size={15}/> Select photos<input type="file" accept="image/*" multiple onChange={e=>{setPhotoNames(Array.from(e.target.files||[]).map(f=>f.name));setMessage("Photo names selected for preview. Images are not uploaded or stored.");}}/></label></div>
   {photoNames.length>0&&<p className="sterling-muted">{photoNames.length} image(s) selected · preview only</p>}
   <h3>Parts required</h3>
   <label>Part description<input value={part} onChange={e=>setPart(e.target.value)} placeholder="e.g. 20x25x1 air filter"/></label>
   <div className="sterling-hr-actions"><button disabled={!noteJob||!part.trim()} onClick={()=>{addPart(noteJob,part.trim());setMessage("Part added to fictional job record.");setPart("");}}>Add part to job</button><a href={part.trim()?"https://www.amazon.com/s?k="+encodeURIComponent(part.trim()):"https://www.amazon.com/"} target="_blank" rel="noopener noreferrer"><ShoppingCart size={15}/> Search Amazon</a></div>
   <p className="sterling-muted">Amazon search opens externally. No affiliate tracking or in-app checkout is connected; an approved Associates tracking ID and disclosure will be required before monetization.</p>
  </section>
 </div>
 <div className="sterling-grid-two"><section className="sterling-panel"><header className="sterling-panel-head"><h2>Technician leaderboard</h2></header><div className="sterling-rows">{roster.slice().sort((a,b)=>b.completed-a.completed).slice(0,8).map((p,i)=><div className="sterling-data-row" key={p.id}><strong>#{i+1}</strong><span className="sterling-row-main"><strong>{p.name}</strong><small>{p.trade} · {p.sla}% sample SLA</small></span><span>{p.completed} jobs</span></div>)}</div></section>
 <section className="sterling-panel"><header className="sterling-panel-head"><h2>Shift event history</h2></header><div className="sterling-rows">{state.clockEvents.length?state.clockEvents.slice().reverse().slice(0,18).map((e,i)=><div className="sterling-data-row" key={i}><span className="sterling-row-main"><strong>{demoPeople.find(p=>p.id===e.employeeId)?.name} · {classify(e.action)}</strong><small>{e.jobId||"Shift"} · {formatStamp(e.at)}</small></span></div>):<p className="sterling-muted">Use clock-in or milestone actions to build a fictional timesheet.</p>}</div></section></div>
 </div>;
}
export function ExecutiveBotsDemo({jobs,hr,onModule}){
 const [selected,setSelected]=useState("Victoria");
 const roster=rosterSnapshot(jobs,hr.state.clockEvents);
 const idle=roster.filter(x=>x.idle);
 const bots=[["Victoria","Chief of Staff"],["Elizabeth","Marketing"],["Adrian","Dispatch"],["Sophia","Sales"],["Morgan","Finance"],["Evelyn","Property Management"]];
 const brief={
 Victoria:[idle.length+" technicians have under 3 hours of assigned work or no current ticket.",jobs.filter(j=>j.priority==="P1"&&!["PAID","COMPLETED"].includes(j.status)).length+" priority-one requests need attention.","Review dispatch gaps before approving new commitments."],
 Elizabeth:["Draft a campaign to the 180-client illustrative customer base.","Campaign drafts require approval; no real messages are sent."],
 Adrian:[idle.map(p=>p.name).slice(0,5).join(", ")+" may be available for reassignment.","Evaluate trade, route, shift and job priority before dispatch."],
 Sophia:["New marketplace and web leads should receive a first-response SLA.","No live lead messages are sent by this preview."],
 Morgan:["Reconcile sample receivables against the private invoice ledger.","Estimated margins are intentionally withheld until expenses are complete."],
 Evelyn:["Twelve maintenance requests are shown across the four fictional communities.","Create dispatch links only after backend sandbox isolation."]
 };
 return <div className="sterling-hr">
  <section className="sterling-panel"><header className="sterling-panel-head"><h2>SYNC Assist · Private business AI office</h2></header><p className="sterling-muted">Choose an employee to demonstrate role-specific recommendations. These are deterministic previews, not active autonomous agents.</p><div className="sterling-team-grid">{bots.map(([name,role])=><button key={name} onClick={()=>setSelected(name)} aria-pressed={selected===name} className={selected===name?"sterling-hr-selected":""}><span className="sterling-avatar">{name[0]}</span><strong>{name}</strong><small>{role}</small><span>{selected===name?"Briefing open":"View briefing"}</span></button>)}</div></section>
  <section className="sterling-panel"><header className="sterling-panel-head"><h2>{selected} · Business briefing</h2><span className="sterling-chip sterling-chip-private">SIMULATED</span></header><div className="sterling-brief">{(brief[selected]||[]).map(t=><p key={t}>{t}</p>)}</div><div className="sterling-hr-actions"><button onClick={()=>onModule(selected==="Adrian"?"dispatch":selected==="Morgan"?"finance":selected==="Evelyn"?"property":selected==="Sophia"?"leads":"team")}>Open related workspace</button></div></section>
 </div>;
}
