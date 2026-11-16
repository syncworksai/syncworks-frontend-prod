import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Activity, BookOpen, BriefcaseBusiness, CalendarDays,
  Check, ChevronRight, Clock3, Dumbbell, Flame, Heart, Headphones, Moon,
  Pause, Play, RotateCcw, ShieldCheck, Sparkles, Square, Sun, Target,
  TrendingUp, UserRound, Volume2, Wallet, WandSparkles
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import "./CustomerForge.css";

const OWNER = "jacoblord7@outlook.com";
const routine = [
  { time:"04:00", title:"Wake & prime", detail:"Hydrate, brush teeth, cool face rinse, set your intention.", icon:Sun, lane:"RITUAL", route:"/customer/health", action:"Health" },
  { time:"04:15", title:"Move & listen", detail:"Mobility, conditioning and a focused audio lesson.", icon:Activity, lane:"BODY", route:"/customer/health", action:"Open training" },
  { time:"05:15", title:"Breakfast & learning", detail:"Prepare breakfast. Learn one useful idea while you cook.", icon:BookOpen, lane:"MIND", route:null, action:"Start lesson" },
  { time:"06:15", title:"Market preparation", detail:"Economic calendar, scenarios, risk plan and journal.", icon:TrendingUp, lane:"WEALTH", route:"/customer/day-trading-futures", action:"Trading desk" },
  { time:"07:15", title:"Trading focus", detail:"Execute the plan. Protect risk. Review your decisions.", icon:Target, lane:"WEALTH", route:"/customer/day-trading-futures", action:"Trading desk" },
  { time:"09:00", title:"Train your craft", detail:"Strength training, golf, softball or recovery as planned.", icon:Dumbbell, lane:"BODY", route:"/customer/health", action:"Training" },
  { time:"10:30", title:"Groom & dress", detail:"Shower, shave or trim, skincare, dress with intention.", icon:UserRound, lane:"IDENTITY", route:null, action:"View vision" },
  { time:"11:00", title:"Family & lunch", detail:"Healthy lunch and undistracted time with your child.", icon:Heart, lane:"FAMILY", route:"/customer/family", action:"Family" },
  { time:"13:00", title:"Build SyncWorks", detail:"One meaningful product, customer or business deliverable.", icon:BriefcaseBusiness, lane:"WORK", route:"/customer/tasks", action:"Open tasks" },
  { time:"15:30", title:"Income sprint", detail:"Upwork delivery, proposals, leads and follow-ups.", icon:Wallet, lane:"WEALTH", route:"/customer/freelance/overview", action:"Freelance" },
  { time:"17:00", title:"Family evening", detail:"Dinner, playtime and your family's bedtime routine.", icon:Heart, lane:"FAMILY", route:"/calendar", action:"Calendar" },
  { time:"19:30", title:"Reflect & recover", detail:"Review the day, meditate, plan and protect sleep.", icon:Moon, lane:"RECOVERY", route:"/customer/health", action:"Health" }
];
const visions = [
  { icon:UserRound, title:"Identity & style", anchor:"Present with confidence", body:"Grooming, clothing, posture, communication and the way you carry yourself.", action:"Prepare tomorrow's outfit. Practice a clear 30-second introduction.", route:"/customer/settings", link:"Personal settings" },
  { icon:TrendingUp, title:"Wealth & freedom", anchor:"Build, don't just dream", body:"Develop income, sound financial habits and opportunities to grow SyncWorks.", action:"Ship one outcome that serves a customer or earns income.", route:"/customer/finance", link:"Finance" },
  { icon:Dumbbell, title:"Athletic excellence", anchor:"Train with purpose", body:"Lifting, recovery, conditioning, golf, softball and skill development.", action:"Track your next workout and practice one athletic skill.", route:"/customer/health", link:"Health & training" },
  { icon:BookOpen, title:"Intellectual growth", anchor:"Learn to think better", body:"Philosophy, history, business, psychology and challenging assumptions.", action:"Explain an idea in your own words and test what you believe.", route:null, link:"Coach lesson" },
  { icon:Heart, title:"Family & character", anchor:"Be present", body:"Build the life you want with the people who matter most.", action:"Protect a screen-free family block.", route:"/customer/family", link:"Family" },
  { icon:Target, title:"Execution & discipline", anchor:"Make progress visible", body:"Prioritize, follow through, review results and adjust without burning out.", action:"Identify today's most important deliverable.", route:"/customer/tasks", link:"Tasks" }
];
const lessons = [
  { title:"Examine your assumptions", author:"Socratic reflection", script:"What belief are you accepting without examining it? What evidence would change your mind? Choose one honest action today." },
  { title:"Control the controllable", author:"Stoic reflection", script:"You do not control every result. You control preparation, judgment and action. Identify what is within your control, and give it your best attention." },
  { title:"The disciplined trader", author:"Trading psychology", script:"A successful trading session is one where you follow the plan and manage risk. Do not confuse luck with skill. Define your invalidation before you act." },
  { title:"Walk into the room", author:"Confidence & presence", script:"Stand tall, relax your shoulders, speak with clarity, listen carefully and make a useful offer. Confidence grows through preparation and practice." },
  { title:"Return to the present", author:"Guided breathing", script:"Settle into a comfortable position. Inhale gently. Exhale slowly. Notice the body relaxing. You can return your attention to the present moment." }
];
const pad = n => String(n).padStart(2,"0");
const minutes = time => { const [h,m] = time.split(":").map(Number); return h*60+m; };
const dateKey = () => {const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
const storageKey = email => `syncworks-forge-v1:${email}:${dateKey()}`;
function read(key) { try { return JSON.parse(window.localStorage.getItem(key) || "{}"); } catch { return {}; } }
const tabs = [{id:"today",name:"Today",icon:CalendarDays},{id:"vision",name:"Vision",icon:Sparkles},{id:"coach",name:"Coach",icon:Headphones},{id:"review",name:"Review",icon:Moon}];
const shortcuts = [{label:"Calendar",path:"/calendar",icon:CalendarDays},{label:"Health & training",path:"/customer/health",icon:Dumbbell},{label:"Trading desk",path:"/customer/day-trading-futures",icon:TrendingUp},{label:"Tasks",path:"/customer/tasks",icon:Target},{label:"Freelance work",path:"/customer/freelance/overview",icon:Wallet}];

export default function CustomerForge() {
  const { user } = useAuth();
  const email = String(user?.email || "").trim().toLowerCase();
  const permitted = email === OWNER;
  const key = storageKey(email);
  const [tab,setTab] = useState("today");
  const [completed,setCompleted] = useState({});
  const [loadedKey,setLoadedKey] = useState("");
  const [intent,setIntent] = useState("");
  const [bedtime,setBedtime] = useState("20:00");
  const [coach,setCoach] = useState(0);
  const [speaking,setSpeaking] = useState(false);
  const [now,setNow] = useState(()=>new Date());
  const speechRef = useRef(null);
  useEffect(()=>{
    if(!permitted) return;
    const saved=read(key);
    setCompleted(saved.completed || {});
    setIntent(saved.intent || "");
    setBedtime(saved.bedtime || "20:00");
    setLoadedKey(key);
  },[permitted,key]);
  useEffect(()=>{
    if(!permitted || loadedKey!==key) return;
    try {localStorage.setItem(key,JSON.stringify({completed,intent,bedtime}));} catch { /* optional local prototype storage */ }
  },[completed,intent,bedtime,permitted,key,loadedKey]);
  useEffect(()=>{
    const interval=window.setInterval(()=>setNow(new Date()),60000);
    return ()=>window.clearInterval(interval);
  },[]);
  useEffect(()=>()=>{if(typeof window!=="undefined" && window.speechSynthesis) window.speechSynthesis.cancel();},[]);
  const done=useMemo(()=>routine.filter((_,i)=>completed[i]).length,[completed]);
  const clock=now.getHours()*60+now.getMinutes();
  const currentIndex=routine.reduce((idx,block,i)=>clock>=minutes(block.time)?i:idx,-1);
  const nextIndex=routine.findIndex((block,i)=>i>currentIndex && !completed[i]);
  const focusIndex=currentIndex>=0 && !completed[currentIndex]?currentIndex:nextIndex>=0?nextIndex:routine.findIndex((_,i)=>!completed[i]);
  const focus=focusIndex>=0?routine[focusIndex]:null;
  const focusIsCurrent=focusIndex===currentIndex;
  const nextTime=focus?minutes(focus.time):0;
  const until=focus?Math.max(0,nextTime-clock):0;
  const progress=Math.round(done/routine.length*100);
  function stopSpeech(){ if(window.speechSynthesis) window.speechSynthesis.cancel();setSpeaking(false); }
  function say(script){
    if(!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;
    window.speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(script);
    utterance.rate=.91; utterance.pitch=1;
    utterance.onend=()=>setSpeaking(false); utterance.onerror=()=>setSpeaking(false);
    speechRef.current=utterance;setSpeaking(true);window.speechSynthesis.speak(utterance);
  }
  function speakBrief(){
    if(!focus) return;
    say(`Your next mission is ${focus.title}. ${focus.detail} ${intent ? "Your priority today is "+intent+"." : "Take one focused step forward today."}`);
  }
  function openRoutineAction(block){
    if(block.route) return null;
    return block.title==="Breakfast & learning"?()=>setTab("coach"):()=>setTab("vision");
  }
  if(!permitted) return <main className="min-h-screen bg-slate-950 px-6 pt-28 text-white"><h1 className="text-2xl font-semibold">Private pilot</h1><p className="mt-3 text-slate-400">The Forge is not available for this account.</p><Link to="/customer" className="mt-6 inline-block text-amber-200">Return to office</Link></main>;
  return <main className="forge-v2 min-h-screen pt-24 pb-28 text-[#f8f2e8] sm:pt-28">
    <div className="forge-v2-glow" aria-hidden="true"/>
    <div className="forge-v2-inner">
      <div className="forge-v2-topline"><Link to="/customer" className="forge-v2-back"><ArrowLeft size={16}/> My office</Link><span className="forge-v2-private"><ShieldCheck size={14}/> PRIVATE PERFORMANCE STUDIO</span></div>
      <header className="forge-v2-hero">
        <div className="forge-v2-hero-pattern" aria-hidden="true"><span className="forge-v2-ring forge-v2-ring-one"/><span className="forge-v2-ring forge-v2-ring-two"/><Flame className="forge-v2-hero-flame" strokeWidth={1}/></div>
        <div className="forge-v2-hero-copy">
          <p className="forge-v2-overline">SYNCWORKS <span>/</span> YOUR PERSONAL OPERATING SYSTEM</p>
          <h1>THE <em>FORGE</em></h1>
          <p className="forge-v2-tagline">Forge the mind. Strengthen the body. Build the life.</p>
          <div className="forge-v2-metrics"><span><strong>{pad(now.getHours())}:{pad(now.getMinutes())}</strong><small>LOCAL TIME</small></span><span><strong>{done}<b> / {routine.length}</b></strong><small>DAILY VICTORIES</small></span><span><strong>{progress}%</strong><small>MISSION PROGRESS</small></span></div>
          <div className="forge-v2-meter" role="progressbar" aria-label="Daily progress" aria-valuenow={done} aria-valuemin={0} aria-valuemax={routine.length}><span style={{width:progress+"%"}}/></div>
        </div>
      </header>
      <nav className="forge-v2-nav" aria-label="Forge sections">{tabs.map(({id,name,icon:Icon})=><button key={id} type="button" aria-current={tab===id?"page":undefined} className={tab===id?"forge-v2-tab selected":"forge-v2-tab"} onClick={()=>{stopSpeech();setTab(id);}}><Icon size={17}/>{name}</button>)}</nav>
      {tab==="today"&&<div className="forge-v2-appear">
        <div className="forge-v2-two-col">
          <section className="forge-v2-focus" aria-label="Current mission">
            <div className="forge-v2-eyebrow"><span className="forge-v2-live-dot"/> {focusIsCurrent?"CURRENT MISSION":"UP NEXT"} <span className="forge-v2-focus-time">{focus?.time||"All done"} {focus && !focusIsCurrent && until>0?`· IN ${Math.floor(until/60)?Math.floor(until/60)+"H ":""}${until%60}M`:""}</span></div>
            <h2>{focus?.title || "You've completed your mission."}</h2>
            <p>{focus?.detail || "Recover, reflect and prepare for tomorrow."}</p>
            <div className="forge-v2-actions">
              <button type="button" className="forge-v2-primary" onClick={speaking?stopSpeech:speakBrief} disabled={!focus}>{speaking?<Square size={16}/>:<Volume2 size={17}/>} {speaking?"Stop briefing":"Hear my next step"}</button>
              {focus && (focus.route?<Link className="forge-v2-secondary" to={focus.route}>Open {focus.action}<ArrowRight size={15}/></Link>:<button className="forge-v2-secondary" onClick={openRoutineAction(focus)} type="button">{focus.action}<ArrowRight size={15}/></button>)}
            </div>
            <p className="forge-v2-smallnote">Guidance is based on your sample routine, not live calendar availability.</p>
          </section>
          <section className="forge-v2-intent">
            <div className="forge-v2-eyebrow"><Target size={14}/> TODAY'S DIRECTION</div>
            <h2>One day. One clear priority.</h2>
            <label htmlFor="forge-intent-v2">What would make today worthwhile?</label>
            <textarea rows={3} id="forge-intent-v2" value={intent} onChange={e=>setIntent(e.target.value)} placeholder="Finish the client pilot. Follow my trading plan. Be present with my child."/>
            <p className="forge-v2-smallnote">Saved on this device for today.</p>
          </section>
        </div>
        <div className="forge-v2-section-heading"><div><p className="forge-v2-overline">YOUR OPERATING RHYTHM</p><h2>Today's timeline</h2></div><Link to="/calendar" className="forge-v2-textlink"><CalendarDays size={16}/> Open calendar <ChevronRight size={16}/></Link></div>
        <div className="forge-v2-timeline">{routine.map((block,i)=>{
          const Icon=block.icon;const finished=!!completed[i];const active=i===focusIndex;
          return <article className={`forge-v2-mission ${finished?"completed":""} ${active?"active":""}`} key={block.time} style={{"--forge-index":i}}>
            <div className="forge-v2-time">{block.time}</div>
            <div className="forge-v2-node"><Icon size={18}/></div>
            <div className="forge-v2-mission-text"><div className="forge-v2-mission-title"><h3>{block.title}</h3><span>{block.lane}</span></div><p>{block.detail}</p></div>
            <div className="forge-v2-mission-controls">
              {block.route?<Link to={block.route} className="forge-v2-open" title={block.action} aria-label={"Open "+block.action+" for "+block.title}><ArrowRight size={18}/></Link>:<button type="button" onClick={openRoutineAction(block)} className="forge-v2-open" title={block.action} aria-label={block.action+" for "+block.title}><ArrowRight size={18}/></button>}
              <button type="button" className="forge-v2-check" aria-pressed={finished} onClick={()=>setCompleted(p=>({...p,[i]:!p[i]}))} aria-label={finished?"Mark "+block.title+" incomplete":"Complete "+block.title}><Check size={16}/></button>
            </div>
          </article>;
        })}</div>
        <section className="forge-v2-shortcuts"><div className="forge-v2-section-heading"><div><p className="forge-v2-overline">ONE ECOSYSTEM</p><h2>Connected workspaces</h2></div></div><div className="forge-v2-shortcut-grid">{shortcuts.map(({label,path,icon:Icon})=><Link to={path} key={path} className="forge-v2-shortcut"><Icon size={19}/><span>{label}</span><ArrowRight size={15}/></Link>)}</div><p className="forge-v2-smallnote">These links open existing SyncWorks tools; Forge does not yet sync their data or schedules.</p></section>
      </div>}
      {tab==="vision"&&<section className="forge-v2-appear"><div className="forge-v2-section-heading"><div><p className="forge-v2-overline">THE PERSON YOU'RE BECOMING</p><h2>Vision into action</h2><p className="forge-v2-subtitle">The lifestyle is the vision. Today's actions are the proof.</p></div></div><div className="forge-v2-vision-grid">{visions.map(({icon:Icon,title,anchor,body,action,route,link})=><article key={title} className="forge-v2-vision-card"><Icon size={28}/><p className="forge-v2-overline">{anchor}</p><h3>{title}</h3><p>{body}</p><div className="forge-v2-proof"><strong>ONE ACTION TODAY</strong><span>{action}</span></div>{route?<Link to={route} className="forge-v2-textlink">{link}<ArrowRight size={15}/></Link>:<button type="button" onClick={()=>setTab("coach")} className="forge-v2-textlink">{link}<ArrowRight size={15}/></button>}</article>)}</div></section>}
      {tab==="coach"&&<section className="forge-v2-appear forge-v2-coach-layout"><div className="forge-v2-coach-orb"><span className={speaking?"forge-v2-orb speaking":"forge-v2-orb"}><Headphones size={52}/></span><p className="forge-v2-overline">YOUR PERFORMANCE COACH</p><h2>Listen. Reflect. Act.</h2><p>Short audio lessons you can play while getting ready, walking or winding down.</p><span className="forge-v2-smallnote">Browser speech prototype — not a live conversational AI.</span></div><div className="forge-v2-coach-panel"><p className="forge-v2-overline">CHOOSE YOUR SESSION</p><div className="forge-v2-lessons">{lessons.map((l,i)=><button className={coach===i?"selected":""} type="button" key={l.title} onClick={()=>{stopSpeech();setCoach(i);}}><span><strong>{l.title}</strong><small>{l.author}</small></span><ChevronRight size={16}/></button>)}</div><blockquote>{lessons[coach].script}</blockquote><div className="forge-v2-actions"><button type="button" className="forge-v2-primary" onClick={()=>speaking?stopSpeech():say(lessons[coach].script)}>{speaking?<Pause size={17}/>:<Play size={17}/>} {speaking?"Stop session":"Listen to session"}</button><button type="button" className="forge-v2-secondary" onClick={stopSpeech}><Square size={15}/> Stop audio</button></div></div></section>}
      {tab==="review"&&<section className="forge-v2-appear forge-v2-review"><div className="forge-v2-section-heading"><div><p className="forge-v2-overline">RECOVERY IS PART OF PROGRESS</p><h2>Close the day well</h2></div></div><div className="forge-v2-two-col"><article className="forge-v2-intent"><div className="forge-v2-eyebrow"><Moon size={16}/> WIND-DOWN</div><label htmlFor="forge-bed-v2">Target bedtime</label><input id="forge-bed-v2" type="time" value={bedtime} onChange={e=>setBedtime(e.target.value)}/><p>For a 4 AM wake-up, 8:00–8:30 PM is a reasonable sleep target. Move the wake-up time when family obligations require it.</p><Link to="/customer/health" className="forge-v2-textlink">Sleep & recovery <ArrowRight size={16}/></Link></article><article className="forge-v2-intent"><div className="forge-v2-eyebrow"><Check size={16}/> TODAY'S REVIEW</div><h2>{done} of {routine.length} victories</h2><div className="forge-v2-meter"><span style={{width:progress+"%"}}/></div><p>Progress is not perfection. Look at what mattered, what you learned and what should change tomorrow.</p><button type="button" className="forge-v2-secondary" onClick={()=>setTab("today")}><RotateCcw size={15}/> Return to timeline</button></article></div></section>}
      <footer className="forge-v2-footer"><WandSparkles size={15}/> Private pilot · Personal performance, separate from Chief of Staff · Check-ins are saved only in this browser · No automated reminders or AI scheduling yet</footer>
    </div>
  </main>;
}
