import React, {useEffect,useState} from "react";
import {Activity,BookOpen,ClipboardList,Crosshair,ShieldCheck} from "lucide-react";
import {getSportsPlayers} from "../../api/sports";
import CoachBox from "./CoachBox";
import PracticeModeCard from "./PracticeModeCard";
import DefensePracticeCard from "./DefensePracticeCard";
import DefensiveScenarioStudio from "../../pages/DefensiveScenarioStudio";

const modes=[["overview","Coach Box",BookOpen],["practice","Practice",Crosshair],["coverage","Defense",ShieldCheck],["results","Results",Activity]];
export default function CoachWorkspace({team,groupId,coachId}){
 const [tab,setTab]=useState("overview");
 const [practiceTab,setPracticeTab]=useState("hitting");
 const [players,setPlayers]=useState([]);
 const [rosterError,setRosterError]=useState("");
 const teamId=team?.id;
 useEffect(()=>{if(!teamId)return;let alive=true;getSportsPlayers(teamId).then(rows=>{if(alive)setPlayers(rows);}).catch(()=>{if(alive)setRosterError("Roster could not load. Existing team practice data remains available when the connection returns.");});return()=>{alive=false;};},[teamId]);
 const button=(id,label,Icon)=> <button type="button" key={id} onClick={()=>setTab(id)} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border px-1 text-[10px] font-black sm:flex-row sm:text-xs ${tab===id?"border-cyan-300 bg-cyan-300 text-slate-950":"border-white/10 bg-white/[.035] text-slate-300"}`}><Icon className="h-4 w-4"/>{label}</button>;
 return <div className="mx-auto max-w-6xl space-y-3 text-white">
  <div className="rounded-2xl border border-cyan-300/15 bg-[linear-gradient(140deg,#071625,#0c1023)] p-3">
   <div className="text-[9px] font-black uppercase tracking-[.17em] text-cyan-300">Coach-only workspace</div>
   <h1 className="mt-1 text-xl font-black">Coaching Dashboard</h1>
   <p className="mt-1 text-xs leading-5 text-slate-400">Build the lineup, train the situation, set the coverage, and evaluate execution.</p>
   <div className="mt-3 grid grid-cols-4 gap-1.5 sm:gap-2">{modes.map(([id,label,Icon])=>button(id,label,Icon))}</div>
  </div>
  {rosterError&&<p className="rounded-lg border border-amber-300/20 p-2 text-xs text-amber-200">{rosterError}</p>}
  {tab==="overview"&&<>
   <div className="grid grid-cols-2 gap-2">
    <button type="button" onClick={()=>{setTab("practice");setPracticeTab("hitting");}} className="min-h-14 rounded-xl border border-emerald-300/25 bg-emerald-300/[.08] p-3 text-left text-xs font-black text-emerald-100"><Crosshair className="mb-1 h-4 w-4"/>Start practice</button>
    <button type="button" onClick={()=>setTab("coverage")} className="min-h-14 rounded-xl border border-cyan-300/25 bg-cyan-300/[.08] p-3 text-left text-xs font-black text-cyan-100"><ShieldCheck className="mb-1 h-4 w-4"/>Design defense</button>
   </div>
   <CoachBox team={team} canManage/>
  </>}
  {tab==="practice"&&<>
   <div className="grid grid-cols-2 gap-2">
    <button type="button" onClick={()=>setPracticeTab("hitting")} className={`min-h-11 rounded-lg border px-3 text-xs font-black ${practiceTab==="hitting"?"border-cyan-300 bg-cyan-300 text-slate-950":"border-white/10 text-slate-300"}`}>Batting / QAB</button>
    <button type="button" onClick={()=>setPracticeTab("defense")} className={`min-h-11 rounded-lg border px-3 text-xs font-black ${practiceTab==="defense"?"border-emerald-300 bg-emerald-300 text-slate-950":"border-white/10 text-slate-300"}`}>Fielding / Execution</button>
   </div>
   {practiceTab==="hitting"?<PracticeModeCard teamId={teamId} players={players} managerView/>:<DefensePracticeCard groupId={groupId} coachId={coachId} teamId={teamId} players={players}/>}
  </>}
  {tab==="coverage"&&<DefensiveScenarioStudio groupId={groupId} coachId={coachId}/>}
  {tab==="results"&&<>
   <div className="rounded-xl border border-white/10 bg-[#07111f] p-3"><div className="flex items-center gap-2 text-cyan-200"><ClipboardList className="h-4 w-4"/><h2 className="text-sm font-black">Practice results</h2></div><p className="mt-1 text-xs text-slate-400">Hitting QAB/situational success is tracked independently from defensive fielding and execution.</p></div>
   <PracticeModeCard teamId={teamId} players={players} managerView resultsOnly/>
   <DefensePracticeCard groupId={groupId} coachId={coachId} teamId={teamId} players={players} resultsOnly/>
  </>}
 </div>;
}
