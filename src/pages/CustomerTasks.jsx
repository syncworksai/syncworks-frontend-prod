import "./CustomerTasksMobileV34.css";
import React, { useEffect, useMemo, useState } from "react";
import { Archive, CheckCircle2, Circle, Grid3X3, List, Mic, Pencil, Plus, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardShell from "../components/dashboard/DashboardShell";
import api from "../api/client";
import { fetchPersonalCalendarEvents } from "../api/personalCalendarAgenda";

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
  const [remoteTasks, setRemoteTasks] = useState([]);
  const [syncStatus, setSyncStatus] = useState("loading");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState("grid");
  const [section, setSection] = useState("active");
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [actionError, setActionError] = useState("");
  const [pendingId, setPendingId] = useState(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    let active = true;
    const reload = async () => {
      try {
        const rows = await fetchPersonalCalendarEvents();
        if (!active) return;
        setRemoteTasks(rows.filter(row => String(row?.metadata?.entity_type || "").toUpperCase() === "TASK")
          .map(row => ({ id: "remote:" + row.id, remoteId: row.id, title: row.title, done: String(row.metadata?.task_status || "OPEN").toUpperCase() === "DONE", archived: String(row.metadata?.task_status || "OPEN").toUpperCase() === "ARCHIVED", created_at: row.created_at || row.start_at, raw: row })));
        setSyncStatus("ready");
      } catch {
        if (active) setSyncStatus("offline");
      }
    };
    reload();
    window.addEventListener("focus", reload);
    return () => { active = false; window.removeEventListener("focus", reload); };
  }, []);
  const allTasks = useMemo(() => [...remoteTasks, ...tasks], [remoteTasks, tasks]);
  const open = useMemo(() => allTasks.filter((task) => !task.done && !task.archived), [allTasks]);
  const done = useMemo(() => allTasks.filter((task) => task.done && !task.archived), [allTasks]);
  const archived = useMemo(() => allTasks.filter((task) => task.archived), [allTasks]);

  async function addTask(event) {
    event.preventDefault();
    const value = title.trim();
    if (!value || busy) return;
    setBusy(true);
    try {
      const startAt = new Date();
      const endAt = new Date(startAt.getTime() + 30 * 60000);
      const payload = {
        title: value,
        description: "",
        source: "MANUAL",
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        all_day: false,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago",
        metadata: { entity_type: "TASK", task_status: "OPEN", task_priority: "NORMAL", task_unscheduled: true, fixed: false },
      };
      const saved = await api.post("/personal-calendar/events/", payload);
      if (!saved.data?.id) throw new Error("Missing task ID");
      setRemoteTasks(current => [{ id:"remote:"+saved.data.id, remoteId:saved.data.id, title:value, done:false, raw:saved.data, created_at:startAt.toISOString() }, ...current]);
      setSyncStatus("ready");
      setTitle("");
    } catch {
      // An explicit local fallback keeps the to-do available without claiming cloud sync.
      const id = globalThis.crypto?.randomUUID?.() || String(Date.now());
      setTasks(current => [{ id, title:value, done:false, created_at:new Date().toISOString() }, ...current]);
      setSyncStatus("offline");
      setTitle("");
    } finally { setBusy(false); }
  }

  // One mutation path for account-backed and device-local tasks.
  async function updateTask(id, changes) {
    const remote = remoteTasks.find(row => row.id === id);
    setActionError("");
    setPendingId(id);
    try {
      if (remote) {
        const nextStatus = changes.archived ? "ARCHIVED" : changes.done ? "DONE" : "OPEN";
        const payload = {
          ...(changes.title !== undefined ? { title: changes.title } : {}),
          metadata: {
            ...(remote.raw?.metadata || {}),
            entity_type: "TASK",
            task_status: nextStatus,
            ...(changes.archived ? { task_archived_at: new Date().toISOString() } : { task_archived_at: null }),
          },
        };
        const response = await api.patch(`/personal-calendar/events/${remote.remoteId}/`, payload);
        const next = response.data || {};
        setRemoteTasks(current => current.map(row => row.id === id ? {
          ...row,
          ...changes,
          raw: { ...row.raw, ...next, title: changes.title ?? row.title, metadata: { ...(row.raw?.metadata || {}), ...payload.metadata, ...(next.metadata || {}) } },
        } : row));
        setSyncStatus("ready");
      } else {
        setTasks(current => current.map(row => row.id === id ? { ...row, ...changes } : row));
      }
      return true;
    } catch {
      setActionError("This task could not be updated. Please retry.");
      setSyncStatus("offline");
      return false;
    } finally {
      setPendingId(null);
    }
  }

  async function toggle(id) {
    const item = allTasks.find(row => row.id === id);
    if (!item) return;
    await updateTask(id, { done: !item.done, archived: false });
  }

  function beginEdit(task) {
    setEditingId(task.id);
    setEditTitle(task.title || "");
    setActionError("");
  }

  async function saveEdit(id) {
    const value = editTitle.trim();
    if (!value) {
      setActionError("Enter a task title.");
      return;
    }
    if (await updateTask(id, { title: value })) {
      setEditingId(null);
      setEditTitle("");
    }
  }

  async function archiveTask(id) {
    const item = allTasks.find(row => row.id === id);
    if (!item) return;
    await updateTask(id, { archived: true, done: item.done });
  }

  async function restoreTask(id) {
    await updateTask(id, { archived: false, done: false });
  }

  async function remove(id) {
    const task = remoteTasks.find(row => row.id === id);
    setActionError("");
    setPendingId(id);
    try {
      if (!task) {
        setTasks(current => current.filter(row => row.id !== id));
      } else {
        await api.delete(`/personal-calendar/events/${task.remoteId}/`);
        setRemoteTasks(current => current.filter(row => row.id !== id));
      }
    } catch {
      setActionError("Unable to delete this task. Please retry.");
    } finally {
      setPendingId(null);
    }
  }

  function askSync() {
    const summary = open.length
      ? `I have ${open.length} open personal tasks: ${open.slice(0, 8).map((task) => task.title).join(", ")}. Help me prioritize what to do next and read the plan aloud.`
      : "My personal to-do list is clear. Review my connected day and tell me what I should focus on next.";
    sessionStorage.setItem("syncAssistantPendingPrompt", summary);
    nav(`/sync?return=${encodeURIComponent("/customer/tasks")}`);
  }

  function TaskRow({ task, compact = false }) {
    const isEditing = editingId === task.id;
    const isBusy = pendingId === task.id;
    return (
      <div className={`sw-todo-task-row group flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[.04] ${compact ? "p-3" : "p-4"} transition hover:border-white/20`}>
        {isEditing ? (
          <form onSubmit={(event) => { event.preventDefault(); saveEdit(task.id); }} className="flex w-full min-w-0 flex-wrap items-center gap-2">
            <input autoFocus aria-label="Edit task title" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} className="h-10 min-w-0 flex-1 rounded-xl border border-cyan-400/30 bg-slate-950 px-3 text-base text-white" />
            <button type="submit" disabled={isBusy} className="h-10 rounded-xl bg-cyan-500 px-3 text-xs font-black text-slate-950">Save</button>
            <button type="button" onClick={() => setEditingId(null)} className="h-10 rounded-xl border border-white/15 px-3 text-xs">Cancel</button>
          </form>
        ) : (
          <>
            {!task.archived ? <button type="button" disabled={isBusy} onClick={() => toggle(task.id)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-slate-950/70 text-cyan-200" aria-label={task.done ? "Reopen task" : "Complete task"}>
              {task.done ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <Circle className="h-4 w-4" />}
            </button> : <Archive className="h-4 w-4 shrink-0 text-slate-400" />}
            <div className={`min-w-0 flex-1 text-[12px] font-bold ${task.done ? "text-slate-400 line-through" : "text-white"}`}>{task.title}</div>
            <div className="sw-todo-row-actions flex flex-wrap items-center gap-1">
              {!task.archived ? <>
                <button type="button" disabled={isBusy} onClick={() => beginEdit(task)} className="sw-todo-action" aria-label={`Edit ${task.title}`} title="Edit"><Pencil className="h-4 w-4" /><span>Edit</span></button>
                {task.done ? <button type="button" disabled={isBusy} onClick={() => toggle(task.id)} className="sw-todo-action" title="Reopen"><RotateCcw className="h-4 w-4" /><span>Reopen</span></button> :
                  <button type="button" disabled={isBusy} onClick={() => toggle(task.id)} className="sw-todo-action" title="Complete"><CheckCircle2 className="h-4 w-4" /><span>Complete</span></button>}
                <button type="button" disabled={isBusy} onClick={() => archiveTask(task.id)} className="sw-todo-action" title="Archive"><Archive className="h-4 w-4" /><span>Archive</span></button>
              </> : <>
                <button type="button" disabled={isBusy} onClick={() => restoreTask(task.id)} className="sw-todo-action" title="Restore to open tasks"><RotateCcw className="h-4 w-4" /><span>Restore</span></button>
                <button type="button" disabled={isBusy} onClick={() => remove(task.id)} className="sw-todo-action text-rose-300" title="Permanently delete"><Trash2 className="h-4 w-4" /><span>Delete</span></button>
              </>}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <DashboardShell modeBarTitle="To-do" modeBarSubtitle="Personal tasks and reminders" maxWidth="max-w-[1600px]">
      <div className="space-y-4 pb-24 lg:pb-8 sw-todo-workspace">
        <section className="rounded-[1.7rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_88%_10%,rgba(139,92,246,.18),transparent_30%),rgba(2,6,23,.94)] p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[.2em] text-cyan-200">Personal tasks</div>
              <h1 className="mt-1 text-2xl font-black text-white">Keep the next thing obvious.</h1>
              <p className="mt-1 text-xs text-slate-400">To-dos are not calendar appointments. Only explicitly scheduled events block calendar time.</p>
              <p className="mt-1 text-[10px] text-cyan-200" role="status">{syncStatus === "ready" ? "Synced with your SyncWorks account" : syncStatus === "loading" ? "Loading your tasks…" : "Connection unavailable. New tasks are saved on this device only."}</p>
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
            <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add a task…" className="h-11 flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 text-xs text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/35" />
            <button type="submit" disabled={busy} className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 text-xs font-black text-white"><Plus className="h-4 w-4" />Add</button>
          </form>
        </section>

        {actionError ? <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200" role="alert">{actionError}</div> : null}
        <nav className="sw-todo-tabs flex flex-wrap gap-2" aria-label="Task status">
          {[["active", "Open", open.length], ["completed", "Completed", done.length], ["archive", "Archive", archived.length]].map(([key,label,count]) =>
            <button key={key} type="button" aria-pressed={section === key} onClick={() => { setSection(key); setEditingId(null); }} className={`rounded-xl border px-4 py-2 text-xs font-black ${section === key ? "border-cyan-300 bg-cyan-500/20 text-cyan-100" : "border-white/15 bg-black/20 text-slate-300"}`}>{label} · {count}</button>
          )}
        </nav>
        <section className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/[.04] p-4"><div className="text-[9px] font-black uppercase tracking-[.16em] text-cyan-200">Open</div><div className="mt-1 text-2xl font-black text-white">{open.length}</div></div>
          <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/[.04] p-4"><div className="text-[9px] font-black uppercase tracking-[.16em] text-emerald-200">Completed</div><div className="mt-1 text-2xl font-black text-white">{done.length}</div></div>
          <button type="button" onClick={askSync} className="rounded-2xl border border-violet-400/20 bg-violet-500/[.06] p-4 text-left"><div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.16em] text-violet-200"><Sparkles className="h-4 w-4" />SYNC Assist</div><div className="mt-1 text-sm font-black text-white">Prioritize my tasks</div></button>
        </section>

        <section className="sw-todo-list-layout grid gap-3">
          <div className="rounded-[1.5rem] border border-cyan-400/15 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] font-black uppercase tracking-[.16em] text-cyan-200">{section === "active" ? "Open" : section === "completed" ? "Completed" : "Archived"} · {section === "active" ? open.length : section === "completed" ? done.length : archived.length}</div>
              {section === "archive" && <span className="text-[10px] text-slate-400">Restore or permanently delete</span>}
            </div>
            <div className={`mt-3 grid gap-2 ${view === "grid" ? "lg:grid-cols-2" : "grid-cols-1"}`}>
              {(section === "active" ? open : section === "completed" ? done : archived).length
                ? (section === "active" ? open : section === "completed" ? done : archived).map(task => <TaskRow key={task.id} task={task} compact={view === "grid"} />)
                : <div className="rounded-2xl border border-dashed border-white/10 p-5 text-xs text-slate-400">{section === "active" ? "Nothing waiting on you." : section === "completed" ? "Completed tasks will appear here. Archive them when you want to clear this view." : "Your archive is empty."}</div>}
            </div>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
