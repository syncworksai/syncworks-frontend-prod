import React, { useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardCopy,
  LoaderCircle,
  Mail,
  MessageSquareText,
  ShieldCheck,
  X,
} from "lucide-react";

import {
  getSyncAiErrorMessage,
  prepareSyncActionDraft,
} from "../../api/syncAi";

const ACTIONS = [
  {
    id: "ticket_reply",
    title: "Draft ticket reply",
    description: "Prepare an editable customer or provider reply.",
    icon: MessageSquareText,
    workspace: "any",
    placeholder:
      "Example: Thank them for the update and explain that we are reviewing the schedule.",
  },
  {
    id: "lead_follow_up",
    title: "Draft lead follow-up",
    description: "Prepare a warm follow-up with a clear next step.",
    icon: Mail,
    workspace: "business",
    placeholder:
      "Example: Follow up after the estimate and ask whether they want to schedule.",
  },
  {
    id: "schedule_proposal",
    title: "Draft schedule proposal",
    description: "Propose timing without changing the calendar.",
    icon: CalendarClock,
    workspace: "any",
    placeholder:
      "Example: Propose moving the appointment to Thursday afternoon pending confirmation.",
  },
];

export default function SyncActionStudio({
  workspace = "personal",
  disabled = false,
  onNotice,
}) {
  const availableActions = useMemo(
    () =>
      ACTIONS.filter(
        (action) => action.workspace === "any" || action.workspace === workspace
      ),
    [workspace]
  );

  const [selectedType, setSelectedType] = useState(availableActions[0]?.id || "");
  const [instruction, setInstruction] = useState("");
  const [draft, setDraft] = useState(null);
  const [preparing, setPreparing] = useState(false);

  const selected =
    availableActions.find((action) => action.id === selectedType) ||
    availableActions[0];

  async function prepareDraft() {
    const cleaned = String(instruction || "").trim();
    if (!cleaned || !selected || preparing) {
      onNotice?.("Describe what SYNC should include in the draft.");
      return;
    }

    setPreparing(true);
    onNotice?.(`SYNC is preparing a ${selected.title.toLowerCase()}...`);

    try {
      const result = await prepareSyncActionDraft({
        actionType: selected.id,
        instruction: cleaned,
        workspace,
      });
      setDraft(result);
      onNotice?.("Draft prepared for review. Nothing was sent or changed.");
    } catch (error) {
      onNotice?.(getSyncAiErrorMessage(error));
    } finally {
      setPreparing(false);
    }
  }

  async function copyDraft() {
    if (!draft?.draft) return;
    try {
      await navigator.clipboard.writeText(draft.draft);
      onNotice?.("Draft copied. Review it before using it.");
    } catch {
      onNotice?.("Copy was unavailable. Select the draft text manually.");
    }
  }

  return (
    <section className="rounded-[2rem] border border-violet-400/20 bg-slate-950/65 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-violet-200" />
            <h2 className="font-black text-white">SYNC Draft Studio</h2>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Prepare reviewable replies and proposals using the active {workspace} context.
            SYNC cannot send or apply them in this phase.
          </p>
        </div>
        <span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-amber-200">
          Review required
        </span>
      </div>

      <div className="mt-5 grid gap-2 md:grid-cols-3">
        {availableActions.map((action) => {
          const Icon = action.icon;
          const active = selected?.id === action.id;
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => {
                setSelectedType(action.id);
                setDraft(null);
              }}
              className={`rounded-2xl border p-4 text-left ${
                active
                  ? "border-violet-400/40 bg-violet-500/12"
                  : "border-slate-800 bg-slate-950/70"
              }`}
            >
              <Icon className="h-5 w-5 text-violet-200" />
              <div className="mt-3 text-sm font-black text-white">{action.title}</div>
              <div className="mt-1 text-xs leading-5 text-slate-400">
                {action.description}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-950/80 p-3">
        <textarea
          value={instruction}
          onChange={(event) => setInstruction(event.target.value)}
          rows={4}
          maxLength={3000}
          placeholder={selected?.placeholder || "Describe the draft you need."}
          className="w-full resize-none bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-slate-600"
        />
        <button
          type="button"
          onClick={prepareDraft}
          disabled={disabled || preparing}
          className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-500 px-5 text-sm font-black text-white disabled:opacity-45"
        >
          {preparing ? (
            <LoaderCircle className="h-5 w-5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-5 w-5" />
          )}
          {preparing ? "Preparing draft..." : "Prepare review draft"}
        </button>
      </div>

      {draft ? (
        <div className="fixed inset-0 z-[160] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] border border-violet-400/25 bg-slate-950 p-5 sm:rounded-[2rem] md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-200">
                  Prepared · not sent
                </div>
                <h3 className="mt-2 text-xl font-black text-white">
                  {draft.title || selected?.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-700 bg-slate-900 text-slate-300"
                aria-label="Close prepared draft"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 whitespace-pre-wrap rounded-3xl border border-slate-800 bg-slate-900/70 p-4 text-sm leading-7 text-slate-200">
              {draft.draft}
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              Review required. No message or schedule change was executed.
            </div>

            <button
              type="button"
              onClick={copyDraft}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-500 px-5 text-sm font-black text-white"
            >
              <ClipboardCopy className="h-5 w-5" />
              Copy editable draft
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
