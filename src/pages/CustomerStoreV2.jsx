import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronRight,
  CircleDollarSign,
  Dumbbell,
  Hammer,
  Home,
  PackageCheck,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Store,
  Trees,
  Wrench,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const CONTEXTS = [
  { key: "PERSONAL", label: "Personal", icon: Home },
  { key: "HEALTH", label: "Health", icon: Dumbbell },
  { key: "BUSINESS", label: "Business", icon: BriefcaseBusiness },
  { key: "PROPERTY", label: "Property", icon: Building2 },
];

const PROJECT = {
  title: "Redo the flower beds",
  context: "PERSONAL",
  summary: "A project becomes the shared context for tasks, supplies, services, schedule and Storefront recommendations.",
  tasks: [
    "Measure the beds",
    "Remove weeds and old mulch",
    "Edge the beds",
    "Add soil or amendment",
    "Plant flowers",
    "Add mulch",
    "Water everything",
  ],
  supplies: [
    { id: "mulch", name: "Mulch", quantity: "Estimate after measurements", detail: "SYNC can calculate volume from bed dimensions.", merchant: "Amazon + partners", status: "NEEDS QUANTITY" },
    { id: "flowers", name: "Flowers", quantity: "Choose style + spacing", detail: "Match quantity to bed size, sunlight and planting plan.", merchant: "Partner options", status: "NEEDS CHOICE" },
    { id: "trowel", name: "Hand trowel", quantity: "1", detail: "Useful if the user does not already own one.", merchant: "Amazon", status: "READY TO SHOP" },
    { id: "gloves", name: "Garden gloves", quantity: "1 pair", detail: "Reusable project supply that can be remembered for later.", merchant: "Amazon", status: "READY TO SHOP" },
  ],
};

const REORDERS = [
  { title: "HVAC filter", detail: "Remember the exact size once a user confirms it.", context: "Personal" },
  { title: "Printer toner", detail: "Property or Business office supply reorder.", context: "Property" },
  { title: "Technician consumables", detail: "Bits, blades and supplies used during jobs.", context: "Business" },
  { title: "Protein / hydration", detail: "Health-driven reorder when the user wants it.", context: "Health" },
];

const BROWSE = [
  ["Home & maintenance", "Filters, repair supplies and household projects", Home],
  ["Tools & job supplies", "Tools, hardware and technician consumables", Hammer],
  ["Lawn & outdoor", "Lawn, garden, cleanup and outdoor projects", Trees],
  ["Health & fitness", "Training, recovery, nutrition and accessories", Dumbbell],
  ["Business supplies", "Office, field and operational supplies", BriefcaseBusiness],
  ["Property supplies", "Turns, maintenance and office purchasing", Building2],
];

function Pill({ children, tone = "cyan" }) {
  const styles = {
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-100",
    violet: "border-violet-400/20 bg-violet-500/10 text-violet-100",
    emerald: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
    amber: "border-amber-400/20 bg-amber-500/10 text-amber-100",
  };
  return <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[.13em] ${styles[tone]}`}>{children}</span>;
}

export default function CustomerStoreV2() {
  const nav = useNavigate();
  const [intent, setIntent] = useState("");
  const [context, setContext] = useState("PERSONAL");
  const [selectedSupply, setSelectedSupply] = useState(null);
  const [owned, setOwned] = useState({});
  const [done, setDone] = useState({});

  const completed = useMemo(() => Object.values(done).filter(Boolean).length, [done]);

  function buildIntent(event) {
    event.preventDefault();
    const clean = intent.trim();
    if (!clean) return;
    nav(`/sync?intent=${encodeURIComponent(clean)}&source=storefront`);
  }

  return (
    <div className="min-h-dvh bg-[#020617] text-slate-100">
      <div className="mx-auto max-w-[1500px] px-3 pb-28 pt-3 sm:px-5 lg:px-8 lg:pb-10">
        <header className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/80 p-3 backdrop-blur-xl">
          <button type="button" onClick={() => nav("/customer")} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[.03] text-slate-300" aria-label="Back"><ArrowLeft className="h-4 w-4" /></button>
          <div className="min-w-0 flex-1"><div className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-300">Universal commerce layer</div><h1 className="truncate text-lg font-black text-white">SyncWorks Storefront</h1></div>
          <Pill tone="emerald">Intent first</Pill>
        </header>

        <section className="mt-3 overflow-hidden rounded-[1.6rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_88%_0%,rgba(139,92,246,.20),transparent_35%),radial-gradient(circle_at_0%_100%,rgba(34,211,238,.13),transparent_31%),linear-gradient(145deg,rgba(8,18,35,.98),rgba(2,6,23,.98))] p-4 sm:p-5">
          <div className="max-w-3xl"><div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.18em] text-cyan-300"><Sparkles className="h-3.5 w-3.5" />Tell SYNC what needs to get done</div><h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">From need → plan → products or services → done.</h2><p className="mt-2 text-[11px] leading-5 text-slate-400 sm:text-xs">Storefront is not a catalog bolted onto SyncWorks. It is the purchasing layer behind projects, Health, technician work, properties and recurring supplies.</p></div>
          <form onSubmit={buildIntent} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-cyan-300/20 bg-black/25 px-3"><Search className="h-4 w-4 text-cyan-300" /><input value={intent} onChange={(event) => setIntent(event.target.value)} placeholder="I want to redo my flower beds…" className="min-w-0 flex-1 bg-transparent py-3 text-[12px] text-white outline-none placeholder:text-slate-600" /></label>
            <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-violet-300/25 bg-violet-500/10 px-4 text-xs font-black text-violet-100">Build with SYNC <ChevronRight className="h-4 w-4" /></button>
          </form>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">{CONTEXTS.map(({ key, label, icon: Icon }) => <button key={key} type="button" onClick={() => setContext(key)} className={`flex min-w-max items-center gap-2 rounded-xl border px-3 py-2 text-[9px] font-black ${context === key ? "border-cyan-300/30 bg-cyan-500/10 text-cyan-100" : "border-white/10 bg-white/[.025] text-slate-400"}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}</div>
        </section>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(330px,.65fr)]">
          <main className="space-y-4">
            <section className="rounded-[1.5rem] border border-white/10 bg-white/[.025] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-[9px] font-black uppercase tracking-[.15em] text-violet-300">Project example</div><h2 className="mt-1 text-lg font-black text-white">{PROJECT.title}</h2><p className="mt-1 max-w-2xl text-[10px] leading-5 text-slate-500">{PROJECT.summary}</p></div><Pill tone="violet">{completed}/{PROJECT.tasks.length} done</Pill></div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">{PROJECT.tasks.map((task, index) => <button key={task} type="button" onClick={() => setDone((current) => ({ ...current, [index]: !current[index] }))} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/15 p-3 text-left"><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border ${done[index] ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200" : "border-white/10 text-slate-600"}`}>{done[index] ? <Check className="h-3.5 w-3.5" /> : <span className="text-[9px] font-black">{index + 1}</span>}</span><span className={`text-[10px] font-bold ${done[index] ? "text-slate-500 line-through" : "text-slate-200"}`}>{task}</span></button>)}</div>
            </section>

            <section className="rounded-[1.5rem] border border-emerald-400/15 bg-emerald-500/[.035] p-4">
              <div className="flex items-center justify-between gap-3"><div><div className="text-[9px] font-black uppercase tracking-[.15em] text-emerald-300">What you'll need</div><h2 className="mt-1 text-base font-black text-white">SYNC Shopping List</h2></div><button type="button" onClick={() => nav("/sync?source=storefront&action=complete-shopping-list")} className="rounded-xl border border-cyan-300/20 bg-cyan-500/10 px-3 py-2 text-[9px] font-black text-cyan-100">Complete list</button></div>
              <div className="mt-3 space-y-2">{PROJECT.supplies.map((item) => <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/15 p-3 sm:flex-row sm:items-center"><button type="button" onClick={() => setOwned((current) => ({ ...current, [item.id]: !current[item.id] }))} className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${owned[item.id] ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200" : "border-white/10 text-slate-500"}`} aria-label={`Mark ${item.name} owned`}>{owned[item.id] ? <Check className="h-4 w-4" /> : <PackageCheck className="h-4 w-4" />}</button><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[11px] font-black text-white">{item.name}</span><span className="text-[8px] font-black uppercase tracking-wider text-amber-200">{item.status}</span></div><div className="mt-0.5 text-[9px] text-slate-400">Qty: {item.quantity}</div><div className="mt-1 text-[9px] leading-4 text-slate-500">{item.detail}</div></div><button type="button" disabled={owned[item.id]} onClick={() => setSelectedSupply(item)} className="min-h-10 rounded-xl border border-cyan-300/20 bg-cyan-500/10 px-3 text-[9px] font-black text-cyan-100 disabled:opacity-35">{owned[item.id] ? "Already owned" : "Find product"}</button></div>)}</div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => setSelectedSupply({ name: "Entire project", merchant: "Amazon + approved partners", detail: "The merchant handoff should preserve affiliate attribution for every qualifying product while keeping final checkout with the merchant.", status: "PARTNER HANDOFF" })} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-500/10 text-[10px] font-black text-emerald-100"><ShoppingBag className="h-4 w-4" />Shop project</button><button type="button" onClick={() => nav("/customer/new-request?query=redo%20flower%20beds")} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-violet-300/20 bg-violet-500/10 text-[10px] font-black text-violet-100"><Wrench className="h-4 w-4" />Hire it out instead</button></div>
            </section>
          </main>

          <aside className="space-y-4">
            <section className="rounded-[1.5rem] border border-white/10 bg-white/[.025] p-4"><div className="flex items-center gap-2"><PackageCheck className="h-4 w-4 text-cyan-300" /><h2 className="text-[12px] font-black text-white">Saved supplies & reorder</h2></div><p className="mt-1 text-[9px] leading-4 text-slate-500">Remember exact specifications so repeat purchases become a one-tap decision instead of another search.</p><div className="mt-3 space-y-2">{REORDERS.map((item) => <button key={item.title} type="button" onClick={() => setSelectedSupply({ name: item.title, detail: item.detail, merchant: "Preferred merchant", status: "REORDER PATTERN" })} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-black/15 p-3 text-left"><span className="grid h-8 w-8 place-items-center rounded-lg border border-cyan-300/15 bg-cyan-500/[.06] text-cyan-300"><Plus className="h-3.5 w-3.5" /></span><span className="min-w-0 flex-1"><span className="block text-[10px] font-black text-white">{item.title}</span><span className="block text-[8px] text-slate-500">{item.context} · {item.detail}</span></span><ChevronRight className="h-3.5 w-3.5 text-slate-600" /></button>)}</div></section>

            <section className="rounded-[1.5rem] border border-amber-400/15 bg-amber-500/[.03] p-4"><div className="flex items-center gap-2"><CircleDollarSign className="h-4 w-4 text-amber-300" /><h2 className="text-[12px] font-black text-white">How SyncWorks earns</h2></div><p className="mt-2 text-[9px] leading-4 text-slate-400">When an approved partner link is used, SyncWorks may earn a commission. The product recommendation should still be based on the user's need, fit and context—not on creating random ads.</p><div className="mt-3 rounded-xl border border-white/10 bg-black/15 p-3 text-[8px] leading-4 text-slate-500">Attribution: module → need/project → supply → merchant → campaign → click → reported conversion → earning.</div></section>
          </aside>
        </div>

        <section className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/[.02] p-4"><div className="flex items-center justify-between"><div><div className="text-[9px] font-black uppercase tracking-[.15em] text-cyan-300">Secondary path</div><h2 className="mt-1 text-base font-black text-white">Browse Storefront</h2></div><Store className="h-5 w-5 text-cyan-300" /></div><div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">{BROWSE.map(([title, detail, Icon]) => <button key={title} type="button" onClick={() => setSelectedSupply({ name: title, detail, merchant: "Amazon + approved partners", status: "BROWSE" })} className="rounded-xl border border-white/10 bg-black/15 p-3 text-left transition hover:border-cyan-300/20"><Icon className="h-4 w-4 text-cyan-300" /><div className="mt-2 text-[10px] font-black text-white">{title}</div><div className="mt-1 text-[8px] leading-4 text-slate-500">{detail}</div></button>)}</div></section>
      </div>

      {selectedSupply ? <div className="fixed inset-0 z-[230] bg-black/70 backdrop-blur-sm" onMouseDown={() => setSelectedSupply(null)}><aside className="absolute inset-y-0 right-0 w-[92%] max-w-md overflow-y-auto border-l border-cyan-300/15 bg-[#020817] p-4" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><div><div className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-300">Storefront handoff</div><h2 className="mt-1 text-xl font-black text-white">{selectedSupply.name}</h2></div><button type="button" onClick={() => setSelectedSupply(null)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10"><X className="h-5 w-5" /></button></div><div className="mt-5 rounded-2xl border border-white/10 bg-white/[.025] p-4"><ShoppingBag className="h-6 w-6 text-cyan-300" /><p className="mt-3 text-sm leading-6 text-slate-300">{selectedSupply.detail}</p><div className="mt-3 text-[10px] text-slate-500">Merchant rail: <span className="font-bold text-slate-300">{selectedSupply.merchant}</span></div><div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-500/[.08] p-3 text-[10px] leading-4 text-amber-100">{selectedSupply.status}. Actual merchant checkout stays disabled here until the approved affiliate destination and attribution service confirm the qualifying link.</div></div><button type="button" onClick={() => nav(`/sync?source=storefront&need=${encodeURIComponent(selectedSupply.name)}`)} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-500/10 text-xs font-black text-cyan-100"><Sparkles className="h-4 w-4" />Ask SYNC to finish this</button></aside></div> : null}
    </div>
  );
}
