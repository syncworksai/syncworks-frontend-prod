import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ContextHelpButton({
  title = "Need help?",
  summary = "",
  steps = [],
  articleKey = "",
  className = "",
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label={`Help: ${title}`}
        title={title}
        onClick={() => setOpen(true)}
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-400/35 bg-cyan-500/10 text-xs font-black text-cyan-100 transition hover:bg-cyan-500/20 ${className}`}
      >
        i
      </button>

      {open ? (
        <div className="fixed inset-0 z-[120]">
          <button
            type="button"
            aria-label="Close help"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <aside className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-[2rem] border border-cyan-500/25 bg-[#07101f] p-5 shadow-[0_0_80px_rgba(34,211,238,0.18)] md:inset-y-4 md:left-auto md:right-4 md:w-[440px] md:rounded-[2rem]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
                  SyncWorks Guide
                </div>
                <h2 className="mt-2 text-xl font-black text-white">{title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-bold text-slate-300"
              >
                Close
              </button>
            </div>

            {summary ? (
              <p className="mt-4 text-sm leading-6 text-slate-300">{summary}</p>
            ) : null}

            {steps.length ? (
              <ol className="mt-5 space-y-3">
                {steps.map((step, index) => (
                  <li
                    key={`${step}-${index}`}
                    className="flex gap-3 rounded-2xl border border-slate-800 bg-slate-950/65 p-3"
                  >
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-400 text-xs font-black text-slate-950">
                      {index + 1}
                    </span>
                    <span className="pt-1 text-sm leading-5 text-slate-200">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            ) : null}

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate(
                  articleKey
                    ? `/learn?article=${encodeURIComponent(articleKey)}`
                    : "/learn"
                );
              }}
              className="mt-5 w-full rounded-2xl border border-cyan-400/40 bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950"
            >
              Open full walkthrough
            </button>
          </aside>
        </div>
      ) : null}
    </>
  );
}
