import React, { useEffect, useState } from "react";
import { fetchPersonalCalendarEvents } from "../../api/personalCalendarAgenda";
import { useNavigate } from "react-router-dom";
import { CalendarDays, CheckCheck, ClipboardPlus, Command, ArrowUpRight, BriefcaseBusiness, Building2, ChartNoAxesCombined, HeartPulse, Spade, ShoppingBag, Sparkles, Clock3, LayoutGrid, Mail, Palette, SunMedium } from "lucide-react";
import "./ImmersiveWorkspaceHome.css";
import CustomerScheduleWidget from "./CustomerScheduleWidget";
import "./OfficePhotoBackground.css";
import "./OfficePhotoRefinements.css";
import "./GameLobbyV17.css";
import "./OfficeThemeAssetsV18.css";

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
  const [showAll, setShowAll] = useState(false);
  const [todayAgenda, setTodayAgenda] = useState([]);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const rows = await fetchPersonalCalendarEvents();
        const today = new Date().toDateString();
        if (active) setTodayAgenda(rows.filter(event => String(event?.metadata?.entity_type || "").toUpperCase() !== "TASK" && event.start_at && new Date(event.start_at).toDateString() === today).sort((a,b) => new Date(a.start_at) - new Date(b.start_at)));
      } catch { if (active) setTodayAgenda([]); }
    };
    load();
    window.addEventListener("focus", load);
    return () => { active = false; window.removeEventListener("focus", load); };
  }, []);
  return <section className="sw-immersive-home" aria-label="Your personal command center">
    <div className="sw-immersive-office-art" aria-hidden="true">
      <span className="sw-immersive-office-light"/><span className="sw-immersive-office-frame"/>
      <span className="sw-immersive-office-shelf"/><span className="sw-immersive-office-desk"/>
    </div>
    <div className="sw-immersive-content sw-lobby-content">
      <div className="sw-lobby-scene-label" aria-hidden="true">YOUR PERSONAL HQ <span>•</span> COMMAND CENTER</div>
      <div className="sw-immersive-hero">
        <div className="sw-immersive-welcome">
          <div className="sw-immersive-kicker"><span className="sw-immersive-live-dot"/> YOUR HOME BASE <span className="sw-immersive-kicker-line"/></div>
          <h1>Welcome to your workspace, <em>{displayName}.</em></h1>
          <p>Everything you manage, one beautiful place to begin.</p>
          <div className="sw-immersive-top-actions">
            <button type="button" onClick={()=>nav("/sync")} className="sw-immersive-ask"><Sparkles size={17}/> Talk to SYNC <ArrowUpRight size={16}/></button>
            <button type="button" onClick={onOpenAppearance} className="sw-immersive-customize"><Palette size={17}/> Customize your office</button>
          </div>
        </div>
        <CustomerScheduleWidget />
        <div className="sw-immersive-focus" role="group" aria-label="Your command center shortcuts">
          <div className="sw-immersive-focus-caption"><Command size={17}/> YOUR COMMAND CENTER</div>
          <div style={{padding:"7px 10px",borderRadius:10,background:"rgba(5,15,33,.78)",border:"1px solid rgba(81,211,244,.24)",color:"#e4f6ff",fontSize:11}}>
            <div style={{fontWeight:800,display:"flex",alignItems:"center",gap:6}}><CalendarDays size={14}/> Today · {todayAgenda.length} scheduled</div>
            {todayAgenda.slice(0,2).map(event => <button type="button" key={event.id} onClick={() => nav("/calendar")} style={{display:"flex",gap:8,width:"100%",padding:"5px 0",minWidth:0,textAlign:"left",color:"#d8e7f7"}}>
              <span style={{flexShrink:0,color:"#73daf3"}}>{event.all_day ? "All day" : new Date(event.start_at).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}</span>
              <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{event.title}</span>
            </button>)}
            {!todayAgenda.length && <span style={{color:"#b9cadd"}}>No events scheduled today</span>}
          </div>
          <button type="button" onClick={()=>nav("/calendar")}><CalendarDays size={18}/><span>Open today's calendar</span><ArrowUpRight size={16}/></button>
          <button type="button" onClick={()=>nav("/customer/tasks")}><CheckCheck size={18}/><span>Review tasks</span><ArrowUpRight size={16}/></button>
          <button type="button" onClick={()=>nav("/sync")}><Sparkles size={18}/><span>Get my daily briefing</span><ArrowUpRight size={16}/></button>
        </div>
      </div>
      <div className="sw-lobby-primary">
        <span className="sw-lobby-primary-caption">YOUR OFFICE IS READY</span>
        <button type="button" className="sw-lobby-start" onClick={()=>nav("/customer?view=office")}><LayoutGrid size={22}/><span>ENTER MY OFFICE</span><ArrowUpRight size={19}/></button>

      </div>
      <div className="sw-immersive-bottom sw-lobby-bottom">
        <span><Clock3 size={15}/> A place to focus. Enter your office when you’re ready.</span>

      </div>
    </div>
  </section>;
}
