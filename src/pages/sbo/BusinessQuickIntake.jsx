import React,{useEffect,useMemo,useState} from "react";
import {useNavigate,useSearchParams} from "react-router-dom";
import {CheckCircle2,ChevronDown,ChevronRight,ClipboardList,Clock3,MapPin,Plus,Search,Settings2,UserRound,X} from "lucide-react";
import api from "../../api/client";
import {useAuth} from "../../auth/AuthContext";
import "./BusinessQuickIntake.css";
import PlaceSearchField from "../../components/PlaceSearchField";

const EMPTY={customer_name:"",phone:"",email:"",service_address:"",service_label:"",description:"",urgency:"STANDARD",scheduled_start:"",estimated_duration_minutes:60,assigned_member_id:"",required_skills:[]};
const field="w-full min-w-0 rounded-xl border border-cyan-300/20 bg-[#030d24]/65 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300";
const asList=(x)=>Array.isArray(x)?x:(x?.results||x?.customers||x?.assignees||[]);
const errText=e=>{const d=e?.response?.data;return(typeof d?.detail==="string"&&d.detail)||Object.values(d||{}).flat().find(x=>typeof x==="string")||e?.message||"Unable to save ticket.";};
const localTime=()=>{const d=new Date();return d.toLocaleString();};
export default function BusinessQuickIntake(){
 const nav=useNavigate(),[params]=useSearchParams(),{activeBusinessId}=useAuth();
 const supportId=params.get("support_business"),supportMode=Boolean(supportId);
 const businessId=String(activeBusinessId||localStorage.getItem("sw_active_business_id")||"");
 const base=supportMode?`/platform/businesses/${encodeURIComponent(supportId)}/assist`:"/business";
 const [form,setForm]=useState(EMPTY),[customers,setCustomers]=useState([]),[staff,setStaff]=useState([]),[services,setServices]=useState([]),[partners,setPartners]=useState([]),[partnerId,setPartnerId]=useState("");
 const [search,setSearch]=useState(""),[addressQuery,setAddressQuery]=useState(""),[serviceQuery,setServiceQuery]=useState("");
 const [attachments,setAttachments]=useState([]),[uploadWarning,setUploadWarning]=useState(""),[category,setCategory]=useState(""),[catalogSearch,setCatalogSearch]=useState("");
 const [panel,setPanel]=useState(null),[saving,setSaving]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState(null),[mode,setMode]=useState("queue");
 const set=(key,val)=>setForm(f=>({...f,[key]:val}));
 const opts=useMemo(()=>supportMode?{}:{headers:{"X-Business-Id":businessId}},[supportMode,businessId]);
 useEffect(()=>{
  if(!supportMode&&!businessId)return;
  let active=true;
  Promise.allSettled([
    api.get(supportMode?`${base}/customers/`:"/business-customers/",opts),
    supportMode?Promise.resolve({data:[]}):api.get("/tickets/assignees/",opts),
    supportMode?Promise.resolve({data:[]}):api.get("/service-catalog/",{...opts,params:{item_type:"SERVICE",active_only:true}}),
    supportMode?Promise.resolve({data:[]}):api.get("/business-partners/",opts)
  ]).then(result=>{if(!active)return;if(result[0].status==="fulfilled")setCustomers(asList(result[0].value.data));if(result[1].status==="fulfilled")setStaff(asList(result[1].value.data));if(result[2].status==="fulfilled")setServices(asList(result[2].value.data));if(result[3].status==="fulfilled")setPartners(asList(result[3].value.data));});
  return()=>{active=false;};
 },[businessId,base,supportMode]);
 useEffect(()=>{
  if(supportMode||!businessId||!search.trim())return;
  let active=true;const timer=setTimeout(()=>api.get("/business-customers/",{...opts,params:{search:search.trim()}}).then(r=>{if(active)setCustomers(asList(r.data));}).catch(()=>{}),220);
  return()=>{active=false;clearTimeout(timer);};
 },[search,businessId,supportMode]);
 const matched=useMemo(()=>customers.filter(c=>[c.name,c.phone,c.email].join(" ").toLowerCase().includes(search.toLowerCase())).slice(0,6),[customers,search]);
 const addresses=useMemo(()=>[...new Set(customers.map(c=>c.service_address).filter(Boolean))].filter(a=>a.toLowerCase().includes(addressQuery.toLowerCase())).slice(0,7),[customers,addressQuery]);
 const quickServices=useMemo(()=>services.filter(s=>s.is_active!==false && s.is_featured).slice(0,5),[services]);
 const categories=useMemo(()=>[...new Set(services.map(s=>s.service_category||"General").filter(Boolean))].sort(),[services]);
 const catalogServices=useMemo(()=>services.filter(s=>(!category || (s.service_category||"General")===category) && String([s.name,s.service_category,s.description].join(" ")).toLowerCase().includes(catalogSearch.toLowerCase())),[services,category,catalogSearch]);
 const pickCustomer=c=>{setForm(f=>({...f,customer_name:c.name||"",phone:c.phone||"",email:c.email||"",service_address:c.service_address||""}));setAddressQuery(c.service_address||"");setSearch("");setPanel(null);};
 const pickService=s=>{setForm(f=>({...f,service_label:s.name||"",required_skills:Array.isArray(s.required_skills)?s.required_skills:[],estimated_duration_minutes:Number(s.estimated_duration_minutes||f.estimated_duration_minutes)}));setServiceQuery(s.name||"");setPanel(null);};
 const chooseAddress=a=>{set("service_address",a);setAddressQuery(a);setPanel(null);};
 const save=async(e)=>{
  e?.preventDefault?.();setError("");setSuccess(null);
  if(!supportMode&&!businessId){setError("Select a business first.");return;}
  if(![form.customer_name,form.phone,form.email].some(x=>String(x||"").trim())){setError("Enter the caller's name, phone, or email.");return;}
  if(!form.service_label.trim()){setError("Select a service or enter a custom service.");setPanel("service");return;}
  if(attachments.some(f=>f.size>10*1024*1024)){setError("Each attachment must be 10 MB or smaller.");setPanel("attachments");return;}
  if(mode==="partner"&&!partnerId){setError("Select an active subcontractor before offering this ticket.");setPanel("assignment");return;}
  setSaving(true);
  try{
   const body={...form,assigned_member_id:mode==="tech"&&form.assigned_member_id?Number(form.assigned_member_id):null,scheduled_start:form.scheduled_start?new Date(form.scheduled_start).toISOString():null,estimated_duration_minutes:Number(form.estimated_duration_minutes||60)};
   const r=await api.post(`${base}/quick-intake/`,body,opts);
   let failedFiles=[];
   for(const file of attachments){
    try{
      const upload=new FormData();upload.append("ticket",String(r.data.ticket_id));upload.append("file",file);
      await api.post("/ticket-attachments/",upload,{...opts,headers:{...(opts.headers||{}),"Content-Type":"multipart/form-data"}});
    }catch{failedFiles.push(file.name);}
   }
   setUploadWarning(failedFiles.length?`Ticket created, but these files were not uploaded: ${failedFiles.join(", ")}. You can retry from the ticket's Attachments tab.`:"");
   if(mode==="partner"&&partnerId&&!supportMode){
     try{
       const offer=await api.post("/partner-work-tickets/",{
         relationship:Number(partnerId),source_ticket:Number(r.data.ticket_id),
         title:form.service_label,scope:form.description,
         scheduled_at:body.scheduled_start,
         share_customer_contact:false
       },opts);
       setSuccess({...r.data,partner_offer_id:offer.data.id,partner_status:offer.data.status});
     }catch(offerError){
       setSuccess({...r.data,partner_offer_error:errText(offerError)});
     }
   }else setSuccess(r.data);
   setPanel("success");
  }catch(e){setError(errText(e));}finally{setSaving(false);}
 };
 const modal=(title,children)=><div className="absolute inset-0 z-40 flex items-end justify-center bg-[#020817]/70 p-2 backdrop-blur-md sm:items-center" onMouseDown={e=>{if(e.target===e.currentTarget)setPanel(null);}}><section role="dialog" aria-modal="true" aria-label={title} className="sw-intake-panel flex max-h-[92%] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-cyan-400/40 p-4 text-white shadow-2xl"><div className="mb-3 flex items-center justify-between"><h2 className="font-bold">{title}</h2><button type="button" onClick={()=>setPanel(null)} aria-label="Close panel" className="rounded-lg border border-white/10 p-2"><X size={17}/></button></div><div className="min-h-0 space-y-3 overflow-y-auto">{children}</div></section></div>;
 return <div className="sw-intake-root relative isolate h-[calc(100dvh-172px)] min-h-[390px] overflow-hidden px-3 py-3 text-white sm:h-[calc(100dvh-110px)]">
  <div className="sw-intake-background absolute inset-0 -z-20"/><div className="absolute inset-0 -z-10 bg-[#020b1e]/65"/>
  <form onSubmit={save} className="mx-auto flex h-full w-full max-w-5xl flex-col gap-2">
   <header className="sw-intake-glass flex shrink-0 items-center justify-between rounded-2xl p-3"><div><div className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">SYNCWORKS · Business Intake</div><h1 className="text-lg font-bold sm:text-2xl">New Request</h1></div><button type="button" onClick={()=>nav(supportMode?"/platform":"/sbo/dispatch")} className="rounded-xl border border-white/15 px-3 py-2 text-xs">Back</button></header>
   {supportMode&&<p className="rounded-lg border border-fuchsia-300/20 bg-fuchsia-500/10 px-3 py-1 text-xs">Founder-assisted intake. No customer invitation is sent.</p>}
   {error&&<div role="alert" className="rounded-xl border border-rose-400/30 bg-rose-900/40 px-3 py-2 text-xs text-rose-200">{error}</div>}
   <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_230px]">
    <div className="sw-intake-glass flex min-h-0 flex-col gap-3 rounded-2xl p-3">
     <div className="relative"><label className="mb-1 block text-[11px] text-cyan-200">Find saved customer</label><input className={field} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, number or email" autoComplete="off"/>{search.trim()&&matched.length>0&&<div className="absolute z-30 mt-1 max-h-32 w-full overflow-y-auto rounded-xl border border-cyan-400/30 bg-[#07152c] shadow-xl">{matched.map(c=><button key={c.id} type="button" onClick={()=>pickCustomer(c)} className="block w-full border-b border-white/10 px-3 py-2 text-left text-xs hover:bg-cyan-500/10">{c.name||c.phone||c.email} · {c.phone||c.email||""}</button>)}</div>}</div>
     <div className="grid grid-cols-2 gap-2"><label className="text-[11px] text-slate-300">Customer<input className={field} value={form.customer_name} onChange={e=>set("customer_name",e.target.value)} placeholder="Caller name"/></label><label className="text-[11px] text-slate-300">Phone<input className={field} type="tel" value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="(555) 555-5555"/></label></div>
     <label className="text-[11px] text-slate-300">Email<input className={field} type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="Optional"/></label>
     <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <div className="relative"><label className="text-[11px] text-slate-300">Service address</label><div className="flex gap-1"><input className={field} value={form.service_address} onChange={e=>{set("service_address",e.target.value);setAddressQuery(e.target.value)}} placeholder="Street, city, state, ZIP"/><button type="button" aria-label="Saved service addresses" onClick={()=>setPanel("address")} className="rounded-xl border border-white/15 px-2"><MapPin size={17}/></button></div></div>
      <div><label className="text-[11px] text-slate-300">Service requested</label><button type="button" onClick={()=>setPanel("service")} className={field+" flex items-center justify-between text-left"}><span className={form.service_label?"text-white":"text-slate-400"}>{form.service_label||"Choose a service"}</span><ChevronDown size={17}/></button></div>
     </div>
     <button type="button" onClick={()=>setPanel("attachments")} className="sw-intake-tap flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs"><span>📎 Photos & attachments {attachments.length?`(${attachments.length} selected)`:"(optional)"}</span><ChevronRight size={16}/></button>
     <button type="button" onClick={()=>setPanel("notes")} className="sw-intake-tap flex items-center justify-between rounded-xl px-3 py-3 text-left text-sm"><span><strong>Detailed description & access notes</strong><small className="block truncate text-slate-300">{form.description||"Add the problem, instructions, and anything the tech needs"}</small></span><ChevronRight size={18}/></button>
     <div className="mt-auto flex flex-wrap gap-2"><button type="button" onClick={()=>setPanel("schedule")} className="sw-intake-tap flex-1 rounded-xl px-3 py-3 text-xs"><Clock3 className="mr-2 inline" size={15}/>Schedule · {form.scheduled_start?"Set":"Optional"}</button><button type="button" onClick={()=>setPanel("assignment")} className="sw-intake-tap flex-1 rounded-xl px-3 py-3 text-xs"><UserRound className="mr-2 inline" size={15}/>Assignment · {mode==="tech"?"Technician":mode==="partner"?"Subcontractor":"Dispatch queue"}</button></div>
    </div>
    <aside className="sw-intake-glass flex min-h-0 flex-col rounded-2xl p-3">
      <h2 className="text-sm font-semibold">Request summary</h2>
      <div className="mt-3 space-y-3 text-xs"><div><span className="text-slate-400">Service</span><p className="font-semibold">{form.service_label||"Select a service"}</p></div><div><span className="text-slate-400">Location</span><p className="line-clamp-2">{form.service_address||"Not entered"}</p></div><div><span className="text-slate-400">Priority</span><select aria-label="Priority" className={field} value={form.urgency} onChange={e=>set("urgency",e.target.value)}>{["FLEXIBLE","STANDARD","URGENT","EMERGENCY"].map(x=><option key={x}>{x}</option>)}</select></div><div><span className="text-slate-400">Estimated job time</span><select className={field} value={form.estimated_duration_minutes} onChange={e=>set("estimated_duration_minutes",Number(e.target.value))}>{[30,45,60,90,120,180,240].map(n=><option key={n} value={n}>{n} min</option>)}</select></div></div>
      <div className="mt-auto pt-2"><button type="submit" disabled={saving} className="w-full rounded-xl bg-cyan-400 px-3 py-3 text-sm font-black text-slate-950 disabled:opacity-50">{saving?"Creating…":"Create ticket"}</button><p className="mt-2 text-[10px] leading-4 text-slate-400">Customer is saved to CRM. No customer invitation is sent.</p></div>
    </aside>
   </div>
   <div className="sw-intake-glass flex shrink-0 items-center justify-between rounded-xl px-3 py-2 text-xs text-slate-300"><span>New request · customer → service → dispatch</span><span>One-screen workflow</span></div>
  </form>
  {panel==="address"&&modal("Find service address",<><PlaceSearchField label="Search full service address" value={addressQuery} onChange={value=>setAddressQuery(value)} onSelect={place=>{const address=place.formatted_address||[place.address_line1,place.city,place.state,place.postal_code].filter(Boolean).join(", ");chooseAddress(address);}} placeholder="Street address, city, state and ZIP"/>{addresses.map(a=><button key={a} onClick={()=>chooseAddress(a)} className="sw-intake-option w-full rounded-xl p-3 text-left text-sm">{a}</button>)}<button onClick={()=>chooseAddress(addressQuery)} className="w-full rounded-xl border border-cyan-400/40 p-3 text-left text-xs">Use typed address: {addressQuery||"Enter above"}</button><p className="text-xs text-slate-400">Select a verified result from Calendar address search, a previously saved customer address, or enter a full address manually (street, city, state and ZIP).</p></>)}
  {panel==="service"&&modal("Choose a service",<>
    <p className="text-xs text-slate-300">Quick choices configured by your business. Browse Catalog for everything else.</p>
    <div className="grid grid-cols-2 gap-2">{quickServices.map(s=><button key={s.id} onClick={()=>pickService(s)} className="sw-intake-option rounded-xl p-3 text-left text-xs"><strong>{s.name}</strong><span className="mt-1 block text-slate-400">{s.service_category||"General"}</span></button>)}</div>
    {!quickServices.length&&<p className="text-xs text-slate-400">No Quick Services configured yet.</p>}
    <button onClick={()=>{setCategory("");setCatalogSearch("");setPanel("catalog")}} className="w-full rounded-xl border border-cyan-400/40 bg-cyan-500/10 p-3 text-left text-sm font-semibold text-cyan-100">Browse full Catalog →</button>
    <button onClick={()=>pickService({name:"General Service Request",required_skills:[]})} className="w-full rounded-xl border border-white/15 p-3 text-left text-sm">General Service Request · add details later</button><button onClick={()=>setPanel("customService")} className="w-full rounded-xl border border-white/15 p-3 text-left text-sm">Other / custom service</button>
  </>)}
  {panel==="catalog"&&modal("Service Catalog",<>
    <input autoFocus className={field} value={catalogSearch} onChange={e=>setCatalogSearch(e.target.value)} placeholder="Search all services"/>
    <div className="flex flex-wrap gap-2"><button onClick={()=>setCategory("")} className="rounded-lg border border-cyan-400/30 px-3 py-1.5 text-xs">All</button>{categories.map(name=><button key={name} onClick={()=>setCategory(name)} className={`rounded-lg border px-3 py-1.5 text-xs ${category===name?"border-cyan-300 bg-cyan-500/20":"border-white/15"}`}>{name}</button>)}</div>
    {catalogServices.map(s=><button key={s.id} onClick={()=>pickService(s)} className="sw-intake-option w-full rounded-xl p-3 text-left"><strong className="block text-sm">{s.name}</strong><span className="text-[11px] text-slate-400">{s.service_category||"General"} · {s.estimated_duration_minutes||60} min</span></button>)}
    {!catalogServices.length&&<p className="text-xs text-slate-400">No matching services in this business catalog.</p>}
    <button onClick={()=>setPanel("customService")} className="w-full rounded-xl border border-cyan-400/25 p-3 text-sm">Other / General request</button>
    <button onClick={()=>nav("/sbo/catalog")} className="w-full rounded-xl border border-white/10 p-3 text-xs text-slate-300">Manage Catalog in Business Settings</button>
  </>)}
  {panel==="customService"&&modal("Other / General request",<><input className={field} autoFocus value={serviceQuery} onChange={e=>setServiceQuery(e.target.value)} placeholder="Describe the service, e.g. Door repair"/><button disabled={!serviceQuery.trim()} onClick={()=>pickService({name:serviceQuery.trim(),required_skills:[]})} className="w-full rounded-xl border border-cyan-400/40 bg-cyan-500/15 p-3 disabled:opacity-40">Use custom service</button></>)}
  {panel==="attachments"&&modal("Photos & Attachments",<>
    <label className="block rounded-xl border border-dashed border-cyan-400/40 p-4 text-sm">Add images or PDFs
      <input type="file" multiple accept="image/*,application/pdf" className="mt-2 block w-full text-xs" onChange={e=>{const files=Array.from(e.target.files||[]);setAttachments(prev=>[...prev,...files].slice(0,8));e.target.value="";}}/>
    </label><p className="text-xs text-slate-400">Up to 8 files, 10 MB each. Files upload after the ticket is saved.</p>
    {attachments.map((f,i)=><div key={i} className="flex items-center justify-between rounded-xl border border-white/15 p-2 text-xs"><span className="min-w-0 truncate">{f.name}</span><button onClick={()=>setAttachments(v=>v.filter((_,index)=>index!==i))} className="ml-2 text-rose-200">Remove</button></div>)}
    <button onClick={()=>setPanel(null)} className="w-full rounded-xl bg-cyan-500/20 p-3 text-sm">Done</button>
  </>)}
  {panel==="notes"&&modal("Problem & access details",<><label className="text-xs text-slate-300">Detailed job description<textarea autoFocus className={field} rows={7} value={form.description} onChange={e=>set("description",e.target.value)} placeholder="What is happening? What should the technician bring? Access instructions?"/></label><button onClick={()=>setPanel(null)} className="w-full rounded-xl bg-cyan-500/20 p-3 text-sm text-cyan-100">Save details</button></>)}
  {panel==="schedule"&&modal("Scheduling",<><label className="text-xs">Expected start<input type="datetime-local" value={form.scheduled_start} onChange={e=>set("scheduled_start",e.target.value)} className={field}/></label><label className="block text-xs">Estimated duration (minutes)<input type="number" min="15" max="1440" value={form.estimated_duration_minutes} onChange={e=>set("estimated_duration_minutes",e.target.value)} className={field}/></label><button onClick={()=>setPanel(null)} className="w-full rounded-xl bg-cyan-500/20 p-3">Apply schedule</button></>)}
  {panel==="assignment"&&modal("Assignment",<><label className="flex gap-2 rounded-xl border border-white/15 p-3 text-sm"><input type="radio" checked={mode==="queue"} onChange={()=>setMode("queue")}/>Leave in dispatch queue</label>{!supportMode&&<label className="flex gap-2 rounded-xl border border-white/15 p-3 text-sm"><input type="radio" checked={mode==="tech"} onChange={()=>setMode("tech")}/>Assign an internal technician</label>}{!supportMode&&<label className="flex gap-2 rounded-xl border border-white/15 p-3 text-sm"><input type="radio" checked={mode==="partner"} onChange={()=>setMode("partner")}/>Offer to subcontractor</label>}{mode==="partner"&&!supportMode&&<><select className={field} value={partnerId} onChange={e=>setPartnerId(e.target.value)}><option value="">Choose active subcontractor</option>{partners.filter(p=>p.status==="ACTIVE"&&String(p.hiring_business)===businessId).map(p=><option key={p.id} value={p.id}>{p.partner_business_card?.name||"Partner business"}</option>)}</select><button type="button" className="w-full rounded-xl border border-cyan-400/30 p-3 text-xs text-cyan-200" onClick={()=>nav("/sbo/partners")}>Save / invite a new subcontractor in Partner Hub</button><p className="text-xs text-slate-300">The subcontractor receives an offered work record in their Partner Hub and may accept or decline. No customer contact information is shared by default.</p></>}{mode==="tech"&&!supportMode&&<select className={field} value={form.assigned_member_id} onChange={e=>set("assigned_member_id",e.target.value)}><option value="">Choose a technician</option>{staff.filter(m=>["TECHNICIAN","TECH"].includes(String(m.role||"").toUpperCase())).map(m=><option key={m.user_id||m.id} value={m.user_id||m.id}>{m.user_name||m.name||m.user_email||"Employee"}</option>)}</select>}<p className="text-xs text-slate-400">New subcontractors must first accept the Partner Hub business invitation. Declined work returns to the unassigned queue.</p><button onClick={()=>setPanel(null)} className="w-full rounded-xl bg-cyan-500/20 p-3">Apply assignment</button></>)}
  {panel==="success"&&success&&modal("Ticket created",<div role="status" className="space-y-3 text-sm"><CheckCircle2 className="text-emerald-300"/><strong>Ticket #{success.ticket_id} created</strong>{uploadWarning&&<p className="text-amber-200">{uploadWarning}</p>}<p className="text-slate-300">{success.customer_created?"Customer added to CRM":"Existing customer matched"}. No customer invitation sent.</p>{success.partner_offer_id&&<p className="text-cyan-200">Subcontractor offer #{success.partner_offer_id} created · {success.partner_status||"OFFERED"}. The partner can accept or decline in Partner Hub.</p>}{success.partner_offer_error&&<p className="text-amber-200">Ticket saved, but subcontractor offer failed: {success.partner_offer_error}. Assign it from Partner Hub.</p>}<div className="flex gap-2"><button onClick={()=>nav(`/tickets/${success.ticket_id}`)} className="flex-1 rounded-xl bg-cyan-500/20 p-3">Open ticket</button><button onClick={()=>{setPanel(null);setSuccess(null);setForm(EMPTY);setMode("queue");setAddressQuery("");setServiceQuery("");setAttachments([]);setUploadWarning("");}} className="flex-1 rounded-xl border border-white/20 p-3">Another call</button><button onClick={()=>nav("/sbo/dispatch")} className="flex-1 rounded-xl border border-white/20 p-3">Dispatch board</button></div></div>)}
 </div>;
}
