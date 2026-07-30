import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../../api/client";

const EVENT_NAME = "syncworks:business-settings-category-error";
const STORAGE_KEY = "syncworks_business_settings_category_error";

function isServiceCategoryRequest(error) {
  const method = String(error?.config?.method || "get").toLowerCase();
  const url = String(error?.config?.url || "");
  return method === "get" && /(^|\/)service-categories\/?(?:\?|$)/.test(url);
}

function errorDetail(error) {
  const data = error?.response?.data;
  if (typeof data === "string" && data.trim()) return data.trim();
  if (data && typeof data === "object") {
    return String(
      data.detail ||
        data.error ||
        data.message ||
        data.non_field_errors?.[0] ||
        "The service-category API returned an error."
    );
  }
  return error?.message || "The service-category request failed before a response was received.";
}

function publishFailure(error) {
  const failure = {
    endpoint: String(error?.config?.url || "/service-categories/"),
    status: Number(error?.response?.status || 0),
    detail: errorDetail(error),
    occurredAt: new Date().toISOString(),
  };

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(failure));
  } catch {
    // Session storage is optional; the custom event still updates the UI.
  }

  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: failure }));
  return failure;
}

// Install before the application mounts. A category failure must not discard a
// successfully loaded Business profile. The settings page can continue with an
// empty category list while displaying the exact failed endpoint and status.
if (!api.__syncworksBusinessSettingsGuardInstalled) {
  api.__syncworksBusinessSettingsGuardInstalled = true;
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (!isServiceCategoryRequest(error)) return Promise.reject(error);

      const failure = publishFailure(error);
      return Promise.resolve({
        data: [],
        status: failure.status || 503,
        statusText: "Service categories unavailable",
        headers: error?.response?.headers || {},
        config: error?.config || {},
        request: error?.request,
        syncworksRecoveredCategoryFailure: failure,
      });
    }
  );
}

function readStoredFailure() {
  try {
    const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

export default function BusinessSettingsLoadGuard() {
  const location = useLocation();
  const [failure, setFailure] = useState(readStoredFailure);
  const isBusinessSettings = location.pathname.replace(/\/+$/, "") === "/sbo/settings";

  useEffect(() => {
    function handleFailure(event) {
      setFailure(event?.detail || readStoredFailure());
    }

    window.addEventListener(EVENT_NAME, handleFailure);
    return () => window.removeEventListener(EVENT_NAME, handleFailure);
  }, []);

  if (!isBusinessSettings || !failure) return null;

  const statusLabel = failure.status ? `HTTP ${failure.status}` : "Network error";

  return (
    <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-[95] mx-auto max-w-3xl rounded-3xl border border-amber-400/45 bg-[#171006]/95 p-4 text-amber-50 shadow-2xl backdrop-blur-xl md:bottom-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-black">Business profile loaded; service choices need attention</div>
          <div className="mt-1 break-words text-xs leading-5 text-amber-100/85">
            {statusLabel} from {failure.endpoint}: {failure.detail}
          </div>
          <div className="mt-1 text-[11px] leading-4 text-amber-200/65">
            Your saved Business information remains available. Only the service-category list is unavailable.
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            try {
              sessionStorage.removeItem(STORAGE_KEY);
            } catch {
              // no-op
            }
            window.location.reload();
          }}
          className="min-h-11 shrink-0 rounded-2xl bg-amber-400 px-4 py-2 text-sm font-black text-black"
        >
          Retry services
        </button>
      </div>
    </div>
  );
}
