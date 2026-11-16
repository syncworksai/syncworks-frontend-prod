import React, {useEffect,useState} from "react";
import {ChevronDown,Volume2,VolumeX} from "lucide-react";
import "./JarvisAvatar.css";

export const AVATAR_STORAGE_KEY="sw-jarvis-avatar-v1";
export const AVATARS=[
  {id:"executive-female",name:"Victoria",style:"Executive",presentation:"Female",photo:"/jarvis-avatars/victoria.jpeg",mouthX:"49%",mouthY:"34%",skin:"#d8a17f",shade:"#a36b51",hair:"#261d24",outfit:"#172b50",accent:"#d8b271"},
  {id:"executive-male",name:"James",style:"Executive",presentation:"Male",photo:"/jarvis-avatars/james.jpeg",mouthX:"49%",mouthY:"43%",skin:"#bc8263",shade:"#895641",hair:"#211e21",outfit:"#152133",accent:"#c3ab86"},
  {id:"future-female",name:"Elizabeth",style:"Modern",presentation:"Female",photo:"/jarvis-avatars/elizabeth.jpeg",mouthX:"49%",mouthY:"39%",skin:"#e8b398",shade:"#b07965",hair:"#cbb9a9",outfit:"#102f48",accent:"#52defd"},
  {id:"future-male",name:"William",style:"Modern",presentation:"Male",photo:"/jarvis-avatars/william.jpeg",mouthX:"50%",mouthY:"38%",skin:"#bb8a70",shade:"#855844",hair:"#151c2c",outfit:"#2d2055",accent:"#ad65ff"},
];

export function loadAvatarChoice(){
  try {const value=window.localStorage.getItem(AVATAR_STORAGE_KEY);return AVATARS.some(a=>a.id===value)?value:AVATARS[0].id;}
  catch{return AVATARS[0].id;}
}
export function saveAvatarChoice(id){
  if(!AVATARS.some(a=>a.id===id))return;
  try{window.localStorage.setItem(AVATAR_STORAGE_KEY,id);}catch{}
  window.dispatchEvent(new CustomEvent("sw-jarvis-avatar-choice",{detail:{id}}));
}
export function useJarvisAvatar(){
  const [avatarId,setAvatarId]=useState(loadAvatarChoice);
  useEffect(()=>{
    const update=e=>setAvatarId(e?.detail?.id||loadAvatarChoice());
    window.addEventListener("sw-jarvis-avatar-choice",update);
    window.addEventListener("storage",update);
    return()=>{window.removeEventListener("sw-jarvis-avatar-choice",update);window.removeEventListener("storage",update);};
  },[]);
  const choose=id=>{saveAvatarChoice(id);setAvatarId(id);};
  return {avatarId,choose};
}

export function JarvisAvatar({id="executive-female",state="idle",size="hero",label=true}){
  const config=AVATARS.find(v=>v.id===id)||AVATARS[0];
  const [photoReady,setPhotoReady]=useState(false);
  useEffect(()=>setPhotoReady(false),[id]);
  const female=config.presentation==="Female",future=config.style==="Futuristic";
  const stage=["idle","listening","thinking","speaking"].includes(state)?state:"idle";
  const gradId="avatar-outfit-"+id;
  return <div className={`jarvis-avatar jarvis-avatar--${stage} jarvis-avatar--${size} ${photoReady?"jarvis-avatar--photographic":""}`} style={{"--avatar-accent":config.accent,"--mouth-x":config.mouthX,"--mouth-y":config.mouthY}}>
    <div className="jarvis-avatar__halo" aria-hidden="true"/>
    <img key={config.photo} className="jarvis-avatar__photo" src={config.photo} alt={`${config.name}, ${config.presentation.toLowerCase()} ${config.style.toLowerCase()} virtual assistant`} loading="eager" decoding="async" onLoad={()=>setPhotoReady(true)} onError={()=>setPhotoReady(false)} />
    {photoReady&&<img key={config.photo+"-mouth"} className="jarvis-avatar__photo-mouth" src={config.photo} alt="" aria-hidden="true" draggable="false" />}
    {!photoReady&&<svg className="jarvis-avatar__portrait" viewBox="0 0 260 300" role="img" aria-label={`${config.name}, ${config.presentation.toLowerCase()} ${config.style.toLowerCase()} virtual assistant, ${stage}`}>
      <defs>
        <linearGradient id={gradId} x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor={config.outfit}/><stop offset="1" stopColor="#070d1e"/></linearGradient>
        <radialGradient id={"avatar-skin-"+id} cx="40%" cy="25%" r="85%"><stop offset="0" stopColor={config.skin}/><stop offset="1" stopColor={config.shade}/></radialGradient>
      </defs>
      <g className="jarvis-avatar__body">
        <path d="M8 300c4-64 31-91 80-101 15-3 24-5 42-5s28 2 43 5c50 10 77 39 80 101z" fill={`url(#${gradId})`}/>
        <path d="M91 202l39 43 38-43-8-22H99z" fill={config.shade}/>
        <path d="M120 235l10 10 10-10 10 65h-39z" fill={future?"#094567":"#f1e5d2"} opacity=".9"/>
        <path d="M88 200l42 49-32 51-45-84zM173 200l-43 49 32 51 45-84z" fill={config.outfit} stroke={config.accent} strokeOpacity=".5" strokeWidth="3"/>
        {future&&<g stroke={config.accent} strokeWidth="2.8" fill="none" opacity=".95"><path d="M21 282l28-58 21 14M239 282l-28-58-21 14"/><path d="M99 295l31-46 31 46"/></g>}
        {!future&&<path d="M124 254v46" stroke={config.accent} strokeWidth="2" opacity=".8"/>}
      </g>
      {female&&<path d="M53 162c-20-41-11-112 18-145C92-8 151-6 181 22c37 31 39 113 24 151l-18 48-22-39H88l-21 35z" fill={config.hair}/>}
      <g className="jarvis-avatar__head">
        <ellipse cx="68" cy="121" rx="13" ry="22" fill={config.shade}/><ellipse cx="192" cy="121" rx="13" ry="22" fill={config.shade}/>
        <path d="M65 78Q65 16 130 17q67 0 65 65l-6 67q-11 53-59 61-47-8-59-61z" fill={`url(#avatar-skin-${id})`}/>
        <path d="M130 97q-4 21-8 46 6 9 18 0" fill="none" stroke={config.shade} strokeWidth="3" strokeLinecap="round" opacity=".65"/>
        <path d="M86 105q17-10 32-2M143 103q15-9 31 2" fill="none" stroke={config.hair} strokeWidth="5" strokeLinecap="round"/>
        <path d="M88 118q13-9 27 0M146 118q13-9 27 0" stroke="#322b34" fill="none" strokeWidth="4" strokeLinecap="round"/>
        <circle cx="102" cy="119" r="3.2" fill="#1f2937"/><circle cx="159" cy="119" r="3.2" fill="#1f2937"/>
        <path d="M93 93q12-8 24-2M143 91q14-7 28 2" fill="none" stroke={config.hair} strokeWidth="5.5" strokeLinecap="round"/>
        <g className="jarvis-avatar__mouth">
          <path className="jarvis-avatar__mouth-closed" d="M107 168q22 9 45-1" stroke="#7f4547" strokeWidth="4" fill="none" strokeLinecap="round"/>
          <ellipse className="jarvis-avatar__mouth-open" cx="130" cy="172" rx="15" ry="11" fill="#57272f" stroke="#9d5864" strokeWidth="2"/>
        </g>
        {!female&&<path d="M76 142q6 54 54 64 49-10 54-64-11 28-25 38l-13 6q-16 7-32 0l-17-8q-16-12-21-36" fill={config.hair} fillOpacity=".45"/>}
        {female&&<><path d="M52 73q16-56 75-58 48-2 72 42l-19-4-18-24-19 18-44 9-21 42-10 49-12-22z" fill={config.hair}/><path d="M76 46q28-43 83-23" stroke={config.hair} strokeWidth="12" fill="none"/><circle cx="76" cy="157" r="4" fill={config.accent}/><circle cx="187" cy="157" r="4" fill={config.accent}/></>}
        {!female&&<path d="M65 93q-4-42 16-63 29-34 72-19 44 8 44 80l-13-19-2-24-24-18-32 5-32 14-18 29z" fill={config.hair}/>}
        {future&&<path d="M77 48q55-30 102 1" stroke={config.accent} strokeWidth="3" opacity=".65" fill="none"/>}
      </g>
    </svg>}
    <div className="jarvis-avatar__wave" aria-hidden="true"><i/><i/><i/><i/><i/></div>
    {label&&<div className="jarvis-avatar__caption"><strong>{config.name}</strong><span>{stage==="idle"?"Ready":stage==="thinking"?"Thinking":stage==="speaking"?"Speaking":"Listening"}</span></div>}
  </div>;
}

export function JarvisAvatarPicker({value,onChange,compact=false}){
  const [open,setOpen]=useState(false);
  const current=AVATARS.find(a=>a.id===value)||AVATARS[0];
  return <div className="jarvis-avatar-picker">
    <button type="button" className="jarvis-avatar-picker__toggle" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>
      <span>Assistant: {current.name}</span><ChevronDown size={16}/>
    </button>
    {open&&<div className="jarvis-avatar-picker__grid" role="group" aria-label="Choose your assistant">
      {AVATARS.map(a=><button key={a.id} type="button" aria-pressed={current.id===a.id} onClick={()=>{onChange(a.id);setOpen(false);}} className={`jarvis-avatar-picker__option ${current.id===a.id?"is-selected":""}`}>
        <JarvisAvatar id={a.id} size="mini" label={false}/>
        <strong>{a.name}</strong><small>{a.presentation} · {a.style}</small>
      </button>)}
    </div>}
    {!compact&&<p className="jarvis-avatar-picker__hint">Choose your assistant's appearance. Voice selection is separate. This choice is saved on this device.</p>}
  </div>;
}
