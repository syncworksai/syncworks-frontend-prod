// src/api/healthProfileSyncQueue.js
const KEY = "syncworks_health_profile_sync_queue";
const EVENT = "syncworks:health-profile-sync";

function storageReady() {
  return typeof window !== "undefined" && window.localStorage;
}

function emit(items) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(EVENT, {
      detail: { pendingCount: items.length, items },
    }));
  } catch {
    // Non-critical UI event.
  }
}

export function getPendingHealthProfileSyncs() {
  if (!storageReady()) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(items) {
  if (!storageReady()) return;
  if (items.length) {
    localStorage.setItem(KEY, JSON.stringify(items));
  } else {
    localStorage.removeItem(KEY);
  }
  emit(items);
}

export function enqueueHealthProfileSync(type, payload) {
  const current = getPendingHealthProfileSyncs();
  const item = {
    id: String(type) + "-" + Date.now(),
    type,
    payload,
    attempts: 0,
    createdAt: new Date().toISOString(),
  };
  const next = [...current.filter((entry) => entry.type !== type), item];
  save(next);
  return item;
}

export function removeHealthProfileSync(id) {
  save(getPendingHealthProfileSyncs().filter((item) => item.id !== id));
}

export function updateHealthProfileSync(item) {
  save(getPendingHealthProfileSyncs().map((entry) => (
    entry.id === item.id ? item : entry
  )));
}

export function subscribeHealthProfileSync(listener) {
  if (typeof window === "undefined") return () => {};
  const handler = (event) => listener?.(event?.detail || {});
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
