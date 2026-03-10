// src/components/tickets/QuotePanel.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  computeTotals,
  defaultLineItem,
  initDraft,
  saveDraft,
  getDraft,
  upsertQueueItem,
} from "./useLocalTemplates";

function cx(...p) {
  return p.filter(Boolean).join(" ");
}

function Money({ n }) {
  const v = Number(n || 0);
  return <span>${v.toFixed(2)}</span>;
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-[11px] text-slate-500 mb-1">{label}</div>
      {children}
    </div>
  );
}

function Btn({ tone = "slate", className = "", ...props }) {
  const tones = {
    slate: "bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-200",
    cyan: "bg-cyan-500/20 border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-200",
    emerald: "bg-emerald-500/15 border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-200",
    rose: "bg-rose-500/15 border-rose-500/30 hover:bg-rose-500/20 text-rose-200",
    amber: "bg-amber-500/15 border-amber-500/30 hover:bg-amber-500/20 text-amber-200",
  };
  return (
    <button
      className={cx("h-9 px-3 rounded-xl border text-xs font-semibold transition whitespace-nowrap", tones[tone] || tones.slate, className)}
      {...props}
    />
  );
}

export default function QuotePanel({ ticketId, ticket }) {
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    const d = initDraft({ ticketId, kind: "quote", ticket });
    setDraft(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  const totals = useMemo(() => computeTotals(draft || {}), [draft]);

  function update(patch) {
    const next = { ...(draft || {}), ...patch };
    setDraft(next);
    saveDraft(ticketId, "quote", next);
  }

  function updateItem(id, patch) {
    const items = Array.isArray(draft?.items) ? draft.items : [];
    const next = items.map((x) => (x.id === id ? { ...x, ...patch } : x));
    update({ items: next });
  }

  function addItem() {
    const items = Array.isArray(draft?.items) ? draft.items : [];
    update({ items: [...items, defaultLineItem()] });
  }

  function removeItem(id) {
    const items = Array.isArray(draft?.items) ? draft.items : [];
    const next = items.filter((x) => x.id !== id);
    update({ items: next.length ? next : [defaultLineItem()] });
  }

  function markReady() {
    const next = { ...(draft || {}), status: "READY_TO_SEND" };
    setDraft(next);
    saveDraft(ticketId, "quote", next);

    upsertQueueItem("quote", {
      ticket_id: Number(ticketId),
      customer_name: next.customer_name || "",
      customer_phone: next.customer_phone || "",
      status: next.status,
      updated_at: new Date().toISOString(),
      total: totals.total,
    });
  }

  function resetToDraft() {
    const next = { ...(draft || {}), status: "DRAFT" };
    setDraft(next);
    saveDraft(ticketId, "quote", next);
    upsertQueueItem("quote", {
      ticket_id: Number(ticketId),
      customer_name: next.customer_name || "",
      customer_phone: next.customer_phone || "",
      status: next.status,
      updated_at: new Date().toISOString(),
      total: totals.total,
    });
  }

  if (!draft) return null;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-slate-100">Quote Workspace</div>
          <div className="text-xs text-slate-400 mt-1">
            SBO-only. Build line items fast. When ready, mark “Ready to Send” (goes to SBO queue).
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cx(
              "text-[11px] px-2 py-1 rounded-full border font-semibold",
              draft.status === "READY_TO_SEND"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900/40 text-slate-200"
            )}
          >
            {draft.status}
          </span>
        </div>
      </div>

      <div className="mt-4 grid md:grid-cols-3 gap-3">
        <Field label="Customer Name">
          <input
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
            value={draft.customer_name || ""}
            onChange={(e) => update({ customer_name: e.target.value })}
            placeholder="Customer name"
          />
        </Field>

        <Field label="Phone">
          <input
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
            value={draft.customer_phone || ""}
            onChange={(e) => update({ customer_phone: e.target.value })}
            placeholder="(555) 555-5555"
          />
        </Field>

        <Field label="Text OK? (for SBO external texting)">
          <label className="h-[42px] rounded-xl border border-slate-800 bg-slate-950 px-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!draft.customer_text_ok}
              onChange={(e) => update({ customer_text_ok: e.target.checked })}
            />
            <span className="text-slate-200">Customer accepts texts</span>
          </label>
        </Field>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
        <div className="text-[11px] text-slate-500">Service Location</div>
        <div className="text-sm text-slate-200 mt-1">
          {draft.service_address || ticket?.service_address || "—"}{" "}
          <span className="text-slate-600">•</span>{" "}
          {draft.service_zip || ticket?.service_zip || "—"}
        </div>
      </div>

      {/* Line items */}
      <div className="mt-4">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-slate-100">Line Items</div>
          <Btn tone="cyan" onClick={addItem} type="button">+ Add</Btn>
        </div>

        <div className="mt-3 space-y-2">
          {(draft.items || []).map((it) => (
            <div key={it.id} className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
              <div className="grid md:grid-cols-12 gap-2">
                <div className="md:col-span-3">
                  <div className="text-[11px] text-slate-500 mb-1">Part #</div>
                  <input
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                    value={it.part_no || ""}
                    onChange={(e) => updateItem(it.id, { part_no: e.target.value })}
                    placeholder="1234"
                  />
                </div>

                <div className="md:col-span-5">
                  <div className="text-[11px] text-slate-500 mb-1">Description</div>
                  <input
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                    value={it.description || ""}
                    onChange={(e) => updateItem(it.id, { description: e.target.value })}
                    placeholder="Labor / part description"
                  />
                </div>

                <div className="md:col-span-1">
                  <div className="text-[11px] text-slate-500 mb-1">Qty</div>
                  <input
                    type="number"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                    value={Number(it.qty || 0)}
                    onChange={(e) => updateItem(it.id, { qty: Number(e.target.value || 0) })}
                    min="0"
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="text-[11px] text-slate-500 mb-1">Unit $</div>
                  <input
                    type="number"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                    value={Number(it.unit_price || 0)}
                    onChange={(e) => updateItem(it.id, { unit_price: Number(e.target.value || 0) })}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="md:col-span-1">
                  <div className="text-[11px] text-slate-500 mb-1">Up%</div>
                  <input
                    type="number"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                    value={Number(it.markup_pct || 0)}
                    onChange={(e) => updateItem(it.id, { markup_pct: Number(e.target.value || 0) })}
                    min="0"
                    step="1"
                  />
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  Line Total: <span className="text-slate-200 font-semibold"><Money n={computeTotals({ items: [it] }).total} /></span>
                </div>
                <Btn tone="rose" onClick={() => removeItem(it.id)} type="button">Remove</Btn>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="mt-4 grid md:grid-cols-3 gap-3">
        <Field label="Tax %">
          <input
            type="number"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
            value={Number(draft.tax_pct || 0)}
            onChange={(e) => update({ tax_pct: Number(e.target.value || 0) })}
            min="0"
            step="0.25"
          />
        </Field>

        <Field label="App Fee">
          <div className="flex gap-2">
            <select
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
              value={draft.app_fee?.mode || "none"}
              onChange={(e) => update({ app_fee: { ...(draft.app_fee || {}), mode: e.target.value } })}
            >
              <option value="none">None</option>
              <option value="pct">%</option>
              <option value="fixed">$</option>
            </select>
            <input
              type="number"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
              value={Number(draft.app_fee?.value || 0)}
              onChange={(e) => update({ app_fee: { ...(draft.app_fee || {}), value: Number(e.target.value || 0) } })}
              min="0"
              step="0.01"
            />
          </div>
        </Field>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
          <div className="text-[11px] text-slate-500">Total</div>
          <div className="text-lg font-extrabold text-slate-100 mt-1">
            <Money n={totals.total} />
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Sub <Money n={totals.subtotal} /> • Tax <Money n={totals.tax} /> • Fee <Money n={totals.fee} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid md:grid-cols-2 gap-3">
        <Field label="Internal Notes (SBO only)">
          <textarea
            className="w-full min-h-[90px] bg-slate-950 border border-slate-800 rounded-2xl px-3 py-2 text-sm"
            value={draft.notes_internal || ""}
            onChange={(e) => update({ notes_internal: e.target.value })}
            placeholder="Receipts, vendor notes, etc (NOT visible to customer)."
          />
        </Field>

        <Field label="Customer Notes (optional, share later via chat)">
          <textarea
            className="w-full min-h-[90px] bg-slate-950 border border-slate-800 rounded-2xl px-3 py-2 text-sm"
            value={draft.notes_customer || ""}
            onChange={(e) => update({ notes_customer: e.target.value })}
            placeholder="If you need to send a summary, paste it into chat when ready."
          />
        </Field>
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <Btn tone="slate" onClick={() => setDraft(getDraft(ticketId, "quote"))} type="button">
          Reload Saved
        </Btn>

        {draft.status === "READY_TO_SEND" ? (
          <Btn tone="amber" onClick={resetToDraft} type="button">
            Move back to Draft
          </Btn>
        ) : (
          <Btn tone="emerald" onClick={markReady} type="button">
            Mark Ready to Send
          </Btn>
        )}

        <div className="ml-auto text-xs text-slate-500">
          Queue item is created automatically when you mark ready.
        </div>
      </div>
    </div>
  );
}