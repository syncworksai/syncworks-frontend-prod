import React, {useEffect,useState} from "react";
import {Brain,Check,MessageCircle,Send,Settings2,X} from "lucide-react";
import api from "../api/client";
import "./ForgeGrowthCoach.css";

const AREAS=[
  ["stoicism","Stoic self-command"],
  ["self-discipline","Daily discipline"],
  ["confidence","Confidence and presence"],
  ["emotional-awareness","Emotional awareness"],
  ["critical-thinking","Critical thinking"],
  ["leadership","Leadership and persuasion"],
  ["relationships","Relationships and family"],
  ["athletic-mindset","Athletic mindset"],
  ["humility","Humility and character"],
  ["purpose","Purpose and meaning"],
  ["financial-discipline","Financial judgment"]
];
const styles=[["balanced","Supportive and challenging"],["challenging","Push me to question assumptions"],["reflective","Calm and deeply reflective"]];
const key=email=>`syncworks-forge-growth:${email}`;
const safeLoad=email=>{try{const x=JSON.parse(localStorage.getItem(key(email))||"{}");return {areas:Array.isArray(x.areas)?x.areas.filter(a=>AREAS.some(t=>t[0]===a)).slice(0,8):[],approach:styles.some(y=>y[0]===x.approach)?x.approach:"balanced"};}catch{return {areas:[],approach:"balanced"};}};
export default function ForgeGrowthCoach({email,chapter,open,onClose}){
  const [profile,setProfile]=useState(()=>safeLoad(email));
  const [step,setStep]=useState("profile");
  const [question,setQuestion]=useState("");
  const [messages,setMessages]=useState([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  useEffect(()=>{setProfile(safeLoad(email));setStep(safeLoad(email).areas.length?"dialogue":"profile");},[email]);
  useEffect(()=>{if(!open)return;const handler=e=>{if(e.key==="Escape")onClose();};document.addEventListener("keydown",handler);return()=>document.removeEventListener("keydown",handler);},[open,onClose]);
  const toggle=id=>setProfile(p=>({...p,areas:p.areas.includes(id)?p.areas.filter(x=>x!==id):p.areas.length<8?[...p.areas,id]:p.areas}));
  function saveProfile(){try{localStorage.setItem(key(email),JSON.stringify(profile));}catch{}setStep("dialogue");}
  async function ask(e){
    e.preventDefault();
    const q=question.trim();
    if(!q||busy)return;
    setQuestion("");setError("");setBusy(true);
    setMessages(prev=>[...prev,{role:"user",text:q}]);
    try{
      const response=await api.post("/sync-ai/forge/reflection/",{
        question:q,
        chapter_title:chapter.title,
        chapter_excerpt:chapter.paragraphs.slice(0,3).join(" ").slice(0,2500),
        focus_areas:profile.areas,
        approach:profile.approach,
      },{timeout:45000});
      setMessages(prev=>[...prev,{role:"coach",text:String(response.data?.answer||"I couldn't produce a response.")}]);
    }catch(ex){
      setError(ex?.response?.data?.detail||"The coaching service is unavailable. Your question wasn't answered.");
    }finally{setBusy(false);}
  }
  if(!open)return null;
  return <div className="forge-growth-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)onClose();}}>
    <section role="dialog" aria-modal="true" aria-labelledby="forge-growth-title" className="forge-growth-dialog">
      <header className="forge-growth-head"><div><span>THE FORGE · PERSONAL GROWTH</span><h2 id="forge-growth-title">{step==="profile"?"Build your learning profile":"Ask Forge about the lesson"}</h2><p>{step==="profile"?"Choose the areas you'd like to strengthen. You can change these later.":chapter.title+" · Socratic discussion"}</p></div><button type="button" aria-label="Close coach" onClick={onClose}><X size={20}/></button></header>
      {step==="profile"?<div className="forge-growth-body">
        <h3>What would you like to develop?</h3><p>Choose up to eight. Forge will use these preferences to frame its explanations and questions, not to label or diagnose you.</p>
        <div className="forge-growth-areas">{AREAS.map(([id,label])=><button key={id} type="button" aria-pressed={profile.areas.includes(id)} className={profile.areas.includes(id)?"selected":""} onClick={()=>toggle(id)}><Check size={15}/>{label}</button>)}</div>
        <label className="forge-growth-label" htmlFor="forge-growth-style">How should your coach challenge you?</label>
        <select id="forge-growth-style" value={profile.approach} onChange={e=>setProfile(p=>({...p,approach:e.target.value}))}>{styles.map(([id,title])=><option key={id} value={id}>{title}</option>)}</select>
        <button className="forge-growth-primary" type="button" onClick={saveProfile}>Save profile & start discussion</button>
        <small>Preferences are saved on this device. Your answers won't automatically be shared with Chief of Staff.</small>
      </div>:<>
        <div className="forge-growth-discussion" tabIndex={0} aria-label="Forge conversation">
          <div className="forge-growth-coach"><Brain size={21}/><p>What stood out to you in <strong>{chapter.title}</strong>? You can question the philosophy, explain a situation, or ask me to go deeper. I'll examine your thinking rather than simply agree with it.</p></div>
          {messages.map((m,i)=><div key={i} className={m.role==="user"?"forge-growth-user":"forge-growth-coach"}>{m.role==="coach"?<Brain size={18}/>:null}<p>{m.text}</p></div>)}
          {busy&&<p className="forge-growth-loading">Considering your question…</p>}
          {error&&<p className="forge-growth-error" role="alert">{error}</p>}
        </div>
        <form onSubmit={ask} className="forge-growth-compose"><textarea aria-label="Ask Forge a question" value={question} onChange={e=>setQuestion(e.target.value)} maxLength={2500} placeholder="I understand the idea, but how do I apply this when…?" rows={2}/><div><button type="button" className="forge-growth-settings" onClick={()=>setStep("profile")}><Settings2 size={15}/> Preferences</button><button type="submit" className="forge-growth-primary" disabled={!question.trim()||busy}><Send size={16}/> Ask Forge</button></div></form>
      </>}
    </section>
  </div>;
}
