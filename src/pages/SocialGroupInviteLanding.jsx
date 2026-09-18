import React, { useEffect, useState } from "react";
import { CheckCircle2, Link2, Loader2, LogIn, UserPlus, Users } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { previewGroupInviteLink, requestJoinGroup } from "../api/social";

const errorText = (error) => error?.response?.data?.detail || error?.message || "Something went wrong.";

export default function SocialGroupInviteLanding() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, booting } = useAuth();

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await previewGroupInviteLink(token);
        if (alive) setPreview(data);
      } catch (err) {
        if (alive) setError(errorText(err));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token]);

  async function requestAccess() {
    setBusy(true);
    setError("");
    try {
      const result = await requestJoinGroup(token);
      setDone(result);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading || booting) {
    return <div className="grid min-h-screen place-items-center bg-[#02060c] text-cyan-200"><Loader2 className="h-7 w-7 animate-spin" /></div>;
  }

  const returnPath = "/social/invite/" + token;
  const next = encodeURIComponent(returnPath);

  return (
    <div className="min-h-screen bg-[#02060c] px-4 py-8 text-slate-100">
      <main className="mx-auto max-w-md">
        <div className="rounded-[2rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_80%_0%,rgba(34,211,238,.16),transparent_35%),#07111f] p-5 shadow-2xl">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-cyan-300">
            <Link2 className="h-4 w-4" />
            SyncWorks Group Invite
          </div>

          {error ? <div className="mt-4 rounded-xl border border-rose-300/20 bg-rose-300/10 p-3 text-sm text-rose-100">{error}</div> : null}

          {preview ? (
            <>
              <h1 className="mt-4 text-2xl font-black text-white">{preview.group?.name}</h1>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                <Users className="h-4 w-4 text-cyan-300" />
                {preview.group?.kind || "GROUP"} · {preview.role || "MEMBER"}
              </div>
              {preview.group?.description ? <p className="mt-3 text-sm leading-6 text-slate-400">{preview.group.description}</p> : null}
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-400">
                Shared by <b className="text-white">{preview.invited_by?.display_name || preview.invited_by?.email || "a group manager"}</b>.
              </div>

              {done ? (
                <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4">
                  <CheckCircle2 className="h-6 w-6 text-emerald-300" />
                  <div className="mt-2 font-black text-emerald-100">{done.already_member ? "You’re already in this group." : "Request sent."}</div>
                  <p className="mt-1 text-xs leading-5 text-emerald-100/70">
                    {done.already_member
                      ? "Open SyncWorks Social to continue."
                      : "A group manager will see your request in Invites and can approve it."}
                  </p>
                  <button type="button" onClick={() => navigate("/connect", { replace: true })} className="mt-4 w-full rounded-xl bg-emerald-300 px-4 py-3 text-sm font-black text-slate-950">
                    Open SyncWorks Social
                  </button>
                </div>
              ) : user ? (
                <button type="button" disabled={busy} onClick={requestAccess} className="mt-4 w-full rounded-xl bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50">
                  {busy ? "Sending…" : "Request to join"}
                </button>
              ) : (
                <div className="mt-4 space-y-2">
                  <button type="button" onClick={() => window.location.assign("/register?next=" + next)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950">
                    <UserPlus className="h-4 w-4" />
                    Create free SyncWorks account
                  </button>
                  <button type="button" onClick={() => window.location.assign("/login?next=" + next)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-black text-white">
                    <LogIn className="h-4 w-4" />
                    I already have SyncWorks
                  </button>
                </div>
              )}
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
