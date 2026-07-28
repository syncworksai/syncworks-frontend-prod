import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Headphones,
  LoaderCircle,
  Mic,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";

import {
  getSyncAiErrorMessage,
  sendSyncAiMessage,
  synthesizeSyncSpeech,
} from "../../api/syncAi";

const PANEL_IMAGE = "/sync/sync-voice-panel.webp";
const JARVIS_VOICE_ID = "kSiaSqSOAHNl8g8caZB5";

const SUMMARY_PROMPT = [
  "Give me a complete spoken personal briefing for audio playback.",
  "Use only my authenticated Personal workspace data.",
  "Cover my saved profile, requests, active and scheduled tickets, approvals, recent ticket activity, health and workout availability, finance snapshot and plan status, pending tasks, missing information, and the most important next actions.",
  "Make it natural to listen to while driving, walking, or exercising.",
  "Do not use markdown tables.",
].join(" ");

function browserSpeak(text, callbacks = {}) {
  if (!window.speechSynthesis || !text) return false;
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices?.() || [];
  const preferred =
    voices.find((voice) =>
      /daniel|alex|guy|google us english/i.test(voice.name || "")
    ) ||
    voices.find((voice) =>
      String(voice.lang || "").toLowerCase().startsWith("en-us")
    ) ||
    voices[0];

  if (preferred) utterance.voice = preferred;
  utterance.lang = preferred?.lang || "en-US";
  utterance.rate = 0.96;
  utterance.pitch = 0.92;
  utterance.onstart = callbacks.onStart;
  utterance.onend = callbacks.onEnd;
  utterance.onerror = callbacks.onEnd;
  window.speechSynthesis.speak(utterance);
  return true;
}

export default function CustomerAudioSummaryDrawer({
  open,
  onClose,
  displayName = "",
}) {
  const audioRef = useRef(null);
  const objectUrlRef = useRef("");
  const [summary, setSummary] = useState("");
  const [status, setStatus] = useState("idle");
  const [notice, setNotice] = useState("");
  const [usingFallback, setUsingFallback] = useState(false);

  const speaking = status === "speaking";
  const loading = status === "loading";

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel?.();
    setStatus((current) => (current === "loading" ? current : "ready"));
  }, []);

  const cleanupObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = "";
    }
  }, []);

  const playSummary = useCallback(
    async (text) => {
      const clean = String(text || summary || "").trim();
      if (!clean) return;

      stopAudio();
      cleanupObjectUrl();
      setNotice("");
      setUsingFallback(false);

      try {
        const blob = await synthesizeSyncSpeech(clean);
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onplay = () => setStatus("speaking");
        audio.onended = () => setStatus("ready");
        audio.onerror = () => {
          setStatus("ready");
          setNotice("Premium voice playback failed. Using the phone voice.");
          setUsingFallback(true);
          browserSpeak(clean, {
            onStart: () => setStatus("speaking"),
            onEnd: () => setStatus("ready"),
          });
        };

        await audio.play();
      } catch {
        setUsingFallback(true);
        setNotice(
          "ElevenLabs is not configured or is temporarily unavailable. Using the phone voice."
        );
        const started = browserSpeak(clean, {
          onStart: () => setStatus("speaking"),
          onEnd: () => setStatus("ready"),
        });
        setStatus(started ? "speaking" : "ready");
      }
    },
    [cleanupObjectUrl, stopAudio, summary]
  );

  const loadSummary = useCallback(async () => {
    setStatus("loading");
    setNotice("");
    setSummary("");
    stopAudio();

    try {
      const result = await sendSyncAiMessage({
        workspace: "personal",
        message: SUMMARY_PROMPT,
      });
      const text = String(result?.message || "").trim();
      if (!text) throw new Error("SYNC returned no summary.");
      setSummary(text);
      setStatus("ready");
      await playSummary(text);
    } catch (error) {
      setStatus("error");
      setNotice(getSyncAiErrorMessage(error));
    }
  }, [playSummary, stopAudio]);

  useEffect(() => {
    if (!open) {
      stopAudio();
      cleanupObjectUrl();
      return;
    }
    loadSummary();
  }, [open]); // deliberately load once each time the drawer opens

  useEffect(
    () => () => {
      stopAudio();
      cleanupObjectUrl();
    },
    [cleanupObjectUrl, stopAudio]
  );

  if (!open) return null;

  const bars = Array.from({ length: 26 });

  return (
    <div className="fixed inset-0 z-[190] flex items-end justify-center bg-black/75 backdrop-blur-sm">
      <style>{`
        @keyframes customerSyncWave {
          0%, 100% { transform: scaleY(.28); opacity: .45; }
          50% { transform: scaleY(1); opacity: 1; }
        }
        @keyframes customerSyncGlow {
          0%, 100% { opacity: .42; transform: scale(.97); }
          50% { opacity: 1; transform: scale(1.03); }
        }
      `}</style>

      <section className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-t-[2rem] border border-cyan-400/25 bg-[#020617] shadow-[0_-20px_100px_rgba(34,211,238,.15)]">
        <div className="relative h-52 overflow-hidden rounded-t-[2rem] border-b border-cyan-400/15">
          <img
            src={PANEL_IMAGE}
            alt="SYNC audio summary"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(2,6,23,1),rgba(2,6,23,.12))]" />

          <button
            type="button"
            onClick={() => {
              stopAudio();
              onClose?.();
            }}
            className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-2xl border border-slate-700 bg-slate-950/80 text-slate-200 backdrop-blur"
            aria-label="Close audio summary"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="absolute inset-x-5 bottom-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">
                  Personal SYNC · audio only
                </div>
                <h2 className="mt-2 text-2xl font-black text-white">
                  {displayName ? `${displayName}'s daily summary` : "Your daily summary"}
                </h2>
                <p className="mt-1 text-sm text-slate-300">
                  Profile, schedule, requests, Health, Money, and next actions.
                </p>
              </div>
              <div
                className="hidden rounded-full border border-cyan-300/30 bg-cyan-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100 sm:block"
                style={{ animation: "customerSyncGlow 1.8s ease-in-out infinite" }}
              >
                {usingFallback ? "Phone voice" : "Jarvis voice"}
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 md:p-6">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100">
              ElevenLabs · {JARVIS_VOICE_ID}
            </span>
            <span className="rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-violet-100">
              {loading
                ? "Building summary"
                : speaking
                ? "Speaking"
                : status === "error"
                ? "Needs attention"
                : "Ready"}
            </span>
          </div>

          <div className="mt-6 flex h-20 items-end gap-1 rounded-3xl border border-cyan-400/15 bg-cyan-500/[0.05] px-4 py-3">
            {bars.map((_, index) => (
              <span
                key={index}
                className={`block flex-1 rounded-full ${
                  index % 2 ? "bg-violet-300/90" : "bg-cyan-300/90"
                }`}
                style={{
                  height: `${24 + ((index * 17) % 70)}%`,
                  animation: `customerSyncWave ${
                    1 + (index % 5) * 0.13
                  }s ease-in-out infinite`,
                  animationDelay: `${index * 0.055}s`,
                  animationPlayState:
                    speaking || loading ? "running" : "paused",
                  opacity: speaking || loading ? 1 : 0.42,
                }}
              />
            ))}
          </div>

          <div className="mt-5 rounded-3xl border border-slate-800 bg-slate-950/70 p-5 text-center">
            {loading ? (
              <>
                <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-cyan-200" />
                <div className="mt-3 font-black text-white">
                  SYNC is reviewing your profile
                </div>
                <div className="mt-1 text-sm text-slate-400">
                  Building the spoken briefing now.
                </div>
              </>
            ) : (
              <>
                <Headphones className="mx-auto h-8 w-8 text-cyan-200" />
                <div className="mt-3 font-black text-white">
                  {speaking ? "Your briefing is playing" : "Your briefing is ready"}
                </div>
                <div className="mt-1 text-sm text-slate-400">
                  This drawer is audio-first. Open SYNC for the written conversation.
                </div>
              </>
            )}
          </div>

          {notice ? (
            <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm leading-6 text-amber-100">
              {notice}
            </div>
          ) : null}

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => playSummary()}
              disabled={!summary || loading}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 text-sm font-black text-cyan-100 disabled:opacity-40"
            >
              <Play className="h-4 w-4" />
              Play
            </button>
            <button
              type="button"
              onClick={stopAudio}
              disabled={!speaking}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 text-sm font-black text-slate-100 disabled:opacity-40"
            >
              <Pause className="h-4 w-4" />
              Stop
            </button>
            <button
              type="button"
              onClick={loadSummary}
              disabled={loading}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-violet-400/25 bg-violet-500/10 px-4 text-sm font-black text-violet-100 disabled:opacity-40"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => window.location.assign("/sync")}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 px-4 text-sm font-black text-white"
            >
              <Mic className="h-4 w-4" />
              Ask SYNC
            </button>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-center text-[11px] text-slate-500">
            <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
            Audio is generated only after you open this drawer.
          </div>
        </div>
      </section>
    </div>
  );
}
