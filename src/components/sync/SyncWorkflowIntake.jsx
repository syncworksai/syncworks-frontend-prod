import React, { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, Building2, CheckCircle2, ClipboardList, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createSyncPmWorkOrder, getSyncAiErrorMessage, previewSyncWorkflow } from "../../api/syncAi";

const OPTIONS = [
  { id: "maintenance", name: "Property maintenance", icon: Building2, example: "Tenant reports a leaking kitchen sink." },
  { id: "service_booking", name: "Book a service", icon: ClipboardList, example: "I need a mobile notary tomorrow." },
  { id: "sales_lead", name: "Qualify a lead", icon: Sparkles, example: "A prospective client wants day-trading education." },
];

function availableFor(workspace, id) {
  if (id === "sales_lead") return workspace === "business";
  if (id === "maintenance") return workspace === "pm" || workspace === "personal";
  return true;
}

export default function SyncWorkflowIntake({ workspace = "personal", onNotice }) {
  const navigate = useNavigate();
  const [type, setType] = useState(workspace === "pm" ? "maintenance" : workspace === "business" ? "sales_lead" : "service_booking");
  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
  const [preview, setPreview] = useState(null);
  const [propertyId, setPropertyId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setType(workspace === "pm" ? "maintenance" : workspace === "business" ? "sales_lead" : "service_booking");
    setDescription("");
    setTitle("");
    setPreview(null);
    setPropertyId("");
    setConfirmed(false);
    setCreated(null);
    setError("");
  }, [workspace]);

  function changeType(next) {
    setType(next);
    setPreview(null);
    setCreated(null);
    setConfirmed(false);
    setError("");
    setDescription(OPTIONS.find((item) => item.id === next)?.example || "");
  }

  async function prepare() {
    setError("");
    setCreated(null);
    setConfirmed(false);
    setPreview(null);
    if (description.trim().length < 10) {
      setError("Describe the request in at least 10 characters.");
      return;
    }
    setBusy(true);
    try {
      const result = await previewSyncWorkflow({
        workspace,
        workflowType: type,
        description: description.trim(),
      });
      setPreview(result);
      setTitle(description.trim().slice(0, 100));
      setPropertyId(result.properties?.[0]?.id ? String(result.properties[0].id) : "");
      onNotice?.("Intake reviewed. No booking, lead or work order has been created yet.");
    } catch (exc) {
      setError(getSyncAiErrorMessage(exc));
    } finally {
      setBusy(false);
    }
  }

  async function createWorkOrder() {
    if (!preview?.can_create_pm_work_order || !propertyId || !confirmed || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await createSyncPmWorkOrder({
        pmWorkspaceId: preview.pm_workspace_id,
        propertyId,
        title: title.trim(),
        description: description.trim(),
        confirmed,
      });
      setCreated(result);
      onNotice?.("PM work order created in triage. No vendor was contacted and it was not published to the marketplace.");
    } catch (exc) {
      setError(getSyncAiErrorMessage(exc));
    } finally {
      setBusy(false);
    }
  }

  async function openExistingForm() {
    if (!preview?.route) return;
    try {
      await navigator.clipboard?.writeText(description.trim());
      onNotice?.("Request details copied. Paste them into the existing form to submit.");
    } catch {
      onNotice?.("Complete the existing form to submit the request.");
    }
    navigate(preview.route);
  }

  return (
    <section className="rounded-[2rem] border border-cyan-400/20 bg-slate-950/70 p-4 shadow-[0_0_44px_rgba(34,211,238,0.06)] sm:p-6" aria-label="Jarvis workflow intake">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-cyan-200" />
        <h2 className="text-lg font-black text-white">Jarvis · Smart intake</h2>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        Start a maintenance request, service booking, or lead. Jarvis checks the correct workflow first; nothing is dispatched, booked, or sent without confirmation.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {OPTIONS.filter((option) => availableFor(workspace, option.id)).map((option) => {
          const Icon = option.icon;
          return (
            <button key={option.id} type="button" onClick={() => changeType(option.id)}
              aria-pressed={type === option.id}
              className={`min-h-20 rounded-2xl border p-3 text-left transition ${type === option.id ? "border-cyan-400/50 bg-cyan-500/10 text-cyan-100" : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-600"}`}>
              <Icon className="h-5 w-5" />
              <div className="mt-2 text-xs font-black">{option.name}</div>
            </button>
          );
        })}
      </div>

      <label className="mt-5 block text-xs font-black uppercase tracking-[.12em] text-slate-400" htmlFor="jarvis-intake-description">
        Tell Jarvis what happened or what the customer needs
      </label>
      <textarea id="jarvis-intake-description" rows={3} maxLength={3000} value={description}
        onChange={(event) => { setDescription(event.target.value); setPreview(null); setCreated(null); setConfirmed(false); }}
        placeholder={OPTIONS.find((option) => option.id === type)?.example}
        className="mt-2 w-full resize-y rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400" />
      <button type="button" onClick={prepare} disabled={busy || description.trim().length < 10}
        className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 text-sm font-black text-white disabled:opacity-50">
        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Review next steps
      </button>

      {error ? <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p> : null}

      {preview ? (
        <div className="mt-5 rounded-3xl border border-slate-700 bg-slate-900/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong className="text-sm text-white">{preview.label} · Review</strong>
            <span className="text-[10px] font-black uppercase tracking-[.12em] text-amber-200">Not submitted</span>
          </div>
          {preview.safety_alert ? (
            <div role="alert" className="mt-3 flex gap-2 rounded-xl border border-rose-400/35 bg-rose-500/10 p-3 text-sm text-rose-100">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />{preview.safety_alert}
            </div>
          ) : null}
          {preview.priority_suggestion && type === "maintenance" ? (
            <p className="mt-3 text-xs text-slate-400">Suggested priority: <strong className="text-white">{preview.priority_suggestion}</strong>. A person must verify urgency.</p>
          ) : null}
          <div className="mt-4 text-xs font-black uppercase tracking-[.12em] text-slate-300">Clarify before proceeding</div>
          <ul className="mt-2 space-y-2 text-sm text-slate-300">
            {(preview.questions || []).map((question) => <li key={question}>• {question}</li>)}
          </ul>

          {preview.can_create_pm_work_order && !created ? (
            <div className="mt-4 space-y-3 border-t border-slate-700 pt-4">
              <label className="block text-xs font-black text-slate-300" htmlFor="jarvis-intake-property">Exact property</label>
              <select id="jarvis-intake-property" value={propertyId} onChange={(event) => { setPropertyId(event.target.value); setConfirmed(false); }}
                className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white">
                <option value="">Choose property</option>
                {(preview.properties || []).map((p) => <option key={p.id} value={String(p.id)}>{p.name} · {p.address}</option>)}
              </select>
              <label className="block text-xs font-black text-slate-300" htmlFor="jarvis-intake-title">Work-order title</label>
              <input id="jarvis-intake-title" maxLength={180} value={title}
                onChange={(event) => { setTitle(event.target.value); setConfirmed(false); }}
                className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white" />
              <label className="flex items-start gap-3 text-xs text-slate-300">
                <input type="checkbox" className="mt-1" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
                I checked the property, description, and urgency. Create an unassigned PM work order in triage; do not contact a vendor or publish it.
              </label>
              <button type="button" onClick={createWorkOrder}
                disabled={busy || !confirmed || !propertyId || title.trim().length < 5 || description.trim().length < 10}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white disabled:opacity-40">
                <ShieldCheck className="h-4 w-4" /> Confirm and create PM work order
              </button>
            </div>
          ) : null}

          {created ? (
            <div className="mt-4 rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3 text-sm text-emerald-100">
              <div className="flex items-center gap-2 font-black"><CheckCircle2 className="h-4 w-4" /> Work order #{created.id} created · {created.status}</div>
              <p className="mt-1 text-xs">Vendor dispatch and marketplace publication still require a separate decision.</p>
              <button type="button" className="mt-3 inline-flex items-center gap-2 underline" onClick={() => navigate(created.route || "/pm")}>
                Review work order <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          {!created && !preview.can_create_pm_work_order ? (
            <div className="mt-4 border-t border-slate-700 pt-4">
              <p className="mb-3 text-xs text-slate-400">
                This review does not save a lead or service request. Continue in the existing SyncWorks form; your description will be copied where supported.
              </p>
              <button type="button" onClick={openExistingForm}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 text-sm font-black text-cyan-100">
                Open existing form <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}
          {!created && type === "maintenance" && workspace === "pm" && !preview.can_create_pm_work_order ? (
            <p className="mt-2 text-xs text-amber-200">Add a property to this PM portfolio before creating an order.</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
