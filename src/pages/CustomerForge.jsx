import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, BookOpen, Brain, CalendarClock, Check, ChevronRight,
  CirclePause, CirclePlay, Dumbbell, ExternalLink, Flame, Heart,
  Headphones, Moon, Pause, Play, RotateCcw, ShieldCheck, Sparkles,
  Square, Sun, Target, Volume2, Wind
} from "lucide-react";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { forgeChapters } from "./forgeChapters";
import "./CustomerForgeV3.css";

const OWNER = "jacoblord7@outlook.com";
const pad = v => String(v).padStart(2, "0");
const dateId = date => `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
const schedule = [
  {time:"04:00",title:"Wake & prime",category:"Ritual",action:"breathe",detail:"Hydrate, brush teeth, face rinse, intention"},
  {time:"04:15",title:"Move & listen",category:"Body",action:"listen",detail:"Mobility, cardio and a daily chapter"},
  {time:"05:15",title:"Breakfast & learn",category:"Mind",action:"read",detail:"Cook a healthy breakfast, learn one idea"},
  {time:"06:15",title:"Market prep",category:"Wealth",href:"/customer/day-trading-futures",detail:"Economic calendar, setups and risk"},
  {time:"07:15",title:"Trading window",category:"Wealth",href:"/customer/day-trading-futures",detail:"Follow your plan; review your decisions"},
  {time:"09:00",title:"Train your craft",category:"Body",href:"/customer/health",detail:"Lifting, athletic practice or recovery"},
  {time:"10:30",title:"Groom & dress",category:"Identity",action:"reflect",detail:"Shower, shave, skincare, wardrobe"},
  {time:"11:00",title:"Family & lunch",category:"Family",href:"/customer/family",detail:"Cook, play and be present"},
  {time:"13:00",title:"Build SyncWorks",category:"Work",href:"/customer/tasks",detail:"One product or customer deliverable"},
  {time:"15:30",title:"Income sprint",category:"Work",href:"/customer/freelance/overview",detail:"Upwork, leads and paid work"},
  {time:"17:00",title:"Family evening",category:"Family",href:"/calendar",detail:"Dinner, playtime and bedtime routine"},
  {time:"19:30",title:"Reflect & rest",category:"Recovery",action:"reflect",detail:"Review, meditate and prepare for sleep"}
];
const modes=[
  {id:"read",title:"Read",icon:BookOpen},
  {id:"listen",title:"Listen",icon:Headphones},
  {id:"breathe",title:"Breathe",icon:Wind},
  {id:"watch",title:"Watch",icon:Play},
  {id:"reflect",title:"Reflect",icon:Brain}
];
const videos=[
  {id:"j7rKKpwdXNE",title:"Beginner yoga",by:"Yoga With Adriene",note:"10-minute guided practice"},
  {id:"R0__e0QTtQw",title:"Nervous system reset",by:"Yoga With Adriene",note:"Gentle movement and reset"}
];
const keyFor = email => `syncworks-forge-v1:${email}:${dateId(new Date())}`;
function readSaved(key) {try {return JSON.parse(localStorage.getItem(key) || "{}");}catch {return {};}}
function splitAudio(text, max=700){
  const sentences=String(text).match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[];
  const pieces=[];let current="";
  for(const sentence of sentences){
    if((current+" "+sentence).length>max && current){pieces.push(current.trim());current="";}
    if(sentence.length>max){for(let i=0;i<sentence.length;i+=max)pieces.push(sentence.slice(i,i+max));}
    else current+=" "+sentence;
  }
  if(current.trim())pieces.push(current.trim());
  return pieces;
}
const formatTime = mins => `${pad(Math.floor(mins/60))}:${pad(mins%60)}`;
const reflectionKey = email => `syncworks-forge-reflect:${email}:${dateId(new Date())}`;

export default function CustomerForge(){
  const {user}=useAuth();
  const email=String(user?.email||"").trim().toLowerCase();
  const permitted=email===OWNER;
  const [now,setNow]=useState(()=>new Date());
  const [mode,setMode]=useState("read");
  const [chapterId,setChapterId]=useState(forgeChapters[0].id);
  const [done,setDone]=useState({});
  const [intent,setIntent]=useState("");
  const [loadedKey,setLoadedKey]=useState("");
  const [journal,setJournal]=useState("");
  const [audioState,setAudioState]=useState("idle");
  const [audioStatus,setAudioStatus]=useState("");
  const [voiceType,setVoiceType]=useState("natural");
  const [breathing,setBreathing]=useState(false);
  const [breathSeconds,setBreathSeconds]=useState(0);
  const [video,setVideo]=useState("");
  const audioEl=useRef(null),audioUrl=useRef(""),abortRef=useRef(null),playId=useRef(0);
  const synthParts=useRef([]),synthIndex=useRef(0);
  const key=keyFor(email);
  const chapter=forgeChapters.find(c=>c.id===chapterId)||forgeChapters[0];
  const todayChapter=forgeChapters[Math.floor(new Date(dateId(now)+"T12:00:00").getTime()/86400000)%forgeChapters.length];
  const completed=schedule.filter((_,i)=>done[i]).length;
  const currentMin=now.getHours()*60+now.getMinutes();
  const scheduledIndex=schedule.reduce((n,x,i)=>currentMin>=Number(x.time.slice(0,2))*60+Number(x.time.slice(3))?i:n,-1);
  const focusIndex=scheduledIndex>=0&&!done[scheduledIndex]?scheduledIndex:schedule.findIndex((_,i)=>i>scheduledIndex&&!done[i]);
  const active=focusIndex>=0?schedule[focusIndex]:null;
  const breathCycle=breathSeconds%10, inhale=breathCycle<4;
  const remaining=Math.max(0,300-breathSeconds);
  const script=`${chapter.title}. ${chapter.lens}. ${chapter.paragraphs.join(" ")} Takeaway. ${chapter.takeaway} Today's challenge. ${chapter.challenge}`;

  useEffect(()=>{
    const timer=window.setInterval(()=>setNow(new Date()),1000);
    return ()=>window.clearInterval(timer);
  },[]);
  useEffect(()=>{
    if(!permitted)return;
    const saved=readSaved(key);setDone(saved.completed||{});setIntent(saved.intent||"");setLoadedKey(key);
    try{setJournal(localStorage.getItem(reflectionKey(email))||"");}catch{setJournal("");}
  },[permitted,email,key]);
  useEffect(()=>{
    if(!permitted||loadedKey!==key)return;
    try{localStorage.setItem(key,JSON.stringify({completed:done,intent}));}catch{/* local pilot only */}
  },[permitted,loadedKey,key,done,intent]);
  useEffect(()=>{if(!permitted||loadedKey!==key)return;try{localStorage.setItem(reflectionKey(email),journal);}catch{/* optional */}},[permitted,loadedKey,key,email,journal]);
  useEffect(()=>{
    if(!breathing)return;
    const timer=window.setInterval(()=>setBreathSeconds(x=>{if(x>=299){setBreathing(false);return 300;}return x+1;}),1000);
    return ()=>window.clearInterval(timer);
  },[breathing]);
  function stopAudio(){
    playId.current+=1;
    if(abortRef.current){abortRef.current.abort();abortRef.current=null;}
    if(audioEl.current){audioEl.current.pause();audioEl.current.removeAttribute("src");audioEl.current=null;}
    if(audioUrl.current){URL.revokeObjectURL(audioUrl.current);audioUrl.current="";}
    if("speechSynthesis" in window)window.speechSynthesis.cancel();
    setAudioState("idle");setAudioStatus("");
  }
  useEffect(()=>()=>{playId.current+=1;if(abortRef.current)abortRef.current.abort();if(audioEl.current)audioEl.current.pause();if(audioUrl.current)URL.revokeObjectURL(audioUrl.current);window.speechSynthesis?.cancel();},[]);
  function browserNarrate(text,token){
    if(!("speechSynthesis" in window)) {setAudioStatus("Speech isn't supported on this device.");setAudioState("idle");return;}
    synthParts.current=splitAudio(text,240);synthIndex.current=0;
    function next(){
      if(token!==playId.current)return;
      if(synthIndex.current>=synthParts.current.length){setAudioState("idle");setAudioStatus("Chapter finished.");return;}
      const utterance=new SpeechSynthesisUtterance(synthParts.current[synthIndex.current++]);
      utterance.rate=.92;utterance.pitch=.95;utterance.onend=next;
      utterance.onerror=()=>{if(token===playId.current){setAudioState("idle");setAudioStatus("Device speech ended.");}};
      window.speechSynthesis.speak(utterance);
    }
    setAudioState("playing");next();
  }
  async function naturalNarrate(text,token){
    const parts=splitAudio(text,690);
    setAudioStatus("Preparing natural narration...");
    for(let i=0;i<parts.length;i++){
      if(token!==playId.current)return;
      const controller=new AbortController();abortRef.current=controller;
      const response=await api.post("/customer-health/forge/voice/speak/",{text:parts[i],energy:"calm"},{responseType:"blob",signal:controller.signal,timeout:30000});
      if(token!==playId.current)return;
      const url=URL.createObjectURL(response.data);audioUrl.current=url;
      const player=new Audio(url);audioEl.current=player;
      await new Promise((resolve,reject)=>{
        player.onended=resolve;player.onerror=()=>reject(new Error("Audio playback failed"));
        player.play().then(()=>{if(token===playId.current){setAudioState("playing");setAudioStatus(`Natural voice · part ${i+1} of ${parts.length}`);}}).catch(reject);
      });
      if(audioUrl.current){URL.revokeObjectURL(audioUrl.current);audioUrl.current="";}
    }
    if(token===playId.current){setAudioState("idle");setAudioStatus("Chapter finished.");}
  }
  async function startAudio(text=script){
    stopAudio();const token=playId.current;
    if(voiceType==="device"){setAudioStatus("Device voice narration");browserNarrate(text,token);return;}
    setAudioState("loading");
    try {await naturalNarrate(text,token);}
    catch(e){
      if(token!==playId.current)return;
      setAudioStatus("Natural voice unavailable; using device narration.");
      browserNarrate(text,token);
    }
  }
  function toggleAudio(){
    if(audioState==="paused"){
      if(audioEl.current)audioEl.current.play();
      else window.speechSynthesis?.resume();
      setAudioState("playing");return;
    }
    if(audioState==="playing"){
      if(audioEl.current)audioEl.current.pause();
      else window.speechSynthesis?.pause();
      setAudioState("paused");return;
    }
    startAudio();
  }
  function setActiveMode(next){if(next!==mode)stopAudio();setMode(next);}
  function startRoutine(item){if(item.action)setActiveMode(item.action);}
  if(!permitted)return <main className="min-h-screen bg-slate-950 px-6 pt-28 text-white"><h1 className="text-xl">Private pilot</h1><Link to="/customer">Return to office</Link></main>;
  return <main className="forge3">
    <div className="forge3-glow" aria-hidden="true"/>
    <header className="forge3-header">
      <div className="forge3-identity"><Link to="/customer" className="forge3-back" aria-label="Back to my office"><ArrowLeft size={18}/></Link><div className="forge3-mark"><Flame size={23}/></div><div><span>SYNCWORKS / PRIVATE STUDIO</span><h1>THE <em>FORGE</em></h1></div></div>
      <div className="forge3-header-actions"><div className="forge3-header-clock"><strong>{pad(now.getHours())}:{pad(now.getMinutes())}</strong><small>{now.toLocaleDateString(undefined,{month:"short",day:"numeric",weekday:"short"})}</small></div><span className="forge3-pill"><ShieldCheck size={13}/> Personal pilot</span></div>
    </header>
    <div className="forge3-main">
      <section className="forge3-workspace">
        <nav className="forge3-modes" aria-label="Forge experiences">{modes.map(({id,title,icon:Icon})=><button key={id} type="button" className={mode===id?"selected":""} aria-pressed={mode===id} onClick={()=>setActiveMode(id)}><Icon size={18}/><span>{title}</span></button>)}</nav>
        <div className="forge3-stage">
          {(mode==="read"||mode==="listen")&&<>
            <div className="forge3-stage-intro"><div><span className="forge3-overline">{mode==="listen"?"THE DAILY AUDIOBOOK":"TODAY'S READING"} · ORIGINAL FORGE LESSON</span><h2>{chapter.title}</h2><p>{chapter.lens} · {chapter.length}</p></div><span className="forge3-book-icon"><BookOpen size={33}/></span></div>
            <div className="forge3-chapter-select"><label htmlFor="forge3-lesson">Chapter</label><select id="forge3-lesson" value={chapterId} onChange={e=>{stopAudio();setChapterId(e.target.value);}}>{forgeChapters.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select><button type="button" onClick={()=>{stopAudio();setChapterId(todayChapter.id);}} className="forge3-softbtn">Today's pick</button></div>
            {mode==="read"?<div className="forge3-reader" tabIndex={0} aria-label="Chapter reading"><p className="forge3-dropcap">{chapter.paragraphs[0]}</p>{chapter.paragraphs.slice(1).map((p,i)=><p key={i}>{p}</p>)}<div className="forge3-chapter-end"><strong>APPLY IT TODAY</strong><p>{chapter.challenge}</p><button type="button" onClick={()=>setActiveMode("reflect")}>Reflect on this chapter <ChevronRight size={16}/></button></div></div>:<div className="forge3-listen-room"><div className={audioState==="playing"?"forge3-orb speaking":"forge3-orb"}><Headphones size={52}/></div><p>{chapter.description}</p><blockquote>{chapter.paragraphs[0]}</blockquote><div className="forge3-listen-note">The full chapter is narrated, not just this excerpt.</div></div>}
            <div className="forge3-player"><div className="forge3-play-buttons"><button className="forge3-mainbtn" type="button" onClick={toggleAudio} disabled={audioState==="loading"}>{audioState==="playing"?<Pause size={18}/>:<Play size={18}/>} {audioState==="loading"?"Preparing...":audioState==="paused"?"Resume":audioState==="playing"?"Pause":"Listen to chapter"}</button><button className="forge3-iconbtn" type="button" onClick={stopAudio} title="Stop narration" aria-label="Stop narration"><Square size={17}/></button></div><label>Voice <select value={voiceType} onChange={e=>{stopAudio();setVoiceType(e.target.value);}}><option value="natural">Natural AI voice</option><option value="device">Device voice</option></select></label><span className="forge3-audio-status" role="status">{audioStatus||"Headphone-ready listening"}</span></div>
          </>}
          {mode==="breathe"&&<><div className="forge3-stage-intro"><div><span className="forge3-overline">GUIDED MEDITATION</span><h2>Return to the present</h2><p>Five minutes · Gentle 4-in / 6-out rhythm</p></div><Wind size={35}/></div><div className="forge3-breathe-center"><div className={breathing?"forge3-breathe-orb running":"forge3-breathe-orb"} data-inhale={inhale}><span>{inhale?"BREATHE IN":"BREATHE OUT"}</span><strong>{inhale?4-breathSeconds%10:10-breathSeconds%10}</strong><small>{formatTime(Math.floor((300-breathSeconds)/60)*60+(300-breathSeconds)%60)} remaining</small></div><p>Relax your shoulders. Breathe comfortably. No breath holding is required.</p></div><div className="forge3-player"><button className="forge3-mainbtn" type="button" onClick={()=>setBreathing(v=>!v)} disabled={breathSeconds>=300}>{breathing?<Pause size={18}/>:<Play size={18}/>} {breathing?"Pause":"Start breathing"}</button><button className="forge3-iconbtn" type="button" onClick={()=>{setBreathing(false);setBreathSeconds(0);}}><RotateCcw size={17}/></button><button className="forge3-softbtn" onClick={()=>startAudio("Settle into a comfortable posture. Relax your face and shoulders. Breathe gently in through the nose for four counts, and breathe out slowly for six counts. Follow the moving circle. If you feel lightheaded, return to your natural breath. You do not need to force anything.")} type="button"><Volume2 size={16}/> Guided introduction</button><button className="forge3-iconbtn" onClick={stopAudio} type="button" title="Stop voice"><Square size={16}/></button></div></>}
          {mode==="watch"&&<><div className="forge3-stage-intro"><div><span className="forge3-overline">GUIDED VIDEO LIBRARY</span><h2>Learn by watching</h2><p>Yoga and movement without leaving The Forge.</p></div><Play size={35}/></div><div className="forge3-video-options">{videos.map(v=><button key={v.id} className={video===v.id?"selected":""} type="button" onClick={()=>{stopAudio();setVideo(v.id);}}><strong>{v.title}</strong><small>{v.by} · {v.note}</small></button>)}</div><div className="forge3-video-stage">{video?<iframe key={video} src={`https://www.youtube-nocookie.com/embed/${video}?rel=0`} title={videos.find(x=>x.id===video)?.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin"/>:<div className="forge3-video-empty"><Play size={38}/><span>Choose a practice above to open the player.</span></div>}</div>{video&&<a href={`https://www.youtube.com/watch?v=${video}`} target="_blank" rel="noopener noreferrer" className="forge3-youtube-link">If the video cannot be embedded, open on YouTube <ExternalLink size={15}/></a>}</>}
          {mode==="reflect"&&<><div className="forge3-stage-intro"><div><span className="forge3-overline">THE EXAMINED LIFE</span><h2>Turn wisdom into action</h2><p>Journal privately and carry today's lesson forward.</p></div><Brain size={35}/></div><div className="forge3-reflect"><div className="forge3-reflect-prompt"><span>QUESTION OF THE DAY</span><h3>{chapter.question}</h3><p><strong>Today's challenge:</strong> {chapter.challenge}</p></div><label htmlFor="forge3-reflection">Your thoughts</label><textarea id="forge3-reflection" value={journal} onChange={e=>setJournal(e.target.value)} placeholder="What did I learn? How can I apply it today? What should I practice tomorrow?"/><p>Saved in this browser for today's private reflection. Backend sync is not yet available.</p><div className="forge3-quicklinks"><Link to="/customer/health"><Dumbbell size={16}/> Training</Link><Link to="/calendar"><CalendarClock size={16}/> Calendar</Link><Link to="/customer/tasks"><Target size={16}/> Tasks</Link></div></div></>}
        </div>
      </section>
      <aside className="forge3-sidebar" aria-label="Your daily plan"><div className="forge3-side-head"><span className="forge3-overline">YOUR DAY AT A GLANCE</span><h2>Mission control</h2><p>{completed} / {schedule.length} completed</p><div className="forge3-progress"><span style={{width:completed/schedule.length*100+"%"}}/></div></div>
        <div className="forge3-current"><span className="forge3-overline"><span className="forge3-status-dot"/> {active?"YOUR NEXT STEP":"DAY COMPLETE"}</span><h3>{active?.title||"All missions reviewed"}</h3><p>{active?.detail||"Rest, reflect, and prepare for tomorrow."}</p>{active&&(active.href?<Link to={active.href}>Open activity <ArrowRight size={15}/></Link>:<button onClick={()=>startRoutine(active)} type="button">Start activity <ArrowRight size={15}/></button>)}</div>
        <div className="forge3-side-list" tabIndex={0} aria-label="Today's planned activities">{schedule.map((item,i)=><div className={`forge3-side-item ${done[i]?"done":""} ${focusIndex===i?"active":""}`} key={item.time}><span className="forge3-item-time">{item.time}</span><div><strong>{item.title}</strong><small>{item.category}</small></div>{item.action?<button aria-label={"Open "+item.title} onClick={()=>startRoutine(item)} type="button"><ChevronRight size={15}/></button>:<Link aria-label={"Open "+item.title} to={item.href}><ChevronRight size={15}/></Link>}<button className="forge3-item-check" type="button" aria-label={done[i]?"Mark incomplete":"Mark complete"} aria-pressed={!!done[i]} onClick={()=>setDone(p=>({...p,[i]:!p[i]}))}><Check size={14}/></button></div>)}</div>
        <div className="forge3-side-bottom"><label htmlFor="forge3-intent">TODAY'S MAIN PRIORITY</label><input id="forge3-intent" placeholder="Your one important outcome..." value={intent} onChange={e=>setIntent(e.target.value)}/><Link to="/calendar">Open SyncWorks calendar <ChevronRight size={15}/></Link></div>
      </aside>
    </div>
    <footer className="forge3-footer"><span><Sparkles size={14}/> Build your life, one intentional action at a time.</span><span>Private pilot · Forge coach is separate from Chief of Staff · Chapters are original · Audio uses AI narration when available</span></footer>
  </main>;
}
