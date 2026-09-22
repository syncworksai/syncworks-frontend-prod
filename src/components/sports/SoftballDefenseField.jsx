import React from "react";

const cx = (...values) => values.filter(Boolean).join(" ");
const COORDS = {
  LF: [13, 23], LC: [32, 13], CF: [50, 10], RC: [68, 13], RF: [87, 23], OF: [50, 18],
  "3B": [20, 59], SS: [34, 48], MM: [50, 38], "2B": [66, 48], "1B": [80, 59],
  P: [50, 67], C: [50, 88],
};
const HITTER_ONLY = new Set(["EH", "EH1", "EH2", "DH"]);
const TIERS = {
  DIAMOND: "#C084FC", GOLD: "#FBBF24", SILVER: "#38BDF8", BRONZE: "#CD7F32",
};
const playerOf = (spot) => spot?.player_detail || (typeof spot?.player === "object" ? spot.player : null) || null;

export default function SoftballDefenseField({
  lineup = [], bench = [], title = "Defense", compact = false,
  badgeRings = {}, onEditPosition = null,
}) {
  const defensive = [];
  const hittersOnly = [];
  const unassigned = [];
  const byPosition = new Map();
  for (const spot of lineup || []) {
    const position = String(spot?.defensive_position || "").toUpperCase();
    if (HITTER_ONLY.has(position)) hittersOnly.push(spot);
    else if (COORDS[position]) {
      defensive.push(spot);
      byPosition.set(position, [...(byPosition.get(position) || []), spot]);
    } else unassigned.push(spot);
  }
  const duplicates = [...byPosition.entries()].filter(([, values]) => values.length > 1);
  const hasMiddle = byPosition.has("MM");
  const showMiddle = hasMiddle || onEditPosition || byPosition.has("SS") || byPosition.has("2B");
  const visibleOutfield = [...byPosition.keys()].filter(p => ["LF","LC","CF","RC","RF","OF"].includes(p)).length;
  const halo = (spot) => {
    const rank = badgeRings?.[Number(spot.player)] || badgeRings?.[Number(spot.player?.id)] || {};
    const tier = String(rank.highest_tier || "LOCKED").toUpperCase();
    return tier !== "LOCKED" ? { borderColor: TIERS[tier] || "#38BDF8", boxShadow: `0 0 12px ${TIERS[tier] || "#38BDF8"}6b` } : {};
  };
  return (
    <section className={cx("rounded-2xl border border-emerald-300/15 bg-[#06131a] p-2.5", compact && "p-2")}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[.14em] text-emerald-300">{title}</div>
          <p className="mt-0.5 text-[9px] text-slate-400">{hasMiddle ? "5-man middle infield assigned" : "Middle man (MM) is not yet assigned"} · {visibleOutfield} outfield slots</p>
        </div>
        <div className="shrink-0 rounded-lg border border-emerald-300/20 bg-emerald-300/[.06] px-2 py-1 text-[9px] font-black text-emerald-100">{byPosition.size} positions filled</div>
      </div>
      <div className={cx("relative mx-auto overflow-hidden rounded-t-[50%] rounded-b-[1.25rem] border border-emerald-300/20 bg-[radial-gradient(ellipse_at_50%_68%,rgba(168,112,54,.78)_0_20%,transparent_20.5%),radial-gradient(ellipse_at_50%_58%,rgba(7,74,41,.98)_0_52%,rgba(4,46,29,.98)_74%,rgba(3,29,24,1)_100%)] shadow-[inset_0_0_40px_rgba(0,0,0,.35)]", compact ? "h-60" : "h-80")}>
        <div className="absolute left-1/2 top-[68%] h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 rotate-45 border-[5px] border-amber-100/15 bg-amber-100/[.035]" />
        <div className="absolute left-1/2 top-[68%] h-[26%] w-[26%] -translate-x-1/2 -translate-y-1/2 rotate-45 border border-white/18" />
        <div className="absolute bottom-[10%] left-1/2 h-[72%] w-px origin-bottom -rotate-[38deg] bg-white/25" />
        <div className="absolute bottom-[10%] right-1/2 h-[72%] w-px origin-bottom rotate-[38deg] bg-white/25" />
        <div className="absolute left-1/2 top-[61%] h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-100/25 bg-amber-100/[.12]" />
        <div className="absolute left-1/2 top-[80%] h-4 w-4 -translate-x-1/2 rotate-45 border border-white/40 bg-white/25" />
        <div className="absolute left-[36.5%] top-[66%] h-3 w-3 -translate-x-1/2 rotate-45 border border-white/35 bg-white/20" />
        <div className="absolute left-[63.5%] top-[66%] h-3 w-3 -translate-x-1/2 rotate-45 border border-white/35 bg-white/20" />
        <div className="absolute left-1/2 top-[51.5%] h-3 w-3 -translate-x-1/2 rotate-45 border border-white/35 bg-white/20" />
        <div className="absolute left-3 top-3 rounded-full border border-emerald-200/15 bg-black/20 px-2 py-1 text-[7px] font-black uppercase tracking-[.12em] text-emerald-100/70">Softball field</div>
        {[...byPosition.entries()].map(([position, spots]) => {
          const coords = COORDS[position];
          const spot = spots[0];
          const player = playerOf(spot);
          const name = player?.display_name || "Player";
          const rank = badgeRings?.[Number(spot.player)] || {};
          return <button
            key={position} type="button" disabled={!onEditPosition}
            onClick={() => onEditPosition(position)}
            aria-label={`${position}: ${name}${onEditPosition ? ". Edit position." : ""}`}
            className={cx("absolute z-10 -translate-x-1/2 -translate-y-1/2", onEditPosition && "cursor-pointer")}
            style={{ left: `${coords[0]}%`, top: `${coords[1]}%` }}
          >
            <div className="max-w-[5.9rem] rounded-lg border border-cyan-200/25 bg-[#03101a]/95 px-1.5 py-1 text-center shadow-lg backdrop-blur" style={halo(spot)}>
              <div className="text-[7px] font-black text-emerald-300">{position}</div>
              <div className="truncate text-[9px] font-black text-white">{name}</div>
              {rank.highest_tier && rank.highest_tier !== "LOCKED" ? <div className="text-[7px] font-black" style={{ color: TIERS[rank.highest_tier] || "#38BDF8" }}>{rank.highest_tier}</div> : null}
              {spots.length > 1 ? <div className="mt-0.5 text-[8px] font-black text-rose-300">+{spots.length-1} duplicate</div> : null}
            </div>
          </button>;
        })}
        {showMiddle && !hasMiddle ? <button
          type="button" disabled={!onEditPosition} onClick={() => onEditPosition?.("MM")}
          className="absolute left-1/2 top-[38%] z-10 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-dashed border-amber-300/65 bg-[#06131a]/95 px-2.5 py-1.5 text-center text-amber-100"
        ><span className="block text-[8px] font-black">MM</span><span className="block whitespace-nowrap text-[8px]">{onEditPosition ? "Tap to assign" : "Unassigned"}</span></button> : null}
        {!defensive.length ? <div className="absolute inset-0 grid place-items-center text-xs text-slate-400">Set defensive positions to build the field.</div> : null}
      </div>
      {duplicates.length ? <div role="status" className="mt-2 rounded-xl border border-rose-300/25 bg-rose-300/10 p-2 text-[10px] text-rose-100">Duplicate defensive positions: {duplicates.map(([position])=>position).join(", ")}. Correct the lineup before the first pitch.</div> : null}
      {hittersOnly.length ? <div className="mt-2"><div className="mb-1 text-[9px] font-black uppercase text-violet-200">Extra hitters (EH / DH)</div><div className="flex flex-wrap gap-1.5">{hittersOnly.map((spot, i) => {
        const player = playerOf(spot);
        return <div key={spot.id || spot.player || i} className="rounded-xl border border-violet-300/25 bg-violet-300/[.07] px-2.5 py-2 text-[10px]" style={halo(spot)}><b className="text-violet-200">{spot.defensive_position}</b><span className="ml-2 text-white">{player?.display_name || "Player"}</span></div>;
      })}</div></div> : null}
      {unassigned.length ? <div className="mt-2 rounded-xl border border-amber-300/15 bg-amber-300/[.04] p-2 text-[10px] text-amber-100">{unassigned.length} hitter{unassigned.length===1?"":"s"} still need a position or EH slot: {unassigned.map(spot=>playerOf(spot)?.display_name || "Player").join(", ")}</div> : null}
      <div className="mt-2">
        <div className="mb-1 flex justify-between text-[9px] font-black uppercase text-amber-200"><span>SUB / Bench</span><span>{bench.length} available</span></div>
        {bench.length ? <div className="flex flex-wrap gap-1.5">{bench.map((player)=> {
          const rank=badgeRings?.[Number(player.id)]||{};
          return <div key={player.id} className="rounded-xl border border-amber-300/20 bg-amber-300/[.04] px-2.5 py-1.5 text-[10px] text-white" style={rank.highest_tier&&rank.highest_tier!=="LOCKED"?{borderColor:TIERS[rank.highest_tier],boxShadow:`0 0 10px ${TIERS[rank.highest_tier]}44`}:{}}>{player.jersey_number?"#"+player.jersey_number+" · ":""}{player.display_name}</div>;
        })}</div> : <p className="text-[10px] text-slate-500">No bench players are currently loaded.</p>}
      </div>
      <p className="mt-2 text-[9px] leading-4 text-slate-500">Colored halos represent earned Bronze, Silver (blue), Gold or Diamond (purple) badges—not manually assigned ratings.</p>
    </section>
  );
}
