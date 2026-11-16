import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Palette, LayoutGrid, X, CalendarDays, ListTodo, Inbox, BriefcaseBusiness, Building2, Wallet, Heart, TrendingUp, Spade, ShoppingBag, Users, CloudSun, MapPinned, Settings, RotateCcw } from "lucide-react";
import "./CustomerWorkspace.css";

export const WORKSPACE_THEMES = ["legacy", "classic", "future", "modern", "light"];
const SETTINGS_KEY = "sw_workspace_appearance_v1";
const DEFAULTS = { theme: "legacy", motion: true, compact: false };
const APPS = [
  ["Calendar", "/calendar", CalendarDays], ["Tasks", "/customer/todo", ListTodo],
  ["Inbox", "/customer/inbox", Inbox], ["Business", "/sbo", BriefcaseBusiness],
  ["Property", "/pm", Building2], ["Finance", "/customer/finance", Wallet],
  ["Health", "/customer/health", Heart], ["Trading", "/customer/day-trading-futures", TrendingUp],
  ["Games", "/customer/games", Spade], ["Shop Assist", "/customer/store", ShoppingBag],
  ["Social", "/connect", Users], ["Weather", "/customer/weather", CloudSun],
  ["Traffic", "/customer/traffic", MapPinned], ["Settings", "/settings", Settings],
];
export function readWorkspaceAppearance() {
  try {
    const value = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
    return { ...DEFAULTS, ...value, theme: WORKSPACE_THEMES.includes(value?.theme) ? value.theme : "legacy" };
  } catch { return DEFAULTS; }
}
export function saveWorkspaceAppearance(next) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch { /* restricted storage */ }
  window.dispatchEvent(new CustomEvent("sw:workspace-appearance", { detail: next }));
}
export function useWorkspaceAppearance() {
  const [settings, setSettings] = useState(readWorkspaceAppearance);
  useEffect(() => {
    const onChange = () => setSettings(readWorkspaceAppearance());
    window.addEventListener("sw:workspace-appearance", onChange);
    window.addEventListener("storage", onChange);
    return () => { window.removeEventListener("sw:workspace-appearance", onChange); window.removeEventListener("storage", onChange); };
  }, []);
  const update = (next) => {
    const updated = { ...settings, ...next };
    saveWorkspaceAppearance(updated);
    setSettings(updated);
  };
  return [settings, update];
}
export function WorkspaceAppearancePanel({ settings, update }) {
  return <div className="sw-workspace-preferences">
    <p>Pick the atmosphere you prefer. Your selection applies instantly and your original layout remains available.</p>
    <div className="sw-workspace-theme-grid">{[
      ["legacy", "Original", "Current SyncWorks interface"],
      ["classic", "Classic Office", "Walnut, brass and warm light"],
      ["future", "SyncWorks Future", "Electric blue and violet"],
      ["modern", "Modern Dark", "Minimal and refined"],
      ["light", "Clean Light", "Bright and airy"],
    ].map(([id, label, detail]) => <button type="button" key={id} aria-pressed={settings.theme === id} className={`sw-workspace-theme sw-workspace-theme-${id} ${settings.theme === id ? "selected" : ""}`} onClick={() => update({theme:id})}><span className="sw-workspace-theme-sample"/><strong>{label}</strong><small>{detail}</small>{settings.theme === id && <span className="sw-workspace-check">✓ Selected</span>}</button>)}</div>
    <label className="sw-workspace-option"><input type="checkbox" checked={settings.motion} onChange={e => update({motion:e.target.checked})}/> Subtle visual transitions</label>
    <label className="sw-workspace-option"><input type="checkbox" checked={settings.compact} onChange={e => update({compact:e.target.checked})}/> Compact dashboard spacing</label>
    <button type="button" className="sw-workspace-reset" onClick={() => update(DEFAULTS)}><RotateCcw size={15}/> Restore original appearance</button>
    <small>Preferences are saved on this device. Account-wide syncing can be added when a preferences API is available.</small>
  </div>;
}
export default function CustomerWorkspace({ settings, update, phoneMode = false, dayTradingEnabled = false }) {
  const nav = useNavigate();
  const [panel, setPanel] = useState(null);
  useEffect(() => {
    if (!panel) return;
    const onKey = e => { if (e.key === "Escape") setPanel(null); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [panel]);
  const apps = APPS.filter(([name]) => dayTradingEnabled || name !== "Trading");
  const go = (path) => { setPanel(null); nav(path); };
  return <>
    <div className={`sw-workspace-switcher ${phoneMode ? "sw-workspace-switcher-mobile" : ""}`} role="group" aria-label="Workspace controls">
      <button type="button" onClick={() => setPanel("apps")}><LayoutGrid size={16}/> <span>Workspaces</span></button>
      <button type="button" onClick={() => setPanel("appearance")}><Palette size={16}/> <span>Appearance</span></button>
      <span className="sw-workspace-current">{settings.theme === "legacy" ? "Original" : settings.theme === "classic" ? "Classic Office" : settings.theme === "future" ? "SyncWorks Future" : settings.theme === "modern" ? "Modern Dark" : "Clean Light"}</span>
    </div>
    {panel && <div className="sw-workspace-overlay" onMouseDown={() => setPanel(null)}>
      <aside className="sw-workspace-drawer" role="dialog" aria-modal="true" aria-label={panel === "apps" ? "Workspace launcher" : "Appearance settings"} onMouseDown={e => e.stopPropagation()}>
        <header><div><span className="sw-workspace-eyebrow">SYNCWORKS / PERSONAL</span><h2>{panel === "apps" ? "Your workspaces" : "Appearance settings"}</h2></div><button type="button" className="sw-workspace-close" onClick={() => setPanel(null)} aria-label="Close"><X size={20}/></button></header>
        {panel === "apps" ? <><p className="sw-workspace-description">Your tools, organized in one place. Games keep their dedicated interface.</p><div className="sw-workspace-app-grid">{apps.map(([name, path, Icon]) => <button type="button" key={name} onClick={() => go(path)}><Icon size={22}/><span>{name}</span></button>)}</div></> : <WorkspaceAppearancePanel settings={settings} update={update}/>}
      </aside>
    </div>}
  </>;
}
