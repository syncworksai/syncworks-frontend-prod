import React, { useCallback, useEffect, useState } from "react";
import { Bell, Mic } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../api/client";
import SyncAlertDrawer from "./SyncAlertDrawer";

const HIDDEN_PREFIXES = [
  "/login",
  "/register",
  "/employee/invite",
  "/accept-invite",
];

function contextualPrompt(pathname) {
  if (pathname === "/calendar" || pathname.startsWith("/calendar/")) return "Review my calendar, upcoming appointments, conflicts, travel timing, traffic and weather. Tell me what matters next and read it aloud.";
  if (pathname.startsWith("/customer/tasks")) return "Review my personal to-do list and connected day. Help me prioritize what I should do next and read the plan aloud.";
  if (pathname.startsWith("/customer/inbox")) return "Review my SyncWorks inbox and connected communication. Tell me what needs attention first and read the important items aloud.";
  if (pathname.startsWith("/customer/traffic")) return "Review my live traffic and upcoming schedule. Tell me about delays, leave-by times and anything that may affect my day.";
  if (pathname.startsWith("/customer/weather")) return "Review my weather and connected schedule. Tell me what weather could affect today and read the important updates aloud.";
  if (pathname.startsWith("/customer/discover")) return "Help me with what is nearby and relevant to what I am doing today. Use my connected context and tell me the best next options.";
  return "Review this part of my SyncWorks account and my connected day. Tell me what matters next and read the important information aloud.";
}

export default function SyncAssistantLauncher() {
  const location = useLocation();
  const navigate = useNavigate();
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  const loadUnread = useCallback(async () => {
    try {
      const response = await api.get("/me/notifications/unread-count/");
      setUnread(Number(response?.data?.sync_alerts || 0));
    } catch {
      setUnread(0);
    }
  }, []);

  useEffect(() => {
    if (HIDDEN_PREFIXES.some((prefix) => location.pathname.startsWith(prefix))) return;
    loadUnread();
    const timer = window.setInterval(loadUnread, 60000);
    return () => window.clearInterval(timer);
  }, [location.pathname, loadUnread]);

  if (HIDDEN_PREFIXES.some((prefix) => location.pathname.startsWith(prefix))) return null;

  const isCustomerHome = location.pathname === "/customer";
  const showMic = location.pathname !== "/sync" && !isCustomerHome;

  function openSyncAudio() {
    sessionStorage.setItem("syncAssistantPendingPrompt", contextualPrompt(location.pathname));
    navigate(`/sync?return=${encodeURIComponent(location.pathname)}`);
  }

  return (
    <>
      <div className="fixed bottom-24 right-4 z-[80] flex flex-col items-end gap-3 lg:bottom-6 lg:right-6">
        <button
          type="button"
          onClick={() => setAlertsOpen(true)}
          className="relative grid h-12 w-12 place-items-center rounded-full border border-violet-300/35 bg-gradient-to-br from-slate-950 via-violet-950 to-slate-950 text-violet-100 shadow-[0_0_28px_rgba(139,92,246,0.28)] transition hover:scale-105"
          aria-label={`Open SYNC alerts${unread ? `, ${unread} unread` : ""}`}
          title="SYNC Alerts"
        >
          <Bell aria-hidden="true" className="h-5 w-5" />
          {unread ? <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white ring-2 ring-slate-950">{unread > 99 ? "99+" : unread}</span> : null}
        </button>

        {showMic ? <button
          type="button"
          onClick={openSyncAudio}
          className="relative grid h-14 w-14 place-items-center rounded-full border border-cyan-200/50 bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 text-white shadow-[0_0_34px_rgba(34,211,238,0.42)] transition hover:scale-105"
          aria-label="Open contextual SYNC assistant"
          title="Ask SYNC about this page"
        >
          <Mic aria-hidden="true" className="h-6 w-6" />
          <span className="absolute -bottom-5 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100">SYNC</span>
        </button> : null}
      </div>
      <SyncAlertDrawer open={alertsOpen} onClose={() => { setAlertsOpen(false); loadUnread(); }} onCountChange={setUnread} />
    </>
  );
}
