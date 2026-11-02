import React, { useState } from "react";
import { ArrowLeft, Bookmark, ChevronRight, Dumbbell, Hammer, Home, ListChecks, Package, Search, ShoppingBag, Sparkles, Trees } from "lucide-react";
import { useNavigate } from "react-router-dom";
import JarvisShop from "../components/customer/JarvisShop";

const CATEGORIES = [
  ["Home", Home, "air filters home supplies"],
  ["Tools", Hammer, "tools hardware"],
  ["Outdoor", Trees, "garden outdoor supplies"],
  ["Fitness", Dumbbell, "fitness equipment"],
];
const PROMPTS = ["Wireless mouse under $30", "Air filters for my house", "Best drill under $100", "Garden supplies under $50"];
const PROJECT_KEY = "sw:shop-assist:project-list:v1";
function readProjects() {
  try { const v = JSON.parse(localStorage.getItem(PROJECT_KEY) || "[]"); return Array.isArray(v) ? v.filter(s => typeof s === "string").slice(0, 20) : []; }
  catch { return []; }
}
export default function CustomerStore() {
  const nav = useNavigate();
  const [draft, setDraft] = useState("");
  const [showAssistant, setShowAssistant] = useState(false);
  const [projects, setProjects] = useState(readProjects);
  const [projectInput, setProjectInput] = useState("");
  function start(term) {
    const clean = term.trim();
    if (!clean) return;
    setDraft(clean);
    setShowAssistant(true);
    window.setTimeout(() => document.getElementById("shop-assistant")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }
  function addProject(e) {
    e.preventDefault();
    const text = projectInput.trim();
    if (!text || text.length > 120) return;
    const next = [...projects, text].slice(0, 20);
    setProjects(next); setProjectInput("");
    try { localStorage.setItem(PROJECT_KEY, JSON.stringify(next)); } catch { /* storage disabled */ }
  }
  function removeProject(index) {
    const next = projects.filter((_, i) => i !== index);
    setProjects(next);
    try { localStorage.setItem(PROJECT_KEY, JSON.stringify(next)); } catch { /* storage disabled */ }
  }
  return <main className="min-h-dvh bg-[#020617] pb-28 text-slate-100">
    <div className="mx-auto max-w-5xl px-3 pt-3 sm:px-6">
      <header className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/80 p-3">
        <button type="button" aria-label="Back to Personal dashboard" onClick={() => nav("/customer")} className="grid size-10 place-items-center rounded-xl border border-white/10"><ArrowLeft size={19}/></button>
        <span className="grid size-10 place-items-center rounded-xl border border-cyan-300/25 bg-cyan-400/10"><ShoppingBag size={20} className="text-cyan-300"/></span>
        <div className="min-w-0 flex-1"><div className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-300">SyncWorks Personal</div><h1 className="text-lg font-black">SYNC Shop Assist</h1></div>
      </header>
      <section className="mt-3 rounded-[1.5rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_100%_0%,rgba(99,102,241,.22),transparent_55%),linear-gradient(140deg,#0b1730,#020617)] p-4 sm:p-6">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-cyan-300"><Sparkles size={16}/> Your shopping assistant</div>
        <h2 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">What do you need today?</h2>
        <p className="mt-2 text-xs leading-5 text-slate-400">Find products by budget, shop supplies for a project, or save something to reorder.</p>
        <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={(e)=>{e.preventDefault();start(draft);}}>
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/15 bg-black/30 px-3 focus-within:border-cyan-300"><Search size={19} className="shrink-0 text-cyan-300"/><input value={draft} maxLength={180} onChange={e=>setDraft(e.target.value)} aria-label="Describe the product you need" placeholder="Find a product or supply…" className="min-h-12 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"/></label>
          <button type="submit" disabled={!draft.trim()} className="min-h-12 rounded-xl bg-cyan-400 px-5 text-sm font-black text-slate-950 disabled:opacity-50">Find options <ChevronRight size={16} className="ml-1 inline"/></button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">{PROMPTS.map(p=><button key={p} type="button" onClick={()=>start(p)} className="rounded-full border border-white/15 bg-white/[.04] px-3 py-2 text-[11px] font-semibold text-slate-200">{p}</button>)}</div>
      </section>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Find products",Search,()=>document.querySelector('input[aria-label="Describe the product you need"]')?.focus()],
          ["Saved searches",Bookmark,()=>{setShowAssistant(true);document.getElementById("shop-assistant")?.scrollIntoView({behavior:"smooth"});}],
          ["Project supplies",ListChecks,()=>document.getElementById("shop-projects")?.scrollIntoView({behavior:"smooth"})],
          ["Ask SYNC",Sparkles,()=>nav("/sync?return=%2Fcustomer%2Fstore")],
        ].map(([label,Icon,action])=><button key={label} type="button" onClick={action} className="flex min-h-24 flex-col items-start justify-between rounded-2xl border border-white/10 bg-slate-900/65 p-3 text-left hover:border-cyan-300/30"><Icon size={22} className="text-cyan-300"/><span className="text-xs font-bold">{label}</span></button>)}
      </div>
      <div id="shop-assistant" className="scroll-mt-28">{showAssistant && <JarvisShop />}</div>
      <section id="shop-projects" className="mt-4 scroll-mt-28 rounded-2xl border border-white/10 bg-slate-900/50 p-4">
        <div className="flex items-center gap-2"><ListChecks className="text-emerald-300" size={18}/><h2 className="text-base font-black">Project shopping list</h2></div>
        <p className="mt-1 text-xs text-slate-400">Keep a quick list of supplies and search each item when you're ready.</p>
        <form onSubmit={addProject} className="mt-3 flex gap-2"><input aria-label="Add project supply" maxLength={120} value={projectInput} onChange={e=>setProjectInput(e.target.value)} placeholder="e.g. Mulch, gloves, air filter…" className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm outline-none focus:border-cyan-400"/><button type="submit" disabled={!projectInput.trim()} className="rounded-xl bg-emerald-300 px-4 text-xs font-black text-slate-950 disabled:opacity-50">Add</button></form>
        <div className="mt-3 space-y-2">{projects.length ? projects.map((p,i)=><div key={i} className="flex items-center gap-2 rounded-xl border border-white/10 p-3"><Package size={18} className="text-cyan-300"/><span className="min-w-0 flex-1 text-sm">{p}</span><button type="button" onClick={()=>start(p)} className="rounded-lg border border-cyan-300/25 px-3 py-2 text-xs font-bold text-cyan-200">Find</button><button type="button" onClick={()=>removeProject(i)} aria-label={"Remove "+p} className="px-2 text-xs text-slate-400">Remove</button></div>) : <p className="rounded-xl border border-dashed border-white/10 p-4 text-xs text-slate-500">No supplies yet. Add your first item above.</p>}</div>
      </section>
      <section className="mt-4"><h2 className="mb-3 text-base font-black">Browse by need</h2><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{CATEGORIES.map(([label,Icon,term])=><button type="button" key={label} onClick={()=>start(term)} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] p-4 text-left text-xs font-bold hover:border-cyan-300/30"><Icon size={20} className="text-cyan-300"/>{label}</button>)}</div></section>
      <p className="mt-5 text-[11px] leading-5 text-slate-500">As an Amazon Associate, SyncWorks earns from qualifying purchases. Shop Assist opens Amazon for current pricing, reviews and checkout. We do not place orders or add items to your Amazon cart.</p>
    </div>
  </main>;
}
