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

export default function PlatformGrowthEngineTab() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [updateErr, setUpdateErr] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [busyLeadIds, setBusyLeadIds] = useState({});

  const [dashboard, setDashboard] = useState({});
  const [leads, setLeads] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [conversations, setConversations] = useState([]);
  const EDITABLE_STATUSES = ["NEW", "QUALIFIED", "NURTURING", "WON", "LOST"];

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
    const discovered = Array.from(
      new Set(
        leads
          .map((l) => String(l.status || l.stage || l.pipeline_stage || "").trim().toUpperCase())
          .filter(Boolean)
      )
    );

    const ordered = [...known.filter((x) => discovered.includes(x)), ...discovered.filter((x) => !known.includes(x))];
    return ["ALL", ...ordered];
  }, [leads]);

  const pipelineGroups = useMemo(() => {
    const map = new Map();

    (leads || []).forEach((lead) => {
      const bucket = String(lead.status || lead.stage || lead.pipeline_stage || "UNSPECIFIED").toUpperCase();
      if (statusFilter !== "ALL" && bucket !== statusFilter) return;
      if (!map.has(bucket)) map.set(bucket, []);
      map.get(bucket).push(lead);
    });

    return Array.from(map.entries())
      .map(([key, items]) => ({ key, items }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [leads, statusFilter]);

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

      <GlassCard title="Lead pipeline" right="read-only">
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

        <div className="mt-4 grid xl:grid-cols-2 gap-3">
          {pipelineGroups.map((group) => (
            <div key={group.key} className="rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold text-slate-100">{group.key}</div>
                <StatusPill tone={toneFromStatus(group.key)}>{group.items.length}</StatusPill>
              </div>

              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-xs uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="text-left py-2 pr-3">Lead</th>
                      <th className="text-left py-2 pr-3">Source</th>
                      <th className="text-left py-2 pr-3">Stage</th>
                      <th className="text-left py-2 pr-3">Last Activity</th>
                      <th className="text-left py-2 pr-3">Update</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((l, idx) => (
                      <tr key={l.id || l.lead_id || l.email || `${group.key}-${idx}`} className="border-t border-slate-800">
                        <td className="py-2 pr-3">
                          <div className="font-semibold text-slate-100">{l.name || l.full_name || l.email || `Lead #${l.id || idx + 1}`}</div>
                          {l.email ? <div className="text-xs text-slate-500">{l.email}</div> : null}
                        </td>
                        <td className="py-2 pr-3 text-slate-300">{l.source || l.channel || "—"}</td>
                        <td className="py-2 pr-3 text-slate-300">{l.stage || l.pipeline_stage || l.status || "—"}</td>
                        <td className="py-2 pr-3 text-slate-400">{fmtDateTime(l.last_activity_at || l.updated_at || l.created_at)}</td>
                        <td className="py-2 pr-3">
                          {(() => {
                            const current = String(l.status || "").toUpperCase();
                            const selectValue = EDITABLE_STATUSES.includes(current) ? current : "NEW";
                            return (
                          <select
                            value={selectValue}
                            disabled={!!busyLeadIds[String(l.id || l.lead_id)]}
                            onChange={(e) => patchLeadStatus(l, e.target.value)}
                            className="w-full max-w-[160px] rounded-xl border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 disabled:opacity-60"
                          >
                            {EDITABLE_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                            );
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {!leads.length ? <div className="text-slate-500 text-sm py-2">No leads available.</div> : null}
        {!!leads.length && !pipelineGroups.length ? (
          <div className="text-slate-500 text-sm py-2">No leads for selected status.</div>
        ) : null}
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