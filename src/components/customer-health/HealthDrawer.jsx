// src/components/customer-health/HealthDrawer.jsx
import React from "react";
import { cx } from "./healthStorage";

export default function HealthDrawer({ open, title, subtitle, onClose, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        aria-label="Close drawer"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <aside className="absolute right-0 top-0 flex h-full w-full max-w-3xl flex-col border-l border-white/10 bg-[#020617] shadow-2xl">
        <div className="border-b border-white/10 bg-slate-950/80 px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-black text-white">{title}</h2>
              {subtitle ? <p className="mt-1 text-sm leading-6 text-slate-400">{subtitle}</p> : null}
            </div>

            <button
              type="button"
              onClick={onClose}
              className={cx(
                "shrink-0 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2",
                "text-xs font-black text-slate-100 hover:bg-white/[0.08]"
              )}
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </div>
  );
}