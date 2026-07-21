// src/pages/PropertyManagerDashboard.jsx

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api/client";
import Button from "../components/ui/Button";
import ModeBar from "../components/ModeBar";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function Card({ title, subtitle, right, children, className = "" }) {
  return (
    <div
      className={cx(
        "rounded-[28px] border border-blue-500/20 bg-[#07111f]/90 backdrop-blur-xl shadow-[0_18px_80px_rgba(0,89,255,0.10)]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-800/70 px-5 py-4">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold tracking-wide text-slate-100">
            {title}
          </div>

          {subtitle ? (
            <div className="mt-1 text-xs text-slate-500">
              {subtitle}
            </div>
          ) : null}
        </div>

        {right ? <div className="shrink-0">{right}</div> : null}
      </div>

      <div className="p-5">{children}</div>
    </div>
  );
}

function Pill({ children, tone = "slate" }) {
  const map = {
    slate:
      "border-slate-700 bg-slate-900/70 text-slate-300",
    cyan:
      "border-cyan-500/30 bg-cyan-500/10 text-cyan-200",
    emerald:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    amber:
      "border-amber-500/30 bg-amber-500/10 text-amber-200",
    rose:
      "border-rose-500/30 bg-rose-500/10 text-rose-200",
    indigo:
      "border-indigo-500/30 bg-indigo-500/10 text-indigo-200",
  };

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium",
        map[tone] || map.slate
      )}
    >
      {children}
    </span>
  );
}

function MetricCard({
  label,
  value,
  tone = "cyan",
  hint,
}) {
  return (
    <div className="rounded-3xl border border-blue-500/20 bg-[#07111f]/95 p-5 shadow-[0_0_32px_rgba(21,151,255,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
          {label}
        </div>

        <Pill tone={tone}>LIVE</Pill>
      </div>

      <div className="mt-4 text-3xl font-semibold tracking-tight text-white">
        {value}
      </div>

      {hint ? (
        <div className="mt-2 text-xs text-slate-500">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function PropertyRow({ property, onOpen }) {
  const status = String(property?.status || "HEALTHY").toUpperCase();

  const tone =
    status === "HEALTHY"
      ? "emerald"
      : status === "WATCH"
      ? "amber"
      : status === "AT_RISK"
      ? "rose"
      : "slate";

  return (
    <button
      onClick={() => onOpen(property)}
      className="group w-full rounded-3xl border border-blue-500/15 bg-black/25 p-4 text-left transition hover:border-blue-400/45 hover:bg-blue-500/[0.06] hover:shadow-[0_0_28px_rgba(21,151,255,0.08)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-100">
            {property?.name || "Unnamed Property"}
          </div>

          <div className="mt-1 truncate text-xs text-slate-500">
            {[property?.address, property?.city, property?.state]
              .filter(Boolean)
              .join(", ") || "No address"}
          </div>
        </div>

        <Pill tone={tone}>{status}</Pill>
      </div>

      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <Pill tone="indigo">
          {property?.property_type || "HOME"}
        </Pill>

        <Pill tone="cyan">
          {property?.units_count ?? 0} units
        </Pill>

        <Pill tone="amber">
          {property?.occupancy_rate != null
            ? `${Math.round(property.occupancy_rate * 100)}% occupied`
            : "No occupancy"}
        </Pill>
      </div>
    </button>
  );
}

function WorkOrderRow({ wo }) {
  const priority =
    String(wo?.priority || "P3").toUpperCase();

  const tone =
    priority === "P1"
      ? "rose"
      : priority === "P2"
      ? "amber"
      : priority === "P3"
      ? "cyan"
      : "slate";

  return (
    <div className="rounded-2xl border border-blue-500/15 bg-black/25 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-100">
            {wo?.title || "Work Order"}
          </div>

          <div className="mt-1 text-xs text-slate-500">
            {wo?.property_name || "Property"} •{" "}
            {wo?.unit_label || "Unit"}
          </div>
        </div>

        <Pill tone={tone}>{priority}</Pill>
      </div>

      <div className="mt-3 text-xs text-slate-400">
        {wo?.status || "OPEN"}
      </div>
    </div>
  );
}

export default function PropertyManagerDashboard() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);

  const [properties, setProperties] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);

  async function loadDashboard() {
    setLoading(true);

    try {
      const [pRes, woRes] = await Promise.allSettled([
        api.get("/pm/properties/"),
        api.get("/pm/work-orders/"),
      ]);

      if (pRes.status === "fulfilled") {
        const data = pRes.value.data;

        setProperties(
          Array.isArray(data?.results)
            ? data.results
            : Array.isArray(data)
            ? data
            : []
        );
      }

      if (woRes.status === "fulfilled") {
        const data = woRes.value.data;

        setWorkOrders(
          Array.isArray(data?.results)
            ? data.results
            : Array.isArray(data)
            ? data
            : []
        );
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const stats = useMemo(() => {
    const total = properties.length;

    const occupied = properties.filter(
      (p) => Number(p?.occupancy_rate || 0) >= 0.9
    ).length;

    const risk = properties.filter(
      (p) =>
        String(p?.status || "")
          .toUpperCase() === "AT_RISK"
    ).length;

    return {
      total,
      occupied,
      risk,
      workOrders: workOrders.length,
    };
  }, [properties, workOrders]);

  return (
    <div className="min-h-screen bg-black text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-20%] h-[420px] w-[420px] rounded-full bg-blue-600/15 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[420px] w-[420px] rounded-full bg-cyan-500/10 blur-[140px]" />
      </div>

      <ModeBar
        title="Property Management"
        subtitle="One platform. Every property. Total control."
        rightActions={
          <div className="flex gap-2 flex-wrap">
            <Button
              tone="slate"
              onClick={loadDashboard}
              disabled={loading}
            >
              Refresh
            </Button>

            <Button
              tone="slate"
              onClick={() => nav("/pm/employees")}
            >
              Team
            </Button>

            <Button
              tone="cyan"
              onClick={() => nav("/pm/properties/new")}
            >
              Add Property
            </Button>
          </div>
        }
      />

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total Properties"
            value={stats.total}
            tone="cyan"
            hint="Portfolio total"
          />

          <MetricCard
            label="Healthy Occupancy"
            value={stats.occupied}
            tone="emerald"
            hint="90%+ occupied"
          />

          <MetricCard
            label="At Risk"
            value={stats.risk}
            tone="rose"
            hint="Needs attention"
          />

          <MetricCard
            label="Work Orders"
            value={stats.workOrders}
            tone="amber"
            hint="Active tickets"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
          <Card
            title="Property Portfolio"
            subtitle="Open a property to manage units, leases, tenants, and documents."
            right={<Pill tone="cyan">{properties.length} total</Pill>}
          >
            {loading ? (
              <div className="text-sm text-slate-500">
                Loading properties...
              </div>
            ) : properties.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-950/40 p-10 text-center">
                <div className="text-sm text-slate-400">
                  No properties found yet.
                </div>

                <div className="mt-4">
                  <Button
                    tone="cyan"
                    onClick={() => nav("/pm/properties/new")}
                  >
                    Create First Property
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-3">
                {properties.map((property) => (
                  <PropertyRow
                    key={property.id}
                    property={property}
                    onOpen={(p) =>
                      nav(`/pm/properties/${p.id}`)
                    }
                  />
                ))}
              </div>
            )}
          </Card>

          <div className="space-y-6">
            <Card
              title="Work Orders"
              subtitle="Priority queue"
              right={<Pill tone="amber">LIVE</Pill>}
            >
              {workOrders.length === 0 ? (
                <div className="text-sm text-slate-500">
                  No active work orders.
                </div>
              ) : (
                <div className="space-y-3">
                  {workOrders.slice(0, 6).map((wo) => (
                    <WorkOrderRow
                      key={wo.id}
                      wo={wo}
                    />
                  ))}
                </div>
              )}
            </Card>

            <Card
              title="Quick Actions"
              subtitle="Tenants, maintenance, messages, calendar, and documents"
            >
              <div className="grid gap-3">
                <Button
                  tone="slate"
                  onClick={() => nav("/pm/units")}
                >
                  Manage Units
                </Button>

                <Button
                  tone="slate"
                  onClick={() => nav("/pm/tenants")}
                >
                  Tenant Center
                </Button>

                <Button
                  tone="slate"
                  onClick={() => nav("/pm/workorders")}
                >
                  Work Orders
                </Button>

                <Button
                  tone="slate"
                  onClick={() => nav("/pm/docs")}
                >
                  Documents
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}