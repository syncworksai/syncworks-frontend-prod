import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ModeBar from "../components/ModeBar";
import { useAuth } from "../auth/AuthContext";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function Card({ title, subtitle, right, children }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/45 p-5 shadow-[0_0_60px_rgba(0,0,0,0.30)]">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-base font-extrabold text-slate-100">{title}</div>
          {subtitle ? (
            <div className="text-xs text-slate-400 mt-1 leading-relaxed">{subtitle}</div>
          ) : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
      <div>
        <div className="text-xs text-slate-300 font-semibold">{label}</div>
        {hint ? <div className="text-[11px] text-slate-500 mt-1">{hint}</div> : null}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Input({ value, onChange, placeholder, mono = false, disabled = false, type = "text" }) {
  return (
    <input
      value={value}
      type={type}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className={cx(
        "w-full h-11 rounded-2xl border bg-slate-950/60 px-3 text-sm outline-none transition",
        disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-slate-900/40",
        "border-slate-800 focus:border-cyan-500/40",
        mono ? "font-mono" : ""
      )}
    />
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange?.(!checked)}
      className={cx(
        "w-full h-11 rounded-2xl border px-3 text-sm font-semibold flex items-center justify-between transition",
        checked
          ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
          : "border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-900/40"
      )}
    >
      <span>{label}</span>
      <span
        className={cx(
          "text-[11px] px-2 py-1 rounded-full border",
          checked ? "border-emerald-500/30 bg-emerald-500/10" : "border-slate-700 bg-slate-900/30"
        )}
      >
        {checked ? "YES" : "NO"}
      </span>
    </button>
  );
}

function ModuleLauncher({
  title,
  subtitle,
  bullets = [],
  tone = "cyan",
  cta = "Open",
  onClick,
  badge = "",
}) {
  const toneCls =
    tone === "fuchsia"
      ? "border-fuchsia-500/25 bg-fuchsia-500/5"
      : tone === "emerald"
      ? "border-emerald-500/25 bg-emerald-500/5"
      : tone === "indigo"
      ? "border-indigo-500/25 bg-indigo-500/5"
      : "border-cyan-500/25 bg-cyan-500/5";

  const btnCls =
    tone === "fuchsia"
      ? "border-fuchsia-500/35 bg-fuchsia-500/12 hover:bg-fuchsia-500/18 text-fuchsia-200"
      : tone === "emerald"
      ? "border-emerald-500/35 bg-emerald-500/12 hover:bg-emerald-500/18 text-emerald-200"
      : tone === "indigo"
      ? "border-indigo-500/35 bg-indigo-500/12 hover:bg-indigo-500/18 text-indigo-200"
      : "border-cyan-500/35 bg-cyan-500/12 hover:bg-cyan-500/18 text-cyan-200";

  return (
    <div className={cx("rounded-3xl border p-5 shadow-[0_0_40px_rgba(0,0,0,0.22)]", toneCls)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-extrabold text-slate-100">{title}</div>
          <div className="text-xs text-slate-400 mt-1 leading-relaxed">{subtitle}</div>
        </div>
        {badge ? (
          <div className="text-[10px] uppercase tracking-[0.18em] rounded-full px-2.5 py-1 border border-slate-700 bg-slate-950/70 text-slate-300">
            {badge}
          </div>
        ) : null}
      </div>

      {bullets.length ? (
        <div className="mt-4 space-y-2">
          {bullets.map((b) => (
            <div key={b} className="flex gap-2 text-sm text-slate-300">
              <span className="text-cyan-300">•</span>
              <span>{b}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-5">
        <button
          type="button"
          onClick={onClick}
          className={cx("rounded-2xl px-4 py-2 text-sm font-semibold border transition", btnCls)}
        >
          {cta}
        </button>
      </div>
    </div>
  );
}

export default function SettingsHub() {
  const nav = useNavigate();
  const loc = useLocation();
  const { user, mode, profiles, myBusinesses, moduleAccess, isGod } = useAuth();

  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState("ACCOUNT");

  const [person, setPerson] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    profilePicUrl: "",
    allowSmsFromSbos: true,
  });

  const hasMemberships = useMemo(
    () => (Array.isArray(myBusinesses) ? myBusinesses.length > 0 : false),
    [myBusinesses]
  );

  const profileKeys = useMemo(() => Object.keys(profiles || {}), [profiles]);

  const available = useMemo(() => {
    return {
      CUSTOMER: true,
      SBO: hasMemberships || !!moduleAccess?.sbo || isGod,
      PM: hasMemberships || !!moduleAccess?.pm || isGod,
      SALES: !!moduleAccess?.sales || isGod,
      TENANT: true,
      INVESTOR: true,
      EMPLOYEE: true,
    };
  }, [hasMemberships, moduleAccess, isGod]);

  const returnTo = useMemo(() => {
    const qs = new URLSearchParams(loc.search || "");
    const r = (qs.get("return") || "").trim();
    return r && r.startsWith("/") ? r : "/customer";
  }, [loc.search]);

  useEffect(() => {
    const u = user || {};
    const fullName = `${String(u.first_name || "").trim()} ${String(u.last_name || "").trim()}`
      .trim();

    setPerson((p) => ({
      ...p,
      name: fullName || u.name || u.username || "",
      email: u.email || "",
      phone: u.phone || u.phone_number || "",
      address: u.address || "",
      profilePicUrl: "",
      allowSmsFromSbos: true,
    }));
  }, [user]);

  function toastOk(s) {
    setMsg(s || "Saved.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goUpgrade() {
    nav(`/upgrade?return=${encodeURIComponent(returnTo)}`);
  }

  function goConnect() {
    nav(`/connect?return=${encodeURIComponent(returnTo)}`);
  }

  function openModule(key) {
    if (key === "SBO") {
      if (!available.SBO) return goUpgrade();
      return nav(`/sbo/settings?return=${encodeURIComponent(returnTo)}`);
    }
    if (key === "PM") {
      if (!available.PM) return goUpgrade();
      return nav(`/pm/settings?return=${encodeURIComponent(returnTo)}`);
    }
    if (key === "SALES") {
      if (!available.SALES) return goUpgrade();
      return nav(`/sales/settings?return=${encodeURIComponent(returnTo)}`);
    }
    if (key === "TENANT") {
      return nav(`/tenant/settings?return=${encodeURIComponent(returnTo)}`);
    }
    if (key === "INVESTOR") {
      return nav(`/investor/settings?return=${encodeURIComponent(returnTo)}`);
    }
    if (key === "EMPLOYEE") {
      return nav(`/employee/settings?return=${encodeURIComponent(returnTo)}`);
    }
  }

  const tabs = [
    { key: "ACCOUNT", label: "Account", icon: "👤" },
    { key: "CUSTOMER", label: "Customer", icon: "🧾" },
    { key: "MODULES", label: "Modules", icon: "🧩" },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar title="SyncWorks" subtitle="Settings Hub" />

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-2xl font-extrabold tracking-tight">Settings</div>
            <div className="text-sm text-slate-400 mt-1">
              Account and customer settings live here. Module settings open in their own dedicated pages.
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Link
              to={returnTo}
              className="rounded-2xl px-4 py-2 text-sm border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40"
            >
              Back
            </Link>

            <button
              type="button"
              onClick={() => nav("/profile")}
              className="rounded-2xl px-4 py-2 text-sm font-semibold border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40"
            >
              Profile
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950/45 p-3">
          <div className="flex gap-2 flex-wrap">
            {tabs.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={cx(
                    "px-3 py-2 rounded-2xl text-xs border transition",
                    active
                      ? "bg-cyan-500/12 border-cyan-500/35 text-cyan-200"
                      : "bg-slate-950/60 border-slate-800 text-slate-200 hover:bg-slate-900/40"
                  )}
                >
                  <span className="mr-2">{t.icon}</span>
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="mt-2 text-[11px] text-slate-500 px-1">
            SBO / PM / Sales route to dedicated settings pages. Invite-based roles use dedicated settings with code-link flows.
          </div>
        </div>

        {msg ? (
          <div className="text-sm text-emerald-200 bg-emerald-900/10 border border-emerald-800 rounded-2xl p-3">
            {msg}
          </div>
        ) : null}

        {tab === "ACCOUNT" ? (
          <>
            <Card
              title="Account"
              subtitle="Identity and session"
              right={
                <div className="text-[11px] px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-200">
                  Mode: {mode || "—"}
                </div>
              }
            >
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="Signed-in user" hint="Read-only display.">
                  <Input
                    value={`${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.username || "—"}
                    onChange={() => {}}
                    disabled
                  />
                </Field>

                <Field label="Email (login)" hint="Read-only display.">
                  <Input value={user?.email || user?.username || "—"} onChange={() => {}} disabled mono />
                </Field>

                <Field label="Password" hint="Change password in Profile → Security.">
                  <button
                    type="button"
                    onClick={() => nav("/profile")}
                    className="w-full h-11 rounded-2xl border border-cyan-500/35 bg-cyan-500/12 hover:bg-cyan-500/18 text-cyan-200 text-sm font-semibold"
                  >
                    Open Security
                  </button>
                </Field>

                <Field label="Danger zone" hint="Safe placeholders until endpoints are wired.">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => toastOk("Logout-all-devices placeholder ready.")}
                      className="h-11 rounded-2xl border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40 text-slate-200 text-sm font-semibold"
                    >
                      Logout all devices
                    </button>
                    <button
                      type="button"
                      onClick={() => toastOk("Delete-account placeholder ready.")}
                      className="h-11 rounded-2xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/15 text-rose-200 text-sm font-semibold"
                    >
                      Delete account
                    </button>
                  </div>
                </Field>
              </div>
            </Card>

            <Card
              title="Profiles"
              subtitle="Read-only snapshot from /auth/me/."
              right={
                <div className="text-[11px] px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-200">
                  {profileKeys.length} profiles
                </div>
              }
            >
              {profileKeys.length === 0 ? (
                <div className="text-sm text-slate-400">No profiles found on /auth/me/.</div>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {profileKeys.map((k) => (
                    <Field key={k} label={k} hint="JSON snapshot (read-only).">
                      <pre className="text-[11px] leading-relaxed whitespace-pre-wrap break-words rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-slate-200">
                        {JSON.stringify(profiles?.[k] || {}, null, 2)}
                      </pre>
                    </Field>
                  ))}
                </div>
              )}
            </Card>
          </>
        ) : null}

        {tab === "CUSTOMER" ? (
          <Card
            title="Customer Settings"
            subtitle="Personal preferences and communication settings."
            right={
              <button
                type="button"
                onClick={() => toastOk("Customer settings saved locally for MVP.")}
                className="rounded-2xl px-4 py-2 text-sm font-semibold border border-emerald-500/35 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-200"
              >
                Save
              </button>
            }
          >
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Name">
                <Input
                  value={person.name}
                  onChange={(v) => setPerson((p) => ({ ...p, name: v }))}
                  placeholder="Your full name"
                />
              </Field>

              <Field label="Email">
                <Input
                  value={person.email}
                  onChange={(v) => setPerson((p) => ({ ...p, email: v }))}
                  placeholder="you@email.com"
                />
              </Field>

              <Field label="Phone">
                <Input
                  value={person.phone}
                  onChange={(v) => setPerson((p) => ({ ...p, phone: v }))}
                  placeholder="(555) 555-5555"
                />
              </Field>

              <Field label="Address">
                <Input
                  value={person.address}
                  onChange={(v) => setPerson((p) => ({ ...p, address: v }))}
                  placeholder="123 Main St, City, ST"
                />
              </Field>

              <Field label="Allow SMS from businesses">
                <Toggle
                  checked={!!person.allowSmsFromSbos}
                  onChange={(v) => setPerson((p) => ({ ...p, allowSmsFromSbos: !!v }))}
                  label={person.allowSmsFromSbos ? "SMS allowed" : "SMS blocked"}
                />
              </Field>

              <Field label="Profile photo URL (optional)">
                <Input
                  value={person.profilePicUrl}
                  onChange={(v) => setPerson((p) => ({ ...p, profilePicUrl: v }))}
                  placeholder="https://..."
                  mono
                />
              </Field>
            </div>

            <div className="mt-4 text-[11px] text-slate-500">
              This stays lightweight in the hub. Module-specific settings live in dedicated pages.
            </div>
          </Card>
        ) : null}

        {tab === "MODULES" ? (
          <div className="grid lg:grid-cols-2 gap-4">
            <ModuleLauncher
              title="SBO Settings"
              subtitle="Business identity, logo, ZIP, service radius, marketplace visibility, service matching, and business card data."
              bullets={[
                "Configure service tags + ZIP + radius for marketplace routing",
                "Control logo, card profile, and public business details",
                "This is the source of truth for business-facing settings",
              ]}
              tone="indigo"
              badge={available.SBO ? "Available" : "Upgrade"}
              cta={available.SBO ? "Open SBO Settings →" : "Upgrade to SBO →"}
              onClick={() => openModule("SBO")}
            />

            <ModuleLauncher
              title="PM Settings"
              subtitle="Property manager profile, notification defaults, and operational PM settings."
              bullets={[
                "Manager profile and company defaults",
                "Notifications and PM-specific preferences",
                "Separate page keeps PM flows clean and scalable",
              ]}
              tone="fuchsia"
              badge={available.PM ? "Available" : "Upgrade"}
              cta={available.PM ? "Open PM Settings →" : "Upgrade to PM →"}
              onClick={() => openModule("PM")}
            />

            <ModuleLauncher
              title="Sales OS Settings"
              subtitle="Meeting links, website, licensed states, and future agency automation hooks."
              bullets={[
                "Sales-specific settings stay separate from business settings",
                "Faster, cleaner, and easier to scale by module",
                "Ready for backend wiring later",
              ]}
              tone="emerald"
              badge={available.SALES ? "Available" : "Upgrade"}
              cta={available.SALES ? "Open Sales Settings →" : "Upgrade to Sales OS →"}
              onClick={() => openModule("SALES")}
            />

            <ModuleLauncher
              title="Tenant Settings"
              subtitle="Tenant profile, contact preferences, address, and invite-code linking."
              bullets={[
                "Personal tenant info and communication settings",
                "Claim or refresh tenant linkage with invite code",
                "Built to support future lease and document flows",
              ]}
              tone="cyan"
              badge="Portal"
              cta="Open Tenant Settings →"
              onClick={() => openModule("TENANT")}
            />

            <ModuleLauncher
              title="Investor Settings"
              subtitle="Investor profile, entity details, reporting contact, and claim-code linking."
              bullets={[
                "Professional investor identity and contact settings",
                "Clean portal-specific settings page",
                "Ready for reporting and statement workflows",
              ]}
              tone="indigo"
              badge="Portal"
              cta="Open Investor Settings →"
              onClick={() => openModule("INVESTOR")}
            />

            <ModuleLauncher
              title="Employee Settings"
              subtitle="Employee identity, company, title, and invite-code linking."
              bullets={[
                "Simple and production-safe employee profile",
                "Built for dispatch, office, field, and admin staff",
                "Supports future permission and department expansion",
              ]}
              tone="emerald"
              badge="Portal"
              cta="Open Employee Settings →"
              onClick={() => openModule("EMPLOYEE")}
            />
          </div>
        ) : null}

        <div className="text-[11px] text-slate-500 px-1">
          Settings hub is now the launcher. Dedicated module pages own their own settings.
        </div>
      </div>
    </div>
  );
}