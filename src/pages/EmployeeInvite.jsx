// src/pages/EmployeeInvite.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../api/client";
import Button from "../components/ui/Button";
import { useAuth } from "../auth/AuthContext";

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
  const { reloadBusinesses, setActiveBusinessId, setMode } = useAuth();
  const q = useQuery();

  // Older invitation emails contained escaped newlines appended to the URL.
  const cleanInviteCode = (value) => String(value || "").split(/\\n|\r|\n/)[0].trim();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [me, setMe] = useState(null);

  const [code, setCode] = useState(() => cleanInviteCode(q.get("code")));
  const [accepting, setAccepting] = useState(false);

  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  const nextUrl = useMemo(() => {
    const c = encodeURIComponent(cleanInviteCode(code || q.get("code")));
    return `/employee/invite${c ? `?code=${c}` : ""}`;
  }, [code, q]);

  const isAuthed = !!me && !me?.detail;
  const loginLink = `/login?next=${encodeURIComponent(nextUrl)}`;
  const signupLink = `/register?role=personal&next=${encodeURIComponent(nextUrl)}`;

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
    const incoming = cleanInviteCode(q.get("code"));
    if (incoming && !code) setCode(incoming);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function acceptInvite() {
    const trimmed = cleanInviteCode(code);
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
      const r = await api.post("/auth/employee-invites/accept/", { code: trimmed });

      if (r?.data?.business_id) setActiveBusinessId?.(r.data.business_id);
      await reloadBusinesses?.();
      setMode?.("EMPLOYEE");
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
    <div className="min-h-screen bg-[#020617] pb-40 text-slate-100">
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
              to={isAuthed ? "/employee" : loginLink}
              className="inline-flex items-center justify-center h-9 text-xs rounded-xl px-4 border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40 text-slate-200"
            >
              {isAuthed ? "Go to Employee" : "Login"}
            </Link>

            {!isAuthed ? (
              <Link
                to={signupLink}
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
            subtitle="Use the same SyncWorks account for Personal and Employee workspaces. Your existing password stays unchanged."
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
                  <Link to={loginLink}>
                    <Button tone="cyan">Login</Button>
                  </Link>
                  <Link to={`/register?next=${encodeURIComponent(nextUrl)}`}>
                    <Button tone="slate">Create Account</Button>
                  </Link>
                </div>
                <div className="text-[11px] text-slate-500">
                  Create a free Personal account with the email that received this invitation. Your team access is added after accepting.
                </div>
              </div>
            )}
          </Card>

          <Card
            title="Step 2: Accept your invite"
            subtitle="Your employer sent a secure invitation link. The code is already filled in when you open it."
            right={<Pill tone="cyan">Secure</Pill>}
          >
            <div className="space-y-3">
              <div>
                <div className="text-xs text-slate-400 mb-1">Invitation code (filled automatically)</div>
                <input
                  value={code}
                  onChange={(e) => setCode(cleanInviteCode(e.target.value))}
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
