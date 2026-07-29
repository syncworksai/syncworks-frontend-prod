import React, { useState } from "react";
import api from "../../../api/client";

const INITIAL_FORM = {
  business_name: "",
  headline: "",
  situation: "",
  obstacle: "",
  solution: "",
  outcome: "",
  value: "treating people honestly and finding the solution that makes the most sense",
  thanks: "Thank you to everyone who trusts and supports our business.",
  closing: "Serving our community, one customer at a time.",
  call_to_action: "",
  hashtags: "CommunityFirst BehindTheScenes SmallBusiness",
  contains_customer_identity: false,
  customer_permission: false,
};

function Field({ label, value, onChange, placeholder, required = false, rows = 3 }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-300">
        {label}{required ? " *" : ""}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-500/60"
      />
    </label>
  );
}

export default function GrowthStoryGenerator({ variant = "sbo", onCreated }) {
  const isPlatform = variant === "platform";
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!form.situation.trim() || !form.solution.trim() || !form.outcome.trim()) {
      setError("Situation, solution, and outcome are required.");
      return;
    }

    if (form.contains_customer_identity && !form.customer_permission) {
      setError("Confirm customer permission or remove identifying information.");
      return;
    }

    setBusy(true);
    try {
      const response = await api.post("/platform-growth/growth/story-drafts/", form);
      setMessage(`Story draft created: ${response?.data?.title || "New story"}`);
      setForm(INITIAL_FORM);
      if (typeof onCreated === "function") onCreated(response?.data);
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "Failed to create story draft.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-5 rounded-3xl border border-fuchsia-500/25 bg-gradient-to-br from-fuchsia-500/10 via-slate-950/70 to-cyan-500/10 p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.22em] text-fuchsia-200">
            Story-to-Post Generator
          </div>
          <h3 className="mt-2 text-xl font-black text-white">
            Turn real business activity into human-centered content.
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
            Capture verified facts from a job, customer interaction, community moment, or business decision. SyncWorks creates a safe-mode draft for review—never a fabricated story.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="rounded-2xl border border-fuchsia-500/40 bg-fuchsia-500/15 px-4 py-2 text-xs font-black text-fuchsia-100 hover:bg-fuchsia-500/20"
        >
          {open ? "Close Story Capture" : isPlatform ? "Test Story Generator" : "Tell SYNC What Happened"}
        </button>
      </div>

      {message ? <div className="mt-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-200">{message}</div> : null}
      {error ? <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}

      {open ? (
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Business name" rows={1} value={form.business_name} onChange={(value) => update("business_name", value)} placeholder="Example: HIT Air" />
            <Field label="Optional headline" rows={1} value={form.headline} onChange={(value) => update("headline", value)} placeholder="Behind the Scenes at..." />
          </div>
          <div className="grid lg:grid-cols-2 gap-3">
            <Field required label="What happened?" value={form.situation} onChange={(value) => update("situation", value)} placeholder="Describe the real situation and who needed help." />
            <Field label="What made it difficult?" value={form.obstacle} onChange={(value) => update("obstacle", value)} placeholder="Explain the obstacle, limitation, or normal option." />
            <Field required label="What did the business do differently?" value={form.solution} onChange={(value) => update("solution", value)} placeholder="Describe the solution without exaggerating." />
            <Field required label="What was the outcome?" value={form.outcome} onChange={(value) => update("outcome", value)} placeholder="State the real result for the customer or community." />
            <Field label="Company value represented" value={form.value} onChange={(value) => update("value", value)} />
            <Field label="Thank-you message" value={form.thanks} onChange={(value) => update("thanks", value)} />
            <Field label="Call to action" value={form.call_to_action} onChange={(value) => update("call_to_action", value)} placeholder="Optional: message us, follow our progress, book a service..." />
            <Field label="Closing mission line" value={form.closing} onChange={(value) => update("closing", value)} />
          </div>
          <Field label="Hashtags" rows={2} value={form.hashtags} onChange={(value) => update("hashtags", value)} placeholder="CommunityFirst BehindTheScenes" />

          <div className="grid md:grid-cols-2 gap-3">
            <label className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">
              <input type="checkbox" checked={form.contains_customer_identity} onChange={(event) => update("contains_customer_identity", event.target.checked)} className="mt-0.5" />
              This story contains a customer name, face, address, or other identifying detail.
            </label>
            <label className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">
              <input type="checkbox" checked={form.customer_permission} onChange={(event) => update("customer_permission", event.target.checked)} className="mt-0.5" />
              The customer gave permission for those identifying details to be shared.
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3">
            <div className="text-xs text-amber-100">
              The draft remains inside SyncWorks until reviewed, scheduled, or connected publishing is enabled.
            </div>
            <button type="submit" disabled={busy} className="rounded-2xl border border-cyan-500/40 bg-cyan-500/15 px-5 py-2 text-xs font-black text-cyan-100 disabled:opacity-50">
              {busy ? "Creating Draft..." : "Create Story Draft"}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
