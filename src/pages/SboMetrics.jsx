// src/pages/SboMetrics.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import ModeBar from "../components/ModeBar";
import { useAuth } from "../auth/AuthContext";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-[11px] text-white/50">{label}</div>
      <div className="mt-1 text-lg font-extrabold text-white">{value}</div>
      {hint ? <div className="mt-1 text-xs text-white/60">{hint}</div> : null}
    </div>
  );
}

function Pill({ children, tone = "slate" }) {
  const cls =
    tone === "emerald"
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
      : tone === "cyan"
      ? "border-cyan-500/25 bg-cyan-500/10 text-cyan-200"
      : "border-white/10 bg-black/20 text-white/70";

  return (
    <span className={cx("inline-flex items-center rounded-full border px-2 py-1 text-[11px]", cls)}>
      {children}
    </span>
  );
}

export default function SboMetrics() {
  const navigate = useNavigate();
  const { activeBusinessId } = useAuth();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const res = await api.get("/tickets/metrics/zip/");
      setData(res.data || null);
    } catch (e) {
      setData(null);
      setErr(e?.response?.data?.detail || "Failed to load metrics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const fn = () => load();
    window.addEventListener("sw:activeBusinessChanged", fn);
    return () => window.removeEventListener("sw:activeBusinessChanged", fn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const my = data?.my || {};
  const zip = data?.zip || "";
  const leaderboard = Array.isArray(data?.leaderboard) ? data.leaderboard : [];

  const myRow = useMemo(() => {
    return leaderboard.find((r) => String(r.business_id) === String(my.business_id));
  }, [leaderboard, my.business_id]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar
        title="CEO Metrics"
        subtitle="See how you stack up against other businesses in your ZIP."
        rightActions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/sbo")}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10"
            >
              ← Back
            </button>
            <button
              onClick={load}
              disabled={loading}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10 disabled:opacity-50"
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        }
      />

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-5">
        {err ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
            {err}
          </div>
        ) : null}

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-lg font-extrabold">ZIP Leaderboard</div>
              <div className="mt-1 text-sm text-white/60">
                Active business: <span className="font-mono text-white/85">{activeBusinessId || "auto"}</span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Pill tone="cyan">ZIP: {zip || "—"}</Pill>
              <Pill>Windows: 30d speed • 30d volume • 60d completion</Pill>
            </div>
          </div>

          {!zip ? (
            <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-200">
              No ZIP found yet. Create at least one ticket with <b>service_zip</b>/<b>base_zip</b> (or set business zip)
              to enable leaderboard.
            </div>
          ) : null}
        </div>

        {/* My snapshot */}
        <div className="grid gap-3 md:grid-cols-4">
          <StatCard
            label="Avg Response (30d)"
            value={my.avg_response_min_30d != null ? `${Number(my.avg_response_min_30d).toFixed(1)} min` : "—"}
            hint={myRow?.rank_response ? `Rank #${myRow.rank_response} in ${zip}` : "Rank unavailable"}
          />
          <StatCard
            label="Completion Rate (60d)"
            value={my.completion_rate_60d != null ? `${Math.round(Number(my.completion_rate_60d) * 100)}%` : "—"}
            hint={myRow?.rank_completion ? `Rank #${myRow.rank_completion} in ${zip}` : "Rank unavailable"}
          />
          <StatCard
            label="Jobs Completed (30d)"
            value={my.jobs_completed_30d != null ? String(my.jobs_completed_30d) : "—"}
            hint={myRow?.rank_volume ? `Rank #${myRow.rank_volume} in ${zip}` : "Rank unavailable"}
          />
          <StatCard
            label="Fast Accepts ≤10m (30d)"
            value={my.fast_accept_10m_30d != null ? String(my.fast_accept_10m_30d) : "—"}
            hint="Drives marketplace liquidity"
          />
        </div>

        {/* Leaderboard */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <div className="font-semibold">Leaderboard</div>
              <div className="text-xs text-white/60 mt-1">
                Lower response time ranks higher. Higher completion + volume ranks higher.
              </div>
            </div>
          </div>

          <div className="mt-4 overflow-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="text-white/60">
                <tr className="border-b border-white/10">
                  <th className="py-2 text-left">Business</th>
                  <th className="py-2 text-left">Response (30d)</th>
                  <th className="py-2 text-left">Rank</th>
                  <th className="py-2 text-left">Completion (60d)</th>
                  <th className="py-2 text-left">Rank</th>
                  <th className="py-2 text-left">Completed (30d)</th>
                  <th className="py-2 text-left">Rank</th>
                  <th className="py-2 text-left">Fast ≤10m</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((r) => {
                  const isMe = String(r.business_id) === String(my.business_id);
                  return (
                    <tr
                      key={r.business_id}
                      className={cx("border-b border-white/5", isMe ? "bg-emerald-500/10" : "hover:bg-white/5")}
                    >
                      <td className="py-3 pr-2">
                        <div className="font-semibold text-white">
                          {r.business_name}{" "}
                          {isMe ? <span className="text-emerald-200 text-xs">(You)</span> : null}
                        </div>
                        <div className="text-xs text-white/50">#{r.business_id}</div>
                      </td>

                      <td className="py-3 pr-2">
                        {r.avg_response_min_30d != null ? `${Number(r.avg_response_min_30d).toFixed(1)}m` : "—"}
                      </td>
                      <td className="py-3 pr-2">{r.rank_response || "—"}</td>

                      <td className="py-3 pr-2">
                        {r.completion_rate_60d != null ? `${Math.round(Number(r.completion_rate_60d) * 100)}%` : "—"}
                      </td>
                      <td className="py-3 pr-2">{r.rank_completion || "—"}</td>

                      <td className="py-3 pr-2">{r.jobs_completed_30d ?? "—"}</td>
                      <td className="py-3 pr-2">{r.rank_volume || "—"}</td>

                      <td className="py-3 pr-2">{r.fast_accept_10m_30d ?? "—"}</td>
                    </tr>
                  );
                })}

                {!leaderboard.length ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-white/60">
                      No leaderboard data yet for ZIP {zip || "—"}.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}