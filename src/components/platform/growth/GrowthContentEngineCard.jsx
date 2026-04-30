import React from "react";

function GlassCard({ title, right, children }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold tracking-tight text-slate-100">{title}</div>
        {right ? <div className="text-xs text-slate-400">{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function StatusPill({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-500/10 border-slate-500/20 text-slate-200",
    cyan: "bg-cyan-500/10 border-cyan-500/20 text-cyan-200",
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-200",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-200",
    rose: "bg-rose-500/10 border-rose-500/20 text-rose-200",
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-200",
  };

  return (
    <span className={`text-[11px] px-2 py-1 rounded-full border ${tones[tone] || tones.slate}`}>
      {children}
    </span>
  );
}

export default function GrowthContentEngineCard({
  contentQueue,
  aiPostPresets,
  aiGeneratedPreviews,
  toneFromStatus,
}) {
  return (
    <GlassCard title="Content Engine" right="frontend-first • clone-ready for SBO add-on">
      <div className="grid xl:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
          <div className="flex items-center justify-between gap-2"><div className="font-semibold text-slate-100">Content Queue</div><StatusPill tone="cyan">Demo Queue</StatusPill></div>
          <div className="mt-3 space-y-2">
            {contentQueue.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-2">
                <div className="text-sm text-slate-100 font-semibold">{item.title}</div>
                <div className="mt-1"><StatusPill tone={toneFromStatus(item.status)}>{item.status}</StatusPill></div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4 xl:col-span-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <div className="font-semibold text-slate-100">AI Post Generator</div>
              <div className="text-xs text-slate-400 mt-1">Promptless starter actions for social + review growth.</div>
            </div>
            <button type="button" className="h-8 px-3 rounded-2xl text-xs border border-cyan-500/35 bg-cyan-500/10 text-cyan-100">Clone for SBO Add-On</button>
          </div>
          <div className="mt-3 grid sm:grid-cols-2 xl:grid-cols-4 gap-2">
            {aiPostPresets.map((preset) => (
              <button key={preset.key} type="button" className="h-9 px-3 rounded-xl text-xs border border-slate-800 bg-slate-950/70 hover:bg-slate-900/50 text-slate-200 text-left">{preset.label}</button>
            ))}
          </div>
          <div className="mt-3 grid md:grid-cols-3 gap-2">
            {aiGeneratedPreviews.map((card) => (
              <div key={card.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                <div className="text-sm text-slate-100 font-semibold">{card.title}</div>
                <div className="mt-1 text-xs text-slate-300">{card.body}</div>
                <div className="mt-2 text-[11px] text-slate-500">{card.channel}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
          <div className="font-semibold text-slate-100">Calendar-lite publishing view</div>
          <div className="text-xs text-slate-400 mt-1">Weekly strip with Mon/Wed/Fri cadence.</div>
          <div className="mt-3 grid grid-cols-7 gap-2 text-center text-xs">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="rounded-xl border border-slate-800 bg-slate-950/70 p-2">
                <div className="text-slate-300">{d}</div>
                {["Mon", "Wed", "Fri"].includes(d) ? <div className="mt-2"><StatusPill tone="purple">Post</StatusPill></div> : <div className="mt-2 text-slate-600">—</div>}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4 flex flex-col justify-between">
          <div>
            <div className="font-semibold text-slate-100">Create from Ticket</div>
            <div className="text-sm text-slate-300 mt-2">Convert completed service ticket into social post.</div>
            <div className="text-xs text-slate-500 mt-1">Frontend-only mock CTA for content automation pipeline.</div>
          </div>
          <div className="mt-4">
            <button type="button" className="h-9 px-3 rounded-2xl text-xs border border-emerald-500/35 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-100">
              Convert completed service ticket into social post
            </button>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}