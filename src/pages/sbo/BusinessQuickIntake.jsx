import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/client";
import DashboardShell from "../../components/dashboard/DashboardShell";

const EMPTY={customer_name:"",phone:"",email:"",service_address:"",service_label:"",description:"",urgency:"STANDARD",scheduled_start:"",assigned_member_id:""};
const input="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white";
function message(e){const d=e?.response?.data;return (typeof d?.detail==="string"&&d.detail)||Object.values(d||{}).flat().find(x=>typeof x==="string")||e?.message||"Request failed";}
export default function BusinessQuickIntake(){
  const nav=useNavigate(), [params]=useSearchParams();
  const supportId=params.get("support_business");
  const supportMode=Boolean(supportId);
  const [businessId,setBusinessId]=useState("");
  const [form,setForm]=useState(EMPTY),[saving,setSaving]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState(null);
  const [staff,setStaff]=useState([]),[customers,setCustomers]=useState([]),[search,setSearch]=useState("");
  const base=supportMode?`/platform/businesses/${encodeURIComponent(supportId)}/assist`:"/business";
  useEffect(()=>{
    if(supportMode)return;
    setBusinessId(localStorage.getItem("sw_active_business_id")||"");
  },[supportMode]);
  useEffect(()=>{
    if(!supportMode&&!businessId)return;
    let mounted=true;
    const opts=supportMode?{}:{headers:{"X-Business-Id":businessId}};
    Promise.allSettled([
      api.get(supportMode?`${base}/customers/`:"/business-customers/",opts),
      supportMode?Promise.resolve({data:[]}):api.get("/tickets/assignees/",opts),
    ]).then(([c,t])=>{if(!mounted)return;
      if(c.status==="fulfilled")setCustomers(Array.isArray(c.value.data)?c.value.data:(c.value.data?.customers||c.value.data?.results||[]));
      if(t.status==="fulfilled")setStaff(Array.isArray(t.value.data)?t.value.data:(t.value.data?.assignees||t.value.data?.results||[]));
    });
    return()=>{mounted=false};
  },[base,businessId,supportMode]);
  const matches=useMemo(()=>customers.filter(c=>[c.name,c.phone,c.email].join(" ").toLowerCase().includes(search.toLowerCase())).slice(0,6),[customers,search]);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  function choose(c){setForm(f=>({...f,customer_name:c.name||"",phone:c.phone||"",email:c.email||"",service_address:c.service_address||""}));setSearch("");}
  async function submit(e){e.preventDefault();setSaving(true);setError("");setSuccess(null);
    try{
      const body={...form,assigned_member_id:form.assigned_member_id?Number(form.assigned_member_id):null,scheduled_start:form.scheduled_start?new Date(form.scheduled_start).toISOString():null};
      const res=await api.post(`${base}/quick-intake/`,body,supportMode?{}:{headers:{"X-Business-Id":businessId}});
      setSuccess(res.data);setForm(EMPTY);
    }catch(e){setError(message(e))}finally{setSaving(false)}
  }
  return <DashboardShell modeBarTitle={supportMode?"God Mode · Assisted Intake":"Business · Quick Intake"} modeBarSubtitle="One call. One customer. One ticket.">
    <div className="mx-auto max-w-4xl space-y-4 pb-24">
      <div className="rounded-3xl border border-cyan-500/25 bg-slate-900 p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h1 className="text-2xl font-black text-white">Quick phone ticket</h1><button className="rounded-xl border border-slate-600 px-4 py-2 text-sm text-white" onClick={()=>nav(supportMode?"/platform":"/sbo")}>Back</button></div>
        {supportMode?<div className="mb-4 rounded-xl border border-violet-500/30 bg-violet-500/10 p-3 text-xs text-violet-200">Founder-assisted mode · actions are recorded under your own identity · no customer login or invitation is created.</div>:null}
        <div className="relative mb-4"><label className="mb-1 block text-xs text-slate-400">Find existing customer</label><input className={input} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search shared customers by name, email or phone"/>{search&&matches.length?<div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-700 bg-slate-900 shadow-lg">{matches.map(c=><button key={c.id} className="block w-full border-b border-slate-800 px-3 py-3 text-left text-sm text-white hover:bg-slate-800" onClick={()=>choose(c)}>{c.name||c.phone||c.email} · {c.ticket_count||0} previous tickets</button>)}</div>:null}</div>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={submit}>
          {[["customer_name","Customer name"],["phone","Phone"],["email","Email"],["service_address","Service address"],["service_label","Service requested"]].map(([k,label])=><label key={k} className={k==="service_label"?"sm:col-span-2":""}><span className="mb-1 block text-xs text-slate-400">{label}</span><input className={input} required={k==="service_label"} value={form[k]} onChange={e=>set(k,e.target.value)}/></label>)}
          <label className="sm:col-span-2"><span className="mb-1 block text-xs text-slate-400">Problem and access notes</span><textarea className={input} rows={3} value={form.description} onChange={e=>set("description",e.target.value)}/></label>
          <label><span className="mb-1 block text-xs text-slate-400">Urgency</span><select className={input} value={form.urgency} onChange={e=>set("urgency",e.target.value)}>{["FLEXIBLE","STANDARD","URGENT","EMERGENCY"].map(x=><option key={x}>{x}</option>)}</select></label>
          <label><span className="mb-1 block text-xs text-slate-400">Scheduled start (optional)</span><input type="datetime-local" className={input} value={form.scheduled_start} onChange={e=>set("scheduled_start",e.target.value)}/></label>
          {!supportMode?<label className="sm:col-span-2"><span className="mb-1 block text-xs text-slate-400">Assign technician (optional)</span><select className={input} value={form.assigned_member_id} onChange={e=>set("assigned_member_id",e.target.value)}><option value="">Leave in dispatcher queue</option>{staff.filter(m=>["TECHNICIAN","TECH"].includes(String(m.role||"").toUpperCase())).map(m=><option key={m.user_id||m.id} value={m.user_id||m.id}>{m.user_name||m.name||m.full_name||m.user_email||m.email||`Team member ${m.user_id||m.id}`}</option>)}</select></label>:null}
          {error?<div className="sm:col-span-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>:null}
          {success?<div className="sm:col-span-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">Ticket #{success.ticket_id} created. {success.customer_created?"Customer added to shared CRM.":"Existing customer matched."} No invitation was sent.</div>:null}
          <button disabled={saving} className="min-h-12 rounded-xl bg-cyan-500 px-5 font-black text-slate-950 disabled:opacity-50 sm:col-span-2">{saving?"Saving…":"Save customer + create ticket"}</button>
        </form>
      </div>
    </div>
  </DashboardShell>;
}
