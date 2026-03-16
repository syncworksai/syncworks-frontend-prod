// src/components/tickets/InvoicePanel.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/client";
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
      className={cx(
        "h-9 px-3 rounded-xl border text-xs font-semibold transition whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed",
        tones[tone] || tones.slate,
        className
      )}
      {...props}
    />
  );
}

function asMoney(v) {
  const n = Number(v || 0);
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2);
}

function safeLineItems(items) {
  return Array.isArray(items) ? items : [];
}

function buildCustomerFacingNotes(draft, totals) {
  const lines = [];
  const items = safeLineItems(draft?.items);

  if (items.length) {
    lines.push("Invoice Items:");
    items.forEach((it, idx) => {
      const qty = Number(it?.qty || 0);
      const unit = Number(it?.unit_price || 0);
      const markup = Number(it?.markup_pct || 0);
      const desc = String(it?.description || "").trim() || `Line Item ${idx + 1}`;
      const part = String(it?.part_no || "").trim();

      let line = `- ${desc}`;
      if (part) line += ` (Part: ${part})`;
      line += ` | Qty: ${qty} | Unit: $${asMoney(unit)}`;
      if (markup > 0) line += ` | Upcharge: ${markup}%`;
      lines.push(line);
    });
  }

  lines.push("");
  lines.push(`Subtotal: $${asMoney(totals?.subtotal)}`);
  lines.push(`Tax: $${asMoney(totals?.tax)}`);
  lines.push(`Fee: $${asMoney(totals?.fee)}`);
  lines.push(`Total: $${asMoney(totals?.total)}`);

  return lines.join("\n").trim();
}

export default function InvoicePanel({ ticketId, ticket, onAfterChange }) {
  const [draft, setDraft] = useState(null);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    const d = initDraft({ ticketId, kind: "invoice", ticket });
    setDraft(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  const totals = useMemo(() => computeTotals(draft || {}), [draft]);

  function update(patch) {
    const next = { ...(draft || {}), ...patch };
    setDraft(next);
    saveDraft(ticketId, "invoice", next);
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

  function reloadSaved() {
    const saved = getDraft(ticketId, "invoice");
    if (saved) setDraft(saved);
  }

  async function ensureBackendInvoice() {
    const existingId = Number(draft?.backend_invoice_id || 0);
    if (existingId > 0) {
      return existingId;
    }

    const title =
      String(draft?.invoice_number || "").trim() ||
      `Invoice for Ticket #${ticketId}`;

    const notes = buildCustomerFacingNotes(draft, totals);

    const payload = {
      title,
      notes,
      subtotal: asMoney(totals.subtotal),
      tax: asMoney(totals.tax),
      total: asMoney(totals.total),
      payment_method: "CARD",
    };

    const res = await api.post(`/tickets/${ticketId}/create_invoice/`, payload);
    const backendInvoice = res?.data || null;
    const backendInvoiceId = Number(backendInvoice?.id || 0);

    if (!backendInvoiceId) {
      throw new Error("Invoice was not created.");
    }

    const next = {
      ...(draft || {}),
      backend_invoice_id: backendInvoiceId,
      backend_invoice_status: backendInvoice?.status || "DRAFT",
    };
    setDraft(next);
    saveDraft(ticketId, "invoice", next);

    return backendInvoiceId;
  }

  async function markReadyForPayment() {
    setErr("");
    setOk("");
    setSending(true);

    try {
      const invoiceId = await ensureBackendInvoice();

      await api.post(`/tickets/${ticketId}/send_invoice/`, {
        invoice_id: invoiceId,
      });

      const next = {
        ...(draft || {}),
        status: "READY_FOR_PAYMENT",
        backend_invoice_id: invoiceId,
        backend_invoice_status: "SENT",
      };

      setDraft(next);
      saveDraft(ticketId, "invoice", next);

      upsertQueueItem("invoice", {
        ticket_id: Number(ticketId),
        invoice_id: invoiceId,
        invoice_number: next.invoice_number,
        customer_name: next.customer_name || "",
        customer_phone: next.customer_phone || "",
        status: next.status,
        updated_at: new Date().toISOString(),
        total: totals.total,
      });

      setOk("Invoice is now ready for payment and visible to the customer.");
      await onAfterChange?.();
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Failed to mark invoice ready for payment.");
    } finally {
      setSending(false);
    }
  }

  if (!draft) return null;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-slate-100">Invoice Workspace</div>
          <div className="text-xs text-slate-400 mt-1">
            SBO-only. Build fast, then mark it ready so the customer can see and pay it.
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {draft?.backend_invoice_id ? (
            <span className="text-[11px] px-2 py-1 rounded-full border border-slate-700 bg-slate-900/40 text-slate-200 font-semibold">
              Invoice #{draft.backend_invoice_id}
            </span>
          ) : null}

          <span
            className={cx(
              "text-[11px] px-2 py-1 rounded-full border font-semibold",
              draft.status === "READY_FOR_PAYMENT"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                : draft.status === "SENT"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900/40 text-slate-200"
            )}
          >
            {draft.status || "DRAFT"}
          </span>
        </div>
      </div>

      {err ? (
        <div className="mt-3 text-sm text-rose-200 bg-rose-900/10 border border-rose-800 rounded-xl p-3">
          {err}
        </div>
      ) : null}

      {ok ? (
        <div className="mt-3 text-sm text-emerald-200 bg-emerald-900/10 border border-emerald-800 rounded-xl p-3">
          {ok}
        </div>
      ) : null}

      <div className="mt-4 grid md:grid-cols-3 gap-3">
        <Field label="Invoice #">
          <input
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono"
            value={draft.invoice_number || ""}
            onChange={(e) => update({ invoice_number: e.target.value })}
            placeholder="INV-..."
          />
        </Field>

        <Field label="Customer Name">
          <input
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
            value={draft.customer_name || ""}
            onChange={(e) => update({ customer_name: e.target.value })}
            placeholder="Customer name"
          />
        </Field>

        <Field label="Phone + Text OK">
          <div className="flex gap-2">
            <input
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
              value={draft.customer_phone || ""}
              onChange={(e) => update({ customer_phone: e.target.value })}
              placeholder="(555) 555-5555"
            />
            <label className="px-3 rounded-xl border border-slate-800 bg-slate-950 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!draft.customer_text_ok}
                onChange={(e) => update({ customer_text_ok: e.target.checked })}
              />
              <span className="text-slate-200">Text OK</span>
            </label>
          </div>
        </Field>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-slate-100">Line Items</div>
          <Btn tone="cyan" onClick={addItem} type="button">
            + Add
          </Btn>
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
                  Line Total:{" "}
                  <span className="text-slate-200 font-semibold">
                    <Money n={computeTotals({ items: [it] }).total} />
                  </span>
                </div>
                <Btn tone="rose" onClick={() => removeItem(it.id)} type="button">
                  Remove
                </Btn>
              </div>
            </div>
          ))}
        </div>
      </div>

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

        <Field label="App Fee / Upcharge">
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

      <div className="mt-4">
        <Field label="Internal Notes (SBO only)">
          <textarea
            className="w-full min-h-[90px] bg-slate-950 border border-slate-800 rounded-2xl px-3 py-2 text-sm"
            value={draft.notes_internal || ""}
            onChange={(e) => update({ notes_internal: e.target.value })}
            placeholder="Receipts, vendor notes, internal details (kept local / not sent to customer)."
          />
        </Field>
      </div>

      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <Btn tone="slate" onClick={reloadSaved} type="button">
          Reload Saved
        </Btn>

        <Btn tone="emerald" onClick={markReadyForPayment} disabled={sending} type="button">
          {sending ? "Processing…" : "Mark Ready for Payment"}
        </Btn>

        <div className="ml-auto text-xs text-slate-500">
          This sends the invoice into the real customer pay flow.
        </div>
      </div>
    </div>
  );
}
