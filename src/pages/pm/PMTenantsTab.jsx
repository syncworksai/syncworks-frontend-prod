// src/pages/pm/PMTenantsTab.jsx
import React from "react";
import Button from "../../components/ui/Button";
import { Card, Pill } from "./pmUi";

export default function PMTenantsTab({ loading, tenants, onShowOk }) {
  return (
    <Card
      title="Tenants"
      subtitle="Tenants are linked to units via an invite code"
      right={<Pill tone={tenants.length ? "amber" : "slate"}>{tenants.length} total</Pill>}
    >
      {loading ? (
        <div className="text-sm text-slate-400">Loading…</div>
      ) : tenants.length === 0 ? (
        <div className="text-sm text-slate-400">
          No tenants yet. Generate invite codes in the Invites tab. Next we’ll add messaging + tenant profiles.
        </div>
      ) : (
        <div className="space-y-3">
          {tenants.map((t) => (
            <div key={t.id} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-semibold">{t.name || t.email || "Tenant"}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Unit: <span className="text-slate-200">{t.unit_label || t.unit || "—"}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button tone="slate" onClick={() => onShowOk?.("Tenant detail + messaging pages are next.")}>
                    Details
                  </Button>
                  <Button
                    tone="indigo"
                    onClick={() => onShowOk?.("Tenant messaging will be added (PM ↔ tenant) with audit history.")}
                  >
                    Message
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
