import React, { useEffect, useMemo, useState } from "react";
import {
  computeTotals,
  defaultLineItem,
  initDraft,
  saveDraft,
  getDraft,
  upsertQueueItem,
  getTemplates,
} from "./useLocalTemplates";

function cx(...p) {
  return p.filter(Boolean).join(" ");
}

function money(n) {
  const v = Number(n || 0);
  return `$${v.toFixed(2)}`;
}

function Field({ label, children, hint = "" }) {
  return (
    <div>
      <div className="text-[11px] text-slate-500 mb-1">{label}</div>
      {children}
      {hint ? <div className="mt-1 text-[11px] text-slate-600">{hint}</div> : null}
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
    fuchsia: "bg-fuchsia-500/15 border-fuchsia-500/30 hover:bg-fuchsia-500/20 text-fuchsia-200",
  };

  return (
    <button
      className={cx(
        "h-10 px-4 rounded-2xl border text-xs font-semibold transition whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed",
        tones[tone] || tones.slate,
        className
      )}
      {...props}
    />
  );
}

function StatCard({ label, value, sub = "", tone = "slate" }) {
  const tones = {
    slate: "border-slate-800 bg-slate-950/30 text-slate-100",
    cyan: "border-cyan-500/20 bg-cyan-500/10 text-cyan-100",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-100",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-100",
    fuchsia: "border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-100",
  };

  return (
    <div className={cx("rounded-3xl border p-4", tones[tone] || tones.slate)}>
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-extrabold tracking-tight">{value}</div>
      {sub ? <div className="mt-1 text-[11px] text-slate-400">{sub}</div> : null}
    </div>
  );
}

function StatusPill({ status }) {
  const ready = status === "READY_TO_SEND";
  return (
    <span
      className={cx(
        "text-[11px] px-2 py-1 rounded-full border font-semibold",
        ready
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
          : "border-slate-700 bg-slate-900/40 text-slate-200"
      )}
    >
      {status || "DRAFT"}
    </span>
  );
}

function cleanTemplateItems(items) {
  if (!Array.isArray(items) || !items.length) return [defaultLineItem()];

  return items.map((it) => ({
    id: defaultLineItem().id,
    part_no: it?.part_no || "",
    description: it?.description || "",
    qty: Number(it?.qty || 1),
    unit_price: Number(it?.unit_price || 0),
    markup_pct: Number(it?.markup_pct || 0),
  }));
}

export default function QuotePanel({ ticketId, ticket }) {
  const [draft, setDraft] = useState(null);
  const [savedFlash, setSavedFlash] = useState("");
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  useEffect(() => {
    const d = initDraft({ ticketId, kind: "quote", ticket });
    setDraft(d);

    const store = getTemplates();
    const quoteTemplates = Array.isArray(store?.quote) ? store.quote : [];
    setTemplates(quoteTemplates);
    setSelectedTemplateId(quoteTemplates[0]?.id || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  useEffect(() => {
    if (!savedFlash) return;
    const t = window.setTimeout(() => setSavedFlash(""), 1400);
    return () => window.clearTimeout(t);
  }, [savedFlash]);

  const totals = useMemo(() => computeTotals(draft || {}), [draft]);

  const metrics = useMemo(() => {
    const items = Array.isArray(draft?.items) ? draft.items : [];
    const lineCount = items.length;
    const subtotal = Number(totals?.subtotal || 0);
    const tax = Number(totals?.tax || 0);
    const fee = Number(totals?.fee || 0);
    const total = Number(totals?.total || 0);
    const avgLine = lineCount > 0 ? total / lineCount : 0;

    return {
      lineCount,
      subtotal,
      tax,
      fee,
      total,
      avgLine,
    };
  }, [draft, totals]);

  const selectedTemplate = useMemo(() => {
    return templates.find((t) => String(t.id) === String(selectedTemplateId)) || null;
  }, [templates, selectedTemplateId]);

  function persist(next) {
    setDraft(next);
    saveDraft(ticketId, "quote", next);
    setSavedFlash("Saved");
  }

  function update(patch) {
    const next = { ...(draft || {}), ...patch };
    persist(next);
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

  function duplicateItem(id) {
    const items = Array.isArray(draft?.items) ? draft.items : [];
    const found = items.find((x) => x.id === id);
    if (!found) return;

    const copy = {
      ...found,
      id: defaultLineItem().id,
    };

    update({ items: [...items, copy] });
  }

  function removeItem(id) {
    const items = Array.isArray(draft?.items) ? draft.items : [];
    const next = items.filter((x) => x.id !== id);
    update({ items: next.length ? next : [defaultLineItem()] });
  }

  function reloadSaved() {
    const saved = getDraft(ticketId, "quote");
    if (saved) {
      setDraft(saved);
      setSavedFlash("Reloaded");
    }
  }

  function applyTemplate() {
    if (!selectedTemplate || !draft) return;

    const next = {
      ...draft,
      items: cleanTemplateItems(selectedTemplate.items),
      tax_pct: Number(selectedTemplate.tax_pct || 0),
      app_fee: selectedTemplate.app_fee || { mode: "none", value: 0 },
      notes_customer:
        selectedTemplate.notes_customer != null
          ? selectedTemplate.notes_customer
          : draft.notes_customer,
      notes_internal:
        selectedTemplate.notes_internal != null
          ? selectedTemplate.notes_internal
          : draft.notes_internal,
    };

    persist(next);
    setSavedFlash(`Applied template: ${selectedTemplate.name || "Template"}`);
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

    setSavedFlash("Quote ready");
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

    setSavedFlash("Moved back to draft");
  }

  if (!draft) return null;

  return (
    <div className="space-y-4">
      {savedFlash ? (
        <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-200">
          {savedFlash}
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="text-lg font-extrabold text-slate-100">Quote Workspace</div>
            <div className="text-xs text-slate-400 mt-1">
              Build the quote fast, pull a template when needed, then mark it ready for your SBO queue.
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <StatusPill status={draft.status} />
            <Btn tone="slate" onClick={reloadSaved} type="button">
              Reload Saved
            </Btn>
          </div>
        </div>

        <div className="mt-4 grid md:grid-cols-2 xl:grid-cols-4 gap-3">
          <StatCard label="Lines" value={metrics.lineCount} tone="slate" />
          <StatCard label="Subtotal" value={money(metrics.subtotal)} tone="cyan" />
          <StatCard label="Fees + Tax" value={money(metrics.tax + metrics.fee)} tone="amber" />
          <StatCard
            label="Quote Total"
            value={money(metrics.total)}
            tone="emerald"
            sub={metrics.lineCount ? `Avg line ${money(metrics.avgLine)}` : "No lines yet"}
          />
        </div>
      </div>

      <div className="grid xl:grid-cols-12 gap-4">
        <div className="xl:col-span-8 space-y-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="text-base font-extrabold text-slate-100">Template Quote Pull</div>
                <div className="text-xs text-slate-400 mt-1">
                  Pull a saved quote template into this ticket and keep moving.
                </div>
              </div>

              <div className="text-[11px] text-slate-500">
                {templates.length ? `${templates.length} templates` : "No saved templates yet"}
              </div>
            </div>

            <div className="mt-4 grid md:grid-cols-[1fr_auto] gap-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm"
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  disabled={!templates.length}
                >
                  {templates.length ? (
                    templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name || "Unnamed Template"}
                      </option>
                    ))
                  ) : (
                    <option value="">No templates found</option>
                  )}
                </select>

                {selectedTemplate ? (
                  <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
                    <div className="text-sm font-semibold text-slate-100">
                      {selectedTemplate.name || "Unnamed Template"}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {Array.isArray(selectedTemplate.items) ? selectedTemplate.items.length : 0} line items
                      {" • "}
                      Tax {Number(selectedTemplate.tax_pct || 0)}%
                    </div>
                  </div>
                ) : null}
              </div>

              <Btn
                tone="fuchsia"
                onClick={applyTemplate}
                disabled={!selectedTemplate}
                className="h-[56px] px-6"
                type="button"
              >
                Apply Template
              </Btn>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
            <div className="text-base font-extrabold text-slate-100">Customer & Job Info</div>
            <div className="text-xs text-slate-400 mt-1">
              Keep the quote tied to who it is for and where the work happens.
            </div>

            <div className="mt-4 grid md:grid-cols-3 gap-3">
              <Field label="Customer Name">
                <input
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-3 py-3 text-sm"
                  value={draft.customer_name || ""}
                  onChange={(e) => update({ customer_name: e.target.value })}
                  placeholder="Customer name"
                />
              </Field>

              <Field label="Phone">
                <input
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-3 py-3 text-sm"
                  value={draft.customer_phone || ""}
                  onChange={(e) => update({ customer_phone: e.target.value })}
                  placeholder="(555) 555-5555"
                />
              </Field>

              <Field label="Text OK?">
                <label className="h-[48px] rounded-2xl border border-slate-800 bg-slate-950 px-3 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!draft.customer_text_ok}
                    onChange={(e) => update({ customer_text_ok: e.target.checked })}
                  />
                  <span className="text-slate-200">Customer accepts texts</span>
                </label>
              </Field>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
              <div className="text-[11px] text-slate-500">Service Location</div>
              <div className="text-sm text-slate-200 mt-1">
                {draft.service_address || ticket?.service_address || "—"}{" "}
                <span className="text-slate-600">•</span>{" "}
                {draft.service_zip || ticket?.service_zip || "—"}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div className="text-base font-extrabold text-slate-100">Line Items</div>
                <div className="text-xs text-slate-400 mt-1">
                  Build labor, materials, and markup cleanly.
                </div>
              </div>

              <Btn tone="cyan" onClick={addItem} type="button">
                + Add Line
              </Btn>
            </div>

            <div className="mt-4 space-y-3">
              {(draft.items || []).map((it, idx) => {
                const lineTotals = computeTotals({ items: [it] });

                return (
                  <div key={it.id} className="rounded-3xl border border-slate-800 bg-slate-950/30 p-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-sm font-semibold text-slate-100">
                        Line {idx + 1}
                      </div>
                      <div className="text-xs text-slate-500">
                        Total <span className="font-semibold text-slate-200">{money(lineTotals.total)}</span>
                      </div>
                    </div>

                    <div className="mt-3 grid md:grid-cols-12 gap-3">
                      <div className="md:col-span-2">
                        <Field label="Part #">
                          <input
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-3 py-3 text-sm"
                            value={it.part_no || ""}
                            onChange={(e) => updateItem(it.id, { part_no: e.target.value })}
                            placeholder="1234"
                          />
                        </Field>
                      </div>

                      <div className="md:col-span-5">
                        <Field label="Description">
                          <input
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-3 py-3 text-sm"
                            value={it.description || ""}
                            onChange={(e) => updateItem(it.id, { description: e.target.value })}
                            placeholder="Labor / material / service description"
                          />
                        </Field>
                      </div>

                      <div className="md:col-span-1">
                        <Field label="Qty">
                          <input
                            type="number"
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-3 py-3 text-sm"
                            value={Number(it.qty || 0)}
                            onChange={(e) => updateItem(it.id, { qty: Number(e.target.value || 0) })}
                            min="0"
                          />
                        </Field>
                      </div>

                      <div className="md:col-span-2">
                        <Field label="Unit $">
                          <input
                            type="number"
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-3 py-3 text-sm"
                            value={Number(it.unit_price || 0)}
                            onChange={(e) => updateItem(it.id, { unit_price: Number(e.target.value || 0) })}
                            min="0"
                            step="0.01"
                          />
                        </Field>
                      </div>

                      <div className="md:col-span-2">
                        <Field label="Markup %">
                          <input
                            type="number"
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-3 py-3 text-sm"
                            value={Number(it.markup_pct || 0)}
                            onChange={(e) => updateItem(it.id, { markup_pct: Number(e.target.value || 0) })}
                            min="0"
                            step="1"
                          />
                        </Field>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-xs text-slate-500">
                        Qty {Number(it.qty || 0)} × ${Number(it.unit_price || 0).toFixed(2)} with {Number(it.markup_pct || 0)}% markup
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Btn tone="slate" onClick={() => duplicateItem(it.id)} type="button">
                          Duplicate
                        </Btn>
                        <Btn tone="rose" onClick={() => removeItem(it.id)} type="button">
                          Remove
                        </Btn>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="xl:col-span-4 space-y-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
            <div className="text-base font-extrabold text-slate-100">Totals</div>
            <div className="text-xs text-slate-400 mt-1">
              Adjust tax and optional fee before pushing to queue.
            </div>

            <div className="mt-4 grid gap-3">
              <Field label="Tax %" hint="Applied to subtotal">
                <input
                  type="number"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-3 py-3 text-sm"
                  value={Number(draft.tax_pct || 0)}
                  onChange={(e) => update({ tax_pct: Number(e.target.value || 0) })}
                  min="0"
                  step="0.25"
                />
              </Field>

              <Field label="App Fee">
                <div className="flex gap-2">
                  <select
                    className="bg-slate-950 border border-slate-800 rounded-2xl px-3 py-3 text-sm"
                    value={draft.app_fee?.mode || "none"}
                    onChange={(e) =>
                      update({
                        app_fee: { ...(draft.app_fee || {}), mode: e.target.value },
                      })
                    }
                  >
                    <option value="none">None</option>
                    <option value="pct">%</option>
                    <option value="fixed">$</option>
                  </select>

                  <input
                    type="number"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-3 py-3 text-sm"
                    value={Number(draft.app_fee?.value || 0)}
                    onChange={(e) =>
                      update({
                        app_fee: { ...(draft.app_fee || {}), value: Number(e.target.value || 0) },
                      })
                    }
                    min="0"
                    step="0.01"
                  />
                </div>
              </Field>

              <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/10 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">Subtotal</span>
                  <span className="font-bold text-slate-100">{money(totals.subtotal)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-slate-300">Tax</span>
                  <span className="font-bold text-slate-100">{money(totals.tax)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-slate-300">Fee</span>
                  <span className="font-bold text-slate-100">{money(totals.fee)}</span>
                </div>
                <div className="mt-3 pt-3 border-t border-cyan-500/20 flex items-center justify-between">
                  <span className="text-cyan-100 font-semibold">Quote Total</span>
                  <span className="text-xl font-extrabold text-cyan-100">{money(totals.total)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
            <div className="text-base font-extrabold text-slate-100">Notes</div>

            <div className="mt-4 grid gap-3">
              <Field label="Internal Notes (SBO only)">
                <textarea
                  className="w-full min-h-[110px] bg-slate-950 border border-slate-800 rounded-2xl px-3 py-3 text-sm"
                  value={draft.notes_internal || ""}
                  onChange={(e) => update({ notes_internal: e.target.value })}
                  placeholder="Receipts, vendor notes, internal planning."
                />
              </Field>

              <Field label="Customer Notes">
                <textarea
                  className="w-full min-h-[110px] bg-slate-950 border border-slate-800 rounded-2xl px-3 py-3 text-sm"
                  value={draft.notes_customer || ""}
                  onChange={(e) => update({ notes_customer: e.target.value })}
                  placeholder="Optional summary to paste into chat later."
                />
              </Field>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
            <div className="text-base font-extrabold text-slate-100">Actions</div>
            <div className="text-xs text-slate-400 mt-1">
              Ready pushes this into the SBO queue automatically.
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {draft.status === "READY_TO_SEND" ? (
                <Btn tone="amber" onClick={resetToDraft} type="button" className="w-full">
                  Move Back to Draft
                </Btn>
              ) : (
                <Btn tone="emerald" onClick={markReady} type="button" className="w-full">
                  Mark Ready to Send
                </Btn>
              )}

              <Btn tone="slate" onClick={reloadSaved} type="button" className="w-full">
                Reload Saved Draft
              </Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}