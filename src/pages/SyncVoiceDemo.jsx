import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Keyboard, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";

import SyncVoiceVisualizer from "../components/sync/SyncVoiceVisualizer";
import { buildSyncLiveBriefing } from "../lib/syncLiveBriefing";
import { SYNC_VOICE_STATUS_VALUES } from "../utils/syncVoiceStates";

const SETTINGS_KEY = "syncworks_sync_voice_settings_v1";

const STATUS_LABELS = {
  idle: "Idle",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
  success: "Success",
  error: "Error",
};

function loadSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
    return {
      voiceId: parsed?.voiceId || "sync",
      speechEnabled: parsed?.speechEnabled !== false,
    };
  } catch {
    return {
      voiceId: "sync",
      speechEnabled: true,
    };
  }
}

function chooseVoice(voices, voiceId) {
  const hints = {
    sync: ["Guy", "Daniel", "Alex", "Google US English"],
    "american-male": ["Guy", "David", "Alex", "Matthew", "Male"],
    "american-female": ["Samantha", "Jenny", "Aria", "Zira", "Female"],
    "british-female": ["Serena", "Sonia", "Hazel", "Kate", "Female"],
  };

  const language = voiceId === "british-female" ? "en-GB" : "en-US";
  const languageMatches = voices.filter((voice) =>
    String(voice.lang || "").toLowerCase().startsWith(language.toLowerCase())
  );

  for (const hint of hints[voiceId] || hints.sync) {
    const found = languageMatches.find((voice) =>
      String(voice.name || "").toLowerCase().includes(hint.toLowerCase())
    );
    if (found) return found;
  }

  return languageMatches[0] || voices[0] || null;
}

function responseFromBriefing(result) {
  return [
    result?.title,
    result?.summary,
    result?.speech,
    ...(Array.isArray(result?.bullets) ? result.bullets.slice(0, 3) : []),
  ]
    .filter(Boolean)
    .join(". ")
    .replace(/\.\s*\./g, ".")
    .trim();
}

export default function SyncVoiceDemo() {
  const navigate = useNavigate();
  const recognitionRef = useRef(null);
  const transcriptRef = useRef("");
  const sessionEndedRef = useRef(false);
  const requestIdRef = useRef(0);
  const processingRef = useRef(false);

  const [status, setStatus] = useState("idle");
  const [muted, setMuted] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [responseText, setResponseText] = useState("");
  const [typedRequest, setTypedRequest] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [showStateTester, setShowStateTester] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [notice, setNotice] = useState("");
  const [voices, setVoices] = useState([]);
  const [settings] = useState(loadSettings);

  const recognitionLanguage =
    settings.voiceId === "british-female" ? "en-GB" : "en-US";

  const selectedVoice = useMemo(
    () => chooseVoice(voices, settings.voiceId),
    [settings.voiceId, voices]
  );

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

  useEffect(
    () => () => {
      sessionEndedRef.current = true;
      recognitionRef.current?.abort?.();
      recognitionRef.current = null;
      window.speechSynthesis?.cancel?.();
    },
    []
  );

  function speakResponse(text) {
    if (!text) {
      setStatus("success");
      return;
    }

    if (muted || !settings.speechEnabled || !window.speechSynthesis) {
      setStatus("success");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.lang = selectedVoice?.lang || recognitionLanguage;
    utterance.rate = settings.voiceId === "sync" ? 0.96 : 1;
    utterance.pitch = settings.voiceId === "sync" ? 0.92 : 1;

    utterance.onstart = () => {
      if (!sessionEndedRef.current) setStatus("speaking");
    };
    utterance.onend = () => {
      if (!sessionEndedRef.current) setStatus("success");
    };
    utterance.onerror = () => {
      if (!sessionEndedRef.current) {
        setNotice("SYNC prepared the response, but browser voice playback failed.");
        setStatus("error");
      }
    };

    window.speechSynthesis.speak(utterance);
  }

  async function prepareVoiceRequest(rawValue) {
    const value = String(rawValue || "").trim();

    if (processingRef.current) return;

    if (!value) {
      setNotice("SYNC did not receive a request. Try again or type it.");
      setStatus("error");
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    processingRef.current = true;

    setStatus("thinking");
    setNotice("SYNC is reading your current workspace...");
    setResponseText("");

    try {
      const result = await buildSyncLiveBriefing(value);
      if (requestIdRef.current !== requestId || sessionEndedRef.current) return;
      const response = responseFromBriefing(result);

      setResponseText(response);
      setNotice(
        result?.partial
          ? "Response prepared from the workspace data currently available."
          : "Live workspace response prepared."
      );
      speakResponse(response);
    } catch {
      if (requestIdRef.current !== requestId || sessionEndedRef.current) return;

      const fallback =
        "I could not reach all live workspace data, but your request was captured. Open the main SYNC page to continue with a reviewable action card.";

      setResponseText(fallback);
      setNotice("Live workspace data was unavailable.");
      speakResponse(fallback);
    } finally {
      if (requestIdRef.current === requestId) {
        processingRef.current = false;
      }
    }
  }

  function startRecognition() {
    if (processingRef.current || recognitionRef.current) return;

    sessionEndedRef.current = false;
    setNotice("");
    setResponseText("");
    setTranscript("");
    transcriptRef.current = "";

    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!Recognition) {
      setVoiceSupported(false);
      setShowTextInput(true);
      setNotice(
        "Browser speech recognition is unavailable. Type your request below."
      );
      setStatus("error");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = recognitionLanguage;
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      setStatus("listening");
      setNotice("Listening...");
    };

    recognition.onresult = (event) => {
      const value = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();

      transcriptRef.current = value;
      setTranscript(value);
    };

    recognition.onerror = (event) => {
      const error = String(event?.error || "");
      if (error === "aborted") return;

      setNotice(
        error === "not-allowed"
          ? "Microphone speech recognition permission was denied."
          : "SYNC could not hear that clearly. Try again or type the request."
      );
      setShowTextInput(true);
      setStatus("error");
    };

    recognition.onend = () => {
      recognitionRef.current = null;

      if (sessionEndedRef.current) return;

      const value = transcriptRef.current.trim();
      if (value) {
        prepareVoiceRequest(value);
      } else if (status === "listening") {
        setStatus("idle");
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setNotice("Speech recognition could not start. Try again or type.");
      setShowTextInput(true);
      setStatus("error");
    }
  }

  function stopRecognition() {
    recognitionRef.current?.stop?.();
  }

  function resetSession() {
    requestIdRef.current += 1;
    processingRef.current = false;
    sessionEndedRef.current = false;
    recognitionRef.current?.abort?.();
    recognitionRef.current = null;
    window.speechSynthesis?.cancel?.();
    transcriptRef.current = "";
    setTranscript("");
    setResponseText("");
    setTypedRequest("");
    setNotice("");
    setStatus("idle");
  }

  function endSession() {
    requestIdRef.current += 1;
    processingRef.current = false;
    sessionEndedRef.current = true;
    recognitionRef.current?.abort?.();
    recognitionRef.current = null;
    window.speechSynthesis?.cancel?.();
    navigate("/sync");
  }

  async function submitTypedRequest(event) {
    event.preventDefault();
    const value = typedRequest.trim();
    if (!value) return;

    transcriptRef.current = value;
    setTranscript(value);
    setTypedRequest("");
    await prepareVoiceRequest(value);
  }

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

          <div className="text-center">
            <div className="text-sm font-black text-white">SYNC Voice</div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-cyan-200">
              Live assistant session
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowTextInput((current) => !current)}
              className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-700 bg-slate-900 text-slate-200"
              aria-label="Toggle text input"
              title="Type a request"
            >
              <Keyboard aria-hidden="true" className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => setShowStateTester((current) => !current)}
              className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-700 bg-slate-900 text-slate-200"
              aria-label="Toggle visual state tester"
              title="Test visual states"
            >
              <SlidersHorizontal aria-hidden="true" className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={resetSession}
              className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan-400/30 bg-cyan-500/10 text-cyan-100"
              aria-label="Reset voice session"
              title="Reset session"
            >
              <RotateCcw aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
        </div>

        {showStateTester ? (
          <div className="mb-3 flex flex-wrap justify-center gap-2 rounded-3xl border border-slate-800 bg-slate-950/85 p-3">
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
        ) : null}

        {showTextInput ? (
          <form
            onSubmit={submitTypedRequest}
            className="mb-3 grid gap-3 rounded-3xl border border-slate-800 bg-slate-950/90 p-4 sm:grid-cols-[1fr_auto]"
          >
            <input
              value={typedRequest}
              onChange={(event) => setTypedRequest(event.target.value)}
              placeholder="Type your request to SYNC..."
              className="min-h-12 rounded-2xl border border-slate-700 bg-slate-900 px-4 text-sm text-white outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              disabled={!typedRequest.trim() || status === "thinking"}
              className="min-h-12 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 text-sm font-black text-white disabled:opacity-40"
            >
              Ask SYNC
            </button>
          </form>
        ) : null}

        {!voiceSupported ? (
          <div className="mb-3 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-3 text-sm text-amber-100">
            Speech recognition is unavailable in this browser. Text requests
            remain fully supported.
          </div>
        ) : null}

        {notice ? (
          <div className="mb-3 rounded-2xl border border-cyan-400/20 bg-cyan-500/[0.08] p-3 text-center text-sm text-cyan-100">
            {notice}
          </div>
        ) : null}

        <SyncVoiceVisualizer
          status={status}
          transcript={transcript}
          responseText={responseText}
          muted={muted}
          onToggleMute={() => {
            setMuted((current) => {
              const next = !current;
              if (next) window.speechSynthesis?.cancel?.();
              return next;
            });
          }}
          onStatusChange={setStatus}
          onStartListening={startRecognition}
          onStopListening={stopRecognition}
          onEndSession={endSession}
        />
      </div>
    </div>
  );
}
