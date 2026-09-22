import React, { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, GripVertical, Loader2, Save, Users, WandSparkles } from "lucide-react";
import { getSportsPlayers } from "../../api/sports";
import SoftballDefenseField from "./SoftballDefenseField";

const FIELD = ["P","C","1B","2B","3B","SS","MM","LF","LC","CF","RC","RF","OF"];
const HITTER = ["EH1","EH2","EH","DH"];
const POSITION_OPTIONS = [...FIELD,...HITTER];
const num = (value) => Number(value || 0);

export default function PregameLineupEditor({ game, rings = {}, onSave, onClose, disabled = false }) {
  const [players, setPlayers] = useState([...((game.lineup_spots||[]).map(s=>s.player_detail).filter(Boolean)),...(game.bench_players||[])]);
  const [rows, setRows] = useState(()=>[...(game.lineup_spots||[])].sort((a,b)=>num(a.batting_order)-num(b.batting_order)).map(row=>({
    player: num(row.player), defensive_position: row.defensive_position || "",
  })));
  const [lifted, setLifted] = useState(null);
  const [selectedMiddle, setSelectedMiddle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const drag = useRef(null);

  useEffect(()=>{
    let mounted=true;
    getSportsPlayers(game.team).then(result=>{if(mounted)setPlayers(result.filter(row=>row.is_active!==false));})
      .catch(()=>setError("The full roster is temporarily unavailable. Existing lineup players are still editable."));
    return ()=>{mounted=false};
  },[game.team]);

  const playerMap = new Map(players.map(player=>[num(player.id),player]));
  const used = new Set(rows.map(row=>num(row.player)));
  const bench = players.filter(player=>!used.has(num(player.id)));
  const fieldLineup = rows.map((row,i)=>({...row,id:row.player,batting_order:i+1,player_detail:playerMap.get(num(row.player))||game.lineup_spots?.find(s=>num(s.player)===num(row.player))?.player_detail}));
  const occupied=new Map();
  for(const row of rows)if(FIELD.includes(row.defensive_position))occupied.set(row.defensive_position,(occupied.get(row.defensive_position)||0)+1);
  const duplicates=[...occupied].filter(([,count])=>count>1).map(([position])=>position);
  const needsPosition=rows.filter(row=>!row.defensive_position);
  const canSave=rows.length>0&&!duplicates.length&&!needsPosition.length;

  function reorder(from,to){
    if(from<0||to<0||from===to)return;
    setRows(current=>{const next=[...current], [entry]=next.splice(from,1);next.splice(to,0,entry);return next;});
  }
  function choosePosition(playerId,position){
    setRows(current=>{
      const currentRow=current.find(row=>num(row.player)===num(playerId));
      if(!currentRow)return current;
      const previous=currentRow.defensive_position;
      return current.map(row=>{
        if(num(row.player)===num(playerId))return {...row,defensive_position:position};
        // Selecting an occupied field spot swaps defensive positions;
        // no two defenders are silently layered on top of each other.
        if(FIELD.includes(position)&&row.defensive_position===position)return {...row,defensive_position:previous||""};
        return row;
      });
    });
  }
  function assignMiddle(){
    const playerId=num(selectedMiddle);
    if(!playerId)return;
    if(used.has(playerId))choosePosition(playerId,"MM");
    else setRows(current=>[...current,{player:playerId,defensive_position:"MM"}]);
    setSelectedMiddle("");
  }
  function addFromBench(playerId){
    if(used.has(playerId))return;
    const preferred=playerMap.get(num(playerId))?.primary_position?.toUpperCase()||"";
    const position=POSITION_OPTIONS.includes(preferred)&&!occupied.has(preferred)?preferred:"EH";
    setRows(current=>[...current,{player:num(playerId),defensive_position:position}]);
  }
  function handleStart(event,index){
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current={index,originY:event.clientY,dragging:false};
  }
  function handleMove(event){
    const current=drag.current;
    if(!current)return;
    if(Math.abs(event.clientY-current.originY)>8)current.dragging=true;
    if(!current.dragging)return;
    event.preventDefault();
    const nodes=[...document.querySelectorAll("[data-pregame-index]")];
    let target=nodes.length-1;
    for(const node of nodes){
      const rect=node.getBoundingClientRect();
      if(event.clientY<rect.top+rect.height/2){target=num(node.dataset.pregameIndex);break;}
    }
    if(target!==current.index){reorder(current.index,target);current.index=target;}
  }
  async function save(){
    if(!canSave||saving)return;
    setSaving(true);setError("");
    try{
      const result=await onSave(rows.map((row,i)=>({
        player:num(row.player),batting_order:i+1,defensive_position:row.defensive_position,is_starter:true,
      })));
      if(result)onClose?.();
      else setError("We could not save this lineup. Confirm player availability and try again.");
    }catch(e){setError(e?.response?.data?.detail||e?.message||"Lineup save failed.");}
    finally{setSaving(false);}
  }
  return <section className="space-y-3 rounded-2xl border border-cyan-300/30 bg-[#07111f] p-3" aria-label="Pre-game lineup editor">
    <div className="flex items-center justify-between gap-3">
      <span><b className="block text-sm font-black text-white">Quick lineup editor</b><span className="mt-1 block text-[10px] leading-4 text-slate-400">Hold and drag a grip; or lift a player and tap his destination. Set field spots, EHs and bench before first pitch.</span></span>
      <button type="button" onClick={onClose} className="min-h-10 rounded-xl border border-white/20 px-3 text-xs font-bold text-slate-300">Close</button>
    </div>
    {error?<div role="alert" className="rounded-xl border border-rose-300/30 bg-rose-300/10 p-3 text-xs text-rose-100">{error}</div>:null}
    <div className="grid grid-cols-3 gap-1.5 text-center">
      {[[rows.length,"Batting"],[occupied.size,"Fielded"],[bench.length,"Bench / subs"]].map(([n,label])=><div key={label} className="rounded-xl border border-cyan-300/15 bg-cyan-300/[.04] p-2"><b className="block text-lg text-white">{n}</b><span className="text-[9px] uppercase text-slate-400">{label}</span></div>)}
    </div>
    <SoftballDefenseField lineup={fieldLineup} bench={bench} badgeRings={rings} compact
      onEditPosition={position=>{
        document.getElementById("pregame-position-"+position)?.scrollIntoView?.({behavior:"smooth",block:"center"});
        if(position==="MM")document.getElementById("pregame-middle-selector")?.focus?.();
      }}/>
    {!occupied.has("MM")?<div className="rounded-xl border border-amber-300/30 bg-amber-300/[.05] p-3">
      <label htmlFor="pregame-middle-selector" className="block text-[10px] font-black text-amber-100">Assign the missing middle man (MM)</label>
      <div className="mt-2 flex gap-2">
        <select id="pregame-middle-selector" aria-label="Player to assign at middle man" value={selectedMiddle} onChange={e=>setSelectedMiddle(e.target.value)} className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-[#030712] px-2 text-xs text-white">
          <option value="">Choose player from batting order or bench</option>
          {players.map(p=><option key={p.id} value={p.id}>{p.jersey_number?"#"+p.jersey_number+" ":""}{p.display_name}{used.has(num(p.id))?" · batting":" · bench"}</option>)}
        </select>
        <button disabled={!selectedMiddle} onClick={assignMiddle} type="button" className="rounded-xl bg-amber-300 px-3 text-xs font-black text-slate-950 disabled:opacity-40">Set MM</button>
      </div>
    </div>:null}
    <div className="space-y-2">
      <div className="text-[10px] font-black uppercase tracking-widest text-emerald-200">Batting order · quick edit</div>
      {rows.map((row,index)=>{
        const player=playerMap.get(num(row.player))||fieldLineup.find(x=>num(x.player)===num(row.player))?.player_detail||{};
        const tier=rings?.[num(row.player)]||{};
        const halo=tier.ring_color&&tier.highest_tier!=="LOCKED"?{borderColor:tier.ring_color,boxShadow:`0 0 12px ${tier.ring_color}44`}:{};
        return <div key={row.player} data-pregame-index={index} onClick={()=>{if(lifted!==null&&lifted!==index){reorder(lifted,index);setLifted(null);}}}
          className={"rounded-xl border border-white/15 bg-black/20 p-2 "+(lifted===index?"ring-2 ring-violet-400":"")} style={halo}>
          <div className="grid grid-cols-[1.3rem_2.1rem_minmax(0,1fr)_4.5rem_1.9rem] items-center gap-1.5">
            <span className="text-center text-sm font-black text-cyan-100">{index+1}</span>
            <button type="button" title="Drag or lift this player" aria-label={`Drag or lift ${player.display_name||"player"}`}
              onPointerDown={event=>handleStart(event,index)}
              onPointerMove={handleMove}
              onPointerUp={()=>{if(drag.current&&!drag.current.dragging)setLifted(v=>v===index?null:index);drag.current=null;}}
              onPointerCancel={()=>{drag.current=null;}}
              style={{touchAction:"none"}}
              className="grid h-10 w-9 place-items-center rounded-lg border border-violet-300/25 bg-violet-300/10 text-violet-100"><GripVertical className="h-4 w-4"/></button>
            <div className="min-w-0"><b className="block truncate text-[11px] text-white">{player.jersey_number?"#"+player.jersey_number+" · ":""}{player.display_name||"Player"}</b><span className="block text-[9px] text-slate-400">{tier.highest_tier&&tier.highest_tier!=="LOCKED"?tier.highest_tier+" achieved": "No badges yet"}</span></div>
            <select id={"pregame-position-"+row.defensive_position} value={row.defensive_position} onClick={event=>event.stopPropagation()} onChange={event=>choosePosition(row.player,event.target.value)} aria-label={`Position for ${player.display_name||"player"}`}
              className="min-h-10 w-full rounded-lg border border-cyan-300/20 bg-[#030712] px-1 text-xs font-black text-cyan-100"><option value="">POS</option>{POSITION_OPTIONS.map(pos=><option key={pos} value={pos}>{pos}</option>)}</select>
            <button type="button" onClick={event=>{event.stopPropagation();setRows(v=>v.filter(x=>x.player!==row.player));setLifted(null);}} aria-label={`Move ${player.display_name||"player"} to bench`} title="Move to bench" className="grid min-h-10 place-items-center rounded-lg border border-amber-300/20 text-lg text-amber-200">−</button>
          </div>
          <div className="mt-1.5 flex justify-end gap-1.5">
            <button type="button" disabled={!index} onClick={event=>{event.stopPropagation();reorder(index,index-1);}} className="flex min-h-8 items-center gap-1 rounded-lg border border-white/10 px-2 text-[9px] text-slate-300 disabled:opacity-30"><ArrowUp className="h-3 w-3"/>Up</button>
            <button type="button" disabled={index===rows.length-1} onClick={event=>{event.stopPropagation();reorder(index,index+1);}} className="flex min-h-8 items-center gap-1 rounded-lg border border-white/10 px-2 text-[9px] text-slate-300 disabled:opacity-30"><ArrowDown className="h-3 w-3"/>Down</button>
          </div>
        </div>;
      })}
    </div>
    <section className="rounded-xl border border-violet-300/20 bg-violet-300/[.05] p-3">
      <b className="flex items-center gap-2 text-xs font-black text-violet-100"><Users className="h-4 w-4"/>Subs / Bench · {bench.length} available</b>
      <p className="mt-1 text-[10px] text-slate-400">Bench players remain available for live substitutions. Tap Add to move someone into the batting order.</p>
      <div className="mt-2 grid gap-1.5 sm:grid-cols-2">{bench.map(player=><button type="button" key={player.id} onClick={()=>addFromBench(player.id)} className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-violet-300/20 bg-black/15 px-3 text-left text-[10px] text-white"><span className="truncate">{player.jersey_number?"#"+player.jersey_number+" · ":""}{player.display_name}</span><span className="shrink-0 font-black text-violet-200">+ Add</span></button>)}
      {!bench.length?<div className="text-[10px] text-slate-500">Everyone is already in the batting order.</div>:null}</div>
    </section>
    {duplicates.length?<p role="alert" className="rounded-xl border border-rose-300/25 bg-rose-300/10 p-2 text-[10px] text-rose-100">Duplicate field spots: {duplicates.join(", ")}. Tap positions to swap players before saving.</p>:null}
    {needsPosition.length?<p className="text-[10px] text-amber-200">{needsPosition.length} hitter(s) need a position or EH designation before saving.</p>:null}
    <div className="grid grid-cols-2 gap-2">
      <button type="button" onClick={onClose} className="min-h-12 rounded-xl border border-white/15 text-xs font-black text-slate-300">Cancel</button>
      <button type="button" disabled={!canSave||saving||disabled} onClick={save} className="min-h-12 rounded-xl bg-cyan-300 text-xs font-black text-slate-950 disabled:opacity-40">{saving?<><Loader2 className="mr-1 inline h-4 w-4 animate-spin"/>Saving…</>:<><Save className="mr-1 inline h-4 w-4"/>Save lineup</>}</button>
    </div>
    <p className="text-[9px] leading-4 text-slate-500">Changes save to this specific scheduled game. Once scoring begins, record lineup changes through the live substitution controls instead.</p>
  </section>;
}
