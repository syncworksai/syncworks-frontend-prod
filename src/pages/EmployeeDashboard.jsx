// src/pages/EmployeeDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import ModeBar from "../components/ModeBar";
import Button from "../components/ui/Button";

function Card({ title, subtitle, right, children }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-slate-100">{title}</div>
          {subtitle ? <div className="text-xs text-slate-400 mt-1">{subtitle}</div> : null}
        </div>
        {right}
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
      : tone === "purple"
      ? "border-fuchsia-500/40 text-fuchsia-200 bg-fuchsia-500/10"
      : tone === "red"
      ? "border-red-500/40 text-red-200 bg-red-500/10"
      : "border-slate-700 text-slate-300 bg-slate-950/40";
  return <span className={`inline-flex items-center px-2 py-1 rounded-full border text-[11px] ${cls}`}>{children}</span>;
}

function FeatureTile({ title, subtitle, tone = "slate", disabled, onClick, right }) {
  const base =
    "rounded-3xl border bg-slate-950/45 p-5 transition shadow-[0_0_40px_rgba(34,211,238,0.05)]";
  const cls = disabled
    ? `${base} border-slate-900/60 opacity-50 cursor-not-allowed`
    : `${base} border-slate-800 hover:bg-slate-900/40 cursor-pointer`;
  return (
    <div className={cls} onClick={disabled ? undefined : onClick} role="button" tabIndex={0}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-semibold">{title}</div>
            <Pill tone={tone}>{disabled ? "Locked" : "Enabled"}</Pill>
          </div>
          <div className="text-sm text-slate-300 mt-2">{subtitle}</div>
        </div>
        {right}
      </div>
    </div>
  );
}

export default function EmployeeDashboard() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // PM employee profile for the current user (for the selected X-Business-Id)
  const [me, setMe] = useState(null);

  // Accept invite inline (for employee accounts)
  const [acceptCode, setAcceptCode] = useState("");
  const [accepting, setAccepting] = useState(false);

  function toastOk(msg) {
    setOk(msg || "");
    setErr("");
  }
  function toastErr(msg) {
    setErr(msg || "Something went wrong.");
    setOk("");
  }

  const linked = !!(me && !me?.detail && (me?.id || me?.employee_id || me?.email));
  const can = useMemo(() => {
    const m = me || {};
    // default false, only true if backend says so
    return {
      can_manage_work_orders: !!m.can_manage_work_orders,
      can_manage_documents: !!m.can_manage_documents,
      can_manage_properties: !!m.can_manage_properties,
      can_manage_tenants: !!m.can_manage_tenants,
      can_manage_financials: !!m.can_manage_financials,
      can_view_financials: !!m.can_view_financials,
      can_manage_employees: !!m.can_manage_employees,
      // Investors: we’ll treat “manage properties” or “view financials” as likely investor-touch roles.
      can_access_investors: !!m.can_manage_properties || !!m.can_view_financials || !!m.can_manage_financials,
    };
  }, [me]);

  async function loadMe() {
    // We try /pm/employees/me/ if it exists; otherwise we fall back gracefully.
    try {
      const r = await api.get("/pm/employees/me/");
      setMe(r.data);
      return r.data;
    } catch (e) {
      // Not wired yet or not linked — keep null and show onboarding
      setMe(null);

      // If endpoint exists but user isn't linked, some backends return 404/400 with detail.
      // We'll show a friendly message only if it’s not a 404 “not implemented”.
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail;
      if (status && status !== 404 && detail) {
        setErr(detail);
      }
      return null;
    }
  }

  async function loadAll() {
    setLoading(true);
    setErr("");
    setOk("");
    try {
      await loadMe();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function acceptInvite() {
    setAccepting(true);
    setErr("");
    setOk("");
    try {
      const code = acceptCode.trim();
      if (!code) {
        toastErr("Invite code is required.");
        setAccepting(false);
        return;
      }

      // ✅ Backend path you already validated:
      await api.post("/pm/employees/invites/accept/", { code });

      toastOk("Invite accepted. Your employee access is now linked to this business.");
      setAcceptCode("");
      await loadAll();
    } catch (e) {
      toastErr(e?.response?.data?.detail || "Failed to accept invite.");
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar
        title="Employee"
        subtitle="Work Orders • Documents • Investors • Operations"
        rightActions={
          <div className="flex gap-2 flex-wrap">
            <Button tone="slate" onClick={() => nav("/pm")}>
              PM
            </Button>
            <Button tone="slate" onClick={() => nav("/customer")}>
              Customer
            </Button>
            <Button tone="slate" onClick={loadAll} disabled={loading}>
              Refresh
            </Button>
          </div>
        }
      />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {err ? (
          <div className="text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-2xl p-3">{err}</div>
        ) : null}
        {ok ? (
          <div className="text-sm text-emerald-200 bg-emerald-900/15 border border-emerald-700/30 rounded-2xl p-3">{ok}</div>
        ) : null}

        {/* HERO */}
        <div className="rounded-[28px] border border-slate-800 bg-slate-950/35 p-6 overflow-hidden relative">
          <div className="pointer-events-none absolute inset-0 opacity-70">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
            <div className="absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
          </div>

          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-[260px]">
              <div className="text-xs text-slate-400 tracking-widest">EMPLOYEE ACCESS</div>
              <div className="text-2xl font-extrabold mt-1">Operations Dashboard</div>
              <div className="text-sm text-slate-300 mt-2 max-w-2xl">
                Your permissions are assigned by your Property Manager. You’ll only see what you’re allowed to touch —
                technicians won’t see accounting, and accounting won’t see dispatch tools unless enabled.
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {linked ? <Pill tone="emerald">Linked</Pill> : <Pill tone="amber">Not linked</Pill>}
              {linked && me?.role ? <Pill tone="cyan">{String(me.role).replace("_", " ")}</Pill> : null}
              {linked && me?.job_title ? <Pill tone="slate">{me.job_title}</Pill> : null}
            </div>
          </div>
        </div>

        {/* ONBOARDING (NOT LINKED) */}
        {!linked ? (
          <div className="grid md:grid-cols-2 gap-4">
            <Card
              title="Accept your invite"
              subtitle="Paste the invite code your PM sent you (works with single sign-on)"
              right={<Pill tone="cyan">SSO link</Pill>}
            >
              <div className="flex gap-2 flex-wrap">
                <input
                  value={acceptCode}
                  onChange={(e) => setAcceptCode(e.target.value)}
                  className="w-full md:w-[360px] rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2 text-sm"
                  placeholder="Invite code"
                />
                <Button tone="cyan" onClick={acceptInvite} disabled={accepting || !acceptCode.trim()}>
                  {accepting ? "Accepting…" : "Accept Invite"}
                </Button>
                <Button tone="slate" onClick={() => nav("/employee/invite")}>
                  Open Invite Link Page
                </Button>
              </div>

              <div className="mt-3 text-xs text-slate-500">
                Tip: if your PM emailed you a link, it should point to{" "}
                <span className="text-slate-300 font-mono">/employee/invite?code=...</span>.
              </div>
            </Card>

            <Card
              title="Grow the flywheel"
              subtitle="Employees can also use SyncWorks as customers (optional)."
              right={<Pill tone="purple">Osmosis</Pill>}
            >
              <div className="text-sm text-slate-300">
                If you want to request services personally (outside of your employee role), you can still use Customer
                mode — same login, different access.
              </div>
              <div className="mt-4 flex gap-2 flex-wrap">
                <Button tone="slate" onClick={() => nav("/customer")}>
                  Go to Customer
                </Button>
                <Button tone="slate" onClick={() => nav("/register")}>
                  Register another account
                </Button>
              </div>
            </Card>
          </div>
        ) : null}

        {/* MAIN TILES */}
        {linked ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureTile
              title="Work Orders"
              tone="cyan"
              subtitle="View assigned jobs, update status, add notes/photos, and close out work."
              disabled={!can.can_manage_work_orders}
              onClick={() => nav("/pm")} // we’ll deep link to /employee/work-orders next
              right={<span className="text-xs text-slate-500">Next: /employee/work-orders</span>}
            />

            <FeatureTile
              title="Documents"
              tone="purple"
              subtitle="View assigned docs, upload requested files, and track compliance items."
              disabled={!can.can_manage_documents}
              onClick={() => nav("/pm")} // deep link later
              right={<span className="text-xs text-slate-500">Next: /employee/documents</span>}
            />

            <FeatureTile
              title="Tenants"
              tone="amber"
              subtitle="Tenant directory, contact info, lease status, and issue history (permissioned)."
              disabled={!can.can_manage_tenants}
              onClick={() => nav("/pm")} // deep link later
              right={<span className="text-xs text-slate-500">Next: /employee/tenants</span>}
            />

            <FeatureTile
              title="Properties & Units"
              tone="emerald"
              subtitle="Portfolio view for staff: addresses, unit labels, occupancy, and notes."
              disabled={!can.can_manage_properties}
              onClick={() => nav("/pm")} // deep link later
              right={<span className="text-xs text-slate-500">Next: /employee/properties</span>}
            />

            <FeatureTile
              title="Section 8"
              tone="amber"
              subtitle="Recerts, inspection deadlines, packet readiness, and agent communication."
              disabled={!can.can_manage_documents && !can.can_manage_properties}
              onClick={() => nav("/pm")} // deep link later
              right={<span className="text-xs text-slate-500">Next: /employee/section8</span>}
            />

            <FeatureTile
              title="Investors"
              tone="slate"
              subtitle="Onboard owners/investors, attach properties correctly, and keep comms organized."
              disabled={!can.can_access_investors}
              onClick={() => nav("/pm")} // deep link later to investors area
              right={<span className="text-xs text-slate-500">Next: /pm?tab=investors</span>}
            />

            <FeatureTile
              title="Finance"
              tone="amber"
              subtitle="Rent collected, past due, owner statements, and reconciliation (restricted)."
              disabled={!can.can_view_financials && !can.can_manage_financials}
              onClick={() => nav("/pm")} // deep link later
              right={<span className="text-xs text-slate-500">Restricted</span>}
            />

            <FeatureTile
              title="Customer Mode"
              tone="cyan"
              subtitle="Use SyncWorks personally (separate from your employee permissions)."
              disabled={false}
              onClick={() => nav("/customer")}
              right={<Pill tone="cyan">Optional</Pill>}
            />
          </div>
        ) : null}

        {/* INVESTOR NOTES (clarifies how it works) */}
        {linked ? (
          <Card
            title="How Investors works (production plan)"
            subtitle="This becomes the owner portal + onboarding + communications hub"
            right={<Pill tone="emerald">Ready to build</Pill>}
          >
            <div className="text-sm text-slate-300 space-y-2">
              <div>
                <span className="text-slate-100 font-semibold">Investor page</span> is where you onboard owners, attach
                properties, store contacts, and generate statements.
              </div>
              <div>
                Employees with investor-touch permissions can contact owners, log calls/emails, and route maintenance
                updates through Work Orders (so everything stays auditable).
              </div>
              <div className="text-xs text-slate-500">
                Next step: we’ll wire a real Investors module and deep-link these tiles to specific pages.
              </div>
            </div>
          </Card>
        ) : null}

        <div className="text-[11px] text-slate-500">
          Production rule: employee visibility must be permission-gated everywhere (frontend + backend). We’ll enforce this
          in the next files by hiding PM tabs + blocking endpoints.
        </div>
      </main>
    </div>
  );
}
