import React from "react";
import {ArrowUpRight, Bot, Sparkles} from "lucide-react";
import {useNavigate} from "react-router-dom";

export default function AutomationDiscoverCTA({compact=false}){
 const nav=useNavigate();
 return <button type="button" onClick={()=>nav("/sync/assist/employees")}
   className={"group flex w-full items-center gap-3 rounded-2xl border border-cyan-300/30 bg-gradient-to-r from-[#082b45]/85 to-[#231641]/80 text-left text-white shadow-[0_10px_28px_rgba(0,0,0,.2)] backdrop-blur-lg transition-colors duration-150 hover:border-cyan-300/70 "+(compact?"p-3":"p-4")}>
   <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-cyan-300/30 bg-cyan-400/10"><Bot size={22} className="text-cyan-200"/></span>
   <span className="min-w-0 flex-1"><strong className="block text-sm">Unlock your AI team</strong><small className="mt-1 block text-[11px] leading-4 text-slate-200">Improve your workflow with automation. Explore each employee, its abilities and future pricing.</small></span>
   <ArrowUpRight size={19} className="shrink-0 text-cyan-200"/>
 </button>;
}
