import React,{useEffect,useState} from "react";
import api from "../api/client";
import {Cloud,RefreshCw,ShieldCheck,AlertCircle} from "lucide-react";
// The freelance backend applies a 30-requests/hour pilot rate limit.
// Avoid spending three requests on every tab switch or mounting multiple checks.
let cache={time:0,status:null};
let inflight=null;
const TTL_MS=45000;
async function check(force=false){
 if(!force&&cache.status&&Date.now()-cache.time<TTL_MS)return cache.status;
 if(inflight)return inflight;
 inflight=api.get("/sync-ai/freelance/pilot/access/").then(({data})=>{
  const status=data?.enabled?"connected":"unavailable";
  cache={time:Date.now(),status};
  return status;
 }).catch(()=>{
  cache={time:Date.now(),status:"unavailable"};
  return "unavailable";
 }).finally(()=>{inflight=null;});
 return inflight;
}
export default function FreelanceBackendStatus({onOpen}){
 const [result,setResult]=useState(cache.status||"loading");
 const refresh=async(force=false)=>{
  setResult("loading");
  setResult(await check(force));
 };
 useEffect(()=>{
  let mounted=true;
  check().then(status=>{if(mounted)setResult(status)});
  return()=>{mounted=false};
 },[]);
 return <div className="sw-upwork-glass sw-freelance-insight-card" aria-label="Freelance backend readiness">
   <div className="sw-upwork-section-head"><span className="sw-upwork-eyebrow"><Cloud size={14}/> BACKEND READINESS</span>
   <button className="sw-upwork-plain" type="button" aria-label="Recheck cloud service" onClick={()=>refresh(true)}><RefreshCw size={14}/></button></div>
   <strong style={{display:"flex",alignItems:"center",gap:8}}>{result==="connected"?<><ShieldCheck size={15}/> Founder access available</>:result==="loading"?"Checking secure backend…":<><AlertCircle size={15}/> Connection needs attention</>}</strong>
   <p>{result==="connected"?"Founder API entitlement verified. Open Earnings to check your ledger or Automation Studio to view test jobs. No live Upwork server feed.":result==="loading"?"Checking authenticated founder entitlement…":"Open Connections to investigate account or API access. The browser-only pilot remains available."}</p>
   <button className="sw-upwork-plain" type="button" onClick={onOpen}>{result==="connected"?"Open job execution":"Review connections"} →</button>
 </div>;
}
