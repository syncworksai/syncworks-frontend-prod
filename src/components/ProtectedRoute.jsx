// src/components/ProtectedRoute.jsx

import React, {
  useCallback,
  useState,
} from "react";

import {
  Navigate,
  useLocation,
} from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

function LoadingScreen({
  message = "Loading SyncWorks...",
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#020617] px-4 text-white">
      <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-950/70 p-6 text-center shadow-2xl backdrop-blur">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />

        <div className="mt-4 text-sm font-semibold text-slate-100">
          {message}
        </div>

        <div className="mt-1 text-xs text-slate-400">
          Restoring your secure session.
        </div>
      </div>
    </div>
  );
}

function ReconnectingScreen({
  message,
  onRetry,
  retrying,
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#020617] px-4 text-white">
      <div className="w-full max-w-md rounded-3xl border border-cyan-500/20 bg-slate-950/75 p-6 text-center shadow-2xl backdrop-blur">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/10 text-xl text-cyan-300">
          ↻
        </div>

        <h1 className="mt-4 text-lg font-bold text-slate-100">
          Reconnecting to SyncWorks
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          {message ||
            "SyncWorks could not reach the server. Your login has been preserved."}
        </p>

        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          This can happen when your phone resumes from the background,
          your connection changes, or the server is waking up.
        </p>

        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className={[
            "mt-5 w-full rounded-2xl border px-4 py-3",
            "text-sm font-semibold transition",
            retrying
              ? "cursor-not-allowed border-slate-700 bg-slate-900/70 text-slate-400"
              : "border-cyan-500/35 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25",
          ].join(" ")}
        >
          {retrying
            ? "Reconnecting..."
            : "Try Again"}
        </button>

        <div className="mt-3 text-[11px] text-slate-500">
          You will not be signed out unless the server confirms that
          your saved login is no longer valid.
        </div>
      </div>
    </div>
  );
}

/**
 * Authentication gate:
 *
 * - While authentication is booting, keep the route mounted behind
 *   a loading screen.
 * - If a user has already been restored, render the protected page.
 * - If a token exists but the API is temporarily unavailable, do not
 *   redirect to the login page.
 * - Redirect only when authentication is confirmed anonymous.
 */
export default function ProtectedRoute({
  children,
}) {
  const location = useLocation();

  const {
    user,
    booting,
    authStatus,
    authError,
    hasStoredToken,
    isAuthenticationUnavailable,
    retryAuthentication,
  } = useAuth();

  const [retrying, setRetrying] =
    useState(false);

  const handleRetry = useCallback(
    async () => {
      if (retrying) return;

      setRetrying(true);

      try {
        await retryAuthentication();
      } catch {
        // AuthContext stores the appropriate recovery state.
      } finally {
        setRetrying(false);
      }
    },
    [
      retryAuthentication,
      retrying,
    ]
  );

  /*
   * A previously restored user remains usable during a temporary
   * connectivity failure. This prevents app switching, screen locks,
   * and brief network changes from ejecting the user.
   */
  if (user) {
    return children;
  }

  if (
    booting ||
    authStatus === "booting"
  ) {
    return (
      <LoadingScreen message="Loading SyncWorks..." />
    );
  }

  /*
   * A saved token exists, but the server could not currently verify it.
   * Preserve the route and provide a retry instead of redirecting.
   */
  if (
    hasStoredToken &&
    isAuthenticationUnavailable
  ) {
    return (
      <ReconnectingScreen
        message={authError}
        onRetry={handleRetry}
        retrying={retrying}
      />
    );
  }

  /*
   * Defensive fallback: if a token is still present but authentication
   * has not settled into a confirmed anonymous state, do not redirect.
   */
  if (
    hasStoredToken &&
    authStatus !== "anonymous"
  ) {
    return (
      <LoadingScreen message="Restoring your session..." />
    );
  }

  return (
    <Navigate
      to="/login"
      replace
      state={{
        from:
          location.pathname +
          location.search +
          location.hash,
      }}
    />
  );
}
