// src/components/customer-health/HealthGoalCenterDrawer.jsx
import React,{useEffect,useMemo,useState} from "react";
import HealthDrawer from "./HealthDrawer";
import {buildGoalAnalysis} from "./healthGoalEngine";
const text=v=>v===0||v?String(v):"";
export default function HealthGoalCenterDrawer({open,onClose,profile,snapshot,progressLogs,history,onSave}){
 const [form,setForm]=useState({}),[saved,setSaved]=useState(false);
 useEffect(()=>{if(!open)return;setForm({primary_goal:profile?.primary_goal||"Weight loss",weight:text(snapshot?.weight||profile?.weight),target_weight:text(profile?.target_weight),goal_target_date:profile?.goal_target_date||"",step_goal:text(snapshot?.step_goal||8000),calorie_goal:text(snapshot?.calorie_goal||2200),protein_goal:text(snapshot?.protein_goal||150),training_days:text(profile?.training_days||3)});setSaved(false)},[open,profile,snapshot]);
 const preview=useMemo(()=>buildGoalAnalysis({profile:{...profile,...form,goal_start_weight:profile?.goal_start_weight||form.weight||snapshot?.weight||profile?.weight,goal_start_date:profile?.goal_start_date||new Date().toISOString().slice(0,10)},snapshot:{...snapshot,weight:form.weight,step_goal:form.step_goal,calorie_goal:form.calorie_goal,protein_goal:form.protein_goal},progressLogs,history}),[form,profile,snapshot,progressLogs,history]);
 const update=(field,value)=>{setForm(p=>({...p,[field]:value}));setSaved(false)};
 function save(){if(!form.weight||!form.target_weight||!form.goal_target_date)return;onSave?.({profile:{primary_goal:form.primary_goal,weight:form.weight,target_weight:form.target_weight,goal_target_date:form.goal_target_date,goal_start_weight:profile?.goal_start_weight||form.weight,goal_start_date:profile?.goal_start_date||new Date().toISOString().slice(0,10),training_days:form.training_days},snapshot:{weight:form.weight,step_goal:form.step_goal,calorie_goal:form.calorie_goal,protein_goal:form.protein_goal,goal:form.primary_goal,goal_updated_at:new Date().toISOString()}});setSaved(true)}
 const fieldClass="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-white";
 return <HealthDrawer open={open} onClose={onClose} title="Goal Center" subtitle="Set the destination. SyncWorks will calculate pace and turn today's data into the next useful action.">
  <div className="space-y-4 pb-24">
   <section className="rounded-[1.6rem] border border-lime-300/25 bg-lime-300/[0.07] p-4">
    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-lime-200">Goal Projection</div>
    <div className="mt-2 text-2xl font-black text-white">{preview.currentWeight||"-"} â†’ {preview.targetWeight||"-"} lb</div>
    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
     {[["Target date",preview.targetDateLabel],["Projected date",preview.projectedDateLabel],["Required pace",preview.requiredWeeklyRate?`${Math.abs(preview.requiredWeeklyRate).toFixed(2)} lb/week`:"-"],["BMI now â†’ goal",preview.currentBmi?`${preview.currentBmi.toFixed(1)} â†’ ${preview.targetBmi.toFixed(1)}`:"Add height"]].map(([a,b])=><div key={a} className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-slate-500">{a}</div><div className="mt-1 font-black text-white">{b}</div></div>)}
    </div>
   </section>
   <section className="rounded-[1.6rem] border border-white/10 bg-white/[0.035] p-4">
    <div className="grid gap-3 sm:grid-cols-2">
     <label className="text-xs font-black text-slate-300">Primary goal<select value={form.primary_goal||""} onChange={e=>update("primary_goal",e.target.value)} className={fieldClass}><option>Weight loss</option><option>Build muscle</option><option>Maintain weight</option><option>Athletic performance</option><option>Health and longevity</option></select></label>
     <label className="text-xs font-black text-slate-300">Target date<input type="date" value={form.goal_target_date||""} onChange={e=>update("goal_target_date",e.target.value)} className={fieldClass}/></label>
     <label className="text-xs font-black text-slate-300">Current weight (lb)<input inputMode="decimal" value={form.weight||""} onChange={e=>update("weight",e.target.value)} className={fieldClass}/></label>
     <label className="text-xs font-black text-slate-300">Target weight (lb)<input inputMode="decimal" value={form.target_weight||""} onChange={e=>update("target_weight",e.target.value)} className={fieldClass}/></label>
     <label className="text-xs font-black text-slate-300">Daily steps<input inputMode="numeric" value={form.step_goal||""} onChange={e=>update("step_goal",e.target.value)} className={fieldClass}/></label>
     <label className="text-xs font-black text-slate-300">Daily calories<input inputMode="numeric" value={form.calorie_goal||""} onChange={e=>update("calorie_goal",e.target.value)} className={fieldClass}/></label>
     <label className="text-xs font-black text-slate-300">Daily protein (g)<input inputMode="numeric" value={form.protein_goal||""} onChange={e=>update("protein_goal",e.target.value)} className={fieldClass}/></label>
     <label className="text-xs font-black text-slate-300">Workouts per week<input inputMode="numeric" value={form.training_days||""} onChange={e=>update("training_days",e.target.value)} className={fieldClass}/></label>
    </div>
   </section>
   <div className="sticky bottom-0 -mx-1 border-t border-white/10 bg-[#07101f]/95 px-1 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
    <button type="button" onClick={save} className="h-14 w-full rounded-2xl border border-lime-300/35 bg-lime-300/20 text-sm font-black text-lime-100">{saved?"Goal Saved":"Save Goal and Recalculate"}</button>
    {!form.weight||!form.target_weight||!form.goal_target_date?<div className="mt-2 text-center text-xs font-bold text-amber-200">Current weight, target weight, and target date are required.</div>:null}
   </div>
  </div>
 </HealthDrawer>
}
