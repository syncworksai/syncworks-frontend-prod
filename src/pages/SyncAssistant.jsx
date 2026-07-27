import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  Headphones,
  History,
  LoaderCircle,
  Mic,
  MicOff,
  Send,
  ShieldCheck,
  Sparkles,
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

const SETTINGS_KEY = "syncworks_sync_voice_settings_v2";
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
  "What information do you know about my account?",
  "Help me organize what needs my attention today.",
  "Give me a concise personal briefing.",
  "What should I prepare before creating a service request?",
];

const BUSINESS_SUGGESTIONS = [
  "Summarize the business profile you currently have available.",
  "What should my business focus on today?",
  "Help me prepare an operations briefing.",
  "What information is missing from my business profile?",
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
  const [voiceSupported, setVoiceSupported] = useState(true);

  const selectedVoice = useMemo(
    () => VOICE_OPTIONS.find((item) => item.id === settings.voiceId) || VOICE_OPTIONS[0],
    [settings.voiceId]
  );

  const suggestions =
    workspace === "business" ? BUSINESS_SUGGESTIONS : PERSONAL_SUGGESTIONS;

  const businessAvailable = Boolean(getActiveBusinessId());

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
    };
  }, []);

  function speak(text) {
    if (!settings.speechEnabled || !window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const browserVoice = findBrowserVoice(selectedVoice, voices);
    if (browserVoice) utterance.voice = browserVoice;
    utterance.lang = browserVoice?.lang || selectedVoice.lang;
    utterance.rate = selectedVoice.id === "sync" ? 0.96 : 1;
    utterance.pitch = selectedVoice.id === "sync" ? 0.92 : 1;
    window.speechSynthesis.speak(utterance);
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
      setNotice("Voice capture is not supported in this browser. Text remains available.");
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

  async function sendMessage(rawValue = input) {
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
    setNotice(`SYNC is thinking in your ${workspace} workspace...`);
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
      setNotice("SYNC response prepared. No external action was taken.");
      speak(item.message);
    } catch (error) {
      setNotice(getSyncAiErrorMessage(error));
    } finally {
      setSending(false);
    }
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
              Secure AI workspace
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
                Connected to the SyncWorks backend
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-5xl">
                What should SYNC help with?
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                SYNC uses authenticated Personal or Business context. SYNC can prepare reviewable drafts using current context. It still cannot
                send, charge, assign, schedule, or change records.
              </p>
            </div>

            <div className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] ${
              status.enabled && status.configured
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                : status.loading
                ? "border-slate-700 bg-slate-900 text-slate-400"
                : "border-amber-400/30 bg-amber-500/10 text-amber-200"
            }`}>
              {status.loading
                ? "Checking AI"
                : status.enabled && status.configured
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
                Uses your saved Personal profile and account context.
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
                  ? "Uses the currently active Business workspace."
                  : "Select a Business workspace first."}
              </div>
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
              placeholder={`Ask ${workspace === "business" ? "Business" : "Personal"} SYNC anything...`}
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
                {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                {listening ? "Stop listening" : "Speak"}
              </button>

              <button
                type="button"
                onClick={() => sendMessage()}
                disabled={sending || !status.enabled || !status.configured}
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
            <h2 className="font-black text-white">
              {workspace === "business" ? "Business prompts" : "Personal prompts"}
            </h2>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  setInput(suggestion);
                  sendMessage(suggestion);
                }}
                disabled={sending}
                className="min-h-14 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 text-left text-sm font-bold text-slate-200 hover:border-cyan-400/30 disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </section>

        <SyncActionStudio
          workspace={workspace}
          disabled={sending || !status.enabled || !status.configured}
          onNotice={setNotice}
        />

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/55 p-4">
            <ShieldCheck className="h-5 w-5 text-emerald-200" />
            <div className="mt-3 font-black text-white">Secure</div>
            <div className="mt-1 text-sm leading-6 text-slate-400">
              Your OpenAI key remains on the Render backend.
            </div>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-950/55 p-4">
            <Bot className="h-5 w-5 text-cyan-200" />
            <div className="mt-3 font-black text-white">Context-aware</div>
            <div className="mt-1 text-sm leading-6 text-slate-400">
              SYNC separates Personal and Business workspace context.
            </div>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-950/55 p-4">
            <CheckCircle2 className="h-5 w-5 text-violet-200" />
            <div className="mt-3 font-black text-white">Draft-and-confirm</div>
            <div className="mt-1 text-sm leading-6 text-slate-400">
              SYNC prepares editable drafts, but execution remains disabled.
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-800 bg-slate-950/65 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-black text-white">Voice</h2>
              <p className="mt-1 text-xs text-slate-400">
                Browser voices vary by device.
              </p>
            </div>
            <Volume2 className="h-5 w-5 text-cyan-200" />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {VOICE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() =>
                  setSettings((current) => ({ ...current, voiceId: option.id }))
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
                  <h2 className="mt-2 text-xl font-black text-white">SYNC</h2>
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

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>{answer.model || "SYNC model"}</span>
                {answer.usage?.total_tokens ? (
                  <span>{answer.usage.total_tokens.toLocaleString()} tokens</span>
                ) : null}
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                No message, charge, schedule, assignment, or database change was made.
              </div>

              <button
                type="button"
                onClick={() => setAnswer(null)}
                className="mt-5 min-h-12 w-full rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 px-5 text-sm font-black text-white"
              >
                Done
              </button>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
