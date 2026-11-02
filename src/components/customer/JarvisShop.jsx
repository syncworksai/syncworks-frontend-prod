import React, { useMemo, useState } from "react";
import { ExternalLink, Heart, Search, ShoppingBag, Sparkles, Trash2 } from "lucide-react";

// Amazon Associates search handoff. Never present search results as verified products.
export const AMAZON_ASSOCIATE_TAG = "syncworksapp-20";
const STORAGE_KEY = "sw:jarvis-shop:saved-searches:v1";
const safeRead = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter((x) => x && typeof x.query === "string").slice(0, 25) : [];
  } catch { return []; }
};
export function amazonSearchUrl(query, budget, modifier = "") {
  const terms = [String(query || "").trim(), modifier].filter(Boolean).join(" ");
  const params = new URLSearchParams({ k: terms, tag: AMAZON_ASSOCIATE_TAG });
  // Amazon search does not support a guaranteed maximum-price filter via affiliate links.
  // The shopper must confirm price and delivery totals on Amazon.
  if (Number.isFinite(Number(budget)) && Number(budget) > 0) params.set("high-price", String(Number(budget)));
  return `https://www.amazon.com/s?${params.toString()}`;
}
export default function JarvisShop() {
  const [query, setQuery] = useState("");
  const [budget, setBudget] = useState("50");
  const [priority, setPriority] = useState("value");
  const [submitted, setSubmitted] = useState(null);
  const [saved, setSaved] = useState(safeRead);
  const [error, setError] = useState("");
  const choices = useMemo(() => {
    if (!submitted) return [];
    const base = submitted.query;
    const options = [
      { label: "Best overall search", note: "Compare build quality, features and buyer reviews.", modifier: submitted.priority === "quality" ? "premium reliable" : "best rated" },
      { label: "Best value search", note: "Compare features against the final checkout price.", modifier: "best value" },
      { label: "Budget search", note: "Start with affordable options and check total cost.", modifier: "affordable" },
    ];
    return options.map((choice) => ({ ...choice, url: amazonSearchUrl(base, submitted.budget, choice.modifier) }));
  }, [submitted]);
  function saveSearch() {
    if (!submitted) return;
    const next = [{ ...submitted, id: Date.now() }, ...saved.filter((s) => s.query !== submitted.query)].slice(0, 25);
    setSaved(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* private browsing */ }
  }
  function removeSaved(id) {
    const next = saved.filter((s) => s.id !== id);
    setSaved(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* private browsing */ }
  }
  function submit(event) {
    event.preventDefault();
    const clean = query.trim();
    const max = Number(budget);
    if (clean.length < 3 || clean.length > 180) { setError("Describe an item in 3–180 characters."); return; }
    if (!Number.isFinite(max) || max < 1 || max > 10000) { setError("Enter a budget between $1 and $10,000."); return; }
    setError("");
    setSubmitted({ query: clean, budget: max, priority });
  }
  return (
    <section aria-labelledby="sync-shop-assist-title" className="mt-3 rounded-[1.5rem] border border-cyan-400/25 bg-gradient-to-br from-slate-900 to-[#060b20] p-4 shadow-xl sm:p-6">
      <div className="flex items-start gap-3"><span className="rounded-xl bg-cyan-400/10 p-2 text-cyan-200"><Sparkles size={22} /></span>
        <div><div className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-300">SyncWorks Personal · Shopping assistant</div>
          <h2 id="sync-shop-assist-title" className="mt-1 text-xl font-black text-white">SYNC Shop Assist</h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">Find what you need fast. Set a budget, compare Amazon searches, and check out securely on Amazon.</p>
        </div>
      </div>
      <form onSubmit={submit} className="mt-5 grid gap-3">
        <label className="text-xs font-semibold text-slate-200" htmlFor="jarvis-item">What are you looking for?</label>
        <input id="jarvis-item" value={query} maxLength={180} onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. wireless mouse for travel" className="w-full rounded-xl border border-white/15 bg-black/30 p-3 text-sm text-white outline-none focus:border-cyan-400" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-200">Maximum item price ($)
          <input type="number" inputMode="decimal" min="1" max="10000" step="1" value={budget} onChange={(e) => setBudget(e.target.value)}
            className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 p-3 text-sm text-white focus:border-cyan-400" /></label>
          <label className="text-xs font-semibold text-slate-200">Shopping priority
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-sm text-white">
              <option value="value">Best value</option><option value="quality">Quality and reviews</option><option value="price">Lowest price</option>
            </select></label></div>
        {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
        <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300"><Search size={17}/> Find my options</button>
      </form>
      {submitted && <div className="mt-5" aria-live="polite"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-black text-white">Three ways to shop</h3><button type="button" onClick={saveSearch} className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-200"><Heart size={14}/> Save search</button></div>
        <p className="mt-2 text-xs text-amber-200">These are tailored Amazon searches, not independently verified products. Prices, stock, seller reputation and reviews must be checked on Amazon.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">{choices.map((choice) => <article key={choice.label} className="rounded-xl border border-white/10 bg-white/[.03] p-3">
          <div className="text-sm font-bold text-white">{choice.label}</div><p className="mt-1 min-h-12 text-xs leading-5 text-slate-400">{choice.note}</p>
          <a href={choice.url} target="_blank" rel="sponsored noopener noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 px-3 py-2 text-xs font-black text-cyan-200 hover:bg-cyan-400/10">Search Amazon <ExternalLink size={13}/></a>
        </article>)}</div></div>}
      {saved.length > 0 && <div className="mt-5 border-t border-white/10 pt-4"><h3 className="flex items-center gap-2 text-xs font-black text-white"><ShoppingBag size={15}/> Saved shopping searches</h3>
        <div className="mt-3 grid gap-2">{saved.map((item) => <div key={item.id} className="flex items-center gap-2 rounded-lg border border-white/10 p-2">
          <button type="button" className="min-w-0 flex-1 truncate text-left text-xs text-cyan-200" onClick={() => { setQuery(item.query); setBudget(String(item.budget)); setPriority(item.priority || "value"); setSubmitted(item); }}>{item.query} · up to ${item.budget}</button>
          <button type="button" aria-label={`Remove saved search ${item.query}`} onClick={() => removeSaved(item.id)} className="text-slate-400 hover:text-rose-300"><Trash2 size={15}/></button>
        </div>)}</div></div>}
      <p className="mt-5 border-t border-white/10 pt-3 text-[11px] leading-5 text-slate-400">As an Amazon Associate, SyncWorks earns from qualifying purchases. Amazon handles carts, payments, delivery and returns. The price filter is a search preference, not a checkout guarantee; shipping and taxes may add to the total.</p>
    </section>
  );
}
