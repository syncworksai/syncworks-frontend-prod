import React,{useState} from "react";
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
export default function EmployeeVoiceIntro({role,name,voiceName,pilot}){
 const [failed,setFailed]=useState(false);
 const text="Hello, I'm "+name+". "+(scripts[role]||"I'm here to support your work.");
 return <section className="rounded-xl border border-white/15 bg-white/[.03] p-3 text-xs">
 <h3 className="font-bold text-white">Meet {name} · Voice introduction</h3>
 <p className="mt-1 text-slate-300">{text}</p>
 {pilot&&voiceName&&<p className="mt-2 text-slate-300">Assigned voice: {voiceName}</p>}
 <p role="status" className="mt-2 text-slate-400">{failed?"Recording unavailable.":"Recorded introduction pending. Device voice preview is not the assigned ElevenLabs voice."}</p>
 {pilot&&<button type="button" className="mt-2 rounded-lg border border-white/20 px-3 py-2 text-white" onClick={()=>{if(!window.speechSynthesis||!window.SpeechSynthesisUtterance){setFailed(true);return;}window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.onerror=()=>setFailed(true);window.speechSynthesis.speak(u);}}>Read introduction (device voice)</button>}
 {pilot&&<button type="button" className="ml-2 rounded-lg border border-white/20 px-3 py-2" onClick={()=>window.speechSynthesis?.cancel()}>Stop</button>}
 </section>;
}
