import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const ROLE_OPTIONS = [
  {
    id: "landlords",
    label: "Landlords & property managers",
    eyebrow: "Run every property from one operating system",
    items: [
      "Organize portfolios, properties, units, tenants, prospects, leases, and document packets.",
      "Receive maintenance requests, create work orders, dispatch internal teams or vendors, and publish jobs to the marketplace.",
      "Track rent charges, payments, balances, Section 8 details, projects, deadlines, budgets, and status updates.",
      "Invite tenants and investors into secure role-based portals without sharing logins.",
    ],
  },
  {
    id: "businesses",
    label: "Service businesses",
    eyebrow: "Turn incoming work into completed, paid jobs",
    items: [
      "Capture marketplace and direct requests, qualify leads, quote work, and keep every conversation tied to the ticket.",
      "Schedule jobs, assign employees, dispatch technicians, manage customers, invoices, payments, and receipts.",
      "Use reports, finance tools, service settings, team permissions, and automation to operate from one dashboard.",
      "Build social content, manage leads, and connect growth activity back to real business opportunities.",
    ],
  },
  {
    id: "personal",
    label: "People & families",
    eyebrow: "One personal command center for everyday life",
    items: [
      "Request trusted local services, compare responses, schedule work, message providers, pay, and retain records.",
      "See appointments, requests, money, health, fitness, reminders, and household activity in connected views.",
      "Use SYNC as an assistant that can surface what needs attention instead of making you search every app.",
      "Move between Personal, Business, Property Management, Employee, Tenant, and other approved roles with one login.",
    ],
  },
  {
    id: "teams",
    label: "Teams & operators",
    eyebrow: "Give each person the right view and the right work",
    items: [
      "Create owner, manager, dispatch, technician, accounting, tenant, and investor access without exposing unrelated data.",
      "Keep assignments, messages, files, schedules, approvals, and payment status attached to the same workflow.",
      "Use notifications and automation to reduce missed follow-ups and keep work moving when the owner is unavailable.",
      "Let leadership see the full operation while every team member gets a focused mobile workspace.",
    ],
  },
];

const PLATFORM_GROUPS = [
  ["Find and request work", "Marketplace requests, service matching, ZIP-based routing, direct business requests, intake details, and agreements."],
  ["Operate the work", "Tickets, leads, quotes, jobs, scheduling, dispatch, team assignments, messaging, files, updates, and customer history."],
  ["Manage money", "Invoices, payments, alternative payment tracking, platform fees, receipts, balances, business finance, and reporting."],
  ["Run properties", "Portfolios, properties, units, prospects, tenants, leases, ledgers, documents, work orders, vendors, and projects."],
  ["Grow the business", "Social content drafts, channel connections, lead capture, conversations, campaign queues, and safe automation."],
  ["Coordinate personal life", "Personal schedule, service requests, health and fitness tools, money views, reminders, and SYNC assistance."],
];

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function LoginPanel({ emailOrUser, setEmailOrUser, password, setPassword, err, loading, onSubmit, onClose }) {
  return (
    <div className="w-full rounded-[28px] border border-cyan-400/20 bg-[#07111f]/95 p-5 shadow-2xl shadow-cyan-950/40 backdrop-blur-xl sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">One secure login</p>
          <h2 className="mt-2 text-2xl font-black text-white">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-400">Sign in to open your SyncWorks command center.</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800" aria-label="Close sign in">
          Close
        </button>
      </div>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <label className="block text-sm text-slate-300">
          Email or username
          <input
            className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-400"
            value={emailOrUser}
            onChange={(event) => setEmailOrUser(event.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="block text-sm text-slate-300">
          Password
          <input
            type="password"
            className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-400"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {err ? <div className="rounded-2xl border border-rose-500/35 bg-rose-500/10 p-3 text-sm text-rose-200">{err}</div> : null}

        <button
          disabled={loading}
          className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500 px-4 py-3 font-bold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
        >
          {loading ? "Signing in…" : "Sign in to SyncWorks"}
        </button>
      </form>

      <div className="mt-5 flex flex-col gap-2 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <span>New to SyncWorks? <Link className="font-semibold text-cyan-300" to="/register">Create an account</Link></span>
        <span>Tenant and investor access uses your invitation.</span>
      </div>
    </div>
  );
}

export default function Login() {
  const nav = useNavigate();
  const { login, user } = useAuth();
  const [emailOrUser, setEmailOrUser] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [activeRole, setActiveRole] = useState(ROLE_OPTIONS[0].id);

  useEffect(() => {
    if (user) nav("/customer", { replace: true });
  }, [user, nav]);

  useEffect(() => {
    if (!signInOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [signInOpen]);

  async function onSubmit(event) {
    event.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const value = emailOrUser.trim();
      const isEmail = value.includes("@");
      await login({ email: isEmail ? value : "", username: isEmail ? "" : value, password });
      nav("/customer", { replace: true });
    } catch (ex) {
      const rawMessage = ex?.response?.data?.detail || ex?.response?.data?.non_field_errors?.[0] || ex?.message || "Login failed";
      const networkMessage = /network error|failed to fetch|err_failed/i.test(String(rawMessage));
      setErr(networkMessage ? "SyncWorks could not reach the secure login service. Please try again in a moment." : rawMessage);
    } finally {
      setLoading(false);
    }
  }

  const selectedRole = ROLE_OPTIONS.find((role) => role.id === activeRole) || ROLE_OPTIONS[0];

  return (
    <div className="min-h-screen bg-[#020712] text-slate-100">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#020712]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <a href="#top" className="text-xl font-black tracking-tight sm:text-2xl">
            <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-fuchsia-400 bg-clip-text text-transparent">SyncWorks</span>
          </a>
          <nav className="hidden items-center gap-5 text-sm text-slate-300 md:flex">
            <a href="#roles" className="hover:text-white">Who it helps</a>
            <a href="#platform" className="hover:text-white">What it does</a>
            <a href="#story" className="hover:text-white">Why it exists</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/register" className="hidden rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800 sm:inline-flex">Create account</Link>
            <button onClick={() => setSignInOpen(true)} className="rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-200 hover:bg-cyan-400/20">Sign in</button>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="relative overflow-hidden border-b border-white/10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,0.14),transparent_32%),radial-gradient(circle_at_85%_30%,rgba(217,70,239,0.12),transparent_30%),linear-gradient(to_bottom,#020712,#06101f)]" />
          <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.25fr_.75fr] lg:px-8 lg:py-28">
            <div>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-cyan-200">One system</span>
                <span className="rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1.5 text-blue-200">One login</span>
                <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-3 py-1.5 text-fuchsia-200">Every role connected</span>
              </div>
              <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-7xl">
                Your requests, properties, business, schedule, money, and life—<span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-fuchsia-400 bg-clip-text text-transparent">working together.</span>
              </h1>
              <p className="mt-6 max-w-3xl text-base leading-7 text-slate-300 sm:text-xl sm:leading-8">
                SyncWorks is a connected operating system for people, service businesses, landlords, property managers, tenants, investors, and teams. It replaces scattered apps and missed handoffs with one shared workflow and an assistant that helps surface what matters next.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/register" className="rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500 px-6 py-3 text-center font-bold text-slate-950 hover:brightness-110">Start with SyncWorks</Link>
                <a href="#roles" className="rounded-2xl border border-slate-700 bg-slate-900/60 px-6 py-3 text-center font-semibold text-slate-200 hover:bg-slate-800">See what it does for you</a>
              </div>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">
                <Link className="hover:text-cyan-300" to="/tenant/accept">Accept tenant invitation</Link>
                <Link className="hover:text-cyan-300" to="/investor/accept">Claim investor access</Link>
              </div>
            </div>

            <div className="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {["Request → schedule → complete → pay", "Lead → conversation → quote → customer", "Tenant issue → work order → vendor → resolution", "Calendar → travel → reminders → next action"].map((flow) => (
                <div key={flow} className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-lg shadow-black/20">
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Connected workflow</div>
                  <div className="mt-3 text-lg font-bold text-white">{flow}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="roles" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Choose your role</p>
            <h2 className="mt-3 text-3xl font-black text-white sm:text-5xl">See what SyncWorks does for you.</h2>
            <p className="mt-4 text-slate-400">The platform changes around the person using it while the underlying information stays connected.</p>
          </div>
          <div className="mt-8 grid gap-5 lg:grid-cols-[.42fr_.58fr]">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {ROLE_OPTIONS.map((role) => (
                <button key={role.id} onClick={() => setActiveRole(role.id)} className={cx("rounded-2xl border p-4 text-left transition", activeRole === role.id ? "border-cyan-400/50 bg-cyan-400/10 text-white" : "border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-600") }>
                  <span className="font-bold">{role.label}</span>
                  <span className="mt-1 block text-xs text-slate-400">Tap to expand</span>
                </button>
              ))}
            </div>
            <div className="rounded-[30px] border border-cyan-400/20 bg-gradient-to-br from-cyan-400/[0.08] via-blue-500/[0.05] to-fuchsia-500/[0.08] p-5 sm:p-8">
              <p className="text-sm font-semibold text-cyan-300">{selectedRole.eyebrow}</p>
              <h3 className="mt-2 text-2xl font-black text-white sm:text-3xl">{selectedRole.label}</h3>
              <div className="mt-6 grid gap-3">
                {selectedRole.items.map((item) => <div key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-slate-950/45 p-4 text-sm leading-6 text-slate-300"><span className="mt-1 text-cyan-300">◆</span><span>{item}</span></div>)}
              </div>
            </div>
          </div>
        </section>

        <section id="platform" className="border-y border-white/10 bg-[#050d19]">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-fuchsia-300">The connected platform</p>
            <h2 className="mt-3 max-w-4xl text-3xl font-black text-white sm:text-5xl">Everything stays attached to the same people, places, work, and timeline.</h2>
            <div className="mt-9 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {PLATFORM_GROUPS.map(([title, body]) => <article key={title} className="rounded-3xl border border-slate-800 bg-slate-950/55 p-5"><h3 className="text-lg font-bold text-white">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{body}</p></article>)}
            </div>
          </div>
        </section>

        <section id="story" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-900 to-[#081325] p-6 sm:p-10 lg:grid lg:grid-cols-[.7fr_1.3fr] lg:gap-12">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Why SyncWorks was created</p>
              <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">Built from a simple idea.</h2>
            </div>
            <div className="mt-6 space-y-4 text-base leading-7 text-slate-300 lg:mt-0">
              <p>People should not have to search through separate apps, texts, spreadsheets, calendars, invoices, property records, and social tools just to understand what is happening.</p>
              <p>SyncWorks was created to connect those decisions. A request should become a scheduled job. A tenant issue should become a tracked work order. A lead should become a customer. A calendar event should account for the time and preparation needed to get there.</p>
              <p className="font-semibold text-white">The goal is a practical command center that saves time, reduces missed handoffs, and gives every user the right information at the right moment.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-4 py-8 text-center text-xs text-slate-500">© {new Date().getFullYear()} SyncWorks. One system for the work and life around you.</footer>

      {signInOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label="Sign in to SyncWorks" onMouseDown={(event) => { if (event.target === event.currentTarget) setSignInOpen(false); }}>
          <div className="max-h-[92vh] w-full overflow-y-auto sm:max-w-xl">
            <LoginPanel emailOrUser={emailOrUser} setEmailOrUser={setEmailOrUser} password={password} setPassword={setPassword} err={err} loading={loading} onSubmit={onSubmit} onClose={() => setSignInOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
