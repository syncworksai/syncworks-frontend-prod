import React, {useMemo,useState} from "react";

const initial=[
["LF","Jeff",105,215,[70,74,77,45,75,55,78,75,76,75]],
["LCF","Ethan",215,165,[82,86,83,86,83,85,79,82,82,83]],
["RCF","Jordan",338,165,[66,55,58,83,72,67,69,70,70,69]],
["RF","Elijah",443,215,[82,85,84,84,83,96,82,81,79,83]],
["SS","Jake",214,332,[90,89,83,91,90,90,87,95,86,90]],
["2B","Shaw",324,339,[61,58,56,63,55,66,64,64,62,58]],
["3B","Zack",147,421,[65,57,54,59,74,75,70,70,66,68]],
["1B","Marcus",398,421,[68,56,55,60,80,69,70,74,72,75]],
["P","Kyle",270,442,[84,82,80,84,84,83,83,84,82,83]],
["C","Russ",270,570,[62,52,48,50,70,67,69,72,74,68]]
];
const skills=["Reaction","Forward","Backward","Lateral","Hands","Arm","Accuracy","Game IQ","Communication","Execution"];
const schemes={base:"Cover 4 / balanced",press:"Cover Press / shallow",deep:"Cover Deep / power",grass:"Infield Back / protect grass",turn:"Turn Two / force"};
const shapes={LF:[69,76],LCF:[85,83],RCF:[84,54],RF:[74,76],SS:[62,49],"2B":[42,35],"3B":[32,30],"1B":[32,30],P:[34,39],C:[24,23]};
const sample={left:"Left-side attack: Jeff charges, Ethan overlaps the gap. Jake protects the shallow seam and handles a relay to third if needed.",center:"Center attack: Ethan and Jordan compare their angle; one calls the ball, the other provides backup. Jake and Shaw protect the shallow edge.",right:"Right-side attack: Elijah attacks shallow contact, Jordan overlaps from right-center. Shaw reads relay versus base coverage.",corner:"Deep right corner: Elijah retrieves, Jordan backs up; Shaw aligns the relay, Jake covers second, and the lead runner determines the throwing target."};
const getNum=(v)=>Number(v)||0;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const pct=n=>Math.round(clamp(n,0,100));
export default function DefensiveScenarioStudio(){
 const [players,setPlayers]=useState(initial.map(([id,name,x,y,ratings])=>({id,name,x,y,ratings})));
 const [formation,setFormation]=useState("base");
 const [outfield,setOutfield]=useState("4");
 const [middle,setMiddle]=useState(false);
 const [selected,setSelected]=useState("LCF");
 const [side,setSide]=useState("right");
 const [hand,setHand]=useState("R");
 const [tendency,setTendency]=useState("pull");
 const [contact,setContact]=useState("liner");
 const [ball,setBall]=useState("right");
 const [runners,setRunners]=useState("none");
 const [outs,setOuts]=useState(0);
 const [execution,setExecution]=useState(80);
 const [pitch,setPitch]=useState("outside");
 const [edit,setEdit]=useState(false);
 const active=players.filter(p=>(outfield==="3"?p.id!=="RCF":true)&&(!middle||p.id!=="LCF"));
 const selectedPlayer=players.find(p=>p.id===selected)||players[0];
 const getPosition=p=>{
  const d={LF:[0,formation==="press"?19:formation==="deep"?-23:0],LCF:[middle?55:0,formation==="press"?18:formation==="deep"?-23:middle?127:0],RCF:[0,formation==="deep"?-20:0],RF:[0,formation==="press"?20:formation==="deep"?-23:0],SS:[0,formation==="grass"?-22:formation==="turn"?17:0],"2B":[0,formation==="turn"?15:0]};
  if(middle&&p.id==="LCF")return [270,292];
  return [p.x+(d[p.id]?.[0]||0),p.y+(d[p.id]?.[1]||0)];
 };
 const zoneWeight=p=> (p.ratings[0]+p.ratings[4]+p.ratings[9]+(contact==="ground"?p.ratings[3]:contact==="fly"?p.ratings[2]:p.ratings[1]))/4;
 const xBall=ball==="left"?168:ball==="center"?270:ball==="right"?379:450;
 const yBall=ball==="corner"?182:contact==="ground"?365:contact==="fly"?232:298;
 const estimate=useMemo(()=>{
  const positions=active.map(p=>{let [x,y]=getPosition(p); const [rx,ry]=shapes[p.id];const dx=(xBall-x)/(rx*(0.65+zoneWeight(p)/160));const dy=(yBall-y)/(ry*(.65+zoneWeight(p)/160));const distance=Math.sqrt(dx*dx+dy*dy);const reach=clamp(1-distance*.54,.03,.95);const out=reach*(zoneWeight(p)/100)*execution/100;return {p,reach,out,distance};});
  const likelihood=positions.reduce((a,z)=>1-(1-a)*(1-z.out),0);
  const fit=contact==="ground"?.92:contact==="fly"?1.02:1;
  const geometry=pct(likelihood*100*fit);
  const pitchBonus=pitch==="inside"&&tendency==="pull"||pitch==="outside"&&tendency==="backside"?8:0;
  const score=clamp(geometry+pitchBonus-((outfield==="3")?4:0),1,96);
  const weak=positions.filter(z=>z.reach<.35).length;
  return {score:pct(score),reach:pct(positions.reduce((a,z)=>1-(1-a)*(1-z.reach),0)*100),weak,top:positions.sort((a,b)=>b.out-a.out)[0]?.p.name||"None"};
 },[players,formation,outfield,middle,ball,contact,execution,pitch,tendency]);
 const updateSkill=(i,val)=>setPlayers(list=>list.map(p=>p.id===selected?{...p,ratings:p.ratings.map((n,j)=>j===i?getNum(val):n)}:p));
 const formShift=formation==="press"?"Attacks shallow contact but exposes more deep grass.":formation==="deep"?"Protects deep contact but increases shallow exposure.":formation==="grass"?"Jake plays deeper while Shaw keeps a shorter path to second.":formation==="turn"?"Move middle infielders toward force/turn responsibilities.":"Balanced starting alignment with overlap help.";
 const hitterDir=hand==="R"?(tendency==="pull"?"left":tendency==="backside"?"right":"center"):(tendency==="pull"?"right":tendency==="backside"?"left":"center");
 const runnerText=runners==="none"?"Bases empty":runners==="loaded"?"Bases loaded":runners.replaceAll("-"," and ");
 return <div className="mx-auto w-full max-w-5xl rounded-2xl border border-sky-400/20 bg-[#03080d] p-3 text-white sm:p-5">
 <header className="mb-3"><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-300">Defensive lab • scenario studio</div><h2 className="text-xl font-black sm:text-2xl">Build the play. Test the coverage.</h2></header>
 <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">{Object.entries(schemes).map(([id,label])=><button key={id} type="button" onClick={()=>setFormation(id)} className={`min-h-10 rounded-lg border px-2 py-2 text-xs font-bold ${formation===id?"border-cyan-300 bg-cyan-300 text-slate-950":"border-white/10 bg-white/5 text-slate-300"}`}>{label}</button>)}</div>
 <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
 <label className="text-[11px] text-slate-300">Outfield <select value={outfield} onChange={e=>setOutfield(e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-900 p-2 text-white"><option value="4">4 outfielders</option><option value="3">3 outfielders</option></select></label>
 <label className="text-[11px] text-slate-300">Middle man <select value={middle?"yes":"no"} onChange={e=>setMiddle(e.target.value==="yes")} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-900 p-2 text-white"><option value="no">Standard infield</option><option value="yes">LCF moves to middle</option></select></label>
 <label className="text-[11px] text-slate-300">Batter <select value={hand} onChange={e=>setHand(e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-900 p-2 text-white"><option value="R">Right-handed</option><option value="L">Left-handed</option></select></label>
 <label className="text-[11px] text-slate-300">Tendency <select value={tendency} onChange={e=>setTendency(e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-900 p-2 text-white"><option value="pull">Hard pull</option><option value="backside">Backside</option><option value="balanced">Balanced</option></select></label>
 <label className="text-[11px] text-slate-300">Contact <select value={contact} onChange={e=>setContact(e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-900 p-2 text-white"><option value="ground">Ground ball</option><option value="liner">Sinking line drive</option><option value="fly">Fly ball</option></select></label>
 <label className="text-[11px] text-slate-300">Ball location <select value={ball} onChange={e=>setBall(e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-900 p-2 text-white"><option value="left">Left-center</option><option value="center">Center</option><option value="right">Right-center</option><option value="corner">Right corner</option></select></label>
 <label className="text-[11px] text-slate-300">Runners <select value={runners} onChange={e=>setRunners(e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-900 p-2 text-white">{[["none","Bases empty"],["1st","First"],["2nd","Second"],["3rd","Third"],["1st-2nd","First + second"],["1st-3rd","Corners"],["2nd-3rd","Second + third"],["loaded","Loaded"]].map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label>
 <label className="text-[11px] text-slate-300">Outs <select value={outs} onChange={e=>setOuts(getNum(e.target.value))} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-900 p-2 text-white">{[0,1,2].map(n=><option value={n} key={n}>{n}</option>)}</select></label>
 </div>
 <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr]"><label className="text-xs text-slate-300">Pitch location <select value={pitch} onChange={e=>setPitch(e.target.value)} className="ml-2 rounded-md border border-white/15 bg-slate-900 p-2 text-white"><option value="inside">Inside</option><option value="middle">Middle</option><option value="outside">Outside</option></select></label><label className="text-xs text-slate-300">Pitch execution <strong className="text-cyan-300">{execution}/100</strong><input aria-label="Pitch execution" className="mt-1 w-full accent-cyan-400" type="range" min="20" max="100" step="5" value={execution} onChange={e=>setExecution(getNum(e.target.value))}/></label></div>
 <div className="mt-3 rounded-xl border border-white/10 bg-[#051713] p-1"><svg viewBox="0 0 540 620" className="w-full" role="img" aria-label="Field showing player name markers and overlapping colored responsibility areas">
 <defs><linearGradient id="scenarioGrass" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#17573b"/><stop offset="1" stopColor="#092b28"/></linearGradient><marker id="lineArrow" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6" fill="#facc15"/></marker></defs>
 <rect width="540" height="620" fill="#051713"/><path d="M20 543 Q42 130 270 35 Q495 130 520 543 L270 590Z" fill="url(#scenarioGrass)" stroke="#d5e8d9" strokeWidth="2"/>
 <path d="M270 579 L105 421 L270 299 L435 421Z" fill="#a17a51" stroke="#eed8a9" strokeWidth="2"/><path d="M270 579 L105 421 L270 299 L435 421Z" fill="none" stroke="#eed8a9"/>
 {[[270,299,"2nd"],[105,421,"3rd"],[435,421,"1st"]].map(([x,y,k])=><g key={k}><rect x={x-6} y={y-6} width="12" height="12" transform={`rotate(45 ${x} ${y})`} fill="#fff"/>{(runners==="loaded"||runners.split("-").includes(k))&&<circle cx={x} cy={y-22} r="7" fill="#f87171"/>}</g>)}
 {active.map(p=>{const [x,y]=getPosition(p),[rx,ry]=shapes[p.id],quality=zoneWeight(p)/100,high=["LF","LCF","RCF","RF"].includes(p.id);const col=selected===p.id?"#facc15":high?p.id==="LF"?"#facc15":p.id==="LCF"?"#0ea5e9":p.id==="RCF"?"#a78bfa":"#4ade80":"#fb923c";return <g key={p.id}><ellipse cx={x} cy={y} rx={rx*(.6+.4*quality)} ry={ry*(.6+.4*quality)} stroke={col} strokeWidth={selected===p.id?2.5:1.3} strokeDasharray="6 5" fill={col} fillOpacity={selected===p.id?.24:.11}/><g role="button" tabIndex={0} onClick={()=>setSelected(p.id)} onKeyDown={e=>{if(e.key==="Enter")setSelected(p.id);}} style={{cursor:"pointer"}}><circle cx={x} cy={y} r="16" fill="#0b1d2d" stroke={col} strokeWidth="2"/><text x={x} y={y+4} textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff">{p.id}</text><text x={x} y={y-24} textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700" stroke="#051713" strokeWidth="3" paintOrder="stroke">{p.name}</text></g></g>})}
 <circle cx={xBall} cy={yBall} r="9" fill="#facc15" stroke="#fff" strokeWidth="2"/><path d={`M270 572 Q270 430 ${xBall} ${yBall}`} fill="none" stroke="#facc15" strokeWidth="2.5" strokeDasharray="8 7" markerEnd="url(#lineArrow)"/>
 <text x="270" y="611" textAnchor="middle" fill="#edf4ee" fontSize="12">HOME</text></svg></div>
 <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-300"><span className="text-yellow-300">● Ball path</span><span className="text-sky-300">● Player primary range</span><span className="text-violet-300">● Overlap / shared seam</span></div>
 <div className="mt-3 rounded-xl border border-white/10 bg-slate-950 p-3"><div className="flex items-start justify-between gap-2"><div><div className="text-xs font-bold uppercase text-cyan-300">Coaching-model estimate — uncalibrated</div><div className="mt-1 text-3xl font-black text-white">{estimate.score}% <span className="text-xs font-medium text-slate-400">estimated playable-out index</span></div></div><button onClick={()=>setEdit(v=>!v)} className="rounded-lg border border-cyan-300/30 p-2 text-xs font-bold text-cyan-200">{edit?"Close ratings":"Edit player ratings"}</button></div><p className="mt-2 text-xs leading-5 text-slate-400">This is a prototype heuristic based on overlapping ranges, assigned ratings and pitch execution. It is NOT a measured probability of an out. Triple-play probability is not estimated without real play outcomes.</p><p className="mt-2 text-sm text-white">{formShift} Expected hitter direction: <strong>{hitterDir}</strong>. Best positioned in this illustrative model: <strong>{estimate.top}</strong>. {runnerText}, {outs} out(s). {outs<2&&runners!=="none"?"Look for a force or double play only when legally available.":"Prioritize the sure out and limit advancement."}</p><p className="mt-2 text-xs text-amber-200">Coverage weakness: The illustrative zones can miss balls between the middle infield and the outfield, particularly if the fielder has to move in a weaker direction. Increasing coverage area does not guarantee a catch.</p></div>
 {edit&&<div className="mt-3 rounded-xl border border-cyan-300/20 bg-slate-950 p-3"><label className="text-xs text-slate-300">Rate defender <select value={selected} onChange={e=>setSelected(e.target.value)} className="ml-2 rounded-md bg-slate-800 p-2 text-white">{players.map(p=><option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}</select></label><div className="mt-3 grid gap-2 sm:grid-cols-2">{skills.map((name,i)=><label key={name} className="text-xs text-slate-300">{name}: <strong className="text-white">{selectedPlayer.ratings[i]}</strong><input aria-label={name} type="range" className="mt-1 block w-full accent-cyan-400" min="0" max="100" value={selectedPlayer.ratings[i]} onChange={e=>updateSkill(i,e.target.value)}/></label>)}</div><p className="mt-2 text-[11px] text-slate-500">These initial ratings are editable placeholders, not verified scouting grades.</p></div>}
 <div className="mt-3 rounded-xl border border-white/10 p-3"><h3 className="text-lg font-bold">Responsibilities — {schemes[formation]}</h3><div className="mt-2 grid gap-2 sm:grid-cols-2">{active.map(p=><button key={p.id} onClick={()=>setSelected(p.id)} className={`rounded-lg border p-2 text-left ${selected===p.id?"border-cyan-400 bg-cyan-400/10":"border-white/10 bg-white/[.03]"}`}><strong className="text-xs text-cyan-300">{p.name} · {p.id}</strong><p className="mt-1 text-[11px] text-slate-300">{p.id==="SS"?"Grass coverage, left cutoff and second-base rotation.":p.id==="2B"?"Protect right-middle and right relay; maintain force coverage.":p.id==="P"?"Cover the appropriate open base or support the throw, not both.":p.id==="C"?"Direct the play and protect home.":p.id==="LF"?"Defend left lane and shallow contact; Ethan supports the seam.":p.id==="LCF"?(middle?"Play middle infield, own the central force/relay assignment.":"Help Jeff deep and protect left-center overlap."):p.id==="RCF"?"Protect central and right-side seams with lateral first step.":p.id==="RF"?"Defend right field and deep corner; use arm to limit advancement.":p.id==="3B"?"Hold third and receive throws on lead runner.":"Secure first or rotate only if plate coverage requires it."}</p></button>)}</div></div>
 </div>;
}
