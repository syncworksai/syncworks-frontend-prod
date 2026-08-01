import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, useLocation } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import BusinessProfileEditController from "./components/business/BusinessProfileEditController";
import BusinessSettingsLoadGuard from "./components/business/BusinessSettingsLoadGuard";
import BusinessLiveAuditGuard from "./components/business/BusinessLiveAuditGuard";
import PMShell from "./components/pm/PMShell";
import NutritionCoachGlobalAssist from "./components/customer-health/NutritionCoachGlobalAssist";
import App from "./App";
import PMPropertyCreate from "./pages/PMPropertyCreate";
import PMProperties from "./pages/PMProperties";
import PMTenants from "./pages/PMTenants";
import PMProjects from "./pages/PMProjects";
import PMWorkOrders from "./pages/PMWorkOrders";
import PMLeasing from "./pages/PMLeasing";
import PMPayments from "./pages/PMPayments";
import "./index.css";

function RoutedApplication() {
  const location = useLocation();
  const pathname = location.pathname.replace(/\/+$/, "") || "/";
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

  if (isPmRoute && !isPmDashboard) return <PMShell>{routedContent}</PMShell>;
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
