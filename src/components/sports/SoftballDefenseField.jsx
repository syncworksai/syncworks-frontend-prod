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

      <div className={cx("relative mx-auto overflow-hidden rounded-t-[50%] rounded-b-[1.25rem] border border-emerald-300/20 bg-[radial-gradient(ellipse_at_50%_68%,rgba(168,112,54,.78)_0_20%,transparent_20.5%),radial-gradient(ellipse_at_50%_58%,rgba(7,74,41,.98)_0_52%,rgba(4,46,29,.98)_74%,rgba(3,29,24,1)_100%)] shadow-[inset_0_0_40px_rgba(0,0,0,.35)]", compact ? "h-56" : "h-72")}>
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
