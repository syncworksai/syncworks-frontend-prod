import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Dumbbell,
  Home,
  LoaderCircle,
  Mail,
  MapPin,
  Mic2,
  Search,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";

import {
  getJarvisProduct,
  openJarvisBillingPortal,
  startJarvisCheckout,
  updateJarvisProduct,
} from "../api/jarvisProduct";

const STEPS = ["Welcome", "Goals", "Connections", "Routine", "Permissions", "Plan"];
const GOALS = [
  ["FIND_LOCAL_SERVICES", "Find trusted local services", Search],
  ["ORGANIZE_DAY", "Organize my schedule", CalendarDays],
  ["IMPORTANT_EMAIL", "Keep up with important email", Mail],
  ["HEALTH", "Improve health and fitness", Dumbbell],
  ["MONEY", "Manage household money", WalletCards],
  ["BUSINESS", "Run my business", BriefcaseBusiness],
  ["PROPERTY", "Manage rental properties", Home],
  ["FORGET_LESS", "Reduce things I forget", Sparkles],
];

function StepButton({ active, complete, label, index, onClick }) {
  return (
    <button type="button" onClick={onClick} className="flex min-w-[92px] items-center gap-2 text-left">
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border text-xs font-black ${active ? "border-cyan-300 bg-cyan-400 text-slate-950" : complete ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200" : "border-slate-700 bg-slate-900 text-slate-500"}`}>
        {complete ? <Check className="h-4 w-4" /> : index + 1}
      </span>
      <span className={active ? "text-xs font-black text-white" : "text-xs font-bold text-slate-500"}>{label}</span>
    </button>
  );
}

function Choice({ selected, icon: Icon, title, body, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-3xl border p-4 text-left transition ${selected ? "border-cyan-300/50 bg-cyan-500/12 shadow-[0_0_30px_rgba(34,211,238,.08)]" : "border-slate-800 bg-slate-950/70 hover:border-slate-700"}`}>
      <div className="flex items-start gap-3">
        {Icon ? <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-900 text-cyan-200"><Icon className="h-5 w-5" /></span> : null}
        <span className="min-w-0">
          <span className="block font-black text-white">{title}</span>
          {body ? <span className="mt-1 block text-xs leading-5 text-slate-400">{body}</span> : null}
        </span>
        <span className={`ml-auto grid h-6 w-6 shrink-0 place-items-center rounded-full border ${selected ? "border-cyan-300 bg-cyan-400 text-slate-950" : "border-slate-700"}`}>
          {selected ? <Check className="h-3.5 w-3.5" /> : null}
        </span>
      </div>
    </button>
  );
}

export default function JarvisSetup() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState(null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    getJarvisProduct()
      .then((value) => {
        setData(value);
        setDraft(value);
        setStep(Math.min(Number(value.onboarding_step || 0), STEPS.length - 1));
      })
      .catch((error) => setNotice(error?.response?.data?.detail || "Jarvis setup could not load."));
  }, []);

  const selectedGoals = useMemo(() => new Set(draft?.goals || []), [draft?.goals]);

  function patch(values) {
    setDraft((current) => ({ ...current, ...values }));
  }

  async function save(nextStep = step) {
    if (!draft) return;
    setSaving(true);
    setNotice("");
    try {
      const payload = {
        assistant_name: draft.assistant_name,
        tone: draft.tone,
        briefing_length: draft.briefing_length,
        template: draft.template,
        wake_time: draft.wake_time,
        bedtime: draft.bedtime,
        quiet_hours_enabled: draft.quiet_hours_enabled,
        goals: draft.goals,
        modules: draft.modules,
        permissions: draft.permissions,
        onboarding_step: nextStep,
        onboarding_complete: nextStep >= STEPS.length - 1,
      };
      const value = await updateJarvisProduct(payload);
      setData(value);
      setDraft(value);
      setStep(nextStep);
      return value;
    } catch (error) {
      setNotice(error?.response?.data?.detail || "Jarvis setup could not be saved.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function next() {
    await save(Math.min(step + 1, STEPS.length - 1));
  }

  async function choosePlan(plan) {
    if (plan === "BASIC" || data?.billing?.test_access) {
      await save(STEPS.length - 1);
      navigate("/customer");
      return;
    }
    setSaving(true);
    try {
      const result = await startJarvisCheckout(plan);
      if (result?.url) window.location.assign(result.url);
      else setNotice("Checkout did not return a payment link.");
    } catch (error) {
      setNotice(error?.response?.data?.detail || "Jarvis checkout could not start.");
    } finally {
      setSaving(false);
    }
  }

  if (!draft) {
    return <div className="grid min-h-dvh place-items-center bg-[#020617] text-cyan-200"><LoaderCircle className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="min-h-dvh bg-[#020617] pb-16 text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,.13),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,.13),transparent_36%)]" />
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/88 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <button type="button" onClick={() => navigate("/customer")} className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm font-black"><ArrowLeft className="h-4 w-4" />Dashboard</button>
          <div className="text-center"><div className="font-black text-white">Build your Jarvis</div><div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">Personal life assistant</div></div>
          <div className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-xs font-black text-cyan-100">{data?.setup_score || 0}% ready</div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 pt-5">
        <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-950/65 p-4 [scrollbar-width:none]">
          <div className="flex min-w-max items-center gap-5">
            {STEPS.map((label, index) => <StepButton key={label} label={label} index={index} active={step === index} complete={step > index} onClick={() => setStep(index)} />)}
          </div>
        </div>

        {notice ? <div className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-3 text-sm text-amber-100">{notice}</div> : null}

        <section className="mt-5 rounded-[2rem] border border-cyan-400/20 bg-slate-950/72 p-5 shadow-[0_0_70px_rgba(34,211,238,.08)] md:p-8">
          {step === 0 ? (
            <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[.22em] text-cyan-200">One assistant · every connected part of life</div>
                <h1 className="mt-3 text-3xl font-black text-white md:text-5xl">Meet the Jarvis that works around your day.</h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">Start with SyncWorks Marketplace for local services and service requests. Then connect the schedule, email, Health, Money, businesses, rental properties, and affiliates that matter to you.</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <label className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4"><span className="text-xs font-black uppercase tracking-wider text-slate-500">Assistant name</span><input value={draft.assistant_name || ""} onChange={(e) => patch({ assistant_name: e.target.value })} className="mt-2 w-full bg-transparent text-lg font-black text-white outline-none" /></label>
                  <label className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4"><span className="text-xs font-black uppercase tracking-wider text-slate-500">Style</span><select value={draft.tone || "CALM"} onChange={(e) => patch({ tone: e.target.value })} className="mt-2 w-full bg-slate-950 text-lg font-black text-white outline-none"><option value="CALM">Calm</option><option value="DIRECT">Direct</option><option value="PROFESSIONAL">Professional</option><option value="ENCOURAGING">Encouraging</option><option value="COACH">Coach-like</option></select></label>
                </div>
              </div>
              <div className="rounded-[2rem] border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-violet-500/10 p-6">
                <Mic2 className="h-10 w-10 text-cyan-200" /><div className="mt-5 text-xl font-black text-white">Your first useful result</div><p className="mt-2 text-sm leading-6 text-slate-300">Within minutes, Jarvis should tell you what changed, what is planned, what needs attention, and where to go next.</p>
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div><h2 className="text-2xl font-black text-white">What should Jarvis help with?</h2><p className="mt-2 text-sm text-slate-400">Choose as many as apply. Marketplace and service requests remain available to every plan.</p><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{GOALS.map(([id, title, Icon]) => <Choice key={id} selected={selectedGoals.has(id)} icon={Icon} title={title} onClick={() => { const nextSet = new Set(selectedGoals); nextSet.has(id) ? nextSet.delete(id) : nextSet.add(id); patch({ goals: [...nextSet] }); }} />)}</div></div>
          ) : null}

          {step === 2 ? (
            <div><h2 className="text-2xl font-black text-white">Connect the parts of life you use</h2><p className="mt-2 text-sm text-slate-400">This foundation saves your choices now. Gmail and Outlook authorization will activate in the next connection build.</p><div className="mt-5 grid gap-3 md:grid-cols-2">{(draft.module_catalog || data.module_catalog || []).map((item) => <Choice key={item.id} selected={item.connected || Boolean(draft.modules?.[item.id])} icon={item.id === "marketplace" ? MapPin : item.id === "email" ? Mail : item.id === "health" ? Dumbbell : item.id === "money" ? WalletCards : item.id === "business" ? BriefcaseBusiness : item.id === "property" ? Home : CalendarDays} title={item.title} body={item.benefit} onClick={() => item.id === "marketplace" ? navigate(item.url) : patch({ modules: { ...(draft.modules || {}), [item.id]: !draft.modules?.[item.id] } })} />)}</div></div>
          ) : null}

          {step === 3 ? (
            <div><h2 className="text-2xl font-black text-white">Teach Jarvis your routine</h2><p className="mt-2 text-sm text-slate-400">Check-in starts the active day. Checkout prepares quiet hours and the next morning comparison point.</p><div className="mt-5 grid gap-3 md:grid-cols-3"><label className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4"><Clock3 className="h-5 w-5 text-cyan-200" /><span className="mt-3 block text-xs font-black uppercase text-slate-500">Wake time</span><input type="time" value={draft.wake_time || "07:00"} onChange={(e) => patch({ wake_time: e.target.value })} className="mt-2 w-full bg-transparent text-lg font-black text-white" /></label><label className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4"><Clock3 className="h-5 w-5 text-violet-200" /><span className="mt-3 block text-xs font-black uppercase text-slate-500">Bedtime</span><input type="time" value={draft.bedtime || "22:30"} onChange={(e) => patch({ bedtime: e.target.value })} className="mt-2 w-full bg-transparent text-lg font-black text-white" /></label><Choice selected={Boolean(draft.quiet_hours_enabled)} icon={ShieldCheck} title="Enable quiet hours" body="Prepare overnight updates without interrupting sleep except for future approved critical alerts." onClick={() => patch({ quiet_hours_enabled: !draft.quiet_hours_enabled })} /></div></div>
          ) : null}

          {step === 4 ? (
            <div><h2 className="text-2xl font-black text-white">Choose what Jarvis may do</h2><p className="mt-2 text-sm text-slate-400">Start safely and expand permissions later.</p><div className="mt-5 grid gap-3 md:grid-cols-2">{[["view","View and summarize","Read connected information and prepare briefings."],["prepare","Prepare actions","Draft replies, events, task changes, and recommendations."],["confirm","Confirm before execution","Execute only after the exact action is approved."],["automate","Approved automation","Later allow specific recurring rules within strict limits."]].map(([id,title,body]) => <Choice key={id} selected={Boolean(draft.permissions?.[id])} icon={ShieldCheck} title={title} body={body} onClick={() => patch({ permissions: { ...(draft.permissions || {}), [id]: !draft.permissions?.[id] } })} />)}</div></div>
          ) : null}

          {step === 5 ? (
            <div><h2 className="text-2xl font-black text-white">Choose your Jarvis</h2><p className="mt-2 text-sm text-slate-400">Basic keeps SyncWorks Marketplace and service requests central. Paid plans add deeper intelligence and preparation.</p>{data?.billing?.test_access ? <div className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-3 text-sm text-emerald-100">Full testing access is active for this account. No checkout is required.</div> : null}<div className="mt-5 grid gap-3 lg:grid-cols-4">{(data.plans || []).map((plan) => <div key={plan.id} className={`rounded-3xl border p-5 ${data.plan === plan.id ? "border-cyan-300/50 bg-cyan-500/10" : "border-slate-800 bg-slate-950/70"}`}><div className="flex items-center justify-between gap-2"><div className="font-black text-white">{plan.name}</div><div className="text-sm font-black text-cyan-200">{plan.price ? `$${plan.price}/mo` : "Free"}</div></div><p className="mt-3 min-h-24 text-xs leading-6 text-slate-400">{plan.description}</p><button type="button" disabled={saving} onClick={() => choosePlan(plan.id)} className="mt-4 min-h-11 w-full rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 px-4 text-sm font-black text-white disabled:opacity-50">{data.plan === plan.id || (data.billing?.test_access && plan.id === "EXECUTIVE") ? "Continue with this plan" : plan.id === "BASIC" ? "Start Basic" : "Choose plan"}</button></div>)}</div>{data?.billing?.stripe_customer_ready ? <button type="button" onClick={async () => { const value = await openJarvisBillingPortal(); if (value?.url) window.location.assign(value.url); }} className="mt-4 text-sm font-black text-cyan-200">Manage billing</button> : null}</div>
          ) : null}

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-800 pt-5">
            <button type="button" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="min-h-12 rounded-2xl border border-slate-700 bg-slate-950 px-5 text-sm font-black disabled:opacity-30">Back</button>
            {step < STEPS.length - 1 ? <button type="button" onClick={next} disabled={saving} className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 px-6 text-sm font-black text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Save and continue<ChevronRight className="h-4 w-4" /></button> : null}
          </div>
        </section>
      </main>
    </div>
  );
}
