import React, { useEffect, useRef, useState } from "react";
import { Brain, Check, RotateCcw, Send, Settings2, Trash2, X } from "lucide-react";
import api from "../api/client";
import "./ForgeGrowthCoach.css";

const AREAS = [
  ["stoicism","Stoic self-command"],["self-discipline","Daily discipline"],
  ["confidence","Confidence and presence"],["emotional-awareness","Emotional awareness"],
  ["critical-thinking","Critical thinking"],["leadership","Leadership and persuasion"],
  ["relationships","Relationships and family"],["athletic-mindset","Athletic mindset"],
  ["humility","Humility and character"],["purpose","Purpose and meaning"],
  ["financial-discipline","Financial judgment"]
];
const styles = [
  ["balanced","Supportive and challenging"],
  ["challenging","Push me to question assumptions"],
  ["reflective","Calm and deeply reflective"]
];
const defaults = {
  areas:[], approach:"balanced", personal_vision:"",
  current_challenge:"", daily_practice:"",
  memory_enabled:false, assessment_completed:false
};
const oldKey = email => `syncworks-forge-growth:${email}`;
function localDraft(email){
  try{
    const old=JSON.parse(localStorage.getItem(oldKey(email)) || "{}");
    return {...defaults,
      areas:Array.isArray(old.areas)?old.areas.filter(a=>AREAS.some(t=>t[0]===a)).slice(0,8):[],
      approach:styles.some(x=>x[0]===old.approach)?old.approach:"balanced"
    };
  }catch{return {...defaults};}
}
function fromServer(x){
  return {
    areas:Array.isArray(x?.focus_areas)?x.focus_areas:[],
    approach:styles.some(a=>a[0]===x?.approach)?x.approach:"balanced",
    personal_vision:x?.personal_vision||"",
    current_challenge:x?.current_challenge||"",
    daily_practice:x?.daily_practice||"",
    memory_enabled:x?.memory_enabled===true,
    assessment_completed:x?.assessment_completed===true,
  };
}
function getError(ex, fallback){
  const detail=ex?.response?.data?.detail;
  return typeof detail==="string"?detail:fallback;
}
export default function ForgeGrowthCoach({ email, chapter, open, onClose }){
  const [profile,setProfile]=useState(()=>localDraft(email));
  const [step,setStep]=useState("profile");
  const [question,setQuestion]=useState("");
  const [messages,setMessages]=useState([]);
  const [busy,setBusy]=useState(false);
  const [saving,setSaving]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const messagesEnd=useRef(null);

  useEffect(()=>{
    if(!open)return undefined;
    const listener=e=>{if(e.key==="Escape")onClose();};
    document.addEventListener("keydown",listener);
    return ()=>document.removeEventListener("keydown",listener);
  },[open,onClose]);

  useEffect(()=>{
    if(!open || !email)return undefined;
    let cancelled=false;
    setLoading(true);
    setError("");setNotice("");setMessages([]);
    setProfile(localDraft(email));
    api.get("/sync-ai/forge/profile/").then(({data})=>{
      if(cancelled)return;
      const next=fromServer(data);
      // Previously selected local areas remain an unsaved draft until the user saves.
      const local=localDraft(email);
      const selected=next.assessment_completed?next:{...next, areas:local.areas.length?local.areas:next.areas, approach:local.areas.length?local.approach:next.approach};
      setProfile(selected);
      setStep(next.assessment_completed?"dialogue":"profile");
    }).catch(ex=>{
      if(cancelled)return;
      setStep("profile");
      setError(getError(ex,"Could not load your secure Forge profile. Check the connection and try again."));
    }).finally(()=>{if(!cancelled)setLoading(false);});
    return ()=>{cancelled=true;};
  },[email,open]);

  useEffect(()=>{
    if(!open || step!=="dialogue")return undefined;
    let cancelled=false;
    setMessages([]);
    if(!profile.memory_enabled)return undefined;
    api.get("/sync-ai/forge/history/",{params:{chapter:chapter.id}})
      .then(({data})=>{if(!cancelled)setMessages(Array.isArray(data?.messages)?data.messages:[]);})
      .catch(()=>{if(!cancelled)setError("Could not restore previous discussion. Please retry.");});
    return ()=>{cancelled=true;};
  },[open,step,chapter.id,profile.memory_enabled]);

  useEffect(()=>{if(open && step==="dialogue")messagesEnd.current?.scrollIntoView({block:"nearest"});},[open,step,messages.length]);

  const toggle=id=>setProfile(p=>({
    ...p,areas:p.areas.includes(id)?p.areas.filter(x=>x!==id):p.areas.length<8?[...p.areas,id]:p.areas
  }));

  async function saveProfile(){
    if(saving || busy)return;
    setSaving(true);setError("");setNotice("");
    try{
      const payload={
        focus_areas:profile.areas, approach:profile.approach,
        personal_vision:profile.personal_vision.trim(),
        current_challenge:profile.current_challenge.trim(),
        daily_practice:profile.daily_practice.trim(),
        assessment_completed:true, memory_enabled:profile.memory_enabled
      };
      const {data}=await api.patch("/sync-ai/forge/profile/",payload);
      setProfile(fromServer(data));
      try{localStorage.removeItem(oldKey(email));}catch{/* optional legacy draft */}
      setNotice("Personal assessment saved to your SyncWorks account.");
      setStep("dialogue");
    }catch(ex){
      setError(getError(ex,"Your profile was not saved. Nothing has been confirmed."));
    }finally{setSaving(false);}
  }
  async function ask(e){
    e.preventDefault();
    const text=question.trim();
    if(!text || busy || saving)return;
    setError("");setNotice("");setBusy(true);
    const previous=messages.map(m=>({role:m.role,text:m.text})).slice(-8);
    setMessages(old=>[...old,{role:"user",text}]);
    try{
      const {data}=await api.post("/sync-ai/forge/reflection/",{
        question:text, chapter_key:chapter.id,
        chapter_title:chapter.title,
        chapter_excerpt:chapter.paragraphs.slice(0,3).join(" ").slice(0,2500),
        focus_areas:profile.areas, approach:profile.approach, history:previous
      },{timeout:45000});
      const answer=String(data?.answer||"").trim();
      if(!answer)throw new Error("No response from Forge");
      setMessages(old=>[...old,{role:"coach",text:answer}]);
      setQuestion("");
      if(data.saved)setNotice("Discussion saved to your Forge account.");
    }catch(ex){
      setMessages(old=>old.slice(0,-1));
      setError(getError(ex,"Forge couldn't answer just now. Your question remains in the field."));
    }finally{setBusy(false);}
  }
  async function clearHistory(){
    if(!window.confirm("Clear saved Forge discussions for this chapter? This cannot be undone."))return;
    setError("");setNotice("");
    try{
      await api.delete("/sync-ai/forge/history/",{params:{chapter:chapter.id}});
      setMessages([]);setNotice("Discussion cleared.");
    }catch(ex){setError(getError(ex,"Could not clear the discussion."));}
  }
  async function resetProfile(){
    if(!window.confirm("Delete your Forge personal assessment and all saved Forge discussions? This cannot be undone."))return;
    setError("");setNotice("");
    try{
      await api.delete("/sync-ai/forge/profile/");
      setMessages([]);setProfile({...defaults});setStep("profile");
      try{localStorage.removeItem(oldKey(email));}catch{/* no-op */}
      setNotice("Your Forge coaching profile and saved discussions were deleted.");
    }catch(ex){setError(getError(ex,"Could not delete your Forge profile."));}
  }
  if(!open)return null;
  return <div className="forge-growth-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)onClose();}}>
    <section role="dialog" aria-modal="true" aria-labelledby="forge-growth-title" className="forge-growth-dialog">
      <header className="forge-growth-head">
        <div><span>THE FORGE · PRIVATE PERFORMANCE COACH</span>
          <h2 id="forge-growth-title">{step==="profile"?"Your personal development assessment":"Think deeper with Forge"}</h2>
          <p>{step==="profile"?"Build a learning path around your own goals, values and challenges.":chapter.title+" · contextual discussion"}</p>
        </div>
        <button type="button" aria-label="Close Forge coach" onClick={onClose}><X size={20}/></button>
      </header>
      {loading?<div className="forge-growth-body"><p role="status">Loading your private Forge profile…</p></div>:
      step==="profile"?<div className="forge-growth-body">
        <h3>What kind of person are you working to become?</h3>
        <p>Choose up to eight learning areas. Your answers help frame coaching questions—not diagnose or label you.</p>
        <div className="forge-growth-areas">{AREAS.map(([id,label])=><button key={id} type="button" aria-pressed={profile.areas.includes(id)} className={profile.areas.includes(id)?"selected":""} onClick={()=>toggle(id)}><Check size={15}/>{label}</button>)}</div>
        <label className="forge-growth-label" htmlFor="forge-growth-style">Preferred coaching style</label>
        <select id="forge-growth-style" value={profile.approach} onChange={e=>setProfile(p=>({...p,approach:e.target.value}))}>{styles.map(([id,title])=><option key={id} value={id}>{title}</option>)}</select>
        <label className="forge-growth-label" htmlFor="forge-growth-vision">What does your ideal future look like?</label>
        <textarea id="forge-growth-vision" className="forge-growth-profile-textarea" maxLength={1500} rows={3} value={profile.personal_vision} onChange={e=>setProfile(p=>({...p,personal_vision:e.target.value}))} placeholder="The capabilities, relationships, habits and life I want to build…"/>
        <label className="forge-growth-label" htmlFor="forge-growth-challenge">What is holding you back right now?</label>
        <textarea id="forge-growth-challenge" className="forge-growth-profile-textarea" maxLength={1500} rows={2} value={profile.current_challenge} onChange={e=>setProfile(p=>({...p,current_challenge:e.target.value}))} placeholder="A habit, recurring thought or challenge I want to work through…"/>
        <label className="forge-growth-label" htmlFor="forge-growth-practice">What daily practice would make the biggest difference?</label>
        <textarea id="forge-growth-practice" className="forge-growth-profile-textarea" maxLength={1500} rows={2} value={profile.daily_practice} onChange={e=>setProfile(p=>({...p,daily_practice:e.target.value}))} placeholder="Something specific I can practice consistently…"/>
        <label className="forge-growth-consent"><input type="checkbox" checked={profile.memory_enabled} onChange={e=>setProfile(p=>({...p,memory_enabled:e.target.checked}))}/><span><strong>Remember my Forge discussions across devices</strong><small>Optional. Forge saves questions and answers only when enabled. Turning it off deletes stored discussions; the assessment remains until you delete it.</small></span></label>
        <div className="forge-growth-profile-actions"><button className="forge-growth-primary" type="button" onClick={saveProfile} disabled={saving}>{saving?"Saving…":"Save assessment & continue"}</button>{profile.assessment_completed?<button className="forge-growth-settings" type="button" onClick={resetProfile}><Trash2 size={15}/> Delete all Forge coaching data</button>:null}</div>
        <small>Assessment saved to your authenticated SyncWorks account. When you ask Forge a question, your selected assessment and discussion context are sent to the configured AI provider to generate a response. Chief of Staff does not receive Forge access.</small>
        {error?<p className="forge-growth-error" role="alert">{error}</p>:null}
        {notice?<p className="forge-growth-success" role="status">{notice}</p>:null}
      </div>:<>
        <div className="forge-growth-discussion" tabIndex={0} aria-label="Forge conversation">
          <div className="forge-growth-coach"><Brain size={21}/><p>What stood out to you in <strong>{chapter.title}</strong>? Tell me how you interpreted the lesson, and I can help you examine it from other perspectives.</p></div>
          {messages.map((m,i)=><div key={m.id||i} className={m.role==="user"?"forge-growth-user":"forge-growth-coach"}>{m.role==="coach"?<Brain size={18}/>:null}<p>{m.text}</p></div>)}
          <div ref={messagesEnd}/>
          {busy?<p className="forge-growth-loading" role="status">Considering your question…</p>:null}
          {error?<p className="forge-growth-error" role="alert">{error}</p>:null}
          {notice?<p className="forge-growth-success" role="status">{notice}</p>:null}
        </div>
        <form onSubmit={ask} className="forge-growth-compose">
          <textarea aria-label="Ask Forge a question" value={question} onChange={e=>setQuestion(e.target.value)} maxLength={2500} placeholder="How would I apply this in my own life?" rows={2}/>
          <div className="forge-growth-compose-actions">
            <button type="button" className="forge-growth-settings" onClick={()=>{setError("");setStep("profile");}}><Settings2 size={15}/> Assessment</button>
            {profile.memory_enabled?<button type="button" className="forge-growth-settings" onClick={clearHistory}><Trash2 size={15}/> Clear discussion</button>:<span className="forge-growth-session-note">Session only · Memory off</span>}
            <button type="submit" className="forge-growth-primary" disabled={!question.trim()||busy}><Send size={16}/> Ask Forge</button>
          </div>
        </form>
      </>}
    </section>
  </div>;
}
