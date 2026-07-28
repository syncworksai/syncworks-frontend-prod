import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, useLocation } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import BusinessProfileEditController from "./components/business/BusinessProfileEditController";
import { PMNavigationMenu } from "./components/pm/PMHeader";
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
  const hasNativePmHeader = pathname === "/pm" || pathname === "/pm/settings" || isCreateProperty || isTenantCenter || isProjectCenter;
  const showPmNavigationDock = pathname.startsWith("/pm/") && !hasNativePmHeader;

  if (isCreateProperty || isTenantCenter || isProjectCenter) {
    return (
      <ProtectedRoute>
        {isCreateProperty ? <PMPropertyCreate /> : isTenantCenter ? <PMTenants /> : <PMProjects />}
      </ProtectedRoute>
    );
  }

  return (
    <>
      <App />
      <BusinessProfileEditController />
      {showPmNavigationDock ? (
        <div className="fixed right-4 top-4 z-[85] rounded-2xl border border-cyan-500/20 bg-[#07111f]/95 p-1 shadow-2xl backdrop-blur-xl">
          <PMNavigationMenu compact />
        </div>
      ) : null}
    </>
  );
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
