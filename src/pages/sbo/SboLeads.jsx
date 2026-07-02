import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  ChevronRight,
  CircleDollarSign,
  Filter,
  LoaderCircle,
  Mail,
  MessageSquareText,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import api from "../../api/client";
import DashboardShell from "../../components/dashboard/DashboardShell";
import GlassCard from "../../components/dashboard/GlassCard";
import SidebarNav from "../../components/dashboard/SidebarNav";

const STAGES = [
  { id: "NEW", label: "New" },
  { id: "CONTACTED", label: "Contacted" },
  { id: "QUALIFIED", label: "Qualified" },
  { id: "QUOTE_SENT", label: "Quote Sent" },
  { id: "WON", label: "Won" },
];

function rowsOf(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.value)) return value.value;
  return [];
}

function upper(value) {
  return String(value || "").trim().toUpperCase().replaceAll(" ", "_");
}

function stageOf(lead) {
  const value =
    lead?.stage_name ||
    lead?.stage?.name ||
    lead?.status ||
    lead?.stage ||
    "NEW";

  const normalized = upper(value);

  if (normalized.includes("QUOTE")) return "QUOTE_SENT";
  if (normalized.includes("QUAL")) return "QUALIFIED";
  if (normalized.includes("CONTACT")) return "CONTACTED";
  if (normalized.includes("WON") || normalized.includes("CONVERT")) return "WON";
  return "NEW";
}

function nameOf(lead) {
  return (
    lead?.name ||
    lead?.full_name ||
    lead?.contact_name ||
    lead?.customer_name ||
    lead?.business_name ||
    lead?.title ||
    `Lead #${lead?.id || "unknown"}`
  );
}

function sourceOf(lead) {
  return (
    lead?.source ||
    lead?.lead_source ||
    lead?.origin ||
    lead?.channel ||
    "Manual"
  );
}

function money(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return "$0";
  return amount.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function dateLabel(value) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function initials(value) {
  return String(value || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function LeadDrawer({ lead, onClose, onOpenGrowth }) {
  if (!lead) return null;

  const phone = lead?.phone || lead?.phone_number || lead?.contact_phone || "";
  const email = lead?.email || lead?.contact_email || "";
  const notes = lead?.notes || lead?.description || lead?.summary || "";
  const followUp =
    lead?.next_follow_up_at || lead?.follow_up_at || lead?.next_action_at;
  const value =
    lead?.estimated_value ||
    lead?.value ||
    lead?.amount ||
    lead?.budget ||
    0;

  return (
    <div className="fixed inset-0 z-[140]">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <aside className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-[2rem] border border-fuchsia-400/20 bg-slate-950 p-5 shadow-2xl md:inset-y-4 md:left-auto md:right-4 md:w-[440px] md:rounded-[2rem]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-fuchsia-400/25 bg-fuchsia-500/10 text-lg font-black text-fuchsia-100">
              {initials(nameOf(lead))}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-200">
                Lead profile
              </div>
              <h2 className="mt-1 truncate text-xl font-black text-white">
                {nameOf(lead)}
              </h2>
              <div className="mt-1 text-xs text-slate-400">
                {sourceOf(lead)} · {stageOf(lead).replaceAll("_", " ")}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-slate-700 bg-slate-900 text-slate-300"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="text-xs text-slate-500">Estimated value</div>
            <div className="mt-2 text-2xl font-black text-white">
              {money(value)}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="text-xs text-slate-500">Next follow-up</div>
            <div className="mt-2 text-sm font-black text-white">
              {dateLabel(followUp)}
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {phone ? (
            <a
              href={`tel:${phone}`}
              className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 text-sm font-bold text-slate-200"
            >
              <Phone aria-hidden="true" className="h-4 w-4 text-cyan-200" />
              {phone}
            </a>
          ) : null}

          {email ? (
            <a
              href={`mailto:${email}`}
              className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 text-sm font-bold text-slate-200"
            >
              <Mail aria-hidden="true" className="h-4 w-4 text-cyan-200" />
              {email}
            </a>
          ) : null}
        </div>

        <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">
            Notes
          </div>
          <div className="mt-2 text-sm leading-6 text-slate-300">
            {notes || "No lead notes have been recorded yet."}
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenGrowth}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-500 via-violet-600 to-cyan-500 px-5 text-sm font-black text-white"
        >
          <Sparkles aria-hidden="true" className="h-5 w-5" />
          Open Social Media workspace
        </button>
      </aside>
    </div>
  );
}

export default function SboLeads() {
  const navigate = useNavigate();

  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navItems = [
    { label: "Dashboard", icon: "⌂", onClick: () => navigate("/sbo") },
    { label: "Job Requests", icon: "▤", onClick: () => navigate("/tickets?view=new") },
    { label: "Inbox", icon: "💬", onClick: () => navigate("/inbox"), badge: "0" },
    { label: "Calendar", icon: "◷", onClick: () => navigate("/calendar") },
    { label: "Customers", icon: "◉", onClick: () => navigate("/sbo/customers") },
    { label: "Leads", icon: "◎", active: true, onClick: () => navigate("/sbo/leads") },
    { label: "Employees", icon: "👥", onClick: () => navigate("/team/invites") },
    { label: "Partners", icon: "◇", onClick: () => navigate("/sbo/partners") },
    { label: "Product Settings", icon: "⚙", onClick: () => navigate("/sbo/catalog") },
    { label: "Finance", icon: "$", onClick: () => navigate("/sbo/finance") },
    { label: "Social Media", icon: "✦", onClick: () => navigate("/sbo/growth") },
    { label: "Reports", icon: "↗", onClick: () => navigate("/sbo/reports") },
    { label: "Settings", icon: "⚙", onClick: () => navigate("/sbo/settings?return=%2Fsbo") },
  ];

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/sales/leads/");
      setLeads(rowsOf(response?.data));
    } catch (requestError) {
      setError(
        requestError?.response?.data?.detail ||
          "Unable to load leads from the current business."
      );
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const sources = useMemo(
    () =>
      Array.from(new Set(leads.map(sourceOf).filter(Boolean))).sort((a, b) =>
        String(a).localeCompare(String(b))
      ),
    [leads]
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return leads.filter((lead) => {
      const sourceMatches =
        sourceFilter === "ALL" || sourceOf(lead) === sourceFilter;
      const searchMatches =
        !needle ||
        [
          nameOf(lead),
          sourceOf(lead),
          lead?.email,
          lead?.phone,
          lead?.description,
          lead?.notes,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle));

      return sourceMatches && searchMatches;
    });
  }, [leads, search, sourceFilter]);

  const byStage = useMemo(() => {
    const map = Object.fromEntries(STAGES.map((stage) => [stage.id, []]));

    for (const lead of filtered) {
      const stage = stageOf(lead);
      if (!map[stage]) map.NEW.push(lead);
      else map[stage].push(lead);
    }

    return map;
  }, [filtered]);

  const openCount = leads.filter((lead) => stageOf(lead) !== "WON").length;
  const followUpCount = leads.filter((lead) => {
    const value =
      lead?.next_follow_up_at || lead?.follow_up_at || lead?.next_action_at;
    if (!value) return false;
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) && date.getTime() <= Date.now();
  }).length;
  const pipelineValue = leads.reduce(
    (sum, lead) =>
      sum +
      Number(
        lead?.estimated_value ||
          lead?.value ||
          lead?.amount ||
          lead?.budget ||
          0
      ),
    0
  );

  return (
    <DashboardShell
      title="Leads"
      subtitle="Live social, marketplace, website, and manual lead pipeline"
      modeBarTitle="Leads"
      modeBarSubtitle="Capture · qualify · follow up · convert"
      bottomNavItems={[
        { label: "Home", icon: "⌂", onClick: () => navigate("/sbo") },
        { label: "Requests", icon: "▤", onClick: () => navigate("/tickets?view=new") },
        { label: "Customers", icon: "◉", onClick: () => navigate("/sbo/customers") },
        { label: "Settings", icon: "⚙", onClick: () => navigate("/sbo/settings?return=%2Fsbo") },
      ]}
      bottomCenterAction={{ label: "New", onClick: () => navigate("/tickets?view=new") }}
      rightActions={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate("/sbo")}
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm font-black text-slate-200"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Dashboard
          </button>
          <button
            type="button"
            onClick={loadLeads}
            disabled={loading}
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-fuchsia-300/30 bg-fuchsia-500/15 px-4 text-sm font-black text-fuchsia-100 disabled:opacity-50"
          >
            <RefreshCw
              aria-hidden="true"
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <SidebarNav title="Business OS" subtitle="Leads CRM" items={navItems} />

        <div className="min-w-0 space-y-5">
          {error ? (
            <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-fuchsia-400/20 bg-fuchsia-500/[0.08] p-5">
              <UserRound aria-hidden="true" className="h-5 w-5 text-fuchsia-200" />
              <div className="mt-3 text-xs text-slate-400">Open leads</div>
              <div className="mt-1 text-3xl font-black text-white">{openCount}</div>
            </div>
            <div className="rounded-3xl border border-amber-400/20 bg-amber-500/[0.08] p-5">
              <CalendarClock aria-hidden="true" className="h-5 w-5 text-amber-200" />
              <div className="mt-3 text-xs text-slate-400">Follow-ups due</div>
              <div className="mt-1 text-3xl font-black text-white">
                {followUpCount}
              </div>
            </div>
            <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/[0.08] p-5">
              <CircleDollarSign
                aria-hidden="true"
                className="h-5 w-5 text-emerald-200"
              />
              <div className="mt-3 text-xs text-slate-400">Pipeline value</div>
              <div className="mt-1 text-3xl font-black text-white">
                {money(pipelineValue)}
              </div>
            </div>
          </section>

          <GlassCard
            title="Leads command center"
            subtitle="Live lead records grouped by stage."
            tone="fuchsia"
          >
            <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
              <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4">
                <Search aria-hidden="true" className="h-4 w-4 text-slate-500" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, email, phone, notes..."
                  className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                />
              </label>

              <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4">
                <Filter aria-hidden="true" className="h-4 w-4 text-slate-500" />
                <select
                  value={sourceFilter}
                  onChange={(event) => setSourceFilter(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none"
                >
                  <option value="ALL">All sources</option>
                  {sources.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={() => navigate("/sbo/growth")}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-violet-600 px-5 text-sm font-black text-white"
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
                Capture lead
              </button>
            </div>
          </GlassCard>

          {loading ? (
            <div className="grid min-h-72 place-items-center rounded-[2rem] border border-slate-800 bg-slate-950/60">
              <div className="text-center">
                <LoaderCircle
                  aria-hidden="true"
                  className="mx-auto h-8 w-8 animate-spin text-fuchsia-200"
                />
                <div className="mt-3 text-sm text-slate-400">
                  Loading live pipeline...
                </div>
              </div>
            </div>
          ) : (
            <section className="grid gap-4 xl:grid-cols-5">
              {STAGES.map((stage) => (
                <div
                  key={stage.id}
                  className="min-w-0 rounded-[1.75rem] border border-slate-800 bg-slate-950/55 p-3"
                >
                  <div className="flex items-center justify-between gap-2 px-1">
                    <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-300">
                      {stage.label}
                    </div>
                    <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-black text-slate-300">
                      {byStage[stage.id]?.length || 0}
                    </span>
                  </div>

                  <div className="mt-3 space-y-3">
                    {(byStage[stage.id] || []).map((lead) => (
                      <button
                        key={lead.id || `${stage.id}-${nameOf(lead)}`}
                        type="button"
                        onClick={() => setSelectedLead(lead)}
                        className="w-full rounded-3xl border border-slate-800 bg-slate-900/65 p-4 text-left transition hover:border-fuchsia-400/30 hover:bg-slate-900"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate font-black text-white">
                              {nameOf(lead)}
                            </div>
                            <div className="mt-1 truncate text-xs text-slate-500">
                              {sourceOf(lead)}
                            </div>
                          </div>
                          <ChevronRight
                            aria-hidden="true"
                            className="h-4 w-4 shrink-0 text-fuchsia-200"
                          />
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {(lead?.next_follow_up_at ||
                            lead?.follow_up_at ||
                            lead?.next_action_at) ? (
                            <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-[10px] font-bold text-amber-200">
                              {dateLabel(
                                lead?.next_follow_up_at ||
                                  lead?.follow_up_at ||
                                  lead?.next_action_at
                              )}
                            </span>
                          ) : null}

                          {(lead?.estimated_value ||
                            lead?.value ||
                            lead?.amount ||
                            lead?.budget) ? (
                            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[10px] font-bold text-emerald-200">
                              {money(
                                lead?.estimated_value ||
                                  lead?.value ||
                                  lead?.amount ||
                                  lead?.budget
                              )}
                            </span>
                          ) : null}
                        </div>
                      </button>
                    ))}

                    {!byStage[stage.id]?.length ? (
                      <div className="rounded-3xl border border-dashed border-slate-800 p-4 text-center text-xs text-slate-600">
                        No leads
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </section>
          )}

          <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/[0.07] p-5">
            <div className="flex items-start gap-3">
              <MessageSquareText
                aria-hidden="true"
                className="mt-0.5 h-5 w-5 shrink-0 text-cyan-200"
              />
              <div>
                <div className="font-black text-cyan-100">
                  SYNC lead intelligence
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-400">
                  SYNC now reads this live pipeline for briefings. Outreach,
                  stage changes, and automated follow-up remain approval-gated.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <LeadDrawer
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onOpenGrowth={() => navigate("/sbo/growth")}
      />
    </DashboardShell>
  );
}
