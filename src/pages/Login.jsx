import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function Pill({ children, tone = "slate" }) {
  const cls =
    tone === "cyan"
      ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
      : tone === "fuchsia"
      ? "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200"
      : tone === "indigo"
      ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-200"
      : tone === "emerald"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : "border-slate-800 bg-slate-950/50 text-slate-200";

  return (
    <span className={cx("inline-flex items-center rounded-full border px-2 py-1 text-[11px]", cls)}>
      {children}
    </span>
  );
}

function Card({ title, subtitle, children }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/45 p-5">
      <div className="text-sm font-semibold text-slate-100">{title}</div>
      {subtitle ? <div className="mt-1 text-xs text-slate-400">{subtitle}</div> : null}
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Bullet({ children }) {
  return (
    <div className="flex gap-2 text-sm leading-relaxed text-slate-300">
      <span className="text-cyan-300">•</span>
      <span>{children}</span>
    </div>
  );
}

function LoginCard({
  emailOrUser,
  setEmailOrUser,
  password,
  setPassword,
  err,
  loading,
  onSubmit,
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/55 p-5 shadow-[0_0_90px_rgba(0,0,0,0.45)] backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-lg font-extrabold">Sign in</div>
          <div className="mt-1 text-xs text-slate-400">Welcome back — let’s run ops.</div>
        </div>
        <Pill tone="fuchsia">Secure</Pill>
      </div>

      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
        <div>
          <label className="text-[11px] text-slate-400">Email or Username</label>
          <input
            className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 outline-none focus:border-cyan-500/50"
            value={emailOrUser}
            onChange={(e) => setEmailOrUser(e.target.value)}
            autoComplete="username"
            required
          />
        </div>

        <div>
          <label className="text-[11px] text-slate-400">Password</label>
          <input
            type="password"
            className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 outline-none focus:border-cyan-500/50"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        {err ? (
          <div className="rounded-2xl border border-red-800 bg-red-900/20 p-3 text-sm text-red-300">
            {err}
          </div>
        ) : null}

        <button
          disabled={loading}
          className={cx(
            "w-full rounded-2xl border py-2.5 text-sm font-semibold transition",
            loading
              ? "border-slate-800 bg-slate-950/60 text-slate-200 opacity-60"
              : "border-cyan-500/35 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/20"
          )}
          type="submit"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div className="mt-3 text-sm text-slate-400">
        New here?{" "}
        <Link className="text-cyan-300 hover:text-cyan-200" to="/register">
          Create an account
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link
          to="/register"
          className="rounded-2xl border border-fuchsia-500/35 bg-fuchsia-500/10 px-3 py-2 text-center text-sm font-semibold text-fuchsia-200 hover:bg-fuchsia-500/15"
        >
          Register
        </Link>
        <Link
          to="/register"
          className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-center text-sm hover:bg-slate-900/40"
        >
          How it works
        </Link>
      </div>

      <div className="mt-4 text-[11px] text-slate-500">
        Tenant/Investor portals are invite-based. If you received a code, follow the invite/claim flow.
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

  useEffect(() => {
    if (user) nav("/customer", { replace: true });
  }, [user, nav]);

  useEffect(() => {
    const id = "sw-login-bg-css";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      @keyframes swFloat {
        0% { transform: translate3d(-8%, 0, 0) scale(1); opacity: .50; }
        50% { transform: translate3d(8%, 0, 0) scale(1.02); opacity: .72; }
        100% { transform: translate3d(-8%, 0, 0) scale(1); opacity: .50; }
      }
      @keyframes swSweep {
        0% { transform: translateX(-120%); opacity: 0; }
        20% { opacity: .16; }
        60% { opacity: .08; }
        100% { transform: translateX(120%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  const videoSrc = useMemo(() => "/landing/Servicesrecording.mp4", []);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const isEmail = emailOrUser.includes("@");
      await login({
        email: isEmail ? emailOrUser : "",
        username: isEmail ? "" : emailOrUser,
        password,
      });
      nav("/customer", { replace: true });
    } catch (ex) {
      const msg =
        ex?.response?.data?.detail ||
        ex?.response?.data?.non_field_errors?.[0] ||
        ex?.message ||
        "Login failed";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020617] text-slate-100">
      <div className="absolute inset-0">
        <video
          src={videoSrc}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[#020617]/70" />
        <div
          className="absolute -inset-20 blur-3xl"
          style={{
            animation: "swFloat 10s ease-in-out infinite",
            background:
              "radial-gradient(900px 360px at 10% 30%, rgba(34,211,238,0.18), rgba(0,0,0,0) 62%)," +
              "radial-gradient(900px 360px at 65% 40%, rgba(99,102,241,0.16), rgba(0,0,0,0) 62%)," +
              "radial-gradient(900px 360px at 90% 25%, rgba(217,70,239,0.16), rgba(0,0,0,0) 62%)",
          }}
        />
        <div
          className="absolute -inset-x-40 -inset-y-10 blur-xl"
          style={{
            animation: "swSweep 14s ease-in-out infinite",
            background:
              "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.10) 45%, rgba(255,255,255,0) 100%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:py-8 lg:py-10">
        <div className="grid items-start gap-6 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-7">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="cyan">DoorDash for services</Pill>
              <Pill tone="indigo">One system</Pill>
              <Pill tone="fuchsia">One login</Pill>
              <Pill tone="emerald">Built for operators</Pill>
            </div>

            <div>
              <div className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl md:text-5xl">
                <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-fuchsia-400 bg-clip-text text-transparent">
                  SyncWorks
                </span>
                <div className="mt-2 text-slate-100">
                  Requests → scheduling → payments — all connected.
                </div>
              </div>

              <div className="mt-4 max-w-2xl text-base leading-relaxed text-slate-200/90 sm:text-lg">
                Customers request help. Businesses run operations. Property managers run portfolios.
                <b> Everyone stays in one system.</b>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to="/register"
                  className="rounded-2xl border border-fuchsia-500/35 bg-fuchsia-500/10 px-4 py-2 text-sm font-semibold text-fuchsia-200 hover:bg-fuchsia-500/15"
                >
                  Create Account
                </Link>
                <Link
                  to="/register"
                  className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-2 text-sm hover:bg-slate-900/40"
                >
                  How it works
                </Link>
                <Link
                  to="/tenant/accept"
                  className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-2 text-sm hover:bg-slate-900/40"
                >
                  Tenant Invite
                </Link>
                <Link
                  to="/investor/accept"
                  className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-2 text-sm hover:bg-slate-900/40"
                >
                  Investor Claim
                </Link>
              </div>
            </div>

            <Card title="What SyncWorks replaces" subtitle="Stop bouncing between apps.">
              <div className="space-y-2">
                <Bullet>Scheduling tools + invoicing apps + message threads + spreadsheets.</Bullet>
                <Bullet>Multiple logins, scattered receipts, missed follow-ups.</Bullet>
                <Bullet>
                  SyncWorks becomes your <b>single source of truth</b> — one timeline, one board, one workflow.
                </Bullet>
              </div>
            </Card>

            <div className="grid gap-3 md:grid-cols-2">
              <Card title="Marketplace layer" subtitle="How work gets found.">
                <div className="space-y-2">
                  <Bullet>Customer submits a request.</Bullet>
                  <Bullet>Routed by ZIP + business service settings.</Bullet>
                  <Bullet>The right businesses get notified and accept the job.</Bullet>
                </div>
              </Card>

              <Card title="Operations layer" subtitle="How work gets done.">
                <div className="space-y-2">
                  <Bullet>Track the job, schedule it, message, invoice, get paid.</Bullet>
                  <Bullet>Assign your team and keep everything tied to the ticket.</Bullet>
                  <Bullet>Automation handles the busywork as you grow.</Bullet>
                </div>
              </Card>
            </div>

            <Card title="Who it’s for" subtitle="Same platform — different roles.">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
                  <div className="text-sm font-semibold">Customers</div>
                  <div className="mt-1 text-sm text-slate-400">Request help, track updates, schedule, pay, save receipts.</div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
                  <div className="text-sm font-semibold">Small Businesses</div>
                  <div className="mt-1 text-sm text-slate-400">Tickets, dispatch, schedule, invoices, payments, team ops.</div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
                  <div className="text-sm font-semibold">Property Managers</div>
                  <div className="mt-1 text-sm text-slate-400">Portfolio ops, workflows, vendors, tenants, accountability.</div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
                  <div className="text-sm font-semibold">Tenant + Investor</div>
                  <div className="mt-1 text-sm text-slate-400">Invite-code portals — clean access, no shared logins.</div>
                </div>
              </div>
            </Card>

            <div className="max-w-2xl text-[12px] text-slate-400">
              Built from experience — not theory. Simple. Connected. Affordable.
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="mx-auto mt-2 w-full max-w-xl lg:sticky lg:top-6 lg:max-w-none">
              <LoginCard
                emailOrUser={emailOrUser}
                setEmailOrUser={setEmailOrUser}
                password={password}
                setPassword={setPassword}
                err={err}
                loading={loading}
                onSubmit={onSubmit}
              />
            </div>
          </div>
        </div>

        <div className="mt-10 text-center text-[11px] text-slate-500">
          © {new Date().getFullYear()} SyncWorks — Built for operators.
        </div>
      </div>
    </div>
  );
}