import React, { useEffect, useState } from "react";
import { ArrowLeft, Target, Copy, RefreshCcw, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext";

const BASE = "/sync-ai/assist/pilot/growth/prospects/";
const NICHES = [["home_services", "Home services"], ["property_management", "Property management"], ["independent_services", "Independent services"]];
const STAGES = ["READY_FOR_REVIEW", "CONTACTED_MANUALLY", "RESPONDED", "DEMO_BOOKED", "TRIAL", "CLOSED_WON", "NOT_INTERESTED", "DO_NOT_CONTACT"];

export default function SyncAssistGrowth() {
  const navigate = useNavigate();
  const {user} = useAuth();
  const pilot = String(user?.email || "").trim().toLowerCase() === "jacoblord7@outlook.com";
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({company: "", niche: "home_services", website: "", public_contact: "", observation: "", channel: "EMAIL"});
  const field = (key, value) => setForm(v => ({...v, [key]: value}));
  async function refresh() {
    setBusy(true); setError("");
    try { const r = await api.get(BASE, {timeout: 15000}); setData(r.data); }
    catch (e) { setError(e?.response?.data?.detail || "Unable to load prospect queue."); }
    finally { setBusy(false); }
  }
  useEffect(() => {if (pilot) refresh();}, [pilot]);
  async function add(e) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const r = await api.post(BASE, form);
      setData(r.data); setForm(v => ({...v,company:"",website:"",public_contact:"",observation:""}));
    } catch(e) {setError(e?.response?.data?.detail || "Unable to create prospect.");}
    finally {setBusy(false);}
  }
  async function stage(id, value) {
    setBusy(true); setError("");
    try {const r=await api.post(BASE + encodeURIComponent(id) + "/stage/", {stage:value});setData(r.data);}
    catch(e) {setError(e?.response?.data?.detail || "Could not update prospect.");}
    finally {setBusy(false);}
  }
  return <main className="min-h-dvh bg-[#020617] px-4 pb-36 pt-28 text-white">
    <div className="mx-auto max-w-4xl">
      <button type="button" onClick={()=>navigate("/sync/assist")} className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 px-4 text-sm"><ArrowLeft size={18}/> Control Center</button>
      <header className="rounded-3xl border border-cyan-400/30 bg-gradient-to-br from-[#082439] to-[#180d34] p-5">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-cyan-200"><Target size={18}/> Jarvis Growth</div>
        <h1 className="mt-2 text-2xl font-black">Prospect Command Center</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">Build a small-business outreach pipeline. Jarvis prepares tailored introductions and tracks your progress, without sending unsolicited messages.</p>
        <p className="mt-3 flex items-center gap-2 text-xs font-bold text-amber-200"><ShieldCheck size={16}/> Draft-only · No automatic Messenger, email or calls</p>
      </header>
      {!pilot ? <p role="alert" className="mt-4 text-rose-200">Private pilot only.</p> : <>
        {error && <p role="alert" className="mt-4 rounded-xl border border-rose-400/40 bg-rose-950/30 p-3 text-sm text-rose-200">{error}</p>}
        <section className="mt-4 rounded-2xl border border-white/10 bg-slate-900/50 p-4">
          <h2 className="mb-3 font-black">Add a business prospect</h2>
          <form onSubmit={add} className="space-y-3">
            <label className="block text-xs font-bold text-slate-300">Business name<input required maxLength={140} value={form.company} onChange={e=>field("company",e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-600 bg-slate-950 p-3 text-white" placeholder="Business name"/></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-bold text-slate-300">Category<select value={form.niche} onChange={e=>field("niche",e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-600 bg-slate-950 p-2">{NICHES.map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>
              <label className="block text-xs font-bold text-slate-300">Outreach channel<select value={form.channel} onChange={e=>field("channel",e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-600 bg-slate-950 p-2">{["EMAIL","MESSENGER","PHONE","OTHER"].map(v=><option key={v}>{v}</option>)}</select></label>
            </div>
            <label className="block text-xs font-bold text-slate-300">Public website (optional)<input maxLength={300} value={form.website} onChange={e=>field("website",e.target.value)} type="url" placeholder="https://..." className="mt-1 min-h-11 w-full rounded-xl border border-slate-600 bg-slate-950 p-3"/></label>
            <label className="block text-xs font-bold text-slate-300">Public business contact (optional)<input maxLength={220} value={form.public_contact} onChange={e=>field("public_contact",e.target.value)} placeholder="Business contact page or public company email" className="mt-1 min-h-11 w-full rounded-xl border border-slate-600 bg-slate-950 p-3"/></label>
            <label className="block text-xs font-bold text-slate-300">Verified observation (optional)<textarea rows={2} maxLength={350} value={form.observation} onChange={e=>field("observation",e.target.value)} placeholder="Only include something you've actually observed about this business." className="mt-1 w-full rounded-xl border border-slate-600 bg-slate-950 p-3"/></label>
            <button disabled={busy || !form.company.trim()} type="submit" className="min-h-12 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 font-black disabled:opacity-50">Create outreach draft</button>
          </form>
        </section>
        <section className="mt-4 rounded-2xl border border-white/10 bg-slate-900/40 p-4">
          <div className="mb-3 flex items-center justify-between gap-3"><h2 className="font-black">Prospects · {data?.prospects?.length ?? "—"}</h2><button onClick={refresh} disabled={busy} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-cyan-400/30 px-3 text-xs text-cyan-200"><RefreshCcw size={15}/> Refresh</button></div>
          {data?.prospects?.length ? <div className="space-y-3">{data.prospects.map(p=><article key={p.prospect_id} className="rounded-2xl border border-cyan-400/15 bg-slate-950/65 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-black">{p.company}</h3><span className="text-xs text-slate-400">{NICHES.find(n=>n[0]===p.niche)?.[1]}</span></div>
            {p.website && <a href={p.website} target="_blank" rel="noreferrer" className="mt-1 block break-all text-xs text-cyan-300 underline">Company website</a>}
            <p className="mt-3 whitespace-pre-wrap rounded-xl border border-white/10 p-3 text-sm leading-6 text-slate-200">{p.draft}</p>
            <button type="button" onClick={()=>navigator.clipboard?.writeText(p.draft)} className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-lg border border-cyan-400/30 px-3 text-xs font-bold text-cyan-200"><Copy size={14}/> Copy draft</button>
            <label className="mt-3 block text-xs font-bold text-slate-300">Pipeline stage<select aria-label={`Pipeline stage for ${p.company}`} disabled={busy} value={p.stage} onChange={e=>stage(p.prospect_id,e.target.value)} className="mt-1 block min-h-11 w-full rounded-xl border border-slate-600 bg-slate-900 p-2 text-white">{STAGES.map(v=><option key={v} value={v}>{v.replaceAll("_"," ")}</option>)}</select></label>
          </article>)}</div> : <p className="text-sm text-slate-400">No prospects yet. Start with five local companies that match SyncWorks' business and PM workflows.</p>}
        </section>
      </>}
    </div>
  </main>;
}
