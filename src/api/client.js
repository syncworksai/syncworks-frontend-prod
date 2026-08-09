import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  "http://127.0.0.1:8000/api/v1";

const TOKEN_KEY = "sw_token";
const ACTIVE_BIZ_KEY = "sw_active_business_id";
const LAST_BIZ_KEY = "sw_last_business_id";

// ----------------------
// Safe browser helpers
// ----------------------
function canUseWindow() {
  return typeof window !== "undefined";
}

function canUseStorage() {
  return (
    canUseWindow() &&
    typeof window.localStorage !== "undefined"
  );
}

function dispatchWindowEvent(event) {
  if (!canUseWindow()) return;

  try {
    window.dispatchEvent(event);
  } catch {
    // Browser event dispatch is non-critical.
  }
}

// ----------------------
// Token helpers
// ----------------------
export function getToken() {
  if (!canUseStorage()) return "";

  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function setToken(token) {
  if (!canUseStorage()) return;

  try {
    const cleanedToken = String(token || "").trim();

    if (cleanedToken) {
      localStorage.setItem(
        TOKEN_KEY,
        cleanedToken
      );
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Storage failure should not crash the app.
  }
}

export function clearToken() {
  if (!canUseStorage()) return;

  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage failure should not crash the app.
  }
}

// Backwards compatibility.
export function setAuthToken(token) {
  setToken(token);
}

// ----------------------
// Business context helpers
// ----------------------
export function getActiveBusinessId() {
  if (!canUseStorage()) return "";

  try {
    return (
      localStorage.getItem(ACTIVE_BIZ_KEY) || ""
    );
  } catch {
    return "";
  }
}

export function setActiveBusinessId(id) {
  if (canUseStorage()) {
    try {
      const cleaned = String(id || "").trim();

      if (!cleaned) {
        localStorage.removeItem(ACTIVE_BIZ_KEY);
      } else {
        localStorage.setItem(
          ACTIVE_BIZ_KEY,
          cleaned
        );

        localStorage.setItem(
          LAST_BIZ_KEY,
          cleaned
        );
      }
    } catch {
      // Storage failure should not crash the app.
    }
  }

  dispatchWindowEvent(
    new Event("sw:activeBusinessChanged")
  );
}

export function clearActiveBusinessId() {
  if (canUseStorage()) {
    try {
      localStorage.removeItem(ACTIVE_BIZ_KEY);
    } catch {
      // Storage failure should not crash the app.
    }
  }

  dispatchWindowEvent(
    new Event("sw:activeBusinessChanged")
  );
}

function resolveBusinessId() {
  const fromLocalStorage = String(
    getActiveBusinessId() || ""
  ).trim();

  if (fromLocalStorage) {
    return fromLocalStorage;
  }

  if (canUseWindow()) {
    const fromWindow = String(
      window.__sw_active_business_id || ""
    ).trim();

    if (fromWindow) {
      return fromWindow;
    }
  }

  if (canUseStorage()) {
    try {
      const lastBusinessId = String(
        localStorage.getItem(LAST_BIZ_KEY) || ""
      ).trim();

      if (lastBusinessId) {
        return lastBusinessId;
      }
    } catch {
      // Storage failure should not crash the app.
    }
  }

  return "";
}

// ----------------------
// Request-path helpers
// ----------------------
function normalizedPath(config) {
  const raw = String(config?.url || "");

  try {
    const parsed = new URL(raw, baseURL);

    return (
      parsed.pathname.replace(/^\/api\/v1/, "") ||
      "/"
    );
  } catch {
    return raw.replace(/^\/api\/v1/, "") || "/";
  }
}

function methodOf(config) {
  return String(
    config?.method || "get"
  ).toLowerCase();
}

function isSalesRequest(config) {
  const path = normalizedPath(config);

  return (
    path === "/sales" ||
    path.startsWith("/sales/")
  );
}

function isPlatformRequest(config) {
  const path = normalizedPath(config);

  return (
    path === "/platform" ||
    path === "/platform-growth" ||
    path === "/platform-affiliates" ||
    path.startsWith("/platform/") ||
    path.startsWith("/platform-growth/") ||
    path.startsWith("/platform-affiliates/")
  );
}

function isTenantRequest(config) {
  const path = normalizedPath(config);

  return (
    path === "/tenant" ||
    path.startsWith("/tenant/")
  );
}

function isInvestorRequest(config) {
  const path = normalizedPath(config);

  return (
    path === "/investor" ||
    path.startsWith("/investor/")
  );
}

// User-level endpoints should never inherit an active
// business context.
function isMeScopedRequest(config) {
  const path = normalizedPath(config);

  return (
    path === "/me" ||
    path.startsWith("/me/") ||
    path === "/customer-health" ||
    path.startsWith("/customer-health/")
  );
}

// Authentication and registration endpoints must always
// stay user-scoped.
function isUserScopedAuthRequest(config) {
  const path = normalizedPath(config);

  return (
    path === "/auth" ||
    path.startsWith("/auth/") ||
    path.startsWith("/auth/register") ||
    path.startsWith("/auth/login") ||
    path.startsWith("/auth/logout") ||
    path.startsWith("/auth/me") ||
    path.startsWith("/auth/email/") ||
    path.startsWith(
      "/auth/resolve-signup-codes"
    ) ||
    path.startsWith(
      "/auth/upgrade-to-sbo-promo"
    )
  );
}

function isPublicAuthRequest(config) {
  const path = normalizedPath(config);

  return (
    path.startsWith("/auth/login") ||
    path.startsWith("/auth/register") ||
    path.startsWith("/auth/email/") ||
    path.startsWith(
      "/auth/resolve-signup-codes"
    )
  );
}

function isAuthMeRequest(config) {
  const path = normalizedPath(config);

  return (
    path === "/auth/me" ||
    path === "/auth/me/"
  );
}

function isLogoutRequest(config) {
  const path = normalizedPath(config);

  return (
    path === "/auth/logout" ||
    path === "/auth/logout/"
  );
}

// Customer-created marketplace requests must not inherit
// an old active-business context.
function isCustomerServiceRequestCreate(config) {
  const path = normalizedPath(config);
  const method = methodOf(config);

  return (
    method === "post" &&
    (
      path === "/service-requests" ||
      path === "/service-requests/"
    )
  );
}

function shouldExcludeBusinessContext(config) {
  return (
    isSalesRequest(config) ||
    isPlatformRequest(config) ||
    isTenantRequest(config) ||
    isInvestorRequest(config) ||
    isMeScopedRequest(config) ||
    isUserScopedAuthRequest(config) ||
    isCustomerServiceRequestCreate(config)
  );
}

// ----------------------
// Trailing-slash safety
// ----------------------
function isAbsoluteUrl(value) {
  return /^https?:\/\//i.test(
    String(value || "")
  );
}

function ensureTrailingSlash(urlRaw) {
  const url = String(urlRaw || "");

  if (!url) return url;
  if (!url.startsWith("/")) return url;
  if (isAbsoluteUrl(url)) return url;
  if (url.endsWith("/")) return url;

  const queryIndex = url.indexOf("?");

  if (queryIndex >= 0) {
    const path = url.slice(0, queryIndex);
    const queryString = url.slice(queryIndex);

    if (path.endsWith("/")) {
      return path + queryString;
    }

    return `${path}/${queryString}`;
  }

  const lastSegment =
    url.split("/").filter(Boolean).pop() || "";

  // Do not alter direct file or asset URLs.
  if (lastSegment.includes(".")) {
    return url;
  }

  return `${url}/`;
}

// ----------------------
// Error classification
// ----------------------
export function getApiErrorStatus(error) {
  const status = Number(
    error?.response?.status || 0
  );

  return Number.isFinite(status)
    ? status
    : 0;
}

export function isUnauthorizedError(error) {
  return getApiErrorStatus(error) === 401;
}

export function isNetworkLikeError(error) {
  if (!error) return false;

  if (!error.response) {
    return true;
  }

  const status = getApiErrorStatus(error);

  return (
    status === 408 ||
    status === 425 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

// ----------------------
// Axios instance
// ----------------------
const api = axios.create({
  baseURL,
  timeout: 20000,
});

// ----------------------
// Request interceptor
// ----------------------
api.interceptors.request.use(
  (config) => {
    config.headers = config.headers || {};

    if (config?.url) {
      config.url = ensureTrailingSlash(
        config.url
      );
    }

    const token = getToken();

    if (token) {
      config.headers.Authorization =
        `Token ${token}`;
    } else {
      delete config.headers.Authorization;
    }

    if (shouldExcludeBusinessContext(config)) {
      delete config.headers["X-Business-Id"];
      delete config.headers["x-business-id"];
    } else {
      const businessId = resolveBusinessId();

      if (businessId) {
        const cleanedBusinessId = String(
          businessId
        ).trim();

        config.headers["X-Business-Id"] =
          cleanedBusinessId;

        if (canUseStorage()) {
          try {
            localStorage.setItem(
              LAST_BIZ_KEY,
              cleanedBusinessId
            );
          } catch {
            // Storage failure is non-critical.
          }
        }
      } else {
        delete config.headers["X-Business-Id"];
        delete config.headers["x-business-id"];
      }
    }

    const isFormData =
      typeof FormData !== "undefined" &&
      config.data instanceof FormData;

    const isBlob =
      typeof Blob !== "undefined" &&
      config.data instanceof Blob;

    const isArrayBuffer =
      typeof ArrayBuffer !== "undefined" &&
      config.data instanceof ArrayBuffer;

    if (isFormData) {
      // Browser must generate multipart boundary.
      delete config.headers["Content-Type"];
    } else if (
      config.data &&
      typeof config.data === "object" &&
      !isBlob &&
      !isArrayBuffer
    ) {
      config.headers["Content-Type"] =
        "application/json";
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ----------------------
// Response interceptor
// ----------------------
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = getApiErrorStatus(error);
    const config = error?.config || {};
    const path = normalizedPath(config);
    const token = getToken();

    if (status === 401) {
      /*
       * Important:
       *
       * Do not erase the saved token because any random API
       * endpoint returned 401.
       *
       * The AuthProvider will verify the token against
       * /auth/me/ before deciding whether the session is
       * truly invalid.
       */

      if (
        token &&
        !isPublicAuthRequest(config) &&
        !isLogoutRequest(config)
      ) {
        dispatchWindowEvent(
          new CustomEvent(
            "sw:authUnauthorized",
            {
              detail: {
                path,
                method: methodOf(config),
                isAuthMe:
                  isAuthMeRequest(config),
              },
            }
          )
        );
      }
    }

    if (status === 423) {
      const lockReason =
        error?.response?.data?.lock_reason ||
        error?.response?.data?.reason ||
        error?.response?.data?.detail ||
        "LOCKED";

      dispatchWindowEvent(
        new CustomEvent(
          "sw:billingLocked",
          {
            detail: {
              lock_reason: lockReason,
            },
          }
        )
      );
    }

    return Promise.reject(error);
  }
);

export default api;