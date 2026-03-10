// src/pages/PMEmployees.jsx
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
      : tone === "red"
      ? "border-red-500/40 text-red-200 bg-red-500/10"
      : "border-slate-700 text-slate-300 bg-slate-950/40";
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full border text-[11px] ${cls}`}>
      {children}
    </span>
  );
}

// MUST match backend OPTIONS choices
const ROLE_OPTIONS = [
  { key: "ADMIN", label: "Admin" },
  { key: "MANAGER", label: "Manager" },
  { key: "ACCOUNTING", label: "Accounting" },
  { key: "LEASING", label: "Leasing" },
  { key: "MAINTENANCE", label: "Maintenance" },
  { key: "TECHNICIAN", label: "Technician" },
  { key: "VIEW_ONLY", label: "View Only" },
];

// MUST match backend boolean fields
const PERMS = [
  { key: "can_manage_properties", label: "Properties/Units" },
  { key: "can_manage_tenants", label: "Tenants" },
  { key: "can_manage_documents", label: "Documents" },
  { key: "can_manage_work_orders", label: "Work Orders" },
  { key: "can_view_financials", label: "View Financials" },
  { key: "can_manage_financials", label: "Manage Financials" },
  { key: "can_manage_employees", label: "Employees/Admin" },
];

function toneForRole(role) {
  const r = String(role || "").toUpperCase();
  if (r === "ACCOUNTING") return "amber";
  if (r === "MANAGER" || r === "ADMIN") return "emerald";
  if (r === "TECHNICIAN" || r === "MAINTENANCE") return "cyan";
  return "slate";
}

export default function PMEmployees() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [seats, setSeats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [invites, setInvites] = useState([]);

  // Invite modal
  const [showInvite, setShowInvite] = useState(false);
  const [inviting, setInviting] = useState(false);

  const [inviteForm, setInviteForm] = useState({
    email: "",
    full_name: "",
    job_title: "",
    role: "TECHNICIAN",
    can_view_financials: false,
    can_manage_financials: false,
    can_manage_properties: false,
    can_manage_tenants: false,
    can_manage_documents: false,
    can_manage_work_orders: true,
    can_manage_employees: false,
  });

  // Accept invite flow (employee user is logged in)
  const [acceptCode, setAcceptCode] = useState("");
  const [accepting, setAccepting] = useState(false);

  const activeCount = useMemo(() => employees.filter((e) => !!e.is_active).length, [employees]);

  function toastOk(msg) {
    setOk(msg || "");
    setErr("");
  }
  function toastErr(msg) {
    setErr(msg || "Something went wrong.");
    setOk("");
  }

  async function loadAll() {
    setLoading(true);
    setErr("");
    setOk("");

    try {
      const [seatRes, empRes, invRes] = await Promise.allSettled([
        api.get("/pm/employees/seats/"),
        api.get("/pm/employees/"),
        api.get("/pm/employees/invites/"),
      ]);

      if (seatRes.status === "fulfilled") setSeats(seatRes.value.data);
      if (empRes.status === "fulfilled") {
        const d = empRes.value.data;
        setEmployees(Array.isArray(d?.results) ? d.results : Array.isArray(d) ? d : []);
      } else {
        setEmployees([]);
        toastErr(empRes.reason?.response?.data?.detail || "Failed to load employees.");
      }

      if (invRes.status === "fulfilled") {
        const d = invRes.value.data;
        setInvites(Array.isArray(d?.results) ? d.results : Array.isArray(d) ? d : []);
      } else {
        setInvites([]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createInvite() {
    setInviting(true);
    setErr("");
    setOk("");

    try {
      const payload = { ...inviteForm };

      // ✅ correct endpoint
      const r = await api.post("/pm/employees/invites/", payload);

      // backend returns the invite object directly
      const inv = r?.data;

      toastOk("Invite created. Code copied (if clipboard allowed).");
      setShowInvite(false);
      setInviteForm((x) => ({
        ...x,
        email: "",
        full_name: "",
        job_title: "",
        role: "TECHNICIAN",
      }));

      await loadAll();

      if (inv?.code && navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(inv.code).catch(() => {});
      }
    } catch (e) {
      const d = e?.response?.data;
      toastErr(d?.detail || "Failed to create invite.");
    } finally {
      setInviting(false);
    }
  }

  async function acceptInvite() {
    setAccepting(true);
    setErr("");
    setOk("");

    try {
      // ✅ correct endpoint
      await api.post("/pm/employees/invites/accept/", { code: acceptCode.trim() });
      toastOk("Invite accepted. This user is now linked to the PM employee record.");
      setAcceptCode("");
      await loadAll();
    } catch (e) {
      const d = e?.response?.data;
      toastErr(d?.detail || "Failed to accept invite.");
    } finally {
      setAccepting(false);
    }
  }

  async function patchEmp(empId, patch) {
    const r = await api.patch(`/pm/employees/${empId}/`, patch);
    return r.data;
  }

  async function toggleActive(emp) {
    try {
      const next = !emp.is_active;

      // friendly UI guard; backend enforces too
      if (next && seats && !seats.can_add_more) {
        toastErr(`Free plan allows ${seats.free_seats} active employee seats. Upgrade to add more.`);
        return;
      }

      const updated = await patchEmp(emp.id, { is_active: next });
      setEmployees((prev) => prev.map((x) => (x.id === emp.id ? updated : x)));
      toastOk(next ? "Employee activated." : "Employee deactivated.");
      await loadAll(); // refresh seats counts too
    } catch (e) {
      toastErr(e?.response?.data?.detail || "Update failed.");
    }
  }

  async function saveRole(emp, patch) {
    try {
      const updated = await patchEmp(emp.id, patch);
      setEmployees((prev) => prev.map((x) => (x.id === emp.id ? updated : x)));
      toastOk("Updated.");
    } catch (e) {
      toastErr(e?.response?.data?.detail || "Update failed.");
    }
  }

  async function savePerm(emp, key, value) {
    try {
      const updated = await patchEmp(emp.id, { [key]: value });
      setEmployees((prev) => prev.map((x) => (x.id === emp.id ? updated : x)));
    } catch (e) {
      toastErr(e?.response?.data?.detail || "Permission update failed.");
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar
        title="PM Employees"
        subtitle="Roles • Titles • Permissions • Seats"
        rightActions={
          <div className="flex gap-2 flex-wrap">
            <Button tone="slate" onClick={() => nav("/pm")}>Back</Button>
            <Button tone="slate" onClick={loadAll} disabled={loading}>Refresh</Button>
            <Button tone="cyan" onClick={() => setShowInvite(true)} disabled={loading || (seats && !seats.can_add_more)}>
              Invite
            </Button>
          </div>
        }
      />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {err ? (
          <div className="text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-2xl p-3">{err}</div>
        ) : null}
        {ok ? (
          <div className="text-sm text-emerald-200 bg-emerald-900/15 border border-emerald-700/30 rounded-2xl p-3">
            {ok}
          </div>
        ) : null}

        <Card
          title="Seat usage"
          subtitle="Free plan: 3 active employees (superuser bypass)"
          right={
            <div className="flex items-center gap-2">
              <Pill tone="cyan">{activeCount} active</Pill>
              <Pill tone="slate">{seats?.free_seats ?? 3} free</Pill>
              {seats?.can_add_more ? <Pill tone="emerald">Can add</Pill> : <Pill tone="red">Limit</Pill>}
            </div>
          }
        >
          <div className="text-sm text-slate-300">
            Only ACTIVE employees count toward seats. Deactivate old staff to stay under the free limit.
          </div>
        </Card>

        <Card
          title="Accept invite (employee login flow)"
          subtitle="Paste invite code while logged in as the employee user"
          right={<Pill tone="slate">SSO link</Pill>}
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
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Your PowerShell test failed because you used <span className="font-mono">PASTE_CODE_HERE</span>. Use the real code like{" "}
            <span className="font-mono text-slate-300">BAtfcm-6HpiCdqZTs1WEjg</span>.
          </div>
        </Card>

        <Card title="Employees" subtitle="Manage roles and permissions">
          {loading ? (
            <div className="text-slate-400">Loading…</div>
          ) : employees.length === 0 ? (
            <div className="text-slate-400">No employees yet. Click Invite to add staff.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400">
                    <th className="text-left font-medium py-2">Employee</th>
                    <th className="text-left font-medium py-2">Role / Title</th>
                    <th className="text-left font-medium py-2">Permissions</th>
                    <th className="text-right font-medium py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((e) => (
                    <tr key={e.id} className="border-t border-slate-900/80 align-top">
                      <td className="py-3">
                        <div className="font-semibold">{e.full_name || "—"}</div>
                        <div className="text-xs text-slate-500">{e.email}</div>
                        <div className="text-xs text-slate-600 mt-1">ID #{e.id}</div>
                      </td>

                      <td className="py-3 min-w-[280px]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Pill tone={toneForRole(e.role)}>{String(e.role || "").replace("_", " ")}</Pill>
                          <select
                            value={e.role || "TECHNICIAN"}
                            onChange={(ev) => saveRole(e, { role: ev.target.value })}
                            className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs"
                          >
                            {ROLE_OPTIONS.map((r) => (
                              <option key={r.key} value={r.key}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="mt-2 grid md:grid-cols-2 gap-2">
                          <div>
                            <div className="text-xs text-slate-400 mb-1">Full name</div>
                            <input
                              value={e.full_name || ""}
                              onChange={(ev) => saveRole(e, { full_name: ev.target.value })}
                              className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                              placeholder="Tech One"
                            />
                          </div>
                          <div>
                            <div className="text-xs text-slate-400 mb-1">Job title</div>
                            <input
                              value={e.job_title || ""}
                              onChange={(ev) => saveRole(e, { job_title: ev.target.value })}
                              className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                              placeholder="Maintenance Tech"
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3">
                        <div className="grid grid-cols-2 gap-2 min-w-[320px]">
                          {PERMS.map((p) => (
                            <label
                              key={p.key}
                              className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/40 px-3 py-2"
                            >
                              <input
                                type="checkbox"
                                checked={!!e[p.key]}
                                onChange={(ev) => savePerm(e, p.key, ev.target.checked)}
                              />
                              <span className="text-xs text-slate-200">{p.label}</span>
                            </label>
                          ))}
                        </div>

                        <div className="mt-2 text-[11px] text-slate-500">
                          Suggested: Maintenance/Tech = Work Orders only. Accounting = View/Manage Financials only.
                        </div>
                      </td>

                      <td className="py-3 text-right">
                        <div className="flex flex-col items-end gap-2">
                          <Pill tone={e.is_active ? "emerald" : "red"}>{e.is_active ? "ACTIVE" : "INACTIVE"}</Pill>
                          <Button tone="slate" onClick={() => toggleActive(e)}>
                            {e.is_active ? "Deactivate" : "Activate"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Invites" subtitle="Pending employee invites (copy code to send to staff)">
          {invites.length === 0 ? (
            <div className="text-slate-400">No invites.</div>
          ) : (
            <div className="space-y-2">
              {invites.map((inv) => (
                <div key={inv.id} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="font-semibold">{inv.email}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        Expires:{" "}
                        <span className="text-slate-200">
                          {inv.expires_at ? new Date(inv.expires_at).toLocaleString() : "—"}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        Code: <span className="text-slate-200 font-mono">{inv.code}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        tone="slate"
                        onClick={() => {
                          if (navigator?.clipboard?.writeText) navigator.clipboard.writeText(inv.code).catch(() => {});
                          toastOk("Invite code copied.");
                        }}
                      >
                        Copy Code
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {showInvite ? (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-950/95 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">Invite Employee</div>
                  <div className="text-xs text-slate-400 mt-1">Creates an invite code (email automation later)</div>
                </div>
                <Button tone="slate" onClick={() => setShowInvite(false)} disabled={inviting}>
                  Close
                </Button>
              </div>

              <div className="mt-4 grid md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <div className="text-xs text-slate-400 mb-1">Employee email</div>
                  <input
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2 text-sm"
                    placeholder="employee@email.com"
                  />
                </div>

                <div>
                  <div className="text-xs text-slate-400 mb-1">Full name (optional)</div>
                  <input
                    value={inviteForm.full_name}
                    onChange={(e) => setInviteForm((p) => ({ ...p, full_name: e.target.value }))}
                    className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                    placeholder="Tech Two"
                  />
                </div>

                <div>
                  <div className="text-xs text-slate-400 mb-1">Job title (optional)</div>
                  <input
                    value={inviteForm.job_title}
                    onChange={(e) => setInviteForm((p) => ({ ...p, job_title: e.target.value }))}
                    className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                    placeholder="Maintenance Tech"
                  />
                </div>

                <div>
                  <div className="text-xs text-slate-400 mb-1">Role</div>
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm((p) => ({ ...p, role: e.target.value }))}
                    className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.key} value={r.key}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <div className="text-xs text-slate-400 mb-2">Permissions</div>
                  <div className="grid md:grid-cols-3 gap-2">
                    {PERMS.map((p) => (
                      <label
                        key={p.key}
                        className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/40 px-3 py-2"
                      >
                        <input
                          type="checkbox"
                          checked={!!inviteForm[p.key]}
                          onChange={(e) => setInviteForm((x) => ({ ...x, [p.key]: e.target.checked }))}
                        />
                        <span className="text-xs text-slate-200">{p.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button tone="cyan" onClick={createInvite} disabled={inviting || !inviteForm.email.trim()}>
                  {inviting ? "Creating…" : "Create Invite"}
                </Button>
                <Button tone="slate" onClick={() => setShowInvite(false)} disabled={inviting}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
