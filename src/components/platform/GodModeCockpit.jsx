import React, { useEffect, useState } from "react";
import { Activity, ArrowUpRight, BellRing, Bot, BriefcaseBusiness, CheckCircle2, ChevronRight, CreditCard, Layers3, RefreshCw, ShieldCheck, Users, Workflow } from "lucide-react";
import api from "../../api/client";

const GROUPS = [
  { title: "People & Growth", subtitle: "Users, businesses, acquisition", icon: Users, tone: "cyan", links: [["users","Users"],["businesses","Businesses"],["prospects","Prospects"],["testers","Testers"],["growth_os","Growth OS"],["affiliates","Affiliates"]] },
  { title: "Revenue & Operations", subtitle: "Payments, service, communications", icon: CreditCard, tone: "violet", links: [["billing","Billing"],["requests","Support"],["ads","Ads"],["broadcasts","Broadcasts"],["news","News"]] },
  { title: "Build & Automation", subtitle: "Approvals, pipeline and AI workers", icon: Bot, tone: "blue", links: [["__build_backlog","Build Backlog"],["developer_agent","Developer Agent"],["pilot_readiness","Pilot Readiness"]] },
  { title: "Quality & Release", subtitle: "Platform readiness and testing", icon: ShieldCheck, tone: "amber", links: [["health_launch_lock","Health Launch"],["health_smoke_test","Health Testing"],["pilot_readiness","Pilot Readiness"]] },
];

function Tile({ icon: Icon, label, value, help, loading }) {
  return <div className="sw-god-stat-tile">
    <div className="sw-god-stat-top"><Icon size={17} aria-hidden="true"/><span>{label}</span></div>
    <strong>{loading ? "…" : value}</strong>
    <small>{help}</small>
  </div>;
}

export default function GodModeCockpit({ onOpen }) {
  const [info,setInfo] = useState({ loading:true, summary:null, alerts:null, error:"" });
  async function refresh() {
    setInfo(x=>({...x,loading:true,error:""}));
    try {
      const [summary, alerts] = await Promise.all([
        api.get("/platform/metrics/summary/?days=30"),
        api.get("/platform/metrics/alerts/")
      ]);
      setInfo({ loading:false, summary:summary.data,alerts:alerts.data,error:"" });
    } catch {
      setInfo(x=>({...x,loading:false,error:"Live platform metrics are unavailable. Refresh to retry."}));
    }
  }
  useEffect(()=>{ refresh(); },[]);
  const s=info.summary, a=info.alerts;
  const fmt=(value)=>value===null || value===undefined ? "—" : Number(value).toLocaleString("en-US");
  const money=(value)=>value===null || value===undefined ? "—" : (Number(value)/100).toLocaleString("en-US",{style:"currency",currency:"USD"});
  return <div className="sw-god-cockpit">
    <header className="sw-god-cockpit-header">
      <div><p className="sw-god-eyebrow"><Activity size={13}/> Founder command center</p><h1>SYNCWORKS <span>GOD MODE</span></h1><p className="sw-god-tagline">Platform intelligence · Growth · Operations · Launch readiness</p></div>
      <div className="sw-god-header-actions">
        <button type="button" onClick={refresh} aria-label="Refresh platform metrics"><RefreshCw size={16}/><span>Refresh</span></button>
        <button type="button" onClick={()=>onOpen("developer_agent")}><Bot size={16}/> Developer Agent</button>
        <button type="button" onClick={()=>onOpen("pilot_readiness")}><ShieldCheck size={16}/> Release</button>
      </div>
    </header>
    {info.error && <p role="status" className="sw-god-data-alert">{info.error}</p>}
    <section className="sw-god-kpis" aria-label="Platform overview">
      <Tile icon={Users} label="Registered users" value={fmt(s?.users_total)} help="All accounts" loading={info.loading}/>
      <Tile icon={BriefcaseBusiness} label="Businesses" value={fmt(s?.businesses_total)} help="Platform accounts" loading={info.loading}/>
      <Tile icon={CreditCard} label="GMV · 30 days" value={money(s?.gmv_30d)} help="Processed volume" loading={info.loading}/>
      <Tile icon={Activity} label="Fees collected" value={money(s?.platform_fee_collected_30d)} help="30-day window" loading={info.loading}/>
      <Tile icon={BellRing} label="Open tickets" value={fmt(a?.executive?.tickets_open)} help="Support & service" loading={info.loading}/>
      <Tile icon={ShieldCheck} label="Alerts" value={fmt(a?.executive?.alerts_count)} help="Review attention items" loading={info.loading}/>
    </section>
    <div className="sw-god-workarea">
      <section className="sw-god-module-grid" aria-label="God Mode departments">
        {GROUPS.map(g=><article key={g.title} className={"sw-god-department sw-god-"+g.tone}>
          <div className="sw-god-department-heading"><span className="sw-god-department-icon"><g.icon size={23}/></span><div><h2>{g.title}</h2><p>{g.subtitle}</p></div></div>
          <div className="sw-god-department-links">{g.links.map(([id,label])=><button type="button" key={id} onClick={()=>onOpen(id)}><span>{label}</span><ChevronRight size={14}/></button>)}</div>
        </article>)}
      </section>
      <aside className="sw-god-quick-column" aria-label="Executive shortcuts">
        <section className="sw-god-action-panel">
          <p className="sw-god-eyebrow"><Layers3 size={13}/> Quick access</p>
          <h2>Run the platform</h2>
          <button onClick={()=>onOpen("__build_backlog")}><Workflow size={18}/> Open build pipeline <ArrowUpRight size={15}/></button>
          <button onClick={()=>onOpen("requests")}><BellRing size={18}/> Review support <ArrowUpRight size={15}/></button>
          <button onClick={()=>onOpen("billing")}><CreditCard size={18}/> Revenue & billing <ArrowUpRight size={15}/></button>
          <button onClick={()=>onOpen("pilot_readiness")}><CheckCircle2 size={18}/> Release checklist <ArrowUpRight size={15}/></button>
        </section>
        <div className="sw-god-assistant-hint"><Bot size={19}/><div><strong>Chief of Staff</strong><span>Victoria is docked at the bottom right for founder assistance.</span></div></div>
      </aside>
    </div>
  </div>;
}
