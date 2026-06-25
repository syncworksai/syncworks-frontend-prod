// src/components/customer-health/healthCoachIntelligence.js

const DAY_MS = 24 * 60 * 60 * 1000;

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function getSessionDate(session) {
  const raw =
    session?.completed_at ||
    session?.finished_at ||
    session?.updated_at ||
    session?.created_at ||
    session?.date ||
    session?.ymd;

  const value = raw ? new Date(raw).getTime() : NaN;
  return Number.isFinite(value) ? value : 0;
}

function getSetLogs(exercise) {
  return Array.isArray(exercise?.set_logs)
    ? exercise.set_logs
    : Array.isArray(exercise?.sets)
    ? exercise.sets
    : [];
}

function classifyExercise(exercise = {}) {
  const text = [
    exercise.name,
    exercise.substitute_name,
    exercise.group,
    exercise.movement_pattern,
    exercise.trains,
    ...(exercise.primary_muscles || []),
    ...(exercise.secondary_muscles || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    /bench|press|push[- ]?up|chest|fly|triceps|shoulder press|overhead press|lateral raise/.test(
      text
    )
  ) {
    return "push";
  }

  if (
    /row|pulldown|pull[- ]?up|chin[- ]?up|lat|back|biceps|rear delt|face pull/.test(
      text
    )
  ) {
    return "pull";
  }

  if (
    /squat|leg press|deadlift|romanian|hamstring|quad|glute|calf|lunge|hip thrust|leg curl|leg extension/.test(
      text
    )
  ) {
    return "legs";
  }

  if (/plank|core|ab|crunch|rotation|carry|dead bug/.test(text)) {
    return "core";
  }

  return "other";
}

function isWorkingSet(set = {}) {
  return normalizeText(set.set_type || "working") !== "warmup";
}

function collectRecentSessions(history = [], days = 7) {
  const cutoff = Date.now() - Math.max(1, days) * DAY_MS;

  return (Array.isArray(history) ? history : [])
    .filter(Boolean)
    .filter((session) => {
      const timestamp = getSessionDate(session);
      return timestamp ? timestamp >= cutoff : false;
    })
    .sort((a, b) => getSessionDate(b) - getSessionDate(a));
}

function buildRecoveryStatus({
  painFlags,
  poorFormFlags,
  averageRpe,
  extraSets,
  workingSets,
}) {
  const extraRatio =
    workingSets > 0 ? extraSets / workingSets : extraSets > 0 ? 1 : 0;

  if (painFlags >= 2 || poorFormFlags >= 3 || averageRpe >= 9.2) {
    return {
      level: "Recovery",
      tone: "rose",
      title: "Recovery should lead the next decision",
      message:
        "Pain, form breakdown, or very high effort is elevated. Reduce load, shorten the session, and prioritize pain-free movement.",
    };
  }

  if (
    painFlags > 0 ||
    poorFormFlags > 0 ||
    averageRpe >= 8.5 ||
    extraRatio >= 0.35
  ) {
    return {
      level: "Caution",
      tone: "amber",
      title: "Train, but control the dose",
      message:
        "Recent effort or extra volume is elevated. Keep quality high and avoid adding unnecessary failure work.",
    };
  }

  return {
    level: "Ready",
    tone: "emerald",
    title: "Recovery signals look manageable",
    message:
      "Your recent training data supports another productive session with normal warm-up and readiness checks.",
  };
}

function recommendNextFocus(balance, recovery) {
  if (recovery.level === "Recovery") {
    return {
      focus: "Recovery and mobility",
      reason:
        "Pain, poor form, or very high RPE is the dominant signal from recent sessions.",
    };
  }

  const tracked = ["push", "pull", "legs", "core"];
  const lowest = [...tracked].sort(
    (a, b) => safeNumber(balance[a]) - safeNumber(balance[b])
  )[0];

  const labels = {
    push: "Push",
    pull: "Pull",
    legs: "Legs",
    core: "Core",
  };

  return {
    focus: labels[lowest] || "Balanced full body",
    reason: `${labels[lowest] || "This area"} has the lowest working-set exposure over the last seven days.`,
  };
}

export function buildCoachIntelligence({
  history = [],
  days = 7,
} = {}) {
  const sessions = collectRecentSessions(history, days);

  const summary = {
    days,
    sessions: sessions.length,
    working_sets: 0,
    extra_sets: 0,
    warmup_sets: 0,
    average_rpe: 0,
    pain_flags: 0,
    poor_form_flags: 0,
    failure_sets: 0,
    swaps: 0,
    added_exercises: 0,
    total_seconds: 0,
    active_seconds: 0,
    rest_seconds: 0,
    idle_seconds: 0,
    balance: {
      push: 0,
      pull: 0,
      legs: 0,
      core: 0,
      other: 0,
    },
  };

  const rpeValues = [];

  sessions.forEach((session) => {
    summary.total_seconds += safeNumber(session.total_seconds);
    summary.active_seconds += safeNumber(session.active_seconds);
    summary.rest_seconds += safeNumber(session.rest_seconds);
    summary.idle_seconds += safeNumber(session.idle_seconds);
    summary.swaps += safeNumber(
      session.swap_count ??
        session.adaptation_summary?.swaps ??
        session.adaptation_metrics?.swaps
    );
    summary.added_exercises += safeNumber(
      session.added_exercises_count ??
        session.adaptation_summary?.added_exercises ??
        session.adaptation_metrics?.added_exercises
    );

    const exercises = Array.isArray(session.exercises)
      ? session.exercises
      : [];

    exercises.forEach((exercise) => {
      const bucket = classifyExercise(exercise);
      const logs = getSetLogs(exercise);
      const plannedSets = safeNumber(exercise.planned_sets);
      const workingLogs = logs.filter(isWorkingSet);

      summary.balance[bucket] += workingLogs.length;
      summary.working_sets += workingLogs.length;
      summary.warmup_sets += logs.length - workingLogs.length;
      summary.extra_sets += Math.max(0, workingLogs.length - plannedSets);

      if (exercise.substituted || exercise.substitute_name) {
        summary.swaps += 1;
      }

      if (
        exercise.added_by_user ||
        exercise.added_during_workout ||
        exercise.adaptation_type
      ) {
        summary.added_exercises += 1;
      }

      logs.forEach((set) => {
        const rpe = safeNumber(set.rpe || set.ease_score, NaN);
        if (Number.isFinite(rpe) && rpe > 0) rpeValues.push(rpe);

        const pain = safeNumber(set.pain_score);
        if (pain >= 3) summary.pain_flags += 1;

        if (normalizeText(set.form_quality) === "poor") {
          summary.poor_form_flags += 1;
        }

        if (set.reached_failure) summary.failure_sets += 1;
      });

      if (safeNumber(exercise.pain_score) >= 3) {
        summary.pain_flags += 1;
      }
    });

    if (safeNumber(session.pain_score) >= 3) {
      summary.pain_flags += 1;
    }
  });

  summary.average_rpe = rpeValues.length
    ? Number(
        (
          rpeValues.reduce((total, value) => total + value, 0) /
          rpeValues.length
        ).toFixed(1)
      )
    : 0;

  summary.recovery = buildRecoveryStatus({
    painFlags: summary.pain_flags,
    poorFormFlags: summary.poor_form_flags,
    averageRpe: summary.average_rpe,
    extraSets: summary.extra_sets,
    workingSets: summary.working_sets,
  });

  summary.next_focus = recommendNextFocus(
    summary.balance,
    summary.recovery
  );

  return summary;
}

export function buildCoachIntelligenceSpeech(summary = {}) {
  const balance = summary.balance || {};
  const recovery = summary.recovery || {};
  const nextFocus = summary.next_focus || {};

  const parts = [
    `Coach intelligence for the last ${summary.days || 7} days.`,
    `${summary.sessions || 0} workouts and ${
      summary.working_sets || 0
    } working sets were logged.`,
    `Training balance is ${balance.push || 0} push sets, ${
      balance.pull || 0
    } pull sets, ${balance.legs || 0} leg sets, and ${
      balance.core || 0
    } core sets.`,
  ];

  if (summary.average_rpe) {
    parts.push(`Average R P E was ${summary.average_rpe}.`);
  }

  if (summary.extra_sets) {
    parts.push(
      `${summary.extra_sets} sets were completed beyond the original plan.`
    );
  }

  if (summary.pain_flags) {
    parts.push(
      `${summary.pain_flags} pain flags require attention before increasing load.`
    );
  }

  parts.push(recovery.message || "");
  parts.push(
    `My next recommendation is ${nextFocus.focus || "balanced training"}. ${
      nextFocus.reason || ""
    }`
  );

  return parts.filter(Boolean).join(" ");
}
