import React, { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Bell, BellOff, CalendarDays, CheckCircle2, Copy, ExternalLink, Loader2, Radio, Share2, Users } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { followGroupAsFan, getGroupFanFeed, unfollowGroupAsFan } from "../api/social";

const errorText = (err) => err?.response?.data?.detail || err?.message || "Something went wrong.";

export default function SocialGroupFanLanding() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, booting } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const inviteUrl = window.location.origin + "/social/invite/" + token;
  const fanUrl = window.location.origin + "/social/fan/" + token;

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setData(await getGroupFanFeed(token)); setError(""); }
    catch (err) { setError(errorText(err)); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { refresh(); }, [refresh]);

  async function follow(updates = true) {
    setBusy(true); setError(""); setNotice("");
    try {
      await followGroupAsFan(token, updates);
      setNotice(updates ? "You're following the team. We'll email you when GameCast goes live." : "Live GameCast emails turned off.");
      await refresh();
    } catch (err) { setError(errorText(err)); }
    finally { setBusy(false); }
  }

  async function unfollow() {
    setBusy(true); setError(""); setNotice("");
    try {
      await unfollowGroupAsFan(token);
      setNotice("You've unfollowed this team and stopped email updates.");
      await refresh();
    } catch (err) { setError(errorText(err)); }
    finally { setBusy(false); }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Follow " + (data?.group?.name || "our team"), text: "See live scores and GameCast updates on SyncWorks.", url: inviteUrl });
        return;
      } catch (err) { if (err?.name === "AbortError") return; }
    }
    try { await navigator.clipboard.writeText(inviteUrl); setNotice("Link copied. Share it with other fans."); }
    catch { setNotice("Select the invite link below to copy it."); }
  }

  const games = data?.games || [];
  const liveGames = games.filter((game)=>game.status === "LIVE");
  const upcomingGames = games.filter((game)=>game.status === "SCHEDULED").sort((a,b)=>new Date(a.start_at)-new Date(b.start_at));
  const completedGames = games.filter((game)=>game.status === "FINAL").sort((a,b)=>new Date(b.start_at)-new Date(a.start_at)).slice(0,4);

  return <div className="min-h-screen bg-[#02060c] px-3 py-[max(1.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] text-white">
    <main className="mx-auto max-w-lg space-y-3">
      <button type="button" onClick={()=>navigate("/social/invite/"+token)} className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs font-bold text-slate-300"><ArrowLeft className="h-4 w-4"/>Player or fan</button>
      {error ? <div role="alert" className="rounded-xl border border-rose-300/25 bg-rose-300/10 p-3 text-sm text-rose-100">{error}</div> : null}
      {notice ? <div role="status" className="rounded-xl border border-emerald-300/25 bg-emerald-300/10 p-3 text-xs text-emerald-100">{notice}</div> : null}
      {(loading || booting) && !data ? <div className="grid h-40 place-items-center text-cyan-200"><Loader2 className="h-6 w-6 animate-spin"/></div> : null}
      {data ? <>
        <section className="rounded-[1.8rem] border border-emerald-300/20 bg-[radial-gradient(circle_at_85%_0%,rgba(16,185,129,.18),transparent_44%),#07111f] p-5">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-300"><Users className="h-4 w-4"/>SyncWorks Fan Zone</div>
          {data.group.logo_url ? <img alt="" src={data.group.logo_url} className="mx-auto mt-4 h-24 w-24 rounded-2xl object-cover"/> : null}
          <h1 className="mt-3 text-center text-2xl font-black">{data.group.name}</h1>
          <p className="mt-2 text-center text-xs text-slate-300">Follow the team and get the link as soon as GameCast goes live. Fans never need the player password.</p>
          {user ? <div className="mt-4 space-y-2">
            {data.following ? <>
              <div className="flex items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-3 text-xs font-bold text-emerald-100"><CheckCircle2 className="h-4 w-4"/>Following as {user.email}</div>
              <button type="button" disabled={busy} onClick={()=>follow(!data.email_updates)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-3 text-sm font-bold text-cyan-100 disabled:opacity-40">
                {data.email_updates ? <><BellOff className="h-4 w-4"/>Turn off live email updates</> : <><Bell className="h-4 w-4"/>Turn on live email updates</>}
              </button>
              <button type="button" disabled={busy} onClick={unfollow} className="min-h-10 w-full text-xs text-slate-400 underline disabled:opacity-40">Unfollow this team</button>
            </> : <button type="button" disabled={busy} onClick={()=>follow(true)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-3 text-sm font-black text-slate-950 disabled:opacity-40"><Bell className="h-4 w-4"/>Follow + email me live GameCast links</button>}
          </div> : <div className="mt-4 space-y-2">
            <p className="text-center text-xs text-slate-300">Sign in for free to follow and opt in to email alerts.</p>
            <button type="button" onClick={()=>window.location.assign("/register?next="+encodeURIComponent("/social/fan/"+token))} className="min-h-12 w-full rounded-xl bg-emerald-300 text-sm font-black text-slate-950">Create free fan account</button>
            <button type="button" onClick={()=>window.location.assign("/login?next="+encodeURIComponent("/social/fan/"+token))} className="min-h-12 w-full rounded-xl border border-white/20 text-sm font-bold">Sign in as fan</button>
          </div>}
          <button type="button" onClick={share} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-emerald-300/25 bg-emerald-300/10 text-sm font-black text-emerald-100"><Share2 className="h-4 w-4"/>Share with other fans</button>
          <input aria-label="Shareable team invitation" value={inviteUrl} readOnly onFocus={(event)=>event.target.select()} className="mt-2 min-h-10 w-full rounded-lg border border-white/10 bg-black/20 p-2 text-[10px] text-slate-300"/>
        </section>

        <section className="rounded-2xl border border-emerald-300/20 bg-[#07111f] p-4">
          <h2 className="flex items-center gap-2 text-sm font-black"><Radio className="h-4 w-4 text-emerald-300"/>Live GameCast</h2>
          <div className="mt-3 space-y-2">
            {liveGames.map((game)=><div key={game.id} className="rounded-xl border border-emerald-300/20 bg-emerald-300/[.05] p-3"><b className="block text-sm">vs {game.opponent_name}</b><span className="mt-1 block text-xs text-slate-300">Live score: {game.runs_for} – {game.runs_against}</span>{game.gamecast_url ? <button type="button" onClick={()=>navigate(game.gamecast_url)} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 text-sm font-black text-slate-950"><Radio className="h-4 w-4"/>Watch GameCast</button> : <p className="mt-2 text-xs text-amber-200">The official book is live. GameCast sharing is not enabled yet.</p>}</div>)}
            {!liveGames.length ? <p className="rounded-xl border border-dashed border-white/15 p-4 text-center text-xs text-slate-400">No games live right now. Upcoming games appear below.</p> : null}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#07111f] p-4">
          <h2 className="flex items-center gap-2 text-sm font-black"><CalendarDays className="h-4 w-4 text-cyan-300"/>Upcoming games</h2>
          <div className="mt-3 space-y-2">{upcomingGames.map((game)=><div key={game.id} className="rounded-xl border border-white/10 bg-white/[.025] p-3"><b className="block text-xs">vs {game.opponent_name}</b><span className="mt-1 block text-xs text-slate-400">{new Date(game.start_at).toLocaleString([], { dateStyle:"medium", timeStyle:"short" })}</span></div>)}
          {!upcomingGames.length ? <p className="text-xs text-slate-400">No upcoming games have been scheduled.</p> : null}</div>
        </section>

        {completedGames.length ? <section className="rounded-2xl border border-white/10 bg-[#07111f] p-4"><h2 className="text-sm font-black">Recent results</h2><div className="mt-3 space-y-2">{completedGames.map((game)=><div key={game.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs"><span className="truncate">vs {game.opponent_name}</span><b className="shrink-0">{game.runs_for} – {game.runs_against}</b></div>)}</div></section> : null}
      </> : null}
    </main>
  </div>;
}
