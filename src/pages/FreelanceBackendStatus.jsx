import React,{useEffect,useState} from "react";
import api from "../api/client";
import {Cloud,RefreshCw,ShieldCheck,AlertCircle} from "lucide-react";
export default function FreelanceBackendStatus({onOpen}){
 const [result,setResult]=useState("loading");
 const [queued,setQueued]=useState(null);
 const refresh=async()=>{
  setResult("loading");
  try{
   const [access,ledger,synthetic]=await Promise.all([
    api.get("/sync-ai/freelance/pilot/access/"),
    api.get("/sync-ai/freelance/pilot/business-ledger/"),
    api.get("/sync-ai/freelance/pilot/synthetic-jobs/")
   ]);
   setResult(access.data?.enabled&&ledger.data?.summary?"connected":"unavailable");
   setQueued((synthetic.data?.jobs||[]).filter(j=>["QUEUED","RUNNING","REVIEW"].includes(j.state)).length);
  }catch{setResult("unavailable");setQueued(null);}
 };
 useEffect(()=>{refresh()},[]);
 return <div className="sw-upwork-glass sw-freelance-insight-card" aria-label="Freelance backend readiness">
   <div className="sw-upwork-section-head"><span className="sw-upwork-eyebrow"><Cloud size={14}/> BACKEND READINESS</span>
   <button className="sw-upwork-plain" type="button" aria-label="Recheck cloud service" onClick={refresh}><RefreshCw size={14}/></button></div>
   <strong style={{display:"flex",alignItems:"center",gap:8}}>{result==="connected"?<><ShieldCheck size={15}/> Cloud connected</>:result==="loading"?"Checking secure backend…":<><AlertCircle size={15}/> Connection needs attention</>}</strong>
   <p>{result==="connected"?`Private ledger reachable · ${queued??0} synthetic tasks awaiting action · no Upwork server feed`:result==="loading"?"Checking founder entitlement, accounting and test queue…":"See Connections to diagnose sign-in or API access. The website can still use its local pilot."}</p>
   <button className="sw-upwork-plain" type="button" onClick={onOpen}>{result==="connected"?"Open job execution":"Review connections"} →</button>
 </div>;
}