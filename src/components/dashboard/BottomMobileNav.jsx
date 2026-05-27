import React from "react";
import { cx } from "./GlassCard";

export default function BottomMobileNav({ items = [], centerAction }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-800/90 bg-slate-950/90 px-3 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 items-end gap-1">
        {items.slice(0, 2).map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            className={cx(
              "flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-[10px] font-semibold transition",
              item.active
                ? "bg-cyan-500/12 text-cyan-200"
                : "text-slate-400 hover:bg-slate-900/70 hover:text-slate-100"
            )}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span className="mt-1 truncate">{item.label}</span>
          </button>
        ))}

        <button
          type="button"
          onClick={centerAction?.onClick}
          className="-mt-8 flex flex-col items-center justify-center"
          title={centerAction?.label || "New"}
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-cyan-300/50 bg-gradient-to-br from-cyan-400 via-blue-500 to-fuchsia-500 text-3xl font-black text-white shadow-[0_0_35px_rgba(34,211,238,0.45)]">
            +
          </span>
          <span className="mt-1 text-[10px] font-black text-cyan-100">
            {centerAction?.label || "New"}
          </span>
        </button>

        {items.slice(2, 4).map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            className={cx(
              "flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-[10px] font-semibold transition",
              item.active
                ? "bg-cyan-500/12 text-cyan-200"
                : "text-slate-400 hover:bg-slate-900/70 hover:text-slate-100"
            )}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span className="mt-1 truncate">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}