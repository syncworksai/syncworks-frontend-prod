import React, { Suspense, useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import { CHANNELS, DEMO_LEADS, EDITABLE_STATUSES } from "./growth/growthData";
import { cx, fmtDateTime, normalizeSource, safeList, sourceTone, toneFromStatus } from "./growth/growthUtils";

import GrowthKpiGrid from "./growth/GrowthKpiGrid";
import AcquisitionFunnel from "./growth/AcquisitionFunnel";
import GrowthConnectChannelsCard from "./growth/GrowthConnectChannelsCard";

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

  const [dashboard, setDashboard] = useState({});
  const [leads, setLeads] = useState([]);
  const [demoLeads, setDemoLeads] = useState(DEMO_LEADS);
  const [campaigns, setCampaigns] = useState([]);
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setErr("");
    setUpdateErr("");

    try {
      const [rDashboard, rLeads, rCampaigns, rConversations] = await Promise.all([
        api.get("/platform-growth/dashboard/").catch(() => ({})),
        api.get("/platform-growth/leads/").catch(() => ({})),
        api.get("/platform-growth/campaigns/").catch(() => ({})),
        api.get("/platform-growth/conversations/").catch(() => ({})),
      ]);

      setDashboard(rDashboard?.data || {});
      setLeads(safeList(rLeads?.data));
      setCampaigns(safeList(rCampaigns?.data));
      setConversations(safeList(rConversations?.data));
    } catch (e) {
      setErr("Failed to load Growth OS.");
    } finally {
      setLoading(false);
    }
  }

  const isDemoMode = leads.length === 0;

  const kpis = useMemo(() => dashboard || {}, [dashboard]);
  const activityFeed = useMemo(() => safeList(dashboard?.events), [dashboard]);

  return (
    <div className="space-y-5">

      <GrowthKpiGrid kpis={kpis} />

      <div className="grid md:grid-cols-2 gap-4">

        <GrowthConnectChannelsCard
          channelStateMap={CHANNELS}
          getChannelStatus={() => "CONNECTED"}
          getChannelLabel={() => "Connected"}
          toneFromStatus={toneFromStatus}
          setConnectModalOpen={setConnectModalOpen}
          isDemoMode={isDemoMode}
        />

        <GlassCard title="Acquisition funnel">
          <AcquisitionFunnel funnel={{}} />
        </GlassCard>

      </div>

      <Suspense fallback={<div className="text-sm text-slate-400">Loading...</div>}>
        <GrowthAutomationRecipesCard recipeCards={[]} />
      </Suspense>

      <Suspense fallback={<div className="text-sm text-slate-400">Loading...</div>}>
        <GrowthLeadPipelineCard pipelineGroups={[]} leadStatuses={[]} />
      </Suspense>

      <Suspense fallback={<div className="text-sm text-slate-400">Loading...</div>}>
        <GrowthConnectChannelsDrawer
          connectModalOpen={connectModalOpen}
          setConnectModalOpen={setConnectModalOpen}
        />
      </Suspense>

      <Suspense fallback={<div className="text-sm text-slate-400">Loading...</div>}>
        <GrowthContentEngineCard
          contentQueue={[]}
          aiPostPresets={[]}
          aiGeneratedPreviews={[]}
          toneFromStatus={toneFromStatus}
        />
      </Suspense>

      <Suspense fallback={<div className="text-sm text-slate-400">Loading...</div>}>
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