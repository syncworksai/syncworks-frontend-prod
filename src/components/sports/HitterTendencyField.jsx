import React from "react";

const num = (value) => Number(value || 0);

function tone(pct, max) {
  if (!pct) return "fill-white/[.025] stroke-white/10";
  if (pct === max) return "fill-rose-400/20 stroke-rose-300/35";
  if (pct >= 25) return "fill-amber-300/15 stroke-amber-300/25";
  return "fill-emerald-300/10 stroke-emerald-300/20";
}

export default function HitterTendencyField({ tendencies, compact = false }) {
  const zones = tendencies?.field_zones || {};
  const values = {
    left: num(zones.left?.pct),
    left_center: num(zones.left_center?.pct),
    center: num(zones.center?.pct),
    right_center: num(zones.right_center?.pct),
    right: num(zones.right?.pct),
  };
  const max = Math.max(...Object.values(values), 0);
  const sample = num(tendencies?.spray_sample);

  return (
    <section className="overflow-hidden rounded-2xl border border-emerald-300/15 bg-[#06110e]">
      <div className="flex items-center justify-between gap-2 px-3 pt-3">
        <div>
          <div className="text-[8px] font-black uppercase tracking-[.14em] text-emerald-300">Historical spray tendency</div>
          <div className="mt-0.5 text-[8px] text-slate-500">Previous charted balls · directional tendency, not a guaranteed prediction.</div>
        </div>
        <div className="shrink-0 rounded-full border border-white/10 px-2 py-1 text-[8px] font-black text-slate-300">{sample} balls</div>
      </div>

      <div className={compact ? "px-2 pb-2" : "px-2 pb-3"}>
        <svg viewBox="0 0 500 260" className={compact ? "h-auto w-full max-h-52" : "h-auto w-full max-h-64"} role="img" aria-label="Hitter spray tendency field">
          <path d="M250 238 L28 70 Q250 -24 472 70 Z" className="fill-emerald-500/[.08] stroke-emerald-300/25" strokeWidth="2" />
          <path d="M250 238 L78 92 Q250 20 422 92 Z" className="fill-black/10 stroke-white/10" strokeWidth="1.4" />
          <path d="M250 238 L188 176 L250 118 L312 176 Z" className="fill-amber-200/[.07] stroke-amber-200/20" strokeWidth="1.5" />

          <path d="M250 238 L28 70 Q84 34 142 20 L198 148 Z" className={tone(values.left, max)} strokeWidth="1.5" />
          <path d="M250 238 L142 20 Q198 5 230 2 L238 142 Z" className={tone(values.left_center, max)} strokeWidth="1.5" />
          <path d="M250 238 L230 2 Q250 0 270 2 L262 142 Z" className={tone(values.center, max)} strokeWidth="1.5" />
          <path d="M250 238 L270 2 Q302 5 358 20 L302 148 Z" className={tone(values.right_center, max)} strokeWidth="1.5" />
          <path d="M250 238 L358 20 Q416 34 472 70 L302 148 Z" className={tone(values.right, max)} strokeWidth="1.5" />

          <line x1="250" y1="238" x2="28" y2="70" className="stroke-white/20" strokeWidth="1.5" />
          <line x1="250" y1="238" x2="472" y2="70" className="stroke-white/20" strokeWidth="1.5" />
          <circle cx="250" cy="238" r="4" className="fill-cyan-300" />

          <text x="84" y="77" textAnchor="middle" className="fill-slate-200 text-[14px] font-black">{values.left.toFixed(0)}%</text>
          <text x="177" y="52" textAnchor="middle" className="fill-slate-200 text-[14px] font-black">{values.left_center.toFixed(0)}%</text>
          <text x="250" y="40" textAnchor="middle" className="fill-slate-100 text-[14px] font-black">{values.center.toFixed(0)}%</text>
          <text x="323" y="52" textAnchor="middle" className="fill-slate-200 text-[14px] font-black">{values.right_center.toFixed(0)}%</text>
          <text x="416" y="77" textAnchor="middle" className="fill-slate-200 text-[14px] font-black">{values.right.toFixed(0)}%</text>

          <text x="84" y="94" textAnchor="middle" className="fill-slate-500 text-[8px] font-black">LEFT</text>
          <text x="177" y="69" textAnchor="middle" className="fill-slate-500 text-[8px] font-black">L-C</text>
          <text x="250" y="57" textAnchor="middle" className="fill-slate-500 text-[8px] font-black">CENTER</text>
          <text x="323" y="69" textAnchor="middle" className="fill-slate-500 text-[8px] font-black">R-C</text>
          <text x="416" y="94" textAnchor="middle" className="fill-slate-500 text-[8px] font-black">RIGHT</text>
        </svg>
      </div>
    </section>
  );
}
