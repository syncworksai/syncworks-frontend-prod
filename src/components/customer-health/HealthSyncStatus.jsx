// src/components/customer-health/HealthSyncStatus.jsx
import React from "react";

const styles = {
  synced:
    "border-lime-300/25 bg-lime-300/[0.07] text-lime-100",
  saving:
    "border-cyan-300/25 bg-cyan-300/[0.07] text-cyan-100",
  pending:
    "border-amber-300/25 bg-amber-300/[0.07] text-amber-100",
  offline:
    "border-slate-300/20 bg-slate-300/[0.06] text-slate-200",
  conflict:
    "border-rose-300/25 bg-rose-300/[0.07] text-rose-100",
  error:
    "border-rose-300/25 bg-rose-300/[0.07] text-rose-100",
  loading:
    "border-white/10 bg-white/[0.04] text-slate-300",
};

const labels = {
  synced: "Synced",
  saving: "Saving",
  pending: "Pending sync",
  offline: "Offline",
  conflict: "Conflict",
  error: "Sync error",
  loading: "Loading",
};

export default function HealthSyncStatus({
  status = "loading",
  profileVersion = null,
  lastSyncedAt = "",
  pendingCount = 0,
}) {
  return (
    <div
      className={`mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 ${styles[status] || styles.loading}`}
    >
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-current" />
        <span className="text-[10px] font-black uppercase tracking-[0.14em]">
          {labels[status] || labels.loading}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[9px] font-bold opacity-80">
        {pendingCount > 0 ? (
          <span>{pendingCount} queued</span>
        ) : null}
        {profileVersion !== null &&
        profileVersion !== undefined ? (
          <span>Version {profileVersion}</span>
        ) : null}
        {lastSyncedAt ? (
          <span>
            Last sync{" "}
            {new Date(lastSyncedAt).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        ) : null}
      </div>
    </div>
  );
}
