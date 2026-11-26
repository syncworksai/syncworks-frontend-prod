import React,{useEffect,useRef,useState} from "react";
const scripts={
 CHIEF_OF_STAFF:"I coordinate approved employee reports and help you identify priorities and decisions.",
 SALES_MANAGER:"I organize prospects and prepare outreach and follow-up drafts for your review.",
 MARKETING_MANAGER:"I help plan campaigns and prepare content drafts for approval.",
 RESEARCH_ANALYST:"I organize research and source evidence to support your decisions.",
 EXECUTIVE_ASSISTANT:"I organize reviewed information and prepare briefing material.",
 BUSINESS_MANAGER:"My planned role is to coordinate business operations, workloads and assignments.",
 FINANCE_MANAGER:"My planned role is to review financial priorities, invoices and collections.",
 PROPERTY_MANAGER:"My planned role is to help organize property correspondence, maintenance and rent priorities.",
 CUSTOMER_SERVICE:"My planned role is to help organize inquiries and prepare customer responses.",
 PERSONAL_TRAINER:"I help you focus on workouts, nutrition and fitness goals."
};
export default function EmployeeVoiceIntro({role,name,voiceName,pilot,photo,details=[],limits=""}){
 const [open,setOpen]=useState(false),[playing,setPlaying]=useState(false),[failed,setFailed]=useState(false);
 const audio=useRef(null),dialog=useRef(null);
 const text="Hello, I'm "+name+". "+(scripts[role]||"I'm here to support your work.");
 useEffect(()=>()=>{audio.current?.pause();},[]);
 useEffect(()=>{if(open&&!dialog.current?.open)dialog.current?.showModal();else if(!open&&dialog.current?.open)dialog.current.close();},[open]);
 const close=()=>{audio.current?.pause();setPlaying(false);setOpen(false);};
 const hear=async()=>{setOpen(true);setFailed(false);try{const a=audio.current;if(!a)throw Error("No recording");a.currentTime=0;await a.play();}catch{setFailed(true);setPlaying(false);}};
 return <section className="rounded-xl border border-white/15 bg-white/[.03] p-3 text-xs">
 <button type="button" onClick={hear} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-3 font-bold text-white">▶ Hear to learn more</button>
 <audio ref={audio} preload="none" src={pilot?"/employee-intros/"+role.toLowerCase()+".mp3":undefined} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)} onError={()=>{setFailed(true);setPlaying(false);}}/>
 <dialog ref={dialog} onCancel={close} onClose={close} className="m-auto w-[min(92vw,480px)] max-h-[80dvh] overflow-y-auto rounded-2xl border border-white/20 bg-[#111a22] p-5 text-white backdrop:bg-black/65">
 <div className="flex items-center gap-3">{photo&&<img src={photo} alt="" className={"h-20 w-20 rounded-full object-cover "+(playing?"motion-safe:animate-spin":"")}/>}<div className="flex-1"><h2 className="text-lg font-bold">{name}</h2><p className="text-xs text-slate-300">{pilot&&voiceName?voiceName:"AI employee"}</p></div><button type="button" onClick={close} aria-label="Close introduction" className="p-2">✕</button></div>
 <p className="mt-4 text-sm leading-6">{text}</p>
 <p role="status" className="mt-2 text-xs text-slate-300">{playing?"Speaking…":failed||!pilot?"Audio unavailable — read the introduction below.":"Introduction"}</p>
 {details.length>0&&<ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{details.map(d=><li key={d}>{d}</li>)}</ul>}
 {limits&&<p className="mt-3 text-xs text-slate-300">{limits}</p>}
 <div className="mt-4 flex gap-2">{playing&&<button type="button" onClick={()=>audio.current?.pause()} className="rounded-xl border border-white/20 px-3 py-2">Stop audio</button>}<button type="button" disabled className="flex-1 rounded-xl border border-white/20 px-3 py-2 opacity-60">Add / Purchase · coming soon</button></div>
 </dialog></section>;
}
