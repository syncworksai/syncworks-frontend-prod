import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  "http://127.0.0.1:8000/api/v1";

const TOKEN_KEY = "sw_token";
const ACTIVE_BIZ_KEY = "sw_active_business_id";
const LAST_BIZ_KEY = "sw_last_business_id";

function canUseWindow() {
  return typeof window !== "undefined";
}

function canUseStorage() {
  return canUseWindow() && typeof window.localStorage !== "undefined";
}

function dispatchWindowEvent(event) {
  if (!canUseWindow()) return;
  try { window.dispatchEvent(event); } catch { /* non-critical */ }
}

export function getToken() {
  if (!canUseStorage()) return "";
  try { return localStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; }
}

export function setToken(token) {
  if (!canUseStorage()) return;
  try {
    const cleanedToken = String(token || "").trim();
    if (cleanedToken) localStorage.setItem(TOKEN_KEY, cleanedToken);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* non-critical */ }
}

export function clearToken() {
  if (!canUseStorage()) return;
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* non-critical */ }
}

export function setAuthToken(token) { setToken(token); }

export function getActiveBusinessId() {
  if (!canUseStorage()) return "";
  try { return localStorage.getItem(ACTIVE_BIZ_KEY) || ""; } catch { return ""; }
}

export function setActiveBusinessId(id) {
  if (canUseStorage()) {
    try {
      const cleaned = String(id || "").trim();
      if (!cleaned) localStorage.removeItem(ACTIVE_BIZ_KEY);
      else {
        localStorage.setItem(ACTIVE_BIZ_KEY, cleaned);
        localStorage.setItem(LAST_BIZ_KEY, cleaned);
      }
    } catch { /* non-critical */ }
  }
  dispatchWindowEvent(new Event("sw:activeBusinessChanged"));
}

export function clearActiveBusinessId() {
  if (canUseStorage()) {
    try { localStorage.removeItem(ACTIVE_BIZ_KEY); } catch { /* non-critical */ }
  }
  dispatchWindowEvent(new Event("sw:activeBusinessChanged"));
}

function resolveBusinessId() {
  const fromLocalStorage = String(getActiveBusinessId() || "").trim();
  if (fromLocalStorage) return fromLocalStorage;
  if (canUseWindow()) {
    const fromWindow = String(window.__sw_active_business_id || "").trim();
    if (fromWindow) return fromWindow;
  }
  if (canUseStorage()) {
    try {
      const lastBusinessId = String(localStorage.getItem(LAST_BIZ_KEY) || "").trim();
      if (lastBusinessId) return lastBusinessId;
    } catch { /* non-critical */ }
  }
  return "";
}

function normalizedPath(config) {
  const raw = String(config?.url || "");
  try {
    const parsed = new URL(raw, baseURL);
    return parsed.pathname.replace(/^\/api\/v1/, "") || "/";
  } catch {
    return raw.replace(/^\/api\/v1/, "") || "/";
  }
}

function methodOf(config) { return String(config?.method || "get").toLowerCase(); }
function isSalesRequest(config) { const p = normalizedPath(config); return p === "/sales" || p.startsWith("/sales/"); }
function isPlatformRequest(config) { const p = normalizedPath(config); return p === "/platform" || p === "/platform-growth" || p === "/platform-affiliates" || p.startsWith("/platform/") || p.startsWith("/platform-growth/") || p.startsWith("/platform-affiliates/"); }
function isTenantRequest(config) { const p = normalizedPath(config); return p === "/tenant" || p.startsWith("/tenant/"); }
function isInvestorRequest(config) { const p = normalizedPath(config); return p === "/investor" || p.startsWith("/investor/"); }
function isMeScopedRequest(config) {
  const p = normalizedPath(config);
  return p === "/me" || p.startsWith("/me/") || p === "/customer-health" || p.startsWith("/customer-health/") || p === "/edge" || p.startsWith("/edge/");
}
function isUserScopedAuthRequest(config) {
  const p = normalizedPath(config);
  return p === "/auth" || p.startsWith("/auth/") || p.startsWith("/auth/register") || p.startsWith("/auth/login") || p.startsWith("/auth/logout") || p.startsWith("/auth/me") || p.startsWith("/auth/email/") || p.startsWith("/auth/resolve-signup-codes") || p.startsWith("/auth/upgrade-to-sbo-promo");
}
function isPublicAuthRequest(config) { const p = normalizedPath(config); return p.startsWith("/auth/login") || p.startsWith("/auth/register") || p.startsWith("/auth/email/") || p.startsWith("/auth/resolve-signup-codes"); }
function isAuthMeRequest(config) { const p = normalizedPath(config); return p === "/auth/me" || p === "/auth/me/"; }
function isLogoutRequest(config) { const p = normalizedPath(config); return p === "/auth/logout" || p === "/auth/logout/"; }
function isCustomerServiceRequestCreate(config) {
  const p = normalizedPath(config);
  return methodOf(config) === "post" && (p === "/service-requests" || p === "/service-requests/");
}
function shouldExcludeBusinessContext(config) { return isSalesRequest(config) || isPlatformRequest(config) || isTenantRequest(config) || isInvestorRequest(config) || isMeScopedRequest(config) || isUserScopedAuthRequest(config) || isCustomerServiceRequestCreate(config); }
function isAbsoluteUrl(value) { return /^https?:\/\//i.test(String(value || "")); }
function ensureTrailingSlash(urlRaw) {
  const url = String(urlRaw || "");
  if (!url || !url.startsWith("/") || isAbsoluteUrl(url) || url.endsWith("/")) return url;
  const queryIndex = url.indexOf("?");
  if (queryIndex >= 0) {
    const path = url.slice(0, queryIndex);
    const queryString = url.slice(queryIndex);
    return path.endsWith("/") ? path + queryString : `${path}/${queryString}`;
  }
  const lastSegment = url.split("/").filter(Boolean).pop() || "";
  if (lastSegment.includes(".")) return url;
  return `${url}/`;
}

export function getApiErrorStatus(error) {
  const status = Number(error?.response?.status || 0);
  return Number.isFinite(status) ? status : 0;
}
export function isUnauthorizedError(error) { return getApiErrorStatus(error) === 401; }
export function isNetworkLikeError(error) {
  if (!error || !error.response) return true;
  return [408, 425, 429, 500, 502, 503, 504].includes(getApiErrorStatus(error));
}

const api = axios.create({ baseURL, timeout: 20000 });

api.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  if (config?.url) config.url = ensureTrailingSlash(config.url);
  const token = getToken();
  if (token) config.headers.Authorization = `Token ${token}`;
  else delete config.headers.Authorization;
  if (shouldExcludeBusinessContext(config)) {
    delete config.headers["X-Business-Id"];
    delete config.headers["x-business-id"];
  } else {
    const businessId = resolveBusinessId();
    if (businessId) {
      const cleaned = String(businessId).trim();
      config.headers["X-Business-Id"] = cleaned;
      if (canUseStorage()) {
        try { localStorage.setItem(LAST_BIZ_KEY, cleaned); } catch { /* non-critical */ }
      }
    } else {
      delete config.headers["X-Business-Id"];
      delete config.headers["x-business-id"];
    }
  }
  const isFormData = typeof FormData !== "undefined" && config.data instanceof FormData;
  const isBlob = typeof Blob !== "undefined" && config.data instanceof Blob;
  const isArrayBuffer = typeof ArrayBuffer !== "undefined" && config.data instanceof ArrayBuffer;
  if (isFormData) delete config.headers["Content-Type"];
  else if (config.data && typeof config.data === "object" && !isBlob && !isArrayBuffer) config.headers["Content-Type"] = "application/json";
  return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use((response) => response, (error) => {
  const status = getApiErrorStatus(error);
  const config = error?.config || {};
  const path = normalizedPath(config);
  const token = getToken();
  if (status === 401 && token && !isPublicAuthRequest(config) && !isLogoutRequest(config)) {
    dispatchWindowEvent(new CustomEvent("sw:authUnauthorized", { detail: { path, method: methodOf(config), isAuthMe: isAuthMeRequest(config) } }));
  }
  if (status === 423) {
    const lockReason = error?.response?.data?.lock_reason || error?.response?.data?.reason || error?.response?.data?.detail || "LOCKED";
    dispatchWindowEvent(new CustomEvent("sw:billingLocked", { detail: { lock_reason: lockReason } }));
  }
  return Promise.reject(error);
});

export default api;
