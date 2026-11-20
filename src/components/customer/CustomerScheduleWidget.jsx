import React,{useCallback,useEffect,useMemo,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {CalendarDays,ChevronLeft,ChevronRight,Clock3,ExternalLink,List,Minus,Pencil,Plus,RefreshCw,X} from "lucide-react";
import {useNavigate} from "react-router-dom";
import api from "../../api/client";
import {useWorkspaceAppearance} from "./CustomerWorkspace";
import {useAuth} from "../../auth/AuthContext";
import {fetchPersonalCalendarEvents} from "../../api/personalCalendarAgenda";
import "./CustomerScheduleWidget.css";

const p=n=>String(n).padStart(2,"0");
const dateKey=d=>`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
const localDateTime=d=>`${dateKey(d)}T${p(d.getHours())}:${p(d.getMinutes())}`;
const dateOf=e=>new Date(e.start_at);
const sameDay=(e,key)=>e.start_at&&dateKey(dateOf(e))===key;
const plusDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const startWeek=d=>plusDays(d,-d.getDay());
const clock=e=>e.all_day?"All day":dateOf(e).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
const sortEvents=rows=>[...rows].sort((a,b)=>dateOf(a)-dateOf(b));
const eventCategory=e=>{const type=String(e?.metadata?.event_category||"PERSONAL").toUpperCase();return type==="PROPERTY_MANAGEMENT"?"Property Management":type==="BUSINESS"?(e.metadata?.business_name||"Business"):"Personal";};
const hasPmProfile=profiles=>Boolean(profiles&&Object.keys(profiles).some(key=>key.toLowerCase()==="pm"));
const fmtMonth=d=>d.toLocaleDateString([],{month:"long",year:"numeric"});
function makeDraft(date,event){
  const start=event?.start_at?new Date(event.start_at):new Date(date.getFullYear(),date.getMonth(),date.getDate(),9,0);
  const end=event?.end_at?new Date(event.end_at):new Date(start.getTime()+60*60000);
  const metadata=event?.metadata||{};
  const type=String(metadata.event_category||(metadata.business_id?"BUSINESS":"PERSONAL")).toUpperCase();
  return {title:event?.title||"",start:localDateTime(start),end:localDateTime(end),description:event?.description||"",all_day:Boolean(event?.all_day),category:["BUSINESS","PROPERTY_MANAGEMENT"].includes(type)?type:"PERSONAL",businessId:String(metadata.business_id||""),businessName:String(metadata.business_name||"")};
}
export default function CustomerScheduleWidget(){
  const nav=useNavigate();
  const [appearance]=useWorkspaceAppearance();
  const {myBusinesses=[],moduleAccess={},profiles={}}=useAuth();
  const businessOptions=useMemo(()=>Array.isArray(myBusinesses)?myBusinesses.map(b=>({id:String(b.id||b.business_id||""),name:String(b.business_name||b.name||b.legal_name||b.dba_name||"").trim()})).filter(b=>b.id&&b.name):[],[myBusinesses]);
  const canUseBusiness=businessOptions.length>0||Boolean(moduleAccess?.sbo);
  const canUsePm=Boolean(moduleAccess?.pm)||hasPmProfile(profiles);
  const categoryAllowed=category=>category==="PERSONAL"||(category==="BUSINESS"&&canUseBusiness)||(category==="PROPERTY_MANAGEMENT"&&canUsePm);
  const [events,setEvents]=useState([]),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState("");
  const [open,setOpen]=useState(false),[view,setView]=useState("day"),[selected,setSelected]=useState(()=>new Date());
  const [editing,setEditing]=useState(null),[draft,setDraft]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const closeRef=useRef(null);
  const refresh=useCallback(async()=>{setLoading(true);setLoadError("");try{setEvents(sortEvents(await fetchPersonalCalendarEvents()));}catch(e){setLoadError(e?.response?.data?.detail||"Schedule could not be loaded.");}finally{setLoading(false);}},[]);
  useEffect(()=>{refresh();const sync=()=>refresh();window.addEventListener("sw:calendar-updated",sync);window.addEventListener("focus",sync);return()=>{window.removeEventListener("sw:calendar-updated",sync);window.removeEventListener("focus",sync);};},[refresh]);
  useEffect(()=>{if(!open)return;const key=e=>{if(e.key==="Escape"){if(draft)setDraft(null);else setOpen(false);}};window.addEventListener("keydown",key);closeRef.current?.focus();return()=>window.removeEventListener("keydown",key);},[open,draft]);
  const key=dateKey(selected),today=dateKey(new Date()),todayEvents=events.filter(e=>sameDay(e,today));
  const selectedEvents=events.filter(e=>sameDay(e,key));
  const weekStart=startWeek(selected);
  const weekEvents=events.filter(e=>{const d=dateOf(e);return d>=weekStart&&d<plusDays(weekStart,7)});
  const monthEvents=events.filter(e=>{const d=dateOf(e);return d.getMonth()===selected.getMonth()&&d.getFullYear()===selected.getFullYear();});
  const currentEvents=view==="day"?selectedEvents:view==="week"?weekEvents:view==="month"?monthEvents:sortEvents(events.filter(e=>dateOf(e)>=new Date(selected.getFullYear(),selected.getMonth(),selected.getDate())));
  const monthCells=useMemo(()=>{const first=new Date(selected.getFullYear(),selected.getMonth(),1);const begin=startWeek(first);return Array.from({length:42},(_,i)=>plusDays(begin,i));},[selected]);
  const shift=n=>setSelected(d=>view==="month"?new Date(d.getFullYear(),d.getMonth()+n,Math.min(d.getDate(),28)):plusDays(d,view==="week"?n*7:n));
  const edit=e=>{setEditing(e||null);setDraft(makeDraft(selected,e));setError("");setNotice("");};
  const save=async(e)=>{e.preventDefault();if(busy)return;setError("");const start=new Date(draft.start),end=new Date(draft.end);if(!draft.title.trim()||!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<=start){setError("Enter a title and a valid end time after the start.");return;}
    if(!categoryAllowed(draft.category)){setError("This workspace must be activated before events can be saved to it.");return;}
    if(draft.category==="BUSINESS"&&!businessOptions.some(b=>b.id===draft.businessId)){setError("Choose a connected business.");return;}
    setBusy(true);try{
      const metadata={...(editing?.metadata||{}),entity_type:"EVENT",event_category:draft.category,business_id:draft.category==="BUSINESS"?draft.businessId:null,business_name:draft.category==="BUSINESS"?(businessOptions.find(b=>b.id===draft.businessId)?.name||""):draft.category==="PROPERTY_MANAGEMENT"?"Property Management":"",fixed:true};
      const payload={title:draft.title.trim(),description:draft.description,start_at:start.toISOString(),end_at:end.toISOString(),all_day:draft.all_day,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||"America/Chicago",metadata};
      if(!editing){Object.assign(payload,{source:"MANUAL",reminder_minutes:30});}
      const res=editing?await api.patch(`/personal-calendar/events/${editing.id}/`,payload):await api.post("/personal-calendar/events/",payload);
      const id=res?.data?.id||editing?.id;
      if(!id)throw Error("Calendar did not return an event ID.");
      const verified=await api.get(`/personal-calendar/events/${id}/`);
      if(String(verified?.data?.id)!==String(id))throw Error("Event save could not be verified.");
      setDraft(null);setEditing(null);setNotice("Calendar event saved.");window.dispatchEvent(new Event("sw:calendar-updated"));await refresh();
    }catch(ex){const body=ex?.response?.data;setError(typeof body?.detail==="string"?body.detail:ex?.message||"Could not save this event.");}
    finally{setBusy(false);}
  };
  const remove=async()=>{if(!editing||busy)return;if(!window.confirm(`Remove "${editing.title||"this event"}" from the active calendar?`))return;setBusy(true);setError("");
    try{await api.post(`/personal-calendar/events/${editing.id}/cancel/`);setDraft(null);setEditing(null);setNotice("Event removed from the active schedule.");window.dispatchEvent(new Event("sw:calendar-updated"));await refresh();}
    catch(ex){setError(ex?.response?.data?.detail||"Unable to remove event.");}finally{setBusy(false);}
  };
  const showEvent=e=>{setSelected(dateOf(e));edit(e);setOpen(true);};
  const calendar=<div data-workspace-theme={appearance.theme} className="sw-customer-schedule-overlay" onMouseDown={e=>{if(e.currentTarget===e.target)setOpen(false);}}>
    <section role="dialog" aria-modal="true" aria-label="Personal schedule" className="sw-customer-schedule-drawer">
      <div className="sw-schedule-drawer-heading"><div><small>YOUR PERSONAL HQ</small><h2>Calendar & agenda</h2></div><button type="button" aria-label="Close calendar" ref={closeRef} onClick={()=>setOpen(false)}><X size={20}/></button></div>
      <div className="sw-schedule-toolbar">
        <div className="sw-schedule-switcher" role="group" aria-label="Calendar view">{[["day","Day"],["week","Week"],["month","Month"],["list","List"]].map(([id,label])=><button key={id} type="button" aria-pressed={view===id} onClick={()=>{setView(id);setDraft(null);}}>{label}</button>)}</div>
        <div className="sw-schedule-period"><button type="button" aria-label="Previous period" onClick={()=>shift(-1)}><ChevronLeft size={17}/></button><button type="button" onClick={()=>setSelected(new Date())}>Today</button><button type="button" aria-label="Next period" onClick={()=>shift(1)}><ChevronRight size={17}/></button><strong>{view==="month"?fmtMonth(selected):selected.toLocaleDateString([],{month:"short",day:"numeric",year:"numeric"})}</strong></div>
      </div>
      <div className="sw-schedule-controls"><button type="button" onClick={()=>edit(null)}><Plus size={16}/> Add event</button><button type="button" onClick={refresh}><RefreshCw size={15}/> Refresh</button><button type="button" onClick={()=>{setOpen(false);nav("/calendar");}}><ExternalLink size={15}/> Full calendar</button></div>
      {loadError&&<p role="alert" className="sw-schedule-error">{loadError}</p>}{notice&&<p role="status" className="sw-schedule-notice">{notice}</p>}
      <div className="sw-schedule-scroll">
        {view==="month"&&<div className="sw-schedule-month" role="grid" aria-label={fmtMonth(selected)}>
          {["S","M","T","W","T","F","S"].map((v,i)=><span className="sw-schedule-weekday" key={i}>{v}</span>)}
          {monthCells.map(d=>{const day=dateKey(d),count=events.filter(e=>sameDay(e,day)).length;return <button type="button" key={day} role="gridcell" aria-selected={day===key} className={`sw-schedule-day ${d.getMonth()!==selected.getMonth()?"muted":""} ${day===today?"today":""}`} onClick={()=>{setSelected(d);setView("day");}}><span>{d.getDate()}</span>{count>0&&<small>{count} event{count===1?"":"s"}</small>}</button>})}
        </div>}
        {view==="week"&&<div className="sw-schedule-week">{Array.from({length:7},(_,i)=>plusDays(weekStart,i)).map(d=>{const day=dateKey(d);const num=events.filter(e=>sameDay(e,day)).length;return <button type="button" key={day} aria-pressed={key===day} onClick={()=>{setSelected(d);setView("day");}}><span>{d.toLocaleDateString([],{weekday:"short"})}</span><strong>{d.getDate()}</strong><small>{num} event{num===1?"":"s"}</small></button>})}</div>}
        <h3>{view==="day"?selected.toLocaleDateString([],{weekday:"long",month:"long",day:"numeric"}):view==="week"?"This week's schedule":view==="month"?"This month's events":"Upcoming agenda"}</h3>
        {loading?<p className="sw-schedule-muted">Loading your schedule…</p>:currentEvents.length?<div className="sw-schedule-event-list">{currentEvents.slice(0,180).map(e=><div className="sw-schedule-event" key={e.id}><button type="button" onClick={()=>showEvent(e)}><span>{e.start_at?dateOf(e).toLocaleDateString([],{month:"short",day:"numeric"}):"Date"} · {clock(e)}</span><strong>{e.title||"Untitled event"}</strong><small>{eventCategory(e)}{e.location_name?` · ${e.location_name}`:""}</small></button><button type="button" aria-label={`Quick edit ${e.title}`} onClick={()=>showEvent(e)}><Pencil size={15}/></button></div>)}</div>:<p className="sw-schedule-muted">No events in this view. Use + to add one.</p>}
      </div>
      {draft&&<div className="sw-schedule-editor" role="group" aria-label={editing?"Edit calendar event":"New calendar event"}>
        <form onSubmit={save}>
          <div className="sw-schedule-editor-top"><strong>{editing?"Quick edit":"New event"}</strong><button type="button" aria-label="Close editor" onClick={()=>setDraft(null)}><X size={17}/></button></div>
          <fieldset className="sw-schedule-category"><legend>What is this event for?</legend>
            <div className="sw-schedule-category-options">
              <button type="button" aria-pressed={draft.category==="PERSONAL"} onClick={()=>setDraft(x=>({...x,category:"PERSONAL",businessId:"",businessName:""}))}>Personal</button>
              {[{id:"BUSINESS",label:"Business",allowed:canUseBusiness},{id:"PROPERTY_MANAGEMENT",label:"Property Management",allowed:canUsePm}].map(option=><button key={option.id} type="button" aria-pressed={draft.category===option.id} className={!option.allowed?"locked":""} onClick={()=>option.allowed?setDraft(x=>({...x,category:option.id,businessId:"",businessName:""})):nav("/upgrade")} title={option.allowed?option.label:"Upgrade to enable "+option.label}>{option.label}{!option.allowed&&<small>Upgrade ↗</small>}</button>)}
            </div>
          </fieldset>
          {draft.category==="BUSINESS"&&canUseBusiness&&<label>Which business?
            <select required value={draft.businessId} onChange={e=>{const b=businessOptions.find(x=>x.id===e.target.value);setDraft(x=>({...x,businessId:e.target.value,businessName:b?.name||""}));}}>
              <option value="">Choose a business</option>{businessOptions.map(b=><option value={b.id} key={b.id}>{b.name}</option>)}
            </select>
            {!businessOptions.length&&<small>No connected business found. Complete business setup first.</small>}
          </label>}
          {draft.category==="PROPERTY_MANAGEMENT"&&canUsePm&&<p className="sw-schedule-pm-notice">Property Management workspace. Specific properties are managed in the full PM calendar.</p>}
          <label>Title<input required maxLength={200} value={draft.title} onChange={e=>setDraft(x=>({...x,title:e.target.value}))}/></label>
          <div className="sw-schedule-editor-times"><label>Starts<input type="datetime-local" required value={draft.start} onChange={e=>setDraft(x=>({...x,start:e.target.value}))}/></label><label>Ends<input type="datetime-local" required value={draft.end} onChange={e=>setDraft(x=>({...x,end:e.target.value}))}/></label></div>
          <label>Notes<input maxLength={1000} value={draft.description} onChange={e=>setDraft(x=>({...x,description:e.target.value}))}/></label>
          {error&&<p role="alert" className="sw-schedule-error">{error}</p>}
          <div className="sw-schedule-editor-actions"><button disabled={busy} type="submit">Save</button>{editing&&<button type="button" disabled={busy} onClick={remove}><Minus size={15}/> Remove</button>}<button type="button" onClick={()=>setDraft(null)}>Cancel</button></div>
        </form>
      </div>}
    </section>
  </div>;
  return <div className="sw-customer-schedule-card" aria-label="Today at a glance">
    <div className="sw-schedule-card-title"><span><CalendarDays size={16}/> YOUR SCHEDULE</span><button type="button" onClick={()=>{setView("day");setSelected(new Date());setOpen(true);}}>Day / Week / Month <ChevronRight size={14}/></button></div>
    <div className="sw-schedule-card-date">{new Date().toLocaleDateString([],{weekday:"long",month:"short",day:"numeric"})}<span>{loadError?"Unavailable":loading?"Loading":`${todayEvents.length} event${todayEvents.length===1?"":"s"}`}</span></div>
    <div className="sw-schedule-card-events">{todayEvents.slice(0,2).map(e=><button type="button" key={e.id} onClick={()=>showEvent(e)}><span>{clock(e)}</span><strong>{e.title||"Untitled"}</strong></button>)}{!loading&&!todayEvents.length&&<p>{loadError?"Unable to load schedule":"Nothing scheduled for today"}</p>}</div>
    <div className="sw-schedule-card-actions"><button type="button" onClick={()=>{setSelected(new Date());edit(null);setOpen(true);}}><Plus size={15}/> Add</button><button type="button" onClick={()=>{setView("month");setOpen(true);}}>30-day calendar</button><button type="button" onClick={()=>{setView("list");setOpen(true);}}><List size={15}/> List</button></div>
    {open&&createPortal(calendar,document.body)}
  </div>;
}
