import React, { useEffect, useState } from "react";
import api from "../../../api/client";

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
  const [drafts, setDrafts] = useState([]);

  async function loadDrafts() {
    try {
      const res = await api.get("/platform-growth/growth/drafts/");
      setDrafts(Array.isArray(res.data) ? res.data : []);
    } catch {
      setDrafts([]);
    }
  }

  useEffect(() => {
    loadDrafts();
  }, []);

  // 🔥 Merge backend drafts with existing queue
  const combinedQueue = [
    ...drafts.map((d) => ({
      id: `draft-${d.id}`,
      title: d.title,
      status: d.status || "DRAFT",
      source: "AUTOMATION",
    })),
    ...contentQueue,
  ];

  return (
    <GlassCard title="Content Engine" right="frontend-first • clone-ready for SBO add-on">
      <div className="grid xl:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold text-slate-100">Content Queue</div>
            <StatusPill tone="cyan">Live + Auto</StatusPill>
          </div>

          <div className="mt-3 space-y-2">
            {combinedQueue.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-100 font-semibold">{item.title}</div>

                  {/* 🔥 AUTO TAG */}
                  {item.source === "AUTOMATION" && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-200">
                      AUTO
                    </span>
                  )}
                </div>

                <div className="mt-1">
                  <StatusPill tone={toneFromStatus(item.status)}>
                    {item.status}
                  </StatusPill>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4 xl:col-span-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <div className="font-semibold text-slate-100">AI Post Generator</div>
              <div className="text-xs text-slate-400 mt-1">
                Promptless starter actions for social + review growth.
              </div>
            </div>
            <button className="h-8 px-3 rounded-2xl text-xs border border-cyan-500/35 bg-cyan-500/10 text-cyan-100">
              Clone for SBO Add-On
            </button>
          </div>

          <div className="mt-3 grid sm:grid-cols-2 xl:grid-cols-4 gap-2">
            {aiPostPresets.map((preset) => (
              <button
                key={preset.key}
                className="h-9 px-3 rounded-xl text-xs border border-slate-800 bg-slate-950/70 hover:bg-slate-900/50 text-slate-200 text-left"
              >
                {preset.label}
              </button>
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

      {/* keep rest unchanged */}
    </GlassCard>
  );
}