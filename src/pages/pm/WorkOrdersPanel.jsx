// src/components/pm/WorkOrdersPanel.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import Button from "../ui/Button";

function cx(...p) {
  return p.filter(Boolean).join(" ");
}

function Pill({ children, tone = "slate" }) {
  const cls =
    tone === "emerald"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : tone === "cyan"
      ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
      : tone === "amber"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
      : tone === "rose"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
      : tone === "fuchsia"
      ? "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200"
      : "border-slate-800 bg-slate-950/40 text-slate-200";

  return (
    <span className={cx("inline-flex items-center px-2 py-1 rounded-full border text-[11px] font-semibold", cls)}>
      {children}
    </span>
  );
}

function safeResults(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

const STATUS_OPTIONS = [
  { v: "OPEN", label: "Open" },
  { v: "IN_PROGRESS", label: "In Progress" },
  { v: "ON_HOLD", label: "On Hold" },
  { v: "COMPLETED", label: "Completed" },
  { v: "CANCELED", label: "Canceled" },
];

const PRIORITY_OPTIONS = [
  { v: "LOW", label: "Low" },
  { v: "MEDIUM", label: "Medium" },
  { v: "HIGH", label: "High" },
  { v: "URGENT", label: "Urgent" },
];

function toneForPriority(p) {
  const u = String(p || "").toUpperCase();
  if (u === "URGENT") return "rose";
  if (u === "HIGH") return "amber";
  return "slate";
}
function toneForStatus(s) {
  const u = String(s || "").toUpperCase();
  if (u === "COMPLETED") return "emerald";
  if (u === "IN_PROGRESS") return "cyan";
  if (u === "ON_HOLD") return "amber";
  if (u === "CANCELED") return "rose";
  return "slate";
}

function ModalShell({ title, subtitle, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl">
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-lg font-extrabold text-slate-100">{title}</div>
              {subtitle ? <div className="text-xs text-slate-400 mt-1">{subtitle}</div> : null}
            </div>
            <button
              type="button"
              className="h-10 w-10 rounded-2xl border border-slate-800 bg-slate-950/60 text-slate-300 hover:text-white hover:bg-slate-900/40"
              onClick={onClose}
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export default function WorkOrdersPanel({
  properties = [],
  units = [],
  tenants = [],
  loading = false,
  enableApi = true,
  onRefresh,
  onOk,
  onErr,
}) {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [priority, setPriority] = useState("ALL");

  // modals
  const [showNew, setShowNew] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [active, setActive] = useState(null);

  // new form
  const [nf, setNf] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    status: "OPEN",
    due_date: "",
    property: "",
    unit: "",
    tenant: "",
  });

  // assign form
  const [employees, setEmployees] = useState([]);
  const [assignEmail, setAssignEmail] = useState("");
  const [assignMode, setAssignMode] = useState("INTERNAL"); // INTERNAL | MARKETPLACE
  const [assignSetInProgress, setAssignSetInProgress] = useState(true);

  async function loadWorkOrders() {
    if (!enableApi) {
      setItems([]);
      return;
    }
    setErr("");
    setBusy(true);
    try {
      const r = await api.get("/pm/workorders/");
      setItems(safeResults(r.data));
    } catch (e) {
      setItems([]);
      setErr(e?.response?.data?.detail || "Failed to load work orders.");
      onErr?.(e?.response?.data?.detail || "Failed to load work orders.");
    } finally {
      setBusy(false);
    }
  }

  async function loadEmployees() {
    // used by Assign modal
    try {
      const r = await api.get("/pm/employees/");
      const list = safeResults(r.data);
      setEmployees(list);
    } catch {
      setEmployees([]);
    }
  }

  useEffect(() => {
    loadWorkOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableApi]);

  const filtered = useMemo(() => {
    const text = (q || "").trim().toLowerCase();
    let list = [...(items || [])];

    if (status !== "ALL") {
      list = list.filter((w) => String(w?.status || "").toUpperCase() === status);
    }
    if (priority !== "ALL") {
      list = list.filter((w) => String(w?.priority || "").toUpperCase() === priority);
    }
    if (text) {
      list = list.filter((w) => {
        const blob = [w?.id, w?.title, w?.description, w?.assigned_to_email, w?.status, w?.priority]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return blob.includes(text);
      });
    }

    // newest first
    list.sort((a, b) => {
      const da = a?.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b?.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });

    return list;
  }, [items, q, status, priority]);

  const counts = useMemo(() => {
    const open = filtered.filter((w) => String(w?.status || "").toUpperCase() === "OPEN").length;
    const urgent = filtered.filter((w) => String(w?.priority || "").toUpperCase() === "URGENT").length;
    const inprog = filtered.filter((w) => String(w?.status || "").toUpperCase() === "IN_PROGRESS").length;
    const done = filtered.filter((w) => String(w?.status || "").toUpperCase() === "COMPLETED").length;
    return { open, urgent, inprog, done, total: filtered.length };
  }, [filtered]);

  function openAssignModal(workOrder) {
    setActive(workOrder);
    setAssignMode("INTERNAL");
    setAssignSetInProgress(true);
    setAssignEmail(workOrder?.assigned_to_email || "");
    setShowAssign(true);
    loadEmployees();
  }

  async function createWorkOrder() {
    setErr("");
    setBusy(true);
    try {
      const payload = {
        title: (nf.title || "").trim(),
        description: (nf.description || "").trim(),
        priority: nf.priority,
        status: nf.status,
        due_date: nf.due_date || null,
        property: nf.property ? Number(nf.property) : null,
        unit: nf.unit ? Number(nf.unit) : null,
        tenant: nf.tenant ? Number(nf.tenant) : null,
      };

      if (!payload.title) {
        setErr("Title is required.");
        return;
      }

      const r = await api.post("/pm/workorders/", payload);
      const created = r.data;

      setItems((prev) => [created, ...(Array.isArray(prev) ? prev : [])]);
      setShowNew(false);
      setNf({
        title: "",
        description: "",
        priority: "MEDIUM",
        status: "OPEN",
        due_date: "",
        property: "",
        unit: "",
        tenant: "",
      });
      onOk?.("Work order created.");
    } catch (e) {
      const msg = e?.response?.data?.detail || "Create failed.";
      setErr(msg);
      onErr?.(msg);
    } finally {
      setBusy(false);
    }
  }

  async function patchWorkOrder(id, payload) {
    const r = await api.patch(`/pm/workorders/${id}/`, payload);
    return r.data;
  }

  async function saveAssign() {
    if (!active?.id) return;

    setErr("");
    setBusy(true);

    try {
      if (assignMode === "MARKETPLACE") {
        // ✅ This is what you WANT. It requires a backend action.
        // We'll try it. If endpoint isn't built, show clean message.
        try {
          await api.post(`/pm/workorders/${active.id}/publish_to_marketplace/`, {});
          onOk?.("Published to marketplace.");
          setShowAssign(false);
          await loadWorkOrders();
          return;
        } catch (e) {
          const statusCode = e?.response?.status;
          const msg =
            statusCode === 404
              ? "Backend missing: POST /pm/workorders/:id/publish_to_marketplace/ (needs to create a marketplace Ticket owned/paid by PM business)."
              : e?.response?.data?.detail || "Publish to marketplace failed.";
          setErr(msg);
          onErr?.(msg);
          return;
        }
      }

      // INTERNAL assignment = just set assigned_to_email (and optionally status)
      const email = (assignEmail || "").trim();
      if (!email) {
        setErr("Select a technician (or enter an email).");
        return;
      }

      const payload = {
        assigned_to_email: email,
      };
      if (assignSetInProgress) payload.status = "IN_PROGRESS";

      const updated = await patchWorkOrder(active.id, payload);

      setItems((prev) =>
        (prev || []).map((w) => (w?.id === updated?.id ? updated : w))
      );

      onOk?.("Assigned.");
      setShowAssign(false);
    } catch (e) {
      const msg = e?.response?.data?.detail || "Assign failed.";
      setErr(msg);
      onErr?.(msg);
    } finally {
      setBusy(false);
    }
  }

  async function quickClose(workOrder) {
    setErr("");
    setBusy(true);
    try {
      const updated = await patchWorkOrder(workOrder.id, { status: "COMPLETED" });
      setItems((prev) => (prev || []).map((w) => (w?.id === updated?.id ? updated : w)));
      onOk?.("Closed (Completed).");
    } catch (e) {
      const msg = e?.response?.data?.detail || "Close failed.";
      setErr(msg);
      onErr?.(msg);
    } finally {
      setBusy(false);
    }
  }

  const propertyById = useMemo(() => {
    const m = new Map();
    (properties || []).forEach((p) => m.set(Number(p.id), p));
    return m;
  }, [properties]);

  const unitById = useMemo(() => {
    const m = new Map();
    (units || []).forEach((u) => m.set(Number(u.id), u));
    return m;
  }, [units]);

  const tenantById = useMemo(() => {
    const m = new Map();
    (tenants || []).forEach((t) => m.set(Number(t.id), t));
    return m;
  }, [tenants]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="text-xs text-slate-400 tracking-widest">WORK ORDERS</div>
            <div className="text-2xl font-extrabold">Maintenance Command</div>
            <div className="text-sm text-slate-400 mt-1">
              PM-only work orders tied to Property → Unit. Dispatch techs or publish to marketplace.
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Pill tone="cyan">{busy || loading ? "Loading…" : `${counts.total} shown`}</Pill>
            <Button tone="cyan" onClick={() => setShowNew(true)}>
              + New Work Order
            </Button>
            <Button tone="slate" onClick={() => { loadWorkOrders(); onRefresh?.(); }}>
              Refresh
            </Button>
          </div>
        </div>

        {err ? (
          <div className="mt-3 text-sm text-red-200 bg-red-900/10 border border-red-800 rounded-2xl p-3">
            {err}
          </div>
        ) : null}

        <div className="mt-4 grid md:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="text-xs text-slate-400">Open</div>
            <div className="mt-2 text-2xl font-extrabold">{counts.open}</div>
            <div className="mt-2"><Pill tone="slate">Active</Pill></div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="text-xs text-slate-400">Urgent</div>
            <div className="mt-2 text-2xl font-extrabold">{counts.urgent}</div>
            <div className="mt-2"><Pill tone="rose">Dispatch</Pill></div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="text-xs text-slate-400">In Progress</div>
            <div className="mt-2 text-2xl font-extrabold">{counts.inprog}</div>
            <div className="mt-2"><Pill tone="cyan">Working</Pill></div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="text-xs text-slate-400">Completed</div>
            <div className="mt-2 text-2xl font-extrabold">{counts.done}</div>
            <div className="mt-2"><Pill tone="emerald">Closed</Pill></div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
        <div className="grid md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <div className="text-[11px] text-slate-500 mb-1">Search</div>
            <input
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
              placeholder="title, description, assigned email…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div>
            <div className="text-[11px] text-slate-500 mb-1">Status</div>
            <select
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="ALL">All</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.v} value={s.v}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-[11px] text-slate-500 mb-1">Priority</div>
            <select
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="ALL">All</option>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p.v} value={p.v}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="rounded-3xl border border-slate-800 bg-slate-950/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-left">
            <thead className="sticky top-0 bg-slate-950/90 backdrop-blur border-b border-slate-800">
              <tr className="text-[11px] text-slate-400">
                <th className="px-4 py-3">Work Order</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Assigned</th>
                <th className="px-4 py-3">Property / Unit</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-slate-500" colSpan={7}>
                    No work orders match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((w) => {
                  const st = String(w?.status || "OPEN").toUpperCase();
                  const pr = String(w?.priority || "MEDIUM").toUpperCase();
                  const stTone = toneForStatus(st);
                  const prTone = toneForPriority(pr);

                  const prop = w?.property ? propertyById.get(Number(w.property)) : null;
                  const unit = w?.unit ? unitById.get(Number(w.unit)) : null;
                  const tenant = w?.tenant ? tenantById.get(Number(w.tenant)) : null;

                  const propName = prop?.name || prop?.title || (w?.property ? `Property #${w.property}` : "—");
                  const unitName =
                    unit?.unit_number || unit?.name || unit?.label || (w?.unit ? `Unit #${w.unit}` : "—");
                  const due = w?.due_date ? new Date(w.due_date + "T00:00:00") : null;

                  return (
                    <tr key={w.id} className="border-b border-slate-800/70 hover:bg-slate-900/25 transition">
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-slate-100 truncate max-w-[360px]">
                          {w?.title || `Work Order #${w.id}`}
                        </div>
                        {w?.description ? (
                          <div className="text-[11px] text-slate-500 truncate max-w-[520px]">{w.description}</div>
                        ) : null}
                        {tenant?.full_name || tenant?.name ? (
                          <div className="text-[11px] text-slate-600 mt-1">
                            Tenant: <span className="text-slate-300">{tenant.full_name || tenant.name}</span>
                          </div>
                        ) : null}
                      </td>

                      <td className="px-4 py-3">
                        <Pill tone={stTone}>{st}</Pill>
                      </td>

                      <td className="px-4 py-3">
                        <Pill tone={prTone}>{pr}</Pill>
                      </td>

                      <td className="px-4 py-3 text-sm text-slate-200">
                        {w?.assigned_to_email ? (
                          <div className="truncate max-w-[220px]">{w.assigned_to_email}</div>
                        ) : (
                          <span className="text-slate-500">Unassigned</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-200 truncate max-w-[220px]">{propName}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[220px]">{unitName}</div>
                      </td>

                      <td className="px-4 py-3 text-sm text-slate-300">
                        {due ? due.toLocaleDateString() : "—"}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2 justify-end">
                          <Button tone="slate" size="sm" onClick={() => openAssignModal(w)}>
                            Assign
                          </Button>
                          <Button
                            tone="emerald"
                            size="sm"
                            onClick={() => quickClose(w)}
                            disabled={busy || st === "COMPLETED"}
                          >
                            Close
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 text-[11px] text-slate-500 border-t border-slate-800">
          Dispatcher flow: create → assign tech (internal) OR publish to marketplace → close when completed.
        </div>
      </div>

      {/* New Work Order Modal */}
      {showNew ? (
        <ModalShell
          title="New Work Order"
          subtitle="Create a maintenance job tied to a property/unit (tenant optional)."
          onClose={() => setShowNew(false)}
        >
          <div className="grid md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <div className="text-[11px] text-slate-500 mb-1">Title</div>
              <input
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                value={nf.title}
                onChange={(e) => setNf((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g., Leaky faucet - Unit 2B"
              />
            </div>

            <div className="md:col-span-2">
              <div className="text-[11px] text-slate-500 mb-1">Description</div>
              <textarea
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm min-h-[90px]"
                value={nf.description}
                onChange={(e) => setNf((p) => ({ ...p, description: e.target.value }))}
                placeholder="What happened? What’s the expected fix?"
              />
            </div>

            <div>
              <div className="text-[11px] text-slate-500 mb-1">Priority</div>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                value={nf.priority}
                onChange={(e) => setNf((p) => ({ ...p, priority: e.target.value }))}
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.v} value={p.v}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-[11px] text-slate-500 mb-1">Status</div>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                value={nf.status}
                onChange={(e) => setNf((p) => ({ ...p, status: e.target.value }))}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.v} value={s.v}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-[11px] text-slate-500 mb-1">Due date</div>
              <input
                type="date"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                value={nf.due_date}
                onChange={(e) => setNf((p) => ({ ...p, due_date: e.target.value }))}
              />
            </div>

            <div>
              <div className="text-[11px] text-slate-500 mb-1">Property</div>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                value={nf.property}
                onChange={(e) => setNf((p) => ({ ...p, property: e.target.value }))}
              >
                <option value="">—</option>
                {(properties || []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.title || `Property #${p.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-[11px] text-slate-500 mb-1">Unit</div>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                value={nf.unit}
                onChange={(e) => setNf((p) => ({ ...p, unit: e.target.value }))}
              >
                <option value="">—</option>
                {(units || []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.unit_number || u.name || u.label || `Unit #${u.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <div className="text-[11px] text-slate-500 mb-1">Tenant (optional)</div>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                value={nf.tenant}
                onChange={(e) => setNf((p) => ({ ...p, tenant: e.target.value }))}
              >
                <option value="">—</option>
                {(tenants || []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name || t.name || t.email || `Tenant #${t.id}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <Button tone="slate" onClick={() => setShowNew(false)}>
              Cancel
            </Button>
            <Button tone="cyan" onClick={createWorkOrder} disabled={busy}>
              {busy ? "Saving…" : "Create"}
            </Button>
          </div>
        </ModalShell>
      ) : null}

      {/* Assign Modal */}
      {showAssign && active ? (
        <ModalShell
          title={`Assign Work Order #${active.id}`}
          subtitle="Pick an internal tech or publish to marketplace (backend action needed)."
          onClose={() => setShowAssign(false)}
        >
          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="text-sm font-semibold text-slate-100">{active.title}</div>
            {active.description ? <div className="text-xs text-slate-400 mt-1">{active.description}</div> : null}
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <Pill tone={toneForStatus(active.status)}>{String(active.status || "OPEN").toUpperCase()}</Pill>
              <Pill tone={toneForPriority(active.priority)}>{String(active.priority || "MEDIUM").toUpperCase()}</Pill>
              {active.due_date ? <Pill tone="amber">Due {active.due_date}</Pill> : null}
            </div>
          </div>

          <div className="mt-4 grid md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <div className="text-[11px] text-slate-500 mb-2">Dispatch method</div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setAssignMode("INTERNAL")}
                  className={cx(
                    "h-9 px-4 rounded-xl border text-xs font-semibold transition",
                    assignMode === "INTERNAL"
                      ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
                      : "border-slate-800 bg-slate-950/40 text-slate-200 hover:bg-slate-900/40"
                  )}
                >
                  Internal Technician
                </button>
                <button
                  type="button"
                  onClick={() => setAssignMode("MARKETPLACE")}
                  className={cx(
                    "h-9 px-4 rounded-xl border text-xs font-semibold transition",
                    assignMode === "MARKETPLACE"
                      ? "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-200"
                      : "border-slate-800 bg-slate-950/40 text-slate-200 hover:bg-slate-900/40"
                  )}
                >
                  Send to Marketplace
                </button>
              </div>

              {assignMode === "MARKETPLACE" ? (
                <div className="mt-3 text-xs text-slate-400">
                  Marketplace publishing must create a Ticket that is posted <b>by the PM business</b> (payer),
                  not by the tenant. This UI will call:
                  <span className="ml-2 text-slate-200">POST /pm/workorders/:id/publish_to_marketplace/</span>
                </div>
              ) : (
                <div className="mt-3 text-xs text-slate-400">
                  Internal assignment uses your existing field:
                  <span className="ml-2 text-slate-200">PATCH /pm/workorders/:id/ → assigned_to_email</span>
                </div>
              )}
            </div>

            {assignMode === "INTERNAL" ? (
              <>
                <div className="md:col-span-2">
                  <div className="text-[11px] text-slate-500 mb-1">Technician</div>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                    value={assignEmail}
                    onChange={(e) => setAssignEmail(e.target.value)}
                  >
                    <option value="">Select technician…</option>
                    {(employees || []).map((e) => {
                      const email = e?.email || e?.user_email || e?.identifier || "";
                      const label = e?.full_name || e?.name || email || `Employee #${e?.id}`;
                      if (!email) return null;
                      return (
                        <option key={email} value={email}>
                          {label} ({email})
                        </option>
                      );
                    })}
                  </select>
                  <div className="mt-2 text-[11px] text-slate-500">
                    Don’t see your tech? Add them in <span className="text-slate-200">More… → Team / Employees</span>.
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={assignSetInProgress}
                      onChange={(e) => setAssignSetInProgress(e.target.checked)}
                    />
                    Set status to <span className="text-cyan-200 font-semibold">IN_PROGRESS</span> when assigned
                  </label>
                </div>
              </>
            ) : null}
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <Button tone="slate" onClick={() => setShowAssign(false)}>
              Cancel
            </Button>
            <Button tone={assignMode === "MARKETPLACE" ? "indigo" : "cyan"} onClick={saveAssign} disabled={busy}>
              {busy ? "Working…" : assignMode === "MARKETPLACE" ? "Publish" : "Assign"}
            </Button>
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}
