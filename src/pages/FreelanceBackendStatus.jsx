import React,{useEffect,useState} from "react";
import api,{getApiErrorStatus,getToken} from "../api/client";
import {Cloud,RefreshCw,ShieldCheck,AlertCircle} from "lucide-react";

// Only probe the founder entitlement. The backend has a 30/hour limit.
// Keep errors categorized; never display bearer tokens or raw backend exceptions.
let cache={time:0,outcome:null};
let inflight=null;
const TTL_MS=45000;
function classify(error){
 const status=getApiErrorStatus(error);
 if(status===401)return {kind:"unauthorized",label:"Session authentication required",message:"Your login session was not accepted by the Freelance API. Sign in again, then recheck.",code:"HTTP 401"};
 if(status===403)return {kind:"forbidden",label:"Founder authorization denied",message:"Your account reached the API but was not allowed. Verify the server's founder entitlement and account identity.",code:"HTTP 403"};
 if(status===404)return {kind:"not-found",label:"Freelance route unavailable",message:"The API host responded but the Freelance endpoint was not found. Verify routing to the current backend deployment.",code:"HTTP 404"};
 if(status===429)return {kind:"limited",label:"Pilot request limit reached",message:"The private pilot API is temporarily rate limited. Avoid repeated refreshes.",code:"HTTP 429"};
 if(status>=500)return {kind:"server",label:"Backend service error",message:"The server failed while handling the request. Check Render application logs.",code:"HTTP "+status};
 if(status)return {kind:"other",label:"Backend request rejected",message:"The founder-access check returned an unexpected HTTP response.",code:"HTTP "+status};
 const code=error?.code||"";
 if(code==="ECONNABORTED")return {kind:"timeout",label:"Backend connection timed out",message:"The API did not respond within the request timeout. Check API routing and service health.",code:"TIMEOUT"};
 return {kind:"network",label:"API network or CORS error",message:"The browser did not receive an HTTP response. Check the API domain, browser network requests, and cross-origin settings.",code:"NO HTTP RESPONSE"};
}
async function check(force=false){
 if(!force&&cache.outcome&&Date.now()-cache.time<TTL_MS)return cache.outcome;
 if(inflight)return inflight;
 inflight=(!getToken()?Promise.resolve({kind:"unauthorized",label:"Please sign in",message:"No saved session token is available for this API request.",code:"NO SESSION"}):api.get("/sync-ai/freelance/pilot/access/").then(({data})=>data?.enabled?{kind:"connected",label:"Founder access available",message:"The authenticated Freelance access endpoint responded successfully. Check Earnings or Automation Studio for their individual services.",code:"HTTP 200"}:{kind:"other",label:"Unexpected access response",message:"The backend did not confirm founder entitlement.",code:"UNEXPECTED RESPONSE"}).catch(classify)).then(outcome=>{cache={time:Date.now(),outcome};return outcome}).finally(()=>{inflight=null});
 return inflight;
}
export default function FreelanceBackendStatus({onOpen}){
 const [result,setResult]=useState(cache.outcome||null);
 const refresh=async()=>{
  setResult(null);
  setResult(await check(true));
 };
 useEffect(()=>{
  let mounted=true;
  check().then(outcome=>{if(mounted)setResult(outcome)});
  return()=>{mounted=false};
 },[]);
 const isConnected=result?.kind==="connected";
 return <div className="sw-upwork-glass sw-freelance-insight-card" aria-label="Freelance backend readiness">
  <div className="sw-upwork-section-head">
   <span className="sw-upwork-eyebrow"><Cloud size={14}/> BACKEND READINESS</span>
   <button className="sw-upwork-plain" type="button" aria-label="Recheck cloud service" onClick={refresh}><RefreshCw size={14}/></button>
  </div>
  <strong style={{display:"flex",alignItems:"center",gap:8}}>{result?(isConnected?<ShieldCheck size={15}/>:<AlertCircle size={15}/>):null}{result?.label||"Checking secure backend…"}</strong>
  <p>{result?.message||"Checking authenticated founder entitlement…"}</p>
  {result&&<span style={{fontSize:10,color:"var(--uw-accent)"}}>{result.code}</span>}
  <button className="sw-upwork-plain" type="button" onClick={onOpen}>{isConnected?"Open job execution":"Open diagnostic workspace"} →</button>
 </div>;
}
