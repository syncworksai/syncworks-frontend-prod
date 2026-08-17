import React, { useCallback, useEffect, useMemo, useState } from "react";
import ModeBar from "../components/ModeBar";
import Button from "../components/ui/Button";
import GrowthContentEngineCard from "../components/platform/growth/GrowthContentEngineCard";
import GrowthOnboardingWizard from "../components/platform/growth/GrowthOnboardingWizard";
import { toneFromStatus } from "../components/platform/growth/growthUtils";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import api from "../api/client";

const GROWTH_OS_PAYMENT_URL = "https://buy.stripe.com/28E9AT4aefLp4uJ0Kn2Nq0i";

function UnlockGrowthOsCard({ onBack }) {
  function openCheckout() {
    window.open(GROWTH_OS_PAYMENT_URL, "_blank", "noopener,noreferrer");
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      <section className="relative overflow-hidden rounded-3xl border border-fuchsia-500/25 bg-slate-950/60 p-6 shadow-[0_0_70px_rgba(217,70,239,0.12)]">
        <div className="pointer-events-none absolute -inset-24 blur-3xl bg-gradient-to-br from-fuchsia-500/20 via-indigo-500/15 to-cyan-500/15" />
        <div className="relative grid lg:grid-cols-[1.3fr_0.7fr] gap-6 items-center">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-fuchsia-200 font-black">Growth OS Add-on</div>
            <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight text-white">Unlock Growth OS</h1>
            <p className="mt-3 text-sm md:text-base text-slate-300 max-w-3xl leading-relaxed">Automate follow-ups, review requests, and social content.</p>
            <div className="mt-5 grid sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4"><div className="text-sm font-extrabold text-cyan-100">Follow-ups</div><div className="mt-1 text-xs text-slate-300">Turn new leads into ready-to-send replies.</div></div>
              <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4"><div className="text-sm font-extrabold text-indigo-100">Reviews</div><div className="mt-1 text-xs text-slate-300">Generate review requests after completed jobs.</div></div>
              <div className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 p-4"><div className="text-sm font-extrabold text-fuchsia-100">Content</div><div className="mt-1 text-xs text-slate-300">Draft social posts without starting from scratch.</div></div>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-950/75 p-5">
            <div className="text-xs uppercase tracking-[0.22em] text-slate-400 font-black">Monthly add-on</div>
            <div className="mt-3 flex items-end gap-2"><div className="text-4xl font-black text-white">$9.99</div><div className="pb-1 text-sm text-slate-400">/mo</div></div>
            <div className="mt-3 text-sm text-slate-300">Growth automation for Business users.</div>
            <div className="mt-5 flex flex-col gap-2"><Button tone="fuchsia" onClick={openCheckout}>Unlock Growth OS</Button><Button tone="slate" onClick={onBack}>Back to Business Dashboard</Button></div>
          </div>
        </div>
      </section>
    </main>
  );
}

function StarterRecipeCard({ title, copy, status, tone = "cyan" }) {
  const tones = {
    cyan: "border-cyan-500/20 bg-cyan-500/10 text-cyan-100",
    indigo: "border-indigo-500/20 bg-indigo-500/10 text-indigo-100",
    fuchsia: "border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-100",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-100",
  };
  return <div className={`rounded-2xl border p-4 ${tones[tone] || tones.cyan}`}><div className="flex items-start justify-between gap-3"><div className="text-sm font-black">{title}</div><span className="rounded-full border border-white/10 bg-slate-950/30 px-2 py-1 text-[10px] font-black text-slate-100">{status}</span></div><div className="mt-2 text-xs leading-relaxed text-slate-300">{copy}</div></div>;
}

function SocialConnectionCard({ name, description, connection, availableLabel, connecting, onConnect, onDisconnect }) {
  const connected = connection?.status === "CONNECTED";
  return (
    <div className={`rounded-3xl border p-4 md:p-5 ${connected ? "border-emerald-500/25 bg-emerald-500/10" : "border-slate-800 bg-slate-950/60"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><div className="text-base font-black text-white">{name}</div><span className={`rounded-full px-2 py-1 text-[10px] font-black ${connected ? "bg-emerald-400/15 text-emerald-200" : "bg-slate-800 text-slate-300"}`}>{connected ? "CONNECTED" : "NOT CONNECTED"}</span></div>
          <div className="mt-1 text-xs text-slate-400">{connected ? connection.account_label || "Connected account" : availableLabel || description}</div>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-300">{description}</p>
      <div className="mt-4 flex gap-2 flex-wrap">
        {connected ? <><Button tone="slate" onClick={onConnect} disabled={connecting}>Reconnect</Button><button type="button" onClick={onDisconnect} className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs font-black text-red-200 hover:bg-red-500/15">Disconnect</button></> : <Button tone="cyan" onClick={onConnect} disabled={connecting}>{connecting ? "Opening Meta…" : `Connect ${name}`}</Button>}
      </div>
    </div>
  );
}

export default function SboGrowth() {
  const navigate = useNavigate();
  const { booting, isGod, canAccessGrowthOs, moduleAccess } = useAuth();
  const [showGuide, setShowGuide] = useState(() => localStorage.getItem("sw_growth_guide_hidden") !== "1");
  const [contentEngineKey, setContentEngineKey] = useState(0);
  const [guideMessage, setGuideMessage] = useState("");
  const [guideError, setGuideError] = useState("");
  const [channels, setChannels] = useState([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [connectingProvider, setConnectingProvider] = useState("");

  const growthUnlocked = !!isGod || !!canAccessGrowthOs;

  const loadChannels = useCallback(async () => {
    if (!growthUnlocked) return;
    setChannelsLoading(true);
    try {
      const res = await api.get("/platform-growth/growth/channels/");
      const rows = Array.isArray(res?.data) ? res.data : res?.data?.results || [];
      setChannels(rows.filter((row) => !row?.metadata?.internal_placeholder));
    } catch (e) {
      setGuideError(e?.response?.data?.detail || "Could not load social connections.");
    } finally {
      setChannelsLoading(false);
    }
  }, [growthUnlocked]);

  useEffect(() => { loadChannels(); }, [loadChannels]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("social_connected");
    const label = params.get("social_label");
    const error = params.get("social_error");
    if (connected) {
      setGuideError("");
      setGuideMessage(`${connected === "instagram" ? "Instagram" : "Facebook"} connected${label ? `: ${label}` : ""}. SyncWorks can now publish approved scheduled content.`);
      loadChannels();
    } else if (error) {
      setGuideError(decodeURIComponent(error));
    }
    if (connected || error) window.history.replaceState({}, "", window.location.pathname);
  }, [loadChannels]);

  const facebookConnection = useMemo(() => channels.find((row) => row.provider === "META" && row.status === "CONNECTED"), [channels]);
  const instagramConnection = useMemo(() => channels.find((row) => row.provider === "INSTAGRAM" && row.status === "CONNECTED"), [channels]);
  const linkedInstagram = facebookConnection?.metadata?.selected_account?.instagram_business_account;

  const contentQueue = useMemo(() => [
    { id: "sbo-demo-1", title: "Weekly service tip", status: "DRAFT", source: "STARTER" },
    { id: "sbo-demo-2", title: "Review request campaign", status: "SCHEDULED", source: "STARTER" },
  ], []);
  const aiPostPresets = useMemo(() => [
    { key: "lead_follow_up", label: "Start Lead Follow-Up" },
    { key: "review_request", label: "Start Review Request" },
    { key: "weekly_tip", label: "Start Weekly Service Tip" },
    { key: "promo", label: "Start Promo Post" },
  ], []);
  const aiGeneratedPreviews = useMemo(() => [
    { id: "gp-1", title: "Lead Follow-Up", body: "Thanks for reaching out — we can help. Want to get on the schedule?", channel: "SMS / Email Draft" },
    { id: "gp-2", title: "Review Request", body: "If we earned it, a quick review helps our small business grow.", channel: "Google / Facebook" },
    { id: "gp-3", title: "Service Promo", body: "Booking this week? Ask about our fast-turnaround service slots.", channel: "Facebook / Instagram" },
  ], []);

  async function connectSocial(provider) {
    setGuideError(""); setGuideMessage(""); setConnectingProvider(provider);
    try {
      const res = await api.post("/platform-growth/growth/oauth/meta/start/", { provider, return_to: "/sbo/growth" });
      const url = res?.data?.authorization_url;
      if (!url) throw new Error("Meta authorization URL was not returned.");
      window.location.assign(url);
    } catch (e) {
      setConnectingProvider("");
      setGuideError(e?.response?.data?.detail || e?.message || "Could not start social connection.");
    }
  }

  async function disconnectSocial(connection) {
    if (!connection?.id) return;
    setGuideError(""); setGuideMessage("");
    try {
      await api.post(`/platform-growth/growth/channels/${connection.id}/disconnect/`);
      setGuideMessage(`${connection.provider === "INSTAGRAM" ? "Instagram" : "Facebook"} disconnected.`);
      await loadChannels();
    } catch (e) {
      setGuideError(e?.response?.data?.detail || "Could not disconnect this social account.");
    }
  }

  async function createStarterFromGuide(preset) {
    setGuideMessage(""); setGuideError("");
    try {
      const res = await api.post("/platform-growth/growth/drafts/starter/", { starter_type: preset?.key || "lead_follow_up" });
      setGuideMessage(`Draft created: ${res?.data?.title || preset?.label || "Starter draft"}`);
      setContentEngineKey((x) => x + 1);
    } catch (e) { setGuideError(e?.response?.data?.detail || "Failed to create starter draft."); }
  }

  function hideGuide() { localStorage.setItem("sw_growth_guide_hidden", "1"); setShowGuide(false); }
  function showChannelsMessage() { document.getElementById("social-connections")?.scrollIntoView({ behavior: "smooth", block: "start" }); }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar title="Social Media" subtitle="Automated follow-ups, approved publishing, and growth automation" rightActions={<div className="flex gap-2 flex-wrap"><Button tone="cyan" onClick={() => navigate("/sbo")}>Business Dashboard</Button><Button tone="slate" onClick={() => navigate("/sbo/settings?return=%2Fsbo%2Fgrowth")}>Settings</Button></div>} />
      {booting || !moduleAccess?.checked ? <main className="max-w-7xl mx-auto px-4 py-6"><div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-5 text-sm text-slate-300">Loading Social Media access…</div></main> : !growthUnlocked ? <UnlockGrowthOsCard onBack={() => navigate("/sbo")} /> : (
        <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
          <section className="rounded-3xl border border-cyan-500/20 bg-cyan-500/10 p-5"><div className="flex items-start justify-between gap-3 flex-wrap"><div><div className="text-xs uppercase tracking-[0.24em] text-cyan-200 font-black">SyncWorks Social Automation</div><h1 className="mt-2 text-2xl md:text-3xl font-black tracking-tight text-white">Create it once. Approve it. Let SyncWorks handle the schedule.</h1><p className="mt-2 text-sm text-slate-300 max-w-3xl">Connect your business social accounts, approve content, and SyncWorks can publish scheduled posts in the background while keeping you in control.</p></div><div className={`rounded-full border px-3 py-1 text-xs font-black ${facebookConnection || instagramConnection ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-amber-500/30 bg-amber-500/10 text-amber-200"}`}>{facebookConnection || instagramConnection ? "Publishing Connected" : "Connect Socials"}</div></div></section>

          {guideMessage ? <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">{guideMessage}</div> : null}
          {guideError ? <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">{guideError}</div> : null}

          <section id="social-connections" className="rounded-3xl border border-slate-800 bg-slate-950/45 p-4 md:p-5 scroll-mt-4">
            <div className="flex items-start justify-between gap-3 flex-wrap"><div><div className="text-xs uppercase tracking-[0.22em] text-slate-400 font-black">Connected accounts</div><h2 className="mt-1 text-xl font-black text-white">Connect social media</h2><p className="mt-1 text-sm text-slate-400">Use your Meta sign-in. SyncWorks never asks you to paste social passwords or access tokens.</p></div><button type="button" onClick={loadChannels} className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-black text-slate-300 hover:bg-slate-900">{channelsLoading ? "Refreshing…" : "Refresh"}</button></div>
            <div className="mt-4 grid lg:grid-cols-2 gap-3">
              <SocialConnectionCard name="Facebook" description="Connect your Facebook Business Page for approved text and image publishing." connection={facebookConnection} connecting={connectingProvider === "facebook"} onConnect={() => connectSocial("facebook")} onDisconnect={() => disconnectSocial(facebookConnection)} />
              <SocialConnectionCard name="Instagram" description="Connect an Instagram Professional account linked to your Facebook Page for approved image publishing." connection={instagramConnection} availableLabel={linkedInstagram ? `Detected @${linkedInstagram.username || linkedInstagram.name || "Instagram account"} — tap Connect Instagram to finish.` : facebookConnection ? "No linked Instagram Professional account detected yet." : "Connect Facebook first or sign in with Meta to detect your linked Instagram account."} connecting={connectingProvider === "instagram"} onConnect={() => connectSocial("instagram")} onDisconnect={() => disconnectSocial(instagramConnection)} />
            </div>
            <div className="mt-3 rounded-2xl border border-cyan-500/15 bg-cyan-500/5 p-3 text-xs text-slate-300"><span className="font-black text-cyan-200">How automation works:</span> SyncWorks can prepare content in the background, but nothing reaches Facebook or Instagram until the draft is approved. After approval, scheduled publishing can run without you keeping the app open.</div>
          </section>

          {showGuide ? <GrowthOnboardingWizard variant="sbo" onCreateStarter={createStarterFromGuide} onOpenChannels={showChannelsMessage} onSkip={hideGuide} /> : <div className="flex justify-end"><button type="button" onClick={() => setShowGuide(true)} className="rounded-2xl border border-cyan-500/35 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-500/15">Show Social Automation guide</button></div>}

          <section className="grid md:grid-cols-4 gap-3"><StarterRecipeCard title="New Lead Follow-Up" copy="Create a ready-to-send reply when a customer asks for service." status="Automation" tone="cyan" /><StarterRecipeCard title="Review Request" copy="Draft a review ask after a completed job or paid invoice." status="Starter" tone="indigo" /><StarterRecipeCard title="Weekly Service Tip" copy="Keep your business visible with helpful posts customers understand." status="Starter" tone="fuchsia" /><StarterRecipeCard title="Win-Back Message" copy="Re-engage old leads that never booked or went quiet." status="Starter" tone="emerald" /></section>

          <GrowthContentEngineCard key={contentEngineKey} contentQueue={contentQueue} aiPostPresets={aiPostPresets} aiGeneratedPreviews={aiGeneratedPreviews} toneFromStatus={toneFromStatus} variant="sbo" />
        </main>
      )}
    </div>
  );
}
