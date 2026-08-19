import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  LoaderCircle,
  RefreshCw,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getSyncAssistantProfile,
  getSyncDailyState,
  patchSyncAssistantProfile,
} from "../../api/syncAi";

const PRIORITY = {
  urgent: "border-rose-400/25 bg-rose-500/[.08] text-rose-100",
  high: "border-amber-400/25 bg-amber-500/[.08] text-amber-100",
  normal: "border-cyan-400/20 bg-cyan-500/[.06] text-cyan-100",
  low: "border-slate-700 bg-slate-900/60 text-slate-300",
};

const DEFAULT_PROACTIVE = {
  enabled: true,
  morning_briefing: true,
  morning_time: "07:30",
  evening_wrap: true,
  evening_time: "20:30",
  departure_alerts: true,
  bill_reminders: true,
  health_reminders: true,
  inbox_followups: true,
};

function timeLabel(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function itemKey(item = {}) {
  return `${String(item.category || "item").toLowerCase()}:${String(item.title || "attention").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function startOfTomorrowIso() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function ToggleRow({ label, detail, checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[.025] p-3 text-left disabled:opacity-50"
    >
      <div>
        <div className="text-xs font-black text-white">{label}</div>
        <div className="mt-1 text-[11px] leading-4 text-slate-500">{detail}</div>
      </div>
      <span className={`relative h-6 w-11 shrink-0 rounded-full border transition ${checked ? "border-emerald-300/30 bg-emerald-500/25" : "border-slate-700 bg-slate-900"}`}>
        <span className={`absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white transition ${checked ? "left-[22px]" : "left-1"}`} />
      </span>
    </button>
  );
}

export default function SyncDailyIntelligenceBar() {
  const location = useLocation();
  const nav = useNavigate();
  const [state, setState] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const enabled = location.pathname === "/customer" || location.pathname === "/customer/dashboard";

  async function load() {
    if (!enabled) return;
    setLoading(true);
    setError("");
    try {
      const [daily, assistantProfile] = await Promise.all([
        getSyncDailyState(),
        getSyncAssistantProfile(),
      ]);
      setState(daily);
      setProfile(assistantProfile);
    } catch (err) {
      setError(err?.response?.data?.detail || "SYNC daily intelligence is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [enabled]);

  const actionState = profile?.modules?.sync_action_state || {};
  const proactive = { ...DEFAULT_PROACTIVE, ...(profile?.modules?.sync_proactive || {}) };
  const now = Date.now();

  const attention = useMemo(() => {
    const rows = Array.isArray(state?.needs_attention) ? state.needs_attention : [];
    return rows.filter((item) => {
      const saved = actionState[itemKey(item)] || {};
      if (saved.dismissed_until) {
        const until = new Date(saved.dismissed_until).getTime();
        if (Number.isFinite(until) && until > now) return false;
      }
      if (saved.snoozed_until) {
        const until = new Date(saved.snoozed_until).getTime();
        if (Number.isFinite(until) && until > now) return false;
      }
      return true;
    }).slice(0, 3);
  }, [state, actionState, now]);

  const recommended = attention[0] || state?.recommended_next || null;
  const nextEvent = state?.calendar?.next_event || null;
  const unread = Number(state?.inbox?.total_unread || 0);

  async function saveModules(nextModules) {
    setSaving(true);
    try {
      const updated = await patchSyncAssistantProfile({ modules: nextModules });
      setProfile(updated);
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not save SYNC preferences.");
    } finally {
      setSaving(false);
    }
  }

  async function setItemState(item, patch) {
    const key = itemKey(item);
    const next = {
      ...actionState,
      [key]: { ...(actionState[key] || {}), ...patch },
    };
    await saveModules({ sync_action_state: next });
  }

  async function snooze(item) {
    await setItemState(item, {
      snoozed_until: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      dismissed_until: null,
    });
  }

  async function dismissToday(item) {
    await setItemState(item, {
      dismissed_until: startOfTomorrowIso(),
      snoozed_until: null,
    });
  }

  async function resetHidden() {
    await saveModules({ sync_action_state: {} });
  }

  async function updateProactive(key, value) {
    await saveModules({ sync_proactive: { ...proactive, [key]: value } });
  }

  if (!enabled) return null;

  return (
    <section className="relative mx-auto mt-4 w-[calc(100%-1.5rem)] max-w-7xl overflow-hidden rounded-[1.75rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_85%_20%,rgba(139,92,246,.16),transparent_35%),rgba(2,6,23,.88)] p-4 shadow-[0_18px_55px_rgba(0,0,0,.28)] sm:w-[calc(100%-2.5rem)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">
            <Sparkles className="h-4 w-4" /> SYNC Daily Intelligence
          </div>
          <div className="mt-1 text-lg font-black text-white">
            {loading ? "Building your day…" : recommended?.title || "Your connected day"}
          </div>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">
            {loading
              ? "Checking calendar, messages, money, health, requests and connected workspaces."
              : recommended?.detail || error || "Nothing connected needs immediate attention."}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => setSettingsOpen((value) => !value)} className={`grid h-10 w-10 place-items-center rounded-xl border ${settingsOpen ? "border-violet-300/30 bg-violet-500/15 text-violet-100" : "border-white/10 bg-white/[.04] text-slate-300"}`} aria-label="Proactive SYNC settings">
            <Settings2 className="h-4 w-4" />
          </button>
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
            <div key={`${item.category || "item"}-${index}`} className={`rounded-2xl border p-3 ${PRIORITY[item.priority] || PRIORITY.normal}`}>
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-black text-white">{item.title}</div>
                  <div className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-400">{item.detail}</div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {item?.action?.url ? (
                  <button type="button" onClick={() => nav(item.action.url)} className="rounded-lg border border-white/10 bg-white/[.05] px-2.5 py-1.5 text-[10px] font-black text-white">Open</button>
                ) : null}
                <button type="button" disabled={saving} onClick={() => snooze(item)} className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[.03] px-2.5 py-1.5 text-[10px] font-black text-slate-300 disabled:opacity-50"><Clock3 className="h-3 w-3" />1 hr</button>
                <button type="button" disabled={saving} onClick={() => dismissToday(item)} className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[.03] px-2.5 py-1.5 text-[10px] font-black text-slate-300 disabled:opacity-50"><X className="h-3 w-3" />Done today</button>
              </div>
            </div>
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

      {settingsOpen ? (
        <div className="mt-4 rounded-3xl border border-violet-400/20 bg-violet-500/[.04] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-black text-white"><BellRing className="h-4 w-4 text-violet-200" />Proactive SYNC</div>
              <p className="mt-1 max-w-3xl text-[11px] leading-5 text-slate-400">Control which categories SYNC should surface proactively. Departure alerts already use the connected calendar reminder engine; these preferences also become the source of truth for the next notification-delivery layer.</p>
            </div>
            <button type="button" disabled={saving} onClick={resetHidden} className="rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-[10px] font-black text-slate-300 disabled:opacity-50">Reset hidden items</button>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            <ToggleRow label="Proactive intelligence" detail="Master switch for proactive SYNC recommendations." checked={proactive.enabled} onChange={(value) => updateProactive("enabled", value)} disabled={saving} />
            <ToggleRow label="Departure alerts" detail="Surface leave-time and travel reminders from Calendar." checked={proactive.departure_alerts} onChange={(value) => updateProactive("departure_alerts", value)} disabled={saving || !proactive.enabled} />
            <ToggleRow label="Bill reminders" detail="Prioritize known payments and upcoming obligations." checked={proactive.bill_reminders} onChange={(value) => updateProactive("bill_reminders", value)} disabled={saving || !proactive.enabled} />
            <ToggleRow label="Health reminders" detail="Surface incomplete workouts, nutrition and recovery items." checked={proactive.health_reminders} onChange={(value) => updateProactive("health_reminders", value)} disabled={saving || !proactive.enabled} />
            <ToggleRow label="Inbox follow-ups" detail="Prioritize unread and high-attention conversations." checked={proactive.inbox_followups} onChange={(value) => updateProactive("inbox_followups", value)} disabled={saving || !proactive.enabled} />
            <ToggleRow label="Morning briefing" detail={`Preferred briefing time · ${proactive.morning_time}.`} checked={proactive.morning_briefing} onChange={(value) => updateProactive("morning_briefing", value)} disabled={saving || !proactive.enabled} />
            <ToggleRow label="Evening wrap-up" detail={`Preferred wrap-up time · ${proactive.evening_time}.`} checked={proactive.evening_wrap} onChange={(value) => updateProactive("evening_wrap", value)} disabled={saving || !proactive.enabled} />
          </div>
          <div className="mt-3 text-[10px] font-bold text-slate-500">Saved to your SyncWorks account, so the controls follow you across devices.</div>
        </div>
      ) : null}

      {error && !loading ? (
        <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-500/[.06] px-3 py-2 text-xs text-amber-100">{error}</div>
      ) : null}
    </section>
  );
}
