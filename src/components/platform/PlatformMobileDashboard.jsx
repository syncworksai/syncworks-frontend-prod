import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle, BellRing, BriefcaseBusiness, ChevronRight, ClipboardCheck,
  CreditCard, Home, MoreHorizontal, RefreshCw, ShieldCheck,
  UserRound, Users, X,
} from "lucide-react";
import api from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import "./PlatformMobileDashboard.css";

const MAIN_ACTIONS = [
  { id: "pilot_readiness", label: "Pilot readiness", detail: "Release gates & sign-off", icon: ShieldCheck },
  { id: "testers", label: "Business testers", detail: "Onboarding and QA", icon: ClipboardCheck },
  { id: "prospects", label: "Leads & invitations", detail: "Acquisition pipeline", icon: BriefcaseBusiness },
  { id: "requests", label: "Support requests", detail: "Triage customer issues", icon: BellRing },
  { id: "billing", label: "Platform billing", detail: "Review fees and locks", icon: CreditCard },
  { id: "users", label: "User accounts", detail: "Roles and access", icon: Users },
];

const toList = (value) => Array.isArray(value) ? value : [];
const numberText = (value) => value === null || value === undefined || value === "" || !Number.isFinite(Number(value))
  ? "—" : Number(value).toLocaleString("en-US");
const friendlyError = (error) => typeof error?.response?.data?.detail === "string"
  ? error.response.data.detail : "Some live metrics are unavailable.";
const firstName = (user) => String(user?.first_name || user?.firstName || user?.name || "Founder").trim().split(/\s+/)[0] || "Founder";

function StatusTile({ label, value, note, icon: Icon, onClick, tone = "cyan" }) {
  return <button type="button" onClick={onClick}
    className="sw-god-mobile-stat min-w-0 rounded-2xl border border-white/10 bg-black/20 p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
    <span className="flex items-center justify-between gap-1.5">
      <span className="truncate text-[9px] font-bold uppercase tracking-[.08em] text-slate-400">{label}</span>
      <Icon aria-hidden="true" className={`h-4 w-4 shrink-0 ${tone === "rose" ? "text-rose-300" : tone === "amber" ? "text-amber-300" : tone === "emerald" ? "text-emerald-300" : "text-cyan-300"}`} />
    </span>
    <span className="mt-1 block truncate text-xl font-extrabold tabular-nums text-white">{value}</span>
    <span className="mt-1 block text-[10px] leading-4 text-slate-400">{note}</span>
  </button>;
}

function ActionCard({ icon: Icon, label, detail, onClick }) {
  return <button type="button" onClick={onClick}
    className="sw-god-mobile-action flex min-h-[91px] min-w-0 items-start gap-2.5 rounded-2xl p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-200"><Icon size={18} /></span>
    <span className="min-w-0 flex-1">
      <span className="block text-[12px] font-bold leading-4 text-white">{label}</span>
      <span className="mt-1 block text-[10px] leading-4 text-slate-400">{detail}</span>
    </span>
  </button>;
}

export default function PlatformMobileDashboard({ activeTab, tabs, onChange }) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [testers, setTesters] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const closeMoreRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const requests = [
      api.get("/platform/metrics/summary/?days=30"),
      api.get("/platform/metrics/alerts/"),
      api.get("/platform/prospects/metrics/"),
      api.get("/platform/pilot-readiness/"),
    ];
    const [metricsResult, alertsResult, testersResult, readinessResult] = await Promise.allSettled(requests);
    setMetrics(metricsResult.status === "fulfilled" ? metricsResult.value.data : null);
    setAlerts(alertsResult.status === "fulfilled" ? alertsResult.value.data : null);
    setTesters(testersResult.status === "fulfilled" ? testersResult.value.data : null);
    setReadiness(readinessResult.status === "fulfilled" ? readinessResult.value.data : null);
    if ([metricsResult, alertsResult, testersResult, readinessResult].some(result => result.status === "rejected")) {
      const rejected = [metricsResult, alertsResult, testersResult, readinessResult].find(result => result.status === "rejected");
      setError(friendlyError(rejected?.reason));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab !== "overview") return undefined;
    const media = window.matchMedia("(max-width: 1023px)");
    if (media.matches) load();
    const onResize = (event) => { if (event.matches) load(); };
    media.addEventListener?.("change", onResize);
    return () => media.removeEventListener?.("change", onResize);
  }, [activeTab, load]);
  useEffect(() => { setMoreOpen(false); }, [activeTab]);
  useEffect(() => {
    if (!moreOpen) return undefined;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeMoreRef.current?.focus();
    function closeOnEscape(event) { if (event.key === "Escape") setMoreOpen(false); }
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      previousFocus?.focus?.();
    };
  }, [moreOpen]);

  const attention = useMemo(() => toList(alerts?.alerts).filter(item =>
    ["RED", "YELLOW", "CRITICAL", "WARNING"].includes(String(item?.status || "").toUpperCase())
  ).slice(0, 3), [alerts]);
  const alertCount = alerts?.executive?.alerts_count ?? (alerts ? toList(alerts.alerts).length : null);
  const readinessSummary = readiness?.summary || null;
  const pendingGates = readinessSummary ? Math.max(0, Number(readinessSummary.total || 0) - Number(readinessSummary.passed || 0)) : null;
  const currentTitle = tabs.find(item => item.id === activeTab)?.label || "Overview";

  function go(id) {
    setMoreOpen(false);
    onChange(id);
    window.scrollTo?.({ top: 0, behavior: "instant" });
  }

  return <div className="sw-god-mobile lg:hidden">
    {activeTab === "overview" ? <>
      <header className="sw-god-mobile-hero p-4">
        <div className="relative z-10 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="sw-god-mobile-brand">Founder command center</p>
            <h1 className="mt-1 text-[23px] font-extrabold leading-tight tracking-tight text-white">Hey {firstName(user)}</h1>
            <p className="mt-1 text-[11px] leading-4 text-slate-400">Your platform, in one glance.</p>
          </div>
          <button type="button" aria-label="Refresh platform status" onClick={load} disabled={loading}
            className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-cyan-400/25 bg-slate-950/70 text-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 disabled:opacity-50">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""}/>
          </button>
        </div>
        <div className="relative z-10 mt-4 grid grid-cols-2 gap-2">
          <StatusTile label="Users" value={numberText(metrics?.users_total)} note="Accounts on SyncWorks" icon={UserRound} onClick={()=>go("users")}/>
          <StatusTile label="Businesses" value={numberText(metrics?.businesses_total)} note="Registered businesses" icon={BriefcaseBusiness} onClick={()=>go("businesses")}/>
          <StatusTile label="Signups (30d)" value={numberText(metrics?.signups_last_30_days)} note="New users in the last 30 days" icon={Users} onClick={()=>go("users")}/>
          <StatusTile label="Platform alerts" value={numberText(alertCount)} note={alerts ? "Reported by platform monitoring" : "Monitoring unavailable"} icon={AlertTriangle} tone={alertCount === null ? "amber" : Number(alertCount)>0 ? "rose" : "emerald"} onClick={()=>go("requests")}/>
        </div>
      </header>

      {error ? <p role="status" className="mt-3 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100">{error} Unavailable values are shown as dashes—not zero.</p> : null}

      <section className="sw-god-mobile-panel mt-3 rounded-[1.3rem] p-4" aria-labelledby="sw-god-pilot-heading">
        <div className="flex items-start justify-between gap-2">
          <div><p className="text-[9px] font-bold uppercase tracking-[.13em] text-cyan-300">Launch control</p><h2 id="sw-god-pilot-heading" className="mt-1 text-sm font-bold text-white">Pilot readiness</h2></div>
          <button type="button" onClick={()=>go("pilot_readiness")} className="flex shrink-0 items-center gap-1 text-xs font-bold text-cyan-200">Review <ChevronRight size={14}/></button>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-300">
          {pendingGates === null ? "Release verification has not loaded. Review the checks before approving a pilot."
            : pendingGates === 0 ? "All manually reviewed launch gates are marked passed."
            : `${pendingGates} of ${readinessSummary.total} release gates still need passing evidence.`}
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400"
            style={{ width: readinessSummary?.total ? `${100 * readinessSummary.passed / readinessSummary.total}%` : "0%" }}/>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
          <span>{readinessSummary ? `${readinessSummary.passed} / ${readinessSummary.total} verified` : "Awaiting release data"}</span>
          <span>{testers?.pilot ? `${numberText(testers.pilot.TESTING ?? 0)} testers active · ${numberText(testers.pilot.BLOCKED ?? 0)} blocked` : "Tester status unavailable"}</span>
        </div>
      </section>

      <section className="sw-god-mobile-panel mt-3 rounded-[1.3rem] p-4" aria-labelledby="sw-god-attention-heading">
        <div className="flex items-center justify-between gap-2">
          <div><p className="text-[9px] font-bold uppercase tracking-[.13em] text-cyan-300">Needs attention</p><h2 id="sw-god-attention-heading" className="mt-1 text-sm font-bold text-white">Platform priorities</h2></div>
          <button type="button" onClick={()=>go("requests")} className="text-xs font-semibold text-cyan-200">Support</button>
        </div>
        {attention.length ? <div className="mt-2 space-y-2">{attention.map((item,index)=>
          <div key={item.key || index} className="flex items-start gap-2 rounded-xl border border-amber-400/15 bg-amber-400/[.04] p-2.5">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-300"/>
            <div className="min-w-0"><p className="text-xs font-semibold text-white">{item.label || "Platform alert"}</p><p className="mt-0.5 text-[10px] text-slate-400">Severity: {item.status || "Unknown"}{item.value !== undefined ? ` · ${item.value}` : ""}</p></div>
          </div>
        )}</div> : <p className="mt-2 text-xs leading-5 text-slate-400">{!alerts ? "Alert monitoring is unavailable; no all-clear is assumed." : "No red or yellow alerts reported. Review open support requests separately."}</p>}
      </section>

      <section className="mt-3" aria-labelledby="sw-god-actions-heading">
        <div className="mb-2 flex items-center justify-between px-1"><div><p className="text-[9px] font-bold uppercase tracking-[.13em] text-cyan-300">Quick actions</p><h2 id="sw-god-actions-heading" className="mt-1 text-sm font-bold text-white">Run the platform</h2></div>
          <button type="button" onClick={()=>setMoreOpen(true)} className="text-xs font-bold text-cyan-200">All tools</button>
        </div>
        <div className="grid grid-cols-2 gap-2">{MAIN_ACTIONS.map(item=><ActionCard key={item.id} {...item} onClick={()=>go(item.id)}/>)}</div>
      </section>

      <section className="sw-god-mobile-panel mt-3 rounded-[1.3rem] p-4">
        <div className="flex items-start gap-2.5"><ShieldCheck className="mt-0.5 shrink-0 text-violet-300" size={18}/><div>
          <h2 className="text-xs font-bold text-white">God Mode only</h2>
          <p className="mt-1 text-[11px] leading-5 text-slate-400">Only metrics returned by authenticated platform endpoints appear here. Payments, account locks and announcements still require their own explicit actions.</p>
        </div></div>
      </section>
    </> : <header className="sw-god-mobile-hero p-4">
      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="min-w-0"><p className="sw-god-mobile-brand">God Mode · {currentTitle}</p><h1 className="mt-1 truncate text-lg font-bold text-white">{currentTitle}</h1><p className="mt-1 text-[11px] text-slate-400">Platform administration</p></div>
        <button type="button" onClick={()=>go("overview")} className="shrink-0 rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-100">Home</button>
      </div>
    </header>}

    <nav className="sw-god-mobile-dock" aria-label="God Mode mobile navigation">
      <button type="button" onClick={()=>go("overview")} aria-current={activeTab==="overview"?"page":undefined} className={activeTab==="overview"?"active":""}><Home size={18} aria-hidden="true"/><span>Home</span></button>
      <button type="button" onClick={()=>go("testers")} aria-current={activeTab==="testers"?"page":undefined} className={activeTab==="testers"?"active":""}><ClipboardCheck size={18} aria-hidden="true"/><span>Testers</span></button>
      <button type="button" onClick={()=>go("pilot_readiness")} aria-label="Open Pilot Readiness" aria-current={activeTab==="pilot_readiness"?"page":undefined} className={`sw-god-mobile-dock-center ${activeTab==="pilot_readiness"?"active":""}`}>
        <span className="sw-god-mobile-cube"><img src="/brands/syncworks-icon-192.png" alt="" /></span><span>Pilot</span>
      </button>
      <button type="button" onClick={()=>go("billing")} aria-current={activeTab==="billing"?"page":undefined} className={activeTab==="billing"?"active":""}><CreditCard size={18} aria-hidden="true"/><span>Billing</span></button>
      <button type="button" onClick={()=>setMoreOpen(true)} aria-controls="sw-god-more-panel" aria-expanded={moreOpen}><MoreHorizontal size={18} aria-hidden="true"/><span>More</span></button>
    </nav>

    {moreOpen ? <div className="sw-god-mobile-more-backdrop" role="presentation" onClick={()=>setMoreOpen(false)}>
      <section id="sw-god-more-panel" role="dialog" aria-modal="true" aria-labelledby="sw-god-more-heading" onClick={e=>e.stopPropagation()}
        className="sw-god-mobile-more-panel">
        <div className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">Founder tools</p><h2 id="sw-god-more-heading" className="mt-1 text-lg font-bold text-white">All God Mode modules</h2></div>
          <button ref={closeMoreRef} type="button" onClick={()=>setMoreOpen(false)} aria-label="Close God Mode menu"
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-100"><X size={18}/></button></div>
        <div className="mt-4 grid grid-cols-2 gap-2">{tabs.map(item=><button key={item.id} type="button" onClick={()=>go(item.id)}
          aria-current={activeTab===item.id?"page":undefined}
          className={`min-h-12 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold ${activeTab===item.id ? "border-cyan-400/45 bg-cyan-400/10 text-cyan-100" : "border-slate-700 bg-slate-900/60 text-slate-200"}`}>{item.label}</button>)}
          <button type="button" onClick={()=>go("__build_backlog")} className="min-h-12 rounded-xl border border-violet-400/25 bg-violet-400/[.07] px-3 py-2.5 text-left text-xs font-semibold text-violet-200">Build Backlog</button>
        </div>
        <Link to="/customer" onClick={()=>setMoreOpen(false)}
          className="mt-4 flex min-h-11 items-center justify-between rounded-xl border border-slate-700 px-3 text-xs font-semibold text-slate-300"><span>Return to Personal dashboard</span><ChevronRight size={16}/></Link>
      </section>
    </div> : null}
  </div>;
}
