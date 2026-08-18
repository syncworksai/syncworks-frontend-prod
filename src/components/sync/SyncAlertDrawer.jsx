import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, CalendarDays, CheckCheck, ChevronRight, CircleDollarSign, Dumbbell, Mail, RefreshCw, Settings2, ShieldCheck, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";

function safeList(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

function sourceIcon(source) {
  const key = String(source || "SYSTEM").toUpperCase();
  if (key === "FINANCE") return CircleDollarSign;
  if (key === "HEALTH") return Dumbbell;
  if (["CALENDAR", "TRAVEL"].includes(key)) return CalendarDays;
  return Bell;
}

function severityClass(severity, read) {
  if (read) return "border-white/10 bg-slate-950/70";
  const key = String(severity || "MEDIUM").toUpperCase();
  if (key === "CRITICAL") return "border-rose-400/35 bg-rose-500/10";
  if (key === "HIGH") return "border-amber-400/30 bg-amber-500/10";
  if (key === "LOW") return "border-slate-700 bg-slate-950/70";
  return "border-cyan-400/25 bg-cyan-500/[.07]";
}

function Toggle({ label, detail, value, disabled, onChange }) {
  return <button type="button" disabled={disabled} onClick={() => onChange(!value)} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-left disabled:opacity-60"><div><div className="text-xs font-black text-white">{label}</div><div className="mt-1 text-[10px] leading-4 text-slate-500">{detail}</div></div><span className={`relative h-7 w-12 shrink-0 rounded-full ${value ? "bg-cyan-500" : "bg-slate-700"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${value ? "left-6" : "left-1"}`} /></span></button>;
}

export default function SyncAlertDrawer({ open, onClose, onCountChange }) {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState({ total: 0, unread: 0, by_source: {}, by_severity: {} });
  const [preferences, setPreferences] = useState(null);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [items, totals, prefs] = await Promise.all([
        api.get("/me/notifications/", { params: { sync_alerts: true, archived: false } }),
        api.get("/me/notifications/summary/"),
        api.get("/communication-preferences/current/", { params: { scope: "PERSONAL" } }),
      ]);
      const nextSummary = totals.data || {};
      setAlerts(safeList(items.data));
      setSummary(nextSummary);
      setPreferences(prefs.data || null);
      onCountChange?.(Number(nextSummary.unread || 0));
    } catch (e) {
      setError(e?.response?.data?.detail || "Could not load SYNC alerts.");
    } finally { setLoading(false); }
  }, [onCountChange]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const visible = useMemo(() => alerts.filter((item) => filter === "ALL" || String(item?.data?.source || "SYSTEM").toUpperCase() === filter), [alerts, filter]);
  const highCount = Number(summary?.by_severity?.CRITICAL || 0) + Number(summary?.by_severity?.HIGH || 0);

  async function refreshNow() {
    setRefreshing(true);
    try { await api.post("/me/notifications/refresh-sync-alerts/", {}); await load(); }
    catch (e) { setError(e?.response?.data?.detail || "Could not refresh alerts."); }
    finally { setRefreshing(false); }
  }

  async function markRead(item) {
    await api.post(`/me/notifications/${item.id}/read/`, {});
    await load();
  }

  async function archive(item) {
    await api.post(`/me/notifications/${item.id}/archive/`, {});
    await load();
  }

  async function markAllRead() {
    await api.post("/me/notifications/mark-all-read/", {});
    await load();
  }

  async function patchPreference(field, value) {
    setSaving(true);
    try {
      const response = await api.patch("/communication-preferences/current/?scope=PERSONAL", { scope: "PERSONAL", [field]: value });
      setPreferences(response.data);
    } catch (e) { setError(e?.response?.data?.detail || "Could not update alert preferences."); }
    finally { setSaving(false); }
  }

  function openItem(item) {
    if (!item.is_read) markRead(item).catch(() => {});
    const path = item?.data?.deep_link || "/sync";
    onClose?.();
    navigate(path);
  }

  if (!open) return null;
  return <div className="fixed inset-0 z-[120] flex justify-end bg-black/65 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
    <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-cyan-400/15 bg-[#020617] shadow-2xl">
      <div className="sticky top-0 z-10 border-b border-white/10 bg-[#020617]/95 p-4 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-cyan-200"><Bell className="h-4 w-4" />SYNC Alert Center</div><h2 className="mt-1 text-xl font-black text-white">What needs your attention.</h2><div className="mt-1 text-xs text-slate-500">{summary.unread || 0} unread · {highCount} high priority</div></div><button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[.04] text-slate-300"><X className="h-5 w-5" /></button></div>
        <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={refreshNow} disabled={refreshing} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-3 text-xs font-black text-white"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh SYNC</button>{summary.unread ? <button type="button" onClick={markAllRead} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 text-xs font-black text-slate-300"><CheckCheck className="h-4 w-4" />Read all</button> : null}<button type="button" onClick={() => setSettingsOpen((v) => !v)} className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 text-xs font-black text-slate-300"><Settings2 className="h-4 w-4" />Settings</button></div>
      </div>

      <div className="space-y-4 p-4 pb-28">
        {settingsOpen && preferences ? <section className="rounded-3xl border border-violet-400/20 bg-violet-500/[.05] p-4"><div className="text-sm font-black text-white">Delivery preferences</div><div className="mt-3 space-y-2"><Toggle label="Automatic updates" detail="Maintain the alert inbox in the background." value={preferences.automatic_updates_enabled} disabled={saving} onChange={(v) => patchPreference("automatic_updates_enabled", v)} /><Toggle label="Email high-priority alerts" detail="Immediate email for high/critical items outside quiet hours." value={preferences.email_notifications_enabled} disabled={saving} onChange={(v) => patchPreference("email_notifications_enabled", v)} /><Toggle label="Push notifications" detail="Payload-ready for native mobile push activation." value={preferences.push_notifications_enabled} disabled={saving} onChange={(v) => patchPreference("push_notifications_enabled", v)} /><Toggle label="Quiet hours" detail={`${preferences.quiet_hours_start || "21:00"} – ${preferences.quiet_hours_end || "07:00"} · ${preferences.timezone || "local"}`} value={preferences.quiet_hours_enabled} disabled={saving} onChange={(v) => patchPreference("quiet_hours_enabled", v)} /><Toggle label="Low-priority digest" detail="Keep routine informational alerts out of immediate email." value={preferences.email_digest_for_low_priority} disabled={saving} onChange={(v) => patchPreference("email_digest_for_low_priority", v)} /></div><div className="mt-3 flex items-center gap-2 text-[10px] leading-4 text-slate-500"><Mail className="h-3.5 w-3.5" />High-priority email is one-time and quiet-hours aware. Native push provider comes with mobile release.</div></section> : null}

        {error ? <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</div> : null}

        <div className="grid grid-cols-3 gap-2"><div className="rounded-2xl border border-white/10 bg-white/[.025] p-3"><div className="text-[9px] font-black uppercase tracking-wider text-slate-500">Active</div><div className="mt-1 text-xl font-black text-white">{summary.total || 0}</div></div><div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/[.06] p-3"><div className="text-[9px] font-black uppercase tracking-wider text-cyan-300">Unread</div><div className="mt-1 text-xl font-black text-white">{summary.unread || 0}</div></div><div className="rounded-2xl border border-amber-400/20 bg-amber-500/[.06] p-3"><div className="text-[9px] font-black uppercase tracking-wider text-amber-300">High</div><div className="mt-1 text-xl font-black text-white">{highCount}</div></div></div>

        <div className="flex gap-2 overflow-x-auto pb-1">{["ALL", "FINANCE", "HEALTH", "CALENDAR", "TRAVEL"].map((value) => <button key={value} type="button" onClick={() => setFilter(value)} className={`whitespace-nowrap rounded-full border px-3 py-2 text-[10px] font-black ${filter === value ? "border-cyan-300/30 bg-cyan-500/10 text-cyan-100" : "border-white/10 bg-white/[.025] text-slate-500"}`}>{value === "ALL" ? "All" : value}</button>)}</div>

        {loading ? <div className="p-6 text-center text-sm text-slate-500">Loading alerts…</div> : visible.length ? <div className="space-y-3">{visible.map((item) => { const data = item.data || {}; const Icon = sourceIcon(data.source); return <article key={item.id} className={`rounded-3xl border p-4 ${severityClass(data.severity, item.is_read)}`}><div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/20"><Icon className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-[.12em] text-slate-400"><span>{data.source || "SYNC"}</span><span>{data.severity || "MEDIUM"}</span>{!item.is_read ? <span className="text-cyan-200">NEW</span> : null}</div><div className="mt-1.5 font-black text-white">{item.title}</div><p className="mt-1 text-sm leading-5 text-slate-300">{item.body}</p><div className="mt-3 flex flex-wrap gap-2">{data.deep_link ? <button type="button" onClick={() => openItem(item)} className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-cyan-300/20 bg-cyan-500/10 px-3 text-[11px] font-black text-cyan-100">Open <ChevronRight className="h-3.5 w-3.5" /></button> : null}{!item.is_read ? <button type="button" onClick={() => markRead(item)} className="min-h-9 rounded-xl border border-white/10 px-3 text-[11px] font-black text-slate-300">Read</button> : null}<button type="button" onClick={() => archive(item)} className="min-h-9 rounded-xl border border-white/10 px-3 text-[11px] font-black text-slate-500">Archive</button></div></div></div></article>; })}</div> : <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center"><ShieldCheck className="mx-auto h-7 w-7 text-emerald-300" /><div className="mt-3 font-black text-white">Nothing active here.</div><div className="mt-1 text-sm text-slate-500">SYNC will surface a deduplicated alert when a connected module needs attention.</div></div>}
        {highCount ? <div className="flex items-start gap-2 rounded-2xl border border-amber-400/20 bg-amber-500/[.06] p-3 text-xs leading-5 text-amber-100"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />High-priority items are candidates for email escalation when enabled and outside quiet hours.</div> : null}
      </div>
    </aside>
  </div>;
}
