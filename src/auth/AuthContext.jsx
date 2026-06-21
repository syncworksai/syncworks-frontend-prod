import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import api, {
  clearToken,
  getActiveBusinessId,
  getToken,
  setActiveBusinessId,
  setToken,
} from "../api/client";

const AuthContext = createContext(null);

const MODE_KEY = "sw_mode";

const DEFAULT_ENTITLEMENTS = {
  finance_access: false,
  finance_until: null,
  health_access: false,
  health_until: null,
};

const DEFAULT_PROFILES = {
  finance_profile: {},
  fitness_profile: {},
};

const DEFAULT_MODULE_ACCESS = {
  checked: false,
  sbo: false,
  pm: false,
  sales: false,
  finance: false,
  fitness: false,
  growth: false,
  growth_os: false,
  social_media: false,
};

const FULL_MODULE_ACCESS = {
  checked: true,
  sbo: true,
  pm: true,
  sales: true,
  finance: true,
  fitness: true,
  growth: true,
  growth_os: true,
  social_media: true,
};

function canUseStorage() {
  return (
    typeof window !== "undefined" &&
    typeof window.localStorage !== "undefined"
  );
}

function getStoredMode() {
  if (!canUseStorage()) return "CUSTOMER";

  try {
    return localStorage.getItem(MODE_KEY) || "CUSTOMER";
  } catch {
    return "CUSTOMER";
  }
}

function setStoredMode(mode) {
  if (!canUseStorage()) return;

  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // no-op
  }
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeMePayload(me) {
  const user = me || {};

  const entitlements =
    user?.entitlements ||
    user?.customer_settings?.entitlements ||
    DEFAULT_ENTITLEMENTS;

  const profiles =
    user?.profiles ||
    user?.customer_settings?.profiles ||
    DEFAULT_PROFILES;

  return {
    user,
    entitlements: {
      ...DEFAULT_ENTITLEMENTS,
      ...(entitlements || {}),
    },
    profiles: {
      ...DEFAULT_PROFILES,
      ...(profiles || {}),
    },
    customerSettings: user?.customer_settings || null,
  };
}

function isPlatformUser(user) {
  return Boolean(
    user?.is_platform_admin ||
      user?.is_superuser
  );
}

function parseModuleAccess(data, fallback = {}) {
  const output = {
    ...DEFAULT_MODULE_ACCESS,
    checked: true,
    ...fallback,
  };

  const active = new Set();

  const addValue = (value) => {
    if (typeof value !== "string") return;

    const normalized = value.trim().toUpperCase();

    if (normalized) {
      active.add(normalized);
    }
  };

  const arraysToCheck = [
    data?.modules,
    data?.active_modules,
    data?.products,
    data?.active_products,
    data?.entitled_modules,
  ];

  arraysToCheck.forEach((items) => {
    if (!Array.isArray(items)) return;

    items.forEach((item) => {
      if (typeof item === "string") {
        addValue(item);
        return;
      }

      if (!item || typeof item !== "object") return;

      addValue(item.code);
      addValue(item.key);
      addValue(item.name);
      addValue(item.module);
      addValue(item.slug);
    });
  });

  const objectsToCheck = [
    data?.module_status,
    data?.module_statuses,
    data?.entitlements,
  ];

  objectsToCheck.forEach((objectValue) => {
    if (
      !objectValue ||
      typeof objectValue !== "object" ||
      Array.isArray(objectValue)
    ) {
      return;
    }

    Object.entries(objectValue).forEach(([key, value]) => {
      const normalizedKey = String(key || "")
        .trim()
        .toUpperCase();

      const normalizedValue = String(value || "")
        .trim()
        .toLowerCase();

      const enabled =
        value === true ||
        normalizedValue === "active" ||
        normalizedValue === "trialing" ||
        (typeof value === "object" &&
          value !== null &&
          (value.active === true ||
            String(value.status || "").toLowerCase() === "active" ||
            String(value.status || "").toLowerCase() === "trialing"));

      if (enabled && normalizedKey) {
        active.add(normalizedKey);
      }
    });
  });

  output.sbo = active.has("SBO");

  output.pm =
    active.has("PM") ||
    active.has("PROPERTYMANAGEMENT") ||
    active.has("PROPERTY_MANAGEMENT");

  output.sales =
    active.has("SALESOS") ||
    active.has("SALES_OS") ||
    active.has("SALES");

  output.finance = active.has("FINANCE");

  output.fitness =
    active.has("FITNESS") ||
    active.has("HEALTH");

  output.growth =
    active.has("GROWTH") ||
    active.has("GROWTHOS") ||
    active.has("GROWTH_OS") ||
    active.has("PLATFORM_GROWTH") ||
    active.has("SOCIAL") ||
    active.has("SOCIAL_MEDIA") ||
    active.has("SOCIALMEDIA") ||
    active.has("SOCIAL_AUTOMATION") ||
    active.has("AUTOMATION");

  output.growth_os = output.growth;
  output.social_media = output.growth;

  return output;
}

function extractErrorMessage(error, fallback = "Something went wrong.") {
  const data = error?.response?.data;

  if (typeof data === "string" && data.trim()) {
    return data.trim();
  }

  if (typeof data?.detail === "string" && data.detail.trim()) {
    return data.detail.trim();
  }

  if (data && typeof data === "object") {
    for (const value of Object.values(data)) {
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }

      if (Array.isArray(value) && value.length) {
        return String(value[0] || fallback);
      }
    }
  }

  return error?.message || fallback;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const [entitlements, setEntitlements] = useState(
    DEFAULT_ENTITLEMENTS
  );

  const [profiles, setProfiles] = useState(
    DEFAULT_PROFILES
  );

  const [customerSettings, setCustomerSettings] =
    useState(null);

  const [booting, setBooting] = useState(true);

  const [activeBusinessIdState, setActiveBusinessIdState] =
    useState(() => getActiveBusinessId() || "");

  const [myBusinesses, setMyBusinesses] = useState([]);

  const [mode, setModeState] = useState(() =>
    getStoredMode()
  );

  const [
    entitlementsRefreshedAt,
    setEntitlementsRefreshedAt,
  ] = useState(null);

  const [moduleAccess, setModuleAccess] = useState(
    DEFAULT_MODULE_ACCESS
  );

  const isPlatformAdmin = useMemo(
    () => isPlatformUser(user),
    [user]
  );

  const canAccessGrowthOs = useMemo(() => {
    if (isPlatformAdmin) return true;

    return Boolean(
      moduleAccess?.growth ||
        moduleAccess?.growth_os ||
        moduleAccess?.social_media
    );
  }, [isPlatformAdmin, moduleAccess]);

  const setMode = useCallback((nextMode) => {
    const allowedModes = new Set([
      "CUSTOMER",
      "SBO",
      "EMPLOYEE",
      "PM",
      "PLATFORM",
      "SALES",
    ]);

    const cleanedMode = allowedModes.has(nextMode)
      ? nextMode
      : "CUSTOMER";

    setModeState(cleanedMode);
    setStoredMode(cleanedMode);
  }, []);

  const hasEntitlement = useCallback(
    (key) => {
      if (isPlatformAdmin) return true;

      if (key === "finance") {
        return Boolean(entitlements?.finance_access);
      }

      if (key === "health" || key === "fitness") {
        return Boolean(entitlements?.health_access);
      }

      if (
        key === "growth" ||
        key === "growth_os" ||
        key === "social_media"
      ) {
        return Boolean(
          moduleAccess?.growth ||
            moduleAccess?.growth_os ||
            moduleAccess?.social_media
        );
      }

      return false;
    },
    [
      entitlements,
      isPlatformAdmin,
      moduleAccess,
    ]
  );

  const resetAuthedState = useCallback(() => {
    setUser(null);
    setEntitlements(DEFAULT_ENTITLEMENTS);
    setProfiles(DEFAULT_PROFILES);
    setCustomerSettings(null);
    setMyBusinesses([]);
    setEntitlementsRefreshedAt(null);
    setModuleAccess(DEFAULT_MODULE_ACCESS);
  }, []);

  const enforcePlatformMode = useCallback(
    (currentUser) => {
      const allowed = isPlatformUser(currentUser);

      if (
        getStoredMode() === "PLATFORM" &&
        !allowed
      ) {
        setMode("CUSTOMER");
      }

      return allowed;
    },
    [setMode]
  );

  const loadMyBusinesses = useCallback(async () => {
    try {
      const response = await api.get("/me/businesses/");
      const data = response?.data;

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.value)
        ? data.value
        : Array.isArray(data?.results)
        ? data.results
        : [];

      setMyBusinesses(list);

      if (!getActiveBusinessId() && list.length > 0) {
        const firstBusinessId =
          list[0]?.business_id ||
          list[0]?.id ||
          list[0]?.business?.id;

        if (firstBusinessId) {
          setActiveBusinessId(firstBusinessId);
          setActiveBusinessIdState(
            String(firstBusinessId)
          );
        }
      }

      return list;
    } catch {
      setMyBusinesses([]);
      return [];
    }
  }, []);

  const loadModuleAccess = useCallback(
    async (businesses = [], currentUser = null) => {
      if (isPlatformUser(currentUser || user)) {
        setModuleAccess(FULL_MODULE_ACCESS);
        return FULL_MODULE_ACCESS;
      }

      try {
        const response = await api.get(
          "/billing/subscription/status/"
        );

        const parsed = parseModuleAccess(
          response?.data,
          {
            sbo:
              Array.isArray(businesses) &&
              businesses.length > 0,
          }
        );

        setModuleAccess(parsed);
        return parsed;
      } catch {
        const fallback = {
          ...DEFAULT_MODULE_ACCESS,
          checked: true,
          sbo:
            Array.isArray(businesses) &&
            businesses.length > 0,
        };

        setModuleAccess(fallback);
        return fallback;
      }
    },
    [user]
  );

  const loadMe = useCallback(
    async ({ silent = false } = {}) => {
      const token = getToken();

      if (!token) {
        resetAuthedState();
        setBooting(false);
        return null;
      }

      setToken(token);

      try {
        const response = await api.get("/auth/me/");
        const normalized = normalizeMePayload(
          response.data
        );

        setUser(normalized.user);
        setEntitlements(normalized.entitlements);
        setProfiles(normalized.profiles);
        setCustomerSettings(
          normalized.customerSettings
        );

        if (!silent) {
          setEntitlementsRefreshedAt(
            new Date().toISOString()
          );
        }

        const businesses = await loadMyBusinesses();

        const platformAllowed =
          enforcePlatformMode(normalized.user);

        if (platformAllowed) {
          setModuleAccess(FULL_MODULE_ACCESS);
        } else {
          await loadModuleAccess(
            businesses,
            normalized.user
          );
        }

        return normalized.user;
      } catch (error) {
        clearToken();
        resetAuthedState();
        throw error;
      } finally {
        setBooting(false);
      }
    },
    [
      enforcePlatformMode,
      loadModuleAccess,
      loadMyBusinesses,
      resetAuthedState,
    ]
  );

  useEffect(() => {
    loadMe().catch(() => {
      // Authentication failures are handled inside loadMe.
    });
  }, [loadMe]);

  const login = useCallback(
    async ({
      identifier,
      email,
      username,
      password,
    }) => {
      const resolvedIdentifier =
        identifier || email || username;

      if (!resolvedIdentifier || !password) {
        throw new Error(
          "Email or username and password are required."
        );
      }

      const response = await api.post(
        "/auth/login/",
        {
          identifier: String(
            resolvedIdentifier
          ).trim(),
          password,
        }
      );

      const token = response?.data?.token;

      if (!token) {
        throw new Error(
          "No authentication token was returned."
        );
      }

      setToken(token);
      await loadMe();

      return response.data;
    },
    [loadMe]
  );

  const startEmailVerification = useCallback(
    async ({ email, purpose = "REGISTER" }) => {
      try {
        const response = await api.post(
          "/auth/email/start-verification/",
          {
            email: normalizeEmail(email),
            purpose,
          }
        );

        return response.data;
      } catch (error) {
        throw new Error(
          extractErrorMessage(
            error,
            "Unable to send the verification code."
          )
        );
      }
    },
    []
  );

  const verifyEmailCode = useCallback(
    async ({ challengeId, challenge_id, code }) => {
      try {
        const response = await api.post(
          "/auth/email/verify-code/",
          {
            challenge_id:
              challengeId || challenge_id,
            code: String(code || "").trim(),
          }
        );

        return response.data;
      } catch (error) {
        throw new Error(
          extractErrorMessage(
            error,
            "Unable to verify that code."
          )
        );
      }
    },
    []
  );

  const resendEmailCode = useCallback(
    async ({ challengeId, challenge_id }) => {
      try {
        const response = await api.post(
          "/auth/email/resend-code/",
          {
            challenge_id:
              challengeId || challenge_id,
          }
        );

        return response.data;
      } catch (error) {
        throw new Error(
          extractErrorMessage(
            error,
            "Unable to resend the verification code."
          )
        );
      }
    },
    []
  );

  const resolveSignupCodes = useCallback(
    async ({
      affiliateCode,
      affiliate_code,
      promoCode,
      promo_code,
    } = {}) => {
      try {
        const response = await api.post(
          "/auth/resolve-signup-codes/",
          {
            affiliate_code:
              affiliateCode ||
              affiliate_code ||
              "",
            promo_code:
              promoCode ||
              promo_code ||
              "",
          }
        );

        return response.data;
      } catch (error) {
        throw new Error(
          extractErrorMessage(
            error,
            "Unable to validate the signup codes."
          )
        );
      }
    },
    []
  );

  const register = useCallback(
    async (payload = {}) => {
      const normalizedPayload = {
        email: normalizeEmail(payload.email),
        username: String(
          payload.username || ""
        ).trim(),
        first_name: String(
          payload.first_name ||
            payload.firstName ||
            ""
        ).trim(),
        last_name: String(
          payload.last_name ||
            payload.lastName ||
            ""
        ).trim(),
        password: payload.password || "",
        confirm_password:
          payload.confirm_password ||
          payload.confirmPassword ||
          "",
        registration_proof:
          payload.registration_proof ||
          payload.registrationProof ||
          "",
        affiliate_code:
          payload.affiliate_code ||
          payload.affiliateCode ||
          "",
        promo_code:
          payload.promo_code ||
          payload.promoCode ||
          "",
        registration_source:
          payload.registration_source ||
          payload.registrationSource ||
          "WEB",
      };

      try {
        const response = await api.post(
          "/auth/register/",
          normalizedPayload
        );

        const token =
          response?.data?.token ||
          response?.data?.auth_token;

        if (!token) {
          throw new Error(
            "No authentication token was returned."
          );
        }

        setToken(token);
        await loadMe();

        return response.data;
      } catch (error) {
        if (
          error instanceof Error &&
          !error?.response
        ) {
          throw error;
        }

        throw new Error(
          extractErrorMessage(
            error,
            "Unable to create the account."
          )
        );
      }
    },
    [loadMe]
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout/");
    } catch {
      // Local cleanup must still happen.
    }

    clearToken();
    setActiveBusinessId(null);
    setActiveBusinessIdState("");
    setMyBusinesses([]);
    setMode("CUSTOMER");
    resetAuthedState();
  }, [resetAuthedState, setMode]);

  const updateActiveBusinessId = useCallback(
    (nextId) => {
      const cleaned = nextId
        ? String(nextId).trim()
        : "";

      if (!cleaned) {
        setActiveBusinessId(null);
        setActiveBusinessIdState("");
        return;
      }

      setActiveBusinessId(cleaned);
      setActiveBusinessIdState(cleaned);
    },
    []
  );

  const reloadBusinesses = useCallback(async () => {
    const businesses = await loadMyBusinesses();

    await loadModuleAccess(
      businesses,
      user
    );

    return businesses;
  }, [loadModuleAccess, loadMyBusinesses, user]);

  const refreshEntitlements = useCallback(
    async () => {
      const token = getToken();

      if (!token) {
        clearToken();
        resetAuthedState();
        return DEFAULT_ENTITLEMENTS;
      }

      setToken(token);

      try {
        const response = await api.get(
          "/auth/me/"
        );

        const normalized = normalizeMePayload(
          response.data
        );

        setUser(normalized.user);
        setEntitlements(
          normalized.entitlements
        );
        setProfiles(normalized.profiles);
        setCustomerSettings(
          normalized.customerSettings
        );

        setEntitlementsRefreshedAt(
          new Date().toISOString()
        );

        const platformAllowed =
          enforcePlatformMode(normalized.user);

        if (platformAllowed) {
          setModuleAccess(
            FULL_MODULE_ACCESS
          );
        } else {
          await loadModuleAccess(
            myBusinesses,
            normalized.user
          );
        }

        return normalized.entitlements;
      } catch (error) {
        if (error?.response?.status === 401) {
          clearToken();
          resetAuthedState();
        }

        throw error;
      }
    },
    [
      enforcePlatformMode,
      loadModuleAccess,
      myBusinesses,
      resetAuthedState,
    ]
  );

  const availableModes = useMemo(() => {
    const hasMemberships =
      myBusinesses.length > 0;

    return {
      CUSTOMER: true,
      SBO:
        hasMemberships ||
        moduleAccess?.sbo ||
        isPlatformAdmin,
      EMPLOYEE:
        hasMemberships ||
        isPlatformAdmin,
      PM:
        hasMemberships ||
        moduleAccess?.pm ||
        isPlatformAdmin,
      PLATFORM: isPlatformAdmin,
      SALES:
        Boolean(moduleAccess?.sales) ||
        isPlatformAdmin,
    };
  }, [
    isPlatformAdmin,
    moduleAccess,
    myBusinesses,
  ]);

  const value = useMemo(
    () => ({
      user,
      booting,
      isAuthed: Boolean(user),

      login,
      register,
      logout,

      startEmailVerification,
      verifyEmailCode,
      resendEmailCode,
      resolveSignupCodes,

      reload: loadMe,

      entitlements,
      profiles,
      customerSettings,
      hasEntitlement,
      refreshEntitlements,
      entitlementsRefreshedAt,

      activeBusinessId: activeBusinessIdState,
      setActiveBusinessId:
        updateActiveBusinessId,
      myBusinesses,
      reloadBusinesses,

      moduleAccess,
      canAccessGrowthOs,

      isPlatformAdmin,
      mode,
      setMode,
      availableModes,
    }),
    [
      activeBusinessIdState,
      availableModes,
      booting,
      canAccessGrowthOs,
      customerSettings,
      entitlements,
      entitlementsRefreshedAt,
      hasEntitlement,
      isPlatformAdmin,
      loadMe,
      login,
      logout,
      mode,
      moduleAccess,
      myBusinesses,
      profiles,
      refreshEntitlements,
      register,
      reloadBusinesses,
      resendEmailCode,
      resolveSignupCodes,
      startEmailVerification,
      updateActiveBusinessId,
      user,
      verifyEmailCode,
      setMode,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider."
    );
  }

  return context;
}