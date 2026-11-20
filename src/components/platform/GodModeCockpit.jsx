import React, { useEffect, useState } from "react";
import { Activity, ArrowUpRight, BellRing, Bot, BriefcaseBusiness, CheckCircle2, ChevronRight, CreditCard, Layers3, RefreshCw, ShieldCheck, Users, Workflow } from "lucide-react";
import api from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { AVATARS, getAvatarPhotoForUser } from "../sync/JarvisAvatar";

const GROUPS = [
  { title: "People & Growth", subtitle: "Users, businesses, acquisition", icon: Users, tone: "cyan", links: [["users","User Control"],["user_directory","Directory"],["businesses","Businesses"],["prospects","Prospects"],["testers","Testers"],["growth_os","Growth OS"],["affiliates","Affiliates"]] },
  { title: "Revenue & Operations", subtitle: "Payments, service, communications", icon: CreditCard, tone: "violet", links: [["billing","Billing"],["requests","Support"],["ads","Ads"],["broadcasts","Broadcasts"],["news","News"]] },
  { title: "Build & Automation", subtitle: "Approvals, pipeline and AI workers", icon: Bot, tone: "blue", links: [["operations_desk","Operations Desk"],["__build_backlog","Build Backlog"],["developer_agent","Developer Agent"],["pilot_readiness","Pilot Readiness"]] },
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
  const { user } = useAuth();
  const chiefAvatar = AVATARS.find(a => a.role === "Chief of Staff") || AVATARS[0];
  const openVictoria = () => window.dispatchEvent(new Event("syncworks:victoria-open"));
  const openCommerce = () => window.dispatchEvent(new Event("syncworks:commerce-kpis-open"));
  const [info,setInfo] = useState({ loading:true, summary:null, alerts:null, error:"" });
  const [mobileGroup, setMobileGroup] = useState(0);
  async function refresh() {
    setInfo(x=>({...x,loading:true,error:""}));
    const [summary, alerts] = await Promise.allSettled([
      api.get("/platform/metrics/summary/?days=30"),
      api.get("/platform/metrics/alerts/")
    ]);
    let metricData = summary.status === "fulfilled" ? summary.value.data : null;
    const alertData = alerts.status === "fulfilled" ? alerts.value.data : null;
    if (!metricData || metricData.users_total == null) {
      try {
        const usersResponse = await api.get("/platform/users/");
        const data = usersResponse.data;
        const count = Array.isArray(data) ? data.length : Array.isArray(data?.results) ? data.results.length : null;
        if (count !== null) {
          metricData = { ...(metricData || {}), users_total: data?.count ?? count };
        }
      } catch { /* No invented counts when every source fails. */ }
    }
    setInfo({
      loading:false, summary:metricData, alerts:alertData,
      error:summary.status === "rejected" || alerts.status === "rejected"
        ? "Some platform metrics are unavailable; verified values remain visible." : ""
    });
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
        <button type="button" onClick={()=>onOpen("operations_desk")}><Bot size={16}/> Assign Work</button>
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
      <div className="sw-god-mobile-departments" aria-label="Choose God Mode department">
        <div className="sw-god-mobile-department-switch">{GROUPS.map((g,i)=><button type="button" key={g.title} aria-pressed={mobileGroup===i} onClick={()=>setMobileGroup(i)}><g.icon size={17}/><span>{g.title}</span></button>)}</div>
        <div className="sw-god-mobile-department-content"><p>{GROUPS[mobileGroup].subtitle}</p><div>{GROUPS[mobileGroup].links.map(([id,label])=><button key={id} type="button" onClick={()=>onOpen(id)}>{label}<ChevronRight size={15}/></button>)}</div><button type="button" onClick={openVictoria} className="sw-god-mobile-victoria" aria-label="Open Victoria Chief of Staff briefing"><img src={getAvatarPhotoForUser(chiefAvatar,user)} alt="" /><span>Victoria · Chief of Staff</span><ChevronRight size={16}/></button></div>
      </div>
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
          <button onClick={()=>onOpen("operations_desk")}><Workflow size={18}/> Operations Desk · Assign work <ArrowUpRight size={15}/></button>
          <button onClick={()=>onOpen("requests")}><BellRing size={18}/> Review support <ArrowUpRight size={15}/></button>
          <button onClick={()=>onOpen("billing")}><CreditCard size={18}/> Revenue & billing <ArrowUpRight size={15}/></button>
          <button onClick={openCommerce}><Activity size={18}/> Commerce KPIs <ArrowUpRight size={15}/></button>
          <button onClick={()=>onOpen("pilot_readiness")}><CheckCircle2 size={18}/> Release checklist <ArrowUpRight size={15}/></button>
        </section>
        <button type="button" className="sw-god-assistant-hint sw-god-victoria-dock" onClick={openVictoria} aria-label="Open Victoria Chief of Staff briefing"><img src={getAvatarPhotoForUser(chiefAvatar,user)} alt="" className="sw-god-victoria-avatar" /><div><strong>Victoria · Chief of Staff</strong><span>Open briefing and approvals</span></div><ChevronRight size={17} aria-hidden="true" /></button>
      </aside>
    </div>
  </div>;
}
