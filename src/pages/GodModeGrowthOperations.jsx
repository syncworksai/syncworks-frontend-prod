import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/client";

const PROVIDERS = [
  { key: "facebook", name: "Facebook", implemented: true, backend: "META", description: "Facebook Business Page through Meta OAuth." },
  { key: "instagram", name: "Instagram", implemented: true, backend: "INSTAGRAM", description: "Instagram Professional account linked through Meta." },
  { key: "linkedin", name: "LinkedIn", implemented: false, description: "Company/Page publishing connector is not built yet." },
  { key: "tiktok", name: "TikTok", implemented: false, description: "Content Posting API connector is not built yet." },
  { key: "youtube", name: "YouTube", implemented: false, description: "YouTube Data API publishing connector is not built yet." },
  { key: "x", name: "X", implemented: false, description: "X posting connector is not built yet." },
];
function list(data) { return Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []; }
function Card({ children, className = "" }) { return <div className={`rounded-[22px] border border-cyan-400/15 bg-[#061127]/90 ${className}`}>{children}</div>; }

export default function GodModeGrowthOperations() {
  const [channels, setChannels] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [channelRes, dashRes] = await Promise.all([
        api.get("/platform-growth/growth/channels/"),
        api.get("/platform-growth/dashboard/").catch(() => ({ data: null })),
      ]);
      setChannels(list(channelRes?.data).filter((row) => !row?.metadata?.internal_placeholder));
      setDashboard(dashRes?.data || null);
    } catch (e) { setError(e?.response?.data?.detail || "Could not load Growth OS connections."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("social_connected"); const socialError = params.get("social_error");
    if (connected) setMessage(`${connected === "instagram" ? "Instagram" : "Facebook"} connection completed. Refreshing live status.`);
    if (socialError) setError(socialError);
    if (connected || socialError) window.history.replaceState({}, "", "/platform");
  }, []);

  const connections = useMemo(() => {
    const rows = {};
    channels.forEach((channel) => {
      if (channel.status !== "CONNECTED") return;
      if (channel.provider === "META") rows.facebook = channel;
      if (channel.provider === "INSTAGRAM") rows.instagram = channel;
      if (channel.provider === "META" && channel?.metadata?.selected_account?.instagram_business_account && !rows.instagram) rows.instagram = channel;
    });
    return rows;
  }, [channels]);

  async function connect(provider) {
    if (!provider.implemented) return;
    setConnecting(provider.key); setError(""); setMessage("");
    try {
      const response = await api.post("/platform-growth/growth/oauth/meta/start/", { provider: provider.key, return_to: "/platform" });
      if (!response?.data?.authorization_url) throw new Error("Authorization URL was not returned.");
      window.location.assign(response.data.authorization_url);
    } catch (e) { setConnecting(""); setError(e?.response?.data?.detail || e?.message || "Could not start social connection."); }
  }

  async function disconnect(connection) {
    if (!connection?.id) return;
    setError(""); setMessage("");
    try { await api.post(`/platform-growth/growth/channels/${connection.id}/disconnect/`); setMessage("Social connection disconnected."); await load(); }
    catch (e) { setError(e?.response?.data?.detail || "Could not disconnect this account."); }
  }

  const connectedCount = PROVIDERS.filter((p) => connections[p.key]).length;
  return <section className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="p-5"><div className="text-[10px] font-black uppercase tracking-[.16em] text-cyan-300">Live Connections</div><div className="mt-2 text-3xl font-black text-white">{connectedCount}</div><div className="text-xs text-slate-500">Verified connection records</div></Card>
      <Card className="p-5"><div className="text-[10px] font-black uppercase tracking-[.16em] text-violet-300">Leads</div><div className="mt-2 text-3xl font-black text-white">{dashboard?.leads ?? "—"}</div><div className="text-xs text-slate-500">Growth OS captured</div></Card>
      <Card className="p-5"><div className="text-[10px] font-black uppercase tracking-[.16em] text-fuchsia-300">Drafts</div><div className="mt-2 text-3xl font-black text-white">{dashboard?.growth_drafts ?? "—"}</div><div className="text-xs text-slate-500">Content drafts</div></Card>
      <Card className="p-5"><div className="text-[10px] font-black uppercase tracking-[.16em] text-amber-300">Queue</div><div className="mt-2 text-3xl font-black text-white">{dashboard?.growth_queue_items ?? "—"}</div><div className="text-xs text-slate-500">Scheduled/queued items</div></Card>
    </div>

    <Card className="overflow-hidden"><div className="flex flex-col gap-3 border-b border-white/10 p-5 lg:flex-row lg:items-center lg:justify-between"><div><div className="text-xs font-black uppercase tracking-[.2em] text-cyan-300">Growth OS / Social Media</div><h2 className="mt-1 text-2xl font-black text-white">Connection Control Center</h2><p className="mt-1 max-w-3xl text-sm text-slate-400">This screen reports what is actually connected. A provider is never marked connected just because its button exists.</p></div><button onClick={load} className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-black text-cyan-100">{loading ? "Refreshing…" : "Refresh Status"}</button></div>
      {error && <div className="m-4 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</div>}{message && <div className="m-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">{message}</div>}
      <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">{PROVIDERS.map((provider) => { const connection = connections[provider.key]; const connected = Boolean(connection); const state = connected ? "CONNECTED" : provider.implemented ? "NOT CONNECTED" : "CONNECTOR NOT BUILT"; return <div key={provider.key} className={`rounded-2xl border p-4 ${connected ? "border-emerald-400/30 bg-emerald-400/8" : provider.implemented ? "border-amber-400/20 bg-slate-950/55" : "border-white/10 bg-slate-950/35"}`}><div className="flex items-start justify-between gap-3"><div><div className="text-lg font-black text-white">{provider.name}</div><div className={`mt-1 text-[10px] font-black ${connected ? "text-emerald-300" : provider.implemented ? "text-amber-300" : "text-slate-500"}`}>{state}</div></div><span className={`h-3 w-3 rounded-full ${connected ? "bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,.8)]" : "bg-slate-700"}`} /></div><p className="mt-3 text-xs leading-5 text-slate-400">{provider.description}</p>{connected ? <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-xs"><div className="font-bold text-slate-200">{connection.account_label || "Connected account"}</div><div className="mt-1 text-slate-500">Provider record: {connection.provider} · Updated {connection.updated_at ? new Date(connection.updated_at).toLocaleString() : "—"}</div></div> : null}<div className="mt-4 flex gap-2">{provider.implemented ? connected ? <><button onClick={() => connect(provider)} className="rounded-xl border border-cyan-400/25 px-3 py-2 text-xs font-black text-cyan-100">Reconnect</button><button onClick={() => disconnect(connection)} className="rounded-xl border border-rose-400/25 px-3 py-2 text-xs font-black text-rose-200">Disconnect</button></> : <button onClick={() => connect(provider)} disabled={Boolean(connecting)} className="rounded-xl bg-cyan-500 px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-50">{connecting === provider.key ? "Opening…" : `Connect ${provider.name}`}</button> : <span className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-500">Add through Build Backlog</span>}</div></div>; })}</div>
    </Card>

    <div className="grid gap-4 lg:grid-cols-2"><Card className="p-5"><h3 className="text-lg font-black text-white">What is live today</h3><p className="mt-2 text-sm leading-6 text-slate-400">Meta OAuth supports Facebook and Instagram. Growth OS already has drafts, queues, leads, conversations and automation records. External publishing should remain approval-controlled until each provider is verified end-to-end.</p></Card><Card className="p-5"><h3 className="text-lg font-black text-white">What is not live yet</h3><p className="mt-2 text-sm leading-6 text-slate-400">LinkedIn, TikTok, YouTube and X need provider-specific OAuth/API builds. They remain explicitly marked as not built so God Mode cannot create a false sense of connectivity.</p></Card></div>
  </section>;
}
