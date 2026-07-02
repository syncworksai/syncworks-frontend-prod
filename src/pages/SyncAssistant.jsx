import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Bot,
  Camera,
  CheckCircle2,
  ChevronRight,
  Headphones,
  Keyboard,
  LoaderCircle,
  Mic,
  MicOff,
  ShieldCheck,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { buildSyncLiveBriefing } from "../lib/syncLiveBriefing";

const SETTINGS_KEY = "syncworks_sync_voice_settings_v1";
const HISTORY_KEY = "syncworks_sync_history_v1";

const VOICE_OPTIONS = [
  {
    id: "sync",
    label: "SYNC",
    subtitle: "Calm, polished digital assistant",
    lang: "en-US",
    hints: ["Google US English", "Microsoft Guy", "Daniel", "Alex"],
  },
  {
    id: "american-male",
    label: "American Male",
    subtitle: "Direct and confident",
    lang: "en-US",
    hints: ["Guy", "David", "Alex", "Matthew", "Male"],
  },
  {
    id: "american-female",
    label: "American Female",
    subtitle: "Clear and encouraging",
    lang: "en-US",
    hints: ["Samantha", "Jenny", "Aria", "Zira", "Female"],
  },
  {
    id: "british-female",
    label: "British Female",
    subtitle: "Composed British assistant",
    lang: "en-GB",
    hints: ["Serena", "Sonia", "Hazel", "Kate", "Female"],
  },
];

const AUTOMATION_LEVELS = [
  {
    id: "suggest",
    label: "Suggest",
    text: "SYNC recommends next steps but changes nothing.",
  },
  {
    id: "prepare",
    label: "Prepare",
    text: "SYNC prepares drafts and action cards for approval.",
  },
  {
    id: "assist",
    label: "Assist",
    text: "SYNC completes low-risk steps after confirmation.",
  },
  {
    id: "autopilot",
    label: "Autopilot",
    text: "Reserved for approved automations with clear limits.",
  },
];

const SUGGESTIONS = [
  "What needs my attention today?",
  "Show blocked jobs and the next action.",
  "Prepare a follow-up for open leads.",
  "What can my team finish today?",
  "Review my schedule for conflicts.",
  "Give me my health and workout briefing.",
];

function loadJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local persistence is optional.
  }
}

function classifyCommand(value) {
  const text = String(value || "").trim();
  const lower = text.toLowerCase();

  if (!text) {
    return {
      title: "Tell SYNC what you need",
      area: "General",
      risk: "none",
      summary: "Use voice or text to create a request.",
    };
  }

  if (lower.includes("lead") || lower.includes("follow-up")) {
    return {
      title: "Prepare lead follow-up",
      area: "Business · Leads",
      risk: "approval",
      summary:
        "SYNC will prepare a follow-up draft. Nothing will be sent until you approve it.",
    };
  }

  if (
    lower.includes("job") ||
    lower.includes("ticket") ||
    lower.includes("blocked")
  ) {
    return {
      title: "Review work priorities",
      area: "Business · Operations",
      risk: "read-only",
      summary:
        "SYNC will organize active, blocked, late, and ready-to-start work.",
    };
  }

  if (lower.includes("schedule") || lower.includes("calendar")) {
    return {
      title: "Review calendar",
      area: "Calendar",
      risk: "read-only",
      summary:
        "SYNC will review conflicts and prepare suggested changes for confirmation.",
    };
  }

  if (
    lower.includes("health") ||
    lower.includes("workout") ||
    lower.includes("fitness")
  ) {
    return {
      title: "Open coach briefing",
      area: "Health · Coach",
      risk: "read-only",
      summary:
        "SYNC will prepare a conversational health and workout briefing.",
    };
  }

  return {
    title: "Prepare SYNC request",
    area: "Personal assistant",
    risk: "approval",
    summary:
      "SYNC will turn this request into a reviewable action card before anything changes.",
  };
}

function findBrowserVoice(option, voices) {
  const languageMatches = voices.filter((voice) =>
    String(voice.lang || "")
      .toLowerCase()
      .startsWith(option.lang.toLowerCase())
  );

  for (const hint of option.hints) {
    const found = languageMatches.find((voice) =>
      String(voice.name || "").toLowerCase().includes(hint.toLowerCase())
    );
    if (found) return found;
  }

  return languageMatches[0] || voices[0] || null;
}

export default function SyncAssistant() {
  const navigate = useNavigate();
  const location = useLocation();
  const recognitionRef = useRef(null);

  const [settings, setSettings] = useState(() =>
    loadJson(SETTINGS_KEY, {
      voiceId: "sync",
      automationLevel: "prepare",
      speechEnabled: true,
    })
  );
  const [history, setHistory] = useState(() =>
    loadJson(HISTORY_KEY, [])
  );
  const [voices, setVoices] = useState([]);
  const [input, setInput] = useState("");
  const [draft, setDraft] = useState(null);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [notice, setNotice] = useState("");
  const [preparing, setPreparing] = useState(false);

  const returnTo = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("return") || "/customer";
  }, [location.search]);

  const selectedVoice = useMemo(
    () =>
      VOICE_OPTIONS.find((option) => option.id === settings.voiceId) ||
      VOICE_OPTIONS[0],
    [settings.voiceId]
  );

  useEffect(() => {
    saveJson(SETTINGS_KEY, settings);
  }, [settings]);

  useEffect(() => {
    saveJson(HISTORY_KEY, history.slice(0, 12));
  }, [history]);

  useEffect(() => {
    const updateVoices = () => {
      setVoices(window.speechSynthesis?.getVoices?.() || []);
    };

    updateVoices();
    window.speechSynthesis?.addEventListener?.("voiceschanged", updateVoices);

    return () => {
      window.speechSynthesis?.removeEventListener?.(
        "voiceschanged",
        updateVoices
      );
    };
  }, []);

  function speak(text) {
    if (!settings.speechEnabled || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const browserVoice = findBrowserVoice(selectedVoice, voices);

    if (browserVoice) utterance.voice = browserVoice;
    utterance.lang = browserVoice?.lang || selectedVoice.lang;
    utterance.rate = settings.voiceId === "sync" ? 0.96 : 1;
    utterance.pitch = settings.voiceId === "sync" ? 0.92 : 1;
    window.speechSynthesis.speak(utterance);
  }

  function previewVoice(option) {
    const previous = selectedVoice;
    const browserVoice = findBrowserVoice(option, voices);
    const utterance = new SpeechSynthesisUtterance(
      `Hello. I am ${option.label}. Tell me what you need, or let me notice what needs attention first.`
    );
    if (browserVoice) utterance.voice = browserVoice;
    utterance.lang = browserVoice?.lang || option.lang;
    utterance.rate = option.id === "sync" ? 0.96 : 1;
    utterance.pitch = option.id === "sync" ? 0.92 : 1;
    window.speechSynthesis?.cancel?.();
    window.speechSynthesis?.speak?.(utterance);
    setSettings((current) => ({ ...current, voiceId: option.id }));
    return previous;
  }

  function stopListening() {
    recognitionRef.current?.stop?.();
    recognitionRef.current = null;
    setListening(false);
  }

  function startListening() {
    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!Recognition) {
      setVoiceSupported(false);
      setNotice(
        "Voice capture is not supported in this browser. Text input remains available."
      );
      return;
    }

    const recognition = new Recognition();
    recognition.lang = selectedVoice.lang;
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      setListening(true);
      setNotice("Listening...");
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();
      setInput(transcript);
    };

    recognition.onerror = () => {
      setNotice("SYNC could not hear that clearly. Try again or use text.");
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  async function prepareRequest(rawValue = input) {
    const value = String(rawValue || "").trim();
    if (!value) {
      setNotice("Enter or speak a request first.");
      return;
    }

    setPreparing(true);
    setNotice("SYNC is reading current workspace data...");

    const fallback = classifyCommand(value);

    try {
      const liveResult = await buildSyncLiveBriefing(value);
      const prepared = {
        id: Date.now(),
        request: value,
        ...fallback,
        ...liveResult,
        status: "prepared",
        createdAt: new Date().toISOString(),
      };

      setDraft(prepared);
      setHistory((current) => [prepared, ...current].slice(0, 12));
      setNotice(
        liveResult.partial
          ? "Live briefing prepared from the available workspace data."
          : "Live briefing prepared. No external action has been taken."
      );
      speak(
        `${prepared.title}. ${prepared.summary} ${
          prepared.speech || ""
        }`.trim()
      );
    } catch {
      const prepared = {
        id: Date.now(),
        request: value,
        ...fallback,
        live: false,
        bullets: [
          "Live workspace data was unavailable.",
          "No external action was taken.",
        ],
        status: "prepared",
        createdAt: new Date().toISOString(),
      };

      setDraft(prepared);
      setHistory((current) => [prepared, ...current].slice(0, 12));
      setNotice(
        "SYNC prepared a fallback action card because live data was unavailable."
      );
      speak(`${prepared.title}. ${prepared.summary}`);
    } finally {
      setPreparing(false);
    }
  }

  return (
    <div className="min-h-dvh bg-[#020617] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.15),transparent_33%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.14),transparent_35%)]" />

      <header className="sticky top-0 z-40 border-b border-slate-800/90 bg-slate-950/85 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(returnTo)}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm font-black text-slate-200"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back
          </button>

          <div className="text-center">
            <div className="text-lg font-black text-white">SYNC</div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
              Personal and business assistant
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setSettings((current) => ({
                ...current,
                speechEnabled: !current.speechEnabled,
              }))
            }
            className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-700 bg-slate-950 text-slate-200"
            aria-label={
              settings.speechEnabled ? "Turn voice off" : "Turn voice on"
            }
          >
            {settings.speechEnabled ? (
              <Headphones aria-hidden="true" className="h-5 w-5" />
            ) : (
              <MicOff aria-hidden="true" className="h-5 w-5" />
            )}
          </button>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl space-y-5 px-4 pb-24 pt-5">
        <section className="relative overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-slate-950/70 p-5 shadow-[0_0_70px_rgba(34,211,238,0.10)] md:p-8">
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-violet-500/12 blur-3xl" />

          <div className="relative grid gap-7 lg:grid-cols-[1fr_320px] lg:items-center">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
                Tell SYNC what you need—or let SYNC notice first
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-5xl">
                What should we handle?
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Use voice or text. SYNC prepares a clear action card before
                sending, scheduling, charging, assigning, or changing anything.
              </p>

              <div className="mt-5 rounded-3xl border border-slate-700 bg-slate-950/80 p-3">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  rows={4}
                  placeholder="Example: What needs my attention today?"
                  className="w-full resize-none bg-transparent px-2 py-2 text-base text-white outline-none placeholder:text-slate-600"
                />

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={listening ? stopListening : startListening}
                    className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-black ${
                      listening
                        ? "border-rose-300/35 bg-rose-500/15 text-rose-100"
                        : "border-cyan-300/35 bg-cyan-500/15 text-cyan-100"
                    }`}
                  >
                    {listening ? (
                      <MicOff aria-hidden="true" className="h-5 w-5" />
                    ) : (
                      <Mic aria-hidden="true" className="h-5 w-5" />
                    )}
                    {listening ? "Stop listening" : "Speak to SYNC"}
                  </button>

                  <button
                    type="button"
                    onClick={() => prepareRequest()}
                    disabled={preparing}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 px-5 text-sm font-black text-white disabled:opacity-50"
                  >
                    {preparing ? (
                      <LoaderCircle
                        aria-hidden="true"
                        className="h-5 w-5 animate-spin"
                      />
                    ) : (
                      <Sparkles aria-hidden="true" className="h-5 w-5" />
                    )}
                    {preparing ? "Reading workspace..." : "Prepare live briefing"}
                  </button>
                </div>
              </div>

              {!voiceSupported || notice ? (
                <div className="mt-3 text-sm text-slate-400">{notice}</div>
              ) : null}
            </div>

            <div className="mx-auto grid h-64 w-64 place-items-center rounded-full border border-cyan-300/30 bg-slate-950/65 shadow-[0_0_70px_rgba(34,211,238,0.18)]">
              <div className="grid h-44 w-44 place-items-center rounded-full border border-violet-300/30 bg-gradient-to-br from-cyan-500/20 via-blue-500/20 to-violet-500/25">
                {listening ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="h-20 w-20 animate-spin text-cyan-200"
                  />
                ) : (
                  <Bot aria-hidden="true" className="h-20 w-20 text-cyan-100" />
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-slate-800 bg-slate-950/65 p-5">
            <div className="flex items-center gap-3">
              <Volume2 aria-hidden="true" className="h-5 w-5 text-cyan-200" />
              <div>
                <h2 className="font-black text-white">Choose SYNC’s voice</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Browser voice availability varies by device.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              {VOICE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => previewVoice(option)}
                  className={`flex items-center justify-between gap-3 rounded-2xl border p-3 text-left ${
                    settings.voiceId === option.id
                      ? "border-cyan-400/40 bg-cyan-500/10"
                      : "border-slate-800 bg-slate-950/70"
                  }`}
                >
                  <span>
                    <span className="block text-sm font-black text-white">
                      {option.label}
                    </span>
                    <span className="mt-1 block text-xs text-slate-400">
                      {option.subtitle}
                    </span>
                  </span>
                  <Volume2 aria-hidden="true" className="h-4 w-4 text-cyan-200" />
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-800 bg-slate-950/65 p-5">
            <div className="flex items-center gap-3">
              <ShieldCheck
                aria-hidden="true"
                className="h-5 w-5 text-violet-200"
              />
              <div>
                <h2 className="font-black text-white">Automation level</h2>
                <p className="mt-1 text-xs text-slate-400">
                  You control how far SYNC can go.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              {AUTOMATION_LEVELS.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  onClick={() =>
                    setSettings((current) => ({
                      ...current,
                      automationLevel: level.id,
                    }))
                  }
                  className={`rounded-2xl border p-3 text-left ${
                    settings.automationLevel === level.id
                      ? "border-violet-400/40 bg-violet-500/10"
                      : "border-slate-800 bg-slate-950/70"
                  }`}
                >
                  <span className="block text-sm font-black text-white">
                    {level.label}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-400">
                    {level.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-800 bg-slate-950/65 p-5">
          <div className="flex items-center gap-3">
            <Sparkles aria-hidden="true" className="h-5 w-5 text-cyan-200" />
            <h2 className="font-black text-white">Suggested actions</h2>
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  setInput(suggestion);
                  prepareRequest(suggestion);
                }}
                className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 text-left text-sm font-bold text-slate-200 hover:border-cyan-400/30"
              >
                {suggestion}
                <ChevronRight
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-cyan-200"
                />
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          {[
            {
              icon: Keyboard,
              title: "Text",
              text: "Type naturally and prepare an action card.",
            },
            {
              icon: Mic,
              title: "Voice",
              text: "Hands-free capture with selectable voices.",
            },
            {
              icon: Camera,
              title: "Camera",
              text: "Camera and document understanding arrives in the next SYNC phase.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-3xl border border-slate-800 bg-slate-950/55 p-4"
            >
              {React.createElement(item.icon, {
                "aria-hidden": true,
                className: "h-5 w-5 text-cyan-200",
              })}
              <div className="mt-3 font-black text-white">{item.title}</div>
              <div className="mt-1 text-sm leading-6 text-slate-400">
                {item.text}
              </div>
            </div>
          ))}
        </section>

        {draft ? (
          <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
            <div className="w-full max-w-xl rounded-t-[2rem] border border-cyan-400/25 bg-slate-950 p-5 shadow-2xl sm:rounded-[2rem] md:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
                    SYNC prepared action
                  </div>
                  <h2 className="mt-2 text-xl font-black text-white">
                    {draft.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setDraft(null)}
                  className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-700 bg-slate-900 text-slate-300"
                >
                  <X aria-hidden="true" className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 rounded-3xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">
                  Request
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-200">
                  {draft.request}
                </div>
              </div>

              <div className="mt-3 rounded-3xl border border-violet-400/20 bg-violet-400/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-black text-violet-100">
                    {draft.area}
                  </div>
                  {draft.live ? (
                    <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-200">
                      Live workspace data
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-300">
                  {draft.summary}
                </div>

                {Array.isArray(draft.bullets) && draft.bullets.length ? (
                  <div className="mt-4 space-y-2">
                    {draft.bullets.map((bullet) => (
                      <div
                        key={bullet}
                        className="flex items-start gap-2 text-sm leading-6 text-slate-300"
                      >
                        <CheckCircle2
                          aria-hidden="true"
                          className="mt-1 h-4 w-4 shrink-0 text-cyan-300"
                        />
                        <span>{bullet}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {draft.route ? (
                <button
                  type="button"
                  onClick={() => navigate(draft.route)}
                  className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-cyan-300/30 bg-cyan-500/15 px-4 text-sm font-black text-cyan-100"
                >
                  {draft.actionLabel || "Open workspace"}
                  <ChevronRight
                    aria-hidden="true"
                    className="h-4 w-4"
                  />
                </button>
              ) : null}

              <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                <CheckCircle2
                  aria-hidden="true"
                  className="h-4 w-4 text-emerald-300"
                />
                No message, schedule, charge, assignment, or database change was made.
              </div>

              <button
                type="button"
                onClick={() => {
                  setDraft(null);
                  setNotice(
                    "Saved as a read-only SYNC briefing. No external action was taken."
                  );
                }}
                className="mt-5 min-h-12 w-full rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 px-5 text-sm font-black text-white"
              >
                Save prepared request
              </button>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
