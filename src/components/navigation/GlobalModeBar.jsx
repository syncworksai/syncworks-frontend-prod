import React, { useMemo, useState } from "react";
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

export default function GlobalModeBar() {
  const { isAuthed, availableModes, mode, setMode, isPlatformAdmin } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const hidden = ["/login", "/register", "/employee/invite", "/accept-invite"].some((path) => location.pathname.startsWith(path));

  const modes = useMemo(() => Object.entries(MODE_ROUTES).filter(([key]) => availableModes?.[key]), [availableModes]);

  if (!isAuthed || hidden) return null;

  const chooseMode = (key) => {
    setMode(key);
    setOpen(false);
  };

  return (
    <div className="sticky top-0 z-[80] border-b border-cyan-400/15 bg-[#020617]/95 px-3 py-2 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1900px] items-center justify-between gap-3">
        <Link to="/customer" className="text-sm font-black tracking-[0.18em] text-white">SYNCWORKS</Link>

        <div className="hidden min-w-0 flex-1 items-center gap-2 overflow-x-auto lg:flex">
          {modes.map(([key, item]) => (
            <Link key={key} to={item.to} onClick={() => chooseMode(key)} className={`whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-black ${mode === key || location.pathname.startsWith(item.to) ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-200" : "border-slate-700 bg-slate-950/70 text-slate-300"}`}>
              {item.label}
            </Link>
          ))}
          {EXTRA_ROUTES.map((item) => <Link key={item.label} to={item.to} className="whitespace-nowrap rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs font-bold text-slate-300">{item.label}</Link>)}
          {isPlatformAdmin ? <Link to="/platform?tab=overview" className="whitespace-nowrap rounded-lg border border-fuchsia-400/30 bg-fuchsia-400/10 px-3 py-2 text-xs font-black text-fuchsia-200">Legacy Admin Dashboard</Link> : null}
        </div>

        <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-sm font-black text-cyan-200 lg:hidden">☰ Modules</button>
      </div>

      {open ? (
        <div className="mx-auto mt-2 grid max-w-[1900px] gap-2 rounded-xl border border-blue-500/20 bg-[#050b1c] p-3 sm:grid-cols-2 lg:hidden">
          {modes.map(([key, item]) => <Link key={key} to={item.to} onClick={() => chooseMode(key)} className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-bold text-slate-200">{item.label}</Link>)}
          {EXTRA_ROUTES.map((item) => <Link key={item.label} to={item.to} onClick={() => setOpen(false)} className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm font-bold text-slate-200">{item.label}</Link>)}
          {isPlatformAdmin ? <Link to="/platform?tab=overview" onClick={() => setOpen(false)} className="rounded-lg border border-fuchsia-400/30 bg-fuchsia-400/10 px-3 py-3 text-sm font-black text-fuchsia-200">Legacy Admin Dashboard</Link> : null}
        </div>
      ) : null}
    </div>
  );
}
