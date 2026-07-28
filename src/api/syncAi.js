import api, { getActiveBusinessId } from "./client";

function normalizeWorkspace(workspace) {
  return String(workspace || "personal").toLowerCase() === "business"
    ? "business"
    : "personal";
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

export async function getSyncAiStatus() {
  const response = await api.get("/sync-ai/status/");
  return response?.data || {};
}

export async function sendSyncAiMessage({ message, workspace = "personal" }) {
  const normalizedWorkspace = normalizeWorkspace(workspace);
  requireBusiness(normalizedWorkspace);

  const response = await api.post("/sync-ai/chat/", {
    workspace: normalizedWorkspace,
    message: String(message || "").trim(),
  });

  return response?.data || {};
}

export async function prepareSyncActionDraft({
  actionType,
  instruction,
  workspace = "personal",
}) {
  const normalizedWorkspace = normalizeWorkspace(workspace);
  requireBusiness(normalizedWorkspace);

  const response = await api.post("/sync-ai/actions/prepare/", {
    workspace: normalizedWorkspace,
    action_type: String(actionType || "").trim(),
    instruction: String(instruction || "").trim(),
  });

  return response?.data || {};
}

export async function listSyncReplyTickets() {
  const response = await api.get("/tickets/", {
    params: { archived: false },
  });
  return rowsOf(response?.data);
}

export async function executeSyncTicketReply({
  ticketId,
  body,
  workspace = "personal",
  confirmed = false,
}) {
  const normalizedWorkspace = normalizeWorkspace(workspace);
  requireBusiness(normalizedWorkspace);

  const response = await api.post("/sync-ai/actions/ticket-reply/execute/", {
    workspace: normalizedWorkspace,
    ticket_id: Number(ticketId),
    body: String(body || "").trim(),
    confirmed: confirmed === true,
  });

  return response?.data || {};
}

export function getSyncAiErrorMessage(error) {
  if (error?.code === "SYNC_BUSINESS_REQUIRED") return error.message;

  const status = Number(error?.response?.status || 0);
  const detail = String(error?.response?.data?.detail || "").trim();

  if (status === 400) return detail || "Review the SYNC request and try again.";
  if (status === 403) return detail || "You do not have access to that SYNC action.";
  if (status === 404) return detail || "The selected ticket could not be found.";
  if (status === 429) {
    return "SYNC is receiving too many requests. Try again shortly.";
  }
  if (status === 502 || status === 503) {
    return detail || "SYNC is temporarily unavailable. Please try again.";
  }
  if (!error?.response) {
    return "SYNC could not reach the server. Check your connection and try again.";
  }
  return detail || "SYNC could not complete that request.";
}
