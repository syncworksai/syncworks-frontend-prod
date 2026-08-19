import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BadgeDollarSign,
  Banknote,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Dumbbell,
  HeartPulse,
  KeyRound,
  Mail,
  Network,
  Settings2,
  ShieldCheck,
  Smartphone,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";

import ModeBar from "../components/ModeBar";
import { useAuth } from "../auth/AuthContext";
import { MobileNavSettings } from "../components/navigation/RoleAwareMobileNav";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function hasProfile(profiles, key) {
  if (!profiles || typeof profiles !== "object") return false;
  return Object.keys(profiles).some((name) => String(name).toLowerCase() === String(key).toLowerCase());
}

function Card({ title, subtitle, right, children, className = "" }) {
  return (
    <section className={cx("rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-lg font-black text-white">{title}</h2>{subtitle ? <p className="mt-1 text-sm leading-6 text-slate-400">{subtitle}</p> : null}</div>
        {right ? <div>{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Status({ active, label }) {
  return (
    <span className={cx("rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest", active ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200" : "border-slate-700 bg-slate-900/60 text-slate-400")}>
      {label || (active ? "Connected" : "Available")}
    </span>
  );
}

function ConnectionCard({ icon: Icon, title, description, active, status, price, button, onClick, muted = false }) {
  return (
    <div className={cx("rounded-3xl border p-4 transition", active ? "border-emerald-400/20 bg-emerald-500/[.05]" : "border-white/10 bg-white/[.02]", muted ? "opacity-65" : "")}>
      <div className="flex items-start justify-between gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-black/20"><Icon className="h-5 w-5 text-cyan-200" /></div>
        <Status active={active} label={status} />
      </div>
      <div className="mt-4 font-black text-white">{title}</div>
      <p className="mt-1 min-h-10 text-xs leading-5 text-slate-400">{description}</p>
      {price ? <div className="mt-3 text-xs font-black text-slate-300">{price}</div> : null}
      <button type="button" onClick={onClick} className="mt-4 min-h-10 rounded-xl border border-cyan-400/20 bg-cyan-500/[.08] px-3 text-xs font-black text-cyan-100 hover:bg-cyan-500/[.14]">{button}</button>
    </div>
  );
}

function FeeRow({ name, price, note, tone = "cyan" }) {
  const cls = tone === "emerald" ? "text-emerald-200" : tone === "amber" ? "text-amber-200" : tone === "violet" ? "text-violet-200" : "text-cyan-200";
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[.025] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div><div className="font-black text-white">{name}</div><div className="mt-1 text-xs leading-5 text-slate-400">{note}</div></div>
      <div className={cx("shrink-0 text-sm font-black", cls)}>{price}</div>
    </div>
  );
}

export default function SettingsHub() {
  const nav = useNavigate();
  const location = useLocation();
  const { user, profiles, myBusinesses, moduleAccess, isGod } = useAuth();
  const queryTab = useMemo(() => String(new URLSearchParams(location.search || "").get("tab") || "").toUpperCase(), [location.search]);
  const validTabs = ["ACCOUNT", "CONNECTIONS", "FEES", "NAVIGATION", "ACCESS"];
  const [tab, setTab] = useState(validTabs.includes(queryTab) ? queryTab : "CONNECTIONS");

  const businessConnected = (Array.isArray(myBusinesses) && myBusinesses.length > 0) || !!moduleAccess?.sbo;
  const pmConnected = hasProfile(profiles, "pm") || !!moduleAccess?.pm;
  const tenantConnected = hasProfile(profiles, "tenant");
  const employeeConnected = hasProfile(profiles, "employee");
  const investorConnected = hasProfile(profiles, "investor");
  const healthConnected = !!moduleAccess?.fitness || hasProfile(profiles, "health");
  const financeConnected = !!moduleAccess?.finance;
  const growthConnected = !!moduleAccess?.growth_os || !!moduleAccess?.growth;

  const tabs = [
    ["CONNECTIONS", "Connections"],
    ["ACCOUNT", "Account"],
    ["ACCESS", "Access"],
    ["FEES", "Fee schedule"],
    ["NAVIGATION", "Navigation"],
  ];

  return (
    <div className="min-h-dvh bg-[#020617] text-slate-100">
      <ModeBar title="SyncWorks" subtitle="Settings & connections" />
      <main className="mx-auto max-w-7xl space-y-4 px-3 pb-28 pt-5 sm:px-5 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">Personal settings</div><h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">Settings & Connections</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">See what this account is connected to, what else is available, what it costs, and where to manage access.</p></div>
          <div className="flex gap-2"><Link to="/customer" className="rounded-2xl border border-white/10 bg-white/[.04] px-4 py-2 text-sm font-black text-slate-200">Back home</Link><button type="button" onClick={() => nav("/profile")} className="rounded-2xl border border-cyan-400/20 bg-cyan-500/[.08] px-4 py-2 text-sm font-black text-cyan-100">Profile</button></div>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-white/10 bg-slate-950/55 p-2">
          <div className="flex min-w-max gap-2">
            {tabs.map(([key, label]) => <button key={key} type="button" onClick={() => setTab(key)} className={cx("rounded-2xl border px-4 py-2 text-xs font-black transition", tab === key ? "border-cyan-400/25 bg-cyan-500/10 text-cyan-100" : "border-transparent text-slate-400 hover:border-white/10 hover:text-white")}>{label}</button>)}
          </div>
        </div>

        {tab === "CONNECTIONS" ? (
          <>
            <Card title="Connected workspaces" subtitle="Active access is highlighted. Grey cards are available but not currently connected to this account.">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <ConnectionCard icon={BriefcaseBusiness} title="Business" description="Customers, requests, invoices, team and operations." active={businessConnected} status={businessConnected ? "Connected" : "Available"} price="$19.99 / month" button={businessConnected ? "Open Business" : "View Business"} onClick={() => nav(businessConnected ? "/sbo" : "/upgrade")} muted={!businessConnected} />
                <ConnectionCard icon={Building2} title="Property Management" description="Properties, units, tenants, work orders and portfolio operations." active={pmConnected} status={pmConnected ? "Connected" : "Paid option"} price="$49.99 / month" button={pmConnected ? "Open PM" : "View PM"} onClick={() => nav(pmConnected ? "/pm" : "/upgrade")} muted={!pmConnected} />
                <ConnectionCard icon={UserRound} title="Tenant" description="Connect to a PM company using the secure invite code they provide." active={tenantConnected} status={tenantConnected ? "Connected" : "Invite"} price="Free by invite" button={tenantConnected ? "Open tenant portal" : "Connect to PM group"} onClick={() => nav(tenantConnected ? "/tenant" : "/tenant/accept")} muted={!tenantConnected} />
                <ConnectionCard icon={Users} title="Employee" description="Join a business or team with invite-based access." active={employeeConnected} status={employeeConnected ? "Connected" : "Invite"} price="Free by invite" button={employeeConnected ? "Open employee" : "Open invite access"} onClick={() => nav(employeeConnected ? "/employee" : "/connect")} muted={!employeeConnected} />
                <ConnectionCard icon={ShieldCheck} title="Investor" description="Investor portal access for connected property groups." active={investorConnected} status={investorConnected ? "Connected" : "Invite"} price="Free by invite" button={investorConnected ? "Open investor" : "Open invite access"} onClick={() => nav(investorConnected ? "/investor" : "/connect")} muted={!investorConnected} />
                <ConnectionCard icon={Dumbbell} title="Health" description="Workout, nutrition, readiness and recovery." active={healthConnected} status={healthConnected ? "Active" : "Optional"} price="$2.99 / month" button="Open Health" onClick={() => nav("/customer/health")} muted={!healthConnected} />
                <ConnectionCard icon={WalletCards} title="Money" description="Personal finance workspace, budgets, accounts and planning." active={financeConnected} status={financeConnected ? "Active" : "Optional"} price="$0.99 / month" button="Open Money" onClick={() => nav("/customer/finance")} muted={!financeConnected} />
                <ConnectionCard icon={Network} title="SyncWorks Social" description="Friends, groups, events, shared costs and invitations." active status="Available" price="Included with Personal" button="Open Social" onClick={() => nav("/connect")} />
              </div>
            </Card>

            <Card title="Connected services" subtitle="These are the places where personal modules connect to outside data or devices. Open the owning module to finish setup.">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <ConnectionCard icon={CalendarDays} title="Calendar" description="Schedule, events and calendar-linked activity." active status="Ready" button="Open Calendar" onClick={() => nav("/calendar")} />
                <ConnectionCard icon={Banknote} title="Bank accounts" description="Financial institution connections are managed inside Money." active={financeConnected} status={financeConnected ? "Manage in Money" : "Requires Money"} price="$0.99 / month Money add-on" button="Manage banks" onClick={() => nav("/customer/finance")} muted={!financeConnected} />
                <ConnectionCard icon={HeartPulse} title="Health devices" description="Fitness and health-device connections live inside Health." active={healthConnected} status={healthConnected ? "Manage in Health" : "Requires Health"} price="$2.99 / month Health add-on" button="Manage devices" onClick={() => nav("/customer/health")} muted={!healthConnected} />
                <ConnectionCard icon={Mail} title="Messages & email" description="Inbox and communication preferences are managed through your personal inbox and SYNC settings." active status="Available" button="Open Messages" onClick={() => nav("/customer/inbox")} />
              </div>
            </Card>
          </>
        ) : null}

        {tab === "ACCOUNT" ? (
          <Card title="Account" subtitle="Identity and core account controls.">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><div className="text-xs font-black uppercase tracking-widest text-slate-500">Signed in as</div><div className="mt-2 font-black text-white">{`${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.username || "SyncWorks user"}</div><div className="mt-1 text-sm text-slate-400">{user?.email || "No email available"}</div></div>
              <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><div className="text-xs font-black uppercase tracking-widest text-slate-500">Profile & security</div><div className="mt-2 text-sm leading-6 text-slate-400">Update your identity and account security from Profile.</div><button type="button" onClick={() => nav("/profile")} className="mt-3 rounded-xl border border-cyan-400/20 bg-cyan-500/[.08] px-3 py-2 text-xs font-black text-cyan-100">Open Profile</button></div>
              <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><div className="text-xs font-black uppercase tracking-widest text-slate-500">Personal preferences</div><div className="mt-2 text-sm leading-6 text-slate-400">Notifications, navigation and module-specific preferences are managed in their dedicated sections.</div></div>
              <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><div className="text-xs font-black uppercase tracking-widest text-slate-500">God Mode</div><div className="mt-2 text-sm leading-6 text-slate-400">{isGod ? "Internal platform controls are available to this account." : "No internal platform access is attached to this account."}</div></div>
            </div>
          </Card>
        ) : null}

        {tab === "ACCESS" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Are you a tenant?" subtitle="Connect this Personal account to the correct property manager, property, unit and lease."><div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/[.05] p-4"><KeyRound className="h-6 w-6 text-cyan-200" /><div className="mt-3 font-black text-white">Tenant invite code</div><p className="mt-1 text-sm leading-6 text-slate-400">Enter the secure code provided by the PM company. The existing tenant invite flow will validate and link your account.</p><button type="button" onClick={() => nav("/tenant/accept")} className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-500/[.08] px-4 py-2 text-sm font-black text-cyan-100">Connect to PM group</button></div></Card>
            <Card title="Other invite-based access" subtitle="Employee and investor access use scoped invitations rather than paid Personal upgrades."><div className="space-y-3"><button type="button" onClick={() => nav("/connect")} className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[.025] p-4 text-left"><div><div className="font-black text-white">Enter access code</div><div className="mt-1 text-xs text-slate-400">Employee, investor and other approved invite flows.</div></div><KeyRound className="h-5 w-5 text-violet-200" /></button><button type="button" onClick={() => nav("/upgrade")} className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[.025] p-4 text-left"><div><div className="font-black text-white">Paid workspaces</div><div className="mt-1 text-xs text-slate-400">Business, Property Management and other upgrades.</div></div><BadgeDollarSign className="h-5 w-5 text-amber-200" /></button></div></Card>
          </div>
        ) : null}

        {tab === "FEES" ? (
          <Card title="SyncWorks fee schedule" subtitle="Current prices already published in the app. This page gives the user one place to understand recurring and platform charges.">
            <div className="space-y-3">
              <FeeRow name="Personal" price="Free" note="Personal dashboard, requests, messaging and core account access." tone="emerald" />
              <FeeRow name="Business" price="$19.99 / month" note="Business operations workspace." tone="violet" />
              <FeeRow name="Property Management" price="$49.99 / month" note="Property, unit, tenant and portfolio operations workspace." tone="violet" />
              <FeeRow name="Sales OS" price="$9.99 / month" note="Pipeline and sales workflow workspace currently published in Upgrade." tone="emerald" />
              <FeeRow name="Money / Finance add-on" price="$0.99 / month" note="Optional personal finance workspace." />
              <FeeRow name="Health / Fitness add-on" price="$2.99 / month" note="Optional workout, nutrition and recovery workspace." tone="emerald" />
              <FeeRow name="Business Social / Growth automation" price="$9.99 / month" note="Optional Business growth automation currently published in Social Media." tone="violet" />
              <FeeRow name="Invite-based portals" price="Free" note="Tenant, employee and investor access is connected through scoped invites." tone="emerald" />
              <FeeRow name="SyncWorks platform transaction fee" price="1% where applicable" note="Applied to eligible transactions handled through SyncWorks. Any separate third-party payment-processing fee is not a SyncWorks platform fee." tone="amber" />
            </div>
            <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/[.05] p-4 text-xs leading-5 text-amber-100">Pricing shown here should remain synchronized with checkout and module upgrade screens whenever pricing changes.</div>
          </Card>
        ) : null}

        {tab === "NAVIGATION" ? (
          <Card title="Mobile navigation" subtitle="The center SYNC button stays fixed. Choose the four shortcuts around it."><MobileNavSettings /></Card>
        ) : null}

        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[.025] px-4 py-3 text-xs text-slate-500"><span>Settings are organized around the Personal account first.</span><button type="button" onClick={() => nav("/upgrade")} className="font-black text-cyan-200">View upgrades</button></div>
      </main>
    </div>
  );
}
