import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronRight, LoaderCircle, RefreshCw, Sparkles } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { getSyncDailyState } from "../../api/syncAi";

const PRIORITY = {
  urgent: "border-rose-400/25 bg-rose-500/[.08] text-rose-100",
  high: "border-amber-400/25 bg-amber-500/[.08] text-amber-100",
  normal: "border-cyan-400/20 bg-cyan-500/[.06] text-cyan-100",
  low: "border-slate-700 bg-slate-900/60 text-slate-300",
};

function timeLabel(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function SyncDailyIntelligenceBar() {
  const location = useLocation();
  const nav = useNavigate();
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const enabled = location.pathname === "/customer" || location.pathname === "/customer/dashboard";

  async function load() {
    if (!enabled) return;
    setLoading(true);
    setError("");
    try {
      setState(await getSyncDailyState());
    } catch (err) {
      setError(err?.response?.data?.detail || "SYNC daily intelligence is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [enabled]);

  const attention = useMemo(
    () => (Array.isArray(state?.needs_attention) ? state.needs_attention.slice(0, 3) : []),
    [state]
  );
  const nextEvent = state?.calendar?.next_event || null;
  const unread = Number(state?.inbox?.total_unread || 0);

  if (!enabled) return null;

  return (
    <section className="relative mx-auto mt-4 w-[calc(100%-1.5rem)] max-w-7xl overflow-hidden rounded-[1.75rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_85%_20%,rgba(139,92,246,.16),transparent_35%),rgba(2,6,23,.88)] p-4 shadow-[0_18px_55px_rgba(0,0,0,.28)] sm:w-[calc(100%-2.5rem)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">
            <Sparkles className="h-4 w-4" /> SYNC Daily Intelligence
          </div>
          <div className="mt-1 text-lg font-black text-white">
            {loading ? "Building your day…" : state?.recommended_next?.title || "Your connected day"}
          </div>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">
            {loading
              ? "Checking calendar, messages, money, health, requests and connected workspaces."
              : state?.recommended_next?.detail || error || "Nothing connected needs immediate attention."}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={load} disabled={loading} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-slate-300 disabled:opacity-50" aria-label="Refresh daily intelligence">
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </button>
          <button type="button" onClick={() => nav("/sync")} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 text-xs font-black text-white">
            Open SYNC <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!loading && !error ? (
        <div className="mt-4 grid gap-2 md:grid-cols-3">
          {attention.length ? attention.map((item, index) => (
            <button key={`${item.category || "item"}-${index}`} type="button" onClick={() => item?.action?.url && nav(item.action.url)} className={`rounded-2xl border p-3 text-left ${PRIORITY[item.priority] || PRIORITY.normal}`}>
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <div className="truncate text-xs font-black text-white">{item.title}</div>
                  <div className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-400">{item.detail}</div>
                </div>
              </div>
            </button>
          )) : (
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[.06] p-3 md:col-span-2">
              <div className="flex items-center gap-2 text-xs font-black text-emerald-100"><CheckCircle2 className="h-4 w-4" />No immediate action required</div>
              <div className="mt-1 text-[11px] text-slate-400">SYNC will keep checking your connected day as activity changes.</div>
            </div>
          )}
          <button type="button" onClick={() => nav("/calendar")} className="rounded-2xl border border-violet-400/20 bg-violet-500/[.06] p-3 text-left">
            <div className="flex items-center gap-2 text-xs font-black text-white"><CalendarDays className="h-4 w-4 text-violet-200" />Next on calendar</div>
            <div className="mt-1 text-[11px] leading-4 text-slate-400">
              {nextEvent ? `${timeLabel(nextEvent.start_at)} · ${nextEvent.title}` : "No remaining event today"}
              {unread ? ` · ${unread} unread` : ""}
            </div>
          </button>
        </div>
      ) : null}

      {error && !loading ? (
        <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-500/[.06] px-3 py-2 text-xs text-amber-100">{error}</div>
      ) : null}
    </section>
  );
}
