import {
  clearHealthActiveWorkout,
  getHealthActiveWorkout,
  getHealthWorkoutSessions,
  saveHealthActiveWorkout,
  saveHealthWorkoutSession,
} from "../../api/customerHealth";
import {
  annotateWorkoutDateLifecycle,
  shouldOfferPreviousWorkout,
} from "./healthWorkoutDateLifecycle";

let pendingTimer = null;
let lastPayload = "";
let inFlight = Promise.resolve();

function stableSerialize(value) {
  try {
    return JSON.stringify(value || {});
  } catch {
    return "";
  }
}

function plannerContext(plannerItem = {}, session = {}) {
  return {
    id: plannerItem?.id || session?.planner_item_id || "",
    workout_id: plannerItem?.workout_id || session?.workout_id || "",
    ymd: plannerItem?.ymd || session?.scheduled_ymd || session?.ymd || "",
  };
}

export function loadCloudWorkoutHistory() {
  return getHealthWorkoutSessions();
}

export async function loadCloudActiveWorkout() {
  const result = await getHealthActiveWorkout();
  return result?.active_workout || null;
}

export function queueCloudActiveWorkoutSave(
  session,
  plannerItem,
  { delay = 2200 } = {}
) {
  if (!session || session.status !== "active") return;

  const datedSession = annotateWorkoutDateLifecycle(
    {
      ...session,
      last_activity_at: new Date().toISOString(),
    },
    plannerContext(plannerItem, session)
  );
  const payload = {
    session: datedSession,
    plannerItemId:
      plannerItem?.id || session?.planner_item_id || "",
    workoutId:
      plannerItem?.workout_id || session?.workout_id || "",
  };
  const serialized = stableSerialize(payload);

  if (!serialized || serialized === lastPayload) return;
  lastPayload = serialized;

  if (pendingTimer) {
    window.clearTimeout(pendingTimer);
  }

  pendingTimer = window.setTimeout(() => {
    pendingTimer = null;
    inFlight = inFlight
      .catch(() => undefined)
      .then(() => saveHealthActiveWorkout(payload))
      .catch((error) => {
        console.warn("Health active workout cloud save failed.", error);
        lastPayload = "";
      });
  }, delay);
}

export function flushCloudActiveWorkoutSave(session, plannerItem) {
  if (!session || session.status !== "active") {
    return Promise.resolve(null);
  }

  if (pendingTimer) {
    window.clearTimeout(pendingTimer);
    pendingTimer = null;
  }

  const datedSession = annotateWorkoutDateLifecycle(
    {
      ...session,
      last_activity_at: new Date().toISOString(),
    },
    plannerContext(plannerItem, session)
  );
  const payload = {
    session: datedSession,
    plannerItemId:
      plannerItem?.id || session?.planner_item_id || "",
    workoutId:
      plannerItem?.workout_id || session?.workout_id || "",
  };
  lastPayload = stableSerialize(payload);

  inFlight = inFlight
    .catch(() => undefined)
    .then(() => saveHealthActiveWorkout(payload));

  return inFlight;
}

export async function saveCompletedWorkoutToCloud(session) {
  if (!session) return null;

  const datedSession = annotateWorkoutDateLifecycle(session, {
    id: session?.planner_item_id,
    workout_id: session?.workout_id,
    ymd: session?.scheduled_ymd || session?.ymd,
  });
  const result = await saveHealthWorkoutSession(datedSession);
  lastPayload = "";
  return result;
}

export async function archiveExpiredCloudWorkout(activeWorkout) {
  const lifecycle = shouldOfferPreviousWorkout(activeWorkout);
  if (!lifecycle.expired || !lifecycle.session) return null;

  const archivedAt = new Date().toISOString();
  const partialSession = {
    ...lifecycle.session,
    status: "partial",
    lifecycle_status: "Expired Partial",
    partial: true,
    expired_from_active: true,
    archived_at: archivedAt,
    finished_at: lifecycle.session.finished_at || archivedAt,
    completed_late: false,
  };

  await saveHealthWorkoutSession(partialSession);
  await clearHealthActiveWorkout();
  lastPayload = "";
  return partialSession;
}

export async function clearCloudActiveWorkout() {
  if (pendingTimer) {
    window.clearTimeout(pendingTimer);
    pendingTimer = null;
  }

  lastPayload = "";
  return clearHealthActiveWorkout();
}

export function cloudWorkoutMatchesPlanner(active, plannerItem) {
  if (!active?.session || !plannerItem) return false;

  const plannerId = String(plannerItem.id || "");
  const workoutId = String(plannerItem.workout_id || plannerItem.id || "");

  return Boolean(
    (plannerId && String(active.planner_item_id || active.session.planner_item_id || "") === plannerId) ||
      (workoutId && String(active.workout_id || active.session.workout_id || "") === workoutId)
  );
}
