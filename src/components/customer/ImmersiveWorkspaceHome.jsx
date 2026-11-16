import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, CheckCheck, ClipboardPlus, Command, ArrowUpRight, BriefcaseBusiness, Building2, ChartNoAxesCombined, HeartPulse, Spade, ShoppingBag, Sparkles, Clock3, LayoutGrid, Mail, Palette, SunMedium } from "lucide-react";
import "./ImmersiveWorkspaceHome.css";

const destinations = [
  { label:"Business", detail:"Customers & operations", path:"/sbo", icon:BriefcaseBusiness, className:"business" },
  { label:"Property", detail:"Tenants & properties", path:"/pm", icon:Building2, className:"property" },
  { label:"Finance", detail:"Payments & budgets", path:"/customer/finance", icon:ChartNoAxesCombined, className:"finance" },
  { label:"Health", detail:"Your wellness", path:"/customer/health", icon:HeartPulse, className:"health" },
  { label:"Games", detail:"Poker lounge & clubs", path:"/customer/games", icon:Spade, className:"games" },
  { label:"Shop Assist", detail:"Find what you need", path:"/customer/store", icon:ShoppingBag, className:"shop" },
];
const actionItems = [
 {label:"New request", path:"/customer/new-request", icon:ClipboardPlus},
 {label:"Calendar", path:"/calendar", icon:CalendarDays},
 {label:"My tasks", path:"/customer/tasks", icon:CheckCheck},
 {label:"Inbox", path:"/customer/inbox", icon:Mail},
 {label:"Quick capture", path:"/sync?prompt=Help%20me%20turn%20an%20appointment%20message%20into%20a%20calendar%20event.", icon:ClipboardPlus},
];
export default function ImmersiveWorkspaceHome({ displayName = "there", theme, onOpenLauncher, onOpenAppearance }) {
  const nav = useNavigate();
  const [showAll, setShowAll] = useState(true);
  return <section className="sw-immersive-home" aria-label="Your personal command center">
    <div className="sw-immersive-office-art" aria-hidden="true">
      <span className="sw-immersive-office-light"/><span className="sw-immersive-office-frame"/>
      <span className="sw-immersive-office-shelf"/><span className="sw-immersive-office-desk"/>
    </div>
    <div className="sw-immersive-content">
      <div className="sw-immersive-hero">
        <div className="sw-immersive-welcome">
          <div className="sw-immersive-kicker"><span className="sw-immersive-live-dot"/> PERSONAL COMMAND CENTER <span className="sw-immersive-kicker-line"/></div>
          <h1>Welcome to your workspace, <em>{displayName}.</em></h1>
          <p>Your business, property, schedule, and everyday life—organized in one place.</p>
          <div className="sw-immersive-top-actions">
            <button type="button" onClick={()=>nav("/sync")} className="sw-immersive-ask"><Sparkles size={17}/> Ask SYNC Assist <ArrowUpRight size={16}/></button>
            <button type="button" onClick={onOpenAppearance} className="sw-immersive-customize"><Palette size={17}/> Customize your office</button>
          </div>
        </div>
        <div className="sw-immersive-focus" role="group" aria-label="Your command center shortcuts">
          <div className="sw-immersive-focus-caption"><Command size={17}/> YOUR COMMAND CENTER</div>
          <button type="button" onClick={()=>nav("/calendar")}><CalendarDays size={18}/><span>Open today's calendar</span><ArrowUpRight size={16}/></button>
          <button type="button" onClick={()=>nav("/customer/tasks")}><CheckCheck size={18}/><span>Review tasks</span><ArrowUpRight size={16}/></button>
          <button type="button" onClick={()=>nav("/sync")}><Sparkles size={18}/><span>Get my daily briefing</span><ArrowUpRight size={16}/></button>
        </div>
      </div>
      <div className="sw-immersive-action-strip" aria-label="Quick actions">
        {actionItems.map(({label,path,icon:Icon})=><button key={label} type="button" onClick={()=>nav(path)}><Icon size={19}/><span>{label}</span></button>)}
        <button type="button" onClick={onOpenLauncher}><LayoutGrid size={19}/><span>All tools</span></button>
      </div>
      <div className="sw-immersive-workspaces-heading">
        <div><span className="sw-immersive-mini">YOUR DESTINATIONS</span><h2>My Workspaces</h2></div>
        <button type="button" onClick={()=>setShowAll(v=>!v)} aria-expanded={showAll}>{showAll?"Collapse":"Show workspaces"} <ArrowUpRight size={15}/></button>
      </div>
      {showAll && <div className="sw-immersive-destinations">{destinations.map(({label,detail,path,icon:Icon,className})=><button className={`sw-immersive-destination sw-immersive-destination-${className}`} key={label} type="button" onClick={()=>nav(path)}><span className="sw-immersive-destination-icon"><Icon size={24}/></span><strong>{label}</strong><small>{detail}</small><ArrowUpRight className="sw-immersive-destination-arrow" size={15}/></button>)}</div>}
      <div className="sw-immersive-bottom">
        <span><Clock3 size={15}/> Your live updates, calendar, and connections continue below.</span>
        <button type="button" onClick={()=>nav("/customer/weather")}><SunMedium size={15}/> Check weather <ArrowUpRight size={13}/></button>
      </div>
    </div>
  </section>;
}
