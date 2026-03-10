// src/components/pm/TenantsPanel.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/client";

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function normalizeErr(e) {
  const data = e?.response?.data;
  if (!data) return e?.message || "Request failed.";
  if (typeof data === "string") return data;
  if (Array.isArray(data)) return data.join(", ");
  if (typeof data === "object") {
    const parts = [];
    for (const [k, v] of Object.entries(data)) {
      if (Array.isArray(v)) parts.push(`${k}: ${v.join(", ")}`);
      else if (typeof v === "string") parts.push(`${k}: ${v}`);
      else parts.push(`${k}: ${JSON.stringify(v)}`);
    }
    return parts.join(" • ") || "Request failed.";
  }
  return "Request failed.";
}

function Pill({ children, tone = "slate" }) {
  const cls =
    tone === "purple"
      ? "border-fuchsia-500/40 text-fuchsia-200 bg-fuchsia-500/10"
      : tone === "emerald"
      ? "border-emerald-500/40 text-emerald-200 bg-emerald-500/10"
      : tone === "amber"
      ? "border-amber-500/40 text-amber-200 bg-amber-500/10"
      : tone === "rose"
      ? "border-rose-500/40 text-rose-200 bg-rose-500/10"
      : "border-slate-700 text-slate-300 bg-slate-950/40";
  return (
    <span className={cx("inline-flex items-center px-2 py-1 rounded-full border text-[11px]", cls)}>
      {children}
    </span>
  );
}

function TinyBadge({ icon, title, tone = "slate" }) {
  const cls =
    tone === "purple"
      ? "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-100"
      : tone === "emerald"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
      : tone === "amber"
      ? "border-amber-500/40 bg-amber-500/10 text-amber-100"
      : tone === "rose"
      ? "border-rose-500/40 bg-rose-500/10 text-rose-100"
      : "border-slate-800 bg-slate-950/40 text-slate-200";

  return (
    <span
      title={title}
      className={cx("inline-flex h-7 w-7 items-center justify-center rounded-xl border text-xs", cls)}
    >
      {icon}
    </span>
  );
}

function ClickPill({ active, tone = "slate", label, count, onClick }) {
  const ring =
    tone === "emerald"
      ? "border-emerald-500/40 bg-emerald-500/10"
      : tone === "amber"
      ? "border-amber-500/40 bg-amber-500/10"
      : tone === "rose"
      ? "border-rose-500/40 bg-rose-500/10"
      : "border-fuchsia-500/40 bg-fuchsia-500/10";

  return (
    <button
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 transition",
        active ? ring : "border-slate-800 bg-slate-950/50 hover:bg-slate-950/65"
      )}
      title="Click to filter"
      type="button"
    >
      <span className="text-xs text-slate-300">{label}</span>
      <span className="text-sm font-semibold text-slate-100">{count}</span>
    </button>
  );
}

function Modal({ open, title, onClose, disableClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/70" onClick={() => (!disableClose ? onClose?.() : null)} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
            <div className="text-slate-100 font-semibold">{title}</div>
            <button
              onClick={() => (!disableClose ? onClose?.() : null)}
              className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-slate-200 hover:bg-slate-900 disabled:opacity-60"
              disabled={disableClose}
              title="Close"
              type="button"
            >
              ✖
            </button>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      {children}
      {hint ? <div className="text-[11px] text-slate-500 mt-1">{hint}</div> : null}
    </label>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className={cx(
        "w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-slate-100",
        "placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30 focus:border-fuchsia-500/40",
        props.className
      )}
    />
  );
}

function TextArea(props) {
  return (
    <textarea
      {...props}
      className={cx(
        "w-full min-h-[90px] rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-slate-100",
        "placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30 focus:border-fuchsia-500/40",
        props.className
      )}
    />
  );
}

function Select(props) {
  return (
    <select
      {...props}
      className={cx(
        "w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-slate-100",
        "focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30 focus:border-fuchsia-500/40",
        props.className
      )}
    />
  );
}

function Checkbox({ checked, onChange, label, hint }) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/30 p-4 cursor-pointer">
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="mt-1 h-4 w-4 accent-fuchsia-500"
      />
      <div className="min-w-0">
        <div className="text-sm text-slate-100 font-semibold">{label}</div>
        {hint ? <div className="text-xs text-slate-500 mt-1">{hint}</div> : null}
      </div>
    </label>
  );
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleString();
}

const STATUS = [
  { value: "PROSPECT", label: "Prospect", tone: "purple" },
  { value: "TENANT", label: "Tenant", tone: "emerald" },
  { value: "FORMER", label: "Former", tone: "amber" },
];

function statusTone(v) {
  const s = STATUS.find((x) => x.value === v);
  return s?.tone || "slate";
}

function fullNameFromTenant(t) {
  const fn = (t?.first_name || "").trim();
  const ln = (t?.last_name || "").trim();
  const joined = `${fn} ${ln}`.trim();
  if (joined) return joined;
  return t?.full_name || t?.name || "—";
}

function IconBtn({ tone = "slate", title, onClick, disabled, children }) {
  const cls =
    tone === "purple"
      ? "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-100 hover:bg-fuchsia-500/15"
      : tone === "emerald"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15"
      : tone === "rose"
      ? "border-rose-500/40 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15"
      : "border-slate-800 bg-slate-900/40 text-slate-200 hover:bg-slate-900";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      type="button"
      className={cx(
        "h-9 w-9 inline-flex items-center justify-center rounded-xl border text-sm transition",
        cls,
        disabled ? "opacity-60 cursor-not-allowed" : ""
      )}
    >
      {children}
    </button>
  );
}

// ------------------------------
// FF tag lives in notes as "#FF"
// ------------------------------
function hasFFTag(text) {
  const s = String(text || "").toLowerCase();
  return s.includes("#ff") || s.includes("fully furnished") || s.includes("furnished");
}

function ensureFFTag(notes, enabled) {
  const raw = String(notes || "");
  const has = hasFFTag(raw);
  if (enabled && !has) {
    const sep = raw.trim() ? "\n" : "";
    return `${raw}${sep}#FF`;
  }
  if (!enabled && has) {
    return raw
      .split("\n")
      .map((line) => line.replace(/#ff\b/gi, "").trimEnd())
      .filter((line) => line.trim().length > 0)
      .join("\n")
      .trim();
  }
  return raw;
}

export default function TenantsPanel() {
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [tenants, setTenants] = useState([]);

  const [loadingProps, setLoadingProps] = useState(true);
  const [loadingUnits, setLoadingUnits] = useState(true);
  const [loadingTenants, setLoadingTenants] = useState(true);

  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // Filters
  const [filterPropertyId, setFilterPropertyId] = useState("");
  const [filterUnitId, setFilterUnitId] = useState("");
  const [filterStatus, setFilterStatus] = useState(""); // PROSPECT|TENANT|FORMER|""
  const [filterS8Only, setFilterS8Only] = useState(false);
  const [filterFFOnly, setFilterFFOnly] = useState(false);
  const [q, setQ] = useState("");

  // Create/Edit modal
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("create"); // create|edit
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [editId, setEditId] = useState(null);

  // Delete confirm modal
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteErr, setDeleteErr] = useState("");
  const [deleteText, setDeleteText] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    status: "PROSPECT",
    property: "",
    unit: "",
    section8: false,
    voucher_id: "",
    furnished: false, // UI tag -> notes "#FF"
    notes: "",
  });

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

  async function tryGet(path, params) {
    const r = await api.get(path, params ? { params } : undefined);
    const data = r.data;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data)) return data;
    return [];
  }

  function toastOk(msg) {
    setOk(msg || "");
    setErr("");
  }
  function toastErr(msg) {
    setErr(msg || "Error.");
    setOk("");
  }

  async function loadProperties() {
    setLoadingProps(true);
    try {
      const p = await tryGet("/pm/properties/");
      setProperties(p);
    } catch (e) {
      toastErr(normalizeErr(e));
    } finally {
      setLoadingProps(false);
    }
  }

  async function loadUnits() {
    setLoadingUnits(true);
    try {
      const u = await tryGet("/pm/units/");
      setUnits(u);
    } catch (e) {
      toastErr(normalizeErr(e));
    } finally {
      setLoadingUnits(false);
    }
  }

  async function loadTenants() {
    setLoadingTenants(true);
    try {
      const params = {};
      if (filterPropertyId) params.property = filterPropertyId;
      if (filterUnitId) params.unit = filterUnitId;
      if (filterStatus) params.status = filterStatus;

      const t = await tryGet("/pm/tenants/", Object.keys(params).length ? params : undefined);
      setTenants(t);
    } catch (e) {
      toastErr(normalizeErr(e));
    } finally {
      setLoadingTenants(false);
    }
  }

  async function refreshAll() {
    setErr("");
    setOk("");
    await Promise.all([loadProperties(), loadUnits()]);
    await loadTenants();
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterPropertyId, filterUnitId, filterStatus]);

  useEffect(() => {
    if (!filterPropertyId) return;
    if (!filterUnitId) return;
    const u = unitById.get(String(filterUnitId));
    const uProp = u ? String(u.property_id ?? u.property ?? "") : "";
    if (u && uProp && uProp !== String(filterPropertyId)) setFilterUnitId("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterPropertyId, unitById, filterUnitId]);

  const unitsForSelectedProperty = useMemo(() => {
    if (!filterPropertyId) return units;
    return units.filter((u) => String(u.property_id ?? u.property ?? "") === String(filterPropertyId));
  }, [units, filterPropertyId]);

  const unitsForFormProperty = useMemo(() => {
    if (!form.property) return units;
    return units.filter((u) => String(u.property_id ?? u.property ?? "") === String(form.property));
  }, [units, form.property]);

  const filteredTenants = useMemo(() => {
    let list = tenants.slice();

    if (filterStatus) {
      list = list.filter((t) => String(t.status || "").toUpperCase() === String(filterStatus).toUpperCase());
    }

    if (filterUnitId) list = list.filter((t) => String(t.unit ?? "") === String(filterUnitId));
    else if (filterPropertyId) list = list.filter((t) => String(t.property ?? "") === String(filterPropertyId));

    if (filterS8Only) list = list.filter((t) => !!(t.section8 ?? t.is_section8 ?? false));

    if (filterFFOnly) {
      list = list.filter((t) => {
        const noteHit = hasFFTag(t.notes);
        const u = t.unit ? unitById.get(String(t.unit)) : null;
        const unitNoteHit = hasFFTag(u?.notes || u?.note || "");
        return noteHit || unitNoteHit;
      });
    }

    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter((t) => {
        const blob = [t.first_name, t.last_name, t.email, t.phone, t.status, t.notes, t.voucher_id]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return blob.includes(needle);
      });
    }

    return list;
  }, [tenants, filterPropertyId, filterUnitId, filterStatus, filterS8Only, filterFFOnly, q, unitById]);

  const allCounts = useMemo(() => {
    const all = Array.isArray(tenants) ? tenants : [];
    const prospects = all.filter((t) => String(t.status || "").toUpperCase() === "PROSPECT").length;
    const active = all.filter((t) => String(t.status || "").toUpperCase() === "TENANT").length;
    const former = all.filter((t) => String(t.status || "").toUpperCase() === "FORMER").length;
    const s8 = all.filter((t) => !!(t.section8 ?? t.is_section8 ?? false)).length;

    // ✅ Improved FF count: tenant notes OR unit notes
    const ff = all.filter((t) => {
      const noteHit = hasFFTag(t.notes);
      const u = t.unit ? unitById.get(String(t.unit)) : null;
      const unitHit = hasFFTag(u?.notes || u?.note || "");
      return noteHit || unitHit;
    }).length;

    return { total: all.length, prospects, active, former, s8, ff };
  }, [tenants, unitById]);

  function clearTopFilters() {
    setFilterStatus("");
    setFilterS8Only(false);
    setFilterFFOnly(false);
  }

  function openCreate() {
    setMode("create");
    setEditId(null);
    setFormErr("");
    setForm({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      status: "PROSPECT",
      property: filterPropertyId || "",
      unit: filterUnitId || "",
      section8: false,
      voucher_id: "",
      furnished: false,
      notes: "",
    });
    setOpen(true);
  }

  function openEdit(t) {
    const note = t?.notes || "";
    setMode("edit");
    setEditId(t?.id ?? null);
    setFormErr("");
    setForm({
      first_name: t?.first_name || "",
      last_name: t?.last_name || "",
      email: t?.email || "",
      phone: t?.phone || "",
      status: (t?.status || "PROSPECT").toUpperCase(),
      property: t?.property ? String(t.property) : filterPropertyId || "",
      unit: t?.unit ? String(t.unit) : filterUnitId || "",
      section8: !!(t?.section8 ?? t?.is_section8 ?? false),
      voucher_id: t?.voucher_id || "",
      furnished: hasFFTag(note),
      notes: note,
    });
    setOpen(true);
  }

  function closeModal() {
    if (busy) return;
    setOpen(false);
    setBusy(false);
    setFormErr("");
  }

  function setFormValue(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function buildPayload() {
    const notesWithFF = ensureFFTag(form.notes, !!form.furnished);
    return {
      first_name: (form.first_name || "").trim(),
      last_name: (form.last_name || "").trim(),
      email: (form.email || "").trim() || null,
      phone: (form.phone || "").trim() || null,
      status: form.status,
      property: form.property ? Number(form.property) : null,
      unit: form.unit ? Number(form.unit) : null,
      section8: !!form.section8,
      voucher_id: (form.voucher_id || "").trim() || null,
      notes: (notesWithFF || "").trim(),
    };
  }

  async function submit() {
    setBusy(true);
    setFormErr("");
    setErr("");
    setOk("");

    try {
      if (!form.property) throw new Error("Property required.");
      if (!form.unit) throw new Error("Unit required.");

      const payload = buildPayload();
      if (!payload.first_name) throw new Error("First name required.");
      if (!payload.last_name) throw new Error("Last name required.");

      if (mode === "create") {
        const r = await api.post("/pm/tenants/", payload);
        const created = r.data;
        setTenants((prev) => [created, ...(Array.isArray(prev) ? prev : [])]);
        toastOk("✅ Saved");
        setOpen(false);
        setBusy(false);
        await loadTenants();
        return;
      }

      if (!editId) throw new Error("Missing id.");
      const r = await api.patch(`/pm/tenants/${editId}/`, payload);
      const updated = r.data;

      setTenants((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      toastOk("✅ Saved");
      setOpen(false);
      setBusy(false);
      await loadTenants();
    } catch (e) {
      setFormErr(normalizeErr(e));
      setBusy(false);
    }
  }

  function openDelete(t) {
    setDeleteTarget(t || null);
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
      await api.delete(`/pm/tenants/${deleteTarget.id}/`);
      setTenants((prev) => (Array.isArray(prev) ? prev.filter((x) => x.id !== deleteTarget.id) : prev));
      toastOk("🗑️ Deleted");
      setDeleteBusy(false);
      setDeleteOpen(false);
      setDeleteTarget(null);
      await loadTenants();
    } catch (e) {
      setDeleteErr(normalizeErr(e));
      setDeleteBusy(false);
    }
  }

  const isLoading = loadingProps || loadingUnits || loadingTenants;

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="font-semibold text-slate-100">Tenants</div>
          <div className="text-xs text-slate-400 mt-1">Property → Unit</div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <IconBtn tone="slate" title="Refresh" onClick={refreshAll} disabled={isLoading}>
            🔄
          </IconBtn>
          <IconBtn
            tone="purple"
            title="Add tenant"
            onClick={openCreate}
            disabled={loadingProps || loadingUnits || properties.length === 0 || units.length === 0}
          >
            ➕
          </IconBtn>
        </div>
      </div>

      {/* Clickable KPI filters */}
      <div className="mt-4 flex flex-wrap gap-2">
        <ClickPill
          label="All"
          count={allCounts.total}
          tone={allCounts.total ? "purple" : "slate"}
          active={!filterStatus && !filterS8Only && !filterFFOnly}
          onClick={() => clearTopFilters()}
        />
        <ClickPill
          label="Prospects"
          count={allCounts.prospects}
          tone={allCounts.prospects ? "purple" : "slate"}
          active={filterStatus === "PROSPECT" && !filterS8Only && !filterFFOnly}
          onClick={() => {
            setFilterStatus("PROSPECT");
            setFilterS8Only(false);
            setFilterFFOnly(false);
          }}
        />
        <ClickPill
          label="Tenants"
          count={allCounts.active}
          tone={allCounts.active ? "emerald" : "slate"}
          active={filterStatus === "TENANT" && !filterS8Only && !filterFFOnly}
          onClick={() => {
            setFilterStatus("TENANT");
            setFilterS8Only(false);
            setFilterFFOnly(false);
          }}
        />
        <ClickPill
          label="Former"
          count={allCounts.former}
          tone={allCounts.former ? "amber" : "slate"}
          active={filterStatus === "FORMER" && !filterS8Only && !filterFFOnly}
          onClick={() => {
            setFilterStatus("FORMER");
            setFilterS8Only(false);
            setFilterFFOnly(false);
          }}
        />
        <ClickPill
          label="Section 8"
          count={allCounts.s8}
          tone={allCounts.s8 ? "amber" : "slate"}
          active={filterS8Only}
          onClick={() => setFilterS8Only((v) => !v)}
        />
        <ClickPill
          label="FF"
          count={allCounts.ff}
          tone={allCounts.ff ? "purple" : "slate"}
          active={filterFFOnly}
          onClick={() => setFilterFFOnly((v) => !v)}
        />
      </div>

      {err ? (
        <div className="mt-4 text-sm text-rose-200 bg-rose-900/15 border border-rose-700/30 rounded-2xl p-3">
          {err}
        </div>
      ) : null}
      {ok ? (
        <div className="mt-4 text-sm text-emerald-200 bg-emerald-900/15 border border-emerald-700/30 rounded-2xl p-3">
          {ok}
        </div>
      ) : null}

      {/* Filters */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Field label="Property">
          <Select value={filterPropertyId} onChange={(e) => setFilterPropertyId(e.target.value)} disabled={loadingProps}>
            <option value="">{loadingProps ? "Loading…" : "All"}</option>
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
            onChange={(e) => setFilterUnitId(e.target.value)}
            disabled={loadingUnits || units.length === 0}
          >
            <option value="">{loadingUnits ? "Loading…" : "All"}</option>
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

        <Field label="Status">
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} disabled={loadingTenants}>
            <option value="">All</option>
            {STATUS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Search">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email, voucher…" />
        </Field>
      </div>

      {/* List */}
      <div className="mt-4">
        {loadingTenants ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-6 text-slate-300">Loading…</div>
        ) : filteredTenants.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-6">
            <div className="text-slate-100 font-semibold">No tenants</div>
            <div className="text-sm text-slate-500 mt-1">Use ➕ to add</div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-950/60">
                <tr className="text-slate-300">
                  <th className="px-4 py-3 font-semibold">Tenant</th>
                  <th className="px-4 py-3 font-semibold">Property / Unit</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Tags</th>
                  <th className="px-4 py-3 font-semibold">Voucher</th>
                  <th className="px-4 py-3 font-semibold">Updated</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredTenants.map((t) => {
                  const u = t.unit ? unitById.get(String(t.unit)) : null;
                  const p = t.property ? propertyById.get(String(t.property)) : null;

                  const name = fullNameFromTenant(t);
                  const st = (t.status || "PROSPECT").toUpperCase();
                  const isS8 = !!(t.section8 ?? t.is_section8 ?? false);
                  const isFF = hasFFTag(t.notes) || hasFFTag(u?.notes || "");

                  const unitLabel = u?.label || u?.unit_number || u?.name || (t.unit ? `#${t.unit}` : "—");
                  const propName = p?.name || (t.property ? `#${t.property}` : "—");

                  const missingEmail = !String(t.email || "").trim();
                  const missingPhone = !String(t.phone || "").trim();

                  return (
                    <tr key={t.id} className="bg-slate-950/20 hover:bg-slate-950/35">
                      <td className="px-4 py-3">
                        <div className="text-slate-100 font-semibold">{name}</div>
                        <div className="text-[11px] text-slate-500">#{t.id}</div>
                        <div className="text-xs text-slate-500">{t.email || ""}</div>
                      </td>

                      <td className="px-4 py-3 text-slate-200">
                        <div className="text-slate-100">{propName}</div>
                        <div className="text-[11px] text-slate-500">{unitLabel}</div>
                      </td>

                      <td className="px-4 py-3">
                        <Pill tone={statusTone(st)}>{st}</Pill>
                      </td>

                      {/* ✅ Tiny icon badges */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {st === "TENANT" ? (
                            <TinyBadge icon="🟢" title="Active tenant" tone="emerald" />
                          ) : st === "FORMER" ? (
                            <TinyBadge icon="🟡" title="Former tenant" tone="amber" />
                          ) : (
                            <TinyBadge icon="🟣" title="Prospect" tone="purple" />
                          )}

                          {isS8 ? <TinyBadge icon="🏛️" title="Section 8" tone="amber" /> : null}
                          {isFF ? <TinyBadge icon="🛋️" title="Fully furnished (FF)" tone="purple" /> : null}
                          {missingEmail ? <TinyBadge icon="✉️" title="Missing email" tone="rose" /> : null}
                          {missingPhone ? <TinyBadge icon="📱" title="Missing phone" tone="rose" /> : null}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-slate-300">{t.voucher_id || "—"}</td>

                      <td className="px-4 py-3 text-slate-400">{fmtDateTime(t.updated_at || t.created_at)}</td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <IconBtn title="Edit" onClick={() => openEdit(t)}>
                            ✏️
                          </IconBtn>
                          <IconBtn
                            tone="purple"
                            title="Open (detail page next)"
                            onClick={() => toastOk("Next: tenant detail page")}
                          >
                            🔍
                          </IconBtn>
                          <IconBtn tone="rose" title="Delete" onClick={() => openDelete(t)}>
                            ✖
                          </IconBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        open={open}
        title={mode === "create" ? "Add tenant" : "Edit tenant"}
        onClose={() => (busy ? null : closeModal())}
        disableClose={busy}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="First name *">
            <Input value={form.first_name} onChange={(e) => setFormValue("first_name", e.target.value)} disabled={busy} />
          </Field>

          <Field label="Last name *">
            <Input value={form.last_name} onChange={(e) => setFormValue("last_name", e.target.value)} disabled={busy} />
          </Field>

          <Field label="Status">
            <Select value={form.status} onChange={(e) => setFormValue("status", e.target.value)} disabled={busy}>
              {STATUS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Email">
            <Input value={form.email} onChange={(e) => setFormValue("email", e.target.value)} disabled={busy} />
          </Field>

          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => setFormValue("phone", e.target.value)} disabled={busy} />
          </Field>

          <Field label="Property *">
            <Select
              value={form.property}
              onChange={(e) => {
                const v = e.target.value;
                setForm((p) => ({ ...p, property: v, unit: "" }));
              }}
              disabled={busy || loadingProps}
            >
              <option value="">{loadingProps ? "Loading…" : "Select"}</option>
              {properties.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name || `#${p.id}`}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Unit *">
            <Select
              value={form.unit}
              onChange={(e) => setFormValue("unit", e.target.value)}
              disabled={busy || loadingUnits || !form.property}
            >
              <option value="">{!form.property ? "Select property first" : loadingUnits ? "Loading…" : "Select"}</option>
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
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Checkbox
            checked={!!form.section8}
            onChange={(v) => setFormValue("section8", v)}
            label="Section 8"
            hint="Program tag + voucher tracking"
          />
          <Checkbox
            checked={!!form.furnished}
            onChange={(v) => setFormValue("furnished", v)}
            label="Fully Furnished (FF)"
            hint="Saved in notes as #FF"
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Voucher ID" hint={form.section8 ? "Recommended if Section 8 is checked" : ""}>
            <Input
              value={form.voucher_id}
              onChange={(e) => setFormValue("voucher_id", e.target.value)}
              disabled={busy}
              placeholder="VCHR-12345"
            />
          </Field>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
            <div className="text-sm text-slate-100 font-semibold">Tags</div>
            <div className="mt-2 flex gap-2 flex-wrap">
              {form.section8 ? <Pill tone="amber">S8</Pill> : <Pill>—</Pill>}
              {form.furnished ? <Pill tone="purple">FF</Pill> : null}
            </div>
            <div className="text-[11px] text-slate-500 mt-2">FF uses #FF in notes (no backend change).</div>
          </div>
        </div>

        <div className="mt-4">
          <Field label="Notes">
            <TextArea
              value={form.notes}
              onChange={(e) => setFormValue("notes", e.target.value)}
              disabled={busy}
              placeholder="Internal notes…"
            />
          </Field>
        </div>

        {formErr ? (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">
            {formErr}
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={closeModal}
            disabled={busy}
            className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-2 text-sm text-slate-200 hover:bg-slate-900 disabled:opacity-60"
            title="Cancel"
            type="button"
          >
            ✖
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/10 px-4 py-2 text-sm text-fuchsia-100 hover:bg-fuchsia-500/15 disabled:opacity-60"
            title="Save"
            type="button"
          >
            ✅
          </button>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal open={deleteOpen} title="Delete tenant" onClose={closeDelete} disableClose={deleteBusy}>
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
          <div className="text-slate-100 font-semibold">{fullNameFromTenant(deleteTarget)}</div>
          <div className="text-xs text-slate-300 mt-1">Type DELETE to confirm.</div>
        </div>

        <div className="mt-4 grid gap-3">
          <Input value={deleteText} onChange={(e) => setDeleteText(e.target.value)} disabled={deleteBusy} placeholder="DELETE" />

          {deleteErr ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">
              {deleteErr}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={closeDelete}
              disabled={deleteBusy}
              className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-2 text-sm text-slate-200 hover:bg-slate-900 disabled:opacity-60"
              title="Cancel"
              type="button"
            >
              ✖
            </button>
            <button
              onClick={confirmDelete}
              disabled={deleteBusy || deleteText.trim().toUpperCase() !== "DELETE"}
              className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-100 hover:bg-rose-500/15 disabled:opacity-60"
              title="Delete"
              type="button"
            >
              🗑️
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
