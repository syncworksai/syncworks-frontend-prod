import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import api, {
  setToken,
  clearToken,
  getActiveBusinessId,
  setActiveBusinessId,
} from "../api/client";

const AuthContext = createContext(null);

const MODE_KEY = "sw_mode"; // CUSTOMER | SBO | EMPLOYEE | PM | PLATFORM | SALES

// ✅ HARD-WIRED GOD MODE EMAIL ALLOWLIST (ONLY JACOB)
const GOD_EMAIL_ALLOWLIST = new Set(["jacoblord7@outlook.com"]);

function getStoredMode() {
  return localStorage.getItem(MODE_KEY) || "CUSTOMER";
}
function setStoredMode(mode) {
  localStorage.setItem(MODE_KEY, mode);
}

function normalizeMePayload(me) {
  const u = me || {};
  const entitlements =
    u?.entitlements ||
    u?.customer_settings?.entitlements || {
      finance_access: false,
      finance_until: null,
      health_access: false,
      health_until: null,
    };

  const profiles =
    u?.profiles ||
    u?.customer_settings?.profiles || {
      finance_profile: {},
      fitness_profile: {},
    };

  const customer_settings = u?.customer_settings || null;

  return {
    user: u,
    entitlements,
    profiles,
    customer_settings,
  };
}

function normalizeEmail(x) {
  return String(x || "").toLowerCase().trim();
}

function parseModuleAccess(data, fallback = {}) {
  const out = {
    checked: true,
    sbo: false,
    pm: false,
    sales: false,
    finance: false,
    fitness: false,
    ...fallback,
  };

  const pushIfString = (set, v) => {
    if (typeof v === "string" && v.trim()) set.add(v.trim().toUpperCase());
  };

  const active = new Set();

  const arraysToCheck = [
    data?.modules,
    data?.active_modules,
    data?.products,
    data?.active_products,
    data?.entitled_modules,
  ];

  arraysToCheck.forEach((arr) => {
    if (Array.isArray(arr)) {
      arr.forEach((x) => {
        if (typeof x === "string") {
          pushIfString(active, x);
        } else if (x && typeof x === "object") {
          pushIfString(active, x.code);
          pushIfString(active, x.key);
          pushIfString(active, x.name);
          if (x.module) pushIfString(active, x.module);
          if (x.slug) pushIfString(active, x.slug);
        }
      });
    }
  });

  const objsToCheck = [
    data?.module_status,
    data?.module_statuses,
    data?.entitlements,
  ];

  objsToCheck.forEach((obj) => {
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      Object.entries(obj).forEach(([k, v]) => {
        const key = String(k || "").trim().toUpperCase();
        const truthy =
          v === true ||
          String(v || "").toLowerCase() === "active" ||
          String(v || "").toLowerCase() === "trialing" ||
          (typeof v === "object" &&
            (v?.active === true ||
              String(v?.status || "").toLowerCase() === "active" ||
              String(v?.status || "").toLowerCase() === "trialing"));

        if (truthy) active.add(key);
      });
    }
  });

  out.sbo = active.has("SBO");
  out.pm = active.has("PM") || active.has("PROPERTYMANAGEMENT") || active.has("PROPERTY_MANAGEMENT");
  out.sales = active.has("SALESOS") || active.has("SALES_OS") || active.has("SALES");
  out.finance = active.has("FINANCE");
  out.fitness = active.has("FITNESS");

  return out;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const [entitlements, setEntitlements] = useState({
    finance_access: false,
    finance_until: null,
    health_access: false,
    health_until: null,
  });

  const [profiles, setProfiles] = useState({
    finance_profile: {},
    fitness_profile: {},
  });

  const [customerSettings, setCustomerSettings] = useState(null);
  const [booting, setBooting] = useState(true);

  const [activeBusinessIdState, setActiveBusinessIdState] = useState(
    () => getActiveBusinessId() || ""
  );
  const [myBusinesses, setMyBusinesses] = useState([]);

  const [mode, setModeState] = useState(() => getStoredMode());
  const [entitlementsRefreshedAt, setEntitlementsRefreshedAt] = useState(null);

  const [moduleAccess, setModuleAccess] = useState({
    checked: false,
    sbo: false,
    pm: false,
    sales: false,
    finance: false,
    fitness: false,
  });

  // ✅ Only Jacob can ever be God Mode
  const isGod = useMemo(() => {
    const email = normalizeEmail(user?.email);
    return GOD_EMAIL_ALLOWLIST.has(email);
  }, [user?.email]);

  const setMode = useCallback((next) => {
    const allowed = new Set([
      "CUSTOMER",
      "SBO",
      "EMPLOYEE",
      "PM",
      "PLATFORM",
      "SALES",
    ]);
    const cleaned = allowed.has(next) ? next : "CUSTOMER";
    setModeState(cleaned);
    setStoredMode(cleaned);
  }, []);

  const hasEntitlement = useCallback(
    (key) => {
      if (isGod) return true;
      if (key === "finance") return !!entitlements?.finance_access;
      if (key === "health") return !!entitlements?.health_access;
      return false;
    },
    [isGod, entitlements]
  );

  const resetAuthedState = useCallback(() => {
    setUser(null);
    setEntitlements({
      finance_access: false,
      finance_until: null,
      health_access: false,
      health_until: null,
    });
    setProfiles({ finance_profile: {}, fitness_profile: {} });
    setCustomerSettings(null);
    setMyBusinesses([]);
    setEntitlementsRefreshedAt(null);
    setModuleAccess({
      checked: false,
      sbo: false,
      pm: false,
      sales: false,
      finance: false,
      fitness: false,
    });
  }, []);

  const enforcePlatformLock = useCallback(
    (email) => {
      const canPlatform = GOD_EMAIL_ALLOWLIST.has(normalizeEmail(email));
      if (getStoredMode() === "PLATFORM" && !canPlatform) {
        setMode("CUSTOMER");
      }
      return canPlatform;
    },
    [setMode]
  );

  const loadMyBusinesses = useCallback(async () => {
    try {
      const bizRes = await api.get("/me/businesses/");
      const data = bizRes.data;
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.value)
        ? data.value
        : Array.isArray(data?.results)
        ? data.results
        : [];

      setMyBusinesses(list);

      if (!getActiveBusinessId() && list?.length) {
        const first =
          list[0]?.business_id || list[0]?.id || list[0]?.business?.id;
        if (first) {
          setActiveBusinessId(first);
          setActiveBusinessIdState(String(first));
        }
      }

      return list;
    } catch {
      setMyBusinesses([]);
      return [];
    }
  }, []);

  const loadModuleAccess = useCallback(
    async (businesses = []) => {
      if (isGod) {
        setModuleAccess({
          checked: true,
          sbo: true,
          pm: true,
          sales: true,
          finance: true,
          fitness: true,
        });
        return;
      }

      try {
        const res = await api.get("/billing/subscription/status/");
        const parsed = parseModuleAccess(res?.data, {
          sbo: Array.isArray(businesses) && businesses.length > 0,
          pm: false,
          sales: false,
        });
        setModuleAccess(parsed);
      } catch {
        setModuleAccess({
          checked: true,
          sbo: Array.isArray(businesses) && businesses.length > 0,
          pm: false,
          sales: false,
          finance: false,
          fitness: false,
        });
      }
    },
    [isGod]
  );

  const loadMe = useCallback(
    async ({ silent = false } = {}) => {
      const token = localStorage.getItem("sw_token");
      if (token) setToken(token);

      if (!token) {
        resetAuthedState();
        setBooting(false);
        return;
      }

      try {
        const res = await api.get("/auth/me/");
        const normalized = normalizeMePayload(res.data);

        setUser(normalized.user);
        setEntitlements(normalized.entitlements);
        setProfiles(normalized.profiles);
        setCustomerSettings(normalized.customer_settings);

        if (!silent) setEntitlementsRefreshedAt(new Date().toISOString());

        const list = await loadMyBusinesses();

        enforcePlatformLock(normalized.user?.email);

        const godByEmail = GOD_EMAIL_ALLOWLIST.has(normalizeEmail(normalized.user?.email));
        if (godByEmail) {
          setModuleAccess({
            checked: true,
            sbo: true,
            pm: true,
            sales: true,
            finance: true,
            fitness: true,
          });
        } else {
          await loadModuleAccess(list);
        }
      } catch {
        clearToken();
        resetAuthedState();
      } finally {
        setBooting(false);
      }
    },
    [enforcePlatformLock, loadMyBusinesses, loadModuleAccess, resetAuthedState]
  );

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = useCallback(
    async ({ email, username, password }) => {
      const identifier = email || username;
      const res = await api.post("/auth/login/", { identifier, password });
      const token = res.data?.token;
      if (!token) throw new Error("No token returned from /auth/login/");
      setToken(token);
      await loadMe();
      return true;
    },
    [loadMe]
  );

  const register = useCallback(
    async (payload) => {
      const res = await api.post("/auth/register/", payload);
      const token = res.data?.token || res.data?.auth_token;
      if (token) setToken(token);
      await loadMe();
      return res.data;
    },
    [loadMe]
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout/");
    } catch {
      // ignore
    }
    clearToken();
    setActiveBusinessId(null);
    setActiveBusinessIdState("");
    setMyBusinesses([]);
    setMode("CUSTOMER");
    resetAuthedState();
  }, [resetAuthedState, setMode]);

  const updateActiveBusinessId = useCallback((nextId) => {
    const cleaned = nextId ? String(nextId).trim() : "";
    if (!cleaned) {
      setActiveBusinessId(null);
      setActiveBusinessIdState("");
      return;
    }
    setActiveBusinessId(cleaned);
    setActiveBusinessIdState(cleaned);
  }, []);

  const reloadBusinesses = useCallback(async () => {
    const list = await loadMyBusinesses();
    await loadModuleAccess(list);
    return list;
  }, [loadMyBusinesses, loadModuleAccess]);

  const refreshEntitlements = useCallback(async () => {
    try {
      const token = localStorage.getItem("sw_token");
      if (token) setToken(token);

      const res = await api.get("/auth/me/");
      const normalized = normalizeMePayload(res.data);

      setUser(normalized.user);
      setEntitlements(normalized.entitlements);
      setProfiles(normalized.profiles);
      setCustomerSettings(normalized.customer_settings);
      setEntitlementsRefreshedAt(new Date().toISOString());

      enforcePlatformLock(normalized.user?.email);

      const godByEmail = GOD_EMAIL_ALLOWLIST.has(normalizeEmail(normalized.user?.email));
      if (godByEmail) {
        setModuleAccess({
          checked: true,
          sbo: true,
          pm: true,
          sales: true,
          finance: true,
          fitness: true,
        });
      } else {
        await loadModuleAccess(myBusinesses);
      }

      return normalized.entitlements;
    } catch (e) {
      if (e?.response?.status === 401) {
        clearToken();
        resetAuthedState();
      }
      throw e;
    }
  }, [enforcePlatformLock, loadModuleAccess, myBusinesses, resetAuthedState]);

  const availableModes = useMemo(() => {
    const hasMemberships = (myBusinesses || []).length > 0;
    return {
      CUSTOMER: true,
      SBO: hasMemberships || moduleAccess?.sbo || isGod,
      EMPLOYEE: hasMemberships || isGod,
      PM: hasMemberships || moduleAccess?.pm || isGod,
      PLATFORM: isGod,
      SALES: !!moduleAccess?.sales || isGod,
    };
  }, [myBusinesses, moduleAccess, isGod]);

  const value = useMemo(
    () => ({
      user,
      booting,
      isAuthed: !!user,
      login,
      register,
      logout,

      reload: loadMe,

      entitlements,
      profiles,
      customerSettings,
      hasEntitlement,
      refreshEntitlements,
      entitlementsRefreshedAt,

      activeBusinessId: activeBusinessIdState,
      setActiveBusinessId: updateActiveBusinessId,
      myBusinesses,
      reloadBusinesses,

      moduleAccess,

      isGod,
      mode,
      setMode,
      availableModes,
    }),
    [
      user,
      booting,
      login,
      register,
      logout,
      loadMe,
      entitlements,
      profiles,
      customerSettings,
      hasEntitlement,
      refreshEntitlements,
      entitlementsRefreshedAt,
      activeBusinessIdState,
      updateActiveBusinessId,
      myBusinesses,
      reloadBusinesses,
      moduleAccess,
      isGod,
      mode,
      setMode,
      availableModes,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider> (AuthContext is null)");
  }
  return ctx;
}