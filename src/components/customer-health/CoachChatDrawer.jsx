// src/components/customer-health/CoachChatDrawer.jsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  addCoachProposalToPlanner,
  clearCoachPlanProposal,
  formatCoachPlanForDisplay,
  normalizeCoachChat,
  resetCoachChat,
  runLocalCoachTurn,
} from "./healthCoachChat";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function CoachAvatar() {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-300/10 text-sm font-black text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.18)]">
      AI
    </div>
  );
}

function UserAvatar() {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/30 bg-emerald-300/10 text-sm font-black text-emerald-100">
      ME
    </div>
  );
}

function EmptyPlanCard({ onOpenQuestionnaire }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
      <div className="text-sm font-black text-white">Coach Plan Builder</div>
      <p className="mt-2 text-sm leading-6 text-slate-300">
        Tell the coach your goal, training location, days this week, workout
        time, pain limits, and how hard you want to be pushed. The local smart
        coach will build your first plan without using a paid AI API.
      </p>

      <div className="mt-4 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
          Example: “I want chest, abs, and athletic strength.”
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
          Example: “Gym, 4 days, 45 minutes, push hard.”
        </div>
      </div>

      {onOpenQuestionnaire ? (
        <button
          type="button"
          onClick={onOpenQuestionnaire}
          className="mt-4 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white transition hover:bg-white/15"
        >
          Open Questionnaire
        </button>
      ) : null}
    </div>
  );
}

function PlanProposalCard({
  proposal,
  onAddToPlanner,
  onRedoPlan,
  onOpenQuestionnaire,
}) {
  const workouts = formatCoachPlanForDisplay(proposal);

  if (!proposal) return null;

  const alreadyAdded = proposal.status === "added_to_planner";

  return (
    <div className="rounded-[2rem] border border-emerald-300/20 bg-emerald-300/[0.06] p-4 shadow-[0_0_34px_rgba(16,185,129,0.12)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.24em] text-emerald-200">
            Plan Proposal
          </div>
          <h3 className="mt-2 text-lg font-black text-white">
            Ready for your weekly planner
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {proposal.summary}
          </p>
        </div>

        <div
          className={cx(
            "w-fit rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.18em]",
            alreadyAdded
              ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
              : "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
          )}
        >
          {alreadyAdded ? "Added" : "Proposed"}
        </div>
      </div>

      {proposal.coach_note ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm leading-6 text-slate-300">
          {proposal.coach_note}
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {workouts.map((workout) => (
          <div
            key={workout.id}
            className="rounded-3xl border border-white/10 bg-black/20 p-4"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                  {workout.day_label}
                </div>
                <div className="mt-1 text-sm font-black text-white">
                  {workout.title}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {workout.focus} • {workout.duration_minutes} min
                </div>
              </div>
            </div>

            <div className="mt-3 grid gap-2">
              {workout.exercises.slice(0, 7).map((exercise) => (
                <div
                  key={exercise.id}
                  className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="text-sm font-bold text-slate-100">
                    {exercise.name}
                  </div>
                  <div className="text-xs text-slate-400">
                    {exercise.sets} x {exercise.reps}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={onAddToPlanner}
          disabled={alreadyAdded}
          className={cx(
            "rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-[0.18em] transition",
            alreadyAdded
              ? "cursor-not-allowed border border-emerald-300/20 bg-emerald-300/10 text-emerald-100/70"
              : "border border-emerald-300/30 bg-emerald-300/15 text-emerald-100 hover:bg-emerald-300/20"
          )}
        >
          {alreadyAdded ? "Added to Planner" : "Add to Planner"}
        </button>

        <button
          type="button"
          onClick={onRedoPlan}
          className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-white/15"
        >
          Redo Plan
        </button>

        {onOpenQuestionnaire ? (
          <button
            type="button"
            onClick={onOpenQuestionnaire}
            className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-300/15"
          >
            Open Questionnaire
          </button>
        ) : null}
      </div>
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === "user";

  return (
    <div
      className={cx(
        "flex gap-3",
        isUser ? "justify-end pl-8" : "justify-start pr-8"
      )}
    >
      {!isUser ? <CoachAvatar /> : null}

      <div
        className={cx(
          "max-w-[88%] rounded-3xl border px-4 py-3 text-sm leading-6 shadow-xl",
          isUser
            ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-50"
            : "border-white/10 bg-white/[0.06] text-slate-100"
        )}
      >
        {message.content}
      </div>

      {isUser ? <UserAvatar /> : null}
    </div>
  );
}

export default function CoachChatDrawer({
  open,
  onClose,
  snapshot,
  setSnapshot,
  onOpenQuestionnaire,
}) {
  const [input, setInput] = useState("");
  const [localSnapshot, setLocalSnapshot] = useState(snapshot || {});
  const scrollRef = useRef(null);

  useEffect(() => {
    const safeSnapshot = snapshot || {};
    const chat = normalizeCoachChat(safeSnapshot);

    setLocalSnapshot({
      ...safeSnapshot,
      coach_chat: chat,
    });
  }, [snapshot, open]);

  useEffect(() => {
    if (!open) return;

    const node = scrollRef.current;
    if (!node) return;

    window.requestAnimationFrame(() => {
      node.scrollTop = node.scrollHeight;
    });
  }, [open, localSnapshot?.coach_chat?.length, localSnapshot?.coach_plan_proposal]);

  const chat = useMemo(
    () => normalizeCoachChat(localSnapshot || {}),
    [localSnapshot]
  );

  const proposal = localSnapshot?.coach_plan_proposal || null;

  function commitSnapshot(nextSnapshot) {
    setLocalSnapshot(nextSnapshot);

    if (typeof setSnapshot === "function") {
      setSnapshot(nextSnapshot);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();

    const clean = input.trim();
    if (!clean) return;

    const result = runLocalCoachTurn({
      snapshot: localSnapshot || {},
      userText: clean,
    });

    commitSnapshot(result.snapshot);
    setInput("");
  }

  function handleAddToPlanner() {
    const result = addCoachProposalToPlanner(localSnapshot || {}, proposal);

    if (result?.snapshot) {
      commitSnapshot(result.snapshot);
    }
  }

  function handleRedoPlan() {
    const nextSnapshot = clearCoachPlanProposal(localSnapshot || {});
    commitSnapshot(nextSnapshot);
    setInput("");
  }

  function handleResetChat() {
    const nextSnapshot = resetCoachChat(localSnapshot || {});
    commitSnapshot(nextSnapshot);
    setInput("");
  }

  function handleOpenQuestionnaire() {
    if (typeof onOpenQuestionnaire === "function") {
      onOpenQuestionnaire();
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-black/70 backdrop-blur-xl">
      <button
        type="button"
        aria-label="Close coach chat"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />

      <section className="relative z-[81] flex h-full w-full max-w-3xl flex-col border-l border-white/10 bg-[#06111f] shadow-[-30px_0_80px_rgba(0,0,0,0.45)]">
        <div className="border-b border-white/10 bg-white/[0.04] px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-black uppercase tracking-[0.28em] text-cyan-200">
                SyncWorks Health
              </div>
              <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">
                AI Fitness Coach
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Phase 7A local smart coach. It asks, builds, proposes, and adds
                your plan to the weekly planner.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-black text-white transition hover:bg-white/15"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={() =>
                setInput(
                  "I want a gym plan this week. My goal is fitness model strength with chest, abs, and athletic performance. I can train 4 days for 45 minutes. Push me hard but protect my hips."
                )
              }
              className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-left text-xs font-bold text-slate-200 transition hover:bg-white/10"
            >
              Fill example trainer request
            </button>

            <button
              type="button"
              onClick={handleResetChat}
              className="rounded-2xl border border-red-300/20 bg-red-300/10 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-300/15"
            >
              Reset Chat
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6"
        >
          {!proposal ? (
            <EmptyPlanCard onOpenQuestionnaire={handleOpenQuestionnaire} />
          ) : null}

          {chat.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {proposal ? (
            <PlanProposalCard
              proposal={proposal}
              onAddToPlanner={handleAddToPlanner}
              onRedoPlan={handleRedoPlan}
              onOpenQuestionnaire={handleOpenQuestionnaire}
            />
          ) : null}
        </div>

        <form
          onSubmit={handleSubmit}
          className="border-t border-white/10 bg-white/[0.04] p-4 sm:p-6"
        >
          <div className="rounded-[1.75rem] border border-white/10 bg-black/30 p-2">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={3}
              placeholder="Tell your coach your goal, location, days, time, pain limits, and whether to push hard or keep it balanced..."
              className="min-h-[88px] w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/40"
            />

            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs leading-5 text-slate-500">
                Local engine only. No paid AI API yet. Saves into Health
                snapshot cloud sync.
              </div>

              <button
                type="submit"
                className="rounded-2xl border border-cyan-300/30 bg-cyan-300/15 px-5 py-3 text-sm font-black uppercase tracking-[0.2em] text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.12)] transition hover:bg-cyan-300/20"
              >
                Send to Coach
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}