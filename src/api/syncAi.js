import api, { getActiveBusinessId } from "./client";

function normalizeWorkspace(workspace) {
  return String(workspace || "personal").toLowerCase() === "business" ? "business" : "personal";
}

function requireBusiness(workspace) {
  if (workspace === "business" && !getActiveBusinessId()) {
    const error = new Error("Choose an active business before using Business SYNC.");
    error.code = "SYNC_BUSINESS_REQUIRED";
    throw error;
  }
}

function rowsOf(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

function dailyStateAsBriefing(payload = {}) {
  const attention = Array.isArray(payload?.needs_attention) ? payload.needs_attention : [];
  const sections = Array.isArray(payload?.briefing_sections) ? [...payload.briefing_sections] : [];
  const recommended = payload?.recommended_next;
  if (recommended?.title) {
    sections.unshift({ id: "recommended_next", title: "Recommended next", summary: `${recommended.title}. ${recommended.detail || ""}`.trim(), priority: recommended.priority || "normal", details_url: recommended?.action?.url || "", actions: recommended?.action ? [recommended.action] : [], count: attention.length });
  }
  return { ...payload, sections, total_updates: Number(payload?.total_updates ?? sections.length), high_priority_count: Number(payload?.high_priority_count ?? attention.filter((item) => ["urgent", "high"].includes(item?.priority)).length) };
}

const LOCAL_PHRASES = ["near me", "nearby", "around here", "closest", "find somewhere", "where can i", "restaurant", "food", "lunch", "dinner", "coffee", "sushi", "buy", "store", "shop", "sporting goods", "barber", "salon", "mechanic", "things to do", "playground", "museum"];

function looksLocal(message) {
  const text = String(message || "").toLowerCase();
  return LOCAL_PHRASES.some((phrase) => text.includes(phrase));
}

function browserCoordinates() {
  return new Promise((resolve) => {
    if (!navigator?.geolocation) return resolve({});
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude, current_label: "Current location" }),
      () => resolve({}),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 120000 }
    );
  });
}

export async function getSyncAiStatus() {
  const response = await api.get("/sync-ai/status/");
  return response?.data || {};
}
export async function getSyncDailyState() { const response = await api.get("/sync-ai/assistant/daily-state/"); return response?.data || {}; }
export async function getSyncAssistantProfile() { const response = await api.get("/sync-ai/assistant/profile/"); return response?.data || {}; }
export async function patchSyncAssistantProfile(payload = {}) { const response = await api.patch("/sync-ai/assistant/profile/", payload); return response?.data || {}; }
export async function getSyncRoleAwareBriefing() { try { return dailyStateAsBriefing(await getSyncDailyState()); } catch { const response = await api.get("/sync-ai/briefing/"); return response?.data || {}; } }
export async function getSyncGodModeBriefing() { const response = await api.get("/sync-ai/briefing/god-mode/"); return response?.data || {}; }

export async function sendSyncAiMessage({ message, workspace = "personal" }) {
  const normalizedWorkspace = normalizeWorkspace(workspace);
  requireBusiness(normalizedWorkspace);
  const cleanMessage = String(message || "").trim();

  if (normalizedWorkspace === "personal" && looksLocal(cleanMessage)) {
    const coordinates = await browserCoordinates();
    try {
      const localResponse = await api.post("/sync-ai/local-intelligence/", { message: cleanMessage, workspace: normalizedWorkspace, ...coordinates });
      if (localResponse?.data?.handled) return { ...localResponse.data, workspace: normalizedWorkspace, model: "SYNC Local" };
    } catch (error) {
      if (![404, 405].includes(Number(error?.response?.status || 0))) throw error;
    }
  }

  const response = await api.post("/sync-ai/chat/", { workspace: normalizedWorkspace, message: cleanMessage });
  return response?.data || {};
}

export async function prepareSyncActionDraft({ actionType, instruction, workspace = "personal" }) {
  const normalizedWorkspace = normalizeWorkspace(workspace); requireBusiness(normalizedWorkspace);
  const response = await api.post("/sync-ai/actions/prepare/", { workspace: normalizedWorkspace, action_type: String(actionType || "").trim(), instruction: String(instruction || "").trim() });
  return response?.data || {};
}
export async function listSyncReplyTickets() { const response = await api.get("/tickets/", { params: { archived: false } }); return rowsOf(response?.data); }
export async function executeSyncTicketReply({ ticketId, body, workspace = "personal", confirmed = false }) {
  const normalizedWorkspace = normalizeWorkspace(workspace); requireBusiness(normalizedWorkspace);
  const response = await api.post("/sync-ai/actions/ticket-reply/execute/", { workspace: normalizedWorkspace, ticket_id: Number(ticketId), body: String(body || "").trim(), confirmed: confirmed === true }); return response?.data || {};
}
export async function getSyncVoiceStatus() { const response = await api.get("/sync-ai/voice/status/"); return response?.data || {}; }
export async function synthesizeSyncSpeech(text) { const response = await api.post("/sync-ai/voice/synthesize/", { text: String(text || "").trim() }, { responseType: "blob" }); return response?.data; }

export function getSyncAiErrorMessage(error) {
  if (error?.code === "SYNC_BUSINESS_REQUIRED") return error.message;
  const status = Number(error?.response?.status || 0); const detail = String(error?.response?.data?.detail || "").trim();
  if (status === 400) return detail || "Review the SYNC request and try again.";
  if (status === 401) return "Your session expired. Sign in again, then reopen the SYNC briefing.";
  if (status === 403) return detail || "You do not have access to that SYNC report.";
  if (status === 404) return detail || "The SYNC briefing endpoint is not available on the current backend deployment.";
  if (status === 429) return "SYNC is receiving too many requests. Try again shortly.";
  if (status === 502 || status === 503) return detail || "SYNC is temporarily unavailable while the backend is starting or redeploying.";
  if (!error?.response) return "SYNC could not contact the backend. The server may be waking up, redeploying, or blocked by the current session.";
  return detail || `SYNC could not complete that request${status ? ` (HTTP ${status})` : ""}.`;
}
