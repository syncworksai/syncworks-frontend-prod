import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Award, BarChart3, CheckCircle2, ChevronDown, ChevronUp,
  Medal, RefreshCw, Share2, ShieldCheck, Sparkles, Target, Trophy,
} from "lucide-react";

import { getWayAnalytics } from "../../api/wayAnalytics";
import { createPlayerAward } from "../../api/sports";

const cx = (...values) => values.filter(Boolean).join(" ");

function Metric({ label, value, detail, strong = false }) {
  return (
    <div className={cx(
      "rounded-xl border p-2.5",
      strong ? "border-amber-300/25 bg-amber-300/[.07]" : "border-white/10 bg-white/[.025]",
    )}>
      <div className="text-[7px] font-black uppercase tracking-[.14em] text-slate-500">{label}</div>
      <div className={cx("mt-1 text-lg font-black", strong ? "text-amber-100" : "text-white")}>{value}</div>
      {detail ? <div className="mt-0.5 text-[8px] leading-3 text-slate-600">{detail}</div> : null}
    </div>
  );
}

function FormulaBar({ weights }) {
  const rows = [
    ["Quality AB", weights?.quality_at_bats ?? 35],
    ["Situation", weights?.situation_execution ?? 25],
    ["Approach", weights?.plate_approach ?? 25],
    ["Impact", weights?.offensive_impact ?? 15],
  ];
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-xl border border-white/10 bg-black/15 px-2 py-2 text-center">
          <div className="text-base font-black text-white">{value}%</div>
          <div className="text-[7px] font-black uppercase tracking-wide text-slate-500">{label}</div>
        </div>
      ))}
    </div>
  );
}

function RankBadge({ rank }) {
  if (rank === 1) return <span className="grid h-7 w-7 place-items-center rounded-full border border-amber-300/30 bg-amber-300/10 text-[10px] font-black text-amber-100">1</span>;
  if (rank === 2) return <span className="grid h-7 w-7 place-items-center rounded-full border border-slate-300/20 bg-slate-300/[.06] text-[10px] font-black text-slate-200">2</span>;
  if (rank === 3) return <span className="grid h-7 w-7 place-items-center rounded-full border border-orange-300/20 bg-orange-300/[.06] text-[10px] font-black text-orange-100">3</span>;
  return <span className="grid h-7 w-7 place-items-center text-[9px] font-black text-slate-600">{rank}</span>;
}

function PlayerRow({ row }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#07111f]">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex min-h-14 w-full items-center gap-2.5 px-3 py-2 text-left">
        <RankBadge rank={row.rank} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-black text-white">{row.player?.display_name}</div>
          <div className="mt-0.5 text-[8px] text-slate-500">{row.pa} PA · {row.quality_at_bats} quality · {row.confidence}% confidence</div>
        </div>
        <div className="text-right">
          <div className="text-[7px] font-black uppercase tracking-wide text-cyan-300">Player Score</div>
          <div className="text-xl font-black text-white">{row.player_score}</div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-slate-600" /> : <ChevronDown className="h-4 w-4 text-slate-600" />}
      </button>
      {open ? (
        <div className="grid grid-cols-2 gap-1.5 border-t border-white/8 p-2.5 sm:grid-cols-4">
          <Metric label="Quality AB" value={`${row.qab_pct}%`} detail={`${row.quality_at_bats}/${row.pa}`} />
          <Metric label="Plate approach" value={`${row.plate_approach}%`} />
          <Metric label="Situation" value={`${row.situation_execution}%`} detail={`${row.execution_opportunities} tracked spots`} />
          <Metric label="Impact" value={`${row.impact}%`} />
          <div className="col-span-2 rounded-xl border border-white/8 bg-black/10 px-3 py-2 text-[8px] text-slate-500 sm:col-span-4">
            Damage checks: {row.strikeouts} K · {row.multi_outs} multi-out plays. These reduce quality/approach instead of being hidden by batting average.
          </div>
        </div>
      ) : null}
    </div>
  );
}

const CERTIFICATES = [
  { key: "player_score", title: "The Way We Play", subtitle: "Overall Player Score Leader", icon: Trophy, metric: "Player Score" },
  { key: "quality_at_bats", title: "Quality At-Bat Excellence", subtitle: "Team-first offensive execution", icon: CheckCircle2, metric: "QAB" },
  { key: "plate_approach", title: "Plate Approach Excellence", subtitle: "Disciplined, productive offensive decisions", icon: Target, metric: "Approach" },
  { key: "situation_execution", title: "Situational Execution", subtitle: "Did the job the game required", icon: ShieldCheck, metric: "Execution" },
];

function Certificate({ definition, leader, team, canAward, onAward, busyKey }) {
  if (!leader?.player) return null;
  const Icon = definition.icon;
  const busy = busyKey === definition.key;
  const share = async () => {
    const text = `${leader.player.display_name} — ${definition.title} · ${definition.metric} ${leader.value} · ${team?.group_name || team?.name || "Team"} · The Way We Play`;
    try {
      if (navigator.share) await navigator.share({ title: definition.title, text });
      else await navigator.clipboard.writeText(text);
    } catch {
      // Share cancellation needs no error state.
    }
  };
  return (
    <article className="relative overflow-hidden rounded-[1.4rem] border border-amber-300/25 bg-[radial-gradient(circle_at_85%_0%,rgba(250,204,21,.15),transparent_35%),linear-gradient(145deg,#0b1320,#07101c)] p-3.5 shadow-xl">
      <div className="absolute -right-5 -top-6 text-[6rem] font-black text-white/[.025]">W</div>
      <div className="relative flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-amber-300/25 bg-amber-300/10 text-amber-200"><Icon className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <div className="text-[7px] font-black uppercase tracking-[.18em] text-amber-300">Certificate of team excellence</div>
          <div className="mt-1 text-sm font-black text-white">{definition.title}</div>
          <div className="text-[8px] text-slate-500">{definition.subtitle}</div>
        </div>
      </div>
      <div className="relative mt-4 flex items-end justify-between gap-3 border-t border-amber-300/10 pt-3">
        <div className="min-w-0">
          <div className="truncate text-lg font-black text-amber-50">{leader.player.display_name}</div>
          <div className="text-[8px] text-slate-500">{definition.metric} · {leader.value} · {leader.pa} PA</div>
        </div>
        <Medal className="h-8 w-8 shrink-0 text-amber-300" />
      </div>
      <div className="relative mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={share} className="min-h-10 rounded-xl border border-white/10 text-[9px] font-black text-slate-200"><Share2 className="mr-1 inline h-3.5 w-3.5" />Share</button>
        {canAward ? <button type="button" disabled={busy} onClick={() => onAward(definition, leader)} className="min-h-10 rounded-xl bg-amber-300 px-2 text-[9px] font-black text-slate-950 disabled:opacity-50"><Award className="mr-1 inline h-3.5 w-3.5" />{busy ? "Awarding…" : "Add to player awards"}</button> : <div className="flex min-h-10 items-center justify-center rounded-xl border border-white/8 text-[8px] font-black text-slate-600">Coach-issued certificate</div>}
      </div>
    </article>
  );
}

export default function WayAnalyticsPanel({ team, group, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const [methodOpen, setMethodOpen] = useState(false);

  const load = async () => {
    if (!team?.id) return;
    setLoading(true);
    setError("");
    try {
      setData(await getWayAnalytics(team.id));
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Unable to load team analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [team?.id]);

  const leaders = useMemo(() => data?.leaders || {}, [data]);

  const award = async (definition, leader) => {
    if (!leader?.player?.id || !data?.can_award) return;
    setBusyKey(definition.key);
    setError("");
    setNotice("");
    try {
      await createPlayerAward({
        team: team.id,
        player: leader.player.id,
        kind: "CUSTOM",
        title: definition.title,
        season_name: team.season_name || "",
        week_of: null,
        note: `${definition.subtitle}. ${definition.metric}: ${leader.value}. WAY-1.0 · ${leader.pa} PA at time of award.`,
      });
      setNotice(`${definition.title} added to ${leader.player.display_name}'s player awards.`);
    } catch (err) {
      setError(err?.response?.data?.detail || Object.values(err?.response?.data || {})?.flat?.()?.[0] || err?.message || "Certificate could not be awarded.");
    } finally {
      setBusyKey("");
    }
  };

  return (
    <div className="min-h-dvh bg-[#02060c] pb-[calc(1rem+env(safe-area-inset-bottom))] text-slate-100">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#02060c]/95 px-3 pb-2 pt-[calc(.65rem+env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-2">
          <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 text-cyan-100"><ArrowLeft className="h-4 w-4" /></button>
          <div className="min-w-0 flex-1">
            <div className="text-[7px] font-black uppercase tracking-[.18em] text-cyan-300">The Way We Play · Analytics Lab</div>
            <h1 className="truncate text-sm font-black text-white">{group?.name || team?.group_name || "Team"} Player Score</h1>
          </div>
          <button type="button" onClick={load} disabled={loading} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-300"><RefreshCw className={cx("h-4 w-4", loading && "animate-spin")} /></button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-3 px-3 py-3">
        {error ? <div className="rounded-xl border border-rose-300/20 bg-rose-300/10 p-3 text-[10px] text-rose-100">{error}</div> : null}
        {notice ? <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-3 text-[10px] text-emerald-100">{notice}</div> : null}

        <section className="overflow-hidden rounded-[1.55rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_85%_0%,rgba(34,211,238,.15),transparent_31%),radial-gradient(circle_at_0%_100%,rgba(139,92,246,.12),transparent_34%),linear-gradient(145deg,#07111f,#081321)] p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/[.07] text-cyan-200"><BarChart3 className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1">
              <div className="text-[8px] font-black uppercase tracking-[.17em] text-cyan-300">WAY-1.0</div>
              <h2 className="mt-1 text-xl font-black tracking-tight text-white">Reward how we play — not just what fell for a hit.</h2>
              <p className="mt-1 text-[10px] leading-5 text-slate-400">Every point traces to a finalized Game Book. The score values quality at-bats, situational execution, plate approach and offensive impact, then corrects for small samples.</p>
            </div>
          </div>
          <div className="mt-4"><FormulaBar weights={data?.weights} /></div>
        </section>

        {loading && !data ? <div className="grid min-h-48 place-items-center rounded-2xl border border-white/10 bg-[#07111f]"><RefreshCw className="h-6 w-6 animate-spin text-cyan-300" /></div> : null}

        {data ? <>
          <section className="rounded-[1.4rem] border border-white/10 bg-[#07111f] p-3.5">
            <div className="flex items-center justify-between gap-3"><div><div className="text-[8px] font-black uppercase tracking-[.15em] text-violet-300">Current leaders</div><h2 className="mt-1 text-base font-black text-white">Earned certificates</h2></div><Sparkles className="h-5 w-5 text-amber-300" /></div>
            <div className="mt-3 grid gap-2 lg:grid-cols-2">
              {CERTIFICATES.map((definition) => <Certificate key={definition.key} definition={definition} leader={leaders[definition.key]} team={team} canAward={data.can_award} onAward={award} busyKey={busyKey} />)}
            </div>
          </section>

          <section className="rounded-[1.4rem] border border-white/10 bg-[#050d18] p-3.5">
            <div className="flex items-center justify-between gap-3"><div><div className="text-[8px] font-black uppercase tracking-[.15em] text-cyan-300">Team leaderboard</div><h2 className="mt-1 text-base font-black text-white">Player Score</h2></div><Trophy className="h-5 w-5 text-amber-300" /></div>
            <div className="mt-3 space-y-2">{(data.players || []).map((row) => <PlayerRow key={row.player?.id} row={row} />)}</div>
            {!(data.players || []).length ? <div className="mt-3 rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-slate-500">Finalize Game Books to begin the mathematical leaderboard.</div> : null}
          </section>

          <section className="rounded-[1.4rem] border border-white/10 bg-[#07111f] p-3.5">
            <button type="button" onClick={() => setMethodOpen((value) => !value)} className="flex min-h-10 w-full items-center justify-between text-left"><div><div className="text-[8px] font-black uppercase tracking-[.15em] text-emerald-300">Transparent math</div><div className="mt-1 text-sm font-black text-white">How the score works</div></div>{methodOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>
            {methodOpen ? <div className="mt-3 space-y-2 border-t border-white/8 pt-3 text-[10px] leading-5 text-slate-400">
              <p><b className="text-white">Quality AB:</b> {data.methodology?.quality_at_bat}</p>
              <p><b className="text-white">Plate approach:</b> {data.methodology?.plate_approach}</p>
              <p><b className="text-white">Sample size:</b> {data.methodology?.sample_size}</p>
              <p><b className="text-white">Source:</b> {data.methodology?.source}</p>
              <div className="rounded-xl border border-cyan-300/10 bg-cyan-300/[.035] p-2.5 text-[9px] text-cyan-100">The formula is versioned as {data.formula_version}. If we refine the math later, we can preserve exactly which formula produced an older certificate.</div>
            </div> : null}
          </section>
        </> : null}
      </main>
    </div>
  );
}
