import React from "react";

export default function LockoutGate({ billingStatus, children }) {
  const locked = !!billingStatus?.is_locked;

  if (!locked) return children;

  return (
    <div className="rounded-xl border border-red-900/60 bg-red-950/30 p-5">
      <div className="text-lg font-semibold text-red-200">Business Locked</div>
      <div className="text-sm text-red-200/80 mt-2">
        This business is locked due to a past-due platform bill.
      </div>

      <div className="mt-3 text-sm text-slate-200 space-y-1">
        <div>
          Due date: <span className="font-semibold">{billingStatus?.due_date || "—"}</span>
        </div>
        <div>
          Days until due:{" "}
          <span className="font-semibold">{billingStatus?.days_until_due ?? "—"}</span>
        </div>
        <div>
          Reason:{" "}
          <span className="font-semibold">{billingStatus?.lock_reason || "Past due"}</span>
        </div>
      </div>

      <div className="mt-4 text-sm text-slate-200/80">
        Option B: SBO collects invoice revenue; SyncWorks bills monthly (1% + subscription + seats).
      </div>
    </div>
  );
}
