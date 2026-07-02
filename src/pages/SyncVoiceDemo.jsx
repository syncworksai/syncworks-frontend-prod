import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

import SyncVoiceVisualizer from "../components/sync/SyncVoiceVisualizer";
import { SYNC_VOICE_STATUS_VALUES } from "../utils/syncVoiceStates";

const STATUS_LABELS = {
  idle: "Idle",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
  success: "Success",
  error: "Error",
};

export default function SyncVoiceDemo() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("idle");
  const [muted, setMuted] = useState(false);

  return (
    <div className="min-h-dvh bg-[#020617] p-2 text-white md:p-4">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-800 bg-slate-950/85 p-3">
          <button
            type="button"
            onClick={() => navigate("/sync")}
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 text-sm font-black text-slate-200"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            SYNC
          </button>

          <div className="flex flex-wrap justify-center gap-2">
            {SYNC_VOICE_STATUS_VALUES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatus(value)}
                className={`min-h-11 rounded-2xl border px-3 text-xs font-black ${
                  status === value
                    ? "border-cyan-300/50 bg-cyan-500/20 text-cyan-100"
                    : "border-slate-800 bg-slate-900 text-slate-400"
                }`}
              >
                {STATUS_LABELS[value]}
              </button>
            ))}
          </div>
        </div>

        <SyncVoiceVisualizer
          status={status}
          transcript={
            status === "listening"
              ? "Schedule a workout for tomorrow morning."
              : ""
          }
          responseText={
            status === "speaking"
              ? "I found an opening at 7:30 AM and prepared it for review."
              : ""
          }
          muted={muted}
          onToggleMute={() => setMuted((current) => !current)}
          onStatusChange={setStatus}
          onStartListening={() => setStatus("listening")}
          onStopListening={() => setStatus("thinking")}
          onEndSession={() => navigate("/sync")}
        />
      </div>
    </div>
  );
}
