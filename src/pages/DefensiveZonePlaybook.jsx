import React, { useMemo, useState } from "react";

const roster = [
  {id:"LF",name:"Jeff",x:106,y:230,rx:65,ry:92,skill:"Strong forward/backward, limited lateral speed"},
  {id:"LCF",name:"Ethan",x:207,y:159,rx:91,ry:97,skill:"Fast multidirectional coverage; strong arm"},
  {id:"RCF",name:"Jordan",x:335,y:159,rx:83,ry:58,skill:"Better in gaps than charging or retreating"},
  {id:"RF",name:"Elijah",x:438,y:230,rx:81,ry:90,skill:"Multidirectional range; strongest outfield arm"},
  {id:"SS",name:"Jake",x:215,y:335,rx:73,ry:57,skill:"Instinctive grass defender; strong long throw"},
  {id:"2B",name:"Shaw",x:324,y:335,rx:43,ry:38,skill:"Compact assignment; developing consistency"},
  {id:"3B",name:"Zack",x:146,y:414,rx:34,ry:36,skill:"Third-base anchor"},
  {id:"1B",name:"Marcus",x:395,y:414,rx:34,ry:36,skill:"First-base anchor"},
  {id:"P",name:"Kyle",x:270,y:433,rx:42,ry:47,skill:"Mobile pitcher; middle and relay support"},
  {id:"C",name:"Russ",x:270,y:557,rx:28,ry:25,skill:"Home plate, traffic and backup"}
];
const definitions = {
 base:{label:"Cover 4 · Base",detail:"Balanced four-outfielder alignment. Middle infield slightly into grass; preserve routine ground-ball outs."},
 press:{label:"Cover Press",detail:"Shade Jeff, Ethan and Elijah toward the shallow landing belt against proven short-contact hitters. Do not force Jordan into his weaker forward/backward route."},
 power:{label:"Cover Deep",detail:"Protect the outfield fence and gaps. Maintain a shallow catch priority between outfielders and deep infielders."},
 grass:{label:"Infield Back",detail:"Jake operates deeper on the grass; Shaw stays closer to dirt edge. Kyle supports the middle while respecting base-covering needs."},
 turn:{label:"Turn Two",detail:"Runner on first, fewer than two outs: move Jake and Shaw toward second enough to preserve a realistic double-play feed and turn."}
};
const scenarioData = {
 coverage:{title:"Pre-pitch coverage",ball:null,throw:[],moves:[],roles:{LF:"Own the left-field lane; attack shallow catchable contact.",LCF:"Protect Jeff's lateral seam and provide deep help when your route is better.",RCF:"Own the center seam; adjust toward Elijah according to hitter and depth.",RF:"Cover right-field lane and support Jordan in the seam.",SS:"Work from grass; read and attack reachable shallow contact.", "2B":"Protect a compact right-middle zone; prepare for force plays.", "3B":"Defend third and be ready to receive a throw.","1B":"Defend first and finish the routine out.",P:"Field through the middle and anticipate the next base/relay responsibility.",C:"Read runners, communicate coverage and protect home."}},
 lcf3:{title:"LCF ball · throw to third",ball:[176,135],throw:[["LCF","SS"],["SS","3B"]],moves:[["LF",166,172],["RCF",286,172],["RF",405,235],["P",270,290],["C",105,470],["1B",325,536]],roles:{LF:"Back up Ethan from the left; prevent a ball escaping into the corner.",LCF:"Field the ball, square up, and throw accurately through Jake.",RCF:"Close center and protect a mishandled ball.",RF:"Maintain far-side depth; shade in only if no deep ball remains exposed.",SS:"Line up as cutoff on Ethan-to-third throw; call for the ball and relay if needed.","2B":"Read runner touches, protect the middle, and alert teammates; verify second is covered.", "3B":"Take the throw at third and apply the tag.", "1B":"Wheel toward home if Russ leaves to back up third; preserve plate coverage.",P:"Cover second only after ball is past you and coverage is clear.",C:"Back up Zack from foul territory beyond third; do not stand on the throwing lane."}},
 rfhome:{title:"Deep RF · relay home",ball:[476,200],throw:[["RF","2B"],["2B","C"]],moves:[["RCF",418,190],["LCF",260,180],["SS",270,293],["1B",335,530],["P",294,475]],roles:{LF:"Hold remaining left-center coverage and watch advancing runners.",LCF:"Shift toward right-center for deep backup.",RCF:"Back Elijah from inside/deeper when your route permits.",RF:"Field cleanly; throw through the cutoff unless a direct throw is clearly better.",SS:"Cover second for the trailing runner.", "2B":"Align in the throw lane to home; relay or redirect based on the lead runner.", "3B":"Protect third and watch runner touches.", "1B":"Rotate behind Russ on a home-plate throw if first is no longer needed.",P:"Back the relay/plate lane without interfering with the throw.",C:"Set target at home; direct cutoff and tag safely."}},
 shallow:{title:"Shallow right-center flare",ball:[385,300],throw:[["RF","2B"]],moves:[["RF",383,302],["RCF",405,274],["LCF",265,181],["SS",270,293],["P",302,402]],roles:{LF:"Protect left and prevent a second ball from getting through.",LCF:"Close center as backup without leaving deep center open.",RCF:"Back Elijah from the inside; take the catch only with the better controlled route.",RF:"Attack the shallow ball under control; prevent a bobble becoming a double.",SS:"Protect second if the right-side cutoff leaves the bag.","2B":"Align for a cutoff if the throw requires it; never abandon a force play casually.", "3B":"Hold third; prepare for advancing lead runner.","1B":"Hold first for the batter-runner before rotating.",P:"Support the middle; cover an unoccupied base when needed.",C:"Direct the throw and runner traffic."}}
};
const col={zone:"#35db9a",deep:"#38bdf8",gap:"#fb923c",weak:"#fb7185",move:"#d7e2ee",throw:"#fbbf24"};
function getPoint(id,formations) {const p=roster.find(v=>v.id===id);return formations[id]||[p.x,p.y];}
function diagramView(formation,selected,scenario,bases,showZones){
 const deep=formation==="power",press=formation==="press",grass=formation==="grass",turn=formation==="turn";
 const offsets={ LF:[0,press?20:deep?-28:0],LCF:[0,press?18:deep?-29:0],RCF:[0,deep?-26:0],RF:[0,press?18:deep?-28:0],SS:[0,turn?21:grass?-19:0],"2B":[0,turn?18:grass?0:0]};
 const points=Object.fromEntries(roster.map(p=>[p.id,[p.x+(offsets[p.id]?.[0]||0),p.y+(offsets[p.id]?.[1]||0)]]));
 return {points,deep,press,grass,turn};
}
function routeD(x1,y1,x2,y2){return `M ${x1} ${y1} L ${x2} ${y2}`;}
export default function DefensiveZonePlaybook(){
 const [formation,setFormation]=useState("base");
 const [scenario,setScenario]=useState("coverage");
 const [selected,setSelected]=useState("LCF");
 const [bases,setBases]=useState("empty");
 const [outs,setOuts]=useState(0);
 const [zones,setZones]=useState(true);
 const state=useMemo(()=>diagramView(formation,selected,scenario,bases,zones),[formation,selected,scenario,bases,zones]);
 const current=scenarioData[scenario];
 const selectedPlayer=roster.find(p=>p.id===selected);
 const position=(id)=>state.points[id];
 const occupied=bases==="loaded"?["1B","2B","3B"]:bases==="empty"?[]:bases.split("+");
 return <section className="mx-auto w-full max-w-5xl rounded-2xl border border-cyan-400/20 bg-black p-3 text-white sm:p-5">
   <div className="flex flex-wrap items-center justify-between gap-2"><div><div className="text-[10px] font-black uppercase tracking-[.17em] text-cyan-400">Defensive playbook / Interactive</div><h2 className="mt-1 text-xl font-black sm:text-2xl">Coverage Lab</h2></div><span className="rounded-full border border-amber-400/30 px-3 py-1 text-[10px] text-amber-200">Illustrative — range not measured</span></div>
   <p className="mt-2 text-xs leading-5 text-slate-400">Tap a name to see his zone and assignment. Colored circles overlap like a Venn diagram. Weaknesses are the seams with no reliable first defender.</p>
   <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">{Object.entries(definitions).map(([key,v])=><button key={key} type="button" onClick={()=>setFormation(key)} className={`min-h-10 rounded-lg px-2 py-2 text-[11px] font-bold ${formation===key?"bg-cyan-400 text-black":"border border-white/15 bg-slate-900 text-slate-200"}`}>{v.label}</button>)}</div>
   <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{Object.entries(scenarioData).map(([key,v])=><button key={key} type="button" onClick={()=>setScenario(key)} className={`rounded-lg border px-2 py-2 text-[11px] font-semibold ${scenario===key?"border-amber-400 bg-amber-400/15 text-amber-200":"border-white/10 bg-slate-950 text-slate-300"}`}>{v.title}</button>)}</div>
   <div className="mt-3 flex flex-wrap items-center gap-2"><label className="text-[11px] text-slate-300">Runners <select value={bases} onChange={e=>setBases(e.target.value)} className="ml-1 rounded-md border border-white/15 bg-slate-900 px-2 py-2 text-white"><option value="empty">Empty</option><option value="1B">First</option><option value="2B">Second</option><option value="3B">Third</option><option value="1B+2B">First + second</option><option value="1B+3B">Corners</option><option value="2B+3B">Second + third</option><option value="loaded">Loaded</option></select></label><label className="text-[11px] text-slate-300">Outs <select value={outs} onChange={e=>setOuts(Number(e.target.value))} className="ml-1 rounded-md border border-white/15 bg-slate-900 px-2 py-2 text-white">{[0,1,2].map(v=><option key={v} value={v}>{v}</option>)}</select></label><label className="ml-auto flex items-center gap-2 text-[11px] text-slate-300"><input type="checkbox" checked={zones} onChange={e=>setZones(e.target.checked)}/>Coverage overlays</label></div>
   <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-[#030e12]">
   <svg viewBox="0 0 540 612" role="img" aria-label="Interactive softball diamond with overlapping player coverage, relay paths and player names" className="h-auto w-full touch-manipulation">
    <defs><radialGradient id="fieldGrass" cx="50%" cy="70%" r="85%"><stop offset="0%" stopColor="#1d664f"/><stop offset="100%" stopColor="#0a2e29"/></radialGradient><linearGradient id="skin" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#9f7956"/><stop offset="100%" stopColor="#775036"/></linearGradient><marker id="arrowGold" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6" fill={col.throw}/></marker><marker id="arrowWhite" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6" fill={col.move}/></marker></defs>
    <rect width="540" height="612" fill="#030e12"/>
    <path d="M24 525 Q38 155 270 38 Q501 155 516 525 L270 578 Z" fill="url(#fieldGrass)" stroke="#91b9a5" strokeWidth="2"/>
    {[108,150,195,240].map(y=><path key={y} d={`M 60 ${y+75} Q 270 ${y-65} 480 ${y+75}`} fill="none" stroke="#6ec9a0" strokeOpacity=".12" strokeWidth="16"/>)}
    <path d="M270 578 L105 415 L270 299 L435 415 Z" fill="url(#skin)" stroke="#ddc6a1" strokeWidth="2"/>
    <path d="M270 578 L105 415 L270 299 L435 415 Z" fill="none" stroke="#fff0d0" strokeWidth="1"/>
    <path d="M270 578 L24 525 M270 578 L516 525" stroke="#f7edd3" strokeWidth="2"/>
    {[[270,299,"2B"],[105,415,"3B"],[435,415,"1B"]].map(([x,y,id])=><g key={id}><rect x={x-6} y={y-6} width="12" height="12" transform={`rotate(45 ${x} ${y})`} fill={occupied.includes(id)?"#fbbf24":"#f9fafb"}/>{occupied.includes(id)&&<circle cx={x} cy={y-18} r="6" fill="#fb7185"/>}</g>)}
    <path d="M270 576 l-9 -10 h18 Z" fill="#ffffff"/>
    <circle cx="270" cy="433" r="34" fill="none" stroke="#f1d4a7" strokeOpacity=".7"/>
    {zones&&roster.map(p=>{const [x,y]=position(p.id);const big=["LF","LCF","RCF","RF"].includes(p.id);const ry=p.ry+(state.deep&&big?10:state.press&&big?-8:0);return <g key={p.id}><ellipse cx={x} cy={y} rx={p.rx} ry={ry} fill={big?col.zone:col.deep} fillOpacity={selected===p.id?".23":".095"} stroke={selected===p.id?col.throw:big?col.zone:col.deep} strokeOpacity={selected===p.id?".98":".5"} strokeDasharray="5 5" strokeWidth={selected===p.id?2.5:1.4}/></g>})}
    {zones&&<g fill={col.weak} fillOpacity=".11" stroke={col.weak} strokeDasharray="4 5" strokeWidth="1.4"><path d="M260 236 Q272 203 291 237 L295 289 Q270 279 248 290 Z"/><path d="M370 305 Q392 288 408 307 L399 337 Q379 323 360 337 Z"/></g>}
    {current.ball&&<circle cx={current.ball[0]} cy={current.ball[1]} r="9" fill="#fde047" stroke="#fff" strokeWidth="2"/>}
    {current.moves.map(([id,tx,ty])=>{const [x,y]=position(id);return <path key={id} d={routeD(x,y,tx,ty)} fill="none" stroke={col.move} strokeWidth="3" strokeDasharray="7 6" markerEnd="url(#arrowWhite)"/>})}
    {current.throw.map(([a,b],i)=>{const [x,y]=i===0&&current.ball?current.ball:position(a);const [tx,ty]=position(b);return <path key={a+b} d={routeD(x,y,tx,ty)} fill="none" stroke={col.throw} strokeWidth="4" strokeDasharray="9 5" markerEnd="url(#arrowGold)"/>})}
    {roster.map(p=>{const [x,y]=position(p.id);return <g key={p.id} onClick={()=>setSelected(p.id)} style={{cursor:"pointer"}} role="button" tabIndex={0} aria-label={`See ${p.name}'s ${p.id} defensive assignment`} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setSelected(p.id);}}}><circle cx={x} cy={y} r="16" fill={selected===p.id?"#fcd34d":"#0f2136"} stroke={selected===p.id?"#fff6d0":"#67e8f9"} strokeWidth="2"/><text x={x} y={y+3} textAnchor="middle" fontSize="10" fontWeight="800" fill={selected===p.id?"#111827":"white"}>{p.id}</text><rect x={x-38} y={y-35} width="76" height="17" rx="5" fill="#020617" fillOpacity=".9"/><text x={x} y={y-23} textAnchor="middle" fontSize="12" fontWeight="800" fill="white">{p.name}</text></g>})}
    <text x="270" y="600" textAnchor="middle" fill="#a5b4c8" fontSize="12">HOME PLATE</text>
   </svg>
   </div>
   <div className="mt-3 flex flex-wrap gap-3 text-[10px] font-semibold text-slate-200"><span className="text-emerald-300">● Primary coverage</span><span className="text-sky-300">● Infield support</span><span className="text-rose-300">● Possible weak seams</span><span className="text-amber-300">— Ball/throw route</span><span>⇢ Player rotation</span></div>
   <div className="mt-3 grid gap-3 sm:grid-cols-2"><article className="rounded-xl border border-cyan-400/20 bg-slate-950 p-3"><h3 className="font-black text-white">{definitions[formation].label}</h3><p className="mt-2 text-xs leading-5 text-slate-300">{definitions[formation].detail}</p><p className="mt-3 text-xs leading-5 text-rose-200"><strong>Weakness to test:</strong> shallow center between middle infield and the outfield, plus right-center when Jordan must charge straight in. Larger circles mean hypothetical reach, not proven fielding percentages.</p><p className="mt-2 text-xs leading-5 text-amber-100">Runners: {bases==="empty"?"none":bases==="loaded"?"bases loaded":bases.replaceAll("+"," & ")} · Outs: {outs}. Prioritize force and tag locations before assigning a cutoff or wheel route.</p></article><article className="rounded-xl border border-amber-400/20 bg-slate-950 p-3"><div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Selected defender</div><h3 className="mt-1 text-lg font-black">{selectedPlayer.name} <span className="text-cyan-300">· {selectedPlayer.id}</span></h3><p className="mt-2 text-xs text-slate-400">{selectedPlayer.skill}</p><p className="mt-3 text-sm leading-6 text-white">{current.roles[selected]}</p></article></div>
   <div className="mt-3 rounded-xl border border-white/10 bg-slate-950 p-3"><h3 className="text-base font-black">{current.title} <span className="text-xs font-normal text-slate-400">— every position has a job</span></h3><div className="mt-3 grid gap-2 sm:grid-cols-2">{roster.map(p=><button key={p.id} type="button" onClick={()=>setSelected(p.id)} className={`rounded-lg border p-2 text-left ${selected===p.id?"border-amber-400/70 bg-amber-300/10":"border-white/10 bg-white/[.025]"}`}><span className="text-xs font-extrabold text-cyan-300">{p.name} · {p.id}</span><span className="mt-1 block text-[11px] leading-5 text-slate-300">{current.roles[p.id]}</span></button>)}</div></div>
   <p className="mt-3 text-[11px] text-slate-500">Teaching model only. Relay and base assignments depend on the lead runner, batted-ball direction, the intended throw, and whether the base is still occupied. Test paths at practice before adopting them as team rules.</p>
 </section>;
}
