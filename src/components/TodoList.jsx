import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function uid() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

function ymd(d) {
  const x = new Date(d);
  if (!Number.isFinite(x.getTime())) return "";
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function startOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date = new Date()) {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function monthKey(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function yearKey(date = new Date()) {
  return String(new Date(date).getFullYear());
}

function sameDay(dateStr, compare = new Date()) {
  return dateStr === ymd(compare);
}

function inCurrentWeek(dateStr, compare = new Date()) {
  if (!dateStr) return false;
  const d = new Date(`${dateStr}T00:00:00`);
  return d >= startOfWeek(compare) && d <= endOfWeek(compare);
}

function inCurrentMonth(dateStr, compare = new Date()) {
  if (!dateStr) return false;
  return dateStr.slice(0, 7) === monthKey(compare);
}

function inCurrentYear(dateStr, compare = new Date()) {
  if (!dateStr) return false;
  return dateStr.slice(0, 4) === yearKey(compare);
}

function isOverdue(dateStr, status) {
  if (!dateStr || status === "DONE") return false;
  return dateStr < ymd(new Date());
}

function prettyDate(dateStr) {
  if (!dateStr) return "No date";
  const d = new Date(`${dateStr}T00:00:00`);
  if (!Number.isFinite(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const PRIORITIES = [
  { key: "HIGH", label: "High", tone: "border-rose-500/35 bg-rose-500/10 text-rose-200" },
  { key: "MED", label: "Medium", tone: "border-amber-500/35 bg-amber-500/10 text-amber-200" },
  { key: "LOW", label: "Low", tone: "border-slate-700 bg-slate-950/40 text-slate-200" },
];

const STATUSES = [
  { key: "TODO", label: "To Do", tone: "border-slate-700 bg-slate-950/50 text-slate-200" },
  { key: "IN_PROGRESS", label: "In Progress", tone: "border-cyan-500/35 bg-cyan-500/10 text-cyan-200" },
  { key: "DONE", label: "Done", tone: "border-emerald-500/35 bg-emerald-500/10 text-emerald-200" },
];

const CADENCES = [
  { key: "DAILY", label: "Daily" },
  { key: "WEEKLY", label: "Weekly" },
  { key: "MONTHLY", label: "Monthly" },
  { key: "YEARLY", label: "Yearly" },
  { key: "GOAL", label: "Goal" },
];

const SECTION_META = {
  TODAY: {
    label: "Today",
    tone: "border-cyan-500/35 bg-cyan-500/10 text-cyan-200",
    helper: "Calls, follow-ups, urgent tasks, today-only items.",
  },
  WEEK: {
    label: "This Week",
    tone: "border-indigo-500/35 bg-indigo-500/10 text-indigo-200",
    helper: "Bigger action items and important short-term progress.",
  },
  MONTH: {
    label: "This Month",
    tone: "border-fuchsia-500/35 bg-fuchsia-500/10 text-fuchsia-200",
    helper: "Projects, planning, monthly admin, billing, KPI reviews.",
  },
  GOALS: {
    label: "Goals",
    tone: "border-emerald-500/35 bg-emerald-500/10 text-emerald-200",
    helper: "Long-term targets, milestones, yearly objectives.",
  },
};

function priorityTone(p) {
  return PRIORITIES.find((x) => x.key === p)?.tone || PRIORITIES[2].tone;
}

function statusTone(s) {
  return STATUSES.find((x) => x.key === s)?.tone || STATUSES[0].tone;
}

function cadenceTone(c) {
  if (c === "DAILY") return "border-cyan-500/35 bg-cyan-500/10 text-cyan-200";
  if (c === "WEEKLY") return "border-indigo-500/35 bg-indigo-500/10 text-indigo-200";
  if (c === "MONTHLY") return "border-fuchsia-500/35 bg-fuchsia-500/10 text-fuchsia-200";
  if (c === "YEARLY") return "border-emerald-500/35 bg-emerald-500/10 text-emerald-200";
  return "border-slate-700 bg-slate-950/40 text-slate-200";
}

function StatCard({ label, value, tone = "slate" }) {
  const toneCls =
    tone === "cyan"
      ? "border-cyan-500/35 bg-cyan-500/10"
      : tone === "fuchsia"
      ? "border-fuchsia-500/35 bg-fuchsia-500/10"
      : tone === "emerald"
      ? "border-emerald-500/35 bg-emerald-500/10"
      : tone === "amber"
      ? "border-amber-500/35 bg-amber-500/10"
      : "border-slate-800 bg-slate-950/40";

  return (
    <div className={cx("rounded-2xl border p-3", toneCls)}>
      <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-extrabold text-slate-100">{value}</div>
    </div>
  );
}

function EmptyState({ title, subtitle }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/30 p-6 text-center">
      <div className="text-sm font-semibold text-slate-200">{title}</div>
      <div className="mt-1 text-sm text-slate-400">{subtitle}</div>
    </div>
  );
}

function inferSection(item) {
  if (item.cadence === "GOAL") return "GOALS";
  if (item.section && SECTION_META[item.section]) return item.section;
  if (sameDay(item.due_date)) return "TODAY";
  if (inCurrentWeek(item.due_date)) return "WEEK";
  if (inCurrentMonth(item.due_date)) return "MONTH";
  if (item.cadence === "DAILY") return "TODAY";
  if (item.cadence === "WEEKLY") return "WEEK";
  if (item.cadence === "MONTHLY") return "MONTH";
  if (item.cadence === "YEARLY") return "GOALS";
  return "MONTH";
}

function normalizeCadenceFromSection(section) {
  if (section === "TODAY") return "DAILY";
  if (section === "WEEK") return "WEEKLY";
  if (section === "MONTH") return "MONTHLY";
  if (section === "GOALS") return "GOAL";
  return "MONTHLY";
}

function TaskCard({
  item,
  onPatch,
  onToggleDone,
  onRemove,
  onArchive,
  onDragStart,
  onDragEnd,
  onDropOnItem,
  isDragActive,
}) {
  const overdue = isOverdue(item.due_date, item.status);
  const isDone = item.status === "DONE";

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => onDropOnItem(e, item.id)}
      className={cx(
        "rounded-3xl border bg-slate-950/55 p-4 transition",
        overdue ? "border-rose-500/35" : "border-slate-800",
        isDone ? "opacity-75" : "",
        isDragActive ? "ring-2 ring-cyan-500/30" : ""
      )}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <button
            onClick={() => onToggleDone(item.id)}
            title={isDone ? "Mark as not done" : "Mark done"}
            className={cx(
              "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-sm font-bold",
              isDone
                ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
                : overdue
                ? "border-rose-500/35 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15"
                : "border-slate-700 bg-slate-950/60 text-slate-300 hover:bg-slate-900/60"
            )}
          >
            {isDone ? "✓" : "○"}
          </button>

          <div className="min-w-0 flex-1">
            <input
              value={item.title || ""}
              onChange={(e) => onPatch(item.id, { title: e.target.value })}
              className={cx(
                "w-full rounded-xl border border-transparent bg-transparent px-1 py-1 text-sm font-semibold outline-none focus:border-cyan-500/30 focus:bg-slate-950/40",
                isDone ? "text-slate-400 line-through" : "text-slate-100"
              )}
            />

            <div className="mt-2 flex flex-wrap gap-2">
              <span className={cx("rounded-full border px-2 py-1 text-[10px]", cadenceTone(item.cadence))}>
                {CADENCES.find((c) => c.key === item.cadence)?.label || "Task"}
              </span>

              <span className={cx("rounded-full border px-2 py-1 text-[10px]", priorityTone(item.priority))}>
                {PRIORITIES.find((p) => p.key === item.priority)?.label || "Low"}
              </span>

              <span className={cx("rounded-full border px-2 py-1 text-[10px]", statusTone(item.status))}>
                {STATUSES.find((s) => s.key === item.status)?.label || "To Do"}
              </span>

              <span
                className={cx(
                  "rounded-full border px-2 py-1 text-[10px]",
                  overdue
                    ? "border-rose-500/35 bg-rose-500/10 text-rose-200"
                    : "border-slate-800 bg-slate-950/40 text-slate-300"
                )}
              >
                {item.due_date ? `Due ${prettyDate(item.due_date)}` : "No due date"}
              </span>
            </div>
          </div>

          <div className="hidden shrink-0 items-center gap-2 md:flex">
            <button
              onClick={() =>
                onPatch(item.id, {
                  status: item.status === "IN_PROGRESS" ? "TODO" : "IN_PROGRESS",
                })
              }
              className="rounded-2xl border border-cyan-500/35 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-500/15"
            >
              {item.status === "IN_PROGRESS" ? "Reset" : "Start"}
            </button>

            <button
              onClick={() => onArchive(item.id)}
              className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-300 hover:bg-slate-900/50"
            >
              Archive
            </button>

            <button
              onClick={() => onRemove(item.id)}
              className="rounded-2xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-200 hover:bg-rose-500/15"
            >
              Delete
            </button>
          </div>
        </div>

        <textarea
          rows={2}
          value={item.notes || ""}
          onChange={(e) => onPatch(item.id, { notes: e.target.value })}
          placeholder="Add notes, steps, reminders, contact info..."
          className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-cyan-500/50"
        />

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <select
            value={item.cadence}
            onChange={(e) => onPatch(item.id, { cadence: e.target.value })}
            className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
          >
            {CADENCES.map((c) => (
              <option key={c.key} value={c.key}>
                Type: {c.label}
              </option>
            ))}
          </select>

          <select
            value={item.priority}
            onChange={(e) => onPatch(item.id, { priority: e.target.value })}
            className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
          >
            {PRIORITIES.map((p) => (
              <option key={p.key} value={p.key}>
                Priority: {p.label}
              </option>
            ))}
          </select>

          <select
            value={item.status}
            onChange={(e) => onPatch(item.id, { status: e.target.value })}
            className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
          >
            {STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                Status: {s.label}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={item.due_date || ""}
            onChange={(e) => onPatch(item.id, { due_date: e.target.value })}
            className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2 md:hidden">
          <button
            onClick={() =>
              onPatch(item.id, {
                status: item.status === "IN_PROGRESS" ? "TODO" : "IN_PROGRESS",
              })
            }
            className="rounded-2xl border border-cyan-500/35 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-500/15"
          >
            {item.status === "IN_PROGRESS" ? "Reset" : "Start"}
          </button>

          <button
            onClick={() => onArchive(item.id)}
            className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-300 hover:bg-slate-900/50"
          >
            Archive
          </button>

          <button
            onClick={() => onRemove(item.id)}
            className="rounded-2xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-200 hover:bg-rose-500/15"
          >
            Delete
          </button>
        </div>

        {overdue ? (
          <div className="text-xs font-semibold text-rose-200">
            Overdue — this should be reviewed first.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PlannerColumn({
  sectionKey,
  items,
  dragOverSection,
  onDropSection,
  onDropOnItem,
  onPatch,
  onToggleDone,
  onRemove,
  onArchive,
  onDragStart,
  onDragEnd,
}) {
  const meta = SECTION_META[sectionKey];

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => onDropSection(e, sectionKey)}
      className={cx(
        "rounded-3xl border p-4 transition",
        dragOverSection === sectionKey
          ? "border-cyan-500/40 bg-slate-900/80"
          : "border-slate-800 bg-slate-950/45"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={cx("rounded-full border px-2 py-1 text-[11px] font-semibold", meta.tone)}>
              {meta.label}
            </span>
            <span className="text-[11px] text-slate-500">{items.length}</span>
          </div>
          <div className="mt-2 text-xs leading-relaxed text-slate-400">{meta.helper}</div>
        </div>
      </div>

      <div className="mt-4 space-y-3 min-h-[140px]">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/30 p-4 text-center text-sm text-slate-500">
            Drag an item here
          </div>
        ) : (
          items.map((item) => (
            <TaskCard
              key={item.id}
              item={item}
              onPatch={onPatch}
              onToggleDone={onToggleDone}
              onRemove={onRemove}
              onArchive={onArchive}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDropOnItem={onDropOnItem}
              isDragActive={dragOverSection === sectionKey}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function TodoList({
  scope = "sbo",
  title = "Planner",
  subtitle = "Daily, weekly, monthly, yearly tasks and goals — now with drag-and-drop planning.",
}) {
  const { activeBusinessId } = useAuth();

  const storageKey = useMemo(() => {
    const biz = activeBusinessId || "no_biz";
    return `sw_planner_drag_v1_${scope}_${biz}`;
  }, [scope, activeBusinessId]);

  const [items, setItems] = useState([]);
  const [showCompleted, setShowCompleted] = useState(true);
  const [search, setSearch] = useState("");
  const [draggingId, setDraggingId] = useState("");
  const [dragOverSection, setDragOverSection] = useState("");

  const [draft, setDraft] = useState({
    title: "",
    notes: "",
    cadence: "DAILY",
    priority: "MED",
    status: "TODO",
    due_date: ymd(new Date()),
    section: "TODAY",
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      const safe = Array.isArray(parsed)
        ? parsed.map((x) => ({
            ...x,
            archived: !!x.archived,
            section: x.section && SECTION_META[x.section] ? x.section : inferSection(x),
          }))
        : [];
      setItems(safe);
    } catch {
      setItems([]);
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      // ignore localStorage issues
    }
  }, [items, storageKey]);

  function resetDraft(nextSection = "TODAY") {
    setDraft({
      title: "",
      notes: "",
      cadence: normalizeCadenceFromSection(nextSection),
      priority: "MED",
      status: "TODO",
      due_date: ymd(new Date()),
      section: nextSection,
    });
  }

  function addItem() {
    const clean = (draft.title || "").trim();
    if (!clean) return;

    const nextSection = draft.section || "TODAY";
    const nextCadence = draft.cadence || normalizeCadenceFromSection(nextSection);

    const next = {
      id: uid(),
      title: clean,
      notes: (draft.notes || "").trim(),
      cadence: nextCadence,
      priority: draft.priority || "MED",
      status: draft.status || "TODO",
      due_date: draft.due_date || "",
      section: nextSection,
      order: Date.now(),
      archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: draft.status === "DONE" ? new Date().toISOString() : "",
    };

    setItems((prev) => [next, ...prev]);
    resetDraft(nextSection);
  }

  function patchItem(id, patch) {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const next = { ...it, ...patch, updated_at: new Date().toISOString() };

        if (patch.status === "DONE" && !it.completed_at) next.completed_at = new Date().toISOString();
        if (patch.status && patch.status !== "DONE") next.completed_at = "";

        if (patch.section && !patch.cadence) {
          next.cadence = normalizeCadenceFromSection(patch.section);
        }

        return next;
      })
    );
  }

  function toggleDone(id) {
    const item = items.find((x) => x.id === id);
    if (!item) return;
    patchItem(id, { status: item.status === "DONE" ? "TODO" : "DONE" });
  }

  function remove(id) {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  function archiveItem(id) {
    setItems((prev) =>
      prev.map((x) => (x.id === id ? { ...x, archived: true, updated_at: new Date().toISOString() } : x))
    );
  }

  function archiveCompleted() {
    setItems((prev) =>
      prev.map((x) =>
        x.status === "DONE" ? { ...x, archived: true, updated_at: new Date().toISOString() } : x
      )
    );
  }

  function clearArchived() {
    setItems((prev) => prev.filter((x) => !x.archived));
  }

  function clearAllDone() {
    setItems((prev) => prev.filter((x) => x.status !== "DONE"));
  }

  function onDragStart(e, id) {
    setDraggingId(id);
    try {
      e.dataTransfer.setData("text/plain", id);
      e.dataTransfer.effectAllowed = "move";
    } catch {
      // ignore
    }
  }

  function onDragEnd() {
    setDraggingId("");
    setDragOverSection("");
  }

  function moveItemToSection(itemId, sectionKey, beforeId = null) {
    setItems((prev) => {
      const next = [...prev];
      const movingIndex = next.findIndex((x) => x.id === itemId);
      if (movingIndex === -1) return prev;

      const moving = {
        ...next[movingIndex],
        section: sectionKey,
        cadence: normalizeCadenceFromSection(sectionKey),
        updated_at: new Date().toISOString(),
      };

      next.splice(movingIndex, 1);

      if (!beforeId) {
        const insertIndex = next.findLastIndex?.((x) => x.section === sectionKey && !x.archived);
        if (insertIndex >= 0) {
          next.splice(insertIndex + 1, 0, moving);
        } else {
          next.push(moving);
        }
        return next;
      }

      const beforeIndex = next.findIndex((x) => x.id === beforeId);
      if (beforeIndex === -1) {
        next.push(moving);
      } else {
        next.splice(beforeIndex, 0, moving);
      }
      return next;
    });
  }

  function handleDropSection(e, sectionKey) {
    e.preventDefault();
    const droppedId = draggingId || e.dataTransfer.getData("text/plain");
    if (!droppedId) return;
    moveItemToSection(droppedId, sectionKey);
    setDraggingId("");
    setDragOverSection("");
  }

  function handleDropOnItem(e, targetId) {
    e.preventDefault();
    const droppedId = draggingId || e.dataTransfer.getData("text/plain");
    if (!droppedId || droppedId === targetId) return;

    const target = items.find((x) => x.id === targetId);
    if (!target) return;

    moveItemToSection(droppedId, target.section || inferSection(target), targetId);
    setDraggingId("");
    setDragOverSection("");
  }

  const activeItems = useMemo(() => items.filter((x) => !x.archived), [items]);
  const archivedItems = useMemo(() => items.filter((x) => x.archived), [items]);

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activeItems.filter((x) => {
      if (!showCompleted && x.status === "DONE") return false;
      if (!q) return true;
      return (
        (x.title || "").toLowerCase().includes(q) ||
        (x.notes || "").toLowerCase().includes(q) ||
        (x.cadence || "").toLowerCase().includes(q) ||
        (x.section || "").toLowerCase().includes(q)
      );
    });
  }, [activeItems, showCompleted, search]);

  const sectioned = useMemo(() => {
    const base = { TODAY: [], WEEK: [], MONTH: [], GOALS: [] };

    const weighted = [...visibleItems].sort((a, b) => {
      const overdueA = isOverdue(a.due_date, a.status) ? 0 : 1;
      const overdueB = isOverdue(b.due_date, b.status) ? 0 : 1;
      if (overdueA !== overdueB) return overdueA - overdueB;

      const statusWeight = { IN_PROGRESS: 0, TODO: 1, DONE: 2 };
      const priorityWeight = { HIGH: 0, MED: 1, LOW: 2 };

      const sa = statusWeight[a.status] ?? 9;
      const sb = statusWeight[b.status] ?? 9;
      if (sa !== sb) return sa - sb;

      const pa = priorityWeight[a.priority] ?? 9;
      const pb = priorityWeight[b.priority] ?? 9;
      if (pa !== pb) return pa - pb;

      const ad = a.due_date || "9999-99-99";
      const bd = b.due_date || "9999-99-99";
      if (ad !== bd) return ad.localeCompare(bd);

      const at = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const bt = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return bt - at;
    });

    weighted.forEach((item) => {
      const sec = item.section && SECTION_META[item.section] ? item.section : inferSection(item);
      base[sec].push(item);
    });

    return base;
  }, [visibleItems]);

  const stats = useMemo(() => {
    const total = activeItems.length;
    const done = activeItems.filter((x) => x.status === "DONE").length;
    const inProgress = activeItems.filter((x) => x.status === "IN_PROGRESS").length;
    const overdue = activeItems.filter((x) => isOverdue(x.due_date, x.status)).length;
    return { total, done, inProgress, overdue };
  }, [activeItems]);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/45 p-4 sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="text-lg font-extrabold text-slate-100">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-slate-400">{subtitle}</div> : null}
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[11px] text-cyan-200">
              Drag + drop
            </span>
            <span className="rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 py-1 text-[11px] text-fuchsia-200">
              One-page planner
            </span>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-200">
              Business scoped
            </span>
          </div>
        </div>

        <div className="grid w-full gap-2 sm:grid-cols-2 xl:w-[360px]">
          <StatCard label="Active" value={stats.total} />
          <StatCard label="Done" value={stats.done} tone="emerald" />
          <StatCard label="In Progress" value={stats.inProgress} tone="cyan" />
          <StatCard label="Overdue" value={stats.overdue} tone="amber" />
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-12">
        {/* Left controls */}
        <div className="space-y-4 xl:col-span-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/55 p-4">
            <div className="text-sm font-semibold text-slate-100">Quick add</div>
            <div className="mt-1 text-xs text-slate-400">
              Add a task, project item, recurring item, or long-term goal.
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[11px] text-slate-400">Title</label>
                <input
                  value={draft.title}
                  onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Call hot lead / Finish quotes / Monthly P&L / 2026 revenue target"
                  className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-cyan-500/50"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      addItem();
                    }
                  }}
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400">Notes</label>
                <textarea
                  rows={3}
                  value={draft.notes}
                  onChange={(e) => setDraft((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Optional details, next steps, reminders..."
                  className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-cyan-500/50"
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] text-slate-400">Planner section</label>
                  <select
                    value={draft.section}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        section: e.target.value,
                        cadence: normalizeCadenceFromSection(e.target.value),
                      }))
                    }
                    className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm"
                  >
                    <option value="TODAY">Today</option>
                    <option value="WEEK">This Week</option>
                    <option value="MONTH">This Month</option>
                    <option value="GOALS">Goals</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400">Priority</label>
                  <select
                    value={draft.priority}
                    onChange={(e) => setDraft((prev) => ({ ...prev, priority: e.target.value }))}
                    className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] text-slate-400">Status</label>
                  <select
                    value={draft.status}
                    onChange={(e) => setDraft((prev) => ({ ...prev, status: e.target.value }))}
                    className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm"
                  >
                    {STATUSES.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400">Due date</label>
                  <input
                    type="date"
                    value={draft.due_date}
                    onChange={(e) => setDraft((prev) => ({ ...prev, due_date: e.target.value }))}
                    className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={addItem}
                  className="rounded-2xl border border-cyan-500/40 bg-cyan-500/15 px-4 py-2.5 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/20"
                >
                  + Add item
                </button>
                <button
                  onClick={() => resetDraft(draft.section)}
                  className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-900/50"
                >
                  Reset
                </button>
              </div>

              <div className="text-[11px] leading-relaxed text-slate-500">
                Drag cards between planner sections anytime. Moving a card also updates its default cadence.
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/55 p-4">
            <div className="text-sm font-semibold text-slate-100">Planner controls</div>

            <div className="mt-3 space-y-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks, notes, goals..."
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-cyan-500/50"
              />

              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={showCompleted}
                  onChange={(e) => setShowCompleted(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950"
                />
                Show completed items
              </label>

              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  onClick={archiveCompleted}
                  className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-300 hover:bg-slate-900/50"
                >
                  Archive done
                </button>
                <button
                  onClick={clearAllDone}
                  className="rounded-2xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-200 hover:bg-rose-500/15"
                >
                  Delete done
                </button>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-400">
                Archived: <span className="font-semibold text-slate-200">{archivedItems.length}</span>
                <button
                  onClick={clearArchived}
                  className="ml-3 rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-900/50"
                >
                  Clear archived
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="text-sm font-semibold text-slate-100">How to use it</div>
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
                <span className="font-semibold text-slate-100">Today:</span> urgent items, callbacks, day-of execution.
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
                <span className="font-semibold text-slate-100">This Week:</span> active work that should move soon.
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
                <span className="font-semibold text-slate-100">This Month:</span> planning, admin, monthly actions.
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
                <span className="font-semibold text-slate-100">Goals:</span> bigger outcomes, milestones, yearly direction.
              </div>
            </div>
          </div>
        </div>

        {/* Drag-drop planner */}
        <div className="space-y-4 xl:col-span-8">
          {visibleItems.length === 0 ? (
            <EmptyState
              title="No planner items yet"
              subtitle="Add your first item on the left and organize it by dragging between sections."
            />
          ) : null}

          <div className="grid gap-4 xl:grid-cols-2">
            <PlannerColumn
              sectionKey="TODAY"
              items={sectioned.TODAY}
              dragOverSection={dragOverSection}
              onDropSection={handleDropSection}
              onDropOnItem={handleDropOnItem}
              onPatch={patchItem}
              onToggleDone={toggleDone}
              onRemove={remove}
              onArchive={archiveItem}
              onDragStart={(e, id) => {
                setDragOverSection("TODAY");
                onDragStart(e, id);
              }}
              onDragEnd={onDragEnd}
            />

            <PlannerColumn
              sectionKey="WEEK"
              items={sectioned.WEEK}
              dragOverSection={dragOverSection}
              onDropSection={handleDropSection}
              onDropOnItem={handleDropOnItem}
              onPatch={patchItem}
              onToggleDone={toggleDone}
              onRemove={remove}
              onArchive={archiveItem}
              onDragStart={(e, id) => {
                setDragOverSection("WEEK");
                onDragStart(e, id);
              }}
              onDragEnd={onDragEnd}
            />

            <PlannerColumn
              sectionKey="MONTH"
              items={sectioned.MONTH}
              dragOverSection={dragOverSection}
              onDropSection={handleDropSection}
              onDropOnItem={handleDropOnItem}
              onPatch={patchItem}
              onToggleDone={toggleDone}
              onRemove={remove}
              onArchive={archiveItem}
              onDragStart={(e, id) => {
                setDragOverSection("MONTH");
                onDragStart(e, id);
              }}
              onDragEnd={onDragEnd}
            />

            <PlannerColumn
              sectionKey="GOALS"
              items={sectioned.GOALS}
              dragOverSection={dragOverSection}
              onDropSection={handleDropSection}
              onDropOnItem={handleDropOnItem}
              onPatch={patchItem}
              onToggleDone={toggleDone}
              onRemove={remove}
              onArchive={archiveItem}
              onDragStart={(e, id) => {
                setDragOverSection("GOALS");
                onDragStart(e, id);
              }}
              onDragEnd={onDragEnd}
            />
          </div>
        </div>
      </div>
    </div>
  );
}