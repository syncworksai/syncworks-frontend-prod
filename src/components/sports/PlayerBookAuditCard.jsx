import React from "react";
import { AlertCircle, Camera, CheckCircle2, ChevronRight, ClipboardCheck } from "lucide-react";

const statusCopy = {
  MISSING_PLAYS: { label: "Play-by-play needed", tone: "text-amber-200 border-amber-300/20 bg-amber-300/[.07]" },
  SOURCE_NOT_UPLOADED: { label: "Original photo needed", tone: "text-amber-200 border-amber-300/20 bg-amber-300/[.07]" },
  SOURCE_REVIEW_PENDING: { label: "Photo review pending", tone: "text-amber-200 border-amber-300/20 bg-amber-300/[.07]" },
  SOURCE_PHOTO_REVIEWED: { label: "Source photo reviewed", tone: "text-emerald-200 border-emerald-300/20 bg-emerald-300/[.07]" },
};

export default function PlayerBookAuditCard({ audit, loading = false, onOpenGame, coach = false }) {
  const games = Array.isArray(audit?.games) ? audit.games : [];
  return <section className="rounded-2xl border border-amber-300/20 bg-[linear-gradient(155deg,rgba(251,191,36,.07),rgba(7,17,31,.95))] p-3">
    <div className="flex items-start gap-2">
      <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />
      <div className="min-w-0">
        <h3 className="text-sm font-black text-white">Game Book stat verification</h3>
        <p className="mt-1 text-[10px] leading-4 text-slate-400">Final scores and batting orders may already be recorded. Individual hits and RBIs are incomplete until each paper book has been reviewed. Linking an account never adds or duplicates stats.</p>
      </div>
    </div>
    {loading ? <p className="mt-3 text-[10px] text-cyan-200">Checking the original game records…</p> : null}
    {!loading && !games.length ? <p className="mt-3 text-[10px] text-slate-500">No completed Game Books found for this player yet.</p> : null}
    {games.length ? <div className="mt-3 space-y-2">{games.map((row) => {
      const status = statusCopy[row.status] || statusCopy.MISSING_PLAYS;
      return <div key={row.game_id} className="rounded-xl border border-white/10 bg-black/20 p-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[8px] font-black uppercase tracking-wider text-slate-500">{new Date(row.start_at).toLocaleDateString()} · {row.home_away || "GAME"}</div>
            <div className="mt-0.5 text-xs font-black text-white">vs {row.opponent_name}</div>
            <div className="mt-1 text-[9px] text-slate-400">{row.appearance_count} PA recorded · {row.hits_recorded} H · {row.rbi_recorded} RBI</div>
          </div>
          <span className="shrink-0 text-xs font-black text-white">{row.runs_for}–{row.runs_against}</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[8px] font-black ${status.tone}`}>
            {row.status === "SOURCE_PHOTO_REVIEWED" ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
            {status.label}
          </span>
          {onOpenGame ? <button type="button" onClick={() => onOpenGame(row.game_id)} className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-2 text-[9px] font-black text-cyan-100">
            {coach ? <Camera className="h-3.5 w-3.5" /> : null}{coach ? "Review book" : "View game"}<ChevronRight className="h-3 w-3" />
          </button> : null}
        </div>
      </div>;
    })}</div> : null}
    {games.length ? <p className="mt-2 text-[9px] text-amber-100">{audit.games_needing_review} of {games.length} completed games still need original-scorebook review.</p> : null}
  </section>;
}
