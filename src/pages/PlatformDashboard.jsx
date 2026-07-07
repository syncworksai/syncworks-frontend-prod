import React, { useEffect, useMemo, useState } from "react";
import ModeBar from "../components/ModeBar";
import api from "../api/client";

import PlatformTabs from "../components/platform/PlatformTabs";
import PlatformOverviewTab from "../components/platform/PlatformOverviewTab";
import PlatformGrowthEngineTab from "../components/platform/PlatformGrowthEngineTab";
import UsersManager from "../components/platform/UsersManager";
import BusinessesManager from "../components/platform/BusinessesManager";
import BillingManager from "../components/platform/BillingManager";
import BroadcastsManager from "../components/platform/BroadcastsManager";
import NewsReelManager from "../components/platform/NewsReelManager";
import SupportRequestsManager from "../components/platform/SupportRequestsManager";
import AdsOrdersManager from "../components/platform/AdsOrdersManager";
import GodModeAffiliates from "./platform/GodModeAffiliates";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "growth_os", label: "Growth OS" },
  { id: "users", label: "Users" },
  { id: "businesses", label: "Businesses" },
  { id: "billing", label: "Billing" },
  { id: "requests", label: "Requests" },
  { id: "ads", label: "Ads Orders" },
  { id: "news", label: "News Reel" },
  { id: "broadcasts", label: "Broadcasts" },
  { id: "affiliates", label: "Affiliates" },
  { id: "health_launch_lock", label: "Health Launch Lock" },
  { id: "health_smoke_test", label: "Health Smoke Test" },
  { id: "developer_agent", label: "Developer Agent" },
];

const STORAGE_KEY = "syncworks_developer_agent_demo_state_v1";
const PROJECTS = ["SyncWorks Frontend", "SyncWorks Backend", "Developer Agent"];
const MODULES = [
  "Authentication & Sessions",
  "Personal Dashboard",
  "Business Dashboard",
  "Business Settings",
  "Marketplace & Tickets",
  "Inbox & Notifications",
  "Calendar",
  "Finance",
  "Health",
  "Growth/Social Media",
  "Property Management",
  "Employees & Roles",
  "Billing & Payments",
  "God Mode",
  "Backend APIs",
  "Database Migrations",
  "Mobile UX",
  "Encoding",
  "Build & Bundle",
  "Deployment Health",
];
const MODULE_STATUSES = ["NOT_STARTED", "RUNNING", "PASSED", "FINDINGS", "BLOCKED", "DEFERRED"];
const FINDING_STATUSES = ["OPEN", "RESOLVED", "ACCEPTED_RISK", "DEFERRED"];
const TASK_CATALOG = [
  "Validate auth session refresh flow",
  "Check dashboard loading and hydration",
  "Review business settings persistence",
  "Inspect marketplace ticket state transitions",
  "Audit inbox notification delivery",
  "Verify calendar scheduling edge cases",
  "Review finance calculations and rounding",
  "Confirm health and monitoring indicators",
  "Check growth/social publishing flow",
  "Validate billing and payment lock states",
];

const DEVELOPER_AGENT_TASK_LABELS = {
  "business-growth-backend-persistence-001": "Business Growth backend persistence",
  "god-mode-developer-agent-panel-001": "God Mode Developer Agent panel",
  "business-setup-ui-001": "Business setup UI",
  "developer-agent-smoke-test-001": "Developer Agent smoke test",
  "agent-control-center-foundation-001": "Agent Control Center foundation",
  "agent-control-center-foundation-002": "Agent Control Center foundation v2",
};

function getDeveloperAgentError(error, fallback) {
  return error?.response?.data?.detail || error?.message || fallback;
}

function makeInitialModules() {
  return MODULES.reduce((acc, module) => {
    acc[module] = { status: "NOT_STARTED", reason: "" };
    return acc;
  }, {});
}

function makeInitialState() {
  return {
    project: "SyncWorks Frontend",
    modules: makeInitialModules(),
    findings: [],
    queue: [],
    completedCount: 0,
    queueCompletedCount: 0,
  };
}

function loadState() {
  if (typeof window === "undefined") return makeInitialState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return makeInitialState();
    const parsed = JSON.parse(raw);
    return {
      ...makeInitialState(),
      ...parsed,
      modules: {
        ...makeInitialModules(),
        ...(parsed?.modules || {}),
      },
      findings: Array.isArray(parsed?.findings) ? parsed.findings : [],
      queue: Array.isArray(parsed?.queue) ? parsed.queue : [],
    };
  } catch {
    return makeInitialState();
  }
}


const HEALTH_LAUNCH_LOCK_STORAGE_KEY =
  "syncworks_health_launch_lock_v1";

const HEALTH_LAUNCH_LOCK_ITEMS = [
  {
    id: "render_backend_deployed",
    group: "Deploy",
    title: "Render backend deployed",
    detail: "Backend main branch deployed successfully after E18/E20.",
  },
  {
    id: "vercel_frontend_deployed",
    group: "Deploy",
    title: "Vercel frontend deployed",
    detail: "Frontend main branch deployed successfully after E19/E20/E21.",
  },
  {
    id: "production_migration_applied",
    group: "Deploy",
    title: "Production Health migration applied",
    detail: "customer_health.0002 migration exists in production database.",
  },
  {
    id: "health_feedback_submit",
    group: "Feedback",
    title: "Health beta feedback submits",
    detail: "Health Dashboard Ã¢â€ â€™ Beta Feedback saves to backend and local queue.",
  },
  {
    id: "god_mode_feedback_loads",
    group: "Feedback",
    title: "God Mode feedback inbox loads",
    detail: "God Mode Ã¢â€ â€™ Health Feedback shows submitted tester reports.",
  },
  {
    id: "god_mode_status_actions",
    group: "Feedback",
    title: "Feedback status actions work",
    detail: "Mark open, reviewed, and closed all update correctly.",
  },
  {
    id: "mobile_health_nav",
    group: "Mobile",
    title: "Mobile Health navigation verified",
    detail: "Health, Plan, SYNC, Progress, and Log actions work on phone width.",
  },
  {
    id: "active_workout_flow",
    group: "Workout",
    title: "Active workout flow verified",
    detail: "Start workout, active timer, set logging, rest timer, and finish flow work.",
  },
  {
    id: "workout_memory",
    group: "Workout",
    title: "Workout memory verified",
    detail: "Last workout data and next-session recommendations display correctly.",
  },
  {
    id: "nutrition_ai_manual",
    group: "AI",
    title: "Nutrition manual and AI flow verified",
    detail: "Manual logging works free; AI estimate flow gates and saves correctly.",
  },
  {
    id: "sync_chat",
    group: "AI",
    title: "SYNC coach chat verified",
    detail: "SYNC answers with profile/history context and handles upgrade states.",
  },
  {
    id: "voice_controls",
    group: "AI",
    title: "Voice controls verified",
    detail: "Audio toggle, voice options, and speech fallback do not block workouts.",
  },
  {
    id: "auth_session_mobile",
    group: "Auth",
    title: "Mobile session stability checked",
    detail: "Switch apps / inactive browser does not immediately kick user to login.",
  },
  {
    id: "console_build_clean",
    group: "QA",
    title: "Build and console smoke checked",
    detail: "npm run build passes; no Health launch-blocking runtime errors found.",
  },
  {
    id: "beta_tester_signoff",
    group: "QA",
    title: "Beta tester signoff captured",
    detail: "At least one real tester completes workout + feedback loop.",
  },
  {
    id: "rollback_ready",
    group: "Launch",
    title: "Rollback plan ready",
    detail: "Last stable backend and frontend commits are known before launch.",
  },
];

function makeInitialHealthLaunchLockState() {
  return HEALTH_LAUNCH_LOCK_ITEMS.reduce((acc, item) => {
    acc[item.id] = {
      status: "PENDING",
      note: "",
      updatedAt: "",
    };
    return acc;
  }, {});
}

function loadHealthLaunchLockState() {
  if (typeof window === "undefined") {
    return makeInitialHealthLaunchLockState();
  }

  try {
    const raw = window.localStorage.getItem(
      HEALTH_LAUNCH_LOCK_STORAGE_KEY
    );

    if (!raw) {
      return makeInitialHealthLaunchLockState();
    }

    const parsed = JSON.parse(raw);

    return {
      ...makeInitialHealthLaunchLockState(),
      ...(parsed || {}),
    };
  } catch {
    return makeInitialHealthLaunchLockState();
  }
}

function getLaunchStatusClass(status) {
  if (status === "PASSED") {
    return "border-emerald-300/30 bg-emerald-300/10 text-emerald-100";
  }

  if (status === "BLOCKED") {
    return "border-rose-300/30 bg-rose-300/10 text-rose-100";
  }

  if (status === "WAIVED") {
    return "border-amber-300/30 bg-amber-300/10 text-amber-100";
  }

  return "border-slate-700 bg-slate-900 text-slate-300";
}

function HealthLaunchLockPanel() {
  const [state, setState] = useState(() => loadHealthLaunchLockState());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(
      HEALTH_LAUNCH_LOCK_STORAGE_KEY,
      JSON.stringify(state)
    );
  }, [state]);

  const counts = useMemo(() => {
    return HEALTH_LAUNCH_LOCK_ITEMS.reduce(
      (acc, item) => {
        const status = state[item.id]?.status || "PENDING";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      { PASSED: 0, BLOCKED: 0, WAIVED: 0, PENDING: 0 }
    );
  }, [state]);

  const launchReady =
    counts.BLOCKED === 0 &&
    counts.PENDING === 0 &&
    HEALTH_LAUNCH_LOCK_ITEMS.length > 0;

  const completionPercent = Math.round(
    ((counts.PASSED + counts.WAIVED) /
      HEALTH_LAUNCH_LOCK_ITEMS.length) *
      100
  );

  const groups = useMemo(() => {
    return HEALTH_LAUNCH_LOCK_ITEMS.reduce((acc, item) => {
      if (!acc[item.group]) acc[item.group] = [];
      acc[item.group].push(item);
      return acc;
    }, {});
  }, []);

  function updateItem(itemId, patch) {
    setState((current) => ({
      ...current,
      [itemId]: {
        ...(current[itemId] || {}),
        ...patch,
        updatedAt: new Date().toISOString(),
      },
    }));
  }

  function resetLaunchLock() {
    setState(makeInitialHealthLaunchLockState());
    setCopied(false);
  }

  async function copyLaunchReport() {
    const report = {
      module: "SyncWorks Health",
      launch_ready: launchReady,
      completion_percent: completionPercent,
      counts,
      generated_at: new Date().toISOString(),
      items: HEALTH_LAUNCH_LOCK_ITEMS.map((item) => ({
        ...item,
        ...(state[item.id] || {}),
      })),
    };

    try {
      await navigator.clipboard.writeText(
        JSON.stringify(report, null, 2)
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-cyan-400/20 bg-slate-950/80 p-5">
        <div className="pointer-events-none absolute -right-16 -top-20 h-60 w-60 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-60 w-60 rounded-full bg-fuchsia-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">
              SyncWorks Health
            </div>
            <h2 className="mt-1 text-2xl font-black text-white">
              Production Launch Lock Checklist
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Final God Mode signoff board for Health before calling the beta complete and moving the module toward production-ready.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyLaunchReport}
              className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/20"
            >
              {copied ? "Copied" : "Copy Launch Report"}
            </button>

            <button
              type="button"
              onClick={resetLaunchLock}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-black text-slate-200 transition hover:bg-slate-800"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="relative mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <Stat
            label="Launch Lock"
            value={launchReady ? "READY" : "NOT READY"}
          />
          <Stat label="Complete" value={`${completionPercent}%`} />
          <Stat label="Passed" value={String(counts.PASSED || 0)} />
          <Stat label="Waived" value={String(counts.WAIVED || 0)} />
          <Stat label="Pending" value={String(counts.PENDING || 0)} />
          <Stat label="Blocked" value={String(counts.BLOCKED || 0)} />
        </div>

        <div
          className={`relative mt-4 rounded-2xl border p-4 text-sm font-bold leading-6 ${
            launchReady
              ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
              : "border-amber-300/30 bg-amber-300/10 text-amber-100"
          }`}
        >
          {launchReady
            ? "Health launch lock is clear. Beta can be considered complete after live tester confirmation."
            : "Health is not production-locked yet. Clear every pending or blocked item before final signoff."}
        </div>
      </div>

      {Object.entries(groups).map(([groupName, items]) => (
        <div
          key={groupName}
          className="rounded-2xl border border-slate-800 bg-slate-950/75 p-4"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-cyan-100">
                {groupName}
              </h3>
              <p className="text-sm text-slate-500">
                Mark each item only after testing the live production path.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            {items.map((item) => {
              const itemState = state[item.id] || {};
              const status = itemState.status || "PENDING";

              return (
                <article
                  key={item.id}
                  className="rounded-2xl border border-slate-800 bg-black/20 p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2 py-1 text-[11px] font-black ${getLaunchStatusClass(status)}`}
                        >
                          {status}
                        </span>
                        <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                          {item.group}
                        </span>
                      </div>

                      <h4 className="mt-3 text-base font-black text-white">
                        {item.title}
                      </h4>
                      <p className="mt-1 text-sm leading-6 text-slate-400">
                        {item.detail}
                      </p>

                      <textarea
                        value={itemState.note || ""}
                        onChange={(event) =>
                          updateItem(item.id, {
                            note: event.target.value,
                          })
                        }
                        placeholder="Optional signoff note, blocker reason, tester name, or deploy detail..."
                        rows={2}
                        className="mt-3 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-300/40"
                      />

                      {itemState.updatedAt ? (
                        <div className="mt-2 text-xs text-slate-500">
                          Updated {new Date(itemState.updatedAt).toLocaleString()}
                        </div>
                      ) : null}
                    </div>

                    <div className="grid min-w-[220px] gap-2">
                      {["PASSED", "BLOCKED", "WAIVED", "PENDING"].map(
                        (statusOption) => (
                          <button
                            key={statusOption}
                            type="button"
                            onClick={() =>
                              updateItem(item.id, {
                                status: statusOption,
                              })
                            }
                            className={`rounded-xl border px-3 py-2 text-xs font-black transition ${getLaunchStatusClass(
                              statusOption
                            )} ${
                              status === statusOption
                                ? "ring-2 ring-cyan-300/30"
                                : "hover:border-cyan-300/40"
                            }`}
                          >
                            Mark {statusOption.toLowerCase()}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}



const HEALTH_SMOKE_TEST_STORAGE_KEY =
  "syncworks_health_smoke_test_v1";

const HEALTH_SMOKE_TESTS = [
  {
    id: "homepage_loads",
    group: "Load",
    title: "Health dashboard loads cleanly",
    steps: "Open Health Dashboard on production. Hard refresh. Confirm no blank page, loading loop, or crash fallback.",
    expected: "Dashboard loads in a usable state with main cards visible.",
  },
  {
    id: "mobile_layout_scan",
    group: "Mobile UI",
    title: "Mobile layout scan",
    steps: "Open on phone width. Scroll top to bottom. Look for clipped cards, horizontal overflow, cramped text, or hidden buttons.",
    expected: "No broken spacing. Buttons are thumb-friendly and text is readable.",
  },
  {
    id: "fonts_buttons_visual",
    group: "Mobile UI",
    title: "Fonts, buttons, and premium feel",
    steps: "Review Health Dashboard, active workout, SYNC, Log, and God Mode Health screens.",
    expected: "Fonts feel consistent, buttons are obvious, labels are not too tiny, and styling feels premium.",
  },
  {
    id: "bottom_nav",
    group: "Mobile UI",
    title: "Bottom Health nav works",
    steps: "Tap Health, Plan, SYNC, Progress, and Log from the mobile bottom nav.",
    expected: "Each tap opens the expected view without overlap or dead buttons.",
  },
  {
    id: "sync_button",
    group: "Mobile UI",
    title: "Center SYNC button works",
    steps: "Tap the center SYNC/S button from Health.",
    expected: "SYNC chat opens and is usable on mobile.",
  },
  {
    id: "feedback_submit",
    group: "Feedback",
    title: "Submit beta feedback",
    steps: "Health Dashboard → Beta Feedback. Submit a low-severity test message.",
    expected: "Shows sent to backend and saved locally. No local-only error unless backend deploy/migration is missing.",
  },
  {
    id: "feedback_inbox",
    group: "Feedback",
    title: "God Mode feedback inbox receives report",
    steps: "God Mode → Health Feedback. Refresh after submitting feedback.",
    expected: "The report appears with area, severity, status, user, runtime, and page path.",
  },
  {
    id: "feedback_actions",
    group: "Feedback",
    title: "Feedback status actions work",
    steps: "Mark a test report reviewed, closed, then open again.",
    expected: "Status updates immediately and counts adjust correctly.",
  },
  {
    id: "launch_lock",
    group: "Feedback",
    title: "Launch lock checklist works",
    steps: "God Mode → Health Launch Lock. Mark one item passed, one blocked, one waived. Copy report.",
    expected: "Score and counts update. Copy Launch Report works.",
  },
  {
    id: "start_workout",
    group: "Workout",
    title: "Start workout flow",
    steps: "Start a workout from Health. Open active workout mode.",
    expected: "Workout opens with current exercise, timer, set controls, and safe exit controls.",
  },
  {
    id: "set_logging",
    group: "Workout",
    title: "Set logging and rest timer",
    steps: "Finish a set. Log reps/weight/effort during rest. Let rest timer run.",
    expected: "Set saves, rest timer works, and next set/exercise remains clear.",
  },
  {
    id: "finish_workout",
    group: "Workout",
    title: "Finish workout recap",
    steps: "Finish a short workout.",
    expected: "Post-workout recap appears and workout history/memory updates.",
  },
  {
    id: "history_memory",
    group: "Workout",
    title: "Workout memory carry-forward",
    steps: "Open next workout recommendation/history after a completed session.",
    expected: "Last session data and next move recommendations display correctly.",
  },
  {
    id: "nutrition_manual",
    group: "Nutrition",
    title: "Manual nutrition logging",
    steps: "Log a meal manually without requesting AI.",
    expected: "Meal saves and does not require AI access.",
  },
  {
    id: "nutrition_ai",
    group: "Nutrition",
    title: "Nutrition AI estimate",
    steps: "Describe a meal and request an AI estimate using an account with AI access.",
    expected: "Estimate returns, can be confirmed/saved, and errors are understandable if provider is unavailable.",
  },
  {
    id: "sync_chat",
    group: "AI Coach",
    title: "SYNC coach chat",
    steps: "Ask SYNC a workout/nutrition question from Health.",
    expected: "Response is concise, contextual, and does not break if profile/history is sparse.",
  },
  {
    id: "voice_audio",
    group: "AI Coach",
    title: "Voice/audio controls",
    steps: "Toggle audio on/off and try a coach voice prompt if available.",
    expected: "Audio does not block the workout. Fallback is clear if voice provider is unavailable.",
  },
  {
    id: "auth_app_switch",
    group: "Auth",
    title: "Mobile app switch/session check",
    steps: "Open Health on phone, switch apps for 1–2 minutes, return.",
    expected: "User is not immediately kicked to login during normal app switching.",
  },
  {
    id: "refresh_recovery",
    group: "Auth",
    title: "Refresh recovery",
    steps: "Hard refresh Health and God Mode pages.",
    expected: "Pages recover cleanly and do not lose critical persisted local state unexpectedly.",
  },
  {
    id: "console_errors",
    group: "QA",
    title: "Console/runtime smoke check",
    steps: "Open browser dev tools during Health/God Mode testing.",
    expected: "No Health launch-blocking console errors. Non-blocking Vite chunk warnings are acceptable.",
  },
];

function makeInitialHealthSmokeState() {
  return HEALTH_SMOKE_TESTS.reduce((acc, item) => {
    acc[item.id] = {
      result: "UNTESTED",
      issue: "",
      updatedAt: "",
    };
    return acc;
  }, {});
}

function loadHealthSmokeState() {
  if (typeof window === "undefined") {
    return makeInitialHealthSmokeState();
  }

  try {
    const raw = window.localStorage.getItem(
      HEALTH_SMOKE_TEST_STORAGE_KEY
    );

    if (!raw) {
      return makeInitialHealthSmokeState();
    }

    const parsed = JSON.parse(raw);

    return {
      ...makeInitialHealthSmokeState(),
      ...(parsed || {}),
    };
  } catch {
    return makeInitialHealthSmokeState();
  }
}

function getSmokeResultClass(result) {
  if (result === "PASS") {
    return "border-emerald-300/30 bg-emerald-300/10 text-emerald-100";
  }

  if (result === "FAIL") {
    return "border-rose-300/30 bg-rose-300/10 text-rose-100";
  }

  if (result === "NEEDS_POLISH") {
    return "border-amber-300/30 bg-amber-300/10 text-amber-100";
  }

  return "border-slate-700 bg-slate-900 text-slate-300";
}

function HealthSmokeTestPanel() {
  const [state, setState] = useState(() => loadHealthSmokeState());
  const [copied, setCopied] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState("ALL");
  const [selectedResult, setSelectedResult] = useState("ALL");

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(
      HEALTH_SMOKE_TEST_STORAGE_KEY,
      JSON.stringify(state)
    );
  }, [state]);

  const groups = useMemo(() => {
    return Array.from(new Set(HEALTH_SMOKE_TESTS.map((item) => item.group)));
  }, []);

  const counts = useMemo(() => {
    return HEALTH_SMOKE_TESTS.reduce(
      (acc, item) => {
        const result = state[item.id]?.result || "UNTESTED";
        acc[result] = (acc[result] || 0) + 1;
        return acc;
      },
      { PASS: 0, FAIL: 0, NEEDS_POLISH: 0, UNTESTED: 0 }
    );
  }, [state]);

  const filteredTests = useMemo(() => {
    return HEALTH_SMOKE_TESTS.filter((item) => {
      const result = state[item.id]?.result || "UNTESTED";
      const groupOk = selectedGroup === "ALL" || item.group === selectedGroup;
      const resultOk = selectedResult === "ALL" || result === selectedResult;

      return groupOk && resultOk;
    });
  }, [selectedGroup, selectedResult, state]);

  const smokePassed =
    counts.FAIL === 0 &&
    counts.NEEDS_POLISH === 0 &&
    counts.UNTESTED === 0;

  const betaReady =
    counts.FAIL === 0 &&
    counts.UNTESTED === 0;

  const completionPercent = Math.round(
    ((counts.PASS + counts.NEEDS_POLISH) / HEALTH_SMOKE_TESTS.length) * 100
  );

  function updateSmokeItem(itemId, patch) {
    setState((current) => ({
      ...current,
      [itemId]: {
        ...(current[itemId] || {}),
        ...patch,
        updatedAt: new Date().toISOString(),
      },
    }));
  }

  function resetSmokeTest() {
    setState(makeInitialHealthSmokeState());
    setCopied(false);
  }

  async function copySmokeReport() {
    const report = {
      module: "SyncWorks Health",
      report_type: "production_smoke_test",
      beta_ready: betaReady,
      production_smoke_passed: smokePassed,
      completion_percent: completionPercent,
      counts,
      generated_at: new Date().toISOString(),
      items: HEALTH_SMOKE_TESTS.map((item) => ({
        ...item,
        ...(state[item.id] || {}),
      })),
    };

    try {
      await navigator.clipboard.writeText(
        JSON.stringify(report, null, 2)
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-fuchsia-400/20 bg-slate-950/80 p-5">
        <div className="pointer-events-none absolute -right-16 -top-20 h-60 w-60 rounded-full bg-fuchsia-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-60 w-60 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.24em] text-fuchsia-200">
              SyncWorks Health
            </div>
            <h2 className="mt-1 text-2xl font-black text-white">
              Production Smoke Test
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              A final launch test runner for buttons, fonts, mobile spacing, workout flow, AI flow, feedback loop, auth/session behavior, and visual polish.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copySmokeReport}
              className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/20"
            >
              {copied ? "Copied" : "Copy Smoke Report"}
            </button>

            <button
              type="button"
              onClick={resetSmokeTest}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-black text-slate-200 transition hover:bg-slate-800"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="relative mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <Stat
            label="Smoke Test"
            value={smokePassed ? "PASS" : betaReady ? "BETA OK" : "OPEN"}
          />
          <Stat label="Complete" value={`${completionPercent}%`} />
          <Stat label="Pass" value={String(counts.PASS || 0)} />
          <Stat label="Polish" value={String(counts.NEEDS_POLISH || 0)} />
          <Stat label="Fail" value={String(counts.FAIL || 0)} />
          <Stat label="Untested" value={String(counts.UNTESTED || 0)} />
        </div>

        <div
          className={`relative mt-4 rounded-2xl border p-4 text-sm font-bold leading-6 ${
            smokePassed
              ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
              : betaReady
              ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
              : "border-amber-300/30 bg-amber-300/10 text-amber-100"
          }`}
        >
          {smokePassed
            ? "Production smoke test passed. Health is ready for go-live signoff."
            : betaReady
            ? "Beta is clear, but there are polish items before calling production perfect."
            : "Smoke test is still open. Clear failures and untested items before go-live."}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/75 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-cyan-100">
              Filters
            </h3>
            <p className="text-sm text-slate-500">
              Use Needs Polish for font, spacing, button, or visual-quality issues that are not hard blockers.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <select
              value={selectedGroup}
              onChange={(event) => setSelectedGroup(event.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            >
              <option value="ALL">All groups</option>
              {groups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>

            <select
              value={selectedResult}
              onChange={(event) => setSelectedResult(event.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            >
              <option value="ALL">All results</option>
              <option value="UNTESTED">Untested</option>
              <option value="PASS">Pass</option>
              <option value="NEEDS_POLISH">Needs polish</option>
              <option value="FAIL">Fail</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        {filteredTests.map((item) => {
          const itemState = state[item.id] || {};
          const result = itemState.result || "UNTESTED";

          return (
            <article
              key={item.id}
              className="rounded-2xl border border-slate-800 bg-slate-950/75 p-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-1 text-[11px] font-black ${getSmokeResultClass(result)}`}
                    >
                      {result}
                    </span>
                    <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-[11px] font-black text-cyan-100">
                      {item.group}
                    </span>
                  </div>

                  <h4 className="mt-3 text-base font-black text-white">
                    {item.title}
                  </h4>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-800 bg-black/20 p-3">
                      <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                        Steps
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        {item.steps}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-black/20 p-3">
                      <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                        Expected
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        {item.expected}
                      </p>
                    </div>
                  </div>

                  <textarea
                    value={itemState.issue || ""}
                    onChange={(event) =>
                      updateSmokeItem(item.id, {
                        issue: event.target.value,
                      })
                    }
                    placeholder="Issue note, font/button/layout concern, device used, tester feedback, or fix needed..."
                    rows={2}
                    className="mt-3 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-fuchsia-300/40"
                  />

                  {itemState.updatedAt ? (
                    <div className="mt-2 text-xs text-slate-500">
                      Updated {new Date(itemState.updatedAt).toLocaleString()}
                    </div>
                  ) : null}
                </div>

                <div className="grid min-w-[220px] gap-2">
                  {["PASS", "NEEDS_POLISH", "FAIL", "UNTESTED"].map(
                    (resultOption) => (
                      <button
                        key={resultOption}
                        type="button"
                        onClick={() =>
                          updateSmokeItem(item.id, {
                            result: resultOption,
                          })
                        }
                        className={`rounded-xl border px-3 py-2 text-xs font-black transition ${getSmokeResultClass(
                          resultOption
                        )} ${
                          result === resultOption
                            ? "ring-2 ring-fuchsia-300/30"
                            : "hover:border-fuchsia-300/40"
                        }`}
                      >
                        Mark {resultOption.toLowerCase().replace("_", " ")}
                      </button>
                    )
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function DeveloperAgentPanel() {
  const [state, setState] = useState(() => loadState());
  const [newTask, setNewTask] = useState(TASK_CATALOG[0]);
  const [findingDraft, setFindingDraft] = useState({ module: MODULES[0], summary: "", status: "OPEN", reason: "" });
  const [agentStatus, setAgentStatus] = useState(null);
  const [agentLoading, setAgentLoading] = useState(true);
  const [agentRefreshing, setAgentRefreshing] = useState(false);
  const [agentError, setAgentError] = useState("");
  const [selectedApprovedTask, setSelectedApprovedTask] = useState("");
  const [dispatchingTask, setDispatchingTask] = useState("");
  const [dispatchMessage, setDispatchMessage] = useState("");
  const [runTaskLabels, setRunTaskLabels] = useState(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(
        window.localStorage.getItem("sw_developer_agent_run_labels") || "{}"
      );
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const loadAgentStatus = async ({ quiet = false } = {}) => {
    if (quiet) setAgentRefreshing(true);
    else setAgentLoading(true);
    setAgentError("");

    try {
      const response = await api.get("/platform/developer-agent/status/");
      const payload = response?.data || {};
      const taskIds = Object.keys(payload.approved_tasks || {});
      setAgentStatus(payload);
      setSelectedApprovedTask((current) =>
        current && taskIds.includes(current) ? current : taskIds[0] || ""
      );
    } catch (error) {
      setAgentError(getDeveloperAgentError(error, "Unable to load Developer Agent status."));
    } finally {
      setAgentLoading(false);
      setAgentRefreshing(false);
    }
  };

  useEffect(() => {
    loadAgentStatus();
  }, []);

  const persistRunTaskLabels = (nextLabels) => {
    setRunTaskLabels(nextLabels);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        "sw_developer_agent_run_labels",
        JSON.stringify(nextLabels)
      );
    } catch {
      // Local run labels are a convenience only.
    }
  };

  const liveRunActive = Boolean(
    agentStatus?.recent_runs?.some((run) => ["queued", "in_progress"].includes(run?.status))
  );

  const rememberLatestRunTask = (taskId, statusPayload) => {
    const run = statusPayload?.recent_runs?.[0];
    if (!run?.id || !taskId) return;

    persistRunTaskLabels({
      ...runTaskLabels,
      [String(run.id)]: {
        task_id: taskId,
        label: DEVELOPER_AGENT_TASK_LABELS[taskId] || taskId,
      },
    });
  };

  const dispatchApprovedTask = async () => {
    if (!selectedApprovedTask || dispatchingTask || liveRunActive || !agentStatus?.configured) return;

    setDispatchingTask(selectedApprovedTask);
    setDispatchMessage("");
    setAgentError("");

    try {
      await api.post("/platform/developer-agent/run/", { task_id: selectedApprovedTask });
      setDispatchMessage(`Accepted: ${DEVELOPER_AGENT_TASK_LABELS[selectedApprovedTask] || selectedApprovedTask}`);
      const firstRefresh = await api.get("/platform/developer-agent/status/");
      const firstPayload = firstRefresh?.data || {};
      setAgentStatus(firstPayload);
      rememberLatestRunTask(selectedApprovedTask, firstPayload);

      window.setTimeout(async () => {
        try {
          const delayedRefresh = await api.get("/platform/developer-agent/status/");
          const delayedPayload = delayedRefresh?.data || {};
          setAgentStatus(delayedPayload);
          rememberLatestRunTask(selectedApprovedTask, delayedPayload);
        } catch {
          // Manual refresh still works if this delayed refresh fails.
        }
      }, 2500);
    } catch (error) {
      setAgentError(getDeveloperAgentError(error, "Unable to start the approved task."));
    } finally {
      setDispatchingTask("");
    }
  };

  const auditComplete = useMemo(() => {
    const moduleComplete = MODULES.every((module) => {
      const item = state.modules[module];
      if (!item) return false;
      if (item.status === "PASSED") return true;
      if (item.status === "DEFERRED") return Boolean(item.reason && item.reason.trim());
      return false;
    });
    const noBlocked = MODULES.every((module) => state.modules[module]?.status !== "BLOCKED");
    const findingsComplete = state.findings.every(
      (finding) => ["RESOLVED", "ACCEPTED_RISK"].includes(finding.status) || (finding.status === "DEFERRED" && Boolean(finding.reason && finding.reason.trim()))
    );
    return moduleComplete && noBlocked && findingsComplete;
  }, [state.modules, state.findings]);

  const completedModules = MODULES.filter((m) => {
    const item = state.modules[m];
    return item?.status === "PASSED" || (item?.status === "DEFERRED" && Boolean(item.reason && item.reason.trim()));
  }).length;

  const findingsCount = state.findings.length;
  const queueCounts = state.queue.reduce(
    (acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    },
    { PENDING: 0, RUNNING: 0, COMPLETED: 0, FAILED: 0, BLOCKED: 0 }
  );

  const saveModule = (module, patch) => {
    setState((prev) => ({
      ...prev,
      modules: {
        ...prev.modules,
        [module]: { ...prev.modules[module], ...patch },
      },
    }));
  };

  const addQueueTask = () => {
    setState((prev) => ({
      ...prev,
      queue: [...prev.queue, { id: `${Date.now()}-${Math.random()}`, name: newTask, status: "PENDING" }],
    }));
  };

  const advanceQueueTask = (id, nextStatus) => {
    setState((prev) => ({
      ...prev,
      queue: prev.queue.map((task) => (task.id === id ? { ...task, status: nextStatus } : task)),
    }));
  };

  const addFinding = () => {
    setState((prev) => ({
      ...prev,
      findings: [
        ...prev.findings,
        {
          id: `${Date.now()}-${Math.random()}`,
          module: findingDraft.module,
          summary: findingDraft.summary,
          status: findingDraft.status,
          reason: findingDraft.status === "DEFERRED" ? findingDraft.reason : "",
        },
      ],
    }));
    setFindingDraft({ module: MODULES[0], summary: "", status: "OPEN", reason: "" });
  };

  const updateFinding = (id, patch) => {
    setState((prev) => ({
      ...prev,
      findings: prev.findings.map((finding) => (finding.id === id ? { ...finding, ...patch } : finding)),
    }));
  };

  const resetDemoState = () => {
    const fresh = makeInitialState();
    setState(fresh);
    setFindingDraft({ module: MODULES[0], summary: "", status: "OPEN", reason: "" });
  };

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/70 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-cyan-100">Developer Agent</h2>
            <p className="text-sm text-slate-400">Live approved-task dispatcher with a separate manual audit workspace.</p>
          </div>
          <button
            type="button"
            onClick={resetDemoState}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Reset Demo State
          </button>
        </div>
        <div className="mt-3 text-sm text-amber-300">Live tasks remain branch-only and draft-PR-only. No automatic merge, deployment, billing action, migration, or secret exposure.</div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <Stat label="Project" value={state.project} />
          <Stat label="Modules" value={`${completedModules}/20`} />
          <Stat label="Findings" value={`${findingsCount}`} />
          <Stat label="Audit Complete" value={auditComplete ? "100%" : "0%"} />
        </div>
        <div className="mt-3 text-xs text-slate-500">GitHub Actions: <a className="text-cyan-300 underline" href="https://github.com/syncworksai/Syncworks-developer-agent/actions" target="_blank" rel="noreferrer">https://github.com/syncworksai/Syncworks-developer-agent/actions</a></div>
      </div>

      <div className="rounded-2xl border border-cyan-500/25 bg-slate-950/70 p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-cyan-100">Live Approved Task Dispatcher</h3>
            <p className="text-sm text-slate-400">Runs the fixed backend allowlist through GitHub Actions. The browser never receives the GitHub token.</p>
          </div>
          <button type="button" onClick={() => loadAgentStatus({ quiet: true })} disabled={agentLoading || agentRefreshing} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
            {agentRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {agentError ? <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{agentError}</div> : null}
        {dispatchMessage ? <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{dispatchMessage}</div> : null}

        <div className="grid gap-3 md:grid-cols-4">
          <Stat label="Backend" value={agentLoading ? "Loading..." : agentStatus?.configured ? "Configured" : "Not configured"} />
          <Stat label="Repository" value={agentStatus?.repository || "ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â"} />
          <Stat label="Workflow" value={agentStatus?.workflow || "ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â"} />
          <Stat label="Live Run" value={liveRunActive ? "In progress" : "Idle"} />
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <select value={selectedApprovedTask} onChange={(event) => setSelectedApprovedTask(event.target.value)} disabled={agentLoading || !agentStatus?.configured || liveRunActive || Boolean(dispatchingTask)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50">
            {Object.keys(agentStatus?.approved_tasks || {}).length === 0 ? <option value="">No approved tasks available</option> : Object.keys(agentStatus.approved_tasks).map((taskId) => <option key={taskId} value={taskId}>{DEVELOPER_AGENT_TASK_LABELS[taskId] || taskId}</option>)}
          </select>
          <button type="button" onClick={dispatchApprovedTask} disabled={agentLoading || !agentStatus?.configured || !selectedApprovedTask || liveRunActive || Boolean(dispatchingTask)} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50">
            {dispatchingTask ? "Starting..." : liveRunActive ? "Run in progress" : "Run approved task"}
          </button>
        </div>

        <div className="grid gap-2 text-xs text-slate-400 md:grid-cols-5">
          <div>Branch only: {agentStatus?.safety_flags?.branch_only ? "Yes" : "ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â"}</div>
          <div>Draft PR only: {agentStatus?.safety_flags?.draft_pr_only ? "Yes" : "ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â"}</div>
          <div>Auto merge: {agentStatus?.safety_flags?.auto_merge ? "Enabled" : "Disabled"}</div>
          <div>Auto deploy: {agentStatus?.safety_flags?.auto_deploy ? "Enabled" : "Disabled"}</div>
          <div>Production migrations: {agentStatus?.safety_flags?.production_migrations ? "Enabled" : "Disabled"}</div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium text-slate-200">Recent GitHub Actions runs</div>
          {agentLoading ? <div className="text-sm text-slate-500">Loading live runs...</div> : null}
          {!agentLoading && (agentStatus?.recent_runs || []).length === 0 ? <div className="text-sm text-slate-500">No recent workflow_dispatch runs found.</div> : null}
          {(agentStatus?.recent_runs || []).map((run) => (
            <a key={run.id} href={run.html_url} target="_blank" rel="noreferrer" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 p-3 hover:border-cyan-500/40 hover:bg-slate-900/60">
              <div>
                <div className="font-medium text-slate-200">{runTaskLabels[String(run.id)]?.label || "Task not captured"}</div>
                <div className="text-xs text-slate-500">Run #{run.id} ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· {run.head_branch || agentStatus?.ref || "main"} ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· {run.created_at || "Unknown time"}</div>
              </div>
              <div className="text-sm text-cyan-300">{run.status || "unknown"}{run.conclusion ? ` ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· ${run.conclusion}` : ""}</div>
            </a>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-4">
          <h3 className="text-lg font-semibold">Project Selector</h3>
          <select
            value={state.project}
            onChange={(e) => setState((prev) => ({ ...prev, project: e.target.value }))}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
          >
            {PROJECTS.map((project) => (
              <option key={project} value={project}>{project}</option>
            ))}
          </select>

          <div className="space-y-3">
            {MODULES.map((module) => {
              const item = state.modules[module];
              return (
                <div key={module} className="rounded-xl border border-slate-800 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium">{module}</div>
                    <select
                      value={item.status}
                      onChange={(e) => saveModule(module, { status: e.target.value, reason: e.target.value === "DEFERRED" ? item.reason : item.reason })}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
                    >
                      {MODULE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </div>
                  <input
                    value={item.reason}
                    onChange={(e) => saveModule(module, { reason: e.target.value })}
                    placeholder="Reason required when deferred"
                    className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm"
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-4">
          <h3 className="text-lg font-semibold">Manual Audit Task Queue</h3>
          <div className="flex gap-2">
            <select value={newTask} onChange={(e) => setNewTask(e.target.value)} className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">
              {TASK_CATALOG.map((task) => <option key={task} value={task}>{task}</option>)}
            </select>
            <button type="button" onClick={addQueueTask} className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-medium text-white">Add to Queue</button>
          </div>
          <div className="space-y-2">
            {state.queue.length === 0 ? <div className="text-sm text-slate-500">Queue empty</div> : null}
            {state.queue.map((task) => (
              <div key={task.id} className="rounded-xl border border-slate-800 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{task.name}</div>
                    <div className="text-xs text-slate-500">Status: {task.status}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => advanceQueueTask(task.id, "RUNNING")} className="rounded border border-slate-700 px-2 py-1 text-xs">pending ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ running</button>
                    <button type="button" onClick={() => advanceQueueTask(task.id, "COMPLETED")} className="rounded border border-slate-700 px-2 py-1 text-xs">running ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ completed</button>
                    <button type="button" onClick={() => advanceQueueTask(task.id, "FAILED")} className="rounded border border-slate-700 px-2 py-1 text-xs">explicit failure</button>
                    <button type="button" onClick={() => advanceQueueTask(task.id, "BLOCKED")} className="rounded border border-slate-700 px-2 py-1 text-xs">explicit blocked</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm text-slate-300">
            <div>PENDING: {queueCounts.PENDING}</div><div>RUNNING: {queueCounts.RUNNING}</div>
            <div>COMPLETED: {queueCounts.COMPLETED}</div><div>FAILED: {queueCounts.FAILED}</div>
            <div>BLOCKED: {queueCounts.BLOCKED}</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-4">
        <h3 className="text-lg font-semibold">Findings</h3>
        <div className="grid gap-3 md:grid-cols-4">
          <select value={findingDraft.module} onChange={(e) => setFindingDraft((p) => ({ ...p, module: e.target.value }))} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">
            {MODULES.map((module) => <option key={module} value={module}>{module}</option>)}
          </select>
          <input value={findingDraft.summary} onChange={(e) => setFindingDraft((p) => ({ ...p, summary: e.target.value }))} placeholder="Finding summary" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 md:col-span-2" />
          <select value={findingDraft.status} onChange={(e) => setFindingDraft((p) => ({ ...p, status: e.target.value, reason: e.target.value === "DEFERRED" ? p.reason : "" }))} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">
            {FINDING_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          {findingDraft.status === "DEFERRED" ? <input value={findingDraft.reason} onChange={(e) => setFindingDraft((p) => ({ ...p, reason: e.target.value }))} placeholder="Reason required for deferred" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 md:col-span-4" /> : null}
          <button type="button" onClick={addFinding} className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-medium text-white md:col-span-4">Add Finding</button>
        </div>
        <div className="space-y-2">
          {state.findings.map((finding) => (
            <div key={finding.id} className="rounded-xl border border-slate-800 p-3 space-y-2">
              <div className="text-sm text-slate-300">{finding.module}</div>
              <input value={finding.summary} onChange={(e) => updateFinding(finding.id, { summary: e.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" />
              <div className="flex flex-wrap gap-2 items-center">
                <select value={finding.status} onChange={(e) => updateFinding(finding.id, { status: e.target.value, reason: e.target.value === "DEFERRED" ? finding.reason : "" })} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm">
                  {FINDING_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
                {finding.status === "DEFERRED" ? <input value={finding.reason} onChange={(e) => updateFinding(finding.id, { reason: e.target.value })} placeholder="Deferred reason" className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" /> : null}
              </div>
            </div>
          ))}
        </div>
        <div className="text-sm text-slate-400">Audit complete is only achieved when every module is PASSED or DEFERRED with a written reason, no module is BLOCKED, and every finding is RESOLVED, ACCEPTED_RISK, or DEFERRED with a written reason.</div>
      </div>
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm text-slate-100">{value}</div>
    </div>
  );
}

export default function PlatformDashboard() {
  const [tab, setTab] = useState("overview");

  return (
    <div className="min-h-screen text-slate-100 bg-[#05060a]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full blur-3xl opacity-30 bg-cyan-500/30" />
        <div className="absolute -top-20 -right-40 w-[560px] h-[560px] rounded-full blur-3xl opacity-25 bg-fuchsia-500/25" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[880px] h-[320px] rounded-full blur-3xl opacity-20 bg-indigo-500/20" />
      </div>

      <ModeBar
        title="SyncWorks Admin"
        subtitle="Platform console ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â performance, billing locks, ads, broadcasts, and support triage."
      />

      <main className="relative max-w-7xl mx-auto px-4 py-6 space-y-5">
        <PlatformTabs tabs={TABS} active={tab} onChange={setTab} />

        {tab === "overview" ? <PlatformOverviewTab /> : null}
        {tab === "growth_os" ? <PlatformGrowthEngineTab /> : null}
        {tab === "users" ? <UsersManager /> : null}
        {tab === "businesses" ? <BusinessesManager /> : null}
        {tab === "billing" ? <BillingManager /> : null}
        {tab === "requests" ? <SupportRequestsManager embedded /> : null}
        {tab === "ads" ? <AdsOrdersManager /> : null}
        {tab === "news" ? <NewsReelManager /> : null}
        {tab === "broadcasts" ? <BroadcastsManager /> : null}
        {tab === "affiliates" ? <GodModeAffiliates /> : null}
        {tab === "health_launch_lock" ? <HealthLaunchLockPanel /> : null}
        {tab === "health_smoke_test" ? <HealthSmokeTestPanel /> : null}
        {tab === "developer_agent" ? <DeveloperAgentPanel /> : null}
      </main>
    </div>
  );
}
