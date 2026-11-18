import React from "react";
import { useLocation } from "react-router-dom";
import { classifySyncWorksRoute } from "./routePolicy.mjs";
import "./universal-workspace.css";

// Single non-positioned shell boundary: existing page chrome, drawers and
// application logic remain owned by the respective screens during migration.
export default function UniversalWorkspaceShell({ children }) {
  const { pathname } = useLocation();
  const surface = classifySyncWorksRoute(pathname);
  return (
    <div
      className={surface === "workspace" ? "sw-universal-workspace" : "sw-specialty-workspace"}
      data-sw-surface={surface}
      data-sw-shell-version="1"
    >
      {children}
    </div>
  );
}
