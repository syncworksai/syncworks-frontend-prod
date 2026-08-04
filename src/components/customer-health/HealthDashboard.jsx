import React, { useEffect, useMemo, useState } from "react";

const WORKOUT_TEMPLATES = {
  strength: {
    title: "Chest Push Focus",
    subtitle: "Chest, shoulders, triceps",
    minutes: 48,
    exercises: [
      ["Bench Press", "4 x 6-8", "https://www.youtube.com/results?search_query=bench+press+form"],
      ["Incline Dumbbell Press", "3 x 8-10", "https://www.youtube.com/results?search_query=incline+dumbbell+press+form"],
      ["Seated Shoulder Press", "3 x 8-10", "https://www.youtube.com/results?search_query=seated+shoulder+press+form"],
      ["Cable Chest Fly", "3 x 10-12", "https://www.youtube.com/results?search_query=cable+chest+fly+form"],
      ["Triceps Pushdown", "3 x 10-12", "https://www.youtube.com/results?search_query=triceps+pushdown+form"],
    ],
  },
  pull: {
    title: "Back Pull Focus",
    subtitle: "Back, lats, rear delts, biceps",
    minutes: 50,
    exercises: [
      ["Lat Pulldown", "4 x 8-10", "https://www.youtube.com/results?search_query=lat+pulldown+form"],
      ["Seated Row", "4 x 8-10", "https://www.youtube.com/results?search_query=seated+row+form"],
      ["Single Arm Dumbbell Row", "3 x 10", "https://www.youtube.com/results?search_query=single+arm+dumbbell+row+form"],
      ["Face Pull", "3 x 12-15", "https://www.youtube.com/results?search_query=face+pull+form"],
      ["Biceps Curl", "3 x 10-12", "https://www.youtube.com/results?search_query=biceps+curl+form"],
    ],
  },
  cardio: {
    title: "Cardio + Abs Focus",
    subtitle: "Conditioning, core, endurance",
    minutes: 36,
    exercises: [
      ["Incline Walk", "10 min", "https://www.youtube.com/results?search_query=incline+treadmill+walking"],
      ["Bike Intervals", "8 rounds", "https://www.youtube.com/results?search_query=stationary+bike+intervals"],
      ["Plank", "3 x 45 sec", "https://www.youtube.com/results?search_query=plank+proper+form"],
      ["Dead Bug", "3 x 10/side", "https://www.youtube.com/results?search_query=dead+bug+exercise+form"],
      ["Hanging Knee Raise", "3 x 10", "https://www.youtube.com/results?search_query=hanging+knee+raise+form"],
    ],
  },
  mobility: {
    title: "Mobility + Recovery Focus",
    subtitle: "Hips, shoulders, spine, recovery",
    minutes: 28,
    exercises: [
      ["90/90 Hip Switch", "2 x 8/side", "https://www.youtube.com/results?search_query=90+90+hip+switch"],
      ["World's Greatest Stretch", "2 x 5/side", "https://www.youtube.com/results?search_query=worlds+greatest+stretch"],
      ["Thoracic Rotation", "2 x 8/side", "https://www.youtube.com/results?search_query=thoracic+rotation+mobility"],
      ["Band Shoulder Dislocates", "2 x 12", "https://www.youtube.com/results?search_query=band+shoulder+mobility"],
      ["Couch Stretch", "2 x 45 sec", "https://www.youtube.com/results?search_query=couch+stretch"],
    ],
  },
  hiit: {
    title: "HIIT / Tabata Focus",
    subtitle: "Intervals adaptable to any level",
    minutes: 24,
    exercises: [
      ["Work Interval", "20 sec", "https://www.youtube.com/results?search_query=beginner+tabata+workout"],
      ["Rest Interval", "10 sec", "https://www.youtube.com/results?search_query=tabata+timer+workout"],
      ["Repeat", "8 rounds", "https://www.youtube.com/results?search_query=tabata+8+rounds"],
      ["Recovery Walk", "3 min", "https://www.youtube.com/results?search_query=active+recovery+walk"],
    ],
  },
};

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pct(value, goal) {
  if (!goal) return 0;
  return Math.max(0, Math.min(100, Math.round((value / goal) * 100)));
}

function MetricBar({ label, value, goal, suffix = "", purple = false }) {
  const width = pct(value, goal);
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className={purple ? "font-bold text-violet-200" : "font-bold text-cyan-200"}>{label}</span>
        <span className="font-black text-white">{value}{suffix} <span className="font-semibold text-slate-500">/ {goal}{suffix}</span></span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.07]">
        <div className={purple ? "h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" : "h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function LogoButton({ onClick, small = false }) {
  return (
    <button type="button" onClick={onClick} className={`${small ? "h-16 w-16" : "h-28 w-28 sm:h-32 sm:w-32"} relative flex shrink-0 items-center justify-center rounded-full border border-blue-300/70 bg-[#050914] shadow-[0_0_18px_rgba(37,99,235,.8),0_0_42px_rgba(124,58,237,.55)] transition hover:scale-[1.03] active:scale-95`}>
      <span className="absolute inset-2 rounded-full border border-violet-400/70" />
      <span className={`${small ? "text-3xl" : "text-5xl"} bg-gradient-to-br from-cyan-300 via-blue-500 to-fuchsia-500 bg-clip-text font-black italic text-transparent`}>S</span>
    </button>
  );
}

function TimerCard() {
  const [seconds, setSeconds] = useState(60);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState("Rest");

  useEffect(() => {
    if (!running || seconds <= 0) return undefined;
    const id = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(id);
  }, [running, seconds]);

  useEffect(() => {
    if (seconds === 0) setRunning(false);
  }, [seconds]);

  function choose(nextMode) {
    setMode(nextMode);
    setRunning(false);
    setSeconds(nextMode === "Tabata" ? 20 : nextMode === "HIIT" ? 40 : 60);
  }

  return (
    <section className="rounded-3xl border border-blue-400/20 bg-[#070d1b] p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[.2em] text-blue-300">Workout Timer</div>
          <div className="mt-1 text-lg font-black text-white">{mode}</div>
        </div>
        <div className="text-3xl font-black tabular-nums text-cyan-300">{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {["Rest", "Tabata", "HIIT"].map((item) => <button key={item} type="button" onClick={() => choose(item)} className={`h-9 rounded-xl border text-xs font-black ${mode === item ? "border-blue-400/60 bg-blue-500/20 text-blue-100" : "border-white/10 bg-white/[.03] text-slate-400"}`}>{item}</button>)}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setRunning((value) => !value)} className="h-10 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 text-sm font-black text-white">{running ? "Pause" : "Start"}</button>
        <button type="button" onClick={() => { setRunning(false); choose(mode); }} className="h-10 rounded-xl border border-white/10 bg-white/[.04] text-sm font-black text-white">Reset</button>
      </div>
    </section>
  );
}

function WorkoutMenu({ onOpen, onStartWorkout }) {
  const [kind, setKind] = useState("strength");
  const [completed, setCompleted] = useState([0, 1]);
  const workout = WORKOUT_TEMPLATES[kind];
  const completion = Math.round((completed.length / workout.exercises.length) * 100);

  useEffect(() => setCompleted([]), [kind]);

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_330px]">
      <div className="rounded-[2rem] border border-blue-400/20 bg-[#050b18] p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.22em] text-blue-300">Today's Workout</div>
            <h2 className="mt-1 text-2xl font-black text-white">{workout.title}</h2>
            <p className="mt-1 text-sm text-slate-400">{workout.subtitle}</p>
          </div>
          <button type="button" onClick={() => onStartWorkout?.({ workout_name: workout.title, duration_minutes: workout.minutes, exercises: workout.exercises.map(([name, target]) => ({ name, target })) })} className="h-11 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-600 px-5 text-sm font-black text-white">Start Workout</button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[["strength", "Push"], ["pull", "Pull"], ["cardio", "Cardio + Abs"], ["mobility", "Mobility"], ["hiit", "HIIT / Tabata"]].map(([id, label]) => <button key={id} type="button" onClick={() => setKind(id)} className={`rounded-2xl border px-3 py-2 text-xs font-black ${kind === id ? "border-blue-400/60 bg-blue-500/20 text-blue-100" : "border-white/10 bg-white/[.03] text-slate-400"}`}>{label}</button>)}
        </div>

        <div className="mt-5 flex items-center justify-between text-xs font-bold text-slate-400"><span>{completed.length} / {workout.exercises.length} completed</span><span>{completion}%</span></div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${completion}%` }} /></div>

        <div className="mt-4 space-y-3">
          {workout.exercises.map(([name, target, video], index) => {
            const done = completed.includes(index);
            return (
              <article key={name} className="rounded-2xl border border-white/10 bg-[#09111f] p-3">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setCompleted((items) => done ? items.filter((item) => item !== index) : [...items, index])} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-black ${done ? "border-blue-300 bg-blue-500 text-white" : "border-white/20 text-slate-500"}`}>{done ? "✓" : index + 1}</button>
                  <div className="min-w-0 flex-1"><div className="font-black text-white">{name}</div><div className="mt-1 text-xs text-slate-500">{target}</div></div>
                </div>
                <details className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <summary className="cursor-pointer text-xs font-bold text-slate-300">Video guidance</summary>
                  <a href={video} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-black text-cyan-300">Open YouTube form guide →</a>
                </details>
              </article>
            );
          })}
        </div>
      </div>

      <aside className="space-y-4">
        <section className="rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-500/10 to-blue-500/10 p-4">
          <div className="flex items-center gap-3"><LogoButton small onClick={() => onOpen?.("coach-chat")} /><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-violet-200">SYNC Coach</div><div className="mt-1 font-black text-white">Adapt today's workout</div></div></div>
          <p className="mt-3 text-sm leading-6 text-slate-300">Say or type: “I only have 30 minutes,” “I am at home,” “my hip hurts,” or “make this beginner friendly.”</p>
          <div className="mt-3 flex gap-2"><button type="button" onClick={() => onOpen?.("coach-chat")} className="h-10 flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-xs font-black text-white">Type to SYNC</button><button type="button" onClick={() => onOpen?.("coach-chat")} className="h-10 w-12 rounded-xl border border-cyan-300/30 bg-cyan-300/10 text-lg">🎙</button></div>
        </section>
        <TimerCard />
        <button type="button" onClick={() => onOpen?.("nutrition")} className="w-full rounded-3xl border border-blue-400/20 bg-[#070d1b] p-4 text-left"><div className="text-xs font-black uppercase tracking-[.18em] text-blue-300">Nutrition</div><div className="mt-2 text-lg font-black text-white">Fuel this workout</div><div className="mt-1 text-sm text-slate-400">Open calories, protein, macros and hydration.</div></button>
      </aside>
    </div>
  );
}

export default function HealthDashboard({ profile = {}, snapshot = {}, history = [], onOpen, onStartWorkout }) {
  const [screen, setScreen] = useState("dashboard");
  const name = String(profile?.first_name || profile?.name || "Jacob").split(" ")[0];
  const calories = safeNumber(snapshot?.calories || snapshot?.calories_today, 1842);
  const calorieGoal = safeNumber(snapshot?.calorie_goal, 2400);
  const protein = safeNumber(snapshot?.protein_today || snapshot?.protein, 132);
  const proteinGoal = safeNumber(snapshot?.protein_goal || profile?.protein_goal, 160);
  const weekPlan = Array.isArray(snapshot?.week_plan) ? snapshot.week_plan : [];
  const next = weekPlan.find((item) => item?.workout_name && item?.status !== "Completed");
  const completed = history.filter((item) => item?.completed_at || item?.status === "Completed").length;
  const planPct = Math.max(12, Math.min(100, safeNumber(snapshot?.plan_completion_percent, completed ? 68 : 24)));
  const todayTitle = next?.workout_name || "Chest Push Focus";

  const navItems = useMemo(() => [["dashboard", "Home"], ["workouts", "Workouts"], ["nutrition", "Nutrition"], ["progress", "Progress"], ["shop", "Shop"]], []);

  return (
    <div className="min-h-screen rounded-[2rem] border border-blue-400/15 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,.13),transparent_30%),linear-gradient(180deg,#030711,#050a14)] p-3 text-white sm:p-5">
      <div className="grid gap-5 lg:grid-cols-[190px_1fr]">
        <aside className="hidden rounded-[1.75rem] border border-white/10 bg-[#060b16] p-4 lg:block">
          <div className="text-xs font-black tracking-[.22em] text-white">SYNCWORKS</div><div className="mt-1 text-[9px] font-black tracking-[.3em] text-violet-400">HEALTH</div>
          <nav className="mt-8 space-y-2">{navItems.map(([id, label]) => <button key={id} type="button" onClick={() => id === "dashboard" || id === "workouts" ? setScreen(id) : onOpen?.(id)} className={`h-11 w-full rounded-xl px-3 text-left text-sm font-black ${screen === id ? "bg-blue-500/15 text-blue-200" : "text-slate-400 hover:bg-white/[.04]"}`}>{label}</button>)}</nav>
          <button type="button" onClick={() => onOpen?.("questionnaire")} className="mt-8 h-11 w-full rounded-xl border border-white/10 text-left px-3 text-sm font-black text-slate-400">Profile</button>
        </aside>

        <main className="min-w-0 pb-24 lg:pb-4">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-3xl font-black tracking-tight">Good day, <span className="text-blue-400">{name}</span></h1><p className="mt-1 text-sm text-slate-400">Ready to keep your momentum going.</p></div><div className="flex items-center gap-2"><button type="button" onClick={() => onOpen?.("questionnaire")} className="h-10 rounded-xl border border-white/10 px-3 text-xs font-black text-slate-300">Profile</button><button type="button" onClick={() => onOpen?.("planner")} className="h-10 rounded-xl border border-blue-400/20 bg-blue-500/10 px-3 text-xs font-black text-blue-200">Plan</button></div></header>

          {screen === "workouts" ? <div className="mt-5"><WorkoutMenu onOpen={onOpen} onStartWorkout={onStartWorkout} /></div> : (
            <>
              <div className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_1fr_1fr]">
                <section className="relative overflow-hidden rounded-[1.75rem] border border-blue-400/20 bg-[#07101e] p-5"><div className="text-[10px] font-black uppercase tracking-[.2em] text-blue-300">Today's Workout</div><h2 className="mt-2 text-2xl font-black">{todayTitle}</h2><p className="mt-1 text-sm text-slate-400">Upper body focus · adaptable for home or gym</p><div className="mt-5 grid grid-cols-3 gap-2 text-center"><div><div className="text-xl font-black">45</div><div className="text-[10px] text-slate-500">Minutes</div></div><div><div className="text-xl font-black">8</div><div className="text-[10px] text-slate-500">Exercises</div></div><div><div className="text-xl font-black">All</div><div className="text-[10px] text-slate-500">Levels</div></div></div><button type="button" onClick={() => setScreen("workouts")} className="mt-5 h-11 w-full rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-600 text-sm font-black">Start Workout</button></section>
                <section className="rounded-[1.75rem] border border-white/10 bg-[#07101e] p-5"><div className="text-[10px] font-black uppercase tracking-[.2em] text-slate-400">Nutrition Summary</div><div className="mt-5 space-y-5"><MetricBar label="Calories" value={calories} goal={calorieGoal} /><MetricBar label="Protein" value={protein} goal={proteinGoal} suffix="g" purple /></div><button type="button" onClick={() => onOpen?.("nutrition")} className="mt-6 text-xs font-black text-cyan-300">See full breakdown →</button></section>
                <section className="rounded-[1.75rem] border border-white/10 bg-[#07101e] p-5"><div className="text-[10px] font-black uppercase tracking-[.2em] text-slate-400">Plan Progress</div><div className="mx-auto mt-4 flex h-36 w-36 items-center justify-center rounded-full bg-[conic-gradient(#22d3ee_0deg,#2563eb_calc(var(--p)*3.6deg),#111827_calc(var(--p)*3.6deg))]" style={{ "--p": planPct }}><div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-[#07101e]"><div className="text-3xl font-black">{planPct}%</div><div className="text-[10px] text-slate-500">Complete</div></div></div><div className="mt-3 text-center text-sm font-black">Phase 2 of 4</div><button type="button" onClick={() => onOpen?.("planner")} className="mt-3 w-full text-xs font-black text-blue-300">View plan →</button></section>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[1.3fr_1fr]">
                <section className="rounded-[1.75rem] border border-blue-400/20 bg-gradient-to-br from-blue-500/10 to-violet-500/10 p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><LogoButton onClick={() => onOpen?.("coach-chat")} /><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-blue-300">SYNC AI Coach</div><h3 className="mt-1 text-2xl font-black">Your coach, planner and accountability partner.</h3><p className="mt-2 text-sm leading-6 text-slate-300">Ask for a shorter workout, a home alternative, mobility work, HIIT, Tabata, nutrition guidance, or a recovery day. Use your microphone or type.</p><div className="mt-4 flex gap-2"><button type="button" onClick={() => onOpen?.("coach-chat")} className="h-10 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 px-4 text-xs font-black">Chat with SYNC</button><button type="button" onClick={() => onOpen?.("coach-chat")} className="h-10 rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 text-xs font-black">🎙 Speak</button></div></div></div></section>
                <section className="rounded-[1.75rem] border border-white/10 bg-[#07101e] p-5"><div className="text-[10px] font-black uppercase tracking-[.2em] text-slate-400">Smart Reminders</div><h3 className="mt-2 text-xl font-black">Stay on track.</h3><p className="mt-2 text-sm leading-6 text-slate-400">Workout, nutrition, hydration and reorder reminders can be sent by email.</p><button type="button" onClick={() => onOpen?.("planner")} className="mt-5 text-xs font-black text-cyan-300">Manage reminders →</button></section>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">{[["Nutrition", "nutrition"], ["Plan", "planner"], ["Progress", "progress"], ["Profile", "questionnaire"], ["Shop", "shop"]].map(([label, route]) => <button key={label} type="button" onClick={() => onOpen?.(route)} className="rounded-2xl border border-white/10 bg-[#07101e] p-4 text-left"><div className="text-sm font-black">{label}</div><div className="mt-1 text-[11px] text-slate-500">Open {label.toLowerCase()}</div></button>)}</div>
            </>
          )}
        </main>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 items-end rounded-2xl border border-blue-400/20 bg-[#050914]/95 px-2 py-2 shadow-[0_0_30px_rgba(37,99,235,.25)] backdrop-blur lg:hidden">
        <button type="button" onClick={() => setScreen("dashboard")} className={`h-12 text-[10px] font-black ${screen === "dashboard" ? "text-blue-300" : "text-slate-500"}`}>⌂<br/>Home</button>
        <button type="button" onClick={() => setScreen("workouts")} className={`h-12 text-[10px] font-black ${screen === "workouts" ? "text-blue-300" : "text-slate-500"}`}>▣<br/>Workouts</button>
        <div className="flex justify-center"><LogoButton small onClick={() => onOpen?.("coach-chat")} /></div>
        <button type="button" onClick={() => onOpen?.("nutrition")} className="h-12 text-[10px] font-black text-slate-500">◒<br/>Nutrition</button>
        <button type="button" onClick={() => onOpen?.("questionnaire")} className="h-12 text-[10px] font-black text-slate-500">○<br/>Profile</button>
      </nav>
    </div>
  );
}
