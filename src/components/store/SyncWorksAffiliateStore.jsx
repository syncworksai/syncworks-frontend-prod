import React, { useMemo, useState } from "react";
import {
  AMAZON_ASSOCIATE_TAG,
  HEALTH_STORE_CATEGORIES,
  HEALTH_STORE_ITEMS,
  SEEQ_AFFILIATE_URL,
  WEWARD_REFERRAL_URL,
  amazonSearchUrl,
} from "./affiliateCatalog";

const RECENT_SEARCHES_KEY = "syncworks_affiliate_store_recent_v1";
const SAVED_ITEMS_KEY = "syncworks_affiliate_store_saved_v1";

const SMART_SEARCH_GROUPS = {
  protein: [
    { label: "Whey", query: "whey protein powder" },
    { label: "Clear Whey", query: "clear whey protein" },
    { label: "Isolate", query: "whey isolate protein" },
    { label: "Plant", query: "plant based protein powder" },
    { label: "Low Carb", query: "low carb protein powder" },
    { label: "Budget", query: "protein powder value size" },
  ],
  preworkout: [
    { label: "High Stim", query: "high stimulant pre workout" },
    { label: "Low Stim", query: "low stimulant pre workout" },
    { label: "Stim-Free", query: "stim free pre workout" },
    { label: "Pump", query: "pump pre workout nitric oxide" },
    { label: "Beginner", query: "beginner pre workout low caffeine" },
  ],
  creatine: [
    { label: "Monohydrate", query: "creatine monohydrate powder" },
    { label: "Capsules", query: "creatine monohydrate capsules" },
    { label: "Micronized", query: "micronized creatine monohydrate" },
    { label: "Single Serve", query: "creatine monohydrate travel packets" },
  ],
  hydration: [
    { label: "Electrolytes", query: "electrolyte powder fitness" },
    { label: "Low Sugar", query: "low sugar electrolyte powder" },
    { label: "Packets", query: "electrolyte packets hydration" },
    { label: "Shakers", query: "protein shaker bottle gym" },
  ],
  recovery: [
    { label: "Foam Rollers", query: "foam roller muscle recovery" },
    { label: "Massage", query: "massage gun muscle recovery" },
    { label: "Mobility", query: "mobility stretching recovery tools" },
    { label: "Compression", query: "compression recovery sleeves fitness" },
  ],
  equipment: [
    { label: "Belts", query: "weight lifting belt" },
    { label: "Straps", query: "lifting straps weightlifting" },
    { label: "Knee Sleeves", query: "knee sleeves weightlifting" },
    { label: "Wrist Wraps", query: "wrist wraps weightlifting" },
    { label: "Bands", query: "resistance bands fitness set" },
  ],
  "home-gym": [
    { label: "Dumbbells", query: "adjustable dumbbells home gym" },
    { label: "Bench", query: "adjustable workout bench home gym" },
    { label: "Rack", query: "power rack home gym" },
    { label: "Cable Attachments", query: "cable machine attachments gym" },
    { label: "Flooring", query: "rubber gym flooring home gym" },
  ],
  "meal-prep": [
    { label: "Containers", query: "meal prep containers reusable" },
    { label: "Food Scale", query: "digital food scale nutrition" },
    { label: "Lunch Bags", query: "meal prep lunch bag fitness" },
    { label: "Blenders", query: "personal blender protein shake" },
  ],
};

const SEARCH_TRIGGERS = [
  [/(protein|whey|isolate|clear whey|shake)/i, "protein"],
  [/(pre.?workout|caffeine|stim|pump)/i, "preworkout"],
  [/(creatine)/i, "creatine"],
  [/(electrolyte|hydration|water|shaker)/i, "hydration"],
  [/(recovery|foam|massage|mobility|compression)/i, "recovery"],
  [/(belt|strap|sleeve|wrap|band|equipment)/i, "equipment"],
  [/(dumbbell|bench|rack|cable|home gym)/i, "home-gym"],
  [/(meal prep|food scale|container|blender)/i, "meal-prep"],
];

function safeNumber(value, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readStoredList(key) {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistStoredList(key, value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Keep shopping usable when storage is unavailable.
  }
}

function ProductCard({ item, saved, onToggleSave, onShop }) {
  return (
    <article className="flex min-h-[250px] flex-col rounded-[1.5rem] border border-white/10 bg-[#080d0b] p-4 shadow-[0_18px_55px_rgba(0,0,0,0.28)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.18em] text-[#70ff3d]">
            {item.eyebrow}
          </div>
          <h3 className="mt-1 text-lg font-black text-white">{item.title}</h3>
        </div>
        <span className="rounded-full border border-cyan-300/20 bg-cyan-300/[0.08] px-2.5 py-1 text-[9px] font-black text-cyan-100">
          {item.badge}
        </span>
      </div>

      <p className="mt-3 flex-1 text-xs font-semibold leading-5 text-slate-400">
        {item.description}
      </p>

      <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
        <button
          type="button"
          onClick={() => onShop(item.query)}
          className="flex h-11 items-center justify-center rounded-xl border border-[#70ff3d]/30 bg-[#70ff3d]/12 px-3 text-xs font-black text-[#d8ffd0]"
        >
          Shop on Amazon
        </button>
        <button
          type="button"
          onClick={() => onToggleSave(item.id)}
          aria-pressed={saved}
          className={`h-11 rounded-xl border px-3 text-xs font-black ${
            saved
              ? "border-fuchsia-300/30 bg-fuchsia-300/10 text-fuchsia-100"
              : "border-white/10 bg-white/[0.04] text-slate-300"
          }`}
        >
          {saved ? "Saved" : "Save"}
        </button>
      </div>
      <div className="mt-2 text-center text-[9px] font-bold text-slate-600">
        Amazon paid link
      </div>
    </article>
  );
}

function CompactPick({ item, saved, onToggleSave, onShop }) {
  return (
    <article className="min-w-[220px] rounded-2xl border border-[#70ff3d]/20 bg-[#70ff3d]/[0.055] p-3 sm:min-w-0">
      <div className="text-[9px] font-black uppercase tracking-[0.15em] text-[#70ff3d]">{item.badge}</div>
      <div className="mt-1 text-sm font-black text-white">{item.title}</div>
      <div className="mt-1 line-clamp-2 text-[10px] font-semibold leading-4 text-slate-500">{item.description}</div>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => onShop(item.query)} className="h-9 flex-1 rounded-xl border border-[#70ff3d]/25 bg-[#70ff3d]/10 px-2 text-[10px] font-black text-[#d8ffd0]">
          Shop
        </button>
        <button type="button" onClick={() => onToggleSave(item.id)} aria-pressed={saved} className={`h-9 rounded-xl border px-3 text-[10px] font-black ${saved ? "border-fuchsia-300/25 bg-fuchsia-300/10 text-fuchsia-100" : "border-white/10 bg-white/[0.04] text-slate-400"}`}>
          {saved ? "Saved" : "Save"}
        </button>
      </div>
    </article>
  );
}

export default function SyncWorksAffiliateStore({
  open,
  onClose,
  profile = {},
  snapshot = {},
  mode = "health",
}) {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [recentSearches, setRecentSearches] = useState(() => readStoredList(RECENT_SEARCHES_KEY));
  const [savedItemIds, setSavedItemIds] = useState(() => readStoredList(SAVED_ITEMS_KEY));

  const proteinGoal = safeNumber(
    snapshot?.protein_goal || profile?.protein_goal,
    0
  );
  const proteinToday = safeNumber(
    snapshot?.protein_today || snapshot?.protein,
    0
  );
  const proteinRemaining = Math.max(0, proteinGoal - proteinToday);
  const workoutToday = Boolean(
    snapshot?.workout || snapshot?.today_workout_id
  );
  const completedToday = Boolean(snapshot?.workout_completed_today);

  const featuredIds = useMemo(() => {
    const ids = [];
    if (proteinRemaining >= 25) ids.push("protein-powder", "shaker");
    if (workoutToday && !completedToday) ids.push("preworkout", "electrolytes");
    if (completedToday) ids.push("protein-powder", "foam-roller", "electrolytes");
    ids.push("creatine-monohydrate", "resistance-bands");
    return [...new Set(ids)].slice(0, 5);
  }, [proteinRemaining, workoutToday, completedToday]);

  const recommendedItems = useMemo(
    () => featuredIds
      .map((id) => HEALTH_STORE_ITEMS.find((item) => item.id === id))
      .filter(Boolean)
      .slice(0, 4),
    [featuredIds]
  );

  const savedItems = useMemo(
    () => savedItemIds
      .map((id) => HEALTH_STORE_ITEMS.find((item) => item.id === id))
      .filter(Boolean),
    [savedItemIds]
  );

  const items = useMemo(() => {
    if (category === "all") {
      const preferred = featuredIds
        .map((id) => HEALTH_STORE_ITEMS.find((item) => item.id === id))
        .filter(Boolean);
      const rest = HEALTH_STORE_ITEMS.filter(
        (item) => !featuredIds.includes(item.id)
      );
      return [...preferred, ...rest];
    }
    return HEALTH_STORE_ITEMS.filter((item) => item.category === category);
  }, [category, featuredIds]);

  const smartGroup = useMemo(() => {
    const clean = String(search || "").trim();
    const matched = SEARCH_TRIGGERS.find(([pattern]) => pattern.test(clean));
    if (matched) return matched[1];
    if (category !== "all" && SMART_SEARCH_GROUPS[category]) return category;
    if (proteinRemaining >= 25) return "protein";
    if (workoutToday && !completedToday) return "preworkout";
    if (completedToday) return "recovery";
    return "equipment";
  }, [search, category, proteinRemaining, workoutToday, completedToday]);

  const smartSuggestions = SMART_SEARCH_GROUPS[smartGroup] || SMART_SEARCH_GROUPS.equipment;

  if (!open) return null;

  function rememberSearch(query) {
    const clean = String(query || "").trim();
    if (!clean) return;
    setRecentSearches((previous) => {
      const next = [
        clean,
        ...previous.filter((item) => String(item).toLowerCase() !== clean.toLowerCase()),
      ].slice(0, 6);
      persistStoredList(RECENT_SEARCHES_KEY, next);
      return next;
    });
  }

  function openTaggedAmazon(query) {
    const clean = String(query || "").trim();
    if (!clean) return;
    rememberSearch(clean);
    window.open(amazonSearchUrl(clean), "_blank", "noopener,noreferrer");
  }

  function toggleSavedItem(itemId) {
    if (!itemId) return;
    setSavedItemIds((previous) => {
      const exists = previous.includes(itemId);
      const next = exists
        ? previous.filter((id) => id !== itemId)
        : [itemId, ...previous].slice(0, 20);
      persistStoredList(SAVED_ITEMS_KEY, next);
      return next;
    });
  }

  function submitSearch(event) {
    event.preventDefault();
    openTaggedAmazon(search);
  }

  const storeTitle = mode === "health" ? "SYNC Health Store" : "SYNC Store";

  return (
    <div className="fixed inset-0 z-[120] bg-black/78 backdrop-blur-sm">
      <section className="absolute inset-0 flex flex-col overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(112,255,61,0.11),transparent_26%),radial-gradient(circle_at_top_left,rgba(52,223,255,0.08),transparent_30%),linear-gradient(180deg,#020403,#050806)] sm:inset-4 sm:rounded-[2rem] sm:border sm:border-[#70ff3d]/15">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-[#030604]/95 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[9px] font-black uppercase tracking-[0.22em] text-[#70ff3d]">
                Curated by SyncWorks
              </div>
              <h2 className="mt-1 text-2xl font-black text-white sm:text-3xl">{storeTitle}</h2>
              <p className="mt-1 max-w-2xl text-xs font-semibold leading-5 text-slate-400">
                Gear, fuel, recovery, and training essentials without turning Health into a shopping maze.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-10 shrink-0 rounded-xl border border-white/10 bg-white/[0.05] px-4 text-xs font-black text-white"
            >
              Close
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-3 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
          <div className="mx-auto max-w-6xl space-y-4">
            <section className="rounded-[1.5rem] border border-amber-300/20 bg-amber-300/[0.06] p-3">
              <div className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-200">Affiliate disclosure</div>
              <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-300">
                As an Amazon Associate I earn from qualifying purchases. Amazon buttons on this page are paid affiliate links using SyncWorks tracking ID {AMAZON_ASSOCIATE_TAG}.
              </p>
            </section>

            <section className="overflow-hidden rounded-[1.75rem] border border-[#70ff3d]/25 bg-[linear-gradient(135deg,rgba(112,255,61,0.12),rgba(4,10,7,0.92)_45%,rgba(52,223,255,0.08))] p-4 sm:p-5">
              <div className="grid gap-4 md:grid-cols-[1.2fr_.8fr] md:items-start">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[#70ff3d]">Today&apos;s store context</div>
                  <h3 className="mt-1 text-2xl font-black text-white">Useful picks, not random ads.</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
                    {proteinGoal
                      ? `You have about ${Math.round(proteinRemaining)}g of protein remaining today. `
                      : "Set your nutrition targets to make Health recommendations more useful. "}
                    {completedToday
                      ? "Your workout is complete, so recovery and refueling options are prioritized."
                      : workoutToday
                      ? "You have a workout on deck, so training and hydration options are prioritized."
                      : "Browse by what you actually need for your training setup."}
                  </p>
                </div>

                <form onSubmit={submitSearch} className="rounded-2xl border border-white/10 bg-black/25 p-3">
                  <label className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">Search Amazon fitness</label>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="e.g. Ghost protein, C4, knee sleeves"
                      className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
                    />
                    <button type="submit" className="h-11 rounded-xl bg-[#70ff3d] px-4 text-xs font-black text-[#041006]">
                      Search
                    </button>
                  </div>

                  <div className="mt-3 border-t border-white/10 pt-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[9px] font-black uppercase tracking-[0.14em] text-cyan-200">SYNC quick search</div>
                      <div className="text-[9px] font-bold text-slate-600">tag: {AMAZON_ASSOCIATE_TAG}</div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {smartSuggestions.map((item) => (
                        <button
                          key={`${smartGroup}-${item.label}`}
                          type="button"
                          onClick={() => openTaggedAmazon(item.query)}
                          className="min-h-9 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.07] px-3 text-[10px] font-black text-cyan-100 active:scale-[0.98]"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {recentSearches.length ? (
                    <div className="mt-3 border-t border-white/10 pt-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">Recent searches</div>
                        <button type="button" onClick={() => { setRecentSearches([]); persistStoredList(RECENT_SEARCHES_KEY, []); }} className="text-[9px] font-black text-slate-600">Clear</button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {recentSearches.map((item) => (
                          <button key={item} type="button" onClick={() => openTaggedAmazon(item)} className="min-h-8 rounded-lg border border-white/10 bg-white/[0.035] px-2.5 text-[9px] font-black text-slate-400">
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-2 text-[9px] font-bold leading-4 text-slate-600">
                    Any typed search, recent search, or quick-search chip opens Amazon through a SyncWorks affiliate-tagged URL.
                  </div>
                </form>
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-white/10 bg-[#070b09] p-3">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {HEALTH_STORE_CATEGORIES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCategory(item.id)}
                    className={`h-10 shrink-0 rounded-xl border px-3 text-xs font-black ${
                      category === item.id
                        ? "border-[#70ff3d]/40 bg-[#70ff3d]/14 text-[#d8ffd0]"
                        : "border-white/10 bg-white/[0.03] text-slate-400"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-[#70ff3d]/20 bg-[#070b09] p-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.18em] text-[#70ff3d]">SYNC recommended for today</div>
                  <h3 className="mt-1 text-lg font-black text-white">Start with what fits today&apos;s context</h3>
                </div>
                <div className="text-[9px] font-bold text-slate-600">affiliate-tagged</div>
              </div>
              <div className="mt-3 flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible">
                {recommendedItems.map((item) => (
                  <CompactPick
                    key={`recommended-${item.id}`}
                    item={item}
                    saved={savedItemIds.includes(item.id)}
                    onToggleSave={toggleSavedItem}
                    onShop={openTaggedAmazon}
                  />
                ))}
              </div>
            </section>

            {savedItems.length ? (
              <section className="rounded-[1.5rem] border border-fuchsia-300/20 bg-fuchsia-300/[0.035] p-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-[0.18em] text-fuchsia-200">Saved for later</div>
                    <h3 className="mt-1 text-lg font-black text-white">Your fitness shortlist</h3>
                  </div>
                  <div className="text-[10px] font-black text-fuchsia-100">{savedItems.length} saved</div>
                </div>
                <div className="mt-3 flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible">
                  {savedItems.map((item) => (
                    <CompactPick
                      key={`saved-${item.id}`}
                      item={item}
                      saved
                      onToggleSave={toggleSavedItem}
                      onShop={openTaggedAmazon}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            <section>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200">
                    {category === "all" ? "Recommended first" : HEALTH_STORE_CATEGORIES.find((item) => item.id === category)?.label}
                  </div>
                  <h3 className="mt-1 text-xl font-black text-white">Fitness essentials</h3>
                </div>
                <button
                  type="button"
                  onClick={() => openTaggedAmazon("fitness workout health")}
                  className="text-[10px] font-black text-cyan-200"
                >
                  Browse all Amazon →
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <ProductCard
                    key={item.id}
                    item={item}
                    saved={savedItemIds.includes(item.id)}
                    onToggleSave={toggleSavedItem}
                    onShop={openTaggedAmazon}
                  />
                ))}
              </div>
            </section>

            <section className="grid gap-3 md:grid-cols-2">
              <article className="rounded-[1.5rem] border border-fuchsia-300/20 bg-fuchsia-300/[0.06] p-4">
                <div className="text-[9px] font-black uppercase tracking-[0.18em] text-fuchsia-200">SyncWorks partner pick</div>
                <h3 className="mt-1 text-xl font-black text-white">SEEQ Protein</h3>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
                  Open the existing SEEQ partner link directly from Health when you want to shop their protein options.
                </p>
                <a href={SEEQ_AFFILIATE_URL} target="_blank" rel="sponsored noreferrer" className="mt-4 flex h-11 items-center justify-center rounded-xl border border-fuchsia-300/30 bg-fuchsia-300/10 text-xs font-black text-fuchsia-100">
                  Shop SEEQ
                </a>
              </article>

              <article className="rounded-[1.5rem] border border-cyan-300/20 bg-cyan-300/[0.06] p-4">
                <div className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200">Steps partner</div>
                <h3 className="mt-1 text-xl font-black text-white">WeWard</h3>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
                  Keep the existing walking-rewards connection close to the Health experience instead of hiding it elsewhere in the app.
                </p>
                <a href={WEWARD_REFERRAL_URL} target="_blank" rel="sponsored noreferrer" className="mt-4 flex h-11 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-300/10 text-xs font-black text-cyan-100">
                  Open WeWard
                </a>
              </article>
            </section>

            <section className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4 text-[11px] font-semibold leading-5 text-slate-500">
              SYNC Store recommendations are convenience and general fitness suggestions, not medical advice. Review product labels, allergens, serving instructions, caffeine/stimulant content, and your own health considerations before purchasing or using supplements. Prices and availability are controlled by the retailer and can change.
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}
