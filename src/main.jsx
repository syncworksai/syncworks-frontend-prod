import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, useLocation } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import PlatformRoute from "./components/PlatformRoute";
import BusinessProfileEditController from "./components/business/BusinessProfileEditController";
import BusinessSettingsLoadGuard from "./components/business/BusinessSettingsLoadGuard";
import BusinessLiveAuditGuard from "./components/business/BusinessLiveAuditGuard";
import PMShell from "./components/pm/PMShell";
import PMTenantEditOverlay from "./components/pm/PMTenantEditOverlay";
import NutritionCoachGlobalAssist from "./components/customer-health/NutritionCoachGlobalAssist";
import StorefrontRevenueKpis from "./components/storefront/StorefrontRevenueKpis";
import App from "./App";
import CustomerStoreV2 from "./pages/CustomerStoreV2";
import PMPropertyCreate from "./pages/PMPropertyCreate";
import PMProperties from "./pages/PMProperties";
import PMTenants from "./pages/PMTenants";
import PMProjects from "./pages/PMProjects";
import PMWorkOrders from "./pages/PMWorkOrders";
import PMLeasing from "./pages/PMLeasing";
import PMPayments from "./pages/PMPayments";
import "./index.css";
import "./mobile-production.css";

const SYNCWORKS_BUILD = "2026.09.01-storefront-commerce-v2";

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
  const directPages = {
    "/customer/store": <CustomerStoreV2 />,
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
      {pathname === "/platform" ? (
        <PlatformRoute>
          <div className="mx-auto max-w-[1500px] px-3 pt-3 sm:px-5 lg:px-8">
            <StorefrontRevenueKpis />
          </div>
        </PlatformRoute>
      ) : null}
      <App />
      <BusinessProfileEditController />
      <BusinessSettingsLoadGuard />
      <BusinessLiveAuditGuard />
      <NutritionCoachGlobalAssist />
    </>
  );

  if (isPmRoute && !isPmDashboard) return <PMShell>{routedContent}<PMTenantEditOverlay /></PMShell>;
  return routedContent;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <RoutedApplication />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
