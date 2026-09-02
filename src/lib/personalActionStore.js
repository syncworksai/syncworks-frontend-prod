export const TASK_STORAGE_KEY = "syncworks.personal.tasks.v1";
export const LIST_STORAGE_KEY = "syncworks.personal.lists.v1";

export function uid(prefix = "item") {
  return globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function readJson(key, fallback = []) {
  if (typeof window === "undefined") return fallback;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "null");
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function readTasks() {
  const tasks = readJson(TASK_STORAGE_KEY, []);
  return Array.isArray(tasks) ? tasks : [];
}

export function readLists() {
  const lists = readJson(LIST_STORAGE_KEY, []);
  return Array.isArray(lists) ? lists : [];
}

export function writeTasks(tasks) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(Array.isArray(tasks) ? tasks : []));
  window.dispatchEvent(new CustomEvent("syncworks:personal-actions-changed"));
}

export function writeLists(lists) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LIST_STORAGE_KEY, JSON.stringify(Array.isArray(lists) ? lists : []));
  window.dispatchEvent(new CustomEvent("syncworks:personal-actions-changed"));
}

export function addTask(input = {}) {
  const tasks = readTasks();
  const task = {
    id: input.id || uid("task"),
    title: String(input.title || "Untitled task").trim(),
    done: false,
    source: input.source || "PERSONAL",
    list_id: input.list_id || "",
    due_ymd: input.due_ymd || "",
    priority: input.priority || "NORMAL",
    reason: input.reason || "",
    route: input.route || "",
    created_at: new Date().toISOString(),
  };
  writeTasks([task, ...tasks]);
  return task;
}

export function upsertList(input = {}) {
  const lists = readLists();
  const existingIndex = input.id ? lists.findIndex((item) => item.id === input.id) : -1;
  const next = {
    id: input.id || uid("list"),
    title: String(input.title || "New list").trim(),
    type: input.type || "GENERAL",
    source: input.source || "PERSONAL",
    reason: input.reason || "",
    route: input.route || "",
    created_at: input.created_at || new Date().toISOString(),
    items: Array.isArray(input.items) ? input.items : [],
  };
  const updated = [...lists];
  if (existingIndex >= 0) updated[existingIndex] = { ...lists[existingIndex], ...next };
  else updated.unshift(next);
  writeLists(updated);
  return next;
}
