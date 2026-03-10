// src/components/pm/InvitesPanel.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/client";

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function normalizeErr(e) {
  const data = e?.response?.data;
  const status = e?.response?.status;

  const prefix = status ? `[${status}] ` : "";

  if (!data) return prefix + (e?.message || "Request failed.");
  if (typeof data === "string") return prefix + data;
  if (Array.isArray(data)) return prefix + data.join(", ");

  if (typeof data === "object") {
    // DRF common patterns:
    // { detail: "..." } or { field: ["..."] }
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

function IconBtn({ tone = "slate", title, onClick, disabled, children }) {
  const cls =
    tone === "purple"
      ? "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-100 hover:bg-fuchsia-500/15"
      : tone === "emerald"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15"
      : tone === "amber"
      ? "border-amber-500/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15"
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

function Field({ label, hint, required, children }) {
  return (
    <label className="block">
      <div className="text-xs text-slate-400 mb-1">
        {label} {required ? <span className="text-rose-300">*</span> : null}
      </div>
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

function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleString();
}

function inviteStatus(inv) {
  const explicit = String(inv?.status || "").toUpperCase().trim();
  if (explicit) return explicit;

  if (inv?.revoked_at) return "REVOKED";
  if (inv?.accepted_at) return "ACCEPTED";

  const exp = inv?.expires_at ? new Date(inv.expires_at) : null;
  if (exp && Number.isFinite(exp.getTime()) && exp.getTime() < Date.now()) return "EXPIRED";

  if (inv?.is_active === false) return "REVOKED";
  return "PENDING";
}

function statusTone(st) {
  const s = String(st || "").toUpperCase();
  if (s === "PENDING") return "purple";
  if (s === "ACCEPTED") return "emerald";
  if (s === "EXPIRED") return "amber";
  if (s === "REVOKED") return "rose";
  return "slate";
}

export default function InvitesPanel({ onChanged }) {
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [invites, setInvites] = useState([]);

  const [loadingProps, setLoadingProps] = useState(true);
  const [loadingUnits, setLoadingUnits] = useState(true);
  const [loadingInvites, setLoadingInvites] = useState(true);

  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // filters
  const [propertyId, setPropertyId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");

  // create modal
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [form, setForm] = useState({
    email: "",
    property: "",
    unit: "",
    expires_days: "14",
  });

  // delete confirm
  const [delOpen, setDelOpen] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  const [delErr, setDelErr] = useState("");
  const [delText, setDelText] = useState("");
  const [delTarget, setDelTarget] = useState(null);

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

  async function loadProps() {
    setLoadingProps(true);
    try {
      setProperties(await tryGet("/pm/properties/"));
    } catch (e) {
      toastErr(normalizeErr(e));
    } finally {
      setLoadingProps(false);
    }
  }

  async function loadUnits() {
    setLoadingUnits(true);
    try {
      setUnits(await tryGet("/pm/units/"));
    } catch (e) {
      toastErr(normalizeErr(e));
    } finally {
      setLoadingUnits(false);
    }
  }

  async function loadInvites() {
    setLoadingInvites(true);
    try {
      const list = await tryGet("/pm/invites/");
      setInvites(Array.isArray(list) ? list : []);
    } catch (e) {
      toastErr(normalizeErr(e));
    } finally {
      setLoadingInvites(false);
    }
  }

  async function refreshAll() {
    setErr("");
    setOk("");
    await Promise.all([loadProps(), loadUnits()]);
    await loadInvites();
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unitById = useMemo(() => {
    const m = new Map();
    for (const u of units) m.set(String(u.id), u);
    return m;
  }, [units]);

  const propById = useMemo(() => {
    const m = new Map();
    for (const p of properties) m.set(String(p.id), p);
    return m;
  }, [properties]);

  const unitsForProperty = useMemo(() => {
    const pid = String(propertyId || "");
    if (!pid) return units;
    return units.filter((u) => String(u.property_id ?? u.property ?? "") === pid);
  }, [units, propertyId]);

  const unitsForForm = useMemo(() => {
    const pid = String(form.property || "");
    if (!pid) return units;
    return units.filter((u) => String(u.property_id ?? u.property ?? "") === pid);
  }, [units, form.property]);

  // ✅ SFH UX FIX: if filter has a property with exactly 1 unit, auto-select it
  useEffect(() => {
    if (!propertyId) return;
    if (unitId) return;
    if (loadingUnits) return;
    if (unitsForProperty.length === 1) {
      setUnitId(String(unitsForProperty[0].id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, unitsForProperty.length, loadingUnits]);

  // ✅ SFH UX FIX: if create modal has a property with exactly 1 unit, auto-select it
  useEffect(() => {
    if (!open) return;
    if (!form.property) return;
    if (form.unit) return;
    if (loadingUnits) return;
    if (unitsForForm.length === 1) {
      setForm((p) => ({ ...p, unit: String(unitsForForm[0].id) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, form.property, unitsForForm.length, loadingUnits]);

  const computedWithStatus = useMemo(() => {
    return (Array.isArray(invites) ? invites : []).map((x) => ({ ...x, _status: inviteStatus(x) }));
  }, [invites]);

  const counts = useMemo(() => {
    const all = computedWithStatus;
    const pending = all.filter((x) => x._status === "PENDING").length;
    const accepted = all.filter((x) => x._status === "ACCEPTED").length;
    const revoked = all.filter((x) => x._status === "REVOKED").length;
    const expired = all.filter((x) => x._status === "EXPIRED").length;
    return { total: all.length, pending, accepted, revoked, expired };
  }, [computedWithStatus]);

  const filtered = useMemo(() => {
    let list = computedWithStatus.slice();

    // Backend may return unit as number OR object; normalize
    if (unitId) {
      list = list.filter((x) => {
        const u = typeof x.unit === "object" && x.unit ? x.unit.id : x.unit;
        return String(u || "") === String(unitId);
      });
    }

    if (propertyId) {
      list = list.filter((x) => {
        const unitVal = typeof x.unit === "object" && x.unit ? x.unit.id : x.unit;
        const u = unitVal ? unitById.get(String(unitVal)) : null;
        const pid = u ? String(u.property_id ?? u.property ?? "") : "";
        return pid === String(propertyId);
      });
    }

    if (status) list = list.filter((x) => String(x._status) === String(status).toUpperCase());

    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter((x) => {
        const unitVal = typeof x.unit === "object" && x.unit ? x.unit.id : x.unit;
        const blob = [x.email, x.code, x._status, unitVal].filter(Boolean).join(" ").toLowerCase();
        return blob.includes(needle);
      });
    }

    return list;
  }, [computedWithStatus, unitId, propertyId, status, q, unitById]);

  function openCreate() {
    setFormErr("");
    setForm({
      email: "",
      property: propertyId || "",
      unit: unitId || "",
      expires_days: "14",
    });
    setOpen(true);
  }

  function closeCreate() {
    if (busy) return;
    setOpen(false);
    setBusy(false);
    setFormErr("");
  }

  function calcExpiresAt(daysStr) {
    const d = parseInt(daysStr, 10);
    if (!Number.isFinite(d) || d <= 0) return null;
    const now = new Date();
    now.setDate(now.getDate() + d);
    return now.toISOString();
  }

  async function createInvite() {
    setBusy(true);
    setFormErr("");
    setErr("");
    setOk("");

    try {
      const email = String(form.email || "").trim();
      if (!email) throw new Error("Email required.");
      if (!form.unit) throw new Error("Unit required. (Select a unit before creating an invite.)");

      const payload = {
        email,
        unit: Number(form.unit),
      };

      const expiresAt = calcExpiresAt(form.expires_days);
      if (expiresAt) payload.expires_at = expiresAt;

      const r = await api.post("/pm/invites/", payload);
      const created = r.data;

      toastOk("✅ Invite created");
      setOpen(false);
      setBusy(false);

      // Always refresh so list is accurate + includes computed fields backend may add
      await loadInvites();
      onChanged?.();
    } catch (e) {
      setFormErr(normalizeErr(e));
      setBusy(false);
    }
  }

  async function copy(text) {
    const val = String(text || "");
    if (!val) return;
    try {
      await navigator.clipboard?.writeText(val);
      toastOk("📋 Copied");
    } catch {
      toastErr("Copy failed.");
    }
  }

  function inviteLink(code) {
    const c = encodeURIComponent(String(code || "").trim());
    if (!c) return "";
    // ✅ If your tenant acceptance route is different, change it here ONLY.
    return `${window.location.origin}/tenant/accept?code=${c}`;
  }

  async function revokeInvite(invite) {
    const id = invite?.id;
    if (!id) return;

    setErr("");
    setOk("");
    try {
      const nowIso = new Date().toISOString();

      let updated = null;
      try {
        const r = await api.patch(`/pm/invites/${id}/`, { status: "REVOKED" });
        updated = r.data;
      } catch {
        try {
          const r = await api.patch(`/pm/invites/${id}/`, { is_active: false });
          updated = r.data;
        } catch {
          const r = await api.patch(`/pm/invites/${id}/`, { revoked_at: nowIso });
          updated = r.data;
        }
      }

      if (updated) {
        setInvites((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
        toastOk("⛔ Revoked");
        await loadInvites();
        onChanged?.();
      }
    } catch (e) {
      toastErr(normalizeErr(e));
    }
  }

  function openDelete(invite) {
    setDelTarget(invite || null);
    setDelText("");
    setDelErr("");
    setDelOpen(true);
  }

  function closeDelete() {
    if (delBusy) return;
    setDelOpen(false);
    setDelBusy(false);
    setDelErr("");
    setDelText("");
    setDelTarget(null);
  }

  async function confirmDelete() {
    if (!delTarget?.id) return;
    if (delText.trim().toUpperCase() !== "DELETE") {
      setDelErr("Type DELETE to confirm.");
      return;
    }

    setDelBusy(true);
    setDelErr("");
    setErr("");
    setOk("");

    try {
      await api.delete(`/pm/invites/${delTarget.id}/`);
      setInvites((prev) => (Array.isArray(prev) ? prev.filter((x) => x.id !== delTarget.id) : prev));
      toastOk("🗑️ Deleted");
      setDelBusy(false);
      setDelOpen(false);
      setDelTarget(null);

      await loadInvites();
      onChanged?.();
    } catch (e) {
      setDelErr(normalizeErr(e));
      setDelBusy(false);
    }
  }

  const isLoading = loadingProps || loadingUnits || loadingInvites;

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="font-semibold text-slate-100">Tenant Invites</div>
          <div className="text-xs text-slate-400 mt-1">PM creates a code → tenant signs up → code links tenant to unit</div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <IconBtn tone="slate" title="Refresh" onClick={refreshAll} disabled={isLoading}>
            🔄
          </IconBtn>
          <IconBtn tone="purple" title="New invite" onClick={openCreate} disabled={loadingUnits || units.length === 0}>
            ➕
          </IconBtn>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className={cx("inline-flex items-center gap-2 rounded-2xl border px-3 py-2", "border-fuchsia-500/30 bg-fuchsia-500/10")}>
          <span className="text-xs text-slate-300">Total</span>
          <span className="text-sm font-semibold text-slate-100">{counts.total}</span>
        </span>
        <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/50 px-3 py-2">
          <span className="text-xs text-slate-300">Pending</span>
          <span className="text-sm font-semibold text-slate-100">{counts.pending}</span>
        </span>
        <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/50 px-3 py-2">
          <span className="text-xs text-slate-300">Accepted</span>
          <span className="text-sm font-semibold text-slate-100">{counts.accepted}</span>
        </span>
        <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/50 px-3 py-2">
          <span className="text-xs text-slate-300">Expired</span>
          <span className="text-sm font-semibold text-slate-100">{counts.expired}</span>
        </span>
        <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/50 px-3 py-2">
          <span className="text-xs text-slate-300">Revoked</span>
          <span className="text-sm font-semibold text-slate-100">{counts.revoked}</span>
        </span>
      </div>

      {err ? <div className="mt-4 text-sm text-rose-200 bg-rose-900/15 border border-rose-700/30 rounded-2xl p-3">{err}</div> : null}
      {ok ? <div className="mt-4 text-sm text-emerald-200 bg-emerald-900/15 border border-emerald-700/30 rounded-2xl p-3">{ok}</div> : null}

      {/* Filters */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Field label="Property">
          <Select
            value={propertyId}
            onChange={(e) => {
              setPropertyId(e.target.value);
              setUnitId("");
            }}
            disabled={loadingProps}
          >
            <option value="">{loadingProps ? "Loading…" : "All"}</option>
            {properties.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.name || `#${p.id}`}
              </option>
            ))}
          </Select>
          {propertyId && !loadingUnits && unitsForProperty.length === 1 ? (
            <div className="mt-1 text-[11px] text-slate-500">Auto-selected the only unit for this property.</div>
          ) : null}
        </Field>

        <Field label="Unit">
          <Select value={unitId} onChange={(e) => setUnitId(e.target.value)} disabled={loadingUnits || units.length === 0}>
            <option value="">{loadingUnits ? "Loading…" : "All"}</option>
            {unitsForProperty.map((u) => {
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
          <Select value={status} onChange={(e) => setStatus(e.target.value)} disabled={loadingInvites}>
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="EXPIRED">Expired</option>
            <option value="REVOKED">Revoked</option>
          </Select>
        </Field>

        <Field label="Search">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Email / code…" />
        </Field>
      </div>

      {/* List */}
      <div className="mt-4">
        {loadingInvites ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-6 text-slate-300">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-6">
            <div className="text-slate-100 font-semibold">No invites</div>
            <div className="text-sm text-slate-500 mt-1">Use ➕ to generate one.</div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-950/60">
                <tr className="text-slate-300">
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Property / Unit</th>
                  <th className="px-4 py-3 font-semibold">Code</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Expires</th>
                  <th className="px-4 py-3 font-semibold">Accepted</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map((x) => {
                  const unitVal = typeof x.unit === "object" && x.unit ? x.unit.id : x.unit;
                  const u = unitVal ? unitById.get(String(unitVal)) : null;
                  const pid = u ? String(u.property_id ?? u.property ?? "") : "";
                  const p = pid ? propById.get(pid) : null;

                  const propName = p?.name || (pid ? `#${pid}` : "—");
                  const unitLabel = u?.label || u?.unit_number || u?.name || (unitVal ? `#${unitVal}` : "—");

                  const st = String(x._status || "PENDING").toUpperCase();
                  const canRevoke = st === "PENDING";

                  const link = inviteLink(x.code);

                  return (
                    <tr key={x.id} className="bg-slate-950/20 hover:bg-slate-950/35">
                      <td className="px-4 py-3">
                        <div className="text-slate-100 font-semibold">{x.email || "—"}</div>
                        <div className="text-[11px] text-slate-500">#{x.id}</div>
                      </td>

                      <td className="px-4 py-3 text-slate-200">
                        <div className="text-slate-100">{propName}</div>
                        <div className="text-[11px] text-slate-500">{unitLabel}</div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-mono text-slate-100">{x.code || "—"}</div>
                        {link ? <div className="text-[11px] text-slate-500 truncate max-w-[280px]">{link}</div> : null}
                      </td>

                      <td className="px-4 py-3">
                        <Pill tone={statusTone(st)}>{st}</Pill>
                      </td>

                      <td className="px-4 py-3 text-slate-300">{fmtDateTime(x.expires_at)}</td>
                      <td className="px-4 py-3 text-slate-300">{fmtDateTime(x.accepted_at)}</td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <IconBtn title="Copy code" onClick={() => copy(x.code)} disabled={!x.code}>
                            📋
                          </IconBtn>
                          <IconBtn title="Copy invite link" onClick={() => copy(link)} disabled={!link}>
                            🔗
                          </IconBtn>
                          <IconBtn tone="amber" title="Revoke" disabled={!canRevoke} onClick={() => revokeInvite(x)}>
                            ⛔
                          </IconBtn>
                          <IconBtn tone="rose" title="Delete" onClick={() => openDelete(x)}>
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

      {/* Create modal */}
      <Modal open={open} title="New tenant invite" onClose={closeCreate} disableClose={busy}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Email" required>
            <Input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} disabled={busy} placeholder="tenant@email.com" />
          </Field>

          <Field label="Expires" hint="Days from now">
            <Select value={form.expires_days} onChange={(e) => setForm((p) => ({ ...p, expires_days: e.target.value }))} disabled={busy}>
              <option value="3">3 days</option>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
            </Select>
          </Field>

          <Field label="Property">
            <Select
              value={form.property}
              onChange={(e) => {
                const v = e.target.value;
                setForm((p) => ({ ...p, property: v, unit: "" }));
              }}
              disabled={busy || loadingProps}
            >
              <option value="">{loadingProps ? "Loading…" : "All"}</option>
              {properties.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name || `#${p.id}`}
                </option>
              ))}
            </Select>
            {open && form.property && !loadingUnits && unitsForForm.length === 1 ? (
              <div className="mt-1 text-[11px] text-slate-500">Only 1 unit found → auto-selected.</div>
            ) : null}
          </Field>

          <Field label="Unit" required hint="Backend requires a unit in the invite payload.">
            <Select value={form.unit} onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))} disabled={busy || loadingUnits}>
              <option value="">{loadingUnits ? "Loading…" : "Select"}</option>
              {unitsForForm.map((u) => {
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

        {formErr ? (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">{formErr}</div>
        ) : null}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={closeCreate}
            disabled={busy}
            className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-2 text-sm text-slate-200 hover:bg-slate-900 disabled:opacity-60"
            type="button"
          >
            Cancel
          </button>
          <button
            onClick={createInvite}
            disabled={busy}
            className="rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/10 px-4 py-2 text-sm text-fuchsia-100 hover:bg-fuchsia-500/15 disabled:opacity-60"
            type="button"
          >
            Create Invite
          </button>
        </div>
      </Modal>

      {/* Delete modal */}
      <Modal open={delOpen} title="Delete invite" onClose={() => (!delBusy ? closeDelete() : null)} disableClose={delBusy}>
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
          <div className="text-slate-100 font-semibold">{delTarget?.email || "—"}</div>
          <div className="text-xs text-slate-300 mt-1">Type DELETE to confirm.</div>
        </div>

        <div className="mt-4 grid gap-3">
          <Input value={delText} onChange={(e) => setDelText(e.target.value)} disabled={delBusy} placeholder="DELETE" />

          {delErr ? <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">{delErr}</div> : null}

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={closeDelete}
              disabled={delBusy}
              className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-2 text-sm text-slate-200 hover:bg-slate-900 disabled:opacity-60"
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              disabled={delBusy || delText.trim().toUpperCase() !== "DELETE"}
              className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-100 hover:bg-rose-500/15 disabled:opacity-60"
              type="button"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
