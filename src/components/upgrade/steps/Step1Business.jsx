// src/components/upgrade/steps/Step1Business.jsx
import React from "react";
import UpgradeCard from "../ui/UpgradeCard";
import UpgradeField from "../ui/UpgradeField";

export default function Step1Business({
  businessSelected,
  newBizName,
  setNewBizName,
  newBizEmail,
  setNewBizEmail,
  newOwnerName,
  setNewOwnerName,
  newBizPhone,
  setNewBizPhone,
  newBizLogoFile,
  setNewBizLogoFile,
  creatingBiz,
  createBusiness,
}) {
  return (
    <UpgradeCard
      title="Step 1 — Create a business 🏢"
      subtitle="Business email is required (scheduling + calendar sync)."
      badge={businessSelected ? `Active #${businessSelected}` : "No business selected"}
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <UpgradeField label="Business name *">
          <input
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100"
            placeholder="e.g., ABC's Plumbing"
            value={newBizName}
            onChange={(e) => setNewBizName(e.target.value)}
          />
        </UpgradeField>

        <UpgradeField label="Business email * (calendar sync)">
          <input
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100"
            placeholder="e.g., support@yourbiz.com"
            value={newBizEmail}
            onChange={(e) => setNewBizEmail(e.target.value)}
          />
          <div className="text-[11px] text-slate-500 mt-1">
            This can be the same email you log in with, or a separate business inbox
            (recommended if you plan to sync Google Calendar).
          </div>
        </UpgradeField>

        <UpgradeField label="Owner / Primary contact (optional)">
          <input
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100"
            placeholder="e.g., Jacob Lord"
            value={newOwnerName}
            onChange={(e) => setNewOwnerName(e.target.value)}
          />
        </UpgradeField>

        <UpgradeField label="Cell phone (optional)">
          <input
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100"
            placeholder="e.g., 555-123-4567"
            value={newBizPhone}
            onChange={(e) => setNewBizPhone(e.target.value)}
          />
        </UpgradeField>

        <UpgradeField label="Business logo (optional)">
          <input
            type="file"
            accept="image/*"
            className="w-full text-xs"
            onChange={(e) => setNewBizLogoFile(e.target.files?.[0] || null)}
          />
          <div className="text-[11px] text-slate-500 mt-1">PNG/JPG recommended.</div>
        </UpgradeField>

        <div className="sm:col-span-2">
          <div className="flex gap-2 flex-wrap items-center">
            <button
              className="rounded-xl px-4 py-2 bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 text-sm disabled:opacity-60"
              onClick={createBusiness}
              disabled={creatingBiz || !newBizName.trim() || !newBizEmail.trim()}
              type="button"
            >
              {creatingBiz ? "Creating..." : "Create business"}
            </button>

            <div className="text-xs text-slate-500">
              Creates the business and saves contact fields + logo (if provided).
            </div>
          </div>
        </div>
      </div>
    </UpgradeCard>
  );
}