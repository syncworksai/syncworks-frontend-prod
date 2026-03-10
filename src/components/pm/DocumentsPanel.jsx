// src/components/pm/DocumentsPanel.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/client";

import { normalizeErr, Pill, IconBtn, Field, Input, Select, DOC_TYPES } from "./docs/docsUi";

import DocsTable from "./docs/DocsTable";
import UploadDocModal from "./docs/UploadDocModal";
import DeleteDocModal from "./docs/DeleteDocModal";

export default function DocumentsPanel({ onChanged }) {
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [docs, setDocs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // Filters
  const [filterPropertyId, setFilterPropertyId] = useState("");
  const [filterUnitId, setFilterUnitId] = useState("");
  const [filterTenantId, setFilterTenantId] = useState("");
  const [filterType, setFilterType] = useState("");
  const [q, setQ] = useState("");

  // Upload modal
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState("");

  const [form, setForm] = useState({
    property: "",
    unit: "",
    tenant: "",
    doc_type: "GENERAL",
    title: "",
    file: null,
    private: true,
  });

  // Delete confirm
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteErr, setDeleteErr] = useState("");
  const [deleteText, setDeleteText] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  function toastOk(msg) {
    setOk(msg || "");
    setErr("");
  }
  function toastErr(msg) {
    setErr(msg || "Error.");
    setOk("");
  }

  async function tryGet(path, params) {
    const r = await api.get(path, params ? { params } : undefined);
    const data = r.data;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data)) return data;
    return [];
  }

  async function refreshAll() {
    setLoading(true);
    setErr("");
    setOk("");

    try {
      const [p, u, t, d] = await Promise.all([
        tryGet("/pm/properties/").catch(() => []),
        tryGet("/pm/units/").catch(() => []),
        tryGet("/pm/tenants/").catch(() => []),
        tryGet("/pm/documents/").catch(() => []),
      ]);
      setProperties(p);
      setUnits(u);
      setTenants(t);
      setDocs(d);
    } catch (e) {
      toastErr(normalizeErr(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const propertyById = useMemo(() => {
    const m = new Map();
    for (const p of properties) m.set(String(p.id), p);
    return m;
  }, [properties]);

  const unitById = useMemo(() => {
    const m = new Map();
    for (const u of units) m.set(String(u.id), u);
    return m;
  }, [units]);

  const tenantById = useMemo(() => {
    const m = new Map();
    for (const t of tenants) m.set(String(t.id), t);
    return m;
  }, [tenants]);

  const unitsForSelectedProperty = useMemo(() => {
    if (!filterPropertyId) return units;
    return units.filter((u) => String(u.property_id ?? u.property ?? "") === String(filterPropertyId));
  }, [units, filterPropertyId]);

  const tenantsForSelectedScope = useMemo(() => {
    if (filterUnitId) return tenants.filter((t) => String(t.unit ?? "") === String(filterUnitId));
    if (filterPropertyId) return tenants.filter((t) => String(t.property ?? "") === String(filterPropertyId));
    return tenants;
  }, [tenants, filterPropertyId, filterUnitId]);

  const filteredDocs = useMemo(() => {
    let list = Array.isArray(docs) ? docs.slice() : [];

    if (filterPropertyId) list = list.filter((d) => String(d.property ?? "") === String(filterPropertyId));
    if (filterUnitId) list = list.filter((d) => String(d.unit ?? "") === String(filterUnitId));
    if (filterTenantId) list = list.filter((d) => String(d.tenant ?? "") === String(filterTenantId));
    if (filterType) list = list.filter((d) => String(d.doc_type ?? "").toUpperCase() === String(filterType).toUpperCase());

    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter((d) => {
        const blob = [d.title, d.file_name, d.doc_type, d.notes].filter(Boolean).join(" ").toLowerCase();
        return blob.includes(needle);
      });
    }

    return list;
  }, [docs, filterPropertyId, filterUnitId, filterTenantId, filterType, q]);

  const counts = useMemo(() => {
    const all = Array.isArray(docs) ? docs : [];
    const total = all.length;
    const lease = all.filter((d) => String(d.doc_type || "").toUpperCase() === "LEASE").length;
    const s8 = all.filter((d) => String(d.doc_type || "").toUpperCase().includes("SECTION8")).length;
    const apps = all.filter((d) => String(d.doc_type || "").toUpperCase() === "APPLICATION").length;
    return { total, lease, s8, apps };
  }, [docs]);

  function openUpload() {
    setFormErr("");
    setForm({
      property: filterPropertyId || "",
      unit: filterUnitId || "",
      tenant: filterTenantId || "",
      doc_type: filterType || "GENERAL",
      title: "",
      file: null,
      private: true,
    });
    setOpen(true);
  }

  function closeUpload() {
    if (busy) return;
    setOpen(false);
    setBusy(false);
    setFormErr("");
  }

  function setFormValue(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  const unitsForFormProperty = useMemo(() => {
    if (!form.property) return units;
    return units.filter((u) => String(u.property_id ?? u.property ?? "") === String(form.property));
  }, [units, form.property]);

  const tenantsForFormScope = useMemo(() => {
    if (form.unit) return tenants.filter((t) => String(t.unit ?? "") === String(form.unit));
    if (form.property) return tenants.filter((t) => String(t.property ?? "") === String(form.property));
    return tenants;
  }, [tenants, form.property, form.unit]);

  async function submitUpload() {
    setBusy(true);
    setFormErr("");
    setErr("");
    setOk("");

    try {
      if (!form.property) throw new Error("Property required.");
      if (!form.file) throw new Error("File required.");

      const fd = new FormData();
      fd.append("property", String(form.property));
      if (form.unit) fd.append("unit", String(form.unit));
      if (form.tenant) fd.append("tenant", String(form.tenant));
      fd.append("doc_type", String(form.doc_type || "GENERAL"));
      fd.append("title", String(form.title || "").trim() || form.file.name);
      fd.append("private", form.private ? "true" : "false");
      fd.append("file", form.file);

      const r = await api.post("/pm/documents/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toastOk("✅ Uploaded");
      setOpen(false);
      setBusy(false);

      const created = r.data;
      setDocs((prev) => [created, ...(Array.isArray(prev) ? prev : [])]);

      await refreshAll();
      onChanged?.();
    } catch (e) {
      setFormErr(normalizeErr(e));
      setBusy(false);
    }
  }

  function openDelete(d) {
    setDeleteTarget(d || null);
    setDeleteText("");
    setDeleteErr("");
    setDeleteOpen(true);
  }

  function closeDelete() {
    if (deleteBusy) return;
    setDeleteOpen(false);
    setDeleteBusy(false);
    setDeleteErr("");
    setDeleteText("");
    setDeleteTarget(null);
  }

  async function confirmDelete() {
    if (!deleteTarget?.id) return;
    if (deleteText.trim().toUpperCase() !== "DELETE") {
      setDeleteErr("Type DELETE to confirm.");
      return;
    }

    setDeleteBusy(true);
    setDeleteErr("");
    setErr("");
    setOk("");

    try {
      await api.delete(`/pm/documents/${deleteTarget.id}/`);
      setDocs((prev) => (Array.isArray(prev) ? prev.filter((x) => x.id !== deleteTarget.id) : prev));
      toastOk("🗑️ Deleted");
      setDeleteBusy(false);
      setDeleteOpen(false);
      setDeleteTarget(null);
      await refreshAll();
      onChanged?.();
    } catch (e) {
      setDeleteErr(normalizeErr(e));
      setDeleteBusy(false);
    }
  }

  const isLoading = loading;

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="font-semibold text-slate-100">Documents</div>
          <div className="text-xs text-slate-400 mt-1">Property / Unit / Tenant vault • upload anything once, find it fast.</div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <IconBtn tone="slate" title="Refresh" onClick={refreshAll} disabled={isLoading}>
            🔄
          </IconBtn>
          <IconBtn tone="cyan" title="Upload" onClick={openUpload} disabled={isLoading || properties.length === 0}>
            ⬆️
          </IconBtn>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="text-xs text-slate-400">Vault</div>
          <div className="mt-2 flex items-center gap-2">
            <div className="text-2xl font-semibold text-slate-100">{counts.total}</div>
            <Pill tone={counts.total ? "emerald" : "slate"}>{counts.total ? "Active" : "Empty"}</Pill>
          </div>
          <div className="mt-3 flex gap-2 flex-wrap">
            <Pill tone="cyan">Leases: {counts.lease}</Pill>
            <Pill tone="amber">Section 8: {counts.s8}</Pill>
            <Pill tone="purple">Apps: {counts.apps}</Pill>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="text-xs text-slate-400">Onboarding lanes</div>
          <div className="mt-2 text-sm text-slate-200 font-semibold">New PM company</div>
          <div className="text-xs text-slate-500 mt-1">Use built-in templates (coming next) and auto-fill from your property/unit/tenant data.</div>
          <div className="mt-3 text-sm text-slate-200 font-semibold">Existing PM company</div>
          <div className="text-xs text-slate-500 mt-1">Upload your current docs — we’ll map them and automate reminders/workflows.</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="text-xs text-slate-400">CSV import (coming next)</div>
          <div className="text-sm text-slate-200 mt-2">Bulk upload docs + portfolios so onboarding is 10 minutes.</div>
          <div className="text-xs text-slate-500 mt-2">Format will be downloadable from here (one-click).</div>
          <div className="mt-3">
            <Pill tone="purple">Automation-first ✅</Pill>
          </div>
        </div>
      </div>

      {err ? (
        <div className="mt-4 text-sm text-rose-200 bg-rose-900/15 border border-rose-700/30 rounded-2xl p-3">{err}</div>
      ) : null}
      {ok ? (
        <div className="mt-4 text-sm text-emerald-200 bg-emerald-900/15 border border-emerald-700/30 rounded-2xl p-3">{ok}</div>
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-5">
        <Field label="Property">
          <Select
            value={filterPropertyId}
            onChange={(e) => {
              setFilterPropertyId(e.target.value);
              setFilterUnitId("");
              setFilterTenantId("");
            }}
          >
            <option value="">{isLoading ? "Loading…" : "All"}</option>
            {properties.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.name || `#${p.id}`}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Unit">
          <Select
            value={filterUnitId}
            onChange={(e) => {
              setFilterUnitId(e.target.value);
              setFilterTenantId("");
            }}
            disabled={!filterPropertyId && units.length === 0}
          >
            <option value="">{isLoading ? "Loading…" : "All"}</option>
            {unitsForSelectedProperty.map((u) => {
              const label = u.label || u.unit_number || u.name || `#${u.id}`;
              return (
                <option key={u.id} value={String(u.id)}>
                  {label}
                </option>
              );
            })}
          </Select>
        </Field>

        <Field label="Tenant">
          <Select value={filterTenantId} onChange={(e) => setFilterTenantId(e.target.value)} disabled={tenants.length === 0}>
            <option value="">{isLoading ? "Loading…" : "All"}</option>
            {tenantsForSelectedScope.map((t) => {
              const name = [t.first_name, t.last_name].filter(Boolean).join(" ").trim() || t.full_name || `#${t.id}`;
              return (
                <option key={t.id} value={String(t.id)}>
                  {name}
                </option>
              );
            })}
          </Select>
        </Field>

        <Field label="Type">
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">All</option>
            {DOC_TYPES.map((x) => (
              <option key={x.value} value={x.value}>
                {x.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Search">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title, file name…" />
        </Field>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-6 text-slate-300">Loading…</div>
        ) : filteredDocs.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-6">
            <div className="text-slate-100 font-semibold">No documents</div>
            <div className="text-sm text-slate-500 mt-1">Upload one to begin building the automation layer.</div>
          </div>
        ) : (
          <DocsTable
            filteredDocs={filteredDocs}
            propertyById={propertyById}
            unitById={unitById}
            tenantById={tenantById}
            onOpen={(d) => {
              const url = d.url || d.file_url || d.download_url || "";
              if (!url) return toastErr("No download URL returned.");
              window.open(url, "_blank", "noopener,noreferrer");
            }}
            onDelete={openDelete}
          />
        )}
      </div>

      <UploadDocModal
        open={open}
        busy={busy}
        form={form}
        setFormValue={setFormValue}
        setForm={setForm}
        properties={properties}
        unitsForFormProperty={unitsForFormProperty}
        tenantsForFormScope={tenantsForFormScope}
        formErr={formErr}
        onClose={closeUpload}
        onSubmit={submitUpload}
      />

      <DeleteDocModal
        open={deleteOpen}
        deleteBusy={deleteBusy}
        deleteTarget={deleteTarget}
        deleteText={deleteText}
        setDeleteText={setDeleteText}
        deleteErr={deleteErr}
        onClose={closeDelete}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
