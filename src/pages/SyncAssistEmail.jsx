import React, {useEffect,useState} from "react";
import {useNavigate,useSearchParams} from "react-router-dom";
import {ArrowLeft,Mail,ShieldCheck,RefreshCw,Send,Plus,Reply,PlugZap} from "lucide-react";
import api from "../api/client";
import "./SyncAssistEmailMobile.css";
import {useAuth} from "../auth/AuthContext";
import {useWorkspaceAppearance} from "../components/customer/CustomerWorkspace";
import "../components/sync/SyncAssistTheme.css";
import SyncAssistMultiMailboxes from "../components/sync/SyncAssistMultiMailboxes";

const BASE="/sync-ai/assist/pilot/outlook/";
export default function SyncAssistEmail() {
  const navigate=useNavigate();
  const [searchParams]=useSearchParams();
  const {user}=useAuth();
  const [appearance]=useWorkspaceAppearance();
  const [setupOpen,setSetupOpen]=useState(false);
  const pilot=String(user?.email||"").trim().toLowerCase()==="jacoblord7@outlook.com";
  const [status,setStatus]=useState(null),[messages,setMessages]=useState([]),[busy,setBusy]=useState(false);
  const [error,setError]=useState(""),[notice,setNotice]=useState(""),[selected,setSelected]=useState(null);
  const [mobilePanel,setMobilePanel]=useState("connection");
  const [editor,setEditor]=useState(false),[form,setForm]=useState({recipient:"",subject:"",body:"",reply_to_id:""});
  const [draft,setDraft]=useState(null),[confirm,setConfirm]=useState(false);
  const [brief,setBrief]=useState(null),[briefOpen,setBriefOpen]=useState(false);
  const [preferences,setPreferences]=useState(null),[prefsOpen,setPrefsOpen]=useState(false);
  const [direction,setDirection]=useState("");
  const connection=searchParams.get("connection");

  async function refresh() {
    setBusy(true);setError("");
    try {
      const s=await api.get(BASE+"status/",{timeout:15000});
      setStatus(s.data);
      if(s.data.connected) {
        setMobilePanel(current=>current==="connection"?"inbox":current);
        const result=await api.get(BASE+"inbox/",{timeout:25000});
        setMessages(result.data.messages||[]);
      } else setMessages([]);
    } catch(e) {setError(e?.response?.data?.detail || "Unable to read Outlook connection.");}
    finally {setBusy(false);}
  }
  useEffect(()=>{if(pilot) {
    refresh();
    api.get("/sync-ai/assist/pilot/chief-of-staff/preferences/").then(r=>setPreferences(r.data.preferences)).catch(()=>{});
  }},[pilot]);

  async function savePreferences(e) {
    e.preventDefault();setBusy(true);setError("");
    try {
      const r=await api.post("/sync-ai/assist/pilot/chief-of-staff/preferences/",preferences);
      setPreferences(r.data.preferences);setNotice("Writing preferences saved. Automatic sending is still disabled.");
    } catch(e){setError(e?.response?.data?.detail||"Could not save writing preferences.");}
    finally{setBusy(false);}
  }

  async function suggestEmail() {
    if(!form.reply_to_id && (!form.recipient||!form.subject||!direction.trim())){
      setError("Enter a recipient, subject and instructions for the new email.");return;
    }
    setBusy(true);setError("");setNotice("");
    try {
      const r=await api.post(BASE+"suggest/",{
        message_id:form.reply_to_id,recipient:form.recipient,subject:form.subject,purpose:direction
      },{timeout:45000});
      setForm(v=>({...v,body:r.data.draft}));
      setDraft(null);setConfirm(false);setNotice("Draft suggestion prepared. Check the facts, edit the text, then save it as an Outlook draft.");
    } catch(e){setError(e?.response?.data?.detail||"Jarvis could not prepare an email.");}
    finally{setBusy(false);}
  }
  async function briefMe() {
    setBusy(true);setError("");
    try {const r=await api.post(BASE+"brief/",{}, {timeout:45000});setBrief(r.data);setBriefOpen(true);setMobilePanel("brief");}
    catch(e){setError(e?.response?.data?.detail||"Briefing unavailable.");}
    finally{setBusy(false);}
  }

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
    setDraft(null);setConfirm(false);setNotice("");setDirection("");
    setForm(message ? {recipient:message.reply_to||message.from,subject:message.subject,body:"",reply_to_id:message.id} : {recipient:"",subject:"",body:"",reply_to_id:""});
    setEditor(true);setMobilePanel("compose");
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
      if(result.data.sent){setNotice("Outlook accepted the send. Recipient: "+result.data.recipient);setDraft(null);setEditor(false);setConfirm(false);setMobilePanel("inbox");refresh();}
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
  return <main data-mobile-panel={mobilePanel} data-assist-theme={appearance.theme} data-assist-motion={appearance.motion?"on":"off"} className="sw-assist-themed sw-mail-page h-[calc(100dvh-155px)] min-h-[360px] overflow-hidden px-3 py-3 text-white sm:px-4"><div className="sw-mail-layout mx-auto flex h-full min-h-0 max-w-6xl flex-col overflow-hidden">

    <section className="sw-mail-hero sw-assist-panel shrink-0 rounded-2xl border p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cyan-200"><Mail size={18}/> Chief of Staff</div>
      <div className="flex items-center justify-between gap-2"><h1 className="mt-1 text-lg font-black">SYNC Mail Desk</h1><button onClick={()=>navigate("/sync/assist/daily")} className="flex items-center gap-1 rounded-lg border border-white/20 px-3 py-2 text-xs"><ArrowLeft size={14}/> Back</button></div>
      <p className="mt-1 text-xs text-slate-300">Connect and label mailboxes · read messages · prepare reviewed replies · no automatic sends</p>
      <p className="mt-3 flex items-center gap-2 text-xs text-emerald-200"><ShieldCheck size={16}/> Secure Microsoft connection · Send approval required</p>
    </section>
    {!pilot && <p className="mt-4 text-sm text-rose-300">Email connections are not yet available for this account.</p>}
    {connection && <p role="status" className="mt-3 rounded-xl border border-cyan-400/30 p-3 text-sm">Microsoft connection: {connection==="connected"?"connected":connection==="wrong_account"?"wrong email account selected":"not completed"}</p>}
    {error && <p role="alert" className="mt-3 rounded-xl border border-rose-400/50 p-3 text-sm text-rose-200">{error}</p>}
    {notice && <p role="status" className="mt-3 rounded-xl border border-emerald-400/30 p-3 text-sm text-emerald-200">{notice}</p>}
    <nav className="sw-mail-mobile-tabs" role="group" aria-label="Mail Desk views">
      <button type="button" onClick={()=>setMobilePanel("connection")} aria-pressed={mobilePanel==="connection"}>Accounts</button>
      <button type="button" onClick={()=>setMobilePanel("inbox")} aria-pressed={mobilePanel==="inbox"}>Primary inbox</button>
      <button type="button" onClick={()=>{setMobilePanel("preferences");setPrefsOpen(true)}} aria-pressed={mobilePanel==="preferences"}>Writing</button>
      <button type="button" onClick={()=>compose(null)} aria-pressed={mobilePanel==="compose"}>Compose</button>
      {brief&&<button type="button" onClick={()=>setMobilePanel("brief")} aria-pressed={mobilePanel==="brief"}>Brief</button>}
    </nav>
    <section className="sw-mail-connection sw-assist-panel mt-3 rounded-2xl border p-4">
      <div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-sm font-bold">Mail accounts and permissions</h2><span className="text-[11px] text-slate-300">Microsoft mailbox connections</span></div>
      <SyncAssistMultiMailboxes/>
      <div className="mt-3 rounded-xl border border-white/15 bg-black/10 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><strong className="text-xs">Primary Outlook account</strong><p className="text-[11px] text-slate-300">jacoblord7@outlook.com · Email drafts and approvals</p></div><span className="text-[10px] text-cyan-200">{status?.connected?"Connected":status?.configured?"Ready to connect":"Setup required"}</span></div>
        <div className="mt-2 flex flex-wrap gap-2">{status?.configured&&!status?.connected&&<button disabled={busy} onClick={connect} className="rounded-lg border border-cyan-300/40 bg-cyan-400/15 px-3 py-2 text-xs">Connect primary Outlook</button>}
        {status?.connected&&<><button disabled={busy} onClick={()=>{setMobilePanel("inbox");refresh()}} className="rounded-lg border border-white/20 px-3 py-2 text-xs">Open primary inbox</button><button disabled={busy} onClick={briefMe} className="rounded-lg border border-white/20 px-3 py-2 text-xs">Brief inbox</button><button disabled={busy} onClick={()=>compose(null)} className="rounded-lg border border-white/20 px-3 py-2 text-xs">Compose</button><button disabled={busy} onClick={disconnect} className="rounded-lg border border-rose-300/25 px-3 py-2 text-xs">Disconnect primary</button></>}</div>
      </div>
      <div className="mt-3 rounded-xl border border-white/15 bg-black/10 p-3">
        <button type="button" onClick={()=>setSetupOpen(v=>!v)} aria-expanded={setupOpen} className="flex w-full items-center justify-between text-left text-xs font-bold"><span>Connect your email · Setup guide</span><span>{setupOpen?"−":"+"}</span></button>
        {setupOpen&&<ol className="mt-2 list-inside list-decimal space-y-1.5 text-[11px] leading-5 text-slate-200">
          <li>An administrator registers a Microsoft Entra application with personal and organizational account support.</li>
          <li>Configure Graph delegated permissions for the intended mailbox scopes. Keep application credentials on Render, not in the browser.</li>
          <li>Register the exact callback path <code>/api/v1/sync-ai/assist/pilot/mailboxes/callback/</code> on the backend's HTTPS host and set <code>SYNC_ASSIST_MS_MULTI_REDIRECT_URI</code> to that URL.</li>
          <li>Set the Microsoft client ID, client secret and encryption key as server environment values.</li>
          <li>When the service reports ready, choose a mailbox label, purpose and importance, then use Microsoft's authorization screen.</li>
          <li>Connect each mailbox independently; Sarah receives only property-approved data after role-specific delegation is implemented.</li>
        </ol>}
      </div>
    </section>
    {briefOpen && brief && <section className="sw-mail-brief sw-assist-panel mt-3 rounded-2xl border p-4">
      <div className="flex items-center justify-between"><h2 className="font-black">Inbox Brief</h2><button onClick={()=>setBriefOpen(false)} className="min-h-10 rounded-lg border border-slate-600 px-3 text-xs">Close</button></div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-200">{brief.summary}</p>
      <p className="mt-2 text-xs text-slate-400">{brief.messages_reviewed} recent messages reviewed · {brief.unread_in_sample} unread in sample. Based on previews only; open full threads for verification.</p>
    </section>}
    <section className="sw-mail-preferences sw-assist-panel mt-3 rounded-2xl border p-4">
      <button type="button" aria-expanded={prefsOpen} onClick={()=>setPrefsOpen(v=>!v)} className="flex min-h-11 w-full items-center justify-between text-left font-black text-cyan-100">
        <span>Writing preferences<span className="block text-xs font-normal text-slate-400">Tone · Signature · Instructions · Review required</span></span><span>{prefsOpen?"−":"+"}</span>
      </button>
      {prefsOpen && <form onSubmit={savePreferences} className="mt-3 space-y-3">
        {!preferences ? <p className="text-sm text-slate-400">Loading your preferences…</p> : <>
        <label className="block text-xs text-slate-300">Preferred tone<select value={preferences.tone} onChange={e=>setPreferences(v=>({...v,tone:e.target.value}))} className="mt-1 min-h-11 w-full rounded-lg border border-slate-600 bg-slate-950 p-3">{["professional","friendly","direct","concise"].map(t=><option key={t}>{t}</option>)}</select></label>
        <label className="block text-xs text-slate-300">Signature<input maxLength={160} value={preferences.signature} onChange={e=>setPreferences(v=>({...v,signature:e.target.value}))} className="mt-1 min-h-11 w-full rounded-lg border border-slate-600 bg-slate-950 p-3" placeholder="Your preferred sign-off"/></label>
        <label className="block text-xs text-slate-300">My writing rules<textarea required maxLength={1200} rows={4} value={preferences.writing_rules} onChange={e=>setPreferences(v=>({...v,writing_rules:e.target.value}))} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 p-3" placeholder="Describe your preferred writing style"/></label>
        <p className="text-xs text-amber-200">Your rules guide future suggestions. SYNC will not send emails automatically based on these preferences.</p>
        <button type="submit" disabled={busy} className="min-h-11 rounded-lg bg-cyan-700 px-4 text-sm font-bold">Save writing preferences</button>
        </>}
      </form>}
    </section>
        {editor && status?.connected && <section className="sw-mail-compose sw-assist-panel mt-3 rounded-2xl border p-4">
      <h2 className="mb-3 font-black">{form.reply_to_id?"Reply to message":"Compose email"}</h2>
      <form onSubmit={saveDraft} className="space-y-3">
        <label className="block text-xs text-slate-300">To<input type="email" disabled={Boolean(form.reply_to_id)} required value={form.recipient} onChange={e=>setForm(v=>({...v,recipient:e.target.value}))} className="mt-1 min-h-11 w-full rounded-xl border border-white/20 bg-slate-950 p-3 text-white disabled:opacity-65"/></label>
        <label className="block text-xs text-slate-300">Subject<input required disabled={Boolean(form.reply_to_id)} value={form.subject} onChange={e=>setForm(v=>({...v,subject:e.target.value}))} className="mt-1 min-h-11 w-full rounded-xl border border-white/20 bg-slate-950 p-3 text-white disabled:opacity-65"/></label>
        <label className="block text-xs text-slate-300">What should this message say (optional for a reply)<textarea rows={2} maxLength={800} value={direction} onChange={e=>setDirection(e.target.value)} className="mt-1 w-full rounded-xl border border-white/20 bg-slate-950 p-3 text-sm text-white" placeholder="e.g. Ask for a detailed reconciliation of the MHA payments without assuming a balance was paid."/></label>
        <button type="button" onClick={suggestEmail} disabled={busy} className="min-h-11 w-full rounded-xl border border-purple-400/40 bg-purple-900/30 px-4 text-sm font-bold text-purple-100 disabled:opacity-40">Prepare suggestion</button>
        <label className="block text-xs text-slate-300">Message<textarea rows={7} required maxLength={8000} value={form.body} onChange={e=>{setDraft(null);setConfirm(false);setForm(v=>({...v,body:e.target.value}));}} className="mt-1 w-full rounded-xl border border-white/20 bg-slate-950 p-3 text-sm leading-6 text-white" placeholder="Write or paste your prepared response…"/></label>
        <button type="submit" disabled={busy||!form.body.trim()} className="min-h-11 w-full rounded-xl bg-cyan-800 px-4 font-black disabled:opacity-40">Save reviewed Outlook draft</button>
      </form>
      {draft && <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-950/20 p-3">
        <strong className="text-sm text-amber-200">Final send approval</strong>
        <p className="mt-1 break-all text-xs text-slate-300">To: {draft.recipient} · {draft.subject}</p>
        <p className="mt-2 text-xs text-slate-400">Verify the recipient and exact message above before sending. No autonomous sending is enabled.</p>
        <label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" checked={confirm} onChange={e=>setConfirm(e.target.checked)} className="mt-1"/>I approve sending this exact draft to this recipient.</label>
        <button type="button" disabled={busy||!confirm} onClick={sendApproved} className="mt-3 flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-black disabled:opacity-40"><Send size={16}/> Send approved email</button>
      </div>}
      <button type="button" onClick={()=>{setEditor(false);setDraft(null);setMobilePanel("inbox");}} className="mt-3 min-h-10 rounded-xl border border-slate-700 px-4 text-xs">Close editor</button>
    </section>}
    {status?.connected && <section className="sw-mail-inbox sw-assist-panel mt-3 rounded-2xl border p-4">
      <h2 className="mb-3 text-lg font-black">Recent incoming mail</h2>
      {messages.length===0 ? <p className="text-sm text-slate-400">{busy?"Loading…":"No recent messages returned."}</p> :
        <div className="space-y-2">{messages.map(m=><article key={m.id} className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
          <div className="flex justify-between gap-2"><strong className="min-w-0 break-words text-sm">{m.subject}</strong><span className="shrink-0 text-[10px] text-slate-400">{m.received_at?.slice(0,10)}</span></div>
          <p className="mt-1 break-all text-xs text-cyan-200">{m.from}</p>
          <p className="mt-2 text-xs leading-5 text-slate-300">{m.preview}</p>
          <button type="button" onClick={()=>compose(m)} className="mt-2 flex min-h-10 items-center gap-2 rounded-lg border border-cyan-400/30 px-3 text-xs text-cyan-100"><Reply size={15}/> Prepare reply</button>
        </article>)}</div>}
    </section>}

  </div></main>;
}
