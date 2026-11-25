import React, { useCallback, useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { AVATARS, getAvatarPhotoForUser, getAvatarFallbackPhotoForUser } from "./JarvisAvatar";
import api from "../../api/client";
import SyncAlertDrawer from "./SyncAlertDrawer";
import OfficeAgentDock from "../customer/OfficeAgentDockV27";
import BusinessAssistantDock from "./BusinessAssistantDock";
import BusinessAgentQuickChat from "./BusinessAgentQuickChat";

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
  const [commandOpen,setCommandOpen]=useState(false);
  const [businessAgentId,setBusinessAgentId]=useState(null);
  useEffect(()=>{
    const onOpen=e=>{const id=String(e?.detail?.agentId||"");if(id){setCommandOpen(false);setBusinessAgentId(id);}};
    window.addEventListener("syncworks:business-agent-open",onOpen);
    return()=>window.removeEventListener("syncworks:business-agent-open",onOpen);
  },[]);
  useEffect(()=>{setBusinessAgentId(null);},[location.pathname]);
  useEffect(()=>{const listener=()=>{setBusinessAgentId(null);setCommandOpen(true);};window.addEventListener("syncworks:victoria-open",listener);return()=>window.removeEventListener("syncworks:victoria-open",listener);},[]);

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  useEffect(() => {
    const onDialog = (event) => {
      const opened = Boolean(event?.detail?.open);
      setTaskDialogOpen(opened);
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
  // Private founder assistant follows operational routes, but never covers
  // immersive Forge and Games experiences or authentication/onboarding flows.
  const pilotFounder = String(user?.email || "").trim().toLowerCase() === "jacoblord7@outlook.com";
  const excludedVictoria = /^\/customer\/(?:forge|games)(?:\/|$)/.test(location.pathname) ||
    /^\/connect\/(?:games|sports)(?:\/|$)/.test(location.pathname) ||
    /^\/(?:login|register|logout|forgot-password|reset-password|accept-invite|upgrade)(?:\/|$)/.test(location.pathname);
  const eligibleVictoriaRoute = /^\/(?:customer|sbo|pm|platform|calendar|tickets|tenant|investor|sync|employee|inbox)(?:\/|$)/.test(location.pathname);
  // /sync already renders its own team dock; do not overlay Victoria on it.
  // Keep Victoria on specialist routes including Mail Desk and daily workday.
  const showChief = pilotFounder && eligibleVictoriaRoute && !excludedVictoria;
  // All SBO subpages share one persistent AI dock. The SBO landing already
  // has its header and mobile portrait row, so do not render duplicates there.
  const businessWorkspaceRoute=/^\/(?:sbo\/|pm(?:\/|$)|employee(?:\/|$)|team\/invites(?:\/|$)|ceo(?:\/|$))/.test(location.pathname);
  const showBusinessDock=pilotFounder && businessWorkspaceRoute && !taskDialogOpen;
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
        {showChief && location.pathname !== "/sync" && !isCustomerHome && !showBusinessDock && location.pathname !== "/platform" && (
          <>
            <button type="button" aria-haspopup="dialog" aria-label="Open Victoria Chief of Staff briefing" title="Victoria — Chief of Staff" onClick={() => setCommandOpen(true)}
              className="group flex min-h-12 items-center gap-2 rounded-full border border-cyan-300/45 bg-[#061327]/95 py-1 pl-1 pr-2 text-left text-white shadow-[0_0_26px_rgba(34,211,238,.22)] transition hover:border-cyan-300">
              <span className="relative block h-11 w-11 shrink-0"><img src={getAvatarPhotoForUser(chiefAvatar, user)} alt="" className="h-11 w-11 rounded-full border border-cyan-300/55 object-cover object-top" onError={(event)=>{const fallback=getAvatarFallbackPhotoForUser(chiefAvatar,user);if(fallback && event.currentTarget.src !== new URL(fallback,window.location.href).href)event.currentTarget.src=fallback;}} />
                {workdayStatus.available && workdayStatus.unread > 0 && <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-slate-950" aria-label={`${workdayStatus.unread} new workday results`}>{workdayStatus.unread > 99 ? "99+" : workdayStatus.unread}</span>}
                {workdayStatus.available && workdayStatus.completed > 0 && <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white ring-2 ring-slate-950" title="Owner-attested completion"><Check size={13} strokeWidth={3} /></span>}
              </span>
              <span className="hidden pr-1 sm:block"><span className="block text-[10px] font-black uppercase tracking-wide text-cyan-300">{chiefAvatar.name} — Chief of Staff</span><span className="block text-[11px] text-slate-300">{workdayStatus.available && workdayStatus.pending ? `${workdayStatus.pending} awaiting review` : "Open briefing"}</span></span>
            </button>
          </>
        )}
        {location.pathname !== "/platform" && <button
          type="button"
          onClick={() => setAlertsOpen(true)}
          className="relative grid h-12 w-12 place-items-center rounded-full border border-violet-300/35 bg-gradient-to-br from-slate-950 via-violet-950 to-slate-950 text-violet-100 shadow-[0_0_28px_rgba(139,92,246,0.28)] transition hover:scale-105"
          aria-label={`Open SYNC alerts${unread ? `, ${unread} unread` : ""}`}
          title="SYNC Alerts"
        >
          <Bell aria-hidden="true" className="h-5 w-5" />
          {unread ? <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white ring-2 ring-slate-950">{unread > 99 ? "99+" : unread}</span> : null}
        </button>}


      </div>
      {showBusinessDock&&<BusinessAssistantDock user={user} onVictoria={()=>setCommandOpen(true)}/>}
      {showChief&&businessAgentId&&!excludedVictoria&&<BusinessAgentQuickChat agentId={businessAgentId} user={user} onClose={()=>setBusinessAgentId(null)}/>}
      {showChief && commandOpen && <OfficeAgentDock user={user} placement="launcher" openSignal={1} onDismiss={()=>setCommandOpen(false)}/>}
      <SyncAlertDrawer open={alertsOpen} onClose={() => { setAlertsOpen(false); loadUnread(); }} onCountChange={setUnread} />
    </>
  );
}
