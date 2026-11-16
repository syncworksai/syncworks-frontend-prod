import React, {useEffect,useState} from "react";
import {useNavigate,useSearchParams} from "react-router-dom";
import {ArrowLeft,Mail,ShieldCheck,RefreshCw,Send,Plus,Reply,PlugZap} from "lucide-react";
import api from "../api/client";
import {useAuth} from "../auth/AuthContext";

const BASE="/sync-ai/assist/pilot/outlook/";
export default function SyncAssistEmail() {
  const navigate=useNavigate();
  const [searchParams]=useSearchParams();
  const {user}=useAuth();
  const pilot=String(user?.email||"").trim().toLowerCase()==="jacoblord7@outlook.com";
  const [status,setStatus]=useState(null),[messages,setMessages]=useState([]),[busy,setBusy]=useState(false);
  const [error,setError]=useState(""),[notice,setNotice]=useState(""),[selected,setSelected]=useState(null);
  const [editor,setEditor]=useState(false),[form,setForm]=useState({recipient:"",subject:"",body:"",reply_to_id:""});
  const [draft,setDraft]=useState(null),[confirm,setConfirm]=useState(false);
  const connection=searchParams.get("connection");

  async function refresh() {
    setBusy(true);setError("");
    try {
      const s=await api.get(BASE+"status/",{timeout:15000});
      setStatus(s.data);
      if(s.data.connected) {
        const result=await api.get(BASE+"inbox/",{timeout:25000});
        setMessages(result.data.messages||[]);
      } else setMessages([]);
    } catch(e) {setError(e?.response?.data?.detail || "Unable to read Outlook connection.");}
    finally {setBusy(false);}
  }
  useEffect(()=>{if(pilot) refresh();},[pilot]);

  async function connect() {
    setBusy(true);setError("");
    try {
      const res=await api.post(BASE+"connect/",{});
      const url=res.data.authorization_url;
      if(!url?.startsWith("https://login.microsoftonline.com/")) throw new Error("Invalid authorization URL");
      window.location.assign(url);
    } catch(e) {setError(e?.response?.data?.detail||e?.message||"Connection unavailable.");setBusy(false);}
  }
  function compose(message) {
    setSelected(message||null);
    setDraft(null);setConfirm(false);setNotice("");
    setForm(message ? {recipient:message.from,subject:message.subject,body:"",reply_to_id:message.id} : {recipient:"",subject:"",body:"",reply_to_id:""});
    setEditor(true);
  }
  async function saveDraft(e) {
    e.preventDefault();setBusy(true);setError("");setNotice("");
    try {
      const result=await api.post(BASE+"draft/",form,{timeout:25000});
      setDraft(result.data);setConfirm(false);
      setNotice("Saved in Outlook Drafts. It has NOT been sent.");
    } catch(e) {setError(e?.response?.data?.detail||"Could not save draft.");}
    finally {setBusy(false);}
  }
  async function sendApproved() {
    if(!draft || !confirm) return;
    setBusy(true);setError("");
    try {
      const result=await api.post(BASE+"send/",{draft_id:draft.draft_id,confirmation:"SEND"},{timeout:25000});
      if(result.data.sent){setNotice("Outlook accepted the send. Recipient: "+result.data.recipient);setDraft(null);setEditor(false);setConfirm(false);refresh();}
    } catch(e) {setError(e?.response?.data?.detail||"Send not confirmed. Check Outlook Sent Items before retrying.");}
    finally {setBusy(false);}
  }
  async function disconnect() {
    if(!window.confirm("Disconnect Outlook access from SyncWorks? This will stop app-side email access."))return;
    setBusy(true);setError("");
    try {await api.post(BASE+"disconnect/",{});setNotice("Disconnected from SyncWorks.");await refresh();}
    catch(e){setError(e?.response?.data?.detail||"Disconnect failed.");}
    finally {setBusy(false);}
  }
  return <main className="min-h-dvh bg-[#020617] px-4 pb-32 pt-28 text-white"><div className="mx-auto max-w-3xl">
    <button onClick={()=>navigate("/sync/assist/daily")} className="mb-4 flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-4 text-sm"><ArrowLeft size={17}/> Jarvis Daily</button>
    <section className="rounded-3xl border border-cyan-400/30 bg-gradient-to-br from-[#063047] to-[#1d103e] p-5">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cyan-200"><Mail size={18}/> Chief of Staff</div>
      <h1 className="mt-2 text-2xl font-black">Jarvis Mail Desk</h1>
      <p className="mt-2 text-sm leading-6 text-slate-300">Review Outlook, compose messages, prepare replies, and explicitly approve sending. Nothing is sent automatically.</p>
      <p className="mt-3 flex items-center gap-2 text-xs text-emerald-200"><ShieldCheck size={16}/> Server-side OAuth · Private pilot · Manual send confirmation</p>
    </section>
    {!pilot && <p className="mt-4 text-sm text-rose-300">Pilot account only.</p>}
    {connection && <p role="status" className="mt-3 rounded-xl border border-cyan-400/30 p-3 text-sm">Microsoft connection: {connection==="connected"?"connected":connection==="wrong_account"?"wrong email account selected":"not completed"}</p>}
    {error && <p role="alert" className="mt-3 rounded-xl border border-rose-400/50 p-3 text-sm text-rose-200">{error}</p>}
    {notice && <p role="status" className="mt-3 rounded-xl border border-emerald-400/30 p-3 text-sm text-emerald-200">{notice}</p>}
    <section className="mt-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between gap-2"><h2 className="font-black">Outlook connection</h2><span className="text-xs font-bold text-cyan-200">{status?.connected?"Connected":status?.configured?"Ready to connect":"Setup required"}</span></div>
      {!status?.configured ? <p className="mt-3 text-sm leading-6 text-amber-200">Microsoft authorization must be configured on the SyncWorks server before connecting. You do not need to provide your Microsoft password to Jarvis.</p> :
        !status?.connected ? <button disabled={busy} onClick={connect} className="mt-3 flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 text-sm font-black"><PlugZap size={17}/> Connect my Outlook</button> :
        <div className="mt-3 flex flex-wrap gap-2">
          <button disabled={busy} onClick={refresh} className="flex min-h-11 items-center gap-2 rounded-xl border border-cyan-400/30 px-4 text-sm"><RefreshCw size={16}/> Refresh inbox</button>
          <button disabled={busy} onClick={()=>compose(null)} className="flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 text-sm font-black"><Plus size={16}/> New message</button>
          <button disabled={busy} onClick={disconnect} className="min-h-11 rounded-xl border border-slate-600 px-4 text-xs text-slate-300">Disconnect</button>
        </div>}
    </section>
    {editor && status?.connected && <section className="mt-4 rounded-2xl border border-cyan-400/30 bg-slate-900 p-4">
      <h2 className="mb-3 font-black">{form.reply_to_id?"Reply to message":"Compose email"}</h2>
      <form onSubmit={saveDraft} className="space-y-3">
        <label className="block text-xs text-slate-300">To<input type="email" disabled={Boolean(form.reply_to_id)} required value={form.recipient} onChange={e=>setForm(v=>({...v,recipient:e.target.value}))} className="mt-1 min-h-11 w-full rounded-xl border border-white/20 bg-slate-950 p-3 text-white disabled:opacity-65"/></label>
        <label className="block text-xs text-slate-300">Subject<input required disabled={Boolean(form.reply_to_id)} value={form.subject} onChange={e=>setForm(v=>({...v,subject:e.target.value}))} className="mt-1 min-h-11 w-full rounded-xl border border-white/20 bg-slate-950 p-3 text-white disabled:opacity-65"/></label>
        <label className="block text-xs text-slate-300">Message<textarea rows={7} required maxLength={8000} value={form.body} onChange={e=>{setDraft(null);setConfirm(false);setForm(v=>({...v,body:e.target.value}));}} className="mt-1 w-full rounded-xl border border-white/20 bg-slate-950 p-3 text-sm leading-6 text-white" placeholder="Write or paste your Jarvis-prepared response…"/></label>
        <button type="submit" disabled={busy||!form.body.trim()} className="min-h-11 w-full rounded-xl bg-cyan-800 px-4 font-black disabled:opacity-40">Save reviewed Outlook draft</button>
      </form>
      {draft && <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-950/20 p-3">
        <strong className="text-sm text-amber-200">Final send approval</strong>
        <p className="mt-1 break-all text-xs text-slate-300">To: {draft.recipient} · {draft.subject}</p>
        <p className="mt-2 text-xs text-slate-400">Verify the recipient and exact message above before sending. No autonomous sending is enabled.</p>
        <label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" checked={confirm} onChange={e=>setConfirm(e.target.checked)} className="mt-1"/>I approve sending this exact draft to this recipient.</label>
        <button type="button" disabled={busy||!confirm} onClick={sendApproved} className="mt-3 flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-black disabled:opacity-40"><Send size={16}/> Send approved email</button>
      </div>}
      <button type="button" onClick={()=>{setEditor(false);setDraft(null);}} className="mt-3 min-h-10 rounded-xl border border-slate-700 px-4 text-xs">Close editor</button>
    </section>}
    {status?.connected && <section className="mt-4 rounded-2xl border border-white/10 bg-slate-900/50 p-4">
      <h2 className="mb-3 text-lg font-black">Recent incoming mail</h2>
      {messages.length===0 ? <p className="text-sm text-slate-400">{busy?"Loading…":"No recent messages returned."}</p> :
        <div className="space-y-2">{messages.map(m=><article key={m.id} className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
          <div className="flex justify-between gap-2"><strong className="min-w-0 break-words text-sm">{m.subject}</strong><span className="shrink-0 text-[10px] text-slate-400">{m.received_at?.slice(0,10)}</span></div>
          <p className="mt-1 break-all text-xs text-cyan-200">{m.from}</p>
          <p className="mt-2 text-xs leading-5 text-slate-300">{m.preview}</p>
          <button type="button" onClick={()=>compose(m)} className="mt-2 flex min-h-10 items-center gap-2 rounded-lg border border-cyan-400/30 px-3 text-xs text-cyan-100"><Reply size={15}/> Prepare reply</button>
        </article>)}</div>}
    </section>}
    <p className="mt-4 text-xs leading-5 text-slate-400">Inbox refresh is on demand in this build. Automatic daily classification, learned writing style, unattended email monitoring, and permission-scoped automatic replies remain later stages.</p>
  </div></main>;
}
