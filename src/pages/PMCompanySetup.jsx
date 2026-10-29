import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, ShieldCheck } from "lucide-react";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext";

const field = "mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400";
export default function PMCompanySetup() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [existing, setExisting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name:"", office_email:"", manager_name:"", phone:"", reply_to_email:"" });

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await api.get("/pm-hub/workspaces/current/");
        if (live) setExisting(r.data);
      } catch (err) {
        if (live && err?.response?.status !== 404) setError(err?.response?.data?.detail || "Unable to check your property-management workspace.");
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, []);

  function set(key,value) { setForm(current => ({ ...current,[key]:value })); }

  async function submit(event) {
    event.preventDefault();
    if (existing || saving) return;
    setSaving(true);
    setError("");
    try {
      const r = await api.patch("/pm-hub/workspaces/current/", {
        name:form.name.trim(), manager_name:form.manager_name.trim(),
        office_email:form.office_email.trim().toLowerCase() || String(user?.email || "").trim().toLowerCase(),
        tenant_email:form.office_email.trim().toLowerCase() || String(user?.email || "").trim().toLowerCase(),
        reply_to_email:form.reply_to_email.trim().toLowerCase() || form.office_email.trim().toLowerCase() || String(user?.email || "").trim().toLowerCase(),
        sender_name:form.manager_name.trim() || form.name.trim(),
        phone:form.phone.trim(),
      });
      if (!r?.data?.id) throw new Error("Workspace was not confirmed. Check your PM workspace before trying again.");
      setExisting(r.data);
      nav("/pm?setup=1",{replace:true});
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Unable to create PM workspace.");
    } finally { setSaving(false); }
  }

  return <div className="min-h-dvh bg-[#030712] px-4 py-8 text-white">
    <main className="mx-auto max-w-xl">
      <Link to="/get-started#property-management" className="text-xs font-semibold text-cyan-300">← Property Management roles</Link>
      <section className="mt-5 rounded-3xl border border-cyan-400/25 bg-[#091525] p-5 shadow-2xl sm:p-7">
        <div className="flex items-start gap-3"><Building2 className="mt-1 shrink-0 text-cyan-300" size={26}/><div>
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">Property Management · Organization</p>
          <h1 className="mt-1 text-2xl font-bold">Set up your PM company</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">A dedicated property-management workspace, separate from Service Business operations. Your Personal login remains the same.</p>
        </div></div>
        <div className="mt-5 flex gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-3 text-xs text-emerald-100">
          <ShieldCheck size={17} className="shrink-0" />
          <span>Signed in as {user?.email || "your verified Personal account"}. Your PM office email can be different.</span>
        </div>
        {error && <p role="alert" className="mt-4 rounded-xl border border-rose-500/35 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
        {loading ? <p className="mt-5 text-sm text-slate-300">Checking your PM workspace…</p> :
        existing ? <div className="mt-5 space-y-4"><p className="text-sm text-slate-300">Your existing workspace, <strong className="text-white">{existing.name}</strong>, is connected. Continue without creating a duplicate.</p>
          <Link to="/pm" className="inline-flex min-h-11 items-center rounded-xl bg-cyan-400 px-4 text-sm font-bold text-slate-950">Open Property Management dashboard</Link>
        </div> : <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block text-xs font-semibold text-slate-300">Company or portfolio name
            <input required className={field} value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Your property management company" maxLength={180}/>
          </label>
          <label className="block text-xs font-semibold text-slate-300">Manager or contact name
            <input className={field} value={form.manager_name} onChange={e=>set("manager_name",e.target.value)} autoComplete="name" maxLength={180}/>
          </label>
          <label className="block text-xs font-semibold text-slate-300">PM office email
            <input className={field} type="email" value={form.office_email} onChange={e=>set("office_email",e.target.value)} placeholder={user?.email || "office@company.com"}/>
          </label>
          <label className="block text-xs font-semibold text-slate-300">Business phone
            <input className={field} type="tel" value={form.phone} onChange={e=>set("phone",e.target.value)} autoComplete="tel"/>
          </label>
          <label className="block text-xs font-semibold text-slate-300">Reply-to email (optional)
            <input className={field} type="email" value={form.reply_to_email} onChange={e=>set("reply_to_email",e.target.value)} placeholder="Reply address for tenant invitations"/>
          </label>
          <p className="text-xs leading-5 text-slate-400">Tenant and Property Owner / Partner portals remain invite-only. You'll send their access codes from your PM workspace after adding their records.</p>
          <button disabled={saving} className="min-h-11 w-full rounded-xl bg-cyan-400 px-4 text-sm font-bold text-slate-950 disabled:opacity-50">{saving?"Creating workspace…":"Create Property Management workspace"}</button>
        </form>}
      </section>
    </main>
  </div>;
}
