// src/pages/SboZipLeaderboard.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import ModeBar from "../components/ModeBar";
import { useAuth } from "../auth/AuthContext";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function Card({ title, subtitle, right, children }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="font-semibold text-slate-100">{title}</div>
          {subtitle ? <div className="text-xs text-slate-400 mt-1">{subtitle}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function StatPill({ label, value, tone = "slate" }) {
  const toneCls =
    tone === "cyan"
      ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-100"
      : tone === "fuchsia"
      ? "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-100"
      : tone === "emerald"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
      : tone === "amber"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
      : "border-slate-800 bg-slate-950/60 text-slate-100";

  return (
    <div className={cx("rounded-2xl border p-4", toneCls)}>
      <div className="text-[11px] text-slate-300/80">{label}</div>
      <div className="mt-1 text-lg font-extrabold tracking-tight">{value}</div>
    </div>
  );
}

function SortBtn({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "text-xs rounded-2xl px-3 py-2 border transition",
        active
          ? "bg-fuchsia-500/15 border-fuchsia-500/35 text-fuchsia-200 shadow-[0_0_30px_rgba(217,70,239,0.12)]"
          : "bg-slate-950/60 border border-slate-800 hover:bg-slate-900/40 text-slate-200"
      )}
    >
      {children}
    </button>
  );
}

function fmtPct(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n * 100)}%`;
}

function fmtMin(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return "—";
  // show 2 decimals for realism (your sample has tiny minutes)
  return `${n.toFixed(2)}m`;
}

function safeNum(x, d = null) {
  const n = Number(x);
  return Number.isFinite(n) ? n : d;
}

export default function SboZipLeaderboard() {
  const navigate = useNavigate();
  const { activeBusinessId } = useAuth();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);

  // sortKey: "score" | "response" | "completion" | "volume" | "fast"
  const [sortKey, setSortKey] = useState("score");

  const load = useCallback(async () => {
    setErr("");
    setLoading(true);
    try {
      const res = await api.get("/tickets/metrics/zip/");
      setData(res.data || null);
    } catch (e) {
      setData(null);
      setErr(e?.response?.data?.detail || "Failed to load ZIP metrics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const zip = data?.zip || "";
  const windowDays = data?.window_days || { response: 30, volume: 30, completion: 60 };
  const my = data?.my || null;
  const leaderboardRaw = Array.isArray(data?.leaderboard) ? data.leaderboard : [];

  // Build an "all" list so we can rank properly even when backend doesn't include "my" in leaderboard.
  const allRows = useMemo(() => {
    const rows = [...leaderboardRaw];

    if (my?.business_id) {
      const exists = rows.some((r) => String(r.business_id) === String(my.business_id));
      if (!exists) {
        rows.unshift({
          business_id: my.business_id,
          business_name: my.business_name || "My Business",
          avg_response_min_30d: my.avg_response_min_30d ?? null,
          completion_rate_60d: my.completion_rate_60d ?? 0,
          jobs_completed_30d: my.jobs_completed_30d ?? 0,
          accept_count_30d: my.accept_count_30d ?? 0,
          fast_accept_10m_30d: my.fast_accept_10m_30d ?? 0,
          __isMine: true,
        });
      }
    }

    return rows.map((r) => ({
      ...r,
      __isMine: r.__isMine || (my?.business_id && String(r.business_id) === String(my.business_id)),
    }));
  }, [leaderboardRaw, my]);

  // Scoring: encourages marketplace health (volume + completion + speed + fast accept)
  const scoredRows = useMemo(() => {
    const responseVal = (r) => {
      const v = safeNum(r.avg_response_min_30d, null);
      if (v === null) return null;
      return v <= 0 ? null : v;
    };

    const score = (r) => {
      const vol = safeNum(r.accept_count_30d, 0) || 0;
      const comp = safeNum(r.completion_rate_60d, 0) || 0;
      const fast = safeNum(r.fast_accept_10m_30d, 0) || 0;
      const resp = responseVal(r);

      // Lower response is better, so subtract it. If null, treat as neutral penalty.
      const respPenalty = resp === null ? 5 : resp; // 5 minutes penalty baseline
      return vol * 1.0 + comp * 50.0 + fast * 0.5 - respPenalty * 0.2;
    };

    const rows = allRows.map((r) => ({
      ...r,
      __score: score(r),
      __resp: responseVal(r),
      __comp: safeNum(r.completion_rate_60d, 0) || 0,
      __vol: safeNum(r.accept_count_30d, 0) || 0,
      __fast: safeNum(r.fast_accept_10m_30d, 0) || 0,
    }));

    const sorted = [...rows].sort((a, b) => {
      if (sortKey === "response") {
        // lower is better; nulls last
        if (a.__resp === null && b.__resp === null) return 0;
        if (a.__resp === null) return 1;
        if (b.__resp === null) return -1;
        return a.__resp - b.__resp;
      }
      if (sortKey === "completion") return b.__comp - a.__comp;
      if (sortKey === "volume") return b.__vol - a.__vol;
      if (sortKey === "fast") return b.__fast - a.__fast;
      // default: score
      return b.__score - a.__score;
    });

    // Add computed rank for current sorting
    return sorted.map((r, idx) => ({ ...r, __rank: idx + 1 }));
  }, [allRows, sortKey]);

  const myRank = useMemo(() => {
    if (!my?.business_id) return null;
    const found = scoredRows.find((r) => String(r.business_id) === String(my.business_id));
    return found?.__rank ?? null;
  }, [my, scoredRows]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar
        title="ZIP Leaderboard"
        subtitle="Competition metrics in your service ZIP"
        rightActions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => navigate("/sbo")}
              className="text-xs rounded-2xl px-3 py-2 bg-slate-950/60 border border-slate-800 hover:bg-slate-900/40"
            >
              ← Back to Dashboard
            </button>
            <button
              onClick={load}
              disabled={loading}
              className="text-xs rounded-2xl px-3 py-2 bg-indigo-500/20 border border-indigo-500/40 hover:bg-indigo-500/30 disabled:opacity-60"
              title="Refresh leaderboard"
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        }
      />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {err ? (
          <div className="text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-2xl p-3">{err}</div>
        ) : null}

        <Card
          title="Your ZIP Snapshot"
          subtitle={
            zip
              ? `ZIP ${zip} • Windows: response ${windowDays.response}d, volume ${windowDays.volume}d, completion ${windowDays.completion}d`
              : "Loading ZIP…"
          }
          right={
            <div className="text-[11px] text-slate-500">
              Active business: <span className="font-mono text-slate-200">{activeBusinessId || "auto"}</span>
            </div>
          }
        >
          <div className="grid md:grid-cols-4 gap-3">
            <StatPill label="Your Rank" value={myRank ? `#${myRank}/${scoredRows.length}` : "—"} tone="fuchsia" />
            <StatPill label="Avg Response (30d)" value={my ? fmtMin(my.avg_response_min_30d) : "—"} tone="cyan" />
            <StatPill label="Completion (60d)" value={my ? fmtPct(my.completion_rate_60d) : "—"} tone="emerald" />
            <StatPill label="Accepts (30d)" value={my ? String(my.accept_count_30d ?? 0) : "—"} tone="amber" />
          </div>

          <div className="mt-4 text-xs text-slate-500">
            Leaderboard score favors: <span className="text-slate-200">more accepts</span>,{" "}
            <span className="text-slate-200">higher completion</span>, and{" "}
            <span className="text-slate-200">faster response</span>.
          </div>
        </Card>

        <Card
          title="Leaderboard"
          subtitle="Businesses competing in the same ZIP"
          right={
            <div className="flex gap-2 flex-wrap items-center">
              <SortBtn active={sortKey === "score"} onClick={() => setSortKey("score")}>
                Sort: Score
              </SortBtn>
              <SortBtn active={sortKey === "response"} onClick={() => setSortKey("response")}>
                Speed
              </SortBtn>
              <SortBtn active={sortKey === "completion"} onClick={() => setSortKey("completion")}>
                Completion
              </SortBtn>
              <SortBtn active={sortKey === "volume"} onClick={() => setSortKey("volume")}>
                Volume
              </SortBtn>
              <SortBtn active={sortKey === "fast"} onClick={() => setSortKey("fast")}>
                Fast Accept
              </SortBtn>
            </div>
          }
        >
          <div className="overflow-auto rounded-2xl border border-slate-800">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-slate-950/60">
                <tr className="text-left text-slate-300">
                  <th className="p-3 w-20">Rank</th>
                  <th className="p-3">Business</th>
                  <th className="p-3 w-180">Avg Response</th>
                  <th className="p-3 w-180">Completion</th>
                  <th className="p-3 w-160">Completed</th>
                  <th className="p-3 w-160">Accepts</th>
                  <th className="p-3 w-160">Fast &lt;10m</th>
                </tr>
              </thead>
              <tbody>
                {scoredRows.length ? (
                  scoredRows.map((r) => (
                    <tr
                      key={String(r.business_id)}
                      className={cx(
                        "border-t border-slate-800",
                        r.__isMine
                          ? "bg-fuchsia-500/10 shadow-[inset_0_0_0_1px_rgba(217,70,239,0.25)]"
                          : "bg-transparent"
                      )}
                    >
                      <td className="p-3 font-semibold text-slate-100">#{r.__rank}</td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-100">
                          {r.business_name || `Business #${r.business_id}`}
                          {r.__isMine ? <span className="ml-2 text-[10px] text-fuchsia-200">YOU</span> : null}
                        </div>
                        <div className="text-[11px] text-slate-500">ID: {r.business_id}</div>
                      </td>
                      <td className="p-3">{fmtMin(r.avg_response_min_30d)}</td>
                      <td className="p-3">{fmtPct(r.completion_rate_60d)}</td>
                      <td className="p-3">{String(r.jobs_completed_30d ?? 0)}</td>
                      <td className="p-3">{String(r.accept_count_30d ?? 0)}</td>
                      <td className="p-3">{String(r.fast_accept_10m_30d ?? 0)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="p-4 text-slate-400" colSpan={7}>
                      {loading ? "Loading leaderboard…" : "No businesses found for this ZIP yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-[11px] text-slate-500">
            Tip: This page is a retention hook. Later we can add “How to rank up” actions (dispatch settings, response SLA, completion streaks).
          </div>
        </Card>
      </main>
    </div>
  );
}