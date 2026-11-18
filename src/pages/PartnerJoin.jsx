import React,{useEffect,useState} from "react";
import {Link,useNavigate,useSearchParams} from "react-router-dom";
import {Handshake,ShieldCheck,CheckCircle2} from "lucide-react";
import api from "../api/client";
import {useAuth} from "../auth/AuthContext";

export default function PartnerJoin(){
 const [params]=useSearchParams(),token=params.get("token")||"";
 const {user,activeBusinessId,booting}=useAuth(),nav=useNavigate();
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(""),[error,setError]=useState("");
 const next=`/partner/join?token=${encodeURIComponent(token)}`;
 const claim=async()=>{
  setBusy(true);setError("");
  try{await api.post("/business-partner-invitations/respond/",{token,decision:"ACCEPT"});
   setNotice("Partner connection accepted. Your work offers are available in the partner workspace.");
  }catch(e){setError(e.response?.data?.email||e.response?.data?.business||e.response?.data?.token||e.response?.data?.detail||"Unable to accept this invitation. Verify your invited email and active business.");}
  finally{setBusy(false);}
 };
 return <div className="grid min-h-[calc(100dvh-135px)] place-items-center bg-[#061227] p-4 text-white"><section className="w-full max-w-lg rounded-3xl border border-cyan-400/30 bg-[#0a1b32]/95 p-6 shadow-2xl">
  <div className="flex items-center gap-2 text-cyan-200"><Handshake size={22}/><span className="text-xs font-bold uppercase tracking-widest">SyncWorks Partner Network</span></div>
  <h1 className="mt-4 text-2xl font-bold">Accept subcontractor invitation</h1>
  <p className="mt-2 text-sm leading-6 text-slate-300">Connect with the inviting business to receive job offers, respond to assignments, and manage your field work in SyncWorks.</p>
  {!token&&<p role="alert" className="mt-4 text-amber-200">This invitation link is incomplete. Request a new link.</p>}
  {error&&<p role="alert" className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{String(error)}</p>}
  {notice?<div className="mt-4"><p className="flex items-center gap-2 text-emerald-200"><CheckCircle2 size={19}/>{notice}</p><button onClick={()=>nav("/partner/workspace")} className="mt-4 w-full rounded-xl bg-cyan-400 p-3 font-bold text-slate-950">Open my work board</button></div>:
  !user?<div className="mt-5 grid grid-cols-2 gap-2"><Link to={`/register?next=${encodeURIComponent(next)}`} className="rounded-xl bg-cyan-400 p-3 text-center text-sm font-bold text-slate-950">Create account</Link><Link to={`/login?next=${encodeURIComponent(next)}`} className="rounded-xl border border-cyan-400/40 p-3 text-center text-sm">Sign in</Link></div>:
  activeBusinessId?<button disabled={!token||busy} onClick={claim} className="mt-5 w-full rounded-xl bg-cyan-400 p-3 font-bold text-slate-950 disabled:opacity-40">{busy?"Connecting…":"Accept invitation"}</button>:
  <div className="mt-4 rounded-xl border border-amber-400/30 p-3"><p className="text-sm text-amber-100">Your account needs a business profile before you can accept this business-to-business invitation.</p><button onClick={()=>nav(`/sbo/settings/general?setup=1&return=${encodeURIComponent(next)}`)} className="mt-3 rounded-xl border border-cyan-400/35 p-3 text-sm">Set up business profile</button></div>}
  <p className="mt-4 flex gap-2 text-xs text-slate-400"><ShieldCheck size={17} className="shrink-0"/>Acceptance requires the invited email address to be verified. The partner work board is separate from the optional paid full-business dashboard.</p>
 </section></div>;
}
