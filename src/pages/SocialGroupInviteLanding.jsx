import React, { useEffect, useState } from "react";
import { CheckCircle2, Copy, KeyRound, Link2, Loader2, LogIn, Share2, ShieldCheck, UserPlus, Users } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { joinGroupAsPlayer, previewGroupInviteLink } from "../api/social";

const errorText = (error) => error?.response?.data?.detail || error?.message || "Unable to complete your request.";

export default function SocialGroupInviteLanding() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, booting } = useAuth();
  const [preview, setPreview] = useState(null);
  const [mode, setMode] = useState(params.get("mode") === "player" ? "PLAYER" : "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);
  const [shared, setShared] = useState("");
  const inviteUrl = window.location.origin + "/social/invite/" + token;

  useEffect(() => {
    let active = true;
    setLoading(true);
    previewGroupInviteLink(token)
      .then((data) => { if (active) setPreview(data); })
      .catch((err) => { if (active) setError(errorText(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  async function joinPlayer() {
    if (!password || busy) return;
    setBusy(true); setError("");
    try {
      const data = await joinGroupAsPlayer(token, password);
      setDone(data);
      setPassword("");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function shareInvite() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join " + (preview?.group?.name || "our team"), text: "Play or follow along on SyncWorks.", url: inviteUrl });
        setShared("Invitation shared.");
        return;
      } catch (err) {
        if (err?.name === "AbortError") return;
      }
    }
    try { await navigator.clipboard.writeText(inviteUrl); setShared("Invitation link copied."); }
    catch { setShared("Select and copy the link shown below."); }
  }

  if (loading || booting) {
    return <div className="grid min-h-screen place-items-center bg-[#02060c] text-cyan-200"><Loader2 className="h-7 w-7 animate-spin"/></div>;
  }
  const next = encodeURIComponent("/social/invite/" + token + "?mode=player");
  const fanPath = "/social/fan/" + token;

  return (
    <div className="min-h-screen bg-[#02060c] px-3 py-[max(1.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] text-slate-100">
      <main className="mx-auto max-w-md space-y-3">
        <section className="rounded-[2rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_80%_0%,rgba(34,211,238,.16),transparent_35%),radial-gradient(circle_at_0%_100%,rgba(139,92,246,.14),transparent_35%),#07111f] p-5 shadow-2xl">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-cyan-300"><Link2 className="h-4 w-4"/>SyncWorks team invitation</div>
          {error ? <div role="alert" className="mt-3 rounded-xl border border-rose-300/20 bg-rose-300/10 p-3 text-sm text-rose-100">{error}</div> : null}
          {preview ? <>
            <h1 className="mt-4 text-2xl font-black text-white">{preview.group?.name}</h1>
            <p className="mt-2 text-xs leading-5 text-slate-400">{preview.group?.description || "Join the team or follow their live games, schedule and updates."}</p>
            {preview.group?.logo_image_url || preview.group?.logo_url ? <img src={preview.group.logo_image_url || preview.group.logo_url} alt="" className="mx-auto mt-4 h-24 w-24 rounded-2xl object-cover"/> : null}

            {!mode && !done ? <div className="mt-5 space-y-3">
              <h2 className="text-center text-sm font-black text-white">How are you joining?</h2>
              <button type="button" onClick={()=>setMode("PLAYER")} className="flex min-h-[5.5rem] w-full items-center gap-4 rounded-2xl border border-cyan-300/30 bg-cyan-300/10 p-4 text-left">
                <ShieldCheck className="h-8 w-8 shrink-0 text-cyan-300"/>
                <span><b className="block text-base text-white">I'm a player</b><span className="mt-1 block text-xs leading-5 text-slate-300">Enter the team password, claim your roster profile and access team tools.</span></span>
              </button>
              <button type="button" onClick={()=>navigate(fanPath)} className="flex min-h-[5.5rem] w-full items-center gap-4 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-4 text-left">
                <Users className="h-8 w-8 shrink-0 text-emerald-300"/>
                <span><b className="block text-base text-white">I'm a fan</b><span className="mt-1 block text-xs leading-5 text-slate-300">Follow live GameCast links and get optional email alerts. No team password required.</span></span>
              </button>
            </div> : null}

            {mode === "PLAYER" && !done ? <div className="mt-5 space-y-3 rounded-2xl border border-cyan-300/20 bg-black/20 p-4">
              <button type="button" onClick={()=>setMode("")} className="text-xs font-bold text-cyan-300">← Back to player or fan</button>
              <div className="flex items-center gap-2 text-base font-black text-white"><KeyRound className="h-5 w-5 text-cyan-300"/>Player access</div>
              {user ? <>
                <p className="text-xs text-slate-300">Signed in as <b className="text-white">{user.email}</b>. Use the password provided by your team manager.</p>
                {preview.group?.has_player_join_password ? <>
                  <label className="block text-[10px] font-black uppercase text-slate-400">Team password
                    <input type="password" autoComplete="off" value={password} onChange={(event)=>setPassword(event.target.value)} placeholder="Enter player password" className="mt-2 min-h-12 w-full rounded-xl border border-cyan-300/25 bg-[#050b14] px-4 text-base font-bold text-white"/>
                  </label>
                  <button type="button" disabled={!password || busy} onClick={joinPlayer} className="min-h-12 w-full rounded-xl bg-cyan-300 px-4 text-sm font-black text-slate-950 disabled:opacity-40">{busy ? "Checking…" : "Join as player"}</button>
                </> : <p className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-xs text-amber-100">The group creator must set a player password in group settings before password-based joining is available.</p>}
              </> : <>
                <p className="text-xs text-slate-300">Sign in or create a free SyncWorks account, then enter your team's password.</p>
                <button type="button" onClick={()=>window.location.assign("/register?next="+next)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-black text-slate-950"><UserPlus className="h-4 w-4"/>Create free account</button>
                <button type="button" onClick={()=>window.location.assign("/login?next="+next)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-bold text-white"><LogIn className="h-4 w-4"/>Sign in as player</button>
              </>}
            </div> : null}

            {done ? <div className="mt-5 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-4">
              <CheckCircle2 className="h-7 w-7 text-emerald-300"/>
              <h2 className="mt-2 text-lg font-black text-white">You're on the team!</h2>
              <p className="mt-1 text-xs leading-5 text-slate-300">Open Roster and tap Add me to roster. If your account email matches a player your manager already created, we'll link to that player instead of replacing their stats.</p>
              <button type="button" onClick={()=>navigate((done.route || "/connect")+"?tab=Roster", { replace: true })} className="mt-3 min-h-12 w-full rounded-xl bg-emerald-300 px-4 text-sm font-black text-slate-950">Open my team roster</button>
            </div> : null}
          </> : null}
        </section>

        {preview ? <section className="rounded-2xl border border-white/10 bg-[#07111f] p-3">
          <button type="button" onClick={shareInvite} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-xs font-black text-cyan-100"><Share2 className="h-4 w-4"/>Share this invitation</button>
          <input readOnly aria-label="Team invitation link" value={inviteUrl} onFocus={(event)=>event.target.select()} className="mt-2 min-h-10 w-full rounded-lg border border-white/10 bg-black/20 p-2 text-[10px] text-slate-300"/>
          {shared ? <p className="mt-2 text-xs text-emerald-200">{shared}</p> : null}
        </section> : null}
      </main>
    </div>
  );
}
