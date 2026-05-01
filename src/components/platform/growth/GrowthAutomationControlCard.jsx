import React, { useEffect, useState } from "react";
import api from "../../../api/client";

function GlassCard({ title, right, children }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold tracking-tight text-slate-100">{title}</div>
        {right ? <div className="text-xs text-slate-400">{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function StatusPill({ status }) {
  const tones = {
    ACTIVE: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
    DRAFT: "border-amber-500/20 bg-amber-500/10 text-amber-200",
    PAUSED: "border-slate-500/20 bg-slate-500/10 text-slate-200",
    ARCHIVED: "border-rose-500/20 bg-rose-500/10 text-rose-200",
  };

  return (
    <span className={`text-[11px] px-2 py-1 rounded-full border ${tones[status] || tones.DRAFT}`}>
      {status || "DRAFT"}
    </span>
  );
}

export default function GrowthAutomationControlCard() {
  const [rules, setRules] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    setLoading(true);

    try {
      const [rulesRes, executionsRes] = await Promise.all([
        api.get("/platform-growth/automation-rules/"),
        api.get("/platform-growth/automation-executions/"),
      ]);

      setRules(Array.isArray(rulesRes.data) ? rulesRes.data : []);
      setExecutions(Array.isArray(executionsRes.data) ? executionsRes.data.slice(0, 6) : []);
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to load automation engine.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleRule(rule) {
    const nextStatus = rule.status === "ACTIVE" ? "PAUSED" : "ACTIVE";

    setBusyId(rule.id);
    setErr("");

    try {
      await api.patch(`/platform-growth/automation-rules/${rule.id}/`, {
        status: nextStatus,
      });
      await load();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to update automation rule.");
    } finally {
      setBusyId(null);
    }
  }

  async function runTest(rule) {
    setBusyId(rule.id);
    setErr("");

    try {
      await api.post(`/platform-growth/automation-rules/${rule.id}/run_test/`, {
        test: true,
        source: "growth_os_frontend",
      });
      await load();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to run automation test.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <GlassCard title="Automation Engine" right="rules + executions">
      {err ? (
        <div className="mb-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
          {err}
        </div>
      ) : null}

      {loading ? <div className="text-sm text-slate-400">Loading automation…</div> : null}

      {!loading ? (
        <div className="grid xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 space-y-3">
            {rules.length ? (
              rules.map((rule) => (
                <div key={rule.id} className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-100">{rule.name}</div>
                      <div className="mt-1 text-xs text-slate-400">
                        {rule.trigger_type} → {rule.action_type}
                      </div>
                    </div>
                    <StatusPill status={rule.status} />
                  </div>

                  {rule.description ? (
                    <div className="mt-2 text-sm text-slate-300">{rule.description}</div>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === rule.id}
                      onClick={() => toggleRule(rule)}
                      className="h-8 px-3 rounded-2xl text-xs border border-slate-800 bg-slate-950/70 hover:bg-slate-900/50 text-slate-200 disabled:opacity-60"
                    >
                      {rule.status === "ACTIVE" ? "Pause" : "Activate"}
                    </button>

                    <button
                      type="button"
                      disabled={busyId === rule.id || rule.status !== "ACTIVE"}
                      onClick={() => runTest(rule)}
                      className="h-8 px-3 rounded-2xl text-xs border border-cyan-500/35 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-100 disabled:opacity-60"
                    >
                      Run Test
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4 text-sm text-slate-400">
                No automation rules yet.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold text-slate-100">Recent Executions</div>
              <button
                type="button"
                onClick={load}
                className="h-7 px-2 rounded-xl text-[11px] border border-slate-800 bg-slate-950/70 text-slate-300"
              >
                Refresh
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {executions.length ? (
                executions.map((execution) => (
                  <div key={execution.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-slate-100 truncate">
                        {execution.rule_name || `Execution #${execution.id}`}
                      </div>
                      <StatusPill status={execution.status} />
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      {execution.trigger_type}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-400">No executions yet.</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </GlassCard>
  );
}