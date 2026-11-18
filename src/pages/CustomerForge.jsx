import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
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
import { forgeGreatBookStudies } from "./forgeGreatBookStudies";
import ForgeBookLibrary from "./ForgeBookLibrary";
import ForgeGrowthCoach from "./ForgeGrowthCoach";
import "./CustomerForgeV3.css";

const OWNER = "jacoblord7@outlook.com";
const pad = v => String(v).padStart(2, "0");
const dateId = date => `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
const defaultSchedule = [
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
const routineKey = email => `syncworks-forge-routine:${email}`;
function safeRoutine(email){
  try {
    const stored = JSON.parse(localStorage.getItem(routineKey(email)) || "null");
    if (!Array.isArray(stored) || stored.length !== defaultSchedule.length) return defaultSchedule;
    return defaultSchedule.map((item,i)=>({
      ...item,
      title: typeof stored[i]?.title === "string" && stored[i].title.trim() ? stored[i].title.trim().slice(0,65) : item.title,
      time: /^([01]\\d|2[0-3]):[0-5]\\d$/.test(stored[i]?.time || "") ? stored[i].time : item.time,
      detail: typeof stored[i]?.detail === "string" && stored[i].detail.trim() ? stored[i].detail.trim().slice(0,160) : item.detail,
    }));
  } catch { return defaultSchedule; }
}

export default function CustomerForge(){
  const {user}=useAuth();
  const email=String(user?.email||"").trim().toLowerCase();
  const permitted=email===OWNER;
  const [now,setNow]=useState(()=>new Date());
  const [mode,setMode]=useState("read");
  const [readingOpen,setReadingOpen]=useState(false);
  const [libraryOpen,setLibraryOpen]=useState(false);
  const [missionsOpen,setMissionsOpen]=useState(false);
  const [audioSettingsOpen,setAudioSettingsOpen]=useState(false);
  const [growthOpen,setGrowthOpen]=useState(false);
  const [chapterId,setChapterId]=useState(()=>forgeChapters[Math.floor(new Date(dateId(new Date())+"T12:00:00").getTime()/86400000)%forgeChapters.length].id);
  const [done,setDone]=useState({});
  const [schedule,setSchedule]=useState(defaultSchedule);
  const [routineReady,setRoutineReady]=useState(false);
  const [editingRoutine,setEditingRoutine]=useState(false);
  const [intent,setIntent]=useState("");
  const [loadedKey,setLoadedKey]=useState("");
  const [journal,setJournal]=useState("");
  const [audioState,setAudioState]=useState("idle");
  const [audioStatus,setAudioStatus]=useState("");
  const [voiceType,setVoiceType]=useState("natural");
  const [forgeVoice,setForgeVoice]=useState(()=>{try{return localStorage.getItem("sw-forge-narrator")||"tucker";}catch{return "tucker";}});
  const [audioError,setAudioError]=useState("");
  const [breathing,setBreathing]=useState(false);
  const [breathSeconds,setBreathSeconds]=useState(0);
  const [video,setVideo]=useState("");
  const audioEl=useRef(null),audioUrl=useRef(""),abortRef=useRef(null),playId=useRef(0);
  const forgeShellRef=useRef(null);
  const synthParts=useRef([]),synthIndex=useRef(0);
  const key=keyFor(email);
  const chapters=[...forgeGreatBookStudies,...forgeChapters];
  const chapter=chapters.find(c=>c.id===chapterId)||forgeChapters[0];
  const todayChapter=forgeChapters[Math.floor(new Date(dateId(now)+"T12:00:00").getTime()/86400000)%forgeChapters.length];
  const ordered=schedule.map((item,id)=>({...item,id})).sort((a,b)=>a.time.localeCompare(b.time) || a.id-b.id);
  const completed=ordered.filter(item=>done[item.id]).length;
  const currentMin=now.getHours()*60+now.getMinutes();
  const scheduledIndex=ordered.reduce((n,x,i)=>currentMin>=Number(x.time.slice(0,2))*60+Number(x.time.slice(3))?i:n,-1);
  const focusIndex=scheduledIndex>=0&&!done[ordered[scheduledIndex].id]?scheduledIndex:ordered.findIndex((item,i)=>i>scheduledIndex&&!done[item.id]);
  const active=focusIndex>=0?ordered[focusIndex]:null;
  const breathCycle=breathSeconds%10, inhale=breathCycle<4;
  const remaining=Math.max(0,300-breathSeconds);
  const script=`${chapter.title}. ${chapter.lens}. ${chapter.paragraphs.join(" ")} Takeaway. ${chapter.takeaway} Today's challenge. ${chapter.challenge}`;

  // The global navigation bar is fixed, while other route wrappers can add
  // height. Measure from Forge's actual top edge to the visible viewport bottom.
  // Only explicit chapter and agenda panels may scroll within this shell.
  useLayoutEffect(()=>{
    const shell=forgeShellRef.current;
    if(!shell)return undefined;
    const oldBodyOverflow=document.body.style.overflow;
    const oldHtmlOverflow=document.documentElement.style.overflow;
    document.body.style.overflow="hidden";
    document.documentElement.style.overflow="hidden";
    const fit=()=>{
      if(!shell)return;
      const top=shell.getBoundingClientRect().top;
      const visibleBottom=window.visualViewport
        ? window.visualViewport.offsetTop+window.visualViewport.height
        : window.innerHeight;
      const available=Math.max(0,Math.floor(visibleBottom-top));
      shell.style.setProperty("--forge-viewport-height",available+"px");
    };
    fit();
    window.addEventListener("resize",fit);
    window.visualViewport?.addEventListener("resize",fit);
    window.visualViewport?.addEventListener("scroll",fit);
    return ()=>{
      window.removeEventListener("resize",fit);
      window.visualViewport?.removeEventListener("resize",fit);
      window.visualViewport?.removeEventListener("scroll",fit);
      shell.style.removeProperty("--forge-viewport-height");
      document.body.style.overflow=oldBodyOverflow;
      document.documentElement.style.overflow=oldHtmlOverflow;
    };
  },[]);
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
    if(!permitted)return;
    setRoutineReady(false);
    setSchedule(safeRoutine(email));
    setRoutineReady(true);
  },[permitted,email]);
  useEffect(()=>{
    if(!permitted || !routineReady)return;
    try{localStorage.setItem(routineKey(email),JSON.stringify(schedule));}catch{/* optional local pilot routine */}
  },[permitted,routineReady,email,schedule]);
  function updateRoutine(id,field,value){setSchedule(items=>items.map((item,i)=>i===id?{...item,[field]:value}:item));}
  function restoreRoutine(){setSchedule(defaultSchedule.map(x=>({...x})));}
  useEffect(()=>{
    if(!breathing)return;
    const timer=window.setInterval(()=>setBreathSeconds(x=>{if(x>=299){setBreathing(false);return 300;}return x+1;}),1000);
    return ()=>window.clearInterval(timer);
  },[breathing]);
  function stopAudio(){
    playId.current+=1;
    setAudioError("");
    if(abortRef.current){abortRef.current.abort();abortRef.current=null;}
    if(audioEl.current){audioEl.current.pause();audioEl.current.onended=null;audioEl.current.onerror=null;audioEl.current.removeAttribute("src");audioEl.current=null;}
    if(audioUrl.current){URL.revokeObjectURL(audioUrl.current);audioUrl.current="";}
    if("speechSynthesis" in window)window.speechSynthesis.cancel();
    if("mediaSession" in navigator){navigator.mediaSession.playbackState="none";}
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
  function setupCarMediaSession(){
    if(!("mediaSession" in navigator))return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({title:chapter.title, artist:"The Forge · SyncWorks", album:"Personal Performance Library"});
      navigator.mediaSession.setActionHandler("play",()=>{if(audioEl.current){audioEl.current.play().then(()=>setAudioState("playing")).catch(()=>setAudioStatus("Tap Play to resume"));}});
      navigator.mediaSession.setActionHandler("pause",()=>{audioEl.current?.pause();setAudioState("paused");});
      navigator.mediaSession.setActionHandler("stop",()=>stopAudio());
      navigator.mediaSession.playbackState="playing";
    } catch { /* unsupported headset, OS, or media session action */ }
  }
  async function naturalNarrate(text,token){
    const parts=splitAudio(text,840);
    setAudioStatus("Preparing natural narration...");
    for(let i=0;i<parts.length;i++){
      if(token!==playId.current)return;
      const controller=new AbortController();abortRef.current=controller;
      const response=await api.post("/customer-health/forge/voice/speak/",{text:parts[i],energy:"calm",voice_key:forgeVoice},{responseType:"blob",signal:controller.signal,timeout:30000});
      if(token!==playId.current)return;
      const url=URL.createObjectURL(response.data);audioUrl.current=url;
      const player=new Audio(url);audioEl.current=player;
      player.preload="auto";
      await new Promise((resolve,reject)=>{
        player.onended=resolve;player.onerror=()=>reject(new Error("Audio playback failed"));
        player.play().then(()=>{if(token===playId.current){setupCarMediaSession();setAudioState("playing");setAudioStatus(`Natural voice · part ${i+1} of ${parts.length}`);}}).catch(reject);
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
      setAudioState("idle");
      setAudioError("Natural narration was unavailable. Device speech may not connect reliably to Bluetooth or vehicle audio.");
      setAudioStatus("Choose Device voice to listen through this browser.");
    }
  }
  function selectForgeNarrator(value){
    stopAudio();setForgeVoice(value);
    try{localStorage.setItem("sw-forge-narrator",value);}catch{/* optional */}
  }
  function previewForgeNarrator(){
    const line="Welcome to The Forge. Discipline is not punishment. It is the quiet practice of keeping promises to yourself. Breathe. Consider what is within your control. Then take the next good step.";
    startAudio(line);
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
  useEffect(()=>{
    if(!readingOpen)return undefined;
    const onKey=e=>{if(e.key==="Escape")setReadingOpen(false);};
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  },[readingOpen]);
  function startRoutine(item){if(item.action){setActiveMode(item.action);setMissionsOpen(false);}}
  if(!permitted)return <main className="min-h-screen bg-slate-950 px-6 pt-28 text-white"><h1 className="text-xl">Private pilot</h1><Link to="/customer">Return to office</Link></main>;
  return <main className="forge3" ref={forgeShellRef}>
    <div className="forge3-glow" aria-hidden="true"/>
    <header className="forge3-header">
      <div className="forge3-identity"><Link to="/customer" className="forge3-back" aria-label="Back to my office"><ArrowLeft size={18}/></Link><div className="forge3-mark"><Flame size={23}/></div><div><span>SYNCWORKS / PRIVATE STUDIO</span><h1>THE <em>FORGE</em></h1></div></div>
      <div className="forge3-header-actions"><div className="forge3-header-clock"><strong>{pad(now.getHours())}:{pad(now.getMinutes())}</strong><small>{now.toLocaleDateString(undefined,{month:"short",day:"numeric",weekday:"short"})}</small></div><span className="forge3-pill"><ShieldCheck size={13}/> Personal pilot</span></div>
    </header>
    <div className="forge3-mobile-utilities"><span className="forge3-mobile-subtitle">MIND · BODY · PURPOSE</span><button type="button" className="forge3-mobile-missions-trigger" onClick={()=>setMissionsOpen(true)} aria-label="Open mission control"><CalendarClock size={15}/> Missions <strong>{completed}/{schedule.length}</strong><ChevronRight size={14}/></button></div>
    <div className="forge3-main">
      <section className="forge3-workspace">
        <nav className="forge3-modes" aria-label="Forge experiences">{modes.map(({id,title,icon:Icon})=><button key={id} type="button" className={mode===id?"selected":""} aria-pressed={mode===id} onClick={()=>setActiveMode(id)}><Icon size={18}/><span>{title}</span></button>)}</nav>
        <div className="forge3-stage">
          {(mode==="read"||mode==="listen")&&<>
            <div className="forge3-stage-intro"><div><span className="forge3-overline">{mode==="listen"?"THE DAILY AUDIOBOOK":"TODAY'S READING"} · ORIGINAL FORGE LESSON</span><h2>{chapter.title}</h2><p>{chapter.lens} · {chapter.length}</p></div><span className="forge3-book-icon"><BookOpen size={33}/></span></div>
            <div className="forge3-chapter-select"><label htmlFor="forge3-lesson">Chapter</label><select id="forge3-lesson" value={chapterId} onChange={e=>{stopAudio();setChapterId(e.target.value);}}>{chapters.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select><button type="button" onClick={()=>{stopAudio();setChapterId(todayChapter.id);}} className="forge3-softbtn">Today's pick</button><button type="button" className="forge3-softbtn" onClick={()=>setLibraryOpen(true)}><BookOpen size={15}/> Library · 100 titles</button></div>
            {mode==="read"?<div className="forge3-reading-home">
              <div className="forge3-reading-symbol" aria-hidden="true"><BookOpen size={52}/></div>
              <span className="forge3-overline">TODAY'S CHAPTER · PERSONAL DEVELOPMENT</span>
              <h3>{chapter.description}</h3>
              <p>{chapter.paragraphs[0].slice(0,260)}...</p>
              <div className="forge3-reading-home-actions">
                <button type="button" className="forge3-mainbtn" onClick={()=>setReadingOpen(true)}><BookOpen size={17}/> Open today's reading <ArrowRight size={16}/></button>
                <button type="button" className="forge3-softbtn" onClick={()=>setActiveMode("listen")}><Headphones size={17}/> Audio experience</button><button type="button" className="forge3-softbtn" onClick={()=>setGrowthOpen(true)}><Brain size={17}/> Ask Forge</button>
              </div>
              <div className="forge3-reading-takeaway"><strong>YOUR CHALLENGE</strong><p>{chapter.challenge}</p></div>
            </div>:<div className="forge3-listen-room"><div className={audioState==="playing"?"forge3-orb speaking":"forge3-orb"}><Headphones size={52}/></div><p>{chapter.description}</p><blockquote>{chapter.paragraphs[0]}</blockquote><div className="forge3-listen-note">The full chapter is narrated, not just this excerpt.</div><button type="button" className="forge3-softbtn" onClick={()=>setGrowthOpen(true)}><Brain size={17}/> Ask about this lesson</button></div>}
            <div className="forge3-player"><div className="forge3-play-buttons"><button className="forge3-mainbtn" type="button" onClick={toggleAudio} disabled={audioState==="loading"}>{audioState==="playing"?<Pause size={18}/>:<Play size={18}/>} {audioState==="loading"?"Preparing...":audioState==="paused"?"Resume":audioState==="playing"?"Pause":"Listen to chapter"}</button><button className="forge3-iconbtn" type="button" onClick={stopAudio} title="Stop narration" aria-label="Stop narration"><Square size={17}/></button></div><button type="button" className="forge3-mobile-voice-trigger forge3-softbtn" onClick={()=>setAudioSettingsOpen(true)}><Headphones size={16}/> Voice & settings</button><label className="forge3-desktop-voice">Output <select value={voiceType} onChange={e=>{stopAudio();setVoiceType(e.target.value);}}><option value="natural">ElevenLabs</option><option value="device">Device voice</option></select></label>{voiceType==="natural"?<label className="forge3-voice-picker forge3-desktop-voice">Narrator <select aria-label="Choose Forge narrator" value={forgeVoice} onChange={e=>selectForgeNarrator(e.target.value)}><option value="tucker">Tucker · mature American</option><option value="ambrose">Ambrose · wise, reflective</option><option value="david">David · British storyteller</option></select></label>:null}{voiceType==="natural"?<button type="button" className="forge3-softbtn forge3-voice-test forge3-desktop-voice" onClick={previewForgeNarrator} disabled={audioState==="loading"}><Volume2 size={15}/> Test voice</button>:null}<span className="forge3-audio-status" role="status">{audioError||audioStatus||"Headphone-ready listening"}</span></div>
          </>}
          {mode==="breathe"&&<><div className="forge3-stage-intro"><div><span className="forge3-overline">GUIDED MEDITATION</span><h2>Return to the present</h2><p>Five minutes · Gentle 4-in / 6-out rhythm</p></div><Wind size={35}/></div><div className="forge3-breathe-center"><div className={breathing?"forge3-breathe-orb running":"forge3-breathe-orb"} data-inhale={inhale}><span>{inhale?"BREATHE IN":"BREATHE OUT"}</span><strong>{inhale?4-breathSeconds%10:10-breathSeconds%10}</strong><small>{formatTime(remaining)} remaining</small></div><p>Relax your shoulders. Breathe comfortably. No breath holding is required.</p></div><div className="forge3-player"><button className="forge3-mainbtn" type="button" onClick={()=>setBreathing(v=>!v)} disabled={breathSeconds>=300}>{breathing?<Pause size={18}/>:<Play size={18}/>} {breathing?"Pause":"Start breathing"}</button><button className="forge3-iconbtn" type="button" onClick={()=>{setBreathing(false);setBreathSeconds(0);}}><RotateCcw size={17}/></button><button className="forge3-softbtn" onClick={()=>startAudio("Settle into a comfortable posture. Relax your face and shoulders. Breathe gently in through the nose for four counts, and breathe out slowly for six counts. Follow the moving circle. If you feel lightheaded, return to your natural breath. You do not need to force anything.")} type="button"><Volume2 size={16}/> Guided introduction</button><button className="forge3-iconbtn" onClick={stopAudio} type="button" title="Stop voice"><Square size={16}/></button></div></>}
          {mode==="watch"&&<><div className="forge3-stage-intro"><div><span className="forge3-overline">GUIDED VIDEO LIBRARY</span><h2>Learn by watching</h2><p>Yoga and movement without leaving The Forge.</p></div><Play size={35}/></div><div className="forge3-video-options">{videos.map(v=><button key={v.id} className={video===v.id?"selected":""} type="button" onClick={()=>{stopAudio();setVideo(v.id);}}><strong>{v.title}</strong><small>{v.by} · {v.note}</small></button>)}</div><div className="forge3-video-stage">{video?<iframe key={video} src={`https://www.youtube-nocookie.com/embed/${video}?rel=0`} title={videos.find(x=>x.id===video)?.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin"/>:<div className="forge3-video-empty"><Play size={38}/><span>Choose a practice above to open the player.</span></div>}</div>{video&&<a href={`https://www.youtube.com/watch?v=${video}`} target="_blank" rel="noopener noreferrer" className="forge3-youtube-link">If the video cannot be embedded, open on YouTube <ExternalLink size={15}/></a>}</>}
          {mode==="reflect"&&<><div className="forge3-stage-intro"><div><span className="forge3-overline">THE EXAMINED LIFE</span><h2>Turn wisdom into action</h2><p>Journal privately and carry today's lesson forward.</p></div><Brain size={35}/></div><div className="forge3-reflect"><div className="forge3-reflect-prompt"><span>QUESTION OF THE DAY</span><h3>{chapter.question}</h3><p><strong>Today's challenge:</strong> {chapter.challenge}</p></div><label htmlFor="forge3-reflection">Your thoughts</label><textarea id="forge3-reflection" value={journal} onChange={e=>setJournal(e.target.value)} placeholder="What did I learn? How can I apply it today? What should I practice tomorrow?"/><p>Saved in this browser for today's private reflection. Backend sync is not yet available.</p><div className="forge3-reflect-coach-actions"><button type="button" className="forge3-mainbtn" onClick={()=>setGrowthOpen(true)}><Brain size={17}/> Discuss this with Forge</button><p>Ask a question or explore your reflection in depth. Your journal is not sent unless you choose to share it.</p></div><div className="forge3-quicklinks"><Link to="/customer/health"><Dumbbell size={16}/> Training</Link><Link to="/calendar"><CalendarClock size={16}/> Calendar</Link><Link to="/customer/tasks"><Target size={16}/> Tasks</Link></div></div></>}
        </div>
      </section>
      <aside className={`forge3-sidebar ${missionsOpen?"forge3-missions-open":""}`} aria-label="Your daily plan"><div className="forge3-missions-mobile-top"><span>DAILY COMMAND</span><button type="button" aria-label="Close mission control" onClick={()=>setMissionsOpen(false)}>Close ✕</button></div><div className="forge3-side-head"><span className="forge3-overline">YOUR DAY AT A GLANCE</span><div className="forge3-side-title"><h2>Mission control</h2><button type="button" onClick={()=>setEditingRoutine(v=>!v)}>{editingRoutine?"Done":"Edit"}</button></div><p>{completed} / {schedule.length} completed</p><div className="forge3-progress"><span style={{width:completed/schedule.length*100+"%"}}/></div></div>
        <div className="forge3-current"><span className="forge3-overline"><span className="forge3-status-dot"/> {active?"YOUR NEXT STEP":"DAY COMPLETE"}</span><h3>{active?.title||"All missions reviewed"}</h3><p>{active?.detail||"Rest, reflect, and prepare for tomorrow."}</p>{active&&(active.href?<Link to={active.href}>Open activity <ArrowRight size={15}/></Link>:<button onClick={()=>startRoutine(active)} type="button">Start activity <ArrowRight size={15}/></button>)}</div>
        {editingRoutine ? <div className="forge3-side-list forge3-routine-editor" aria-label="Edit routine" tabIndex={0}>
          <p className="forge3-editor-help">Changes stay on this device and become your default daily routine. Times can overlap; arrange them to fit your family and recovery.</p>
          {schedule.map((item,i)=><div className="forge3-edit-row" key={i}>
            <label htmlFor={`forge3-time-${i}`}>{item.category}</label>
            <input id={`forge3-time-${i}`} aria-label={"Time for "+item.title} type="time" value={item.time} onChange={e=>updateRoutine(i,"time",e.target.value)} />
            <input aria-label={"Name for "+item.category} maxLength={65} value={item.title} onChange={e=>updateRoutine(i,"title",e.target.value)} />
            <input aria-label={"Instructions for "+item.title} maxLength={160} value={item.detail} onChange={e=>updateRoutine(i,"detail",e.target.value)} />
          </div>)}
          <button type="button" className="forge3-reset-routine" onClick={restoreRoutine}><RotateCcw size={14}/> Restore sample schedule</button>
        </div> : <div className="forge3-side-list" tabIndex={0} aria-label="Today's planned activities">{ordered.map((item,i)=><div className={`forge3-side-item ${done[item.id]?"done":""} ${focusIndex===i?"active":""}`} key={item.id}><span className="forge3-item-time">{item.time}</span><div><strong>{item.title}</strong><small>{item.category}</small></div>{item.action?<button aria-label={"Open "+item.title} onClick={()=>startRoutine(item)} type="button"><ChevronRight size={15}/></button>:<Link aria-label={"Open "+item.title} to={item.href}><ChevronRight size={15}/></Link>}<button className="forge3-item-check" type="button" aria-label={done[item.id]?"Mark incomplete":"Mark complete"} aria-pressed={!!done[item.id]} onClick={()=>setDone(p=>({...p,[item.id]:!p[item.id]}))}><Check size={14}/></button></div>)}</div>}
        <div className="forge3-side-bottom"><label htmlFor="forge3-intent">TODAY'S MAIN PRIORITY</label><input id="forge3-intent" placeholder="Your one important outcome..." value={intent} onChange={e=>setIntent(e.target.value)}/><Link to="/calendar">Open SyncWorks calendar <ChevronRight size={15}/></Link></div>
      </aside>
    </div>
    {missionsOpen&&<div className="forge3-missions-scrim" role="presentation" onClick={()=>setMissionsOpen(false)}/>}
    {readingOpen&&<div className="forge3-reading-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setReadingOpen(false);}}>
      <section className="forge3-reading-dialog" role="dialog" aria-modal="true" aria-labelledby="forge3-reading-heading">
        <header className="forge3-reading-dialog-head"><div><span className="forge3-overline">THE FORGE · DAILY READING</span><h2 id="forge3-reading-heading">{chapter.title}</h2><p>{chapter.lens} · {chapter.length}</p></div><button type="button" className="forge3-reading-close" onClick={()=>setReadingOpen(false)} aria-label="Close today's reading">✕</button></header>
        <div className="forge3-reading-dialog-body" tabIndex={0}><p className="forge3-dropcap">{chapter.paragraphs[0]}</p>{chapter.paragraphs.slice(1).map((p,i)=><p key={i}>{p}</p>)}{chapter.vocabulary?.length ? <div className="forge3-study-vocabulary"><h3>Vocabulary to master</h3>{chapter.vocabulary.map(v=><p key={v.word}><strong>{v.word}:</strong> {v.meaning}</p>)}</div>:null}{chapter.sourceUrl?<p className="forge3-study-source">Source: <a href={chapter.sourceUrl} target="_blank" rel="noopener noreferrer">{chapter.sourceLabel||"Primary source"} <ExternalLink size={14}/></a></p>:null}<div className="forge3-chapter-end"><strong>APPLY IT TODAY</strong><p>{chapter.challenge}</p></div></div>
        <div className="forge3-reading-dialog-actions"><button type="button" className="forge3-mainbtn" onClick={()=>{setReadingOpen(false);setActiveMode("listen");startAudio();}}><Headphones size={17}/> Listen to full chapter</button><button type="button" className="forge3-softbtn" onClick={()=>{setReadingOpen(false);setGrowthOpen(true);}}>Ask the Forge coach <Brain size={16}/></button><button type="button" className="forge3-softbtn" onClick={()=>{setReadingOpen(false);setActiveMode("reflect");}}>Reflect on lesson <ChevronRight size={16}/></button><button type="button" className="forge3-softbtn" onClick={()=>setReadingOpen(false)}>Close</button></div>
      </section>
    </div>}
    {audioSettingsOpen&&<div className="forge3-audio-settings-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setAudioSettingsOpen(false);}}><section role="dialog" aria-modal="true" aria-label="Forge voice and audio settings" className="forge3-audio-settings-dialog"><div className="forge3-audio-settings-heading"><div><span>THE FORGE · AUDIO</span><h2>Voice & playback</h2></div><button type="button" onClick={()=>setAudioSettingsOpen(false)} aria-label="Close audio settings">✕</button></div><label>Playback output<select value={voiceType} onChange={e=>{stopAudio();setVoiceType(e.target.value);}}><option value="natural">ElevenLabs</option><option value="device">Device voice</option></select></label>{voiceType==="natural"&&<><label>Narrator<select value={forgeVoice} onChange={e=>selectForgeNarrator(e.target.value)}><option value="tucker">Tucker · mature American</option><option value="ambrose">Ambrose · reflective</option><option value="david">David · British storyteller</option></select></label><button type="button" className="forge3-mainbtn" onClick={previewForgeNarrator} disabled={audioState==="loading"}><Volume2 size={16}/> Test narrator</button></>}<p role="status">{audioError||audioStatus||"Choose the voice for your next session."}</p><button type="button" className="forge3-softbtn" onClick={()=>setAudioSettingsOpen(false)}>Back to Forge</button></section></div>}
    <ForgeBookLibrary open={libraryOpen} onClose={()=>setLibraryOpen(false)} onSelect={id=>{stopAudio();setChapterId(id);setLibraryOpen(false);setReadingOpen(true);}}/>
    <ForgeGrowthCoach email={email} chapter={chapter} open={growthOpen} onClose={()=>setGrowthOpen(false)}/>
    <footer className="forge3-footer"><span><Sparkles size={14}/> Build your life, one intentional action at a time.</span><span>Private pilot · Forge coach is separate from Chief of Staff · Chapters are original · Audio uses AI narration when available</span></footer>
  </main>;
}
