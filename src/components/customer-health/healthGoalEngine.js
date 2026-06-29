// src/components/customer-health/healthGoalEngine.js
function n(v,f=0){const x=Number(String(v??"").replace(/[^\d.-]/g,""));return Number.isFinite(x)?x:f}
function d(v){if(!v)return null;const x=new Date(`${v}T12:00:00`);return Number.isFinite(x.getTime())?x:null}
function addDays(x,days){const y=new Date(x);y.setDate(y.getDate()+days);return y}
function bmi(weight,profile={}){const inches=n(profile.height_ft)*12+n(profile.height_in);return weight>0&&inches>0?(weight/(inches*inches))*703:0}
function weights(logs=[],profile={},snapshot={}){const rows=(Array.isArray(logs)?logs:[]).filter(x=>x?.type==="weight").map(x=>({weight:n(x.value),date:d(x.ymd||String(x.created_at||"").slice(0,10))})).filter(x=>x.weight>0&&x.date).sort((a,b)=>a.date-b.date);const fallback=n(snapshot.weight||profile.weight);if(!rows.length&&fallback>0)rows.push({weight:fallback,date:new Date()});return rows}
export function buildGoalAnalysis({profile={},snapshot={},progressLogs=[],history=[]}={}){
 const current=n(snapshot.weight||profile.weight),target=n(profile.target_weight),start=n(profile.goal_start_weight||current);
 const targetDate=d(profile.goal_target_date),startDate=d(profile.goal_start_date)||new Date(),now=new Date();
 const totalDays=targetDate?Math.max(1,Math.ceil((targetDate-startDate)/86400000)):0,totalChange=target-start,remaining=target-current;
 const required=totalDays?(totalChange/totalDays)*7:0,rows=weights(progressLogs,profile,snapshot);
 let actual=0;if(rows.length>=2){const a=rows[0],b=rows[rows.length-1],days=Math.max(1,(b.date-a.date)/86400000);actual=((b.weight-a.weight)/days)*7}
 let projected=null;if(current>0&&target>0&&actual!==0&&Math.sign(actual)===Math.sign(remaining)){projected=addDays(now,Math.round(Math.abs(remaining/actual)*7))}
 const expected=totalDays?start+totalChange*Math.min(1,Math.max(0,(now-startDate)/86400000/totalDays)):0;
 const direction=totalChange<0?"loss":totalChange>0?"gain":"maintain";let status="Set a target date",statusTone="slate";
 if(target>0&&targetDate){const gap=direction==="loss"?current-expected:expected-current;if(Math.abs(gap)<=.75){status="On pace";statusTone="lime"}else if(gap<-.75){status="Ahead of pace";statusTone="cyan"}else{status="Behind pace";statusTone="amber"}}
 const steps=n(snapshot.steps),stepGoal=n(snapshot.step_goal,8000),protein=n(snapshot.protein_today),proteinGoal=n(snapshot.protein_goal,150),calories=n(snapshot.calories),calorieGoal=n(snapshot.calorie_goal,2200),trained=!!snapshot.workout_completed_today,active=n(snapshot.active_minutes_today);
 let todayAction={title:"Set your goal",detail:"Add a target weight and date so the coach can calculate your pace.",action:"goals",button:"Set Goal"};
 if(target>0&&targetDate){
  if(!trained&&active<10&&steps<stepGoal*.65)todayAction={title:"Move for 12 minutes",detail:"You have not trained today and activity is below target. A short home session or brisk walk keeps momentum.",action:"plan-today",button:"Start Quick Session"};
  else if(proteinGoal>0&&protein<proteinGoal*.7)todayAction={title:"Close your protein gap",detail:`You have logged ${Math.round(protein)} of ${Math.round(proteinGoal)} g. Add a protein-focused meal or snack.`,action:"nutrition-dashboard",button:"Plan Protein"};
  else if(calorieGoal>0&&calories>calorieGoal*1.08)todayAction={title:"Choose light activity",detail:"Logged calories are above today's planned range. Use a walk or low-impact session, not punishment.",action:"cardio-player",button:"Start Walk"};
  else if(steps<stepGoal)todayAction={title:"Finish your steps",detail:`${Math.max(0,Math.round(stepGoal-steps)).toLocaleString()} steps remain today. A short walk is the simplest useful action.`,action:"cardio-player",button:"Start Walk"};
  else todayAction={title:"Stay consistent",detail:"Your key activity signals are on track today. Keep logging accurately so the projection becomes more reliable.",action:"quick:weight",button:"Log Weight"};
 }
 const fmt=x=>x?x.toLocaleDateString(undefined,{month:"long",day:"numeric",year:"numeric"}):"Not set";
 return {currentWeight:current,targetWeight:target,remainingWeight:Math.abs(remaining),requiredWeeklyRate:required,actualWeeklyRate:actual,currentBmi:bmi(current,profile),targetBmi:bmi(target,profile),targetDateLabel:fmt(targetDate),projectedDateLabel:projected?fmt(projected):(rows.length<2?"Log more weights":"Trend not moving toward goal"),status,statusTone,todayAction,weightLogCount:rows.length,historyCount:Array.isArray(history)?history.length:0};
}
