import React, {useCallback,useEffect,useMemo,useState} from "react";
import {Bell,X,RefreshCw,AlertTriangle,ClipboardList,ChevronRight} from "lucide-react";
import {useNavigate} from "react-router-dom";
import {useAuth} from "../../auth/AuthContext";
import api from "../../api/client";
import {getLiveOperations} from "../../api/dispatch";

// Business-specific actionable signals, not personal /me/ notifications.
export default function BusinessAlertsBell(){
 const nav=useNavigate();
 const {activeBusinessId}=useAuth();
 const [open,setOpen]=useState(false),[alerts,setAlerts]=useState([]),[loading,setLoading]=useState(false),[error,setError]=useState("");
 const load=useCallback(async()=>{
   if(!activeBusinessId){setAlerts([]);return;}
   setLoading(true);setError("");
   const results=await Promise.allSettled([getLiveOperations(),api.get("/business/tech-board/",{headers:{"X-Business-Id":String(activeBusinessId)}})]);
   const notices=[];
   if(results[0].status==="fulfilled"){
     const d=results[0].value;
     for(const r of (d.recommendations||[]).slice(0,15))notices.push({id:`ops-${r.type}-${r.ticket_id}`,title:(r.type||"OPERATIONS").replaceAll("_"," "),body:r.message||"Review the service schedule",to:"/sbo/dispatch"});
   }
   if(results[1].status==="fulfilled"){
     const unassigned=results[1].value.data?.unassigned||[];
     if(unassigned.length)notices.push({id:"unassigned",title:`${unassigned.length} unassigned job(s)`,body:"Technician assignment needed",to:"/sbo/tech-board"});
   }
   if(results.every(r=>r.status==="rejected"))setError("Business alert sources unavailable");
   setAlerts(notices);setLoading(false);
 },[activeBusinessId]);
 useEffect(()=>{load();const timer=setInterval(load,60000);return()=>clearInterval(timer);},[load]);
 useEffect(()=>{if(!open)return;const handle=e=>{if(e.key==="Escape")setOpen(false);};window.addEventListener("keydown",handle);return()=>window.removeEventListener("keydown",handle)},[open]);
 return <div className="fixed bottom-24 right-4 z-[310] sm:bottom-5 sm:right-6">
   <button type="button" aria-label={`Business alerts, ${alerts.length} requiring review`} onClick={()=>setOpen(v=>!v)} className="relative grid h-12 w-12 place-items-center rounded-2xl border border-cyan-400/35 bg-[#071a30]/95 text-cyan-100 shadow-lg backdrop-blur-xl"><Bell size={21}/>{alerts.length>0&&<span className="absolute -right-1 -top-1 rounded-full bg-amber-400 px-1.5 text-[11px] font-black text-slate-950">{alerts.length>99?"99+":alerts.length}</span>}</button>
   {open&&<div role="dialog" aria-label="Business notifications" className="absolute bottom-14 right-0 flex max-h-[65dvh] w-[min(360px,calc(100vw-30px))] flex-col overflow-hidden rounded-2xl border border-cyan-400/30 bg-[#071226]/95 p-3 text-white shadow-2xl backdrop-blur-xl">
     <div className="mb-2 flex items-center justify-between"><div><strong>Business alerts</strong><p className="text-[11px] text-slate-400">Selected business only · Operations</p></div><div className="flex gap-2"><button onClick={load} aria-label="Refresh business alerts"><RefreshCw size={17} className={loading?"animate-spin":""}/></button><button onClick={()=>setOpen(false)} aria-label="Close business alerts"><X size={18}/></button></div></div>
     <div className="min-h-0 space-y-2 overflow-y-auto">{error&&<p className="text-xs text-amber-200">{error}</p>}{!error&&!alerts.length&&<p className="p-3 text-xs text-slate-300">{loading?"Checking business work…":"No actionable business alerts from current dispatch data."}</p>}
     {alerts.map(a=><button key={a.id} onClick={()=>{setOpen(false);nav(a.to);}} className="flex w-full gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-left"><AlertTriangle size={16} className="shrink-0 text-amber-200"/><span className="min-w-0"><strong className="block text-xs">{a.title}</strong><small className="mt-1 block text-slate-300">{a.body}</small></span><ChevronRight size={15} className="ml-auto shrink-0"/></button>)}</div>
     <p className="mt-3 border-t border-white/10 pt-2 text-[10px] text-slate-400">This panel reflects live job risks and unassigned tickets. It does not include personal notifications.</p>
   </div>}
 </div>;
}
