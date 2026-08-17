import React, { useCallback, useEffect, useState } from "react";
import api from "../../../api/client";

function Stat({ label, value, suffix = "" }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-black text-white">{value}{suffix}</div>
    </div>
  );
}

function PostRow({ post, index }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
      <div className="min-w-0">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">#{index + 1} · {post.provider}</div>
        <div className="mt-1 truncate text-sm font-black text-white">{post.title || "Untitled post"}</div>
        <div className="mt-1 text-xs text-slate-500">{post.engagement?.likes || 0} likes · {post.engagement?.comments || 0} comments · {post.engagement?.shares || 0} shares</div>
      </div>
      <div className="shrink-0 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm font-black text-emerald-200">{post.engagement?.total || 0}</div>
    </div>
  );
}

export default function GrowthIntelligenceCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async ({ refresh = false } = {}) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      const res = refresh
        ? await api.post("/platform-growth/growth/intelligence/", {})
        : await api.get("/platform-growth/growth/intelligence/");
      setData(res?.data?.intelligence || res?.data || null);
    } catch (e) {
      setError(e?.response?.data?.detail || "Could not load social performance yet.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <section className="rounded-3xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/10 via-slate-950/65 to-cyan-500/10 p-4 md:p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.22em] text-fuchsia-200">Growth intelligence</div>
          <h2 className="mt-1 text-xl font-black text-white">See what is actually working.</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">SyncWorks measures recent Facebook and Instagram performance, ranks your strongest posts, and turns the results into the next content action.</p>
        </div>
        <button type="button" onClick={() => load({ refresh: true })} disabled={refreshing} className="rounded-xl border border-fuchsia-500/25 bg-fuchsia-500/10 px-3 py-2 text-xs font-black text-fuchsia-100 hover:bg-fuchsia-500/15 disabled:opacity-60">{refreshing ? "Syncing…" : "Refresh performance"}</button>
      </div>

      {loading ? <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-400">Loading social performance…</div> : error ? <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div> : (
        <>
          <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Measured posts" value={data?.posted_count || 0} />
            <Stat label="Total engagement" value={data?.total_engagement || 0} />
            <Stat label="Average / post" value={data?.average_engagement_per_post || 0} />
            <Stat label="Channels measured" value={Object.keys(data?.providers || {}).length} />
          </div>

          <div className="mt-4 grid lg:grid-cols-2 gap-4">
            <div>
              <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">Top content</div>
              <div className="space-y-2">
                {(data?.top_posts || []).length ? (data.top_posts || []).map((post, index) => <PostRow key={post.queue_item_id} post={post} index={index} />) : <div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4 text-sm text-slate-400">No measured posts yet. Publish approved content and SyncWorks will start learning from it.</div>}
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">What SyncWorks recommends next</div>
              <div className="space-y-2">
                {(data?.recommendations || []).length ? data.recommendations.map((item) => <div key={item.code} className="rounded-2xl border border-cyan-500/15 bg-cyan-500/5 p-4"><div className="text-xs font-black text-cyan-200">Priority {item.priority}</div><div className="mt-1 text-sm leading-relaxed text-slate-200">{item.message}</div></div>) : <div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4 text-sm text-slate-400">More performance data is needed before SyncWorks recommends a pattern.</div>}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
