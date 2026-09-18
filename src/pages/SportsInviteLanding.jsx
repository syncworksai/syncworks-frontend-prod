import React, { useEffect, useState } from "react";
import { CheckCircle2, Loader2, LogIn, UserPlus, Users } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { claimSportsInvite, previewSportsInvite } from "../api/sports";

const errorText = (error) => error?.response?.data?.detail || error?.message || "Something went wrong.";

export default function SportsInviteLanding() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const roster = searchParams.get("roster") || "";
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
        const data = await previewSportsInvite(token, roster);
        if (alive) setPreview(data);
      } catch (err) {
        if (alive) setError(errorText(err));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token, roster]);

  async function claim() {
    setClaiming(true);
    setError("");
    try {
      const result = await claimSportsInvite(token, roster);
      setDone(result);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setClaiming(false);
    }
  }

  if (loading || booting) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#02060c] text-cyan-200">
        <Loader2 className="h-7 w-7 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#02060c] px-4 py-8 text-slate-100">
      <main className="mx-auto max-w-md">
        <div className="rounded-[2rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_80%_0%,rgba(34,211,238,.15),transparent_35%),#07111f] p-5 shadow-2xl">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-cyan-300">
            <Users className="h-4 w-4" />
            SyncWorks Team Invitation
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-rose-300/20 bg-rose-300/10 p-3 text-sm text-rose-100">{error}</div>
          ) : null}

          {preview ? (
            <>
              <h1 className="mt-4 text-2xl font-black text-white">Join {preview.team_name}</h1>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {preview.league_name} · {preview.season_name} · {preview.division_name}
              </p>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-[9px] font-black uppercase tracking-wide text-slate-500">Player profile</div>
                <div className="mt-1 font-black text-white">{preview.player_name || "Invited player"}</div>
                <div className="mt-1 text-xs text-slate-500">Invitation email: {preview.email_masked}</div>
              </div>

              {done ? (
                <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4">
                  <CheckCircle2 className="h-6 w-6 text-emerald-300" />
                  <div className="mt-2 font-black text-emerald-100">You’re on the team.</div>
                  <p className="mt-1 text-xs leading-5 text-emerald-100/70">
                    Your player profile and Social group membership are linked to this SyncWorks account.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate(done.route || ("/connect/groups/" + preview.group_id + "/sports"), { replace: true })}
                    className="mt-4 w-full rounded-xl bg-emerald-300 px-4 py-3 text-sm font-black text-slate-950"
                  >
                    Open team
                  </button>
                </div>
              ) : user ? (
                <div className="mt-4">
                  <div className="rounded-xl border border-white/10 bg-white/[.03] p-3 text-xs leading-5 text-slate-300">
                    Signed in as <b className="text-white">{user.email}</b>. Accepting links this player profile and joins the team’s Social group.
                  </div>
                  <button
                    type="button"
                    disabled={claiming}
                    onClick={claim}
                    className="mt-3 w-full rounded-xl bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50"
                  >
                    {claiming ? "Joining…" : "Accept & join team"}
                  </button>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={() => window.location.assign(preview.register_url)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950"
                  >
                    <UserPlus className="h-4 w-4" />
                    Create free SyncWorks account
                  </button>
                  <button
                    type="button"
                    onClick={() => window.location.assign(preview.login_url)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-black text-white"
                  >
                    <LogIn className="h-4 w-4" />
                    I already have SyncWorks
                  </button>
                  <p className="pt-1 text-center text-[10px] leading-4 text-slate-500">
                    Use the same email that received this invitation. After signup/sign-in, you’ll return here to join the team.
                  </p>
                </div>
              )}
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
