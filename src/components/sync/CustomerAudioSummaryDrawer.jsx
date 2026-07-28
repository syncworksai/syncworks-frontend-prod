import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
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
  getSyncVoiceStatus,
  sendSyncAiMessage,
  synthesizeSyncSpeech,
} from "../../api/syncAi";

const PANEL_IMAGE = "/sync/sync-voice-panel.webp";
const LIFE_EVENTS_KEY = "sw_customer_life_schedule_v1";
const MONEY_SNAPSHOT_KEY = "sw_customer_money_snapshot_v1";
const HEALTH_SNAPSHOT_KEY = "sw_customer_health_snapshot_v1";
const MAX_CONTEXT_CHARS = 2400;

const CATEGORY_DEFINITIONS = [
  ["attention", "Immediate attention"],
  ["calendar", "Calendar and travel"],
  ["connections", "Connections and invitations"],
  ["money", "Payments and finance"],
  ["business", "Business and work"],
  ["todo", "To-Do"],
  ["health", "Health, workout and nutrition"],
  ["next", "Recommended next actions"],
];

const BRIEFING_PROMPT = `Create my complete spoken Personal SYNC briefing now. Do not return a placeholder or say you are still gathering data.
Review the authenticated sources available to you plus the compact device context below. Never invent facts.
Return plain text with these exact markers in order: [ATTENTION] [CALENDAR] [CONNECTIONS] [MONEY] [BUSINESS] [TODO] [HEALTH] [NEXT].
Keep each section under 55 spoken words. Include names, dates, times and amounts when available. Say "Nothing requiring attention" for an empty section. No markdown tables.`;

function safeRead(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "null");
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function clip(value, max = 120) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function compactEvent(item) {
  return {
    title: clip(item?.title || item?.name || "Event", 90),
    date: item?.date || item?.due_date || item?.start || "",
    time: item?.time || "",
    category: clip(item?.category || item?.type || "", 40),
    location: clip(item?.location || "", 90),
    status: clip(item?.status || "", 30),
  };
}

function compactTodo(item) {
  return {
    title: clip(item?.title || "Task", 90),
    due: item?.due_date || item?.date || "",
    status: clip(item?.status || "TODO", 24),
    priority: clip(item?.priority || "", 16),
  };
}

function compactSnapshot(value, allowedKeys) {
  if (!value || typeof value !== "object") return null;
  return allowedKeys.reduce((result, key) => {
    if (value[key] !== undefined && value[key] !== null && value[key] !== "") {
      result[key] = typeof value[key] === "string" ? clip(value[key], 120) : value[key];
    }
    return result;
  }, {});
}

function buildDeviceContext() {
  const calendar = safeRead(LIFE_EVENTS_KEY, []);
  const money = safeRead(MONEY_SNAPSHOT_KEY, null);
  const health = safeRead(HEALTH_SNAPSHOT_KEY, null);
  const todoKeys = Object.keys(localStorage).filter((key) => key.startsWith("sw_planner_drag_v2_customer_"));
  const todos = todoKeys.flatMap((key) => {
    const value = safeRead(key, []);
    return Array.isArray(value) ? value : [];
  });

  const context = {
    generated_at: new Date().toISOString(),
    calendar: (Array.isArray(calendar) ? calendar : []).slice(0, 12).map(compactEvent),
    todos: todos.filter((item) => !item?.archived).slice(0, 12).map(compactTodo),
    money: compactSnapshot(money, ["mortgage_label", "mortgage_amount", "mortgage_due_date", "covered_percent", "top_priority"]),
    health: compactSnapshot(health, ["workout", "readiness", "time_available", "equipment", "protein_remaining", "calories_remaining", "notes"]),
  };

  let serialized = JSON.stringify(context);
  if (serialized.length > MAX_CONTEXT_CHARS) {
    context.calendar = context.calendar.slice(0, 6);
    context.todos = context.todos.slice(0, 6);
    serialized = JSON.stringify(context);
  }
  return serialized.slice(0, MAX_CONTEXT_CHARS);
}

function parseSections(text) {
  const raw = String(text || "").trim();
  if (!raw) return [];

  const markerMap = {
    ATTENTION: "attention",
    CALENDAR: "calendar",
    CONNECTIONS: "connections",
    MONEY: "money",
    BUSINESS: "business",
    TODO: "todo",
    HEALTH: "health",
    NEXT: "next",
  };

  const matches = [...raw.matchAll(/\[(ATTENTION|CALENDAR|CONNECTIONS|MONEY|BUSINESS|TODO|HEALTH|NEXT)\]/gi)];
  if (!matches.length) return [{ key: "attention", label: "Complete briefing", text: raw }];

  const byKey = new Map();
  matches.forEach((match, index) => {
    const start = (match.index || 0) + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : raw.length;
    const key = markerMap[String(match[1]).toUpperCase()];
    const value = raw.slice(start, end).trim();
    if (key && value) byKey.set(key, value);
  });

  return CATEGORY_DEFINITIONS.map(([key, label]) => ({ key, label, text: byKey.get(key) || "" })).filter(
    (section) => section.text
  );
}

function browserSpeak(text, callbacks = {}) {
  if (!window.speechSynthesis || !text) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices?.() || [];
  const preferred = voices.find((voice) => /daniel|alex|guy|google us english/i.test(voice.name || "")) || voices.find((voice) => String(voice.lang || "").toLowerCase().startsWith("en-us")) || voices[0];
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

export default function CustomerAudioSummaryDrawer({ open, onClose, displayName = "" }) {
  const audioRef = useRef(null);
  const objectUrlRef = useRef("");
  const recognitionRef = useRef(null);
  const sectionsRef = useRef([]);
  const indexRef = useRef(0);

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

  useEffect(() => { sectionsRef.current = sections; }, [sections]);
  useEffect(() => { indexRef.current = activeIndex; }, [activeIndex]);

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

  const playSection = useCallback(async (index, options = {}) => {
    const section = sectionsRef.current[index];
    if (!section?.text) return;

    stopAudio();
    cleanupObjectUrl();
    setActiveIndex(index);
    setNotice("");
    setUsingFallback(false);

    const spoken = `${section.label}. ${section.text}`.slice(0, 1800);
    try {
      const blob = await synthesizeSyncSpeech(spoken);
      if (!(blob instanceof Blob) || blob.size < 100) throw new Error("Invalid voice response");
      const normalizedBlob = blob.type ? blob : new Blob([blob], { type: "audio/mpeg" });
      const url = URL.createObjectURL(normalizedBlob);
      objectUrlRef.current = url;
      const audio = new Audio(url);
      audio.preload = "auto";
      audioRef.current = audio;
      audio.onplay = () => setStatus("speaking");
      audio.onerror = () => {
        setUsingFallback(true);
        setNotice("Premium SYNC voice failed on this device. The phone voice is being used temporarily.");
        browserSpeak(spoken, {
          onStart: () => setStatus("speaking"),
          onEnd: () => {
            setStatus("ready");
            if (options.autoAdvance !== false && index + 1 < sectionsRef.current.length) playSection(index + 1, options);
          },
        });
      };
      audio.onended = () => {
        setStatus("ready");
        if (options.autoAdvance !== false && index + 1 < sectionsRef.current.length) playSection(index + 1, options);
      };
      await audio.play();
    } catch {
      setUsingFallback(true);
      setNotice("ElevenLabs is unavailable or not fully configured on Render. Using the device voice temporarily.");
      const started = browserSpeak(spoken, {
        onStart: () => setStatus("speaking"),
        onEnd: () => {
          setStatus("ready");
          if (options.autoAdvance !== false && index + 1 < sectionsRef.current.length) playSection(index + 1, options);
        },
      });
      setStatus(started ? "speaking" : "ready");
    }
  }, [cleanupObjectUrl, stopAudio]);

  const loadSummary = useCallback(async () => {
    setStatus("loading");
    setNotice("");
    setSections([]);
    stopAudio();

    try {
      const compactContext = buildDeviceContext();
      const message = `${BRIEFING_PROMPT}\nDEVICE CONTEXT:${compactContext}`;
      const result = await sendSyncAiMessage({ workspace: "personal", message });
      const parsed = parseSections(result?.message);
      if (!parsed.length) throw new Error("SYNC returned no briefing.");
      sectionsRef.current = parsed;
      setSections(parsed);
      setActiveIndex(0);
      setStatus("ready");
      window.setTimeout(() => playSection(0, { autoAdvance: true }), 0);
    } catch (error) {
      setStatus("error");
      const message = getSyncAiErrorMessage(error);
      setNotice(/too long/i.test(message) ? "SYNC could not fit the briefing into one request. Tap refresh to retry the compact briefing." : message);
    }
  }, [playSection, stopAudio]);

  const playNext = useCallback(() => {
    const next = Math.min(indexRef.current + 1, sectionsRef.current.length - 1);
    playSection(next, { autoAdvance: true });
  }, [playSection]);

  const repeatCurrent = useCallback(() => playSection(indexRef.current, { autoAdvance: false }), [playSection]);

  const handleVoiceCommand = useCallback((transcript) => {
    const command = String(transcript || "").toLowerCase();
    if (/stop|pause|quiet/.test(command)) return stopAudio();
    if (/start over|begin again|from the beginning/.test(command)) return playSection(0, { autoAdvance: true });
    if (/repeat/.test(command) && !/(business|health|workout|nutrition|calendar|money|payment|task|to-?do|connection)/.test(command)) return repeatCurrent();
    if (/continue|next|go on/.test(command)) return playNext();

    const targets = [
      [/calendar|schedule|travel/, "calendar"],
      [/connection|invite|social|group/, "connections"],
      [/money|finance|payment|invoice/, "money"],
      [/business|employee|work/, "business"],
      [/task|to-?do/, "todo"],
      [/health|workout|nutrition|recovery/, "health"],
      [/attention|urgent/, "attention"],
      [/next action|recommend/, "next"],
    ];
    const found = targets.find(([pattern]) => pattern.test(command));
    if (found) {
      const index = sectionsRef.current.findIndex((section) => section.key === found[1]);
      if (index >= 0) return playSection(index, { autoAdvance: false });
    }
    setNotice(`I heard “${transcript}.” Say continue, repeat, stop, or name Calendar, Business, Money, To-Do, or Health.`);
  }, [playNext, playSection, repeatCurrent, stopAudio]);

  const toggleListening = useCallback(() => {
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setNotice("Voice commands are not supported by this browser. Use the category and playback buttons instead.");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event) => handleVoiceCommand(event.results?.[0]?.[0]?.transcript || "");
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
      .then((value) => setVoiceConfigured(Boolean(value?.configured ?? value?.available ?? value?.enabled)))
      .catch(() => setVoiceConfigured(false));
    loadSummary();
  }, [open]);

  useEffect(() => () => {
    stopAudio();
    cleanupObjectUrl();
    recognitionRef.current?.stop?.();
  }, [cleanupObjectUrl, stopAudio]);

  const progress = useMemo(() => (sections.length ? `${activeIndex + 1} of ${sections.length}` : ""), [activeIndex, sections.length]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[190] flex items-end justify-center bg-black/80 backdrop-blur-sm">
      <section className="max-h-[94dvh] w-full max-w-3xl overflow-y-auto rounded-t-[2rem] border border-cyan-400/25 bg-[#020617] shadow-[0_-20px_100px_rgba(34,211,238,.18)]">
        <div className="relative h-44 overflow-hidden rounded-t-[2rem] border-b border-cyan-400/15 sm:h-52">
          <img src={PANEL_IMAGE} alt="SYNC audio briefing" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(2,6,23,1),rgba(2,6,23,.08))]" />
          <button type="button" onClick={() => { stopAudio(); onClose?.(); }} className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-2xl border border-slate-700 bg-slate-950/85 text-slate-200" aria-label="Close SYNC briefing"><X className="h-5 w-5" /></button>
          <div className="absolute inset-x-5 bottom-5">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Personal SYNC · complete briefing</div>
            <h2 className="mt-2 text-2xl font-black text-white">{displayName ? `Good day, ${displayName}` : "Good day"}</h2>
            <p className="mt-1 text-sm text-slate-300">Every available attention category, played in sequence.</p>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[.13em]">
            <span className={`rounded-full border px-3 py-1 ${usingFallback ? "border-amber-400/25 bg-amber-500/10 text-amber-100" : "border-cyan-400/25 bg-cyan-500/10 text-cyan-100"}`}>{usingFallback ? "Device voice fallback" : "ElevenLabs SYNC voice"}</span>
            <span className="rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1 text-violet-100">{loading ? "Building" : speaking ? "Speaking" : status === "error" ? "Needs attention" : "Ready"}</span>
            {voiceConfigured === false ? <span className="rounded-full border border-rose-400/25 bg-rose-500/10 px-3 py-1 text-rose-100">Render voice not configured</span> : null}
          </div>

          <div className="mt-5 rounded-3xl border border-cyan-400/15 bg-cyan-500/[.05] p-4">
            {loading ? <div className="flex items-center gap-3"><LoaderCircle className="h-6 w-6 animate-spin text-cyan-200" /><div><div className="font-black text-white">SYNC is assembling the full briefing</div><div className="text-sm text-slate-400">Checking every available category now.</div></div></div> : current ? <><div className="flex items-center justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">Now playing · {progress}</div><div className="mt-1 text-lg font-black text-white">{current.label}</div></div><Volume2 className={`h-7 w-7 text-cyan-200 ${speaking ? "animate-pulse" : ""}`} /></div><p className="mt-3 line-clamp-4 text-sm leading-6 text-slate-300">{current.text}</p></> : <div className="text-sm text-slate-400">No briefing loaded.</div>}
          </div>

          {notice ? <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm leading-6 text-amber-100">{notice}</div> : null}

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {sections.map((section, index) => <button key={section.key} type="button" onClick={() => playSection(index, { autoAdvance: false })} className={`shrink-0 rounded-full border px-3 py-2 text-xs font-black ${index === activeIndex ? "border-cyan-300/40 bg-cyan-500/15 text-cyan-100" : "border-white/10 bg-white/[.04] text-slate-300"}`}>{section.label}</button>)}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <button type="button" onClick={() => current && playSection(activeIndex, { autoAdvance: true })} disabled={!current || loading} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-3 text-sm font-black text-cyan-100 disabled:opacity-40"><Play className="h-4 w-4" />Play all</button>
            <button type="button" onClick={repeatCurrent} disabled={!current || loading} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-violet-400/25 bg-violet-500/10 px-3 text-sm font-black text-violet-100 disabled:opacity-40"><Repeat2 className="h-4 w-4" />Repeat</button>
            <button type="button" onClick={playNext} disabled={!current || activeIndex >= sections.length - 1} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-3 text-sm font-black text-slate-100 disabled:opacity-40">Next<ChevronRight className="h-4 w-4" /></button>
            <button type="button" onClick={stopAudio} disabled={!speaking} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-3 text-sm font-black text-slate-100 disabled:opacity-40"><Pause className="h-4 w-4" />Stop</button>
            <button type="button" onClick={toggleListening} className={`col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-black text-white sm:col-span-1 ${listening ? "bg-rose-600" : "bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600"}`}><Mic className="h-4 w-4" />{listening ? "Listening" : "Command"}</button>
          </div>

          <button type="button" onClick={loadSummary} disabled={loading} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[.04] text-sm font-black text-slate-200 disabled:opacity-40"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh every category</button>
          <div className="mt-4 flex items-center justify-center gap-2 text-center text-[11px] text-slate-500"><Sparkles className="h-3.5 w-3.5 text-cyan-300" />Say “continue,” “repeat,” “repeat Business,” “repeat Health,” “start over,” or “stop.”</div>
        </div>
      </section>
    </div>
  );
}
