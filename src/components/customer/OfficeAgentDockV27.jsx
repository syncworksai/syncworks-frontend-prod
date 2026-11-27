import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BriefcaseBusiness, ChevronRight, Grip, MessageCircle, RefreshCw, RotateCcw, Users, Send, X, Sparkles, Maximize2, LoaderCircle, Settings, SquarePen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import {getWorkspaceRecords,addVictoriaTask,markWorkspaceTask,itemType} from "../../api/syncWorkspaceRecords";
import {getLiveWeather} from "../../api/liveContext";
import {getBrowserCurrentLocation} from "../../api/locationContext";
import { AVATARS, getAvatarPhotoForUser } from "../sync/JarvisAvatar";
import {getPilotAgentsForUser} from "../sync/pilotAgentRoster";
import "./OfficeAgentDockV27.css";

// One source of truth for the private-pilot employees. Membership is NOT live
// activity or proof that an agent is currently executing a task.
export default function OfficeAgentDock({ user, placement = "home", theme = "future", openSignal = 0, initialAgentId = "executive-female", visible = true, onDismiss }) {
  const nav = useNavigate();
  const permitted = String(user?.email || "").trim().toLowerCase() === "jacoblord7@outlook.com";
  const [employees, setEmployees] = useState([]);
  const [fetchState, setFetchState] = useState("loading");
  const [version, setVersion] = useState(0);
  const [selected, setSelected] = useState(()=>placement==="launcher"?initialAgentId:null);
  useEffect(()=>{if(placement==="launcher"&&openSignal)setSelected(initialAgentId);},[placement,openSignal,initialAgentId]);
  const [workRefresh, setWorkRefresh] = useState(0);
  const [panel,setPanel]=useState("chat");
  const [readBrief,setReadBrief]=useState(false);
  const [reviewOpen,setReviewOpen]=useState(false);
  const [scheduleOpen,setScheduleOpen]=useState(false);
  const [scheduleDraft,setScheduleDraft]=useState(null);
  const [scheduleKeys,setScheduleKeys]=useState([]);
  const [scheduleBusy,setScheduleBusy]=useState(false);
  const [scheduleNotice,setScheduleNotice]=useState("");
  async function buildSchedule(){
    if(scheduleBusy)return;
    setPanel("brief");setScheduleOpen(true);setReadBrief(false);setShowPlan(false);setShowArchive(false);setTodoOpen(false);setReviewOpen(false);
    setScheduleBusy(true);setScheduleNotice("");setScheduleDraft(null);setScheduleKeys([]);
    try{
      const {data}=await api.post("/sync-ai/assist/pilot/chief/schedule/",{mode:"preview"},{timeout:45000});
      setScheduleDraft(data);setScheduleKeys((data.proposed||[]).map(e=>e.key));
    }catch{setScheduleNotice("Could not build schedule. No calendar changes were made. Please retry.");}
    finally{setScheduleBusy(false);}
  }
  async function applySchedule(){
    if(scheduleBusy||!scheduleKeys.length)return;
    setScheduleBusy(true);setScheduleNotice("");
    try{
      const {data}=await api.post("/sync-ai/assist/pilot/chief/schedule/",{mode:"apply",approved_keys:scheduleKeys},{timeout:45000});
      setScheduleNotice((data.created_ids||[]).length+" calendar blocks saved. Existing appointments were preserved. Refresh the preview before adding anything else.");
      setScheduleKeys([]);setScheduleDraft(null);
      window.dispatchEvent(new Event("syncworks:tasks-changed"));setWorkRefresh(v=>v+1);
    }catch{setScheduleNotice("Save could not be confirmed. Rebuild the preview before retrying.");}
    finally{setScheduleBusy(false);}
  }

  const autoPlanDate=useRef("");
  useEffect(()=>{
    if(!permitted||selected!=="executive-female"||panel!=="brief")return;
    const today=new Date().toLocaleDateString("en-CA");
    if(autoPlanDate.current===today||scheduleBusy)return;
    autoPlanDate.current=today;
    let alive=true;
    setScheduleBusy(true);
    api.post("/sync-ai/assist/pilot/chief/schedule/",{mode:"auto"},{timeout:45000}).then(({data})=>{
      if(!alive)return;
      setScheduleDraft(data);setScheduleKeys((data.proposed||[]).map(e=>e.key));
      setScheduleNotice("Your schedule is saved in the shared calendar. "+(data.created_ids||[]).length+" new blocks added.");window.dispatchEvent(new Event("syncworks:tasks-changed"));
    }).catch(()=>{if(alive){autoPlanDate.current="";setScheduleNotice("Automatic plan unavailable. Use Build my schedule to retry.");}}).finally(()=>{if(alive)setScheduleBusy(false);});
    return()=>{alive=false;autoPlanDate.current="";setScheduleBusy(false);};
  },[permitted,selected,panel]);
  const [outlookRange,setOutlookRange]=useState("today");
  const [showPlan,setShowPlan]=useState(false);
  const [showArchive,setShowArchive]=useState(false);
  const [archiveRows,setArchiveRows]=useState([]);
  const [archiveNotice,setArchiveNotice]=useState("");
  const [archiveBusy,setArchiveBusy]=useState(false);
  async function archiveBrief(){
    if(!brief||archiveBusy)return;
    setArchiveBusy(true);setArchiveNotice("");
    try{await api.post("/sync-ai/assist/pilot/chief/archive/",{generated_at:brief.generated_at,text:narrative.join("\n\n")});setArchiveNotice("Briefing saved.");if(showArchive){const {data}=await api.get("/sync-ai/assist/pilot/chief/archive/");setArchiveRows(data.briefings||[]);}}
    catch{setArchiveNotice("Unable to save briefing. Please retry.");}finally{setArchiveBusy(false);}
  }
  async function openArchive(){
    if(showArchive){setShowArchive(false);return;}
    setShowArchive(true);setArchiveBusy(true);setArchiveNotice("");
    try{const {data}=await api.get("/sync-ai/assist/pilot/chief/archive/");setArchiveRows(data.briefings||[]);}catch{setArchiveNotice("Archive unavailable.");}finally{setArchiveBusy(false);}
  }

  const [noteDrafts,setNoteDrafts]=useState({});
  const [noteBusy,setNoteBusy]=useState(null);
  const [noteNotice,setNoteNotice]=useState("");
  async function saveTaskNote(id){
    setNoteBusy(id);setNoteNotice("");
    try{
      const {data:row}=await api.get("/personal-calendar/events/"+encodeURIComponent(id)+"/");
      if(itemType(row)!=="TASK")throw Error("Not a task");
      const note=String(noteDrafts[id]??row.metadata?.task_note??"").slice(0,4000);
      const {data:updated}=await api.patch("/personal-calendar/events/"+encodeURIComponent(id)+"/",{metadata:{...row.metadata,task_note:note}});
      setTodoRows(old=>old.map(t=>t.id===id?updated:t));
      setDailyReview(old=>old?{...old,tasks:old.tasks.map(t=>t.id===id?{...t,note}:t)}:old);
      setNoteNotice("Note saved.");window.dispatchEvent(new Event("syncworks:tasks-changed"));
    }catch{setNoteNotice("Note could not be saved. Retry.");}finally{setNoteBusy(null);}
  }
  function taskNotes(t){
    return <details className="sw-ai-task-note"><summary>Notes</summary><textarea aria-label={"Notes for "+t.title} maxLength={4000} rows={3} value={noteDrafts[t.id]??t.note??t.metadata?.task_note??""} onChange={e=>setNoteDrafts(old=>({...old,[t.id]:e.target.value}))}/><button type="button" disabled={noteBusy!==null} onClick={()=>saveTaskNote(t.id)}>{noteBusy===t.id?"Saving…":"Save note"}</button></details>;
  }
  const [todoRows,setTodoRows]=useState([]);
  const [todoReady,setTodoReady]=useState(false);
  const [todoBusy,setTodoBusy]=useState(false);
  const [todoNotice,setTodoNotice]=useState("");
  const [todoDraft,setTodoDraft]=useState("");
  const [todoOpen,setTodoOpen]=useState(false);
  const [dailyReview,setDailyReview]=useState(null);
  const [reviewBusy,setReviewBusy]=useState(false);
  const [reviewError,setReviewError]=useState("");
  async function runDailyReview(ids=[]){
    if(reviewBusy)return;
    setReviewBusy(true);setReviewError("");
    try{const {data}=await api.post("/sync-ai/assist/pilot/chief/daily-review/",{completed_task_ids:ids},{timeout:45000});setDailyReview(data);window.dispatchEvent(new Event("syncworks:tasks-changed"));}
    catch{setReviewError("Daily review unavailable. Retry to reconcile your tasks.");}
    finally{setReviewBusy(false);}
  }

  async function loadTodos(){
    setTodoBusy(true);setTodoNotice("");
    try{setTodoRows((await getWorkspaceRecords()).filter(t=>itemType(t)==="TASK"));setTodoReady(true);}
    catch{setTodoReady(false);setTodoNotice("Task records unavailable. Retry before adding tasks.");}
    finally{setTodoBusy(false);}
  }
  async function saveAction(action){
    if(todoBusy||!action.title)return;
    setTodoBusy(true);setTodoNotice("");
    try{
      const fresh=(await getWorkspaceRecords()).filter(t=>itemType(t)==="TASK");
      const existing=fresh.find(t=>t.metadata?.sydney_action_key===action.key&&t.metadata?.task_status!=="DONE");
      if(existing){setTodoRows(fresh);setTodoReady(true);setTodoNotice("Already on your task list.");return;}
      const row=await addVictoriaTask(action.title.slice(0,180),{description:action.detail||"",metadata:{sydney_action_key:action.key,action_url:action.url}});
      setTodoRows([...fresh,row]);setTodoReady(true);setTodoOpen(true);setTodoDraft("");setTodoNotice("Task saved.");
    }catch{setTodoNotice("Unable to confirm task save. Refresh before retrying.");}
    finally{setTodoBusy(false);}
  }
  async function finishTodo(row,status){
    setTodoBusy(true);setTodoNotice("");
    try{await markWorkspaceTask(row,status);setTodoRows(old=>old.map(t=>t.id===row.id?{...t,metadata:{...t.metadata,task_status:status}}:t));}
    catch{setTodoNotice("Unable to save task status.");}finally{setTodoBusy(false);}
  }
  const [brief,setBrief]=useState(null);
  const [briefError,setBriefError]=useState("");
  const [voiceNotice,setVoiceNotice]=useState("");
  const [speaking,setSpeaking]=useState(false);
  const [voiceLoading,setVoiceLoading]=useState(false);
  const [audioReady,setAudioReady]=useState(false);
  const [weatherOverride,setWeatherOverride]=useState(null);
  const [weatherLoading,setWeatherLoading]=useState(false);
  const [weatherError,setWeatherError]=useState("");
  const feedRef=useRef(null);
  const resumeScroll=useRef(0);
  useEffect(()=>{
    if(!visible||!feedRef.current)return;
    feedRef.current.scrollTop=resumeScroll.current;
  },[visible]);
  useEffect(()=>{resumeScroll.current=0;},[panel]);

  const weather=weatherOverride||brief?.executive_context?.weather||{};
  const forecast=weather.current_period||{};
  const dailyWeather=weather.daily_summary||{};
  const severeAlerts=(Array.isArray(weather.alerts)?weather.alerts:[]).filter(a=>/severe|extreme/i.test(a.severity||"")||/tornado|severe thunderstorm|flash flood|hurricane|tropical storm|winter storm|blizzard|ice storm/i.test(a.event||a.headline||a.title||""));
  const tempLabel=v=>v==null?"Unavailable":Math.round(v)+"°F";
  const rainLabel=dailyWeather.rain==null?"Unavailable":Math.round(dailyWeather.rain)+"%";
  const weatherAdvice=()=>{
    const cold=[dailyWeather.low,forecast.temperature].filter(v=>v!=null).some(v=>v<60);
    const wet=(dailyWeather.rain!=null&&dailyWeather.rain>=40)||/rain|shower|storm/i.test(forecast.short_forecast||"");
    return cold&&wet?"Take a jacket and an umbrella if you're heading out.":cold?"I'd bring a jacket if you're heading out.":wet?"I'd keep an umbrella handy.":"";
  };

  const sections=brief?.sections||[];
  const sectionLinks={today:"/customer/projects",cases:"/sync/assist/chief",delegation:"/sync/assist/assignments",portfolio:"/pm/properties",sarah_correspondence:"/pm/properties",email:"/sync/assist/email",calendar:"/calendar",money:"/customer/finance",business:"/sbo",health:"/customer/health",scarlett_sales:"/sync/assist/growth",elizabeth_marketing:"/sync/assist/growth",customer_support:"/platform/support",production_project:"/customer/projects"};
  const safeRoute=value=>typeof value==="string"&&/^\/(?!\/)[a-zA-Z0-9/_?=&%-]+$/.test(value)?value:null;
  const goAction=(url,task)=>{if(safeRoute(url)){if(placement==="launcher"){if(feedRef.current)resumeScroll.current=feedRef.current.scrollTop;if(task?.id)window.dispatchEvent(new CustomEvent("syncworks:sydney-task",{detail:{id:task.id}}));onDismiss?.();}else setSelected(null);nav(url);}};
  const suggestedActions=brief?[
    ...(sections.find(s=>s.key==="sarah_correspondence")?.items||[]).filter(i=>/PAYMENT|INSPECTION|DOCUMENT/i.test(i.title||"")).map(i=>({key:"property:"+i.title,title:i.title,detail:i.next_action,url:safeRoute(i.detail_url)||"/pm/properties"})),
    {key:"launch:review",title:"Review SyncWorks launch milestones",detail:"Open the production readiness project and select the next verified milestone.",url:"/customer/projects"},
    {key:"health:plan:"+brief.date,title:"Review today's workout and nutrition plan",url:"/customer/health"},
    ...(sections.find(s=>s.key==="scarlett_sales")?.items||[]).map(i=>({key:"sales:"+i.title,title:"Qualify prospect: "+i.title,detail:i.next_action,url:"/sync/assist/growth"})),
    ...(brief.counts?.ai_assignments_pending?[{key:"assignments:review",title:"Review pending employee assignments",url:"/sync/assist/assignments"}]:[])
  ]:[];
  const narrative=brief?(()=>{
    const byKey=key=>sections.find(s=>s.key===key);
    const clean=value=>String(value||"").trim().replace(/[.]+$/,"");
    const context=brief.executive_context||{};
    const now=new Date(context.local_time||brief.generated_at);
    const hour=Number.isNaN(now.getTime())?12:now.getHours();
    const paragraphs=[(hour<12?"Good morning":hour<18?"Good afternoon":"Good evening")+". Let's get your day organized."];
    if(weather.available)paragraphs.push("Before you head out, "+(forecast.temperature!=null?"it is around "+Math.round(forecast.temperature)+" degrees with "+clean(forecast.short_forecast||"current conditions"):"here is your local outlook")+". "+(dailyWeather.high!=null&&dailyWeather.low!=null?"Expect a high of "+Math.round(dailyWeather.high)+" and a low of "+Math.round(dailyWeather.low)+" degrees. ":"")+(dailyWeather.rain!=null?"There is a "+Math.round(dailyWeather.rain)+" percent chance of precipitation today. ":"")+weatherAdvice());
    const calendar=context.calendar||{};
    const events=(calendar.events||[]).filter(e=>!e.metadata?.task_unscheduled).slice(0,3);
    const formatTime=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?"time not confirmed":d.toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});};
    paragraphs.push(calendar.available?(events.length?"Your calendar includes "+events.map(e=>clean(e.title)+" at "+formatTime(e.start_at)).join("; ")+". Let's plan your work around those commitments.":"There are no appointments in the connected calendar for today. We can use the available time for focused work."):"Your calendar needs a connection check before I can confirm your availability.");
    const health=byKey("health");
    paragraphs.push(health?.items?.length?"For your health routine, "+health.items.map(i=>clean(i.title)+": "+clean(i.next_action)).join("; ")+". Let's protect time for this.":"Let's reserve time for exercise, meals and recovery. I don't have a confirmed workout or meal plan to report yet.");
    const properties=byKey("sarah_correspondence")?.items||[];
    const activeProps=properties.filter(i=>/PAYMENT|INSPECTION|DOCUMENT/i.test(i.title||""));
    if(activeProps.length)paragraphs.push("Sarah has property follow-ups that need attention. "+activeProps.slice(0,3).map(i=>clean(i.title)+": "+clean(i.next_action)).join(". ")+". These are verification tasks, not confirmed balances or completed inspections.");
    const money=context.money||{};
    const due=money.due_next_7_days||[];
    if(due.length)paragraphs.push("On personal finances, let's review "+due.slice(0,3).map(i=>clean(i.name)+(i.amount!=null?" for "+i.amount+" dollars":"")+(i.due_date?" due "+i.due_date:"")).join("; ")+".");
    else if(!money.available)paragraphs.push("I can't confirm your upcoming financial obligations from the available records.");
    const project=byKey("production_project");
    paragraphs.push(project?.items?.length?"For SyncWorks, "+clean(project.headline)+". Our next recorded step is "+clean(project.items[0].title)+".":"For SyncWorks, I recommend establishing the production readiness project and using verified task completion to guide our next build.");
    const sales=byKey("scarlett_sales");
    if(sales?.items?.length)paragraphs.push("Olivia has prospects to review, including "+sales.items.slice(0,3).map(i=>clean(i.title)).join(", ")+". She should qualify them before outreach.");
    const support=brief.support;
    if(support?.available)paragraphs.push(support.open||support.in_progress?"Rebecca has "+support.open+" open support requests and "+support.in_progress+" in progress. Let's review anything needing escalation.":"Rebecca has no open or in-progress support tickets.");
    const pending=brief.counts?.ai_assignments_pending;
    if(pending)paragraphs.push("There "+(pending===1?"is one employee assignment":"are "+pending+" employee assignments")+" awaiting your review.");
    if(severeAlerts.length)paragraphs.push("Be weather aware today. "+severeAlerts.map(a=>clean(a.event||a.headline||a.title)).filter(Boolean).join(". ")+". Check the weather workspace for official details before heading out.");
    if(!weather.available)paragraphs.push("Local weather is not available yet; use the weather connection control when convenient.");
    paragraphs.push("My recommendation is to protect your health routine, address verified urgent obligations, and reserve focused time for the next SyncWorks milestone. Review the detailed records before approving any action.");
    return paragraphs;
  })():[];
  async function loadWeather(){
    setWeatherLoading(true);setWeatherError("");
    try{
      const location=await getBrowserCurrentLocation({enableHighAccuracy:false,timeout:10000,maximumAge:300000});
      const data=await getLiveWeather(location);const current=data?.current||{};
      if(current.temp_f==null&&!current.description&&!current.condition)throw Error("No current weather returned");
      const tz=data?.location?.timezone;
      const localDate=d=>{try{const parts=Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(d).map(p=>[p.type,p.value]));return `${parts.year}-${parts.month}-${parts.day}`;}catch{return null;}};
      const day=(Array.isArray(data.daily)?data.daily:[]).find(row=>{
        const stamp=row.timestamp??row.dt??row.date;
        if(typeof row.date==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(row.date))return row.date===localDate(new Date());
        if(stamp==null)return false;
        const d=new Date(typeof stamp==="number"&&stamp<1e12?stamp*1000:stamp);
        return !Number.isNaN(d.getTime())&&localDate(d)===localDate(new Date());
      })||{};
      const numeric=v=>v==null||v===""||!Number.isFinite(Number(v))?null:Number(v);
      const rawRain=numeric(day.precip_probability);
      const pop=numeric(day.pop);
      setWeatherOverride({available:true,alerts:Array.isArray(data.alerts)?data.alerts:[],daily_summary:{high:numeric(day.high_f??day.temp_high_f??day.max_temp_f??day.temp?.max??day.temperature?.max),low:numeric(day.low_f??day.temp_low_f??day.min_temp_f??day.temp?.min??day.temperature?.min),rain:rawRain!=null&&rawRain>=0&&rawRain<=100?rawRain:pop!=null&&pop>=0&&pop<=1?pop*100:null},current_period:{temperature:numeric(current.temp_f),temperature_unit:"F",short_forecast:current.description||current.condition||"Current conditions"}});
    }catch(e){setWeatherError("Local weather unavailable. Check location permission and try again.");}finally{setWeatherLoading(false);}
  }
  useEffect(()=>{if(selected==="executive-female"&&panel==="brief"&&!weatherOverride)void loadWeather();},[selected,panel]);
  useEffect(()=>{if(feedRef.current)feedRef.current.scrollTop=0;},[panel]);

  const audioRef=useRef(null);
  const speechRun=useRef(0);
  const stopVoice=()=>{speechRun.current++;if(audioRef.current){audioRef.current.pause();URL.revokeObjectURL(audioRef.current.src);audioRef.current=null;}setSpeaking(false);setVoiceLoading(false);setAudioReady(false);};
  useEffect(()=>()=>{speechRun.current++;if(audioRef.current){audioRef.current.pause();URL.revokeObjectURL(audioRef.current.src);}},[]);
  useEffect(()=>{if(!selected&&placement!=="launcher"){setScheduleOpen(false);stopVoice();setShowPlan(false);setShowArchive(false);setReadBrief(false);setPanel("chat");if(placement==="launcher"&&openSignal)onDismiss?.();}},[selected]);
  useEffect(()=>{
    if(selected!=="executive-female"||panel!=="brief")return;
    let alive=true;const controller=new AbortController();setBrief(null);setBriefError("");
    api.get("/sync-ai/assist/pilot/chief/brief/",{timeout:60000,signal:controller.signal}).then(({data})=>{if(alive)setBrief(data);}).catch(error=>{if(alive)setBriefError(error?.response?.status?"Briefing unavailable (HTTP "+error.response.status+"). Refresh to retry.":"Briefing request timed out or connection failed. Refresh to retry.");});
    return()=>{alive=false;controller.abort();};
  },[selected,panel,workRefresh]);
  useEffect(()=>{
    if(selected==="executive-female"&&panel==="brief")runDailyReview();
  },[selected,panel]);
  const [spokenKey,setSpokenKey]=useState("");
  const [autoSpeak,setAutoSpeak]=useState(true);
  const [rememberConversation,setRememberConversation]=useState(()=>{try{return localStorage.getItem("sw_sydney_memory_opt_in_v1")==="yes";}catch{return false;}});
  const [showAssignedWork,setShowAssignedWork]=useState(false);
  const [conversationId,setConversationId]=useState(()=>crypto.randomUUID());
  const [conversationArchive,setConversationArchive]=useState([]);
  const [archiveStatus,setArchiveStatus]=useState("");
  const pendingMemory=useRef(Promise.resolve());
  async function openConversations(){
    setShowAssignedWork(true);setShowChatSettings(false);setArchiveStatus("Loading conversations…");
    try{await pendingMemory.current;const {data}=await api.get(memoryEndpoint,{params:{view:"conversations"},timeout:15000});setConversationArchive(data.conversations||[]);setArchiveStatus("");}
    catch{setArchiveStatus("Previous conversations could not be loaded.");}
  }
  function restoreConversation(thread){
    stopVoice();setConversationId(thread.id==="legacy"?crypto.randomUUID():thread.id);
    setChatHistory(old=>({...old,"executive-female":thread.turns.flatMap(t=>[{by:"user",text:t.question},{by:"assistant",text:t.answer}])}));
    setChatDraft("");setPanel("chat");setShowAssignedWork(false);
  }
  const [showChatSettings,setShowChatSettings]=useState(false);
  const [memoryNotice,setMemoryNotice]=useState("");
  const memoryEndpoint="/sync-ai/assist/pilot/chief/agent/";
  async function saveConversationTurn(question,answer){
    if(!rememberConversation)return;
    try{
      const pending=api.post(memoryEndpoint,{action:"remember_turn",question,answer,conversation_id:conversationId},{timeout:15000});pendingMemory.current=pending.catch(()=>{});const {data}=await pending;
      setMemoryNotice(data.saved?"Conversation remembered":data.reason||"Conversation not saved");
    }catch{setMemoryNotice("Memory save could not be verified");}
  }
  async function resetConversationMemory(){
    try{await api.post(memoryEndpoint,{action:"reset"},{timeout:15000});setChatHistory(old=>({...old,"executive-female":[]}));setConversationArchive([]);setConversationId(crypto.randomUUID());setMemoryNotice("Previous saved conversation excluded from future recall. Audit records retained.");}
    catch{setMemoryNotice("Memory reset could not be verified");}
  }

  async function speakText(raw,key){
    if(spokenKey===key&&audioReady&&audioRef.current){
      try{await audioRef.current.play();setAudioReady(false);setSpeaking(true);setVoiceNotice("");}catch{setVoiceNotice("Tap Play again to start audio.");}return;
    }
    if(spokenKey===key&&(voiceLoading||speaking)){stopVoice();return;}
    stopVoice();setSpokenKey(key);
    const run=++speechRun.current;
    const cleaned=String(raw||"").replace(/^[#]+\s*/gm,"").replace(/\*\*/g,"").replace(/^[-•]\s+/gm,"").trim();
    if(!cleaned)return;
    // Split at natural boundaries, preserving all response content and requesting one chunk at a time.
    const chunks=[];
    let remaining=cleaned;
    while(remaining.length>1800){
      let cut=remaining.lastIndexOf("\n",1800);
      if(cut<900)cut=remaining.lastIndexOf(". ",1800)+1;
      if(cut<900)cut=remaining.lastIndexOf(" ",1800);
      if(cut<1)cut=1800;
      chunks.push(remaining.slice(0,cut).trim());remaining=remaining.slice(cut).trim();
    }
    if(remaining)chunks.push(remaining);
    async function playChunk(index){
      if(run!==speechRun.current)return;
      if(index>=chunks.length){stopVoice();return;}
      setVoiceLoading(true);setVoiceNotice("");setSpeaking(false);
      try{
        const response=await api.post("/sync-ai/voice/synthesize/",{role:"founder_chief",text:chunks[index]},{responseType:"blob",timeout:90000});
        if(run!==speechRun.current)return;
        if(!response.data?.size||!response.data.type?.startsWith("audio/"))throw Error("Invalid audio");
        if(audioRef.current){audioRef.current.pause();URL.revokeObjectURL(audioRef.current.src);}
        const player=new Audio(URL.createObjectURL(response.data));audioRef.current=player;
        player.onended=()=>{if(run===speechRun.current)void playChunk(index+1);};
        player.onerror=()=>{if(run===speechRun.current){stopVoice();setVoiceNotice("Audio could not be played.");}};
        try{await player.play();if(run===speechRun.current){setSpeaking(true);setAudioReady(false);}}catch{if(run===speechRun.current){setAudioReady(true);setVoiceNotice("Audio ready. Tap Play audio to begin.");}}
      }catch(e){if(run===speechRun.current){stopVoice();setVoiceNotice("Voice unavailable. Your written response remains available.");}}
      finally{if(run===speechRun.current)setVoiceLoading(false);}
    }
    await playChunk(0);
  }
  async function listenBrief(){if(brief)await speakText(narrative.join("\n\n"),"brief");}

  const [chatDraft, setChatDraft] = useState("");
  const [chatHistory, setChatHistory] = useState({});
  const [chatError, setChatError] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [dialogTheme, setDialogTheme] = useState({});
  const [employeeWork, setEmployeeWork] = useState({});
  const chatEndRef = useRef(null);
  const chatFieldRef = useRef(null);
  const dockRef = useRef(null);
  const dragStart = useRef(null);
  const moveable = placement === "home";
  const [offset, setOffset] = useState(() => {
    try { const o = JSON.parse(localStorage.getItem("sw_desktop_agent_dock_position_v1") || "{}"); return {x:Number(o.x) || 0,y:Number(o.y) || 0}; }
    catch {return {x:0,y:0};}
  });
  function dragBegin(event) {
    if (!moveable || event.button !== 0) return;
    const rect = dockRef.current?.getBoundingClientRect();
    if (!rect) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = {x:event.clientX,y:event.clientY,offset,rect};
  }
  function dragMove(event) {
    if (!dragStart.current) return;
    const {x,y,offset:initial,rect} = dragStart.current;
    const left = rect.left - initial.x, right = rect.right - initial.x;
    const top = rect.top - initial.y, bottom = rect.bottom - initial.y;
    setOffset({
      x: Math.round(Math.min(window.innerWidth - right - 8, Math.max(8 - left, initial.x + event.clientX - x))),
      y: Math.round(Math.min(window.innerHeight - bottom - 8, Math.max(72 - top, initial.y + event.clientY - y)))
    });
  }
  function dragEnd() {dragStart.current = null;}
  useEffect(() => {
    if (!moveable) return;
    try {localStorage.setItem("sw_desktop_agent_dock_position_v1", JSON.stringify(offset));} catch {}
  }, [offset.x,offset.y,moveable]);

  useEffect(() => {
    if (!permitted) return;
    let live = true;
    setFetchState("loading");
    api.get("/sync-ai/assist/pilot/team/", { timeout: 15000 })
      .then(({ data }) => {
        if (!live) return;
        setEmployees(Array.isArray(data?.employees) ? data.employees : []);
        setFetchState("ready");
      })
      .catch(() => { if (live) setFetchState("unavailable"); });
    const refresh=()=>setVersion(v=>v+1);
    window.addEventListener("sw:assist-team-updated",refresh);
    return () => { live = false; window.removeEventListener("sw:assist-team-updated",refresh); };
  }, [permitted, version]);

  const roster = useMemo(() => getPilotAgentsForUser(user,AVATARS).map((avatar) => {
    const slotId=avatar.id==="accounting-female"?"finance-manager":avatar.id==="property-female"?"property-manager":avatar.id;
    const employee=employees.find(worker=>worker.id===slotId);
    return {
    ...avatar,
    slotId,
    roleKey: employee?.role || (avatar.id==="accounting-female"?"FINANCE_MANAGER":({ "executive-female":"CHIEF_OF_STAFF", "executive-male":"SALES_MANAGER", "future-female":"MARKETING_MANAGER", "future-male":"RESEARCH_ANALYST","property-female":"PROPERTY_MANAGER","customer-service":"CUSTOMER_SERVICE","executive-assistant":"EXECUTIVE_ASSISTANT","business-manager":"BUSINESS_MANAGER","technology-research":"TECHNOLOGY_RESEARCH","quality-assurance":"QUALITY_ASSURANCE"}[avatar.id])),
    photo: getAvatarPhotoForUser(avatar,user) || employee?.photo,
    name: avatar.name || employee?.name,
    configured: Boolean(employee),
  }}), [employees, user?.email]);

  const [dockStatus,setDockStatus]=useState({});
  useEffect(()=>{
    if(!permitted)return;
    let alive=true;
    const refresh=async()=>{
      try {
        const {data}=await api.get("/sync-ai/assist/pilot/assignments/",{timeout:25000});
        if(!Array.isArray(data?.assignments))throw Error("Invalid assignment response");
        const tasks=data.assignments.filter(item=>item.kind==="TASK"&&!item.ticket_id);
        if(alive)setDockStatus(Object.fromEntries(roster.filter(p=>p.roleKey).map(p=>{
          const rows=tasks.filter(item=>item.role===p.roleKey);
          return [p.id,{pending:rows.filter(item=>item.state==="AWAITING_REVIEW").length,reviewed:rows.some(item=>item.state==="ACKNOWLEDGED")}];
        })));
      }catch{if(alive)setDockStatus({});}
    };
    refresh();const timer=window.setInterval(refresh,60000);
    return()=>{alive=false;window.clearInterval(timer);};
  },[permitted,roster,version,workRefresh]);
  const office = placement === "office" || placement === "launcher";
  const shown = placement === "launcher" ? roster.filter(person=>!["trading-strategy","market-research","market-intelligence"].includes(person.id)&&!["Bobby","Axe","Charlotte"].includes(person.name)) : office ? roster.filter((person) => person.id === "executive-female") : roster.filter(person=>!["property-female","accounting-female","trading-strategy","market-research","market-intelligence"].includes(person.id)&&!["Bobby","Axe","Charlotte"].includes(person.name));
  const active = roster.find((person) => person.id === selected);
  const messages = active ? (chatHistory[active.id] || []) : [];
  const currentWork = active ? employeeWork[active.id] : null;
  useEffect(() => {
    if (!permitted || !selected) return;
    const person=roster.find(row=>row.id===selected);
    if (!person?.roleKey) return;
    let alive=true;
    const refresh=async()=>{
      try {
        const {data}=await api.get(`/sync-ai/assist/pilot/employees/${encodeURIComponent(person.roleKey)}/work/`,{timeout:15000});
        if(alive)setEmployeeWork(previous=>({...previous,[person.id]:{status:"ready",data}}));
      } catch(error) {
        if(alive)setEmployeeWork(previous=>({...previous,[person.id]:{status:"error",message:error?.response?.data?.detail||(error?.response?.status?"HTTP "+error.response.status:"Connection timed out or unavailable. Tap refresh.")}}));
      }
    };
    refresh();
    const interval=window.setInterval(refresh,30000);
    return ()=>{alive=false;window.clearInterval(interval);};
  },[permitted,selected,employees,workRefresh]);
  useEffect(() => {
    if (!selected || !visible) return;
    const onEscape = (event) => { if (event.key === "Escape") {if(placement==="launcher")onDismiss?.();else setSelected(null);} };
    window.addEventListener("keydown", onEscape);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const id = window.requestAnimationFrame(() => chatFieldRef.current?.focus());
    return () => { window.removeEventListener("keydown", onEscape); document.body.style.overflow = previous; window.cancelAnimationFrame(id); };
  }, [selected,visible]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({block:"end",behavior:"instant"}); }, [messages.length,selected,chatBusy]);
  const selectEmployee = (person) => {
    if(person.id==="executive-female"&&placement!=="launcher"){const request=new CustomEvent("syncworks:victoria-open",{cancelable:true});if(!window.dispatchEvent(request))return;}
    const computed = dockRef.current ? window.getComputedStyle(dockRef.current) : null;
    if (computed) {
      const vars = ["--sw-workspace-accent","--sw-lobby-glass","--sw-ui-surface","--sw-ui-text","--sw-lobby-border"];
      setDialogTheme(Object.fromEntries(vars.map(key=>[key,computed.getPropertyValue(key).trim()]).filter(([,value])=>value)));
    }
    setChatError("");
    setReadBrief(false);
    setPanel("chat");
    setSelected(current=>current===person.id?null:person.id);
  };
  const sendMessage = async (event) => {
    event.preventDefault();
    const question = chatDraft.trim();
    if (!active || !question || chatBusy) return;
    const person = active;
    const id = person.id;
    const now=new Date();
    const timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone;
    const localClock=new Intl.DateTimeFormat("en-US",{timeZone,weekday:"long",year:"numeric",month:"long",day:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short"}).format(now);
    const hour=Number(new Intl.DateTimeFormat("en-US",{timeZone,hour:"numeric",hourCycle:"h23"}).format(now));
    const timeOfDay=hour<12?"morning":hour<17?"afternoon":"evening";

    setChatBusy(true);
    setChatError("");
    setChatDraft("");
    if(id==="executive-female"&&/^build my (schedule|week|day)[.!]?$/i.test(question)){await buildSchedule();setChatBusy(false);return;}
    setChatHistory(previous => ({...previous,[id]:[...(previous[id]||[]),{by:"user",text:question}]}));
    try {
      const normalized=question.trim().replace(/[.!?]+$/,"");
      // Deterministic fast path: explicit owner instructions only; no model-generated writes.
      const taskMatch=normalized.match(/^mark (.+) as (?:completed|done)$/i)||normalized.match(/^(?:complete|check off) (?:the task )?(.+)$/i);
      const sportsImport=/^(?:please )?(?:add|import|refresh|sync|update) (?:all )?(?:my|the) (?:upcoming )?(?:sports|favorite teams’|favorite teams\x27) (?:games|schedule|calendar)(?: to (?:my|the) calendar)?$/i.test(normalized);
      const sportsStatus=/^(?:what sports teams am i following(?:,? and what are my notification preferences)?|(?:check|show) my sports (?:calendar|schedule|preferences)|have you added my (?:sports )?games(?: to my calendar)?)$/i.test(normalized);
      const runKylee=/^(?:please )?(?:run|execute|start) kylee(?:'s|’s)? (?:dashboard )?audit$/i.test(normalized);
      const showKylee=/^(?:show|check|read) kylee(?:'s|’s)? (?:audit|findings|audit findings|report)$/i.test(normalized);
      if(id==="executive-female"&&(runKylee||showKylee)){
        const {data}=await api.post("/sync-ai/assist/pilot/chief/execute/",{command:runKylee?"run_kylee_audit":"show_kylee_findings"},{timeout:30000});
        const receipt=runKylee?(data.executed?data:null):data.reports?.[0];
        const findings=receipt?.findings||[];
        const issues=findings.filter(f=>Number(f.count)>0);
        const detailed=/\b(?:findings|report)\b/i.test(normalized);
        const answer=receipt?(detailed?"Kylee checked "+receipt.records_checked+" calendar and task records. "+findings.map(f=>f.check+": "+f.count).join("; ")+". Saved for review.":!findings.length?"Kylee returned an audit receipt, but the individual checks are unavailable.":issues.length?"Kylee completed the calendar and task audit. "+issues.map(f=>f.check+": "+f.count).join("; ")+". I've saved her findings for your review.":"Kylee has completed the calendar and task audit. Everything checked out — nothing new to report."):(runKylee?data.reason:"No saved Kylee audit results yet.");

        const voiceKey="kylee:"+Date.now();
        setChatHistory(previous=>({...previous,[id]:[...(previous[id]||[]),{by:"assistant",text:answer,voiceKey,execution:!!receipt,link:"/sync/assist/assignments"}]}));
        if(receipt)window.dispatchEvent(new Event("syncworks:tasks-changed"));
        void saveConversationTurn(question,answer);
        if(autoSpeak)void speakText(answer,voiceKey);
        return;
      }
      const dailyOn=/^(?:please )?(?:enable|start|turn on) (?:automatic )?daily (?:executive |task )?review$/i.test(normalized);
      const dailyOff=/^(?:please )?(?:disable|stop|turn off) (?:automatic )?daily (?:executive |task )?review$/i.test(normalized);
      const responsibilityStatus=/^(?:show|check|list) (?:my |your )?(?:standing |ongoing )?responsibilities$/i.test(normalized);
      if(id==="executive-female"&&(dailyOn||dailyOff||responsibilityStatus)){
        let answer;
        if(responsibilityStatus){
          const {data}=await api.post("/sync-ai/assist/pilot/chief/execute/",{command:"list_responsibilities"},{timeout:20000});
          answer=(data.responsibilities||[]).map(item=>item.objective+": "+(item.enabled?"enabled":"disabled")+(item.last_success_at?". Last recorded successful check: "+new Date(item.last_success_at).toLocaleString():"")+(item.next_due_at?". Next eligible check: "+new Date(item.next_due_at).toLocaleString():"")+".").join("\n");
        }else{
          const {data}=await api.post("/sync-ai/assist/pilot/chief/execute/",{command:dailyOn?"enable_daily_review":"disable_daily_review"},{timeout:20000});
          answer=data.enabled?"Daily executive review is enabled. I will check recorded upcoming bills and workout planning through the scheduled runtime. I will not make payments or assume workouts are completed.":"Daily executive review is disabled.";
        }
        const voiceKey="responsibilities:"+Date.now();
        setChatHistory(previous=>({...previous,[id]:[...(previous[id]||[]),{by:"assistant",text:answer,voiceKey}]}));
        void saveConversationTurn(question,answer);
        if(autoSpeak)void speakText(answer,voiceKey);
        return;
      }
      const autoSports=/^(?:please )?(?:enable|turn on|start) (?:automatic |daily )?sports (?:calendar )?(?:refresh|updates)$/i.test(normalized);
      const stopSports=/^(?:please )?(?:disable|turn off|stop) (?:automatic |daily )?sports (?:calendar )?(?:refresh|updates)$/i.test(normalized);
      const saveSports=/^(?:please )?(?:save|remember) my sports preferences$/i.test(normalized);
      if(id==="executive-female"&&(taskMatch||sportsImport||sportsStatus||saveSports||autoSports||stopSports)){
        let result,answer;
        const endpoint="/sync-ai/assist/pilot/chief/execute/";
        if(sportsStatus){
          result=(await api.get(endpoint,{timeout:20000})).data;
          answer=result.preferences?"Your saved preferences are "+result.preferences.teams.join(", ")+". SyncWorks calendar, Outlook requested, email only, 15-minute reminders, and flag conflicts. There are "+result.upcoming_saved+" upcoming imported games in SyncWorks. Outlook export is not connected. Automatic refresh is "+(result.automatic_refresh?"enabled":"disabled")+".":"Your sports preferences have not been saved yet. Say ‘Save my sports preferences’ to record them.";
        }else{
          result=(await api.post(endpoint,taskMatch?{command:"complete_task",title:taskMatch[1]}:{command:autoSports?"enable_sports_refresh":stopSports?"disable_sports_refresh":sportsImport?"import_sports":"save_preferences"},{timeout:90000})).data;
          if(taskMatch)answer="Done. "+result.title+" is marked completed in your task list.";
          else if(autoSports||stopSports)answer=result.automatic_refresh?"Daily sports refresh is enabled. The scheduled runtime must successfully run to update your calendar.":"Daily sports refresh is disabled.";
          else if(saveSports)answer="Your sports preferences are saved. Your calendar and notification delivery settings have not been changed.";
          else {
            const added=result.created_ids.length, updated=result.updated_ids.length, released=(result.released_ids||[]).length;
            const parts=[added||updated||released?"Your sports calendar is updated. "+[added?added+" new games":null,updated?updated+" changes":null,released?released+" released calendar blocks":null].filter(Boolean).join(", ")+".":"Your connected sports calendar is current. No new games or changes."];
            if(result.conflict_count)parts.push(result.conflict_count+" calendar conflicts need review.");
            if(result.failed_feeds.length)parts.push("I couldn't retrieve "+[...new Set(result.failed_feeds.map(f=>f.replace(/ \\d{4}$/,"")))].join(", ")+"."+(result.automatic_refresh?" I'll retry on the next scheduled check.":""));
            if(result.undated_skipped)parts.push(result.undated_skipped+" games still have unconfirmed times.");
            answer=parts.join(" ");
          }
          window.dispatchEvent(new Event("syncworks:tasks-changed"));
        }
        const voiceKey="execution:"+Date.now();
        setChatHistory(previous=>({...previous,[id]:[...(previous[id]||[]),{by:"assistant",text:answer,voiceKey,execution:true,link:taskMatch?"/customer/tasks":"/calendar"}]}));
        void saveConversationTurn(question,answer);
        if(autoSpeak)void speakText(answer,voiceKey);
        return;
      }
      if(id==="executive-female"&&/^(?:please )?(?:assign|ask|delegate to|coordinate|run|prepare|review)\s/i.test(normalized)&&normalized.length<=500){
        const {data:receipt}=await api.post("/sync-ai/assist/pilot/chief/orchestrate/",{objective:normalized,request_id:crypto.randomUUID()},{timeout:25000});
        if(receipt.handled){
          const answer=receipt.message;
          const voiceKey="orchestration:"+Date.now();
          setChatHistory(previous=>({...previous,[id]:[...(previous[id]||[]),{by:"assistant",text:answer,voiceKey,execution:true,link:receipt.url||(receipt.kind==="goal"?"/sync/assist/daily":"/sync/assist/assignments")}]}));
          window.dispatchEvent(new Event("syncworks:tasks-changed"));
          void saveConversationTurn(question,answer);
          if(autoSpeak)void speakText(answer,voiceKey);
          return;
        }
      }
      // Keep conversational context bounded and avoid sending unnecessary historical data.
      let executiveContext="";
      if(id==="executive-female"){
        try{
          const {data}=await api.get(memoryEndpoint,{timeout:12000});
          executiveContext=JSON.stringify({open_task_count:data.open_task_count,tasks:data.tasks,upcoming:data.upcoming,history:rememberConversation?data.history:[]}).slice(0,1800);
        }catch{executiveContext="Live task and calendar context unavailable; do not guess.";}
      }
      const recentContext=(chatHistory[id]||[]).slice(-6).map(m=>({speaker:m.by==="user"?"owner":"assistant",text:String(m.text||"").slice(0,350)}));
      // Reuse the existing authenticated SYNC read-only chat provider. These are
      // role-context conversations, NOT autonomous workers or permissions to act.
      const {data} = await api.post("/sync-ai/chat/",{
        workspace:"personal",
        message:`You are ${person.name}, the owner’s ${person.role}. Speak directly to the human owner in natural, concise paragraphs suitable for spoken narration. The owner is the person whose health, calendar and tasks you manage; never treat the employee persona as the subject of a personal plan. Statements such as “health plan built” are progress updates, not requests to invent a new plan. Acknowledge them and explain any verification still needed. Prefer existing SyncWorks workspaces over external spreadsheets or new pages. ${id==="executive-female"?"Executive communication policy: lead with the outcome; omit zero-count checks and implementation details unless requested. Clearly distinguish verified results from pending work. Report material exceptions and actionable changes, not routine technical logs. Respond proportionately. Match tone to the situation: composed and serious for finances, safety, overdue obligations and business risks; warm, upbeat and occasionally playful for routine progress, workouts, sports and wins. No forced jokes, exaggerated enthusiasm or repetitive greetings. Refer to the owner's current workout plan by its actual session name or muscle-group split (chest day, leg day, etc.) only when the connected record identifies it; if no session is recorded, say so briefly and direct the owner to Health. Do not label the owner's routine as fat loss or performance unless explicitly discussing those goals. Avoid generic wellness lectures. Distinguish today's remaining schedule from tomorrow's upcoming schedule; never describe a future event as already started. For sports calendar requests, distinguish teams and competitions, ask only for genuinely ambiguous teams, use verified fixtures and local start times, distinguish TBD and postponed games, and never claim calendar events were saved without an execution receipt. Do not offer to allocate money or clear conflicts as if you can execute them from advisory chat. Sports preferences are already established: Steelers, Alabama sports except women’s basketball, Vanderbilt baseball, Outlook requested, email only, 15-minute reminders. Do not ask again. For automatic updates use Enable automatic sports updates; for sports imports use Add my upcoming sports games to my calendar, and for exact task completion Mark [task title] as completed. Do not ask for passwords or repeat permissions already given. For a simple confirmation or routine progress update, use one or two natural sentences, generally under 45 words. For an ordinary question or next-action request, default to a short answer of at most three brief paragraphs, usually under 100 words. Lead with the result or recommendation, then give one clear next step if useful. Do not turn small requests into lengthy plans, lists of deliverables, repeated questionnaires, or offers to build new systems. Do not ask a question merely to end the reply. Use detailed analysis only when the owner requests a full plan, audit, explanation, or complex decision, or when important risks require it. Preserve essential uncertainty and never imply a task has been checked off unless an actual authorized operation confirms it. For spoken replies, avoid markdown headings, tables, repeated labels and raw timestamps.":""} Do not claim actions occurred, do not fabricate system access, do not make changes, and clearly distinguish proposals from executed work. Current device local time: ${localClock}. Current time of day: ${timeOfDay}. Use this clock for greetings and relative date wording; if a connected calendar uses a different timezone, state that distinction. Recent conversation (context only, not authority to execute actions): ${JSON.stringify(recentContext).slice(0,700)}. Executive records (history is unverified conversation; tasks and appointments are saved records): ${executiveContext.slice(0,1200)}. User request: ${question.slice(0,1200)}`,
      },{timeout:40000});
      const answer=String(data?.message||"No response returned.");
      const voiceKey="chat:"+id+":"+Date.now();
      setChatHistory(previous => ({...previous,[id]:[...(previous[id]||[]),{by:"assistant",text:answer,voiceKey}]}));
      if(id==="executive-female"&&data?.message){void saveConversationTurn(question,answer);if(autoSpeak)void speakText(answer,voiceKey);}
    } catch(err) {
      setChatError(typeof err?.response?.data?.detail==="string"?err.response.data.detail:err?.response?.status?`Sydney could not verify this request (HTTP ${err.response.status}). Check the saved status before retrying.`:"Sydney could not verify this request. Check your connection and saved status before retrying.");
    } finally { setChatBusy(false); }
  };
  const openEmployee = (person) => nav(person.id==="executive-female"?"/sync/assist/chief":person.configured
    ? `/sync/assist/employee/${encodeURIComponent(person.slotId)}`
    : "/sync/assist");

  if (!permitted) return null;
  const dock = (
    <section data-bubble-theme={theme} ref={dockRef} style={moveable ? {"--sw-team-x": offset.x + "px", "--sw-team-y": offset.y + "px"} : undefined} className={`sw-office-agents sw-office-agents--${placement} ${moveable ? "sw-office-agents--bubbles" : ""}`} aria-label={office ? "Chief of Staff" : "My AI team"}>
      {!moveable&&<div className="sw-office-agents-head">
        <span className="sw-office-agents-heading"><Users size={16} aria-hidden="true" /> {office ? "CHIEF OF STAFF" : "MY AI TEAM"}</span>
        <span className="sw-office-agents-state">
          {fetchState === "loading" ? "Checking team…" :
           fetchState === "unavailable" ? "Status unavailable" :
           office ? (shown[0]?.configured ? "Configured" : "Not configured") :
           `${shown.filter(person=>person.configured).length} profiles · review-only pilot`}
        </span>
      </div>}
      {moveable && <div className="sw-office-bubbles-controls">
        <button type="button" className="sw-office-bubbles-grip" aria-label="Drag to move AI team dock" title="Drag to reposition AI team"
          onPointerDown={dragBegin} onPointerMove={dragMove} onPointerUp={dragEnd} onPointerCancel={dragEnd}><Grip size={19}/></button>
        {(offset.x !== 0 || offset.y !== 0) && <button type="button" title="Reset dock position" aria-label="Reset dock position"
          onClick={() => setOffset({x:0,y:0})}><RotateCcw size={15}/></button>}
      </div>}
      <div className="sw-office-agents-content">
        <div className="sw-office-agents-portraits">
          {shown.map((person) => (
            <button key={person.id} type="button" className="sw-office-agent"
              aria-label={`Open ${person.name}, ${person.role}`}
              onClick={() => selectEmployee(person)}>
              {person.photo?<img src={person.photo} onError={e=>{if(person.fallbackPhoto&&!e.currentTarget.src.endsWith(person.fallbackPhoto))e.currentTarget.src=person.fallbackPhoto;}} alt="" loading="lazy" />:<span className="grid h-full w-full place-items-center rounded-full border border-cyan-300/30 bg-cyan-500/15 text-lg font-bold text-cyan-100">{person.name?.charAt(0)||"AI"}</span>}
              {dockStatus[person.id]?.pending>0?<span className="sw-agent-review-badge" title={`${dockStatus[person.id].pending} personal tasks awaiting review`}>{dockStatus[person.id].pending}</span>:dockStatus[person.id]?.reviewed?<span className="sw-agent-reviewed-badge" title="Acknowledged work; no assignments awaiting review">✓</span>:null}
              <span className="sw-office-agent-names"><strong>{person.name}</strong><small>{person.role}</small></span>
              <ChevronRight size={15} className="sw-office-agent-chevron" aria-hidden="true" />
            </button>
          ))}
        </div>
        {office && !active && <p className="sw-office-agents-hint">Select Sydney for her workspace and assigned duties.</p>}
        {!office && <div className="sw-office-agents-actions">
          <button type="button" aria-label="Manage AI team" title="Manage AI team" onClick={() => nav("/sync/assist/employees")}><BriefcaseBusiness size={16}/></button>
          <button type="button" aria-label="Refresh AI employee configuration" title="Refresh team" onClick={() => setVersion((v) => v + 1)}><RefreshCw size={15}/></button>
        </div>}
      </div>
    </section>
  );
  const conversation = visible && active && shown.some(person => person.id === active.id) ? createPortal(
    <div className="sw-ai-conversation-overlay" role="presentation" onMouseDown={event => {if(event.target===event.currentTarget){if(placement==="launcher")onDismiss?.();else setSelected(null);}}}>
      <section className={`sw-ai-conversation ${active.id==="executive-female"?"sw-ai-conversation--sydney":""} ${panel==="brief"?"sw-ai-conversation--command":""}`} style={dialogTheme} role="dialog" aria-modal="true" aria-labelledby="sw-ai-conversation-title" data-bubble-theme={theme}>
        <header className="sw-ai-conversation-header">
          <div className="sw-ai-conversation-identity">
            <img className="sw-ai-conversation-photo" src={active.photo} onError={e=>{if(active.fallbackPhoto&&!e.currentTarget.src.endsWith(active.fallbackPhoto))e.currentTarget.src=active.fallbackPhoto;}} alt={`${active.name}, ${active.role}`} />
            <div className="sw-ai-conversation-identification">
              <span className="sw-ai-conversation-eyebrow"><Sparkles size={12}/> SYNCWORKS AI TEAM</span>
              <h2 id="sw-ai-conversation-title">{active.name}</h2>
              <p>{active.role}</p>
              <span className="sw-ai-conversation-status">{chatBusy ? "Preparing a response…" : active.id==="executive-female"?"Executive assistant · private pilot":"Role-focused advisory chat"}</span>
            </div>
          </div>
          <div className="sw-ai-header-actions">{active.id==="executive-female"&&<><button type="button" title="New conversation" aria-label="New conversation" disabled={chatBusy} onClick={()=>{stopVoice();setConversationId(crypto.randomUUID());setShowAssignedWork(false);setChatHistory(old=>({...old,[active.id]:[]}));setChatDraft("");setPanel("chat");setShowChatSettings(false);}}><SquarePen size={19}/></button><button type="button" title="Settings" aria-label="Sydney settings" aria-expanded={showChatSettings} onClick={()=>setShowChatSettings(v=>!v)}><Settings size={19}/></button></>}<button type="button" className="sw-ai-conversation-close" aria-label="Close employee conversation" onClick={()=>placement==="launcher"?onDismiss?.():setSelected(null)}><X size={19}/></button></div>
        </header>
        {active.id==="executive-female"&&showChatSettings&&<div className="sw-ai-chat-audio sw-ai-settings-panel"><label><input type="checkbox" checked={autoSpeak} onChange={e=>{setAutoSpeak(e.target.checked);if(!e.target.checked)stopVoice();}}/> Speak replies automatically</label><label><input type="checkbox" checked={rememberConversation} onChange={e=>{const enabled=e.target.checked;setRememberConversation(enabled);try{localStorage.setItem("sw_sydney_memory_opt_in_v1",enabled?"yes":"no");}catch{}}}/> Remember conversations</label>{rememberConversation&&<button type="button" className="sw-ai-review-nav" onClick={resetConversationMemory}>Reset recall</button>}<small>New conversation clears this window, not saved recall or tasks.</small>{memoryNotice&&<span role="status">{memoryNotice}</span>}{voiceNotice&&<span role="status">{voiceNotice}</span>}</div>}
        <div className="sw-ai-conversation-toolbar">
          <button type="button" onClick={()=>goAction("/sync/assist/assignments?new=1&role="+encodeURIComponent(active.roleKey||"CHIEF_OF_STAFF"))}><BriefcaseBusiness size={15}/> Assign work</button>
          <button type="button" onClick={()=>{if(active.id==="executive-female"){stopVoice();setScheduleOpen(false);setReadBrief(false);setReviewOpen(false);setShowPlan(false);setShowArchive(false);setTodoOpen(false);setPanel(v=>v==="brief"?"chat":"brief");}else{setSelected(null);openEmployee(active);}}}><Maximize2 size={15}/> {active.id==="executive-female"?(panel==="brief"?"Back to chat":"Daily briefing"):"Employee workspace"}</button>
        </div>
        {active.id==="executive-female"?<div className="sw-ai-history-strip"><button type="button" className="sw-ai-assigned-toggle" disabled={chatBusy} aria-expanded={showAssignedWork} onClick={()=>showAssignedWork?setShowAssignedWork(false):openConversations()}><MessageCircle size={15}/> Previous conversations <ChevronRight size={14}/></button><button type="button" className="sw-ai-history-work" onClick={()=>goAction("/sync/assist/assignments")}>{currentWork?.status==="ready"?currentWork.data.pending_count+" awaiting review":"Assigned work"}</button></div>:<div className={`sw-ai-work-summary ${active.id==="executive-female"&&!showAssignedWork?"sw-ai-work-summary--collapsed":""}`}>
          <div className="sw-ai-work-summary-head">{active.id==="executive-female"?<button type="button" className="sw-ai-assigned-toggle" aria-expanded={showAssignedWork} onClick={()=>setShowAssignedWork(v=>!v)}><BriefcaseBusiness size={14}/> Assigned work <ChevronRight size={13} className={showAssignedWork?"sw-ai-chevron-open":""}/></button>:<strong>Assigned work</strong>}<span>{currentWork?.status==="ready"?`${currentWork.data.pending_count} awaiting review`:"Review-only pilot"}</span>
            <button type="button" title="Refresh assigned work" aria-label="Refresh employee assignments" onClick={()=>setWorkRefresh(n=>n+1)}><RefreshCw size={13}/></button>
          </div>
          {(active.id!=="executive-female"||showAssignedWork)&&(currentWork?.status==="error"?<p role="status">Assigned work unavailable. {currentWork.message}</p>:
           currentWork?.status==="ready"?(currentWork.data.assignments?.length?
           <div className="sw-ai-work-summary-items">{currentWork.data.assignments.slice(0,3).map(item=><button type="button" key={item.assignment_id} onClick={()=>goAction("/sync/assist/assignments")}>
             <span>{item.kind}{item.ticket_id?` #${item.ticket_id}`:""} · {item.state?.replaceAll("_"," ")}</span>
             <strong>{item.description}</strong>
             {item.status_changed_since_review&&<em>Ticket status changed — review again</em>}
           </button>)}</div>:
           <p>No work assigned to {active.name} yet.</p>):
           <p>Loading this employee's task inbox…</p>)}
        </div>}
        {active.id==="executive-female"&&showAssignedWork&&<div className="sw-ai-history-shade" onMouseDown={e=>{if(e.target===e.currentTarget)setShowAssignedWork(false);}}><aside className="sw-ai-history-drawer" aria-label="Previous conversations"><header><strong>Previous conversations</strong><button type="button" aria-label="Close conversation history" onClick={()=>setShowAssignedWork(false)}><X size={18}/></button></header><div className="sw-ai-history-list">{archiveStatus?<p role="status">{archiveStatus}</p>:conversationArchive.length?conversationArchive.map(thread=><button type="button" key={thread.id} onClick={()=>restoreConversation(thread)}><strong>{thread.title}</strong><small>{new Date(thread.updated_at).toLocaleString()} · {thread.turns.length} turns</small><ChevronRight size={15}/></button>):<p>No saved conversations yet. Enable Remember conversations in settings to save new exchanges.</p>}</div></aside></div>}
        {panel==="brief"?<div className="sw-ai-command-body">
          <nav className="sw-ai-command-nav" aria-label="Executive workspace" onClick={e=>{if(e.target.closest("button")&&!e.target.closest("[data-schedule-build]"))setScheduleOpen(false)}}><button data-schedule-build type="button" className="sw-ai-review-nav" onClick={buildSchedule} disabled={scheduleBusy}>Build my schedule</button>

          <div className="sw-ai-brief-controls sw-ai-conversation-toolbar"><button type="button" onClick={listenBrief} disabled={!brief} aria-busy={voiceLoading}>{voiceLoading?<><LoaderCircle size={15} className="animate-spin"/> Preparing audio… (cancel)</>:speaking?"Stop audio":audioReady?"Play audio":"Listen to briefing"}</button><button type="button" onClick={()=>{setShowPlan(false);setShowArchive(false);setTodoOpen(false);setReviewOpen(false);setReadBrief(v=>!v)}} disabled={!brief} aria-expanded={readBrief}>{readBrief?"Hide briefing":"Read briefing"}</button><button type="button" title="Refresh briefing" aria-label="Refresh briefing" onClick={()=>{stopVoice();setWorkRefresh(v=>v+1)}}><RefreshCw size={15}/></button></div>
          <div className="sw-ai-conversation-toolbar"><button type="button" aria-expanded={showPlan} disabled={!brief} onClick={()=>{setShowArchive(false);setReadBrief(false);setTodoOpen(false);setReviewOpen(false);setShowPlan(v=>!v)}}>{showPlan?"Hide plan":"My plan"}</button><button type="button" onClick={archiveBrief} disabled={!brief||archiveBusy}>Save briefing</button><button type="button" aria-expanded={showArchive} onClick={()=>{setShowPlan(false);setReadBrief(false);setTodoOpen(false);setReviewOpen(false);openArchive()}}>Archive</button></div>
          <div className="sw-ai-conversation-toolbar"><button type="button" onClick={()=>{setShowPlan(false);setReadBrief(false);setShowArchive(false);setReviewOpen(false);setTodoOpen(v=>!v);if(!todoOpen)loadTodos();}}>{todoOpen?"Hide tasks":"My to-do list"}</button><button type="button" onClick={()=>goAction("/calendar")}>Edit schedule</button><button type="button" onClick={()=>goAction("/customer/projects")}>Projects</button></div>

          <button className="sw-ai-review-nav" type="button" aria-expanded={reviewOpen} onClick={()=>{setShowPlan(false);setReadBrief(false);setShowArchive(false);setTodoOpen(false);setReviewOpen(v=>!v)}}>Morning review & progress</button>
          </nav>
          <div className="sw-ai-conversation-feed sw-ai-command-content" ref={feedRef} onScroll={e=>{resumeScroll.current=e.currentTarget.scrollTop;}}>
          {!scheduleOpen&&!readBrief&&!showPlan&&!showArchive&&!todoOpen&&!reviewOpen&&<section className="sw-ai-brief-story"><h3>Your daily operating plan</h3><p>{scheduleBusy?"Sydney is preparing your schedule…":scheduleNotice||"Your schedule will be prepared automatically when you open the briefing."}</p><button type="button" onClick={()=>{if(scheduleDraft)setScheduleOpen(true);else buildSchedule();}} disabled={scheduleBusy}>{scheduleDraft?"Review calendar plan":"Build my schedule"}</button></section>}
          {scheduleOpen&&<section className="sw-ai-brief-story"><h3>Build my schedule · Next seven days</h3><p>Review the proposed calendar blocks. Existing appointments are not changed.</p>{scheduleNotice&&<p role="status">{scheduleNotice}</p>}{scheduleBusy&&<p role="status">Preparing your schedule…</p>}{scheduleDraft&&<><p>{scheduleDraft.proposed.length} proposed blocks · {scheduleDraft.existing.length} existing appointments · {scheduleDraft.skipped.length} conflicts skipped</p>{!scheduleDraft.workout_plan_recorded&&<button type="button" onClick={()=>goAction("/customer/health")}>Plan workout in Health</button>}{scheduleDraft.proposed.map(e=><label className="sw-ai-action-row" key={e.key}><input type="checkbox" checked={scheduleKeys.includes(e.key)} onChange={v=>setScheduleKeys(old=>v.target.checked?[...old,e.key]:old.filter(k=>k!==e.key))}/><span><strong>{e.title}</strong><br/>{new Date(e.start_at).toLocaleString()} – {new Date(e.end_at).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}</span></label>)}<button type="button" disabled={scheduleBusy||!scheduleKeys.length} onClick={applySchedule}>Save {scheduleKeys.length} selected blocks</button><details><summary>Existing appointments and conflicts</summary>{scheduleDraft.existing.map(e=><p key={e.id}>{e.title} · {new Date(e.start_at).toLocaleString()}</p>)}{scheduleDraft.skipped.map((e,i)=><p key={i}>{e.date} · {e.title} — {e.reason}</p>)}</details><details><summary>Open tasks to review</summary>{scheduleDraft.tasks.map(t=><p key={t.id}>{t.title}{t.note?" — "+t.note:""}</p>)}</details></>}<button type="button" onClick={()=>goAction("/calendar")}>Open calendar</button></section>}
          {reviewOpen&&<section className="sw-ai-brief-evidence"><h3>Morning review &amp; progress</h3>
          {reviewBusy?<p>Reconciling your task list…</p>:reviewError?<p role="alert">{reviewError} <button type="button" onClick={()=>runDailyReview()}>Retry</button></p>:dailyReview?<><p>{dailyReview.created} new tasks added in this review.</p><h3>Completed since previous saved briefing</h3>{dailyReview.tasks.filter(t=>t.recently_completed).length?dailyReview.tasks.filter(t=>t.recently_completed).map(t=><p key={t.id}>✓ {t.title}</p>):<p>No recorded completions in this period.</p>}<h3>Still to do — have you completed any of these?</h3>{dailyReview.tasks.filter(t=>t.status==="OPEN").map(t=><div className="sw-ai-action-row" key={t.id}><span>{t.title}{t.due_date?" · "+t.due_date:""}</span><button type="button" disabled={reviewBusy} onClick={()=>runDailyReview([t.id])}>Done</button>{safeRoute(t.url)&&<button type="button" onClick={()=>goAction(t.url,t)}>Start</button>}{taskNotes(t)}</div>)}<button type="button" onClick={()=>runDailyReview()}>Refresh progress</button></>:<button type="button" onClick={()=>runDailyReview()}>Start daily review</button>}
          </section>}
          {noteNotice&&<p role="status">{noteNotice}</p>}{todoNotice&&<p role="status">{todoNotice}</p>}
          {todoOpen&&<div className="sw-ai-brief-story"><h3>My tasks</h3>{todoBusy?<p>Updating tasks…</p>:!todoReady?<button type="button" onClick={loadTodos}>Retry task list</button>:todoRows.filter(t=>!t.metadata?.project_id&&["OPEN","DONE"].includes(t.metadata?.task_status||"OPEN")).map(t=><div key={t.id} className="sw-ai-action-row"><span>{t.title}</span><button type="button" disabled={todoBusy} onClick={()=>finishTodo(t,t.metadata?.task_status==="DONE"?"OPEN":"DONE")}>{t.metadata?.task_status==="DONE"?"Reopen":"Complete"}</button>{safeRoute(t.metadata?.action_url)&&<button type="button" onClick={()=>goAction(t.metadata.action_url,t)}>Go to</button>}{taskNotes(t)}</div>)}<form onSubmit={e=>{e.preventDefault();saveAction({key:"manual:"+todoDraft.trim(),title:todoDraft.trim()});}}><input aria-label="New task" maxLength={180} value={todoDraft} onChange={e=>setTodoDraft(e.target.value)} placeholder="Add a task"/><button disabled={todoBusy||!todoDraft.trim()} type="submit">Add</button></form></div>}
          {archiveNotice&&<p role="status">{archiveNotice}</p>}
          {showArchive&&<div className="sw-ai-brief-story">{archiveBusy?<p>Loading archive…</p>:archiveRows.length?archiveRows.map(row=><details key={row.id}><summary>{new Date(row.saved_at).toLocaleString()}</summary>{String(row.text||"").split("\n\n").map((part,i)=><p key={i}>{part}</p>)}</details>):<p>No saved briefings.</p>}</div>}
          {voiceNotice&&<p role="status">{voiceNotice}</p>}
          {briefError?<p role="alert">{briefError}</p>:!brief?<p><LoaderCircle size={15} className="animate-spin"/> Loading executive briefing…</p>:<>
          <div className="sw-ai-brief-context"><strong>{brief.date} · {brief.executive_context?.local_time?new Date(brief.executive_context.local_time).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"}):"Time unavailable"}</strong><p>{weather.available?[forecast.temperature!=null?forecast.temperature+"°"+(forecast.temperature_unit||"F"):"",forecast.short_forecast].filter(Boolean).join(" · "):"Local weather not connected"}</p>{weather.available&&<><p>High {tempLabel(dailyWeather.high)} · Low {tempLabel(dailyWeather.low)} · Rain {rainLabel}</p>{weatherAdvice()&&<p>{weatherAdvice()}</p>}{severeAlerts.length>0&&<div role="alert"><strong>Be weather aware</strong>{severeAlerts.map((a,i)=><p key={i}>{a.event||a.headline||a.title}</p>)}<button type="button" onClick={()=>goAction("/customer/weather")}>View weather alerts</button></div>}</>}{!weather.available&&<button type="button" disabled={weatherLoading} onClick={loadWeather}>{weatherLoading?"Getting weather…":"Use my location for weather"}</button>}{weatherError&&<p role="status">{weatherError}</p>}</div>

          {showPlan&&<div className="sw-ai-brief-story"><div className="sw-ai-conversation-toolbar">{[["today","Today"],["week","Week"],["month","Month"]].map(([key,label])=><button key={key} type="button" aria-pressed={outlookRange===key} onClick={()=>setOutlookRange(key)}>{label}</button>)}</div><h3>Recorded schedule</h3>{(brief.schedule_outlook||[]).filter(e=>{const now=new Date(brief.generated_at),start=new Date(e.start_at);if(outlookRange==="today")return start.toDateString()===now.toDateString();const cutoff=new Date(now);cutoff.setDate(cutoff.getDate()+(outlookRange==="week"?7:30));return start>=now&&start<=cutoff;}).map(e=><p key={e.id}><strong>{e.title}</strong><br/>{new Date(e.start_at).toLocaleString()} · {e.status==="ENDED"?"Window ended":e.status==="IN_PROGRESS"?"In progress":e.minutes_until>=0&&e.minutes_until<=60?"Starts in "+e.minutes_until+" minutes":"Upcoming"}</p>)}<button type="button" onClick={()=>goAction("/calendar")}>Open calendar</button><h3>Active projects</h3>{(brief.project_progress||[]).filter(p=>p.status==="ACTIVE").map(p=><div key={p.id}><strong>{p.title}</strong><p>{p.done} of {p.total} recorded tasks completed</p>{p.next_tasks.map(t=><p key={t.id}>{t.title}</p>)}</div>)}<button type="button" onClick={()=>goAction("/customer/projects")}>Open projects & complete tasks</button></div>}
          {readBrief&&<><article className="sw-ai-brief-story">{narrative.map((paragraph,n)=><p key={n}>{paragraph}</p>)}</article><section className="sw-ai-brief-story"><h3>Recommended actions</h3>{suggestedActions.map(a=><div className="sw-ai-action-row" key={a.key}><span>{a.title}</span><button type="button" onClick={()=>goAction(a.url)}>Go to</button><button type="button" disabled={todoBusy} onClick={()=>saveAction(a)}>Add to list</button></div>)}</section>
          <details className="sw-ai-brief-evidence"><summary>Detailed records & employee reports</summary>{sections.map(s=><details key={s.key}><summary>{s.title} — {s.headline}</summary>{safeRoute(sectionLinks[s.key])&&<button type="button" onClick={()=>goAction(sectionLinks[s.key])}>Open workspace</button>}{(s.items||[]).map((i,n)=><p key={n}>{i.title} · {i.next_action} {safeRoute(i.detail_url)&&<button type="button" onClick={()=>goAction(i.detail_url)}>Go to record</button>}</p>)}</details>)}</details></>}
          </>}</div></div>:<><div className="sw-ai-conversation-feed" role="log" aria-live="polite" aria-relevant="additions text">
          {!messages.length && <div className="sw-ai-conversation-intro">
            <img src={active.photo} onError={e=>{if(active.fallbackPhoto&&!e.currentTarget.src.endsWith(active.fallbackPhoto))e.currentTarget.src=active.fallbackPhoto;}} alt="" aria-hidden="true"/>
            <strong>Talk with {active.name}</strong>{active.id==="executive-female"&&<button type="button" className="sw-ai-review-nav" onClick={buildSchedule} disabled={scheduleBusy}>Build my schedule</button>}
            <p>{active.id==="executive-female"?"What would you like to accomplish today?":"Ask about "+active.role.toLowerCase()+" priorities or assign work."}</p>
            <small>{active.id==="executive-female"?"Calendar, task and delegation commands use connected tools. Other requests may be advisory.":"Advisory conversation · assignments require review."}</small>
          </div>}
          {messages.map((message,index)=><div key={index} className={`sw-ai-conversation-message sw-ai-conversation-message--${message.by}`}>
            {message.by==="assistant"&&<img src={active.photo} onError={e=>{if(active.fallbackPhoto&&!e.currentTarget.src.endsWith(active.fallbackPhoto))e.currentTarget.src=active.fallbackPhoto;}} alt="" aria-hidden="true"/>}
            <div><strong>{message.by==="assistant"?active.name:"You"}</strong><p>{message.text}</p>{message.execution&&message.link&&<button type="button" className="sw-ai-review-nav" onClick={()=>goAction(message.link)}>Open saved records</button>}{active.id==="executive-female"&&message.by==="assistant"&&<button type="button" className="sw-ai-review-nav" onClick={()=>speakText(message.text,message.voiceKey||"chat:old:"+index)}>{spokenKey===(message.voiceKey||"chat:old:"+index)?voiceLoading?"Preparing audio… (stop)":speaking?"Stop audio":audioReady?"Play audio":"Listen":"Listen"}</button>}</div>
          </div>)}
          {chatBusy&&<div className="sw-ai-conversation-message sw-ai-conversation-message--assistant"><img src={active.photo} onError={e=>{if(active.fallbackPhoto&&!e.currentTarget.src.endsWith(active.fallbackPhoto))e.currentTarget.src=active.fallbackPhoto;}} alt="" aria-hidden="true"/><div><strong>{active.name}</strong><p>Thinking…</p></div></div>}
          <div ref={chatEndRef}/>
        </div>
        {chatError&&<p role="alert" className="sw-ai-conversation-error">{chatError}</p>}
        {active.id==="executive-female"&&(memoryNotice||voiceNotice)&&<div className="sw-ai-compact-status" role="status">{voiceNotice||memoryNotice}</div>}
        <form className="sw-ai-conversation-compose" onSubmit={sendMessage}>
          <label htmlFor="sw-ai-chat-message" className="sr-only">Message {active.name}</label>
          <textarea id="sw-ai-chat-message" ref={chatFieldRef} rows={2} maxLength={4000} value={chatDraft} onChange={event=>setChatDraft(event.target.value)}
            onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();sendMessage(event)}}}
            placeholder={`Ask ${active.name} a question…`} disabled={chatBusy}/>
          <button type="submit" aria-label={`Send message to ${active.name}`} disabled={!chatDraft.trim()||chatBusy}><Send size={19}/></button>
        </form>
        </>}
        <div className="sw-ai-conversation-footnote">{active.id==="executive-female"?"Private pilot · verified actions and review-only advice":"Advisor chat · pilot access only"}</div>
      </section>
    </div>,document.body
  ) : null;
  return <>{placement==="launcher"?null:moveable ? <><div className="sw-desktop-bubble-placeholder" aria-hidden="true" />{createPortal(dock, document.body)}</> : dock}{conversation}</>;
}
