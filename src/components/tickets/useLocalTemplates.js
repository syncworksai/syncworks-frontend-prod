// src/components/tickets/useLocalTemplates.js
// Local-only drafts + templates so you can move fast without backend changes.
// Stores:
// - templates (quote/invoice templates)
// - drafts per ticket (quote_draft / invoice_draft)
// - queues (ready_to_send)

const NS = "sw_local_templates_v1";
const DRAFT_NS = "sw_ticket_drafts_v1";
const QUEUE_NS = "sw_work_queue_v1";

function nowIso() {
  return new Date().toISOString();
}

function safeParse(s, fallback) {
  try {
    const v = JSON.parse(s);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function readStore(key, fallback) {
  return safeParse(localStorage.getItem(key), fallback);
}

function writeStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function generateInvoiceNumber({ ticketId, businessId } = {}) {
  // Stable-ish human invoice ID:
  // INV-<biz>-<ticket>-<YYMMDD>-<4digit>
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const day = `${yy}${mm}${dd}`;

  const seed = `${businessId || "B"}-${ticketId || "T"}-${day}`;
  const n = Math.floor(Math.random() * 9000) + 1000;
  return `INV-${seed}-${n}`;
}

export function defaultLineItem() {
  return {
    id: String(Math.random()).slice(2),
    part_no: "",
    description: "",
    qty: 1,
    unit_price: 0,
    markup_pct: 0, // optional
  };
}

export function computeLine(item) {
  const qty = Number(item.qty || 0);
  const unit = Number(item.unit_price || 0);
  const markup = Number(item.markup_pct || 0);
  const base = qty * unit;
  const up = base * (markup / 100);
  return Math.round((base + up) * 100) / 100;
}

export function computeTotals({ items = [], tax_pct = 0, app_fee = { mode: "none" } } = {}) {
  const subtotal = items.reduce((sum, it) => sum + computeLine(it), 0);
  const tax = Math.round(subtotal * (Number(tax_pct || 0) / 100) * 100) / 100;

  let fee = 0;
  if (app_fee?.mode === "pct") {
    fee = Math.round(subtotal * (Number(app_fee.value || 0) / 100) * 100) / 100;
  } else if (app_fee?.mode === "fixed") {
    fee = Math.round(Number(app_fee.value || 0) * 100) / 100;
  }

  const total = Math.round((subtotal + tax + fee) * 100) / 100;
  return { subtotal, tax, fee, total };
}

// ------------------------
// Templates (optional)
// ------------------------
export function getTemplates() {
  return readStore(NS, { invoice: [], quote: [] });
}

export function saveTemplate(type, tpl) {
  const store = getTemplates();
  const list = Array.isArray(store[type]) ? store[type] : [];
  const next = [
    { ...tpl, id: tpl.id || String(Math.random()).slice(2), updated_at: nowIso() },
    ...list.filter((x) => x.id !== tpl.id),
  ];
  writeStore(NS, { ...store, [type]: next });
  return next;
}

export function deleteTemplate(type, id) {
  const store = getTemplates();
  const list = Array.isArray(store[type]) ? store[type] : [];
  writeStore(NS, { ...store, [type]: list.filter((x) => x.id !== id) });
}

// ------------------------
// Drafts per Ticket
// ------------------------
export function getDraft(ticketId, kind) {
  const store = readStore(DRAFT_NS, {});
  return store?.[String(ticketId)]?.[kind] || null;
}

export function saveDraft(ticketId, kind, draft) {
  const store = readStore(DRAFT_NS, {});
  const tid = String(ticketId);
  const prevTicket = store[tid] || {};
  const next = {
    ...store,
    [tid]: {
      ...prevTicket,
      [kind]: { ...draft, updated_at: nowIso() },
    },
  };
  writeStore(DRAFT_NS, next);
  return next[tid][kind];
}

export function initDraft({ ticketId, kind, ticket, businessId } = {}) {
  const existing = getDraft(ticketId, kind);
  if (existing) return existing;

  const customer_name =
    ticket?.customer_name ||
    ticket?.customer?.name ||
    ticket?.requested_by_name ||
    ticket?.requester_name ||
    ticket?.name ||
    "";

  const phone =
    ticket?.customer_phone ||
    ticket?.phone ||
    ticket?.requested_by_phone ||
    ticket?.requester_phone ||
    "";

  const address = ticket?.service_address || "";
  const zip = ticket?.service_zip || "";

  const base = {
    kind,
    ticket_id: Number(ticketId),
    invoice_number: kind === "invoice" ? generateInvoiceNumber({ ticketId, businessId }) : "",
    customer_name,
    customer_phone: phone,
    customer_text_ok: false,
    service_address: address,
    service_zip: zip,
    notes_internal: "",
    notes_customer: "",
    items: [defaultLineItem()],
    tax_pct: 0,
    app_fee: { mode: "none", value: 0 }, // none | pct | fixed
    status: "DRAFT", // DRAFT | READY_TO_SEND | SENT
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  return saveDraft(ticketId, kind, base);
}

// ------------------------
// Queues (SBO work lists)
// ------------------------
export function getQueue() {
  return readStore(QUEUE_NS, { quotes: [], invoices: [] });
}

export function upsertQueueItem(kind, payload) {
  const store = getQueue();
  const key = kind === "invoice" ? "invoices" : "quotes";
  const list = Array.isArray(store[key]) ? store[key] : [];
  const next = [
    { ...payload, updated_at: nowIso() },
    ...list.filter((x) => String(x.ticket_id) !== String(payload.ticket_id)),
  ];
  writeStore(QUEUE_NS, { ...store, [key]: next });
  return next;
}

export function removeQueueItem(kind, ticketId) {
  const store = getQueue();
  const key = kind === "invoice" ? "invoices" : "quotes";
  const list = Array.isArray(store[key]) ? store[key] : [];
  writeStore(QUEUE_NS, { ...store, [key]: list.filter((x) => String(x.ticket_id) !== String(ticketId)) });
}