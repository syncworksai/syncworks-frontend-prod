import React,{useState} from "react";
import api from "../../api/client";

const STATUSES=[
 ["EN_ROUTE","En route"],["ON_SITE","On site"],["IN_PROGRESS","Start work"],
 ["DELAYED","Delayed"],["COMPLETED","Completed"],["CANCELLED","Cancelled"],
];
export default function TechnicianJobActions({ticket,canDispatch=false,isAssigned=false,onSaved,compact=false}){
 const [action,setAction]=useState("");
 const [note,setNote]=useState("");
 const [minutes,setMinutes]=useState(15);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const options=(canDispatch?[
   ["SCHEDULED","Scheduled"],...STATUSES,["RELEASE","Return to queue"]
 ]:[...STATUSES.filter(x=>x[0]!=="CANCELLED"),["RELEASE","Can't do job / Reassign"]]);
 const send=async()=>{if(!action)return;
  if(["RELEASE","DELAYED","COMPLETED","CANCELLED"].includes(action)&&!note.trim()){
   setMessage("Add a reason or completion summary.");return;
  }
  setBusy(true);setMessage("");
  try{
   await api.post(`/business/technician/jobs/${ticket.ticket_id}/action/`,{
    action,note,minutes:Number(minutes)
   });
   setMessage("Update saved. Dispatch and customer channels queued for notification.");
   setAction("");setNote("");onSaved?.();
  }catch(e){setMessage(e.response?.data?.detail||"Update failed.");}finally{setBusy(false);}
 };
 if(!canDispatch&&!isAssigned)return null;
 return <div className={`mt-2 rounded-lg border border-cyan-300/20 bg-[#07162e]/65 p-2 ${compact?"text-[11px]":"text-xs"}`}>
  <div className="flex gap-2">
   <select aria-label="Ticket status action" value={action} onChange={e=>{setAction(e.target.value);setMessage("");}} className="min-w-0 flex-1 rounded-lg border border-white/15 bg-[#071226] p-2 text-xs text-white">
    <option value="">Update status…</option>{options.map(([value,label])=><option key={value} value={value}>{label}</option>)}
   </select>
   <button type="button" disabled={!action||busy} onClick={send} className="rounded-lg border border-cyan-400/40 px-3 py-2 font-semibold text-cyan-200 disabled:opacity-40">{busy?"Saving":"Apply"}</button>
  </div>
  {action&&<div className="mt-2 flex flex-wrap gap-2">{action==="DELAYED"&&<label className="text-xs">Delay minutes<input aria-label="Delay minutes" type="number" min="5" max="480" value={minutes} onChange={e=>setMinutes(e.target.value)} className="ml-2 w-20 rounded-lg border border-white/20 bg-[#071226] p-2"/></label>}
   <input aria-label="Status update notes" value={note} onChange={e=>setNote(e.target.value)} placeholder={action==="RELEASE"?"Reason it must be reassigned":action==="COMPLETED"?"Completion summary":action==="CANCELLED"?"Cancellation reason":"Optional status note"} className="min-w-0 flex-1 rounded-lg border border-white/15 bg-[#071226] p-2 text-xs"/></div>}
  {message&&<p role="status" className="mt-2 text-[11px] text-cyan-200">{message}</p>}
 </div>;
}
