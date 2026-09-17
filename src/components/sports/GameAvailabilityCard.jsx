import React from "react";
import { Check, Clock3, UserRoundCheck, UserRoundX, Users } from "lucide-react";

const list = (value) => Array.isArray(value) ? value : [];
const nameOf = (player) => player?.display_name || "Player";

export function availabilityStatus(player, game, responses) {
  if (!game?.social_event) return "PENDING";
  if (!player?.user) return "UNLINKED";
  const response = list(responses).find(
    (row) => Number(row.event) === Number(game.social_event)
      && Number(row.user) === Number(player.user),
  );
  return response?.response || "PENDING";
}

const config = {
  YES: { label: "IN", tone: "border-emerald-300/20 bg-emerald-300/10 text-emerald-100" },
  NO: { label: "OUT", tone: "border-rose-300/20 bg-rose-300/10 text-rose-100" },
  MAYBE: { label: "SUB", tone: "border-amber-300/20 bg-amber-300/10 text-amber-100" },
  PENDING: { label: "WAITING", tone: "border-white/10 bg-white/[.04] text-slate-400" },
  UNLINKED: { label: "UNLINKED", tone: "border-violet-300/20 bg-violet-300/10 text-violet-100" },
};

export default function GameAvailabilityCard({
  game,
  players,
  responses,
  userId,
  managerView,
  onRespond,
}) {
  if (!game) {
    return (
      <section className="rounded-[1.35rem] border border-white/10 bg-[#07111f]/95 p-3.5">
        <h2 className="text-sm font-black text-white">Next-game availability</h2>
        <p className="mt-2 text-[10px] text-slate-500">No upcoming game is scheduled.</p>
      </section>
    );
  }

  const rows = list(players).map((player) => ({ player, status: availabilityStatus(player, game, responses) }));
  const byStatus = (status) => rows.filter((row) => row.status === status);
  const myPlayer = rows.find((row) => Number(row.player?.user) === Number(userId));
  const counts = {
    YES: byStatus("YES").length,
    NO: byStatus("NO").length,
    MAYBE: byStatus("MAYBE").length,
    PENDING: byStatus("PENDING").length,
    UNLINKED: byStatus("UNLINKED").length,
  };

  return (
    <section className="rounded-[1.35rem] border border-emerald-300/15 bg-[#07111f]/95 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[.14em] text-emerald-300">Next game</div>
          <h2 className="mt-1 text-sm font-black text-white">
            {new Date(game.start_at).toLocaleDateString()} · vs {game.opponent_name}
          </h2>
          <div className="mt-0.5 text-[9px] text-slate-500">{game.venue_name || "Field TBD"}</div>
        </div>
        <Users className="h-4 w-4 text-emerald-300" />
      </div>

      <div className="mt-3 grid grid-cols-5 gap-1">
        {[
          ["YES", counts.YES],
          ["NO", counts.NO],
          ["MAYBE", counts.MAYBE],
          ["PENDING", counts.PENDING],
          ["UNLINKED", counts.UNLINKED],
        ].map(([status, count]) => (
          <div key={status} className={`rounded-lg border p-1.5 text-center ${config[status].tone}`}>
            <div className="text-sm font-black">{count}</div>
            <div className="text-[7px] font-black uppercase">{config[status].label}</div>
          </div>
        ))}
      </div>

      {myPlayer ? (
        <div className="mt-3">
          <div className="mb-1.5 text-[9px] font-black uppercase tracking-wide text-slate-500">Are you playing?</div>
          <div className="grid grid-cols-3 gap-1.5">
            <button type="button" onClick={() => onRespond?.(game, "YES")} className={`min-h-10 rounded-xl border text-[10px] font-black ${myPlayer.status === "YES" ? config.YES.tone : "border-white/10 text-slate-400"}`}><Check className="mr-1 inline h-3.5 w-3.5" />IN</button>
            <button type="button" onClick={() => onRespond?.(game, "NO")} className={`min-h-10 rounded-xl border text-[10px] font-black ${myPlayer.status === "NO" ? config.NO.tone : "border-white/10 text-slate-400"}`}><UserRoundX className="mr-1 inline h-3.5 w-3.5" />OUT</button>
            <button type="button" onClick={() => onRespond?.(game, "MAYBE")} className={`min-h-10 rounded-xl border text-[10px] font-black ${myPlayer.status === "MAYBE" ? config.MAYBE.tone : "border-white/10 text-slate-400"}`}><Clock3 className="mr-1 inline h-3.5 w-3.5" />SUB</button>
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-violet-300/15 bg-violet-300/[.04] p-2.5 text-[9px] text-violet-100">
          Link your SyncWorks account to a roster player to confirm IN / OUT / SUB yourself.
        </div>
      )}

      {managerView ? (
        <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {[
            ["YES", UserRoundCheck],
            ["NO", UserRoundX],
            ["MAYBE", Clock3],
            ["PENDING", Clock3],
          ].map(([status, Icon]) => {
            const items = byStatus(status);
            return (
              <div key={status} className="rounded-xl border border-white/10 bg-black/15 p-2">
                <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wide text-slate-500"><Icon className="h-3 w-3" />{config[status].label}</div>
                <div className="mt-1 text-[9px] leading-4 text-slate-300">{items.length ? items.map((row) => nameOf(row.player)).join(" · ") : "—"}</div>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
