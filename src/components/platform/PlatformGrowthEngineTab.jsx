import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import { CHANNELS, DEMO_LEADS, EDITABLE_STATUSES } from "./growth/growthData";
import { cx, fmtDateTime, normalizeSource, safeList, sourceTone, toneFromStatus } from "./growth/growthUtils";
import GrowthKpiGrid from "./growth/GrowthKpiGrid";
import AcquisitionFunnel from "./growth/AcquisitionFunnel";
import GrowthConnectChannelsCard from "./growth/GrowthConnectChannelsCard";
import GrowthConnectChannelsDrawer from "./growth/GrowthConnectChannelsDrawer";
import GrowthAutomationRecipesCard from "./growth/GrowthAutomationRecipesCard";
import GrowthLeadPipelineCard from "./growth/GrowthLeadPipelineCard";
import GrowthContentEngineCard from "./growth/GrowthContentEngineCard";

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

  const kpis = useMemo(() => {
    const d = dashboard || {};
    return {
      leadsCaptured: d.leads_captured ?? d.leads_total ?? d.kpis?.leads_captured ?? d.summary?.leads_captured,
      conversationsActive: d.conversations_active ?? d.active_conversations ?? d.kpis?.conversations_active ?? d.summary?.conversations_active,
      campaignsLive: d.campaigns_live ?? d.active_campaigns ?? d.kpis?.campaigns_live ?? d.summary?.campaigns_live,
      activationEvents: d.activation_events ?? d.activation_events_count ?? d.kpis?.activation_events ?? d.summary?.activation_events,
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
      const connected = ch.alwaysAvailable ? true : !!backend[ch.key] || !!backend[ch.name] || !!backend[ch.name?.toLowerCase?.()];
      map[ch.key] = { ...ch, connected };
    });
    return map;
  }, [dashboard]);

  const channelListFiltered = useMemo(() => {
    const q = channelQuery.toLowerCase().trim();
    const list = Object.values(channelStateMap);
    if (!q) return list;
    return list.filter((c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.short.toLowerCase().includes(q));
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
      { id: "r1", name: "New lead follow-up", summary: "Auto-send first touch and reminders.", status: "ACTIVE", audience: "Platform + future SBO add-on" },
      { id: "r2", name: "Review request", summary: "Send post-service review asks.", status: "DRAFT", audience: "Platform + future SBO add-on" },
      { id: "r3", name: "Win-back campaign", summary: "Re-engage cooled leads.", status: "DRAFT", audience: "Platform + future SBO add-on" },
      { id: "r4", name: "Comment-to-DM responder", summary: "Route CTA comments to DM flow.", status: "ACTIVE", audience: "Platform + future SBO add-on" },
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
      { key: "promo", label: "Generate Promo Post" },
      { key: "review", label: "Generate Review Ask" },
      { key: "educational", label: "Generate Educational Post" },
      { key: "before_after", label: "Generate Before/After Post" },
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

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-800 bg-slate-950/35 p-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-sm font-semibold text-slate-100">Growth OS</div>
          <div className="text-xs text-slate-500 mt-1">Read-only growth intelligence across leads, campaigns, conversations, and activations.</div>
        </div>
        <button type="button" onClick={loadAll} className="h-9 px-3 rounded-2xl text-xs border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40 text-slate-200">Refresh</button>
      </div>

      {err ? <div className="text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-2xl p-3">{err}</div> : null}
      {updateErr ? <div className="text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-2xl p-3">{updateErr}</div> : null}
      {loading ? <div className="text-sm text-slate-400">Loading Growth OS…</div> : null}

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

      <GrowthAutomationRecipesCard recipeCards={recipeCards} />

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

      <GrowthContentEngineCard
        contentQueue={contentQueue}
        aiPostPresets={aiPostPresets}
        aiGeneratedPreviews={aiGeneratedPreviews}
        toneFromStatus={toneFromStatus}
      />

      <div className="grid xl:grid-cols-3 gap-4">
        <GlassCard title="Campaigns" right="read-only">
          <div className="space-y-3">
            {campaigns.map((c, idx) => (
              <div key={c.id || idx} className="rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-slate-100 truncate">{c.name || `Campaign #${idx + 1}`}</div>
                  <StatusPill tone={toneFromStatus(c.status)}>{c.status || "Unknown"}</StatusPill>
                </div>
                <div className="mt-2 text-xs text-slate-400">Channel: {c.channel || "—"} • Reach: {c.reach ?? "—"}</div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard title="Conversation inbox preview" right="read-only">
          <div className="space-y-3">
            {conversations.map((cv, idx) => (
              <div key={cv.id || idx} className="rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-slate-100 truncate">{cv.subject || `Conversation #${idx + 1}`}</div>
                  <StatusPill tone={toneFromStatus(cv.status)}>{cv.status || "Open"}</StatusPill>
                </div>
                <div className="mt-2 text-xs text-slate-400 truncate">{cv.preview || "No preview available."}</div>
                <div className="mt-1 text-[11px] text-slate-500">Last activity: {fmtDateTime(cv.updated_at || cv.created_at)}</div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard title="Automation events" right="activity feed">
          <div className="space-y-3">
            {activityFeed.map((ev, idx) => (
              <div key={ev.id || idx} className="rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-slate-100">{ev.title || "Automation Event"}</div>
                  <StatusPill tone={toneFromStatus(ev.status || ev.level)}>{ev.status || ev.level || "Info"}</StatusPill>
                </div>
                <div className="mt-1 text-xs text-slate-400">{ev.description || ev.message || "No description provided."}</div>
                <div className="mt-1 text-[11px] text-slate-500">{fmtDateTime(ev.created_at || ev.timestamp)}</div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}