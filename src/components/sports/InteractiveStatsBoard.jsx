import React, { useRef, useState } from "react";
import { GripVertical, Plus, Trophy } from "lucide-react";

const num = (value) => Number(value || 0);
const pct = (value) => num(value).toFixed(3).replace(/^0(?=\.)/, "");

const METRICS = {
  avg: { label: "AVG", format: pct },
  obp: { label: "OBP", format: pct },
  slg: { label: "SLG", format: pct },
  ops: { label: "OPS", format: pct },
  h: { label: "H", format: (v) => num(v) },
  hr: { label: "HR", format: (v) => num(v) },
  rbi: { label: "RBI", format: (v) => num(v) },
  runs: { label: "R", format: (v) => num(v) },
};

export default function InteractiveStatsBoard({ rows, scope, onScope, managerView, onAdd }) {
  const [sortKey, setSortKey] = useState("ops");
  const [metricOrder, setMetricOrder] = useState(["avg", "obp", "slg", "ops", "h", "hr", "rbi", "runs"]);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ timer: null, active: false, index: null });

  const cleanRows = Array.isArray(rows) ? rows : [];
  const sorted = [...cleanRows].sort((a, b) => num(b?.[sortKey]) - num(a?.[sortKey]));
  const leaderMetrics = ["avg", "ops", "hr", "rbi"];
  const leaders = leaderMetrics.map((key) => {
    const leader = [...cleanRows].sort((a, b) => num(b?.[key]) - num(a?.[key]))[0] || null;
    return { key, leader };
  });

  function reorder(from, to) {
    if (from === to || from == null || to == null) return;
    setMetricOrder((current) => {
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  function dragStart(event, index) {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = {
      timer: window.setTimeout(() => {
        dragRef.current.active = true;
        setDragging(true);
      }, 180),
      active: false,
      index,
    };
  }

  function dragMove(event) {
    if (!dragRef.current.active) return;
    event.preventDefault();
    const chip = document.elementFromPoint(event.clientX, event.clientY)?.closest?.("[data-stat-chip]");
    if (!chip) return;
    const to = Number(chip.dataset.statChip);
    const from = Number(dragRef.current.index);
    if (Number.isNaN(to) || to === from) return;
    reorder(from, to);
    dragRef.current.index = to;
  }

  function dragEnd() {
    window.clearTimeout(dragRef.current.timer);
    dragRef.current.active = false;
    dragRef.current.index = null;
    setDragging(false);
  }

  return (
    <section className="rounded-[1.35rem] border border-white/10 bg-[#07111f]/95 p-3.5 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-white">Season stats</h2>
          <p className="mt-1 text-[10px] leading-4 text-slate-500">Tap a metric to rank the roster. Press and hold a chip to drag your stat order.</p>
        </div>
        {managerView ? <button type="button" onClick={onAdd} className="min-h-10 rounded-xl bg-amber-300 px-3 text-[10px] font-black text-slate-950"><Plus className="mr-1 inline h-4 w-4" />Add stats</button> : <Trophy className="h-4 w-4 text-amber-300" />}
      </div>

      <div className="mt-3">
        <div className="mb-1.5 flex items-center gap-1 text-[8px] font-black uppercase tracking-[.14em] text-amber-300"><Trophy className="h-3.5 w-3.5" />Team leaders</div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {leaders.map(({ key, leader }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSortKey(key)}
              className={`rounded-xl border p-2 text-left transition ${sortKey === key ? "border-amber-300/30 bg-amber-300/10" : "border-white/10 bg-black/15"}`}
            >
              <div className="text-[7px] font-black uppercase tracking-wide text-slate-500">{METRICS[key].label}</div>
              <div className="mt-1 truncate text-[10px] font-black text-white">{leader?.player?.display_name || "—"}</div>
              <div className="mt-0.5 text-sm font-black text-amber-200">{leader ? METRICS[key].format(leader?.[key]) : "—"}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
        {["ALL", "LEAGUE", "TOURNAMENT"].map((value) => (
          <button key={value} type="button" onClick={() => onScope?.(value)} className={`shrink-0 rounded-full px-3 py-1.5 text-[9px] font-black ${scope === value ? "bg-amber-300 text-slate-950" : "border border-white/10 text-slate-400"}`}>
            {value === "ALL" ? "Combined" : value[0] + value.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className={`mt-2 flex gap-1.5 overflow-x-auto pb-1 ${dragging ? "select-none" : ""}`}>
        {metricOrder.map((key, index) => (
          <button
            key={key}
            type="button"
            data-stat-chip={index}
            onClick={() => { if (!dragRef.current.active) setSortKey(key); }}
            onPointerDown={(event) => dragStart(event, index)}
            onPointerMove={dragMove}
            onPointerUp={dragEnd}
            onPointerCancel={dragEnd}
            style={{ touchAction: "pan-y" }}
            className={`flex min-h-9 shrink-0 items-center gap-1 rounded-xl border px-2.5 text-[9px] font-black ${sortKey === key ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100" : "border-white/10 text-slate-400"}`}
          >
            <GripVertical className="h-3 w-3" /> {METRICS[key].label}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-2">
        {sorted.map((row, rank) => (
          <div key={row.player?.id} className="rounded-xl border border-white/10 bg-white/[.025] p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0"><span className="mr-2 text-[9px] font-black text-cyan-300">#{rank + 1}</span><b className="truncate text-xs text-white">#{row.player?.jersey_number || "—"} {row.player?.display_name}</b></div>
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-[8px] font-black text-cyan-100">{METRICS[sortKey].label} {METRICS[sortKey].format(row?.[sortKey])}</span>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1">
              {metricOrder.slice(0, 8).map((key) => (
                <button key={key} type="button" onClick={() => setSortKey(key)} className={`rounded-lg border p-1.5 text-left ${sortKey === key ? "border-cyan-300/20 bg-cyan-300/[.06]" : "border-white/10 bg-black/15"}`}>
                  <div className="text-[7px] font-black uppercase text-slate-500">{METRICS[key].label}</div>
                  <div className="mt-0.5 text-[11px] font-black text-white">{METRICS[key].format(row?.[key])}</div>
                </button>
              ))}
            </div>
          </div>
        ))}
        {!sorted.length ? <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-slate-500">No stats recorded yet.</div> : null}
      </div>
    </section>
  );
}
