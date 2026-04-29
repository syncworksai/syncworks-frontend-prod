import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AtSign,
  Building2,
  Camera,
  Clapperboard,
  Hash,
  Mail,
  MessageSquare,
  PlayCircle,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
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
  if (["ACTIVE", "LIVE", "OPEN", "RUNNING", "CONNECTED", "PUBLISHED", "HEALTHY"].includes(s)) return "emerald";
  if (["NEW", "PENDING", "QUEUED", "WARM", "SCHEDULED"].includes(s)) return "cyan";
  if (["PAUSED", "WAITING", "IDLE", "DRAFT", "PLANNED", "WARN"].includes(s)) return "amber";
  if (["FAILED", "ERROR", "BLOCKED", "DROPPED", "LOST", "EXPIRED", "MISSING"].includes(s)) return "rose";
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

function ChannelBadge({ channel }) {
  const iconClass = "w-3.5 h-3.5";
  const icons = {
    facebook: <Users className={iconClass} />,
    instagram: <Camera className={iconClass} />,
    google_business: <Building2 className={iconClass} />,
    youtube: <PlayCircle className={iconClass} />,
    tiktok: <Clapperboard className={iconClass} />,
    x: <AtSign className={iconClass} />,
    linkedin: <Users className={iconClass} />,
    pinterest: <Hash className={iconClass} />,
    snapchat: <Camera className={iconClass} />,
    nextdoor: <Building2 className={iconClass} />,
    truth_social: <MessageSquare className={iconClass} />,
    threads: <AtSign className={iconClass} />,
    email: <Mail className={iconClass} />,
    sms_twilio_planned: <MessageSquare className={iconClass} />,
  };
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] text-slate-200 border-slate-600/40 bg-slate-600/10">
      {icons[channel.key] || <Hash className={iconClass} />}
      {channel.short}
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
  const [demoLeads, setDemoLeads] = useState([
    { id: "demo-1", name: "Roofing Lead", source: "Organic", status: "NEW", stage: "NEW" },
    { id: "demo-2", name: "HVAC Commercial Prospect", source: "Paid Search", status: "QUALIFIED", stage: "QUALIFIED" },
    { id: "demo-3", name: "Property Mgmt Referral", source: "Referral", status: "NURTURING", stage: "NURTURING" },
    { id: "demo-4", name: "Plumbing Contract", source: "Outbound", status: "WON", stage: "WON" },
  ]);
  const [campaigns, setCampaigns] = useState([]);
  const [conversations, setConversations] = useState([]);
  const EDITABLE_STATUSES = ["NEW", "QUALIFIED", "NURTURING", "WON", "LOST"];

  const CHANNELS = useMemo(
    () => [
      { key: "facebook", name: "Facebook", short: "FB", description: "Run lead-ad follow-up and comment capture automations.", oauth: true },
      { key: "instagram", name: "Instagram", short: "IG", description: "Trigger DM responders and nurture sequences from engagement.", oauth: true },
      { key: "google_business", name: "Google Business", short: "GB", description: "Capture local-intent leads and automate review nudges.", oauth: true },
      { key: "youtube", name: "YouTube", short: "YT", description: "Publish video snippets and route CTA traffic into SyncWorks.", oauth: true },
      { key: "tiktok", name: "TikTok", short: "TT", description: "Queue short-form campaign clips and track inquiry volume.", oauth: true },
      { key: "x", name: "X", short: "X", description: "Publish timely updates and drive reply/DM engagement flows.", oauth: true },
      { key: "linkedin", name: "LinkedIn", short: "LI", description: "Share trust-building posts for B2B and property management audiences.", oauth: true },
      { key: "pinterest", name: "Pinterest", short: "P", description: "Distribute evergreen visual content and drive site intent traffic.", oauth: true },
      { key: "snapchat", name: "Snapchat", short: "SC", description: "Test geo-targeted story creative and short-lifecycle promotions.", oauth: true },
      { key: "nextdoor", name: "Nextdoor", short: "ND", description: "Reach neighborhood audiences for local service visibility.", oauth: true },
      { key: "truth_social", name: "Truth Social", short: "TS", description: "Publish brand-safe updates and monitor audience interactions.", oauth: true },
      { key: "threads", name: "Threads", short: "TH", description: "Post conversational updates and route responses to nurture flows.", oauth: true },
      { key: "email", name: "Email", short: "EM", description: "Available now: manual/free channel for lifecycle follow-up.", oauth: false, alwaysAvailable: true },
      { key: "sms_twilio_planned", name: "SMS / Twilio planned", short: "SMS", description: "Planned: SMS/Twilio disabled until compliance/legal setup is approved.", oauth: false, planned: true },
    ],
    []
  );

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
  }, [dashboard, CHANNELS]);

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

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <KpiCard label="Leads captured" value={kpis.leadsCaptured} />
        <KpiCard label="Conversations active" value={kpis.conversationsActive} />
        <KpiCard label="Campaigns live" value={kpis.campaignsLive} />
        <KpiCard label="Activation events" value={kpis.activationEvents} />
        <KpiCard label="Conversion" value={kpis.conversionPlaceholder} hint="Placeholder until conversion model ships" />
        <KpiCard label="Growth score" value={kpis.growthScore} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <GlassCard title="Connect Channels" right={isDemoMode ? "demo seed + expanded coverage" : "live + expanded coverage"}>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2">
            {Object.values(channelStateMap).map((c) => {
              const status = getChannelStatus(c);
              return (
                <div key={c.key} className="rounded-xl border border-slate-800 bg-slate-950/55 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ChannelBadge channel={c} />
                      <div className="text-sm text-slate-200">{c.name}</div>
                    </div>
                    <StatusPill tone={toneFromStatus(status)}>{getChannelLabel(status)}</StatusPill>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex justify-end">
            <button type="button" onClick={() => setConnectModalOpen(true)} className="h-9 px-3 rounded-2xl text-xs border border-cyan-500/35 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-100">
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
                <button type="button" className="h-8 px-3 rounded-2xl text-xs border border-slate-800 bg-slate-950/70 text-slate-300">View recipe</button>
                <button type="button" className="h-8 px-3 rounded-2xl text-xs border border-cyan-500/30 bg-cyan-500/10 text-cyan-100">Clone for SBO</button>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard title="Lead pipeline" right={isDemoMode ? "demo mode • read-only backend" : "live mode"}>
        <div className="flex flex-wrap gap-2">
          {leadStatuses.map((s) => (
            <button key={s} type="button" onClick={() => setStatusFilter(s)} className={cx("h-8 px-3 rounded-2xl text-xs border transition", statusFilter === s ? "border-cyan-500/35 bg-cyan-500/15 text-cyan-100" : "border-slate-800 bg-slate-950/55 hover:bg-slate-900/50 text-slate-300")}>
              {s}
            </button>
          ))}
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
                    <div key={l.id || l.lead_id || `${group.key}-${idx}`} className="rounded-xl border border-slate-800 bg-slate-950/70 p-2">
                      <div className="font-semibold text-sm text-slate-100">{l.name || l.email || `Lead #${idx + 1}`}</div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        <StatusPill tone={sourceTone(l.source)}>{l.source || "Manual"}</StatusPill> • Last: {fmtDateTime(l.updated_at || l.created_at)}
                      </div>
                      <div className="mt-2">
                        <select value={selectValue} disabled={!isDemoMode && !!busyLeadIds[String(l.id || l.lead_id)]} onChange={(e) => patchLeadStatus(l, e.target.value)} className="w-full rounded-xl border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-200">
                          {EDITABLE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {connectModalOpen ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConnectModalOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-full max-w-5xl border-l border-slate-800 bg-[#070a12] text-slate-100 shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-100">Connect Channels</div>
                <div className="text-xs text-slate-400 mt-1">God Mode controls now • same engine later powers SBO Growth Automation add-on.</div>
              </div>
              <button type="button" onClick={() => setConnectModalOpen(false)} className="h-9 px-3 rounded-2xl text-xs border border-slate-800 bg-slate-950/60 text-slate-200">Close</button>
            </div>

            <div className="p-4 border-b border-slate-800 flex gap-2">
              {[
                { key: "connect_accounts", label: "Connect Accounts" },
                { key: "automation_recipes", label: "Automation Recipes" },
                { key: "account_health", label: "Account Health" },
              ].map((t) => (
                <button key={t.key} type="button" onClick={() => setDrawerTab(t.key)} className={cx("h-8 px-3 rounded-2xl text-xs border", drawerTab === t.key ? "border-cyan-500/35 bg-cyan-500/15 text-cyan-100" : "border-slate-800 bg-slate-950/60 text-slate-300")}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-4 space-y-4 overflow-y-auto h-[calc(100%-122px)]">
              {drawerTab === "connect_accounts" ? (
                <>
                  <div className="rounded-2xl border border-cyan-500/25 bg-cyan-500/10 p-4">
                    <div className="font-semibold text-cyan-100">How it works</div>
                    <ul className="mt-2 space-y-1 text-sm text-cyan-50/90 list-disc pl-5">
                      <li>Connect a channel</li>
                      <li>Pick automation recipes</li>
                      <li>Capture leads into SyncWorks</li>
                      <li>Follow up automatically</li>
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input value={channelQuery} onChange={(e) => setChannelQuery(e.target.value)} placeholder="Search channels..." className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-800 bg-slate-950 text-sm text-slate-200 placeholder:text-slate-500" />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {channelListFiltered.map((c) => {
                      const status = getChannelStatus(c);
                      const pending = status === "SETUP_PENDING";
                      const planned = status === "PLANNED";
                      const email = c.key === "email";
                      return (
                        <div key={c.key} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2"><ChannelBadge channel={c} /><div className="font-semibold text-slate-100">{c.name}</div></div>
                            <StatusPill tone={toneFromStatus(status)}>{getChannelLabel(status)}</StatusPill>
                          </div>
                          <div className="mt-2 text-sm text-slate-300">{c.description}</div>
                          {pending ? <div className="mt-2 text-xs text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">OAuth credentials required in backend settings before live connection.</div> : null}
                          {planned ? <div className="mt-2 text-xs text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">SMS/Twilio remains disabled until compliance and legal setup is complete.</div> : null}
                          <div className="mt-3">
                            <button type="button" onClick={() => handleConnectChannel(c)} disabled={pending || planned || email} className="h-9 px-3 rounded-2xl text-xs border border-cyan-500/35 bg-cyan-500/10 text-cyan-100 disabled:opacity-60">
                              {pending ? "Setup Pending" : planned ? "Planned" : email ? "Email Available" : "Connect"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : null}

              {drawerTab === "automation_recipes" ? (
                <div className="grid md:grid-cols-2 gap-3">
                  {recipeCards.map((r) => (
                    <div key={r.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-slate-100">{r.name}</div>
                        <StatusPill tone={r.status === "ACTIVE" ? "emerald" : "amber"}>{r.status}</StatusPill>
                      </div>
                      <div className="mt-2 text-sm text-slate-300">{r.summary}</div>
                      <div className="mt-3 flex gap-2">
                        <button type="button" className="h-8 px-3 rounded-2xl text-xs border border-slate-800 bg-slate-950/70 text-slate-300">Preview</button>
                        <button type="button" className="h-8 px-3 rounded-2xl text-xs border border-cyan-500/30 bg-cyan-500/10 text-cyan-100">Clone for SBO</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {drawerTab === "account_health" ? (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="font-semibold text-slate-100">Account Health</div>
                    <div className="text-xs text-slate-400 mt-1">Connected status, mock token health, sync last run, and needs-attention indicators.</div>
                  </div>
                  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {accountHealthRows.map((row) => (
                      <div key={row.key} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2"><ChannelBadge channel={row} /><div className="font-semibold text-slate-100">{row.name}</div></div>
                          <StatusPill tone={toneFromStatus(row.status)}>{getChannelLabel(row.status)}</StatusPill>
                        </div>
                        <div className="mt-3 space-y-1 text-xs text-slate-300">
                          <div className="flex items-center justify-between"><span className="text-slate-400">Token health</span><StatusPill tone={toneFromStatus(row.token)}>{row.token}</StatusPill></div>
                          <div className="flex items-center justify-between"><span className="text-slate-400">Sync last run</span><span>{row.lastRun}</span></div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Needs attention</span>
                            {row.needsAttention ? <StatusPill tone="rose"><Activity className="w-3 h-3 inline mr-1" />Yes</StatusPill> : <StatusPill tone="emerald"><ShieldCheck className="w-3 h-3 inline mr-1" />No</StatusPill>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="font-semibold text-slate-100">Admin setup checklist</div>
                <ul className="mt-2 grid sm:grid-cols-2 gap-2 text-xs text-slate-300">
                  {["META_APP_ID", "META_APP_SECRET", "META_REDIRECT_URI", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI"].map((item) => (
                    <li key={item} className="rounded-lg border border-slate-800 bg-slate-900/60 px-2 py-1.5">{item}</li>
                  ))}
                </ul>
                <div className="mt-3 text-xs text-slate-400">Official OAuth connections require provider credentials and app review where applicable.</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <GlassCard title="Content Engine" right="frontend-first • clone-ready for SBO add-on">
        <div className="grid xl:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
            <div className="flex items-center justify-between gap-2"><div className="font-semibold text-slate-100">Content Queue</div><StatusPill tone="cyan">Demo Queue</StatusPill></div>
            <div className="mt-3 space-y-2">
              {contentQueue.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-2">
                  <div className="text-sm text-slate-100 font-semibold">{item.title}</div>
                  <div className="mt-1"><StatusPill tone={toneFromStatus(item.status)}>{item.status}</StatusPill></div>
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
              <button type="button" className="h-8 px-3 rounded-2xl text-xs border border-cyan-500/35 bg-cyan-500/10 text-cyan-100">Clone for SBO Add-On</button>
            </div>
            <div className="mt-3 grid sm:grid-cols-2 xl:grid-cols-4 gap-2">
              {aiPostPresets.map((preset) => (
                <button key={preset.key} type="button" className="h-9 px-3 rounded-xl text-xs border border-slate-800 bg-slate-950/70 hover:bg-slate-900/50 text-slate-200 text-left">{preset.label}</button>
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
                  {["Mon", "Wed", "Fri"].includes(d) ? <div className="mt-2"><StatusPill tone="purple">Post</StatusPill></div> : <div className="mt-2 text-slate-600">—</div>}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4 flex flex-col justify-between">
            <div>
              <div className="font-semibold text-slate-100">Create from Ticket</div>
              <div className="text-sm text-slate-300 mt-2">Convert completed service ticket into social post.</div>
              <div className="text-xs text-slate-500 mt-1">Frontend-only mock CTA for content automation pipeline.</div>
            </div>
            <div className="mt-4">
              <button type="button" className="h-9 px-3 rounded-2xl text-xs border border-emerald-500/35 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-100">
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