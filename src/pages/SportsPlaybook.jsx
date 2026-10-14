import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  List,
  Lock,
  Share2,
  X,
} from "lucide-react";

import THE_WAY_WE_PLAY_COVER from "../assets/theWayWePlayCover";

const pages = [
  {
    section: "Opening",
    title: "How do you want to be remembered?",
    kicker: "Before the score. Before the stats. Before the lineup.",
    paragraphs: [
      "How do you want to be remembered as a player? Were you prepared? Dependable? Did you understand the game? Did your teammates trust you? Did you make the players around you better?",
      "Now ask the same question about the team. We want to be prepared, connected, unselfish, difficult to beat, and steady when the game gets hard.",
      "Winning matters. We play to win. But winning is the result of repeatedly doing the things winning requires.",
    ],
    quote: "Play to your vision, not your circumstance.",
  },
  {
    section: "Foundation",
    title: "Trust",
    kicker: "You are not playing alone.",
    paragraphs: [
      "Trust yourself. Trust your preparation. Trust your ability. Then trust the guy behind you.",
      "When you trust the next player to do his part, you become free to completely focus on yours. You do not have to force four runs out of one swing or become the hero of every inning.",
    ],
    quote: "Trust yourself. Trust the guy behind you.",
  },
  {
    section: "Foundation",
    title: "Execution",
    kicker: "Execution starts before contact.",
    paragraphs: [
      "Execution means understanding what the team needs, knowing your part before the play begins, and intentionally doing it to the fullest of your ability.",
      "The result will not always be perfect. The decision, preparation, and intent still belong to us.",
    ],
    quote: "What does the team need from me right now, in this situation, on this pitch?",
  },
  {
    section: "Foundation",
    title: "Accountability",
    kicker: "We do not hide behind results.",
    paragraphs: [
      "A hit does not automatically mean you executed well. An out does not automatically mean you executed poorly.",
      "We ask: What did the situation require? What was my part? Did I execute it? A great player can hit a line drive for an out and still recognize, 'I could have executed that situation better.'",
      "That is not negativity. That is ownership. Learn from it, then reset.",
    ],
  },
  {
    section: "The Standard",
    title: "Vision over circumstance",
    kicker: "Circumstances change. The standard does not.",
    bullets: [
      "0-for-3 or 3-for-3",
      "Down seven or up ten",
      "Coming off an error or a great play",
      "Bad call, bad hop, bad pitch, bad break",
    ],
    paragraphs: [
      "None of those circumstances determine who you are on the next pitch. Your vision of the player and teammate you want to become does.",
    ],
    quote: "The situation can change. The standard doesn't.",
  },
  {
    section: "The Standard",
    title: "The question",
    kicker: "When the game gets complicated, simplify it.",
    paragraphs: [
      "Before every meaningful decision, come back to one question. It applies at the plate, on the bases, in the field, and on the mound.",
    ],
    quote: "What does the team need from me right now, in this situation, on this pitch?",
    footer: "Answer it. Do your part. Trust the next man.",
  },
  {
    section: "The Standard",
    title: "Know the situation",
    kicker: "Think before the ball is put in play.",
    columns: [
      {
        title: "On offense",
        items: ["How many outs?", "Where are the runners?", "Is there a double-play risk?", "What type of at-bat helps us most?", "What does the team need from me?"],
      },
      {
        title: "On defense",
        items: ["How many outs?", "Where are the runners?", "Where is my first play?", "What is my second option?", "Who am I covering or backing up?"],
      },
    ],
    quote: "Prepare before the pitch. React after contact.",
  },
  {
    section: "The Standard",
    title: "Do your part",
    kicker: "Nobody has to do everything. Everybody has to do something.",
    paragraphs: [
      "Sometimes your part is driving in two runs. Sometimes it is moving a runner. Sometimes it is keeping the inning alive. Sometimes it is taking the sure out. Sometimes it is backing up a throw nobody expects to get away.",
      "Your part changes with the situation. Your responsibility to recognize and execute it does not.",
    ],
  },
  {
    section: "Offense",
    title: "Trust the player behind you",
    kicker: "A lineup is connected, not ten independent at-bats.",
    paragraphs: [
      "Do not try to do the next hitter's part too. Improve the situation, pass the opportunity forward, and trust him to execute.",
      "Trust removes hero ball. It lets us attack the correct objective instead of forcing the biggest possible result on every swing.",
    ],
  },
  {
    section: "Offense",
    title: "Three kinds of at-bats",
    kicker: "We evaluate the situation, not just the box score.",
    cards: [
      ["Successful", "You accomplished what the situation called for."],
      ["Quality", "You improved the team's position, even if the ideal result did not happen."],
      ["Poor", "You failed to recognize or execute what the situation required."],
    ],
    quote: "The goal is not simply to get a hit. The goal is to help the team score.",
  },
  {
    section: "Offense",
    title: "Successful at-bat",
    kicker: "The situation's objective was accomplished.",
    bullets: [
      "Runner on first: advance him two bases or better when the play allows it.",
      "Runner on second: drive him home.",
      "Runner on third: bring the run in.",
      "Bases loaded: produce runs while protecting the inning.",
      "Bases empty: reach safely or put yourself into scoring position.",
    ],
    paragraphs: ["Success is situational. The exact job changes; the requirement to understand it does not."],
  },
  {
    section: "Offense",
    title: "Quality at-bat",
    kicker: "The team is better off after your at-bat than before it.",
    bullets: [
      "Move a runner from second to third.",
      "Score a runner with a sacrifice fly.",
      "Avoid the double play and keep the inning moving.",
      "Force the defense to make a difficult play.",
      "Fight through the at-bat and give the next hitter an opportunity.",
    ],
    quote: "At minimum, improve the situation.",
  },
  {
    section: "Offense",
    title: "Poor at-bat",
    kicker: "Making an out is not automatically poor. Ignoring the situation can be.",
    bullets: [
      "Rolling into an avoidable double play.",
      "Failing to advance a runner when the situation clearly required it.",
      "Swinging at a pitch you could not execute with when better opportunities were available.",
      "Trying to do too much instead of trusting the next hitter.",
      "Giving away an opportunity because you did not understand the situation.",
    ],
    quote: "Hitting it hard matters. Driving the run in when the team needs the run matters more.",
  },
  {
    section: "Offense",
    title: "Two bases for his one",
    kicker: "Runner advancement is part of the hitter's responsibility.",
    paragraphs: [
      "When a runner is on base, our intent is to make his advancement greater than ours whenever the situation allows it.",
    ],
    cards: [
      ["Runner on 1st", "If the hitter earns one, we want the runner reaching third."],
      ["Runner on 2nd", "If the hitter earns one, we want the runner scoring."],
    ],
    footer: "This is intentional offense, not reckless baserunning.",
  },
  {
    section: "Offense",
    title: "The first two strikes are opportunities",
    kicker: "Your early swings should have a purpose.",
    paragraphs: [
      "The first two strikes give you opportunities to fully execute the original plan. If you get a pitch you can execute with, attack it with purpose.",
      "A called strike removes one opportunity. That does not create panic; it creates awareness. As the count changes, your responsibility may change with it.",
    ],
    quote: "If you choose to swing early, make the swing count.",
  },
  {
    section: "Offense",
    title: "Pass the torch",
    kicker: "The original plan is not always available.",
    paragraphs: [
      "Bad pitches happen. Bad calls happen. Good pitchers make good pitches. When the situation changes, adjust.",
      "If you can no longer completely accomplish the original objective, protect the inning, put a quality ball in play, avoid creating multiple outs, and give the next man his opportunity.",
    ],
    quote: "Recognize it. Adjust. Pass the torch.",
  },
  {
    section: "Offense",
    title: "Protect our outs",
    kicker: "Outs are opportunities we cannot get back.",
    paragraphs: [
      "A double play costs more than two marks on the scoreboard. It removes the hitter's opportunity, the runner's opportunity, and often takes another hitter's opportunity out of the inning.",
      "We will not become afraid of ground balls. We will become aware of double-play situations and adjust our approach with intent.",
    ],
    quote: "Do not turn one opportunity into two outs.",
  },
  {
    section: "Defense",
    title: "Want the ball",
    kicker: "Prepare every pitch as if it is coming to you.",
    paragraphs: [
      "See the play before it happens. Know where you are going, where the runners are, where the first out is, and what the second play may become.",
      "Wanting the ball is not bravado. It is mental preparation that shortens reaction time when the play arrives.",
    ],
  },
  {
    section: "Defense",
    title: "Every player has a part",
    kicker: "Defense is not nine people watching whoever gets the ball.",
    bullets: [
      "Cover a base.",
      "Back up a throw.",
      "Become the cutoff.",
      "Rotate behind another defender.",
      "Communicate the play.",
      "Watch and control the runners.",
    ],
    quote: "There should rarely be a play where your responsibility is simply to watch.",
  },
  {
    section: "Defense",
    title: "Execute the routine play",
    kicker: "Great defense is built on reliability before highlights.",
    bullets: [
      "Routine ground ball: get the out.",
      "Routine fly ball: make the catch.",
      "Cutoff responsibility: be there.",
      "Backup responsibility: be there.",
      "Communication needed: communicate.",
    ],
    quote: "The spectacular play is a bonus. The routine play is the standard.",
  },
  {
    section: "Pitching",
    title: "Set the defense. Execute the pitch.",
    kicker: "The pitcher and defense are one unit.",
    paragraphs: [
      "Understand what you want the hitter to do, set the defense to support it, and throw the pitch with intention.",
      "Then evaluate that pitch honestly. Win or lose the pitch, reset. A good result does not make a missed location good execution, and hard contact does not change the next pitch's responsibility.",
    ],
    quote: "Win the pitch. Lose the pitch. Learn. Reset.",
  },
  {
    section: "Mental Game",
    title: "Control what you can control",
    kicker: "The game will not always cooperate.",
    bullets: ["Bad calls", "Bad hops", "Wind", "Errors", "Great defensive plays", "Bad pitches"],
    paragraphs: [
      "We cannot control every circumstance. We can control the response. Recognize the new situation, determine what the team needs now, and execute again.",
    ],
  },
  {
    section: "Mental Game",
    title: "Reset",
    kicker: "The next pitch deserves all of you.",
    paragraphs: [
      "Every pitch becomes history immediately after it happens. Learn from it, then release it.",
      "A mistake cannot be allowed to create another mistake. A great play cannot distract us from the next one. Success and failure receive the same final instruction.",
    ],
    quote: "Reset.",
  },
  {
    section: "The Loop",
    title: "Pitch by pitch",
    kicker: "The standard should eventually become automatic.",
    cards: [
      ["Before", "What is the situation? What does the team need? What is my part?"],
      ["During", "Commit. Execute."],
      ["After", "Did I execute? What did I learn? Reset."],
      ["Next pitch", "Do it again."],
    ],
  },
  {
    section: "Culture",
    title: "Accountability without humiliation",
    kicker: "Our standard can be demanding without making our environment miserable.",
    paragraphs: [
      "Nobody needs to be embarrassed to improve. Nobody needs an ass-chewing to understand a mistake.",
      "When something goes wrong, we correct the decision: What did the situation require? What should we do next time? Then teach it and move forward.",
    ],
    quote: "Accountability should create better players, not nervous ones.",
  },
  {
    section: "Identity",
    title: "What great players do",
    kicker: "Great players do more than produce statistics.",
    bullets: [
      "Understand why things happen.",
      "Know situations before they happen.",
      "Prepare and anticipate.",
      "Adjust without panic.",
      "Trust teammates.",
      "Accept responsibility.",
      "Make the people around them better.",
      "Reset after success and failure.",
    ],
  },
  {
    section: "Identity",
    title: "The standard in ten lines",
    kicker: "When you need the short version, this is it.",
    bullets: [
      "Play to your vision, not your circumstance.",
      "Know the situation.",
      "Ask what the team needs from you.",
      "Do your part.",
      "Trust yourself.",
      "Trust the player behind you.",
      "Protect our opportunities.",
      "Execute with intent.",
      "Be accountable.",
      "Reset.",
    ],
  },
  {
    section: "Identity",
    title: "The way we play",
    kicker: "This is what we want to become.",
    paragraphs: [
      "We want to be the team where a player can say: If you want to become a better softball player, come play with us.",
      "Not because we yell louder. Not because we pretend mistakes will not happen. Because we teach the game, understand situations, trust one another, hold ourselves accountable, and do things with purpose.",
    ],
    quote: "What does the team need from me right now, in this situation, on this pitch?",
    footer: "Answer it. Do your part. Trust the next man. Execute. Reset.",
  },
  {
    section: "Next",
    title: "The standard becomes situational",
    kicker: "The foundation is only the beginning.",
    paragraphs: [
      "The next chapters turn the standard into decisions: what we do with every base/out combination, how we run the bases, defensive rotations, cutoffs, pitching plans, pressure situations, and player development.",
    ],
    cards: [
      ["Part II", "Offensive situations"],
      ["Part III", "Baserunning"],
      ["Part IV", "Defensive situations"],
      ["Part V", "Pitching & alignment"],
      ["Part VI", "Mental game"],
      ["Part VII", "Player development"],
    ],
    footer: "The goal is not to memorize a book. It is to understand the game well enough to make the right decision when the exact play is not written down.",
  },
];

const cx = (...values) => values.filter(Boolean).join(" ");

function ReaderPage({ page }) {
  return (
    <article className="mx-auto flex min-h-[62dvh] w-full max-w-3xl flex-col justify-center px-5 py-8 sm:px-9 sm:py-10">
      <div className="text-[9px] font-black uppercase tracking-[.22em] text-cyan-300">{page.section}</div>
      <h1 className="mt-2 text-3xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl">{page.title}</h1>
      {page.kicker ? <p className="mt-3 text-sm font-bold leading-6 text-slate-300 sm:text-base">{page.kicker}</p> : null}

      <div className="mt-6 space-y-4 text-[15px] leading-7 text-slate-300 sm:text-[17px] sm:leading-8">
        {(page.paragraphs || []).map((text, index) => <p key={index}>{text}</p>)}
      </div>

      {page.columns ? <div className="mt-6 grid gap-3 sm:grid-cols-2">{page.columns.map((column) => (
        <section key={column.title} className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
          <h2 className="text-xs font-black uppercase tracking-[.15em] text-white">{column.title}</h2>
          <ul className="mt-3 space-y-2">{column.items.map((item) => <li key={item} className="flex gap-2 text-sm leading-5 text-slate-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />{item}</li>)}</ul>
        </section>
      ))}</div> : null}

      {page.cards ? <div className="mt-6 grid gap-2 sm:grid-cols-2">{page.cards.map(([title, text]) => (
        <section key={title + text} className="rounded-2xl border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,.045),rgba(255,255,255,.015))] p-4">
          <div className="text-[10px] font-black uppercase tracking-[.16em] text-cyan-300">{title}</div>
          <div className="mt-2 text-sm leading-6 text-slate-200">{text}</div>
        </section>
      ))}</div> : null}

      {page.bullets ? <ul className="mt-6 space-y-3">{page.bullets.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-6 text-slate-300 sm:text-base"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,.8)]" />{item}</li>
      ))}</ul> : null}

      {page.quote ? <blockquote className="mt-7 rounded-2xl border border-cyan-300/20 bg-cyan-300/[.055] px-5 py-4 text-lg font-black leading-7 text-cyan-50 sm:text-xl">“{page.quote}”</blockquote> : null}
      {page.footer ? <p className="mt-5 text-xs font-bold uppercase tracking-[.11em] text-slate-500">{page.footer}</p> : null}
    </article>
  );
}

export default function SportsPlaybook({ group, groupId, onClose }) {
  const storageKey = `sw_way_we_play_${groupId}_page`;
  const [pageIndex, setPageIndex] = useState(() => {
    const saved = Number(localStorage.getItem(storageKey));
    return Number.isFinite(saved) && saved >= 0 && saved <= pages.length ? saved : 0;
  });
  const [tocOpen, setTocOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const touchStart = useRef(null);
  const total = pages.length + 1;

  const currentLabel = pageIndex === 0 ? "Cover" : pages[pageIndex - 1]?.title || "The Way We Play";
  const progress = ((pageIndex + 1) / total) * 100;

  useEffect(() => {
    localStorage.setItem(storageKey, String(pageIndex));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pageIndex, storageKey]);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "ArrowLeft") setPageIndex((value) => Math.max(0, value - 1));
      if (event.key === "ArrowRight") setPageIndex((value) => Math.min(total - 1, value + 1));
      if (event.key === "Escape") setTocOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [total]);

  const sections = useMemo(() => {
    const rows = [{ index: 0, section: "Cover", title: "The Way We Play" }];
    pages.forEach((page, index) => rows.push({ index: index + 1, section: page.section, title: page.title }));
    return rows;
  }, []);

  function changePage(next) {
    setPageIndex(Math.max(0, Math.min(total - 1, next)));
  }

  async function sharePlaybook() {
    const url = `${window.location.origin}${window.location.pathname}?playbook=1`;
    const data = { title: "The Way We Play", text: "Our team standard and situational playbook.", url };
    try {
      if (navigator.share) {
        await navigator.share(data);
        setShareStatus("Shared");
      } else {
        await navigator.clipboard.writeText(url);
        setShareStatus("Team link copied");
      }
    } catch (error) {
      if (error?.name !== "AbortError") setShareStatus("Share link ready in the address bar");
    }
    window.setTimeout(() => setShareStatus(""), 2200);
  }

  async function copyPlaybook() {
    const url = `${window.location.origin}${window.location.pathname}?playbook=1`;
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus("Team link copied");
    } catch {
      setShareStatus("Copy the current address to share");
    }
    window.setTimeout(() => setShareStatus(""), 2200);
  }

  return (
    <div
      className="min-h-dvh bg-[#02060c] pb-[calc(5.5rem+env(safe-area-inset-bottom))] text-slate-100"
      onTouchStart={(event) => { touchStart.current = event.touches?.[0]?.clientX ?? null; }}
      onTouchEnd={(event) => {
        const start = touchStart.current;
        const end = event.changedTouches?.[0]?.clientX;
        touchStart.current = null;
        if (start == null || end == null || Math.abs(end - start) < 70) return;
        if (end < start) changePage(pageIndex + 1);
        else changePage(pageIndex - 1);
      }}
    >
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#02060c]/95 px-3 pt-[max(.55rem,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-2 pb-2">
          <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[.035] text-slate-200" aria-label="Back to team"><ArrowLeft className="h-4 w-4" /></button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-[.16em] text-cyan-300"><Lock className="h-3 w-3" />Team only · {group?.name || "Team"}</div>
            <div className="mt-0.5 truncate text-xs font-black text-white">{currentLabel}</div>
          </div>
          <button type="button" onClick={() => setTocOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[.035]" aria-label="Table of contents"><List className="h-4 w-4" /></button>
          <button type="button" onClick={sharePlaybook} className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-300/[.07] text-cyan-100" aria-label="Share playbook"><Share2 className="h-4 w-4" /></button>
        </div>
        <div className="mx-auto h-0.5 max-w-5xl overflow-hidden rounded-full bg-white/5"><div className="h-full bg-cyan-300 transition-all duration-300" style={{ width: `${progress}%` }} /></div>
      </header>

      <main className="mx-auto max-w-5xl px-3 py-4 sm:px-5">
        <section className="relative overflow-hidden rounded-[1.65rem] border border-white/10 bg-[radial-gradient(circle_at_75%_0%,rgba(34,211,238,.08),transparent_30%),linear-gradient(145deg,#07111f,#050a12)] shadow-2xl">
          {pageIndex === 0 ? (
            <div className="relative min-h-[69dvh]">
              <img src={THE_WAY_WE_PLAY_COVER} alt="The Way We Play team standard and situational playbook cover" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(2,6,12,.95)_0%,rgba(2,6,12,.15)_46%,rgba(2,6,12,.04)_100%)]" />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.14em] text-white backdrop-blur"><Lock className="h-3 w-3" />Internal team playbook</div>
                <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">THE WAY WE PLAY</h1>
                <p className="mt-2 max-w-xl text-sm font-bold leading-6 text-slate-200">A standard for how we prepare, compete, execute, and respond.</p>
                <div className="mt-4 flex flex-wrap gap-2 text-[8px] font-black uppercase tracking-[.13em] text-cyan-100"><span>Trust</span><span>·</span><span>Execution</span><span>·</span><span>Accountability</span><span>·</span><span>Team</span></div>
                <button type="button" onClick={() => changePage(1)} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-black text-slate-950 sm:w-auto sm:min-w-52"><BookOpen className="h-4 w-4" />Begin the standard</button>
              </div>
            </div>
          ) : <ReaderPage page={pages[pageIndex - 1]} />}
        </section>

        <div className="mt-3 flex items-center justify-between gap-2">
          <button type="button" disabled={pageIndex === 0} onClick={() => changePage(pageIndex - 1)} className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[.03] text-xs font-black text-slate-200 disabled:opacity-30"><ChevronLeft className="h-4 w-4" />Previous</button>
          <div className="shrink-0 text-center"><div className="text-[8px] font-black uppercase tracking-[.13em] text-slate-600">Page</div><div className="text-xs font-black text-slate-300">{pageIndex + 1} / {total}</div></div>
          <button type="button" disabled={pageIndex === total - 1} onClick={() => changePage(pageIndex + 1)} className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-cyan-300 text-xs font-black text-slate-950 disabled:opacity-30">Next<ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="mt-3 flex items-center justify-center gap-2 text-[9px] text-slate-600"><span>Swipe pages on mobile</span><span>·</span><button type="button" onClick={copyPlaybook} className="inline-flex items-center gap-1 font-black text-slate-400"><Copy className="h-3 w-3" />Copy team link</button></div>
      </main>

      {shareStatus ? <div className="fixed bottom-[calc(5.3rem+env(safe-area-inset-bottom))] left-1/2 z-[90] -translate-x-1/2 rounded-full border border-cyan-300/20 bg-[#07111f] px-4 py-2 text-[10px] font-black text-cyan-100 shadow-2xl">{shareStatus}</div> : null}

      {tocOpen ? <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm" onMouseDown={() => setTocOpen(false)}>
        <aside className="ml-auto flex h-full w-[92%] max-w-md flex-col border-l border-white/10 bg-[#06101d] pb-[env(safe-area-inset-bottom)]" onMouseDown={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between border-b border-white/10 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]"><div><div className="text-[8px] font-black uppercase tracking-[.16em] text-cyan-300">The Way We Play</div><h2 className="mt-1 text-lg font-black text-white">Table of contents</h2></div><button type="button" onClick={() => setTocOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10"><X className="h-4 w-4" /></button></div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">{sections.map((row) => <button key={`${row.index}-${row.title}`} type="button" onClick={() => { changePage(row.index); setTocOpen(false); }} className={cx("mb-1.5 flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left", pageIndex === row.index ? "border-cyan-300/25 bg-cyan-300/[.07]" : "border-white/8 bg-white/[.025]")}><div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/10 text-[9px] font-black text-slate-400">{row.index + 1}</div><div className="min-w-0"><div className="text-[7px] font-black uppercase tracking-[.13em] text-slate-600">{row.section}</div><div className="mt-0.5 text-xs font-black text-slate-200">{row.title}</div></div></button>)}</div>
        </aside>
      </div> : null}
    </div>
  );
}
