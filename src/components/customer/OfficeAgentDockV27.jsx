import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BriefcaseBusiness, ChevronRight, Grip, MessageCircle, RefreshCw, RotateCcw, Users, Send, X, Sparkles, Maximize2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import { AVATARS, getAvatarPhotoForUser } from "../sync/JarvisAvatar";
import {getPilotAgentsForUser} from "../sync/pilotAgentRoster";
import "./OfficeAgentDockV27.css";

// One source of truth for the private-pilot employees. Membership is NOT live
// activity or proof that an agent is currently executing a task.
export default function OfficeAgentDock({ user, placement = "home", theme = "future", openSignal = 0, onDismiss }) {
  const nav = useNavigate();
  const permitted = String(user?.email || "").trim().toLowerCase() === "jacoblord7@outlook.com";
  const [employees, setEmployees] = useState([]);
  const [fetchState, setFetchState] = useState("loading");
  const [version, setVersion] = useState(0);
  const [selected, setSelected] = useState(null);
  useEffect(()=>{if(placement==="launcher"&&openSignal)setSelected("executive-female");},[placement,openSignal]);
  const [panel,setPanel]=useState("chat");
  const [brief,setBrief]=useState(null);
  const [briefError,setBriefError]=useState("");
  const [voiceNotice,setVoiceNotice]=useState("");
  const [speaking,setSpeaking]=useState(false);
  const audioRef=useRef(null);
  const speechRun=useRef(0);
  const stopVoice=()=>{speechRun.current++;if(audioRef.current){audioRef.current.pause();URL.revokeObjectURL(audioRef.current.src);audioRef.current=null;}setSpeaking(false);};
  useEffect(()=>()=>{speechRun.current++;if(audioRef.current){audioRef.current.pause();URL.revokeObjectURL(audioRef.current.src);}},[]);
  useEffect(()=>{if(!selected){stopVoice();setPanel("chat");if(placement==="launcher"&&openSignal)onDismiss?.();}},[selected]);
  useEffect(()=>{
    if(selected!=="executive-female"||panel!=="brief")return;
    let alive=true;setBrief(null);setBriefError("");
    api.get("/sync-ai/assist/pilot/chief/brief/",{timeout:45000}).then(({data})=>{if(alive)setBrief(data);}).catch(()=>{if(alive)setBriefError("Briefing unavailable. Refresh to retry.");});
    return()=>{alive=false;};
  },[selected,panel,workRefresh]);
  async function listenBrief(){
    if(speaking){stopVoice();return;}
    if(!brief)return;
    const run=++speechRun.current;setSpeaking(true);setVoiceNotice("");
    const text=["Victoria, your Chief of Staff.",brief.date,...(brief.sections||[]).map(s=>[s.title,s.headline,...(s.items||[]).slice(0,2).map(i=>i.title+". "+(i.next_action||""))].join(". "))].join(". ").slice(0,2400);
    try{
      const response=await api.post("/sync-ai/voice/synthesize/",{role:"female_assistant",text},{responseType:"blob",timeout:90000});
      if(run!==speechRun.current)return;
      if(!response.data?.size||!response.data.type?.startsWith("audio/"))throw Error("Invalid audio");
      const player=new Audio(URL.createObjectURL(response.data));audioRef.current=player;player.onended=stopVoice;await player.play();
    }catch(e){if(run!==speechRun.current)return;stopVoice();setVoiceNotice("Premium voice unavailable"+(e?.response?.status?" (HTTP "+e.response.status+")":"")+". Written briefing remains available.");}
  }

  const [chatDraft, setChatDraft] = useState("");
  const [chatHistory, setChatHistory] = useState({});
  const [chatError, setChatError] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [dialogTheme, setDialogTheme] = useState({});
  const [employeeWork, setEmployeeWork] = useState({});
  const [workRefresh, setWorkRefresh] = useState(0);
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
    roleKey: employee?.role || (avatar.id==="accounting-female"?"FINANCE_MANAGER":({ "executive-female":"CHIEF_OF_STAFF", "executive-male":"SALES_MANAGER", "future-female":"MARKETING_MANAGER", "future-male":"RESEARCH_ANALYST","property-female":"PROPERTY_MANAGER","customer-service":"CUSTOMER_SERVICE"}[avatar.id])),
    photo: ["executive-female","future-male","customer-service"].includes(avatar.id)?getAvatarPhotoForUser(avatar,user):employee?.photo || getAvatarPhotoForUser(avatar,user),
    name: employee?.name || avatar.name,
    configured: Boolean(employee),
  }}), [employees, user?.email]);

  const [dockStatus,setDockStatus]=useState({});
  useEffect(()=>{
    if(!permitted)return;
    let alive=true;
    const refresh=async()=>{
      const results=await Promise.all(roster.filter(p=>p.roleKey).map(async p=>{
        try{const {data}=await api.get(`/sync-ai/assist/pilot/employees/${encodeURIComponent(p.roleKey)}/work/`,{timeout:15000});return [p.id,{pending:Number(data.pending_count)||0,reviewed:(data.assignments||[]).some(a=>a.state==="ACKNOWLEDGED")}];}catch{return [p.id,null];}
      }));
      if(alive)setDockStatus(Object.fromEntries(results));
    };
    refresh();const timer=window.setInterval(refresh,60000);
    return()=>{alive=false;window.clearInterval(timer);};
  },[permitted,roster,version,workRefresh]);
  const office = placement === "office" || placement === "launcher";
  const shown = office ? roster.filter((person) => person.id === "executive-female") : roster;
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
        if(alive)setEmployeeWork(previous=>({...previous,[person.id]:{status:"error",message:error?.response?.data?.detail||"Could not load assigned work."}}));
      }
    };
    refresh();
    const interval=window.setInterval(refresh,30000);
    return ()=>{alive=false;window.clearInterval(interval);};
  },[permitted,selected,employees,workRefresh]);
  useEffect(() => {
    if (!selected) return;
    const onEscape = (event) => { if (event.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onEscape);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const id = window.requestAnimationFrame(() => chatFieldRef.current?.focus());
    return () => { window.removeEventListener("keydown", onEscape); document.body.style.overflow = previous; window.cancelAnimationFrame(id); };
  }, [selected]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({block:"end",behavior:"instant"}); }, [messages.length,selected,chatBusy]);
  const selectEmployee = (person) => {
    const computed = dockRef.current ? window.getComputedStyle(dockRef.current) : null;
    if (computed) {
      const vars = ["--sw-workspace-accent","--sw-lobby-glass","--sw-ui-surface","--sw-ui-text","--sw-lobby-border"];
      setDialogTheme(Object.fromEntries(vars.map(key=>[key,computed.getPropertyValue(key).trim()]).filter(([,value])=>value)));
    }
    setChatError("");
    setPanel("chat");
    setSelected(current=>current===person.id?null:person.id);
  };
  const sendMessage = async (event) => {
    event.preventDefault();
    const question = chatDraft.trim();
    if (!active || !question || chatBusy) return;
    const person = active;
    const id = person.id;
    setChatBusy(true);
    setChatError("");
    setChatDraft("");
    setChatHistory(previous => ({...previous,[id]:[...(previous[id]||[]),{by:"user",text:question}]}));
    try {
      // Reuse the existing authenticated SYNC read-only chat provider. These are
      // role-context conversations, NOT autonomous workers or permissions to act.
      const {data} = await api.post("/sync-ai/chat/",{
        workspace:"personal",
        message:`You are helping inside the SyncWorks employee discussion panel for ${person.name}, whose fixed specialist role is ${person.role}. Answer this request as a role-focused advisory conversation. Do not claim actions occurred, do not fabricate system access, do not make changes, and clearly distinguish proposals from executed work. User request: ${question}`,
      },{timeout:40000});
      setChatHistory(previous => ({...previous,[id]:[...(previous[id]||[]),{by:"assistant",text:String(data?.message||"No response returned.")}]}));
    } catch(err) {
      setChatError(err?.response?.data?.detail || "SYNC chat is unavailable. Your message was not processed; please try again.");
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
              {dockStatus[person.id]?.pending>0?<span className="sw-agent-review-badge" title={`${dockStatus[person.id].pending} awaiting review`}>{dockStatus[person.id].pending}</span>:dockStatus[person.id]?.reviewed?<span className="sw-agent-reviewed-badge" title="Acknowledged work; no assignments awaiting review">✓</span>:null}
              <span className="sw-office-agent-names"><strong>{person.name}</strong><small>{person.role}</small></span>
              <ChevronRight size={15} className="sw-office-agent-chevron" aria-hidden="true" />
            </button>
          ))}
        </div>
        {office && !active && <p className="sw-office-agents-hint">Select Victoria for her workspace and assigned duties.</p>}
        {!office && <div className="sw-office-agents-actions">
          <button type="button" aria-label="Manage AI team" title="Manage AI team" onClick={() => nav("/sync/assist/employees")}><BriefcaseBusiness size={16}/></button>
          <button type="button" aria-label="Refresh AI employee configuration" title="Refresh team" onClick={() => setVersion((v) => v + 1)}><RefreshCw size={15}/></button>
        </div>}
      </div>
    </section>
  );
  const conversation = active && shown.some(person => person.id === active.id) ? createPortal(
    <div className="sw-ai-conversation-overlay" role="presentation" onMouseDown={event => {if(event.target===event.currentTarget)setSelected(null)}}>
      <section className="sw-ai-conversation" style={dialogTheme} role="dialog" aria-modal="true" aria-labelledby="sw-ai-conversation-title" data-bubble-theme={theme}>
        <header className="sw-ai-conversation-header">
          <div className="sw-ai-conversation-identity">
            <img className="sw-ai-conversation-photo" src={active.photo} onError={e=>{if(active.fallbackPhoto&&!e.currentTarget.src.endsWith(active.fallbackPhoto))e.currentTarget.src=active.fallbackPhoto;}} alt={`${active.name}, ${active.role}`} />
            <div className="sw-ai-conversation-identification">
              <span className="sw-ai-conversation-eyebrow"><Sparkles size={12}/> SYNCWORKS AI TEAM</span>
              <h2 id="sw-ai-conversation-title">{active.name}</h2>
              <p>{active.role}</p>
              <span className="sw-ai-conversation-status">{chatBusy ? "SYNC is preparing a response…" : "Role-focused advisory chat"}</span>
            </div>
          </div>
          <button type="button" className="sw-ai-conversation-close" aria-label="Close employee conversation" onClick={()=>setSelected(null)}><X size={19}/></button>
        </header>
        <div className="sw-ai-conversation-toolbar">
          <button type="button" onClick={()=>{setSelected(null);nav("/sync/assist/assignments")}}><BriefcaseBusiness size={15}/> Assign work</button>
          <button type="button" onClick={()=>{if(active.id==="executive-female"){stopVoice();setPanel(v=>v==="brief"?"chat":"brief");}else{setSelected(null);openEmployee(active);}}}><Maximize2 size={15}/> {active.id==="executive-female"?(panel==="brief"?"Back to chat":"Daily briefing"):"Employee workspace"}</button>
        </div>
        <div className="sw-ai-work-summary">
          <div className="sw-ai-work-summary-head"><strong>Assigned work</strong><span>{currentWork?.status==="ready"?`${currentWork.data.pending_count} awaiting review`:"Review-only pilot"}</span>
            <button type="button" title="Refresh assigned work" aria-label="Refresh employee assignments" onClick={()=>setWorkRefresh(n=>n+1)}><RefreshCw size={13}/></button>
          </div>
          {currentWork?.status==="error"?<p role="status">Assigned work unavailable. {currentWork.message}</p>:
           currentWork?.status==="ready"?(currentWork.data.assignments?.length?
           <div className="sw-ai-work-summary-items">{currentWork.data.assignments.slice(0,3).map(item=><button type="button" key={item.assignment_id} onClick={()=>{setSelected(null);nav("/sync/assist/assignments")}}>
             <span>{item.kind}{item.ticket_id?` #${item.ticket_id}`:""} · {item.state?.replaceAll("_"," ")}</span>
             <strong>{item.description}</strong>
             {item.status_changed_since_review&&<em>Ticket status changed — review again</em>}
           </button>)}</div>:
           <p>No work assigned to {active.name} yet.</p>):
           <p>Loading this employee's task inbox…</p>}
        </div>
        {panel==="brief"?<div className="sw-ai-conversation-feed"><div className="sw-ai-conversation-toolbar"><button type="button" onClick={listenBrief} disabled={!brief}>{speaking?"Stop audio":"Listen to briefing"}</button><button type="button" onClick={()=>setWorkRefresh(v=>v+1)}>Refresh</button></div>{voiceNotice&&<p role="status">{voiceNotice}</p>}{briefError?<p role="alert">{briefError}</p>:!brief?<p>Loading executive briefing…</p>:<><strong>{brief.date} · {brief.executive_context?.local_time?new Date(brief.executive_context.local_time).toLocaleTimeString():"Time unavailable"}</strong>{(brief.sections||[]).map(s=><details key={s.key} className="sw-ai-conversation-message"><summary>{s.title} — {s.headline}</summary>{(s.items||[]).map((i,n)=><p key={n}>{i.title} · {i.next_action}</p>)}</details>)}</>}</div>:<><div className="sw-ai-conversation-feed" role="log" aria-live="polite" aria-relevant="additions text">
          {!messages.length && <div className="sw-ai-conversation-intro">
            <img src={active.photo} onError={e=>{if(active.fallbackPhoto&&!e.currentTarget.src.endsWith(active.fallbackPhoto))e.currentTarget.src=active.fallbackPhoto;}} alt="" aria-hidden="true"/>
            <strong>Talk with {active.name}</strong>
            <p>Ask about {active.role.toLowerCase()} priorities, request a recommendation, or assign a real task using the button above.</p>
            <small>Responses use SYNC advisory chat with a role-focused prompt. This is not a separate autonomous employee session; no business actions run from chat.</small>
          </div>}
          {messages.map((message,index)=><div key={index} className={`sw-ai-conversation-message sw-ai-conversation-message--${message.by}`}>
            {message.by==="assistant"&&<img src={active.photo} onError={e=>{if(active.fallbackPhoto&&!e.currentTarget.src.endsWith(active.fallbackPhoto))e.currentTarget.src=active.fallbackPhoto;}} alt="" aria-hidden="true"/>}
            <div><strong>{message.by==="assistant"?active.name:"You"}</strong><p>{message.text}</p></div>
          </div>)}
          {chatBusy&&<div className="sw-ai-conversation-message sw-ai-conversation-message--assistant"><img src={active.photo} onError={e=>{if(active.fallbackPhoto&&!e.currentTarget.src.endsWith(active.fallbackPhoto))e.currentTarget.src=active.fallbackPhoto;}} alt="" aria-hidden="true"/><div><strong>{active.name}</strong><p>Thinking…</p></div></div>}
          <div ref={chatEndRef}/>
        </div>
        {chatError&&<p role="alert" className="sw-ai-conversation-error">{chatError}</p>}
        <form className="sw-ai-conversation-compose" onSubmit={sendMessage}>
          <label htmlFor="sw-ai-chat-message" className="sr-only">Message {active.name}</label>
          <textarea id="sw-ai-chat-message" ref={chatFieldRef} rows={2} maxLength={4000} value={chatDraft} onChange={event=>setChatDraft(event.target.value)}
            onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();sendMessage(event)}}}
            placeholder={`Ask ${active.name} a question…`} disabled={chatBusy}/>
          <button type="submit" aria-label={`Send message to ${active.name}`} disabled={!chatDraft.trim()||chatBusy}><Send size={19}/></button>
        </form>
        </>}
        <div className="sw-ai-conversation-footnote">Advisor chat · review proposed actions before execution · pilot access only</div>
      </section>
    </div>,document.body
  ) : null;
  return <>{placement==="launcher"?null:moveable ? <><div className="sw-desktop-bubble-placeholder" aria-hidden="true" />{createPortal(dock, document.body)}</> : dock}{conversation}</>;
}
