import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, ChevronRight, RefreshCw, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { getSyncAlerts, refreshSyncAlerts } from "../../api/syncNotifications";

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

  function openAlertCenter() {
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
          {visible.map((item) => (
            <button key={item.id} type="button" onClick={() => openItem(item)} className={`flex min-w-0 items-center justify-between gap-2 rounded-2xl border p-3 text-left ${severityTone(item?.data?.severity)}`}>
              <div className="min-w-0"><div className="truncate text-sm font-black text-white">{item.title || "SYNC update"}</div><div className="mt-1 line-clamp-1 text-xs text-slate-500">{item.body || "Open to review."}</div></div>
              <ChevronRight className="h-4 w-4 shrink-0 text-cyan-200" />
            </button>
          ))}
        </div>
      ) : !loading ? (
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-emerald-400/15 bg-emerald-500/[.05] p-3 text-xs font-bold text-emerald-100"><ShieldCheck className="h-4 w-4" />You are caught up.</div>
      ) : null}
    </section>
  );
}
