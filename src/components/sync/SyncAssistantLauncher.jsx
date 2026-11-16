import React, { useCallback, useEffect, useState } from "react";
import { Bell, MessageCircle, UserRound, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { AVATARS, useJarvisAvatar } from "./JarvisAvatar";
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { avatarId } = useJarvisAvatar();
  const [chiefOpen, setChiefOpen] = useState(false);
  const chiefAvatar = AVATARS.find((a) => a.id === avatarId) || AVATARS[0];
  const showChief = location.pathname === "/sync/assist" && String(user?.email || "").trim().toLowerCase() === "jacoblord7@outlook.com";
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
  const mobileVisible = isCustomerHome || showChief;

  return (
    <>
      <div className={`fixed bottom-24 right-4 z-[80] flex flex-col items-end gap-3 lg:bottom-6 lg:right-6 ${mobileVisible ? "" : "hidden lg:flex"}`}>
        {showChief && (
          <>
            {chiefOpen && (
              <section aria-label="Chief of Staff quick actions" className="w-64 rounded-2xl border border-cyan-400/40 bg-[#061125]/95 p-3 text-white shadow-[0_14px_45px_rgba(0,0,0,.55)] backdrop-blur-xl">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-cyan-300">Sync Assist</p>
                    <p className="text-sm font-bold">Chief of Staff</p>
                  </div>
                  <button type="button" aria-label="Close Chief of Staff menu" onClick={() => setChiefOpen(false)} className="rounded-lg p-2 text-slate-200 hover:bg-white/10"><X size={16} /></button>
                </div>
                <button type="button" onClick={() => { setChiefOpen(false); navigate("/sync/assist/chief"); }} className="mb-2 flex min-h-11 w-full items-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-3 text-left text-xs font-bold text-cyan-100 hover:bg-cyan-400/20">
                  <UserRound size={16} /> Open Chief of Staff
                </button>
                <button type="button" onClick={() => { setChiefOpen(false); navigate("/sync"); }} className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-white/15 px-3 text-left text-xs font-bold text-slate-200 hover:bg-white/10">
                  <MessageCircle size={16} /> Open SYNC chat
                </button>
                <p className="mt-3 text-[10px] text-slate-400">Assistant actions require your approval. Background worker not yet verified.</p>
              </section>
            )}
            <button type="button" aria-expanded={chiefOpen} aria-label="Open Chief of Staff dock" title="Chief of Staff" onClick={() => setChiefOpen((open) => !open)}
              className="group flex min-h-14 items-center gap-2 rounded-full border border-cyan-300/45 bg-[#061327]/95 py-1.5 pl-1.5 pr-3 text-left text-white shadow-[0_0_26px_rgba(34,211,238,.22)] transition hover:border-cyan-300">
              <img src={chiefAvatar.photo} alt="" className="h-11 w-11 rounded-full border border-cyan-300/55 object-cover object-top" />
              <span className="pr-1"><span className="block text-[10px] font-black uppercase tracking-wide text-cyan-300">Chief of Staff</span><span className="block text-[11px] text-slate-300">Open assistant</span></span>
            </button>
          </>
        )}
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
