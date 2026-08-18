import React from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import LegacySettingsHub from "./SettingsHub.jsx";

export default function SettingsHubRouter() {
  const { mode } = useAuth();
  const location = useLocation();
  const params = new URLSearchParams(location.search || "");
  const returnTo = String(params.get("return") || "").toLowerCase();

  // Portal settings should follow the portal the user came from, even when
  // the underlying account mode is still Personal.
  if (returnTo.startsWith("/tenant")) {
    return React.createElement(Navigate, { to: "/tenant/settings", replace: true });
  }

  if (returnTo.startsWith("/investor")) {
    return React.createElement(Navigate, { to: "/investor/settings", replace: true });
  }

  const destination = {
    CUSTOMER: "/customer/settings",
    SBO: "/sbo/settings",
    PM: "/pm/settings",
    EMPLOYEE: "/employee/settings",
  }[mode];

  if (destination) {
    return React.createElement(Navigate, { to: destination, replace: true });
  }

  // Keep the generic settings hub available as the safe fallback for
  // platform/internal or any future mode that does not yet have a dedicated page.
  return React.createElement(LegacySettingsHub);
}
