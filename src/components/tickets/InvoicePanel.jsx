import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../api/client";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function money(n) {
  const v = Number(n || 0);
  return `$${v.toFixed(2)}`;
}

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
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

function Field({ label, children, hint = "" }) {
  return (
    <div>
      <div className="text-[11px] text-slate-500 mb-1">{label}</div>
      {children}
      {hint ? <div className="mt-1 text-[11px] text-slate-600">{hint}</div> : null}
    </div>
  );
}

function SummaryRow({ label, value, strong = false, tone = "default" }) {
  const valueCls =
    tone === "cyan"
      ? "text-cyan-100"
      : tone === "fuchsia"
      ? "text-fuchsia-200"
      : tone === "emerald"
      ? "text-emerald-200"
      : "text-slate-100";

  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/30 px-3 py-3">
      <span className="text-sm text-slate-300">{label}</span>
      <span className={cx(strong ? "text-base font-extrabold" : "text-sm font-semibold", valueCls)}>
        {value}
      </span>
    </div>
  );
}

function statusTone(status) {
  const s = String(status || "").toUpperCase();
  if (s === "PAID") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  if (s === "VOID" || s === "CANCELLED") return "border-rose-500/30 bg-rose-500/10 text-rose-200";
  if (s === "SENT" || s === "READY_FOR_PAYMENT" || s === "READY") {
    return "border-cyan-500/30 bg-cyan-500/10 text-cyan-200";
  }
  if (s === "DRAFT") return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  return "border-slate-700 bg-slate-900/40 text-slate-200";
}

function normalizeInvoice(data) {
  const inv = data?.invoice || data?.latest_invoice || data?.invoice_detail || null;
  if (!inv) return null;

  return {
    id: inv?.id || null,
    title: inv?.title || "Invoice",
    notes: inv?.notes || "",
    status: inv?.status || "DRAFT",
    subtotal: safeNum(inv?.subtotal),
    tax: safeNum(inv?.tax),
    total: safeNum(inv?.total),
    dueDate: inv?.due_date || "",
    paymentMethod: inv?.payment_method || "CARD",
    amountPaid: safeNum(inv?.amount_paid),
    paidAt: inv?.paid_at || null,
    createdAt: inv?.created_at || null,
    platformFeeRateBps: safeNum(inv?.platform_fee_rate_bps, 100),
    platformFee:
      inv?.platform_fee != null
        ? safeNum(inv?.platform_fee)
        : null,
    raw: inv,
  };
}

function normalizeLineItems(data) {
  const raw =
    data?.line_items ||
    data?.items ||
    data?.invoice_lines ||
    data?.results ||
    [];

  const list = Array.isArray(raw) ? raw : [];
  return list.map((line, idx) => {
    const quantity = safeNum(line?.quantity ?? line?.qty, 1);
    const unitPrice = safeNum(
      line?.unit_price ??
        line?.price ??
        line?.sale_price ??
        line?.amount_each ??
        line?.unit_amount,
      0
    );
    const unitCost = safeNum(
      line?.unit_cost ?? line?.cost ?? line?.base_cost ?? line?.internal_cost,
      0
    );
    const total = safeNum(
      line?.line_total ??
        line?.total ??
        line?.amount ??
        quantity * unitPrice,
      quantity * unitPrice
    );
    const costTotal = safeNum(
      line?.line_cost ??
        line?.cost_total ??
        quantity * unitCost,
      quantity * unitCost
    );

    return {
      id: line?.id ?? `${idx}-${line?.catalog_item_id || "line"}`,
      catalogItemId:
        line?.catalog_item_id ??
        line?.catalog_item ??
        line?.service_catalog_item_id ??
        line?.service_id ??
        null,
      name:
        line?.name ||
        line?.title ||
        line?.description ||
        line?.catalog_item_name ||
        line?.service_name ||
        `Line #${idx + 1}`,
      description: line?.description || "",
      quantity,
      unitPrice,
      unitCost,
      total,
      costTotal,
      profit: total - costTotal,
      raw: line,
    };
  });
}

function normalizeCatalogItems(data) {
  const raw =
    data?.catalog_items ||
    data?.catalog ||
    data?.service_catalog ||
    data?.services ||
    data?.items_catalog ||
    [];

  const list = Array.isArray(raw) ? raw : raw?.results || [];
  return list
    .map((it) => {
      const id = it?.id ?? it?.catalog_item_id ?? it?.service_id ?? it?.pk;
      if (!id) return null;

      const salePrice =
        it?.price ??
        it?.unit_price ??
        it?.retail_price ??
        it?.sell_price ??
        it?.amount ??
        0;

      const cost =
        it?.cost ??
        it?.unit_cost ??
        it?.internal_cost ??
        it?.base_cost ??
        0;

      return {
        id,
        name:
          it?.name ||
          it?.title ||
          it?.service_name ||
          it?.label ||
          `Catalog Item #${id}`,
        description: it?.description || "",
        price: safeNum(salePrice),
        cost: safeNum(cost),
        raw: it,
      };
    })
    .filter(Boolean);
}

async function tryCatalogFetch() {
  const paths = [
    "/catalog-items/",
    "/catalog/items/",
    "/service-catalog/items/",
    "/services/catalog/",
    "/catalog/",
  ];

  for (const path of paths) {
    try {
      const res = await api.get(path);
      const list = Array.isArray(res?.data) ? res.data : res?.data?.results || [];
      if (Array.isArray(list) && list.length) {
        return normalizeCatalogItems({ catalog_items: list });
      }
    } catch {
      // try next
    }
  }

  return [];
}

async function tryAddCatalogItem(ticketId, catalogItemId) {
  const payloads = [
    { catalog_item_id: catalogItemId },
    { catalog_item: catalogItemId },
    { service_catalog_item_id: catalogItemId },
    { item_id: catalogItemId },
    { id: catalogItemId },
  ];

  let lastErr = null;

  for (const body of payloads) {
    try {
      return await api.post(`/tickets/${ticketId}/add-catalog-item/`, body);
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error("Add item failed");
}

async function tryRemoveLine(ticketId, lineId) {
  const payloads = [
    { line_item_id: lineId },
    { invoice_line_id: lineId },
    { line_id: lineId },
    { id: lineId },
  ];

  let lastErr = null;

  for (const body of payloads) {
    try {
      return await api.post(`/tickets/${ticketId}/remove-catalog-line/`, body);
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error("Remove line failed");
}

async function trySaveInvoiceMeta(invoiceId, patch) {
  if (!invoiceId) return false;

  const attempts = [
    () => api.patch(`/billing/invoices/${invoiceId}/`, patch),
    () => api.patch(`/invoices/${invoiceId}/`, patch),
    () => api.patch(`/invoice/${invoiceId}/`, patch),
  ];

  for (const run of attempts) {
    try {
      await run();
      return true;
    } catch {
      // try next
    }
  }

  return false;
}

export default function InvoicePanel({ ticketId, ticket, onAfterChange }) {
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [sending, setSending] = useState(false);
  const [metaSaving, setMetaSaving] = useState(false);

  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [invoice, setInvoice] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);

  const [selectedCatalogId, setSelectedCatalogId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CARD");

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!ticketId) return;

    if (!silent) setLoading(true);
    setErr("");
    setOk("");

    try {
      const res = await api.get(`/tickets/${ticketId}/invoice-lines/`);
      const nextInvoice = normalizeInvoice(res.data);
      const nextLines = normalizeLineItems(res.data);
      const nextCatalog = normalizeCatalogItems(res.data);

      setInvoice(nextInvoice);
      setLineItems(nextLines);
      setDueDate(nextInvoice?.dueDate || "");
      setPaymentMethod(nextInvoice?.paymentMethod || "CARD");

      if (nextCatalog.length) {
        setCatalogItems(nextCatalog);
        setSelectedCatalogId((prev) => prev || String(nextCatalog[0]?.id || ""));
      } else {
        const fallbackCatalog = await tryCatalogFetch();
        setCatalogItems(fallbackCatalog);
        setSelectedCatalogId((prev) => prev || String(fallbackCatalog[0]?.id || ""));
      }
    } catch (e) {
      setInvoice(null);
      setLineItems([]);
      setCatalogItems([]);
      setErr(e?.response?.data?.detail || "Failed to load invoice builder.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    load();
  }, [load]);

  const metrics = useMemo(() => {
    const subtotal = lineItems.reduce((sum, line) => sum + safeNum(line.total), 0);
    const cost = lineItems.reduce((sum, line) => sum + safeNum(line.costTotal), 0);
    const profit = subtotal - cost;
    const marginPct = subtotal > 0 ? (profit / subtotal) * 100 : 0;

    const invoiceSubtotal = invoice?.subtotal ?? subtotal;
    const invoiceTax = invoice?.tax ?? 0;
    const invoiceTotal = invoice?.total ?? subtotal + invoiceTax;

    const feeRate = safeNum(invoice?.platformFeeRateBps, 100) / 10000;
    const platformFee =
      invoice?.platformFee != null
        ? safeNum(invoice.platformFee)
        : Number((invoiceTotal * feeRate).toFixed(2));

    return {
      subtotal,
      cost,
      profit,
      marginPct,
      invoiceSubtotal: safeNum(invoiceSubtotal),
      invoiceTax: safeNum(invoiceTax),
      invoiceTotal: safeNum(invoiceTotal),
      platformFee,
    };
  }, [invoice, lineItems]);

  const selectedCatalogItem = useMemo(() => {
    return catalogItems.find((item) => String(item.id) === String(selectedCatalogId)) || null;
  }, [catalogItems, selectedCatalogId]);

  const ticketCategory =
    ticket?.category_name ||
    ticket?.category_path ||
    "Service Ticket";

  async function addSelectedCatalogItem() {
    if (!selectedCatalogId || working) return;

    setWorking(true);
    setErr("");
    setOk("");

    try {
      await tryAddCatalogItem(ticketId, selectedCatalogId);
      setOk("Catalog item added.");
      await load({ silent: true });
      await onAfterChange?.();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Could not add catalog item.");
    } finally {
      setWorking(false);
    }
  }

  async function incrementLine(line) {
    if (!line?.catalogItemId || working) return;

    setWorking(true);
    setErr("");
    setOk("");

    try {
      await tryAddCatalogItem(ticketId, line.catalogItemId);
      setOk("Quantity updated.");
      await load({ silent: true });
      await onAfterChange?.();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Could not increase quantity.");
    } finally {
      setWorking(false);
    }
  }

  async function decrementLine(line) {
    if (!line?.id || working) return;

    setWorking(true);
    setErr("");
    setOk("");

    try {
      await tryRemoveLine(ticketId, line.id);
      setOk("Quantity updated.");
      await load({ silent: true });
      await onAfterChange?.();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Could not decrease quantity.");
    } finally {
      setWorking(false);
    }
  }

  async function removeLineFully(line) {
    if (!line?.id || working) return;

    setWorking(true);
    setErr("");
    setOk("");

    try {
      const qty = Math.max(1, safeNum(line.quantity, 1));
      for (let i = 0; i < qty; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await tryRemoveLine(ticketId, line.id);
      }
      setOk("Line removed.");
      await load({ silent: true });
      await onAfterChange?.();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Could not remove line.");
    } finally {
      setWorking(false);
    }
  }

  async function saveMeta() {
    if (!invoice?.id || metaSaving) return;

    setMetaSaving(true);
    setErr("");
    setOk("");

    try {
      const payload = {
        due_date: dueDate || null,
        payment_method: paymentMethod || "CARD",
      };

      const saved = await trySaveInvoiceMeta(invoice.id, payload);
      if (!saved) {
        setErr("Invoice loaded, but due date/payment method save endpoint was not found.");
        return;
      }

      setOk("Invoice details saved.");
      await load({ silent: true });
      await onAfterChange?.();
    } finally {
      setMetaSaving(false);
    }
  }

  async function sendInvoice() {
    if (!invoice?.id || sending) return;

    setSending(true);
    setErr("");
    setOk("");

    try {
      await api.post(`/tickets/${ticketId}/send_invoice/`, {
        invoice_id: invoice.id,
      });
      setOk("Invoice is now ready for payment.");
      await load({ silent: true });
      await onAfterChange?.();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Could not send invoice.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      {err ? (
        <div className="rounded-3xl border border-rose-800 bg-rose-900/10 p-4 text-sm text-rose-200">
          {err}
        </div>
      ) : null}

      {ok ? (
        <div className="rounded-3xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          {ok}
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="text-lg font-extrabold text-slate-100">Invoice Builder</div>
            <div className="text-xs text-slate-400 mt-1">
              Live invoice workspace for {ticketCategory}. Add catalog items, adjust quantity, and push payment-ready invoices fast.
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {invoice?.status ? (
              <span className={cx("text-[11px] px-2 py-1 rounded-full border font-semibold", statusTone(invoice.status))}>
                {String(invoice.status).toUpperCase()}
              </span>
            ) : null}

            <Btn tone="slate" onClick={() => load()} disabled={loading || working || sending || metaSaving}>
              {loading ? "Refreshing…" : "Refresh"}
            </Btn>

            <Btn
              tone="cyan"
              onClick={sendInvoice}
              disabled={!invoice?.id || sending || loading || working}
            >
              {sending ? "Sending…" : "Mark Ready for Payment"}
            </Btn>
          </div>
        </div>

        <div className="mt-4 grid md:grid-cols-2 xl:grid-cols-4 gap-3">
          <StatCard label="Subtotal" value={money(metrics.subtotal)} tone="cyan" />
          <StatCard label="Cost" value={money(metrics.cost)} tone="amber" />
          <StatCard label="Profit" value={money(metrics.profit)} tone="emerald" />
          <StatCard
            label="Margin"
            value={`${metrics.marginPct.toFixed(1)}%`}
            tone="fuchsia"
            sub={metrics.subtotal > 0 ? "Based on current live lines" : "No line items yet"}
          />
        </div>
      </div>

      <div className="grid xl:grid-cols-12 gap-4">
        <div className="xl:col-span-8 space-y-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="text-base font-extrabold text-slate-100">Add From Service Catalog</div>
                <div className="text-xs text-slate-400 mt-1">
                  Add services and materials directly into the invoice.
                </div>
              </div>

              <div className="text-[11px] text-slate-500">
                {catalogItems.length ? `${catalogItems.length} catalog items` : "No catalog returned"}
              </div>
            </div>

            <div className="mt-4 grid md:grid-cols-[1fr_auto] gap-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm"
                  value={selectedCatalogId}
                  onChange={(e) => setSelectedCatalogId(e.target.value)}
                  disabled={!catalogItems.length || working}
                >
                  {catalogItems.length ? (
                    catalogItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} • {money(item.price)}
                      </option>
                    ))
                  ) : (
                    <option value="">No catalog items found</option>
                  )}
                </select>

                {selectedCatalogItem ? (
                  <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-100">
                          {selectedCatalogItem.name}
                        </div>
                        {selectedCatalogItem.description ? (
                          <div className="mt-1 text-xs text-slate-400">
                            {selectedCatalogItem.description}
                          </div>
                        ) : null}
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-slate-400">Sale</div>
                        <div className="text-sm font-bold text-cyan-200">{money(selectedCatalogItem.price)}</div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <Btn
                tone="cyan"
                onClick={addSelectedCatalogItem}
                disabled={!selectedCatalogId || !catalogItems.length || working}
                className="h-[56px] px-6"
              >
                {working ? "Adding…" : "Add Item"}
              </Btn>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="text-base font-extrabold text-slate-100">Live Line Items</div>
                <div className="text-xs text-slate-400 mt-1">
                  Fast quantity controls for operators in the field.
                </div>
              </div>

              <div className="text-[11px] text-slate-500">
                {lineItems.length} {lineItems.length === 1 ? "line" : "lines"}
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-[920px] w-full text-left">
                <thead>
                  <tr className="text-[11px] text-slate-400 border-b border-slate-800">
                    <th className="py-3 pr-3">Item</th>
                    <th className="py-3 pr-3">Qty</th>
                    <th className="py-3 pr-3">Unit Price</th>
                    <th className="py-3 pr-3">Unit Cost</th>
                    <th className="py-3 pr-3">Line Total</th>
                    <th className="py-3 pr-3">Profit</th>
                    <th className="py-3 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {!loading && lineItems.length === 0 ? (
                    <tr>
                      <td className="py-8 text-sm text-slate-500" colSpan={7}>
                        No invoice lines yet. Add a catalog item to start building the invoice.
                      </td>
                    </tr>
                  ) : null}

                  {lineItems.map((line) => {
                    const qtyCanIncrement = !!line.catalogItemId;

                    return (
                      <tr key={line.id} className="border-b border-slate-800/60 hover:bg-slate-900/25 transition">
                        <td className="py-3 pr-3">
                          <div className="text-sm font-semibold text-slate-100">{line.name}</div>
                          {line.description ? (
                            <div className="text-[11px] text-slate-500 mt-1 max-w-[360px]">
                              {line.description}
                            </div>
                          ) : null}
                        </td>

                        <td className="py-3 pr-3">
                          <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-1">
                            <button
                              type="button"
                              onClick={() => decrementLine(line)}
                              disabled={working}
                              className="h-8 w-8 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-200 disabled:opacity-50"
                              title="Decrease quantity"
                            >
                              −
                            </button>

                            <span className="min-w-[28px] text-center text-sm font-semibold text-slate-100">
                              {line.quantity}
                            </span>

                            <button
                              type="button"
                              onClick={() => incrementLine(line)}
                              disabled={working || !qtyCanIncrement}
                              className="h-8 w-8 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-200 disabled:opacity-50"
                              title={qtyCanIncrement ? "Increase quantity" : "Catalog item id missing on this line"}
                            >
                              +
                            </button>
                          </div>
                        </td>

                        <td className="py-3 pr-3 text-sm text-slate-200">{money(line.unitPrice)}</td>
                        <td className="py-3 pr-3 text-sm text-slate-400">{money(line.unitCost)}</td>
                        <td className="py-3 pr-3 text-sm font-semibold text-slate-100">{money(line.total)}</td>
                        <td className="py-3 pr-3 text-sm font-semibold text-emerald-200">{money(line.profit)}</td>

                        <td className="py-3 text-right">
                          <Btn
                            tone="rose"
                            onClick={() => removeLineFully(line)}
                            disabled={working}
                            className="h-9 px-3"
                          >
                            Remove
                          </Btn>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="xl:col-span-4 space-y-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
            <div className="text-base font-extrabold text-slate-100">Invoice Summary</div>
            <div className="text-xs text-slate-400 mt-1">
              Customer-facing payment summary.
            </div>

            <div className="mt-4 space-y-2">
              <SummaryRow label="Subtotal" value={money(metrics.invoiceSubtotal)} />
              <SummaryRow label="Tax" value={money(metrics.invoiceTax)} />
              <SummaryRow label="Platform Fee" value={money(metrics.platformFee)} tone="fuchsia" />
              <SummaryRow label="Total" value={money(metrics.invoiceTotal)} strong tone="cyan" />
            </div>

            <div className="mt-4 grid gap-3">
              <Field label="Due Date">
                <input
                  type="date"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </Field>

              <Field label="Payment Method">
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="CARD">CARD</option>
                  <option value="CASH">CASH</option>
                </select>
              </Field>

              <Btn
                tone="emerald"
                onClick={saveMeta}
                disabled={!invoice?.id || metaSaving}
              >
                {metaSaving ? "Saving…" : "Save Details"}
              </Btn>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
            <div className="text-base font-extrabold text-slate-100">Invoice Meta</div>

            <div className="mt-4 space-y-2">
              <SummaryRow label="Invoice ID" value={invoice?.id || "—"} />
              <SummaryRow label="Status" value={invoice?.status || "DRAFT"} />
              <SummaryRow label="Ticket" value={ticketId || "—"} />
              <SummaryRow label="Payment Method" value={paymentMethod || "CARD"} />
              <SummaryRow label="Due Date" value={dueDate || "—"} />
              <SummaryRow label="Amount Paid" value={money(invoice?.amountPaid || 0)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}