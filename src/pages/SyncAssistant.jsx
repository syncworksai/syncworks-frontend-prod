import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  CloudSun,
  Headphones,
  Settings2,
  ChevronRight,
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
import api, { getActiveBusinessId } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useWorkspaceAppearance } from "../components/customer/CustomerWorkspace";
import "../components/sync/SyncAssistTheme.css";
import SyncActionStudio from "../components/sync/SyncActionStudio";
import SyncAssistTeamDrawer from "../components/sync/SyncAssistTeamDrawer";
import SyncConnectionDiagnostics from "../components/sync/SyncConnectionDiagnostics";
import SyncWorkflowIntake from "../components/sync/SyncWorkflowIntake";
import {AVATARS, JarvisAvatar, JarvisAvatarPicker, useJarvisAvatar, getAvatarPhotoForUser} from "../components/sync/JarvisAvatar";
import {
  getSyncAiErrorMessage,
  getSyncAiStatus,
  getSyncVoiceStatus,
  synthesizeSyncSpeech,
  SYNC_VOICE_ROLES,
  sendSyncAiMessage,
} from "../api/syncAi";

const SETTINGS_KEY = "syncworks_sync_voice_settings_v3";
const HISTORY_KEY = "syncworks_sync_history_v2";

const PERSONAL_SUGGESTIONS = [
  "Read my complete Personal profile and all current updates aloud.",
  "What needs my attention today across requests, Health, finance, and messages?",
  "Help me prepare an appointment for my calendar.",
  "What weather information can you prepare from my saved address or ZIP?",
];

const PM_SUGGESTIONS = [
  "What PM maintenance items need attention today?",
  "Give me a read-only summary of my property-management portfolio.",
  "Help me triage a tenant maintenance issue.",
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
  if (value.includes("/pm") || value.includes("/property-management")) return "pm";
  return value.includes("/sbo") || value.includes("/business") ? "business" : "personal";
}

export default function SyncAssistant() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [appearance] = useWorkspaceAppearance();
  const pilotAccess = String(user?.email || "").trim().toLowerCase() === "jacoblord7@outlook.com";
  const location = useLocation();
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);
  const playbackUrlRef = useRef(null);
  const playbackGenerationRef = useRef(0);
  const [premiumVoiceState, setPremiumVoiceState] = useState("checking");

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
  const [status, setStatus] = useState({
    loading: true,
    enabled: false,
    configured: false,
    model: "",
  });
  const [input, setInput] = useState("");
  // Victoria's founder command center can hand off a planning request without
  // auto-running a billable AI message or a voice request.
  useEffect(()=>{
    const prompt=location.state?.victoriaPrompt;
    if(typeof prompt!=="string"||!prompt.trim())return;
    setInput(prompt.slice(0,3000));
    navigate(location.pathname+location.search,{replace:true,state:null});
  },[location.state,location.pathname,location.search,navigate]);

  const [answer, setAnswer] = useState(null);
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [mobilePanel, setMobilePanel] = useState(null);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [teamDockOpen,setTeamDockOpen]=useState(false);
  const [officeBackground, setOfficeBackground] = useState(() => {try{return localStorage.getItem("sw-jarvis-office-bg")!=="off";}catch{return true;}});
  const {avatarId,choose:chooseAvatar}=useJarvisAvatar();
  const [teamEmployees, setTeamEmployees] = useState([]);
  const [roleProgress, setRoleProgress] = useState(null);
  useEffect(()=>{
    if(!pilotAccess)return;
    let alive=true;
    const load=()=>api.get("/sync-ai/assist/pilot/team/",{timeout:12000})
      .then(({data})=>{if(alive)setTeamEmployees(data.employees||[])})
      .catch(()=>{});
    load();
    window.addEventListener("sw:assist-team-updated",load);
    return()=>{alive=false;window.removeEventListener("sw:assist-team-updated",load)};
  },[pilotAccess]);
  useEffect(() => {
    if (!pilotAccess) return;
    let active = true;
    const refreshProgress = async () => {
      try {
        const response = await api.get("/sync-ai/assist/pilot/workday/", { timeout: 12000 });
        if (!active) return;
        const steps = (response?.data?.goals || []).flatMap((goal) => goal.steps || []);
        const byRole = {};
        for (const step of steps) {
          const status = byRole[step.role] || { review: 0, complete: 0 };
          if (step.status === "AWAITING_APPROVAL") status.review += 1;
          if (step.status === "COMPLETED") status.complete += 1;
          byRole[step.role] = status;
        }
        setRoleProgress(byRole);
      } catch {
        if (active) setRoleProgress(null); // unavailable is not equivalent to zero.
      }
    };
    refreshProgress();
    const timer = window.setInterval(refreshProgress, 30000);
    const onFocus = () => refreshProgress();
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [pilotAccess]);

  const configuredAvatars = useMemo(() => AVATARS.map((avatar) => {
    const entry = teamEmployees.find((row) => row.id === avatar.id);
    return entry ? {
      ...avatar,
      photo: entry.photo || getAvatarPhotoForUser(avatar, user),
      name: entry.name,
      role: String(entry.role).toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "),
      executionStatus: entry.execution_status,
    } : {...avatar, photo: getAvatarPhotoForUser(avatar, user)};
  }), [teamEmployees, user?.email]);
  const selectedAssistant = configuredAvatars.find((assistant) => assistant.id === avatarId) || configuredAvatars[0];

  const suggestions = workspace === "pm" ? PM_SUGGESTIONS : workspace === "business" ? BUSINESS_SUGGESTIONS : PERSONAL_SUGGESTIONS;
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
    let checking = false;
    let lastConnectionError = "";
    async function verifySyncAvailability() {
      if (!active || checking || document.hidden) return;
      checking = true;
      try {
        const data = await getSyncAiStatus();
        if (!active) return;
        setStatus({
          loading: false,
          enabled: Boolean(data.enabled),
          configured: Boolean(data.configured),
          model: data.model || "",
        });
        if (lastConnectionError) {
          const staleError = lastConnectionError;
          setNotice((message) => message === staleError ? "" : message);
          lastConnectionError = "";
        }
      } catch (error) {
        if (!active) return;
        setStatus({ loading: false, enabled: false, configured: false, model: "" });
        const message = getSyncAiErrorMessage(error);
        lastConnectionError = message;
        setNotice((current) => current && current !== lastConnectionError ? current : message);
      } finally {
        checking = false;
      }
    }
    verifySyncAvailability();
    const checkOnReturn = () => { if (!document.hidden) verifySyncAvailability(); };
    const interval = window.setInterval(verifySyncAvailability, 30000);
    window.addEventListener("focus", checkOnReturn);
    document.addEventListener("visibilitychange", checkOnReturn);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", checkOnReturn);
      document.removeEventListener("visibilitychange", checkOnReturn);
    };
  }, []);

  useEffect(() => {
    getSyncVoiceStatus().then((voice) => {
      setPremiumVoiceState(voice?.roles?.female_assistant?.configured ? "ready" : "unavailable");
    }).catch(() => setPremiumVoiceState("unavailable"));
  }, []);

  useEffect(() => () => {
    audioRef.current?.pause?.();
    if (playbackUrlRef.current) URL.revokeObjectURL(playbackUrlRef.current);
  }, []);

  function stopSpeaking() {
    playbackGenerationRef.current += 1;
    audioRef.current?.pause?.();
    audioRef.current = null;
    if (playbackUrlRef.current) URL.revokeObjectURL(playbackUrlRef.current);
    playbackUrlRef.current = null;
    window.speechSynthesis?.cancel?.();
    setSpeaking(false);
  }

  // A native SpeechSynthesisUtterance is a DEVICE voice, never ElevenLabs.
  // It is deliberately not an automatic fallback for the Chief of Staff.
  async function speak(text, { force = false } = {}) {
    if ((!settings.speechEnabled && !force) || !text) return;
    stopSpeaking();
    const generation = playbackGenerationRef.current;
    try {
      // Sync Assist's female Chief of Staff uses the Gemma profile.
      const blob = await synthesizeSyncSpeech(text, SYNC_VOICE_ROLES.femaleAssistant);
      if (generation !== playbackGenerationRef.current) return;
      const url = URL.createObjectURL(blob);
      playbackUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { if (generation === playbackGenerationRef.current) stopSpeaking(); };
      audio.onerror = () => {
        if (generation !== playbackGenerationRef.current) return;
        stopSpeaking();
        setNotice("ElevenLabs Gemma audio could not play on this device.");
      };
      await audio.play();
      if (generation === playbackGenerationRef.current) {
        setPremiumVoiceState("ready");
        setSpeaking(true);
      }
    } catch (error) {
      if (generation !== playbackGenerationRef.current) return;
      stopSpeaking();
      setPremiumVoiceState("unavailable");
      setNotice("Gemma (ElevenLabs) is unavailable. Device voice was not substituted. Check voice setup or tap to try again.");
    }
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
      const greetingText = workspace === "pm"
        ? "Property Management SYNC is ready. What can I do for you?"
        : workspace === "business"
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
      workspace === "pm"
        ? "Give me a read-only property-management briefing using the authorized portfolio summary. Tell me what needs attention and identify missing data."
        : workspace === "business"
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

  useEffect(()=>{try{localStorage.setItem("sw-jarvis-office-bg",officeBackground?"on":"off");}catch{}},[officeBackground]);
  useEffect(()=>{
    if(!avatarOpen)return;
    const onKey=e=>{if(e.key==="Escape")setAvatarOpen(false);};
    document.addEventListener("keydown",onKey);
    return()=>document.removeEventListener("keydown",onKey);
  },[avatarOpen]);

  useEffect(() => {
    if (!mobilePanel) return;
    const onEscape = (event) => { if (event.key === "Escape") setMobilePanel(null); };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [mobilePanel]);

  return (
    <div data-assist-theme={appearance.theme} data-assist-motion={appearance.motion?"on":"off"} className="sw-assist-themed sw-sync-home flex h-[calc(100dvh-155px)] min-h-[350px] flex-col overflow-hidden text-slate-100">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{backgroundImage:officeBackground?"var(--assist-room-shade), var(--assist-room-image)":"none",backgroundSize:"cover",backgroundPosition:"center",opacity:officeBackground?1:0}} />

      <header className="hidden lg:block border-b border-slate-800/90 bg-slate-950/88 px-4 py-3 backdrop-blur-xl">
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

      <main className="relative mx-auto min-h-0 w-full max-w-6xl flex-1 space-y-3 overflow-hidden px-4 pb-16 pt-3 lg:space-y-2 lg:pb-16 lg:pt-2">
        <div className="flex items-center justify-between gap-2 lg:hidden">
          <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">SYNC ASSIST</p><h1 className="text-lg font-black">Your command center</h1></div>
          <button type="button" onClick={() => setMobilePanel("settings")} aria-label="SYNC settings" className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-500/10"><Settings2 className="h-5 w-5"/></button>
        </div>
        {pilotAccess && <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => navigate("/sync/assist")} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-cyan-400/30 bg-slate-950/70 px-3 py-2 text-xs font-bold text-cyan-100">Workday & results <ChevronRight className="h-4 w-4"/></button>
          <SyncAssistTeamDrawer onTeamChange={setTeamEmployees}/>
        </div>}
        <section className="overflow-hidden rounded-2xl border border-cyan-400/25 bg-[#031222]/85 p-4 shadow-[0_0_60px_rgba(34,211,238,0.08)] backdrop-blur-xl lg:rounded-[2rem] lg:p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="hidden text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200 lg:block">
                Connected to your secure SyncWorks profile
              </div>
              <h1 className="mt-1 text-xl font-black tracking-tight text-white lg:mt-2 lg:text-2xl md:text-3xl">
                What can I do for you today?
              </h1>
              <p className="hidden mt-2 max-w-2xl text-xs leading-5 text-slate-300 lg:block">
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
          <div className="mt-2 flex justify-end">
            <SyncConnectionDiagnostics />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 lg:mt-3 lg:gap-3">
            <button
              type="button"
              onClick={() => setWorkspace("personal")}
              className={`min-w-0 rounded-xl border p-2 text-center lg:rounded-2xl lg:p-2 lg:text-left ${
                workspace === "personal"
                  ? "border-cyan-400/40 bg-cyan-500/12"
                  : "border-slate-800 bg-slate-950/70"
              }`}
            >
              <UserRound className="mx-auto h-5 w-5 text-cyan-200 lg:mx-0" />
              <div className="mt-1 text-[11px] font-black text-white lg:mt-1 lg:text-sm">Personal</div>
              <div className="mt-1 hidden text-[11px] leading-4 text-slate-400 lg:block">
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
              className={`min-w-0 rounded-xl border p-2 text-center lg:rounded-3xl lg:p-4 lg:text-left ${
                workspace === "business"
                  ? "border-violet-400/40 bg-violet-500/12"
                  : "border-slate-800 bg-slate-950/70"
              } ${businessAvailable ? "" : "opacity-60"}`}
            >
              <BriefcaseBusiness className="mx-auto h-5 w-5 text-violet-200 lg:mx-0" />
              <div className="mt-1 text-[11px] font-black text-white lg:mt-3 lg:text-base">Business</div>
              <div className="mt-1 hidden text-xs leading-5 text-slate-400 lg:block">
                {businessAvailable
                  ? "Jobs, leads, approvals, messages, and operations."
                  : "Select a Business workspace first."}
              </div>
            </button>
            <button type="button" onClick={() => { setWorkspace("pm"); setNotice("PM SYNC requires an authorized Property Management portfolio."); }}
              className={`min-w-0 rounded-xl border p-2 text-center lg:rounded-3xl lg:p-4 lg:text-left ${workspace === "pm" ? "border-emerald-400/40 bg-emerald-500/10" : "border-slate-800 bg-slate-950/70"}`}>
              <Building2 className="mx-auto h-5 w-5 text-emerald-200 lg:mx-0" />
              <div className="mt-1 text-[11px] font-black text-white lg:mt-3 lg:text-base">Property</div>
              <div className="mt-1 hidden text-xs leading-5 text-slate-400 lg:block">Property, maintenance and work-order oversight.</div>
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 lg:mt-5 lg:gap-3">
            <button
              type="button"
              onClick={readFullProfile}
              disabled={sending || !aiReady}
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 px-5 text-left font-black text-white disabled:opacity-45"
            >
              {sending ? (
                <LoaderCircle className="h-6 w-6 animate-spin" />
              ) : speaking ? (
                <Volume2 className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6" />
              )}
              <span>
                <span className="block text-sm lg:text-base">Brief me</span>
                <span className="mt-1 hidden text-xs font-medium text-cyan-100 lg:block">
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
              className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border px-3 text-left text-sm font-black lg:min-h-14 lg:rounded-2xl lg:px-4 ${
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
                <span className="mt-1 hidden text-xs font-medium opacity-80 lg:block">
                  {listening ? "SYNC is listening now" : "Start voice command"}
                </span>
              </span>
            </button>
          </div>

          <div className="hidden gap-2 sm:grid-cols-2 lg:hidden">
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

          <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950/85 p-2 lg:mt-2 lg:rounded-2xl lg:p-2">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              rows={2}
              maxLength={6000}
              placeholder={`Tell ${workspace === "business" ? "Business" : "Personal"} SYNC what you need...`}
              className="w-full resize-none bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-slate-600 lg:text-base"
            />

            <div className="mt-1 flex flex-wrap gap-2 lg:mt-3">
              <button
                type="button"
                onClick={
                  listening ? stopListening : () => startListening({ greeting: false })
                }
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-black lg:min-h-11 lg:rounded-xl lg:px-3 lg:text-xs ${
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
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 px-5 text-sm font-black text-white disabled:opacity-45"
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

        <div className="grid grid-cols-3 gap-2">
          {[["shortcuts", "Shortcuts", Sparkles], ["tools", "Tools", Bot], ["settings", "Settings", Settings2]].map(([id, label, Icon]) => (
            <button key={id} type="button" onClick={() => setMobilePanel(id)} className="flex min-h-12 flex-row items-center justify-center gap-2 rounded-xl border border-cyan-400/25 bg-slate-950/70 text-xs font-black text-cyan-100"><Icon className="h-4 w-4"/>{label}</button>
          ))}
        </div>
        <div className={mobilePanel === "shortcuts" ? "fixed inset-0 z-[250] flex items-end justify-end bg-black/85 px-2 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(.75rem,env(safe-area-inset-bottom))] backdrop-blur-md" : "hidden"}>
          <div role="dialog" aria-modal={mobilePanel === "shortcuts" ? "true" : undefined} aria-label="SYNC shortcuts" className="max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto overscroll-contain rounded-2xl bg-[#081326] lg:h-full lg:max-h-full lg:rounded-l-2xl">
            <button type="button" onClick={() => setMobilePanel(null)} className="sticky top-0 z-10 flex min-h-12 w-full items-center justify-between border-b border-cyan-400/20 bg-[#081326] px-4 text-sm font-black text-white ">Voice shortcuts <X className="h-5 w-5"/></button>
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
          </div>
        </div>

        <div className={mobilePanel === "tools" ? "fixed inset-0 z-[250] flex items-end justify-end bg-black/85 px-2 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(.75rem,env(safe-area-inset-bottom))] backdrop-blur-md" : "hidden"}>
          <div role="dialog" aria-modal={mobilePanel === "tools" ? "true" : undefined} aria-label="SYNC tools" className="max-h-[calc(100dvh-2rem)] w-full max-w-xl space-y-4 overflow-y-auto overscroll-contain rounded-2xl bg-[#081326] p-3 lg:h-full lg:max-h-full lg:rounded-l-2xl">
            <button type="button" onClick={() => setMobilePanel(null)} className="sticky top-0 z-10 flex min-h-12 w-full items-center justify-between border-b border-cyan-400/20 bg-[#081326] px-4 text-sm font-black text-white ">Tools & workflows <X className="h-5 w-5"/></button>
        <div className="grid grid-cols-2 gap-2 lg:hidden">
          <button type="button" onClick={prepareAppointment} className="min-h-14 rounded-xl border border-violet-300/30 bg-violet-500/10 px-3 text-left text-xs font-black text-white"><CalendarDays className="mb-1 h-4 w-4 text-violet-200"/>Prepare appointment</button>
          <button type="button" onClick={prepareWeather} disabled={sending || !aiReady} className="min-h-14 rounded-xl border border-cyan-300/30 bg-cyan-500/10 px-3 text-left text-xs font-black text-white disabled:opacity-50"><CloudSun className="mb-1 h-4 w-4 text-cyan-200"/>Location weather</button>
        </div>
        <SyncWorkflowIntake workspace={workspace} onNotice={setNotice} />

        {workspace !== "pm" ? <SyncActionStudio
          workspace={workspace}
          disabled={sending || !aiReady}
          onNotice={setNotice}
        /> : null}
          </div>
        </div>

        <div className={mobilePanel === "settings" ? "fixed inset-0 z-[250] flex items-end justify-end bg-black/85 px-2 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(.75rem,env(safe-area-inset-bottom))] backdrop-blur-md" : "hidden"}>
          <div role="dialog" aria-modal={mobilePanel === "settings" ? "true" : undefined} aria-label="SYNC settings" className="max-h-[calc(100dvh-2rem)] w-full max-w-xl space-y-4 overflow-y-auto overscroll-contain rounded-2xl bg-[#081326] p-3 lg:h-full lg:max-h-full lg:rounded-l-2xl">
            <button type="button" onClick={() => setMobilePanel(null)} className="sticky top-0 z-10 flex min-h-12 w-full items-center justify-between border-b border-cyan-400/20 bg-[#081326] px-4 text-sm font-black text-white ">SYNC settings <X className="h-5 w-5"/></button>
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

          <div className="mt-4 rounded-xl border border-cyan-400/25 bg-cyan-500/10 p-3 text-sm text-slate-100">
            <strong>Chief of Staff voice: Gemma (ElevenLabs)</strong>
            <p className="mt-1 text-xs text-slate-300">Status: {premiumVoiceState === "ready" ? "Configured" : premiumVoiceState === "checking" ? "Checking" : "Unavailable — voice ID or provider must be configured"}. Your phone's system voice will not be substituted.</p>
          </div>
        </section>
          </div>
        </div>

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
      <div className="absolute bottom-3 right-3 z-[180] max-w-[calc(100vw-1.5rem)]" aria-label="SYNC AI employee dock">
        <button type="button" aria-expanded={teamDockOpen} onClick={()=>setTeamDockOpen(v=>!v)} className="flex items-center gap-2 rounded-full border border-cyan-300/45 bg-[var(--assist-glass-strong)] px-3 py-2 text-xs font-bold text-white shadow-xl"><img src={configuredAvatars[0]?.photo||""} alt="" className="h-8 w-8 rounded-full object-cover object-top"/>{teamDockOpen?"Close team":"AI team"}<ChevronRight size={15}/></button>
        <div className={`${teamDockOpen?"flex":"hidden"} absolute bottom-full right-0 mb-2 max-h-[min(60dvh,380px)] max-w-[calc(100vw-1.5rem)] flex-wrap justify-end gap-2 overflow-y-auto rounded-2xl border border-cyan-400/30 bg-[var(--assist-glass-strong)] p-3 shadow-2xl backdrop-blur-xl`}>
          {configuredAvatars.map((assistant) => (
            <button
              key={assistant.id}
              type="button"
              aria-label={`Open ${assistant.name} — ${assistant.role} work dashboard`}
              aria-pressed={avatarOpen && avatarId === assistant.id}
              title={`${assistant.name} — ${assistant.role}`}
              onClick={() => { if (pilotAccess) navigate("/sync/assist/employee/" + encodeURIComponent(assistant.id)); else { chooseAvatar(assistant.id); setAvatarOpen(true); } }}
              className="group relative flex w-[67px] flex-col items-center gap-1 sm:w-[80px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
            >
              <span className={`relative block h-12 w-12 rounded-full border-2 bg-[#061323] shadow-[0_5px_20px_rgba(0,0,0,.55)] transition-transform group-hover:-translate-y-1 sm:h-14 sm:w-14 ${avatarId === assistant.id ? "border-cyan-300 shadow-[0_0_21px_rgba(34,211,238,.55)]" : "border-cyan-300/45 shadow-[0_0_16px_rgba(34,211,238,.2)]"}`}>
                <img src={assistant.photo} alt="" className="h-full w-full rounded-full object-cover object-top" />
                {pilotAccess && roleProgress && (() => {
                  const match = teamEmployees.find((entry) => entry.id === assistant.id);
                  const key = match?.role || assistant.role.toUpperCase().replaceAll(" ", "_");
                  const progress = roleProgress[key];
                  if (!progress) return null;
                  return <>
                    {progress.review > 0 && <span title={progress.review + " tasks awaiting your approval"} className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white ring-2 ring-[#061323]">{progress.review > 99 ? "99+" : progress.review}</span>}
                    {progress.complete > 0 && <span title={progress.complete + " owner-confirmed completed tasks"} className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white ring-2 ring-[#061323]"><CheckCircle2 className="h-3.5 w-3.5"/></span>}
                  </>;
                })()}

              </span>
              <span className="rounded-md bg-[#020817]/85 px-1.5 py-0.5 text-center text-[10px] font-bold leading-tight text-white shadow-lg backdrop-blur-sm">{assistant.name}</span>
              <span className="max-w-full rounded-md bg-[#020817]/85 px-1 py-0.5 text-center text-[9px] leading-tight text-slate-200 shadow-lg backdrop-blur-sm">{assistant.role}</span>
            </button>
          ))}
        </div>
      </div>
      {avatarOpen&&<div className="fixed inset-0 z-[240] flex items-end justify-center bg-slate-950/65 p-3 pb-[calc(9rem+env(safe-area-inset-bottom))] backdrop-blur-sm lg:items-end lg:justify-end lg:pb-36 lg:pr-24" onMouseDown={e=>{if(e.target===e.currentTarget)setAvatarOpen(false);}}>
        <section role="dialog" aria-modal="true" aria-label={`${selectedAssistant.name} — ${selectedAssistant.role} assistant controls`} className="max-h-[min(72dvh,580px)] w-full max-w-md overflow-y-auto rounded-3xl border border-cyan-400/45 bg-[#061326] p-4 shadow-2xl">
          <div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-widest text-cyan-200">Your personal assistant</p><h2 className="text-xl font-black">Meet {selectedAssistant.name} — {selectedAssistant.role}</h2></div><button onClick={()=>setAvatarOpen(false)} className="grid h-11 w-11 place-items-center rounded-xl border border-white/20" aria-label="Close assistant"><X size={20}/></button></div>
          <div className="flex items-center justify-center gap-3">
            <JarvisAvatar id={avatarId} displayName={selectedAssistant.name} displayRole={selectedAssistant.role} state={speaking?"speaking":listening?"listening":sending?"thinking":"idle"} size="hero"/>
            <div className="min-w-0 flex-1 space-y-3">
              <p className="text-sm text-slate-300">{speaking?"Speaking":listening?"Listening":sending?"Preparing an answer":"Ready when you are"}</p>
              <button type="button" onClick={()=>{setAvatarOpen(false);listening?stopListening():startListening({greeting:false});}} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-3 text-sm font-bold text-white"><Mic size={17}/>{listening?"Stop listening":`Speak to ${selectedAssistant.name}`}</button>
              <button type="button" onClick={()=>speaking?stopSpeaking():speak("Hello. I'm your SyncWorks assistant. How may I help you today?",{force:true})} className="min-h-11 w-full rounded-xl border border-cyan-400/40 px-3 text-xs font-bold text-cyan-100">{speaking?"Stop voice":"Hear a preview"}</button>
            </div>
          </div>
          {pilotAccess ? <p className="mt-4 text-xs text-slate-300">To edit team names and role assignments, use Manage AI team on this page.</p> : <div className="mt-4"><JarvisAvatarPicker value={avatarId} onChange={chooseAvatar}/></div>}
          <label className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-200"><span>Office background</span><input type="checkbox" checked={officeBackground} onChange={e=>setOfficeBackground(e.target.checked)} className="h-5 w-5 accent-cyan-500"/></label>
          <p className="mt-2 text-xs text-slate-300">Voice: Gemma via ElevenLabs · {premiumVoiceState === "ready" ? "Configured" : premiumVoiceState === "checking" ? "Checking configuration" : "Needs setup"}. Device text-to-speech is not used as an automatic fallback.</p>
          <p className="mt-1 text-xs text-slate-400">Each portrait identifies a specialist; selecting one does not activate an independent background worker. Appearance and office preferences are saved on this device.</p>
        </section>
      </div>}
    </div>
  );
}
