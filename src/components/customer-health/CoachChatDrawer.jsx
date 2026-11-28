// src/components/customer-health/CoachChatDrawer.jsx

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Volume2, VolumeX, Ellipsis, X, Send, LoaderCircle } from "lucide-react";
import { createHealthCoachTurn, patchCustomerHealthProfile } from "../../api/customerHealth";

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
  return <img src="/jarvis-avatars/sarahgym1.png" alt="" className="syncfit-chat-avatar h-8 w-8 shrink-0 rounded-full object-cover object-top" />;
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
        Tell SYNC your goal, location, available time,
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
          Build Your Profile
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
            SYNC Plan Proposal
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
            Build Your Profile
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
  history = [],
  open,
  onClose,
  snapshot,
  setSnapshot,
  profile,
  initialBriefing = "",
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
  const [audioEnabled, setAudioEnabled] =
    useState(() => {
      try {
        return (
          window.localStorage.getItem(
            "sw_health_home_sync_audio_v1"
          ) !== "off"
        );
      } catch {
        return true;
      }
    });
  const [summaryExpanded, setSummaryExpanded] =
    useState(false);

  const [audioLoading,setAudioLoading] = useState(false);
  const [showPlan,setShowPlan] = useState(false);
  useEffect(()=>{if(open){setShowPlan(false);setMenuOpen(false);}},[open]);
  const scrollRef = useRef(null);
  useEffect(()=>{const listener=e=>setAudioLoading(e.detail==="loading");window.addEventListener("syncfit:audio-state",listener);return()=>window.removeEventListener("syncfit:audio-state",listener);},[]);
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
      rate: 0.92,
      energy: "controlled",
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
      history,
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
        history: Array.isArray(history) ? history : [],
      });

      const reply = String(ai?.reply || "").trim();

      if (reply) {
        const nextChat = normalizeCoachChat(
          localResult.snapshot || {}
        );

        const lastAssistantIndex = [...nextChat]
          .map((message) => message?.role)
          .findLastIndex(role => role === "assistant" || role === "coach");

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
            rate: 0.92,
            pitch: 1,
            volume: 1,
            cancelFirst: true,
            eventType: "health_home_sync_reply",
            browserFallback: true,
          });
        }

        setProviderNote("OpenAI response Ã‚Â· SyncWorks validated");
      } else {
        setProviderNote("Conversational coach returned no answer. Showing local guidance.");
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

  async function handleAddToPlanner() {
    if (sending || !proposal || proposal.status === "added_to_planner") return;
    const result=addCoachProposalToPlanner(localSnapshot || {},proposal);
    if(!result.added){setProviderNote(result.message);return;}
    setSending(true);
    try{
      const saved=await patchCustomerHealthProfile({snapshot_json:result.snapshot});
      const receipt=saved?.execution_receipt;
      const persisted=saved?.snapshot_json;
      const ids=result.plannedIds||[];
      const actual=new Set((Array.isArray(persisted?.week_plan)?persisted.week_plan:[]).map(w=>w.id));
      const verified=new Set(receipt?.verified_workout_ids||[]);
      if(!ids.every(id=>actual.has(id))) {setProviderNote("Plan persistence was not verified. Reopen planner before retrying.");return;}
      const ok=receipt?.saved===true && ids.every(id=>verified.has(id));
      commitSnapshot({...persisted,coach_plan_proposal:{...proposal,status:ok?"added_to_planner":"approved_pending_verification"},coach_chat:[...normalizeCoachChat(persisted),{id:"execution-"+Date.now(),role:"coach",content:ok?"Saved and verified "+ids.length+" workouts in your SyncWorks Calendar. Nutrition scheduling is not included in this action.":"Workout plan saved, but calendar synchronization is not verified. Check your planner before retrying.",created_at:new Date().toISOString()}]});
      setShowPlan(false);
      setProviderNote(ok?"Calendar verified":"Calendar verification pending");
    }catch{setProviderNote("Could not verify the save. Check your planner before retrying.");}
    finally{setSending(false);}
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
    <div className="syncfit-coach-drawer sf-chat-overlay">
      <button
        type="button"
        aria-label="Close coach chat"
        onClick={onClose}
        className="sf-chat-backdrop"
      />

      <div className="sf-chat-sheet" role="dialog" aria-modal="true" aria-label="SYNCFIT personal trainer">
        <div className="sf-chat-top">
          <div className="sf-chat-bar">
            <div className="sf-chat-person">
              <CoachAvatar />

              <div className="sf-chat-name">
                <div className="sf-chat-title">
                  SYNCFIT
                </div>

                <div className="sf-chat-subtitle">
                  Trainer & nutrition coach
                </div>
              </div>
            </div>

            <div className="sf-chat-actions">
              <button type="button" onClick={toggleAudio} aria-label={audioEnabled?"Mute coach":"Enable coach audio"} aria-pressed={audioEnabled}>{audioEnabled?<Volume2 size={19}/>:<VolumeX size={19}/>}</button>
              <button type="button" onClick={()=>setMenuOpen(v=>!v)} aria-label="Coach options"><Ellipsis size={20}/></button>
              <button type="button" onClick={onClose} aria-label="Close coach"><X size={20}/></button>
            </div>
          </div>
          {menuOpen && <div className="syncfit-coach-options">
            <button type="button" onClick={()=>{setMenuOpen(false);replayDailyBriefing();}}>Play briefing</button>
            <button type="button" onClick={()=>{setMenuOpen(false);onBuildWorkout?.();}}>Workout plan</button>
            <button type="button" onClick={()=>{setMenuOpen(false);onOpenNutrition?.();}}>Nutrition</button>
            <button type="button" onClick={()=>{setShowPlan(v=>!v);setMenuOpen(false);}}>{showPlan?"Back to chat":"View saved plan"}</button>
            <button type="button" onClick={()=>{setMenuOpen(false);jumpToLatest();}}>Latest message</button>
            <button type="button" onClick={()=>{if(window.confirm("Reset this conversation?"))handleResetChat();}}>Reset conversation</button>
          </div>}
        </div>

        <div
          ref={scrollRef}
          className="sf-chat-messages space-y-3"
        >
          {!chat.length && <div className="syncfit-coach-welcome">Ready when you are. Ask me about your workout, technique or recovery.</div>}
          {proposal && <button type="button" className="syncfit-coach-plan-link" onClick={()=>setShowPlan(v=>!v)}>{showPlan?"Hide workout plan":"View workout plan"}</button>}
          {!showPlan && chat.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
            />
          ))}

          {showPlan && proposal ? (
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
          className="sf-chat-composer"
        >
          <div className="sf-chat-input-row">
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
              aria-label="Send message" className="h-11 shrink-0 rounded-xl border border-cyan-300/30 bg-cyan-300/15 px-4 text-xs font-black text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sending ? <LoaderCircle className="animate-spin" size={18}/> : <Send size={18}/>}
            </button>
          </div>

          <div className="sf-chat-status">
            {audioLoading ? <span role="status" className="syncfit-audio-loading"><LoaderCircle size={14} className="animate-spin"/> Loading audio…</span> : sending ? "Thinking…" : providerNote ||
              ""}
          </div>
        </form>
      </div>
    </div>
  );
}
