import React,{useEffect,useMemo,useRef,useState} from "react";
import {X,Send,RefreshCw,MessageCircle,ChevronRight,AlertTriangle} from "lucide-react";
import {useNavigate} from "react-router-dom";
import {getActiveBusinessId} from "../../api/client";
import {getLiveOperations} from "../../api/dispatch";
import {getSyncAiErrorMessage,sendSyncAiMessage} from "../../api/syncAi";
import {getPilotAgentsForUser} from "./pilotAgentRoster";
import {AVATARS,getAvatarPhotoForUser} from "./JarvisAvatar";
import "./BusinessAgentQuickChat.css";

const ROLE_SUGGESTIONS={
  chief_of_staff:["How healthy is this business right now?","What are my three next priorities?","What should I delegate today?"],
  accounting_finance:["What billing work needs my attention?","How can I improve invoice collections?","What should I review before closing the books?"],
  sales_manager:["What should my next sales task be?","How should I follow up on leads?","Help me prepare customer outreach."],
  social_media_marketing:["What should we post this week?","What marketing task comes next?","Help draft a business update."],
  research_analyst:["What business information should I verify?","Help me research local business opportunities.","What evidence should inform our next decision?"]
};
const agentMessage=(agent,text,summary)=>{
  const context=summary ? [
    "Read-only live operations (do not assume missing values are zero):",
    `Open jobs: ${summary.open_jobs??"unavailable"}; scheduled jobs: ${summary.scheduled_jobs??"unavailable"}; at-risk/late: ${summary.at_risk_or_late??"unavailable"}; active clocks: ${summary.active_clocks??"unavailable"}; route conflicts: ${summary.route_conflicts??"unavailable"}.`
  ].join(" ") : "Live operations metrics could not be verified; state this clearly instead of inventing numbers.";
  return `You are ${agent.name}, SyncWorks ${agent.role}. Reply within your designated business specialty. You are advising, not executing transactions, sending emails or accessing unconnected systems. ${context} User: ${text}`;
};
const safeNumber=v=>typeof v==="number"&&Number.isFinite(v)?v:null;
function Snapshot({ops,error,loading}){
  const s=ops?.summary||{};
  const staff=Array.isArray(ops?.staff)?ops.staff:[];
  const unassigned=ops?staff.filter(p=>!(p.jobs||[]).length).length:null;
  if(loading)return <p className="sw-agent-muted">Checking the selected business's live operations…</p>;
  if(error||!ops)return <p className="sw-agent-error" role="status">{error||"Live business data unavailable. Chat remains available, but no metrics have been verified."}</p>;
  return <div className="sw-agent-snapshot" aria-label="Verified operations snapshot">
    <div><strong>{safeNumber(s.scheduled_jobs)??"—"}</strong><span>Scheduled</span></div>
    <div><strong>{safeNumber(s.at_risk_or_late)??"—"}</strong><span>At risk</span></div>
    <div><strong>{unassigned??"—"}</strong><span>Unassigned techs</span></div>
  </div>;
}
function nextPriority(ops){
  if(!ops)return "Live operations data is unavailable. Check Dispatch and the work queue before deciding priorities.";
  const s=ops.summary||{};
  if(Number(s.at_risk_or_late)>0)return `Review ${s.at_risk_or_late} at-risk or late job(s) in Dispatch, then assign owners and confirm deadlines.`;
  const staff=Array.isArray(ops.staff)?ops.staff:[];
  const unassigned=staff.filter(p=>!(p.jobs||[]).length);
  if(unassigned.length)return `Review ${unassigned.length} unassigned technician(s). Confirm availability and match them to open jobs.`;
  if(Number(s.route_conflicts)>0)return `Review ${s.route_conflicts} route conflict(s) before the next technician departure.`;
  return "No urgent issue was flagged by the loaded dispatch snapshot. Review the active ticket queue, invoices and lead follow-ups next; other modules may have outstanding items.";
}
export default function BusinessAgentQuickChat({agentId,user,onClose}){
  const nav=useNavigate();
  const agent=useMemo(()=>getPilotAgentsForUser(user,AVATARS).find(a=>a.id===agentId),[agentId,user]);
  const [ops,setOps]=useState(null),[loadError,setLoadError]=useState(""),[loading,setLoading]=useState(true);
  const [input,setInput]=useState(""),[messages,setMessages]=useState([]),[working,setWorking]=useState(false);
  const [error,setError]=useState("");
  const scrollRef=useRef(null);
  const businessId=getActiveBusinessId();
  useEffect(()=>{
    let active=true;
    setOps(null);setLoading(true);setLoadError("");setMessages([]);setError("");
    if(!businessId){setLoadError("Select a business workspace first. No cross-business data will be loaded.");setLoading(false);return;}
    getLiveOperations().then(v=>{if(active)setOps(v);}).catch(e=>{if(active)setLoadError(e?.response?.data?.detail||"Unable to load the selected business's live operations.");}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[agentId,businessId]);
  useEffect(()=>{const key=e=>{if(e.key==="Escape")onClose();};window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);},[onClose]);
  useEffect(()=>{scrollRef.current?.scrollTo({top:scrollRef.current.scrollHeight,behavior:"smooth"});},[messages]);
  if(!agent)return null;
  const suggestions=ROLE_SUGGESTIONS[agent.workerRole]||ROLE_SUGGESTIONS.chief_of_staff;
  const immediate=(question)=>{
    setError("");
    if(/health/i.test(question)){
      if(!ops){setMessages(m=>[...m,{by:"user",text:question},{by:"agent",text:"The live operations snapshot could not be verified. I cannot calculate a business-health score from unavailable records. Open Dispatch to review active jobs and assignments."}]);return;}
      const s=ops.summary||{};
      const a=s.at_risk_or_late;
      setMessages(m=>[...m,{by:"user",text:question},{by:"agent",text:`From the loaded dispatch records: ${s.scheduled_jobs??"unknown"} scheduled jobs, ${a??"unknown"} jobs at risk, ${s.active_clocks??"unknown"} active clocks and ${s.route_conflicts??"unknown"} route conflicts. This is an operations snapshot, not a complete business-health score; finance, customer satisfaction and pipeline were not included. ${nextPriority(ops)}`}]);return;
    }
    setMessages(m=>[...m,{by:"user",text:question},{by:"agent",text:nextPriority(ops)}]);
  };
  const send=async(q)=>{
    const question=String(q||input).trim();if(!question||working||!businessId)return;
    setInput("");setError("");
    setMessages(m=>[...m,{by:"user",text:question}]);setWorking(true);
    try{
      const result=await sendSyncAiMessage({workspace:"business",message:agentMessage(agent,question,ops?.summary)});
      setMessages(m=>[...m,{by:"agent",text:result?.message||"No response was returned."}]);
    }catch(e){setError(getSyncAiErrorMessage(e)||"Assistant is unavailable. No paid operation or external action was performed.");}
    finally{setWorking(false);}
  };
  return <div className="sw-agent-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <aside role="dialog" aria-modal="true" aria-label={`${agent.name} business assistant`} className="sw-agent-drawer">
      <header className="sw-agent-header">
        <img alt="" src={getAvatarPhotoForUser(agent,user)}/>
        <div><strong>{agent.name}</strong><small>{agent.role} · Business workspace</small></div>
        <button type="button" onClick={onClose} aria-label="Close assistant"><X size={21}/></button>
      </header>
      <div ref={scrollRef} className="sw-agent-scroll">
        <div className="sw-agent-intro">Ask about operations and next steps. Responses use the selected business context; unverified data stays labeled as unavailable.</div>
        <Snapshot ops={ops} error={loadError} loading={loading}/>
        <div className="sw-agent-shortcuts">
          <button type="button" onClick={()=>immediate("How healthy is this business right now?")}>Business health <ChevronRight size={14}/></button>
          <button type="button" onClick={()=>immediate("What is the next task to stay on target?")}>Next task <ChevronRight size={14}/></button>
          <button type="button" onClick={()=>{onClose();nav("/sync/assist");}}>Agent jobs <ChevronRight size={14}/></button>
        </div>
        <h3>Ask {agent.name}</h3>
        <div className="sw-agent-suggestions">{suggestions.map(s=><button type="button" key={s} disabled={working||!businessId} onClick={()=>send(s)}>{s}</button>)}</div>
        <div className="sw-agent-thread" aria-live="polite">{messages.map((m,i)=><div className={`sw-agent-message ${m.by==="user"?"is-user":""}`} key={i}><b>{m.by==="user"?"You":agent.name}</b><p>{m.text}</p></div>)}</div>
        {working&&<p className="sw-agent-muted" role="status">Checking the authorized business context…</p>}
        {error&&<p className="sw-agent-error" role="alert"><AlertTriangle size={15}/> {error}</p>}
      </div>
      <form className="sw-agent-compose" onSubmit={e=>{e.preventDefault();send();}}>
        <input aria-label={`Message ${agent.name}`} value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask a business question…" maxLength={1200}/>
        <button type="submit" disabled={!input.trim()||working||!businessId} aria-label="Send message"><Send size={18}/></button>
      </form>
      <p className="sw-agent-footnote">AI replies may incur pilot usage. Advice only: no emails, payments, assignments or approvals are executed by this chat.</p>
    </aside>
  </div>;
}
