import React, { useMemo, useState } from "react";
import Button from "../ui/Button";

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
    <span className={`inline-flex items-center px-2 py-1 rounded-full border text-[11px] ${cls}`}>
      {children}
    </span>
  );
}

function Card({ title, subtitle, right, children }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-slate-100">{title}</div>
          {subtitle ? <div className="text-xs text-slate-400 mt-1">{subtitle}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export default function InvestorPortfolioPanel({ properties = [], units = [], loading, onRefresh, onOk, onErr }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = (q || "").toLowerCase().trim();
    if (!s) return properties;
    return properties.filter((p) => {
      const blob = `${p?.name || ""} ${p?.address || ""} ${p?.city || ""} ${p?.state || ""} ${p?.zip || ""}`.toLowerCase();
      return blob.includes(s);
    });
  }, [properties, q]);

  const unitsByProperty = useMemo(() => {
    const map = new Map();
    for (const u of units || []) {
      const pid = u?.property;
      if (!pid) continue;
      if (!map.has(pid)) map.set(pid, []);
      map.get(pid).push(u);
    }
    return map;
  }, [units]);

  return (
    <div className="space-y-4">
      <Card
        title="Portfolio"
        subtitle="Your assigned properties (read-only view)."
        right={
          <div className="flex items-center gap-2">
            <Pill tone="cyan">{loading ? "Loading" : "Ready"}</Pill>
            <Button tone="slate" onClick={onRefresh} disabled={loading}>Refresh</Button>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, address, city…"
            className="h-10 w-full md:w-[420px] rounded-xl bg-slate-950 border border-slate-800 px-3 text-sm text-slate-200"
          />

          <div className="ml-auto flex items-center gap-2">
            <Pill tone={properties.length ? "emerald" : "slate"}>{properties.length} Properties</Pill>
            <Pill tone={units.length ? "cyan" : "slate"}>{units.length} Units</Pill>
          </div>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card title="No properties found" subtitle="If this is unexpected: owner-property link scoping needs wiring.">
          <div className="text-sm text-slate-300">
            This panel expects owner-scoped endpoints like <span className="text-slate-100 font-semibold">/pm/owners/me/properties/</span>.
            Until then it may be showing fallback PM inventory (or nothing if your API blocks it).
          </div>
          <div className="mt-3">
            <Button tone="slate" onClick={() => onOk?.("Next: wire owner-property links + /pm/owners/me/properties/")}>
              Queue backend wiring
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map((p) => {
          const pid = p?.id;
          const linkedUnits = unitsByProperty.get(pid) || [];
          return (
            <div key={pid} className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-100 truncate">{p?.name || `Property #${pid}`}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {p?.address ? `${p.address}, ${p.city || ""} ${p.state || ""} ${p.zip || ""}` : "Address not set"}
                  </div>
                </div>
                <div className="shrink-0 flex gap-2">
                  <Pill tone="cyan">{linkedUnits.length} Units</Pill>
                  <Pill tone={p?.status === "WATCH" ? "rose" : "emerald"}>{p?.status || "—"}</Pill>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="text-xs text-slate-400">Type</div>
                  <div className="mt-1 text-slate-100">{p?.property_type || "—"}</div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="text-xs text-slate-400">Occupancy</div>
                  <div className="mt-1 text-slate-100">{String(p?.occupancy_rate ?? "—")}</div>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-xs text-slate-400 mb-2">Units</div>
                {linkedUnits.length ? (
                  <div className="space-y-2">
                    {linkedUnits.slice(0, 4).map((u) => (
                      <div key={u.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm text-slate-100 truncate">{u?.label || `Unit #${u?.id}`}</div>
                          <div className="text-xs text-slate-400">
                            {u?.beds ?? 0} bd • {u?.baths ?? "0"} ba
                          </div>
                        </div>
                        <div className="shrink-0 flex gap-2">
                          <Pill tone={u?.status === "VACANT" ? "amber" : "emerald"}>{u?.status || "—"}</Pill>
                          {u?.section8_active ? <Pill tone="purple">Section 8</Pill> : null}
                        </div>
                      </div>
                    ))}
                    {linkedUnits.length > 4 ? (
                      <div className="text-xs text-slate-500">+ {linkedUnits.length - 4} more units</div>
                    ) : null}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">No units linked yet.</div>
                )}
              </div>

              <div className="mt-4 flex gap-2 flex-wrap">
                <Button tone="slate" onClick={() => onErr?.("Property detail route is next (read-only owner view).")}>
                  View details
                </Button>
                <Button tone="cyan" onClick={() => onOk?.("Next: show statements + distributions per property.")}>
                  View financials
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
