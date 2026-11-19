import React,{useCallback,useEffect,useMemo,useState} from "react";
import {ArrowRight,CalendarDays,CheckCircle2,Clock3,CloudSun,Dumbbell,ExternalLink,LoaderCircle,MessageCircle,RefreshCw,Sun,Sunset,WalletCards,X} from "lucide-react";
import {useNavigate} from "react-router-dom";
import {getSyncAssistantDailyState} from "../../api/jarvisProduct";
import "./VictoriaCommandCenter.css";

const QUESTIONS={
 day:"Help me plan today using my connected calendar, tasks, fitness, finances, and businesses. Ask me about missing priorities, time blocks, childcare commitments, delegation, and approvals. Do not invent scheduled events.",
 week:"Help me plan this week across family, SyncWorks builds, fitness, property management, outreach, and finance due dates. Review available records, ask for missing commitments, identify conflicts, and propose a realistic calendar.",
 month:"Help me plan the next 30 days across SyncWorks growth, revenue, client outreach, property obligations, debt due dates, Forge and health goals. Ask questions before making changes, delegate research drafts for review, and set measurable goals.",
 morning:"Victoria, give me my morning operating briefing. Use actual connected records for calendar, workouts, priorities, business and property alerts, and money due. Ask me what has changed and propose today's time blocks. Do not claim email was read unless connected.",
 midday:"Victoria, check my progress so far today. What is completed, what is still open, what needs delegation to William or the team, and what should I focus on this afternoon? Ask for status updates and approvals.",
 evening:"Victoria, help me close out today. Review completed and unfinished tasks, workouts and nutrition if available, financial and business action items, and set tomorrow's top three priorities. Ask what I accomplished that is not recorded."
};
function timeLabel(value){if(!value)return "";const d=new Date(value);return Number.isNaN(d.getTime())?"":d.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});}
function EvidenceRow({title,detail,action,onClick}){return <div className="victoria-evidence-row"><div><strong>{title}</strong><p>{detail}</p></div>{onClick&&<button type="button" onClick={onClick} aria-label={action||"Open related records"}><ExternalLink size={16}/></button>}</div>;}

export default function VictoriaCommandCenter({open,onClose}){
 const navigate=useNavigate();
 const [state,setState]=useState(null),[loading,setLoading]=useState(false),[error,setError]=useState("");
 const [horizon,setHorizon]=useState("day");
 const [checkIn,setCheckIn]=useState("morning");
 const reload=useCallback(async()=>{setLoading(true);setError("");try{setState(await getSyncAssistantDailyState());}catch{setError("Connected records could not be loaded. The planning conversation is still available.");}finally{setLoading(false);}},[]);
 useEffect(()=>{if(open)reload();},[open,reload]);
 useEffect(()=>{if(!open)return;const esc=e=>{if(e.key==="Escape")onClose();};window.addEventListener("keydown",esc);return()=>window.removeEventListener("keydown",esc);},[open,onClose]);
 const calendar=state?.calendar||{};
 const events=Array.isArray(calendar.events)?calendar.events:[];
 const attention=Array.isArray(state?.needs_attention)?state.needs_attention:[];
 const finance=state?.money||{};
 const due=Array.isArray(finance.due_next_7_days)?finance.due_next_7_days:[];
 const health=state?.health||{}, today=health.today||{};
 const workout=today.planned_workout?.workout_name||today.planned_workout?.title||null;
 const weather=state?.weather||{};
 const tasks=state?.tasks||{};
 const plans=useMemo(()=>({day:QUESTIONS.day,week:QUESTIONS.week,month:QUESTIONS.month}),[]);
 const ask=(prompt)=>{onClose();navigate("/sync",{state:{victoriaPrompt:prompt}});};
 if(!open)return null;
 return <div className="victoria-command-overlay" onMouseDown={e=>{if(e.currentTarget===e.target)onClose();}}>
  <section role="dialog" aria-modal="true" aria-label="Victoria daily command center" className="victoria-command-panel">
   <header className="victoria-command-header">
    <div><p className="victoria-eyebrow">SYNC ASSIST · PRIVATE COMMAND</p><h2>Victoria <span>Chief of Staff</span></h2><p>Your day, businesses, and priorities in one place</p></div>
    <button type="button" onClick={onClose} aria-label="Close Victoria command center"><X size={21}/></button>
   </header>
   <div className="victoria-command-scroll">
    <div className="victoria-planning-top">
     <div className="victoria-time-controls" role="group" aria-label="Planning horizon">{[["day","Today"],["week","Week"],["month","Month"]].map(([key,label])=><button type="button" key={key} aria-pressed={horizon===key} onClick={()=>setHorizon(key)}>{label}</button>)}</div>
     <button className="victoria-refresh" type="button" onClick={reload} disabled={loading} aria-label="Refresh connected records"><RefreshCw size={16} className={loading?"animate-spin":""}/></button>
    </div>
    <div className="victoria-feature">
     <span><Sun size={17}/> {horizon==="day"?"Your operating plan":horizon==="week"?"Weekly operating plan":"30-day operating plan"}</span>
     <h3>{horizon==="day"?"Start with what matters most.":horizon==="week"?"Protect time for the important work.":"Turn your goals into measurable progress."}</h3>
     <p>I'll use the information SyncWorks has, ask about what's missing, and help you decide what to handle or delegate.</p>
     <button type="button" onClick={()=>ask(plans[horizon])}><MessageCircle size={16}/> Plan my {horizon==="day"?"day":horizon} with Victoria <ArrowRight size={16}/></button>
    </div>
    <div className="victoria-checkins"><p className="victoria-eyebrow">CHECK-INS THROUGHOUT YOUR DAY</p><div>{[["morning","Morning",Sun],["midday","Midday",Clock3],["evening","Evening",Sunset]].map(([key,label,Icon])=><button type="button" key={key} aria-pressed={checkIn===key} onClick={()=>setCheckIn(key)}><Icon size={16}/>{label}</button>)}</div><button type="button" className="victoria-checkin-start" onClick={()=>ask(QUESTIONS[checkIn])}>Start {checkIn} briefing <ArrowRight size={15}/></button></div>
    <section className="victoria-records">
      <div className="victoria-record-title"><strong>Connected snapshot</strong><span>{loading?<LoaderCircle size={15} className="animate-spin"/>:"Live when refreshed"}</span></div>
      {error&&<p className="victoria-error">{error}</p>}
      {state&&<>
       <EvidenceRow title="Calendar" detail={events.length?events.slice(0,2).map(e=>`${timeLabel(e.start_at)} ${e.title||"Event"}`).join(" · "):"No events returned for today"} onClick={()=>{onClose();navigate("/calendar");}} action="Open calendar"/>
       <EvidenceRow title="Fitness" detail={health.available?(today.workout_completed?"Workout logged complete":workout||"No planned workout returned"):"Health data unavailable"} onClick={()=>{onClose();navigate("/customer/health");}} action="Open Health"/>
       <EvidenceRow title="Priorities" detail={attention.length?`${attention.length} item(s) flagged for attention`:tasks.open_count!=null?`${tasks.open_count} open task(s); no urgent flags returned`:"No task status available"} onClick={()=>{onClose();navigate("/sync/assist/daily");}} action="Open priorities"/>
       <EvidenceRow title="Bills and finances" detail={due.length?`${due.length} item(s) due within seven days`:"No upcoming items returned; does not prove every bill is paid"} onClick={()=>{onClose();navigate("/customer/finance");}} action="Open finances"/>
       <EvidenceRow title="Weather" detail={weather.available?(weather.current_period?.short_forecast||"Current forecast available"):"Forecast not connected or unavailable"} onClick={()=>{onClose();navigate("/customer/weather");}} action="Open weather"/>
      </>}
      {!state&&!loading&&!error&&<p className="victoria-record-muted">Open a briefing to review available records.</p>}
    </section>
    <div className="victoria-quick-actions">
      <button type="button" onClick={()=>{onClose();navigate("/sync/assist/pilot");}}>Delegate work <ArrowRight size={14}/></button>
      <button type="button" onClick={()=>{onClose();navigate("/sync/assist/email");}}>Review email connection <ArrowRight size={14}/></button>
    </div>
    <p className="victoria-disclosure">Victoria can prepare plans and draft actions. Emails, spending, calendar changes, and external outreach require authorization. Only verified connected records appear above; a scheduled briefing is not implied.</p>
   </div>
  </section>
 </div>;
}
