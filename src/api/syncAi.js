import api, { getActiveBusinessId } from "./client";

export async function getSyncAiStatus() {
  const response = await api.get("/sync-ai/status/");
  return response?.data || {};
}

export async function sendSyncAiMessage({ message, workspace = "personal" }) {
  const normalizedWorkspace =
    String(workspace || "personal").toLowerCase() === "business"
      ? "business"
      : "personal";

  if (normalizedWorkspace === "business" && !getActiveBusinessId()) {
    const error = new Error("Choose an active business before using Business SYNC.");
    error.code = "SYNC_BUSINESS_REQUIRED";
    throw error;
  }

  const response = await api.post("/sync-ai/chat/", {
    workspace: normalizedWorkspace,
    message: String(message || "").trim(),
  });

  return response?.data || {};
}

export function getSyncAiErrorMessage(error) {
  if (error?.code === "SYNC_BUSINESS_REQUIRED") return error.message;

  const status = Number(error?.response?.status || 0);
  const detail = String(error?.response?.data?.detail || "").trim();

  if (status === 403) {
    return detail || "You do not have access to that Business workspace.";
  }
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
