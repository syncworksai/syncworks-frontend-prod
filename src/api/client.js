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

  const last = (
    String(localStorage.getItem("sw_last_business_id") || "") || ""
  ).trim();
  if (last) return last;

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

function methodOf(config) {
  return String(config?.method || "get").toLowerCase();
}

function isSalesRequest(config) {
  const path = normalizedPath(config);
  return path === "/sales" || path.startsWith("/sales/");
}

function isPlatformRequest(config) {
  const path = normalizedPath(config);
  return (
    path === "/platform" ||
    path === "/platform-growth" ||
    path.startsWith("/platform/") ||
    path.startsWith("/platform-growth/")
  );
}

function isTenantRequest(config) {
  const path = normalizedPath(config);
  return path === "/tenant" || path.startsWith("/tenant/");
}

function isInvestorRequest(config) {
  const path = normalizedPath(config);
  return path === "/investor" || path.startsWith("/investor/");
}

// Me-scoped endpoints should never send X-Business-Id
function isMeScopedRequest(config) {
  const path = normalizedPath(config);

  return (
    path === "/me" ||
    path.startsWith("/me/") ||
    path === "/customer-health" ||
    path.startsWith("/customer-health/")
  );
}

// Auth endpoints that must stay user-scoped only
function isUserScopedAuthRequest(config) {
  const path = normalizedPath(config);

  return (
    path.startsWith("/auth/upgrade-to-sbo-promo") ||
    path.startsWith("/auth/register") ||
    path.startsWith("/auth/login") ||
    path.startsWith("/auth/logout") ||
    path.startsWith("/auth/me")
  );
}

// Customer marketplace intake should not be forced into active business context.
// This prevents customer-created marketplace requests from accidentally carrying
// an old SBO X-Business-Id header.
function isCustomerServiceRequestCreate(config) {
  const path = normalizedPath(config);
  const method = methodOf(config);

  return method === "post" && (path === "/service-requests/" || path === "/service-requests");
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

  if (!url.startsWith("/")) return url;
  if (isAbsoluteUrl(url)) return url;

  if (url.endsWith("/")) return url;

  const qIndex = url.indexOf("?");
  if (qIndex >= 0) {
    const path = url.slice(0, qIndex);
    const qs = url.slice(qIndex);

    if (path.endsWith("/")) return path + qs;
    return path + "/" + qs;
  }

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

    if (config?.url) {
      config.url = ensureTrailingSlash(config.url);
    }

    const token = getToken();
    if (token) config.headers.Authorization = `Token ${token}`;

    // Never send X-Business-Id for user/customer scoped flows.
    if (
      !isSalesRequest(config) &&
      !isPlatformRequest(config) &&
      !isTenantRequest(config) &&
      !isInvestorRequest(config) &&
      !isMeScopedRequest(config) &&
      !isUserScopedAuthRequest(config) &&
      !isCustomerServiceRequestCreate(config)
    ) {
      const bizId = resolveBusinessId();

      if (bizId) {
        config.headers["X-Business-Id"] = String(bizId).trim();
        localStorage.setItem("sw_last_business_id", String(bizId).trim());
      }
    } else {
      delete config.headers["X-Business-Id"];
    }

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

    if (status === 401) {
      clearToken();
      clearActiveBusinessId();

      try {
        window.dispatchEvent(new Event("sw:authChanged"));
      } catch {
        // ignore
      }
    }

    if (status === 423) {
      try {
        const lock_reason =
          err?.response?.data?.lock_reason ||
          err?.response?.data?.reason ||
          err?.response?.data?.detail ||
          "LOCKED";

        window.dispatchEvent(
          new CustomEvent("sw:billingLocked", {
            detail: { lock_reason },
          })
        );
      } catch {
        // ignore
      }
    }

    return Promise.reject(err);
  }
);

export default api;