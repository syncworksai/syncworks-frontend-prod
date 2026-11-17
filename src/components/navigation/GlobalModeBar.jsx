import "./GlobalModeBarMotion.css";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import NotificationsBell from "../NotificationsBell";
import api from "../../api/client";

const GOD_MODE_EMAIL = "jacoblord7@outlook.com";
const MODE_ROUTES = {
  CUSTOMER: { label: "Personal", to: "/customer" },
  SBO: { label: "Business", to: "/sbo" },
  EMPLOYEE: { label: "Employee", to: "/employee" },
  PM: { label: "Property Management", to: "/pm" },
  SALES: { label: "Projects", to: "/sales" },
  PLATFORM: { label: "God Mode", to: "/platform" },
};
const EXTRA_ROUTES = [
  { label: "Tenant", to: "/tenant" },
  { label: "Property Owner", to: "/investor/properties" },
  { label: "Inbox", to: "/inbox" },
  { label: "Calendar", to: "/calendar" },

  { label: "Settings", to: "/settings" },
];
const BAR_HEIGHT = 57;
const MOBILE_SAFE_TOP = 58;
const MOBILE_SHELL_TOP = BAR_HEIGHT + MOBILE_SAFE_TOP;

function BackIcon() {
  return <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true"><path d="M15 5 8 12l7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function parentRouteFor(pathname, mode) {
  const clean = String(pathname || "").replace(/\/+$/, "") || "/";
  const game = clean.match(/^\/connect\/groups\/([^/]+)\/sports\/games\/[^/]+$/);
  if (game) return `/connect/groups/${game[1]}/sports`;
  const sports = clean.match(/^\/connect\/groups\/([^/]+)\/sports$/);
  if (sports) return `/connect/groups/${sports[1]}`;
  if (/^\/connect\/groups\/[^/]+$/.test(clean) || /^\/connect\/events\/[^/]+$/.test(clean)) return "/connect";
  if (/^\/customer\/business-cards\/[^/]+$/.test(clean)) return "/customer/business-cards";
  if (clean.startsWith("/customer/")) return "/customer";
  if (clean.startsWith("/sbo/")) return "/sbo";
  if (/^\/pm\/properties\/[^/]+$/.test(clean)) return "/pm/properties";
  if (clean.startsWith("/pm/")) return "/pm";
  if (clean.startsWith("/employee/")) return "/employee";
  if (clean.startsWith("/tenant/")) return "/tenant";
  if (clean.startsWith("/investor/")) return "/investor";
  if (/^\/tickets\/[^/]+$/.test(clean)) return "/tickets";
  if (clean.startsWith("/connect/")) return "/connect";
  return MODE_ROUTES[mode]?.to || "/customer";
}

function MenuIcon({ open }) {
  return <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">{open ? <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /> : <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}</svg>;
}

export default function GlobalModeBar() {
  const { isAuthed, availableModes, mode, setMode, user, myBusinesses, activeBusinessId, setActiveBusinessId } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [menuSection, setMenuSection] = useState("dashboards");
  const [businessExpanded, setBusinessExpanded] = useState(false);
  const [menuTheme, setMenuTheme] = useState("legacy");
  const [menuMotion, setMenuMotion] = useState(true);
  useEffect(() => {
    const sync = () => { try { const prefs = JSON.parse(localStorage.getItem("sw_workspace_appearance_v1") || "{}"); setMenuMotion(prefs?.motion !== false); setMenuTheme(["legacy","future","classic","modern","light"].includes(prefs?.theme) ? prefs.theme : "legacy"); } catch { setMenuMotion(true); setMenuTheme("legacy"); } };
    sync();
    window.addEventListener("sw:workspace-appearance", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("sw:workspace-appearance", sync); window.removeEventListener("storage", sync); };
  }, []);
  const [pmWorkspace, setPmWorkspace] = useState(null);
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const businessWorkspaces = useMemo(() => {
    const seen = new Set();
    return (Array.isArray(myBusinesses) ? myBusinesses : []).map(member => {
      const business = member?.business && typeof member.business === "object" ? member.business : member;
      const id = business?.id ?? member?.business_id;
      const name = business?.name || business?.business_name || member?.business_name;
      if (!id || !name || seen.has(String(id))) return null;
      seen.add(String(id));
      return { id, name: String(name) };
    }).filter(Boolean);
  }, [myBusinesses]);
  useEffect(() => {
    if (!isAuthed) return;
    let live = true;
    api.get("/pm-hub/workspaces/current/").then(response => {
      const workspace = response?.data;
      if (live && workspace?.id && workspace?.name) setPmWorkspace(workspace);
    }).catch(() => { if (live) setPmWorkspace(null); });
    return () => { live = false; };
  }, [isAuthed, location.pathname]);
  const selectBusiness = (id) => {
    setActiveBusinessId?.(id);
    setMode("SBO");
    setOpen(false);
    navigate("/sbo");
  };
  const isGodMode = String(user?.email || "").trim().toLowerCase() === GOD_MODE_EMAIL;
  // Protected Social and Sports pages use this ONE header for navigation and notifications.
  const showConnectNotifications = location.pathname === "/connect" || location.pathname.startsWith("/connect/");
  const hidden = ["/login", "/register", "/employee/invite", "/accept-invite"].some((path) => location.pathname.startsWith(path));
  const modes = useMemo(() => Object.entries(MODE_ROUTES).filter(([key]) => availableModes?.[key] && (key !== "PLATFORM" || isGodMode)), [availableModes, isGodMode]);
  const topLevelRoutes = new Set(["/customer", "/sbo", "/employee", "/pm", "/tenant", "/investor", "/connect", "/calendar", "/inbox", "/settings", "/profile"]);
  const showBack = !topLevelRoutes.has(location.pathname.replace(/\/+$/, "") || "/") && !location.pathname.startsWith("/platform");
  const goBack = () => {
    setOpen(false);
    navigate(parentRouteFor(location.pathname, mode));
  };

  useEffect(() => setOpen(false), [location.pathname, location.search]);
  useEffect(() => { if (open) { setMenuSection("dashboards"); setBusinessExpanded(mode === "SBO"); } }, [open, mode]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = event => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  useEffect(() => {
    function close(event) { if (!rootRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setOpen(false); }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  useEffect(() => {
    if (!isAuthed || hidden) return undefined;
    const previous = document.body.style.paddingTop;
    const media = window.matchMedia("(max-width: 639px)");
    const apply = () => { document.body.style.paddingTop = `${media.matches ? MOBILE_SHELL_TOP : BAR_HEIGHT}px`; };
    apply();
    media.addEventListener?.("change", apply);
    return () => {
      media.removeEventListener?.("change", apply);
      document.body.style.paddingTop = previous;
    };
  }, [isAuthed, hidden]);

  if (!isAuthed || hidden || typeof document === "undefined") return null;
  const chooseMode = (key) => { setMode(key); setOpen(false); };
  const linkClass = (active = false) => `sw-global-menu-item${active ? " is-active" : ""}`;

  return createPortal(<>
    <style>{`[data-pm-command-shell] > header{top:${BAR_HEIGHT}px!important}[data-pm-command-shell] > aside{top:${BAR_HEIGHT}px!important}@media(max-width:639px){[data-pm-command-shell] > header{top:${MOBILE_SHELL_TOP}px!important}[data-pm-command-shell] > aside{top:${MOBILE_SHELL_TOP}px!important}}`}</style>
    <div ref={rootRef} data-syncworks-global-header="true" data-header-motion={menuMotion ? "on" : "off"} data-menu-theme={menuTheme} className="fixed inset-x-0 top-[58px] sm:top-0 z-[320] h-[57px] border-b border-cyan-400/15 bg-[#020617]/98 px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.38)] backdrop-blur-xl">
      <div className="mx-auto flex h-full max-w-[1900px] items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {showBack ? <button type="button" onClick={goBack} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[.035] text-slate-300 transition hover:border-cyan-400/30 hover:text-cyan-100" aria-label="Back to previous SyncWorks section"><BackIcon /></button> : null}
          <Link to="/customer" className="flex min-w-0 items-center gap-3" aria-label="Open SyncWorks home"><img src="/brands/syncworks new logo.jpg" alt="SyncWorks" className="h-10 w-10 rounded-xl border border-cyan-400/20 object-cover shadow-[0_0_22px_rgba(34,211,238,0.16)]" /><span className="truncate text-sm font-black tracking-[0.18em] text-white">SYNCWORKS</span></Link>
        </div>
        <div className="flex shrink-0 items-center gap-2">{showConnectNotifications ? <NotificationsBell inline /> : null}<button type="button" onClick={() => setOpen((value) => !value)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 text-sm font-black text-cyan-100" aria-label="Open SyncWorks app navigation" aria-expanded={open}><MenuIcon open={open} /><span>Menu</span></button></div>
      </div>
    </div>
    {open ? <div ref={menuRef} className="sw-global-menu-layer" data-menu-theme={menuTheme} data-header-motion={menuMotion ? "on" : "off"}>
        <button type="button" className="sw-global-menu-shade fixed inset-x-0 bottom-0 top-[115px] sm:top-[57px] z-[321] bg-black/70" aria-label="Close app navigation" onClick={() => setOpen(false)} />
        <section role="dialog" aria-modal="true" aria-label="SyncWorks dashboards and navigation" className="sw-global-menu-drawer fixed left-3 right-3 top-[123px] sm:top-[65px] z-[322]">
          <header className="sw-global-menu-head">
            <div><div className="sw-global-menu-eyebrow">SYNCWORKS · COMMAND NAVIGATION</div><h2>My workspaces</h2><p>Switch dashboards without leaving your office.</p></div>
            <button type="button" className="sw-global-menu-close" onClick={() => setOpen(false)} aria-label="Close workspace navigation">✕</button>
          </header>
          <div className="sw-global-menu-tabs" role="tablist" aria-label="Navigation groups">
            <button type="button" role="tab" aria-selected={menuSection === "dashboards"} className={menuSection === "dashboards" ? "is-active" : ""} onClick={() => setMenuSection("dashboards")}>Dashboards</button>
            <button type="button" role="tab" aria-selected={menuSection === "shortcuts"} className={menuSection === "shortcuts" ? "is-active" : ""} onClick={() => setMenuSection("shortcuts")}>Quick links</button>
          </div>
          <div className="sw-global-menu-panel" role="tabpanel">
          {menuSection === "dashboards" ? <>
            <Link to="/customer" onClick={() => chooseMode("CUSTOMER")} className={linkClass(mode === "CUSTOMER")}><span className="sw-global-menu-symbol">⌂</span><span className="sw-global-menu-text"><strong>Personal</strong><small>Home and daily life</small></span>{mode === "CUSTOMER" ? <em>Current</em> : <span className="sw-global-menu-chevron">›</span>}</Link>
            {businessWorkspaces.length > 0 && <div className="sw-global-menu-group">
              <button type="button" className="sw-global-menu-group-toggle" onClick={() => setBusinessExpanded(value => !value)} aria-expanded={businessExpanded}><span className="sw-global-menu-symbol">▦</span><span className="sw-global-menu-text"><strong>Businesses</strong><small>{businessWorkspaces.length} connected workspace{businessWorkspaces.length === 1 ? "" : "s"}</small></span><span className="sw-global-menu-chevron">{businessExpanded ? "⌃" : "⌄"}</span></button>
              {businessExpanded && <div className="sw-global-menu-businesses">{businessWorkspaces.map(item => <button type="button" key={`business-${item.id}`} onClick={() => selectBusiness(item.id)} className={linkClass(mode === "SBO" && String(activeBusinessId) === String(item.id))}><span className="sw-global-menu-symbol">▣</span><span className="sw-global-menu-text"><strong>{item.name}</strong><small>Business workspace</small></span><span className="sw-global-menu-chevron">›</span></button>)}</div>}
            </div>}
            {pmWorkspace ? <Link to="/pm" onClick={() => chooseMode("PM")} className={linkClass(mode === "PM")}><span className="sw-global-menu-symbol">⌂</span><span className="sw-global-menu-text"><strong>{pmWorkspace.name}</strong><small>Property Management</small></span><span className="sw-global-menu-chevron">›</span></Link> : null}
            {modes.filter(([key]) => !["CUSTOMER","SBO","PM"].includes(key)).map(([key,item]) => <Link key={key} to={item.to} onClick={() => chooseMode(key)} className={linkClass(mode === key)}><span className="sw-global-menu-symbol">◈</span><span className="sw-global-menu-text"><strong>{item.label}</strong><small>Open dashboard</small></span><span className="sw-global-menu-chevron">›</span></Link>)}
          </> : <>
            {EXTRA_ROUTES.map(item => {const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);return <Link key={item.label} to={item.to} onClick={() => setOpen(false)} className={linkClass(active)}><span className="sw-global-menu-symbol">◇</span><span className="sw-global-menu-text"><strong>{item.label}</strong><small>Open workspace</small></span><span className="sw-global-menu-chevron">›</span></Link>;})}
            <Link to="/onboarding/business" onClick={() => setOpen(false)} className={linkClass(false)}><span className="sw-global-menu-symbol">＋</span><span className="sw-global-menu-text"><strong>Add a Business</strong><small>Connect another workspace</small></span></Link>
            <Link to="/onboarding/property-management" onClick={() => setOpen(false)} className={linkClass(false)}><span className="sw-global-menu-symbol">＋</span><span className="sw-global-menu-text"><strong>Add a PM Company</strong><small>Set up property management</small></span></Link>
            {isGodMode ? <Link to="/platform?tab=overview" onClick={() => setOpen(false)} className={linkClass(false)}><span className="sw-global-menu-symbol">◇</span><span className="sw-global-menu-text"><strong>Legacy Admin Dashboard</strong><small>Platform tools</small></span></Link> : null}
          </>}
          </div>
          <footer className="sw-global-menu-foot"><span className="sw-global-menu-live-dot" />{menuTheme === "classic" ? "Classic Office" : menuTheme === "future" ? "SyncWorks Future" : menuTheme === "modern" ? "Modern Dark" : menuTheme === "light" ? "Clean Light" : "SyncWorks Original"} <span>·</span> Theme synced</footer>
        </section>
    </div> : null}
  </>, document.body);
}
