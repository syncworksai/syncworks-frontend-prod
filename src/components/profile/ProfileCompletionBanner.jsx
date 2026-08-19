import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronRight, MapPin, UserRound } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../api/client";

const LABELS = {
  first_name: "first name",
  last_name: "last name",
  phone: "mobile number",
  home_location: "Home address",
};

export default function ProfileCompletionBanner() {
  const location = useLocation();
  const nav = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (location.pathname !== "/customer") return undefined;
    let active = true;
    api.get("/identity/profile/")
      .then((response) => { if (active) setProfile(response?.data || null); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [location.pathname]);

  const state = useMemo(() => {
    const missing = Array.isArray(profile?.onboarding?.missing) ? profile.onboarding.missing : [];
    const requiredTotal = 4;
    const completeCount = Math.max(0, requiredTotal - missing.length);
    const percent = Math.round((completeCount / requiredTotal) * 100);
    const requiredComplete = Boolean(profile?.onboarding?.basics_complete);
    const photoMissing = !profile?.identity?.profile_photo_url;
    return { missing, percent, requiredComplete, photoMissing };
  }, [profile]);

  if (location.pathname !== "/customer" || loading || !profile) return null;
  if (state.requiredComplete && !state.photoMissing) return null;

  if (state.requiredComplete) {
    return (
      <div className="relative z-10 border-b border-violet-400/15 bg-violet-500/[.05]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-violet-400/20 bg-violet-500/10"><UserRound className="h-4 w-4 text-violet-200" /></div>
            <div className="min-w-0"><div className="text-sm font-black text-white">Improve your SyncWorks profile</div><div className="truncate text-xs text-slate-400">Add a profile photo so providers, Social and groups can recognize you when you choose to share it.</div></div>
          </div>
          <button type="button" onClick={() => nav("/profile")} className="flex shrink-0 items-center gap-1 rounded-xl border border-violet-300/25 bg-violet-500/10 px-3 py-2 text-xs font-black text-violet-100">Add photo <ChevronRight className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 border-b border-amber-400/20 bg-amber-500/[.06]">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-amber-400/20 bg-amber-500/10"><AlertCircle className="h-5 w-5 text-amber-200" /></div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><div className="text-sm font-black text-white">Finish setting up SyncWorks</div><span className="rounded-full border border-amber-400/20 bg-black/20 px-2 py-0.5 text-[10px] font-black text-amber-100">{state.percent}% complete</span></div>
              <div className="mt-1 text-xs leading-5 text-slate-400">Missing {state.missing.map((item) => LABELS[item] || item).join(", ")}. Add it once and SyncWorks can reuse it across services, notifications and location-aware features.</div>
            </div>
          </div>
          <button type="button" onClick={() => nav("/profile")} className="flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 text-xs font-black text-white"><MapPin className="h-3.5 w-3.5" /> Review profile <ChevronRight className="h-3.5 w-3.5" /></button>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/30"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500" style={{ width: `${state.percent}%` }} /></div>
      </div>
    </div>
  );
}
