import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bell,
  CheckCheck,
  Mail,
  RefreshCw,
  Settings2,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getNotifications,
  getNotificationSettings,
  getNotificationUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  patchNotificationSettings,
} from "../api/syncNotifications";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function targetFor(notification) {
  const data = notification?.data || {};
  const direct = data.target_path || data.deep_link || notification?.target_path || notification?.url;
  if (typeof direct === "string" && direct.startsWith("/")) return direct;
  const ticketId = data.ticket_id || notification?.ticket_id;
  if (ticketId) return `/customer/tickets/${ticketId}`;
  return "/customer";
}

function sourceLabel(notification) {
  return String(notification?.data?.source || notification?.type || "SYNC").replaceAll("_", " ");
}

function deliveryLabel(notification) {
  const delivery = notification?.data?.delivery || {};
  const labels = [];
  if (delivery.email === "DELIVERED") labels.push("Email sent");
  if (delivery.push === "READY") labels.push("Push ready");
  if (delivery.push === "WAITING_FOR_DEVICE") labels.push("Push awaiting device");
  return labels.join(" · ");
}

function Toggle({ label, detail, checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-3 text-left disabled:opacity-50"
    >
      <span className="min-w-0">
        <span className="block text-xs font-black text-white">{label}</span>
        <span className="mt-1 block text-[11px] leading-4 text-slate-500">{detail}</span>
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full border transition ${checked ? "border-emerald-300/30 bg-emerald-500/25" : "border-slate-700 bg-slate-900"}`}>
        <span className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white transition ${checked ? "left-[22px]" : "left-1"}`} />
      </span>
    </button>
  );
}

export default function NotificationsBell() {
  const nav = useNavigate();
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [settings, setSettings] = useState(null);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [position, setPosition] = useState({ top: 60, left: 12, width: 380 });

  const visibleUnread = useMemo(
    () => Math.max(unread, items.filter((item) => !item?.is_read).length),
    [items, unread]
  );

  async function loadCount() {
    try {
      const result = await getNotificationUnreadCount();
      setUnread(Number(result?.unread || 0));
    } catch {
      // Bell remains usable even if the count endpoint is temporarily unavailable.
    }
  }

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [notificationRows, notificationSettings] = await Promise.all([
        getNotifications({ archived: false }),
        getNotificationSettings(),
      ]);
      setItems(notificationRows);
      setSettings(notificationSettings);
      setUnread(notificationRows.filter((item) => !item?.is_read).length);
    } catch (err) {
      setError(err?.response?.data?.detail || "Notifications are temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCount();
    const timer = window.setInterval(loadCount, 60000);
    return () => window.clearInterval(timer);
  }, []);

  function computePosition() {
    const node = buttonRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const pad = 12;
    const viewportWidth = window.innerWidth || 390;
    const width = clamp(440, 320, Math.min(520, viewportWidth - pad * 2));
    setPosition({
      top: Math.min((window.innerHeight || 800) - 80, rect.bottom + 10),
      left: clamp(rect.right - width, pad, viewportWidth - width - pad),
      width,
    });
  }

  useEffect(() => {
    if (!open) return undefined;
    computePosition();
    loadAll();

    const onResize = () => computePosition();
    const onOutside = (event) => {
      if (buttonRef.current?.contains(event.target)) return;
      if (panelRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function openNotification(notification) {
    setItems((rows) => rows.map((row) => row.id === notification.id ? { ...row, is_read: true } : row));
    setUnread((value) => Math.max(0, value - (notification?.is_read ? 0 : 1)));
    try {
      await markNotificationRead(notification.id);
    } catch {
      // Optimistic navigation is still safe.
    }
    setOpen(false);
    nav(targetFor(notification));
  }

  async function markAllRead() {
    setSaving(true);
    try {
      await markAllNotificationsRead();
      setItems((rows) => rows.map((row) => ({ ...row, is_read: true })));
      setUnread(0);
    } finally {
      setSaving(false);
    }
  }

  async function saveSettings(patch) {
    setSaving(true);
    setError("");
    try {
      const updated = await patchNotificationSettings(patch);
      setSettings(updated);
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not save notification settings.");
    } finally {
      setSaving(false);
    }
  }

  const channels = settings?.channels || {};
  const proactive = settings?.proactive || {};
  const push = settings?.push || {};

  const bellButton = createPortal(
    <button
      ref={buttonRef}
      type="button"
      onClick={() => setOpen((value) => !value)}
      className="fixed right-[7.75rem] top-3 z-[70] flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-500/25 bg-slate-950/90 text-slate-200 shadow-[0_0_24px_rgba(34,211,238,.12)] backdrop-blur transition hover:border-cyan-400/40 hover:bg-cyan-500/10 hover:text-cyan-100 xl:right-[calc((100vw-80rem)/2+7.75rem)]"
      title="Notifications"
      aria-label={visibleUnread ? `${visibleUnread} unread notifications` : "Notifications"}
    >
      <Bell className="h-5 w-5" />
      {visibleUnread > 0 ? (
        <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-5 items-center justify-center rounded-full border-2 border-[#020617] bg-cyan-300 px-1.5 py-0.5 text-[9px] font-black text-slate-950 shadow-[0_0_18px_rgba(34,211,238,.4)]">
          {visibleUnread > 99 ? "99+" : visibleUnread}
        </span>
      ) : null}
    </button>,
    document.body
  );

  const panel = open ? createPortal(
    <section
      ref={panelRef}
      className="fixed z-[99999] max-h-[78dvh] overflow-hidden rounded-[1.75rem] border border-cyan-400/20 bg-[#020617] shadow-[0_24px_90px_rgba(0,0,0,.72)]"
      style={position}
      role="dialog"
      aria-label="Notifications"
    >
      <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,.16),transparent_40%),rgba(2,6,23,.98)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-cyan-200"><Sparkles className="h-4 w-4" />SYNC notifications</div>
            <div className="mt-1 text-lg font-black text-white">{visibleUnread ? `${visibleUnread} unread` : "You're caught up"}</div>
            <div className="mt-1 text-[11px] text-slate-400">In-app now · email fallback · push-ready architecture.</div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setSettingsOpen((value) => !value)} className={`grid h-9 w-9 place-items-center rounded-xl border ${settingsOpen ? "border-violet-300/30 bg-violet-500/15 text-violet-100" : "border-white/10 bg-white/[.04] text-slate-300"}`} aria-label="Notification settings"><Settings2 className="h-4 w-4" /></button>
            <button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-slate-300" aria-label="Close notifications"><X className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={loading} onClick={loadAll} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-[10px] font-black text-slate-200 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />Refresh</button>
          <button type="button" disabled={saving || !visibleUnread} onClick={markAllRead} className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/[.07] px-3 py-2 text-[10px] font-black text-emerald-100 disabled:opacity-40"><CheckCheck className="h-3.5 w-3.5" />Mark all read</button>
        </div>
      </div>

      {settingsOpen ? (
        <div className="max-h-[50dvh] overflow-y-auto border-b border-white/10 p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <Toggle label="Email notifications" detail="Uses the same verified SyncWorks sender as login emails." checked={channels.email !== false} disabled={saving} onChange={(value) => saveSettings({ channels: { email: value } })} />
            <Toggle label="Push notifications" detail={push.registered_device_count ? `${push.registered_device_count} device(s) registered.` : "Ready for device registration when native/web push is connected."} checked={channels.push !== false} disabled={saving} onChange={(value) => saveSettings({ channels: { push: value } })} />
            <Toggle label="Morning briefing" detail={`Daily SYNC summary · ${proactive.morning_time || "07:30"}.`} checked={proactive.morning_briefing !== false} disabled={saving} onChange={(value) => saveSettings({ proactive: { morning_briefing: value } })} />
            <Toggle label="Evening wrap-up" detail={`Daily wrap-up · ${proactive.evening_time || "20:30"}.`} checked={proactive.evening_wrap !== false} disabled={saving} onChange={(value) => saveSettings({ proactive: { evening_wrap: value } })} />
            <Toggle label="Bill reminders" detail="Payment and finance alerts." checked={proactive.bill_reminders !== false} disabled={saving} onChange={(value) => saveSettings({ proactive: { bill_reminders: value } })} />
            <Toggle label="Health reminders" detail="Workout, nutrition and recovery follow-ups." checked={proactive.health_reminders !== false} disabled={saving} onChange={(value) => saveSettings({ proactive: { health_reminders: value } })} />
            <Toggle label="Inbox follow-ups" detail="Unread and high-attention conversations." checked={proactive.inbox_followups !== false} disabled={saving} onChange={(value) => saveSettings({ proactive: { inbox_followups: value } })} />
            <Toggle label="Departure alerts" detail="Leave-time, traffic and travel reminders." checked={proactive.departure_alerts !== false} disabled={saving} onChange={(value) => saveSettings({ proactive: { departure_alerts: value } })} />
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/[.05] p-3">
              <div className="flex items-center gap-2 text-xs font-black text-white"><Mail className="h-4 w-4 text-cyan-200" />Email sender</div>
              <div className="mt-1 break-all text-[11px] leading-5 text-slate-400">{settings?.email_sender || "SyncWorks <no-reply@syncworksapp.com>"}</div>
            </div>
            <div className="rounded-2xl border border-violet-400/15 bg-violet-500/[.05] p-3">
              <div className="flex items-center gap-2 text-xs font-black text-white"><Smartphone className="h-4 w-4 text-violet-200" />Push status</div>
              <div className="mt-1 text-[11px] leading-5 text-slate-400">{push.provider_configured ? "Provider connected and ready." : push.registration_ready ? "Registration API ready; provider credentials can be added without changing notification logic." : "Push setup pending."}</div>
            </div>
          </div>
          <button type="button" onClick={() => { setOpen(false); nav("/settings"); }} className="mt-3 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-xs font-black text-slate-200">Open full Settings</button>
        </div>
      ) : null}

      <div className="max-h-[46dvh] overflow-y-auto p-3">
        {error ? <div className="mb-3 rounded-2xl border border-amber-400/20 bg-amber-500/[.06] p-3 text-xs text-amber-100">{error}</div> : null}
        {!loading && !items.length ? (
          <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/[.05] p-4 text-sm text-emerald-100">No notifications right now.</div>
        ) : null}
        <div className="space-y-2">
          {items.slice(0, 50).map((notification) => {
            const isRead = !!notification?.is_read;
            return (
              <button
                key={notification.id}
                type="button"
                onClick={() => openNotification(notification)}
                className={`w-full rounded-2xl border p-3 text-left transition ${isRead ? "border-white/8 bg-white/[.02]" : "border-cyan-400/20 bg-cyan-500/[.07]"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[9px] font-black uppercase tracking-[.16em] text-cyan-200">{sourceLabel(notification)}</span>
                      {!isRead ? <span className="rounded-full bg-cyan-300 px-2 py-0.5 text-[9px] font-black uppercase text-slate-950">New</span> : null}
                    </div>
                    <div className="mt-1 truncate text-sm font-black text-white">{notification.title || "Notification"}</div>
                    <div className="mt-1 line-clamp-3 text-xs leading-5 text-slate-400">{notification.body || "Open SyncWorks for details."}</div>
                    {deliveryLabel(notification) ? <div className="mt-2 text-[10px] font-bold text-slate-500">{deliveryLabel(notification)}</div> : null}
                  </div>
                  <Bell className={`mt-1 h-4 w-4 shrink-0 ${isRead ? "text-slate-600" : "text-cyan-200"}`} />
                </div>
                {notification.created_at ? <div className="mt-2 text-[10px] text-slate-600">{new Date(notification.created_at).toLocaleString()}</div> : null}
              </button>
            );
          })}
        </div>
      </div>
    </section>,
    document.body
  ) : null;

  return <>{bellButton}{panel}</>;
}
