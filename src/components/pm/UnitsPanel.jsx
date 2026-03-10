// src/components/pm/UnitsPanel.jsx
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
      : tone === "cyan"
      ? "border-cyan-500/40 text-cyan-200 bg-cyan-500/10"
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

// backend likely uses: VACANT/OCCUPIED/MAINTENANCE
function unitStatusTone(v) {
  const s = String(v || "").toUpperCase();
  if (s === "VACANT") return "emerald";
  if (s === "OCCUPIED") return "amber";
  if (s === "MAINTENANCE") return "rose";
  return "slate";
}

// FF tag stored in notes as "#FF"
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

export default function UnitsPanel({ onChanged }) {
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);

  const [loadingProps, setLoadingProps] = useState(true);
  const [loadingUnits, setLoadingUnits] = useState(true);

  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // filters
  const [filterPropertyId, setFilterPropertyId] = useState("");
  const [q, setQ] = useState("");

  // create/edit modal
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("create"); // create|edit
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [editId, setEditId] = useState(null);

  // delete confirm
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteErr, setDeleteErr] = useState("");
  const [deleteText, setDeleteText] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [form, setForm] = useState({
    property: "",
    label: "",
    beds: "",
    baths: "",
    rent: "",
    status: "VACANT",
    section8_eligible: false,
    furnished: false, // tag -> notes #FF
    notes: "",
  });

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
      const params = {};
      if (filterPropertyId) params.property = filterPropertyId;
      const u = await tryGet("/pm/units/", Object.keys(params).length ? params : undefined);
      setUnits(u);
    } catch (e) {
      toastErr(normalizeErr(e));
    } finally {
      setLoadingUnits(false);
    }
  }

  async function refreshAll() {
    setErr("");
    setOk("");
    await Promise.all([loadProperties(), loadUnits()]);
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadUnits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterPropertyId]);

  const propertyById = useMemo(() => {
    const m = new Map();
    for (const p of properties) m.set(String(p.id), p);
    return m;
  }, [properties]);

  const filteredUnits = useMemo(() => {
    let list = units.slice();

    if (filterPropertyId) {
      list = list.filter((u) => String(u.property ?? u.property_id ?? "") === String(filterPropertyId));
    }

    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter((u) => {
        const blob = [u.label, u.unit_number, u.status, u.notes, u.beds, u.baths, u.rent]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return blob.includes(needle);
      });
    }

    return list;
  }, [units, filterPropertyId, q]);

  const counts = useMemo(() => {
    const all = Array.isArray(units) ? units : [];
    const vacant = all.filter((u) => String(u.status || "").toUpperCase() === "VACANT").length;
    const occupied = all.filter((u) => String(u.status || "").toUpperCase() === "OCCUPIED").length;
    const maint = all.filter((u) => String(u.status || "").toUpperCase() === "MAINTENANCE").length;
    const s8 = all.filter((u) => !!(u.section8_eligible ?? u.is_section8_eligible ?? false)).length;
    const ff = all.filter((u) => hasFFTag(u.notes)).length;
    return { total: all.length, vacant, occupied, maint, s8, ff };
  }, [units]);

  function setFormValue(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function openCreate() {
    setMode("create");
    setEditId(null);
    setFormErr("");
    setForm({
      property: filterPropertyId || "",
      label: "",
      beds: "",
      baths: "",
      rent: "",
      status: "VACANT",
      section8_eligible: false,
      furnished: false,
      notes: "",
    });
    setOpen(true);
  }

  function openEdit(u) {
    const note = u?.notes || "";
    setMode("edit");
    setEditId(u?.id ?? null);
    setFormErr("");
    setForm({
      property: String(u?.property ?? u?.property_id ?? "") || filterPropertyId || "",
      label: u?.label ?? u?.unit_number ?? "",
      beds: u?.beds ?? "",
      baths: u?.baths ?? "",
      rent: u?.rent ?? u?.monthly_rent ?? "",
      status: (u?.status || "VACANT").toUpperCase(),
      section8_eligible: !!(u?.section8_eligible ?? u?.is_section8_eligible ?? false),
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

  function openDelete(u) {
    setDeleteTarget(u || null);
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

  function buildPayload() {
    const notesWithFF = ensureFFTag(form.notes, !!form.furnished);
    const beds = form.beds === "" ? null : Number(form.beds);
    const baths = form.baths === "" ? null : Number(form.baths);
    const rent = form.rent === "" ? null : Number(form.rent);

    return {
      property: form.property ? Number(form.property) : null,
      label: (form.label || "").trim(),
      beds: Number.isFinite(beds) ? beds : null,
      baths: Number.isFinite(baths) ? baths : null,
      rent: Number.isFinite(rent) ? rent : null,
      status: form.status,
      section8_eligible: !!form.section8_eligible,
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
      if (!String(form.label || "").trim()) throw new Error("Unit label required.");

      const payload = buildPayload();

      if (mode === "create") {
        const r = await api.post("/pm/units/", payload);
        const created = r.data;
        setUnits((prev) => [created, ...(Array.isArray(prev) ? prev : [])]);
        toastOk("✅ Saved");
        setOpen(false);
        setBusy(false);
        await loadUnits();
        onChanged?.();
        return;
      }

      if (!editId) throw new Error("Missing id.");
      const r = await api.patch(`/pm/units/${editId}/`, payload);
      const updated = r.data;
      setUnits((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      toastOk("✅ Saved");
      setOpen(false);
      setBusy(false);
      await loadUnits();
      onChanged?.();
    } catch (e) {
      setFormErr(normalizeErr(e));
      setBusy(false);
    }
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
      await api.delete(`/pm/units/${deleteTarget.id}/`);
      setUnits((prev) => (Array.isArray(prev) ? prev.filter((x) => x.id !== deleteTarget.id) : prev));
      toastOk("🗑️ Deleted");
      setDeleteBusy(false);
      setDeleteOpen(false);
      setDeleteTarget(null);
      await loadUnits();
      onChanged?.();
    } catch (e) {
      setDeleteErr(normalizeErr(e));
      setDeleteBusy(false);
    }
  }

  const isLoading = loadingProps || loadingUnits;

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="font-semibold text-slate-100">Units</div>
          <div className="text-xs text-slate-400 mt-1">Properties → Units</div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <IconBtn tone="slate" title="Refresh" onClick={refreshAll} disabled={isLoading}>
            🔄
          </IconBtn>
          <IconBtn
            tone="purple"
            title="Add unit"
            onClick={openCreate}
            disabled={loadingProps || properties.length === 0}
          >
            ➕
          </IconBtn>
        </div>
      </div>

      {/* Summary pills */}
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/50 px-3 py-2">
          <span className="text-xs text-slate-400">All</span>
          <span className="text-sm font-semibold">{counts.total}</span>
        </span>
        <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/50 px-3 py-2">
          <span className="text-xs text-slate-400">Vacant</span>
          <span className="text-sm font-semibold">{counts.vacant}</span>
        </span>
        <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/50 px-3 py-2">
          <span className="text-xs text-slate-400">Occupied</span>
          <span className="text-sm font-semibold">{counts.occupied}</span>
        </span>
        <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/50 px-3 py-2">
          <span className="text-xs text-slate-400">Maintenance</span>
          <span className="text-sm font-semibold">{counts.maint}</span>
        </span>
        <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/50 px-3 py-2">
          <span className="text-xs text-slate-400">S8 eligible</span>
          <span className="text-sm font-semibold">{counts.s8}</span>
        </span>
        <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/50 px-3 py-2">
          <span className="text-xs text-slate-400">FF</span>
          <span className="text-sm font-semibold">{counts.ff}</span>
        </span>
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
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
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

        <Field label="Search">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Unit, status, notes…" />
        </Field>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
          <div className="text-xs text-slate-400">Tip</div>
          <div className="text-sm text-slate-200 mt-1">
            Use <span className="font-mono text-slate-300">#FF</span> in notes for fully furnished tracking.
          </div>
        </div>
      </div>

      {/* List */}
      <div className="mt-4">
        {loadingUnits ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-6 text-slate-300">Loading…</div>
        ) : filteredUnits.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-6">
            <div className="text-slate-100 font-semibold">No units</div>
            <div className="text-sm text-slate-500 mt-1">Use ➕ to add</div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-950/60">
                <tr className="text-slate-300">
                  <th className="px-4 py-3 font-semibold">Unit</th>
                  <th className="px-4 py-3 font-semibold">Property</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Beds/Baths</th>
                  <th className="px-4 py-3 font-semibold">Rent</th>
                  <th className="px-4 py-3 font-semibold">Tags</th>
                  <th className="px-4 py-3 font-semibold">Updated</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredUnits.map((u) => {
                  const propId = String(u.property ?? u.property_id ?? "");
                  const prop = propId ? propertyById.get(propId) : null;
                  const propName = prop?.name || (propId ? `#${propId}` : "—");

                  const label = u.label || u.unit_number || u.name || `#${u.id}`;
                  const st = (u.status || "—").toUpperCase();
                  const isS8 = !!(u.section8_eligible ?? u.is_section8_eligible ?? false);
                  const isFF = hasFFTag(u.notes);

                  const beds = u.beds ?? "—";
                  const baths = u.baths ?? "—";
                  const rent = u.rent ?? u.monthly_rent ?? null;

                  return (
                    <tr key={u.id} className="bg-slate-950/20 hover:bg-slate-950/35">
                      <td className="px-4 py-3">
                        <div className="text-slate-100 font-semibold">{label}</div>
                        <div className="text-[11px] text-slate-500">#{u.id}</div>
                      </td>

                      <td className="px-4 py-3 text-slate-200">
                        <div className="text-slate-100">{propName}</div>
                      </td>

                      <td className="px-4 py-3">
                        <Pill tone={unitStatusTone(st)}>{st}</Pill>
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {beds}/{baths}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {rent === null || rent === undefined || rent === "" ? "—" : `$${Number(rent).toFixed(0)}`}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex gap-2 flex-wrap">
                          {isS8 ? <Pill tone="amber">S8</Pill> : <Pill>—</Pill>}
                          {isFF ? <Pill tone="purple">FF</Pill> : null}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-slate-400">{fmtDateTime(u.updated_at || u.created_at)}</td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <IconBtn title="Edit" onClick={() => openEdit(u)}>
                            ✏️
                          </IconBtn>
                          <IconBtn tone="rose" title="Delete" onClick={() => openDelete(u)}>
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

      {/* Create/Edit modal */}
      <Modal
        open={open}
        title={mode === "create" ? "Add unit" : "Edit unit"}
        onClose={() => (busy ? null : closeModal())}
        disableClose={busy}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Property *">
            <Select
              value={form.property}
              onChange={(e) => setFormValue("property", e.target.value)}
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

          <Field label="Unit label *" hint="Example: 101, 2B, Unit 305">
            <Input value={form.label} onChange={(e) => setFormValue("label", e.target.value)} disabled={busy} />
          </Field>

          <Field label="Status">
            <Select value={form.status} onChange={(e) => setFormValue("status", e.target.value)} disabled={busy}>
              <option value="VACANT">Vacant</option>
              <option value="OCCUPIED">Occupied</option>
              <option value="MAINTENANCE">Maintenance</option>
            </Select>
          </Field>

          <Field label="Rent (monthly)">
            <Input
              value={form.rent}
              onChange={(e) => setFormValue("rent", e.target.value)}
              disabled={busy}
              placeholder="1200"
            />
          </Field>

          <Field label="Beds">
            <Input value={form.beds} onChange={(e) => setFormValue("beds", e.target.value)} disabled={busy} placeholder="2" />
          </Field>

          <Field label="Baths">
            <Input value={form.baths} onChange={(e) => setFormValue("baths", e.target.value)} disabled={busy} placeholder="1" />
          </Field>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Checkbox
            checked={!!form.section8_eligible}
            onChange={(v) => setFormValue("section8_eligible", v)}
            label="Section 8 eligible"
            hint="Unit-level eligibility (recommended)"
          />
          <Checkbox
            checked={!!form.furnished}
            onChange={(v) => setFormValue("furnished", v)}
            label="Fully Furnished (FF)"
            hint="Saved in notes as #FF"
          />
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

      {/* Delete modal */}
      <Modal open={deleteOpen} title="Delete unit" onClose={closeDelete} disableClose={deleteBusy}>
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
          <div className="text-slate-100 font-semibold">
            {deleteTarget?.label || deleteTarget?.unit_number || deleteTarget?.name || `#${deleteTarget?.id || ""}`}
          </div>
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
