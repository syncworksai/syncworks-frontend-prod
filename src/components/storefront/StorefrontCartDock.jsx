import React, { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, ExternalLink, Loader2, Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { getStorefrontMerchants, trackStorefrontClick } from "../../api/platformAffiliates";

const STORAGE_KEY = "syncworks_storefront_cart_v1";

const STARTER_ITEMS = [
  { id: "trowel", name: "Hand trowel", qty: 1, context: "Personal project", merchant: "Amazon", status: "READY" },
  { id: "gloves", name: "Garden gloves", qty: 1, context: "Personal project", merchant: "Amazon", status: "READY" },
];

function readCart() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function merchantSlug(name) {
  return String(name || "").toLowerCase().includes("amazon") ? "amazon" : String(name || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function amazonSearchUrl(item) {
  return `https://www.amazon.com/s?k=${encodeURIComponent(item.name)}`;
}

export default function StorefrontCartDock() {
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState(readCart);
  const [handoff, setHandoff] = useState(null);
  const [merchants, setMerchants] = useState([]);
  const [merchantError, setMerchantError] = useState("");
  const [handoffBusy, setHandoffBusy] = useState("");
  const [handoffError, setHandoffError] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    let active = true;
    getStorefrontMerchants()
      .then((data) => {
        if (!active) return;
        setMerchants(Array.isArray(data?.merchants) ? data.merchants : []);
        setMerchantError("");
      })
      .catch(() => {
        if (!active) return;
        setMerchantError("Merchant connection is temporarily unavailable.");
      });
    return () => { active = false; };
  }, []);

  const itemCount = useMemo(() => cart.reduce((sum, item) => sum + Number(item.qty || 0), 0), [cart]);
  const groups = useMemo(() => cart.reduce((acc, item) => {
    const merchant = item.merchant || "Best available partner";
    if (!acc[merchant]) acc[merchant] = [];
    acc[merchant].push(item);
    return acc;
  }, {}), [cart]);

  function merchantFor(name) {
    const slug = merchantSlug(name);
    return merchants.find((merchant) => merchant.slug === slug || String(merchant.name || "").toLowerCase() === String(name || "").toLowerCase());
  }

  function seedProject() {
    setCart((current) => {
      const ids = new Set(current.map((item) => item.id));
      return [...current, ...STARTER_ITEMS.filter((item) => !ids.has(item.id))];
    });
    setOpen(true);
  }

  function changeQty(id, delta) {
    setCart((current) => current.map((item) => item.id === id ? { ...item, qty: Math.max(1, Number(item.qty || 1) + delta) } : item));
  }

  function remove(id) {
    setCart((current) => current.filter((item) => item.id !== id));
  }

  async function shopItem(merchantName, item) {
    const merchant = merchantFor(merchantName);
    if (!merchant?.configured) {
      setHandoffError(`${merchantName} affiliate handoff is not configured yet.`);
      return;
    }

    const key = `${merchantName}:${item.id}`;
    setHandoffBusy(key);
    setHandoffError("");
    try {
      const destinationUrl = merchant.kind === "AMAZON" ? amazonSearchUrl(item) : item.destination_url;
      if (!destinationUrl) throw new Error("No approved destination is available for this item yet.");
      const result = await trackStorefrontClick({
        merchant: merchant.slug,
        module: "PERSONAL_PROJECTS",
        destination_url: destinationUrl,
        project_reference: "redo-flower-beds",
        product_reference: item.id || item.name,
      });
      if (!result?.outbound_url) throw new Error("Merchant handoff did not return a destination.");
      window.open(result.outbound_url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setHandoffError(error?.response?.data?.detail || error?.message || "Merchant handoff failed. Please try again.");
    } finally {
      setHandoffBusy("");
    }
  }

  const activeHandoffItems = handoff ? groups[handoff] || [] : [];
  const activeMerchant = handoff ? merchantFor(handoff) : null;

  return (
    <>
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+82px)] right-3 z-[65] flex items-center gap-2 lg:bottom-5 lg:right-5">
        {!itemCount ? <button type="button" onClick={seedProject} className="rounded-full border border-emerald-300/25 bg-[#06131f]/95 px-3 py-2 text-[9px] font-black text-emerald-100 shadow-2xl backdrop-blur-xl">+ Add project supplies</button> : null}
        <button type="button" onClick={() => setOpen(true)} className="relative grid h-12 w-12 place-items-center rounded-full border border-cyan-300/30 bg-[#06131f]/95 text-cyan-100 shadow-2xl backdrop-blur-xl" aria-label="Open Sync Cart">
          <ShoppingCart className="h-5 w-5" />
          {itemCount ? <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-cyan-300 px-1 text-[9px] font-black text-slate-950">{itemCount}</span> : null}
        </button>
      </div>

      {open ? <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} /> : null}
      <aside className={`fixed inset-y-0 right-0 z-[95] w-full max-w-md border-l border-white/10 bg-[#020817] shadow-2xl transition-transform duration-200 ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex h-full flex-col pt-[env(safe-area-inset-top)]">
          <header className="flex items-center gap-3 border-b border-white/10 p-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-500/10 text-cyan-200"><ShoppingCart className="h-4 w-4" /></div>
            <div className="min-w-0 flex-1"><div className="text-[9px] font-black uppercase tracking-[.17em] text-cyan-300">Universal purchasing layer</div><h2 className="text-base font-black text-white">SYNC Cart</h2></div>
            <button type="button" onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-400"><X className="h-4 w-4" /></button>
          </header>

          <div className="flex-1 overflow-y-auto p-4">
            {merchantError ? <div className="mb-3 rounded-xl border border-amber-300/20 bg-amber-500/10 p-3 text-[9px] font-bold text-amber-100">{merchantError}</div> : null}
            {!cart.length ? <div className="rounded-2xl border border-dashed border-white/10 p-5 text-center"><div className="text-sm font-black text-white">Your Sync Cart is empty</div><p className="mt-1 text-[10px] leading-5 text-slate-500">Projects, Health, Business, Property and direct Storefront shopping will all be able to add items here.</p><button type="button" onClick={seedProject} className="mt-3 rounded-xl border border-emerald-300/20 bg-emerald-500/10 px-4 py-2 text-[9px] font-black text-emerald-100">Add flower-bed supplies</button></div> : null}

            {Object.entries(groups).map(([merchant, items]) => {
              const liveMerchant = merchantFor(merchant);
              const ready = Boolean(liveMerchant?.configured);
              return <section key={merchant} className="mb-4 rounded-2xl border border-white/10 bg-white/[.025] p-3">
                <div className="flex items-center justify-between"><div><div className="text-[8px] font-black uppercase tracking-[.15em] text-slate-500">Merchant handoff</div><div className="mt-0.5 text-[12px] font-black text-white">{merchant}</div></div><span className={`rounded-full border px-2 py-1 text-[8px] font-black ${ready ? "border-emerald-300/20 bg-emerald-500/10 text-emerald-100" : "border-amber-300/20 bg-amber-500/10 text-amber-100"}`}>{ready ? "Connected" : "Setup pending"}</span></div>
                <div className="mt-3 space-y-2">{items.map((item) => <div key={item.id} className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="flex items-start gap-3"><div className="min-w-0 flex-1"><div className="text-[11px] font-black text-white">{item.name}</div><div className="mt-1 text-[8px] text-slate-500">{item.context}</div></div><button type="button" onClick={() => remove(item.id)} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-slate-500"><Trash2 className="h-3.5 w-3.5" /></button></div><div className="mt-2 flex items-center justify-between"><div className="flex items-center rounded-lg border border-white/10"><button type="button" onClick={() => changeQty(item.id, -1)} className="grid h-8 w-8 place-items-center text-slate-400"><Minus className="h-3 w-3" /></button><span className="min-w-7 text-center text-[10px] font-black text-white">{item.qty}</span><button type="button" onClick={() => changeQty(item.id, 1)} className="grid h-8 w-8 place-items-center text-slate-400"><Plus className="h-3 w-3" /></button></div><span className="text-[8px] font-black text-emerald-200"><Check className="mr-1 inline h-3 w-3" />Ready</span></div></div>)}</div>
                <button type="button" onClick={() => { setHandoffError(""); setHandoff(merchant); }} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-500/10 text-[10px] font-black text-cyan-100">Shop {items.length} with {merchant}<ChevronRight className="h-4 w-4" /></button>
              </section>;
            })}

            <div className="rounded-xl border border-violet-300/15 bg-violet-500/[.05] p-3 text-[9px] leading-4 text-slate-400">SYNC Cart stays inside SyncWorks. Final checkout remains with the merchant; tracked handoff preserves attribution without SyncWorks placing an order for you.</div>
          </div>
        </div>
      </aside>

      {handoff ? <div className="fixed inset-0 z-[110] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"><div className="w-full max-w-sm rounded-2xl border border-cyan-300/20 bg-[#07101e] p-4 shadow-2xl"><div className="flex items-start justify-between gap-3"><div><div className="text-[9px] font-black uppercase tracking-[.16em] text-cyan-300">Tracked merchant handoff</div><h3 className="mt-1 text-lg font-black text-white">Shop with {handoff}</h3></div><button type="button" onClick={() => setHandoff(null)} className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-slate-400"><X className="h-4 w-4" /></button></div><p className="mt-2 text-[10px] leading-5 text-slate-400">Choose an item below. SyncWorks records the qualifying handoff, then the merchant owns product selection and checkout.</p><div className="mt-3 space-y-2">{activeHandoffItems.map((item) => { const key = `${handoff}:${item.id}`; return <button key={item.id} type="button" disabled={!activeMerchant?.configured || handoffBusy === key} onClick={() => shopItem(handoff, item)} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[.035] px-3 text-left disabled:opacity-45"><span><span className="block text-[10px] font-black text-white">{item.name}</span><span className="block text-[8px] text-slate-500">Qty {item.qty}</span></span>{handoffBusy === key ? <Loader2 className="h-4 w-4 animate-spin text-cyan-300" /> : <ExternalLink className="h-4 w-4 text-cyan-300" />}</button>; })}</div>{handoffError ? <div className="mt-3 rounded-xl border border-rose-300/20 bg-rose-500/10 p-3 text-[9px] font-bold text-rose-100">{handoffError}</div> : null}<div className="mt-3 rounded-xl border border-amber-300/15 bg-amber-500/[.06] p-3 text-[8px] leading-4 text-slate-400">{activeMerchant?.disclosure || "Partner link — SyncWorks may earn a commission."}</div></div></div> : null}
    </>
  );
}
