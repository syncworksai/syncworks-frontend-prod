import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import ModeBar from "../components/ModeBar";
import BusinessPicker from "../components/BusinessPicker";
import { useAuth } from "../auth/AuthContext";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function Card({ title, subtitle, right, children, className = "" }) {
  return (
    <div className={cx("rounded-3xl border border-slate-800 bg-slate-950/40 p-5", className)}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="font-semibold text-slate-100">{title}</div>
          {subtitle ? <div className="text-xs text-slate-400 mt-1">{subtitle}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder = "", type = "text" }) {
  return (
    <label className="block">
      <div className="text-xs text-slate-300 mb-1">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-500/40"
      />
    </label>
  );
}

function Textarea({ label, value, onChange, placeholder = "" }) {
  return (
    <label className="block">
      <div className="text-xs text-slate-300 mb-1">{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-500/40"
      />
    </label>
  );
}

function Select({ label, value, onChange, options = [] }) {
  return (
    <label className="block">
      <div className="text-xs text-slate-300 mb-1">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-500/40"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-slate-950 text-slate-100">
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cx(
        "w-full rounded-2xl border px-3 py-3 text-sm flex items-center justify-between transition",
        checked
          ? "border-cyan-500/35 bg-cyan-500/12 text-cyan-200"
          : "border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-900/40"
      )}
    >
      <span>{label}</span>
      <span className="text-[11px]">{checked ? "ON" : "OFF"}</span>
    </button>
  );
}

function Pill({ tone = "slate", children }) {
  const cls =
    tone === "emerald"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : tone === "amber"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
      : tone === "fuchsia"
      ? "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200"
      : tone === "cyan"
      ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
      : "border-slate-800 bg-slate-950/50 text-slate-200";

  return <span className={cx("inline-flex items-center rounded-full border px-2 py-1 text-[11px]", cls)}>{children}</span>;
}

function money(n) {
  const v = Number(n || 0);
  return `$${v.toFixed(2)}`;
}

function safeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.value)) return data.value;
  return [];
}

const ITEM_TYPE_OPTIONS = [
  { value: "SERVICE", label: "Service" },
  { value: "PRODUCT", label: "Product" },
  { value: "FEE", label: "Fee" },
];

const DEFAULT_FORM = {
  id: null,
  name: "",
  sku: "",
  description: "",
  item_type: "SERVICE",
  unit_label: "each",
  default_quantity: "1.00",
  unit_price: "0.00",
  unit_cost: "0.00",
  is_active: true,
  is_featured: false,
  requires_quote: false,
  allow_direct_checkout: false,
  sort_order: "0",
};

export default function SboCatalog() {
  const navigate = useNavigate();
  const { activeBusinessId, myBusinesses } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);

  const activeBizName = useMemo(() => {
    const list = Array.isArray(myBusinesses) ? myBusinesses : [];
    const found = list.find((b) => String(b?.id || b?.business_id || b?.business?.id || "") === String(activeBusinessId || ""));
    return found?.name || found?.business_name || found?.business?.name || `Business #${activeBusinessId || "—"}`;
  }, [myBusinesses, activeBusinessId]);

  async function loadCatalog() {
    if (!activeBusinessId) return;
    setLoading(true);
    setErr("");
    try {
      const res = await api.get("/service-catalog/", {
        params: {
          q: q || undefined,
          active_only: showInactive ? undefined : true,
        },
      });
      setItems(safeList(res.data));
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to load service catalog.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBusinessId, showInactive]);

  function patchForm(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm(DEFAULT_FORM);
  }

  function editItem(item) {
    setForm({
      id: item.id,
      name: item.name || "",
      sku: item.sku || "",
      description: item.description || "",
      item_type: item.item_type || "SERVICE",
      unit_label: item.unit_label || "each",
      default_quantity: String(item.default_quantity ?? "1.00"),
      unit_price: String(item.unit_price ?? "0.00"),
      unit_cost: String(item.unit_cost ?? "0.00"),
      is_active: !!item.is_active,
      is_featured: !!item.is_featured,
      requires_quote: !!item.requires_quote,
      allow_direct_checkout: !!item.allow_direct_checkout,
      sort_order: String(item.sort_order ?? "0"),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveItem() {
    if (!activeBusinessId) {
      setErr("Select a business first.");
      return;
    }

    setSaving(true);
    setErr("");
    setOk("");

    const payload = {
      name: form.name,
      sku: form.sku,
      description: form.description,
      item_type: form.item_type,
      unit_label: form.unit_label,
      default_quantity: form.default_quantity,
      unit_price: form.unit_price,
      unit_cost: form.unit_cost,
      is_active: !!form.is_active,
      is_featured: !!form.is_featured,
      requires_quote: !!form.requires_quote,
      allow_direct_checkout: !!form.allow_direct_checkout,
      sort_order: Number(form.sort_order || 0),
    };

    try {
      if (form.id) {
        await api.patch(`/service-catalog/${form.id}/`, payload);
        setOk("Catalog item updated.");
      } else {
        await api.post("/service-catalog/", payload);
        setOk("Catalog item created.");
      }
      resetForm();
      await loadCatalog();
    } catch (e) {
      const detail = e?.response?.data?.detail;
      const data = e?.response?.data;
      setErr(detail || JSON.stringify(data || {}) || "Failed to save catalog item.");
    } finally {
      setSaving(false);
    }
  }

  async function archiveItem(item) {
    try {
      await api.post(`/service-catalog/${item.id}/archive/`, {});
      await loadCatalog();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to archive item.");
    }
  }

  async function activateItem(item) {
    try {
      await api.post(`/service-catalog/${item.id}/activate/`, {});
      await loadCatalog();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to activate item.");
    }
  }

  async function deleteItem(item) {
    const okDelete = window.confirm(`Delete "${item.name}"?`);
    if (!okDelete) return;
    try {
      await api.delete(`/service-catalog/${item.id}/`);
      await loadCatalog();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to delete item.");
    }
  }

  const stats = useMemo(() => {
    const active = items.filter((x) => x.is_active);
    const featured = items.filter((x) => x.is_featured);
    return {
      total: items.length,
      active: active.length,
      featured: featured.length,
    };
  }, [items]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar
        title="Service Catalog"
        subtitle="Create invoice-ready services, products, and fees for this business."
        rightActions={
          <div className="flex gap-2 flex-wrap">
            <BusinessPicker />
            <Link
              to="/sbo"
              className="text-xs rounded-2xl px-3 py-2 bg-slate-950/60 border border-slate-800 hover:bg-slate-900/40"
            >
              Back to SBO
            </Link>
          </div>
        }
      />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {err ? (
          <div className="text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-2xl p-3">{err}</div>
        ) : null}

        {ok ? (
          <div className="text-sm text-emerald-200 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3">{ok}</div>
        ) : null}

        <div className="grid md:grid-cols-3 gap-3">
          <Card title="Business" subtitle="Current active business">
            <div className="text-lg font-extrabold">{activeBizName}</div>
          </Card>
          <Card title="Catalog Items" subtitle="All loaded items">
            <div className="text-lg font-extrabold">{stats.total}</div>
          </Card>
          <Card title="Active / Featured" subtitle="Live selling items">
            <div className="text-lg font-extrabold">
              {stats.active} / {stats.featured}
            </div>
          </Card>
        </div>

        <div className="grid xl:grid-cols-[420px_1fr] gap-4">
          <Card
            title={form.id ? "Edit Catalog Item" : "Create Catalog Item"}
            subtitle="This is what the invoice builder will pull from."
            right={
              form.id ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs rounded-2xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900"
                >
                  New Item
                </button>
              ) : null
            }
          >
            <div className="space-y-3">
              <Input label="Name" value={form.name} onChange={(v) => patchForm("name", v)} placeholder="Diagnostic Visit" />
              <div className="grid grid-cols-2 gap-3">
                <Input label="SKU" value={form.sku} onChange={(v) => patchForm("sku", v)} placeholder="DIAG-001" />
                <Select label="Item Type" value={form.item_type} onChange={(v) => patchForm("item_type", v)} options={ITEM_TYPE_OPTIONS} />
              </div>

              <Textarea
                label="Description"
                value={form.description}
                onChange={(v) => patchForm("description", v)}
                placeholder="Quick on-site diagnostic and recommended next steps."
              />

              <div className="grid grid-cols-2 gap-3">
                <Input label="Unit Label" value={form.unit_label} onChange={(v) => patchForm("unit_label", v)} placeholder="visit" />
                <Input label="Default Qty" value={form.default_quantity} onChange={(v) => patchForm("default_quantity", v)} type="number" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input label="Unit Price" value={form.unit_price} onChange={(v) => patchForm("unit_price", v)} type="number" />
                <Input label="Unit Cost" value={form.unit_cost} onChange={(v) => patchForm("unit_cost", v)} type="number" />
              </div>

              <Input label="Sort Order" value={form.sort_order} onChange={(v) => patchForm("sort_order", v)} type="number" />

              <div className="grid gap-2">
                <Toggle checked={form.is_active} onChange={(v) => patchForm("is_active", v)} label={form.is_active ? "Active" : "Inactive"} />
                <Toggle checked={form.is_featured} onChange={(v) => patchForm("is_featured", v)} label={form.is_featured ? "Featured" : "Not Featured"} />
                <Toggle checked={form.requires_quote} onChange={(v) => patchForm("requires_quote", v)} label={form.requires_quote ? "Requires Quote" : "No Quote Required"} />
                <Toggle checked={form.allow_direct_checkout} onChange={(v) => patchForm("allow_direct_checkout", v)} label={form.allow_direct_checkout ? "Direct Checkout Allowed" : "Direct Checkout Off"} />
              </div>

              <button
                type="button"
                onClick={saveItem}
                disabled={saving}
                className={cx(
                  "w-full rounded-2xl px-4 py-3 text-sm font-semibold border transition",
                  saving
                    ? "bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-cyan-500/20 border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-200"
                )}
              >
                {saving ? "Saving…" : form.id ? "Update Catalog Item" : "Create Catalog Item"}
              </button>
            </div>
          </Card>

          <Card
            title="Catalog Library"
            subtitle="These items can be added directly inside invoice builder."
            right={
              <div className="flex gap-2 flex-wrap">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search catalog..."
                  className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-100 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowInactive((v) => !v)}
                  className={cx(
                    "text-xs rounded-2xl px-3 py-2 border",
                    showInactive
                      ? "bg-fuchsia-500/12 border-fuchsia-500/35 text-fuchsia-200"
                      : "bg-slate-950/60 border-slate-800 text-slate-200"
                  )}
                >
                  {showInactive ? "Showing Inactive" : "Active Only"}
                </button>
                <button
                  type="button"
                  onClick={loadCatalog}
                  className="text-xs rounded-2xl px-3 py-2 bg-slate-950/60 border border-slate-800 hover:bg-slate-900/40"
                >
                  {loading ? "Loading…" : "Refresh"}
                </button>
              </div>
            }
          >
            <div className="space-y-3">
              {items.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-5 text-sm text-slate-400">
                  No catalog items yet. Create your first service so the invoice builder has something to pull from.
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-sm font-semibold text-slate-100">{item.name}</div>
                          <Pill tone="cyan">{item.item_type}</Pill>
                          {item.is_featured ? <Pill tone="fuchsia">Featured</Pill> : null}
                          {item.requires_quote ? <Pill tone="amber">Requires Quote</Pill> : null}
                          {!item.is_active ? <Pill>Inactive</Pill> : null}
                        </div>

                        <div className="mt-1 text-xs text-slate-400">
                          SKU: {item.sku || "—"} • Unit: {item.unit_label || "each"} • Default Qty: {item.default_quantity}
                        </div>

                        {item.description ? (
                          <div className="mt-2 text-sm text-slate-300 leading-relaxed">{item.description}</div>
                        ) : null}

                        <div className="mt-3 flex gap-3 flex-wrap text-xs">
                          <span className="text-cyan-200">Price: {money(item.unit_price)}</span>
                          <span className="text-amber-200">Cost: {money(item.unit_cost)}</span>
                          <span className="text-emerald-200">Profit: {money(item.gross_profit_per_unit)}</span>
                          <span className="text-fuchsia-200">Margin: {item.gross_margin_pct}%</span>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => editItem(item)}
                          className="text-xs rounded-2xl px-3 py-2 bg-cyan-500/15 border border-cyan-500/35 hover:bg-cyan-500/20 text-cyan-200"
                        >
                          Edit
                        </button>

                        {item.is_active ? (
                          <button
                            type="button"
                            onClick={() => archiveItem(item)}
                            className="text-xs rounded-2xl px-3 py-2 bg-amber-500/15 border border-amber-500/35 hover:bg-amber-500/20 text-amber-200"
                          >
                            Archive
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => activateItem(item)}
                            className="text-xs rounded-2xl px-3 py-2 bg-emerald-500/15 border border-emerald-500/35 hover:bg-emerald-500/20 text-emerald-200"
                          >
                            Activate
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => deleteItem(item)}
                          className="text-xs rounded-2xl px-3 py-2 bg-rose-500/15 border border-rose-500/35 hover:bg-rose-500/20 text-rose-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}