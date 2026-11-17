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
const eventCategory=e=>String(e?.metadata?.event_category || (e?.metadata?.business_id ? "BUSINESS" : "PERSONAL")).toUpperCase()==="BUSINESS"?"BUSINESS":"PERSONAL";
const spansHour=(event,hourStart)=>{
  if(event.all_day)return false;
  const start=new Date(event.start_at).getTime();
  if(!Number.isFinite(start))return false;
  const rawEnd=new Date(event.end_at || event.start_at).getTime();
  const end=Number.isFinite(rawEnd)&&rawEnd>start?rawEnd:start+3600000;
  return start < hourStart.getTime()+3600000 && end > hourStart.getTime();
};
// Place each event ONCE across its entire duration. Group overlapping
// appointments into side-by-side lanes, rather than repeating hourly cards.
const FIRST_HOUR=5, LAST_HOUR=23;
function layoutTimedEvents(events,day){
  const startOfDay=new Date(day.getFullYear(),day.getMonth(),day.getDate()).getTime();
  const windowStart=startOfDay+FIRST_HOUR*3600000;
  const windowEnd=startOfDay+LAST_HOUR*3600000;
  const total=windowEnd-windowStart;
  const timed=events.filter(e=>!e.all_day).map(event=>{
    const start=new Date(event.start_at).getTime();
    const candidateEnd=new Date(event.end_at||event.start_at).getTime();
    const end=Number.isFinite(candidateEnd)&&candidateEnd>start?candidateEnd:start+3600000;
    return {event,start:Math.max(windowStart,start),end:Math.min(windowEnd,end)};
  }).filter(item=>Number.isFinite(item.start)&&item.end>item.start).sort((a,b)=>a.start-b.start||b.end-a.end);
  const groups=[];let group=[],groupEnd=-Infinity;
  for(const item of timed){
    if(group.length&&item.start>=groupEnd){groups.push(group);group=[];groupEnd=-Infinity;}
    group.push(item);groupEnd=Math.max(groupEnd,item.end);
  }
  if(group.length)groups.push(group);
  return groups.flatMap(items=>{
    const laneEnds=[];
    const placed=items.map(item=>{
      let lane=laneEnds.findIndex(end=>end<=item.start);
      if(lane===-1){lane=laneEnds.length;laneEnds.push(item.end);}else laneEnds[lane]=item.end;
      return {...item,lane};
    });
    return placed.map(item=>({
      event:item.event,lane:item.lane,lanes:laneEnds.length,
      top:(item.start-windowStart)/total*100,
      height:(item.end-item.start)/total*100
    }));
  });
}
function routeAddress(e){return e?.metadata?.routing_address_override||[e?.location_name,e?.address_line1,e?.city,e?.state,e?.postal_code].filter(Boolean).join(", ");}
const filters=[["ALL","All"],["PERSONAL","Personal"],["TASK","Tasks"],["TICKET","Services"],["HEALTH","Health"],["BUSINESS","Business"]];
export default function CalendarImmersiveCockpit({events,loading,error,notice,onCreate,onEdit,onRoute,onConnect,onRefresh,onCapture,captureText,setCaptureText,onVoice,nextEvent,onUpdated}) {
  const [appearance,setAppearance]=useState(readWorkspaceAppearance);
  const [focusDate,setFocusDate]=useState(()=>new Date());
  const [view,setView]=useState("day");
  const [filter,setFilter]=useState("ALL");
  const [businessFilter,setBusinessFilter]=useState("");
  const [drawer,setDrawer]=useState("");
  const [selected,setSelected]=useState(null);
  React.useEffect(()=>{
    const handle=()=>setAppearance(readWorkspaceAppearance());
    window.addEventListener("sw:workspace-appearance",handle);
    window.addEventListener("storage",handle);
    return ()=>{window.removeEventListener("sw:workspace-appearance",handle);window.removeEventListener("storage",handle);};
  },[]);
  const businessChoices=useMemo(()=>Array.from(new Map(events.filter(e=>e?.metadata?.business_id).map(e=>[String(e.metadata.business_id),{id:String(e.metadata.business_id),name:e.metadata.business_name || "Business"}])).values()).sort((a,b)=>a.name.localeCompare(b.name)),[events]);
  const visible=useMemo(()=>events.filter(e=>{
    if(businessFilter && (filter==="BUSINESS") && String(e?.metadata?.business_id || "")!==businessFilter)return false;
    if(filter==="ALL")return true;
    const group=eventGroup(e);
    if(filter==="PERSONAL")return !["HEALTH","TICKET","TASK"].includes(group)&&eventCategory(e)==="PERSONAL";
    if(filter==="BUSINESS")return group==="TICKET"||(!["TASK","HEALTH"].includes(group)&&eventCategory(e)==="BUSINESS");
    return group===filter;
  }),[events,filter,businessFilter]);
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
      {filter==="BUSINESS" && businessChoices.length>1 && <label className="sw-cal-business-filter">Business
        <select value={businessFilter} onChange={e=>setBusinessFilter(e.target.value)}>
          <option value="">All businesses</option>
          {businessChoices.map(b=><option value={b.id} key={b.id}>{b.name}</option>)}
        </select>
      </label>}
      <div className="sw-cal-filters" role="group" aria-label="Calendar filters">
        {filters.map(([key,title])=><button type="button" aria-pressed={filter===key} className={filter===key?"selected":""} key={key} onClick={()=>setFilter(key)}>{title}</button>)}
      </div>
      <div className="sw-cal-agenda" aria-label="Schedule list">
        {view==="day" ? <>
          <div className="sw-cal-agenda-heading"><strong>{focusDate.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</strong><span>{chosenDay.length} scheduled</span></div>
          {chosenDay.some(event=>event.all_day) && <div className="sw-cal-all-day-events">
            {chosenDay.filter(event=>event.all_day).map(e=><button key={e.id} type="button" className={`sw-cal-event sw-cal-all-day sw-cal-event--${eventCategory(e).toLowerCase()}`} onClick={()=>openDetails(e)}>
              <span className="sw-cal-event-time">All day</span><span className="sw-cal-event-body"><strong>{e.title}</strong></span><ChevronRight size={17}/>
            </button>)}
          </div>}
          <div className="sw-cal-time-grid">
            {Array.from({length:18},(_,index)=>index+5).map(hour=>{
              const isNow=dateKey(focusDate)===dateKey(new Date())&&hour===new Date().getHours();
              const hourLabel=new Date(2020,0,1,hour).toLocaleTimeString("en-US",{hour:"numeric"});
              return <button type="button" key={hour} className={`sw-cal-grid-hour ${isNow?"is-now":""}`} onClick={()=>onCreate("EVENT",focusDate,hour)} aria-label={`Create an event at ${hourLabel}`}>
                <span className="sw-cal-grid-hour-label">{hourLabel}</span>
                <span className="sw-cal-grid-hour-space" aria-hidden="true"></span>
              </button>;
            })}
            <div className="sw-cal-timed-event-overlay">
              {layoutTimedEvents(chosenDay,focusDate).map(({event,top,height,lane,lanes})=><button
                key={event.id} type="button"
                className={`sw-cal-duration-event sw-cal-event--${eventCategory(event).toLowerCase()}`}
                style={{top:`${top}%`,height:`${height}%`,left:`calc(${lane / lanes * 100}% + 2px)`,width:`calc(${100 / lanes}% - 4px)`}}
                onClick={()=>openDetails(event)}
                aria-label={`${event.title}, ${timeLabel(event)} to ${event.end_at?new Date(event.end_at).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}):"one hour later"}`}
              >
                <strong>{event.title}</strong>
                <span>{timeLabel(event)} – {event.end_at?new Date(event.end_at).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}):"1 hour"} </span>
                <small>{eventCategory(event)==="BUSINESS"?(event.metadata?.business_name||"Business"):"Personal"}</small>
              </button>)}
            </div>
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
