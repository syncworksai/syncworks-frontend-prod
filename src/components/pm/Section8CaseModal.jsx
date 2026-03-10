import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import Button from "../ui/Button";
import PropertySearchSelect from "./docs/PropertySearchSelect";

const STATUS_CHOICES = [
  { value: "ACTIVE", label: "Active" },
  { value: "PENDING", label: "Pending / Onboarding" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "TERMINATED", label: "Terminated" },
  { value: "CLOSED", label: "Closed" },
];

const INSPECTION_CHOICES = [
  { value: "UNKNOWN", label: "Unknown" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "PASSED", label: "Passed" },
  { value: "FAILED", label: "Failed" },
  { value: "REINSPECTION", label: "Reinspection Needed" },
];

/**
 * ✅ REQUIRED packet keys (must match backend REQUIRED_PACKET_KEYS)
 */
const REQUIRED_PACKET_ITEMS = [
  { key: "w9", label: "W-9" },
  { key: "voided_check", label: "Voided check" },
  { key: "direct_deposit_auth", label: "Direct deposit auth" },
  { key: "dl", label: "Driver’s license / ID" },
  { key: "ss_card", label: "SS card" },
  { key: "lease_addendum", label: "Lease addendum" },
  { key: "landlord_certification", label: "Landlord certification" },
  { key: "tax_assessment", label: "Tax assessment" },
];

const OPTIONAL_PACKET_ITEMS = [
  { key: "management_agreement", label: "Mgmt agreement" },
  { key: "warranty_deed", label: "Warranty deed" },
  { key: "lead_based_paint", label: "Lead paint disclosure" },
];

/**
 * Notes metadata tag: persist cc_email without cluttering notes text
 */
const META_TAG = "[[SW_SECTION8_META_JSON]]";

function ModalShell({ title, subtitle, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div
        className={[
          "relative w-full",
          "max-w-3xl",
          "rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl",
          "max-h-[86vh] overflow-hidden",
        ].join(" ")}
      >
        <div className="p-4 sm:p-5 border-b border-slate-800">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-base sm:text-lg font-extrabold text-slate-100 truncate">{title}</div>
              {subtitle ? <div className="text-[11px] sm:text-xs text-slate-400 mt-1">{subtitle}</div> : null}
            </div>
            <Button tone="slate" onClick={onClose}>
              ✖ Close
            </Button>
          </div>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto max-h-[calc(86vh-72px)]">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <div className="text-[11px] text-slate-300 font-semibold">{label}</div>
      {hint ? <div className="text-[11px] text-slate-500 mt-0.5">{hint}</div> : null}
      <div className="mt-2">{children}</div>
    </label>
  );
}

function inputCls(disabled) {
  return [
    "w-full h-10 rounded-xl border px-3 text-sm outline-none",
    "border-slate-800 bg-slate-950/60 text-slate-100",
    "focus:border-fuchsia-500/40 focus:ring-2 focus:ring-fuchsia-500/10",
    disabled ? "opacity-60 cursor-not-allowed" : "",
  ].join(" ");
}

function textareaCls(disabled) {
  return [
    "w-full min-h-[88px] rounded-xl border px-3 py-2 text-sm outline-none",
    "border-slate-800 bg-slate-950/60 text-slate-100",
    "focus:border-fuchsia-500/40 focus:ring-2 focus:ring-fuchsia-500/10",
    disabled ? "opacity-60 cursor-not-allowed" : "",
  ].join(" ");
}

function safeIsoDate(v) {
  return v || null;
}

function safeMoney(v) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function normalizePacketItems(src) {
  const obj = src && typeof src === "object" ? src : {};
  const out = {};
  for (const it of REQUIRED_PACKET_ITEMS) out[it.key] = !!obj[it.key];
  for (const [k, v] of Object.entries(obj)) {
    if (!(k in out)) out[k] = !!v;
  }
  return out;
}

function packetProgress(packetItems) {
  const items = normalizePacketItems(packetItems);
  const requiredKeys = REQUIRED_PACKET_ITEMS.map((x) => x.key);
  const total = requiredKeys.length;
  const done = requiredKeys.filter((k) => !!items[k]).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const missingKeys = requiredKeys.filter((k) => !items[k]);
  const ready = missingKeys.length === 0;
  return { pct, done, total, missingKeys, ready };
}

function extractMetaFromNotes(notes) {
  try {
    const raw = String(notes || "");
    const i = raw.indexOf(META_TAG);
    if (i === -1) return { meta: null, cleanNotes: raw.trim() };
    const jsonPart = raw.slice(i + META_TAG.length).trim();
    const cleanNotes = raw.slice(0, i).trim();
    const meta = JSON.parse(jsonPart);
    return { meta, cleanNotes };
  } catch {
    return { meta: null, cleanNotes: String(notes || "").trim() };
  }
}

function packNotesWithMeta(cleanNotes, metaObj) {
  const base = String(cleanNotes || "").trim();
  const json = JSON.stringify(metaObj || {});
  return (base ? base + "\n\n" : "") + META_TAG + "\n" + json;
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "px-3 py-2 rounded-xl text-xs font-semibold border",
        active
          ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-100"
          : "border-slate-800 bg-slate-950/30 text-slate-300 hover:bg-slate-900/40",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function TinyPill({ tone = "slate", children }) {
  const tones = {
    slate: "border-slate-700/40 bg-slate-800/30 text-slate-200",
    emerald: "border-emerald-500/40 bg-emerald-500/10 text-emerald-100",
    amber: "border-amber-500/40 bg-amber-500/10 text-amber-100",
    red: "border-red-500/40 bg-red-500/10 text-red-100",
    cyan: "border-cyan-500/40 bg-cyan-500/10 text-cyan-100",
  };
  return (
    <span className={["inline-flex items-center px-2 py-1 rounded-xl border text-[11px] font-semibold", tones[tone] || tones.slate].join(" ")}>
      {children}
    </span>
  );
}

export default function Section8CaseModal({ open, mode = "create", caseItem = null, onClose, onSaved }) {
  const [tab, setTab] = useState("packet");

  const [saving, setSaving] = useState(false);
  const [sendingFinal, setSendingFinal] = useState(false);
  const [sendingUpdate, setSendingUpdate] = useState(false);

  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const [units, setUnits] = useState([]);
  const [tenants, setTenants] = useState([]);

  // form
  const [property, setProperty] = useState("");
  const [unit, setUnit] = useState("");
  const [tenant, setTenant] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [inspection_status, setInspectionStatus] = useState("UNKNOWN");

  const [housing_authority_name, setHousingAuthorityName] = useState("");
  const [housing_authority_phone, setHousingAuthorityPhone] = useState("");
  const [housing_authority_email, setHousingAuthorityEmail] = useState("");

  const [caseworker_name, setCaseworkerName] = useState("");
  const [caseworker_phone, setCaseworkerPhone] = useState("");
  const [caseworker_email, setCaseworkerEmail] = useState("");

  const [voucher_number, setVoucherNumber] = useState("");
  const [hap_contract_number, setHapContractNumber] = useState("");

  const [hap_start_date, setHapStartDate] = useState("");
  const [hap_end_date, setHapEndDate] = useState("");
  const [recert_due_date, setRecertDueDate] = useState("");
  const [recert_submitted_date, setRecertSubmittedDate] = useState("");
  const [recert_approved_date, setRecertApprovedDate] = useState("");

  const [inspection_scheduled_date, setInspectionScheduledDate] = useState("");
  const [inspection_completed_date, setInspectionCompletedDate] = useState("");
  const [inspection_fail_reasons, setInspectionFailReasons] = useState("");

  const [contract_rent, setContractRent] = useState("");
  const [tenant_portion, setTenantPortion] = useState("");
  const [subsidy_portion, setSubsidyPortion] = useState("");

  const [packet_items, setPacketItems] = useState({});
  const [packet_ready, setPacketReady] = useState(false);

  const [notes, setNotes] = useState("");
  const [cc_email, setCcEmail] = useState("");

  function toastOk(m) {
    setOkMsg(m || "");
    if (m) setTimeout(() => setOkMsg(""), 2400);
  }

  async function tryGet(path) {
    const r = await api.get(path);
    const d = r.data;
    if (Array.isArray(d?.results)) return d.results;
    if (Array.isArray(d)) return d;
    return [];
  }

  // load picklists (units + tenants). Property is now async searchable component.
  useEffect(() => {
    if (!open) return;
    let alive = true;

    (async () => {
      try {
        const [u, t] = await Promise.all([tryGet("/pm/units/").catch(() => []), tryGet("/pm/tenants/").catch(() => [])]);
        if (!alive) return;
        setUnits(u);
        setTenants(t);
      } catch {
        // ignore
      }
    })();

    return () => {
      alive = false;
    };
  }, [open]);

  // init when opened
  useEffect(() => {
    if (!open) return;

    setErr("");
    setOkMsg("");
    setTab("packet");

    if (mode === "edit" && caseItem) {
      setProperty(caseItem.property ? String(caseItem.property) : "");
      setUnit(caseItem.unit ? String(caseItem.unit) : "");
      setTenant(caseItem.tenant ? String(caseItem.tenant) : "");

      setStatus(caseItem.status || "ACTIVE");
      setInspectionStatus(caseItem.inspection_status || "UNKNOWN");

      setHousingAuthorityName(caseItem.housing_authority_name || "");
      setHousingAuthorityPhone(caseItem.housing_authority_phone || "");
      setHousingAuthorityEmail(caseItem.housing_authority_email || "");

      setCaseworkerName(caseItem.caseworker_name || "");
      setCaseworkerPhone(caseItem.caseworker_phone || "");
      setCaseworkerEmail(caseItem.caseworker_email || "");

      setVoucherNumber(caseItem.voucher_number || "");
      setHapContractNumber(caseItem.hap_contract_number || "");

      setHapStartDate(caseItem.hap_start_date || "");
      setHapEndDate(caseItem.hap_end_date || "");
      setRecertDueDate(caseItem.recert_due_date || "");
      setRecertSubmittedDate(caseItem.recert_submitted_date || "");
      setRecertApprovedDate(caseItem.recert_approved_date || "");

      setInspectionScheduledDate(caseItem.inspection_scheduled_date || "");
      setInspectionCompletedDate(caseItem.inspection_completed_date || "");
      setInspectionFailReasons(caseItem.inspection_fail_reasons || "");

      setContractRent(caseItem.contract_rent ?? "");
      setTenantPortion(caseItem.tenant_portion ?? "");
      setSubsidyPortion(caseItem.subsidy_portion ?? "");

      const extracted = extractMetaFromNotes(caseItem.notes || "");
      setNotes(extracted.cleanNotes || "");
      setCcEmail(String(extracted.meta?.cc_email || "").trim());

      setPacketItems(normalizePacketItems(caseItem.packet_items));
      setPacketReady(!!caseItem.packet_ready);
    } else {
      setProperty("");
      setUnit("");
      setTenant("");
      setStatus("ACTIVE");
      setInspectionStatus("UNKNOWN");

      setHousingAuthorityName("");
      setHousingAuthorityPhone("");
      setHousingAuthorityEmail("");

      setCaseworkerName("");
      setCaseworkerPhone("");
      setCaseworkerEmail("");

      setVoucherNumber("");
      setHapContractNumber("");

      setHapStartDate("");
      setHapEndDate("");
      setRecertDueDate("");
      setRecertSubmittedDate("");
      setRecertApprovedDate("");

      setInspectionScheduledDate("");
      setInspectionCompletedDate("");
      setInspectionFailReasons("");

      setContractRent("");
      setTenantPortion("");
      setSubsidyPortion("");

      setNotes("");
      setCcEmail("");

      const start = {};
      for (const it of REQUIRED_PACKET_ITEMS) start[it.key] = false;
      setPacketItems(start);
      setPacketReady(false);
    }
  }, [open, mode, caseItem]);

  const unitsForProperty = useMemo(() => {
    if (!property) return units;
    return (units || []).filter((u) => String(u.property) === String(property));
  }, [units, property]);

  useEffect(() => {
    if (!open) return;
    if (!property) return;
    if (unit && !unitsForProperty.some((u) => String(u.id) === String(unit))) setUnit("");
  }, [property, unit, unitsForProperty, open]);

  const prog = useMemo(() => packetProgress(packet_items), [packet_items]);

  useEffect(() => {
    if (!open) return;
    if (prog.ready && !packet_ready) setPacketReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prog.ready, open]);

  function togglePacketKey(key) {
    setPacketItems((prev) => {
      const cur = normalizePacketItems(prev);
      return { ...cur, [key]: !cur[key] };
    });
  }

  function setAllRequired(value) {
    setPacketItems((prev) => {
      const cur = normalizePacketItems(prev);
      const next = { ...cur };
      for (const it of REQUIRED_PACKET_ITEMS) next[it.key] = !!value;
      return next;
    });
  }

  function setAllOptional(value) {
    setPacketItems((prev) => {
      const cur = normalizePacketItems(prev);
      const next = { ...cur };
      for (const it of OPTIONAL_PACKET_ITEMS) next[it.key] = !!value;
      return next;
    });
  }

  function buildPayload() {
    const meta = { cc_email: String(cc_email || "").trim() };
    const finalNotes = packNotesWithMeta(notes, meta);

    return {
      property: property ? Number(property) : null,
      unit: unit ? Number(unit) : null,
      tenant: tenant ? Number(tenant) : null,

      status,
      inspection_status,

      housing_authority_name,
      housing_authority_phone,
      housing_authority_email,

      caseworker_name,
      caseworker_phone,
      caseworker_email,

      voucher_number,
      hap_contract_number,

      hap_start_date: safeIsoDate(hap_start_date),
      hap_end_date: safeIsoDate(hap_end_date),
      recert_due_date: safeIsoDate(recert_due_date),
      recert_submitted_date: safeIsoDate(recert_submitted_date),
      recert_approved_date: safeIsoDate(recert_approved_date),

      inspection_scheduled_date: safeIsoDate(inspection_scheduled_date),
      inspection_completed_date: safeIsoDate(inspection_completed_date),
      inspection_fail_reasons,

      contract_rent: safeMoney(contract_rent),
      tenant_portion: safeMoney(tenant_portion),
      subsidy_portion: safeMoney(subsidy_portion),

      notes: finalNotes,

      packet_items: normalizePacketItems(packet_items),
      packet_ready: !!packet_ready,
    };
  }

  async function save({ closeAfter = false } = {}) {
    setSaving(true);
    setErr("");
    setOkMsg("");

    try {
      const payload = buildPayload();

      if (!payload.property || !payload.unit || !payload.tenant) {
        setErr("Property, Unit, and Tenant are required.");
        setSaving(false);
        return null;
      }

      let saved = null;
      if (mode === "edit" && caseItem?.id) {
        const r = await api.patch(`/pm/section8/cases/${caseItem.id}/`, payload);
        saved = r.data;
      } else {
        const r = await api.post("/pm/section8/cases/", payload);
        saved = r.data;
      }

      toastOk("✅ Saved");
      onSaved?.(saved);

      if (closeAfter) onClose?.();
      return saved;
    } catch (e) {
      const data = e?.response?.data;
      if (typeof data === "string") setErr(data);
      else if (data && typeof data === "object") {
        const firstKey = Object.keys(data)[0];
        const firstVal = firstKey ? data[firstKey] : null;
        const msg = Array.isArray(firstVal) ? firstVal[0] : data?.detail;
        setErr(msg || "Failed to save case.");
      } else {
        setErr(e?.message || "Failed to save case.");
      }
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function sendFinalPacket() {
    if (!(mode === "edit" && caseItem?.id)) {
      setErr("Save the case first, then you can send the packet.");
      return;
    }

    setSendingFinal(true);
    setErr("");
    setOkMsg("");

    try {
      const latest = await api.get(`/pm/section8/cases/${caseItem.id}/`);
      const obj = latest.data;

      const missing = Array.isArray(obj?.packet_missing_keys) ? obj.packet_missing_keys : packetProgress(obj?.packet_items).missingKeys;
      const ready = !!obj?.packet_ready || missing.length === 0;
      const emailOk = !!String(obj?.caseworker_email || "").trim();

      if (!ready) {
        setErr(`Packet is not complete. Missing: ${missing.join(", ")}`);
        setSendingFinal(false);
        return;
      }
      if (!emailOk) {
        setErr("Agent email is required (Caseworker Email).");
        setSendingFinal(false);
        return;
      }

      const cc = String(cc_email || "").trim();
      const r = await api.post(`/pm/section8/cases/${caseItem.id}/send_packet/`, cc ? { cc_email: cc } : {});
      toastOk(`📩 Final packet sent to ${r?.data?.sent_to || obj.caseworker_email}`);
      onSaved?.(r?.data?.case || obj);
      onClose?.();
    } catch (e) {
      const d = e?.response?.data;
      const msg = d?.detail || (Array.isArray(d?.missing_keys) ? `Missing: ${d.missing_keys.join(", ")}` : null) || e?.message || "Failed to send final packet.";
      setErr(msg);
    } finally {
      setSendingFinal(false);
    }
  }

  // ✅ Update email (allowed even when incomplete) via send_update
  async function sendUpdateEmail() {
    if (!(mode === "edit" && caseItem?.id)) {
      setErr("Save the case first, then you can email an update.");
      return;
    }

    const emailOk = !!String(caseworker_email || "").trim();
    if (!emailOk) {
      setErr("Agent email is required (Caseworker Email).");
      return;
    }

    setSendingUpdate(true);
    setErr("");
    setOkMsg("");

    try {
      // light stamp inside notes (visible history)
      const stamp = new Date().toLocaleString();
      const nextNotes = (notes || "").trim() + (notes ? "\n\n" : "") + `[Update sent ${stamp}]`;

      setNotes(nextNotes);

      // save first (keeps meta packed too)
      const saved = await save({ closeAfter: false });
      if (!saved?.id) {
        setSendingUpdate(false);
        return;
      }

      const cc = String(cc_email || "").trim();
      const r = await api.post(`/pm/section8/cases/${saved.id}/send_update/`, cc ? { cc_email: cc } : {});
      toastOk(`📨 Update sent to ${r?.data?.sent_to || caseworker_email}`);
      onSaved?.(saved);
      onClose?.();
    } catch (e) {
      const d = e?.response?.data;
      const msg = d?.detail || e?.message || "Update email failed.";
      setErr(msg);
    } finally {
      setSendingUpdate(false);
    }
  }

  const agentOk = !!String(caseworker_email || "").trim();
  const canSendFinal = (prog.ready || packet_ready) && agentOk && mode === "edit" && !!caseItem?.id;

  if (!open) return null;

  return (
    <ModalShell
      title={mode === "edit" ? "🏠 Edit Section 8 Case" : "🏠 New Section 8 Case"}
      subtitle="Big buttons. Simple steps. Save anytime. Send Update anytime. Send Final only when ready."
      onClose={onClose}
    >
      {err ? (
        <div className="mb-3 text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-2xl p-3 whitespace-pre-wrap">{err}</div>
      ) : null}

      {okMsg ? (
        <div className="mb-3 text-sm text-emerald-200 bg-emerald-900/15 border border-emerald-700/30 rounded-2xl p-3">{okMsg}</div>
      ) : null}

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <TabButton active={tab === "details"} onClick={() => setTab("details")}>
          🧾 Details
        </TabButton>
        <TabButton active={tab === "packet"} onClick={() => setTab("packet")}>
          ✅ Packet
        </TabButton>
        <TabButton active={tab === "notes"} onClick={() => setTab("notes")}>
          📝 Notes
        </TabButton>
        <TabButton active={tab === "email"} onClick={() => setTab("email")}>
          ✉️ Email
        </TabButton>

        <div className="ml-auto flex items-center gap-2">
          <Button tone="slate" onClick={() => save({ closeAfter: false })} disabled={saving || sendingFinal || sendingUpdate}>
            💾 Save
          </Button>
          <Button tone="cyan" onClick={() => save({ closeAfter: true })} disabled={saving || sendingFinal || sendingUpdate}>
            ✅ Save & Close
          </Button>
        </div>
      </div>

      {/* DETAILS */}
      {tab === "details" ? (
        <>
          <div className="grid md:grid-cols-3 gap-3">
            <Field label="Property" hint="Search by name/address — scalable for big portfolios">
              <PropertySearchSelect value={property} onChange={(id) => setProperty(id)} />
            </Field>

            <Field label="Unit" hint="Shows units for selected property">
              <select className={inputCls(false)} value={unit} onChange={(e) => setUnit(e.target.value)}>
                <option value="">{property ? "Select unit…" : "Select property first…"}</option>
                {unitsForProperty.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Tenant" hint="Tenant on this voucher">
              <select className={inputCls(false)} value={tenant} onChange={(e) => setTenant(e.target.value)}>
                <option value="">Select tenant…</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {(t.first_name || "") + " " + (t.last_name || "")} {t.email ? `(${t.email})` : ""}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid md:grid-cols-2 gap-3 mt-3">
            <Field label="Status">
              <select className={inputCls(false)} value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUS_CHOICES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Inspection Status">
              <select className={inputCls(false)} value={inspection_status} onChange={(e) => setInspectionStatus(e.target.value)}>
                {INSPECTION_CHOICES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid md:grid-cols-2 gap-3 mt-3">
            <Field label="Housing Authority Name">
              <input className={inputCls(false)} value={housing_authority_name} onChange={(e) => setHousingAuthorityName(e.target.value)} />
            </Field>
            <Field label="Voucher Number">
              <input className={inputCls(false)} value={voucher_number} onChange={(e) => setVoucherNumber(e.target.value)} />
            </Field>
          </div>

          <div className="grid md:grid-cols-3 gap-3 mt-3">
            <Field label="Authority Phone">
              <input className={inputCls(false)} value={housing_authority_phone} onChange={(e) => setHousingAuthorityPhone(e.target.value)} />
            </Field>
            <Field label="Authority Email">
              <input className={inputCls(false)} value={housing_authority_email} onChange={(e) => setHousingAuthorityEmail(e.target.value)} />
            </Field>
            <Field label="HAP Contract #">
              <input className={inputCls(false)} value={hap_contract_number} onChange={(e) => setHapContractNumber(e.target.value)} />
            </Field>
          </div>

          <div className="grid md:grid-cols-3 gap-3 mt-3">
            <Field label="HAP Start Date">
              <input type="date" className={inputCls(false)} value={hap_start_date} onChange={(e) => setHapStartDate(e.target.value)} />
            </Field>
            <Field label="HAP End Date">
              <input type="date" className={inputCls(false)} value={hap_end_date} onChange={(e) => setHapEndDate(e.target.value)} />
            </Field>
            <Field label="Recert Due Date">
              <input type="date" className={inputCls(false)} value={recert_due_date} onChange={(e) => setRecertDueDate(e.target.value)} />
            </Field>
          </div>

          <div className="grid md:grid-cols-3 gap-3 mt-3">
            <Field label="Recert Submitted Date">
              <input type="date" className={inputCls(false)} value={recert_submitted_date} onChange={(e) => setRecertSubmittedDate(e.target.value)} />
            </Field>
            <Field label="Recert Approved Date">
              <input type="date" className={inputCls(false)} value={recert_approved_date} onChange={(e) => setRecertApprovedDate(e.target.value)} />
            </Field>
            <Field label="Inspection Scheduled Date">
              <input type="date" className={inputCls(false)} value={inspection_scheduled_date} onChange={(e) => setInspectionScheduledDate(e.target.value)} />
            </Field>
          </div>

          <div className="grid md:grid-cols-2 gap-3 mt-3">
            <Field label="Inspection Completed Date">
              <input type="date" className={inputCls(false)} value={inspection_completed_date} onChange={(e) => setInspectionCompletedDate(e.target.value)} />
            </Field>
            <Field label="Inspection Fail Reasons" hint="Only needed if Failed / Reinspection">
              <input className={inputCls(false)} value={inspection_fail_reasons} onChange={(e) => setInspectionFailReasons(e.target.value)} />
            </Field>
          </div>

          <div className="grid md:grid-cols-3 gap-3 mt-3">
            <Field label="Contract Rent ($)">
              <input className={inputCls(false)} value={contract_rent} onChange={(e) => setContractRent(e.target.value)} placeholder="1450.00" />
            </Field>
            <Field label="Tenant Portion ($)">
              <input className={inputCls(false)} value={tenant_portion} onChange={(e) => setTenantPortion(e.target.value)} placeholder="350.00" />
            </Field>
            <Field label="Subsidy Portion ($)">
              <input className={inputCls(false)} value={subsidy_portion} onChange={(e) => setSubsidyPortion(e.target.value)} placeholder="1100.00" />
            </Field>
          </div>
        </>
      ) : null}

      {/* PACKET */}
      {tab === "packet" ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="font-semibold text-slate-100">Packet Checklist</div>
                {prog.ready || packet_ready ? <TinyPill tone="emerald">READY ✅</TinyPill> : <TinyPill tone="amber">NOT READY</TinyPill>}
                {!agentOk ? <TinyPill tone="red">NO EMAIL</TinyPill> : <TinyPill tone="cyan">EMAIL OK</TinyPill>}
              </div>

              <div className="text-xs text-slate-400 mt-1">Tap boxes as docs arrive. Big/simple = less mistakes.</div>

              {prog.missingKeys.length > 0 ? (
                <div className="text-[11px] text-slate-500 mt-2">
                  Missing: <span className="text-slate-300">{prog.missingKeys.join(", ")}</span>
                </div>
              ) : (
                <div className="text-[11px] text-emerald-200 mt-2">All required documents are complete 🎉</div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="text-xs text-slate-400">
                Progress: <span className="text-slate-200 font-semibold">{prog.pct}%</span> ({prog.done}/{prog.total})
              </div>
              <Button tone="slate" onClick={() => setAllRequired(true)} disabled={saving || sendingFinal || sendingUpdate}>
                ✅ All
              </Button>
              <Button tone="slate" onClick={() => setAllRequired(false)} disabled={saving || sendingFinal || sendingUpdate}>
                🧹 Clear
              </Button>
            </div>
          </div>

          <div className="mt-3">
            <div className="h-2 w-full rounded-full bg-slate-900/60 border border-slate-800 overflow-hidden">
              <div className="h-full rounded-full bg-cyan-500/40" style={{ width: `${Math.max(0, Math.min(100, prog.pct))}%` }} />
            </div>
          </div>

          <div className="mt-3 grid md:grid-cols-2 gap-2">
            {REQUIRED_PACKET_ITEMS.map((it) => {
              const checked = !!normalizePacketItems(packet_items)[it.key];
              return (
                <label
                  key={it.key}
                  className={[
                    "flex items-center gap-3 rounded-xl border px-3 py-2 cursor-pointer select-none",
                    checked ? "border-emerald-700/40 bg-emerald-900/10" : "border-slate-800 bg-slate-950/20",
                  ].join(" ")}
                >
                  <input type="checkbox" checked={checked} onChange={() => togglePacketKey(it.key)} />
                  <span className={checked ? "text-slate-100 font-semibold" : "text-slate-200"}>{it.label}</span>
                  <span className="ml-auto text-[11px] text-slate-500">{checked ? "✅" : "⬜"}</span>
                </label>
              );
            })}
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="text-xs text-slate-400">Optional extras</div>
              <div className="flex items-center gap-2">
                <Button tone="slate" onClick={() => setAllOptional(true)} disabled={saving || sendingFinal || sendingUpdate}>
                  ✅ All
                </Button>
                <Button tone="slate" onClick={() => setAllOptional(false)} disabled={saving || sendingFinal || sendingUpdate}>
                  🧹 Clear
                </Button>
              </div>
            </div>

            <div className="mt-2 grid md:grid-cols-2 gap-2">
              {OPTIONAL_PACKET_ITEMS.map((it) => {
                const checked = !!normalizePacketItems(packet_items)[it.key];
                return (
                  <label
                    key={it.key}
                    className={[
                      "flex items-center gap-3 rounded-xl border px-3 py-2 cursor-pointer select-none",
                      checked ? "border-cyan-700/40 bg-cyan-900/10" : "border-slate-800 bg-slate-950/20",
                    ].join(" ")}
                  >
                    <input type="checkbox" checked={checked} onChange={() => togglePacketKey(it.key)} />
                    <span className={checked ? "text-slate-100 font-semibold" : "text-slate-200"}>{it.label}</span>
                    <span className="ml-auto text-[11px] text-slate-600">{checked ? "✅" : "⬜"}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 flex-wrap rounded-xl border border-slate-800 bg-slate-950/20 px-3 py-2">
            <div className="text-sm text-slate-200">
              Ready Override <span className="text-[11px] text-slate-500 ml-2">(auto-turns on when required complete)</span>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer select-none">
              <input type="checkbox" checked={!!packet_ready} onChange={(e) => setPacketReady(!!e.target.checked)} disabled={saving || sendingFinal || sendingUpdate} />
              Mark ready
            </label>
          </div>
        </div>
      ) : null}

      {/* NOTES */}
      {tab === "notes" ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <Field label="Notes" hint="Internal notes. (CC email is stored separately.)">
            <textarea
              className={textareaCls(saving || sendingFinal || sendingUpdate)}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What happened? What’s next?"
              disabled={saving || sendingFinal || sendingUpdate}
            />
          </Field>
        </div>
      ) : null}

      {/* EMAIL */}
      {tab === "email" ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="grid md:grid-cols-3 gap-3">
            <Field label="Agent Name">
              <input className={inputCls(false)} value={caseworker_name} onChange={(e) => setCaseworkerName(e.target.value)} />
            </Field>
            <Field label="Agent Phone">
              <input className={inputCls(false)} value={caseworker_phone} onChange={(e) => setCaseworkerPhone(e.target.value)} />
            </Field>
            <Field label="Agent Email" hint="Required to send anything">
              <input className={inputCls(false)} value={caseworker_email} onChange={(e) => setCaseworkerEmail(e.target.value)} />
            </Field>
          </div>

          <div className="grid md:grid-cols-2 gap-3 mt-3">
            <Field label="CC Email (optional)" hint="This is included in send_update/send_packet and also saved in hidden notes meta.">
              <input className={inputCls(false)} value={cc_email} onChange={(e) => setCcEmail(e.target.value)} placeholder="leasing@yourcompany.com" />
            </Field>

            <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
              <div className="text-xs text-slate-400">Send status</div>
              <div className="mt-1 text-sm text-slate-200">
                {agentOk ? <span className="text-cyan-200">Email ready ✅</span> : <span className="text-red-200">Add agent email ⛔</span>}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Final requires complete packet. Update can send anytime.
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2 flex-wrap">
            <Button
              tone="slate"
              onClick={sendUpdateEmail}
              disabled={!agentOk || saving || sendingFinal || sendingUpdate || !(mode === "edit" && caseItem?.id)}
              title={!(mode === "edit" && caseItem?.id) ? "Save the case first." : "Send an update email (allowed even if packet not ready)."}
            >
              {sendingUpdate ? "📨 Sending…" : "📨 Send Update"}
            </Button>

            <Button
              tone="cyan"
              onClick={sendFinalPacket}
              disabled={!canSendFinal || saving || sendingFinal || sendingUpdate}
              title={!canSendFinal ? "Complete packet + add agent email, then send final." : "Send final packet email."}
            >
              {sendingFinal ? "📩 Sending…" : "📩 Send Final"}
            </Button>
          </div>

          <div className="mt-2 text-[11px] text-slate-500">
            Update: <span className="text-slate-300">POST /pm/section8/cases/&lt;id&gt;/send_update/</span> • Final:{" "}
            <span className="text-slate-300">POST /pm/section8/cases/&lt;id&gt;/send_packet/</span>
          </div>
        </div>
      ) : null}

      {/* Bottom actions */}
      <div className="mt-4 flex items-center justify-between gap-2 flex-wrap">
        <div className="text-[11px] text-slate-500">Tip: Save often. It’s safe. ✅</div>
        <div className="flex items-center gap-2">
          <Button tone="slate" onClick={onClose} disabled={saving || sendingFinal || sendingUpdate}>
            Cancel
          </Button>
          <Button tone="cyan" onClick={() => save({ closeAfter: true })} disabled={saving || sendingFinal || sendingUpdate}>
            {saving ? "Saving…" : mode === "edit" ? "Save Changes" : "Create Case"}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
