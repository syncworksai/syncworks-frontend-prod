import React, { useEffect, useMemo, useState } from "react";
import { CalendarPlus, Eye, LoaderCircle, MapPin, Search, ShieldCheck, Stethoscope } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardShell from "../components/dashboard/DashboardShell";
import { discoverProfessionalPractices } from "../api/professionalServices";

const TYPES = [
  ["DENTAL", "Dentist", Stethoscope],
  ["OPTOMETRY", "Eye doctor", Eye],
  ["CHIROPRACTIC", "Chiropractor", Stethoscope],
  ["PHYSICAL_THERAPY", "Physical therapy", Stethoscope],
];

export default function CustomerProfessionalDiscover() {
  const nav = useNavigate();
  const [practiceType, setPracticeType] = useState("DENTAL");
  const [insurance, setInsurance] = useState("");
  const [zip, setZip] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  async function runSearch(nextType = practiceType) {
    setLoading(true);
    setNotice("");
    try {
      const result = await discoverProfessionalPractices({ practice_type: nextType, insurance, zip });
      setRows(result);
      if (!result.length) setNotice("No claimed SyncWorks practices match those filters yet. You can still use SYNC Local for broader Google-backed nearby discovery.");
    } catch (error) {
      setNotice(error?.response?.data?.detail || "Professional search is temporarily unavailable.");
    } finally { setLoading(false); }
  }

  useEffect(() => { runSearch("DENTAL"); }, []);

  const selectedLabel = useMemo(() => TYPES.find(([id]) => id === practiceType)?.[1] || "Professional", [practiceType]);

  return (
    <DashboardShell modeBarTitle="SyncWorks" modeBarSubtitle="Professional care">
      <div className="mx-auto max-w-6xl space-y-4 pb-24">
        <section className="rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_88%_10%,rgba(139,92,246,.2),transparent_32%),rgba(2,6,23,.92)] p-5 sm:p-7">
          <div className="text-[10px] font-black uppercase tracking-[.22em] text-cyan-200">Professional discovery</div>
          <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">Find an office that fits.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Search claimed SyncWorks practices by specialty and insurance. Insurance participation shown here is supplied by the practice; always confirm your specific benefits before care.</p>
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TYPES.map(([id, label, Icon]) => <button key={id} type="button" onClick={() => { setPracticeType(id); runSearch(id); }} className={`rounded-2xl border p-3 text-left ${practiceType === id ? "border-cyan-400/30 bg-cyan-500/10" : "border-white/10 bg-white/[.025]"}`}><Icon className={`h-5 w-5 ${practiceType === id ? "text-cyan-200" : "text-slate-500"}`} /><div className="mt-2 text-sm font-black text-white">{label}</div></button>)}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); runSearch(); }} className="mt-4 grid gap-2 sm:grid-cols-[1fr_180px_auto]">
            <input value={insurance} onChange={(e) => setInsurance(e.target.value)} placeholder="Insurance carrier, e.g. VSP or Delta Dental" className="h-12 rounded-2xl border border-white/10 bg-slate-900 px-3 text-sm text-white outline-none" />
            <input value={zip} onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))} placeholder="ZIP (optional)" className="h-12 rounded-2xl border border-white/10 bg-slate-900 px-3 text-sm text-white outline-none" />
            <button type="submit" disabled={loading} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 px-5 text-sm font-black text-white disabled:opacity-50">{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}Search</button>
          </form>
          <button type="button" onClick={() => nav("/customer/discover")} className="mt-3 text-xs font-black text-cyan-200">Search all nearby places with SYNC Local →</button>
        </section>

        {notice ? <div className="rounded-2xl border border-amber-400/20 bg-amber-500/[.06] p-4 text-sm text-amber-100">{notice}</div> : null}

        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((row) => (
            <article key={row.id} className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-5">
              <div className="flex items-start justify-between gap-3">
                <div><div className="text-[10px] font-black uppercase tracking-[.16em] text-cyan-200">{row.practice_type_label || selectedLabel}</div><h2 className="mt-1 text-xl font-black text-white">{row.business_name}</h2></div>
                {row.accepting_new_patients ? <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[9px] font-black uppercase text-emerald-200">New patients</span> : null}
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-400"><MapPin className="h-4 w-4 text-violet-200" />{[row.address, row.city, row.state].filter(Boolean).join(", ") || "Location on business profile"}</div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[.025] p-3">
                <div className="flex items-center gap-2 text-xs font-black text-white"><ShieldCheck className="h-4 w-4 text-emerald-200" />Insurance listed by practice</div>
                <div className="mt-2 flex flex-wrap gap-2">{(row.accepted_insurance || []).length ? row.accepted_insurance.map((name) => <span key={name} className={`rounded-full border px-2 py-1 text-[10px] font-bold ${insurance && String(name).toLowerCase() === insurance.toLowerCase() ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/[.03] text-slate-300"}`}>{name}</span>) : <span className="text-xs text-slate-500">Insurance list not provided yet.</span>}</div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => nav("/customer/appointments")} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 text-xs font-black text-white"><CalendarPlus className="h-4 w-4" />View appointments</button>
                {row.phone ? <a href={`tel:${row.phone}`} className="inline-flex min-h-11 items-center rounded-2xl border border-white/10 bg-white/[.04] px-4 text-xs font-black text-slate-200">Call office</a> : null}
              </div>
              <p className="mt-3 text-[10px] leading-4 text-slate-500">{row.scheduling_disclaimer}</p>
            </article>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
