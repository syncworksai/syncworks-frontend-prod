// src/components/customer-health/PostWorkoutCoachAssistant.jsx
import React, { useMemo, useState } from "react";
import { buildWorkoutReport } from "./healthWorkoutReport";
import { playWorkoutCoachMessage } from "./healthWorkoutAudioController";

const SEEQ_URL = "https://www.seeqsupply.com/JACOB78279";

function safeNumber(value, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nextOpenWorkout(snapshot = {}, session = {}) {
  const finishedAt = new Date(session?.finished_at || Date.now());
  const finishedDay = new Date(
    finishedAt.getFullYear(),
    finishedAt.getMonth(),
    finishedAt.getDate()
  ).getTime();

  return [...(Array.isArray(snapshot?.week_plan) ? snapshot.week_plan : [])]
    .filter((item) => item?.workout_name && !["Completed", "Skipped", "Rescheduled"].includes(item?.status))
    .map((item) => ({
      ...item,
      time: new Date(`${item.ymd || "2099-01-01"}T12:00:00`).getTime(),
    }))
    .filter((item) => Number.isFinite(item.time) && item.time > finishedDay)
    .sort((a, b) => a.time - b.time)[0] || null;
}

function buildWins(report) {
  const wins = [];
  if (report?.wins?.length) wins.push(...report.wins.slice(0, 2));
  const progressed = (report?.progressionRows || []).filter((row) =>
    String(row?.reason || "").toLowerCase().match(/increase|progress|add|up/)
  );
  if (progressed.length) {
    wins.unshift(`${progressed.length} exercise${progressed.length === 1 ? "" : "s"} earned a progression target`);
  }
  if (!wins.length) wins.push("Workout data saved and ready to guide the next session");
  return wins.slice(0, 3);
}

function buildCoachSpeech({ report, proteinRemaining, waterRemaining, nextWorkout }) {
  const pieces = [
    "Great workout.",
    report?.coachSummary || "Your session is saved and SYNC has updated your training history.",
  ];
  if (proteinRemaining > 0) pieces.push(`You have about ${Math.round(proteinRemaining)} grams of protein remaining today.`);
  if (waterRemaining > 0) pieces.push(`You are about ${Math.round(waterRemaining)} ounces short of your hydration target.`);
  if (nextWorkout?.workout_name) pieces.push(`Your next planned workout is ${nextWorkout.workout_name}.`);
  pieces.push("Recover, refuel, and let today's performance guide the next session.");
  return pieces.join(" ");
}

function downloadCalendarEvent(nextWorkout, session) {
  if (typeof window === "undefined") return;
  const targetDate = nextWorkout?.ymd
    ? new Date(`${nextWorkout.ymd}T17:30:00`)
    : new Date(Date.now() + 24 * 60 * 60 * 1000);
  const completed = new Date(session?.finished_at || Date.now());
  targetDate.setHours(completed.getHours(), completed.getMinutes(), 0, 0);
  const end = new Date(targetDate.getTime() + 60 * 60 * 1000);
  const stamp = (date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const title = nextWorkout?.workout_name || "SYNC Workout";
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SyncWorks//Health//EN",
    "BEGIN:VEVENT",
    `UID:syncworks-health-${Date.now()}@syncworksapp.com`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(targetDate)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${title.replace(/,/g, "\\,")}`,
    "DESCRIPTION:SYNC Health planned workout. Open SyncWorks Health before training for your briefing.",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "syncworks-next-workout.ics";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);

  window.dispatchEvent(new CustomEvent("syncworks:health-schedule-workout", {
    detail: { workout: nextWorkout || {}, starts_at: targetDate.toISOString() },
  }));
}

export default function PostWorkoutCoachAssistant({ session, snapshot = {} }) {
  const [supplementsOpen, setSupplementsOpen] = useState(false);
  const report = useMemo(() => buildWorkoutReport(session || {}), [session]);
  const nextWorkout = useMemo(() => nextOpenWorkout(snapshot, session), [snapshot, session]);

  if (!session) return null;

  const proteinGoal = safeNumber(snapshot?.protein_goal, 0);
  const proteinToday = safeNumber(snapshot?.protein_today || snapshot?.protein, 0);
  const proteinRemaining = Math.max(0, proteinGoal - proteinToday);
  const waterGoal = safeNumber(snapshot?.water_goal || snapshot?.water_goal_oz, 0);
  const waterToday = safeNumber(snapshot?.water || snapshot?.water_oz, 0);
  const waterRemaining = Math.max(0, waterGoal - waterToday);
  const wins = buildWins(report);
  const coachSpeech = buildCoachSpeech({ report, proteinRemaining, waterRemaining, nextWorkout });

  function hearRecap() {
    playWorkoutCoachMessage({
      id: `${session.id || "workout"}:post-workout-assistant`,
      text: coachSpeech,
      priority: "high",
      replace: true,
      playOnce: false,
      eventType: "workout_completed",
      audioMode: "trainer",
      provider: "elevenlabs",
    });
  }

  function openNutrition() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("syncworks:health-open", { detail: { target: "nutrition", source: "post_workout" } }));
  }

  function openCoach() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("syncworks:health-open", { detail: { target: "coach-chat", source: "post_workout" } }));
  }

  function emailRecovery() {
    if (typeof window === "undefined") return;
    const subject = encodeURIComponent(`SYNC post-workout recovery: ${session.workout_name || "Workout"}`);
    const body = encodeURIComponent([
      `Workout complete: ${session.workout_name || "Workout"}`,
      `Session score: ${report.sessionScore}`,
      `Sets: ${report.totalSets}`,
      `Volume: ${Math.round(report.totalVolume).toLocaleString()} lb`,
      proteinRemaining > 0 ? `Protein remaining: about ${Math.round(proteinRemaining)}g` : "Protein target: complete",
      waterRemaining > 0 ? `Water remaining: about ${Math.round(waterRemaining)} oz` : "Hydration target: on track",
      "",
      "Protein option (affiliate):",
      SEEQ_URL,
      "",
      "General supplement note: creatine monohydrate and pre-workout products are optional. Review ingredients and personal health considerations before use.",
    ].join("\n"));
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  return (
    <section className="rounded-[1.65rem] border border-lime-300/30 bg-[radial-gradient(circle_at_top_right,rgba(57,255,136,0.15),transparent_32%),linear-gradient(145deg,#07110a,#020504)] p-4 shadow-[0_20px_70px_rgba(0,0,0,0.4)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-lime-300">SYNC workout complete</div>
          <h2 className="mt-1 text-2xl font-black text-white">Nice work. Now recover.</h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">Your training, nutrition, recovery, and next workout now connect here.</p>
        </div>
        <div className="rounded-2xl border border-lime-300/25 bg-lime-300/10 px-3 py-2 text-center">
          <div className="text-[8px] font-black uppercase tracking-wider text-lime-200">Score</div>
          <div className="text-2xl font-black text-lime-100">{report.sessionScore}</div>
        </div>
      </div>

      <button type="button" onClick={hearRecap} className="mt-4 h-12 w-full rounded-2xl border border-cyan-300/35 bg-cyan-300/12 text-sm font-black text-cyan-100">
        Hear SYNC Recap · ElevenLabs
      </button>

      <div className="mt-3 rounded-2xl border border-white/10 bg-black/25 p-3">
        <div className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">What changed</div>
        <div className="mt-2 space-y-1.5">
          {wins.map((win) => <div key={win} className="text-xs font-bold leading-5 text-slate-200">+ {win}</div>)}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/[0.07] p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.14em] text-fuchsia-200">Protein</div>
          <div className="mt-1 text-xl font-black text-white">{proteinGoal ? `${Math.round(proteinRemaining)}g left` : "Open plan"}</div>
          <div className="mt-1 text-[10px] leading-4 text-slate-400">Refuel for recovery and your current goal.</div>
        </div>
        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.07] p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.14em] text-cyan-200">Hydration</div>
          <div className="mt-1 text-xl font-black text-white">{waterGoal ? `${Math.round(waterRemaining)} oz left` : "Log water"}</div>
          <div className="mt-1 text-[10px] leading-4 text-slate-400">Finish the day recovered, not just trained.</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={openNutrition} className="min-h-12 rounded-2xl border border-lime-300/25 bg-lime-300/10 px-3 text-xs font-black text-lime-100">Post-workout meal</button>
        <a href={SEEQ_URL} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center rounded-2xl border border-fuchsia-300/25 bg-fuchsia-300/10 px-3 text-center text-xs font-black text-fuchsia-100">SEEQ Protein</a>
        <button type="button" onClick={() => setSupplementsOpen((value) => !value)} className="min-h-12 rounded-2xl border border-amber-300/20 bg-amber-300/[0.08] px-3 text-xs font-black text-amber-100">Supplements</button>
        <button type="button" onClick={openCoach} className="min-h-12 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-3 text-xs font-black text-cyan-100">Ask SYNC</button>
      </div>

      {supplementsOpen ? (
        <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-300/[0.055] p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.15em] text-amber-200">Recovery options</div>
          <div className="mt-2 grid gap-2 text-xs leading-5 text-slate-300 sm:grid-cols-2">
            <div><b className="text-white">Protein:</b> food first when practical; use a shake for convenience.</div>
            <div><b className="text-white">Creatine:</b> creatine monohydrate is a common performance supplement; consistency matters more than timing.</div>
            <div><b className="text-white">Pre-workout:</b> optional; review caffeine and stimulant content before use.</div>
            <div><b className="text-white">Electrolytes:</b> useful when sweat, heat, or long sessions meaningfully increase fluid loss.</div>
          </div>
          <div className="mt-2 text-[10px] leading-4 text-slate-500">Supplement guidance is educational, not medical advice. Health conditions, medications, pregnancy, and stimulant sensitivity can change what is appropriate.</div>
        </div>
      ) : null}

      <div className="mt-3 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] p-3">
        <div className="text-[9px] font-black uppercase tracking-[0.15em] text-cyan-200">Next workout</div>
        <div className="mt-1 text-lg font-black text-white">{nextWorkout?.workout_name || "Keep your next session on the calendar"}</div>
        <div className="mt-1 text-xs text-slate-400">Schedule it for the same time so SYNC can keep training and recovery connected.</div>
        <button type="button" onClick={() => downloadCalendarEvent(nextWorkout, session)} className="mt-3 h-11 w-full rounded-xl border border-cyan-300/30 bg-cyan-300/12 text-xs font-black text-cyan-100">Schedule Same Time</button>
      </div>

      <button type="button" onClick={emailRecovery} className="mt-3 h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] text-xs font-black text-slate-200">Email My Recovery Plan</button>
    </section>
  );
}
