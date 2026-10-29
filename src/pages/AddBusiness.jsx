import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, ShieldCheck } from "lucide-react";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext";

const cls = "mt-1.5 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-base text-white outline-none focus:border-cyan-400";
const errText = e => {
  const d = e?.response?.data;
  if (typeof d?.detail === "string") return d.detail;
  if (d && typeof d === "object") return Object.entries(d).map(([k,v])=>`${k}: ${Array.isArray(v)?v.join(", "):String(v)}`).join(" · ");
  return e?.message || "Unable to create this business.";
};

export default function AddBusiness() {
  const nav = useNavigate();
  const { user, reloadBusinesses, setActiveBusinessId } = useAuth();
  const [form,setForm] = useState({
    name:"", business_email:"", phone:"", city:"", state:"", base_zip:"",
    access_code:"", accepts_marketplace_tickets:true, accepts_fee:false,
  });
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState("");
  const set = (key,value)=>setForm(p=>({...p,[key]:value}));

  async function submit(event) {
    event.preventDefault();
    setError("");
    const personalEmail = String(user?.email||"").trim().toLowerCase();
    const companyEmail = String(form.business_email||"").trim().toLowerCase() || personalEmail;
    if (!form.accepts_fee) { setError("Review and accept the platform fee terms."); return; }
    if (!/^\d{5}(?:-?\d{4})?$/.test(form.base_zip.trim())) { setError("Enter a valid five-digit US ZIP code."); return; }
    if (!companyEmail) { setError("Your account must have a verified email."); return; }
    setSaving(true);
    try {
      const result=await api.post("/businesses/",{
        name:form.name.trim(), business_email:companyEmail,
        owner_name:[user?.first_name,user?.last_name].filter(Boolean).join(" "),
        phone:form.phone.trim(),city:form.city.trim(),state:form.state.trim().toUpperCase(),
        base_zip:form.base_zip.trim(),accepts_marketplace_tickets:form.accepts_marketplace_tickets,
        service_radius_miles:25,business_presence_mode:"on_site",
      });
      const id=result?.data?.id;
      if (!id) throw new Error("Business was created but its ID was not returned. Refresh your Business list before retrying.");
      // Preserve a successful create if promo redemption fails so no duplicate businesses are created.
      const code=form.access_code.trim().toUpperCase();
      if (code) {
        try {
          await api.post("/business-access-codes/redeem/",{business_id:id,code});
        } catch(e) {
          try { localStorage.setItem(`sw_pending_business_access_code_${id}`,code); } catch {}
          setError("Business created. Your access code could not be confirmed; review it in Business billing settings.");
        }
      }
      try { localStorage.setItem("sw_active_business_id",String(id)); } catch {}
      try { setActiveBusinessId?.(id); } catch {}
      await Promise.resolve(reloadBusinesses?.()).catch(()=>{});
      nav("/sbo/settings/general?setup=1&return=%2Fsbo",{replace:true});
    } catch(e) { setError(errText(e)); }
    finally{setSaving(false);}
  }

  const label=(name, key, options={})=><label className="block text-xs font-bold text-slate-300">{name}
    <input className={cls} type={options.type||"text"} value={form[key]} onChange={e=>set(key,options.upper?e.target.value.toUpperCase():e.target.value)} required={options.required||false} autoComplete={options.autoComplete} maxLength={options.maxLength} placeholder={options.placeholder||""}/>
  </label>;

  return <div className="min-h-dvh bg-[#030712] px-4 py-8 text-white">
    <main className="mx-auto max-w-xl">
      <Link to="/get-started" className="text-sm font-bold text-cyan-300">← All onboarding options</Link>
      <div className="mt-6 rounded-3xl border border-cyan-400/25 bg-[#081525]/90 p-5 shadow-2xl sm:p-7">
        <div className="flex items-center gap-3"><Building2 size={28} className="text-cyan-200"/><div><p className="text-xs uppercase tracking-widest text-cyan-300">Step 2 · Business</p><h1 className="text-2xl font-black">Add your business</h1></div></div>
        <p className="mt-3 text-sm leading-6 text-slate-300">Your Personal login already exists. This company will have its own profile, customer-facing email, settings and team permissions—no second login needed.</p>
        <div className="mt-4 flex gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-100"><ShieldCheck size={17} className="shrink-0 mt-0.5"/> Personal sign-in: {user?.email||"verified account"}</div>
        {error?<p role="alert" className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>:null}
        <form onSubmit={submit} className="mt-5 space-y-4">
          {label("Business name","name",{required:true,autoComplete:"organization"})}
          {label("Business contact email","business_email",{type:"email",autoComplete:"off",placeholder:user?.email||"work@company.com"})}
          <p className="-mt-2 text-xs text-slate-400">Optional. Leave blank to use your Personal login email. Changing this doesn't change how you sign in.</p>
          {label("Business phone","phone",{type:"tel",autoComplete:"tel"})}
          <div className="grid grid-cols-2 gap-3">{label("City","city",{autoComplete:"address-level2"})}{label("State","state",{maxLength:2,upper:true,autoComplete:"address-level1"})}</div>
          {label("Service ZIP","base_zip",{required:true,autoComplete:"postal-code",maxLength:10})}
          {label("Business access code","access_code",{placeholder:"SWFF26 (if invited)"})}
          <label className="flex items-start gap-2 rounded-xl border border-slate-700 p-3 text-sm"><input type="checkbox" checked={form.accepts_marketplace_tickets} onChange={e=>set("accepts_marketplace_tickets",e.target.checked)} className="mt-1"/> Allow eligible customers in my service area to request jobs</label>
          <label className="flex items-start gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-3 text-sm"><input type="checkbox" checked={form.accepts_fee} onChange={e=>set("accepts_fee",e.target.checked)} required className="mt-1"/> I acknowledge that a promotional subscription waiver does not automatically waive platform transaction fees. Final payment terms are provided before collection is enabled.</label>
          <button type="submit" disabled={saving||!form.accepts_fee} className="min-h-12 w-full rounded-xl bg-cyan-400 px-4 font-black text-slate-950 disabled:opacity-40">{saving?"Creating business…":"Create business and continue setup"}</button>
        </form>
      </div>
    </main>
  </div>;
}
