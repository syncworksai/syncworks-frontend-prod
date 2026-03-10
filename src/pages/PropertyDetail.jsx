// src/pages/PropertyDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api/client";
import ModeBar from "../components/ModeBar";
import Button from "../components/ui/Button";

function Card({ title, subtitle, right, children }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{title}</div>
          {subtitle ? <div className="text-xs text-slate-400 mt-1">{subtitle}</div> : null}
        </div>
        {right}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-slate-400">{label}</div>
      {children}
      {hint ? <div className="text-[11px] text-slate-500">{hint}</div> : null}
    </div>
  );
}

function Pill({ children, tone = "slate" }) {
  const cls =
    tone === "cyan"
      ? "border-cyan-500/40 text-cyan-200 bg-cyan-500/10"
      : tone === "emerald"
      ? "border-emerald-500/40 text-emerald-200 bg-emerald-500/10"
      : tone === "amber"
      ? "border-amber-500/40 text-amber-200 bg-amber-500/10"
      : tone === "red"
      ? "border-red-500/40 text-red-200 bg-red-500/10"
      : "border-slate-700 text-slate-300 bg-slate-950/40";
  return <span className={`inline-flex items-center px-2 py-1 rounded-full border text-[11px] ${cls}`}>{children}</span>;
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleString();
}

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "units", label: "Units" },
  { key: "tenants", label: "Tenants" },
  { key: "docs", label: "Documents" },
  { key: "automation", label: "Automation" },
];

// Property status options (front-end only; backend will enforce later)
const PROPERTY_STATUSES = [
  { v: "ACTIVE", label: "Active" },
  { v: "VACANT", label: "Vacant" },
  { v: "OCCUPIED", label: "Occupied" },
  { v: "MAINTENANCE", label: "Maintenance" },
  { v: "OFFLINE", label: "Offline" },
];

export default function PropertyDetail() {
  const nav = useNavigate();
  const { id } = useParams();

  const [tab, setTab] = useState("overview");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [property, setProperty] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [docs, setDocs] = useState([]);

  const [photoUploading, setPhotoUploading] = useState(false);
  const [docUploading, setDocUploading] = useState(false);

  // Editable profile form
  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",

    status: "ACTIVE",

    is_section8: false,
    section8_agent_name: "",
    section8_agent_email: "",
    section8_program_notes: "",

    is_furnished: false,
    furnishing_notes: "",

    notes: "",
  });

  const statusTone = useMemo(() => {
    const s = String(form.status || "").toUpperCase();
    if (s === "ACTIVE") return "emerald";
    if (s === "VACANT") return "amber";
    if (s === "OCCUPIED") return "cyan";
    if (s === "MAINTENANCE") return "amber";
    if (s === "OFFLINE") return "red";
    return "slate";
  }, [form.status]);

  async function tryGetList(paths) {
    let last = null;
    for (const p of paths) {
      try {
        const r = await api.get(p);
        const data = r.data;
        if (Array.isArray(data?.results)) return data.results;
        if (Array.isArray(data)) return data;
        return [];
      } catch (e) {
        last = e;
      }
    }
    throw last || new Error("Not found");
  }

  async function load() {
    setLoading(true);
    setErr("");
    setOk("");

    // We’ll wire these backend endpoints next.
    // Until then, the page renders and gives clear messaging.
    const propertyPaths = [`/pm/properties/${id}/`, `/properties/${id}/`];
    const photoPaths = [`/pm/properties/${id}/photos/`, `/properties/${id}/photos/`];
    const docPaths = [`/pm/properties/${id}/documents/`, `/properties/${id}/documents/`];

    let lastErr = null;

    // load property
    try {
      let loaded = null;
      for (const p of propertyPaths) {
        try {
          const r = await api.get(p);
          loaded = r.data;
          break;
        } catch (e) {
          lastErr = e;
        }
      }

      if (!loaded) {
        setProperty(null);
        setPhotos([]);
        setDocs([]);
        setErr(
          lastErr?.response?.status === 404
            ? "Property endpoints aren’t wired yet. Next step is backend models + PM routes."
            : lastErr?.response?.data?.detail || lastErr?.message || "Failed to load property."
        );
        setLoading(false);
        return;
      }

      setProperty(loaded);

      // map to form (defensive)
      setForm((prev) => ({
        ...prev,
        name: loaded?.name || "",
        address: loaded?.address || "",
        city: loaded?.city || "",
        state: loaded?.state || "",
        zip: loaded?.zip || "",
        status: loaded?.status || "ACTIVE",

        is_section8: !!loaded?.is_section8,
        section8_agent_name: loaded?.section8_agent_name || "",
        section8_agent_email: loaded?.section8_agent_email || "",
        section8_program_notes: loaded?.section8_program_notes || "",

        is_furnished: !!loaded?.is_furnished,
        furnishing_notes: loaded?.furnishing_notes || "",

        notes: loaded?.notes || "",
      }));

      // load photos + docs (optional)
      try {
        const p = await tryGetList(photoPaths);
        setPhotos(p);
      } catch {
        setPhotos([]);
      }
      try {
        const d = await tryGetList(docPaths);
        setDocs(d);
      } catch {
        setDocs([]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    setErr("");
    setOk("");

    const payload = {
      name: form.name?.trim(),
      address: form.address?.trim(),
      city: form.city?.trim(),
      state: form.state?.trim(),
      zip: form.zip?.trim(),

      status: form.status,

      is_section8: !!form.is_section8,
      section8_agent_name: form.section8_agent_name?.trim(),
      section8_agent_email: form.section8_agent_email?.trim(),
      section8_program_notes: form.section8_program_notes?.trim(),

      is_furnished: !!form.is_furnished,
      furnishing_notes: form.furnishing_notes?.trim(),

      notes: form.notes?.trim(),
    };

    const candidates = [`/pm/properties/${id}/`, `/properties/${id}/`];
    let last = null;

    for (const p of candidates) {
      try {
        const r = await api.patch(p, payload);
        setProperty(r.data);
        setOk("Property saved.");
        setSaving(false);
        return;
      } catch (e) {
        last = e;
      }
    }

    setErr(
      last?.response?.status === 404
        ? "Save failed because PM property endpoints aren’t wired yet. Next step is backend PM models + routes."
        : last?.response?.data?.detail || last?.message || "Save failed."
    );
    setSaving(false);
  }

  async function uploadPhoto(file) {
    if (!file) return;
    setErr("");
    setOk("");
    setPhotoUploading(true);

    const candidates = [`/pm/properties/${id}/photos/`, `/properties/${id}/photos/`];
    const fd = new FormData();
    fd.append("photo", file);

    let last = null;
    for (const p of candidates) {
      try {
        const r = await api.post(p, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const created = r.data;
        setPhotos((prev) => [created, ...prev]);
        setOk("Photo uploaded.");
        setPhotoUploading(false);
        return;
      } catch (e) {
        last = e;
      }
    }

    setErr(
      last?.response?.status === 404
        ? "Photo upload endpoint isn’t wired yet. We’ll add it in the PM backend routes."
        : last?.response?.data?.detail || last?.message || "Photo upload failed."
    );
    setPhotoUploading(false);
  }

  async function uploadDocument(file, docType) {
    if (!file) return;
    setErr("");
    setOk("");
    setDocUploading(true);

    const candidates = [`/pm/properties/${id}/documents/`, `/properties/${id}/documents/`];

    const fd = new FormData();
    fd.append("file", file);
    fd.append("doc_type", docType || "OTHER");

    let last = null;
    for (const p of candidates) {
      try {
        const r = await api.post(p, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const created = r.data;
        setDocs((prev) => [created, ...prev]);
        setOk("Document uploaded.");
        setDocUploading(false);
        return;
      } catch (e) {
        last = e;
      }
    }

    setErr(
      last?.response?.status === 404
        ? "Document upload endpoint isn’t wired yet. We’ll add it in the PM backend routes."
        : last?.response?.data?.detail || last?.message || "Document upload failed."
    );
    setDocUploading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar
        title="Property"
        subtitle={property?.name ? property.name : `Property #${id}`}
        rightActions={
          <div className="flex gap-2">
            <Button tone="slate" onClick={() => nav("/pm")}>
              Back
            </Button>
            <Button tone="slate" onClick={load} disabled={loading}>
              Refresh
            </Button>
          </div>
        }
      />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={[
                "h-9 px-4 rounded-xl border text-xs",
                tab === t.key
                  ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
                  : "border-slate-800 bg-slate-950/40 text-slate-200 hover:bg-slate-900/40",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? <div className="text-sm text-slate-400">Loading…</div> : null}

        {err ? (
          <div className="text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-2xl p-3">{err}</div>
        ) : null}
        {ok ? (
          <div className="text-sm text-emerald-200 bg-emerald-900/15 border border-emerald-700/30 rounded-2xl p-3">
            {ok}
          </div>
        ) : null}

        {/* OVERVIEW */}
        {tab === "overview" ? (
          <div className="grid lg:grid-cols-3 gap-4">
            <Card
              title="Property Profile"
              subtitle="Status, compliance flags, and contact details"
              right={<Pill tone={statusTone}>{form.status}</Pill>}
            >
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Property Name">
                  <input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                    placeholder="Oak Ridge Apartments"
                  />
                </Field>

                <Field label="Status" hint="Used for portfolio health, vacancy, and workflow routing.">
                  <select
                    value={form.status}
                    onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                  >
                    {PROPERTY_STATUSES.map((s) => (
                      <option key={s.v} value={s.v}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Address">
                  <input
                    value={form.address}
                    onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                    placeholder="123 Main St"
                  />
                </Field>

                <Field label="City / State / ZIP">
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      value={form.city}
                      onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                      placeholder="City"
                    />
                    <input
                      value={form.state}
                      onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                      placeholder="State"
                    />
                    <input
                      value={form.zip}
                      onChange={(e) => setForm((p) => ({ ...p, zip: e.target.value }))}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                      placeholder="ZIP"
                    />
                  </div>
                </Field>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="font-semibold">Compliance & Listing</div>

                <div className="mt-3 grid md:grid-cols-2 gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.is_section8}
                      onChange={(e) => setForm((p) => ({ ...p, is_section8: e.target.checked }))}
                    />
                    <span>Section 8 accepted</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.is_furnished}
                      onChange={(e) => setForm((p) => ({ ...p, is_furnished: e.target.checked }))}
                    />
                    <span>Fully furnished</span>
                  </label>

                  <Field label="Section 8 agent name" hint="Optional">
                    <input
                      value={form.section8_agent_name}
                      onChange={(e) => setForm((p) => ({ ...p, section8_agent_name: e.target.value }))}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                      placeholder="Agent name"
                      disabled={!form.is_section8}
                    />
                  </Field>

                  <Field label="Section 8 agent email" hint="Used for reminders & paperwork automation later.">
                    <input
                      value={form.section8_agent_email}
                      onChange={(e) => setForm((p) => ({ ...p, section8_agent_email: e.target.value }))}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                      placeholder="agent@housing.org"
                      disabled={!form.is_section8}
                    />
                  </Field>

                  <Field label="Furnishing notes" hint="Inventory / exceptions / owner-provided items.">
                    <input
                      value={form.furnishing_notes}
                      onChange={(e) => setForm((p) => ({ ...p, furnishing_notes: e.target.value }))}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                      placeholder="Sofa, bed, dishes, TV..."
                      disabled={!form.is_furnished}
                    />
                  </Field>

                  <Field label="Section 8 program notes" hint="Voucher details, inspection cycle notes, etc.">
                    <input
                      value={form.section8_program_notes}
                      onChange={(e) => setForm((p) => ({ ...p, section8_program_notes: e.target.value }))}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                      placeholder="Inspection schedule, special requirements..."
                      disabled={!form.is_section8}
                    />
                  </Field>
                </div>
              </div>

              <div className="mt-5">
                <Field label="Internal notes" hint="Only visible to your team.">
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm min-h-[110px]"
                    placeholder="Anything important about this property..."
                  />
                </Field>
              </div>

              <div className="mt-5 flex gap-2 flex-wrap">
                <Button tone="cyan" onClick={save} disabled={saving}>
                  {saving ? "Saving…" : "Save Property"}
                </Button>
                <Button tone="slate" onClick={load} disabled={loading || saving}>
                  Reset
                </Button>
              </div>

              {property?.created_at ? (
                <div className="mt-3 text-[11px] text-slate-500">Created {fmtDate(property.created_at)}</div>
              ) : null}
            </Card>

            <Card title="Photos" subtitle="Upload and maintain a visual record (units can have photos later)">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-xs text-slate-400">Recommended: exterior, entry, kitchen, bath, key systems.</div>
                <label className="inline-flex items-center justify-center h-9 text-xs rounded-xl px-4 bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-200 cursor-pointer">
                  {photoUploading ? "Uploading…" : "Upload Photo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={photoUploading}
                    onChange={(e) => uploadPhoto(e.target.files?.[0])}
                  />
                </label>
              </div>

              {photos.length === 0 ? (
                <div className="mt-4 text-sm text-slate-400">
                  No photos yet. Once the backend photo endpoint is wired, uploads will show here.
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                  {photos.map((p) => (
                    <div
                      key={p.id || p.url || Math.random()}
                      className="rounded-2xl border border-slate-800 bg-slate-950/50 overflow-hidden"
                    >
                      {p.url ? (
                        <img src={p.url} alt="Property" className="w-full h-36 object-cover" />
                      ) : (
                        <div className="w-full h-36 flex items-center justify-center text-xs text-slate-500">
                          Photo
                        </div>
                      )}
                      <div className="p-2 text-[11px] text-slate-500">
                        {p.created_at ? `Uploaded ${fmtDate(p.created_at)}` : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card
              title="Quick links"
              subtitle="We’ll wire unit + tenant + ticket flows next"
              right={<Pill tone="cyan">Next</Pill>}
            >
              <div className="space-y-2">
                <Button tone="slate" onClick={() => setTab("units")}>
                  Manage Units
                </Button>
                <Button tone="slate" onClick={() => setTab("tenants")}>
                  Tenants & Invites
                </Button>
                <Button tone="slate" onClick={() => setTab("docs")}>
                  Documents / Leases
                </Button>

                <div className="mt-3 text-[11px] text-slate-500">
                  Marketplace + service dispatch will plug in after unit-based service requests are live.
                </div>
              </div>
            </Card>
          </div>
        ) : null}

        {/* UNITS */}
        {tab === "units" ? (
          <Card
            title="Units"
            subtitle="Add units, assign tenants, and track unit-level service history"
            right={<Pill tone="cyan">Wiring next</Pill>}
          >
            <div className="text-sm text-slate-300">
              This tab will manage:
              <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-300">
                <li>Unit list (Unit A, 101, etc.)</li>
                <li>Bed/bath, sqft, rent, deposit, section8 flags per unit</li>
                <li>Unit photos</li>
                <li>Unit-level service tickets history</li>
              </ul>

              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-slate-400 text-sm">
                Units UI is next file. We’ll keep it simple: list + “Add Unit” drawer.
              </div>
            </div>
          </Card>
        ) : null}

        {/* TENANTS */}
        {tab === "tenants" ? (
          <Card
            title="Tenants"
            subtitle="Invite tenants to the unit with a code or link"
            right={<Pill tone="amber">Wiring next</Pill>}
          >
            <div className="text-sm text-slate-300">
              Tenants will:
              <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-300">
                <li>Join via invite code (PM controls linking)</li>
                <li>See only their unit + their service requests</li>
                <li>Submit maintenance requests that PM can approve + dispatch</li>
              </ul>

              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-slate-400 text-sm">
                Next we’ll build invite generation + tenant list UI, then backend model for invite codes.
              </div>
            </div>
          </Card>
        ) : null}

        {/* DOCUMENTS */}
        {tab === "docs" ? (
          <Card
            title="Documents / Lease Locker"
            subtitle="Store leases, extensions, Section 8 paperwork, inspections, and notices"
            right={<Pill tone="cyan">Ready for backend</Pill>}
          >
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="font-semibold">Upload documents</div>
                <div className="text-xs text-slate-400 mt-1">
                  Uploading is safe even when automation isn’t built yet. We’ll add versioning + expiration later.
                </div>

                <div className="mt-3 grid gap-2">
                  <label className="inline-flex items-center justify-center h-9 text-xs rounded-xl px-4 bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-200 cursor-pointer">
                    {docUploading ? "Uploading…" : "Upload Lease"}
                    <input
                      type="file"
                      className="hidden"
                      disabled={docUploading}
                      onChange={(e) => uploadDocument(e.target.files?.[0], "LEASE")}
                    />
                  </label>

                  <label className="inline-flex items-center justify-center h-9 text-xs rounded-xl px-4 bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-200 cursor-pointer">
                    {docUploading ? "Uploading…" : "Upload Extension"}
                    <input
                      type="file"
                      className="hidden"
                      disabled={docUploading}
                      onChange={(e) => uploadDocument(e.target.files?.[0], "EXTENSION")}
                    />
                  </label>

                  <label className="inline-flex items-center justify-center h-9 text-xs rounded-xl px-4 bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-200 cursor-pointer">
                    {docUploading ? "Uploading…" : "Upload Section 8 Paperwork"}
                    <input
                      type="file"
                      className="hidden"
                      disabled={docUploading}
                      onChange={(e) => uploadDocument(e.target.files?.[0], "SECTION8")}
                    />
                  </label>

                  <label className="inline-flex items-center justify-center h-9 text-xs rounded-xl px-4 bg-slate-950/60 border border-slate-800 hover:bg-slate-900/40 text-slate-200 cursor-pointer">
                    {docUploading ? "Uploading…" : "Upload Other"}
                    <input
                      type="file"
                      className="hidden"
                      disabled={docUploading}
                      onChange={(e) => uploadDocument(e.target.files?.[0], "OTHER")}
                    />
                  </label>
                </div>

                <div className="mt-3 text-[11px] text-slate-500">
                  Next backend: property documents table with doc_type, unit (optional), lease dates, expiry, and tags.
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="font-semibold">Stored documents</div>
                {docs.length === 0 ? (
                  <div className="mt-3 text-sm text-slate-400">
                    No documents yet. Once backend document endpoints are wired, uploads will list here.
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    {docs.map((d) => (
                      <div key={d.id || d.url || Math.random()} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-semibold">
                            {d.name || d.filename || d.doc_type || "Document"}
                          </div>
                          <Pill tone="slate">{d.doc_type || "DOC"}</Pill>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          {d.created_at ? `Uploaded ${fmtDate(d.created_at)}` : "—"}
                        </div>
                        {d.url ? (
                          <a
                            href={d.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-block mt-2 text-xs text-cyan-200 hover:underline"
                          >
                            Open
                          </a>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="font-semibold">Next: document automation (safe + professional)</div>
              <div className="text-sm text-slate-300 mt-2">
                We’ll automate:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Lease generation from templates (PDF / Docx) with audit trail</li>
                  <li>Extension workflows (date changes + tenant signatures later)</li>
                  <li>Section 8 reminders to agent email (inspection cycles, recertifications)</li>
                  <li>Expiry alerts (lease end, inspection expiry, insurance, permits)</li>
                </ul>
                <div className="mt-2 text-[11px] text-slate-500">
                  We’ll keep this “legal-grade”: immutable history, versioning, and role-based access.
                </div>
              </div>
            </div>
          </Card>
        ) : null}

        {/* AUTOMATION */}
        {tab === "automation" ? (
          <Card
            title="Automation"
            subtitle="Reminders, templates, and workflows (we’ll wire the backend + email later)"
            right={<Pill tone="cyan">Planned</Pill>}
          >
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="font-semibold">Automation goals</div>
              <ul className="mt-2 text-sm text-slate-300 list-disc pl-5 space-y-1">
                <li>Property status-driven checklists (Vacant → Make-ready → Listed → Occupied)</li>
                <li>Section 8 agent communication templates</li>
                <li>Lease renewal reminders and extension creation</li>
                <li>Document expiry alerts + compliance calendar</li>
                <li>Marketplace dispatch rules for maintenance tickets (later)</li>
              </ul>
              <div className="mt-3 text-[11px] text-slate-500">
                We’ll keep automation opt-in and traceable. Every automated email will be logged.
              </div>
            </div>

            <div className="mt-4 text-sm text-slate-400">
              Next UI file after this: Units Manager page (embedded or standalone).
            </div>
          </Card>
        ) : null}

        <div className="text-[11px] text-slate-500">
          Note: This page is built to be safe even before backend wiring. Once models/routes exist, it “turns on”
          automatically without UI refactors.
        </div>
      </main>
    </div>
  );
}
