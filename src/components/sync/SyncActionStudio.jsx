import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardCopy,
  LoaderCircle,
  Mail,
  MessageSquareText,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";

import {
  executeSyncTicketReply,
  getSyncAiErrorMessage,
  listSyncReplyTickets,
  prepareSyncActionDraft,
} from "../../api/syncAi";

const ACTIONS = [
  {
    id: "ticket_reply",
    title: "Draft ticket reply",
    description: "Prepare, edit, confirm, and post to an exact ticket.",
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

function titleOf(ticket) {
  return (
    ticket?.work_title ||
    ticket?.title ||
    ticket?.service_request?.title ||
    ticket?.category_label ||
    `Ticket #${ticket?.id || "unknown"}`
  );
}

function codeOf(ticket) {
  return ticket?.ticket_code || `#${ticket?.id || "—"}`;
}

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
  const [editedDraft, setEditedDraft] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketId, setTicketId] = useState("");
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(null);

  const selected =
    availableActions.find((action) => action.id === selectedType) ||
    availableActions[0];

  useEffect(() => {
    if (!availableActions.some((action) => action.id === selectedType)) {
      setSelectedType(availableActions[0]?.id || "");
      setDraft(null);
      setPosted(null);
    }
  }, [availableActions, selectedType]);

  useEffect(() => {
    setTickets([]);
    setTicketId("");
    setConfirmChecked(false);
    setPosted(null);
  }, [workspace]);

  async function loadTickets() {
    if (ticketsLoading) return;
    setTicketsLoading(true);
    try {
      const rows = await listSyncReplyTickets();
      setTickets(rows);
      if (!rows.length) {
        onNotice?.("No visible active tickets are available for this workspace.");
      }
    } catch (error) {
      onNotice?.(getSyncAiErrorMessage(error));
    } finally {
      setTicketsLoading(false);
    }
  }

  async function prepareDraft() {
    const cleaned = String(instruction || "").trim();
    if (!cleaned || !selected || preparing) {
      onNotice?.("Describe what SYNC should include in the draft.");
      return;
    }

    setPreparing(true);
    setPosted(null);
    onNotice?.(`SYNC is preparing a ${selected.title.toLowerCase()}...`);

    try {
      const result = await prepareSyncActionDraft({
        actionType: selected.id,
        instruction: cleaned,
        workspace,
      });
      setDraft(result);
      setEditedDraft(result.draft || "");
      setConfirmChecked(false);
      setTicketId("");
      onNotice?.("Draft prepared for review. Nothing was sent or changed.");
      if (selected.id === "ticket_reply") {
        await loadTickets();
      }
    } catch (error) {
      onNotice?.(getSyncAiErrorMessage(error));
    } finally {
      setPreparing(false);
    }
  }

  async function copyDraft() {
    if (!editedDraft) return;
    try {
      await navigator.clipboard.writeText(editedDraft);
      onNotice?.("Draft copied. Review it before using it.");
    } catch {
      onNotice?.("Copy was unavailable. Select the draft text manually.");
    }
  }

  async function postTicketReply() {
    const cleaned = String(editedDraft || "").trim();
    if (!ticketId) {
      onNotice?.("Select the exact ticket that should receive this reply.");
      return;
    }
    if (!cleaned) {
      onNotice?.("The final reply cannot be empty.");
      return;
    }
    if (!confirmChecked) {
      onNotice?.("Confirm that the ticket and final reply are correct.");
      return;
    }

    setPosting(true);
    onNotice?.("Posting the confirmed reply to the selected ticket...");

    try {
      const result = await executeSyncTicketReply({
        ticketId,
        body: cleaned,
        workspace,
        confirmed: true,
      });
      setPosted(result);
      onNotice?.("Reply posted successfully and recorded in the ticket conversation.");
    } catch (error) {
      onNotice?.(getSyncAiErrorMessage(error));
    } finally {
      setPosting(false);
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
            Prepare reviewable content using the active {workspace} context. Ticket
            replies can be posted only after exact-ticket selection and final confirmation.
          </p>
        </div>
        <span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-amber-200">
          Confirmation required
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
                setPosted(null);
                setConfirmChecked(false);
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
          <div className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] border border-violet-400/25 bg-slate-950 p-5 sm:rounded-[2rem] md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-200">
                  {posted ? "Executed successfully" : "Prepared for review"}
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

            <label className="mt-5 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              Final editable text
            </label>
            <textarea
              value={editedDraft}
              onChange={(event) => {
                setEditedDraft(event.target.value);
                setConfirmChecked(false);
              }}
              rows={8}
              maxLength={6000}
              disabled={Boolean(posted)}
              className="mt-2 w-full resize-y rounded-3xl border border-slate-800 bg-slate-900/70 p-4 text-sm leading-7 text-slate-200 outline-none disabled:opacity-70"
            />

            {selected?.id === "ticket_reply" && !posted ? (
              <div className="mt-4 space-y-4 rounded-3xl border border-cyan-400/20 bg-cyan-500/8 p-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-[0.14em] text-cyan-200">
                    Exact destination ticket
                  </label>
                  <div className="mt-2 flex gap-2">
                    <select
                      value={ticketId}
                      onChange={(event) => {
                        setTicketId(event.target.value);
                        setConfirmChecked(false);
                      }}
                      className="min-h-12 flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-3 text-sm text-white"
                    >
                      <option value="">
                        {ticketsLoading
                          ? "Loading tickets..."
                          : "Select a ticket"}
                      </option>
                      {tickets.map((ticket) => (
                        <option key={ticket.id} value={ticket.id}>
                          {codeOf(ticket)} · {titleOf(ticket)} · {ticket.status || "OPEN"}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={loadTickets}
                      disabled={ticketsLoading}
                      className="min-h-12 rounded-2xl border border-slate-700 bg-slate-900 px-4 text-xs font-black text-slate-200 disabled:opacity-50"
                    >
                      Refresh
                    </button>
                  </div>
                </div>

                <label className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-500/8 p-3 text-sm leading-6 text-slate-300">
                  <input
                    type="checkbox"
                    checked={confirmChecked}
                    onChange={(event) => setConfirmChecked(event.target.checked)}
                    className="mt-1 h-4 w-4"
                  />
                  <span>
                    I reviewed the selected ticket and final message. Post this reply
                    to that ticket conversation now.
                  </span>
                </label>

                <button
                  type="button"
                  onClick={postTicketReply}
                  disabled={posting || !ticketId || !confirmChecked || !editedDraft.trim()}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 via-cyan-600 to-blue-600 px-5 text-sm font-black text-white disabled:opacity-45"
                >
                  {posting ? (
                    <LoaderCircle className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                  {posting ? "Posting confirmed reply..." : "Post confirmed ticket reply"}
                </button>
              </div>
            ) : null}

            {posted ? (
              <div className="mt-4 rounded-3xl border border-emerald-400/25 bg-emerald-500/10 p-4">
                <div className="flex items-center gap-2 font-black text-emerald-100">
                  <CheckCircle2 className="h-5 w-5" />
                  Reply posted
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-300">
                  Ticket #{posted.ticket_id} · Message #{posted.ticket_message_id}
                </div>
              </div>
            ) : null}

            {selected?.id !== "ticket_reply" ? (
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                This draft type remains copy-only. No external action is available.
              </div>
            ) : null}

            <button
              type="button"
              onClick={copyDraft}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-violet-400/30 bg-violet-500/12 px-5 text-sm font-black text-violet-100"
            >
              <ClipboardCopy className="h-5 w-5" />
              Copy final text
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
