import React,{useEffect,useState} from "react";
import {X,Send,ChevronRight,BriefcaseBusiness} from "lucide-react";
import api from "../../api/client";
import "./SboAgentQuickChat.css";
export default function SboAgentQuickChat({agent,onClose,onNavigate}){
 const [draft,setDraft]=useState("");
 const [messages,setMessages]=useState([]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 useEffect(()=>{setMessages([]);setDraft("");setError("");},[agent?.id]);
 useEffect(()=>{if(!agent)return;const onKey=e=>{if(e.key==="Escape")onClose();};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey);},[agent,onClose]);
 if(!agent)return null;
 const send=async event=>{
  event.preventDefault();const question=draft.trim();if(!question||busy)return;
  setDraft("");setError("");setBusy(true);
  setMessages(old=>[...old,{who:"you",text:question}]);
  try{
   const response=await api.post("/sync-ai/chat/",{workspace:"business",message:`You are ${agent.name}, the ${agent.role} advisor inside SyncWorks business office. Answer the user's question for this role. Do not claim to have executed any actions, retrieved business records or sent messages unless verified by an available tool. User: ${question}`},{timeout:40000});
   setMessages(old=>[...old,{who:"assistant",text:String(response?.data?.message||"No response returned.")}]);
  }catch(e){setError(e?.response?.data?.detail||"Chat is unavailable. You can still open the full AI employee workspace.");}
  finally{setBusy(false);}
 };
 return <div className="sw-sbo-agent-shade" onMouseDown={onClose}><aside className="sw-sbo-agent-drawer" role="dialog" aria-modal="true" aria-label={agent.name+" assistant"} onMouseDown={e=>e.stopPropagation()}>
  <header><div className="sw-sbo-agent-title"><img src={agent.photo} alt=""/><div><span>SYNC ASSIST · BUSINESS</span><h2>{agent.name}</h2><small>{agent.role}</small></div></div><button type="button" onClick={onClose} aria-label="Close assistant"><X size={21}/></button></header>
  <p className="sw-sbo-agent-disclosure">Ask {agent.name} a business question. This is an advisory chat; assigning work and autonomous execution use the separate approvals workflow.</p>
  <div className="sw-sbo-agent-messages" aria-live="polite">{messages.length?messages.map((m,i)=><div key={i} className={"sw-sbo-agent-message "+(m.who==="you"?"is-you":"")}><strong>{m.who==="you"?"You":agent.name}</strong><p>{m.text}</p></div>):<div className="sw-sbo-agent-empty"><p>How can I help with your business today?</p><button onClick={()=>setDraft("What should I prioritize in the business today?")}>Priorities for today</button><button onClick={()=>setDraft("What can I improve in my area of operations?")}>Operational improvements</button></div>}</div>
  {error&&<p role="alert" className="sw-sbo-agent-error">{error}</p>}
  <form onSubmit={send}><input value={draft} onChange={e=>setDraft(e.target.value)} placeholder={"Message "+agent.name} aria-label="Assistant message"/><button type="submit" disabled={busy||!draft.trim()} aria-label="Send message"><Send size={18}/></button></form>
  <button type="button" className="sw-sbo-agent-manage" onClick={()=>onNavigate("/sync/assist/employees")}><BriefcaseBusiness size={16}/> Open AI employee office <ChevronRight size={17}/></button>
 </aside></div>;
}
