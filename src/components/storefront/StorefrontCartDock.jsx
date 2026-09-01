import React, { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react";

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

export default function StorefrontCartDock() {
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState(readCart);
  const [handoff, setHandoff] = useState(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  const itemCount = useMemo(() => cart.reduce((sum, item) => sum + Number(item.qty || 0), 0), [cart]);
  const groups = useMemo(() => cart.reduce((acc, item) => {
    const merchant = item.merchant || "Best available partner";
    if (!acc[merchant]) acc[merchant] = [];
    acc[merchant].push(item);
    return acc;
  }, {}), [cart]);

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

  return (
    <>
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+82px)] right-3 z-[65] flex items-center gap-2 lg:bottom-5 lg:right-5">
        {!itemCount ? (
          <button type="button" onClick={seedProject} className="rounded-full border border-emerald-300/25 bg-[#06131f]/95 px-3 py-2 text-[9px] font-black text-emerald-100 shadow-2xl backdrop-blur-xl">+ Add project supplies</button>
        ) : null}
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
            {!cart.length ? <div className="rounded-2xl border border-dashed border-white/10 p-5 text-center"><div className="text-sm font-black text-white">Your Sync Cart is empty</div><p className="mt-1 text-[10px] leading-5 text-slate-500">Projects, Health, Business, Property and direct Storefront shopping will all be able to add items here.</p><button type="button" onClick={seedProject} className="mt-3 rounded-xl border border-emerald-300/20 bg-emerald-500/10 px-4 py-2 text-[9px] font-black text-emerald-100">Add flower-bed supplies</button></div> : null}

            {Object.entries(groups).map(([merchant, items]) => <section key={merchant} className="mb-4 rounded-2xl border border-white/10 bg-white/[.025] p-3"><div className="flex items-center justify-between"><div><div className="text-[8px] font-black uppercase tracking-[.15em] text-slate-500">Merchant handoff</div><div className="mt-0.5 text-[12px] font-black text-white">{merchant}</div></div><span className="rounded-full border border-amber-300/20 bg-amber-500/10 px-2 py-1 text-[8px] font-black text-amber-100">{items.length} items</span></div>
              <div className="mt-3 space-y-2">{items.map((item) => <div key={item.id} className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="flex items-start gap-3"><div className="min-w-0 flex-1"><div className="text-[11px] font-black text-white">{item.name}</div><div className="mt-1 text-[8px] text-slate-500">{item.context}</div></div><button type="button" onClick={() => remove(item.id)} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-slate-500"><Trash2 className="h-3.5 w-3.5" /></button></div><div className="mt-2 flex items-center justify-between"><div className="flex items-center rounded-lg border border-white/10"><button type="button" onClick={() => changeQty(item.id, -1)} className="grid h-8 w-8 place-items-center text-slate-400"><Minus className="h-3 w-3" /></button><span className="min-w-7 text-center text-[10px] font-black text-white">{item.qty}</span><button type="button" onClick={() => changeQty(item.id, 1)} className="grid h-8 w-8 place-items-center text-slate-400"><Plus className="h-3 w-3" /></button></div><span className="text-[8px] font-black text-emerald-200"><Check className="mr-1 inline h-3 w-3" />Ready</span></div></div>)}</div>
              <button type="button" onClick={() => setHandoff(merchant)} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-500/10 text-[10px] font-black text-cyan-100">Send {items.length} to {merchant}<ChevronRight className="h-4 w-4" /></button>
            </section>)}

            <div className="rounded-xl border border-violet-300/15 bg-violet-500/[.05] p-3 text-[9px] leading-4 text-slate-400">SYNC Cart is merchant-neutral. Amazon can be one fulfillment rail; other approved merchants can be added without changing the project, Health, Business or Property experience.</div>
          </div>
        </div>
      </aside>

      {handoff ? <div className="fixed inset-0 z-[110] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"><div className="w-full max-w-sm rounded-2xl border border-cyan-300/20 bg-[#07101e] p-4 shadow-2xl"><div className="text-[9px] font-black uppercase tracking-[.16em] text-cyan-300">Merchant handoff</div><h3 className="mt-1 text-lg font-black text-white">Send cart to {handoff}</h3><p className="mt-2 text-[10px] leading-5 text-slate-400">The SyncWorks cart is ready for merchant handoff. We only enable the final external-cart action when that merchant's approved affiliate configuration supports it, so attribution is preserved and SyncWorks never places an order for the user.</p><button type="button" onClick={() => setHandoff(null)} className="mt-4 min-h-11 w-full rounded-xl border border-white/10 bg-white/[.04] text-[10px] font-black text-white">Got it</button></div></div> : null}
    </>
  );
}
