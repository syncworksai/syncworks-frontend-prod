import React,{useEffect,useState} from "react";
import {Link,useNavigate,useSearchParams} from "react-router-dom";
import {CheckCircle2,Mail,ShieldCheck} from "lucide-react";
import api from "../api/client";
import {useAuth} from "../auth/AuthContext";

export default function CustomerBusinessConnect(){
 const [params]=useSearchParams(),token=params.get("token")||"";
 const {user,booting}=useAuth();
 const nav=useNavigate();
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[connected,setConnected]=useState(null);
 const next=`/customer/connect?token=${encodeURIComponent(token)}`;
 async function claim(){
  if(!token||busy)return;
  setBusy(true);setError("");
  try{const res=await api.post("/customer/connection/claim/",{token});setConnected(res.data);}
  catch(e){setError(e?.response?.data?.detail||"Unable to connect your service request.");}
  finally{setBusy(false);}
 }
 return <div className="relative grid min-h-[calc(100dvh-130px)] place-items-center bg-[#020b1b] p-4 text-white" style={{backgroundImage:"linear-gradient(135deg,rgba(3,12,30,.8),rgba(9,22,49,.65)),url('/office-themes/syncworks-future.webp')",backgroundSize:"cover",backgroundPosition:"center"}}>
  <section className="w-full max-w-lg rounded-3xl border border-cyan-300/35 bg-[#07132c]/85 p-6 shadow-2xl backdrop-blur-2xl">
   <div className="mb-4 flex items-center gap-2 text-cyan-200"><ShieldCheck size={22}/><span className="text-xs font-bold uppercase tracking-widest">SyncWorks customer connection</span></div>
   {connected?<><CheckCircle2 size={34} className="text-emerald-300"/><h1 className="mt-3 text-2xl font-bold">Connected to {connected.business_name}</h1><p className="mt-2 text-sm text-slate-300">Your service request and appointments are now available on your dashboard and calendar.</p><button onClick={()=>nav("/customer")} className="mt-5 w-full rounded-xl bg-cyan-400 px-4 py-3 font-bold text-slate-950">Go to customer dashboard</button></>:
   <><h1 className="text-2xl font-bold">Connect your service request</h1><p className="mt-2 text-sm leading-6 text-slate-300">The service business invited you to keep all your job details, appointments and service updates in your free SyncWorks account.</p>
    {!token&&<p role="alert" className="mt-3 text-sm text-amber-200">Your invitation link is incomplete. Ask the service business for a new invitation.</p>}
    {error&&<p role="alert" className="mt-3 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
    {!booting&&!user?<div className="mt-5 grid gap-2 sm:grid-cols-2"><Link to={`/register?next=${encodeURIComponent(next)}`} className="rounded-xl bg-cyan-400 px-4 py-3 text-center text-sm font-bold text-slate-950">Create free account</Link><Link to={`/login?next=${encodeURIComponent(next)}`} className="rounded-xl border border-cyan-400/40 px-4 py-3 text-center text-sm">Sign in</Link></div>:<button disabled={!token||busy||booting} onClick={claim} className="mt-5 w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-50">{busy?"Connecting…":"Connect to this business"}</button>}
    <p className="mt-4 flex items-start gap-2 text-xs text-slate-400"><Mail size={16} className="shrink-0"/>For your security, the email on your SyncWorks account must match the verified address that received this invitation.</p>
   </>}
  </section>
 </div>;
}
