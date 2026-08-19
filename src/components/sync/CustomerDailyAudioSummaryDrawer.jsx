import React, { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle, Pause, Play, Repeat2, Volume2, X } from "lucide-react";

import { getSyncAssistantDailyState } from "../../api/jarvisProduct";
import { getSyncAiErrorMessage, synthesizeSyncSpeech } from "../../api/syncAi";

function browserSpeak(text, onEnd) {
  if (!window.speechSynthesis || !text) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices?.() || [];
  utterance.voice = voices.find((voice) => /daniel|alex|guy|google us english/i.test(voice.name || "")) || voices.find((voice) => String(voice.lang || "").toLowerCase().startsWith("en-us")) || voices[0] || null;
  utterance.lang = utterance.voice?.lang || "en-US";
  utterance.rate = 0.96;
  utterance.pitch = 0.92;
  utterance.onend = onEnd;
  utterance.onerror = onEnd;
  window.speechSynthesis.speak(utterance);
  return true;
}

function intro(state, displayName) {
  const name = displayName || state?.user_name || "there";
  const count = Number(state?.total_updates || 0);
  const recommendation = state?.recommended_next?.title;
  return `${state?.greeting || "Good day"}, ${name}. It is ${new Date(state?.local_time || Date.now()).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}. I checked your connected day. ${count ? `I have ${count} areas to review.` : "There are no major connected updates right now."}${recommendation ? ` My first recommendation is: ${recommendation}.` : ""}`;
}

export default function CustomerDailyAudioSummaryDrawer({ open, onClose, displayName = "" }) {
  const audioRef = useRef(null);
  const objectUrlRef = useRef("");
  const sectionsRef = useRef([]);
  const indexRef = useRef(0);
  const [state, setState] = useState(null);
  const [sections, setSections] = useState([]);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState("idle");
  const [notice, setNotice] = useState("");

  useEffect(() => { sectionsRef.current = sections; }, [sections]);
  useEffect(() => { indexRef.current = index; }, [index]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel?.();
    setStatus((value) => value === "loading" ? value : "ready");
  }, []);

  const cleanup = useCallback(() => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = "";
  }, []);

  const speak = useCallback(async (text, onEnd) => {
    const spoken = String(text || "").trim().slice(0, 1800);
    if (!spoken) return;
    stop(); cleanup();
    try {
      const blob = await synthesizeSyncSpeech(spoken);
      if (!(blob instanceof Blob) || blob.size < 100) throw new Error("Invalid audio");
      const url = URL.createObjectURL(blob.type ? blob : new Blob([blob], { type: "audio/mpeg" }));
      objectUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onplay = () => setStatus("speaking");
      audio.onended = () => { setStatus("ready"); onEnd?.(); };
      audio.onerror = () => browserSpeak(spoken, () => { setStatus("ready"); onEnd?.(); });
      await audio.play();
    } catch {
      const started = browserSpeak(spoken, () => { setStatus("ready"); onEnd?.(); });
      setStatus(started ? "speaking" : "ready");
    }
  }, [cleanup, stop]);

  const playSection = useCallback(async (target, autoAdvance = true) => {
    const section = sectionsRef.current[target];
    if (!section) return;
    setIndex(target);
    setNotice("");
    await speak(`${section.title}. ${section.summary}`, () => {
      if (autoAdvance && target + 1 < sectionsRef.current.length) playSection(target + 1, true);
    });
  }, [speak]);

  const load = useCallback(async () => {
    setStatus("loading"); setNotice(""); stop();
    try {
      const payload = await getSyncAssistantDailyState();
      const nextSections = Array.isArray(payload?.briefing_sections) ? payload.briefing_sections.filter((row) => row?.summary) : [];
      setState(payload); setSections(nextSections); sectionsRef.current = nextSections; setIndex(0); setStatus("ready");
      window.setTimeout(() => speak(intro(payload, displayName), () => nextSections.length && playSection(0, true)), 0);
    } catch (error) {
      setStatus("error"); setNotice(getSyncAiErrorMessage(error));
    }
  }, [displayName, playSection, speak, stop]);

  useEffect(() => {
    if (open) load();
    else { stop(); cleanup(); }
    return () => { stop(); cleanup(); };
  }, [open]);

  if (!open) return null;
  const current = sections[index];

  return (
    <div className="fixed inset-0 z-[190] flex items-end justify-center bg-black/80 backdrop-blur-sm">
      <section className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-t-[2rem] border border-cyan-400/25 bg-[#020617] p-5 text-slate-100 shadow-[0_-20px_100px_rgba(34,211,238,.18)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div><div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">SYNC Assistant · spoken daily brief</div><h2 className="mt-2 text-2xl font-black text-white">{state?.greeting || "Daily briefing"}, {displayName || state?.user_name || "there"}</h2><p className="mt-1 text-sm text-slate-400">Calendar, requests, Health, money, weather and other connected signals use the same daily state you see on Personal Home.</p></div>
          <button type="button" onClick={() => { stop(); onClose?.(); }} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-slate-700"><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-5 rounded-3xl border border-cyan-400/20 bg-cyan-500/[.06] p-4">
          {status === "loading" ? <div className="flex items-center gap-2 font-black text-cyan-100"><LoaderCircle className="h-5 w-5 animate-spin" />Building your live briefing…</div> : current ? <><div className="text-xs font-black uppercase tracking-[.15em] text-cyan-200">{current.title} · {index + 1} of {sections.length}</div><div className="mt-3 text-sm leading-7 text-slate-200">{current.summary}</div></> : <div className="text-sm text-slate-400">No connected briefing sections are available yet.</div>}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => status === "speaking" ? stop() : playSection(index, false)} disabled={!current} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-4 text-xs font-black text-cyan-100">{status === "speaking" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{status === "speaking" ? "Pause" : "Play"}</button>
          <button type="button" onClick={() => playSection(index, false)} disabled={!current} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-xs font-black"><Repeat2 className="h-4 w-4" />Repeat</button>
          <button type="button" onClick={() => playSection(Math.min(index + 1, sections.length - 1), false)} disabled={!current || index >= sections.length - 1} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-xs font-black"><Volume2 className="h-4 w-4" />Next</button>
        </div>

        <div className="mt-5 space-y-2">{sections.map((section, sectionIndex) => <button key={section.id || sectionIndex} type="button" onClick={() => playSection(sectionIndex, false)} className={`w-full rounded-2xl border p-3 text-left ${sectionIndex === index ? "border-cyan-400/30 bg-cyan-500/[.06]" : "border-white/10 bg-black/20"}`}><div className="text-xs font-black text-white">{section.title}</div><div className="mt-1 line-clamp-2 text-xs text-slate-400">{section.summary}</div></button>)}</div>
        {notice ? <div className="mt-4 text-xs font-bold text-rose-200">{notice}</div> : null}
      </section>
    </div>
  );
}
