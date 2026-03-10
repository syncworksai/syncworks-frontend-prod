// src/components/pm/PeoplePanel.jsx
import React, { useMemo, useState } from "react";
import Button from "../ui/Button";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
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
      : "border-slate-700 text-slate-300 bg-slate-950/40";
  return <span className={`inline-flex items-center px-2 py-1 rounded-full border text-[11px] ${cls}`}>{children}</span>;
}

function StatTile({ label, value, hint, tone = "slate" }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs text-slate-400">{label}</div>
        <Pill tone={tone}>{hint}</Pill>
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Section({ title, subtitle, right, children }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="font-semibold">{title}</div>
          {subtitle ? <div className="text-xs text-slate-400 mt-1">{subtitle}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString();
}

function StatusPill({ status }) {
  const s = (status || "").toUpperCase();
  if (["NEW", "CONTACTED"].includes(s)) return <Pill tone="cyan">{s}</Pill>;
  if (["SHOWING_SCHEDULED", "APPLIED", "PENDING"].includes(s)) return <Pill tone="amber">{s.replaceAll("_", " ")}</Pill>;
  if (["APPROVED", "ACTIVE"].includes(s)) return <Pill tone="emerald">{s}</Pill>;
  if (["DENIED", "LOST", "MOVED_OUT"].includes(s)) return <Pill tone="rose">{s.replaceAll("_", " ")}</Pill>;
  return <Pill>{s || "—"}</Pill>;
}

// ------------------------------------------------------------------
// UI-ONLY DEMO DATA (until backend endpoints exist)
// ------------------------------------------------------------------
function useDemoPeople() {
  // Prospects: lead stage
  const prospects = [
    {
      id: "pr_1",
      first_name: "Ariana",
      last_name: "W",
      email: "ariana@example.com",
      phone: "(555) 111-2222",
      source: "FurnishFinder",
      status: "NEW",
      desired_move_in: "2026-02-01",
      unit_label: "Unit 101",
      property_name: "Oak Ridge",
      created_at: "2026-01-18T12:00:00Z",
      next_action: "Schedule showing",
    },
    {
      id: "pr_2",
      first_name: "Marcus",
      last_name: "H",
      email: "marcus@example.com",
      phone: "(555) 333-4444",
      source: "Website",
      status: "SHOWING_SCHEDULED",
      desired_move_in: "2026-02-15",
      unit_label: "Unit 2B",
      property_name: "Cedar Point",
      created_at: "2026-01-19T09:00:00Z",
      next_action: "Send showing reminder",
    },
  ];

  // Applicants: application stage
  const applicants = [
    {
      id: "ap_1",
      first_name: "Drew",
      last_name: "S",
      email: "drew@example.com",
      status: "PENDING",
      unit_label: "Unit 305",
      property_name: "Oak Ridge",
      created_at: "2026-01-15T10:00:00Z",
      next_action: "Run screening / request docs",
    },
  ];

  // Tenants: active occupancy
  const tenants = [
    {
      id: "tn_1",
      first_name: "Lena",
      last_name: "K",
      email: "lena@example.com",
      status: "ACTIVE",
      unit_label: "Unit 101",
      property_name: "Oak Ridge",
      lease_end: "2026-04-30",
      section8: true,
      balance_due: 0,
      next_action: "Annual inspection due soon",
    },
    {
      id: "tn_2",
      first_name: "Noah",
      last_name: "P",
      email: "noah@example.com",
      status: "ACTIVE",
      unit_label: "Unit 2B",
      property_name: "Cedar Point",
      lease_end: "2026-02-28",
      section8: false,
      balance_due: 250,
      next_action: "Send rent reminder",
    },
  ];

  // Former tenants
  const former = [
    {
      id: "ft_1",
      first_name: "Sofia",
      last_name: "R",
      email: "sofia@example.com",
      status: "MOVED_OUT",
      unit_label: "Unit 4A",
      property_name: "Oak Ridge",
      moved_out: "2025-12-15",
      balance_due: 0,
      next_action: "Archive & retain ledger",
    },
  ];

  return { prospects, applicants, tenants, former };
}

// ------------------------------------------------------------------
// MAIN PANEL
// ------------------------------------------------------------------
const SUBTABS = [
  { key: "prospects", label: "Prospects" },
  { key: "applicants", label: "Applicants" },
  { key: "tenants", label: "Tenants" },
  { key: "former", label: "Former" },
];

export default function PeoplePanel({
  // optional: pass real data later
  data = null,
  onCreateProspect = null,
  onCreateApplicant = null,
  onCreateTenant = null,
  onInviteTenant = null,
  onOpenTenant = null,
  onOpenProspect = null,
  onOpenApplicant = null,
}) {
  const [subtab, setSubtab] = useState("prospects");
  const [q, setQ] = useState("");
  const [note, setNote] = useState("");

  const demo = useDemoPeople();
  const people = data || demo;

  const counts = useMemo(() => {
    const p = people?.prospects || [];
    const a = people?.applicants || [];
    const t = people?.tenants || [];
    const f = people?.former || [];

    const occupancy = t.length; // placeholder until units exist
    const section8 = t.filter((x) => !!x.section8).length;

    const leaseExpSoon = t.filter((x) => {
      if (!x.lease_end) return false;
      const d = new Date(x.lease_end + "T00:00:00");
      const now = new Date();
      const days = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return days >= 0 && days <= 60;
    }).length;

    const balances = t.reduce((acc, x) => acc + (Number(x.balance_due) || 0), 0);

    return {
      prospects: p.length,
      applicants: a.length,
      tenants: t.length,
      former: f.length,
      occupancy,
      section8,
      leaseExpSoon,
      balances,
    };
  }, [people]);

  const decision = useMemo(() => {
    // simple decision-first banner (later replaced by PMMetricsSnapshot)
    if (counts.balances >= 500) return { tone: "rose", label: "At Risk", msg: "Outstanding balances are piling up — prioritize collections today." };
    if (counts.leaseExpSoon >= 2) return { tone: "amber", label: "Watch", msg: "Multiple leases expire within 60 days — start renewals now." };
    return { tone: "emerald", label: "Healthy", msg: "People pipeline is stable. Keep momentum on showings + renewals." };
  }, [counts.balances, counts.leaseExpSoon]);

  function matches(x) {
    const blob = [
      x.first_name,
      x.last_name,
      x.email,
      x.phone,
      x.property_name,
      x.unit_label,
      x.status,
      x.source,
      x.next_action,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return blob.includes((q || "").toLowerCase().trim());
  }

  const currentList = useMemo(() => {
    const list =
      subtab === "prospects"
        ? people.prospects
        : subtab === "applicants"
        ? people.applicants
        : subtab === "tenants"
        ? people.tenants
        : people.former;

    const out = Array.isArray(list) ? list : [];
    if (!q.trim()) return out;
    return out.filter(matches);
  }, [people, subtab, q]);

  const subtabHelp = useMemo(() => {
    if (subtab === "prospects") return "Leads, showings, and follow-ups. Convert prospects into applicants.";
    if (subtab === "applicants") return "Applications, screening, and decisions. Approve → tenant + lease.";
    if (subtab === "tenants") return "Active residents. Rent status, Section 8 flags, lease expirations, and comms.";
    return "Historical records. Keep ledger + compliance forever.";
  }, [subtab]);

  function createNew() {
    setNote("");
    if (subtab === "prospects") {
      if (onCreateProspect) return onCreateProspect();
      setNote("Prospect creation UI + backend will be added next. For now, this panel shows the final structure.");
      return;
    }
    if (subtab === "applicants") {
      if (onCreateApplicant) return onCreateApplicant();
      setNote("Applicant creation (application flow + PDF upload) will be added next.");
      return;
    }
    if (subtab === "tenants") {
      if (onCreateTenant) return onCreateTenant();
      setNote("Tenant creation + lease assignment will be added next (usually from an approved applicant).");
      return;
    }
    setNote("Former tenants are created automatically at move-out.");
  }

  function primaryActionLabel() {
    if (subtab === "prospects") return "New Prospect";
    if (subtab === "applicants") return "New Applicant";
    if (subtab === "tenants") return "Add Tenant";
    return "Export";
  }

  function onRowOpen(x) {
    if (subtab === "prospects" && onOpenProspect) return onOpenProspect(x);
    if (subtab === "applicants" && onOpenApplicant) return onOpenApplicant(x);
    if (subtab === "tenants" && onOpenTenant) return onOpenTenant(x);
    // no routing yet
    setNote("Detail pages come next (people profiles with timeline, docs, leases, payments, and tickets).");
  }

  return (
    <div className="space-y-4">
      {/* KPI strip + decision-first banner */}
      <div className="rounded-[28px] border border-slate-800 bg-slate-950/35 p-6 overflow-hidden relative">
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
        </div>

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-[280px]">
            <div className="text-xs text-slate-400 tracking-widest">PEOPLE PIPELINE</div>
            <div className="text-2xl font-extrabold">Prospects → Applicants → Tenants</div>
            <div className="text-sm text-slate-300 mt-1">
              Decision-first overview so your team always knows what to do next.
            </div>
          </div>

          <div className="relative flex items-center gap-2">
            <Pill tone={decision.tone}>{decision.label}</Pill>
            <div className="text-sm text-slate-300">{decision.msg}</div>
          </div>
        </div>

        <div className="relative mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile label="Prospects" value={counts.prospects} hint="Pipeline" tone={counts.prospects ? "cyan" : "slate"} />
          <StatTile label="Applicants" value={counts.applicants} hint="In review" tone={counts.applicants ? "amber" : "slate"} />
          <StatTile label="Tenants" value={counts.tenants} hint="Active" tone={counts.tenants ? "emerald" : "slate"} />
          <StatTile label="Section 8" value={counts.section8} hint="S8 units" tone={counts.section8 ? "amber" : "slate"} />
        </div>

        <div className="relative mt-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile label="Lease expirations" value={counts.leaseExpSoon} hint="≤ 60 days" tone={counts.leaseExpSoon ? "amber" : "slate"} />
          <StatTile label="Outstanding balances" value={`$${(counts.balances || 0).toFixed(0)}`} hint="Tenants" tone={counts.balances ? "rose" : "slate"} />
          <StatTile label="Occupancy (stub)" value={counts.occupancy} hint="Uses tenants for now" tone={counts.occupancy ? "emerald" : "slate"} />
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="text-xs text-slate-400">Next actions</div>
            <ul className="mt-2 text-sm text-slate-300 space-y-1 list-disc pl-5">
              <li>Send showing reminders</li>
              <li>Start renewals (60-day window)</li>
              <li>Collections: balances over $0</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Subtabs header */}
      <div className="flex flex-wrap items-center gap-2">
        {SUBTABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setNote("");
              setSubtab(t.key);
            }}
            className={cx(
              "h-9 px-4 rounded-xl border text-xs transition",
              subtab === t.key
                ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
                : "border-slate-800 bg-slate-950/40 text-slate-200 hover:bg-slate-900/40"
            )}
          >
            {t.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-9 w-[260px] max-w-[70vw] rounded-xl bg-slate-950 border border-slate-800 px-3 text-sm"
              placeholder={`Search ${subtab}…`}
            />
          </div>

          <Button tone="cyan" onClick={createNew}>
            {primaryActionLabel()}
          </Button>

          {subtab === "tenants" ? (
            <Button
              tone="slate"
              onClick={() => {
                if (onInviteTenant) return onInviteTenant();
                setNote("Tenant portal invites will be wired next: create tenant invite → email with portal link + disclosure.");
              }}
            >
              Invite to Portal
            </Button>
          ) : null}
        </div>
      </div>

      {/* Helper note */}
      <div className="text-[11px] text-slate-500">{subtabHelp}</div>

      {note ? (
        <div className="text-sm text-amber-200 bg-amber-900/10 border border-amber-800 rounded-2xl p-3">{note}</div>
      ) : null}

      {/* Table/List */}
      <Section
        title={SUBTABS.find((x) => x.key === subtab)?.label || "People"}
        subtitle={`Showing ${currentList.length} record(s)`}
        right={
          <div className="flex items-center gap-2">
            <Pill>{q.trim() ? "Filtered" : "All"}</Pill>
            <Button
              tone="slate"
              onClick={() => setNote("Exports (rent roll, applicant list, contact list) will be part of PM Pro reporting.")}
            >
              Export
            </Button>
          </div>
        }
      >
        {currentList.length === 0 ? (
          <div className="text-sm text-slate-400">
            No records here yet. Create your first {subtab.slice(0, -1)} to start.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400">
                  <th className="py-2 pr-3">Person</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Property / Unit</th>
                  <th className="py-2 pr-3 hidden md:table-cell">Source</th>
                  <th className="py-2 pr-3 hidden lg:table-cell">Key dates</th>
                  <th className="py-2 pr-3">Next action</th>
                  <th className="py-2 pl-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentList.map((x) => (
                  <tr key={x.id} className="border-t border-slate-800/70">
                    <td className="py-3 pr-3">
                      <div className="font-semibold">
                        {[x.first_name, x.last_name].filter(Boolean).join(" ") || x.email || "—"}
                      </div>
                      <div className="text-xs text-slate-500">{x.email || "—"}</div>
                      {x.phone ? <div className="text-xs text-slate-500">{x.phone}</div> : null}
                    </td>

                    <td className="py-3 pr-3">
                      <StatusPill status={x.status} />
                      {subtab === "tenants" ? (
                        <div className="mt-2 flex gap-2 flex-wrap">
                          {x.section8 ? <Pill tone="amber">Section 8</Pill> : <Pill>Market</Pill>}
                          {Number(x.balance_due) > 0 ? <Pill tone="rose">${Number(x.balance_due).toFixed(0)} due</Pill> : <Pill tone="emerald">Paid</Pill>}
                        </div>
                      ) : null}
                    </td>

                    <td className="py-3 pr-3">
                      <div className="text-slate-200">{x.property_name || "—"}</div>
                      <div className="text-xs text-slate-500">{x.unit_label || "—"}</div>
                    </td>

                    <td className="py-3 pr-3 hidden md:table-cell">
                      <div className="text-slate-300">{x.source || "—"}</div>
                    </td>

                    <td className="py-3 pr-3 hidden lg:table-cell">
                      {subtab === "prospects" ? (
                        <div className="text-xs text-slate-500">Move-in: {x.desired_move_in || "—"}</div>
                      ) : null}
                      {subtab === "tenants" ? (
                        <div className="text-xs text-slate-500">Lease end: {x.lease_end ? fmtDate(x.lease_end) : "—"}</div>
                      ) : null}
                      <div className="text-xs text-slate-500">Created: {fmtDate(x.created_at)}</div>
                    </td>

                    <td className="py-3 pr-3">
                      <div className="text-slate-300">{x.next_action || "—"}</div>
                    </td>

                    <td className="py-3 pl-3 text-right">
                      <div className="flex justify-end gap-2 flex-wrap">
                        <Button tone="slate" onClick={() => onRowOpen(x)}>
                          Details
                        </Button>

                        {subtab === "prospects" ? (
                          <Button
                            tone="cyan"
                            onClick={() => setNote("Convert to Applicant will create an application record and carry over contact info + unit interest.")}
                          >
                            Convert
                          </Button>
                        ) : null}

                        {subtab === "applicants" ? (
                          <Button
                            tone="emerald"
                            onClick={() => setNote("Approve → Tenant will create tenant profile + lease draft + tenant portal invite.")}
                          >
                            Approve
                          </Button>
                        ) : null}

                        {subtab === "tenants" ? (
                          <Button
                            tone="indigo"
                            onClick={() => setNote("Message center + notices come next (email + in-app + optional SMS).")}
                          >
                            Message
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 text-[11px] text-slate-500">
          Backend wiring plan: <span className="text-slate-300 font-mono">/pm/prospects</span>,{" "}
          <span className="text-slate-300 font-mono">/pm/applicants</span>,{" "}
          <span className="text-slate-300 font-mono">/pm/tenants</span>,{" "}
          <span className="text-slate-300 font-mono">/pm/former</span> (or a single{" "}
          <span className="text-slate-300 font-mono">/pm/people</span> endpoint with filters).
        </div>
      </Section>

      {/* Placeholder charts area (UI-first) */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Section
          title="Pipeline trend (UI placeholder)"
          subtitle="Prospects and applicants over time (connects to analytics later)"
          right={<Pill>Charts next</Pill>}
        >
          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
            <div className="text-sm text-slate-200 font-semibold">Coming next</div>
            <div className="text-xs text-slate-400 mt-1">
              We’ll add charts once we wire backend snapshots (PMMetricsSnapshot). This will show:
            </div>
            <ul className="mt-3 text-sm text-slate-300 list-disc pl-5 space-y-1">
              <li>Prospects created per week</li>
              <li>Showings scheduled vs completed</li>
              <li>Applicant approvals rate</li>
              <li>Days-to-lease</li>
            </ul>
          </div>
        </Section>

        <Section
          title="Lease risk (UI placeholder)"
          subtitle="Expiring soon + collections risk"
          right={<Pill tone={counts.leaseExpSoon ? "amber" : "emerald"}>{counts.leaseExpSoon ? "Watch" : "Healthy"}</Pill>}
        >
          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
            <div className="text-sm text-slate-200 font-semibold">This will become your action center</div>
            <div className="text-xs text-slate-400 mt-1">
              When wired, this panel will generate recommended actions automatically:
            </div>
            <ul className="mt-3 text-sm text-slate-300 list-disc pl-5 space-y-1">
              <li>“Send renewal offer” (60 days)</li>
              <li>“Schedule inspection” (Section 8 annual)</li>
              <li>“Send rent reminder” (Day X)</li>
              <li>“Generate notice” (Late by X days)</li>
            </ul>
          </div>
        </Section>
      </div>

      <div className="text-[11px] text-slate-500">
        This panel is UI-first and production-safe: it renders even before backend endpoints exist, and becomes “real” once
        we connect PM models + API.
      </div>
    </div>
  );
}
