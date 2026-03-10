// src/pages/PropertyManagerDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import ModeBar from "../components/ModeBar";
import Button from "../components/ui/Button";

// ✅ PM icon
import pmIcon from "../assets/pm/property-management.png";

// ✅ Panels (already exist in your tree)
import PeoplePanel from "../components/pm/PeoplePanel";
import PropertiesPanel from "../components/pm/PropertiesPanel";
import WorkOrdersPanel from "../components/pm/WorkOrdersPanel";
import InvitesPanel from "../components/pm/InvitesPanel";
import UnitsPanel from "../components/pm/UnitsPanel";
import TenantsPanel from "../components/pm/TenantsPanel";
import DocumentsPanel from "../components/pm/DocumentsPanel";

// ✅ Section 8
import Section8CasesPanel from "../components/pm/Section8CasesPanel";

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
      : tone === "blue"
      ? "border-sky-500/40 text-sky-200 bg-sky-500/10"
      : tone === "rose"
      ? "border-rose-500/40 text-rose-200 bg-rose-500/10"
      : "border-slate-700 text-slate-300 bg-slate-950/40";

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full border text-[11px] ${cls}`}>
      {children}
    </span>
  );
}

function money(v) {
  const n = Number(v || 0);
  if (Number.isNaN(n)) return "$0.00";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function KpiTile({ label, value, hint, tone = "slate", badge }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
      <div className="min-w-0">
        <div className="text-xs text-slate-400">{label}</div>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <div className="text-2xl font-semibold text-slate-100">{value}</div>
          {badge ? <Pill tone={tone}>{badge}</Pill> : null}
        </div>
        {hint ? <div className="mt-2 text-xs text-slate-500">{hint}</div> : null}
      </div>
    </div>
  );
}

// ✅ Top nav tabs (fast cycling)
const MAIN_TABS = [
  { key: "overview", label: "Overview" },
  { key: "maintenance", label: "Maintenance" },
  { key: "properties", label: "Properties" },
  { key: "tenants", label: "Tenants" },
  { key: "investors", label: "Investors" },
];

// ✅ Dropdown = “everything else”
const DROPDOWN_TOOLS = [
  { key: "employees", label: "Team / Employees (route)" },
  { key: "people", label: "People (contacts)" },
  { key: "settings", label: "PM Settings (stub)" },
];

export default function PropertyManagerDashboard() {
  const nav = useNavigate();

  // tab = top-level navigation
  const [tab, setTab] = useState("overview");

  // maintenance sub-tab
  const [maintView, setMaintView] = useState("workorders"); // workorders | calendar

  // dropdown
  const [toolPick, setToolPick] = useState("");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // Backend data
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [invites, setInvites] = useState([]);

  // Rollups (optional endpoints; UI works even if not wired yet)
  const [rentRollup, setRentRollup] = useState(null);
  const [docsRollup, setDocsRollup] = useState(null);

  const emptyState = useMemo(() => {
    return properties.length === 0 && units.length === 0 && tenants.length === 0;
  }, [properties.length, units.length, tenants.length]);

  function toastOk(msg) {
    setOk(msg || "");
    setErr("");
  }

  function toastErr(msg) {
    setErr(msg || "Something went wrong.");
    setOk("");
  }

  async function tryGetList(path) {
    const r = await api.get(path);
    const data = r.data;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data)) return data;
    return [];
  }

  async function tryGetObj(paths) {
    let last = null;
    for (const p of paths) {
      try {
        const r = await api.get(p);
        return r.data;
      } catch (e) {
        last = e;
      }
    }
    throw last || new Error("Not found");
  }

  async function loadAll() {
    setLoading(true);
    setErr("");
    setOk("");

    try {
      const [p, u, t, i] = await Promise.all([
        tryGetList("/pm/properties/").catch(() => []),
        tryGetList("/pm/units/").catch(() => []),
        tryGetList("/pm/tenants/").catch(() => []),
        tryGetList("/pm/invites/").catch(() => []),
      ]);

      setProperties(p);
      setUnits(u);
      setTenants(t);
      setInvites(i);

      const [rentR, docsR] = await Promise.allSettled([
        tryGetObj(["/pm/rent/rollup/"]), // optional future endpoint
        tryGetObj(["/pm/docs/rollup/"]), // optional future endpoint
      ]);

      setRentRollup(rentR.status === "fulfilled" ? rentR.value : null);
      setDocsRollup(docsR.status === "fulfilled" ? docsR.value : null);
    } catch (e) {
      toastErr(e?.response?.data?.detail || e?.message || "Failed to load PM data.");
    } finally {
      setLoading(false);
    }
  }

  // ✅ REAL create property (wired)
  async function createProperty(payload) {
    const r = await api.post("/pm/properties/", payload);
    const created = r.data;
    setProperties((prev) => [created, ...(Array.isArray(prev) ? prev : [])]);
    return created;
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ When tab changes, keep switching snappy:
  // - maintenance defaults to workorders
  useEffect(() => {
    if (tab === "maintenance") setMaintView("workorders");
  }, [tab]);

  // ✅ Dropdown actions
  useEffect(() => {
    if (!toolPick) return;

    if (toolPick === "employees") {
      nav("/pm/employees");
      setToolPick("");
      return;
    }

    if (toolPick === "people") {
      // stays on-page panel inside “Settings-ish” flow
      setTab("overview");
      setToolPick("");
      // show people panel by using a simple modal-ish section below on overview
      toastOk("People opened below (Overview).");
      return;
    }

    if (toolPick === "settings") {
      setTab("overview");
      setToolPick("");
      toastOk("PM Settings is scaffolded under Overview → Settings card for now.");
      return;
    }

    setToolPick("");
  }, [toolPick, nav]); // eslint-disable-line react-hooks/exhaustive-deps

  const inventoryPills = useMemo(() => {
    return [
      { label: "Properties", value: properties.length, tone: properties.length ? "emerald" : "slate" },
      { label: "Units", value: units.length, tone: units.length ? "cyan" : "slate" },
      { label: "Tenants", value: tenants.length, tone: tenants.length ? "amber" : "slate" },
      { label: "Invites", value: invites.length, tone: invites.length ? "purple" : "slate" },
    ];
  }, [properties.length, units.length, tenants.length, invites.length]);

  const moneyKpis = useMemo(() => {
    if (!rentRollup) return null;
    return {
      month: rentRollup.month,
      rent_due_mtd: money(rentRollup.rent_due_mtd),
      collected_mtd: money(rentRollup.collected_mtd),
      past_due_total: money(rentRollup.past_due_total),
      delinquent_tenants: String(rentRollup.delinquent_tenants ?? "0"),
    };
  }, [rentRollup]);

  const docKpis = useMemo(() => {
    if (!docsRollup) return null;
    return {
      missing_leases: String(docsRollup.missing_leases ?? "0"),
      requests_due_soon: String(docsRollup.requests_due_soon ?? "0"),
      overdue_docs: String(docsRollup.overdue_docs ?? "0"),
      expiring_soon: String(docsRollup.expiring_soon ?? "0"),
    };
  }, [docsRollup]);

  const showMoneyLive = !!moneyKpis;
  const showDocsLive = !!docKpis;

  function TabBtn({ tKey, label }) {
    const active = tab === tKey;
    return (
      <button
        type="button"
        onClick={() => setTab(tKey)}
        className={[
          "h-9 px-4 rounded-xl border text-xs font-semibold transition",
          active
            ? "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-200"
            : "border-slate-800 bg-slate-950/40 text-slate-200 hover:bg-slate-900/40",
        ].join(" ")}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar
        title="Property Manager"
        subtitle="Overview • Maintenance • Properties • Tenants • Investors"
        rightActions={
          <div className="flex gap-2 flex-wrap">
            <Button tone="slate" onClick={loadAll} disabled={loading}>
              Refresh
            </Button>
            <Button tone="slate" onClick={() => nav("/customer")}>
              Home
            </Button>
          </div>
        }
      />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {/* ✅ HERO only on Overview */}
        {tab === "overview" ? (
          <div className="rounded-[28px] border border-slate-800 bg-slate-950/35 p-6 overflow-hidden relative">
            <div className="pointer-events-none absolute inset-0 opacity-70">
              <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
              <div className="absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
            </div>

            <div className="relative flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4 min-w-[260px]">
                <div className="h-16 w-16 rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden shrink-0 shadow-[0_0_40px_rgba(217,70,239,0.18)]">
                  <img src={pmIcon} alt="Property Management" className="h-full w-full object-cover" draggable={false} />
                </div>

                <div className="min-w-0">
                  <div className="text-xs text-slate-400 tracking-widest">PROPERTY MANAGEMENT</div>
                  <div className="text-2xl font-extrabold truncate">Operations Hub</div>
                  <div className="text-sm text-slate-300 mt-1">Fast tabs. No hunting. Dispatch and collect.</div>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button tone="cyan" onClick={() => setTab("maintenance")}>
                  Maintenance
                </Button>
                <Button tone="slate" onClick={() => setTab("properties")}>
                  Properties
                </Button>
                <Button tone="slate" onClick={() => setTab("tenants")}>
                  Tenants
                </Button>
              </div>
            </div>

            <div className="relative mt-4 flex items-center gap-2 flex-wrap">
              {inventoryPills.map((s) => (
                <span
                  key={s.label}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/50 px-3 py-2"
                >
                  <span className="text-xs text-slate-400">{s.label}</span>
                  <span className="text-sm font-semibold">{s.value}</span>
                  <Pill tone={s.value ? s.tone : "slate"}>{s.value ? "Active" : "None"}</Pill>
                </span>
              ))}
              {loading ? <span className="text-xs text-slate-400 ml-2">Loading…</span> : null}
            </div>
          </div>
        ) : null}

        {/* ✅ Top tabs + dropdown */}
        <div className="flex flex-wrap items-center gap-2">
          {MAIN_TABS.map((t) => (
            <TabBtn key={t.key} tKey={t.key} label={t.label} />
          ))}

          <div className="ml-auto flex items-center gap-2">
            <select
              value={toolPick}
              onChange={(e) => setToolPick(e.target.value)}
              className="h-9 rounded-xl bg-slate-950 border border-slate-800 px-3 text-xs text-slate-200"
            >
              <option value="">More…</option>
              {DROPDOWN_TOOLS.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
            <Pill tone="cyan">{MAIN_TABS.find((x) => x.key === tab)?.label || "Tab"}</Pill>
          </div>
        </div>

        {err ? (
          <div className="text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-2xl p-3">{err}</div>
        ) : null}
        {ok ? (
          <div className="text-sm text-emerald-200 bg-emerald-900/15 border border-emerald-700/30 rounded-2xl p-3">
            {ok}
          </div>
        ) : null}

        {/* ✅ OVERVIEW */}
        {tab === "overview" ? (
          <div className="space-y-4">
            {emptyState ? (
              <Card title="Get started" subtitle="Do this once — then we automate the rest">
                <ol className="mt-2 text-sm text-slate-300 list-decimal pl-5 space-y-1">
                  <li>Create a property</li>
                  <li>Add units</li>
                  <li>Add tenants</li>
                  <li>Upload leases + docs</li>
                  <li>Work orders + rent tracking becomes automatic</li>
                </ol>
                <div className="mt-3 flex gap-2 flex-wrap">
                  <Button tone="cyan" onClick={() => setTab("properties")}>
                    Create property
                  </Button>
                  <Button tone="slate" onClick={() => setTab("tenants")}>
                    Add tenants
                  </Button>
                  <Button tone="slate" onClick={() => setTab("maintenance")}>
                    Maintenance
                  </Button>
                </div>
              </Card>
            ) : null}

            <Card
              title="Money"
              subtitle="Rent due, collected, and delinquencies (live once /pm/rent/rollup/ exists)"
              right={showMoneyLive ? <Pill tone="emerald">Live</Pill> : <Pill tone="cyan">Queued</Pill>}
            >
              <div className="grid md:grid-cols-4 gap-3">
                <KpiTile
                  label="Rent Due (MTD)"
                  value={showMoneyLive ? moneyKpis.rent_due_mtd : "—"}
                  tone="cyan"
                  badge={showMoneyLive ? "Live" : "Queued"}
                  hint={showMoneyLive ? `Month: ${moneyKpis.month || "—"}` : "Wire: GET /pm/rent/rollup/"}
                />
                <KpiTile
                  label="Collected (MTD)"
                  value={showMoneyLive ? moneyKpis.collected_mtd : "—"}
                  tone="emerald"
                  badge={showMoneyLive ? "Live" : "Queued"}
                  hint={showMoneyLive ? "Cash received this month" : "Uses payments + allocations"}
                />
                <KpiTile
                  label="Past Due Total"
                  value={showMoneyLive ? moneyKpis.past_due_total : "—"}
                  tone="rose"
                  badge={showMoneyLive ? "Live" : "Queued"}
                  hint={showMoneyLive ? "Overdue balances" : "Based on charge due_date + balance"}
                />
                <KpiTile
                  label="Delinquent Tenants"
                  value={showMoneyLive ? moneyKpis.delinquent_tenants : "—"}
                  tone="amber"
                  badge={showMoneyLive ? "Live" : "Queued"}
                  hint={showMoneyLive ? "Tenants with past-due balance" : "Counts unique tenants overdue"}
                />
              </div>
            </Card>

            <Card
              title="Documents & Compliance"
              subtitle="Requests, expirations, and missing leases (live once /pm/docs/rollup/ exists)"
              right={showDocsLive ? <Pill tone="emerald">Live</Pill> : <Pill tone="cyan">Queued</Pill>}
            >
              <div className="grid md:grid-cols-4 gap-3">
                <KpiTile
                  label="Missing Leases"
                  value={showDocsLive ? docKpis.missing_leases : "—"}
                  tone="amber"
                  badge={showDocsLive ? "Live" : "Queued"}
                  hint={showDocsLive ? "Units without active lease doc" : "Wire: GET /pm/docs/rollup/"}
                />
                <KpiTile
                  label="Requests Due Soon"
                  value={showDocsLive ? docKpis.requests_due_soon : "—"}
                  tone="cyan"
                  badge={showDocsLive ? "Live" : "Queued"}
                  hint="Tenant upload requests due in next 7 days"
                />
                <KpiTile
                  label="Overdue Docs"
                  value={showDocsLive ? docKpis.overdue_docs : "—"}
                  tone="rose"
                  badge={showDocsLive ? "Live" : "Queued"}
                  hint="Requests past due date"
                />
                <KpiTile
                  label="Expiring Soon"
                  value={showDocsLive ? docKpis.expiring_soon : "—"}
                  tone="purple"
                  badge={showDocsLive ? "Live" : "Queued"}
                  hint="Docs expiring within 30 days"
                />
              </div>
            </Card>

            <Card title="Quick admin" subtitle="Use dropdown (More…) for Team/People/Settings">
              <div className="flex gap-2 flex-wrap">
                <Button tone="slate" onClick={() => nav("/pm/employees")}>
                  Team / Employees
                </Button>
                <Button tone="slate" onClick={() => toastOk("People is available as a panel (dropdown → People).")}>
                  People
                </Button>
              </div>
            </Card>

            {/* Optional: People panel lives here if you want it visible later */}
            {/* <PeoplePanel ... /> */}
          </div>
        ) : null}

        {/* ✅ MAINTENANCE */}
        {tab === "maintenance" ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setMaintView("workorders")}
                className={[
                  "h-9 px-4 rounded-xl border text-xs font-semibold transition",
                  maintView === "workorders"
                    ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
                    : "border-slate-800 bg-slate-950/40 text-slate-200 hover:bg-slate-900/40",
                ].join(" ")}
              >
                Work Orders
              </button>

              <button
                type="button"
                onClick={() => {
                  setMaintView("calendar");
                  nav("/pm/calendar");
                }}
                className={[
                  "h-9 px-4 rounded-xl border text-xs font-semibold transition",
                  "border-slate-800 bg-slate-950/40 text-slate-200 hover:bg-slate-900/40",
                ].join(" ")}
              >
                Calendar
              </button>

              <div className="ml-auto flex items-center gap-2">
                <Pill tone="cyan">Dispatcher View</Pill>
                <Button tone="slate" onClick={loadAll} disabled={loading}>
                  Refresh
                </Button>
              </div>
            </div>

            {maintView === "workorders" ? (
              <WorkOrdersPanel
                properties={properties}
                units={units}
                tenants={tenants}
                loading={loading}
                enableApi={true}
                onRefresh={loadAll}
                onOk={toastOk}
                onErr={toastErr}
              />
            ) : null}
          </div>
        ) : null}

        {/* ✅ PROPERTIES */}
        {tab === "properties" ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Button tone="cyan" onClick={() => setTab("overview")}>
                Back to Overview
              </Button>
              <Pill tone="emerald">Inventory</Pill>
            </div>

            <PropertiesPanel
              properties={properties}
              loading={loading}
              enableApi={true}
              onRefresh={loadAll}
              onOk={toastOk}
              onErr={toastErr}
              onCreateProperty={createProperty}
              onOpenUnits={() => toastOk("Units are under Properties → Units tool (coming next: sub-tabs).")}
              onOpenProperty={(p) => toastOk(`Property detail page next for: ${p?.name || "Property"}`)}
            />

            <Card title="Units" subtitle="You can keep this as a quick panel under Properties">
              <UnitsPanel
                onChanged={() => {
                  loadAll();
                }}
              />
            </Card>

            <Card title="Documents" subtitle="Property-level docs and lease uploads">
              <DocumentsPanel
                onChanged={() => {
                  loadAll();
                }}
              />
            </Card>

            <Card title="Section 8" subtitle="Cases + readiness (scaffolded)">
              <Section8CasesPanel
                onChanged={() => {
                  loadAll();
                }}
              />
            </Card>
          </div>
        ) : null}

        {/* ✅ TENANTS */}
        {tab === "tenants" ? (
          <div className="space-y-4">
            <Card title="Tenants" subtitle="Tenant list + status buckets will live here next (past due, expiring, etc.)">
              <TenantsPanel />
            </Card>

            <Card title="Tenant Invites" subtitle="Invite new tenants to portal">
              <InvitesPanel />
            </Card>

            <Card title="Tenant Docs" subtitle="Docs panel reused here (filtering next)">
              <DocumentsPanel
                onChanged={() => {
                  loadAll();
                }}
              />
            </Card>

            <Card title="Section 8" subtitle="Tenant-side Section 8 tracking (same cases panel)">
              <Section8CasesPanel
                onChanged={() => {
                  loadAll();
                }}
              />
            </Card>
          </div>
        ) : null}

        {/* ✅ INVESTORS */}
        {tab === "investors" ? (
          <Card
            title="Investors"
            subtitle="Owners you manage properties for (onboarding + statements + transparency)"
            right={<Pill tone="cyan">Next</Pill>}
          >
            <div className="grid md:grid-cols-3 gap-3 text-sm text-slate-300">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="font-semibold">Owner Roster</div>
                <div className="mt-2 text-slate-400 text-xs">Link owners to properties (many-to-many).</div>
                <div className="mt-3">
                  <Button tone="slate" onClick={() => toastOk("Next: Owner model + link table + /pm/owners/ endpoint.")}>
                    Build Owners
                  </Button>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="font-semibold">Statements</div>
                <div className="mt-2 text-slate-400 text-xs">Monthly statement: rent in, expenses out, net to owner.</div>
                <div className="mt-3">
                  <Button tone="slate" onClick={() => toastOk("Next: Statement generator (PDF later) + /pm/statements/ list.")}>
                    Build Statements
                  </Button>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="font-semibold">Owner Portal</div>
                <div className="mt-2 text-slate-400 text-xs">Read-only dashboard per owner with permissions.</div>
                <div className="mt-3">
                  <Button
                    tone="cyan"
                    onClick={() => toastOk("Next: Owner portal route + scoped API (owner sees assigned properties only).")}
                  >
                    Build Owner Portal
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ) : null}

        <div className="text-[11px] text-slate-500">
          Navigation pattern: tabs first (fast) → dropdown for “extras”. Keeps dispatch efficient.
        </div>
      </main>
    </div>
  );
}
