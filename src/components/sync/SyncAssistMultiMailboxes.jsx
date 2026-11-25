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
 const [propertyProfiles,setPropertyProfiles]=useState([]);
 const [pmProperties,setPmProperties]=useState([]);
 const [portfolioLinkStatus,setPortfolioLinkStatus]=useState(null);
 const [formPmProperty,setFormPmProperty]=useState("");
 const [selectedEvidenceIds,setSelectedEvidenceIds]=useState([]);
 const [reportSaved,setReportSaved]=useState(null);
 const [linkDrawerOpen,setLinkDrawerOpen]=useState(false);
 const [propertyForm,setPropertyForm]=useState({name:"",terms:"housing authority, section 8, rent, inspection",contacts:""});
 const [selectedProperty,setSelectedProperty]=useState("");
 const [historyDays,setHistoryDays]=useState(365);
 const [historyPeople,setHistoryPeople]=useState("");
 const [historyReport,setHistoryReport]=useState(null);
 const [historyCategory,setHistoryCategory]=useState("ALL");
 const [historyReviewOpen,setHistoryReviewOpen]=useState(false);
 const [historyActiveId,setHistoryActiveId]=useState(null);
 const [propertyDrawerOpen,setPropertyDrawerOpen]=useState(false);
 const [editingPropertyProfile,setEditingPropertyProfile]=useState(false);
 const [routingReport,setRoutingReport]=useState(null);
 const [routingFilter,setRoutingFilter]=useState("ALL");
 const [jobPrefs,setJobPrefs]=useState(null);
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
   setRoutingReport(r.data);setJobPrefs(r.data.job_preferences||null);setRoutingFilter("ALL");setView("routing");
  }catch(e){setError(mailboxError(e,"Mailbox routing review"));}finally{setBusy(false);}
 };
 const saveJobPrefs=async()=>{
  if(!active||!jobPrefs)return;
  setBusy(true);setError("");
  try{
    await api.patch(BASE+encodeURIComponent(active.account_id)+"/route-review/",jobPrefs);
    setNotice("Job preferences saved. Outlook filing remains disabled.");
    await runRouting();
  }catch(e){setError(mailboxError(e,"Saving job preferences"));}finally{setBusy(false);}
 };
 const openHistory=async()=>{
  if(!active)return;
  setBusy(true);setError("");setHistoryReport(null);setView("history");
  try{
   const r=await api.get(BASE+encodeURIComponent(active.account_id)+"/property-profiles/");
   setPropertyProfiles(r.data.profiles||[]);
   setPmProperties(r.data.pm_properties||[]);
   const linked=(r.data.profiles||[]).filter(p=>p.pm_property_id).length;
   setPortfolioLinkStatus({total:(r.data.pm_properties||[]).length,linked});
   setSelectedProperty(prev=>r.data.profiles?.some(p=>p.profile_id===prev)?prev:(r.data.profiles?.[0]?.profile_id||""));
   setPropertyDrawerOpen(!(r.data.profiles||[]).length && !(r.data.pm_properties||[]).length);
  }catch(e){setError(mailboxError(e,"Loading property searches"));}finally{setBusy(false);}
 };
 const linkAllProperties=async(targetPmId=null)=>{
  if(!active)return;
  setBusy(true);setError("");
  try{
   const r=await api.post(BASE+encodeURIComponent(active.account_id)+"/property-link-all/",{});
   const reloaded=await api.get(BASE+encodeURIComponent(active.account_id)+"/property-profiles/");
   setPropertyProfiles(reloaded.data.profiles||[]);
   setPmProperties(reloaded.data.pm_properties||[]);
   setPortfolioLinkStatus({total:(reloaded.data.pm_properties||[]).length,
    linked:(reloaded.data.profiles||[]).filter(p=>p.pm_property_id).length});
   setSelectedProperty(prev=>{const profiles=reloaded.data.profiles||[];const target=targetPmId!=null?profiles.find(p=>String(p.pm_property_id)===String(targetPmId)):null;return target?.profile_id||(profiles.some(p=>p.profile_id===prev)?prev:(profiles[0]?.profile_id||""));});
    setHistoryReport(null);setSelectedEvidenceIds([]);
   setNotice("Property search profiles refreshed. "+(r.data.created||[]).length+" newly linked; existing links preserved. Select a property and search. No emails attached or moved.");
  }catch(e){setError(mailboxError(e,"Linking portfolio"))}finally{setBusy(false)}
 };
 const chooseSearchProperty=async value=>{
  if(!value.startsWith("pm:")){setSelectedProperty(value);setHistoryReport(null);setSelectedEvidenceIds([]);setHistoryPeople("");return;}
  const pmId=value.slice(3);
  await linkAllProperties(pmId);
 };
 const saveProperty=async()=>{
  if(!active)return;
  setBusy(true);setError("");
  try{
   const payload={name:propertyForm.name.trim(),pm_property_id:formPmProperty||null,
    terms:propertyForm.terms.split(",").map(v=>v.trim()).filter(Boolean),
    contacts:propertyForm.contacts.split(",").map(v=>v.trim()).filter(Boolean)};
   const r=editingPropertyProfile ? await api.patch(BASE+encodeURIComponent(active.account_id)+"/property-profiles/",{profile_id:selectedProperty,terms:payload.terms,contacts:payload.contacts}) : await api.post(BASE+encodeURIComponent(active.account_id)+"/property-profiles/",payload);
   setPropertyProfiles(prev=>editingPropertyProfile?prev.map(p=>p.profile_id===selectedProperty?r.data.profile:p):[...prev,r.data.profile]);
   setSelectedProperty(r.data.profile.profile_id);
   setSelectedEvidenceIds([]);setReportSaved(null);
   setNotice("Property search profile saved. No Outlook messages modified.");
   setPropertyDrawerOpen(false);setEditingPropertyProfile(false);
  }catch(e){setError(mailboxError(e,"Saving property search profile"));}finally{setBusy(false);}
 };
 const searchHistory=async()=>{
  if(!active||!selectedProperty)return;
  setBusy(true);setError("");setHistoryReport(null);
  try{
   const profile=propertyProfiles.find(p=>p.profile_id===selectedProperty);
   if(!profile)throw new Error("Choose a linked property first.");
   const extra=historyPeople.split(",").map(x=>x.trim()).filter(Boolean);
   if(extra.length){
    if(extra.some(x=>x.length<2||x.length>100))throw new Error("Names or phrases must be 2–100 characters each.");
    const combined=[...new Set([...(profile.terms||[]),...extra].map(x=>x.trim().toLowerCase()))];
    if(combined.length>15)throw new Error("This profile supports up to 15 search terms. Use Refine to remove unused terms first.");
    const saved=await api.patch(BASE+encodeURIComponent(active.account_id)+"/property-profiles/",{
     profile_id:selectedProperty,terms:combined});
    setPropertyProfiles(prev=>prev.map(p=>p.profile_id===selectedProperty?saved.data.profile:p));
    setHistoryPeople("");
    setNotice("Search names saved for this property; no Outlook messages modified.");
   }
   const r=await api.post(BASE+encodeURIComponent(active.account_id)+"/property-history/",{
    profile_id:selectedProperty,days:historyDays});
   setHistoryReport(r.data);setHistoryCategory("ALL");setHistoryActiveId(r.data.findings?.[0]?.message_id||null);setHistoryReviewOpen(true);
  }catch(e){setError(e?.response?mailboxError(e,"Historical property search"):(e?.message||"Historical search failed."));}finally{setBusy(false);}
 };
 const linkSavedProperty=async()=>{
  if(!active||!selectedProperty||!formPmProperty)return;
  setBusy(true);setError("");
  try{
   const r=await api.patch(BASE+encodeURIComponent(active.account_id)+"/property-profiles/",{profile_id:selectedProperty,pm_property_id:Number(formPmProperty)});
   setPropertyProfiles(prev=>prev.map(p=>p.profile_id===selectedProperty?r.data.profile:p));
   setNotice("Search linked to an existing Property Management record.");
   setLinkDrawerOpen(false);setHistoryReport(null);setSelectedEvidenceIds([]);
  }catch(e){setError(mailboxError(e,"Linking Property Management property"));}finally{setBusy(false)}
 };
 const saveReviewedEvidence=async()=>{
  const profile=propertyProfiles.find(p=>p.profile_id===selectedProperty);
  if(!active||!profile?.pm_property_id||!selectedEvidenceIds.length)return;
  setBusy(true);setError("");
  try{
   const r=await api.post("https://syncworks-backend-prod.onrender.com/api/v1/sync-ai/assist/pilot/pm-properties/"+profile.pm_property_id+"/correspondence-reports/",{
    mailbox_id:active.account_id,profile_id:profile.profile_id,message_ids:selectedEvidenceIds});
   setReportSaved(r.data.report);
   setNotice("Reviewed correspondence attached to PM property. Outlook and ledger unchanged.");
  }catch(e){setError(mailboxError(e,"Saving reviewed correspondence"));}finally{setBusy(false)}
 };
 const excludeHistorySender=async sender=>{
  const email=String(sender||"").trim().toLowerCase();
  const profile=propertyProfiles.find(p=>p.profile_id===selectedProperty);
  if(!active||!profile||!email.includes("@"))return;
  const prior=profile.excluded_senders||[];
  if(prior.includes(email))return;
  setBusy(true);setError("");
  try{
   const r=await api.patch(BASE+encodeURIComponent(active.account_id)+"/property-profiles/",{
    profile_id:selectedProperty,excluded_senders:[...prior,email]});
   setPropertyProfiles(prev=>prev.map(p=>p.profile_id===selectedProperty?r.data.profile:p));
   setHistoryReport(prev=>prev?{...prev,findings:(prev.findings||[]).filter(m=>String(m.sender||"").toLowerCase()!==email)}:prev);
   setSelectedEvidenceIds(prev=>prev.filter(id=>!(historyReport?.findings||[]).some(m=>m.message_id===id&&String(m.sender||"").toLowerCase()===email)));
   setNotice("Sender excluded from this property search. No Outlook mail modified.");
  }catch(e){setError(mailboxError(e,"Excluding unrelated sender"));}finally{setBusy(false)}
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
 return <div className={"sw-mail-multi flex h-full min-h-0 flex-col gap-2 "+(view==="history"?"sw-mail-history-active":"")}>
   <div className={view==="history"?"hidden":"flex flex-wrap items-center justify-between gap-2"}><div><h3 className="text-sm font-bold">Connected mailboxes <span className="text-xs font-normal text-slate-300">({accounts.length})</span></h3><p className="text-[11px] text-slate-300">Additional inboxes: $9.99/month each</p></div><button onClick={load} disabled={busy} type="button" aria-label="Refresh mailboxes" className="rounded-lg border border-white/20 p-2"><RefreshCw size={15}/></button></div>
   {error&&<p role="alert" className="rounded-lg border border-rose-400/40 bg-rose-950/40 p-2 text-xs text-rose-100">{error}</p>}
   {notice&&<p role="status" className="rounded-lg border border-emerald-400/30 p-2 text-xs text-emerald-200">{notice}</p>}
   {view==="history"?<div className="sw-mail-history-mode flex h-full min-h-0 flex-col gap-2 overflow-hidden">
    <div className="flex shrink-0 items-center justify-between gap-2">
     <button type="button" onClick={()=>setView("inbox")} className="rounded-lg border border-white/20 px-3 py-2 text-xs">‹ Inbox</button>
     <strong className="truncate text-sm">Sarah · Property Search</strong>
     <button type="button" disabled={busy||!pmProperties.length} onClick={()=>linkAllProperties()} className="shrink-0 rounded-lg border border-cyan-300/60 bg-cyan-400/15 px-3 py-2 text-xs font-bold disabled:opacity-40">Link All</button>
     <button type="button" onClick={()=>{setEditingPropertyProfile(false);setFormPmProperty("");setPropertyForm({name:"",terms:"housing authority, section 8, inspection, rent ledger",contacts:""});setPropertyDrawerOpen(true)}} className="shrink-0 rounded-lg border border-white/20 px-3 py-2 text-xs">+ New search</button>
    </div>
    {selectedProperty&&<div className="flex shrink-0 items-center justify-end gap-2">
      <button type="button" onClick={()=>{
       const profile=propertyProfiles.find(p=>p.profile_id===selectedProperty);
       if(!profile)return;
       setPropertyForm({name:profile.name,terms:(profile.terms||[]).join(", "),contacts:(profile.contacts||[]).join(", ")});
       setEditingPropertyProfile(true);setPropertyDrawerOpen(true);
      }} className="rounded-lg border border-white/20 px-2 py-1 text-[11px]">Refine contacts & search terms</button>
    </div>}
    {portfolioLinkStatus&&<p className="shrink-0 text-[11px] text-slate-300">{portfolioLinkStatus.linked} of {portfolioLinkStatus.total} saved properties linked · Choose an unlinked property below to automatically link it, or use Link All · Emails remain unfiled</p>}
    <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-2 rounded-xl border border-cyan-300/25 bg-black/15 p-2 sm:grid-cols-[minmax(0,1fr)_150px_auto]">
      <label className="min-w-0 text-[11px]">Property
       <select aria-label="Choose saved property for email search" value={selectedProperty} disabled={busy} onChange={e=>chooseSearchProperty(e.target.value)} className="mt-1 block h-10 w-full min-w-0 rounded-lg border border-white/20 bg-slate-900 px-2 text-xs">
        {!propertyProfiles.length&&<option value="">Add a property to search</option>}
        {propertyProfiles.map(p=><option key={p.profile_id} value={p.profile_id}>{p.name}</option>)}
         {pmProperties.filter(pm=>!propertyProfiles.some(p=>String(p.pm_property_id)===String(pm.id))).map(pm=><option key={"pm:"+pm.id} value={"pm:"+pm.id}>{pm.name||pm.address||"Property "+pm.id} — link & search</option>)}
       </select>
      </label>
      <label className="hidden text-[11px] sm:block">Date range
       <select value={historyDays} onChange={e=>setHistoryDays(Number(e.target.value))} className="mt-1 block h-10 w-full rounded-lg border border-white/20 bg-slate-900 px-2 text-xs">
        {[30,90,180,365,730].map(d=><option key={d} value={d}>Past {d} days</option>)}
       </select>
      </label>
      <button type="button" disabled={busy||!selectedProperty} onClick={searchHistory} className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-cyan-300/60 bg-cyan-500/25 px-4 text-xs font-bold text-cyan-50 shadow-sm disabled:opacity-40">
       {busy?"Searching…":"⌕ Search emails"}
      </button>
      <label className="col-span-2 text-[11px] sm:hidden">Date range
       <select value={historyDays} onChange={e=>setHistoryDays(Number(e.target.value))} className="mt-1 h-9 w-full rounded-lg border border-white/20 bg-slate-900 px-2 text-xs">
        {[30,90,180,365,730].map(d=><option key={d} value={d}>Past {d} days</option>)}
       </select>
      </label>
    </div>
    <label className="flex shrink-0 items-center gap-2 rounded-lg border border-white/15 bg-black/15 px-2 py-1.5 text-[11px]">
     <span className="shrink-0 font-bold text-slate-200">Sender names / phrases</span>
     <input aria-label="Sender names or phrases for property email search" value={historyPeople} onChange={e=>setHistoryPeople(e.target.value)} placeholder="Names, agencies, or addresses — comma-separated" className="min-w-0 flex-1 rounded-md border border-white/15 bg-slate-900/70 px-2 py-2 text-xs text-white placeholder:text-slate-500"/>
     <span className="hidden text-slate-400 lg:inline">Saved on search</span>
    </label>
    {propertyProfiles.find(p=>p.profile_id===selectedProperty&&!p.pm_property_id)&&pmProperties.length>0&&
     <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-lg border border-amber-400/30 px-2 py-1.5 text-xs">
      <span>Link this saved search to the existing PM property before attaching records.</span>
      <button type="button" onClick={()=>{setFormPmProperty("");setLinkDrawerOpen(true)}} className="rounded-md border border-amber-400/50 px-2 py-1 font-bold">Link PM property</button>
     </div>}

    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-white/15 bg-black/15 p-3 text-center">
     {historyReport?<><strong className="text-base">{historyReport.findings?.length||0} candidate messages for {historyReport.property?.name}</strong>
      <p className="text-xs text-slate-300">{historyReport.scanned} checked · {selectedEvidenceIds.length} selected · Mail remains unchanged</p>
      <button type="button" onClick={()=>setHistoryReviewOpen(true)} className="rounded-lg border border-emerald-300/50 bg-emerald-500/15 px-5 py-2.5 text-sm font-bold">Review emails</button>
      {reportSaved&&<a className="text-xs underline" href={"/pm/properties/"+reportSaved.pm_property_id+"?tab=correspondence"}>Open Property Briefings</a>}
     </>:<><strong className="text-sm">Search property correspondence</strong><p className="text-xs text-slate-300">Results open in a larger review drawer with a fixed action bar.</p></>}
    </div>
    {historyReviewOpen&&historyReport&&<div className="sw-property-overlay fixed inset-0 z-[120] flex items-center justify-center p-2 md:p-5" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setHistoryReviewOpen(false)}}>
     <section role="dialog" aria-modal="true" aria-label="Review property emails" className="sw-property-dialog flex h-[90dvh] w-full max-w-[1350px] min-h-0 flex-col overflow-hidden rounded-xl border border-white/25 bg-[#11171c] shadow-2xl">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/20 p-3 md:px-5">
       <div className="min-w-0"><strong className="block truncate text-base">Sarah · Review {historyReport.property?.name} emails</strong><span className="text-xs text-slate-300">{historyReport.findings?.length||0} candidates · Select only verified property correspondence</span></div>
       <button type="button" className="rounded-lg border border-white/25 px-3 py-2 text-xs" onClick={()=>setHistoryReviewOpen(false)}>Close ✕</button>
      </header>
      <nav className="flex shrink-0 flex-wrap gap-1.5 border-b border-white/15 p-2 md:px-5" aria-label="Filter correspondence">
       <button type="button" onClick={()=>setHistoryCategory("ALL")} className={`rounded-md border px-2 py-1.5 text-xs ${historyCategory==="ALL"?"border-emerald-300/60 bg-white/10":"border-white/20"}`}>All ({historyReport.findings?.length||0})</button>
       {Object.entries(historyReport.counts||{}).map(([k,n])=><button key={k} type="button" onClick={()=>{setHistoryCategory(k);setHistoryActiveId((historyReport.findings||[]).find(m=>m.category===k)?.message_id||null)}} className={`rounded-md border px-2 py-1.5 text-xs ${historyCategory===k?"border-emerald-300/60 bg-white/10":"border-white/20"}`}>{k} ({n})</button>)}
      </nav>
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[minmax(250px,38%)_minmax(0,1fr)]">
       <div className="min-h-0 overflow-y-auto overscroll-contain border-b border-white/20 p-2 md:border-b-0 md:border-r" aria-label="Correspondence list">
        {(historyReport.findings||[]).filter(m=>historyCategory==="ALL"||m.category===historyCategory).map(m=><div key={m.message_id} className={`mb-1 flex gap-2 rounded-lg border p-2 ${historyActiveId===m.message_id?"border-emerald-300/50 bg-white/10":"border-white/10"}`}>
         <input type="checkbox" className="mt-1 shrink-0" aria-label={"Include "+m.subject} checked={selectedEvidenceIds.includes(m.message_id)} disabled={!propertyProfiles.find(p=>p.profile_id===selectedProperty)?.pm_property_id||(!selectedEvidenceIds.includes(m.message_id)&&selectedEvidenceIds.length>=20)} onChange={e=>setSelectedEvidenceIds(prev=>e.target.checked?[...prev,m.message_id]:prev.filter(id=>id!==m.message_id))}/>
         <button type="button" className="min-w-0 flex-1 text-left" onClick={()=>setHistoryActiveId(m.message_id)}><strong className="block truncate text-xs">{m.subject}</strong><span className="block truncate text-[11px] text-slate-300">{m.sender}</span><span className="text-[10px] text-slate-400">{m.received_at?.slice(0,10)} · {m.category}</span></button>
        </div>)}
       </div>
       <div className="min-h-0 overflow-y-auto overscroll-contain p-3 md:p-5" aria-label="Selected email details">
        {(historyReport.findings||[]).filter(m=>historyCategory==="ALL"||m.category===historyCategory).filter(m=>m.message_id===(historyActiveId||(historyReport.findings||[])[0]?.message_id)).map(m=><article key={m.message_id} className="space-y-3">
         <span className="text-xs text-slate-400">{m.category} · {m.received_at?.slice(0,10)}</span>
         <h3 className="text-lg font-bold">{m.subject}</h3>
         <p className="break-all text-xs text-slate-300">From: {m.sender}</p>
         <div className="whitespace-pre-wrap rounded-lg border border-white/15 bg-black/20 p-3 text-sm leading-relaxed">{m.preview||"No preview available. Open original to verify."}</div>
         <p className="text-xs text-slate-300">{m.confidence==="STRONG"?"Property-specific match":"Manual verification required"} · Matched: {m.matched_terms?.join(", ")}{m.has_attachments?" · Has attachment (not read)":""}</p>
         <div className="flex flex-wrap gap-2">{m.outlook_url&&<a href={m.outlook_url} target="_blank" rel="noopener noreferrer" className="rounded-md border border-white/25 px-3 py-2 text-xs underline">Open in Outlook</a>}
          <button type="button" disabled={busy||!m.sender} onClick={()=>excludeHistorySender(m.sender)} className="rounded-md border border-white/25 px-3 py-2 text-xs disabled:opacity-40">Exclude sender from property search</button></div>
         <p className="text-[11px] text-amber-200">Email previews are not verification of funds, inspections, or signed records.</p>
        </article>)}
        {!(historyReport.findings||[]).some(m=>historyCategory==="ALL"||m.category===historyCategory)&&<p className="text-xs text-slate-300">No messages in this filter.</p>}
       </div>
      </div>
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-white/20 bg-[#151d21] p-3 md:px-5">
       <strong className="text-xs">{selectedEvidenceIds.length} selected (max 20)</strong>
       <div className="flex gap-2">{selectedEvidenceIds.length>0&&<button type="button" onClick={()=>setSelectedEvidenceIds([])} className="rounded-md border border-white/25 px-3 py-2 text-xs">Clear</button>}
        <button type="button" disabled={busy||!selectedEvidenceIds.length} onClick={saveReviewedEvidence} className="rounded-md border border-emerald-300/50 bg-emerald-500/15 px-3 py-2 text-xs font-bold disabled:opacity-50">{busy?"Saving…":"Attach selected to Briefings"}</button></div>
      </footer>
     </section>
    </div>}
    {linkDrawerOpen&&<div className="sw-property-overlay fixed inset-0 z-[100] flex items-center justify-center p-3" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setLinkDrawerOpen(false)}}>
      <section role="dialog" aria-modal="true" aria-label="Link saved property" className="sw-property-dialog w-full max-w-md rounded-xl border p-3">
        <div className="flex items-center justify-between gap-2"><strong className="text-sm">Link to Property Management</strong><button type="button" onClick={()=>setLinkDrawerOpen(false)}>✕</button></div>
        <p className="my-2 text-xs">Choose the actual saved property. No messages are automatically attached.</p>
        <select className="w-full rounded-lg border border-white/20 bg-slate-900 p-2 text-xs" value={formPmProperty} onChange={e=>setFormPmProperty(e.target.value)}><option value="">Select property</option>{pmProperties.map(p=><option key={p.id} value={p.id}>{p.name} — {p.address}</option>)}</select>
        <button type="button" disabled={busy||!formPmProperty} onClick={linkSavedProperty} className="mt-3 rounded-lg border border-cyan-300/50 px-3 py-2 text-xs font-bold">Link selected property</button>
      </section>
    </div>}
    {propertyDrawerOpen&&<div className="sw-property-overlay fixed inset-0 z-[100] flex items-center justify-center p-3" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setPropertyDrawerOpen(false)}}>
      <section role="dialog" aria-modal="true" aria-label={editingPropertyProfile?"Refine property search":"Add property search"} className="sw-property-dialog w-full max-w-md max-h-[min(82dvh,520px)] overflow-y-auto rounded-xl border p-3 shadow-2xl">
       <div className="mb-2 flex items-center justify-between gap-2"><strong className="text-sm">{editingPropertyProfile?"Refine property search":"Add property search"}</strong><button type="button" onClick={()=>setPropertyDrawerOpen(false)} className="rounded-lg border border-white/20 px-3 py-1.5 text-xs">Close ✕</button></div>
       <p className="mb-2 text-[11px] text-slate-300">Reusable across housing authorities, property managers, and rentals. No messages are moved.</p>
       <div className="space-y-2">
        {!editingPropertyProfile&&pmProperties.length>0&&<label className="block text-xs">Use an existing Property Management property
          <select value={formPmProperty} onChange={e=>{setFormPmProperty(e.target.value);const p=pmProperties.find(v=>String(v.id)===e.target.value);if(p)setPropertyForm(v=>({...v,name:p.name,terms:Array.from(new Set([p.name,...p.address.split(",").map(t=>t.trim()).filter(t=>t.length>5),"section 8","housing authority","inspection","rent ledger","abatement"])).slice(0,15).join(", ")}))}} className="mt-1 w-full rounded-lg border border-white/20 bg-slate-900 px-2.5 py-2 text-xs">
          <option value="">Manual search (not linked)</option>
          {pmProperties.map(p=><option key={p.id} value={p.id}>{p.name} — {p.address}</option>)}
          </select>
        </label>}
        <label className="block text-xs">Property name<input disabled={editingPropertyProfile} autoFocus className="mt-1 w-full rounded-lg border border-white/20 bg-slate-900 px-2.5 py-2 text-xs" value={propertyForm.name} placeholder="Roxana Rd — Lord Holdings" onChange={e=>setPropertyForm(v=>({...v,name:e.target.value}))}/></label>
        <label className="block text-xs">Known sender addresses (optional)<input className="mt-1 w-full rounded-lg border border-white/20 bg-slate-900 px-2.5 py-2 text-xs" value={propertyForm.contacts} placeholder="agency@example.org, manager@example.org" onChange={e=>setPropertyForm(v=>({...v,contacts:e.target.value}))}/></label>
        <label className="block text-xs">Search keywords, separated by commas<textarea rows={2} className="mt-1 w-full rounded-lg border border-white/20 bg-slate-900 px-2.5 py-2 text-xs" value={propertyForm.terms} onChange={e=>setPropertyForm(v=>({...v,terms:e.target.value}))}/></label>
       </div>
       <div className="mt-3 flex justify-end gap-2"><button type="button" onClick={()=>setPropertyDrawerOpen(false)} className="rounded-lg border border-white/20 px-3 py-1.5 text-xs">Cancel</button><button type="button" disabled={busy||!propertyForm.name.trim()} onClick={saveProperty} className="rounded-lg border border-cyan-300/60 bg-cyan-500/20 px-3 py-1.5 text-xs font-bold">{editingPropertyProfile?"Save search rules":"Save property"}</button></div>
      </section>
    </div>}
   </div>:view==="routing"&&routingReport?<div className="min-h-0">
  <div className="mb-2 flex items-center justify-between gap-2">
   <button type="button" onClick={()=>setView("inbox")} className="rounded-lg border border-white/20 px-2 py-1.5 text-xs">‹ Inbox</button>
   <strong className="text-sm">Victoria · Inbox routing review</strong>
   <button type="button" onClick={runRouting} disabled={busy} className="rounded-lg border border-white/20 px-2 py-1.5 text-xs">Rescan</button>
  </div>
  <p className="text-xs text-slate-300">{routingReport.brief?.summary} No Outlook messages have been moved or archived.</p>
  {jobPrefs&&<div className="mt-2 rounded-lg border border-white/15 bg-black/10 p-3">
   <div className="flex items-center justify-between gap-3"><div><strong className="text-xs">Job opportunities</strong><p className="text-[11px] text-slate-300">When paused, recruitment emails are proposed for Personal filing. Existing application and interview updates stay protected.</p></div><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!jobPrefs.job_search_active} onChange={e=>setJobPrefs(v=>({...v,job_search_active:e.target.checked}))}/> Actively looking</label></div>
   {jobPrefs.job_search_active&&<div className="mt-2 flex flex-wrap items-center gap-3">
    <label className="text-xs"><input type="checkbox" checked={!!jobPrefs.remote_only} onChange={e=>setJobPrefs(v=>({...v,remote_only:e.target.checked}))}/> Remote only</label>
    <label className="text-xs"><input type="checkbox" checked={!!jobPrefs.part_time_only} onChange={e=>setJobPrefs(v=>({...v,part_time_only:e.target.checked}))}/> Part-time/contract only</label>
    <label className="text-xs">Keywords (comma-separated)<input className="ml-2 rounded-md border border-white/20 bg-black/20 px-2 py-1" value={(jobPrefs.keywords||[]).join(", ")} onChange={e=>setJobPrefs(v=>({...v,keywords:e.target.value.split(",").slice(0,12).map(x=>x.trim())}))} placeholder="design, virtual assistant"/></label>
   </div>}
   <div className="mt-2 flex items-center justify-between gap-2"><p className="text-[11px] text-amber-100">No automatic archiving or deletion is enabled.</p><button type="button" disabled={busy} onClick={saveJobPrefs} className="rounded-lg border border-cyan-300/40 px-3 py-1.5 text-xs">Save job rules</button></div>
  </div>}
  <div className="mt-2 flex flex-wrap gap-2">
   {["ALL","REVIEW","FINANCE","PROPERTY","MARKETS","BUSINESS","SUPPORT","GROWTH","PERSONAL"].map(category=><button key={category} type="button" onClick={()=>setRoutingFilter(category)} aria-pressed={routingFilter===category} className={"rounded-lg border px-3 py-2 text-xs "+(routingFilter===category?"border-cyan-300/60 bg-cyan-400/20":"border-white/20")}>{category} · {category==="ALL"?routingReport.total:routingReport.counts?.[category]||0}</button>)}
  </div>
  <div className="mt-3 max-h-80 space-y-2 overflow-auto overscroll-contain">
   {(routingReport.messages||[]).filter(m=>routingFilter==="ALL"||m.category===routingFilter).map(m=><article key={m.message_id} className="rounded-lg border border-white/15 bg-black/10 p-3">
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
 </div>:view==="inbox"?<div className="min-h-0"><div className="mb-2 flex items-center gap-2"><button type="button" onClick={()=>setView("accounts")} className="rounded-lg border border-white/20 p-2" aria-label="Back to accounts"><ChevronLeft size={16}/></button><strong className="truncate text-xs">{active?.label} · {active?.email}</strong><button disabled={busy} onClick={()=>active&&openInbox(active)} className="ml-auto rounded-lg border border-white/20 p-2"><RefreshCw size={15}/></button></div><div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-white/15 bg-black/10 p-2"><div><strong className="text-xs">Victoria · Mail routing</strong><p className="text-[11px] text-slate-300">Classify by bot, prepare an inbox briefing, and review proposed filing</p></div><button type="button" disabled={busy} onClick={runRouting} className="rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold">Review routing</button></div>{active?.category==="PROPERTY"&&<div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-white/15 bg-black/10 p-2"><div><strong className="text-xs">Property history</strong><p className="text-[11px] text-slate-300">Find older inspections, payments and correspondence across Outlook folders</p></div><button type="button" disabled={busy} onClick={openHistory} className="rounded-lg border border-white/20 px-3 py-2 text-xs">Historical search</button></div>}{active?.category==="PROPERTY"&&<div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-cyan-300/20 bg-cyan-300/5 p-2"><div><strong className="text-xs">Sarah · Property Assistant</strong><p className="text-[11px] text-slate-300">Review inspections, assistance payments and missing documents</p></div><button type="button" disabled={busy} onClick={runSarah} className="rounded-lg border border-cyan-300/40 bg-cyan-400/10 px-3 py-2 text-xs font-semibold">{busy?"Analyzing…":"Analyze inbox"}</button></div>}
 <div className="max-h-64 space-y-2 overflow-y-auto overscroll-contain">{messages.length?messages.map(m=><article key={m.id} className="rounded-lg border border-white/10 bg-black/15 p-2.5"><div className="flex justify-between gap-2"><strong className="text-xs">{m.subject}</strong><span className="shrink-0 text-[10px] text-slate-400">{m.received_at?.slice(0,10)}</span></div><p className="mt-1 text-[11px] text-slate-300">{m.from}</p><p className="mt-1 text-xs text-slate-200">{m.preview}</p></article>):<p className="p-3 text-xs text-slate-300">{busy?"Loading inbox…":"No messages in the returned sample."}</p>}</div><p className="mt-2 text-[11px] text-amber-100">Read-only mailbox preview. Drafting and sending from additional accounts are not enabled.</p></div>:<>
    {accounts.length>0&&<div className="grid gap-2 sm:grid-cols-2">{accounts.map(a=><div key={a.account_id} className="rounded-xl border border-white/15 bg-black/10 p-3"><div className="flex items-center justify-between gap-2"><strong className="truncate text-xs">{a.label}</strong><span className="text-[10px] text-emerald-200">Connected</span></div><p className="mt-1 truncate text-[11px] text-slate-300">{a.email}</p><p className="mt-1 text-[10px] text-slate-400">{a.category} · {a.priority}</p><div className="mt-2 flex gap-2"><button type="button" onClick={()=>openInbox(a)} className="flex items-center gap-1 rounded-lg border border-white/20 px-2 py-1.5 text-[11px]"><Inbox size={13}/> Inbox + Sarah</button><button type="button" onClick={()=>{setEditing(a);setForm({label:a.label,category:a.category,priority:a.priority});setView("edit")}} className="rounded-lg border border-white/20 px-2 py-1.5 text-[11px]">Label</button><button type="button" onClick={()=>disconnect(a)} aria-label={"Disconnect "+a.email} className="ml-auto rounded-lg border border-rose-400/20 p-1.5 text-rose-200"><Trash2 size={14}/></button></div></div>)}</div>}
    {state?.configured?<form onSubmit={e=>{e.preventDefault();editing?save():connect()}} className="mt-2 grid gap-2 rounded-xl border border-white/15 bg-black/10 p-3"><strong className="text-xs">{editing?"Edit mailbox settings":"Connect another Outlook mailbox"}</strong><div className="grid gap-2 sm:grid-cols-3"><label className="text-[11px]">Mailbox label<input required maxLength={50} value={form.label} onChange={e=>setForm(v=>({...v,label:e.target.value}))} className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 p-2 text-sm"/></label><label className="text-[11px]">Purpose<select value={form.category} onChange={e=>setForm(v=>({...v,category:e.target.value}))} className="mt-1 w-full rounded-lg border border-white/20 bg-slate-900 p-2 text-sm">{TYPES.map(x=><option key={x} value={x}>{x}</option>)}</select></label><label className="text-[11px]">Importance<select value={form.priority} onChange={e=>setForm(v=>({...v,priority:e.target.value}))} className="mt-1 w-full rounded-lg border border-white/20 bg-slate-900 p-2 text-sm">{LEVELS.map(x=><option key={x} value={x}>{x}</option>)}</select></label></div><div className="flex items-center gap-2"><button disabled={busy} type="submit" className="flex items-center gap-1 rounded-lg border border-cyan-300/40 bg-cyan-400/15 px-3 py-2 text-xs font-semibold">{editing?<ShieldCheck size={14}/>:<MailPlus size={14}/>} {editing?"Save label":"Connect Outlook account"}</button>{editing&&<button type="button" onClick={()=>setEditing(null)} className="rounded-lg border border-white/20 px-3 py-2 text-xs">Cancel</button>}</div></form>:<div className="mt-2 rounded-lg border border-amber-300/30 bg-amber-400/5 p-3 text-xs text-amber-100"><strong>Microsoft administrator setup is required.</strong><p className="mt-1">Render must be configured with Microsoft client ID, client secret, token encryption key, and the exact multi-mailbox OAuth callback. User sign-in will only be enabled after these settings are valid.</p></div>}
    <p className="text-[11px] text-slate-300">Each Outlook mailbox requires its own Microsoft consent. No credentials are entered into SyncWorks. Gmail support requires a separate provider connection.</p>
   </>}
  </div>;
}
