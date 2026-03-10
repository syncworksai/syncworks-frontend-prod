// src/pages/pm/tabs/TenantsTab.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../../api/client";
import Button from "../../../components/ui/Button";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function Card({ title, subtitle, right, children }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{title}</div>
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
      : tone === "fuchsia"
      ? "border-fuchsia-500/40 text-fuchsia-200 bg-fuchsia-500/10"
      : "border-slate-700 text-slate-300 bg-slate-950/40";
  return <span className={`inline-flex items-center px-2 py-1 rounded-full border text-[11px] ${cls}`}>{children}</span>;
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString();
}

function daysUntil(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  const now = new Date();
  const ms = d.getTime() - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function safeStr(x) {
  return (x ?? "").toString();
}

async function tryGet(path) {
  const r = await api.get(path);
  const data = r.data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data)) return data;
  return [];
}

async function loadWithFallback(paths) {
  let last = null;
  for (const p of paths) {
    try {
      return await tryGet(p);
    } catch (e) {
      last = e;
    }
  }
  throw last || new Error("Not found");
}

// Tiny no-dependency bars
function MiniBars({ items, height = 44 }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {items.map((it) => {
        const h = Math.max(4, Math.round((it.value / max) * height));
        return (
          <div key={it.label} className="flex flex-col items-center gap-1">
            <div
              className={cx(
                "w-5 rounded-full border",
                it.tone === "emerald"
                  ? "border-emerald-500/30 bg-emerald-500/20"
                  : it.tone === "cyan"
                  ? "border-cyan-500/30 bg-cyan-500/20"
                  : it.tone === "amber"
                  ? "border-amber-500/30 bg-amber-500/20"
                  : it.tone === "rose"
                  ? "border-rose-500/30 bg-rose-500/20"
                  : "border-slate-700 bg-slate-900/40"
              )}
              style={{ height: h }}
              title={`${it.label}: ${it.value}`}
            />
            <div className="text-[10px] text-slate-500">{it.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function CopyButton({ value, onCopied, label = "Copy" }) {
  return (
    <button
      type="button"
      className="inline-flex items-center justify-center h-9 text-xs rounded-xl px-4 border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40 text-slate-200"
      onClick={async () => {
        if (!value) return;
        try {
          await navigator.clipboard?.writeText(value);
          onCopied?.();
        } catch {
          // ignore
        }
      }}
      title={value ? value : "Nothing to copy"}
    >
      {label}
    </button>
  );
}

// ---------------------------------------
// Tenants Tab
// ---------------------------------------
export default function TenantsTab() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [invites, setInvites] = useState([]);

  // Filters
  const [q, setQ] = useState("");
  const [propertyId, setPropertyId] = useState("ALL");
  const [unitId, setUnitId] = useState("ALL");
  const [status, setStatus] = useState("ALL"); // ACTIVE / LATE / MOVE_OUT / APPLICANT
  const [section8Only, setSection8Only] = useState(false);

  // Invite form (MVP)
  const [inviteForm, setInviteForm] = useState({
    property: "",
    unit: "",
    tenant_email: "",
    tenant_name: "",
    method: "LINK", // LINK | CODE
    message: "",
  });
  const [creatingInvite, setCreatingInvite] = useState(false);

  const ENDPOINTS = useMemo(
    () => ({
      properties: ["/pm/properties/", "/properties/"],
      units: ["/pm/units/", "/units/"],
      tenants: ["/pm/tenants/", "/tenants/"],
      invites: ["/pm/invites/", "/invites/pm/"],
      createInvite: ["/pm/invites/", "/invites/pm/"],
    }),
    []
  );

  async function loadAll() {
    setLoading(true);
    setErr("");
    setOk("");

    try {
      const [p, u, t, i] = await Promise.all([
        loadWithFallback(ENDPOINTS.properties).catch(() => []),
        loadWithFallback(ENDPOINTS.units).catch(() => []),
        loadWithFallback(ENDPOINTS.tenants).catch(() => []),
        loadWithFallback(ENDPOINTS.invites).catch(() => []),
      ]);

      setProperties(Array.isArray(p) ? p : []);
      setUnits(Array.isArray(u) ? u : []);
      setTenants(Array.isArray(t) ? t : []);
      setInvites(Array.isArray(i) ? i : []);
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Failed to load tenant data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const propertyMap = useMemo(() => {
    const m = new Map();
    for (const p of properties) m.set(String(p.id), p);
    return m;
  }, [properties]);

  const unitMap = useMemo(() => {
    const m = new Map();
    for (const u of units) m.set(String(u.id), u);
    return m;
  }, [units]);

  const unitsForProperty = useMemo(() => {
    if (!inviteForm.property) return units;
    const pid = String(inviteForm.property);
    return units.filter((u) => String(u.property_id ?? u.property ?? "") === pid);
  }, [units, inviteForm.property]);

  // Normalize tenant shapes until backend is finalized
  const normalizedTenants = useMemo(() => {
    return (Array.isArray(tenants) ? tenants : []).map((t) => {
      const uid = t.unit_id ?? t.unit ?? t.unitId ?? "";
      const u = unitMap.get(String(uid));
      const pid = t.property_id ?? t.property ?? u?.property_id ?? u?.property ?? "";
      const p = propertyMap.get(String(pid));

      const name = t.name || [t.first_name, t.last_name].filter(Boolean).join(" ") || t.tenant_name || "Tenant";
      const email = t.email || t.tenant_email || "";
      const phone = t.phone || t.mobile || "";

      const unit_label = t.unit_label || u?.label || u?.unit_number || u?.name || "—";
      const property_name = t.property_name || p?.name || "—";

      const st = (t.status || t.tenant_status || "ACTIVE").toString().toUpperCase();
      const lease_end = t.lease_end || t.lease_end_date || t.leaseEnd || "";
      const section8 = !!(t.section8 ?? t.is_section8 ?? u?.section8 ?? u?.is_section8);
      const balance = t.balance_due ?? t.outstanding_balance ?? t.balance ?? null;
      const last_payment = t.last_payment_date || t.lastPaymentDate || "";

      return {
        ...t,
        _pm: {
          unit_id: uid ? String(uid) : "",
          property_id: pid ? String(pid) : "",
          name: safeStr(name),
          email: safeStr(email),
          phone: safeStr(phone),
          unit_label: safeStr(unit_label),
          property_name: safeStr(property_name),
          status: st,
          lease_end,
          section8,
          balance,
          last_payment,
        },
      };
    });
  }, [tenants, unitMap, propertyMap]);

  const filteredTenants = useMemo(() => {
    const needle = q.trim().toLowerCase();

    return normalizedTenants.filter((t) => {
      const pOk = propertyId === "ALL" ? true : t._pm.property_id === String(propertyId);
      const uOk = unitId === "ALL" ? true : t._pm.unit_id === String(unitId);
      const sOk = status === "ALL" ? true : t._pm.status === status;
      const s8Ok = section8Only ? !!t._pm.section8 : true;

      if (!pOk || !uOk || !sOk || !s8Ok) return false;

      if (!needle) return true;
      const blob = [t._pm.name, t._pm.email, t._pm.phone, t._pm.unit_label, t._pm.property_name, t._pm.status]
        .join(" | ")
        .toLowerCase();
      return blob.includes(needle);
    });
  }, [normalizedTenants, q, propertyId, unitId, status, section8Only]);

  const metrics = useMemo(() => {
    const total = normalizedTenants.length;
    const active = normalizedTenants.filter((t) => t._pm.status === "ACTIVE").length;
    const late = normalizedTenants.filter((t) => t._pm.status === "LATE").length;
    const moveOut = normalizedTenants.filter((t) => t._pm.status === "MOVE_OUT").length;
    const applicant = normalizedTenants.filter((t) => t._pm.status === "APPLICANT").length;

    const exp30 = normalizedTenants.filter((t) => {
      const d = daysUntil(t._pm.lease_end);
      return d !== null && d <= 30;
    }).length;

    const exp60 = normalizedTenants.filter((t) => {
      const d = daysUntil(t._pm.lease_end);
      return d !== null && d > 30 && d <= 60;
    }).length;

    const exp90 = normalizedTenants.filter((t) => {
      const d = daysUntil(t._pm.lease_end);
      return d !== null && d > 60 && d <= 90;
    }).length;

    const s8 = normalizedTenants.filter((t) => t._pm.section8).length;

    return { total, active, late, moveOut, applicant, exp30, exp60, exp90, s8 };
  }, [normalizedTenants]);

  const statusBars = useMemo(() => {
    return [
      { label: "Active", value: metrics.active, tone: "emerald" },
      { label: "Late", value: metrics.late, tone: "rose" },
      { label: "Move", value: metrics.moveOut, tone: "amber" },
      { label: "Apps", value: metrics.applicant, tone: "cyan" },
    ];
  }, [metrics]);

  function statusTone(st) {
    if (st === "ACTIVE") return "emerald";
    if (st === "LATE") return "rose";
    if (st === "MOVE_OUT") return "amber";
    if (st === "APPLICANT") return "cyan";
    return "slate";
  }

  // Tenant onboarding without "forcing an app download":
  // - We generate an invite LINK (web-first) that works in browser
  // - Optional deep link later can open app if installed
  const baseUrl = useMemo(() => {
    // If you later add VITE_PUBLIC_APP_URL, use that here.
    // For now we fall back to current origin.
    try {
      return window.location.origin;
    } catch {
      return "";
    }
  }, []);

  function buildInviteLink(inv) {
    // Backend will eventually return invite_link directly; we support both.
    if (inv?.invite_link) return inv.invite_link;
    const code = inv?.code || "";
    if (!code) return "";
    return `${baseUrl}/tenant/join?code=${encodeURIComponent(code)}`;
  }

  async function createInvite() {
    setErr("");
    setOk("");

    const payload = {
      property: inviteForm.property || "",
      unit: inviteForm.unit || "",
      tenant_email: inviteForm.tenant_email?.trim() || "",
      tenant_name: inviteForm.tenant_name?.trim() || "",
      method: inviteForm.method || "LINK",
      message: inviteForm.message?.trim() || "",
    };

    if (!payload.property) return setErr("Pick a property.");
    if (!payload.unit) return setErr("Pick a unit.");
    if (!payload.tenant_email && !payload.tenant_name) {
      return setErr("Enter at least tenant email or tenant name.");
    }

    setCreatingInvite(true);

    let last = null;
    for (const path of ENDPOINTS.createInvite) {
      try {
        const r = await api.post(path, payload);
        const created = r.data;
        setInvites((prev) => [created, ...(Array.isArray(prev) ? prev : [])]);
        setOk("Invite created.");
        setInviteForm((p) => ({ ...p, tenant_email: "", tenant_name: "", message: "" }));
        setCreatingInvite(false);
        return;
      } catch (e) {
        last = e;
      }
    }

    const msg = last?.response?.data?.detail || last?.message || "Create invite failed.";
    setErr(
      String(msg).toLowerCase().includes("not found") || last?.response?.status === 404
        ? "PM backend endpoints aren’t wired yet for tenant invites. UI is ready — next step is backend models + routes."
        : msg
    );
    setCreatingInvite(false);
  }

  const filteredUnitsForFilter = useMemo(() => {
    if (propertyId === "ALL") return units;
    return units.filter((u) => String(u.property_id ?? u.property ?? "") === String(propertyId));
  }, [units, propertyId]);

  const actionsHint = useMemo(() => {
    const anyLate = metrics.late > 0;
    const anyExp = metrics.exp30 + metrics.exp60 + metrics.exp90 > 0;
    if (anyLate && anyExp) return "Late rent + lease expirations detected → next: automate notices & renewals.";
    if (anyLate) return "Late rent detected → next: reminders, late fees, notices (automations).";
    if (anyExp) return "Lease expirations coming up → next: renewal workflow automation.";
    return "Everything looks calm → next: strengthen onboarding + automation rules.";
  }, [metrics]);

  return (
    <div className="space-y-4">
      {/* KPI / charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card
          title="Tenant health snapshot"
          subtitle="Lease expirations + risk indicators (auto-populates as backend comes online)"
          right={loading ? <span className="text-xs text-slate-400">Loading…</span> : <Pill tone="fuchsia">PM Ops</Pill>}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="text-xs text-slate-400">Tenants</div>
              <div className="mt-2 flex items-center gap-2">
                <div className="text-2xl font-semibold">{metrics.total}</div>
                <Pill tone={metrics.total ? "emerald" : "slate"}>{metrics.total ? "Managed" : "None"}</Pill>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="text-xs text-slate-400">Section 8</div>
              <div className="mt-2 flex items-center gap-2">
                <div className="text-2xl font-semibold">{metrics.s8}</div>
                <Pill tone={metrics.s8 ? "fuchsia" : "slate"}>{metrics.s8 ? "Tracked" : "None"}</Pill>
              </div>
            </div>

            <div className="col-span-2 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-400">Tenant status distribution</div>
                  <div className="text-[11px] text-slate-500 mt-1">{actionsHint}</div>
                </div>
                <MiniBars items={statusBars} />
              </div>
            </div>

            <div className="col-span-2 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-xs text-slate-400">Lease expirations</div>
                  <div className="text-[11px] text-slate-500 mt-1">Renewals / Move-outs / Risk</div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Pill tone={metrics.exp30 ? "rose" : "slate"}>≤ 30d: {metrics.exp30}</Pill>
                  <Pill tone={metrics.exp60 ? "amber" : "slate"}>31–60d: {metrics.exp60}</Pill>
                  <Pill tone={metrics.exp90 ? "cyan" : "slate"}>61–90d: {metrics.exp90}</Pill>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Find tenants" subtitle="Search + filters built for high volume">
          <div className="space-y-3">
            <div>
              <div className="text-xs text-slate-400 mb-1">Search</div>
              <input
                className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2 text-sm"
                placeholder="Tenant name, email, phone, unit, property…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-slate-400 mb-1">Property</div>
                <select
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2 text-sm"
                  value={propertyId}
                  onChange={(e) => {
                    setPropertyId(e.target.value);
                    setUnitId("ALL");
                  }}
                >
                  <option value="ALL">All</option>
                  {properties.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name || `Property #${p.id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-xs text-slate-400 mb-1">Unit</div>
                <select
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2 text-sm"
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                >
                  <option value="ALL">All</option>
                  {filteredUnitsForFilter.map((u) => (
                    <option key={u.id} value={String(u.id)}>
                      {u.label || u.unit_number || u.name || `Unit #${u.id}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-slate-400 mb-1">Tenant status</div>
                <select
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2 text-sm"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="ALL">All</option>
                  <option value="ACTIVE">Active</option>
                  <option value="LATE">Late</option>
                  <option value="MOVE_OUT">Move-out</option>
                  <option value="APPLICANT">Applicant</option>
                </select>
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-slate-200 select-none">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-cyan-400"
                    checked={section8Only}
                    onChange={(e) => setSection8Only(e.target.checked)}
                  />
                  Section 8 only
                </label>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button tone="slate" onClick={loadAll} disabled={loading}>
                Refresh
              </Button>
              <Button
                tone="slate"
                onClick={() => {
                  setQ("");
                  setPropertyId("ALL");
                  setUnitId("ALL");
                  setStatus("ALL");
                  setSection8Only(false);
                }}
              >
                Reset
              </Button>
            </div>

            <div className="text-[11px] text-slate-500">
              Next: “late rent actions” will be one-click (remind, fee, notice) once Payments/RentCharge exist.
            </div>
          </div>
        </Card>

        <Card title="Invite tenant" subtitle="Web-first onboarding. App is optional at first — we can upsell later.">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-slate-400 mb-1">Property</div>
                <select
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2 text-sm"
                  value={inviteForm.property}
                  onChange={(e) => setInviteForm((p) => ({ ...p, property: e.target.value, unit: "" }))}
                >
                  <option value="">Select…</option>
                  {properties.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name || `Property #${p.id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-xs text-slate-400 mb-1">Unit</div>
                <select
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2 text-sm"
                  value={inviteForm.unit}
                  onChange={(e) => setInviteForm((p) => ({ ...p, unit: e.target.value }))}
                >
                  <option value="">Select…</option>
                  {unitsForProperty.map((u) => (
                    <option key={u.id} value={String(u.id)}>
                      {u.label || u.unit_number || u.name || `Unit #${u.id}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-slate-400 mb-1">Tenant name</div>
                <input
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2 text-sm"
                  placeholder="Jane Doe"
                  value={inviteForm.tenant_name}
                  onChange={(e) => setInviteForm((p) => ({ ...p, tenant_name: e.target.value }))}
                />
              </div>

              <div>
                <div className="text-xs text-slate-400 mb-1">Tenant email</div>
                <input
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2 text-sm"
                  placeholder="tenant@email.com"
                  value={inviteForm.tenant_email}
                  onChange={(e) => setInviteForm((p) => ({ ...p, tenant_email: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-400 mb-1">Invite type</div>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setInviteForm((p) => ({ ...p, method: "LINK" }))}
                  className={cx(
                    "h-9 px-4 rounded-xl border text-xs",
                    inviteForm.method === "LINK"
                      ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
                      : "border-slate-800 bg-slate-950/40 text-slate-200 hover:bg-slate-900/40"
                  )}
                >
                  Link (recommended)
                </button>
                <button
                  type="button"
                  onClick={() => setInviteForm((p) => ({ ...p, method: "CODE" }))}
                  className={cx(
                    "h-9 px-4 rounded-xl border text-xs",
                    inviteForm.method === "CODE"
                      ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
                      : "border-slate-800 bg-slate-950/40 text-slate-200 hover:bg-slate-900/40"
                  )}
                >
                  Code
                </button>
              </div>
              <div className="text-[11px] text-slate-500 mt-2">
                Link opens in browser (no download). Later we’ll add “Open in app” deep link + a gentle “Install for faster payments & maintenance”.
              </div>
            </div>

            <textarea
              className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2 text-sm min-h-[84px]"
              placeholder="Optional message (move-in info, rent due date, maintenance rules, etc.)"
              value={inviteForm.message}
              onChange={(e) => setInviteForm((p) => ({ ...p, message: e.target.value }))}
            />

            <Button tone="cyan" onClick={createInvite} disabled={creatingInvite}>
              {creatingInvite ? "Creating…" : "Create Invite"}
            </Button>

            <div className="text-[11px] text-slate-500">
              Next: send invite via email/SMS automatically (backend) and track “delivered / opened / accepted”.
            </div>
          </div>
        </Card>
      </div>

      {/* Alerts */}
      {err ? (
        <div className="text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-2xl p-3">{err}</div>
      ) : null}
      {ok ? (
        <div className="text-sm text-emerald-200 bg-emerald-900/15 border border-emerald-700/30 rounded-2xl p-3">
          {ok}
        </div>
      ) : null}

      {/* Tenants list */}
      <Card
        title="Tenants"
        subtitle={`Showing ${filteredTenants.length} of ${normalizedTenants.length}`}
        right={<Pill tone={normalizedTenants.length ? "cyan" : "slate"}>{normalizedTenants.length} total</Pill>}
      >
        {loading ? (
          <div className="text-sm text-slate-400">Loading…</div>
        ) : normalizedTenants.length === 0 ? (
          <div className="text-sm text-slate-400">
            No tenants yet. Create units, then invite tenants to link them to a unit.
          </div>
        ) : filteredTenants.length === 0 ? (
          <div className="text-sm text-slate-400">No tenants match your filters.</div>
        ) : (
          <div className="space-y-3">
            {filteredTenants.map((t) => {
              const pm = t._pm;
              const d = daysUntil(pm.lease_end);
              const leaseTone =
                d === null ? "slate" : d <= 30 ? "rose" : d <= 60 ? "amber" : d <= 90 ? "cyan" : "emerald";

              return (
                <div
                  key={t.id || `${pm.property_id}-${pm.unit_id}-${pm.email}-${pm.name}`}
                  className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-[260px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-semibold">{pm.name}</div>
                        <Pill tone={statusTone(pm.status)}>{pm.status}</Pill>
                        {pm.section8 ? <Pill tone="fuchsia">Section 8</Pill> : null}
                        {pm.balance !== null && Number(pm.balance) > 0 ? <Pill tone="rose">Balance</Pill> : null}
                      </div>

                      <div className="text-xs text-slate-400 mt-1">
                        {pm.email ? <span className="text-slate-200">{pm.email}</span> : <span>—</span>}
                        {pm.phone ? <span className="opacity-50"> • </span> : null}
                        {pm.phone ? <span className="text-slate-200">{pm.phone}</span> : null}
                      </div>

                      <div className="text-xs text-slate-400 mt-1">
                        <span className="text-slate-200">{pm.property_name}</span> • Unit{" "}
                        <span className="text-slate-200">{pm.unit_label}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 px-3 py-2">
                        <div className="text-[11px] text-slate-500">Lease end</div>
                        <div className="text-sm font-semibold">
                          {pm.lease_end ? fmtDate(pm.lease_end) : "—"}{" "}
                          {d !== null ? <span className="text-xs text-slate-400">({d}d)</span> : null}
                        </div>
                        <div className="mt-1">
                          <Pill tone={leaseTone}>{d === null ? "Unknown" : d <= 0 ? "Expired" : "Countdown"}</Pill>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 px-3 py-2">
                        <div className="text-[11px] text-slate-500">Last payment</div>
                        <div className="text-sm font-semibold">{pm.last_payment ? fmtDate(pm.last_payment) : "—"}</div>
                        <div className="mt-1 text-[11px] text-slate-500">
                          {pm.balance !== null ? `Balance: ${safeStr(pm.balance)}` : "Balance: —"}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          tone="slate"
                          onClick={() => setOk("Tenant detail pages next: lease, payments, messages, documents, actions.")}
                        >
                          Details
                        </Button>

                        <Button
                          tone="cyan"
                          onClick={() =>
                            setOk("Messaging will be wired next (PM → tenant thread + templates + notices).")
                          }
                        >
                          Message
                        </Button>

                        <Button
                          tone="indigo"
                          onClick={() =>
                            setOk("Rent collection actions (remind/fee/notice) will come after Payments/RentCharges exist.")
                          }
                        >
                          Rent Actions
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] text-slate-500">
                    Decision-first: if lease is within 60 days → start renewal workflow. If balance exists → send reminder / fee / notice.
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Invites table */}
      <Card
        title="Invites"
        subtitle="Track onboarding (created / copied / accepted — backend will add delivered/opened later)"
        right={<Pill tone={invites.length ? "cyan" : "slate"}>{invites.length} total</Pill>}
      >
        {loading ? (
          <div className="text-sm text-slate-400">Loading…</div>
        ) : invites.length === 0 ? (
          <div className="text-sm text-slate-400">
            No invites yet. Create one above, then copy the link/code.
          </div>
        ) : (
          <div className="space-y-3">
            {invites.map((i) => {
              const code = i.code || i.invite_code || "";
              const link = buildInviteLink(i);
              const unitLabel = i.unit_label || i.unit || "—";
              const created = i.created_at || i.created || "";
              return (
                <div key={i.id || `${code}-${created}`} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-semibold">
                          Invite: <span className="text-cyan-200">{code || "—"}</span>
                        </div>
                        <Pill tone="slate">{i.status || "CREATED"}</Pill>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Unit: <span className="text-slate-200">{unitLabel}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">Created {created ? fmtDate(created) : "—"}</div>
                      {link ? (
                        <div className="mt-2 text-[11px] text-slate-400">
                          Link: <span className="font-mono text-slate-300 break-all">{link}</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <CopyButton
                        value={code}
                        label="Copy Code"
                        onCopied={() => setOk("Invite code copied.")}
                      />
                      <CopyButton
                        value={link}
                        label="Copy Link"
                        onCopied={() => setOk("Invite link copied.")}
                      />
                      <button
                        type="button"
                        className="inline-flex items-center justify-center h-9 text-xs rounded-xl px-4 border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40 text-slate-200"
                        onClick={() => setOk("Revoke will be wired on backend next (invalidate code + audit log).")}
                      >
                        Revoke
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] text-slate-500">
                    Best onboarding: send link first (web). Once they’re in, offer “Install app for payments & maintenance”.
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="text-[11px] text-slate-500">
        Tenant onboarding strategy (best practice): web invite link works instantly; app install is optional at first, but we’ll
        add “faster rent payments + maintenance tracking” nudges after they’re linked.
      </div>
    </div>
  );
}
