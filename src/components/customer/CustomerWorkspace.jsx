import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { Palette, LayoutGrid, X, CalendarDays, ListTodo, Inbox, BriefcaseBusiness, Building2, Wallet, Heart, Flame, TrendingUp, Spade, ShoppingBag, Users, CloudSun, MapPinned, Settings, RotateCcw } from "lucide-react";
import "./CustomerWorkspace.css";
import "./OfficeThemeIntegrationV16.css";
import "./OfficeDrawersV21.css";

export const WORKSPACE_THEMES = ["legacy", "classic", "future", "modern", "light"];
const SETTINGS_KEY = "sw_workspace_appearance_v1";
const DEFAULTS = { theme: "legacy", motion: true, compact: false };
export const OFFICE_CATEGORIES = [
  {id:"daily",name:"Daily",description:"Your agenda, tasks, messages and requests",items:[["Calendar","/calendar",CalendarDays],["Tasks","/customer/tasks",ListTodo],["Inbox","/customer/inbox",Inbox],["New service request","/customer/new-request",LayoutGrid]]},
  {id:"personal",name:"Personal",description:"Money, wellbeing and your connections",items:[["Finance","/customer/finance",Wallet],["Health","/customer/health",Heart],["Connections","/settings?tab=CONNECTIONS",Settings]]},
  {id:"business",name:"Business",description:"Work, properties and service operations",items:[["Business","/sbo",BriefcaseBusiness],["Property","/pm",Building2],["Services","/customer/marketplace",LayoutGrid]]},
  {id:"apps",name:"Apps",description:"Games, local discovery, weather and tools",items:[["Games","/customer/games",Spade],["Social","/connect",Users],["Shop Assist","/customer/store",ShoppingBag],["Weather","/customer/weather",CloudSun],["Traffic","/customer/traffic",MapPinned],["Local","/customer/discover",MapPinned],["Day Trade","/customer/day-trading-futures",TrendingUp]]},
];
const APPS = [
  ["Calendar", "/calendar", CalendarDays], ["Tasks", "/customer/tasks", ListTodo],
  ["Inbox", "/customer/inbox", Inbox], ["Business", "/sbo", BriefcaseBusiness],
  ["Property", "/pm", Building2], ["Finance", "/customer/finance", Wallet],
  ["Health", "/customer/health", Heart], ["Day Trade", "/customer/day-trading-futures", TrendingUp],
  ["Games", "/customer/games", Spade], ["Shop Assist", "/customer/store", ShoppingBag],
  ["Social", "/connect", Users], ["Weather", "/customer/weather", CloudSun],
  ["Traffic", "/customer/traffic", MapPinned], ["Settings", "/customer/settings", Settings],
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
    ].map(([id, label, detail]) => <button type="button" key={id} aria-pressed={settings.theme === id} className={`sw-workspace-theme sw-workspace-theme-${id} ${settings.theme === id ? "selected" : ""}`} onClick={() => update({theme:id})}><span className="sw-workspace-theme-sample">{id !== "legacy" && <img src={`/office-themes/${id === "classic" ? "classic-office" : id === "future" ? "syncworks-future" : id === "modern" ? "modern-dark" : "clean-light"}-preview.webp`} alt="" loading="lazy" onError={e => { e.currentTarget.hidden = true; }} />}</span><strong>{label}</strong><small>{detail}</small>{settings.theme === id && <span className="sw-workspace-check">✓ Selected</span>}</button>)}</div>
    <label className="sw-workspace-option"><input type="checkbox" checked={settings.motion} onChange={e => update({motion:e.target.checked})}/> Subtle visual transitions</label>
    <label className="sw-workspace-option"><input type="checkbox" checked={settings.compact} onChange={e => update({compact:e.target.checked})}/> Compact dashboard spacing</label>
    <button type="button" className="sw-workspace-reset" onClick={() => update(DEFAULTS)}><RotateCcw size={15}/> Restore original appearance</button>
    <small>Preferences are saved on this device. Account-wide syncing can be added when a preferences API is available.</small>
  </div>;
}
export default function CustomerWorkspace({ settings, update, phoneMode = false, dayTradingEnabled = false }) {
  const nav = useNavigate();
  const { user } = useAuth();
  const forgeEnabled = String(user?.email || "").trim().toLowerCase() === "jacoblord7@outlook.com";
  const [panel, setPanel] = useState(null);
  const [closing, setClosing] = useState(false);
  useEffect(() => { const open = (event) => { if (["apps", "appearance", "daily", "personal", "business"].includes(event?.detail)) { setClosing(false); setPanel(event.detail); } }; window.addEventListener("sw:workspace-open", open); return () => window.removeEventListener("sw:workspace-open", open); }, []);
  useEffect(() => {
    if (!panel) return;
    const onKey = e => { if (e.key === "Escape") setPanel(null); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [panel]);
  useEffect(() => {
    if (!phoneMode) return;
    const query = new URLSearchParams(window.location.search);
    if (query.get("workspace") === "apps") {
      setClosing(false);
      setPanel("apps");
      window.history.replaceState(window.history.state, "", window.location.pathname);
    }
  }, [phoneMode]);
  const activeCategory = OFFICE_CATEGORIES.find((category) => category.id === panel);
  const apps = [
    ...(activeCategory ? activeCategory.items : APPS).filter(([name]) => dayTradingEnabled || name !== "Day Trade"),
    ...(dayTradingEnabled && (panel === "business" || panel === "apps") ? [["Freelance Work", "/customer/freelance/overview", BriefcaseBusiness]] : []),
    ...(forgeEnabled && (panel === "apps" || panel === "personal") ? [["The Forge", "/customer/forge", Flame]] : []),
  ];
  const close = () => { setClosing(true); window.setTimeout(() => { setPanel(null); setClosing(false); }, settings.motion ? 230 : 0); };
  const go = (path) => { setClosing(true); window.setTimeout(() => { setPanel(null); nav(path); }, settings.motion ? 200 : 0); };
  return <>
    <div className={`sw-workspace-switcher ${phoneMode ? "sw-workspace-switcher-mobile" : ""}`} role="group" aria-label="Workspace controls">
      <button type="button" onClick={() => {setClosing(false);setPanel("apps");}}><LayoutGrid size={16}/> <span>Workspaces</span></button>
      <button type="button" className={phoneMode ? "sw-workspace-settings-gear" : ""} aria-label={phoneMode ? "Page settings and appearance" : undefined} title={phoneMode ? "Page settings and appearance" : undefined} onClick={() => {setClosing(false);setPanel("appearance");}}>{phoneMode ? <Settings size={20}/> : <Palette size={16}/>} <span>{phoneMode ? "Settings" : "Appearance"}</span></button>
      <span className="sw-workspace-current">{settings.theme === "legacy" ? "Original" : settings.theme === "classic" ? "Classic Office" : settings.theme === "future" ? "SyncWorks Future" : settings.theme === "modern" ? "Modern Dark" : "Clean Light"}</span>
    </div>
    {panel && createPortal(<div className={`sw-workspace-overlay sw-workspace-overlay-themed ${closing ? "sw-workspace-overlay-closing" : ""}`} data-office-drawer-theme={settings.theme} data-office-drawer-motion={settings.motion} onMouseDown={close}>
      <aside className="sw-workspace-drawer sw-office-theme-drawer" role="dialog" aria-modal="true" aria-label={panel === "appearance" ? "Appearance settings" : "Workspace launcher"} onMouseDown={e => e.stopPropagation()}>
        <header><div><span className="sw-workspace-eyebrow">SYNCWORKS / PERSONAL</span><h2>{panel === "appearance" ? "Appearance settings" : (activeCategory?.name || "Your workspaces")}</h2></div><button type="button" className="sw-workspace-close" onClick={close} aria-label="Close"><X size={20}/></button></header>
        {panel !== "appearance" ? <><p className="sw-workspace-description">{activeCategory?.description || "Choose a category, then open the tool you need. Games keep their dedicated interface."}</p>{!activeCategory && <div className="sw-office-drawer-categories">{OFFICE_CATEGORIES.map(({id,name}) => <button type="button" key={id} onClick={() => setPanel(id)}>{name}</button>)}</div>}<div className="sw-workspace-app-grid">{apps.map(([name, path, Icon]) => <button type="button" key={name} onClick={() => go(path)}><Icon size={22}/><span>{name}</span></button>)}</div>{activeCategory && <button type="button" className="sw-workspace-reset" onClick={() => setPanel("apps")}>← All categories</button>}</> : <WorkspaceAppearancePanel settings={settings} update={update}/>}
      </aside>
    </div>, document.body)}
  </>;
}
