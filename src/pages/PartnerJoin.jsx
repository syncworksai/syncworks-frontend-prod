import React,{useEffect,useState} from "react";
import {Link,useNavigate,useSearchParams} from "react-router-dom";
import {Handshake,ShieldCheck,CheckCircle2,LogOut,UserPlus,LogIn} from "lucide-react";
import api from "../api/client";
import {useAuth} from "../auth/AuthContext";

export default function PartnerJoin(){
 const [params]=useSearchParams(),token=params.get("token")||"";
 const {user,activeBusinessId,booting,logout}=useAuth(),nav=useNavigate();
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(""),[error,setError]=useState("");
 const next=`/partner/join?token=${encodeURIComponent(token)}`;
 const loginPath=`/login?next=${encodeURIComponent(next)}`;
 const registerPath=`/register?role=personal&next=${encodeURIComponent(next)}`;
 const switchAccount=async()=>{setError("");setNotice("");await logout();nav(loginPath,{replace:true});};
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
  <div className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-400/[.06] p-3 text-sm">
   {booting?<p className="text-slate-300">Checking your session…</p>:user?<div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><p className="text-xs text-slate-400">Currently signed in as</p><strong className="break-all text-cyan-100">{user.email||user.username||"Current SyncWorks account"}</strong><p className="mt-1 text-xs text-slate-300">Invited another email? Switch accounts before accepting.</p></div><button type="button" onClick={switchAccount} className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/40 px-3 py-2 text-xs font-semibold text-cyan-100"><LogOut size={15}/> Switch account</button></div>:<div><p className="font-semibold text-white">Choose how to continue</p><p className="mt-1 text-xs text-slate-300">Sign in with the invited email, or create a free account using that address.</p><div className="mt-3 grid grid-cols-2 gap-2"><Link to={loginPath} className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-300/40 px-2 py-3 text-xs font-semibold text-cyan-100"><LogIn size={16}/> Sign in</Link><Link to={registerPath} className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-2 py-3 text-xs font-bold text-slate-950"><UserPlus size={16}/> Create account</Link></div></div>}
  </div>
  {!token&&<p role="alert" className="mt-4 text-amber-200">This invitation link is incomplete. Request a new link.</p>}
  {error&&<p role="alert" className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{String(error)}</p>}
  {notice?<div className="mt-4"><p className="flex items-center gap-2 text-emerald-200"><CheckCircle2 size={19}/>{notice}</p><button onClick={()=>nav("/partner/workspace")} className="mt-4 w-full rounded-xl bg-cyan-400 p-3 font-bold text-slate-950">Open my work board</button></div>:
  !user?<p className="mt-4 text-center text-xs text-slate-300">Your invitation will remain available after you sign in or register.</p>:
  activeBusinessId?<button disabled={!token||busy||booting} onClick={claim} className="mt-5 w-full rounded-xl bg-cyan-400 p-3 font-bold text-slate-950 disabled:opacity-40">{busy?"Connecting…":"Accept invitation"}</button>:
  <div className="mt-4 rounded-xl border border-amber-400/30 p-3"><p className="text-sm text-amber-100">Your account needs a business profile before you can accept this business-to-business invitation.</p><button onClick={()=>nav(`/sbo/settings/general?setup=1&return=${encodeURIComponent(next)}`)} className="mt-3 rounded-xl border border-cyan-400/35 p-3 text-sm">Set up business profile</button></div>}
  <p className="mt-4 flex gap-2 text-xs text-slate-400"><ShieldCheck size={17} className="shrink-0"/>Acceptance requires the invited email address to be verified. The partner work board is separate from the optional paid full-business dashboard.</p>
 </section></div>;
}
