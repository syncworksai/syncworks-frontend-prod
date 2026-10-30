import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ClipboardCheck, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import api from "../../api/client";

const LABELS = {
  NOT_TESTED: "Not tested", PASS: "Passed", FAIL: "Failed", BLOCKED: "Blocked",
};
const STATUS_STYLES = {
  NOT_TESTED: "border-slate-700 bg-slate-800/60 text-slate-300",
  PASS: "border-emerald-400/35 bg-emerald-500/10 text-emerald-200",
  FAIL: "border-rose-400/35 bg-rose-500/10 text-rose-200",
  BLOCKED: "border-amber-400/35 bg-amber-500/10 text-amber-200",
};
const FIELD = "w-full rounded-xl border border-slate-700 bg-[#050d1a] px-3 py-2.5 text-sm text-slate-100 outline-none focus-visible:border-cyan-400";
const EMPTY_SUMMARY = {passed:0,failed:0,blocked:0,not_tested:0,total:0};

function errorMessage(error) {
  const detail=error?.response?.data?.detail;
  return typeof detail === "string" ? detail : error?.message || "Unable to load the launch checklist.";
}
function safeDate(value) {
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "Unknown" : date.toLocaleString();
}

export default function PilotReadinessPanel() {
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [selectedId,setSelectedId]=useState("");
  const [draftStatus,setDraftStatus]=useState("NOT_TESTED");
  const [draftEvidence,setDraftEvidence]=useState("");

  const load=useCallback(async()=>{
    setLoading(true);setError("");
    try {
      const response=await api.get("/platform/pilot-readiness/");
      setData(response.data);
      const first=response.data?.gates?.[0];
      if(first) setSelectedId(previous => response.data.gates.some(g=>g.id===previous) ? previous : first.id);
    } catch(err) {
      setError(errorMessage(err));
    } finally {setLoading(false);}
  },[]);
  useEffect(()=>{load();},[load]);
  const gates=data?.gates || [];
  const selected=gates.find(g=>g.id===selectedId) || null;
  useEffect(()=>{
    if(!selected) return;
    setDraftStatus(selected.status || "NOT_TESTED");
    setDraftEvidence(selected.evidence || "");
  },[selected?.id,selected?.status,selected?.evidence]);

  const grouped=useMemo(()=>{
    const out=[];
    for(const g of gates){
      let group=out.find(x=>x.name===g.group);
      if(!group){group={name:g.group,gates:[]};out.push(group);}
      group.gates.push(g);
    }
    return out;
  },[gates]);
  const summary=data?.summary || EMPTY_SUMMARY;
  const pending=summary.total-summary.passed;
  const changed=Boolean(selected && (draftStatus!==selected.status || draftEvidence.trim() !== (selected.evidence || "")));
  async function save(e){
    e.preventDefault();
    if(!selected || saving || !changed) return;
    setError("");setNotice("");
    if(draftStatus!=="NOT_TESTED" && draftEvidence.trim().length<12){
      setError("Record at least 12 characters of actual test evidence or the specific blocker.");
      return;
    }
    setSaving(true);
    try{
      const response=await api.patch("/platform/pilot-readiness/",{
        gate_id:selected.id,status:draftStatus,
        evidence:draftStatus==="NOT_TESTED" ? "" : draftEvidence.trim(),
      });
      setData(response.data);
      setNotice(`${selected.title}: review saved. No email, payment or deployment was triggered.`);
    }catch(err){setError(errorMessage(err));}
    finally{setSaving(false);}
  }

  return <section className="space-y-5" aria-label="Pilot readiness release gates">
    <div className="rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-[#0b1a2e] to-[#050912] p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.2em] text-cyan-300">God Mode · Pilot Release Gate</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Pilot readiness</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Document actual end-to-end results for signup, role access, PM invitations, customer jobs, and controlled payments. A successful build does not constitute a passed test.</p>
        </div>
        <button type="button" onClick={load} disabled={loading || saving}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-600 bg-slate-900 px-4 text-sm font-semibold text-slate-100 hover:border-cyan-400/50 disabled:opacity-50">
          <RefreshCw size={16}/> Refresh
        </button>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Link to="/platform?tab=testers" className="rounded-xl border border-cyan-400/35 bg-cyan-400/10 px-3 py-2.5 text-xs font-bold text-cyan-100">Business Testers</Link>
        <Link to="/platform?tab=prospects" className="rounded-xl border border-slate-600 px-3 py-2.5 text-xs font-bold text-slate-200">Leads & invitations</Link>
        <Link to="/onboarding/property-management" className="rounded-xl border border-slate-600 px-3 py-2.5 text-xs font-bold text-slate-200">PM setup</Link>
      </div>
    </div>
    {error?<p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p>:null}
    {notice?<p role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{notice}</p>:null}
    {loading && !data?<p role="status" className="rounded-xl border border-slate-700 bg-slate-900/60 p-5 text-sm text-slate-300">Loading founder-only evidence…</p>:null}
    {data ? <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Passed",summary.passed,"text-emerald-200"],
          ["Not tested",summary.not_tested,"text-slate-200"],
          ["Failed",summary.failed,"text-rose-200"],
          ["Blocked",summary.blocked,"text-amber-200"]
        ].map(([name,count,color])=><div key={name} className="rounded-xl border border-slate-700/70 bg-[#0c1625] p-4">
          <p className="text-xs text-slate-400">{name}</p><p className={`mt-1 text-2xl font-bold tabular-nums ${color}`}>{count}</p>
        </div>)}
      </div>
      <div className={`flex gap-3 rounded-2xl border p-4 ${data.launch_ready ? "border-emerald-400/30 bg-emerald-400/5" : "border-amber-400/25 bg-amber-400/5"}`}>
        {data.launch_ready ? <ShieldCheck className="shrink-0 text-emerald-200" size={24}/> : <ShieldAlert className="shrink-0 text-amber-200" size={24}/>}
        <div><h3 className="text-sm font-bold text-white">{data.launch_ready ? "Manual gate sign-off complete" : "Pilot release sign-off not complete"}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-300">{data.launch_ready ? "All founder-recorded gates are marked passed. This is not a substitute for live provider verification and formal deployment approval." : `${pending} of ${summary.total} mandatory gates are not passed. Keep payment and other sensitive workflows in controlled test mode until validated.`}</p>
          <p className="mt-1 text-[11px] text-slate-500">Last manual change: {safeDate(data.updated_at)}</p>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(310px,0.86fr)]">
        <div className="space-y-3">
          {grouped.map(group=><div key={group.name} className="overflow-hidden rounded-2xl border border-slate-700/80 bg-[#0b1525]">
            <h3 className="border-b border-slate-700/70 px-4 py-3 text-sm font-bold text-cyan-100">{group.name}</h3>
            <div className="divide-y divide-slate-800/80">{group.gates.map(g=><button key={g.id} type="button"
              onClick={()=>{setSelectedId(g.id);setNotice("");setError("");}}
              aria-pressed={selectedId===g.id}
              className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-white/5 ${selectedId===g.id ? "bg-cyan-400/10" : ""}`}>
              <span className="text-xs leading-5 text-slate-100">{g.title}</span>
              <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${STATUS_STYLES[g.status] || STATUS_STYLES.NOT_TESTED}`}>{LABELS[g.status] || LABELS.NOT_TESTED}</span>
            </button>)}</div>
          </div>)}
        </div>
        <div className="h-fit rounded-2xl border border-cyan-400/20 bg-[#091728] p-4 sm:p-5 xl:sticky xl:top-20">
          {selected ? <form onSubmit={save} className="space-y-4">
            <div className="flex items-center gap-2 text-cyan-200"><ClipboardCheck size={18}/><span className="text-[11px] font-bold uppercase tracking-widest">Record a test</span></div>
            <h3 className="text-lg font-bold text-white">{selected.title}</h3>
            <p className="text-xs leading-5 text-slate-300">{selected.instructions}</p>
            <label className="block text-xs font-semibold text-slate-200">Observed result
              <select className={`mt-1 ${FIELD}`} value={draftStatus} onChange={e=>setDraftStatus(e.target.value)}>
                {Object.entries(LABELS).map(([value,label])=><option value={value} key={value}>{label}</option>)}
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-200">Evidence or blocker (required for a result)
              <textarea rows={5} maxLength={1200} className={`mt-1 ${FIELD}`} value={draftEvidence} onChange={e=>setDraftEvidence(e.target.value)}
                placeholder="What you actually tested, in which environment, and the observed outcome. Do not include passwords, codes or payment details."/>
            </label>
            <p className="text-[11px] leading-4 text-slate-400">Tests must be performed before marking Pass. Do not paste private invitation codes, account tokens or card data here.</p>
            <button type="submit" disabled={saving || !changed} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 text-sm font-bold text-[#04101a] disabled:cursor-not-allowed disabled:opacity-40">
              <CheckCircle2 size={17}/>{saving ? "Saving…" : "Save evidence"}
            </button>
            <p className="text-[11px] leading-4 text-slate-500">Previously reviewed: {safeDate(selected.reviewed_at)}{selected.reviewed_by ? ` · ${selected.reviewed_by}` : ""}</p>
          </form> : <p className="text-sm text-slate-400">Choose a gate to record a result.</p>}
        </div>
      </div>
      <div className="rounded-2xl border border-slate-700/70 bg-[#0b1525] p-4">
        <h3 className="text-sm font-bold text-white">Recent founder sign-offs</h3>
        {data.recent_history?.length ? <div className="mt-3 divide-y divide-slate-800 text-xs text-slate-300">
          {data.recent_history.map((entry,index)=><p key={entry.at+"-"+index} className="py-2">
            <span className="font-medium text-white">{gates.find(g=>g.id===entry.gate_id)?.title || entry.gate_id}</span>
            {" · "}{LABELS[entry.old_status] || entry.old_status} → {LABELS[entry.status] || entry.status}
            <span className="block text-[11px] text-slate-500">{safeDate(entry.at)} · {entry.by}</span>
          </p>)}
        </div> : <p className="mt-2 text-xs text-slate-400">No manual verification has been recorded.</p>}
      </div>
      <p className="text-xs leading-5 text-slate-500">{data.notice}</p>
    </>:null}
  </section>;
}
