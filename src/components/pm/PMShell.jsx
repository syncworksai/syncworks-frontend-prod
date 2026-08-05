import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../api/client";
import PMPropertyPaperworkDock from "./PMPropertyPaperworkDock";

const navItems = [
  ["Dashboard", "/pm", "home"], ["Messages", "/pm/settings?view=messages", "messages"], ["Projects", "/pm/projects", "folder"], ["Properties", "/pm/properties", "building"], ["Leasing", "/pm/leasing", "leasing"], ["Tenants", "/pm/tenants", "users"], ["Payments", "/pm/payments", "money"], ["Work Orders", "/pm/work-orders", "wrench"], ["Schedule", "/pm/calendar", "calendar"], ["Team", "/pm/employees", "team"], ["Settings", "/pm/settings", "settings"],
];

const pageMeta = {
  "/pm/projects": ["Project Center", "Track progress, deadlines, budgets, vendors, blockers, and approvals."],
  "/pm/properties": ["Property Portfolio", "Manage properties, units, occupancy, leases, and records."],
  "/pm/properties/new": ["Add Property", "Create a property record inside the active portfolio."],
  "/pm/leasing": ["Leasing Pipeline", "Manage marketplace leads, applications, showings, Section 8 needs, available units, and onboarding."],
  "/pm/tenants": ["Tenant Center", "Manage tenant records, lease terms, onboarding, and communication."],
  "/pm/payments": ["Payments & Ledger", "Record charges, payments, credits, adjustments, balances, and historical tenant ledgers."],
  "/pm/work-orders": ["Work Orders", "Prioritize maintenance requests and operational follow-through."],
  "/pm/calendar": ["Property Schedule", "Coordinate projects, inspections, maintenance, showings, and portfolio events."],
  "/pm/employees": ["PM Team", "Manage employees, assignments, access, and responsibility."],
  "/pm/settings": ["Portfolio Settings", "Control portfolio identity, communication, and operating preferences."],
};

function Icon({ name }) {
  const paths = {
    home: <path d="m3 11 9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9Z" />,
    messages: <><path d="M4 5h16v12H8l-4 3V5Z" /><path d="M8 9h8M8 13h5" /></>,
    folder: <path d="M3 7h7l2 2h9v10H3V7Zm0 0V5h7l2 2" />,
    building: <path d="M5 21V4h10v17M9 8h2m-2 4h2m-2 4h2m6-7h3v12M3 21h19" />,
    users: <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2m6.5-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7.5 4a4 4 0 0 1 4 4v2m-4-18a4 4 0 0 1 0 8" />,
    leasing: <><path d="M4 21V7l8-4 8 4v14M8 11h8M8 15h8" /><path d="M10 21v-3h4v3" /></>,
    money: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 9h.01M17 15h.01M12 9v6m2-4.5c0-.8-.9-1.5-2-1.5s-2 .7-2 1.5.9 1.5 2 1.5 2 .7 2 1.5-.9 1.5-2 1.5-2-.7-2-1.5" /></>,
    wrench: <path d="M14.5 6.5a4 4 0 0 0-5-5L12 4l-3 3-2.5-2.5a4 4 0 0 0 5 5L20 18l-2 2-8.5-8.5" />,
    calendar: <path d="M4 5h16v16H4V5Zm0 5h16M8 3v4m8-4v4" />,
    team: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9v-2a7 7 0 0 1 14 0v2M4 10H2m20 0h-2" />,
    settings: <><path d="M12 15.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z" /><path d="m19 13 2 1-2 4-2-1.1A8 8 0 0 1 15 18l-.4 3h-5.2L9 18a8 8 0 0 1-2-1.1L5 18l-2-4 2-1a8 8 0 0 1 0-2L3 10l2-4 2 1.1A8 8 0 0 1 9 6l.4-3h5.2L15 6a8 8 0 0 1 2 1.1L19 6l2 4-2 1a8 8 0 0 1 0 2Z" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">{paths[name]}</svg>;
}

function activeFor(pathname, search, path) {
  if (path === "/pm") return pathname === "/pm";
  if (path.includes("view=messages")) return pathname === "/pm/settings" && new URLSearchParams(search).get("view") === "messages";
  if (path === "/pm/settings") return pathname === "/pm/settings" && new URLSearchParams(search).get("view") !== "messages";
  if (path === "/pm/properties") return pathname.startsWith("/pm/properties");
  return pathname === path || pathname.startsWith(`${path}/`);
}

export default function PMShell({ children }) {
  const nav = useNavigate();
  const location = useLocation();
  const pathname = location.pathname.replace(/\/+$/, "") || "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("Property Management");
  const isPropertyProfile = /^\/pm\/properties\/\d+$/.test(pathname);
  const isMessages = pathname === "/pm/settings" && new URLSearchParams(location.search).get("view") === "messages";

  useEffect(() => {
    let alive = true;
    api.get("/pm-hub/workspaces/current/").then((response) => { if (alive && response.data?.name) setWorkspaceName(response.data.name); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  useEffect(() => setMenuOpen(false), [pathname, location.search]);

  const [title, subtitle] = useMemo(() => {
    if (isMessages) return ["PM Messages", "Tenant, investor, maintenance, internal, collections, and tenant lifecycle records."];
    if (isPropertyProfile) return ["Property Command Center", "Property-scoped operations, tenants, ledger, maintenance, projects, documents, and reports."];
    return pageMeta[pathname] || ["Property Management", "Portfolio operations and command-center tools."];
  }, [pathname, isPropertyProfile, isMessages]);

  const Sidebar = () => <div className="flex h-full flex-col">
    <button type="button" onClick={() => nav("/pm")} className="flex items-center gap-3 border-b border-cyan-500/15 px-5 py-5 text-left"><img src="/brands/syncworks new logo.jpg" alt="SyncWorks" className="h-11 w-11 rounded-2xl border border-cyan-400/20 object-cover shadow-[0_0_28px_rgba(34,211,238,0.16)]" /><div><div className="font-black tracking-wide text-white">SyncWorks</div><div className="mt-1 text-[9px] font-black uppercase tracking-[0.22em] text-cyan-300">Property Manager</div></div></button>
    <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-5">{navItems.map(([label, path, icon]) => { const active = activeFor(pathname, location.search, path); return <button key={path} type="button" onClick={() => nav(path)} className={`flex min-h-12 w-full items-center gap-3 rounded-2xl border px-3.5 text-left text-sm font-semibold transition ${active ? "border-cyan-400/45 bg-gradient-to-r from-fuchsia-500/15 to-cyan-500/15 text-white shadow-[0_0_26px_rgba(34,211,238,0.12)]" : "border-transparent text-slate-400 hover:border-cyan-500/15 hover:bg-cyan-500/5 hover:text-cyan-100"}`}><span className={`flex h-8 w-8 items-center justify-center rounded-xl border ${active ? "border-cyan-300/35 bg-cyan-500/10 text-cyan-200" : "border-slate-700 text-slate-400"}`}><Icon name={icon} /></span>{label}</button>; })}</nav>
    <div className="m-3 rounded-2xl border border-fuchsia-500/20 bg-gradient-to-br from-cyan-500/5 to-fuchsia-500/10 p-4"><div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Current Portfolio</div><div className="mt-2 truncate text-sm font-bold text-white">{workspaceName}</div></div>
  </div>;

  return <div data-pm-command-shell className="min-h-screen bg-[#020611] text-slate-100">
    <style>{`.pm-command-content > div > header{display:none!important}.pm-command-content>div{min-height:auto!important;background:transparent!important}.pm-command-content main{max-width:none!important}`}</style>
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-[220px] border-r border-cyan-500/15 bg-[#040a15]/98 xl:block"><Sidebar /></aside>
    <header className="sticky top-0 z-40 border-b border-cyan-500/15 bg-[#040a15]/95 backdrop-blur-xl xl:ml-[220px]"><div className="flex min-h-[76px] items-center gap-3 px-4 sm:px-6">
      <button type="button" onClick={() => setMenuOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-500/25 bg-[#07111f] text-cyan-100 xl:hidden" aria-label="Open Property Management navigation"><svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></button>
      <div className="min-w-0 flex-1 xl:hidden"><div className="truncate text-sm font-black text-white">{title}</div><div className="mt-0.5 truncate text-[10px] text-cyan-300">{workspaceName}</div></div>
      <div className="hidden min-w-56 rounded-2xl border border-cyan-500/15 bg-[#07111f] px-4 py-3 xl:block"><div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Current Portfolio</div><div className="mt-1 truncate text-sm font-bold text-white">{workspaceName}</div></div>
      <div className="hidden flex-1 items-center gap-3 rounded-2xl border border-slate-700/70 bg-[#07111f]/85 px-4 py-3 text-sm text-slate-500 md:flex"><span className="text-cyan-300">⌕</span>Search properties, projects, tenants, prospects...</div>
      {!isPropertyProfile && !isMessages ? <><button type="button" onClick={() => nav("/pm/properties/new")} className="hidden min-h-11 rounded-2xl bg-cyan-400 px-5 text-sm font-black text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.18)] sm:inline-flex sm:items-center">+ Add Property</button><button type="button" onClick={() => nav("/pm/tenants")} className="hidden min-h-11 rounded-2xl border border-fuchsia-400/35 bg-fuchsia-500/15 px-5 text-sm font-black text-fuchsia-100 sm:inline-flex sm:items-center">+ Add Tenant</button></> : isPropertyProfile ? <button type="button" onClick={() => nav("/pm/properties")} className="hidden min-h-11 rounded-2xl border border-cyan-400/25 bg-cyan-500/10 px-5 text-sm font-black text-cyan-100 sm:inline-flex sm:items-center">← All Properties</button> : <button type="button" onClick={() => nav("/pm")} className="hidden min-h-11 rounded-2xl border border-cyan-400/25 bg-cyan-500/10 px-5 text-sm font-black text-cyan-100 sm:inline-flex sm:items-center">← Dashboard</button>}
    </div></header>
    {menuOpen ? <><button type="button" aria-label="Close navigation" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-[70] bg-black/75 xl:hidden" /><aside className="fixed inset-y-0 left-0 z-[80] w-[min(88vw,320px)] border-r border-cyan-400/25 bg-[#040a15] xl:hidden"><Sidebar /></aside></> : null}
    <div className="xl:ml-[220px]"><section className="border-b border-cyan-500/10 bg-gradient-to-r from-cyan-500/5 via-transparent to-fuchsia-500/5 px-4 py-5 sm:px-6"><div className="mx-auto max-w-[1500px]"><div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">Portfolio Operations</div><h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">{title}</h1><p className="mt-2 max-w-3xl text-sm text-slate-400">{subtitle}</p></div></section><div className="pm-command-content mx-auto max-w-[1500px] pb-[calc(8rem+env(safe-area-inset-bottom))]">{children}{isPropertyProfile ? <PMPropertyPaperworkDock /> : null}</div></div>
  </div>;
}
