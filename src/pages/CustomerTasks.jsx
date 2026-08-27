import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, Grid3X3, List, Mic, Plus, Sparkles, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardShell from "../components/dashboard/DashboardShell";

const STORAGE_KEY = "syncworks.personal.tasks.v1";

function readTasks() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function CustomerTasks() {
  const nav = useNavigate();
  const [tasks, setTasks] = useState(readTasks);
  const [title, setTitle] = useState("");
  const [view, setView] = useState("grid");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const open = useMemo(() => tasks.filter((task) => !task.done), [tasks]);
  const done = useMemo(() => tasks.filter((task) => task.done), [tasks]);

  function addTask(event) {
    event.preventDefault();
    const value = title.trim();
    if (!value) return;
    const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    setTasks((current) => [{ id, title: value, done: false, created_at: new Date().toISOString() }, ...current]);
    setTitle("");
  }

  function toggle(id) {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, done: !task.done } : task));
  }

  function remove(id) {
    setTasks((current) => current.filter((task) => task.id !== id));
  }

  function askSync() {
    const summary = open.length
      ? `I have ${open.length} open personal tasks: ${open.slice(0, 8).map((task) => task.title).join(", ")}. Help me prioritize what to do next and read the plan aloud.`
      : "My personal to-do list is clear. Review my connected day and tell me what I should focus on next.";
    sessionStorage.setItem("syncAssistantPendingPrompt", summary);
    nav(`/sync?return=${encodeURIComponent("/customer/tasks")}`);
  }

  function TaskRow({ task, compact = false }) {
    return (
      <div className={`group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.025] ${compact ? "p-3" : "p-4"} transition hover:border-white/20 hover:bg-white/[.04]`}>
        <button type="button" onClick={() => toggle(task.id)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-slate-950/70 text-cyan-200" aria-label={task.done ? "Mark task open" : "Mark task complete"}>
          {task.done ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <Circle className="h-4 w-4" />}
        </button>
        <div className={`min-w-0 flex-1 text-[12px] font-bold ${task.done ? "text-slate-500 line-through" : "text-white"}`}>{task.title}</div>
        <button type="button" onClick={() => remove(task.id)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-rose-400/15 bg-rose-500/[.06] text-rose-300 opacity-80 transition group-hover:opacity-100" aria-label="Delete task"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    );
  }

  return (
    <DashboardShell modeBarTitle="To-do" modeBarSubtitle="Personal tasks and reminders" maxWidth="max-w-[1600px]">
      <div className="space-y-4 pb-24 lg:pb-8">
        <section className="rounded-[1.7rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_88%_10%,rgba(139,92,246,.18),transparent_30%),rgba(2,6,23,.94)] p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[.2em] text-cyan-200">Personal tasks</div>
              <h1 className="mt-1 text-2xl font-black text-white">Keep the next thing obvious.</h1>
              <p className="mt-1 text-xs text-slate-400">Quick tasks, follow-ups and reminders in one place.</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={askSync} className="inline-flex h-10 items-center gap-2 rounded-xl border border-violet-300/25 bg-violet-500/10 px-3 text-[11px] font-black text-violet-100"><Mic className="h-4 w-4" />Ask SYNC</button>
              <div className="flex rounded-xl border border-white/10 bg-black/20 p-1">
                <button type="button" onClick={() => setView("grid")} className={`grid h-8 w-8 place-items-center rounded-lg ${view === "grid" ? "bg-cyan-500/15 text-cyan-200" : "text-slate-500"}`} aria-label="Grid view"><Grid3X3 className="h-4 w-4" /></button>
                <button type="button" onClick={() => setView("list")} className={`grid h-8 w-8 place-items-center rounded-lg ${view === "list" ? "bg-cyan-500/15 text-cyan-200" : "text-slate-500"}`} aria-label="List view"><List className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
          <form onSubmit={addTask} className="mt-4 flex gap-2">
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add a task…" className="h-11 flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 text-xs text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/35" />
            <button type="submit" className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 text-xs font-black text-white"><Plus className="h-4 w-4" />Add</button>
          </form>
        </section>

        <section className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/[.04] p-4"><div className="text-[9px] font-black uppercase tracking-[.16em] text-cyan-200">Open</div><div className="mt-1 text-2xl font-black text-white">{open.length}</div></div>
          <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/[.04] p-4"><div className="text-[9px] font-black uppercase tracking-[.16em] text-emerald-200">Completed</div><div className="mt-1 text-2xl font-black text-white">{done.length}</div></div>
          <button type="button" onClick={askSync} className="rounded-2xl border border-violet-400/20 bg-violet-500/[.06] p-4 text-left"><div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.16em] text-violet-200"><Sparkles className="h-4 w-4" />SYNC Assist</div><div className="mt-1 text-sm font-black text-white">Prioritize my tasks</div></button>
        </section>

        {view === "grid" ? (
          <section className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-[1.5rem] border border-amber-400/15 bg-amber-500/[.03] p-4">
              <div className="text-[10px] font-black uppercase tracking-[.16em] text-amber-200">Open · {open.length}</div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">{open.length ? open.map((task) => <TaskRow key={task.id} task={task} compact />) : <div className="sm:col-span-2 rounded-2xl border border-dashed border-white/10 p-5 text-xs text-slate-500">Nothing waiting on you.</div>}</div>
            </div>
            <div className="rounded-[1.5rem] border border-emerald-400/15 bg-emerald-500/[.03] p-4">
              <div className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-200">Completed · {done.length}</div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">{done.length ? done.map((task) => <TaskRow key={task.id} task={task} compact />) : <div className="sm:col-span-2 rounded-2xl border border-dashed border-white/10 p-5 text-xs text-slate-500">Completed tasks will collect here.</div>}</div>
            </div>
          </section>
        ) : (
          <section className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-[1.5rem] border border-amber-400/15 bg-amber-500/[.03] p-4"><div className="text-[10px] font-black uppercase tracking-[.16em] text-amber-200">Open · {open.length}</div><div className="mt-3 space-y-2">{open.length ? open.map((task) => <TaskRow key={task.id} task={task} />) : <div className="rounded-2xl border border-dashed border-white/10 p-5 text-xs text-slate-500">Nothing waiting on you.</div>}</div></div>
            <div className="rounded-[1.5rem] border border-emerald-400/15 bg-emerald-500/[.03] p-4"><div className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-200">Completed · {done.length}</div><div className="mt-3 space-y-2">{done.length ? done.map((task) => <TaskRow key={task.id} task={task} />) : <div className="rounded-2xl border border-dashed border-white/10 p-5 text-xs text-slate-500">Completed tasks will collect here.</div>}</div></div>
          </section>
        )}
      </div>
    </DashboardShell>
  );
}
