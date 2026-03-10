// src/components/TicketWizard.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import CategoryPicker from "./CategoryPicker";

const LS_SMS_KEY = "sw_customer_sms_ok";

const TIME_WINDOWS = [
  { value: "", label: "—" },
  { value: "8-10", label: "8am – 10am" },
  { value: "10-12", label: "10am – 12pm" },
  { value: "12-2", label: "12pm – 2pm" },
  { value: "2-4", label: "2pm – 4pm" },
  { value: "4-6", label: "4pm – 6pm" },
  { value: "evening", label: "Evening" },
  { value: "asap", label: "ASAP" },
];

const PAYMENT_OPTIONS = [
  { value: "card_on_file", title: "Card on file (recommended)", desc: "You won’t be charged until the job is completed & invoiced." },
  { value: "cash", title: "Cash / pay in person", desc: "Pay the provider when the job is done." },
  { value: "pay_later", title: "Pay later", desc: "Provider will invoice you after completion." },
];

function clampInt(v, defVal, min, max) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return defVal;
  return Math.min(max, Math.max(min, n));
}

function readSmsConsentDefaultTrue() {
  try {
    const raw = localStorage.getItem(LS_SMS_KEY);
    if (raw === "1") return true;
    if (raw === "0") return false;
  } catch {
    // ignore
  }
  return true; // default ON
}

function formatNotes({ preferredDate, timeWindow, paymentPref, accessNotes, allowTexts }) {
  const parts = [];
  if (preferredDate) parts.push(`Preferred date: ${preferredDate}`);
  if (timeWindow) parts.push(`Time window: ${timeWindow}`);
  if (paymentPref) parts.push(`Payment: ${paymentPref}`);
  parts.push(`SMS OK: ${allowTexts ? "Yes" : "No"}`); // always include so provider sees it
  if (accessNotes) parts.push(`Notes: ${accessNotes}`);
  return parts.join("\n");
}

export default function TicketWizard({ defaultIsMarketplace = true, onCreated, className = "" }) {
  const [step, setStep] = useState(1);

  const [category, setCategory] = useState(null);

  const [title, setTitle] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [timeWindow, setTimeWindow] = useState("");

  const [serviceAddress, setServiceAddress] = useState("");
  const [serviceZip, setServiceZip] = useState("");
  const [radiusMiles, setRadiusMiles] = useState(25);

  const [accessNotes, setAccessNotes] = useState("");
  const [isMarketplace, setIsMarketplace] = useState(!!defaultIsMarketplace);

  const [paymentPref, setPaymentPref] = useState("card_on_file");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [created, setCreated] = useState(null);

  const categoryId = category?.id || "";

  const categoryLabel = useMemo(() => {
    if (!category) return "";
    return category?.category_path || category?.path || category?.name || "";
  }, [category]);

  useEffect(() => {
    setRadiusMiles((r) => clampInt(r, 25, 1, 200));
  }, []);

  function canGoNextFromStep1() {
    return !!categoryId;
  }

  function canGoNextFromStep2() {
    if (!title.trim()) return false;
    if (!serviceZip.trim()) return false;
    return true;
  }

  function paymentLabel(val) {
    const found = PAYMENT_OPTIONS.find((p) => p.value === val);
    return found?.title || val;
  }

  async function submit() {
    setErr("");
    setLoading(true);
    try {
      const allowTexts = readSmsConsentDefaultTrue();

      const notesBlock = formatNotes({
        preferredDate,
        timeWindow: TIME_WINDOWS.find((t) => t.value === timeWindow)?.label || "",
        paymentPref: paymentLabel(paymentPref),
        accessNotes,
        allowTexts,
      });

      const finalDesc = [accessNotes?.trim(), notesBlock?.trim()].filter(Boolean).join(accessNotes?.trim() ? "\n\n---\n" : "");

      const payload = {
        category: categoryId,
        title: title.trim(),
        description: (finalDesc || "").trim(),

        service_address: serviceAddress.trim(),
        service_zip: serviceZip.trim(),
        service_radius_miles: clampInt(radiusMiles, 25, 1, 200),

        is_marketplace: !!isMarketplace,
      };

      const res = await api.post("/service-requests/", payload);
      setCreated(res.data);
      setStep(4);
      onCreated?.(res.data);
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        (typeof e?.response?.data === "string" ? e.response.data : null) ||
        "Failed to create ticket.";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={"rounded-3xl border border-slate-800 bg-slate-950/60 p-5 " + className}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="text-lg font-semibold text-slate-100">New Ticket</div>
          <div className="text-xs text-slate-400">
            Step {step} of 4
            {categoryId ? (
              <span className="ml-2 text-slate-500">
                • Service Category ID mapped: <span className="font-mono text-slate-300">{categoryId}</span>
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">Marketplace</label>
          <button
            type="button"
            onClick={() => setIsMarketplace((v) => !v)}
            className={
              "rounded-xl px-3 py-2 text-xs border transition " +
              (isMarketplace
                ? "bg-cyan-500/15 border-cyan-500/40 text-slate-100"
                : "bg-slate-900/40 border-slate-800 text-slate-300 hover:bg-slate-900")
            }
            title="If enabled, eligible providers can see & accept this ticket."
          >
            {isMarketplace ? "On" : "Off"}
          </button>
        </div>
      </div>

      {err ? <div className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{err}</div> : null}

      {step === 1 ? (
        <div className="space-y-4">
          <div className="text-sm font-semibold text-slate-100">Choose a service</div>
          <CategoryPicker value={category} onChange={setCategory} />

          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={!canGoNextFromStep1()}
              onClick={() => setStep(2)}
              className={
                "rounded-2xl px-4 py-2 text-sm border transition " +
                (canGoNextFromStep1()
                  ? "bg-cyan-500/20 border-cyan-500/40 text-slate-100 hover:bg-cyan-500/30"
                  : "bg-slate-900/30 border-slate-800 text-slate-500 cursor-not-allowed")
              }
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <div>
            <div className="text-sm font-semibold text-slate-100">Details</div>
            <div className="text-xs text-slate-400">{categoryLabel || "—"}</div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-400">Short title (required)</label>
            <input
              className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-500/40"
              placeholder="Example: Kitchen sink leaking, airport ride, dog grooming..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Preferred date (optional)</label>
              <input
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-500/40"
                style={{ colorScheme: "dark" }}
              />
              <div className="text-[11px] text-slate-500">Calendar icon should now appear and be clickable.</div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-400">Time window (optional)</label>
              <select
                value={timeWindow}
                onChange={(e) => setTimeWindow(e.target.value)}
                className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-500/40"
              >
                {TIME_WINDOWS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-1">
              <label className="text-xs text-slate-400">Service address (optional)</label>
              <input
                className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-500/40"
                placeholder="123 Main St, Unit 4B"
                value={serviceAddress}
                onChange={(e) => setServiceAddress(e.target.value)}
              />
              <div className="text-[11px] text-slate-500">Home services: where the job is. Rides: optional here.</div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-400">
                ZIP <span className="text-rose-300">(required)</span>
              </label>
              <input
                className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-500/40 font-mono"
                placeholder="30318"
                value={serviceZip}
                onChange={(e) => setServiceZip(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-400">Radius (miles)</label>
              <input
                className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-500/40 font-mono"
                value={radiusMiles}
                onChange={(e) => setRadiusMiles(e.target.value)}
              />
              <div className="text-[11px] text-slate-500">Used to match providers regionally.</div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-400">Anything else the provider should know? (optional)</label>
            <textarea
              className="w-full min-h-[120px] rounded-2xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-500/40"
              placeholder="Access notes, parking, pets, gate code, special timing..."
              value={accessNotes}
              onChange={(e) => setAccessNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button type="button" onClick={() => setStep(1)} className="rounded-2xl px-4 py-2 text-sm border border-slate-800 bg-slate-900/40 text-slate-200 hover:bg-slate-900">
              Back
            </button>
            <button
              type="button"
              disabled={!canGoNextFromStep2()}
              onClick={() => setStep(3)}
              className={
                "rounded-2xl px-4 py-2 text-sm border transition " +
                (canGoNextFromStep2()
                  ? "bg-cyan-500/20 border-cyan-500/40 text-slate-100 hover:bg-cyan-500/30"
                  : "bg-slate-900/30 border-slate-800 text-slate-500 cursor-not-allowed")
              }
            >
              Review
            </button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <div>
            <div className="text-sm font-semibold text-slate-100">Review</div>
            <div className="text-xs text-slate-400">{categoryLabel || "—"}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
              <div className="text-xs text-slate-400 mb-1">Title</div>
              <div className="text-sm text-slate-100">{title || "—"}</div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <div className="text-xs text-slate-400 mb-1">Preferred date</div>
                  <div className="text-sm text-slate-100">{preferredDate || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Time window</div>
                  <div className="text-sm text-slate-100">{TIME_WINDOWS.find((t) => t.value === timeWindow)?.label || "—"}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <div className="text-xs text-slate-400 mb-1">ZIP</div>
                  <div className="text-sm text-slate-100 font-mono">{serviceZip || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Radius</div>
                  <div className="text-sm text-slate-100 font-mono">{clampInt(radiusMiles, 25, 1, 200)} mi</div>
                </div>
              </div>

              <div className="mt-3">
                <div className="text-xs text-slate-400 mb-1">Address</div>
                <div className="text-sm text-slate-100">{serviceAddress || "—"}</div>
              </div>

              <div className="mt-3">
                <div className="text-xs text-slate-400 mb-1">Text consent</div>
                <div className="text-sm text-slate-100">{readSmsConsentDefaultTrue() ? "Allowed" : "Not allowed"}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
              <div className="text-xs text-slate-400 mb-2">Payment preference</div>
              <div className="space-y-2">
                {PAYMENT_OPTIONS.map((p) => {
                  const active = paymentPref === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPaymentPref(p.value)}
                      className={
                        "w-full text-left rounded-2xl border p-3 transition " +
                        (active ? "border-cyan-500/40 bg-cyan-500/10" : "border-slate-800 bg-slate-950/40 hover:bg-slate-900/50")
                      }
                    >
                      <div className="text-sm font-semibold text-slate-100">{p.title}</div>
                      <div className="text-xs text-slate-400 mt-1">{p.desc}</div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 text-[11px] text-slate-500">
                MVP behavior: you are <span className="text-slate-300">not charged now</span>. Provider completes work, then invoices or collects payment.
              </div>

              <div className="mt-4">
                <div className="text-xs text-slate-400 mb-1">Notes visible to provider</div>
                <pre className="whitespace-pre-wrap text-[12px] text-slate-200 rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
{formatNotes({
  preferredDate,
  timeWindow: TIME_WINDOWS.find((t) => t.value === timeWindow)?.label || "",
  paymentPref: paymentLabel(paymentPref),
  accessNotes,
  allowTexts: readSmsConsentDefaultTrue(),
}) || "—"}
                </pre>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button type="button" onClick={() => setStep(2)} className="rounded-2xl px-4 py-2 text-sm border border-slate-800 bg-slate-900/40 text-slate-200 hover:bg-slate-900">
              Back
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={submit}
              className="rounded-2xl px-4 py-2 text-sm border border-cyan-500/40 bg-cyan-500/20 text-slate-100 hover:bg-cyan-500/30 disabled:opacity-60"
            >
              {loading ? "Creating…" : "Create Ticket"}
            </button>
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="space-y-3">
          <div className="text-sm font-semibold text-slate-100">Created</div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
            <div className="text-xs text-slate-400">Service Request</div>
            <div className="text-sm text-slate-100">
              #{created?.id} • Ticket #{created?.ticket_id} • Status: <span className="font-mono text-slate-200">{created?.ticket_status}</span>
            </div>
            <div className="text-xs text-slate-400 mt-2">Next: providers can see it (if Marketplace ON) and accept it.</div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => {
                setCreated(null);
                setTitle("");
                setPreferredDate("");
                setTimeWindow("");
                setServiceAddress("");
                setServiceZip("");
                setRadiusMiles(25);
                setAccessNotes("");
                setPaymentPref("card_on_file");
                setStep(1);
              }}
              className="rounded-2xl px-4 py-2 text-sm border border-slate-800 bg-slate-900/40 text-slate-200 hover:bg-slate-900"
            >
              Create another
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}