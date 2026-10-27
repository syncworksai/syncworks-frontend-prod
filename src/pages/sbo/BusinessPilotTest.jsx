import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, ClipboardCheck, Copy, RotateCcw } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import DashboardShell from "../../components/dashboard/DashboardShell";

const TASKS = [
  { id: "setup", title: "Understand the starting screen", route: "/sbo", action: "Open Business home", goal: "Locate the next action and business setup without needing a walkthrough.", prompt: "Within 15 seconds, can you tell what to do next?" },
  { id: "intake", title: "Create a customer and ticket", route: "/sbo/quick-intake", action: "Log a phone ticket", goal: "Enter an existing or new customer and create a service job.", prompt: "Could you finish customer intake in under 60 seconds?" },
  { id: "ticket", title: "Understand the job", route: "/tickets", action: "Open jobs", goal: "Find the created ticket, review details, and understand its next status.", prompt: "Can you find the new ticket and edit what you need?" },
  { id: "dispatch", title: "Assign and schedule", route: "/sbo/tech-board", action: "Open technician board", goal: "Assign the job to the right employee and check the date on the calendar.", prompt: "Is it obvious who owns this job and when it happens?" },
  { id: "invoice", title: "Finish and invoice", route: "/tickets", action: "Open tickets for billing", goal: "Mark a job complete, build an invoice, and see what the customer owes.", prompt: "Was anything confusing between job completion and invoicing?" },
  { id: "finance", title: "Understand how payments work", route: "/sbo/finance", action: "Open Business Finance", goal: "Find payment options and distinguish paid from outstanding work.", prompt: "Can you explain what happens with card, Cash App, or cash? Do not make a live test payment." },
  { id: "reports", title: "See business performance", route: "/sbo/reports", action: "Open Business Intelligence", goal: "Find completed jobs, collected revenue, and open work.", prompt: "Are the numbers and terms understandable without our explanation?" },
];

const OPTIONS = [
  ["untested", "Not tested"],
  ["passed", "Easy / passed"],
  ["confusing", "Confusing"],
  ["blocked", "Blocked"],
];

function storageKey(businessId) {
  return "sw_business_pilot_v1_" + (businessId || "not-selected");
}
function initial() {
  return { ...Object.fromEntries(TASKS.map((task) => [task.id, { result: "untested", note: "" }])), __feedback: { hardest: "", pay: "", price: "", missing: "" } };
}
function safeLoad(businessId) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(businessId)) || "{}");
    const source = saved && typeof saved === "object" ? saved : {};
    const loaded = Object.fromEntries(TASKS.map((task) => {
      const old = source[task.id] || {};
      return [task.id, {
        result: OPTIONS.some(([value]) => value === old.result) ? old.result : "untested",
        note: String(old.note || "").slice(0, 500),
      }];
    }));
    loaded.__feedback = {
      hardest: String(source.__feedback?.hardest || "").slice(0, 250),
      pay: ["", "yes", "maybe", "no"].includes(source.__feedback?.pay) ? (source.__feedback?.pay || "") : "",
      price: String(source.__feedback?.price || "").slice(0, 40),
      missing: String(source.__feedback?.missing || "").slice(0, 250),
    };
    return loaded;
  } catch {
    return initial();
  }
}

export function pilotReport(data, businessId) {
  const lines = [
    "SYNCWORKS BUSINESS PILOT — USABILITY RESULTS",
    "Business ID: " + (businessId || "not selected"),
    "Exported: " + new Date().toISOString(),
    "Status totals: " + OPTIONS.map(([status]) => status + "=" + TASKS.filter((task) => data[task.id]?.result === status).length).join(", "),
    "",
  ];
  TASKS.forEach((task, index) => {
    const state = data[task.id] || {};
    lines.push((index + 1) + ". " + task.title + " — " + (state.result || "untested"));
    lines.push("Test: " + task.goal);
    lines.push("Feedback: " + (state.note || "(none)"));
    lines.push("");
  });
  lines.push("Interpretation: a tester's checked result is self-reported, not a verified API success.");
  lines.push("Final feedback:");
  lines.push("Hardest step: " + (data.__feedback?.hardest || "(none)"));
  lines.push("Pay today? " + (data.__feedback?.pay || "(not answered)"));
  lines.push("Monthly price suggested: " + (data.__feedback?.price || "(not answered)"));
  lines.push("Missing before launch: " + (data.__feedback?.missing || "(none)"));
  lines.push("");
  return lines.join("\n");
}

export default function BusinessPilotTest() {
  const navigate = useNavigate();
  const { activeBusinessId } = useAuth();
  const [data, setData] = useState(initial);
  const [notice, setNotice] = useState("");
  const [readyId, setReadyId] = useState(null);

  useEffect(() => {
    const loaded = safeLoad(activeBusinessId);
    setData(loaded);
    setReadyId(activeBusinessId || "");
  }, [activeBusinessId]);

  useEffect(() => {
    if (readyId === null || String(readyId) !== String(activeBusinessId || "")) return;
    try {
      localStorage.setItem(storageKey(activeBusinessId), JSON.stringify(data));
    } catch {
      setNotice("Local storage is unavailable; copy the report before leaving.");
    }
  }, [activeBusinessId, data, readyId]);

  const totals = useMemo(() => Object.fromEntries(OPTIONS.map(([value]) => [
    value, TASKS.filter((task) => data[task.id]?.result === value).length,
  ])), [data]);

  function update(id, patch) {
    setData((previous) => ({
      ...previous,
      [id]: { ...previous[id], ...patch },
    }));
    setNotice("");
  }

  async function copyReport() {
    const report = pilotReport(data, activeBusinessId);
    try {
      await navigator.clipboard.writeText(report);
      setNotice("Test report copied. Paste it in your notes or send it to the SyncWorks team.");
    } catch {
      setNotice("Copy wasn't available in this browser. Select and copy the report from the field below.");
    }
  }

  return (
    <DashboardShell
      title="Business Pilot Test"
      subtitle="Run the same real-world workflow with every early business"
      modeBarTitle="Business Pilot"
      modeBarSubtitle="Quick usability checks"
      bottomNavItems={[
        { label: "Business", icon: "⌂", onClick: () => navigate("/sbo") },
        { label: "New job", icon: "+", onClick: () => navigate("/sbo/quick-intake") },
        { label: "Jobs", icon: "▤", onClick: () => navigate("/tickets") },
        { label: "Finance", icon: "$", onClick: () => navigate("/sbo/finance") },
      ]}
    >
      <div className="mx-auto max-w-4xl space-y-4 pb-24">
        <div className="rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 via-slate-950 to-indigo-500/10 p-4 sm:p-6">
          <button type="button" onClick={() => navigate("/sbo")} className="inline-flex min-h-10 items-center gap-2 text-xs font-black text-cyan-200">
            <ArrowLeft className="h-4 w-4" /> Business home
          </button>
          <div className="mt-2 flex items-start gap-3">
            <ClipboardCheck className="h-8 w-8 shrink-0 text-cyan-200" aria-hidden="true"/>
            <div>
              <h1 className="text-2xl font-black text-white sm:text-3xl">Can someone run a job without our help?</h1>
              <p className="mt-2 text-sm leading-6 text-slate-300">This is the test that matters. Open each real screen, ask the question, then record the outcome. Don't coach the tester through a step before they try it.</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              ["Passed", totals.passed, "text-emerald-200"],
              ["Confusing", totals.confusing, "text-amber-200"],
              ["Blocked", totals.blocked, "text-rose-200"],
            ].map(([label, value, color]) => (
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3" key={label}>
                <div className={"text-xl font-black " + color}>{value}</div>
                <div className="text-[11px] text-slate-400">{label}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">
            {TASKS.length - totals.untested} of {TASKS.length} steps assessed. Responses are saved locally in this browser for the active business; they are not uploaded to SyncWorks.
          </p>
        </div>

        {TASKS.map((task, index) => {
          const state = data[task.id] || { result: "untested", note: "" };
          return (
            <section key={task.id} aria-labelledby={"pilot-title-" + task.id}
              className="rounded-2xl border border-slate-800 bg-slate-950/65 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-500/10 text-xs font-black text-cyan-200">{index + 1}</span>
                  <div className="min-w-0">
                    <h2 id={"pilot-title-" + task.id} className="text-base font-black text-white">{task.title}</h2>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{task.goal}</p>
                  </div>
                </div>
                <button type="button" onClick={() => navigate(task.route)}
                  className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 text-xs font-black text-cyan-100 hover:border-cyan-300">
                  {task.action} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 rounded-xl bg-slate-900/70 p-3 text-xs font-medium leading-5 text-slate-200">
                Ask: {task.prompt}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold text-slate-400">Observed result</span>
                  <select value={state.result} onChange={(e) => update(task.id, { result: e.target.value })}
                    className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white">
                    {OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold text-slate-400">Where did they hesitate or get stuck?</span>
                  <textarea value={state.note} onChange={(e) => update(task.id, { note: e.target.value.slice(0, 500) })}
                    maxLength={500} rows={2} placeholder="Example: couldn't find the estimate button (avoid real customer names)"
                    className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-white" />
                </label>
              </div>
            </section>
          );
        })}

        <section className="rounded-2xl border border-indigo-500/25 bg-indigo-500/10 p-4">
          <h2 className="text-lg font-black text-white">What to ask at the end</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">“Which step was hardest? What would you stop using another tool for? What is missing before you'd trust this for a paying customer? Would you pay for this today, and at what price?”</p>
          <p className="mt-2 text-xs text-slate-400">Ask these questions before pitching additional features. Test with a separate demo business or genuine authorized work; don't enter fake payments in a live account.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1"><span className="text-xs font-bold text-slate-300">Hardest step</span>
              <input maxLength={250} value={data.__feedback?.hardest || ""} onChange={(e) => update("__feedback", { hardest: e.target.value })} placeholder="What took the most effort?" className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white" />
            </label>
            <label className="block space-y-1"><span className="text-xs font-bold text-slate-300">Would they pay today?</span>
              <select value={data.__feedback?.pay || ""} onChange={(e) => update("__feedback", { pay: e.target.value })} className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white">
                <option value="">Not answered</option><option value="yes">Yes</option><option value="maybe">Maybe</option><option value="no">No</option>
              </select>
            </label>
            <label className="block space-y-1"><span className="text-xs font-bold text-slate-300">Monthly price suggested</span>
              <input maxLength={40} value={data.__feedback?.price || ""} onChange={(e) => update("__feedback", { price: e.target.value })} placeholder="Ask without naming a price" className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white" />
            </label>
            <label className="block space-y-1"><span className="text-xs font-bold text-slate-300">What must be fixed before live use?</span>
              <input maxLength={250} value={data.__feedback?.missing || ""} onChange={(e) => update("__feedback", { missing: e.target.value })} placeholder="One critical blocker" className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white" />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={copyReport} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-cyan-500 px-4 text-sm font-black text-slate-950">
              <Copy className="h-4 w-4" /> Copy test report
            </button>
            <button type="button" onClick={() => {
              if (!window.confirm("Clear only the pilot checklist saved for this business on this device?")) return;
              setData(initial());
              setNotice("Pilot checklist reset on this device.");
            }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 px-4 text-xs font-black text-slate-200">
              <RotateCcw className="h-4 w-4" /> Start a new test
            </button>
          </div>
          {notice ? <p role="status" className="mt-3 text-xs text-cyan-200">{notice}</p> : null}
          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-slate-400">Show report text to copy manually</summary>
            <textarea readOnly value={pilotReport(data, activeBusinessId)} rows={10}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-slate-200" />
          </details>
        </section>
      </div>
    </DashboardShell>
  );
}
