import React from "react";
import { useLocation } from "react-router-dom";
import LegacySyncAssistantLauncher from "./SyncAssistantLauncher.jsx";

// The Customer home already has the single central SYNC action in
// RoleAwareMobileNav. The old product promotion here duplicated that action,
// covered content, and overlapped the mobile nav and AI employee dock.
// Keep the legacy launcher unchanged for every other route.
export default function SyncAssistantLauncherRouter() {
  const location = useLocation();
  if (location.pathname.replace(/\/+$/, "") === "/customer") return null;
  return React.createElement(LegacySyncAssistantLauncher);
}
