import React, { useEffect, useRef, useState } from "react";
import { Bell, BellOff, Bot, MessageSquareText, ShieldAlert, Volume2, VolumeX, X } from "lucide-react";
import SyncAssistantStickyDock from "../sync/SyncAssistantStickyDock";

const SIGNALS = new Set(["LONG", "SHORT", "BULLISH WATCH", "BEARISH WATCH"]);
const STORAGE_KEY = "syncworks-trading-alert-settings-v1";

function readSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return { enabled: stored.enabled === true, voice: stored.voice === true };
  } catch { return { enabled: false, voice: false }; }
}
function audible(message) {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new window.SpeechSynthesisUtterance(message);
  utterance.rate = 1.05;
  window.speechSynthesis.speak(utterance);
}

/**
 * Read-only trading overlay. Fires only for a newly observed, completed-candle
 * signal, and never for initial page hydration or stale/offline data.
 * Alerts require explicit opt-in and only run while this browser page is active.
 */
export default function TradingJarvisPanel({
  symbol, mode = "historical", signal = "WAIT", reason = "",
  timestamp, live = false, identity = "", details = [], displayName = "Trader",
}) {
  const [settings, setSettings] = useState(readSettings);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [flash, setFlash] = useState(null);
  const [history, setHistory] = useState([]);
  const lastObserved = useRef(null);
  const key = [symbol, mode, identity].join("|");
  const actionable = SIGNALS.has(signal);
  const message = actionable
    ? symbol + " " + signal.replace(" WATCH", " setup watch") + ". Review confirmation, spread, stop, and size before considering a trade."
    : "No fresh aligned setup. Preserve capital and wait for confirmation.";

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* unavailable */ }
  }, [settings]);

  useEffect(() => {
    // When switching symbol or data set, initialize rather than alert on old data.
    lastObserved.current = null;
    setFlash(null);
  }, [symbol, mode, identity]);

  useEffect(() => {
    if (!live || !timestamp || !settings.enabled) { lastObserved.current = null; return; }
    const observed = symbol + "|" + identity + "|" + timestamp;
    if (lastObserved.current === null) { lastObserved.current = observed; return; }
    if (lastObserved.current === observed) return;
    lastObserved.current = observed;
    if (!actionable) return;
    const item = { signal, symbol, reason, timestamp: String(timestamp), observedAt: new Date().toLocaleTimeString() };
    setFlash(item);
    setHistory((previous) => [item, ...previous].slice(0, 10));
    if (settings.voice) audible(message);
  }, [live, timestamp, identity, symbol, signal, reason, settings.enabled, settings.voice, actionable, message]);

  return <section className="relative rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-slate-900 via-[#08162a] to-slate-950 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-center gap-2"><Bot className="h-5 w-5 text-cyan-300"/><div><div className="text-xs font-black uppercase tracking-wider text-cyan-200">Jarvis / Sync Assist</div><div className="text-xs text-slate-400">Trading analyst • manual decisions only</div></div></div>
      <button type="button" onClick={() => setAssistantOpen((v)=>!v)} aria-expanded={assistantOpen} className="flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-100"><MessageSquareText size={16}/> {assistantOpen ? "Hide assistant" : "Open Jarvis"}</button>
    </div>
    <p className="mt-3 text-sm text-slate-200">{message}</p>
    {reason && <p className="mt-2 text-xs text-slate-400">{reason}</p>}
    <div className="mt-3 grid gap-2 sm:grid-cols-3">
      {details.map((detail, index)=><div key={index} className="rounded-lg border border-white/10 bg-black/20 p-2"><div className="text-[10px] font-bold uppercase text-slate-500">{detail.label}</div><div className="mt-1 text-xs font-semibold">{detail.value || "—"}</div></div>)}
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <button type="button" aria-pressed={settings.enabled} onClick={() => setSettings((s)=>({...s,enabled:!s.enabled}))} className={"flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold " + (settings.enabled ? "border-emerald-400/30 text-emerald-200" : "border-white/10 text-slate-300")}>{settings.enabled ? <Bell size={15}/> : <BellOff size={15}/>} On-screen alerts {settings.enabled ? "ON" : "OFF"}</button>
      <button type="button" aria-pressed={settings.voice} onClick={() => setSettings((s)=>({...s,voice:!s.voice}))} className={"flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold " + (settings.voice ? "border-cyan-400/30 text-cyan-200" : "border-white/10 text-slate-300")}>{settings.voice ? <Volume2 size={15}/> : <VolumeX size={15}/>} Voice {settings.voice ? "ON" : "OFF"}</button>
      <span className="text-[11px] text-slate-500">{live ? "Alerts armed for new confirmed candles" : "Alerts paused: historical, stale, or disconnected feed"}</span>
    </div>
    {history.length > 0 && <div className="mt-3 border-t border-white/10 pt-3"><div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Alerts this session</div><div className="mt-2 flex flex-wrap gap-2">{history.map((item,i)=><span key={item.timestamp+i} className="rounded-lg border border-white/10 px-2 py-1 text-xs">{item.symbol} {item.signal} · {item.observedAt}</span>)}</div></div>}
    <div className="mt-3 flex items-start gap-2 text-[11px] text-slate-500"><ShieldAlert className="h-4 w-4 shrink-0"/>No trade is placed. This panel is not a standalone live data feed or trading recommendation. Stay at the keyboard to receive browser alerts.</div>
    {flash && <div role="alert" aria-live="assertive" className="fixed inset-x-3 top-16 z-[210] mx-auto max-w-3xl animate-pulse rounded-3xl border-2 border-amber-300 bg-slate-950 p-5 text-center shadow-[0_0_65px_rgba(251,191,36,.35)] sm:top-20"><button aria-label="Dismiss signal" onClick={()=>setFlash(null)} className="absolute right-3 top-3 text-slate-300"><X size={20}/></button><div className="text-xs font-black tracking-[.2em] text-amber-200">NEW CANDLE • REVIEW SETUP</div><div className="mt-2 text-3xl font-black text-white">{flash.symbol} — {flash.signal}</div><p className="mt-2 text-sm text-slate-300">{flash.reason}</p><p className="mt-2 text-xs text-slate-500">Check data freshness, stop, spread and position size. No execution.</p></div>}
    {assistantOpen && <div className="mt-4 rounded-xl border border-cyan-400/15 bg-slate-950/50 p-2"><p className="p-2 text-xs text-slate-400">Your Sync Assist voice dock opens below. Market details on this page are not automatically supplied as assistant context.</p><SyncAssistantStickyDock displayName={displayName}/></div>}
  </section>;
}
