import React, { useMemo, useState } from "react";
import { ChevronRight, PackageCheck, Plus, Save, Trash2 } from "lucide-react";

const STORAGE_KEY = "syncworks_storefront_saved_supplies_v1";

const SUGGESTED_PATTERNS = [
  { id: "suggest-hvac-filter", title: "HVAC filter", detail: "Save the exact size, brand and quantity once confirmed.", context: "Personal" },
  { id: "suggest-printer-toner", title: "Printer toner", detail: "Remember the exact printer model or cartridge number.", context: "Property" },
  { id: "suggest-tech-consumables", title: "Technician consumables", detail: "Keep preferred bits, blades and field supplies ready to reorder.", context: "Business" },
  { id: "suggest-protein", title: "Protein / hydration", detail: "Save a preferred product, flavor and serving size for Health.", context: "Health" },
];

function readSaved() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(items) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Saved supplies remain usable for this session when storage is unavailable.
  }
}

function buildSavedItem(item) {
  const title = String(item?.title || item?.name || "Saved supply").trim();
  return {
    id: item?.id && !String(item.id).startsWith("suggest-") ? String(item.id) : `saved-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    detail: String(item?.detail || "Saved for quick reorder.").trim(),
    context: String(item?.context || "Personal").trim(),
    quantity: String(item?.quantity || "1").trim(),
    merchant: String(item?.merchant || "Preferred merchant").trim(),
    updated_at: new Date().toISOString(),
  };
}

export default function SavedSuppliesPanel({ onOpenSupply, candidate }) {
  const [saved, setSaved] = useState(readSaved);
  const savedTitles = useMemo(() => new Set(saved.map((item) => item.title.toLowerCase())), [saved]);

  function commit(next) {
    setSaved(next);
    persist(next);
  }

  function saveItem(item) {
    if (!item?.title && !item?.name) return;
    const nextItem = buildSavedItem(item);
    const titleKey = nextItem.title.toLowerCase();
    const existingIndex = saved.findIndex((savedItem) => savedItem.title.toLowerCase() === titleKey);
    if (existingIndex >= 0) {
      const next = saved.slice();
      next[existingIndex] = { ...next[existingIndex], ...nextItem, id: next[existingIndex].id };
      commit(next);
      return;
    }
    commit([nextItem, ...saved]);
  }

  function removeItem(id) {
    commit(saved.filter((item) => item.id !== id));
  }

  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-white/[.025] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><PackageCheck className="h-4 w-4 text-cyan-300" /><h2 className="text-[12px] font-black text-white">Saved supplies & reorder</h2></div>
          <p className="mt-1 text-[9px] leading-4 text-slate-500">Save exact specifications so repeat purchases become a quick decision instead of another search.</p>
        </div>
        <span className="rounded-full border border-cyan-300/15 bg-cyan-500/[.06] px-2 py-1 text-[8px] font-black text-cyan-100">{saved.length} saved</span>
      </div>

      {candidate?.name ? (
        <button type="button" onClick={() => saveItem(candidate)} className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-500/10 px-3 text-[9px] font-black text-emerald-100">
          <Save className="h-3.5 w-3.5" />Save {candidate.name} for reorder
        </button>
      ) : null}

      <div className="mt-3 space-y-2">
        {saved.length ? saved.map((item) => (
          <div key={item.id} className="flex items-center gap-2 rounded-xl border border-emerald-300/15 bg-emerald-500/[.04] p-3">
            <button type="button" onClick={() => onOpenSupply?.({ name: item.title, detail: `${item.detail} Qty: ${item.quantity}.`, merchant: item.merchant, context: item.context, status: "SAVED REORDER" })} className="min-w-0 flex flex-1 items-center gap-3 text-left">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-emerald-300/20 bg-emerald-500/10 text-emerald-200"><PackageCheck className="h-3.5 w-3.5" /></span>
              <span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-black text-white">{item.title}</span><span className="block truncate text-[8px] text-slate-500">{item.context} · Qty {item.quantity} · {item.merchant}</span></span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-600" />
            </button>
            <button type="button" onClick={() => removeItem(item.id)} aria-label={`Remove ${item.title} from saved supplies`} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-rose-300/15 text-rose-200"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        )) : <div className="rounded-xl border border-dashed border-white/10 p-3 text-[9px] leading-4 text-slate-500">Nothing saved yet. Pick a product or use one of the patterns below, then save the exact item once you know the specification.</div>}
      </div>

      <div className="mt-3 border-t border-white/10 pt-3">
        <div className="text-[8px] font-black uppercase tracking-[.14em] text-slate-600">Suggested reorder patterns</div>
        <div className="mt-2 grid gap-2">
          {SUGGESTED_PATTERNS.filter((item) => !savedTitles.has(item.title.toLowerCase())).map((item) => (
            <button key={item.id} type="button" onClick={() => saveItem(item)} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-black/15 p-3 text-left">
              <span className="grid h-8 w-8 place-items-center rounded-lg border border-cyan-300/15 bg-cyan-500/[.06] text-cyan-300"><Plus className="h-3.5 w-3.5" /></span>
              <span className="min-w-0 flex-1"><span className="block text-[10px] font-black text-white">{item.title}</span><span className="block text-[8px] text-slate-500">{item.context} · {item.detail}</span></span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 text-[8px] leading-4 text-slate-600">Saved Supplies v1 persists on this device. Cloud sync can be added when the universal Need/Supply Requirement record is promoted to the backend.</div>
    </section>
  );
}
