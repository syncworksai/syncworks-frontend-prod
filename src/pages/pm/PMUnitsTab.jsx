// src/pages/pm/PMUnitsTab.jsx
import React from "react";
import Button from "../../components/ui/Button";
import { Card, Pill, fmtDate } from "./pmUi";

export default function PMUnitsTab({ loading, units, onGoTenants, onShowOk }) {
  return (
    <Card
      title="Units"
      subtitle="Units live under properties"
      right={<Pill tone={units.length ? "cyan" : "slate"}>{units.length} total</Pill>}
    >
      {loading ? (
        <div className="text-sm text-slate-400">Loading…</div>
      ) : units.length === 0 ? (
        <div className="text-sm text-slate-400">
          No units yet. Once backend is wired, units will appear here (with occupancy, lease, and rent status).
        </div>
      ) : (
        <div className="space-y-3">
          {units.map((u) => (
            <div key={u.id} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-semibold">{u.label || u.unit_number || u.name || "Unit"}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Property: <span className="text-slate-200">{u.property_name || u.property || "—"}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Created {fmtDate(u.created_at)}</div>
                </div>
                <div className="flex gap-2">
                  <Button tone="slate" onClick={onGoTenants}>
                    Tenants
                  </Button>
                  <Button
                    tone="cyan"
                    onClick={() => onShowOk?.("Unit-based service requests will be wired after tenant joining.")}
                  >
                    Request Service
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
