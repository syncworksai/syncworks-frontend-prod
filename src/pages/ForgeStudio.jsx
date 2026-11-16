import React, { useEffect, useRef, useState } from "react";
import { BookOpen, ExternalLink, Headphones, HeartPulse, Pause, Play, RotateCcw, Square, Volume2, Wind } from "lucide-react";
import api from "../api/client";
import "./ForgeStudio.css";

const sessions = [
  { id:"breath", name:"Guided breathing", length:"5 minutes", description:"A gentle 4-second inhale and 6-second exhale. Visual pacing and optional voice cues.", icon:Wind },
  { id:"mind", name:"Morning mindset", length:"2 minutes", description:"Start intentionally with a guided reflection on discipline, action and character.", icon:BookOpen },
  { id:"meditate", name:"Quiet meditation", length:"5 minutes", description:"Release tension, observe your thoughts and return attention to the moment.", icon:HeartPulse },
];
const videos = [
  {id:"j7rKKpwdXNE",title:"10-Minute Yoga For Beginners",source:"Yoga With Adriene",detail:"A gentle beginner-friendly yoga practice."},
  {id:"R0__e0QTtQw",title:"Nervous System Reset",source:"Yoga With Adriene",detail:"A calming ten-minute yoga practice."},
];
const scripts = {
  mind: "Welcome to The Forge. This is not about perfection. Today, act with purpose. You can control your preparation, your attention, and your response to difficulty. Ask yourself: what one thing matters most today? What small action proves that you are becoming the person you want to be? Choose it. Commit to it. Then be present for the people you love.",
  meditate: "Welcome to your private meditation. Sit comfortably, or lie down. Let the shoulders soften. Breathe gently, without forcing it. Notice the weight of your body. When thoughts appear, let them pass without judgment. Return to this breath. You do not need to solve everything in this moment. You can come back to clarity, and choose your next action with intention.",
  breath: "Welcome to guided breathing. Breathe gently through your nose if comfortable. Follow the circle: breathe in for four, breathe out for six. Do not force or hold your breath. If you feel dizzy or uncomfortable, stop and return to your natural breathing."
};

export default function ForgeStudio(){
  const [selected,setSelected] = useState("breath");
  const [phaseSeconds,setPhaseSeconds] = useState(0);
  const [elapsed,setElapsed] = useState(0);
  const [running,setRunning] = useState(false);
  const [video,setVideo] = useState("");
  const [voiceBusy,setVoiceBusy] = useState(false);
  const [voiceState,setVoiceState] = useState("idle");
  const [voiceMessage,setVoiceMessage] = useState("");
  const audioRef=useRef(null);
  const audioUrlRef=useRef("");
  const requestRef=useRef(null);
  const active= sessions.find(s=>s.id===selected) || sessions[0];
  const inBreath = phaseSeconds % 10 < 4;
  const phaseLabel = inBreath ? "BREATHE IN" : "BREATHE OUT";
  const phaseRemaining = inBreath ? 4-(phaseSeconds%10) : 10-(phaseSeconds%10);
  const remaining = Math.max(0,300-elapsed);

  function stopVoice(){
    if(requestRef.current){requestRef.current.abort();requestRef.current=null;}
    if(audioRef.current){audioRef.current.pause();audioRef.current.src="";audioRef.current=null;}
    if(audioUrlRef.current){URL.revokeObjectURL(audioUrlRef.current);audioUrlRef.current="";}
    if("speechSynthesis" in window)window.speechSynthesis.cancel();
    setVoiceBusy(false);setVoiceState("idle");
  }
  function browserSpeak(text){
    if(!("speechSynthesis" in window)){setVoiceMessage("Speech playback isn't supported by this browser.");return;}
    const u = new SpeechSynthesisUtterance(text);u.rate=.89;u.pitch=.97;
    u.onend=()=>setVoiceState("idle");u.onerror=()=>setVoiceState("idle");
    setVoiceState("browser");setVoiceMessage("Using your device voice as a fallback.");
    window.speechSynthesis.speak(u);
  }
  async function speak(text){
    stopVoice();setVoiceMessage("");setVoiceBusy(true);
    const controller=new AbortController();requestRef.current=controller;
    try{
      const response=await api.post("/customer-health/forge/voice/speak/",{text,energy:selected==="mind"?"balanced":"calm"},{responseType:"blob",signal:controller.signal,timeout:30000});
      if(controller.signal.aborted)return;
      const url=URL.createObjectURL(response.data);
      audioUrlRef.current=url;
      const sound=new Audio(url);audioRef.current=sound;
      sound.onended=()=>{setVoiceState("idle");setVoiceMessage("");};
      sound.onerror=()=>{setVoiceState("idle");setVoiceMessage("Audio playback failed.");};
      await sound.play();
      setVoiceState("natural");setVoiceMessage("Natural voice narration · ElevenLabs");
    }catch(error){
      if(!controller.signal.aborted)browserSpeak(text);
    }finally{
      if(requestRef.current===controller)requestRef.current=null;
      setVoiceBusy(false);
    }
  }
  function changeSession(id){
    setSelected(id);setRunning(false);setPhaseSeconds(0);setElapsed(0);stopVoice();
  }
  useEffect(()=>{
    if(!running || selected!=="breath") return undefined;
    const timer=window.setInterval(()=>{
      setPhaseSeconds(n=>n+1);
      setElapsed(n=>{if(n>=299){setRunning(false);return 300;}return n+1;});
    },1000);
    return ()=>window.clearInterval(timer);
  },[running,selected]);
  useEffect(()=>()=>{if(requestRef.current)requestRef.current.abort();if(audioRef.current)audioRef.current.pause();if(audioUrlRef.current)URL.revokeObjectURL(audioUrlRef.current);if("speechSynthesis" in window)window.speechSynthesis.cancel();},[]);

  return <section className="forge-studio">
    <div className="forge-studio-head">
      <div><p className="forge-v2-overline">IN-APP GUIDED EXPERIENCES</p><h2>Personal Performance Studio</h2><p>Choose an activity, press Start, and stay inside The Forge.</p></div>
      <Headphones size={27} aria-hidden="true"/>
    </div>
    <div className="forge-studio-session-grid">
      {sessions.map(s=>{const Icon=s.icon;return <button key={s.id} type="button" onClick={()=>changeSession(s.id)} className={selected===s.id?"forge-studio-session chosen":"forge-studio-session"} aria-pressed={selected===s.id}>
        <Icon size={22}/><span><strong>{s.name}</strong><small>{s.length}</small></span>
      </button>})}
    </div>
    <div className="forge-studio-workspace">
      <div className="forge-studio-content">
        <p className="forge-v2-overline">{active.length} · GUIDED PRACTICE</p>
        <h3>{active.name}</h3><p>{active.description}</p>
        {selected==="breath" ? <>
          <div className={running?"forge-breath-orb running":"forge-breath-orb"} data-inhale={inBreath} role="status" aria-live="off"><div><span>{phaseLabel}</span><strong>{phaseRemaining}</strong><small>{Math.floor(remaining/60)}:{String(remaining%60).padStart(2,"0")} remaining</small></div></div>
          <div className="forge-studio-controls">
            <button type="button" className="forge-v2-primary" onClick={()=>setRunning(p=>!p)} disabled={remaining===0}>{running?<Pause size={17}/>:<Play size={17}/>} {running?"Pause breathing":"Start breathing"}</button>
            <button type="button" className="forge-v2-secondary" onClick={()=>{setRunning(false);setElapsed(0);setPhaseSeconds(0);}}><RotateCcw size={16}/> Reset</button>
          </div>
        </> : <blockquote>{scripts[selected]}</blockquote>}
        <div className="forge-studio-controls">
          <button type="button" className="forge-v2-secondary" disabled={voiceBusy} onClick={()=>voiceState!=="idle"?stopVoice():speak(scripts[selected])}>{voiceState!=="idle"?<Square size={16}/>:<Volume2 size={17}/>} {voiceBusy?"Preparing audio...":voiceState!=="idle"?"Stop narration":"Play spoken guidance"}</button>
        </div>
        <p className="forge-studio-note" role="status">{voiceMessage || "Natural voice requires the Forge voice service. Device speech is the backup."}</p>
        {selected==="breath"&&<p className="forge-studio-note">Follow a comfortable breathing rhythm. Stop if you feel lightheaded; no breath-holding is required.</p>}
        {selected==="meditate"&&<p className="forge-studio-note">After the introduction, sit quietly for as long as feels comfortable. Longer timed sessions are planned.</p>}
      </div>
      <div className="forge-studio-video">
        <p className="forge-v2-overline">GUIDED VIDEO LIBRARY</p><h3>Learn by watching</h3><p>Selected real YouTube practices, shown without leaving The Forge when embedding is permitted.</p>
        <div className="forge-studio-video-options">{videos.map(v=><button key={v.id} type="button" onClick={()=>{stopVoice();setVideo(v.id);}} className={video===v.id?"chosen":""}><strong>{v.title}</strong><small>{v.source} · {v.detail}</small></button>)}</div>
        {video ? <div className="forge-studio-embed"><iframe src={`https://www.youtube-nocookie.com/embed/${video}?rel=0`} title={videos.find(v=>v.id===video)?.title||"Yoga video"} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen loading="lazy" /></div> : <div className="forge-studio-video-placeholder">Select a practice to open the video player here.</div>}
        {video&&<a href={`https://www.youtube.com/watch?v=${video}`} target="_blank" rel="noopener noreferrer" className="forge-v2-textlink">Watch on YouTube if embedding is blocked <ExternalLink size={15}/></a>}
      </div>
    </div>
  </section>;
}
