// src/components/upgrade/steps/Step4Plans.jsx
import React from "react";
import UpgradeCard from "../ui/UpgradeCard";

function AddonTile({ title, desc, status = "coming", onClick, disabled }) {
  const isComing = status === "coming";
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-slate-100">{title}</div>
          <div className="text-xs text-slate-400 mt-1">{desc}</div>
        </div>
        <div
          className={
            "text-[11px] px-3 py-1 rounded-full border " +
            (isComing
              ? "border-slate-700 bg-slate-900/40 text-slate-300"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200")
          }
        >
          {isComing ? "Coming soon" : "Available"}
        </div>
      </div>

      <div className="mt-3">
        <button
          type="button"
          onClick={onClick}
          disabled={disabled || isComing}
          className={
            "rounded-xl px-4 py-2 text-sm border transition " +
            (isComing || disabled
              ? "bg-slate-950 border-slate-800 text-slate-500 cursor-not-allowed"
              : "bg-indigo-500/20 border-indigo-500/40 hover:bg-indigo-500/30 text-indigo-100")
          }
        >
          {isComing ? "Not live yet" : "Enable"}
        </button>
      </div>
    </div>
  );
}

export default function Step4Plans({ user, businessSelected, finishUpgrade }) {
  return (
    <UpgradeCard
      title="Step 4 — Upgrade 🚀"
      subtitle="Unlock the SBO dashboard for this account."
      badge={user?.role === "SBO" ? "Already SBO ✅" : "Ready"}
    >
      <div className="flex gap-2 flex-wrap items-center">
        <button
          className="rounded-xl px-4 py-2 bg-indigo-500/20 border border-indigo-500/40 hover:bg-indigo-500/30 text-sm disabled:opacity-60"
          onClick={finishUpgrade}
          disabled={!businessSelected}
          type="button"
        >
          Finish Upgrade
        </button>

        <div className="text-xs text-slate-500">
          Logged in as <span className="text-slate-200">{user?.email || user?.username}</span> — Role:{" "}
          <span className="text-slate-200">{user?.role || "?"}</span>
        </div>
      </div>

      <div className="mt-5 pt-5 border-t border-slate-800">
        <div className="text-sm font-semibold mb-2">Add-ons</div>
        <div className="text-xs text-slate-400 mb-3">
          These will be sold as add-ons. We can wire Stripe checkout when the apps are ready.
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <AddonTile
            title="Finance Ops (Add-on)"
            desc="Budgeting, snapshots, templates, goals, history, and reporting."
            status="coming"
          />
          <AddonTile
            title="Health & Fitness (Add-on)"
            desc="Daily tasks, weekly planner, accountability, routines, and progress."
            status="coming"
          />
        </div>
      </div>
    </UpgradeCard>
  );
}