import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

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
  { label: "Investor", to: "/investor" },
  { label: "Inbox", to: "/inbox" },
  { label: "Calendar", to: "/calendar" },
  { label: "Settings", to: "/settings" },
];

function MenuIcon({ open }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      {open ? <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /> : <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}
    </svg>
  );
}

export default function GlobalModeBar() {
  const { isAuthed, availableModes, mode, setMode, isPlatformAdmin } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const hidden = ["/login", "/register", "/employee/invite", "/accept-invite"].some((path) => location.pathname.startsWith(path));
  const modes = useMemo(() => Object.entries(MODE_ROUTES).filter(([key]) => availableModes?.[key]), [availableModes]);

  useEffect(() => setOpen(false), [location.pathname, location.search]);
  useEffect(() => {
    function close(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  if (!isAuthed || hidden) return null;

  const chooseMode = (key) => {
    setMode(key);
    setOpen(false);
  };

  const linkClass = (active = false) => [
    "flex min-h-12 items-center justify-between rounded-2xl border px-4 text-left text-sm font-bold transition",
    active ? "border-cyan-400/45 bg-cyan-400/12 text-cyan-100" : "border-slate-800 bg-slate-950/70 text-slate-200 hover:border-cyan-500/25 hover:bg-cyan-500/8",
  ].join(" ");

  return (
    <div ref={rootRef} className="sticky top-0 z-[120] border-b border-cyan-400/15 bg-[#020617]/98 px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.38)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1900px] items-center justify-between gap-3">
        <Link to="/customer" className="flex min-w-0 items-center gap-3" aria-label="Open SyncWorks home">
          <img src="/brands/syncworks new logo.jpg" alt="SyncWorks" className="h-10 w-10 rounded-xl border border-cyan-400/20 object-cover shadow-[0_0_22px_rgba(34,211,238,0.16)]" />
          <span className="text-sm font-black tracking-[0.18em] text-white">SYNCWORKS</span>
        </Link>

        <button type="button" onClick={() => setOpen((value) => !value)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 text-sm font-black text-cyan-100" aria-label="Open SyncWorks app navigation" aria-expanded={open}>
          <MenuIcon open={open} />
          <span>Menu</span>
        </button>
      </div>

      {open ? (
        <>
          <button type="button" className="fixed inset-0 top-[57px] z-[121] bg-black/70" aria-label="Close app navigation" onClick={() => setOpen(false)} />
          <div className="fixed left-3 right-3 top-[65px] z-[122] max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-[28px] border border-cyan-400/25 bg-[#050b16] p-4 shadow-[0_28px_90px_rgba(0,0,0,0.78)] sm:left-auto sm:w-[420px]">
            <div className="mb-3 flex items-center justify-between px-1">
              <div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">SyncWorks</div><div className="mt-1 text-sm font-bold text-white">App navigation</div></div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300">Close</button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {modes.map(([key, item]) => {
                const active = mode === key || location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
                return <Link key={key} to={item.to} onClick={() => chooseMode(key)} className={linkClass(active)}><span>{item.label}</span>{active ? <span className="text-[10px] uppercase tracking-[0.14em] text-cyan-300">Current</span> : null}</Link>;
              })}
            </div>
            <div className="my-4 border-t border-slate-800" />
            <div className="grid gap-2 sm:grid-cols-2">
              {EXTRA_ROUTES.map((item) => {
                const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
                return <Link key={item.label} to={item.to} onClick={() => setOpen(false)} className={linkClass(active)}>{item.label}</Link>;
              })}
              {isPlatformAdmin ? <Link to="/platform?tab=overview" onClick={() => setOpen(false)} className="flex min-h-12 items-center rounded-2xl border border-fuchsia-400/30 bg-fuchsia-400/10 px-4 text-sm font-black text-fuchsia-100">Legacy Admin Dashboard</Link> : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
