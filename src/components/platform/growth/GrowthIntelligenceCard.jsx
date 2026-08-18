import React, { useCallback, useEffect, useState } from "react";
import api from "../../../api/client";

function Stat({ label, value, detail = "" }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-black text-white">{value}</div>
      {detail ? <div className="mt-1 text-[11px] text-slate-500">{detail}</div> : null}
    </div>
  );
}

function PostRow({ post, index }) {
  const leads = post.attribution?.leads || 0;
  const wins = post.attribution?.wins || 0;
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">#{index + 1} · {post.provider}</div>
          <div className="mt-1 truncate text-sm font-black text-white">{post.title || "Untitled post"}</div>
          <div className="mt-1 text-xs text-slate-500">{post.engagement?.likes || 0} likes · {post.engagement?.comments || 0} comments · {post.engagement?.shares || 0} shares</div>
        </div>
        <div className="shrink-0 rounded-xl border border-fuchsia-500/25 bg-fuchsia-500/10 px-3 py-2 text-center">
          <div className="text-[9px] font-black uppercase tracking-wider text-fuchsia-300">Impact</div>
          <div className="text-sm font-black text-fuchsia-100">{post.impact_score || 0}</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black">
        <span className="rounded-full border border-slate-700 bg-slate-900/70 px-2 py-1 text-slate-300">{post.engagement?.total || 0} engagement</span>
        <span className={`rounded-full border px-2 py-1 ${leads ? "border-cyan-500/25 bg-cyan-500/10 text-cyan-200" : "border-slate-800 bg-slate-950 text-slate-500"}`}>{leads} lead{leads === 1 ? "" : "s"}</span>
        <span className={`rounded-full border px-2 py-1 ${wins ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200" : "border-slate-800 bg-slate-950 text-slate-500"}`}>{wins} won</span>
      </div>
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
          <h2 className="mt-1 text-xl font-black text-white">Measure attention all the way to customers.</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">SyncWorks combines Facebook and Instagram engagement with attributed social leads and won outcomes so the next recommendation is based on business impact, not likes alone.</p>
        </div>
        <button type="button" onClick={() => load({ refresh: true })} disabled={refreshing} className="rounded-xl border border-fuchsia-500/25 bg-fuchsia-500/10 px-3 py-2 text-xs font-black text-fuchsia-100 hover:bg-fuchsia-500/15 disabled:opacity-60">{refreshing ? "Syncing…" : "Refresh performance"}</button>
      </div>

      {loading ? <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-400">Loading social performance…</div> : error ? <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div> : (
        <>
          <div className="mt-4 grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Stat label="Measured posts" value={data?.posted_count || 0} />
            <Stat label="Engagement" value={data?.total_engagement || 0} detail={`${data?.average_engagement_per_post || 0} average / post`} />
            <Stat label="Attributed leads" value={data?.attributed_leads || 0} detail={`${data?.social_leads_total || 0} total social leads`} />
            <Stat label="Won leads" value={data?.won_leads || 0} detail="Marked won in Growth CRM" />
            <Stat label="Channels" value={Object.keys(data?.providers || {}).length} detail={Object.keys(data?.providers || {}).join(" + ") || "Connect socials"} />
          </div>

          {data?.unattributed_social_leads ? <div className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-100">{data.unattributed_social_leads} social lead{data.unattributed_social_leads === 1 ? " is" : "s are"} connected to your Business but not tied to a specific post yet. SyncWorks still keeps them in the lead pipeline.</div> : null}

          <div className="mt-4 grid lg:grid-cols-2 gap-4">
            <div>
              <div className="mb-2 flex items-center justify-between gap-2"><div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Top content by impact</div><div className="text-[10px] text-slate-600">Engagement + leads + wins</div></div>
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
