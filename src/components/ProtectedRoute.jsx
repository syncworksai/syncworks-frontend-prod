// src/components/ProtectedRoute.jsx

import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Navigate,
  useLocation,
} from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import GlobalModeBar from "./navigation/GlobalModeBar";
import EmployeeBusinessRouteGate from "./EmployeeBusinessRouteGate";
import "./SyncStartupScreen.css";

function LoadingScreen({ message = "Loading SyncWorks...", showRecovery = false, onRetry, retrying }) {
  return (
    <div className="sw-startup" role="status" aria-live="polite" aria-label={message}>
      <div className="sw-startup__ambient sw-startup__ambient--cyan" aria-hidden="true" />
      <div className="sw-startup__ambient sw-startup__ambient--violet" aria-hidden="true" />
      <div className="sw-startup__grid" aria-hidden="true" />
      <main className="sw-startup__center">
        <div className="sw-startup__emblem" aria-hidden="true">
          <span className="sw-startup__halo sw-startup__halo--outer" />
          <span className="sw-startup__halo sw-startup__halo--inner" />
          <img src="/brand/syncworks-app-icon.svg" alt="" className="sw-startup__logo" />
        </div>
        <div className="sw-startup__brand">SYNC<span>WORKS</span></div>
        <p className="sw-startup__tagline">YOUR WORLD. CONNECTED.</p>
        <div className="sw-startup__progress" aria-hidden="true"><span /></div>
        <p className="sw-startup__status">
          {showRecovery ? "Connection is taking longer than expected" : message}
        </p>
        {showRecovery && (
          <div className="sw-startup__recovery">
            <p>Your saved sign-in is safe.</p>
            <button type="button" onClick={onRetry} disabled={retrying}>
              {retrying ? "Checking connection…" : "Try connecting again"}
            </button>
          </div>
        )}
      </main>
      <div className="sw-startup__footer">POWERED BY SYNCWORKS</div>
    </div>
  );
}

function ReconnectingScreen({ message, onRetry, retrying }) {
  return <div className="flex min-h-screen items-center justify-center bg-[#020617] px-4 text-white"><div className="w-full max-w-md rounded-3xl border border-cyan-500/20 bg-slate-950/75 p-6 text-center shadow-2xl backdrop-blur"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/10 text-xl text-cyan-300">↻</div><h1 className="mt-4 text-lg font-bold text-slate-100">Reconnecting to SyncWorks</h1><p className="mt-2 text-sm leading-relaxed text-slate-300">{message || "SyncWorks could not reach the server. Your login has been preserved."}</p><p className="mt-2 text-xs leading-relaxed text-slate-500">This can happen when your phone resumes from the background, your connection changes, or the server is waking up.</p><button type="button" onClick={onRetry} disabled={retrying} className={["mt-5 w-full rounded-2xl border px-4 py-3", "text-sm font-semibold transition", retrying ? "cursor-not-allowed border-slate-700 bg-slate-900/70 text-slate-400" : "border-cyan-500/35 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25"].join(" ")}>{retrying ? "Reconnecting..." : "Try Again"}</button><div className="mt-3 text-[11px] text-slate-500">You will not be signed out unless the server confirms that your saved login is no longer valid.</div></div></div>;
}

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const { user, booting, authStatus, authError, hasStoredToken, isAuthenticationUnavailable, retryAuthentication } = useAuth();
  const [retrying, setRetrying] = useState(false);
  const [slowStartup, setSlowStartup] = useState(false);

  useEffect(() => {
    if (user || (!booting && authStatus !== "booting")) {
      setSlowStartup(false);
      return undefined;
    }
    const timeoutId = window.setTimeout(() => setSlowStartup(true), 8000);
    return () => window.clearTimeout(timeoutId);
  }, [user, booting, authStatus]);

  const handleRetry = useCallback(async () => {
    if (retrying) return;
    setRetrying(true);
    try { await retryAuthentication(); } catch { /* AuthContext stores recovery state. */ } finally { setRetrying(false); }
  }, [retryAuthentication, retrying]);

  if (user) {
    return <><GlobalModeBar /><EmployeeBusinessRouteGate user={user}>{children}</EmployeeBusinessRouteGate></>;
  }

  if (booting || authStatus === "booting") return <LoadingScreen message="Loading SyncWorks..." showRecovery={slowStartup} onRetry={handleRetry} retrying={retrying} />;

  if (hasStoredToken && isAuthenticationUnavailable) {
    return <ReconnectingScreen message={authError} onRetry={handleRetry} retrying={retrying} />;
  }

  if (hasStoredToken && authStatus !== "anonymous") return <LoadingScreen message="Restoring your session..." showRecovery={slowStartup} onRetry={handleRetry} retrying={retrying} />;

  return <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />;
}
