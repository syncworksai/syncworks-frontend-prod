import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/client";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function safeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.value)) return data.value;
  return [];
}

function fmtDateTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
}

function GlassCard({ title, right, children }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold tracking-tight text-slate-100">{title}</div>
        {right ? <div className="text-xs text-slate-400">{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function KpiCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-2xl font-extrabold mt-1 text-slate-100">{value ?? "—"}</div>
      {hint ? <div className="text-[11px] text-slate-500 mt-1">{hint}</div> : null}
    </div>
  );
}

function StatusPill({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-500/10 border-slate-500/20 text-slate-200",
    cyan: "bg-cyan-500/10 border-cyan-500/20 text-cyan-200",
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-200",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-200",
    rose: "bg-rose-500/10 border-rose-500/20 text-rose-200",
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-200",
  };

  return (
    <span className={cx("text-[11px] px-2 py-1 rounded-full border", tones[tone] || tones.slate)}>
      {children}
    </span>
  );
}

function toneFromStatus(status) {
  const s = String(status || "").toUpperCase();
  if (["ACTIVE", "LIVE", "OPEN", "RUNNING", "CONNECTED"].includes(s)) return "emerald";
  if (["NEW", "PENDING", "QUEUED", "WARM"].includes(s)) return "cyan";
  if (["PAUSED", "WAITING", "IDLE"].includes(s)) return "amber";
  if (["FAILED", "ERROR", "BLOCKED", "DROPPED", "LOST"].includes(s)) return "rose";
  if (["QUALIFIED", "IN_PROGRESS"].includes(s)) return "purple";
  return "slate";
}

function normalizeSource(v) {
  const raw = String(v || "").trim().toLowerCase();
  if (!raw) return "Manual";
  if (raw.includes("facebook")) return "Facebook Ads";
  if (raw.includes("instagram")) return "Instagram";
  if (raw.includes("google")) return "Google";
  if (raw.includes("referral")) return "Referral";
  if (raw.includes("website") || raw.includes("web")) return "Website";
  if (raw.includes("manual")) return "Manual";
  return "Manual";
}

function sourceTone(source) {
  if (source === "Facebook Ads") return "cyan";
  if (source === "Instagram") return "purple";
  if (source === "Google") return "emerald";
  if (source === "Referral") return "amber";
  if (source === "Website") return "slate";
  return "slate";
}

export default function PlatformGrowthEngineTab() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [updateErr, setUpdateErr] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [busyLeadIds, setBusyLeadIds] = useState({});
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [channelSetupPending, setChannelSetupPending] = useState({});

  const [dashboard, setDashboard] = useState({});
  const [leads, setLeads] = useState([]);
  const [demoLeads, setDemoLeads] = useState([
    { id: "demo-1", name: "Roofing Lead", source: "Organic", status: "NEW", stage: "NEW" },
    { id: "demo-2", name: "HVAC Commercial Prospect", source: "Paid Search", status: "QUALIFIED", stage: "QUALIFIED" },
    { id: "demo-3", name: "Property Mgmt Referral", source: "Referral", status: "NURTURING", stage: "NURTURING" },
    { id: "demo-4", name: "Plumbing Contract", source: "Outbound", status: "WON", stage: "WON" },
  ]);
  const [campaigns, setCampaigns] = useState([]);
  const [conversations, setConversations] = useState([]);
  const EDITABLE_STATUSES = ["NEW", "QUALIFIED", "NURTURING", "WON", "LOST"];
  const CHANNELS = ["Facebook", "Instagram", "Google Business", "Email/SMS"];

  async function loadAll() {
    setLoading(true);
    setErr("");
    setUpdateErr("");

    const requests = [
      api.get("/platform-growth/dashboard/").catch(() => ({ __failed: true })),
      api.get("/platform-growth/leads/").catch(() => ({ __failed: true })),
      api.get("/platform-growth/campaigns/").catch(() => ({ __failed: true })),
      api.get("/platform-growth/conversations/").catch(() => ({ __failed: true })),
    ];

    try {
      const [rDashboard, rLeads, rCampaigns, rConversations] = await Promise.all(requests);

      const anySuccess = [rDashboard, rLeads, rCampaigns, rConversations].some((x) => !x?.__failed);

      if (!anySuccess) {
        throw new Error("Growth OS endpoints unavailable.");
      }

      setDashboard(rDashboard?.data || {});
      setLeads(safeList(rLeads?.data).slice(0, 50));
      setCampaigns(safeList(rCampaigns?.data).slice(0, 12));
      setConversations(safeList(rConversations?.data).slice(0, 12));
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Failed to load Growth OS.");
      setDashboard({});
      setLeads([]);
      setCampaigns([]);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function refreshLeads() {
    try {
      const res = await api.get("/platform-growth/leads/");
      setLeads(safeList(res?.data).slice(0, 50));
    } catch {
      // keep optimistic state if refresh fails
    }
  }

  async function patchLeadStatus(lead, nextStatus) {
    const demoMode = leads.length === 0;
    if (demoMode) {
      const key = String(lead?.id || lead?.lead_id);
      setDemoLeads((prev) =>
        (prev || []).map((x) =>
          String(x?.id || x?.lead_id) === key ? { ...x, status: nextStatus, stage: nextStatus } : x
        )
      );
      return;
    }

    const leadId = lead?.id || lead?.lead_id;
    if (!leadId || !nextStatus) return;
    const prevStatus = lead?.status || "";
    const key = String(leadId);

    setUpdateErr("");
    setBusyLeadIds((prev) => ({ ...prev, [key]: true }));

    setLeads((prev) =>
      (prev || []).map((x) =>
        String(x?.id || x?.lead_id) === key ? { ...x, status: nextStatus } : x
      )
    );

    try {
      await api.patch(`/platform-growth/leads/${leadId}/`, { status: nextStatus });
      await refreshLeads();
    } catch (e) {
      setLeads((prev) =>
        (prev || []).map((x) =>
          String(x?.id || x?.lead_id) === key ? { ...x, status: prevStatus } : x
        )
      );
      setUpdateErr(e?.response?.data?.detail || "Failed to update lead status.");
    } finally {
      setBusyLeadIds((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  const kpis = useMemo(() => {
    const d = dashboard || {};
    return {
      leadsCaptured:
        d.leads_captured ?? d.leads_total ?? d.kpis?.leads_captured ?? d.summary?.leads_captured,
      conversationsActive:
        d.conversations_active ??
        d.active_conversations ??
        d.kpis?.conversations_active ??
        d.summary?.conversations_active,
      campaignsLive:
        d.campaigns_live ?? d.active_campaigns ?? d.kpis?.campaigns_live ?? d.summary?.campaigns_live,
      activationEvents:
        d.activation_events ??
        d.activation_events_count ??
        d.kpis?.activation_events ??
        d.summary?.activation_events,
      conversionPlaceholder:
        d.conversion_rate ?? d.kpis?.conversion_rate ?? d.summary?.conversion_rate ?? "—",
      growthScore: d.growth_score ?? d.kpis?.growth_score ?? d.summary?.growth_score,
    };
  }, [dashboard]);

  const activityFeed = useMemo(() => {
    const fromDashboard = [
      ...safeList(dashboard?.activation_events),
      ...safeList(dashboard?.events),
      ...safeList(dashboard?.recent_events),
    ];
    if (fromDashboard.length) return fromDashboard.slice(0, 20);

    const total = Number(dashboard?.events_last_24h);
    if (Number.isFinite(total) && total >= 0) {
      return [
        {
          id: "events-last-24h",
          title: "Automation activity (24h)",
          status: total > 0 ? "ACTIVE" : "IDLE",
          description: `${total} automation event${total === 1 ? "" : "s"} in the last 24 hours.`,
          created_at: new Date().toISOString(),
        },
      ];
    }

    return [];
  }, [dashboard]);

  const leadStatuses = useMemo(() => {
    const known = ["NEW", "QUALIFIED", "NURTURING", "WON", "LOST"];
    const source = (leads || []).length ? leads : demoLeads;
    const discovered = Array.from(
      new Set(
        source
          .map((l) => String(l.status || l.stage || l.pipeline_stage || "").trim().toUpperCase())
          .filter(Boolean)
      )
    );

    const ordered = [...known.filter((x) => discovered.includes(x)), ...discovered.filter((x) => !known.includes(x))];
    return ["ALL", ...ordered];
  }, [leads, demoLeads]);

  const displayLeads = useMemo(() => {
    if ((leads || []).length) return leads;
    return demoLeads;
  }, [leads, demoLeads]);

  const isDemoMode = useMemo(() => (leads || []).length === 0, [leads]);

  const enrichedLeads = useMemo(() => {
    return (displayLeads || []).map((l, idx) => ({
      ...l,
      source: normalizeSource(l.source || l.channel || (isDemoMode ? ["Facebook Ads", "Instagram", "Google", "Referral", "Website", "Manual"][idx % 6] : "Manual")),
    }));
  }, [displayLeads, isDemoMode]);

  const pipelineGroups = useMemo(() => {
    const map = new Map();
    const source = enrichedLeads || [];

    source.forEach((lead) => {
      const bucket = String(lead.status || lead.stage || lead.pipeline_stage || "UNSPECIFIED").toUpperCase();
      if (statusFilter !== "ALL" && bucket !== statusFilter) return;
      if (!map.has(bucket)) map.set(bucket, []);
      map.get(bucket).push(lead);
    });

    return EDITABLE_STATUSES.map((key) => ({ key, items: map.get(key) || [] }));
  }, [enrichedLeads, statusFilter]);

  const channelStates = useMemo(() => {
    const fromBackend = dashboard?.channel_connections;
    if (fromBackend && typeof fromBackend === "object" && !Array.isArray(fromBackend)) {
      return CHANNELS.map((name) => ({
        name,
        connected: !!fromBackend[name] || !!fromBackend[name.toLowerCase()],
      }));
    }

    // demo seed
    return [
      { name: "Facebook", connected: true },
      { name: "Instagram", connected: true },
      { name: "Google Business", connected: false },
      { name: "Email/SMS", connected: true },
    ];
  }, [dashboard]);

  const channelCapabilities = useMemo(
    () => ({
      Facebook: "Run comment capture and lead ad follow-up flows.",
      Instagram: "Trigger DM responders and nurture sequences.",
      "Google Business": "Capture local intent leads and review nudges.",
      "Email/SMS": "Send lifecycle follow-up, win-back, and review requests.",
    }),
    []
  );

  const funnel = useMemo(() => {
    const byStatus = (enrichedLeads || []).reduce((acc, l) => {
      const key = String(l.status || "").toUpperCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return {
      captured: Number(dashboard?.funnel?.captured ?? dashboard?.captured ?? enrichedLeads.length ?? 0),
      qualified: Number(dashboard?.funnel?.qualified ?? byStatus.QUALIFIED ?? 0),
      activated: Number(dashboard?.funnel?.activated ?? byStatus.WON ?? byStatus.ACTIVATED ?? 0),
      paying: Number(dashboard?.funnel?.paying ?? dashboard?.paying ?? 0),
      referred: Number(dashboard?.funnel?.referred ?? dashboard?.referred ?? 0),
    };
  }, [dashboard, enrichedLeads]);



  function isOauthChannel(name) {
    return ["Facebook", "Instagram", "Google Business"].includes(name);
  }

  function handleConnectChannel(name) {
    if (isOauthChannel(name)) {
      setChannelSetupPending((prev) => ({ ...prev, [name]: true }));
    }
  }



  const contentQueue = useMemo(
    () => [
      { id: "cq-1", title: "Spring HVAC Promo", status: "SCHEDULED" },
      { id: "cq-2", title: "Review Request Campaign", status: "DRAFT" },
      { id: "cq-3", title: "Property Mgmt Tips Reel", status: "QUEUED" },
      { id: "cq-4", title: "Plumbing Before/After Post", status: "PUBLISHED" },
    ],
    []
  );

  const aiPostPresets = useMemo(
    () => [
      { key: "promo", label: "Generate Promo Post" },
      { key: "review", label: "Generate Review Ask" },
      { key: "educational", label: "Generate Educational Post" },
      { key: "before_after", label: "Generate Before/After Post" },
    ],
    []
  );

  const aiGeneratedPreviews = useMemo(
    () => [
      {
        id: "gp-1",
        title: "Promo Draft",
        body:
          "Spring tune-up special is live. Book this week and get priority scheduling plus a filter health check.",
        channel: "Facebook + Instagram",
      },
      {
        id: "gp-2",
        title: "Review Ask Draft",
        body:
          "Thanks for trusting our team today. If we earned it, leave a quick review and help neighbors find reliable service.",
        channel: "Google Business + Email",
      },
      {
        id: "gp-3",
        title: "Educational Draft",
        body:
          "3 signs your HVAC needs service: uneven cooling, rising utility bills, and noisy startup cycles.",
        channel: "Instagram Reel + Blog Snippet",
      },
    ],
    []
  );

  const recipeCards = useMemo(() => {
    const fromBackend = safeList(dashboard?.automation_recipes);
    if (fromBackend.length) {
      return fromBackend.map((r, idx) => ({
        id: r.id || `recipe-${idx + 1}`,
        name: r.name || r.title || "Automation Recipe",
        summary: r.summary || r.description || "No summary available.",
        status: r.is_active === true ? "ACTIVE" : "DRAFT",
        audience: r.audience || "Platform",
      }));
    }

    return [
      {
        id: "recipe-new-lead-follow-up",
        name: "New lead follow-up",
        summary: "Auto-send first-touch follow-up after capture and remind after inactivity.",
        status: "ACTIVE",
        audience: "Platform + future SBO add-on",
      },
      {
        id: "recipe-review-request",
        name: "Review request",
        summary: "After successful activation/payment, send review request with smart timing.",
        status: "DRAFT",
        audience: "Platform + future SBO add-on",
      },
      {
        id: "recipe-win-back",
        name: "Win-back campaign",
        summary: "Re-engage cooled leads with a staged value-based sequence.",
        status: "DRAFT",
        audience: "Platform + future SBO add-on",
      },
      {
        id: "recipe-comment-to-dm",
        name: "Comment-to-DM responder",
        summary: "Detect CTA comments and route personalized DM responder flow.",
        status: "ACTIVE",
        audience: "Platform + future SBO add-on",
      },
    ];
  }, [dashboard]);

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-800 bg-slate-950/35 p-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-sm font-semibold text-slate-100">Growth OS</div>
          <div className="text-xs text-slate-500 mt-1">Read-only growth intelligence across leads, campaigns, conversations, and activations.</div>
        </div>
        <button
          type="button"
          onClick={loadAll}
          className="h-9 px-3 rounded-2xl text-xs border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40 text-slate-200"
        >
          Refresh
        </button>
      </div>

      {err ? <div className="text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-2xl p-3">{err}</div> : null}
      {updateErr ? <div className="text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-2xl p-3">{updateErr}</div> : null}
      {loading ? <div className="text-sm text-slate-400">Loading Growth OS…</div> : null}

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <KpiCard label="Leads captured" value={kpis.leadsCaptured} />
        <KpiCard label="Conversations active" value={kpis.conversationsActive} />
        <KpiCard label="Campaigns live" value={kpis.campaignsLive} />
        <KpiCard label="Activation events" value={kpis.activationEvents} />
        <KpiCard label="Conversion" value={kpis.conversionPlaceholder} hint="Placeholder until conversion model ships" />
        <KpiCard label="Growth score" value={kpis.growthScore} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <GlassCard title="Connect Channels" right={isDemoMode ? "demo seed" : "live + demo fallback"}>
          <div className="grid sm:grid-cols-2 gap-2">
            {channelStates.map((c) => (
              <div key={c.name} className="rounded-xl border border-slate-800 bg-slate-950/55 px-3 py-2 flex items-center justify-between gap-2">
                <div className="text-sm text-slate-200">{c.name}</div>
                <StatusPill tone={c.connected ? "emerald" : "amber"}>
                  {c.connected ? "Connected" : "Disconnected"}
                </StatusPill>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setConnectModalOpen(true)}
              className="h-9 px-3 rounded-2xl text-xs border border-cyan-500/35 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-100"
            >
              Connect Channels
            </button>
          </div>
        </GlassCard>

        <GlassCard title="Acquisition funnel" right="captured → referred">
          <div className="grid grid-cols-2 xl:grid-cols-5 gap-2">
            <KpiCard label="Captured" value={funnel.captured} />
            <KpiCard label="Qualified" value={funnel.qualified} />
            <KpiCard label="Activated" value={funnel.activated} />
            <KpiCard label="Paying" value={funnel.paying} />
            <KpiCard label="Referred" value={funnel.referred} />
          </div>
        </GlassCard>
      </div>

      <GlassCard title="Automation recipes (lightweight)" right="frontend-first • demo fallback">
        <div className="grid md:grid-cols-2 gap-3">
          {recipeCards.map((r) => (
            <div key={r.id} className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-slate-100">{r.name}</div>
                <StatusPill tone={r.status === "ACTIVE" ? "emerald" : "amber"}>{r.status}</StatusPill>
              </div>
              <div className="mt-2 text-sm text-slate-300">{r.summary}</div>
              <div className="mt-2 text-[11px] text-slate-500">{r.audience}</div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  className="h-8 px-3 rounded-2xl text-xs border border-slate-800 bg-slate-950/70 text-slate-300"
                >
                  View recipe
                </button>
                <button
                  type="button"
                  className="h-8 px-3 rounded-2xl text-xs border border-cyan-500/30 bg-cyan-500/10 text-cyan-100"
                >
                  Clone for SBO
                </button>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard title="Lead pipeline" right={isDemoMode ? "demo mode • read-only backend" : "live mode"}>
        <div className="flex flex-wrap gap-2">
          {leadStatuses.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={cx(
                "h-8 px-3 rounded-2xl text-xs border transition",
                statusFilter === s
                  ? "border-cyan-500/35 bg-cyan-500/15 text-cyan-100"
                  : "border-slate-800 bg-slate-950/55 hover:bg-slate-900/50 text-slate-300"
              )}
            >
              {s}
            </button>
          ))}
        </div>

        {isDemoMode ? (
          <div className="mt-3 rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
            Demo leads are shown because no live leads were returned.
          </div>
        ) : null}

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            className="h-9 px-3 rounded-2xl text-xs border border-indigo-500/35 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-100"
          >
            Import Leads
          </button>
        </div>

        <div className="mt-4 grid md:grid-cols-2 xl:grid-cols-5 gap-3">
          {pipelineGroups.map((group) => (
            <div key={group.key} className="rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold text-slate-100">{group.key}</div>
                <StatusPill tone={toneFromStatus(group.key)}>{group.items.length}</StatusPill>
              </div>

              <div className="mt-3 space-y-2">
                {group.items.map((l, idx) => {
                  const current = String(l.status || "").toUpperCase();
                  const selectValue = EDITABLE_STATUSES.includes(current) ? current : "NEW";
                  return (
                    <div key={l.id || l.lead_id || l.email || `${group.key}-${idx}`} className="rounded-xl border border-slate-800 bg-slate-950/70 p-2">
                      <div className="font-semibold text-sm text-slate-100">{l.name || l.full_name || l.email || `Lead #${l.id || idx + 1}`}</div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        <span className="inline-flex items-center gap-2">
                          <span>Source:</span>
                          <StatusPill tone={sourceTone(l.source)}>{l.source || "Manual"}</StatusPill>
                        </span>{" "}
                        • Last: {fmtDateTime(l.last_activity_at || l.updated_at || l.created_at)}
                      </div>
                      <div className="mt-2">
                        <select
                          value={selectValue}
                          disabled={!isDemoMode && !!busyLeadIds[String(l.id || l.lead_id)]}
                          onChange={(e) => patchLeadStatus(l, e.target.value)}
                          className="w-full rounded-xl border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 disabled:opacity-60"
                        >
                          {EDITABLE_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
                {!group.items.length ? (
                  <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/30 px-3 py-4 text-xs text-slate-500">
                    No leads
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        {!displayLeads.length ? <div className="text-slate-500 text-sm py-2">No leads available.</div> : null}
        {!!displayLeads.length && !pipelineGroups.some((g) => g.items.length) ? (
          <div className="text-slate-500 text-sm py-2">No leads for selected status.</div>
        ) : null}
      </GlassCard>

      {connectModalOpen ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConnectModalOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-full max-w-xl border-l border-slate-800 bg-[#070a12] text-slate-100 shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-100">Connect Channels</div>
                <div className="text-xs text-slate-400 mt-1">God Mode controls now • same engine later powers SBO Growth Automation add-on.</div>
              </div>
              <button
                type="button"
                onClick={() => setConnectModalOpen(false)}
                className="h-9 px-3 rounded-2xl text-xs border border-slate-800 bg-slate-950/60 text-slate-200"
              >
                Close
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto h-[calc(100%-73px)]">
              <div className="rounded-2xl border border-cyan-500/25 bg-cyan-500/10 p-4">
                <div className="font-semibold text-cyan-100">How it works</div>
                <ul className="mt-2 space-y-1 text-sm text-cyan-50/90 list-disc pl-5">
                  <li>Connect a channel</li>
                  <li>Pick automation recipes</li>
                  <li>Capture leads into SyncWorks</li>
                  <li>Follow up automatically</li>
                </ul>
              </div>

              {channelStates.map((c) => {
                const pending = !!channelSetupPending[c.name];
                const oauthChannel = isOauthChannel(c.name);
                const smsChannel = c.name === "Email/SMS";
                return (
                  <div key={c.name} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-slate-100">{smsChannel ? "Email/SMS (Email ready / SMS planned)" : c.name}</div>
                      <StatusPill tone={pending ? "amber" : c.connected ? "emerald" : "amber"}>
                        {pending ? "Setup Pending" : c.connected ? "Connected" : "Not Connected"}
                      </StatusPill>
                    </div>
                    <div className="mt-2 text-sm text-slate-300">
                      {smsChannel
                        ? "Email automations are ready now. SMS/Twilio is disabled until compliance and legal setup is complete."
                        : channelCapabilities[c.name] || "Channel integration for growth automations."}
                    </div>
                    {pending ? (
                      <div className="mt-2 text-xs text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                        OAuth credentials required in backend settings before live connection.
                      </div>
                    ) : null}
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => handleConnectChannel(c.name)}
                        disabled={pending || smsChannel}
                        className="h-9 px-3 rounded-2xl text-xs border border-cyan-500/35 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-100 disabled:opacity-60 disabled:hover:bg-cyan-500/10"
                      >
                        {pending ? "Setup Pending" : smsChannel ? "Email ready / SMS planned" : "Connect"}
                      </button>
                    </div>
                  </div>
                );
              })}

              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="font-semibold text-slate-100">Admin setup checklist</div>
                <ul className="mt-2 grid sm:grid-cols-2 gap-2 text-xs text-slate-300">
                  {[
                    "META_APP_ID",
                    "META_APP_SECRET",
                    "META_REDIRECT_URI",
                    "GOOGLE_CLIENT_ID",
                    "GOOGLE_CLIENT_SECRET",
                    "GOOGLE_REDIRECT_URI",
                  ].map((item) => (
                    <li key={item} className="rounded-lg border border-slate-800 bg-slate-900/60 px-2 py-1.5">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : null}


      <GlassCard title="Content Engine" right="frontend-first • clone-ready for SBO add-on">
        <div className="grid xl:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold text-slate-100">Content Queue</div>
              <StatusPill tone="cyan">Demo Queue</StatusPill>
            </div>
            <div className="mt-3 space-y-2">
              {contentQueue.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-2">
                  <div className="text-sm text-slate-100 font-semibold">{item.title}</div>
                  <div className="mt-1">
                    <StatusPill tone={toneFromStatus(item.status)}>{item.status}</StatusPill>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4 xl:col-span-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div className="font-semibold text-slate-100">AI Post Generator</div>
                <div className="text-xs text-slate-400 mt-1">Promptless starter actions for social + review growth.</div>
              </div>
              <button
                type="button"
                className="h-8 px-3 rounded-2xl text-xs border border-cyan-500/35 bg-cyan-500/10 text-cyan-100"
              >
                Clone for SBO Add-On
              </button>
            </div>
            <div className="mt-3 grid sm:grid-cols-2 xl:grid-cols-4 gap-2">
              {aiPostPresets.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  className="h-9 px-3 rounded-xl text-xs border border-slate-800 bg-slate-950/70 hover:bg-slate-900/50 text-slate-200 text-left"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="mt-3 grid md:grid-cols-3 gap-2">
              {aiGeneratedPreviews.map((card) => (
                <div key={card.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <div className="text-sm text-slate-100 font-semibold">{card.title}</div>
                  <div className="mt-1 text-xs text-slate-300">{card.body}</div>
                  <div className="mt-2 text-[11px] text-slate-500">{card.channel}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
            <div className="font-semibold text-slate-100">Calendar-lite publishing view</div>
            <div className="text-xs text-slate-400 mt-1">Weekly strip with Mon/Wed/Fri cadence.</div>
            <div className="mt-3 grid grid-cols-7 gap-2 text-center text-xs">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="rounded-xl border border-slate-800 bg-slate-950/70 p-2">
                  <div className="text-slate-300">{d}</div>
                  {["Mon", "Wed", "Fri"].includes(d) ? (
                    <div className="mt-2"><StatusPill tone="purple">Post</StatusPill></div>
                  ) : (
                    <div className="mt-2 text-slate-600">—</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4 flex flex-col justify-between">
            <div>
              <div className="font-semibold text-slate-100">Create from Ticket</div>
              <div className="text-sm text-slate-300 mt-2">
                Convert completed service ticket into social post.
              </div>
              <div className="text-xs text-slate-500 mt-1">Frontend-only mock CTA for content automation pipeline.</div>
            </div>
            <div className="mt-4">
              <button
                type="button"
                className="h-9 px-3 rounded-2xl text-xs border border-emerald-500/35 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-100"
              >
                Convert completed service ticket into social post
              </button>
            </div>
          </div>
        </div>
      </GlassCard>


      <div className="grid xl:grid-cols-3 gap-4">
        <GlassCard title="Campaigns" right="read-only">
          <div className="space-y-3">
            {campaigns.map((c, idx) => (
              <div key={c.id || c.campaign_id || idx} className="rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-slate-100 truncate">{c.name || c.title || `Campaign #${c.id || idx + 1}`}</div>
                  <StatusPill tone={toneFromStatus(c.status)}>{c.status || "Unknown"}</StatusPill>
                </div>
                <div className="mt-2 text-xs text-slate-400">
                  Channel: {c.channel || c.source || "—"} • Reach: {c.reach ?? c.audience_size ?? "—"}
                </div>
              </div>
            ))}
            {!campaigns.length ? <div className="text-slate-500 text-sm">No campaigns available.</div> : null}
          </div>
        </GlassCard>

        <GlassCard title="Conversation inbox preview" right="read-only">
          <div className="space-y-3">
            {conversations.map((cv, idx) => (
              <div key={cv.id || cv.thread_id || idx} className="rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-slate-100 truncate">{cv.subject || cv.lead_name || cv.contact || `Conversation #${cv.id || idx + 1}`}</div>
                  <StatusPill tone={toneFromStatus(cv.status)}>{cv.status || "Open"}</StatusPill>
                </div>
                <div className="mt-2 text-xs text-slate-400 truncate">{cv.preview || cv.last_message || cv.snippet || "No preview available."}</div>
                <div className="mt-1 text-[11px] text-slate-500">Last activity: {fmtDateTime(cv.last_activity_at || cv.updated_at || cv.created_at)}</div>
              </div>
            ))}
            {!conversations.length ? <div className="text-slate-500 text-sm">No conversations available.</div> : null}
          </div>
        </GlassCard>

        <GlassCard title="Automation events" right="activity feed">
          <div className="space-y-3">
            {activityFeed.map((ev, idx) => (
              <div key={ev.id || `${ev.type || "event"}-${idx}`} className="rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-slate-100">{ev.title || ev.type || "Automation Event"}</div>
                  <StatusPill tone={toneFromStatus(ev.status || ev.level)}>{ev.status || ev.level || "Info"}</StatusPill>
                </div>
                <div className="mt-1 text-xs text-slate-400">{ev.description || ev.message || "No description provided."}</div>
                <div className="mt-1 text-[11px] text-slate-500">{fmtDateTime(ev.created_at || ev.timestamp || ev.occurred_at)}</div>
              </div>
            ))}
            {!activityFeed.length ? <div className="text-slate-500 text-sm">No automation events available.</div> : null}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
