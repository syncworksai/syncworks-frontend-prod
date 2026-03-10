// src/components/pm/PropertiesPanel.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../ui/Button";
import api from "../../api/client";

function normalizeErr(e) {
  const data = e?.response?.data;
  const status = e?.response?.status;
  const prefix = status ? `[${status}] ` : "";

  if (!data) return prefix + (e?.message || "Request failed.");
  if (typeof data === "string") return prefix + data;
  if (Array.isArray(data)) return prefix + data.join(", ");

  if (typeof data === "object") {
    if (data.detail) return prefix + String(data.detail);
    const parts = [];
    for (const [k, v] of Object.entries(data)) {
      if (Array.isArray(v)) parts.push(`${k}: ${v.join(", ")}`);
      else if (typeof v === "string") parts.push(`${k}: ${v}`);
      else parts.push(`${k}: ${JSON.stringify(v)}`);
    }
    return prefix + (parts.join(" • ") || "Request failed.");
  }
  return prefix + "Request failed.";
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
  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full border text-[11px] ${cls}`}
    >
      {children}
    </span>
  );
}

function Section({ title, subtitle, right, children }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="font-semibold">{title}</div>
          {subtitle ? (
            <div className="text-xs text-slate-400 mt-1">{subtitle}</div>
          ) : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Modal({ open, title, subtitle, onClose, children, footer, disableClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70"
        onClick={() => (!disableClose ? onClose?.() : null)}
      />
      <div className="relative w-full max-w-4xl rounded-3xl border border-slate-800 bg-[#020617] shadow-2xl">
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold">{title}</div>
              {subtitle ? (
                <div className="text-xs text-slate-400 mt-1">{subtitle}</div>
              ) : null}
            </div>
            <Button tone="slate" onClick={onClose} disabled={!!disableClose} type="button">
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

function Field({ label, hint, children, required }) {
  return (
    <div>
      <div className="text-xs text-slate-400 mb-1">
        {label} {required ? <span className="text-rose-300">*</span> : null}
      </div>
      {children}
      {hint ? <div className="text-[11px] text-slate-500 mt-1">{hint}</div> : null}
    </div>
  );
}

function statusTone(st) {
  const s = (st || "").toUpperCase();
  if (s === "HEALTHY") return "emerald";
  if (s === "WATCH") return "amber";
  if (s === "AT_RISK") return "rose";
  return "slate";
}

function typePill(type) {
  const t = String(type || "HOME").toUpperCase();
  if (t === "APARTMENT") return { label: "Apartment", tone: "cyan" };
  if (t === "MULTI_FAMILY") return { label: "Multi-Family", tone: "indigo" };
  if (t === "CONDO") return { label: "Condo", tone: "amber" };
  if (t === "COMMERCIAL") return { label: "Commercial", tone: "rose" };
  if (t === "OTHER") return { label: "Other", tone: "slate" };
  return { label: "Home", tone: "emerald" };
}

function clean2(s) {
  return String(s || "").trim().toUpperCase().slice(0, 2);
}

export default function PropertiesPanel({
  properties = [],
  loading = false,
  onRefresh = null,
  onOk = null,
  onErr = null,
  onCreateProperty = null,
}) {
  const nav = useNavigate();

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");

  // create
  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState("");
  const [createAutoUnit, setCreateAutoUnit] = useState(true);
  const [createAutoUnitLabel, setCreateAutoUnitLabel] = useState("Unit 1");

  const [form, setForm] = useState({
    name: "",
    property_type: "HOME",
    address: "",
    city: "",
    state: "",
    zip: "",
    notes: "",
  });

  // edit
  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editErr, setEditErr] = useState("");
  const [editForm, setEditForm] = useState({
    id: null,
    name: "",
    property_type: "HOME",
    address: "",
    city: "",
    state: "",
    zip: "",
    notes: "",
    status: "HEALTHY",
  });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (Array.isArray(properties) ? properties : []).filter((p) => {
      const blob = [p.name, p.property_type, p.address, p.city, p.state, p.zip, p.notes, p.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const okQ = !needle || blob.includes(needle);
      const okStatus = status === "ALL" ? true : (p.status || "").toUpperCase() === status;
      return okQ && okStatus;
    });
  }, [properties, q, status]);

  function openCreateModal() {
    setCreateErr("");
    setCreateAutoUnit(true);
    setCreateAutoUnitLabel("Unit 1");
    setForm({ name: "", property_type: "HOME", address: "", city: "", state: "", zip: "", notes: "" });
    setOpenCreate(true);
  }

  function closeCreateModal() {
    if (creating) return;
    setOpenCreate(false);
    setCreating(false);
    setCreateErr("");
  }

  function openEditModal(p) {
    setEditErr("");
    setEditForm({
      id: p?.id ?? null,
      name: p?.name || "",
      property_type: p?.property_type || "HOME",
      address: p?.address || "",
      city: p?.city || "",
      state: p?.state || "",
      zip: p?.zip || "",
      notes: p?.notes || "",
      status: (p?.status || "HEALTHY").toUpperCase(),
    });
    setOpenEdit(true);
  }

  function closeEditModal() {
    if (editing) return;
    setOpenEdit(false);
    setEditing(false);
    setEditErr("");
  }

  async function createPropertyViaApi(payload) {
    const r = await api.post("/pm/properties/", payload);
    return r.data;
  }

  async function patchPropertyViaApi(id, payload) {
    const r = await api.patch(`/pm/properties/${id}/`, payload);
    return r.data;
  }

  async function createDefaultUnit(propertyId, label) {
    const payload = {
      property: Number(propertyId),
      label: String(label || "Unit 1").trim() || "Unit 1",
      status: "VACANT",
    };
    const r = await api.post("/pm/units/", payload);
    return r.data;
  }

  async function createProperty() {
    setCreateErr("");

    const payload = {
      name: String(form.name || "").trim(),
      property_type: form.property_type,
      address: String(form.address || "").trim(),
      city: String(form.city || "").trim(),
      state: clean2(form.state),
      zip: String(form.zip || "").trim(),
      notes: String(form.notes || "").trim(),
    };

    if (!payload.name) {
      const msg = "Property name is required.";
      setCreateErr(msg);
      onErr?.(msg);
      return;
    }

    setCreating(true);
    try {
      let created = null;

      if (onCreateProperty) created = await onCreateProperty(payload);
      else created = await createPropertyViaApi(payload);

      const isHome = String(payload.property_type || "HOME").toUpperCase() === "HOME";
      if (isHome && createAutoUnit) {
        const newId = created?.id;
        if (newId) {
          try {
            await createDefaultUnit(newId, createAutoUnitLabel);
          } catch (e) {
            const msg = `Property created, but default unit failed: ${normalizeErr(e)}`;
            onErr?.(msg);
            setCreateErr(msg);
          }
        }
      }

      onOk?.("Property created.");
      setOpenCreate(false);
      setCreating(false);
      onRefresh?.();
    } catch (e) {
      const msg = normalizeErr(e);
      setCreateErr(msg);
      onErr?.(msg);
      setCreating(false);
    }
  }

  async function saveEdit() {
    setEditErr("");

    if (!editForm.id) {
      const msg = "Missing property id.";
      setEditErr(msg);
      onErr?.(msg);
      return;
    }

    const payload = {
      name: String(editForm.name || "").trim(),
      property_type: editForm.property_type,
      address: String(editForm.address || "").trim(),
      city: String(editForm.city || "").trim(),
      state: clean2(editForm.state),
      zip: String(editForm.zip || "").trim(),
      notes: String(editForm.notes || "").trim(),
      status: String(editForm.status || "").toUpperCase(),
    };

    if (!payload.name) {
      const msg = "Property name is required.";
      setEditErr(msg);
      onErr?.(msg);
      return;
    }

    setEditing(true);
    try {
      await patchPropertyViaApi(editForm.id, payload);
      onOk?.("Property updated.");
      setOpenEdit(false);
      setEditing(false);
      onRefresh?.();
    } catch (e) {
      const msg = normalizeErr(e);
      setEditErr(msg);
      onErr?.(msg);
      setEditing(false);
    }
  }

  const totalCount = Array.isArray(properties) ? properties.length : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-9 w-[280px] max-w-[78vw] rounded-xl bg-slate-950 border border-slate-800 px-3 text-sm"
          placeholder="Search properties…"
        />

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-xl bg-slate-950 border border-slate-800 px-3 text-sm"
        >
          <option value="ALL">All statuses</option>
          <option value="HEALTHY">Healthy</option>
          <option value="WATCH">Watch</option>
          <option value="AT_RISK">At Risk</option>
        </select>

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <Button tone="cyan" onClick={openCreateModal} type="button">
            New Property
          </Button>
          <Button tone="slate" onClick={() => onRefresh?.()} disabled={!!loading} type="button">
            Refresh
          </Button>
        </div>
      </div>

      <Section
        title="Properties"
        subtitle={`Showing ${filtered.length} record(s)`}
        right={
          <div className="flex items-center gap-2">
            <Pill tone="emerald">{totalCount} total</Pill>
          </div>
        }
      >
        {loading ? (
          <div className="text-sm text-slate-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-slate-400">No properties match your filters. Create one to start.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((p) => {
              const t = typePill(p.property_type);
              return (
                <div key={p.id} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-[240px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-semibold">{p.name || "Untitled Property"}</div>
                        <Pill tone={statusTone(p.status)}>{String(p.status || "—").toUpperCase()}</Pill>
                        <Pill tone={t.tone}>{t.label}</Pill>
                      </div>

                      <div className="text-xs text-slate-400 mt-1">
                        {[p.address, p.city, p.state, p.zip].filter(Boolean).join(", ") || "—"}
                      </div>

                      {p.units_count !== undefined ? (
                        <div className="mt-2 flex gap-2 flex-wrap">
                          <Pill tone="cyan">{p.units_count} units</Pill>
                          <Pill tone="amber">{Math.round((p.occupancy_rate || 0) * 100)}% occupied</Pill>
                          <Pill tone="indigo">{p.section8_units || 0} S8 units</Pill>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        tone="slate"
                        type="button"
                        onClick={() => nav(`/pm/properties/${p.id}`)}
                        disabled={!p?.id}
                      >
                        Open
                      </Button>

                      <Button
                        tone="slate"
                        type="button"
                        onClick={() => nav(`/pm/properties/${p.id}?tab=units`)}
                        disabled={!p?.id}
                      >
                        Units
                      </Button>

                      <Button tone="slate" type="button" onClick={() => openEditModal(p)}>
                        Edit
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* CREATE */}
      <Modal
        open={openCreate}
        title="Create Property"
        subtitle="SFH-first: create a home, auto-create Unit 1, then invite tenants."
        onClose={closeCreateModal}
        disableClose={creating}
        footer={
          <div className="flex justify-end gap-2">
            <Button tone="slate" onClick={closeCreateModal} disabled={creating} type="button">
              Cancel
            </Button>
            <Button tone="cyan" onClick={createProperty} disabled={creating} type="button">
              {creating ? "Creating…" : "Create"}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Name" required>
            <input
              value={form.name}
              onChange={(e) => setForm((p2) => ({ ...p2, name: e.target.value }))}
              className="h-10 w-full rounded-xl bg-slate-950 border border-slate-800 px-3 text-sm"
              placeholder="Test Property A"
              disabled={creating}
            />
          </Field>

          <Field label="Property Type">
            <select
              value={form.property_type}
              onChange={(e) => setForm((p2) => ({ ...p2, property_type: e.target.value }))}
              className="h-10 w-full rounded-xl bg-slate-950 border border-slate-800 px-3 text-sm"
              disabled={creating}
            >
              <option value="HOME">Home / Single Family</option>
              <option value="APARTMENT">Apartment Building</option>
              <option value="MULTI_FAMILY">Multi-Family (2–4)</option>
              <option value="CONDO">Condo</option>
              <option value="COMMERCIAL">Commercial</option>
              <option value="OTHER">Other</option>
            </select>
          </Field>

          <Field label="Address">
            <input
              value={form.address}
              onChange={(e) => setForm((p2) => ({ ...p2, address: e.target.value }))}
              className="h-10 w-full rounded-xl bg-slate-950 border border-slate-800 px-3 text-sm"
              placeholder="123 Main St"
              disabled={creating}
            />
          </Field>

          <Field label="City / State / Zip">
            <div className="grid grid-cols-3 gap-2">
              <input
                value={form.city}
                onChange={(e) => setForm((p2) => ({ ...p2, city: e.target.value }))}
                className="h-10 rounded-xl bg-slate-950 border border-slate-800 px-3 text-sm"
                placeholder="Montgomery"
                disabled={creating}
              />
              <input
                value={form.state}
                onChange={(e) => setForm((p2) => ({ ...p2, state: e.target.value }))}
                className="h-10 rounded-xl bg-slate-950 border border-slate-800 px-3 text-sm"
                placeholder="AL"
                maxLength={2}
                disabled={creating}
              />
              <input
                value={form.zip}
                onChange={(e) => setForm((p2) => ({ ...p2, zip: e.target.value }))}
                className="h-10 rounded-xl bg-slate-950 border border-slate-800 px-3 text-sm"
                placeholder="36117"
                disabled={creating}
              />
            </div>
          </Field>

          <Field label="Notes" hint="Internal notes (owners, quirks, vendors, etc.)">
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p2) => ({ ...p2, notes: e.target.value }))}
              className="min-h-[110px] w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
              placeholder="Gate code, trash day, HOA rules…"
              disabled={creating}
            />
          </Field>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="font-semibold">SFH Speed Mode</div>
            <div className="text-sm text-slate-300 mt-1">
              For <span className="text-slate-200 font-semibold">Homes</span>, production flow is usually:
              <div className="mt-2 text-slate-400 text-xs">Create property → auto-create Unit 1 → invite tenant</div>
            </div>

            <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={createAutoUnit}
                  onChange={(e) => setCreateAutoUnit(e.target.checked)}
                  disabled={creating || String(form.property_type || "HOME").toUpperCase() !== "HOME"}
                />
                Auto-create default unit for Homes
              </label>

              <div className="mt-2">
                <div className="text-[11px] text-slate-500 mb-1">Unit label</div>
                <input
                  value={createAutoUnitLabel}
                  onChange={(e) => setCreateAutoUnitLabel(e.target.value)}
                  className="h-9 w-full rounded-xl bg-slate-950 border border-slate-800 px-3 text-sm"
                  placeholder="Unit 1"
                  disabled={
                    creating ||
                    !createAutoUnit ||
                    String(form.property_type || "HOME").toUpperCase() !== "HOME"
                  }
                />
                <div className="mt-1 text-[11px] text-slate-500">
                  If disabled, you can add units in Property Detail → Units.
                </div>
              </div>

              {String(form.property_type || "HOME").toUpperCase() !== "HOME" ? (
                <div className="mt-2 text-[11px] text-slate-500">
                  Auto-unit is only for <span className="text-slate-300 font-semibold">Home</span> type.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {createErr ? (
          <div className="mt-4 rounded-2xl border border-rose-700/30 bg-rose-900/15 p-3 text-sm text-rose-200">
            {createErr}
          </div>
        ) : null}
      </Modal>

      {/* EDIT */}
      <Modal
        open={openEdit}
        title="Edit Property"
        subtitle="Update details, status, and notes."
        onClose={closeEditModal}
        disableClose={editing}
        footer={
          <div className="flex justify-end gap-2">
            <Button tone="slate" onClick={closeEditModal} disabled={editing} type="button">
              Cancel
            </Button>
            <Button tone="cyan" onClick={saveEdit} disabled={editing} type="button">
              {editing ? "Saving…" : "Save"}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Name" required>
            <input
              value={editForm.name}
              onChange={(e) => setEditForm((p2) => ({ ...p2, name: e.target.value }))}
              className="h-10 w-full rounded-xl bg-slate-950 border border-slate-800 px-3 text-sm"
              disabled={editing}
            />
          </Field>

          <Field label="Status">
            <select
              value={editForm.status}
              onChange={(e) => setEditForm((p2) => ({ ...p2, status: e.target.value }))}
              className="h-10 w-full rounded-xl bg-slate-950 border border-slate-800 px-3 text-sm"
              disabled={editing}
            >
              <option value="HEALTHY">Healthy</option>
              <option value="WATCH">Watch</option>
              <option value="AT_RISK">At Risk</option>
            </select>
          </Field>

          <Field label="Property Type">
            <select
              value={editForm.property_type}
              onChange={(e) => setEditForm((p2) => ({ ...p2, property_type: e.target.value }))}
              className="h-10 w-full rounded-xl bg-slate-950 border border-slate-800 px-3 text-sm"
              disabled={editing}
            >
              <option value="HOME">Home / Single Family</option>
              <option value="APARTMENT">Apartment Building</option>
              <option value="MULTI_FAMILY">Multi-Family (2–4)</option>
              <option value="CONDO">Condo</option>
              <option value="COMMERCIAL">Commercial</option>
              <option value="OTHER">Other</option>
            </select>
          </Field>

          <Field label="Address">
            <input
              value={editForm.address}
              onChange={(e) => setEditForm((p2) => ({ ...p2, address: e.target.value }))}
              className="h-10 w-full rounded-xl bg-slate-950 border border-slate-800 px-3 text-sm"
              disabled={editing}
            />
          </Field>

          <Field label="City / State / Zip">
            <div className="grid grid-cols-3 gap-2">
              <input
                value={editForm.city}
                onChange={(e) => setEditForm((p2) => ({ ...p2, city: e.target.value }))}
                className="h-10 rounded-xl bg-slate-950 border border-slate-800 px-3 text-sm"
                disabled={editing}
              />
              <input
                value={editForm.state}
                onChange={(e) => setEditForm((p2) => ({ ...p2, state: e.target.value }))}
                className="h-10 rounded-xl bg-slate-950 border border-slate-800 px-3 text-sm"
                maxLength={2}
                disabled={editing}
              />
              <input
                value={editForm.zip}
                onChange={(e) => setEditForm((p2) => ({ ...p2, zip: e.target.value }))}
                className="h-10 rounded-xl bg-slate-950 border border-slate-800 px-3 text-sm"
                disabled={editing}
              />
            </div>
          </Field>

          <Field label="Notes" hint="Internal notes (owners, quirks, vendors, etc.)">
            <textarea
              value={editForm.notes}
              onChange={(e) => setEditForm((p2) => ({ ...p2, notes: e.target.value }))}
              className="min-h-[110px] w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
              disabled={editing}
            />
          </Field>
        </div>

        {editErr ? (
          <div className="mt-4 rounded-2xl border border-rose-700/30 bg-rose-900/15 p-3 text-sm text-rose-200">
            {editErr}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
