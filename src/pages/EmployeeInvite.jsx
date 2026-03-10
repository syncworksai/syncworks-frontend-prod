// src/pages/EmployeeInvite.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../api/client";
import Button from "../components/ui/Button";

function Card({ title, subtitle, right, children }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-slate-100">{title}</div>
          {subtitle ? <div className="text-sm text-slate-400 mt-1">{subtitle}</div> : null}
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Pill({ children, tone = "slate" }) {
  const cls =
    tone === "cyan"
      ? "border-cyan-500/40 text-cyan-200 bg-cyan-500/10"
      : tone === "emerald"
      ? "border-emerald-500/40 text-emerald-200 bg-emerald-500/10"
      : tone === "amber"
      ? "border-amber-500/40 text-amber-200 bg-amber-500/10"
      : tone === "red"
      ? "border-red-500/40 text-red-200 bg-red-500/10"
      : "border-slate-700 text-slate-300 bg-slate-950/40";
  return <span className={`inline-flex items-center px-2 py-1 rounded-full border text-[11px] ${cls}`}>{children}</span>;
}

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function EmployeeInvite() {
  const nav = useNavigate();
  const q = useQuery();

  const inputRef = useRef(null);

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [me, setMe] = useState(null);

  const [code, setCode] = useState(q.get("code") || "");
  const [accepting, setAccepting] = useState(false);

  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  const nextUrl = useMemo(() => {
    const c = encodeURIComponent(code || q.get("code") || "");
    return `/employee/invite${c ? `?code=${c}` : ""}`;
  }, [code, q]);

  const isAuthed = !!me && !me?.detail;

  async function checkAuth() {
    setCheckingAuth(true);
    setErr("");
    try {
      // Confirms token-based login.
      const r = await api.get("/auth/me/");
      setMe(r.data);
    } catch {
      setMe(null);
    } finally {
      setCheckingAuth(false);
    }
  }

  // Keep code in sync if user arrives with ?code=
  useEffect(() => {
    const incoming = q.get("code") || "";
    if (incoming && !code) setCode(incoming);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autofocus code box if present / useful
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function acceptInvite() {
    const trimmed = String(code || "").trim();
    if (!trimmed) {
      setErr("Invite code is required.");
      return;
    }
    if (!isAuthed) {
      setErr("Please login first, then accept your invite.");
      return;
    }

    setAccepting(true);
    setErr("");
    setOk("");

    try {
      // ✅ IMPORTANT:
      // This endpoint does NOT need X-Business-Id because the invite code determines the business.
      const r = await api.post("/pm/employees/invites/accept/", { code: trimmed });

      setOk(r?.data?.detail || "Invite accepted.");
      setErr("");

      // Go straight to employee dashboard. This is the “landing page” after email link.
      nav("/employee", { replace: true });
    } catch (e) {
      const d = e?.response?.data;
      setErr(d?.detail || "Failed to accept invite.");
      setOk("");
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      {/* Minimal public header (no ModeBar; avoids BusinessPicker dependency) */}
      <div className="border-b border-slate-900/80 bg-slate-950/40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs text-slate-400 tracking-widest">SYNCWORKS</div>
            <div className="text-xl font-extrabold">Employee Invite</div>
            <div className="text-sm text-slate-400 mt-1">Join your team securely — then unlock your workspace.</div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={isAuthed ? "/employee" : `/login?next=${encodeURIComponent(nextUrl)}`}
              className="inline-flex items-center justify-center h-9 text-xs rounded-xl px-4 border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40 text-slate-200"
            >
              {isAuthed ? "Go to Employee" : "Login"}
            </Link>

            {!isAuthed ? (
              <Link
                to={`/register?next=${encodeURIComponent(nextUrl)}`}
                className="inline-flex items-center justify-center h-9 text-xs rounded-xl px-4 border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200"
              >
                Create Account
              </Link>
            ) : (
              <Link
                to="/customer"
                className="inline-flex items-center justify-center h-9 text-xs rounded-xl px-4 border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40 text-slate-200"
              >
                Customer Mode
              </Link>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {err ? (
          <div className="text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-2xl p-3">{err}</div>
        ) : null}
        {ok ? (
          <div className="text-sm text-emerald-200 bg-emerald-900/15 border border-emerald-700/30 rounded-2xl p-3">
            {ok}
          </div>
        ) : null}

        <div className="grid md:grid-cols-2 gap-4">
          <Card
            title="Step 1: Login or create your account"
            subtitle="This supports SSO — employee and customer can be the same login (optional)."
            right={
              checkingAuth ? (
                <Pill tone="slate">Checking…</Pill>
              ) : isAuthed ? (
                <Pill tone="emerald">Logged in</Pill>
              ) : (
                <Pill tone="amber">Not logged in</Pill>
              )
            }
          >
            {isAuthed ? (
              <div className="space-y-3">
                <div className="text-sm text-slate-300">
                  You’re logged in as{" "}
                  <span className="text-slate-100 font-semibold">{me?.email || "your account"}</span>.
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                  <div className="text-sm text-slate-200 font-semibold">Optional: enable Customer Mode</div>
                  <div className="text-sm text-slate-300 mt-1">
                    Want to use SyncWorks personally (outside your employee permissions)? You can.
                  </div>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <Button tone="slate" onClick={() => nav("/customer")}>
                      Go to Customer
                    </Button>
                    <Button tone="slate" onClick={() => nav("/register")}>
                      Create separate account
                    </Button>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-2">
                    Recommended for growth: one login, two “modes” (employee permissions don’t leak into customer tools).
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm text-slate-300">
                  If you already have a SyncWorks account, login and you’ll return here automatically.
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Link to={`/login?next=${encodeURIComponent(nextUrl)}`}>
                    <Button tone="cyan">Login</Button>
                  </Link>
                  <Link to={`/register?next=${encodeURIComponent(nextUrl)}`}>
                    <Button tone="slate">Create Account</Button>
                  </Link>
                </div>
                <div className="text-[11px] text-slate-500">
                  Later: we’ll support “employee-only account” onboarding too (no customer profile created unless they
                  choose).
                </div>
              </div>
            )}
          </Card>

          <Card
            title="Step 2: Accept your invite"
            subtitle="Paste the invite code from your email (or it may already be in the link)."
            right={<Pill tone="cyan">Secure</Pill>}
          >
            <div className="space-y-3">
              <div>
                <div className="text-xs text-slate-400 mb-1">Invite code</div>
                <input
                  ref={inputRef}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2 text-sm"
                  placeholder="e.g., BAtfcm-6HpiCdqZTs1WEjg"
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button tone="cyan" onClick={acceptInvite} disabled={!isAuthed || accepting || !String(code).trim()}>
                  {accepting ? "Accepting…" : "Accept Invite"}
                </Button>

                <Button
                  tone="slate"
                  onClick={() => {
                    setErr("");
                    setOk("");
                    checkAuth();
                  }}
                  disabled={checkingAuth}
                >
                  Refresh Login Status
                </Button>
              </div>

              {!isAuthed ? <div className="text-[11px] text-slate-500">You must be logged in to accept an invite.</div> : null}
            </div>
          </Card>
        </div>

        <Card title="After you join" subtitle="What happens next" right={<Pill tone="slate">Roadmap</Pill>}>
          <div className="grid md:grid-cols-3 gap-3 text-sm text-slate-300">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="font-semibold text-slate-100">Employee Dashboard</div>
              <div className="mt-1 text-slate-300">You’ll see only what your role allows (techs don’t see accounting).</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="font-semibold text-slate-100">Work Orders + Comms</div>
              <div className="mt-1 text-slate-300">Maintenance requests can be routed and tracked with full audit logs.</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="font-semibold text-slate-100">HR / Training Upsell</div>
              <div className="mt-1 text-slate-300">Next: onboarding checklists + progress tracking + training modules.</div>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
