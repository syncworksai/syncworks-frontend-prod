import React, { useEffect, useMemo, useState } from "react";
import api from "../../../api/client";

function asList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
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
    <span className={`text-[11px] px-2 py-1 rounded-full border ${tones[tone] || tones.slate}`}>
      {children}
    </span>
  );
}

function statusTone(status, toneFromStatus) {
  const s = String(status || "").toUpperCase();
  if (s === "POSTED" || s === "PUBLISHED") return "emerald";
  if (s === "QUEUED" || s === "SCHEDULED") return "cyan";
  if (s === "FAILED") return "rose";
  return toneFromStatus ? toneFromStatus(status) : "slate";
}

function niceStatus(status) {
  const s = String(status || "").toUpperCase();
  if (s === "DRAFT") return "Draft";
  if (s === "READY") return "Ready";
  if (s === "APPROVED") return "Approved";
  if (s === "QUEUED") return "Queued";
  if (s === "SCHEDULED") return "Scheduled";
  if (s === "POSTED" || s === "PUBLISHED") return "Posted safely";
  if (s === "FAILED") return "Needs attention";
  return s || "Draft";
}

function normalizeStarterKey(key) {
  const raw = String(key || "").trim().toLowerCase();

  if (raw === "lead_follow_up" || raw === "follow_up" || raw === "lead") return "lead_follow_up";
  if (raw === "review_request" || raw === "review" || raw === "review_ask") return "review_request";
  if (raw === "weekly_tip" || raw === "educational" || raw === "service_tip") return "weekly_tip";
  if (raw === "promo" || raw === "promotion" || raw === "service_promo") return "promo";

  return raw;
}

function draftSourceLabel(source) {
  const s = String(source || "").toUpperCase();
  if (s === "AUTOMATION") return "AUTO";
  if (s === "STARTER") return "STARTER";
  return "DRAFT";
}

export default function GrowthContentEngineCard({
  contentQueue = [],
  aiPostPresets = [],
  aiGeneratedPreviews = [],
  toneFromStatus,
  variant = "platform",
}) {
  const isSbo = variant === "sbo";

  const [drafts, setDrafts] = useState([]);
  const [queueItems, setQueueItems] = useState([]);
  const [loadingIds, setLoadingIds] = useState({});
  const [err, setErr] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  async function loadContentPipeline() {
    setErr("");

    try {
      const [draftsRes, queueRes] = await Promise.all([
        api.get("/platform-growth/growth/drafts/"),
        api.get("/platform-growth/growth/queue/"),
      ]);

      setDrafts(asList(draftsRes.data));
      setQueueItems(asList(queueRes.data));
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to load content pipeline.");
      setDrafts([]);
      setQueueItems([]);
    }
  }

  useEffect(() => {
    loadContentPipeline();
  }, []);

  const queueByDraftId = useMemo(() => {
    const map = new Map();

    queueItems.forEach((item) => {
      const draftId = item?.draft;
      if (!draftId) return;

      const existing = map.get(draftId);
      if (!existing || Number(item.id) > Number(existing.id)) {
        map.set(draftId, item);
      }
    });

    return map;
  }, [queueItems]);

  async function createStarterDraft(preset) {
    const starterType = normalizeStarterKey(preset?.key);
    if (!starterType) {
      setErr("Invalid starter type.");
      return;
    }

    const loadingKey = `starter-${starterType}`;
    setLoadingIds((prev) => ({ ...prev, [loadingKey]: true }));
    setErr("");
    setSuccessMsg("");

    try {
      const res = await api.post("/platform-growth/growth/drafts/starter/", {
        starter_type: starterType,
      });

      const title = res?.data?.title || preset?.label || "Starter draft";
      setSuccessMsg(`Draft created: ${title}`);
      await loadContentPipeline();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to create starter draft.");
    } finally {
      setLoadingIds((prev) => ({ ...prev, [loadingKey]: false }));
    }
  }

  async function queueDraft(id) {
    setLoadingIds((prev) => ({ ...prev, [id]: true }));
    setErr("");
    setSuccessMsg("");

    try {
      await api.post(`/platform-growth/growth/drafts/${id}/queue/`, {});
      setSuccessMsg("Draft scheduled safely.");
      await loadContentPipeline();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to schedule draft.");
    } finally {
      setLoadingIds((prev) => ({ ...prev, [id]: false }));
    }
  }

  async function simulatePost(id) {
    setLoadingIds((prev) => ({ ...prev, [id]: true }));
    setErr("");
    setSuccessMsg("");

    try {
      const existingQueue = queueByDraftId.get(id);

      let queueId = existingQueue?.id;
      if (!queueId || existingQueue?.status === "POSTED") {
        const queueRes = await api.post(`/platform-growth/growth/drafts/${id}/queue/`, {});
        queueId = queueRes.data?.id;
      }

      await api.post(`/platform-growth/growth/queue/${queueId}/simulate-post/`, {});
      setSuccessMsg("Posted safely inside SyncWorks.");
      await loadContentPipeline();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to post safely.");
    } finally {
      setLoadingIds((prev) => ({ ...prev, [id]: false }));
    }
  }

  const combinedQueue = [
    ...drafts.map((draft) => {
      const queueItem = queueByDraftId.get(draft.id);
      const liveStatus = queueItem?.status || draft.status || "DRAFT";

      return {
        id: draft.id,
        title: draft.title,
        status: liveStatus,
        source: draft.source || "AUTOMATION",
        body: draft.body,
        queueId: queueItem?.id,
        postedAt: queueItem?.posted_at,
        scheduledFor: queueItem?.scheduled_for,
        metadata: queueItem?.metadata || draft.metadata || {},
        isLiveDraft: true,
      };
    }),
    ...contentQueue.map((item) => ({
      ...item,
      source: item.source || "STARTER",
      isLiveDraft: false,
    })),
  ];

  const emptyQueue = combinedQueue.length === 0;

  return (
    <GlassCard
      title={isSbo ? "Growth OS Content Engine" : "Content Engine"}
      right={isSbo ? "drafts + schedule + safe posting" : "automation drafts + safe publish queue"}
    >
      {err ? (
        <div className="mb-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
          {err}
        </div>
      ) : null}

      {successMsg ? (
        <div className="mb-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          {successMsg}
        </div>
      ) : null}

      <div className="grid xl:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-slate-100">{isSbo ? "Your Drafts & Schedule" : "Content Queue"}</div>
              <div className="mt-1 text-xs text-slate-500">
                {isSbo ? "Review drafts, schedule them, then post safely." : "Live automation drafts and queue status."}
              </div>
            </div>
            <StatusPill tone="cyan">{isSbo ? "Safe Mode" : "Live + Auto"}</StatusPill>
          </div>

          <div className="mt-3 space-y-2">
            {emptyQueue ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-400">
                No drafts yet. Start with a starter action on the right.
              </div>
            ) : null}

            {combinedQueue.map((item) => {
              const statusUpper = String(item.status || "").toUpperCase();
              const isQueued = statusUpper === "QUEUED" || statusUpper === "SCHEDULED";
              const isPosted = statusUpper === "POSTED" || statusUpper === "PUBLISHED";
              const label = draftSourceLabel(item.source);
              const canAct = !!item.isLiveDraft;

              return (
                <div key={`${item.source}-${item.id}`} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm text-slate-100 font-semibold">{item.title}</div>
                      {item.body ? (
                        <div className="mt-1 text-[11px] leading-relaxed text-slate-400 line-clamp-2">
                          {item.body}
                        </div>
                      ) : null}
                    </div>

                    <span
                      className={
                        label === "AUTO"
                          ? "text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-200"
                          : label === "STARTER"
                          ? "text-[10px] px-2 py-0.5 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-200"
                          : "text-[10px] px-2 py-0.5 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-300"
                      }
                    >
                      {label}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusPill tone={statusTone(item.status, toneFromStatus)}>{niceStatus(item.status)}</StatusPill>

                    {item.queueId ? (
                      <span className="text-[10px] text-slate-500">Queue #{item.queueId}</span>
                    ) : null}
                  </div>

                  {item.postedAt ? (
                    <div className="mt-2 text-[11px] text-emerald-300">
                      Posted safely: {new Date(item.postedAt).toLocaleString()}
                    </div>
                  ) : null}

                  {item.scheduledFor ? (
                    <div className="mt-2 text-[11px] text-cyan-300">
                      Scheduled: {new Date(item.scheduledFor).toLocaleString()}
                    </div>
                  ) : null}

                  {canAct ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => queueDraft(item.id)}
                        disabled={loadingIds[item.id] || isQueued || isPosted}
                        className="h-8 px-3 rounded-xl text-[11px] border border-slate-700 text-slate-200 hover:bg-slate-900/60 disabled:opacity-50"
                      >
                        {loadingIds[item.id] ? "Working..." : isQueued ? "Scheduled" : isPosted ? "Posted" : "Schedule"}
                      </button>

                      <button
                        type="button"
                        onClick={() => simulatePost(item.id)}
                        disabled={loadingIds[item.id] || isPosted}
                        className="h-8 px-3 rounded-xl text-[11px] border border-cyan-500/40 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/15 disabled:opacity-50"
                      >
                        {loadingIds[item.id] ? "Working..." : isPosted ? "Posted safely" : "Post Safely"}
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4 xl:col-span-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <div className="font-semibold text-slate-100">
                {isSbo ? "Starter Automations" : "AI Post Generator"}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {isSbo
                  ? "Choose a simple growth workflow. Everything stays in safe mode."
                  : "Promptless starter actions for social + review growth."}
              </div>
            </div>

            <button
              type="button"
              onClick={loadContentPipeline}
              className="h-8 px-3 rounded-2xl text-xs border border-cyan-500/35 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/15"
            >
              Refresh
            </button>
          </div>

          <div className="mt-3 grid sm:grid-cols-2 xl:grid-cols-4 gap-2">
            {aiPostPresets.map((preset) => {
              const starterType = normalizeStarterKey(preset.key);
              const loadingKey = `starter-${starterType}`;

              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => createStarterDraft(preset)}
                  disabled={!!loadingIds[loadingKey]}
                  className="min-h-10 px-3 py-2 rounded-xl text-xs border border-slate-800 bg-slate-950/70 hover:bg-slate-900/50 text-slate-200 text-left disabled:opacity-50"
                >
                  {loadingIds[loadingKey] ? "Creating draft..." : preset.label}
                </button>
              );
            })}
          </div>

          <div className="mt-4 grid md:grid-cols-3 gap-2">
            {aiGeneratedPreviews.map((card) => (
              <div key={card.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                <div className="text-sm text-slate-100 font-semibold">{card.title}</div>
                <div className="mt-1 text-xs text-slate-300 leading-relaxed">{card.body}</div>
                <div className="mt-2 text-[11px] text-slate-500">{card.channel}</div>
              </div>
            ))}
          </div>

          {isSbo ? (
            <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-100">
              Safe-mode note: “Post Safely” only simulates posting inside SyncWorks until real channel connections are enabled.
            </div>
          ) : null}
        </div>
      </div>
    </GlassCard>
  );
}