import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Bell, BriefcaseBusiness, CalendarDays, ChevronRight, CloudSun, Clock3, Grid2X2, Inbox, LayoutGrid, MapPin, Plus, Sparkles, WalletCards, Archive, RotateCcw, X } from "lucide-react";
import "./MobileCustomerCommandCenter.css";
import "./MobileAttentionTopV35.css";

function shortDate(date) {
  return new Intl.DateTimeFormat("en-US", {month:"2-digit",day:"2-digit",year:"2-digit"}).format(date);
}
function shortTime(date) {
  return new Intl.DateTimeFormat("en-US", {hour:"numeric",minute:"2-digit",hour12:true}).format(date);
}
function eventCategory(event) {
  return String(event?.metadata?.event_category || (event?.metadata?.business_id ? "BUSINESS" : "PERSONAL")).toUpperCase() === "BUSINESS" ? "BUSINESS" : "PERSONAL";
}
function eventIntervalOverlaps(event, start, end) {
  const eventStart = new Date(event?.start_at || event?.start).getTime();
  if (!Number.isFinite(eventStart)) return false;
  const candidateEnd = new Date(event?.end_at || event?.end || event?.start_at).getTime();
  const eventEnd = Number.isFinite(candidateEnd) && candidateEnd > eventStart ? candidateEnd : eventStart + 3600000;
  return eventStart < end.getTime() && eventEnd > start.getTime();
}
function weatherLocation(weather) {
  const place = weather?.location || {};
  return [place.city || place.name || place.locality, place.state || place.region].filter(Boolean).join(", ") || "Your location";
}
export default function MobileCustomerCommandCenter({ name, brief, attentionCount, todayEvents, calendarEvents = [], openTickets, weather, weatherState, notifications = [], workout, minimums, businessConnected, pmConnected, tenantConnected, onNavigate, onOpenWorkspace, theme, attentionUserKey = "local" }) {
  const [now, setNow] = useState(() => new Date());
  const [activePanel, setActivePanel] = useState(null);
  const archiveKey = `sw_home_attention_archive_v1:${attentionUserKey}`;
  const [archivedNotices, setArchivedNotices] = useState(() => {
    try { const rows = JSON.parse(localStorage.getItem(archiveKey) || "[]"); return Array.isArray(rows) ? rows : []; }
    catch { return []; }
  });
  useEffect(() => {
    try { const rows = JSON.parse(localStorage.getItem(archiveKey) || "[]"); setArchivedNotices(Array.isArray(rows) ? rows : []); }
    catch { setArchivedNotices([]); }
  }, [archiveKey]);
  function storeArchived(next) {
    setArchivedNotices(next);
    try { localStorage.setItem(archiveKey, JSON.stringify(next)); } catch { /* optional storage */ }
  }
  function archiveAttention(item) {
    storeArchived([...archivedNotices.filter(row => row.id !== item.id), { ...item, archived_at: new Date().toISOString() }].slice(-100));
  }
  function archiveAll(items) {
    const byId = new Map(archivedNotices.map(item => [item.id, item]));
    for (const item of items) byId.set(item.id, { ...item, archived_at: new Date().toISOString() });
    storeArchived([...byId.values()].slice(-100));
  }
  function restoreAttention(id) { storeArchived(archivedNotices.filter(item => item.id !== id)); }

  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = window.setInterval(tick, 15000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", tick); document.removeEventListener("visibilitychange", tick); };
  }, []);
  const open = (route) => { setActivePanel(null); onNavigate(route); };
  const temperature = Number(weather?.current?.temp_f);
  const hasTemperature = weatherState === "ready" && Number.isFinite(temperature) && weather?.current?.temp_f != null;
  const temperatureLabel = hasTemperature ? `${Math.round(temperature)}°F` : weatherState === "loading" ? "Loading…" : "Unavailable";
  const condition = weather?.current?.description || weather?.current?.condition || "Tap for forecast";
  const attentionItems = notifications.filter(item => !archivedNotices.some(row => row.id === item.id));
  const visibleNotifications = attentionItems.slice(0, 2);
  // A compact rolling hourly agenda: show the current hour and next three.
  // Render only recorded calendar events; do not invent appointments.
  const currentHour = new Date(now);
  currentHour.setMinutes(0, 0, 0);
  const hourlySlots = Array.from({ length: 4 }, (_, index) => {
    const start = new Date(currentHour.getTime() + index * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const matches = calendarEvents.filter(item => !item?.all_day && eventIntervalOverlaps(item,start,end)).sort((a,b)=>new Date(a.start_at)-new Date(b.start_at));
    return { start, events: matches, active: index === 0 };
  });
  const hourText = (date) => new Intl.DateTimeFormat("en-US", {hour:"numeric",hour12:true}).format(date);
  const eventText = (event) => String(event?.title || event?.name || "Calendar event");
  return (
    <section className="sw-mobile-command" data-mobile-theme={theme} aria-label="Mobile personal command center">
      <div className="sw-mobile-command-top">
        <div><span className="sw-mobile-kicker">PERSONAL WORKSPACE</span><h1>Hey, {name}</h1></div>
        <button type="button" className="sw-mobile-icon-button" onClick={() => setActivePanel("updates")} aria-label="Review alerts and updates"><Bell size={19}/>{attentionItems.length > 0 && <span className="sw-mobile-notification">{attentionItems.length > 9 ? "9+" : attentionItems.length}</span>}</button>
      </div>
      <div className="sw-mobile-command-brief">
        <div className="sw-mobile-brief-title">
          <span><Sparkles size={15}/> YOUR SYNC BRIEF</span>
          <time dateTime={now.toISOString()} aria-label="Current date and time"><Clock3 size={13}/> {shortDate(now)} · {shortTime(now)}</time>
        </div>
        <div className="sw-mobile-brief-columns">
          <button className="sw-mobile-live-weather" type="button" onClick={() => open("/customer/weather")} aria-label="Open detailed weather and forecast">
            <span className="sw-mobile-widget-heading"><CloudSun size={17}/> WEATHER <ChevronRight size={13}/></span>
            <strong>{temperatureLabel}</strong>
            <small>{hasTemperature ? condition : weatherState === "loading" ? "Finding local forecast" : "Tap to set up weather"}</small>
            <span className="sw-mobile-location"><MapPin size={12}/>{hasTemperature ? weatherLocation(weather) : "Location weather"}</span>
          </button>
          <button className="sw-mobile-live-alerts" type="button" onClick={() => setActivePanel("updates")} aria-label="Open notifications and attention items">
            <span className="sw-mobile-widget-heading"><AlertTriangle size={17}/> ATTENTION <ChevronRight size={13}/></span>
            {visibleNotifications.length ? <div className="sw-mobile-alert-lines sw-mobile-attention-glow">{visibleNotifications.map(item => <span key={item.id}>{item.label}</span>)}</div> : <><strong>All clear</strong><small>No urgent items</small></>}
            <span className="sw-mobile-alert-footer">{visibleNotifications.length ? "Tap for details" : `${todayEvents} events today`}</span>
          </button>
        </div>
      </div>
      <section className="sw-mobile-hourly-agenda" aria-label="My Day hourly calendar">
        <div className="sw-mobile-hourly-heading">
          <span><CalendarDays size={17}/> MY DAY <small>Hourly agenda</small></span>
          <button type="button" onClick={() => open("/calendar")}>Calendar <ChevronRight size={16}/></button>
        </div>
        <div className="sw-mobile-hourly-rows">
          {hourlySlots.map(({ start, events, active }) => (
            <button type="button" className={`sw-mobile-hour-row ${active ? "is-current" : ""} ${events.length ? "has-event" : ""} ${events[0] ? "is-"+eventCategory(events[0]).toLowerCase() : ""}`} key={start.toISOString()} onClick={() => open("/calendar")} aria-label={`${hourText(start)}: ${events.length ? events.map(eventText).join(", ") : "Nothing scheduled"}`}>
              <time dateTime={start.toISOString()}>{hourText(start)}</time>
              <span className="sw-mobile-hour-line" aria-hidden="true"/>
              <span className="sw-mobile-hour-events">
                {events.length ? <><strong>{eventText(events[0])}</strong><small>{eventCategory(events[0]) === "BUSINESS" ? (events[0]?.metadata?.business_name || "Business") : "Personal"} · {shortTime(new Date(events[0].start_at))}{events[0].end_at ? "–"+shortTime(new Date(events[0].end_at)) : ""}</small>{events.length > 1 && <small>+{events.length - 1} more</small>}</> : <small>{active ? "No event this hour" : "Open"}</small>}
              </span>
              {active && <span className="sw-mobile-hour-now">NOW</span>}
            </button>
          ))}
        </div>
      </section>
      <div className="sw-mobile-command-actions sw-mobile-actions-three">
        <button type="button" onClick={() => onOpenWorkspace("office")}><BriefcaseBusiness size={17}/> Office</button>
        <button type="button" onClick={() => open("/customer/new-request")}><Plus size={17}/> New Request</button>
        <button type="button" onClick={() => onOpenWorkspace("apps")}><Grid2X2 size={17}/> Apps</button>
      </div>
      {activePanel && createPortal(<div className="sw-mobile-sheet-backdrop sw-mobile-attention-top-backdrop" onClick={() => setActivePanel(null)} role="presentation">
        <div className="sw-mobile-sheet sw-mobile-attention-top-sheet" role="dialog" aria-modal="true" aria-label={activePanel === "archive" ? "Attention archive" : activePanel === "day" ? "Today's agenda" : "Needs attention"} onClick={e => e.stopPropagation()}>
          <div className="sw-mobile-sheet-head sw-mobile-attention-sticky-head">
            <strong>{activePanel === "day" ? "Your day" : activePanel === "archive" ? "Attention archive" : "Needs attention"}</strong>
            <button type="button" onClick={() => setActivePanel(null)} aria-label="Close notifications"><X size={19}/></button>
          </div>
          <div className="sw-mobile-attention-scroll">
            {activePanel === "day" ? <>
              <p>{todayEvents ? `${todayEvents} calendar event(s) today.` : "No events on your calendar today."}</p>
              <button type="button" onClick={() => open("/calendar")}><CalendarDays size={18}/> Open calendar</button>
              <button type="button" onClick={() => open("/customer/tasks")}><LayoutGrid size={18}/> Open to-dos</button>
            </> : activePanel === "archive" ? <>
              <p>Archived reminders remain here until restored. Your actual appointments, tasks, and payment records are unchanged.</p>
              {archivedNotices.length ? [...archivedNotices].reverse().map(item =>
                <div className="sw-mobile-attention-entry" key={item.id}>
                  <button type="button" className="sw-mobile-attention-entry-label" onClick={() => open(item.route)}>{item.label}<ChevronRight size={14}/></button>
                  <button type="button" className="sw-mobile-attention-dismiss" aria-label={`Restore ${item.label}`} onClick={() => restoreAttention(item.id)}><RotateCcw size={17}/></button>
                </div>
              ) : <p>No archived reminders.</p>}
              <button type="button" className="sw-mobile-attention-archive-link" onClick={() => setActivePanel("updates")}>Back to attention</button>
            </> : <>
              <div className="sw-mobile-attention-toolbar">
                <span>{attentionItems.length} to review</span>
                <button type="button" onClick={() => setActivePanel("archive")}><Archive size={15}/> Archive ({archivedNotices.length})</button>
                {attentionItems.length > 0 && <button type="button" onClick={() => archiveAll(attentionItems)}>Clear All</button>}
              </div>
              {attentionItems.length ? attentionItems.map(item =>
                <div className="sw-mobile-attention-entry" key={item.id}>
                  <button type="button" className="sw-mobile-attention-entry-label" onClick={() => open(item.route)}>{item.label}<ChevronRight size={14}/></button>
                  <button type="button" className="sw-mobile-attention-dismiss" aria-label={`Dismiss ${item.label} to archive`} title="Archive reminder" onClick={() => archiveAttention(item)}><X size={17}/></button>
                </div>
              ) : <p>All clear. Check Archive to review dismissed reminders.</p>}
              <p className="sw-mobile-attention-footnote">Dismiss and Clear All archive only these Home reminders; they never complete tasks, cancel events, or resolve bills.</p>
              <button type="button" onClick={() => open("/customer/tasks")}><LayoutGrid size={18}/> To-do list</button>
              <button type="button" onClick={() => open("/calendar")}><CalendarDays size={18}/> Upcoming calendar</button>
              <button type="button" onClick={() => open("/customer/finance")}><WalletCards size={18}/> Finance & payments</button>
            </>}
          </div>
        </div>
      </div>, document.body)}

    </section>
  );
}
