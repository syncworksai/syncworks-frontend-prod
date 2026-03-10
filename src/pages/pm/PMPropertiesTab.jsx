// src/pages/pm/PMPropertiesTab.jsx
import React from "react";
import Button from "../../components/ui/Button";
import { Card, Pill, fmtDate } from "./pmUi";

export default function PMPropertiesTab({
  loading,
  properties,
  pForm,
  setPForm,
  creatingProperty,
  onCreateProperty,
  onViewUnits,
  onShowOk,
}) {
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Card
        title="Properties"
        subtitle="Add, edit, and manage properties"
        right={<Pill tone={properties.length ? "emerald" : "slate"}>{properties.length} total</Pill>}
      >
        {loading ? (
          <div className="text-sm text-slate-400">Loading…</div>
        ) : properties.length === 0 ? (
          <div className="text-sm text-slate-400">No properties yet. Use the form to create one.</div>
        ) : (
          <div className="space-y-3">
            {properties.map((p) => (
              <div key={p.id} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
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
                      onClick={() => {
                        onShowOk?.("Property detail pages are next on the list (photos, documents, leases, Section 8).");
                      }}
                    >
                      Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Create Property" subtitle="Start your portfolio (works once backend endpoints are wired)">
        <div className="space-y-3">
          <input
            value={pForm.name}
            onChange={(e) => setPForm((p) => ({ ...p, name: e.target.value }))}
            className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2 text-sm"
            placeholder="Property name (e.g., Oak Ridge Apartments)"
          />
          <input
            value={pForm.address}
            onChange={(e) => setPForm((p) => ({ ...p, address: e.target.value }))}
            className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2 text-sm"
            placeholder="Street address"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={pForm.city}
              onChange={(e) => setPForm((p) => ({ ...p, city: e.target.value }))}
              className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2 text-sm"
              placeholder="City"
            />
            <input
              value={pForm.state}
              onChange={(e) => setPForm((p) => ({ ...p, state: e.target.value }))}
              className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2 text-sm"
              placeholder="State"
            />
          </div>
          <input
            value={pForm.zip}
            onChange={(e) => setPForm((p) => ({ ...p, zip: e.target.value }))}
            className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2 text-sm"
            placeholder="ZIP"
          />
          <textarea
            value={pForm.notes}
            onChange={(e) => setPForm((p) => ({ ...p, notes: e.target.value }))}
            className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2 text-sm min-h-[88px]"
            placeholder="Notes (optional)"
          />

          <Button tone="cyan" onClick={onCreateProperty} disabled={creatingProperty}>
            {creatingProperty ? "Creating…" : "Create Property"}
          </Button>

          <div className="text-[11px] text-slate-500">
            If you see an error about endpoints not wired, that’s expected right now. Next we’ll add backend models +
            routes for PM.
          </div>
        </div>
      </Card>

      <Card title="What a Property contains (next)" subtitle="This is where we get professional">
        <div className="text-sm text-slate-300 space-y-2">
          <div className="flex items-center justify-between">
            <span>Photos + condition + furnishing flags</span>
            <Pill tone="cyan">Next</Pill>
          </div>
          <div className="flex items-center justify-between">
            <span>Section 8 settings (agent contacts, recert schedule)</span>
            <Pill>Queued</Pill>
          </div>
          <div className="flex items-center justify-between">
            <span>Documents (leases, addendums, notices)</span>
            <Pill>Queued</Pill>
          </div>
          <div className="flex items-center justify-between">
            <span>Owner/investor linkage</span>
            <Pill>Queued</Pill>
          </div>
          <div className="mt-3 text-[11px] text-slate-500">
            Property Detail page is where we’ll automate templates and reduce manual work.
          </div>
        </div>
      </Card>
    </div>
  );
}
