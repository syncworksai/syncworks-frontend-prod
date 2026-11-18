import React, { useCallback, useEffect, useState } from "react";
import { Bell, Check, Clock3, MessageCircle, UserRound, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { AVATARS, getAvatarPhotoForUser } from "./JarvisAvatar";
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
  const [chiefOpen, setChiefOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  useEffect(() => {
    const onDialog = (event) => {
      const opened = Boolean(event?.detail?.open);
      setTaskDialogOpen(opened);
      if (opened) setChiefOpen(false);
    };
    window.addEventListener("sync-assist:task-dialog", onDialog);
    return () => window.removeEventListener("sync-assist:task-dialog", onDialog);
  }, []);

  // The Chief of Staff has a stable identity; changing a portrait elsewhere
  // must not silently turn another specialist into the Chief of Staff.
  const chiefAvatar = AVATARS.find((a) => a.role === "Chief of Staff") || AVATARS[0];
  const [workdayStatus, setWorkdayStatus] = useState({
    unread: 0, pending: 0, running: 0, completed: 0, receipts: [],
    available: false,
  });
  const showChief = (location.pathname === "/sync/assist" || location.pathname === "/platform") && String(user?.email || "").trim().toLowerCase() === "jacoblord7@outlook.com";
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  const seenKey = "sync-assist-seen-receipts:" + String(user?.id || user?.email || "anonymous").toLowerCase();
  const loadWorkday = useCallback(async () => {
    if (!showChief) return;
    try {
      // Same founder-scoped APIs already used by Workday; never infer
      // successful execution from a queued job or a generated draft.
      const [goalsResponse, jobsResponse] = await Promise.all([
        api.get("/sync-ai/assist/pilot/workday/", { timeout: 15000 }),
        api.get("/sync-ai/assist/pilot/workday/jobs/", { timeout: 15000 }),
      ]);
      const goals = Array.isArray(goalsResponse?.data?.goals) ? goalsResponse.data.goals : [];
      const jobs = Array.isArray(jobsResponse?.data?.jobs) ? jobsResponse.data.jobs : [];
      const steps = goals.flatMap((goal) => Array.isArray(goal.steps) ? goal.steps : []);
      const receipts = steps.filter((step) => step.worker_receipt?.receipt_id)
        .map((step) => ({
          id: String(step.worker_receipt.receipt_id),
          status: step.status,
          role: step.role,
          receiptStatus: step.worker_receipt.status,
        }));
      let seen = [];
      try {
        const parsed = JSON.parse(window.localStorage.getItem(seenKey) || "[]");
        if (Array.isArray(parsed)) seen = parsed.filter((id) => typeof id === "string");
      } catch { /* Malformed local-only read markers must not fail the page. */ }
      const unseen = receipts.filter((receipt) => !seen.includes(receipt.id));
      setWorkdayStatus({
        unread: unseen.length,
        pending: steps.filter((step) => step.status === "AWAITING_APPROVAL").length,
        running: jobs.filter((job) => job.state === "QUEUED" || job.state === "RUNNING" || job.state === "RETRY").length,
        completed: receipts.filter((receipt) => receipt.status === "COMPLETED").length,
        receipts,
        available: true,
      });
    } catch {
      // An API outage is not proof that there is no pending work.
      setWorkdayStatus((previous) => ({ ...previous, available: false }));
    }
  }, [seenKey, showChief]);

  const toggleChief = () => {
    const next = !chiefOpen;
    setChiefOpen(next);
    if (next && workdayStatus.available) {
      try {
        const seen = JSON.parse(window.localStorage.getItem(seenKey) || "[]");
        const ids = Array.isArray(seen) ? seen.filter((id) => typeof id === "string") : [];
        const all = [...new Set([...ids, ...workdayStatus.receipts.map((receipt) => receipt.id)])].slice(-300);
        window.localStorage.setItem(seenKey, JSON.stringify(all));
        setWorkdayStatus((previous) => ({ ...previous, unread: 0 }));
      } catch { /* Do not prevent opening the assistant if storage is blocked. */ }
    }
  };

  useEffect(() => {
    if (!showChief) return;
    loadWorkday();
    const interval = window.setInterval(loadWorkday, 30000);
    const onFocus = () => loadWorkday();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [showChief, loadWorkday]);

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
      <div className={`fixed bottom-24 right-4 z-[260] flex flex-col items-end gap-3 lg:bottom-6 lg:right-6 ${taskDialogOpen && showChief ? "hidden" : mobileVisible ? "" : "hidden lg:flex"}`}>
        {showChief && (
          <>
            {chiefOpen && (
              <section aria-label="Chief of Staff quick actions" className="max-h-[65vh] w-72 overflow-y-auto rounded-2xl border border-cyan-400/40 bg-[#061125]/95 p-3 text-white shadow-[0_14px_45px_rgba(0,0,0,.55)] backdrop-blur-xl">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-cyan-300">Sync Assist</p>
                    <p className="text-sm font-bold">{chiefAvatar.name} — Chief of Staff</p>
                  </div>
                  <button type="button" aria-label="Close Chief of Staff menu" onClick={() => setChiefOpen(false)} className="rounded-lg p-2 text-slate-200 hover:bg-white/10"><X size={16} /></button>
                </div>
                <div className="mb-3 rounded-xl border border-white/10 bg-white/5 p-2 text-[11px] text-slate-200" aria-label="Workday progress">
                  {!workdayStatus.available ? (
                    <span>Workday status unavailable. Open Workday to check jobs.</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1"><Clock3 size={13} /> {workdayStatus.running} queued/running</span>
                      <span className="text-amber-200">{workdayStatus.pending} awaiting review</span>
                      {workdayStatus.unread > 0 && <span className="text-rose-200">{workdayStatus.unread} new results</span>}
                      {workdayStatus.completed > 0 && <span className="inline-flex items-center gap-1 text-emerald-200"><Check size={13} /> {workdayStatus.completed} owner-confirmed completed</span>}
                    </div>
                  )}
                </div>
                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-cyan-300">Your AI team</p>
                <div className="mb-3 grid gap-1.5">
                  {AVATARS.map((assistant) => (
                    <div key={assistant.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5">
                      <img src={getAvatarPhotoForUser(assistant, user)} alt="" className="h-8 w-8 rounded-full object-cover object-top" />
                      <span className="text-xs text-slate-200"><strong className="text-white">{assistant.name}</strong> — {assistant.role}</span>
                    </div>
                  ))}
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
            <button type="button" aria-expanded={chiefOpen} aria-label="Open Victoria Chief of Staff dock" title="Victoria — Chief of Staff" onClick={toggleChief}
              className="group flex min-h-14 items-center gap-2 rounded-full border border-cyan-300/45 bg-[#061327]/95 py-1.5 pl-1.5 pr-3 text-left text-white shadow-[0_0_26px_rgba(34,211,238,.22)] transition hover:border-cyan-300">
              <span className="relative block h-11 w-11 shrink-0"><img src={getAvatarPhotoForUser(chiefAvatar, user)} alt="" className="h-11 w-11 rounded-full border border-cyan-300/55 object-cover object-top" />
                {workdayStatus.available && workdayStatus.unread > 0 && <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-slate-950" aria-label={`${workdayStatus.unread} new workday results`}>{workdayStatus.unread > 99 ? "99+" : workdayStatus.unread}</span>}
                {workdayStatus.available && workdayStatus.completed > 0 && <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white ring-2 ring-slate-950" title="Owner-attested completion"><Check size={13} strokeWidth={3} /></span>}
              </span>
              <span className="pr-1"><span className="block text-[10px] font-black uppercase tracking-wide text-cyan-300">{chiefAvatar.name} — Chief of Staff</span><span className="block text-[11px] text-slate-300">{workdayStatus.available && workdayStatus.pending ? `${workdayStatus.pending} awaiting review` : "Open assistant"}</span></span>
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
