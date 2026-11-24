import React,{useEffect,useMemo,useState} from "react";
import {BookOpen,Search,X,CheckCircle2,Clock3} from "lucide-react";
import {forgeBookCatalog,forgeBookCategories} from "./forgeBookCatalog";
import "./ForgeBookLibrary.css";
export default function ForgeBookLibrary({open,onClose,onSelect}){
 const [search,setSearch]=useState("");
 const [category,setCategory]=useState("All subjects");
 const list=useMemo(()=>forgeBookCatalog.filter(b=>
   (category==="All subjects"||b.subjects.includes(category))&&
   (b.title+" "+b.author+" "+b.category).toLowerCase().includes(search.toLowerCase())
 ),[category,search]);
 useEffect(()=>{
   if(!open)return undefined;
   const onKey=e=>{if(e.key==="Escape")onClose();};
   document.addEventListener("keydown",onKey);
   return ()=>document.removeEventListener("keydown",onKey);
 },[open,onClose]);
 if(!open)return null;
 return <div className="forge-library-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)onClose();}}>
  <section className="forge-library-dialog" role="dialog" aria-modal="true" aria-labelledby="forge-library-title">
   <header className="forge-library-head">
    <div><span>THE FORGE · GREAT BOOKS</span><h2 id="forge-library-title">The Forge Book Library</h2><p>Entrepreneurship, strategy, philosophy, history, finance and the human mind. Study one meaningful idea at a time.</p></div>
    <button type="button" aria-label="Close library" onClick={onClose}><X size={20}/></button>
   </header>
   <div className="forge-library-tools">
     <label><Search size={17}/><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find a book, author, or subject…" aria-label="Search books"/></label>
     <select value={category} onChange={e=>setCategory(e.target.value)} aria-label="Filter library by subject"><option>All subjects</option>{forgeBookCategories.map(c=><option key={c}>{c}</option>)}</select>
   </div>
   <p className="forge-library-count">{list.length} titles · {forgeBookCatalog.filter(x=>x.status==="available").length} complete deep study currently available · other titles are reading-roadmap entries awaiting original studies</p>
   <div className="forge-library-list" tabIndex={0}>
    {list.map(book=><div className="forge-library-book" key={book.id}>
      <div className="forge-library-book-icon"><BookOpen size={23}/></div><div className="forge-library-book-info"><strong>{book.title}</strong><span>{book.author}</span><small>{book.subjects.join(" · ")}</small></div>
      {book.studyId?<button type="button" className="forge-library-open" onClick={()=>onSelect(book.studyId)}><CheckCircle2 size={15}/> Open study</button>:<span className="forge-library-planned"><Clock3 size={14}/> Planned</span>}
    </div>)}
    {!list.length?<p className="forge-library-empty">No matching books. Try another search or category.</p>:null}
   </div>
   <footer>Original study notes and critique, not reproduced books. Complete source texts are linked for public-domain works; copyrighted titles receive analytical overviews as studies are authored.</footer>
  </section>
 </div>;
}
