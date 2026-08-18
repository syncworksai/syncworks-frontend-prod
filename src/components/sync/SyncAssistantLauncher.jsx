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

  const isCustomer = location.pathname.startsWith("/customer");
  const showMic = location.pathname !== "/sync" && !isCustomer;

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
          onClick={() => navigate(`/sync?return=${encodeURIComponent(location.pathname)}`)}
          className="relative grid h-14 w-14 place-items-center rounded-full border border-cyan-200/50 bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 text-white shadow-[0_0_34px_rgba(34,211,238,0.42)] transition hover:scale-105"
          aria-label="Open SYNC assistant"
          title="Open SYNC"
        >
          <Mic aria-hidden="true" className="h-6 w-6" />
          <span className="absolute -bottom-5 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100">SYNC</span>
        </button> : null}
      </div>
      <SyncAlertDrawer open={alertsOpen} onClose={() => { setAlertsOpen(false); loadUnread(); }} onCountChange={setUnread} />
    </>
  );
}
