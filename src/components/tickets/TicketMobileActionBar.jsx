import React from "react";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function MobileBtn({ children, active = false, tone = "slate", className = "", ...props }) {
  const toneMap = {
    slate: active
      ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-100"
      : "border-slate-800 bg-slate-950/70 text-slate-300 hover:bg-slate-900",
    fuchsia: "border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-100 hover:bg-fuchsia-500/20",
    amber: active
      ? "border-amber-500/40 bg-amber-500/15 text-amber-100"
      : "border-slate-800 bg-slate-950/70 text-slate-300 hover:bg-slate-900",
  };

  return (
    <button
      type="button"
      className={cx(
        "inline-flex h-11 items-center justify-center rounded-2xl border px-2 text-[11px] font-black transition",
        toneMap[tone] || toneMap.slate,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export default function TicketMobileActionBar({ view, onActive, onSaved, onArchived, onNew }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 px-3 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-2">
        <MobileBtn active={view === "active"} onClick={onActive}>
          Active
        </MobileBtn>

        <MobileBtn active={view === "saved"} onClick={onSaved}>
          Saved
        </MobileBtn>

        <MobileBtn active={view === "archived"} tone="amber" onClick={onArchived}>
          Archive
        </MobileBtn>

        <MobileBtn tone="fuchsia" onClick={onNew}>
          + New
        </MobileBtn>
      </div>
    </div>
  );
}