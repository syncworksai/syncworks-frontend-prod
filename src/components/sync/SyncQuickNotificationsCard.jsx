import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, ChevronRight, RefreshCw, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { getSyncAlerts, refreshSyncAlerts } from "../../api/syncNotifications";\nimport { acceptEventInvitation, acceptMembership, declineEventInvitation, declineMembership } from "../../api/social";

function severityTone(value) {
  const key = String(value || "MEDIUM").toUpperCase();
  if (key === "CRITICAL") return "border-rose-400/25 bg-rose-500/[.07]";
  if (key === "HIGH") return "border-amber-400/25 bg-amber-500/[.06]";
  return "border-white/10 bg-black/20";
}

export default function SyncQuickNotificationsCard({ maxItems = 3 }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await getSyncAlerts());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(
    () => items.filter((item) => !item.is_read).slice(0, maxItems),
    [items, maxItems],
  );

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refreshSyncAlerts();
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  async function respond(item, accept) {\n    const kind = item?.data?.kind;\n    const membershipId = item?.data?.social_membership_id;\n    const eventInviteId = item?.data?.social_event_invitation_id;\n    try {\n      if (kind === "GROUP_INVITE" && membershipId) await (accept ? acceptMembership(membershipId) : declineMembership(membershipId));\n      else if (kind === "EVENT_INVITE" && eventInviteId) await (accept ? acceptEventInvitation(eventInviteId) : declineEventInvitation(eventInviteId));\n      else return openItem(item);\n      setItems((rows) => rows.filter((row) => row.id !== item.id));\n      await refreshSyncAlerts().catch(() => null);\n    } catch {\n      openItem(item);\n    }\n  }\n\n  function openAlertCenter() {
    window.dispatchEvent(new Event("sync-assistant:open-alerts"));
  }

  function openItem(item) {
    const path = item?.data?.deep_link || item?.data?.target_path;
    if (path) navigate(path);
    else openAlertCenter();
  }

  return (
    <section className="rounded-[1.6rem] border border-cyan-400/15 bg-slate-950/55 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.18em] text-cyan-200"><Bell className="h-4 w-4" />Quick notifications</div>
          <h2 className="mt-1 text-lg font-black text-white">{loading ? "Checking what changed…" : visible.length ? `${visible.length} need a look` : "Nothing urgent"}</h2>
          <p className="mt-1 text-xs text-slate-500">Fast actions from SYNC without opening every module.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={refresh} disabled={refreshing} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-400" aria-label="Refresh notifications"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /></button>
          <button type="button" onClick={openAlertCenter} className="rounded-xl border border-cyan-300/20 bg-cyan-500/[.07] px-3 text-[10px] font-black text-cyan-100">Alert center</button>
        </div>
      </div>

      {!loading && visible.length ? (
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {visible.map((item) => {
            const actionableInvite = ["GROUP_INVITE", "EVENT_INVITE"].includes(item?.data?.kind);
            return (
              <div key={item.id} className={`min-w-0 rounded-2xl border p-3 ${severityTone(item?.data?.severity)}`}>
                <button type="button" onClick={() => openItem(item)} className="flex w-full min-w-0 items-center justify-between gap-2 text-left">
                  <div className="min-w-0"><div className="truncate text-sm font-black text-white">{item.title || "SYNC update"}</div><div className="mt-1 line-clamp-2 text-xs text-slate-500">{item.body || "Open to review."}</div></div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-cyan-200" />
                </button>
                {actionableInvite ? <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => respond(item, true)} className="rounded-xl border border-emerald-300/20 bg-emerald-500/10 px-3 py-2 text-[10px] font-black text-emerald-100">Accept</button><button type="button" onClick={() => respond(item, false)} className="rounded-xl border border-rose-300/20 bg-rose-500/10 px-3 py-2 text-[10px] font-black text-rose-100">Decline</button></div> : null}
              </div>
            );
          })}
        </div>
      ) : !loading ? (
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-emerald-400/15 bg-emerald-500/[.05] p-3 text-xs font-bold text-emerald-100"><ShieldCheck className="h-4 w-4" />You are caught up.</div>
      ) : null}
    </section>
  );
}
