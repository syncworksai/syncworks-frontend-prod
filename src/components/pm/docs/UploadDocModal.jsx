// src/components/pm/docs/UploadDocModal.jsx
import React from "react";
import { cx, Modal, Field, Input, Select, DOC_TYPES } from "./docsUi";

export default function UploadDocModal({
  open,
  busy,
  form,
  setFormValue,
  setForm,
  properties,
  unitsForFormProperty,
  tenantsForFormScope,
  formErr,
  onClose,
  onSubmit,
}) {
  return (
    <Modal open={open} title="Upload document" onClose={() => (busy ? null : onClose?.())} disableClose={busy}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Property *">
          <Select
            value={form.property}
            onChange={(e) => {
              const v = e.target.value;
              setForm((p) => ({ ...p, property: v, unit: "", tenant: "" }));
            }}
            disabled={busy}
          >
            <option value="">Select</option>
            {properties.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.name || `#${p.id}`}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Type">
          <Select value={form.doc_type} onChange={(e) => setFormValue("doc_type", e.target.value)} disabled={busy}>
            {DOC_TYPES.map((x) => (
              <option key={x.value} value={x.value}>
                {x.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Unit (optional)" hint="Attach to a unit when this doc belongs to a specific unit.">
          <Select
            value={form.unit}
            onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value, tenant: "" }))}
            disabled={busy || !form.property}
          >
            <option value="">{!form.property ? "Select property first" : "—"}</option>
            {unitsForFormProperty.map((u) => {
              const label = u.label || u.unit_number || u.name || `#${u.id}`;
              return (
                <option key={u.id} value={String(u.id)}>
                  {label}
                </option>
              );
            })}
          </Select>
        </Field>

        <Field label="Tenant (optional)" hint="Attach to a tenant when this doc is tenant-specific.">
          <Select value={form.tenant} onChange={(e) => setFormValue("tenant", e.target.value)} disabled={busy || !form.property}>
            <option value="">{!form.property ? "Select property first" : "—"}</option>
            {tenantsForFormScope.map((t) => {
              const name = [t.first_name, t.last_name].filter(Boolean).join(" ").trim() || t.full_name || `#${t.id}`;
              return (
                <option key={t.id} value={String(t.id)}>
                  {name}
                </option>
              );
            })}
          </Select>
        </Field>

        <Field label="Title" hint="Optional. If empty, we’ll use the file name.">
          <Input
            value={form.title}
            onChange={(e) => setFormValue("title", e.target.value)}
            disabled={busy}
            placeholder="Lease - B204 - 2026"
          />
        </Field>

        <Field label="File *">
          <input
            type="file"
            disabled={busy}
            className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-slate-200"
            onChange={(e) => setFormValue("file", e.target.files?.[0] || null)}
          />
          <div className="text-[11px] text-slate-500 mt-1">PDF recommended. Images and DOCX allowed (we’ll normalize later).</div>
        </Field>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
        <div className="text-sm text-slate-100 font-semibold">Visibility</div>
        <div className="text-xs text-slate-500 mt-1">Private = only PM staff/owners. Public = tenant portal (future wiring).</div>
        <div className="mt-3 flex gap-2 flex-wrap">
          <button
            type="button"
            disabled={busy}
            onClick={() => setFormValue("private", true)}
            className={cx(
              "px-3 py-2 rounded-xl border text-xs",
              form.private
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                : "border-slate-800 bg-slate-950/40 text-slate-200 hover:bg-slate-900/40"
            )}
          >
            🔒 Private
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setFormValue("private", false)}
            className={cx(
              "px-3 py-2 rounded-xl border text-xs",
              !form.private
                ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-100"
                : "border-slate-800 bg-slate-950/40 text-slate-200 hover:bg-slate-900/40"
            )}
          >
            🌐 Tenant Portal
          </button>
        </div>
      </div>

      {formErr ? <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">{formErr}</div> : null}

      <div className="mt-5 flex items-center justify-end gap-2">
        <button
          onClick={onClose}
          disabled={busy}
          className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-2 text-sm text-slate-200 hover:bg-slate-900 disabled:opacity-60"
          title="Cancel"
          type="button"
        >
          ✖
        </button>
        <button
          onClick={onSubmit}
          disabled={busy}
          className="rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/10 px-4 py-2 text-sm text-fuchsia-100 hover:bg-fuchsia-500/15 disabled:opacity-60"
          title="Upload"
          type="button"
        >
          ✅ Upload
        </button>
      </div>
    </Modal>
  );
}
