// src/pages/pm/tabs/PropertiesTab.jsx
import React from "react";
import Button from "../../../components/ui/Button";
import { Card, Pill, fmtDate } from "../pmUi";

export default function PropertiesTab({
  loading,
  properties,
  onViewUnits,
  onSetOk,
}) {
  return (
    <Card
      title="Properties"
      subtitle="Add, edit, and manage properties"
      right={<Pill tone={properties?.length ? "emerald" : "slate"}>{properties?.length || 0} total</Pill>}
    >
      {loading ? (
        <div className="text-sm text-slate-400">Loading…</div>
      ) : !properties?.length ? (
        <div className="text-sm text-slate-400">No properties yet. Use Overview to create one.</div>
      ) : (
        <div className="space-y-3">
          {properties.map((p) => (
            <div key={p.id || `${p.name}-${p.created_at || ""}`} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-semibold">{p.name || "Untitled Property"}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {[p.address, p.city, p.state, p.zip].filter(Boolean).join(", ") || "—"}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Created {fmtDate(p.created_at)}</div>
                </div>
                <div className="flex gap-2">
                  <Button tone="slate" onClick={onViewUnits}>
                    View Units
                  </Button>
                  <Button
                    tone="indigo"
                    onClick={() => onSetOk?.("Property detail pages are next (photos, docs, Section 8 flags, etc.).")}
                  >
                    Details
                  </Button>
                </div>
              </div>

              {/* Future quick badges */}
              <div className="mt-3 flex gap-2 flex-wrap">
                {p.section8 ? <Pill tone="amber">Section 8</Pill> : <Pill>Not Section 8</Pill>}
                {p.furnished ? <Pill tone="cyan">Furnished</Pill> : <Pill>Unfurnished</Pill>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
