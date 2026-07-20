// src/components/customer-health/HealthHelpCenter.jsx
import React, { useMemo, useState } from "react";

const HELP_SECTIONS = [
  {
    id: "start",
    title: "Start here",
    summary: "Learn the daily flow in under two minutes.",
    items: [
      "Open Health Home and review today's workout, readiness, protein, and sleep targets.",
      "Use Quick Log for meals, weight, steps, sleep, pain, and mood.",
      "Tap Start Workout when you are ready. SYNC will guide the warmup, working sets, rest, and logging.",
      "Use Progress to review consistency, personal records, volume, recovery, and body trends.",
    ],
  },
  {
    id: "workouts",
    title: "How workouts work",
    summary: "The workout loop is designed to keep logging out of the way.",
    items: [
      "Complete the readiness check so SYNC can adjust exercise choice, load, volume, or rest.",
      "Follow the dynamic warmup one step at a time.",
      "Tap Start Set before exercising, then Finish Set immediately afterward.",
      "The rest timer begins automatically. Log weight, reps, RPE, form, and pain during rest.",
      "Save the set, continue, swap an exercise when needed, and finish the workout for your summary.",
    ],
  },
  {
    id: "nutrition",
    title: "Nutrition coach",
    summary: "Describe food naturally, then confirm before saving.",
    items: [
      "Tell SYNC what you ate in normal language.",
      "Review each estimated item, serving assumption, calories, and macros.",
      "Edit anything that looks wrong before saving.",
      "Reuse saved meals for faster logging later.",
    ],
  },
  {
    id: "coach",
    title: "SYNC Coach",
    summary: "Ask for help without digging through menus.",
    items: [
      "Build or adjust a workout for your time, location, equipment, soreness, or goals.",
      "Ask how to perform an exercise or what muscles you should feel.",
      "Request a substitute when equipment is unavailable or a movement hurts.",
      "Ask SYNC to review progress, recovery, nutrition, or tomorrow's plan.",
    ],
  },
  {
    id: "progress",
    title: "Progress and recovery",
    summary: "Your data becomes more useful as you consistently log it.",
    items: [
      "Workout history powers strength, volume, consistency, and personal-record trends.",
      "Sleep, soreness, pain, and readiness help SYNC adjust future sessions.",
      "Nutrition and body metrics help compare daily actions with long-term goals.",
    ],
  },
];

const TOUR_STEPS = [
  {
    eyebrow: "WELCOME",
    title: "Your health command center",
    body: "SyncWorks Health combines training, nutrition, sleep, recovery, progress, and AI coaching in one focused app.",
  },
  {
    eyebrow: "DAILY HOME",
    title: "Know what matters today",
    body: "Start with readiness, today's workout, protein remaining, sleep target, and one useful trainer insight.",
  },
  {
    eyebrow: "TRAINER LOOP",
    title: "Train first. Log during rest.",
    body: "Start the set, finish the set, log while the rest timer runs, then continue. The app stays out of your way while you move.",
  },
  {
    eyebrow: "SYNC COACH",
    title: "Ask instead of searching",
    body: "Build a workout, replace an exercise, explain form, adjust for pain, log food, or review your progress through one coach.",
  },
  {
    eyebrow: "YOU ARE READY",
    title: "Build consistency, not confusion",
    body: "Use Health Home each day, log honestly, and let SYNC adapt as your history grows.",
  },
];

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export default function HealthHelpCenter({ open, onClose, initialMode = "help" }) {
  const [mode, setMode] = useState(initialMode);
  const [tourIndex, setTourIndex] = useState(0);
  const [query, setQuery] = useState("");

  const filteredSections = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) return HELP_SECTIONS;
    return HELP_SECTIONS.filter((section) =>
      [section.title, section.summary, ...section.items]
        .join(" ")
        .toLowerCase()
        .includes(clean)
    );
  }, [query]);

  if (!open) return null;

  const step = TOUR_STEPS[tourIndex];

  return (
    <div className="fixed inset-0 z-[140] flex items-end justify-center bg-black/80 p-0 backdrop-blur-xl sm:items-center sm:p-5">
      <section className="relative max-h-[94dvh] w-full max-w-3xl overflow-hidden rounded-t-[2rem] border border-emerald-300/20 bg-[#050806] shadow-[0_0_80px_rgba(0,245,106,0.16)] sm:rounded-[2rem]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300 to-transparent" />

        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-6">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-300">SYNCWORKS HEALTH</div>
            <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">
              {mode === "tour" ? "Quick Start Tour" : "Help Center"}
            </h2>
          </div>

          <button type="button" onClick={onClose} aria-label="Close help" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-200 hover:border-emerald-300/35 hover:text-white">
            <CloseIcon />
          </button>
        </header>

        <div className="flex gap-2 border-b border-white/10 px-4 py-3 sm:px-6">
          <button type="button" onClick={() => setMode("help")} className={`h-10 rounded-xl border px-4 text-xs font-black uppercase tracking-[0.12em] ${mode === "help" ? "border-emerald-300/45 bg-emerald-300/10 text-emerald-100" : "border-white/10 bg-white/[0.03] text-slate-400"}`}>Help Topics</button>
          <button type="button" onClick={() => { setMode("tour"); setTourIndex(0); }} className={`h-10 rounded-xl border px-4 text-xs font-black uppercase tracking-[0.12em] ${mode === "tour" ? "border-emerald-300/45 bg-emerald-300/10 text-emerald-100" : "border-white/10 bg-white/[0.03] text-slate-400"}`}>Replay Tour</button>
        </div>

        {mode === "tour" ? (
          <div className="overflow-y-auto px-4 py-5 sm:px-6 sm:py-7">
            <div className="rounded-[1.75rem] border border-emerald-300/20 bg-[radial-gradient(circle_at_top_right,rgba(0,245,106,0.13),transparent_38%),linear-gradient(145deg,#101713,#050806)] p-5 sm:p-8">
              <div className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-300">{step.eyebrow}</div>
              <h3 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">{step.title}</h3>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">{step.body}</p>

              <div className="mt-8 flex gap-2">
                {TOUR_STEPS.map((_, index) => (
                  <div key={index} className={`h-1.5 flex-1 rounded-full ${index <= tourIndex ? "bg-emerald-400 shadow-[0_0_10px_rgba(0,245,106,0.5)]" : "bg-white/10"}`} />
                ))}
              </div>

              <div className="mt-7 flex items-center justify-between gap-3">
                <button type="button" onClick={() => setTourIndex((current) => Math.max(0, current - 1))} disabled={tourIndex === 0} className="h-12 rounded-2xl border border-white/10 bg-white/[0.03] px-5 text-sm font-black text-slate-200 disabled:cursor-not-allowed disabled:opacity-35">Back</button>

                {tourIndex < TOUR_STEPS.length - 1 ? (
                  <button type="button" onClick={() => setTourIndex((current) => Math.min(TOUR_STEPS.length - 1, current + 1))} className="h-12 rounded-2xl border border-emerald-300/50 bg-emerald-400 px-6 text-sm font-black text-black shadow-[0_0_28px_rgba(0,245,106,0.22)]">Next</button>
                ) : (
                  <button type="button" onClick={onClose} className="h-12 rounded-2xl border border-emerald-300/50 bg-emerald-400 px-6 text-sm font-black text-black shadow-[0_0_28px_rgba(0,245,106,0.22)]">Enter Health</button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-h-[72dvh] overflow-y-auto px-4 py-5 sm:px-6">
            <label className="block">
              <span className="sr-only">Search Health help</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search workouts, nutrition, SYNC, progress..." className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white placeholder:text-slate-500" />
            </label>

            <div className="mt-5 space-y-3 pb-5">
              {filteredSections.map((section) => (
                <details key={section.id} className="group rounded-[1.4rem] border border-white/10 bg-white/[0.025] p-4 open:border-emerald-300/25 open:bg-emerald-300/[0.04]">
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-base font-black text-white">{section.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-400">{section.summary}</p>
                      </div>
                      <span className="mt-1 text-xl text-emerald-300 transition group-open:rotate-45">+</span>
                    </div>
                  </summary>

                  <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                    {section.items.map((item, index) => (
                      <div key={index} className="flex gap-3 text-sm leading-6 text-slate-300">
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(0,245,106,0.5)]" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </details>
              ))}

              {!filteredSections.length ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 text-sm text-slate-400">No help topic matched that search.</div>
              ) : null}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
