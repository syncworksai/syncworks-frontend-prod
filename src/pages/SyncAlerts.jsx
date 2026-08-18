import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, CalendarDays, CheckCheck, ChevronRight, CircleDollarSign, Dumbbell, Mail, RefreshCw, Settings2, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ModeBar from "../components/ModeBar";
import api from "../api/client";

function safeList(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

function tone(severity) {
  const key = String(severity || "MEDIUM").toUpperCase();
  if (key === "CRITICAL") return "border-rose-400/35 bg-rose-500/10 text-rose-100";
  if (key === "HIGH") return "border-amber-400/30 bg-amber-500/10 text-amber-100";
  if (key === "LOW") return "border-slate-600 bg-slate-900/70 text-slate-300";
  return "border-cyan-400/20 bg-cyan-500/[.07] text-cyan-100";
}

function sourceIcon(source) {
  const key = String(source || "SYSTEM").toUpperCase();
  if (key === "FINANCE") return CircleDollarSign;
  if (key === "HEALTH") return Dumbbell;
  if (["CALENDAR", "TRAVEL"].includes(key)) return CalendarDays;
  return Bell;
}

function AlertRow({ alert, onRead, onArchive, onOpen }) {
  const data = alert.data || {};
  const Icon = sourceIcon(data.source);
  const severity = data.severity || "MEDIUM";
  return (
    <article className={`rounded-[1.55rem] border p-4 ${alert.is_read ? "border-white/10 bg-slate-950/45" : tone(severity)}`}>
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-black/20"><Icon className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-[.16em] opacity-70">{data.source || "SYNC"}</span>
            <span className="rounded-full border border-white/10 bg-black/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-[.12em]">{severity}</span>
            {!alert.is_read ? <span className="rounded-full bg-cyan-300 px-2 py-0.5 text-[9px] font-black uppercase tracking-[.12em] text-slate-950">New</span> : null}
          </div>
          <h3 className="mt-2 text-base font-black text-white">{alert.title || "SYNC alert"}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-300/85">{alert.body}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {data.deep_link ? <button type="button" onClick={() => onOpen(alert)} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-cyan-300/20 bg-cyan-500/10 px-3 text-xs font-black text-cyan-100">Open <ChevronRight className="h-3.5 w-3.5" /></button> : null}
            {!alert.is_read ? <button type="button" onClick={() => onRead(alert)} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[.04] px-3 text-xs font-black text-slate-300"><CheckCheck className="h-3.5 w-3.5" />Read</button> : null}
            <button type="button" onClick={() => onArchive(alert)} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[.025] px-3 text-xs font-black text-slate-500"><Trash2 className="h-3.5 w-3.5" />Archive</button>
            <span className="ml-auto text-[10px] text-slate-500">{alert.created_at ? new Date(alert.created_at).toLocaleString() : ""}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

function Toggle({ label, description, value, onChange, disabled }) {
  return (
    <button type="button" disabled={disabled} onClick={() => onChange(!value)} className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-left disabled:opacity-60">
      <div><div className="text-sm font-black text-white">{label}</div><div className="mt-0.5 text-xs leading-5 text-slate-500">{description}</div></div>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${value ? "bg-cyan-500" : "bg-slate-700"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${value ? "left-6" : "left-1"}`} /></span>
    </button>
  );
}

export default function SyncAlerts() {
  const nav = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState({ total: 0, unread: 0, by_source: {}, by_severity: {} });
  const [preferences, setPreferences] = useState(null);
  const [filter, setFilter] = useState("ALL");
  const [busy, setBusy] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const [items, totals, prefs] = await Promise.all([
        api.get("/me/notifications/", { params: { sync_alerts: true, archived: false } }),
        api.get("/me/notifications/summary/"),
        api.get("/communication-preferences/current/", { params: { scope: "PERSONAL" } }),
      ]);
      setAlerts(safeList(items.data));
      setSummary(totals.data || {});
      setPreferences(prefs.data || null);
    } catch (e) {
      setError(e?.response?.data?.detail || "Could not load SYNC alerts.");
    } finally { setBusy(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => alerts.filter((item) => filter === "ALL" || String(item?.data?.source || "SYSTEM").toUpperCase() === filter), [alerts, filter]);
  const highCount = Number(summary?.by_severity?.CRITICAL || 0) + Number(summary?.by_severity?.HIGH || 0);

  async function refreshNow() {
    setRefreshing(true);
    setError("");
    try {
      await api.post("/me/notifications/refresh-sync-alerts/", {});
      await load();
    } catch (e) { setError(e?.response?.data?.detail || "Could not refresh SYNC alerts."); }
    finally { setRefreshing(false); }
  }

  async function readAlert(alert) {
    await api.post(`/me/notifications/${alert.id}/read/`, {});
    setAlerts((rows) => rows.map((row) => row.id === alert.id ? { ...row, is_read: true } : row));
    setSummary((value) => ({ ...value, unread: Math.max(0, Number(value.unread || 0) - 1) }));
  }

  async function archiveAlert(alert) {
    await api.post(`/me/notifications/${alert.id}/archive/`, {});
    setAlerts((rows) => rows.filter((row) => row.id !== alert.id));
    await load();
  }

  async function markAllRead() {
    await api.post("/me/notifications/mark-all-read/", {});
    await load();
  }

  async function patchPreference(field, value) {
    if (!preferences) return;
    setSaving(true);
    try {
      const response = await api.patch("/communication-preferences/current/?scope=PERSONAL", { [field]: value, scope: "PERSONAL" });
      setPreferences(response.data);
    } catch (e) { setError(e?.response?.data?.detail || "Could not update alert preferences."); }
    finally { setSaving(false); }
  }

  function openAlert(alert) {
    if (!alert.is_read) readAlert(alert).catch(() => {});
    nav(alert?.data?.deep_link || "/sync");
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar title="SYNC Alerts" subtitle="One attention center across your life" />
      <main className="mx-auto max-w-7xl space-y-4 px-4 py-5 pb-28 sm:py-6 lg:pb-8">
        <section className="overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_85%_0%,rgba(139,92,246,.18),transparent_32%),linear-gradient(145deg,rgba(7,17,31,.98),rgba(2,6,23,.98))] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-cyan-200"><Sparkles className="h-4 w-4" />Central attention engine</div><h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">What actually needs your attention.</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Finance, Health, Calendar and Travel feed one deduplicated inbox. High-priority items can escalate by email; push is already preference-ready for the mobile app.</p></div>
            <button type="button" onClick={refreshNow} disabled={refreshing} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 text-xs font-black text-white disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh SYNC</button>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Active</div><div className="mt-1 text-2xl font-black text-white">{summary.total || 0}</div></div>
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/[.06] p-3"><div className="text-[10px] font-black uppercase tracking-wider text-cyan-300">Unread</div><div className="mt-1 text-2xl font-black text-white">{summary.unread || 0}</div></div>
            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/[.06] p-3"><div className="text-[10px] font-black uppercase tracking-wider text-amber-300">High priority</div><div className="mt-1 text-2xl font-black text-white">{highCount}</div></div>
            <div className="rounded-2xl border border-violet-400/20 bg-violet-500/[.06] p-3"><div className="text-[10px] font-black uppercase tracking-wider text-violet-300">Sources</div><div className="mt-1 text-2xl font-black text-white">{Object.keys(summary.by_source || {}).length}</div></div>
          </div>
        </section>

        {error ? <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</div> : null}

        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <section className="rounded-[1.8rem] border border-white/10 bg-slate-950/50 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">Alert inbox</div><h2 className="mt-1 text-xl font-black text-white">Prioritized by SYNC</h2></div>{summary.unread ? <button type="button" onClick={markAllRead} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 text-xs font-black text-slate-300"><CheckCheck className="h-4 w-4" />Mark all read</button> : null}</div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">{["ALL", "FINANCE", "HEALTH", "CALENDAR", "TRAVEL"].map((value) => <button key={value} type="button" onClick={() => setFilter(value)} className={`whitespace-nowrap rounded-full border px-3 py-2 text-[10px] font-black ${filter === value ? "border-cyan-300/30 bg-cyan-500/10 text-cyan-100" : "border-white/10 bg-white/[.025] text-slate-500"}`}>{value === "ALL" ? "All" : value}</button>)}</div>
            <div className="mt-4 space-y-3">{busy ? <div className="p-6 text-sm text-slate-500">Loading alerts…</div> : visible.length ? visible.map((alert) => <AlertRow key={alert.id} alert={alert} onRead={readAlert} onArchive={archiveAlert} onOpen={openAlert} />) : <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center"><ShieldCheck className="mx-auto h-7 w-7 text-emerald-300" /><div className="mt-3 font-black text-white">Nothing active in this view.</div><div className="mt-1 text-sm text-slate-500">SYNC will add something here when a connected module needs attention.</div></div>}</div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-[1.8rem] border border-white/10 bg-slate-950/55 p-4">
              <div className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-violet-300" /><div><div className="text-sm font-black text-white">Alert preferences</div><div className="text-xs text-slate-500">Personal SYNC channels</div></div></div>
              {preferences ? <div className="mt-4 space-y-2">
                <Toggle label="Automatic updates" description="Let SYNC maintain this inbox in the background." value={preferences.automatic_updates_enabled} disabled={saving} onChange={(value) => patchPreference("automatic_updates_enabled", value)} />
                <Toggle label="Email high-priority alerts" description="Critical and high-priority alerts can escalate by email." value={preferences.email_notifications_enabled} disabled={saving} onChange={(value) => patchPreference("email_notifications_enabled", value)} />
                <Toggle label="Push notifications" description="Ready for native mobile push once the app-store push provider is connected." value={preferences.push_notifications_enabled} disabled={saving} onChange={(value) => patchPreference("push_notifications_enabled", value)} />
                <Toggle label="Quiet hours" description={`${preferences.quiet_hours_start || "21:00"} – ${preferences.quiet_hours_end || "07:00"} · ${preferences.timezone || "local"}`} value={preferences.quiet_hours_enabled} disabled={saving} onChange={(value) => patchPreference("quiet_hours_enabled", value)} />
                <Toggle label="Low-priority email digest" description="Hold routine Health and informational alerts out of immediate email." value={preferences.email_digest_for_low_priority} disabled={saving} onChange={(value) => patchPreference("email_digest_for_low_priority", value)} />
              </div> : <div className="mt-4 text-sm text-slate-500">Loading preferences…</div>}
            </section>
            <section className="rounded-[1.8rem] border border-cyan-400/15 bg-cyan-500/[.04] p-4"><div className="flex items-center gap-2 text-sm font-black text-white"><Mail className="h-4 w-4 text-cyan-200" />Delivery behavior</div><div className="mt-3 space-y-2 text-xs leading-5 text-slate-400"><p><b className="text-slate-200">In-app:</b> central source of truth.</p><p><b className="text-slate-200">Email:</b> high/critical alerts once, respecting quiet hours.</p><p><b className="text-slate-200">Push:</b> preference and payload are ready; native provider activation comes with the mobile-app release.</p></div></section>
            {highCount ? <section className="rounded-[1.8rem] border border-amber-400/20 bg-amber-500/[.06] p-4"><div className="flex items-center gap-2 text-sm font-black text-amber-100"><AlertTriangle className="h-4 w-4" />{highCount} high-priority item{highCount === 1 ? "" : "s"}</div><p className="mt-2 text-xs leading-5 text-amber-100/70">Review these first. SYNC uses the same priority data for briefings and email escalation.</p></section> : null}
          </aside>
        </div>
      </main>
    </div>
  );
}
