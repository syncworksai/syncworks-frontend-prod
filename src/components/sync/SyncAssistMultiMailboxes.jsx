import React,{useCallback,useEffect,useState} from "react";
import {MailPlus,RefreshCw,Inbox,ShieldCheck,Trash2,ChevronLeft} from "lucide-react";
import api from "../../api/client";
// OAuth start, callback, and token storage must use the same Ohio service.
const BASE="https://syncworks-backend-prod.onrender.com/api/v1/sync-ai/assist/pilot/mailboxes/";
const TYPES=["PERSONAL","PROPERTY","SYNCWORKS","FINANCE","OTHER"];
const LEVELS=["CRITICAL","HIGH","NORMAL","LOW"];
const OAUTH_MESSAGES={"connected":"Outlook authorization completed. Refresh to confirm the mailbox appears.","consent_denied":"Microsoft authorization was declined. No mailbox was connected.","microsoft_rejected":"Microsoft rejected authorization. Check app account types and registered redirect URI.","config_missing":"Ohio Render is missing or has invalid Microsoft OAuth settings.","authorization_missing":"Microsoft did not return an authorization code.","state_invalid":"The OAuth request could not be verified. Start a fresh connection from Mail Desk; the entire flow now uses Ohio.","state_expired":"Authorization expired or was already used. Start a fresh connection.","account_context_mismatch":"The OAuth callback could not find the initiating account on Ohio. Check the production account/database routing.","token_exchange_failed":"Microsoft returned a code, but SyncWorks could not exchange it for a token. Check the rotated client secret and exact Ohio redirect URI.","token_incomplete":"Microsoft did not return the credentials needed for continued inbox access.","profile_failed":"Microsoft authorized, but SyncWorks couldn't read the account profile. Check User.Read permission.","account_missing":"Microsoft didn't provide a usable mailbox address.","save_failed":"SyncWorks could not save the mailbox securely. Review Ohio backend logs.","provider_timeout":"Microsoft did not respond in time. Please retry.","provider_unavailable":"Microsoft is temporarily unavailable. Please retry.","unauthorized":"This SyncWorks account cannot connect this mailbox.","limit":"Maximum number of connected mailboxes reached."};
export default function SyncAssistMultiMailboxes(){
 const [state,setState]=useState(null),[view,setView]=useState("accounts"),[active,setActive]=useState(null),[messages,setMessages]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [form,setForm]=useState({label:"Property Management",category:"PROPERTY",priority:"HIGH"});
 const [editing,setEditing]=useState(null);
 const [sarahReport,setSarahReport]=useState(null);
 const [routingReport,setRoutingReport]=useState(null);
 const [selectedFinding,setSelectedFinding]=useState(null);
 const mailboxError=(e,action)=>{
 const status=e?.response?.status;
 const detail=e?.response?.data?.detail;
 if(status===401)return "This SyncWorks login is not recognized by the Ohio backend. The API authentication and OAuth service must use the same account database.";
 if(status===403)return detail||"Ohio rejected this account's mailbox permissions.";
 if(status===404)return "The Ohio API mailbox route was not found. Verify the current backend deployment.";
 if(status>=500)return detail||"Ohio encountered a server error ("+status+").";
 if(!e?.response)return "The browser could not reach Ohio securely (network or CORS). Check the browser console and the Ohio CORS configuration.";
 return detail||action+" failed (HTTP "+status+").";
 };
 const load=useCallback(async()=>{setError("");try{const r=await api.get(BASE);setState(r.data)}catch(e){setState(null);setError(mailboxError(e,"Loading mailboxes"))}},[]);
 useEffect(()=>{load()},[load]);
 useEffect(()=>{
 const params=new URLSearchParams(window.location.search);
 const result=params.get("mailbox_connection");
 if(!result)return;
 const message=OAUTH_MESSAGES[result]||"The mailbox connection did not complete.";
 if(result==="connected")setNotice(message);else setError(message);
 params.delete("mailbox_connection");
 const rest=params.toString();
 window.history.replaceState(null,"",window.location.pathname+(rest?"?"+rest:"")+window.location.hash);
 },[]);
 const connect=async()=>{setBusy(true);setError("");try{const r=await api.post(BASE+"connect/",form);const url=r.data.authorization_url;if(!url?.startsWith("https://login.microsoftonline.com/"))throw Error("Unexpected authorization destination.");window.location.assign(url)}catch(e){setError(mailboxError(e,"Connecting Outlook"))}finally{setBusy(false)}};
 const openInbox=async account=>{setBusy(true);setError("");setActive(account);setMessages([]);setSarahReport(null);setSelectedFinding(null);setView("inbox");try{const r=await api.get(BASE+encodeURIComponent(account.account_id)+"/inbox/");setMessages(r.data.messages||[])}catch(e){setError(e?.response?.data?.detail||"Unable to open this inbox.")}finally{setBusy(false)}};
 const runRouting=async()=>{
  if(!active)return;
  setBusy(true);setError("");setRoutingReport(null);
  try{
   const r=await api.get(BASE+encodeURIComponent(active.account_id)+"/route-review/");
   setRoutingReport(r.data);setView("routing");
  }catch(e){setError(mailboxError(e,"Mailbox routing review"));}finally{setBusy(false);}
 };
 const runSarah=async()=>{
   if(!active||active.category!=="PROPERTY")return;
   setBusy(true);setError("");setSarahReport(null);setSelectedFinding(null);
   try{const r=await api.post(BASE+encodeURIComponent(active.account_id)+"/sarah-analysis/",{});
     setSarahReport(r.data);setView("report");
   }catch(e){setError(mailboxError(e,"Sarah email analysis"));}finally{setBusy(false);}
 };
 const save=async()=>{setBusy(true);setError("");try{const r=await api.patch(BASE,{account_id:editing.account_id,...form});setState(v=>({...v,accounts:r.data.accounts}));setNotice("Mailbox settings saved.");setEditing(null)}catch(e){setError(e?.response?.data?.detail||"Could not save mailbox settings.")}finally{setBusy(false)}};
 const disconnect=async account=>{if(!window.confirm("Disconnect "+account.email+" from SyncWorks?"))return;setBusy(true);setError("");try{const r=await api.delete(BASE,{data:{account_id:account.account_id}});setState(v=>({...v,accounts:r.data.accounts}));setNotice("Mailbox disconnected from SyncWorks.");setActive(null);setView("accounts")}catch(e){setError(e?.response?.data?.detail||"Could not disconnect.")}finally{setBusy(false)}};
 const accounts=state?.accounts||[];
 return <div className="sw-mail-multi flex min-h-0 flex-col gap-2">
   <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-bold">Connected mailboxes <span className="text-xs font-normal text-slate-300">({accounts.length})</span></h3><p className="text-[11px] text-slate-300">Additional inboxes: $9.99/month each</p></div><button onClick={load} disabled={busy} type="button" aria-label="Refresh mailboxes" className="rounded-lg border border-white/20 p-2"><RefreshCw size={15}/></button></div>
   {error&&<p role="alert" className="rounded-lg border border-rose-400/40 bg-rose-950/40 p-2 text-xs text-rose-100">{error}</p>}
   {notice&&<p role="status" className="rounded-lg border border-emerald-400/30 p-2 text-xs text-emerald-200">{notice}</p>}
   {view==="routing"&&routingReport?<div className="min-h-0">
  <div className="mb-2 flex items-center justify-between gap-2">
   <button type="button" onClick={()=>setView("inbox")} className="rounded-lg border border-white/20 px-2 py-1.5 text-xs">‹ Inbox</button>
   <strong className="text-sm">Victoria · Inbox routing review</strong>
   <button type="button" onClick={runRouting} disabled={busy} className="rounded-lg border border-white/20 px-2 py-1.5 text-xs">Rescan</button>
  </div>
  <p className="text-xs text-slate-300">{routingReport.brief?.summary} No Outlook messages have been moved or archived.</p>
  <div className="mt-2 flex flex-wrap gap-2">
   {Object.entries(routingReport.counts||{}).map(([category,count])=><span key={category} className="rounded-lg border border-white/20 px-3 py-2 text-xs">{category} · {count}</span>)}
  </div>
  <div className="mt-3 max-h-80 space-y-2 overflow-auto overscroll-contain">
   {(routingReport.messages||[]).map(m=><article key={m.message_id} className="rounded-lg border border-white/15 bg-black/10 p-3">
    <div className="flex flex-wrap justify-between gap-2"><strong className="text-xs">{m.subject}</strong><span className="text-[11px] text-cyan-200">{m.assistant} · {m.priority}</span></div>
    <p className="mt-1 text-[11px] text-slate-300">{m.from} · {m.received_at?.slice(0,10)}</p>
    <p className="mt-2 text-xs">{m.preview}</p>
    <p className="mt-2 text-[11px] text-amber-100">{m.reason} · {m.confidence} confidence · Suggested: {m.filing_action==="KEEP_IN_INBOX"?"Keep in inbox":m.proposed_folder}</p>
   </article>)}
  </div>
  <p className="mt-2 text-[11px] text-slate-300">Read-only review. Auto filing remains disabled until routing accuracy and Microsoft write permissions are verified.</p>
 </div>:view==="report"&&sarahReport?<div className="min-h-0">
  <div className="mb-3 flex flex-wrap items-center gap-2">
   <button type="button" onClick={()=>setView("inbox")} className="rounded-lg border border-white/20 px-2 py-1.5 text-xs">‹ Inbox</button>
   <strong className="text-sm">Sarah · Property correspondence review</strong>
   <button type="button" onClick={runSarah} disabled={busy} className="ml-auto rounded-lg border border-white/20 px-2 py-1.5 text-xs">Refresh analysis</button>
  </div>
  <p className="mb-3 text-xs text-slate-300">Reviewed {sarahReport.scanned} recent messages · {sarahReport.findings?.length||0} flagged · {sarahReport.checked_at?.slice(0,16)?.replace("T"," ")} UTC</p>
  {sarahReport.partial_sample&&<p className="mb-2 text-xs text-amber-200">Only the most recent {sarahReport.limit} messages were scanned. Earlier correspondence may not be included.</p>}
  <p className="mb-3 text-xs text-amber-100">Findings are based on subject lines and previews, not full message attachments or verified payment ledgers. No emails were sent.</p>
  <div className="grid gap-2 md:grid-cols-3">
   {["INSPECTION","PAYMENT","DOCUMENTS"].map(cat=><div key={cat} className="rounded-lg border border-white/15 bg-black/15 p-3"><p className="text-[11px] text-slate-300">{cat==="INSPECTION"?"Inspection":cat==="PAYMENT"?"Payments":"Documents"}</p><strong className="text-xl">{sarahReport.counts?.[cat]||0}</strong><p className="text-[10px] text-slate-400">Messages needing review</p></div>)}
  </div>
  <div className="mt-3 space-y-2">
  {(sarahReport.findings||[]).length===0?<p className="rounded-lg border border-white/15 p-3 text-xs">No property-related messages found in this recent inbox sample. This is not proof that there are no outstanding property issues.</p>:
  sarahReport.findings.map(f=><article key={f.message_id} className="rounded-xl border border-white/15 bg-black/10 p-3">
    <div className="flex items-start justify-between gap-2"><strong className="text-xs">{f.subject}</strong><span className="shrink-0 text-[10px] text-cyan-200">{f.category} · {f.priority}</span></div>
    <p className="mt-1 text-[11px] text-slate-300">{f.from} · {f.received_at?.slice(0,10)}</p>
    <p className="mt-2 text-xs text-slate-200">{f.preview}</p>
    <p className="mt-2 text-[11px] text-amber-100">Sarah recommends: {f.proposed_action}</p>
    <button type="button" onClick={()=>setSelectedFinding(selectedFinding?.message_id===f.message_id?null:f)} className="mt-2 rounded-lg border border-white/20 px-2 py-1.5 text-xs">{selectedFinding?.message_id===f.message_id?"Hide proposed reply":"Review proposed reply"}</button>
    {selectedFinding?.message_id===f.message_id&&<div className="mt-2 rounded-lg border border-white/15 bg-black/20 p-3">
     <p className="text-[11px] font-semibold">Draft suggestion only · Not sent</p>
     <p className="mt-1 text-[11px] text-slate-300">To: {f.proposed_reply?.to}</p>
     <p className="mt-1 text-[11px]">{f.proposed_reply?.subject}</p>
     <pre className="mt-2 whitespace-pre-wrap font-sans text-xs">{f.proposed_reply?.body}</pre>
     <button type="button" onClick={()=>navigator.clipboard?.writeText(["To: "+(f.proposed_reply?.to||""),"Subject: "+(f.proposed_reply?.subject||""),"",f.proposed_reply?.body||""].join("\n"))} className="mt-2 rounded-lg border border-white/20 px-2 py-1.5 text-xs">Copy draft for review</button>
    </div>}
  </article>)}
  </div>
 </div>:view==="inbox"?<div className="min-h-0"><div className="mb-2 flex items-center gap-2"><button type="button" onClick={()=>setView("accounts")} className="rounded-lg border border-white/20 p-2" aria-label="Back to accounts"><ChevronLeft size={16}/></button><strong className="truncate text-xs">{active?.label} · {active?.email}</strong><button disabled={busy} onClick={()=>active&&openInbox(active)} className="ml-auto rounded-lg border border-white/20 p-2"><RefreshCw size={15}/></button></div><div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-white/15 bg-black/10 p-2"><div><strong className="text-xs">Victoria · Mail routing</strong><p className="text-[11px] text-slate-300">Classify by bot, prepare an inbox briefing, and review proposed filing</p></div><button type="button" disabled={busy} onClick={runRouting} className="rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold">Review routing</button></div>{active?.category==="PROPERTY"&&<div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-cyan-300/20 bg-cyan-300/5 p-2"><div><strong className="text-xs">Sarah · Property Assistant</strong><p className="text-[11px] text-slate-300">Review inspections, assistance payments and missing documents</p></div><button type="button" disabled={busy} onClick={runSarah} className="rounded-lg border border-cyan-300/40 bg-cyan-400/10 px-3 py-2 text-xs font-semibold">{busy?"Analyzing…":"Analyze inbox"}</button></div>}
 <div className="max-h-64 space-y-2 overflow-y-auto overscroll-contain">{messages.length?messages.map(m=><article key={m.id} className="rounded-lg border border-white/10 bg-black/15 p-2.5"><div className="flex justify-between gap-2"><strong className="text-xs">{m.subject}</strong><span className="shrink-0 text-[10px] text-slate-400">{m.received_at?.slice(0,10)}</span></div><p className="mt-1 text-[11px] text-slate-300">{m.from}</p><p className="mt-1 text-xs text-slate-200">{m.preview}</p></article>):<p className="p-3 text-xs text-slate-300">{busy?"Loading inbox…":"No messages in the returned sample."}</p>}</div><p className="mt-2 text-[11px] text-amber-100">Read-only mailbox preview. Drafting and sending from additional accounts are not enabled.</p></div>:<>
    {accounts.length>0&&<div className="grid gap-2 sm:grid-cols-2">{accounts.map(a=><div key={a.account_id} className="rounded-xl border border-white/15 bg-black/10 p-3"><div className="flex items-center justify-between gap-2"><strong className="truncate text-xs">{a.label}</strong><span className="text-[10px] text-emerald-200">Connected</span></div><p className="mt-1 truncate text-[11px] text-slate-300">{a.email}</p><p className="mt-1 text-[10px] text-slate-400">{a.category} · {a.priority}</p><div className="mt-2 flex gap-2"><button type="button" onClick={()=>openInbox(a)} className="flex items-center gap-1 rounded-lg border border-white/20 px-2 py-1.5 text-[11px]"><Inbox size={13}/> Inbox + Sarah</button><button type="button" onClick={()=>{setEditing(a);setForm({label:a.label,category:a.category,priority:a.priority});setView("edit")}} className="rounded-lg border border-white/20 px-2 py-1.5 text-[11px]">Label</button><button type="button" onClick={()=>disconnect(a)} aria-label={"Disconnect "+a.email} className="ml-auto rounded-lg border border-rose-400/20 p-1.5 text-rose-200"><Trash2 size={14}/></button></div></div>)}</div>}
    {state?.configured?<form onSubmit={e=>{e.preventDefault();editing?save():connect()}} className="mt-2 grid gap-2 rounded-xl border border-white/15 bg-black/10 p-3"><strong className="text-xs">{editing?"Edit mailbox settings":"Connect another Outlook mailbox"}</strong><div className="grid gap-2 sm:grid-cols-3"><label className="text-[11px]">Mailbox label<input required maxLength={50} value={form.label} onChange={e=>setForm(v=>({...v,label:e.target.value}))} className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 p-2 text-sm"/></label><label className="text-[11px]">Purpose<select value={form.category} onChange={e=>setForm(v=>({...v,category:e.target.value}))} className="mt-1 w-full rounded-lg border border-white/20 bg-slate-900 p-2 text-sm">{TYPES.map(x=><option key={x} value={x}>{x}</option>)}</select></label><label className="text-[11px]">Importance<select value={form.priority} onChange={e=>setForm(v=>({...v,priority:e.target.value}))} className="mt-1 w-full rounded-lg border border-white/20 bg-slate-900 p-2 text-sm">{LEVELS.map(x=><option key={x} value={x}>{x}</option>)}</select></label></div><div className="flex items-center gap-2"><button disabled={busy} type="submit" className="flex items-center gap-1 rounded-lg border border-cyan-300/40 bg-cyan-400/15 px-3 py-2 text-xs font-semibold">{editing?<ShieldCheck size={14}/>:<MailPlus size={14}/>} {editing?"Save label":"Connect Outlook account"}</button>{editing&&<button type="button" onClick={()=>setEditing(null)} className="rounded-lg border border-white/20 px-3 py-2 text-xs">Cancel</button>}</div></form>:<div className="mt-2 rounded-lg border border-amber-300/30 bg-amber-400/5 p-3 text-xs text-amber-100"><strong>Microsoft administrator setup is required.</strong><p className="mt-1">Render must be configured with Microsoft client ID, client secret, token encryption key, and the exact multi-mailbox OAuth callback. User sign-in will only be enabled after these settings are valid.</p></div>}
    <p className="text-[11px] text-slate-300">Each Outlook mailbox requires its own Microsoft consent. No credentials are entered into SyncWorks. Gmail support requires a separate provider connection.</p>
   </>}
  </div>;
}
