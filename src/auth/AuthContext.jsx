import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import api, {
  clearToken,
  getActiveBusinessId,
  getToken,
  isNetworkLikeError,
  isUnauthorizedError,
  setActiveBusinessId,
  setToken,
} from "../api/client";

const AuthContext = createContext(null);

const MODE_KEY = "sw_mode";

const AUTH_STATUS = {
  BOOTING: "booting",
  AUTHENTICATED: "authenticated",
  ANONYMOUS: "anonymous",
  UNAVAILABLE: "unavailable",
};

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

function canUseWindow() {
  return typeof window !== "undefined";
}

function canUseStorage() {
  return (
    canUseWindow() &&
    typeof window.localStorage !== "undefined"
  );
}

function getStoredMode() {
  if (!canUseStorage()) return "CUSTOMER";

  try {
    return (
      localStorage.getItem(MODE_KEY) ||
      "CUSTOMER"
    );
  } catch {
    return "CUSTOMER";
  }
}

function setStoredMode(mode) {
  if (!canUseStorage()) return;

  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // Storage failure is non-critical.
  }
}

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
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
    customerSettings:
      user?.customer_settings || null,
  };
}

function isPlatformUser(user) {
  return Boolean(
    user?.is_platform_admin ||
      user?.is_superuser
  );
}

function parseModuleAccess(
  data,
  fallback = {}
) {
  const output = {
    ...DEFAULT_MODULE_ACCESS,
    checked: true,
    ...fallback,
  };

  const active = new Set();

  const addValue = (value) => {
    if (typeof value !== "string") return;

    const normalized = value
      .trim()
      .toUpperCase();

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

      if (
        !item ||
        typeof item !== "object"
      ) {
        return;
      }

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

    Object.entries(objectValue).forEach(
      ([key, value]) => {
        const normalizedKey = String(
          key || ""
        )
          .trim()
          .toUpperCase();

        const normalizedValue = String(
          value || ""
        )
          .trim()
          .toLowerCase();

        const enabled =
          value === true ||
          normalizedValue === "active" ||
          normalizedValue === "trialing" ||
          (
            typeof value === "object" &&
            value !== null &&
            (
              value.active === true ||
              String(
                value.status || ""
              ).toLowerCase() === "active" ||
              String(
                value.status || ""
              ).toLowerCase() === "trialing"
            )
          );

        if (enabled && normalizedKey) {
          active.add(normalizedKey);
        }
      }
    );
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

  output.finance =
    active.has("FINANCE");

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

function extractErrorMessage(
  error,
  fallback = "Something went wrong."
) {
  const data = error?.response?.data;

  if (
    typeof data === "string" &&
    data.trim()
  ) {
    return data.trim();
  }

  if (
    typeof data?.detail === "string" &&
    data.detail.trim()
  ) {
    return data.detail.trim();
  }

  if (
    data &&
    typeof data === "object"
  ) {
    for (const value of Object.values(data)) {
      if (
        typeof value === "string" &&
        value.trim()
      ) {
        return value.trim();
      }

      if (
        Array.isArray(value) &&
        value.length
      ) {
        return String(
          value[0] || fallback
        );
      }
    }
  }

  return error?.message || fallback;
}

function authenticationUnavailableMessage(error) {
  if (!error?.response) {
    return (
      "SyncWorks could not reach the server. " +
      "Your login has been preserved."
    );
  }

  const status = Number(
    error?.response?.status || 0
  );

  if (
    status === 502 ||
    status === 503 ||
    status === 504
  ) {
    return (
      "SyncWorks is reconnecting to the server. " +
      "Your login has been preserved."
    );
  }

  if (status === 429) {
    return (
      "SyncWorks received too many requests. " +
      "Your login has been preserved."
    );
  }

  return (
    "SyncWorks could not verify your session. " +
    "Your login has been preserved."
  );
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const [entitlements, setEntitlements] =
    useState(DEFAULT_ENTITLEMENTS);

  const [profiles, setProfiles] =
    useState(DEFAULT_PROFILES);

  const [
    customerSettings,
    setCustomerSettings,
  ] = useState(null);

  const [booting, setBooting] =
    useState(true);

  const [authStatus, setAuthStatus] =
    useState(AUTH_STATUS.BOOTING);

  const [authError, setAuthError] =
    useState("");

  const [
    activeBusinessIdState,
    setActiveBusinessIdState,
  ] = useState(
    () => getActiveBusinessId() || ""
  );

  const [myBusinesses, setMyBusinesses] =
    useState([]);

  const [mode, setModeState] = useState(
    () => getStoredMode()
  );

  const [
    entitlementsRefreshedAt,
    setEntitlementsRefreshedAt,
  ] = useState(null);

  const [moduleAccess, setModuleAccess] =
    useState(DEFAULT_MODULE_ACCESS);

  const loadMePromiseRef = useRef(null);
  const lastSessionCheckRef = useRef(0);

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
  }, [
    isPlatformAdmin,
    moduleAccess,
  ]);

  const setMode = useCallback(
    (nextMode) => {
      const allowedModes = new Set([
        "CUSTOMER",
        "SBO",
        "EMPLOYEE",
        "PM",
        "PLATFORM",
        "SALES",
      ]);

      const cleanedMode =
        allowedModes.has(nextMode)
          ? nextMode
          : "CUSTOMER";

      setModeState(cleanedMode);
      setStoredMode(cleanedMode);
    },
    []
  );

  const hasEntitlement = useCallback(
    (key) => {
      if (isPlatformAdmin) return true;

      if (key === "finance") {
        return Boolean(
          entitlements?.finance_access
        );
      }

      if (
        key === "health" ||
        key === "fitness"
      ) {
        return Boolean(
          entitlements?.health_access
        );
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

  const resetAuthedState =
    useCallback(() => {
      setUser(null);
      setEntitlements(
        DEFAULT_ENTITLEMENTS
      );
      setProfiles(DEFAULT_PROFILES);
      setCustomerSettings(null);
      setMyBusinesses([]);
      setEntitlementsRefreshedAt(null);
      setModuleAccess(
        DEFAULT_MODULE_ACCESS
      );
    }, []);

  const markAnonymous = useCallback(() => {
    clearToken();
    resetAuthedState();
    setAuthError("");
    setAuthStatus(
      AUTH_STATUS.ANONYMOUS
    );
  }, [resetAuthedState]);

  const markUnavailable = useCallback(
    (error) => {
      setAuthError(
        authenticationUnavailableMessage(
          error
        )
      );

      setAuthStatus(
        AUTH_STATUS.UNAVAILABLE
      );
    },
    []
  );

  const enforcePlatformMode = useCallback(
    (currentUser) => {
      const allowed =
        isPlatformUser(currentUser);

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

  const loadMyBusinesses =
    useCallback(async () => {
      try {
        const response = await api.get(
          "/me/businesses/"
        );

        const data = response?.data;

        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.value)
          ? data.value
          : Array.isArray(data?.results)
          ? data.results
          : [];

        setMyBusinesses(list);

        if (
          !getActiveBusinessId() &&
          list.length > 0
        ) {
          const firstBusinessId =
            list[0]?.business_id ||
            list[0]?.id ||
            list[0]?.business?.id;

          if (firstBusinessId) {
            setActiveBusinessId(
              firstBusinessId
            );

            setActiveBusinessIdState(
              String(firstBusinessId)
            );
          }
        }

        return list;
      } catch {
        /*
         * Business-list loading is secondary to authentication.
         * A failure here must never clear a valid user session.
         *
         * The shared API client will separately request an
         * /auth/me/ verification when an authenticated endpoint
         * returns 401.
         */
        return null;
      }
    }, []);

  const loadModuleAccess = useCallback(
    async (
      businesses = [],
      currentUser = null
    ) => {
      if (isPlatformUser(currentUser)) {
        setModuleAccess(
          FULL_MODULE_ACCESS
        );

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
        /*
         * Subscription/module loading is secondary to authentication.
         * Preserve the authenticated session and use safe defaults.
         */
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
    []
  );

  const performLoadMe = useCallback(
    async ({ silent = false } = {}) => {
      const token = getToken();

      if (!token) {
        resetAuthedState();
        setAuthError("");
        setAuthStatus(
          AUTH_STATUS.ANONYMOUS
        );
        setBooting(false);

        return null;
      }

      /*
       * Re-save the normalized token without removing it
       * during temporary failures.
       */
      setToken(token);

      if (!silent) {
        setAuthStatus(
          AUTH_STATUS.BOOTING
        );
      }

      try {
        const response = await api.get(
          "/auth/me/"
        );

        const normalized =
          normalizeMePayload(response.data);

        setUser(normalized.user);
        setEntitlements(
          normalized.entitlements
        );
        setProfiles(
          normalized.profiles
        );
        setCustomerSettings(
          normalized.customerSettings
        );

        setAuthError("");
        setAuthStatus(
          AUTH_STATUS.AUTHENTICATED
        );

        lastSessionCheckRef.current =
          Date.now();

        if (!silent) {
          setEntitlementsRefreshedAt(
            new Date().toISOString()
          );
        }

        let businesses =
          await loadMyBusinesses();

        if (!Array.isArray(businesses)) {
          businesses = [];
        }

        const platformAllowed =
          enforcePlatformMode(
            normalized.user
          );

        if (platformAllowed) {
          setModuleAccess(
            FULL_MODULE_ACCESS
          );
        } else {
          await loadModuleAccess(
            businesses,
            normalized.user
          );
        }

        return normalized.user;
      } catch (error) {
        /*
         * Only a confirmed 401 from the authentication
         * check proves that the saved token is invalid.
         */
        if (isUnauthorizedError(error)) {
          markAnonymous();
          return null;
        }

        /*
         * Timeouts, offline conditions, Render cold starts,
         * 429s, and 5xx responses preserve the token and
         * any already-loaded user state.
         */
        markUnavailable(error);

        if (
          !isNetworkLikeError(error)
        ) {
          throw error;
        }

        return null;
      } finally {
        setBooting(false);
      }
    },
    [
      enforcePlatformMode,
      loadModuleAccess,
      loadMyBusinesses,
      markAnonymous,
      markUnavailable,
      resetAuthedState,
    ]
  );

  const loadMe = useCallback(
    async (options = {}) => {
      if (loadMePromiseRef.current) {
        return loadMePromiseRef.current;
      }

      const promise =
        performLoadMe(options).finally(
          () => {
            loadMePromiseRef.current =
              null;
          }
        );

      loadMePromiseRef.current = promise;

      return promise;
    },
    [performLoadMe]
  );

  useEffect(() => {
    loadMe().catch(() => {
      /*
       * performLoadMe already classifies and stores
       * authentication state.
       */
    });
  }, [loadMe]);

  useEffect(() => {
    if (!canUseWindow()) return undefined;

    let lastResumeAttempt = 0;

    const requestSessionRecovery = () => {
      const token = getToken();

      if (!token) return;

      const now = Date.now();

      /*
       * Prevent focus, pageshow, and visibilitychange
       * from producing duplicate requests together.
       */
      if (now - lastResumeAttempt < 2500) {
        return;
      }

      lastResumeAttempt = now;

      loadMe({
        silent: true,
      }).catch(() => {
        // State is handled by loadMe.
      });
    };

    const handleUnauthorized = () => {
      /*
       * Verify against /auth/me/ before clearing the
       * persistent token.
       */
      requestSessionRecovery();
    };

    const handleAuthChanged = () => {
      if (!getToken()) {
        resetAuthedState();
        setAuthError("");
        setAuthStatus(
          AUTH_STATUS.ANONYMOUS
        );
        setBooting(false);
        return;
      }

      requestSessionRecovery();
    };

    const handleVisibilityChange = () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        requestSessionRecovery();
      }
    };

    const handlePageShow = () => {
      requestSessionRecovery();
    };

    const handleOnline = () => {
      requestSessionRecovery();
    };

    const handleFocus = () => {
      requestSessionRecovery();
    };

    window.addEventListener(
      "sw:authUnauthorized",
      handleUnauthorized
    );

    window.addEventListener(
      "sw:authChanged",
      handleAuthChanged
    );

    window.addEventListener(
      "pageshow",
      handlePageShow
    );

    window.addEventListener(
      "online",
      handleOnline
    );

    window.addEventListener(
      "focus",
      handleFocus
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      window.removeEventListener(
        "sw:authUnauthorized",
        handleUnauthorized
      );

      window.removeEventListener(
        "sw:authChanged",
        handleAuthChanged
      );

      window.removeEventListener(
        "pageshow",
        handlePageShow
      );

      window.removeEventListener(
        "online",
        handleOnline
      );

      window.removeEventListener(
        "focus",
        handleFocus
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [
    loadMe,
    resetAuthedState,
  ]);

  const login = useCallback(
    async ({
      identifier,
      email,
      username,
      password,
    }) => {
      const resolvedIdentifier =
        identifier || email || username;

      if (
        !resolvedIdentifier ||
        !password
      ) {
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

      const token =
        response?.data?.token;

      if (!token) {
        throw new Error(
          "No authentication token was returned."
        );
      }

      setToken(token);
      setAuthError("");
      setAuthStatus(
        AUTH_STATUS.BOOTING
      );

      const loadedUser =
        await loadMe();

      if (
        !loadedUser &&
        getToken() &&
        authStatus ===
          AUTH_STATUS.UNAVAILABLE
      ) {
        throw new Error(
          "Sign-in succeeded, but SyncWorks could not finish loading your account. Your login was preserved."
        );
      }

      return response.data;
    },
    [
      authStatus,
      loadMe,
    ]
  );

  const startEmailVerification =
    useCallback(
      async ({
        email,
        purpose = "REGISTER",
      }) => {
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
    async ({
      challengeId,
      challenge_id,
      code,
    }) => {
      try {
        const response = await api.post(
          "/auth/email/verify-code/",
          {
            challenge_id:
              challengeId ||
              challenge_id,
            code: String(
              code || ""
            ).trim(),
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
    async ({
      challengeId,
      challenge_id,
    }) => {
      try {
        const response = await api.post(
          "/auth/email/resend-code/",
          {
            challenge_id:
              challengeId ||
              challenge_id,
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

  const resolveSignupCodes =
    useCallback(
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
        email: normalizeEmail(
          payload.email
        ),

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

        password:
          payload.password || "",

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
        setAuthError("");
        setAuthStatus(
          AUTH_STATUS.BOOTING
        );

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
    /*
     * This is the only normal application flow that should
     * intentionally delete the server-side token.
     */
    try {
      await api.post(
        "/auth/logout/"
      );
    } catch {
      // Local cleanup must still happen.
    }

    clearToken();
    setActiveBusinessId(null);
    setActiveBusinessIdState("");
    setMyBusinesses([]);
    setMode("CUSTOMER");
    resetAuthedState();
    setAuthError("");
    setAuthStatus(
      AUTH_STATUS.ANONYMOUS
    );
    setBooting(false);
  }, [
    resetAuthedState,
    setMode,
  ]);

  const updateActiveBusinessId =
    useCallback((nextId) => {
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
    }, []);

  const reloadBusinesses =
    useCallback(async () => {
      const businesses =
        await loadMyBusinesses();

      const safeBusinesses =
        Array.isArray(businesses)
          ? businesses
          : myBusinesses;

      await loadModuleAccess(
        safeBusinesses,
        user
      );

      return safeBusinesses;
    }, [
      loadModuleAccess,
      loadMyBusinesses,
      myBusinesses,
      user,
    ]);

  const refreshEntitlements =
    useCallback(async () => {
      const token = getToken();

      if (!token) {
        markAnonymous();
        return DEFAULT_ENTITLEMENTS;
      }

      setToken(token);

      try {
        const response = await api.get(
          "/auth/me/"
        );

        const normalized =
          normalizeMePayload(
            response.data
          );

        setUser(normalized.user);

        setEntitlements(
          normalized.entitlements
        );

        setProfiles(
          normalized.profiles
        );

        setCustomerSettings(
          normalized.customerSettings
        );

        setEntitlementsRefreshedAt(
          new Date().toISOString()
        );

        setAuthError("");

        setAuthStatus(
          AUTH_STATUS.AUTHENTICATED
        );

        const platformAllowed =
          enforcePlatformMode(
            normalized.user
          );

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
        if (isUnauthorizedError(error)) {
          markAnonymous();

          return DEFAULT_ENTITLEMENTS;
        }

        markUnavailable(error);
        throw error;
      }
    }, [
      enforcePlatformMode,
      loadModuleAccess,
      markAnonymous,
      markUnavailable,
      myBusinesses,
    ]);

  const retryAuthentication =
    useCallback(async () => {
      return loadMe({
        silent: true,
      });
    }, [loadMe]);

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

      PLATFORM:
        isPlatformAdmin,

      SALES:
        Boolean(
          moduleAccess?.sales
        ) ||
        isPlatformAdmin,
    };
  }, [
    isPlatformAdmin,
    moduleAccess,
    myBusinesses,
  ]);

  const hasStoredToken =
    Boolean(getToken());

  const isAuthenticated =
    authStatus ===
      AUTH_STATUS.AUTHENTICATED &&
    Boolean(user);

  const isAuthenticationUnavailable =
    authStatus ===
    AUTH_STATUS.UNAVAILABLE;

  const value = useMemo(
    () => ({
      user,
      booting,

      authStatus,
      authError,

      hasStoredToken,
      isAuthenticationUnavailable,

      isAuthed:
        isAuthenticated,

      login,
      register,
      logout,

      retryAuthentication,

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

      activeBusinessId:
        activeBusinessIdState,

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
      authError,
      authStatus,
      availableModes,
      booting,
      canAccessGrowthOs,
      customerSettings,
      entitlements,
      entitlementsRefreshedAt,
      hasEntitlement,
      hasStoredToken,
      isAuthenticated,
      isAuthenticationUnavailable,
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
      retryAuthentication,
      setMode,
      startEmailVerification,
      updateActiveBusinessId,
      user,
      verifyEmailCode,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider."
    );
  }

  return context;
}


rn