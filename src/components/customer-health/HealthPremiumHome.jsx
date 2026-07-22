// src/components/customer-health/HealthPremiumHome.jsx
import React, { useMemo, useRef, useState } from "react";
import HealthDailyCoachStatusCard from "./HealthDailyCoachStatusCard";
import HealthGoalProgressCard from "./HealthGoalProgressCard";
import {
  speakCoachText,
  stopCoachVoice,
} from "./healthCoachVoice";

function safeNumber(value, fallback = 0) {
  const parsed = Number(
    String(value ?? "").replace(/[^\d.-]/g, "")
  );

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function daypartGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";

  return "Good evening";
}

function buildDailyCoachBriefing({
  name,
  snapshot,
  workout,
  proteinRemaining,
  sleep,
  sleepGoal,
}) {
  const needs = [];
  const loggedMeals =
    Number(snapshot?.meals_logged_today || 0);

  if (!sleep) {
    needs.push("sleep");
  }

  if (proteinRemaining > 0) {
    needs.push(String(proteinRemaining) + " grams of protein");
  }

  if (!loggedMeals) {
    needs.push("meals");
  }

  if (!snapshot?.workout_completed_today && workout) {
    needs.push("today's workout");
  }

  const planStatus =
    needs.length === 0
      ? "Your plan is on track."
      : "Your plan is still recoverable, but we need to address " +
        needs.join(", ") +
        ".";

  const workoutPrompt =
    !snapshot?.workout_completed_today && workout
      ? "You have not logged today's workout yet. Do you want to proceed with " +
        (workout.workout_name || "your workout") +
        "?"
      : "What can I help you improve today?";

  return (
    daypartGreeting() +
    (name ? ", " + name : "") +
    ". " +
    planStatus +
    " " +
    workoutPrompt
  );
}

function todayYmd() {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function findTodayWorkout(weekPlan = []) {
  return (Array.isArray(weekPlan) ? weekPlan : []).find(
    (item) =>
      item?.ymd === todayYmd() &&
      item?.workout_name &&
      item?.status !== "Completed"
  );
}

function findNextWorkout(weekPlan = []) {
  const todayStart =
    new Date().setHours(0, 0, 0, 0);

  return [
    ...(Array.isArray(weekPlan) ? weekPlan : []),
  ]
    .filter(
      (item) =>
        item?.workout_name &&
        !["Completed", "Skipped"].includes(
          item?.status
        )
    )
    .map((item) => ({
      ...item,
      timeValue: new Date(
        `${item?.ymd || "2099-01-01"}T12:00:00`
      ).getTime(),
    }))
    .filter(
      (item) =>
        Number.isFinite(item.timeValue) &&
        item.timeValue >= todayStart
    )
    .sort(
      (a, b) => a.timeValue - b.timeValue
    )[0];
}

function firstName(profile) {
  return String(
    profile?.first_name ||
      profile?.name ||
      ""
  ).trim();
}

function readinessValue(snapshot) {
  const raw =
    snapshot?.readiness_score ??
    snapshot?.readiness ??
    snapshot?.daily_readiness;

  if (typeof raw === "number") {
    return Math.max(
      0,
      Math.min(100, Math.round(raw))
    );
  }

  const text = String(raw || "").toLowerCase();

  if (
    text.includes("ready") ||
    text.includes("high")
  ) {
    return 88;
  }

  if (text.includes("good")) return 74;
  if (text.includes("low")) return 46;

  return 0;
}

function totalSets(workout) {
  if (!workout) return 0;

  if (Array.isArray(workout.exercises)) {
    return workout.exercises.reduce(
      (sum, exercise) =>
        sum +
        safeNumber(
          exercise?.sets ||
            exercise?.planned_sets,
          0
        ),
      0
    );
  }

  return safeNumber(
    workout?.total_sets ||
      workout?.sets,
    0
  );
}

function Icon({
  type,
  className = "h-5 w-5",
}) {
  const common = {
    viewBox: "0 0 24 24",
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (type === "workout") {
    return (
      <svg {...common}>
        <path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10" />
      </svg>
    );
  }

  if (type === "nutrition") {
    return (
      <svg {...common}>
        <path d="M7 4h10v16H7z" />
        <path d="M10 4v7M14 4v7M10 15h4" />
      </svg>
    );
  }

  if (type === "steps") {
    return (
      <svg {...common}>
        <path d="M6 18c3-6 5-9 10-12" />
        <path d="M12 6h5v5" />
      </svg>
    );
  }

  if (type === "sleep") {
    return (
      <svg {...common}>
        <path d="M16 4a8 8 0 1 0 4 12 9 9 0 0 1-4-12Z" />
      </svg>
    );
  }

  if (type === "weight") {
    return (
      <svg {...common}>
        <path d="M6 5h12l2 15H4L6 5Z" />
        <path d="M9 10a3 3 0 0 1 6 0" />
      </svg>
    );
  }

  if (type === "readiness") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  if (type === "arrow") {
    return (
      <svg {...common}>
        <path d="M5 12h14" />
        <path d="m14 7 5 5-5 5" />
      </svg>
    );
  }

  if (type === "play") {
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="m8 5 11 7-11 7V5Z" />
      </svg>
    );
  }

  return null;
}

function QuickLogButton({
  label,
  icon,
  onClick,
  active = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex min-w-[72px] flex-1 flex-col items-center gap-2 rounded-2xl border px-2 py-3 transition active:scale-[0.98] ${
        active
          ? "border-emerald-300/55 bg-emerald-300/[0.09] text-emerald-200 shadow-[0_0_22px_rgba(0,245,106,0.14)]"
          : "border-white/10 bg-white/[0.025] text-slate-400 hover:border-emerald-300/25 hover:text-white"
      }`}
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-[1rem] border ${
          active
            ? "border-emerald-300/45 bg-emerald-300/[0.08]"
            : "border-white/10 bg-black/25"
        }`}
      >
        <Icon type={icon} />
      </span>

      <span className="text-[9px] font-black uppercase tracking-[0.1em]">
        {label}
      </span>
    </button>
  );
}

function MetricCard({
  eyebrow,
  value,
  detail,
  progress,
  action,
  onClick,
  compact = false,
}) {
  return (
    <section className="relative overflow-hidden rounded-[1.65rem] border border-white/10 bg-[linear-gradient(145deg,rgba(17,24,20,0.97),rgba(4,7,5,0.99))] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.3)]">
      <div className="absolute right-4 top-0 h-px w-16 bg-gradient-to-r from-transparent via-emerald-300 to-transparent" />

      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
        {eyebrow}
      </div>

      <div
        className={`mt-2 font-black tracking-tight text-white ${
          compact
            ? "text-3xl"
            : "text-4xl"
        }`}
      >
        {value}
      </div>

      <div className="mt-1 text-xs leading-5 text-slate-400">
        {detail}
      </div>

      {typeof progress === "number" ? (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-300 shadow-[0_0_14px_rgba(0,245,106,0.4)]"
            style={{
              width: `${Math.max(
                0,
                Math.min(100, progress)
              )}%`,
            }}
          />
        </div>
      ) : null}

      {action ? (
        <button
          type="button"
          onClick={onClick}
          className="mt-4 flex h-11 w-full items-center justify-between rounded-xl border border-white/10 bg-black/25 px-4 text-sm font-black text-white hover:border-emerald-300/35"
        >
          <span>{action}</span>
          <Icon
            type="arrow"
            className="h-4 w-4"
          />
        </button>
      ) : null}
    </section>
  );
}

export default function HealthPremiumHome({
  profile,
  snapshot,
  history,
  onOpen,
  onStartWorkout,
  onShowInsights,
  onQuickLog,
  onEditDailyGoals,
  onCoachUpdate,
}) {
  const [coachDraft, setCoachDraft] = useState("");
  const [coachMessages, setCoachMessages] = useState([]);
  const [coachListening, setCoachListening] = useState(false);
  const [coachError, setCoachError] = useState("");
  const recognitionRef = useRef(null);
  const todayWorkout = useMemo(
    () =>
      findTodayWorkout(
        snapshot?.week_plan
      ),
    [snapshot?.week_plan]
  );

  const nextWorkout = useMemo(
    () =>
      findNextWorkout(
        snapshot?.week_plan
      ),
    [snapshot?.week_plan]
  );

  const workout =
    todayWorkout || nextWorkout;

  const readiness =
    readinessValue(snapshot);

  const protein = safeNumber(
    snapshot?.protein_today ||
      snapshot?.protein,
    0
  );

  const proteinGoal = safeNumber(
    snapshot?.protein_goal ||
      profile?.protein_goal,
    136
  );

  const proteinRemaining = Math.max(
    0,
    proteinGoal - protein
  );

  const sleep = safeNumber(
    snapshot?.last_sleep_hours ||
      snapshot?.sleep_hours,
    0
  );

  const sleepGoal = safeNumber(
    profile?.sleep_goal_hours ||
      snapshot?.sleep_goal_hours,
    7.5
  );

  const steps = safeNumber(
    snapshot?.steps,
    0
  );

  const stepsGoal = safeNumber(
    profile?.step_goal ||
      snapshot?.step_goal,
    10000
  );

  const name =
    firstName(profile);

  const exerciseCount =
    Array.isArray(workout?.exercises)
      ? workout.exercises.length
      : safeNumber(
          workout?.exercise_count,
          0
        );

  const setCount =
    totalSets(workout);

  const rawDuration =
    safeNumber(
      workout?.duration_minutes ||
        workout?.requested_duration_minutes,
      0
    );

  const duration =
    rawDuration > 0
      ? rawDuration
      : 45;

  const dailyCoachBriefing = buildDailyCoachBriefing({
    name,
    snapshot,
    workout,
    proteinRemaining,
    sleep,
    sleepGoal,
  });

  const insight =
    history?.length
      ? "Your recent training history is ready for SYNC to review. Use Progress to see trends and your next best move."
      : "Complete your first guided workout to unlock strength, consistency, volume, and recovery insights.";

  function openUnifiedSync({ speak = true } = {}) {
    onOpen?.("coach-chat");
    if (!speak) return;
    window.setTimeout(() => {
      try {
        stopCoachVoice();
        speakCoachText({
          text: dailyCoachBriefing,
          audioMode: "essential",
          voicePreference: "australian",
          rate: 0.96,
          pitch: 1,
          volume: 1,
          cancelFirst: true,
          eventType: "health_home_unified_sync",
          browserFallback: true,
        });
      } catch (error) {
        console.warn("Unable to play the SYNC daily update:", error);
      }
    }, 80);
  }

  function buildHomeCoachReply(message) {
    const command = String(message || "").trim();
    const lower = command.toLowerCase();
    const patch = {};
    const confirmations = [];

    if (
      lower === "yes" ||
      lower.includes("start workout") ||
      lower.includes("proceed with workout")
    ) {
      if (workout) {
        window.setTimeout(
          () => onStartWorkout?.(workout),
          150
        );

        return (
          "Perfect. I am opening " +
          (workout.workout_name || "today's workout") +
          " now."
        );
      }

      onOpen?.("plan-today");

      return "You do not have a workout scheduled, so I am opening the workout builder.";
    }

    if (
      lower === "no" ||
      lower.includes("not yet") ||
      lower.includes("skip workout")
    ) {
      return "No problem. Tell me what you need instead: recovery help, soreness adjustments, a meal plan, nutrition guidance, goals, or a shorter workout later.";
    }

    if (
      lower.includes("meal plan") ||
      lower.includes("nutrition plan")
    ) {
      window.setTimeout(
        () => onQuickLog?.("nutrition-coach"),
        150
      );

      return "I am opening the nutrition coach so we can build the right meal plan around your goals and what you have available.";
    }

    if (lower.includes("protein")) {
      return proteinRemaining > 0
        ? "You have about " +
            proteinRemaining +
            " grams of protein remaining today. I can help you build meals around that target."
        : "You have reached today's protein target. Keep the rest of your meals balanced and recovery-focused.";
    }

    if (lower.includes("sleep")) {
      return sleep
        ? "You logged " +
            sleep +
            " hours against a " +
            sleepGoal +
            "-hour goal. I can help adjust recovery or tonight's sleep plan."
        : "Sleep has not been logged yet. Log last night's sleep so I can adjust readiness and training recommendations.";
    }

    if (lower.includes("measurement")) {
      window.setTimeout(() => onOpen?.("profile-intake"), 120);
      return "I am opening your measurements and health profile. You can record inches or centimeters and pounds or kilograms.";
    }

    if (
      lower.includes("more than once") ||
      lower.includes("multiple workout") ||
      lower.includes("multiple session")
    ) {
      patch.multiple_sessions_today = true;
      patch.session_count_planned = Math.max(2, Number(snapshot?.session_count_planned || 0));
      confirmations.push("I will treat today as a multi-session training day and evaluate each session separately.");
    }

    if (
      lower.includes("goal") ||
      lower.includes("progress") ||
      lower.includes("on track")
    ) {
      return dailyCoachBriefing;
    }

    if (
      lower.includes("home") ||
      lower.includes("no equipment") ||
      lower.includes("bodyweight")
    ) {
      patch.training_location = "Home";
      patch.equipment = lower.includes("dumbbell")
        ? "Dumbbells, Bodyweight, Floor"
        : "Bodyweight, Floor, No Equipment";
      patch.available_equipment = lower.includes("dumbbell")
        ? ["Dumbbells", "Bodyweight", "Floor"]
        : ["Bodyweight", "Floor", "No Equipment"];
      confirmations.push(
        lower.includes("dumbbell")
          ? "I will use home-friendly dumbbell and bodyweight movements."
          : "I will remove barbells and machines and use bodyweight or floor movements."
      );
    }

    if (lower.includes("machines busy")) {
      patch.equipment = "Free weights, Dumbbells, Floor";
      patch.available_equipment = ["Free weights", "Dumbbells", "Floor"];
      confirmations.push("I will avoid machine-only exercises.");
    }

    if (lower.includes("floor only")) {
      patch.equipment = "Floor, Bodyweight, Bands";
      patch.available_equipment = ["Floor", "Bodyweight", "Bands"];
      confirmations.push("I will build the session around floor, bodyweight, and band work.");
    }

    const minuteMatch = lower.match(/(d{1,3})s*(minute|min)/);
    if (minuteMatch) {
      patch.available_minutes = Number(minuteMatch[1]);
      patch.requested_duration_minutes = Number(minuteMatch[1]);
      confirmations.push(`I will prioritize the highest-value work for ${minuteMatch[1]} minutes.`);
    }

    if (
      lower.includes("later today") ||
      lower.includes("again later") ||
      lower.includes("split workout")
    ) {
      patch.multiple_sessions_today = true;
      patch.save_remaining_work_for_later = true;
      confirmations.push("I will treat today as a split training day and preserve remaining work.");
    }

    if (lower.includes("pain") || lower.includes("sore")) {
      const sorenessAreas = [];
      if (/(leg|quad|hamstring|calf|glute|hip)/.test(lower)) sorenessAreas.push("Lower Body");
      if (/(chest|shoulder|tricep|bicep|arm|back|lat)/.test(lower)) sorenessAreas.push("Upper Body");
      if (/(core|ab|lower back|midsection)/.test(lower)) sorenessAreas.push("Core");
      patch.readiness_notes = command;
      patch.soreness_areas = sorenessAreas.length ? sorenessAreas : ["Unspecified"];
      patch.soreness_severity =
        lower.includes("very") || lower.includes("severe")
          ? "High"
          : lower.includes("little") || lower.includes("mild")
          ? "Low"
          : "Moderate";
      patch.requires_workout_review = true;
      patch.auto_start_blocked = true;
      confirmations.push(
        "I recorded the soreness and paused automatic workout start. SYNC should review the affected muscles, yesterday's completed work, and today's plan before you begin."
      );
    }

    onCoachUpdate?.(patch);

    return confirmations.length
      ? confirmations.join(" ")
      : "Tell me where you are training, what equipment is available, how much time you have, or whether you may train again later. I will adapt today's workout before you start.";
  }

  function submitCoachMessage(rawMessage) {
    const message = String(rawMessage || "").trim();
    if (!message) return;

    const reply = buildHomeCoachReply(message);
    const stamp = Date.now();

    setCoachMessages((previous) => [
      ...previous,
      { id: `user-${stamp}`, role: "user", text: message },
      { id: `sync-${stamp}`, role: "assistant", text: reply },
    ]);

    setCoachDraft("");
    setCoachError("");

    speakCoachText({
      text: reply,
      audioMode: "essential",
      voicePreference: "australian",
      rate: 0.98,
      pitch: 1,
      volume: 1,
      cancelFirst: true,
      eventType: "health_home_coach",
      browserFallback: true,
    });
  }

  function startCoachListening() {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setCoachError("Voice input is not supported in this browser.");
      return;
    }

    try {
      recognitionRef.current?.stop?.();
    } catch {
      // Best-effort cleanup.
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event?.results?.[0]?.[0]?.transcript || "";
      setCoachListening(false);
      submitCoachMessage(transcript);
    };

    recognition.onerror = () => {
      setCoachListening(false);
      setCoachError("Voice input was interrupted. Tap the microphone and try again.");
    };

    recognition.onend = () => setCoachListening(false);

    recognitionRef.current = recognition;
    setCoachListening(true);
    setCoachError("");

    try {
      recognition.start();
    } catch {
      setCoachListening(false);
      setCoachError("Voice input could not start.");
    }
  }

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[2rem] border border-emerald-300/18 bg-[radial-gradient(circle_at_88%_20%,rgba(0,245,106,0.14),transparent_28%),linear-gradient(145deg,#0d130f,#020403)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.42)] sm:p-7">
        <div className="pointer-events-none absolute -right-8 top-4 h-52 w-52 rounded-full border border-emerald-300/10 bg-[radial-gradient(circle,rgba(0,245,106,0.08),transparent_65%)]" />

        <div className="relative max-w-2xl">
          <div className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-300">
            HEALTH SYNC
          </div>

          <h1 className="mt-4 text-4xl font-black uppercase leading-[0.95] tracking-[-0.04em] text-white sm:text-6xl">
            Ready to
            <span className="block text-emerald-400">
              level up?
            </span>
          </h1>

          <p className="mt-4 text-sm text-slate-400 sm:text-base">
            What is the plan today
            {name ? `, ${name}` : ""}?
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                openUnifiedSync({ speak: true })
              }
              className="h-12 rounded-2xl border border-emerald-300/45 bg-emerald-300/[0.08] px-5 text-sm font-black text-emerald-100 shadow-[0_0_28px_rgba(0,245,106,0.15)]"
            >
              Talk to SYNC
            </button>

            <button
              type="button"
              onClick={onShowInsights}
              className="h-12 rounded-2xl border border-white/10 bg-white/[0.03] px-5 text-sm font-black text-white"
            >
              View Progress
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-emerald-300/25 bg-[linear-gradient(145deg,rgba(8,16,11,0.98),rgba(2,5,3,0.99))] p-4 shadow-[0_0_32px_rgba(57,255,136,0.08)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
              Ask SYNC
            </div>
            <div className="mt-1 text-lg font-black text-white">
              Your daily health command center
            </div>
            <div className="mt-1 text-xs leading-5 text-slate-400">
              Talk to SYNC about workouts, nutrition, protein, sleep, soreness, recovery, goals, and today's plan.
            </div>
          </div>

          <button
            type="button"
            onClick={startCoachListening}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-lg ${
              coachListening
                ? "border-rose-300/40 bg-rose-300/10"
                : "border-emerald-300/40 bg-emerald-300/10"
            }`}
            aria-label="Speak to SYNC"
          >
            {coachListening ? "■" : "🎙️"}
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-300">
            SYNC Daily Update
          </div>

          <div className="mt-2 text-sm leading-6 text-emerald-50">
            {String(dailyCoachBriefing || "")
              .split(".")
              .slice(0, 2)
              .join(".") + "."}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                submitCoachMessage(
                  "Yes, start workout"
                )
              }
              className="h-11 rounded-xl border border-emerald-300/45 bg-emerald-300 text-xs font-black text-black disabled:opacity-40"
              disabled={!workout}
            >
              Yes, Proceed
            </button>

            <button
              type="button"
              onClick={() =>
                submitCoachMessage("No, not yet")
              }
              className="h-11 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-black text-white"
            >
              Not Yet
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
                openUnifiedSync({ speak: true })
              }
            className="mt-2 h-10 w-full rounded-xl border border-emerald-300/25 bg-black/25 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100"
          >
            Open SYNC for Full Update
          </button>
        </div>

        {coachMessages.length ? (
          <div className="mt-3 max-h-52 space-y-2 overflow-y-auto rounded-2xl border border-white/10 bg-black/25 p-3">
            {coachMessages.slice(-6).map((message) => (
              <div
                key={message.id}
                className={
                  message.role === "user"
                    ? "ml-8 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-white"
                    : "mr-8 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.07] px-3 py-2 text-xs leading-5 text-emerald-50"
                }
              >
                {message.text}
              </div>
            ))}
          </div>
        ) : null}

        {coachError ? (
          <div className="mt-3 rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
            {coachError}
          </div>
        ) : null}

        <div className="mt-3 grid grid-cols-[1fr_52px] gap-2">
          <input
            value={coachDraft}
            onChange={(event) => setCoachDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitCoachMessage(coachDraft);
              }
            }}
            placeholder="Example: I am home with no equipment and have 30 minutes"
            className="h-12 min-w-0 rounded-2xl border border-white/10 bg-black/40 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-300/40"
          />

          <button
            type="button"
            onClick={() => submitCoachMessage(coachDraft)}
            className="h-12 rounded-2xl border border-emerald-300/55 bg-emerald-300 text-lg font-black text-black"
            aria-label="Send to SYNC"
          >
            ↑
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {[
            "Build me a meal plan",
            "How is my protein?",
            "Am I on track?",
            "My legs are sore after yesterday",
            "Update my measurements",
            "I may train more than once today",
            "Home, no equipment",
            "I have 25 minutes",
          ].map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => submitCoachMessage(prompt)}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-black text-slate-300"
            >
              {prompt}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(145deg,rgba(16,22,18,0.97),rgba(4,7,5,0.98))] p-4">
        <div className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
          Daily Quick Log
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <QuickLogButton
            label="Workout"
            icon="workout"
            active
            onClick={() =>
              workout
                ? onStartWorkout?.(
                    workout
                  )
                : onOpen?.(
                    "plan-today"
                  )
            }
          />

          <QuickLogButton
            label="Nutrition"
            icon="nutrition"
            onClick={() =>
              onQuickLog?.("meal")
            }
          />

          <QuickLogButton
            label="Steps"
            icon="steps"
            onClick={() =>
              onQuickLog?.("steps")
            }
          />

          <QuickLogButton
            label="Sleep"
            icon="sleep"
            onClick={() =>
              onQuickLog?.("sleep")
            }
          />

          <QuickLogButton
            label="Weight"
            icon="weight"
            onClick={() =>
              onQuickLog?.("weight")
            }
          />

          <QuickLogButton
            label="Readiness"
            icon="readiness"
            onClick={() =>
              onQuickLog?.(
                "readiness"
              )
            }
          />
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[1.85rem] border border-emerald-300/20 bg-[radial-gradient(circle_at_90%_30%,rgba(0,245,106,0.11),transparent_30%),linear-gradient(145deg,#101713,#040705)] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.34)] sm:p-6">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
          Today's Workout
        </div>

        <div className="mt-2 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
          {workout?.workout_name ||
            "Build Today's Plan"}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div>
            <div className="text-3xl font-black text-white">
              {exerciseCount || "-"}
            </div>

            <div className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
              Exercises
            </div>
          </div>

          <div>
            <div className="text-3xl font-black text-white">
              {setCount || "-"}
            </div>

            <div className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
              Sets
            </div>
          </div>

          <div>
            <div className="text-3xl font-black text-white">
              {duration}
            </div>

            <div className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
              Min Est.
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            workout
              ? onStartWorkout?.(
                  workout
                )
              : onOpen?.(
                  "plan-today"
                )
          }
          className="health-workout-start-button mt-6 flex h-14 w-full items-center justify-center gap-3 rounded-2xl border text-base font-black uppercase tracking-[0.12em]"
        >
          {workout
            ? "Start Workout"
            : "Build Workout"}

          <Icon
            type="play"
            className="h-5 w-5"
          />
        </button>
      </section>

      <section className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(145deg,rgba(16,22,18,0.97),rgba(4,7,5,0.98))] p-5">
        <div className="grid gap-5 md:grid-cols-[180px_1fr] md:items-center">
          <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-full border-[10px] border-white/[0.06] bg-black/25 shadow-[inset_0_0_30px_rgba(0,0,0,0.65)]">
            <div className="flex h-28 w-28 items-center justify-center rounded-full border-[8px] border-emerald-400 text-3xl font-black text-white shadow-[0_0_24px_rgba(0,245,106,0.25)]">
              {readiness
                ? `${readiness}%`
                : "--"}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
              Readiness Check
            </div>

            <div className="mt-3 space-y-3">
              <div>
                <div className="flex justify-between text-xs font-black uppercase tracking-[0.1em] text-slate-300">
                  <span>Soreness</span>
                  <span>
                    {snapshot?.soreness ||
                      "Not logged"}
                  </span>
                </div>

                <div className="mt-2 h-1.5 rounded-full bg-white/[0.07]">
                  <div className="h-full w-[35%] rounded-full bg-emerald-400" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-black uppercase tracking-[0.1em] text-slate-300">
                  <span>Sleep</span>
                  <span>
                    {sleep
                      ? `${sleep}h`
                      : "Not logged"}
                  </span>
                </div>

                <div className="mt-2 h-1.5 rounded-full bg-white/[0.07]">
                  <div
                    className="h-full rounded-full bg-emerald-400"
                    style={{
                      width: `${Math.min(
                        100,
                        sleepGoal > 0
                          ? (sleep /
                              sleepGoal) *
                            100
                          : 0
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-black uppercase tracking-[0.1em] text-slate-300">
                  <span>Energy</span>
                  <span>
                    {snapshot?.energy ||
                      "Not logged"}
                  </span>
                </div>

                <div className="mt-2 h-1.5 rounded-full bg-white/[0.07]">
                  <div className="h-full w-[70%] rounded-full bg-emerald-400" />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                onQuickLog?.(
                  "readiness"
                )
              }
              className="mt-5 flex h-12 w-full items-center justify-between rounded-xl border border-white/10 bg-black/25 px-4 text-sm font-black text-white hover:border-emerald-300/35"
            >
              <span>Check In Now</span>
              <Icon
                type="arrow"
                className="h-4 w-4"
              />
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard
          eyebrow="Nutrition"
          value={`${proteinRemaining}g`}
          detail={`protein remaining of ${proteinGoal}g goal`}
          progress={
            proteinGoal > 0
              ? (protein /
                  proteinGoal) *
                100
              : 0
          }
          action="Log Meal"
          onClick={() =>
            onQuickLog?.("meal")
          }
        />

        <MetricCard
          eyebrow="Active Recovery"
          value={`${sleepGoal}h`}
          detail={
            sleep
              ? `Last night: ${sleep}h`
              : "Sleep has not been logged"
          }
          progress={
            sleepGoal > 0
              ? (sleep /
                  sleepGoal) *
                100
              : 0
          }
          action="Sleep Planner"
          onClick={() =>
            onOpen?.("sleep")
          }
        />

        <MetricCard
          eyebrow="Daily Movement"
          value={steps.toLocaleString()}
          detail={`of ${stepsGoal.toLocaleString()} step goal`}
          progress={
            stepsGoal > 0
              ? (steps /
                  stepsGoal) *
                100
              : 0
          }
          action="Log Steps"
          onClick={() =>
            onQuickLog?.("steps")
          }
          compact
        />

        <MetricCard
          eyebrow="Your Targets"
          value="Goals"
          detail="Update protein, sleep, steps, weight, and training targets."
          action="Edit Daily Goals"
          onClick={onEditDailyGoals}
          compact
        />
      </div>

      <section className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(145deg,rgba(16,22,18,0.97),rgba(4,7,5,0.98))] p-5">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
          Recommended Resources
        </div>

        <div className="mt-1 text-xs leading-5 text-slate-500">
          SYNC may earn a commission when you use these partner links. Recommendations should still match your goals and preferences.
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <a
            href="https://wewardapp.go.link/profile?adj_t=1rg2xpwh&userId=22865998"
            target="_blank"
            rel="noreferrer sponsored"
            className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] p-4"
          >
            <div className="text-sm font-black text-white">
              WeWard
            </div>

            <div className="mt-1 text-xs leading-5 text-slate-400">
              Optional step-tracking partner for users who want added walking motivation and rewards.
            </div>

            <div className="mt-3 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-300">
              View Partner App
            </div>
          </a>

          <a
            href="https://www.seeqsupply.com/JACOB78279"
            target="_blank"
            rel="noreferrer sponsored"
            className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] p-4"
          >
            <div className="text-sm font-black text-white">
              SEEQ Protein
            </div>

            <div className="mt-1 text-xs leading-5 text-slate-400">
              SYNC's current clear-protein partner for users looking for another way to reach daily protein targets.
            </div>

            <div className="mt-3 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-300">
              Shop Partner
            </div>
          </a>
        </div>
      </section>

      <HealthGoalProgressCard
        profile={profile}
        snapshot={snapshot}
        history={history}
        onOpen={onOpen}
      />

      <HealthDailyCoachStatusCard
        profile={profile}
        snapshot={snapshot}
        onQuickLog={onQuickLog}
        onOpen={onOpen}
      />

      <button
        type="button"
        onClick={onShowInsights}
        className="flex w-full items-center gap-4 rounded-[1.6rem] border border-emerald-300/18 bg-[linear-gradient(145deg,rgba(15,21,17,0.97),rgba(4,7,5,0.99))] p-5 text-left hover:border-emerald-300/35"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-emerald-300/35 bg-emerald-300/[0.08] text-sm font-black text-emerald-300">
          AI
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
            Trainer Insight
          </span>

          <span className="mt-1 block text-sm leading-6 text-slate-300">
            {insight}
          </span>
        </span>

        <Icon
          type="arrow"
          className="h-4 w-4 shrink-0 text-emerald-300"
        />
      </button>
    </div>
  );
}
