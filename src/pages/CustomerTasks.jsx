import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, HeartPulse, ListChecks, Mic, Plus, ShoppingBag, Sparkles, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardShell from "../components/dashboard/DashboardShell";
import { readLists, readTasks, writeLists, writeTasks } from "../lib/personalActionStore";

const HEALTH_PRICE = "$2.99/mo after 30-day trial";

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function CustomerTasks() {
  const nav = useNavigate();
  const [tasks, setTasks] = useState(readTasks);
  const [lists, setLists] = useState(readLists);
  const [title, setTitle] = useState("");
  const today = todayYmd();

  useEffect(() => writeTasks(tasks), [tasks]);
  useEffect(() => writeLists(lists), [lists]);
  useEffect(() => {
    const refresh = () => { setTasks(readTasks()); setLists(readLists()); };
    window.addEventListener("syncworks:personal-actions-changed", refresh);
    return () => window.removeEventListener("syncworks:personal-actions-changed", refresh);
  }, []);

  const open = useMemo(() => tasks.filter((task) => !task.done), [tasks]);
  const todayTasks = useMemo(() => open.filter((task) => !task.due_ymd || task.due_ymd <= today), [open, today]);
  const shoppingLists = useMemo(() => lists.filter((list) => list.type === "SHOPPING"), [lists]);
  const sourceGroups = useMemo(() => {
    const groups = new Map();
    todayTasks.forEach((task) => {
      const source = String(task.source || "PERSONAL").toUpperCase();
      if (!groups.has(source)) groups.set(source, []);
      groups.get(source).push(task);
    });
    return [...groups.entries()];
  }, [todayTasks]);

  function addTask(event) {
    event.preventDefault();
    const value = title.trim();
    if (!value) return;
    setTasks((current) => [{ id: globalThis.crypto?.randomUUID?.() || `${Date.now()}`, title: value, done: false, source: "PERSONAL", due_ymd: today, created_at: new Date().toISOString() }, ...current]);
    setTitle("");
  }

  function toggle(id) { setTasks((current) => current.map((task) => task.id === id ? { ...task, done: !task.done } : task)); }
  function remove(id) { setTasks((current) => current.filter((task) => task.id !== id)); }
  function toggleListItem(listId, itemId) {
    setLists((current) => current.map((list) => list.id === listId ? { ...list, items: (list.items || []).map((item) => item.id === itemId ? { ...item, done: !item.done } : item) } : list));
  }

  function askSync() {
    const summary = todayTasks.length
      ? `Brief My Day. I have ${todayTasks.length} actions due now: ${todayTasks.slice(0, 10).map((task) => task.title).join(", ")}. Explain what matters, why, what can wait, and what I should do next.`
      : "Brief My Day using my connected SyncWorks modules. Tell me what matters today, what can wait, and what I should do next.";
    sessionStorage.setItem("syncAssistantPendingPrompt", summary);
    nav(`/sync?return=${encodeURIComponent("/customer/tasks")}`);
  }

  function TaskRow({ task }) {
    return <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
      <button type="button" onClick={() => toggle(task.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 text-cyan-200">{task.done ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <Circle className="h-4 w-4" />}</button>
      <div className="min-w-0 flex-1"><div className="text-xs font-black text-white">{task.title}</div>{task.reason ? <div className="mt-1 text-[10px] leading-4 text-slate-500">Why: {task.reason}</div> : null}</div>
      <button type="button" onClick={() => remove(task.id)} className="grid h-8 w-8 place-items-center rounded-lg text-rose-300" aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
    </div>;
  }

  return <DashboardShell modeBarTitle="My Day" modeBarSubtitle="SYNC-organized actions, lists and priorities" maxWidth="max-w-[1600px]">
    <div className="space-y-4 pb-24 lg:pb-8">
      <section className="rounded-[1.7rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_88%_10%,rgba(139,92,246,.18),transparent_30%),rgba(2,6,23,.96)] p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div><div className="text-[9px] font-black uppercase tracking-[.2em] text-cyan-200">Unified My Day</div><h1 className="mt-1 text-2xl font-black text-white">One place for what life needs next.</h1><p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">SYNC brings actions from the features you use into one briefing. You should not have to visit five dashboards to understand your day.</p></div>
          <button type="button" onClick={askSync} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 text-xs font-black text-white"><Mic className="h-4 w-4" />Brief My Day</button>
        </div>
        <form onSubmit={addTask} className="mt-4 flex gap-2"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add something to My Day…" className="h-11 flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 text-xs text-white outline-none" /><button className="inline-flex h-11 items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-500/10 px-4 text-xs font-black text-cyan-100"><Plus className="h-4 w-4" />Add</button></form>
      </section>

      <section className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/[.04] p-4"><div className="text-[9px] font-black uppercase text-cyan-200">Due now</div><div className="mt-1 text-2xl font-black text-white">{todayTasks.length}</div></div><div className="rounded-2xl border border-violet-400/15 bg-violet-500/[.04] p-4"><div className="text-[9px] font-black uppercase text-violet-200">Connected areas</div><div className="mt-1 text-2xl font-black text-white">{sourceGroups.length}</div></div><div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/[.04] p-4"><div className="text-[9px] font-black uppercase text-emerald-200">Shopping lists</div><div className="mt-1 text-2xl font-black text-white">{shoppingLists.length}</div></div></section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-cyan-200"><ListChecks className="h-4 w-4" />Today's actions</div>
          {sourceGroups.length ? sourceGroups.map(([source, items]) => <div key={source} className="rounded-[1.5rem] border border-white/10 bg-white/[.025] p-4"><div className="mb-3 flex items-center justify-between"><div className="text-xs font-black text-white">{source === "HEALTH" ? "Health & Nutrition" : source.charAt(0) + source.slice(1).toLowerCase()}</div><span className="rounded-full border border-white/10 px-2 py-1 text-[9px] font-black text-slate-400">{items.length} action{items.length === 1 ? "" : "s"}</span></div><div className="space-y-2">{items.map((task) => <TaskRow key={task.id} task={task} />)}</div></div>) : <div className="rounded-[1.5rem] border border-dashed border-white/10 p-6 text-center text-xs text-slate-500">Nothing is due right now. SYNC can still brief connected modules and help plan the day.</div>}
        </div>

        <aside className="space-y-3">
          <div className="rounded-[1.5rem] border border-fuchsia-400/20 bg-fuchsia-500/[.05] p-4"><div className="flex items-center gap-2 text-[10px] font-black uppercase text-fuchsia-200"><ShoppingBag className="h-4 w-4" />Shopping</div>{shoppingLists.length ? <div className="mt-3 space-y-3">{shoppingLists.map((list) => <div key={list.id} className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-sm font-black text-white">{list.title}</div>{list.reason ? <div className="mt-1 text-[10px] text-slate-500">{list.reason}</div> : null}<div className="mt-2 space-y-1">{(list.items || []).slice(0, 6).map((item) => <button key={item.id} type="button" onClick={() => toggleListItem(list.id, item.id)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] ${item.done ? "text-slate-600 line-through" : "text-slate-300"}`}><span>{item.done ? "✓" : "○"}</span><span>{item.quantity ? `${item.quantity} · ` : ""}{item.title}</span></button>)}</div><button type="button" onClick={() => nav("/customer/store")} className="mt-2 text-[10px] font-black text-fuchsia-200">Open Storefront →</button></div>)}</div> : <div className="mt-2 text-xs leading-5 text-slate-500">Shopping lists created by Health, projects and other SyncWorks features will stay separate from ordinary tasks.</div>}</div>

          <div className="rounded-[1.5rem] border border-lime-400/20 bg-lime-500/[.05] p-4"><div className="flex items-center gap-2 text-[10px] font-black uppercase text-lime-200"><HeartPulse className="h-4 w-4" />Connect more of your day</div><div className="mt-2 text-sm font-black text-white">Health & Nutrition</div><p className="mt-1 text-[11px] leading-5 text-slate-400">Goals, workout planning, nutrition targets, consistency and budget-aware food planning can feed My Day automatically.</p><div className="mt-3 rounded-xl border border-lime-300/15 bg-black/20 p-3"><div className="text-lg font-black text-lime-200">{HEALTH_PRICE}</div><div className="mt-1 text-[10px] text-slate-500">Shown here as a contextual upgrade, not mixed into your actual tasks.</div></div><button type="button" onClick={() => nav("/customer/health")} className="mt-3 h-10 w-full rounded-xl border border-lime-300/25 bg-lime-300/10 text-xs font-black text-lime-100">Explore Health</button></div>

          <button type="button" onClick={askSync} className="w-full rounded-[1.5rem] border border-violet-400/20 bg-violet-500/[.06] p-4 text-left"><div className="flex items-center gap-2 text-[10px] font-black uppercase text-violet-200"><Sparkles className="h-4 w-4" />SYNC</div><div className="mt-1 text-sm font-black text-white">What should I do next?</div><div className="mt-1 text-[11px] text-slate-500">Prioritize the day instead of making you manage the software.</div></button>
        </aside>
      </section>
    </div>
  </DashboardShell>;
}
