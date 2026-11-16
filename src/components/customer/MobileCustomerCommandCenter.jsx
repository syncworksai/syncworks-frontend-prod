import React, { useState } from "react";
import { AlertTriangle, Bell, BriefcaseBusiness, CalendarDays, ChevronRight, CloudSun, Dumbbell, Grid2X2, Inbox, LayoutGrid, Plus, Sparkles, WalletCards } from "lucide-react";
import "./MobileCustomerCommandCenter.css";

export default function MobileCustomerCommandCenter({ name, brief, attentionCount, todayEvents, openTickets, weatherValue, workout, minimums, businessConnected, pmConnected, tenantConnected, onNavigate, onOpenWorkspace, theme }) {
  const [briefExpanded, setBriefExpanded] = useState(false);
  const [activePanel, setActivePanel] = useState(null);
  const open = (route) => { setActivePanel(null); onNavigate(route); };
  const modules = [
    { label: "Office", sub: "Work & property", Icon: BriefcaseBusiness, action: () => onOpenWorkspace("daily") },
    { label: "My Day", sub: "Agenda & tasks", Icon: CalendarDays, action: () => setActivePanel("day") },
    { label: "Health", sub: "Fitness & wellness", Icon: Dumbbell, action: () => open("/customer/health") },
    { label: "Finance", sub: "Money & payments", Icon: WalletCards, action: () => open("/customer/finance") },
  ];
  return (
    <section className="sw-mobile-command" data-mobile-theme={theme} aria-label="Mobile personal command center">
      <div className="sw-mobile-command-top">
        <div><span className="sw-mobile-kicker">PERSONAL WORKSPACE</span><h1>Hey, {name}</h1></div>
        <button type="button" className="sw-mobile-icon-button" onClick={() => setActivePanel("updates")} aria-label="Review alerts and updates"><Bell size={19}/>{attentionCount > 0 && <span className="sw-mobile-notification">{attentionCount > 9 ? "9+" : attentionCount}</span>}</button>
      </div>
      <div className="sw-mobile-command-brief">
        <button type="button" className="sw-mobile-brief-header" aria-expanded={briefExpanded} onClick={() => setBriefExpanded(!briefExpanded)}>
          <span><Sparkles size={15}/> YOUR SYNC BRIEF</span><ChevronRight size={16} className={briefExpanded ? "sw-mobile-rotate" : ""}/>
        </button>
        <p className={briefExpanded ? "sw-mobile-brief-copy expanded" : "sw-mobile-brief-copy"}>{brief}</p>
        <div className="sw-mobile-facts">
          <button type="button" onClick={() => open("/customer/weather")}><CloudSun size={17}/><span>{weatherValue}</span></button>
          <button type="button" onClick={() => open("/calendar")}><CalendarDays size={17}/><span>{todayEvents} today</span></button>
          <button type="button" onClick={() => setActivePanel("updates")}><AlertTriangle size={17}/><span>{attentionCount ? attentionCount + " alerts" : "All clear"}</span></button>
        </div>
      </div>
      <div className="sw-mobile-module-grid">
        {modules.map(({ label, sub, Icon, action }) => <button type="button" key={label} className="sw-mobile-module" onClick={action}><Icon size={22}/><strong>{label}</strong><small>{sub}</small></button>)}
      </div>
      <div className="sw-mobile-command-actions">
        <button type="button" onClick={() => open("/customer/new-request")}><Plus size={17}/> New request</button>
        <button type="button" onClick={() => onOpenWorkspace("apps")}><Grid2X2 size={17}/> All apps</button>
      </div>
      {activePanel && <div className="sw-mobile-sheet-backdrop" onClick={() => setActivePanel(null)} role="presentation"><div className="sw-mobile-sheet" role="dialog" aria-modal="true" aria-label={activePanel === "day" ? "Today's agenda" : "Updates"} onClick={e => e.stopPropagation()}>
        <div className="sw-mobile-sheet-head"><strong>{activePanel === "day" ? "Your day" : "Needs attention"}</strong><button type="button" onClick={() => setActivePanel(null)}>Close</button></div>
        {activePanel === "day" ? <><p>{todayEvents ? `${todayEvents} calendar event(s) today.` : "No events on your calendar today."}</p><p>{workout ? "Workout scheduled today." : "No workout scheduled yet."}</p><button type="button" onClick={() => open("/calendar")}><CalendarDays size={18}/> Open calendar</button><button type="button" onClick={() => open("/customer/tasks")}><LayoutGrid size={18}/> Open tasks</button></> : <><p>{attentionCount ? `${attentionCount} item(s) need attention.` : "Nothing urgent at the moment."}</p><p>{openTickets} active service request(s) · Monthly debt minimums {minimums}</p><button type="button" onClick={() => open("/customer/tickets")}><Inbox size={18}/> Service activity</button><button type="button" onClick={() => open("/customer/invoices")}><WalletCards size={18}/> Payments</button></>}
        {(businessConnected || pmConnected || tenantConnected) && activePanel === "day" && <button type="button" onClick={() => onOpenWorkspace("business")}><BriefcaseBusiness size={18}/> Business & property</button>}
      </div></div>}
    </section>
  );
}
