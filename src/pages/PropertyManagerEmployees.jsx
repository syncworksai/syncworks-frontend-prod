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
      : tone === "rose"
      ? "border-rose-500/40 text-rose-200 bg-rose-500/10"
      : "border-slate-700 text-slate-300 bg-slate-950/40";

  return <span className={`inline-flex items-center px-2 py-1 rounded-full border text-[11px] ${cls}`}>{children}</span>;
}

const ROLES = [
  { key: "ADMIN", label: "Admin" },
  { key: "MANAGER", label: "Manager" },
  { key: "ACCOUNTING", label: "Accounting" },
  { key: "LEASING", label: "Leasing" },
  { key: "MAINTENANCE", label: "Maintenance" },
  { key: "TECHNICIAN", label: "Technician" },
  { key: "VIEW_ONLY", label: "View Only" },
];

function roleDefaults(role) {
  const r = String(role || "").toUpperCase();
  const base = {
    can_view_financials: false,
    can_manage_financials: false,
    can_manage_properties: false,
    can_manage_tenants: false,
    can_manage_documents: false,
    can_manage_work_orders: false,
    can_manage_employees: false,
  };

  if (r === "ADMIN") {
    return {
      ...base,
      can_view_financials: true,
      can_manage_financials: true,
      can_manage_properties: true,
      can_manage_tenants: true,
      can_manage_documents: true,
      can_manage_work_orders: true,
      can_manage_employees: true,
    };
  }

  if (r === "MANAGER") {
    return {
      ...base,
      can_view_financials: true,
      can_manage_properties: true,
      can_manage_tenants: true,
      can_manage_documents: true,
      can_manage_work_orders: true,
    };
  }

  if (r === "ACCOUNTING") {
    return { ...base, can_view_financials: true, can_manage_financials: true };
  }

  if (r === "LEASING") {
    return { ...base, can_manage_tenants: true, can_manage_documents: true };
  }

  if (r === "MAINTENANCE" || r === "TECHNICIAN") {
    return { ...base, can_manage_work_orders: true };
  }

  return base;
}

export default function PropertyManagerEmployees() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [invites, setInvites] = useState([]);
  const [seats, setSeats] = useState(null);

  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    email: "",
    full_name: "",
    job_title: "",
    role: "TECHNICIAN",
    is_active: true,
    ...roleDefaults("TECHNICIAN"),
  });

  function toastOk(msg) {
    setOk(msg || "");
    setErr("");
  }
  function toastErr(msg) {
    setErr(msg || "Something went wrong.");
    setOk("");
  }

  async function tryList(path) {
    const r = await api.get(path);
    const data = r.data;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data)) return data;
    return [];
  }

  async function loadAll() {
    setLoading(true);
    setErr("");
    setOk("");

    try {
      const [emps, invs, seat] = await Promise.all([
        tryList("/pm/employees/").catch(() => []),
        tryList("/pm/employees/invites/").catch(() => []),
        api.get("/pm/employees/seats/").then((r) => r.data).catch(() => null),
      ]);

      setEmployees(emps);
      setInvites(invs);
      setSeats(seat);
    } catch (e) {
      toastErr(e?.response?.data?.detail || e?.message || "Failed to load employees.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeCount = useMemo(() => employees.filter((e) => e.is_active).length, [employees]);
  const freeSeats = seats?.free_seats ?? 3;
  const canAddMore = seats?.can_add_more ?? activeCount < freeSeats;

  async function createEmployee() {
    setSaving(true);
    setErr("");
    setOk("");

    try {
      const payload = {
        email: form.email.trim().toLowerCase(),
        full_name: form.full_name.trim(),
        job_title: form.job_title.trim(),
        role: form.role,
        is_active: !!form.is_active,
        can_view_financials: !!form.can_view_financials,
        can_manage_financials: !!form.can_manage_financials,
        can_manage_properties: !!form.can_manage_properties,
        can_manage_tenants: !!form.can_manage_tenants,
        can_manage_documents: !!form.can_manage_documents,
        can_manage_work_orders: !!form.can_manage_work_orders,
        can_manage_employees: !!form.can_manage_employees,
      };

      if (!payload.email) throw new Error("Email is required.");

      const r = await api.post("/pm/employees/", payload);
      setEmployees((prev) => [r.data, ...(Array.isArray(prev) ? prev : [])]);

      toastOk("Employee created.");
      setShowAdd(false);
      setForm({
        email: "",
        full_name: "",
        job_title: "",
        role: "TECHNICIAN",
        is_active: true,
        ...roleDefaults("TECHNICIAN"),
      });

      // refresh seats
      const s = await api.get("/pm/employees/seats/").then((x) => x.data).catch(() => null);
      setSeats(s);
    } catch (e) {
      toastErr(e?.response?.data?.detail || e?.message || "Failed to create employee.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(emp) {
    try {
      const r = await api.patch(`/pm/employees/${emp.id}/`, { is_active: !emp.is_active });
      setEmployees((prev) => prev.map((x) => (x.id === emp.id ? r.data : x)));
      const s = await api.get("/pm/employees/seats/").then((x) => x.data).catch(() => null);
      setSeats(s);
    } catch (e) {
      toastErr(e?.response?.data?.detail || "Failed to update employee.");
    }
  }

  async function createInvite(email, employeeId = null) {
    try {
      const r = await api.post("/pm/employees/invites/", { email, employee_id: employeeId });
      setInvites((prev) => [r.data, ...(Array.isArray(prev) ? prev : [])]);
      toastOk("Invite created (copy the code and send to employee).");
    } catch (e) {
      toastErr(e?.response?.data?.detail || "Failed to create invite.");
    }
  }

  const seatTone = canAddMore ? "emerald" : "rose";

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar
        title="PM Employees"
        subtitle="Seats • Roles • Permissions • Invites"
        rightActions={
          <div className="flex gap-2 flex-wrap">
            <Button tone="slate" onClick={() => nav("/pm")}>Back</Button>
            <Button tone="slate" onClick={loadAll} disabled={loading}>Refresh</Button>
            <Button tone="cyan" onClick={() => setShowAdd(true)} disabled={!canAddMore}>
              Add Employee
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

        <div className="grid md:grid-cols-3 gap-4">
          <Card
            title="Seat usage"
            subtitle="Free includes 3 employees. Superuser bypass is enabled."
            right={<Pill tone={seatTone}>{activeCount}/{freeSeats} active</Pill>}
          >
            <div className="text-sm text-slate-300">
              {canAddMore ? (
                <>You can add more employees on the current plan.</>
              ) : (
                <>
                  You’ve hit the free seat cap.{" "}
                  <span className="text-slate-200">Upgrade</span> to add more seats.
                </>
              )}
            </div>

            <div className="mt-3 flex gap-2">
              <Button tone="slate" onClick={() => nav("/upgrade")}>Upgrade</Button>
              <Button tone="slate" onClick={() => toastOk("Next: billing hook for seat add-ons (per-seat pricing).")}>
                Pricing Notes
              </Button>
            </div>
          </Card>

          <Card title="Permission model" subtitle="Technicians shouldn’t see accounting.">
            <div className="text-sm text-slate-300 space-y-2">
              <div>• Financial tabs require <span className="text-slate-100">can_view_financials</span></div>
              <div>• Recording payments requires <span className="text-slate-100">can_manage_financials</span></div>
              <div>• Work orders require <span className="text-slate-100">can_manage_work_orders</span></div>
              <div className="text-xs text-slate-500 mt-2">
                Next: we’ll enforce these perms on backend endpoints too (not just UI hiding).
              </div>
            </div>
          </Card>

          <Card title="Invites" subtitle="SSO or separate login supported.">
            <div className="text-sm text-slate-300">
              Create an invite and send the employee the code. They’ll accept it while logged in.
            </div>
            <div className="mt-3">
              <Button
                tone="slate"
                onClick={() => toastOk("Next: Employee accept page (like TenantAcceptInvite) for /pm/employees/invites/accept/.")}
              >
                Build Accept Page Next
              </Button>
            </div>
          </Card>
        </div>

        <Card
          title="Employees"
          subtitle="Create employees, set roles, toggle active"
          right={loading ? <Pill>Loading…</Pill> : <Pill tone="cyan">{employees.length} total</Pill>}
        >
          {employees.length === 0 ? (
            <div className="text-sm text-slate-400">No employees yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400">
                    <th className="text-left font-medium py-2">Employee</th>
                    <th className="text-left font-medium py-2">Role</th>
                    <th className="text-left font-medium py-2">Permissions</th>
                    <th className="text-left font-medium py-2">Status</th>
                    <th className="text-right font-medium py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((e) => {
                    const perms = [
                      e.can_view_financials ? "View $ " : null,
                      e.can_manage_financials ? "Manage $ " : null,
                      e.can_manage_properties ? "Props " : null,
                      e.can_manage_tenants ? "Tenants " : null,
                      e.can_manage_documents ? "Docs " : null,
                      e.can_manage_work_orders ? "Work " : null,
                      e.can_manage_employees ? "Team " : null,
                    ].filter(Boolean);

                    return (
                      <tr key={e.id} className="border-t border-slate-900/80">
                        <td className="py-3">
                          <div className="font-semibold text-slate-100">{e.full_name || e.email}</div>
                          <div className="text-xs text-slate-500">{e.job_title || "—"}</div>
                          <div className="text-xs text-slate-500">#{e.id}</div>
                        </td>
                        <td className="py-3">
                          <Pill tone={e.role === "ACCOUNTING" ? "amber" : e.role === "ADMIN" ? "emerald" : "slate"}>
                            {String(e.role || "—").replace("_", " ")}
                          </Pill>
                        </td>
                        <td className="py-3">
                          {perms.length ? (
                            <div className="flex flex-wrap gap-2">
                              {perms.map((p) => (
                                <Pill key={p} tone="cyan">{p.trim()}</Pill>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-500">None</span>
                          )}
                        </td>
                        <td className="py-3">
                          {e.is_active ? <Pill tone="emerald">Active</Pill> : <Pill tone="rose">Inactive</Pill>}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex gap-2 justify-end flex-wrap">
                            <Button tone="slate" onClick={() => createInvite(e.email, e.id)}>Invite</Button>
                            <Button tone="slate" onClick={() => toggleActive(e)}>
                              {e.is_active ? "Deactivate" : "Activate"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Employee Invites" subtitle="Copy code + send to employee (email/SMS)">
          {invites.length === 0 ? (
            <div className="text-sm text-slate-400">No invites yet.</div>
          ) : (
            <div className="space-y-2">
              {invites.map((i) => (
                <div key={i.id} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-semibold">{i.email}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      Code: <span className="text-slate-200">{i.code}</span>
                      <span className="mx-2 text-slate-700">•</span>
                      Expires: <span className="text-slate-200">{new Date(i.expires_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <div>
                    {i.accepted_at ? <Pill tone="emerald">Accepted</Pill> : i.is_active ? <Pill tone="cyan">Active</Pill> : <Pill tone="rose">Inactive</Pill>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>

      {showAdd ? (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-950/95 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">Add Employee</div>
                <div className="text-xs text-slate-400 mt-1">Seat limits enforced (3 free). Invite after creation.</div>
              </div>
              <Button tone="slate" onClick={() => setShowAdd(false)} disabled={saving}>Close</Button>
            </div>

            {!canAddMore ? (
              <div className="mt-4 text-sm text-rose-200 bg-rose-900/15 border border-rose-700/30 rounded-2xl p-3">
                You’ve reached the free seat cap. Upgrade to add more employees.
              </div>
            ) : null}

            <div className="mt-4 grid md:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-slate-400 mb-1">Email</div>
                <input
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2 text-sm"
                  placeholder="tech@company.com"
                />
              </div>

              <div>
                <div className="text-xs text-slate-400 mb-1">Role</div>
                <select
                  value={form.role}
                  onChange={(e) => {
                    const role = e.target.value;
                    setForm((p) => ({ ...p, role, ...roleDefaults(role) }));
                  }}
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                >
                  {ROLES.map((r) => (
                    <option key={r.key} value={r.key}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-xs text-slate-400 mb-1">Full name</div>
                <input
                  value={form.full_name}
                  onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2 text-sm"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <div className="text-xs text-slate-400 mb-1">Job title</div>
                <input
                  value={form.job_title}
                  onChange={(e) => setForm((p) => ({ ...p, job_title: e.target.value }))}
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2 text-sm"
                  placeholder="HVAC Technician"
                />
              </div>

              <div className="md:col-span-2">
                <div className="text-xs text-slate-400 mb-2">Permissions</div>
                <div className="grid md:grid-cols-3 gap-2 text-sm">
                  {[
                    ["can_view_financials", "View Financials"],
                    ["can_manage_financials", "Manage Financials"],
                    ["can_manage_properties", "Manage Properties"],
                    ["can_manage_tenants", "Manage Tenants"],
                    ["can_manage_documents", "Manage Documents"],
                    ["can_manage_work_orders", "Manage Work Orders"],
                    ["can_manage_employees", "Manage Employees"],
                  ].map(([k, label]) => (
                    <label key={k} className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/50 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={!!form[k]}
                        onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.checked }))}
                      />
                      <span className="text-slate-200">{label}</span>
                    </label>
                  ))}
                </div>

                <div className="mt-2 text-[11px] text-slate-500">
                  Recommended: Tech/Maintenance should NOT have financial permissions.
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button tone="cyan" onClick={createEmployee} disabled={saving || !canAddMore}>
                {saving ? "Creating…" : "Create"}
              </Button>
              <Button tone="slate" onClick={() => setShowAdd(false)} disabled={saving}>Cancel</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
