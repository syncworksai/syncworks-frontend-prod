import React,{useEffect,useState} from "react";
import {useNavigate,useSearchParams} from "react-router-dom";
import api from "../api/client";
const style="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white";
const blank={phone:"",preferred_contact:"EMAIL",preferred_move_in:"",housing_notes:"",
  agent_name:"",agent_email:"",agency_name:"",voucher_amount:"",voucher_bedrooms:0,
  section8_requested:false,adults:1,children:0,pets:0,pets_notes:"",household_notes:""};
function Field({name,children}){return <label className="block min-w-0 text-xs text-slate-400">{name}<div className="mt-1">{children}</div></label>;}
export default function PMApplicationForm(){
  const nav=useNavigate(),[params]=useSearchParams(),token=params.get("token")||"";
  const [loaded,setLoaded]=useState(null),[form,setForm]=useState(blank),[loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[done,setDone]=useState(false);
  const update=(key,v)=>setForm(old=>({...old,[key]:v}));
  useEffect(()=>{
    let live=true;
    if(!token){setLoading(false);setError("Your property manager must provide a secure application link.");return;}
    api.get("/pm-hub/onboarding/applications/my/",{params:{token}}).then(r=>{
      if(!live)return;
      setLoaded(r.data);
      setForm({...blank,...r.data.application,section8_requested:r.data.section8_requested,
        voucher_amount:r.data.voucher_amount,voucher_bedrooms:r.data.voucher_bedrooms,
        adults:r.data.adults,children:r.data.children,pets:r.data.pets});
      setDone(r.data.application_status==="SUBMITTED");
    }).catch(e=>{if(live)setError(e?.response?.data?.detail||"Application link is unavailable. Sign in with the matching email or request a new link.");})
    .finally(()=>{if(live)setLoading(false);});
    return()=>{live=false};
  },[token]);
  async function submit(e){
    e.preventDefault();if(done||busy||!loaded)return;
    setBusy(true);setError("");
    try{
      await api.post("/pm-hub/onboarding/applications/my/",{...form,token,
        property_id:loaded.property_id||""});
      setDone(true);
    }catch(err){setError(err?.response?.data?.detail||"Could not submit your application. Please review the fields.");}
    finally{setBusy(false);}
  }
  return <main className="min-h-screen bg-[#030915] px-3 py-6 pb-24 text-white sm:px-6">
    <div className="mx-auto max-w-3xl space-y-4">
      <header className="rounded-2xl border border-cyan-400/25 bg-[#07111f] p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-cyan-300">SyncWorks · Residential Application</p>
        <h1 className="mt-2 text-xl font-black sm:text-2xl">Apply for a home</h1>
        <p className="mt-1 text-xs text-slate-400">Complete your basic applicant information before or after selecting a property. Your property manager will review it.</p>
        <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs">
          <span>{loaded?.name||"Invited applicant"}</span><span className="text-slate-400">{loaded?.email||""}</span>
        </div>
      </header>
      {loading?<p className="text-sm text-slate-400">Checking your invitation…</p>:null}
      {error?<p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>:null}
      {done?<section className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-5">
        <h2 className="text-lg font-black text-emerald-200">Application received</h2>
        <p className="mt-2 text-sm text-slate-300">Your property manager can review and approve it. This is not a lease, housing-authority approval, screening authorization, or a payment.</p>
        <button className="mt-3 rounded-lg border border-cyan-500/40 px-3 py-2 text-xs text-cyan-200" onClick={()=>nav("/")}>Return to SyncWorks</button>
      </section>:null}
      {loaded&&!done?<form onSubmit={submit} className="space-y-3 rounded-2xl border border-slate-700 bg-[#07111f] p-4">
        <h2 className="text-base font-black">Your application</h2>
        <p className="text-[11px] text-amber-200">Do not enter Social Security numbers, date of birth, government ID numbers, bank accounts, or screening reports in these fields. Management will request protected documents separately.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field name="Phone"><input className={style} value={form.phone||""} onChange={e=>update("phone",e.target.value)}/></Field>
          <Field name="Preferred contact"><select className={style} value={form.preferred_contact||"EMAIL"} onChange={e=>update("preferred_contact",e.target.value)}>
            <option value="EMAIL">Email</option><option value="PHONE">Phone</option><option value="TEXT">Text</option>
          </select></Field>
          <Field name="Preferred move-in date"><input type="date" className={style} value={form.preferred_move_in||""} onChange={e=>update("preferred_move_in",e.target.value)}/></Field>
          <Field name="Property"><div className="min-h-11 rounded-lg border border-slate-700 px-3 py-3 text-sm">{loaded.property_name||"Not selected yet"}</div></Field>
          {["adults","children","pets"].map(key=><Field key={key} name={key==="adults"?"Adults":key==="children"?"Children":"Pets"}>
            <input min="0" max="50" type="number" className={style} value={form[key]??0} onChange={e=>update(key,Number(e.target.value))}/>
          </Field>)}
        </div>
        <Field name="Household and move-in notes (optional)"><textarea rows={2} className={style} value={form.household_notes||""} onChange={e=>update("household_notes",e.target.value)}/></Field>
        <Field name="Pet notes (optional)"><input className={style} value={form.pets_notes||""} onChange={e=>update("pets_notes",e.target.value)}/></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.section8_requested} onChange={e=>update("section8_requested",e.target.checked)}/>I am applying with a Section 8 / housing voucher</label>
        {form.section8_requested?<div className="space-y-3 rounded-xl border border-fuchsia-400/25 bg-fuchsia-500/5 p-3">
          <p className="text-xs text-fuchsia-200">Voucher information (not final housing payment approval)</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field name="Voucher payment standard"><input inputMode="decimal" className={style} value={form.voucher_amount||""} onChange={e=>update("voucher_amount",e.target.value)}/></Field>
            <Field name="Voucher bedrooms"><input type="number" min="0" max="20" className={style} value={form.voucher_bedrooms??0} onChange={e=>update("voucher_bedrooms",Number(e.target.value))}/></Field>
            <Field name="Housing authority"><input className={style} value={form.agency_name||""} onChange={e=>update("agency_name",e.target.value)}/></Field>
            <Field name="Housing agent name"><input className={style} value={form.agent_name||""} onChange={e=>update("agent_name",e.target.value)}/></Field>
            <Field name="Housing agent email"><input type="email" className={style} value={form.agent_email||""} onChange={e=>update("agent_email",e.target.value)}/></Field>
          </div>
        </div>:null}
        <p className="text-[11px] text-slate-400">Submitting saves your application in your property manager's private PM portfolio for review. This does not authorize a credit/background check or sign a lease.</p>
        <button type="submit" disabled={busy} className="min-h-12 w-full rounded-xl bg-cyan-400 text-sm font-black text-slate-950 disabled:opacity-40">{busy?"Submitting…":"Submit application"}</button>
      </form>:null}
    </div>
  </main>;
}
