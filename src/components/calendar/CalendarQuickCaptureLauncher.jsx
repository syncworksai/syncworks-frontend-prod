import React, { useMemo, useState } from "react";
import { CalendarPlus2, Check, Mic, Sparkles, X } from "lucide-react";

import api from "../../api/client";
import PlaceSearchField from "../PlaceSearchField";

function pad(value) { return String(value).padStart(2, "0"); }
function ymd(value = new Date()) {
  const date = new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function addDays(value, amount) {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
}

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function parseCapture(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  let date = new Date();
  if (/\btomorrow\b/.test(lower)) date = addDays(date, 1);
  else {
    const named = DAYS.findIndex((day) => lower.includes(day));
    if (named >= 0 && named !== date.getDay()) date = addDays(date, (named - date.getDay() + 7) % 7 || 7);
  }

  const timeMatch = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/) || lower.match(/\b(\d{1,2}):(\d{2})\b/);
  let hour = 9;
  let minute = 0;
  if (timeMatch) {
    hour = Number(timeMatch[1] || 9);
    minute = Number(timeMatch[2] || 0);
    const meridiem = String(timeMatch[3] || "").toLowerCase();
    if (meridiem === "pm" && hour < 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;
  }

  const locationMatch = raw.match(/(?:\bat\b|\b@\b)\s+(.+)$/i);
  const location = locationMatch?.[1]?.trim() || "";
  let title = raw
    .replace(/\b(today|tomorrow|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi, "")
    .replace(/\b(?:at\s*)?\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/gi, "")
    .replace(/\b(?:at\s*)?\d{1,2}:\d{2}\b/gi, "")
    .replace(locationMatch?.[0] || "", "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[,\s-]+|[,\s-]+$/g, "")
    .trim();
  if (!title) title = "Appointment";
  const startTotal = hour * 60 + minute;
  const endTotal = startTotal + 60;

  return {
    title: title.charAt(0).toUpperCase() + title.slice(1),
    date: ymd(date),
    time: `${pad(hour)}:${pad(minute)}`,
    endDate: ymd(endTotal >= 1440 ? addDays(date, 1) : date),
    endTime: `${pad(Math.floor((endTotal % 1440) / 60))}:${pad(endTotal % 60)}`,
    locationName: location,
    addressLine1: "",
    city: "",
    state: "",
    postalCode: "",
    latitude: null,
    longitude: null,
  };
}

export default function CalendarQuickCaptureLauncher({ onSaved }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [draft, setDraft] = useState(null);
  const [listening, setListening] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const canSave = useMemo(() => Boolean(draft?.title && draft?.date && draft?.time), [draft]);

  function prepare(value = text) {
    const parsed = parseCapture(value);
    if (!parsed) {
      setMessage("Type or say something like “Meet Chris today at 10:30 AM at 123 Main St.”");
      return;
    }
    setDraft(parsed);
    setMessage("Review it, resolve the address if needed, then Add to Calendar.");
  }

  function startVoice() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setMessage("Voice capture is not available in this browser. Type the appointment instead.");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      setText(transcript);
      prepare(transcript);
    };
    recognition.onerror = () => setMessage("Could not capture that. Try again or type it.");
    recognition.onend = () => setListening(false);
    recognition.start();
  }

  async function save() {
    if (!canSave || saving) return;
    setSaving(true);
    setMessage("");
    try {
      const start = new Date(`${draft.date}T${draft.time}`);
      const end = new Date(`${draft.endDate || draft.date}T${draft.endTime || draft.time}`);
      await api.post("/personal-calendar/events/", {
        title: String(draft.title).trim(),
        description: `Captured by SYNC Quick Capture from: ${text}`,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        all_day: false,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago",
        location_name: draft.locationName || "",
        address_line1: draft.addressLine1 || "",
        city: draft.city || "",
        state: draft.state || "",
        postal_code: draft.postalCode || "",
        latitude: draft.latitude,
        longitude: draft.longitude,
        arrival_buffer_minutes: draft.locationName || draft.addressLine1 ? 30 : 0,
        reminder_minutes: 30,
        recurrence_rule: "",
        source: "MANUAL",
        metadata: {
          entity_type: "EVENT",
          fixed: true,
          quick_capture: true,
          quick_capture_text: text,
        },
      });
      setMessage("Added to your master calendar.");
      onSaved?.();
      window.setTimeout(() => {
        setOpen(false);
        setText("");
        setDraft(null);
        setMessage("");
      }, 650);
    } catch (error) {
      setMessage(error?.response?.data?.detail || "Could not add that calendar item.");
    } finally {
      setSaving(false);
    }
  }

  return <>
    <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 text-[11px] font-black text-fuchsia-100"><Sparkles className="h-4 w-4" />Quick capture</button>

    {open ? <div className="fixed inset-0 z-[270] flex items-end justify-center bg-black/75 p-3 backdrop-blur-md sm:items-center" onMouseDown={() => setOpen(false)}>
      <section className="max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-[1.7rem] border border-violet-400/25 bg-[#050b16] p-4 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.18em] text-violet-200"><Sparkles className="h-4 w-4" />SYNC Quick Capture</div><h2 className="mt-1 text-xl font-black text-white">Add something fast</h2><p className="mt-1 text-xs leading-5 text-slate-500">Type or speak it naturally. SYNC prepares the fields; you can edit before adding it.</p></div><button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 text-slate-400"><X className="h-4 w-4" /></button></div>

        <div className="mt-4 flex gap-2"><input value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") prepare(); }} placeholder="Meet Chris today at 10:30 AM at 123 Main St." className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none placeholder:text-slate-600" /><button type="button" onClick={() => prepare()} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white" aria-label="Prepare"><Sparkles className="h-4 w-4" /></button><button type="button" onClick={startVoice} className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${listening ? "border-rose-400/30 bg-rose-500/10 text-rose-100" : "border-white/10 bg-white/[.04] text-slate-200"}`} aria-label="Voice capture"><Mic className="h-4 w-4" /></button></div>

        {draft ? <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 sm:col-span-2">Title<input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none" /></label>
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Date<input type="date" value={draft.date} onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value, endDate: event.target.value }))} className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none" /></label>
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Time<input type="time" value={draft.time} onChange={(event) => setDraft((current) => ({ ...current, time: event.target.value }))} className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none" /></label>
          <div className="sm:col-span-2"><PlaceSearchField value={draft.locationName || draft.addressLine1} onChange={(value) => setDraft((current) => ({ ...current, locationName: value }))} onSelect={(place) => setDraft((current) => ({ ...current, locationName: place.location_name || place.formatted_address || "", addressLine1: place.address_line1 || "", city: place.city || "", state: place.state || "", postalCode: place.postal_code || "", latitude: place.latitude, longitude: place.longitude }))} /></div>
        </div> : null}

        {message ? <div className="mt-3 rounded-xl border border-cyan-400/15 bg-cyan-500/[.06] p-2.5 text-[10px] leading-4 text-cyan-100">{message}</div> : null}

        {draft ? <div className="mt-4 flex justify-end"><button type="button" onClick={save} disabled={!canSave || saving} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-5 text-xs font-black text-white disabled:opacity-40">{saving ? <Sparkles className="h-4 w-4 animate-pulse" /> : <Check className="h-4 w-4" />}{saving ? "Adding…" : "Add to Calendar"}</button></div> : <div className="mt-4 flex justify-end"><button type="button" onClick={() => prepare()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 text-xs font-black text-violet-100"><CalendarPlus2 className="h-4 w-4" />Prepare details</button></div>}
      </section>
    </div> : null}
  </>;
}
