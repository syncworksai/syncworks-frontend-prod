import React, { useEffect, useState } from "react";
import { CheckCircle2, Loader2, LogIn, ShieldCheck, UserPlus, Users } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { claimTeamPlayerInvite, previewTeamPlayerInvite } from "../api/sports";

const errorText = (error) => error?.response?.data?.detail || error?.message || "Something went wrong.";

export default function SportsTeamInviteLanding() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, booting } = useAuth();

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await previewTeamPlayerInvite(token);
        if (alive) setPreview(data);
      } catch (err) {
        if (alive) setError(errorText(err));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token]);

  async function claim() {
    setClaiming(true);
    setError("");
    try {
      const result = await claimTeamPlayerInvite(token);
      setDone(result);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setClaiming(false);
    }
  }

  if (loading || booting) {
    return <div className="grid min-h-screen place-items-center bg-[#02060c] text-cyan-200"><Loader2 className="h-7 w-7 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#02060c] px-4 py-8 text-slate-100">
      <main className="mx-auto max-w-md">
        <div className="rounded-[2rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_80%_0%,rgba(34,211,238,.18),transparent_34%),radial-gradient(circle_at_0%_100%,rgba(139,92,246,.14),transparent_35%),#07111f] p-5 shadow-2xl">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-cyan-300">
            <ShieldCheck className="h-4 w-4" />
            SyncWorks Player Invite
          </div>

          {error ? <div className="mt-4 rounded-xl border border-rose-300/20 bg-rose-300/10 p-3 text-sm text-rose-100">{error}</div> : null}

          {preview ? (
            <>
              <h1 className="mt-4 text-2xl font-black text-white">Join {preview.team_name}</h1>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {[preview.league_name, preview.division_name, preview.season_name].filter(Boolean).join(" · ") || "SyncWorks team"}
              </p>

              <div className="mt-4 grid grid-cols-[4.4rem_1fr] gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                <div className="grid h-[4.4rem] w-[4.4rem] place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-xl font-black text-cyan-100">
                  #{preview.jersey_number || "—"}
                </div>
                <div className="min-w-0">
                  <div className="text-[9px] font-black uppercase tracking-wide text-slate-500">Your player profile</div>
                  <div className="mt-1 truncate text-base font-black text-white">{preview.player_name}</div>
                  <div className="mt-1 text-xs text-slate-500">{preview.position || "Position TBD"} · {preview.email_masked}</div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[.025] p-3">
                <div className="flex items-center gap-2 text-xs font-black text-white"><Users className="h-4 w-4 text-cyan-300" />Where your team lives</div>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  After joining, open <b className="text-white">SyncWorks → Personal → Social → Groups → {preview.team_name}</b>.
                  Your player card, schedule, RSVP, lineup, team chat, statistics and dues stay together there.
                </p>
              </div>

              {done ? (
                <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4">
                  <CheckCircle2 className="h-6 w-6 text-emerald-300" />
                  <div className="mt-2 font-black text-emerald-100">Player profile connected.</div>
                  <p className="mt-1 text-xs leading-5 text-emerald-100/70">This SyncWorks account is now linked to your team roster profile.</p>
                  <button type="button" onClick={() => navigate(done.route || "/connect", { replace: true })} className="mt-4 w-full rounded-xl bg-emerald-300 px-4 py-3 text-sm font-black text-slate-950">Open my team dashboard</button>
                </div>
              ) : user ? (
                <div className="mt-4">
                  <div className="rounded-xl border border-white/10 bg-white/[.03] p-3 text-xs leading-5 text-slate-300">
                    Signed in as <b className="text-white">{user.email}</b>. Accepting links this account to the player profile above.
                  </div>
                  <button type="button" disabled={claiming} onClick={claim} className="mt-3 w-full rounded-xl bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50">
                    {claiming ? "Connecting…" : "Accept & join team"}
                  </button>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  <button type="button" onClick={() => window.location.assign(preview.register_url)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950">
                    <UserPlus className="h-4 w-4" />
                    Create free SyncWorks Personal account
                  </button>
                  <button type="button" onClick={() => window.location.assign(preview.login_url)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-black text-white">
                    <LogIn className="h-4 w-4" />
                    I already have SyncWorks
                  </button>
                  <p className="pt-1 text-center text-[10px] leading-4 text-slate-500">Use the same email address that received this invitation.</p>
                </div>
              )}
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
