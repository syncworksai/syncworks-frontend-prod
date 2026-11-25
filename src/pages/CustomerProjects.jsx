import React,{useCallback,useEffect,useMemo,useState} from "react";
import {ArrowLeft,ArrowRight,CheckCircle2,ChevronRight,FolderKanban,Home,Plus,RefreshCw,X} from "lucide-react";
import {useNavigate} from "react-router-dom";
import {useAuth} from "../auth/AuthContext";
import {addVictoriaTask,createWorkspaceProject,getWorkspaceRecords,markWorkspaceTask,itemType,openTasks,projectRecords,updateWorkspaceProject} from "../api/syncWorkspaceRecords";
import "./CustomerProjects.css";

const LAUNCH_TITLE="SyncWorks — Production Readiness & Launch";
const LAUNCH_TASKS=[
 ["Platform stability","Kylee","QUALITY_ASSURANCE","Audit desktop and mobile navigation, contrast and anchored layouts"],
 ["Platform stability","Kylee","QUALITY_ASSURANCE","Resolve calendar loading and missing Support shortcut"],
 ["AI workforce","Sydney","CHIEF_OF_STAFF","Validate briefing, archive, daily plan and voice across devices"],
 ["AI workforce","Sydney","CHIEF_OF_STAFF","Verify employee delegation, execution receipts and permissions"],
 ["Customer experience","Rebecca","CUSTOMER_SERVICE","Test customer support intake, triage and resolution"],
 ["Operations","Whitney","BUSINESS_MANAGER","Verify ticket lifecycle, scheduling, invoices and payments"],
 ["Property management","Sarah","PROPERTY_MANAGER","Validate correspondence and evidence-based rent reconciliation"],
 ["Sales","Olivia","SALES_MANAGER","Validate lead discovery, qualification and follow-up workflow"],
 ["Marketing","Naomi","MARKETING_MANAGER","Validate approved content and lead handoff workflow"],
 ["Research","Yasmine","TECHNOLOGY_RESEARCH","Review competing platforms and technology options"],
 ["Research","Sophia","RESEARCH_ANALYST","Review pricing, operating costs and launch opportunities"],
 ["Release readiness","Kylee","QUALITY_ASSURANCE","Verify authorization, regression tests and production acceptance"]
];
const KINDS=[["BUSINESS","Business"],["PERSONAL","Personal"],["HOME","Home improvement"]];
export default function CustomerProjects(){
 const nav=useNavigate();
 const {user}=useAuth();
 const pilotAccess=String(user?.email||"").trim().toLowerCase()==="jacoblord7@outlook.com";
 const [records,setRecords]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [selected,setSelected]=useState(null),[creating,setCreating]=useState(false),[busy,setBusy]=useState(false),[filter,setFilter]=useState("ACTIVE");
 const [draft,setDraft]=useState({title:"",description:"",type:"BUSINESS",dueDate:""}),[taskTitle,setTaskTitle]=useState("");
 const refresh=useCallback(async()=>{setLoading(true);setError("");try{setRecords(await getWorkspaceRecords());}catch{setError("Projects could not load from your SyncWorks account.");}finally{setLoading(false);}},[]);
 useEffect(()=>{if(pilotAccess)refresh();},[refresh,pilotAccess]);
 const projects=useMemo(()=>projectRecords(records).filter(p=>filter==="ALL"||String(p.metadata?.project_status||"ACTIVE")==="ACTIVE"),[records,filter]);
 const tasks=useMemo(()=>openTasks(records).filter(t=>String(t.metadata?.project_id||"")===String(selected?.id||"")&&selected),[records,selected]);
 const allProjects=projectRecords(records);
 const allTasks=records.filter(t=>itemType(t)==="TASK"&&t.metadata?.project_id);
 const linked=p=>allTasks.filter(t=>String(t.metadata.project_id)===String(p.id));
 const done=t=>String(t.metadata?.task_status||"OPEN").toUpperCase()==="DONE";
 const activeProjects=allProjects.filter(p=>(p.metadata?.project_status||"ACTIVE")==="ACTIVE");
 const activeTasks=allTasks.filter(t=>activeProjects.some(p=>String(p.id)===String(t.metadata.project_id)));
 const nextTasks=activeTasks.filter(t=>!done(t));
 const completion=activeTasks.length?Math.round(activeTasks.filter(done).length/activeTasks.length*100):null;
 async function seedLaunch(){
   if(busy||loading||error)return;
   setBusy(true);setError("");setNotice("");
   try{
     const fresh=await getWorkspaceRecords();
     let project=projectRecords(fresh).find(p=>p.title===LAUNCH_TITLE);
     if(!project)project=await createWorkspaceProject({title:LAUNCH_TITLE,type:"BUSINESS",description:"Master launch checklist coordinated by Sydney. Completion requires verified work; suggested owners do not imply automated execution."});
     const existing=new Set(fresh.filter(t=>itemType(t)==="TASK"&&String(t.metadata?.project_id)===String(project.id)).map(t=>t.metadata?.launch_key||t.title));
     for(const [category,owner,role,title] of LAUNCH_TASKS){
       if(existing.has(title))continue;
       await addVictoriaTask(title,{projectId:project.id,priority:"NORMAL",metadata:{launch_key:title,category,suggested_owner:owner,suggested_role:role}});
       existing.add(title);
     }
     await refresh();setSelected(project);setNotice("Launch checklist saved. Suggested owners are planning labels, not executed assignments.");
   }catch(err){setError("Launch setup incomplete. Refresh before retrying; existing tasks are preserved.");}
   finally{setBusy(false);}
 }
 async function create(e){e.preventDefault();if(busy)return;setBusy(true);setError("");try{const created=await createWorkspaceProject(draft);setRecords(rows=>[created,...rows]);setSelected(created);setCreating(false);setDraft({title:"",description:"",type:"BUSINESS",dueDate:""});setNotice("Project saved to your account.");}catch(err){setError(err.message||"Could not save project.");}finally{setBusy(false);}}
 async function newTask(e){e.preventDefault();if(!selected||busy)return;setBusy(true);setError("");try{await addVictoriaTask(taskTitle,{projectId:selected.id});setTaskTitle("");await refresh();setNotice("Task added. It remains open until completed.");}catch(err){setError(err.message||"Could not add task.");}finally{setBusy(false);}}
 async function completeTask(t){setBusy(true);try{await markWorkspaceTask(t,"DONE");setRecords(rows=>rows.map(row=>row.id===t.id?{...row,metadata:{...row.metadata,task_status:"DONE"}}:row));}catch{setError("Task completion could not be saved.");}finally{setBusy(false);}}
 async function setProjectStatus(project,status){setBusy(true);try{const updated=await updateWorkspaceProject(project,{metadata:{project_status:status}});setRecords(rows=>rows.map(row=>row.id===project.id?updated:row));setSelected(updated);setNotice(status==="COMPLETED"?"Project marked completed.":"Project reopened.");}catch{setError("Unable to update project.");}finally{setBusy(false);}}
 if(!pilotAccess)return <main className="sw-projects-root"><section className="sw-projects-shell"><h1>Projects private pilot</h1><p>This workspace is not enabled for this account.</p><button type="button" onClick={()=>nav("/customer")}>Return Home</button></section></main>;
 return <main className="sw-projects-root">
  <div className="sw-projects-shell">
   <header className="sw-projects-top"><button type="button" onClick={()=>nav("/customer")}><ArrowLeft size={18}/> Home</button><div><span>SYNC WORKSPACE</span><h1>Projects Command Center</h1></div><button type="button" onClick={refresh} aria-label="Refresh projects" disabled={loading}><RefreshCw size={18}/></button></header>
   <div className="sw-projects-actions"><button type="button" onClick={()=>setCreating(true)}><Plus size={17}/> New project</button><button type="button" onClick={seedLaunch} disabled={busy||loading||!!error}>{busy?"Saving…":"Set up launch project"}</button><button type="button" onClick={()=>setFilter(v=>v==="ACTIVE"?"ALL":"ACTIVE")}>{filter==="ACTIVE"?"Show all":"Show active"}</button></div>
   {error&&<p role="alert" className="sw-projects-error">{error}</p>}{notice&&<p role="status" className="sw-projects-notice">{notice}</p>}
   <div className="sw-projects-metrics">{[["Active projects",activeProjects.length],["Open project tasks",nextTasks.length],["Completed tasks",activeTasks.filter(done).length],["Recorded progress",completion===null?"—":completion+"%"]].map(([label,value])=><div key={label}><small>{label}</small><strong>{loading||error?"—":value}</strong></div>)}</div>
   <div className="sw-projects-grid">
    <section className="sw-projects-column"><h2>Project portfolio</h2><div className="sw-projects-list">{loading?<p>Loading projects…</p>:projects.length?projects.map(project=>{const rows=linked(project),count=rows.filter(done).length;return <button type="button" key={project.id} onClick={()=>setSelected(project)} className="sw-projects-item"><FolderKanban size={20}/><span><strong>{project.title}</strong><small>{project.metadata?.project_status||"ACTIVE"} · {count}/{rows.length} tasks complete</small><progress max={rows.length||1} value={count}/></span><ChevronRight size={17}/></button>}):<div className="sw-projects-empty"><FolderKanban size={28}/><strong>No projects yet</strong><p>Start with the launch checklist or create a project.</p></div>}</div></section>
    <section className="sw-projects-column"><h2>Next actions</h2><div className="sw-projects-list">{loading?<p>Loading tasks…</p>:nextTasks.length?nextTasks.map(t=><div key={t.id} className="sw-projects-task"><span><small>{t.metadata?.category||"Project task"} · {t.metadata?.suggested_owner||"Owner"}</small><strong>{t.title}</strong></span><button type="button" disabled={busy} onClick={()=>completeTask(t)} aria-label={"Complete "+t.title}><CheckCircle2 size={18}/></button></div>):<p>No open project tasks recorded.</p>}</div></section>
    <section className="sw-projects-column sw-projects-executive"><h2>Sydney · Project brief</h2><img src="/jarvis-avatars/newvictoria.png" alt="Sydney"/><p>{loading?"Retrieving your workspace…":error?"Project records unavailable. Refresh before planning.":nextTasks.length?"Your next recorded action is "+nextTasks[0].title+".":"Create the launch project to establish your next milestone."}</p><button type="button" onClick={()=>nav("/sync/assist/assignments")}>Employee assignments <ChevronRight size={16}/></button><button type="button" onClick={()=>nav("/calendar")}>Open schedule <ChevronRight size={16}/></button><small>Progress reflects recorded task statuses, not independent software verification.</small></section>
   </div>
  </div>
  {(creating||selected)&&<div className="sw-projects-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget){setCreating(false);setSelected(null);}}}><section role="dialog" aria-modal="true" aria-label={creating?"Create project":"Project details"} className="sw-projects-drawer"><header><h2>{creating?"New project":selected?.title}</h2><button type="button" aria-label="Close" onClick={()=>{setCreating(false);setSelected(null);}}><X size={20}/></button></header>
  {creating?<form onSubmit={create} className="sw-projects-form"><label>Project name<input required maxLength={180} value={draft.title} onChange={e=>setDraft(d=>({...d,title:e.target.value}))} placeholder="e.g. SyncWorks Inbox build"/></label><label>Area<select value={draft.type} onChange={e=>setDraft(d=>({...d,type:e.target.value}))}>{KINDS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label>Description<textarea rows={3} maxLength={2000} value={draft.description} onChange={e=>setDraft(d=>({...d,description:e.target.value}))} placeholder="Outcome, scope, and next steps"/></label><label>Target date (optional)<input type="date" value={draft.dueDate} onChange={e=>setDraft(d=>({...d,dueDate:e.target.value}))}/></label><button className="sw-projects-primary" type="submit" disabled={busy}>Create project</button></form>:
   <div className="sw-projects-detail"><div className="sw-projects-detailsub"><span>{KINDS.find(x=>x[0]===selected?.metadata?.project_type)?.[1]||"Project"}</span><span>{selected?.metadata?.project_status||"ACTIVE"}</span></div>{selected?.description&&<p>{selected.description}</p>}{selected?.metadata?.project_due_date&&<p>Target: {selected.metadata.project_due_date}</p>}<h3>Open tasks ({tasks.length})</h3>{tasks.map(t=><div key={t.id} className="sw-projects-task"><span><small>{t.metadata?.category||"Task"} · {t.metadata?.suggested_owner||"Owner"}</small><strong>{t.title}</strong></span><button type="button" disabled={busy} onClick={()=>completeTask(t)}><CheckCircle2 size={16}/> Complete</button></div>)}{tasks.length===0&&<p>No open tasks. Add the next step below.</p>}<form onSubmit={newTask} className="sw-projects-addtask"><input aria-label="New project task" required value={taskTitle} maxLength={180} onChange={e=>setTaskTitle(e.target.value)} placeholder="Next step…"/><button type="submit" disabled={busy}><Plus size={17}/> Add task</button></form><button type="button" className="sw-projects-primary" disabled={busy||(selected.metadata?.project_status!=="COMPLETED"&&tasks.length>0)} onClick={()=>setProjectStatus(selected,selected.metadata?.project_status==="COMPLETED"?"ACTIVE":"COMPLETED")}>{selected.metadata?.project_status==="COMPLETED"?"Reopen project":"Mark project complete"}</button></div>}
  </section></div>}
 </main>;
}
