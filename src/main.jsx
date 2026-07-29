import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, useLocation } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import BusinessProfileEditController from "./components/business/BusinessProfileEditController";
import PMShell from "./components/pm/PMShell";
import App from "./App";
import PMPropertyCreate from "./pages/PMPropertyCreate";
import PMTenants from "./pages/PMTenants";
import PMProjects from "./pages/PMProjects";
import "./index.css";

function RoutedApplication() {
  const location = useLocation();
  const pathname = location.pathname.replace(/\/+$/, "") || "/";
  const isCreateProperty = pathname === "/pm/properties/new";
  const isTenantCenter = pathname === "/pm/tenants";
  const isProjectCenter = pathname === "/pm/projects";
  const isPmDashboard = pathname === "/pm";
  const isPmRoute = isPmDashboard || pathname.startsWith("/pm/");

  const routedContent = isCreateProperty || isTenantCenter || isProjectCenter ? (
    <ProtectedRoute>
      {isCreateProperty ? <PMPropertyCreate /> : isTenantCenter ? <PMTenants /> : <PMProjects />}
    </ProtectedRoute>
  ) : (
    <>
      <App />
      <BusinessProfileEditController />
    </>
  );

  if (isPmRoute && !isPmDashboard) {
    return <PMShell>{routedContent}</PMShell>;
  }

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
