import React, { Suspense, useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import { CHANNELS, DEMO_LEADS, EDITABLE_STATUSES } from "./growth/growthData";
import { cx, fmtDateTime, normalizeSource, safeList, sourceTone, toneFromStatus } from "./growth/growthUtils";
import GrowthKpiGrid from "./growth/GrowthKpiGrid";
import AcquisitionFunnel from "./growth/AcquisitionFunnel";
import GrowthConnectChannelsCard from "./growth/GrowthConnectChannelsCard";
import GrowthAutomationControlCard from "./growth/GrowthAutomationControlCard";
import GrowthOnboardingWizard from "./growth/GrowthOnboardingWizard";

const GrowthConnectChannelsDrawer = React.lazy(() => import("./growth/GrowthConnectChannelsDrawer"));
const GrowthAutomationRecipesCard = React.lazy(() => import("./growth/GrowthAutomationRecipesCard"));
const GrowthLeadPipelineCard = React.lazy(() => import("./growth/GrowthLeadPipelineCard"));
const GrowthContentEngineCard = React.lazy(() => import("./growth/GrowthContentEngineCard"));
const GrowthSummaryCards = React.lazy(() => import("./growth/GrowthSummaryCards"));

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

export default function PlatformGrowthEngineTab() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [updateErr, setUpdateErr] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [busyLeadIds, setBusyLeadIds] = useState({});
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [channelSetupPending, setChannelSetupPending] = useState({});
  const [channelQuery, setChannelQuery] = useState("");
  const [drawerTab, setDrawerTab] = useState("connect_accounts");
  const [showSetupPreview, setShowSetupPreview] = useState(true);
  const [setupMessage, setSetupMessage] = useState("");
  const [contentEngineKey, setContentEngineKey] = useState(0);

  const [dashboard, setDashboard] = useState({});
  const [leads, setLeads] = useState([]);
  const [demoLeads, setDemoLeads] = useState(DEMO_LEADS);
  const [campaigns, setCampaigns] = useState([]);
  const [conversations, setConversations] = useState([]);

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

      if (!anySuccess) throw new Error("Growth OS endpoints unavailable.");

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
    } catch {}
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

  async function createStarterFromPlatformGuide(preset) {
    setSetupMessage("");
    setUpdateErr("");

    try {
      const res = await api.post("/platform-growth/growth/drafts/starter/", {
        starter_type: preset?.key || "lead_follow_up",
      });

      setSetupMessage(`God Mode preview draft created: ${res?.data?.title || preset?.label || "Starter draft"}`);
      setContentEngineKey((x) => x + 1);
      await loadAll();
    } catch (e) {
      setUpdateErr(e?.response?.data?.detail || "Failed to create preview starter draft.");
    }
  }

  const kpis = useMemo(() => {
    const d = dashboard || {};
    return {
      leadsCaptured: d.leads_captured ?? d.leads_total ?? d.kpis?.leads_captured ?? d.summary?.leads_captured,
      conversationsActive:
        d.conversations_active ??
        d.active_conversations ??
        d.kpis?.conversations_active ??
        d.summary?.conversations_active,
      campaignsLive: d.campaigns_live ?? d.active_campaigns ?? d.kpis?.campaigns_live ?? d.summary?.campaigns_live,
      activationEvents:
        d.activation_events ??
        d.activation_events_count ??
        d.kpis?.activation_events ??
        d.summary?.activation_events,
      conversionPlaceholder: d.conversion_rate ?? d.kpis?.conversion_rate ?? d.summary?.conversion_rate ?? "—",
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
    return [];
  }, [dashboard]);

  const leadStatuses = useMemo(() => {
    const source = (leads || []).length ? leads : demoLeads;
    const found = Array.from(new Set(source.map((l) => String(l.status || l.stage || "NEW").toUpperCase())));
    return ["ALL", ...found];
  }, [leads, demoLeads]);

  const displayLeads = useMemo(() => ((leads || []).length ? leads : demoLeads), [leads, demoLeads]);
  const isDemoMode = useMemo(() => (leads || []).length === 0, [leads]);

  const enrichedLeads = useMemo(
    () =>
      (displayLeads || []).map((l, idx) => ({
        ...l,
        source: normalizeSource(
          l.source ||
            l.channel ||
            (isDemoMode
              ? ["Facebook Ads", "Instagram", "Google", "Referral", "Website", "Manual"][idx % 6]
              : "Manual")
        ),
      })),
    [displayLeads, isDemoMode]
  );

  const pipelineGroups = useMemo(() => {
    const map = new Map();

    enrichedLeads.forEach((lead) => {
      const bucket = String(lead.status || lead.stage || "UNSPECIFIED").toUpperCase();
      if (statusFilter !== "ALL" && bucket !== statusFilter) return;
      if (!map.has(bucket)) map.set(bucket, []);
      map.get(bucket).push(lead);
    });

    return EDITABLE_STATUSES.map((key) => ({ key, items: map.get(key) || [] }));
  }, [enrichedLeads, statusFilter]);

  const channelStateMap = useMemo(() => {
    const backend = dashboard?.channel_connections || {};
    const map = {};

    CHANNELS.forEach((ch) => {
      const connected =
        ch.alwaysAvailable ||
        !!backend[ch.key] ||
        !!backend[ch.name] ||
        !!backend[ch.name?.toLowerCase?.()];

      map[ch.key] = { ...ch, connected };
    });

    return map;
  }, [dashboard]);

  const channelListFiltered = useMemo(() => {
    const q = channelQuery.toLowerCase().trim();
    const list = Object.values(channelStateMap);

    if (!q) return list;

    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.short.toLowerCase().includes(q)
    );
  }, [channelStateMap, channelQuery]);

  function getChannelStatus(channel) {
    if (channel.planned) return "PLANNED";
    if (channelSetupPending[channel.key]) return "SETUP_PENDING";
    if (channel.connected) return "CONNECTED";
    return "NOT_CONNECTED";
  }

  function getChannelLabel(status) {
    if (status === "PLANNED") return "Planned";
    if (status === "SETUP_PENDING") return "Setup Pending";
    if (status === "CONNECTED") return "Connected";
    return "Not Connected";
  }

  function handleConnectChannel(channel) {
    if (channel.planned || channel.alwaysAvailable) return;
    setChannelSetupPending((prev) => ({ ...prev, [channel.key]: true }));
  }

  const accountHealthRows = useMemo(
    () =>
      Object.values(channelStateMap).map((c, idx) => {
        const status = getChannelStatus(c);
        const connected = status === "CONNECTED";
        const token = c.planned ? "N/A" : connected ? (idx % 4 === 0 ? "WARN" : "HEALTHY") : "MISSING";
        const lastRun = connected ? `${idx + 1}h ago` : "—";
        const needsAttention = status === "SETUP_PENDING" || token === "WARN" || token === "MISSING";

        return { ...c, status, token, lastRun, needsAttention };
      }),
    [channelStateMap, channelSetupPending]
  );

  const funnel = useMemo(() => {
    const byStatus = (enrichedLeads || []).reduce((acc, l) => {
      const key = String(l.status || "").toUpperCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return {
      captured: Number(dashboard?.funnel?.captured ?? enrichedLeads.length ?? 0),
      qualified: Number(dashboard?.funnel?.qualified ?? byStatus.QUALIFIED ?? 0),
      activated: Number(dashboard?.funnel?.activated ?? byStatus.WON ?? 0),
      paying: Number(dashboard?.funnel?.paying ?? 0),
      referred: Number(dashboard?.funnel?.referred ?? 0),
    };
  }, [dashboard, enrichedLeads]);

  const recipeCards = useMemo(
    () => [
      {
        id: "r1",
        name: "New lead follow-up",
        summary: "Auto-send first touch and reminders.",
        status: "ACTIVE",
        audience: "Platform + SBO Growth OS",
      },
      {
        id: "r2",
        name: "Review request",
        summary: "Send post-service review asks.",
        status: "DRAFT",
        audience: "Platform + SBO Growth OS",
      },
      {
        id: "r3",
        name: "Win-back campaign",
        summary: "Re-engage cooled leads.",
        status: "DRAFT",
        audience: "Platform + SBO Growth OS",
      },
      {
        id: "r4",
        name: "Comment-to-DM responder",
        summary: "Route CTA comments to DM flow.",
        status: "ACTIVE",
        audience: "Platform + SBO Growth OS",
      },
    ],
    []
  );

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
      { key: "lead_follow_up", label: "Start Lead Follow-Up" },
      { key: "review_request", label: "Start Review Request" },
      { key: "weekly_tip", label: "Start Weekly Service Tip" },
      { key: "promo", label: "Start Promo Post" },
    ],
    []
  );

  const aiGeneratedPreviews = useMemo(
    () => [
      { id: "gp-1", title: "Promo Draft", body: "Spring tune-up special is live.", channel: "Facebook + Instagram" },
      { id: "gp-2", title: "Review Ask Draft", body: "If we earned it, leave us a quick review.", channel: "Google Business + Email" },
      { id: "gp-3", title: "Educational Draft", body: "3 signs your HVAC needs service.", channel: "Instagram Reel + Blog Snippet" },
    ],
    []
  );

  const suspenseFallback = <div className="text-sm text-slate-400">Loading...</div>;

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-800 bg-slate-950/35 p-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-sm font-semibold text-slate-100">Growth OS</div>
          <div className="text-xs text-slate-500 mt-1">
            God Mode growth intelligence across leads, campaigns, conversations, activations, and SBO setup readiness.
          </div>
        </div>

        <button
          type="button"
          onClick={loadAll}
          className="h-9 px-3 rounded-2xl text-xs border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40 text-slate-200"
        >
          Refresh
        </button>
      </div>

      {setupMessage ? (
        <div className="text-sm text-emerald-200 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3">
          {setupMessage}
        </div>
      ) : null}

      {err ? <div className="text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-2xl p-3">{err}</div> : null}
      {updateErr ? <div className="text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-2xl p-3">{updateErr}</div> : null}
      {loading ? <div className="text-sm text-slate-400">Loading Growth OS…</div> : null}

      {showSetupPreview ? (
        <GrowthOnboardingWizard
          variant="platform"
          onCreateStarter={createStarterFromPlatformGuide}
          onOpenChannels={() => setConnectModalOpen(true)}
          onSkip={() => setShowSetupPreview(false)}
        />
      ) : (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowSetupPreview(true)}
            className="rounded-2xl border border-cyan-500/35 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-500/15"
          >
            Show SBO setup preview
          </button>
        </div>
      )}

      <GrowthKpiGrid kpis={kpis} />

      <div className="grid md:grid-cols-2 gap-4">
        <GrowthConnectChannelsCard
          channelStateMap={channelStateMap}
          getChannelStatus={getChannelStatus}
          getChannelLabel={getChannelLabel}
          toneFromStatus={toneFromStatus}
          setConnectModalOpen={setConnectModalOpen}
          isDemoMode={isDemoMode}
        />

        <GlassCard title="Acquisition funnel" right="captured → referred">
          <AcquisitionFunnel funnel={funnel} />
        </GlassCard>
      </div>

      <GrowthAutomationControlCard />

      <Suspense fallback={suspenseFallback}>
        <GrowthAutomationRecipesCard recipeCards={recipeCards} />
      </Suspense>

      <Suspense fallback={suspenseFallback}>
        <GrowthLeadPipelineCard
          pipelineGroups={pipelineGroups}
          leadStatuses={leadStatuses}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          patchLeadStatus={patchLeadStatus}
          busyLeadIds={busyLeadIds}
          isDemoMode={isDemoMode}
          cx={cx}
          toneFromStatus={toneFromStatus}
          sourceTone={sourceTone}
          fmtDateTime={fmtDateTime}
        />
      </Suspense>

      <Suspense fallback={suspenseFallback}>
        <GrowthConnectChannelsDrawer
          connectModalOpen={connectModalOpen}
          setConnectModalOpen={setConnectModalOpen}
          drawerTab={drawerTab}
          setDrawerTab={setDrawerTab}
          channelQuery={channelQuery}
          setChannelQuery={setChannelQuery}
          channelListFiltered={channelListFiltered}
          getChannelStatus={getChannelStatus}
          getChannelLabel={getChannelLabel}
          toneFromStatus={toneFromStatus}
          handleConnectChannel={handleConnectChannel}
          recipeCards={recipeCards}
          accountHealthRows={accountHealthRows}
          cx={cx}
        />
      </Suspense>

      <Suspense fallback={suspenseFallback}>
        <GrowthContentEngineCard
          key={contentEngineKey}
          contentQueue={contentQueue}
          aiPostPresets={aiPostPresets}
          aiGeneratedPreviews={aiGeneratedPreviews}
          toneFromStatus={toneFromStatus}
        />
      </Suspense>

      <Suspense fallback={suspenseFallback}>
        <GrowthSummaryCards
          campaigns={campaigns}
          conversations={conversations}
          activityFeed={activityFeed}
          fmtDateTime={fmtDateTime}
          toneFromStatus={toneFromStatus}
        />
      </Suspense>
    </div>
  );
}