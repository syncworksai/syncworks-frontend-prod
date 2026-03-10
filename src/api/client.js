// src/api/client.js
import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  "http://127.0.0.1:8000/api/v1";

const TOKEN_KEY = "sw_token";
const ACTIVE_BIZ_KEY = "sw_active_business_id";

// ----------------------
// Token helpers
// ----------------------
export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// Backwards compatibility
export function setAuthToken(token) {
  return setToken(token);
}

// ----------------------
// Business context helpers
// ----------------------
export function getActiveBusinessId() {
  return localStorage.getItem(ACTIVE_BIZ_KEY) || "";
}

export function setActiveBusinessId(id) {
  if (!id) localStorage.removeItem(ACTIVE_BIZ_KEY);
  else localStorage.setItem(ACTIVE_BIZ_KEY, String(id).trim());
  try {
    window.dispatchEvent(new Event("sw:activeBusinessChanged"));
  } catch {
    // ignore
  }
}

export function clearActiveBusinessId() {
  localStorage.removeItem(ACTIVE_BIZ_KEY);
  try {
    window.dispatchEvent(new Event("sw:activeBusinessChanged"));
  } catch {
    // ignore
  }
}

function resolveBusinessId() {
  const fromLS = (getActiveBusinessId() || "").trim();
  if (fromLS) return fromLS;

  const fromWindow = (String(window?.__sw_active_business_id || "") || "").trim();
  if (fromWindow) return fromWindow;

  const last = (String(localStorage.getItem("sw_last_business_id") || "") || "").trim();
  if (last) return last;

  return "";
}

function isSalesRequest(config) {
  const url = String(config?.url || "");
  if (url.startsWith("/sales/")) return true;
  if (url === "/sales") return true;
  if (url.includes("/api/v1/sales/")) return true;
  return false;
}

function isPlatformRequest(config) {
  const url = String(config?.url || "");
  if (url.startsWith("/platform/")) return true;
  if (url === "/platform") return true;
  if (url.includes("/api/v1/platform/")) return true;
  return false;
}

// ✅ NEW: Me-scoped endpoints should never send X-Business-Id
function isMeScopedRequest(config) {
  const url = String(config?.url || "");
  if (url.startsWith("/me/")) return true;
  if (url === "/me") return true;
  if (url.includes("/api/v1/me/")) return true;
  return false;
}

// ----------------------
// Trailing slash safety
// ----------------------
function isAbsoluteUrl(u) {
  return /^https?:\/\//i.test(String(u || ""));
}

function ensureTrailingSlash(urlRaw) {
  const url = String(urlRaw || "");
  if (!url) return url;

  // Only normalize relative API paths (the ones we pass to axios like "/billing/status/")
  if (!url.startsWith("/")) return url;
  if (isAbsoluteUrl(url)) return url;

  // If it already ends with "/", keep it
  if (url.endsWith("/")) return url;

  // If it contains a "?" add slash before querystring
  const qIndex = url.indexOf("?");
  if (qIndex >= 0) {
    const path = url.slice(0, qIndex);
    const qs = url.slice(qIndex);
    if (path.endsWith("/")) return path + qs;
    return path + "/" + qs;
  }

  // Avoid touching file-like paths (rare, but safe)
  const lastSeg = url.split("/").filter(Boolean).pop() || "";
  if (lastSeg.includes(".")) return url;

  return url + "/";
}

// ----------------------
// Axios instance
// ----------------------
const api = axios.create({
  baseURL,
  timeout: 20000,
});

// ----------------------
// Request Interceptor
// ----------------------
api.interceptors.request.use(
  (config) => {
    config.headers = config.headers || {};

    // ✅ Canonical trailing slash (prevents 301 redirect auth-header drop)
    if (config?.url) {
      config.url = ensureTrailingSlash(config.url);
    }

    // Auth
    const token = getToken();
    if (token) config.headers.Authorization = `Token ${token}`;

    // ✅ Never send X-Business-Id for Sales OS OR God Mode OR /me/*
    if (!isSalesRequest(config) && !isPlatformRequest(config) && !isMeScopedRequest(config)) {
      const bizId = resolveBusinessId();
      if (bizId) {
        config.headers["X-Business-Id"] = String(bizId).trim();
        localStorage.setItem("sw_last_business_id", String(bizId).trim());
      }
    } else {
      delete config.headers["X-Business-Id"];
    }

    // Content-Type handling
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    } else if (
      config.data &&
      typeof config.data === "object" &&
      !(config.data instanceof Blob) &&
      !(config.data instanceof ArrayBuffer)
    ) {
      config.headers["Content-Type"] = "application/json";
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ----------------------
// Response Interceptor
// ----------------------
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;

    // 401 => log out locally
    if (status === 401) {
      clearToken();
      clearActiveBusinessId();
      try {
        window.dispatchEvent(new Event("sw:authChanged"));
      } catch {
        // ignore
      }
    }

    // 423 => billing locked (emit a lightweight global event for UI to react)
    if (status === 423) {
      try {
        const lock_reason =
          err?.response?.data?.lock_reason ||
          err?.response?.data?.reason ||
          err?.response?.data?.detail ||
          "LOCKED";
        window.dispatchEvent(new CustomEvent("sw:billingLocked", { detail: { lock_reason } }));
      } catch {
        // ignore
      }
    }

    return Promise.reject(err);
  }
);

export default api;