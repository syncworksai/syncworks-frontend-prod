// src/pages/pm/tabs/UnitsTab.jsx
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

function fmtMoney(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return x.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString();
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

// Tiny no-dependency bar chart (counts)
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

// ---------------------------------------
// Units Tab (Portfolio-friendly)
// ---------------------------------------
export default function UnitsTab() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);

  // Filters
  const [q, setQ] = useState("");
  const [propertyId, setPropertyId] = useState("ALL");
  const [status, setStatus] = useState("ALL"); // OCCUPIED / VACANT / NOTICE / TURNOVER
  const [section8Only, setSection8Only] = useState(false);

  // Create Unit (MVP)
  const [uForm, setUForm] = useState({
    property: "",
    label: "",
    beds: "",
    baths: "",
    sqft: "",
    rent: "",
    status: "VACANT",
    furnished: false,
    section8: false,
    notes: "",
  });
  const [creating, setCreating] = useState(false);

  // Endpoints we’ll wire on backend next
  const ENDPOINTS = useMemo(
    () => ({
      properties: ["/pm/properties/", "/properties/"],
      units: ["/pm/units/", "/units/"],
      createUnit: ["/pm/units/", "/units/"],
    }),
    []
  );

  async function loadAll() {
    setLoading(true);
    setErr("");
    setOk("");

    try {
      const [p, u] = await Promise.all([
        loadWithFallback(ENDPOINTS.properties).catch(() => []),
        loadWithFallback(ENDPOINTS.units).catch(() => []),
      ]);
      setProperties(Array.isArray(p) ? p : []);
      setUnits(Array.isArray(u) ? u : []);
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Failed to load units.");
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

  const normalizedUnits = useMemo(() => {
    // We support multiple shapes until backend is finalized.
    return (Array.isArray(units) ? units : []).map((u) => {
      const pid = u.property_id ?? u.property ?? u.propertyId ?? u.propertyID ?? "";
      const prop = propertyMap.get(String(pid));
      const property_name = u.property_name || prop?.name || u.propertyName || "—";
      const label = u.label || u.unit_label || u.unit_number || u.name || "Unit";
      const st = (u.status || u.occupancy_status || "VACANT").toString().toUpperCase();
      const rent = u.rent ?? u.monthly_rent ?? u.market_rent ?? "";
      const furnished = !!(u.furnished ?? u.is_furnished);
      const section8 = !!(u.section8 ?? u.is_section8);
      const tenant = u.tenant_name || u.current_tenant || u.tenant || "";
      const lease_end = u.lease_end || u.lease_end_date || "";
      const created_at = u.created_at || u.created || "";
      return {
        ...u,
        _pm: {
          property_id: pid ? String(pid) : "",
          property_name,
          label: safeStr(label),
          status: st,
          rent,
          furnished,
          section8,
          tenant: safeStr(tenant),
          lease_end,
          created_at,
        },
      };
    });
  }, [units, propertyMap]);

  const filteredUnits = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return normalizedUnits.filter((u) => {
      const pOk = propertyId === "ALL" ? true : u._pm.property_id === String(propertyId);
      const sOk = status === "ALL" ? true : u._pm.status === status;
      const s8Ok = section8Only ? !!u._pm.section8 : true;

      if (!pOk || !sOk || !s8Ok) return false;

      if (!needle) return true;
      const blob = [
        u._pm.label,
        u._pm.property_name,
        u._pm.tenant,
        u._pm.status,
        safeStr(u.beds),
        safeStr(u.baths),
        safeStr(u.sqft),
      ]
        .join(" | ")
        .toLowerCase();
      return blob.includes(needle);
    });
  }, [normalizedUnits, q, propertyId, status, section8Only]);

  const metrics = useMemo(() => {
    const total = normalizedUnits.length;
    const occupied = normalizedUnits.filter((u) => u._pm.status === "OCCUPIED").length;
    const vacant = normalizedUnits.filter((u) => u._pm.status === "VACANT").length;
    const turnover = normalizedUnits.filter((u) => u._pm.status === "TURNOVER").length;
    const notice = normalizedUnits.filter((u) => u._pm.status === "NOTICE").length;

    const expectedRent = normalizedUnits.reduce((sum, u) => {
      const r = Number(u._pm.rent);
      return Number.isFinite(r) ? sum + r : sum;
    }, 0);

    const occupancyRate = total ? Math.round((occupied / total) * 100) : 0;

    const s8 = normalizedUnits.filter((u) => u._pm.section8).length;
    const furnished = normalizedUnits.filter((u) => u._pm.furnished).length;

    return {
      total,
      occupied,
      vacant,
      turnover,
      notice,
      expectedRent,
      occupancyRate,
      s8,
      furnished,
    };
  }, [normalizedUnits]);

  const statusBars = useMemo(() => {
    return [
      { label: "Occ", value: metrics.occupied, tone: "emerald" },
      { label: "Vac", value: metrics.vacant, tone: "cyan" },
      { label: "Turn", value: metrics.turnover, tone: "amber" },
      { label: "Notice", value: metrics.notice, tone: "rose" },
    ];
  }, [metrics]);

  function statusTone(st) {
    if (st === "OCCUPIED") return "emerald";
    if (st === "VACANT") return "cyan";
    if (st === "TURNOVER") return "amber";
    if (st === "NOTICE") return "rose";
    return "slate";
  }

  async function createUnit() {
    setErr("");
    setOk("");

    const payload = {
      property: uForm.property || uForm.property_id || "",
      label: uForm.label?.trim(),
      beds: uForm.beds === "" ? null : Number(uForm.beds),
      baths: uForm.baths === "" ? null : Number(uForm.baths),
      sqft: uForm.sqft === "" ? null : Number(uForm.sqft),
      rent: uForm.rent === "" ? null : Number(uForm.rent),
      status: (uForm.status || "VACANT").toUpperCase(),
      furnished: !!uForm.furnished,
      section8: !!uForm.section8,
      notes: uForm.notes?.trim() || "",
    };

    if (!payload.property) return setErr("Pick a property first.");
    if (!payload.label) return setErr("Unit label is required (ex: 101, A-2, Unit 4B).");

    setCreating(true);

    let last = null;
    for (const path of ENDPOINTS.createUnit) {
      try {
        const r = await api.post(path, payload);
        const created = r.data;
        setUnits((prev) => [created, ...(Array.isArray(prev) ? prev : [])]);
        setOk("Unit created.");
        setUForm({
          property: payload.property,
          label: "",
          beds: "",
          baths: "",
          sqft: "",
          rent: "",
          status: "VACANT",
          furnished: false,
          section8: false,
          notes: "",
        });
        setCreating(false);
        return;
      } catch (e) {
        last = e;
      }
    }

    const msg = last?.response?.data?.detail || last?.message || "Create unit failed.";
    setErr(
      String(msg).toLowerCase().includes("not found") || last?.response?.status === 404
        ? "PM backend endpoints aren’t wired yet for units. UI is ready — next step is backend models + routes."
        : msg
    );
    setCreating(false);
  }

  return (
    <div className="space-y-4">
      {/* KPI / charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card
          title="Units health snapshot"
          subtitle="Occupancy + rent roll indicators (auto-populates once backend is wired)"
          right={loading ? <span className="text-xs text-slate-400">Loading…</span> : <Pill tone="fuchsia">PM Ops</Pill>}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="text-xs text-slate-400">Units</div>
              <div className="mt-2 flex items-center gap-2">
                <div className="text-2xl font-semibold">{metrics.total}</div>
                <Pill tone={metrics.total ? "emerald" : "slate"}>{metrics.total ? "Tracked" : "None"}</Pill>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="text-xs text-slate-400">Occupancy</div>
              <div className="mt-2 flex items-center gap-2">
                <div className="text-2xl font-semibold">{metrics.occupancyRate}%</div>
                <Pill tone={metrics.occupancyRate >= 90 ? "emerald" : metrics.occupancyRate >= 75 ? "amber" : "rose"}>
                  {metrics.occupancyRate >= 90 ? "Healthy" : metrics.occupancyRate >= 75 ? "Watch" : "At Risk"}
                </Pill>
              </div>
            </div>

            <div className="col-span-2 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-400">Status distribution</div>
                  <div className="text-[11px] text-slate-500 mt-1">Occ / Vac / Turn / Notice</div>
                </div>
                <MiniBars items={statusBars} />
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 flex-wrap text-[11px] text-slate-400">
            <Pill tone="cyan">Section 8: {metrics.s8}</Pill>
            <Pill tone="fuchsia">Furnished: {metrics.furnished}</Pill>
            <Pill tone="slate">Expected rent: {fmtMoney(metrics.expectedRent)}</Pill>
          </div>
        </Card>

        <Card title="Filters" subtitle="Find anything instantly (built for 1000+ units)">
          <div className="space-y-3">
            <div>
              <div className="text-xs text-slate-400 mb-1">Search</div>
              <input
                className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2 text-sm"
                placeholder="Unit 101, tenant name, property name, etc."
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
                  onChange={(e) => setPropertyId(e.target.value)}
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
                <div className="text-xs text-slate-400 mb-1">Status</div>
                <select
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2 text-sm"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="ALL">All</option>
                  <option value="OCCUPIED">Occupied</option>
                  <option value="VACANT">Vacant</option>
                  <option value="TURNOVER">Turnover</option>
                  <option value="NOTICE">Notice</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-200 select-none">
              <input
                type="checkbox"
                className="h-4 w-4 accent-cyan-400"
                checked={section8Only}
                onChange={(e) => setSection8Only(e.target.checked)}
              />
              Section 8 only
            </label>

            <div className="flex gap-2 flex-wrap">
              <Button tone="slate" onClick={loadAll} disabled={loading}>
                Refresh
              </Button>
              <Button
                tone="slate"
                onClick={() => {
                  setQ("");
                  setPropertyId("ALL");
                  setStatus("ALL");
                  setSection8Only(false);
                }}
              >
                Reset
              </Button>
            </div>

            <div className="text-[11px] text-slate-500">
              Backend note: once Units/Leases/Payments are wired, these filters will also power rent-roll and late rent
              actions.
            </div>
          </div>
        </Card>

        <Card title="Create unit" subtitle="Fast add (MVP). Full unit details page comes next.">
          <div className="space-y-3">
            <div>
              <div className="text-xs text-slate-400 mb-1">Property (required)</div>
              <select
                className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2 text-sm"
                value={uForm.property}
                onChange={(e) => setUForm((p) => ({ ...p, property: e.target.value }))}
              >
                <option value="">Select property…</option>
                {properties.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name || `Property #${p.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-slate-400 mb-1">Unit label (required)</div>
                <input
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2 text-sm"
                  placeholder="101 / A-2 / Unit 4B"
                  value={uForm.label}
                  onChange={(e) => setUForm((p) => ({ ...p, label: e.target.value }))}
                />
              </div>

              <div>
                <div className="text-xs text-slate-400 mb-1">Status</div>
                <select
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2 text-sm"
                  value={uForm.status}
                  onChange={(e) => setUForm((p) => ({ ...p, status: e.target.value }))}
                >
                  <option value="VACANT">Vacant</option>
                  <option value="OCCUPIED">Occupied</option>
                  <option value="TURNOVER">Turnover</option>
                  <option value="NOTICE">Notice</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <input
                className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                placeholder="Beds"
                value={uForm.beds}
                onChange={(e) => setUForm((p) => ({ ...p, beds: e.target.value }))}
              />
              <input
                className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                placeholder="Baths"
                value={uForm.baths}
                onChange={(e) => setUForm((p) => ({ ...p, baths: e.target.value }))}
              />
              <input
                className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                placeholder="Sqft"
                value={uForm.sqft}
                onChange={(e) => setUForm((p) => ({ ...p, sqft: e.target.value }))}
              />
              <input
                className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                placeholder="Rent"
                value={uForm.rent}
                onChange={(e) => setUForm((p) => ({ ...p, rent: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <label className="flex items-center gap-2 text-sm text-slate-200 select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-cyan-400"
                  checked={uForm.furnished}
                  onChange={(e) => setUForm((p) => ({ ...p, furnished: e.target.checked }))}
                />
                Furnished
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-200 select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-cyan-400"
                  checked={uForm.section8}
                  onChange={(e) => setUForm((p) => ({ ...p, section8: e.target.checked }))}
                />
                Section 8
              </label>
            </div>

            <textarea
              className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2 text-sm min-h-[84px]"
              placeholder="Notes (optional)"
              value={uForm.notes}
              onChange={(e) => setUForm((p) => ({ ...p, notes: e.target.value }))}
            />

            <Button tone="cyan" onClick={createUnit} disabled={creating}>
              {creating ? "Creating…" : "Create Unit"}
            </Button>

            <div className="text-[11px] text-slate-500">
              Next: unit detail pages (photos, lease docs, inspection dates, Section 8 case, payment plan).
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

      {/* Units list */}
      <Card
        title="Units"
        subtitle={`Showing ${filteredUnits.length} of ${normalizedUnits.length}`}
        right={<Pill tone={normalizedUnits.length ? "cyan" : "slate"}>{normalizedUnits.length} total</Pill>}
      >
        {loading ? (
          <div className="text-sm text-slate-400">Loading…</div>
        ) : normalizedUnits.length === 0 ? (
          <div className="text-sm text-slate-400">
            No units yet. Create a property, then add units. (Backend endpoints may still be pending.)
          </div>
        ) : filteredUnits.length === 0 ? (
          <div className="text-sm text-slate-400">No units match your filters.</div>
        ) : (
          <div className="space-y-3">
            {filteredUnits.map((u) => {
              const pm = u._pm;
              return (
                <div key={u.id || `${pm.property_id}-${pm.label}-${pm.created_at}`} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-[240px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-semibold">{pm.label}</div>
                        <Pill tone={statusTone(pm.status)}>{pm.status}</Pill>
                        {pm.section8 ? <Pill tone="fuchsia">Section 8</Pill> : null}
                        {pm.furnished ? <Pill tone="cyan">Furnished</Pill> : null}
                      </div>

                      <div className="text-xs text-slate-400 mt-1">
                        Property: <span className="text-slate-200">{pm.property_name}</span>
                      </div>

                      <div className="text-[11px] text-slate-500 mt-1">
                        {pm.tenant ? (
                          <>
                            Tenant: <span className="text-slate-300">{pm.tenant}</span> • Lease end:{" "}
                            <span className="text-slate-300">{pm.lease_end ? fmtDate(pm.lease_end) : "—"}</span>
                          </>
                        ) : (
                          <>No tenant linked yet</>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 px-3 py-2">
                        <div className="text-[11px] text-slate-500">Rent</div>
                        <div className="text-sm font-semibold">{fmtMoney(pm.rent)}</div>
                      </div>

                      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 px-3 py-2">
                        <div className="text-[11px] text-slate-500">Specs</div>
                        <div className="text-sm font-semibold">
                          {safeStr(u.beds || "—")}bd • {safeStr(u.baths || "—")}ba • {safeStr(u.sqft || "—")} sqft
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          tone="slate"
                          onClick={() => {
                            setOk("Unit detail pages are next (photos + lease docs + inspections + payments).");
                          }}
                        >
                          Details
                        </Button>

                        <Button
                          tone="cyan"
                          onClick={() => {
                            // We’ll wire PM maintenance requests after units+tenants+leases exist.
                            setOk("Maintenance/Work Orders for units will be wired right after Tenant join + Leases.");
                          }}
                        >
                          Work Orders
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 flex-wrap text-[11px] text-slate-500">
                    <span>Created: {pm.created_at ? fmtDate(pm.created_at) : "—"}</span>
                    <span className="opacity-50">•</span>
                    <span>Next automation: lease expiring alerts + late rent workflows</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
