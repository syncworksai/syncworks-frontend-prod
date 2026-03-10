// src/components/pm/WorkOrdersPanel.jsx
import React, { useEffect, useMemo, useState } from "react";
import Button from "../ui/Button";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
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
      : tone === "indigo"
      ? "border-indigo-500/40 text-indigo-200 bg-indigo-500/10"
      : "border-slate-700 text-slate-300 bg-slate-950/40";
  return <span className={`inline-flex items-center px-2 py-1 rounded-full border text-[11px] ${cls}`}>{children}</span>;
}

function Section({ title, subtitle, right, children }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="font-semibold">{title}</div>
          {subtitle ? <div className="text-xs text-slate-400 mt-1">{subtitle}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function StatTile({ label, value, hint, tone = "slate" }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs text-slate-400">{label}</div>
        <Pill tone={tone}>{hint}</Pill>
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleString();
}

function severityTone(sev) {
  const s = (sev || "").toUpperCase();
  if (s === "EMERGENCY") return "rose";
  if (s === "URGENT") return "amber";
  if (s === "ROUTINE") return "cyan";
  return "slate";
}

function statusTone(st) {
  const s = (st || "").toUpperCase();
  if (["NEW", "SUBMITTED"].includes(s)) return "cyan";
  if (["ASSIGNED", "SCHEDULED", "IN_PROGRESS"].includes(s)) return "amber";
  if (["COMPLETED", "CLOSED"].includes(s)) return "emerald";
  if (["CANCELLED", "DENIED"].includes(s)) return "rose";
  return "slate";
}

// ------------------------------------------------------------
// UI-first demo dataset (until backend endpoints exist)
// ------------------------------------------------------------
function useDemoWorkOrders() {
  const list = [
    {
      id: "wo_1001",
      property_name: "Oak Ridge",
      unit_label: "Unit 101",
      title: "Kitchen sink leaking",
      severity: "URGENT",
      status: "IN_PROGRESS",
      created_at: "2026-01-19T13:10:00Z",
      next_action: "Confirm parts + schedule return",
      vendor_name: "Ace Plumbing",
      cost_estimate: 180,
    },
    {
      id: "wo_1002",
      property_name: "Cedar Point",
      unit_label: "Unit 2B",
      title: "No heat (HVAC)",
      severity: "EMERGENCY",
      status: "ASSIGNED",
      created_at: "2026-01-20T09:05:00Z",
      next_action: "Dispatch tech ASAP",
      vendor_name: "CoolAir HVAC",
      cost_estimate: 450,
    },
    {
      id: "wo_1003",
      property_name: "Oak Ridge",
      unit_label: "Unit 305",
      title: "Replace hallway light fixture",
      severity: "ROUTINE",
      status: "NEW",
      created_at: "2026-01-18T16:45:00Z",
      next_action: "Assign vendor",
      vendor_name: "",
      cost_estimate: 0,
    },
    {
      id: "wo_1004",
      property_name: "Oak Ridge",
      unit_label: "Unit 4A",
      title: "Pest control follow-up",
      severity: "ROUTINE",
      status: "COMPLETED",
      created_at: "2026-01-12T12:00:00Z",
      next_action: "Close + attach invoice",
      vendor_name: "PestAway",
      cost_estimate: 120,
    },
  ];
  return list;
}

// ------------------------------------------------------------
// Modal (simple, dependency-free)
// ------------------------------------------------------------
function Modal({ open, title, subtitle, onClose, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-800 bg-[#020617] shadow-2xl">
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold">{title}</div>
              {subtitle ? <div className="text-xs text-slate-400 mt-1">{subtitle}</div> : null}
            </div>
            <Button tone="slate" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
        <div className="p-5">{children}</div>
        {footer ? <div className="p-5 border-t border-slate-800">{footer}</div> : null}
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      {children}
      {hint ? <div className="text-[11px] text-slate-500 mt-1">{hint}</div> : null}
    </div>
  );
}

// ------------------------------------------------------------
// Main panel
// ------------------------------------------------------------
export default function WorkOrdersPanel({
  properties = [],
  units = [],
  loading = false,

  // UI-first control: when true, you’ll wire real endpoints later
  enableApi = false,

  onRefresh = null,
  onOk = null,
  onErr = null,
}) {
  const demo = useDemoWorkOrders();

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [severity, setSeverity] = useState("ALL");
  const [propertyId, setPropertyId] = useState("ALL");
  const [unitId, setUnitId] = useState("ALL");

  const [list, setList] = useState(demo);

  // create modal
  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    severity: "ROUTINE",
    property_id: "",
    unit_id: "",
    access_notes: "",
    photos_note: "",
  });

  // Placeholder for future backend fetch. For now: UI-first demo.
  useEffect(() => {
    if (!enableApi) return;
    // When you enable API later, this is where we’ll GET /pm/work-orders/
    // and setList(response)
  }, [enableApi]);

  const propertyOptions = useMemo(() => {
    const p = Array.isArray(properties) ? properties : [];
    return p.map((x) => ({
      id: String(x.id),
      label: x.name || `Property ${x.id}`,
    }));
  }, [properties]);

  const unitOptions = useMemo(() => {
    const u = Array.isArray(units) ? units : [];
    return u.map((x) => ({
      id: String(x.id),
      label: x.label || x.unit_number || x.name || `Unit ${x.id}`,
      property_id: x.property_id ? String(x.property_id) : x.property ? String(x.property) : "",
      property_name: x.property_name || "",
    }));
  }, [units]);

  const filteredUnitsForForm = useMemo(() => {
    if (!form.property_id) return unitOptions;
    return unitOptions.filter((u) => !u.property_id || u.property_id === String(form.property_id));
  }, [unitOptions, form.property_id]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (Array.isArray(list) ? list : []).filter((x) => {
      const blob = [
        x.title,
        x.property_name,
        x.unit_label,
        x.status,
        x.severity,
        x.vendor_name,
        x.next_action,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const okQ = !needle || blob.includes(needle);

      const okStatus = status === "ALL" ? true : (x.status || "").toUpperCase() === status;
      const okSev = severity === "ALL" ? true : (x.severity || "").toUpperCase() === severity;

      const okProp =
        propertyId === "ALL"
          ? true
          : String(x.property_id || x.property || "") === String(propertyId) ||
            String(x.property_name || "") === String(propertyId); // demo fallback

      const okUnit =
        unitId === "ALL"
          ? true
          : String(x.unit_id || x.unit || "") === String(unitId) ||
            String(x.unit_label || "") === String(unitId); // demo fallback

      return okQ && okStatus && okSev && okProp && okUnit;
    });
  }, [list, q, status, severity, propertyId, unitId]);

  const kpis = useMemo(() => {
    const all = Array.isArray(list) ? list : [];
    const open = all.filter((x) => !["COMPLETED", "CLOSED", "CANCELLED"].includes((x.status || "").toUpperCase()));
    const emergencies = all.filter((x) => (x.severity || "").toUpperCase() === "EMERGENCY");
    const urgent = all.filter((x) => (x.severity || "").toUpperCase() === "URGENT");
    const completed = all.filter((x) => ["COMPLETED", "CLOSED"].includes((x.status || "").toUpperCase()));
    const avgStubHours = open.length ? Math.round((open.length * 6 + urgent.length * 4 + emergencies.length * 2) / open.length) : 0;

    const totalEst = all.reduce((acc, x) => acc + (Number(x.cost_estimate) || 0), 0);

    // decision-first banner
    let decision = { tone: "emerald", label: "Healthy", msg: "Maintenance is under control. Keep SLAs tight and costs documented." };
    if (emergencies.length >= 1) decision = { tone: "rose", label: "At Risk", msg: "Emergency work orders exist. Dispatch and communicate immediately." };
    else if (open.length >= 5) decision = { tone: "amber", label: "Watch", msg: "Open work orders are stacking. Triage and assign vendors today." };

    return {
      open: open.length,
      emergencies: emergencies.length,
      urgent: urgent.length,
      completed: completed.length,
      avgStubHours,
      totalEst,
      decision,
    };
  }, [list]);

  function resetForm() {
    setForm({
      title: "",
      description: "",
      severity: "ROUTINE",
      property_id: "",
      unit_id: "",
      access_notes: "",
      photos_note: "",
    });
  }

  function openCreateModal() {
    resetForm();
    setOpenCreate(true);
  }

  function closeCreateModal() {
    setOpenCreate(false);
    setCreating(false);
  }

  async function createWorkOrder() {
    const title = form.title.trim();
    if (!title) {
      onErr?.("Title is required.");
      return;
    }
    if (!form.property_id && propertyOptions.length) {
      onErr?.("Select a property.");
      return;
    }
    if (!form.unit_id && unitOptions.length) {
      onErr?.("Select a unit.");
      return;
    }

    setCreating(true);

    // UI-first: add to local list
    const nowIso = new Date().toISOString();
    const propName =
      propertyOptions.find((p) => String(p.id) === String(form.property_id))?.label || "—";
    const unitLabel =
      unitOptions.find((u) => String(u.id) === String(form.unit_id))?.label || "—";

    const created = {
      id: `wo_${Math.random().toString(16).slice(2)}_${Date.now()}`,
      title,
      property_id: form.property_id,
      unit_id: form.unit_id,
      property_name: propName,
      unit_label: unitLabel,
      severity: form.severity,
      status: "NEW",
      created_at: nowIso,
      vendor_name: "",
      cost_estimate: 0,
      next_action:
        form.severity === "EMERGENCY"
          ? "Dispatch immediately"
          : form.severity === "URGENT"
          ? "Assign vendor today"
          : "Schedule routine visit",
      description: form.description.trim(),
      access_notes: form.access_notes.trim(),
    };

    if (!enableApi) {
      setList((prev) => [created, ...(Array.isArray(prev) ? prev : [])]);
      onOk?.("Work order created (UI-first). Next: wire /pm/work-orders/ backend.");
      setCreating(false);
      setOpenCreate(false);
      return;
    }

    // When enableApi=true later:
    // POST /pm/work-orders/ with {property, unit, title, description, severity, ...}
    // then refresh list.
    onErr?.("API mode is enabled, but endpoints aren’t wired in this build yet.");
    setCreating(false);
  }

  function quickSetFilters(kind) {
    if (kind === "open") {
      setStatus("ALL");
      setSeverity("ALL");
      setQ("");
      return;
    }
    if (kind === "emergency") {
      setSeverity("EMERGENCY");
      setStatus("ALL");
      setQ("");
      return;
    }
    if (kind === "urgent") {
      setSeverity("URGENT");
      setStatus("ALL");
      setQ("");
      return;
    }
    if (kind === "completed") {
      setStatus("COMPLETED");
      setSeverity("ALL");
      setQ("");
      return;
    }
  }

  return (
    <div className="space-y-4">
      {/* KPI + decision-first banner */}
      <div className="rounded-[28px] border border-slate-800 bg-slate-950/35 p-6 overflow-hidden relative">
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-rose-500/10 blur-3xl" />
          <div className="absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        </div>

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-[280px]">
            <div className="text-xs text-slate-400 tracking-widest">WORK ORDERS</div>
            <div className="text-2xl font-extrabold">Maintenance Command</div>
            <div className="text-sm text-slate-300 mt-1">
              PM-only work orders tied to <span className="text-slate-100">Property → Unit</span>. No marketplace clutter.
            </div>
          </div>

          <div className="relative flex items-center gap-2">
            <Pill tone={kpis.decision.tone}>{kpis.decision.label}</Pill>
            <div className="text-sm text-slate-300">{kpis.decision.msg}</div>
          </div>
        </div>

        <div className="relative mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div onClick={() => quickSetFilters("open")} className="cursor-pointer">
            <StatTile label="Open work orders" value={kpis.open} hint="Active" tone={kpis.open ? "amber" : "slate"} />
          </div>
          <div onClick={() => quickSetFilters("emergency")} className="cursor-pointer">
            <StatTile label="Emergency" value={kpis.emergencies} hint="Dispatch" tone={kpis.emergencies ? "rose" : "slate"} />
          </div>
          <div onClick={() => quickSetFilters("urgent")} className="cursor-pointer">
            <StatTile label="Urgent" value={kpis.urgent} hint="Today" tone={kpis.urgent ? "amber" : "slate"} />
          </div>
          <div onClick={() => quickSetFilters("completed")} className="cursor-pointer">
            <StatTile label="Completed" value={kpis.completed} hint="Closed" tone={kpis.completed ? "emerald" : "slate"} />
          </div>
        </div>

        <div className="relative mt-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile label="Avg resolve time (stub)" value={`${kpis.avgStubHours}h`} hint="Placeholder" tone={kpis.avgStubHours ? "cyan" : "slate"} />
          <StatTile label="Est. maintenance cost" value={`$${(kpis.totalEst || 0).toFixed(0)}`} hint="Estimate" tone={kpis.totalEst ? "amber" : "slate"} />
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="text-xs text-slate-400">Next actions</div>
            <ul className="mt-2 text-sm text-slate-300 space-y-1 list-disc pl-5">
              <li>Dispatch emergencies first</li>
              <li>Assign vendors + schedule visits</li>
              <li>Attach invoices + close cleanly</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="text-xs text-slate-400">PM Pro hooks</div>
            <ul className="mt-2 text-sm text-slate-300 space-y-1 list-disc pl-5">
              <li>Auto-SLA alerts</li>
              <li>Cost vs rent risk flags</li>
              <li>Owner statement exports</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Filters + actions */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-9 w-[280px] max-w-[78vw] rounded-xl bg-slate-950 border border-slate-800 px-3 text-sm"
            placeholder="Search work orders…"
          />
        </div>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-xl bg-slate-950 border border-slate-800 px-3 text-sm"
        >
          <option value="ALL">All statuses</option>
          <option value="NEW">New</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CLOSED">Closed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="h-9 rounded-xl bg-slate-950 border border-slate-800 px-3 text-sm"
        >
          <option value="ALL">All severities</option>
          <option value="EMERGENCY">Emergency</option>
          <option value="URGENT">Urgent</option>
          <option value="ROUTINE">Routine</option>
        </select>

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <Button tone="cyan" onClick={openCreateModal}>
            New Work Order
          </Button>
          <Button
            tone="slate"
            onClick={() => {
              if (onRefresh) onRefresh();
              onOk?.("Refreshed dashboard data.");
            }}
            disabled={!!loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Work orders table */}
      <Section
        title="Work Orders"
        subtitle={`Showing ${filtered.length} record(s)`}
        right={
          <div className="flex items-center gap-2">
            <Pill>{enableApi ? "API" : "UI-first"}</Pill>
            <Button
              tone="slate"
              onClick={() => onOk?.("Exports (maintenance summary, vendor spend, per-unit costs) will be part of PM Pro reporting.")}
            >
              Export
            </Button>
          </div>
        }
      >
        {filtered.length === 0 ? (
          <div className="text-sm text-slate-400">
            No work orders match these filters. Create one to start your maintenance history.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400">
                  <th className="py-2 pr-3">Work order</th>
                  <th className="py-2 pr-3">Severity</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Property / Unit</th>
                  <th className="py-2 pr-3 hidden lg:table-cell">Vendor</th>
                  <th className="py-2 pr-3 hidden lg:table-cell">Cost est.</th>
                  <th className="py-2 pr-3">Next action</th>
                  <th className="py-2 pl-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((x) => (
                  <tr key={x.id} className="border-t border-slate-800/70">
                    <td className="py-3 pr-3">
                      <div className="font-semibold">{x.title || "—"}</div>
                      <div className="text-xs text-slate-500">
                        ID: <span className="font-mono text-slate-300">{x.id}</span>
                      </div>
                      <div className="text-xs text-slate-500">Created: {fmtDate(x.created_at)}</div>
                    </td>

                    <td className="py-3 pr-3">
                      <Pill tone={severityTone(x.severity)}>{(x.severity || "—").toUpperCase()}</Pill>
                    </td>

                    <td className="py-3 pr-3">
                      <Pill tone={statusTone(x.status)}>{(x.status || "—").toUpperCase().replaceAll("_", " ")}</Pill>
                    </td>

                    <td className="py-3 pr-3">
                      <div className="text-slate-200">{x.property_name || "—"}</div>
                      <div className="text-xs text-slate-500">{x.unit_label || "—"}</div>
                    </td>

                    <td className="py-3 pr-3 hidden lg:table-cell">
                      <div className="text-slate-300">{x.vendor_name || "—"}</div>
                    </td>

                    <td className="py-3 pr-3 hidden lg:table-cell">
                      <div className="text-slate-300">{Number(x.cost_estimate) ? `$${Number(x.cost_estimate).toFixed(0)}` : "—"}</div>
                    </td>

                    <td className="py-3 pr-3">
                      <div className="text-slate-300">{x.next_action || "—"}</div>
                    </td>

                    <td className="py-3 pl-3 text-right">
                      <div className="flex justify-end gap-2 flex-wrap">
                        <Button
                          tone="slate"
                          onClick={() => onOk?.("Work order detail page comes next: timeline, photos, messages, vendor bids, invoices.")}
                        >
                          Details
                        </Button>
                        <Button
                          tone="indigo"
                          onClick={() => onOk?.("Assign vendor flow comes next (vendor directory + service categories).")}
                        >
                          Assign
                        </Button>
                        <Button
                          tone="emerald"
                          onClick={() => onOk?.("Complete/close flow comes next: attach invoice → close → update owner statement.")}
                        >
                          Close
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 text-[11px] text-slate-500">
          Backend wiring plan (next): <span className="text-slate-300 font-mono">/pm/work-orders</span> with filters for property/unit/status/severity.
          Work orders will link to <span className="text-slate-300 font-mono">Property</span>, <span className="text-slate-300 font-mono">Unit</span>, optional <span className="text-slate-300 font-mono">Vendor</span>, and optional existing <span className="text-slate-300 font-mono">Ticket</span> object under the hood.
        </div>
      </Section>

      {/* Charts placeholders (UI-first) */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Section title="Work orders trend (placeholder)" subtitle="Created vs closed over time" right={<Pill>Charts next</Pill>}>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
            <div className="text-sm text-slate-200 font-semibold">Coming next</div>
            <div className="text-xs text-slate-400 mt-1">
              Once we wire PMMetricsSnapshot, we’ll render charts here:
            </div>
            <ul className="mt-3 text-sm text-slate-300 list-disc pl-5 space-y-1">
              <li>Work orders created per week</li>
              <li>Closed per week</li>
              <li>Avg resolution time trend</li>
              <li>Emergency vs routine ratio</li>
            </ul>
          </div>
        </Section>

        <Section title="Cost risk (placeholder)" subtitle="Maintenance spend vs rent (risk flag)" right={<Pill tone="amber">Watch</Pill>}>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
            <div className="text-sm text-slate-200 font-semibold">Decision-first outputs</div>
            <div className="text-xs text-slate-400 mt-1">When wired, this will auto-generate actions:</div>
            <ul className="mt-3 text-sm text-slate-300 list-disc pl-5 space-y-1">
              <li>“Maintenance exceeds X% of rent” → risk alert</li>
              <li>“Repeat issue detected” → preventative maintenance task</li>
              <li>“Vendor costs rising” → bid comparison</li>
            </ul>
          </div>
        </Section>
      </div>

      {/* Create Modal */}
      <Modal
        open={openCreate}
        title="New Work Order"
        subtitle="Create a PM-only maintenance request tied to a property + unit"
        onClose={closeCreateModal}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button tone="slate" onClick={closeCreateModal} disabled={creating}>
              Cancel
            </Button>
            <Button tone="cyan" onClick={createWorkOrder} disabled={creating}>
              {creating ? "Creating…" : "Create Work Order"}
            </Button>
          </div>
        }
      >
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Title (required)" hint="Example: No heat, leaking sink, broken lock">
            <input
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
              placeholder="Short summary"
            />
          </Field>

          <Field label="Severity" hint="Emergency = immediate dispatch">
            <select
              value={form.severity}
              onChange={(e) => setForm((p) => ({ ...p, severity: e.target.value }))}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
            >
              <option value="ROUTINE">Routine</option>
              <option value="URGENT">Urgent</option>
              <option value="EMERGENCY">Emergency</option>
            </select>
          </Field>

          <Field label="Property" hint={propertyOptions.length ? "Required" : "Create a property first (Overview tab)."}>
            <select
              value={form.property_id}
              onChange={(e) => {
                const v = e.target.value;
                setForm((p) => ({ ...p, property_id: v, unit_id: "" }));
              }}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
              disabled={!propertyOptions.length}
            >
              <option value="">{propertyOptions.length ? "Select a property…" : "No properties yet"}</option>
              {propertyOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Unit" hint={unitOptions.length ? "Required" : "Add units under Properties first."}>
            <select
              value={form.unit_id}
              onChange={(e) => setForm((p) => ({ ...p, unit_id: e.target.value }))}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
              disabled={!unitOptions.length}
            >
              <option value="">{unitOptions.length ? "Select a unit…" : "No units yet"}</option>
              {filteredUnitsForForm.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                  {u.property_name ? ` • ${u.property_name}` : ""}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-3 grid gap-3">
          <Field label="Description" hint="Capture symptoms, photos requested, tenant notes, etc.">
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full min-h-[110px] rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
              placeholder="What happened? When did it start? Any safety concerns?"
            />
          </Field>

          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Access notes" hint="Gate code, lockbox, tenant availability, pets, parking">
              <textarea
                value={form.access_notes}
                onChange={(e) => setForm((p) => ({ ...p, access_notes: e.target.value }))}
                className="w-full min-h-[90px] rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                placeholder="Access details…"
              />
            </Field>

            <Field label="Photos (note)" hint="UI-first: uploads will be added later (attachments)">
              <textarea
                value={form.photos_note}
                onChange={(e) => setForm((p) => ({ ...p, photos_note: e.target.value }))}
                className="w-full min-h-[90px] rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                placeholder="If tenant sent photos, mention it here for now…"
              />
            </Field>
          </div>

          <div className="text-[11px] text-slate-500">
            Next backend: store work orders + messages + attachments and optionally link them to your existing Ticket system
            (PM-only category set).
          </div>
        </div>
      </Modal>
    </div>
  );
}
