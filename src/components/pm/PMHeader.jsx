import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="M12 15.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M19.4 13.02c.05-.33.08-.67.08-1.02s-.03-.69-.08-1.02l2.02-1.57-1.91-3.31-2.39.96a7.6 7.6 0 0 0-1.77-1.02L14.33 1h-4.66L9.3 4.04c-.63.25-1.22.58-1.77 1.02l-2.39-.96-1.91 3.31 2.02 1.57c-.05.33-.08.67-.08 1.02s.03.69.08 1.02l-2.02 1.57 1.91 3.31 2.39-.96c.55.44 1.14.77 1.77 1.02L9.67 23h4.66l.36-3.04c.63-.25 1.22-.58 1.77-1.02l2.39.96 1.91-3.31-2.02-1.57Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
    </svg>
  );
}

function MenuIcon() {
  return <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
}

function HomeIcon() {
  return <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true"><path d="m3 11 9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
}

export function PMNavigationMenu({ compact = false }) {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    function close(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const items = [
    ["PM Home", "/pm"],
    ["Project Dashboard", "/pm/projects"],
    ["Portfolio Settings", "/pm/settings"],
    ["Create New Portfolio · $9.99/mo", "/pm/settings?new=1"],
    ["Create Tenant", "/pm/tenants"],
    ["Create Property", "/pm/properties/new"],
    ["Team", "/pm/employees"],
    ["Schedule", "/pm/calendar"],
  ];

  function go(path) {
    setOpen(false);
    nav(path);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/45 bg-[#07111f] text-cyan-50 shadow-[0_0_28px_rgba(34,211,238,0.24)]"
        aria-label="Open Property Management navigation"
        aria-expanded={open}
      >
        {compact ? <MenuIcon /> : <GearIcon />}
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[98] bg-black/70 md:hidden"
            aria-label="Close Property Management navigation"
            onClick={() => setOpen(false)}
          />
          <div className="fixed left-3 right-3 top-[5.4rem] z-[99] max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-[28px] border border-cyan-300/35 bg-[#06101d] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.75)] md:absolute md:left-auto md:right-0 md:top-12 md:w-80">
            <div className="mb-2 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Property Management</div>
            {items.map(([label, path], index) => (
              <button
                key={`${path}-${index}`}
                type="button"
                onClick={() => go(path)}
                className="flex min-h-12 w-full items-center rounded-2xl border border-transparent px-4 text-left text-sm font-semibold text-slate-100 transition hover:border-cyan-500/20 hover:bg-cyan-500/10"
              >
                {label}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function PMHeader({ title = "Property Management", subtitle = "", actions = null }) {
  const nav = useNavigate();

  return (
    <header className="sticky top-0 z-50 border-b border-cyan-500/20 bg-[#050914]/98 shadow-[0_12px_30px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <button type="button" onClick={() => nav("/pm")} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/25 bg-slate-950/90 shadow-[0_0_28px_rgba(34,211,238,0.14)]" aria-label="Open Property Management home">
          <img src="/brands/syncworks new logo.jpg" alt="SyncWorks" className="h-9 w-9 rounded-xl object-cover" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-black tracking-wide text-white">SyncWorks</span>
            <span className="rounded-full border border-fuchsia-500/35 bg-fuchsia-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-fuchsia-200 sm:px-3 sm:text-[10px]">Property Manager</span>
          </div>
          <div className="mt-1 truncate text-sm font-semibold text-cyan-100">{title}</div>
          {subtitle ? <div className="mt-0.5 hidden truncate text-[11px] text-slate-500 sm:block">{subtitle}</div> : null}
        </div>

        <button type="button" onClick={() => nav("/pm")} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-[#07111f] text-slate-100 md:hidden" aria-label="Go to Property Management home">
          <HomeIcon />
        </button>
        <button type="button" onClick={() => nav("/pm")} className="hidden h-11 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/90 px-4 text-xs font-bold text-slate-100 md:inline-flex">PM Home</button>
        <button type="button" onClick={() => nav("/pm/projects")} className="hidden h-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-4 text-xs font-bold text-cyan-100 lg:inline-flex">Projects</button>
        <div className="hidden md:block"><PMNavigationMenu /></div>
        {actions ? <div className="hidden items-center gap-2 xl:flex">{actions}</div> : null}
        <div className="md:hidden"><PMNavigationMenu compact /></div>
      </div>
    </header>
  );
}
