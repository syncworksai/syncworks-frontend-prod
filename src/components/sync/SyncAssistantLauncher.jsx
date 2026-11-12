import React, { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useLocation } from "react-router-dom";
import api from "../../api/client";
import SyncAlertDrawer from "./SyncAlertDrawer";

const HIDDEN_PREFIXES = [
  "/login",
  "/register",
  "/employee/invite",
  "/accept-invite",
  "/sports/invite",
  "/sports/team-invite",
  "/social/invite",
  "/customer/games/table",
  "/customer/games/clubs/room",
];

export default function SyncAssistantLauncher() {
  const location = useLocation();
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
    const openAlerts = () => setAlertsOpen(true);
    window.addEventListener("sync-assistant:open-alerts", openAlerts);
    return () => window.removeEventListener("sync-assistant:open-alerts", openAlerts);
  }, []);

  const hiddenForSports = /^\/connect\/groups\/[^/]+\/sports(?:\/|$)/.test(location.pathname);
  
  useEffect(() => {
    if (hiddenForSports || HIDDEN_PREFIXES.some((prefix) => location.pathname.startsWith(prefix))) return;
    loadUnread();
    const timer = window.setInterval(loadUnread, 60000);
    return () => window.clearInterval(timer);
  }, [location.pathname, loadUnread, hiddenForSports]);

  if (hiddenForSports || location.pathname === "/customer/store" || HIDDEN_PREFIXES.some((prefix) => location.pathname.startsWith(prefix))) return null;

  const isCustomerHome = location.pathname === "/customer";

  return (
    <>
      <div className={`fixed bottom-24 right-4 z-[80] flex flex-col items-end gap-3 lg:bottom-6 lg:right-6 ${isCustomerHome ? "" : "hidden lg:flex"}`}>
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


      </div>
      <SyncAlertDrawer open={alertsOpen} onClose={() => { setAlertsOpen(false); loadUnread(); }} onCountChange={setUnread} />
    </>
  );
}
