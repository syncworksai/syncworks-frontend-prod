import React,{useState} from "react";
import api from "../../api/client";

const STATUSES=[
 ["EN_ROUTE","En route"],["ON_SITE","On site"],["IN_PROGRESS","Start work"],
 ["NEEDS_QUOTE","Needs quote"],["DELAYED","Delayed"],["COMPLETED","Completed"],["CANCELLED","Cancelled"],
];
export default function TechnicianJobActions({ticket,canDispatch=false,isAssigned=false,onSaved,compact=false}){
 const [action,setAction]=useState("");
 const [note,setNote]=useState("");
 const [minutes,setMinutes]=useState(15);
 const [scheduledStart,setScheduledStart]=useState(""),[duration,setDuration]=useState(60);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const options=(canDispatch?[
   ["SCHEDULED","Scheduled"],...STATUSES,["RELEASE","Return to queue"]
 ]:[...STATUSES.filter(x=>x[0]!=="CANCELLED"),["RELEASE","Can't do job / Reassign"]]);
 const send=async()=>{if(!action)return;
  if(["RELEASE","DELAYED","NEEDS_QUOTE","COMPLETED","CANCELLED"].includes(action)&&!note.trim()){
   setMessage("Add a reason or completion summary.");return;
  }
  setBusy(true);setMessage("");
  try{
   if(action==="SCHEDULED"&&!scheduledStart){setMessage("Choose a scheduled start time.");setBusy(false);return;}
   await api.post(`/business/technician/jobs/${ticket.ticket_id}/action/`,{
    action,note,minutes:Number(minutes),scheduled_start:scheduledStart?new Date(scheduledStart).toISOString():null,duration_minutes:Number(duration)
   });
   setMessage("Update saved. Dispatch and customer channels queued for notification.");
   setAction("");setNote("");onSaved?.();
  }catch(e){setMessage(e.response?.data?.detail||"Update failed.");}finally{setBusy(false);}
 };
 if(!canDispatch&&!isAssigned)return null;
 return <div className={`mt-2 rounded-lg border border-cyan-300/20 bg-[#07162e]/65 p-2 ${compact?"text-[11px]":"text-xs"}`}>
  <div className="sw-tech-status-quick" role="group" aria-label="Job progress">{options.filter(([key])=>["EN_ROUTE","ON_SITE","IN_PROGRESS","NEEDS_QUOTE","COMPLETED"].includes(key)).map(([key,label])=><button type="button" key={key} onClick={()=>{setAction(key);setMessage("");}} className={action===key?"is-selected":""} aria-pressed={action===key}>{label}</button>)}</div>
  <div className="flex gap-2">
   <select aria-label="Ticket status action" value={action} onChange={e=>{setAction(e.target.value);setMessage("");}} className="min-w-0 flex-1 rounded-lg border border-white/15 bg-[#071226] p-2 text-xs text-white">
    <option value="">Update status…</option>{options.map(([value,label])=><option key={value} value={value}>{label}</option>)}
   </select>
   <button type="button" disabled={!action||busy} onClick={send} className="rounded-lg border border-cyan-400/40 px-3 py-2 font-semibold text-cyan-200 disabled:opacity-40">{busy?"Saving":"Apply"}</button>
  </div>
  {action&&<div className="mt-2 flex flex-wrap gap-2">{action==="DELAYED"&&<label className="text-xs">Delay minutes<input aria-label="Delay minutes" type="number" min="5" max="480" value={minutes} onChange={e=>setMinutes(e.target.value)} className="ml-2 w-20 rounded-lg border border-white/20 bg-[#071226] p-2"/></label>}
   {action==="SCHEDULED"&&<><label className="text-xs">Start time<input type="datetime-local" value={scheduledStart} onChange={e=>setScheduledStart(e.target.value)} className="ml-1 rounded-lg border border-white/15 bg-[#071226] p-2"/></label><label className="text-xs">Minutes<input type="number" min="15" max="1440" value={duration} onChange={e=>setDuration(e.target.value)} className="ml-1 w-20 rounded-lg border border-white/15 bg-[#071226] p-2"/></label></>}
   <input aria-label="Status update notes" value={note} onChange={e=>setNote(e.target.value)} placeholder={action==="RELEASE"?"Reason it must be reassigned":action==="NEEDS_QUOTE"?"Describe quote needed":action==="COMPLETED"?"Completion summary":action==="CANCELLED"?"Cancellation reason":"Optional status note"} className="min-w-0 flex-1 rounded-lg border border-white/15 bg-[#071226] p-2 text-xs"/></div>}
  {message&&<p role="status" className="mt-2 text-[11px] text-cyan-200">{message}</p>}
 </div>;
}
