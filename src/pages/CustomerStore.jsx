import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Dumbbell,
  Hammer,
  HeartPulse,
  Home,
  Laptop,
  PackageSearch,
  Search,
  ShoppingBag,
  Sparkles,
  Trees,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const CATEGORIES = [
  { key: "HOME", label: "Home", icon: Home, copy: "Repairs, filters, organization and everyday household needs." },
  { key: "TOOLS", label: "Tools", icon: Hammer, copy: "Project tools, hardware and equipment suggested from your task list." },
  { key: "LAWN", label: "Lawn", icon: Trees, copy: "Lawn care, irrigation, cleanup and outdoor maintenance gear." },
  { key: "FAMILY", label: "Family", icon: HeartPulse, copy: "Useful household and family products without the clutter." },
  { key: "TECH", label: "Technology", icon: Laptop, copy: "Connected-home, productivity and everyday technology." },
  { key: "FITNESS", label: "Fitness", icon: Dumbbell, copy: "Protein, hydration, recovery and training accessories." },
];

const RECOMMENDATIONS = [
  {
    id: "air-filter",
    category: "HOME",
    eyebrow: "SYNC RECOMMENDED",
    title: "Replacement air filters",
    detail: "A task-aware recommendation pattern for routine home maintenance.",
    merchant: "Amazon",
    status: "Partner link not connected",
  },
  {
    id: "drill",
    category: "TOOLS",
    eyebrow: "PROJECT READY",
    title: "20V drill options",
    detail: "Designed for SYNC to surface the right product when a project calls for it.",
    merchant: "Amazon",
    status: "Partner link not connected",
  },
  {
    id: "protein",
    category: "FITNESS",
    eyebrow: "HEALTH PICK",
    title: "Protein options",
    detail: "Contextual nutrition recommendations can route here from SyncWorks Health.",
    merchant: "SEEQ + partners",
    status: "Affiliate IDs pending",
  },
];

const PARTNERS = [
  { name: "Amazon", detail: "Home, tools, lawn, family, technology and general product discovery.", status: "READY FOR LINK" },
  { name: "SEEQ", detail: "Fitness and protein partner placement for Health and Personal Store.", status: "READY FOR LINK" },
  { name: "Keeper", detail: "Software partner opportunity for identity and security recommendations.", status: "REVIEW" },
];

function CategoryCard({ item, active, onClick }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-3 text-left transition ${active ? "border-cyan-300/35 bg-cyan-500/[.10]" : "border-white/10 bg-white/[.025] hover:border-white/20"}`}
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-500/10 text-cyan-200"><Icon className="h-4 w-4" /></span>
      <div className="mt-2 text-[11px] font-black text-white">{item.label}</div>
      <div className="mt-1 text-[9px] leading-4 text-slate-500">{item.copy}</div>
    </button>
  );
}

function RecommendationCard({ item, onOpen }) {
  return (
    <button type="button" onClick={() => onOpen(item)} className="rounded-2xl border border-white/10 bg-white/[.025] p-4 text-left transition hover:-translate-y-px hover:border-cyan-300/25">
      <div className="text-[8px] font-black uppercase tracking-[.18em] text-cyan-300">{item.eyebrow}</div>
      <div className="mt-2 text-sm font-black text-white">{item.title}</div>
      <div className="mt-1 text-[10px] leading-4 text-slate-500">{item.detail}</div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[9px] font-bold text-slate-300">{item.merchant}</span>
        <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-amber-200">Preview</span>
      </div>
    </button>
  );
}

export default function CustomerStore() {
  const nav = useNavigate();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    const clean = query.trim().toLowerCase();
    return RECOMMENDATIONS.filter((item) => {
      const categoryMatch = category === "ALL" || item.category === category;
      const queryMatch = !clean || `${item.title} ${item.detail} ${item.merchant}`.toLowerCase().includes(clean);
      return categoryMatch && queryMatch;
    });
  }, [category, query]);

  return (
    <div className="min-h-dvh bg-[#020617] text-slate-100">
      <div className="mx-auto max-w-7xl px-3 pb-28 pt-3 sm:px-5 lg:px-8 lg:pb-10">
        <header className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/75 p-3 backdrop-blur-xl">
          <button type="button" onClick={() => nav("/customer")} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[.03] text-slate-300"><ArrowLeft className="h-4 w-4" /></button>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-300">SyncWorks Personal</div>
            <h1 className="truncate text-lg font-black text-white">Store</h1>
          </div>
          <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-violet-200">Preview</span>
        </header>

        <section className="mt-3 overflow-hidden rounded-[1.6rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_90%_0%,rgba(168,85,247,.18),transparent_34%),radial-gradient(circle_at_0%_100%,rgba(34,211,238,.12),transparent_30%),linear-gradient(145deg,rgba(8,18,35,.98),rgba(2,6,23,.98))] p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.18em] text-cyan-300"><Sparkles className="h-3.5 w-3.5" />Shop from what you already need</div>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">Useful products, not random ads.</h2>
              <p className="mt-2 text-[11px] leading-5 text-slate-400 sm:text-xs">The Store is designed for SYNC to turn tasks, projects, Health goals and household needs into relevant product options. Partner links will only activate after the approved affiliate account is connected.</p>
            </div>
            <button type="button" onClick={() => nav("/sync")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-violet-300/25 bg-violet-500/10 px-4 text-xs font-black text-violet-100">Ask SYNC what I need <ChevronRight className="h-4 w-4" /></button>
          </div>

          <label className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-3">
            <Search className="h-4 w-4 text-cyan-300" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tools, protein, home supplies…" className="min-w-0 flex-1 bg-transparent py-3 text-[12px] text-white outline-none placeholder:text-slate-600" />
          </label>
        </section>

        <section className="mt-4">
          <div className="mb-2 flex items-center justify-between"><h2 className="text-[12px] font-black text-white">Shop by need</h2><button type="button" onClick={() => setCategory("ALL")} className="text-[9px] font-black text-cyan-300">Show all</button></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {CATEGORIES.map((item) => <CategoryCard key={item.key} item={item} active={category === item.key} onClick={() => setCategory(item.key)} />)}
          </div>
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <div className="mb-2 flex items-center justify-between"><h2 className="text-[12px] font-black text-white">Recommended by SYNC</h2><span className="text-[9px] text-slate-500">{filtered.length} preview cards</span></div>
            {filtered.length ? <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((item) => <RecommendationCard key={item.id} item={item} onOpen={setSelected} />)}</div> : <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-[11px] text-slate-500">No preview recommendations match this filter yet.</div>}
          </div>

          <aside className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
            <div className="flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-cyan-300" /><h2 className="text-[12px] font-black text-white">Partner readiness</h2></div>
            <div className="mt-3 space-y-2">{PARTNERS.map((partner) => <div key={partner.name} className="rounded-xl border border-white/10 bg-black/15 p-3"><div className="flex items-center justify-between gap-2"><span className="text-[11px] font-black text-white">{partner.name}</span><span className="text-[8px] font-black uppercase tracking-wider text-amber-200">{partner.status}</span></div><p className="mt-1 text-[9px] leading-4 text-slate-500">{partner.detail}</p></div>)}</div>
            <div className="mt-3 rounded-xl border border-cyan-300/15 bg-cyan-500/[.05] p-3 text-[9px] leading-4 text-slate-400">Partner link — SyncWorks may earn a commission when an approved affiliate link is used. No merchant link is active in this preview.</div>
          </aside>
        </section>
      </div>

      {selected ? <div className="fixed inset-0 z-[230] bg-black/70 backdrop-blur-sm" onMouseDown={() => setSelected(null)}><aside className="absolute inset-y-0 right-0 w-[90%] max-w-md overflow-y-auto border-l border-cyan-300/15 bg-[#020817] p-4" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><div><div className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-300">Recommendation preview</div><h2 className="mt-1 text-xl font-black text-white">{selected.title}</h2></div><button type="button" onClick={() => setSelected(null)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10"><X className="h-5 w-5" /></button></div><div className="mt-5 rounded-2xl border border-white/10 bg-white/[.025] p-4"><PackageSearch className="h-6 w-6 text-cyan-300" /><p className="mt-3 text-sm leading-6 text-slate-300">{selected.detail}</p><div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-500/[.08] p-3 text-[10px] leading-4 text-amber-100">{selected.status}. We are intentionally not sending users to an untracked retailer link until the approved affiliate destination is configured.</div></div><button type="button" onClick={() => nav("/sync")} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-500/10 text-xs font-black text-cyan-100">Ask SYNC for alternatives <ChevronRight className="h-4 w-4" /></button></aside></div> : null}
    </div>
  );
}
