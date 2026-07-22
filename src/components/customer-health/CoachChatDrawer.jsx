// src/components/customer-health/CoachChatDrawer.jsx

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { createHealthCoachTurn } from "../../api/customerHealth";

import {
  addCoachProposalToPlanner,
  clearCoachPlanProposal,
  formatCoachPlanForDisplay,
  normalizeCoachChat,
  resetCoachChat,
  runLocalCoachTurn,
} from "./healthCoachChat";
import {
  speakCoachText,
  stopCoachVoice,
} from "./healthCoachVoice";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function CoachAvatar() {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-300/10 text-[10px] font-black text-cyan-100">
      AI
    </div>
  );
}

function UserAvatar() {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-lime-300/30 bg-lime-300/10 text-[10px] font-black text-lime-100">
      ME
    </div>
  );
}

function SyncLaunchCard({
  snapshot,
  onStartWorkout,
  onBuildWorkout,
  onOpenNutrition,
  onOpenLog,
}) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? "Good morning"
      : hour < 18
      ? "Good afternoon"
      : "Good evening";

  const plannedName =
    snapshot?.workout ||
    snapshot?.next_session?.workout_name ||
    snapshot?.next_session_name ||
    "";

  const hasReadiness =
    Boolean(snapshot?.readiness) ||
    Boolean(snapshot?.last_daily_metric_update_at);

  return (
    <div className="rounded-[1.5rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.10),transparent_34%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,8,23,0.94))] p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
        SYNC Health
      </div>
      <h3 className="mt-1 text-xl font-black text-white">
        {greeting}. What are we doing today?
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">
        {plannedName
          ? `${plannedName} is ready. ${
              hasReadiness
                ? "Your latest check-in is available."
                : "We should check readiness and pain before starting."
            }`
          : "There is no active workout selected. I can build one, open nutrition, or help log todayÃ¢â‚¬â„¢s data."}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={plannedName ? onStartWorkout : onBuildWorkout}
          className="min-h-12 rounded-2xl border border-lime-300/30 bg-lime-300/12 px-3 text-xs font-black text-lime-100"
        >
          {plannedName ? "Start Workout" : "Build Workout"}
        </button>
        <button
          type="button"
          onClick={onOpenNutrition}
          className="min-h-12 rounded-2xl border border-fuchsia-300/25 bg-fuchsia-300/10 px-3 text-xs font-black text-fuchsia-100"
        >
          Log Nutrition
        </button>
        <button
          type="button"
          onClick={onOpenLog}
          className="min-h-11 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-3 text-xs font-black text-cyan-100"
        >
          Daily Check-In
        </button>
        <button
          type="button"
          onClick={onBuildWorkout}
          className="min-h-11 rounded-2xl border border-white/10 bg-white/[0.05] px-3 text-xs font-black text-white"
        >
          Quick Plan
        </button>
      </div>
    </div>
  );
}

function EmptyPlanCard({ onOpenQuestionnaire }) {
  return (
    <div className="rounded-[1.35rem] border border-cyan-300/15 bg-cyan-300/[0.05] p-3 sm:p-4">
      <div className="text-sm font-black text-white">
        Start with what you need today
      </div>

      <p className="mt-1 text-xs leading-5 text-slate-400 sm:text-sm sm:leading-6">
        Tell the coach your goal, location, available time,
        sore areas, pain limits, or what you want adjusted.
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-slate-300">
          "Build me a 30-minute gym workout that avoids chest."
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-slate-300">
          "I am home, low energy, and want abs plus mobility."
        </div>
      </div>

      {onOpenQuestionnaire ? (
        <button
          type="button"
          onClick={onOpenQuestionnaire}
          className="mt-3 h-10 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-xs font-black text-white"
        >
          Update Coach Profile
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

  const alreadyAdded =
    proposal.status === "added_to_planner";

  return (
    <div className="rounded-[1.5rem] border border-lime-300/20 bg-lime-300/[0.06] p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[9px] font-black uppercase tracking-[0.18em] text-lime-200">
            Coach Proposal
          </div>

          <h3 className="mt-1 text-base font-black text-white sm:text-lg">
            Ready for your planner
          </h3>

          <p className="mt-1 text-xs leading-5 text-slate-300 sm:text-sm sm:leading-6">
            {proposal.summary}
          </p>
        </div>

        <div
          className={cx(
            "shrink-0 rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em]",
            alreadyAdded
              ? "border-lime-300/30 bg-lime-300/10 text-lime-100"
              : "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
          )}
        >
          {alreadyAdded ? "Added" : "Proposed"}
        </div>
      </div>

      {proposal.coach_note ? (
        <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-slate-300">
          {proposal.coach_note}
        </div>
      ) : null}

      <div className="mt-3 space-y-2">
        {workouts.map((workout) => (
          <div
            key={workout.id}
            className="rounded-2xl border border-white/10 bg-black/20 p-3"
          >
            <div className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
              {workout.day_label}
            </div>

            <div className="mt-1 text-sm font-black text-white">
              {workout.title}
            </div>

            <div className="mt-1 text-[11px] text-slate-400">
              {workout.focus} | {workout.duration_minutes} min
            </div>

            <div className="mt-2 space-y-1.5">
              {workout.exercises
                .slice(0, 7)
                .map((exercise) => (
                  <div
                    key={exercise.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
                  >
                    <div className="min-w-0 truncate text-xs font-bold text-slate-100">
                      {exercise.name}
                    </div>

                    <div className="shrink-0 text-[10px] text-slate-400">
                      {exercise.sets} x {exercise.reps}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onAddToPlanner}
          disabled={alreadyAdded}
          className="h-11 rounded-xl border border-lime-300/30 bg-lime-300/15 px-3 text-xs font-black text-lime-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {alreadyAdded
            ? "Added to Planner"
            : "Add to Planner"}
        </button>

        <button
          type="button"
          onClick={onRedoPlan}
          className="h-11 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-xs font-black text-white"
        >
          Redo Plan
        </button>

        {onOpenQuestionnaire ? (
          <button
            type="button"
            onClick={onOpenQuestionnaire}
            className="col-span-2 h-10 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 text-xs font-black text-cyan-100"
          >
            Update Coach Profile
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
        "flex items-end gap-2",
        isUser
          ? "justify-end"
          : "justify-start"
      )}
    >
      {!isUser ? <CoachAvatar /> : null}

      <div
        className={cx(
          "min-w-0 max-w-[82%] whitespace-pre-wrap break-words rounded-2xl border px-3 py-2.5 text-sm leading-5 shadow-lg sm:max-w-[78%] sm:px-4 sm:py-3 sm:leading-6",
          isUser
            ? "rounded-br-md border-lime-300/20 bg-lime-300/10 text-lime-50"
            : "rounded-bl-md border-white/10 bg-white/[0.06] text-slate-100"
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
  onStartWorkout,
  onBuildWorkout,
  onOpenNutrition,
  onOpenLog,
  onOpenUpgrade,
}) {
  const [input, setInput] = useState("");
  const [localSnapshot, setLocalSnapshot] =
    useState(snapshot || {});
  const [headerExpanded, setHeaderExpanded] =
    useState(false);
  const [menuOpen, setMenuOpen] =
    useState(false);
  const [sending, setSending] =
    useState(false);
  const [providerNote, setProviderNote] =
    useState("");

  const scrollRef = useRef(null);
  const previousMessageCountRef = useRef(0);

  useEffect(() => {
    const safeSnapshot = snapshot || {};
    const chat = normalizeCoachChat(safeSnapshot);

    setLocalSnapshot({
      ...safeSnapshot,
      coach_chat: chat,
    });
  }, [snapshot, open]);

  const chat = useMemo(
    () => normalizeCoachChat(localSnapshot || {}),
    [localSnapshot]
  );

  const proposal =
    localSnapshot?.coach_plan_proposal || null;

  useEffect(() => {
    if (!open) return;

    const node = scrollRef.current;
    if (!node) return;

    const nextCount = chat.length;
    const previousCount =
      previousMessageCountRef.current;

    if (
      previousCount === 0 ||
      nextCount > previousCount
    ) {
      window.requestAnimationFrame(() => {
        node.scrollTop = node.scrollHeight;
      });
    }

    previousMessageCountRef.current =
      nextCount;
  }, [open, chat.length, proposal]);

  function replayDailyBriefing() {
    const text = String(initialBriefing || "").trim();
    if (!text || !audioEnabled) return;

    stopCoachVoice();

    speakCoachText({
      text,
      audioMode: "essential",
      voicePreference: "australian",
      rate: 0.96,
      pitch: 1,
      volume: 1,
      cancelFirst: true,
      eventType: "health_home_sync_replay",
      browserFallback: true,
    });
  }

  function toggleAudio() {
    const next = !audioEnabled;
    setAudioEnabled(next);

    try {
      window.localStorage.setItem(
        "sw_health_home_sync_audio_v1",
        next ? "on" : "off"
      );
    } catch {
      // Preference persistence is best effort.
    }

    if (!next) {
      stopCoachVoice();
    }
  }

  function jumpToLatest() {
    const node = scrollRef.current;
    if (!node) return;

    node.scrollTo({
      top: node.scrollHeight,
      behavior: "smooth",
    });
  }

  function commitSnapshot(nextSnapshot) {
    setLocalSnapshot(nextSnapshot);

    if (typeof setSnapshot === "function") {
      setSnapshot(nextSnapshot);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const clean = input.trim();
    if (!clean || sending) return;

    setSending(true);
    setProviderNote("");

    // Always run SyncWorks deterministic logic first. It remains the
    // validator for proposals, pain guardrails, and planner changes.
    const localResult = runLocalCoachTurn({
      snapshot: localSnapshot || {},
      userText: clean,
    });

    commitSnapshot(localResult.snapshot);
    setInput("");

    try {
      const ai = await createHealthCoachTurn({
        userText: clean,
        profile:
          localSnapshot?.profile ||
          localSnapshot?.health_profile ||
          {},
        snapshot: localSnapshot || {},
        history:
          localSnapshot?.history ||
          localSnapshot?.recent_history ||
          [],
      });

      const reply = String(ai?.reply || "").trim();

      if (reply) {
        const nextChat = normalizeCoachChat(
          localResult.snapshot || {}
        );

        const lastAssistantIndex = [...nextChat]
          .map((message) => message?.role)
          .lastIndexOf("assistant");

        if (lastAssistantIndex >= 0) {
          nextChat[lastAssistantIndex] = {
            ...nextChat[lastAssistantIndex],
            content: reply,
            provider: ai?.provider || "openai",
            model: ai?.model || "",
          };
        } else {
          nextChat.push({
            id: `coach-ai-${Date.now()}`,
            role: "assistant",
            content: reply,
            created_at: new Date().toISOString(),
            provider: ai?.provider || "openai",
            model: ai?.model || "",
          });
        }

        commitSnapshot({
          ...localResult.snapshot,
          coach_chat: nextChat,
          coach_last_provider:
            ai?.provider || "openai",
          coach_last_model: ai?.model || "",
        });

        if (audioEnabled) {
          speakCoachText({
            text: reply,
            audioMode: "essential",
            voicePreference: "australian",
            rate: 0.96,
            pitch: 1,
            volume: 1,
            cancelFirst: true,
            eventType: "health_home_sync_reply",
            browserFallback: true,
          });
        }

        setProviderNote("OpenAI response Ã‚Â· SyncWorks validated");
      }
    } catch (error) {
      if (error?.response?.status === 402) {
        setProviderNote(
          "Fitness + Nutrition AI is required for conversational coaching."
        );
        onOpenUpgrade?.();
      } else {
        setProviderNote(
          "OpenAI was unavailable. Local SyncWorks coaching was used."
        );
      }
    } finally {
      setSending(false);
    }
  }

  function handleAddToPlanner() {
    const result = addCoachProposalToPlanner(
      localSnapshot || {},
      proposal
    );

    if (result?.snapshot) {
      commitSnapshot(result.snapshot);
    }
  }

  function handleRedoPlan() {
    const nextSnapshot =
      clearCoachPlanProposal(
        localSnapshot || {}
      );

    commitSnapshot(nextSnapshot);
    setInput("");
  }

  function handleResetChat() {
    const nextSnapshot = resetCoachChat(
      localSnapshot || {}
    );

    commitSnapshot(nextSnapshot);
    setInput("");
    setMenuOpen(false);
  }

  function handleOpenQuestionnaire() {
    if (
      typeof onOpenQuestionnaire === "function"
    ) {
      onOpenQuestionnaire();
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[180] flex bg-black/80 backdrop-blur-xl">
      <button
        type="button"
        aria-label="Close coach chat"
        onClick={onClose}
        className="absolute inset-0"
      />

      <section className="relative z-[181] ml-auto flex h-[100dvh] w-full max-w-2xl flex-col overflow-hidden border-l border-white/10 bg-[#06111f] shadow-[-30px_0_80px_rgba(0,0,0,0.5)]">
        <header className="shrink-0 border-b border-white/10 bg-[#071421]/98 px-3 pb-3 pt-[calc(env(safe-area-inset-top)+0.7rem)] backdrop-blur-xl sm:px-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-3">
              <CoachAvatar />

              <div className="min-w-0">
                <div className="truncate text-base font-black text-white sm:text-lg">
                  SYNC Health Assistant
                </div>

                <div className="text-[10px] font-bold text-slate-400">
                  Voice-first daily coach | {chat.length} message
                  {chat.length === 1 ? "" : "s"}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={toggleAudio}
                className="h-9 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 text-[10px] font-black text-emerald-100"
              >
                {audioEnabled ? "Audio On" : "Audio Off"}
              </button>

              <button
                type="button"
                onClick={() =>
                  setHeaderExpanded(
                    (previous) => !previous
                  )
                }
                className="h-9 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-[10px] font-black text-slate-200"
              >
                {headerExpanded ? "Less" : "More"}
              </button>

              <div className="relative">
                <button
                  type="button"
                  aria-label="Coach chat options"
                  onClick={() =>
                    setMenuOpen(
                      (previous) => !previous
                    )
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-sm font-black text-white"
                >
                  ...
                </button>

                {menuOpen ? (
                  <div className="absolute right-0 top-11 z-20 w-44 rounded-2xl border border-white/10 bg-[#0b1728] p-2 shadow-2xl">
                    <button
                      type="button"
                      onClick={jumpToLatest}
                      className="h-10 w-full rounded-xl px-3 text-left text-xs font-black text-slate-100 hover:bg-white/[0.06]"
                    >
                      Jump to latest
                    </button>

                    <button
                      type="button"
                      onClick={handleResetChat}
                      className="h-10 w-full rounded-xl px-3 text-left text-xs font-black text-rose-200 hover:bg-rose-300/10"
                    >
                      Reset conversation
                    </button>
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="h-9 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-[10px] font-black text-white"
              >
                Close
              </button>
            </div>
          </div>

          {headerExpanded ? (
            <div className="mt-3 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.05] p-3">
              <p className="text-xs leading-5 text-slate-300">
                Ask for a workout, an adjustment, recovery
                guidance, exercise alternatives, or help
                understanding your logged data.
              </p>

              <button
                type="button"
                onClick={() =>
                  setInput(
                    "Build a workout for today using my recent training, soreness, readiness, location, and available time."
                  )
                }
                className="mt-2 h-9 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 text-[10px] font-black text-cyan-100"
              >
                Use Today Request
              </button>
            </div>
          ) : null}
        </header>

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-4 sm:space-y-4 sm:px-5"
        >
          <div className="rounded-[1.5rem] border border-emerald-300/20 bg-[linear-gradient(145deg,rgba(8,23,15,0.96),rgba(2,9,6,0.98))] p-4">

            <div className="flex items-start justify-between gap-3">

              <div className="min-w-0">

                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">

                  SYNC Daily Briefing

                </div>

                <div className="mt-2 text-sm leading-6 text-emerald-50">

                  {summaryExpanded

                    ? initialBriefing

                    : String(initialBriefing || "")

                        .split(".")

                        .slice(0, 2)

                        .join(".") + "."}

                </div>

              </div>

              <button

                type="button"

                onClick={replayDailyBriefing}

                disabled={!audioEnabled}

                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-300/10 text-lg disabled:opacity-35"

                aria-label="Replay daily briefing"

              >

                â–¶

              </button>

            </div>

            <button

              type="button"

              onClick={() =>

                setSummaryExpanded(

                  (previous) => !previous

                )

              }

              className="mt-3 h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] text-[10px] font-black uppercase tracking-[0.14em] text-white"

            >

              {summaryExpanded ? "Show Less" : "More"}

            </button>

          </div>



          <SyncLaunchCard

            snapshot={localSnapshot}
            onStartWorkout={onStartWorkout}
            onBuildWorkout={onBuildWorkout}
            onOpenNutrition={onOpenNutrition}
            onOpenLog={onOpenLog}
          />

          {!proposal && chat.length === 0 ? (
            <EmptyPlanCard
              onOpenQuestionnaire={
                handleOpenQuestionnaire
              }
            />
          ) : null}

          {chat.length > 0 ? (
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-xl border border-white/10 bg-[#06111f]/92 px-3 py-2 backdrop-blur-lg">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                Previous conversation
              </div>

              <button
                type="button"
                onClick={jumpToLatest}
                className="text-[10px] font-black text-cyan-200"
              >
                Latest
              </button>
            </div>
          ) : null}

          {chat.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
            />
          ))}

          {proposal ? (
            <PlanProposalCard
              proposal={proposal}
              onAddToPlanner={
                handleAddToPlanner
              }
              onRedoPlan={handleRedoPlan}
              onOpenQuestionnaire={
                handleOpenQuestionnaire
              }
            />
          ) : null}
        </div>

        <form
          onSubmit={handleSubmit}
          className="shrink-0 border-t border-white/10 bg-[#071421]/98 px-3 pb-[calc(env(safe-area-inset-bottom)+0.7rem)] pt-3 backdrop-blur-xl sm:px-5"
        >
          <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-black/30 p-2">
            <textarea
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              rows={1}
              placeholder="Ask your coach..."
              className="max-h-28 min-h-11 flex-1 resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-base leading-6 text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/40 sm:text-sm"
            />

            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="h-11 shrink-0 rounded-xl border border-cyan-300/30 bg-cyan-300/15 px-4 text-xs font-black text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sending ? "ThinkingÃ¢â‚¬Â¦" : "Send"}
            </button>
          </div>

          <div className="mt-2 text-center text-[9px] leading-4 text-slate-600">
            {providerNote ||
              "Conversation is saved with your Health profile."}
          </div>
        </form>
      </section>
    </div>
  );
}
