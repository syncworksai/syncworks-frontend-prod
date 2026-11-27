// src/components/customer-health/healthTrainingConnectivity.js

function safeNumber(value, fallback = 0) {
  const parsed = Number(
    String(value ?? "").replace(/[^\d.-]/g, "")
  );

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function exerciseName(exercise = {}) {
  return String(
    exercise.substitute_name ||
      exercise.name ||
      exercise.exercise_name ||
      ""
  )
    .trim()
    .toLowerCase();
}

function exerciseMuscleText(exercise = {}) {
  return [
    exerciseName(exercise),
    exercise.category,
    exercise.movement_pattern,
    ...(Array.isArray(exercise.primary_muscles)
      ? exercise.primary_muscles
      : []),
    ...(Array.isArray(exercise.secondary_muscles)
      ? exercise.secondary_muscles
      : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function classifyExerciseFocus(exercise = {}) {
  const text = exerciseMuscleText(exercise);

  if (
    /plank|crunch|sit up|sit-up|abdom|core|oblique|rotation|pallof|dead bug|bird dog/.test(
      text
    )
  ) {
    return "Core";
  }

  if (
    /squat|lunge|deadlift|leg press|leg extension|leg curl|hamstring|quadricep|quad|glute|calf|hip thrust|lower body|walking lunge/.test(
      text
    )
  ) {
    return "Legs";
  }

  if (
    /row|pulldown|pull down|pull-up|pull up|chin-up|chin up|lat|rear delt|face pull|back|biceps|bicep|curl/.test(
      text
    )
  ) {
    return "Pull";
  }

  if (
    /bench|press|push-up|push up|chest|triceps|tricep|fly|shoulder press|overhead press|lateral raise|front raise/.test(
      text
    )
  ) {
    return "Push";
  }

  return "Other";
}

export function workingSetLogs(exercise = {}) {
  const logs = Array.isArray(exercise.set_logs)
    ? exercise.set_logs
    : [];

  return logs.filter(
    (setLog) =>
      String(setLog?.set_type || "working").toLowerCase() !==
      "warmup"
  );
}

export function countWorkingSets(session = {}) {
  const exercises = Array.isArray(session.exercises)
    ? session.exercises
    : Array.isArray(session?.session?.exercises)
    ? session.session.exercises
    : [];

  return exercises.reduce(
    (total, exercise) =>
      total + workingSetLogs(exercise).length,
    0
  );
}

export function buildFocusBalance(session = {}) {
  const exercises = Array.isArray(session.exercises)
    ? session.exercises
    : Array.isArray(session?.session?.exercises)
    ? session.session.exercises
    : [];

  const result = {
    Push: 0,
    Pull: 0,
    Legs: 0,
    Core: 0,
  };

  exercises.forEach((exercise) => {
    const focus = classifyExerciseFocus(exercise);

    if (!(focus in result)) {
      return;
    }

    result[focus] += workingSetLogs(exercise).length;
  });

  return result;
}

export function buildLiveTrainingSummary(session = {}) {
  return {
    id: session.id || "",
    session_id: session.id || "",
    workout_name:
      session.workout_name ||
      session.name ||
      "Active Workout",
    status: session.status || "active",
    started_at:
      session.started_at ||
      new Date().toISOString(),
    updated_at:
      new Date().toISOString(),
    ymd:
      session.ymd ||
      new Date().toISOString().slice(0, 10),
    completed_sets:
      countWorkingSets(session),
    active_seconds:
      Number(session.active_seconds || 0),
    total_seconds:
      Number(session.total_seconds || 0),
    focus_balance:
      buildFocusBalance(session),
    exercises:
      Array.isArray(session.exercises)
        ? session.exercises
        : [],
    source:
      "active_workout_live_connectivity",
  };
}

export function mergeLiveTrainingWithHistory(
  history,
  liveSession
) {
  const rows = Array.isArray(history)
    ? [...history]
    : [];

  if (
    !liveSession ||
    typeof liveSession !== "object" ||
    !liveSession.session_id
  ) {
    return rows;
  }

  const alreadySaved = rows.some(
    (item) =>
      String(
        item?.id ||
          item?.session_id ||
          item?.session?.id ||
          ""
      ) === String(liveSession.session_id)
  );

  return alreadySaved
    ? rows
    : [liveSession, ...rows];
}

// Compare like-for-like working sets from the latest completed session.
function numeric(value) {
  if (value == null || !String(value).trim() || !/^\d+(\.\d+)?$/.test(String(value).trim())) return null;
  return Number(value);
}
function exactName(e) {
  return String(e?.substituted && e?.substitute_name ? e.substitute_name : e?.name || e?.exercise_name || "").trim().toLowerCase().replace(/\s+/g," ");
}
function actual(log, key) { return log?.["actual_"+key] ?? log?.[key]; }
function isWorking(log) { return String(log?.set_type || "working").toLowerCase() === "working"; }
function unitOf(log, exercise, session) { const u=String(log?.weight_unit || exercise?.weight_unit || session?.weight_unit || "").toLowerCase(); return u==="lbs"?"lb":u; }
export function compareCompletedWorkingSet({exercise,savedSet,history,session}) {
  const name=exactName(exercise);
  const ordinal=(exercise?.set_logs || []).filter(isWorking).length+1;
  if (!name || !isWorking(savedSet)) return {text:"", comparable:false};
  const rows=(Array.isArray(history)?history:[]).filter(h=> (h?.status==="completed" || h?.completed_at) && String(h?.id || h?.session_id || "")!==String(session?.id || "")).sort((a,b)=>String(b.completed_at || b.updated_at || "").localeCompare(String(a.completed_at || a.updated_at || "")));
  for(const h of rows) {
    const e=(h.exercises || []).find(x=>exactName(x)===name);
    if(!e) continue;
    const logs=(e.set_logs || []).filter(isWorking);
    if(!logs.length) continue;
    const prior=logs[ordinal-1];
    if(!prior) return {text:"No matching set number from your last session.",comparable:false};
    const w=numeric(actual(savedSet,"weight")), pw=numeric(actual(prior,"weight")), reps=numeric(actual(savedSet,"reps")), pr=numeric(actual(prior,"reps"));
    const u=unitOf(savedSet,exercise,session), pu=unitOf(prior,e,h);
    if(w===null || pw===null || reps===null || pr===null || u!==pu) return {text:"Last session is recorded, but these sets aren't directly comparable.",comparable:false};
    if(!u && w!==pw) return {text:"Weight units are not verified, so I won't compare the loads.",comparable:false};
    const text=w===pw ? (reps===pr?"You matched the same set last time.":(reps>pr?"That's "+(reps-pr)+" more reps":"That's "+(pr-reps)+" fewer reps")+" at the same recorded load.") : "Last time this set was "+pr+" reps at "+pw+" "+u+".";
    return {text,comparable:true};
  }
  return {text:"This is your starting baseline for this exercise.",comparable:false};
}
export function buildImmediateSetCoachMessage({exercise,savedSet,suggestion,restSeconds=0,exerciseFinished=false,nextExerciseName="",history,session,timed=false}) {
  const reps=numeric(actual(savedSet,"reps")), weight=numeric(actual(savedSet,"weight"));
  const effort=numeric(savedSet?.rpe), pain=numeric(savedSet?.pain_score);
  const form=String(savedSet?.form_quality||"").toLowerCase();
  if(pain!==null && pain>0) return "Set recorded. Stop that movement for now and assess the pain before continuing.";
  if(timed || !isWorking(savedSet)) return "Movement recorded. Recover comfortably before continuing.";
  const comparison=compareCompletedWorkingSet({exercise,savedSet,history,session});
  const rest=restSeconds>0?" Rest for "+restSeconds+" seconds.":"";
  if(exerciseFinished) return "Set recorded. "+comparison.text+(nextExerciseName?" Next is "+nextExerciseName+".":" Exercise complete.")+rest;
  const clean=["good","great","clean","excellent"].includes(form);
  let direction="Keep the current target until we confirm effort, form and recovery.";
  if(savedSet?.reached_failure || (effort!==null && effort>=9) || form==="poor") direction="That was demanding. Hold or reduce the load for the next set.";
  else if(clean && pain===0 && effort!==null && effort>=1 && effort<=6 && reps!==null && weight!==null) direction="Nice controlled set. If you're recovered, consider a small increase, or repeat the same load for "+reps+" clean reps.";
  else if(clean && pain===0 && effort!==null && effort>6 && effort<9 && reps!==null) direction="Stay at the same load and aim for "+reps+" controlled reps.";
  return ["Set recorded.",comparison.text,direction,rest].filter(Boolean).join(" ");
}
