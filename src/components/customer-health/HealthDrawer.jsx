// src/components/customer-health/HealthDrawer.jsx
import React from "react";
import { ArrowLeft, X } from "lucide-react";
import { cx } from "./healthStorage";
import "./healthSubpageShell.css";

export default function HealthDrawer({
  open,
  title,
  subtitle,
  onClose,
  children,
}) {
  if (!open) return null;

  return (
    <div className="sw-health-drawer-layer fixed inset-0 z-[1300]">
      <button
        type="button"
        aria-label="Back to previous Health screen"
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
      />

      <aside className="sw-health-drawer-panel absolute right-0 top-0 flex h-[100dvh] w-full max-w-3xl flex-col border-l border-cyan-300/15 bg-[#020712] shadow-2xl">
        <header className="sw-health-drawer-header shrink-0 border-b border-white/10 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:px-5 sm:pb-4 sm:pt-4">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={onClose}
              aria-label="Back to previous Health screen"
              className={cx(
                "sw-health-drawer-back grid h-11 w-11 shrink-0 place-items-center rounded-2xl border",
                "text-white transition hover:bg-cyan-300/10"
              )}
            >
              <ArrowLeft size={19} />
            </button>

            <div className="min-w-0 flex-1">
              <div className="sw-health-drawer-brand text-[9px] font-black uppercase text-cyan-300 sm:text-[10px]">
                SyncWorks Health
              </div>
              <h2 className="mt-1 text-lg font-black leading-tight text-white sm:text-xl">
                {title}
              </h2>
              {subtitle ? (
                <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400 sm:text-sm sm:leading-6">
                  {subtitle}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Health screen"
              className={cx(
                "hidden h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]",
                "text-slate-200 transition hover:bg-white/[0.08] sm:grid"
              )}
            >
              <X size={17} />
            </button>
          </div>
        </header>

        <div className="sw-health-drawer-body min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] sm:p-5">
          {children}
        </div>
      </aside>
    </div>
  );
}
