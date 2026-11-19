import React,{useMemo} from "react";
import {Link} from "react-router-dom";
import {Activity,ArrowRight,BarChart3,Bell,BriefcaseBusiness,CalendarDays,ChevronRight,ClipboardList,Clock3,FileText,Plus,RefreshCw,Route,ShieldCheck,TrendingUp,Users,Wallet} from "lucide-react";
import {AVATARS,getAvatarPhotoForUser} from "../components/sync/JarvisAvatar";
import {demoPeople, demoInvoices, demoLeads,money} from "./sterlingDemoData";

/** Only presentation fixtures. No live API calls are made in this component. */
export default function SterlingSboOverview({jobs,kpi,roster,user,onOpen,onSection,onBot,onReset}){
 const active=jobs.filter(j=>!["COMPLETED","INVOICED","PAID","CANCELLED"].includes(j.status));
 const atRisk=active.filter(j=>j.priority==="P1").length;
 const idle=roster.filter(p=>p.idle);
 const avgTravel=Math.round(demoPeople.reduce((s,t)=>s+t.travel,0)/demoPeople.length);
 const leaders=useMemo(()=>demoPeople.slice().sort((a,b)=>b.completed-a.completed).slice(0,5),[]);
 const operations=[
  {label:"New request",detail:"Simulated intake & tickets",Icon:Plus,action:()=>onSection("tickets")},
  {label:"Schedule",detail:"Jobs and appointments",Icon:CalendarDays,action:()=>onSection("schedule")},
  {label:"Tech routes",detail:"Timing, staffing and risk",Icon:Route,action:()=>onSection("dispatch")},
  {label:"Job board",detail:"Assignments and follow-ups",Icon:ClipboardList,action:()=>onSection("tickets")}
 ];
 return <>
 <div className="sterling-sbo-center">
   <header className="sterling-sbo-office-top">
     <div className="sterling-sbo-office-brand"><span>YOUR OFFICE · TODAY <span className="sterling-sbo-private-tag">PRIVATE · SIMULATED</span></span><h1>Sterling Property Services</h1><p>One command center. Your next action is one tap away.</p></div>
     <div className="sterling-sbo-top-actions">
       <div className="sterling-sbo-bots" aria-label="AI employee demo portraits">
         {AVATARS.map(person=><button type="button" title={person.name+" · "+person.role} aria-label={"Open "+person.name+" AI employee"} key={person.id} onClick={()=>onBot(person.name)}><img alt="" src={getAvatarPhotoForUser(person,user)}/><span>{person.name}</span></button>)}
         <button type="button" title="View AI team" aria-label="View all AI employees" onClick={()=>onSection("ai")} className="sterling-sbo-bot-team"><Users size={18}/><span>Team</span></button>
       </div>
       <Link to="/customer" className="sterling-sbo-return" title="Return to your customer dashboard">My Dashboard <ArrowRight size={14}/></Link>
     </div>
   </header>
   <section className="sterling-sbo-pulse">
     <div><span>OPERATIONS PULSE</span><p>{idle.length} under-scheduled technicians · {atRisk} high-priority active jobs · {money(kpi.outstanding)} receivable</p></div>
     <button type="button" onClick={()=>onSection("hr")}>Details <ArrowRight size={14}/></button>
   </section>
   <div className="sterling-sbo-metrics">
     <button type="button" onClick={()=>onSection("tickets")}><strong>{kpi.active}</strong><span>Open jobs</span></button>
     <button type="button" onClick={()=>onSection("dispatch")}><strong>{atRisk}</strong><span>Priority risk</span></button>
     <button type="button" onClick={()=>onSection("hr")}><strong>{roster.filter(p=>p.clockedIn).length}</strong><span>Clocked in · demo</span></button>
   </div>
   <div className="sterling-sbo-action-grid">{operations.map(({label,detail,Icon,action})=><button type="button" key={label} onClick={action}><Icon size={25}/><strong>{label}</strong><span>{detail}</span></button>)}</div>
   <nav className="sterling-sbo-mobile-actions" aria-label="Business shortcuts"><button onClick={()=>onSection("hr")}>HR & Timeclock</button><button onClick={()=>onSection("finance")}>Finance</button><button onClick={()=>onSection("ceo")}>CEO</button></nav>
 </div>
 <aside className="sterling-sbo-intelligence" aria-label="Business quick intelligence">
  <div className="sterling-sbo-intelligence-title"><strong>Quick intelligence</strong><button aria-label="Open executive analytics" onClick={()=>onSection("ceo")}><ChevronRight size={17}/></button></div>
  <button type="button" className="sterling-sbo-intel-card sterling-sbo-revenue" onClick={()=>onSection("finance")}>
   <span>Invoiced revenue <strong>{money(kpi.invoiced)}</strong></span>
   <div className="sterling-sbo-spark" aria-hidden="true">{[35,44,52,41,63,56,73,65,84,76,91,99].map((v,i)=><i key={i} style={{height:v+"%"}}/>)}</div>
   <small>Cash collected {money(kpi.collected)} · Simulated ledger</small>
  </button>
  <button type="button" className="sterling-sbo-intel-card" onClick={()=>onSection("team")}>
   <span>Technician leaderboard</span>
   {leaders.map((p,i)=><div className="sterling-sbo-leader" key={p.id}><span>{i+1}. {p.name}</span><strong>{p.completed}</strong></div>)}
   <small>Example completed job counts</small>
  </button>
  <div className="sterling-sbo-intel-bottom">
   <button onClick={()=>onSection("hr")}>{idle.length} under-scheduled · Avg travel {avgTravel} min</button>
   <button onClick={()=>onSection("ceo")}>CEO & reports <ChevronRight size={14}/></button>
  </div>
 </aside>
 </>;
}
