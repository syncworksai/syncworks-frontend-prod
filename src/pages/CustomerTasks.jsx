import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, Plus, Trash2 } from "lucide-react";
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
  const [tasks, setTasks] = useState(readTasks);
  const [title, setTitle] = useState("");

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

  function TaskRow({ task }) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-3">
        <button type="button" onClick={() => toggle(task.id)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-slate-950/70 text-cyan-200" aria-label={task.done ? "Mark task open" : "Mark task complete"}>
          {task.done ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : <Circle className="h-5 w-5" />}
        </button>
        <div className={`min-w-0 flex-1 text-sm font-bold ${task.done ? "text-slate-500 line-through" : "text-white"}`}>{task.title}</div>
        <button type="button" onClick={() => remove(task.id)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-rose-400/15 bg-rose-500/[.06] text-rose-300" aria-label="Delete task"><Trash2 className="h-4 w-4" /></button>
      </div>
    );
  }

  return (
    <DashboardShell modeBarTitle="To-do" modeBarSubtitle="Personal tasks and reminders">
      <div className="mx-auto max-w-6xl space-y-4 pb-24">
        <section className="rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_88%_10%,rgba(139,92,246,.18),transparent_30%),rgba(2,6,23,.94)] p-5 sm:p-7">
          <div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">Personal tasks</div>
          <h1 className="mt-2 text-3xl font-black text-white">Keep the next thing obvious.</h1>
          <p className="mt-2 text-sm text-slate-400">Quick personal to-dos live here instead of sending you back to Home.</p>
          <form onSubmit={addTask} className="mt-5 flex gap-2">
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add a task…" className="h-12 flex-1 rounded-2xl border border-white/10 bg-slate-950 px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/35" />
            <button type="submit" className="inline-flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 px-5 text-sm font-black text-white"><Plus className="h-4 w-4" />Add</button>
          </form>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[1.75rem] border border-amber-400/15 bg-amber-500/[.03] p-4">
            <div className="text-xs font-black uppercase tracking-[.16em] text-amber-200">Open · {open.length}</div>
            <div className="mt-3 space-y-2">{open.length ? open.map((task) => <TaskRow key={task.id} task={task} />) : <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-500">Nothing waiting on you.</div>}</div>
          </div>
          <div className="rounded-[1.75rem] border border-emerald-400/15 bg-emerald-500/[.03] p-4">
            <div className="text-xs font-black uppercase tracking-[.16em] text-emerald-200">Completed · {done.length}</div>
            <div className="mt-3 space-y-2">{done.length ? done.map((task) => <TaskRow key={task.id} task={task} />) : <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-500">Completed tasks will collect here.</div>}</div>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
