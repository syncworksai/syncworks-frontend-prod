// src/pages/pm/PMOverviewTab.jsx
import React from "react";
import Button from "../../components/ui/Button";
import { Card, Pill } from "./pmUi";

export default function PMOverviewTab({ loading, stats, emptyState, onGoProperties, onGoCalendar }) {
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Card
        title="At-a-glance"
        subtitle="Your portfolio summary"
        right={loading ? <span className="text-xs text-slate-400">Loading…</span> : null}
      >
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
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
              <li>Create a property (name + address)</li>
              <li>Add units (Unit A, 101, etc.)</li>
              <li>Generate tenant invites (code or link)</li>
              <li>Tenants join using the code — then service tickets can be tied to units</li>
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

      <Card title="Upcoming deadlines (next)" subtitle="Leases expiring • Signatures pending • Recertifications">
        <div className="text-sm text-slate-300">
          This will become your compliance + task engine.
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Lease expirations (30/60/90 days)</li>
            <li>Unsigned documents</li>
            <li>Section 8 recert dates</li>
            <li>Scheduled inspections</li>
          </ul>
          <div className="mt-3 text-[11px] text-slate-500">We’ll wire this to the PM Calendar + lease records.</div>
        </div>
      </Card>

      <Card title="Ops snapshot (next)" subtitle="Maintenance backlog • Open tickets • SLA health">
        <div className="text-sm text-slate-300">
          This will summarize:
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Open service requests (by priority)</li>
            <li>Avg time-to-respond / time-to-close</li>
            <li>Vendor performance and cost tracking</li>
          </ul>
          <div className="mt-3 text-[11px] text-slate-500">We’ll connect it to Service Requests + Tickets later.</div>
        </div>
      </Card>
    </div>
  );
}
