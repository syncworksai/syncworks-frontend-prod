import React, { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, ListTodo, MapPin, Plus, RefreshCw, Sparkles, X, Mic, Link2, Navigation, AlertTriangle } from "lucide-react";
import TravelWeatherAssistCard from "../TravelWeatherAssistCard";
import { readWorkspaceAppearance } from "../customer/CustomerWorkspace";
import "./CalendarImmersiveCockpit.css";

const dateKey = value => {
  const d = new Date(value);
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
};
const dateShift=(date,days)=>{const d=new Date(date);d.setDate(d.getDate()+days);return d;};
const startMonday=date=>{const d=new Date(date);d.setDate(d.getDate()-((d.getDay()+6)%7));return d;};
const timeLabel=e=>e.all_day?"All day":new Date(e.start_at).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
const eventGroup=e=>e?.metadata?.entity_type==="TASK"?"TASK":String(e.source||"MANUAL").toUpperCase();
function routeAddress(e){return e?.metadata?.routing_address_override||[e?.location_name,e?.address_line1,e?.city,e?.state,e?.postal_code].filter(Boolean).join(", ");}
const filters=[["ALL","All"],["PERSONAL","Personal"],["TASK","Tasks"],["TICKET","Services"],["HEALTH","Health"],["BUSINESS","Business"]];
export default function CalendarImmersiveCockpit({events,loading,error,notice,onCreate,onEdit,onRoute,onConnect,onRefresh,onCapture,captureText,setCaptureText,onVoice,nextEvent,onUpdated}) {
  const [appearance,setAppearance]=useState(readWorkspaceAppearance);
  const [focusDate,setFocusDate]=useState(()=>new Date());
  const [view,setView]=useState("day");
  const [filter,setFilter]=useState("ALL");
  const [drawer,setDrawer]=useState("");
  const [selected,setSelected]=useState(null);
  React.useEffect(()=>{
    const handle=()=>setAppearance(readWorkspaceAppearance());
    window.addEventListener("sw:workspace-appearance",handle);
    window.addEventListener("storage",handle);
    return ()=>{window.removeEventListener("sw:workspace-appearance",handle);window.removeEventListener("storage",handle);};
  },[]);
  const visible=useMemo(()=>events.filter(e=>{
    if(filter==="ALL")return true;
    const group=eventGroup(e);
    if(filter==="PERSONAL")return ["MANUAL","GOOGLE","MICROSOFT","OUTLOOK","APPLE"].includes(group);
    if(filter==="BUSINESS")return ["SYNC","SOCIAL","TICKET","SYSTEM"].includes(group);
    return group===filter;
  }),[events,filter]);
  const days=useMemo(()=>{
    if(view==="day")return [focusDate];
    if(view==="week")return Array.from({length:7},(_,i)=>dateShift(startMonday(focusDate),i));
    const first=new Date(focusDate.getFullYear(),focusDate.getMonth(),1);
    const count=new Date(focusDate.getFullYear(),focusDate.getMonth()+1,0).getDate();
    return Array.from({length:count},(_,i)=>dateShift(first,i));
  },[view,focusDate]);
  const chosenDay=useMemo(()=>visible.filter(e=>dateKey(e.start_at)===dateKey(focusDate)).sort((a,b)=>new Date(a.start_at)-new Date(b.start_at)),[visible,focusDate]);
  const matchingDays=useMemo(()=>days.map(d=>({day:d,items:visible.filter(e=>dateKey(e.start_at)===dateKey(d)).sort((a,b)=>new Date(a.start_at)-new Date(b.start_at))})),[visible,days]);
  const move=(direction)=>setFocusDate(d=>view==="month"?new Date(d.getFullYear(),d.getMonth()+direction,Math.min(d.getDate(),28)):dateShift(d,direction*(view==="week"?7:1)));
  const openDetails=e=>{setSelected(e);setDrawer("event");};
  const close=()=>{setDrawer("");setSelected(null);};
  const eventsThisWeek=events.filter(e=>{const d=new Date(e.start_at);return d>=startMonday(new Date())&&d<dateShift(startMonday(new Date()),7);}).length;
  const label=focusDate.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
  return (
    <section className="sw-cal-cockpit" data-theme={appearance.theme} data-motion={appearance.motion?"on":"off"} aria-label="Calendar command center">
      <header className="sw-cal-titlebar">
        <div className="sw-cal-title">
          <span className="sw-cal-overline"><CalendarDays size={14}/> MASTER CALENDAR</span>
          <h1>My Schedule</h1>
          <span className="sw-cal-subtitle">{eventsThisWeek} items this week · {new Date().toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}</span>
        </div>
        <div className="sw-cal-title-actions">
          <button type="button" className="sw-cal-primary" onClick={()=>onCreate("EVENT",focusDate)}><Plus size={17}/> <span>Add Event</span></button>
          <button type="button" aria-label="Scheduling assistant" title="Scheduling assistant" onClick={()=>setDrawer("assistant")}><Sparkles size={19}/></button>
          <button type="button" aria-label="Calendar connections" title="Calendar connections" onClick={onConnect}><Link2 size={19}/></button>
        </div>
      </header>
      {(error||notice)&&<div className={`sw-cal-notice ${error?"sw-cal-error":""}`} role={error?"alert":"status"}>{error||notice}</div>}
      <div className="sw-cal-controls">
        <div className="sw-cal-views" role="group" aria-label="Calendar view">
          {["day","week","month"].map(v=><button type="button" key={v} aria-pressed={view===v} className={view===v?"selected":""} onClick={()=>setView(v)}>{v==="day"?"Day":v==="week"?"Week":"Month"}</button>)}
        </div>
        <div className="sw-cal-date-controls">
          <button aria-label="Previous period" type="button" onClick={()=>move(-1)}><ChevronLeft size={19}/></button>
          <button type="button" className="sw-cal-date" onClick={()=>setFocusDate(new Date())}>{label}<small>Today</small></button>
          <button aria-label="Next period" type="button" onClick={()=>move(1)}><ChevronRight size={19}/></button>
        </div>
      </div>
      <div className="sw-cal-filters" role="group" aria-label="Calendar filters">
        {filters.map(([key,title])=><button type="button" aria-pressed={filter===key} className={filter===key?"selected":""} key={key} onClick={()=>setFilter(key)}>{title}</button>)}
      </div>
      <div className="sw-cal-agenda" aria-label="Schedule list">
        {view==="day" ? <>
          <div className="sw-cal-agenda-heading"><strong>{focusDate.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</strong><span>{chosenDay.length} scheduled</span></div>
          <div className="sw-cal-hour-list">
            {Array.from({length:18},(_,index)=>index+5).map(hour=>{
              const rows=chosenDay.filter(event=>!event.all_day&&new Date(event.start_at).getHours()===hour);
              const isNow=dateKey(focusDate)===dateKey(new Date())&&hour===new Date().getHours();
              const hourLabel=new Date(2020,0,1,hour).toLocaleTimeString("en-US",{hour:"numeric"});
              return rows.length
                ? <div className={`sw-cal-hour-row ${isNow?"is-now":""}`} key={hour}>
                    <button type="button" className="sw-cal-hour-label" aria-label={`Add event at ${hourLabel}`}
                      onClick={()=>onCreate("EVENT",focusDate,hour)}>{hourLabel}</button>
                    <div className="sw-cal-hour-content">{rows.map(e=><button key={e.id} type="button" className="sw-cal-event" onClick={()=>openDetails(e)}>
                      <span className="sw-cal-event-body"><strong>{e.title}</strong><small>{timeLabel(e)} · {eventGroup(e)}{routeAddress(e)?" · "+routeAddress(e):""}</small></span>
                      <ChevronRight size={17}/>
                    </button>)}</div>
                  </div>
                : <button type="button" className={`sw-cal-hour-row sw-cal-hour-row--empty ${isNow?"is-now":""}`} key={hour}
                    aria-label={`Add event at ${hourLabel}`} onClick={()=>onCreate("EVENT",focusDate,hour)}>
                    <span className="sw-cal-hour-label">{hourLabel}</span>
                    <span className="sw-cal-open-slot">Open</span>
                  </button>;
            })}
            {chosenDay.filter(event=>event.all_day).map(e=><button key={e.id} type="button" className="sw-cal-event sw-cal-all-day" onClick={()=>openDetails(e)}>
              <span className="sw-cal-event-time">All day</span><span className="sw-cal-event-body"><strong>{e.title}</strong></span><ChevronRight size={17}/>
            </button>)}
          </div>
        </> : <div className={view==="month"?"sw-cal-month-list":"sw-cal-week-list"}>
          {matchingDays.map(({day,items})=><button type="button" key={dateKey(day)} className={`sw-cal-day-row ${dateKey(day)===dateKey(focusDate)?"is-current":""}`} onClick={()=>{setFocusDate(day);setView("day");}}>
            <span className="sw-cal-day-label">{day.toLocaleDateString("en-US",{weekday:"short"})}<strong>{day.getDate()}</strong></span>
            <span className="sw-cal-day-summary">{items.length?items.slice(0,2).map(e=><span key={e.id}>{timeLabel(e)} · {e.title}</span>):<em>Open</em>}{items.length>2&&<small>+{items.length-2} more</small>}</span>
            <ChevronRight size={16}/>
          </button>)}
        </div>}
      </div>
      <nav className="sw-cal-bottom-actions" aria-label="Calendar quick actions">
        <button type="button" onClick={()=>onCreate("EVENT",focusDate)}><Plus size={17}/> Event</button>
        <button type="button" onClick={()=>onCreate("TASK",focusDate)}><ListTodo size={17}/> Task</button>
        <button type="button" onClick={()=>setDrawer("assistant")}><Sparkles size={17}/> SYNC Assistant</button>
        <button type="button" onClick={onRefresh} aria-label="Refresh Calendar" title="Refresh Calendar"><RefreshCw size={17}/></button>
      </nav>
      {drawer&&<div className="sw-cal-drawer-backdrop" onMouseDown={close} role="presentation">
        <aside className="sw-cal-drawer" role="dialog" aria-modal="true" aria-label={drawer==="assistant"?"SYNC scheduling assistant":"Event details"} onMouseDown={e=>e.stopPropagation()}>
          <header><div><small>{drawer==="assistant"?"SYNC ASSISTANT":"CALENDAR EVENT"}</small><h2>{drawer==="assistant"?"Scheduling Assistant":selected?.title||"Event"}</h2></div><button type="button" onClick={close} aria-label="Close drawer"><X size={20}/></button></header>
          <div className="sw-cal-drawer-body">{drawer==="assistant"?<>
            <p>Tell SYNC what you need scheduled. Review the draft before saving it to your calendar.</p>
            <label htmlFor="sw-cal-capture">Describe an appointment</label>
            <textarea id="sw-cal-capture" rows={3} value={captureText} onChange={e=>setCaptureText(e.target.value)} placeholder="Meet the client Friday at 11 AM at their office" />
            <div className="sw-cal-drawer-buttons"><button type="button" className="sw-cal-primary" onClick={()=>{onCapture();close();}} disabled={!captureText.trim()}><Sparkles size={16}/> Prepare event</button><button type="button" onClick={()=>{onVoice();close();}}><Mic size={16}/> Speak</button></div>
            <div className="sw-cal-assistant-row"><strong>Upcoming trip preparation</strong>{nextEvent?<TravelWeatherAssistCard event={nextEvent} onUpdated={onUpdated}/>:<p>No upcoming events to prepare for.</p>}</div>
          </>:selected?<>
            <div className="sw-cal-event-info"><Clock3 size={17}/>{new Date(selected.start_at).toLocaleString("en-US",{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})} {selected.end_at&&"– "+new Date(selected.end_at).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}</div>
            <div className="sw-cal-event-info"><MapPin size={17}/>{routeAddress(selected)||"No location set"}</div>
            {selected.description&&<p>{selected.description}</p>}
            <div className="sw-cal-drawer-buttons">
              {String(selected.source||"MANUAL").toUpperCase()==="MANUAL"&&<button type="button" className="sw-cal-primary" onClick={()=>{onEdit(selected);close();}}>Edit event</button>}
              <button type="button" onClick={()=>{onRoute(selected);close();}}>Add or edit route</button>
            </div>
          </>:null}</div>
        </aside>
      </div>}
    </section>
  );
}
