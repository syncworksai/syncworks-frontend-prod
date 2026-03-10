// src/pages/SalesOsDashboard.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/client";
import ModeBar from "../components/ModeBar";
import SalesOsSubNav from "../components/SalesOsSubNav";
import SalesOsTemplatesModal from "../components/SalesOsTemplatesModal";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function Card({ title, subtitle, right, children }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
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

function MiniKpi({ label, value, tone = "slate" }) {
  const toneCls =
    tone === "cyan"
      ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-100"
      : tone === "fuchsia"
      ? "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-100"
      : tone === "emerald"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
      : tone === "amber"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
      : tone === "indigo"
      ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-100"
      : "border-slate-800 bg-slate-950/50 text-slate-100";

  return (
    <div className={cx("rounded-2xl border p-4", toneCls)}>
      <div className="text-[11px] text-slate-300/80">{label}</div>
      <div className="mt-1 text-lg font-extrabold tracking-tight">{value}</div>
    </div>
  );
}

function PillButton({ children, onClick, title, tone = "slate" }) {
  const cls =
    tone === "emerald"
      ? "bg-emerald-500/15 border-emerald-500/35 text-emerald-200"
      : tone === "cyan"
      ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-200"
      : tone === "fuchsia"
      ? "bg-fuchsia-500/15 border-fuchsia-500/35 text-fuchsia-200"
      : "bg-slate-950/60 border-slate-800 text-slate-200";

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cx("rounded-full border px-3 py-2 text-[11px] font-semibold transition hover:brightness-110", cls)}
    >
      {children}
    </button>
  );
}

function fmtLocal(dt) {
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return dt;
  }
}

function readSalesSettings() {
  try {
    const raw = localStorage.getItem("sw_salesos_settings");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** ---------- Robust API probing ---------- */
async function tryFirstOk(urls) {
  let last = null;
  for (const u of urls) {
    try {
      const r = await api.get(u);
      return r;
    } catch (e) {
      const status = e?.response?.status ?? null;
      // 404/405 likely means "route mismatch" — keep probing
      last = { url: u, status, detail: e?.response?.data?.detail || e?.message || "Request failed" };
    }
  }
  const err = new Error(last ? `No working endpoint. Last: ${last.url} (${last.status || "?"})` : "No working endpoint.");
  err._last = last;
  throw err;
}

function buildMetricsCandidates(pipelineId, qs) {
  const pid = encodeURIComponent(String(pipelineId));
  const suffix = qs ? String(qs) : "";
  return [
    `/sales/pipelines/${pid}/metrics/${suffix}`,
    `/sales/pipelines/${pid}/metrics${suffix}`,
    `/sales/pipelines/${pid}/kpis/${suffix}`,
    `/sales/pipelines/${pid}/kpis${suffix}`,
    `/sales/pipelines/${pid}/stats/${suffix}`,
    `/sales/pipelines/${pid}/stats${suffix}`,
    `/sales/dashboard/${pid}/${suffix}`,
  ];
}

function buildLeaderboardCandidates(pipelineId, qs) {
  const pid = encodeURIComponent(String(pipelineId));
  const suffix = qs ? String(qs) : "";
  return [
    `/sales/pipelines/${pid}/leaderboard/${suffix}`,
    `/sales/pipelines/${pid}/leaderboard${suffix}`,
    `/sales/pipelines/${pid}/rankings/${suffix}`,
    `/sales/pipelines/${pid}/rankings${suffix}`,
    `/sales/pipelines/${pid}/top/${suffix}`,
    `/sales/pipelines/${pid}/top${suffix}`,
  ];
}

export default function SalesOsDashboard() {
  const nav = useNavigate();
  const [params] = useSearchParams();

  const [pipelines, setPipelines] = useState([]);
  const [activePipelineId, setActivePipelineId] = useState(params.get("pipeline_id") || "");
  const [metrics, setMetrics] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);

  // ✅ agent filter (agency view)
  const [members, setMembers] = useState([]);
  const [agentFilter, setAgentFilter] = useState("ALL"); // ALL | UNASSIGNED | memberId

  // prospects + stages (for snapshot list)
  const [stages, setStages] = useState([]);
  const [prospects, setProspects] = useState([]);

  // quick calendar
  const [events, setEvents] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingProspects, setLoadingProspects] = useState(false);
  const [err, setErr] = useState("");

  // add-to-calendar modal (fast create)
  const [eventModal, setEventModal] = useState({ open: false, prospect: null });
  const [eventForm, setEventForm] = useState({
    title: "",
    start_at: "",
    end_at: "",
    location: "",
    description: "",
  });
  const [savingEvent, setSavingEvent] = useState(false);

  // templates modal (paperclip)
  const [tplModalOpen, setTplModalOpen] = useState(false);

  const activePipeline = useMemo(() => {
    return pipelines.find((p) => String(p.id) === String(activePipelineId)) || null;
  }, [pipelines, activePipelineId]);

  const locked = Boolean(metrics?.pipeline?.is_locked);

  const stageNameById = useMemo(() => {
    const m = new Map();
    (stages || []).forEach((s) => m.set(String(s.id), s.name));
    return m;
  }, [stages]);

  const agentOptions = useMemo(() => {
    const list = (members || [])
      .filter((m) => m.role === "AGENT" || m.role === "OWNER" || m.role === "MANAGER")
      .map((m) => ({
        id: String(m.id),
        label: m.user_display?.name || m.user_display?.email || `Member #${m.id}`,
        role: m.role,
      }));
    return list;
  }, [members]);

  const assignedParam = useMemo(() => {
    if (agentFilter === "ALL") return "";
    if (agentFilter === "UNASSIGNED") return "UNASSIGNED";
    return String(agentFilter || "");
  }, [agentFilter]);

  const loadPipelines = useCallback(async () => {
    const res = await api.get("/sales/pipelines/me/");
    const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
    setPipelines(list);

    if (!activePipelineId && list.length) {
      setActivePipelineId(String(list[0].id));
    }
  }, [activePipelineId]);

  const loadMembers = useCallback(async (pipelineId) => {
    if (!pipelineId) {
      setMembers([]);
      return;
    }
    try {
      const res = await api.get(`/sales/members/?pipeline_id=${pipelineId}`);
      const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
      const filtered = list.filter((m) => String(m.pipeline_id) === String(pipelineId));
      setMembers(filtered);
    } catch {
      setMembers([]);
    }
  }, []);

  const loadStages = useCallback(async (pipelineId) => {
    if (!pipelineId) {
      setStages([]);
      return;
    }
    try {
      const res = await api.get(`/sales/stages/?pipeline_id=${pipelineId}`);
      const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
      // normalize order field differences
      const normalized = list.map((s) => ({
        ...s,
        order: s.order ?? s.sort_order ?? 0,
      }));
      setStages(normalized.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    } catch {
      setStages([]);
    }
  }, []);

  const buildProspectsUrl = useCallback(
    (pipelineId) => {
      let url = `/sales/prospects/?pipeline_id=${pipelineId}`;
      if (assignedParam && assignedParam !== "UNASSIGNED") {
        url += `&assigned_member_id=${encodeURIComponent(assignedParam)}`;
      }
      if (assignedParam === "UNASSIGNED") {
        url += `&assigned_member_id=`;
      }
      return url;
    },
    [assignedParam]
  );

  const buildEventsUrl = useCallback(
    (pipelineId, startIso, endIso) => {
      let url = `/sales/events/?pipeline_id=${pipelineId}&start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`;
      if (assignedParam && assignedParam !== "UNASSIGNED") {
        url += `&assigned_member_id=${encodeURIComponent(assignedParam)}`;
      }
      if (assignedParam === "UNASSIGNED") {
        url += `&assigned_member_id=`;
      }
      return url;
    },
    [assignedParam]
  );

  const loadDashboard = useCallback(
    async (pipelineId) => {
      if (!pipelineId) {
        setMetrics(null);
        setLeaderboard(null);
        return;
      }

      setLoading(true);
      setErr("");
      try {
        const qs =
          assignedParam && assignedParam !== "UNASSIGNED"
            ? `?assigned_member_id=${encodeURIComponent(assignedParam)}`
            : assignedParam === "UNASSIGNED"
            ? `?assigned_member_id=`
            : "";

        const [mRes, lbRes] = await Promise.all([
          tryFirstOk(buildMetricsCandidates(pipelineId, qs)),
          tryFirstOk(buildLeaderboardCandidates(pipelineId, qs)),
        ]);

        setMetrics(mRes.data || null);
        setLeaderboard(lbRes.data || null);
      } catch (e) {
        setMetrics(null);
        setLeaderboard(null);
        const last = e?._last;
        setErr(last?.detail || e?.response?.data?.detail || "Failed to load Sales OS dashboard");
      } finally {
        setLoading(false);
      }
    },
    [assignedParam]
  );

  const loadQuickEvents = useCallback(
    async (pipelineId) => {
      if (!pipelineId) {
        setEvents([]);
        return;
      }
      setLoadingEvents(true);
      try {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setDate(end.getDate() + 7);

        const res = await api.get(buildEventsUrl(pipelineId, start.toISOString(), end.toISOString()));
        const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
        setEvents(list);
      } catch {
        setEvents([]);
      } finally {
        setLoadingEvents(false);
      }
    },
    [buildEventsUrl]
  );

  const loadProspectsSnapshot = useCallback(
    async (pipelineId) => {
      if (!pipelineId) {
        setProspects([]);
        return;
      }
      setLoadingProspects(true);
      try {
        const res = await api.get(buildProspectsUrl(pipelineId));
        const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
        setProspects(list.slice(0, 12));
      } catch {
        setProspects([]);
      } finally {
        setLoadingProspects(false);
      }
    },
    [buildProspectsUrl]
  );

  useEffect(() => {
    loadPipelines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // when pipeline changes, load everything + members/stages
  useEffect(() => {
    if (!activePipelineId) return;
    loadMembers(activePipelineId);
    loadStages(activePipelineId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePipelineId]);

  // when pipeline OR agentFilter changes, reload dashboard + events + prospects
  useEffect(() => {
    if (!activePipelineId) return;
    loadDashboard(activePipelineId);
    loadQuickEvents(activePipelineId);
    loadProspectsSnapshot(activePipelineId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePipelineId, agentFilter]);

  async function refreshAll() {
    await loadPipelines();
    if (activePipelineId) {
      await loadMembers(activePipelineId);
      await loadStages(activePipelineId);
      await loadDashboard(activePipelineId);
      await loadQuickEvents(activePipelineId);
      await loadProspectsSnapshot(activePipelineId);
    }
  }

  async function createPipelineQuick() {
    const name = prompt("Sales Pipeline name:");
    if (!name) return;

    setLoading(true);
    setErr("");
    try {
      const res = await api.post("/sales/pipelines/", { name });
      const id = String(res.data?.id || "");
      await loadPipelines();
      if (id) setActivePipelineId(id);
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to create pipeline");
    } finally {
      setLoading(false);
    }
  }

  function openAddToCalendar(prospect) {
    const settings = readSalesSettings();
    const defaultMeet =
      (settings?.zoom_link || "").trim() ||
      (settings?.teams_link || "").trim() ||
      "";

    const now = new Date();
    const later = new Date(now);
    later.setMinutes(later.getMinutes() + 30);

    const descLines = [
      prospect?.full_name ? `Prospect: ${prospect.full_name}` : "",
      prospect?.email ? `Email: ${prospect.email}` : "",
      prospect?.phone ? `Phone: ${prospect.phone}` : "",
      defaultMeet ? `Meeting Link: ${defaultMeet}` : "",
    ].filter(Boolean);

    setEventForm({
      title: `Follow-up: ${prospect?.full_name || "Prospect"}`,
      start_at: now.toISOString().slice(0, 16),
      end_at: later.toISOString().slice(0, 16),
      location: defaultMeet || "",
      description: descLines.join("\n"),
    });
    setEventModal({ open: true, prospect });
  }

  async function saveEvent() {
    if (!activePipelineId) return;
    if (!eventForm.title.trim()) return alert("Title required.");
    if (!eventForm.start_at || !eventForm.end_at) return alert("Start/end required.");

    setSavingEvent(true);
    try {
      const payload = {
        pipeline_id: Number(activePipelineId),
        title: eventForm.title,
        description: eventForm.description,
        location: eventForm.location,
        start_at: new Date(eventForm.start_at).toISOString(),
        end_at: new Date(eventForm.end_at).toISOString(),
        prospect_id: eventModal?.prospect?.id || null,
      };

      if (eventModal?.prospect?.assigned_member_id) {
        payload.assigned_member_id = eventModal.prospect.assigned_member_id;
      }

      await api.post(`/sales/events/`, payload);
      setEventModal({ open: false, prospect: null });
      await loadQuickEvents(activePipelineId);
      alert("Event created.");
    } catch (e) {
      alert(e?.response?.data?.detail || "Failed to create event (pipeline may be locked).");
    } finally {
      setSavingEvent(false);
    }
  }

  async function deleteProspect(p) {
    if (!p?.id) return;
    if (!confirm(`Delete prospect "${p.full_name || "Prospect"}"?`)) return;

    try {
      await api.delete(`/sales/prospects/${p.id}/`);
      await loadProspectsSnapshot(activePipelineId);
      await loadDashboard(activePipelineId);
    } catch (e) {
      alert(e?.response?.data?.detail || "Delete failed (pipeline may be locked).");
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar
        title="Sales OS Dashboard"
        subtitle="Pipelines • Prospects • Calendar • Seats"
        rightActions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={createPipelineQuick}
              className="text-xs rounded-2xl px-3 py-2 bg-cyan-500/15 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-200"
              title="Create a Sales Pipeline"
            >
              + Create Pipeline
            </button>

            <button
              type="button"
              onClick={() => setTplModalOpen(true)}
              className="h-10 w-10 rounded-2xl border border-slate-800 bg-slate-950/55 hover:bg-slate-900/60 transition flex items-center justify-center"
              disabled={!activePipelineId}
              title={!activePipelineId ? "Select a pipeline first" : "Templates (paperclip)"}
            >
              📎
            </button>

            <button
              type="button"
              onClick={refreshAll}
              className="text-xs rounded-2xl px-3 py-2 bg-slate-950/60 border border-slate-800 hover:bg-slate-900/40"
              disabled={loading}
              title="Refresh Sales OS"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        }
      />

      {/* ✅ Sales subnav UNDER ModeBar */}
      <SalesOsSubNav
        pipelineId={activePipelineId}
        locked={locked}
        right={
          <button
            type="button"
            onClick={() => nav("/sales/stages" + (activePipelineId ? `?pipeline_id=${encodeURIComponent(activePipelineId)}` : ""))}
            className="text-xs rounded-2xl px-3 py-2 bg-slate-950/60 border border-slate-800 hover:bg-slate-900/40"
            disabled={!activePipelineId}
            title="Manage stages + templates"
          >
            ⚙️
          </button>
        }
      />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {err ? (
          <div className="text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-2xl p-3">{err}</div>
        ) : null}

        {/* Pipeline pill */}
        <div className="flex gap-2 flex-wrap items-center">
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            {activePipelineId ? (
              <PillButton
                tone={locked ? "fuchsia" : "emerald"}
                title={locked ? "Locked (read-only)" : "Active"}
                onClick={() => {
                  if (pipelines.length <= 1) return;
                  const names = pipelines.map((p) => `${p.id}: ${p.name}`).join("\n");
                  const next = prompt(
                    `Switch active pipeline (enter ID):\n\n${names}\n\nCurrent: ${activePipelineId}`,
                    String(activePipelineId)
                  );
                  if (!next) return;
                  const exists = pipelines.some((p) => String(p.id) === String(next).trim());
                  if (!exists) return alert("Pipeline ID not found.");
                  setActivePipelineId(String(next).trim());
                }}
              >
                <span className="mr-2">🟢</span>
                <span>{locked ? "Locked" : "Active"}</span>
                <span className="ml-2 opacity-80">
                  {activePipeline?.name ? `• ${activePipeline.name}` : `• Pipeline #${activePipelineId}`}
                </span>
                {pipelines.length > 1 ? <span className="ml-2 opacity-70">↕</span> : null}
              </PillButton>
            ) : (
              <PillButton tone="slate" onClick={createPipelineQuick} title="Create a pipeline to begin">
                <span className="mr-2">⚡</span>
                Create your first pipeline
              </PillButton>
            )}
          </div>
        </div>

        {locked ? (
          <div className="rounded-3xl border border-rose-500/40 bg-rose-500/10 p-5">
            <div className="text-xl font-extrabold">Sales OS Locked</div>
            <div className="text-sm text-rose-200/90 mt-2">This pipeline is read-only until billing is updated.</div>
            <div className="mt-4 flex gap-2 flex-wrap">
              <Link
                to="/sales/seats"
                className="rounded-2xl px-4 py-2 bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 text-sm font-semibold"
              >
                View seats & billing
              </Link>
            </div>
          </div>
        ) : null}

        {/* KPI row */}
        <div className="grid md:grid-cols-4 gap-3">
          <MiniKpi label="Total Prospects" value={metrics?.total_prospects ?? "—"} tone="cyan" />
          <MiniKpi label="Open Prospects" value={metrics?.open_prospects ?? "—"} tone="fuchsia" />
          <MiniKpi label="Won (30d)" value={metrics?.won_30d ?? "—"} tone="emerald" />
          <MiniKpi
            label="Conversion (30d)"
            value={metrics?.conversion_rate_30d != null ? `${Math.round(metrics.conversion_rate_30d * 100)}%` : "—"}
            tone="amber"
          />
        </div>

        {/* ✅ Quick Access = agent filter + quick meta */}
        <Card
          title="Quick Access"
          subtitle="Filter by agent to see their prospects + calendar + performance."
          right={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => nav("/sales/settings")}
                className="text-xs rounded-2xl px-3 py-2 bg-slate-950/60 border border-slate-800 hover:bg-slate-900/40"
                title="Settings"
              >
                ⚙️
              </button>
            </div>
          }
        >
          <div className="grid md:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="text-xs text-slate-400">Agent Filter</div>
              <select
                className="mt-2 w-full bg-slate-950/60 border border-slate-800 rounded-2xl px-3 py-2 text-sm"
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                disabled={!activePipelineId}
              >
                <option value="ALL">All Agents (Agency View)</option>
                <option value="UNASSIGNED">Unassigned</option>
                {agentOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label} {a.role ? `(${a.role})` : ""}
                  </option>
                ))}
              </select>
              <div className="text-[11px] text-slate-500 mt-2">
                Manager view: audit follow-ups, activity, and conversions with minimal clicks.
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="text-xs text-slate-400">Calendar</div>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => nav("/sales/calendar" + (activePipelineId ? `?pipeline_id=${activePipelineId}` : ""))}
                  className="text-xs rounded-2xl px-3 py-2 bg-cyan-500/15 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-200"
                  disabled={!activePipelineId}
                >
                  Open →
                </button>
                <button
                  type="button"
                  onClick={() => activePipelineId && loadQuickEvents(activePipelineId)}
                  className="text-xs rounded-2xl px-3 py-2 bg-slate-950/60 border border-slate-800 hover:bg-slate-900/40"
                  disabled={!activePipelineId || loadingEvents}
                >
                  {loadingEvents ? "…" : "↻"}
                </button>
              </div>
              <div className="text-[11px] text-slate-500 mt-2">Respects Agent Filter.</div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="text-xs text-slate-400">Prospects</div>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => nav("/sales/board" + (activePipelineId ? `?pipeline_id=${activePipelineId}` : ""))}
                  className="text-xs rounded-2xl px-3 py-2 bg-fuchsia-500/15 border border-fuchsia-500/35 hover:bg-fuchsia-500/20 text-fuchsia-200"
                  disabled={!activePipelineId}
                >
                  Open →
                </button>
                <button
                  type="button"
                  onClick={() => activePipelineId && loadProspectsSnapshot(activePipelineId)}
                  className="text-xs rounded-2xl px-3 py-2 bg-slate-950/60 border border-slate-800 hover:bg-slate-900/40"
                  disabled={!activePipelineId || loadingProspects}
                >
                  {loadingProspects ? "…" : "↻"}
                </button>
              </div>
              <div className="text-[11px] text-slate-500 mt-2">Respects Agent Filter.</div>
            </div>
          </div>
        </Card>

        {/* ✅ Prospects snapshot */}
        <Card
          title="Prospects (Snapshot)"
          subtitle="Quick actions: schedule appointment or delete."
          right={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => nav("/sales/board" + (activePipelineId ? `?pipeline_id=${activePipelineId}` : ""))}
                className="text-xs rounded-2xl px-3 py-2 bg-slate-950/60 border border-slate-800 hover:bg-slate-900/40"
                disabled={!activePipelineId}
              >
                Board →
              </button>
            </div>
          }
        >
          {!activePipelineId ? (
            <div className="text-sm text-slate-400">Create/select a pipeline to load prospects.</div>
          ) : loadingProspects ? (
            <div className="text-sm text-slate-400">Loading prospects...</div>
          ) : prospects.length === 0 ? (
            <div className="text-sm text-slate-400">No prospects found for this filter.</div>
          ) : (
            <div className="space-y-2">
              {prospects.map((p) => (
                <div key={p.id} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-100 truncate">{p.full_name || p.name || "Prospect"}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        Stage:{" "}
                        <span className="text-slate-200">
                          {stageNameById.get(String(p.stage_id || p.stage)) || "—"}
                        </span>
                        {" • "}
                        {p.email || "No email"}
                        {" • "}
                        {p.phone || "No phone"}
                      </div>
                      {p.next_follow_up_at ? (
                        <div className="text-xs text-slate-400 mt-1">
                          Follow-up: <span className="text-slate-200">{fmtLocal(p.next_follow_up_at)}</span>
                        </div>
                      ) : null}
                      {p.notes ? (
                        <div className="text-sm text-slate-300/90 mt-2 whitespace-pre-wrap">{p.notes}</div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => openAddToCalendar(p)}
                        className="text-xs rounded-2xl px-3 py-2 bg-cyan-500/15 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-200"
                        disabled={!activePipelineId || locked}
                        title={locked ? "Pipeline locked (read-only)" : "Schedule appointment"}
                      >
                        📅
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteProspect(p)}
                        className="text-xs rounded-2xl px-3 py-2 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/15 text-rose-200"
                        disabled={locked}
                        title={locked ? "Pipeline locked (read-only)" : "Delete prospect"}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick Calendar list */}
        <Card
          title="Quick Calendar"
          subtitle={activePipelineId ? "Next 7 days (fast view)" : "Create/select a pipeline to load events"}
          right={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => activePipelineId && loadQuickEvents(activePipelineId)}
                className="text-xs rounded-2xl px-3 py-2 bg-slate-950/60 border border-slate-800 hover:bg-slate-900/40"
                disabled={!activePipelineId || loadingEvents}
              >
                {loadingEvents ? "…" : "↻"}
              </button>
              <button
                type="button"
                onClick={() => nav("/sales/calendar" + (activePipelineId ? `?pipeline_id=${activePipelineId}` : ""))}
                className="text-xs rounded-2xl px-3 py-2 bg-cyan-500/15 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-200"
                disabled={!activePipelineId}
              >
                Calendar →
              </button>
            </div>
          }
        >
          {!activePipelineId ? (
            <div className="text-sm text-slate-400">No pipeline selected.</div>
          ) : events.length === 0 ? (
            <div className="text-sm text-slate-400">No events scheduled.</div>
          ) : (
            <div className="space-y-2">
              {events.slice(0, 6).map((ev) => (
                <div key={ev.id} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-100 truncate">{ev.title}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        {fmtLocal(ev.start_at)} → {fmtLocal(ev.end_at)}
                      </div>
                      {ev.location ? <div className="text-xs text-slate-400 mt-1">📍 {ev.location}</div> : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => nav("/sales/calendar" + (activePipelineId ? `?pipeline_id=${activePipelineId}` : ""))}
                      className="text-xs rounded-2xl px-3 py-2 bg-slate-950/60 border border-slate-800 hover:bg-slate-900/40"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Leaderboard */}
        <Card
          title="Leaderboard (Top 10)"
          subtitle="Competition hook for agents (filterable)."
          right={
            <button
              type="button"
              onClick={() => activePipelineId && loadDashboard(activePipelineId)}
              className="text-xs rounded-2xl px-3 py-2 bg-slate-950/60 border border-slate-800 hover:bg-slate-900/40"
              disabled={!activePipelineId || loading}
            >
              {loading ? "…" : "↻"}
            </button>
          }
        >
          {!leaderboard?.top_10?.length ? (
            <div className="text-sm text-slate-400">No leaderboard data yet.</div>
          ) : (
            <div className="space-y-2">
              {leaderboard.top_10.map((row, idx) => (
                <div key={row.member_id} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-100 truncate">
                        #{idx + 1} {row.agent_name}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Won: {row.prospects_won_30d} • Created: {row.prospects_created_30d} • Activity: {row.activity_count_30d}
                      </div>
                    </div>
                    <div className="text-sm text-slate-200">
                      {Math.round((row.conversion_rate_30d || 0) * 100)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>

      {/* ✅ Templates modal (paperclip) */}
      <SalesOsTemplatesModal
        open={tplModalOpen}
        onClose={() => setTplModalOpen(false)}
        pipelineId={activePipelineId}
      />

      {/* ✅ Add-to-calendar modal */}
      {eventModal.open ? (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-950 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-lg font-extrabold">Create Appointment</div>
                <div className="text-xs text-slate-400 mt-1 truncate">
                  Prospect: <span className="text-slate-200">{eventModal.prospect?.full_name || eventModal.prospect?.name || "Prospect"}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEventModal({ open: false, prospect: null })}
                className="text-slate-300 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                className="bg-slate-950/60 border border-slate-800 rounded-2xl px-3 py-2"
                placeholder="Title"
                value={eventForm.title}
                onChange={(e) => setEventForm((s) => ({ ...s, title: e.target.value }))}
              />

              <input
                className="bg-slate-950/60 border border-slate-800 rounded-2xl px-3 py-2"
                placeholder="Location or Meeting Link (Zoom/Teams)"
                value={eventForm.location}
                onChange={(e) => setEventForm((s) => ({ ...s, location: e.target.value }))}
              />

              <div className="flex flex-col gap-1">
                <div className="text-xs text-slate-400">Start</div>
                <input
                  type="datetime-local"
                  className="bg-slate-950/60 border border-slate-800 rounded-2xl px-3 py-2"
                  value={eventForm.start_at}
                  onChange={(e) => setEventForm((s) => ({ ...s, start_at: e.target.value }))}
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="text-xs text-slate-400">End</div>
                <input
                  type="datetime-local"
                  className="bg-slate-950/60 border border-slate-800 rounded-2xl px-3 py-2"
                  value={eventForm.end_at}
                  onChange={(e) => setEventForm((s) => ({ ...s, end_at: e.target.value }))}
                />
              </div>

              <textarea
                className="md:col-span-2 bg-slate-950/60 border border-slate-800 rounded-2xl px-3 py-2 min-h-[140px]"
                placeholder="Description (optional)"
                value={eventForm.description}
                onChange={(e) => setEventForm((s) => ({ ...s, description: e.target.value }))}
              />
            </div>

            <div className="mt-4 flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={saveEvent}
                disabled={savingEvent}
                className={cx(
                  "rounded-2xl px-5 py-3 text-sm font-semibold border transition",
                  savingEvent
                    ? "bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-cyan-500/20 border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-200 shadow-[0_0_30px_rgba(34,211,238,0.15)]"
                )}
              >
                {savingEvent ? "Saving..." : "Create Event"}
              </button>

              <button
                type="button"
                onClick={() => nav("/sales/settings")}
                className="rounded-2xl px-5 py-3 text-sm font-semibold border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40"
              >
                Edit Zoom/Teams →
              </button>
            </div>

            <div className="text-xs text-slate-500 mt-3">
              Meeting links are pulled from <b>Sales OS Settings</b>.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}