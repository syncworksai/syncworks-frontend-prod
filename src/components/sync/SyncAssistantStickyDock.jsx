import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronUp, Mic, Minimize2, MessageCircleMore, Pause, Play, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  getSyncRoleAwareBriefing,
  getSyncVoiceStatus,
  synthesizeSyncSpeech,
} from "../../api/syncAi";

const WAVE_BARS = [8, 14, 22, 34, 48, 62, 42, 28, 54, 72, 46, 30, 64, 84, 52, 34, 68, 50, 30, 18, 10];

function browserSpeak(text, callbacks = {}) {
  if (!window.speechSynthesis || !text) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.96;
  utterance.pitch = 0.94;
  utterance.onstart = callbacks.onStart;
  utterance.onend = callbacks.onEnd;
  utterance.onerror = callbacks.onEnd;
  window.speechSynthesis.speak(utterance);
  return true;
}

function briefingText(payload, displayName) {
  const sections = Array.isArray(payload?.sections) ? payload.sections : [];
  const name = displayName || "there";
  const pieces = [`Good day, ${name}. Here is what matters right now.`];
  sections.slice(0, 7).forEach((section) => {
    if (section?.summary) pieces.push(`${section.title || "Update"}. ${section.summary}`);
  });
  if (payload?.recommended_next?.title) {
    pieces.push(`My recommendation. ${payload.recommended_next.title}. ${payload.recommended_next.detail || ""}`);
  }
  if (pieces.length === 1) pieces.push("You have no important new updates right now.");
  return pieces.join(" ").slice(0, 4600);
}

function stateLabel(state, fallback) {
  if (fallback) return "DEVICE VOICE";
  if (state === "processing") return "PROCESSING";
  if (state === "speaking") return "SPEAKING";
  if (state === "listening") return "LISTENING";
  if (state === "ready") return "RESPONSE READY";
  return "READY";
}

function MiniOrb({ active, label, children, onClick, accent = "cyan" }) {
  const tones = accent === "green"
    ? "border-emerald-300/50 shadow-[0_0_18px_rgba(52,211,153,.28)]"
    : accent === "violet"
      ? "border-violet-300/50 shadow-[0_0_18px_rgba(139,92,246,.3)]"
      : "border-cyan-300/50 shadow-[0_0_18px_rgba(34,211,238,.28)]";
  return (
    <button type="button" onClick={onClick} className="group flex min-w-0 flex-1 flex-col items-center gap-1.5" aria-label={label}>
      <span className={`relative grid h-11 w-11 place-items-center rounded-full border bg-[radial-gradient(circle_at_36%_28%,rgba(255,255,255,.18),rgba(3,7,18,.88)_45%,rgba(2,6,23,1)_72%)] ${tones} ${active ? "ring-2 ring-cyan-300/35" : ""}`}>
        <span className="absolute inset-1 rounded-full border border-white/10" />
        <span className="relative text-lg font-black italic tracking-[-.16em] text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,.9)]">S</span>
        {children}
      </span>
      <span className="max-w-[64px] truncate text-[8px] font-black uppercase tracking-[.08em] text-slate-500 group-hover:text-cyan-200">{label}</span>
    </button>
  );
}

export default function SyncAssistantStickyDock({ displayName = "" }) {
  const navigate = useNavigate();
  const audioRef = useRef(null);
  const objectUrlRef = useRef("");
  const recognitionRef = useRef(null);
  const mountedRef = useRef(true);
  const [state, setState] = useState("idle");
  const [minimized, setMinimized] = useState(false);
  const [notice, setNotice] = useState("Tap SYNC to hear what matters now.");
  const [voiceConfigured, setVoiceConfigured] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);

  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = "";
    }
    window.speechSynthesis?.cancel?.();
  }, []);

  const finishReady = useCallback(() => {
    if (!mountedRef.current) return;
    setState("ready");
    setNotice("Briefing complete. Tap the mic to talk to SYNC.");
  }, []);

  const playBriefing = useCallback(async () => {
    if (state === "processing") return;
    if (state === "speaking") {
      cleanupAudio();
      setState("ready");
      setNotice("Briefing paused.");
      return;
    }

    cleanupAudio();
    setMinimized(false);
    setUsingFallback(false);
    setState("processing");
    setNotice("Reviewing your connected day…");

    try {
      const payload = await getSyncRoleAwareBriefing();
      const text = briefingText(payload, displayName);
      setNotice("SYNC is preparing your voice briefing…");
      const blob = await synthesizeSyncSpeech(text);
      if (!(blob instanceof Blob) || blob.size < 100) throw new Error("Invalid ElevenLabs audio response");
      const url = URL.createObjectURL(blob.type ? blob : new Blob([blob], { type: "audio/mpeg" }));
      objectUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onplay = () => {
        if (!mountedRef.current) return;
        setState("speaking");
        setNotice("SYNC Assistant is speaking…");
      };
      audio.onended = finishReady;
      audio.onerror = () => {
        setUsingFallback(true);
        const started = browserSpeak(text, {
          onStart: () => {
            setState("speaking");
            setNotice("Using device voice fallback…");
          },
          onEnd: finishReady,
        });
        if (!started) finishReady();
      };
      await audio.play();
    } catch {
      setUsingFallback(true);
      try {
        const payload = await getSyncRoleAwareBriefing();
        const text = briefingText(payload, displayName);
        const started = browserSpeak(text, {
          onStart: () => {
            setState("speaking");
            setNotice("Using device voice fallback…");
          },
          onEnd: finishReady,
        });
        if (!started) finishReady();
      } catch {
        setState("ready");
        setNotice("SYNC voice is temporarily unavailable. Open chat instead.");
      }
    }
  }, [cleanupAudio, displayName, finishReady, state]);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop?.();
      recognitionRef.current = null;
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      navigate("/sync");
      return;
    }
    cleanupAudio();
    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => {
      setState("listening");
      setNotice("I’m here — go ahead…");
    };
    recognition.onend = () => {
      if (mountedRef.current) setState((value) => value === "listening" ? "ready" : value);
    };
    recognition.onerror = () => {
      setState("ready");
      setNotice("I couldn’t hear that. Tap again or open SYNC chat.");
    };
    recognition.onresult = (event) => {
      const transcript = String(event.results?.[0]?.[0]?.transcript || "").trim();
      if (transcript) {
        sessionStorage.setItem("syncAssistantPendingPrompt", transcript);
        setNotice(`Heard: “${transcript}”`);
        navigate("/sync");
      }
    };
    recognitionRef.current = recognition;
    recognition.start();
  }, [cleanupAudio, navigate]);

  useEffect(() => {
    mountedRef.current = true;
    getSyncVoiceStatus()
      .then((value) => setVoiceConfigured(Boolean(value?.configured)))
      .catch(() => setVoiceConfigured(false));
    const handlePlay = () => playBriefing();
    window.addEventListener("sync-assistant:play-briefing", handlePlay);
    return () => {
      mountedRef.current = false;
      window.removeEventListener("sync-assistant:play-briefing", handlePlay);
      recognitionRef.current?.stop?.();
      cleanupAudio();
    };
  }, [cleanupAudio, playBriefing]);

  const activeWave = state === "speaking" || state === "listening";
  const status = stateLabel(state, usingFallback);
  const actionLabel = state === "speaking" ? "Tap to pause" : state === "processing" ? "Building briefing…" : notice;

  const waveBars = useMemo(() => WAVE_BARS, []);

  if (minimized) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-[175] px-3 pb-[max(.55rem,env(safe-area-inset-bottom))] md:left-1/2 md:max-w-xl md:-translate-x-1/2">
        <button type="button" onClick={() => setMinimized(false)} className="mx-auto flex w-full items-center gap-3 rounded-[1.35rem] border border-cyan-300/30 bg-[#020817]/95 px-3 py-2.5 shadow-[0_-10px_55px_rgba(14,165,233,.24)] backdrop-blur-2xl">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-cyan-300/60 bg-[radial-gradient(circle_at_36%_30%,rgba(56,189,248,.26),rgba(2,6,23,.92)_64%)] shadow-[0_0_25px_rgba(34,211,238,.38)]"><span className="text-xl font-black italic text-cyan-300">S</span></span>
          <span className="min-w-0 flex-1 text-left"><span className="block text-[10px] font-black uppercase tracking-[.18em] text-cyan-300">SYNC Assistant</span><span className="block truncate text-xs text-slate-400">{status} · {notice}</span></span>
          <ChevronUp className="h-5 w-5 text-cyan-200" />
        </button>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes syncWavePulse { 0%,100% { transform: scaleY(.35); opacity:.46; } 45% { transform: scaleY(1); opacity:1; } }
        @keyframes syncOrbPulse { 0%,100% { box-shadow:0 0 22px rgba(34,211,238,.34),0 0 48px rgba(79,70,229,.18); } 50% { box-shadow:0 0 34px rgba(34,211,238,.72),0 0 78px rgba(124,58,237,.42); } }
        @keyframes syncRingSpin { to { transform: rotate(360deg); } }
        @keyframes syncDotPulse { 0%,100% { opacity:.32; transform:scale(.75); } 50% { opacity:1; transform:scale(1); } }
      `}</style>
      <div className="fixed inset-x-0 bottom-0 z-[175] px-2 pb-[max(.35rem,env(safe-area-inset-bottom))] md:left-1/2 md:max-w-2xl md:-translate-x-1/2 md:px-3">
        <section className="overflow-hidden rounded-[1.8rem] border border-cyan-300/30 bg-[linear-gradient(180deg,rgba(3,10,28,.97),rgba(2,6,23,.985))] shadow-[0_-16px_75px_rgba(14,165,233,.22),0_0_50px_rgba(79,70,229,.13)] backdrop-blur-2xl">
          <div className="relative px-3 pb-3 pt-2.5 sm:px-5">
            <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent" />
            <div className="flex items-center justify-center gap-3 text-center">
              <span className="h-px w-10 bg-gradient-to-r from-transparent to-cyan-500/60" />
              <span className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-300">SYNC Assistant</span>
              <span className="h-px w-10 bg-gradient-to-l from-transparent to-violet-500/60" />
            </div>

            <div className="relative mt-1.5 flex min-h-[95px] items-center justify-center overflow-hidden">
              <div className="absolute inset-x-0 flex items-center justify-center gap-[3px] px-1">
                {waveBars.map((height, index) => (
                  <span key={index} className="block w-[3px] rounded-full bg-gradient-to-t from-cyan-400 via-blue-400 to-violet-400 shadow-[0_0_8px_rgba(59,130,246,.75)]" style={{ height: `${Math.max(8, Math.round(height * .62))}px`, transformOrigin: "center", animation: activeWave ? `syncWavePulse ${.52 + (index % 5) * .08}s ease-in-out ${(index % 7) * .05}s infinite` : "none", opacity: activeWave ? 1 : .24 }} />
                ))}
              </div>

              <button type="button" onClick={playBriefing} disabled={state === "processing"} className="relative z-10 grid h-[82px] w-[82px] place-items-center rounded-full border border-cyan-200/80 bg-[radial-gradient(circle_at_35%_28%,rgba(59,130,246,.36),rgba(3,7,18,.98)_58%)] shadow-[0_0_28px_rgba(34,211,238,.48),0_0_58px_rgba(124,58,237,.25)] disabled:opacity-80" style={{ animation: activeWave ? "syncOrbPulse 1.35s ease-in-out infinite" : "none" }} aria-label={state === "speaking" ? "Pause SYNC briefing" : "Play SYNC briefing"}>
                <span className="absolute inset-[7px] rounded-full border border-blue-400/70 shadow-[inset_0_0_18px_rgba(59,130,246,.34)]" />
                <span className="absolute inset-[2px] rounded-full border border-violet-400/40" style={{ animation: state === "processing" ? "syncRingSpin 1.1s linear infinite" : "none", borderStyle: state === "processing" ? "dashed" : "solid" }} />
                {state === "speaking" ? <Pause className="relative h-7 w-7 text-cyan-100" /> : state === "processing" ? <Sparkles className="relative h-7 w-7 text-cyan-200" /> : <span className="relative text-4xl font-black italic tracking-[-.18em] text-cyan-300 drop-shadow-[0_0_12px_rgba(34,211,238,.95)]">S</span>}
              </button>
            </div>

            <div className="-mt-1 text-center">
              <div className="text-[11px] font-black tracking-[.16em] text-white">{status}</div>
              <div className="mx-auto mt-0.5 max-w-[290px] truncate text-[10px] text-cyan-300/90">{actionLabel}</div>
              <div className="mt-1 flex justify-center gap-1.5">
                {[0,1,2].map((dot) => <span key={dot} className="h-1.5 w-1.5 rounded-full bg-cyan-400" style={{ animation: activeWave ? `syncDotPulse .9s ease-in-out ${dot * .16}s infinite` : "none", opacity: activeWave ? 1 : .28 }} />)}
              </div>
            </div>

            <div className="mt-2 flex items-start justify-between gap-1">
              <MiniOrb label="Default" active={state === "idle"} onClick={playBriefing} />
              <MiniOrb label="Active" active={false} accent="violet" onClick={() => navigate("/sync")}><MessageCircleMore className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-violet-500 p-[2px] text-white" /></MiniOrb>
              <MiniOrb label="Processing" active={state === "processing"} accent="violet" onClick={playBriefing}><span className={`absolute inset-[-4px] rounded-full border border-dashed border-cyan-300/70 ${state === "processing" ? "animate-spin" : "opacity-40"}`} /></MiniOrb>
              <MiniOrb label="Response ready" active={state === "ready"} accent="green" onClick={startListening}>{state === "ready" ? <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-emerald-400 text-slate-950"><Check className="h-3 w-3" /></span> : null}</MiniOrb>
              <MiniOrb label="Listen" active={state === "listening"} onClick={startListening}><Mic className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-cyan-500 p-[2px] text-white" /></MiniOrb>
              <MiniOrb label="Minimize" active={false} onClick={() => setMinimized(true)}><Minimize2 className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-slate-800 p-[2px] text-cyan-100" /></MiniOrb>
            </div>

            <div className="mt-2 flex items-center justify-center gap-2 text-[8px] uppercase tracking-[.11em] text-slate-600">
              <span className={`h-1.5 w-1.5 rounded-full ${voiceConfigured ? "bg-emerald-400" : "bg-amber-400"}`} />
              {voiceConfigured ? "ElevenLabs voice ready" : "Voice fallback available"}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
