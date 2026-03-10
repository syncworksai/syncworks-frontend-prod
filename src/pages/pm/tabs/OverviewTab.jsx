// src/pages/pm/tabs/OverviewTab.jsx
import React, { useMemo } from "react";
import Button from "../../../components/ui/Button";
import { Card, Pill } from "../pmUi";

export default function OverviewTab({
  loading,
  stats,
  emptyState,
  onGoProperties,
  onGoCalendar,
  onSetOk,
}) {
  const blocks = useMemo(() => stats || [], [stats]);

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Card
        title="At-a-glance"
        subtitle="Your portfolio summary"
        right={loading ? <span className="text-xs text-slate-400">Loading…</span> : null}
      >
        <div className="grid grid-cols-2 gap-3">
          {blocks.map((s) => (
            <div key={s.label} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="text-xs text-slate-400">{s.label}</div>
              <div className="mt-2 flex items-center gap-2">
                <div className="text-2xl font-semibold">{s.value}</div>
                <Pill tone={s.tone}>{s.value ? "Active" : "None"}</Pill>
              </div>
            </div>
          ))}
        </div>

        {emptyState ? (
          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="font-semibold">Get started</div>
            <ol className="mt-2 text-sm text-slate-300 list-decimal pl-5 space-y-1">
              <li>Create a property</li>
              <li>Add units</li>
              <li>Generate tenant invite codes</li>
              <li>Tenants join via code → maintenance tickets tie to units</li>
            </ol>
            <div className="mt-3 flex gap-2 flex-wrap">
              <Button tone="cyan" onClick={onGoProperties}>
                Create your first property
              </Button>
              <Button tone="slate" onClick={onGoCalendar}>
                View Calendar
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      <Card title="What’s next" subtitle="We’re building this like a real PM company runs">
        <div className="space-y-2 text-sm text-slate-300">
          <div className="flex items-center justify-between">
            <span>1) Properties + Units (CRUD)</span>
            <Pill tone="cyan">Now</Pill>
          </div>
          <div className="flex items-center justify-between">
            <span>2) Tenant invite codes + join flow</span>
            <Pill>Next</Pill>
          </div>
          <div className="flex items-center justify-between">
            <span>3) Maintenance tickets (unit-based)</span>
            <Pill>Queued</Pill>
          </div>
          <div className="flex items-center justify-between">
            <span>4) Leases + Docs + Signatures</span>
            <Pill>Queued</Pill>
          </div>
          <div className="flex items-center justify-between">
            <span>5) Investors/Owners portal</span>
            <Pill>Queued</Pill>
          </div>

          <div className="mt-3 text-[11px] text-slate-500">
            Permissions stay strict: PM staff sees portfolio, tenants see their unit, investors see only owned properties.
          </div>

          <div className="mt-3">
            <Button
              tone="slate"
              onClick={() =>
                onSetOk?.("Next we’ll extract Units into a component and add a simple Create Unit UI.")
              }
            >
              Continue build plan
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Calendar" subtitle="Lease expirations, doc signatures, inspections, renewals">
        <div className="text-sm text-slate-300">
          We’ll add a PM calendar page that automatically pulls:
          <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-300">
            <li>Lease end dates (renewal alerts)</li>
            <li>Document signature deadlines</li>
            <li>Section 8 inspections/re-cert</li>
            <li>Move-in / move-out</li>
            <li>Scheduled maintenance</li>
          </ul>
        </div>

        <div className="mt-4">
          <Button tone="cyan" onClick={onGoCalendar}>
            Open Calendar
          </Button>
        </div>

        <div className="mt-3 text-[11px] text-slate-500">
          We’ll build it UI-first, then wire to leases/documents when backend is ready.
        </div>
      </Card>
    </div>
  );
}
