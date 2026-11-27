import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { Palette, LayoutGrid, X, CalendarDays, ListTodo, Inbox, BriefcaseBusiness, Building2, Wallet, QrCode, ContactRound, Heart, Flame, TrendingUp, Spade, ShoppingBag, Users, CloudSun, MapPinned, Settings, RotateCcw } from "lucide-react";
import { MobileNavSettings } from "../navigation/RoleAwareMobileNav";
import OfficeExecutiveSnapshot from "./OfficeExecutiveSnapshot";
import "./CustomerWorkspace.css";
import "./OfficeThemeIntegrationV16.css";
import "./OfficeDrawersV21.css";
import "./MobileWorkspaceMotion.css";
import "./CustomerAppsPaged.css";

export const WORKSPACE_THEMES = ["legacy", "classic", "future", "modern", "light"];
const SETTINGS_KEY = "sw_workspace_appearance_v1";
const DEFAULTS = { theme: "legacy", motion: true, compact: false };
export const OFFICE_CATEGORIES = [
  {id:"daily",name:"Daily",description:"Your agenda, tasks, messages and requests",items:[["Calendar","/calendar",CalendarDays],["Tasks","/customer/tasks",ListTodo],["Inbox","/customer/inbox",Inbox],["New service request","/customer/new-request",LayoutGrid]]},
  {id:"personal",name:"Personal",description:"Money, wellbeing and your connections",items:[["Finance","/customer/finance",Wallet],["Messages","/customer/inbox",Inbox],["Health","/customer/health",Heart],["Connections","/settings?tab=CONNECTIONS",Settings],["Rolodex","/customer/rolodex",ContactRound],["My QR","/customer/my-qr",QrCode]]},
  {id:"business",name:"Business",description:"Work, properties and service operations",items:[["Business","/sbo",BriefcaseBusiness],["Property","/pm",Building2],["Services","/customer/marketplace",LayoutGrid]]},
  {id:"apps",name:"Apps",description:"Games, local discovery, weather and tools",items:[["Projects","/customer/projects",BriefcaseBusiness],["Games","/customer/games",Spade],["Social","/connect",Users],["Rolodex","/customer/rolodex",ContactRound],["My QR","/customer/my-qr",QrCode],["Shop Assist","/customer/store",ShoppingBag],["Weather","/customer/weather",CloudSun],["Traffic","/customer/traffic",MapPinned],["Local","/customer/discover",MapPinned],["Day Trade","/customer/day-trading-futures",TrendingUp]]},
];
const APPS = [
  ["Calendar", "/calendar", CalendarDays], ["Tasks", "/customer/tasks", ListTodo],
  ["Messages", "/customer/inbox", Inbox], ["Rolodex", "/customer/rolodex", ContactRound], ["My QR", "/customer/my-qr", QrCode], ["Business", "/sbo", BriefcaseBusiness],
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
    <label className="sw-workspace-option"><input type="checkbox" checked={settings.motion} onChange={e => update({motion:e.target.checked})}/> Immersive page transitions</label>
    <label className="sw-workspace-option"><input type="checkbox" checked={settings.compact} onChange={e => update({compact:e.target.checked})}/> Compact dashboard spacing</label>
    <button type="button" className="sw-workspace-reset" onClick={() => update(DEFAULTS)}><RotateCcw size={15}/> Restore original appearance</button>
    <small>Preferences are saved on this device. Account-wide syncing can be added when a preferences API is available.</small>
  </div>;
}
export default function CustomerWorkspace({ settings, update, phoneMode = false, dayTradingEnabled = false }) {
  const nav = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const forgeEnabled = String(user?.email || "").trim().toLowerCase() === "jacoblord7@outlook.com";
  const privateExecutivePilot = forgeEnabled;
  const [panel, setPanel] = useState(null);
  const [closing, setClosing] = useState(false);
  const [appsPage, setAppsPage] = useState(0);
  const [narrowApps, setNarrowApps] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches);
  useEffect(() => {
    const media=window.matchMedia("(max-width: 767px)");
    const update=()=>setNarrowApps(media.matches);
    update();
    media.addEventListener?.("change",update);
    return()=>media.removeEventListener?.("change",update);
  }, []);
  useEffect(()=>setAppsPage(0),[panel,narrowApps]);
  useEffect(() => { const open = (event) => { if (["office", "apps", "appearance", "daily", "personal", "business"].includes(event?.detail)) { setClosing(false); setPanel(event.detail); } }; window.addEventListener("sw:workspace-open", open); return () => window.removeEventListener("sw:workspace-open", open); }, []);
  useEffect(() => {
    if (!panel) return;
    const onKey = e => { if (e.key === "Escape") setPanel(null); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [panel]);
  useEffect(() => {
    if (!phoneMode) return;
    const query = new URLSearchParams(location.search);
    const target = query.get("workspace");
    if (["office", "apps", "appearance", "daily", "personal", "business"].includes(target)) {
      setClosing(false);
      setPanel(target);
      nav(location.pathname, { replace: true });
    }
  }, [phoneMode, location.pathname, location.search, nav]);
  const activeCategory = OFFICE_CATEGORIES.find((category) => category.id === panel);
  const apps = [
    ...(activeCategory ? activeCategory.items : APPS).filter(([name]) => dayTradingEnabled || name !== "Day Trade"),
    ...(dayTradingEnabled && (panel === "business" || panel === "apps") ? [["Freelance Work", "/customer/freelance/overview", BriefcaseBusiness]] : []),
    ...(forgeEnabled && (panel === "apps" || panel === "personal") ? [["The Forge", "/customer/forge", Flame],["Secure Wallet (Pilot)", "/customer/secure-wallet", Wallet],["Market Intelligence", "/customer/market-intelligence", TrendingUp]] : []),
  ];
  const appsPerPage=narrowApps?6:9;
  const appsPages=Math.max(1,Math.ceil(apps.length/appsPerPage));
  const currentAppsPage=Math.min(appsPage,appsPages-1);
  const visibleApps=panel==="apps"?apps.slice(currentAppsPage*appsPerPage,(currentAppsPage+1)*appsPerPage):apps;
  const motionActive = settings.motion && !(typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const close = () => { setClosing(true); window.setTimeout(() => { setPanel(null); setClosing(false); }, motionActive ? 360 : 0); };
  const go = (path) => { setClosing(true); window.setTimeout(() => { setPanel(null); nav(path); }, motionActive ? 300 : 0); };
  return <>
    {!phoneMode && <div className="sw-workspace-switcher" role="group" aria-label="Workspace controls">
      <button type="button" onClick={() => {setClosing(false);setPanel("apps");}}><LayoutGrid size={16}/> <span>Workspaces</span></button>
      <button type="button" onClick={() => {setClosing(false);setPanel("appearance");}}><Palette size={16}/> <span>Appearance</span></button>
      <span className="sw-workspace-current">{settings.theme === "legacy" ? "Original" : settings.theme === "classic" ? "Classic Office" : settings.theme === "future" ? "SyncWorks Future" : settings.theme === "modern" ? "Modern Dark" : "Clean Light"}</span>
    </div>}
    {panel && createPortal(<div className={`sw-workspace-overlay sw-workspace-overlay-themed ${closing ? "sw-workspace-overlay-closing" : ""}`} data-office-drawer-theme={settings.theme} data-office-drawer-motion={settings.motion} data-workspace-transition={panel === "office" || ["daily","personal","business"].includes(panel) ? "hologram" : panel === "appearance" ? "side" : "bottom"} data-motion-layout={phoneMode ? "phone" : "desktop"} data-workspace-panel={panel} onMouseDown={close}>
      <aside className="sw-workspace-drawer sw-office-theme-drawer" role="dialog" aria-modal="true" aria-label={panel === "appearance" ? "Appearance settings" : "Workspace launcher"} onMouseDown={e => e.stopPropagation()}>{phoneMode && panel === "apps" && <span className="sw-mobile-drawer-grip" aria-hidden="true" />}
        <header><div><span className="sw-workspace-eyebrow">SYNCWORKS / PERSONAL</span><h2>{panel === "appearance" ? "Appearance settings" : (activeCategory?.name || (panel === "office" ? "Your office" : "Your apps"))}</h2></div><button type="button" className="sw-workspace-close" onClick={close} aria-label="Close"><X size={20}/></button></header>
        {panel !== "appearance" ? <>{panel === "office" && privateExecutivePilot && <OfficeExecutiveSnapshot onOpen={() => go("/private?tab=ceo")} />}<p className="sw-workspace-description">{activeCategory?.description || "Choose a category, then open the tool you need. Games keep their dedicated interface."}</p>{panel === "office" && <div className="sw-office-drawer-categories">{OFFICE_CATEGORIES.map(({id,name}) => <button type="button" key={id} onClick={() => setPanel(id)}>{name}</button>)}</div>}{panel !== "office" && <div className={panel==="apps"?"sw-workspace-app-pages":""}>
          <div className="sw-workspace-app-grid">{visibleApps.map(([name, path, Icon]) => <button type="button" key={name} onClick={() => go(path)}><Icon size={22}/><span>{name}</span></button>)}</div>
          {panel==="apps" && <nav className="sw-workspace-app-pagination" aria-label="Apps pages">
            <button type="button" disabled={currentAppsPage===0} onClick={()=>setAppsPage(p=>Math.max(0,p-1))}>← Previous</button>
            <span aria-live="polite">Page {currentAppsPage+1} of {appsPages}</span>
            <button type="button" disabled={currentAppsPage>=appsPages-1} onClick={()=>setAppsPage(p=>Math.min(appsPages-1,p+1))}>Next →</button>
          </nav>}
        </div>}{activeCategory && <button type="button" className="sw-workspace-reset" onClick={() => setPanel("office")}>← All categories</button>}</> : <><WorkspaceAppearancePanel settings={settings} update={update}/>{phoneMode && <MobileNavSettings />}</>}
      </aside>
    </div>, document.body)}
  </>;
}
