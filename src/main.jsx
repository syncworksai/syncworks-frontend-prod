import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, useLocation } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import BusinessProfileEditController from "./components/business/BusinessProfileEditController";
import BusinessSettingsLoadGuard from "./components/business/BusinessSettingsLoadGuard";
import BusinessLiveAuditGuard from "./components/business/BusinessLiveAuditGuard";
import PMShell from "./components/pm/PMShell";
import PMTenantEditOverlay from "./components/pm/PMTenantEditOverlay";
import NutritionCoachGlobalAssist from "./components/customer-health/NutritionCoachGlobalAssist";
import App from "./App";
import AppCrashBoundary from "./components/AppCrashBoundary";
import UniversalWorkspaceShell from "./components/shell/UniversalWorkspaceShell";
import { usesUniversalWorkspaceStyle } from "./components/shell/routePolicy.mjs";
import FeatureResumeTracker from "./components/navigation/FeatureResumeTracker";
import PlatformDirectEntry from "./pages/PlatformDirectEntry";
import PMPropertyCreate from "./pages/PMPropertyCreate";
import PMProperties from "./pages/PMProperties";
import PMTenants from "./pages/PMTenants";
import PMProjects from "./pages/PMProjects";
import PMWorkOrders from "./pages/PMWorkOrders";
import PMLeasing from "./pages/PMLeasing";
import PMPayments from "./pages/PMPayments";
import "./index.css";
import "./mobile-production.css";
import "./components/customer/OfficeGlobalV21.css";

const SYNCWORKS_BUILD = "2026.09.24-sports-gamebook-practice-v2";

async function retireLegacyAppCaches() {
  try {
    window.__SYNCWORKS_BUILD__ = SYNCWORKS_BUILD;

    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch (error) {
    console.warn("SyncWorks cache cleanup skipped", error);
  }
}

retireLegacyAppCaches();

function RoutedApplication() {
  const location = useLocation();
  const pathname = location.pathname.replace(/\/+$/, "") || "/";
  React.useEffect(() => {
    const applyAppearance = () => {
      let appearance = "legacy";
      try {
        const stored = JSON.parse(localStorage.getItem("sw_workspace_appearance_v1") || "null");
        if (["classic", "future", "modern", "light"].includes(stored?.theme)) appearance = stored.theme;
      } catch { /* local storage unavailable */ }
      const isWork = usesUniversalWorkspaceStyle(pathname);
      if (isWork && appearance !== "legacy") {
        document.body.dataset.swOfficeScope = "work";
        document.body.dataset.swOfficeTheme = appearance;
      } else {
        delete document.body.dataset.swOfficeScope;
        delete document.body.dataset.swOfficeTheme;
      }
    };
    applyAppearance();
    window.addEventListener("sw:workspace-appearance", applyAppearance);
    window.addEventListener("storage", applyAppearance);
    return () => {
      window.removeEventListener("sw:workspace-appearance", applyAppearance);
      window.removeEventListener("storage", applyAppearance);
      delete document.body.dataset.swOfficeScope;
      delete document.body.dataset.swOfficeTheme;
    };
  }, [pathname]);


  // GOD MODE owns its route completely. Do not render the shared App shell,
  // global mobile navigation, onboarding gates, or controller overlays around it.
  if (pathname === "/platform") return <PlatformDirectEntry />;

  const directPages = {
    "/pm/properties/new": <PMPropertyCreate />,
    "/pm/properties": <PMProperties />,
    "/pm/tenants": <PMTenants />,
    "/pm/projects": <PMProjects />,
    "/pm/work-orders": <PMWorkOrders />,
    "/pm/leasing": <PMLeasing />,
    "/pm/payments": <PMPayments />,
  };
  const isPmDashboard = pathname === "/pm";
  const isPmRoute = isPmDashboard || pathname.startsWith("/pm/");
  const directPage = directPages[pathname];

  const routedContent = directPage ? (
    <ProtectedRoute>{directPage}</ProtectedRoute>
  ) : (
    <>
      <App />
      <BusinessProfileEditController />
      <BusinessSettingsLoadGuard />
      <BusinessLiveAuditGuard />
      <NutritionCoachGlobalAssist />
    </>
  );

  if (isPmRoute && !isPmDashboard) {
    const pmContent = <PMShell>{routedContent}<PMTenantEditOverlay /></PMShell>;
    return <UniversalWorkspaceShell>{pmContent}</UniversalWorkspaceShell>;
  }
  return <UniversalWorkspaceShell>{routedContent}</UniversalWorkspaceShell>;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <FeatureResumeTracker />
        <AppCrashBoundary>
          <RoutedApplication />
        </AppCrashBoundary>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
