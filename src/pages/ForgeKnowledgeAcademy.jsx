import React,{useEffect,useMemo,useState} from "react";
import {ArrowLeft,BookOpen,CheckCircle2,Clock3,GraduationCap,Headphones,Search,X} from "lucide-react";
import {academyTracks,academyLessons} from "./forgeAcademyData";
import "./ForgeKnowledgeAcademy.css";
const storageKey=email=>"syncworks-forge-academy-v1:"+email;
function loadProgress(email){
 try{
  const v=JSON.parse(localStorage.getItem(storageKey(email))||"{}");
  return v&&typeof v==="object"&&!Array.isArray(v)?v:{};
 }catch{return {};}
}
export default function ForgeKnowledgeAcademy({open,email,onClose,onOpenLesson}){
 const [track,setTrack]=useState("all");
 const [query,setQuery]=useState("");
 const [selected,setSelected]=useState(null);
 const [choice,setChoice]=useState(null);
 const [feedback,setFeedback]=useState("");
 const [progress,setProgress]=useState(()=>loadProgress(email));
 const [overview,setOverview]=useState("tracks");
 useEffect(()=>{setProgress(loadProgress(email));},[email]);
 useEffect(()=>{
  if(!open)return;
  const onKey=e=>{if(e.key==="Escape")onClose();};
  document.addEventListener("keydown",onKey);
  return()=>document.removeEventListener("keydown",onKey);
 },[open,onClose]);
 const completedCount=academyLessons.filter(l=>progress[l.id]?.passed).length;
 const lessons=useMemo(()=>academyLessons.filter(l=>
  (track==="all"||l.track===track)&&
  (l.title+" "+(academyTracks.find(t=>t.id===l.track)?.title||"")).toLowerCase().includes(query.toLowerCase())
 ),[track,query]);
 function markPassed(lesson){
  const next={...progress,[lesson.id]:{passed:true,completedAt:new Date().toISOString()}};
  try{localStorage.setItem(storageKey(email),JSON.stringify(next));setProgress(next);}catch{setFeedback("Browser storage is unavailable; your answer was correct, but progress could not be saved.");}
 }
 function grade(){
  if(choice===null||!selected)return;
  if(choice===selected.question.correct){
   markPassed(selected);
   setFeedback("Correct. "+selected.question.why);
  }else setFeedback("Not quite. "+selected.question.why+" Review the lesson and try again.");
 }
 function openLesson(lesson){
  setSelected(lesson);setChoice(null);setFeedback("");
  setOverview("lesson");
 }
 if(!open)return null;
 return <div className="forge-academy-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)onClose();}}>
  <section className="forge-academy-panel" role="dialog" aria-modal="true" aria-labelledby="forge-academy-heading">
   <header className="forge-academy-header">
     <div><span>THE FORGE · CONTINUING EDUCATION</span><h2 id="forge-academy-heading">Personal Knowledge Academy</h2><p>Build practical knowledge across work, money, the mind, and society.</p></div>
     <button type="button" className="forge-academy-close" aria-label="Close academy" onClick={onClose}><X size={20}/></button>
   </header>
   <div className="forge-academy-stat">
    <span><GraduationCap size={17}/> {academyTracks.length} tracks · {academyLessons.length} complete starter lessons</span>
    <strong>{completedCount}/{academyLessons.length} lessons passed</strong>
   </div>
   {overview==="tracks"?<>
     <div className="forge-academy-filters">
      <label><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} type="search" placeholder="Search the academy…" aria-label="Search academy lessons"/></label>
      <select value={track} onChange={e=>setTrack(e.target.value)} aria-label="Choose subject"><option value="all">All learning tracks</option>{academyTracks.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select>
     </div>
     <div className="forge-academy-list" tabIndex={0}>
       {track==="all"&&!query&&<div className="forge-academy-intro">
         <strong>Learn → Apply → Recall → Discuss</strong>
         <p>Each lesson includes an original study, vocabulary, a practice exercise, a knowledge check, and a source for further reading. This is a growing continuing-education program, not a professional certification.</p>
       </div>}
       {lessons.map(lesson=>{
        const category=academyTracks.find(t=>t.id===lesson.track);
        const passed=!!progress[lesson.id]?.passed;
        return <button type="button" className="forge-academy-lesson" key={lesson.id} onClick={()=>openLesson(lesson)}>
          <div className="forge-academy-lesson-icon">{passed?<CheckCircle2 size={20}/>:<BookOpen size={20}/>}</div>
          <div><small>{category?.title} · Lesson {lesson.order}</small><strong>{lesson.title}</strong><span>{lesson.objectives[0]}</span></div>
          <div className="forge-academy-lesson-end"><span><Clock3 size={13}/> {lesson.minutes} min</span><em>{passed?"Passed":"Open"}</em></div>
        </button>;
       })}
       {!lessons.length&&<p className="forge-academy-empty">No lessons found for that search.</p>}
     </div>
   </>:<>
     <div className="forge-academy-detail">
       <button className="forge-academy-back" type="button" onClick={()=>setOverview("tracks")}><ArrowLeft size={15}/> All lessons</button>
       <div className="forge-academy-detail-title"><small>{academyTracks.find(t=>t.id===selected.track)?.title}</small><h3>{selected.title}</h3><p>{selected.minutes}-minute study · {selected.sections.length} learning sections</p></div>
       <div className="forge-academy-detail-actions"><button type="button" className="forge-academy-primary" onClick={()=>onOpenLesson(selected.id,"read")}><BookOpen size={16}/> Read full lesson</button><button type="button" className="forge-academy-secondary" onClick={()=>onOpenLesson(selected.id,"listen")}><Headphones size={16}/> Listen to lesson</button></div>
       <div className="forge-academy-objectives"><strong>After this lesson, you should be able to:</strong>{selected.objectives.map(x=><p key={x}>• {x}</p>)}</div>
       <div className="forge-academy-practice"><strong>APPLY IT TODAY</strong><p>{selected.practice}</p></div>
       <div className="forge-academy-quiz">
         <h4>Knowledge check</h4><p>{selected.question.prompt}</p>
         {selected.question.options.map((answer,i)=><label key={i} className={choice===i?"chosen":""}><input type="radio" name={"academy-"+selected.id} checked={choice===i} onChange={()=>{setChoice(i);setFeedback("");}}/>{answer}</label>)}
         <button className="forge-academy-primary" disabled={choice===null} onClick={grade} type="button">Check my answer</button>
         {feedback&&<p className="forge-academy-feedback" role="status">{feedback}</p>}
         {progress[selected.id]?.passed&&<p className="forge-academy-passed"><CheckCircle2 size={16}/> Completed knowledge check</p>}
       </div>
       <p className="forge-academy-source">Further reading: <a href={selected.source.url} target="_blank" rel="noopener noreferrer">{selected.source.label}</a></p>
       <p className="forge-academy-disclaimer">{selected.caution}</p>
     </div>
   </>}
   <footer>Progress is currently stored in this browser, not yet synchronized across devices. Courses are educational and do not grant licenses, degrees, or professional advice.</footer>
  </section>
 </div>;
}
