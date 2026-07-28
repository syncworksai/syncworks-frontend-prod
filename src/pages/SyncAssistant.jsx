import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CloudSun,
  Headphones,
  History,
  LoaderCircle,
  Mic,
  MicOff,
  Play,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  UserRound,
  Volume2,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { getActiveBusinessId } from "../api/client";
import SyncActionStudio from "../components/sync/SyncActionStudio";
import {
  getSyncAiErrorMessage,
  getSyncAiStatus,
  sendSyncAiMessage,
} from "../api/syncAi";

const SETTINGS_KEY = "syncworks_sync_voice_settings_v3";
const HISTORY_KEY = "syncworks_sync_history_v2";

const VOICE_OPTIONS = [
  {
    id: "sync",
    label: "SYNC",
    lang: "en-US",
    hints: ["Google US English", "Microsoft Guy", "Daniel", "Alex"],
  },
  {
    id: "american-female",
    label: "American Female",
    lang: "en-US",
    hints: ["Samantha", "Jenny", "Aria", "Zira", "Female"],
  },
  {
    id: "british-female",
    label: "British Female",
    lang: "en-GB",
    hints: ["Serena", "Sonia", "Hazel", "Kate", "Female"],
  },
];

const PERSONAL_SUGGESTIONS = [
  "Read my complete Personal profile and all current updates aloud.",
  "What needs my attention today across requests, Health, finance, and messages?",
  "Help me prepare an appointment for my calendar.",
  "What weather information can you prepare from my saved address or ZIP?",
];

const BUSINESS_SUGGESTIONS = [
  "Read my complete Business profile and all current operations updates aloud.",
  "What needs my attention today across jobs, leads, messages, and approvals?",
  "Help me prepare a Business appointment for my calendar.",
  "What weather information matters for today's scheduled field work?",
];

function loadJson(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "null");
    return parsed ?? fallback;
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

function inferWorkspace(pathname, returnTo) {
  const value = `${pathname || ""} ${returnTo || ""}`.toLowerCase();
  return value.includes("/sbo") || value.includes("/business")
    ? "business"
    : "personal";
}

function findBrowserVoice(option, voices) {
  const languageMatches = voices.filter((voice) =>
    String(voice.lang || "").toLowerCase().startsWith(option.lang.toLowerCase())
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
  const speechRef = useRef(null);

  const returnTo = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const value = params.get("return");
    return value?.startsWith("/") ? value : "/customer";
  }, [location.search]);

  const [workspace, setWorkspace] = useState(() =>
    inferWorkspace(location.pathname, returnTo)
  );
  const [settings, setSettings] = useState(() =>
    loadJson(SETTINGS_KEY, {
      voiceId: "sync",
      speechEnabled: true,
      autoSpeakResponses: true,
    })
  );
  const [history, setHistory] = useState(() => loadJson(HISTORY_KEY, []));
  const [voices, setVoices] = useState([]);
  const [status, setStatus] = useState({
    loading: true,
    enabled: false,
    configured: false,
    model: "",
  });
  const [input, setInput] = useState("");
  const [answer, setAnswer] = useState(null);
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);

  const selectedVoice = useMemo(
    () =>
      VOICE_OPTIONS.find((item) => item.id === settings.voiceId) ||
      VOICE_OPTIONS[0],
    [settings.voiceId]
  );

  const suggestions =
    workspace === "business" ? BUSINESS_SUGGESTIONS : PERSONAL_SUGGESTIONS;
  const businessAvailable = Boolean(getActiveBusinessId());
  const aiReady = status.enabled && status.configured && !status.loading;

  useEffect(() => {
    saveJson(SETTINGS_KEY, settings);
  }, [settings]);

  useEffect(() => {
    saveJson(HISTORY_KEY, history.slice(0, 20));
  }, [history]);

  useEffect(() => {
    let active = true;
    getSyncAiStatus()
      .then((data) => {
        if (!active) return;
        setStatus({
          loading: false,
          enabled: Boolean(data.enabled),
          configured: Boolean(data.configured),
          model: data.model || "",
        });
      })
      .catch((error) => {
        if (!active) return;
        setStatus({
          loading: false,
          enabled: false,
          configured: false,
          model: "",
        });
        setNotice(getSyncAiErrorMessage(error));
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const updateVoices = () => {
      setVoices(window.speechSynthesis?.getVoices?.() || []);
    };
    updateVoices();
    window.speechSynthesis?.addEventListener?.("voiceschanged", updateVoices);
    return () => {
      window.speechSynthesis?.removeEventListener?.("voiceschanged", updateVoices);
      window.speechSynthesis?.cancel?.();
    };
  }, []);

  function stopSpeaking() {
    window.speechSynthesis?.cancel?.();
    speechRef.current = null;
    setSpeaking(false);
  }

  function speak(text, { force = false } = {}) {
    if ((!settings.speechEnabled && !force) || !window.speechSynthesis || !text) {
      return;
    }

    stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(text);
    const browserVoice = findBrowserVoice(selectedVoice, voices);
    if (browserVoice) utterance.voice = browserVoice;
    utterance.lang = browserVoice?.lang || selectedVoice.lang;
    utterance.rate = selectedVoice.id === "sync" ? 0.96 : 1;
    utterance.pitch = selectedVoice.id === "sync" ? 0.92 : 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => {
      speechRef.current = null;
      setSpeaking(false);
    };
    utterance.onerror = () => {
      speechRef.current = null;
      setSpeaking(false);
      setNotice("Audio playback stopped. You can still read the response.");
    };

    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }

  function stopListening() {
    recognitionRef.current?.stop?.();
    recognitionRef.current = null;
    setListening(false);
  }

  function startListening({ greeting = false } = {}) {
    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!Recognition) {
      setVoiceSupported(false);
      setNotice("Voice capture is not supported in this browser. Text remains available.");
      return;
    }

    const begin = () => {
      const recognition = new Recognition();
      recognition.lang = selectedVoice.lang;
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.onstart = () => {
        setListening(true);
        setNotice("Listening. Tell SYNC what you need.");
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
    };

    stopSpeaking();

    if (greeting) {
      const greetingText =
        workspace === "business"
          ? "Business SYNC is ready. What can I do for you today?"
          : "SYNC is ready. What can I do for you today?";
      speak(greetingText, { force: true });
      window.setTimeout(begin, 1700);
      return;
    }

    begin();
  }

  async function sendMessage(rawValue = input, options = {}) {
    const message = String(rawValue || "").trim();
    if (!message || sending) {
      if (!message) setNotice("Enter or speak a message first.");
      return;
    }
    if (workspace === "business" && !businessAvailable) {
      setNotice("Choose an active business before opening Business SYNC.");
      return;
    }

    setSending(true);
    setNotice(`SYNC is preparing your ${workspace} briefing...`);

    try {
      const result = await sendSyncAiMessage({ message, workspace });
      const item = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        request: message,
        message: result.message || "SYNC returned no text.",
        workspace: result.workspace || workspace,
        model: result.model || status.model,
        usage: result.usage || null,
        createdAt: new Date().toISOString(),
      };

      setAnswer(item);
      setHistory((current) => [item, ...current].slice(0, 20));
      setInput("");
      setNotice(
        options.profileBriefing
          ? "Full spoken profile briefing prepared."
          : "SYNC response prepared."
      );

      if (settings.autoSpeakResponses || options.forceSpeak) {
        speak(item.message, { force: options.forceSpeak });
      }
    } catch (error) {
      setNotice(getSyncAiErrorMessage(error));
    } finally {
      setSending(false);
    }
  }

  function readFullProfile() {
    const prompt =
      workspace === "business"
        ? "Give me a complete spoken Business profile briefing. Read all available business profile details and current updates, including active jobs, overdue or blocked work, unassigned jobs, approvals, leads, follow-ups, partner invitations, recent conversation activity, service coverage, marketplace status, and any missing information. Organize it clearly for listening while I am mobile."
        : "Give me a complete spoken Personal profile briefing. Read all available personal profile details and current updates, including active requests, tickets, scheduled work, approvals, recent conversation activity, Health profile and workout data availability, finance snapshot and plan status, and any missing information. Organize it clearly for listening while I am mobile.";

    sendMessage(prompt, { profileBriefing: true, forceSpeak: true });
  }

  function prepareAppointment() {
    const prompt =
      workspace === "business"
        ? "Help me prepare a Business appointment. Ask for any missing title, date, start time, duration, location, attendees, reminders, and notes. Do not claim it was added to the calendar until I explicitly confirm through an approved calendar tool."
        : "Help me prepare a Personal appointment. Ask for any missing title, date, start time, duration, location, attendees, reminders, and notes. Do not claim it was added to the calendar until I explicitly confirm through an approved calendar tool.";

    setInput(prompt);
    speak("Tell me the appointment details you want to prepare.", { force: true });
    setNotice("Appointment preparation is ready. Calendar execution is coming next.");
  }

  function prepareWeather() {
    const prompt =
      workspace === "business"
        ? "Prepare a weather request for today's Business schedule using the saved business address or ZIP when available. Explain which location information is available and what still needs to be connected before live weather can be returned."
        : "Prepare a weather request using my saved Personal address or ZIP when available. Explain which location information is available and what still needs to be connected before live weather can be returned.";

    sendMessage(prompt, { forceSpeak: true });
  }

  return (
    <div className="min-h-dvh bg-[#020617] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.15),transparent_36%)]" />

      <header className="sticky top-0 z-40 border-b border-slate-800/90 bg-slate-950/88 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(returnTo)}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm font-black text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="text-center">
            <div className="text-lg font-black text-white">SYNC</div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
              Voice command center
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate("/sync/history")}
              className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-700 bg-slate-950 text-slate-200"
              aria-label="SYNC history"
            >
              <History className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() =>
                setSettings((current) => ({
                  ...current,
                  speechEnabled: !current.speechEnabled,
                }))
              }
              className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-700 bg-slate-950 text-slate-200"
              aria-label="Toggle speech"
            >
              {settings.speechEnabled ? (
                <Headphones className="h-5 w-5" />
              ) : (
                <MicOff className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-5xl space-y-5 px-4 pb-24 pt-5">
        <section className="overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-slate-950/72 p-5 shadow-[0_0_70px_rgba(34,211,238,0.10)] md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">
                Connected to your secure SyncWorks profile
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-5xl">
                What can I do for you today?
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Tap once to hear your full profile and current updates, or speak a
                command while you are moving.
              </p>
            </div>

            <div
              className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] ${
                aiReady
                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                  : status.loading
                  ? "border-slate-700 bg-slate-900 text-slate-400"
                  : "border-amber-400/30 bg-amber-500/10 text-amber-200"
              }`}
            >
              {status.loading
                ? "Checking AI"
                : aiReady
                ? `Online${status.model ? ` · ${status.model}` : ""}`
                : "AI unavailable"}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setWorkspace("personal")}
              className={`rounded-3xl border p-4 text-left ${
                workspace === "personal"
                  ? "border-cyan-400/40 bg-cyan-500/12"
                  : "border-slate-800 bg-slate-950/70"
              }`}
            >
              <UserRound className="h-5 w-5 text-cyan-200" />
              <div className="mt-3 font-black text-white">Personal SYNC</div>
              <div className="mt-1 text-xs leading-5 text-slate-400">
                Profile, requests, Health, finance, and Personal updates.
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                if (businessAvailable) {
                  setWorkspace("business");
                  setNotice("");
                } else {
                  setNotice("Choose an active business before opening Business SYNC.");
                }
              }}
              className={`rounded-3xl border p-4 text-left ${
                workspace === "business"
                  ? "border-violet-400/40 bg-violet-500/12"
                  : "border-slate-800 bg-slate-950/70"
              } ${businessAvailable ? "" : "opacity-60"}`}
            >
              <BriefcaseBusiness className="h-5 w-5 text-violet-200" />
              <div className="mt-3 font-black text-white">Business SYNC</div>
              <div className="mt-1 text-xs leading-5 text-slate-400">
                {businessAvailable
                  ? "Jobs, leads, approvals, messages, and operations."
                  : "Select a Business workspace first."}
              </div>
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={readFullProfile}
              disabled={sending || !aiReady}
              className="inline-flex min-h-20 items-center justify-center gap-3 rounded-3xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 px-5 text-left font-black text-white disabled:opacity-45"
            >
              {sending ? (
                <LoaderCircle className="h-6 w-6 animate-spin" />
              ) : speaking ? (
                <Volume2 className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6" />
              )}
              <span>
                <span className="block">Read my full profile</span>
                <span className="mt-1 block text-xs font-medium text-cyan-100">
                  Speak every available update
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={
                speaking
                  ? stopSpeaking
                  : listening
                  ? stopListening
                  : () => startListening({ greeting: true })
              }
              className={`inline-flex min-h-20 items-center justify-center gap-3 rounded-3xl border px-5 text-left font-black ${
                speaking || listening
                  ? "border-rose-300/35 bg-rose-500/15 text-rose-100"
                  : "border-cyan-300/35 bg-cyan-500/15 text-cyan-100"
              }`}
            >
              {speaking || listening ? (
                <Square className="h-6 w-6" />
              ) : (
                <Mic className="h-6 w-6" />
              )}
              <span>
                <span className="block">
                  {speaking
                    ? "Stop audio"
                    : listening
                    ? "Stop listening"
                    : "What can I do for you?"}
                </span>
                <span className="mt-1 block text-xs font-medium opacity-80">
                  {listening ? "SYNC is listening now" : "Start voice command"}
                </span>
              </span>
            </button>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={prepareAppointment}
              className="min-h-14 rounded-2xl border border-slate-700 bg-slate-950/80 px-4 text-left"
            >
              <span className="flex items-center gap-2 text-sm font-black text-white">
                <CalendarDays className="h-4 w-4 text-violet-200" />
                Prepare an appointment
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                Calendar approval connection is next
              </span>
            </button>
            <button
              type="button"
              onClick={prepareWeather}
              disabled={sending || !aiReady}
              className="min-h-14 rounded-2xl border border-slate-700 bg-slate-950/80 px-4 text-left disabled:opacity-45"
            >
              <span className="flex items-center gap-2 text-sm font-black text-white">
                <CloudSun className="h-4 w-4 text-cyan-200" />
                Prepare location weather
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                Uses saved address or ZIP context
              </span>
            </button>
          </div>

          <div className="mt-5 rounded-3xl border border-slate-700 bg-slate-950/85 p-3">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              rows={4}
              maxLength={6000}
              placeholder={`Tell ${workspace === "business" ? "Business" : "Personal"} SYNC what you need...`}
              className="w-full resize-none bg-transparent px-2 py-2 text-base text-white outline-none placeholder:text-slate-600"
            />

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={
                  listening ? stopListening : () => startListening({ greeting: false })
                }
                className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-black ${
                  listening
                    ? "border-rose-300/35 bg-rose-500/15 text-rose-100"
                    : "border-cyan-300/35 bg-cyan-500/15 text-cyan-100"
                }`}
              >
                {listening ? (
                  <MicOff className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
                {listening ? "Stop listening" : "Speak"}
              </button>

              <button
                type="button"
                onClick={() => sendMessage()}
                disabled={sending || !aiReady}
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 px-5 text-sm font-black text-white disabled:opacity-45"
              >
                {sending ? (
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
                {sending ? "SYNC is thinking..." : "Send to SYNC"}
              </button>
            </div>
          </div>

          {!voiceSupported || notice ? (
            <div className="mt-3 text-sm text-slate-400">{notice}</div>
          ) : null}
        </section>

        <section className="rounded-[2rem] border border-slate-800 bg-slate-950/65 p-5">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-cyan-200" />
            <h2 className="font-black text-white">Voice shortcuts</h2>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => sendMessage(suggestion, { forceSpeak: true })}
                disabled={sending || !aiReady}
                className="min-h-14 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 text-left text-sm font-bold text-slate-200 hover:border-cyan-400/30 disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </section>

        <SyncActionStudio
          workspace={workspace}
          disabled={sending || !aiReady}
          onNotice={setNotice}
        />

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/55 p-4">
            <ShieldCheck className="h-5 w-5 text-emerald-200" />
            <div className="mt-3 font-black text-white">Secure</div>
            <div className="mt-1 text-sm leading-6 text-slate-400">
              The OpenAI key remains on the Render backend.
            </div>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-950/55 p-4">
            <Bot className="h-5 w-5 text-cyan-200" />
            <div className="mt-3 font-black text-white">Context-aware</div>
            <div className="mt-1 text-sm leading-6 text-slate-400">
              Spoken briefings use the selected Personal or Business workspace.
            </div>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-950/55 p-4">
            <CheckCircle2 className="h-5 w-5 text-violet-200" />
            <div className="mt-3 font-black text-white">Controlled actions</div>
            <div className="mt-1 text-sm leading-6 text-slate-400">
              Ticket replies require exact selection and confirmation.
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-800 bg-slate-950/65 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-black text-white">Voice settings</h2>
              <p className="mt-1 text-xs text-slate-400">
                Browser voices vary by phone and device.
              </p>
            </div>
            <Volume2 className="h-5 w-5 text-cyan-200" />
          </div>

          <label className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-300">
            <span>
              <span className="block font-black text-white">Speak every answer</span>
              <span className="mt-1 block text-xs text-slate-500">
                Automatically reads the entire response
              </span>
            </span>
            <input
              type="checkbox"
              checked={settings.autoSpeakResponses}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  autoSpeakResponses: event.target.checked,
                  speechEnabled: event.target.checked
                    ? true
                    : current.speechEnabled,
                }))
              }
              className="h-5 w-5"
            />
          </label>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {VOICE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() =>
                  setSettings((current) => ({
                    ...current,
                    voiceId: option.id,
                    speechEnabled: true,
                  }))
                }
                className={`rounded-2xl border p-3 text-left ${
                  settings.voiceId === option.id
                    ? "border-cyan-400/40 bg-cyan-500/10"
                    : "border-slate-800 bg-slate-950/70"
                }`}
              >
                <span className="text-sm font-black text-white">{option.label}</span>
              </button>
            ))}
          </div>
        </section>

        {answer ? (
          <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
            <div className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] border border-cyan-400/25 bg-slate-950 p-5 shadow-2xl sm:rounded-[2rem] md:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
                    {answer.workspace} SYNC response
                  </div>
                  <h2 className="mt-2 text-xl font-black text-white">
                    Spoken briefing
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setAnswer(null)}
                  className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-700 bg-slate-900 text-slate-300"
                  aria-label="Close response"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 rounded-3xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">
                  You asked
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-200">
                  {answer.request}
                </div>
              </div>

              <div className="mt-3 whitespace-pre-wrap rounded-3xl border border-violet-400/20 bg-violet-400/10 p-4 text-sm leading-7 text-slate-200">
                {answer.message}
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() =>
                    speaking ? stopSpeaking() : speak(answer.message, { force: true })
                  }
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 text-sm font-black text-cyan-100"
                >
                  {speaking ? (
                    <Square className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                  {speaking ? "Stop audio" : "Read entire answer"}
                </button>
                <button
                  type="button"
                  onClick={() => setAnswer(null)}
                  className="min-h-12 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 px-5 text-sm font-black text-white"
                >
                  Done
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>{answer.model || "SYNC model"}</span>
                {answer.usage?.total_tokens ? (
                  <span>{answer.usage.total_tokens.toLocaleString()} tokens</span>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
