import React from "react";
import {Settings2,ChevronRight} from "lucide-react";
import {useNavigate} from "react-router-dom";

// Manage Team has one authoritative screen. Roles are fixed server-side;
// only names and approved portraits can be personalized.
export default function SyncAssistTeamDrawer(){
 const nav=useNavigate();
 return <button type="button" onClick={()=>nav("/sync/assist/employees")}
   className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-cyan-400/30 bg-slate-950/75 px-3 py-2 text-xs font-bold text-cyan-100 hover:border-cyan-300">
   <Settings2 size={16}/> Manage AI team <ChevronRight size={14}/>
 </button>;
}
