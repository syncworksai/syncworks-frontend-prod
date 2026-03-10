// src/components/TopNav.jsx
import React, { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import RoleBadge from "./RoleBadge";
import NotificationsBell from "./NotificationsBell";
import BusinessPicker from "./BusinessPicker";

const BRAND = {
  logo: "/brands/syncworks-logo.jpg",
  finance: "/brands/finance.jpg",
  health: "/brands/health.jpg",
};

// Active tab matcher (covers nested routes like /customer/finance/*)
function isActivePath(currentPath, to) {
  if (!to) return false;
  if (to === "/") return currentPath === "/";
  return currentPath === to || currentPath.startsWith(to + "/");
}

// Build class helpers
function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

/**
 * IconLink with:
 * - Hover ripple
 * - Gradient hover
 * - Active tab gradient logic
 */
function IconLink({ to, img, label, accent = "cyan", active = false }) {
  const accentMap = {
    cyan: {
      hover: "hover:bg-gradient-to-r hover:from-cyan-500/10 hover:to-blue-500/10 hover:shadow-[0_0_30px_rgba(34,211,238,0.25)]",
      ring: "from-cyan-500/40 via-blue-500/40 to-fuchsia-500/25",
      active:
        "border-transparent bg-gradient-to-r from-cyan-500/12 via-blue-500/10 to-fuchsia-500/8 shadow-[0_0_35px_rgba(34,211,238,0.22)]",
    },
    fuchsia: {
      hover: "hover:bg-gradient-to-r hover:from-fuchsia-500/10 hover:to-pink-500/10 hover:shadow-[0_0_30px_rgba(217,70,239,0.25)]",
      ring: "from-fuchsia-500/40 via-pink-500/40 to-purple-500/25",
      active:
        "border-transparent bg-gradient-to-r from-fuchsia-500/12 via-pink-500/10 to-purple-500/8 shadow-[0_0_35px_rgba(217,70,239,0.20)]",
    },
    indigo: {
      hover: "hover:bg-gradient-to-r hover:from-indigo-500/10 hover:to-blue-500/10 hover:shadow-[0_0_30px_rgba(99,102,241,0.25)]",
      ring: "from-indigo-500/40 via-blue-500/40 to-cyan-500/25",
      active:
        "border-transparent bg-gradient-to-r from-indigo-500/12 via-blue-500/10 to-cyan-500/8 shadow-[0_0_35px_rgba(99,102,241,0.20)]",
    },
  };

  const cfg = accentMap[accent] || accentMap.cyan;

  return (
    <Link
      to={to}
      className={cx(
        // Base
        "group relative flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2 transition duration-300 overflow-hidden",
        // Hover gradient/shadow
        cfg.hover,
        // Active tab state
        active ? cfg.active : "hover:border-transparent"
      )}
      title={label}
    >
      {/* Hover ripple */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-300"
      >
        <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-sm animate-[ripple_900ms_ease-out_infinite]" />
      </span>

      {/* Icon */}
      <div className="h-9 w-9 rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shrink-0 relative">
        {/* tiny gradient shine */}
        <div
          className={cx(
            "pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-300",
            "bg-gradient-to-br",
            cfg.ring
          )}
          style={{ mixBlendMode: "screen" }}
        />
        <img src={img} alt="" className="h-full w-full object-cover relative" />
      </div>

      <div className="hidden md:block text-xs font-semibold text-slate-200">{label}</div>

      {/* Active pill underline */}
      {active ? (
        <span
          aria-hidden="true"
          className={cx(
            "absolute -bottom-[2px] left-3 right-3 h-[2px] rounded-full",
            "bg-gradient-to-r",
            cfg.ring,
            "opacity-80"
          )}
        />
      ) : null}
    </Link>
  );
}

export default function TopNav() {
  const nav = useNavigate();
  const loc = useLocation();
  const { user, logout, isGod } = useAuth();

  const role = (user?.role || "").toUpperCase();
  const showBusinessPicker = isGod || ["SBO", "EMPLOYEE", "PM", "PROPERTY_MANAGER"].includes(role);

  // ✅ This TopNav will appear on every page ONLY if you render it in your layout/root shell (AppLayout).
  // Most SyncWorks setups do this already (TopNav + Outlet). If you only render it on some pages, it won’t show everywhere.

  // Active tab checks
  const activeFinance = isActivePath(loc.pathname, "/customer/finance");
  const activeHealth = isActivePath(loc.pathname, "/customer/health");
  const activeSettings = isActivePath(loc.pathname, "/customer/settings");

  // Inject keyframes once (no Tailwind config changes needed)
  useEffect(() => {
    const id = "syncworks-topnav-anim-css";
    if (document.getElementById(id)) return;

    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      @keyframes gradientShift {
        0% { transform: translateX(-20%); opacity: .35; }
        50% { transform: translateX(20%); opacity: .55; }
        100% { transform: translateX(-20%); opacity: .35; }
      }
      @keyframes ripple {
        0% { transform: translate(-50%,-50%) scale(1); opacity: .22; }
        100% { transform: translate(-50%,-50%) scale(28); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <header className="border-b border-slate-800 bg-slate-950/60 relative overflow-hidden">
      {/* 🔁 Animated gradient pulse wash */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -inset-10 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-fuchsia-500/10 blur-2xl"
          style={{ animation: "gradientShift 6s ease-in-out infinite" }}
        />
        <div className="absolute inset-0 bg-slate-950/55" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* LEFT: Brand */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => nav("/")}
            className="flex items-center gap-3 text-left group"
            title="Home"
          >
            {/* Bigger logo + gradient glow */}
            <div className="relative">
              <div
                className="pointer-events-none absolute -inset-4 rounded-full
                  bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-fuchsia-500/20
                  blur-2xl opacity-0 group-hover:opacity-100 transition duration-500"
              />

              {/* gradient border ring */}
              <div className="h-10 w-10 rounded-2xl p-[1px] bg-gradient-to-br from-cyan-500/40 via-blue-500/40 to-fuchsia-500/40">
                <div className="h-full w-full rounded-2xl bg-slate-950 overflow-hidden">
                  <img src={BRAND.logo} alt="SyncWorks" className="h-full w-full object-cover" />
                </div>
              </div>
            </div>

            <div className="min-w-0">
              {/* gradient brand text */}
              <div className="font-extrabold tracking-wide truncate leading-tight bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500 bg-clip-text text-transparent">
                SyncWorks
              </div>
              <div className="text-[11px] text-slate-400 -mt-0.5 truncate">
                Automation-first ops for real life + business
              </div>
            </div>
          </button>

          <RoleBadge user={user} />
        </div>

        {/* CENTER: quick modules */}
        <div className="hidden lg:flex items-center gap-2">
          <IconLink
            to="/customer/finance"
            img={BRAND.finance}
            label="Finance"
            accent="cyan"
            active={activeFinance}
          />
          <IconLink
            to="/customer/health"
            img={BRAND.health}
            label="Health"
            accent="fuchsia"
            active={activeHealth}
          />

          {/* Settings button with active logic + hover ripple */}
          <Link
            to="/customer/settings"
            className={cx(
              "group relative text-xs rounded-2xl px-3 py-2 border transition duration-300 overflow-hidden",
              activeSettings
                ? "border-transparent bg-gradient-to-r from-indigo-500/12 via-blue-500/10 to-cyan-500/8 shadow-[0_0_35px_rgba(99,102,241,0.20)]"
                : "border-slate-800 bg-slate-950/60 hover:border-transparent hover:bg-gradient-to-r hover:from-indigo-500/10 hover:to-blue-500/10 hover:shadow-[0_0_30px_rgba(99,102,241,0.20)]"
            )}
          >
            {/* 🌊 Hover ripple */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-300"
            >
              <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-sm animate-[ripple_900ms_ease-out_infinite]" />
            </span>
            <span className="relative">Settings / Billing</span>

            {/* Active underline */}
            {activeSettings ? (
              <span
                aria-hidden="true"
                className="absolute -bottom-[2px] left-3 right-3 h-[2px] rounded-full bg-gradient-to-r from-indigo-500/40 via-blue-500/40 to-cyan-500/25 opacity-80"
              />
            ) : null}
          </Link>
        </div>

        {/* RIGHT: tools */}
        <div className="flex items-center gap-3">
          {showBusinessPicker ? <BusinessPicker /> : null}

          {/* Small screens: quick icons only */}
          <div className="flex lg:hidden items-center gap-2">
            <Link
              to="/customer/finance"
              className={cx(
                "group relative h-10 w-10 rounded-2xl border bg-slate-950/60 overflow-hidden transition duration-300",
                activeFinance
                  ? "border-transparent bg-gradient-to-r from-cyan-500/12 via-blue-500/10 to-fuchsia-500/8 shadow-[0_0_30px_rgba(34,211,238,0.18)]"
                  : "border-slate-800 hover:border-transparent hover:bg-gradient-to-r hover:from-cyan-500/10 hover:to-blue-500/10 hover:shadow-[0_0_25px_rgba(34,211,238,0.20)]"
              )}
              title="Finance"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-300"
              >
                <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-sm animate-[ripple_900ms_ease-out_infinite]" />
              </span>
              <img src={BRAND.finance} alt="" className="h-full w-full object-cover relative" />
            </Link>

            <Link
              to="/customer/health"
              className={cx(
                "group relative h-10 w-10 rounded-2xl border bg-slate-950/60 overflow-hidden transition duration-300",
                activeHealth
                  ? "border-transparent bg-gradient-to-r from-fuchsia-500/12 via-pink-500/10 to-purple-500/8 shadow-[0_0_30px_rgba(217,70,239,0.16)]"
                  : "border-slate-800 hover:border-transparent hover:bg-gradient-to-r hover:from-fuchsia-500/10 hover:to-pink-500/10 hover:shadow-[0_0_25px_rgba(217,70,239,0.20)]"
              )}
              title="Health"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-300"
              >
                <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-sm animate-[ripple_900ms_ease-out_infinite]" />
              </span>
              <img src={BRAND.health} alt="" className="h-full w-full object-cover relative" />
            </Link>

            <Link
              to="/customer/settings"
              className={cx(
                "group relative text-xs rounded-2xl px-3 py-2 border bg-slate-950/60 transition duration-300 overflow-hidden",
                activeSettings
                  ? "border-transparent bg-gradient-to-r from-indigo-500/12 via-blue-500/10 to-cyan-500/8 shadow-[0_0_25px_rgba(99,102,241,0.18)]"
                  : "border-slate-800 hover:border-transparent hover:bg-gradient-to-r hover:from-indigo-500/10 hover:to-blue-500/10 hover:shadow-[0_0_25px_rgba(99,102,241,0.18)]"
              )}
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-300"
              >
                <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-sm animate-[ripple_900ms_ease-out_infinite]" />
              </span>
              <span className="relative">Settings</span>
            </Link>
          </div>

          <NotificationsBell />

          <button onClick={logout} className="text-sm text-slate-400 hover:text-white transition">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
