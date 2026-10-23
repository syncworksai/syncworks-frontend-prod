import React,{useEffect,useMemo,useState} from "react";
import {useNavigate,useSearchParams} from "react-router-dom";
import api from "../api/client";
import PMShell from "../components/pm/PMShell";

const input="min-h-10 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400";
const list=r=>Array.isArray(r?.results)?r.results:Array.isArray(r)?r:[];
const roles=[["TENANT","Tenant"],["OWNER","Owner / investor"],["PROPERTY_MANAGER","Property manager"],["ASSISTANCE_ADMINISTRATOR","Housing / assistance administrator"],["OTHER","Outside party"]];
const actions=[["PROVIDE_DOCUMENT","Send a required document"],["PROVIDE_INFORMATION","Provide information"],["SIGNATURE","Coordinate signature"],["APPROVAL","Request formal approval"]];
const stages=[["ACKNOWLEDGED","Acknowledged"],["WAITING_RESPONSE","Waiting on recipient"],["RECEIVED","Received / uploaded"],["VERIFIED","Verified complete"],["REJECTED","Rejected / changes needed"],["CANCELED","Cancel request"]];
const initial={recipient_role:"ASSISTANCE_ADMINISTRATOR",recipient_name:"",recipient_email:"",
 action:"PROVIDE_DOCUMENT",title:"",instructions:"",due_date:"",document_id:"",approved_signature_method:""};
const Field=({label,children,description})=><label className="block min-w-0"><span className="mb-1 block text-[11px] font-bold text-slate-300">{label}</span>{children}{description?<span className="mt-1 block text-[10px] text-slate-500">{description}</span>:null}</label>;
const Card=({title,info,children})=><section className="rounded-xl border border-cyan-400/20 bg-[#07111f] p-3 sm:p-4"><h2 className="text-sm font-black text-white">{title}</h2>{info?<p className="mt-1 text-[11px] leading-5 text-slate-400">{info}</p>:null}<div className="mt-3">{children}</div></section>;
const fmt=d=>d?new Date(d+"T12:00:00").toLocaleDateString():"No date";

export default function PMDocumentCoordination(){
 const nav=useNavigate();const [params,setParams]=useSearchParams();
 const propertyId=params.get("property")||"";
 const [ws,setWs]=useState(null),[properties,setProperties]=useState([]),[tenants,setTenants]=useState([]),[owners,setOwners]=useState([]),[docs,setDocs]=useState([]);
 const [requests,setRequests]=useState([]);
 const [form,setForm]=useState(initial),[selected,setSelected]=useState(null),[change,setChange]=useState({status:"ACKNOWLEDGED",completion_evidence:"",completion_document_id:""});
 const [emailText,setEmailText]=useState(""),[suggestions,setSuggestions]=useState([]);
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const headers=useMemo(()=>ws?{"X-PM-Workspace-ID":String(ws.id)}:{},[ws]);
 const fail=e=>e?.response?.data?.detail||"Something went wrong. Check the details.";
 useEffect(()=>{let active=true;(async()=>{try{
   const w=(await api.get("/pm-hub/workspaces/current/")).data;
   const h={"X-PM-Workspace-ID":String(w.id)};
   const [p,t]=await Promise.all([api.get("/pm-hub/properties/",{headers:h}),api.get("/pm-hub/tenants/",{headers:h})]);
   if(active){setWs(w);setProperties(list(p.data));setTenants(list(t.data));}
 }catch(e){if(active)setError(fail(e));}})();return()=>{active=false;};},[]);
 async function reload(){
   if(!ws||!propertyId)return;
   const h={"X-PM-Workspace-ID":String(ws.id)};
   const [r,d,o]=await Promise.all([
     api.get(`/pm-hub/properties/${propertyId}/document-requests/`,{headers:h}),
     api.get("/pm-hub/property-documents/",{headers:h,params:{property_id:propertyId}}),
     api.get("/pm-hub/property-owners/",{headers:h,params:{property_id:propertyId}}),
   ]);
   setRequests(r.data.requests||[]);setDocs(list(d.data));setOwners(list(o.data));
 }
 useEffect(()=>{if(!ws||!propertyId)return;let active=true;
   const h={"X-PM-Workspace-ID":String(ws.id)};
   Promise.all([
     api.get(`/pm-hub/properties/${propertyId}/document-requests/`,{headers:h}),
     api.get("/pm-hub/property-documents/",{headers:h,params:{property_id:propertyId}}),
     api.get("/pm-hub/property-owners/",{headers:h,params:{property_id:propertyId}}),
   ]).then(([r,d,o])=>{if(active){setRequests(r.data.requests||[]);setDocs(list(d.data));setOwners(list(o.data));}})
    .catch(e=>{if(active)setError(fail(e));});
   return()=>{active=false;};
 },[ws?.id,propertyId]);
 const property=properties.find(p=>String(p.id)===propertyId);
 const matching=tenants.filter(t=>String(t.property_name||"").toLowerCase()===String(property?.name||"").toLowerCase());
 function update(key,v){setForm(f=>({...f,[key]:v}));}
 function chooseContact(kind,id){
   const x=kind==="TENANT"?tenants.find(t=>String(t.id)===id):owners.find(o=>String(o.id)===id);
   if(!x)return;
   update("recipient_email",x.email||"");
   setForm(f=>({...f,recipient_role:kind,recipient_email:x.email||"",
        recipient_name:kind==="TENANT"?(x.full_name||[x.first_name,x.last_name].filter(Boolean).join(" ")):x.name}));
 }
 async function create(e){
   e.preventDefault();setBusy(true);setError("");setNotice("");
   try{
     const res=await api.post(`/pm-hub/properties/${propertyId}/document-requests/`,form,{headers});
     await reload();
     setSelected(res.data.request);setChange({status:"ACKNOWLEDGED",completion_evidence:"",completion_document_id:""});
     setNotice("Request saved as a draft. It has NOT been emailed or signed.");
     setForm(initial);
   }catch(e){setError(fail(e));}finally{setBusy(false);}
 }
 async function action(item,operation){
   if(!window.confirm(`${operation==="SEND"?"Send":"Send a reminder for"} this document request to ${item.recipient_email}?`))return;
   setBusy(true);setError("");setNotice("");
   try{
     const r=await api.post(`/pm-hub/properties/${propertyId}/document-requests/${item.id}/`,{operation},{headers});
     await reload();setSelected(r.data.request);
     setNotice("Email sent. Do not mark it signed or approved until you verify the reply and supporting document.");
   }catch(e){setError(fail(e));}finally{setBusy(false);}
 }
 async function saveStatus(){
   if(!selected)return;
   setBusy(true);setError("");setNotice("");
   try{
     await api.patch(`/pm-hub/properties/${propertyId}/document-requests/${selected.id}/`,change,{headers});
     await reload();setSelected(null);
     setNotice("Evidence and review status saved to this property's request history.");
   }catch(e){setError(fail(e));}finally{setBusy(false);}
 }
 async function analyze(){
   if(!emailText.trim())return;
   setBusy(true);setError("");setNotice("");setSuggestions([]);
   try{
     const r=await api.post(`/pm-hub/properties/${propertyId}/analyze-correspondence/`,{body:emailText},{headers});
     setSuggestions(r.data.suggestions||[]);
     setNotice("Possible requirements identified. Nothing was sent, uploaded, or marked complete.");
   }catch(e){setError(fail(e));}finally{setBusy(false);}
 }
 const outstanding=requests.filter(r=>!["VERIFIED","CANCELED"].includes(r.status));
 const due=requests.filter(r=>r.overdue||r.followup_due);
 return <PMShell><main className="mx-auto max-w-5xl space-y-3 px-3 py-3 pb-[calc(8rem+env(safe-area-inset-bottom))] text-slate-100 sm:px-5">
  <div className="flex items-start justify-between gap-2"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-300">Document workflow</div><h1 className="text-xl font-black">Requests & Signatures</h1><p className="mt-1 text-xs text-slate-400">Request, follow up and verify without chasing different inbox threads.</p></div><button type="button" onClick={()=>nav("/pm")} className="min-h-9 shrink-0 rounded-lg border border-slate-700 px-3 text-xs">Dashboard</button></div>
  {error?<p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-100">{error}</p>:null}
  {notice?<p role="status" className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3 text-xs text-emerald-100">{notice}</p>:null}
  <Card title="Property"><select aria-label="Choose property" className={input} value={propertyId} onChange={e=>{setParams(e.target.value?{property:e.target.value}:{});setSelected(null);setRequests([]);setDocs([]);setSuggestions([]);}}>
    <option value="">Choose property</option>{properties.map(p=><option key={p.id} value={p.id}>{p.name} · {p.address}</option>)}</select></Card>
  {propertyId?<><div className="grid grid-cols-3 gap-2">{[["Requests",requests.length],["Waiting",outstanding.length],["Needs attention",due.length]].map(([k,v])=><div className="rounded-lg border border-slate-700 bg-[#07111f] p-3" key={k}><div className="text-[10px] text-slate-400">{k}</div><div className="mt-1 text-xl font-black">{v}</div></div>)}</div>
   <Card title="Create document request" info="An outside recipient does not need a SyncWorks account to receive email. This is NOT an electronic-signature service.">
    <form onSubmit={create} className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
       <Field label="Recipient role"><select className={input} value={form.recipient_role} onChange={e=>update("recipient_role",e.target.value)}>{roles.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></Field>
       <Field label="What is needed?"><select className={input} value={form.action} onChange={e=>update("action",e.target.value)}>{actions.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></Field>
       {["TENANT","OWNER"].includes(form.recipient_role)?<Field label="Choose existing contact (optional)"><select className={input} value="" onChange={e=>chooseContact(form.recipient_role,e.target.value)}><option value="">Choose from property records</option>{(form.recipient_role==="TENANT"?matching:owners).map(x=><option key={x.id} value={x.id}>{x.name||x.full_name||[x.first_name,x.last_name].join(" ")} · {x.email}</option>)}</select></Field>:null}
       <Field label="Recipient name"><input className={input} value={form.recipient_name} onChange={e=>update("recipient_name",e.target.value)} placeholder="Recipient or department" /></Field>
       <Field label="Recipient email"><input type="email" required className={input} value={form.recipient_email} onChange={e=>update("recipient_email",e.target.value)}/></Field>
       <Field label="Required by"><input type="date" className={input} value={form.due_date} onChange={e=>update("due_date",e.target.value)}/></Field>
       <Field label="Related property document (optional)"><select className={input} value={form.document_id||""} onChange={e=>update("document_id",e.target.value)}><option value="">Choose file</option>{docs.map(d=><option value={d.id} key={d.id}>{d.title}</option>)}</select></Field>
       <Field label="Request title"><input required className={input} value={form.title} onChange={e=>update("title",e.target.value)} placeholder="Recorded deed, tenant signature, inspection approval..."/></Field>
      </div>
      <Field label="Instructions for recipient" description="Do not include sensitive identity, tax, or banking details in a routine email."><textarea rows={3} className={input} value={form.instructions} onChange={e=>update("instructions",e.target.value)} placeholder="Who should provide this, through which approved channel, and by when?"/></Field>
      <button type="submit" disabled={busy} className="min-h-11 w-full rounded-xl bg-cyan-400 text-xs font-black text-slate-950 disabled:opacity-40">Save draft · no email yet</button>
    </form>
   </Card>
   <Card title="Requests awaiting responses" info="Track received information and upload the supporting document before marking a signature or agency decision verified.">
    <div className="space-y-2">{!requests.length?<p className="text-xs text-slate-500">No document requests yet.</p>:null}
      {requests.map(item=><article key={item.id} className="rounded-xl border border-slate-700 bg-black/15 p-3">
        <div className="flex flex-wrap items-start justify-between gap-2"><div><div className="text-xs font-black">{item.title}</div><div className="mt-0.5 break-all text-[11px] text-slate-400">{item.recipient_name||item.recipient_role} · {item.recipient_email}</div></div><span className="rounded-lg border border-cyan-400/25 px-2 py-1 text-[10px] text-cyan-100">{item.status.replaceAll("_"," ")}</span></div>
        <div className="mt-1 text-[10px] text-slate-400">Due: {fmt(item.due_date)}{item.followup_due?" · Follow-up due":""}{item.overdue?" · OVERDUE":""} · {item.action.replaceAll("_"," ").toLowerCase()}</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {item.status==="DRAFT"?<button type="button" disabled={busy} onClick={()=>action(item,"SEND")} className="min-h-9 rounded-lg bg-cyan-400 px-3 text-[11px] font-black text-slate-950">Send request email</button>:null}
          {item.sent_at&&!["VERIFIED","CANCELED"].includes(item.status)?<button type="button" disabled={busy} onClick={()=>action(item,"REMIND")} className="min-h-9 rounded-lg border border-amber-400/35 px-3 text-[11px] font-bold text-amber-100">Send follow-up</button>:null}
          <button type="button" onClick={()=>{setSelected(item);setChange({status:item.status==="DRAFT"?"CANCELED":"ACKNOWLEDGED",completion_evidence:item.completion_evidence||"",completion_document_id:item.completion_document_id||""});}} className="min-h-9 rounded-lg border border-slate-600 px-3 text-[11px] font-bold">Review evidence</button>
        </div>
      </article>)}
    </div>
    {selected?<div className="mt-3 space-y-3 rounded-xl border border-fuchsia-400/25 bg-fuchsia-400/5 p-3">
      <div className="flex items-center justify-between gap-2"><div className="text-xs font-black">Verify: {selected.title}</div><button onClick={()=>setSelected(null)} type="button" className="text-xs text-slate-400">Close</button></div>
      <Field label="Status"><select className={input} value={change.status} onChange={e=>setChange(s=>({...s,status:e.target.value}))}>{stages.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field>
      <Field label="Reply / signature verification evidence"><textarea rows={2} className={input} value={change.completion_evidence} onChange={e=>setChange(s=>({...s,completion_evidence:e.target.value}))} placeholder="Email ID, signer verification method, approval number, date, issuing organization..."/></Field>
      <Field label="Uploaded signed / approval file"><select className={input} value={change.completion_document_id||""} onChange={e=>setChange(s=>({...s,completion_document_id:e.target.value||""}))}><option value="">No supporting file</option>{docs.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</select></Field>
      <button type="button" disabled={busy} onClick={saveStatus} className="min-h-10 w-full rounded-lg bg-cyan-400 text-xs font-black text-slate-950 disabled:opacity-40">Save review status</button>
    </div>:null}
   </Card>
   <Card title="What is this email asking for?" info="Paste a response from a housing administrator, owner or former manager. The first pass identifies explicit document names; it does not read your inbox or send anything.">
    <textarea rows={5} aria-label="Paste document request email" className={input} value={emailText} onChange={e=>setEmailText(e.target.value)} placeholder="Please provide a recorded warranty deed..."/>
    <button type="button" onClick={analyze} disabled={busy||!emailText.trim()} className="mt-2 min-h-10 w-full rounded-lg border border-cyan-400/35 bg-cyan-500/10 text-xs font-black text-cyan-100 disabled:opacity-40">Identify missing documents</button>
    {suggestions.length?<div className="mt-3 space-y-2">{suggestions.map(s=><article key={s.checklist_key} className="rounded-lg border border-slate-700 p-2.5"><div className="text-xs font-black">{s.checklist_key.replaceAll("_"," ")}</div><div className="mt-1 text-[11px] text-slate-400">Matched: {s.matched_phrase}</div><div className="mt-1 text-[11px] italic text-slate-300">“{s.source_excerpt}”</div><p className="mt-2 text-[10px] text-amber-200">Needs human confirmation. Nothing has been sent or marked complete.</p></article>)}</div>:null}
   </Card>
  </>:<p className="text-xs text-slate-500">Select a property to view its requests and recipients.</p>}
 </main></PMShell>;
}
