import React from "react";
import {ArrowUpRight, Bot, Sparkles} from "lucide-react";
import {useNavigate} from "react-router-dom";
import "./AutomationDiscoverCTA.css";

export default function AutomationDiscoverCTA({compact=false}){
 const nav=useNavigate();
 return <button type="button" onClick={()=>nav("/sync/assist/employees")}
   className={"sw-automation-discover group flex w-full items-center gap-3 rounded-2xl text-left shadow-[0_10px_28px_rgba(0,0,0,.2)] backdrop-blur-lg transition-colors duration-150 "+(compact?"p-3":"p-4")}>
   <span className="sw-automation-discover-icon grid h-11 w-11 shrink-0 place-items-center rounded-xl"><Bot size={22} className="sw-automation-discover-accent"/></span>
   <span className="min-w-0 flex-1"><strong className="block text-sm">Unlock your AI team</strong><small className="mt-1 block text-[11px] leading-4 sw-automation-discover-secondary">Improve your workflow with automation. Explore each employee, its abilities and future pricing.</small></span>
   <ArrowUpRight size={19} className="shrink-0 text-cyan-200"/>
 </button>;
}
