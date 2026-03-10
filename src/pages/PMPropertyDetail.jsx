// src/pages/PMPropertyDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api/client";
import Button from "../components/ui/Button";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

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
    <span className={`inline-flex items-center px-2 py-1 rounded-full border text-[11px] ${cls}`}>
      {children}
    </span>
  );
}

function Card({ title, subtitle, right, children }) {
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

function Modal({ open, title, subtitle, onClose, children, footer, disableClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={() => (!disableClose ? onClose?.() : null)} />
      <div className="relative w-full max-w-4xl rounded-3xl border border-slate-800 bg-[#020617] shadow-2xl">
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold">{title}</div>
              {subtitle ? <div className="text-xs text-slate-400 mt-1">{subtitle}</div> : null}
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

function unitStatusTone(st) {
  const s = (st || "").toUpperCase();
  if (s === "OCCUPIED") return "emerald";
  if (s === "VACANT") return "cyan";
  if (s === "NOTICE") return "amber";
  if (s === "READY") return "indigo";
  return "slate";
}

function inviteTone(st) {
  const s = String(st || "").toUpperCase();
  if (s === "PENDING") return "amber";
  if (s === "ACCEPTED") return "emerald";
  if (s === "EXPIRED") return "rose";
  return "slate";
}

function fmtPct(x) {
  const n = Number(x || 0);
  return `${Math.round(n * 100)}%`;
}

function fmtMoney(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function fmtDate(dt) {
  if (!dt) return "—";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function clean2(s) {
  return String(s || "")
    .trim()
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Lease Snapshot resolver
 * ----------------------
 * This UI is ready NOW. It will display real values if your backend returns any of these fields
 * on unit or property payloads:
 *
 * Preferred (unit-level):
 * - unit.current_tenant_name (string)
 * - unit.current_tenant_email (string)
 * - unit.lease_end_date (ISO)
 * - unit.lease_type ("STANDARD" | "FURNISHED" | ...)
 * - unit.is_furnished (bool)
 * - unit.rent_amount (number)
 * - unit.balance_due (number)  (positive => past due)
 * - unit.section8_active (bool)
 * - unit.section8_eligible (bool)
 * - unit.beds (number)
 * - unit.baths (string/number)
 *
 * Fallbacks:
 * - unit.market_rent for rent_amount
 */
function leaseToneFromBalance(balanceDue) {
  const n = Number(balanceDue);
  if (!Number.isFinite(n)) return "slate";
  if (n > 0) return "rose";
  return "emerald";
}

function leaseStatusLabel(balanceDue) {
  const n = Number(balanceDue);
  if (!Number.isFinite(n)) return "—";
  return n > 0 ? "PAST DUE" : "CURRENT";
}

export default function PMPropertyDetail() {
  const nav = useNavigate();
  const { propertyId } = useParams();

  const pid = Number(propertyId);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [property, setProperty] = useState(null);
  const [unitsResp, setUnitsResp] = useState(null);
  const [invitesResp, setInvitesResp] = useState(null);

  const [tab, setTab] = useState("overview");

  // Edit modal
  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editErr, setEditErr] = useState("");
  const [editForm, setEditForm] = useState({
    name: "",
    property_type: "HOME",
    address: "",
    city: "",
    state: "",
    zip: "",
    notes: "",
    status: "HEALTHY",
  });

  // Create unit modal
  const [openUnit, setOpenUnit] = useState(false);
  const [creatingUnit, setCreatingUnit] = useState(false);
  const [unitErr, setUnitErr] = useState("");
  const [unitForm, setUnitForm] = useState({
    label: "Unit 1",
    beds: 0,
    baths: "0.0",
    status: "VACANT",
    section8_eligible: false,
    section8_active: false,
    market_rent: "",
    notes: "",
    // Optional “future” fields (safe to keep even if backend ignores them)
    is_furnished: false,
    rent_amount: "",
    lease_end_date: "",
  });

  async function loadAll() {
    if (!pid) return;

    setLoading(true);
    setErr("");

    try {
      const [pRes, uRes, iRes] = await Promise.all([
        api.get(`/pm/properties/${pid}/`),
        api.get("/pm/units/"),
        api.get("/pm/invites/"),
      ]);

      setProperty(pRes.data);
      setUnitsResp(uRes.data);
      setInvitesResp(iRes.data);

      // seed edit form
      const p = pRes.data;
      setEditForm({
        name: p?.name || "",
        property_type: p?.property_type || "HOME",
        address: p?.address || "",
        city: p?.city || "",
        state: p?.state || "",
        zip: p?.zip || "",
        notes: p?.notes || "",
        status: (p?.status || "HEALTHY").toUpperCase(),
      });

      setLoading(false);
    } catch (e) {
      setErr(normalizeErr(e));
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);

  const unitsAll = useMemo(() => {
    const r = unitsResp?.results;
    return Array.isArray(r) ? r : Array.isArray(unitsResp) ? unitsResp : [];
  }, [unitsResp]);

  const invitesAll = useMemo(() => {
    const r = invitesResp?.results;
    return Array.isArray(r) ? r : Array.isArray(invitesResp) ? invitesResp : [];
  }, [invitesResp]);

  const units = useMemo(() => {
    return unitsAll.filter((u) => Number(u.property) === pid);
  }, [unitsAll, pid]);

  const unitIds = useMemo(() => new Set(units.map((u) => Number(u.id))), [units]);

  const invites = useMemo(() => {
    return invitesAll.filter((inv) => unitIds.has(Number(inv.unit)));
  }, [invitesAll, unitIds]);

  const kpis = useMemo(() => {
    const totalUnits = units.length;
    const occupied = units.filter((u) => String(u.status || "").toUpperCase() === "OCCUPIED").length;
    const vacant = units.filter((u) => String(u.status || "").toUpperCase() === "VACANT").length;
    const s8 = units.filter((u) => !!u.section8_active).length;
    return { totalUnits, occupied, vacant, s8 };
  }, [units]);

  // ===== NEW: Lease Snapshot (header card) =====
  const leaseSnapshot = useMemo(() => {
    // Strategy:
    // 1) Prefer first OCCUPIED unit.
    // 2) Else first unit.
    const occupiedUnit =
      units.find((u) => String(u.status || "").toUpperCase() === "OCCUPIED") || units[0] || null;

    const investorName =
      property?.investor_name ||
      property?.owner_name ||
      property?.investor ||
      property?.owner ||
      "—";

    const tenantName =
      occupiedUnit?.current_tenant_name ||
      occupiedUnit?.tenant_name ||
      occupiedUnit?.tenant ||
      "—";

    const leaseEnd =
      occupiedUnit?.lease_end_date ||
      occupiedUnit?.lease_end ||
      occupiedUnit?.lease_end_at ||
      null;

    const isS8 = !!occupiedUnit?.section8_active;

    const isFurnished =
      occupiedUnit?.is_furnished === true ||
      String(occupiedUnit?.lease_type || "").toUpperCase() === "FURNISHED";

    const leaseType =
      occupiedUnit?.lease_type
        ? String(occupiedUnit.lease_type).toUpperCase()
        : isFurnished
        ? "FURNISHED"
        : "STANDARD";

    const rentAmount =
      occupiedUnit?.rent_amount ??
      occupiedUnit?.monthly_rent ??
      occupiedUnit?.market_rent ??
      null;

    const balanceDue =
      occupiedUnit?.balance_due ??
      occupiedUnit?.past_due_amount ??
      occupiedUnit?.amount_due ??
      null;

    const beds = occupiedUnit?.beds ?? null;
    const baths = occupiedUnit?.baths ?? null;

    const unitLabel = occupiedUnit?.label || (occupiedUnit?.id ? `Unit #${occupiedUnit.id}` : "—");
    const unitStatus = occupiedUnit?.status ? String(occupiedUnit.status).toUpperCase() : "—";

    return {
      unit: occupiedUnit,
      unitLabel,
      unitStatus,
      investorName,
      tenantName,
      leaseEnd,
      isS8,
      isFurnished,
      leaseType,
      rentAmount,
      balanceDue,
      beds,
      baths,
    };
  }, [property, units]);

  function openEditModal() {
    setEditErr("");
    setOpenEdit(true);
  }
  function closeEditModal() {
    if (editing) return;
    setOpenEdit(false);
    setEditErr("");
    setEditing(false);
  }

  async function saveEdit() {
    setEditErr("");

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
      setEditErr("Property name is required.");
      return;
    }

    setEditing(true);
    try {
      const r = await api.patch(`/pm/properties/${pid}/`, payload);
      setProperty(r.data);
      setOpenEdit(false);
      setEditing(false);
      await loadAll();
    } catch (e) {
      setEditErr(normalizeErr(e));
      setEditing(false);
    }
  }

  function openCreateUnit() {
    setUnitErr("");
    setUnitForm({
      label: `Unit ${Math.max(1, units.length + 1)}`,
      beds: 0,
      baths: "0.0",
      status: "VACANT",
      section8_eligible: false,
      section8_active: false,
      market_rent: "",
      notes: "",
      is_furnished: false,
      rent_amount: "",
      lease_end_date: "",
    });
    setOpenUnit(true);
  }
  function closeCreateUnit() {
    if (creatingUnit) return;
    setOpenUnit(false);
    setCreatingUnit(false);
    setUnitErr("");
  }

  async function createUnit() {
    setUnitErr("");

    const payload = {
      property: pid,
      label: String(unitForm.label || "").trim(),
      beds: Number(unitForm.beds || 0),
      baths: String(unitForm.baths || "0.0"),
      status: String(unitForm.status || "VACANT").toUpperCase(),
      section8_eligible: !!unitForm.section8_eligible,
      section8_active: !!unitForm.section8_active,
      market_rent: unitForm.market_rent === "" ? null : Number(unitForm.market_rent),
      notes: String(unitForm.notes || "").trim(),

      // Optional “future” fields (backend can ignore; safe if serializer allows extra? If not, keep these OUT)
      // is_furnished: !!unitForm.is_furnished,
      // rent_amount: unitForm.rent_amount === "" ? null : Number(unitForm.rent_amount),
      // lease_end_date: unitForm.lease_end_date || null,
    };

    if (!payload.label) {
      setUnitErr("Unit label is required.");
      return;
    }

    setCreatingUnit(true);
    try {
      await api.post("/pm/units/", payload);
      setOpenUnit(false);
      setCreatingUnit(false);
      await loadAll();
      setTab("units");
    } catch (e) {
      setUnitErr(normalizeErr(e));
      setCreatingUnit(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-100 p-6">
        <div className="text-sm text-slate-400">Loading property…</div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-100 p-6">
        <div className="rounded-2xl border border-rose-700/30 bg-rose-900/15 p-4 text-rose-200">
          {err}
        </div>
        <div className="mt-4">
          <Button tone="slate" onClick={() => nav("/pm")} type="button">
            Back
          </Button>
        </div>
      </div>
    );
  }

  const p = property;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 p-6">
      {/* Top bar */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-xl font-semibold">{p?.name || "Property"}</div>
            <Pill tone={statusTone(p?.status)}>{String(p?.status || "—").toUpperCase()}</Pill>
            <Pill tone="indigo">{String(p?.property_type || "HOME").toUpperCase()}</Pill>
          </div>
          <div className="text-sm text-slate-400 mt-1">
            {[p?.address, p?.city, p?.state, p?.zip].filter(Boolean).join(", ") || "—"}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Property ID: {pid} • Updated: {p?.updated_at ? new Date(p.updated_at).toLocaleString() : "—"}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link to="/pm" className="inline-flex">
            <Button tone="slate" type="button">
              Back to Properties
            </Button>
          </Link>
          <Button tone="slate" onClick={loadAll} type="button">
            Refresh
          </Button>
          <Button tone="cyan" onClick={openEditModal} type="button">
            Edit Property
          </Button>
        </div>
      </div>

      {/* NEW: Lease Snapshot Header */}
      <div className="mt-5 rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="font-semibold">Lease Snapshot</div>
              <Pill tone="slate">{leaseSnapshot.unitLabel}</Pill>
              <Pill tone={unitStatusTone(leaseSnapshot.unitStatus)}>{leaseSnapshot.unitStatus}</Pill>
              {leaseSnapshot.isS8 ? <Pill tone="indigo">SECTION 8</Pill> : <Pill tone="slate">STANDARD</Pill>}
              {leaseSnapshot.isFurnished ? <Pill tone="cyan">FURNISHED</Pill> : <Pill tone="slate">NOT FURNISHED</Pill>}
              {leaseSnapshot.balanceDue !== null ? (
                <Pill tone={leaseToneFromBalance(leaseSnapshot.balanceDue)}>
                  {leaseStatusLabel(leaseSnapshot.balanceDue)}
                </Pill>
              ) : (
                <Pill tone="slate">BALANCE —</Pill>
              )}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              This header is wired to the occupied unit (or first unit). Once we add Lease/Rent fields in the backend,
              these values will become fully real-time.
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              tone="slate"
              type="button"
              onClick={() => {
                setTab("units");
              }}
            >
              Jump to Units
            </Button>
            <Button
              tone="slate"
              type="button"
              onClick={() => {
                setTab("invites");
              }}
            >
              View Invites
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="text-xs text-slate-400">Owner / Investor</div>
            <div className="text-sm text-slate-100 mt-1 truncate">{leaseSnapshot.investorName}</div>
            <div className="text-[11px] text-slate-500 mt-1">Property-level field</div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="text-xs text-slate-400">Current Tenant</div>
            <div className="text-sm text-slate-100 mt-1 truncate">{leaseSnapshot.tenantName}</div>
            <div className="text-[11px] text-slate-500 mt-1">From unit current tenant</div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="text-xs text-slate-400">Lease End</div>
            <div className="text-sm text-slate-100 mt-1">{fmtDate(leaseSnapshot.leaseEnd)}</div>
            <div className="text-[11px] text-slate-500 mt-1">
              Type: <span className="text-slate-300">{leaseSnapshot.leaseType}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="text-xs text-slate-400">Rent / Balance</div>
            <div className="text-sm text-slate-100 mt-1">
              Rent: <span className="text-slate-200">{fmtMoney(leaseSnapshot.rentAmount)}</span>
            </div>
            <div className="text-sm text-slate-100 mt-1">
              Due:{" "}
              <span className={Number(leaseSnapshot.balanceDue) > 0 ? "text-rose-200" : "text-emerald-200"}>
                {leaseSnapshot.balanceDue === null ? "—" : fmtMoney(leaseSnapshot.balanceDue)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="text-xs text-slate-400">Beds / Baths</div>
            <div className="text-sm text-slate-100 mt-1">
              {leaseSnapshot.beds == null && leaseSnapshot.baths == null
                ? "—"
                : `${leaseSnapshot.beds ?? 0} bd • ${leaseSnapshot.baths ?? "0.0"} ba`}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Optional unit fields</div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="text-xs text-slate-400">Section 8</div>
            <div className="text-sm text-slate-100 mt-1">
              {leaseSnapshot.isS8 ? "Active" : "Not Active"}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              (Packet + inspections next)
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="text-xs text-slate-400">Furnished</div>
            <div className="text-sm text-slate-100 mt-1">{leaseSnapshot.isFurnished ? "Yes" : "No"}</div>
            <div className="text-[11px] text-slate-500 mt-1">Lease type / unit flag</div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="text-xs text-slate-400">Collections</div>
            <div className="text-sm text-slate-100 mt-1">
              {leaseSnapshot.balanceDue === null
                ? "—"
                : Number(leaseSnapshot.balanceDue) > 0
                ? "Needs attention"
                : "All good"}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Ledger-driven soon</div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="text-xs text-slate-400">Units</div>
          <div className="text-lg font-semibold mt-1">{kpis.totalUnits}</div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="text-xs text-slate-400">Occupied</div>
          <div className="text-lg font-semibold mt-1">{kpis.occupied}</div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="text-xs text-slate-400">Vacant</div>
          <div className="text-lg font-semibold mt-1">{kpis.vacant}</div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="text-xs text-slate-400">Section 8 Active</div>
          <div className="text-lg font-semibold mt-1">{kpis.s8}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-5 flex gap-2 flex-wrap">
        {[
          ["overview", "Overview"],
          ["units", `Units (${units.length})`],
          ["invites", `Invites (${invites.length})`],
          ["docs", "Docs"],
          ["workorders", "Work Orders"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cx(
              "h-9 px-4 rounded-xl border text-sm",
              tab === key
                ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
                : "border-slate-800 bg-slate-950/40 text-slate-200 hover:bg-slate-900/40"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="mt-4 space-y-4">
        {tab === "overview" ? (
          <Card
            title="Overview"
            subtitle="Core details and quick actions."
            right={
              <div className="flex items-center gap-2">
                <Button
                  tone="slate"
                  type="button"
                  onClick={() => {
                    setTab("units");
                    openCreateUnit();
                  }}
                >
                  New Unit
                </Button>
                <Button tone="slate" type="button" onClick={() => setTab("invites")}>
                  View Invites
                </Button>
              </div>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="text-xs text-slate-400">Occupancy</div>
                <div className="text-lg font-semibold mt-1">
                  {p?.occupancy_rate !== undefined ? fmtPct(p.occupancy_rate) : "—"}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="text-xs text-slate-400">Units Count</div>
                <div className="text-lg font-semibold mt-1">{p?.units_count ?? units.length}</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="text-xs text-slate-400">Section 8 Units</div>
                <div className="text-lg font-semibold mt-1">{p?.section8_units ?? kpis.s8}</div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="text-xs text-slate-400">Notes</div>
              <div className="text-sm text-slate-200 mt-1 whitespace-pre-wrap">{p?.notes || "—"}</div>
            </div>

            <div className="mt-4 text-xs text-slate-500">
              Next: we’ll wire Work Orders to this property via unit → work orders filter.
            </div>
          </Card>
        ) : null}

        {tab === "units" ? (
          <Card
            title="Units"
            subtitle="Units under this property."
            right={
              <div className="flex items-center gap-2">
                <Button tone="cyan" onClick={openCreateUnit} type="button">
                  New Unit
                </Button>
              </div>
            }
          >
            {units.length === 0 ? (
              <div className="text-sm text-slate-400">No units yet. Create one to start.</div>
            ) : (
              <div className="space-y-3">
                {units.map((u) => (
                  <div key={u.id} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-semibold">{u.label || `Unit #${u.id}`}</div>
                          <Pill tone={unitStatusTone(u.status)}>{String(u.status || "—").toUpperCase()}</Pill>
                          {u.section8_active ? <Pill tone="indigo">Section 8 Active</Pill> : null}
                          {u.section8_eligible ? <Pill tone="cyan">S8 Eligible</Pill> : null}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          Beds: {u.beds ?? 0} • Baths: {u.baths ?? "0.0"} • Market Rent:{" "}
                          {u.market_rent == null ? "—" : `$${u.market_rent}`}
                        </div>
                        {u.notes ? <div className="text-xs text-slate-500 mt-2">{u.notes}</div> : null}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Button tone="slate" onClick={() => setTab("invites")} type="button">
                          View Invites
                        </Button>
                        {/* Next: Unit detail page if you want it later */}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ) : null}

        {tab === "invites" ? (
          <Card
            title="Invites"
            subtitle="Tenant invites tied to units in this property."
            right={<div className="text-xs text-slate-500">Invites are filtered by unit → property.</div>}
          >
            {invites.length === 0 ? (
              <div className="text-sm text-slate-400">No invites for this property yet.</div>
            ) : (
              <div className="space-y-3">
                {invites.map((inv) => (
                  <div key={inv.id} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-semibold">{inv.email}</div>
                          <Pill tone={inviteTone(inv.status)}>{String(inv.status || "—").toUpperCase()}</Pill>
                          <Pill tone="slate">Unit #{inv.unit}</Pill>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          Expires: {inv.expires_at ? new Date(inv.expires_at).toLocaleString() : "—"}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          Code: <span className="text-slate-300">{inv.code}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Later: resend invite, cancel invite */}
                        <Button tone="slate" onClick={loadAll} type="button">
                          Refresh
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ) : null}

        {tab === "docs" ? (
          <Card title="Documents" subtitle="Stub for now (we’ll wire doc uploads/templates next).">
            <div className="text-sm text-slate-400">Coming next: property docs + unit docs + Section 8 packet docs.</div>
          </Card>
        ) : null}

        {tab === "workorders" ? (
          <Card title="Work Orders" subtitle="Stub for now — next step is wiring work orders to property/unit.">
            <div className="text-sm text-slate-400">
              Next: we’ll add a Work Orders panel filtered by this property’s units.
            </div>
          </Card>
        ) : null}
      </div>

      {/* EDIT PROPERTY MODAL */}
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
              onChange={(e) => setEditForm((x) => ({ ...x, name: e.target.value }))}
              className="h-10 w-full rounded-xl bg-slate-950 border border-slate-800 px-3 text-sm"
              disabled={editing}
            />
          </Field>

          <Field label="Status">
            <select
              value={editForm.status}
              onChange={(e) => setEditForm((x) => ({ ...x, status: e.target.value }))}
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
              onChange={(e) => setEditForm((x) => ({ ...x, property_type: e.target.value }))}
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
              onChange={(e) => setEditForm((x) => ({ ...x, address: e.target.value }))}
              className="h-10 w-full rounded-xl bg-slate-950 border border-slate-800 px-3 text-sm"
              disabled={editing}
            />
          </Field>

          <Field label="City / State / Zip">
            <div className="grid grid-cols-3 gap-2">
              <input
                value={editForm.city}
                onChange={(e) => setEditForm((x) => ({ ...x, city: e.target.value }))}
                className="h-10 rounded-xl bg-slate-950 border border-slate-800 px-3 text-sm"
                disabled={editing}
              />
              <input
                value={editForm.state}
                onChange={(e) => setEditForm((x) => ({ ...x, state: e.target.value }))}
                className="h-10 rounded-xl bg-slate-950 border border-slate-800 px-3 text-sm"
                maxLength={2}
                disabled={editing}
              />
              <input
                value={editForm.zip}
                onChange={(e) => setEditForm((x) => ({ ...x, zip: e.target.value }))}
                className="h-10 rounded-xl bg-slate-950 border border-slate-800 px-3 text-sm"
                disabled={editing}
              />
            </div>
          </Field>

          <Field label="Notes" hint="Internal notes (owners, quirks, vendors, etc.)">
            <textarea
              value={editForm.notes}
              onChange={(e) => setEditForm((x) => ({ ...x, notes: e.target.value }))}
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

      {/* CREATE UNIT MODAL */}
      <Modal
        open={openUnit}
        title="Create Unit"
        subtitle="Adds a unit under this property."
        onClose={closeCreateUnit}
        disableClose={creatingUnit}
        footer={
          <div className="flex justify-end gap-2">
            <Button tone="slate" onClick={closeCreateUnit} disabled={creatingUnit} type="button">
              Cancel
            </Button>
            <Button tone="cyan" onClick={createUnit} disabled={creatingUnit} type="button">
              {creatingUnit ? "Creating…" : "Create Unit"}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Label" required>
            <input
              value={unitForm.label}
              onChange={(e) => setUnitForm((x) => ({ ...x, label: e.target.value }))}
              className="h-10 w-full rounded-xl bg-slate-950 border border-slate-800 px-3 text-sm"
              disabled={creatingUnit}
            />
          </Field>

          <Field label="Status">
            <select
              value={unitForm.status}
              onChange={(e) => setUnitForm((x) => ({ ...x, status: e.target.value }))}
              className="h-10 w-full rounded-xl bg-slate-950 border border-slate-800 px-3 text-sm"
              disabled={creatingUnit}
            >
              <option value="VACANT">Vacant</option>
              <option value="OCCUPIED">Occupied</option>
              <option value="NOTICE">Notice</option>
              <option value="READY">Ready</option>
            </select>
          </Field>

          <Field label="Beds">
            <input
              type="number"
              value={unitForm.beds}
              onChange={(e) => setUnitForm((x) => ({ ...x, beds: e.target.value }))}
              className="h-10 w-full rounded-xl bg-slate-950 border border-slate-800 px-3 text-sm"
              disabled={creatingUnit}
            />
          </Field>

          <Field label="Baths">
            <input
              value={unitForm.baths}
              onChange={(e) => setUnitForm((x) => ({ ...x, baths: e.target.value }))}
              className="h-10 w-full rounded-xl bg-slate-950 border border-slate-800 px-3 text-sm"
              disabled={creatingUnit}
              placeholder="1.0"
            />
          </Field>

          <Field label="Market Rent" hint="Optional numeric value">
            <input
              value={unitForm.market_rent}
              onChange={(e) => setUnitForm((x) => ({ ...x, market_rent: e.target.value }))}
              className="h-10 w-full rounded-xl bg-slate-950 border border-slate-800 px-3 text-sm"
              disabled={creatingUnit}
              placeholder="1200"
            />
          </Field>

          <Field label="Section 8">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3 space-y-2">
              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={!!unitForm.section8_eligible}
                  onChange={(e) => setUnitForm((x) => ({ ...x, section8_eligible: e.target.checked }))}
                  disabled={creatingUnit}
                />
                Eligible
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={!!unitForm.section8_active}
                  onChange={(e) => setUnitForm((x) => ({ ...x, section8_active: e.target.checked }))}
                  disabled={creatingUnit}
                />
                Active
              </label>
              <div className="text-[11px] text-slate-500">(We’ll wire Section 8 packet + inspections in the next pass.)</div>
            </div>
          </Field>

          <Field label="Notes">
            <textarea
              value={unitForm.notes}
              onChange={(e) => setUnitForm((x) => ({ ...x, notes: e.target.value }))}
              className="min-h-[110px] w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
              disabled={creatingUnit}
            />
          </Field>
        </div>

        {unitErr ? (
          <div className="mt-4 rounded-2xl border border-rose-700/30 bg-rose-900/15 p-3 text-sm text-rose-200">
            {unitErr}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
