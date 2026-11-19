import React, { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useWorkspaceAppearance } from "../components/customer/CustomerWorkspace";
import { Activity, ArrowLeft, ArrowRight, BarChart3, Bell, BriefcaseBusiness, Building2, CalendarDays, CheckCircle2, ChevronRight, ClipboardList, Clock3, Download, FileText, Filter, LayoutDashboard, Mail, Menu, RotateCcw, Settings2, ShieldCheck, Sparkles, TrendingUp, Truck, Users, Wallet, X } from "lucide-react";
import { demoPeople, demoCustomers, demoJobs, demoProperties, demoLeads, demoInvoices, money, statusSteps, summarize } from "./sterlingDemoData";
import "./PrivateSterlingWorkspace.css";
import {useSterlingHR,WorkforceDemo,ExecutiveBotsDemo,rosterSnapshot} from "./SterlingWorkforceDemo";
import {AVATARS,getAvatarPhotoForUser} from "../components/sync/JarvisAvatar";
import "./SterlingWorkforceDemo.css";

const PILOT_EMAIL="jacoblord7@outlook.com";
const STORAGE="sw-private-sterling-jobs-v2";
const sections=[
 ["overview","Overview",LayoutDashboard],["tickets","Tickets",ClipboardList],["dispatch","Dispatch",Truck],
 ["team","Team",Users],["hr","HR & Timeclock",Clock3],["schedule","Schedule",CalendarDays],["leads","Leads",TrendingUp],
 ["finance","Finance",Wallet],["property","Property Management",Building2],["ceo","CEO Office",BarChart3],
 ["reports","Reports",FileText],["ai","AI Employees",Sparkles]
];
const dateLabel=(offset,hour,minute)=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()+offset);d.setHours(hour,minute,0,0);return d.toLocaleString("en-US",{weekday:"short",hour:"numeric",minute:"2-digit"});};
const rawStatus=value=>String(value||"NEW").replace(/_/g," ");
function readJobs(){try{const s=JSON.parse(localStorage.getItem(STORAGE)||"null");if(Array.isArray(s)&&s.length===demoJobs.length&&s.every(j=>j.id))return s;}catch{/* use immutable seed */}return demoJobs;}
function Chip({children,tone="info"}){return <span className={`sterling-chip sterling-chip-${tone}`}>{children}</span>;}
function Card({title,action,children,className=""}){return <section className={`sterling-panel ${className}`}><header className="sterling-panel-head"><h2>{title}</h2>{action}</header>{children}</section>;}
function Tile({title,value,detail,onClick}){return <button className="sterling-stat" onClick={onClick} type="button"><span>{title}</span><strong>{value}</strong><small>{detail}</small></button>;}
function Row({children,onClick}){return <button className="sterling-data-row" onClick={onClick} type="button">{children}<ChevronRight size={15}/></button>;}
function Empty(){return <p className="sterling-muted">No results for this filter.</p>;}
function PanelGroup({items,onSelect}){return <div className="sterling-module-grid">{items.map(([id,label,Icon])=><button type="button" key={id} onClick={()=>onSelect(id)}><Icon size={19}/><span>{label}</span><ChevronRight size={14}/></button>)}</div>;}
export default function PrivateShowcase(){
 const {isAuthed,user}=useAuth();
 const [appearance]=useWorkspaceAppearance();
 const owner=String(user?.email||"").trim().toLowerCase()===PILOT_EMAIL;
 const [section,setSection]=useState(()=>{const t=new URLSearchParams(window.location.search).get("tab");return sections.some(x=>x[0]===t)?t:"overview";});
 const [drawer,setDrawer]=useState(null);
 const [selectedBot,setSelectedBot]=useState("Victoria");
 const [railExpanded,setRailExpanded]=useState(false);
 const [filter,setFilter]=useState("");
 const [jobs,setJobs]=useState(readJobs);
 const [activity,setActivity]=useState([]);
 const hr=useSterlingHR();
 const [notice,setNotice]=useState("");
 const [activeReport,setActiveReport]=useState("Job & Dispatch Report");
 const kpi=useMemo(()=>summarize(jobs,demoInvoices),[jobs]);
 const roster=useMemo(()=>rosterSnapshot(jobs,hr.state.clockEvents),[jobs,hr.state.clockEvents]);
 const showSection=s=>{setSection(s);setRailExpanded(false);setDrawer(null);setFilter("");const u=new URL(window.location.href);u.searchParams.set("tab",s);window.history.replaceState(null,"",u.pathname+u.search);};
 const updateJob=(jobId,next)=>{setJobs(old=>{const updated=old.map(j=>j.id===jobId?{...j,status:next}:j);try{localStorage.setItem(STORAGE,JSON.stringify(updated));}catch{/* in-memory works */}return updated;});setActivity(a=>[{jobId,next,date:new Date().toLocaleTimeString()},...a].slice(0,12));setNotice(jobId+" moved to "+rawStatus(next)+" in this private simulation.");setDrawer(null);};
 const reset=()=>{try{localStorage.removeItem(STORAGE)}catch{/* in memory */}hr.reset();setJobs(demoJobs);setActivity([]);setNotice("Sterling presentation restored. No live data was changed.");setDrawer(null);};
 const open=(kind,data)=>setDrawer({kind,data});
 const openBot=(name)=>{setSelectedBot(name);showSection("ai");};
 const safeCsv=cell=>'"'+String(cell??"").replace(/"/g,'""')+'"';
 const downloadReport=()=>{
  const rows=activeReport==="Job & Dispatch Report"?[["Ticket","Customer","Service","Technician","Status","Amount","Travel minutes","On-site minutes"],...jobs.map(j=>[j.id,j.customer,j.service,demoPeople.find(t=>t.id===j.technicianId)?.name,j.status,j.amount,j.travelMinutes,j.siteMinutes])]:
   activeReport==="Payments & Receivables"?[["Invoice","Customer","Total","Paid","Outstanding","Status"],...demoInvoices.map(i=>[i.id,i.customer,i.total,i.paid,i.total-i.paid,i.status])]:
   activeReport==="Technician Productivity"?[["Employee","Trade","Completed jobs","Travel minutes","On-site minutes","SLA %"],...demoPeople.map(t=>[t.name,t.trade,t.completed,t.travel,t.onSite,t.sla])]:
   [["Property","Units","Occupied","Rent roll","Open maintenance"],...demoProperties.map(p=>[p.name,p.units,p.occupied,p.rent,p.open])];
  const csv=rows.map(row=>row.map(safeCsv).join(",")).join("\r\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="sterling-"+activeReport.toLowerCase().replace(/[^a-z0-9]+/g,"-")+".csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  setNotice("Downloaded a CSV of fictional Sterling records. Accounting and tax integrations are not active.");
 };
 if(!isAuthed||!owner)return <Navigate to="/customer" replace/>;
 const visibleJobs=jobs.filter(j=>(j.customer+" "+j.service+" "+j.id+" "+j.status).toLowerCase().includes(filter.toLowerCase()));
 const panelTitle=sections.find(x=>x[0]===section)?.[1]||"Overview";
 const openJob=j=>open("job",j);
 const jobRows=(rows,max=8)=><div className="sterling-rows">{rows.slice(0,max).map(j=><Row key={j.id} onClick={()=>openJob(j)}><span className="sterling-row-main"><strong>{j.id} · {j.customer}</strong><small>{j.service} · {demoPeople.find(p=>p.id===j.technicianId)?.name}</small></span><Chip tone={["PAID","COMPLETED"].includes(j.status)?"good":j.priority==="P1"?"urgent":"info"}>{rawStatus(j.status)}</Chip></Row>)}{rows.length===0&&<Empty/>}</div>;
 const statusOptions=["NEW","ASSIGNED","ACCEPTED","SCHEDULED","EN_ROUTE","ON_SITE","IN_PROGRESS","NEEDS_QUOTE","QUOTED","APPROVED","COMPLETED","INVOICED","PAID"];
 return <main className="sterling-workspace" data-theme={appearance.theme} data-motion={appearance.motion?"on":"off"} aria-label="Private Sterling business simulator">
  <div className="sterling-workspace-inner">
   <header className="sterling-heading">
    <div><span className="sterling-eyebrow">SYNCWORKS BUSINESS OS <Chip tone="private">PRIVATE SHOWCASE · SIMULATED</Chip></span><h1>Sterling Property Services <small>Business Command Center</small></h1></div>
    <div className="sterling-heading-actions"><button type="button" onClick={()=>open("briefing")}><Sparkles size={17}/> Victoria's Briefing</button><Link to="/customer"><ArrowLeft size={16}/> My Dashboard</Link></div>
   </header>
   <div className="sterling-workspace-content">
    <aside className="sterling-sidebar" aria-label="Sterling navigation">
     <div className="sterling-sidebar-title"><BriefcaseBusiness size={18}/> <span>STERLING GROUP</span></div>
     <nav>{sections.filter(([id])=>["overview","tickets","dispatch","team","hr","schedule","finance"].includes(id)).map(([id,label,Icon])=><button type="button" key={id} className={section===id?"is-current":""} onClick={()=>showSection(id)}><Icon size={17}/><span>{label}</span></button>)}<button type="button" className={["leads","property","ceo","reports","ai"].includes(section)?"is-current":""} onClick={()=>open("workspaces")}><LayoutDashboard size={17}/><span>More workspaces</span><ChevronRight size={14}/></button></nav>
     <div className="sterling-sidebar-bottom"><ShieldCheck size={16}/> Private presentation data <button type="button" onClick={()=>open("reset")}>Reset demo</button></div>
    </aside>
    <div className="sterling-main">
     <div className="sterling-section-top"><div><span className="sterling-eyebrow">{section==="overview"?"TODAY AT A GLANCE":"STERLING OPERATIONS"}</span><h2>{section==="overview"?"Business overview":panelTitle}</h2></div><div className="sterling-section-actions"><Chip tone="good">Operating · Demo</Chip><button type="button" onClick={()=>open("briefing")} aria-label="Open briefing"><Bell size={16}/><span>Needs attention</span></button></div></div>
     {section==="overview" && <>
      <div className="sterling-stats">
       <Tile title="Invoiced revenue" value={money(kpi.invoiced)} detail="36 simulated invoices" onClick={()=>showSection("finance")}/>
       <Tile title="Cash collected" value={money(kpi.collected)} detail="Recorded example payments" onClick={()=>showSection("finance")}/>
       <Tile title="Open work orders" value={kpi.active} detail="Across all crews" onClick={()=>showSection("tickets")}/>
       <Tile title="Outstanding" value={money(kpi.outstanding)} detail="Invoices requiring collection" onClick={()=>showSection("finance")}/>
      </div>
      <div className="sterling-grid-two">
       <Card title="Today's dispatch" action={<button onClick={()=>showSection("dispatch")}>Open board <ChevronRight size={15}/></button>}>{jobRows(jobs.filter(j=>j.dayOffset===0),5)}</Card>
       <Card title="Technician status" action={<button onClick={()=>showSection("hr")}>HR & idle techs <ChevronRight size={15}/></button>}><div className="sterling-rows">{demoPeople.slice(0,6).map(t=><Row key={t.id} onClick={()=>open("person",t)}><span className="sterling-row-main"><strong>{t.name}</strong><small>{t.trade} · Avg travel {t.travel} min</small></span><Chip tone={t.status==="Available"?"good":"info"}>{t.status}</Chip></Row>)}</div></Card>
      </div>
      <div className="sterling-hr-shortcut"><button onClick={()=>showSection("hr")}><Clock3 size={16}/> {roster.filter(p=>p.idle).length} under-scheduled technicians · Open HR, Timeclock & Leaderboard <ChevronRight size={15}/></button><button onClick={()=>showSection("ai")}><Sparkles size={16}/> Chief of Staff & AI Employee Office <ChevronRight size={15}/></button></div>
      <div className="sterling-grid-three">
       <Card title="Needs attention"><div className="sterling-alerts"><button onClick={()=>showSection("tickets")}><Clock3 size={17}/> Priority requests to schedule <strong>4</strong></button><button onClick={()=>showSection("finance")}><Wallet size={17}/> Outstanding invoice balances <strong>{money(kpi.outstanding)}</strong></button><button onClick={()=>showSection("leads")}><Mail size={17}/> New leads awaiting follow-up <strong>3</strong></button></div></Card>
       <Card title="Weekly schedule"><div className="sterling-schedule-mini">{jobs.slice(0,5).map(j=><button key={j.id} onClick={()=>openJob(j)}><span>{dateLabel(j.dayOffset,j.hour,j.minute)}</span><strong>{j.service}</strong></button>)}</div></Card>
       <Card title="Executive pulse"><p className="sterling-muted">Fictional company performance from simulated records.</p><div className="sterling-progress"><span>Monthly goal</span><strong>{money(kpi.invoiced)} / $60,000</strong><div><i style={{width:Math.min(100,kpi.invoiced/60000*100)+"%"}}/></div></div><button className="sterling-inline-link" onClick={()=>showSection("ceo")}>View CEO Command <ArrowRight size={15}/></button></Card>
      </div>
     </>}
     {section==="tickets" && <Card title="Service requests & lifecycle" action={<span>{visibleJobs.length} records</span>}><input className="sterling-search" placeholder="Search ticket, customer, service or status" value={filter} onChange={e=>setFilter(e.target.value)}/>{jobRows(visibleJobs,42)}</Card>}
     {section==="dispatch" && <><div className="sterling-stats"><Tile title="Assigned technicians" value="18" detail="Four specialist teams" onClick={()=>showSection("team")}/><Tile title="Open service jobs" value={kpi.active} detail="Sample operating queue" onClick={()=>showSection("tickets")}/><Tile title="Completed jobs" value={kpi.completed} detail="Demo work-order dataset" onClick={()=>showSection("tickets")}/><Tile title="Average travel" value={Math.round(demoPeople.reduce((s,t)=>s+t.travel,0)/demoPeople.length)+" min"} detail="Illustrative technician logs" onClick={()=>showSection("team")}/></div><Card title="Dispatch & field activity">{jobRows(jobs,42)}</Card></>}
     {section==="team" && <Card title="18 field technicians" action={<Chip tone="good">4 crews</Chip>}><div className="sterling-team-grid">{demoPeople.map(t=><button key={t.id} onClick={()=>open("person",t)}><span className="sterling-avatar">{t.name.split(" ").map(x=>x[0]).join("")}</span><strong>{t.name}</strong><small>{t.trade} · {t.status}</small><span>SLA {t.sla}% · {t.completed} jobs</span></button>)}</div></Card>}
     {section==="hr" && <WorkforceDemo jobs={jobs} hr={hr} openJob={openJob}/>}
     {section==="schedule" && <Card title="Appointments & time blocks" action={<Chip>Next four days</Chip>}><div className="sterling-agenda">{[0,1,2,3].map(day=><div key={day}><h3>{new Date(Date.now()+day*86400000).toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"})}</h3>{jobs.filter(j=>j.dayOffset===day).map(j=><Row key={j.id} onClick={()=>openJob(j)}><span className="sterling-time">{dateLabel(j.dayOffset,j.hour,j.minute)}</span><span className="sterling-row-main"><strong>{j.customer}</strong><small>{j.service} · {demoPeople.find(t=>t.id===j.technicianId)?.name}</small></span><Chip>{rawStatus(j.status)}</Chip></Row>)}</div>)}</div></Card>}
     {section==="leads" && <><div className="sterling-stats"><Tile title="Pipeline leads" value={demoLeads.length} detail="5 simulated channels" onClick={()=>open("lead",demoLeads[0])}/><Tile title="Pipeline value" value={money(demoLeads.reduce((s,l)=>s+l.value,0))} detail="Proposals and prospects" onClick={()=>open("lead",demoLeads[0])}/><Tile title="Won opportunities" value={demoLeads.filter(l=>l.stage==="Won").length} detail="Illustrative conversion" onClick={()=>open("lead",demoLeads[0])}/><Tile title="Referrals" value={demoLeads.filter(l=>l.source==="Referral").length} detail="Organic acquisition" onClick={()=>open("lead",demoLeads[0])}/></div><Card title="Sales pipeline">{demoLeads.map(l=><Row key={l.id} onClick={()=>open("lead",l)}><span className="sterling-row-main"><strong>{l.name}</strong><small>{l.source} · {l.stage}</small></span><strong>{money(l.value)}</strong></Row>)}</Card></>}
     {section==="finance" && <><div className="sterling-stats"><Tile title="Total invoiced" value={money(kpi.invoiced)} detail="Sample invoice ledger" onClick={()=>showSection("reports")}/><Tile title="Payments received" value={money(kpi.collected)} detail="Simulated transactions" onClick={()=>showSection("reports")}/><Tile title="Accounts receivable" value={money(kpi.outstanding)} detail="Unpaid and partial" onClick={()=>showSection("reports")}/><Tile title="Paid invoices" value={kpi.paid} detail="Settled sample invoices" onClick={()=>showSection("reports")}/></div><Card title="Payments and invoices" action={<button onClick={()=>showSection("reports")}>Export <Download size={15}/></button>}>{demoInvoices.map(inv=><Row key={inv.id} onClick={()=>open("invoice",inv)}><span className="sterling-row-main"><strong>{inv.id} · {inv.customer}</strong><small>{inv.status} · Paid {money(inv.paid)} of {money(inv.total)}</small></span><strong>{money(inv.total-inv.paid)} due</strong></Row>)}</Card></>}
     {section==="property" && <><div className="sterling-stats"><Tile title="Managed units" value={demoProperties.reduce((s,p)=>s+p.units,0)} detail="Four communities" onClick={()=>open("property",demoProperties[0])}/><Tile title="Occupied units" value={demoProperties.reduce((s,p)=>s+p.occupied,0)} detail="94.2% portfolio occupancy" onClick={()=>open("property",demoProperties[0])}/><Tile title="Monthly rent roll" value={money(demoProperties.reduce((s,p)=>s+p.rent,0))} detail="Fictional scheduled charges" onClick={()=>open("property",demoProperties[0])}/><Tile title="Open maintenance" value={demoProperties.reduce((s,p)=>s+p.open,0)} detail="Connected workflow concept" onClick={()=>showSection("tickets")}/></div><Card title="Sterling Property Management"><div className="sterling-property-grid">{demoProperties.map(p=><button key={p.name} onClick={()=>open("property",p)}><Building2 size={23}/><strong>{p.name}</strong><small>{p.occupied}/{p.units} occupied · {p.open} maintenance</small><span>{money(p.rent)} rent roll</span></button>)}</div></Card></>}
     {section==="ceo" && <><div className="sterling-stats"><Tile title="Revenue" value={money(kpi.invoiced)} detail="Simulated invoice-ledger total" onClick={()=>showSection("finance")}/><Tile title="Collected" value={money(kpi.collected)} detail="Simulated cash receipts" onClick={()=>showSection("finance")}/><Tile title="Jobs completed" value={kpi.completed} detail="Calculated from ticket states" onClick={()=>showSection("tickets")}/><Tile title="Receivables" value={money(kpi.outstanding)} detail="Invoiced minus collected" onClick={()=>showSection("finance")}/></div><div className="sterling-grid-two"><Card title="Revenue & growth"><div className="sterling-progress"><span>Monthly goal</span><strong>{money(kpi.invoiced)} / $60,000</strong><div><i style={{width:Math.min(100,kpi.invoiced/60000*100)+"%"}}/></div></div><p className="sterling-muted">Profit and net margins require a complete expense ledger; not shown as verified.</p></Card><Card title="Executive briefing"><p>Victoria's simulated briefing: {kpi.active} jobs remain in the active queue, {money(kpi.outstanding)} in invoice balances is awaiting collection, and {demoLeads.filter(l=>l.stage==="New").length} leads need initial follow-up.</p><button className="sterling-inline-link" onClick={()=>open("briefing")}>Open business briefing <ArrowRight size={15}/></button></Card></div><Card title="Performance navigation"><PanelGroup items={sections.filter(([id])=>["dispatch","team","leads","finance","property","reports"].includes(id))} onSelect={showSection}/></Card></>}
     {section==="reports" && <><Card title="Export business records" action={<Chip tone="private">Fake records only</Chip>}><p className="sterling-muted">Select a report and export the simulated records as a real CSV. PDF, Excel, QuickBooks and tax-app formats are not wired yet.</p><div className="sterling-export"><select value={activeReport} onChange={e=>setActiveReport(e.target.value)} aria-label="Select report">{["Job & Dispatch Report","Payments & Receivables","Technician Productivity","Property Portfolio"].map(s=><option key={s}>{s}</option>)}</select><button onClick={downloadReport}><Download size={17}/> Export CSV</button></div></Card><Card title="Report categories"><PanelGroup items={[["finance","Financials",Wallet],["team","Technicians",Users],["dispatch","Operations",Activity],["property","Property Management",Building2],["leads","Sales Intelligence",TrendingUp]]} onSelect={showSection}/></Card></>}
     {section==="ai" && <ExecutiveBotsDemo jobs={jobs} hr={hr} onModule={showSection} selectedEmployee={selectedBot}/>}
     {notice&&<div className="sterling-notice" role="status">{notice}<button onClick={()=>setNotice("")} aria-label="Dismiss notification"><X size={15}/></button></div>}
    </div>
   </div>
   <footer className="sterling-footer">STERLING GROUP · PRIVATE PRESENTATION · FICTIONAL DATA · NO LIVE ACTIONS</footer>
   <nav className="sterling-ai-dock" aria-label="Showcase AI employee dock">
    {AVATARS.map(bot=><button type="button" key={bot.id} onClick={()=>openBot(bot.name)} title={bot.name+" · "+bot.role} aria-label={"Open "+bot.name+" AI employee briefing"}><img src={getAvatarPhotoForUser(bot,user)} alt="" loading="lazy" onError={e=>{e.currentTarget.style.visibility="hidden";}}/><span>{bot.name}</span></button>)}
    <button type="button" className="sterling-ai-dock-more" onClick={()=>openBot("Victoria")} aria-label="Open all AI employees"><Sparkles size={18}/><span>Team</span></button>
   </nav>
  </div>
  {drawer&&<div className="sterling-drawer-backdrop" onMouseDown={()=>setDrawer(null)}><aside className="sterling-drawer" role="dialog" aria-modal="true" aria-label="Sterling detail" onMouseDown={e=>e.stopPropagation()}><header><span className="sterling-eyebrow">SYNCWORKS / PRIVATE</span><button onClick={()=>setDrawer(null)} aria-label="Close drawer"><X size={21}/></button></header>
   {drawer.kind==="job"&&<><h2>{drawer.data.id}</h2><p>{drawer.data.customer}</p><dl><dt>Service</dt><dd>{drawer.data.service}</dd><dt>Technician</dt><dd>{demoPeople.find(t=>t.id===drawer.data.technicianId)?.name}</dd><dt>Amount</dt><dd>{money(drawer.data.amount)}</dd><dt>Travel</dt><dd>{drawer.data.travelMinutes} min</dd><dt>Time on site</dt><dd>{drawer.data.siteMinutes} min</dd><dt>Status</dt><dd>{rawStatus(jobs.find(j=>j.id===drawer.data.id)?.status)}</dd></dl><h3>Move job through workflow</h3><div className="sterling-drawer-actions">{statusOptions.map(st=><button key={st} onClick={()=>updateJob(drawer.data.id,st)} disabled={jobs.find(j=>j.id===drawer.data.id)?.status===st}>{rawStatus(st)}</button>)}</div></>}
   {drawer.kind==="person"&&<><h2>{drawer.data.name}</h2><p>{drawer.data.trade} · {drawer.data.status}</p><dl><dt>Jobs completed</dt><dd>{drawer.data.completed}</dd><dt>Average travel</dt><dd>{drawer.data.travel} min</dd><dt>Average on-site</dt><dd>{drawer.data.onSite} min</dd><dt>SLA attainment</dt><dd>{drawer.data.sla}%</dd></dl><h3>Assigned service tickets</h3>{jobRows(jobs.filter(j=>j.technicianId===drawer.data.id),8)}</>}
   {drawer.kind==="invoice"&&<><h2>{drawer.data.id}</h2><p>{drawer.data.customer}</p><dl><dt>Invoice total</dt><dd>{money(drawer.data.total)}</dd><dt>Collected</dt><dd>{money(drawer.data.paid)}</dd><dt>Balance due</dt><dd>{money(drawer.data.total-drawer.data.paid)}</dd><dt>Status</dt><dd>{drawer.data.status}</dd></dl><p className="sterling-muted">Payment processing is disabled in this simulator.</p></>}
   {drawer.kind==="lead"&&<><h2>{drawer.data.name}</h2><p>Sales opportunity</p><dl><dt>Lead source</dt><dd>{drawer.data.source}</dd><dt>Pipeline stage</dt><dd>{drawer.data.stage}</dd><dt>Potential value</dt><dd>{money(drawer.data.value)}</dd></dl><p className="sterling-muted">No real customer outreach is sent.</p></>}
   {drawer.kind==="property"&&<><h2>{drawer.data.name}</h2><p>Managed residential portfolio</p><dl><dt>Total units</dt><dd>{drawer.data.units}</dd><dt>Occupied</dt><dd>{drawer.data.occupied}</dd><dt>Vacant</dt><dd>{drawer.data.units-drawer.data.occupied}</dd><dt>Rent roll</dt><dd>{money(drawer.data.rent)}</dd><dt>Open requests</dt><dd>{drawer.data.open}</dd></dl></>}
   {drawer.kind==="briefing"&&<><h2>Victoria · Business Briefing</h2><p>This presentation briefing is calculated from local fictional records, not sent by a live agent.</p><div className="sterling-brief"><p><strong>{kpi.active} active service jobs</strong> in the field and scheduling queue.</p><p><strong>{money(kpi.outstanding)}</strong> remains in sample invoice receivables.</p><p><strong>{demoPeople.length} technicians</strong> are rostered across HVAC, Plumbing, Electrical and Maintenance.</p><p><strong>{demoLeads.length} leads</strong> in the simulated growth pipeline.</p></div></>}
   {drawer.kind==="agent"&&<><h2>{drawer.data.name}</h2><p>{drawer.data.role} · Simulated agent</p><div className="sterling-brief"><p>Example assignments and approvals will appear here once the isolated AI workflow is implemented.</p></div></>}
   {drawer.kind==="workspaces"&&<><h2>Business workspaces</h2><p>Choose any Sterling module. The overview stays anchored in one screen while detailed modules open in their workspace.</p><PanelGroup items={sections} onSelect={showSection}/></>}
   {drawer.kind==="reset"&&<><h2>Reset presentation?</h2><p>This resets only the locally simulated Sterling job statuses on this device. Real data is untouched.</p><div className="sterling-drawer-actions"><button onClick={reset}>Reset Sterling demo</button><button onClick={()=>setDrawer(null)}>Cancel</button></div></>}
  </aside></div>}
 </main>;
}
