import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/client";

const COMPLETE_STATUSES = ["COMPLETED", "INVOICED", "PAID", "CLOSED"];

function upper(value) {
  return String(value || "").toUpperCase();
}

function providerName(ticket) {
  return (
    ticket?.assigned_business_name ||
    ticket?.assigned_business_card?.name ||
    ticket?.business_name ||
    ticket?.business?.name ||
    ticket?.assigned_business?.name ||
    "your provider"
  );
}

function storageKey(ticketId) {
  return `sw:ticket-completion-feedback:${ticketId}`;
}

function ratingLabel(value) {
  if (value === 5) return "Excellent";
  if (value === 4) return "Good";
  if (value === 3) return "Okay";
  if (value === 2) return "Needs improvement";
  if (value === 1) return "Poor";
  return "Select a rating";
}

export default function CustomerCompletionReviewCard({
  ticket,
  ticketId,
  onBookAgain,
  onOpenMessages,
  onCloseTicket,
  onAfterChange,
  closeBusy = false,
}) {
  const status = upper(ticket?.status);
  const visible = COMPLETE_STATUSES.includes(status);
  const provider = providerName(ticket);
  const alreadyClosed = status === "CLOSED";
  const paid = status === "PAID" || Boolean(ticket?.paid_at);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [issueMode, setIssueMode] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!ticketId) return;

    try {
      const saved = JSON.parse(localStorage.getItem(storageKey(ticketId)) || "null");
      if (saved) {
        setRating(Number(saved.rating || 0));
        setComment(String(saved.comment || ""));
        setIssueMode(Boolean(saved.issueMode));
        setSubmitted(Boolean(saved.submitted));
      }
    } catch {
      // Ignore malformed local completion feedback.
    }
  }, [ticketId]);

  useEffect(() => {
    if (!ticketId) return;

    try {
      localStorage.setItem(
        storageKey(ticketId),
        JSON.stringify({ rating, comment, issueMode, submitted })
      );
    } catch {
      // Local draft persistence is best-effort.
    }
  }, [ticketId, rating, comment, issueMode, submitted]);

  const helper = useMemo(() => {
    if (issueMode) {
      return "Describe what still needs attention. This will be added to the request conversation for the provider.";
    }
    if (rating >= 4) return "Great service deserves recognition. Add an optional note.";
    if (rating > 0) return "Tell the provider what could have made the experience better.";
    return "Rate the completed service and leave an optional note.";
  }, [issueMode, rating]);

  if (!visible) return null;

  async function submitFeedback() {
    if (!ticketId || busy) return;
    if (!issueMode && !rating) {
      setErr("Choose a rating before submitting feedback.");
      return;
    }
    if (issueMode && !comment.trim()) {
      setErr("Describe the issue before sending it.");
      return;
    }

    setErr("");
    setBusy(true);

    const heading = issueMode
      ? "Customer reported a service issue"
      : `Customer service feedback: ${rating}/5 (${ratingLabel(rating)})`;

    const message = [
      heading,
      comment.trim() ? `\n${comment.trim()}` : "",
      "\nSubmitted from the SyncWorks completion flow.",
    ]
      .filter(Boolean)
      .join("");

    try {
      await api.post("/ticket-messages/", {
        ticket: ticketId,
        body: message,
      });
      setSubmitted(true);
      if (typeof onAfterChange === "function") await onAfterChange();
    } catch (error) {
      setErr(error?.response?.data?.detail || "Could not submit your feedback.");
    } finally {
      setBusy(false);
    }
  }

  function startIssueReport() {
    setIssueMode(true);
    setSubmitted(false);
    setComment("");
    setErr("");
  }

  function resetFeedback() {
    setIssueMode(false);
    setSubmitted(false);
    setRating(0);
    setComment("");
    setErr("");
  }

  return (
    <section className="rounded-[2rem] border border-emerald-400/20 bg-slate-950/75 p-4 shadow-[0_0_44px_rgba(52,211,153,0.07)] lg:hidden">
      <div className="rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/15 via-slate-950/35 to-cyan-500/10 p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-emerald-300/25 bg-emerald-400/10 text-xl font-black text-emerald-100">
            ✓
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200">
              Service complete
            </div>
            <h2 className="mt-1 text-xl font-black text-white">
              How did {provider} do?
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Your feedback stays attached to this request and helps the provider follow up.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Work
            </div>
            <div className="mt-1 text-sm font-black text-white">Completed</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Payment
            </div>
            <div className="mt-1 text-sm font-black text-white">
              {paid ? "Paid" : "Invoice pending"}
            </div>
          </div>
        </div>
      </div>

      {submitted ? (
        <div className="mt-4 rounded-3xl border border-cyan-400/20 bg-cyan-400/[0.07] p-4">
          <div className="text-sm font-black text-cyan-100">
            {issueMode ? "Issue report sent" : "Feedback submitted"}
          </div>
          <div className="mt-1 text-xs leading-5 text-slate-400">
            {issueMode
              ? "Your note is now in the request conversation so the provider can respond."
              : "Your service feedback is saved with this request."}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onOpenMessages}
              className="min-h-11 rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-3 text-xs font-black text-cyan-100"
            >
              Open messages
            </button>
            <button
              type="button"
              onClick={resetFeedback}
              className="min-h-11 rounded-2xl border border-slate-700 bg-slate-950 px-3 text-xs font-black text-slate-300"
            >
              Add another note
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-3xl border border-slate-800 bg-[#020617] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-black text-white">
              {issueMode ? "Report a service issue" : "Rate your service"}
            </div>
            {issueMode ? (
              <button
                type="button"
                onClick={() => {
                  setIssueMode(false);
                  setComment("");
                  setErr("");
                }}
                className="rounded-xl border border-slate-700 px-3 py-2 text-[10px] font-bold text-slate-400"
              >
                Back to rating
              </button>
            ) : null}
          </div>

          {!issueMode ? (
            <>
              <div className="mt-4 flex items-center justify-between gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setRating(value);
                      setErr("");
                    }}
                    className={[
                      "grid h-12 w-12 place-items-center rounded-2xl border text-2xl transition",
                      value <= rating
                        ? "border-amber-300/35 bg-amber-400/15 text-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.12)]"
                        : "border-slate-700 bg-slate-950 text-slate-600",
                    ].join(" ")}
                    aria-label={`${value} star${value === 1 ? "" : "s"}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <div className="mt-2 text-center text-xs font-bold text-slate-400">
                {ratingLabel(rating)}
              </div>
            </>
          ) : null}

          <p className="mt-4 text-xs leading-5 text-slate-500">{helper}</p>

          <textarea
            rows={4}
            value={comment}
            onChange={(event) => {
              setComment(event.target.value.slice(0, 1000));
              setErr("");
            }}
            placeholder={
              issueMode
                ? "What still needs attention?"
                : "Share an optional note about the service…"
            }
            className="mt-3 w-full resize-none rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40"
          />

          <div className="mt-2 text-right text-[10px] text-slate-600">
            {comment.length}/1000
          </div>

          {err ? (
            <div className="mt-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
              {err}
            </div>
          ) : null}

          <button
            type="button"
            onClick={submitFeedback}
            disabled={busy}
            className={[
              "mt-3 min-h-[52px] w-full rounded-2xl border px-4 text-sm font-black text-white disabled:opacity-50",
              issueMode
                ? "border-rose-300/30 bg-gradient-to-r from-rose-500 to-orange-500"
                : "border-cyan-300/30 bg-gradient-to-r from-cyan-500 to-blue-600",
            ].join(" ")}
          >
            {busy
              ? "Sending…"
              : issueMode
              ? "Send issue report"
              : "Submit service feedback"}
          </button>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onBookAgain}
          className="min-h-[52px] rounded-2xl border border-violet-400/25 bg-violet-400/10 px-3 text-xs font-black text-violet-100"
        >
          Book again
        </button>
        <button
          type="button"
          onClick={startIssueReport}
          className="min-h-[52px] rounded-2xl border border-rose-400/20 bg-rose-400/10 px-3 text-xs font-black text-rose-100"
        >
          Report issue
        </button>
      </div>

      {!alreadyClosed ? (
        <button
          type="button"
          onClick={onCloseTicket}
          disabled={closeBusy}
          className="mt-2 min-h-12 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 text-xs font-black text-slate-300 disabled:opacity-50"
        >
          {closeBusy ? "Closing request…" : "Close this request"}
        </button>
      ) : (
        <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-3 text-center text-xs font-bold text-slate-500">
          This request is closed.
        </div>
      )}
    </section>
  );
}
