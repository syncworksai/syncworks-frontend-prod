import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import NotificationsBell from "./NotificationsBell";
import BusinessPicker from "./BusinessPicker";
import api, { getActiveBusinessId } from "../api/client";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function Pill({ children, className = "" }) {
  return <span className={"text-[11px] px-2 py-1 rounded-full border " + className}>{children}</span>;
}

function SectionLabel({ children }) {
  return <div className="hidden lg:block text-[10px] uppercase tracking-widest text-slate-500 mb-1">{children}</div>;
}

function ModuleBadge({ children, tone = "cyan" }) {
  const tones = {
    cyan: "border-cyan-500/35 bg-cyan-500/12 text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.14)]",
    indigo: "border-indigo-500/35 bg-indigo-500/12 text-indigo-200 shadow-[0_0_20px_rgba(99,102,241,0.14)]",
    fuchsia: "border-fuchsia-500/35 bg-fuchsia-500/12 text-fuchsia-200 shadow-[0_0_20px_rgba(217,70,239,0.14)]",
    emerald: "border-emerald-500/35 bg-emerald-500/12 text-emerald-200 shadow-[0_0_20px_rgba(52,211,153,0.14)]",
    slate: "border-slate-700 bg-slate-900/60 text-slate-200",
  };

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-extrabold tracking-[0.18em] uppercase whitespace-nowrap",
        tones[tone] || tones.cyan
      )}
    >
      {children}
    </span>
  );
}

function GearIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 15.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M19.4 13.02c.05-.33.08-.67.08-1.02s-.03-.69-.08-1.02l2.02-1.57a.7.7 0 0 0 .17-.88l-1.91-3.31a.7.7 0 0 0-.83-.31l-2.39.96a7.6 7.6 0 0 0-1.77-1.02l-.36-2.53A.7.7 0 0 0 13.65 0h-3.3a.7.7 0 0 0-.69.59L9.3 3.12c-.63.25-1.22.58-1.77 1.02l-2.39-.96a.7.7 0 0 0-.83.31L2.4 6.8a.7.7 0 0 0 .17.88l2.02 1.57c-.05.33-.08.67-.08 1.02s.03.69.08 1.02L2.57 14.6a.7.7 0 0 0-.17.88l1.91 3.31c.18.31.55.43.88.31l2.39-.96c.55.44 1.14.77 1.77 1.02l.36 2.53c.05.34.35.59.69.59h3.3c.34 0 .64-.25.69-.59l.36-2.53c.63-.25 1.22-.58 1.77-1.02l2.39.96c.33.12.7 0 .88-.31l1.91-3.31a.7.7 0 0 0-.17-.88l-2.02-1.57Z"
        stroke="currentColor"
        strokeWidth="1.3"
        opacity="0.9"
      />
    </svg>
  );
}

function ProfileIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 21a8 8 0 1 0-16 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LogoutIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10 7V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M14 12H3m0 0 3-3M3 12l3 3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SupportIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2a8 8 0 0 0-8 8v3a4 4 0 0 0 4 4h1v-7H6V10a6 6 0 1 1 12 0v.5h-3v7h1a4 4 0 0 0 4-4v-3a8 8 0 0 0-8-8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 20h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function FeedIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 6h12M6 11h12M6 16h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M20 20V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v16" stroke="currentColor" strokeWidth="1.3" opacity="0.9" />
    </svg>
  );
}

function ModeButton({ label, active, locked, onClick, accent = "cyan", title }) {
  const accents = {
    cyan: { ring: "from-cyan-400/60 via-blue-400/60 to-fuchsia-400/45", softGlow: "shadow-[0_0_22px_rgba(34,211,238,0.20)]" },
    indigo: { ring: "from-indigo-400/60 via-blue-400/60 to-cyan-400/45", softGlow: "shadow-[0_0_22px_rgba(99,102,241,0.18)]" },
    fuchsia: { ring: "from-fuchsia-400/60 via-pink-400/60 to-purple-400/45", softGlow: "shadow-[0_0_22px_rgba(217,70,239,0.16)]" },
    slate: { ring: "from-slate-300/40 via-slate-300/25 to-slate-300/15", softGlow: "shadow-[0_0_16px_rgba(148,163,184,0.14)]" },
    emerald: { ring: "from-emerald-400/60 via-teal-400/50 to-cyan-400/40", softGlow: "shadow-[0_0_18px_rgba(52,211,153,0.16)]" },
  };

  const cfg = accents[accent] || accents.cyan;
  const ACTIVE_GRADIENT = "from-fuchsia-500/45 via-purple-500/40 to-indigo-500/35";
  const ACTIVE_GLOW = "shadow-[0_0_40px_rgba(217,70,239,0.35)] shadow-[0_0_70px_rgba(99,102,241,0.18)]";

  return (
    <button
      type="button"
      onClick={onClick}
      title={title || label}
      className={cx(
        "group relative h-10 px-3 rounded-2xl border text-[12px] font-semibold transition duration-300 overflow-hidden flex items-center gap-2",
        locked
          ? "border-slate-800 bg-slate-950/35 text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
          : "border-slate-800 bg-slate-950/55 text-slate-200 hover:border-transparent hover:bg-slate-900/60",
        active && !locked ? cx("border-transparent bg-gradient-to-r", ACTIVE_GRADIENT, ACTIVE_GLOW, "text-white") : cfg.softGlow
      )}
    >
      <span className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-300">
        <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-sm animate-[ripple_900ms_ease-out_infinite]" />
      </span>

      {active && !locked ? (
        <>
          <span className="absolute inset-[1px] rounded-2xl bg-slate-950/35" />
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/18 to-white/0 opacity-20" />
        </>
      ) : null}

      <span className="relative z-10">{label}</span>

      {locked ? (
        <span className="relative z-10 text-[10px] px-2 py-0.5 rounded-full border border-slate-700 bg-slate-900/35 text-slate-200">✕</span>
      ) : active ? (
        <span className={cx("relative z-10 h-2 w-2 rounded-full", "bg-gradient-to-r", cfg.ring)} />
      ) : null}
    </button>
  );
}

function RightActions({ rightActions }) {
  const isConfigArray =
    Array.isArray(rightActions) &&
    rightActions.every((x) => x && typeof x === "object" && typeof x.label === "string" && typeof x.onClick === "function");

  if (!rightActions) return null;

  if (!isConfigArray) {
    return <div className="hidden md:flex items-center gap-2">{rightActions}</div>;
  }

  const toneClass = (tone) => {
    if (tone === "cyan") return "bg-cyan-500/18 border border-cyan-500/35 hover:bg-cyan-500/24 text-cyan-100";
    if (tone === "indigo") return "bg-indigo-500/18 border border-indigo-500/35 hover:bg-indigo-500/24 text-indigo-100";
    if (tone === "fuchsia") return "bg-fuchsia-500/14 border border-fuchsia-500/28 hover:bg-fuchsia-500/20 text-fuchsia-100";
    if (tone === "emerald") return "bg-emerald-500/14 border border-emerald-500/28 hover:bg-emerald-500/18 text-emerald-100";
    return "bg-slate-950/60 border border-slate-800 hover:bg-slate-900/40 text-slate-200";
  };

  return (
    <div className="hidden md:flex items-center gap-2">
      {rightActions.map((a, idx) => (
        <button
          key={`${a.label}-${idx}`}
          type="button"
          title={a.title || a.label}
          onClick={a.onClick}
          disabled={!!a.disabled}
          className={cx(
            "inline-flex items-center justify-center h-10 text-xs rounded-2xl px-4 transition",
            toneClass(a.tone),
            a.disabled ? "opacity-50 cursor-not-allowed" : ""
          )}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}

function IconButton({ title, onClick, children, tone = "slate" }) {
  const toneClass =
    tone === "cyan"
      ? "border-cyan-500/35 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/16"
      : tone === "fuchsia"
      ? "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200 hover:bg-fuchsia-500/16"
      : "border-slate-800 bg-slate-950/55 text-slate-300 hover:text-white hover:border-transparent hover:bg-slate-900/60";

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cx("h-10 w-10 rounded-2xl border transition flex items-center justify-center", toneClass)}
    >
      {children}
    </button>
  );
}

function normalizeBusinesses(myBusinesses) {
  const arr = Array.isArray(myBusinesses) ? myBusinesses : [];
  return arr
    .map((x) => {
      if (!x) return null;
      if (x.business && typeof x.business === "object") return x.business;
      return x;
    })
    .filter(Boolean);
}

function safeStr(x) {
  return String(x || "").trim();
}

function toNiceName({ first, last, fallback = "" }) {
  const a = safeStr(first);
  const b = safeStr(last);
  const full = `${a} ${b}`.trim();
  return full || safeStr(fallback);
}

export default function ModeBar({ title = "SyncWorks", subtitle = "", rightActions = null }) {
  const nav = useNavigate();
  const loc = useLocation();
  const { mode, setMode, availableModes, isGod, myBusinesses, logout, user, moduleAccess } = useAuth();

  const [investorLinked, setInvestorLinked] = useState(false);
  const [tenantLinked, setTenantLinked] = useState(false);
  const [salesLinked, setSalesLinked] = useState(false);

  useEffect(() => {
    const id = "syncworks-modebar-clean-css";
    if (document.getElementById(id)) return;

    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      @keyframes swWaveDrift {
        0%   { transform: translate3d(-8%, 0, 0) scale(1); opacity: .55; }
        50%  { transform: translate3d( 8%, 0, 0) scale(1.02); opacity: .72; }
        100% { transform: translate3d(-8%, 0, 0) scale(1); opacity: .55; }
      }
      @keyframes swShineSweep {
        0%   { transform: translateX(-120%); opacity: 0; }
        25%  { opacity: .14; }
        60%  { opacity: .08; }
        100% { transform: translateX(120%); opacity: 0; }
      }
      @keyframes ripple {
        0% { transform: translate(-50%,-50%) scale(1); opacity:.25; }
        100% { transform: translate(-50%,-50%) scale(26); opacity:0; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  const hideSalesButton = useMemo(() => {
    const p = String(loc.pathname || "").toLowerCase();
    if (p.startsWith("/tenant")) return true;
    if (p.startsWith("/investor")) return true;
    if (p.startsWith("/employee")) return true;
    if (mode === "EMPLOYEE") return true;
    return false;
  }, [loc.pathname, mode]);

  const showBiz = useMemo(() => {
    const hasBiz = Array.isArray(myBusinesses) && myBusinesses.length > 0;
    return hasBiz && ["SBO", "EMPLOYEE", "PM", "PLATFORM"].includes(mode);
  }, [myBusinesses, mode]);

  const showPortals = useMemo(() => mode === "PM" || isGod, [mode, isGod]);

  useEffect(() => {
    let cancelled = false;

    async function checkPortals() {
      if (!showPortals) return;

      setInvestorLinked(false);
      setTenantLinked(false);

      try {
        await api.get("/investor/dashboard/");
        if (!cancelled) setInvestorLinked(true);
      } catch {
        if (!cancelled) setInvestorLinked(false);
      }

      try {
        await api.get("/tenant/summary/");
        if (!cancelled) setTenantLinked(true);
      } catch {
        if (!cancelled) setTenantLinked(false);
      }
    }

    checkPortals();
    return () => {
      cancelled = true;
    };
  }, [showPortals]);

  useEffect(() => {
    let cancelled = false;

    async function checkSales() {
      setSalesLinked(false);
      try {
        const res = await api.get("/sales/pipelines/me/");
        const arr = Array.isArray(res.data) ? res.data : res.data?.results || [];
        if (!cancelled) setSalesLinked(arr.length > 0);
      } catch {
        if (!cancelled) setSalesLinked(false);
      }
    }

    checkSales();
    return () => {
      cancelled = true;
    };
  }, []);

  const canCustomer = !!availableModes?.CUSTOMER;
  const canSbo = !!availableModes?.SBO || isGod;
  const canEmployee = !!availableModes?.EMPLOYEE || isGod;
  const canPm = !!availableModes?.PM || isGod;
  const canAdmin = !!availableModes?.PLATFORM && isGod;
  const canSales = isGod || !!moduleAccess?.sales || salesLinked;

  function goSettings() {
    const from = `${loc.pathname || "/"}${loc.search || ""}`;
    nav(`/settings?return=${encodeURIComponent(from)}`);
  }

  function goProfile() {
    try {
      nav("/profile");
    } catch {
      nav("/customer");
    }
  }

  function goMode(nextMode, to, locked) {
    if (locked) {
      const from = `${loc.pathname || "/"}${loc.search || ""}`;
      return nav(`/upgrade?return=${encodeURIComponent(from)}`);
    }
    setMode(nextMode);
    nav(to);
  }

  async function onLogout() {
    try {
      await logout();
    } finally {
      nav("/login", { replace: true });
    }
  }

  const businesses = useMemo(() => normalizeBusinesses(myBusinesses), [myBusinesses]);

  const activeBiz = useMemo(() => {
    const activeIdRaw = getActiveBusinessId?.() || "";
    const activeId = activeIdRaw ? Number(activeIdRaw) : null;
    if (!activeId) return null;
    return (businesses || []).find((b) => Number(b?.id) === Number(activeId)) || null;
  }, [businesses]);

  const roleLabel = useMemo(() => {
    if (mode === "CUSTOMER") return "Customer";
    if (mode === "SBO") return "Business Owner";
    if (mode === "EMPLOYEE") return "Employee";
    if (mode === "PM") return "Property Manager";
    if (mode === "SALES") return "Sales OS";
    if (mode === "PLATFORM") return "Admin";
    return "SyncWorks";
  }, [mode]);

  const roleBadgeTone = useMemo(() => {
    if (mode === "CUSTOMER") return "cyan";
    if (mode === "SBO") return "indigo";
    if (mode === "EMPLOYEE") return "cyan";
    if (mode === "PM") return "fuchsia";
    if (mode === "SALES") return "emerald";
    if (mode === "PLATFORM") return "slate";
    return "cyan";
  }, [mode]);

  const customerName = useMemo(() => {
    const u = user || {};
    return toNiceName({
      first: u.first_name || u.firstName,
      last: u.last_name || u.lastName,
      fallback: u.name || u.username || u.email || "",
    });
  }, [user]);

  const businessName = safeStr(activeBiz?.name);
  const businessOwner = safeStr(activeBiz?.owner_name || activeBiz?.ownerName);
  const businessPhone = safeStr(activeBiz?.phone || activeBiz?.phone_number || activeBiz?.phoneNumber);

  const identityLeft = useMemo(() => {
    if (mode === "CUSTOMER") return customerName || "Customer";
    if (["SBO", "EMPLOYEE", "PM", "PLATFORM"].includes(mode)) return businessName || "Select a Business";
    if (mode === "SALES") return "Sales OS";
    return "SyncWorks";
  }, [mode, customerName, businessName]);

  const identitySub = useMemo(() => {
    if (["SBO", "EMPLOYEE", "PM", "PLATFORM"].includes(mode)) {
      return [businessOwner ? `Owner: ${businessOwner}` : "", businessPhone ? `Phone: ${businessPhone}` : ""]
        .filter(Boolean)
        .join(" • ");
    }
    return "";
  }, [mode, businessOwner, businessPhone]);

  function goSupport() {
    nav("/support");
  }

  function goFeed() {
    nav("/newsfeed");
  }

  return (
    <div className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -inset-10 blur-3xl"
          style={{
            animation: "swWaveDrift 10s ease-in-out infinite",
            background:
              "radial-gradient(900px 180px at 20% 50%, rgba(34,211,238,0.14), rgba(0,0,0,0) 60%)," +
              "radial-gradient(900px 180px at 70% 55%, rgba(99,102,241,0.12), rgba(0,0,0,0) 60%)," +
              "radial-gradient(900px 180px at 90% 45%, rgba(217,70,239,0.12), rgba(0,0,0,0) 60%)",
          }}
        />

        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: 0.09 }}
        >
          <img
            src="/brands/syncworks new logo.jpg"
            alt="SyncWorks background"
            className="w-[820px] max-w-none object-contain blur-[2px] select-none"
            draggable={false}
          />
        </div>

        <div
          className="absolute -inset-y-10 -inset-x-40 blur-xl"
          style={{
            animation: "swShineSweep 12s ease-in-out infinite",
            background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.09) 45%, rgba(255,255,255,0) 100%)",
          }}
        />

        <div className="absolute inset-0 bg-slate-950/72" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-start lg:items-center gap-3">
          <div className="min-w-0 flex items-center gap-3">
            <img
              src="/brands/syncworks new logo.jpg"
              alt="SyncWorks"
              className="h-14 w-14 md:h-16 md:w-16 rounded-2xl object-cover border border-cyan-500/20 bg-slate-950/70 shrink-0 shadow-[0_0_40px_rgba(99,102,241,0.18)]"
            />

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-base font-extrabold tracking-wide text-slate-100">SyncWorks</div>
                <Pill className="border-slate-800 text-slate-300 bg-slate-900/40">v7.1</Pill>
                <ModuleBadge tone={roleBadgeTone}>{roleLabel}</ModuleBadge>
              </div>

              <div className="mt-1 text-sm text-slate-200 truncate">{identityLeft}</div>
              {identitySub ? <div className="mt-0.5 text-[11px] text-slate-400 truncate">{identitySub}</div> : null}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
            {showBiz ? <BusinessPicker className="hidden md:block" /> : null}

            <div className="hidden xl:flex items-end gap-4">
              <div>
                <SectionLabel>Customer / SBO</SectionLabel>
                <div className="flex items-center gap-2">
                  <ModeButton label="Customer" accent="cyan" active={mode === "CUSTOMER"} locked={!canCustomer} onClick={() => goMode("CUSTOMER", "/customer", !canCustomer)} />
                  <ModeButton label="SBO" accent="indigo" active={mode === "SBO"} locked={!canSbo} onClick={() => goMode("SBO", "/sbo", !canSbo)} />
                </div>
              </div>

              <div>
                <SectionLabel>Work Roles</SectionLabel>
                <div className="flex items-center gap-2">
                  <ModeButton label="Employee" accent="cyan" active={mode === "EMPLOYEE"} locked={!canEmployee} onClick={() => goMode("EMPLOYEE", "/employee", !canEmployee)} />
                  <ModeButton label="Property Mgr" accent="fuchsia" active={mode === "PM"} locked={!canPm} onClick={() => goMode("PM", "/pm", !canPm)} />
                  {!hideSalesButton ? (
                    <ModeButton
                      label="Sales OS"
                      accent="emerald"
                      active={mode === "SALES"}
                      locked={!canSales}
                      title={canSales ? "Open Sales OS" : "Upgrade to unlock Sales OS"}
                      onClick={() => goMode("SALES", "/sales/dashboard", !canSales)}
                    />
                  ) : null}
                </div>
              </div>

              {showPortals ? (
                <div>
                  <SectionLabel>Portals</SectionLabel>
                  <div className="flex items-center gap-2">
                    <ModeButton
                      label="Investor"
                      accent="slate"
                      active={false}
                      locked={!investorLinked}
                      title={investorLinked ? "Open Investor Portal" : "Investor not linked — click to claim"}
                      onClick={() => nav(investorLinked ? "/investor" : "/portal/claim?portal=investor")}
                    />
                    <ModeButton
                      label="Tenant"
                      accent="slate"
                      active={false}
                      locked={!tenantLinked}
                      title={tenantLinked ? "Open Tenant Portal" : "Tenant not linked — click to claim"}
                      onClick={() => nav(tenantLinked ? "/tenant" : "/portal/claim?portal=tenant")}
                    />
                  </div>
                </div>
              ) : null}

              {canAdmin ? (
                <div>
                  <SectionLabel>Admin</SectionLabel>
                  <div className="flex items-center gap-2">
                    <ModeButton label="Admin" accent="cyan" active={mode === "PLATFORM"} locked={false} onClick={() => goMode("PLATFORM", "/platform", false)} />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="xl:hidden flex items-center gap-2">
              <ModeButton label="Customer" accent="cyan" active={mode === "CUSTOMER"} locked={!canCustomer} onClick={() => goMode("CUSTOMER", "/customer", !canCustomer)} />
              <ModeButton label="SBO" accent="indigo" active={mode === "SBO"} locked={!canSbo} onClick={() => goMode("SBO", "/sbo", !canSbo)} />
              <ModeButton label="Employee" accent="cyan" active={mode === "EMPLOYEE"} locked={!canEmployee} onClick={() => goMode("EMPLOYEE", "/employee", !canEmployee)} />
              <ModeButton label="PM" accent="fuchsia" active={mode === "PM"} locked={!canPm} onClick={() => goMode("PM", "/pm", !canPm)} />
              {!hideSalesButton ? (
                <ModeButton label="Sales" accent="emerald" active={mode === "SALES"} locked={!canSales} onClick={() => goMode("SALES", "/sales/dashboard", !canSales)} />
              ) : null}
              {canAdmin ? <ModeButton label="Admin" accent="cyan" active={mode === "PLATFORM"} locked={false} onClick={() => goMode("PLATFORM", "/platform", false)} /> : null}
            </div>

            <RightActions rightActions={rightActions} />

            <IconButton title="Newsfeed (ads + updates)" onClick={goFeed} tone="fuchsia">
              <FeedIcon className="h-5 w-5" />
            </IconButton>

            <IconButton title="Support (Contact SyncWorks)" onClick={goSupport} tone="cyan">
              <SupportIcon className="h-5 w-5" />
            </IconButton>

            <NotificationsBell />

            <button
              type="button"
              onClick={onLogout}
              title="Logout"
              className="h-10 w-10 rounded-2xl border border-slate-800 bg-slate-950/55 text-slate-300 hover:text-white hover:border-transparent hover:bg-slate-900/60 transition flex items-center justify-center"
            >
              <LogoutIcon className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={goProfile}
              title="Profile"
              className="h-10 w-10 rounded-2xl border border-slate-800 bg-slate-950/55 text-slate-300 hover:text-white hover:border-transparent hover:bg-slate-900/60 transition flex items-center justify-center"
            >
              <ProfileIcon className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={goSettings}
              title="Settings"
              className="h-10 w-10 rounded-2xl border border-slate-800 bg-slate-950/55 text-slate-300 hover:text-white hover:border-transparent hover:bg-slate-900/60 transition flex items-center justify-center"
            >
              <GearIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {showBiz ? (
        <div className="relative md:hidden px-4 pb-3">
          <BusinessPicker />
        </div>
      ) : null}

      {showPortals ? (
        <div className="relative xl:hidden px-4 pb-3 flex gap-2">
          <ModeButton label="Investor" accent="slate" active={false} locked={!investorLinked} onClick={() => nav(investorLinked ? "/investor" : "/portal/claim?portal=investor")} />
          <ModeButton label="Tenant" accent="slate" active={false} locked={!tenantLinked} onClick={() => nav(tenantLinked ? "/tenant" : "/portal/claim?portal=tenant")} />
        </div>
      ) : null}
    </div>
  );
}