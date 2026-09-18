import React from "react";

const cx = (...values) => values.filter(Boolean).join(" ");

const COORDS = {
  LF: [13, 22],
  LC: [32, 13],
  CF: [50, 10],
  RC: [68, 13],
  RF: [87, 22],
  OF: [50, 18],
  "3B": [20, 58],
  SS: [34, 48],
  MM: [50, 39],
  "2B": [66, 48],
  "1B": [80, 58],
  P: [50, 66],
  C: [50, 88],
};

function playerOf(spot) {
  return spot?.player_detail || spot?.player || null;
}

export default function SoftballDefenseField({ lineup = [], title = "Defense", compact = false }) {
  const defensive = [];
  const hittersOnly = [];
  for (const spot of lineup || []) {
    const position = String(spot?.defensive_position || "").toUpperCase();
    if (position === "EH" || position === "EH1" || position === "EH2" || position === "DH") {
      hittersOnly.push(spot);
    } else if (COORDS[position]) {
      defensive.push(spot);
    }
  }

  return (
    <section className={cx("rounded-2xl border border-emerald-300/15 bg-[#06131a] p-2.5", compact && "p-2")}>
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="text-[8px] font-black uppercase tracking-[.14em] text-emerald-300">{title}</div>
          <div className="text-[8px] text-slate-500">5-man supports MM + 3 OF</div>
        </div>
        <div className="text-[8px] font-black text-cyan-200">{defensive.length} fielded</div>
      </div>

      <div className={cx("relative mx-auto overflow-hidden rounded-[45%_45%_12%_12%] border border-emerald-300/15 bg-[radial-gradient(circle_at_50%_58%,rgba(180,125,55,.28)_0_17%,transparent_18%),linear-gradient(180deg,rgba(13,90,52,.72),rgba(5,55,34,.96))]", compact ? "h-56" : "h-72")}>
        <div className="absolute left-1/2 top-[58%] h-[40%] w-[40%] -translate-x-1/2 -translate-y-1/2 rotate-45 border border-amber-100/25 bg-amber-100/[.04]" />
        <div className="absolute left-1/2 top-[80%] h-3 w-3 -translate-x-1/2 rotate-45 border border-white/30 bg-white/20" />
        {defensive.map((spot, index) => {
          const position = String(spot.defensive_position || "").toUpperCase();
          const coords = COORDS[position];
          const player = playerOf(spot);
          const name = player?.display_name || spot?.player_detail?.display_name || "Player";
          return (
            <div
              key={spot.id || `${position}-${index}`}
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${coords[0]}%`, top: `${coords[1]}%` }}
            >
              <div className="max-w-[5.8rem] rounded-lg border border-cyan-200/25 bg-[#03101a]/90 px-1.5 py-1 text-center shadow-lg backdrop-blur">
                <div className="text-[7px] font-black text-emerald-300">{position}</div>
                <div className="truncate text-[8px] font-black text-white">{name}</div>
              </div>
            </div>
          );
        })}
        {!defensive.length ? <div className="absolute inset-0 grid place-items-center text-[10px] text-slate-500">Set defensive positions to build the field.</div> : null}
      </div>

      {hittersOnly.length ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {hittersOnly.map((spot, index) => {
            const player = playerOf(spot);
            return <div key={spot.id || index} className="rounded-lg border border-violet-300/20 bg-violet-300/[.06] px-2 py-1 text-[8px]"><b className="text-violet-200">{spot.defensive_position}</b><span className="ml-1 text-slate-300">{player?.display_name || "Player"}</span></div>;
          })}
        </div>
      ) : null}
    </section>
  );
}
