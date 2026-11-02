import React, { useState } from "react";
import { ArrowLeft, ExternalLink, Search, ShoppingBag, Star, Wallet, SlidersHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { amazonSearchUrl } from "../components/customer/JarvisShop";
import api from "../api/client";

const CHOICES = [
  { id: "quality", label: "Best quality", Icon: Star, sort: "review-rank", description: "Prioritize highly rated options" },
  { id: "value", label: "Best value", Icon: SlidersHorizontal, sort: "relevance", description: "Balance quality and price" },
  { id: "budget", label: "Budget friendly", Icon: Wallet, sort: "price-asc-rank", description: "Look for the lowest priced options" },
];
export default function CustomerStore() {
  const nav = useNavigate();
  const [query, setQuery] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("50");
  const [choice, setChoice] = useState("value");
  const [searched, setSearched] = useState(null);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [catalogMessage, setCatalogMessage] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event) {
    event.preventDefault();
    const q = query.trim();
    const minimum = min === "" ? 0 : Number(min);
    const maximum = Number(max);
    if (q.length < 2 || q.length > 180) return setError("Enter a product name between 2 and 180 characters.");
    if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum < 0 || maximum <= 0 || maximum > 10000 || minimum >= maximum) return setError("Set a valid price range (maximum $10,000).");
    setError("");
    setSearched({ q, minimum, maximum, choice });
    setLoading(true); setItems([]); setCatalogMessage("");
    try {
      const response = await api.get("/shop-assist/search/", { params: { q, min: minimum, max: maximum, priority: choice } });
      const products = Array.isArray(response.data?.items) ? response.data.items : [];
      setItems(products.slice(0, 3));
      if (!products.length) setCatalogMessage(response.data?.message || "No verified catalog products matched. Browse more on Amazon.");
    } catch { setCatalogMessage("Live product listings are currently unavailable. Browse on Amazon instead."); }
    finally { setLoading(false); }
  }
  const searchLink = searched ? (() => {
    const selected = CHOICES.find(c => c.id === searched.choice) || CHOICES[1];
    const url = new URL(amazonSearchUrl(searched.q, searched.maximum));
    url.searchParams.set("s", selected.sort);
    if (searched.minimum > 0) url.searchParams.set("low-price", String(searched.minimum));
    return url.toString();
  })() : "";
  return <main className="min-h-dvh bg-[#020617] px-3 pb-28 pt-3 text-white">
    <div className="mx-auto max-w-2xl">
      <header className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-3">
        <button type="button" onClick={()=>nav("/customer")} aria-label="Back to Personal" className="grid size-10 place-items-center rounded-xl border border-white/10"><ArrowLeft size={20}/></button>
        <ShoppingBag className="text-cyan-300" size={24}/>
        <div><p className="text-[10px] font-black uppercase tracking-widest text-cyan-300">SyncWorks Personal</p><h1 className="text-lg font-black">SYNC Shop Assist</h1></div>
      </header>
      <section className="mt-4 rounded-[1.6rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_95%_0%,rgba(99,102,241,.16),transparent_50%),#091225] p-4 sm:p-6">
        <h2 className="text-2xl font-black">What are you shopping for?</h2>
        <p className="mt-2 text-sm text-slate-400">Search once, set your budget, and choose what matters most.</p>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div><label htmlFor="shop-query" className="mb-2 block text-xs font-bold text-slate-300">Product</label>
            <div className="flex items-center gap-3 rounded-xl border border-white/20 bg-black/25 px-3 focus-within:border-cyan-400"><Search size={20} className="text-cyan-300"/><input id="shop-query" maxLength={180} autoComplete="off" value={query} onChange={e=>setQuery(e.target.value)} placeholder="e.g. wireless mouse" className="min-h-14 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-slate-500"/></div>
          </div>
          <fieldset><legend className="mb-2 text-xs font-bold text-slate-300">Price range</legend><div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-slate-400">Minimum ($)<input type="number" inputMode="decimal" min="0" max="9999" step="1" value={min} onChange={e=>setMin(e.target.value)} placeholder="Any" className="mt-2 min-h-12 w-full rounded-xl border border-white/20 bg-black/25 px-3 text-base text-white outline-none focus:border-cyan-400"/></label>
            <label className="text-xs text-slate-400">Maximum ($)<input type="number" inputMode="decimal" min="1" max="10000" step="1" required value={max} onChange={e=>setMax(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-white/20 bg-black/25 px-3 text-base text-white outline-none focus:border-cyan-400"/></label>
          </div></fieldset>
          <fieldset><legend className="mb-2 text-xs font-bold text-slate-300">What matters most?</legend><div className="grid gap-2 sm:grid-cols-3">
            {CHOICES.map(({id,label,Icon,description})=><label key={id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${choice===id?"border-cyan-400 bg-cyan-400/10":"border-white/15 bg-white/[.025]"}`}><input type="radio" className="accent-cyan-400" name="shop-priority" value={id} checked={choice===id} onChange={()=>setChoice(id)}/><Icon size={19} className="shrink-0 text-cyan-300"/><span><span className="block text-sm font-bold">{label}</span><span className="block text-[10px] text-slate-400">{description}</span></span></label>)}
          </div></fieldset>
          {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
          <button type="submit" className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 text-base font-black text-slate-950 hover:bg-cyan-300"><Search size={19}/> Find products</button>
        </form>
      </section>
      {searched && <section aria-live="polite" className="mt-4 rounded-2xl border border-white/10 bg-slate-900/65 p-4">
        <h3 className="text-lg font-black">{loading ? "Searching Amazon catalog…" : items.length ? "Matching products" : "Your Amazon search is ready"}</h3>
        <p className="mt-2 text-sm text-slate-300">Searching for <strong>{searched.q}</strong> between ${searched.minimum} and ${searched.maximum}, prioritizing {CHOICES.find(c=>c.id===searched.choice)?.label.toLowerCase()}.</p>
        {items.length > 0 && <div className="mt-4 grid gap-3">{items.map(item=><article key={item.asin} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.03] p-3">{item.image && <img src={item.image} alt="" className="h-20 w-20 shrink-0 rounded-lg bg-white object-contain" loading="lazy"/>}<div className="min-w-0 flex-1"><p className="text-sm font-bold text-white">{item.title}</p><p className="mt-1 text-sm font-black text-cyan-200">${item.price.toFixed(2)}</p><a href={item.url} target="_blank" rel="sponsored noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-black text-cyan-300">View on Amazon <ExternalLink size={13}/></a></div></article>)}</div>}
        {catalogMessage && <p className="mt-3 text-xs leading-5 text-amber-200">{catalogMessage}</p>}
        {!items.length && !catalogMessage && !loading && <p className="mt-3 text-xs text-amber-200">Review prices and ratings on Amazon before purchasing.</p>}
        <a href={searchLink} target="_blank" rel="sponsored noopener noreferrer" className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-500/10 px-4 text-sm font-black text-cyan-100">View matching products on Amazon <ExternalLink size={17}/></a>
        <a href={searchLink} target="_blank" rel="sponsored noopener noreferrer" className="mt-2 flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[.03] px-4 text-sm font-black text-white">Browse more items <ExternalLink size={17}/></a>
        <p className="mt-2 text-[11px] text-slate-400">Both links include the SyncWorks affiliate tag. Additional browsing and purchases on Amazon are subject to Amazon’s referral-session rules.</p>
      </section>}
      <p className="mt-5 px-1 text-xs leading-5 text-slate-500">As an Amazon Associate, SyncWorks earns from qualifying purchases. Checkout and cart changes happen on Amazon. Prices and availability may change.</p>
    </div>
  </main>;
}
