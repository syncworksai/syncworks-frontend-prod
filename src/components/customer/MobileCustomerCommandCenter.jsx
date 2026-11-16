import React, { useEffect, useState } from "react";
import { AlertTriangle, Bell, BriefcaseBusiness, CalendarDays, ChevronRight, CloudSun, Clock3, Grid2X2, Inbox, LayoutGrid, MapPin, Plus, Sparkles, WalletCards } from "lucide-react";
import "./MobileCustomerCommandCenter.css";

function shortDate(date) {
  return new Intl.DateTimeFormat("en-US", {month:"2-digit",day:"2-digit",year:"2-digit"}).format(date);
}
function shortTime(date) {
  return new Intl.DateTimeFormat("en-US", {hour:"numeric",minute:"2-digit",hour12:true}).format(date);
}
function weatherLocation(weather) {
  const place = weather?.location || {};
  return [place.city || place.name || place.locality, place.state || place.region].filter(Boolean).join(", ") || "Your location";
}
export default function MobileCustomerCommandCenter({ name, brief, attentionCount, todayEvents, calendarEvents = [], openTickets, weather, weatherState, notifications = [], workout, minimums, businessConnected, pmConnected, tenantConnected, onNavigate, onOpenWorkspace, theme }) {
  const [now, setNow] = useState(() => new Date());
  const [activePanel, setActivePanel] = useState(null);
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
  const visibleNotifications = notifications.slice(0, 2);
  // A compact rolling hourly agenda: show the current hour and next three.
  // Render only recorded calendar events; do not invent appointments.
  const currentHour = new Date(now);
  currentHour.setMinutes(0, 0, 0);
  const hourlySlots = Array.from({ length: 4 }, (_, index) => {
    const start = new Date(currentHour.getTime() + index * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const matches = calendarEvents.filter((item) => {
      const value = item?.start_at || item?.start;
      if (!value) return false;
      const time = new Date(value);
      return !Number.isNaN(time.getTime()) && time >= start && time < end;
    });
    return { start, events: matches, active: index === 0 };
  });
  const hourText = (date) => new Intl.DateTimeFormat("en-US", {hour:"numeric",hour12:true}).format(date);
  const eventText = (event) => String(event?.title || event?.name || "Calendar event");
  return (
    <section className="sw-mobile-command" data-mobile-theme={theme} aria-label="Mobile personal command center">
      <div className="sw-mobile-command-top">
        <div><span className="sw-mobile-kicker">PERSONAL WORKSPACE</span><h1>Hey, {name}</h1></div>
        <button type="button" className="sw-mobile-icon-button" onClick={() => setActivePanel("updates")} aria-label="Review alerts and updates"><Bell size={19}/>{notifications.length > 0 && <span className="sw-mobile-notification">{notifications.length > 9 ? "9+" : notifications.length}</span>}</button>
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
            {visibleNotifications.length ? <div className="sw-mobile-alert-lines">{visibleNotifications.map(item => <span key={item.id}>{item.label}</span>)}</div> : <><strong>All clear</strong><small>No urgent items</small></>}
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
            <button type="button" className={active ? "sw-mobile-hour-row is-current" : "sw-mobile-hour-row"} key={start.toISOString()} onClick={() => open("/calendar")} aria-label={`${hourText(start)}: ${events.length ? events.map(eventText).join(", ") : "Nothing scheduled"}`}>
              <time dateTime={start.toISOString()}>{hourText(start)}</time>
              <span className="sw-mobile-hour-line" aria-hidden="true"/>
              <span className="sw-mobile-hour-events">
                {events.length ? <><strong>{eventText(events[0])}</strong>{events.length > 1 && <small>+{events.length - 1} more</small>}</> : <small>{active ? "No event this hour" : "Open"}</small>}
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
      {activePanel && <div className="sw-mobile-sheet-backdrop" onClick={() => setActivePanel(null)} role="presentation"><div className="sw-mobile-sheet" role="dialog" aria-modal="true" aria-label={activePanel === "day" ? "Today's agenda" : "Updates"} onClick={e => e.stopPropagation()}>
        <div className="sw-mobile-sheet-head"><strong>{activePanel === "day" ? "Your day" : "Needs attention"}</strong><button type="button" onClick={() => setActivePanel(null)}>Close</button></div>
        {activePanel === "day" ? <><p>{todayEvents ? `${todayEvents} calendar event(s) today.` : "No events on your calendar today."}</p><p>{workout ? "Workout scheduled today." : "No workout scheduled yet."}</p><button type="button" onClick={() => open("/calendar")}><CalendarDays size={18}/> Open calendar</button><button type="button" onClick={() => open("/customer/tasks")}><LayoutGrid size={18}/> Open tasks</button></> : <>
          {notifications.length ? notifications.map(item => <button key={item.id} type="button" onClick={() => open(item.route)}><AlertTriangle size={18}/>{item.label}<ChevronRight size={16}/></button>) : <p>Nothing urgent at the moment.</p>}
          <p>{openTickets} active service request(s)</p>
          <button type="button" onClick={() => open("/customer/tickets")}><Inbox size={18}/> Service activity</button>
          <button type="button" onClick={() => open("/customer/finance")}><WalletCards size={18}/> Finance & payments</button>
        </>}
        {(businessConnected || pmConnected || tenantConnected) && activePanel === "day" && <button type="button" onClick={() => onOpenWorkspace("business")}><BriefcaseBusiness size={18}/> Business & property</button>}
      </div></div>}
    </section>
  );
}
