import React, { useEffect, useMemo, useState } from "react";
import { Check, Edit3, Loader2, Save, X } from "lucide-react";

import { getSituationalSplits, saveSituationalSplit } from "../../api/wayAnalytics";

const num = (value) => Number(value || 0);
const pct = (value) => value == null ? "—" : Number(value).toFixed(3).replace(/^0(?=\.)/, "");

function tone(band) {
  if (band === "green") return "border-emerald-300/30 bg-emerald-300/10 text-emerald-100";
  if (band === "yellow") return "border-amber-300/30 bg-amber-300/10 text-amber-100";
  if (band === "red") return "border-rose-300/30 bg-rose-300/10 text-rose-100";
  return "border-white/10 bg-white/[.03] text-slate-300";
}

function SplitTile({ label, metric, teamRate }) {
  return <div className={`rounded-xl border p-2 ${tone(metric?.band)}`}>
    <div className="text-[7px] font-black uppercase tracking-[.12em] opacity-65">{label}</div>
    <div className="mt-1 flex items-end justify-between gap-2">
      <div className="text-base font-black">{pct(metric?.rate)}</div>
      <div className="text-[8px] font-bold opacity-75">{num(metric?.h)}/{num(metric?.ab)}</div>
    </div>
    <div className="mt-1 text-[7px] font-bold opacity-60">Adj {pct(metric?.adjusted_rate)} · Team {pct(teamRate)}</div>
  </div>;
}

function IndexTile({ value }) {
  const band = value == null ? "neutral" : value >= 107.5 ? "green" : value >= 100 ? "yellow" : "red";
  return <div className={`rounded-xl border p-2 text-center ${tone(band)}`}>
    <div className="text-[7px] font-black uppercase tracking-[.12em] opacity-65">SIT+</div>
    <div className="mt-1 text-lg font-black">{value == null ? "—" : Number(value).toFixed(1)}</div>
    <div className="text-[7px] font-bold opacity-60">100 = team avg</div>
  </div>;
}

function DraftInputs({ draft, setDraft }) {
  const input = (key, label) => <label className="block" key={key}><span className="mb-1 block text-center text-[7px] font-black uppercase text-slate-500">{label}</span><input inputMode="numeric" value={draft[key] ?? ""} onChange={(event)=>setDraft((current)=>({...current,[key]:event.target.value.replace(/[^0-9]/g,"")}))} className="h-9 w-full rounded-lg border border-white/10 bg-black/25 px-1 text-center text-xs font-black text-white outline-none focus:border-cyan-300/40" /></label>;
  return <div className="grid grid-cols-7 gap-1.5">
    {input("sample_games","Games")}
    {input("bases_empty_hits","Empty H")}
    {input("bases_empty_ab","Empty AB")}
    {input("two_out_hits","2-Out H")}
    {input("two_out_ab","2-Out AB")}
    {input("runners_on_hits","ROB H")}
    {input("runners_on_ab","ROB AB")}
  </div>;
}

export default function SituationalExecutionPanel({ teamId, managerView = false }) {
  const [data,setData] = useState(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [editing,setEditing] = useState(null);
  const [draft,setDraft] = useState({});
  const [saving,setSaving] = useState(false);

  async function load() {
    if (!teamId) return;
    setLoading(true); setError("");
    try { setData(await getSituationalSplits(teamId)); }
    catch (err) { setError(err?.response?.data?.detail || err?.message || "Situational execution could not load."); }
    finally { setLoading(false); }
  }
  useEffect(()=>{ load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ },[teamId]);

  const rows = useMemo(()=>[...(data?.rows || [])].filter((row)=>row.sample_games > 0).sort((a,b)=>num(b.situational_index)-num(a.situational_index)||String(a.player?.display_name||"").localeCompare(String(b.player?.display_name||""))),[data]);
  const team = data?.team || {};

  function startEdit(row) {
    setEditing(Number(row.player?.id));
    setDraft({
      sample_games: String(row.sample_games || data?.sample_games || 6),
      bases_empty_hits: String(row.bases_empty?.h ?? 0), bases_empty_ab: String(row.bases_empty?.ab ?? 0),
      two_out_hits: String(row.two_out?.h ?? 0), two_out_ab: String(row.two_out?.ab ?? 0),
      runners_on_hits: String(row.runners_on?.h ?? 0), runners_on_ab: String(row.runners_on?.ab ?? 0),
    });
  }

  async function save(row) {
    setSaving(true); setError("");
    try {
      await saveSituationalSplit(teamId, { player:Number(row.player?.id), ...Object.fromEntries(Object.entries(draft).map(([key,value])=>[key,Number(value || 0)])), note:"Coach-adjusted six-game situational split" });
      setEditing(null); setDraft({}); await load();
    } catch (err) { setError(err?.response?.data?.detail || err?.message || "Situational split could not save."); }
    finally { setSaving(false); }
  }

  if (loading) return <section className="rounded-[1.35rem] border border-white/10 bg-[#07111f]/95 p-4"><div className="flex min-h-32 items-center justify-center gap-2 text-xs text-cyan-100"><Loader2 className="h-4 w-4 animate-spin"/>Loading situational execution…</div></section>;

  return <section className="rounded-[1.35rem] border border-white/10 bg-[#07111f]/95 p-3.5 sm:p-4">
    <div className="flex items-start justify-between gap-3">
      <div><div className="text-[8px] font-black uppercase tracking-[.16em] text-violet-300">The Way We Play · execution context</div><h2 className="mt-1 text-sm font-black text-white">Situational Execution · {data?.sample_games || 6}-Game Sample</h2><p className="mt-1 max-w-3xl text-[10px] leading-4 text-slate-500">Bases Empty means nobody on base — not necessarily the first batter of an inning. The first two season games are excluded because the situation data was not recorded reliably. Raw H/AB stays visible; SIT+ uses a small team-average adjustment to stabilize tiny samples.</p></div>
      <div className="shrink-0 rounded-full border border-white/10 bg-white/[.04] px-2.5 py-1 text-[8px] font-black text-slate-300">TEAM VIEW</div>
    </div>

    {error ? <div className="mt-3 rounded-xl border border-rose-300/20 bg-rose-300/10 p-2 text-[9px] text-rose-100">{error}</div> : null}

    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
      <SplitTile label="Bases Empty" metric={{...team.bases_empty,adjusted_rate:team.bases_empty?.rate,band:"neutral"}} teamRate={team.bases_empty?.rate}/>
      <SplitTile label="2 Outs" metric={{...team.two_out,adjusted_rate:team.two_out?.rate,band:"neutral"}} teamRate={team.two_out?.rate}/>
      <SplitTile label="Runners On" metric={{...team.runners_on,adjusted_rate:team.runners_on?.rate,band:"neutral"}} teamRate={team.runners_on?.rate}/>
      <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[.05] p-2 text-center"><div className="text-[7px] font-black uppercase text-slate-500">Team EXE%</div><div className="mt-1 text-lg font-black text-cyan-100">{pct(team.execution_average)}</div></div>
      <div className="rounded-xl border border-white/10 bg-black/20 p-2 text-center"><div className="text-[7px] font-black uppercase text-slate-500">Team BA</div><div className="mt-1 text-lg font-black text-white">{pct(team.ba)}</div></div>
    </div>

    <div className="mt-3 space-y-2 lg:hidden">
      {rows.map((row)=>{
        const isEditing=editing===Number(row.player?.id);
        return <article key={row.player?.id} className="rounded-xl border border-white/10 bg-[#050b14] p-2.5">
          <div className="flex items-center justify-between gap-2"><div className="min-w-0"><b className="block truncate text-[11px] text-white">{row.player?.display_name}</b><span className="text-[8px] text-slate-600">{row.sample_games} games tracked · EXE {pct(row.execution_average)} · BA {pct(row.ba)}</span></div><div className="flex items-center gap-1.5"><IndexTile value={row.situational_index}/>{managerView ? <button type="button" onClick={()=>isEditing?setEditing(null):startEdit(row)} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-slate-300">{isEditing?<X className="h-3.5 w-3.5"/>:<Edit3 className="h-3.5 w-3.5"/>}</button>:null}</div></div>
          {isEditing ? <div className="mt-2 space-y-2"><DraftInputs draft={draft} setDraft={setDraft}/><button type="button" disabled={saving} onClick={()=>save(row)} className="min-h-10 w-full rounded-xl bg-cyan-300 text-[9px] font-black text-slate-950">{saving?<Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin"/>:<Save className="mr-1 inline h-3.5 w-3.5"/>}Save situational split</button></div> : <div className="mt-2 grid grid-cols-3 gap-1.5"><SplitTile label="Bases Empty" metric={row.bases_empty} teamRate={team.bases_empty?.rate}/><SplitTile label="2 Outs" metric={row.two_out} teamRate={team.two_out?.rate}/><SplitTile label="Runners On" metric={row.runners_on} teamRate={team.runners_on?.rate}/></div>}
        </article>;
      })}
    </div>

    <div className="mt-3 hidden overflow-x-auto rounded-xl border border-white/10 bg-[#050b14] lg:block">
      <table className="w-full min-w-[980px] border-collapse text-[9px]">
        <thead className="bg-[#091421] text-slate-500"><tr><th className="px-3 py-2 text-left">PLAYER</th><th className="px-2 py-2">SIT+</th><th className="px-2 py-2">EXE%</th><th className="px-2 py-2">BASES EMPTY</th><th className="px-2 py-2">2 OUTS</th><th className="px-2 py-2">RUNNERS ON</th>{managerView?<th className="px-2 py-2">EDIT</th>:null}</tr></thead>
        <tbody>{rows.map((row)=>{
          const isEditing=editing===Number(row.player?.id);
          return <React.Fragment key={row.player?.id}><tr className="border-t border-white/5"><td className="px-3 py-2"><b className="text-white">{row.player?.display_name}</b><div className="text-[7px] text-slate-600">{row.sample_games} games · BA {pct(row.ba)}</div></td><td className="px-2 py-2"><IndexTile value={row.situational_index}/></td><td className="px-2 py-2 text-center text-sm font-black text-cyan-100">{pct(row.execution_average)}</td>{[["bases_empty",row.bases_empty,team.bases_empty?.rate],["two_out",row.two_out,team.two_out?.rate],["runners_on",row.runners_on,team.runners_on?.rate]].map(([key,metric,baseline])=><td key={key} className="px-2 py-2"><SplitTile label={key==="bases_empty"?"Empty":key==="two_out"?"2 Out":"ROB"} metric={metric} teamRate={baseline}/></td>)}{managerView?<td className="px-2 py-2 text-center"><button type="button" onClick={()=>isEditing?setEditing(null):startEdit(row)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-white/10 px-2 text-[8px] font-black text-slate-300">{isEditing?<X className="h-3.5 w-3.5"/>:<Edit3 className="h-3.5 w-3.5"/>}{isEditing?"Close":"Edit"}</button></td>:null}</tr>{isEditing?<tr className="border-t border-cyan-300/10 bg-cyan-300/[.025]"><td colSpan={managerView?7:6} className="p-3"><div className="grid grid-cols-[1fr_auto] items-end gap-3"><DraftInputs draft={draft} setDraft={setDraft}/><button type="button" disabled={saving} onClick={()=>save(row)} className="min-h-10 rounded-xl bg-cyan-300 px-4 text-[9px] font-black text-slate-950">{saving?<Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin"/>:<Check className="mr-1 inline h-3.5 w-3.5"/>}Save</button></div></td></tr>:null}</React.Fragment>;
        })}</tbody>
      </table>
    </div>

    <div className="mt-3 text-[8px] leading-4 text-slate-600">Color comparison uses the stabilized split versus that split's team average: red below team average, yellow from team average through +.049, green +.050 or more. Raw six-game H/AB is never changed. SIT+ is diagnostic and remains separate from EXE%.</div>
  </section>;
}
