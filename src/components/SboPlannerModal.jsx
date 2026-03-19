import React, { useEffect } from "react";
import TodoList from "./TodoList";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export default function SboPlannerModal({
  open,
  onClose,
  scope = "sbo",
  title = "Planner",
  subtitle = "Daily, weekly, monthly, and goal-based planning for your business.",
}) {
  useEffect(() => {
    if (!open) return;

    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }

    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[140]">
      <button
        type="button"
        aria-label="Close planner modal"
        className="absolute inset-0 bg-black/75"
        onClick={onClose}
      />
      <div className="absolute inset-0 overflow-y-auto">
        <div className="min-h-full p-3 sm:p-6">
          <div
            className={cx(
              "mx-auto w-full max-w-7xl rounded-[28px] border border-slate-800 bg-slate-950/95 backdrop-blur",
              "shadow-[0_0_90px_rgba(0,0,0,0.6)] relative overflow-hidden"
            )}
          >
            <div className="pointer-events-none absolute -inset-16 bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-fuchsia-500/10 blur-3xl" />

            <div className="relative">
              <div className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/90 backdrop-blur px-4 py-4 sm:px-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xl font-extrabold text-slate-100">{title}</div>
                    {subtitle ? (
                      <div className="mt-1 text-sm text-slate-400">{subtitle}</div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/70 text-slate-200 hover:bg-slate-900/50"
                    title="Close"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-3 sm:p-6">
                <TodoList
                  scope={scope}
                  title="Business Planner"
                  subtitle="Organize daily work, weekly priorities, monthly admin, and long-term goals."
                  compact={false}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}