import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  ExternalLink,
  LoaderCircle,
  Mic,
  Pause,
  Play,
  RefreshCw,
  Repeat2,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";

import {
  getSyncAiErrorMessage,
  getSyncRoleAwareBriefing,
  getSyncVoiceStatus,
  synthesizeSyncSpeech,
} from "../../api/syncAi";

const PANEL_IMAGE = "/sync/sync-voice-panel.webp";

function browserSpeak(text, callbacks = {}) {
  if (!window.speechSynthesis || !text) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices?.() || [];
  const preferred =
    voices.find((voice) => /daniel|alex|guy|google us english/i.test(voice.name || "")) ||
    voices.find((voice) => String(voice.lang || "").toLowerCase().startsWith("en-us")) ||
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

function normalizeSections(payload) {
  return (Array.isArray(payload?.sections) ? payload.sections : [])
    .filter((section) => section?.summary)
    .map((section) => ({
      key: String(section.id || section.title || Math.random()),
      label: String(section.title || "SYNC update"),
      text: String(section.summary || ""),
      priority: String(section.priority || "normal"),
      count: section.count,
      change: section.change_since_last_brief,
      detailsUrl: String(section.details_url || ""),
      actions: Array.isArray(section.actions) ? section.actions : [],
      items: Array.isArray(section.items) ? section.items : [],
    }));
}

function briefingIntro(payload, displayName) {
  const name = displayName || "there";
  const total = Number(payload?.total_updates || 0);
  const urgent = Number(payload?.high_priority_count || 0);
  const pieces = [
    `Good day, ${name}.`,
    total
      ? `Since your last briefing, you have ${total} updates across SyncWorks.`
      : "There are no newly recorded updates since your last briefing.",
  ];
  if (urgent) pieces.push(`${urgent} sections need your attention.`);
  if (payload?.partial_success) {
    pieces.push("Some areas could not be loaded, but the available briefing is ready.");
  }
  return pieces.join(" ");
}

function destinationForCommand(command, sections) {
  const normalized = String(command || "").toLowerCase();
  const exact = sections.find((section) =>
    normalized.includes(section.label.toLowerCase())
  );
  if (exact?.detailsUrl) return exact.detailsUrl;

  const targets = [
    [/god mode|platform report|syncworks report/, "god_mode"],
    [/stripe|payment setup/, "god_mode"],
    [/calendar|schedule|appointment/, "calendar"],
    [/affiliate|commission/, "affiliate"],
    [/personal request|my request/, "personal_requests"],
  ];
  for (const [pattern, key] of targets) {
    if (!pattern.test(normalized)) continue;
    const section = sections.find((item) => item.key === key || item.key.startsWith(key));
    if (section?.detailsUrl) return section.detailsUrl;
  }
  return "";
}

export default function CustomerAudioSummaryDrawer({ open, onClose, displayName = "" }) {
  const audioRef = useRef(null);
  const objectUrlRef = useRef("");
  const recognitionRef = useRef(null);
  const sectionsRef = useRef([]);
  const indexRef = useRef(0);

  const [briefing, setBriefing] = useState(null);
  const [sections, setSections] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [status, setStatus] = useState("idle");
  const [notice, setNotice] = useState("");
  const [usingFallback, setUsingFallback] = useState(false);
  const [voiceConfigured, setVoiceConfigured] = useState(null);
  const [listening, setListening] = useState(false);

  const loading = status === "loading";
  const speaking = status === "speaking";
  const current = sections[activeIndex] || null;

  useEffect(() => {
    sectionsRef.current = sections;
  }, [sections]);

  useEffect(() => {
    indexRef.current = activeIndex;
  }, [activeIndex]);

  const cleanupObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = "";
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel?.();
    setStatus((value) => (value === "loading" ? value : "ready"));
  }, []);

  const playText = useCallback(async (text, onEnd) => {
    const spoken = String(text || "").trim().slice(0, 1800);
    if (!spoken) return;
    stopAudio();
    cleanupObjectUrl();
    setUsingFallback(false);

    try {
      const blob = await synthesizeSyncSpeech(spoken);
      if (!(blob instanceof Blob) || blob.size < 100) throw new Error("Invalid voice response");
      const url = URL.createObjectURL(blob.type ? blob : new Blob([blob], { type: "audio/mpeg" }));
      objectUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onplay = () => setStatus("speaking");
      audio.onended = () => {
        setStatus("ready");
        onEnd?.();
      };
      audio.onerror = () => {
        setUsingFallback(true);
        browserSpeak(spoken, {
          onStart: () => setStatus("speaking"),
          onEnd: () => {
            setStatus("ready");
            onEnd?.();
          },
        });
      };
      await audio.play();
    } catch {
      setUsingFallback(true);
      const started = browserSpeak(spoken, {
        onStart: () => setStatus("speaking"),
        onEnd: () => {
          setStatus("ready");
          onEnd?.();
        },
      });
      setStatus(started ? "speaking" : "ready");
    }
  }, [cleanupObjectUrl, stopAudio]);

  const playSection = useCallback(async (index, options = {}) => {
    const section = sectionsRef.current[index];
    if (!section?.text) return;
    setActiveIndex(index);
    setNotice("");
    await playText(`${section.label}. ${section.text}`, () => {
      if (options.autoAdvance !== false && index + 1 < sectionsRef.current.length) {
        playSection(index + 1, options);
      }
    });
  }, [playText]);

  const loadSummary = useCallback(async () => {
    setStatus("loading");
    setNotice("");
    setBriefing(null);
    setSections([]);
    stopAudio();

    try {
      const payload = await getSyncRoleAwareBriefing();
      const parsed = normalizeSections(payload);
      if (!parsed.length) throw new Error("SYNC returned no briefing sections.");
      setBriefing(payload);
      setSections(parsed);
      sectionsRef.current = parsed;
      setActiveIndex(0);
      setStatus("ready");
      const intro = briefingIntro(payload, displayName);
      window.setTimeout(() => {
        playText(intro, () => playSection(0, { autoAdvance: true }));
      }, 0);
    } catch (error) {
      setStatus("error");
      setNotice(getSyncAiErrorMessage(error));
    }
  }, [displayName, playSection, playText, stopAudio]);

  const playNext = useCallback(() => {
    const next = Math.min(indexRef.current + 1, sectionsRef.current.length - 1);
    playSection(next, { autoAdvance: true });
  }, [playSection]);

  const repeatCurrent = useCallback(() => {
    playSection(indexRef.current, { autoAdvance: false });
  }, [playSection]);

  const handleVoiceCommand = useCallback((transcript) => {
    const command = String(transcript || "").toLowerCase();
    if (/stop|pause|quiet/.test(command)) return stopAudio();
    if (/start over|from the beginning/.test(command)) {
      return playText(briefingIntro(briefing, displayName), () =>
        playSection(0, { autoAdvance: true })
      );
    }
    if (/repeat/.test(command) && !/god mode|business|calendar|affiliate|stripe/.test(command)) {
      return repeatCurrent();
    }
    if (/continue|next|go on/.test(command)) return playNext();
    if (/take me|open|show me|view/.test(command)) {
      const destination = destinationForCommand(command, sectionsRef.current);
      if (destination) {
        stopAudio();
        window.location.assign(destination);
        return;
      }
    }

    const target = sectionsRef.current.find((section) => {
      const label = section.label.toLowerCase();
      return command.includes(label) ||
        (section.key === "god_mode" && /god mode|platform report/.test(command)) ||
        (section.key.startsWith("business_") && command.includes(label));
    });
    if (target) {
      const index = sectionsRef.current.indexOf(target);
      return playSection(index, { autoAdvance: false });
    }

    setNotice(`I heard “${transcript}.” Say continue, repeat, stop, read my God Mode report, name a business, or say take me to a report.`);
  }, [briefing, displayName, playNext, playSection, playText, repeatCurrent, stopAudio]);

  const toggleListening = useCallback(() => {
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setNotice("Voice commands are not supported by this browser. Use the report buttons instead.");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event) =>
      handleVoiceCommand(event.results?.[0]?.[0]?.transcript || "");
    recognitionRef.current = recognition;
    recognition.start();
  }, [handleVoiceCommand, listening]);

  useEffect(() => {
    if (!open) {
      stopAudio();
      cleanupObjectUrl();
      recognitionRef.current?.stop?.();
      return;
    }
    getSyncVoiceStatus()
      .then((value) => setVoiceConfigured(Boolean(value?.configured)))
      .catch(() => setVoiceConfigured(false));
    loadSummary();
  }, [open]);

  useEffect(() => () => {
    stopAudio();
    cleanupObjectUrl();
    recognitionRef.current?.stop?.();
  }, [cleanupObjectUrl, stopAudio]);

  const progress = useMemo(
    () => (sections.length ? `${activeIndex + 1} of ${sections.length}` : ""),
    [activeIndex, sections.length]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[190] flex items-end justify-center bg-black/80 backdrop-blur-sm">
      <section className="max-h-[94dvh] w-full max-w-4xl overflow-y-auto rounded-t-[2rem] border border-cyan-400/25 bg-[#020617] shadow-[0_-20px_100px_rgba(34,211,238,.18)]">
        <div className="relative h-44 overflow-hidden rounded-t-[2rem] border-b border-cyan-400/15 sm:h-52">
          <img src={PANEL_IMAGE} alt="SYNC complete briefing" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(2,6,23,1),rgba(2,6,23,.12))]" />
          <button
            type="button"
            onClick={() => {
              stopAudio();
              onClose?.();
            }}
            className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-2xl border border-slate-700 bg-slate-950/80 text-slate-200"
            aria-label="Close briefing"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="absolute inset-x-5 bottom-5">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">
              Role-aware SYNC · complete briefing
            </div>
            <h2 className="mt-2 text-2xl font-black text-white">
              Good day, {displayName || "there"}
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              Every authorized area of SyncWorks, summarized with direct routes to details.
            </p>
          </div>
        </div>

        <div className="p-5 md:p-6">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100">
              ElevenLabs SYNC voice
            </span>
            <span className="rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-violet-100">
              {briefing?.total_updates || 0} updates
            </span>
            {briefing?.high_priority_count ? (
              <span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-100">
                {briefing.high_priority_count} need attention
              </span>
            ) : null}
            {voiceConfigured === false ? (
              <span className="rounded-full border border-rose-400/25 bg-rose-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-rose-100">
                Device voice fallback
              </span>
            ) : null}
          </div>

          <div className="mt-5 rounded-3xl border border-cyan-400/20 bg-cyan-500/[0.06] p-4">
            {loading ? (
              <div className="flex items-center gap-3 text-cyan-100">
                <LoaderCircle className="h-5 w-5 animate-spin" />
                <span className="font-black">Building your role-aware briefing…</span>
              </div>
            ) : current ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200">
                    {current.label}
                  </div>
                  <div className="text-xs text-slate-500">{progress}</div>
                </div>
                <div className="mt-3 text-sm leading-7 text-slate-200">{current.text}</div>
                {current.detailsUrl ? (
                  <button
                    type="button"
                    onClick={() => window.location.assign(current.detailsUrl)}
                    className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm font-black text-cyan-100"
                  >
                    View details <ExternalLink className="h-4 w-4" />
                  </button>
                ) : null}
              </>
            ) : (
              <div className="text-slate-400">No briefing loaded.</div>
            )}
          </div>

          {notice ? (
            <div className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
              {notice}
            </div>
          ) : null}

          {sections.length ? (
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {sections.map((section, index) => (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => playSection(index, { autoAdvance: false })}
                  className={`rounded-2xl border p-4 text-left ${
                    index === activeIndex
                      ? "border-cyan-400/40 bg-cyan-500/10"
                      : "border-slate-800 bg-slate-950/70"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-black text-white">{section.label}</span>
                    <ChevronRight className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">
                    {section.text}
                  </div>
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <button
              type="button"
              onClick={() => playText(briefingIntro(briefing, displayName), () => playSection(0, { autoAdvance: true }))}
              disabled={!sections.length || loading}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-3 text-sm font-black text-cyan-100 disabled:opacity-40"
            >
              <Play className="h-4 w-4" /> Play all
            </button>
            <button
              type="button"
              onClick={repeatCurrent}
              disabled={!current || loading}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-violet-400/25 bg-violet-500/10 px-3 text-sm font-black text-violet-100 disabled:opacity-40"
            >
              <Repeat2 className="h-4 w-4" /> Repeat
            </button>
            <button
              type="button"
              onClick={playNext}
              disabled={!current || loading}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-3 text-sm font-black text-slate-100 disabled:opacity-40"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={stopAudio}
              disabled={!speaking}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-3 text-sm font-black text-slate-100 disabled:opacity-40"
            >
              <Pause className="h-4 w-4" /> Stop
            </button>
            <button
              type="button"
              onClick={toggleListening}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 px-3 text-sm font-black text-white"
            >
              <Mic className="h-4 w-4" /> {listening ? "Listening" : "Command"}
            </button>
          </div>

          <button
            type="button"
            onClick={loadSummary}
            disabled={loading}
            className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/80 px-4 text-sm font-black text-slate-100 disabled:opacity-40"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Retry role-aware briefing
          </button>

          <div className="mt-4 flex items-center justify-center gap-2 text-center text-[11px] text-slate-500">
            {usingFallback ? <Volume2 className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5 text-cyan-300" />}
            Say continue, repeat, stop, read my God Mode report, name a business, or take me to a report.
          </div>
        </div>
      </section>
    </div>
  );
}
